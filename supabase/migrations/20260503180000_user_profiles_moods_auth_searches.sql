-- Profiles: app settings keyed to Supabase Auth user (one row per auth user).
-- Run in Supabase SQL editor or via `supabase db push` after linking project.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  thisvid_user_id text,
  default_mood text,
  favourites text[] default '{}'::text[],
  last_sync_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Per-auth-user app settings synced from legacy localStorage tvass-* keys.';

alter table public.profiles enable row level security;

create policy profiles_select_own
  on public.profiles for select to authenticated
  using (auth.uid () = id);

create policy profiles_insert_own
  on public.profiles for insert to authenticated
  with check (auth.uid () = id);

create policy profiles_update_own
  on public.profiles for update to authenticated
  using (auth.uid () = id)
  with check (auth.uid () = id);

-- Moods mirror tvass-moods JSON array rows.
create table if not exists public.moods (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint moods_user_name_unique unique (user_id, name)
);

comment on table public.moods is 'Saved search moods per Supabase Auth user (Mood[].preferences as jsonb).';

create index if not exists moods_user_id_idx on public.moods (user_id);

alter table public.moods enable row level security;

create policy moods_select_own
  on public.moods for select to authenticated
  using (auth.uid () = user_id);

create policy moods_insert_own
  on public.moods for insert to authenticated
  with check (auth.uid () = user_id);

create policy moods_update_own
  on public.moods for update to authenticated
  using (auth.uid () = user_id)
  with check (auth.uid () = user_id);

create policy moods_delete_own
  on public.moods for delete to authenticated
  using (auth.uid () = user_id);

-- Auto-create profile on auth signup / first OTP login.
create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user ();

-- Link search analytics rows to Supabase Auth (optional FK).
alter table public.searches add column if not exists auth_user_id uuid references auth.users (id) on delete set null;

create index if not exists searches_auth_user_id_idx on public.searches (auth_user_id);

comment on column public.searches.auth_user_id is 'Supabase Auth user when logged in; null for anon visitors.';

-- RLS on searches (enable only if table had no prior RLS; adjust if conflicts).
alter table public.searches enable row level security;

-- Allow existing anon + logged-in clients to insert analytics rows unchanged.
drop policy if exists searches_insert_anon_authenticated on public.searches;
create policy searches_insert_anon_authenticated on public.searches
for insert to anon, authenticated
with check (true);

drop policy if exists searches_update_anon_authenticated on public.searches;
create policy searches_update_anon_authenticated on public.searches
for update to anon, authenticated
using (true)
with check (true);

drop policy if exists searches_select_own on public.searches;
create policy searches_select_own on public.searches
for select to authenticated
using (auth.uid () = auth_user_id);

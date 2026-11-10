-- Videos a signed-in user hid from For you.
-- The app treats a row as expired one month after hidden_at.

create table if not exists public.hidden_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  video_url text not null,
  hidden_at timestamptz not null default now(),
  constraint hidden_recommendations_user_video_unique unique (user_id, video_url)
);

comment on table public.hidden_recommendations is
  'Videos the user hid from For you. Treat a row as expired one month after hidden_at.';

create index if not exists hidden_recommendations_user_hidden_at_idx
  on public.hidden_recommendations (user_id, hidden_at desc);

alter table public.hidden_recommendations enable row level security;

create policy hidden_recommendations_select_own
  on public.hidden_recommendations
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy hidden_recommendations_insert_own
  on public.hidden_recommendations
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy hidden_recommendations_update_own
  on public.hidden_recommendations
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy hidden_recommendations_delete_own
  on public.hidden_recommendations
  for delete
  to authenticated
  using (auth.uid() = user_id);

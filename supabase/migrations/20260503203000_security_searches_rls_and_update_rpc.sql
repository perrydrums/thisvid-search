-- Tighten searches RLS + row-scoped result count updates (magic token).
-- Drops broad UPDATE policy; clients must call update_search_result_count() with insert token.

alter table public.searches add column if not exists result_update_token uuid not null default gen_random_uuid();

comment on column public.searches.result_update_token is
  'Secret returned on insert; required to PATCH result_count without wide UPDATE privileges.';

-- Replace permissive INSERT / UPDATE policies --------------------------------

drop policy if exists searches_insert_anon_authenticated on public.searches;
create policy searches_insert_anon_authenticated on public.searches
for insert to anon, authenticated
with check (
    auth_user_id is null or auth_user_id = auth.uid()
);

drop policy if exists searches_update_anon_authenticated on public.searches;

-- SECURITY DEFINER RPC: update result count only when token matches row ----

create or replace function public.update_search_result_count (
    p_id bigint,
    p_token uuid,
    p_result bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    update public.searches
    set result_count = p_result
    where id = p_id
      and result_update_token = p_token;
end;
$$;

comment on function public.update_search_result_count (bigint, uuid, bigint)
is 'Client-only resultCount patch using insert-time token; avoids open UPDATE policies.';

revoke all on function public.update_search_result_count (bigint, uuid, bigint) from public;

grant execute on function public.update_search_result_count (bigint, uuid, bigint) to anon, authenticated;

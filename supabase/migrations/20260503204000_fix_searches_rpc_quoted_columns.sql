-- Legacy `searches` table uses camelCase quoted identifiers (e.g. "pageAmount"), not snake_case.
-- Recreate RPCs so inserts/updates hit the correct columns.

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
    set "resultCount" = p_result
    where id = p_id
      and result_update_token = p_token;
end;
$$;

create or replace function public.insert_search_log (
    p_mode text,
    p_advanced boolean,
    p_type text,
    p_tags text[],
    p_page_amount integer,
    p_quick boolean,
    p_duration integer,
    p_primary_tag text,
    p_category text,
    p_user_id text,
    p_friend_id text,
    p_result_count bigint,
    p_ip_address text,
    p_visitor_id text,
    p_visitor_generated_name text,
    p_ip_location text
)
returns table (
    search_id bigint,
    result_token uuid,
    stored_result_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_auth uuid := auth.uid ();
begin
    return query insert into public.searches (
        mode,
        advanced,
        "type",
        tags,
        "pageAmount",
        quick,
        duration,
        "primaryTag",
        category,
        "userId",
        "friendId",
        "resultCount",
        "ipAddress",
        "visitorId",
        "visitorGeneratedName",
        "ipLocation",
        auth_user_id
    )
    values (
        p_mode,
        p_advanced,
        p_type,
        coalesce(p_tags, '{}'::text[]),
        p_page_amount,
        p_quick,
        p_duration,
        p_primary_tag,
        p_category,
        nullif(p_user_id, ''),
        nullif(p_friend_id, ''),
        p_result_count,
        p_ip_address,
        p_visitor_id,
        p_visitor_generated_name,
        p_ip_location,
        v_auth
    )
    returning
        searches.id as search_id,
        searches.result_update_token as result_token,
        searches."resultCount"::bigint as stored_result_count;

    return;
end;
$$;

comment on function public.update_search_result_count (bigint, uuid, bigint)
is 'Client-only result count patch using insert-time token (camelCase resultCount column).';

comment on function public.insert_search_log is
    'Inserts searches row linked to auth.uid(); uses legacy quoted camelCase column names.';

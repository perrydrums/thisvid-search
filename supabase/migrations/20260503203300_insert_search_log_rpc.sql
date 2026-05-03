-- Insert search analytics without exposing anon-readable SELECT rows.
-- SECURITY DEFINER returns id + result_update_token for update_search_result_count().

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
        type,
        tags,
        page_amount,
        quick,
        duration,
        primary_tag,
        category,
        user_id,
        friend_id,
        result_count,
        ip_address,
        visitor_id,
        visitor_generated_name,
        ip_location,
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
        searches.result_count as stored_result_count;

    return;
end;
$$;

comment on function public.insert_search_log is
    'Inserts searches row linked to auth.uid(); returns id/token for scoped result_count updates without anon SELECT.';

revoke all on function public.insert_search_log from public;

grant execute on function public.insert_search_log to anon, authenticated;

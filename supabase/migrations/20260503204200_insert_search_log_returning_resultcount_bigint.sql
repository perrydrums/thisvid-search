-- OUT column stored_result_count is bigint; legacy "resultCount" may be integer → cast in RETURNING.

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
    v_user bigint;
    v_friend bigint;
begin
    v_user :=
        case
            when p_user_id is null or btrim(p_user_id) = '' then null::bigint
            else p_user_id::bigint
        end;
    v_friend :=
        case
            when p_friend_id is null or btrim(p_friend_id) = '' then null::bigint
            else p_friend_id::bigint
        end;

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
        v_user,
        v_friend,
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

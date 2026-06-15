alter table public.profiles
  add column if not exists friend_ids text[] default '{}'::text[],
  add column if not exists friends_last_sync_date timestamptz;

comment on column public.profiles.friend_ids is 'ThisVid member IDs scraped from the user friends listing (Settings).';
comment on column public.profiles.friends_last_sync_date is 'When friend_ids was last refreshed from ThisVid.';

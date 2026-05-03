-- Feedback stars (optional table). Harden with RLS: anonymous insert only, no client reads.

create table if not exists public.feedback (
    id bigint generated always as identity primary key,
    search_id bigint not null references public.searches (id) on delete cascade,
    rating smallint not null,
    created_at timestamptz not null default now(),
    constraint feedback_rating_range check (rating >= 1 and rating <= 5)
);

comment on table public.feedback is 'Per-search star rating from the UI; insert-only for anon/auth clients.';

alter table public.feedback enable row level security;

drop policy if exists feedback_insert_public on public.feedback;
create policy feedback_insert_public on public.feedback
for insert to anon, authenticated
with check (rating >= 1 and rating <= 5);

-- No SELECT / UPDATE / DELETE policies for anon or authenticated (service role bypasses RLS for admin).

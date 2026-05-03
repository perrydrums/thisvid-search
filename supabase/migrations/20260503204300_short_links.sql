-- Public URL short links for share links (/s/:code -> full search query)

create table if not exists public.short_links (
    id bigint generated always as identity primary key,
    code text not null unique,
    params jsonb not null,
    path text not null default '/search',
    created_at timestamptz not null default now()
);

create index if not exists short_links_code_idx on public.short_links (code);

alter table public.short_links enable row level security;

create policy "Anyone can read short links"
    on public.short_links for select using (true);

create policy "Anyone can create short links"
    on public.short_links for insert with check (true);

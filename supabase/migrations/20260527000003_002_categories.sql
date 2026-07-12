create table if not exists public.categories (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists categories_is_active_idx
  on public.categories (is_active);

alter table public.categories enable row level security;

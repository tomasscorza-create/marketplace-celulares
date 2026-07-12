create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'artisan', 'buyer')),
  store_name text,
  store_description text,
  profile_image_url text,
  storefront_theme_color text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

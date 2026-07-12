create table if not exists public.products (
  id uuid primary key default extensions.gen_random_uuid(),
  artisan_id uuid not null references public.profiles (id) on delete restrict,
  category_id uuid not null references public.categories (id) on delete restrict,
  title text not null,
  description text not null default '',
  price numeric(12, 2) not null check (price >= 0),
  image_url text,
  image_urls text[] not null default '{}'::text[],
  product_attributes jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint products_id_artisan_id_key unique (id, artisan_id),
  constraint products_image_urls_limit
    check (coalesce(array_length(image_urls, 1), 0) <= 3)
);

create index if not exists products_artisan_id_idx
  on public.products (artisan_id);

create index if not exists products_category_id_idx
  on public.products (category_id);

create index if not exists products_is_active_idx
  on public.products (is_active);

alter table public.products enable row level security;

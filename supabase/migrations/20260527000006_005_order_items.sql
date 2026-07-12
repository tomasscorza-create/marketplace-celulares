create table if not exists public.order_items (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null,
  artisan_id uuid not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  constraint order_items_product_artisan_fkey
    foreign key (product_id, artisan_id)
    references public.products (id, artisan_id)
    on delete restrict
);

create index if not exists order_items_order_id_idx
  on public.order_items (order_id);

create index if not exists order_items_artisan_id_idx
  on public.order_items (artisan_id);

create index if not exists order_items_product_id_idx
  on public.order_items (product_id);

alter table public.order_items enable row level security;

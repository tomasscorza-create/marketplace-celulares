alter table public.order_items
  add column if not exists source_cart_item_id uuid references public.cart_items (id) on delete set null;

create index if not exists order_items_source_cart_item_id_idx
  on public.order_items (source_cart_item_id);

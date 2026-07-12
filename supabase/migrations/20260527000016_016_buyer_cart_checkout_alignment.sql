create table if not exists public.carts (
  id uuid primary key default extensions.gen_random_uuid(),
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'active',
  converted_order_id uuid null references public.orders (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint carts_status_check
    check (status in ('active', 'converted', 'abandoned'))
);

create index if not exists carts_buyer_id_idx
  on public.carts (buyer_id);

create index if not exists carts_status_idx
  on public.carts (status);

create unique index if not exists carts_one_active_per_buyer_idx
  on public.carts (buyer_id)
  where status = 'active';

alter table public.carts enable row level security;

create table if not exists public.cart_items (
  id uuid primary key default extensions.gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  artisan_id uuid not null references public.profiles (id) on delete restrict,
  quantity integer not null default 1,
  unit_price numeric(12, 2) not null,
  product_title text not null default ''::text,
  product_image_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  availability_mode text not null default 'stock',
  configuration_key text not null default 'default'::text,
  lead_time_days integer null,
  selected_options jsonb not null default '[]'::jsonb,
  selected_options_summary text null,
  constraint cart_items_quantity_check
    check (quantity > 0),
  constraint cart_items_unit_price_check
    check (unit_price >= 0),
  constraint cart_items_availability_mode_check
    check (availability_mode in ('stock', 'made_to_order'))
);

create index if not exists cart_items_cart_id_idx
  on public.cart_items (cart_id);

create index if not exists cart_items_product_id_idx
  on public.cart_items (product_id);

create index if not exists cart_items_artisan_id_idx
  on public.cart_items (artisan_id);

alter table public.cart_items enable row level security;

create table if not exists public.buyer_preferences (
  buyer_id uuid primary key references public.profiles (id) on delete cascade,
  phone text null,
  preferred_delivery_type text not null default 'arrange_with_seller'::text,
  delivery_notes text null,
  shipping_address text null,
  shipping_address_details jsonb null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint buyer_preferences_preferred_delivery_type_check
    check (preferred_delivery_type in ('arrange_with_seller', 'pickup', 'shipping'))
);

alter table public.buyer_preferences enable row level security;

create table if not exists public.buyer_favorites (
  id uuid primary key default extensions.gen_random_uuid(),
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists buyer_favorites_buyer_id_product_id_key
  on public.buyer_favorites (buyer_id, product_id);

create index if not exists buyer_favorites_buyer_id_idx
  on public.buyer_favorites (buyer_id);

create index if not exists buyer_favorites_product_id_idx
  on public.buyer_favorites (product_id);

alter table public.buyer_favorites enable row level security;

alter table public.orders
  add column if not exists buyer_id uuid references public.profiles (id) on delete set null,
  add column if not exists buyer_email text,
  add column if not exists subtotal_amount numeric(12, 2) not null default 0,
  add column if not exists shipping_amount numeric(12, 2) not null default 0,
  add column if not exists fees_amount numeric(12, 2) not null default 0,
  add column if not exists currency text not null default 'ARS'::text,
  add column if not exists payment_status text not null default 'pending'::text,
  add column if not exists fulfillment_status text not null default 'pending'::text,
  add column if not exists delivery_type text not null default 'arrange_with_seller'::text,
  add column if not exists delivery_address text,
  add column if not exists delivery_notes text,
  add column if not exists checkout_provider text,
  add column if not exists external_reference text,
  add column if not exists mercadopago_preference_id text,
  add column if not exists mercadopago_payment_id text,
  add column if not exists mercadopago_merchant_order_id text,
  add column if not exists paid_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.orders
  drop constraint if exists orders_status_check,
  drop constraint if exists orders_payment_status_check,
  drop constraint if exists orders_fulfillment_status_check,
  drop constraint if exists orders_delivery_type_check,
  drop constraint if exists orders_checkout_provider_check,
  drop constraint if exists orders_total_amount_check,
  drop constraint if exists orders_subtotal_amount_check,
  drop constraint if exists orders_shipping_amount_check,
  drop constraint if exists orders_fees_amount_check;

alter table public.orders
  add constraint orders_status_check
    check (status in ('draft', 'pending', 'paid', 'confirmed', 'cancelled', 'refunded', 'failed')),
  add constraint orders_payment_status_check
    check (payment_status in ('pending', 'approved', 'authorized', 'in_process', 'rejected', 'cancelled', 'refunded', 'charged_back')),
  add constraint orders_fulfillment_status_check
    check (fulfillment_status in ('pending', 'preparing', 'ready', 'delivered', 'cancelled')),
  add constraint orders_delivery_type_check
    check (delivery_type in ('arrange_with_seller', 'pickup', 'shipping')),
  add constraint orders_checkout_provider_check
    check (checkout_provider is null or checkout_provider in ('mercadopago')),
  add constraint orders_total_amount_check
    check (total_amount >= 0),
  add constraint orders_subtotal_amount_check
    check (subtotal_amount >= 0),
  add constraint orders_shipping_amount_check
    check (shipping_amount >= 0),
  add constraint orders_fees_amount_check
    check (fees_amount >= 0);

create index if not exists orders_buyer_id_idx
  on public.orders (buyer_id);

create index if not exists orders_external_reference_idx
  on public.orders (external_reference);

create index if not exists orders_payment_status_idx
  on public.orders (payment_status);

create index if not exists orders_fulfillment_status_idx
  on public.orders (fulfillment_status);

alter table public.order_items
  add column if not exists product_title text not null default ''::text,
  add column if not exists product_description text,
  add column if not exists product_image_url text,
  add column if not exists category_name text,
  add column if not exists artisan_name text,
  add column if not exists store_name text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists availability_mode text not null default 'stock'::text,
  add column if not exists lead_time_days integer,
  add column if not exists selected_options jsonb not null default '[]'::jsonb,
  add column if not exists selected_options_summary text,
  add column if not exists source_cart_item_id uuid references public.cart_items (id) on delete set null,
  add column if not exists stock_applied_at timestamptz;

alter table public.order_items
  drop constraint if exists order_items_quantity_check,
  drop constraint if exists order_items_unit_price_check,
  drop constraint if exists order_items_subtotal_check,
  drop constraint if exists order_items_availability_mode_check;

alter table public.order_items
  add constraint order_items_quantity_check
    check (quantity > 0),
  add constraint order_items_unit_price_check
    check (unit_price >= 0),
  add constraint order_items_subtotal_check
    check (subtotal >= 0),
  add constraint order_items_availability_mode_check
    check (availability_mode in ('stock', 'made_to_order'));

create table if not exists public.payment_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider text not null default 'mercadopago'::text,
  status text not null default 'created'::text,
  external_reference text not null,
  preference_id text null,
  payment_id text null,
  merchant_order_id text null,
  checkout_url text null,
  amount numeric(12, 2) not null,
  currency text not null default 'ARS'::text,
  raw_payload jsonb not null default '{}'::jsonb,
  last_webhook_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_attempts_provider_check
    check (provider in ('mercadopago')),
  constraint payment_attempts_status_check
    check (status in ('created', 'pending', 'approved', 'authorized', 'in_process', 'rejected', 'cancelled', 'refunded', 'charged_back', 'failed')),
  constraint payment_attempts_amount_check
    check (amount >= 0)
);

create index if not exists payment_attempts_order_id_idx
  on public.payment_attempts (order_id);

create index if not exists payment_attempts_external_reference_idx
  on public.payment_attempts (external_reference);

create index if not exists payment_attempts_payment_id_idx
  on public.payment_attempts (payment_id);

alter table public.payment_attempts enable row level security;

create table if not exists public.payment_webhook_events (
  id uuid primary key default extensions.gen_random_uuid(),
  provider text not null,
  event_type text not null,
  action text null,
  resource_id text null,
  external_event_id text null,
  payload jsonb not null default '{}'::jsonb,
  headers jsonb not null default '{}'::jsonb,
  processed_at timestamptz null,
  processing_error text null,
  created_at timestamptz not null default now(),
  constraint payment_webhook_events_provider_check
    check (provider in ('mercadopago'))
);

create unique index if not exists payment_webhook_events_provider_external_event_id_key
  on public.payment_webhook_events (provider, external_event_id);

create index if not exists payment_webhook_events_provider_resource_id_idx
  on public.payment_webhook_events (provider, resource_id);

create index if not exists payment_webhook_events_created_at_idx
  on public.payment_webhook_events (created_at desc);

alter table public.payment_webhook_events enable row level security;

drop policy if exists carts_select_own_or_admin on public.carts;
create policy carts_select_own_or_admin
  on public.carts
  for select
  to authenticated
  using (public.is_admin() or (buyer_id = auth.uid() and public.current_user_role() = 'buyer'));

drop policy if exists carts_insert_own_or_admin on public.carts;
create policy carts_insert_own_or_admin
  on public.carts
  for insert
  to authenticated
  with check (public.is_admin() or (buyer_id = auth.uid() and public.current_user_role() = 'buyer'));

drop policy if exists carts_update_own_or_admin on public.carts;
create policy carts_update_own_or_admin
  on public.carts
  for update
  to authenticated
  using (public.is_admin() or (buyer_id = auth.uid() and public.current_user_role() = 'buyer'))
  with check (public.is_admin() or (buyer_id = auth.uid() and public.current_user_role() = 'buyer'));

drop policy if exists carts_delete_own_or_admin on public.carts;
create policy carts_delete_own_or_admin
  on public.carts
  for delete
  to authenticated
  using (public.is_admin() or (buyer_id = auth.uid() and public.current_user_role() = 'buyer'));

drop policy if exists cart_items_select_own_or_admin on public.cart_items;
create policy cart_items_select_own_or_admin
  on public.cart_items
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.carts
      where carts.id = cart_items.cart_id
        and carts.buyer_id = auth.uid()
        and public.current_user_role() = 'buyer'
    )
  );

drop policy if exists cart_items_insert_own_or_admin on public.cart_items;
create policy cart_items_insert_own_or_admin
  on public.cart_items
  for insert
  to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.carts
      where carts.id = cart_items.cart_id
        and carts.buyer_id = auth.uid()
        and public.current_user_role() = 'buyer'
    )
  );

drop policy if exists cart_items_update_own_or_admin on public.cart_items;
create policy cart_items_update_own_or_admin
  on public.cart_items
  for update
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.carts
      where carts.id = cart_items.cart_id
        and carts.buyer_id = auth.uid()
        and public.current_user_role() = 'buyer'
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.carts
      where carts.id = cart_items.cart_id
        and carts.buyer_id = auth.uid()
        and public.current_user_role() = 'buyer'
    )
  );

drop policy if exists cart_items_delete_own_or_admin on public.cart_items;
create policy cart_items_delete_own_or_admin
  on public.cart_items
  for delete
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.carts
      where carts.id = cart_items.cart_id
        and carts.buyer_id = auth.uid()
        and public.current_user_role() = 'buyer'
    )
  );

drop policy if exists "Buyers can read own preferences" on public.buyer_preferences;
create policy "Buyers can read own preferences"
  on public.buyer_preferences
  for select
  to authenticated
  using (auth.uid() = buyer_id);

drop policy if exists "Buyers can insert own preferences" on public.buyer_preferences;
create policy "Buyers can insert own preferences"
  on public.buyer_preferences
  for insert
  to authenticated
  with check (auth.uid() = buyer_id);

drop policy if exists "Buyers can update own preferences" on public.buyer_preferences;
create policy "Buyers can update own preferences"
  on public.buyer_preferences
  for update
  to authenticated
  using (auth.uid() = buyer_id)
  with check (auth.uid() = buyer_id);

drop policy if exists "Buyers can delete own preferences" on public.buyer_preferences;
create policy "Buyers can delete own preferences"
  on public.buyer_preferences
  for delete
  to authenticated
  using (auth.uid() = buyer_id);

drop policy if exists "Buyers can read own favorites" on public.buyer_favorites;
create policy "Buyers can read own favorites"
  on public.buyer_favorites
  for select
  to authenticated
  using (auth.uid() = buyer_id);

drop policy if exists "Buyers can insert own favorites" on public.buyer_favorites;
create policy "Buyers can insert own favorites"
  on public.buyer_favorites
  for insert
  to authenticated
  with check (auth.uid() = buyer_id);

drop policy if exists "Buyers can delete own favorites" on public.buyer_favorites;
create policy "Buyers can delete own favorites"
  on public.buyer_favorites
  for delete
  to authenticated
  using (auth.uid() = buyer_id);

drop policy if exists orders_select_related_or_admin on public.orders;
create policy orders_select_related_or_admin
  on public.orders
  for select
  to authenticated
  using (
    public.is_admin()
    or buyer_id = auth.uid()
    or exists (
      select 1
      from public.order_items
      where order_items.order_id = orders.id
        and order_items.artisan_id = auth.uid()
    )
  );

drop policy if exists orders_insert_admin_only on public.orders;
create policy orders_insert_admin_only
  on public.orders
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists orders_update_admin_only on public.orders;
create policy orders_update_admin_only
  on public.orders
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists orders_delete_admin_only on public.orders;
create policy orders_delete_admin_only
  on public.orders
  for delete
  to authenticated
  using (public.is_admin());

drop policy if exists order_items_select_related_or_admin on public.order_items;
create policy order_items_select_related_or_admin
  on public.order_items
  for select
  to authenticated
  using (
    public.is_admin()
    or artisan_id = auth.uid()
    or exists (
      select 1
      from public.orders
      where orders.id = order_items.order_id
        and orders.buyer_id = auth.uid()
    )
  );

drop policy if exists order_items_insert_admin_only on public.order_items;
create policy order_items_insert_admin_only
  on public.order_items
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists order_items_update_admin_only on public.order_items;
create policy order_items_update_admin_only
  on public.order_items
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists order_items_delete_admin_only on public.order_items;
create policy order_items_delete_admin_only
  on public.order_items
  for delete
  to authenticated
  using (public.is_admin());

drop policy if exists payment_attempts_select_related_or_admin on public.payment_attempts;
create policy payment_attempts_select_related_or_admin
  on public.payment_attempts
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.orders
      where orders.id = payment_attempts.order_id
        and orders.buyer_id = auth.uid()
    )
  );

drop policy if exists payment_attempts_insert_admin_only on public.payment_attempts;
create policy payment_attempts_insert_admin_only
  on public.payment_attempts
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists payment_attempts_update_admin_only on public.payment_attempts;
create policy payment_attempts_update_admin_only
  on public.payment_attempts
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists payment_attempts_delete_admin_only on public.payment_attempts;
create policy payment_attempts_delete_admin_only
  on public.payment_attempts
  for delete
  to authenticated
  using (public.is_admin());

drop policy if exists payment_webhook_events_select_admin_only on public.payment_webhook_events;
create policy payment_webhook_events_select_admin_only
  on public.payment_webhook_events
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists payment_webhook_events_insert_admin_only on public.payment_webhook_events;
create policy payment_webhook_events_insert_admin_only
  on public.payment_webhook_events
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists payment_webhook_events_update_admin_only on public.payment_webhook_events;
create policy payment_webhook_events_update_admin_only
  on public.payment_webhook_events
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists payment_webhook_events_delete_admin_only on public.payment_webhook_events;
create policy payment_webhook_events_delete_admin_only
  on public.payment_webhook_events
  for delete
  to authenticated
  using (public.is_admin());

create or replace function public.apply_paid_order_inventory(target_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  stock_item record;
begin
  for stock_item in
    select
      oi.id as order_item_id,
      oi.product_id,
      oi.product_title,
      oi.quantity,
      p.stock_quantity
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    where oi.order_id = target_order_id
      and oi.availability_mode = 'stock'
      and oi.stock_applied_at is null
    for update of oi, p
  loop
    if coalesce(stock_item.stock_quantity, 0) < stock_item.quantity then
      raise exception 'Insufficient stock for %', stock_item.product_title;
    end if;

    update public.products
    set stock_quantity = stock_quantity - stock_item.quantity
    where id = stock_item.product_id;

    update public.order_items
    set stock_applied_at = now()
    where id = stock_item.order_item_id
      and stock_applied_at is null;
  end loop;
end;
$function$;

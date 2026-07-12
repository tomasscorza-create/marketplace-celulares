create or replace function public.can_read_order(
  requested_order_id uuid,
  requested_buyer_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or requested_buyer_id = auth.uid()
    or exists (
      select 1
      from public.order_items
      where order_items.order_id = requested_order_id
        and order_items.artisan_id = auth.uid()
    );
$$;

revoke all on function public.can_read_order(uuid, uuid) from public;
grant execute on function public.can_read_order(uuid, uuid) to authenticated;

create or replace function public.can_read_order_by_id(requested_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.orders
      where orders.id = requested_order_id
        and orders.buyer_id = auth.uid()
    )
    or exists (
      select 1
      from public.order_items
      where order_items.order_id = requested_order_id
        and order_items.artisan_id = auth.uid()
    );
$$;

revoke all on function public.can_read_order_by_id(uuid) from public;
grant execute on function public.can_read_order_by_id(uuid) to authenticated;

create or replace function public.can_read_order_item(
  requested_order_id uuid,
  requested_artisan_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or requested_artisan_id = auth.uid()
    or exists (
      select 1
      from public.orders
      where orders.id = requested_order_id
        and orders.buyer_id = auth.uid()
    );
$$;

revoke all on function public.can_read_order_item(uuid, uuid) from public;
grant execute on function public.can_read_order_item(uuid, uuid) to authenticated;

drop policy if exists orders_select_related_or_admin on public.orders;
create policy orders_select_related_or_admin
  on public.orders
  for select
  to authenticated
  using (public.can_read_order(id, buyer_id));

drop policy if exists order_items_select_related_or_admin on public.order_items;
create policy order_items_select_related_or_admin
  on public.order_items
  for select
  to authenticated
  using (public.can_read_order_item(order_id, artisan_id));

drop policy if exists order_events_select_related_or_admin on public.order_events;
create policy order_events_select_related_or_admin
  on public.order_events
  for select
  to authenticated
  using (public.can_read_order_by_id(order_id));

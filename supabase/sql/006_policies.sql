create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid();
$$;

revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated;

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_insert_own_or_admin on public.profiles;
drop policy if exists profiles_insert_admin_only on public.profiles;
create policy profiles_insert_admin_only
  on public.profiles
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (
    public.is_admin()
    or (
      id = auth.uid()
      and role in ('artisan', 'buyer')
      and role = public.current_user_role()
    )
  );

drop policy if exists profiles_delete_admin_only on public.profiles;
create policy profiles_delete_admin_only
  on public.profiles
  for delete
  to authenticated
  using (public.is_admin());

drop policy if exists categories_select_active_public on public.categories;
create policy categories_select_active_public
  on public.categories
  for select
  to anon
  using (is_active = true);

drop policy if exists categories_select_active_or_admin on public.categories;
create policy categories_select_active_or_admin
  on public.categories
  for select
  to authenticated
  using (is_active = true or public.is_admin());

drop policy if exists categories_insert_admin_only on public.categories;
create policy categories_insert_admin_only
  on public.categories
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists categories_update_admin_only on public.categories;
create policy categories_update_admin_only
  on public.categories
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists categories_delete_admin_only on public.categories;
create policy categories_delete_admin_only
  on public.categories
  for delete
  to authenticated
  using (public.is_admin());

drop policy if exists products_select_active_public on public.products;
create policy products_select_active_public
  on public.products
  for select
  to anon
  using (is_active = true);

drop policy if exists products_select_scope_authenticated on public.products;
create policy products_select_scope_authenticated
  on public.products
  for select
  to authenticated
  using (
    is_active = true
    or artisan_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists products_insert_owner_or_admin on public.products;
create policy products_insert_owner_or_admin
  on public.products
  for insert
  to authenticated
  with check (
    artisan_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists products_update_owner_or_admin on public.products;
create policy products_update_owner_or_admin
  on public.products
  for update
  to authenticated
  using (
    artisan_id = auth.uid()
    or public.is_admin()
  )
  with check (
    artisan_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists products_delete_owner_or_admin on public.products;
create policy products_delete_owner_or_admin
  on public.products
  for delete
  to authenticated
  using (
    artisan_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists orders_select_related_or_admin on public.orders;
create policy orders_select_related_or_admin
  on public.orders
  for select
  to authenticated
  using (
    public.is_admin()
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
    artisan_id = auth.uid()
    or public.is_admin()
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

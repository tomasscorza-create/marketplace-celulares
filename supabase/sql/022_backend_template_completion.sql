alter table public.order_items
  add column if not exists fulfillment_status text not null default 'pending'::text;

alter table public.order_items
  drop constraint if exists order_items_fulfillment_status_check;

alter table public.order_items
  add constraint order_items_fulfillment_status_check
    check (fulfillment_status in ('pending', 'preparing', 'ready', 'delivered', 'cancelled'));

create index if not exists order_items_fulfillment_status_idx
  on public.order_items (fulfillment_status);

create table if not exists public.site_content (
  content_key text primary key,
  value text not null default ''::text,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

drop policy if exists site_content_select_public on public.site_content;
create policy site_content_select_public
  on public.site_content
  for select
  to anon, authenticated
  using (true);

drop policy if exists site_content_insert_admin_only on public.site_content;
create policy site_content_insert_admin_only
  on public.site_content
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists site_content_update_admin_only on public.site_content;
create policy site_content_update_admin_only
  on public.site_content
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists site_content_delete_admin_only on public.site_content;
create policy site_content_delete_admin_only
  on public.site_content
  for delete
  to authenticated
  using (public.is_admin());

create table if not exists public.order_events (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  order_item_id uuid references public.order_items (id) on delete set null,
  event_type text not null,
  actor_id uuid references public.profiles (id) on delete set null,
  actor_role text not null default 'system'::text,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint order_events_actor_role_check
    check (actor_role in ('admin', 'artisan', 'buyer', 'system'))
);

create index if not exists order_events_order_id_created_at_idx
  on public.order_events (order_id, created_at desc);

create index if not exists order_events_order_item_id_idx
  on public.order_events (order_item_id);

alter table public.order_events enable row level security;

drop policy if exists order_events_select_related_or_admin on public.order_events;
create policy order_events_select_related_or_admin
  on public.order_events
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.orders
      where orders.id = order_events.order_id
        and orders.buyer_id = auth.uid()
    )
    or exists (
      select 1
      from public.order_items
      where order_items.order_id = order_events.order_id
        and order_items.artisan_id = auth.uid()
    )
  );

drop policy if exists order_events_insert_admin_only on public.order_events;
create policy order_events_insert_admin_only
  on public.order_events
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists order_events_update_admin_only on public.order_events;
create policy order_events_update_admin_only
  on public.order_events
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists order_events_delete_admin_only on public.order_events;
create policy order_events_delete_admin_only
  on public.order_events
  for delete
  to authenticated
  using (public.is_admin());

create table if not exists public.catalog_activity_events (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  artisan_id uuid references public.profiles (id) on delete cascade,
  category_id uuid references public.categories (id) on delete cascade,
  product_id uuid references public.products (id) on delete cascade,
  search_term text,
  created_at timestamptz not null default now(),
  constraint catalog_activity_events_has_signal_check
    check (
      artisan_id is not null
      or category_id is not null
      or product_id is not null
      or nullif(btrim(coalesce(search_term, ''::text)), ''::text) is not null
    )
);

create index if not exists catalog_activity_events_user_created_at_idx
  on public.catalog_activity_events (user_id, created_at desc);

alter table public.catalog_activity_events enable row level security;

drop policy if exists catalog_activity_events_select_own_or_admin on public.catalog_activity_events;
create policy catalog_activity_events_select_own_or_admin
  on public.catalog_activity_events
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists catalog_activity_events_insert_own on public.catalog_activity_events;
create policy catalog_activity_events_insert_own
  on public.catalog_activity_events
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists catalog_activity_events_delete_own_or_admin on public.catalog_activity_events;
create policy catalog_activity_events_delete_own_or_admin
  on public.catalog_activity_events
  for delete
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create or replace function public.update_order_item_fulfillment_status(
  p_order_item_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_actor_role text;
begin
  if p_status not in ('pending', 'preparing', 'ready', 'delivered', 'cancelled') then
    raise exception 'Invalid fulfillment status: %', p_status;
  end if;

  select
    oi.id,
    oi.order_id,
    oi.artisan_id,
    o.buyer_id
  into v_item
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where oi.id = p_order_item_id;

  if v_item.id is null then
    raise exception 'Order item not found';
  end if;

  v_actor_role := coalesce(public.current_user_role(), 'system');

  if not public.is_admin() and not (v_actor_role = 'artisan' and v_item.artisan_id = auth.uid()) then
    raise exception 'Not allowed to update this order item';
  end if;

  update public.order_items
  set fulfillment_status = p_status
  where id = p_order_item_id;

  update public.orders
  set
    fulfillment_status = case
      when exists (
        select 1
        from public.order_items
        where order_id = v_item.order_id
          and fulfillment_status = 'cancelled'
      ) then 'cancelled'
      when not exists (
        select 1
        from public.order_items
        where order_id = v_item.order_id
          and fulfillment_status <> 'delivered'
      ) then 'delivered'
      when exists (
        select 1
        from public.order_items
        where order_id = v_item.order_id
          and fulfillment_status = 'ready'
      ) then 'ready'
      when exists (
        select 1
        from public.order_items
        where order_id = v_item.order_id
          and fulfillment_status = 'preparing'
      ) then 'preparing'
      else 'pending'
    end,
    updated_at = now()
  where id = v_item.order_id;

  insert into public.order_events (
    order_id,
    order_item_id,
    event_type,
    actor_id,
    actor_role,
    metadata
  )
  values (
    v_item.order_id,
    p_order_item_id,
    'fulfillment_status_updated',
    auth.uid(),
    case when v_actor_role in ('admin', 'artisan', 'buyer') then v_actor_role else 'system' end,
    jsonb_build_object('fulfillment_status', p_status)
  );
end;
$$;

revoke all on function public.update_order_item_fulfillment_status(uuid, text) from public;
grant execute on function public.update_order_item_fulfillment_status(uuid, text) to authenticated;

create or replace function public.record_catalog_activity_event_v1(
  requested_artisan_id uuid default null,
  requested_category_id uuid default null,
  requested_product_id uuid default null,
  requested_search_term text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_search_term text;
begin
  if auth.uid() is null then
    return;
  end if;

  v_search_term := nullif(
    left(btrim(regexp_replace(coalesce(requested_search_term, ''::text), '[[:space:]]+', ' ', 'g')), 80),
    ''::text
  );

  if requested_artisan_id is null
    and requested_category_id is null
    and requested_product_id is null
    and v_search_term is null then
    return;
  end if;

  insert into public.catalog_activity_events (
    user_id,
    artisan_id,
    category_id,
    product_id,
    search_term
  )
  values (
    auth.uid(),
    requested_artisan_id,
    requested_category_id,
    requested_product_id,
    v_search_term
  );
end;
$$;

revoke all on function public.record_catalog_activity_event_v1(uuid, uuid, uuid, text) from public;
grant execute on function public.record_catalog_activity_event_v1(uuid, uuid, uuid, text) to authenticated;

create or replace function public.get_catalog_activity_state_v1()
returns table (
  "recentArtisanIds" uuid[],
  "recentCategoryIds" uuid[],
  "recentProductIds" uuid[],
  "recentSearches" text[],
  recent_artisan_ids uuid[],
  recent_category_ids uuid[],
  recent_product_ids uuid[],
  recent_searches text[]
)
language sql
stable
security definer
set search_path = public
as $$
  with recent_artisans as (
    select artisan_id, max(created_at) as last_seen_at
    from public.catalog_activity_events
    where user_id = auth.uid()
      and artisan_id is not null
    group by artisan_id
    order by last_seen_at desc
    limit 6
  ),
  recent_categories as (
    select category_id, max(created_at) as last_seen_at
    from public.catalog_activity_events
    where user_id = auth.uid()
      and category_id is not null
    group by category_id
    order by last_seen_at desc
    limit 6
  ),
  recent_products as (
    select product_id, max(created_at) as last_seen_at
    from public.catalog_activity_events
    where user_id = auth.uid()
      and product_id is not null
    group by product_id
    order by last_seen_at desc
    limit 12
  ),
  recent_terms as (
    select search_term, max(created_at) as last_seen_at
    from public.catalog_activity_events
    where user_id = auth.uid()
      and nullif(btrim(coalesce(search_term, ''::text)), ''::text) is not null
    group by search_term
    order by last_seen_at desc
    limit 6
  ),
  state as (
    select
      coalesce(array_agg(recent_artisans.artisan_id order by recent_artisans.last_seen_at desc), '{}'::uuid[]) as artisan_ids,
      coalesce((select array_agg(category_id order by last_seen_at desc) from recent_categories), '{}'::uuid[]) as category_ids,
      coalesce((select array_agg(product_id order by last_seen_at desc) from recent_products), '{}'::uuid[]) as product_ids,
      coalesce((select array_agg(search_term order by last_seen_at desc) from recent_terms), '{}'::text[]) as searches
    from recent_artisans
  )
  select
    state.artisan_ids as "recentArtisanIds",
    state.category_ids as "recentCategoryIds",
    state.product_ids as "recentProductIds",
    state.searches as "recentSearches",
    state.artisan_ids as recent_artisan_ids,
    state.category_ids as recent_category_ids,
    state.product_ids as recent_product_ids,
    state.searches as recent_searches
  from state;
$$;

revoke all on function public.get_catalog_activity_state_v1() from public;
grant execute on function public.get_catalog_activity_state_v1() to authenticated;

create or replace function public.get_public_buyer_profile_v1(requested_buyer_id uuid)
returns table (
  id uuid,
  full_name text,
  profile_image_url text,
  profile_bio text,
  bio_source text,
  orders_count bigint,
  last_order_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    p.profile_image_url,
    nullif(p.store_description, ''::text) as profile_bio,
    case
      when nullif(p.store_description, ''::text) is not null then 'store_description'
      else null
    end as bio_source,
    count(o.id)::bigint as orders_count,
    max(o.created_at) as last_order_at,
    p.created_at
  from public.profiles p
  left join public.orders o on o.buyer_id = p.id
  where p.id = requested_buyer_id
    and p.role = 'buyer'
  group by p.id, p.full_name, p.profile_image_url, p.store_description, p.created_at;
$$;

revoke all on function public.get_public_buyer_profile_v1(uuid) from public;
grant execute on function public.get_public_buyer_profile_v1(uuid) to anon, authenticated;

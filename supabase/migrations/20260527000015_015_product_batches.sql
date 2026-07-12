begin;

create table if not exists public.product_batches (
  id uuid primary key default extensions.gen_random_uuid(),
  artisan_id uuid not null references public.profiles (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  batch_code text not null unique,
  title_base text not null,
  description_base text not null,
  price_base numeric(12, 2) not null check (price_base > 0),
  category_id uuid not null references public.categories (id) on delete restrict,
  availability_mode_base text not null check (availability_mode_base in ('stock', 'made_to_order')),
  stock_quantity_base integer check (stock_quantity_base is null or stock_quantity_base >= 0),
  lead_time_days_base integer check (lead_time_days_base is null or lead_time_days_base > 0),
  made_to_order_options_base jsonb not null default '[]'::jsonb,
  product_attributes_base jsonb not null default '[]'::jsonb,
  is_active_base boolean not null default true,
  item_count integer not null default 0 check (item_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_batches_artisan_id_idx
  on public.product_batches (artisan_id);

create index if not exists product_batches_created_at_idx
  on public.product_batches (created_at desc);

alter table public.product_batches enable row level security;

alter table public.products
  add column if not exists batch_id uuid references public.product_batches (id) on delete set null,
  add column if not exists batch_code text,
  add column if not exists batch_position integer,
  add column if not exists created_via_batch boolean not null default false,
  add column if not exists product_attributes jsonb not null default '[]'::jsonb;

alter table public.product_batches
  add column if not exists product_attributes_base jsonb not null default '[]'::jsonb;

create index if not exists products_batch_id_idx
  on public.products (batch_id);

create index if not exists products_batch_code_idx
  on public.products (batch_code);

create index if not exists products_batch_position_idx
  on public.products (batch_position);

drop policy if exists product_batches_select_owner_or_admin on public.product_batches;
create policy product_batches_select_owner_or_admin
  on public.product_batches
  for select
  to authenticated
  using (artisan_id = auth.uid() or public.is_admin());

drop policy if exists product_batches_insert_owner_or_admin on public.product_batches;
create policy product_batches_insert_owner_or_admin
  on public.product_batches
  for insert
  to authenticated
  with check (artisan_id = auth.uid() or public.is_admin());

drop policy if exists product_batches_update_owner_or_admin on public.product_batches;
create policy product_batches_update_owner_or_admin
  on public.product_batches
  for update
  to authenticated
  using (artisan_id = auth.uid() or public.is_admin())
  with check (artisan_id = auth.uid() or public.is_admin());

drop policy if exists product_batches_delete_owner_or_admin on public.product_batches;
create policy product_batches_delete_owner_or_admin
  on public.product_batches
  for delete
  to authenticated
  using (artisan_id = auth.uid() or public.is_admin());

create or replace function public.generate_product_batch_code()
returns text
language plpgsql
as $$
begin
  return 'LOTE-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(extensions.gen_random_uuid()::text, '-', ''), 1, 8));
end;
$$;

create or replace function public.create_product_batch(
  p_artisan_id uuid,
  p_batch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_batch_id uuid;
  v_batch_code text := public.generate_product_batch_code();
  v_created_count integer := 0;
  v_product_ids uuid[] := '{}'::uuid[];
  v_item jsonb;
  v_product_id uuid;
  v_item_product_media jsonb;
begin
  if v_actor_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_admin() and p_artisan_id <> v_actor_id then
    raise exception 'No tenés permisos para crear este grupo.';
  end if;

  if coalesce(jsonb_array_length(p_batch -> 'items'), 0) = 0 then
    raise exception 'Necesitás al menos una foto para crear el grupo.';
  end if;

  insert into public.product_batches (
    artisan_id,
    created_by,
    batch_code,
    title_base,
    description_base,
    price_base,
    category_id,
    availability_mode_base,
    stock_quantity_base,
    lead_time_days_base,
    made_to_order_options_base,
    product_attributes_base,
    is_active_base,
    item_count
  )
  values (
    p_artisan_id,
    v_actor_id,
    v_batch_code,
    trim(coalesce(p_batch ->> 'title_base', '')),
    trim(coalesce(p_batch ->> 'description_base', '')),
    coalesce((p_batch ->> 'price_base')::numeric, 0),
    (p_batch ->> 'category_id')::uuid,
    coalesce(p_batch ->> 'availability_mode_base', 'stock'),
    case
      when coalesce(p_batch ->> 'availability_mode_base', 'stock') = 'stock'
        then coalesce((p_batch ->> 'stock_quantity_base')::integer, 0)
      else null
    end,
    case
      when coalesce(p_batch ->> 'availability_mode_base', 'stock') = 'made_to_order'
        then nullif(p_batch ->> 'lead_time_days_base', '')::integer
      else null
    end,
    coalesce(p_batch -> 'made_to_order_options_base', '[]'::jsonb),
    coalesce(p_batch -> 'product_attributes_base', '[]'::jsonb),
    coalesce((p_batch ->> 'is_active_base')::boolean, true),
    coalesce(jsonb_array_length(p_batch -> 'items'), 0)
  )
  returning id into v_batch_id;

  for v_item in
    select value
    from jsonb_array_elements(p_batch -> 'items')
  loop
    v_item_product_media := case
      when coalesce(jsonb_array_length(v_item -> 'product_media'), 0) > 0
        then v_item -> 'product_media'
      else jsonb_build_array(
        jsonb_build_object(
          'url', v_item ->> 'image_url',
          'description', trim(coalesce(v_item ->> 'image_description', ''))
        )
      )
    end;

    insert into public.products (
      artisan_id,
      batch_id,
      batch_code,
      batch_position,
      created_via_batch,
      category_id,
      title,
      description,
      price,
      image_url,
      image_urls,
      product_media,
      is_active,
      availability_mode,
      stock_quantity,
      lead_time_days,
      made_to_order_options
      ,product_attributes
    )
    values (
      p_artisan_id,
      v_batch_id,
      v_batch_code,
      coalesce((v_item ->> 'position')::integer, v_created_count + 1),
      true,
      (p_batch ->> 'category_id')::uuid,
      trim(coalesce(v_item ->> 'title', '')),
      trim(coalesce(v_item ->> 'description', '')),
      coalesce((v_item ->> 'price')::numeric, 0),
      coalesce(v_item_product_media -> 0 ->> 'url', v_item ->> 'image_url'),
      array(
        select media_item ->> 'url'
        from jsonb_array_elements(v_item_product_media) as media_item
      ),
      v_item_product_media,
      coalesce((p_batch ->> 'is_active_base')::boolean, true),
      coalesce(p_batch ->> 'availability_mode_base', 'stock'),
      case
        when coalesce(p_batch ->> 'availability_mode_base', 'stock') = 'stock'
          then coalesce((v_item ->> 'stock_quantity')::integer, 0)
        else null
      end,
      case
        when coalesce(p_batch ->> 'availability_mode_base', 'stock') = 'made_to_order'
          then nullif(p_batch ->> 'lead_time_days_base', '')::integer
        else null
      end,
      case
        when coalesce(p_batch ->> 'availability_mode_base', 'stock') = 'made_to_order'
          then coalesce(p_batch -> 'made_to_order_options_base', '[]'::jsonb)
        else '[]'::jsonb
      end,
      coalesce(p_batch -> 'product_attributes_base', '[]'::jsonb)
    )
    returning id into v_product_id;

    v_created_count := v_created_count + 1;
    v_product_ids := array_append(v_product_ids, v_product_id);
  end loop;

  update public.product_batches
  set item_count = v_created_count,
      updated_at = now()
  where id = v_batch_id;

  return jsonb_build_object(
    'batch_id', v_batch_id,
    'batch_code', v_batch_code,
    'created_count', v_created_count,
    'updated_count', 0,
    'deleted_count', 0,
    'obsolete_image_urls', '[]'::jsonb,
    'product_ids', to_jsonb(v_product_ids)
  );
end;
$$;

create or replace function public.update_product_batch(
  p_batch_id uuid,
  p_batch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_artisan_id uuid;
  v_batch_code text;
  v_created_count integer := 0;
  v_updated_count integer := 0;
  v_deleted_count integer := 0;
  v_product_ids uuid[] := '{}'::uuid[];
  v_keep_ids uuid[] := '{}'::uuid[];
  v_obsolete_image_urls text[] := '{}'::text[];
  v_item jsonb;
  v_existing_product_id uuid;
  v_previous_image_urls text[];
  v_previous_product_media jsonb;
  v_product_id uuid;
  v_item_product_media jsonb;
  v_previous_original_urls text[];
begin
  if v_actor_id is null then
    raise exception 'Unauthorized';
  end if;

  select artisan_id, batch_code
  into v_artisan_id, v_batch_code
  from public.product_batches
  where id = p_batch_id;

  if v_artisan_id is null then
    raise exception 'No encontramos el grupo solicitado.';
  end if;

  if not public.is_admin() and v_artisan_id <> v_actor_id then
    raise exception 'No tenés permisos para editar este grupo.';
  end if;

  if coalesce(jsonb_array_length(p_batch -> 'items'), 0) = 0 then
    raise exception 'El grupo debe conservar al menos un producto.';
  end if;

  update public.product_batches
  set
    title_base = trim(coalesce(p_batch ->> 'title_base', '')),
    description_base = trim(coalesce(p_batch ->> 'description_base', '')),
    price_base = coalesce((p_batch ->> 'price_base')::numeric, 0),
    category_id = (p_batch ->> 'category_id')::uuid,
    availability_mode_base = coalesce(p_batch ->> 'availability_mode_base', 'stock'),
    stock_quantity_base = case
      when coalesce(p_batch ->> 'availability_mode_base', 'stock') = 'stock'
        then coalesce((p_batch ->> 'stock_quantity_base')::integer, 0)
      else null
    end,
    lead_time_days_base = case
      when coalesce(p_batch ->> 'availability_mode_base', 'stock') = 'made_to_order'
        then nullif(p_batch ->> 'lead_time_days_base', '')::integer
      else null
    end,
    made_to_order_options_base = coalesce(p_batch -> 'made_to_order_options_base', '[]'::jsonb),
    product_attributes_base = coalesce(p_batch -> 'product_attributes_base', '[]'::jsonb),
    is_active_base = coalesce((p_batch ->> 'is_active_base')::boolean, true),
    updated_at = now()
  where id = p_batch_id;

  for v_item in
    select value
    from jsonb_array_elements(p_batch -> 'items')
  loop
    v_existing_product_id := nullif(v_item ->> 'existing_product_id', '')::uuid;
    v_item_product_media := case
      when coalesce(jsonb_array_length(v_item -> 'product_media'), 0) > 0
        then v_item -> 'product_media'
      else jsonb_build_array(
        jsonb_build_object(
          'url', v_item ->> 'image_url',
          'description', trim(coalesce(v_item ->> 'image_description', ''))
        )
      )
    end;

    if v_existing_product_id is not null then
      select image_urls, product_media
      into v_previous_image_urls, v_previous_product_media
      from public.products
      where id = v_existing_product_id
        and batch_id = p_batch_id;

      if v_previous_image_urls is null then
        raise exception 'Uno de los productos del grupo ya no existe.';
      end if;

      update public.products
      set
        category_id = (p_batch ->> 'category_id')::uuid,
        title = trim(coalesce(v_item ->> 'title', '')),
        description = trim(coalesce(v_item ->> 'description', '')),
        price = coalesce((v_item ->> 'price')::numeric, 0),
        image_url = coalesce(v_item_product_media -> 0 ->> 'url', v_item ->> 'image_url'),
        image_urls = array(
          select media_item ->> 'url'
          from jsonb_array_elements(v_item_product_media) as media_item
        ),
        product_media = v_item_product_media,
        is_active = coalesce((p_batch ->> 'is_active_base')::boolean, true),
        availability_mode = coalesce(p_batch ->> 'availability_mode_base', 'stock'),
        stock_quantity = case
          when coalesce(p_batch ->> 'availability_mode_base', 'stock') = 'stock'
            then coalesce((v_item ->> 'stock_quantity')::integer, 0)
          else null
        end,
        lead_time_days = case
          when coalesce(p_batch ->> 'availability_mode_base', 'stock') = 'made_to_order'
            then nullif(p_batch ->> 'lead_time_days_base', '')::integer
          else null
        end,
        made_to_order_options = case
          when coalesce(p_batch ->> 'availability_mode_base', 'stock') = 'made_to_order'
            then coalesce(p_batch -> 'made_to_order_options_base', '[]'::jsonb)
          else '[]'::jsonb
        end,
        product_attributes = coalesce(p_batch -> 'product_attributes_base', '[]'::jsonb),
        batch_position = coalesce((v_item ->> 'position')::integer, 1)
      where id = v_existing_product_id
        and batch_id = p_batch_id;

      if coalesce(v_previous_product_media, '[]'::jsonb) is distinct from v_item_product_media then
        select coalesce(
          array_agg(distinct previous_media_url),
          '{}'::text[]
        )
        into v_previous_original_urls
        from (
          select previous_image_url as previous_media_url
          from unnest(coalesce(v_previous_image_urls, '{}'::text[])) as previous_image_url
          union
          select media_item ->> 'original_url' as previous_media_url
          from jsonb_array_elements(coalesce(v_previous_product_media, '[]'::jsonb)) as media_item
          union
          select media_item ->> 'thumbnail_url' as previous_media_url
          from jsonb_array_elements(coalesce(v_previous_product_media, '[]'::jsonb)) as media_item
        ) previous_media_urls
        where coalesce(previous_media_url, '') <> ''
          and previous_media_url not in (
            select next_media_url
            from (
              select media_item ->> 'url' as next_media_url
              from jsonb_array_elements(coalesce(v_item_product_media, '[]'::jsonb)) as media_item
              union
              select media_item ->> 'original_url' as next_media_url
              from jsonb_array_elements(coalesce(v_item_product_media, '[]'::jsonb)) as media_item
              union
              select media_item ->> 'thumbnail_url' as next_media_url
              from jsonb_array_elements(coalesce(v_item_product_media, '[]'::jsonb)) as media_item
            ) next_media_urls
            where coalesce(next_media_url, '') <> ''
          );
        v_obsolete_image_urls := array_cat(v_obsolete_image_urls, coalesce(v_previous_original_urls, '{}'::text[]));
      end if;

      v_updated_count := v_updated_count + 1;
      v_keep_ids := array_append(v_keep_ids, v_existing_product_id);
      v_product_ids := array_append(v_product_ids, v_existing_product_id);
    else
      insert into public.products (
        artisan_id,
        batch_id,
        batch_code,
        batch_position,
        created_via_batch,
        category_id,
        title,
        description,
        price,
        image_url,
        image_urls,
        product_media,
        is_active,
        availability_mode,
        stock_quantity,
        lead_time_days,
        made_to_order_options
        ,product_attributes
      )
      values (
        v_artisan_id,
        p_batch_id,
        v_batch_code,
        coalesce((v_item ->> 'position')::integer, v_created_count + v_updated_count + 1),
        true,
        (p_batch ->> 'category_id')::uuid,
        trim(coalesce(v_item ->> 'title', '')),
        trim(coalesce(v_item ->> 'description', '')),
        coalesce((v_item ->> 'price')::numeric, 0),
        coalesce(v_item_product_media -> 0 ->> 'url', v_item ->> 'image_url'),
        array(
          select media_item ->> 'url'
          from jsonb_array_elements(v_item_product_media) as media_item
        ),
        v_item_product_media,
        coalesce((p_batch ->> 'is_active_base')::boolean, true),
        coalesce(p_batch ->> 'availability_mode_base', 'stock'),
        case
          when coalesce(p_batch ->> 'availability_mode_base', 'stock') = 'stock'
            then coalesce((v_item ->> 'stock_quantity')::integer, 0)
          else null
        end,
        case
          when coalesce(p_batch ->> 'availability_mode_base', 'stock') = 'made_to_order'
            then nullif(p_batch ->> 'lead_time_days_base', '')::integer
          else null
        end,
        case
          when coalesce(p_batch ->> 'availability_mode_base', 'stock') = 'made_to_order'
            then coalesce(p_batch -> 'made_to_order_options_base', '[]'::jsonb)
          else '[]'::jsonb
        end,
        coalesce(p_batch -> 'product_attributes_base', '[]'::jsonb)
      )
      returning id into v_product_id;

      v_created_count := v_created_count + 1;
      v_keep_ids := array_append(v_keep_ids, v_product_id);
      v_product_ids := array_append(v_product_ids, v_product_id);
    end if;
  end loop;

  with removed_products as (
    select id, image_urls, product_media
    from public.products
    where batch_id = p_batch_id
      and not (id = any(v_keep_ids))
  ),
  removed_media_urls as (
    select removed_image_url as media_url
    from removed_products
    left join lateral unnest(coalesce(removed_products.image_urls, '{}'::text[])) as removed_image_url on true
    union
    select media_item ->> 'original_url' as media_url
    from removed_products
    cross join lateral jsonb_array_elements(coalesce(removed_products.product_media, '[]'::jsonb)) as media_item
    where coalesce(media_item ->> 'original_url', '') <> ''
    union
    select media_item ->> 'thumbnail_url' as media_url
    from removed_products
    cross join lateral jsonb_array_elements(coalesce(removed_products.product_media, '[]'::jsonb)) as media_item
    where coalesce(media_item ->> 'thumbnail_url', '') <> ''
  )
  select
    (select count(*) from removed_products),
    coalesce(array_agg(distinct media_url), '{}'::text[])
  into v_deleted_count, v_previous_image_urls
  from removed_media_urls;

  if v_deleted_count > 0 then
    delete from public.products
    where batch_id = p_batch_id
      and not (id = any(v_keep_ids));
  end if;

  v_obsolete_image_urls := array_cat(v_obsolete_image_urls, coalesce(v_previous_image_urls, '{}'::text[]));

  update public.product_batches
  set item_count = coalesce(array_length(v_keep_ids, 1), 0),
      updated_at = now()
  where id = p_batch_id;

  return jsonb_build_object(
    'batch_id', p_batch_id,
    'batch_code', v_batch_code,
    'created_count', v_created_count,
    'updated_count', v_updated_count,
    'deleted_count', v_deleted_count,
    'obsolete_image_urls', to_jsonb(v_obsolete_image_urls),
    'product_ids', to_jsonb(v_product_ids)
  );
end;
$$;

create or replace function public.delete_product_batch(
  p_batch_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_artisan_id uuid;
  v_batch_code text;
  v_deleted_count integer := 0;
  v_image_urls text[] := '{}'::text[];
begin
  if v_actor_id is null then
    raise exception 'Unauthorized';
  end if;

  select artisan_id, batch_code
  into v_artisan_id, v_batch_code
  from public.product_batches
  where id = p_batch_id;

  if v_artisan_id is null then
    raise exception 'No encontramos el grupo solicitado.';
  end if;

  if not public.is_admin() and v_artisan_id <> v_actor_id then
    raise exception 'No tenés permisos para eliminar este grupo.';
  end if;

  with removed_products as (
    select image_urls, product_media
    from public.products
    where batch_id = p_batch_id
  ),
  removed_media_urls as (
    select removed_image_url as media_url
    from removed_products
    left join lateral unnest(coalesce(removed_products.image_urls, '{}'::text[])) as removed_image_url on true
    union
    select media_item ->> 'original_url' as media_url
    from removed_products
    cross join lateral jsonb_array_elements(coalesce(removed_products.product_media, '[]'::jsonb)) as media_item
    where coalesce(media_item ->> 'original_url', '') <> ''
  )
  select
    (select count(*) from removed_products),
    coalesce(array_agg(distinct media_url), '{}'::text[])
  into v_deleted_count, v_image_urls
  from removed_media_urls;

  delete from public.products where batch_id = p_batch_id;
  delete from public.product_batches where id = p_batch_id;

  return jsonb_build_object(
    'batch_id', p_batch_id,
    'batch_code', v_batch_code,
    'created_count', 0,
    'updated_count', 0,
    'deleted_count', v_deleted_count,
    'obsolete_image_urls', to_jsonb(v_image_urls),
    'product_ids', '[]'::jsonb
  );
end;
$$;

grant execute on function public.generate_product_batch_code() to authenticated;
grant execute on function public.create_product_batch(uuid, jsonb) to authenticated;
grant execute on function public.update_product_batch(uuid, jsonb) to authenticated;
grant execute on function public.delete_product_batch(uuid) to authenticated;

commit;

-- Removes the discontinued product batch model after the frontend no longer reads it.
-- Recreates catalog RPCs first because their return contracts referenced removed columns.

drop function if exists public.get_public_catalog_product_feed_v5(
  uuid,
  uuid[],
  uuid[],
  uuid[],
  integer,
  integer,
  text[],
  text,
  text,
  text
);

create or replace function public.get_public_catalog_product_feed_v5(
  requested_category_id uuid default null,
  requested_interest_artisan_ids uuid[] default null,
  requested_interest_category_ids uuid[] default null,
  requested_interest_product_ids uuid[] default null,
  requested_limit integer default 24,
  requested_page integer default 1,
  requested_recent_searches text[] default null,
  requested_search text default null,
  requested_sort text default 'newest',
  requested_viewer_seed text default ''
)
returns table (
  id uuid,
  artisan_id uuid,
  category_id uuid,
  title text,
  description text,
  price numeric,
  image_url text,
  image_urls text[],
  product_media jsonb,
  product_attributes jsonb,
  is_active boolean,
  availability_mode text,
  stock_quantity integer,
  lead_time_days integer,
  made_to_order_options jsonb,
  created_at timestamptz,
  categories jsonb,
  catalog_boost_active boolean,
  total_products_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select
      greatest(1, coalesce(requested_limit, 24)) as page_limit,
      greatest(1, coalesce(requested_page, 1)) as page_number,
      nullif(trim(coalesce(requested_search, '')), '') as search_text,
      coalesce(nullif(trim(coalesce(requested_sort, '')), ''), 'newest') as sort_text,
      coalesce(requested_viewer_seed, '') as seed_text
  ),
  scoped as (
    select
      p.id,
      p.artisan_id,
      p.category_id,
      p.title,
      p.description,
      p.price,
      p.image_url,
      p.image_urls,
      p.product_media,
      p.product_attributes,
      p.is_active,
      p.availability_mode,
      p.stock_quantity,
      p.lead_time_days,
      p.made_to_order_options,
      p.created_at,
      c.name as category_name,
      (
        coalesce(pr.storefront_boost_multiplier, 1.00) > 1.00
        or (pac.boost_level is not null and pac.boost_until > now())
      ) as catalog_boost_active,
      count(*) over() as total_products_count,
      (
        (
          greatest(0::numeric, 30 - (extract(epoch from (now() - p.created_at)) / 86400)) +
          case
            when p.artisan_id = any(coalesce(requested_interest_artisan_ids, '{}'::uuid[])) then 12
            else 0
          end +
          case
            when p.category_id = any(coalesce(requested_interest_category_ids, '{}'::uuid[])) then 8
            else 0
          end +
          case
            when p.id = any(coalesce(requested_interest_product_ids, '{}'::uuid[])) then 10
            else 0
          end +
          ((abs(hashtext(p.id::text || (select seed_text from normalized))::bigint) % 1000)::numeric / 1000) * 8
        ) *
        least(
          2.00,
          coalesce(pr.storefront_boost_multiplier, 1.00) *
          case
            when pac.boost_level = 'maximo' and pac.boost_until > now() then 1.35
            when pac.boost_level = 'moderado' and pac.boost_until > now() then 1.20
            when pac.boost_level = 'medio' and pac.boost_until > now() then 1.10
            else 1.00
          end
        )
      ) as catalog_rank_score
    from public.products p
    join public.profiles pr
      on pr.id = p.artisan_id
    left join public.categories c
      on c.id = p.category_id
    left join public.product_admin_controls pac
      on pac.product_id = p.id
    cross join normalized n
    where p.is_active = true
      and pr.role = 'artisan'
      and pr.storefront_hidden_at is null
      and (requested_category_id is null or p.category_id = requested_category_id)
      and (
        n.search_text is null
        or p.title ilike '%' || n.search_text || '%'
        or p.description ilike '%' || n.search_text || '%'
        or c.name ilike '%' || n.search_text || '%'
        or pr.full_name ilike '%' || n.search_text || '%'
        or pr.store_name ilike '%' || n.search_text || '%'
        or pr.store_description ilike '%' || n.search_text || '%'
      )
  )
  select
    scoped.id,
    scoped.artisan_id,
    scoped.category_id,
    scoped.title,
    scoped.description,
    scoped.price,
    scoped.image_url,
    scoped.image_urls,
    scoped.product_media,
    scoped.product_attributes,
    scoped.is_active,
    scoped.availability_mode,
    scoped.stock_quantity,
    scoped.lead_time_days,
    scoped.made_to_order_options,
    scoped.created_at,
    jsonb_build_object('name', scoped.category_name) as categories,
    scoped.catalog_boost_active,
    scoped.total_products_count
  from scoped
  cross join normalized n
  order by
    case when n.sort_text = 'price-asc' then scoped.price end asc nulls last,
    case when n.sort_text = 'price-desc' then scoped.price end desc nulls last,
    case when n.sort_text = 'newest' then scoped.catalog_rank_score end desc nulls last,
    scoped.created_at desc
  limit (select page_limit from normalized)
  offset ((select page_number from normalized) - 1) * (select page_limit from normalized);
$$;

grant execute on function public.get_public_catalog_product_feed_v5(
  uuid,
  uuid[],
  uuid[],
  uuid[],
  integer,
  integer,
  text[],
  text,
  text,
  text
) to anon, authenticated;

drop function if exists public.get_public_catalog_storefront_groups_v6(
  uuid,
  integer,
  integer,
  text,
  integer,
  text,
  integer
);

create or replace function public.get_public_catalog_storefront_groups_v6(
  requested_category_id uuid default null,
  requested_page integer default 1,
  requested_products_per_storefront integer default 4,
  requested_search text default null,
  requested_storefront_limit integer default 12,
  requested_viewer_seed text default '',
  requested_min_matching_products integer default 1
)
returns table (
  storefront_id uuid,
  artisan_full_name text,
  storefront_name text,
  storefront_description text,
  profile_image_url text,
  storefront_theme_color text,
  matching_products_count bigint,
  products jsonb,
  total_storefronts_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select
      greatest(1, coalesce(requested_storefront_limit, 12)) as storefront_limit,
      greatest(1, coalesce(requested_page, 1)) as page_number,
      greatest(1, coalesce(requested_products_per_storefront, 4)) as products_limit,
      greatest(1, coalesce(requested_min_matching_products, 1)) as min_products,
      nullif(trim(coalesce(requested_search, '')), '') as search_text,
      coalesce(requested_viewer_seed, '') as seed_text
  ),
  matching_storefronts as (
    select
      pr.id,
      pr.full_name,
      pr.store_name,
      pr.store_description,
      pr.profile_image_url,
      pr.storefront_theme_color,
      pr.storefront_boost_multiplier,
      max(p.created_at) as latest_product_created_at,
      count(p.id) as matching_products_count,
      count(*) over() as total_storefronts_count,
      ((abs(hashtext(pr.id::text || (select seed_text from normalized))::bigint) % 1000)::numeric / 1000) as random_score
    from public.profiles pr
    join public.products p
      on p.artisan_id = pr.id
    left join public.categories c
      on c.id = p.category_id
    cross join normalized n
    where pr.role = 'artisan'
      and pr.storefront_hidden_at is null
      and p.is_active = true
      and (requested_category_id is null or p.category_id = requested_category_id)
      and (
        n.search_text is null
        or p.title ilike '%' || n.search_text || '%'
        or p.description ilike '%' || n.search_text || '%'
        or c.name ilike '%' || n.search_text || '%'
        or pr.full_name ilike '%' || n.search_text || '%'
        or pr.store_name ilike '%' || n.search_text || '%'
        or pr.store_description ilike '%' || n.search_text || '%'
      )
    group by
      pr.id,
      pr.full_name,
      pr.store_name,
      pr.store_description,
      pr.profile_image_url,
      pr.storefront_theme_color,
      pr.storefront_boost_multiplier
    having count(p.id) >= (select min_products from normalized)
  )
  select
    ms.id as storefront_id,
    ms.full_name as artisan_full_name,
    ms.store_name as storefront_name,
    ms.store_description as storefront_description,
    ms.profile_image_url,
    ms.storefront_theme_color,
    ms.matching_products_count,
    coalesce(product_rows.products, '[]'::jsonb) as products,
    ms.total_storefronts_count
  from matching_storefronts ms
  cross join normalized n
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'id', selected_products.id,
        'artisan_id', selected_products.artisan_id,
        'category_id', selected_products.category_id,
        'title', selected_products.title,
        'description', selected_products.description,
        'price', selected_products.price,
        'image_url', selected_products.image_url,
        'image_urls', selected_products.image_urls,
        'product_media', selected_products.product_media,
        'product_attributes', selected_products.product_attributes,
        'is_active', selected_products.is_active,
        'availability_mode', selected_products.availability_mode,
        'stock_quantity', selected_products.stock_quantity,
        'lead_time_days', selected_products.lead_time_days,
        'made_to_order_options', selected_products.made_to_order_options,
        'created_at', selected_products.created_at,
        'categories', jsonb_build_object('name', selected_products.category_name),
        'catalog_boost_active', selected_products.catalog_boost_active
      )
      order by selected_products.product_rank_score desc, selected_products.created_at desc
    ) as products
    from (
      select
        p.*,
        c.name as category_name,
        (
          coalesce(ms.storefront_boost_multiplier, 1.00) > 1.00
          or (pac.boost_level is not null and pac.boost_until > now())
        ) as catalog_boost_active,
        (
          greatest(0::numeric, 30 - (extract(epoch from (now() - p.created_at)) / 86400)) +
          ((abs(hashtext(p.id::text || n.seed_text)::bigint) % 1000)::numeric / 1000) * 8
        ) *
        least(
          2.00,
          coalesce(ms.storefront_boost_multiplier, 1.00) *
          case
            when pac.boost_level = 'maximo' and pac.boost_until > now() then 1.35
            when pac.boost_level = 'moderado' and pac.boost_until > now() then 1.20
            when pac.boost_level = 'medio' and pac.boost_until > now() then 1.10
            else 1.00
          end
        ) as product_rank_score
      from public.products p
      left join public.categories c
        on c.id = p.category_id
      left join public.product_admin_controls pac
        on pac.product_id = p.id
      where p.artisan_id = ms.id
        and p.is_active = true
        and (requested_category_id is null or p.category_id = requested_category_id)
        and (
          n.search_text is null
          or p.title ilike '%' || n.search_text || '%'
          or p.description ilike '%' || n.search_text || '%'
          or c.name ilike '%' || n.search_text || '%'
          or ms.full_name ilike '%' || n.search_text || '%'
          or ms.store_name ilike '%' || n.search_text || '%'
          or ms.store_description ilike '%' || n.search_text || '%'
        )
      order by product_rank_score desc, p.created_at desc
      limit (select products_limit from normalized)
    ) selected_products
  ) product_rows on true
  order by
    ((ms.matching_products_count::numeric + ms.random_score * 4) * coalesce(ms.storefront_boost_multiplier, 1.00)) desc,
    ms.latest_product_created_at desc
  limit (select storefront_limit from normalized)
  offset ((select page_number from normalized) - 1) * (select storefront_limit from normalized);
$$;

grant execute on function public.get_public_catalog_storefront_groups_v6(
  uuid,
  integer,
  integer,
  text,
  integer,
  text,
  integer
) to anon, authenticated;
drop function if exists public.delete_product_batch(uuid);
drop function if exists public.update_product_batch(uuid, jsonb);
drop function if exists public.create_product_batch(uuid, jsonb);
drop function if exists public.generate_product_batch_code();

drop index if exists public.products_batch_position_idx;
drop index if exists public.products_batch_code_idx;
drop index if exists public.products_batch_id_idx;

alter table public.products
  drop column if exists batch_id,
  drop column if exists batch_code,
  drop column if exists batch_position,
  drop column if exists created_via_batch;

drop table if exists public.product_batches;

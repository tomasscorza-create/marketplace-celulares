begin;

alter table public.products
  add column if not exists stock_quantity integer,
  add column if not exists availability_mode text not null default 'stock'::text,
  add column if not exists lead_time_days integer,
  add column if not exists made_to_order_options jsonb not null default '[]'::jsonb;

alter table public.profiles
  add column if not exists whatsapp_phone text,
  add column if not exists storefront_boost_multiplier numeric(4, 2) not null default 1.00,
  add column if not exists storefront_boosted_at timestamptz,
  add column if not exists storefront_hidden_at timestamptz,
  add column if not exists storefront_control_updated_at timestamptz not null default now();

alter table public.profiles
  drop constraint if exists profiles_storefront_boost_multiplier_check;

alter table public.profiles
  add constraint profiles_storefront_boost_multiplier_check
    check (storefront_boost_multiplier >= 1.00 and storefront_boost_multiplier <= 2.00);

create index if not exists profiles_storefront_hidden_at_idx
  on public.profiles (storefront_hidden_at)
  where role = 'artisan';

create index if not exists profiles_storefront_boost_multiplier_idx
  on public.profiles (storefront_boost_multiplier)
  where role = 'artisan';

create table if not exists public.product_admin_controls (
  product_id uuid primary key references public.products (id) on delete cascade,
  internal_tag text,
  comment text,
  boost_level text,
  boost_until timestamptz,
  updated_at timestamptz not null default now(),
  constraint product_admin_controls_internal_tag_check
    check (internal_tag is null or internal_tag in ('destacado up', 'prueba/test', 'bajar prioridad', 'ocultar total')),
  constraint product_admin_controls_boost_level_check
    check (boost_level is null or boost_level in ('medio', 'moderado', 'maximo'))
);

alter table public.product_admin_controls enable row level security;

drop policy if exists product_admin_controls_admin_select on public.product_admin_controls;
create policy product_admin_controls_admin_select
  on public.product_admin_controls
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists product_admin_controls_admin_insert on public.product_admin_controls;
create policy product_admin_controls_admin_insert
  on public.product_admin_controls
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists product_admin_controls_admin_update on public.product_admin_controls;
create policy product_admin_controls_admin_update
  on public.product_admin_controls
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists product_admin_controls_admin_delete on public.product_admin_controls;
create policy product_admin_controls_admin_delete
  on public.product_admin_controls
  for delete
  to authenticated
  using (public.is_admin());

create or replace function public.is_public_artisan_visible(requested_artisan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = requested_artisan_id
      and role = 'artisan'
      and storefront_hidden_at is null
  );
$$;

revoke all on function public.is_public_artisan_visible(uuid) from public;
grant execute on function public.is_public_artisan_visible(uuid) to anon, authenticated;

drop view if exists public.artisan_storefronts;

create or replace view public.artisan_storefronts as
select
  id,
  full_name,
  store_name,
  store_description,
  profile_image_url,
  storefront_theme_color,
  whatsapp_phone,
  created_at,
  storefront_boost_multiplier,
  storefront_boosted_at,
  storefront_hidden_at
from public.profiles
where role = 'artisan'
  and (
    storefront_hidden_at is null
    or public.is_admin()
  );

grant select on public.artisan_storefronts to anon, authenticated;

drop policy if exists products_select_active_public on public.products;
create policy products_select_active_public
  on public.products
  for select
  to anon
  using (
    is_active = true
    and public.is_public_artisan_visible(artisan_id)
  );

drop policy if exists products_select_scope_authenticated on public.products;
create policy products_select_scope_authenticated
  on public.products
  for select
  to authenticated
  using (
    public.is_admin()
    or artisan_id = auth.uid()
    or (
      is_active = true
      and public.is_public_artisan_visible(artisan_id)
    )
  );

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
  batch_id uuid,
  batch_code text,
  batch_position integer,
  created_via_batch boolean,
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
      p.batch_id,
      p.batch_code,
      p.batch_position,
      p.created_via_batch,
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
    scoped.batch_id,
    scoped.batch_code,
    scoped.batch_position,
    scoped.created_via_batch,
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
        'batch_id', selected_products.batch_id,
        'batch_code', selected_products.batch_code,
        'batch_position', selected_products.batch_position,
        'created_via_batch', selected_products.created_via_batch,
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

drop function if exists public.get_public_catalog_storefront_suggestions_v2(
  uuid,
  integer,
  integer,
  text,
  text
);

create or replace function public.get_public_catalog_storefront_suggestions_v2(
  requested_category_id uuid default null,
  requested_discovery_limit integer default 3,
  requested_featured_limit integer default 3,
  requested_search text default null,
  requested_viewer_seed text default ''
)
returns table (
  section_name text,
  storefront_id uuid,
  artisan_full_name text,
  storefront_name text,
  storefront_description text,
  profile_image_url text,
  storefront_theme_color text,
  matching_products_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select
      greatest(1, coalesce(requested_discovery_limit, 3)) as discovery_limit,
      greatest(1, coalesce(requested_featured_limit, 3)) as featured_limit,
      nullif(trim(coalesce(requested_search, '')), '') as search_text,
      coalesce(requested_viewer_seed, '') as seed_text
  ),
  candidates as (
    select
      pr.id,
      pr.full_name,
      pr.store_name,
      pr.store_description,
      pr.profile_image_url,
      pr.storefront_theme_color,
      pr.storefront_boost_multiplier,
      count(p.id) as matching_products_count,
      max(p.created_at) as latest_product_created_at,
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
  ),
  featured as (
    select *
    from candidates
    order by
      ((matching_products_count::numeric + random_score * 4) * coalesce(storefront_boost_multiplier, 1.00)) desc,
      latest_product_created_at desc
    limit (select featured_limit from normalized)
  ),
  discovery as (
    select *
    from candidates
    where id not in (select id from featured)
    order by
      ((matching_products_count::numeric + random_score * 8) * coalesce(storefront_boost_multiplier, 1.00)) desc,
      latest_product_created_at desc
    limit (select discovery_limit from normalized)
  )
  select
    'featured'::text as section_name,
    featured.id as storefront_id,
    featured.full_name as artisan_full_name,
    featured.store_name as storefront_name,
    featured.store_description as storefront_description,
    featured.profile_image_url,
    featured.storefront_theme_color,
    featured.matching_products_count
  from featured
  union all
  select
    'discovery'::text as section_name,
    discovery.id as storefront_id,
    discovery.full_name as artisan_full_name,
    discovery.store_name as storefront_name,
    discovery.store_description as storefront_description,
    discovery.profile_image_url,
    discovery.storefront_theme_color,
    discovery.matching_products_count
  from discovery;
$$;

grant execute on function public.get_public_catalog_storefront_suggestions_v2(
  uuid,
  integer,
  integer,
  text,
  text
) to anon, authenticated;

commit;

-- Initial editable content so the desktop carousel can demonstrate real
-- rotation immediately. Administrators can edit, deactivate or delete these
-- rows from the promotions panel after visual QA.

insert into public.catalog_promotions (
  kind,
  title,
  body,
  product_id,
  action_type,
  action_label,
  sort_order,
  is_active
)
select
  'product',
  left('Destacado: ' || p.title, 100),
  'Conocé uno de los productos seleccionados del catálogo.',
  p.id,
  'product',
  'Ver producto',
  10,
  true
from public.products p
where p.is_active
  and public.is_public_artisan_visible(p.artisan_id)
  and not exists (
    select 1
    from public.catalog_promotions existing
    where existing.action_type = 'product'
      and existing.product_id = p.id
  )
order by p.created_at desc
limit 1;

insert into public.catalog_promotions (
  kind,
  title,
  body,
  action_type,
  action_label,
  action_url,
  sort_order,
  is_active
)
select
  'message',
  'Tiendas y vendedores para descubrir',
  'Recorré los perfiles disponibles y encontrá nuevas opciones.',
  'internal_link',
  'Ver vendedores',
  '/vendedores',
  20,
  true
where not exists (
  select 1
  from public.catalog_promotions
  where title = 'Tiendas y vendedores para descubrir'
);

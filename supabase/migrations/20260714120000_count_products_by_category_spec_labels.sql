-- Lets the admin UI warn before saving a template that removes or renames a
-- field already used by existing products, by counting how many products in
-- that category currently have a value for each given label.

create or replace function public.count_products_by_category_spec_labels(
  target_category_id uuid,
  field_labels text[]
)
returns table (field_label text, product_count integer)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede consultar el uso de la plantilla de especificaciones.';
  end if;

  return query
  select
    label,
    count(p.id)::integer as product_count
  from unnest(field_labels) as label
  left join public.products p
    on p.category_id = target_category_id
    and p.category_spec_values @> jsonb_build_array(jsonb_build_object('label', label))
  group by label;
end;
$$;

grant execute on function public.count_products_by_category_spec_labels(uuid, text[]) to authenticated;

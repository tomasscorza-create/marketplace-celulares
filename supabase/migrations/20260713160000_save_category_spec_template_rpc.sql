-- Fixes a data-loss bug: the client previously deleted all spec-template
-- rows for a category and then inserted the new ones as two separate
-- HTTP calls. If the insert failed (e.g. a duplicate field label violating
-- the unique constraint), the category was left with an empty template.
-- This RPC does delete + insert inside a single transaction and dedupes
-- field labels server-side, so a bad insert can never wipe existing data.

create or replace function public.save_category_spec_template(
  target_category_id uuid,
  field_labels text[]
)
returns table (
  id uuid,
  category_id uuid,
  field_label text,
  sort_order integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede modificar la plantilla de especificaciones.';
  end if;

  delete from public.category_spec_templates
  where category_spec_templates.category_id = target_category_id;

  insert into public.category_spec_templates (category_id, field_label, sort_order)
  select
    target_category_id,
    deduped.field_label,
    (row_number() over (order by deduped.first_ordinality) - 1)::integer
  from (
    select
      trim(label) as field_label,
      min(ordinality) as first_ordinality
    from unnest(field_labels) with ordinality as t(label, ordinality)
    where trim(label) <> ''
    group by trim(label)
  ) deduped;

  return query
  select
    t.id,
    t.category_id,
    t.field_label,
    t.sort_order
  from public.category_spec_templates t
  where t.category_id = target_category_id
  order by t.sort_order;
end;
$$;

grant execute on function public.save_category_spec_template(uuid, text[]) to authenticated;

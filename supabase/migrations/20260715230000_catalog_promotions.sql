create table if not exists public.catalog_promotions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('discount', 'coupon', 'product', 'image', 'message')),
  title text not null check (char_length(btrim(title)) between 1 and 100),
  body text null check (body is null or char_length(body) <= 240),
  image_url text null,
  image_path text null,
  product_id uuid null references public.products(id) on delete set null,
  action_type text not null default 'none'
    check (action_type in ('none', 'claim', 'product', 'internal_link', 'external_link')),
  action_label text null check (action_label is null or char_length(action_label) <= 40),
  action_url text null check (action_url is null or char_length(action_url) <= 500),
  benefit_type text null check (benefit_type in ('percentage', 'fixed_amount')),
  benefit_value numeric(12, 2) null check (benefit_value is null or benefit_value > 0),
  minimum_order_amount numeric(12, 2) null check (
    minimum_order_amount is null or minimum_order_amount >= 0
  ),
  max_claims integer null check (max_claims is null or max_claims > 0),
  starts_at timestamptz null,
  ends_at timestamptz null,
  sort_order integer not null default 0,
  is_active boolean not null default false,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_promotions_schedule_check check (
    starts_at is null or ends_at is null or starts_at < ends_at
  ),
  constraint catalog_promotions_product_action_check check (
    action_type <> 'product' or product_id is not null
  ),
  constraint catalog_promotions_claim_action_check check (
    action_type <> 'claim'
    or (
      kind in ('discount', 'coupon')
      and benefit_type is not null
      and benefit_value is not null
    )
  ),
  constraint catalog_promotions_percentage_check check (
    benefit_type <> 'percentage' or benefit_value <= 100
  )
);

create index if not exists catalog_promotions_public_schedule_idx
  on public.catalog_promotions (is_active, sort_order, starts_at, ends_at);

create table if not exists public.catalog_promotion_claims (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.catalog_promotions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'available'
    check (status in ('available', 'redeemed', 'expired', 'cancelled')),
  claimed_at timestamptz not null default now(),
  redeemed_at timestamptz null,
  benefit_type text not null check (benefit_type in ('percentage', 'fixed_amount')),
  benefit_value numeric(12, 2) not null check (benefit_value > 0),
  minimum_order_amount numeric(12, 2) null check (
    minimum_order_amount is null or minimum_order_amount >= 0
  ),
  promotion_title text not null,
  unique (promotion_id, profile_id)
);

create index if not exists catalog_promotion_claims_profile_idx
  on public.catalog_promotion_claims (profile_id, claimed_at desc);

create or replace function public.set_catalog_promotion_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_catalog_promotion_updated_at on public.catalog_promotions;
create trigger set_catalog_promotion_updated_at
before update on public.catalog_promotions
for each row execute function public.set_catalog_promotion_updated_at();

alter table public.catalog_promotions enable row level security;
alter table public.catalog_promotion_claims enable row level security;

drop policy if exists "Public reads active catalog promotions" on public.catalog_promotions;
create policy "Public reads active catalog promotions"
on public.catalog_promotions
for select
to public
using (
  is_active
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at > now())
);

drop policy if exists "Admins manage catalog promotions" on public.catalog_promotions;
create policy "Admins manage catalog promotions"
on public.catalog_promotions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users read own catalog promotion claims" on public.catalog_promotion_claims;
create policy "Users read own catalog promotion claims"
on public.catalog_promotion_claims
for select
to authenticated
using (profile_id = auth.uid() or public.is_admin());

drop policy if exists "Admins manage catalog promotion claims" on public.catalog_promotion_claims;
create policy "Admins manage catalog promotion claims"
on public.catalog_promotion_claims
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.claim_catalog_promotion(p_promotion_id uuid)
returns public.catalog_promotion_claims
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promotion public.catalog_promotions%rowtype;
  v_claim public.catalog_promotion_claims%rowtype;
  v_claim_count integer;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para guardar este beneficio.';
  end if;

  select *
  into v_promotion
  from public.catalog_promotions
  where id = p_promotion_id
  for update;

  if v_promotion.id is null
    or not v_promotion.is_active
    or (v_promotion.starts_at is not null and v_promotion.starts_at > now())
    or (v_promotion.ends_at is not null and v_promotion.ends_at <= now()) then
    raise exception 'Este beneficio ya no está disponible.';
  end if;

  if v_promotion.action_type <> 'claim'
    or v_promotion.kind not in ('discount', 'coupon')
    or v_promotion.benefit_type is null
    or v_promotion.benefit_value is null then
    raise exception 'Esta promoción no contiene un beneficio reclamable.';
  end if;

  select *
  into v_claim
  from public.catalog_promotion_claims
  where promotion_id = p_promotion_id
    and profile_id = auth.uid();

  if v_claim.id is not null then
    return v_claim;
  end if;

  if v_promotion.max_claims is not null then
    select count(*)::integer
    into v_claim_count
    from public.catalog_promotion_claims
    where promotion_id = p_promotion_id
      and status <> 'cancelled';

    if v_claim_count >= v_promotion.max_claims then
      raise exception 'Se alcanzó el límite disponible para este beneficio.';
    end if;
  end if;

  insert into public.catalog_promotion_claims (
    promotion_id,
    profile_id,
    benefit_type,
    benefit_value,
    minimum_order_amount,
    promotion_title
  )
  values (
    v_promotion.id,
    auth.uid(),
    v_promotion.benefit_type,
    v_promotion.benefit_value,
    v_promotion.minimum_order_amount,
    v_promotion.title
  )
  returning * into v_claim;

  return v_claim;
end;
$$;

revoke all on function public.claim_catalog_promotion(uuid) from public;
grant execute on function public.claim_catalog_promotion(uuid) to authenticated;

grant select on public.catalog_promotions to anon, authenticated;
grant insert, update, delete on public.catalog_promotions to authenticated;
grant select on public.catalog_promotion_claims to authenticated;
grant select, insert, update, delete on public.catalog_promotion_claims to authenticated;

insert into storage.buckets (id, name, public)
values ('catalog-promotions', 'catalog-promotions', true)
on conflict (id) do update set public = true;

drop policy if exists "Public reads catalog promotion images" on storage.objects;
create policy "Public reads catalog promotion images"
on storage.objects
for select
to public
using (bucket_id = 'catalog-promotions');

drop policy if exists "Admins upload catalog promotion images" on storage.objects;
create policy "Admins upload catalog promotion images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'catalog-promotions' and public.is_admin());

drop policy if exists "Admins update catalog promotion images" on storage.objects;
create policy "Admins update catalog promotion images"
on storage.objects
for update
to authenticated
using (bucket_id = 'catalog-promotions' and public.is_admin())
with check (bucket_id = 'catalog-promotions' and public.is_admin());

drop policy if exists "Admins delete catalog promotion images" on storage.objects;
create policy "Admins delete catalog promotion images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'catalog-promotions' and public.is_admin());

insert into public.catalog_promotions (
  kind,
  title,
  body,
  action_type,
  sort_order,
  is_active
)
select
  'message',
  'Ofertas, novedades y beneficios',
  'Encontrá promociones seleccionadas mientras recorrés el catálogo.',
  'none',
  0,
  true
where not exists (select 1 from public.catalog_promotions);

create unique index if not exists carts_one_active_per_buyer_idx
  on public.carts (buyer_id)
  where status = 'active';

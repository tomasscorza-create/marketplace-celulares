create or replace view public.artisan_storefronts as
select
  id,
  full_name,
  store_name,
  store_description,
  profile_image_url,
  storefront_theme_color,
  created_at
from public.profiles
where role = 'artisan';

grant select on public.artisan_storefronts to anon, authenticated;

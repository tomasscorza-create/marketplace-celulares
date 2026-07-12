-- Compatibility patch only.
-- Run this only on databases created before products supported image_urls.

alter table public.products
add column if not exists image_urls text[] not null default '{}'::text[];

update public.products
set image_urls = case
  when coalesce(array_length(image_urls, 1), 0) = 0 and image_url is not null
    then array[image_url]
  else image_urls
end;

alter table public.products
drop constraint if exists products_image_urls_limit;

alter table public.products
add constraint products_image_urls_limit
check (coalesce(array_length(image_urls, 1), 0) <= 3);

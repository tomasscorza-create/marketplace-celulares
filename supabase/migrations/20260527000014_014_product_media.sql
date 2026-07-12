alter table public.products
add column if not exists product_media jsonb not null default '[]'::jsonb;

update public.products
set product_media = case
  when coalesce(jsonb_array_length(product_media), 0) > 0 then product_media
  when coalesce(array_length(image_urls, 1), 0) > 0 then (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'url', media_url,
          'description', ''
        )
      ),
      '[]'::jsonb
    )
    from unnest(image_urls) as media_url
  )
  when image_url is not null then jsonb_build_array(
    jsonb_build_object(
      'url', image_url,
      'description', ''
    )
  )
  else '[]'::jsonb
end;

alter table public.products
drop constraint if exists products_image_urls_limit;

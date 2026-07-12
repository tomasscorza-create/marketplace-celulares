insert into storage.buckets (id, name, public)
values ('artisan-product-images', 'artisan-product-images', true)
on conflict (id) do update
set public = true;

drop policy if exists "Public read artisan product images" on storage.objects;
create policy "Public read artisan product images"
on storage.objects
for select
to public
using (bucket_id = 'artisan-product-images');

drop policy if exists "Artisans upload own product images" on storage.objects;
create policy "Artisans upload own product images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'artisan-product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Artisans update own product images" on storage.objects;
create policy "Artisans update own product images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'artisan-product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'artisan-product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Artisans delete own product images" on storage.objects;

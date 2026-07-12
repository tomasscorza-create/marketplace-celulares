-- Admin users can manage product images on behalf of any artisan from the
-- admin product panel. Artisans remain restricted to their own folder.

drop policy if exists "Artisans upload own product images" on storage.objects;
create policy "Artisans and admins upload product images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'artisan-product-images'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);

drop policy if exists "Artisans update own product images" on storage.objects;
create policy "Artisans and admins update product images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'artisan-product-images'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
)
with check (
  bucket_id = 'artisan-product-images'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);

drop policy if exists "Artisans delete own product images" on storage.objects;
create policy "Artisans and admins delete product images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'artisan-product-images'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);

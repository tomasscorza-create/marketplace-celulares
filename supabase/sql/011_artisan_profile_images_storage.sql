insert into storage.buckets (id, name, public)
values ('artisan-profile-images', 'artisan-profile-images', true)
on conflict (id) do update
set public = true;

drop policy if exists "Public read artisan profile images" on storage.objects;
create policy "Public read artisan profile images"
on storage.objects
for select
to public
using (bucket_id = 'artisan-profile-images');

drop policy if exists "Artisans upload own profile images" on storage.objects;
create policy "Artisans upload own profile images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'artisan-profile-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Artisans update own profile images" on storage.objects;
create policy "Artisans update own profile images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'artisan-profile-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'artisan-profile-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Artisans delete own profile images" on storage.objects;
create policy "Artisans delete own profile images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'artisan-profile-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

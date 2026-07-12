-- Product images are append-only from browser clients.
-- Deleting a product should remove the row, but keep uploaded files as backend backup.
drop policy if exists "Artisans delete own product images" on storage.objects;

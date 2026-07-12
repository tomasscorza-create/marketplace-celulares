-- Compatibility patch only.
-- Run this only on databases created before store fields were added to profiles.

alter table public.profiles
add column if not exists store_name text,
add column if not exists store_description text,
add column if not exists profile_image_url text,
add column if not exists storefront_theme_color text;

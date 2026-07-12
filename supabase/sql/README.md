# SQL Order

## Fresh install

Use this order for a brand-new Supabase project:

1. `000_setup.sql`
2. `001_profiles.sql`
3. `002_categories.sql`
4. `003_products.sql`
5. `004_orders.sql`
6. `005_order_items.sql`
7. `006_policies.sql`
8. `007_auth_signup.sql`
9. `010_artisan_storefronts_view.sql`
10. `011_artisan_profile_images_storage.sql`
11. `013_product_images_storage.sql`
12. `016_buyer_cart_checkout_alignment.sql`
13. `017_cart_checkout_hardening.sql`
14. `018_partial_cart_checkout.sql`
15. `019_admin_artisan_profile_controls.sql`
16. `020_product_image_retention.sql`
17. `021_internal_notifications.sql`
18. `022_backend_template_completion.sql`

Notes:

- `001_profiles.sql` already includes the store fields.
- `003_products.sql` already includes `image_urls` and the 3-image limit.
- For a fresh install, you do **not** need `009_artisan_store_profile.sql`.
- For a fresh install, you do **not** need `012_product_images.sql`.
- Catalog-specific RPCs that are only needed for staged UX experiments should be run manually in Supabase and are not kept as standalone SQL files in this folder.

## Existing project upgrades

Use these only if your remote database was created before the current base schema:

- `009_artisan_store_profile.sql`
  Run only if `profiles` does not yet have:
  `store_name`, `store_description`, `profile_image_url`, `storefront_theme_color`

- `012_product_images.sql`
  Run only if `products` does not yet have:
  `image_urls`

## Purpose by file

- `000_setup.sql`: required extension setup
- `001` to `005`: core tables
- `006_policies.sql`: RLS functions and policies in current final form
- `007_auth_signup.sql`: auth trigger for buyer/artisan profile creation
- `010_artisan_storefronts_view.sql`: public artisan storefront view
- `011_artisan_profile_images_storage.sql`: storage bucket and policies for artisan avatars
- `013_product_images_storage.sql`: storage bucket and policies for product images
- `016_buyer_cart_checkout_alignment.sql`: buyer preferences/favorites, carts, cart items, checkout tables, extended orders schema, updated RLS, and stock application function
- `017_cart_checkout_hardening.sql`: prevents more than one active cart per buyer
- `018_partial_cart_checkout.sql`: tracks cart items copied into orders so paid items can be removed without losing blocked cart items
- `019_admin_artisan_profile_controls.sql`: admin controls for hiding/boosting artisan accounts and catalog RPC versions that respect those controls
- `020_product_image_retention.sql`: prevents browser clients from deleting product image files after upload
- `021_internal_notifications.sql`: admin-created internal notifications and artisan signatures
- `022_backend_template_completion.sql`: local backend-template completion for site content, order events, catalog activity, buyer public profiles, and item fulfillment status RPCs

## Admin bootstrap

The first admin profile is still a manual one-off step after the auth user exists.

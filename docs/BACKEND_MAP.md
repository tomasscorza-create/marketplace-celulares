# Backend Map

This is a local, read-only map of what the app currently expects from Supabase.
It is a schema-surface audit, not a replacement for applying and testing the
SQL in a brand-new Supabase project.

## Frontend/Function Tables And Views Used

- `artisan_storefronts`
- `buyer_favorites`
- `buyer_preferences`
- `cart_items`
- `carts`
- `categories`
- `internal_notification_signatures`
- `internal_notifications`
- `order_events`
- `order_items`
- `orders`
- `payment_attempts`
- `payment_webhook_events`
- `product_admin_controls`
- `product_batches`
- `products`
- `profiles`
- `site_content`

## Tables And Views Defined In `supabase/sql`

- `artisan_storefronts`
- `buyer_favorites`
- `buyer_preferences`
- `cart_items`
- `carts`
- `catalog_activity_events`
- `categories`
- `internal_notification_signatures`
- `internal_notifications`
- `order_events`
- `order_items`
- `orders`
- `payment_attempts`
- `payment_webhook_events`
- `product_admin_controls`
- `product_batches`
- `products`
- `profiles`
- `site_content`

## Missing From SQL But Used By Code

- none

## RPCs Used By App/Functions

- `apply_paid_order_inventory`
- `create_product_batch`
- `delete_product_batch`
- `get_catalog_activity_state_v1`
- `get_public_buyer_profile_v1`
- `get_public_catalog_product_feed_v5`
- `get_public_catalog_storefront_groups_v6`
- `get_public_catalog_storefront_suggestions_v2`
- `record_catalog_activity_event_v1`
- `update_order_item_fulfillment_status`
- `update_product_batch`

## SQL Functions Defined In `supabase/sql`

- `apply_paid_order_inventory`
- `create_product_batch`
- `current_user_role`
- `delete_product_batch`
- `generate_product_batch_code`
- `get_catalog_activity_state_v1`
- `get_public_buyer_profile_v1`
- `get_public_catalog_product_feed_v5`
- `get_public_catalog_storefront_groups_v6`
- `get_public_catalog_storefront_suggestions_v2`
- `handle_new_user`
- `is_admin`
- `is_public_artisan_visible`
- `record_catalog_activity_event_v1`
- `update_order_item_fulfillment_status`
- `update_product_batch`

## RPC Drift

- none detected by `npm run audit:backend`

The frontend now calls the current catalog RPC surface:

- feed: `get_public_catalog_product_feed_v5`
- storefront groups: `get_public_catalog_storefront_groups_v6`
- storefront suggestions: `get_public_catalog_storefront_suggestions_v2`

The local SQL now includes the app-facing RPCs for catalog activity, buyer public
profiles, and order item fulfillment updates.

## Storage Buckets

Current names still use the internal `artisan` vocabulary:

- `artisan-profile-images`
- `artisan-product-images`

Keep these names during frontend stabilization. Rename only during the clean
backend schema phase if we decide to migrate internal vocabulary.

## Edge Functions Present

- `admin-buyer-accounts`
- `admin-manage-artisans`
- `create-mercadopago-checkout`
- `expire-pending-checkouts`
- `mercadopago-return`
- `mercadopago-webhook`

They require fresh environment variables for a new project and must not be
deployed against the original production project.

## Repeatable Audit

Run:

```bash
npm run audit:backend
```

This command exits non-zero while used tables/RPCs are missing from local SQL.
It should pass before any new Supabase project is linked.

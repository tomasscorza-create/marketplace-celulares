# Backend Map

> Archivo generado por `npm run docs:backend-map`. La auditoría
> `npm run audit:backend` falla si este contenido no coincide con el código y
> el resultado final de las migraciones ordenadas. No editar listas a mano.

## Alcance y fuente de verdad

- Fuente canónica del esquema: `supabase/migrations/`, aplicada por nombre en orden ascendente.
- Última migración inspeccionada: `20260715120000_analytics_account_and_event_metrics.sql`.
- Consumidores inspeccionados: `src/` y `supabase/functions/`.
- `supabase/sql/` es referencia histórica y no participa de esta auditoría.

El análisis rastrea tablas, vistas y funciones del esquema `public`. No valida
columnas, constraints, RLS, políticas de Storage ni el estado de un backend
remoto; esos puntos requieren Supabase local y las verificaciones de
`docs/DB_SAFETY.md`.

## Tablas y vistas usadas por la aplicación

- `analytics_consents`
- `analytics_events`
- `analytics_sessions`
- `artisan_storefronts`
- `buyer_favorites`
- `buyer_preferences`
- `cart_items`
- `carts`
- `categories`
- `category_spec_templates`
- `internal_notification_signatures`
- `internal_notifications`
- `order_events`
- `order_items`
- `orders`
- `payment_attempts`
- `payment_webhook_events`
- `product_admin_controls`
- `products`
- `profiles`
- `site_content`

## Tablas y vistas del esquema final

- `analytics_anonymous_daily`
- `analytics_consent_history`
- `analytics_consents`
- `analytics_events`
- `analytics_sessions`
- `artisan_storefronts`
- `buyer_favorites`
- `buyer_preferences`
- `cart_items`
- `carts`
- `catalog_activity_events`
- `categories`
- `category_spec_templates`
- `internal_notification_signatures`
- `internal_notifications`
- `order_events`
- `order_items`
- `orders`
- `payment_attempts`
- `payment_webhook_events`
- `product_admin_controls`
- `products`
- `profiles`
- `site_content`

## Tablas o vistas usadas pero ausentes

- none

## RPC usadas por la aplicación

- `apply_paid_order_inventory`
- `count_products_by_category_spec_labels`
- `get_admin_analytics_overview`
- `get_admin_analytics_user_history`
- `get_catalog_activity_state_v1`
- `get_public_buyer_profile_v1`
- `get_public_catalog_product_feed_v5`
- `get_public_catalog_storefront_groups_v6`
- `get_public_catalog_storefront_suggestions_v2`
- `record_anonymous_analytics`
- `record_catalog_activity_event_v1`
- `save_analytics_consent`
- `save_category_spec_template`
- `update_order_item_fulfillment_status`

## Funciones SQL del esquema final

- `apply_paid_order_inventory`
- `can_read_order`
- `can_read_order_by_id`
- `can_read_order_item`
- `cleanup_internal_analytics`
- `count_products_by_category_spec_labels`
- `current_user_role`
- `get_admin_analytics_overview`
- `get_admin_analytics_user_history`
- `get_catalog_activity_state_v1`
- `get_public_buyer_profile_v1`
- `get_public_catalog_product_feed_v5`
- `get_public_catalog_storefront_groups_v6`
- `get_public_catalog_storefront_suggestions_v2`
- `handle_new_profile_analytics_consent`
- `handle_new_user`
- `is_admin`
- `is_public_artisan_visible`
- `record_anonymous_analytics`
- `record_catalog_activity_event_v1`
- `save_analytics_consent`
- `save_category_spec_template`
- `update_order_item_fulfillment_status`

## RPC usadas pero ausentes

- none

## Objetos históricos eliminados por migraciones posteriores

### Tablas y vistas

- `product_batches`

### Funciones

- `create_product_batch`
- `delete_product_batch`
- `generate_product_batch_code`
- `update_product_batch`

Estas listas explican por qué un objeto puede aparecer en una migración
histórica sin existir en el esquema vigente. No deben reintroducirse basándose
únicamente en archivos antiguos.

## Validación repetible

```powershell
npm run docs:backend-map
npm run audit:backend
```

Regenerar el mapa sólo después de revisar el cambio de esquema. La auditoría
sale con código distinto de cero si el código usa una tabla/RPC ausente o si el
mapa quedó desactualizado.

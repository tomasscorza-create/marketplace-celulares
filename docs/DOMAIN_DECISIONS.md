# Domain Decisions

This document records product/domain decisions for turning this repo into a
neutral marketplace base.

## Current Decision

Keep the internal `artisan` vocabulary for now, but present neutral wording in
the UI where practical.

## Why

The current codebase uses `artisan` across:

- routes such as `/vendedor/:id` and `/panel/vendedor`
- feature folders such as `src/features/artisan`
- database columns such as `artisan_id`
- storage buckets such as `artisan-product-images`
- SQL policies and Supabase functions
- user roles such as `artisan`

Renaming all of that to `seller` in one pass would touch frontend routing,
database schema, RLS policies, storage paths, query keys, order records,
checkout logic, and historical data assumptions. That is too much risk before
the new backend schema is designed.

## Product Language

Use neutral Spanish wording in visible copy:

- `vendedor` or `tienda` for UI labels
- `comprador` for buyer-facing labels
- `catalogo`, `productos`, `pedidos`, `ventas`
- avoid previous brand names, city names, event names, and domain-specific copy

Keep technical names stable until the backend rebuild:

- `artisan`
- `artisan_id`
- `artisan_storefronts`
- `/vendedor`
- `/panel/vendedor`

## Future Rename Option

After a clean Supabase schema exists, decide whether to migrate internal names:

- `artisan` -> `seller`
- `/vendedor` -> `/vendedor` or `/tienda`
- `artisan_id` -> `seller_id`
- `artisan_storefronts` -> `seller_storefronts`
- storage buckets from `artisan-*` -> `seller-*`

Do this only as a planned migration with tests and redirects.

## Non-Negotiables

- Do not reconnect this repo to the original production backend.
- Do not rename database concepts while still relying on old migrations.
- Do not change payment, cart, stock, or order semantics during copy cleanup.

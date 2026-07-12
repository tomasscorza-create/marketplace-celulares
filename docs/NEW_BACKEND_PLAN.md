# New Backend Plan

This plan describes how to prepare a brand-new Supabase backend for a neutral
marketplace without touching the original production database.

## Principle

Do not link this repo to any Supabase project until the local schema is
coherent, audited, and intentionally pointed at a brand-new project.

## Step 1 - Freeze The Current SQL As Historical

Current SQL files are now coherent enough to describe the app-facing backend
surface, but they are still a migration history, not a polished one-file schema.
Some files are base schema and some are old upgrades.

Before creating a new backend:

- keep existing `supabase/sql` as reference
- do not run it blindly against a new project
- create a new clean schema directory or consolidated migration set
- document which old migrations are superseded

## Step 2 - Build A Clean Base Schema

The clean schema must include:

- profiles and roles
- categories
- products and product media
- product batches
- public storefront view
- carts and cart items
- buyer preferences and favorites
- orders and order items
- payment attempts and webhook events
- order events
- site content
- product admin controls
- internal notifications and signatures
- storage buckets and policies
- all RLS policies
- all RPCs currently called by the app, or updated frontend calls

Current status: local migrations now apply through Supabase local. The schema
still needs neutral seed data and flow testing before using a hosted project.

## Step 3 - Resolve RPC Versioning

Done locally: the frontend now calls the latest catalog RPCs only:

- `get_public_catalog_product_feed_v5`
- `get_public_catalog_storefront_groups_v6`
- `get_public_catalog_storefront_suggestions_v2`

`npm run audit:backend` must remain passing before connecting a new backend.

## Step 4 - Seed Neutral Demo Data

Add safe seed data only:

- generic categories
- generic sellers/shops
- generic products
- generic site content
- no real users
- no real order/payment data
- no original city/event branding

## Step 5 - Connect To A New Project

Only after the schema is ready:

1. create a brand-new Supabase project
2. set fresh env vars
3. set `VITE_ENABLE_REMOTE_BACKEND=true`
4. set `VITE_SUPABASE_PROJECT_REF` to match the new URL
5. run `npm run audit:secrets`
6. run `npm run audit:connections`
7. apply schema to the new project
8. generate fresh types if/when database types are introduced

## Step 6 - Deploy Edge Functions

Deploy functions only to the new project and only after required secrets are
fresh:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- Mercado Pago credentials
- app base URL
- checkout/webhook configuration

## Current Blockers

- Internal domain naming still uses `artisan`.
- No automated tests yet for checkout, inventory, or RLS assumptions.
- SQL has been applied locally, but not yet to a brand-new hosted Supabase
  project.
- Real auth/RLS flows still need hands-on validation with neutral seed data.

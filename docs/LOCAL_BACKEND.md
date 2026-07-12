# Local Backend

Use Supabase local to validate the neutral backend without touching any remote
project.

## Commands

```bash
npm run db:start
npm run db:status
npm run db:lint
npm run db:reset
npm run db:stop
```

## Local URLs

- Supabase API: `http://127.0.0.1:54321`
- Supabase Studio: `http://127.0.0.1:54323`
- Local database: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

## Current Validation

The local Supabase stack has applied all migrations in `supabase/migrations`
through `022_backend_template_completion.sql`.

Verified locally:

- required app tables exist, including `site_content`, `order_events`,
  `catalog_activity_events`, `product_batches`, and `internal_notifications`
- required app RPCs exist, including the current catalog RPCs and fulfillment
  status RPC
- `npm run db:lint` reports no schema errors

## Safety Rules

- Do not run `supabase link` for the original production project.
- Do not run `supabase db push` against the original production project.
- Keep local keys local; they are development defaults only.
- Before connecting a hosted backend, create a brand-new Supabase project and
  use fresh environment variables.

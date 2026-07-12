# Checkout And Mercado Pago

This document maps the current checkout/payment surface so the repo can be
connected to a new Mercado Pago account later without carrying credentials or
assumptions from the original marketplace.

## Current Status

- Checkout is implemented through Supabase Edge Functions.
- The frontend calls `create-mercadopago-checkout` from
  `src/features/buyer/checkoutClient.ts`.
- Payment state is stored in `orders`, `payment_attempts`, and
  `payment_webhook_events`.
- No Mercado Pago credentials are committed in this repo.
- Remote backend access is still disabled by default from the frontend.

## Edge Functions

- `create-mercadopago-checkout`: validates the cart, creates the order/payment
  attempt, creates the Mercado Pago preference, and returns the checkout URL.
- `mercadopago-return`: handles buyer return URLs and reconciles payment status.
- `mercadopago-webhook`: receives Mercado Pago webhook events and updates order
  and payment attempt state.
- `expire-pending-checkouts`: expires stale pending checkout attempts.

## Required Secrets For A New Backend

Use fresh values only. Put these in the new Supabase project secrets, not in
frontend `.env.local`:

```bash
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_BASE_URL=
WEBHOOK_BASE_URL=
MERCADOPAGO_ENVIRONMENT=test
MERCADOPAGO_TEST_ACCESS_TOKEN=
MERCADOPAGO_TEST_WEBHOOK_SECRET=
MERCADOPAGO_PRODUCTION_ACCESS_TOKEN=
MERCADOPAGO_PRODUCTION_WEBHOOK_SECRET=
MERCADOPAGO_STATEMENT_DESCRIPTOR=MARKETPLACE
PENDING_CHECKOUTS_CRON_SECRET=
```

`supabase/functions/.env.example` contains the same names with empty placeholder
values.

## Frontend Environment

The browser only needs the normal Vite/Supabase public values:

```bash
VITE_ENABLE_REMOTE_BACKEND=true
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SUPABASE_PROJECT_REF=
VITE_PUBLIC_SITE_URL=
```

Keep `VITE_ENABLE_REMOTE_BACKEND=false` until a new backend is intentionally
ready.

## New Deployment Checklist

1. Create a brand-new Supabase project.
2. Apply the clean schema/migrations to that project.
3. Seed only neutral demo or real data for the new business.
4. Add fresh Edge Function secrets from the new Supabase and Mercado Pago
   accounts.
5. Deploy the four checkout functions to the new project only.
6. Configure Mercado Pago return URLs and webhook URL for the new deployment.
7. Run a test checkout with test credentials.
8. Inspect `orders`, `payment_attempts`, and `payment_webhook_events`.
9. Only after test checkout works, switch to production Mercado Pago secrets.

## High-Risk Rules

- Do not deploy these functions to the original project.
- Do not reuse the original Mercado Pago access token or webhook secret.
- Do not put service role keys in `.env.local` or any frontend env file.
- Do not enable production Mercado Pago credentials before test checkout has
  been verified end to end on the new backend.

## Known Follow-Up Work

- Add automated tests around cart validation and order creation.
- Add an explicit local/mock checkout path for development without Mercado Pago.
- Decide whether internal names like `artisan_id` should remain as legacy
  schema names or be migrated to `seller_id` in a clean schema phase.

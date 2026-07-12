# Neutral Marketplace

This repository is being converted from a city-specific marketplace into a
neutral, reusable marketplace base.

## Current safety state

- Remote backend access is disabled by default.
- Supabase only initializes when all of these are present:
  - `VITE_ENABLE_REMOTE_BACKEND=true`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_SUPABASE_PROJECT_REF` matching the project ref in the URL
- Local files such as `.env.local`, `.supabase-secrets.env`, and
  `supabase/.temp/` must never be shared or copied into a derived repo.

## Safe commands

```bash
npm run lint
npm run typecheck
npm run build
npm run audit:secrets
npm run audit:connections
npm run audit:branding
npm run audit:backend
npm run audit:encoding
npm run audit:large-files
npm run db:start
npm run db:lint
```

`npm run preflight` runs lint, typecheck, connection/secret audits, and the
encoding audit. It may fail while old local secret files still exist. That is
intentional.

Local Supabase setup and validation notes live in `docs/LOCAL_BACKEND.md`.
Checkout and Mercado Pago setup notes live in `docs/CHECKOUT_MERCADOPAGO.md`.
Product 3D preview planning lives in `docs/PRODUCT_3D_PREVIEW.md`.

## Golden rule

Do not run Supabase link, db push, migration, reset, or function deploy commands
against the original production project. This repo should only connect to a
brand-new backend after the safety checklist in `docs/DB_SAFETY.md` is complete.

# Refactor Plan

> **PLAN HISTÓRICO, NO OPERATIVO.** Conserva decisiones de la etapa de
> neutralización. Para el estado actual usar `AGENTS.md`,
> `docs/IDENTIDAD_PROYECTO.md`, `docs/DB_SAFETY.md` y el mapa generado
> `docs/BACKEND_MAP.md`.

## Goal

Convert the current marketplace into a neutral, reusable, safer marketplace
base that can be connected to a brand-new backend.

## Phase 0 - Safety

- Disable accidental remote backend connections.
- Remove production URLs from examples.
- Add audits for secrets, connections, branding, and large files.
- Document database safety rules.
- Keep Supabase SQL/functions untouched until a new backend plan exists.

## Phase 1 - Neutralization

- Move marketplace name, public URL, logo, colors, copy, currency, contact, and
  region into configuration.
- Replace old brand assets with neutral placeholders.
- Keep domain terms such as buyer, seller, product, order, and catalog.

## Phase 2 - Backend Rebuild

- Keep the local SQL surface coherent with frontend table/RPC usage.
- Design a cleaner consolidated base schema for a new Supabase project.
- Decide which old migrations are historical and which become the new base.
- Generate new database types from the new project only.
- Add seed data that is generic and safe.
- Keep `npm run audit:backend` passing before any backend connection is enabled.

## Phase 3 - Modularization

Estado 2026-07-13: completada la barrera estructural inicial. `preflight`
bloquea archivos de 1000 líneas o más y las primeras extracciones separaron
soporte admin, reglas del contacto comprador, soporte del checkout Edge y
composición de la página de productos. La guía operativa vigente está en
`contexto/modularidad.md`; la lista siguiente queda como historial y backlog de
extracciones más finas.

Split large files by responsibility:

- API/client calls
- mappers and normalizers
- React Query hooks
- pure business rules
- page-level composition
- reusable UI components

Priority files:

- `src/pages/ArtisanProductsPage.tsx`
- `src/features/admin/adminClient.ts`
- `src/features/artisan/components/ArtisanProductFormSection.tsx`
- `src/features/public/publicClient.ts`
- `src/pages/ProductDetailPage.tsx`
- `src/features/buyer/cartClient.ts`

## Phase 4 - Tests And Release Discipline

- Baseline completed on 2026-07-13: Vitest and React Testing Library cover cart
  and shipping rules, product configuration and validation, checkout
  expiration, fulfillment transitions, shared frontend/Edge contracts, and
  protected-route role decisions.
- Keep adding integration tests for Supabase-backed auth sessions, RLS,
  checkout/order creation, inventory application, and payment webhooks.
- Add a release checklist for each new business adaptation.

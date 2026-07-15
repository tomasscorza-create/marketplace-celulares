# Fase 1 — cuentas creadas y eventos útiles

## Propósito

Completar las métricas fundamentales del panel administrativo con una fuente
fiable de cuentas creadas y hacer visibles los eventos comerciales que el
sistema ya captura, sin vincular actividad anónima con perfiles.

## Archivos fuente

- `src/pages/AdminAnalyticsPage.tsx`: presentación de cuentas, conversión y eventos.
- `src/features/analytics/adminAnalyticsMetrics.ts`: cálculo y formato de la
  conversión aproximada.
- `src/types/analytics.ts`: contrato del informe administrativo.
- `supabase/migrations/20260715120000_analytics_account_and_event_metrics.sql`:
  ampliación aditiva de `get_admin_analytics_overview`.

## Datos y dependencias

- `profiles.created_at` y `profiles.role` son la fuente operativa de compradores
  y vendedores creados.
- `analytics_anonymous_daily` aporta inicios de registro y eventos anónimos
  agregados.
- `analytics_events` aporta únicamente eventos individuales de cuentas con
  consentimiento vigente.

No se agregan proveedores externos ni nuevos datos personales.

## Decisiones vigentes

- El número de cuentas no depende de un evento del navegador: se calcula desde
  `profiles`, evitando pérdidas por cierre de pestaña o fallas de red.
- `signup_started` continúa siendo anónimo y no se relaciona después con la
  cuenta creada.
- La conversión es orientativa (`cuentas nuevas / registros iniciados`) y puede
  superar 100% cuando una persona se registra sin un inicio medido o cuando los
  períodos no son comparables. El panel no oculta esa discrepancia.
- El historial individual conserva su contrato anterior y sólo existe con
  consentimiento. No se fabrica retroactivamente `signup_completed`.
- `topEvents` combina conteos anónimos agregados y eventos consentidos por nombre,
  sin deduplicar personas ni crear identificadores anónimos.

## Validación

- TypeScript y lint: aprobados.
- Pruebas: 13 archivos y 59 tests aprobados; incluye tres casos nuevos de
  conversión administrativa.
- `npm run preflight`: aprobado completo.
- `npm run build` y auditoría PWA: aprobados.
- `supabase db push --dry-run`: sólo propone
  `20260715120000_analytics_account_and_event_metrics.sql`.
- `supabase db lint --linked`: conserva únicamente la advertencia preexistente
  del parámetro legado `requested_search_term`.
- Supabase local no pudo iniciarse porque Docker Desktop no está disponible.
- El 2026-07-14, el `dry-run` remoto propuso únicamente esta migración y
  `20260715120000_analytics_account_and_event_metrics.sql` se aplicó en el
  proyecto productivo confirmado `snlotkvstplwnoiacqyz`.

Última revisión: 2026-07-14.

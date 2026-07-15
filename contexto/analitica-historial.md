# Historial de implementación de analítica

> Documento histórico, no operativo. Resume por qué existe el diseño actual,
> pero no certifica el estado de Git, Supabase, Edge Functions, Netlify ni
> producción. Para trabajar sobre el sistema vigente, usar
> [analitica-interna.md](analitica-interna.md) y verificar el código actual.

## Propósito

Conservar la trazabilidad durable de las fases iniciales sin mezclarla con el
contrato vigente ni mantener diarios de comandos, métricas temporales, versiones
de deploy o cantidades de tests que pierden validez rápidamente.

## Resumen cerrado

| Fase | Resultado durable | Fuentes que conservaron el resultado |
| --- | --- | --- |
| 0 — Aislamiento | Se confirmó la identidad del proyecto y se separó el trabajo de analítica de cambios concurrentes. Los valores productivos y el estado de rama observados entonces fueron sólo una línea base temporal. | `docs/IDENTIDAD_PROYECTO.md`, historial Git |
| 1 — Métricas útiles | Las cuentas creadas se calculan desde `profiles`; `signup_started` permanece agregado y su conversión es orientativa. | `20260715120000_analytics_account_and_event_metrics.sql`, `adminAnalyticsMetrics.ts` |
| 2 — Actualización del panel | El informe actualiza sólo con la pestaña visible, revalida al recuperar foco y conserva el último resultado durante recargas. | `analyticsRefresh.ts`, `analyticsQueries.ts` |
| 3 — Entrega idempotente | Los reintentos reutilizan un `event_id`; recibo y escritura se resuelven de forma transaccional sin crear una identidad anónima. | `20260715150000_analytics_delivery_idempotency.sql`, `analyticsDelivery.ts` |
| 4 — Sesiones activas | Las sesiones consentidas usan inactividad, tiempo visible y cierres idempotentes; la duración no se deriva del tiempo de calendario. | `20260715180000_analytics_session_lifecycle.sql`, `analyticsActivityClock.ts` |
| 5 — Calidad anónima | Se incorporaron allowlist de origen y rutas, descarte de bots, rate limit compartido con HMAC efímero y exclusión agregada de picos. | `20260715210000_analytics_anonymous_quality.sql`, `requestQuality.ts` |
| 6 — Retención | La limpieza quedó acotada a tablas de analítica, programada diariamente, auditada y visible como estado agregado para admin. | `20260715220000_analytics_retention_schedule.sql`, `analyticsRetentionContract.test.ts` |

## Límites de interpretación

- Las fases 0–6 están cerradas como historia de diseño; no son una cola de
  tareas ni una matriz de validación actual.
- Un commit, una versión de función, un dry-run, un resultado de tests o un
  deploy observado durante una fase no demuestra el estado presente.
- La activación de secrets opcionales, la sincronización de migraciones y el
  estado de servicios remotos deben verificarse en una tarea autorizada y por
  separado.
- No existe en este repositorio una fuente operativa para inferir fases
  posteriores. Una capacidad presente en código no demuestra que esté activada
  en producción.

Última revisión documental: 2026-07-15.

# Fase 6 — retención automática y auditable

## Propósito

Ejecutar diariamente la política de retención de analítica, dejar evidencia de
cada limpieza y alertar en el panel si el mantenimiento deja de completarse,
sin alcanzar perfiles, productos, pedidos ni datos comerciales.

## Archivos fuente

- `supabase/migrations/20260715220000_analytics_retention_schedule.sql`: tabla
  de ejecuciones, función acotada, RPC de estado y cron diario.
- `src/features/analytics/analyticsData.ts`: incorpora el estado de
  mantenimiento al resumen admin.
- `src/features/analytics/analyticsMaintenance.ts`: mensaje operativo del panel.
- `src/pages/AdminAnalyticsPage.tsx`: estado visible y alerta por vencimiento.

## Política vigente

- `analytics_events` y `analytics_sessions`: 365 días.
- `analytics_anonymous_daily` y calidad horaria: 730 días.
- Recibos de entrega y rate limits: se borran cuando vence su propia expiración.
- Historial de ejecuciones: 730 días.
- Consentimientos e historial de consentimiento no se eliminan por este job.

La función enumera explícitamente las tablas permitidas. No usa SQL dinámico y
no contiene referencias a `profiles`, productos, pedidos, pagos o inventario.

## Programación y auditoría

`pg_cron` ejecuta `run_internal_analytics_maintenance()` todos los días a las
03:17 UTC. La migración elimina primero cualquier job anterior con el mismo
nombre, registra uno único y ejecuta una limpieza inicial para dejar una línea
base confirmada.

Cada fila de `analytics_maintenance_runs` registra inicio, fin, duración,
estado y cantidades eliminadas por tabla. Los errores se limitan a 500
caracteres y sólo se exponen como estado agregado mediante una RPC admin.

El panel marca el mantenimiento como vencido cuando no existe una ejecución
exitosa durante más de 36 horas. También distingue un último fallo si todavía
existe una limpieza exitosa reciente.

## Seguridad

- La tabla de ejecuciones tiene RLS y no permite lecturas directas a `anon` o
  `authenticated`.
- La ejecución se concede sólo a `service_role`; la consulta de estado exige
  `is_admin()`.
- `cleanup_internal_analytics()` conserva su firma histórica y delega en la
  nueva función auditable.

## Validación

- Pruebas unitarias para estado saludable, ausencia de ejecución, vencimiento y
  último fallo.
- Auditoría estática de las únicas tablas alcanzadas por los `delete`.
- `supabase db push --dry-run`, listado de migraciones y `db lint --linked`.
- Confirmar en producción que existe un solo job `analytics-daily-cleanup` y
  que la ejecución inicial queda en estado `success`.
- Ejecutar `npm run preflight` y `npm run build`.

Última revisión: 2026-07-14.

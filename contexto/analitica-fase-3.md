# Fase 3 — entrega confiable e idempotente

## Propósito

Reducir la pérdida de eventos por fallos transitorios de red y evitar que los
reintentos dupliquen visitas, acciones o segundos activos, sin crear una
identidad persistente para visitantes anónimos.

## Archivos fuente

- `src/features/analytics/analyticsDelivery.ts`: política de reintentos y
  conservación del mismo `event_id` entre intentos.
- `src/features/analytics/analyticsClient.ts`: transporte `fetch` con
  `keepalive`, timeout, cola consentida y confirmación de visitas.
- `supabase/functions/collect-analytics/index.ts`: validación del identificador,
  RPC idempotentes y logs técnicos estructurados.
- `supabase/migrations/20260715150000_analytics_delivery_idempotency.sql`:
  recibos efímeros y escritura transaccional.

## Datos y dependencias

Cada entrega recibe un UUID aleatorio nuevo. El UUID identifica únicamente ese
intento lógico; no identifica un navegador, dispositivo ni persona.

`analytics_delivery_receipts` conserva durante 48 horas:

- `event_id` y modo de entrega.
- `user_id` y `session_id` sólo para una cuenta consentida.
- ningún `user_id`, sesión, ruta, IP, dispositivo ni evento para tráfico
  anónimo.

La tabla no tiene políticas de lectura pública o administrativa. Es un detalle
interno de escritura accesible sólo al backend con `service_role`.

## Decisiones vigentes

- Cada evento se intenta como máximo tres veces, con esperas de 400 y 1200 ms.
- Cada intento de red vence a los 5 segundos para no bloquear indefinidamente
  la cola consentida.
- Los reintentos conservan exactamente el mismo `event_id`.
- La escritura del recibo, la sesión, el evento o agregado y el tiempo activo
  ocurre dentro de la misma transacción SQL.
- `fetch` usa `keepalive: true` para permitir que una entrega iniciada continúe
  cuando la página se abandona.
- Sólo las cuentas consentidas usan una cola temporal en memoria. Los eventos
  anónimos no se guardan en `localStorage`, IndexedDB ni otra cola persistente.
- La marca de visita en `sessionStorage` se crea únicamente después de una
  respuesta confirmada por el backend.
- Los resultados `accepted`, `rejected` y `failed` se registran como logs
  estructurados de la función Edge sin ruta, IP, usuario ni `event_id`.
- Un error agotado se descarta silenciosamente y nunca interrumpe navegación,
  registro, carrito o compra.

## Validación

- Las pruebas de entrega comprueban éxito inmediato, reintento con el mismo ID,
  rechazo definitivo y agotamiento limitado de fallos de transporte.
- La migración mantiene un índice único en `analytics_events.event_id` y usa un
  recibo transaccional también para `heartbeat` y agregados anónimos.
- `deno check` de `collect-analytics`: aprobado.
- Suite completa: 15 archivos y 66 pruebas aprobadas.
- `npm run preflight`, build y auditoría PWA: aprobados.
- El `dry-run` remoto propone únicamente
  `20260715150000_analytics_delivery_idempotency.sql`.
- `supabase db lint --linked` conserva sólo la advertencia heredada de
  `requested_search_term`.
- Después de desplegar, enviar dos veces el mismo payload con idéntico
  `event_id` y comprobar que el agregado aumenta una sola vez.

## Estado productivo

El 2026-07-14 se publicó el frontend del commit `bd5963d` en Netlify, se aplicó
`20260715150000_analytics_delivery_idempotency.sql` al proyecto confirmado y se
desplegó `collect-analytics` versión 2 con `verify_jwt = false`. La función quedó
`ACTIVE` y aceptó dos entregas consecutivas con el mismo `event_id`; la
idempotencia del incremento está garantizada por la transacción y la clave
primaria del recibo.

El enlace temporal de Supabase volvió a cuarentena. El `.env.local` operativo
del worktree compartido se restauró inmediatamente después de la validación;
los scripts de seguridad no deben dejar la plantilla desactivada al terminar.

Última revisión: 2026-07-14.

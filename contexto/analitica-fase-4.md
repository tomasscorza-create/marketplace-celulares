# Fase 4 — sesiones y tiempo activo visible

## Propósito

Medir sesiones consentidas comparables y tiempo realmente activo sin contar una
pestaña oculta, un equipo suspendido o una pestaña abierta durante días como
actividad continua.

## Archivos fuente

- `src/features/analytics/analyticsActivityClock.ts`: reloj puro de actividad
  visible y límite ante suspensiones prolongadas.
- `src/features/analytics/AnalyticsProvider.tsx`: eventos de visibilidad,
  intervalo de entrega y cierre al abandonar la página.
- `src/features/analytics/analyticsClient.ts`: entrega de `heartbeat` y
  `session_end`, limpieza segura del ID local y protección ante carreras.
- `supabase/functions/collect-analytics/index.ts`: admisión controlada del cierre
  de sesión sólo para cuentas autenticadas con consentimiento vigente.
- `supabase/migrations/20260715180000_analytics_session_lifecycle.sql`: ventana
  de inactividad, cierre transaccional y distribución de duraciones.
- `src/pages/AdminAnalyticsPage.tsx`: duración media y distribución de sesiones.

## Decisiones vigentes

- Una sesión puede reutilizarse durante un máximo de 30 minutos sin actividad.
  Después de ese plazo el backend cierra la anterior en su último instante
  conocido y crea otra.
- El navegador acumula únicamente tiempo con `visibilityState = visible`.
- El tiempo pendiente se entrega cada 10 segundos y al ocultar la pestaña. La
  precisión esperada es de 10 segundos en condiciones normales.
- Cada entrega suma como máximo 60 segundos. Un salto mayor causado por
  suspensión, bloqueo del proceso o reloj detenido no se interpreta como uso.
- `pagehide` envía `session_end` con `keepalive`, elimina inmediatamente el ID
  de sesión de `sessionStorage` y no espera la respuesta para liberar la página.
- La entrega directa de cierre y el último `heartbeat` pueden llegar en distinto
  orden. La RPC serializa decisiones por usuario y reutiliza una sesión recién
  cerrada sólo para completar esos eventos técnicos, sin crear sesiones dobles.
- `heartbeat` y `session_end` no se insertan en `analytics_events`; sólo
  actualizan `analytics_sessions` mediante recibos idempotentes.
- No se agregan cookies, fingerprinting, IP persistida ni identificadores para
  visitantes anónimos.

## Informe administrativo

Además del promedio de segundos activos, el informe devuelve cinco rangos:

- menos de 15 segundos;
- 15 a 59 segundos;
- 1 a 2 minutos;
- 3 a 9 minutos;
- 10 minutos o más.

Los rangos usan `active_seconds`, no la diferencia entre hora de inicio y fin,
para que una pestaña oculta no infle la duración.

## Validación

- Las pruebas unitarias cubren tiempo visible, pausas, reanudación idempotente,
  fracciones pendientes, límite por entrega y suspensión prolongada.
- `record_consented_analytics_v2` conserva el mismo contrato y permisos de Fase
  3; la migración es aditiva y reemplaza sólo su implementación.
- Validar `collect-analytics` con `deno check`, luego ejecutar `npm run preflight`
  y `npm run build`.
- Antes de producción, exigir `supabase db push --dry-run`, listado de
  migraciones y `supabase db lint --linked` contra el proyecto confirmado.

La validación de esta fase aprobó `deno check`, 16 archivos con 71 pruebas,
`npm run preflight`, build y auditoría PWA. El `dry-run` remoto propuso sólo la
migración de Fase 4; el lint posterior conservó únicamente la advertencia
heredada de `requested_search_term`.

## Estado productivo

El 2026-07-14 se publicó el commit `461adb0` en `main`, se aplicó
`20260715180000_analytics_session_lifecycle.sql` al proyecto confirmado
`snlotkvstplwnoiacqyz` y se desplegó `collect-analytics` versión 3. La función
quedó `ACTIVE`, con `verify_jwt = false` para la ruta anónima controlada, y una
solicitud `session_end` sin usuario fue rechazada con el `401` esperado antes de
escribir datos.

El observador de Netlify confirmó que no quedaron despliegues activos y reportó
como último build el sitio productivo `https://nyzca.com`. El enlace temporal de
Supabase fue movido a cuarentena sin modificar `.env.local`.

Última revisión: 2026-07-14.

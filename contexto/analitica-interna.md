# Analítica interna y privacidad

## Propósito y propiedad

Esta ficha es la referencia vigente del dominio de analítica: relaciona las
reglas de privacidad con su implementación, sus datos y sus controles. Las
reglas transversales de seguridad y la matriz de riesgo pertenecen a
`AGENTS.md`; la evolución inicial pertenece a
[analitica-historial.md](analitica-historial.md).

El objetivo es medir visitas y acciones comerciales útiles para el panel admin
sin crear perfiles ocultos de visitantes ni almacenar IP, coordenadas, campos
libres o señales de fingerprinting.

## Fuentes de verdad

| Superficie | Fuente propietaria |
| --- | --- |
| Eventos, consentimiento y política | `src/features/analytics/analyticsContract.ts`, `AnalyticsProvider.tsx` |
| Entrega, sesiones y contexto | `analyticsClient.ts`, `analyticsDelivery.ts`, `analyticsActivityClock.ts`, `deviceClassifier.ts` |
| Consultas e informe admin | `analyticsData.ts`, `analyticsQueries.ts`, `analyticsRefresh.ts`, `src/pages/AdminAnalyticsPage.tsx` |
| Explicación al usuario | `src/pages/PrivacyPage.tsx` |
| Admisión y escritura backend | `supabase/functions/collect-analytics/index.ts`, `requestQuality.ts` |
| Esquema vigente | Migraciones `20260714190000_internal_analytics.sql` a `20260715220000_analytics_retention_schedule.sql` |

Las allowlists exactas de eventos, rutas y payloads viven en el código. No
agregar eventos o campos sólo en frontend: el contrato de navegador, Edge,
tipos, SQL y privacidad debe cambiar como una sola unidad.

## Modos de captura

| Modo | Identidad | Escritura | Condición |
| --- | --- | --- | --- |
| Anónimo | No usa ID persistente ni historial individual. Una marca booleana en `sessionStorage` evita repetir la visita dentro de la pestaña y se guarda sólo tras confirmar el backend. | Incrementa agregados diarios; calidad y deduplicación usan registros técnicos efímeros. | Origen, ruta, evento y bot válidos; rate limit disponible. Las cuentas admin no emiten este modo. |
| Consentido | Usa usuario y sesión sólo para `buyer` o `artisan`. | Guarda sesiones y eventos permitidos mediante RPC transaccionales. | JWT válido, rol admitido, consentimiento no revocado y versión de política vigente. |

Revocar el consentimiento detiene la captura individual y elimina el ID de
sesión de la pestaña. No vincula actividad anónima anterior con la cuenta. Los
datos ya escritos siguen la retención vigente hasta su limpieza o tratamiento
autorizado; una revocación no implica borrar otras entidades del negocio.

## Datos admitidos y prohibidos

La entrega admite únicamente:

- `event_id` aleatorio de la entrega lógica y nombre de evento permitido;
- ruta sin query string y, cuando corresponde, tipo e UUID de entidad;
- contexto general: dispositivo, sistema, gama estimada, confianza,
  navegador, tamaño de pantalla, conexión y dominio referidor normalizado;
- versión de política, ID de sesión y segundos activos sólo en el flujo
  consentido;
- país, región, ciudad y zona horaria aproximados resueltos por el backend.

No se admiten términos de búsqueda, texto de formularios, correo o teléfono en
eventos, direcciones, postal, coordenadas, datos de pago, IP persistida ni datos
obtenidos por canvas, WebGL, fuentes, audio u otras técnicas de fingerprinting.
El clasificador devuelve `unknown` cuando las señales generales no alcanzan; no
intenta reconocer un modelo concreto de equipo.

## Contratos operativos

| Área | Decisión vigente |
| --- | --- |
| Cuentas creadas | Se calculan desde `profiles.created_at` y `profiles.role`. Compararlas con `signup_started` es orientativo y nunca vincula ambos registros. |
| Actualización admin | Consulta cada 30 segundos sólo con la pestaña visible, revalida al recuperar foco y conserva el último resultado confirmado durante recargas. |
| Entrega | Cada evento se intenta como máximo tres veces, con pausas de 400 y 1200 ms y timeout de 5 segundos. Todos los intentos conservan el mismo `event_id`. |
| Recibos | Impiden duplicados durante 48 horas. El recibo anónimo no contiene usuario, sesión, ruta, IP, dispositivo ni evento de negocio. |
| Sesión consentida | Vence tras 30 minutos sin actividad. El tiempo se acumula sólo con la pestaña visible, se entrega cada 10 segundos y limita cada segmento a 60 segundos. |
| Cierre | `pagehide` solicita `session_end` con `keepalive`; `heartbeat` y `session_end` actualizan la sesión, pero no se guardan como eventos comerciales. |
| Calidad anónima | Sólo admite orígenes y rutas conocidos, ignora bots comunes y limita 90 solicitudes por 60 segundos mediante HMAC diario de IP. El hash es efímero y no identifica visitantes. |
| Picos | Los topes horarios son 2.000 visitas, 10.000 páginas y 5.000 para otras acciones. El exceso queda sólo como calidad agregada y no entra al resumen principal. |
| Retención | Eventos y sesiones: 365 días. Agregados, calidad e historial de mantenimiento: 730 días. Recibos y rate limits se eliminan al vencer. |
| Mantenimiento | `run_internal_analytics_maintenance()` corre diariamente a las 03:17 UTC. El panel alerta tras 36 horas sin éxito; la función no puede alcanzar datos comerciales. |

La duración administrativa usa `active_seconds`, nunca
`ended_at - started_at`, porque esa diferencia incluiría tiempo oculto o
suspendido.

## Datos, acceso y RPC

| Recurso | Contenido y acceso |
| --- | --- |
| `analytics_consents` | Preferencia versionada; el usuario puede leer y administrar la propia. |
| `analytics_consent_history` | Auditoría de aceptaciones y revocaciones; no forma parte del job general de retención. |
| `analytics_sessions` | Sesiones consentidas y contexto general; lectura administrativa. |
| `analytics_events` | Acciones permitidas de sesiones consentidas; lectura administrativa. |
| `analytics_anonymous_daily` | Agregados sin identidad. |
| `analytics_delivery_receipts` | Deduplicación efímera sin lectura pública. |
| `analytics_rate_limits` | HMAC temporal, ventana, contador y expiración; sin lectura pública. |
| `analytics_anonymous_quality_hourly` | Volumen horario y exclusiones agregadas. |
| `analytics_maintenance_runs` | Estado, duración y cantidades eliminadas por el job. |

Las escrituras de actividad pasan por `collect-analytics` con `service_role`,
que nunca llega al navegador. Las RPC de informe validan admin antes de devolver
el resumen, la calidad, el mantenimiento o el historial consentido. Las
escrituras vigentes usan `record_anonymous_analytics_v2` y
`record_consented_analytics_v2`; `cleanup_internal_analytics()` se conserva por
compatibilidad y delega en el mantenimiento auditable.

## Configuración backend por nombre

- `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`: cliente privilegiado de la
  función; nunca son variables `VITE_*`.
- `ANALYTICS_RATE_LIMIT_SECRET`: obligatorio para crear el HMAC diario del rate
  limit. Debe ser aleatorio, privado y administrado como secret.
- `ANALYTICS_ALLOWED_ORIGINS`: override opcional, separado por comas, de la
  allowlist definida por el código; es necesario declarar el origen local al
  probar fuera de los dominios admitidos por defecto.
- `IPINFO_TOKEN`: opcional. Si existe, se consumen sólo ciudad, región, país y
  zona horaria; sin él se usa el país del gateway cuando está disponible.

La presencia de un nombre en el repo no demuestra que su secret esté cargado
en un proyecto remoto. Verificar esa activación sólo dentro de una operación
remota autorizada y sin imprimir valores.

## Validación proporcional

Elegir el control según la superficie y la matriz de `AGENTS.md`:

| Cambio | Control dirigido |
| --- | --- |
| Documentación | Revisar fuentes/enlaces, `git diff --check` del alcance y `npm run audit:encoding`. |
| Cálculo o UI aislados | Ejecutar el test explícito de `src/features/analytics/`, ESLint sólo sobre archivos afectados y typecheck si cambian lógica, tipos, imports o JSX estructural. |
| Calidad de solicitudes Edge | `npm test -- supabase/functions/collect-analytics/requestQuality.test.ts` y `deno check supabase/functions/collect-analytics/index.ts`; sumar un probe local de origen, bot, ruta y modo afectado. |
| Retención SQL | `npm test -- src/features/analytics/analyticsRetentionContract.test.ts` y `npm run audit:backend`. Aplicar y lintar en una pila local sólo si está disponible y confirmada como descartable. |
| Contrato integrado o crítico | Durante la iteración usar tests explícitos. En el checkpoint final ejecutar `npm run preflight` una vez; sumar `npm run build` sólo si cambió o se publicará el frontend. |

`vitest related` no descubre por grafo el test de retención porque éste lee la
migración con `readFileSync`; debe invocarse explícitamente. Un cambio sólo Edge
o SQL no activa automáticamente la suite ni el build frontend. Si una prueba
local de esquema necesita recrear datos, usar exclusivamente
`supabase db reset --local` después de confirmar que la pila es descartable.

Dry-runs, lint vinculado, cambios de secrets, migraciones y deploys remotos
siguen el flujo de `AGENTS.md` y `docs/DB_SAFETY.md`; nunca se usan para completar
una validación local sin autorización.

Última revisión contra fuentes locales: 2026-07-15.

# Analítica interna y privacidad

## Propósito

Medir visitas y acciones comerciales útiles dentro del panel admin sin crear
perfiles ocultos de visitantes ni almacenar IP, coordenadas, formularios o
señales de fingerprinting.

## Fuentes de verdad

- `src/features/analytics/`: contrato, clasificador, cliente, consentimiento y consultas.
- `src/pages/AdminAnalyticsPage.tsx`: informe protegido del administrador.
- `src/pages/PrivacyPage.tsx`: explicación y revocación del consentimiento.
- `supabase/functions/collect-analytics/index.ts`: validación e ingreso de eventos.
- `supabase/migrations/20260714190000_internal_analytics.sql`: tablas y RLS base.
- `supabase/migrations/20260715180000_analytics_session_lifecycle.sql`: ciclo de
  vida vigente de sesiones y distribución de duraciones.

## Modelo de privacidad

### Visitantes sin consentimiento

- Se genera una marca booleana temporal en `sessionStorage` para contar una
  visita una vez durante esa pestaña; no contiene un ID.
- No existe identificador persistente, historial individual ni vinculación
  posterior con una cuenta.
- Los eventos permitidos incrementan directamente agregados diarios.
- La IP sólo puede procesarse en memoria dentro de la función Edge para limitar
  abuso y resolver una ubicación aproximada. Nunca se inserta en Supabase.

### Cuentas con consentimiento

- El consentimiento es opcional, versionado y revocable.
- Sólo roles `buyer` y `artisan` con la versión vigente pueden generar sesiones
  y eventos individuales. Las cuentas admin no se rastrean.
- Al revocar se detiene la captura y se elimina el ID de sesión de la pestaña.
- El historial local anterior de personalización del catálogo se borra cuando no
  hay consentimiento. Las RPC históricas de actividad también lo exigen en SQL.
- El historial existente conserva la retención operativa hasta que se ejecute
  su eliminación o anonimización según la política aplicable.

## Datos admitidos

- Ruta sin query string, nombre de evento y UUID opcional de producto,
  vendedor, categoría o checkout.
- Tipo general: computadora, celular, tablet u otro.
- Sistema: Windows, macOS, Linux, ChromeOS, Android, iOS, iPadOS u otro.
- Gama estimada alta/media/baja o `unknown`, más nivel de confianza.
- Navegador, tamaño general de pantalla y calidad general de conexión.
- País, región, ciudad y zona horaria aproximados.

No se admiten términos de búsqueda, texto de formularios, correo/teléfono como
payload, datos de pago, direcciones, postal, coordenadas, IP ni datos obtenidos
por canvas, WebGL, fuentes, audio u otras técnicas de fingerprinting.

## Clasificación de gama

`deviceClassifier.ts` usa únicamente memoria aproximada y núcleos cuando el
navegador los expone. Si faltan señales, devuelve `unknown` en lugar de inventar
un modelo o una gama. La red se clasifica aparte y no define la gama del equipo.

## Ubicación aproximada

`collect-analytics` puede usar el secret opcional `IPINFO_TOKEN`. Sólo consume
`city`, `region`, `country_code` y `timezone`; ignora y no guarda IP, postal,
coordenadas, ASN o datos de privacidad de red. Sin ese secret, el sistema sigue
funcionando y conserva únicamente el país si el gateway lo proporciona.

## Tablas y acceso

- `analytics_consents`: preferencia versionada por usuario.
- `analytics_consent_history`: auditoría de aceptaciones y revocaciones.
- `analytics_sessions`: sesiones consentidas y datos generales del entorno.
- `analytics_events`: acciones permitidas de sesiones consentidas.
- `analytics_anonymous_daily`: agregados sin identidad.

RLS permite al usuario leer su consentimiento. Las tablas de actividad sólo se
leen como admin. Las escrituras de actividad pasan por la función Edge con
`service_role`; esa clave nunca llega al navegador.

## Informe administrativo

- Las cuentas creadas se cuentan desde `profiles.created_at`, separadas entre
  compradores y vendedores. Es una métrica operativa exacta y no depende del
  consentimiento de analítica ni de un evento del navegador.
- Los inicios de registro siguen siendo agregados anónimos; la conversión contra
  cuentas creadas es orientativa y nunca vincula ambos registros.
- El resumen de eventos combina totales anónimos y consentidos por nombre. El
  detalle por usuario continúa limitado a cuentas con consentimiento vigente.
- El panel refresca sus consultas cada 30 segundos sólo cuando está visible,
  vuelve a consultar al recuperar el foco y permite una actualización manual.
  Durante una recarga conserva el último informe confirmado.
- La entrega usa reintentos limitados y un `event_id` por evento lógico. Los
  recibos anónimos expiran a las 48 horas y no contienen ruta, IP, dispositivo,
  sesión ni usuario; sirven únicamente para impedir duplicados.
- La marca temporal de visita se guarda después de la confirmación del backend.
  Sólo las cuentas consentidas mantienen una cola transitoria en memoria.
- Una sesión consentida vence tras 30 minutos sin actividad. El tiempo activo se
  acumula sólo mientras la pestaña está visible, se entrega cada 10 segundos y
  se actualiza al ocultarla. Al abandonar la página se solicita el cierre con
  `keepalive`; una suspensión aislada nunca suma más de 60 segundos.
- El panel muestra duración media y rangos de duración basados en segundos
  activos, no en tiempo de calendario entre inicio y fin.

## Retención

`cleanup_internal_analytics()` elimina eventos y sesiones con más de 365 días y
agregados anónimos con más de 730 días. También elimina recibos de entrega
vencidos; las RPC de captura hacen esa limpieza oportunistamente para que los
recibos no crezcan mientras todavía no exista un cron. La limpieza general no
se programa automáticamente desde el frontend: producción debe invocarla con un
cron seguro o mantenimiento backend.

## Validación

```powershell
npm run db:start
npm run db:reset
npm run db:lint
npm run preflight
npm run build
```

Además, servir `collect-analytics` localmente y comprobar:

1. Una visita anónima incrementa un agregado y no crea sesión.
2. Una cuenta sin consentimiento recibe `403` al intentar evento consentido.
3. Una cuenta consentida crea sesión y eventos.
4. Revocar detiene la captura individual.
5. Sólo admin ejecuta los RPC de informes.

Última revisión: 2026-07-14, Fase 4.

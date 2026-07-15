# Fase 5 — calidad de métricas anónimas

## Propósito

Evitar que bots, rutas inventadas o llamadas directas inflen fácilmente las
visitas y clasificaciones generales, sin almacenar IP ni crear una identidad
persistente para visitantes anónimos.

## Archivos fuente

- `supabase/functions/collect-analytics/requestQuality.ts`: origen, rutas, bots
  y HMAC temporal.
- `supabase/functions/collect-analytics/index.ts`: aplicación de los controles
  antes de escribir o consultar GeoIP.
- `supabase/migrations/20260715210000_analytics_anonymous_quality.sql`: límite
  compartido, contadores horarios y RPC administrativa de calidad.
- `src/features/analytics/analyticsData.ts`: combina el resumen principal con
  el estado de calidad.
- `src/pages/AdminAnalyticsPage.tsx`: declara que los anónimos son aproximados
  e informa eventos excluidos.

## Decisiones vigentes

- Sólo se admiten los orígenes productivos configurados. Un origen ausente,
  inválido o parecido al dominio real se rechaza.
- Las rutas se validan contra la superficie real y los IDs dinámicos deben ser
  UUID. `product_view`, `artisan_view` y `signup_started` también deben coincidir
  con su ruta semántica.
- Los agentes automatizados conocidos se responden como ignorados y no generan
  agregados, recibos ni consultas de ubicación.
- El rate limit es compartido en Postgres: 90 solicitudes por 60 segundos. La
  clave es un HMAC SHA-256 diario calculado con un secret dedicado; nunca se
  guarda la IP original y el hash no se reutiliza como ID de visitante.
- Los límites horarios por evento y ruta son 2.000 visitas, 10.000 páginas y
  5.000 para las demás acciones. El exceso queda en
  `analytics_anonymous_quality_hourly.excluded_count` pero no incrementa el
  informe principal.
- Las cuentas admin no emiten analítica anónima desde el frontend.
- Los totales anónimos continúan siendo aproximados: estos controles reducen
  abuso evidente, pero no pretenden identificar personas ni reemplazar un
  sistema antifraude.

## Privacidad y acceso

`analytics_rate_limits` contiene sólo hashes temporales, ventana, contador y
expiración. `analytics_anonymous_quality_hourly` contiene hora, evento, ruta y
totales. Ambas tablas tienen RLS, carecen de políticas públicas y sólo las usa
el backend. El panel recibe únicamente sumas agregadas mediante una RPC admin.

## Validación

- Probar origen exacto, dominio parecido, origen ausente y configuración local.
- Probar rutas reales, rutas inventadas, UUID inválido y coherencia de evento.
- Probar user agents normales y bots conocidos.
- Probar que el HMAC sea estable durante un día, rote al día siguiente y no
  contenga la IP.
- Ejecutar `deno check`, `npm run preflight`, build, dry-run y lint remoto.

La validación aprobó las cinco pruebas específicas de calidad, `deno check`,
19 archivos con 83 pruebas totales, `preflight`, build y PWA. El dry-run remoto
propuso únicamente las migraciones de Fases 5 y 6, y el lint posterior mantuvo
sólo la advertencia heredada de `requested_search_term`.

## Estado productivo

El 2026-07-14 se aplicó
`20260715210000_analytics_anonymous_quality.sql`, se configuró el secret
`ANALYTICS_RATE_LIMIT_SECRET` con un valor aleatorio no versionado y se desplegó
`collect-analytics` versión 5 en `snlotkvstplwnoiacqyz`.

Las pruebas remotas sin escritura confirmaron: origen falso `403`, bot conocido
`200` con `ignored: true` y ruta inventada `400`. El frontend del commit
`fc84e1b` quedó publicado en `main` y Netlify terminó el despliegue de
`https://nyzca.com`.

Última revisión: 2026-07-14.

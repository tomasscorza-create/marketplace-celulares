# Funciones Edge

## Propósito y propiedad

Esta ficha mapea las funciones Deno, sus callers y sus barreras de autorización.
Los contratos detallados de negocio pertenecen a
`contexto/operacion-admin.md`, `docs/CHECKOUT_MERCADOPAGO.md` y
[analitica-interna.md](analitica-interna.md); aquí no se duplican sus flujos.

Las funciones aíslan secretos y operaciones con `service_role`. Esa clave nunca
se envía al navegador y no reemplaza la validación del caller dentro de cada
función.

## Fuentes de verdad

- `supabase/functions/<nombre>/index.ts`: comportamiento y autorización de
  aplicación de cada función.
- `supabase/functions/_shared/`: reglas reutilizadas por pagos, expiración,
  configuración de productos y CORS.
- `supabase/config.toml`: configuración Edge versionada, incluida la excepción
  JWT explícita de `collect-analytics`.
- `supabase/functions/.env.example`: nombres base de variables para un entorno
  nuevo; los valores reales viven fuera del repo.
- `docs/CHECKOUT_MERCADOPAGO.md`: activación, límites y secrets de checkout.
- `contexto/analitica-interna.md`: privacidad, datos y validación de analítica.

## Inventario y autorización

| Función | Caller previsto | Barrera de aplicación | Dependencias privilegiadas |
| --- | --- | --- | --- |
| `admin-buyer-accounts` | Panel admin | Bearer JWT; obtiene el usuario y exige perfil admin antes de consultar datos. | Supabase `service_role` |
| `admin-manage-artisans` | Panel admin | Bearer JWT; obtiene el usuario y exige perfil admin antes de crear, editar o eliminar vendedores. | Supabase Auth, DB, Storage y `service_role` |
| `create-mercadopago-checkout` | Comprador autenticado | Bearer JWT; valida usuario, perfil `buyer`, carrito, opciones, stock y precios en servidor. | Supabase `service_role`, access token de Mercado Pago, URLs de aplicación/webhook |
| `expire-pending-checkouts` | Cron u operador backend | Header `x-cron-secret` comparado con `PENDING_CHECKOUTS_CRON_SECRET`; no usa sesión de usuario. | Supabase `service_role` |
| `mercadopago-return` | Redirección del navegador desde Mercado Pago | No confía en JWT de usuario; reconcilia contra la API del proveedor y restringe el origen de retorno. | Supabase `service_role`, access token de Mercado Pago, `APP_BASE_URL` |
| `mercadopago-webhook` | Mercado Pago | Verifica firma HMAC `x-signature` y datos del request antes de recuperar y aplicar el pago. | Supabase `service_role`, access token y webhook secret de Mercado Pago |
| `collect-analytics` | Navegador anónimo o cuenta consentida | Gateway con `verify_jwt = false`; valida origen, ruta, evento, bot y rate limit. El modo individual además valida Bearer JWT, rol y consentimiento vigente dentro de la función. | Supabase `service_role`, `ANALYTICS_RATE_LIMIT_SECRET`; GeoIP opcional |

Las funciones de retorno, webhook y cron tienen callers externos que no
equivalen a una sesión frontend. No aplicarles por analogía la regla JWT del
panel. A la vez, una validación de aplicación no demuestra cómo está configurado
el gateway remoto: antes de desplegar una función cuyo caller no porta JWT,
verificar explícitamente su política de `verify_jwt` en el objetivo autorizado.
El único override versionado actualmente en `supabase/config.toml` es el de
`collect-analytics`.

## Configuración y secrets

Los nombres de pago y Supabase se mantienen en
`supabase/functions/.env.example` y `docs/CHECKOUT_MERCADOPAGO.md`. Para
analítica también aplican:

- `ANALYTICS_RATE_LIMIT_SECRET`: obligatorio y privado;
- `ANALYTICS_ALLOWED_ORIGINS`: allowlist opcional de orígenes;
- `IPINFO_TOKEN`: proveedor geográfico opcional.

No copiar valores a documentación, argumentos de comandos, variables `VITE_*`
ni archivos versionados. `SUPABASE_SERVICE_ROLE_KEY`, tokens de proveedor,
webhook secrets y secretos de cron son siempre backend. El código puede admitir
nombres legacy de Mercado Pago; para nuevas configuraciones usar los nombres
por ambiente que define la plantilla.

## Despliegue y estado remoto

- Netlify no despliega funciones Edge, migraciones ni secrets.
- Un cambio local en `supabase/functions/` no demuestra que la función remota
  haya cambiado.
- Desplegar sólo la función incluida en el alcance, después de confirmar repo,
  project ref, secrets requeridos y política JWT.
- Registrar por separado código local, migraciones, función desplegada, secrets
  configurados y prueba funcional; ninguno demuestra automáticamente los demás.
- Esta ficha no declara funciones activas, versiones remotas ni checkout
  productivo. Esos estados son temporales y deben verificarse en una tarea
  autorizada.

## Validación proporcional

### Control común

1. Revisar el diff y ejecutar `deno check` sobre el entrypoint y helpers Deno
   afectados.
2. Ejecutar `npm run audit:backend` cuando cambien tablas, RPC, Storage o sus
   referencias.
3. Ejecutar la prueba explícita de contrato más cercana. No asumir cobertura de
   ESLint o typecheck global: ambas superficies excluyen o cubren de forma
   incompleta `supabase/functions/**`.
4. Si existe una pila local aislada, servir sólo la función afectada y probar
   éxito, caller inválido, permisos insuficientes y fallo de dependencia. Usar
   secrets locales de prueba en un archivo ignorado; nunca sustituir el probe
   local por un deploy remoto.

### Cobertura conocida

| Superficie | Pruebas dirigidas |
| --- | --- |
| Calidad de `collect-analytics` | `npm test -- supabase/functions/collect-analytics/requestQuality.test.ts` |
| Retención vinculada a analítica | `npm test -- src/features/analytics/analyticsRetentionContract.test.ts` |
| Expiración de checkout | `npm test -- src/test/checkoutExpiration.test.ts` |
| Opciones server-side de producto | `npm test -- src/test/edgeProductConfig.test.ts` |
| Paridad de envío | `npm test -- src/test/shippingRateParity.test.ts` |

Estas pruebas no certifican por sí solas Auth, RLS, Storage, la API real de
Mercado Pago, webhooks ni idempotencia extremo a extremo. Las funciones admin,
return y webhook no tienen actualmente un test dedicado de entrypoint; para un
cambio de conducta necesitan `deno check` y probes locales de sus ramas
afectadas, o una prueba nueva si el contrato lo exige.

`npm run preflight` se reserva para el checkpoint final de un cambio nivel 3,
transversal o de contrato compartido. `npm run build` se suma sólo si también
cambia o se publicará el frontend. Un cambio backend específico no ejecuta por
defecto la suite ni el build frontend.

Todo dry-run, deploy, secret o probe remoto requiere el objetivo confirmado y
alcance autorizado según `AGENTS.md`; para pagos, seguir además
`docs/CHECKOUT_MERCADOPAGO.md`.

Última revisión contra fuentes locales: 2026-07-15.

# Funciones Edge

## Propósito

Aislar la lógica de servidor que requiere secretos, que realiza cobros, o que necesita privilegios administrativos (`service_role`) sin exponer estas claves en el frontend.

## Fuentes de verdad

- `supabase/functions/`: Código fuente en Deno para cada función Edge (ej. `admin-buyer-accounts`, `mercadopago-webhook`).

## Flujo o arquitectura

Las funciones se agrupan en dos ramas principales:

1. **Administración**: `admin-buyer-accounts`, `admin-manage-artisans`. Invocadas desde el panel de admin con tokens JWT. Ejecutan acciones privilegiadas.
2. **Pagos (Checkout)**: `create-mercadopago-checkout`, `expire-pending-checkouts`, `mercadopago-return`, `mercadopago-webhook`. Manejan la creación de preferencias de pago, callbacks asíncronos y caducidad de carritos abandonados.
3. **Analítica**: `collect-analytics` recibe métricas anónimas agregadas o eventos de cuentas consentidas. Es pública para admitir visitas sin sesión, pero valida una lista cerrada de payloads y comprueba JWT + consentimiento antes de guardar actividad individual.

## Reglas y decisiones vigentes

- **Secretos por Nombre**: Las funciones requieren secrets (ej. tokens de Mercado Pago o Service Role Keys) configurados en el proyecto de Supabase. Nunca se guardan sus valores en el código fuente, solo se referencian por nombre.
- **Despliegue Independiente**: Las funciones no se despliegan automáticamente con el frontend de Netlify; se deben desplegar con `supabase functions deploy [nombre]` hacia el proyecto Supabase activo.
- **Autenticación en llamadas**: La app frontend invoca estas funciones mandando el token JWT del usuario logueado. Las funciones validan este token antes de operar.
- **Excepción pública controlada**: `collect-analytics` usa `verify_jwt = false` para contar visitas sin cuenta. No confía en identidad enviada por el cliente; cuando se solicita seguimiento individual valida el JWT dentro de la función.
- **GeoIP opcional**: `IPINFO_TOKEN` habilita ciudad/región aproximadas. La IP se usa sólo en memoria y no se persiste.
- **Entrega idempotente**: `collect-analytics` exige un `event_id` por entrega y
  delega la escritura a RPC transaccionales. Sus logs técnicos sólo indican
  modo, resultado, razón y estado HTTP; no registran IP, ruta, usuario ni ID del
  evento.
- **Ciclo de sesión consentida**: `heartbeat` actualiza únicamente tiempo
  visible y `session_end` cierra la sesión en `pagehide`. Ambos requieren JWT y
  consentimiento, son idempotentes y no se guardan como eventos de negocio.

## Dependencias y límites externos

- **Deno**: Entorno de ejecución en Supabase Edge.
- **Mercado Pago**: Dependencia externa para las funciones de pago/checkout.

## Validación

- Comandos: Servir funciones localmente con `supabase functions serve` y probar invocándolas desde la UI local (asegurando tener el archivo `.env.local` adecuado y los secrets configurados para el entorno local).

## Riesgos y errores frecuentes

- Desplegar una función a producción sin haber seteado los *secrets* necesarios en el dashboard de Supabase (ej. `supabase secrets set ...`).
- Olvidarse de volver a desplegar la función tras realizar cambios en su código, asumiendo que el frontend lo haría solo.

## Mantenimiento

Debe actualizarse siempre que se agregue una nueva integración de un tercero (ej. un nuevo método de pago o CRM) que requiera de webhooks o secretos.

# Checkout y Mercado Pago

## Estado actual

- El canal público configurado en `src/config/marketplace.ts` es `whatsapp`.
- Mientras ese valor siga activo, las rutas y acciones de compra online quedan
  ocultas o redirigidas; el código de carrito/checkout permanece en el repo.
- El backend de checkout está implementado mediante Edge Functions, pero este
  documento no certifica que sus secrets o despliegues estén activos en producción.
- Los estados se guardan en `orders`, `order_items`, `payment_attempts` y
  `payment_webhook_events`.

## Funciones Edge

- `create-mercadopago-checkout`: vuelve a validar carrito, stock, opciones y
  dirección; crea orden/intento y solicita una preferencia.
- `mercadopago-return`: reconcilia el regreso del comprador.
- `mercadopago-webhook`: verifica eventos y actualiza pago/orden.
- `expire-pending-checkouts`: cancela intentos pendientes vencidos.

## Secrets requeridos

Los nombres admitidos están en `supabase/functions/.env.example`. Sus valores
pertenecen al entorno de Edge Functions, nunca al frontend ni al repositorio:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
APP_BASE_URL
WEBHOOK_BASE_URL
MERCADOPAGO_ENVIRONMENT
MERCADOPAGO_TEST_ACCESS_TOKEN
MERCADOPAGO_TEST_WEBHOOK_SECRET
MERCADOPAGO_PRODUCTION_ACCESS_TOKEN
MERCADOPAGO_PRODUCTION_WEBHOOK_SECRET
MERCADOPAGO_STATEMENT_DESCRIPTOR
PENDING_CHECKOUTS_CRON_SECRET
```

El código también admite nombres legacy de fallback para Mercado Pago, pero las
variables específicas de `test`/`production` son preferibles porque reducen el
riesgo de mezclar ambientes.

## Activación segura

1. Confirmar repo, rama y project ref mediante `docs/IDENTIDAD_PROYECTO.md`.
2. Verificar que las migraciones requeridas estén aplicadas al objetivo correcto.
3. Cargar secrets de prueba propios en ese proyecto, sin imprimir valores.
4. Desplegar sólo las funciones incluidas explícitamente en la tarea.
5. Configurar return/webhook URLs para el dominio correcto.
6. Ejecutar un checkout de prueba y revisar tablas, logs y firma del webhook.
7. Probar rechazo, cancelación, expiración, falta de stock e idempotencia.
8. Habilitar `salesChannel: "checkout"` únicamente después de la certificación.
9. Activar credenciales de producción en una tarea separada y explícita.

## Reglas de alto riesgo

- No desplegar ni cambiar secrets sin confirmar el proyecto objetivo.
- No colocar `service_role` ni tokens de Mercado Pago en variables `VITE_*`.
- No confiar en precios, modificadores o stock enviados por el navegador.
- No asumir que un deploy de Netlify actualiza Edge Functions o migraciones.
- No declarar checkout productivo basándose sólo en tests unitarios.

## Cobertura y pendientes

La suite local cubre vencimientos, opciones server-side, tarifas y parte de las
reglas del carrito. Todavía se requieren pruebas de integración aisladas para
creación completa de órdenes, RLS, aplicación de inventario, webhooks reales e
idempotencia antes de habilitar checkout público.

Última revisión: 2026-07-13.

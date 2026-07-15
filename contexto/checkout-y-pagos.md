# Checkout y pagos

## Propósito

Resumir los invariantes que conectan carrito, Mercado Pago, órdenes e
inventario. La activación, secretos y checklist operativo tienen una única
fuente propietaria:
[`docs/CHECKOUT_MERCADOPAGO.md`](../docs/CHECKOUT_MERCADOPAGO.md).

## Fuentes de verdad

- `src/config/marketplace.ts`: habilitación visible del canal.
- `src/features/buyer/checkoutClient.ts`: llamada desde el navegador.
- `supabase/functions/create-mercadopago-checkout/`,
  `mercadopago-return/`, `mercadopago-webhook/` y
  `expire-pending-checkouts/`: ciclo de vida remoto.
- `supabase/functions/_shared/checkout-expiration.ts` y
  `mercadopago-config.ts`: vencimiento y selección segura de ambiente.
- `supabase/functions/.env.example`: nombres vigentes de variables; no copiarlos
  a esta ficha.
- `supabase/migrations/20260527000016_016_buyer_cart_checkout_alignment.sql`,
  `supabase/migrations/20260527000017_017_cart_checkout_hardening.sql` y
  `supabase/migrations/20260527000018_018_partial_cart_checkout.sql`: órdenes,
  intentos, eventos, RLS e inventario.

## Estado actual

El canal público sigue en `salesChannel: "whatsapp"`. El backend de checkout
está implementado, pero el repositorio no demuestra por sí solo que funciones,
secrets, webhook o scheduler estén desplegados y operativos en producción. No
habilitar `"checkout"` sin completar la certificación de la fuente propietaria.

## Flujo vigente

1. `create-mercadopago-checkout` autentica al comprador y vuelve a leer
   preferencias, carrito, productos, opciones, precios y stock.
2. Crea `orders`, `order_items` y un `payment_attempt`; solicita la preferencia
   a Mercado Pago y asocia temporalmente el carrito mediante
   `converted_order_id`.
3. Esa creación no reserva ni descuenta inventario. El stock puede cambiar
   mientras el pago está pendiente.
4. `mercadopago-return` reconcilia el regreso consultando al proveedor y
   redirige a éxito, pendiente o fallo. El webhook procesa la notificación
   asíncrona.
5. Sólo un pago aprobado ejecuta `apply_paid_order_inventory`. La marca
   `order_items.stock_applied_at` evita volver a descontar el mismo ítem; los
   ítems comprados se eliminan del carrito y los no incluidos permanecen.
6. Un checkout pendiente vence a las 24 horas. La rutina cancela intento,
   orden e ítems pendientes y libera la referencia del carrito; no «devuelve»
   stock porque antes no hubo una reserva.
7. `expire-pending-checkouts` expone la rutina protegida por secret. El repo no
   contiene un schedule de `pg_cron` para esta función; el disparador operativo
   debe verificarse en el entorno objetivo.

## Seguridad e idempotencia

- Precio, opciones, entrega y stock se recalculan en backend.
- La firma del webhook se valida cuando el secret correspondiente está
  configurado. No describir esa condición como validación de origen ni asumir
  que está activa sin comprobar secrets y logs.
- `payment_webhook_events` deduplica eventos con identificador externo cuando
  está presente; la aplicación de inventario agrega su propia protección.
- Los secrets viven en Edge Functions. Nunca usar valores de otro marketplace,
  imprimirlos, versionarlos ni exponerlos como `VITE_*`.
- Un deploy frontend no aplica migraciones ni despliega funciones.

## Validación proporcional

- Vencimiento puro:
  `npm test -- src/test/checkoutExpiration.test.ts`.
- Presentación/cálculos del carrito:
  `npm test -- src/features/buyer/cartPageUtils.test.ts`.
- Edge Function o helper compartido: prueba explícita relacionada y
  check/probe local con runtime Deno cuando esté disponible.
- Tablas, RPC o RLS: `npm run audit:backend`, test de contrato explícito y
  Supabase local o staging aislado. Validar creación, rechazo, expiración,
  stock insuficiente, pago aprobado, retorno y webhook repetido.
- No ejecutar `npm run build` ni tests frontend completos por un cambio backend
  aislado. Escalar a `npm run preflight` sólo ante contrato compartido,
  tooling, impacto transversal o certificación integral.
- Ningún test unitario sustituye una integración con credenciales de prueba,
  firma real, logs y tablas del objetivo confirmado.

Última revisión: 2026-07-15.

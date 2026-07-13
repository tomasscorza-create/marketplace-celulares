# Checkout y pagos

## Propósito

Documentar la integración del proceso de compra, desde la validación del carrito hasta la resolución del pago vía Mercado Pago y la actualización del inventario y estado de la orden.

## Fuentes de verdad

- `docs/CHECKOUT_MERCADOPAGO.md`: Mapa detallado del estado de la implementación, secretos requeridos y arquitectura Edge.
- `src/features/buyer/`: Scripts del cliente web (ej. `checkoutClient.ts` que llama a las funciones remotas).
- `supabase/functions/`: Las 4 funciones responsables del ciclo de vida del pago (`create-mercadopago-checkout`, `mercadopago-return`, `mercadopago-webhook`, `expire-pending-checkouts`).

## Flujo o arquitectura

El ciclo de vida de un pago funciona de la siguiente manera:

1. El frontend valida el carrito activo y llama a la Edge Function `create-mercadopago-checkout`.
2. La función congela temporalmente una orden (crea un `payment_attempt` en estado pending) e inicia una "preferencia de pago" en la API de Mercado Pago, devolviendo el enlace generado (init point).
3. El comprador es redirigido fuera de la plataforma para pagar y luego retorna al frontend a través de la ruta procesada por la función `mercadopago-return`.
4. De manera asíncrona, Mercado Pago dispara un evento a `mercadopago-webhook`. La función valida el origen, procesa el payload y actualiza definitivamente las tablas `orders`, consumiendo el inventario (`apply_paid_order_inventory`).
5. Los carritos y órdenes abandonadas son limpiados o devueltos al inventario periódicamente por la función cron `expire-pending-checkouts`.

## Reglas y decisiones vigentes

- **Secretos centralizados**: Las credenciales de pago (`MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`) solo residen en los secretos cifrados del proyecto Supabase en la nube. El frontend desconoce la integración de pagos subyacente.
- **Idempotencia de webhooks**: La lógica en el webhook y la tabla `payment_webhook_events` garantizan que no se aplique dos veces el mismo pago (evitando, por ejemplo, descontar inventario doble).
- **Prohibición de reuso**: Está estrictamente prohibido usar las credenciales de producción de un marketplace anterior o ajeno para este entorno, ya que chocarían los ID de referencia de órdenes.

## Dependencias y límites externos

- **API de Mercado Pago**: Plataforma externa de cobro responsable de autorizar los pagos y enviar notificaciones.
- **Supabase Edge Functions y pg_cron**: Intermediario seguro y ejecutor de las reglas temporales.

## Validación

- Comandos: Uso de cuentas de test en Mercado Pago para emitir pagos falsos. Se requiere utilizar el CLI de Supabase o servicios como Ngrok para recibir los webhooks en el entorno de desarrollo local.
- Manual: Crear orden con tarjeta de prueba en Mercado Pago; asegurar que la tabla `orders` pasa a estado `paid` y el inventario público del vendedor disminuye.

## Riesgos y errores frecuentes

- Configurar erróneamente en el panel de Mercado Pago que el webhook apunte a `localhost` en un entorno de producción, perdiendo por completo las notificaciones asíncronas.
- Olvidarse de inyectar los secretos de cron (`PENDING_CHECKOUTS_CRON_SECRET`) al desplegar funciones o en local, rompiendo la expiración de inventario retenido (deadlock de stock).

## Mantenimiento

Actualizar este archivo obligatoriamente si se integran nuevas pasarelas (ej. Stripe, Mobbex, TodoPago) o si cambian los nombres de las funciones Edge responsables del flujo de la orden.

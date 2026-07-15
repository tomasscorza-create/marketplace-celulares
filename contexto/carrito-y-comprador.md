# Carrito y comprador

## Propósito

Documentar el carrito autenticado, su validación y la lectura de pedidos desde
la perspectiva del comprador, sin duplicar el flujo del proveedor de pagos.

## Fuentes de verdad

- `src/config/marketplace.ts`: canal de venta visible.
- `src/features/buyer/cartClient.ts` y `cartQueries.ts`: persistencia,
  validación, caché y mutaciones optimistas.
- `src/pages/BuyerCartPage.tsx`: recorrido del carrito y comienzo del checkout.
- `src/features/buyer/buyerClient.ts` y `buyerQueries.ts`: cuenta e historial.
- `src/types/commerce.ts`: contratos compartidos de carrito y órdenes.
- `supabase/migrations/20260527000016_016_buyer_cart_checkout_alignment.sql`,
  `supabase/migrations/20260527000017_017_cart_checkout_hardening.sql` y
  `supabase/migrations/20260527000018_018_partial_cart_checkout.sql`: tablas,
  RLS y alineación del checkout.

## Estado actual

`marketplaceConfig.salesChannel` está configurado en `"whatsapp"`. Mientras
siga así, las acciones públicas de carrito y checkout permanecen ocultas o
redirigidas aunque su código y backend continúen en el repositorio. No confundir
implementación disponible con canal habilitado en producción.

## Flujo vigente

1. Sólo una sesión con rol comprador puede crear o modificar su carrito. No hay
   carrito anónimo ni merge de un carrito local al iniciar sesión.
2. `carts` conserva como máximo un carrito activo por comprador y `cart_items`
   guarda snapshots útiles para presentar cada selección.
3. React Query carga el estado remoto y aplica actualizaciones optimistas antes
   de reconciliar la respuesta. No existe una suscripción Supabase Realtime del
   carrito.
4. La validación vuelve a leer producto, tienda, precio, opciones,
   disponibilidad, stock y preferencias de entrega; los snapshots del cliente
   no son autoridad comercial.
5. Cuando checkout está habilitado, la Edge Function vuelve a validar y crea la
   orden sólo con ítems aptos. Los ítems no incluidos permanecen en el carrito.
6. Tras un pago aprobado, el comprador consulta `orders` y `order_items` desde
   su panel y detalle de pedido.

## Contratos de seguridad

- El navegador nunca decide el importe final ni descuenta stock.
- RLS limita carrito y preferencias al comprador propietario o a un admin.
  Órdenes e ítems también son legibles por admin y por el vendedor relacionado;
  no describir esas políticas como exclusivas del comprador.
- El checkout no reserva inventario al crear la preferencia. El descuento
  atómico ocurre después de confirmar el pago.
- La integración de Mercado Pago pertenece a
  [`checkout-y-pagos.md`](checkout-y-pagos.md).

## Validación proporcional

- Utilidades de presentación o cálculo del carrito:
  `npm test -- src/features/buyer/cartPageUtils.test.ts`.
- Cambios en `cartClient.ts`, queries o página: test relacionado si Vitest
  encuentra cobertura, ESLint sobre los archivos afectados, typecheck y QA con
  una cuenta comprador. Si no se encuentra un test, declararlo; no asumir que
  la caché o RLS quedaron cubiertas.
- Cambios de tablas/RLS/checkout: prueba explícita del contrato,
  `npm run audit:backend` y recorrido en Supabase local o staging aislado.
- `npm run build` sólo ante cambios de imports, assets, bundle o publicación
  frontend.

## QA manual mínimo

Con `salesChannel: "checkout"` únicamente en un entorno aislado: agregar,
incrementar, reducir y quitar un producto; cambiar una opción; provocar cambio
de precio o falta de stock; recargar y comprobar persistencia remota; verificar
que sólo los ítems aprobados lleguen a la orden. No usar producción para este
recorrido sin alcance autorizado.

Última revisión: 2026-07-15.

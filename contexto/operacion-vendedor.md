# Operación del vendedor

## Propósito

Guiar las capacidades de los vendedores (internamente `artisan`) para gestionar
su tienda, productos, disponibilidad, stock y ventas.

## Fuentes de verdad

- `src/features/artisan/artisanClient.ts`: alta y actualización de productos, perfiles y medios.
- `src/features/artisan/artisanProductValidation.ts`: reglas locales antes de guardar.
- `src/pages/ArtisanProductsPage.tsx`: orquestación del listado y formulario.
- `supabase/migrations/20260527000016_016_buyer_cart_checkout_alignment.sql`: aplicación atómica de inventario pagado.
- `supabase/migrations/20260713120000_remove_product_batches.sql`: retiro definitivo del modelo anterior de lotes.

## Flujo o arquitectura

1. El vendedor accede a `/panel/vendedor` con rol técnico `artisan`.
2. Puede editar tienda, imágenes y datos públicos.
3. Crea o actualiza una fila de `public.products`, incluyendo
   `availability_mode`, `stock_quantity` o `lead_time_days` según corresponda.
4. El carrito y la Edge Function de checkout vuelven a consultar disponibilidad
   y stock antes de crear la orden.
5. Cuando un pago se confirma, `apply_paid_order_inventory` descuenta de forma
   atómica las cantidades de productos con `availability_mode = 'stock'`.
6. El vendedor gestiona la preparación de sus `order_items` desde ventas.

## Reglas y decisiones vigentes

- `product_batches` y las RPC `create_product_batch`, `update_product_batch` y
  `delete_product_batch` ya no forman parte del esquema final.
- El stock disponible vive en `products.stock_quantity`; los productos a pedido
  usan `lead_time_days` y pueden tener opciones de producción.
- La UI nunca es la autoridad final para stock: carrito, checkout y la RPC de
  aplicación de inventario deben volver a validarlo.
- RLS y Storage deben limitar escrituras al propietario o a un administrador.
- Un producto activo sólo aparece públicamente si el vendedor también es visible.

## Dependencias y límites externos

- Supabase Database y RLS para productos y ventas.
- Bucket `artisan-product-images` para fotos y medios permitidos.
- Edge Functions y Mercado Pago sólo cuando el canal de checkout esté habilitado.

## Validación

- `npm test`: valida reglas locales de producto y contratos de checkout.
- `npm run audit:backend`: confirma que el código no dependa de tablas/RPC retiradas.
- Manual/local: crear un producto con stock, validar límites en carrito y probar
  el descuento al confirmar un pago dentro de Supabase local o staging aislado.

## Riesgos y errores frecuentes

- Reintroducir lotes porque aparecen en migraciones históricas.
- Confiar únicamente en el valor mostrado por React para autorizar una compra.
- Descontar stock desde el navegador en lugar de usar el flujo atómico posterior al pago.

## Mantenimiento

Actualizar cuando cambien disponibilidad, inventario, permisos de vendedor o
procesamiento de ventas. Última revisión: 2026-07-13.

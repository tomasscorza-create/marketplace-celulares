# Operación del vendedor

## Propósito

Documentar la gestión de tienda, productos, disponibilidad y preparación de
ventas para el rol técnico `artisan`.

## Fuentes de verdad

- `src/features/artisan/artisanClient.ts` y `artisanQueries.ts`: persistencia,
  consultas, ventas y fulfillment.
- `src/features/artisan/useArtisanProductSubmit.ts` y
  `artisanProductValidation.ts`: preparación y validación del producto.
- `src/pages/ArtisanProductsPage.tsx`: formulario compartido por vendedor y
  admin que actúa sobre un vendedor objetivo.
- `src/features/categorySpecs/`: plantilla compartida y snapshots de
  especificaciones.
- `supabase/migrations/20260713120000_remove_product_batches.sql`: retiro de
  lotes y RPC públicas vigentes.
- `supabase/migrations/20260713150000_category_spec_templates.sql`: plantillas y
  valores por producto.
- `supabase/migrations/20260527000016_016_buyer_cart_checkout_alignment.sql`:
  aplicación atómica de inventario pagado.

## Flujo vigente

1. El vendedor entra por `/panel/vendedor` con rol `artisan` y administra su
   perfil público.
2. Crea o actualiza una fila de `products`, fotos y modelo opcional. Cuando un
   admin usa el mismo flujo, debe pasar el vendedor objetivo y conservar su
   propiedad.
3. `availability_mode = "stock"` usa `stock_quantity`;
   `"made_to_order"` usa `lead_time_days` y puede incluir opciones.
4. La plantilla de categoría sólo guía el formulario. El producto guarda su
   propio snapshot en `category_spec_values`; cambiar de categoría descarta los
   valores anteriores.
5. Si el canal checkout se habilita, carrito y Edge Function vuelven a leer
   disponibilidad, opciones, precio y stock. Con el canal actual
   `"whatsapp"`, esa compra online permanece oculta.
6. Tras un pago aprobado, `apply_paid_order_inventory` descuenta una sola vez
   los productos con stock. El vendedor gestiona el fulfillment de sus
   `order_items` mediante el RPC compartido.

## Contratos duraderos

- `product_batches` y las RPC `create_product_batch`,
  `update_product_batch` y `delete_product_batch` son historia, no contratos
  vigentes.
- La UI no autoriza stock, precio ni pago; el backend vuelve a validarlos.
- RLS y Storage limitan escrituras al propietario o a un admin.
- Fotos y modelos viven bajo la carpeta del vendedor en
  `artisan-product-images`. Ver
  [`visor-3d-y-medios.md`](visor-3d-y-medios.md).
- Un producto sólo es público si está activo y el vendedor no está oculto.
  El catálogo público se documenta en
  [`catalogo-y-productos.md`](catalogo-y-productos.md).

## Validación proporcional

- Reglas locales de producto:
  `npm test -- src/features/artisan/artisanProductValidation.test.ts`.
- Hook, cliente, formulario o query: test relacionado si existe, ESLint sobre
  los archivos afectados, typecheck para lógica/tipos/JSX y QA del recorrido.
- Inventario, RLS, Storage o RPC: contrato explícito,
  `npm run audit:backend` y prueba en Supabase local o staging aislado.
- No ejecutar la suite completa por copy, estilo o una validación local
  acotada. Escalar según `AGENTS.md`.
- `npm run build` sólo ante imports, assets, PWA, bundle o publicación
  frontend.

## QA manual mínimo

Crear y editar un producto de stock y otro a pedido; cambiar de categoría;
comprobar snapshots, límites y ruta de medios. En un entorno con checkout
aislado, confirmar que sólo un pago aprobado descuenta stock y que el vendedor
sólo ve y actualiza sus propios ítems.

Última revisión: 2026-07-15.

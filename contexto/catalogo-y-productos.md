# Catálogo y productos

## Propósito

Documentar sólo el contrato de descubrimiento público: qué productos pueden
aparecer, cómo se consultan y qué estado debe conservar la URL. El alta,
inventario y medios se mantienen en sus fichas de dominio.

## Fuentes de verdad

- `src/pages/CatalogPage.tsx`: estado de URL y composición de la experiencia.
- `src/features/public/useCatalogPageData.ts` y `catalogPageUtils.ts`:
  orquestación y composición de las colecciones visibles.
- `src/features/public/publicClient.ts` y `publicQueries.ts`: RPC, paginación y
  caché de consultas.
- `supabase/migrations/20260715090000_catalog_search_product_attributes.sql`:
  definición vigente de los RPC públicos de catálogo.
- `src/pages/ProductDetailPage.tsx`: lectura pública del producto y de su
  snapshot de especificaciones.

## Flujo vigente

1. `CatalogPage` obtiene `q`, `categoria`, `orden` y `pagina` desde
   `URLSearchParams`.
2. `useCatalogPageData` resuelve categorías, feed paginado, sugerencias de
   tiendas y, cuando corresponde, contenido personalizado.
3. `publicClient.ts` consulta los RPC vigentes; el frontend compone vitrinas y
   páginas sin convertir datos ocultos en productos públicos.
4. La URL se actualiza al buscar, filtrar, ordenar o paginar, por lo que una
   recarga o enlace compartido conserva el estado de exploración.

## Contratos duraderos

- El feed público exige `products.is_active = true`, perfil con rol `artisan` y
  `storefront_hidden_at is null`.
- Un producto activo con `stock_quantity = 0` puede seguir apareciendo. La
  disponibilidad se comunica en la UI y se vuelve a validar en carrito y
  checkout cuando ese canal está habilitado.
- «Para ti» sólo se renderiza cuando la colección personalizada contiene al
  menos seis productos válidos.
- Búsqueda, categoría, orden y página pertenecen a la URL; no moverlos a estado
  exclusivamente local.
- El detalle puede mostrar `products.category_spec_values`, que es el snapshot
  guardado con el producto, no una lectura en vivo de la plantilla actual.
- Promociones, carga de productos y medios 3D tienen fuentes propias:
  [`promociones-del-catalogo.md`](promociones-del-catalogo.md),
  [`operacion-vendedor.md`](operacion-vendedor.md) y
  [`visor-3d-y-medios.md`](visor-3d-y-medios.md).

## Dependencias y límites

Los RPC y RLS son parte del contrato del catálogo. Si cambia una columna
seleccionada, deben revisarse juntos migración, tipos y normalización del
cliente. Las migraciones anteriores pueden describir firmas históricas y no
reemplazan al RPC vigente.

## Validación proporcional

- Texto o documentación: revisar enlaces y ejecutar `git diff --check`; sumar
  `npm run audit:encoding` si corresponde.
- Lógica localizada: ESLint sobre los archivos afectados, typecheck cuando
  cambien tipos/imports/JSX y QA del filtro o página modificados.
- RPC, columnas o visibilidad: test de contrato explícito si existe,
  `npm run audit:backend` y prueba local de los casos activo, oculto, sin stock
  y filtro por categoría. Actualmente no hay una suite específica del catálogo
  general; no atribuirle cobertura automática.
- Ejecutar `npm run build` sólo si cambian imports lazy, assets, configuración
  de bundle/PWA o se prepara una publicación frontend.

## QA manual mínimo

Abrir una URL con `q`, `categoria`, `orden` y `pagina`; recargar; cambiar cada
control; verificar paginación y confirmar que un vendedor oculto o un producto
inactivo no aparezcan.

Última revisión: 2026-07-15.

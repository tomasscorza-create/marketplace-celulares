# Catálogo y productos

## Propósito

Regir la forma en que los productos son obtenidos, mostrados y filtrados en la tienda pública, además de las utilidades subyacentes de la gestión de productos por los vendedores.

## Fuentes de verdad

- `src/features/public/`: Lógica de carga del catálogo público (`useCatalogPageData.ts`), filtrado, utilidades visuales y componentes (ej. `CatalogProductFeedCard`).
- `src/features/artisan/`: Gestión del lado del artesano, edición rápida, publicación y validación.
- `src/pages/CatalogPage.tsx`: Ensambla la UI de exploración, paginación, filtros y la sección de vitrinas o *showcases*.

## Flujo o arquitectura

El catálogo público funciona así:

1. `CatalogPage` usa estado alojado en la URL (vía `searchParams`) para sincronizar `q` (búsqueda), `categoria` y `orden`.
2. Llama al hook `useCatalogPageData` que consolida búsquedas de categorías, vitrinas personalizadas y el feed paginado.
3. El frontend divide los productos en grillas o filas para revelarlos con micro-animaciones (componente `RevealSequenceGroup`).
4. Existen modos adaptativos: El catálogo ajusta su carga y layout respondiendo a *lazy scrolling* (solicita secciones secundarias u oscuras al interceptar un centinela).

## Reglas y decisiones vigentes

- **Visibilidad estricta**: El catálogo público exige productos activos y vendedores con rol `artisan` no ocultos. El stock se muestra y se vuelve a validar en carrito/checkout; el RPC de catálogo vigente no excluye por sí solo un producto activo con `stock_quantity = 0`.
- **Búsqueda guiada por URL**: Todos los filtros (búsqueda, página, orden) deben reflejarse en la URL (`URLSearchParams`) para mantener enlaces compartibles.
- **Modelos 3D**: Son opcionales. Las tarjetas manejan de forma segura que un producto no tenga archivos GLB/GLTF.
- **Grillas reactivas**: Se decide la cantidad de columnas no solo mediante media queries, sino por un estado de React evaluando el ancho de la ventana al cargar y redimensionar.

## Dependencias y límites externos

- **Consultas de Supabase**: Se depende fuertemente de funciones SQL, RPC y RLS en el backend para realizar ordenamientos y filtrados eficientes que no traigan datos masivos al cliente.

## Validación

- Comandos: `npm run build`.
- Manual: Navegar al catálogo, filtrar por una categoría, realizar una búsqueda textual y probar cambiar de página. Recargar para comprobar persistencia de la URL.

## Riesgos y errores frecuentes

- Modificar el esquema de la tabla de productos sin sincronizar las queries de selección (`select()`) usadas en el frontend, lo cual causa que falten datos.
- Desesperarse porque un producto recién creado no aparece en el catálogo: revisar primero `is_active`, el rol/visibilidad del vendedor y la respuesta del RPC antes de atribuir el fallo a la UI.

## Mantenimiento

Se debe actualizar si cambian los algoritmos de filtrado, el modelo principal de productos (como el agregado de variantes/talles) o la forma de manejar la paginación de la UI principal.

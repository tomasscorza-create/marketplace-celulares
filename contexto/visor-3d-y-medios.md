# Visor 3D y Medios

## Propósito
Definir cómo se guardan y renderizan en frontend los elementos multimedia pesados, especialmente los archivos de modelos 3D interactivos (`.glb`/`.gltf`).

## Fuentes de verdad
- `docs/PRODUCT_3D_PREVIEW.md`: Reglas originales, límites de la tecnología y formato esperado de guardado JSON.
- `src/features/public/components/ProductModel3DViewer.tsx`: Componente de React que implementa la cámara de WebGL (Three.js).
- `src/features/public/components/CatalogProduct3DPreviewSlot.tsx`: Contenedor "fallback" que decide si inyectar 3D dinámicamente o quedarse con la foto plana.
- `src/pages/ProductDetailPage.tsx`: Consume el mismo `ProductModel3DViewer` en el detalle de producto, integrado como un slide más dentro de la misma galería/carrusel de fotos.

## Flujo o arquitectura
La plataforma permite no sólo exhibir fotos, sino Modelos 3D interactivos.
1. La tabla `products` guarda los metadatos de archivos en un campo JSONB llamado `product_media`.
2. El catálogo detecta en tiempo de ejecución si el ítem tiene `type: "model_3d"`.
3. Si lo tiene, y **sólo cuando** entra al área visible de la pantalla (viewport), se descarga la librería 3D pesada (Three.js) de forma dinámica (`lazy`) y se inicializa el modelo `.glb`.
4. Si no tiene 3D o carga lento, se usa una imagen estática (`poster_url`) como esqueleto CSS.

## Reglas y decisiones vigentes
- **Carga Diferida Estricta**: Está prohibido empaquetar librerías de 3D en el *bundle* inicial principal de React, para no ralentizar el inicio del sitio en móviles.
- **Sin precache 3D**: `three-vendor` tampoco forma parte del precache PWA. Se
  descarga al abrir una experiencia 3D y recién entonces puede quedar en la
  caché runtime de assets. `npm run build` audita esta exclusión.
- **Fallback obligatorio**: Todo modelo 3D debe venir siempre acompañado de una imagen de pre-visualización estática (`poster_url`).
- **Formato recomendado**: El formato estándar en los buckets de almacenamiento será `.glb` de poco peso (ideal < 3MB).
- **Galerías de imágenes ignoran el ítem 3D**: `getProductImageMediaItems` (de
  `src/types/productMedia.ts`) es la única forma correcta de armar una lista de
  fotos a partir de `product_media`. Cualquier vista que construya su propia
  galería debe filtrar con esa función en vez de usar `product_media`
  directamente, porque la URL del modelo `.glb` no es una imagen renderizable.
- **Badge "3D" en tarjetas con foto**: `src/features/public/components/Catalog3DBadge.tsx`
  es un badge flotante (esquina superior derecha) que se muestra en las
  tarjetas de catálogo que exhiben la foto de un producto (`CatalogProductFeedCard`,
  `CatalogStorefrontProductCard`) cuando ese producto también tiene un modelo
  3D cargado. Señala al usuario que existe una vista 3D disponible en el
  detalle, aunque en ese lugar del catálogo se esté mostrando la foto y no el
  visor interactivo. No se usa en `CatalogProduct3DPreviewSlot`, porque ese
  componente ya muestra el visor 3D directamente.
- **Un solo componente de visor para todos los sitios**: tanto el catálogo
  (`CatalogProduct3DPreviewSlot`) como el detalle de producto
  (`ProductDetailPage`) importan directamente `ProductModel3DViewer` sin
  duplicar su lógica de carga, cámara o controles. Cualquier mejora al visor
  (nuevos controles, mejor iluminación, otro loader) se hace una sola vez en
  `ProductModel3DViewer.tsx` y se propaga a ambos lugares. Al agregar un nuevo
  sitio que deba mostrar el modelo 3D, importar este mismo componente en vez
  de reimplementar la carga de Three.js.
- **El modelo 3D es un slide más de la galería, no una sección aparte**: en
  `ProductDetailPage.tsx` el modelo 3D ocupa el último índice de la misma
  galería que las fotos (`model3DSlideIndex = productImages.length`). Las
  mismas flechas prev/next y la misma tira de miniaturas navegan entre fotos
  y el modelo 3D; al llegar a ese índice, el contenedor de la imagen
  intercambia `ProductImageCarousel` por `ProductModel3DViewer` en el mismo
  lugar visual. La miniatura del modelo usa el `poster_url`/`thumbnail_url`
  del propio modelo (o la primera foto como respaldo) con el
  `Catalog3DBadge` superpuesto para distinguirla. No se modificó
  `ProductImageCarousel.tsx` (es genérico y lo usan otras vistas
  solo-imagen); la mezcla foto/3D vive únicamente en `ProductDetailPage.tsx`.
- **Fondo de cuadrícula del visor**: `ProductModel3DViewer.tsx` dibuja una
  cuadrícula lila/azul muy fina (`VIEWER_GRID_BACKGROUND_STYLE`) como capa
  `z-0`, siempre detrás del `<canvas>` de Three.js (`z-10`) y del poster
  (`z-[1]`). Usa una máscara radial para que el centro quede más claro/limpio
  y el degradado se intensifique hacia los bordes. Como el renderer tiene
  `alpha: true`, la cuadrícula solo se ve alrededor del modelo, nunca encima:
  si se cambia el fondo del visor a futuro, mantener el z-index del canvas
  por encima de esta capa para no tapar el objeto 3D.

## Dependencias y límites externos
- **Three.js** y **React Three Fiber**: Motores WebGL subyacentes encargados de las luces, texturas y rotaciones de cámara.

## Validación
- Automática: `npm run build` debe terminar con `PWA precache audit passed` y no listar `three-vendor` en el manifiesto de precache.
- Manual: Subir un `.glb` pequeño desde el editor de productos y comprobar en el catálogo público que se inicializa un visualizador arrastrable.

## Riesgos y errores frecuentes
- Desarmar la envoltura asíncrona (`Suspense` o import dinámico) de Three.js. Al hacerlo, todos los usuarios descargarían ~1MB extra de JS aunque los productos no tengan soporte 3D, derrumbando el score de rendimiento (Lighthouse).
- Asumir mal el formato JSON del array de medios, lo que provoca que React rompa la vista de catálogo.
- (Corregido 2026-07-13) `src/pages/ProductDetailPage.tsx` armaba la galería de
  fotos del detalle de producto leyendo `product_media` sin filtrar el ítem
  `model_3d`, por lo que la URL del `.glb` se pasaba a un `<img>` y rompía una
  miniatura del carrusel. Ahora usa `getProductImageMediaItems`. Si se agrega
  una vista nueva que muestre fotos de producto, repetir ese mismo filtro.
- El bucket `artisan-product-images` no impone tamaño ni MIME type a nivel de
  Storage; la validación de extensión (`.glb`/`.gltf`) y de 8MB en
  `useArtisanProductModel3D.ts` es solo del lado del cliente. Pendiente de
  endurecer si se prioriza la fase 2 de `docs/PRODUCT_3D_PREVIEW.md`.

## Mantenimiento
Actualizar si la dependencia a Three.js se sustituye por etiquetas nativas modernas (ej. `<model-viewer>` de Google) o si se agregan proyecciones AR nativas (Realidad Aumentada) a futuro.

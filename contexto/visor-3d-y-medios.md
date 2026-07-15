# Visor 3D y medios

## Propósito

Definir el contrato de medios de producto y los límites de carga 3D sin
convertir esta ficha en una copia de detalles visuales del componente.

## Fuentes de verdad

- `src/types/productMedia.ts`: tipos, detección y separación entre imágenes y
  modelos.
- `src/features/artisan/useArtisanProductModel3D.ts`,
  `useArtisanProductSubmit.ts` y `artisanClient.ts`: selección, metadatos,
  upload y ruta Storage.
- `src/features/public/components/ProductModel3DViewer.tsx`: visor compartido y
  carga lazy de Three.js.
- `CatalogProduct3DPreviewSlot.tsx` y `src/pages/ProductDetailPage.tsx`:
  integración en catálogo y galería.
- `vite.config.ts` y `scripts/audit-pwa-precache.mjs`: chunk y política PWA.
- `docs/PRODUCT_3D_PREVIEW.md`: antecedentes y fases futuras; el código anterior
  es la autoridad del comportamiento actual.

## Contrato de datos y carga

- `products.product_media` es un array JSONB de imágenes y, opcionalmente, un
  elemento `model_3d`. `type: "model_3d"` es la señal preferida; URLs
  `.glb`/`.gltf` también se reconocen por compatibilidad.
- Las galerías obtienen fotos mediante `getProductImageMediaItems`. No deben
  pasar la URL de un modelo a `<img>`.
- El formulario acepta manualmente `.glb` o `.gltf` de hasta 8 MB y sube el
  archivo a `artisan-product-images/{artisanId}/models/`.
- `poster_url` y `thumbnail_url` son opcionales. Al subir un modelo, el flujo
  intenta usar la primera imagen recién preparada; el visor debe seguir
  funcionando con fallback aunque no exista poster.
- El formulario conserva un único modelo principal y
  `getPrimaryProductModel3D` toma el primero reconocido. No generar modelos a
  partir de fotos ni agregar múltiples visores por inferencia.

## Render y rendimiento

- Catálogo y detalle reutilizan `ProductModel3DViewer`; no duplicar loader,
  cámara o controles.
- El detalle integra el modelo como un slide de la misma galería. Las tarjetas
  con foto pueden usar `Catalog3DBadge` para indicar que el detalle tiene 3D.
- Three.js, `GLTFLoader`, `OrbitControls` y `MeshoptDecoder` se importan
  dinámicamente cuando el visor entra al viewport.
- `three-vendor` no pertenece al bundle inicial ni al precache PWA; puede entrar
  en la caché runtime después de usarse.
- Si no hay modelo, falla la carga o el dispositivo usa modo liviano, el
  catálogo debe conservar una experiencia utilizable.

## Seguridad y límites pendientes

- La extensión y el límite de 8 MB se validan sólo en el cliente.
- El bucket actual no impone por sí mismo MIME/tamaño para modelos. Endurecer
  Storage requiere una migración o política nueva y validación local; no asumir
  que el formulario protege escrituras externas.
- La carpeta siempre pertenece al vendedor objetivo, incluso cuando carga un
  admin.

## Validación proporcional

- Tipo/helper o formulario: test relacionado si existe, ESLint sobre el archivo
  y typecheck. Actualmente no hay tests 3D específicos; declararlo.
- Visor: QA manual con modelo válido, modelo ausente, error de carga, mouse,
  touch, teclado y modo liviano.
- Imports de Three, chunking, runtime cache o PWA: ejecutar
  `npm run build` una vez; ya incluye typecheck y `audit:pwa`. Confirmar que
  `three-vendor` no aparece en precache.
- Storage o metadatos SQL: `npm run audit:backend` y prueba en pila local
  identificada.

Última revisión: 2026-07-15.

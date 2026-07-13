# Auditoría del sistema de carga de productos

> Documento histórico de diagnóstico y ejecución. Las secciones iniciales
> describen el sistema anterior; no son instrucciones vigentes. El estado final
> está en las conclusiones de esta auditoría, en
> `20260713120000_remove_product_batches.sql` y en el mapa generado
> `docs/BACKEND_MAP.md`.

> Fecha: 2026-07-13. Documento pensado como mapa de contexto para agentes (Codex)
> que necesiten trabajar sobre esta zona. Refleja el estado del código en `main`
> (commit `26ba260`). Si el código cambió desde entonces, verificar antes de asumir.

## 1. Resumen ejecutivo

El sistema de carga de productos es la zona más densa del frontend: un solo flujo
combina **formulario de producto individual, modo lote (un producto por foto),
editor de recortes de imagen, compresión client-side, subida a Supabase Storage,
borradores persistidos en IndexedDB, defaults aprendidos del historial del vendedor,
modo admin-gestionando-vendedor y modelos 3D**. Todo esto vive bajo el feature
`src/features/artisan/` — el nombre "artisan" es **herencia del marketplace artesanal
original**; hoy significa "vendedor". No renombrar sin un plan global: el nombre está
acoplado a tablas (`products.artisan_id`), buckets, RPCs y rutas.

El estado general es **funcional y razonablemente ordenado** (la lógica está extraída
en hooks/utils testeables), pero el orquestador (`ArtisanProductsPage.tsx`, ~1.585
líneas, ~30 useState) concentra demasiadas máquinas de estado simultáneas y hay
varias trampas no obvias documentadas en la sección 6.

## 2. Mapa de archivos (quién hace qué)

### Frontend — flujo de carga

| Archivo | Rol |
| --- | --- |
| `src/pages/ArtisanProductsPage.tsx` | Orquestador. Todo el estado de UI: formulario, drafts de imágenes, crop, borradores, modales, paginación, modo admin. |
| `src/features/artisan/useArtisanProductSubmit.ts` | Hook de submit. Valida → sube imágenes/miniaturas/modelo 3D → crea/actualiza producto o lote → limpieza. Es el corazón transaccional. |
| `src/features/artisan/artisanClient.ts` | Capa de acceso a Supabase: CRUD de products/batches, subida a Storage con reintento, RPCs de lote, sync secundario de atributos/opciones. |
| `src/features/artisan/artisanQueries.ts` | Hooks React Query (queries + mutations). Las mutations invalidan cachés privadas **y públicas** (catálogo, storefront, feed). |
| `src/features/artisan/artisanProductValidation.ts` | Validación client-side previa al submit (título ≥4, precio >0, stock/lead time según modo, grupos de opciones, ≥1 foto). |
| `src/features/artisan/productDraftUtils.ts` | Serialización/hidratación de drafts de imagen (blobs ↔ IndexedDB), crop por defecto, resolución de datos por-foto vs formulario base. |
| `src/features/artisan/artisanProductsPageUtils.ts` | Constantes (páginas de 24/12, **máx. 15 imágenes por carga**), form inicial, resolución de imagen primaria y URLs almacenadas. |
| `src/features/artisan/artisanProductLearning.ts` | "Learning profile": analiza hasta 120 productos previos del vendedor y sugiere categoría, precio, modo de disponibilidad, atributos. |
| `src/features/artisan/imageEditorTypes.ts` | Tipo `ProductImageDraft` (el objeto central de todo el flujo de imágenes). |
| `src/lib/compressImage.ts` | Compresión y recorte en canvas. Presets: imagen principal 1280px / 2 MB / q0.76; miniatura 520px / 320 KB / q0.68. Aspectos `square` y `portrait`. |
| `src/lib/browser/productDraftStorage.ts` | Wrapper de IndexedDB (DB `neutral-marketplace-product-drafts`) para persistir borradores, incluidos los blobs de imagen. |

### Componentes de UI

- `components/ArtisanProductFormSection.tsx` (~1.085 líneas): el formulario completo — campos base, atributos, opciones bajo demanda, toggle "un producto por foto", campo de modelo 3D.
- `components/ProductImagesField.tsx`: grilla de imágenes, drag & drop, bulk picker.
- `components/ArtisanProductsCropController.tsx` + `ProductImageCropModal.tsx`: modal de recorte (offset/zoom por arrastre de puntero; el drag vive en la página).
- `components/ArtisanProductListSection.tsx`: listado de gestión con búsqueda y paginación.
- `components/ArtisanProductsConfirmModals.tsx`: confirmaciones de borrado y de creación de lote.

### Backend (Supabase)

- Tablas: `products` (con columnas legacy `image_url`, `image_urls` **y** la fuente moderna `product_media` jsonb), `product_batches`, `categories`.
- RPCs `security definer` en `supabase/migrations/20260527000015_015_product_batches.sql`: `create_product_batch`, `update_product_batch`, `delete_product_batch`. Validan `auth.uid()` = artisan o admin. La creación/edición de lotes es **atómica en el servidor**.
- Storage: bucket `artisan-product-images` (subcarpetas por `artisanId`, `thumbs/` para miniaturas, `models/` para 3D). Migración `020_product_image_retention.sql`: **los clientes no pueden borrar objetos del bucket** (política de delete eliminada; append-only intencional).

## 3. Flujo de creación (camino feliz)

1. Usuario completa formulario. Cada cambio dispara el **autosave de borrador** a IndexedDB (efecto en `ArtisanProductsPage.tsx:375`), incluyendo los blobs de las fotos.
2. Selección de imágenes: bulk (hasta 15, sin abrir crop) o reemplazo individual (abre crop automáticamente). Cada imagen es un `ProductImageDraft` con object URL de preview.
3. Submit (`useArtisanProductSubmit`):
   - Validación client-side (`validateArtisanProductDraft`). Si falla, corta antes de subir nada.
   - `uploadProductMedia`: por cada imagen nueva/editada sube **secuencialmente** hasta 3 archivos: original sin comprimir, versión comprimida (1280px) y miniatura (520px). Las imágenes existentes sin editar se reutilizan sin re-subir.
   - Si hay modelo 3D (`.glb`/`.gltf`, máx. 8 MB), se sube a `models/`.
   - **Modo normal**: `createProduct`/`updateProduct` → insert/update directo en `products` con `product_media` + espejo legacy `image_url`/`image_urls`.
   - **Modo lote** (`splitProductsByImage`): pide confirmación en modal, arma `ProductBatchInput` (un item por foto, con datos por-foto opcionales vía `useCustomProductData`) y llama al RPC. Después del RPC corren dos syncs secundarios no atómicos (`syncArtisanBatchProductAttributes`, `syncArtisanBatchProductOptions`).
4. Éxito → mutation de React Query invalida cachés privadas y públicas → `finalizeSuccessfulSave` resetea formulario y borra el borrador de IndexedDB.
5. Error de subida → se intenta rollback de los archivos ya subidos con `removeArtisanProductImages`… **que es un no-op** (ver 6.1).

## 4. Flujo de edición

- Producto individual: `startEditing` reconstruye drafts desde `product_media` (cargando dimensiones vía `loadImage`, con fallback si la imagen no carga). Guarda `editingOriginalImageUrls` para detectar imágenes quitadas al guardar.
- Lote: `startEditingBatch` puede necesitar paginar (`getArtisanBatchProducts`, páginas de 200) si el lote no está completo en memoria. Marca `useCustomProductData` por producto comparando contra los valores `*_base` del lote.
- Deep-link: `?mode=edit&productId=...` dispara un efecto que busca el producto (en cache o por id) y entra al modo edición correspondiente (producto o lote).
- Modo admin: ruta con `:artisanId` + rol admin → `targetArtisanId` pasa a ser el vendedor gestionado; todo el flujo funciona igual (las políticas RLS y los RPCs permiten admin).

## 5. Lógicas simultáneas a tener en cuenta al tocar la página

Estas máquinas de estado conviven en `ArtisanProductsPage` y se pisan si no se
coordinan:

1. **Borrador persistente** (load al montar + autosave reactivo), con clave por vendedor y por scope (`create` / `edit` / `manage`).
2. **Defaults de aprendizaje**: solo se aplican si no hay borrador, no se está editando y el formulario está vacío (`hasAppliedLearningDefaults` como candado).
3. **Ciclo de vida de object URLs**: cada remove/replace/reset debe revocar blobs (`cleanupDraftUrls` y revocaciones inline). Fugas o revocaciones prematuras rompen previews.
4. **Índices de crop**: `activeCropIndex` y `targetImageIndex` se reajustan manualmente al eliminar/reordenar imágenes.
5. **Edición solicitada por URL** (candado `hasAppliedRequestedEdit`, se resetea al cambiar `productId`).
6. **Paginación + búsqueda diferida** (`useDeferredValue`) con clamps de página cuando cambia el total.
7. **Modo lote vs individual**: `splitProductsByImage` cambia el payload, la validación y el destino (insert directo vs RPC).

## 6. Hallazgos / riesgos (lo importante)

### 6.1 `removeArtisanProductImages` es un no-op intencional — hay código muerto alrededor

`artisanClient.ts:278` devuelve siempre éxito sin borrar nada. Es coherente con la
migración `020_product_image_retention.sql` (storage append-only como backup). Pero
el resto del código sigue escrito como si borrara: rollbacks en `useArtisanProductSubmit`,
limpieza post-delete en `handleDelete`/`handleDeleteBatch`, y mensajes de usuario tipo
"no pudimos quitar algunas fotos viejas" que nunca pueden ocurrir. Consecuencias:

- **Los archivos huérfanos se acumulan por diseño** (originales + comprimidas + thumbs de subidas fallidas o reemplazadas). No hay job de limpieza en el repo.
- Cualquier refactor que "reactive" el borrado real debe revisar primero la política de retención; no es un bug, es una decisión.
- Hay un doble rollback en el error path (dentro de `uploadProductMedia` y de nuevo en el catch del hook) — hoy inofensivo por ser no-op, pero sería doble borrado si se reactivara.

### 6.2 El submit no es atómico en modo individual

Orden: subir archivos → insert/update fila. Si el insert falla, el "rollback" de
archivos no borra nada (6.1) → quedan huérfanos. Si el navegador se cierra entre
medio, ídem. En modo lote el RPC sí es atómico para las filas, pero los **syncs
secundarios de atributos/opciones corren después y pueden fallar dejando el lote
parcialmente sincronizado** (se avisa al usuario, no se revierte).

### 6.3 Subidas secuenciales: hasta ~45 requests por carga

15 imágenes × 3 archivos, en serie, con un único retry (700 ms) solo ante
timeout/error de red (`shouldRetryStorageUpload`). En conexiones lentas la carga
masiva es larga y frágil. Si se optimiza, cuidar el orden de `uploadedMedia`
(se indexa por posición contra `productImages` en `buildBatchPayload`).

### 6.4 Autosave de borrador: escritura pesada y posible carrera

- El efecto de autosave corre en **cada cambio de cualquier campo** (sin debounce) y escribe en IndexedDB, incluyendo blobs. La serialización de imágenes se cachea por referencia de array (`serializedDraftImagesCacheRef`), lo que mitiga, pero cada tecleo sigue escribiendo el registro completo.
- Carrera potencial: `resetForm()` borra el borrador (`removeProductDraft`), pero un `saveProductDraft` ya en vuelo del estado anterior **no se aborta** (el flag `isCancelled` solo evita el setState posterior, no la escritura). Un guardado exitoso puede "resucitar" el borrador recién limpiado. Baja probabilidad, difícil de reproducir; tenerlo presente si aparecen reportes de "borrador fantasma".

### 6.5 Tolerancia a drift de esquema demasiado amplia

`isMissingColumnError` (`artisanClient.ts:145`) hace fallback (reintenta el insert
sin `product_attributes`, ignora errores de sync) si el error "parece" de columna
faltante — pero matchea con `errorText.includes("column")` o incluso con el nombre
de la columna en cualquier parte del mensaje. Puede **tragarse errores reales** y
guardar productos sin atributos silenciosamente. Si las migraciones ya están
aplicadas en producción, este fallback es candidato a eliminarse.

### 6.6 Dualidad legacy `image_url`/`image_urls` vs `product_media`

`product_media` (jsonb, con crop, original, thumbnail, tipo `image`/`model_3d`) es
la fuente de verdad moderna, pero cada insert/update sigue espejando las columnas
legacy vía `getPrimaryProductImagePayload`. Los lectores (`getProductMedia`,
`getPrimaryProductImage`) tienen cadena de fallbacks. Cualquier cambio en la forma
de `product_media` debe mantener este espejo o migrar a los consumidores legacy
(catálogo público, flyers, carrito guardan `product_image_url` desnormalizado).

### 6.7 Validación duplicada cliente/servidor solo en modo lote

Los RPCs de lote validan en servidor; el insert directo de producto individual
confía en RLS + constraints pero la validación de negocio (título ≥4, precio >0)
vive solo en el cliente. Un cliente alterado puede insertar productos que la UI
consideraría inválidos.

### 6.8 Puntos menores

- `refreshProductsAndBatches` es un stub que devuelve `true` (la invalidación real la hacen las mutations de React Query). El parámetro `refreshed` de `finalizeSuccessfulSave` y sus mensajes de "no pudimos refrescar" son vestigiales.
- El modelo 3D se sube al bucket de **imágenes** (`models/` dentro de `artisan-product-images`); el límite de 8 MB está hardcodeado en la página, no en el backend.
- En modo lote solo se persiste **una imagen por producto** (la primera media de cada item); la UI lo asume.
- `handleDelete` borra la fila y muestra éxito, pero las fotos quedan en storage (coherente con 6.1).
- Textos de usuario mezclan español con y sin tildes ("Revisá"/"Revisa", "catalogo") — inconsistencia cosmética.

## 7. Guía rápida para trabajar en esta zona

- **Antes de tocar el submit**, leer completo `useArtisanProductSubmit.ts` + `artisanProductValidation.ts` + `buildBatchPayload`: la correspondencia posicional entre `productImages` y `uploadedMedia` es frágil.
- **Cualquier cambio en `ProductImageDraft`** obliga a actualizar la serialización de borradores (`productDraftUtils.ts`) — hay borradores viejos en IndexedDB de usuarios reales; la hidratación ya usa `??` defensivos, mantener esa tolerancia.
- **No asumir que borrar imágenes en storage funciona** — es no-op por política.
- **Invalidación de caché**: si se agrega una vista pública nueva que muestre productos, registrar su queryKey en `invalidatePublicProductCaches` (`artisanQueries.ts:65`) o quedará stale tras una carga.
- **Cambios de esquema**: migraciones en `supabase/migrations/` son la fuente de verdad; seguir el protocolo de `AGENTS.md` y `docs/DB_SAFETY.md` antes de cualquier comando remoto.
- **Verificación**: `npm run preflight` y `npm run build`; para cambios visuales, probar el flujo real de carga (crear individual, crear lote, editar lote, restaurar borrador).

---

# Plan de acción

> Objetivo definido por el dueño del proyecto (2026-07-13):
> 1. **Eliminar por completo el flujo "1 producto por foto" (lotes / batches)** — no hay
>    productos cargados en ese modo y no se necesita. No debe quedar código muerto,
>    UI residual, tipos huérfanos ni errores.
> 2. **Mejorar el sistema de carga**: dividir archivos gigantes, resolver los bugs y
>    la deuda técnica detectados en la sección 6.
>
> Ejecutar las fases **en orden y en commits separados** (una fase = uno o más commits
> chicos). Después de cada fase: `npm run preflight` + `npm run build` en verde, y
> probar el flujo real de carga (crear producto, editarlo, restaurar borrador).

## Fase 0 — Preparación y verificación de supuestos

1. Confirmar que efectivamente **no existen lotes ni productos con `batch_id`** en el
   backend real: `select count(*) from product_batches;` y
   `select count(*) from products where batch_id is not null;`. Si alguno da > 0,
   frenar y consultar antes de seguir (el plan asume 0).
2. Leer `AGENTS.md` y `docs/DB_SAFETY.md` antes de cualquier cambio de base de datos.
   Regla del repo: no ejecutar comandos contra un proyecto remoto sin identificarlo
   y confirmarlo primero.
3. Crear rama de trabajo (no trabajar sobre `main` directo).

## Fase 1 — Eliminar el flujo de lotes del frontend (UI y orquestación)

Objetivo: que la UI ya no ofrezca el modo y que el submit solo conozca el camino
individual. El código de datos (clients/queries/tipos) se limpia en la Fase 2 para
mantener commits compilables.

1. **`src/pages/ArtisanProductsPage.tsx`** — quitar:
   - Estados `splitProductsByImage`, `editingBatchId`, `editingBatchCode`,
     `pendingDeleteBatchId`, `isBatchConfirmOpen`, `managementBatchesPage` y el
     ref `isBulkUploadRef` solo si dejara de usarse (el bulk-add de fotos **se
     conserva**: varias fotos en un producto sigue siendo válido).
   - Hooks `useArtisanProductBatches`, `useCreateArtisanProductBatch`,
     `useUpdateArtisanProductBatch`, `useDeleteArtisanProductBatch` y sus usos.
   - Funciones `startEditingBatch`, `handleDeleteBatch`, `handleDeleteBatchRequest`,
     `toggleSplitProductsMode`, y la rama de `handleSubmit` que abre el modal de
     confirmación de lote (el submit pasa a llamar directo a `submitProductForm`).
   - En el efecto de deep-link (`applyRequestedEdit`): eliminar la rama
     `requestedProduct.batch_id`.
   - Props batch pasadas a `ArtisanProductFormSection`, `ArtisanProductListSection`,
     `ArtisanProductsConfirmModals`, `ArtisanProductsStatsBar`.
2. **`components/ArtisanProductFormSection.tsx`** — quitar el toggle "un producto por
   foto", el badge/estado de `editingBatchCode`, y todos los callbacks por-imagen de
   datos custom (`onProductTitleChangeForImage`, `onProductPriceChangeForImage`,
   `onProductStockQuantityChangeForImage`, `onProductDescriptionChangeForImage`,
   `onToggleCustomProductDataForImage`) junto con la UI que los renderiza.
3. **`components/ProductImagesField.tsx`** — quitar los campos por-imagen de
   título/precio/stock/descripción de producto (los que solo existían para el modo
   lote). Conservar: descripción de la foto, crop, reordenar, marcar principal.
4. **`components/ProductImageQuickEditModal.tsx`** — revisar: si sus campos de datos
   por-imagen solo servían al modo lote, eliminarlos o eliminar el componente si
   queda vacío.
5. **`components/ArtisanProductsConfirmModals.tsx`** — quitar el modal de confirmación
   de creación de lote y el de borrado de lote. Queda solo el de borrar producto.
6. **`components/ArtisanProductListSection.tsx`** — quitar la sección/lista de lotes,
   su paginación y búsqueda asociada. Queda solo el listado de productos.
7. **`components/ArtisanProductsStatsBar.tsx`** — quitar contadores de lote
   (`batchProductsCount`); simplificar a total de productos (evaluar si la barra
   sigue aportando o se elimina).
8. **`useArtisanProductSubmit.ts`** — quitar `splitProductsByImage`, `editingBatchId`,
   `createBatch`, `updateBatch`, `buildBatchPayload`, la rama completa de lote y las
   llamadas a `syncArtisanBatchProductAttributes`/`syncArtisanBatchProductOptions`.
9. **`artisanProductValidation.ts`** — quitar `splitProductsByImage` del contrato y
   `hasInvalidSplitProduct`.

## Fase 2 — Eliminar el flujo de lotes de la capa de datos, tipos y borradores

1. **`artisanClient.ts`** — eliminar: `createArtisanProductBatch`,
   `updateArtisanProductBatch`, `deleteArtisanProductBatch`,
   `getArtisanProductBatches`, `getArtisanBatchProducts`,
   `syncArtisanBatchProductAttributes`, `syncArtisanBatchProductOptions`,
   `productBatchSelection`, el parámetro `batchId`/`standaloneOnly` de
   `ArtisanProductListParams` (sin lotes, todos los productos son standalone), y los
   campos batch de los payloads de `createArtisanProduct`/`updateArtisanProduct`
   (`batch_id`, `batch_code`, `batch_position`, `created_via_batch`).
   En `getArtisanProducts`, quitar `batch_code` del filtro de búsqueda `.or(...)`.
   En `getArtisanProductStats`, eliminar los conteos de lote (o eliminar la función
   si la stats bar desaparece).
2. **`artisanQueries.ts`** — eliminar los hooks de lote y, en
   `invalidatePublicProductCaches`, dejar de invalidar
   `queryKeys.artisan.productBatches`. Quitar la entrada correspondiente de
   **`src/lib/query/queryKeys.ts`**.
3. **Tipos** — borrar `src/types/productBatch.ts` completo. En
   **`src/types/artisan.ts`** quitar `batch_id`, `batch_code`, `batch_position`,
   `created_via_batch` de `ArtisanProduct` y `ArtisanProductInput`. Revisar
   `src/types/public.ts` y `src/types/admin.ts` por los mismos campos.
4. **Borradores** (`productDraftUtils.ts`, `imageEditorTypes.ts`) — quitar de
   `ProductImageDraft` y de los tipos persistidos: `useCustomProductData`,
   `productTitle`, `productPrice`, `productStockQuantity`, `productDescription`,
   `existingProductId`, `splitProductsByImage`, `editingBatchId`, `editingBatchCode`,
   y las funciones `resolveDraftProductData`, `applyDraftProductSnapshot`,
   `createDraftProductDataSnapshot`. **Importante**: la hidratación debe seguir
   tolerando borradores viejos en IndexedDB que traigan esos campos (simplemente
   ignorarlos; no romper si están presentes).
5. **Selects hardcodeados** — quitar `batch_id, batch_code, batch_position,
   created_via_batch` de las cadenas select de
   `src/features/public/publicClient.ts:30` y `src/features/buyer/buyerClient.ts:24`.
6. **Admin** — limpiar el rastro de lotes del panel admin:
   - `adminDashboardUtils.ts`: quitar el panel `"batches"`, `BatchSummary`,
     `buildBatchSummaries`, `filterAndSortBatches`.
   - `DashboardDetailDrawer.tsx` y `DashboardMetricsGrid.tsx`: quitar panel y métricas
     de lotes.
   - `adminClient.ts` (líneas ~675, ~748, ~756): quitar `batch_id`/`batch_code` de los
     selects y del filtro de búsqueda.
   - `adminProductControlUtils.ts`: quitar `batchLabel` y su uso en etiquetas.
   - `AdminDashboardPage.tsx`: quitar el cableado del panel de lotes.
7. **Búsqueda final de residuos**: `grep -ri "batch" src/` debe devolver **cero**
   resultados (o solo falsos positivos justificados y documentados). Repetir con
   `splitProducts`, `useCustomProductData`, `productBatch`.

## Fase 3 — Migración de base de datos

En una migración nueva (`supabase/migrations/`), siguiendo el protocolo de
`docs/DB_SAFETY.md` y solo tras confirmar la Fase 0:

1. `drop function` de `create_product_batch`, `update_product_batch`,
   `delete_product_batch` y `generate_product_batch_code`.
2. `drop table public.product_batches` (verificar políticas RLS y triggers asociados
   dentro de `20260527000015_015_product_batches.sql` para revertirlos todos).
3. `alter table public.products drop column batch_id, drop column batch_code,
   drop column batch_position, drop column created_via_batch` (revisar índices o
   constraints que dependan de esas columnas).
4. Revisar si otras migraciones/vistas (`artisan_storefronts_view`, funciones de
   checkout) referencian esas columnas antes de dropear; ajustar en la misma
   migración si hace falta.
5. La migración se aplica al proyecto Supabase real **solo** con el backend
   identificado y confirmado (regla principal del README). El frontend de las fases
   1–2 funciona igual aunque la migración tarde en aplicarse (las columnas dropeadas
   ya no se seleccionan), así que puede desplegarse el frontend primero.

## Fase 4 — Mejoras, bugs y deuda técnica

Con el sistema ya simplificado (sin lotes, el orquestador pierde ~un tercio de su
estado), encarar en este orden:

1. **Limpiar el código muerto alrededor de `removeArtisanProductImages` (hallazgo 6.1)**.
   Decisión recomendada: mantener la política append-only pero sincerar el código —
   eliminar la función no-op y todos sus call-sites (rollbacks en el submit, limpieza
   post-delete, mensajes "no pudimos quitar fotos viejas" imposibles). Documentar en
   el propio código (un comentario en el punto de subida) que el storage es
   append-only por diseño. Alternativa si se prefiere borrado real: mover el borrado
   a una Edge Function con service role — decisión del dueño, no tomarla en caliente.
2. **Eliminar vestigios del refresh manual (hallazgo 6.8)**: quitar
   `refreshProductsAndBatches` (stub), el parámetro `refreshed` de
   `finalizeSuccessfulSave` y el mensaje de "no pudimos refrescar".
3. **Acotar `isMissingColumnError` (hallazgo 6.5)**: si las migraciones de
   `product_attributes` y `made_to_order_options` ya están aplicadas en producción,
   eliminar los fallbacks por completo. Si no se puede confirmar, restringir el match
   a `code === "PGRST204"` exclusivamente.
4. **Debounce + fix de carrera en el autosave de borradores (hallazgo 6.4)**:
   - Debounce de ~800 ms en el efecto de persistencia (los blobs ya se cachean por
     referencia; el debounce evita una escritura de IndexedDB por tecla).
   - Fix de la carrera: incorporar un token/generación (ref numérica que se
     incrementa en `resetForm`/`discardDraft`); `persistDraft` solo escribe si su
     token sigue vigente al momento de guardar.
5. **Dividir `ArtisanProductsPage.tsx`** (tras las fases 1–2 quedará más chico; meta
   final: ningún archivo del feature > ~400 líneas). Extraer hooks cohesivos:
   - `useProductDraftPersistence(draftKey, form, images)` → carga, autosave,
     descartar (estados `hasDraft`, `isDraftReady`, `draftPersistenceState`).
   - `useProductImageDrafts()` → selección bulk/individual, remove, reorder,
     revocación de object URLs, índices de crop (`activeCropIndex`,
     `targetImageIndex`, `dragState`).
   - `useProductEditing()` → `startEditing`, deep-link `?productId`, estado de
     edición.
   La página queda como composición de esos hooks + render.
6. **Dividir `ArtisanProductFormSection.tsx`** (~1.085 líneas hoy) en subcomponentes:
   campos base, atributos, opciones bajo demanda, sección de imágenes, sección de
   modelo 3D. Sin cambiar comportamiento; solo extracción con props tipadas.
7. **Paralelizar subidas de imágenes (hallazgo 6.3)**: dentro de cada imagen mantener
   la secuencia (original → comprimida → thumb comparten datos), pero procesar
   imágenes distintas con concurrencia limitada (p. ej. 3 a la vez con un pool
   simple). Preservar el orden de `uploadedMedia` por índice, no por orden de
   finalización. Mantener el retry existente por archivo.
8. **Unificar textos de usuario** (hallazgo 6.8): pasada única sobre los mensajes del
   feature normalizando español rioplatense con tildes ("Revisá", "catálogo").
9. **Opcional, si el dueño lo aprueba** (dejar para el final, cada uno es decisión de
   producto): validación server-side del producto individual (constraint o trigger de
   título/precio), y mover el modelo 3D a un bucket propio con límite en backend.

## Fase 5 — Verificación final

1. `npm run preflight` y `npm run build` sin warnings nuevos.
2. Prueba manual del flujo completo: crear producto con varias fotos (bulk y
   reemplazo individual), recortar, subir modelo 3D, guardar; editar producto
   existente quitando/agregando fotos; cerrar el navegador a mitad de carga y
   verificar restauración del borrador; borrar producto; verificar catálogo público
   actualizado (invalidación de caché).
3. Verificar que un borrador viejo de IndexedDB (con campos batch) no rompe la
   hidratación: probar en un navegador que haya usado la versión anterior o
   inyectar un registro de prueba con esos campos.
4. Como admin: gestionar productos de un vendedor (`/admin/...:artisanId`), dashboard
   sin panel de lotes, control de productos sin `batchLabel`.
5. `grep -ri "batch" src/ supabase/functions/` → cero resultados. En
   `supabase/migrations/` es esperable que las migraciones históricas mencionen
   lotes: **no se reescriben migraciones ya aplicadas**; la eliminación vive en la
   migración nueva de la Fase 3.
6. Actualizar la documentación que mencione lotes: este archivo (secciones 2–6),
   `docs/BACKEND_MAP.md` y `contexto/` si corresponde.

## Guía operativa para el agente ejecutor (leer antes de empezar)

Reglas para ejecutar este plan con eficiencia, sin re-explorar lo ya relevado:

1. **Este documento ya es la exploración.** Las secciones 1–6 resumen el sistema
   archivo por archivo. No re-auditar ni releer archivos completos para "entender el
   contexto": usar la tabla de la sección 2 y abrir solo el archivo que se está
   modificando, idealmente por rangos (el punto exacto ya está indicado con
   `archivo:línea` en los hallazgos).
2. **Buscar con grep, no leyendo.** Para localizar usos de un símbolo a eliminar,
   usar búsqueda de texto (`grep -rn "nombreSimbolo" src/`) y abrir solo los hits.
   Nunca leer `node_modules/`, `dist/`, `package-lock.json` ni `assets-source/`.
3. **El compilador es el detector de código muerto.** Al eliminar un símbolo, borrar
   primero la definición y dejar que `npm run preflight` (typecheck + lint) señale
   todos los call-sites rotos. Es más barato y más confiable que buscar los usos a
   mano.
4. **Verificación escalonada**: `npx tsc --noEmit` (rápido) tras cada grupo de
   cambios; `npm run preflight` al cerrar cada fase; `npm run build` solo al cerrar
   cada fase, no en cada paso intermedio.
5. **No ampliar el alcance.** Si al tocar un archivo aparece deuda no listada en la
   Fase 4, anotarla en la sección "Notas de ejecución" de abajo y seguir. No
   refactorizar en caliente cosas fuera del plan.
6. **Puntos de decisión = frenar y preguntar.** Solo hay tres: (a) la Fase 0 detecta
   datos de lotes existentes; (b) la política de borrado de imágenes (Fase 4.1,
   alternativa Edge Function); (c) los opcionales de la Fase 4.9. Todo lo demás está
   decidido en este documento — no volver a preguntar.
7. **Commits chicos con el formato del historial del repo** (mensajes en español,
   imperativos). Un commit nunca deja el build roto.
8. **Actualizar el checklist de abajo al terminar cada ítem.** Es la memoria entre
   sesiones: una sesión nueva debe poder retomar leyendo solo este documento y el
   checklist, sin re-derivar en qué quedó el trabajo.

## Estado de ejecución (actualizar al avanzar)

- [x] Fase 0 - Supuestos verificados (confirmado: 2026-07-13)
- [x] Fase 1 - Lotes fuera de UI y orquestacion
- [x] Fase 2.1-2.4 - Clients, queries, tipos y borradores limpios
- [x] Fase 2.5-2.6 - Selects public/buyer y admin limpios
- [x] Fase 2.7 - Sin referencias batch en src/
- [x] Fase 3 - Migracion creada
- [x] Fase 3 - Migracion aplicada al backend confirmado
- [x] Fase 4.1 — Código muerto de borrado de imágenes eliminado
- [x] Fase 4.2 — Vestigios de refresh manual eliminados
- [x] Fase 4.3 — `isMissingColumnError` acotado o eliminado
- [x] Fase 4.4 — Autosave con debounce y carrera resuelta
- [x] Fase 4.5 — `ArtisanProductsPage` dividido en hooks
- [x] Fase 4.6 — `ArtisanProductFormSection` dividido
- [x] Fase 4.7 — Subidas paralelizadas con orden preservado
- [x] Fase 4.8 — Textos unificados
- [x] Fase 5 — Verificación final y documentación completadas

### Notas de ejecución

- 2026-07-13: Fase 4.1-4.2. Se conserva Storage append-only por la migración 020;
  se retiró el rollback no operativo y sus mensajes. Las mutations de React Query
  invalidan la lista, por lo que se eliminó el refresh stub.
- 2026-07-13: Fase 4.3. Se eliminó el fallback de columna ausente: las migraciones
  del proyecto remoto confirmado están alineadas y deben fallar de forma visible ante
  una regresión de esquema.
- 2026-07-13: Fase 4.4. El autosave espera 800 ms y un identificador monotónico evita
  que una serialización anterior escriba o actualice el estado tras un cambio nuevo.
- 2026-07-13: Fase 4.5. La gestión del modelo 3D y el estado de búsqueda/paginación
  viven en hooks dedicados; la página conserva solo la composición y el límite que
  depende del total recibido por React Query.
- 2026-07-13: Fase 4.6. El bloque de modelo 3D se separó en `ProductModel3DField`;
  conserva el contrato de carga, eliminación y previsualización del formulario.
- 2026-07-13: Fase 4.7. Las fotos se procesan con un pool de tres trabajos; cada una
  conserva la secuencia original, comprimida y miniatura, y el resultado se ordena por
  su índice original antes de persistirlo.
- 2026-07-13: Fase 4.8. Se normalizaron los mensajes principales del flujo a español
  rioplatense y la confirmación de borrado ahora refleja la retención append-only de
  las fotos.
- 2026-07-13: Fase 5. `preflight`, build, `git diff --check` y la búsqueda de lotes en
  `src/` pasaron. Las migraciones y `supabase db lint --linked` se verificaron alineados
  antes de poner los metadatos locales de enlace en cuarentena; las auditorías de secretos,
  conexiones y codificación ahora pasan. `audit:large-files` sigue informando archivos
  extensos como deuda técnica, pero no es un control bloqueante.

## Criterios de aceptación

- No existe en `src/` ninguna referencia a batches/lotes/"un producto por foto".
- El flujo individual (multi-foto) funciona idéntico a antes: crear, editar,
  borradores, crop, 3D, modo admin.
- `products` sin columnas batch; sin tabla `product_batches` ni RPCs de lote (tras
  aplicar la migración).
- Ningún archivo del feature de carga supera ~400 líneas.
- Los hallazgos 6.1, 6.3, 6.4, 6.5 y los vestigios de 6.8 quedan resueltos o
  explícitamente descartados con justificación escrita en este documento.

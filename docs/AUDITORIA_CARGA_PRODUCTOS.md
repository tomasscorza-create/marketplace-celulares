# AuditorÃ­a del sistema de carga de productos

> Fecha: 2026-07-13. Documento pensado como mapa de contexto para agentes (Codex)
> que necesiten trabajar sobre esta zona. Refleja el estado del cÃ³digo en `main`
> (commit `26ba260`). Si el cÃ³digo cambiÃ³ desde entonces, verificar antes de asumir.

## 1. Resumen ejecutivo

El sistema de carga de productos es la zona mÃ¡s densa del frontend: un solo flujo
combina **formulario de producto individual, modo lote (un producto por foto),
editor de recortes de imagen, compresiÃ³n client-side, subida a Supabase Storage,
borradores persistidos en IndexedDB, defaults aprendidos del historial del vendedor,
modo admin-gestionando-vendedor y modelos 3D**. Todo esto vive bajo el feature
`src/features/artisan/` â€” el nombre "artisan" es **herencia del marketplace artesanal
original**; hoy significa "vendedor". No renombrar sin un plan global: el nombre estÃ¡
acoplado a tablas (`products.artisan_id`), buckets, RPCs y rutas.

El estado general es **funcional y razonablemente ordenado** (la lÃ³gica estÃ¡ extraÃ­da
en hooks/utils testeables), pero el orquestador (`ArtisanProductsPage.tsx`, ~1.585
lÃ­neas, ~30 useState) concentra demasiadas mÃ¡quinas de estado simultÃ¡neas y hay
varias trampas no obvias documentadas en la secciÃ³n 6.

## 2. Mapa de archivos (quiÃ©n hace quÃ©)

### Frontend â€” flujo de carga

| Archivo | Rol |
| --- | --- |
| `src/pages/ArtisanProductsPage.tsx` | Orquestador. Todo el estado de UI: formulario, drafts de imÃ¡genes, crop, borradores, modales, paginaciÃ³n, modo admin. |
| `src/features/artisan/useArtisanProductSubmit.ts` | Hook de submit. Valida â†’ sube imÃ¡genes/miniaturas/modelo 3D â†’ crea/actualiza producto o lote â†’ limpieza. Es el corazÃ³n transaccional. |
| `src/features/artisan/artisanClient.ts` | Capa de acceso a Supabase: CRUD de products/batches, subida a Storage con reintento, RPCs de lote, sync secundario de atributos/opciones. |
| `src/features/artisan/artisanQueries.ts` | Hooks React Query (queries + mutations). Las mutations invalidan cachÃ©s privadas **y pÃºblicas** (catÃ¡logo, storefront, feed). |
| `src/features/artisan/artisanProductValidation.ts` | ValidaciÃ³n client-side previa al submit (tÃ­tulo â‰¥4, precio >0, stock/lead time segÃºn modo, grupos de opciones, â‰¥1 foto). |
| `src/features/artisan/productDraftUtils.ts` | SerializaciÃ³n/hidrataciÃ³n de drafts de imagen (blobs â†” IndexedDB), crop por defecto, resoluciÃ³n de datos por-foto vs formulario base. |
| `src/features/artisan/artisanProductsPageUtils.ts` | Constantes (pÃ¡ginas de 24/12, **mÃ¡x. 15 imÃ¡genes por carga**), form inicial, resoluciÃ³n de imagen primaria y URLs almacenadas. |
| `src/features/artisan/artisanProductLearning.ts` | "Learning profile": analiza hasta 120 productos previos del vendedor y sugiere categorÃ­a, precio, modo de disponibilidad, atributos. |
| `src/features/artisan/imageEditorTypes.ts` | Tipo `ProductImageDraft` (el objeto central de todo el flujo de imÃ¡genes). |
| `src/lib/compressImage.ts` | CompresiÃ³n y recorte en canvas. Presets: imagen principal 1280px / 2 MB / q0.76; miniatura 520px / 320 KB / q0.68. Aspectos `square` y `portrait`. |
| `src/lib/browser/productDraftStorage.ts` | Wrapper de IndexedDB (DB `neutral-marketplace-product-drafts`) para persistir borradores, incluidos los blobs de imagen. |

### Componentes de UI

- `components/ArtisanProductFormSection.tsx` (~1.085 lÃ­neas): el formulario completo â€” campos base, atributos, opciones bajo demanda, toggle "un producto por foto", campo de modelo 3D.
- `components/ProductImagesField.tsx`: grilla de imÃ¡genes, drag & drop, bulk picker.
- `components/ArtisanProductsCropController.tsx` + `ProductImageCropModal.tsx`: modal de recorte (offset/zoom por arrastre de puntero; el drag vive en la pÃ¡gina).
- `components/ArtisanProductListSection.tsx`: listado de gestiÃ³n con bÃºsqueda y paginaciÃ³n.
- `components/ArtisanProductsConfirmModals.tsx`: confirmaciones de borrado y de creaciÃ³n de lote.

### Backend (Supabase)

- Tablas: `products` (con columnas legacy `image_url`, `image_urls` **y** la fuente moderna `product_media` jsonb), `product_batches`, `categories`.
- RPCs `security definer` en `supabase/migrations/20260527000015_015_product_batches.sql`: `create_product_batch`, `update_product_batch`, `delete_product_batch`. Validan `auth.uid()` = artisan o admin. La creaciÃ³n/ediciÃ³n de lotes es **atÃ³mica en el servidor**.
- Storage: bucket `artisan-product-images` (subcarpetas por `artisanId`, `thumbs/` para miniaturas, `models/` para 3D). MigraciÃ³n `020_product_image_retention.sql`: **los clientes no pueden borrar objetos del bucket** (polÃ­tica de delete eliminada; append-only intencional).

## 3. Flujo de creaciÃ³n (camino feliz)

1. Usuario completa formulario. Cada cambio dispara el **autosave de borrador** a IndexedDB (efecto en `ArtisanProductsPage.tsx:375`), incluyendo los blobs de las fotos.
2. SelecciÃ³n de imÃ¡genes: bulk (hasta 15, sin abrir crop) o reemplazo individual (abre crop automÃ¡ticamente). Cada imagen es un `ProductImageDraft` con object URL de preview.
3. Submit (`useArtisanProductSubmit`):
   - ValidaciÃ³n client-side (`validateArtisanProductDraft`). Si falla, corta antes de subir nada.
   - `uploadProductMedia`: por cada imagen nueva/editada sube **secuencialmente** hasta 3 archivos: original sin comprimir, versiÃ³n comprimida (1280px) y miniatura (520px). Las imÃ¡genes existentes sin editar se reutilizan sin re-subir.
   - Si hay modelo 3D (`.glb`/`.gltf`, mÃ¡x. 8 MB), se sube a `models/`.
   - **Modo normal**: `createProduct`/`updateProduct` â†’ insert/update directo en `products` con `product_media` + espejo legacy `image_url`/`image_urls`.
   - **Modo lote** (`splitProductsByImage`): pide confirmaciÃ³n en modal, arma `ProductBatchInput` (un item por foto, con datos por-foto opcionales vÃ­a `useCustomProductData`) y llama al RPC. DespuÃ©s del RPC corren dos syncs secundarios no atÃ³micos (`syncArtisanBatchProductAttributes`, `syncArtisanBatchProductOptions`).
4. Ã‰xito â†’ mutation de React Query invalida cachÃ©s privadas y pÃºblicas â†’ `finalizeSuccessfulSave` resetea formulario y borra el borrador de IndexedDB.
5. Error de subida â†’ se intenta rollback de los archivos ya subidos con `removeArtisanProductImages`â€¦ **que es un no-op** (ver 6.1).

## 4. Flujo de ediciÃ³n

- Producto individual: `startEditing` reconstruye drafts desde `product_media` (cargando dimensiones vÃ­a `loadImage`, con fallback si la imagen no carga). Guarda `editingOriginalImageUrls` para detectar imÃ¡genes quitadas al guardar.
- Lote: `startEditingBatch` puede necesitar paginar (`getArtisanBatchProducts`, pÃ¡ginas de 200) si el lote no estÃ¡ completo en memoria. Marca `useCustomProductData` por producto comparando contra los valores `*_base` del lote.
- Deep-link: `?mode=edit&productId=...` dispara un efecto que busca el producto (en cache o por id) y entra al modo ediciÃ³n correspondiente (producto o lote).
- Modo admin: ruta con `:artisanId` + rol admin â†’ `targetArtisanId` pasa a ser el vendedor gestionado; todo el flujo funciona igual (las polÃ­ticas RLS y los RPCs permiten admin).

## 5. LÃ³gicas simultÃ¡neas a tener en cuenta al tocar la pÃ¡gina

Estas mÃ¡quinas de estado conviven en `ArtisanProductsPage` y se pisan si no se
coordinan:

1. **Borrador persistente** (load al montar + autosave reactivo), con clave por vendedor y por scope (`create` / `edit` / `manage`).
2. **Defaults de aprendizaje**: solo se aplican si no hay borrador, no se estÃ¡ editando y el formulario estÃ¡ vacÃ­o (`hasAppliedLearningDefaults` como candado).
3. **Ciclo de vida de object URLs**: cada remove/replace/reset debe revocar blobs (`cleanupDraftUrls` y revocaciones inline). Fugas o revocaciones prematuras rompen previews.
4. **Ãndices de crop**: `activeCropIndex` y `targetImageIndex` se reajustan manualmente al eliminar/reordenar imÃ¡genes.
5. **EdiciÃ³n solicitada por URL** (candado `hasAppliedRequestedEdit`, se resetea al cambiar `productId`).
6. **PaginaciÃ³n + bÃºsqueda diferida** (`useDeferredValue`) con clamps de pÃ¡gina cuando cambia el total.
7. **Modo lote vs individual**: `splitProductsByImage` cambia el payload, la validaciÃ³n y el destino (insert directo vs RPC).

## 6. Hallazgos / riesgos (lo importante)

### 6.1 `removeArtisanProductImages` es un no-op intencional â€” hay cÃ³digo muerto alrededor

`artisanClient.ts:278` devuelve siempre Ã©xito sin borrar nada. Es coherente con la
migraciÃ³n `020_product_image_retention.sql` (storage append-only como backup). Pero
el resto del cÃ³digo sigue escrito como si borrara: rollbacks en `useArtisanProductSubmit`,
limpieza post-delete en `handleDelete`/`handleDeleteBatch`, y mensajes de usuario tipo
"no pudimos quitar algunas fotos viejas" que nunca pueden ocurrir. Consecuencias:

- **Los archivos huÃ©rfanos se acumulan por diseÃ±o** (originales + comprimidas + thumbs de subidas fallidas o reemplazadas). No hay job de limpieza en el repo.
- Cualquier refactor que "reactive" el borrado real debe revisar primero la polÃ­tica de retenciÃ³n; no es un bug, es una decisiÃ³n.
- Hay un doble rollback en el error path (dentro de `uploadProductMedia` y de nuevo en el catch del hook) â€” hoy inofensivo por ser no-op, pero serÃ­a doble borrado si se reactivara.

### 6.2 El submit no es atÃ³mico en modo individual

Orden: subir archivos â†’ insert/update fila. Si el insert falla, el "rollback" de
archivos no borra nada (6.1) â†’ quedan huÃ©rfanos. Si el navegador se cierra entre
medio, Ã­dem. En modo lote el RPC sÃ­ es atÃ³mico para las filas, pero los **syncs
secundarios de atributos/opciones corren despuÃ©s y pueden fallar dejando el lote
parcialmente sincronizado** (se avisa al usuario, no se revierte).

### 6.3 Subidas secuenciales: hasta ~45 requests por carga

15 imÃ¡genes Ã— 3 archivos, en serie, con un Ãºnico retry (700 ms) solo ante
timeout/error de red (`shouldRetryStorageUpload`). En conexiones lentas la carga
masiva es larga y frÃ¡gil. Si se optimiza, cuidar el orden de `uploadedMedia`
(se indexa por posiciÃ³n contra `productImages` en `buildBatchPayload`).

### 6.4 Autosave de borrador: escritura pesada y posible carrera

- El efecto de autosave corre en **cada cambio de cualquier campo** (sin debounce) y escribe en IndexedDB, incluyendo blobs. La serializaciÃ³n de imÃ¡genes se cachea por referencia de array (`serializedDraftImagesCacheRef`), lo que mitiga, pero cada tecleo sigue escribiendo el registro completo.
- Carrera potencial: `resetForm()` borra el borrador (`removeProductDraft`), pero un `saveProductDraft` ya en vuelo del estado anterior **no se aborta** (el flag `isCancelled` solo evita el setState posterior, no la escritura). Un guardado exitoso puede "resucitar" el borrador reciÃ©n limpiado. Baja probabilidad, difÃ­cil de reproducir; tenerlo presente si aparecen reportes de "borrador fantasma".

### 6.5 Tolerancia a drift de esquema demasiado amplia

`isMissingColumnError` (`artisanClient.ts:145`) hace fallback (reintenta el insert
sin `product_attributes`, ignora errores de sync) si el error "parece" de columna
faltante â€” pero matchea con `errorText.includes("column")` o incluso con el nombre
de la columna en cualquier parte del mensaje. Puede **tragarse errores reales** y
guardar productos sin atributos silenciosamente. Si las migraciones ya estÃ¡n
aplicadas en producciÃ³n, este fallback es candidato a eliminarse.

### 6.6 Dualidad legacy `image_url`/`image_urls` vs `product_media`

`product_media` (jsonb, con crop, original, thumbnail, tipo `image`/`model_3d`) es
la fuente de verdad moderna, pero cada insert/update sigue espejando las columnas
legacy vÃ­a `getPrimaryProductImagePayload`. Los lectores (`getProductMedia`,
`getPrimaryProductImage`) tienen cadena de fallbacks. Cualquier cambio en la forma
de `product_media` debe mantener este espejo o migrar a los consumidores legacy
(catÃ¡logo pÃºblico, flyers, carrito guardan `product_image_url` desnormalizado).

### 6.7 ValidaciÃ³n duplicada cliente/servidor solo en modo lote

Los RPCs de lote validan en servidor; el insert directo de producto individual
confÃ­a en RLS + constraints pero la validaciÃ³n de negocio (tÃ­tulo â‰¥4, precio >0)
vive solo en el cliente. Un cliente alterado puede insertar productos que la UI
considerarÃ­a invÃ¡lidos.

### 6.8 Puntos menores

- `refreshProductsAndBatches` es un stub que devuelve `true` (la invalidaciÃ³n real la hacen las mutations de React Query). El parÃ¡metro `refreshed` de `finalizeSuccessfulSave` y sus mensajes de "no pudimos refrescar" son vestigiales.
- El modelo 3D se sube al bucket de **imÃ¡genes** (`models/` dentro de `artisan-product-images`); el lÃ­mite de 8 MB estÃ¡ hardcodeado en la pÃ¡gina, no en el backend.
- En modo lote solo se persiste **una imagen por producto** (la primera media de cada item); la UI lo asume.
- `handleDelete` borra la fila y muestra Ã©xito, pero las fotos quedan en storage (coherente con 6.1).
- Textos de usuario mezclan espaÃ±ol con y sin tildes ("RevisÃ¡"/"Revisa", "catalogo") â€” inconsistencia cosmÃ©tica.

## 7. GuÃ­a rÃ¡pida para trabajar en esta zona

- **Antes de tocar el submit**, leer completo `useArtisanProductSubmit.ts` + `artisanProductValidation.ts` + `buildBatchPayload`: la correspondencia posicional entre `productImages` y `uploadedMedia` es frÃ¡gil.
- **Cualquier cambio en `ProductImageDraft`** obliga a actualizar la serializaciÃ³n de borradores (`productDraftUtils.ts`) â€” hay borradores viejos en IndexedDB de usuarios reales; la hidrataciÃ³n ya usa `??` defensivos, mantener esa tolerancia.
- **No asumir que borrar imÃ¡genes en storage funciona** â€” es no-op por polÃ­tica.
- **InvalidaciÃ³n de cachÃ©**: si se agrega una vista pÃºblica nueva que muestre productos, registrar su queryKey en `invalidatePublicProductCaches` (`artisanQueries.ts:65`) o quedarÃ¡ stale tras una carga.
- **Cambios de esquema**: migraciones en `supabase/migrations/` son la fuente de verdad; seguir el protocolo de `AGENTS.md` y `docs/DB_SAFETY.md` antes de cualquier comando remoto.
- **VerificaciÃ³n**: `npm run preflight` y `npm run build`; para cambios visuales, probar el flujo real de carga (crear individual, crear lote, editar lote, restaurar borrador).

---

# Plan de acciÃ³n

> Objetivo definido por el dueÃ±o del proyecto (2026-07-13):
> 1. **Eliminar por completo el flujo "1 producto por foto" (lotes / batches)** â€” no hay
>    productos cargados en ese modo y no se necesita. No debe quedar cÃ³digo muerto,
>    UI residual, tipos huÃ©rfanos ni errores.
> 2. **Mejorar el sistema de carga**: dividir archivos gigantes, resolver los bugs y
>    la deuda tÃ©cnica detectados en la secciÃ³n 6.
>
> Ejecutar las fases **en orden y en commits separados** (una fase = uno o mÃ¡s commits
> chicos). DespuÃ©s de cada fase: `npm run preflight` + `npm run build` en verde, y
> probar el flujo real de carga (crear producto, editarlo, restaurar borrador).

## Fase 0 â€” PreparaciÃ³n y verificaciÃ³n de supuestos

1. Confirmar que efectivamente **no existen lotes ni productos con `batch_id`** en el
   backend real: `select count(*) from product_batches;` y
   `select count(*) from products where batch_id is not null;`. Si alguno da > 0,
   frenar y consultar antes de seguir (el plan asume 0).
2. Leer `AGENTS.md` y `docs/DB_SAFETY.md` antes de cualquier cambio de base de datos.
   Regla del repo: no ejecutar comandos contra un proyecto remoto sin identificarlo
   y confirmarlo primero.
3. Crear rama de trabajo (no trabajar sobre `main` directo).

## Fase 1 â€” Eliminar el flujo de lotes del frontend (UI y orquestaciÃ³n)

Objetivo: que la UI ya no ofrezca el modo y que el submit solo conozca el camino
individual. El cÃ³digo de datos (clients/queries/tipos) se limpia en la Fase 2 para
mantener commits compilables.

1. **`src/pages/ArtisanProductsPage.tsx`** â€” quitar:
   - Estados `splitProductsByImage`, `editingBatchId`, `editingBatchCode`,
     `pendingDeleteBatchId`, `isBatchConfirmOpen`, `managementBatchesPage` y el
     ref `isBulkUploadRef` solo si dejara de usarse (el bulk-add de fotos **se
     conserva**: varias fotos en un producto sigue siendo vÃ¡lido).
   - Hooks `useArtisanProductBatches`, `useCreateArtisanProductBatch`,
     `useUpdateArtisanProductBatch`, `useDeleteArtisanProductBatch` y sus usos.
   - Funciones `startEditingBatch`, `handleDeleteBatch`, `handleDeleteBatchRequest`,
     `toggleSplitProductsMode`, y la rama de `handleSubmit` que abre el modal de
     confirmaciÃ³n de lote (el submit pasa a llamar directo a `submitProductForm`).
   - En el efecto de deep-link (`applyRequestedEdit`): eliminar la rama
     `requestedProduct.batch_id`.
   - Props batch pasadas a `ArtisanProductFormSection`, `ArtisanProductListSection`,
     `ArtisanProductsConfirmModals`, `ArtisanProductsStatsBar`.
2. **`components/ArtisanProductFormSection.tsx`** â€” quitar el toggle "un producto por
   foto", el badge/estado de `editingBatchCode`, y todos los callbacks por-imagen de
   datos custom (`onProductTitleChangeForImage`, `onProductPriceChangeForImage`,
   `onProductStockQuantityChangeForImage`, `onProductDescriptionChangeForImage`,
   `onToggleCustomProductDataForImage`) junto con la UI que los renderiza.
3. **`components/ProductImagesField.tsx`** â€” quitar los campos por-imagen de
   tÃ­tulo/precio/stock/descripciÃ³n de producto (los que solo existÃ­an para el modo
   lote). Conservar: descripciÃ³n de la foto, crop, reordenar, marcar principal.
4. **`components/ProductImageQuickEditModal.tsx`** â€” revisar: si sus campos de datos
   por-imagen solo servÃ­an al modo lote, eliminarlos o eliminar el componente si
   queda vacÃ­o.
5. **`components/ArtisanProductsConfirmModals.tsx`** â€” quitar el modal de confirmaciÃ³n
   de creaciÃ³n de lote y el de borrado de lote. Queda solo el de borrar producto.
6. **`components/ArtisanProductListSection.tsx`** â€” quitar la secciÃ³n/lista de lotes,
   su paginaciÃ³n y bÃºsqueda asociada. Queda solo el listado de productos.
7. **`components/ArtisanProductsStatsBar.tsx`** â€” quitar contadores de lote
   (`batchProductsCount`); simplificar a total de productos (evaluar si la barra
   sigue aportando o se elimina).
8. **`useArtisanProductSubmit.ts`** â€” quitar `splitProductsByImage`, `editingBatchId`,
   `createBatch`, `updateBatch`, `buildBatchPayload`, la rama completa de lote y las
   llamadas a `syncArtisanBatchProductAttributes`/`syncArtisanBatchProductOptions`.
9. **`artisanProductValidation.ts`** â€” quitar `splitProductsByImage` del contrato y
   `hasInvalidSplitProduct`.

## Fase 2 â€” Eliminar el flujo de lotes de la capa de datos, tipos y borradores

1. **`artisanClient.ts`** â€” eliminar: `createArtisanProductBatch`,
   `updateArtisanProductBatch`, `deleteArtisanProductBatch`,
   `getArtisanProductBatches`, `getArtisanBatchProducts`,
   `syncArtisanBatchProductAttributes`, `syncArtisanBatchProductOptions`,
   `productBatchSelection`, el parÃ¡metro `batchId`/`standaloneOnly` de
   `ArtisanProductListParams` (sin lotes, todos los productos son standalone), y los
   campos batch de los payloads de `createArtisanProduct`/`updateArtisanProduct`
   (`batch_id`, `batch_code`, `batch_position`, `created_via_batch`).
   En `getArtisanProducts`, quitar `batch_code` del filtro de bÃºsqueda `.or(...)`.
   En `getArtisanProductStats`, eliminar los conteos de lote (o eliminar la funciÃ³n
   si la stats bar desaparece).
2. **`artisanQueries.ts`** â€” eliminar los hooks de lote y, en
   `invalidatePublicProductCaches`, dejar de invalidar
   `queryKeys.artisan.productBatches`. Quitar la entrada correspondiente de
   **`src/lib/query/queryKeys.ts`**.
3. **Tipos** â€” borrar `src/types/productBatch.ts` completo. En
   **`src/types/artisan.ts`** quitar `batch_id`, `batch_code`, `batch_position`,
   `created_via_batch` de `ArtisanProduct` y `ArtisanProductInput`. Revisar
   `src/types/public.ts` y `src/types/admin.ts` por los mismos campos.
4. **Borradores** (`productDraftUtils.ts`, `imageEditorTypes.ts`) â€” quitar de
   `ProductImageDraft` y de los tipos persistidos: `useCustomProductData`,
   `productTitle`, `productPrice`, `productStockQuantity`, `productDescription`,
   `existingProductId`, `splitProductsByImage`, `editingBatchId`, `editingBatchCode`,
   y las funciones `resolveDraftProductData`, `applyDraftProductSnapshot`,
   `createDraftProductDataSnapshot`. **Importante**: la hidrataciÃ³n debe seguir
   tolerando borradores viejos en IndexedDB que traigan esos campos (simplemente
   ignorarlos; no romper si estÃ¡n presentes).
5. **Selects hardcodeados** â€” quitar `batch_id, batch_code, batch_position,
   created_via_batch` de las cadenas select de
   `src/features/public/publicClient.ts:30` y `src/features/buyer/buyerClient.ts:24`.
6. **Admin** â€” limpiar el rastro de lotes del panel admin:
   - `adminDashboardUtils.ts`: quitar el panel `"batches"`, `BatchSummary`,
     `buildBatchSummaries`, `filterAndSortBatches`.
   - `DashboardDetailDrawer.tsx` y `DashboardMetricsGrid.tsx`: quitar panel y mÃ©tricas
     de lotes.
   - `adminClient.ts` (lÃ­neas ~675, ~748, ~756): quitar `batch_id`/`batch_code` de los
     selects y del filtro de bÃºsqueda.
   - `adminProductControlUtils.ts`: quitar `batchLabel` y su uso en etiquetas.
   - `AdminDashboardPage.tsx`: quitar el cableado del panel de lotes.
7. **BÃºsqueda final de residuos**: `grep -ri "batch" src/` debe devolver **cero**
   resultados (o solo falsos positivos justificados y documentados). Repetir con
   `splitProducts`, `useCustomProductData`, `productBatch`.

## Fase 3 â€” MigraciÃ³n de base de datos

En una migraciÃ³n nueva (`supabase/migrations/`), siguiendo el protocolo de
`docs/DB_SAFETY.md` y solo tras confirmar la Fase 0:

1. `drop function` de `create_product_batch`, `update_product_batch`,
   `delete_product_batch` y `generate_product_batch_code`.
2. `drop table public.product_batches` (verificar polÃ­ticas RLS y triggers asociados
   dentro de `20260527000015_015_product_batches.sql` para revertirlos todos).
3. `alter table public.products drop column batch_id, drop column batch_code,
   drop column batch_position, drop column created_via_batch` (revisar Ã­ndices o
   constraints que dependan de esas columnas).
4. Revisar si otras migraciones/vistas (`artisan_storefronts_view`, funciones de
   checkout) referencian esas columnas antes de dropear; ajustar en la misma
   migraciÃ³n si hace falta.
5. La migraciÃ³n se aplica al proyecto Supabase real **solo** con el backend
   identificado y confirmado (regla principal del README). El frontend de las fases
   1â€“2 funciona igual aunque la migraciÃ³n tarde en aplicarse (las columnas dropeadas
   ya no se seleccionan), asÃ­ que puede desplegarse el frontend primero.

## Fase 4 â€” Mejoras, bugs y deuda tÃ©cnica

Con el sistema ya simplificado (sin lotes, el orquestador pierde ~un tercio de su
estado), encarar en este orden:

1. **Limpiar el cÃ³digo muerto alrededor de `removeArtisanProductImages` (hallazgo 6.1)**.
   DecisiÃ³n recomendada: mantener la polÃ­tica append-only pero sincerar el cÃ³digo â€”
   eliminar la funciÃ³n no-op y todos sus call-sites (rollbacks en el submit, limpieza
   post-delete, mensajes "no pudimos quitar fotos viejas" imposibles). Documentar en
   el propio cÃ³digo (un comentario en el punto de subida) que el storage es
   append-only por diseÃ±o. Alternativa si se prefiere borrado real: mover el borrado
   a una Edge Function con service role â€” decisiÃ³n del dueÃ±o, no tomarla en caliente.
2. **Eliminar vestigios del refresh manual (hallazgo 6.8)**: quitar
   `refreshProductsAndBatches` (stub), el parÃ¡metro `refreshed` de
   `finalizeSuccessfulSave` y el mensaje de "no pudimos refrescar".
3. **Acotar `isMissingColumnError` (hallazgo 6.5)**: si las migraciones de
   `product_attributes` y `made_to_order_options` ya estÃ¡n aplicadas en producciÃ³n,
   eliminar los fallbacks por completo. Si no se puede confirmar, restringir el match
   a `code === "PGRST204"` exclusivamente.
4. **Debounce + fix de carrera en el autosave de borradores (hallazgo 6.4)**:
   - Debounce de ~800 ms en el efecto de persistencia (los blobs ya se cachean por
     referencia; el debounce evita una escritura de IndexedDB por tecla).
   - Fix de la carrera: incorporar un token/generaciÃ³n (ref numÃ©rica que se
     incrementa en `resetForm`/`discardDraft`); `persistDraft` solo escribe si su
     token sigue vigente al momento de guardar.
5. **Dividir `ArtisanProductsPage.tsx`** (tras las fases 1â€“2 quedarÃ¡ mÃ¡s chico; meta
   final: ningÃºn archivo del feature > ~400 lÃ­neas). Extraer hooks cohesivos:
   - `useProductDraftPersistence(draftKey, form, images)` â†’ carga, autosave,
     descartar (estados `hasDraft`, `isDraftReady`, `draftPersistenceState`).
   - `useProductImageDrafts()` â†’ selecciÃ³n bulk/individual, remove, reorder,
     revocaciÃ³n de object URLs, Ã­ndices de crop (`activeCropIndex`,
     `targetImageIndex`, `dragState`).
   - `useProductEditing()` â†’ `startEditing`, deep-link `?productId`, estado de
     ediciÃ³n.
   La pÃ¡gina queda como composiciÃ³n de esos hooks + render.
6. **Dividir `ArtisanProductFormSection.tsx`** (~1.085 lÃ­neas hoy) en subcomponentes:
   campos base, atributos, opciones bajo demanda, secciÃ³n de imÃ¡genes, secciÃ³n de
   modelo 3D. Sin cambiar comportamiento; solo extracciÃ³n con props tipadas.
7. **Paralelizar subidas de imÃ¡genes (hallazgo 6.3)**: dentro de cada imagen mantener
   la secuencia (original â†’ comprimida â†’ thumb comparten datos), pero procesar
   imÃ¡genes distintas con concurrencia limitada (p. ej. 3 a la vez con un pool
   simple). Preservar el orden de `uploadedMedia` por Ã­ndice, no por orden de
   finalizaciÃ³n. Mantener el retry existente por archivo.
8. **Unificar textos de usuario** (hallazgo 6.8): pasada Ãºnica sobre los mensajes del
   feature normalizando espaÃ±ol rioplatense con tildes ("RevisÃ¡", "catÃ¡logo").
9. **Opcional, si el dueÃ±o lo aprueba** (dejar para el final, cada uno es decisiÃ³n de
   producto): validaciÃ³n server-side del producto individual (constraint o trigger de
   tÃ­tulo/precio), y mover el modelo 3D a un bucket propio con lÃ­mite en backend.

## Fase 5 â€” VerificaciÃ³n final

1. `npm run preflight` y `npm run build` sin warnings nuevos.
2. Prueba manual del flujo completo: crear producto con varias fotos (bulk y
   reemplazo individual), recortar, subir modelo 3D, guardar; editar producto
   existente quitando/agregando fotos; cerrar el navegador a mitad de carga y
   verificar restauraciÃ³n del borrador; borrar producto; verificar catÃ¡logo pÃºblico
   actualizado (invalidaciÃ³n de cachÃ©).
3. Verificar que un borrador viejo de IndexedDB (con campos batch) no rompe la
   hidrataciÃ³n: probar en un navegador que haya usado la versiÃ³n anterior o
   inyectar un registro de prueba con esos campos.
4. Como admin: gestionar productos de un vendedor (`/admin/...:artisanId`), dashboard
   sin panel de lotes, control de productos sin `batchLabel`.
5. `grep -ri "batch" src/ supabase/functions/` â†’ cero resultados. En
   `supabase/migrations/` es esperable que las migraciones histÃ³ricas mencionen
   lotes: **no se reescriben migraciones ya aplicadas**; la eliminaciÃ³n vive en la
   migraciÃ³n nueva de la Fase 3.
6. Actualizar la documentaciÃ³n que mencione lotes: este archivo (secciones 2â€“6),
   `docs/BACKEND_MAP.md` y `contexto/` si corresponde.

## GuÃ­a operativa para el agente ejecutor (leer antes de empezar)

Reglas para ejecutar este plan con eficiencia, sin re-explorar lo ya relevado:

1. **Este documento ya es la exploraciÃ³n.** Las secciones 1â€“6 resumen el sistema
   archivo por archivo. No re-auditar ni releer archivos completos para "entender el
   contexto": usar la tabla de la secciÃ³n 2 y abrir solo el archivo que se estÃ¡
   modificando, idealmente por rangos (el punto exacto ya estÃ¡ indicado con
   `archivo:lÃ­nea` en los hallazgos).
2. **Buscar con grep, no leyendo.** Para localizar usos de un sÃ­mbolo a eliminar,
   usar bÃºsqueda de texto (`grep -rn "nombreSimbolo" src/`) y abrir solo los hits.
   Nunca leer `node_modules/`, `dist/`, `package-lock.json` ni `assets-source/`.
3. **El compilador es el detector de cÃ³digo muerto.** Al eliminar un sÃ­mbolo, borrar
   primero la definiciÃ³n y dejar que `npm run preflight` (typecheck + lint) seÃ±ale
   todos los call-sites rotos. Es mÃ¡s barato y mÃ¡s confiable que buscar los usos a
   mano.
4. **VerificaciÃ³n escalonada**: `npx tsc --noEmit` (rÃ¡pido) tras cada grupo de
   cambios; `npm run preflight` al cerrar cada fase; `npm run build` solo al cerrar
   cada fase, no en cada paso intermedio.
5. **No ampliar el alcance.** Si al tocar un archivo aparece deuda no listada en la
   Fase 4, anotarla en la secciÃ³n "Notas de ejecuciÃ³n" de abajo y seguir. No
   refactorizar en caliente cosas fuera del plan.
6. **Puntos de decisiÃ³n = frenar y preguntar.** Solo hay tres: (a) la Fase 0 detecta
   datos de lotes existentes; (b) la polÃ­tica de borrado de imÃ¡genes (Fase 4.1,
   alternativa Edge Function); (c) los opcionales de la Fase 4.9. Todo lo demÃ¡s estÃ¡
   decidido en este documento â€” no volver a preguntar.
7. **Commits chicos con el formato del historial del repo** (mensajes en espaÃ±ol,
   imperativos). Un commit nunca deja el build roto.
8. **Actualizar el checklist de abajo al terminar cada Ã­tem.** Es la memoria entre
   sesiones: una sesiÃ³n nueva debe poder retomar leyendo solo este documento y el
   checklist, sin re-derivar en quÃ© quedÃ³ el trabajo.

## Estado de ejecuciÃ³n (actualizar al avanzar)

- [x] Fase 0 - Supuestos verificados (confirmado: 2026-07-13)
- [x] Fase 1 - Lotes fuera de UI y orquestacion
- [x] Fase 2.1-2.4 - Clients, queries, tipos y borradores limpios
- [x] Fase 2.5-2.6 - Selects public/buyer y admin limpios
- [x] Fase 2.7 - Sin referencias batch en src/
- [x] Fase 3 - Migracion creada
- [x] Fase 3 - Migracion aplicada al backend confirmado
- [x] Fase 4.1 â€” CÃ³digo muerto de borrado de imÃ¡genes eliminado
- [x] Fase 4.2 â€” Vestigios de refresh manual eliminados
- [ ] Fase 4.3 â€” `isMissingColumnError` acotado o eliminado
- [ ] Fase 4.4 â€” Autosave con debounce y carrera resuelta
- [ ] Fase 4.5 â€” `ArtisanProductsPage` dividido en hooks
- [ ] Fase 4.6 â€” `ArtisanProductFormSection` dividido
- [ ] Fase 4.7 â€” Subidas paralelizadas con orden preservado
- [ ] Fase 4.8 â€” Textos unificados
- [ ] Fase 5 â€” VerificaciÃ³n final completa y docs actualizadas

### Notas de ejecuciÃ³n

- 2026-07-13: Fase 4.1-4.2. Se conserva Storage append-only por la migraciÃ³n 020;
  se retirÃ³ el rollback no operativo y sus mensajes. Las mutations de React Query
  invalidan la lista, por lo que se eliminÃ³ el refresh stub.

## Criterios de aceptaciÃ³n

- No existe en `src/` ninguna referencia a batches/lotes/"un producto por foto".
- El flujo individual (multi-foto) funciona idÃ©ntico a antes: crear, editar,
  borradores, crop, 3D, modo admin.
- `products` sin columnas batch; sin tabla `product_batches` ni RPCs de lote (tras
  aplicar la migraciÃ³n).
- NingÃºn archivo del feature de carga supera ~400 lÃ­neas.
- Los hallazgos 6.1, 6.3, 6.4, 6.5 y los vestigios de 6.8 quedan resueltos o
  explÃ­citamente descartados con justificaciÃ³n escrita en este documento.

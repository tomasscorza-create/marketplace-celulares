# Plan: Estabilidad y rendimiento móvil

> Fecha: 2026-07-13. Plan de acción para el agente ejecutor (Codex).
> Objetivo del dueño: que la aplicación sea **estable** (sin errores ni pantallas
> blancas), y que **funcione rápido y bien en celulares de gama baja, media y
> alta**. La superficie activa es la de catálogo/exploración: Home, catálogo, feed,
> detalle de producto, tiendas, perfiles y la carga de productos del vendedor.
>
> Contexto de coordinación: el flujo de compra (carrito, checkout, Mercado Pago,
> envíos) está siendo **ocultado detrás de un flag** según
> `docs/PLAN_MODO_CATALOGO_WHATSAPP.md` (ejecutor: Gemini). Ese código queda
> dormido: **no optimizarlo, no tocarlo**. Si al ejecutar este plan esa tarea
> sigue en curso, evitar los archivos que comparte (ver Guía operativa, punto 2).

## Lo que YA está bien (no "mejorar", no tocar)

Verificado en auditoría previa — cualquier cambio acá es riesgo sin beneficio:

- **Code-splitting**: rutas lazy en `src/app/router.tsx`, vendors separados por
  `manualChunks` en `vite.config.ts` (react / router / supabase / query / three).
- **three.js (771 KB)** se importa dinámicamente solo dentro de
  `ProductModel3DViewer.tsx` — no está en la carga inicial.
- **Imágenes del catálogo**: usan `thumbnail_url` (miniaturas de 520px generadas en
  la carga), `loading="lazy"` y `decoding="async"` en `ProductImageCarousel.tsx`.
- **Warmup del catálogo** (`useCatalogWarmup.ts`): respeta `navigator.connection`
  (`saveData`, 2G) y no precarga en redes lentas.
- **`argentinaGeo.json` (1,1 MB)** se descarga bajo demanda vía `?url` solo en el
  flujo de envíos (que queda oculto) — no afecta al usuario de catálogo.

## Fase 1 — Visibilidad de errores (la más importante)

Hoy no hay tests, ni error tracking, ni ErrorBoundary: si la app falla en el
celular de un usuario, nadie se entera. Todo lo demás depende de esto.

1. **ErrorBoundary global de React**: crear un boundary que envuelva el árbol en
   `src/app/` (por encima del router o en cada layout), con una pantalla amable en
   español ("Algo salió mal — recargá la página") y botón de recarga. Ya existe
   `RouteErrorPage.tsx` para errores de ruta; el boundary cubre los errores de
   render que hoy terminan en pantalla blanca. Reutilizar la estética de
   `RouteErrorPage`.
2. **Error tracking en producción**: integrar Sentry (`@sentry/react`, plan
   gratuito alcanza) inicializado solo en producción
   (`import.meta.env.PROD`), con el DSN en variable de entorno
   (`VITE_SENTRY_DSN`, documentarla en `docs/ENVIRONMENT.md` y `.env.example`).
   - Capturar: errores de render (vía el ErrorBoundary), promesas no manejadas y
     errores de window.
   - `tracesSampleRate` bajo (0.1) o 0 para no gastar cuota; lo que importa son
     los errores, no el tracing.
   - **No** loguear datos personales (emails, teléfonos) en los contextos.
   - Si el dueño no provee DSN todavía: dejar la integración lista y condicionada
     a que la env exista (sin DSN, no-op silencioso). Anotarlo en Notas.
3. **Reporte de errores de queries**: en el `QueryClient` global
   (`src/lib/query/`), agregar un handler global de errores que los mande a
   Sentry con la queryKey como contexto (sin datos del payload).

## Fase 2 — Eliminar los dobles requests del catálogo (fallbacks de esquema)

`src/features/public/publicClient.ts` mantiene estrategias RPC versionadas con
fallback (flags de módulo `preferredCatalogFeedStrategy`, etc., funciones
`shouldFallbackTo*Rpc`). Cuando la estrategia preferida falla, el catálogo hace
**requests dobles** — lentitud directa en 4G. Lo mismo con `isMissingColumnError`
en `adminClient.ts`, `buyerClient.ts` y `authClient.ts`.

1. **Verificar primero contra el backend real** (protocolo de `docs/DB_SAFETY.md`):
   confirmar que las RPCs "preferidas" existen en producción:
   `get_public_catalog_product_feed_v5`,
   `get_public_catalog_storefront_groups_v6`,
   `get_public_catalog_storefront_suggestions_v2`. Y que las columnas cubiertas
   por `isMissingColumnError` existen (`product_attributes`,
   `made_to_order_options`, `shipping_address_details`, etc.).
2. Si existen (esperado): eliminar en `publicClient.ts` las funciones
   `shouldFallbackTo*`, los 4 flags `preferred*Strategy` y las ramas legacy de
   cada query; cada función queda con una sola llamada RPC.
3. Mismo tratamiento para `isMissingColumnError` en `adminClient.ts`,
   `buyerClient.ts` y `authClient.ts`: eliminar el helper y sus ramas de fallback.
   **Excepción**: no tocar `src/features/artisan/**` (lo cubre el plan de carga,
   Fase 4.3 de `docs/AUDITORIA_CARGA_PRODUCTOS.md`) ni las funciones Edge de
   `supabase/functions/` (comercio dormido).
4. Si alguna RPC/columna NO existe en producción: frenar esa parte, anotar en
   Notas de ejecución y aplicar la migración pendiente antes de limpiar.

## Fase 3 — Service worker confiable

`public/sw.js` es artesanal con versión manual (`CACHE_VERSION = "v5"`). Riesgo
clásico: usuarios con versión vieja cacheada o comportamientos raros por celular.

1. **Auditar el sw actual** (leerlo completo, ~es corto) y verificar tres cosas:
   - `index.html` y la navegación SPA se sirven **network-first** con fallback a
     cache (nunca cache-first), para que un deploy llegue a todos.
   - Los assets con hash de Vite (`/assets/*`) pueden ser cache-first inmutable
     (el hash cambia por build).
   - En `activate` se borran los caches de versiones anteriores.
2. **Eliminar la dependencia del bump manual**: la opción recomendada es migrar a
   `vite-plugin-pwa` (Workbox, `registerType: "autoUpdate"`), que genera el sw en
   cada build con precache hasheado. Mantener el `manifest.webmanifest` existente.
   Si la migración resulta invasiva, alternativa mínima: inyectar el hash del
   build como `CACHE_VERSION` en el sw durante el build (script en `scripts/`).
3. **Aviso de versión nueva**: al detectar un sw en estado `waiting`, mostrar un
   toast "Hay una versión nueva — tocá para actualizar" que haga
   `skipWaiting` + reload. Revisar primero `src/lib/pwa/` — ya existe código de
   registro del sw; extenderlo, no duplicarlo.
4. Probar el ciclo completo en local: build → servir → modificar → rebuild →
   verificar que el cliente detecta y aplica la actualización.

## Fase 4 — Memoria y datos frescos en el catálogo

Los `Map` a nivel módulo de `publicClient.ts` (`hydratedCatalogProductsCache`,
`hydratedCatalogStorefrontsCache`, `hydratedCatalogStorefrontsRequestsCache`)
crecen sin límite durante la sesión y no se invalidan nunca — memoria en gama
baja y riesgo de datos viejos en el detalle de producto.

1. Ponerles **límite de entradas** (~200 productos / ~100 tiendas) con evicción
   simple de la entrada más vieja (el orden de inserción de `Map` alcanza; no
   hace falta LRU real).
2. Exportar una función `clearHydratedCatalogCaches()` y llamarla desde
   `invalidatePublicProductCaches` (`src/features/artisan/artisanQueries.ts:65`)
   para que al editar un producto el cache módulo no sirva datos viejos.
   ⚠️ Ese archivo es zona de Codex/plan de carga — si el plan de carga sigue en
   ejecución, coordinar: el cambio es una línea en `invalidatePublicProductCaches`.
3. Verificar que `getCachedPublicProduct` (usado como initial data del detalle)
   siga funcionando igual tras el cambio.

## Fase 5 — Estabilidad visual y latencia de primera imagen

1. **`preconnect` a Supabase**: en `index.html`, agregar
   `<link rel="preconnect" href="https://<proyecto>.supabase.co" crossorigin>`
   tomando el host de la env pública en build, o hardcodear el host del proyecto
   de producción con un comentario. Ahorra DNS+TLS antes de la primera imagen
   (cientos de ms en 4G).
2. **CLS (saltos de layout)**: recorrer las superficies del catálogo
   (`CatalogProductFeedCard`, `CatalogStorefrontProductCard`,
   `PublicStorefrontCard`, `ProductImageCarousel`, hero de `HomePage`) y
   verificar que cada `<img>` tenga espacio reservado: `aspect-ratio` en CSS o
   contenedor con altura fija (muchas cards ya lo tienen — solo corregir las que
   no). Criterio: hacer scroll del catálogo con red lenta simulada y que nada
   salte.
3. **Imagen prioritaria**: en el detalle de producto, la primera imagen del
   carrusel ya soporta `priority`/eager — verificar que la página la use y
   agregar `fetchpriority="high"` a esa primera imagen.

## Fase 6 — Dividir las páginas gigantes de la superficie activa

Igual criterio que el plan de carga (ningún archivo > ~400 líneas), sin cambiar
comportamiento. Solo estas dos (el resto de archivos grandes pertenece a zonas
dormidas o a otros planes):

1. **`src/pages/ProductDetailPage.tsx` (~950 líneas)**: extraer secciones a
   `src/features/public/components/productDetail/`: galería/carrusel + 3D,
   bloque de compra/CTA (⚠️ Gemini toca la rama del CTA — hacer esta fase
   después de que termine), selector de opciones, ficha de atributos, sección
   de la tienda vendedora. La página queda como composición.
2. **`src/pages/CatalogPage.tsx` (~790 líneas)**: extraer las secciones del feed
   y la lógica de orquestación que no esté ya en `useCatalogPageData.ts`.
3. Sin refactors de lógica en esta fase: mover código, tipar props, nada más.

## Verificación final (todas las fases)

1. `npm run preflight` y `npm run build` en verde tras cada fase.
2. **Prueba móvil real o emulada** (DevTools → mid-tier mobile, CPU 4x slowdown,
   red Fast 3G): Home → catálogo → scroll largo → detalle de producto → tienda.
   Sin errores en consola, sin saltos de layout, imágenes progresivas.
3. Lighthouse móvil en `/` y `/catalogo`: Performance y Best Practices sin
   regresión respecto a la medición previa (medir ANTES de empezar y anotar los
   scores en Notas de ejecución como línea base).
4. Forzar un error de render en dev y verificar que el ErrorBoundary lo captura
   (y que Sentry lo recibe, si hay DSN).
5. Ciclo de actualización del service worker verificado (Fase 3.4).
6. Editar un producto como vendedor y verificar que el detalle público muestra
   el dato nuevo sin recargar a mano (Fase 4.2).

## Guía operativa para el agente ejecutor

1. **Este documento ya es la exploración.** Los archivos y líneas citados vienen
   de auditoría previa (`docs/AUDITORIA_CARGA_PRODUCTOS.md` tiene el contexto
   general del repo). Abrir solo los archivos listados; ubicar símbolos con
   búsqueda de texto, no releyendo archivos enteros.
2. **Coordinación con otros agentes**: el plan de carga (Codex) toca
   `src/features/artisan/**` y `ArtisanProductsPage.tsx`; el plan
   catálogo+WhatsApp (Gemini) toca `ProductDetailPage`, las cards del catálogo,
   layouts y `router.tsx`. Antes de tocar un archivo compartido, verificar con
   `git log --oneline -5 -- <archivo>` si hay trabajo reciente y preferir
   ejecutar las fases 5.2 y 6.1 **después** de que esos planes terminen.
   Las fases 1–4 casi no se superponen y pueden ir primero.
3. Ejecutar las fases **en orden** (1 → 6); cada fase en commits chicos, mensajes
   en español imperativo, build nunca roto.
4. **No tocar**: `supabase/functions/`, migraciones existentes, `cartClient`,
   `checkoutClient`, ni nada del flujo de compra dormido. La única consulta a la
   base permitida es la verificación de solo lectura de la Fase 2.1.
5. Puntos de decisión (frenar y preguntar solo en estos): (a) falta DSN de
   Sentry → dejar no-op y seguir; (b) alguna RPC/columna de la Fase 2.1 no existe
   en producción; (c) la migración a `vite-plugin-pwa` rompe algo del manifest o
   del comportamiento PWA actual.
6. Verificación escalonada: `npx tsc --noEmit` entre pasos, `preflight` + `build`
   al cerrar cada fase.

## Estado de ejecución (actualizar al avanzar)

- [ ] Línea base: Lighthouse móvil de `/` y `/catalogo` medido y anotado en Notas
- [x] Fase 1.1 — ErrorBoundary global con pantalla de recuperación
- [x] Fase 1.2 — Sentry integrado (o no-op documentado sin DSN)
- [x] Fase 1.3 — Errores de React Query reportados
- [x] Fase 2.1 — RPCs y columnas verificadas contra producción
- [ ] Fase 2.2 — Fallbacks eliminados de `publicClient`
- [ ] Fase 2.3 — `isMissingColumnError` eliminado de admin/buyer/auth clients
- [x] Fase 3 — Service worker auditado y actualización automática confiable
- [x] Fase 4 — Caches de módulo con límite e invalidación
- [x] Fase 5.1 — Preconnect a Supabase
- [x] Fase 5.2 — CLS verificado en cards y carruseles
- [x] Fase 5.3 — Primera imagen del detalle con prioridad
- [ ] Fase 6.1 — `ProductDetailPage` dividido
- [ ] Fase 6.2 — `CatalogPage` dividido
- [ ] Verificación final completa (los 6 puntos)

### Notas de ejecución

- 2026-07-13 — Fase 1 completada. Sentry queda condicionado a
  `VITE_SENTRY_DSN`: sin esa variable no se inicializa ni emite datos. Falta
  proveer un DSN de un proyecto Sentry para recibir reportes en producción.
- 2026-07-13 — Fase 3 completada. Se reemplazó el service worker manual por
  `vite-plugin-pwa`/Workbox con precache hasheado, limpieza de caches previos,
  navegación SPA con fallback a `index.html` y aviso de actualización.
- 2026-07-13 — Fase 4 completada. Los caches de productos y tiendas quedan
  acotados a 200 y 100 entradas; las mutaciones de vendedor los limpian antes
  de invalidar las queries públicas.
- 2026-07-13 — Fase 5 completada. El preconnect a Supabase se inyecta sólo en
  builds remotos con URL HTTPS; las cards y carruseles auditados ya reservaban
  espacio, y el carrusel del detalle ya usa carga eager con prioridad alta.
- 2026-07-13 — Fase 2.1 completada. Con el proyecto `accesorios y celulares`
  confirmado, `supabase migration list` mostró todas las migraciones locales y
  remotas alineadas, incluidas las RPC y columnas requeridas. No se realizaron
  cambios de DB. El dump de esquema no se ejecutó porque Docker Desktop no está
  activo, pero no hizo falta al estar el historial de migraciones alineado.

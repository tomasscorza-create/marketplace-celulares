# Plan: Modo catálogo + ventas por WhatsApp

> Fecha: 2026-07-13. Plan de acción para el agente ejecutor (Gemini).
> Objetivo definido por el dueño: **ocultar** (no borrar) todo el flujo de compra
> dentro de la página — carrito, checkout, Mercado Pago, envíos — y dejar la web
> como catálogo de exploración/descubrimiento, con un **botón de WhatsApp dentro de
> cada producto** como único canal de pedido. Las ventas y envíos se coordinan por
> WhatsApp.
>
> **Regla de oro: nada del sistema de compras se elimina.** Todo se esconde detrás
> de un flag de configuración para poder reactivarlo en el futuro cambiando un solo
> valor. Si en algún paso la única solución parece ser borrar código, frenar y
> preguntar.

## Contexto mínimo (ya relevado — no re-explorar)

El sistema de compra existente funciona así: `AddToCartButton`
(`src/features/buyer/components/AddToCartButton.tsx`) agrega al carrito y navega a
`/panel/comprador/carrito` (`BuyerCartPage`), desde donde se dispara el checkout de
Mercado Pago (funciones Edge). Ya existe un botón flotante de WhatsApp global:
`src/components/WhatsAppButton.tsx`, con número real configurado
(`WHATSAPP_PHONE = "5493518598675"`) y helpers exportados `buildWhatsAppUrl` /
`buildWhatsAppUrlForPhone` que normalizan números argentinos. Se monta en
`PublicLayout.tsx:127`.

### Todos los puntos de entrada de compra en la UI (mapa completo)

| Superficie | Archivo / línea | Qué hay hoy |
| --- | --- | --- |
| Detalle de producto | `src/pages/ProductDetailPage.tsx:774` | `AddToCartButton` grande ("Comprar"), rama `isEditingCartItem` ("Guardar cambios"), y texto "Siguiente paso" con copy de compra (~línea 805–820). |
| Feed del catálogo | `src/features/public/components/CatalogProductFeedCard.tsx:224` y `:323` | Dos `AddToCartButton` compactos ("Agregar"/"Carrito"). |
| Card de producto por tienda | `src/features/public/components/CatalogStorefrontProductCard.tsx:142` | `AddToCartButton` compacto. |
| Slot de preview 3D | `src/features/public/components/CatalogProduct3DPreviewSlot.tsx:97` | `AddToCartButton`. |
| Header público | `src/layouts/PublicLayout.tsx:102` (`BuyerCartShortcut`) y `:46` (nav a `/panel/comprador`) | Acceso al carrito ("Ir a pagar") y al panel de pedidos. |
| Menú de usuario | `src/features/auth/AuthStatus.tsx:166–170` | Links "Mis pedidos" (`/panel/comprador`) y "Mi carrito". |
| Nav del panel comprador | `src/layouts/BuyerLayout.tsx:4–6` | Tabs "Mis pedidos" y "Carrito". |
| Rutas | `src/app/router.tsx:249–278` | `/panel/comprador` (dashboard de pedidos), `pedidos/:orderId`, `carrito`, `cuenta`, `cuenta/contacto`. Y rutas públicas `checkout/exito|pendiente|fallo` (`router.tsx:176–186`). |
| Página de cuenta comprador | `src/pages/BuyerAccountPage.tsx:363` y `:473` | Links a pedidos y a datos de contacto/envío. |
| Datos de contacto/envío | `src/pages/BuyerContactPage.tsx` | Formulario de dirección de envío + geocoding (es parte del flujo de checkout). |
| Registro | `src/pages/RegistroPage.tsx`, `RegistroCompradorPage.tsx` | Copys que prometen "comprar" (revisar textos, no estructura). |
| Copys varios | `AddToCartButton.tsx` ("Ingresar para comprar"), `ProductDetailPage` ("Sin stock" queda OK) | Textos orientados a compra. |

Nota: los paneles de **vendedor** (`/panel/vendedor/ventas`) y **admin**
(`/panel/admin/ventas`, `facturacion`) muestran ventas históricas del sistema
anterior. Son internos, no compradores los ven. **No tocarlos** salvo el punto
opcional de la Fase 4.

## Estrategia

Un único flag en `src/config/marketplace.ts`:

```ts
// Canal de venta activo. "whatsapp" oculta carrito/checkout de la UI
// (el código y el backend quedan intactos); "checkout" restaura la compra online.
salesChannel: "whatsapp" as "whatsapp" | "checkout",
```

Y un helper derivado para legibilidad en los componentes:

```ts
// src/config/marketplace.ts (o donde prefiera el convenio del repo)
export const isOnlinePurchaseEnabled = marketplaceConfig.salesChannel === "checkout";
```

Todo el ocultamiento se hace condicionando con `isOnlinePurchaseEnabled`. Cero
borrado. Volver al modo compra = cambiar un string.

## Fase 1 — Flag + botón de WhatsApp por producto

1. Agregar `salesChannel` y `isOnlinePurchaseEnabled` a
   `src/config/marketplace.ts` como arriba.
2. Mover el número `WHATSAPP_PHONE` desde `WhatsAppButton.tsx` a
   `marketplaceConfig` (p. ej. `whatsappPhone: "5493518598675"`) y que
   `WhatsAppButton.tsx` lo importe de ahí, para tener un solo lugar de
   configuración. Los helpers `buildWhatsAppUrl`/`buildWhatsAppUrlForPhone` quedan
   donde están.
3. Crear `src/components/WhatsAppProductButton.tsx`: botón CTA para usar dentro de
   producto (no flotante). Props: `product` (título, precio, id), `variant`
   (`"full"` para el detalle, `"compact"` para cards del catálogo) y `className`
   para heredar los estilos de los botones que reemplaza. Comportamiento:
   - Construye el mensaje con `buildWhatsAppUrl`, por ejemplo:
     `Hola! Quiero pedir: <título> (<precio formateado>) — <URL pública del producto>`.
   - La URL pública del producto es `/producto/<id>`; revisar `src/lib/publicUrls.ts`
     por si ya existe un builder de URL absoluta y reutilizarlo.
   - `target="_blank"` + `rel="noopener noreferrer"`, estética verde WhatsApp
     coherente con `WhatsAppButton` existente (reutilizar el SVG del ícono,
     extraerlo a un subcomponente compartido si hace falta).
   - No depende de auth: funciona para visitantes anónimos (ese es el punto: pedir
     sin cuenta).

## Fase 2 — Reemplazar los CTAs de compra por el botón de WhatsApp

En cada punto, el patrón es el mismo: `isOnlinePurchaseEnabled ? <UI actual sin
cambios> : <WhatsAppProductButton>`. No tocar la rama actual.

1. **`ProductDetailPage.tsx`** (la más importante):
   - Rama compradora/anónima (`:738–801`): cuando el flag está apagado, renderizar
     `WhatsAppProductButton variant="full"` en lugar de `AddToCartButton` /
     "Guardar cambios". La rama `isEditingCartItem` solo es alcanzable desde el
     carrito, que quedará oculto, pero condicionarla igual por consistencia.
   - Incluir en el mensaje de WhatsApp las opciones seleccionadas si el producto
     tiene variantes (`selectedOptionsSummary` ya se computa en la página) — el
     selector de opciones (`:824+`) **se mantiene visible**: sirve para que el
     cliente arme su pedido antes de mandar el mensaje.
   - Bloque "Siguiente paso" (`:805–820`): con flag apagado, cambiar el copy a algo
     como "Escribinos por WhatsApp para coordinar tu pedido y la entrega".
   - Si el producto está sin stock, mostrar el botón WP igualmente con label
     "Consultar disponibilidad".
2. **`CatalogProductFeedCard.tsx`** (`:224` y `:323`): reemplazar ambos
   `AddToCartButton` por `WhatsAppProductButton variant="compact"` (o, si el
   diseño queda cargado, por un link "Ver producto" al detalle — decisión de
   diseño menor, elegir lo que mejor respete el layout actual).
3. **`CatalogStorefrontProductCard.tsx:142`** y
   **`CatalogProduct3DPreviewSlot.tsx:97`**: mismo reemplazo compacto.
4. Verificar con `grep -rn "AddToCartButton" src/` que no queden usos sin
   condicionar (el componente en sí NO se borra).

## Fase 3 — Ocultar carrito, pedidos y checkout de la navegación

1. **`PublicLayout.tsx`**: con flag apagado, no renderizar `BuyerCartShortcut`
   (`:102`) y quitar del nav el item hacia `/panel/comprador` (`:46`). El botón
   flotante `WhatsAppButton` global **se mantiene**.
2. **`AuthStatus.tsx:166–170`**: ocultar los links "Mis pedidos" y "Mi carrito"
   del menú de usuario. Mantener acceso a "Mi cuenta"/perfil si existe.
3. **`BuyerLayout.tsx`**: con flag apagado, filtrar los tabs "Mis pedidos" y
   "Carrito"; dejar "Cuenta". (El panel comprador sigue existiendo como gestión de
   cuenta/perfil.)
4. **Rutas** (`router.tsx`): NO borrar rutas. Con flag apagado, en las rutas
   `carrito`, `pedidos/:orderId` y el index de `/panel/comprador`, y en
   `checkout/exito|pendiente|fallo`, renderizar un `<Navigate to="/catalogo" replace />`
   (o un pequeño wrapper `CommerceRouteGate` que haga exactamente eso cuando
   `!isOnlinePurchaseEnabled`). Así nadie llega por URL directa y el código de las
   páginas queda intacto.
   - `cuenta` y `cuenta/contacto` quedan accesibles (datos de perfil), pero en
     `BuyerContactPage` ocultar la sección de dirección de envío/geocoding si es
     separable con un condicional simple; si está muy entrelazada, dejarla — no es
     dañina.
5. **`BuyerAccountPage.tsx:363,:473`**: condicionar los links a pedidos/contacto de
   envío igual que el resto.
6. **Copys de registro** (`RegistroPage`, `RegistroCompradorPage`): ajustar textos
   que prometan "comprar en la página" hacia "guardar favoritos / explorar /
   pedir por WhatsApp" según el copy existente. Cambios de texto, no de estructura.

## Fase 4 — Lo que NO se toca (y decisiones abiertas)

- **No tocar**: funciones Edge de Mercado Pago, `cartClient`, `checkoutClient`,
  `cartQueries`, migraciones, tablas, ni ningún archivo de `supabase/`. Todo el
  backend de compra queda dormido e intacto.
- **No tocar**: paneles de vendedor y admin (ventas, facturación). Ven datos
  históricos y no son visibles para compradores.
- **Decisión abierta 1 (preguntar al dueño solo si bloquea)**: el número de WhatsApp
  es único y central (coordinación centralizada). Si en el futuro cada vendedor
  quiere su propio número, hará falta agregar un campo de teléfono al perfil del
  vendedor — fuera de alcance de este plan.
- **Decisión abierta 2**: ocultar o no el tab "Ventas" del panel vendedor mientras
  el modo WhatsApp esté activo. Por defecto: dejarlo como está.

## Fase 5 — Verificación

1. `npm run preflight` y `npm run build` en verde.
2. Con el flag en `"whatsapp"`, probar como **visitante anónimo**: catálogo, feed,
   detalle de producto → en ningún lugar aparece "Comprar"/"Agregar al carrito"/
   "Ingresar para comprar"; el botón WP abre `wa.me` con el mensaje correcto
   (título + precio + URL + opciones si hay).
3. Como **comprador logueado**: no ve carrito ni pedidos en ningún menú; URLs
   directas `/panel/comprador/carrito`, `/panel/comprador`, `/checkout/exito`
   redirigen al catálogo.
4. Como **vendedor** y **admin**: sus paneles funcionan igual que antes.
5. Cambiar el flag a `"checkout"` y verificar que todo el flujo de compra reaparece
   idéntico (smoke test: agregar al carrito y llegar a la pantalla del carrito).
   Volver a dejarlo en `"whatsapp"` antes de finalizar.
6. `grep -rn "isOnlinePurchaseEnabled" src/` y revisar que cada punto del mapa de
   la tabla inicial esté condicionado.

## Guía operativa para el agente ejecutor

1. Este documento ya contiene el mapa completo de touchpoints con archivo y línea —
   no re-explorar el repo; abrir solo los archivos listados, en los rangos
   indicados. Las líneas pueden haberse desplazado unas pocas posiciones: ubicar el
   símbolo por búsqueda de texto, no releyendo el archivo entero.
2. Otro agente (Codex) está trabajando en paralelo sobre
   `src/features/artisan/**` y `src/pages/ArtisanProductsPage.tsx` (flujo de carga
   de productos). **No tocar esos archivos** para evitar conflictos. Este plan no
   los necesita.
3. Commits chicos por fase, mensajes en español imperativo (convención del
   historial). El build nunca queda roto entre commits.
4. No borrar código, no borrar rutas, no tocar `supabase/`. Ante la duda entre
   condicionar y eliminar: condicionar.
5. Verificación: `npx tsc --noEmit` entre pasos; `npm run preflight` + `npm run
   build` al cerrar cada fase.

## Estado de ejecución (actualizar al avanzar)

- [x] Fase 1 — Flag `salesChannel`, número WP en config, `WhatsAppProductButton` creado
- [x] Fase 2.1 — `ProductDetailPage` con CTA de WhatsApp (incl. opciones en el mensaje)
- [x] Fase 2.2–2.4 — Cards del catálogo (feed, storefront, 3D) reemplazadas
- [ ] Fase 3.1–3.3 — Navegación limpia (header, menú usuario, tabs comprador)
- [ ] Fase 3.4 — Rutas de carrito/pedidos/checkout redirigen al catálogo
- [ ] Fase 3.5–3.6 — Cuenta comprador y copys de registro ajustados
- [ ] Fase 5 — Verificación completa en ambos valores del flag

### Notas de ejecución

- **2026-07-13**: Fase 1 completada. Se usó el número 3518037869 a pedido del dueño en lugar del especificado originalmente en el documento.
- **2026-07-13**: Fase 2 completada. Se aplicó el condicional `isOnlinePurchaseEnabled` en los 4 componentes (ProductDetailPage, CatalogProductFeedCard, CatalogStorefrontProductCard y CatalogProduct3DPreviewSlot). Todos los `AddToCartButton` están ahora protegidos.

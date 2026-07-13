# Plan: Branding premium y coherencia visual

> Fecha: 2026-07-13. Plan de acción para el agente ejecutor (Gemini).
> Objetivo del dueño: elevar la estética a nivel **premium** — branding real (hoy
> es un placeholder), coherencia visual total y pulido de espaciados/textos. "Acá
> entra todo por los ojos."
>
> **Rama propia obligatoria**: crear `gemini/branding-premium` desde `main`
> actualizado (`git checkout main && git pull && git checkout -b
> gemini/branding-premium`). Commitear y pushear SOLO en esa rama. El merge a
> `main` lo decide el dueño al final con la verificación visual aprobada.

## Diagnóstico (auditoría ya hecha — no re-explorar)

### Branding: hoy es un placeholder literal

- `src/config/marketplace.ts`: `appName: "Mercado Base"`, `appShortName: "Base"`,
  `catalogName: "Catalogo base"` — nombres de plantilla, no de marca.
- `public/brand-mark.svg`: el propio SVG se describe como "Marca neutral —
  isotipo geométrico neutral para un marketplace adaptable". Un cuadrado teal
  genérico. Los favicons y los íconos PWA derivan de él.
- No hay identidad visual propia del rubro (celulares y accesorios).

### Inconsistencias medidas en el código (los números importan)

| Problema | Medición | Efecto visual |
| --- | --- | --- |
| **3 familias de grises mezcladas** | `stone` 1.389 usos, `ocean` 429, `slate` 40 | stone es cálido y slate es frío: superficies y textos desentonan sutilmente entre secciones (ej.: `PublicLayout` usa fondo slate, textos stone y títulos ocean a la vez). |
| **15+ radios de esquina distintos** | `rounded-full` 321, `2xl` 233, `3xl` 89, `xl` 78 + **9 valores arbitrarios** (`[1rem]`, `[1.1rem]`, `[1.2rem]`, `[1.3rem]`, `[1.4rem]`, `[1.5rem]`, `[1.6rem]`, `[1.75rem]`, `[2rem]`) | Tarjetas vecinas con esquinas todas distintas — el "desprolijo invisible" que hace que algo no se sienta premium. |
| **70 sombras custom distintas** | `shadow-[...]` arbitrarias | No hay sistema de elevación; cada card inventa su sombra. |
| **~250 hex hardcodeados en JSX** | `#E0F2FE` ×42, `#ECFEFF` ×34, `#D1FAE5` ×25, `#CFFAFE` ×13… y sueltos como `#9b5735` (marrón heredado del marketplace artesanal) y `#FDF1EC` | Viola la regla del propio `tailwind.config.ts` ("usar tokens semánticos, no hex"); imposible retocar la paleta globalmente. |
| **Trackings arbitrarios** | `tracking-[0.2em]`, `[0.16em]`, `[0.02em]`, etc. | Jerarquía tipográfica sin escala definida. |
| **Tildes inconsistentes** | "Ir al catalogo principal", "Catalogo base", mezcla "Revisá/Revisa" | Se percibe como descuido en textos visibles. |

### Lo que YA está bien (conservar, no rediseñar)

- Tipografías: Inter (texto) + Manrope (display) vía Fontsource — combinación
  sólida y moderna. No cambiar fuentes.
- Tokens semánticos existentes en `tailwind.config.ts` (`brand`/`sun`/`ocean`) —
  la estructura es correcta; lo que falla es que la mitad del código no los usa.
- Microinteracciones existentes (fade-in-up, header glass al scroll, botón
  WhatsApp expansivo) — buen gusto, mantener.
- Fondo `tech_abstract_bg.jpg` + noise overlay del `PublicLayout` — la intención
  premium está; solo revisar que no compita con el contenido (ver Fase 4).

## Fase 0 — Rama y decisiones de marca

1. Crear la rama `gemini/branding-premium` desde `main` actualizado.
2. **Punto de decisión con el dueño (el único bloqueante del plan)**: el nombre
   comercial real de la marca. "Mercado Base" es relleno. Preguntar al dueño:
   nombre definitivo, y si tiene preferencia de personalidad visual (tech/oscuro
   vs claro/amigable) y de color principal. Si el dueño no define nombre todavía,
   ejecutar todo el plan con el nombre actual dejando `marketplaceConfig` como
   único lugar a tocar después (ya está centralizado — el cambio futuro es
   trivial).

## Fase 1 — Identidad: logo, nombre y presencia de marca

1. **Diseñar un logo real en SVG** (isotipo + posibilidad de wordmark):
   - Motivo del rubro: celulares/accesorios (ideas: silueta de teléfono
     minimalista, rayo de carga, señal/ondas — elegir UNA metáfora simple, no
     collage). Debe funcionar en 16px (favicon) y en 512px (PWA).
   - Trazo geométrico limpio coherente con Inter/Manrope; una o dos tintas de la
     paleta definitiva (Fase 2). Versión sobre claro y sobre oscuro.
   - Reemplazar `public/brand-mark.svg` (mismo nombre de archivo: todo apunta
     ahí).
2. **Regenerar íconos**: ya existe `scripts/generate-favicons.mjs` (usa sharp) —
   correrlo para regenerar `favicon-16/32`, `apple-touch-icon`, `pwa-192/512`.
3. **Actualizar la superficie de marca**:
   - `src/config/marketplace.ts`: nombre, shortName, catalogName, description
     (según decisión de Fase 0).
   - `index.html`: `<title>`, `theme-color`, meta description, y agregar
     Open Graph + Twitter card (og:title, og:description, og:image — generar una
     `public/og-cover.png` 1200×630 con el logo y tagline) para que los links
     compartidos por WhatsApp muestren una preview digna (crítico: el canal de
     venta ES WhatsApp).
   - Manifest PWA (se genera en `vite.config.ts` → sección VitePWA): nombre,
     `theme_color`/`background_color` alineados a la paleta.
   - `SiteBrand.tsx`: revisar tamaño/peso del lockup (hoy el logo va en una
     cajita con borde que lo achica — evaluar mostrarlo limpio sin borde).

## Fase 2 — Sistema de diseño: una sola verdad para color, radio y sombra

El orden importa: primero definir los tokens, después migrar los usos.

1. **Grises**: consolidar en DOS roles claros y eliminar la tercera familia:
   - Superficies, bordes y fondos → `stone` (ya domina con 1.389 usos).
   - Texto y tinta → `ocean` (ya es el token semántico de texto).
   - **Migrar los 40 usos de `slate` → stone/ocean** según rol. Regla nueva
     documentada en el comentario del `tailwind.config.ts`.
2. **Acentos**: revisar la paleta `brand` (teal) y `sun` (cyan) contra la
   decisión de Fase 0. Agregar a `tailwind.config.ts` los tints que hoy viven
   hardcodeados (`#E0F2FE`, `#ECFEFF`, `#D1FAE5`, `#CFFAFE` → niveles 50/100 de
   las familias correspondientes) y **reemplazar los ~250 hex en JSX por
   tokens** (mecánico: buscar y reemplazar por archivo, verificando visualmente
   los 5–6 componentes más afectados). El verde WhatsApp `#25D366` es marca de
   terceros: dejarlo, pero extraerlo a una constante única.
   Eliminar los colores huérfanos del marketplace artesanal (`#9b5735`,
   `#FDF1EC`, `#fff9ef`, `#fffdf8`) migrando esos elementos a la paleta actual.
3. **Radios**: definir escala de 4 niveles en tokens y migrar los 9 valores
   arbitrarios al más cercano:
   - `rounded-xl` (12px): inputs, chips, elementos internos.
   - `rounded-2xl` (16px): cards estándar.
   - `rounded-3xl` (24px): cards hero, modales, secciones.
   - `rounded-full`: pills y botones.
   Los `rounded-[1.1rem]`…`[2rem]` se reemplazan por el nivel más cercano
   (cambio mecánico, bajo riesgo).
4. **Elevación**: definir 3 sombras con nombre en `tailwind.config.ts`
   (`shadow-elev-1/2/3`, tintadas con el gris cálido, no negro puro) y migrar
   las 70 `shadow-[...]` arbitrarias al nivel más cercano. Mantener 2–3 sombras
   "especiales" si son intencionales (glow del botón WhatsApp, header glass).
5. **Tipografía**: definir y documentar la escala en un comentario del config:
   display (Manrope bold, tracking tight) para h1/h2 y precios; Inter para todo
   lo demás; 2 trackings permitidos para labels uppercase (ej. `0.16em`) —
   migrar los arbitrarios a esos.

## Fase 3 — Pulido página por página (espaciados, textos, jerarquía)

Con el sistema de la Fase 2 aplicado, pasada fina en este orden (de más a menos
tráfico), en **móvil primero** (375px) y luego desktop:

1. **Home** (`HomePage.tsx`): jerarquía del hero (el título hoy es el nombre de
   la app a secas — merece un titular de valor + subtítulo), CTAs con la nueva
   paleta, ritmo vertical consistente (definir un espaciado de sección estándar,
   ej. `space-y` de 3rem móvil / 4rem desktop, y aplicarlo en vez de valores
   sueltos).
2. **Catálogo** (`CatalogPage.tsx` + cards de `features/public/components/`):
   alineación de alturas de cards, consistencia de padding interno entre
   `CatalogProductFeedCard`, `CatalogStorefrontProductCard` y
   `PublicStorefrontCard`, tamaño/peso del precio (el precio es el dato #1 en un
   catálogo — debe dominar la card), badges de categoría unificados.
3. **Detalle de producto** (`ProductDetailPage.tsx`): respiración entre galería
   y ficha, jerarquía título→precio→CTA WhatsApp (el CTA verde debe ser el
   elemento más visible), sección de atributos como tabla limpia.
4. **Tienda del vendedor** (`ArtisanProfilePage`, `PublicStorefrontCard`) y
   **listado de vendedores**.
5. **Login/registro**: son la primera impresión de vendedores — misma paleta,
   sin copys de compra (ya ajustados por el plan WhatsApp).
6. **Textos en toda la superficie pública**: pasada única de tildes y
   consistencia de voseo ("Encontrá", "Explorá" — decidir voseo argentino y
   aplicarlo uniforme), sin cambiar significados.
7. **Márgenes señalados por el dueño**: al recorrer cada página, buscar
   específicamente espacios en blanco excesivos entre secciones (el `main` tiene
   `pt-4 pb-6 sm:py-10` y el footer `mt-10` — normalizar con el ritmo de
   sección definido en 3.1).

## Fase 4 — Detalles que hacen "premium"

1. **Títulos de pestaña por ruta** (`document.title`): "Producto — <Marca>",
   "Catálogo — <Marca>", etc. (hoy todo es el nombre de la app).
2. **Estados vacíos y de carga**: unificar skeletons (mismo gris, mismo radio) y
   dar personalidad a los estados vacíos (ícono de la marca + texto útil).
3. **Fondo global**: evaluar en móvil que `tech_abstract_bg.jpg` (opacity 90 +
   noise) no ensucie la legibilidad de las cards translúcidas; si compite,
   bajar opacidad o simplificar en viewport chico.
4. **Focus states**: anillos de foco consistentes con la paleta (accesibilidad
   que además se ve profesional).
5. **Contraste AA**: verificar los textos `stone-400/500` sobre fondos
   translúcidos con un checker; subir un nivel donde falle.

## Fase 5 — Verificación visual

1. `npm run preflight` y `npm run build` en verde.
2. Recorrido completo en 375px y 1280px: Home, catálogo, detalle, tienda,
   vendedores, login/registro. Capturas antes/después de cada página para que el
   dueño apruebe el merge.
3. Checklist de coherencia: ¿un solo sistema de grises? ¿ningún
   `rounded-[...]` arbitrario nuevo? ¿ningún hex nuevo en JSX? ¿favicon y PWA
   icons con el logo nuevo? ¿preview de WhatsApp con OG image al compartir un
   link?
4. `grep -rhoE "#[0-9a-fA-F]{6}" src --include="*.tsx" | sort | uniq -c` debe
   quedar reducido a los casos justificados (WhatsApp green y poco más).
5. El dueño revisa y aprueba; recién entonces se mergea la rama a `main`.

## Guía operativa para el agente ejecutor

1. **Rama propia** `gemini/branding-premium`. Nunca commitear en `main` ni en
   ramas de otros agentes. Push de la rama al remoto para respaldo
   (`git push -u origin gemini/branding-premium`).
2. Este documento ya contiene el diagnóstico cuantificado — no re-auditar.
   Ubicar los usos con grep (`slate-`, `rounded-[`, `shadow-[`, hex) y migrar
   por lotes mecánicos, un commit por tipo de migración (ej.: "Unifica radios de
   esquina en escala de 4 niveles").
3. Las migraciones mecánicas (Fase 2) son de bajo riesgo pero ALTO volumen:
   verificar visualmente después de cada lote los 3–4 componentes más tocados,
   no archivo por archivo.
4. No tocar: `supabase/`, lógica de negocio, el flujo de compra oculto, ni la
   zona de carga de productos más allá de clases CSS. Este plan es 95% clases
   Tailwind, SVGs y textos.
5. Respetar `docs/IDENTIDAD_PROYECTO.md` para cualquier operación remota.
6. Punto de decisión único: nombre/personalidad de marca (Fase 0.2). Todo lo
   demás está decidido acá.
7. Commits chicos en español imperativo; build nunca roto; `npx tsc --noEmit`
   entre pasos y `preflight` + `build` al cerrar cada fase.

## Estado de ejecución (actualizar al avanzar)

- [x] Fase 0 — Rama `gemini/branding-premium` creada y pusheada
- [x] Fase 0 — Decisión de marca consultada al dueño (nombre: ______)
- [x] Fase 1.1 — Logo SVG nuevo en `public/brand-mark.svg` (claro y oscuro)
- [x] Fase 1.2 — Favicons y PWA icons regenerados
- [x] Fase 1.3 — Config, index.html, OG/Twitter meta y manifest actualizados
- [x] Fase 2.1 — `slate` eliminado (grises: stone superficies / ocean texto)
- [ ] Fase 2.2 — Hex hardcodeados migrados a tokens (recuento final: ______)
- [x] Fase 2.3 — Radios en escala de 4 niveles (cero arbitrarios)
- [ ] Fase 2.4 — Sombras en escala de 3 niveles + especiales justificadas
- [ ] Fase 2.5 — Escala tipográfica documentada y trackings normalizados
- [ ] Fase 3.1 — Home pulida (jerarquía hero + ritmo de secciones)
- [ ] Fase 3.2 — Catálogo y cards unificadas
- [ ] Fase 3.3 — Detalle de producto pulido
- [ ] Fase 3.4–3.5 — Tiendas, vendedores, login/registro
- [ ] Fase 3.6–3.7 — Textos (tildes + voseo) y márgenes normalizados
- [ ] Fase 4 — Títulos por ruta, estados vacíos, fondo, focus, contraste
- [ ] Fase 5 — Verificación visual con capturas antes/después
- [ ] Aprobación del dueño y merge a `main`

### Notas de ejecución

_(El agente anota acá decisiones de diseño, desvíos y capturas de referencia,
con fecha. Vacío al inicio.)_

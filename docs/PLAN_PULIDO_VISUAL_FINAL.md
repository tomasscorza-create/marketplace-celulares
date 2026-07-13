# Plan: Remate del branding — terminar lo que quedó a medias

> Fecha: 2026-07-13. Plan de acción para el agente ejecutor (**Codex**).
> Contexto: Gemini ejecutó parcialmente `docs/PLAN_BRANDING_PREMIUM.md` en la rama
> `gemini/branding-premium` (1 commit, 109 archivos). Sentó bases correctas pero
> **el resultado visual casi no se nota** y el dueño lo rechazó. Este plan es el
> remate: reparar lo roto, hacer que la marca Nyzca realmente se vea, y ejecutar
> el pulido fino que no se hizo.
>
> **Rama**: crear `codex/pulido-visual` **desde `gemini/branding-premium`** (no
> desde main — el trabajo de Gemini se conserva y se completa encima):
> `git checkout gemini/branding-premium && git checkout -b codex/pulido-visual
> && git push -u origin codex/pulido-visual`.

## Qué hizo Gemini (aprovechar, no rehacer)

- Marca definida: **Nyzca**, violeta primario `#7F6BFF` (`brand-500`), token
  `whatsapp: #25D366`, sombras `elev-1/2/3` + `elev-whatsapp` en
  `tailwind.config.ts` (y su espejo compilado `tailwind.config.js` — **ambos se
  editan juntos siempre**).
- Logo nuevo en `public/brand-mark.svg`, favicons y PWA icons regenerados,
  `og-cover.png` creado, `index.html` con OG meta, `marketplaceConfig` renombrado.
- `slate` eliminado (0 usos), radios arbitrarios reducidos de 100+ a 14.

## Diagnóstico: por qué "no se nota" (verificado en código, con números)

Estas son las causas raíz de las quejas del dueño. Cada una es un ítem de la
Fase 1:

1. **~35 usos de clases de color que NO existen** → Tailwind las ignora en
   silencio y los elementos quedan sin fondo/borde/color (el "invisible"):
   la paleta `brand` nueva solo define niveles `50/100/300/500/700/900`, pero el
   JSX usa `border-brand-200` (×15), `text-brand-600` (×12), `bg-brand-600`
   (×2), `border-brand-400`/`text-brand-400`, `text-brand-800` (×4),
   `border-brand-900`. Además queda **1 archivo usando `sun-*`**, familia que ya
   no existe en el config (buscarlo con `grep -rln "sun-" src --include="*.tsx"`).
2. **El violeta no protagoniza**: `bg-brand-50` (casi blanco) tiene 114 usos y
   `bg-brand-500` solo 29. Los CTAs principales siguen en gris oscuro
   `bg-ocean-500` (ej.: botón "Comprar" en `ProductDetailPage.tsx:789`, y el
   patrón se repite en Home, login, registro, paneles). Resultado: la marca
   nueva es un acento tímido, no una identidad.
3. **La paleta VIEJA sigue pintando la UI**: quedan hex hardcodeados del teal
   anterior — `#0f766e` ×14 (el verde azulado viejo), `#0e7490` ×13,
   `#ECFEFF`/`#e0f2fe`, `#f8fafc`, `#475569`, cremas `#fff8ec`/`#f8f4eb`. En las
   pantallas donde estos dominan, nada cambió.
4. **Botón WhatsApp "invisible" (queja explícita del dueño)**: el botón flotante
   global (`src/components/WhatsAppButton.tsx`) usa `bg-stone-400/70` (gris
   translúcido) y recién se pone verde en hover/tap. Sobre las fotos del detalle
   de producto es un fantasma. El dueño lo considera "pésimo".
5. **Badges "Para ti" y "Explorar" demasiado altos (queja explícita)**: en
   `CatalogPage.tsx` (~líneas 590–645) son banners con imagen de fondo
   (`badge_bg.webp`) + overlay oscuro + `CatalogSectionHeader` + subtítulo;
   ocupan demasiada altura vertical para ser solo un título de sección.
6. **Fondo del catálogo sin el ajuste pedido (queja explícita)**: el dueño pidió
   **mantener la imagen de fondo pero ajustarla más al margen** — hoy los fondos
   (`catalog_explore_bg.webp` con `-inset-2`, `tech_abstract_bg.jpg` full-bleed
   en `PublicLayout`) se extienden borde a borde.
7. **El pulido fino nunca ocurrió**: las Fases 3 (espaciados/jerarquía por
   página) y 4 (títulos por ruta, estados vacíos, focus, contraste) del plan de
   branding están sin hacer, y el checklist de ese plan quedó íntegro sin marcar.

## Fase 1 — Reparaciones críticas (las quejas del dueño, en este orden)

1. **Completar la escala `brand`** en `tailwind.config.ts` **y**
   `tailwind.config.js` con los niveles que el código ya usa:
   `200`, `400`, `600`, `800` (derivarlos coherentes con `#7F6BFF`; ej. violeta
   Tailwind como referencia: 200 `#ddd6fe`, 400 `#a78bfa`, 600 `#7c3aed` —
   ajustar para que 500 siga siendo `#7F6BFF` y la escala se vea continua).
   Verificación: `grep -rhoE "(bg|text|border|ring|from|to)-brand-[0-9]+" src
   --include="*.tsx" | sort -u` → todos los niveles usados deben existir en el
   config.
2. **Migrar el archivo residual con `sun-*`** a la paleta vigente.
3. **Botón WhatsApp flotante siempre visible**: en `WhatsAppButton.tsx`,
   reemplazar `bg-stone-400/70` por `bg-whatsapp` permanente con
   `shadow-elev-whatsapp`; conservar la expansión del texto en hover/tap tal
   como está. Debe verse verde WhatsApp inconfundible sobre cualquier fondo,
   sin interacción previa.
4. **Bajar los banners "Para ti" y "Explorar"** (`CatalogPage.tsx` ~590–645):
   convertirlos en cabeceras compactas — altura objetivo ~52–60px en móvil:
   reducir `py`, subtítulo de "Explorar" a una sola línea (o moverlo fuera del
   banner), título y acción "Ver todo" en la misma fila. La imagen de fondo del
   banner puede quedarse, pero el banner es un encabezado, no un hero.
5. **Ajustar los fondos con imagen al margen** (interpretación del pedido del
   dueño — implementarla y validar con captura):
   - En `CatalogPage.tsx`: los fondos de sección (`catalog_explore_bg.webp`,
     `catalog_dark_bg.webp`) quedan **contenidos dentro del contenedor
     redondeado de su sección** (eliminar el `-inset-2`, respetar el
     `rounded-3xl` y el padding), de modo que se vea un margen limpio alrededor
     y la imagen no toque los bordes del viewport.
   - En `PublicLayout.tsx`: `tech_abstract_bg.jpg` puede seguir fijo de fondo,
     pero verificar en móvil que no ensucie la legibilidad (si compite, bajar
     opacidad en viewport chico — ya estaba previsto en el plan anterior).
6. **Purgar la paleta vieja**: migrar los hex restantes a tokens —
   `#0f766e`/`#0e7490` → el rol que cumplían pasa a `brand-*` (violeta) o
   `ocean-*` según sea acento o texto; `#ECFEFF`/`#e0f2fe` → tints `brand-50/100`
   o `stone`; cremas `#fff8ec`/`#f8f4eb`/`#f3f7ff` → `stone-50`. Los únicos hex
   permitidos al final: `#ffffff`, el verde WhatsApp vía token, y valores dentro
   de los config. Verificación: `grep -rhoE "#[0-9a-fA-F]{6}" src
   --include="*.tsx" | sort | uniq -c | sort -rn` → solo blancos y casos
   justificados documentados en Notas.

## Fase 2 — Que Nyzca se vea: el violeta como protagonista

Regla simple: **toda acción primaria es violeta**; WhatsApp es la única
excepción (verde, porque es marca de terceros y es el canal de venta).

1. CTAs primarias que hoy son `bg-ocean-500` → `bg-brand-500` con hover
   `brand-600` y `shadow-elev-2`: "Ver catálogo"/"Iniciar sesión" (Home),
   "Comprar" (rama oculta, cambiar igual por consistencia), botones de
   login/registro, acciones primarias de paneles (vendedor/admin), "Guardar" de
   formularios. `ocean` queda para texto y superficies neutras, como documenta
   el propio config.
2. Estados interactivos de marca: links y NavLinks activos (`text-brand-600`),
   `focus-visible:ring-brand-300` uniforme en botones/inputs, selección de tabs
   con violeta.
3. Detalles de marca: `selection:bg-blue-500/30` del `PublicLayout` →
   `selection:bg-brand-300/40`; `theme-color` del manifest/index.html alineado
   al violeta o al fondo según diseño; spinner/skeleton accents.
4. **Contraste**: `#7F6BFF` sobre blanco roza el límite AA para texto chico —
   para TEXTO violeta usar `brand-600/700`; `brand-500` reservado para fondos
   con texto blanco. Verificar con un checker los pares usados.

## Fase 3 — El pulido fino que no se hizo (Fases 3–4 del plan de branding)

Ejecutar tal como están escritas en `docs/PLAN_BRANDING_PREMIUM.md`, que sigue
siendo la especificación (no duplicar acá):

1. Fase 3 de aquel plan: espaciados y jerarquía página por página (Home,
   catálogo, detalle, tiendas, login/registro), móvil primero. Incluye
   explícitamente los "espacios en blanco excesivos" que el dueño volvió a
   señalar: definir el ritmo de sección estándar y aplicarlo.
2. Fase 3.6: pasada de tildes y voseo uniforme en la superficie pública.
3. Fase 4 de aquel plan: `document.title` por ruta, estados vacíos con
   personalidad, focus states, contraste AA.
4. Rematar los **14 radios arbitrarios** restantes a la escala de 4 niveles.

## Fase 4 — Verificación visual y cierre

1. `npm run preflight` y `npm run build` en verde.
2. Recorrido en 375px y 1280px con capturas antes/después: Home, catálogo
   (verificar banners compactos y fondo con margen), detalle de producto
   (botón WhatsApp verde visible SIN interacción), tienda, login.
3. Grep-verificaciones (todas deben pasar):
   - Clases `brand-*` usadas ⊆ niveles definidos en config.
   - `sun-` → 0 resultados en `src/`.
   - Hex en JSX → solo `#ffffff` y justificados.
   - `rounded-[` → 0 resultados.
4. **Actualizar los checklists**: el de este plan Y el de
   `docs/PLAN_BRANDING_PREMIUM.md` (quedó sin marcar — marcar lo que Gemini
   efectivamente completó y lo que este plan termina).
5. El dueño revisa las capturas y aprueba; recién entonces se mergea
   `codex/pulido-visual` → `main` (y se elimina o archiva
   `gemini/branding-premium`).

## Guía operativa para el agente ejecutor

1. **Los dos tailwind configs van juntos**: cada cambio de tokens se aplica a
   `tailwind.config.ts` Y `tailwind.config.js` (espejo compilado). Si difieren,
   los estilos del dev server y del build divergen — esta es una trampa real del
   repo.
2. El diagnóstico ya está hecho y cuantificado arriba — no re-auditar. Ubicar
   cada caso con los greps indicados y migrar por lotes, un commit por tipo de
   cambio.
3. **Verificar visualmente cada fix de la Fase 1** en el dev server antes de
   commitear (son las quejas explícitas del dueño; si vuelven a quedar mal, el
   plan entero pierde credibilidad). Capturas en cada caso.
4. No tocar: `supabase/`, lógica de negocio, flujo de compra oculto (cambiar
   solo clases CSS donde este plan lo pide), zona de carga de productos salvo
   clases.
5. Puntos de decisión: solo la interpretación del "fondo ajustado al margen"
   (Fase 1.5) — implementar lo especificado, sacar captura y, si al dueño no le
   convence, iterar sobre esa base. Todo lo demás está decidido.
6. Commits chicos en español imperativo; `npx tsc --noEmit` entre pasos;
   `preflight` + `build` al cerrar cada fase. Push frecuente de la rama.

## Estado de ejecución (actualizar al avanzar)

- [x] Fase 0 — Rama `codex/pulido-visual` creada desde `gemini/branding-premium` y pusheada
- [x] Fase 1.1 — Escala `brand` completa (200/400/600/800) en ambos configs
- [x] Fase 1.2 — Residuo `sun-*` migrado
- [x] Fase 1.3 — Botón WhatsApp flotante siempre verde y visible
- [x] Fase 1.4 — Banners "Para ti"/"Explorar" compactos (~52–60px móvil)
- [x] Fase 1.5 — Fondos de catálogo contenidos al margen (captura enviada al dueño)
- [ ] Fase 1.6 — Paleta vieja purgada (hex restantes: ______)
- [x] Fase 2.1 — CTAs primarias en violeta brand en toda la superficie
- [x] Fase 2.2–2.3 — Links, focus rings, selection y theme-color de marca
- [x] Fase 2.4 — Contraste AA verificado (texto violeta en 600/700)
- [ ] Fase 3.1 — Espaciados y jerarquía por página (móvil primero)
- [ ] Fase 3.2 — Tildes y voseo uniformes
- [ ] Fase 3.3 — Títulos por ruta, estados vacíos, focus, contraste
- [x] Fase 3.4 — Cero radios arbitrarios
- [ ] Fase 4 — Verificación completa + checklists de ambos planes actualizados
- [ ] Aprobación del dueño y merge a `main`

### Notas de ejecución

_(El agente anota acá decisiones, hex justificados que queden, y capturas, con
fecha. Vacío al inicio.)_

# Sistema Visual Hyper-Premium

**Propósito:** Definir las directrices del diseño visual, enfocado en accesorios de telefonía e informática, para mantener un estándar ultra-moderno similar a empresas de tecnología líderes (Apple, Vercel, Stripe).

**Archivos Principales Afectados:**
- `src/layouts/PublicLayout.tsx`
- `src/pages/HomePage.tsx`
- `src/pages/CatalogPage.tsx`
- `src/features/public/components/CatalogProductFeedCard.tsx`

**Decisiones Vigentes (Julio 2026):**
1. **Glassmorphism Extremado (Frosted Glass):** 
   - Las tarjetas y contenedores flotantes no deben usar colores sólidos. En su lugar, utilizan `bg-white/40` o `bg-white/60` combinado con un fuerte `backdrop-blur-xl` o `backdrop-blur-2xl`.
   - Los bordes deben ser translúcidos (`border-white/50`) para atrapar la luz del fondo.
   - Las sombras deben ser extendidas y sutiles: `shadow-[0_8px_30px_rgb(0,0,0,0.04)]`.

2. **Arte Gráfico y Fondos (Mesh Gradients):**
   - No utilizamos texturas pesadas ni gradientes sólidos aburridos. 
   - El fondo principal (ubicado globalmente en `PublicLayout.tsx`) está compuesto por esferas de luz CSS (`bg-indigo-500/10 blur-[120px]`) que se superponen creando un arte gráfico dinámico, liviano (0 Kb) y sumamente rápido de procesar por el navegador.
   - Cuenta con un *overlay* de ruido (noise) SVG al 2% de opacidad para dar textura premium y disimular el *banding* de los gradientes.

3. **Botones de Alta Fidelidad:**
   - Adiós a los botones gigantes. Usamos formas de cápsula estándar (`rounded-full`).
   - El botón principal oscuro (`bg-slate-900`) posee un sutil gradiente brillante interno y una sombra coloreada al pasar el cursor (hover).
   - El botón secundario es translúcido y responde elevándose ligeramente con transiciones suaves (`duration-300` o `duration-500`).

4. **Transiciones Micro-Animadas y Estados Compactos:**
   - La respuesta del cursor es clave. Las tarjetas de producto hacen un `hover:-translate-y-1` para dar la sensación física de que se levantan del panel de vidrio base.
   - Las secciones grandes (como "Para ti") utilizan comportamiento de acordeón (collapsible) con estados compactos. Al colapsar, las interfaces deben esconder por completo paddings, fondos e íconos redundantes para maximizar el espacio en pantalla, utilizando trucos modernos de CSS Grid (`grid-template-rows: 0fr/1fr`) junto con `opacity` para animaciones fluidas y nativas.
   - En estados inactivos o compactos de componentes resaltados, el color se relaja (por ejemplo, transicionando a tonos de "acuarela pastel" suaves) y recupera su intensidad brillante (`brand-700` o `sky-400`) únicamente cuando está expandido o activo.

5. **Listas y Banners (Stripes):**
   - Para romper la monotonía visual, algunos contenedores horizontales grandes (como las tiendas destacadas) reemplazan los fondos blancos puros con degradados diagonales que alternan en franjas (`repeating-linear-gradient` o `bg-gradient-to-tr` difuminados) para dar un efecto de cinta o bandera sin ensuciar la legibilidad.

**Validación:**
- Cualquier nuevo componente que se agregue al catálogo o layout principal DEBE respetar este esquema de transparencia y desenfoque, evitando los parches de color sólido `bg-white` a menos que sea un componente anidado muy pequeño.

*Última Revisión:* Refactor de interfaz (Julio 2026).

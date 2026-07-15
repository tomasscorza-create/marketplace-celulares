# Sistema visual público

## Propósito

Dar una referencia verificable para mantener coherencia visual sin convertir
una tendencia estética en una prohibición universal.

## Fuentes de verdad

- `tailwind.config.ts`: colores, tipografía, sombras y animaciones compartidas.
- `src/styles/index.css`: estilos base y utilidades globales.
- `src/components/ActionButton.tsx`: variantes de acción reutilizables.
- `src/layouts/PublicLayout.tsx`: fondo, header, ancho y estructura pública.
- `src/features/public/components/CatalogProductFeedCard.tsx`: tarjeta de
  producto vigente.
- `public/tech_abstract_bg.jpg`: imagen raster del fondo público.

## Datos y dependencias externas

La interfaz usa Tailwind y assets locales. El fondo actual no es CSS puro:
`PublicLayout` carga `tech_abstract_bg.jpg` y superpone una textura SVG. Cambiar
ese asset puede afectar peso, contraste y carga inicial.

## Decisiones vigentes

- Los tokens `brand`, `ocean`, `stone` y sombras `elev-*` son la base; reutilizar
  componentes existentes antes de crear variantes ad hoc.
- Bordes suaves, radios amplios, gradientes, transparencia y blur son recursos
  frecuentes, no requisitos para cada contenedor. Los fondos sólidos son
  válidos cuando mejoran legibilidad, jerarquía o estados semánticos.
- Acciones equivalentes deben conservar tamaño, jerarquía y estados de foco
  consistentes mediante componentes compartidos.
- Las animaciones no esenciales deben respetar `prefers-reduced-motion`.
- La conducta responsive, teclado, contraste y contenido visible prevalecen
  sobre el efecto decorativo.
- Una decisión visual localizada pertenece al componente o ficha del dominio;
  esta página sólo conserva reglas reutilizables.

## Validación

Para copy o clases aisladas, probar el recorrido afectado sin escalar
automáticamente a la suite completa. Para JSX o lógica, usar ESLint/test dirigido
y typecheck según [AGENTS.md](../AGENTS.md). Ejecutar `build` sólo si cambian
assets, Tailwind/PostCSS, imports o bundle.

El QA visual debe cubrir al menos móvil y desktop relevantes, foco por teclado,
texto largo, estados vacíos/carga/error y movimiento reducido cuando haya
animación. Compilar no sustituye esta revisión.

## Última revisión

2026-07-15. Actualizar cuando cambien tokens, componentes base, fondo global o
reglas transversales de accesibilidad visual.

# Promociones del catálogo

## Propósito

Gestionar contenido promocional administrable dentro del catálogo público sin
mezclarlo con el modelo de productos ni simular beneficios únicamente en el
frontend. La primera presentación ocupa, sólo en desktop, la celda inferior
derecha del showcase destacado de `Explorar`: debajo de las cuatro cards de
apoyo, a la derecha del visor 3D y antes de la grilla regular.

## Fuentes de verdad

- `supabase/migrations/20260715230000_catalog_promotions.sql`: tablas, RLS,
  función de reclamo y bucket de imágenes.
- `supabase/migrations/20260715231000_catalog_promotion_demo_content.sql`:
  contenido inicial editable para comprobar la rotación con datos reales.
- `src/features/catalogPromotions/`: cliente, consultas, mutaciones y reglas
  compartidas entre catálogo y administración.
- `src/features/public/components/CatalogPromotionBanner.tsx`: carrusel
  público y ejecución de acciones.
- `src/features/public/components/CatalogProductShowcase.tsx`: ubicación
  desktop del carrusel.
- `src/pages/AdminCatalogPromotionsPage.tsx`: CRUD administrativo.

## Datos y dependencias

- `catalog_promotions` guarda contenido, acción, programación, orden e imagen.
- `catalog_promotion_claims` guarda un beneficio por promoción y perfil. Cada
  reclamo conserva un snapshot del tipo, valor, compra mínima y título para que
  editar luego la campaña no cambie lo obtenido por una cuenta.
- El bucket público `catalog-promotions` permite lectura pública y reserva
  altas, cambios y borrados a administradores.
- Las promociones de producto pueden referenciar `products`; al eliminar el
  producto, la referencia queda nula y no se borra la campaña.

## Decisiones vigentes

- Los tipos admitidos son mensaje, imagen, producto, descuento y cupón.
- Las acciones admitidas son: ninguna, guardar beneficio, abrir producto,
  enlace interno y enlace externo HTTP(S).
- Visitantes y todos los roles pueden ver campañas activas dentro de su ventana
  de fechas. Guardar un beneficio requiere sesión.
- `claim_catalog_promotion` serializa el reclamo, respeta el límite total y
  devuelve el reclamo previo si la misma cuenta repite la acción.
- La aplicación económica del beneficio durante checkout no forma parte de
  esta primera etapa; primero queda registrado de manera real en la cuenta. La
  futura redención debe validar nuevamente estado, alcance y compra mínima en
  backend.
- El carrusel funciona como una cinta horizontal continua que se desplaza hacia
  la izquierda a velocidad lineal. Cada campaña ocupa un ancho completo y tarda
  8 segundos en recorrerlo hasta desaparecer por el extremo izquierdo mientras
  la siguiente entra por el derecho. La primera campaña se repite al final de
  la pista para cerrar el bucle sin salto visual. El simple hover no detiene la
  cinta; se pausa mientras un control o acción recibe foco, no avanza con la
  pestaña oculta y respeta `prefers-reduced-motion`. El intervalo existente de
  8000 ms sincroniza los indicadores; no monta un segundo avance visual por
  páginas.
- El panel de flechas e indicadores permanece normalmente en reposo, con menor
  escala y opacidad. El primer clic lo activa sin cambiar de campaña; cada uso
  reinicia su temporizador y, después de 3 segundos sin interacción, vuelve al
  estado reposado.
- El rectángulo exterior funciona como fondo estable del banner. Cada campaña
  se presenta como una sub-card elevada, separada por 6 px en los cuatro lados,
  con borde redondeado y sombra suave; este tratamiento no altera su contenido,
  acción ni temporización.
- Cada posición de la cinta agrega 3 px de espacio lateral por lado. Al quedar
  dos posiciones contiguas, forman una separación de 6 px entre campañas que
  deja ver el mismo fondo exterior sin modificar el ritmo del recorrido.
- El visor que recorta la pista no dibuja un borde continuo. El borde y la
  sombra pertenecen a cada sub-card, de modo que el espacio lateral interrumpe
  también las líneas superiores e inferiores y evita que parezcan conectadas.
- En esta etapa el componente usa `hidden xl:block`. No elegir una ubicación
  móvil por inferencia: debe definirse en una fase posterior.
- Si no hay campañas públicas o el backend aún no tiene la migración, el
  componente no muestra contenido ni inventa promociones locales.

## Validación proporcional

- Lógica, contrato SQL y componente:
  `npm test -- src/features/catalogPromotions/catalogPromotionUtils.test.ts src/features/catalogPromotions/catalogPromotionMigrationContract.test.ts src/features/public/components/CatalogPromotionBanner.test.tsx`.
- Cambio visual o de acción: ESLint sobre los archivos afectados, typecheck
  cuando cambien tipos/imports/JSX y el QA manual indicado abajo.
- Migración, RLS, Storage o RPC: test de contrato explícito,
  `npm run audit:backend` y Supabase local identificado según
  `docs/DB_SAFETY.md`. Ejecutar `npm run docs:backend-map` sólo si cambió el
  mapa que debe regenerarse.
- `npm run build` sólo ante cambios de imports, assets, bundle/PWA o
  publicación frontend. Escalar a `npm run preflight` únicamente por contrato
  compartido, tooling, impacto transversal o certificación integral.

## Requisito de backend

El esquema del dominio nace en
`20260715230000_catalog_promotions.sql`; la migración
`20260715231000_catalog_promotion_demo_content.sql` sólo agrega contenido
editable. El checkout local no demuestra que ambas estén aplicadas en el
backend objetivo: verificar `supabase migration list` sólo dentro de una tarea
remota autorizada y con la identidad confirmada.

El contenido demostrativo es contenido administrable normal: el admin puede
editarlo, desactivarlo o eliminarlo después del QA. No aplicar ni repetir
migraciones remotas sin autorización.

QA manual pendiente del dueño:

1. En desktop, confirmar que el banner ocupa el rectángulo vacío indicado y no
   aumenta de manera indeseada la altura del showcase.
2. Verificar pausa, flechas, indicadores, enlaces y reclamo con/sin sesión.
3. Entrar como admin a `/panel/admin/promociones-catalogo` y probar cada tipo.
4. Confirmar que no se muestra en móvil antes de definir su ubicación.

## Última revisión

2026-07-15 contra fuentes locales. El QA visual del dueño continúa pendiente.

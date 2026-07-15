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
- El carrusel avanza automáticamente cada 8 segundos con una transición de
  entrada, se pausa al interactuar, no avanza con la pestaña oculta y respeta
  `prefers-reduced-motion`. Esta regla reutiliza un único temporizador; no se
  montan ciclos de avance paralelos.
- El panel de flechas e indicadores permanece normalmente en reposo, con menor
  escala y opacidad. El primer clic lo activa sin cambiar de campaña; cada uso
  reinicia su temporizador y, después de 3 segundos sin interacción, vuelve al
  estado reposado.
- En esta etapa el componente usa `hidden xl:block`. No elegir una ubicación
  móvil por inferencia: debe definirse en una fase posterior.
- Si no hay campañas públicas o el backend aún no tiene la migración, el
  componente no muestra contenido ni inventa promociones locales.

## Validación

```powershell
npm test -- --run src/features/catalogPromotions
npm run docs:backend-map
npm run preflight
npm run build
```

Para validar el SQL localmente, seguir `docs/DB_SAFETY.md` y ejecutar la pila
local identificada. No aplicar la migración a remoto sin autorización.

Estado productivo: la migración `20260715230000_catalog_promotions.sql` fue
aplicada el 2026-07-15 al proyecto confirmado **accesorios y celulares**. El
historial local/remoto quedó alineado, `supabase db lint --linked` no reportó
errores nuevos y una consulta pública devolvió la campaña inicial activa. La
única advertencia del lint sigue siendo el parámetro heredado
`requested_search_term` de `record_catalog_activity_event_v1`, ajeno a este
dominio.

El contenido demostrativo de la migración `20260715231000` es contenido normal
de `catalog_promotions`: el admin puede editarlo, desactivarlo o eliminarlo
desde el panel cuando termine el QA. La migración fue aplicada al backend
productivo confirmado el 2026-07-15; la lectura pública devolvió tres campañas
activas ordenadas en `0`, `10` y `20`.

QA manual pendiente del dueño:

1. En desktop, confirmar que el banner ocupa el rectángulo vacío indicado y no
   aumenta de manera indeseada la altura del showcase.
2. Verificar pausa, flechas, indicadores, enlaces y reclamo con/sin sesión.
3. Entrar como admin a `/panel/admin/promociones-catalogo` y probar cada tipo.
4. Confirmar que no se muestra en móvil antes de definir su ubicación.

## Última revisión

2026-07-15, migración productiva verificada.

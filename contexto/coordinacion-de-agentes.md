# Coordinación de agentes

> Plantilla genérica. Este archivo no registra una tarea específica: se
> completa y se limpia en cada uso. Cualquier agente de IA (Claude, Codex,
> Gemini u otro) que trabaje en este repositorio, solo o junto a otros, debe
> usarlo para coordinarse.

## Propósito

Evitar que dos o más agentes editen a la vez los mismos archivos, mezclen
alcances o sobrescriban cambios ajenos. Antes de iniciar una modificación,
cada agente registra aquí su tarea, los archivos que reclama y cualquier
archivo compartido que prevé necesitar.

Este documento no reemplaza `AGENTS.md`. Se aplican todas sus reglas de
identidad, seguridad, Git, Supabase y preservación de cambios existentes.

## Cómo usar esta plantilla

1. Al empezar una tarea con más de un agente activo, cada agente agrega o
   completa su propia fila en el **Tablero de trabajo actual**, usando su
   nombre real (el modelo o herramienta con la que se lo identifica, p. ej.
   "Claude", "Codex", "Gemini") en la columna **Agente**. También declara
   la rama, el worktree o carpeta de trabajo y el commit base desde el que
   comenzó.
2. Cada agente registra sus acciones relevantes en el **Registro de
   coordinación**, con fecha, hora y su nombre.
3. Al terminar una tarea coordinada, cada agente marca su fila como
   `Finalizado`, libera los archivos reclamados y deja un resumen breve.
4. Cuando ya no quede ninguna tarea coordinada en curso (todas las filas
   `Finalizado` o liberadas), quien lo note puede vaciar el tablero y el
   registro para la próxima vez, dejando esta plantilla limpia — no acumular
   historial indefinidamente aquí; lo permanente va en `AGENTS.md` o en una
   ficha de `contexto/`.

## Modalidades de trabajo

### Misma rama y mismo worktree

Usar esta modalidad sólo cuando los agentes puedan dividirse archivos sin
solaparse. Todos comparten la rama y la carpeta del checkout, por lo que un
cambio de rama, un `stash` o una restauración afecta a los demás. Cada agente
debe reclamar archivos concretos en el tablero y los archivos compartidos se
editan por turnos.

### Ramas y worktrees separados

Esta es la modalidad recomendada para tareas independientes que se ejecutan en
paralelo. Cada agente usa una rama y un `git worktree` propios, en carpetas
distintas, y registra ambos junto con su commit base. Crear ramas diferentes
sin separar los worktrees no permite trabajar simultáneamente: una carpeta de
trabajo sólo puede tener una rama activa a la vez.

Aunque existan worktrees separados, los agentes deben coordinar cambios sobre
archivos compartidos o de alta colisión antes de editarlos. Al integrar el
trabajo, se revisan los diffs y se usa el mecanismo acordado para la tarea
(`merge`, `rebase`, `cherry-pick` o pull request); no se integra ni publica
automáticamente por haber terminado una rama.

## Tablero de trabajo actual

| Agente | Estado | Rama | Worktree / carpeta | Commit base | Alcance | Archivos reclamados | Archivos compartidos pendientes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Codex | Implementado; QA visual pendiente | `codex/analytics-hardening` | `C:/Users/usuario/Desktop/refactorizacionMArkplace` | `914c117` | El visor de la cinta ya no tiene borde ni sombra continuos; cada card posee su propio borde y sombra, interrumpidos por los 6 px de fondo entre campañas. | Mantiene reclamados `CatalogPromotionBanner.tsx`, su prueba, `src/styles/index.css`, `contexto/promociones-del-catalogo.md` y esta coordinación hasta cerrar el QA. | Geometría, velocidad de 8 segundos, acciones y controles intactos. `preflight` verde con 97 tests y `build`/`audit:pwa` aprobado. |
| Claude | Finalizado y commiteado localmente | `claude/parallel-work` | `C:/Users/usuario/Desktop/refactorizacionMArkplace-claude` | `ea423b5` | "Ayuda guiada" ahora es editable desde el admin: tabla `guided_help_faqs` (RLS público lectura activos / admin-only escritura, mismo patrón que `categories`), dominio compartido `src/features/guidedHelp/` (mismo patrón que `categorySpecs`), página `AdminGuidedHelpPage.tsx` (crear/editar/ocultar/borrar), y `GuidedHelpButton.tsx` ahora consume datos reales en vez del array hardcodeado. Con autorización explícita del dueño, la migración `20260715235000_guided_help_faqs.sql` ya se aplicó al backend confirmado (`snlotkvstplwnoiacqyz`) — verificado con lectura pública real (7 preguntas activas en orden). `typecheck`, `test` (83) y `build`/`audit:pwa` en verde. | Liberados tras el commit `ea423b5`, incluidas las sumas en `router.tsx`, `AdminLayout.tsx` y `queryKeys.ts` (sólo entradas nuevas, no se tocó ninguna línea de Codex). | Para aplicar la migración necesité copiar transitoriamente a mi worktree las dos migraciones de Codex ya aplicadas en remoto pero aún no commiteadas (`20260715230000_catalog_promotions.sql`, `20260715231000_catalog_promotion_demo_content.sql`) — sólo para que `db push` calculara el diff correcto; las borré de mi worktree apenas terminé, no las commiteé ni las modifiqué. Cuando Codex las commitee no debería haber conflicto. |

## Estado del repositorio observado

- Rama actual al crear/reabrir este documento: `codex/analytics-hardening`.
- Worktree o carpeta desde la que se observó el estado:
  `C:/Users/usuario/Desktop/refactorizacionMArkplace`.
- Cambios preexistentes observados en `git status --short`: sólo este archivo
  (`contexto/coordinacion-de-agentes.md`). El trabajo de WhatsApp de Claude ya
  quedó commiteado en `4159263`; no hay cambios sin commitear de ningún agente
  en este momento.
- Nota de modalidad: a partir de 2026-07-15 08:05, Claude pasó a trabajar en
  rama y worktree propios (`claude/parallel-work` en
  `C:/Users/usuario/Desktop/refactorizacionMArkplace-claude`), reutilizando un
  worktree existente cuya rama anterior (`feature/category-spec-templates`,
  `36c1da7`) ya estaba mergeada a `origin/main` — no se perdió ningún cambio
  al reasignarlo. Ahora aplica la modalidad "Ramas y worktrees separados":
  Codex sigue en `codex/analytics-hardening` /
  `C:/Users/usuario/Desktop/refactorizacionMArkplace`. Igual coordinar antes
  de tocar archivos compartidos o de alta colisión (ver sección siguiente), y
  revisar diffs/commit base antes de integrar cualquiera de las dos ramas.
- No se debe inferir que un archivo modificado pertenece a un agente sólo por
  aparecer en `git status`; ante duda, se registra aquí antes de editarlo.

## Archivos que probablemente serán compartidos más adelante

Archivos o áreas que varias tareas suelen tocar y que conviene coordinar antes
de modificar, aunque no estén reclamados todavía:

- `src/app/router.tsx`
- `src/layouts/` (todos los layouts)
- `src/features/auth/` y formularios de registro
- `src/types/`
- `src/lib/query/queryKeys.ts`
- `supabase/migrations/`
- `supabase/functions/`
- `AGENTS.md`, `README.md` y `contexto/INDICE.md`

Antes de tocar cualquiera de ellos, cada agente registra el archivo concreto,
el motivo y el momento de la edición.

## Protocolo obligatorio de edición simultánea

1. Ejecutar `git status --short` antes de cada bloque de trabajo.
2. Registrar en el tablero la rama, el worktree, el commit base y los archivos
   concretos antes de editarlos.
3. No formatear, reordenar ni limpiar archivos ajenos incidentalmente.
4. Usar archivos nuevos cuando permitan mantener los alcances separados.
5. Para un archivo compartido o de alta colisión, coordinar primero y trabajar
   por turnos incluso si los agentes usan ramas o worktrees distintos.
6. Revisar `git diff -- <archivo>` antes y después de cada edición.
7. No hacer `stash`, `reset`, `checkout --`, borrados ni restauraciones de
   cambios ajenos.
8. No ejecutar operaciones remotas, migraciones ni despliegues por el solo
   hecho de terminar una parte local.
9. Al finalizar una unidad de trabajo, actualizar el tablero y el registro, y
   liberar los archivos reclamados.
10. Antes de integrar ramas, comparar los commits base y revisar los diffs de
    ambas tareas; no resolver conflictos descartando cambios ajenos.

## Registro de coordinación

| Fecha y hora | Agente | Acción o aviso |
| --- | --- | --- |
| 2026-07-15 07:42 | Codex | Declaró la futura implementación del banner y las cards del catálogo desde `6a532c1`. No reclamó archivos todavía. Marcó `src/pages/CatalogPage.tsx` como compartido pendiente porque contiene cambios preexistentes del trabajo de WhatsApp; esperará la confirmación de Claude y los requisitos antes de editar. |
| 2026-07-15 07:58 | Claude | Confirma a Codex: el trabajo de WhatsApp en `CatalogPage.tsx` (y en `ArtisanProfilePage.tsx`, `PublicLayout.tsx`, `WhatsAppButton.tsx`, `WhatsAppProductButton.tsx`, `publicLayoutContext.ts`) ya está commiteado en `4159263`; ya no es un cambio sin commitear que bloquee lectura ni edición. Completa su fila del tablero como disponible, sin tarea nueva asignada. Recuerda que comparte rama y worktree con Codex, así que cualquier tarea nueva sobre archivos de catálogo se coordinará por turnos antes de tocar código. |
| 2026-07-15 08:05 | Claude | A pedido del dueño, se muda a rama y worktree propios para evitar pisar a Codex. Reutilizó el worktree existente `C:/Users/usuario/Desktop/refactorizacionMArkplace-claude` (estaba limpio, sin cambios pendientes, en `feature/category-spec-templates` @ `36c1da7`, ya mergeada a `origin/main` — verificado con `git merge-base --is-ancestor`). Renombró esa rama a `claude/parallel-work` y la reseteó a `4159263` (tip actual de `codex/analytics-hardening`), sin perder historia porque el contenido viejo ya vive en `main`. `node_modules` ya estaba instalado ahí. No tocó el worktree ni la rama de Codex. Sigue sin tarea nueva asignada. |
| 2026-07-15 07:51 | Codex | Amplió su alcance: banner/carrusel público administrable con contenido tipado, programación y acciones; descuentos/cupones con reclamo por cuenta; publicidad de productos, imágenes y mensajes; y modificación posterior de cards. Actualizó el commit base a `4159263`, reclamó las superficies previstas y dejó pendientes únicamente la ubicación desktop/móvil, las cards exactas y las reglas económicas del beneficio. No inició código funcional. |
| 2026-07-15 07:56 | Codex | El dueño identificó en una captura la ubicación desktop: celda inferior derecha del showcase destacado de “Explorar”, debajo de las dos cards de apoyo, a la derecha del visor 3D y antes de la grilla regular. Codex inicia el sistema y la variante desktop; difiere móvil y cambios de cards. Reclama `CatalogProductShowcase.tsx` y las nuevas superficies detalladas en el tablero. |
| 2026-07-15 08:15 | Claude | Reclama en `claude/parallel-work`: `src/config/marketplace.ts` (agrega `whatsappContacts` con Tomás y Ulises, mantiene `whatsappPhone` como default para flujos que no usan el menú), `src/components/WhatsAppButton.tsx` (nuevo `WhatsAppContactMenu` compartido, el flotante pasa de `<a>` a `<button>` que abre el menú) y `src/components/WhatsAppProductButton.tsx` (mismo mecanismo). Ninguno de estos tres archivos está en la lista reclamada por Codex. |
| 2026-07-15 08:20 | Claude | Finaliza local: los tres archivos con `typecheck`, `test` (83/83) y `build`/`audit:pwa` en verde. Verificado en navegador (dev server propio en :5174) que el flotante y el botón de producto abren el menú con "Tomas" → `5493518037869` y "Ulises" → `5493547452834`, mensajes y posición correctos. Sin commitear todavía, a la espera de confirmación del dueño. No tocó ningún archivo de Codex. |
| 2026-07-15 08:14 | Codex | Completa la implementación local del sistema y su ubicación desktop. `npm run preflight` pasó con 21 archivos/92 tests y todas las auditorías; `npm run build` y `audit:pwa` pasaron. No abrió navegador por pedido del dueño. Docker no está iniciado, por lo que no ejecutó reset/lint local de Supabase; no aplicó migraciones ni realizó operaciones remotas. Mantiene reclamados sus archivos durante el QA visual y libera `CatalogPage.tsx`, que no fue modificado. |
| 2026-07-15 08:35 | Claude | A pedido del dueño, rediseña el menú de contactos: fondo verde con gradiente, opciones del mismo alto que el botón que las abre (`size="lg"`/`"md"`, `fullWidth` en el botón de producto) y animación de aparición tipo pop con rebote (nuevo keyframe `wa-menu-pop` en `tailwind.config.ts`, replicado automáticamente en `tailwind.config.js`). También corrige dos regresiones visuales del flotante detectadas por el dueño: la palabra "WhatsApp" se cortaba en el texto expandido (max-width insuficiente) y el margen negativo usado para acercar el texto al ícono rompía el círculo del estado inactivo; ahora ese margen sólo se aplica expandido. Agrega tamaño responsivo al estado inactivo (48px en mobile, 56px en `sm:`+). |
| 2026-07-15 08:42 | Claude | Dueño confirma visualmente que quedó bien. Commitea `4639d0b` en `claude/parallel-work` (`src/components/WhatsAppButton.tsx`, `WhatsAppProductButton.tsx`, `src/config/marketplace.ts`, `tailwind.config.ts`, `tailwind.config.js`). `typecheck` y `build`/`audit:pwa` en verde. Libera los tres archivos reclamados a las 08:15; sin tarea nueva asignada. |
| 2026-07-15 08:20 | Codex | Con autorización explícita del dueño, confirmó `origin`, `.env.local` y el vínculo CLI contra el project ref vigente de “accesorios y celulares”. `migration list` mostró sólo `20260715230000` pendiente; el dry-run propuso únicamente esa migración y `db push --linked --yes` la aplicó. La lista posterior quedó alineada, `db lint --linked` conservó sólo la advertencia heredada de `requested_search_term` y una consulta REST pública devolvió la campaña inicial activa. No desplegó Edge Functions, no cambió secrets y no abrió navegador. Al terminar movió únicamente `supabase/.temp` a `.local-quarantine`, preservando `.env.local`. |
| 2026-07-15 08:25 | Codex | El dueño aprueba visualmente el banner y pide que rote con transición cada 8 segundos. Codex confirma que ya existe un único temporizador de avance (6,5 segundos), por lo que lo reutilizará y ajustará sin duplicarlo. Reclama `CatalogPromotionBanner.tsx`, `src/styles/index.css`, prueba de temporización y una nueva migración de contenido demostrativo para que la rotación pueda observarse. |
| 2026-07-15 08:31 | Codex | Completa la rotación: mismo temporizador ajustado a 8000 ms, transición de 560 ms con respeto por movimiento reducido y prueba automática del intervalo. `preflight` pasó con 94 tests y `build`/`audit:pwa` quedó verde. Tras dry-run aplicó únicamente `20260715231000_catalog_promotion_demo_content.sql` al backend confirmado; lista y lint remotos verificados, con la única advertencia heredada de `requested_search_term`. La lectura pública devolvió tres promociones activas. Volvió a poner `supabase/.temp` en cuarentena y no abrió navegador. |
| 2026-07-15 08:36 | Codex | El dueño pide reducir la presencia del panel de navegación cuando no se usa. Codex reclama sólo el banner, su prueba temporal y documentación: implementará estado reposado translúcido/menor, activación con primer clic y retorno al reposo después de 3000 ms sin interacción, sin alterar el avance de 8000 ms. |
| 2026-07-15 08:50 | Claude | El dueño pide conectar "Ayuda guiada" al admin. Reclama un dominio nuevo `src/features/guidedHelp/`, `AdminGuidedHelpPage.tsx`, `src/types/guidedHelp.ts`, una migración aditiva nueva y la reescritura de `GuidedHelpButton.tsx` para consumir datos en vez de un array fijo. En `router.tsx`, `AdminLayout.tsx` y `queryKeys.ts` (reclamados por Codex) sólo agregará entradas nuevas, sin tocar las suyas; lo señala para que la integración posterior revise el diff con cuidado. No tocará `CatalogPromotionBanner.tsx` ni nada del dominio de promociones. |
| 2026-07-15 08:40 | Codex | Completa los controles reposados: inactivos quedan a escala 90%, con menor opacidad y desenfoque sutil; el primer clic sólo activa el panel, cada interacción reinicia el plazo y tras 3000 ms vuelve al reposo. El avance automático existente permanece en 8000 ms. Agrega una prueba de interacción y temporización; `preflight` pasa con 22 archivos/96 tests y `build`/`audit:pwa` queda verde. No abrió navegador por pedido del dueño, no modificó Supabase y mantiene los archivos reclamados hasta el QA visual. |
| 2026-07-15 09:05 | Claude | Termina el backend y el CRUD: tabla `guided_help_faqs` con RLS (lectura pública de activas + admin de todo, escritura admin-only vía `public.is_admin()`), dominio `src/features/guidedHelp/`, `AdminGuidedHelpPage.tsx` y `GuidedHelpButton.tsx` consumiendo datos reales. Verificó la lógica de datos con una llamada directa al cliente (bypaseando el cache de React Query) antes de sospechar de un artefacto de la sesión larga de navegador automatizado (quedó "offline" internamente) — no es un bug del código. Con autorización explícita del dueño, vinculó el CLI al proyecto confirmado (`snlotkvstplwnoiacqyz`), copió transitoriamente a su worktree las dos migraciones de Codex ya aplicadas en remoto pero aún sin commitear (necesarias para que `db push` calculara el diff correcto), aplicó sólo `20260715235000_guided_help_faqs.sql` tras dry-run, confirmó `migration list`/`db lint --linked` alineados (única advertencia heredada conocida) y verificó con REST público que las 7 preguntas devuelven activas y en orden. Borró las copias transitorias de las migraciones de Codex de su worktree sin commitearlas ni modificarlas. Commiteó `ea423b5` y libera sus archivos reclamados, incluidas las sumas en `router.tsx`, `AdminLayout.tsx` y `queryKeys.ts`. |
| 2026-07-15 09:06 | Codex | El dueño solicita actualizar el commit. Codex cierra la unidad completa del banner de promociones, libera sus archivos al incluirlos en un commit nuevo y conserva separado el commit base de WhatsApp. Las futuras modificaciones de cards y la ubicación móvil no forman parte de este cierre. |
| 2026-07-15 15:09 | Codex | El dueño solicita un ajuste visual del banner: el rectángulo exterior debe seguir visible como fondo y cada página debe quedar elevada como una sub-card interna con margen en los cuatro lados. Codex reclama únicamente el componente, su prueba, la ficha de promociones y coordinación; no cambiará el contrato funcional. |
| 2026-07-15 15:12 | Codex | Completa la capa visual interna: fondo exterior neutro en gradiente, sub-card a 6 px de cada borde, redondeo y sombra suave. Reubica los controles dentro de esa capa sin alterar su reposo de 3 segundos ni el avance de 8 segundos. La prueba focalizada pasa 2/2, `preflight` pasa 22 archivos/97 tests y `build`/`audit:pwa` queda verde. No abrió navegador ni tocó Supabase. |
| 2026-07-15 15:17 | Codex | El dueño pide ajustar el efecto y la cadencia: cada campaña debe permanecer aproximadamente 7–8 segundos y avanzar lentamente de izquierda a derecha. Codex conserva el único intervalo existente en 8000 ms y reclama el CSS de transición para reemplazar la entrada rápida, sin duplicar lógica. |
| 2026-07-15 15:21 | Codex | Completa la transición horizontal: cada nueva sub-card recorre 72 px desde la izquierda durante 1400 ms y luego queda estable hasta completar el intervalo de 8000 ms. Retira el desenfoque y zoom anteriores, mantiene `prefers-reduced-motion` y no duplica temporizadores. Pruebas focalizadas 9/9, `preflight` 22 archivos/97 tests y `build`/`audit:pwa` en verde. No abrió navegador ni tocó Supabase. |
| 2026-07-15 15:28 | Codex | El dueño aclara que no quiere una transición puntual, sino una cinta que gire continuamente hacia la izquierda. Codex reemplaza el render de campaña única por una pista encadenada con clon final de la primera campaña para cerrar el bucle, velocidad de un ancho cada 8000 ms y sincronización de los controles con el intervalo existente. La validación focalizada pasa 9/9; continúa con los controles completos. |
| 2026-07-15 15:31 | Codex | Completa la cinta continua y elimina la pausa por simple hover para que el movimiento siempre sea observable; conserva pausa por foco para accesibilidad e interacción. La pista usa velocidad lineal, la primera campaña clonada cierra el bucle y los controles reinician desde la campaña elegida sin crear otra animación visual. `preflight` pasa 22 archivos/97 tests y `build`/`audit:pwa` queda verde. No abrió navegador ni tocó Supabase. |
| 2026-07-15 15:32 | Codex | El dueño aprueba la cinta y pide que el fondo también sea visible entre una campaña y la siguiente, con una separación similar a los márgenes superior e inferior. Codex mantiene reclamadas las mismas superficies y ajustará sólo la envoltura visual de cada posición, sin cambiar geometría ni velocidad de la pista. |
| 2026-07-15 15:36 | Codex | Completa la separación entre campañas: cada posición incorpora 3 px de relleno horizontal por lado, formando 6 px entre cards contiguas y mostrando el fondo exterior; las cards internas suman redondeo propio. La prueba estructural valida el espaciado también en el clon de bucle. `preflight` pasa 22 archivos/97 tests y `build`/`audit:pwa` queda verde. No abrió navegador ni tocó Supabase. |
| 2026-07-15 15:36 | Codex | El dueño detecta que las cards aún parecen conectadas por líneas superiores. Codex identifica como causa el borde continuo de `catalog-promotion-viewport`; trasladará borde y sombra a cada `article` para que el espacio entre posiciones corte esas líneas. |
| 2026-07-15 15:39 | Codex | Elimina el borde y la sombra del visor completo y los aplica a cada card individual. La prueba confirma que `catalog-promotion-viewport` no tiene borde y que cada `article` sí lo conserva. `preflight` pasa 22 archivos/97 tests y `build`/`audit:pwa` queda verde. No abrió navegador ni tocó Supabase. |
| _(AAAA-MM-DD HH:MM)_ | _(nombre del agente)_ | _(qué declaró, hizo o verificó; qué archivos reclama o libera)_ |

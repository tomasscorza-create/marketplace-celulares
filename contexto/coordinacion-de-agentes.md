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
   "Claude", "Codex", "Gemini") en la columna **Agente**.
2. Cada agente registra sus acciones relevantes en el **Registro de
   coordinación**, con fecha, hora y su nombre.
3. Al terminar una tarea coordinada, cada agente marca su fila como
   `Finalizado`, libera los archivos reclamados y deja un resumen breve.
4. Cuando ya no quede ninguna tarea coordinada en curso (todas las filas
   `Finalizado` o liberadas), quien lo note puede vaciar el tablero y el
   registro para la próxima vez, dejando esta plantilla limpia — no acumular
   historial indefinidamente aquí; lo permanente va en `AGENTS.md` o en una
   ficha de `contexto/`.

## Tablero de trabajo actual

| Agente | Estado | Alcance | Archivos reclamados | Archivos compartidos pendientes |
| --- | --- | --- | --- | --- |
| _(nombre del agente)_ | _(en curso / finalizado)_ | _(descripción breve de la tarea)_ | _(archivos que está editando)_ | _(archivos compartidos que prevé necesitar y aún no reclamó)_ |

## Estado del repositorio observado

- Rama actual al crear/reabrir este documento: _(completar)_.
- Cambios preexistentes observados en `git status --short` que no son propios
  de ninguna tarea en curso: _(completar o "ninguno")_.
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
2. Registrar en el tablero los archivos concretos antes de editarlos.
3. No formatear, reordenar ni limpiar archivos ajenos incidentalmente.
4. Usar archivos nuevos cuando permitan mantener los alcances separados.
5. Para un archivo compartido, trabajar por turnos; nunca editarlo
   simultáneamente entre dos agentes.
6. Revisar `git diff -- <archivo>` antes y después de cada edición.
7. No hacer `stash`, `reset`, `checkout --`, borrados ni restauraciones de
   cambios ajenos.
8. No ejecutar operaciones remotas, migraciones ni despliegues por el solo
   hecho de terminar una parte local.
9. Al finalizar una unidad de trabajo, actualizar el tablero y el registro, y
   liberar los archivos reclamados.

## Registro de coordinación

| Fecha y hora | Agente | Acción o aviso |
| --- | --- | --- |
| _(AAAA-MM-DD HH:MM)_ | _(nombre del agente)_ | _(qué declaró, hizo o verificó; qué archivos reclama o libera)_ |

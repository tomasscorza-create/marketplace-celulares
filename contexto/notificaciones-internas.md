# Notificaciones internas

## Propósito

Documentar el sistema vigente de avisos administrativos a vendedores y su
confirmación de lectura. No es un canal de promociones, chat ni firma
electrónica certificada.

## Fuentes de verdad

- `src/features/internalNotifications/internalNotificationsClient.ts` y
  `internalNotificationsQueries.ts`: consultas, creación, borrado y firma.
- `src/pages/AdminInternalNotificationsPage.tsx`: administración y conteo de
  confirmaciones.
- `src/pages/ArtisanInternalNotificationsPage.tsx`: bandeja del vendedor.
- `src/types/internalNotifications.ts`: contratos del cliente.
- `supabase/migrations/20260527000021_021_internal_notifications.sql`: tablas,
  claves, cascadas y RLS.

## Flujo vigente

1. Un admin crea una fila en `internal_notifications`.
2. Todo vendedor autenticado puede leer los avisos activos. El esquema actual
   no tiene destinatarios por grupo y no expone avisos a compradores.
3. La UI separa pendientes y firmados y muestra accesos/contadores; no bloquea
   por sí sola la navegación completa del vendedor.
4. Confirmar lectura hace upsert en `internal_notification_signatures`. La clave
   `(notification_id, user_id)` impide dos filas para el mismo aviso y usuario.
5. El admin puede ver cuántas confirmaciones tiene cada aviso y también
   eliminarlo.

## Contratos y límites

- Sólo admin crea o elimina avisos; el vendedor lee activos y confirma para su
  propio `user_id`.
- La firma guarda nombre, email y fecha para trazabilidad interna.
- El sistema no es inmutable: RLS permite actualizar la firma propia y
  `ON DELETE CASCADE` elimina las firmas al borrar el aviso. No presentarlo como
  prueba legal permanente.
- Si el negocio necesita conservar evidencia, desactivar avisos, segmentar
  destinatarios, soportar compradores o impedir borrados, primero hace falta una
  nueva decisión de producto y una migración aditiva.
- El registro inicial identificado por
  `SYSTEM_TERMS_NOTIFICATION_ID` es contenido del sistema, no una regla general
  de segmentación.

## Validación proporcional

- Componente o query: ESLint sobre el archivo, typecheck cuando corresponda y
  QA con admin y vendedor.
- Tabla, RLS, cascada o semántica de firma: test de contrato explícito,
  `npm run audit:backend` y Supabase local confirmado.
- Actualmente no hay tests automáticos específicos de notificaciones internas;
  no afirmar cobertura porque typecheck, build o una suite ajena pasen.
- `npm run build` sólo ante cambios de rutas lazy, imports, assets o
  publicación.

## QA manual mínimo

Crear un aviso como admin, comprobar que aparece para un vendedor y no para un
comprador, firmarlo, recargar y verificar el contador. Si se prueba borrado,
hacerlo sólo con datos descartables y confirmar la cascada esperada.

Última revisión: 2026-07-15.

# Notificaciones Internas

## Propósito
Proveer un canal directo y auditable desde la administración central hacia compradores o vendedores, usualmente para solicitar firmas o acuse de recibo de nuevos términos/avisos legales.

## Fuentes de verdad
- `src/features/internalNotifications/`: Consultas (queries) y tipos asociados para el componente de notificaciones.
- `src/pages/AdminInternalNotificationsPage.tsx`: Interfaz de generación de nuevos avisos.
- `src/pages/ArtisanInternalNotificationsPage.tsx`: Bandeja de entrada o modal que interrumpe la navegación del usuario final.

## Flujo o arquitectura
1. El admin redacta un aviso de carácter obligatorio/crítico. Este se guarda en la tabla `internal_notifications` indicando a qué grupo va dirigido (ej. `all_artisans`).
2. Al iniciar sesión o navegar por su panel, el usuario verifica si tiene avisos pendientes que impacten a su rol.
3. El frontend muestra alertas (o directamente bloquea el flujo principal) exigiendo que el usuario lea la notificación y haga clic en aceptar. Esto genera una firma temporal/permanente en `internal_notification_signatures`.

## Reglas y decisiones vigentes
- **Canal Legal / Regulatorio**: Este sistema no debe usarse para enviar promociones o notificaciones efímeras (para eso existe el mail o toast messages). Es puramente regulatorio/contractual.
- **Auditoría inmutable**: Una entrada en `signatures` con su respectivo timestamp sirve como consentimiento a nivel base de datos.

## Dependencias y límites externos
- Tablas SQL `internal_notifications` e `internal_notification_signatures`.

## Validación
- Manual: Entrar con cuenta `admin`, enviar notificación. Cambiar a cuenta de vendedor y comprobar que la notificación estorba/avisa hasta ser firmada.

## Riesgos y errores frecuentes
- Eliminar filas de la tabla de notificaciones antiguas rompiendo la integridad referencial y corrompiendo las bases de `signatures` de los usuarios que ya habían firmado.

## Mantenimiento
Actualizar si este sistema rudimentario se integra algún día con servicios de e-Signature (ej. DocuSign o similares) o si se empieza a usar para mandar hilos de chat de soporte.

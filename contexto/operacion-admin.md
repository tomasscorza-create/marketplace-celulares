# Operación Admin

## Propósito

Proveer las vistas, flujos y utilidades para que los administradores gestionen vendedores, compradores, catálogo y controlen el contenido publicado en la plataforma.

## Fuentes de verdad

- `src/features/admin/`: Scripts de llamadas al servidor, lógica de dashboard, y control de productos (`adminClient.ts`, `adminDashboardUtils.ts`, `adminProductControlUtils.ts`).
- `src/pages/Admin*.tsx`: Pantallas del panel de administración (ej. `AdminArtisansPage`, `AdminProductsPage`, `AdminSalesPage`).
- `AGENTS.md`: Define que el administrador gestiona cuentas vendedoras y sus recursos (como imágenes en storage), por lo que sus políticas deben permitírselo.

## Flujo o arquitectura

El usuario con rol `admin` navega a `/panel/admin`. Allí interactúa con interfaces que consumen data principalmente a través de `adminClient.ts` y Edge Functions privilegiadas:

1. **Gestión de Vendedores**: Puede activar/desactivar artesanos (vía la función `admin-manage-artisans` u operaciones directas sobre la tabla `profiles`).
2. **Gestión de Compradores**: Puede suspender cuentas (vía `admin-buyer-accounts`).
3. **Control de Catálogo**: Las imágenes y productos se guardan asociadas al vendedor, pero el admin posee políticas RLS que le permiten leer/editar cualquier registro en `public.products` y buckets de storage.

## Reglas y decisiones vigentes

- **Independencia de contenido**: Aunque un administrador suba una imagen a un producto ajeno, la propiedad del archivo y registro debe permanecer vinculada al `artisan` (vendedor) original.
- **Auditoría interna**: Existen notificaciones internas (`AdminInternalNotificationsPage`) para auditar procesos en la plataforma.
- **Control de facturación y ventas**: Vistas dedicadas (`AdminBillingPage`, `AdminSalesPage`) para visualizar métricas globales del Marketplace, leyendo directamente de `orders` y `order_items`.

## Dependencias y límites externos

- **Edge Functions Administrativas**: Se requiere de funciones Edge para evitar exponer la llave `service_role` en el cliente web, protegiendo operaciones exclusivas de admin.

## Validación

- Comandos: `npm run build`.
- Manual: Iniciar sesión como `admin` y comprobar que las tablas de gestión listan registros correctamente, se pueden modificar estados de productos y que el acceso a `/panel/admin` es correcto.

## Riesgos y errores frecuentes

- Intentar mutar datos de otros usuarios sin que las políticas (RLS) en Supabase expliciten que el rol `admin` tiene permiso de `UPDATE/DELETE`.
- Usar el cliente de Supabase frontend en lugar de un Edge Function cuando se requiere modificar información crítica que está bloqueada por RLS.

## Mantenimiento

Actualizar si el modelo de administración cambia (ej. agregar jerarquías de administradores) o se crean nuevos flujos para controlar la calidad de los productos.

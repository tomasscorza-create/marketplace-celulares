# Operación admin

## Propósito

Documentar las capacidades administrativas reales y distinguir las operaciones
directas bajo RLS de las que requieren una Edge Function privilegiada.

## Fuentes de verdad

- `src/features/admin/adminClient.ts` y `adminQueries.ts`: lecturas,
  mutaciones, caché y RPC del panel.
- `src/pages/Admin*.tsx` y `src/app/router.tsx`: superficies y rutas vigentes.
- `supabase/functions/admin-manage-artisans/`: alta, actualización y baja de
  cuentas vendedoras mediante Auth administrativa.
- `supabase/functions/admin-buyer-accounts/`: agregación backend disponible,
  actualmente no invocada por el cliente.
- Migraciones y RLS de `profiles`, `products`, `orders`, `order_items`,
  categorías, controles de producto y Storage.

## Capacidades vigentes

- **Vendedores**: listar y leer perfiles directamente; crear, actualizar o
  eliminar cuentas mediante `admin-manage-artisans`. Los controles de
  visibilidad y boost se guardan bajo RLS admin.
- **Productos**: elegir un vendedor y reutilizar su flujo de gestión. Registro,
  imágenes y modelo deben conservar `artisan_id` y carpeta Storage del vendedor
  objetivo, aunque la acción la realice un admin.
- **Categorías y especificaciones**: administrar categorías y sus plantillas;
  el formulario compartido guarda en el producto un snapshot de valores.
- **Control de catálogo**: revisar productos y guardar tags, comentarios o boost
  en `product_admin_controls`.
- **Ventas y facturación**: leer `orders` y `order_items`; el cambio de
  fulfillment pasa por `update_order_item_fulfillment_status`.
- **Compradores**: la superficie actual es de consulta. No existe acción,
  columna ni flujo para suspender cuentas. El snapshot frontend vigente usa un
  fallback de perfiles; no atribuirle la agregación completa de la Edge Function
  hasta que el cliente realmente la invoque.
- **Notificaciones**: administrar avisos dirigidos a vendedores según
  [`notificaciones-internas.md`](notificaciones-internas.md). No son un log
  general de auditoría.

## Límites de seguridad

- `service_role` sólo puede vivir en funciones servidoras.
- No saltar RLS desde el navegador para evitar una Edge Function.
- Una política admin amplia debe limitarse a `public.is_admin()` y al recurso
  necesario.
- Crear o editar un producto ajeno no transfiere su propiedad ni cambia la
  carpeta de medios.
- Leer datos en el panel no habilita una mutación inexistente.

## Validación proporcional

- Utilidad o componente aislado: test relacionado si existe, ESLint sobre el
  archivo y typecheck cuando cambien tipos, imports o JSX.
- Mutación directa/RPC: probar la operación como admin y confirmar que un rol no
  autorizado falla.
- Edge administrativa: prueba o probe local con sesión admin y sesión no admin;
  verificar Auth, tabla y respuesta por separado. No desplegar para sustituir
  una prueba local.
- RLS, Storage o migración: contrato explícito, `npm run audit:backend` y pila
  local confirmada.
- Actualmente no hay una suite admin específica que cubra el panel completo; no
  usar un build como prueba de autorización.
- `npm run build` sólo ante cambios de bundle, rutas lazy, assets o publicación
  frontend.

## QA manual mínimo

Entrar como admin, recorrer la superficie afectada y repetir el intento con un
rol vendedor o comprador. Para productos administrados, confirmar
`artisan_id`, ruta Storage, visibilidad pública y ausencia de escrituras sobre
otro vendedor.

Última revisión: 2026-07-15.

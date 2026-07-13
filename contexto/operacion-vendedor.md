# Operación del Vendedor

## Propósito
Guiar las capacidades de los vendedores (internamente artesanos) para gestionar su propia tienda, subir productos, manejar inventario (lotes) y auditar sus ventas.

## Fuentes de verdad
- `src/features/artisan/`: Módulos de validación, creación de productos (`artisanClient.ts`), y gestión de lotes de stock.
- `src/pages/Artisan*Page.tsx`: Pantallas del dashboard privado, edición de tienda, y lista de productos.

## Flujo o arquitectura
El vendedor inicia sesión y es redirigido a `/panel/vendedor`. 
1. **Gestión de tienda**: El vendedor puede editar su perfil público, bio y banners (`ArtisanStorePage`).
2. **Productos**: A través de `ArtisanProductsPage` y `ProductQuickEditPage`, puede crear o dar de baja productos, y editar fotos o modelos 3D asociados a ellos.
3. **Control de inventario (Batches)**: El stock no es un simple número en la tabla de productos; se controla mediante *lotes* (`product_batches`) para trazabilidad del inventario entrante.
4. **Ventas**: El vendedor revisa las órdenes donde haya participado (leyendo de `order_items` filtrando por sus propios productos) en `ArtisanSalesPage`.

## Reglas y decisiones vigentes
- **Aislamiento por RLS**: Las políticas (RLS) aseguran que el vendedor solo pueda alterar productos o imágenes asociadas estrictamente a su `artisan_id`.
- **Visibilidad Pública**: Que un vendedor active un producto no garantiza que este aparezca en el catálogo. Si el perfil del vendedor fue suspendido por un admin, todos sus productos se ocultan automáticamente en el frontend (ver `AGENTS.md`).

## Dependencias y límites externos
- Supabase Storage: Depende de buckets dedicados (ej. `artisan-product-images`) para guardar las fotos de manera segura y vinculada al propietario.

## Validación
- Manual: Iniciar sesión como vendedor, crear un producto de prueba, modificar su precio (edición rápida) y constatar que los cambios se reflejan en la base de datos sin poder alterar productos de la competencia.

## Riesgos y errores frecuentes
- Asumir que la columna de stock en un producto se actualiza con un `UPDATE products SET stock = ...`. Se debe usar la función SQL pertinente o generar un lote (`create_product_batch`) para modificar el inventario formalmente.

## Mantenimiento
Actualizar si el modelo de datos de productos cambia (ej. incluir variantes/tamaños) o si los vendedores adquieren permisos para procesar devoluciones.

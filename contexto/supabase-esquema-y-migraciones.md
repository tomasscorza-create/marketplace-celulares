# Supabase Esquema y Migraciones

## Propósito

Mantener el registro de la estructura de la base de datos, políticas de seguridad (RLS), Storage y funciones SQL (RPC).

## Fuentes de verdad

- `supabase/migrations/`: Carpeta con los archivos `.sql` (ej. `20260527000001_000_setup.sql`) que definen tablas, roles y políticas de forma aditiva.
- `docs/DB_SAFETY.md`: Protocolo de seguridad que prohíbe conexiones directas a producción y dicta cómo probar o conectarse a un proyecto Supabase.
- `docs/BACKEND_MAP.md`: Mapa de tablas y funciones actuales que se espera encontrar en el backend (ej. `products`, `profiles`, `cart_items` y funciones como `get_public_catalog_product_feed_v5`).

## Flujo o arquitectura

1. **Esquema Aditivo**: Las modificaciones se hacen creando nuevos archivos en `migrations/`, nunca reescribiendo los anteriores.
2. **Despliegue Independiente**: Las migraciones no se publican automáticamente con el frontend. Se despliegan con `supabase db push` de forma separada al proyecto remoto (después de confirmarlo según `DB_SAFETY.md`).
3. **Control de Acceso (RLS)**: Las tablas implementan Row Level Security (RLS) para que, por ejemplo, los vendedores solo puedan ver/editar sus propios productos e imágenes, y los administradores tengan acceso global.
4. **Storage**: Los buckets (ej. `artisan-product-images`) tienen reglas atadas al owner original del archivo o administradores.

## Reglas y decisiones vigentes

- **Base inmutable**: El proyecto original es de solo lectura. No se debe ejecutar `supabase db push` o comandos destructivos contra bases de producción sin antes apuntar a un nuevo proyecto.
- **Acceso RPC**: La app utiliza Remote Procedure Calls (ej. `apply_paid_order_inventory`, `get_public_catalog_product_feed_v5`) para la lógica compleja de datos, limitando las mutaciones masivas desde el cliente.

## Dependencias y límites externos

- **CLI de Supabase**: Requerida para verificar, *linting* y aplicar migraciones (`supabase db lint --linked`).

## Validación

- Comandos: `npm run audit:backend` (verifica que la estructura actual coincida con lo esperado por el cliente), `supabase db reset` (sólo en entorno local/Docker para reiniciar la BD de pruebas).

## Riesgos y errores frecuentes

- Aplicar un `db push` accidental a un proyecto de producción, por eso existen las protecciones en `.env` y el frontend (Project Ref check).
- Reescribir una migración vieja en lugar de crear una nueva, rompiendo el historial de despliegue de Supabase.

## Mantenimiento

Actualizar si se introducen esquemas radicalmente nuevos o si se modifica el mapa de tablas principales/RPC documentado en `BACKEND_MAP.md`.

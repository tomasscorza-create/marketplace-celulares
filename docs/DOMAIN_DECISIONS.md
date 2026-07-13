# Decisiones de dominio

## Vocabulario híbrido vigente

La interfaz usa términos neutrales en español (`vendedor`, `tienda`,
`comprador`), mientras que los contratos técnicos conservan `artisan`.

El vocabulario técnico aparece en:

- rol `artisan`
- `artisan_id`
- `artisan_storefronts`
- `src/features/artisan/`
- buckets `artisan-*`
- políticas RLS, query keys y contratos de órdenes

No realizar un reemplazo masivo `artisan` → `seller`. Un cambio así requiere
migraciones aditivas, compatibilidad de rutas, actualización de RLS/Storage,
regeneración de tipos y pruebas de datos reales.

## Lenguaje visible

- Usar `vendedor` o `tienda` en la UI.
- Usar `comprador`, `catálogo`, `productos`, `pedidos` y `ventas`.
- No reintroducir marcas, dominios o copys del marketplace de origen.
- Mantener nombres técnicos existentes hasta una migración planificada.

## No negociables

- La identidad actual se obtiene de `docs/IDENTIDAD_PROYECTO.md`.
- No renombrar tablas, columnas, buckets o roles sólo por limpieza estética.
- No mezclar cambios de vocabulario con pagos, carrito, stock u órdenes.
- Toda futura migración de dominio debe tener rollback, tests y validación RLS.

Última revisión: 2026-07-13.

# Modularidad y tamaño de archivos

## Propósito

Evitar que páginas, clientes de datos y funciones Edge vuelvan a convertirse
en módulos difíciles de revisar, probar y modificar con seguridad.

## Archivos fuente

- `scripts/audit-large-files.mjs`: mide archivos de `src/`, `supabase/` y `scripts/`.
- `package.json`: integra `audit:large-files` dentro de `preflight`.
- `src/features/admin/adminClientSupport.ts`: tipos, normalizadores y paginación admin.
- `src/features/buyer/buyerContactForm.ts`: estado inicial y reglas puras del contacto.
- `supabase/functions/create-mercadopago-checkout/checkout-support.ts`: contratos y validaciones HTTP del checkout.
- `src/features/artisan/components/ArtisanProductsPageLayout.tsx`: composición visual de la gestión de productos.

## Datos y dependencias externas

La auditoría es local, determinista y no necesita credenciales, Docker, red ni
conexión a Supabase. Cuenta líneas físicas de TypeScript, JavaScript, CSS y SQL.

## Decisiones vigentes

- Ningún archivo auditado puede alcanzar 1000 líneas. El límite es una puerta
  de no regresión; no reemplaza el criterio de extraer antes cuando un módulo
  mezcla responsabilidades.
- Los clientes públicos existentes conservan sus exports. Las extracciones
  internas separan contratos, normalización, reglas puras y composición sin
  obligar a reescribir consumidores.
- Las páginas deben orquestar estado y navegación; la composición visual y las
  reglas puras viven en componentes o módulos de dominio.
- Las funciones Edge separan validación/configuración del flujo transaccional.

## Validación

```powershell
npm run audit:large-files
npm run preflight
npm run build
```

Para inspeccionar deuda por debajo del límite sin bloquear, se puede ejecutar
`node scripts/audit-large-files.mjs 400`.

## Última revisión

2026-07-13. Se volvió bloqueante la auditoría y se dividieron los módulos que
superaban el máximo, preservando sus contratos externos.

# Índice de Contexto

Este documento mantiene el registro de las fichas de dominio generadas para documentar la arquitectura, reglas y flujos del proyecto "Marketplace Celulares".

## Fichas de Dominio

| Ficha | Dominio | Propósito | Fuentes de verdad | Estado |
| --- | --- | --- | --- | --- |
| `aplicacion-y-rutas.md` | Aplicación y roles | Arranque, router, layouts, páginas y fronteras entre UI pública y paneles. | `src/main.tsx`, `src/app/`, `src/layouts/`, `src/pages/` | `documentado` |
| `autenticacion-y-roles.md` | Aplicación y roles | Proveedor de sesión, rutas protegidas, perfiles y roles (`admin`, `artisan`, `buyer`). | `src/features/auth/`, `src/lib/supabase/client.ts`, `AGENTS.md` | `documentado` |
| `catalogo-y-productos.md` | Aplicación y roles | Fuentes de catálogo, visibilidad, stock, imágenes y modelo 3D. | `src/features/public/`, `src/features/artisan/`, `src/pages/CatalogPage.tsx` | `documentado` |
| `supabase-esquema-y-migraciones.md` | Backend y datos | Convenciones de migraciones, tablas, RLS, Storage, RPC y validación segura. | `supabase/migrations/`, `docs/DB_SAFETY.md`, `docs/BACKEND_MAP.md` | `documentado` |
| `funciones-edge.md` | Backend y datos | Funciones Edge, propósitos, llamada desde frontend, autorización y secrets requeridos. | `supabase/functions/` | `documentado` |
| `operacion-admin.md` | Backend y datos | Gestión de vendedores, categorías, productos, compradores y controles internos. | `src/features/admin/`, `src/pages/Admin*.tsx` | `documentado` |
| `entornos-y-seguridad.md` | Operación, integración y publicación | Contratos de `.env.example`, cliente Supabase, cuarentena local, auditorías. | `.env.example`, `docs/ENVIRONMENT.md`, `scripts/audit-safety.mjs` | `documentado` |
| `despliegue-y-verificacion.md` | Operación, integración y publicación | Build, configuración de Netlify, límites entre frontend y backend, pruebas post-deploy. | `netlify.toml`, `package.json`, `scripts/` | `documentado` |
| `checkout-y-pagos.md` | Operación, integración y publicación | Integración de checkout y flujos de pago. | `docs/CHECKOUT_MERCADOPAGO.md`, `src/features/buyer/`, `src/features/orders/` | `documentado` |
| `operacion-vendedor.md` | Experiencia Vendedor | Gestión de tienda, creación de productos e inventario. | `src/features/artisan/`, `src/pages/Artisan*Page.tsx` | `documentado` |
| `carrito-y-comprador.md` | Experiencia Comprador | Carrito de compras y estado de las órdenes del lado del cliente. | `src/features/buyer/`, `src/features/orders/` | `documentado` |
| `visor-3d-y-medios.md` | Medios y UI | Implementación lazy del renderizador Three.js y WebGL. | `docs/PRODUCT_3D_PREVIEW.md`, `src/features/public/` | `documentado` |
| `notificaciones-internas.md` | Backend y datos | Sistema para mandar alertas auditables a los usuarios. | `src/features/internalNotifications/` | `documentado` |
| `decisiones-de-dominio.md` | Operación e integración | Reglas críticas sobre la nomenclatura intocable de "artisan". | `docs/DOMAIN_DECISIONS.md`, `AGENTS.md` | `documentado` |
| `pruebas-automatizadas.md` | Calidad y verificación | Runner, ubicación, alcance y reglas para pruebas unitarias y de componentes. | `vitest.config.ts`, `src/**/*.test.ts(x)`, `package.json` | `documentado` |
| `modularidad.md` | Calidad y verificación | Límite bloqueante de tamaño y responsabilidades extraídas de módulos extensos. | `scripts/audit-large-files.mjs`, `package.json`, módulos `*Support` y conectores | `documentado` |
| `pwa-y-cache.md` | Operación, integración y publicación | Precache mínimo, caché runtime, límites y auditoría del service worker generado. | `vite.config.ts`, `scripts/audit-pwa-precache.mjs`, `src/lib/pwa/` | `documentado` |

## Mantenimiento

Este índice debe ser actualizado cada vez que se agregue una nueva ficha de contexto, se renombren fichas existentes o se modifique el estado de las mismas.

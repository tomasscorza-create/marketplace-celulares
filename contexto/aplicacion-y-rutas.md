# Aplicación y rutas

## Propósito

Ubicar el arranque de React, los proveedores globales y las fronteras entre la
aplicación pública y los paneles protegidos. La lista exacta de rutas vive sólo
en el router; esta ficha describe su estructura estable.

## Archivos fuente

- `src/main.tsx`: monta la aplicación, inicializa monitoreo y registra el
  service worker.
- `src/app/App.tsx`: compone Query, autenticación, analítica, router y aviso de
  actualización PWA.
- `src/app/router.tsx`: rutas, imports lazy, límites de comercio, errores y
  protección por rol.
- `src/layouts/`: estructura pública y paneles `artisan`, `buyer` y `admin`.
- `src/pages/`: pantallas de alto nivel.

## Flujo vigente

`main.tsx` monta `App`, los proveedores globales envuelven `RouterProvider` y
el router distribuye cuatro ramas principales: pública (`/`) y paneles de
vendedor, comprador y administración. `ProtectedRoute` resuelve configuración,
sesión, perfil y rol antes de renderizar una rama privada. Las rutas de compra
que dependen del comercio usan además el gate definido en el router.

Las páginas y layouts se importan con `lazy`; `Suspense` muestra `RouteLoader`
y cada rama principal declara `RouteErrorPage`. Los chunks lazy no forman parte
automáticamente del precache; la política pertenece a `pwa-y-cache.md`.

## Datos y dependencias externas

- React Router controla navegación y errores.
- `AuthProvider` aporta sesión y rol.
- `src/config/marketplace.ts` habilita o deshabilita superficies de comercio.

## Decisiones vigentes

- Agregar o retirar rutas en `src/app/router.tsx`; no mantener listas paralelas.
- Toda ruta privada debe declarar su rol permitido.
- Conservar imports lazy para páginas y layouts salvo una razón medida para
  incorporarlos al bundle inicial.
- Un layout estructura navegación; la lógica de dominio permanece en su
  feature o página.

## Validación

Clasificar primero el cambio con [AGENTS.md](../AGENTS.md). Para una ruta o
import modificado, usar ESLint sobre los archivos afectados y typecheck cuando
cambien JSX, tipos o imports. Ejecutar
`src/features/auth/ProtectedRoute.test.tsx` explícitamente si cambia la
protección. `npm run build` se reserva para cambios de lazy loading, assets,
configuración del bundle o una publicación frontend.

Probar manualmente la ruta afectada, navegación directa/recarga, un acceso sin
permiso cuando corresponda y el fallback 404 o de error relevante.

## Última revisión

2026-07-15. Actualizar cuando cambien proveedores globales, ramas principales,
gates de navegación o estrategia de carga.

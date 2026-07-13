# Aplicación y rutas

## Propósito

Define la arquitectura de arranque de React, la distribución de rutas y los layouts para separar la UI pública de los paneles privados (comprador, vendedor, administrador).

## Fuentes de verdad

- `src/main.tsx`: Punto de entrada de la aplicación, configuración de React DOM y registro del Service Worker.
- `src/app/router.tsx`: Define el enrutador con `react-router-dom`, asocia rutas con páginas de forma perezosa (`lazy`) y agrupa por layouts/roles.
- `src/layouts/`: Componentes que envuelven las páginas para proveer menús y estructura general según la sección (`PublicLayout`, `ArtisanLayout`, `BuyerLayout`, `AdminLayout`).
- `src/pages/`: Componentes de alto nivel que representan pantallas individuales.

## Flujo o arquitectura

El punto de entrada carga `App`, que monta el enrutador de `router.tsx`. Las rutas se agrupan en cuatro ramas principales:

1. `/`: Layout público. Incluye catálogo, perfiles, login y registro.
2. `/panel/vendedor`: Layout de artesano/vendedor. Protegido para rol `artisan`.
3. `/panel/comprador`: Layout de comprador. Protegido para rol `buyer`.
4. `/panel/admin`: Layout de administración. Protegido para rol `admin`.

## Reglas y decisiones vigentes

- **Carga perezosa (Lazy Loading)**: Todas las páginas y layouts se cargan mediante `lazy` para optimizar el tamaño del bundle.
- **Rutas protegidas**: Los paneles privados (vendedor, comprador, admin) y ciertas subrutas (ej. `/perfil/cliente`) están resguardados por el componente `<ProtectedRoute>` que exige un rol específico (`allowedRoles`).
- **Estado de carga**: Se usa `<Suspense>` con `<RouteLoader />` para mostrar retroalimentación mientras se descargan los fragmentos de las páginas.
- **Manejo de errores**: Cada ruta o grupo principal define un `errorElement: <RouteErrorPage />` para capturar fallos.

## Dependencias y límites externos

- **React Router DOM**: Se usa la API `createBrowserRouter`.
- **Autenticación**: `ProtectedRoute` depende de `useAuth()` para verificar sesión y perfiles.

## Validación

- Comandos: `npm run build` asegura que todas las dependencias de rutas resuelvan correctamente.
- Manual: Probar la navegación pública e intentar acceder a un `/panel/*` sin sesión, que debe redirigir a `/login`.

## Riesgos y errores frecuentes

- Olvidar envolver una ruta privada con `<ProtectedRoute>`, exponiendo vistas sensibles.
- Cargar páginas pesadas de manera síncrona en `router.tsx` aumentando el tamaño del bundle inicial.

## Mantenimiento

Actualizar esta ficha cuando se agreguen nuevos roles, se cambie la estrategia de enrutamiento (ej. si se pasara a un framework de archivos) o se modifiquen significativamente los layouts.

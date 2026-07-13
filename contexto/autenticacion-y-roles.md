# Autenticación y roles

## Propósito

Gestionar la sesión de usuarios, proveer los datos del perfil actual a toda la aplicación y resguardar el acceso a las rutas protegidas.

## Fuentes de verdad

- `src/lib/supabase/client.ts`: Configura y expone la única instancia del cliente de Supabase. Posee defensas de entorno para evitar conexiones indebidas a producción.
- `src/features/auth/AuthProvider.tsx`: Contexto de React que escucha los cambios de sesión y obtiene el perfil de la base de datos.
- `src/features/auth/ProtectedRoute.tsx`: Componente envolvente que bloquea o redirige a usuarios sin sesión o sin los roles adecuados.
- `AGENTS.md`: Reglas sobre no alterar configuraciones de remotos ni filtrar secretos.

## Flujo o arquitectura

El estado de la sesión fluye así:

1. `AuthProvider` escucha `supabase.auth.onAuthStateChange`.
2. Si hay usuario, dispara la carga del perfil (`getCurrentUserProfile`) para traer datos y rol del usuario desde la tabla `profiles`.
3. Expone a través del hook `useAuth()`: `user` (datos de Auth), `profile` (datos de tabla pública) y `role` (`admin`, `artisan`, `buyer`).
4. `ProtectedRoute` lee `useAuth()` y evalúa si coincide el rol del usuario con la lista de `allowedRoles`.

## Reglas y decisiones vigentes

- **Único Cliente Supabase**: Siempre importar de `src/lib/supabase/client.ts`. Si las variables de entorno están incompletas o erróneas, el cliente se inhabilita para prevenir errores silenciosos y derrames de credenciales.
- **Renovación silenciosa**: Cuando el token se refresca (`TOKEN_REFRESHED`), el contexto actualiza los datos en segundo plano sin mostrar una pantalla de carga para no interrumpir la interfaz.
- **Manejo de rutas prohibidas**: Si el usuario no está logueado, `ProtectedRoute` hace una redirección a `/login`. Si no tiene permisos o falta el perfil, muestra un error usando `<AccessMessage>`.
- **Roles estrictos**: Solo perfiles con roles específicos pueden acceder a sus respectivos paneles. No hay mezcla de dominios.

## Dependencias y límites externos

- **Supabase Auth**: La aplicación confía totalmente en las sesiones JWT gestionadas por Supabase.
- **Tabla de perfiles**: La tabla pública `profiles` es donde reside verdaderamente el "rol" del usuario y los detalles de perfil.

## Validación

- Comandos: `npm run build`.
- Manual: Iniciar sesión con cuentas de diferentes roles y verificar que no puedan entrar en los paneles ajenos o ver rutas sin permiso.

## Riesgos y errores frecuentes

- Conectar componentes directamente a `supabase.auth.getSession()` en lugar de consumir `useAuth()`, causando desincronización de estado en React.
- No tener sincronizada la tabla `profiles` con el usuario de Auth, resultando en que la UI no sepa qué rol tiene el usuario logueado.

## Mantenimiento

Actualizar si cambian los tipos de rol, si se agregan nuevos proveedores de sesión (ej. Google/OAuth) o se modifican las protecciones del enrutador.

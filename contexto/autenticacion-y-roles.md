# Autenticación y roles

## Propósito

Describir cómo la aplicación obtiene una sesión, carga el perfil vigente y
decide el acceso a rutas protegidas.

## Archivos fuente

- `src/lib/supabase/client.ts`: única instancia compartida y guardia de entorno.
- `src/features/auth/AuthProvider.tsx`: sesión, perfil, errores y renovación.
- `src/features/auth/authClient.ts`: lectura del perfil actual.
- `src/features/auth/ProtectedRoute.tsx`: decisiones de configuración, sesión,
  perfil y rol.
- `src/types/auth.ts`: contrato de perfiles y roles.
- `src/features/auth/ProtectedRoute.test.tsx`: cobertura del gate de rutas.

## Flujo vigente

`AuthProvider` recupera la sesión inicial y escucha
`supabase.auth.onAuthStateChange`. Cuando existe usuario, carga su fila de
`profiles` y expone `user`, `profile`, `role`, estados de carga y
`refreshProfile` mediante `useAuth()`.

`TOKEN_REFRESHED` actualiza en segundo plano sin reemplazar la interfaz por una
pantalla de carga. `ProtectedRoute` distingue backend sin configurar, sesión en
validación, usuario ausente, perfil ausente y rol no permitido. Sólo la ausencia
de usuario redirige a `/login`; las demás negativas muestran un estado explícito.

## Datos y dependencias externas

- Supabase Auth administra la sesión y sus tokens.
- `public.profiles` aporta el rol de aplicación: `admin`, `artisan` o `buyer`.
- La autorización real de datos también depende de RLS; ocultar una ruta no
  sustituye políticas backend.

## Decisiones vigentes

- Consumir `useAuth()` en React; no crear clientes ni estados de sesión
  paralelos en componentes.
- Importar Supabase desde `src/lib/supabase/client.ts`.
- Mantener separados usuario Auth, perfil público y rol; uno no demuestra los
  otros.
- Cambios de acceso, sesión o roles son críticos. Copy o presentación aislada
  dentro de esta feature no escala por el nombre del dominio.

## Validación

Para decisiones de `ProtectedRoute`:

```powershell
npm test -- src/features/auth/ProtectedRoute.test.tsx
```

Sumar ESLint dirigido y typecheck si cambian lógica, tipos o imports. Cuando
cambie el contrato de acceso/sesión/roles, cerrar el estado integrado con
`npm run preflight` una sola vez; usar `build` sólo si también corresponde por
bundle o publicación, según [AGENTS.md](../AGENTS.md).

El QA manual debe cubrir backend no configurado, visitante, perfil ausente y
cada rol afectado. No usar producción para fabricar estados de prueba.

## Última revisión

2026-07-15. Actualizar al cambiar roles, proveedor de sesión, carga de perfiles
o decisiones de acceso.

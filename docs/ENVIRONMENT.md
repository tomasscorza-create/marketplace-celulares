# Entornos

La conexión Supabase es opt-in y está protegida por
`src/lib/supabase/client.ts`. La plantilla `.env.example` debe permanecer sin
credenciales reales.

## Variables públicas del frontend

```text
VITE_ENABLE_LOCAL_BACKEND
VITE_ENABLE_REMOTE_BACKEND
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_SUPABASE_PROJECT_REF
VITE_PUBLIC_SITE_URL
VITE_SENTRY_DSN
```

Las variables `VITE_*` terminan en el navegador. Sólo la anon/publishable key de
Supabase puede usarse allí; nunca `service_role`, contraseñas o tokens de pago.

## Supabase local

```text
VITE_ENABLE_LOCAL_BACKEND=true
VITE_ENABLE_REMOTE_BACKEND=false
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<clave local>
VITE_SUPABASE_PROJECT_REF=
```

El cliente sólo acepta `localhost` o `127.0.0.1:54321` como backend local.

## Backend remoto vigente

En producción, Netlify debe definir `VITE_ENABLE_REMOTE_BACKEND=true`, URL,
anon key y project ref del proyecto confirmado en
`docs/IDENTIDAD_PROYECTO.md`. El ref declarado debe coincidir exactamente con
el subdominio de la URL o el cliente queda deshabilitado.

No copiar valores desde proyectos anteriores. Antes de cambiar variables de
Netlify o un `.env.local`, comprobar la identidad y ejecutar las auditorías de
conexiones y secretos.

## URL pública y Sentry

- `VITE_PUBLIC_SITE_URL` debe coincidir con el dominio permitido en Supabase Auth.
- `VITE_SENTRY_DSN` es opcional y público por diseño.
- No adjuntar correos, teléfonos, pedidos, payloads o datos personales a Sentry.

## Validación

```powershell
npm run audit:connections
npm run audit:secrets
npm run preflight
```

Actualizar esta ficha cuando cambie la guardia del cliente, el proveedor de
deploy o el contrato de variables. Última revisión: 2026-07-13.

# Entornos y Seguridad

## Propósito

Definir los contratos de variables de entorno para desarrollo y producción, y asegurar que el frontend no se conecte accidentalmente a bases de datos equivocadas o exponga secretos.

## Fuentes de verdad

- `.env.example`: Plantilla base de las variables públicas esperadas por Vite.
- `docs/ENVIRONMENT.md`: Documentación de cómo configurar las conexiones locales y remotas.
- `scripts/audit-safety.mjs`: Script de auditoría que previene *commits* con secretos o referencias al proyecto original.
- `src/lib/supabase/client.ts`: Contiene la lógica del "Client Guard" que requiere validación estricta de entorno.

## Flujo o arquitectura

La aplicación usa `import.meta.env` (Vite) para inyectar variables en tiempo de compilación para el frontend.
El cliente Supabase de frontend (`src/lib/supabase/client.ts`) implementa una protección (Client Guard) que exige:

1. Opt-in explícito (`VITE_ENABLE_REMOTE_BACKEND=true` o `VITE_ENABLE_LOCAL_BACKEND=true`).
2. Presencia de `URL` y `ANON_KEY`.
3. Para remoto, exige que la variable `VITE_SUPABASE_PROJECT_REF` coincida exactamente con el subdominio extraído de la `URL`. Si esto falla, aborta la inicialización de Supabase para prevenir derrames de datos.

## Reglas y decisiones vigentes

- **Desconexión por defecto**: Por defecto, todas las conexiones remotas están apagadas.
- **Auditoría obligatoria**: El script `audit-safety.mjs` verifica que no se suban archivos como `.supabase-secrets.env` o valores de claves como `SUPABASE_SERVICE_ROLE_KEY`.
- **Cero secretos en frontend**: Las llaves privadas (`service_role`) o tokens de terceros jamás van en `.env.local`; pertenecen puramente al entorno aislado de las Edge Functions.

## Dependencias y límites externos

- **Vite**: Maneja el prefijo `VITE_` para exponer explícitamente variables seguras al navegador.
- **Node.js**: Para ejecutar los scripts de auditoría en local o integraciones CI.

## Validación

- Comandos: `npm run audit:safety` (corre verificaciones de secretos, conexiones y branding), y `npm run safety:quarantine`.
- Manual: Intentar usar la app sin variables de entorno o con un Project Ref que no coincida; el cliente de Supabase debe lanzar un error descriptivo y la app mostrar la pantalla de configuración pendiente (gracias a `ProtectedRoute`).

## Riesgos y errores frecuentes

- Crear el archivo `.env.local` y poner claves de servidor allí (como `SUPABASE_SERVICE_ROLE_KEY`). Vite no lo expondrá sin el prefijo `VITE_`, pero si se le pone el prefijo por error humano, se filtrará al público.
- Compartir o hacer commit de las carpetas `.local-quarantine/` o `.netlify/` que contienen cachés y links locales a proyectos de Supabase/Netlify.

## Mantenimiento

Actualizar siempre que se agreguen nuevas integraciones críticas en el cliente (como Sentry o Google Analytics) que requieran configuraciones públicas en entorno, o cuando se ajusten las políticas del Client Guard.

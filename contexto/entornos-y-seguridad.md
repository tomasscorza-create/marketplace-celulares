# Entornos y seguridad

## Propósito

Documentar el contrato público de configuración del frontend y las defensas
que evitan conectar este checkout a un backend incorrecto.

## Archivos fuente

- `.env.example`: nombres y valores seguros de ejemplo.
- `docs/ENVIRONMENT.md`: contrato detallado de variables.
- `docs/IDENTIDAD_PROYECTO.md`: identidad vigente y recursos prohibidos.
- `src/lib/supabase/client.ts`: guardia ejecutable del cliente.
- `scripts/audit-safety.mjs`: auditorías de secretos, conexiones y branding.
- `scripts/quarantine-local-secrets.mjs`: operación local de cuarentena.

## Flujo vigente

Toda variable `VITE_*` termina en el navegador. El cliente sólo se crea cuando
existen URL y clave pública y, además:

- local: hay opt-in local y la URL es `localhost` o `127.0.0.1:54321`;
- remoto: hay opt-in remoto y el project ref declarado coincide con el
  subdominio Supabase de la URL.

Sin esas condiciones, `supabase` queda deshabilitado y las superficies
protegidas muestran configuración pendiente.

## Datos y dependencias externas

Netlify aporta variables públicas al build de producción. Los secrets de Edge
Functions, pagos u otros servidores no pertenecen a `.env.local` ni usan el
prefijo `VITE_`.

## Decisiones vigentes

- El backend queda desconectado por defecto.
- No copiar configuración de proyectos anteriores.
- La guardia del navegador no protege comandos de Git, Netlify o Supabase CLI.
- Las auditorías no reemplazan revisar el diff y no certifican el contenido
  ignorado de `.env.local`.
- `safety:quarantine` mueve archivos locales: no es una validación rutinaria y
  sólo se usa de forma intencional, preservando trabajo ajeno.

## Validación

Ejecutar sólo la auditoría activada por el cambio:

| Cambio | Control |
| --- | --- |
| Configuración compartible o sospecha de credenciales | `npm run audit:secrets` |
| URL, project ref u opt-in de backend | `npm run audit:connections` |
| Identidad o nombres heredados | `npm run audit:branding` |
| Investigación conjunta de las tres categorías | `npm run audit:safety` |

Si cambia la lógica del client guard, sumar controles dirigidos y el checkpoint
crítico definido por [AGENTS.md](../AGENTS.md). Una edición documental o de
plantilla no requiere por sí sola la suite completa ni build.

## Última revisión

2026-07-15. Actualizar cuando cambien variables públicas, guardias, auditorías o
proveedores de configuración.

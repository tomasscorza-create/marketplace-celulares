# SQL histórico — no canónico

Los archivos de esta carpeta son copias y plantillas conservadas para referencia
histórica. No forman una instalación vigente y no reflejan necesariamente los
`drop` o reemplazos de migraciones posteriores.

Reglas:

- La única fuente de verdad es `supabase/migrations/`, aplicada en orden.
- No ejecutar esta carpeta completa contra local, staging o producción.
- No usarla para decidir si una tabla o RPC sigue existiendo.
- `npm run audit:backend` ignora deliberadamente esta carpeta.
- Para revisar el esquema esperado usar `docs/BACKEND_MAP.md` y para aplicarlo
  desde cero usar Supabase local con `supabase/migrations/`.

Estas copias sólo pueden eliminarse o consolidarse mediante una tarea explícita
que preserve el historial necesario. Última revisión: 2026-07-13.

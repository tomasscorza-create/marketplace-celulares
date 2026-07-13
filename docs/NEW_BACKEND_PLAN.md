# Plan histórico de backend nuevo

> **ARCHIVADO. No es un procedimiento operativo vigente.** Este plan pertenece
> a la etapa en la que el checkout todavía estaba neutralizado y se evaluaba
> crear un backend nuevo. El proyecto independiente y su Supabase de producción
> ya fueron identificados posteriormente.

Para trabajo actual usar, en este orden:

1. `docs/IDENTIDAD_PROYECTO.md`: repo, rama, backend y recursos prohibidos.
2. `AGENTS.md`: contratos operativos y flujo de cambios.
3. `docs/DB_SAFETY.md`: protocolo local/remoto.
4. `supabase/migrations/`: única fuente de verdad del esquema.
5. `docs/BACKEND_MAP.md`: mapa generado de la superficie final.

Las copias de `supabase/sql/` y las migraciones iniciales pueden contener
modelos luego retirados, incluido `product_batches`. No deben copiarse a un
backend nuevo ni usarse para reconstruir el estado vigente. Si en el futuro se
decide consolidar un esquema base, debe hacerse como una tarea nueva, con
identidad confirmada, tests de RLS/checkout y validación local completa.

Última revisión: 2026-07-13.

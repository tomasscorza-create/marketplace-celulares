# Backend local

Supabase local es el entorno permitido para aplicar desde cero y probar el
historial completo sin tocar producción.

## Comandos

```powershell
npm run db:start
npm run db:status
npm run db:reset
npm run db:lint
npm run db:stop
```

URLs predeterminadas de Supabase CLI:

- API: `http://127.0.0.1:54321`
- Studio: `http://127.0.0.1:54323`
- PostgreSQL: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

## Estado esperado desde las migraciones

El esquema local debe aplicar todos los archivos ordenados de
`supabase/migrations/`. `npm run audit:backend` informa cuál es la última
migración inspeccionada y verifica la superficie estática final.

Después de `20260713120000_remove_product_batches.sql`:

- `product_batches` no existe.
- `products` no contiene columnas `batch_*` ni `created_via_batch`.
- Las RPC de creación, actualización y borrado de lotes no existen.
- Los RPC de catálogo v5/v6 permanecen porque la migración los recrea con su
  contrato sin columnas de lotes.

## Certificación local

La documentación no debe afirmar que Docker está validado sólo por una ejecución
antigua. Para certificar el estado actual hay que ejecutar `db:start`, `db:reset`
y `db:lint` en la máquina actual, y registrar el resultado de esa tarea.

## Seguridad

- Confirmar que la URL local usa `127.0.0.1` o `localhost` antes de resetear.
- No usar keys locales en deploys.
- No ejecutar scripts de `supabase/sql/` como sustituto de las migraciones.
- Seguir `docs/DB_SAFETY.md` antes de cualquier verificación vinculada.

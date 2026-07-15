# Supabase: esquema y migraciones

## Propósito

Ubicar la fuente canónica del esquema y seleccionar controles capaces de
observar SQL, RLS, Storage y RPC sin ejecutar automáticamente pruebas frontend.

## Archivos fuente

- `supabase/migrations/`: historial canónico aplicado por nombre.
- `docs/DB_SAFETY.md`: protocolo local/remoto y autoridad requerida.
- `docs/IDENTIDAD_PROYECTO.md`: proyecto permitido.
- `docs/BACKEND_MAP.md`: mapa generado de símbolos, no del backend remoto.
- `scripts/audit-backend-symbols.mjs` y
  `scripts/lib/backend-schema-audit.mjs`: auditoría estática y generación del
  mapa.

## Flujo vigente

1. Inspeccionar migraciones y consumidores afectados.
2. Crear una migración nueva; nunca reescribir una ya aplicada.
3. Ejecutar el test de contrato explícito si lee ese SQL y
   `npm run audit:backend`.
4. Validar SQL/RLS/Storage en una pila local cuando esté disponible.
5. Sólo con alcance remoto autorizado: confirmar identidad y lista, ejecutar
   `supabase db push --dry-run`, aplicar y verificar de nuevo.

## Datos y dependencias externas

- `supabase/sql/` es referencia histórica y no define el esquema final.
- `docs/BACKEND_MAP.md` rastrea tablas, vistas y RPC en migraciones/consumidores;
  no valida columnas, constraints, RLS, Storage ni estado remoto.
- La guardia de `src/lib/supabase/client.ts` protege el navegador, no Supabase
  CLI. La seguridad CLI depende de identidad, flags, diff y autorización.

## Decisiones vigentes

- Migraciones aditivas y ordenadas; los drops intencionales también se expresan
  en una migración nueva.
- RLS y políticas de Storage forman parte del cambio, no una tarea posterior.
- Backend local, migraciones versionadas y backend remoto son estados distintos.
- No usar un deploy remoto como sustituto de una prueba local ausente.

## Validación

Ruta backend mínima, ajustada al cambio:

```powershell
npm test -- src/ruta/contrato-migracion.test.ts
npm run audit:backend
```

Invocar explícitamente tests que usan `readFileSync`; `vitest related` no los
descubre por el nombre del SQL. Si el mapa cambia, regenerarlo con
`npm run docs:backend-map` y revisar su diff. Ejecutar `npm run db:lint` sólo
cuando la migración esté aplicada en una pila local confirmada. Un reset local
es destructivo y se reserva para reconstruir una pila descartable; si hace
falta, invocarlo como `supabase db reset --local`, nunca con `--linked` ni
`--db-url`.

No ejecutar tests frontend, `preflight` ni `build` automáticamente por un SQL
aislado. Escalar sólo ante contrato compartido, tooling, múltiples superficies,
impacto incierto o certificación integral, según [AGENTS.md](../AGENTS.md).

## Última revisión

2026-07-15. Actualizar al cambiar convención de migraciones, auditoría, mapa o
protocolo de aplicación.

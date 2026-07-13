# Seguridad de base de datos

## Identidad obligatoria

La fuente vigente es `docs/IDENTIDAD_PROYECTO.md`. Antes de cualquier comando
remoto comprobar `git remote -v`, rama, project ref y estado de Git. El backend
de producción correcto es el proyecto independiente de este marketplace;
cualquier ref diferente debe tratarse como ajeno y bloquear la operación.

Nunca copiar ni mostrar claves, contraseñas, `service_role`, tokens de pago o el
contenido de `.env.local`, `*.secrets.env`, `supabase/.temp/` y `.netlify/`.

## Fuente de verdad del esquema

- `supabase/migrations/` es el historial canónico y se aplica en orden por nombre.
- Toda modificación crea una migración nueva; no se reescriben migraciones aplicadas.
- `supabase/sql/` es una referencia histórica y no representa el estado final.
- `docs/BACKEND_MAP.md` se genera desde código y migraciones mediante
  `npm run docs:backend-map` y se verifica con `npm run audit:backend`.

## Protocolo para cambios

1. Leer `AGENTS.md` y `docs/IDENTIDAD_PROYECTO.md`.
2. Revisar `git status --short`, `git remote -v` y `supabase migration list`.
3. Inspeccionar el diff SQL y confirmar que el objetivo sea el proyecto vigente.
4. Crear una migración aditiva nueva.
5. Validar primero en Supabase local cuando Docker esté disponible.
6. Ejecutar `npm run docs:backend-map`, `npm run audit:backend` y `npm run preflight`.
7. Ejecutar `supabase db push --dry-run` antes de cualquier aplicación remota.
8. Aplicar sólo dentro del alcance autorizado.
9. Verificar después con `supabase migration list` y `supabase db lint --linked`.

## Operaciones que requieren alcance explícito

- `supabase db push` o `migration repair` contra remoto.
- Despliegue de Edge Functions.
- Cambios de secrets, Auth URLs o proveedores de pago.
- Borrados, resets, restauraciones o cambios de cuenta/proyecto.

`supabase db reset` sólo está permitido para la pila local identificada. Nunca
usar comandos destructivos mientras exista duda sobre el proyecto objetivo.

## Verificación local mínima

```powershell
npm run audit:backend
npm run preflight
npm run build
```

Para una modificación SQL sumar:

```powershell
npm run db:start
npm run db:reset
npm run db:lint
npm run db:stop
```

Estos comandos locales no certifican por sí solos que producción tenga las
migraciones aplicadas; eso se comprueba separadamente con el proyecto vinculado
y confirmado.

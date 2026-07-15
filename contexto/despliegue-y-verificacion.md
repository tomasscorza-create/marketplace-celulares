# Despliegue y verificación

## Propósito

Separar la certificación local del frontend de la publicación en Git/Netlify y
de las operaciones independientes de Supabase.

## Archivos fuente

- `package.json`: composición real de `preflight`, `build` y auditorías.
- `netlify.toml`: comando, versión de Node y directorio publicado.
- `vite.config.ts`: bundle y generación PWA.
- `scripts/audit-pwa-precache.mjs`: control del service worker generado.
- `docs/IDENTIDAD_PROYECTO.md`: repo, rama de producción y proveedor vigentes.
- `docs/DB_SAFETY.md`: protocolo especializado para cambios de backend.

## Estados que no deben confundirse

| Estado | Evidencia |
| --- | --- |
| Código local | diff y verificaciones ejecutadas sobre el worktree actual |
| Git remoto | rama/remoto y commits efectivamente publicados |
| Netlify | deploy asociado al commit correcto y smoke test del sitio |
| Supabase | migraciones, funciones y secrets verificados por separado |

Un resultado verde en una fila no demuestra las demás.

## Flujo vigente

Netlify ejecuta `npm run build` con Node 20 y publica `dist/`. El build ya
incluye typecheck, Vite y `audit:pwa`. Un push a la rama de producción dispara
el deploy configurado; no aplica migraciones ni despliega Edge Functions.

Las variables `VITE_*` usadas por el frontend son públicas en el bundle. Se
configuran en el proveedor sólo cuando están destinadas al navegador; secretos
de servidor pertenecen al entorno backend correspondiente.

## Decisiones vigentes

- La matriz de [AGENTS.md](../AGENTS.md) decide la validación durante desarrollo.
- Para una release frontend o cambio transversal, ejecutar `npm run preflight`
  una vez y `npm run build` una vez sobre el estado final. No anteponer lint,
  typecheck, suite completa ni `audit:pwa`, porque esos gates ya los contienen.
- Un cambio documental no activa tests ni build.
- Toda publicación o mutación remota exige identidad y alcance autorizados.
- Los cambios frontend y backend deben ser compatibles en el orden elegido; su
  despliegue y verificación siguen siendo operaciones separadas.

## Validación

Después de un deploy frontend, comprobar el commit publicado, carga inicial,
navegación directa de la ruta afectada, consola/red y actualización PWA cuando
aplique. Para backend, seguir `docs/DB_SAFETY.md` y la ruta específica de
`AGENTS.md`; no sustituirla con tests frontend.

## Última revisión

2026-07-15. Actualizar al cambiar scripts compuestos, proveedor, rama de
producción, pipeline o relación entre frontend y backend.

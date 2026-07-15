# Modularidad y tamaño de archivos

## Propósito

Evitar módulos difíciles de revisar y modificar sin usar el tamaño como
sustituto del diseño por responsabilidades.

## Archivos fuente

- `scripts/audit-large-files.mjs`: alcance, extensiones y umbral.
- `package.json`: comando `audit:large-files` e inclusión en `preflight`.

## Datos y dependencias externas

La auditoría recorre `src/`, `supabase/` y `scripts/`; cuenta líneas de archivos
TypeScript, JavaScript, CSS y SQL. Es local, determinista y no necesita red,
credenciales, Docker ni Supabase.

## Decisiones vigentes

- Todo archivo auditado debe permanecer por debajo de 1000 líneas; alcanzar el
  umbral bloquea `audit:large-files` y `preflight`.
- Extraer antes del límite cuando se mezclen consultas, normalización, reglas,
  estado y composición visual.
- Preservar exports públicos cuando una extracción sea interna.
- Las páginas orquestan; componentes y módulos de dominio encapsulan
  presentación y reglas. Las Edge Functions separan validación/configuración
  del flujo transaccional.

## Validación

Ejecutar el gate cuando se cree o amplíe código, scripts, CSS o SQL cerca del
límite:

```powershell
npm run audit:large-files
```

Para inspeccionar deuda sin bloquear:

```powershell
node scripts/audit-large-files.mjs 400
```

Este control no exige por sí solo `preflight` ni `build`. Si la extracción
cambia código ejecutable, aplicar además el nivel correspondiente de
[AGENTS.md](../AGENTS.md).

## Última revisión

2026-07-15. Actualizar al cambiar alcance, extensiones, umbral o estrategia de
modularización.

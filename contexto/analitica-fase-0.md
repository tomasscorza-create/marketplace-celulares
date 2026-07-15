# Fase 0 — línea base y aislamiento de analítica

## Propósito

Dejar una base verificable antes de endurecer la analítica: separar el alcance
de otros agentes, preservar cambios ajenos, retirar metadatos locales de enlace
Supabase, registrar el estado productivo agregado y eliminar únicamente los
eventos técnicos creados por las pruebas de despliegue y latencia.

## Identidad y alcance confirmado

- Repositorio: `marketplace-celulares`.
- Supabase de producción: `accesorios y celulares`, project ref
  `snlotkvstplwnoiacqyz`.
- Commit productivo tomado como base: `3aa4671`.
- Rama reservada para las mejoras: `codex/analytics-hardening`, creada desde
  `origin/main` en `3aa4671`.
- La rama quedó reservada sin activarse para no mover el worktree mientras
  Claude trabaja en atributos de producto.

## Coordinación y archivos preservados

Claude declaró en `contexto/coordinacion-de-agentes.md` que trabaja en:

- `src/types/productAttributes.ts`.
- `supabase/migrations/20260715090000_catalog_search_product_attributes.sql`.

Codex no editó, aplicó ni incluyó esos archivos. También preservó el cambio
preexistente de `src/layouts/PublicLayout.tsx`. No se ejecutó `db push` durante
esta fase porque existe una migración ajena pendiente.

## Línea base productiva

Lectura agregada tomada el 2026-07-14 después de retirar los eventos técnicos:

| Métrica | Valor |
| --- | ---: |
| Compradores registrados | 0 |
| Vendedores registrados | 4 |
| Consentimientos activos de analítica | 0 |
| Sesiones consentidas | 0 |
| Eventos consentidos | 0 |
| Visitas anónimas | 5 |
| Páginas vistas anónimas | 58 |
| Visitas con ciudad desconocida | 5 |

La ausencia de ciudad coincide con la falta actual de `IPINFO_TOKEN`. Los
valores son agregados; durante esta comprobación no se descargaron correos,
nombres, direcciones ni historiales individuales.

## Limpieza técnica ejecutada

Se eliminaron exactamente dos filas agregadas, con seis eventos técnicos en
total, correspondientes a estas rutas:

- `/__analytics_deploy_check__`.
- `/__analytics_latency_audit__`.

La verificación posterior devolvió cero filas para ambas rutas. No se eliminaron
visitas reales, sesiones, consentimientos, perfiles ni eventos comerciales.

## Higiene local y validación

- No están presentes `supabase/.temp/project-ref`, `linked-project.json` ni
  `pooler-url`. La carpeta contiene sólo `cli-latest`, metadato no sensible que
  la CLI puede regenerar.
- `npm run audit:secrets` pasó.
- La identidad de Git, Supabase y `origin` coincide con
  `docs/IDENTIDAD_PROYECTO.md`.
- `codex/analytics-hardening` apunta al mismo commit que `origin/main` al cierre
  de esta comprobación.

## Estado de cierre

La línea base, la limpieza y la reserva de rama están completas. El cambio a
`codex/analytics-hardening` y el `preflight` completo deben ejecutarse cuando
Claude marque su trabajo como finalizado y libere el worktree; hacerlo antes
arriesgaría mezclar o desplazar sus cambios no confirmados.

Última revisión: 2026-07-14.

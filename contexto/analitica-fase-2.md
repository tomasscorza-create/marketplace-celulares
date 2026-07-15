# Fase 2 — actualización del panel

## Propósito

Mantener el informe administrativo actualizado sin obligar al administrador a
recargar la página y sin generar consultas periódicas cuando la pestaña está
oculta.

## Archivos fuente

- `src/features/analytics/analyticsRefresh.ts`: intervalo y política de
  visibilidad.
- `src/features/analytics/analyticsQueries.ts`: configuración compartida de
  React Query.
- `src/pages/AdminAnalyticsPage.tsx`: actualización manual, estado y hora del
  último resultado.
- `src/features/analytics/analyticsRefresh.test.ts`: contrato automatizado del
  intervalo.

## Datos y dependencias

La fase reutiliza los RPC administrativos existentes. No agrega tablas,
migraciones, proveedores externos, eventos ni datos personales.

## Decisiones vigentes

- El resumen y el historial seleccionado se consultan cada 30 segundos sólo
  mientras `document.visibilityState` sea `visible`.
- `refetchIntervalInBackground` permanece deshabilitado.
- Recuperar el foco fuerza una consulta, incluso si la caché era reciente.
- El botón `Actualizar ahora` consulta el resumen y, si corresponde, el
  historial seleccionado.
- Durante un cambio de período o una recarga se conserva el último resultado
  visible. Un error de actualización se informa sin vaciar el informe anterior.
- El panel muestra la hora del último resultado confirmado y distingue cuando
  está presentando datos anteriores como placeholder.

## Validación

- Pruebas unitarias para intervalo visible y suspensión oculta: aprobadas.
- Suite completa: 14 archivos y 61 tests aprobados.
- `npm run preflight`: aprobado completo.
- `npm run build` y auditoría PWA: aprobados.
- No requiere ni ejecutó `db push`, despliegue de función Edge o cambios de
  secrets.

Última revisión: 2026-07-14.

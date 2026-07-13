# PWA y política de caché

## Propósito

Mantener una instalación PWA liviana sin perder el shell de inicio ni volver a
descargar los recursos ya visitados en cada navegación.

## Archivos fuente

- `vite.config.ts`: configuración de `vite-plugin-pwa` y Workbox.
- `src/lib/pwa/registerServiceWorker.ts`: registro y actualización del service worker.
- `scripts/audit-pwa-precache.mjs`: control del manifiesto generado.
- `package.json`: ejecuta `audit:pwa` automáticamente al final de `build`.

## Datos y dependencias externas

Workbox genera `dist/sw.js` durante el build. La auditoría lee ese archivo y los
assets locales de `dist/`; no usa red, credenciales ni Supabase.

## Decisiones vigentes

- El precache contiene HTML, CSS, iconos, manifiesto, entrada principal,
  dependencias base y los módulos mínimos de la portada pública.
- No se precachean rutas lazy de catálogo, producto o paneles, `three-vendor`,
  fuentes ni `argentinaGeo`. Esos recursos se descargan bajo demanda.
- Los assets visitados usan `CacheFirst` en `nyzca-runtime-assets-v1`, con un
  máximo de 80 entradas y vencimiento de 30 días.
- La caché runtime se limita a recursos estáticos de `/assets/`, scripts y
  estilos. No intercepta respuestas de Supabase, autenticación, Storage ni
  proveedores externos.
- El control bloquea más de 20 archivos JavaScript o más de 900 kB de
  JavaScript sin comprimir dentro del precache.
- El fallback de navegación sigue siendo `/index.html` y los caches viejos se
  eliminan mediante `cleanupOutdatedCaches`.

## Validación

```powershell
npm run build
npm run audit:pwa
```

`audit:pwa` inspecciona el `dist/sw.js` existente. Para certificar el estado
actual debe ejecutarse mediante `npm run build`; invocarlo solo sirve para
revisar el último build local y falla cuando `dist/sw.js` no existe.

El build de referencia del 2026-07-13 redujo el precache de 94 archivos y
2134 KiB a 29 archivos y aproximadamente 840 KiB. La porción JavaScript quedó
en 15 archivos y 681 kB sin comprimir.

## Última revisión

2026-07-13. Se reemplazó el precache indiscriminado por shell mínimo más caché
de runtime acotada.

## Riesgos y mantenimiento

- Agregar una página lazy a `globPatterns` vuelve a descargar código que la
  mayoría de los usuarios no utilizará.
- El límite de 900 kB se mide sin compresión para que el resultado no dependa
  del algoritmo de transporte; la salida de Vite puede mostrar además gzip.
- Si cambian los nombres de chunks del shell o la portada, actualizar juntos
  `vite.config.ts`, esta ficha y la auditoría. Nunca ampliar patrones a todo
  `assets/*.js` para corregir un fallo offline puntual.
- Al modificar la estrategia, verificar instalación limpia, segunda visita y
  actualización del service worker desde un build servido localmente.

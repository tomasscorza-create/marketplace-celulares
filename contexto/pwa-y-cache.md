# PWA y política de caché

## Propósito

Mantener un shell instalable acotado y documentar exactamente qué observa la
auditoría del service worker generado.

## Archivos fuente

- `vite.config.ts`: manifest, `globPatterns`, runtime cache y chunks.
- `src/lib/pwa/registerServiceWorker.ts`: registro y actualización.
- `scripts/audit-pwa-precache.mjs`: límites comprobados sobre `dist/sw.js`.
- `package.json`: `build` ejecuta `audit:pwa` al final.

## Datos y dependencias externas

Workbox genera `dist/sw.js`. La auditoría lee el service worker y sus assets
locales; no usa red, credenciales ni Supabase.

## Decisiones vigentes

- El precache incluye HTML/CSS, iconos, manifest, entrada y chunks nombrados del
  shell/portada. Rutas de panel, producto, catálogo pesado, `three-vendor`,
  fuentes y `argentinaGeo` quedan fuera de sus patrones actuales.
- La caché `nyzca-runtime-assets-v1` usa `CacheFirst`, máximo 80 entradas y 30
  días.
- El matcher runtime acepta cualquier request cuyo destino sea `script` o
  `style`, además de rutas `/assets/`. Como no limita por origen, también puede
  cachear scripts o estilos externos solicitados por la aplicación; no afirmar
  que todos los proveedores externos quedan excluidos.
- El audit bloquea más de 20 archivos JavaScript o más de 900 kB sin comprimir,
  detecta ciertos chunks lazy/3D por nombre y rechaza fuentes o
  `argentinaGeo`. No reemplaza un QA offline real.
- El fallback de navegación es `/index.html` y Workbox limpia caches obsoletos.

## Validación

Para cambios de configuración PWA, chunks, assets o bundle:

```powershell
npm run build
```

No ejecutar `audit:pwa` después: ya forma parte de `build`. Invocarlo solo sirve
para diagnosticar el `dist/sw.js` existente y no demuestra que corresponda al
código actual.

Servir el build y comprobar instalación limpia, navegación/recarga de la ruta
afectada, segunda visita, actualización del service worker y comportamiento
offline esperado. Un cambio sólo documental sigue el nivel 0 de
[AGENTS.md](../AGENTS.md).

## Última revisión

2026-07-15. Actualizar junto con `vite.config.ts` o la auditoría cuando cambien
patrones, nombres, límites o estrategia runtime.

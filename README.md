# Marketplace Celulares

Marketplace independiente de celulares y accesorios construido con React,
TypeScript, Vite y Supabase. No debe reconectarse, sincronizarse ni reutilizar
credenciales de marketplaces anteriores.

Este README es el índice para personas. Antes de cambiar código, datos,
configuración, Git o servicios remotos, leer [AGENTS.md](AGENTS.md), que define
el contrato operativo y la validación proporcional al riesgo. La identidad del
repo y del backend vigente vive en
[docs/IDENTIDAD_PROYECTO.md](docs/IDENTIDAD_PROYECTO.md).

## Inicio local

Instalá dependencias sólo si faltan o cambió el lockfile, y luego iniciá Vite:

```powershell
npm install
npm run dev
```

La aplicación usa variables locales en `.env.local`. Tomá `.env.example` como
referencia, pero nunca subas `.env.local`, contraseñas, tokens, claves de
servicio ni temporales de Supabase. Toda variable `VITE_` queda expuesta en el
bundle del navegador: ese prefijo se usa únicamente para valores públicos.

## Dónde buscar

| Necesidad | Fuente principal |
| --- | --- |
| Identificar repo, backend y recursos prohibidos | [docs/IDENTIDAD_PROYECTO.md](docs/IDENTIDAD_PROYECTO.md) |
| Seguridad, arquitectura y flujo de trabajo | [AGENTS.md](AGENTS.md) |
| Supabase, migraciones y mapa del backend | [docs/DB_SAFETY.md](docs/DB_SAFETY.md), [docs/BACKEND_MAP.md](docs/BACKEND_MAP.md) |
| Variables y entornos | [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) |
| Supabase local con Docker | [docs/LOCAL_BACKEND.md](docs/LOCAL_BACKEND.md) |
| Checkout y Mercado Pago | [docs/CHECKOUT_MERCADOPAGO.md](docs/CHECKOUT_MERCADOPAGO.md) |
| Catálogo y visor 3D | [docs/PRODUCT_3D_PREVIEW.md](docs/PRODUCT_3D_PREVIEW.md) |
| Pruebas automatizadas | [contexto/pruebas-automatizadas.md](contexto/pruebas-automatizadas.md) |
| Analítica, consentimiento y privacidad | [contexto/analitica-interna.md](contexto/analitica-interna.md) |
| Modularidad y límite de tamaño | [contexto/modularidad.md](contexto/modularidad.md) |
| PWA, service worker y caché | [contexto/pwa-y-cache.md](contexto/pwa-y-cache.md) |
| Contexto específico de cada dominio | [contexto/INDICE.md](contexto/INDICE.md) |
| Antecedentes del trabajo asistido | [docs/AI_WORKFLOW.md](docs/AI_WORKFLOW.md) |
| Planes históricos, no operativos | [docs/REFACTOR_PLAN.md](docs/REFACTOR_PLAN.md), [docs/NEW_BACKEND_PLAN.md](docs/NEW_BACKEND_PLAN.md) |

## Validación eficiente

No todos los cambios requieren la suite completa. Durante la iteración se usa
el control más pequeño capaz de detectar una regresión; los gates globales se
reservan para cambios transversales, sensibles o listos para publicación. La
matriz vinculante y sus excepciones están en [AGENTS.md](AGENTS.md).

Comandos frecuentes:

```powershell
# Prueba explícita o pruebas relacionadas con una fuente
npm test -- src/ruta/archivo.test.ts
npm exec vitest -- related src/ruta/fuente.ts --run

# Controles globales, sólo cuando el riesgo los activa
npm run preflight
npm run build
```

- `preflight` incluye lint, typecheck, la suite completa y las auditorías del
  repositorio.
- `build` incluye typecheck, el build de Vite y `audit:pwa`.
- No ejecutes primero todos los subcomandos y luego el gate que ya los incluye,
  salvo que estés aislando un fallo.
- Un cambio sólo documental no requiere tests, typecheck ni build: se revisan
  el diff, los enlaces y la codificación.

Para desarrollo dirigido también están disponibles `npm test` y
`npm run test:watch`. La suite no requiere credenciales ni consulta Supabase
remoto.

## Producción

Netlify publica `dist/` mediante `npm run build`. Supabase es un backend
independiente: las migraciones de `supabase/migrations/` y las funciones de
`supabase/functions/` se despliegan de forma explícita; publicar el frontend no
las actualiza.

Las variables de producción viven en el proveedor correspondiente, nunca en
archivos versionados. No ejecutar conexiones, migraciones, despliegues, cambios
de secretos ni borrados remotos sin alcance autorizado e identidad confirmada.

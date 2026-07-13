# Marketplace Celulares

Marketplace de celulares y accesorios basado en React, Vite y Supabase. Este
repositorio es un proyecto independiente: no debe reconectarse, sincronizarse
ni reutilizar credenciales de marketplaces anteriores.

## Punto de entrada

Este README es la guía para personas. Antes de hacer cambios técnicos, leer
[AGENTS.md](AGENTS.md): es el manual operativo obligatorio para sesiones de
Codex y otros agentes de IA.

| Si necesitas… | Consulta primero |
| --- | --- |
| Saber cuál es el repo Git y el proyecto Supabase vigentes | [docs/IDENTIDAD_PROYECTO.md](docs/IDENTIDAD_PROYECTO.md) |
| Entender decisiones, arquitectura, seguridad o estado actual | [AGENTS.md](AGENTS.md) |
| Trabajar con Supabase y migraciones | [docs/DB_SAFETY.md](docs/DB_SAFETY.md), [docs/BACKEND_MAP.md](docs/BACKEND_MAP.md) |
| Configurar variables de entorno | [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) |
| Usar Supabase local con Docker | [docs/LOCAL_BACKEND.md](docs/LOCAL_BACKEND.md) |
| Preparar checkout o Mercado Pago | [docs/CHECKOUT_MERCADOPAGO.md](docs/CHECKOUT_MERCADOPAGO.md) |
| Revisar el flujo de catálogo/3D | [docs/PRODUCT_3D_PREVIEW.md](docs/PRODUCT_3D_PREVIEW.md) |
| Entender el plan técnico heredado | [docs/REFACTOR_PLAN.md](docs/REFACTOR_PLAN.md), [docs/NEW_BACKEND_PLAN.md](docs/NEW_BACKEND_PLAN.md) |
| Encontrar contexto futuro por dominio | [contexto/](contexto/) |

## Desarrollo local

```powershell
npm install
npm run dev
```

La aplicación necesita variables locales en `.env.local`. Copiá
`.env.example` como referencia, pero nunca subas `.env.local`, claves de
servicio, contraseñas ni archivos temporales de Supabase.

## Verificación antes de cambiar o publicar

```powershell
npm run preflight
npm run build
```

Para cambios de base de datos, revisar primero las migraciones y el protocolo
de [AGENTS.md](AGENTS.md). Para cambios visuales, además verificar el flujo
afectado en la aplicación.

## Producción

El frontend se publica en Netlify y usa un proyecto Supabase de producción
independiente. Las variables de producción se guardan en el proveedor de
deploy, no en este repositorio.

Las migraciones viven en `supabase/migrations/` y son la fuente de verdad del
esquema. Las funciones Edge viven en `supabase/functions/`. Ambos recursos
deben desplegarse explícitamente; publicar el frontend no los actualiza.

## Regla principal

No ejecutar comandos de conexión, migración, despliegue o borrado contra un
proyecto remoto que no haya sido identificado y confirmado como el backend de
este marketplace.

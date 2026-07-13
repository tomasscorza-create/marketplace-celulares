# Identidad del proyecto — fuente de verdad

> Última actualización: 2026-07-13, confirmada por el dueño del proyecto.
> Este documento existe porque este checkout **se originó a partir de un
> marketplace anterior** (artesanal) y los agentes dudan sobre cuál es el backend
> y el repositorio vigentes. **Ante cualquier duda de identidad, la respuesta está
> acá y no hace falta preguntar.** Si algún dato de esta página contradice lo que
> se observa en el entorno, frenar y avisar al dueño en vez de adivinar.

## ✅ Lo VIGENTE (usar siempre esto)

| Recurso | Identidad correcta | Cómo verificarlo |
| --- | --- | --- |
| Repositorio Git | `marketplace-celulares` → `https://github.com/tomasscorza-create/marketplace-celulares.git` | `git remote -v` debe mostrar exactamente esa URL como `origin`. |
| Backend Supabase (producción) | Proyecto **"accesorios y celulares"** — project ref **`snlotkvstplwnoiacqyz`** (la URL es `https://<ref>.supabase.co`) | `VITE_SUPABASE_PROJECT_REF` en `.env.local` debe ser `snlotkvstplwnoiacqyz`. La guardia de `src/lib/supabase/client.ts` ya bloquea la conexión si no coincide. |
| Deploy frontend | Netlify, conectado a este repo, rama de producción **`main`** | Un `git push origin main` dispara el deploy (build según `netlify.toml`). |
| Rama de producción y trabajo actual | `main` | `git branch --show-current` debe verificarse en cada sesión; si el dueño abre una rama de trabajo, prevalece el estado real de Git. |

El project ref y la URL de Supabase son identificadores públicos (viajan en cada
request del navegador); **las claves no** — nunca copiar ni mostrar valores de
`.env.local` más allá de estos dos identificadores.

## ❌ Lo VIEJO (nunca conectar, nunca pushear, nunca consultar)

| Recurso obsoleto | Qué era | Regla |
| --- | --- | --- |
| Repos Git `losartesanos` y `artesanosrecuperado` | Repositorios del marketplace artesanal anterior | No agregarlos como remoto, no pushear, no traer código de ahí. |
| Cuenta/proyecto Supabase del marketplace artesanal | Backend del proyecto anterior | No conectar, no migrar, no reutilizar credenciales. Cualquier project ref que **no** sea `snlotkvstplwnoiacqyz` es ajeno a este proyecto. |
| Rama local `legacy/los-artesanos-main-20260712` | Snapshot de respaldo del proyecto anterior | Solo lectura histórica. No mergear, no borrar sin orden del dueño. |

## Chequeo rápido para agentes (30 segundos, sin preguntar al dueño)

Antes de cualquier operación remota (push, pull, deploy, migración, secrets):

```powershell
git remote -v          # origin = github.com/tomasscorza-create/marketplace-celulares.git
git branch --show-current
# El ref del backend (identificador público, no es un secreto):
Select-String -Path .env.local -Pattern "VITE_SUPABASE_PROJECT_REF"   # = snlotkvstplwnoiacqyz
```

Si los tres valores coinciden con la tabla de "Lo VIGENTE", proceder. Si alguno
no coincide, **detenerse y reportar** — no "corregirlo" por cuenta propia.

## Mantenimiento de este documento

- Si el dueño cambia de proyecto Supabase, repo o proveedor de deploy, actualizar
  este archivo **en el mismo commit** que el cambio.
- Este documento se referencia desde `AGENTS.md` (sección 1) y el README.

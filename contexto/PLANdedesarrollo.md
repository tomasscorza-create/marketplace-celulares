# Plan para completar `contexto/` con Gemini

> Copiá el siguiente prompt completo en Gemini desde la raíz de este
> repositorio. Gemini debe trabajar sólo sobre documentación y no modificar
> código, base de datos, funciones remotas, Git ni proveedores de deploy.

## Prompt para Gemini

```text
Actuá como documentalista técnico de un proyecto React/Vite/Supabase llamado
Marketplace Celulares. Tu trabajo es completar gradualmente la carpeta
`contexto/` con fichas breves, fiables y útiles para futuros agentes de IA.

No modifiques código de aplicación, migraciones, funciones Edge, archivos de
entorno, configuración de deploy ni datos remotos. No ejecutes comandos que
escriban, publiquen, borren, conecten o desplieguen recursos externos. Sólo
podés leer archivos y crear/editar documentación dentro de `contexto/`.

Reglas no negociables:

1. Leé primero, de principio a fin, `README.md` y `AGENTS.md`.
2. Tratá a `AGENTS.md` como el contrato vigente: no lo contradigas ni copies
   secretos, IDs de proyecto, URLs privadas, correos, contraseñas, tokens,
   claves o contenido de `.env*`, `supabase/.temp/`, `.netlify/` y
   `.local-quarantine/`.
3. Este repositorio es independiente. No mezcles decisiones, datos, nombres,
   credenciales ni remotos de proyectos anteriores.
4. Documentá sólo hechos respaldados por archivos actuales. Si algo es una
   inferencia, marcarlo explícitamente como `Inferencia` y explicar la fuente.
5. No escribas un diario de cambios ni repitas el README. Cada ficha debe ser
   una referencia práctica y mantenible.
6. Antes de terminar, revisá que no haya información sensible en los nuevos
   archivos y que sus enlaces/rutas apunten a archivos existentes.

Objetivo final:

Crear fichas Markdown pequeñas en `contexto/` para que un agente futuro pueda
encontrar rápidamente el origen de verdad, las reglas, las dependencias y la
forma de validar cada área sin recorrer todo el repositorio.

Trabajá por fases. Al finalizar cada fase, detenete, informá los archivos
creados/actualizados y esperá confirmación antes de continuar a la siguiente.

### Fase 0 — Baseline y mapa de documentación

- Leé `README.md`, `AGENTS.md` y los documentos de `docs/` que correspondan.
- Inventariá los dominios reales presentes en `src/`, `supabase/`, `scripts/`
  y configuración raíz.
- Creá `contexto/INDICE.md` con una tabla de fichas: dominio, propósito,
  fuentes de verdad y estado (`pendiente`, `documentado`, `requiere revisión`).
- No crear fichas de dominio todavía salvo que sean imprescindibles para
  explicar el índice.

### Fase 1 — Aplicación y roles

Documentá, como mínimo, estas fichas si el código actual las confirma:

- `contexto/aplicacion-y-rutas.md`: arranque, router, layouts, páginas y
  fronteras entre UI pública y paneles.
- `contexto/autenticacion-y-roles.md`: proveedor de sesión, rutas protegidas,
  perfiles y roles `admin`, `artisan` y `buyer`.
- `contexto/catalogo-y-productos.md`: fuentes de catálogo, condiciones de
  visibilidad, producto, stock, imágenes y 3D opcional.

### Fase 2 — Backend y datos

Documentá el backend sin exponer valores de producción:

- `contexto/supabase-esquema-y-migraciones.md`: convenciones de migraciones,
  tablas importantes, RLS, Storage, RPC y validación segura.
- `contexto/funciones-edge.md`: función, propósito, llamada desde frontend,
  autorización y secrets requeridos por nombre (nunca por valor).
- `contexto/operacion-admin.md`: gestión de vendedores, categorías, productos,
  compradores y controles internos.

### Fase 3 — Operación, integración y publicación

- `contexto/entornos-y-seguridad.md`: contratos de `.env.example`, cliente
  Supabase, cuarentena local, archivos prohibidos y auditorías.
- `contexto/despliegue-y-verificacion.md`: build, Netlify, límites entre
  frontend/migraciones/funciones Edge y pruebas posteriores al deploy.
- `contexto/checkout-y-pagos.md`: únicamente si el código/documentación actual
  lo respalda; registrar dependencias pendientes y nunca claves de pago.

### Fase 4 — Consolidación

- Revisá referencias cruzadas y eliminá duplicación.
- Actualizá `contexto/INDICE.md` con las fichas realmente creadas.
- Agregá al final de cada ficha una sección `Mantenimiento` que diga cuándo
  debe actualizarse.
- Informá riesgos, documentación antigua contradictoria y áreas que deban
  validarse manualmente. No inventes soluciones ni las implementes.

## Plantilla obligatoria para cada ficha

Usá esta estructura, ajustando sólo las secciones que no apliquen:

# Nombre del dominio

## Propósito

## Fuentes de verdad

- `ruta/al/archivo`: por qué importa.

## Flujo o arquitectura

Explicación breve y, si aclara relaciones complejas, un diagrama Mermaid
pequeño.

## Reglas y decisiones vigentes

## Dependencias y límites externos

## Validación

Comandos o verificaciones no destructivas.

## Riesgos y errores frecuentes

## Mantenimiento

Cuándo y por qué debe actualizarse esta ficha.

## Resultado esperado de cada fase

Respondé con:

1. Fase completada.
2. Archivos leídos.
3. Fichas creadas o actualizadas.
4. Hechos verificados frente a inferencias.
5. Riesgos, vacíos o decisiones que requieren confirmación humana.
6. Próxima fase propuesta, sin ejecutarla todavía.
```

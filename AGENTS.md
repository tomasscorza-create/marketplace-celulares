# Manual operativo para agentes

Este documento es el contrato de trabajo para agentes de IA y colaboradores
técnicos. Su objetivo es obtener la mayor confianza necesaria con el menor
trabajo repetido: proteger identidad, datos y producción sin convertir cada
cambio pequeño en una certificación completa del repositorio.

## 1. Reglas no negociables

### Identidad y trabajo existente

- Este es un marketplace independiente de celulares y accesorios. No mezclar
  código, remotos, dominios, datos ni credenciales con el marketplace del que
  se originó este checkout ni con otros proyectos del usuario.
- Ante cualquier duda sobre el repo Git o el proyecto Supabase vigente, leer
  [docs/IDENTIDAD_PROYECTO.md](docs/IDENTIDAD_PROYECTO.md). Es la fuente de
  verdad de identidad y contiene el chequeo actual; no volver a preguntarle al
  dueño lo que ese archivo ya responde.
- Confirmar al iniciar la tarea la raíz, rama y estado con
  `git rev-parse --show-toplevel` y `git status -sb`. Los cambios preexistentes
  pertenecen al usuario o a otro agente: preservarlos y revisar el diff antes
  de editar un archivo compartido.
- Ejecutar `git remote -v` cuando exista duda de identidad o antes de `fetch`,
  `pull`, `push` o cambios de remoto. Un merge puramente local no requiere
  consultar la red, pero sí revisar rama, estado y posibles solapamientos.
- No limpiar el worktree con comandos destructivos ni integrar, mover o
  publicar cambios ajenos sólo para facilitar la tarea actual.

### Secretos y configuración

- Nunca versionar, mostrar ni copiar `.env.local`, `*.secrets.env`, contraseñas
  de base, claves `service_role`, tokens de proveedores, `supabase/.temp/`,
  `.netlify/` ni `.local-quarantine/`.
- Toda variable `VITE_` queda expuesta en el bundle del navegador. No guardar
  secretos bajo ese prefijo; usarlo únicamente para valores explícitamente
  públicos.
- Antes de stagear, revisar el diff de trabajo; después de stagear y antes de
  publicar, revisar `git diff --cached`. Las auditorías ayudan, pero no
  reemplazan esas revisiones y no certifican el contenido ignorado de
  `.env.local`.

### Alcance y autoridad

- La inspección local y las comprobaciones read-only dentro del alcance son
  válidas sin pedir permiso adicional.
- Una operación destructiva local, como `supabase db reset --local`, sólo se usa
  si la tarea la necesita y después de confirmar que el objetivo es una pila
  local descartable. No ejecutar `db reset` con `--linked` ni `--db-url` contra
  una base remota.
- Toda mutación remota —cualquier `git push`, `db push`, deploy de funciones,
  secrets, deploy, borrado o cambio de cuenta— requiere objetivo identificado y
  alcance inequívoco. Un push a la rama de producción además es un deploy.
- Hacer el cambio más pequeño que resuelva la causa. No duplicar clientes,
  lógica de rol, políticas, consultas ni flujos existentes.

## 2. Inicio y cierre de una tarea

1. Confirmar raíz, rama y worktree con `git rev-parse --show-toplevel` y
   `git status -sb`; consultar `git diff --name-only` y el diff concreto cuando
   haya archivos modificados.
2. Leer este manual y sólo la documentación del dominio afectado. No hace falta
   recorrer todo `docs/` o `contexto/` para una tarea localizada.
3. Declarar el alcance de archivos y clasificar el cambio con la matriz de la
   sección 3. La clasificación depende del impacto, no de la cantidad de líneas.
4. Implementar en una porción coherente. Durante la iteración, usar controles
   dirigidos; reservar los gates globales para el checkpoint que los activa.
5. Revisar el diff y cerrar cualquier nivel con `git diff --check` limitado a
   los archivos de la tarea si el worktree contiene cambios ajenos. No repetir
   un control verde del mismo worktree o commit si sus entradas no cambiaron;
   resultados históricos sin baseline no son evidencia.
6. Actualizar documentación sólo cuando cambie un contrato duradero. Un ajuste
   interno pequeño no obliga por sí solo a crear historial o contexto nuevo.
7. Informar al cerrar: alcance, riesgo, comandos ejecutados, verificaciones no
   realizadas y motivo, QA manual o remoto pendiente y cambios ajenos
   preservados. Separar estado local, Git remoto, backend, deploy y conducta
   visible; uno no demuestra automáticamente los demás.

Sólo pausar antes de cruzar una mutación remota o destructiva no autorizada,
ante un solapamiento que no pueda preservarse, o cuando falte una decisión que
cambie materialmente el resultado.

## 3. Validación proporcional al riesgo

> Durante la iteración, ejecutar el control más pequeño capaz de detectar una
> regresión del cambio. Reservar la certificación completa para cambios
> transversales, sensibles, integrados o listos para publicación.

### Matriz de decisión

| Nivel y disparador | Verificación mínima suficiente |
| --- | --- |
| **0 — Documentación**: Markdown, comentarios o texto sin efecto ejecutable | Revisar contenido, enlaces/rutas y `git diff --check`. Ejecutar `npm run audit:encoding` cuando cambie texto susceptible de codificación. No ejecutar lint, typecheck, tests ni build. Si el archivo es generado o participa de un contrato automático, ejecutar su auditoría específica. |
| **1 — Cambio localizado**: una función, componente, test, estilo o copy sin contrato compartido | Ejecutar el test explícito o pruebas relacionadas y ESLint sólo sobre JS/TS/TSX afectados. Sumar typecheck si cambian lógica, imports, JSX estructural, tipos o exports; copy/clases aisladas no lo activan. Para UI/CSS, probar el recorrido afectado; sumar build si cambian imports, assets, Tailwind/PostCSS o la estructura del bundle. |
| **2 — Cambio de dominio**: varias piezas de una misma feature, props, exports, queries o tipos locales sin tocar un contrato crítico | Ejecutar ESLint aplicable, la suite explícita del dominio y typecheck; si corresponde build, usarlo en lugar del typecheck separado porque ya lo incluye. Sumar la auditoría activada por el cambio. No usar `preflight` si estas pruebas acotan el impacto con claridad. |
| **3 — Crítico o integración**: varios dominios, clientes/tipos compartidos, control de acceso/sesión/roles, dinero, pagos, stock, checkout, captura o consentimiento analítico, identidad, sesiones, entrega, retención, rate limit, privacidad, setup de tests, tooling, dependencias, release frontend o impacto incierto | Durante la iteración usar controles dirigidos. En el checkpoint final ejecutar `npm run preflight` una sola vez y `npm run build` si cambia o se publicará el frontend. Copy o presentación aislada dentro de auth/analítica no escala por el nombre de la feature. Toda mutación remota requiere además alcance autorizado. |
| **Ruta backend — crítica pero específica**: SQL, migraciones, RPC, RLS, Storage o Edge Functions sin cambio frontend | Revisar diff, ejecutar tests de contrato explícitos, `audit:backend`, lint/runtime aplicable y los controles de la sección 6. No ejecutar automáticamente los tests frontend ni build: sumar `preflight` sólo si cambia un contrato compartido, tooling, varias superficies o se pide certificación integral. |

La ruta backend no reduce el riesgo: selecciona controles capaces de observar
ese backend en vez de ejecutar pruebas frontend sin relación. Si el impacto es
incierto, escalar a nivel 3. Un cambio sólo documental desde el último
checkpoint verde no activa una suite completa por estar en un commit o push
posterior; una política externa de CI puede ejecutarla de todos modos.

### Tests y lint dirigidos

```powershell
# Pruebas que Vitest relaciona por el grafo de imports
npm exec vitest -- related src/ruta/fuente.ts --run

# Uno o varios archivos de prueba conocidos
npm test -- src/ruta/archivo.test.ts

# Sólo archivos de código afectados
npm exec eslint -- src/ruta/archivo.ts

# Contrato TypeScript del proyecto
npm run typecheck
```

- Preferir el test más cercano y ampliar la selección sólo si hay consumidores
  compartidos o cobertura incierta.
- `vitest related` usa relaciones estáticas. No es evidencia suficiente para
  tests que leen SQL, migraciones o archivos mediante `readFileSync`; en esos
  casos invocar explícitamente el test de contrato correspondiente.
- La configuración actual de ESLint excluye `scripts/**` y
  `supabase/functions/**`, y el typecheck global no certifica ampliamente esas
  superficies. Validarlas con sus pruebas, auditorías y herramientas de runtime
  específicas; no atribuirles cobertura sólo porque `preflight` pasó.
- Si la selección no encuentra tests, no afirmar que el área quedó cubierta.
  Buscar pruebas con `rg --files` y ejecutar la más cercana, crear una prueba si
  la conducta lo exige o escalar al gate superior.
- Un test dirigido verde prueba esa superficie; no equivale a una certificación
  completa del repositorio.

Para superficies fuera de la cobertura global:

- Migración: test de contrato explícito y `npm run audit:backend`; ejecutar
  `npm run db:lint` sólo cuando esté aplicada en una pila local confirmada.
- Edge Function: prueba explícita y recorrido o probe local. Si el entorno no
  está disponible, declararlo pendiente; no sustituirlo con un deploy remoto.
- Script: ejecutar su test compañero y el propio script en un modo local seguro
  que no escriba ni publique, cuando exista.

### Gates compuestos y trabajo no repetido

- `npm run preflight` ya incluye lint, typecheck, la suite completa y las
  auditorías de backend, secretos, conexiones, encoding y tamaño de archivos.
- `npm run build` ya incluye typecheck, el build de Vite y `audit:pwa`.
- No ejecutar inmediatamente lint, typecheck o `npm test` completos antes de
  `preflight`, ni typecheck o `audit:pwa` antes de `build`, salvo para aislar un
  fallo. Los tests dirigidos durante la iteración sí son feedback útil.
- Si `preflight` y `build` son necesarios, ejecutarlos una sola vez cada uno
  sobre el estado final. Actualmente ambos incluyen typecheck; esa duplicación
  interna sólo puede eliminarse cambiando los scripts, no repitiendo más
  comandos alrededor.
- Después de un gate verde del worktree o commit actual, repetir sólo si cambió
  un archivo relevante, se integró otra porción o el checkpoint final exige el
  estado combinado. Un resultado histórico sin baseline no cuenta como verde.

### Cuándo usar cada auditoría

| Comando | Disparador |
| --- | --- |
| `npm run audit:backend` | Migraciones, referencias `.from()`/`.rpc()` o `docs/BACKEND_MAP.md` |
| `npm run audit:secrets` | Archivos compartibles con credenciales/configuración, preparación de publicación o sospecha concreta |
| `npm run audit:connections` | URLs, project refs, identidad backend o configuración de conexión |
| `npm run audit:encoding` | Markdown, textos, datos o archivos con caracteres no ASCII |
| `npm run audit:large-files` | Archivo de código, script, CSS o SQL creado/ampliado cerca de 1000 líneas; `preflight` lo incluye para certificación |
| `npm run audit:pwa` | Lo ejecuta `build`; aislarlo sólo para diagnosticar el `dist` recién generado, nunca como prueba sobre un build viejo |

## 4. Contratos vigentes del sistema

### Plataforma y producto

| Área | Contrato actual |
| --- | --- |
| Frontend y deploy | React + TypeScript + Vite. Netlify construye `dist/` con `npm run build` según `netlify.toml`. |
| Cliente Supabase | `src/lib/supabase/client.ts` sólo habilita conexión con URL, clave pública, project ref coincidente y opt-in explícito. |
| Esquema | Los cambios son aditivos: crear una migración nueva en `supabase/migrations/`; nunca reescribir una aplicada. |
| Productos | El modelo de lotes fue retirado por `20260713120000_remove_product_batches.sql`. La disponibilidad inmediata usa `products.stock_quantity`; referencias anteriores a lotes son historia. Sólo se publican productos activos de vendedores visibles. |
| Storage | Admin puede cargar productos para un vendedor. Imágenes y modelos se guardan bajo la carpeta de ese vendedor; propietario y admin conservan escritura, otros usuarios no. |
| Medios 3D | El modelo es manual y opcional (`.glb`/`.gltf`); las fotos no lo generan. Sin modelo real, el catálogo puede mostrar una reserva visual. Catálogo y detalle reutilizan `ProductModel3DViewer.tsx`, y el detalle lo integra como slide de la galería. |
| Especificaciones | Admin define `category_spec_templates`; el formulario compartido admin/vendedor guarda un snapshot en `products.category_spec_values`. Cambiar de categoría descarta esos valores, sin migrarlos entre plantillas. |
| Promociones | `catalog_promotions` admite mensajes, imágenes, productos y beneficios. La ubicación inicial vive sólo en desktop, en la celda inferior derecha del showcase de `Explorar`; móvil requiere decisión visual. Cada perfil reclama una vez con snapshot económico y el beneficio aún no se aplica al checkout. |
| Edge y pagos | Las funciones administrativas son backend operativo. Checkout/pagos requieren sus propios secretos antes de habilitarse o desplegarse. |
| Modularidad | Código, scripts y SQL auditados deben quedar por debajo de 1000 líneas. Extraer por dominio sin romper exports públicos. |
| PWA | El precache contiene sólo shell y dependencias mínimas; rutas lazy, 3D, fuentes y datasets usan caché runtime. `build` debe conservar `audit:pwa` verde. |
| Pruebas | Vitest + React Testing Library. `npm test` ejecuta toda la suite y `npm run test:watch` sirve para desarrollo. |

### Analítica y privacidad

- Las visitas anónimas son agregadas: no reciben ID persistente ni se vinculan
  después con una cuenta. Sólo compradores y vendedores con consentimiento
  versionado vigente generan `analytics_sessions` y `analytics_events`.
- Las cuentas creadas se calculan desde `profiles.created_at` y `profiles.role`.
  `signup_started` es un agregado anónimo y su comparación es orientativa, no
  un vínculo con perfiles posteriores.
- El panel consulta cada 30 segundos sólo con la pestaña visible, revalida al
  recuperar foco y conserva el último resultado durante recargas. No habilitar
  polling en segundo plano.
- La clasificación de dispositivo es general y estimada. No usar fingerprinting
  mediante canvas, WebGL, fuentes, audio, publicidad u otras señales
  identificadoras. La IP no se almacena: sólo puede procesarse en memoria para
  rate limit y ubicación aproximada.
- La captura anónima acepta únicamente orígenes y rutas productivas conocidas,
  ignora bots comunes y usa HMAC diario de IP como clave efímera compartida de
  rate limit. Ese hash no entra en informes ni identifica visitantes. Los picos
  excluidos quedan fuera del resumen y sólo aparecen como calidad agregada.
- Los reintentos reutilizan el mismo `event_id`. Los recibos anónimos son
  efímeros y no contienen usuario, sesión, ruta, IP ni dispositivo.
- Una sesión consentida vence tras 30 minutos sin actividad. El tiempo activo
  cuenta sólo con la página visible, se entrega cada 10 segundos y al ocultar;
  `pagehide` solicita cierre. No usar `ended_at - started_at` como duración.
- `run_internal_analytics_maintenance()` se ejecuta diariamente a las 03:17
  UTC: conserva eventos/sesiones 365 días y agregados/calidad 730. Cada corrida
  se audita y el panel alerta tras 36 horas sin éxito. La limpieza nunca se
  amplía a perfiles, productos, pedidos, pagos ni inventario.

## 5. Mapa de arquitectura

| Área | Fuente principal | Responsabilidad |
| --- | --- | --- |
| Arranque y rutas | `src/main.tsx`, `src/app/`, `src/layouts/` | Aplicación, navegación y layouts por rol |
| Autenticación | `src/features/auth/` | Sesión, roles y rutas protegidas |
| Catálogo público | `src/features/public/`, `src/pages/CatalogPage.tsx` | Feed, filtros, tarjetas y producto |
| Vendedores y productos | `src/features/artisan/`, `src/pages/ArtisanProductsPage.tsx` | Alta, edición, medios, stock y tienda |
| Administración | `src/features/admin/`, `src/pages/Admin*.tsx` | Vendedores, categorías, productos y controles |
| Compradores y pedidos | `src/features/buyer/`, `src/features/orders/` | Carrito, cuenta, órdenes y checkout |
| Datos compartidos de categorías | `src/features/categorySpecs/` | Lector común para admin y vendedor; evitar imports cruzados o duplicación |
| Promociones | `src/features/catalogPromotions/` | Reglas, cliente, queries y contratos de promociones |
| Analítica | `src/features/analytics/`, `src/pages/AdminAnalyticsPage.tsx` | Consentimiento, métricas e informes |
| Cliente Supabase | `src/lib/supabase/client.ts` | Guardia de entorno y cliente compartido |
| Esquema y Edge | `supabase/migrations/`, `supabase/functions/` | Tablas, RLS, Storage, RPC y funciones |
| Pruebas | `src/**/*.test.ts(x)`, `src/test/`, `vitest.config.ts` | Negocio, autorización y contratos compartidos |
| Validaciones | `scripts/`, `package.json` | Gates y auditorías locales |

La carpeta compartida entre roles se usa sólo cuando el mismo dato debe ser
leído por features distintas. No crear imports directos entre `admin/` y
`artisan/` ni duplicar el lector en cada rol.

## 6. Flujos críticos y operaciones remotas

### Diagnóstico de productos

Los medios se guardan bajo el vendedor y el producto se escribe en
`public.products`; el catálogo exige producto activo y vendedor visible. Si la
UI muestra éxito pero no existe la fila, revisar en orden Storage/RLS, respuesta
de inserción, rol y visibilidad/estado antes de culpar al catálogo.

### Gate por operación

| Operación | Condición antes de ejecutarla |
| --- | --- |
| Inspección local/read-only | Dentro del alcance; no necesita una mutación remota para “confirmar” documentación. |
| `fetch`, `pull` o `push` | Verificar identidad, `git remote -v`, rama y estado. Revisar divergencia y cambios staged. Un push a la rama de producción también es un deploy Netlify. |
| `supabase db reset --local` | Confirmar pila local descartable y necesidad real. No usarlo como rutina para SQL mínimo ni combinarlo con `--linked` o `--db-url`. |
| Cambio de esquema remoto | Leer [docs/DB_SAFETY.md](docs/DB_SAFETY.md), revisar `supabase migration list` y diff, crear migración nueva, ejecutar `supabase db push --dry-run`, aplicar sólo con alcance autorizado y verificar después con migration list y `supabase db lint --linked`. |
| Edge Function o secrets | Confirmar proyecto, función y secretos requeridos. Desplegar por nombre sólo si la tarea incluye deploy y verificar el resultado por separado. |
| Netlify | `netlify.toml` define build. Variables viven en Netlify. Un deploy frontend no despliega migraciones ni Edge Functions. Tras cambiar dominio, actualizar URLs permitidas de Auth antes de activar correo. |

Antes de publicar, revisar el diff staged y confirmar que no incluye secretos,
builds, temporales ni configuración local. Un build local verde no confirma que
GitHub, Netlify o Supabase estén sincronizados.

## 7. Sistema documental

- `README.md` es el índice humano y la única tabla general de navegación.
- `AGENTS.md` contiene invariantes transversales, seguridad, arquitectura y el
  protocolo operativo. Se actualiza sólo cuando cambia uno de esos contratos.
- `contexto/` contiene fichas pequeñas por dominio. Leer sólo las relacionadas
  con la tarea y actualizar una ficha cuando cambie una decisión duradera de su
  dominio, no como diario de cada edición.
- `docs/` contiene protocolos especializados y planes históricos. Los planes
  antiguos no son instrucciones operativas salvo que la tarea los adopte de
  forma explícita.
- Cada dato debe tener una fuente propietaria. Enlazarla en vez de copiar el
  mismo detalle entre README, AGENTS y varias fichas.
- Las fichas de contexto deben indicar propósito, archivos fuente, datos o
  dependencias externas, decisiones vigentes, validación y última revisión.
- No documentar secretos, dumps, tokens, información personal ni valores de
  producción que no sean identificadores públicos aprobados.
- Para conflictos de identidad manda `docs/IDENTIDAD_PROYECTO.md`; si contradice
  el entorno, detenerse y reportar. Para otros contratos, verificar código,
  migraciones y configuración actuales, y actualizar la fuente propietaria en
  lugar de seguir documentación heredada a ciegas.

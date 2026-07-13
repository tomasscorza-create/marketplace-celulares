# Manual operativo para agentes

Este documento es el contrato de trabajo para cualquier agente de IA, sesión
de Codex o colaborador técnico. Leerlo completo antes de editar código,
migraciones, configuración, Git o servicios remotos.

## 1. Identidad, límites y seguridad

- **Ante cualquier duda sobre cuál es el repo Git o el proyecto Supabase
  vigente, leer [docs/IDENTIDAD_PROYECTO.md](docs/IDENTIDAD_PROYECTO.md).**
  Es la fuente de verdad de identidad (repo actual, project ref de Supabase
  de producción, recursos viejos prohibidos) e incluye un chequeo de 30
  segundos. No preguntar al dueño lo que ese archivo ya responde.
- Este es un marketplace independiente de celulares y accesorios.
- No mezclar código, remotos Git, dominios, datos ni credenciales con el
  marketplace del que se originó este checkout ni con otros repositorios del
  usuario.
- `origin` debe apuntar solamente al repositorio independiente actual. Antes
  de `push`, `pull`, `merge` o cambio de remoto, verificar `git remote -v` y
  `git status --short`.
- Nunca versionar, mostrar ni copiar: `.env.local`, archivos `*.secrets.env`,
  contraseñas de base, claves `service_role`, tokens de proveedores, archivos
  `supabase/.temp/`, `.netlify/` o `.local-quarantine/`.
- Las claves con prefijo `VITE_` son públicas por diseño sólo cuando se usan
  en el navegador. No confundirlas con secretos de servidor.
- No hacer `db reset`, `db push`, `functions deploy`, cambios de secrets,
  despliegues, borrados o cambios de cuentas remotas sin identificar el
  objetivo y confirmar que está dentro del alcance de la tarea.

## 2. Estado y decisiones vigentes

- El frontend es React + TypeScript + Vite; Netlify construye `dist/` con
  `npm run build` según `netlify.toml`.
- Supabase es el backend de producción. La conexión se habilita únicamente
  cuando la URL, la clave pública, el project ref coincidente y el opt-in
  explícito de entorno están presentes. Esta protección vive en
  `src/lib/supabase/client.ts`.
- Los cambios de esquema son aditivos: crear una migración nueva en
  `supabase/migrations/`; nunca reescribir una migración ya aplicada.
- El producto se publica sólo si es activo y su vendedor es un artesano
  visible. El catálogo no muestra filas inexistentes ni productos inactivos.
- El panel admin puede cargar productos para un vendedor y sus imágenes se
  guardan dentro de la carpeta del vendedor. Las políticas de Storage deben
  conservar el acceso del propietario y del administrador, sin abrir escrituras
  a otros usuarios.
- El modelo 3D es opcional. Sólo se sube cuando se selecciona manualmente un
  `.glb` o `.gltf`; las fotos no generan modelos 3D. El catálogo puede mostrar
  una tarjeta visual de reserva cuando el producto no tiene un modelo real.
- Las funciones Edge administrativas son parte del backend operativo. Las
  funciones de checkout/pagos requieren secretos de pago propios antes de ser
  habilitadas o desplegadas para producción.

## 3. Mapa de arquitectura

| Área | Fuente principal | Responsabilidad |
| --- | --- | --- |
| Arranque y rutas | `src/main.tsx`, `src/app/`, `src/layouts/` | Aplicación, navegación y layouts por rol |
| Autenticación | `src/features/auth/` | Sesión, roles y rutas protegidas |
| Catálogo público | `src/features/public/`, `src/pages/CatalogPage.tsx` | Feed, filtros, tarjetas y vista de producto |
| Vendedores y productos | `src/features/artisan/`, `src/pages/ArtisanProductsPage.tsx` | Alta, edición, fotos, stock, lotes y tienda |
| Administración | `src/features/admin/`, `src/pages/Admin*.tsx` | Vendedores, categorías, productos y controles |
| Compradores y pedidos | `src/features/buyer/`, `src/features/orders/` | Carrito, cuenta, órdenes y checkout |
| Cliente Supabase | `src/lib/supabase/client.ts` | Guardia de entorno y cliente compartido |
| Esquema de datos | `supabase/migrations/` | Tablas, RLS, Storage, RPC y funciones SQL |
| Funciones Edge | `supabase/functions/` | Acciones administrativas y checkout seguro |
| Validaciones | `scripts/`, `package.json` | Auditorías, lint, tipos y build |

## 4. Flujos críticos

### Productos y catálogo

1. Un administrador gestiona una cuenta vendedora o un vendedor gestiona su
   propia cuenta.
2. Las imágenes se suben al bucket de productos bajo la carpeta del vendedor.
3. El producto se inserta en `public.products` o mediante la RPC de lotes.
4. El catálogo público muestra sólo productos activos de vendedores visibles.

Si una interfaz muestra éxito pero la tabla no contiene filas, investigar en
este orden: errores de Storage/RLS, respuesta de inserción/RPC, rol del usuario
y visibilidad/estado del producto. No asumir que el catálogo es el fallo.

### Supabase

1. Revisar `supabase migration list` y el diff antes de una modificación.
2. Escribir una nueva migración con políticas idempotentes cuando corresponda.
3. Ejecutar `supabase db push --dry-run` antes de aplicar en remoto.
4. Aplicar sólo al proyecto confirmado y verificar con `supabase migration list`
   y `supabase db lint --linked`.
5. Desplegar funciones Edge por nombre cuando su código cambie; revisar secrets
   requeridos antes de invocarlas.

### Netlify

- La configuración de build vive en `netlify.toml`.
- Las variables de producción se definen en Netlify, nunca en archivos
  versionados.
- Un deploy del frontend no despliega migraciones ni funciones Edge.
- Después de cambiar URL/dominio, actualizar las URLs permitidas de Auth en
  Supabase antes de activar flujos por correo.

## 5. Rutina de trabajo obligatoria

1. Leer este archivo y la documentación específica del área.
2. Inspeccionar `git status --short`, remotos y cambios existentes. Preservar
   cambios ajenos y no usar comandos destructivos para limpiarlos.
3. Hacer el cambio más pequeño que resuelva la causa, sin duplicar clientes,
   lógica de rol, políticas o flujos existentes.
4. Verificar según el riesgo:

   ```powershell
   npm run preflight
   npm run build
   ```

   Para cambios de Supabase, sumar las verificaciones del flujo de la sección
   anterior. Para cambios de interfaz, probar el recorrido afectado.
5. Documentar una decisión duradera en este archivo o en una ficha específica
   de `contexto/`, no en un comentario temporal.
6. Antes de publicar, revisar archivos staged y confirmar que no contienen
   secretos, builds ni configuraciones locales.

## 6. Cómo mantener este sistema de contexto

- `README.md` es el índice humano y debe mantenerse breve; enlaza a la fuente
  de verdad en lugar de repetir detalles técnicos.
- `AGENTS.md` guarda decisiones transversales, límites de seguridad, mapa de
  arquitectura y protocolo. Actualizarlo cuando cambie un contrato operativo.
- `contexto/` se reserva para fichas pequeñas por dominio cuando aparezca
  complejidad repetida, por ejemplo `contexto/catalogo.md`,
  `contexto/autenticacion.md` o `contexto/pagos.md`.
- Cada ficha de `contexto/` debe indicar: propósito, archivos fuente, datos o
  dependencias externas, decisiones vigentes, validación y última revisión.
- No copiar secretos, dumps, tokens, información personal o valores de
  producción en ningún documento de contexto.
- Si una decisión queda obsoleta, reemplazarla con la decisión actual y dejar
  una nota breve de migración; evitar diarios extensos y contradictorios.

## 7. Referencias internas

- `docs/DB_SAFETY.md`: protocolo de conexión y cambios de base.
- `docs/ENVIRONMENT.md`: variables y entornos.
- `docs/BACKEND_MAP.md`: mapa de tablas, RPC y backend.
- `docs/LOCAL_BACKEND.md`: Supabase local/Docker.
- `docs/CHECKOUT_MERCADOPAGO.md`: checkout y pagos.
- `docs/PRODUCT_3D_PREVIEW.md`: diseño y límites del visor 3D.
- `docs/AI_WORKFLOW.md`: antecedentes de trabajo asistido.

Cuando estos documentos antiguos contradigan una decisión vigente de este
manual, primero verificar el código y el entorno actual. Luego actualizar la
fuente correcta en vez de aplicar instrucciones heredadas a ciegas.

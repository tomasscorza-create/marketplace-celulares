# Pruebas automatizadas

## Propósito

Definir cómo se ejecutan y amplían las pruebas locales que protegen reglas de
negocio y decisiones de autorización sin conectarse a servicios remotos.

## Fuentes de verdad

- `vitest.config.ts`: configuración de Vitest, alias de `src/`, entorno jsdom y setup común.
- `src/test/setup.ts`: matchers de DOM y limpieza posterior a cada prueba.
- `src/**/*.test.ts` y `src/**/*.test.tsx`: pruebas colocadas junto al contrato que protegen.
- `src/test/`: pruebas transversales entre frontend y funciones Edge.
- `package.json`: comandos `test`, `test:watch` y composición de `preflight`.

## Flujo o arquitectura

Vitest ejecuta pruebas puras y de React en jsdom. Las pruebas de componentes
usan React Testing Library y verifican resultados visibles en lugar de detalles
internos. Los contratos compartidos entre frontend y Edge Functions se prueban
importando ambas implementaciones y comparando resultados deterministas.

La suite no carga `.env.local`, no necesita usuarios reales y no crea clientes
Supabase. Las pruebas que requieran base, RLS, Storage o proveedores de pago
deben implementarse posteriormente en un entorno local o de staging aislado;
nunca contra producción como parte de `npm test`.

## Reglas y decisiones vigentes

- `npm test` ejecuta la suite una vez y debe terminar sin procesos abiertos.
- `npm run test:watch` se reserva para desarrollo interactivo.
- `npm run preflight` incluye tests y es la puerta completa antes de publicar.
- Cada corrección de una regresión debe agregar un caso que falle antes del arreglo.
- Evitar snapshots extensos y mocks que repitan la implementación.
- Fechas, aleatoriedad y respuestas externas deben ser deterministas o inyectables.
- No incluir claves, URLs privadas, datos personales ni conexiones remotas en fixtures.

## Cobertura inicial

- Validación de alta y edición de productos con stock o bajo demanda.
- Agrupación de carrito, demoras y cálculo/bloqueo de envío.
- Claves, resúmenes y modificadores de configuraciones de producto.
- Validación server-side de opciones para impedir precios manipulados.
- Vencimiento de checkouts pendientes.
- Transiciones y resúmenes de preparación de pedidos.
- Paridad de tarifas de envío entre frontend y Edge Functions.
- Decisiones de `ProtectedRoute` para configuración, sesión, perfil y rol.

## Dependencias y límites externos

- Vitest es el runner y reutiliza la transformación de Vite.
- jsdom emula las APIs básicas del navegador; no sustituye una prueba real de WebGL, PWA o layout.
- React Testing Library valida componentes desde la perspectiva del usuario.
- La suite actual no certifica RLS, migraciones aplicadas, Storage, Mercado Pago ni Supabase Auth real.

## Validación

```powershell
npm test
npm run preflight
npm run build
```

`npm audit` debe permanecer sin vulnerabilidades conocidas después de agregar o
actualizar herramientas de prueba.

## Riesgos y errores frecuentes

- Confundir una prueba de función pura con la certificación del flujo remoto completo.
- Mockear Supabase de forma tan detallada que el test sólo compruebe el mock.
- Dejar pruebas fuera de `preflight`, permitiendo publicar aunque fallen.
- Probar textos o estructura incidental cuando existe una regla de negocio más estable.

## Mantenimiento

Actualizar esta ficha cuando cambie el runner, el setup global, los comandos,
el alcance de integración o los servicios autorizados para pruebas. Última
revisión: 2026-07-13.

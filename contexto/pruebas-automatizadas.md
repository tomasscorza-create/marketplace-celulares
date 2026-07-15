# Pruebas automatizadas

## Propósito

Elegir la prueba más pequeña que observe el cambio y reservar la suite completa
para checkpoints que realmente la requieran.

## Archivos fuente

- `vitest.config.ts`: Vitest, alias, jsdom y setup.
- `src/test/setup.ts`: matchers DOM y limpieza común.
- `src/**/*.test.ts` y `src/**/*.test.tsx`: pruebas junto al contrato.
- `src/test/`: contratos transversales, incluidos módulos compartidos con Edge.
- `package.json`: `test`, `test:watch` y composición de `preflight`.

## Arquitectura y alcance

Vitest ejecuta reglas puras y componentes React en jsdom. React Testing Library
valida resultados visibles. Algunos tests importan módulos compartidos con Edge;
otros leen migraciones SQL con `readFileSync` para verificar un contrato
estático.

La suite no consulta Supabase remoto ni certifica RLS, Storage, migraciones
aplicadas, Auth real, Mercado Pago, WebGL, service workers o layout de navegador.
Esas superficies requieren su herramienta o entorno específico.

## Selección eficiente

```powershell
# Test conocido
npm test -- src/ruta/archivo.test.ts

# Tests conectados por imports estáticos
npm exec vitest -- related src/ruta/fuente.ts --run

# Desarrollo interactivo
npm run test:watch
```

- Preferir el test explícito cuando se conoce el contrato.
- `vitest related` sólo sigue el grafo de imports. Si una prueba abre SQL u otro
  archivo con `readFileSync`, invocarla explícitamente.
- Si no se encuentra ninguna prueba, no declarar cobertura: localizar la más
  cercana, crear el caso de regresión necesario o escalar la validación.
- Un test focalizado verde no certifica todo el repositorio.
- Toda corrección de regresión debe conservar un caso que falle sin el arreglo.
- Evitar snapshots extensos, mocks que reimplementen producción y fixtures con
  credenciales o datos personales.

## Validación

La matriz vinculante está en [AGENTS.md](../AGENTS.md): cambio localizado usa
pruebas relacionadas; cambio de dominio usa su suite explícita; acceso, dinero,
stock, privacidad, tooling, integración o release activan el checkpoint crítico.
`npm run preflight` ya ejecuta la suite completa, por lo que no debe precederse
con `npm test` completo salvo para aislar un fallo. `build` no es un gate de
pruebas y se ejecuta sólo por sus propios disparadores.

## Última revisión

2026-07-15. Actualizar al cambiar runner, setup, comandos, estrategia de
selección o alcance de integración.

# Mantenimiento de `contexto/`

## Propósito

Mantener fichas breves que permitan localizar contratos y fuentes reales sin releer todo el repositorio. Esta guía reemplaza el antiguo plan de creación por fases: el directorio ya existe y ahora se mantiene por dominio afectado.

## Jerarquía de fuentes

1. `docs/IDENTIDAD_PROYECTO.md` resuelve la identidad del repositorio y del backend objetivo.
2. `AGENTS.md` define seguridad, alcance y validación transversal.
3. Código, migraciones y configuración actuales prueban el comportamiento implementado.
4. La ficha de `contexto/` resume el contrato durable y dirige a esas fuentes.
5. Documentos marcados como históricos sólo explican antecedentes.

No afirmar estado remoto, datos productivos o despliegues vigentes sin verificarlos dentro del alcance autorizado de la tarea.

## Flujo para actualizar una ficha

1. Elegir el dominio desde `INDICE.md` y leer sólo la ficha y sus fuentes directas.
2. Comparar la afirmación que cambiará con el código, migración o configuración propietaria.
3. Actualizar el documento propietario. En otros archivos, reemplazar la duplicación por un enlace breve.
4. Separar con claridad contrato vigente, capacidad inactiva, riesgo pendiente e historia.
5. Revisar enlaces, rutas, secretos y el diff de documentación.

Crear una ficha nueva sólo cuando el dominio tenga fuentes y decisiones propias que se repitan en más de una tarea. No crear fichas para una incidencia puntual, una sesión, un commit o una fase de despliegue.

## Estructura recomendada

Cada ficha operativa debe contener, cuando aplique:

- propósito;
- fuentes de verdad y documento propietario;
- flujo o arquitectura actual;
- reglas, límites y pendientes explícitos;
- validación proporcional al cambio;
- riesgos frecuentes;
- mantenimiento y fecha de revisión.

No copiar secretos, IDs productivos, datos personales, salidas extensas, conteos volátiles de tests ni instrucciones transversales ya definidas en `AGENTS.md`.

## Validación documental

Para cambios exclusivos de `contexto/`:

```powershell
git diff --check -- contexto
npm run audit:encoding
npm run audit:secrets
```

Además, comprobar que los enlaces Markdown y las rutas nuevas existan. Estas validaciones no autorizan conexiones o escrituras remotas. No ejecutar tests de aplicación, `preflight` ni `build` cuando sólo cambió documentación.

Si la misma tarea también modifica código, SQL o configuración, seleccionar las pruebas por superficie y riesgo según `AGENTS.md`; la ficha no debe imponer gates globales adicionales.

## Mantenimiento

Actualizar esta guía cuando cambie la jerarquía documental, la plantilla o la ruta de validación para documentación. Mantener `INDICE.md` sincronizado con altas, consolidaciones y retiros.

Última revisión: 2026-07-15.

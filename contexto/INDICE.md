# Índice de contexto

Este índice dirige a la fuente mínima necesaria para cada tarea. No es un inventario de estados de producción ni una bitácora.

## Ruta de lectura

1. Leer `README.md` y `AGENTS.md` para identidad, límites y protocolo transversal.
2. Elegir aquí la ficha del dominio afectado; normalmente basta una ficha y sus fuentes directas.
3. Abrir documentación de `docs/` sólo cuando la ficha la señale como propietaria del detalle.
4. Consultar `coordinacion-de-agentes.md` únicamente si hay trabajo simultáneo. Su contenido es efímero y nunca reemplaza `git status` ni el código actual.

La evidencia histórica sirve para entender decisiones pasadas, no para repetir comandos, asumir despliegues vigentes ni validar una tarea actual.

## Aplicación y experiencia

| Ficha | Responde a |
| --- | --- |
| [aplicacion-y-rutas.md](aplicacion-y-rutas.md) | Arranque, router, layouts, páginas y carga lazy. |
| [autenticacion-y-roles.md](autenticacion-y-roles.md) | Sesión, perfiles, roles y rutas protegidas. |
| [catalogo-y-productos.md](catalogo-y-productos.md) | Descubrimiento público, visibilidad, filtros y paginación. |
| [operacion-vendedor.md](operacion-vendedor.md) | Alta y edición de productos, stock y operación del vendedor. |
| [operacion-admin.md](operacion-admin.md) | Capacidades y límites reales del panel administrativo. |
| [carrito-y-comprador.md](carrito-y-comprador.md) | Carrito autenticado y consultas del comprador. |
| [promociones-del-catalogo.md](promociones-del-catalogo.md) | Promociones administrables, reclamos y ubicación visual. |
| [visor-3d-y-medios.md](visor-3d-y-medios.md) | Medios de producto, carga manual de modelos y visor compartido. |
| [sistema-visual.md](sistema-visual.md) | Fuentes visuales, accesibilidad y QA responsive. |

## Backend, datos y servicios

| Ficha | Responde a |
| --- | --- |
| [supabase-esquema-y-migraciones.md](supabase-esquema-y-migraciones.md) | Migraciones aditivas, RLS, Storage, RPC y validación local. |
| [funciones-edge.md](funciones-edge.md) | Callers, autorización y dependencias de cada función Edge. |
| [analitica-interna.md](analitica-interna.md) | Contrato vigente de privacidad, captura, informes y retención. |
| [notificaciones-internas.md](notificaciones-internas.md) | Avisos de administración a vendedores y confirmaciones. |

## Operación y calidad

| Ficha | Responde a |
| --- | --- |
| [entornos-y-seguridad.md](entornos-y-seguridad.md) | Variables públicas, secretos, conexiones y auditorías por riesgo. |
| [despliegue-y-verificacion.md](despliegue-y-verificacion.md) | Evidencia local, Git, Netlify y backend como estados separados. |
| [checkout-y-pagos.md](checkout-y-pagos.md) | Estado del canal de pago, límites y activación controlada. |
| [pruebas-automatizadas.md](pruebas-automatizadas.md) | Cómo elegir pruebas relacionadas, explícitas o completas. |
| [modularidad.md](modularidad.md) | Límite bloqueante de tamaño y criterios de extracción. |
| [pwa-y-cache.md](pwa-y-cache.md) | Precache, caché en runtime y auditoría del service worker. |
| [Vocabulario técnico](../docs/DOMAIN_DECISIONS.md) | Fuente canónica para `artisan` y términos visibles; no se duplica en `contexto/`. |

## Mantenimiento e historia

| Ficha | Uso |
| --- | --- |
| [MANTENIMIENTO.md](MANTENIMIENTO.md) | Guía para crear o actualizar fichas sin duplicar contratos. |
| [analitica-historial.md](analitica-historial.md) | Resumen histórico de las fases 0–6; no es un runbook. |
| [coordinacion-de-agentes.md](coordinacion-de-agentes.md) | Propiedad temporal de archivos durante trabajo simultáneo. |

## Reglas de mantenimiento

- Una decisión tiene un solo documento propietario; las demás fichas la enlazan.
- No guardar conteos de tests, hashes, versiones de deploy ni estados remotos como si fueran contratos duraderos.
- Si una capacidad no está activa o no fue verificada en el entorno objetivo, describirla como pendiente o no certificada.
- Actualizar este índice al agregar, renombrar, consolidar o retirar una ficha.
- Para un cambio exclusivo de documentación, revisar enlaces y ejecutar sólo los controles documentales indicados en `MANTENIMIENTO.md`; no corresponde ejecutar la suite de aplicación ni construir el frontend.

Última revisión: 2026-07-15.

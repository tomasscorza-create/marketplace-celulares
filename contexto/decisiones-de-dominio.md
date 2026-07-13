# Decisiones de Dominio (Legacy Vocabulary)

## Propósito
Proteger la integridad absoluta del repositorio, advirtiendo a desarrolladores e inteligencias artificiales sobre decisiones vigentes inmutables relacionadas al vocabulario de la arquitectura subyacente.

## Fuentes de verdad
- `docs/DOMAIN_DECISIONS.md`: Documento fundamental de nomenclatura y razones de legado.
- Todo el documento maestro de reglas `AGENTS.md`.

## Flujo o arquitectura
El código fue originalmente construido bajo un dominio donde el vendedor era llamado literalmente `artisan` (Artesano). El producto ha evolucionado y hoy apunta a ser un marketplace más amplio, refiriéndose al perfil como `Vendedor / Tienda`. 

Para evitar una migración masiva y altamente destructiva en la base de datos de producción y el router de frontend, se optó intencionalmente por mantener un modelo híbrido.

## Reglas y decisiones vigentes
- **Frontend / UI Neutral**: En textos renderizados, botones o etiquetas mostradas al usuario humano se debe usar vocabulario neutral (`Vendedor`, `Comprador`, `Tienda`).
- **Backend / Código Intocable**: Todo elemento técnico debe mantener el vocablo inglés `artisan`. Esto es estricto para:
  - Rutas de frontend (ej. `/vendedor/:id` pero protegiendo la ruta `panel/vendedor` solo a roles `artisan`).
  - Rutas de carpetas React (`src/features/artisan`).
  - Nombres de columnas (`artisan_id`) y tablas de base de datos (`artisan_storefronts`).
  - Nombres de Buckets remotos (`artisan-profile-images`).

## Dependencias y límites externos
- Afecta absolutamente todas las consultas y migraciones SQL futuras, las cuales no pueden usar `seller_id` a menos que una migración lo renmbre.

## Validación
- Comandos: `npm run audit:branding` verifica que no se escapen nombres del marketplace pasado (marcas), garantizando la neutralidad solicitada.

## Riesgos y errores frecuentes
- **RIESGO CRÍTICO**: Que un Agente IA, durante una refactorización de código limpia, haga un *Search and Replace* masivo para traducir `artisan` por `seller`. Esto desencadenará en la ruptura instantánea del RLS de Supabase, las llamadas a Storage, los componentes de enrutamiento y la tabla entera de perfiles. ¡Jamás debe hacerse!

## Mantenimiento
Esta ficha solo deberá desaparecer el día que se ejecute la fase de reconstrucción limpia del schema SQL, que involucre migraciones pesadas con `ALTER TABLE` renombrando todo el dominio de forma planificada.

# Visor 3D y Medios

## Propósito
Definir cómo se guardan y renderizan en frontend los elementos multimedia pesados, especialmente los archivos de modelos 3D interactivos (`.glb`/`.gltf`).

## Fuentes de verdad
- `docs/PRODUCT_3D_PREVIEW.md`: Reglas originales, límites de la tecnología y formato esperado de guardado JSON.
- `src/features/public/components/ProductModel3DViewer.tsx`: Componente de React que implementa la cámara de WebGL (Three.js).
- `src/features/public/components/CatalogProduct3DPreviewSlot.tsx`: Contenedor "fallback" que decide si inyectar 3D dinámicamente o quedarse con la foto plana.

## Flujo o arquitectura
La plataforma permite no sólo exhibir fotos, sino Modelos 3D interactivos.
1. La tabla `products` guarda los metadatos de archivos en un campo JSONB llamado `product_media`.
2. El catálogo detecta en tiempo de ejecución si el ítem tiene `type: "model_3d"`.
3. Si lo tiene, y **sólo cuando** entra al área visible de la pantalla (viewport), se descarga la librería 3D pesada (Three.js) de forma dinámica (`lazy`) y se inicializa el modelo `.glb`.
4. Si no tiene 3D o carga lento, se usa una imagen estática (`poster_url`) como esqueleto CSS.

## Reglas y decisiones vigentes
- **Carga Diferida Estricta**: Está prohibido empaquetar librerías de 3D en el *bundle* inicial principal de React, para no ralentizar el inicio del sitio en móviles.
- **Fallback obligatorio**: Todo modelo 3D debe venir siempre acompañado de una imagen de pre-visualización estática (`poster_url`).
- **Formato recomendado**: El formato estándar en los buckets de almacenamiento será `.glb` de poco peso (ideal < 3MB).

## Dependencias y límites externos
- **Three.js** y **React Three Fiber**: Motores WebGL subyacentes encargados de las luces, texturas y rotaciones de cámara.

## Validación
- Manual: Subir un `.glb` pequeño desde el editor de productos y comprobar en el catálogo público que se inicializa un visualizador arrastrable.

## Riesgos y errores frecuentes
- Desarmar la envoltura asíncrona (`Suspense` o import dinámico) de Three.js. Al hacerlo, todos los usuarios descargarían ~1MB extra de JS aunque los productos no tengan soporte 3D, derrumbando el score de rendimiento (Lighthouse).
- Asumir mal el formato JSON del array de medios, lo que provoca que React rompa la vista de catálogo.

## Mantenimiento
Actualizar si la dependencia a Three.js se sustituye por etiquetas nativas modernas (ej. `<model-viewer>` de Google) o si se agregan proyecciones AR nativas (Realidad Aumentada) a futuro.

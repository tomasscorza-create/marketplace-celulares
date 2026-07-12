# Product 3D Preview Plan

This document tracks the staged introduction of product 3D previews in the
catalog. The goal is to prepare the UI for 3D without making the marketplace
heavy or coupling catalog cards to a rendering engine too early.

## Current phase

The catalog now has a real 3D-ready preview slot:

- Component: `src/features/public/components/CatalogProduct3DPreviewSlot.tsx`
- Viewer: `src/features/public/components/ProductModel3DViewer.tsx`
- Integration point: `src/features/public/components/CatalogProductShowcase.tsx`
- Backend impact: uses the existing `products.product_media` JSONB field
- Runtime impact: Three.js is imported lazily only when a product has a 3D model

The slot is a square preview area under the featured product card. Image-only
products keep a lightweight CSS fallback. Products with a `model_3d` media item
load an interactive `.glb`/`.gltf` viewer when the slot enters the viewport.

The viewer supports layered behavior:

- Desktop/full mode: rotate by dragging, zoom buttons, wheel/pinch zoom, reset,
  and auto-rotation pause/resume.
- Lite mode: lower renderer pixel ratio, no initial auto-rotation, compact
  controls.
- Models are still lazy-loaded; image-only catalog cards do not load Three.js.

## Product media contract

Images can keep the existing legacy shape. A 3D model should be stored inside
`product_media` like this:

```json
{
  "type": "model_3d",
  "url": "https://example.com/product/model.glb",
  "poster_url": "https://example.com/product/poster.webp",
  "thumbnail_url": "https://example.com/product/thumb.webp",
  "format": "glb",
  "size_bytes": 1250000,
  "description": "Modelo 3D del producto"
}
```

Rules:

- `type: "model_3d"` is the preferred signal.
- `.glb` and `.gltf` URLs are also detected as models for compatibility.
- `poster_url` is optional but recommended.
- Product cards and image carousels ignore 3D media and only use image media.

## Future phases

1. Admin workflow
   - Current phase accepts existing `.glb` and `.gltf` files up to 8 MB from
     the product form.
   - Current storage path uses the product media bucket under `models/`.
   - Next step: add poster selection/crop and stricter storage bucket policies.

2. Storage policy
   - Use a dedicated bucket or clear folder convention for 3D assets.
   - Keep public read access explicit and separate from private admin writes.

3. Performance rules
   - Recommended model format: `.glb`.
   - Good target size: 500 KB to 2 MB.
   - Acceptable upper range: 2 MB to 5 MB.
   - Avoid loading multiple 3D models in the product grid.

4. Creation from photos without AI
   - Keep this as a separate tool flow, not part of the catalog render path.
   - Prefer photogrammetry/local or free-service pipelines that export `.glb`.
   - Require progress states, file-size validation, manual review, and a poster
     image before publishing.

## Guardrails

- Do not load 3D models for every catalog card.
- Do not bundle the 3D engine into the initial catalog path.
- Do not connect this feature to a remote backend without the database safety
  checklist in `docs/DB_SAFETY.md`.
- Keep the catalog usable when a model is missing, slow, or unsupported.

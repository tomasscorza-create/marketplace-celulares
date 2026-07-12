# `src/lib`

Utilidades transversales del proyecto. **Sin lógica de UI**, sin imports de
React, sin imports de features. Cualquier cosa que viva acá debe poder
usarse desde un componente, un hook, un client de fetching, o un test.

## Mapa actual

```
lib/
├── browser/                Helpers que tocan APIs de navegador (localStorage, etc.)
│   ├── catalogActivity.ts          Trackeo de actividad reciente del visitante
│   ├── catalogViewerSeed.ts        Seed estable por visitante para ranking
│   └── productDraftStorage.ts      Persistencia de drafts de producto en localStorage
│
├── forms/                  Helpers para forms
│   ├── fieldStyles.ts              Clases Tailwind reutilizadas en inputs
│   └── validation.ts               Validaciones puras (email, password, etc.)
│
├── pwa/
│   └── registerServiceWorker.ts    Registro del SW para PWA
│
├── query/                  Setup de TanStack Query
│   ├── AppQueryProvider.tsx        Provider raíz
│   ├── queryClient.ts              Instancia + defaults globales
│   └── queryKeys.ts                Factory tipada de queryKeys (única fuente de verdad)
│
├── supabase/
│   └── client.ts                   Cliente Supabase singleton + getter con guard
│
├── compressImage.ts        Compresión / crop / resize de imágenes (canvas)
├── errors.ts               getErrorMessage(unknown, fallback) — normalización
└── format.ts               formatPrice / formatCurrency / formatDate / etc.
```

## Convenciones

1. **Cada utilidad tiene un archivo propio** o vive en una carpeta temática
   (`browser/`, `forms/`). Evitar `utils.ts` cajón-de-sastre.
2. **Funciones puras siempre que se pueda.** Lo que toca DOM/storage va en
   `browser/`. Lo que toca red va en `features/<x>/<x>Client.ts`, no acá.
3. **Sin imports de `../features/...` ni de componentes.** `lib/` es la capa
   más baja del árbol de dependencias.
4. **Documentar con JSDoc** los exports públicos. Si se usa en >2 archivos,
   merece al menos un `@example`.

## Migración hacia estos helpers

Estos archivos se introdujeron en la **Fase 1** del plan de mantenibilidad.
NO migrar usos viejos masivamente — incorporar gradualmente desde código
nuevo y aprovechar pasadas a archivos que estés tocando por otro motivo.

Sitios donde la migración aporta más:

- **`format.ts`**: ~20 sitios con `Number(x).toLocaleString("es-AR", ...)`.
  Buscar con `grep -rn "toLocaleString.*es-AR" src/`.
- **`errors.ts`**: ~9 sitios con `error instanceof Error ? error.message : ...`
  + 2 implementaciones locales en `publicQueries.ts` y `cartQueries.ts`.
  Buscar con `grep -rn "instanceof Error" src/`.

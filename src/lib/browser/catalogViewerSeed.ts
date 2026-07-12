const CATALOG_VIEWER_SEED_KEY = "catalog-viewer-seed";

type CatalogViewerSeedScope = "feed" | "groups" | "storefronts";

const CATALOG_VIEWER_ROTATION_MINUTES: Record<CatalogViewerSeedScope, number> = {
  feed: 6,
  groups: 14,
  storefronts: 12,
};

const catalogPageLoadSeeds: Partial<Record<CatalogViewerSeedScope, string>> = {};

function createSeed() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `viewer-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function getStoredBaseSeed() {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return null;
  }

  const storedSeed = window.localStorage.getItem(CATALOG_VIEWER_SEED_KEY);

  if (!storedSeed) {
    return null;
  }

  return storedSeed.split(":")[0] ?? null;
}

function getCatalogRotationBucket(scope: CatalogViewerSeedScope) {
  const rotationMinutes = CATALOG_VIEWER_ROTATION_MINUTES[scope];
  const rotationWindowMs = rotationMinutes * 60 * 1000;

  return Math.floor(Date.now() / rotationWindowMs);
}

export function getCatalogViewerSeed(scope: CatalogViewerSeedScope = "feed") {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return `server-viewer:${scope}`;
  }

  const existingSeed = getStoredBaseSeed();
  const pageLoadSeed =
    scope === "feed"
      ? (catalogPageLoadSeeds.feed ??= createSeed())
      : null;

  if (existingSeed) {
    return [existingSeed, scope, getCatalogRotationBucket(scope), pageLoadSeed]
      .filter(Boolean)
      .join(":");
  }

  const nextSeed = createSeed();
  window.localStorage.setItem(CATALOG_VIEWER_SEED_KEY, nextSeed);

  return [nextSeed, scope, getCatalogRotationBucket(scope), pageLoadSeed].filter(Boolean).join(":");
}

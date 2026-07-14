import { getSupabaseClient, hasSupabaseEnv } from "../supabase/client";
import { isAnalyticsTrackingAllowed } from "../../features/analytics/analyticsClient";

type CatalogActivityState = {
  recentArtisanIds: string[];
  recentCategoryIds: string[];
  recentProductIds: string[];
  recentSearches: string[];
};

const STORAGE_KEY = "catalog_activity_state";

const initialState: CatalogActivityState = {
  recentArtisanIds: [],
  recentCategoryIds: [],
  recentProductIds: [],
  recentSearches: [],
};

function isBrowserAvailable() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function dedupeWithLimit(values: string[], limit: number) {
  return Array.from(new Set(values.filter(Boolean))).slice(0, limit);
}

function mergeCatalogActivityState(
  baseValue: CatalogActivityState,
  nextValue: Partial<CatalogActivityState>,
): CatalogActivityState {
  return {
    recentArtisanIds: dedupeWithLimit(
      [...(nextValue.recentArtisanIds ?? []), ...baseValue.recentArtisanIds],
      6,
    ),
    recentCategoryIds: dedupeWithLimit(
      [...(nextValue.recentCategoryIds ?? []), ...baseValue.recentCategoryIds],
      6,
    ),
    recentProductIds: dedupeWithLimit(
      [...(nextValue.recentProductIds ?? []), ...baseValue.recentProductIds],
      12,
    ),
    recentSearches: dedupeWithLimit(
      [...(nextValue.recentSearches ?? []), ...baseValue.recentSearches],
      6,
    ),
  };
}

export function getCatalogActivityState(): CatalogActivityState {
  if (!isBrowserAvailable() || !isAnalyticsTrackingAllowed()) {
    return initialState;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return initialState;
    }

    const parsed = JSON.parse(rawValue) as Partial<CatalogActivityState>;
    return {
      recentArtisanIds: Array.isArray(parsed.recentArtisanIds) ? parsed.recentArtisanIds : [],
      recentCategoryIds: Array.isArray(parsed.recentCategoryIds) ? parsed.recentCategoryIds : [],
      recentProductIds: Array.isArray(parsed.recentProductIds) ? parsed.recentProductIds : [],
      recentSearches: Array.isArray(parsed.recentSearches) ? parsed.recentSearches : [],
    };
  } catch {
    return initialState;
  }
}

export function clearCatalogActivityState() {
  if (!isBrowserAvailable()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Privacy cleanup remains best-effort when storage is blocked.
  }
}

function saveCatalogActivityState(nextValue: CatalogActivityState) {
  if (!isBrowserAvailable()) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextValue));
  } catch {
    // Ignore storage errors; personalization is optional.
  }
}

function sanitizeSearchTerm(search: string) {
  return search.trim().replace(/\s+/g, " ").slice(0, 80);
}

export async function loadCatalogActivityStateFromAccount() {
  if (!isAnalyticsTrackingAllowed()) {
    clearCatalogActivityState();
    return initialState;
  }
  const currentValue = getCatalogActivityState();

  if (!hasSupabaseEnv || !isBrowserAvailable()) {
    return currentValue;
  }

  try {
    const client = getSupabaseClient();
    const { data } = await client.auth.getSession();

    if (!data.session?.user) {
      return currentValue;
    }

    const response = await client.rpc("get_catalog_activity_state_v1");

    if (response.error) {
      return currentValue;
    }

    const [remoteState] = (response.data ?? []) as Array<Partial<CatalogActivityState>>;

    if (!remoteState) {
      return currentValue;
    }

    const mergedValue = mergeCatalogActivityState(currentValue, remoteState);
    saveCatalogActivityState(mergedValue);
    return mergedValue;
  } catch {
    return currentValue;
  }
}

async function syncCatalogActivityToAccount(input: {
  artisanId?: string;
  categoryId?: string;
  productId?: string;
  searchTerm?: string;
}) {
  if (!hasSupabaseEnv || !isBrowserAvailable() || !isAnalyticsTrackingAllowed()) {
    return;
  }

  try {
    const client = getSupabaseClient();
    const { data } = await client.auth.getSession();

    if (!data.session?.user) {
      return;
    }

    await client.rpc("record_catalog_activity_event_v1", {
      requested_artisan_id: input.artisanId ?? null,
      requested_category_id: input.categoryId ?? null,
      requested_product_id: input.productId ?? null,
      requested_search_term: input.searchTerm ? sanitizeSearchTerm(input.searchTerm) : null,
    });
  } catch {
    // Ignore remote sync errors; local personalization remains available.
  }
}

export function trackCatalogSearch(search: string) {
  // The analytics module counts the action without retaining the free-text query.
  // Keep this function for callers that also refresh catalog personalization.
  void search;
}

export function trackCatalogCategory(categoryId: string | null | undefined) {
  if (!isAnalyticsTrackingAllowed()) return;
  if (!categoryId) {
    return;
  }

  const currentValue = getCatalogActivityState();
  saveCatalogActivityState(
    mergeCatalogActivityState(currentValue, {
      recentCategoryIds: [categoryId],
    }),
  );
  void syncCatalogActivityToAccount({
    categoryId,
  });
}

export function trackCatalogProductView(input: {
  artisanId: string;
  categoryId: string;
  productId: string;
}) {
  if (!isAnalyticsTrackingAllowed()) return;
  const currentValue = getCatalogActivityState();
  saveCatalogActivityState(
    mergeCatalogActivityState(currentValue, {
      recentArtisanIds: [input.artisanId],
      recentCategoryIds: [input.categoryId],
      recentProductIds: [input.productId],
    }),
  );
  void syncCatalogActivityToAccount({
    artisanId: input.artisanId,
    categoryId: input.categoryId,
    productId: input.productId,
  });
}

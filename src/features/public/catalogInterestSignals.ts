import { getBuyerPersonalizationSignals } from "../buyer/buyerClient";
import { getCatalogActivityState } from "../../lib/browser/catalogActivity";
import { getSupabaseClient } from "../../lib/supabase/client";

const ACCOUNT_INTEREST_SIGNALS_TTL_MS = 30 * 1000;
const MAX_SIGNAL_ARTISANS = 6;
const MAX_SIGNAL_CATEGORIES = 6;
const MAX_SIGNAL_PRODUCTS = 12;
const MAX_SIGNAL_SEARCHES = 6;

type PublicCatalogActivityRow = {
  recent_artisan_ids?: string[] | null;
  recent_category_ids?: string[] | null;
  recent_product_ids?: string[] | null;
  recent_searches?: string[] | null;
};

export type CatalogInterestSignals = {
  recentArtisanIds: string[];
  recentCategoryIds: string[];
  recentProductIds: string[];
  recentSearches: string[];
};

let cachedAccountInterestSignals: CatalogInterestSignals | null = null;
let cachedAccountInterestSignalsAt = 0;
let cachedAccountInterestSignalsUserId: string | null = null;
let cachedAccountInterestSignalsPromise: Promise<CatalogInterestSignals | null> | null = null;
let cachedAccountInterestSignalsPromiseUserId: string | null = null;

export function sanitizePublicSearch(search: string | null | undefined) {
  return (search ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/,/g, " ")
    .replace(/[()]/g, "")
    .slice(0, 80);
}

function dedupeSignalValues(
  values: Array<string | null | undefined>,
  limit: number,
) {
  const seenValues = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalizedValue = value?.trim();

    if (!normalizedValue || seenValues.has(normalizedValue)) {
      continue;
    }

    seenValues.add(normalizedValue);
    result.push(normalizedValue);

    if (result.length >= limit) {
      break;
    }
  }

  return result;
}

function normalizeSignalIds(values: Array<string | null | undefined>, limit: number) {
  return dedupeSignalValues(values, limit);
}

function normalizeSignalSearches(values: Array<string | null | undefined>, limit: number) {
  return dedupeSignalValues(
    values.map((value) => sanitizePublicSearch(value)).filter(Boolean),
    limit,
  );
}

function normalizeCatalogInterestSignals(
  signals: Partial<CatalogInterestSignals> | null | undefined,
): CatalogInterestSignals {
  return {
    recentArtisanIds: normalizeSignalIds(
      signals?.recentArtisanIds ?? [],
      MAX_SIGNAL_ARTISANS,
    ),
    recentCategoryIds: normalizeSignalIds(
      signals?.recentCategoryIds ?? [],
      MAX_SIGNAL_CATEGORIES,
    ),
    recentProductIds: normalizeSignalIds(
      signals?.recentProductIds ?? [],
      MAX_SIGNAL_PRODUCTS,
    ),
    recentSearches: normalizeSignalSearches(
      signals?.recentSearches ?? [],
      MAX_SIGNAL_SEARCHES,
    ),
  } satisfies CatalogInterestSignals;
}

function mergeCatalogInterestSignals(
  ...signals: Array<Partial<CatalogInterestSignals> | null | undefined>
) {
  return normalizeCatalogInterestSignals({
    recentArtisanIds: signals.flatMap((signal) => signal?.recentArtisanIds ?? []),
    recentCategoryIds: signals.flatMap((signal) => signal?.recentCategoryIds ?? []),
    recentProductIds: signals.flatMap((signal) => signal?.recentProductIds ?? []),
    recentSearches: signals.flatMap((signal) => signal?.recentSearches ?? []),
  });
}

export function areCatalogInterestSignalsEqual(
  leftSignals: CatalogInterestSignals,
  rightSignals: CatalogInterestSignals,
) {
  return (
    leftSignals.recentArtisanIds.join("|") === rightSignals.recentArtisanIds.join("|") &&
    leftSignals.recentCategoryIds.join("|") === rightSignals.recentCategoryIds.join("|") &&
    leftSignals.recentProductIds.join("|") === rightSignals.recentProductIds.join("|") &&
    leftSignals.recentSearches.join("|") === rightSignals.recentSearches.join("|")
  );
}

function getCatalogInterestSignals() {
  const activityState = getCatalogActivityState();

  return normalizeCatalogInterestSignals({
    recentArtisanIds: activityState.recentArtisanIds,
    recentCategoryIds: activityState.recentCategoryIds,
    recentProductIds: activityState.recentProductIds,
    recentSearches: activityState.recentSearches,
  });
}

async function getCatalogAccountInterestSignals() {
  const client = getSupabaseClient();
  const { data } = await client.auth.getSession();
  const userId = data.session?.user?.id ?? null;

  if (!userId) {
    cachedAccountInterestSignals = null;
    cachedAccountInterestSignalsAt = 0;
    cachedAccountInterestSignalsUserId = null;
    cachedAccountInterestSignalsPromise = null;
    cachedAccountInterestSignalsPromiseUserId = null;
    return null;
  }

  if (
    cachedAccountInterestSignals &&
    cachedAccountInterestSignalsUserId === userId &&
    Date.now() - cachedAccountInterestSignalsAt < ACCOUNT_INTEREST_SIGNALS_TTL_MS
  ) {
    return cachedAccountInterestSignals;
  }

  if (
    cachedAccountInterestSignalsPromise &&
    cachedAccountInterestSignalsPromiseUserId === userId
  ) {
    return cachedAccountInterestSignalsPromise;
  }

  const request = (async () => {
    const [response, buyerSignals] = await Promise.all([
      client.rpc("get_catalog_activity_state_v1"),
      getBuyerPersonalizationSignals(userId),
    ]);

    if (response.error) {
      cachedAccountInterestSignals = normalizeCatalogInterestSignals(buyerSignals);
      cachedAccountInterestSignalsAt = Date.now();
      cachedAccountInterestSignalsUserId = userId;
      return cachedAccountInterestSignals;
    }

    const [row] = (response.data ?? []) as PublicCatalogActivityRow[];

    cachedAccountInterestSignals = row
      ? mergeCatalogInterestSignals(
          {
            recentArtisanIds: row.recent_artisan_ids ?? [],
            recentCategoryIds: row.recent_category_ids ?? [],
            recentProductIds: row.recent_product_ids ?? [],
            recentSearches: row.recent_searches ?? [],
          },
          buyerSignals,
        )
      : normalizeCatalogInterestSignals(buyerSignals);
    cachedAccountInterestSignalsAt = Date.now();
    cachedAccountInterestSignalsUserId = userId;

    return cachedAccountInterestSignals;
  })().finally(() => {
    if (cachedAccountInterestSignalsPromiseUserId === userId) {
      cachedAccountInterestSignalsPromise = null;
      cachedAccountInterestSignalsPromiseUserId = null;
    }
  });

  cachedAccountInterestSignalsPromise = request;
  cachedAccountInterestSignalsPromiseUserId = userId;
  return request;
}

export async function getMergedCatalogInterestSignals() {
  const localSignals = getCatalogInterestSignals();
  const accountSignals = await getCatalogAccountInterestSignals();

  if (!accountSignals) {
    return localSignals;
  }

  return mergeCatalogInterestSignals(localSignals, accountSignals);
}

import type {
  PublicArtisanStorefront,
  PublicBuyerProfile,
  PublicCatalogFeedItem,
  PublicCatalogProductFeedPage,
  PublicCatalogSortOrder,
  PublicCatalogStorefrontGroup,
  PublicCatalogStorefrontGroupsPage,
  PublicCatalogStorefrontSuggestions,
  PublicCategory,
  PublicProduct,
  PublicStorefrontsPage,
} from "../../types/public";

import { getCatalogActivityState } from "../../lib/browser/catalogActivity";
import { getCatalogViewerSeed } from "../../lib/browser/catalogViewerSeed";
import {
  dedupeSemanticTerms,
  getStorefrontReferenceSimilarityScore,
  getStorefrontRelevanceScore,
} from "../../lib/discovery/semanticRelevance";
import { getSupabaseClient } from "../../lib/supabase/client";
import { rotateCatalogItems } from "./catalogPageUtils";
import { getMergedCatalogInterestSignals, sanitizePublicSearch } from "./catalogInterestSignals";

const storefrontSelection =
  "id, full_name, store_name, store_description, profile_image_url, storefront_theme_color, created_at";
const categorySelection = "id, name, slug";
const productSelection =
  "id, artisan_id, category_id, title, description, price, image_url, image_urls, product_media, product_attributes, category_spec_values, is_active, availability_mode, stock_quantity, lead_time_days, made_to_order_options, created_at, categories(name)";
const hydratedCatalogProductsCache = new Map<string, PublicProduct>();
const hydratedCatalogStorefrontsCache = new Map<string, PublicArtisanStorefront>();
const hydratedCatalogStorefrontsRequestsCache = new Map<string, Promise<void>>();
const HYDRATED_CATALOG_PRODUCTS_CACHE_LIMIT = 200;
const HYDRATED_CATALOG_STOREFRONTS_CACHE_LIMIT = 100;
let preferredCatalogFeedStrategy: "v5" | "fallback" | null = null;
let preferredStorefrontGroupsStrategy: "v6" | "fallback" | null = null;
let preferredStorefrontSuggestionsStrategy: "v2" | "fallback" | null = null;
let preferredCompleteStorefrontGroupsStrategy: "v6" | "fallback" | null = null;

type PublicCatalogStorefrontGroupRow = {
  artisan_full_name: string;
  matching_products_count: number;
  products: PublicProduct[] | null;
  profile_image_url: string | null;
  storefront_description: string | null;
  storefront_id: string;
  storefront_name: string | null;
  storefront_theme_color: string | null;
  total_storefronts_count: number;
};

type PublicCatalogStorefrontSuggestionRow = {
  artisan_full_name: string;
  matching_products_count: number;
  profile_image_url: string | null;
  section_name: "discovery" | "featured";
  storefront_description: string | null;
  storefront_id: string;
  storefront_name: string | null;
  storefront_theme_color: string | null;
};

type PublicCatalogProductFeedRow = PublicProduct & {
  total_products_count: number;
};

type PublicBuyerProfileRow = {
  bio_source?: "buyer_profile_bio" | "store_description" | null;
  created_at: string;
  full_name: string;
  id: string;
  last_order_at: string | null;
  orders_count: number | null;
  profile_bio: string | null;
  profile_image_url: string | null;
};

function buildPreferredStrategyOrder<T extends string>(
  preferred: T | null,
  defaults: readonly T[],
) {
  if (!preferred || !defaults.includes(preferred)) {
    return [...defaults];
  }

  return [preferred, ...defaults.filter((strategy) => strategy !== preferred)];
}

function shouldFallbackToLegacyCatalogRpc(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  return (
    error.code === "PGRST202" ||
    error.message?.includes("get_public_catalog_storefront_groups_v6") === true ||
    error.message?.includes("get_public_catalog_storefront_groups") === true
  );
}

function shouldFallbackToCatalogFeedRpc(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  return (
    error.code === "PGRST202" ||
    error.message?.includes("get_public_catalog_product_feed_v5") === true
  );
}

function shouldFallbackToStorefrontSuggestionsRpc(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  return (
    error.code === "PGRST202" ||
    error.message?.includes("get_public_catalog_storefront_suggestions_v2") === true
  );
}

function shouldFallbackToCompleteStorefrontGroupsRpc(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  return (
    error.code === "PGRST202" ||
    error.message?.includes("get_public_catalog_storefront_groups_v6") === true
  );
}

function rememberCacheEntry<T>(cache: Map<string, T>, key: string, value: T, limit: number) {
  cache.delete(key);
  cache.set(key, value);

  while (cache.size > limit) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) {
      return;
    }
    cache.delete(oldestKey);
  }
}

function rememberPublicProducts(products: PublicProduct[]) {
  products.forEach((product) => {
    rememberCacheEntry(
      hydratedCatalogProductsCache,
      product.id,
      product,
      HYDRATED_CATALOG_PRODUCTS_CACHE_LIMIT,
    );
  });
}

function rememberPublicStorefronts(storefronts: PublicArtisanStorefront[]) {
  storefronts.forEach((storefront) => {
    rememberCacheEntry(
      hydratedCatalogStorefrontsCache,
      storefront.id,
      storefront,
      HYDRATED_CATALOG_STOREFRONTS_CACHE_LIMIT,
    );
  });
}

export function clearHydratedCatalogCaches() {
  hydratedCatalogProductsCache.clear();
  hydratedCatalogStorefrontsCache.clear();
  hydratedCatalogStorefrontsRequestsCache.clear();
}

export function getCachedPublicProduct(productId: string) {
  return hydratedCatalogProductsCache.get(productId) ?? null;
}

async function loadMissingHydratedCatalogStorefronts(storefrontIds: string[]) {
  const pendingStorefronts = storefrontIds.filter(
    (storefrontId) => !hydratedCatalogStorefrontsCache.has(storefrontId),
  );

  if (pendingStorefronts.length === 0) {
    return;
  }

  const cacheKey = pendingStorefronts.slice().sort().join(",");
  const cachedRequest = hydratedCatalogStorefrontsRequestsCache.get(cacheKey);

  if (cachedRequest) {
    await cachedRequest;
    return;
  }

  const request = (async () => {
    const storefrontsResponse = await getPublicStorefrontsByIds(pendingStorefronts);

    if (!storefrontsResponse.error && storefrontsResponse.data) {
      rememberPublicStorefronts(storefrontsResponse.data);
    }
  })().finally(() => {
    hydratedCatalogStorefrontsRequestsCache.delete(cacheKey);
  });

  hydratedCatalogStorefrontsRequestsCache.set(cacheKey, request);
  await request;
}

function mapCatalogStorefrontGroup(
  row: PublicCatalogStorefrontGroupRow,
): PublicCatalogStorefrontGroup {
  const latestProductCreatedAt =
    (row.products ?? [])
      .map((product) => product?.created_at ?? "")
      .sort((left, right) => right.localeCompare(left))[0] ?? "";

  return {
    matching_products_count: row.matching_products_count,
    products: row.products ?? [],
    storefront: {
      created_at: latestProductCreatedAt,
      full_name: row.artisan_full_name,
      id: row.storefront_id,
      profile_image_url: row.profile_image_url,
      store_description: row.storefront_description,
      store_name: row.storefront_name,
      storefront_theme_color: row.storefront_theme_color,
    },
  };
}

function mapStorefrontRow(row: {
  artisan_full_name: string;
  profile_image_url: string | null;
  storefront_description: string | null;
  storefront_id: string;
  storefront_name: string | null;
  storefront_theme_color: string | null;
}): PublicArtisanStorefront {
  return {
    created_at: "",
    full_name: row.artisan_full_name,
    id: row.storefront_id,
    profile_image_url: row.profile_image_url,
    store_description: row.storefront_description,
    store_name: row.storefront_name,
    storefront_theme_color: row.storefront_theme_color,
  };
}

function getFallbackFeaturedStorefrontScore(
  storefront: PublicArtisanStorefront,
  recentSearchTerms: string[],
  recentSignals: Awaited<ReturnType<typeof getMergedCatalogInterestSignals>>,
) {
  return (
    getStorefrontRelevanceScore(storefront, recentSignals) +
    getStorefrontReferenceSimilarityScore(storefront, recentSearchTerms)
  );
}

function getFallbackDiscoveryStorefrontScore(
  storefront: PublicArtisanStorefront,
  recentSearchTerms: string[],
  recentSignals: Awaited<ReturnType<typeof getMergedCatalogInterestSignals>>,
) {
  const noveltyBoost = recentSignals.recentArtisanIds.includes(storefront.id) ? -10 : 6;

  return (
    noveltyBoost +
    getStorefrontRelevanceScore(storefront, recentSignals) +
    Math.min(8, getStorefrontReferenceSimilarityScore(storefront, recentSearchTerms))
  );
}

async function mapProductsToCatalogFeedItems(products: PublicProduct[]): Promise<PublicCatalogFeedItem[]> {
  const storefrontIds = Array.from(new Set(products.map((product) => product.artisan_id)));

  if (storefrontIds.length > 0) {
    await loadMissingHydratedCatalogStorefronts(storefrontIds);
  }

  return products
    .map((product) => {
      const storefront = hydratedCatalogStorefrontsCache.get(product.artisan_id) ?? null;

      return {
        isBoosted:
          Boolean(product.catalog_boost_active) ||
          Number(storefront?.storefront_boost_multiplier ?? 1) > 1,
        product,
        storefront,
      };
    })
    .filter((item) => item.storefront !== null);
}

async function createCatalogFeedPageFromRows(rows: PublicCatalogProductFeedRow[]) {
  const products = rows.map(({ total_products_count: _ignoredTotal, ...product }) => product);
  rememberPublicProducts(products);

  return {
    items: await mapProductsToCatalogFeedItems(products),
    totalCount: rows[0]?.total_products_count ?? 0,
  } satisfies PublicCatalogProductFeedPage;
}

export async function getPublicArtisanStorefront(artisanId: string) {
  const client = getSupabaseClient();

  return client
    .from("artisan_storefronts")
    .select(storefrontSelection)
    .eq("id", artisanId)
    .single<PublicArtisanStorefront>();
}

export async function getPublicBuyerProfile(buyerId: string) {
  const client = getSupabaseClient();
  const response = await client.rpc("get_public_buyer_profile_v1", {
    requested_buyer_id: buyerId,
  });

  if (response.error) {
    return {
      data: null as PublicBuyerProfile | null,
      error: response.error,
    };
  }

  const [row] = (response.data ?? []) as PublicBuyerProfileRow[];

  if (!row) {
    return {
      data: null as PublicBuyerProfile | null,
      error: {
        message: "No pudimos cargar este perfil de comprador.",
      },
    };
  }

  return {
    data: {
      bio_source: row.bio_source ?? undefined,
      created_at: row.created_at,
      full_name: row.full_name,
      id: row.id,
      last_order_at: row.last_order_at,
      orders_count: Number(row.orders_count ?? 0),
      profile_bio: row.profile_bio,
      profile_image_url: row.profile_image_url,
    } satisfies PublicBuyerProfile,
    error: null,
  };
}

export async function getPublicStorefrontsPage(params: {
  limit: number;
  page: number;
  search?: string;
}) {
  const client = getSupabaseClient();
  const normalizedPage = Math.max(1, params.page);
  const from = (normalizedPage - 1) * params.limit;
  const to = from + params.limit - 1;
  const normalizedSearch = sanitizePublicSearch(params.search);

  let query = client
    .from("artisan_storefronts")
    .select(storefrontSelection, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (normalizedSearch) {
    const searchPattern = `%${normalizedSearch}%`;
    query = query.or(
      `store_name.ilike.${searchPattern},full_name.ilike.${searchPattern},store_description.ilike.${searchPattern}`,
    );
  }

  const response = await query.returns<PublicArtisanStorefront[]>();

  if (response.error) {
    return {
      data: null as PublicStorefrontsPage | null,
      error: response.error,
    };
  }

  return {
    data: {
      items: response.data ?? [],
      totalCount: response.count ?? 0,
    } satisfies PublicStorefrontsPage,
    error: null,
  };
}

export async function getPublicArtisanStorefronts(limit?: number) {
  const client = getSupabaseClient();

  let query = client
    .from("artisan_storefronts")
    .select(storefrontSelection)
    .order("created_at", { ascending: false });

  if (typeof limit === "number") {
    query = query.limit(limit);
  }

  return query.returns<PublicArtisanStorefront[]>();
}

export async function getPublicStorefrontsByIds(artisanIds: string[]) {
  const client = getSupabaseClient();

  if (artisanIds.length === 0) {
    return {
      data: [] as PublicArtisanStorefront[],
      error: null,
    };
  }

  return client
    .from("artisan_storefronts")
    .select(storefrontSelection)
    .in("id", artisanIds)
    .returns<PublicArtisanStorefront[]>();
}

export async function getPublicCategories() {
  const client = getSupabaseClient();

  return client
    .from("categories")
    .select(categorySelection)
    .eq("is_active", true)
    .order("name", { ascending: true })
    .returns<PublicCategory[]>();
}

export async function getPublicCatalogProductFeedPage(params: {
  categoryId?: string | null;
  limit: number;
  page: number;
  search?: string;
  sort: PublicCatalogSortOrder;
}) {
  const client = getSupabaseClient();
  const normalizedPage = Math.max(1, params.page);
  const normalizedSearch = sanitizePublicSearch(params.search);
  const interestSignals = await getMergedCatalogInterestSignals();
  const rpcParams = {
    requested_category_id: params.categoryId ?? null,
    requested_interest_artisan_ids:
      interestSignals.recentArtisanIds.length > 0 ? interestSignals.recentArtisanIds : null,
    requested_interest_category_ids:
      interestSignals.recentCategoryIds.length > 0 ? interestSignals.recentCategoryIds : null,
    requested_interest_product_ids:
      interestSignals.recentProductIds.length > 0 ? interestSignals.recentProductIds : null,
    requested_limit: params.limit,
    requested_page: normalizedPage,
    requested_recent_searches:
      interestSignals.recentSearches.length > 0 ? interestSignals.recentSearches : null,
    requested_search: normalizedSearch || null,
    requested_sort: params.sort,
    requested_viewer_seed: getCatalogViewerSeed("feed"),
  };
  const fallbackFeedQuery = async () => {
    const from = (normalizedPage - 1) * params.limit;
    const to = from + params.limit - 1;
    let fallbackQuery = client
      .from("products")
      .select(productSelection, { count: "exact" })
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (params.categoryId) {
      fallbackQuery = fallbackQuery.eq("category_id", params.categoryId);
    }

    if (normalizedSearch) {
      const searchPattern = `%${normalizedSearch}%`;
      const storefrontMatchesResponse = await client
        .from("artisan_storefronts")
        .select("id")
        .or(
          `store_name.ilike.${searchPattern},full_name.ilike.${searchPattern},store_description.ilike.${searchPattern}`,
        )
        .returns<Array<{ id: string }>>();
      const storefrontIds = storefrontMatchesResponse.error
        ? []
        : (storefrontMatchesResponse.data?.map((row) => row.id).filter(Boolean) ?? []);
      const orConditions = [`title.ilike.${searchPattern}`, `description.ilike.${searchPattern}`];

      if (storefrontIds.length > 0) {
        orConditions.push(`artisan_id.in.(${storefrontIds.join(",")})`);
      }

      fallbackQuery = fallbackQuery.or(orConditions.join(","));
    }

    const fallbackResponse = await fallbackQuery.returns<PublicProduct[]>();

    if (fallbackResponse.error) {
      return {
        data: null as PublicCatalogProductFeedPage | null,
        error: fallbackResponse.error,
      };
    }

    const fallbackProducts = fallbackResponse.data ?? [];
    rememberPublicProducts(fallbackProducts);

    return {
      data: {
        items: await mapProductsToCatalogFeedItems(fallbackProducts),
        totalCount: fallbackResponse.count ?? 0,
      } satisfies PublicCatalogProductFeedPage,
      error: null,
    };
  };

  for (const strategy of buildPreferredStrategyOrder(preferredCatalogFeedStrategy, [
    "v5",
    "fallback",
  ] as const)) {
    if (strategy === "fallback") {
      const fallbackResult = await fallbackFeedQuery();

      if (!fallbackResult.error) {
        preferredCatalogFeedStrategy = "fallback";
      }

      return fallbackResult;
    }

    const response = await client.rpc("get_public_catalog_product_feed_v5", rpcParams);

    if (!response.error) {
      preferredCatalogFeedStrategy = strategy;

      return {
        data: await createCatalogFeedPageFromRows(
          (response.data ?? []) as PublicCatalogProductFeedRow[],
        ),
        error: null,
      };
    }

    if (!shouldFallbackToCatalogFeedRpc(response.error)) {
      return {
        data: null as PublicCatalogProductFeedPage | null,
        error: response.error,
      };
    }
  }

  return {
    data: null as PublicCatalogProductFeedPage | null,
    error: {
      message: "No pudimos cargar el feed principal del catalogo.",
    },
  };
}

export async function getPublicCatalogStorefrontGroupsPage(params: {
  categoryId?: string | null;
  limit: number;
  page: number;
  productsPerStorefront: number;
  search?: string;
}) {
  const client = getSupabaseClient();
  const normalizedPage = Math.max(1, params.page);
  const normalizedSearch = sanitizePublicSearch(params.search);
  const rpcParams = {
    requested_category_id: params.categoryId ?? null,
    requested_min_matching_products: 1,
    requested_page: normalizedPage,
    requested_products_per_storefront: params.productsPerStorefront,
    requested_search: normalizedSearch || null,
    requested_storefront_limit: params.limit,
    requested_viewer_seed: getCatalogViewerSeed("groups"),
  };

  for (const strategy of buildPreferredStrategyOrder(preferredStorefrontGroupsStrategy, [
    "v6",
    "fallback",
  ] as const)) {
    if (strategy === "fallback") {
      return {
        data: null as PublicCatalogStorefrontGroupsPage | null,
        error: {
          message: "No pudimos cargar las tiendas del catalogo.",
        },
      };
    }

    const response = await client.rpc("get_public_catalog_storefront_groups_v6", rpcParams);

    if (!response.error) {
      preferredStorefrontGroupsStrategy = strategy;
      const rawRows = (response.data ?? []) as PublicCatalogStorefrontGroupRow[];

      return {
        data: {
          items: rawRows.map(mapCatalogStorefrontGroup),
          totalCount: rawRows[0]?.total_storefronts_count ?? 0,
        } satisfies PublicCatalogStorefrontGroupsPage,
        error: null,
      };
    }

    if (!shouldFallbackToLegacyCatalogRpc(response.error)) {
      return {
        data: null as PublicCatalogStorefrontGroupsPage | null,
        error: response.error,
      };
    }
  }

  return {
    data: null as PublicCatalogStorefrontGroupsPage | null,
    error: {
      message: "No pudimos cargar las tiendas del catalogo.",
    },
  };
}

export async function getPublicCatalogStorefrontSuggestions(params: {
  categoryId?: string | null;
  discoveryLimit: number;
  featuredLimit: number;
  search?: string;
}) {
  const client = getSupabaseClient();
  const normalizedSearch = sanitizePublicSearch(params.search);
  const fallbackStorefrontSuggestions = async () => {
    const [interestSignalsResult, storefrontsResponseResult, storefrontGroupsResponseResult] =
      await Promise.allSettled([
      getMergedCatalogInterestSignals(),
      getPublicStorefrontsPage({
        limit: Math.max(params.featuredLimit + params.discoveryLimit + 4, 10),
        page: 1,
        search: normalizedSearch || undefined,
      }),
      getPublicCatalogStorefrontGroupsPage({
        categoryId: params.categoryId ?? null,
        limit: Math.max(params.featuredLimit + params.discoveryLimit, 6),
        page: 1,
        productsPerStorefront: 4,
        search: normalizedSearch || undefined,
      }),
      ]);
    const interestSignals =
      interestSignalsResult.status === "fulfilled"
        ? interestSignalsResult.value
        : getCatalogActivityState();
    const storefrontsResponse =
      storefrontsResponseResult.status === "fulfilled" ? storefrontsResponseResult.value : null;
    const storefrontGroupsResponse =
      storefrontGroupsResponseResult.status === "fulfilled"
        ? storefrontGroupsResponseResult.value
        : null;
    const storefrontCandidates = storefrontsResponse?.error
      ? []
      : (storefrontsResponse?.data?.items ?? []);
    const storefrontGroupCandidates = storefrontGroupsResponse?.error
      ? []
      : (storefrontGroupsResponse?.data?.items.map((group) => group.storefront) ?? []);

    const candidateStorefronts = [
      ...storefrontGroupCandidates,
      ...storefrontCandidates,
    ].filter(
      (storefront, index, currentValue) =>
        currentValue.findIndex((currentStorefront) => currentStorefront.id === storefront.id) ===
        index,
    );

    if (candidateStorefronts.length === 0) {
      return {
        data: null as PublicCatalogStorefrontSuggestions | null,
        error:
          storefrontsResponse?.error ??
          storefrontGroupsResponse?.error ?? {
            message: "No pudimos cargar sugerencias de tiendas en este momento.",
          },
      };
    }

    const recentSearchTerms = dedupeSemanticTerms(interestSignals.recentSearches, 18);
    const rotatedCandidateStorefronts = rotateCatalogItems(
      candidateStorefronts,
      getCatalogViewerSeed("storefronts"),
      "fallback-storefront-candidates",
    );

    const featuredStorefronts = rotatedCandidateStorefronts
      .slice()
      .sort((leftStorefront, rightStorefront) => {
        const leftScore = getFallbackFeaturedStorefrontScore(
          leftStorefront,
          recentSearchTerms,
          interestSignals,
        );
        const rightScore = getFallbackFeaturedStorefrontScore(
          rightStorefront,
          recentSearchTerms,
          interestSignals,
        );

        if (rightScore !== leftScore) {
          return rightScore - leftScore;
        }

        return rightStorefront.created_at.localeCompare(leftStorefront.created_at);
      })
      .slice(0, params.featuredLimit);

    const featuredIds = new Set(featuredStorefronts.map((storefront) => storefront.id));
    const discoveryStorefronts = rotatedCandidateStorefronts
      .filter((storefront) => !featuredIds.has(storefront.id))
      .sort((leftStorefront, rightStorefront) => {
        const leftScore = getFallbackDiscoveryStorefrontScore(
          leftStorefront,
          recentSearchTerms,
          interestSignals,
        );
        const rightScore = getFallbackDiscoveryStorefrontScore(
          rightStorefront,
          recentSearchTerms,
          interestSignals,
        );

        if (rightScore !== leftScore) {
          return rightScore - leftScore;
        }

        return rightStorefront.created_at.localeCompare(leftStorefront.created_at);
      })
      .slice(0, params.discoveryLimit);

    rememberPublicStorefronts([...featuredStorefronts, ...discoveryStorefronts]);

    return {
      data: {
        discoveryStorefronts,
        featuredStorefronts,
      } satisfies PublicCatalogStorefrontSuggestions,
      error: null,
    };
  };

  for (const strategy of buildPreferredStrategyOrder(preferredStorefrontSuggestionsStrategy, [
    "v2",
    "fallback",
  ] as const)) {
    if (strategy === "fallback") {
      const fallbackResult = await fallbackStorefrontSuggestions();

      if (!fallbackResult.error) {
        preferredStorefrontSuggestionsStrategy = "fallback";
      }

      return fallbackResult;
    }

    const rpcResponse = await client.rpc("get_public_catalog_storefront_suggestions_v2", {
      requested_category_id: params.categoryId ?? null,
      requested_discovery_limit: params.discoveryLimit,
      requested_featured_limit: params.featuredLimit,
      requested_search: normalizedSearch || null,
      requested_viewer_seed: getCatalogViewerSeed("storefronts"),
    });

    if (!rpcResponse.error) {
      preferredStorefrontSuggestionsStrategy = strategy;
      const rows = (rpcResponse.data ?? []) as PublicCatalogStorefrontSuggestionRow[];
      const featuredStorefronts = rows
        .filter((row) => row.section_name === "featured")
        .map(mapStorefrontRow)
        .slice(0, params.featuredLimit);
      const discoveryStorefronts = rows
        .filter((row) => row.section_name === "discovery")
        .map(mapStorefrontRow)
        .slice(0, params.discoveryLimit);

      rememberPublicStorefronts([...featuredStorefronts, ...discoveryStorefronts]);

      return {
        data: {
          discoveryStorefronts,
          featuredStorefronts,
        } satisfies PublicCatalogStorefrontSuggestions,
        error: null,
      };
    }

    if (!shouldFallbackToStorefrontSuggestionsRpc(rpcResponse.error)) {
      return {
        data: null as PublicCatalogStorefrontSuggestions | null,
        error: rpcResponse.error,
      };
    }
  }

  return {
    data: null as PublicCatalogStorefrontSuggestions | null,
    error: {
      message: "No pudimos cargar las sugerencias de tiendas.",
    },
  };
}

export async function getPublicCompleteCatalogStorefrontGroupsPage(params: {
  categoryId?: string | null;
  limit: number;
  page: number;
  productsPerStorefront: number;
  search?: string;
}) {
  const client = getSupabaseClient();
  const normalizedPage = Math.max(1, params.page);
  const normalizedSearch = sanitizePublicSearch(params.search);
  const fallbackCompleteGroups = async () => {
    const fallbackResponse = await getPublicCatalogStorefrontGroupsPage(params);

    if (fallbackResponse.error || !fallbackResponse.data) {
      return fallbackResponse;
    }

    const filteredItems = fallbackResponse.data.items
      .filter((group) => group.matching_products_count > 5)
      .slice(0, params.limit);

    return {
      data: {
        items: filteredItems,
        totalCount: filteredItems.length,
      } satisfies PublicCatalogStorefrontGroupsPage,
      error: null,
    };
  };

  for (const strategy of buildPreferredStrategyOrder(
    preferredCompleteStorefrontGroupsStrategy,
    ["v6", "fallback"] as const,
  )) {
    if (strategy === "fallback") {
      const fallbackResult = await fallbackCompleteGroups();

      if (!fallbackResult.error) {
        preferredCompleteStorefrontGroupsStrategy = "fallback";
      }

      return fallbackResult;
    }

    const rpcResponse = await client.rpc("get_public_catalog_storefront_groups_v6", {
      requested_category_id: params.categoryId ?? null,
      requested_min_matching_products: 6,
      requested_page: normalizedPage,
      requested_products_per_storefront: params.productsPerStorefront,
      requested_search: normalizedSearch || null,
      requested_storefront_limit: params.limit,
      requested_viewer_seed: getCatalogViewerSeed("groups"),
    });

    if (!rpcResponse.error) {
      preferredCompleteStorefrontGroupsStrategy = strategy;
      const rows = (rpcResponse.data ?? []) as PublicCatalogStorefrontGroupRow[];

      return {
        data: {
          items: rows.map(mapCatalogStorefrontGroup),
          totalCount: rows[0]?.total_storefronts_count ?? 0,
        } satisfies PublicCatalogStorefrontGroupsPage,
        error: null,
      };
    }

    if (!shouldFallbackToCompleteStorefrontGroupsRpc(rpcResponse.error)) {
      return {
        data: null as PublicCatalogStorefrontGroupsPage | null,
        error: rpcResponse.error,
      };
    }
  }

  return {
    data: null as PublicCatalogStorefrontGroupsPage | null,
    error: {
      message: "No pudimos cargar las tiendas completas del catalogo.",
    },
  };
}

export async function getPublicProductById(productId: string) {
  const client = getSupabaseClient();

  const response = await client
    .from("products")
    .select(productSelection)
    .eq("id", productId)
    .eq("is_active", true)
    .single<PublicProduct>();

  if (!response.error && response.data) {
    rememberPublicProducts([response.data]);
  }

  return response;
}

export async function getPublicArtisanProducts(artisanId: string) {
  const client = getSupabaseClient();

  const response = await client
    .from("products")
    .select(productSelection)
    .eq("artisan_id", artisanId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .returns<PublicProduct[]>();

  if (!response.error && response.data) {
    rememberPublicProducts(response.data);
  }

  return response;
}

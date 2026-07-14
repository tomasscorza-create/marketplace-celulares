import type { PublicCatalogFeedItem } from "../../types/public";
import { getPrimaryProductModel3D } from "../../types/productMedia";
import { getCatalogFeedItemRelevanceScore } from "../../lib/discovery/semanticRelevance";

export const CATALOG_FEED_PAGE_SIZE = 29;
const CATALOG_SHOWCASE_ITEM_COUNT = 5;
const CATALOG_PERSONALIZED_ITEM_COUNT = 6;
export const CATALOG_FEATURED_STOREFRONTS_LIMIT = 3;
export const CATALOG_DISCOVERY_STOREFRONTS_LIMIT = 4;
export const CATALOG_SECONDARY_GROUPS_LIMIT = 2;
export const CATALOG_SECONDARY_PRODUCTS_PER_STOREFRONT = 6;
export const CATALOG_FEATURED_STOREFRONTS_FETCH_LIMIT = 6;
export const CATALOG_DISCOVERY_STOREFRONTS_FETCH_LIMIT = 8;
export const CATALOG_SECONDARY_GROUPS_FETCH_LIMIT = 5;

type CatalogActivitySnapshot = {
  recentArtisanIds: string[];
  recentCategoryIds: string[];
  recentProductIds: string[];
  recentSearches: string[];
};

type CatalogFeedCollectionsParams = {
  activityState: CatalogActivitySnapshot;
  feedPages: PublicCatalogFeedItem[][];
  querySearch: string;
  rotationSeed: string;
  selectedCategoryId: string | null;
  selectedExplorePage: number;
  totalCount: number;
};

export function getCatalogPersonalizedItems(params: {
  activityState: CatalogActivitySnapshot;
  feedItems: PublicCatalogFeedItem[];
  hasContextFilters: boolean;
}) {
  const { activityState, feedItems, hasContextFilters } = params;

  if (hasContextFilters || feedItems.length === 0) {
    return [] as PublicCatalogFeedItem[];
  }

  const rankingSeed = `${activityState.recentArtisanIds.join(":")}:${activityState.recentCategoryIds.join(":")}:${activityState.recentProductIds.join(":")}:${activityState.recentSearches.join(":")}`;

  return feedItems
    .map((item) => ({
      item,
      score: getCatalogFeedItemRelevanceScore(item, activityState),
    }))
    .filter(({ score }) => score > 0)
    .sort((leftItem, rightItem) => {
      if (rightItem.score !== leftItem.score) {
        return rightItem.score - leftItem.score;
      }

      return sortByRotationPriority(
        leftItem.item.product.id,
        rightItem.item.product.id,
        `${rankingSeed}:personalized-score`,
      );
    })
    .filter(
      ({ item }, index, currentValue) =>
        currentValue.findIndex((currentItem) => currentItem.item.product.id === item.product.id) ===
        index,
    )
    .map(({ item }) => item)
    .slice(0, CATALOG_PERSONALIZED_ITEM_COUNT);
}

/**
 * Siempre incluye la página 1 como ancla.
 * Agrega null como separador "…" cuando la ventana no es contigua a la página 1.
 *
 * Ejemplos:
 *   página 1, total 8 → [1, 2, 3]
 *   página 3, total 8 → [1, 2, 3, 4]
 *   página 4, total 8 → [1, null, 3, 4, 5]
 *   página 7, total 8 → [1, null, 6, 7, 8]
 */
export function getCatalogPaginationNumbers(
  currentPage: number,
  totalPages: number,
): (number | null)[] {
  if (totalPages <= 1) return [1];

  // Ventana de 3 páginas alrededor de la página actual, sin incluir la 1
  const windowStart = Math.max(2, currentPage - 1);
  const windowEnd = Math.min(totalPages, currentPage + 1);

  const result: (number | null)[] = [1];

  // Si la ventana no es contigua a la página 1, agregar separador
  if (windowStart > 2) {
    result.push(null);
  }

  for (let p = windowStart; p <= windowEnd; p++) {
    result.push(p);
  }

  return result;
}

export function splitCatalogShowcaseItems<T>(items: T[]) {
  const [featuredItem, ...supportingItems] = items;

  return {
    featuredItem: featuredItem ?? null,
    supportingItems,
  };
}

function getCatalogShowcaseItems(
  items: PublicCatalogFeedItem[],
  {
    itemCount = CATALOG_SHOWCASE_ITEM_COUNT,
    prioritizeModel = true,
  }: {
    itemCount?: number;
    prioritizeModel?: boolean;
  } = {},
) {
  const showcaseItems = items.slice(0, itemCount);
  if (!prioritizeModel) {
    return showcaseItems;
  }

  const modelItem = items.find((item) =>
    Boolean(getPrimaryProductModel3D(item.product.product_media)),
  );

  if (!modelItem || showcaseItems.some((item) => item.product.id === modelItem.product.id)) {
    return showcaseItems;
  }

  return [
    ...showcaseItems.slice(0, 1),
    modelItem,
    ...showcaseItems.slice(1).filter((item) => item.product.id !== modelItem.product.id),
  ].slice(0, itemCount);
}

function getRotationHash(seed: string) {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function rotateCatalogItems<T>(items: T[], seed: string, salt: string) {
  if (items.length < 2) {
    return items;
  }

  const offset = getRotationHash(`${seed}:${salt}`) % items.length;

  if (offset === 0) {
    return items;
  }

  return [...items.slice(offset), ...items.slice(0, offset)];
}

function getCatalogItemArtisanId(item: PublicCatalogFeedItem) {
  return item.product.artisan_id || item.storefront?.id || item.product.id;
}

function sortByRotationPriority(leftValue: string, rightValue: string, seed: string) {
  return (
    getRotationHash(`${seed}:${leftValue}`) -
    getRotationHash(`${seed}:${rightValue}`)
  );
}

export function diversifyCatalogFeedByArtisan(
  items: PublicCatalogFeedItem[],
  seed: string,
) {
  if (items.length < 3) {
    return rotateCatalogItems(items, seed, "feed-short");
  }

  const rotatedItems = rotateCatalogItems(items, seed, "feed-base");
  const groupedItems = new Map<string, PublicCatalogFeedItem[]>();

  rotatedItems.forEach((item) => {
    const artisanId = getCatalogItemArtisanId(item);
    const artisanItems = groupedItems.get(artisanId);

    if (artisanItems) {
      artisanItems.push(item);
    } else {
      groupedItems.set(artisanId, [item]);
    }
  });

  if (groupedItems.size < 2) {
    return rotatedItems;
  }

  const queues = new Map(
    [...groupedItems.entries()].map(([artisanId, artisanItems]) => [
      artisanId,
      rotateCatalogItems(artisanItems, seed, `artisan:${artisanId}`),
    ]),
  );
  const result: PublicCatalogFeedItem[] = [];
  let lastArtisanId: string | null = null;

  while (result.length < rotatedItems.length) {
    const activeArtisanIds = [...queues.entries()]
      .filter(([, artisanItems]) => artisanItems.length > 0)
      .map(([artisanId]) => artisanId);

    if (activeArtisanIds.length === 0) {
      break;
    }

    const candidateArtisanIds =
      activeArtisanIds.length > 1
        ? activeArtisanIds.filter((artisanId) => artisanId !== lastArtisanId)
        : activeArtisanIds;

    const [nextArtisanId] = candidateArtisanIds.sort((leftId, rightId) => {
      const remainingDiff =
        (queues.get(rightId)?.length ?? 0) - (queues.get(leftId)?.length ?? 0);

      if (remainingDiff !== 0) {
        return remainingDiff;
      }

      return sortByRotationPriority(
        `${leftId}:${result.length}`,
        `${rightId}:${result.length}`,
        seed,
      );
    });

    const nextQueue = queues.get(nextArtisanId);
    const nextItem = nextQueue?.shift();

    if (!nextItem) {
      break;
    }

    result.push(nextItem);
    lastArtisanId = nextArtisanId;
  }

  return result;
}

export function getCatalogFeedCollections(params: CatalogFeedCollectionsParams) {
  const {
    activityState,
    feedPages,
    querySearch,
    rotationSeed,
    selectedCategoryId,
    selectedExplorePage,
    totalCount,
  } = params;
  const diversifiedFeedPages = feedPages.map((pageItems, pageIndex) =>
    diversifyCatalogFeedByArtisan(pageItems, `${rotationSeed}:page:${pageIndex + 1}`),
  );
  const firstFeedPageItems = diversifiedFeedPages[0] ?? [];
  const personalizedItems = getCatalogPersonalizedItems({
    activityState,
    feedItems: firstFeedPageItems,
    hasContextFilters: Boolean(querySearch.trim() || selectedCategoryId),
  });
  const personalizedShowcaseItems = getCatalogShowcaseItems(
    diversifyCatalogFeedByArtisan(
      personalizedItems,
      `${rotationSeed}:personalized`,
    ),
    {
      itemCount: CATALOG_PERSONALIZED_ITEM_COUNT,
      prioritizeModel: false,
    },
  );
  const personalizedProductIds = new Set(
    personalizedShowcaseItems.map((item) => item.product.id),
  );
  const primaryFeedPages = diversifiedFeedPages;
  const primaryFeedItems = primaryFeedPages.flat();
  const exploreTotalCount = totalCount;
  const totalExplorePages = Math.max(1, Math.ceil(exploreTotalCount / CATALOG_FEED_PAGE_SIZE));
  const visibleExplorePage = Math.min(selectedExplorePage, totalExplorePages);
  const loadedExplorePages = primaryFeedPages.length;
  const primaryFeedPageItems = primaryFeedPages[visibleExplorePage - 1] ?? [];
  const primaryFeedShowcaseItems = getCatalogShowcaseItems(primaryFeedPageItems);
  const primaryFeedShowcaseProductIds = new Set(
    primaryFeedShowcaseItems.map((item) => item.product.id),
  );
  const primaryFeedRemainingItems = primaryFeedPageItems.filter(
    (item) => !primaryFeedShowcaseProductIds.has(item.product.id),
  );

  return {
    exploreTotalCount,
    loadedExplorePages,
    personalizedItems,
    personalizedProductIds,
    personalizedShowcaseItems,
    primaryFeedItems,
    primaryFeedPages,
    primaryFeedPageItems,
    primaryFeedRemainingItems,
    primaryFeedShowcaseItems,
    totalExplorePages,
    visibleExplorePage,
  };
}

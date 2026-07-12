import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getCatalogActivityState,
} from "../../lib/browser/catalogActivity";
import { getCatalogViewerSeed } from "../../lib/browser/catalogViewerSeed";
import {
  getStorefrontGroupRelevanceScore,
  getStorefrontRelevanceScore,
} from "../../lib/discovery/semanticRelevance";
import type { PublicCatalogSortOrder } from "../../types/public";
import {
  CATALOG_FEED_PAGE_SIZE,
  CATALOG_DISCOVERY_STOREFRONTS_FETCH_LIMIT,
  CATALOG_DISCOVERY_STOREFRONTS_LIMIT,
  CATALOG_FEATURED_STOREFRONTS_FETCH_LIMIT,
  CATALOG_FEATURED_STOREFRONTS_LIMIT,
  CATALOG_SECONDARY_GROUPS_FETCH_LIMIT,
  CATALOG_SECONDARY_GROUPS_LIMIT,
  CATALOG_SECONDARY_PRODUCTS_PER_STOREFRONT,
  getCatalogFeedCollections,
  rotateCatalogItems,
} from "./catalogPageUtils";
import {
  areCatalogInterestSignalsEqual,
  getMergedCatalogInterestSignals,
} from "./catalogInterestSignals";
import {
  usePublicCatalogProductFeedInfinite,
  usePublicCatalogStorefrontSuggestions,
  usePublicCompleteCatalogStorefrontGroupsPage,
  usePublicCategories,
} from "./publicQueries";

type UseCatalogPageDataParams = {
  categorySlug: string | null;
  shouldLoadSecondaryCatalog?: boolean;
  querySearch: string;
  selectedExplorePage: number;
  selectedSortOrder: PublicCatalogSortOrder;
};

export function useCatalogPageData({
  categorySlug,
  shouldLoadSecondaryCatalog = true,
  querySearch,
  selectedExplorePage,
  selectedSortOrder,
}: UseCatalogPageDataParams) {
  const [activityState, setActivityState] = useState(getCatalogActivityState);
  const [areSecondaryStorefrontsEnabled, setAreSecondaryStorefrontsEnabled] = useState(false);
  const [areSecondaryGroupsEnabled, setAreSecondaryGroupsEnabled] = useState(false);
  const activityRequestVersionRef = useRef(0);
  const feedRotationSeed = getCatalogViewerSeed("feed");
  const storefrontRotationSeed = getCatalogViewerSeed("storefronts");
  const groupsRotationSeed = getCatalogViewerSeed("groups");

  const categoriesQuery = usePublicCategories();
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const selectedCategory = useMemo(
    () => categories.find((category) => category.slug === categorySlug) ?? null,
    [categories, categorySlug],
  );
  const categoryReady = !categorySlug || (categoriesQuery.isSuccess && Boolean(selectedCategory));

  const feedQuery = usePublicCatalogProductFeedInfinite(
    {
      categoryId: selectedCategory?.id ?? null,
      limit: CATALOG_FEED_PAGE_SIZE,
      search: querySearch || undefined,
      sort: selectedSortOrder,
    },
    {
      enabled: categoryReady,
    },
  );
  const storefrontSuggestionsQuery = usePublicCatalogStorefrontSuggestions(
    {
      categoryId: selectedCategory?.id ?? null,
      discoveryLimit: shouldLoadSecondaryCatalog ? CATALOG_DISCOVERY_STOREFRONTS_FETCH_LIMIT : 0,
      featuredLimit: shouldLoadSecondaryCatalog ? CATALOG_FEATURED_STOREFRONTS_FETCH_LIMIT : 0,
      search: querySearch || undefined,
    },
    {
      enabled: shouldLoadSecondaryCatalog && categoryReady && areSecondaryStorefrontsEnabled,
    },
  );
  const completeStorefrontGroupsQuery = usePublicCompleteCatalogStorefrontGroupsPage(
    {
      categoryId: selectedCategory?.id ?? null,
      limit: CATALOG_SECONDARY_GROUPS_FETCH_LIMIT,
      page: 1,
      productsPerStorefront: CATALOG_SECONDARY_PRODUCTS_PER_STOREFRONT,
      search: querySearch || undefined,
    },
    {
      enabled: shouldLoadSecondaryCatalog && categoryReady && areSecondaryGroupsEnabled,
    },
  );

  const feedPages = useMemo(
    () => feedQuery.data?.pages.map((page) => page.items) ?? [],
    [feedQuery.data],
  );
  const feedItems = useMemo(() => feedPages.flat(), [feedPages]);
  const totalCount = feedQuery.data?.pages[0]?.totalCount ?? 0;
  const hasNextPage = feedQuery.hasNextPage ?? false;
  const isFetchingMore = feedQuery.isFetchingNextPage;
  const isLoading = categoriesQuery.isLoading || (feedQuery.isLoading && feedItems.length === 0);

  const feedCollections = useMemo(
    () =>
      getCatalogFeedCollections({
        activityState,
        feedPages,
        querySearch,
        rotationSeed: feedRotationSeed,
        selectedCategoryId: selectedCategory?.id ?? null,
        selectedExplorePage,
        totalCount,
      }),
    [
      activityState,
      feedPages,
      feedRotationSeed,
      querySearch,
      selectedCategory?.id,
      selectedExplorePage,
      totalCount,
    ],
  );

  const hasFeedData = feedItems.length > 0;
  const catalogLoadErrorMessage = categoriesQuery.error
    ? categoriesQuery.error.message
    : !hasFeedData && feedQuery.error
      ? feedQuery.error.message
      : null;
  const exploreFeedErrorMessage =
    hasFeedData && feedQuery.error ? feedQuery.error.message : null;
  const storefrontsErrorMessage = storefrontSuggestionsQuery.error
    ? storefrontSuggestionsQuery.error.message
    : null;
  const storefrontGroupsErrorMessage = completeStorefrontGroupsQuery.error
    ? completeStorefrontGroupsQuery.error.message
    : null;
  const featuredStorefronts = useMemo(
    () => {
      const rotatedStorefronts = rotateCatalogItems(
        storefrontSuggestionsQuery.data?.featuredStorefronts ?? [],
        storefrontRotationSeed,
        "featured-storefronts",
      );

      return rotatedStorefronts
        .slice()
        .sort(
          (leftStorefront, rightStorefront) =>
            getStorefrontRelevanceScore(rightStorefront, activityState) -
            getStorefrontRelevanceScore(leftStorefront, activityState),
        )
        .slice(0, CATALOG_FEATURED_STOREFRONTS_LIMIT);
    },
    [activityState, storefrontRotationSeed, storefrontSuggestionsQuery.data],
  );
  const discoveryStorefronts = useMemo(
    () => {
      const rotatedStorefronts = rotateCatalogItems(
        storefrontSuggestionsQuery.data?.discoveryStorefronts ?? [],
        storefrontRotationSeed,
        "discovery-storefronts",
      );

      return rotatedStorefronts
        .slice()
        .sort(
          (leftStorefront, rightStorefront) =>
            getStorefrontRelevanceScore(rightStorefront, activityState) -
            getStorefrontRelevanceScore(leftStorefront, activityState),
        )
        .slice(0, CATALOG_DISCOVERY_STOREFRONTS_LIMIT);
    },
    [activityState, storefrontRotationSeed, storefrontSuggestionsQuery.data],
  );
  const secondaryStorefrontGroups = useMemo(
    () => {
      const rotatedGroups = rotateCatalogItems(
        completeStorefrontGroupsQuery.data?.items ?? [],
        groupsRotationSeed,
        "secondary-storefront-groups",
      );

      return rotatedGroups
        .slice()
        .sort(
          (leftGroup, rightGroup) =>
            getStorefrontGroupRelevanceScore(rightGroup, activityState) -
            getStorefrontGroupRelevanceScore(leftGroup, activityState),
        )
        .slice(0, CATALOG_SECONDARY_GROUPS_LIMIT);
    },
    [activityState, completeStorefrontGroupsQuery.data, groupsRotationSeed],
  );

  const isPendingExplorePage =
    !isLoading &&
    feedCollections.primaryFeedPageItems.length === 0 &&
    feedCollections.loadedExplorePages < feedCollections.visibleExplorePage &&
    (isFetchingMore || hasNextPage);

  const applyMergedActivityState = useCallback(async () => {
    const nextRequestVersion = activityRequestVersionRef.current + 1;
    activityRequestVersionRef.current = nextRequestVersion;
    const nextActivityState = await getMergedCatalogInterestSignals();

    if (activityRequestVersionRef.current !== nextRequestVersion) {
      return;
    }

    setActivityState((currentActivityState) =>
      areCatalogInterestSignalsEqual(currentActivityState, nextActivityState)
        ? currentActivityState
        : nextActivityState,
    );
  }, []);

  useEffect(() => {
    void applyMergedActivityState();
  }, [applyMergedActivityState]);

  useEffect(() => {
    if (!categoryReady || !shouldLoadSecondaryCatalog) {
      setAreSecondaryStorefrontsEnabled(false);
      setAreSecondaryGroupsEnabled(false);
      return;
    }

    const idleCallback =
      typeof window !== "undefined" && "requestIdleCallback" in window
        ? window.requestIdleCallback.bind(window)
        : null;
    const cancelIdleCallback =
      typeof window !== "undefined" && "cancelIdleCallback" in window
        ? window.cancelIdleCallback.bind(window)
        : null;

    let storefrontsTimeoutId: number | null = null;
    let groupsTimeoutId: number | null = null;
    let idleHandle: number | null = null;

    const enableSecondaryStorefronts = () => {
      setAreSecondaryStorefrontsEnabled(true);
      groupsTimeoutId = window.setTimeout(() => {
        setAreSecondaryGroupsEnabled(true);
      }, 450);
    };

    if (!isLoading) {
      if (idleCallback) {
        idleHandle = idleCallback(() => {
          enableSecondaryStorefronts();
        }, { timeout: 900 });
      } else {
        storefrontsTimeoutId = window.setTimeout(() => {
          enableSecondaryStorefronts();
        }, 250);
      }
    }

    return () => {
      if (idleHandle !== null && cancelIdleCallback) {
        cancelIdleCallback(idleHandle);
      }
      if (storefrontsTimeoutId !== null) {
        window.clearTimeout(storefrontsTimeoutId);
      }
      if (groupsTimeoutId !== null) {
        window.clearTimeout(groupsTimeoutId);
      }
    };
  }, [
    categoryReady,
    isLoading,
    querySearch,
    selectedCategory?.id,
    selectedSortOrder,
    shouldLoadSecondaryCatalog,
  ]);

  // fetchNextPage es estable entre renders (referencia de React Query),
  // mientras que feedQuery cambia de identidad cada render. Dependiendo
  // solo de fetchNextPage evitamos re-evaluar este effect en cada render.
  const fetchNextPage = feedQuery.fetchNextPage;
  useEffect(() => {
    if (
      !categoryReady ||
      isLoading ||
      !hasNextPage ||
      isFetchingMore ||
      feedCollections.loadedExplorePages >= feedCollections.visibleExplorePage
    ) {
      return;
    }

    void fetchNextPage();
  }, [
    categoryReady,
    feedCollections.loadedExplorePages,
    feedCollections.visibleExplorePage,
    fetchNextPage,
    hasNextPage,
    isFetchingMore,
    isLoading,
  ]);

  function syncActivityState() {
    const localActivityState = getCatalogActivityState();

    setActivityState((currentActivityState) =>
      areCatalogInterestSignalsEqual(currentActivityState, localActivityState)
        ? currentActivityState
        : localActivityState,
    );
    void applyMergedActivityState();
  }

  return {
    areSecondaryGroupsEnabled,
    areSecondaryStorefrontsEnabled,
    activityState,
    catalogLoadErrorMessage,
    categories,
    categoriesQuery,
    categoryReady,
    completeStorefrontGroupsQuery,
    discoveryStorefronts,
    exploreFeedErrorMessage,
    featuredStorefronts,
    feedCollections,
    feedQuery,
    hasFeedData,
    hasNextPage,
    isFetchingMore,
    isLoading,
    isPendingExplorePage,
    secondaryStorefrontGroups,
    selectedCategory,
    storefrontGroupsErrorMessage,
    storefrontSuggestionsQuery,
    storefrontsErrorMessage,
    syncActivityState,
    totalCount,
  };
}

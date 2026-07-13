import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { PagePlaceholder } from "../components/PagePlaceholder";
import {
  RevealSequenceGroup,
  RevealSequenceItem,
} from "../components/RevealOnView";
import { SkeletonBlock } from "../components/SkeletonBlock";

const CatalogDarkSection = lazy(
  () => import("../features/public/components/CatalogDarkSection"),
);

import { useAuth } from "../features/auth/useAuth";
import { useArtisanPendingInternalNotificationCount } from "../features/internalNotifications/internalNotificationsQueries";
import {
  trackCatalogCategory,
  trackCatalogSearch,
} from "../lib/browser/catalogActivity";
import {
  consumePendingProductDetailReturn,
  restorePendingProductDetailScroll,
} from "../lib/browser/productDetailOrigin";
import type { PublicCatalogSortOrder } from "../types/public";
import { CatalogExplorePagination } from "../features/public/components/CatalogExplorePagination";
import { CatalogProductFeedCard } from "../features/public/components/CatalogProductFeedCard";
import { CatalogProductShowcase } from "../features/public/components/CatalogProductShowcase";
import { CatalogScrollControls } from "../features/public/components/CatalogScrollControls";
import { CatalogSearchSection } from "../features/public/components/CatalogSearchSection";
import { CatalogStickySearchBar } from "../features/public/components/CatalogStickySearchBar";
import { CatalogTasteChoiceModal } from "../features/public/components/CatalogTasteChoiceModal";
import {
  CATALOG_FEED_PAGE_SIZE,
  getCatalogPaginationNumbers,
} from "../features/public/catalogPageUtils";
import { getCatalogTasteChoiceOptions } from "../features/public/catalogTasteChoices";
import { useCatalogAdaptiveMode } from "../features/public/useCatalogAdaptiveMode";
import { useCatalogPageData } from "../features/public/useCatalogPageData";

function getExploreRevealColumns() {
  if (typeof window === "undefined") {
    return 2;
  }

  if (window.innerWidth >= 1280) {
    return 5;
  }

  return window.innerWidth >= 1024 ? 3 : 2;
}

function hasExploreContent(content: {
  remainingRows: Array<Array<unknown>>;
  showcaseItems: Array<unknown>;
}) {
  return (
    content.showcaseItems.length > 0 ||
    content.remainingRows.some((rowItems) => rowItems.length > 0)
  );
}

function scrollToExploreSection(section: HTMLElement | null) {
  if (!section || typeof window === "undefined") {
    return;
  }

  const stickyOffset = 96;
  const sectionTop = section.getBoundingClientRect().top + window.scrollY;

  window.scrollTo({
    top: Math.max(sectionTop - stickyOffset, 0),
    behavior: "auto",
  });
}

function CatalogPageTransitionLoader() {
  return (
    <div className="catalog-page-loader pointer-events-none absolute inset-0 z-20 grid place-items-center rounded-xl bg-white/50 backdrop-blur-[2px]">
      <div className="grid max-w-sm justify-items-center gap-4 rounded-xl border border-stone-200 bg-white/95 px-6 py-5 text-center shadow-xl">
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-stone-200 border-t-blue-600" />
        <div className="grid gap-1">
          <p className="text-sm font-semibold text-ocean-800">Cargando productos</p>
          <p className="text-xs text-ocean-500">Actualizando catálogo...</p>
        </div>
      </div>
    </div>
  );
}

export function CatalogPage() {
  const { role, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const querySearch = searchParams.get("q") ?? "";
  const categorySlug = searchParams.get("categoria");
  const sortOrderParam = searchParams.get("orden");
  const explorePageParam = Number(searchParams.get("pagina") ?? "1");
  const [draftSearch, setDraftSearch] = useState(querySearch);
  const [exploreRevealColumns, setExploreRevealColumns] = useState(getExploreRevealColumns);
  const [shouldRequestSecondaryCatalog, setShouldRequestSecondaryCatalog] = useState(false);
  const [isStickyCatalogSearchVisible, setIsStickyCatalogSearchVisible] = useState(false);
  const [isTasteChoiceModalOpen, setIsTasteChoiceModalOpen] = useState(false);
  const pendingNotificationsQuery = useArtisanPendingInternalNotificationCount(
    user?.id,
    role === "artisan",
  );
  const pendingNotificationCount = pendingNotificationsQuery.data ?? 0;
  const hasPendingInternalNotifications = role === "artisan" && pendingNotificationCount > 0;
  const showTermsButton = hasPendingInternalNotifications;
  const catalogSearchSectionRef = useRef<HTMLDivElement | null>(null);
  const exploreSectionRef = useRef<HTMLElement | null>(null);
  const secondaryCatalogSentinelRef = useRef<HTMLDivElement | null>(null);
  const adaptiveMode = useCatalogAdaptiveMode();
  const shouldLoadSecondaryCatalog =
    adaptiveMode.shouldLoadSecondaryCatalog && shouldRequestSecondaryCatalog;

  const selectedSortOrder: PublicCatalogSortOrder =
    sortOrderParam === "price-asc" || sortOrderParam === "price-desc" ? sortOrderParam : "newest";
  const selectedExplorePage =
    Number.isFinite(explorePageParam) && explorePageParam > 0 ? Math.floor(explorePageParam) : 1;

  const {
    activityState,
    areSecondaryGroupsEnabled,
    areSecondaryStorefrontsEnabled,
    catalogLoadErrorMessage,
    categories,
    categoriesQuery,
    completeStorefrontGroupsQuery,
    discoveryStorefronts,
    exploreFeedErrorMessage,
    featuredStorefronts,
    feedCollections,
    isFetchingMore,
    isLoading,
    isPendingExplorePage,
    secondaryStorefrontGroups,
    selectedCategory,
    storefrontGroupsErrorMessage,
    storefrontSuggestionsQuery,
    storefrontsErrorMessage,
    syncActivityState: syncCatalogActivityState,
    totalCount,
  } = useCatalogPageData({
    categorySlug,
    shouldLoadSecondaryCatalog,
    querySearch,
    selectedExplorePage,
    selectedSortOrder,
  });

  const hasActiveFilters =
    Boolean(selectedCategory || querySearch.trim()) || selectedSortOrder !== "newest";

  const paginationNumbers = useMemo(
    () =>
      getCatalogPaginationNumbers(
        feedCollections.visibleExplorePage,
        feedCollections.totalExplorePages,
      ),
    [feedCollections.totalExplorePages, feedCollections.visibleExplorePage],
  );
  const primaryFeedRemainingItems = feedCollections.primaryFeedRemainingItems;

  const tasteChoiceOptions = useMemo(
    () =>
      getCatalogTasteChoiceOptions({
        activityState,
        categories,
        items: [
          ...feedCollections.primaryFeedShowcaseItems,
          ...feedCollections.personalizedShowcaseItems,
          ...feedCollections.primaryFeedItems,
        ],
      }),
    [
      activityState,
      categories,
      feedCollections.personalizedShowcaseItems,
      feedCollections.primaryFeedItems,
      feedCollections.primaryFeedShowcaseItems,
    ],
  );

  const revealColumns = adaptiveMode.isSingleColumnViewport ? 1 : exploreRevealColumns;
  const exploreGridClassName = adaptiveMode.isSingleColumnViewport
    ? "grid grid-cols-1 gap-3.5"
    : "grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5";

  const primaryFeedRemainingRows = useMemo(() => {
    const rows: typeof primaryFeedRemainingItems[] = [];

    for (
      let index = 0;
      index < primaryFeedRemainingItems.length;
      index += revealColumns
    ) {
      rows.push(primaryFeedRemainingItems.slice(index, index + revealColumns));
    }

    return rows;
  }, [primaryFeedRemainingItems, revealColumns]);
  const currentExploreContent = useMemo(
    () => ({
      page: feedCollections.visibleExplorePage,
      remainingRows: primaryFeedRemainingRows,
      showcaseItems: feedCollections.primaryFeedShowcaseItems,
    }),
    [
      feedCollections.primaryFeedShowcaseItems,
      feedCollections.visibleExplorePage,
      primaryFeedRemainingRows,
    ],
  );
  const currentExploreViewKey = useMemo(
    () =>
      [
        feedCollections.visibleExplorePage,
        selectedCategory?.id ?? "",
        selectedSortOrder,
        querySearch.trim().toLowerCase(),
      ].join("|"),
    [
      feedCollections.visibleExplorePage,
      querySearch,
      selectedCategory?.id,
      selectedSortOrder,
    ],
  );
  const [displayedExploreContent, setDisplayedExploreContent] = useState(() => ({
    content: currentExploreContent,
    key: currentExploreViewKey,
  }));
  const visibleExploreContent = isPendingExplorePage
    ? displayedExploreContent.content
    : currentExploreContent;
  const hasVisibleExploreContent = hasExploreContent(visibleExploreContent);

  const hasDarkSectionContent =
    shouldLoadSecondaryCatalog &&
    (featuredStorefronts.length > 0 ||
      discoveryStorefronts.length > 0 ||
      secondaryStorefrontGroups.length > 0 ||
      Boolean(storefrontsErrorMessage && areSecondaryStorefrontsEnabled) ||
      Boolean(storefrontGroupsErrorMessage && areSecondaryGroupsEnabled));

  useEffect(() => {
    setDraftSearch(querySearch);
  }, [querySearch]);

  useEffect(() => {
    const searchSection = catalogSearchSectionRef.current;

    if (!searchSection) {
      return;
    }

    const updateFromScroll = () => {
      const rect = searchSection.getBoundingClientRect();
      setIsStickyCatalogSearchVisible(rect.bottom < 86 && window.scrollY > 120);
    };

    if (typeof IntersectionObserver === "undefined") {
      updateFromScroll();
      window.addEventListener("scroll", updateFromScroll, { passive: true });
      window.addEventListener("resize", updateFromScroll);

      return () => {
        window.removeEventListener("scroll", updateFromScroll);
        window.removeEventListener("resize", updateFromScroll);
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStickyCatalogSearchVisible(!entry.isIntersecting && window.scrollY > 120);
      },
      {
        rootMargin: "-86px 0px 0px 0px",
        threshold: 0.02,
      },
    );

    observer.observe(searchSection);
    window.addEventListener("scroll", updateFromScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updateFromScroll);
    };
  }, []);

  useEffect(() => {
    if (isLoading || isPendingExplorePage) {
      return;
    }

    const pendingReturn = consumePendingProductDetailReturn(location);

    if (!pendingReturn) {
      return;
    }

    restorePendingProductDetailScroll(pendingReturn.scrollY);
  }, [isLoading, isPendingExplorePage, location]);

  useEffect(() => {
    const updateRevealColumns = () => {
      setExploreRevealColumns(getExploreRevealColumns());
    };

    updateRevealColumns();
    window.addEventListener("resize", updateRevealColumns);

    return () => {
      window.removeEventListener("resize", updateRevealColumns);
    };
  }, []);

  useEffect(() => {
    if (isLoading || catalogLoadErrorMessage || isPendingExplorePage) {
      return;
    }

    setDisplayedExploreContent((currentState) => {
      if (currentState.key !== currentExploreViewKey) {
        return {
          content: currentExploreContent,
          key: currentExploreViewKey,
        };
      }

      if (!hasExploreContent(currentState.content) && hasExploreContent(currentExploreContent)) {
        return {
          content: currentExploreContent,
          key: currentExploreViewKey,
        };
      }

      return currentState;
    });
  }, [
    catalogLoadErrorMessage,
    currentExploreContent,
    currentExploreViewKey,
    isLoading,
    isPendingExplorePage,
  ]);

  useEffect(() => {
    if (!adaptiveMode.shouldLoadSecondaryCatalog) {
      setShouldRequestSecondaryCatalog(false);
      return;
    }

    const sentinel = secondaryCatalogSentinelRef.current;

    if (!sentinel) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setShouldRequestSecondaryCatalog(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldRequestSecondaryCatalog(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "900px 0px",
        threshold: 0,
      },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [adaptiveMode.shouldLoadSecondaryCatalog]);

  useEffect(() => {
    if (!categorySlug || !categoriesQuery.isSuccess) {
      return;
    }

    const categoryExists = categories.some((category) => category.slug === categorySlug);

    if (!categoryExists) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("categoria");
      setSearchParams(nextParams, { replace: true });
    }
  }, [categories, categoriesQuery.isSuccess, categorySlug, searchParams, setSearchParams]);

  useEffect(() => {
    if (selectedExplorePage === feedCollections.visibleExplorePage) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);

    if (feedCollections.visibleExplorePage > 1) {
      nextParams.set("pagina", String(feedCollections.visibleExplorePage));
    } else {
      nextParams.delete("pagina");
    }

    setSearchParams(nextParams, { replace: true });
  }, [feedCollections.visibleExplorePage, searchParams, selectedExplorePage, setSearchParams]);

  const updateCatalogParams = useCallback(
    (nextValues: {
      categorySlug?: string | null;
      page?: number;
      search?: string;
      sortOrder?: PublicCatalogSortOrder;
    }) => {
      const nextParams = new URLSearchParams(searchParams);
      const nextSearch = nextValues.search ?? querySearch;
      const nextCategorySlug =
        nextValues.categorySlug === undefined ? categorySlug : nextValues.categorySlug;
      const nextSortOrder =
        nextValues.sortOrder === undefined ? selectedSortOrder : nextValues.sortOrder;

      if (nextSearch.trim()) {
        nextParams.set("q", nextSearch.trim());
      } else {
        nextParams.delete("q");
      }

      if (nextCategorySlug) {
        nextParams.set("categoria", nextCategorySlug);
      } else {
        nextParams.delete("categoria");
      }

      if (nextSortOrder !== "newest") {
        nextParams.set("orden", nextSortOrder);
      } else {
        nextParams.delete("orden");
      }

      if (typeof nextValues.page === "number" && nextValues.page > 1) {
        nextParams.set("pagina", String(nextValues.page));
      } else {
        nextParams.delete("pagina");
      }

      setSearchParams(nextParams);
    },
    [categorySlug, querySearch, searchParams, selectedSortOrder, setSearchParams],
  );

  function handleExplorePageChange(nextPage: number) {
    const normalizedPage = Math.min(
      Math.max(nextPage, 1),
      feedCollections.totalExplorePages,
    );

    if (normalizedPage === feedCollections.visibleExplorePage) {
      return;
    }

    scrollToExploreSection(exploreSectionRef.current);
    updateCatalogParams({
      page: normalizedPage,
    });
  }

  const handleSearchSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      trackCatalogSearch(draftSearch);
      syncCatalogActivityState();
      updateCatalogParams({ search: draftSearch });
    },
    [draftSearch, syncCatalogActivityState, updateCatalogParams],
  );

  const handleCategoryChange = useCallback(
    (nextCategorySlug: string | null) => {
      const nextCategory =
        nextCategorySlug === null
          ? null
          : categories.find((category) => category.slug === nextCategorySlug) ?? null;

      if (nextCategory) {
        trackCatalogCategory(nextCategory.id);
        syncCatalogActivityState();
      }

      updateCatalogParams({ categorySlug: nextCategorySlug });
    },
    [categories, syncCatalogActivityState, updateCatalogParams],
  );

  const handleSortOrderChange = useCallback(
    (nextSortOrder: PublicCatalogSortOrder) => {
      updateCatalogParams({ sortOrder: nextSortOrder });
    },
    [updateCatalogParams],
  );

  const handleClearFilters = useCallback(() => {
    setDraftSearch("");
    setSearchParams({});
  }, [setSearchParams]);

  const handleOpenTerms = useCallback(() => {
    navigate("/panel/vendedor/notificaciones");
  }, [navigate]);

  const handleOpenTasteChoices = useCallback(() => {
    setIsTasteChoiceModalOpen(true);
  }, []);

  return (
    <PagePlaceholder description="" hideHeader title="">
      <div
        className={[
          "grid min-w-0 gap-3 overflow-x-clip",
          adaptiveMode.isLiteMode ? "catalog-lite" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <CatalogStickySearchBar
          categories={categories}
          draftSearch={draftSearch}
          hasActiveFilters={hasActiveFilters}
          isVisible={isStickyCatalogSearchVisible}
          onCategoryChange={handleCategoryChange}
          onClearFilters={handleClearFilters}
          onDraftSearchChange={setDraftSearch}
          onSearchSubmit={handleSearchSubmit}
          onSortOrderChange={handleSortOrderChange}
          selectedCategory={selectedCategory}
          selectedSortOrder={selectedSortOrder}
        />

        <div ref={catalogSearchSectionRef}>
          <CatalogSearchSection
            categories={categories}
            draftSearch={draftSearch}
            hasActiveFilters={hasActiveFilters}
            onCategoryChange={handleCategoryChange}
            onClearFilters={handleClearFilters}
            onDraftSearchChange={setDraftSearch}
            onOpenTerms={handleOpenTerms}
            onSearchSubmit={handleSearchSubmit}
            onSortOrderChange={handleSortOrderChange}
            selectedCategory={selectedCategory}
            selectedSortOrder={selectedSortOrder}
            showTermsButton={showTermsButton}
            termsButtonLabel={
              hasPendingInternalNotifications
                ? `${pendingNotificationCount} aviso${pendingNotificationCount === 1 ? "" : "s"} por firmar`
                : undefined
            }
          />
        </div>

        <div className="grid gap-4 rounded-3xl border border-white/40 bg-gradient-to-br from-blue-950 via-blue-800 to-sky-400 p-3 shadow-elev-2 backdrop-blur-2xl sm:gap-5 sm:p-5">
          {catalogLoadErrorMessage ? (
            <div className="rounded-2xl border border-brand-500 bg-brand-100 px-4 py-3 text-sm text-brand-500">
              {catalogLoadErrorMessage}
            </div>
          ) : null}

          {feedCollections.personalizedShowcaseItems.length > 0 ? (
            <section
              aria-labelledby="catalog-personalized-title"
              className="relative grid gap-5 overflow-hidden rounded-3xl border border-white/30 p-2 sm:p-4 shadow-sm"
            >
              <div className="pointer-events-none absolute inset-0 z-0 bg-white" />
              <div className="pointer-events-none absolute -inset-2 z-0 rounded-3xl bg-[url('/catalog_personalized_bg.webp')] bg-cover bg-center opacity-20 blur-sm" />
              <div className="pointer-events-none absolute inset-0 z-0 bg-stone-950/25" />
              <div className="relative z-10 grid gap-4">
                <div className="relative flex h-14 items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-r from-brand-700 via-brand-600 to-blue-600 px-4 shadow-elev-2 sm:px-5">
                  <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(255,255,255,0.22),transparent_38%)]" />
                  <h2 className="relative font-display text-lg font-bold text-white" id="catalog-personalized-title">
                    Para ti
                  </h2>
                  <Link
                    className="relative inline-flex min-h-9 items-center rounded-full bg-white/15 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    to="/catalogo/para-vos"
                  >
                    Ver todo
                  </Link>
                </div>

                <CatalogProductShowcase
                  isLiteMode={adaptiveMode.isLiteMode}
                  items={feedCollections.personalizedShowcaseItems}
                  presentation="product-grid"
                />
              </div>
            </section>
          ) : null}

          <section
            aria-labelledby="catalog-explore-title"
            className="relative grid gap-5 overflow-hidden rounded-3xl border border-white/30 p-2 sm:p-4 shadow-sm"
            ref={exploreSectionRef}
          >
            <div className="pointer-events-none absolute inset-0 z-0 bg-white" />
            <div className="pointer-events-none absolute -inset-2 z-0 rounded-3xl bg-[url('/catalog_explore_bg.webp')] bg-cover bg-center opacity-20 blur-sm" />
            <div className="pointer-events-none absolute inset-0 z-0 bg-stone-950/25" />
            <div className="relative z-10 grid gap-4">
              <div className="relative flex h-14 items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-r from-brand-700 via-brand-600 to-blue-600 px-4 shadow-elev-2 sm:px-5">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(255,255,255,0.22),transparent_38%)]" />
                <h2 className="relative font-display text-lg font-bold text-white" id="catalog-explore-title">
                  Explorar
                </h2>
                {totalCount > 0 ? (
                  <span className="relative text-xs font-medium text-white/75">
                    {totalCount.toLocaleString("es-AR")} productos
                  </span>
                ) : null}
              </div>

            {isLoading ? (
              <div aria-busy="true" aria-live="polite" className={exploreGridClassName}>
                {Array.from({ length: CATALOG_FEED_PAGE_SIZE }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-white/70 bg-ocean-50/80 p-4 shadow-sm backdrop-blur-xl"
                  >
                    <SkeletonBlock className="aspect-square w-full rounded-lg" />
                    <SkeletonBlock className="mt-4 h-4 w-20" />
                    <SkeletonBlock className="mt-3 h-5 w-4/5" />
                    <SkeletonBlock className="mt-2 h-4 w-full" />
                    <SkeletonBlock className="mt-4 h-10 w-full rounded-lg" />
                  </div>
                ))}
              </div>
            ) : null}

            {!isLoading && !catalogLoadErrorMessage && hasVisibleExploreContent ? (
              <div
                aria-busy={isPendingExplorePage}
                aria-live="polite"
                className="relative min-h-[28rem] overflow-hidden rounded-xl"
              >
                <div
                  className={[
                    "grid gap-3.5 sm:gap-4",
                    isPendingExplorePage
                      ? "scale-[0.992] opacity-55 blur-[2px] transition-[opacity,transform,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                      : "catalog-explore-page-enter",
                  ].join(" ")}
                  key={`explore-visible-page-${visibleExploreContent.page}`}
                >
                <CatalogProductShowcase
                  featuredExtraAction={{
                    label: "Descubrir más sugerencias",
                    onClick: handleOpenTasteChoices,
                  }}
                  isLiteMode={adaptiveMode.isLiteMode}
                  isMobileViewport={adaptiveMode.isMobileViewport}
                  isSingleColumnViewport={adaptiveMode.isSingleColumnViewport}
                  items={visibleExploreContent.showcaseItems}
                />

                {visibleExploreContent.remainingRows.length > 0 ? (
                  <div className="grid gap-3.5 sm:gap-4">
                    {visibleExploreContent.remainingRows.map((rowItems, rowIndex) => (
                      <RevealSequenceGroup
                        className={exploreGridClassName}
                        key={`explore-page-${visibleExploreContent.page}-row-${rowIndex}`}
                        rootMargin="0px 0px 6% 0px"
                        threshold={0.1}
                      >
                        {rowItems.map((item, columnIndex) => (
                          <RevealSequenceItem
                            className="min-w-0"
                            index={columnIndex}
                            key={item.product.id}
                            stepMs={68}
                          >
                            <CatalogProductFeedCard
                              isLiteMode={adaptiveMode.isLiteMode}
                              item={item}
                              layout="default"
                            />
                          </RevealSequenceItem>
                        ))}
                      </RevealSequenceGroup>
                    ))}
                  </div>
                ) : null}
              </div>

                {isPendingExplorePage ? <CatalogPageTransitionLoader /> : null}
              </div>
            ) : null}

            {!isLoading && !catalogLoadErrorMessage && feedCollections.primaryFeedItems.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-stone-300 bg-white/85 p-5 text-sm leading-6 text-stone-600">
                No encontramos productos para esos filtros.
              </div>
            ) : null}

            {!isLoading && !catalogLoadErrorMessage && feedCollections.primaryFeedItems.length > 0 ? (
              <div className="grid gap-4">
                <CatalogExplorePagination
                  currentPage={feedCollections.visibleExplorePage}
                  disabled={isPendingExplorePage}
                  onPageChange={handleExplorePageChange}
                  pages={paginationNumbers}
                  totalPages={feedCollections.totalExplorePages}
                />

                {isFetchingMore ? (
                  <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-500" role="status">
                    Preparando más productos...
                  </div>
                ) : null}

                {exploreFeedErrorMessage ? (
                  <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-500">
                    No pudimos completar la carga de más productos en este momento.
                  </div>
                ) : null}
              </div>
            ) : null}
            </div>
          </section>
        </div>

        <div aria-hidden="true" className="h-px" ref={secondaryCatalogSentinelRef} />

        {hasDarkSectionContent ? (
          <Suspense fallback={null}>
            <CatalogDarkSection
              areSecondaryGroupsEnabled={areSecondaryGroupsEnabled}
              areSecondaryStorefrontsEnabled={areSecondaryStorefrontsEnabled}
              discoveryStorefronts={discoveryStorefronts}
              featuredStorefronts={featuredStorefronts}
              isCompleteStorefrontGroupsLoading={completeStorefrontGroupsQuery.isLoading}
              isStorefrontSuggestionsLoading={storefrontSuggestionsQuery.isLoading}
              secondaryStorefrontGroups={secondaryStorefrontGroups}
              storefrontGroupsErrorMessage={storefrontGroupsErrorMessage}
              storefrontsErrorMessage={storefrontsErrorMessage}
            />
          </Suspense>
        ) : null}

        <CatalogScrollControls />
      </div>

      {isTasteChoiceModalOpen ? (
        <CatalogTasteChoiceModal
          onClose={() => setIsTasteChoiceModalOpen(false)}
          options={tasteChoiceOptions}
        />
      ) : null}
    </PagePlaceholder>
  );
}

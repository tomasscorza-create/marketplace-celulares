import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

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
import { CatalogSectionHeader } from "../features/public/components/CatalogSectionHeader";
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
    <div className="catalog-page-loader pointer-events-none absolute inset-0 z-20 grid place-items-center rounded-[1.7rem] bg-white/30 px-6 py-10 backdrop-blur-[2px]">
      <div className="grid max-w-sm justify-items-center gap-3 rounded-[1.35rem] border border-white/75 bg-white/88 px-5 py-4 text-center shadow-[0_22px_52px_-30px_rgba(71,85,105,0.45)]">
        <div className="relative h-14 w-14">
          <span className="absolute inset-0 rounded-full border-[3px] border-ocean-100/90" />
          <span className="absolute inset-0 rounded-full border-[3px] border-transparent border-r-sun-500 border-t-ocean-500 animate-spin" />
          <span className="absolute inset-[10px] rounded-full bg-[radial-gradient(circle,_rgba(236,254,255,0.96),_rgba(224,242,254,0.82))] shadow-[inset_0_0_0_1px_rgba(8,145,178,0.12)]" />
        </div>

        <div className="flex items-center gap-2">
          {[
            { className: "bg-ocean-500", delay: "0ms" },
            { className: "bg-sun-500", delay: "140ms" },
            { className: "bg-brand-500", delay: "280ms" },
          ].map((dot) => (
            <span
              className={`h-2.5 w-2.5 rounded-full animate-bounce ${dot.className}`}
              key={`${dot.className}-${dot.delay}`}
              style={{ animationDelay: dot.delay, animationDuration: "900ms" }}
            />
          ))}
        </div>

        <div className="grid gap-1">
          <p className="text-sm font-semibold text-ocean-600">Preparando la siguiente pagina</p>
          <p className="text-xs text-stone-500">Las piezas nuevas entran enseguida.</p>
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
          "grid min-w-0 gap-5 overflow-x-clip",
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

        <div
          className="neutral-breathe grid gap-7 overflow-hidden rounded-[1.9rem] border border-[#cbd5e1]/30 p-5 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.18)] sm:p-7"
          style={{
            background:
              "linear-gradient(180deg, rgba(240,253,250,0.58) 0%, rgba(236,254,255,0.56) 34%, rgba(241,245,249,0.62) 100%)",
          }}
        >
          {catalogLoadErrorMessage ? (
            <div className="rounded-2xl border border-brand-500 bg-[#D1FAE5] px-4 py-3 text-sm text-brand-500">
              {catalogLoadErrorMessage}
            </div>
          ) : null}

          {feedCollections.personalizedShowcaseItems.length > 0 ? (
            <section className="grid gap-4">
              <CatalogSectionHeader
                id="catalog-personalized-title"
                tone="ocean"
                title="Piezas relacionadas contigo"
              />

              <CatalogProductShowcase
                featuredExtraAction={{
                  label: "Ver piezas para vos",
                  to: "/catalogo/para-vos",
                }}
                isLiteMode={adaptiveMode.isLiteMode}
                isMobileViewport={adaptiveMode.isMobileViewport}
                isSingleColumnViewport={adaptiveMode.isSingleColumnViewport}
                items={feedCollections.personalizedShowcaseItems}
              />
            </section>
          ) : null}

          <section
            aria-labelledby="catalog-explore-title"
            className="grid gap-5 border-t border-stone-200/80 pt-6"
            ref={exploreSectionRef}
          >
            <div
              className="rounded-2xl border border-stone-200/40 px-4 py-4 shadow-[0_1px_6px_rgba(0,0,0,0.05)] sm:px-5 sm:py-5"
              style={{
                background: [
                  "radial-gradient(ellipse at 0% 0%,   rgba(15,118,110,0.13)  0%, transparent 65%)",
                  "radial-gradient(ellipse at 100% 100%, rgba(71,85,105,0.11)  0%, transparent 65%)",
                  "radial-gradient(ellipse at 58% 50%,  rgba(8,145,178,0.10) 0%, transparent 58%)",
                  "rgba(255,255,255,0.68)",
                ].join(", "),
              }}
            >
              <CatalogSectionHeader
                id="catalog-explore-title"
                title="Explorar"
              />
              {totalCount > 0 ? (
                <p className="mt-2.5 text-sm leading-6 text-stone-500">
                  Descubrí y encontrá lo que buscás entre más de{" "}
                  <span className="font-semibold text-stone-700">
                    {totalCount.toLocaleString("es-AR")}
                  </span>{" "}
                  productos independientes.
                </p>
              ) : null}
            </div>

            {isLoading ? (
              <div aria-busy="true" aria-live="polite" className={exploreGridClassName}>
                {Array.from({ length: CATALOG_FEED_PAGE_SIZE }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-[1.7rem] border border-stone-200 bg-white p-4 shadow-sm"
                  >
                    <SkeletonBlock className="aspect-[4/3] w-full rounded-2xl" />
                    <SkeletonBlock className="mt-4 h-4 w-20" />
                    <SkeletonBlock className="mt-3 h-5 w-4/5" />
                    <SkeletonBlock className="mt-2 h-4 w-full" />
                    <SkeletonBlock className="mt-5 h-9 w-full rounded-full" />
                  </div>
                ))}
              </div>
            ) : null}

            {!isLoading && !catalogLoadErrorMessage && hasVisibleExploreContent ? (
              <div
                aria-busy={isPendingExplorePage}
                aria-live="polite"
                className="relative min-h-[28rem] overflow-hidden rounded-[1.75rem]"
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
                    label: "Explorar más de lo que te gusta",
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

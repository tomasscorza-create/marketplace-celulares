import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { PagePlaceholder } from "../components/PagePlaceholder";
import { SkeletonBlock } from "../components/SkeletonBlock";
import {
  diversifyCatalogFeedByArtisan,
} from "../features/public/catalogPageUtils";
import { CatalogProductFeedCard } from "../features/public/components/CatalogProductFeedCard";
import { getMergedCatalogInterestSignals } from "../features/public/catalogInterestSignals";
import {
  usePublicCatalogProductFeedInfinite,
  usePublicCategories,
} from "../features/public/publicQueries";
import { getCatalogActivityState } from "../lib/browser/catalogActivity";
import { getCatalogViewerSeed } from "../lib/browser/catalogViewerSeed";
import {
  getCategoryAffinityScore,
  getRelatedCategoryIds,
} from "../lib/discovery/categoryAffinity";
import { getCatalogFeedItemRelevanceScore } from "../lib/discovery/semanticRelevance";
import type { PublicCatalogFeedItem, PublicCategory } from "../types/public";

const RELATED_PRODUCTS_LIMIT = 20;
const RELATED_PRODUCTS_FETCH_LIMIT = 40;
const RELATED_PRODUCTS_EXPANDED_FETCH_LIMIT = 90;
const MIN_RELATED_PRODUCTS_BEFORE_EXPANSION = 10;

function getForYouCategoryScore(
  item: PublicCatalogFeedItem,
  selectedCategory: PublicCategory | null,
  categoriesById: Map<string, PublicCategory>,
) {
  if (!selectedCategory) {
    return 0;
  }

  const itemCategory = categoriesById.get(item.product.category_id);

  return itemCategory ? getCategoryAffinityScore(selectedCategory, itemCategory) : 0;
}

export function CatalogForYouPage() {
  const [searchParams] = useSearchParams();
  const categorySlug = searchParams.get("categoria");
  const [activityState, setActivityState] = useState(getCatalogActivityState);
  const rotationSeed = getCatalogViewerSeed("feed");
  const categoriesQuery = usePublicCategories({
    enabled: Boolean(categorySlug),
  });
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const selectedCategory = useMemo(
    () =>
      categorySlug
        ? categories.find((category) => category.slug === categorySlug) ?? null
        : null,
    [categories, categorySlug],
  );
  const hasInvalidCategorySlug =
    Boolean(categorySlug) && categoriesQuery.isSuccess && selectedCategory === null;
  const isCategoryReady = !categorySlug || Boolean(selectedCategory);
  const feedQuery = usePublicCatalogProductFeedInfinite(
    {
      categoryId: selectedCategory?.id ?? null,
      limit: RELATED_PRODUCTS_FETCH_LIMIT,
      sort: "newest",
    },
    {
      enabled: isCategoryReady && !hasInvalidCategorySlug,
    },
  );
  const expandedFeedQuery = usePublicCatalogProductFeedInfinite(
    {
      categoryId: null,
      limit: RELATED_PRODUCTS_EXPANDED_FETCH_LIMIT,
      sort: "newest",
    },
    {
      enabled: Boolean(selectedCategory) && !hasInvalidCategorySlug,
    },
  );

  useEffect(() => {
    let isCancelled = false;

    void getMergedCatalogInterestSignals().then((nextActivityState) => {
      if (!isCancelled) {
        setActivityState(nextActivityState);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  const feedItems = useMemo(
    () => feedQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [feedQuery.data],
  );
  const expandedFeedItems = useMemo(
    () => expandedFeedQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [expandedFeedQuery.data],
  );
  const relatedCategoryIds = useMemo(
    () =>
      selectedCategory
        ? getRelatedCategoryIds(selectedCategory, categories, {
            limit: 7,
            minScore: 24,
          })
        : [],
    [categories, selectedCategory],
  );

  const relatedItems = useMemo(() => {
    const categoriesById = new Map(categories.map((category) => [category.id, category]));
    const relatedCategoryIdSet = new Set([
      ...(selectedCategory ? [selectedCategory.id] : []),
      ...relatedCategoryIds,
    ]);
    const mergedItemsById = new Map<string, PublicCatalogFeedItem>();

    feedItems.forEach((item) => {
      mergedItemsById.set(item.product.id, item);
    });

    if (
      selectedCategory &&
      feedItems.length < MIN_RELATED_PRODUCTS_BEFORE_EXPANSION
    ) {
      expandedFeedItems.forEach((item) => {
        if (
          !mergedItemsById.has(item.product.id) &&
          relatedCategoryIdSet.has(item.product.category_id)
        ) {
          mergedItemsById.set(item.product.id, item);
        }
      });
    }

    const scoredItems = Array.from(mergedItemsById.values())
      .map((item) => ({
        item,
        score:
          getCatalogFeedItemRelevanceScore(item, activityState) +
          getForYouCategoryScore(item, selectedCategory, categoriesById) +
          (item.isBoosted || item.product.catalog_boost_active ? 4 : 0),
      }))
      .sort((leftItem, rightItem) => rightItem.score - leftItem.score);
    const positiveItems = scoredItems
      .filter(({ score }) => score > 0)
      .map(({ item }) => item);
    const sourceItems: PublicCatalogFeedItem[] =
      positiveItems.length >= 10 ? positiveItems : scoredItems.map(({ item }) => item);

    return diversifyCatalogFeedByArtisan(
      sourceItems,
      `${rotationSeed}:for-you`,
    ).slice(0, RELATED_PRODUCTS_LIMIT);
  }, [
    activityState,
    categories,
    expandedFeedItems,
    feedItems,
    relatedCategoryIds,
    rotationSeed,
    selectedCategory,
  ]);

  const isExpandingRecommendations =
    Boolean(selectedCategory) &&
    feedItems.length < MIN_RELATED_PRODUCTS_BEFORE_EXPANSION &&
    expandedFeedQuery.isLoading;
  const isLoading =
    ((Boolean(categorySlug) && categoriesQuery.isLoading) ||
      feedQuery.isLoading ||
      isExpandingRecommendations) &&
    relatedItems.length === 0;
  const errorMessage = hasInvalidCategorySlug
    ? "No encontramos esa categoría. Volvé al catálogo para elegir una opción disponible."
    : categoriesQuery.error
      ? "No pudimos validar esa categoría en este momento."
      : feedQuery.error
        ? "No pudimos preparar tus recomendaciones en este momento."
        : null;
  const pageTitle = selectedCategory
    ? `Más piezas de ${selectedCategory.name.toLowerCase()}`
    : "Piezas para vos";
  const pageDescription = selectedCategory
    ? "Una selección de productos relacionada con esa categoría y tus señales recientes."
    : "Una selección de productos relacionada con tus búsquedas, categorías vistas y piezas que visitaste recientemente.";

  return (
    <PagePlaceholder description="" hideHeader title="">
      <div className="grid gap-5">
        <section className="rounded-3xl border border-stone-200/70 bg-white/88 p-4 shadow-[0_18px_48px_-38px_rgba(15,23,42,0.45)] sm:p-5">
          <Link
            className="inline-flex rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-ocean-500 transition-colors hover:border-ocean-300 hover:bg-ocean-50"
            to="/catalogo"
          >
            Volver al catálogo
          </Link>
          <h1 className="mt-3 font-display text-2xl font-semibold text-white sm:text-3xl">
            {pageTitle}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">
            {pageDescription}
          </p>
        </section>

        {errorMessage ? (
          <div className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
            {errorMessage}
          </div>
        ) : null}

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:gap-5 xl:grid-cols-4">
            {Array.from({ length: 12 }).map((_, index) => (
              <div
                className="rounded-[1.7rem] border border-stone-200 bg-white p-4 shadow-sm"
                key={index}
              >
                <SkeletonBlock className="aspect-[4/5] w-full rounded-2xl" />
                <SkeletonBlock className="mt-4 h-4 w-20" />
                <SkeletonBlock className="mt-3 h-5 w-4/5" />
                <SkeletonBlock className="mt-2 h-4 w-full" />
                <SkeletonBlock className="mt-5 h-9 w-full rounded-full" />
              </div>
            ))}
          </div>
        ) : null}

        {!isLoading && relatedItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:gap-5 xl:grid-cols-4">
            {relatedItems.map((item) => (
              <CatalogProductFeedCard item={item} key={item.product.id} layout="default" />
            ))}
          </div>
        ) : null}

        {!isLoading && !errorMessage && relatedItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-300 bg-white/85 p-5 text-sm leading-6 text-stone-600">
            Todavia no tenemos suficientes pistas para preparar recomendaciones.
          </div>
        ) : null}
      </div>
    </PagePlaceholder>
  );
}

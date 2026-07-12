import { getCatalogFeedItemRelevanceScore } from "../../lib/discovery/semanticRelevance";
import { getProductImageMediaItems } from "../../types/productMedia";
import type { PublicCatalogFeedItem, PublicCategory } from "../../types/public";

type CatalogActivitySnapshot = {
  recentArtisanIds: string[];
  recentCategoryIds: string[];
  recentProductIds: string[];
  recentSearches: string[];
};

export type CatalogTasteChoiceOption = {
  categoryName: string;
  categorySlug: string;
  imageUrl: string;
};

type CatalogTasteChoiceParams = {
  activityState: CatalogActivitySnapshot;
  categories: PublicCategory[];
  items: PublicCatalogFeedItem[];
  limit?: number;
};

function getCatalogFeedItemPrimaryImageUrl(item: PublicCatalogFeedItem) {
  const { product } = item;
  const mediaImageUrl = getProductImageMediaItems(product.product_media)
    .map((mediaItem) => mediaItem.thumbnail_url ?? mediaItem.url)
    .find(Boolean);

  return mediaImageUrl ?? product.image_urls.find(Boolean) ?? product.image_url ?? null;
}

export function getCatalogTasteChoiceOptions({
  activityState,
  categories,
  items,
  limit = 3,
}: CatalogTasteChoiceParams) {
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const uniqueItemsByProductId = new Map<string, PublicCatalogFeedItem>();

  items.forEach((item) => {
    if (!uniqueItemsByProductId.has(item.product.id)) {
      uniqueItemsByProductId.set(item.product.id, item);
    }
  });

  const bestOptionByCategorySlug = new Map<
    string,
    {
      option: CatalogTasteChoiceOption;
      score: number;
    }
  >();

  uniqueItemsByProductId.forEach((item) => {
    const category = categoriesById.get(item.product.category_id);
    const imageUrl = getCatalogFeedItemPrimaryImageUrl(item);

    if (!category || !imageUrl) {
      return;
    }

    const score =
      getCatalogFeedItemRelevanceScore(item, activityState) +
      (item.isBoosted || item.product.catalog_boost_active ? 14 : 0) +
      2;
    const previousOption = bestOptionByCategorySlug.get(category.slug);

    if (!previousOption || score > previousOption.score) {
      bestOptionByCategorySlug.set(category.slug, {
        option: {
          categoryName: category.name,
          categorySlug: category.slug,
          imageUrl,
        },
        score,
      });
    }
  });

  return Array.from(bestOptionByCategorySlug.values())
    .sort((leftOption, rightOption) => rightOption.score - leftOption.score)
    .slice(0, limit)
    .map(({ option }) => option);
}

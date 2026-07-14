import type { ArtisanCategory, ArtisanProduct, ArtisanProductInput } from "../../types/artisan";
import {
  getProductImageMediaItems,
  isProductImageMediaItem,
  type ProductMediaItem,
} from "../../types/productMedia";

import type { ArtisanProductLearningProfile } from "./artisanProductLearning";

export const DRAFT_KEY_PREFIX = "artisan_product_draft";
export const MANAGEMENT_PRODUCTS_PAGE_SIZE = 24;
export const MAX_IMAGES_PER_UPLOAD = 15;

export type DragState = {
  originOffsetX: number;
  originOffsetY: number;
  pointerX: number;
  pointerY: number;
};

export const initialProductForm: ArtisanProductInput = {
  availability_mode: "stock",
  category_id: "",
  description: "",
  image_urls: [],
  product_media: [],
  product_attributes: [],
  category_spec_values: [],
  is_active: true,
  lead_time_days: null,
  made_to_order_options: [],
  price: 0,
  stock_quantity: 1,
  title: "",
};

export function getPrimaryProductImage(product: ArtisanProduct) {
  const primaryImageMedia = getProductImageMediaItems(product.product_media)[0] ?? null;

  return (
    primaryImageMedia?.thumbnail_url ??
    primaryImageMedia?.url ??
    product.image_urls[0] ??
    product.image_url ??
    null
  );
}

export function getProductMediaStoredUrls(mediaItems: ProductMediaItem[]) {
  return Array.from(
    new Set(
      mediaItems.flatMap((item) =>
        [item.url, item.original_url ?? null, item.thumbnail_url ?? null].filter(
          (value): value is string => Boolean(value),
        ),
      ),
    ),
  );
}

export function getProductMedia(product: ArtisanProduct): ProductMediaItem[] {
  const imageMediaItems = getProductImageMediaItems(product.product_media);

  if (imageMediaItems.length > 0) {
    return imageMediaItems;
  }

  const fallbackUrls = product.image_urls.length > 0
    ? product.image_urls
    : product.image_url
      ? [product.image_url]
      : [];

  return fallbackUrls.map((url) => ({
    crop: null,
    description: "",
    original_url: null,
    thumbnail_url: null,
    url,
  }));
}

export function getProductStoredImageUrls(product: ArtisanProduct) {
  const mediaItems = getProductMedia(product).filter(isProductImageMediaItem);

  if (mediaItems.length > 0) {
    return getProductMediaStoredUrls(mediaItems);
  }

  return Array.from(
    new Set(
      [product.image_url, ...product.image_urls].filter((value): value is string => Boolean(value)),
    ),
  );
}

export function formatImageCount(count: number) {
  return `${count} ${count === 1 ? "foto" : "fotos"}`;
}

export function createInitialProductForm(
  categories: ArtisanCategory[],
  learningProfile?: ArtisanProductLearningProfile | null,
): ArtisanProductInput {
  return {
    ...initialProductForm,
    availability_mode: learningProfile?.suggestedAvailabilityMode ?? initialProductForm.availability_mode,
    category_id: learningProfile?.suggestedCategoryId || categories[0]?.id || "",
    lead_time_days:
      learningProfile?.suggestedAvailabilityMode === "made_to_order"
        ? learningProfile.suggestedLeadTimeDays ?? 7
        : null,
    price: learningProfile?.suggestedPrice ?? initialProductForm.price,
    product_attributes: learningProfile?.suggestedAttributes ?? [],
    stock_quantity:
      learningProfile?.suggestedAvailabilityMode === "stock"
        ? learningProfile.suggestedStockQuantity ?? 1
        : null,
  };
}

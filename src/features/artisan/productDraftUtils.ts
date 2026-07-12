import type { ArtisanProductInput } from "../../types/artisan";
import type { ProductAttribute } from "../../types/productAttributes";
import type { ProductOptionGroup } from "../../types/productAvailability";
import type { ProductImageDraft } from "./imageEditorTypes";
import type { ImageCropAspect, ImageCropSettings } from "../../lib/compressImage";

import { createImagePreviewUrl } from "../../lib/compressImage";

export type PersistedProductDraftImageBase = {
  crop: ImageCropSettings;
  description: string;
  dimensions: ProductImageDraft["dimensions"];
  existingProductId: string | null;
  id: string;
  isEdited: boolean;
  mediaUrl: string | null;
  originalUrl: string | null;
  productDescription: string;
  productPrice: number | null;
  productStockQuantity: number | null;
  productTitle: string;
  thumbnailUrl: string | null;
  useCustomProductData: boolean;
};

export type PersistedLocalProductDraftImage = PersistedProductDraftImageBase & {
  fileBlob: Blob;
  fileLastModified: number;
  fileName: string;
  fileType: string;
  storageKind: "local";
};

export type PersistedRemoteProductDraftImage = PersistedProductDraftImageBase & {
  previewUrl: string;
  sourceUrl: string;
  storageKind: "remote";
};

export type PersistedProductDraftImage =
  | PersistedLocalProductDraftImage
  | PersistedRemoteProductDraftImage;

export type PersistedProductDraftState = {
  availability_mode: ArtisanProductInput["availability_mode"];
  category_id: string;
  description: string;
  editingBatchCode: string | null;
  editingBatchId: string | null;
  editingOriginalImageUrls: string[];
  editingProductId: string | null;
  imageDrafts: PersistedProductDraftImage[];
  is_active: boolean;
  lead_time_days: number | null;
  made_to_order_options: ProductOptionGroup[];
  product_attributes: ProductAttribute[];
  price: number;
  splitProductsByImage: boolean;
  stock_quantity: number | null;
  title: string;
};

export function createDefaultCrop(aspect: ImageCropAspect = "square"): ImageCropSettings {
  return {
    aspect,
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
  };
}

export function cleanupDraftUrls(drafts: ProductImageDraft[]) {
  drafts.forEach((draft) => {
    if (draft.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(draft.previewUrl);
    }

    if (draft.sourceUrl !== draft.previewUrl && draft.sourceUrl.startsWith("blob:")) {
      URL.revokeObjectURL(draft.sourceUrl);
    }
  });
}

export function createExistingImageDraft(
  mediaItem: {
    crop?: ImageCropSettings | null;
    original_url?: string | null;
    thumbnail_url?: string | null;
    url: string;
  },
  index: number,
): ProductImageDraft {
  return {
    crop: mediaItem.crop ?? createDefaultCrop(),
    description: "",
    dimensions: null,
    existingProductId: null,
    file: null,
    id: `existing-${index}-${mediaItem.url}`,
    isEdited: false,
    mediaUrl: mediaItem.url,
    originalUrl: mediaItem.original_url ?? null,
    productDescription: "",
    productPrice: null,
    productStockQuantity: null,
    productTitle: "",
    previewUrl: mediaItem.url,
    sourceUrl: mediaItem.original_url ?? mediaItem.url,
    thumbnailUrl: mediaItem.thumbnail_url ?? null,
    useCustomProductData: false,
  };
}

async function createDraftFileFromSource(draft: ProductImageDraft) {
  if (draft.file) {
    return draft.file;
  }

  if (!draft.sourceUrl.startsWith("blob:") && !draft.sourceUrl.startsWith("data:")) {
    return null;
  }

  const response = await fetch(draft.sourceUrl);
  const blob = await response.blob();

  return new File([blob], `borrador-${draft.id}.webp`, {
    lastModified: Date.now(),
    type: blob.type || "image/webp",
  });
}

function createPersistedProductDraftImageBase(
  draft: ProductImageDraft,
): PersistedProductDraftImageBase {
  return {
    crop: draft.crop,
    description: draft.description,
    dimensions: draft.dimensions,
    existingProductId: draft.existingProductId,
    id: draft.id,
    isEdited: draft.isEdited,
    mediaUrl: draft.mediaUrl,
    originalUrl: draft.originalUrl,
    productDescription: draft.productDescription,
    productPrice: draft.productPrice,
    productStockQuantity: draft.productStockQuantity,
    productTitle: draft.productTitle,
    thumbnailUrl: draft.thumbnailUrl,
    useCustomProductData: draft.useCustomProductData,
  };
}

export async function serializeProductImageDrafts(drafts: ProductImageDraft[]) {
  return Promise.all(
    drafts.map(async (draft) => {
      const localFile = await createDraftFileFromSource(draft);

      if (localFile) {
        return {
          ...createPersistedProductDraftImageBase(draft),
          fileBlob: localFile,
          fileLastModified: localFile.lastModified,
          fileName: localFile.name,
          fileType: localFile.type,
          storageKind: "local",
        } satisfies PersistedLocalProductDraftImage;
      }

      return {
        ...createPersistedProductDraftImageBase(draft),
        previewUrl: draft.previewUrl,
        sourceUrl: draft.sourceUrl,
        storageKind: "remote",
      } satisfies PersistedRemoteProductDraftImage;
    }),
  );
}

export async function hydratePersistedDraftImages(images: PersistedProductDraftImage[]) {
  return Promise.all(
    images.map(async (draft) => {
      if (draft.storageKind === "local") {
        const restoredFile = new File([draft.fileBlob], draft.fileName, {
          lastModified: draft.fileLastModified,
          type: draft.fileType,
        });
        const sourceUrl = URL.createObjectURL(restoredFile);
        const previewUrl = draft.isEdited
          ? await createImagePreviewUrl(restoredFile, { crop: draft.crop })
          : sourceUrl;

        return {
          crop: draft.crop,
          description: draft.description ?? "",
          dimensions: draft.dimensions ?? null,
          existingProductId: draft.existingProductId ?? null,
          file: restoredFile,
          id: draft.id,
          isEdited: draft.isEdited,
          mediaUrl: draft.mediaUrl ?? null,
          originalUrl: draft.originalUrl ?? null,
          productDescription: draft.productDescription ?? "",
          productPrice: draft.productPrice ?? null,
          productStockQuantity: draft.productStockQuantity ?? null,
          productTitle: draft.productTitle ?? "",
          previewUrl,
          sourceUrl,
          thumbnailUrl: draft.thumbnailUrl ?? null,
          useCustomProductData: draft.useCustomProductData ?? false,
        } satisfies ProductImageDraft;
      }

      const previewUrl = draft.isEdited
        ? await createImagePreviewUrl(draft.sourceUrl, { crop: draft.crop })
        : draft.previewUrl || draft.sourceUrl;

      return {
        crop: draft.crop,
        description: draft.description ?? "",
        dimensions: draft.dimensions ?? null,
        existingProductId: draft.existingProductId ?? null,
        file: null,
        id: draft.id,
        isEdited: draft.isEdited,
        mediaUrl: draft.mediaUrl ?? null,
        originalUrl: draft.originalUrl ?? null,
        productDescription: draft.productDescription ?? "",
        productPrice: draft.productPrice ?? null,
        productStockQuantity: draft.productStockQuantity ?? null,
        productTitle: draft.productTitle ?? "",
        previewUrl,
        sourceUrl: draft.sourceUrl,
        thumbnailUrl: draft.thumbnailUrl ?? null,
        useCustomProductData: draft.useCustomProductData ?? false,
      } satisfies ProductImageDraft;
    }),
  );
}

export function createDraftProductDataSnapshot(form: ArtisanProductInput) {
  return {
    productDescription: form.description,
    productPrice: Number(form.price) || 0,
    productStockQuantity: form.stock_quantity,
    productTitle: form.title,
  };
}

export function applyDraftProductSnapshot(
  draft: ProductImageDraft,
  form: ArtisanProductInput,
): ProductImageDraft {
  const snapshot = createDraftProductDataSnapshot(form);

  return {
    ...draft,
    ...snapshot,
  };
}

export function resolveDraftProductData(
  draft: ProductImageDraft,
  form: ArtisanProductInput,
) {
  if (!draft.useCustomProductData) {
    return {
      description: form.description,
      price: Number(form.price),
      stockQuantity: form.stock_quantity,
      title: form.title,
    };
  }

  return {
    description: draft.productDescription,
    price: Number(draft.productPrice ?? 0),
    stockQuantity: draft.productStockQuantity,
    title: draft.productTitle,
  };
}

import type { ImageCropAspect, ImageCropSettings } from "../../lib/compressImage";
import type { ProductAttribute } from "../../types/productAttributes";
import type { CategorySpecValue } from "../../types/categorySpecs";
import type { ProductOptionGroup } from "../../types/productAvailability";
import type { ProductImageDraft } from "./imageEditorTypes";

import { createImagePreviewUrl } from "../../lib/compressImage";

type PersistedDraftImageBase = {
  crop: ImageCropSettings;
  description: string;
  dimensions: ProductImageDraft["dimensions"];
  id: string;
  isEdited: boolean;
  mediaUrl: string | null;
  originalUrl: string | null;
  thumbnailUrl: string | null;
};

export type PersistedProductDraftImage =
  | (PersistedDraftImageBase & {
      fileBlob: Blob;
      fileLastModified: number;
      fileName: string;
      fileType: string;
      storageKind: "local";
    })
  | (PersistedDraftImageBase & {
      previewUrl: string;
      sourceUrl: string;
      storageKind: "remote";
    });

export type PersistedProductDraftState = {
  availability_mode: "made_to_order" | "stock";
  category_id: string;
  description: string;
  editingProductId: string | null;
  imageDrafts: PersistedProductDraftImage[];
  is_active: boolean;
  lead_time_days: number | null;
  made_to_order_options: ProductOptionGroup[];
  product_attributes: ProductAttribute[];
  category_spec_values: CategorySpecValue[];
  price: number;
  stock_quantity: number | null;
  title: string;
};

export function createDefaultCrop(aspect: ImageCropAspect = "square"): ImageCropSettings {
  return { aspect, offsetX: 0, offsetY: 0, zoom: 1 };
}

export function cleanupDraftUrls(drafts: ProductImageDraft[]) {
  for (const draft of drafts) {
    if (draft.previewUrl.startsWith("blob:")) URL.revokeObjectURL(draft.previewUrl);
    if (draft.sourceUrl !== draft.previewUrl && draft.sourceUrl.startsWith("blob:")) {
      URL.revokeObjectURL(draft.sourceUrl);
    }
  }
}

export function createExistingImageDraft(
  mediaItem: { crop?: ImageCropSettings | null; original_url?: string | null; thumbnail_url?: string | null; url: string },
  index: number,
): ProductImageDraft {
  return {
    crop: mediaItem.crop ?? createDefaultCrop(),
    description: "",
    dimensions: null,
    file: null,
    id: `existing-${index}-${mediaItem.url}`,
    isEdited: false,
    mediaUrl: mediaItem.url,
    originalUrl: mediaItem.original_url ?? null,
    previewUrl: mediaItem.url,
    sourceUrl: mediaItem.original_url ?? mediaItem.url,
    thumbnailUrl: mediaItem.thumbnail_url ?? null,
  };
}

async function draftFile(draft: ProductImageDraft) {
  if (draft.file) return draft.file;
  if (!draft.sourceUrl.startsWith("blob:") && !draft.sourceUrl.startsWith("data:")) return null;
  const blob = await (await fetch(draft.sourceUrl)).blob();
  return new File([blob], `borrador-${draft.id}.webp`, { lastModified: Date.now(), type: blob.type || "image/webp" });
}

function base(draft: ProductImageDraft): PersistedDraftImageBase {
  return {
    crop: draft.crop,
    description: draft.description,
    dimensions: draft.dimensions,
    id: draft.id,
    isEdited: draft.isEdited,
    mediaUrl: draft.mediaUrl,
    originalUrl: draft.originalUrl,
    thumbnailUrl: draft.thumbnailUrl,
  };
}

export async function serializeProductImageDrafts(drafts: ProductImageDraft[]) {
  return Promise.all(drafts.map(async (draft) => {
    const file = await draftFile(draft);
    if (file) {
      return { ...base(draft), fileBlob: file, fileLastModified: file.lastModified, fileName: file.name, fileType: file.type, storageKind: "local" } satisfies PersistedProductDraftImage;
    }
    return { ...base(draft), previewUrl: draft.previewUrl, sourceUrl: draft.sourceUrl, storageKind: "remote" } satisfies PersistedProductDraftImage;
  }));
}

export async function hydratePersistedDraftImages(images: PersistedProductDraftImage[]) {
  return Promise.all(images.map(async (draft) => {
    if (draft.storageKind === "local") {
      const file = new File([draft.fileBlob], draft.fileName, { lastModified: draft.fileLastModified, type: draft.fileType });
      const sourceUrl = URL.createObjectURL(file);
      return {
        crop: draft.crop, description: draft.description ?? "", dimensions: draft.dimensions ?? null,
        file, id: draft.id, isEdited: draft.isEdited, mediaUrl: draft.mediaUrl ?? null,
        originalUrl: draft.originalUrl ?? null,
        previewUrl: draft.isEdited ? await createImagePreviewUrl(file, { crop: draft.crop }) : sourceUrl,
        sourceUrl, thumbnailUrl: draft.thumbnailUrl ?? null,
      } satisfies ProductImageDraft;
    }
    return {
      crop: draft.crop, description: draft.description ?? "", dimensions: draft.dimensions ?? null,
      file: null, id: draft.id, isEdited: draft.isEdited, mediaUrl: draft.mediaUrl ?? null,
      originalUrl: draft.originalUrl ?? null,
      previewUrl: draft.isEdited ? await createImagePreviewUrl(draft.sourceUrl, { crop: draft.crop }) : draft.previewUrl || draft.sourceUrl,
      sourceUrl: draft.sourceUrl, thumbnailUrl: draft.thumbnailUrl ?? null,
    } satisfies ProductImageDraft;
  }));
}

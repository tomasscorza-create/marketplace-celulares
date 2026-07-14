import { useCallback } from "react";

import type { ArtisanProduct, ArtisanProductInput } from "../../types/artisan";
import {
  isProductModel3DMediaItem,
  type ProductMediaItem,
} from "../../types/productMedia";
import {
  uploadArtisanProductModel,
  uploadArtisanProductImage,
} from "./artisanClient";
import type { ProductImageDraft } from "./imageEditorTypes";
import { validateArtisanProductDraft } from "./artisanProductValidation";
import { getErrorMessage } from "../../lib/errors";
import { compressImage, createProcessedImageFile } from "../../lib/compressImage";

type SubmitParams = {
  createProduct: (input: ArtisanProductInput) => Promise<ArtisanProduct>;
  editingProductId: string | null;
  onError: (message: string) => void;
  onSavingChange: (isSaving: boolean) => void;
  onSuccess: (message: string) => void;
  onUploadStatusChange: (message: string | null) => void;
  productForm: ArtisanProductInput;
  productImages: ProductImageDraft[];
  productModel3DFile: File | null;
  targetArtisanId: string | null;
  updateProduct: (payload: {
    input: ArtisanProductInput;
    productId: string;
  }) => Promise<ArtisanProduct>;
};

function getModelFormat(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();

  return extension === "gltf" ? "gltf" : "glb";
}

function getPrimaryPosterUrl(mediaItems: ProductMediaItem[]) {
  return (
    mediaItems
      .map((item) => item.thumbnail_url ?? item.url)
      .find((url): url is string => Boolean(url)) ?? null
  );
}

async function createProductThumbnailImage(draft: ProductImageDraft) {
  const thumbnailOptions = {
    crop: draft.file || draft.originalUrl || draft.isEdited ? draft.crop : undefined,
    maxBytes: 320 * 1024,
    maxDimension: 520,
    quality: 0.68,
  };

  return draft.file
    ? compressImage(draft.file, thumbnailOptions)
    : createProcessedImageFile(
        draft.sourceUrl,
        thumbnailOptions,
        `miniatura-${Date.now()}-${draft.id}`,
      );
}

async function uploadProductThumbnail(targetArtisanId: string, draft: ProductImageDraft) {
  const thumbnailImage = await createProductThumbnailImage(draft);
  return uploadArtisanProductImage(targetArtisanId, thumbnailImage, "thumbs");
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function uploadProductMedia(params: {
  onUploadStatusChange: (message: string | null) => void;
  productImages: ProductImageDraft[];
  targetArtisanId: string;
}) {
  const { onUploadStatusChange, productImages, targetArtisanId } = params;
  const draftsToUpload = productImages.filter(
    (draft) => draft.previewUrl && (draft.file || draft.isEdited),
  );
  const totalUploads = draftsToUpload.length;
  let completedUploads = 0;

  const mediaByIndex = await mapWithConcurrency<ProductImageDraft, ProductMediaItem | null>(
    productImages,
    3,
    async (draft) => {
    if (!draft.previewUrl) {
      return null;
    }

    if (!draft.file && !draft.isEdited) {
      return {
          crop: draft.originalUrl ? draft.crop : null,
          description: draft.description.trim(),
          original_url: draft.originalUrl,
          thumbnail_url: draft.thumbnailUrl,
          url: draft.mediaUrl ?? draft.previewUrl,
      } satisfies ProductMediaItem;
    }

    let originalImageUrl = draft.originalUrl;

    if (draft.file) {
      const originalUploadResponse = await uploadArtisanProductImage(targetArtisanId, draft.file);

      if (originalUploadResponse.error || !originalUploadResponse.data) {
        throw new Error(
          originalUploadResponse.error?.message ?? "No pudimos subir la foto original.",
        );
      }

      originalImageUrl = originalUploadResponse.data.publicUrl;
    }

    const compressedImage = draft.file
      ? await compressImage(draft.file, {
          crop: draft.crop,
          maxBytes: 2 * 1024 * 1024,
          maxDimension: 1280,
          quality: 0.76,
        })
      : await createProcessedImageFile(
          draft.sourceUrl,
          {
            crop: draft.crop,
            maxBytes: 2 * 1024 * 1024,
            maxDimension: 1280,
            quality: 0.76,
          },
          `producto-${Date.now()}-${draft.id}`,
        );
    const uploadResponse = await uploadArtisanProductImage(targetArtisanId, compressedImage);

    if (uploadResponse.error || !uploadResponse.data) {
      throw new Error(uploadResponse.error?.message ?? "No pudimos subir una de las fotos.");
    }

    const thumbnailUploadResponse = await uploadProductThumbnail(targetArtisanId, draft);

    if (thumbnailUploadResponse.error || !thumbnailUploadResponse.data) {
      throw new Error(
        thumbnailUploadResponse.error?.message ?? "No pudimos subir la miniatura de una foto.",
      );
    }

    completedUploads += 1;
    onUploadStatusChange(`Subiendo fotos: ${completedUploads} de ${totalUploads}...`);

    return {
      crop: draft.crop,
      description: draft.description.trim(),
      original_url: originalImageUrl ?? null,
      thumbnail_url: thumbnailUploadResponse.data.publicUrl,
      url: uploadResponse.data.publicUrl,
    } satisfies ProductMediaItem;
    },
  );

  const uploadedMedia = mediaByIndex.filter(
    (mediaItem): mediaItem is ProductMediaItem => mediaItem !== null,
  );

  onUploadStatusChange(null);

  return {
    uploadedMedia,
  };
}

export function useArtisanProductSubmit({
  createProduct,
  editingProductId,
  onError,
  onSavingChange,
  onSuccess,
  onUploadStatusChange,
  productForm,
  productImages,
  productModel3DFile,
  targetArtisanId,
  updateProduct,
}: SubmitParams) {
  const submitProductForm = useCallback(async () => {
    if (!targetArtisanId) {
      return;
    }

    const validation = validateArtisanProductDraft({
      productForm,
      productImages,
    });

    if (validation.errorMessage) {
      onError(validation.errorMessage);
      return;
    }

    onSavingChange(true);
    onUploadStatusChange(null);

    let uploadedMedia: ProductMediaItem[] = [];
    let uploadedModelMedia: ProductMediaItem | null = null;

    try {
      const uploadResult = await uploadProductMedia({
        onUploadStatusChange,
        productImages,
        targetArtisanId,
      });

      uploadedMedia = uploadResult.uploadedMedia;
      if (productModel3DFile) {
        onUploadStatusChange("Subiendo modelo 3D...");
        const modelUploadResponse = await uploadArtisanProductModel(
          targetArtisanId,
          productModel3DFile,
        );

        if (modelUploadResponse.error || !modelUploadResponse.data) {
          throw new Error(
            modelUploadResponse.error?.message ?? "No pudimos subir el modelo 3D.",
          );
        }

        uploadedModelMedia = {
          description: productModel3DFile.name,
          format: getModelFormat(productModel3DFile.name),
          poster_url: getPrimaryPosterUrl(uploadedMedia),
          size_bytes: productModel3DFile.size,
          thumbnail_url: getPrimaryPosterUrl(uploadedMedia),
          type: "model_3d",
          url: modelUploadResponse.data.publicUrl,
        };
        onUploadStatusChange(null);
      }
    } catch (error) {
      onError(getErrorMessage(error, "No pudimos preparar una de las fotos."));
      onUploadStatusChange(null);
      onSavingChange(false);
      return;
    }

    const payload = {
      ...productForm,
      image_urls: uploadedMedia.map((item) => item.url),
      product_media: [
        ...uploadedMedia,
        ...(uploadedModelMedia
          ? [uploadedModelMedia]
          : productForm.product_media.filter(isProductModel3DMediaItem)),
      ],
      product_attributes: validation.sanitizedAttributes,
      category_spec_values: validation.sanitizedCategorySpecValues,
      price: Number(productForm.price),
    };

    try {
      if (editingProductId) {
        await updateProduct({
          productId: editingProductId,
          input: payload,
        });
      } else {
        await createProduct(payload);
      }
    } catch (error) {
      onError(getErrorMessage(error, "No pudimos guardar el producto."));
      onSavingChange(false);
      return;
    }

    onSuccess(editingProductId ? "Producto actualizado correctamente." : "Producto creado correctamente.");
  }, [
    createProduct,
    editingProductId,
    onError,
    onSavingChange,
    onSuccess,
    onUploadStatusChange,
    productForm,
    productImages,
    productModel3DFile,
    targetArtisanId,
    updateProduct,
  ]);

  return submitProductForm;
}

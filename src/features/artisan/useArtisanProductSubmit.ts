import { useCallback } from "react";

import type { ArtisanProduct, ArtisanProductInput } from "../../types/artisan";
import type {
  ProductBatchInput,
  ProductBatchMutationResult,
} from "../../types/productBatch";
import {
  isProductModel3DMediaItem,
  type ProductMediaItem,
} from "../../types/productMedia";
import {
  removeArtisanProductImages,
  syncArtisanBatchProductAttributes,
  syncArtisanBatchProductOptions,
  uploadArtisanProductModel,
  uploadArtisanProductImage,
} from "./artisanClient";
import type { ProductImageDraft } from "./imageEditorTypes";
import { resolveDraftProductData } from "./productDraftUtils";
import { validateArtisanProductDraft } from "./artisanProductValidation";
import { getErrorMessage } from "../../lib/errors";
import { compressImage, createProcessedImageFile } from "../../lib/compressImage";

type SubmitParams = {
  createBatch: (input: ProductBatchInput) => Promise<ProductBatchMutationResult>;
  createProduct: (input: ArtisanProductInput) => Promise<ArtisanProduct>;
  editingBatchId: string | null;
  editingOriginalImageUrls: string[];
  editingProductId: string | null;
  onError: (message: string) => void;
  onSavingChange: (isSaving: boolean) => void;
  onSuccess: (message: string, refreshed: boolean) => void;
  onUploadStatusChange: (message: string | null) => void;
  productForm: ArtisanProductInput;
  productImages: ProductImageDraft[];
  productModel3DFile: File | null;
  refreshProductsAndBatches: () => Promise<boolean>;
  splitProductsByImage: boolean;
  targetArtisanId: string | null;
  updateBatch: (payload: {
    batchId: string;
    input: ProductBatchInput;
  }) => Promise<ProductBatchMutationResult>;
  updateProduct: (payload: {
    input: ArtisanProductInput;
    productId: string;
  }) => Promise<ArtisanProduct>;
};

function getProductMediaStoredUrls(mediaItems: ProductMediaItem[]) {
  return Array.from(
    new Set(
      mediaItems
        .flatMap((item) => [item.url, item.original_url, item.thumbnail_url])
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

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

function buildBatchPayload(
  productForm: ArtisanProductInput,
  productImages: ProductImageDraft[],
  uploadedMedia: ProductMediaItem[],
  sanitizedAttributes: ArtisanProductInput["product_attributes"],
): ProductBatchInput {
  return {
    availability_mode_base: productForm.availability_mode,
    category_id: productForm.category_id,
    description_base: productForm.description,
    is_active_base: productForm.is_active,
    items: productImages.map((draft, index) => {
      const resolved = resolveDraftProductData(draft, productForm);

      return {
        description: resolved.description,
        existing_product_id: draft.existingProductId,
        image_description: uploadedMedia[index]?.description ?? "",
        image_url: uploadedMedia[index]?.url ?? "",
        product_media: uploadedMedia[index] ? [uploadedMedia[index]] : [],
        position: index + 1,
        price: resolved.price,
        stock_quantity: productForm.availability_mode === "stock" ? resolved.stockQuantity : null,
        title: resolved.title,
      };
    }),
    lead_time_days_base:
      productForm.availability_mode === "made_to_order" ? productForm.lead_time_days : null,
    made_to_order_options_base: productForm.made_to_order_options,
    price_base: Number(productForm.price),
    product_attributes_base: sanitizedAttributes,
    stock_quantity_base:
      productForm.availability_mode === "stock" ? productForm.stock_quantity ?? 0 : null,
    title_base: productForm.title,
  };
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

async function uploadProductMedia(params: {
  onUploadStatusChange: (message: string | null) => void;
  productImages: ProductImageDraft[];
  targetArtisanId: string;
}) {
  const { onUploadStatusChange, productImages, targetArtisanId } = params;
  const uploadedMedia: ProductMediaItem[] = [];
  const newUploadedUrls: string[] = [];
  const draftsToUpload = productImages.filter(
    (draft) => draft.previewUrl && (draft.file || draft.isEdited),
  );
  const totalUploads = draftsToUpload.length;
  let uploadCount = 0;

  try {
    for (const draft of productImages) {
      if (!draft.previewUrl) {
        continue;
      }

      if (!draft.file && !draft.isEdited) {
        uploadedMedia.push({
          crop: draft.originalUrl ? draft.crop : null,
          description: draft.description.trim(),
          original_url: draft.originalUrl,
          thumbnail_url: draft.thumbnailUrl,
          url: draft.mediaUrl ?? draft.previewUrl,
        });
        continue;
      }

      uploadCount += 1;
      onUploadStatusChange(`Subiendo foto ${uploadCount} de ${totalUploads}...`);

      let originalImageUrl = draft.originalUrl;

      if (draft.file) {
        const originalUploadResponse = await uploadArtisanProductImage(targetArtisanId, draft.file);

        if (originalUploadResponse.error || !originalUploadResponse.data) {
          throw new Error(
            originalUploadResponse.error?.message ?? "No pudimos subir la foto original.",
          );
        }

        originalImageUrl = originalUploadResponse.data.publicUrl;
        newUploadedUrls.push(originalUploadResponse.data.publicUrl);
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

      newUploadedUrls.push(uploadResponse.data.publicUrl);

      const thumbnailUploadResponse = await uploadProductThumbnail(targetArtisanId, draft);

      if (thumbnailUploadResponse.error || !thumbnailUploadResponse.data) {
        throw new Error(
          thumbnailUploadResponse.error?.message ?? "No pudimos subir la miniatura de una foto.",
        );
      }

      newUploadedUrls.push(thumbnailUploadResponse.data.publicUrl);

      uploadedMedia.push({
        crop: draft.crop,
        description: draft.description.trim(),
        original_url: originalImageUrl ?? null,
        thumbnail_url: thumbnailUploadResponse.data.publicUrl,
        url: uploadResponse.data.publicUrl,
      });
    }
  } catch (error) {
    if (newUploadedUrls.length > 0) {
      await removeArtisanProductImages(newUploadedUrls);
    }
    throw error;
  }

  onUploadStatusChange(null);

  return {
    newUploadedUrls,
    uploadedMedia,
  };
}

export function useArtisanProductSubmit({
  createBatch,
  createProduct,
  editingBatchId,
  editingOriginalImageUrls,
  editingProductId,
  onError,
  onSavingChange,
  onSuccess,
  onUploadStatusChange,
  productForm,
  productImages,
  productModel3DFile,
  refreshProductsAndBatches,
  splitProductsByImage,
  targetArtisanId,
  updateBatch,
  updateProduct,
}: SubmitParams) {
  const submitProductForm = useCallback(async () => {
    if (!targetArtisanId) {
      return;
    }

    const validation = validateArtisanProductDraft({
      productForm,
      productImages,
      splitProductsByImage,
    });

    if (validation.errorMessage) {
      onError(validation.errorMessage);
      return;
    }

    onSavingChange(true);
    onUploadStatusChange(null);

    let newUploadedUrls: string[] = [];
    let uploadedMedia: ProductMediaItem[] = [];
    let uploadedModelMedia: ProductMediaItem | null = null;

    try {
      const uploadResult = await uploadProductMedia({
        onUploadStatusChange,
        productImages,
        targetArtisanId,
      });

      newUploadedUrls = uploadResult.newUploadedUrls;
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

        newUploadedUrls.push(modelUploadResponse.data.publicUrl);
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
      if (newUploadedUrls.length > 0) {
        await removeArtisanProductImages(newUploadedUrls);
      }
      onError(getErrorMessage(error, "No pudimos preparar una de las fotos."));
      onUploadStatusChange(null);
      onSavingChange(false);
      return;
    }

    if (splitProductsByImage) {
      let batchResult: ProductBatchMutationResult;

      try {
        const batchPayload = buildBatchPayload(
          productForm,
          productImages,
          uploadedMedia,
          validation.sanitizedAttributes,
        );

        batchResult = editingBatchId
          ? await updateBatch({
              batchId: editingBatchId,
              input: batchPayload,
            })
          : await createBatch(batchPayload);
      } catch (error) {
        if (newUploadedUrls.length > 0) {
          await removeArtisanProductImages(newUploadedUrls);
        }
        onError(getErrorMessage(error, "No pudimos guardar el grupo de productos."));
        onSavingChange(false);
        return;
      }

      if ((batchResult.obsolete_image_urls?.length ?? 0) > 0) {
        await removeArtisanProductImages(batchResult.obsolete_image_urls);
      }

      const attributesSyncResponse = await syncArtisanBatchProductAttributes(
        batchResult.batch_id,
        batchResult.product_ids ?? [],
        validation.sanitizedAttributes,
      );
      const optionsSyncResponse = await syncArtisanBatchProductOptions(
        batchResult.batch_id,
        batchResult.product_ids ?? [],
        productForm.made_to_order_options,
      );
      const syncError = attributesSyncResponse.error ?? optionsSyncResponse.error;
      const refreshed = await refreshProductsAndBatches();

      if (syncError) {
        onSuccess(
          `Grupo guardado, pero no pudimos completar la sincronizacion secundaria: ${getErrorMessage(syncError, "revisá atributos y opciones del grupo.")}`,
          refreshed,
        );
        return;
      }

      onSuccess(
        editingBatchId
          ? "Grupo actualizado correctamente."
          : `${productImages.length} producto(s) creados en un nuevo grupo.`,
        refreshed,
      );
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
      if (newUploadedUrls.length > 0) {
        await removeArtisanProductImages(newUploadedUrls);
      }
      onError(getErrorMessage(error, "No pudimos guardar el producto."));
      onSavingChange(false);
      return;
    }

    const refreshed = await refreshProductsAndBatches();

    if (editingProductId) {
      const removedUrls = editingOriginalImageUrls.filter(
        (imageUrl) => !getProductMediaStoredUrls(uploadedMedia).includes(imageUrl),
      );

      if (removedUrls.length > 0) {
        await removeArtisanProductImages(removedUrls);
      }
    }

    onSuccess(
      editingProductId ? "Producto actualizado correctamente." : "Producto creado correctamente.",
      refreshed,
    );
  }, [
    createBatch,
    createProduct,
    editingBatchId,
    editingOriginalImageUrls,
    editingProductId,
    onError,
    onSavingChange,
    onSuccess,
    onUploadStatusChange,
    productForm,
    productImages,
    productModel3DFile,
    refreshProductsAndBatches,
    splitProductsByImage,
    targetArtisanId,
    updateBatch,
    updateProduct,
  ]);

  return submitProductForm;
}

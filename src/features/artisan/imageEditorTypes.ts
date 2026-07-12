import type { ImageCropSettings } from "../../lib/compressImage";

export type SelectedImageDimensions = {
  height: number;
  width: number;
};

export type ProductImageDraft = {
  crop: ImageCropSettings;
  description: string;
  dimensions: SelectedImageDimensions | null;
  existingProductId: string | null;
  file: File | null;
  id: string;
  isEdited: boolean;
  mediaUrl: string | null;
  originalUrl: string | null;
  productDescription: string;
  productPrice: number | null;
  productStockQuantity: number | null;
  productTitle: string;
  previewUrl: string;
  sourceUrl: string;
  thumbnailUrl: string | null;
  useCustomProductData: boolean;
};

import type { ImageCropSettings } from "../../lib/compressImage";

export type SelectedImageDimensions = { height: number; width: number };

export type ProductImageDraft = {
  crop: ImageCropSettings;
  description: string;
  dimensions: SelectedImageDimensions | null;
  file: File | null;
  id: string;
  isEdited: boolean;
  mediaUrl: string | null;
  originalUrl: string | null;
  previewUrl: string;
  sourceUrl: string;
  thumbnailUrl: string | null;
};

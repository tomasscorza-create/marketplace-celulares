import type { ImageCropSettings } from "../lib/compressImage";

export type ProductMediaType = "image" | "model_3d";

type ProductMediaBase = {
  crop?: ImageCropSettings | null;
  description: string;
  format?: "glb" | "gltf" | string | null;
  original_url?: string | null;
  poster_url?: string | null;
  size_bytes?: number | null;
  thumbnail_url?: string | null;
  url: string;
};

export type ProductImageMediaItem = ProductMediaBase & {
  type?: "image" | null;
};

export type ProductModel3DMediaItem = ProductMediaBase & {
  type: "model_3d";
};

export type ProductMediaItem = ProductImageMediaItem | ProductModel3DMediaItem;

function getMediaUrlExtension(url: string) {
  const cleanUrl = url.split("?")[0]?.split("#")[0]?.toLowerCase() ?? "";

  return cleanUrl.slice(cleanUrl.lastIndexOf(".") + 1);
}

export function isProductModel3DMediaItem(
  mediaItem: ProductMediaItem,
): mediaItem is ProductModel3DMediaItem {
  const extension = getMediaUrlExtension(mediaItem.url);

  return mediaItem.type === "model_3d" || extension === "glb" || extension === "gltf";
}

export function isProductImageMediaItem(
  mediaItem: ProductMediaItem,
): mediaItem is ProductImageMediaItem {
  return !isProductModel3DMediaItem(mediaItem);
}

export function getProductImageMediaItems(mediaItems: ProductMediaItem[] = []) {
  return mediaItems.filter(isProductImageMediaItem);
}

export function getPrimaryProductModel3D(mediaItems: ProductMediaItem[] = []) {
  return mediaItems.find(isProductModel3DMediaItem) ?? null;
}

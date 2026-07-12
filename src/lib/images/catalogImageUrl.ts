const SUPABASE_PUBLIC_OBJECT_PATH = "/storage/v1/object/public/";
const SUPABASE_RENDER_IMAGE_PATH = "/storage/v1/render/image/public/";
const ENABLE_SUPABASE_IMAGE_TRANSFORMS =
  import.meta.env.VITE_ENABLE_SUPABASE_IMAGE_TRANSFORMS === "true";

function normalizeWidth(width: number) {
  return Math.max(80, Math.min(1600, Math.round(width)));
}

function normalizeQuality(quality: number) {
  return Math.max(45, Math.min(85, Math.round(quality)));
}

export function getOptimizedCatalogImageUrl(
  src: string | null | undefined,
  width: number,
  quality = 72,
) {
  if (!src) {
    return "";
  }

  if (!ENABLE_SUPABASE_IMAGE_TRANSFORMS) {
    return src;
  }

  try {
    const url = new URL(src);
    const normalizedWidth = normalizeWidth(width);
    const normalizedQuality = normalizeQuality(quality);

    if (url.pathname.includes(SUPABASE_RENDER_IMAGE_PATH)) {
      url.searchParams.set("width", String(normalizedWidth));
      url.searchParams.set("quality", String(normalizedQuality));
      url.searchParams.set("resize", "cover");
      return url.toString();
    }

    const objectPathIndex = url.pathname.indexOf(SUPABASE_PUBLIC_OBJECT_PATH);

    if (objectPathIndex === -1) {
      return src;
    }

    const bucketAndObjectPath = url.pathname.slice(
      objectPathIndex + SUPABASE_PUBLIC_OBJECT_PATH.length,
    );
    url.pathname = `${url.pathname.slice(0, objectPathIndex)}${SUPABASE_RENDER_IMAGE_PATH}${bucketAndObjectPath}`;
    url.searchParams.set("width", String(normalizedWidth));
    url.searchParams.set("quality", String(normalizedQuality));
    url.searchParams.set("resize", "cover");

    return url.toString();
  } catch {
    return src;
  }
}

export function getCatalogImageSrcSet(
  src: string | null | undefined,
  widths: number[],
  quality = 72,
) {
  if (!src) {
    return undefined;
  }

  if (!ENABLE_SUPABASE_IMAGE_TRANSFORMS) {
    return undefined;
  }

  const uniqueWidths = Array.from(new Set(widths.map(normalizeWidth))).sort((left, right) => left - right);

  if (uniqueWidths.length === 0) {
    return undefined;
  }

  return uniqueWidths
    .map((width) => `${getOptimizedCatalogImageUrl(src, width, quality)} ${width}w`)
    .join(", ");
}

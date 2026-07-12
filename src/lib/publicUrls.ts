import { marketplaceConfig } from "../config/marketplace";

const DEFAULT_PUBLIC_SITE_ORIGIN = marketplaceConfig.defaultPublicUrl;

function normalizePublicOrigin(value: string | undefined) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return DEFAULT_PUBLIC_SITE_ORIGIN;
  }

  const withProtocol = /^https?:\/\//i.test(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    return DEFAULT_PUBLIC_SITE_ORIGIN;
  }
}

export const PUBLIC_SITE_ORIGIN = normalizePublicOrigin(import.meta.env.VITE_PUBLIC_SITE_URL);

export function buildPublicMarketplaceUrl() {
  return new URL("/catalogo", PUBLIC_SITE_ORIGIN).toString();
}

export function buildPublicArtisanProfileUrl(artisanId: string) {
  return new URL(`/vendedor/${encodeURIComponent(artisanId)}`, PUBLIC_SITE_ORIGIN).toString();
}

export function buildPublicProductDetailUrl(productId: string) {
  return new URL(`/producto/${encodeURIComponent(productId)}`, PUBLIC_SITE_ORIGIN).toString();
}

export function buildUrlFileSlug(value: string) {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "vendedor";
}

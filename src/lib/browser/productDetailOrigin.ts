type ProductDetailOrigin = {
  savedAt: number;
  scrollY: number;
  url: string;
};

type LocationLike = {
  hash?: string;
  pathname: string;
  search?: string;
};

const PRODUCT_DETAIL_ORIGIN_KEY = "neutral-marketplace:product-detail-origin";
const PRODUCT_DETAIL_PENDING_RETURN_KEY = "neutral-marketplace:product-detail-pending-return";
const PRODUCT_DETAIL_ORIGIN_MAX_AGE_MS = 1000 * 60 * 30;

function buildUrl(location: LocationLike) {
  return `${location.pathname}${location.search ?? ""}${location.hash ?? ""}`;
}

function isProductDetailOrigin(value: unknown): value is ProductDetailOrigin {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ProductDetailOrigin>;
  return (
    typeof candidate.savedAt === "number" &&
    typeof candidate.scrollY === "number" &&
    typeof candidate.url === "string"
  );
}

function readStoredOrigin(storageKey: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(storageKey);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!isProductDetailOrigin(parsedValue)) {
      window.sessionStorage.removeItem(storageKey);
      return null;
    }

    if (Date.now() - parsedValue.savedAt > PRODUCT_DETAIL_ORIGIN_MAX_AGE_MS) {
      window.sessionStorage.removeItem(storageKey);
      return null;
    }

    return parsedValue;
  } catch {
    window.sessionStorage.removeItem(storageKey);
    return null;
  }
}

export function saveProductDetailOrigin(location: LocationLike) {
  if (typeof window === "undefined") {
    return;
  }

  const origin: ProductDetailOrigin = {
    savedAt: Date.now(),
    scrollY: window.scrollY,
    url: buildUrl(location),
  };

  window.sessionStorage.setItem(PRODUCT_DETAIL_ORIGIN_KEY, JSON.stringify(origin));
}

export function getProductDetailOrigin() {
  return readStoredOrigin(PRODUCT_DETAIL_ORIGIN_KEY);
}

export function queueProductDetailReturn(origin: ProductDetailOrigin) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(PRODUCT_DETAIL_PENDING_RETURN_KEY, JSON.stringify(origin));
}

export function consumePendingProductDetailReturn(location: LocationLike) {
  const pendingOrigin = readStoredOrigin(PRODUCT_DETAIL_PENDING_RETURN_KEY);

  if (!pendingOrigin) {
    return null;
  }

  if (pendingOrigin.url !== buildUrl(location)) {
    return null;
  }

  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(PRODUCT_DETAIL_PENDING_RETURN_KEY);
  }

  return pendingOrigin;
}

export function restorePendingProductDetailScroll(scrollY: number) {
  if (typeof window === "undefined") {
    return;
  }

  let attempts = 0;

  const applyScroll = () => {
    attempts += 1;
    window.scrollTo({ top: scrollY, behavior: "auto" });

    const maxReachableScroll = Math.max(
      document.documentElement.scrollHeight - window.innerHeight,
      0,
    );

    if (maxReachableScroll >= scrollY || attempts >= 60) {
      return;
    }

    window.requestAnimationFrame(applyScroll);
  };

  window.requestAnimationFrame(applyScroll);
}

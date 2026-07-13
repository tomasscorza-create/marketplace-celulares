import { memo, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { saveProductDetailOrigin } from "../../../lib/browser/productDetailOrigin";
import {
  getCatalogImageSrcSet,
  getOptimizedCatalogImageUrl,
} from "../../../lib/images/catalogImageUrl";
import { getProductImageMediaItems } from "../../../types/productMedia";
import type { PublicProduct } from "../../../types/public";
import { AddToCartButton } from "../../buyer/components/AddToCartButton";
import { isOnlinePurchaseEnabled } from "../../../config/marketplace";
import { WhatsAppProductButton } from "../../../components/WhatsAppProductButton";

type CatalogStorefrontProductCardProps = {
  product: PublicProduct;
};

const priceFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
});

const railBuyActionClassName =
  "inline-flex h-7 min-w-[5.25rem] max-w-[6.75rem] items-center justify-center whitespace-nowrap rounded-md px-2.5 text-[11px]";

const railPriceClassName = "block text-sm font-semibold leading-none text-stone-950";

function CatalogStorefrontProductCardInner({ product }: CatalogStorefrontProductCardProps) {
  const location = useLocation();
  const primaryMedia = getProductImageMediaItems(product.product_media)[0] ?? null;
  const primaryImage =
    primaryMedia?.thumbnail_url ??
    primaryMedia?.url ??
    product.image_urls[0] ??
    product.image_url;
  const primaryImageFallback =
    primaryMedia
      ? primaryMedia.thumbnail_url && primaryMedia.url !== primaryImage
        ? primaryMedia.url
        : primaryMedia.original_url && primaryMedia.original_url !== primaryImage
          ? primaryMedia.original_url
          : null
      : null;
  const [useDirectImage, setUseDirectImage] = useState(false);
  const [useFallbackImage, setUseFallbackImage] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);
  const activeImage = useFallbackImage && primaryImageFallback ? primaryImageFallback : primaryImage;
  const optimizedActiveImage = getOptimizedCatalogImageUrl(activeImage, 360, 70);
  const activeImageSrc = useDirectImage ? activeImage : optimizedActiveImage;
  const activeImageSrcSet = useDirectImage
    ? undefined
    : getCatalogImageSrcSet(activeImage, [220, 320, 420], 70);
  const categoryLabel = product.categories?.name ?? "General";
  const isMadeToOrder = product.availability_mode === "made_to_order";
  const isSoldOut = !isMadeToOrder && Number(product.stock_quantity ?? 0) <= 0;
  const handleOpenProductDetail = () => {
    saveProductDetailOrigin(location);
  };

  useEffect(() => {
    setUseDirectImage(false);
    setUseFallbackImage(false);
    setHasImageError(false);
  }, [primaryImage, primaryImageFallback]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const retryImage = () => {
      setHasImageError(false);
    };
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        retryImage();
      }
    };

    window.addEventListener("online", retryImage);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("online", retryImage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <article className="catalog-card group flex w-[148px] shrink-0 snap-start flex-col rounded-xl border border-stone-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-ocean-300 hover:shadow-elev-3 active:scale-[0.995] [content-visibility:auto] [contain-intrinsic-size:230px] sm:w-[164px] lg:w-[176px]">
      <Link className="group flex flex-1 flex-col" onClick={handleOpenProductDetail} to={`/producto/${product.id}`}>
        <div className="relative overflow-hidden rounded-t-xl border-b border-stone-100">
          {primaryImage && !hasImageError ? (
            <div className="relative aspect-[1/1] w-full overflow-hidden bg-ocean-50">
              <img
                alt={product.title}
                className="h-full w-full object-cover object-center transition-transform duration-300 ease-out group-hover:scale-[1.025]"
                decoding="async"
                key={activeImage}
                loading="lazy"
                onError={() => {
                  if (!useDirectImage && optimizedActiveImage !== activeImage) {
                    setUseDirectImage(true);
                    return;
                  }

                  if (primaryImageFallback && !useFallbackImage) {
                    setUseDirectImage(false);
                    setUseFallbackImage(true);
                    return;
                  }

                  setHasImageError(true);
                }}
                sizes="(max-width: 640px) 42vw, 176px"
                src={activeImageSrc}
                srcSet={activeImageSrcSet}
              />
            </div>
          ) : (
            <div className="flex aspect-[1/1] items-center justify-center bg-ocean-50 px-3 text-center text-xs font-semibold text-ocean-500">
              {categoryLabel}
            </div>
          )}

          {primaryImage && !hasImageError ? (
            <span className="absolute left-1.5 top-1.5 max-w-[72%] truncate rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-ocean-600 shadow-sm backdrop-blur-sm">
              {categoryLabel}
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-1 px-2 pb-1 pt-1.5">
          <h3 className="line-clamp-2 min-h-[1.95rem] text-[12px] font-medium leading-[1.2] text-stone-900 transition-colors group-hover:text-ocean-500 sm:text-[13px]">
            {product.title}
          </h3>
          <span className={railPriceClassName}>
            ${priceFormatter.format(Number(product.price))}
          </span>
        </div>
      </Link>

      <div className="flex justify-end px-2 pb-1.5">
        {!isOnlinePurchaseEnabled ? (
          <WhatsAppProductButton
            product={{
              id: product.id,
              title: product.title,
              price: Number(product.price),
            }}
            variant="compact"
            className={railBuyActionClassName}
            label={isSoldOut ? "Consultar" : "WhatsApp"}
          />
        ) : (
          <AddToCartButton
            className={railBuyActionClassName}
            disabled={isSoldOut}
            disabledLabel="Sin stock"
            labels={{
              added: "Carrito",
              buyerOnlyNotice: "Ingresa como comprador para comprar",
              idle: "Comprar",
              login: "Ingresar",
              pending: "Agregando",
            }}
            product={product}
          />
        )}
      </div>
    </article>
  );
}

export const CatalogStorefrontProductCard = memo(CatalogStorefrontProductCardInner);

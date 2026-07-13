import { memo, useCallback, useMemo, useRef, type MouseEvent as ReactMouseEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { ProductImageCarousel } from "../../../components/ProductImageCarousel";
import { saveProductDetailOrigin } from "../../../lib/browser/productDetailOrigin";
import { getProductImageMediaItems } from "../../../types/productMedia";
import type { PublicCatalogFeedItem } from "../../../types/public";

const CARD_ZOOM_DURATION_MS = 180;

type CatalogProductFeedCardProps = {
  featuredExtraAction?: {
    label: string;
    onClick?: () => void;
    to?: string;
  };
  isLiteMode?: boolean;
  item: PublicCatalogFeedItem;
  layout?: "default" | "featured";
  /**
   * Si es true, la primera imagen se carga con prioridad alta (eager + fetchPriority="high").
   * Usar SOLO para cards above-the-fold (showcase principal, primera fila).
   */
  priority?: boolean;
};

const priceFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
});

const storeActionClassName =
  "inline-flex h-7 min-w-0 items-center justify-start rounded-md px-1.5 text-[10px] font-medium text-ocean-500 transition-colors hover:bg-brand-50 hover:text-brand-600 sm:text-[11px]";

const featuredBuyActionClassName =
  "inline-flex h-8 w-full min-w-0 items-center justify-center whitespace-nowrap rounded-lg bg-gradient-to-r from-brand-500 to-brand-700 px-3 text-xs font-semibold text-white shadow-elev-1 transition-all hover:-translate-y-0.5 hover:shadow-elev-2 sm:h-9 sm:px-3.5 sm:text-[13px]";

const compactBuyActionClassName =
  "inline-flex h-7 min-w-[4.9rem] items-center justify-center whitespace-nowrap rounded-md bg-gradient-to-r from-brand-500 to-brand-700 px-2.5 text-[11px] font-semibold text-white shadow-elev-1 transition-all hover:-translate-y-0.5 hover:shadow-elev-2 sm:min-w-[5.25rem] sm:text-xs";

const extraActionClassName =
  "inline-flex h-8 w-full min-w-0 items-center justify-center whitespace-nowrap rounded-lg border border-stone-200 bg-white px-3 text-xs font-semibold text-ocean-700 transition-colors hover:border-stone-300 hover:bg-stone-50 sm:h-9 sm:px-3.5 sm:text-[13px]";

const priceTextClassName =
  "block text-sm font-semibold leading-none text-stone-950 sm:text-[15px]";

const categoryOverlayClassName =
  "pointer-events-none absolute left-2 top-2 z-[5] max-w-[70%] truncate rounded bg-white/95 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-ocean-700 shadow-sm backdrop-blur-sm sm:text-[10px]";

function CatalogProductFeedCardInner({
  featuredExtraAction,
  isLiteMode = false,
  item,
  layout = "default",
  priority = false,
}: CatalogProductFeedCardProps) {
  const location = useLocation();
  const { product, storefront } = item;
  const storefrontLabel = storefront?.store_name || storefront?.full_name || "Vendedor local";
  const categoryLabel = product.categories?.name ?? "General";
  const isFeatured = layout === "featured";
  const productImages = useMemo(() => {
    const imageMediaItems = getProductImageMediaItems(product.product_media);
    const urls =
      imageMediaItems.length > 0
        ? imageMediaItems.map((mediaItem) => {
            const imageUrl = mediaItem.thumbnail_url ?? mediaItem.url;
            const fallbackUrl =
              mediaItem.thumbnail_url && mediaItem.url !== imageUrl
                ? mediaItem.url
                : mediaItem.original_url && mediaItem.original_url !== imageUrl
                  ? mediaItem.original_url
                  : undefined;

            return {
              alt: mediaItem.description || product.title,
              fallbackUrl,
              url: imageUrl,
            };
          })
        : (product.image_urls.filter(Boolean).length > 0
            ? product.image_urls.filter(Boolean)
            : product.image_url
              ? [product.image_url]
              : []
          ).map((url, index) => ({
            alt: `${product.title} ${index + 1}`,
            url,
          }));

    return urls.filter((itemValue) => Boolean(itemValue.url));
  }, [product]);
  const boostCardClassName = item.isBoosted
    ? "border-brand-300 bg-brand-50/45 hover:border-brand-400"
    : "";
  const boostImageShellClassName = item.isBoosted
    ? "bg-brand-50/50"
    : "bg-white/30";
  const navigate = useNavigate();
  const cardRef = useRef<HTMLElement | null>(null);
  const handleOpenProductDetail = () => {
    saveProductDetailOrigin(location);
  };
  const handleZoomNavigate = useCallback(
    (event: ReactMouseEvent<HTMLAnchorElement>, to: string) => {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      ) {
        return;
      }
      if (
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }
      const card = cardRef.current;
      if (!card) {
        return;
      }
      event.preventDefault();
      card.classList.add("catalog-card-zoom");
      window.setTimeout(() => {
        navigate(to);
      }, CARD_ZOOM_DURATION_MS);
    },
    [navigate],
  );
  const priceLabel = `$${priceFormatter.format(Number(product.price))}`;

  if (isFeatured) {
    return (
      <article
        className={[
          "catalog-card group/focus flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br from-ocean-50/90 to-brand-50/90 shadow-elev-2 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/90 hover:from-ocean-100/95 hover:to-brand-100/95 hover:shadow-elev-3 active:scale-[0.995] sm:grid sm:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]",
          boostCardClassName,
        ].join(" ")}
        ref={cardRef}
      >
        {/* Imagen a borde completo, con degradado integrado al cuerpo. */}
        <Link
          aria-label={`Ver detalle de ${product.title}`}
          className={[
            "group relative overflow-hidden border-b border-stone-100 sm:border-b-0 sm:border-r",
            boostImageShellClassName,
          ].join(" ")}
          onClick={(event) => {
            handleOpenProductDetail();
            handleZoomNavigate(event, `/producto/${product.id}`);
          }}
          to={`/producto/${product.id}`}
        >
          {productImages.length > 0 ? (
            <>
              <ProductImageCarousel
              autoAdvance={!isLiteMode && productImages.length > 2}
              autoAdvanceDelay={6500}
              autoAdvanceMinImages={3}
              className="w-full"
              imageClassName="aspect-[3/2] w-full object-cover object-center transition-transform duration-300 ease-out group-hover:scale-[1.025] sm:aspect-[4/3]"
              imageSizes="(max-width: 640px) 92vw, (max-width: 1280px) 54vw, 640px"
              imageSrcSetWidths={[480, 640, 768, 960, 1200]}
              imageWidth={priority ? 960 : 720}
              images={productImages}
              maxImages={isLiteMode ? 1 : 4}
              priority={priority}
              />
              <span className={categoryOverlayClassName}>{categoryLabel}</span>
            </>
          ) : (
            <div className="flex min-h-[8rem] items-center justify-center px-4 py-6 text-center text-base font-semibold text-ocean-500 sm:min-h-[10rem] lg:min-h-[11rem]">
              {product.title}
            </div>
          )}
        </Link>

        <div className="flex flex-1 min-w-0 flex-col gap-1.5 p-2.5 sm:p-3">
        <Link
          aria-label={`Ver detalle de ${product.title}`}
          className="group min-w-0"
          onClick={(event) => {
            handleOpenProductDetail();
            handleZoomNavigate(event, `/producto/${product.id}`);
          }}
          to={`/producto/${product.id}`}
        >
          <h3 className="line-clamp-2 text-sm font-medium leading-tight text-stone-900 transition-colors group-hover:text-ocean-700 sm:text-base">
            {product.title}
          </h3>
          <span className={`${priceTextClassName} mt-0.5`}>{priceLabel}</span>
          <p className="mt-1 line-clamp-1 text-[10px] leading-[1.3] text-stone-500 sm:text-xs">
            {product.description || "Entrá al detalle para ver más información."}
          </p>
          </Link>

          <div className="mt-auto grid min-w-0 gap-1">
            <Link
              aria-label={`Ver la tienda de ${storefrontLabel}`}
              className={storeActionClassName}
              onClick={(event) => {
                handleZoomNavigate(event, `/vendedor/${product.artisan_id}`);
              }}
              title={storefrontLabel}
              to={`/vendedor/${product.artisan_id}`}
            >
              <span className="truncate">{storefrontLabel}</span>
            </Link>

            <Link
              className={featuredBuyActionClassName}
              onClick={(event) => {
                handleOpenProductDetail();
                handleZoomNavigate(event, `/producto/${product.id}`);
              }}
              to={`/producto/${product.id}`}
            >
              Ver detalle
            </Link>

            {featuredExtraAction?.to ? (
              <Link
                className={extraActionClassName}
                to={featuredExtraAction.to}
              >
                {featuredExtraAction.label}
              </Link>
            ) : null}

            {featuredExtraAction?.onClick ? (
              <button
                className={extraActionClassName}
                data-testid="catalog-featured-extra-action-button"
                onClick={featuredExtraAction.onClick}
                type="button"
              >
                {featuredExtraAction.label}
              </button>
            ) : null}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={[
        "catalog-card group/focus flex h-full min-w-0 flex-col rounded-2xl border border-white/70 bg-gradient-to-br from-ocean-50/90 to-brand-50/90 shadow-elev-2 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/90 hover:from-ocean-100/95 hover:to-brand-100/95 hover:shadow-elev-3 active:scale-[0.995] [content-visibility:auto] [contain-intrinsic-size:260px]",
        boostCardClassName,
      ].join(" ")}
      ref={cardRef}
    >
      <Link
        aria-label={`Ver detalle de ${product.title}`}
        className="group flex flex-1 flex-col"
        onClick={(event) => {
          handleOpenProductDetail();
          handleZoomNavigate(event, `/producto/${product.id}`);
        }}
        to={`/producto/${product.id}`}
      >
        <div
          className={[
            "relative overflow-hidden rounded-t-xl border-b border-stone-100",
            boostImageShellClassName,
          ].join(" ")}
        >
          {productImages.length > 0 ? (
            <>
              <ProductImageCarousel
              autoAdvance={false}
              className="w-full"
              imageClassName="aspect-[5/4] w-full object-cover object-center transition-transform duration-300 ease-out group-hover:scale-[1.025] sm:aspect-[4/3]"
              imageSizes="(max-width: 640px) 92vw, (max-width: 1280px) 46vw, 320px"
              imageSrcSetWidths={[240, 320, 420, 560, 720]}
              imageWidth={priority ? 720 : 520}
              images={productImages}
              maxImages={isLiteMode ? 1 : 4}
              priority={priority}
              />
              <span className={categoryOverlayClassName}>{categoryLabel}</span>
            </>
          ) : (
            <div className="flex aspect-[5/4] items-center justify-center px-3 text-center text-xs font-semibold text-ocean-500 sm:aspect-[4/3]">
              {product.title}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1 px-2.5 pb-0 pt-2 sm:px-3">
          <h3 className="line-clamp-2 min-h-[2rem] text-[13px] font-medium leading-[1.18] text-stone-900 transition-colors group-hover:text-ocean-700 sm:text-[14px]">
            {product.title}
          </h3>
          <span className={priceTextClassName}>{priceLabel}</span>
        </div>
      </Link>

      <div className="flex min-w-0 items-center gap-1.5 px-2.5 pb-2 pt-1 sm:px-3">
        <Link
          aria-label={`Ver la tienda de ${storefrontLabel}`}
          className={`${storeActionClassName} flex-1`}
          onClick={(event) => {
            handleZoomNavigate(event, `/vendedor/${product.artisan_id}`);
          }}
          title={storefrontLabel}
          to={`/vendedor/${product.artisan_id}`}
        >
          <span className="truncate">{storefrontLabel}</span>
        </Link>

        <Link
          className={compactBuyActionClassName}
          onClick={(event) => {
            handleOpenProductDetail();
            handleZoomNavigate(event, `/producto/${product.id}`);
          }}
          to={`/producto/${product.id}`}
        >
          Ver detalle
        </Link>
      </div>
    </article>
  );
}

export const CatalogProductFeedCard = memo(CatalogProductFeedCardInner);

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { DownloadableQr } from "../components/DownloadableQr";
import { PagePlaceholder } from "../components/PagePlaceholder";
import { isOnlinePurchaseEnabled } from "../config/marketplace";
import { WhatsAppProductButton } from "../components/WhatsAppProductButton";
import { ProductImageCarousel } from "../components/ProductImageCarousel";
import { useAuth } from "../features/auth/useAuth";
import { AddToCartButton } from "../features/buyer/components/AddToCartButton";
import { useUpdateCartItemSelection } from "../features/buyer/cartQueries";
import {
  useBuyerFavorites,
  useToggleBuyerFavorite,
} from "../features/buyer/buyerQueries";
import {
  usePublicProduct,
  usePublicStorefront,
} from "../features/public/publicQueries";
import { trackCatalogProductView } from "../lib/browser/catalogActivity";
import {
  getProductDetailOrigin,
  queueProductDetailReturn,
} from "../lib/browser/productDetailOrigin";
import {
  getCatalogImageSrcSet,
  getOptimizedCatalogImageUrl,
} from "../lib/images/catalogImageUrl";
import {
  calculateOptionPriceModifiers,
  createProductConfigurationKey,
  createSelectedOptionsSummary,
  type ProductSelectionChoice,
} from "../types/productAvailability";
import { getProductImageMediaItems } from "../types/productMedia";
import { buildPublicProductDetailUrl, buildUrlFileSlug } from "../lib/publicUrls";

type DetailSectionCardProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
  toneClassName?: string;
  trailing?: React.ReactNode;
  trailingClassName?: string;
};

function DetailSectionCard({
  eyebrow,
  title,
  description,
  children,
  toneClassName = "",
  trailing,
  trailingClassName = "right-4 top-4 sm:right-5 sm:top-5",
}: DetailSectionCardProps) {
  return (
    <section
      className={[
        "relative overflow-hidden rounded-3xl border border-stone-200/90 bg-[linear-gradient(165deg,rgba(255,255,255,0.98),rgba(249,246,240,0.96)_52%,rgba(237,243,255,0.94))] p-4 shadow-[0_28px_58px_-40px_rgba(15,23,42,0.35)] ring-1 ring-white/70 sm:p-5",
        toneClassName,
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-x-8 top-0 h-16 rounded-full bg-white/55 blur-3xl" />
      {trailing ? <div className={`absolute z-10 ${trailingClassName}`}>{trailing}</div> : null}
      {eyebrow ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-ocean-500 sm:text-xl">{title}</h2>
      {description ? <p className="mt-1.5 text-sm leading-6 text-stone-600">{description}</p> : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </section>
  );
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, role, user } = useAuth();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isDetailAutoplayEnabled, setIsDetailAutoplayEnabled] = useState(true);
  const [isGalleryNavigating, setIsGalleryNavigating] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const thumbnailStripRef = useRef<HTMLDivElement | null>(null);
  const galleryNavigationTimeoutRef = useRef<number | null>(null);
  const productQuery = usePublicProduct(id, { enabled: Boolean(id) });
  const product = productQuery.data ?? null;
  const storefrontQuery = usePublicStorefront(product?.artisan_id, {
    enabled: Boolean(product?.artisan_id),
  });
  const storefront = storefrontQuery.data ?? null;
  const hasSelectableOptions = Boolean(product?.made_to_order_options.length);
  const cartEditState =
    typeof location.state === "object" &&
    location.state !== null &&
    "cartEdit" in location.state &&
    location.state.cartEdit &&
    typeof location.state.cartEdit === "object"
      ? (location.state.cartEdit as {
          cartItemId: string;
          quantity: number;
          returnTo: string;
          selectedOptions?: ProductSelectionChoice[];
        })
      : null;
  const isLoading = productQuery.isLoading || storefrontQuery.isLoading;
  const errorMessage = !id
    ? "No encontramos el producto solicitado."
    : productQuery.error
      ? productQuery.error.message
      : storefrontQuery.error
        ? storefrontQuery.error.message
        : null;

  useEffect(() => {
    setSelectedImageIndex(0);
    setIsDetailAutoplayEnabled(true);
  }, [product?.id]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (galleryNavigationTimeoutRef.current !== null) {
        window.clearTimeout(galleryNavigationTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const strip = thumbnailStripRef.current;
    if (!strip) {
      return;
    }

    const activeThumbnail = strip.querySelector<HTMLButtonElement>(
      `[data-thumbnail-index="${selectedImageIndex}"]`,
    );

    if (!activeThumbnail) {
      return;
    }

    const stripRect = strip.getBoundingClientRect();
    const thumbnailRect = activeThumbnail.getBoundingClientRect();
    const centeredOffset =
      thumbnailRect.left -
      stripRect.left -
      (strip.clientWidth - activeThumbnail.offsetWidth) / 2;
    const targetScrollLeft = Math.max(
      0,
      Math.min(
        strip.scrollWidth - strip.clientWidth,
        strip.scrollLeft + centeredOffset,
      ),
    );

    strip.scrollTo({
      left: targetScrollLeft,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, [prefersReducedMotion, selectedImageIndex]);

  useEffect(() => {
    if (!product) {
      return;
    }

    trackCatalogProductView({
      artisanId: product.artisan_id,
      categoryId: product.category_id,
      productId: product.id,
    });
  }, [product]);

  useEffect(() => {
    if (!product || product.made_to_order_options.length === 0) {
      setSelectedOptions({});
      return;
    }

    if (cartEditState?.selectedOptions?.length) {
      setSelectedOptions(
        Object.fromEntries(
          cartEditState.selectedOptions.map((selection) => [selection.optionId, selection.choiceId]),
        ),
      );
      return;
    }

    const initialOptions = Object.fromEntries(
      product.made_to_order_options
        .filter((option) => option.required && option.choices[0])
        .map((option) => [option.id, option.choices[0].id]),
    );

    setSelectedOptions(initialOptions);
  }, [cartEditState?.selectedOptions, product]);

  const accentColor = "#7F6BFF";

  const productImages = useMemo(() => {
    if (!product) {
      return [];
    }

    if ((product.product_media?.length ?? 0) > 0) {
      return getProductImageMediaItems(product.product_media).filter((item) => Boolean(item.url));
    }

    const urls = product.image_urls.filter(Boolean);
    return (urls.length > 0 ? urls : product.image_url ? [product.image_url] : []).map((url) => ({
      description: "",
      thumbnail_url: null,
      url,
    }));
  }, [product]);

  const selectedProductImage = productImages[selectedImageIndex] ?? productImages[0] ?? null;
  const selectedOptionChoices = useMemo<ProductSelectionChoice[]>(() => {
    if (!product || product.made_to_order_options.length === 0) {
      return [];
    }

    return product.made_to_order_options.flatMap((option) => {
      const choiceId = selectedOptions[option.id];
      const choice = option.choices.find((currentChoice) => currentChoice.id === choiceId);

      if (!choice) {
        return [];
      }

      return [
        {
          choiceId: choice.id,
          choiceLabel: choice.label,
          optionId: option.id,
          optionLabel: option.label,
          priceModifier: choice.priceModifier,
        },
      ];
    });
  }, [product, selectedOptions]);

  const selectedOptionsSummary = useMemo(
    () => createSelectedOptionsSummary(selectedOptionChoices),
    [selectedOptionChoices],
  );
  const optionPrice = useMemo(
    () => calculateOptionPriceModifiers(selectedOptionChoices),
    [selectedOptionChoices],
  );
  const finalUnitPrice = Number((Number(product?.price ?? 0) + optionPrice).toFixed(2));
  const configurationKey = useMemo(
    () => createProductConfigurationKey(selectedOptionChoices),
    [selectedOptionChoices],
  );
  const missingRequiredOption = useMemo(() => {
    if (!product || product.made_to_order_options.length === 0) {
      return false;
    }

    return product.made_to_order_options.some(
      (option) => option.required && !selectedOptions[option.id],
    );
  }, [product, selectedOptions]);

  const isSoldOut =
    product?.availability_mode === "stock" && Number(product.stock_quantity ?? 0) <= 0;
  const isAdmin = role === "admin";
  const isBuyer = role === "buyer";
  const updateCartItemSelectionMutation = useUpdateCartItemSelection(user?.id);
  const isArtisan = role === "artisan";
  const favoritesQuery = useBuyerFavorites(user?.id, isBuyer && Boolean(user?.id));
  const toggleFavoriteMutation = useToggleBuyerFavorite(user?.id);
  const isOwnArtisanProduct = isArtisan && profile?.id === product?.artisan_id;
  const canConfigureForPurchase = !role || isBuyer;
  const isEditingCartItem = Boolean(isBuyer && cartEditState?.cartItemId);
  const storefrontLabel = storefront?.store_name || storefront?.full_name || "Vendedor local";
  const viewerContextTitle = isAdmin
    ? "Vista de administrador"
    : isOwnArtisanProduct
      ? "Vista de tu producto"
      : isArtisan
        ? "Vista de vendedor"
        : "";
  const isFavorite = Boolean(
    product?.id &&
      favoritesQuery.data?.some((favorite) => favorite.product_id === product.id),
  );
  const productQrUrl = useMemo(
    () => (product ? buildPublicProductDetailUrl(product.id) : ""),
    [product],
  );
  const productQrFileBaseName = useMemo(
    () => `qr-${buildUrlFileSlug(product?.title || product?.id || "producto")}`,
    [product],
  );

  const moveSelectedImage = (direction: "previous" | "next") => {
    if (productImages.length <= 1 || isGalleryNavigating) {
      return;
    }

    if (galleryNavigationTimeoutRef.current !== null) {
      window.clearTimeout(galleryNavigationTimeoutRef.current);
    }

    setIsGalleryNavigating(true);
    setIsDetailAutoplayEnabled(false);
    setSelectedImageIndex((currentIndex) => {
      if (direction === "previous") {
        return currentIndex === 0 ? productImages.length - 1 : currentIndex - 1;
      }

      return currentIndex === productImages.length - 1 ? 0 : currentIndex + 1;
    });
    galleryNavigationTimeoutRef.current = window.setTimeout(() => {
      setIsGalleryNavigating(false);
    }, 260);
  };

  const selectGalleryImage = (index: number) => {
    if (index === selectedImageIndex || isGalleryNavigating) {
      return;
    }

    if (galleryNavigationTimeoutRef.current !== null) {
      window.clearTimeout(galleryNavigationTimeoutRef.current);
    }

    setIsGalleryNavigating(true);
    setIsDetailAutoplayEnabled(false);
    setSelectedImageIndex(index);
    galleryNavigationTimeoutRef.current = window.setTimeout(() => {
      setIsGalleryNavigating(false);
    }, 220);
  };
  const handleCloseDetail = () => {
    const origin = getProductDetailOrigin();

    if (origin) {
      queueProductDetailReturn(origin);
      navigate(origin.url);
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/catalogo");
  };

  if (isLoading) {
    return (
      <PagePlaceholder
        badge="Producto"
        description="Estamos preparando la ficha del producto."
        title="Cargando producto"
      />
    );
  }

  if (!product) {
    return (
      <PagePlaceholder
        badge="Producto"
        description={errorMessage || "No encontramos el producto solicitado."}
        title="Producto no disponible"
      />
    );
  }

  return (
    <PagePlaceholder
      description=""
      hideHeader
      title=""
    >
      <div className="animate-fade-in-up grid gap-5">
        <div className="neutral-breathe relative overflow-hidden rounded-3xl border border-[#cbd5e1]/35 bg-[linear-gradient(135deg,rgba(236,254,255,0.62),rgba(255,255,255,0.96)_42%,rgba(237,243,255,0.92)_100%)] px-4 py-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.18)] sm:px-5 sm:py-5">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-40 bg-[radial-gradient(circle_at_left,rgba(15,118,110,0.12),transparent_72%)]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-40 bg-[radial-gradient(circle_at_right,rgba(71,85,105,0.12),transparent_72%)]" />
          <div className="relative flex items-start justify-between gap-4">
            <h1 className="min-w-0 text-xl font-semibold tracking-tight text-ocean-500 sm:text-[2rem]">
              {product.title}
            </h1>
            <div className="flex shrink-0 items-center gap-2">
              {isBuyer ? (
                <button
                  aria-label={isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}
                  aria-pressed={isFavorite}
                  className={[
                    "group/fav relative inline-flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-2xl border transition-all duration-200 ease-out active:scale-95 disabled:cursor-not-allowed disabled:opacity-60",
                    isFavorite
                      ? "border-brand-500 bg-gradient-to-b from-brand-100 to-brand-50 text-brand-600 shadow-[0_10px_24px_-12px_rgba(124,58,237,0.35)]"
                      : "border-stone-300 bg-white text-stone-400 hover:border-brand-500/45 hover:bg-stone-50 hover:text-brand-600/75",
                  ].join(" ")}
                  disabled={toggleFavoriteMutation.isPending}
                  onClick={async () => {
                    await toggleFavoriteMutation.mutateAsync(product.id).catch(() => undefined);
                  }}
                  title={isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}
                  type="button"
                >
                  <svg
                    aria-hidden="true"
                    className="h-6 w-6 fav-pop"
                    fill="currentColor"
                    key={isFavorite ? "on" : "off"}
                    viewBox="0 0 24 24"
                  >
                    <path
                      clipRule="evenodd"
                      d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.177A7.547 7.547 0 0 1 6.648 6.61a.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 0 1 1.925-3.546 3.75 3.75 0 0 1 3.255 3.718Z"
                      fillRule="evenodd"
                    />
                  </svg>
                  <span
                    className={[
                      "text-[9px] font-bold leading-none tracking-widest transition-colors",
                      isFavorite ? "text-brand-600" : "text-stone-400 group-hover/fav:text-brand-500/80",
                    ].join(" ")}
                  >
                    FAV
                  </span>
                </button>
              ) : null}
              <button
                aria-label="Cerrar detalle y volver"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white text-base font-semibold text-stone-700 shadow-[0_16px_30px_-22px_rgba(15,23,42,0.35)] transition hover:border-ocean-300 hover:text-ocean-500"
                onClick={handleCloseDetail}
                type="button"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
        <section className="grid gap-3.5">
          <div
            className="relative overflow-hidden rounded-3xl border border-[#cbd5e1]/45 bg-white/96 p-4 shadow-[0_30px_80px_-46px_rgba(15,23,42,0.38)] ring-1 ring-white/80 sm:p-5"
            style={{
              background: `linear-gradient(150deg, ${accentColor}15, rgba(255,255,255,0.96) 42%, #f4f8ff)`,
              borderColor: `${accentColor}32`,
            }}
          >
            <div className="pointer-events-none absolute -left-8 top-8 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(8,145,178,0.18),transparent_72%)] blur-2xl" />
            <div className="pointer-events-none absolute -right-8 bottom-12 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(71,85,105,0.14),transparent_72%)] blur-2xl" />
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/15 bg-[#010f20] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white shadow-[0_10px_24px_-18px_rgba(0,0,0,0.75)]">
                  {storefrontLabel}
                </span>
              </div>
              {productImages.length > 1 ? (
                <span className="rounded-full border border-ocean-500/15 bg-white/88 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-ocean-500 shadow-[0_12px_24px_-20px_rgba(71,85,105,0.45)]">
                  {productImages.length} fotos
                </span>
              ) : null}
            </div>

            {selectedProductImage ? (
              <div className="grid gap-3">
                <div className="overflow-hidden rounded-3xl border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,244,238,0.92))] p-3 shadow-[0_28px_62px_-42px_rgba(15,23,42,0.42)] ring-1 ring-white/85 sm:p-4">
                  <div className="relative flex min-h-[21rem] items-center justify-center overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(244,248,255,0.96)_56%,_rgba(233,241,255,0.9))] sm:min-h-[26rem]">
                    <div className="pointer-events-none absolute inset-x-8 top-2 h-16 rounded-full bg-white/60 blur-3xl" />
                    <ProductImageCarousel
                      autoAdvance={productImages.length > 1 && isDetailAutoplayEnabled}
                      autoAdvanceDelay={5000}
                      buttonClassName="!h-10 !w-10 !rounded-full !border !border-white/75 !bg-white/94 !text-ocean-500 !shadow-[0_16px_30px_-18px_rgba(15,23,42,0.55)] backdrop-blur-sm hover:!bg-white"
                      className="flex w-full items-center justify-center"
                      currentIndex={selectedImageIndex}
                      imageClassName="max-h-[68dvh] w-auto max-w-full rounded-2xl object-contain"
                      imageSizes="(max-width: 640px) 92vw, (max-width: 1024px) 82vw, 720px"
                      imageSrcSetWidths={[640, 960, 1200, 1440]}
                      imageWidth={1200}
                      images={productImages.map((mediaItem, index) => ({
                        alt: mediaItem.description || `${product.title} ${index + 1}`,
                        url: mediaItem.url,
                      }))}
                      onIndexChange={(index) => {
                        setSelectedImageIndex(index);
                      }}
                      onManualNavigation={() => {
                        setIsDetailAutoplayEnabled(false);
                      }}
                      priority
                    />
                  </div>
                </div>

                {productImages.length > 1 ? (
                  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5">
                    <button
                      aria-label="Ver foto anterior"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white/95 text-lg font-semibold text-ocean-500 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.4)] transition hover:border-ocean-200 hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
                      disabled={isGalleryNavigating}
                      onClick={() => {
                        moveSelectedImage("previous");
                      }}
                      type="button"
                    >
                      ‹
                    </button>
                    <div
                      className="overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                      ref={thumbnailStripRef}
                    >
                      <div className="grid min-w-full grid-flow-col auto-cols-[4.75rem] gap-2.5 sm:auto-cols-[5.5rem]">
                        {productImages.map((mediaItem, index) => (
                          <button
                            key={`${mediaItem.url}-${index}`}
                            className={[
                              "snap-start overflow-hidden rounded-2xl border-2 bg-white/94 transition-colors duration-200",
                              index === selectedImageIndex
                                ? "border-ocean-500 shadow-[0_18px_34px_-26px_rgba(71,85,105,0.55)] ring-1 ring-ocean-200/70"
                                : "border-white/60 hover:border-brand-500/80",
                            ].join(" ")}
                            data-thumbnail-index={index}
                            onClick={() => {
                              selectGalleryImage(index);
                            }}
                            type="button"
                          >
                            <img
                              alt={mediaItem.description || `${product.title} ${index + 1}`}
                              className="aspect-square w-full object-cover"
                              decoding="async"
                              loading="lazy"
                              sizes="88px"
                              src={getOptimizedCatalogImageUrl(
                                mediaItem.thumbnail_url ?? mediaItem.url,
                                180,
                                68,
                              )}
                              srcSet={getCatalogImageSrcSet(
                                mediaItem.thumbnail_url ?? mediaItem.url,
                                [120, 180, 240],
                                68,
                              )}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      aria-label="Ver foto siguiente"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white/95 text-lg font-semibold text-ocean-500 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.4)] transition hover:border-ocean-200 hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
                      disabled={isGalleryNavigating}
                      onClick={() => {
                        moveSelectedImage("next");
                      }}
                      type="button"
                    >
                      ›
                    </button>
                  </div>
                ) : null}

                {selectedProductImage.description ? (
                  <div className="rounded-2xl border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(247,241,233,0.9))] px-4 py-3 text-sm leading-6 text-stone-600 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.35)] ring-1 ring-white/85">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">
                      Sobre esta foto
                    </p>
                    <p className="mt-2">{selectedProductImage.description}</p>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-3xl border border-white/70 bg-white/72 px-4 text-center shadow-[0_18px_40px_-34px_rgba(15,23,42,0.35)] sm:aspect-[3/2]">
                <div>
                  <p
                    className="text-sm font-semibold uppercase tracking-widest"
                    style={{ color: accentColor }}
                  >
                    {storefrontLabel}
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-ocean-500">{product.title}</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="grid gap-3.5 self-start xl:sticky xl:top-24">
          <DetailSectionCard
            eyebrow={viewerContextTitle}
            title={product.title}
            toneClassName="overflow-hidden border-ocean-500/12 bg-[linear-gradient(160deg,rgba(255,255,255,0.98),rgba(240,253,250,0.98)_42%,rgba(237,243,255,0.96))] shadow-[0_30px_65px_-42px_rgba(71,85,105,0.3)]"
          >
            <div className="flex flex-wrap items-center gap-2">
              {product.availability_mode === "made_to_order" ? (
                <span className="rounded-full bg-white/96 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-ocean-500 ring-1 ring-ocean-500/12 shadow-[0_10px_24px_-20px_rgba(71,85,105,0.45)]">
                  A pedido
                </span>
              ) : null}
              {selectedOptionsSummary ? (
                <span className="rounded-full bg-white/96 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-stone-500 ring-1 ring-stone-200 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.2)]">
                  {selectedOptionsSummary}
                </span>
              ) : null}
            </div>

            <p className="mt-3 line-clamp-3 text-sm leading-6 text-stone-600">{product.description}</p>

            <div className="mt-4 grid gap-3">
              <div className="relative overflow-hidden rounded-2xl border border-stone-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(247,241,233,0.92)_55%,rgba(237,243,255,0.9))] px-4 py-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.2)]">
                <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-[radial-gradient(circle_at_left,rgba(8,145,178,0.12),transparent_72%)]" />
                <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">
                  Precio
                </p>
                <p className="mt-1.5 text-3xl font-semibold tracking-tight text-ocean-500">
                  ${finalUnitPrice.toLocaleString("es-AR")}
                </p>
                {optionPrice > 0 ? (
                  <p className="mt-1.5 text-sm text-stone-500">
                    Base ${Number(product.price).toLocaleString("es-AR")} + extras elegidos
                  </p>
                ) : null}
              </div>

              <p className="text-base font-bold leading-6 tracking-tight text-ocean-500 sm:text-lg">
                {product.availability_mode === "made_to_order" ? (
                  product.lead_time_days ? (
                    <>
                      Producción a pedido:{" "}
                      <span className="text-brand-500">
                        {product.lead_time_days} día{product.lead_time_days === 1 ? "" : "s"}
                      </span>
                    </>
                  ) : (
                    "Producción a pedido"
                  )
                ) : isSoldOut ? (
                  "Sin unidades disponibles"
                ) : (
                  <>
                    Unidades disponibles:{" "}
                    <span className="text-brand-500">
                      {Number(product.stock_quantity ?? 0)}
                    </span>
                  </>
                )}
              </p>
              <div className="grid gap-3 sm:flex sm:flex-wrap">
              {isAdmin ? (
                <>
                  <div className="grid w-full gap-2 sm:w-auto sm:min-w-56">
                    <Link
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
                      to={`/panel/admin/productos/${product.artisan_id}?mode=edit&productId=${product.id}`}
                    >
                      Editar producto
                    </Link>
                    <Link
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-ocean-200 bg-white px-5 py-3 text-sm font-semibold text-ocean-600 transition-colors hover:bg-ocean-50"
                      to={`/panel/admin/productos/edicion-rapida/${product.id}`}
                    >
                      Edicion rapida
                    </Link>
                  </div>
                  <Link
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-brand-400 bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600 sm:w-auto"
                    to={`/panel/admin/control-productos?productId=${product.id}`}
                  >
                    Control de producto
                  </Link>
                  <a
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-ocean-200 bg-white px-5 py-3 text-sm font-semibold text-ocean-500 transition-colors hover:bg-brand-50 sm:w-auto"
                    href="#qr-producto"
                  >
                    Generar QR
                  </a>
                </>
              ) : isOwnArtisanProduct ? (
                <>
                  <div className="grid w-full gap-2 sm:w-auto sm:min-w-56">
                    <Link
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
                      to={`/panel/vendedor/productos?mode=edit&productId=${product.id}`}
                    >
                      Editar mi producto
                    </Link>
                    <Link
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-ocean-200 bg-white px-5 py-3 text-sm font-semibold text-ocean-600 transition-colors hover:bg-ocean-50"
                      to={`/panel/vendedor/productos/edicion-rapida/${product.id}`}
                    >
                      Edicion rapida
                    </Link>
                  </div>
                  <Link
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 sm:w-auto"
                    to="/panel/vendedor/productos"
                  >
                    Ver mis productos
                  </Link>
                </>
              ) : isArtisan ? (
                <>
                  <Link
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600 sm:w-auto"
                    to="/panel/vendedor"
                  >
                    Ir a mi panel
                  </Link>
                  <Link
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 sm:w-auto"
                    to="/catalogo"
                  >
                    Seguir explorando
                  </Link>
                </>
              ) : (
                <>
                  {isEditingCartItem ? (
                    <button
                      className="inline-flex min-h-[3.25rem] w-full items-center justify-center rounded-full bg-brand-500 px-6 py-3.5 text-base font-bold tracking-tight text-white shadow-[0_10px_28px_-10px_rgba(71,85,105,0.55)] transition-all duration-200 hover:bg-brand-600 hover:shadow-[0_14px_32px_-8px_rgba(71,85,105,0.6)] hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1 sm:text-[1.0625rem]"
                      disabled={isSoldOut || missingRequiredOption || updateCartItemSelectionMutation.isPending}
                      onClick={async () => {
                        if (!cartEditState) {
                          return;
                        }

                        const response = await updateCartItemSelectionMutation
                          .mutateAsync({
                            cartItemId: cartEditState.cartItemId,
                            product,
                            selection: hasSelectableOptions
                              ? {
                                  configurationKey,
                                  leadTimeDays: product.lead_time_days ?? null,
                                  selectedOptions: selectedOptionChoices,
                                  selectedOptionsSummary,
                                  unitPrice: finalUnitPrice,
                                }
                              : undefined,
                          })
                          .catch(() => null);

                        if (response) {
                          navigate(cartEditState.returnTo || "/panel/comprador/carrito");
                        }
                      }}
                      type="button"
                    >
                      {updateCartItemSelectionMutation.isPending ? "Guardando..." : "Guardar cambios"}
                    </button>
                  ) : (
                    !isOnlinePurchaseEnabled ? (
                      <WhatsAppProductButton
                        product={{
                          id: product.id,
                          title: product.title,
                          price: finalUnitPrice,
                        }}
                        className="min-h-[3.25rem] w-full !bg-[#25D366] !text-white shadow-[0_12px_28px_-10px_rgba(37,211,102,0.65)] hover:!bg-[#1ebe5d] hover:shadow-[0_16px_32px_-10px_rgba(37,211,102,0.72)] sm:flex-1 sm:text-[1.0625rem]"
                        selectedOptionsSummary={selectedOptionsSummary}
                        variant="full"
                        label={isSoldOut ? "Consultar disponibilidad" : "Pedir por WhatsApp"}
                      />
                    ) : (
                      <AddToCartButton
                        className="inline-flex min-h-[3.25rem] w-full items-center justify-center rounded-full bg-brand-500 px-6 py-3.5 text-base font-bold tracking-tight text-white shadow-[0_10px_28px_-10px_rgba(71,85,105,0.55)] transition-all duration-200 hover:bg-brand-600 hover:shadow-[0_14px_32px_-8px_rgba(71,85,105,0.6)] hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1 sm:text-[1.0625rem]"
                        disabled={isSoldOut || missingRequiredOption}
                        disabledLabel={
                          isSoldOut ? "Sin stock" : missingRequiredOption ? "Elegir opciones" : undefined
                        }
                        labels={{
                          added: "Ir a pagar",
                          buyerOnlyNotice: "Ingresá como comprador para comprar",
                          idle: "Comprar",
                          login: "Ingresar para comprar",
                          pending: "Comprando...",
                        }}
                        product={product}
                        selection={
                          hasSelectableOptions
                            ? {
                                configurationKey,
                                leadTimeDays: product.lead_time_days ?? null,
                                selectedOptions: selectedOptionChoices,
                                selectedOptionsSummary,
                                unitPrice: finalUnitPrice,
                              }
                            : undefined
                        }
                      />
                    )
                  )}
                </>
              )}
            </div>

              {!isBuyer && !isAdmin ? (
                <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-600">
                  <p className="font-semibold text-ocean-500">Siguiente paso</p>
                  <p className="mt-1">
                {isAdmin
                  ? "Desde aqui puedes saltar a la gestion del producto y al control interno sin perder el contexto publico."
                  : isOwnArtisanProduct
                    ? "Edita tu pieza para actualizar contenido, precio o stock y vuelve a revisar como se ve publicada."
                    : isArtisan
                      ? "Usa esta vista como referencia comercial y vuelve a tu panel para seguir gestionando tu tienda."
                      : !isOnlinePurchaseEnabled
                        ? "Escribinos por WhatsApp para coordinar tu pedido y la entrega."
                        : isBuyer
                          ? "Si agregas la pieza, el seguimiento del pedido continua desde tu carrito de comprador."
                          : "Puedes configurar la pieza ahora y el acceso a compra se completa cuando ingreses con una cuenta de comprador."}
                  </p>
                </div>
              ) : null}
            </div>
          </DetailSectionCard>

          {hasSelectableOptions ? (
            <DetailSectionCard
              eyebrow={canConfigureForPurchase ? "Personaliza" : "Variantes"}
              title={canConfigureForPurchase ? "Elige tus opciones" : "Opciones de la pieza"}
              toneClassName="border-stone-200 bg-white/95"
            >
              {canConfigureForPurchase ? (
                <div className="grid gap-3">
                  {product.made_to_order_options.map((option) => (
                    <label key={option.id} className="grid gap-2 text-sm font-medium text-stone-700">
                      <span className="flex flex-wrap items-center gap-2">
                        <span>{option.label}</span>
                        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-stone-500">
                          {option.required ? "Requerido" : "Opcional"}
                        </span>
                      </span>
                      <select
                        className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-brand-300"
                        onChange={(event) => {
                          setSelectedOptions((currentValue) => {
                            if (!event.target.value) {
                              const nextValue = { ...currentValue };
                              delete nextValue[option.id];
                              return nextValue;
                            }

                            return {
                              ...currentValue,
                              [option.id]: event.target.value,
                            };
                          });
                        }}
                        value={selectedOptions[option.id] ?? ""}
                      >
                        {!option.required ? <option value="">Sin seleccionar</option> : null}
                        {option.choices.map((choice) => (
                          <option key={choice.id} value={choice.id}>
                            {choice.label}
                            {choice.priceModifier > 0
                              ? ` (+$${Number(choice.priceModifier).toLocaleString("es-AR")})`
                              : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}

                  <div
                    className={[
                      "rounded-2xl border px-4 py-2.5 text-sm leading-6",
                      missingRequiredOption
                        ? "border-brand-200 bg-brand-50 text-stone-700"
                        : "border-ocean-100 bg-brand-50 text-stone-700",
                    ].join(" ")}
                  >
                    {missingRequiredOption
                      ? "Faltan elecciones para habilitar la compra."
                      : selectedOptionsSummary
                        ? `Resumen: ${selectedOptionsSummary}.`
                        : "Configuracion lista para continuar."}
                  </div>
                </div>
              ) : (
                <div className="grid gap-2.5">
                  {product.made_to_order_options.map((option) => (
                    <div key={option.id} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-stone-700">{option.label}</p>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-stone-500 ring-1 ring-stone-200">
                          {option.required ? "Requerido" : "Opcional"}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {option.choices.map((choice) => (
                          <span
                            key={choice.id}
                            className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-600"
                          >
                            {choice.label}
                            {choice.priceModifier > 0
                              ? ` (+$${Number(choice.priceModifier).toLocaleString("es-AR")})`
                              : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DetailSectionCard>
          ) : null}

          <DetailSectionCard
            description={
              storefront?.store_description ||
              "Conoce mas piezas del mismo vendedor."
            }
            eyebrow="Tienda del vendedor"
            title={storefrontLabel}
            toneClassName="border-stone-200/90 bg-[linear-gradient(160deg,rgba(255,255,255,0.98),rgba(236,254,255,0.58)_32%,rgba(240,253,250,0.98))] shadow-[0_26px_60px_-42px_rgba(15,23,42,0.16)]"
          >
            <div className="grid gap-3 sm:flex sm:flex-wrap">
              <Link
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold text-white transition-colors hover:opacity-90 sm:flex-1"
                style={{ backgroundColor: accentColor }}
                to={`/vendedor/${storefront?.id ?? product.artisan_id}`}
              >
                Explorar tienda completa
              </Link>
            </div>
          </DetailSectionCard>

          {isAdmin ? (
            <div className="scroll-mt-24" id="qr-producto">
              <DownloadableQr
                description="Apunta directo al detalle publico de este producto."
                fileBaseName={productQrFileBaseName}
                targetUrl={productQrUrl}
                title="QR del producto"
              />
            </div>
          ) : null}
        </aside>
        </div>
      </div>
    </PagePlaceholder>
  );
}

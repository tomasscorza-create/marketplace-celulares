import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/features/auth/useAuth";
import {
  useClaimCatalogPromotion,
  usePublicCatalogPromotions,
} from "@/features/catalogPromotions/catalogPromotionQueries";
import {
  getCatalogPromotionActionLabel,
  isSafeExternalPromotionUrl,
} from "@/features/catalogPromotions/catalogPromotionUtils";
import type { CatalogPromotion } from "@/types/catalogPromotions";

export const CATALOG_PROMOTION_AUTO_ADVANCE_MS = 8000;
export const CATALOG_PROMOTION_CONTROLS_IDLE_MS = 3000;

const kindLabels: Record<CatalogPromotion["kind"], string> = {
  coupon: "Cupón",
  discount: "Descuento",
  image: "Destacado",
  message: "Novedad",
  product: "Producto",
};

const kindGradients: Record<CatalogPromotion["kind"], string> = {
  coupon: "from-fuchsia-700 via-violet-600 to-indigo-500",
  discount: "from-emerald-700 via-teal-600 to-cyan-500",
  image: "from-blue-800 via-indigo-700 to-violet-600",
  message: "from-ocean-700 via-blue-700 to-brand-600",
  product: "from-stone-900 via-ocean-800 to-blue-700",
};

function getPromotionImage(promotion: CatalogPromotion) {
  return (
    promotion.image_url ??
    promotion.products?.image_urls?.find(Boolean) ??
    promotion.products?.image_url ??
    null
  );
}

function getBenefitLabel(promotion: CatalogPromotion) {
  if (!promotion.benefit_type || !promotion.benefit_value) return null;

  if (promotion.benefit_type === "percentage") {
    return `${Number(promotion.benefit_value).toLocaleString("es-AR")}% OFF`;
  }

  return `$${Number(promotion.benefit_value).toLocaleString("es-AR")} OFF`;
}

export function CatalogPromotionBanner() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const promotionsQuery = usePublicCatalogPromotions(user?.id);
  const claimMutation = useClaimCatalogPromotion(user?.id);
  const [activeIndex, setActiveIndex] = useState(0);
  const [marqueeStartIndex, setMarqueeStartIndex] = useState(0);
  const [marqueeRevision, setMarqueeRevision] = useState(0);
  const [areControlsActive, setAreControlsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; promotionId: string } | null>(
    null,
  );
  const controlsIdleTimeoutRef = useRef<number | null>(null);
  const promotions = promotionsQuery.data?.promotions ?? [];
  const claimedIds = useMemo(
    () => new Set(promotionsQuery.data?.claimedPromotionIds ?? []),
    [promotionsQuery.data?.claimedPromotionIds],
  );

  useEffect(() => {
    if (activeIndex >= promotions.length) {
      setActiveIndex(0);
      setMarqueeStartIndex(0);
      setMarqueeRevision((revision) => revision + 1);
    }
  }, [activeIndex, promotions.length]);

  const activateControls = useCallback(() => {
    setAreControlsActive(true);

    if (typeof window === "undefined") return;
    if (controlsIdleTimeoutRef.current !== null) {
      window.clearTimeout(controlsIdleTimeoutRef.current);
    }
    controlsIdleTimeoutRef.current = window.setTimeout(() => {
      setAreControlsActive(false);
      controlsIdleTimeoutRef.current = null;
    }, CATALOG_PROMOTION_CONTROLS_IDLE_MS);
  }, []);

  useEffect(
    () => () => {
      if (controlsIdleTimeoutRef.current !== null) {
        window.clearTimeout(controlsIdleTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (promotions.length < 2 || isPaused || typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const interval = window.setInterval(() => {
      if (!document.hidden) {
        setActiveIndex((currentIndex) => (currentIndex + 1) % promotions.length);
        setFeedback(null);
      }
    }, CATALOG_PROMOTION_AUTO_ADVANCE_MS);

    return () => window.clearInterval(interval);
  }, [isPaused, marqueeRevision, promotions.length]);

  if (promotionsQuery.isLoading) {
    return (
      <div
        aria-label="Cargando promociones"
        className="hidden min-h-28 animate-pulse rounded-2xl border border-white/60 bg-white/45 xl:block"
      />
    );
  }

  if (promotions.length === 0 || promotionsQuery.isError) return null;

  const runAction = async (promotion: CatalogPromotion) => {
    setFeedback(null);

    if (promotion.action_type === "claim") {
      if (!user) {
        navigate("/login", { state: { from: location.pathname + location.search } });
        return;
      }
      if (claimedIds.has(promotion.id)) {
        setFeedback({
          message: "Este beneficio ya está guardado en tu cuenta.",
          promotionId: promotion.id,
        });
        return;
      }
      try {
        await claimMutation.mutateAsync(promotion.id);
        setFeedback({ message: "Beneficio guardado en tu cuenta.", promotionId: promotion.id });
      } catch (error) {
        setFeedback({
          message: error instanceof Error ? error.message : "No pudimos guardar el beneficio.",
          promotionId: promotion.id,
        });
      }
      return;
    }

    if (promotion.action_type === "product" && promotion.product_id) {
      navigate(`/producto/${promotion.product_id}`);
      return;
    }

    if (promotion.action_type === "internal_link" && promotion.action_url) {
      if (promotion.action_url.startsWith("/")) navigate(promotion.action_url);
      return;
    }

    if (
      promotion.action_type === "external_link" &&
      promotion.action_url &&
      isSafeExternalPromotionUrl(promotion.action_url)
    ) {
      window.open(promotion.action_url, "_blank", "noopener,noreferrer");
    }
  };

  const selectPromotion = (index: number) => {
    activateControls();
    setActiveIndex(index);
    setMarqueeStartIndex(index);
    setMarqueeRevision((revision) => revision + 1);
    setFeedback(null);
  };

  const trackStyle = {
    "--catalog-promotion-loop-distance": `-${
      (promotions.length / (promotions.length + 1)) * 100
    }%`,
    "--catalog-promotion-loop-duration": `${
      promotions.length * CATALOG_PROMOTION_AUTO_ADVANCE_MS
    }ms`,
    animationDelay: `-${marqueeStartIndex * CATALOG_PROMOTION_AUTO_ADVANCE_MS}ms`,
    width: `${(promotions.length + 1) * 100}%`,
  } as CSSProperties;

  const renderPromotion = (promotion: CatalogPromotion, isLoopClone = false) => {
    const imageUrl = getPromotionImage(promotion);
    const actionLabel = getCatalogPromotionActionLabel(promotion);
    const isClaimed = claimedIds.has(promotion.id);
    const benefitLabel = getBenefitLabel(promotion);
    const hasAction = promotion.action_type !== "none";

    return (
      <div
        aria-hidden={isLoopClone || undefined}
        className={`catalog-promotion-slot h-full min-w-0 flex-1 px-[3px] ${isLoopClone ? "pointer-events-none" : ""}`}
        key={`${promotion.id}-${isLoopClone ? "loop" : "original"}`}
      >
        <article className="relative h-full min-w-0 overflow-hidden rounded-lg border border-white/45 shadow-[0_3px_10px_rgba(15,23,42,0.2)]">
          <div className={`absolute inset-0 bg-gradient-to-r ${kindGradients[promotion.kind]}`} />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_10%,rgba(255,255,255,0.28),transparent_38%)]" />

          <div className="relative grid h-full min-h-0 grid-cols-[minmax(0,1fr)_minmax(12rem,1.18fr)]">
            {imageUrl ? (
              <div className="relative min-h-0 overflow-hidden">
                <img
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  decoding="async"
                  loading="lazy"
                  src={imageUrl}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/35" />
              </div>
            ) : (
              <div className="relative flex min-h-0 items-center justify-center overflow-hidden">
                <span className="select-none font-display text-5xl font-black text-white/15">
                  {benefitLabel ?? "NYZ"}
                </span>
              </div>
            )}

            <div className="flex min-w-0 flex-col justify-center gap-1.5 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white/18 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.13em]">
                  {kindLabels[promotion.kind]}
                </span>
                {benefitLabel ? (
                  <span className="text-xs font-black text-amber-200">{benefitLabel}</span>
                ) : null}
              </div>
              <h3 className="truncate font-display text-base font-bold leading-tight">
                {promotion.title}
              </h3>
              {promotion.body ? (
                <p className="line-clamp-2 text-[11px] leading-4 text-white/82">
                  {promotion.body}
                </p>
              ) : null}

              {feedback?.promotionId === promotion.id ? (
                <p
                  aria-live="polite"
                  className="line-clamp-1 text-[10px] font-semibold text-amber-100"
                >
                  {feedback.message}
                </p>
              ) : hasAction && actionLabel ? (
                <button
                  className="mt-0.5 inline-flex h-7 w-fit items-center rounded-full bg-white px-3 text-[10px] font-bold text-ocean-800 transition hover:bg-amber-50 disabled:cursor-wait disabled:opacity-70"
                  disabled={claimMutation.isPending || isLoopClone}
                  onClick={() => void runAction(promotion)}
                  tabIndex={isLoopClone ? -1 : undefined}
                  type="button"
                >
                  {isClaimed && promotion.action_type === "claim"
                    ? "Guardado en tu cuenta"
                    : actionLabel}
                </button>
              ) : null}
            </div>
          </div>
        </article>
      </div>
    );
  };

  return (
    <section
      aria-label="Promociones del catálogo"
      className="relative hidden min-h-28 overflow-hidden rounded-2xl border border-white/80 bg-gradient-to-br from-white via-slate-200 to-slate-300 shadow-elev-2 ring-1 ring-black/5 xl:block"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsPaused(false);
      }}
      onFocus={() => setIsPaused(true)}
    >
      <div className="catalog-promotion-viewport absolute inset-1.5 overflow-hidden rounded-xl">
        <div
          className={`catalog-promotion-track flex h-full ${isPaused ? "catalog-promotion-track--paused" : ""}`}
          key={marqueeRevision}
          style={trackStyle}
        >
          {promotions.map((promotion) => renderPromotion(promotion))}
          {renderPromotion(promotions[0], true)}
        </div>
      </div>

      {promotions.length > 1 ? (
        <div
          className={[
            "absolute bottom-3 left-3 flex origin-bottom-left items-center gap-1 rounded-full px-1.5 py-1 transition-[opacity,transform,background-color] duration-300",
            areControlsActive
              ? "scale-100 bg-black/25 opacity-100 backdrop-blur-sm"
              : "scale-90 bg-black/15 opacity-35 backdrop-blur-[1px]",
          ].join(" ")}
          onFocusCapture={activateControls}
        >
          {!areControlsActive ? (
            <button
              aria-hidden="true"
              className="absolute inset-0 z-20 cursor-pointer rounded-full"
              onClick={activateControls}
              tabIndex={-1}
              title="Activar controles del banner"
              type="button"
            />
          ) : null}
          <button
            aria-label="Promoción anterior"
            className="grid h-5 w-5 place-items-center rounded-full text-xs text-white hover:bg-white/20"
            onClick={() => {
              selectPromotion((activeIndex - 1 + promotions.length) % promotions.length);
            }}
            type="button"
          >
            ‹
          </button>
          {promotions.map((promotion, index) => (
            <button
              aria-label={`Mostrar promoción ${index + 1}`}
              className={`h-1.5 rounded-full transition-all ${index === activeIndex ? "w-4 bg-white" : "w-1.5 bg-white/45"}`}
              key={promotion.id}
              onClick={() => {
                selectPromotion(index);
              }}
              type="button"
            />
          ))}
          <button
            aria-label="Promoción siguiente"
            className="grid h-5 w-5 place-items-center rounded-full text-xs text-white hover:bg-white/20"
            onClick={() => {
              selectPromotion((activeIndex + 1) % promotions.length);
            }}
            type="button"
          >
            ›
          </button>
        </div>
      ) : null}
    </section>
  );
}

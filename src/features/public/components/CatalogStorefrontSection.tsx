import { memo, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import type { PublicCatalogStorefrontGroup } from "../../../types/public";
import { CatalogStorefrontProductCard } from "./CatalogStorefrontProductCard";

type CatalogStorefrontSectionProps = {
  group: PublicCatalogStorefrontGroup;
};

function CatalogStorefrontSectionInner({ group }: CatalogStorefrontSectionProps) {
  const { storefront, products, matching_products_count } = group;
  const themeColor = "#7F6BFF";
  const storefrontLabel = storefront.store_name || storefront.full_name;
  const railRef = useRef<HTMLDivElement>(null);
  const [railState, setRailState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
  });

  useEffect(() => {
    const rail = railRef.current;

    if (!rail) {
      return;
    }

    const updateRailState = () => {
      const maxScrollLeft = rail.scrollWidth - rail.clientWidth;
      setRailState({
        canScrollLeft: rail.scrollLeft > 8,
        canScrollRight: maxScrollLeft - rail.scrollLeft > 8,
      });
    };

    updateRailState();
    rail.addEventListener("scroll", updateRailState, { passive: true });
    window.addEventListener("resize", updateRailState);

    return () => {
      rail.removeEventListener("scroll", updateRailState);
      window.removeEventListener("resize", updateRailState);
    };
  }, [products.length]);

  function scrollRail(direction: "left" | "right") {
    const rail = railRef.current;

    if (!rail) {
      return;
    }

    const distance = Math.min(rail.clientWidth * 0.9, 480);
    rail.scrollBy({
      behavior: "smooth",
      left: direction === "left" ? -distance : distance,
    });
  }

  return (
    <section className="catalog-card min-w-0 overflow-hidden rounded-2xl border border-stone-200 bg-white p-3 shadow-sm transition-all duration-200 hover:border-ocean-300 hover:shadow-[0_22px_46px_-36px_rgba(15,23,42,0.34)] [content-visibility:auto] [contain-intrinsic-size:540px] sm:p-4">
      <div className="flex flex-col gap-3 border-b border-stone-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white shadow-sm"
            style={{ backgroundColor: themeColor }}
          >
            {storefront.profile_image_url ? (
              <img
                alt={storefrontLabel}
                className="h-full w-full rounded-xl object-cover"
                decoding="async"
                loading="lazy"
                src={storefront.profile_image_url}
              />
            ) : (
              storefrontLabel.charAt(0).toUpperCase()
            )}
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-stone-900 sm:text-lg">
              {storefrontLabel}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-ocean-200 bg-ocean-50 px-2.5 py-1 text-xs font-semibold text-ocean-600">
                {matching_products_count} producto{matching_products_count === 1 ? "" : "s"}
              </span>
              <span className="rounded-md border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-600">
                Vendedor
              </span>
              <span className="text-xs leading-5 text-stone-500">{storefront.full_name}</span>
            </div>
            {storefront.store_description ? (
              <p className="mt-1.5 line-clamp-1 max-w-sm text-xs leading-4 text-stone-400">
                {storefront.store_description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Link
            className="inline-flex flex-1 items-center justify-center rounded-lg border border-ocean-200 bg-white px-3.5 py-2 text-sm font-semibold text-ocean-600 transition-colors hover:bg-ocean-50 sm:flex-none"
            to={`/vendedor/${storefront.id}`}
          >
            Ver tienda
          </Link>
        </div>
      </div>

      <div className="mt-3 flex min-w-0 items-center gap-2">
        <div className="relative min-w-0 flex-1 overflow-hidden rounded-xl border border-stone-200 bg-ocean-50/45">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-4 bg-gradient-to-r from-ocean-50 via-ocean-50/75 to-transparent sm:w-6" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-ocean-50 via-ocean-50/60 to-transparent sm:w-10" />
          <div
            ref={railRef}
            className="overflow-x-auto pl-2 pr-4 pb-2 pt-1 scroll-px-2 [-ms-overflow-style:none] [overscroll-behavior-x:contain] [scrollbar-width:none] sm:pl-3 sm:pr-5 sm:scroll-px-3 [&::-webkit-scrollbar]:hidden"
          >
            <div className="inline-flex min-w-max snap-x snap-mandatory gap-2.5 pr-8 sm:gap-3 sm:pr-10">
              {products.map((product) => (
                <CatalogStorefrontProductCard key={product.id} product={product} />
              ))}
              <div aria-hidden="true" className="h-px w-6 shrink-0 sm:w-8" />
            </div>
          </div>

          {railState.canScrollLeft ? (
            <button
              className="absolute left-2 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white/95 text-stone-700 shadow-elev-2 transition-all hover:-translate-y-1/2 hover:scale-105 hover:border-ocean-300 hover:text-ocean-600 sm:h-10 sm:w-10"
              onClick={() => {
                scrollRail("left");
              }}
              type="button"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M15 18l-6-6 6-6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
              <span className="sr-only">Mover hacia la izquierda</span>
            </button>
          ) : null}

          {railState.canScrollRight ? (
            <button
              className="absolute right-2 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white/95 text-stone-700 shadow-elev-2 transition-all hover:-translate-y-1/2 hover:scale-105 hover:border-ocean-300 hover:text-ocean-600 sm:h-10 sm:w-10"
              onClick={() => {
                scrollRail("right");
              }}
              type="button"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M9 6l6 6-6 6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
              <span className="sr-only">Mover hacia la derecha</span>
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export const CatalogStorefrontSection = memo(CatalogStorefrontSectionInner);

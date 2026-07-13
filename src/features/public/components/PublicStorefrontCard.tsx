import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import type { PublicArtisanStorefront } from "../../../types/public";

type PublicStorefrontCardProps = {
  storefront: PublicArtisanStorefront;
  compact?: boolean;
  showCatalogLink?: boolean;
};

export function PublicStorefrontCard({
  storefront,
  compact = false,
  showCatalogLink = false,
}: PublicStorefrontCardProps) {
  const themeColor = storefront.storefront_theme_color || "#0f766e";
  const storefrontLabel = storefront.store_name || storefront.full_name;
  const [hasProfileImageError, setHasProfileImageError] = useState(false);

  useEffect(() => {
    setHasProfileImageError(false);
  }, [storefront.profile_image_url]);

  return (
    <article
      className="catalog-card group min-w-0 w-full overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-ocean-300 hover:shadow-elev-3 active:scale-[0.995]"
    >
      <div
        className="relative flex items-end border-b border-stone-100 px-4 pb-0 pt-5"
        style={{
          background: `linear-gradient(160deg, ${themeColor}10 0%, transparent 72%)`,
        }}
      >
        <Link className="flex w-full min-w-0 items-end gap-3.5 pb-3" to={`/vendedor/${storefront.id}`}>
          <div
            className="relative shrink-0 transition-transform duration-200 group-hover:scale-105"
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-xl text-lg font-bold text-white shadow-sm ring-2 ring-white sm:h-16 sm:w-16"
              style={{ backgroundColor: themeColor }}
            >
              {storefront.profile_image_url && !hasProfileImageError ? (
                <img
                  alt={storefrontLabel}
                  className="h-full w-full rounded-xl object-cover transition-transform duration-300 ease-out group-hover:scale-[1.025]"
                  decoding="async"
                  loading="lazy"
                  onError={() => {
                    setHasProfileImageError(true);
                  }}
                  src={storefront.profile_image_url}
                />
              ) : (
                storefrontLabel.charAt(0).toUpperCase()
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1 pb-0.5">
            <h3 className="truncate text-base font-semibold text-stone-900 sm:text-[17px]">
              {storefrontLabel}
            </h3>
            {storefront.store_name && storefront.full_name !== storefrontLabel ? (
              <p className="truncate text-[13px] text-stone-400">{storefront.full_name}</p>
            ) : null}
          </div>
        </Link>
      </div>

      <div className="mx-4 h-px" style={{ backgroundColor: `${themeColor}20` }} />

      <div className="px-4 pb-4 pt-3">
        <p className="line-clamp-2 text-[13px] leading-[1.55] text-stone-500 sm:text-sm">
          {storefront.store_description || "Entrá al perfil para conocer su oficio, su tienda y sus piezas."}
        </p>

        <div className="mt-3.5 flex flex-col gap-2">
          <Link
            aria-label={`Ver perfil de ${storefrontLabel}`}
            className={[
              "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200 hover:opacity-90 hover:shadow-sm sm:text-sm",
              compact && !showCatalogLink ? "border border-stone-200 bg-white text-stone-700 hover:bg-ocean-50" : "text-white",
            ].join(" ")}
            style={compact && !showCatalogLink ? undefined : { backgroundColor: themeColor }}
            to={`/vendedor/${storefront.id}`}
          >
            {compact ? "Conocer tienda" : "Ver perfil"}
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
            </svg>
          </Link>
          {showCatalogLink ? (
            <Link
              className="inline-flex items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold transition-colors hover:bg-ocean-50 sm:text-sm"
              style={{ borderColor: `${themeColor}60`, color: themeColor }}
              to="/catalogo"
            >
              Ver tienda
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

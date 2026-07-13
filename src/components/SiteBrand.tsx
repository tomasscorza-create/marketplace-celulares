import { NavLink } from "react-router-dom";

import { marketplaceConfig } from "../config/marketplace";

type SiteBrandProps = {
  isScrolled?: boolean;
  subtitle?: string | null;
};

export function SiteBrand({ isScrolled = false, subtitle = null }: SiteBrandProps) {
  const logoSize = isScrolled ? 34 : 36;

  return (
    <NavLink
      aria-label="Ir al catalogo principal"
      className="group flex min-w-0 items-center gap-3 rounded-2xl outline-none"
      to="/catalogo"
    >
      <div
        className={[
          "flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition-all group-hover:scale-105",
        ].join(" ")}
        style={{ height: logoSize, width: logoSize }}
      >
        <img
          alt={`Logo de ${marketplaceConfig.appName}`}
          className="block h-full w-full object-contain"
          decoding="async"
          height={logoSize}
          loading="eager"
          src={marketplaceConfig.logoPath}
          width={logoSize}
        />
      </div>
      <div className="min-w-0">
        <p
          className={[
            "font-display truncate font-extrabold tracking-normal text-ocean-500 transition-all",
            isScrolled ? "text-[13px] sm:text-sm" : "text-base sm:text-lg",
          ].join(" ")}
        >
          {marketplaceConfig.appName}
        </p>
        {subtitle ? <p className="hidden text-[11px] text-stone-400 sm:block">{subtitle}</p> : null}
      </div>
    </NavLink>
  );
}

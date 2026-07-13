import { RevealOnView } from "../../../components/RevealOnView";
import type {
  PublicArtisanStorefront,
  PublicCatalogStorefrontGroup,
} from "../../../types/public";

import { CatalogSectionHeader } from "./CatalogSectionHeader";
import { CatalogStorefrontSection } from "./CatalogStorefrontSection";
import { PublicStorefrontCard } from "./PublicStorefrontCard";

type CatalogDarkSectionProps = {
  areSecondaryGroupsEnabled: boolean;
  areSecondaryStorefrontsEnabled: boolean;
  discoveryStorefronts: PublicArtisanStorefront[];
  featuredStorefronts: PublicArtisanStorefront[];
  isCompleteStorefrontGroupsLoading: boolean;
  isStorefrontSuggestionsLoading: boolean;
  secondaryStorefrontGroups: PublicCatalogStorefrontGroup[];
  storefrontGroupsErrorMessage: string | null;
  storefrontsErrorMessage: string | null;
};

/**
 * Bloque oscuro inferior del catálogo con tres secciones de tiendas:
 * destacadas, descubrir y completas. Se carga con lazy() desde CatalogPage
 * porque vive abajo del fold y nunca es la prioridad inicial.
 *
 * Default export para que `lazy(() => import(...))` lo resuelva directo.
 */
export default function CatalogDarkSection({
  areSecondaryGroupsEnabled,
  areSecondaryStorefrontsEnabled,
  discoveryStorefronts,
  featuredStorefronts,
  isCompleteStorefrontGroupsLoading,
  isStorefrontSuggestionsLoading,
  secondaryStorefrontGroups,
  storefrontGroupsErrorMessage,
  storefrontsErrorMessage,
}: CatalogDarkSectionProps) {
  return (
    <div
      className="relative grid gap-5 overflow-hidden rounded-[1.9rem] border border-white/10 p-4 shadow-[0_28px_60px_-42px_rgba(15,23,42,0.58)] sm:p-5"
    >
      <div className="pointer-events-none absolute inset-0 z-0 bg-slate-900" />
      <div className="pointer-events-none absolute -inset-2 z-0 bg-[url('/catalog_dark_bg.webp')] bg-cover bg-center opacity-30 blur-[4px]" />
      <div className="pointer-events-none absolute inset-0 z-0 bg-slate-900/50" />
      <div className="relative z-10 grid gap-5">
      {featuredStorefronts.length > 0 ? (
        <section className="grid gap-3">
          <CatalogSectionHeader
            id="catalog-featured-storefronts-title"
            onDark
            title="Tiendas que merecen atención"
          />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {featuredStorefronts.map((storefront, index) => (
                <RevealOnView className="min-w-0" delayMs={index * 55} key={`featured-${storefront.id}`}>
                  <PublicStorefrontCard compact storefront={storefront} />
                </RevealOnView>
              ))}
            </div>
        </section>
      ) : null}

      {areSecondaryStorefrontsEnabled &&
      !isStorefrontSuggestionsLoading &&
      storefrontsErrorMessage ? (
        <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white/80">
          No pudimos cargar las tiendas destacadas en este momento.
        </div>
      ) : null}

      {discoveryStorefronts.length > 0 ? (
        <>
          <hr className="border-t border-white/10" />
          <section className="grid gap-3">
            <CatalogSectionHeader
              id="catalog-discovery-storefronts-title"
              onDark
              title="Descubrí vendedores distintos"
            />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {discoveryStorefronts.map((storefront, index) => (
                <RevealOnView className="min-w-0" delayMs={index * 45} key={`discovery-${storefront.id}`}>
                  <PublicStorefrontCard compact storefront={storefront} />
                </RevealOnView>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {secondaryStorefrontGroups.length > 0 ? (
        <>
          <hr className="border-t border-white/10" />
          <section className="grid gap-3">
            <CatalogSectionHeader
              id="catalog-secondary-storefronts-title"
              onDark
              title="Sigue explorando tiendas completas"
            />
            <div className="grid gap-4">
              {secondaryStorefrontGroups.map((group, index) => (
                <RevealOnView className="min-w-0" delayMs={index * 70} key={`secondary-${group.storefront.id}`}>
                  <CatalogStorefrontSection group={group} />
                </RevealOnView>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {areSecondaryGroupsEnabled &&
      !isCompleteStorefrontGroupsLoading &&
      storefrontGroupsErrorMessage ? (
        <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white/80">
          No pudimos cargar las tiendas relacionadas en este momento.
        </div>
      ) : null}
      </div>
    </div>
  );
}

import { useEffect, useMemo } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import { PagePlaceholder } from "../components/PagePlaceholder";
import { AdminArtisanProfileActions } from "../features/admin/components/AdminArtisanProfileActions";
import { useAuth } from "../features/auth/useAuth";
import {
  usePublicArtisanProducts,
  usePublicStorefront,
  usePublicStorefrontsPage,
} from "../features/public/publicQueries";
import { PublicStorefrontCard } from "../features/public/components/PublicStorefrontCard";
import {
  consumePendingProductDetailReturn,
  restorePendingProductDetailScroll,
  saveProductDetailOrigin,
} from "../lib/browser/productDetailOrigin";
import {
  getProductSemanticTerms,
  getStorefrontReferenceSimilarityScore,
  getStorefrontSemanticTerms,
} from "../lib/discovery/semanticRelevance";

function withAlpha(color: string, alphaHex: string) {
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)) {
    return color;
  }

  const normalizedColor =
    color.length === 4
      ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
      : color;

  return `${normalizedColor}${alphaHex}`;
}

export function ArtisanProfilePage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { role, user } = useAuth();
  const storefrontQuery = usePublicStorefront(id, { enabled: Boolean(id) });
  const productsQuery = usePublicArtisanProducts(id, { enabled: Boolean(id) });
  const storefrontRecommendationsQuery = usePublicStorefrontsPage(
    {
      limit: 18,
      page: 1,
    },
    {
      enabled: Boolean(id),
    },
  );
  const storefront = storefrontQuery.data ?? null;
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);
  const isLoading = storefrontQuery.isLoading || productsQuery.isLoading;
  const isAdminViewing = role === "admin";
  const isOwnerViewing = role === "artisan" && user?.id === id;
  const errorMessage = !id
    ? "No encontramos el perfil solicitado."
    : storefrontQuery.error
      ? storefrontQuery.error.message
      : productsQuery.error
        ? productsQuery.error.message
        : null;

  const heroColor = "#7F6BFF";
  const storeTitle = storefront?.store_name || storefront?.full_name || "Tienda independiente";
  const description =
    storefront?.store_description ||
    "Descubri una seleccion de piezas hechas con identidad propia, materiales nobles y trabajo local.";
  const productCountLabel = `${products.length} producto${products.length === 1 ? "" : "s"} activos`;
  const productCardTheme = useMemo(
    () => ({
      badgeBackground: heroColor,
      badgeShadow: `0 12px 24px -18px ${withAlpha(heroColor, "99")}`,
      cardBackground: `linear-gradient(180deg, ${withAlpha(heroColor, "14")} 0%, ${withAlpha(
        heroColor,
        "08",
      )} 36%, rgba(255,255,255,0.97) 100%)`,
      cardBorder: withAlpha(heroColor, "4d"),
      categoryBackground: withAlpha(heroColor, "12"),
      categoryBorder: withAlpha(heroColor, "55"),
      ctaBackground: withAlpha(heroColor, "10"),
      ctaBorder: withAlpha(heroColor, "66"),
      ctaText: heroColor,
      emptyBackground: `linear-gradient(145deg, ${heroColor}, ${withAlpha(heroColor, "b3")})`,
      headerBadgeBackground: withAlpha(heroColor, "12"),
      headerBadgeBorder: withAlpha(heroColor, "40"),
      shadow: `0 28px 60px -44px ${withAlpha(heroColor, "7a")}`,
    }),
    [heroColor],
  );
  const profileReferenceTerms = useMemo(
    () =>
      Array.from(
        new Set([
          ...getStorefrontSemanticTerms(storefront),
          ...products.flatMap((product) => getProductSemanticTerms(product, storefront)),
        ]),
      ).slice(0, 36),
    [products, storefront],
  );
  const recommendedStorefronts = useMemo(() => {
    const candidateStorefronts =
      storefrontRecommendationsQuery.data?.items.filter(
        (candidateStorefront) => candidateStorefront.id !== storefront?.id,
      ) ?? [];

    return candidateStorefronts
      .map((candidateStorefront) => ({
        score: getStorefrontReferenceSimilarityScore(candidateStorefront, profileReferenceTerms),
        storefront: candidateStorefront,
      }))
      .filter(({ score }) => score > 0)
      .sort((leftStorefront, rightStorefront) => rightStorefront.score - leftStorefront.score)
      .slice(0, 3)
      .map(({ storefront: candidateStorefront }) => candidateStorefront);
  }, [profileReferenceTerms, storefront?.id, storefrontRecommendationsQuery.data]);

  const catalogAnchorLabel = isOwnerViewing ? "Ver mi catalogo" : "Ver catalogo";

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const pendingReturn = consumePendingProductDetailReturn(location);

    if (!pendingReturn) {
      return;
    }

    restorePendingProductDetailScroll(pendingReturn.scrollY);
  }, [isLoading, location]);

  if (isLoading) {
    return (
      <PagePlaceholder
        badge="Vendedor"
        description="Estamos preparando el perfil publico del vendedor."
        title="Cargando tienda"
      />
    );
  }

  if (!storefront) {
    return (
      <PagePlaceholder
        badge="Vendedor"
        description={errorMessage || "No encontramos este perfil publico."}
        title="Perfil no disponible"
      />
    );
  }

  return (
    <PagePlaceholder description="" hideHeader title="">
      {isAdminViewing && id ? (
        <div className="mb-4 flex justify-end">
          <AdminArtisanProfileActions artisanId={id} />
        </div>
      ) : null}

      <div>
        <section
          className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-[0_24px_70px_-48px_rgba(71,85,105,0.45)]"
          style={{
            background: `linear-gradient(180deg, ${heroColor}14 0%, #ffffff 38%, #ffffff 100%)`,
          }}
        >
          <div
            className="h-28 w-full sm:h-32"
            style={{
              background: `linear-gradient(120deg, ${heroColor}, #475569)`,
            }}
          />

          <div className="relative px-4 pb-6 sm:px-7">
            <div className="-mt-14 rounded-3xl border border-white/80 bg-white/96 p-4 shadow-[0_28px_70px_-44px_rgba(71,85,105,0.35)] backdrop-blur-sm sm:-mt-16 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-24 w-24 items-center justify-center rounded-3xl border-4 border-white text-3xl font-semibold text-white shadow-lg sm:h-28 sm:w-28"
                    style={{ backgroundColor: heroColor }}
                  >
                    {storefront.profile_image_url ? (
                      <img
                        alt={storeTitle}
                        className="h-full w-full rounded-2xl object-cover"
                        loading="eager"
                        src={storefront.profile_image_url}
                      />
                    ) : (
                      storeTitle.charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500">
                      Tienda independiente
                    </p>
                    <h2 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
                      {storeTitle}
                    </h2>
                    <p className="mt-2 text-sm text-stone-500">{storefront.full_name}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <div
                    className="inline-flex rounded-full px-4 py-2 text-sm font-semibold text-white"
                    style={{ backgroundColor: heroColor }}
                  >
                    {productCountLabel}
                  </div>
                  {isOwnerViewing ? (
                    <Link
                      className="inline-flex min-h-10 items-center justify-center rounded-full border border-ocean-500 bg-white px-4 py-2 text-sm font-semibold text-ocean-500 transition-colors hover:bg-brand-50"
                      to="/panel/vendedor/tienda"
                    >
                      Editar tienda
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-base leading-7 text-stone-600">{description}</p>

              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold text-white transition-colors sm:w-auto"
                  href="#catalogo-vendedor"
                  onClick={(event) => {
                    event.preventDefault();
                    document
                      .getElementById("catalogo-vendedor")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  style={{
                    backgroundColor: heroColor,
                    boxShadow: `0 18px 36px -24px ${withAlpha(heroColor, "cc")}`,
                  }}
                >
                  {catalogAnchorLabel}
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="mt-8" id="catalogo-vendedor">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-500">
              Catalogo
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">
              Piezas disponibles de {storeTitle}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex rounded-full px-3 py-1.5 text-sm font-medium"
              style={{
                backgroundColor: productCardTheme.headerBadgeBackground,
                border: `1px solid ${productCardTheme.headerBadgeBorder}`,
                color: heroColor,
              }}
            >
              {products.length} pieza{products.length === 1 ? "" : "s"}
            </div>
            {isOwnerViewing ? (
              <Link
                className="inline-flex min-h-10 items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold transition-colors"
                style={{
                  border: `1px solid ${productCardTheme.ctaBorder}`,
                  color: heroColor,
                }}
                to="/panel/vendedor/productos"
              >
                Subir producto
              </Link>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Link
              key={product.id}
              className="group overflow-hidden rounded-3xl transition-all hover:-translate-y-1"
              onClick={() => {
                saveProductDetailOrigin(location);
              }}
              style={{
                background: productCardTheme.cardBackground,
                border: `1px solid ${productCardTheme.cardBorder}`,
                boxShadow: productCardTheme.shadow,
              }}
              to={`/producto/${product.id}`}
            >
              <div className="relative">
                {(product.product_media?.[0]?.thumbnail_url ??
                  product.product_media?.[0]?.url ??
                  product.image_urls[0] ??
                  product.image_url) ? (
                  <img
                    alt={product.title}
                    className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                    src={
                      product.product_media?.[0]?.thumbnail_url ??
                      product.product_media?.[0]?.url ??
                      product.image_urls[0] ??
                      product.image_url ??
                      ""
                    }
                  />
                ) : (
                  <div
                    className="flex aspect-[4/3] items-end p-5"
                    style={{
                      background: productCardTheme.emptyBackground,
                    }}
                  >
                    <p className="max-w-[14rem] text-lg font-semibold text-white">
                      {product.title}
                    </p>
                  </div>
                )}

                <div
                  className="absolute right-3 top-3 rounded-full px-3 py-1 text-sm font-semibold text-white"
                  style={{
                    backgroundColor: productCardTheme.badgeBackground,
                    boxShadow: productCardTheme.badgeShadow,
                  }}
                >
                  ${Number(product.price).toLocaleString("es-AR")}
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest"
                    style={{
                      backgroundColor: productCardTheme.categoryBackground,
                      border: `1px solid ${productCardTheme.categoryBorder}`,
                      color: heroColor,
                    }}
                  >
                    {product.categories?.name ?? "Sin categoria"}
                  </span>
                </div>

                <h3 className="mt-3 text-lg font-semibold text-stone-900">
                  {product.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600">
                  {product.description || "Producto publicado por este vendedor."}
                </p>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-stone-500">{storeTitle}</span>
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors"
                    style={{
                      backgroundColor: productCardTheme.ctaBackground,
                      border: `1px solid ${productCardTheme.ctaBorder}`,
                      color: productCardTheme.ctaText,
                    }}
                  >
                    Ver detalle
                    <span aria-hidden="true">→</span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {recommendedStorefronts.length > 0 ? (
          <section className="mt-8 grid gap-4 border-t border-stone-200 pt-6">
            <div className="grid gap-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-500">
                Afinidad
              </p>
              <h3 className="text-xl font-semibold tracking-tight text-stone-900">
                Otras tiendas que pueden interesarte
              </h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {recommendedStorefronts.map((recommendedStorefront) => (
                <PublicStorefrontCard
                  compact
                  key={recommendedStorefront.id}
                  storefront={recommendedStorefront}
                />
              ))}
            </div>
          </section>
        ) : null}

        {products.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-stone-300 bg-white/85 p-6 text-sm leading-6 text-stone-600">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Esta tienda todavia no tiene piezas activas publicadas. Cuando suba nuevas, van a aparecer aca.
              </p>
              {isOwnerViewing ? (
                <Link
                  className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
                  to="/panel/vendedor/productos"
                >
                  Subir producto
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </PagePlaceholder>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { PagePlaceholder } from "../components/PagePlaceholder";
import { useAuth } from "../features/auth/useAuth";
import { useBuyerFavorites, useToggleBuyerFavorite } from "../features/buyer/buyerQueries";
import {
  usePublicBuyerProfile,
  usePublicCatalogProductFeedInfinite,
} from "../features/public/publicQueries";
import {
  getCatalogImageSrcSet,
  getOptimizedCatalogImageUrl,
} from "../lib/images/catalogImageUrl";
import type { PublicProduct } from "../types/public";

function getProductImageUrl(product: PublicProduct) {
  const media = product.product_media?.find((item) => item.thumbnail_url || item.url);

  return (
    media?.thumbnail_url ??
    media?.url ??
    product.image_urls?.[0] ??
    product.image_url ??
    ""
  );
}

function getLocalDayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function uniqueActiveProducts(products: Array<PublicProduct | null | undefined>) {
  const seenProductIds = new Set<string>();

  return products.filter((product): product is PublicProduct => {
    if (!product || product.is_active === false || seenProductIds.has(product.id)) {
      return false;
    }

    seenProductIds.add(product.id);
    return true;
  });
}

function getDailyRotatedProducts(products: PublicProduct[], buyerId: string | undefined) {
  const seed = `${buyerId ?? "buyer"}:${getLocalDayKey()}`;

  return [...products].sort(
    (left, right) =>
      hashString(`${seed}:${left.id}`) - hashString(`${seed}:${right.id}`),
  );
}

export function BuyerProfilePage() {
  const { id } = useParams<{ id?: string }>();
  const { profile, user } = useAuth();
  const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);
  const [pendingInterestId, setPendingInterestId] = useState<string | null>(null);
  const [interestError, setInterestError] = useState<string | null>(null);
  const requestedBuyerId = id ?? user?.id;
  const isOwnerViewing = Boolean(user?.id && requestedBuyerId === user.id);
  const showInterestModule = Boolean(isOwnerViewing && user?.id);
  const publicProfileQuery = usePublicBuyerProfile(requestedBuyerId, {
    enabled: Boolean(requestedBuyerId),
  });
  const favoritesQuery = useBuyerFavorites(user?.id, showInterestModule);
  const feedQuery = usePublicCatalogProductFeedInfinite(
    {
      categoryId: null,
      limit: 18,
      sort: "newest",
    },
    {
      enabled: showInterestModule,
    },
  );
  const toggleFavoriteMutation = useToggleBuyerFavorite(user?.id);
  const publicProfile = publicProfileQuery.data;
  const fallbackProfile =
    isOwnerViewing && profile
      ? {
          full_name: profile.full_name,
          id: profile.id,
          profile_bio: profile.buyer_profile_bio ?? profile.store_description,
          profile_image_url: profile.profile_image_url,
        }
      : null;
  const buyerProfile = publicProfile ?? fallbackProfile;
  const favoriteIds = useMemo(
    () => new Set((favoritesQuery.data ?? []).map((favorite) => favorite.product_id)),
    [favoritesQuery.data],
  );
  const interestProducts = useMemo(() => {
    const favoriteProducts = (favoritesQuery.data ?? []).map((favorite) => favorite.product);
    const feedProducts =
      feedQuery.data?.pages.flatMap((page) => page.items.map((item) => item.product)) ?? [];

    return uniqueActiveProducts([...favoriteProducts, ...feedProducts]).slice(0, 5);
  }, [favoritesQuery.data, feedQuery.data]);
  const suggestionProducts = useMemo(() => {
    const feedProducts =
      feedQuery.data?.pages.flatMap((page) => page.items.map((item) => item.product)) ?? [];
    const candidates = uniqueActiveProducts(feedProducts).filter(
      (product) => !favoriteIds.has(product.id),
    );

    return getDailyRotatedProducts(candidates, user?.id).slice(0, 3);
  }, [favoriteIds, feedQuery.data, user?.id]);
  const isInterestsLoading =
    showInterestModule && (favoritesQuery.isLoading || feedQuery.isLoading);

  useEffect(() => {
    if (!isInterestModalOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsInterestModalOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isInterestModalOpen]);

  const handleOpenInterests = () => {
    if (!showInterestModule) {
      return;
    }

    setInterestError(null);
    setIsInterestModalOpen(true);
  };

  const handleSelectInterest = async (productId: string) => {
    if (!user?.id || favoriteIds.has(productId)) {
      setIsInterestModalOpen(false);
      return;
    }

    setPendingInterestId(productId);
    setInterestError(null);

    try {
      await toggleFavoriteMutation.mutateAsync(productId);
      setIsInterestModalOpen(false);
    } catch (error) {
      setInterestError(
        error instanceof Error ? error.message : "No pudimos guardar este interes.",
      );
    } finally {
      setPendingInterestId(null);
    }
  };

  if (!requestedBuyerId) {
    return (
      <PagePlaceholder
        badge="Perfil"
        description="No pudimos identificar el perfil solicitado."
        title="Perfil no disponible"
      />
    );
  }

  if (publicProfileQuery.isLoading && !buyerProfile) {
    return (
      <PagePlaceholder
        badge="Perfil"
        description="Estamos preparando este perfil."
        title="Cargando perfil"
      />
    );
  }

  if (!buyerProfile) {
    return (
      <PagePlaceholder
        badge="Perfil"
        description={
          publicProfileQuery.error?.message ?? "No pudimos cargar este perfil de comprador."
        }
        title="Perfil no disponible"
      />
    );
  }

  const description = buyerProfile.profile_bio?.trim() ?? "";

  return (
    <PagePlaceholder badge="Perfil" description="" hideHeader title="">
      <section className="overflow-hidden rounded-[2rem] border border-stone-200 bg-[linear-gradient(180deg,_#fff9ef,_#ffffff_42%,_#ffffff)] shadow-[0_24px_70px_-48px_rgba(71,85,105,0.35)]">
        <div className="h-24 w-full bg-[linear-gradient(120deg,_#0e7490,_#475569)] sm:h-28" />
        <div className="relative px-4 pb-5 sm:px-6 sm:pb-6">
          <div className="-mt-12 rounded-[1.75rem] border border-white/80 bg-white/96 p-4 shadow-[0_28px_70px_-44px_rgba(71,85,105,0.35)] backdrop-blur-sm sm:-mt-14 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.5rem] border-4 border-white bg-[#475569] text-2xl font-semibold text-white shadow-lg sm:h-24 sm:w-24 sm:text-3xl">
                {buyerProfile.profile_image_url ? (
                  <img
                    alt={buyerProfile.full_name}
                    className="h-full w-full object-cover"
                    loading="eager"
                    src={buyerProfile.profile_image_url}
                  />
                ) : (
                  buyerProfile.full_name.charAt(0).toUpperCase()
                )}
              </div>

              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
                  {buyerProfile.full_name}
                </h1>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
            <div className="rounded-[1.5rem] border border-stone-200 bg-white px-5 py-5 shadow-sm">
              {description ? (
                <p className="min-h-24 text-base leading-7 text-stone-600">{description}</p>
              ) : (
                <div aria-hidden="true" className="min-h-24" />
              )}
            </div>

            {showInterestModule ? (
              <section className="rounded-[1.5rem] border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#475569]">
                    Tus intereses
                  </h2>
                  <button
                    className="rounded-full border border-stone-200 px-3 py-1 text-xs font-semibold text-stone-600 transition-colors hover:border-[#9b5735]/40 hover:text-[#7a4328]"
                    onClick={handleOpenInterests}
                    type="button"
                  >
                    Ajustar
                  </button>
                </div>

                <div className="mt-3 grid gap-2">
                  {isInterestsLoading
                    ? Array.from({ length: 5 }).map((_, index) => (
                        <div
                          aria-hidden="true"
                          className="h-12 animate-pulse rounded-xl bg-stone-100"
                          key={`interest-loading-${index}`}
                        />
                      ))
                    : interestProducts.map((product) => {
                        const imageUrl = getProductImageUrl(product);

                        return (
                          <button
                            className="group grid min-h-12 grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3 rounded-xl border border-stone-200 bg-white px-2 py-1.5 text-left transition-all hover:border-[#9b5735]/35 hover:bg-[#fff8ec]"
                            key={product.id}
                            onClick={handleOpenInterests}
                            type="button"
                          >
                            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-stone-100 text-xs font-semibold text-stone-500">
                              {imageUrl ? (
                                <img
                                  alt=""
                                  className="h-full w-full object-cover"
                                  decoding="async"
                                  loading="lazy"
                                  sizes="40px"
                                  src={getOptimizedCatalogImageUrl(imageUrl, 96, 62)}
                                  srcSet={getCatalogImageSrcSet(imageUrl, [80, 96, 128], 62)}
                                />
                              ) : (
                                product.title.charAt(0).toUpperCase()
                              )}
                            </span>
                            <span className="truncate text-sm font-medium text-stone-800 group-hover:text-white">
                              {product.title}
                            </span>
                          </button>
                        );
                      })}

                  {!isInterestsLoading &&
                    Array.from({ length: Math.max(0, 5 - interestProducts.length) }).map(
                      (_, index) => (
                        <button
                          className="h-12 rounded-xl border border-dashed border-stone-200 bg-stone-50/70 text-sm font-medium text-stone-400"
                          disabled={suggestionProducts.length === 0}
                          key={`interest-empty-${index}`}
                          onClick={handleOpenInterests}
                          type="button"
                        >
                          Elegir pieza
                        </button>
                      ),
                    )}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </section>

      {showInterestModule && isInterestModalOpen ? (
        <div
          aria-labelledby="buyer-interests-title"
          aria-modal="true"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-stone-950/45 px-4 py-6 backdrop-blur-sm"
          role="dialog"
        >
          <button
            aria-label="Cerrar"
            className="absolute inset-0 cursor-default"
            onClick={() => setIsInterestModalOpen(false)}
            type="button"
          />

          <section className="relative z-[1] w-full max-w-lg rounded-[1.5rem] border border-white/70 bg-[#fff9ef] p-4 shadow-[0_28px_80px_-36px_rgba(35,24,15,0.65)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2
                className="text-lg font-semibold tracking-tight text-white"
                id="buyer-interests-title"
              >
                Marcar intereses
              </h2>
              <button
                aria-label="Cerrar"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-lg leading-none text-stone-500 shadow-sm transition-colors hover:text-stone-800"
                onClick={() => setIsInterestModalOpen(false)}
                type="button"
              >
                x
              </button>
            </div>

            {suggestionProducts.length > 0 ? (
              <div className="grid gap-2">
                {suggestionProducts.map((product) => {
                  const imageUrl = getProductImageUrl(product);
                  const isSaving = pendingInterestId === product.id;

                  return (
                    <button
                      className="grid min-h-16 grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-stone-200 bg-white px-2.5 py-2 text-left shadow-sm transition-all hover:border-[#9b5735]/40 hover:bg-white"
                      disabled={Boolean(pendingInterestId)}
                      key={product.id}
                      onClick={() => {
                        void handleSelectInterest(product.id);
                      }}
                      type="button"
                    >
                      <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-stone-100 text-sm font-semibold text-stone-500">
                        {imageUrl ? (
                          <img
                            alt=""
                            className="h-full w-full object-cover"
                            decoding="async"
                            loading="eager"
                            sizes="48px"
                            src={getOptimizedCatalogImageUrl(imageUrl, 128, 64)}
                            srcSet={getCatalogImageSrcSet(imageUrl, [96, 128, 160], 64)}
                          />
                        ) : (
                          product.title.charAt(0).toUpperCase()
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-stone-900">
                          {product.title}
                        </span>
                        <span className="block truncate text-xs text-stone-500">
                          {product.categories?.name ?? "Producto independiente"}
                        </span>
                      </span>
                      <span className="rounded-full bg-[#f4dfb4] px-3 py-1 text-xs font-semibold text-[#6f4128]">
                        {isSaving ? "..." : "Me gusta"}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-stone-300 bg-white/75 p-5 text-sm text-stone-500">
                No hay sugerencias disponibles.
              </div>
            )}

            {interestError ? (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {interestError}
              </p>
            ) : null}
          </section>
        </div>
      ) : null}
    </PagePlaceholder>
  );
}

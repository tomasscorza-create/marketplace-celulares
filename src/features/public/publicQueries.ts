import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { getCatalogViewerSeed } from "../../lib/browser/catalogViewerSeed";
import { queryKeys } from "../../lib/query/queryKeys";
import type {
  PublicArtisanStorefront,
  PublicBuyerProfile,
  PublicCatalogProductFeedPage,
  PublicCatalogSortOrder,
  PublicCatalogStorefrontGroupsPage,
  PublicCatalogStorefrontSuggestions,
  PublicCategory,
  PublicProduct,
  PublicStorefrontsPage,
} from "../../types/public";
import {
  getCachedPublicProduct,
  getPublicArtisanProducts,
  getPublicBuyerProfile,
  getPublicArtisanStorefront,
  getPublicArtisanStorefronts,
  getPublicCatalogStorefrontSuggestions,
  getPublicCompleteCatalogStorefrontGroupsPage,
  getPublicCatalogProductFeedPage,
  getPublicCatalogStorefrontGroupsPage,
  getPublicCategories,
  getPublicProductById,
  getPublicStorefrontsPage,
  getPublicStorefrontsByIds,
} from "./publicClient";

const TWO_MINUTES = 2 * 60 * 1000;
const FIVE_MINUTES = 5 * 60 * 1000;
const TEN_MINUTES = 10 * 60 * 1000;

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

async function resolveListQuery<T>(
  loader: () => Promise<{ data: T[] | null; error: { message: string } | null }>,
  fallbackMessage: string,
) {
  const response = await loader();

  if (response.error) {
    throw new Error(getErrorMessage(response.error, fallbackMessage));
  }

  return response.data ?? [];
}

async function resolveSingleQuery<T>(
  loader: () => Promise<{ data: T | null; error: { message: string } | null }>,
  fallbackMessage: string,
) {
  const response = await loader();

  if (response.error || !response.data) {
    throw new Error(getErrorMessage(response.error, fallbackMessage));
  }

  return response.data;
}

async function resolvePageQuery<T>(
  loader: () => Promise<{ data: T | null; error: { message: string } | null }>,
  fallbackMessage: string,
) {
  const response = await loader();

  if (response.error || !response.data) {
    throw new Error(getErrorMessage(response.error, fallbackMessage));
  }

  return response.data;
}

type QueryOptions = {
  enabled?: boolean;
};

export function usePublicCategories(options?: QueryOptions) {
  return useQuery<PublicCategory[]>({
    enabled: options?.enabled ?? true,
    staleTime: TEN_MINUTES,
    queryKey: queryKeys.public.categories,
    queryFn: () =>
      resolveListQuery(
        () => getPublicCategories(),
        "No pudimos cargar las categorias disponibles.",
      ),
  });
}

export function usePublicCatalogProductFeedInfinite(
  params: {
    categoryId?: string | null;
    limit: number;
    search?: string;
    sort: PublicCatalogSortOrder;
  },
  options?: QueryOptions,
) {
  const rotationSeed = getCatalogViewerSeed("feed");

  return useInfiniteQuery<PublicCatalogProductFeedPage>({
    enabled: options?.enabled ?? true,
    initialPageParam: 1,
    staleTime: TWO_MINUTES,
    queryKey: [...queryKeys.public.catalogProductFeedInfinite(params), rotationSeed],
    queryFn: ({ pageParam }) =>
      resolvePageQuery(
        () =>
          getPublicCatalogProductFeedPage({
            ...params,
            page: Number(pageParam),
          }),
        "No pudimos cargar el feed principal del catalogo en este momento.",
      ),
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce((sum, page) => sum + page.items.length, 0);

      if (loadedCount >= lastPage.totalCount) {
        return undefined;
      }

      return allPages.length + 1;
    },
  });
}

export function usePublicCatalogStorefrontGroupsPage(
  params: {
    categoryId?: string | null;
    limit: number;
    page: number;
    productsPerStorefront: number;
    search?: string;
  },
  options?: QueryOptions,
) {
  const rotationSeed = getCatalogViewerSeed("groups");

  return useQuery<PublicCatalogStorefrontGroupsPage>({
    enabled: options?.enabled ?? true,
    placeholderData: (previousData) => previousData,
    staleTime: TWO_MINUTES,
    queryKey: [...queryKeys.public.catalogStorefrontGroupsPage(params), rotationSeed],
    queryFn: () =>
      resolvePageQuery(
        () => getPublicCatalogStorefrontGroupsPage(params),
        "No pudimos cargar el catalogo agrupado por vendedor en este momento.",
      ),
  });
}

export function usePublicCatalogStorefrontSuggestions(
  params: {
    categoryId?: string | null;
    discoveryLimit: number;
    featuredLimit: number;
    search?: string;
  },
  options?: QueryOptions,
) {
  const rotationSeed = getCatalogViewerSeed("storefronts");

  return useQuery<PublicCatalogStorefrontSuggestions>({
    enabled: options?.enabled ?? true,
    placeholderData: (previousData) => previousData,
    staleTime: FIVE_MINUTES,
    queryKey: [...queryKeys.public.catalogStorefrontSuggestions(params), rotationSeed],
    queryFn: () =>
      resolvePageQuery(
        () => getPublicCatalogStorefrontSuggestions(params),
        "No pudimos cargar las sugerencias de tiendas en este momento.",
      ),
  });
}

export function usePublicCompleteCatalogStorefrontGroupsPage(
  params: {
    categoryId?: string | null;
    limit: number;
    page: number;
    productsPerStorefront: number;
    search?: string;
  },
  options?: QueryOptions,
) {
  const rotationSeed = getCatalogViewerSeed("groups");

  return useQuery<PublicCatalogStorefrontGroupsPage>({
    enabled: options?.enabled ?? true,
    placeholderData: (previousData) => previousData,
    staleTime: TWO_MINUTES,
    queryKey: [...queryKeys.public.completeCatalogStorefrontGroupsPage(params), rotationSeed],
    queryFn: () =>
      resolvePageQuery(
        () => getPublicCompleteCatalogStorefrontGroupsPage(params),
        "No pudimos cargar las tiendas completas sugeridas en este momento.",
      ),
  });
}

export function usePublicStorefronts(limit?: number, options?: QueryOptions) {
  return useQuery<PublicArtisanStorefront[]>({
    enabled: options?.enabled ?? true,
    staleTime: FIVE_MINUTES,
    queryKey: queryKeys.public.storefronts({ limit }),
    queryFn: () =>
      resolveListQuery(
        () => getPublicArtisanStorefronts(limit),
        "No pudimos cargar los perfiles de vendedores en este momento.",
      ),
  });
}

export function usePublicStorefrontsPage(
  params: {
    limit: number;
    page: number;
    search?: string;
  },
  options?: QueryOptions,
) {
  return useQuery<PublicStorefrontsPage>({
    enabled: options?.enabled ?? true,
    placeholderData: (previousData) => previousData,
    staleTime: FIVE_MINUTES,
    queryKey: queryKeys.public.storefrontsPage(params),
    queryFn: () =>
      resolvePageQuery(
        () => getPublicStorefrontsPage(params),
        "No pudimos cargar los vendedores en este momento.",
      ),
  });
}

export function usePublicStorefrontsByIds(artisanIds: string[], options?: QueryOptions) {
  const sortedIds = [...artisanIds].sort();
  const isEnabled = (options?.enabled ?? true) && sortedIds.length > 0;

  return useQuery<PublicArtisanStorefront[]>({
    enabled: isEnabled,
    staleTime: FIVE_MINUTES,
    queryKey: queryKeys.public.storefrontsByIds(sortedIds),
    queryFn: () =>
      resolveListQuery(
        () => getPublicStorefrontsByIds(sortedIds),
        "No pudimos cargar la informacion de vendedores relacionada.",
      ),
  });
}

export function usePublicProduct(productId: string | undefined, options?: QueryOptions) {
  const isEnabled = (options?.enabled ?? true) && Boolean(productId);

  return useQuery<PublicProduct>({
    enabled: isEnabled,
    initialData: productId ? getCachedPublicProduct(productId) ?? undefined : undefined,
    staleTime: FIVE_MINUTES,
    queryKey: queryKeys.public.product(productId ?? "missing"),
    queryFn: () =>
      resolveSingleQuery(
        () => getPublicProductById(productId!),
        "No pudimos cargar este producto o ya no esta disponible.",
      ),
  });
}

export function usePublicBuyerProfile(buyerId: string | undefined, options?: QueryOptions) {
  const isEnabled = (options?.enabled ?? true) && Boolean(buyerId);

  return useQuery<PublicBuyerProfile>({
    enabled: isEnabled,
    staleTime: FIVE_MINUTES,
    queryKey: queryKeys.public.buyerProfile(buyerId ?? "missing"),
    queryFn: () =>
      resolveSingleQuery(
        () => getPublicBuyerProfile(buyerId!),
        "No pudimos cargar este perfil de comprador.",
      ),
  });
}

export function usePublicStorefront(artisanId: string | undefined, options?: QueryOptions) {
  const isEnabled = (options?.enabled ?? true) && Boolean(artisanId);

  return useQuery<PublicArtisanStorefront>({
    enabled: isEnabled,
    staleTime: FIVE_MINUTES,
    queryKey: queryKeys.public.storefront(artisanId ?? "missing"),
    queryFn: () =>
      resolveSingleQuery(
        () => getPublicArtisanStorefront(artisanId!),
        "No pudimos cargar este perfil de vendedor.",
      ),
  });
}

export function usePublicArtisanProducts(artisanId: string | undefined, options?: QueryOptions) {
  const isEnabled = (options?.enabled ?? true) && Boolean(artisanId);

  return useQuery<PublicProduct[]>({
    enabled: isEnabled,
    staleTime: TWO_MINUTES,
    queryKey: queryKeys.public.artisanProducts(artisanId ?? "missing"),
    queryFn: () =>
      resolveListQuery(
        () => getPublicArtisanProducts(artisanId!),
        "No pudimos cargar los productos de este vendedor.",
      ),
  });
}

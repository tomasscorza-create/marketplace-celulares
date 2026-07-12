import { useEffect } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";

import { getCatalogViewerSeed } from "../../lib/browser/catalogViewerSeed";
import { queryKeys } from "../../lib/query/queryKeys";
import type { PublicCatalogProductFeedPage } from "../../types/public";
import {
  CATALOG_DISCOVERY_STOREFRONTS_FETCH_LIMIT,
  CATALOG_FEATURED_STOREFRONTS_FETCH_LIMIT,
  CATALOG_FEED_PAGE_SIZE,
  CATALOG_SECONDARY_GROUPS_FETCH_LIMIT,
  CATALOG_SECONDARY_PRODUCTS_PER_STOREFRONT,
} from "./catalogPageUtils";
import {
  getPublicCatalogProductFeedPage,
  getPublicCatalogStorefrontSuggestions,
  getPublicCategories,
  getPublicCompleteCatalogStorefrontGroupsPage,
} from "./publicClient";

type NavigatorWithConnection = Navigator & {
  connection?: {
    effectiveType?: string;
    saveData?: boolean;
  };
};

function shouldWarmCatalog(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/vendedores" ||
    pathname.startsWith("/vendedor/") ||
    pathname.startsWith("/producto/")
  );
}

function shouldSkipWarmupForConnection() {
  if (typeof navigator === "undefined") {
    return true;
  }

  const connection = (navigator as NavigatorWithConnection).connection;

  return Boolean(
    connection?.saveData ||
      connection?.effectiveType === "slow-2g" ||
      connection?.effectiveType === "2g",
  );
}

export function useCatalogWarmup() {
  const location = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!shouldWarmCatalog(location.pathname)) {
      return;
    }

    let isCancelled = false;
    if (shouldSkipWarmupForConnection()) {
      return;
    }

    let secondaryTimeoutId: number | null = null;
    let startTimeoutId: number | null = null;
    let idleHandle: number | null = null;
    const feedRotationSeed = getCatalogViewerSeed("feed");
    const storefrontRotationSeed = getCatalogViewerSeed("storefronts");
    const groupsRotationSeed = getCatalogViewerSeed("groups");

    const startWarmup = () => {
      if (isCancelled) {
        return;
      }

      void queryClient.prefetchQuery({
        queryKey: queryKeys.public.categories,
        queryFn: async () => {
          const response = await getPublicCategories();

          if (response.error) {
            throw new Error(response.error.message || "No pudimos precargar las categorias.");
          }

          return response.data ?? [];
        },
      });

      void queryClient.prefetchInfiniteQuery({
        queryKey: [
          ...queryKeys.public.catalogProductFeedInfinite({
            categoryId: null,
            limit: CATALOG_FEED_PAGE_SIZE,
            search: undefined,
            sort: "newest",
          }),
          feedRotationSeed,
        ],
        initialPageParam: 1,
        queryFn: async ({ pageParam }) => {
          const response = await getPublicCatalogProductFeedPage({
            categoryId: null,
            limit: CATALOG_FEED_PAGE_SIZE,
            page: Number(pageParam),
            search: undefined,
            sort: "newest",
          });

          if (response.error || !response.data) {
            throw new Error(
              response.error?.message || "No pudimos precargar el catalogo principal.",
            );
          }

          return response.data;
        },
        getNextPageParam: (
          lastPage: PublicCatalogProductFeedPage,
          allPages: PublicCatalogProductFeedPage[],
        ) => {
          const loadedCount = allPages.reduce(
            (sum: number, page: PublicCatalogProductFeedPage) => sum + page.items.length,
            0,
          );

          if (loadedCount >= lastPage.totalCount) {
            return undefined;
          }

          return allPages.length + 1;
        },
      });

      secondaryTimeoutId = window.setTimeout(() => {
        if (isCancelled) {
          return;
        }

        void queryClient.prefetchQuery({
          queryKey: [
            ...queryKeys.public.catalogStorefrontSuggestions({
              categoryId: null,
              discoveryLimit: CATALOG_DISCOVERY_STOREFRONTS_FETCH_LIMIT,
              featuredLimit: CATALOG_FEATURED_STOREFRONTS_FETCH_LIMIT,
              search: undefined,
            }),
            storefrontRotationSeed,
          ],
          queryFn: async () => {
            const response = await getPublicCatalogStorefrontSuggestions({
              categoryId: null,
              discoveryLimit: CATALOG_DISCOVERY_STOREFRONTS_FETCH_LIMIT,
              featuredLimit: CATALOG_FEATURED_STOREFRONTS_FETCH_LIMIT,
              search: undefined,
            });

            if (response.error || !response.data) {
              throw new Error(
                response.error?.message || "No pudimos precargar las tiendas destacadas.",
              );
            }

            return response.data;
          },
        });

        void queryClient.prefetchQuery({
          queryKey: [
            ...queryKeys.public.completeCatalogStorefrontGroupsPage({
              categoryId: null,
              limit: CATALOG_SECONDARY_GROUPS_FETCH_LIMIT,
              page: 1,
              productsPerStorefront: CATALOG_SECONDARY_PRODUCTS_PER_STOREFRONT,
              search: undefined,
            }),
            groupsRotationSeed,
          ],
          queryFn: async () => {
            const response = await getPublicCompleteCatalogStorefrontGroupsPage({
              categoryId: null,
              limit: CATALOG_SECONDARY_GROUPS_FETCH_LIMIT,
              page: 1,
              productsPerStorefront: CATALOG_SECONDARY_PRODUCTS_PER_STOREFRONT,
              search: undefined,
            });

            if (response.error || !response.data) {
              throw new Error(
                response.error?.message ||
                  "No pudimos precargar las tiendas completas del catalogo.",
              );
            }

            return response.data;
          },
        });
      }, 220);
    };

    const idleCallback =
      typeof window !== "undefined" && "requestIdleCallback" in window
        ? window.requestIdleCallback.bind(window)
        : null;
    const cancelIdleCallback =
      typeof window !== "undefined" && "cancelIdleCallback" in window
        ? window.cancelIdleCallback.bind(window)
        : null;

    if (idleCallback) {
      idleHandle = idleCallback(startWarmup, { timeout: 1_200 });
    } else {
      startTimeoutId = window.setTimeout(startWarmup, 650);
    }

    return () => {
      isCancelled = true;

      if (idleHandle !== null && cancelIdleCallback) {
        cancelIdleCallback(idleHandle);
      }
      if (startTimeoutId !== null) {
        window.clearTimeout(startTimeoutId);
      }
      if (secondaryTimeoutId !== null) {
        window.clearTimeout(secondaryTimeoutId);
      }
    };
  }, [location.pathname, queryClient]);
}

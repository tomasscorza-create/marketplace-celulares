import type { QueryClient } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getErrorMessage } from "@/lib/errors";
import { queryKeys } from "@/lib/query/queryKeys";
import type {
  ArtisanProduct,
  ArtisanProductInput,
  ArtisanStoreProfileInput,
} from "@/types/artisan";
import type { UserProfile } from "@/types/auth";
import type { FulfillmentStatus } from "@/types/commerce";
import type { PaginatedResult, PaginationParams } from "@/types/pagination";
import type { ArtisanProductLearningProfile } from "./artisanProductLearning";
import { buildArtisanProductLearningProfile } from "./artisanProductLearning";
import {
  type ArtisanProductListParams,
  type ArtisanProductStats,
  createArtisanProduct,
  deleteArtisanProduct,
  getArtisanCategories,
  getEditableArtisanProductById,
  getArtisanProductStats,
  getArtisanProducts,
  updateOrderItemFulfillmentStatus,
  updateArtisanProduct,
  updateArtisanProductQuickFields,
  updateArtisanStoreProfile,
  type ArtisanProductQuickUpdateInput,
} from "./artisanClient";

const TWO_MINUTES = 2 * 60 * 1000;
const FIVE_MINUTES = 5 * 60 * 1000;

type ArtisanCategory = { id: string; name: string };
type ArtisanProductsQueryParams = ArtisanProductListParams;

function toPaginatedResult<T>(
  data: T[] | null,
  count: number | null,
  params?: Partial<PaginationParams>,
): PaginatedResult<T> {
  const page = Math.max(1, Math.floor(params?.page ?? 1));
  const pageSize = Math.max(1, Math.floor(params?.limit ?? data?.length ?? 0));

  return {
    count: count ?? data?.length ?? 0,
    items: data ?? [],
    page,
    pageSize,
  };
}

function invalidatePublicProductCaches(
  queryClient: QueryClient,
  artisanId: string,
  productIds: string[] = [],
) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.artisan.products(artisanId),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.artisan.productStats(artisanId),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.artisan.productLearning(artisanId),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.public.artisanProducts(artisanId),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.public.storefront(artisanId),
  });
  void queryClient.invalidateQueries({
    queryKey: ["public", "catalog-product-feed-infinite"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["public", "catalog-storefront-groups-page"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["public", "complete-catalog-storefront-groups-page"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["public", "catalog-storefront-suggestions"],
  });

  productIds.forEach((productId) => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.public.product(productId),
    });
  });
}

// ─── Categorías visibles para el vendedor ───────────────────────────────

function isProductDeleteRestrictedError(
  error: { code?: string; message?: string } | null,
) {
  const message = `${error?.message ?? ""}`.toLowerCase();

  return (
    error?.code === "23503" ||
    message.includes("order_items_product_artisan_fkey") ||
    message.includes("cart_items_product_id_fkey") ||
    message.includes("violates foreign key constraint")
  );
}

export function useArtisanCategories() {
  return useQuery<ArtisanCategory[]>({
    staleTime: FIVE_MINUTES,
    queryKey: queryKeys.artisan.categories,
    queryFn: async () => {
      const response = await getArtisanCategories();

      if (response.error) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos cargar las categorías."),
        );
      }

      return response.data ?? [];
    },
  });
}

// ─── Productos del vendedor ─────────────────────────────────────────────

export function useArtisanProducts(
  artisanId: string | undefined,
  enabled = true,
  params?: ArtisanProductsQueryParams,
) {
  const isEnabled = enabled && Boolean(artisanId);

  return useQuery<PaginatedResult<ArtisanProduct>>({
    enabled: isEnabled,
    staleTime: TWO_MINUTES,
    queryKey: [
      ...queryKeys.artisan.products(artisanId ?? "missing"),
      params ?? {},
    ],
    queryFn: async () => {
      const response = await getArtisanProducts(artisanId!, params);

      if (response.error) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos cargar tus productos."),
        );
      }

      return toPaginatedResult(response.data, response.count, params);
    },
  });
}

export function useArtisanProductStats(
  artisanId: string | undefined,
  enabled = true,
) {
  const isEnabled = enabled && Boolean(artisanId);

  return useQuery<ArtisanProductStats>({
    enabled: isEnabled,
    staleTime: TWO_MINUTES,
    queryKey: queryKeys.artisan.productStats(artisanId ?? "missing"),
    queryFn: async () => {
      const response = await getArtisanProductStats(artisanId!);

      if (response.error || !response.data) {
        throw new Error(
          getErrorMessage(
            response.error,
            "No pudimos cargar las metricas de productos.",
          ),
        );
      }

      return response.data;
    },
  });
}

export function useEditableArtisanProduct(
  productId: string | undefined,
  enabled = true,
) {
  const isEnabled = enabled && Boolean(productId);

  return useQuery<ArtisanProduct>({
    enabled: isEnabled,
    staleTime: TWO_MINUTES,
    queryKey: queryKeys.artisan.product(productId ?? "missing"),
    queryFn: async () => {
      const response = await getEditableArtisanProductById(productId!);

      if (response.error || !response.data) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos cargar el producto."),
        );
      }

      return response.data;
    },
  });
}

export function useArtisanProductLearningProfile(
  artisanId: string | undefined,
  categories: ArtisanCategory[],
  enabled = true,
) {
  const isEnabled = enabled && Boolean(artisanId) && categories.length > 0;

  return useQuery<ArtisanProductLearningProfile>({
    enabled: isEnabled,
    staleTime: FIVE_MINUTES,
    queryKey: [
      ...queryKeys.artisan.productLearning(artisanId ?? "missing"),
      categories.map((category) => category.id),
    ],
    queryFn: async () => {
      const response = await getArtisanProducts(artisanId!, {
        limit: 120,
        page: 1,
      });

      if (response.error) {
        throw new Error(
          getErrorMessage(
            response.error,
            "No pudimos leer el historial de carga.",
          ),
        );
      }

      return buildArtisanProductLearningProfile(
        response.data ?? [],
        categories,
      );
    },
  });
}

export function useCreateArtisanProduct(artisanId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<ArtisanProduct, Error, ArtisanProductInput>({
    mutationFn: async (input) => {
      if (!artisanId) {
        throw new Error(
          "Falta identificar al vendedor para crear el producto.",
        );
      }

      const response = await createArtisanProduct(artisanId, input);

      if (response.error || !response.data) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos crear el producto."),
        );
      }

      return response.data;
    },
    onSuccess: (product) => {
      if (!artisanId) return;
      invalidatePublicProductCaches(queryClient, artisanId, [product.id]);
    },
  });
}

export function useUpdateArtisanProduct(artisanId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<
    ArtisanProduct,
    Error,
    { productId: string; input: ArtisanProductInput }
  >({
    mutationFn: async ({ productId, input }) => {
      const response = await updateArtisanProduct(productId, input);

      if (response.error || !response.data) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos actualizar el producto."),
        );
      }

      return response.data;
    },
    onSuccess: (product) => {
      if (!artisanId) return;
      invalidatePublicProductCaches(queryClient, artisanId, [product.id]);
    },
  });
}

export function useQuickUpdateArtisanProduct(artisanId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<
    ArtisanProduct,
    Error,
    { productId: string; input: ArtisanProductQuickUpdateInput }
  >({
    mutationFn: async ({ productId, input }) => {
      const response = await updateArtisanProductQuickFields(productId, input);

      if (response.error || !response.data) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos guardar los cambios."),
        );
      }

      return response.data;
    },
    onSuccess: (product) => {
      void queryClient.setQueryData(
        queryKeys.artisan.product(product.id),
        product,
      );
      invalidatePublicProductCaches(
        queryClient,
        artisanId ?? product.artisan_id,
        [product.id],
      );
    },
  });
}

export function useDeleteArtisanProduct(artisanId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (productId) => {
      const response = await deleteArtisanProduct(productId);

      if (response.error) {
        if (isProductDeleteRestrictedError(response.error)) {
          throw new Error(
            "Este producto ya tiene compras, intentos de compra o carritos asociados. Por seguridad no se puede eliminar sin borrar ese historial; ocultalo desde Editar para sacarlo del catalogo.",
          );
        }

        throw new Error(
          getErrorMessage(response.error, "No pudimos borrar el producto."),
        );
      }
    },
    onSuccess: (_data, productId) => {
      if (!artisanId) return;
      invalidatePublicProductCaches(queryClient, artisanId, [productId]);
    },
  });
}

// ─── Perfil de tienda del vendedor ──────────────────────────────────────

export function useUpdateArtisanStoreProfile() {
  return useMutation<
    UserProfile,
    Error,
    { profileId: string; input: ArtisanStoreProfileInput }
  >({
    mutationFn: async ({ profileId, input }) => {
      const response = await updateArtisanStoreProfile(profileId, input);

      if (response.error || !response.data) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos guardar tu tienda."),
        );
      }

      return response.data;
    },
    // Nota: no invalidamos por queryKey porque el perfil del usuario logueado
    // se gestiona desde AuthProvider (refreshProfile()). El consumer debe
    // llamar refreshProfile() después del éxito.
  });
}

export function useUpdateOrderItemFulfillmentStatus(
  artisanId: string | undefined,
) {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { orderItemId: string; status: FulfillmentStatus }
  >({
    mutationFn: async ({ orderItemId, status }) => {
      const response = await updateOrderItemFulfillmentStatus(
        orderItemId,
        status,
      );

      if (response.error) {
        throw new Error(
          getErrorMessage(
            response.error,
            "No pudimos actualizar el estado del pedido.",
          ),
        );
      }
    },
    onSuccess: () => {
      if (!artisanId) {
        return;
      }

      void queryClient.invalidateQueries({
        queryKey: queryKeys.artisan.sales(artisanId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.admin.dashboardSnapshot,
      });
    },
  });
}

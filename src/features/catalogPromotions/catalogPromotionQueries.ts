import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getErrorMessage } from "@/lib/errors";
import { queryKeys } from "@/lib/query/queryKeys";
import { getAdminDashboardProducts } from "@/features/admin/adminClient";
import type { AdminDashboardProduct } from "@/types/admin";
import type { CatalogPromotionInput } from "@/types/catalogPromotions";

import {
  claimCatalogPromotion,
  createCatalogPromotion,
  deleteCatalogPromotion,
  getAdminCatalogPromotions,
  getCatalogPromotionClaims,
  getPublicCatalogPromotions,
  updateCatalogPromotion,
} from "./catalogPromotionClient";
import { isCatalogPromotionVisible, sortCatalogPromotions } from "./catalogPromotionUtils";

const ONE_MINUTE = 60 * 1000;

export function usePublicCatalogPromotions(userId?: string | null) {
  return useQuery({
    queryKey: queryKeys.public.catalogPromotions(userId ?? null),
    queryFn: async () => {
      const promotionsResponse = await getPublicCatalogPromotions();

      if (promotionsResponse.error) {
        throw new Error(
          getErrorMessage(promotionsResponse.error, "No pudimos cargar las promociones."),
        );
      }

      const promotions = sortCatalogPromotions(
        (promotionsResponse.data ?? []).filter((promotion) =>
          isCatalogPromotionVisible(promotion),
        ),
      );
      if (!userId || promotions.length === 0) {
        return { claimedPromotionIds: [] as string[], promotions };
      }

      const claimsResponse = await getCatalogPromotionClaims(
        promotions.map((promotion) => promotion.id),
      );
      if (claimsResponse.error) {
        throw new Error(
          getErrorMessage(claimsResponse.error, "No pudimos consultar tus beneficios."),
        );
      }

      return {
        claimedPromotionIds: (claimsResponse.data ?? []).map((claim) => claim.promotion_id),
        promotions,
      };
    },
    retry: false,
    staleTime: ONE_MINUTE,
  });
}

export function useAdminCatalogPromotions() {
  return useQuery({
    queryKey: queryKeys.admin.catalogPromotions,
    queryFn: async () => {
      const response = await getAdminCatalogPromotions();
      if (response.error) {
        throw new Error(getErrorMessage(response.error, "No pudimos cargar las promociones."));
      }
      return sortCatalogPromotions(response.data ?? []);
    },
    staleTime: ONE_MINUTE,
  });
}

export function useCatalogPromotionProductOptions() {
  return useQuery<AdminDashboardProduct[]>({
    queryKey: queryKeys.admin.dashboardProducts,
    queryFn: async () => {
      const response = await getAdminDashboardProducts({ limit: 250, page: 1 });
      if (response.error) {
        throw new Error(getErrorMessage(response.error, "No pudimos cargar los productos."));
      }
      return response.data ?? [];
    },
    staleTime: ONE_MINUTE,
  });
}

function useRefreshCatalogPromotions() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.catalogPromotions });
    void queryClient.invalidateQueries({ queryKey: ["public", "catalog-promotions"] });
  };
}

export function useSaveCatalogPromotion() {
  const refresh = useRefreshCatalogPromotions();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string | null; input: CatalogPromotionInput }) => {
      const response = id
        ? await updateCatalogPromotion(id, input)
        : await createCatalogPromotion(input);
      if (response.error || !response.data) {
        throw new Error(getErrorMessage(response.error, "No pudimos guardar la promoción."));
      }
      return response.data;
    },
    onSuccess: refresh,
  });
}

export function useDeleteCatalogPromotion() {
  const refresh = useRefreshCatalogPromotions();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await deleteCatalogPromotion(id);
      if (response.error) {
        throw new Error(getErrorMessage(response.error, "No pudimos eliminar la promoción."));
      }
    },
    onSuccess: refresh,
  });
}

export function useClaimCatalogPromotion(userId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (promotionId: string) => {
      const response = await claimCatalogPromotion(promotionId);
      if (response.error || !response.data) {
        throw new Error(getErrorMessage(response.error, "No pudimos guardar el beneficio."));
      }
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.public.catalogPromotions(userId ?? null),
      });
    },
  });
}

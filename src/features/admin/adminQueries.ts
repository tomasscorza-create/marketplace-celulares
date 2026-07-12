import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getErrorMessage } from "@/lib/errors";
import { queryKeys } from "@/lib/query/queryKeys";
import type {
  AdminArtisanDeleteResult,
  AdminArtisanProfile,
  AdminArtisanMovementsSnapshot,
  AdminArtisanProfileControlsInput,
  AdminArtisanProfileInput,
  AdminArtisanProfileUpdateInput,
  AdminBillingPeriod,
  AdminBillingSnapshot,
  AdminBuyerAccountsSnapshot,
  AdminCategory,
  AdminCategoryInput,
  AdminDashboardSnapshot,
  AdminProductControlBoostLevel,
  AdminProductControlSnapshot,
  AdminProductControlTag,
} from "@/types/admin";
import type { PaginationParams } from "@/types/pagination";
import {
  createAdminArtisanProfile,
  createAdminCategory,
  deleteAdminArtisanProfile,
  getAdminArtisanProfile,
  getAdminArtisanMovements,
  getAdminBillingSnapshot,
  getAdminBuyerAccountsSnapshot,
  getAdminArtisanProfiles,
  getAdminCategories,
  getAdminDashboardSnapshot,
  getAdminProductControlSnapshot,
  saveAdminProductControlRecord,
  saveAdminArtisanProfileControls,
  updateAdminArtisanProfile,
  updateAdminCategory,
} from "./adminClient";

const TWO_MINUTES = 2 * 60 * 1000;

export function useAdminCategories() {
  return useQuery<AdminCategory[]>({
    staleTime: TWO_MINUTES,
    queryKey: queryKeys.admin.categories,
    queryFn: async () => {
      const response = await getAdminCategories();

      if (response.error) {
        throw new Error(getErrorMessage(response.error, "No pudimos cargar las categorías."));
      }

      return response.data ?? [];
    },
  });
}

export function useCreateAdminCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AdminCategoryInput) => {
      const response = await createAdminCategory(input);

      if (response.error || !response.data) {
        throw new Error(getErrorMessage(response.error, "No pudimos crear la categoría."));
      }

      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.categories });
    },
  });
}

export function useUpdateAdminCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { categoryId: string; input: AdminCategoryInput }) => {
      const response = await updateAdminCategory(payload.categoryId, payload.input);

      if (response.error || !response.data) {
        throw new Error(getErrorMessage(response.error, "No pudimos actualizar la categoría."));
      }

      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.categories });
    },
  });
}

export function useAdminArtisanProfiles() {
  return useQuery<AdminArtisanProfile[]>({
    staleTime: TWO_MINUTES,
    queryKey: queryKeys.admin.artisanProfiles,
    queryFn: async () => {
      const response = await getAdminArtisanProfiles();

      if (response.error) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos cargar las cuentas vendedoras."),
        );
      }

      return response.data ?? [];
    },
  });
}

export function useAdminArtisanProfile(artisanId: string | null | undefined, enabled = true) {
  const isEnabled = enabled && Boolean(artisanId);

  return useQuery<AdminArtisanProfile>({
    enabled: isEnabled,
    staleTime: TWO_MINUTES,
    queryKey: queryKeys.admin.artisanProfile(artisanId ?? "missing"),
    queryFn: async () => {
      const response = await getAdminArtisanProfile(artisanId!);

      if (response.error || !response.data) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos cargar este perfil vendedor."),
        );
      }

      return response.data;
    },
  });
}

export function useAdminArtisanMovements(artisanId: string | null | undefined, enabled = true) {
  const isEnabled = enabled && Boolean(artisanId);

  return useQuery<AdminArtisanMovementsSnapshot>({
    enabled: isEnabled,
    staleTime: 30 * 1000,
    queryKey: queryKeys.admin.artisanMovements(artisanId ?? "missing"),
    queryFn: async () => {
      const response = await getAdminArtisanMovements(artisanId!);

      if (response.error || !response.data) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos cargar los movimientos."),
        );
      }

      return response.data;
    },
  });
}

export function useCreateAdminArtisanProfile() {
  const queryClient = useQueryClient();

  return useMutation<AdminArtisanProfile, Error, AdminArtisanProfileInput>({
    mutationFn: async (input) => {
      const response = await createAdminArtisanProfile(input);

      if (response.error || !response.data) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos crear la cuenta vendedora."),
        );
      }

      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.artisanProfiles });
    },
  });
}

export function useUpdateAdminArtisanProfile() {
  const queryClient = useQueryClient();

  return useMutation<
    AdminArtisanProfile,
    Error,
    { artisanId: string; input: AdminArtisanProfileUpdateInput }
  >({
    mutationFn: async (payload) => {
      const response = await updateAdminArtisanProfile(payload.artisanId, payload.input);

      if (response.error || !response.data) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos actualizar la cuenta vendedora."),
        );
      }

      return response.data;
    },
    onSuccess: (profile, payload) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.artisanProfiles });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.admin.artisanProfile(profile?.id ?? payload.artisanId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.public.storefront(profile?.id ?? payload.artisanId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.public.artisanProducts(profile?.id ?? payload.artisanId),
      });
      void queryClient.invalidateQueries({ queryKey: ["public", "storefronts-page"] });
      void queryClient.invalidateQueries({ queryKey: ["public", "storefronts"] });
      void queryClient.invalidateQueries({ queryKey: ["public", "catalog-storefront-groups-page"] });
      void queryClient.invalidateQueries({ queryKey: ["public", "catalog-storefront-suggestions"] });
    },
  });
}

export function useSaveAdminArtisanProfileControls() {
  const queryClient = useQueryClient();

  return useMutation<
    AdminArtisanProfile,
    Error,
    { artisanId: string; input: AdminArtisanProfileControlsInput }
  >({
    mutationFn: async (payload) => {
      const response = await saveAdminArtisanProfileControls(payload.artisanId, payload.input);

      if (response.error || !response.data) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos guardar la accion sobre esta cuenta."),
        );
      }

      return response.data;
    },
    onSuccess: (profile, payload) => {
      const artisanId = profile?.id ?? payload.artisanId;

      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.artisanProfiles });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboardSnapshot });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.artisanProfile(artisanId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.public.storefront(artisanId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.public.artisanProducts(artisanId),
      });
      void queryClient.invalidateQueries({ queryKey: ["public", "catalog-product-feed-infinite"] });
      void queryClient.invalidateQueries({ queryKey: ["public", "catalog-storefront-groups-page"] });
      void queryClient.invalidateQueries({ queryKey: ["public", "complete-catalog-storefront-groups-page"] });
      void queryClient.invalidateQueries({ queryKey: ["public", "catalog-storefront-suggestions"] });
      void queryClient.invalidateQueries({ queryKey: ["public", "storefronts-page"] });
      void queryClient.invalidateQueries({ queryKey: ["public", "storefronts"] });
    },
  });
}

export function useDeleteAdminArtisanProfile() {
  const queryClient = useQueryClient();

  return useMutation<AdminArtisanDeleteResult | null, Error, string>({
    mutationFn: async (artisanId) => {
      const response = await deleteAdminArtisanProfile(artisanId);

      if (response.error) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos borrar la cuenta vendedora."),
        );
      }

      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.artisanProfiles });
    },
  });
}

export function useAdminDashboardSnapshot(enabled = true) {
  return useQuery<AdminDashboardSnapshot>({
    enabled,
    refetchOnWindowFocus: true,
    staleTime: 15 * 1000,
    queryKey: queryKeys.admin.dashboardSnapshot,
    queryFn: async () => {
      const response = await getAdminDashboardSnapshot();

      if (response.error || !response.data) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos cargar el panel de administración."),
        );
      }

      return response.data;
    },
  });
}

export function useAdminBillingSnapshot(period: AdminBillingPeriod, enabled = true) {
  return useQuery<AdminBillingSnapshot>({
    enabled,
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
    queryKey: queryKeys.admin.billingSnapshot(period),
    queryFn: async () => {
      const response = await getAdminBillingSnapshot(period);

      if (response.error || !response.data) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos cargar la facturacion."),
        );
      }

      return response.data;
    },
  });
}

export function useAdminBuyerAccountsSnapshot(
  enabled = true,
  params?: Partial<PaginationParams>,
) {
  return useQuery<AdminBuyerAccountsSnapshot>({
    enabled,
    staleTime: TWO_MINUTES,
    queryKey: [...queryKeys.admin.buyerAccountsSnapshot, params ?? {}],
    queryFn: async () => {
      const response = await getAdminBuyerAccountsSnapshot(params);

      if (response.error) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos cargar las cuentas compradoras."),
        );
      }

      return response.data ?? { buyers: [], buyersCount: 0 };
    },
  });
}

export function useAdminProductControlSnapshot(
  enabled = true,
  params?: Partial<PaginationParams>,
) {
  return useQuery<AdminProductControlSnapshot>({
    enabled,
    refetchOnWindowFocus: true,
    staleTime: 15 * 1000,
    queryKey: [...queryKeys.admin.productControlSnapshot, params ?? {}],
    queryFn: async () => {
      const response = await getAdminProductControlSnapshot(params);

      if (response.error || !response.data) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos cargar el control de productos."),
        );
      }

      return response.data;
    },
  });
}

export function useSaveAdminProductControlRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      productId: string;
      input: {
        boostLevel?: AdminProductControlBoostLevel | null;
        boostUntil?: string | null;
        comment?: string | null;
        internalTag?: AdminProductControlTag | null;
      };
    }) => {
      const response = await saveAdminProductControlRecord(payload.productId, payload.input);

      if (response.error) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos guardar este control de producto."),
        );
      }

      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.productControlSnapshot });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.productControlTags });
    },
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "../../lib/query/queryKeys";
import type {
  BuyerAccountSummary,
  BuyerFavoriteRecord,
  BuyerPreferenceRecord,
  BuyerProfileInput,
} from "../../types/buyer";
import type { UserProfile } from "../../types/auth";
import type { PaginatedResult, PaginationParams } from "../../types/pagination";
import {
  clearBuyerPersonalizationSignalsCache,
  getBuyerAccountSummary,
  getBuyerFavorites,
  getBuyerOrderById,
  getBuyerOrderEvents,
  getBuyerOrderHistory,
  getBuyerPreferences,
  toggleBuyerFavorite,
  updateBuyerProfile,
} from "./buyerClient";
import type { OrderEventRecord, OrderRecord } from "../../types/commerce";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function useBuyerPreferences(buyerId: string | undefined, enabled = true) {
  const isEnabled = enabled && Boolean(buyerId);

  return useQuery<BuyerPreferenceRecord | null>({
    enabled: isEnabled,
    staleTime: 2 * 60 * 1000,
    queryKey: queryKeys.buyer.preferences(buyerId ?? "missing"),
    queryFn: async () => {
      const response = await getBuyerPreferences(buyerId!);

      if (response.error) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos cargar tus datos de compra."),
        );
      }

      return response.data ?? null;
    },
  });
}

export function useBuyerOrderHistory(
  buyerId: string | undefined,
  enabled = true,
  params?: Partial<PaginationParams>,
) {
  const isEnabled = enabled && Boolean(buyerId);

  return useQuery<OrderRecord[]>({
    enabled: isEnabled,
    staleTime: 60 * 1000,
    queryKey: [...queryKeys.buyer.orders(buyerId ?? "missing"), params ?? {}],
    queryFn: async () => {
      const response = await getBuyerOrderHistory(buyerId!, params);

      if (response.error) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos cargar tu historial."),
        );
      }

      return response.data ?? [];
    },
  });
}

export function useBuyerOrderHistoryPage(
  buyerId: string | undefined,
  enabled = true,
  params: PaginationParams,
) {
  const isEnabled = enabled && Boolean(buyerId);

  return useQuery<PaginatedResult<OrderRecord>>({
    enabled: isEnabled,
    staleTime: 45 * 1000,
    queryKey: [...queryKeys.buyer.orders(buyerId ?? "missing"), "page", params],
    queryFn: async () => {
      const response = await getBuyerOrderHistory(buyerId!, params);

      if (response.error) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos cargar tu historial."),
        );
      }

      return {
        count: response.count ?? response.data?.length ?? 0,
        items: response.data ?? [],
        page: params.page,
        pageSize: params.limit,
      };
    },
  });
}

export function useBuyerOrder(
  buyerId: string | undefined,
  orderId: string | undefined,
  enabled = true,
) {
  const isEnabled = enabled && Boolean(buyerId) && Boolean(orderId);

  return useQuery<OrderRecord | null>({
    enabled: isEnabled,
    staleTime: 30 * 1000,
    queryKey: queryKeys.buyer.order(buyerId ?? "missing", orderId ?? "missing"),
    queryFn: async () => {
      const response = await getBuyerOrderById(buyerId!, orderId!);

      if (response.error) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos cargar este pedido."),
        );
      }

      return response.data ?? null;
    },
  });
}

export function useBuyerOrderEvents(
  buyerId: string | undefined,
  orderId: string | undefined,
  enabled = true,
) {
  const isEnabled = enabled && Boolean(buyerId) && Boolean(orderId);

  return useQuery<OrderEventRecord[]>({
    enabled: isEnabled,
    staleTime: 30 * 1000,
    queryKey: queryKeys.buyer.orderEvents(buyerId ?? "missing", orderId ?? "missing"),
    queryFn: async () => {
      const response = await getBuyerOrderEvents(buyerId!, orderId!);

      if (response.error) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos cargar el seguimiento."),
        );
      }

      return response.data ?? [];
    },
  });
}

export function useBuyerFavorites(buyerId: string | undefined, enabled = true) {
  const isEnabled = enabled && Boolean(buyerId);

  return useQuery<BuyerFavoriteRecord[]>({
    enabled: isEnabled,
    staleTime: 60 * 1000,
    queryKey: queryKeys.buyer.favorites(buyerId ?? "missing"),
    queryFn: async () => {
      const response = await getBuyerFavorites(buyerId!);

      if (response.error) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos cargar tus favoritos."),
        );
      }

      return response.data ?? [];
    },
  });
}

export function useBuyerAccountSummary(buyerId: string | undefined, enabled = true) {
  const isEnabled = enabled && Boolean(buyerId);

  return useQuery<BuyerAccountSummary>({
    enabled: isEnabled,
    staleTime: 45 * 1000,
    queryKey: queryKeys.buyer.accountSummary(buyerId ?? "missing"),
    queryFn: async () => {
      const response = await getBuyerAccountSummary(buyerId!);

      if (response.error) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos resumir tu actividad."),
        );
      }

      return response.data;
    },
  });
}

export function useUpdateBuyerAccount(buyerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<UserProfile, Error, BuyerProfileInput>({
    mutationFn: async (input) => {
      if (!buyerId) {
        throw new Error("Falta identificar tu cuenta para actualizarla.");
      }

      const response = await updateBuyerProfile(buyerId, input);

      if (response.error || !response.data) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos guardar tu cuenta."),
        );
      }

      return response.data;
    },
    onSuccess: () => {
      if (!buyerId) {
        return;
      }

      clearBuyerPersonalizationSignalsCache(buyerId);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.buyer.preferences(buyerId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.buyer.accountSummary(buyerId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.buyer.cartValidation(buyerId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.auth.profile(buyerId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.public.buyerProfile(buyerId),
      });
    },
  });
}

export function useToggleBuyerFavorite(buyerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<{ isFavorite: boolean }, Error, string>({
    mutationFn: async (productId) => {
      if (!buyerId) {
        throw new Error("Necesitás una cuenta de comprador para usar favoritos.");
      }

      const response = await toggleBuyerFavorite(buyerId, productId);

      if (response.error || !response.data) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos actualizar favoritos."),
        );
      }

      return response.data;
    },
    onSuccess: () => {
      if (!buyerId) {
        return;
      }

      clearBuyerPersonalizationSignalsCache(buyerId);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.buyer.favorites(buyerId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.buyer.accountSummary(buyerId),
      });
    },
  });
}

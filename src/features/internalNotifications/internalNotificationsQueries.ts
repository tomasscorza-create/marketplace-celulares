import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getErrorMessage } from "@/lib/errors";
import { queryKeys } from "@/lib/query/queryKeys";
import type { UserProfile } from "@/types/auth";
import type {
  AdminInternalNotification,
  InternalNotification,
  InternalNotificationInput,
  InternalNotificationItem,
  InternalNotificationSignature,
} from "@/types/internalNotifications";

import {
  createInternalNotification,
  deleteInternalNotification,
  getAdminInternalNotifications,
  getArtisanInternalNotificationItems,
  signInternalNotification,
} from "./internalNotificationsClient";

const ONE_MINUTE = 60 * 1000;

export function useAdminInternalNotifications() {
  return useQuery<AdminInternalNotification[]>({
    staleTime: ONE_MINUTE,
    queryKey: queryKeys.admin.internalNotifications,
    queryFn: async () => {
      const response = await getAdminInternalNotifications();

      if (response.error) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos cargar las notificaciones."),
        );
      }

      return response.data ?? [];
    },
  });
}

export function useCreateInternalNotification(adminId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<InternalNotification, Error, InternalNotificationInput>({
    mutationFn: async (input) => {
      if (!adminId) {
        throw new Error("Falta identificar al admin.");
      }

      const response = await createInternalNotification(input, adminId);

      if (response.error || !response.data) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos crear la notificacion."),
        );
      }

      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.admin.internalNotifications,
      });
      void queryClient.invalidateQueries({
        queryKey: ["artisan", "pending-internal-notifications"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["artisan", "internal-notifications"],
      });
    },
  });
}

export function useDeleteInternalNotification() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (notificationId) => {
      const response = await deleteInternalNotification(notificationId);

      if (response.error) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos eliminar la notificacion."),
        );
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.admin.internalNotifications,
      });
      void queryClient.invalidateQueries({
        queryKey: ["artisan", "pending-internal-notifications"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["artisan", "internal-notifications"],
      });
    },
  });
}

export function useArtisanInternalNotifications(
  artisanId: string | undefined,
  enabled = true,
) {
  const isEnabled = enabled && Boolean(artisanId);

  return useQuery<InternalNotificationItem[]>({
    enabled: isEnabled,
    staleTime: ONE_MINUTE,
    queryKey: queryKeys.artisan.internalNotifications(artisanId ?? "missing"),
    queryFn: async () => {
      const response = await getArtisanInternalNotificationItems(artisanId!);

      if (response.error) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos cargar las notificaciones."),
        );
      }

      return response.data ?? [];
    },
  });
}

export function useArtisanPendingInternalNotificationCount(
  artisanId: string | undefined,
  enabled = true,
) {
  const query = useArtisanInternalNotifications(artisanId, enabled);

  return {
    ...query,
    data: query.data?.filter((item) => !item.signature).length ?? 0,
  };
}

export function useSignInternalNotification(profile: UserProfile | null) {
  const queryClient = useQueryClient();

  return useMutation<InternalNotificationSignature, Error, string>({
    mutationFn: async (notificationId) => {
      if (!profile) {
        throw new Error("Falta identificar al vendedor.");
      }

      const response = await signInternalNotification(notificationId, profile);

      if (response.error || !response.data) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos registrar la firma."),
        );
      }

      return response.data;
    },
    onSuccess: () => {
      if (!profile) return;

      void queryClient.invalidateQueries({
        queryKey: queryKeys.artisan.internalNotifications(profile.id),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.artisan.pendingInternalNotifications(profile.id),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.admin.internalNotifications,
      });
    },
  });
}

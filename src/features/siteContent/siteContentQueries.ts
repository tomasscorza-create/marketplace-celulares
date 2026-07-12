import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getErrorMessage } from "@/lib/errors";
import { queryKeys } from "@/lib/query/queryKeys";

import { getSiteContent, saveSiteContent, type SiteContentValues } from "./siteContentClient";

const FIVE_MINUTES = 5 * 60 * 1000;

export function useSiteContent(contentKeys: string[], defaults: SiteContentValues) {
  return useQuery<SiteContentValues>({
    gcTime: 30 * 60 * 1000,
    queryKey: queryKeys.siteContent.items(contentKeys),
    queryFn: async () => {
      const response = await getSiteContent(contentKeys);

      if (response.error) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos cargar los textos del sitio."),
        );
      }

      const remoteValues = Object.fromEntries(
        (response.data ?? []).map((item) => [item.content_key, item.value]),
      );

      return {
        ...defaults,
        ...remoteValues,
      };
    },
    retry: false,
    staleTime: FIVE_MINUTES,
  });
}

export function useSaveSiteContent(contentKeys: string[]) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { userId: string | null; values: SiteContentValues }) => {
      const response = await saveSiteContent(payload.values, payload.userId);

      if (response.error) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos guardar los textos del sitio."),
        );
      }

      return Object.fromEntries(
        (response.data ?? []).map((item) => [item.content_key, item.value]),
      ) as SiteContentValues;
    },
    onSuccess: (savedValues) => {
      queryClient.setQueryData<SiteContentValues>(
        queryKeys.siteContent.items(contentKeys),
        (currentValues) => ({
          ...(currentValues ?? {}),
          ...savedValues,
        }),
      );
    },
  });
}

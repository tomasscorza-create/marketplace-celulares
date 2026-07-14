import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "../../lib/query/queryKeys";
import { getAdminAnalyticsOverview, getAdminAnalyticsUserHistory } from "./analyticsData";

export function useAdminAnalyticsOverview(days: number, enabled = true) {
  return useQuery({
    enabled,
    queryKey: queryKeys.admin.analyticsOverview(days),
    queryFn: async () => {
      const { data, error } = await getAdminAnalyticsOverview(days);
      if (error || !data) throw new Error(error?.message ?? "No pudimos cargar la analítica.");
      return data;
    },
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}

export function useAdminAnalyticsUserHistory(userId: string | null, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(userId),
    queryKey: queryKeys.admin.analyticsUserHistory(userId ?? "missing"),
    queryFn: async () => {
      const { data, error } = await getAdminAnalyticsUserHistory(userId!);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

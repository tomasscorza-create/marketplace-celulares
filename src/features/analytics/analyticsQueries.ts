import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "../../lib/query/queryKeys";
import { getAdminAnalyticsOverview, getAdminAnalyticsUserHistory } from "./analyticsData";
import { getCurrentAnalyticsRefetchInterval } from "./analyticsRefresh";

const KEEP_PREVIOUS_ANALYTICS_DATA = <Data>(previousData: Data | undefined) => previousData;

export function useAdminAnalyticsOverview(days: number, enabled = true) {
  return useQuery({
    enabled,
    queryKey: queryKeys.admin.analyticsOverview(days),
    queryFn: async () => {
      const { data, error } = await getAdminAnalyticsOverview(days);
      if (error || !data) throw new Error(error?.message ?? "No pudimos cargar la analítica.");
      return data;
    },
    placeholderData: KEEP_PREVIOUS_ANALYTICS_DATA,
    refetchInterval: getCurrentAnalyticsRefetchInterval,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: "always",
    staleTime: 0,
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
    placeholderData: KEEP_PREVIOUS_ANALYTICS_DATA,
    refetchInterval: getCurrentAnalyticsRefetchInterval,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: "always",
    staleTime: 0,
  });
}

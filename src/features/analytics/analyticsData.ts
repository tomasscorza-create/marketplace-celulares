import type {
  AdminAnalyticsOverview,
  AdminAnalyticsUserEvent,
  AnalyticsConsent,
} from "../../types/analytics";

import { getSupabaseClient } from "../../lib/supabase/client";
import { ANALYTICS_POLICY_VERSION } from "./analyticsContract";

export async function getAnalyticsConsent(userId: string) {
  const client = getSupabaseClient();
  return client
    .from("analytics_consents")
    .select("user_id, policy_version, accepted_at, revoked_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle<AnalyticsConsent>();
}

export async function saveAnalyticsConsent(accepted: boolean) {
  const client = getSupabaseClient();
  return client.rpc("save_analytics_consent", {
    requested_acceptance: accepted,
    requested_policy_version: ANALYTICS_POLICY_VERSION,
  });
}

export async function getAdminAnalyticsOverview(days: number) {
  const client = getSupabaseClient();
  const [overviewResult, qualityResult, maintenanceResult] = await Promise.all([
    client.rpc("get_admin_analytics_overview", { requested_days: days }),
    client.rpc("get_admin_analytics_quality", { requested_days: days }),
    client.rpc("get_admin_analytics_maintenance_status"),
  ]) as unknown as [
    {
      data: Omit<AdminAnalyticsOverview, "analyticsMaintenance" | "anonymousQuality"> | null;
      error: { message: string } | null;
    },
    { data: AdminAnalyticsOverview["anonymousQuality"] | null; error: { message: string } | null },
    { data: AdminAnalyticsOverview["analyticsMaintenance"] | null; error: { message: string } | null },
  ];
  const error = overviewResult.error ?? qualityResult.error ?? maintenanceResult.error;

  return {
    data:
      !error && overviewResult.data && qualityResult.data && maintenanceResult.data
        ? {
          ...overviewResult.data,
          analyticsMaintenance: maintenanceResult.data,
          anonymousQuality: qualityResult.data,
        }
        : null,
    error,
  };
}

export async function getAdminAnalyticsUserHistory(userId: string) {
  const client = getSupabaseClient();
  return client.rpc("get_admin_analytics_user_history", {
    requested_limit: 80,
    requested_user_id: userId,
  }) as unknown as Promise<{
    data: AdminAnalyticsUserEvent[] | null;
    error: { message: string } | null;
  }>;
}

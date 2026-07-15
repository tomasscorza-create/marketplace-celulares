export const ADMIN_ANALYTICS_REFRESH_MS = 30_000;

export function getAdminAnalyticsRefetchInterval(visibilityState: DocumentVisibilityState) {
  return visibilityState === "visible" ? ADMIN_ANALYTICS_REFRESH_MS : false;
}

export function getCurrentAnalyticsRefetchInterval() {
  if (typeof document === "undefined") return false;
  return getAdminAnalyticsRefetchInterval(document.visibilityState);
}

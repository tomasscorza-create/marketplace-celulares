export type AnalyticsDeviceType = "computer" | "mobile" | "tablet" | "other";
export type AnalyticsOsFamily =
  | "windows"
  | "macos"
  | "linux"
  | "android"
  | "ios"
  | "ipados"
  | "chromeos"
  | "other";
export type AnalyticsPerformanceTier = "high" | "medium" | "low" | "unknown";
export type AnalyticsConfidence = "high" | "medium" | "low";
export type AnalyticsBrowserFamily = "chrome" | "safari" | "firefox" | "edge" | "opera" | "other";
export type AnalyticsConnectionType = "fast" | "standard" | "slow" | "unknown";
export type AnalyticsScreenSize = "small" | "medium" | "large";

export type AnalyticsDeviceContext = {
  browserFamily: AnalyticsBrowserFamily;
  classificationConfidence: AnalyticsConfidence;
  classifierVersion: string;
  connectionType: AnalyticsConnectionType;
  deviceType: AnalyticsDeviceType;
  osFamily: AnalyticsOsFamily;
  performanceTier: AnalyticsPerformanceTier;
  referrerDomain: string;
  screenSize: AnalyticsScreenSize;
};

export type AnalyticsEventName =
  | "page_view"
  | "product_view"
  | "artisan_view"
  | "search"
  | "filter"
  | "contact_click"
  | "signup_completed"
  | "favorite_add"
  | "cart_add"
  | "checkout_start"
  | "purchase_completed";

export type AnalyticsConsent = {
  accepted_at: string;
  policy_version: string;
  revoked_at: string | null;
  updated_at: string;
  user_id: string;
};

export type AnalyticsCountItem = {
  count: number;
  label: string;
};

export type AnalyticsLocationItem = {
  city: string;
  count: number;
  countryCode: string;
  region: string;
};

export type AnalyticsPageItem = {
  count: number;
  path: string;
};

export type AnalyticsRecentUser = {
  email: string;
  events: number;
  fullName: string;
  lastSeenAt: string;
  role: "artisan" | "buyer";
  sessions: number;
  userId: string;
};

export type AdminAnalyticsOverview = {
  anonymousPageViews: number;
  anonymousVisits: number;
  averageActiveSeconds: number;
  consentedPageViews: number;
  consentedSessions: number;
  consentedUsers: number;
  devices: AnalyticsCountItem[];
  locations: AnalyticsLocationItem[];
  operatingSystems: AnalyticsCountItem[];
  performanceTiers: AnalyticsCountItem[];
  periodDays: number;
  recentUsers: AnalyticsRecentUser[];
  topEvents: AnalyticsCountItem[];
  topPages: AnalyticsPageItem[];
};

export type AdminAnalyticsUserEvent = {
  city: string;
  country_code: string;
  device_type: AnalyticsDeviceType;
  entity_id: string | null;
  entity_type: string | null;
  event_name: AnalyticsEventName;
  occurred_at: string;
  os_family: AnalyticsOsFamily;
  path: string;
  performance_tier: AnalyticsPerformanceTier;
  region: string;
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders } from "../_shared/cors.ts";

const ANONYMOUS_EVENTS = new Set([
  "visit",
  "page_view",
  "product_view",
  "artisan_view",
  "search",
  "filter",
  "contact_click",
  "signup_started",
]);
const CONSENTED_EVENTS = new Set([
  "page_view",
  "product_view",
  "artisan_view",
  "search",
  "filter",
  "contact_click",
  "signup_completed",
  "favorite_add",
  "cart_add",
  "checkout_start",
  "purchase_completed",
]);
const DEVICE_TYPES = new Set(["computer", "mobile", "tablet", "other"]);
const OS_FAMILIES = new Set([
  "windows",
  "macos",
  "linux",
  "android",
  "ios",
  "ipados",
  "chromeos",
  "other",
]);
const PERFORMANCE_TIERS = new Set(["high", "medium", "low", "unknown"]);
const CONFIDENCE_LEVELS = new Set(["high", "medium", "low"]);
const BROWSER_FAMILIES = new Set(["chrome", "safari", "firefox", "edge", "opera", "other"]);
const CONNECTION_TYPES = new Set(["fast", "standard", "slow", "unknown"]);
const SCREEN_SIZES = new Set(["small", "medium", "large"]);
const ENTITY_TYPES = new Set(["product", "artisan", "category", "checkout"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const POLICY_VERSION_PATTERN = /^[a-z0-9._-]{1,40}$/i;

type AnalyticsContext = {
  browserFamily?: string;
  classificationConfidence?: string;
  classifierVersion?: string;
  connectionType?: string;
  deviceType?: string;
  osFamily?: string;
  performanceTier?: string;
  referrerDomain?: string;
  screenSize?: string;
};

type AnalyticsBody = {
  activeSeconds?: number;
  context?: AnalyticsContext;
  entityId?: string | null;
  entityType?: string | null;
  eventName?: string;
  mode?: "anonymous" | "consented";
  path?: string;
  policyVersion?: string;
  sessionId?: string | null;
};

type GeoSummary = {
  city: string;
  countryCode: string;
  region: string;
  timezone: string;
};

type RateWindow = {
  count: number;
  startedAt: number;
};

const rateWindows = new Map<string, RateWindow>();

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

function normalizeEnum(value: unknown, allowed: Set<string>, fallback: string) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return allowed.has(normalized) ? normalized : fallback;
}

function normalizeText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, maxLength);
  return normalized || fallback;
}

function normalizePath(value: unknown) {
  const rawPath = normalizeText(value, "/", 240).split(/[?#]/, 1)[0];
  return rawPath.startsWith("/") ? rawPath : "/";
}

function normalizeContext(value: AnalyticsContext | undefined) {
  return {
    browserFamily: normalizeEnum(value?.browserFamily, BROWSER_FAMILIES, "other"),
    classificationConfidence: normalizeEnum(
      value?.classificationConfidence,
      CONFIDENCE_LEVELS,
      "low",
    ),
    classifierVersion: normalizeText(value?.classifierVersion, "unknown", 30),
    connectionType: normalizeEnum(value?.connectionType, CONNECTION_TYPES, "unknown"),
    deviceType: normalizeEnum(value?.deviceType, DEVICE_TYPES, "other"),
    osFamily: normalizeEnum(value?.osFamily, OS_FAMILIES, "other"),
    performanceTier: normalizeEnum(value?.performanceTier, PERFORMANCE_TIERS, "unknown"),
    referrerDomain: normalizeText(value?.referrerDomain, "direct", 120).toLowerCase(),
    screenSize: normalizeEnum(value?.screenSize, SCREEN_SIZES, "medium"),
  };
}

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const candidate = forwarded || request.headers.get("x-real-ip")?.trim() || "";
  return candidate.slice(0, 64);
}

function isPrivateAddress(ipAddress: string) {
  return (
    !ipAddress ||
    ipAddress === "::1" ||
    ipAddress.startsWith("127.") ||
    ipAddress.startsWith("10.") ||
    ipAddress.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ipAddress) ||
    /^f[cd][0-9a-f]{2}:/i.test(ipAddress)
  );
}

function isRateLimited(ipAddress: string) {
  if (!ipAddress) return false;

  const now = Date.now();
  if (rateWindows.size > 2000) {
    for (const [key, value] of rateWindows) {
      if (now - value.startedAt >= 60_000) rateWindows.delete(key);
    }
  }
  const existing = rateWindows.get(ipAddress);
  if (!existing || now - existing.startedAt >= 60_000) {
    rateWindows.set(ipAddress, { count: 1, startedAt: now });
    return false;
  }

  existing.count += 1;
  return existing.count > 90;
}

async function resolveGeoSummary(request: Request, ipAddress: string): Promise<GeoSummary> {
  const fallback: GeoSummary = {
    city: "unknown",
    countryCode: normalizeText(
      request.headers.get("cf-ipcountry") ?? request.headers.get("x-country-code"),
      "unknown",
      8,
    ).toUpperCase(),
    region: "unknown",
    timezone: "unknown",
  };
  const token = Deno.env.get("IPINFO_TOKEN")?.trim();

  if (!token || isPrivateAddress(ipAddress)) return fallback;

  try {
    const response = await fetch(
      `https://api.ipinfo.io/lookup/${encodeURIComponent(ipAddress)}?token=${encodeURIComponent(token)}`,
      { signal: AbortSignal.timeout(1500) },
    );
    if (!response.ok) return fallback;

    const data = (await response.json()) as {
      geo?: {
        city?: string;
        country_code?: string;
        region?: string;
        timezone?: string;
      };
    };

    return {
      city: normalizeText(data.geo?.city, "unknown", 100),
      countryCode: normalizeText(data.geo?.country_code, fallback.countryCode, 8).toUpperCase(),
      region: normalizeText(data.geo?.region, "unknown", 100),
      timezone: normalizeText(data.geo?.timezone, "unknown", 80),
    };
  } catch {
    return fallback;
  }
}

async function recordAnonymous(
  adminClient: ReturnType<typeof createClient>,
  request: Request,
  body: AnalyticsBody,
  context: ReturnType<typeof normalizeContext>,
  ipAddress: string,
) {
  const eventName = normalizeEnum(body.eventName, ANONYMOUS_EVENTS, "");
  if (!eventName) return jsonResponse({ error: "Unsupported analytics event." }, 400);

  const geo = eventName === "visit"
    ? await resolveGeoSummary(request, ipAddress)
    : { city: "unknown", countryCode: "unknown", region: "unknown", timezone: "unknown" };
  const { error } = await adminClient.rpc("record_anonymous_analytics", {
    requested_city: geo.city,
    requested_country_code: geo.countryCode,
    requested_device_type: context.deviceType,
    requested_event_name: eventName,
    requested_os_family: context.osFamily,
    requested_path: normalizePath(body.path),
    requested_performance_tier: context.performanceTier,
    requested_referrer_domain: context.referrerDomain,
    requested_region: geo.region,
  });

  if (error) return jsonResponse({ error: "Analytics storage is not ready." }, 503);
  return jsonResponse({ accepted: true });
}

async function getAuthenticatedUser(
  adminClient: ReturnType<typeof createClient>,
  authorizationHeader: string | null,
) {
  const token = authorizationHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data, error } = await adminClient.auth.getUser(token);
  return error ? null : data.user;
}

async function recordConsented(
  adminClient: ReturnType<typeof createClient>,
  request: Request,
  body: AnalyticsBody,
  context: ReturnType<typeof normalizeContext>,
  ipAddress: string,
) {
  const user = await getAuthenticatedUser(adminClient, request.headers.get("Authorization"));
  if (!user) return jsonResponse({ error: "Authentication required." }, 401);

  const policyVersion = normalizeText(body.policyVersion, "", 40);
  if (!POLICY_VERSION_PATTERN.test(policyVersion)) {
    return jsonResponse({ error: "A valid policy version is required." }, 400);
  }

  const [{ data: consent }, { data: profile }] = await Promise.all([
    adminClient
      .from("analytics_consents")
      .select("policy_version, revoked_at")
      .eq("user_id", user.id)
      .maybeSingle<{ policy_version: string; revoked_at: string | null }>(),
    adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle<{ role: string }>(),
  ]);

  if (
    !consent ||
    consent.revoked_at ||
    consent.policy_version !== policyVersion ||
    !profile ||
    !["buyer", "artisan"].includes(profile.role)
  ) {
    return jsonResponse({ error: "Active analytics consent required." }, 403);
  }

  const requestedSessionId = typeof body.sessionId === "string" && UUID_PATTERN.test(body.sessionId)
    ? body.sessionId
    : null;
  let sessionId = requestedSessionId;
  let activeSeconds = 0;

  if (sessionId) {
    const { data: existingSession } = await adminClient
      .from("analytics_sessions")
      .select("id, active_seconds")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle<{ active_seconds: number; id: string }>();
    if (existingSession) {
      activeSeconds = existingSession.active_seconds;
    } else {
      sessionId = null;
    }
  }

  if (!sessionId) {
    const geo = await resolveGeoSummary(request, ipAddress);
    const { data: createdSession, error: sessionError } = await adminClient
      .from("analytics_sessions")
      .insert({
        browser_family: context.browserFamily,
        city: geo.city,
        classification_confidence: context.classificationConfidence,
        classifier_version: context.classifierVersion,
        connection_type: context.connectionType,
        country_code: geo.countryCode,
        device_type: context.deviceType,
        landing_path: normalizePath(body.path),
        os_family: context.osFamily,
        performance_tier: context.performanceTier,
        referrer_domain: context.referrerDomain,
        region: geo.region,
        screen_size: context.screenSize,
        timezone: geo.timezone,
        user_id: user.id,
      })
      .select("id")
      .single<{ id: string }>();

    if (sessionError || !createdSession) {
      return jsonResponse({ error: "Could not start analytics session." }, 503);
    }
    sessionId = createdSession.id;
  }

  const secondsToAdd = Math.min(Math.max(Math.floor(Number(body.activeSeconds) || 0), 0), 60);
  await adminClient
    .from("analytics_sessions")
    .update({
      active_seconds: Math.min(activeSeconds + secondsToAdd, 31_536_000),
      last_seen_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (body.eventName === "heartbeat") {
    return jsonResponse({ accepted: true, sessionId });
  }

  const eventName = normalizeEnum(body.eventName, CONSENTED_EVENTS, "");
  if (!eventName) return jsonResponse({ error: "Unsupported analytics event." }, 400);

  const entityType = normalizeEnum(body.entityType, ENTITY_TYPES, "") || null;
  const entityId = typeof body.entityId === "string" && UUID_PATTERN.test(body.entityId)
    ? body.entityId
    : null;
  const { error: eventError } = await adminClient.from("analytics_events").insert({
    entity_id: entityId,
    entity_type: entityType,
    event_name: eventName,
    path: normalizePath(body.path),
    session_id: sessionId,
    user_id: user.id,
  });

  if (eventError) return jsonResponse({ error: "Could not store analytics event." }, 503);
  return jsonResponse({ accepted: true, sessionId });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  try {
    const ipAddress = getClientIp(request);
    if (isRateLimited(ipAddress)) return jsonResponse({ error: "Too many requests." }, 429);

    const body = (await request.json().catch(() => null)) as AnalyticsBody | null;
    if (!body || (body.mode !== "anonymous" && body.mode !== "consented")) {
      return jsonResponse({ error: "Invalid analytics payload." }, 400);
    }

    const adminClient = createClient(
      getRequiredEnv("SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const context = normalizeContext(body.context);

    return body.mode === "anonymous"
      ? await recordAnonymous(adminClient, request, body, context, ipAddress)
      : await recordConsented(adminClient, request, body, context, ipAddress);
  } catch {
    return jsonResponse({ error: "Unexpected analytics collection error." }, 500);
  }
});

import type { AnalyticsEventName } from "../../types/analytics";

import { getSupabasePublicConfig, supabase } from "../../lib/supabase/client";
import {
  ANALYTICS_POLICY_VERSION,
  ANONYMOUS_ANALYTICS_EVENTS,
} from "./analyticsContract";
import { deliverAnalyticsEvent } from "./analyticsDelivery";
import { getAnalyticsDeviceContext } from "./deviceClassifier";

const PUBLIC_VISIT_MARKER = "analytics_public_visit_v1";
const CONSENTED_SESSION_PREFIX = "analytics_consented_session_v1";

type AnalyticsIdentity = {
  consented: boolean;
  userId: string | null;
};

type TrackEventOptions = {
  activeSeconds?: number;
  entityId?: string | null;
  entityType?: "product" | "artisan" | "category" | "checkout" | null;
  path?: string;
};

type AnalyticsFunctionResponse = {
  accepted?: boolean;
  sessionId?: string;
};

let analyticsIdentity: AnalyticsIdentity = { consented: false, userId: null };
let consentedEventQueue = Promise.resolve();
let publicVisitInFlight: Promise<boolean> | null = null;

function safeSessionStorageGet(key: string) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionStorageSet(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Analytics must never interrupt the user experience.
  }
}

function getSessionKey(userId: string) {
  return `${CONSENTED_SESSION_PREFIX}:${userId}`;
}

function normalizePath(path: string | undefined) {
  const nextPath = (path ?? window.location.pathname).split(/[?#]/, 1)[0];
  return nextPath.startsWith("/") ? nextPath.slice(0, 240) : "/";
}

async function invokeCollector(body: Record<string, unknown>) {
  const config = getSupabasePublicConfig();
  const client = supabase;
  if (!client || !config) return null;

  return deliverAnalyticsEvent<AnalyticsFunctionResponse>(async (eventId) => {
    const { data: authData } = await client.auth.getSession();
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 5_000);

    try {
      const response = await fetch(`${config.url}/functions/v1/collect-analytics`, {
        body: JSON.stringify({ ...body, eventId }),
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${authData.session?.access_token ?? config.anonKey}`,
          "Content-Type": "application/json",
        },
        keepalive: true,
        method: "POST",
        signal: controller.signal,
      });
      const data = (await response.json().catch(() => null)) as AnalyticsFunctionResponse | null;
      const accepted = response.ok && data?.accepted === true;

      return {
        accepted,
        retryable:
          !accepted &&
          (response.status === 408 ||
            response.status === 425 ||
            response.status === 429 ||
            response.status >= 500),
        value: data,
      };
    } finally {
      window.clearTimeout(timeoutId);
    }
  });
}

async function sendAnonymous(
  eventName: AnalyticsEventName | "signup_started" | "visit",
  options: TrackEventOptions,
) {
  if (
    eventName !== "visit" &&
    eventName !== "signup_started" &&
    !ANONYMOUS_ANALYTICS_EVENTS.has(eventName)
  ) {
    return false;
  }
  const delivery = await invokeCollector({
    context: getAnalyticsDeviceContext(),
    eventName,
    mode: "anonymous",
    path: normalizePath(options.path),
  });
  return delivery?.outcome === "accepted";
}

async function sendConsented(eventName: AnalyticsEventName | "heartbeat", options: TrackEventOptions) {
  const userId = analyticsIdentity.userId;
  if (!userId || !analyticsIdentity.consented) return;

  const sessionKey = getSessionKey(userId);
  const delivery = await invokeCollector({
    activeSeconds: options.activeSeconds,
    context: getAnalyticsDeviceContext(),
    entityId: options.entityId ?? null,
    entityType: options.entityType ?? null,
    eventName,
    mode: "consented",
    path: normalizePath(options.path),
    policyVersion: ANALYTICS_POLICY_VERSION,
    sessionId: safeSessionStorageGet(sessionKey),
  });
  const response = delivery?.outcome === "accepted" ? delivery.value : null;

  if (response?.sessionId) safeSessionStorageSet(sessionKey, response.sessionId);
}

function enqueueConsented(task: () => Promise<void>) {
  consentedEventQueue = consentedEventQueue.then(task, task);
  return consentedEventQueue;
}

function ensurePublicVisit(path: string) {
  if (safeSessionStorageGet(PUBLIC_VISIT_MARKER)) return Promise.resolve(true);
  if (publicVisitInFlight) return publicVisitInFlight;

  publicVisitInFlight = sendAnonymous("visit", { path })
    .then((accepted) => {
      if (accepted) safeSessionStorageSet(PUBLIC_VISIT_MARKER, "counted");
      return accepted;
    })
    .finally(() => {
      publicVisitInFlight = null;
    });
  return publicVisitInFlight;
}

async function trackAnonymousRoute(normalizedPath: string) {
  await ensurePublicVisit(normalizedPath);
  await sendAnonymous("page_view", { path: normalizedPath });

  const productMatch = /^\/producto\/([0-9a-f-]{36})$/i.exec(normalizedPath);
  if (productMatch) await sendAnonymous("product_view", { path: normalizedPath });

  const artisanMatch = /^\/vendedor\/([0-9a-f-]{36})$/i.exec(normalizedPath);
  if (artisanMatch) await sendAnonymous("artisan_view", { path: normalizedPath });

  if (/^\/registro(?:\/|$)/.test(normalizedPath)) {
    await sendAnonymous("signup_started", { path: normalizedPath });
  }
}

async function trackConsentedRoute(normalizedPath: string) {
  await sendConsented("page_view", { path: normalizedPath });

  const productMatch = /^\/producto\/([0-9a-f-]{36})$/i.exec(normalizedPath);
  if (productMatch) {
    await sendConsented("product_view", {
      entityId: productMatch[1],
      entityType: "product",
      path: normalizedPath,
    });
  }

  const artisanMatch = /^\/vendedor\/([0-9a-f-]{36})$/i.exec(normalizedPath);
  if (artisanMatch) {
    await sendConsented("artisan_view", {
      entityId: artisanMatch[1],
      entityType: "artisan",
      path: normalizedPath,
    });
  }
}

export function configureAnalyticsIdentity(identity: AnalyticsIdentity) {
  analyticsIdentity = identity;
}

export function isAnalyticsTrackingAllowed() {
  return Boolean(analyticsIdentity.userId && analyticsIdentity.consented);
}

export function trackAnalyticsEvent(eventName: AnalyticsEventName, options: TrackEventOptions = {}) {
  if (analyticsIdentity.userId && analyticsIdentity.consented) {
    return enqueueConsented(() => sendConsented(eventName, options));
  }
  return sendAnonymous(eventName, options);
}

export function trackAnalyticsHeartbeat(activeSeconds: number) {
  if (!analyticsIdentity.userId || !analyticsIdentity.consented) return Promise.resolve();
  return enqueueConsented(() =>
    sendConsented("heartbeat", {
      activeSeconds,
      path: window.location.pathname,
    }),
  );
}

export function trackAnalyticsRoute(path: string) {
  const normalizedPath = normalizePath(path);
  if (analyticsIdentity.userId && analyticsIdentity.consented) {
    return enqueueConsented(() => trackConsentedRoute(normalizedPath));
  }
  return trackAnonymousRoute(normalizedPath);
}

export function resetAnalyticsSessionForUser(userId: string) {
  try {
    sessionStorage.removeItem(getSessionKey(userId));
  } catch {
    // No-op when storage is unavailable.
  }
}

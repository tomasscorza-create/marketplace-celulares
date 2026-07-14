import type { AnalyticsEventName } from "../../types/analytics";

import { supabase } from "../../lib/supabase/client";
import {
  ANALYTICS_POLICY_VERSION,
  ANONYMOUS_ANALYTICS_EVENTS,
} from "./analyticsContract";
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
let eventQueue = Promise.resolve();

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
  if (!supabase) return null;
  const { data, error } = await supabase.functions.invoke<AnalyticsFunctionResponse>(
    "collect-analytics",
    { body },
  );
  return error ? null : data;
}

async function sendAnonymous(eventName: AnalyticsEventName | "visit", options: TrackEventOptions) {
  if (eventName !== "visit" && !ANONYMOUS_ANALYTICS_EVENTS.has(eventName)) return;
  await invokeCollector({
    context: getAnalyticsDeviceContext(),
    eventName,
    mode: "anonymous",
    path: normalizePath(options.path),
  });
}

async function sendConsented(eventName: AnalyticsEventName | "heartbeat", options: TrackEventOptions) {
  const userId = analyticsIdentity.userId;
  if (!userId || !analyticsIdentity.consented) return;

  const sessionKey = getSessionKey(userId);
  const response = await invokeCollector({
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

  if (response?.sessionId) safeSessionStorageSet(sessionKey, response.sessionId);
}

function enqueue(task: () => Promise<void>) {
  eventQueue = eventQueue.then(task, task);
  return eventQueue;
}

export function configureAnalyticsIdentity(identity: AnalyticsIdentity) {
  analyticsIdentity = identity;
}

export function isAnalyticsTrackingAllowed() {
  return Boolean(analyticsIdentity.userId && analyticsIdentity.consented);
}

export function trackAnalyticsEvent(eventName: AnalyticsEventName, options: TrackEventOptions = {}) {
  return enqueue(async () => {
    if (analyticsIdentity.userId && analyticsIdentity.consented) {
      await sendConsented(eventName, options);
      return;
    }
    await sendAnonymous(eventName, options);
  });
}

export function trackAnalyticsHeartbeat(activeSeconds: number) {
  if (!analyticsIdentity.userId || !analyticsIdentity.consented) return Promise.resolve();
  return enqueue(() =>
    sendConsented("heartbeat", {
      activeSeconds,
      path: window.location.pathname,
    }),
  );
}

export function trackAnalyticsRoute(path: string) {
  return enqueue(async () => {
    const normalizedPath = normalizePath(path);

    if (!analyticsIdentity.userId || !analyticsIdentity.consented) {
      if (!safeSessionStorageGet(PUBLIC_VISIT_MARKER)) {
        safeSessionStorageSet(PUBLIC_VISIT_MARKER, "counted");
        await sendAnonymous("visit", { path: normalizedPath });
      }
      await sendAnonymous("page_view", { path: normalizedPath });
    } else {
      await sendConsented("page_view", { path: normalizedPath });
    }

    const productMatch = /^\/producto\/([0-9a-f-]{36})$/i.exec(normalizedPath);
    if (productMatch) {
      if (analyticsIdentity.userId && analyticsIdentity.consented) {
        await sendConsented("product_view", {
          entityId: productMatch[1],
          entityType: "product",
          path: normalizedPath,
        });
      } else {
        await sendAnonymous("product_view", { path: normalizedPath });
      }
    }

    const artisanMatch = /^\/vendedor\/([0-9a-f-]{36})$/i.exec(normalizedPath);
    if (artisanMatch) {
      if (analyticsIdentity.userId && analyticsIdentity.consented) {
        await sendConsented("artisan_view", {
          entityId: artisanMatch[1],
          entityType: "artisan",
          path: normalizedPath,
        });
      } else {
        await sendAnonymous("artisan_view", { path: normalizedPath });
      }
    }

    if (/^\/registro(?:\/|$)/.test(normalizedPath) && !analyticsIdentity.consented) {
      await invokeCollector({
        context: getAnalyticsDeviceContext(),
        eventName: "signup_started",
        mode: "anonymous",
        path: normalizedPath,
      });
    }
  });
}

export function resetAnalyticsSessionForUser(userId: string) {
  try {
    sessionStorage.removeItem(getSessionKey(userId));
  } catch {
    // No-op when storage is unavailable.
  }
}

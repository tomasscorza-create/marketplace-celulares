import type { PropsWithChildren } from "react";

import { createContext, useCallback, useEffect, useMemo, useState } from "react";

import { router } from "../../app/router";
import { useAuth } from "../auth/useAuth";
import type { AnalyticsConsent } from "../../types/analytics";
import {
  configureAnalyticsIdentity,
  endAnalyticsSession,
  resetAnalyticsSessionForUser,
  trackAnalyticsEvent,
  trackAnalyticsHeartbeat,
  trackAnalyticsRoute,
} from "./analyticsClient";
import { createAnalyticsActivityClock } from "./analyticsActivityClock";
import { ANALYTICS_POLICY_VERSION } from "./analyticsContract";
import { getAnalyticsConsent, saveAnalyticsConsent } from "./analyticsData";
import { clearCatalogActivityState } from "../../lib/browser/catalogActivity";

type AnalyticsContextValue = {
  consent: AnalyticsConsent | null;
  errorMessage: string | null;
  hasActiveConsent: boolean;
  isLoading: boolean;
  setConsent: (accepted: boolean) => Promise<boolean>;
};

const AnalyticsContext = createContext<AnalyticsContextValue>({
  consent: null,
  errorMessage: null,
  hasActiveConsent: false,
  isLoading: true,
  setConsent: async () => false,
});

const PROMPT_DISMISSED_KEY = "analytics_consent_prompt_dismissed_v1";

function wasPromptDismissed() {
  try {
    return sessionStorage.getItem(PROMPT_DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

export function AnalyticsProvider({ children }: PropsWithChildren) {
  const { isConfigured, isLoading: isAuthLoading, role, user } = useAuth();
  const [consent, setConsentState] = useState<AnalyticsConsent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPromptDismissed, setIsPromptDismissed] = useState(wasPromptDismissed);
  const hasActiveConsent = Boolean(
    consent &&
      !consent.revoked_at &&
      consent.policy_version === ANALYTICS_POLICY_VERSION &&
      (role === "buyer" || role === "artisan"),
  );

  useEffect(() => {
    let isMounted = true;

    if (isAuthLoading) return () => undefined;
    if (!isConfigured || !user || role === "admin") {
      setConsentState(null);
      setErrorMessage(null);
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    setIsLoading(true);
    void getAnalyticsConsent(user.id).then(({ data, error }) => {
      if (!isMounted) return;
      setConsentState(data ?? null);
      setErrorMessage(error ? "No pudimos comprobar tu preferencia de privacidad." : null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, isConfigured, role, user]);

  useEffect(() => {
    if (isAuthLoading || isLoading) return;

    configureAnalyticsIdentity({
      consented: hasActiveConsent,
      userId: role === "buyer" || role === "artisan" ? user?.id ?? null : null,
    });
    if (!hasActiveConsent) clearCatalogActivityState();

    let lastTrackedPath: string | null = null;
    const trackCurrentRoute = () => {
      const nextPath = router.state.location.pathname;
      if (nextPath === lastTrackedPath) return;
      lastTrackedPath = nextPath;
      void trackAnalyticsRoute(nextPath);
    };
    trackCurrentRoute();
    return router.subscribe(trackCurrentRoute);
  }, [hasActiveConsent, isAuthLoading, isLoading, role, user?.id]);

  useEffect(() => {
    if (!hasActiveConsent || !user) return;

    const clock = createAnalyticsActivityClock();
    const now = () => performance.now();
    if (document.visibilityState === "visible") clock.resume(now());

    const flushPendingTime = () => {
      const activeSeconds = clock.takePendingSeconds(now());
      if (activeSeconds > 0) void trackAnalyticsHeartbeat(activeSeconds);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        clock.resume(now());
        return;
      }

      clock.pause(now());
      flushPendingTime();
    };
    const handlePageHide = () => {
      clock.pause(now());
      const activeSeconds = clock.takePendingSeconds(now());
      void endAnalyticsSession(activeSeconds);
    };
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") flushPendingTime();
    }, 10_000);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [hasActiveConsent, user]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("a") : null;
      const href = target?.getAttribute("href")?.trim().toLowerCase() ?? "";
      if (href.startsWith("tel:") || href.startsWith("mailto:") || href.includes("wa.me")) {
        void trackAnalyticsEvent("contact_click", { path: window.location.pathname });
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const setConsent = useCallback(
    async (accepted: boolean) => {
      if (!user || (role !== "buyer" && role !== "artisan")) return false;
      setErrorMessage(null);
      const { data, error } = await saveAnalyticsConsent(accepted);
      if (error) {
        setErrorMessage("No pudimos guardar tu preferencia. Intentá nuevamente.");
        return false;
      }

      const nextConsent = data as unknown as AnalyticsConsent;
      setConsentState(nextConsent);
      if (!accepted) resetAnalyticsSessionForUser(user.id);
      return true;
    },
    [role, user],
  );

  const contextValue = useMemo<AnalyticsContextValue>(
    () => ({ consent, errorMessage, hasActiveConsent, isLoading, setConsent }),
    [consent, errorMessage, hasActiveConsent, isLoading, setConsent],
  );
  const shouldShowPrompt =
    !isLoading &&
    Boolean(user) &&
    (role === "buyer" || role === "artisan") &&
    consent === null &&
    !isPromptDismissed;

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
      {shouldShowPrompt ? (
        <aside className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-2xl rounded-2xl border border-ocean-200 bg-white p-4 shadow-2xl sm:p-5">
          <p className="font-semibold text-ocean-600">Métricas internas opcionales</p>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            Podés permitir que relacionemos tus visitas con tu cuenta para mejorar el catálogo.
            No usamos fingerprinting ni guardamos tu IP o ubicación exacta.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
              onClick={() => {
                void setConsent(true);
              }}
              type="button"
            >
              Permitir métricas
            </button>
            <button
              className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50"
              onClick={() => {
                try {
                  sessionStorage.setItem(PROMPT_DISMISSED_KEY, "true");
                } catch {
                  // Dismissal persistence is optional.
                }
                setIsPromptDismissed(true);
              }}
              type="button"
            >
              Ahora no
            </button>
            <a className="px-3 py-2 text-sm font-semibold text-ocean-600 hover:underline" href="/privacidad">
              Ver privacidad
            </a>
          </div>
          {errorMessage ? <p className="mt-2 text-sm text-red-600">{errorMessage}</p> : null}
        </aside>
      ) : null}
    </AnalyticsContext.Provider>
  );
}

export { AnalyticsContext };

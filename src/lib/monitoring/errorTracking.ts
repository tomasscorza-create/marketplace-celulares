import * as Sentry from "@sentry/react";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN?.trim();
const errorTrackingEnabled = import.meta.env.PROD && Boolean(sentryDsn);

export function initializeErrorTracking() {
  if (!errorTrackingEnabled || !sentryDsn) {
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!errorTrackingEnabled) {
    return;
  }

  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext("app", context);
    }
    Sentry.captureException(error);
  });
}

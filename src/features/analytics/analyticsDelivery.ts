type AnalyticsDeliveryAttempt<T> = {
  accepted: boolean;
  retryable: boolean;
  value: T | null;
};

type AnalyticsDeliveryOutcome = "accepted" | "failed" | "rejected";

type AnalyticsDeliveryResult<T> = {
  attempts: number;
  eventId: string;
  outcome: AnalyticsDeliveryOutcome;
  value: T | null;
};

type AnalyticsDeliveryOptions = {
  eventId?: string;
  retryDelaysMs?: readonly number[];
  wait?: (milliseconds: number) => Promise<void>;
};

const DEFAULT_RETRY_DELAYS_MS = [400, 1_200] as const;

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
}

export function createAnalyticsEventId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function deliverAnalyticsEvent<T>(
  send: (eventId: string) => Promise<AnalyticsDeliveryAttempt<T>>,
  options: AnalyticsDeliveryOptions = {},
): Promise<AnalyticsDeliveryResult<T>> {
  const eventId = options.eventId ?? createAnalyticsEventId();
  const retryDelaysMs = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
  const waitForRetry = options.wait ?? wait;
  let attempts = 0;
  let lastValue: T | null = null;

  for (let attemptIndex = 0; attemptIndex <= retryDelaysMs.length; attemptIndex += 1) {
    attempts += 1;

    try {
      const result = await send(eventId);
      lastValue = result.value;
      if (result.accepted) {
        return { attempts, eventId, outcome: "accepted", value: result.value };
      }
      if (!result.retryable) {
        return { attempts, eventId, outcome: "rejected", value: result.value };
      }
    } catch {
      // A transport failure is retryable and must never reach the product flow.
    }

    const retryDelay = retryDelaysMs[attemptIndex];
    if (retryDelay !== undefined) await waitForRetry(retryDelay);
  }

  return { attempts, eventId, outcome: "failed", value: lastValue };
}

export type {
  AnalyticsDeliveryAttempt,
  AnalyticsDeliveryOptions,
  AnalyticsDeliveryOutcome,
  AnalyticsDeliveryResult,
};

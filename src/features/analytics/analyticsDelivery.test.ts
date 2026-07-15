import { describe, expect, it, vi } from "vitest";

import { createAnalyticsEventId, deliverAnalyticsEvent } from "./analyticsDelivery";

describe("deliverAnalyticsEvent", () => {
  it("genera un UUID independiente para cada entrega", () => {
    expect(createAnalyticsEventId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("reintenta con el mismo event ID hasta recibir confirmación", async () => {
    const sentEventIds: string[] = [];
    const send = vi.fn(async (eventId: string) => {
      sentEventIds.push(eventId);
      return sentEventIds.length < 3
        ? { accepted: false, retryable: true, value: null }
        : { accepted: true, retryable: false, value: { sessionId: "session-1" } };
    });
    const wait = vi.fn(async () => undefined);

    const result = await deliverAnalyticsEvent(send, {
      eventId: "event-1",
      retryDelaysMs: [100, 200],
      wait,
    });

    expect(result).toEqual({
      attempts: 3,
      eventId: "event-1",
      outcome: "accepted",
      value: { sessionId: "session-1" },
    });
    expect(sentEventIds).toEqual(["event-1", "event-1", "event-1"]);
    expect(wait).toHaveBeenNthCalledWith(1, 100);
    expect(wait).toHaveBeenNthCalledWith(2, 200);
  });

  it("no reintenta rechazos definitivos", async () => {
    const send = vi.fn(async () => ({ accepted: false, retryable: false, value: null }));

    const result = await deliverAnalyticsEvent(send, {
      eventId: "event-2",
      retryDelaysMs: [100, 200],
      wait: async () => undefined,
    });

    expect(result.outcome).toBe("rejected");
    expect(result.attempts).toBe(1);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("agota una cantidad limitada de reintentos ante fallos de transporte", async () => {
    const send = vi.fn(async () => {
      throw new TypeError("network unavailable");
    });
    const wait = vi.fn(async () => undefined);

    const result = await deliverAnalyticsEvent(send, {
      eventId: "event-3",
      retryDelaysMs: [100, 200],
      wait,
    });

    expect(result.outcome).toBe("failed");
    expect(result.attempts).toBe(3);
    expect(send).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenCalledTimes(2);
  });

  it("confirma en el primer intento sin esperas innecesarias", async () => {
    const wait = vi.fn(async () => undefined);
    const result = await deliverAnalyticsEvent(
      async () => ({ accepted: true, retryable: false, value: "ok" }),
      { eventId: "event-4", retryDelaysMs: [100, 200], wait },
    );

    expect(result).toMatchObject({ attempts: 1, outcome: "accepted", value: "ok" });
    expect(wait).not.toHaveBeenCalled();
  });
});

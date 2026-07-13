import { describe, expect, it } from "vitest";

import {
  getCheckoutExpirationCutoff,
  getCheckoutExpirationDate,
  isCheckoutExpired,
} from "../../supabase/functions/_shared/checkout-expiration";

describe("checkout expiration", () => {
  const now = new Date("2026-07-13T18:00:00.000Z");

  it("calcula una ventana exacta de 24 horas", () => {
    expect(getCheckoutExpirationDate(now).toISOString()).toBe("2026-07-14T18:00:00.000Z");
    expect(getCheckoutExpirationCutoff(now).toISOString()).toBe("2026-07-12T18:00:00.000Z");
  });

  it("vence en el límite y después del límite", () => {
    expect(isCheckoutExpired("2026-07-12T18:00:00.000Z", now)).toBe(true);
    expect(isCheckoutExpired("2026-07-12T17:59:59.999Z", now)).toBe(true);
    expect(isCheckoutExpired("2026-07-12T18:00:00.001Z", now)).toBe(false);
  });

  it("no considera vencido un checkout sin fecha", () => {
    expect(isCheckoutExpired(null, now)).toBe(false);
    expect(isCheckoutExpired(undefined, now)).toBe(false);
  });
});

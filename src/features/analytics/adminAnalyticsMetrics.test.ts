import { describe, expect, it } from "vitest";

import {
  calculateSignupConversionRate,
  formatSignupConversionRate,
} from "./adminAnalyticsMetrics";

describe("admin analytics account metrics", () => {
  it("calcula una conversión aproximada con un decimal", () => {
    expect(calculateSignupConversionRate(12, 5)).toBe(41.7);
  });

  it("no inventa conversión cuando no hubo inicios de registro", () => {
    expect(calculateSignupConversionRate(0, 4)).toBeNull();
    expect(formatSignupConversionRate(null)).toBe("Sin base");
  });

  it("mantiene visible una conversión superior al cien por ciento para detectar discrepancias", () => {
    const rate = calculateSignupConversionRate(2, 3);
    expect(rate).toBe(150);
    expect(formatSignupConversionRate(rate)).toBe("150%");
  });
});

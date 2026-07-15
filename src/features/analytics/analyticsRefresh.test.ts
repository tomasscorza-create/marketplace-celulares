import { describe, expect, it } from "vitest";

import {
  ADMIN_ANALYTICS_REFRESH_MS,
  getAdminAnalyticsRefetchInterval,
} from "./analyticsRefresh";

describe("admin analytics refresh policy", () => {
  it("actualiza cada treinta segundos cuando el panel está visible", () => {
    expect(getAdminAnalyticsRefetchInterval("visible")).toBe(ADMIN_ANALYTICS_REFRESH_MS);
  });

  it("suspende consultas periódicas cuando la pestaña está oculta", () => {
    expect(getAdminAnalyticsRefetchInterval("hidden")).toBe(false);
  });
});

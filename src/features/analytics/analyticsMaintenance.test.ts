import { describe, expect, it } from "vitest";

import type { AnalyticsMaintenanceSummary } from "../../types/analytics";
import { getAnalyticsMaintenanceMessage } from "./analyticsMaintenance";

function createSummary(
  overrides: Partial<AnalyticsMaintenanceSummary> = {},
): AnalyticsMaintenanceSummary {
  return {
    durationMs: 25,
    isOverdue: false,
    lastRunAt: "2026-07-14T03:17:00Z",
    lastStatus: "success",
    lastSuccessAt: "2026-07-14T03:17:00Z",
    schedule: "03:17 UTC daily",
    ...overrides,
  };
}

describe("getAnalyticsMaintenanceMessage", () => {
  it("confirma una limpieza reciente", () => {
    expect(getAnalyticsMaintenanceMessage(createSummary())).toBe(
      "La retención automática está al día.",
    );
  });

  it("alerta cuando nunca hubo una limpieza confirmada", () => {
    expect(
      getAnalyticsMaintenanceMessage(createSummary({ isOverdue: true, lastSuccessAt: null })),
    ).toBe("Todavía no hay una limpieza automática confirmada.");
  });

  it("alerta cuando la última limpieza exitosa está vencida", () => {
    expect(getAnalyticsMaintenanceMessage(createSummary({ isOverdue: true }))).toContain(
      "más de 36 horas",
    );
  });

  it("distingue un fallo reciente sin marcar la retención como vencida", () => {
    expect(getAnalyticsMaintenanceMessage(createSummary({ lastStatus: "failed" }))).toContain(
      "última ejecución falló",
    );
  });
});

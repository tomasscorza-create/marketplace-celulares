import type { AnalyticsMaintenanceSummary } from "../../types/analytics";

export function getAnalyticsMaintenanceMessage(maintenance: AnalyticsMaintenanceSummary) {
  if (maintenance.isOverdue) {
    return maintenance.lastSuccessAt
      ? "La limpieza automática lleva más de 36 horas sin completarse."
      : "Todavía no hay una limpieza automática confirmada.";
  }
  if (maintenance.lastStatus === "failed") {
    return "La última ejecución falló, pero existe una limpieza exitosa reciente.";
  }
  return "La retención automática está al día.";
}

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260715220000_analytics_retention_schedule.sql",
  ),
  "utf8",
);

describe("analytics retention migration", () => {
  it("limita los borrados a tablas propias de analitica", () => {
    const deletedTables = Array.from(
      migration.matchAll(/delete\s+from\s+public\.([a-z_]+)/gi),
      (match) => match[1],
    );

    expect(new Set(deletedTables)).toEqual(new Set([
      "analytics_anonymous_daily",
      "analytics_anonymous_quality_hourly",
      "analytics_delivery_receipts",
      "analytics_events",
      "analytics_maintenance_runs",
      "analytics_rate_limits",
      "analytics_sessions",
    ]));
    expect(migration).not.toMatch(/delete\s+from\s+public\.(?:profiles|products|orders|order_items|payment_attempts)/i);
  });

  it("conserva las ventanas de 365 y 730 dias", () => {
    expect(migration).toContain("interval '365 days'");
    expect(migration).toContain("current_date - 730");
    expect(migration).toContain("interval '730 days'");
  });

  it("programa un unico mantenimiento diario y una alerta a las 36 horas", () => {
    expect(migration).toContain("'17 3 * * *'");
    expect(migration).toContain("jobname = 'analytics-daily-cleanup'");
    expect(migration).toContain("interval '36 hours'");
  });
});

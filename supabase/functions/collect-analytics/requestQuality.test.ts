import { describe, expect, it } from "vitest";

import {
  createTemporaryIpHash,
  isAllowedAnalyticsEventPath,
  isAllowedAnalyticsOrigin,
  isAllowedAnalyticsPath,
  isKnownAnalyticsBot,
} from "./requestQuality";

const PRODUCT_ID = "5a4fe46e-80c7-4e2b-9cf7-e39bb76bbab1";

describe("analytics request quality", () => {
  it("acepta solamente origenes completos autorizados", () => {
    expect(isAllowedAnalyticsOrigin("https://nyzca.com")).toBe(true);
    expect(isAllowedAnalyticsOrigin("https://nyzca.com.evil.test")).toBe(false);
    expect(isAllowedAnalyticsOrigin(null)).toBe(false);
    expect(isAllowedAnalyticsOrigin("http://localhost:5173", "http://localhost:5173")).toBe(true);
  });

  it("acepta rutas reales y rechaza rutas inventadas o IDs invalidos", () => {
    expect(isAllowedAnalyticsPath("/catalogo/para-vos")).toBe(true);
    expect(isAllowedAnalyticsPath(`/producto/${PRODUCT_ID}`)).toBe(true);
    expect(isAllowedAnalyticsPath("/producto/no-es-un-uuid")).toBe(false);
    expect(isAllowedAnalyticsPath("/__analytics_fake__")).toBe(false);
    expect(isAllowedAnalyticsPath("/panel/admin/analitica")).toBe(false);
  });

  it("exige que vistas de entidades coincidan con su ruta semantica", () => {
    expect(isAllowedAnalyticsEventPath("product_view", `/producto/${PRODUCT_ID}`)).toBe(true);
    expect(isAllowedAnalyticsEventPath("product_view", "/catalogo")).toBe(false);
    expect(isAllowedAnalyticsEventPath("signup_started", "/registro/comprador")).toBe(true);
  });

  it("ignora agentes automatizados conocidos", () => {
    expect(isKnownAnalyticsBot("Mozilla/5.0 Chrome/126 Safari/537.36")).toBe(false);
    expect(isKnownAnalyticsBot("Googlebot/2.1 (+http://www.google.com/bot.html)")).toBe(true);
    expect(isKnownAnalyticsBot("facebookexternalhit/1.1")).toBe(true);
  });

  it("genera un HMAC diario estable que cambia con el dia y nunca contiene la IP", async () => {
    const first = await createTemporaryIpHash("203.0.113.10", "test-secret", new Date("2026-07-14T10:00:00Z"));
    const repeated = await createTemporaryIpHash("203.0.113.10", "test-secret", new Date("2026-07-14T23:59:00Z"));
    const nextDay = await createTemporaryIpHash("203.0.113.10", "test-secret", new Date("2026-07-15T00:00:00Z"));

    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(repeated).toBe(first);
    expect(nextDay).not.toBe(first);
    expect(first).not.toContain("203.0.113.10");
  });
});

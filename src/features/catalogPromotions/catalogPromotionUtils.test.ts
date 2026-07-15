import { describe, expect, it } from "vitest";

import type { CatalogPromotionInput } from "@/types/catalogPromotions";
import {
  CATALOG_PROMOTION_AUTO_ADVANCE_MS,
  CATALOG_PROMOTION_CONTROLS_IDLE_MS,
} from "@/features/public/components/CatalogPromotionBanner";

import {
  getCatalogPromotionActionLabel,
  isSafeExternalPromotionUrl,
  isCatalogPromotionVisible,
  sortCatalogPromotions,
  validateCatalogPromotionInput,
} from "./catalogPromotionUtils";

const baseInput: CatalogPromotionInput = {
  action_label: null,
  action_type: "none",
  action_url: null,
  benefit_type: null,
  benefit_value: null,
  body: "Una novedad del catálogo.",
  created_by: null,
  ends_at: null,
  image_path: null,
  image_url: null,
  is_active: true,
  kind: "message",
  max_claims: null,
  minimum_order_amount: null,
  product_id: null,
  sort_order: 0,
  starts_at: null,
  title: "Novedad",
};

describe("catalog promotion rules", () => {
  it("rota automáticamente cada ocho segundos", () => {
    expect(CATALOG_PROMOTION_AUTO_ADVANCE_MS).toBe(8000);
  });

  it("devuelve los controles al reposo tras tres segundos", () => {
    expect(CATALOG_PROMOTION_CONTROLS_IDLE_MS).toBe(3000);
  });

  it("muestra sólo promociones activas dentro de su ventana", () => {
    const now = new Date("2026-07-15T12:00:00.000Z");

    expect(isCatalogPromotionVisible({ is_active: true, starts_at: null, ends_at: null }, now)).toBe(true);
    expect(isCatalogPromotionVisible({ is_active: false, starts_at: null, ends_at: null }, now)).toBe(false);
    expect(isCatalogPromotionVisible({ is_active: true, starts_at: "2026-07-15T13:00:00.000Z", ends_at: null }, now)).toBe(false);
    expect(isCatalogPromotionVisible({ is_active: true, starts_at: null, ends_at: "2026-07-15T11:59:59.000Z" }, now)).toBe(false);
  });

  it("ordena por prioridad y usa la creación más reciente para desempatar", () => {
    const result = sortCatalogPromotions([
      { sort_order: 2, created_at: "2026-07-15T10:00:00.000Z" },
      { sort_order: 1, created_at: "2026-07-15T09:00:00.000Z" },
      { sort_order: 1, created_at: "2026-07-15T11:00:00.000Z" },
    ]);

    expect(result.map((item) => item.created_at)).toEqual([
      "2026-07-15T11:00:00.000Z",
      "2026-07-15T09:00:00.000Z",
      "2026-07-15T10:00:00.000Z",
    ]);
  });

  it("exige reglas económicas para beneficios reclamables", () => {
    expect(validateCatalogPromotionInput({ ...baseInput, action_type: "claim" })).toContain(
      "Sólo un descuento o cupón puede guardarse en una cuenta.",
    );

    expect(
      validateCatalogPromotionInput({
        ...baseInput,
        action_type: "claim",
        benefit_type: "percentage",
        benefit_value: 15,
        kind: "discount",
      }),
    ).toEqual([]);
  });

  it("resuelve etiquetas predeterminadas sin reemplazar las personalizadas", () => {
    expect(getCatalogPromotionActionLabel({ action_label: null, action_type: "claim" })).toBe("Guardar beneficio");
    expect(getCatalogPromotionActionLabel({ action_label: "Conocer oferta", action_type: "product" })).toBe("Conocer oferta");
    expect(getCatalogPromotionActionLabel({ action_label: null, action_type: "none" })).toBeNull();
  });

  it("rechaza protocolos inseguros en enlaces externos", () => {
    expect(isSafeExternalPromotionUrl("https://example.com/oferta")).toBe(true);
    expect(isSafeExternalPromotionUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeExternalPromotionUrl("/catalogo")).toBe(false);
  });
});

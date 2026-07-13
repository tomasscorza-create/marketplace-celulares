import { describe, expect, it } from "vitest";

import {
  calculateOptionPriceModifiers,
  createProductConfigurationKey,
  createSelectedOptionsSummary,
} from "./productAvailability";

const choices = [
  {
    choiceId: "blue",
    choiceLabel: " Azul ",
    optionId: "color",
    optionLabel: " Color ",
    priceModifier: 500,
  },
  {
    choiceId: "large",
    choiceLabel: " Grande ",
    optionId: "size",
    optionLabel: " Tamaño ",
    priceModifier: 1000,
  },
];

describe("productAvailability", () => {
  it("genera una clave estable aunque cambie el orden de selección", () => {
    expect(createProductConfigurationKey(choices)).toBe(
      createProductConfigurationKey([...choices].reverse()),
    );
  });

  it("normaliza el resumen visible y suma modificadores", () => {
    expect(createSelectedOptionsSummary(choices)).toBe("Color: Azul · Tamaño: Grande");
    expect(calculateOptionPriceModifiers(choices)).toBe(1500);
  });

  it("usa la configuración por defecto cuando no hay opciones", () => {
    expect(createProductConfigurationKey([])).toBe("default");
    expect(createSelectedOptionsSummary([])).toBeNull();
  });
});

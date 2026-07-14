import { describe, expect, it } from "vitest";

import { sanitizeCategorySpecValues } from "./categorySpecs";

describe("sanitizeCategorySpecValues", () => {
  it("recorta espacios y descarta pares con etiqueta o valor vacío", () => {
    const result = sanitizeCategorySpecValues([
      { label: " RAM ", value: " 8GB " },
      { label: "Memoria", value: "" },
      { label: "", value: "128GB" },
    ]);

    expect(result).toEqual([{ label: "RAM", value: "8GB" }]);
  });

  it("limita la cantidad de pares a 20", () => {
    const values = Array.from({ length: 25 }, (_unused, index) => ({
      label: `campo-${index}`,
      value: `valor-${index}`,
    }));

    expect(sanitizeCategorySpecValues(values)).toHaveLength(20);
  });
});

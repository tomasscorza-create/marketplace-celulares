import { describe, expect, it } from "vitest";

import { validateMadeToOrderSelection } from "../../supabase/functions/_shared/product-config";

const groups = [
  {
    choices: [
      { id: "black", label: "Negro", priceModifier: 0 },
      { id: "violet", label: "Violeta", priceModifier: 700 },
    ],
    id: "color",
    label: "Color",
    required: true,
  },
];

describe("edge product configuration", () => {
  it("resuelve etiquetas y precios desde la configuración del servidor", () => {
    const result = validateMadeToOrderSelection(groups, [
      {
        choiceId: "violet",
        choiceLabel: "Etiqueta manipulada",
        optionId: "color",
        optionLabel: "Grupo manipulado",
        priceModifier: -5000,
      },
    ]);

    expect(result).toEqual({
      resolvedSelections: [
        {
          choiceId: "violet",
          choiceLabel: "Violeta",
          optionId: "color",
          optionLabel: "Color",
          priceModifier: 700,
        },
      ],
      selectedOptionsSummary: "Color: Violeta",
      unitPriceModifier: 700,
    });
  });

  it("rechaza una opción obligatoria ausente", () => {
    expect(() => validateMadeToOrderSelection(groups, [])).toThrow(
      'Falta elegir una opción para "Color".',
    );
  });

  it("rechaza opciones eliminadas o grupos ajenos al producto", () => {
    expect(() =>
      validateMadeToOrderSelection(groups, [
        {
          choiceId: "missing",
          choiceLabel: "Inexistente",
          optionId: "color",
          optionLabel: "Color",
          priceModifier: 0,
        },
      ]),
    ).toThrow("ya no está disponible");

    expect(() =>
      validateMadeToOrderSelection(groups, [
        {
          choiceId: "black",
          choiceLabel: "Negro",
          optionId: "color",
          optionLabel: "Color",
          priceModifier: 0,
        },
        {
          choiceId: "x",
          choiceLabel: "X",
          optionId: "foreign",
          optionLabel: "Ajeno",
          priceModifier: 0,
        },
      ]),
    ).toThrow("no coincide con las opciones actuales");
  });
});

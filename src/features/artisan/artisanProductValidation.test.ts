import type { ArtisanProductInput } from "../../types/artisan";
import type { ProductImageDraft } from "./imageEditorTypes";

import { describe, expect, it } from "vitest";

import { validateArtisanProductDraft } from "./artisanProductValidation";

const validImage: ProductImageDraft = {
  crop: { aspect: "square", offsetX: 0, offsetY: 0, zoom: 1 },
  description: "",
  dimensions: { height: 800, width: 800 },
  file: null,
  id: "image-1",
  isEdited: false,
  mediaUrl: "https://example.com/image.webp",
  originalUrl: null,
  previewUrl: "https://example.com/image.webp",
  sourceUrl: "https://example.com/image.webp",
  thumbnailUrl: null,
};

function createProduct(overrides: Partial<ArtisanProductInput> = {}): ArtisanProductInput {
  return {
    availability_mode: "stock",
    category_id: "category-1",
    description: "Funda reforzada",
    image_urls: [],
    is_active: true,
    lead_time_days: null,
    made_to_order_options: [],
    price: 15000,
    product_attributes: [{ key: " color ", value: " negro " }],
    product_media: [],
    stock_quantity: 5,
    title: "Funda premium",
    ...overrides,
  };
}

describe("validateArtisanProductDraft", () => {
  it("acepta un producto con stock y sanea sus atributos", () => {
    const result = validateArtisanProductDraft({
      productForm: createProduct(),
      productImages: [validImage],
    });

    expect(result).toEqual({
      errorMessage: null,
      sanitizedAttributes: [{ key: "color", value: "negro" }],
    });
  });

  it.each([
    [{ category_id: "" }, "Necesitás al menos una categoría activa"],
    [{ title: "abc" }, "El título debe tener al menos 4 caracteres"],
    [{ price: 0 }, "Ingresá un precio mayor a 0"],
    [{ stock_quantity: 0 }, "Ingresá un stock válido mayor a 0"],
  ] satisfies Array<[Partial<ArtisanProductInput>, string]>) (
    "rechaza datos obligatorios inválidos: %s",
    (overrides, expectedMessage) => {
      const result = validateArtisanProductDraft({
        productForm: createProduct(overrides),
        productImages: [validImage],
      });

      expect(result.errorMessage).toContain(expectedMessage);
    },
  );

  it("exige demora y opciones válidas para productos a pedido", () => {
    const missingLeadTime = validateArtisanProductDraft({
      productForm: createProduct({
        availability_mode: "made_to_order",
        lead_time_days: null,
        stock_quantity: null,
      }),
      productImages: [validImage],
    });
    const invalidOptions = validateArtisanProductDraft({
      productForm: createProduct({
        availability_mode: "made_to_order",
        lead_time_days: 3,
        made_to_order_options: [
          { choices: [], id: "color", label: "Color", required: true },
        ],
        stock_quantity: null,
      }),
      productImages: [validImage],
    });

    expect(missingLeadTime.errorMessage).toContain("demora de producción");
    expect(invalidOptions.errorMessage).toContain("cada grupo debe tener nombre");
  });

  it("no permite publicar sin una imagen", () => {
    const result = validateArtisanProductDraft({
      productForm: createProduct(),
      productImages: [],
    });

    expect(result.errorMessage).toBe("Cargá al menos una foto para publicar el producto.");
  });
});

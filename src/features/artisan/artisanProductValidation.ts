import type { ArtisanProductInput } from "../../types/artisan";
import type { ProductAttribute } from "../../types/productAttributes";
import type { CategorySpecValue } from "../../types/categorySpecs";

import { sanitizeProductAttributes } from "../../types/productAttributes";
import { sanitizeCategorySpecValues } from "../../types/categorySpecs";
import type { ProductImageDraft } from "./imageEditorTypes";

type ValidationParams = {
  productForm: ArtisanProductInput;
  productImages: ProductImageDraft[];
};

type ValidationResult = {
  errorMessage: string | null;
  sanitizedAttributes: ProductAttribute[];
  sanitizedCategorySpecValues: CategorySpecValue[];
};

function hasInvalidOptionGroups(productForm: ArtisanProductInput) {
  return productForm.made_to_order_options.some(
    (option) =>
      option.label.trim().length === 0 ||
      option.choices.length === 0 ||
      option.choices.some((choice) => choice.label.trim().length === 0),
  );
}

export function validateArtisanProductDraft({
  productForm,
  productImages,
}: ValidationParams): ValidationResult {
  const sanitizedAttributes = sanitizeProductAttributes(productForm.product_attributes);
  const sanitizedCategorySpecValues = sanitizeCategorySpecValues(
    productForm.category_spec_values,
  );

  if (!productForm.category_id) {
    return {
      errorMessage: "Necesitás al menos una categoría activa para guardar productos.",
      sanitizedAttributes,
      sanitizedCategorySpecValues,
    };
  }

  if (productForm.title.trim().length < 4) {
    return {
      errorMessage: "El título debe tener al menos 4 caracteres.",
      sanitizedAttributes,
      sanitizedCategorySpecValues,
    };
  }

  if (!Number.isFinite(Number(productForm.price)) || Number(productForm.price) <= 0) {
    return {
      errorMessage: "Ingresá un precio mayor a 0 para publicar el producto.",
      sanitizedAttributes,
      sanitizedCategorySpecValues,
    };
  }

  if (
    productForm.availability_mode === "stock" &&
    (!Number.isInteger(Number(productForm.stock_quantity)) ||
      Number(productForm.stock_quantity) <= 0)
  ) {
    return {
      errorMessage: "Ingresá un stock válido mayor a 0.",
      sanitizedAttributes,
      sanitizedCategorySpecValues,
    };
  }

  if (productForm.availability_mode === "made_to_order") {
    if (
      !Number.isInteger(Number(productForm.lead_time_days)) ||
      Number(productForm.lead_time_days) <= 0
    ) {
      return {
        errorMessage: "Definí una demora de producción en días para la producción bajo demanda.",
        sanitizedAttributes,
        sanitizedCategorySpecValues,
      };
    }

    if (hasInvalidOptionGroups(productForm)) {
      return {
        errorMessage:
          "Revisá las variables de producción bajo demanda: cada grupo debe tener nombre y al menos una opción.",
        sanitizedAttributes,
        sanitizedCategorySpecValues,
      };
    }
  }

  if (hasInvalidOptionGroups(productForm)) {
    return {
      errorMessage:
        "Revisá las variables del producto: cada grupo debe tener nombre y al menos una opción.",
      sanitizedAttributes,
      sanitizedCategorySpecValues,
    };
  }

  if (productImages.length === 0) {
    return {
      errorMessage: "Cargá al menos una foto para publicar el producto.",
      sanitizedAttributes,
      sanitizedCategorySpecValues,
    };
  }

  return { errorMessage: null, sanitizedAttributes, sanitizedCategorySpecValues };
}

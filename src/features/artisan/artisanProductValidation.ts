import type { ArtisanProductInput } from "../../types/artisan";
import type { ProductAttribute } from "../../types/productAttributes";

import { sanitizeProductAttributes } from "../../types/productAttributes";
import type { ProductImageDraft } from "./imageEditorTypes";
import { resolveDraftProductData } from "./productDraftUtils";

type ValidationParams = {
  productForm: ArtisanProductInput;
  productImages: ProductImageDraft[];
  splitProductsByImage: boolean;
};

type ValidationResult = {
  errorMessage: string | null;
  sanitizedAttributes: ProductAttribute[];
};

function hasInvalidOptionGroups(productForm: ArtisanProductInput) {
  return productForm.made_to_order_options.some(
    (option) =>
      option.label.trim().length === 0 ||
      option.choices.length === 0 ||
      option.choices.some((choice) => choice.label.trim().length === 0),
  );
}

function hasInvalidSplitProduct(productForm: ArtisanProductInput, productImages: ProductImageDraft[]) {
  return productImages.some((draft) => {
    const resolved = resolveDraftProductData(draft, productForm);

    if (resolved.title.trim().length < 4) {
      return true;
    }

    if (!Number.isFinite(resolved.price) || resolved.price <= 0) {
      return true;
    }

    return (
      productForm.availability_mode === "stock" &&
      (!Number.isInteger(Number(resolved.stockQuantity)) || Number(resolved.stockQuantity) <= 0)
    );
  });
}

export function validateArtisanProductDraft({
  productForm,
  productImages,
  splitProductsByImage,
}: ValidationParams): ValidationResult {
  const sanitizedAttributes = sanitizeProductAttributes(productForm.product_attributes);

  if (!productForm.category_id) {
    return {
      errorMessage: "Necesitás al menos una categoría activa para guardar productos.",
      sanitizedAttributes,
    };
  }

  if (productForm.title.trim().length < 4) {
    return {
      errorMessage: "El título debe tener al menos 4 caracteres.",
      sanitizedAttributes,
    };
  }

  if (!Number.isFinite(Number(productForm.price)) || Number(productForm.price) <= 0) {
    return {
      errorMessage: "Ingresá un precio mayor a 0 para publicar el producto.",
      sanitizedAttributes,
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
      };
    }

    if (hasInvalidOptionGroups(productForm)) {
      return {
        errorMessage:
          "Revisá las variables de producción bajo demanda: cada grupo debe tener nombre y al menos una opción.",
        sanitizedAttributes,
      };
    }
  }

  if (hasInvalidOptionGroups(productForm)) {
    return {
      errorMessage:
        "Revisa las variables del producto: cada grupo debe tener nombre y al menos una opcion.",
      sanitizedAttributes,
    };
  }

  if (productImages.length === 0) {
    return {
      errorMessage: "Carga al menos una foto para publicar el producto.",
      sanitizedAttributes,
    };
  }

  if (splitProductsByImage && hasInvalidSplitProduct(productForm, productImages)) {
    return {
      errorMessage:
        "Revisá los productos por foto: cada uno debe tener título, precio y stock válidos.",
      sanitizedAttributes,
    };
  }

  return {
    errorMessage: null,
    sanitizedAttributes,
  };
}


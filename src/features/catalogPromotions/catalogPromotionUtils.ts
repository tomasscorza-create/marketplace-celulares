import type { CatalogPromotion, CatalogPromotionInput } from "@/types/catalogPromotions";

export function isCatalogPromotionVisible(
  promotion: Pick<CatalogPromotion, "ends_at" | "is_active" | "starts_at">,
  now = new Date(),
) {
  if (!promotion.is_active) return false;

  const nowTime = now.getTime();
  const startsAt = promotion.starts_at ? new Date(promotion.starts_at).getTime() : null;
  const endsAt = promotion.ends_at ? new Date(promotion.ends_at).getTime() : null;

  return (startsAt === null || startsAt <= nowTime) && (endsAt === null || endsAt > nowTime);
}

export function sortCatalogPromotions<T extends Pick<CatalogPromotion, "created_at" | "sort_order">>(
  promotions: T[],
) {
  return [...promotions].sort(
    (left, right) =>
      left.sort_order - right.sort_order ||
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  );
}

export function getCatalogPromotionActionLabel(
  promotion: Pick<CatalogPromotion, "action_label" | "action_type">,
) {
  if (promotion.action_label?.trim()) return promotion.action_label.trim();

  switch (promotion.action_type) {
    case "claim":
      return "Guardar beneficio";
    case "product":
      return "Ver producto";
    case "internal_link":
    case "external_link":
      return "Ver más";
    default:
      return null;
  }
}

export function isSafeExternalPromotionUrl(value: string | null | undefined) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function validateCatalogPromotionInput(input: CatalogPromotionInput) {
  const errors: string[] = [];

  if (!input.title.trim()) errors.push("El título es obligatorio.");
  if (input.title.trim().length > 100) errors.push("El título admite hasta 100 caracteres.");
  if ((input.body?.length ?? 0) > 240) errors.push("El mensaje admite hasta 240 caracteres.");
  if (input.starts_at && input.ends_at && input.starts_at >= input.ends_at) {
    errors.push("La fecha de finalización debe ser posterior al inicio.");
  }
  if (input.action_type === "product" && !input.product_id) {
    errors.push("Seleccioná el producto que abrirá esta promoción.");
  }
  if (
    input.action_type === "internal_link" &&
    !input.action_url?.trim().startsWith("/")
  ) {
    errors.push("El enlace interno debe comenzar con /.");
  }
  if (
    input.action_type === "external_link" &&
    !isSafeExternalPromotionUrl(input.action_url)
  ) {
    errors.push("El enlace externo debe usar http o https.");
  }
  if (input.action_type === "claim") {
    if (input.kind !== "discount" && input.kind !== "coupon") {
      errors.push("Sólo un descuento o cupón puede guardarse en una cuenta.");
    }
    if (!input.benefit_type || !input.benefit_value || input.benefit_value <= 0) {
      errors.push("Configurá el tipo y el valor del beneficio.");
    }
    if (input.benefit_type === "percentage" && (input.benefit_value ?? 0) > 100) {
      errors.push("El porcentaje no puede superar 100%.");
    }
  }

  return errors;
}

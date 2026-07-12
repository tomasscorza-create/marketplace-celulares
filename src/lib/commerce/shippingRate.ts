const SHIPPING_BASE_AMOUNT_ARS = 2000;
const SHIPPING_BASE_DISTANCE_KM = 2;
const SHIPPING_STEP_DISTANCE_KM = 0.5;
const SHIPPING_STEP_AMOUNT_ARS = 600;
const SHIPPING_MAX_AMOUNT_ARS = 6000;

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function isCordobaProvince(value: string | null | undefined) {
  return normalizeText(value) === "cordoba";
}

export function calculateCordobaShippingAmount(distanceKm: number) {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
    return SHIPPING_BASE_AMOUNT_ARS;
  }

  if (distanceKm <= SHIPPING_BASE_DISTANCE_KM) {
    return SHIPPING_BASE_AMOUNT_ARS;
  }

  const extraDistanceKm = distanceKm - SHIPPING_BASE_DISTANCE_KM;
  const extraSteps = Math.ceil(extraDistanceKm / SHIPPING_STEP_DISTANCE_KM);

  return Math.min(
    SHIPPING_BASE_AMOUNT_ARS + extraSteps * SHIPPING_STEP_AMOUNT_ARS,
    SHIPPING_MAX_AMOUNT_ARS,
  );
}

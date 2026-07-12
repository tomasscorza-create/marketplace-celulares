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

export function calculateHaversineDistanceKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const earthRadiusKm = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const haversineRoot =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);
  const centralAngle = 2 * Math.atan2(Math.sqrt(haversineRoot), Math.sqrt(1 - haversineRoot));

  return Number((earthRadiusKm * centralAngle).toFixed(2));
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

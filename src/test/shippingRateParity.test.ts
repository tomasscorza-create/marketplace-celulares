import { describe, expect, it } from "vitest";

import {
  calculateCordobaShippingAmount as calculateFrontendAmount,
  isCordobaProvince as isFrontendCordoba,
} from "../lib/commerce/shippingRate";
import {
  calculateCordobaShippingAmount as calculateEdgeAmount,
  isCordobaProvince as isEdgeCordoba,
} from "../../supabase/functions/_shared/shipping-rate";

describe("shipping rate parity", () => {
  it.each([0, 1, 2, 2.1, 2.5, 3, 10, 100, Number.NaN])(
    "mantiene el mismo precio en frontend y checkout para %s km",
    (distanceKm) => {
      expect(calculateFrontendAmount(distanceKm)).toBe(calculateEdgeAmount(distanceKm));
    },
  );

  it.each(["Córdoba", " cordoba ", "CÓRDOBA", "Buenos Aires", null, undefined])(
    "mantiene la misma normalización de provincia para %s",
    (province) => {
      expect(isFrontendCordoba(province)).toBe(isEdgeCordoba(province));
    },
  );
});

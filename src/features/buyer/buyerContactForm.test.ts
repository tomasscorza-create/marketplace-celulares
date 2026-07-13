import { describe, expect, it } from "vitest";

import {
  buildAddressSummary,
  buildInitialFormState,
  getLocalityFallbackCoordinates,
} from "./buyerContactForm";

describe("buyerContactForm", () => {
  it("construye una dirección legible con unidad y referencia", () => {
    expect(
      buildAddressSummary({
        apartment: "B",
        area: "Centro",
        city: "Córdoba",
        cityId: "",
        cityName: "Córdoba",
        floor: "3",
        latitude: null,
        longitude: null,
        number: "123",
        provinceId: "14",
        provinceName: "Córdoba",
        reference: "Portón negro",
        street: "San Martín",
      }),
    ).toBe("San Martín 123, Piso 3 Depto B, Centro, Córdoba, Córdoba, Ref: Portón negro");
  });

  it("hidrata los datos modernos del perfil y el domicilio", () => {
    const state = buildInitialFormState(
      {
        buyer_profile_bio: "Busco equipos reacondicionados",
        full_name: "Ada",
        profile_image_url: "https://example.test/ada.webp",
      },
      {
        phone: "+54 351 5550000",
        preferred_delivery_type: "shipping",
        shipping_address: "San Martín 123",
        shipping_address_details: {
          apartment: "B",
          area: "Centro",
          city: "Córdoba",
          cityName: "Córdoba",
          floor: "",
          latitude: -31.4,
          longitude: -64.18,
          number: "123",
          reference: "",
          street: "San Martín",
          unit: "",
        },
      },
    );

    expect(state.addressDetails.apartment).toBe("B");
    expect(state.addressDetails.latitude).toBe(-31.4);
    expect(state.fullName).toBe("Ada");
    expect(state.preferredDeliveryType).toBe("shipping");
    expect(state.profileDescription).toBe("Busco equipos reacondicionados");
  });

  it("no inventa coordenadas cuando la localidad no puede resolverse", () => {
    expect(
      getLocalityFallbackCoordinates(null, {
        apartment: "",
        area: "",
        city: "",
        cityId: "",
        cityName: "",
        floor: "",
        latitude: null,
        longitude: null,
        number: "",
        provinceId: "",
        provinceName: "",
        reference: "",
        street: "",
      }),
    ).toBeNull();
  });
});

import type { DeliveryType } from "../../types/commerce";
import type { BuyerShippingAddressDetails } from "../../types/buyer";
import type { ArgentinaGeoDataset } from "../../lib/geo/argentinaGeo";

import {
  resolveLocalityFromAddressDetails,
} from "../../lib/geo/argentinaGeo";
import {
  DEFAULT_PHONE_COUNTRY_ISO2,
  parseBuyerPhoneValue,
} from "../../lib/phone/phoneCountryOptions";

export type BuyerContactFormState = {
  addressDetails: BuyerShippingAddressDetails;
  customPhoneDialCode: string;
  deliveryNotes: string;
  fullName: string;
  phoneCountryIso2: string;
  phoneLocalNumber: string;
  phoneNationalArea: string;
  phone: string;
  preferredDeliveryType: DeliveryType;
  profileDescription: string;
  profileImageUrl: string;
  shippingAddress: string;
};

export const defaultAddressDetails: BuyerShippingAddressDetails = {
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
};

export const defaultFormState: BuyerContactFormState = {
  addressDetails: defaultAddressDetails,
  customPhoneDialCode: "",
  deliveryNotes: "",
  fullName: "",
  phoneCountryIso2: DEFAULT_PHONE_COUNTRY_ISO2,
  phoneLocalNumber: "",
  phoneNationalArea: "",
  phone: "",
  preferredDeliveryType: "arrange_with_seller",
  profileDescription: "",
  profileImageUrl: "",
  shippingAddress: "",
};

export function getNormalizedText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function getCompactCountryLabel(countryName: string, dialCode: string) {
  return `${countryName.slice(0, 3).toUpperCase()} ${dialCode}`.trim();
}

export function buildAddressSummary(addressDetails: BuyerShippingAddressDetails) {
  const primaryLine = [addressDetails.street, addressDetails.number].filter(Boolean).join(" ");
  const unitLine = [
    addressDetails.floor ? `Piso ${addressDetails.floor}` : "",
    addressDetails.apartment ? `Depto ${addressDetails.apartment}` : "",
  ].filter(Boolean).join(" ");
  const summaryParts = [
    primaryLine,
    unitLine,
    addressDetails.area,
    addressDetails.cityName || addressDetails.city,
    addressDetails.provinceName,
  ].filter(Boolean);
  if (addressDetails.reference) summaryParts.push(`Ref: ${addressDetails.reference}`);
  return summaryParts.join(", ").trim();
}

export function getLocalityFallbackCoordinates(
  dataset: ArgentinaGeoDataset | null,
  addressDetails: BuyerShippingAddressDetails,
) {
  const locality = resolveLocalityFromAddressDetails(dataset, addressDetails);
  if (!locality || locality.latitude === null || locality.longitude === null) return null;
  return { latitude: locality.latitude, longitude: locality.longitude };
}

export function buildInitialFormState(
  profile: {
    buyer_profile_bio?: string | null;
    full_name?: string | null;
    profile_image_url?: string | null;
    store_description?: string | null;
  } | null,
  preferences: {
    delivery_notes?: string | null;
    phone?: string | null;
    preferred_delivery_type?: DeliveryType | null;
    shipping_address?: string | null;
    shipping_address_details?: BuyerShippingAddressDetails | null;
    shipping_latitude?: number | null;
    shipping_longitude?: number | null;
  } | null,
): BuyerContactFormState {
  const parsedPhone = parseBuyerPhoneValue(preferences?.phone ?? "");
  const initialAddressDetails = preferences?.shipping_address_details
    ? {
        ...defaultAddressDetails,
        ...preferences.shipping_address_details,
        apartment:
          preferences.shipping_address_details.apartment ??
          preferences.shipping_address_details.unit ??
          "",
        latitude:
          typeof preferences.shipping_address_details.latitude === "number"
            ? preferences.shipping_address_details.latitude
            : preferences.shipping_latitude ?? null,
        longitude:
          typeof preferences.shipping_address_details.longitude === "number"
            ? preferences.shipping_address_details.longitude
            : preferences.shipping_longitude ?? null,
      }
    : {
        ...defaultAddressDetails,
        street: preferences?.shipping_address ?? "",
        latitude: preferences?.shipping_latitude ?? null,
        longitude: preferences?.shipping_longitude ?? null,
      };
  return {
    addressDetails: initialAddressDetails,
    customPhoneDialCode: parsedPhone.customDialCode,
    deliveryNotes: preferences?.delivery_notes ?? "",
    fullName: profile?.full_name ?? "",
    phoneCountryIso2: parsedPhone.countryIso2,
    phoneLocalNumber: parsedPhone.localNumber,
    phoneNationalArea: parsedPhone.nationalArea,
    phone: preferences?.phone ?? "",
    preferredDeliveryType: preferences?.preferred_delivery_type ?? "arrange_with_seller",
    profileDescription: profile?.buyer_profile_bio ?? profile?.store_description ?? "",
    profileImageUrl: profile?.profile_image_url ?? "",
    shippingAddress: preferences?.shipping_address ?? "",
  };
}

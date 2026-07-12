import type { FormEvent } from "react";
import type { DeliveryType } from "../types/commerce";
import type { BuyerShippingAddressDetails } from "../types/buyer";

import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { PagePlaceholder } from "../components/PagePlaceholder";
import { useAuth } from "../features/auth/useAuth";
import { useBuyerPreferences, useUpdateBuyerAccount } from "../features/buyer/buyerQueries";
import {
  getProvinceById,
  loadArgentinaGeoDataset,
  resolveLocalityFromAddressDetails,
  searchProvinceLocalities,
  type ArgentinaGeoDataset,
} from "../lib/geo/argentinaGeo";
import { geocodeAddress } from "../lib/geo/geocodeAddress";
import {
  buildBuyerPhoneValue,
  DEFAULT_PHONE_COUNTRY_ISO2,
  getPhoneCountryOption,
  parseBuyerPhoneValue,
  phoneCountryOptions,
} from "../lib/phone/phoneCountryOptions";

type BuyerContactFormState = {
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

const defaultAddressDetails: BuyerShippingAddressDetails = {
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

const defaultFormState: BuyerContactFormState = {
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

function getNormalizedText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function getCompactCountryLabel(countryName: string, dialCode: string) {
  return `${countryName.slice(0, 3).toUpperCase()} ${dialCode}`.trim();
}

function buildAddressSummary(addressDetails: BuyerShippingAddressDetails) {
  const primaryLine = [addressDetails.street, addressDetails.number].filter(Boolean).join(" ");
  const unitLine = [
    addressDetails.floor ? `Piso ${addressDetails.floor}` : "",
    addressDetails.apartment ? `Depto ${addressDetails.apartment}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const secondaryParts = [
    unitLine,
    addressDetails.area,
    addressDetails.cityName || addressDetails.city,
    addressDetails.provinceName,
  ].filter(Boolean);
  const summaryParts = [primaryLine, ...secondaryParts];

  if (addressDetails.reference) {
    summaryParts.push(`Ref: ${addressDetails.reference}`);
  }

  return summaryParts.join(", ").trim();
}

function getLocalityFallbackCoordinates(
  dataset: ArgentinaGeoDataset | null,
  addressDetails: BuyerShippingAddressDetails,
) {
  const locality = resolveLocalityFromAddressDetails(dataset, addressDetails);

  if (!locality || locality.latitude === null || locality.longitude === null) {
    return null;
  }

  return {
    latitude: locality.latitude,
    longitude: locality.longitude,
  };
}

function buildInitialFormState(
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

export function BuyerContactPage() {
  const location = useLocation();
  const { profile, user } = useAuth();
  const buyerId = user?.id;
  const preferencesQuery = useBuyerPreferences(buyerId, Boolean(buyerId));
  const updateBuyerAccountMutation = useUpdateBuyerAccount(buyerId);

  const [formState, setFormState] = useState<BuyerContactFormState>(defaultFormState);
  const [initialFormState, setInitialFormState] = useState<BuyerContactFormState>(defaultFormState);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAddressEditorOpen, setIsAddressEditorOpen] = useState(false);
  const [isCityPickerOpen, setIsCityPickerOpen] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [geoDataset, setGeoDataset] = useState<ArgentinaGeoDataset | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  const cameFromCart =
    typeof location.state === "object" &&
    location.state !== null &&
    "returnToCart" in location.state &&
    location.state.returnToCart === true;

  const initialStateKey = JSON.stringify(initialFormState);
  const formStateKey = JSON.stringify(formState);

  useEffect(() => {
    const nextState = buildInitialFormState(profile ?? null, preferencesQuery.data ?? null);

    setFormState((currentValue) =>
      JSON.stringify(currentValue) === initialStateKey ? nextState : currentValue,
    );
    setInitialFormState(nextState);
    setCitySearch(nextState.addressDetails.cityName || nextState.addressDetails.city || "");
    setIsCityPickerOpen(false);
  }, [initialStateKey, preferencesQuery.data, profile]);

  useEffect(() => {
    let isCancelled = false;

    void loadArgentinaGeoDataset()
      .then((dataset) => {
        if (!isCancelled) {
          setGeoDataset(dataset);
        }
      })
      .catch((error: Error) => {
        if (!isCancelled) {
          setGeoError(error.message);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      !formState.shippingAddress.trim() ||
      !formState.addressDetails.provinceId ||
      !formState.addressDetails.cityId
    ) {
      setIsAddressEditorOpen(true);
    }
  }, [
    formState.addressDetails.cityId,
    formState.addressDetails.provinceId,
    formState.shippingAddress,
  ]);

  const normalizedState = useMemo(
    () => ({
      addressDetails: {
        apartment: getNormalizedText(formState.addressDetails.apartment),
        area: getNormalizedText(formState.addressDetails.area),
        city: getNormalizedText(formState.addressDetails.city),
        cityId: getNormalizedText(formState.addressDetails.cityId ?? ""),
        cityName: getNormalizedText(formState.addressDetails.cityName ?? ""),
        floor: formState.addressDetails.floor.replace(/\D/g, ""),
        latitude:
          typeof formState.addressDetails.latitude === "number"
            ? Number(formState.addressDetails.latitude.toFixed(6))
            : null,
        longitude:
          typeof formState.addressDetails.longitude === "number"
            ? Number(formState.addressDetails.longitude.toFixed(6))
            : null,
        number: formState.addressDetails.number.replace(/\D/g, ""),
        provinceId: getNormalizedText(formState.addressDetails.provinceId ?? ""),
        provinceName: getNormalizedText(formState.addressDetails.provinceName ?? ""),
        reference: getNormalizedText(formState.addressDetails.reference),
        street: getNormalizedText(formState.addressDetails.street),
      },
      phone: buildBuyerPhoneValue({
        countryIso2: formState.phoneCountryIso2,
        customDialCode: formState.customPhoneDialCode,
        localNumber: formState.phoneLocalNumber,
        nationalArea: formState.phoneNationalArea,
      }),
      deliveryNotes: getNormalizedText(formState.deliveryNotes),
      fullName: getNormalizedText(formState.fullName),
      profileDescription: getNormalizedText(formState.profileDescription),
    }),
    [formState],
  );

  const compactAddressLine = useMemo(
    () => buildAddressSummary(normalizedState.addressDetails),
    [normalizedState.addressDetails],
  );
  const selectedProvince = useMemo(
    () => getProvinceById(geoDataset, formState.addressDetails.provinceId ?? ""),
    [formState.addressDetails.provinceId, geoDataset],
  );
  const selectedPhoneCountry = useMemo(
    () => getPhoneCountryOption(formState.phoneCountryIso2),
    [formState.phoneCountryIso2],
  );
  const citySuggestions = useMemo(
    () =>
      formState.addressDetails.provinceId
        ? searchProvinceLocalities(geoDataset, formState.addressDetails.provinceId, citySearch, 12)
        : [],
    [citySearch, formState.addressDetails.provinceId, geoDataset],
  );
  const hasConfirmedCitySelection =
    citySearch.trim().length > 0 &&
    citySearch.trim() === (formState.addressDetails.cityName || formState.addressDetails.city || "");

  const isSaving = updateBuyerAccountMutation.isPending;
  const hasChanged = formStateKey !== initialStateKey;
  const accountError = errorMessage ?? preferencesQuery.error?.message ?? null;
  const hasAnyAddressValue = Boolean(
    normalizedState.addressDetails.street ||
      normalizedState.addressDetails.number ||
      normalizedState.addressDetails.floor ||
      normalizedState.addressDetails.apartment ||
      normalizedState.addressDetails.area ||
      normalizedState.addressDetails.cityId ||
      normalizedState.addressDetails.provinceId ||
      normalizedState.addressDetails.reference,
  );
  const addressError =
    hasAnyAddressValue &&
    (!normalizedState.addressDetails.street ||
      !normalizedState.addressDetails.number ||
      !normalizedState.addressDetails.provinceId ||
      !normalizedState.addressDetails.cityId)
      ? "Completa calle, numero, provincia y ciudad o localidad desde la lista oficial."
      : null;
  const citySelectionError =
    citySearch.trim().length > 0 &&
    citySearch.trim() !== (formState.addressDetails.cityName || formState.addressDetails.city || "")
      ? "Selecciona una ciudad o localidad desde la lista sugerida."
      : null;
  const phoneError =
    formState.phoneLocalNumber.trim().length > 0 && !normalizedState.phone
      ? "Completa un codigo de pais valido y un numero de contacto."
      : null;
  const canSubmit = !isSaving && hasChanged && !addressError && !citySelectionError && !phoneError;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user || !buyerId || addressError || citySelectionError || phoneError) {
      return;
    }

    setStatusMessage(null);
    setErrorMessage(null);

    const fallbackCoordinates =
      getLocalityFallbackCoordinates(geoDataset, normalizedState.addressDetails) ?? null;
    let exactCoordinates = {
      latitude:
        fallbackCoordinates?.latitude ?? normalizedState.addressDetails.latitude,
      longitude:
        fallbackCoordinates?.longitude ?? normalizedState.addressDetails.longitude,
    };
    let usedApproximateCoordinates = false;

    if (
      normalizedState.addressDetails.street &&
      normalizedState.addressDetails.number &&
      normalizedState.addressDetails.provinceName &&
      (normalizedState.addressDetails.cityName || normalizedState.addressDetails.city)
    ) {
      try {
        exactCoordinates = await geocodeAddress(
          {
            city: normalizedState.addressDetails.cityName || normalizedState.addressDetails.city,
            number: normalizedState.addressDetails.number,
            province: normalizedState.addressDetails.provinceName,
            street: normalizedState.addressDetails.street,
          },
          {
            timeoutMs: 4500,
          },
        );
      } catch (error) {
        if (
          typeof exactCoordinates.latitude === "number" &&
          typeof exactCoordinates.longitude === "number"
        ) {
          usedApproximateCoordinates = true;
        } else {
          setErrorMessage(
            error instanceof Error ? error.message : "No pudimos ubicar esa direccion.",
          );
          return;
        }
      }
    }

    await updateBuyerAccountMutation
      .mutateAsync({
        delivery_notes: formState.deliveryNotes,
        full_name: normalizedState.fullName,
        phone: normalizedState.phone,
        preferred_delivery_type: formState.preferredDeliveryType,
        profile_description: normalizedState.profileDescription,
        profile_image_url: formState.profileImageUrl.trim(),
        shipping_address: compactAddressLine,
        shipping_address_details: {
          ...normalizedState.addressDetails,
          latitude: exactCoordinates.latitude,
          longitude: exactCoordinates.longitude,
        },
      })
      .then(() => {
        const nextState = {
          ...formState,
          addressDetails: {
            ...normalizedState.addressDetails,
            latitude: exactCoordinates.latitude,
            longitude: exactCoordinates.longitude,
          },
          fullName: normalizedState.fullName,
          phone: normalizedState.phone,
          profileDescription: normalizedState.profileDescription,
          profileImageUrl: formState.profileImageUrl.trim(),
          shippingAddress: compactAddressLine,
        };

        setInitialFormState(nextState);
        setFormState(nextState);
        setCitySearch(nextState.addressDetails.cityName || nextState.addressDetails.city || "");
        setIsAddressEditorOpen(false);
        setIsCityPickerOpen(false);
        setStatusMessage(
          usedApproximateCoordinates
            ? "Datos actualizados con una ubicacion aproximada."
            : "Datos de contacto actualizados.",
        );
      })
      .catch((error: Error) => {
        setErrorMessage(error.message);
      });
  };

  return (
    <PagePlaceholder
      actions={
        <div className="flex flex-wrap gap-3">
          {cameFromCart ? (
            <Link
              className="inline-flex w-full items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 sm:w-auto"
              to="/panel/comprador/carrito"
            >
              Volver al carrito de compras
            </Link>
          ) : null}
          <Link
            className="inline-flex w-full items-center justify-center rounded-full border border-ocean-500 px-5 py-3 text-sm font-medium text-ocean-500 transition-colors hover:bg-[#E0F2FE] sm:w-auto"
            to="/panel/comprador/cuenta"
          >
            Volver a editar perfil
          </Link>
        </div>
      }
      badge="Cuenta"
      description=""
      title="Datos de contacto"
    >
      {accountError ? (
        <div className="rounded-2xl border border-brand-500 bg-[#D1FAE5] px-4 py-3 text-sm text-brand-500">
          {accountError}
        </div>
      ) : null}

      {geoError ? (
        <div className="rounded-2xl border border-brand-500 bg-[#D1FAE5] px-4 py-3 text-sm text-brand-500">
          {geoError}
        </div>
      ) : null}

      {statusMessage ? (
        <div className="rounded-2xl border border-sun-500 bg-[#ECFEFF] px-4 py-3 text-sm text-brand-500">
          {statusMessage}
        </div>
      ) : null}

      <div className="mx-auto grid w-full max-w-[56rem] gap-5">
        <form
          className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-stone-900">Datos para coordinar la compra</h2>
            <p className="text-sm text-stone-500">
              Completa telefono y direccion de entrega con datos claros y precisos.
            </p>
          </div>

          <section className="grid gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-stone-700">Telefono de contacto</p>
              <p className="text-sm text-stone-500">
                Selecciona el pais y completa un numero valido para coordinar entregas o retiros.
              </p>
            </div>

            <div className="grid grid-cols-[minmax(0,5.75rem)_minmax(0,4.1rem)_minmax(0,1fr)] items-start gap-2 sm:grid-cols-[minmax(0,6.75rem)_minmax(0,4.75rem)_minmax(0,1fr)] sm:gap-3">
              <label className="grid min-w-0 gap-2 text-sm font-medium text-stone-700">
                Cod. pais
                <div className="relative min-w-0">
                  <div className="pointer-events-none inline-flex min-h-[3.125rem] w-full items-center rounded-2xl border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-900">
                    {getCompactCountryLabel(selectedPhoneCountry.name, selectedPhoneCountry.dialCode)}
                  </div>
                  <select
                    className="absolute inset-0 w-full cursor-pointer opacity-0"
                    onChange={(event) => {
                      const nextCountry = getPhoneCountryOption(event.target.value);

                      setStatusMessage(null);
                      if (errorMessage) {
                        setErrorMessage(null);
                      }
                      setFormState((currentValue) => ({
                        ...currentValue,
                        customPhoneDialCode: "",
                        phoneLocalNumber: currentValue.phoneLocalNumber.slice(0, nextCountry.localMaxLength),
                        phoneCountryIso2: event.target.value,
                        phoneNationalArea: currentValue.phoneNationalArea.slice(0, nextCountry.areaMaxLength),
                      }));
                    }}
                    value={formState.phoneCountryIso2}
                  >
                    {phoneCountryOptions
                      .filter((option) => option.iso2 !== "OT")
                      .map((option) => (
                        <option key={option.iso2} value={option.iso2}>
                          {option.name} ({option.dialCode})
                        </option>
                      ))}
                  </select>
                </div>
              </label>

              <label className="grid min-w-0 gap-2 text-sm font-medium text-stone-700">
                Cod. area
                <input
                  className="w-full min-w-0 rounded-2xl border border-stone-300 px-4 py-3 text-sm text-stone-900 outline-none transition-colors focus:border-sun-500"
                  inputMode="numeric"
                  onChange={(event) => {
                    setStatusMessage(null);
                    if (errorMessage) {
                      setErrorMessage(null);
                    }
                    setFormState((currentValue) => ({
                      ...currentValue,
                      phoneNationalArea: event.target.value.replace(/\D/g, "").slice(0, selectedPhoneCountry.areaMaxLength),
                    }));
                  }}
                  pattern="[0-9]*"
                  placeholder={selectedPhoneCountry.areaPlaceholder}
                  type="text"
                  value={formState.phoneNationalArea}
                />
              </label>

              <label className="grid min-w-0 gap-2 text-sm font-medium text-stone-700">
                Numero
                <input
                  className="w-full min-w-0 rounded-2xl border border-stone-300 px-4 py-3 text-sm text-stone-900 outline-none transition-colors focus:border-sun-500"
                  inputMode="numeric"
                  onChange={(event) => {
                    setStatusMessage(null);
                    if (errorMessage) {
                      setErrorMessage(null);
                    }
                    setFormState((currentValue) => ({
                      ...currentValue,
                      phoneLocalNumber: event.target.value.replace(/\D/g, "").slice(0, selectedPhoneCountry.localMaxLength),
                    }));
                  }}
                  pattern="[0-9]*"
                  placeholder={selectedPhoneCountry.localPlaceholder}
                  type="text"
                  value={formState.phoneLocalNumber}
                />
              </label>
            </div>

            {phoneError ? <p className="text-sm text-brand-500">{phoneError}</p> : null}
          </section>

          <div className="h-px w-full bg-stone-200" />

          <section className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-stone-700">Direccion de entrega</p>
                <p className="text-sm text-stone-500">
                  {compactAddressLine || "Todavia no cargaste una direccion de entrega."}
                </p>
              </div>
              <button
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-ocean-200 bg-white px-4 py-2 text-sm font-semibold text-ocean-600 transition-colors hover:border-ocean-400 hover:bg-[#E0F2FE]"
                onClick={() => {
                  setIsAddressEditorOpen((currentValue) => !currentValue);
                }}
                type="button"
              >
                {isAddressEditorOpen
                  ? "Cerrar direccion"
                  : compactAddressLine
                    ? "Editar direccion"
                    : "Completar direccion"}
              </button>
            </div>

            {isAddressEditorOpen ? (
              <div className="grid gap-5 rounded-2xl border border-stone-200 bg-stone-50/70 p-4 sm:p-5">
                <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,8rem)]">
                  <label className="grid min-w-0 gap-2 text-sm font-medium text-stone-700">
                    Calle
                    <input
                      className="w-full min-w-0 rounded-2xl border border-stone-300 px-4 py-3 text-sm text-stone-900 outline-none transition-colors focus:border-sun-500"
                      onChange={(event) => {
                        setStatusMessage(null);
                        if (errorMessage) {
                          setErrorMessage(null);
                        }
                        setFormState((currentValue) => ({
                          ...currentValue,
                          addressDetails: {
                            ...currentValue.addressDetails,
                            latitude:
                              getLocalityFallbackCoordinates(geoDataset, currentValue.addressDetails)
                                ?.latitude ?? null,
                            longitude:
                              getLocalityFallbackCoordinates(geoDataset, currentValue.addressDetails)
                                ?.longitude ?? null,
                            street: event.target.value,
                          },
                        }));
                      }}
                      placeholder="Ej. San Martin"
                      type="text"
                      value={formState.addressDetails.street}
                    />
                  </label>

                  <label className="grid min-w-0 gap-2 text-sm font-medium text-stone-700">
                    Numero
                    <input
                      className="w-full min-w-0 rounded-2xl border border-stone-300 px-4 py-3 text-sm text-stone-900 outline-none transition-colors focus:border-sun-500"
                      onChange={(event) => {
                        setStatusMessage(null);
                        if (errorMessage) {
                          setErrorMessage(null);
                        }
                        setFormState((currentValue) => ({
                          ...currentValue,
                          addressDetails: {
                            ...currentValue.addressDetails,
                            latitude:
                              getLocalityFallbackCoordinates(geoDataset, currentValue.addressDetails)
                                ?.latitude ?? null,
                            longitude:
                              getLocalityFallbackCoordinates(geoDataset, currentValue.addressDetails)
                                ?.longitude ?? null,
                            number: event.target.value.replace(/\D/g, ""),
                          },
                        }));
                      }}
                      placeholder="Ej. 742"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      type="text"
                      value={formState.addressDetails.number}
                    />
                  </label>
                </div>

                <div className="grid items-start gap-4 sm:grid-cols-2">
                  <label className="grid min-w-0 gap-2 text-sm font-medium text-stone-700">
                    Provincia
                    <select
                      className="w-full min-w-0 rounded-2xl border border-stone-300 px-4 py-3 text-sm text-stone-900 outline-none transition-colors focus:border-sun-500"
                      onChange={(event) => {
                        const province = getProvinceById(geoDataset, event.target.value);

                        setStatusMessage(null);
                        if (errorMessage) {
                          setErrorMessage(null);
                        }

                        setFormState((currentValue) => ({
                          ...currentValue,
                          addressDetails: {
                            ...currentValue.addressDetails,
                            city: "",
                            cityId: "",
                            cityName: "",
                            latitude: null,
                            longitude: null,
                            provinceId: province?.id ?? "",
                            provinceName: province?.name ?? "",
                          },
                        }));
                        setCitySearch("");
                        setIsCityPickerOpen(false);
                      }}
                      value={formState.addressDetails.provinceId ?? ""}
                    >
                      <option value="">Selecciona una provincia</option>
                      {(geoDataset?.provinces ?? []).map((province) => (
                        <option key={province.id} value={province.id}>
                          {province.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid min-w-0 gap-2 text-sm font-medium text-stone-700">
                    Barrio
                    <input
                      className="w-full min-w-0 rounded-2xl border border-stone-300 px-4 py-3 text-sm text-stone-900 outline-none transition-colors focus:border-sun-500"
                      onChange={(event) => {
                        setStatusMessage(null);
                        if (errorMessage) {
                          setErrorMessage(null);
                        }
                        setFormState((currentValue) => ({
                          ...currentValue,
                          addressDetails: {
                            ...currentValue.addressDetails,
                            area: event.target.value,
                          },
                        }));
                      }}
                      placeholder="Ej. Guemes"
                      type="text"
                      value={formState.addressDetails.area}
                    />
                  </label>
                </div>

                <div className="grid gap-3">
                  <label className="grid min-w-0 gap-2 text-sm font-medium text-stone-700">
                    Ciudad o localidad
                    <input
                      className="w-full min-w-0 rounded-2xl border border-stone-300 px-4 py-3 text-sm text-stone-900 outline-none transition-colors focus:border-sun-500 disabled:bg-stone-100 disabled:text-stone-400"
                      disabled={!selectedProvince}
                      onFocus={() => {
                        if (selectedProvince) {
                          setIsCityPickerOpen(true);
                        }
                      }}
                      onChange={(event) => {
                        setStatusMessage(null);
                        if (errorMessage) {
                          setErrorMessage(null);
                        }
                        setCitySearch(event.target.value);
                        setIsCityPickerOpen(true);
                        setFormState((currentValue) => ({
                          ...currentValue,
                          addressDetails: {
                            ...currentValue.addressDetails,
                            city: "",
                            cityId: "",
                            cityName: "",
                            latitude: null,
                            longitude: null,
                          },
                        }));
                      }}
                      placeholder={
                        selectedProvince
                          ? "Busca y elige una ciudad o localidad oficial"
                          : "Primero elige una provincia"
                      }
                      type="search"
                      value={citySearch}
                    />
                  </label>

                  {selectedProvince && isCityPickerOpen && !hasConfirmedCitySelection ? (
                    <div className="max-h-56 overflow-y-auto rounded-2xl border border-stone-200 bg-white p-2">
                      {citySuggestions.length > 0 ? (
                        <div className="grid gap-1">
                          {citySuggestions.map((locality) => (
                            <button
                              key={locality.id}
                              className="grid gap-1 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-stone-50"
                              onClick={() => {
                                setCitySearch(locality.name);
                                setStatusMessage(null);
                                if (errorMessage) {
                                  setErrorMessage(null);
                                }
                                setFormState((currentValue) => ({
                                  ...currentValue,
                                  addressDetails: {
                                    ...currentValue.addressDetails,
                                    city: locality.name,
                                    cityId: locality.id,
                                    cityName: locality.name,
                                    latitude: locality.latitude,
                                    longitude: locality.longitude,
                                  },
                                }));
                                setIsCityPickerOpen(false);
                              }}
                              type="button"
                            >
                              <span className="text-sm font-medium text-stone-900">{locality.name}</span>
                              <span className="text-xs text-stone-500">
                                {locality.municipality}
                                {locality.department && locality.department !== locality.municipality
                                  ? ` · ${locality.department}`
                                  : ""}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="px-3 py-2 text-sm text-stone-500">
                          No encontramos coincidencias dentro de {selectedProvince.name}.
                        </p>
                      )}
                    </div>
                  ) : null}

                  {citySelectionError ? (
                    <p className="text-sm text-brand-500">{citySelectionError}</p>
                  ) : null}
                </div>

                <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,8rem)_minmax(0,10rem)_minmax(0,1fr)]">
                  <label className="grid min-w-0 gap-2 text-sm font-medium text-stone-700">
                    Piso
                    <input
                      className="w-full min-w-0 rounded-2xl border border-stone-300 px-4 py-3 text-sm text-stone-900 outline-none transition-colors focus:border-sun-500"
                      onChange={(event) => {
                        setStatusMessage(null);
                        if (errorMessage) {
                          setErrorMessage(null);
                        }
                        setFormState((currentValue) => ({
                          ...currentValue,
                          addressDetails: {
                            ...currentValue.addressDetails,
                            floor: event.target.value.replace(/\D/g, ""),
                          },
                        }));
                      }}
                      placeholder="Ej. 3"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      type="text"
                      value={formState.addressDetails.floor}
                    />
                  </label>

                  <label className="grid min-w-0 gap-2 text-sm font-medium text-stone-700">
                    Departamento
                    <input
                      className="w-full min-w-0 rounded-2xl border border-stone-300 px-4 py-3 text-sm text-stone-900 outline-none transition-colors focus:border-sun-500"
                      onChange={(event) => {
                        setStatusMessage(null);
                        if (errorMessage) {
                          setErrorMessage(null);
                        }
                        setFormState((currentValue) => ({
                          ...currentValue,
                          addressDetails: {
                            ...currentValue.addressDetails,
                            apartment: event.target.value,
                          },
                        }));
                      }}
                      placeholder="Ej. B"
                      type="text"
                      value={formState.addressDetails.apartment}
                    />
                  </label>

                  <label className="grid min-w-0 gap-2 text-sm font-medium text-stone-700">
                    Referencia adicional
                    <input
                      className="w-full min-w-0 rounded-2xl border border-stone-300 px-4 py-3 text-sm text-stone-900 outline-none transition-colors focus:border-sun-500"
                      onChange={(event) => {
                        setStatusMessage(null);
                        if (errorMessage) {
                          setErrorMessage(null);
                        }
                        setFormState((currentValue) => ({
                          ...currentValue,
                          addressDetails: {
                            ...currentValue.addressDetails,
                            reference: event.target.value,
                          },
                        }));
                      }}
                      placeholder="Ej. Porton negro, torre, casa del fondo, frente a la plaza"
                      type="text"
                      value={formState.addressDetails.reference}
                    />
                  </label>
                </div>

                {addressError ? <p className="text-sm text-brand-500">{addressError}</p> : null}
              </div>
            ) : null}
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-sun-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0e7490] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canSubmit}
              type="submit"
            >
              {isSaving ? "Guardando..." : hasChanged ? "Guardar datos" : "Sin cambios"}
            </button>
          </div>
        </form>
      </div>
    </PagePlaceholder>
  );
}

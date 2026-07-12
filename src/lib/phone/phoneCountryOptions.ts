export type PhoneCountryOption = {
  areaMaxLength: number;
  areaMinLength: number;
  areaPlaceholder: string;
  dialCode: string;
  iso2: string;
  localMaxLength: number;
  localMinLength: number;
  localPlaceholder: string;
  name: string;
};

export type ParsedBuyerPhone = {
  countryIso2: string;
  customDialCode: string;
  localNumber: string;
  nationalArea: string;
};

export const DEFAULT_PHONE_COUNTRY_ISO2 = "AR";

export const phoneCountryOptions: PhoneCountryOption[] = [
  { iso2: "AR", name: "Argentina", dialCode: "+54", areaPlaceholder: "11", areaMinLength: 2, areaMaxLength: 4, localPlaceholder: "55555555", localMinLength: 6, localMaxLength: 8 },
  { iso2: "BO", name: "Bolivia", dialCode: "+591", areaPlaceholder: "2", areaMinLength: 1, areaMaxLength: 3, localPlaceholder: "2123456", localMinLength: 6, localMaxLength: 8 },
  { iso2: "BR", name: "Brasil", dialCode: "+55", areaPlaceholder: "11", areaMinLength: 2, areaMaxLength: 3, localPlaceholder: "987654321", localMinLength: 8, localMaxLength: 9 },
  { iso2: "CA", name: "Canadá", dialCode: "+1", areaPlaceholder: "416", areaMinLength: 3, areaMaxLength: 3, localPlaceholder: "5551234", localMinLength: 7, localMaxLength: 7 },
  { iso2: "CL", name: "Chile", dialCode: "+56", areaPlaceholder: "2", areaMinLength: 1, areaMaxLength: 2, localPlaceholder: "23456789", localMinLength: 8, localMaxLength: 8 },
  { iso2: "CO", name: "Colombia", dialCode: "+57", areaPlaceholder: "1", areaMinLength: 1, areaMaxLength: 3, localPlaceholder: "2345678", localMinLength: 7, localMaxLength: 10 },
  { iso2: "CR", name: "Costa Rica", dialCode: "+506", areaPlaceholder: "2", areaMinLength: 1, areaMaxLength: 2, localPlaceholder: "23456789", localMinLength: 8, localMaxLength: 8 },
  { iso2: "CU", name: "Cuba", dialCode: "+53", areaPlaceholder: "7", areaMinLength: 1, areaMaxLength: 3, localPlaceholder: "1234567", localMinLength: 6, localMaxLength: 8 },
  { iso2: "DE", name: "Alemania", dialCode: "+49", areaPlaceholder: "30", areaMinLength: 2, areaMaxLength: 5, localPlaceholder: "12345678", localMinLength: 6, localMaxLength: 11 },
  { iso2: "DO", name: "República Dominicana", dialCode: "+1", areaPlaceholder: "809", areaMinLength: 3, areaMaxLength: 3, localPlaceholder: "5551234", localMinLength: 7, localMaxLength: 7 },
  { iso2: "EC", name: "Ecuador", dialCode: "+593", areaPlaceholder: "2", areaMinLength: 1, areaMaxLength: 2, localPlaceholder: "2345678", localMinLength: 7, localMaxLength: 9 },
  { iso2: "ES", name: "España", dialCode: "+34", areaPlaceholder: "91", areaMinLength: 1, areaMaxLength: 3, localPlaceholder: "2345678", localMinLength: 7, localMaxLength: 9 },
  { iso2: "FR", name: "Francia", dialCode: "+33", areaPlaceholder: "1", areaMinLength: 1, areaMaxLength: 2, localPlaceholder: "23456789", localMinLength: 8, localMaxLength: 9 },
  { iso2: "GB", name: "Reino Unido", dialCode: "+44", areaPlaceholder: "20", areaMinLength: 2, areaMaxLength: 4, localPlaceholder: "12345678", localMinLength: 6, localMaxLength: 10 },
  { iso2: "GT", name: "Guatemala", dialCode: "+502", areaPlaceholder: "2", areaMinLength: 1, areaMaxLength: 2, localPlaceholder: "23456789", localMinLength: 8, localMaxLength: 8 },
  { iso2: "HN", name: "Honduras", dialCode: "+504", areaPlaceholder: "2", areaMinLength: 1, areaMaxLength: 2, localPlaceholder: "23456789", localMinLength: 8, localMaxLength: 8 },
  { iso2: "IN", name: "India", dialCode: "+91", areaPlaceholder: "11", areaMinLength: 2, areaMaxLength: 4, localPlaceholder: "23456789", localMinLength: 8, localMaxLength: 10 },
  { iso2: "IT", name: "Italia", dialCode: "+39", areaPlaceholder: "06", areaMinLength: 2, areaMaxLength: 4, localPlaceholder: "12345678", localMinLength: 6, localMaxLength: 10 },
  { iso2: "JP", name: "Japón", dialCode: "+81", areaPlaceholder: "3", areaMinLength: 1, areaMaxLength: 4, localPlaceholder: "12345678", localMinLength: 7, localMaxLength: 9 },
  { iso2: "MX", name: "México", dialCode: "+52", areaPlaceholder: "55", areaMinLength: 2, areaMaxLength: 3, localPlaceholder: "12345678", localMinLength: 8, localMaxLength: 10 },
  { iso2: "NI", name: "Nicaragua", dialCode: "+505", areaPlaceholder: "2", areaMinLength: 1, areaMaxLength: 2, localPlaceholder: "23456789", localMinLength: 8, localMaxLength: 8 },
  { iso2: "PA", name: "Panamá", dialCode: "+507", areaPlaceholder: "2", areaMinLength: 1, areaMaxLength: 2, localPlaceholder: "3456789", localMinLength: 7, localMaxLength: 8 },
  { iso2: "PE", name: "Perú", dialCode: "+51", areaPlaceholder: "1", areaMinLength: 1, areaMaxLength: 3, localPlaceholder: "2345678", localMinLength: 7, localMaxLength: 9 },
  { iso2: "PT", name: "Portugal", dialCode: "+351", areaPlaceholder: "21", areaMinLength: 2, areaMaxLength: 3, localPlaceholder: "2345678", localMinLength: 7, localMaxLength: 9 },
  { iso2: "PY", name: "Paraguay", dialCode: "+595", areaPlaceholder: "21", areaMinLength: 2, areaMaxLength: 3, localPlaceholder: "1234567", localMinLength: 6, localMaxLength: 9 },
  { iso2: "SV", name: "El Salvador", dialCode: "+503", areaPlaceholder: "2", areaMinLength: 1, areaMaxLength: 2, localPlaceholder: "23456789", localMinLength: 8, localMaxLength: 8 },
  { iso2: "US", name: "Estados Unidos", dialCode: "+1", areaPlaceholder: "212", areaMinLength: 3, areaMaxLength: 3, localPlaceholder: "5551234", localMinLength: 7, localMaxLength: 7 },
  { iso2: "UY", name: "Uruguay", dialCode: "+598", areaPlaceholder: "2", areaMinLength: 1, areaMaxLength: 2, localPlaceholder: "1234567", localMinLength: 7, localMaxLength: 8 },
  { iso2: "VE", name: "Venezuela", dialCode: "+58", areaPlaceholder: "212", areaMinLength: 3, areaMaxLength: 4, localPlaceholder: "1234567", localMinLength: 7, localMaxLength: 7 },
  { iso2: "OT", name: "Otro país", dialCode: "", areaPlaceholder: "21", areaMinLength: 1, areaMaxLength: 5, localPlaceholder: "12345678", localMinLength: 6, localMaxLength: 12 },
];

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function getPhoneCountryOption(iso2: string | null | undefined) {
  return (
    phoneCountryOptions.find((option) => option.iso2 === iso2) ??
    phoneCountryOptions.find((option) => option.iso2 === DEFAULT_PHONE_COUNTRY_ISO2) ??
    phoneCountryOptions[0]
  );
}

export function buildBuyerPhoneValue(parts: ParsedBuyerPhone) {
  const country = getPhoneCountryOption(parts.countryIso2);
  const dialCode =
    parts.countryIso2 === "OT"
      ? `+${digitsOnly(parts.customDialCode).slice(0, 4)}`
      : country.dialCode;
  const nationalArea = digitsOnly(parts.nationalArea).slice(0, country.areaMaxLength);
  const localNumber = digitsOnly(parts.localNumber).slice(0, country.localMaxLength);

  if (!dialCode || !localNumber) {
    return "";
  }

  return [dialCode, nationalArea, localNumber].filter(Boolean).join(" ").trim();
}

export function parseBuyerPhoneValue(phone: string | null | undefined): ParsedBuyerPhone {
  const rawDigits = digitsOnly(phone ?? "");

  if (!rawDigits) {
    return {
      countryIso2: DEFAULT_PHONE_COUNTRY_ISO2,
      customDialCode: "",
      localNumber: "",
      nationalArea: "",
    };
  }

  const matchedCountry =
    [...phoneCountryOptions]
      .filter((option) => option.dialCode)
      .sort((left, right) => right.dialCode.length - left.dialCode.length)
      .find((option) => rawDigits.startsWith(digitsOnly(option.dialCode))) ?? getPhoneCountryOption(DEFAULT_PHONE_COUNTRY_ISO2);

  const countryDigits = digitsOnly(matchedCountry.dialCode);
  const nationalDigits = rawDigits.slice(countryDigits.length);
  const localLength = Math.min(
    matchedCountry.localMaxLength,
    Math.max(matchedCountry.localMinLength, nationalDigits.length - matchedCountry.areaMinLength),
  );
  const areaLength = Math.max(
    0,
    Math.min(matchedCountry.areaMaxLength, nationalDigits.length - localLength),
  );

  return {
    countryIso2: matchedCountry.iso2,
    customDialCode: "",
    localNumber: nationalDigits.slice(areaLength),
    nationalArea: nationalDigits.slice(0, areaLength),
  };
}

export type FieldErrors<TField extends string> = Partial<Record<TField, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(value.trim());
}

export function isValidUrl(value: string) {
  try {
    const parsedUrl = new URL(value.trim());
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

export function getFieldError<TField extends string>(
  errors: FieldErrors<TField>,
  field: TField,
) {
  return errors[field] ?? null;
}

export function hasFieldErrors<TField extends string>(errors: FieldErrors<TField>) {
  return Object.values(errors).some(Boolean);
}

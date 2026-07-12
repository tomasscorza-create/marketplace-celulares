/**
 * Helpers de formateo para mostrar valores al usuario en es-AR.
 *
 * Diseñados para reemplazar los ~20 sitios del codebase que hacen
 * `Number(x).toLocaleString("es-AR", ...)` con variantes inconsistentes
 * (algunos cortan decimales, otros no, algunos prefijan "$" como string).
 *
 * NO migrar usos masivamente — incorporar gradualmente desde código nuevo.
 */

const PRICE_LOCALE = "es-AR";

type FormatPriceOptions = {
  /**
   * Si true, muestra centavos cuando los hay (ej: "12.500,50").
   * Default: false (alineado con el estándar visible del catálogo).
   */
  withCents?: boolean;
};

/**
 * Devuelve el número formateado SIN símbolo de moneda.
 *
 * @example
 *   formatPrice(12500)           // "12.500"
 *   formatPrice(12500.5)         // "12.500"
 *   formatPrice(12500.5, { withCents: true })  // "12.500,5"
 *   formatPrice(null)            // "0"
 */
export function formatPrice(
  value: number | string | null | undefined,
  options: FormatPriceOptions = {},
): string {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return "0";
  }
  const fractionDigits = options.withCents ? undefined : 0;
  return numeric.toLocaleString(PRICE_LOCALE, {
    maximumFractionDigits: fractionDigits,
  });
}

/**
 * Igual que `formatPrice` pero con símbolo `$` adelante.
 *
 * @example
 *   formatCurrency(12500)        // "$12.500"
 */
export function formatCurrency(
  value: number | string | null | undefined,
  options: FormatPriceOptions = {},
): string {
  return `$${formatPrice(value, options)}`;
}

// ─── Fechas ────────────────────────────────────────────────────────────────

const DATE_LOCALE = "es-AR";

type DateInput = Date | string | number | null | undefined;

function toDate(input: DateInput): Date | null {
  if (input == null) return null;
  const date = input instanceof Date ? input : new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Formato corto: "26 abr 2025".
 *
 * @example
 *   formatDate("2025-04-26T10:00:00Z")  // "26 abr 2025"
 *   formatDate(null)                    // ""
 */
export function formatDate(input: DateInput): string {
  const date = toDate(input);
  if (!date) return "";
  return date.toLocaleDateString(DATE_LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Formato largo: "26 de abril de 2025".
 */
export function formatDateLong(input: DateInput): string {
  const date = toDate(input);
  if (!date) return "";
  return date.toLocaleDateString(DATE_LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Formato con hora: "26 abr 2025, 14:30".
 */
export function formatDateTime(input: DateInput): string {
  const date = toDate(input);
  if (!date) return "";
  return date.toLocaleString(DATE_LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

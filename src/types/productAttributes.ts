import { sanitizeTrimmedPairs } from "../lib/sanitizeTextPairs";

export type ProductAttribute = {
  key: string;
  value: string;
};

export const PRODUCT_ATTRIBUTE_SUGGESTIONS = [
  "material",
  "compatibilidad",
  "color",
  "estilo",
  "conectividad",
  "proteccion",
] as const;

export const PRODUCT_ATTRIBUTE_VALUE_SUGGESTIONS: Record<string, string[]> = {
  material: [
    "silicona",
    "tpu",
    "policarbonato",
    "aluminio",
    "cristal templado",
    "cuero ecologico",
    "plastico abs",
    "nylon trenzado",
    "goma",
    "metal",
    "acero inoxidable",
    "hidrogel",
    "vidrio",
  ],
  compatibilidad: [
    "iphone",
    "samsung",
    "motorola",
    "xiaomi",
    "apple watch",
    "airpods",
    "ipad",
    "tablet",
    "universal",
    "android",
    "ios",
    "mag safe",
  ],
  color: [
    "negro",
    "blanco",
    "transparente",
    "rojo",
    "azul",
    "verde",
    "amarillo",
    "gris",
    "plata",
    "dorado",
    "oro rosa",
    "celeste",
    "rosa",
    "multicolor",
  ],
  estilo: [
    "minimalista",
    "gamer",
    "ejecutivo",
    "transparente",
    "reforzado",
    "ultra fino",
    "premium",
    "deportivo",
    "infantil",
    "rigido",
    "flexible",
  ],
  conectividad: [
    "bluetooth",
    "usb-c",
    "lightning",
    "micro usb",
    "inalambrico",
    "nfc",
    "wifi",
    "jack 3.5mm",
  ],
  proteccion: [
    "antigolpes",
    "anti rayas",
    "resistente al agua",
    "ip68",
    "ip67",
    "anti espia",
    "bordes elevados",
    "proteccion de camara",
  ],
};

export function getProductAttributeValueSuggestions(attributeKey: string) {
  return PRODUCT_ATTRIBUTE_VALUE_SUGGESTIONS[attributeKey.trim().toLowerCase()] ?? [];
}

export const MAX_PRODUCT_ATTRIBUTES = 12;

export function sanitizeProductAttributes(attributes: ProductAttribute[]) {
  return sanitizeTrimmedPairs(
    attributes.map((attribute) => [attribute.key, attribute.value]),
    MAX_PRODUCT_ATTRIBUTES,
  ).map(([key, value]) => ({ key, value }));
}

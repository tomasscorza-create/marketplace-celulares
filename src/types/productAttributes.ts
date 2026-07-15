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
  "capacidad",
  "longitud",
  "autonomia",
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
    "notebook",
    "pc",
    "consola",
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
    "usb-a",
    "hdmi",
    "aux 3.5mm",
    "ethernet",
    "rca",
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
  capacidad: [
    "32gb",
    "64gb",
    "128gb",
    "256gb",
    "512gb",
    "1tb",
    "5w",
    "10w",
    "20w",
    "50w",
    "5000mah",
    "10000mah",
    "20000mah",
  ],
  longitud: ["0.5m", "1m", "1.5m", "2m", "3m"],
  autonomia: ["hasta 4h", "hasta 8h", "hasta 12h", "hasta 24h", "hasta 48h"],
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

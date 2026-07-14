import type { AnalyticsEventName } from "../../types/analytics";

export const ANALYTICS_POLICY_VERSION = "2026-07-analytics-v1";
export const ANALYTICS_CLASSIFIER_VERSION = "device-v1";

export const ANONYMOUS_ANALYTICS_EVENTS = new Set<AnalyticsEventName>([
  "page_view",
  "product_view",
  "artisan_view",
  "search",
  "filter",
  "contact_click",
]);

export const ANALYTICS_EVENT_LABELS: Record<AnalyticsEventName, string> = {
  artisan_view: "Vista de vendedor",
  cart_add: "Agregado al carrito",
  checkout_start: "Checkout iniciado",
  contact_click: "Contacto",
  favorite_add: "Agregado a favoritos",
  filter: "Filtro aplicado",
  page_view: "Página vista",
  product_view: "Producto visto",
  purchase_completed: "Compra completada",
  search: "Búsqueda",
  signup_completed: "Registro completado",
};

export const ANALYTICS_PROHIBITED_DATA = [
  "contraseñas",
  "contenido de campos libres",
  "correo o teléfono dentro de eventos",
  "direcciones o coordenadas exactas",
  "datos de pago",
  "IP persistida",
  "señales de fingerprinting",
] as const;

import { corsHeaders } from "../_shared/cors.ts";
import type {
  ProductOptionGroup,
  ProductSelectionChoice,
} from "../_shared/product-config.ts";

export type CheckoutRequestBody = {
  buyerPhone?: string;
  deliveryNotes?: string;
  deliveryType?: "arrange_with_seller" | "pickup" | "shipping";
  shippingAddress?: string;
  shippingLatitude?: number;
  shippingLongitude?: number;
  shippingProvinceName?: string;
  returnOrigin?: string;
};

export type BuyerShippingAddressDetailsRow = {
  latitude?: number | null;
  longitude?: number | null;
  provinceName?: string | null;
};

export type BuyerPreferenceRow = {
  buyer_id: string;
  delivery_notes: string | null;
  phone: string | null;
  preferred_delivery_type: "arrange_with_seller" | "pickup" | "shipping" | null;
  shipping_address: string | null;
  shipping_address_details?: BuyerShippingAddressDetailsRow | null;
  shipping_latitude?: number | null;
  shipping_longitude?: number | null;
};

export type ProfileRow = {
  email: string;
  full_name: string;
  id: string;
  role: "admin" | "artisan" | "buyer";
};

export type CartRow = {
  buyer_id: string;
  converted_order_id: string | null;
  id: string;
  status: "active" | "converted" | "abandoned";
};

export type CartItemRow = {
  artisan_id: string;
  availability_mode: "stock" | "made_to_order";
  cart_id: string;
  configuration_key: string;
  id: string;
  lead_time_days: number | null;
  product_id: string;
  product_image_url: string | null;
  product_title: string;
  quantity: number;
  selected_options: ProductSelectionChoice[];
  selected_options_summary: string | null;
  unit_price: number;
};

export type ProductRow = {
  artisan_id: string;
  availability_mode: "stock" | "made_to_order";
  categories: { name: string } | null;
  description: string;
  id: string;
  image_url: string | null;
  image_urls: string[];
  is_active: boolean;
  lead_time_days: number | null;
  made_to_order_options: ProductOptionGroup[];
  price: number;
  stock_quantity: number | null;
  title: string;
};

export type ArtisanProfileRow = {
  full_name: string;
  id: string;
  store_name: string | null;
};

export type MercadoPagoPreferenceResponse = {
  id: string;
  init_point: string;
  sandbox_init_point?: string | null;
};

export type NormalizedCheckoutItem = {
  artisan_id: string;
  artisan_name: string | null;
  availability_mode: "stock" | "made_to_order";
  category_name: string | null;
  lead_time_days: number | null;
  product_description: string;
  product_id: string;
  product_image_url: string | null;
  product_title: string;
  quantity: number;
  selected_options: ProductSelectionChoice[];
  selected_options_summary: string | null;
  source_cart_item_id: string;
  stock_quantity: number | null;
  store_name: string | null;
  subtotal: number;
  unit_price: number;
};

export const MARKETPLACE_DISPATCH_POINT = {
  latitude: -31.42397,
  longitude: -64.19245,
} as const;

export function getRequiredEnv(name: string) {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function normalizeHttpOrigin(value: string | null | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

function isPublicHttpsOrigin(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isLocalDevelopmentOrigin(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1")
    );
  } catch {
    return false;
  }
}

export function resolveCheckoutReturnBaseUrl(
  request: Request,
  configuredAppBaseUrl: string,
  requestedReturnOrigin?: string,
) {
  const configuredOrigin = normalizeHttpOrigin(configuredAppBaseUrl);
  const requestOrigin = normalizeHttpOrigin(request.headers.get("Origin"));
  const requestedOrigin = normalizeHttpOrigin(requestedReturnOrigin);

  if (
    requestOrigin &&
    requestedOrigin &&
    requestOrigin === requestedOrigin &&
    (isPublicHttpsOrigin(requestedOrigin) || isLocalDevelopmentOrigin(requestedOrigin))
  ) {
    return requestOrigin;
  }

  return configuredOrigin ?? configuredAppBaseUrl.replace(/\/$/, "");
}

export function buildCheckoutReturnUrl(
  checkoutReturnUrl: string,
  result: "failure" | "pending" | "success",
  returnTo: string,
) {
  const url = new URL(checkoutReturnUrl);
  url.searchParams.set("result", result);
  url.searchParams.set("return_to", returnTo);
  return url.toString();
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

export function normalizeDeliveryType(
  value: string | undefined,
): "arrange_with_seller" | "pickup" | "shipping" {
  return value === "pickup" || value === "shipping" ? value : "arrange_with_seller";
}

export function cleanNullableText(value: string | undefined | null) {
  const trimmedValue = value?.trim() ?? "";
  return trimmedValue.length > 0 ? trimmedValue : null;
}

export function isMissingBuyerPreferencesError(
  error: { code?: string; message?: string | null; details?: string | null } | null,
) {
  const errorText = `${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST204" ||
    errorText.includes("buyer_preferences") ||
    errorText.includes("does not exist")
  );
}

export function isMissingColumnError(
  error: { code?: string; message?: string | null; details?: string | null } | null,
  columnName: string,
) {
  const errorText = `${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();
  return (
    error?.code === "PGRST204" ||
    errorText.includes(columnName.toLowerCase()) ||
    errorText.includes("column")
  );
}

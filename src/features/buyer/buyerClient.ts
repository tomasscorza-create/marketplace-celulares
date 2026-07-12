import type {
  BuyerAccountSummary,
  BuyerFavoriteRecord,
  BuyerPreferenceRecord,
  BuyerProfileInput,
  BuyerPersonalizationSignals,
  BuyerShippingAddressDetails,
} from "../../types/buyer";
import type {
  DeliveryType,
  OrderEventRecord,
  OrderItemRecord,
  OrderRecord,
} from "../../types/commerce";
import type { UserProfile } from "../../types/auth";
import type { PaginationParams } from "../../types/pagination";

import { getFulfillmentSummary } from "../orders/fulfillment";
import { getSupabaseClient } from "../../lib/supabase/client";
import { getBuyerActiveCart } from "./cartClient";

const DEFAULT_DELIVERY_TYPE: DeliveryType = "arrange_with_seller";
const productSelection =
  "id, artisan_id, batch_id, batch_code, batch_position, created_via_batch, category_id, title, description, price, image_url, image_urls, product_media, product_attributes, is_active, availability_mode, stock_quantity, lead_time_days, made_to_order_options, created_at, categories(name)";
const PERSONALIZATION_SIGNALS_TTL_MS = 60 * 1000;
const buyerPersonalizationSignalsCache = new Map<
  string,
  { cachedAt: number; signals: BuyerPersonalizationSignals }
>();

type BuyerOrderHistoryResponse = {
  count: number;
  data: OrderRecord[];
  error: { message?: string } | Error | null;
};

function cleanNullableText(value: string) {
  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function normalizeBuyerPhone(value: string) {
  const normalizedValue = value
    .replace(/[^\d+\s()-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 32);

  return normalizedValue;
}

function sanitizeBuyerProfileInput(input: BuyerProfileInput) {
  const sanitizedAddressDetails: BuyerShippingAddressDetails | null = input.shipping_address_details
    ? {
        apartment: input.shipping_address_details.apartment.trim().replace(/\s+/g, " ").slice(0, 40),
        area: input.shipping_address_details.area.trim().replace(/\s+/g, " ").slice(0, 80),
        cityId: input.shipping_address_details.cityId?.trim().slice(0, 32) || undefined,
        cityName:
          input.shipping_address_details.cityName?.trim().replace(/\s+/g, " ").slice(0, 80) || undefined,
        city: input.shipping_address_details.city.trim().replace(/\s+/g, " ").slice(0, 80),
        floor: input.shipping_address_details.floor.replace(/\D/g, "").slice(0, 8),
        latitude:
          typeof input.shipping_address_details.latitude === "number"
            ? Number(input.shipping_address_details.latitude.toFixed(6))
            : null,
        longitude:
          typeof input.shipping_address_details.longitude === "number"
            ? Number(input.shipping_address_details.longitude.toFixed(6))
            : null,
        number: input.shipping_address_details.number.replace(/\D/g, "").slice(0, 16),
        provinceId: input.shipping_address_details.provinceId?.trim().slice(0, 8) || undefined,
        provinceName:
          input.shipping_address_details.provinceName?.trim().replace(/\s+/g, " ").slice(0, 80) ||
          undefined,
        reference: input.shipping_address_details.reference.trim().replace(/\s+/g, " ").slice(0, 120),
        street: input.shipping_address_details.street.trim().replace(/\s+/g, " ").slice(0, 120),
      }
    : null;

  return {
    delivery_notes: input.delivery_notes.trim().replace(/\s+/g, " ").slice(0, 220),
    full_name: input.full_name.trim().replace(/\s+/g, " ").slice(0, 80),
    phone: normalizeBuyerPhone(input.phone),
    preferred_delivery_type: input.preferred_delivery_type || DEFAULT_DELIVERY_TYPE,
    profile_description: input.profile_description.trim().replace(/\s+/g, " ").slice(0, 220),
    profile_image_url: input.profile_image_url.trim().slice(0, 600),
    shipping_address: input.shipping_address.trim().replace(/\s+/g, " ").slice(0, 220),
    shipping_address_details: sanitizedAddressDetails,
  } satisfies BuyerProfileInput;
}

function isMissingResourceError(
  error: {
    code?: string;
    details?: string | null;
    message?: string | null;
  } | null,
  resourceName: string,
) {
  const errorText = `${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();

  return (
    error?.code === "PGRST204" ||
    error?.code === "42P01" ||
    errorText.includes(resourceName.toLowerCase()) ||
    errorText.includes("could not find the") ||
    errorText.includes("does not exist") ||
    errorText.includes("column")
  );
}

function mapOrderItems(items: Partial<OrderItemRecord>[] | null | undefined): OrderItemRecord[] {
  return (items ?? []).map((item) => ({
    artisan_id: item.artisan_id ?? "",
    artisan_name: item.artisan_name ?? null,
    availability_mode: item.availability_mode ?? "stock",
    category_name: item.category_name ?? null,
    created_at: item.created_at ?? "",
    fulfillment_status: item.fulfillment_status ?? "pending",
    id: item.id ?? "",
    lead_time_days: item.lead_time_days ?? null,
    order_id: item.order_id ?? "",
    product_description: item.product_description ?? null,
    product_id: item.product_id ?? "",
    product_image_url: item.product_image_url ?? null,
    product_title: item.product_title ?? "Producto",
    quantity: Number(item.quantity ?? 0),
    selected_options: item.selected_options ?? [],
    selected_options_summary: item.selected_options_summary ?? null,
    stock_applied_at: item.stock_applied_at ?? null,
    store_name: item.store_name ?? null,
    subtotal: Number(item.subtotal ?? 0),
    unit_price: Number(item.unit_price ?? 0),
  }));
}

function mapOrders(orders: Partial<OrderRecord>[] | null | undefined): OrderRecord[] {
  return (orders ?? []).map((order) => ({
    buyer_email: order.buyer_email ?? null,
    buyer_id: order.buyer_id ?? null,
    buyer_name: order.buyer_name ?? "",
    buyer_phone: order.buyer_phone ?? "",
    cancelled_at: order.cancelled_at ?? null,
    checkout_provider: order.checkout_provider ?? null,
    created_at: order.created_at ?? "",
    currency: order.currency ?? "ARS",
    delivery_address: order.delivery_address ?? null,
    delivery_notes: order.delivery_notes ?? null,
    delivery_type: order.delivery_type ?? DEFAULT_DELIVERY_TYPE,
    external_reference: order.external_reference ?? null,
    fees_amount: Number(order.fees_amount ?? 0),
    fulfillment_status: order.fulfillment_status ?? "pending",
    id: order.id ?? "",
    items: mapOrderItems(order.items),
    mercadopago_merchant_order_id: order.mercadopago_merchant_order_id ?? null,
    mercadopago_payment_id: order.mercadopago_payment_id ?? null,
    mercadopago_preference_id: order.mercadopago_preference_id ?? null,
    paid_at: order.paid_at ?? null,
    payment_status: order.payment_status ?? "pending",
    shipping_amount: Number(order.shipping_amount ?? 0),
    status: order.status ?? "pending",
    subtotal_amount: Number(order.subtotal_amount ?? order.total_amount ?? 0),
    total_amount: Number(order.total_amount ?? 0),
    updated_at: order.updated_at ?? order.created_at ?? "",
  }));
}

function buildOrderSummary(orders: OrderRecord[]): BuyerAccountSummary {
  const paidOrders = orders.filter((order) =>
    ["paid", "confirmed"].includes(order.status) || order.payment_status === "approved",
  );
  const openOrders = orders.filter((order) => {
    if (["cancelled", "failed", "refunded"].includes(order.status)) {
      return false;
    }

    if (order.payment_status === "approved") {
      return getFulfillmentSummary(order.items, order.fulfillment_status).openItems > 0;
    }

    return true;
  });
  const pendingPaymentOrders = orders.filter(
    (order) =>
      order.payment_status === "pending" ||
      order.payment_status === "in_process" ||
      order.status === "pending",
  );
  const preparingOrders = orders.filter(
    (order) => getFulfillmentSummary(order.items, order.fulfillment_status).status === "preparing",
  );
  const readyOrders = orders.filter(
    (order) => getFulfillmentSummary(order.items, order.fulfillment_status).status === "ready",
  );

  return {
    active_cart_items: 0,
    favorites_count: 0,
    last_order_at: orders[0]?.created_at ?? null,
    open_orders_count: openOrders.length,
    orders_count: orders.length,
    paid_orders_count: paidOrders.length,
    pending_payment_count: pendingPaymentOrders.length,
    preparing_orders_count: preparingOrders.length,
    ready_orders_count: readyOrders.length,
    total_spent: paidOrders.reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0),
  };
}

function sanitizeSignalPhrase(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
}

function dedupeSignals(values: Array<string | null | undefined>, limit: number) {
  return Array.from(
    new Set(
      values
        .map((value) => sanitizeSignalPhrase(value))
        .filter(Boolean),
    ),
  ).slice(0, limit);
}

function buildBuyerPersonalizationSignals(
  favorites: BuyerFavoriteRecord[],
  orders: OrderRecord[],
): BuyerPersonalizationSignals {
  const favoriteProducts = favorites
    .map((favorite) => favorite.product)
    .filter((product): product is NonNullable<BuyerFavoriteRecord["product"]> => Boolean(product));
  const orderItems = orders.flatMap((order) => order.items ?? []);

  return {
    recentArtisanIds: dedupeSignals(
      [
        ...favoriteProducts.map((product) => product.artisan_id),
        ...orderItems.map((item) => item.artisan_id),
      ],
      6,
    ),
    recentCategoryIds: dedupeSignals(
      favoriteProducts.map((product) => product.category_id),
      6,
    ),
    recentProductIds: dedupeSignals(
      [
        ...favorites.map((favorite) => favorite.product_id),
        ...orderItems.map((item) => item.product_id),
      ],
      12,
    ),
    recentSearches: dedupeSignals(
      [
        ...favoriteProducts.map((product) => product.categories?.name ?? null),
        ...favoriteProducts.flatMap((product) =>
          (product.product_attributes ?? []).map((attribute) => attribute.key),
        ),
        ...favoriteProducts.flatMap((product) =>
          (product.product_attributes ?? []).map((attribute) => attribute.value),
        ),
        ...favoriteProducts.map((product) => product.title),
        ...orderItems.map((item) => item.category_name),
        ...orderItems.map((item) => item.product_title),
        ...orderItems.map((item) => item.store_name),
      ],
      6,
    ),
  };
}

export function clearBuyerPersonalizationSignalsCache(buyerId?: string) {
  if (buyerId) {
    buyerPersonalizationSignalsCache.delete(buyerId);
    return;
  }

  buyerPersonalizationSignalsCache.clear();
}

export async function getBuyerPreferences(buyerId: string) {
  const client = getSupabaseClient();
  const richResponse = await client
    .from("buyer_preferences")
    .select(
      "buyer_id, phone, preferred_delivery_type, delivery_notes, shipping_address, shipping_address_details, shipping_latitude, shipping_longitude, created_at, updated_at",
    )
    .eq("buyer_id", buyerId)
    .maybeSingle<BuyerPreferenceRecord>();

  if (!richResponse.error) {
    return richResponse;
  }

  if (
    isMissingResourceError(richResponse.error, "shipping_address_details") ||
    isMissingResourceError(richResponse.error, "shipping_address") ||
    isMissingResourceError(richResponse.error, "shipping_latitude") ||
    isMissingResourceError(richResponse.error, "shipping_longitude")
  ) {
    const fallbackSelectParts = [
      "buyer_id",
      "phone",
      "preferred_delivery_type",
      "delivery_notes",
      "created_at",
      "updated_at",
    ];

    if (!isMissingResourceError(richResponse.error, "shipping_address")) {
      fallbackSelectParts.splice(4, 0, "shipping_address");
    }

    if (!isMissingResourceError(richResponse.error, "shipping_address_details")) {
      fallbackSelectParts.splice(5, 0, "shipping_address_details");
    }

    const fallbackResponse = await client
      .from("buyer_preferences")
      .select(fallbackSelectParts.join(", "))
      .eq("buyer_id", buyerId)
      .maybeSingle<
        Omit<BuyerPreferenceRecord, "shipping_latitude" | "shipping_longitude">
      >();

    if (fallbackResponse.error && isMissingResourceError(fallbackResponse.error, "buyer_preferences")) {
      return {
        data: null as BuyerPreferenceRecord | null,
        error: null,
      };
    }

    return {
      data: fallbackResponse.data
        ? {
            ...fallbackResponse.data,
            shipping_address:
              "shipping_address" in fallbackResponse.data ? fallbackResponse.data.shipping_address : null,
            shipping_address_details:
              "shipping_address_details" in fallbackResponse.data
                ? fallbackResponse.data.shipping_address_details
                : null,
            shipping_latitude: null,
            shipping_longitude: null,
          }
        : null,
      error: fallbackResponse.error,
    };
  }

  if (richResponse.error && isMissingResourceError(richResponse.error, "buyer_preferences")) {
    return {
      data: null as BuyerPreferenceRecord | null,
      error: null,
    };
  }

  return richResponse;
}

export async function updateBuyerProfile(profileId: string, input: BuyerProfileInput) {
  const client = getSupabaseClient();
  const sanitizedInput = sanitizeBuyerProfileInput(input);

  const enrichedProfileResponse = await client
    .from("profiles")
    .update({
      buyer_profile_bio: cleanNullableText(sanitizedInput.profile_description),
      full_name: sanitizedInput.full_name,
      profile_image_url: cleanNullableText(sanitizedInput.profile_image_url),
      store_description: cleanNullableText(sanitizedInput.profile_description),
    })
    .eq("id", profileId)
    .select(
      "id, full_name, email, role, store_name, store_description, buyer_profile_bio, profile_image_url, storefront_theme_color, created_at",
    )
    .single<UserProfile>();

  const profileResponse =
    enrichedProfileResponse.error &&
    isMissingResourceError(enrichedProfileResponse.error, "buyer_profile_bio")
      ? await client
          .from("profiles")
          .update({
            full_name: sanitizedInput.full_name,
            profile_image_url: cleanNullableText(sanitizedInput.profile_image_url),
            store_description: cleanNullableText(sanitizedInput.profile_description),
          })
          .eq("id", profileId)
          .select(
            "id, full_name, email, role, store_name, store_description, profile_image_url, storefront_theme_color, created_at",
          )
          .single<UserProfile>()
      : enrichedProfileResponse;

  if (profileResponse.error || !profileResponse.data) {
    return {
      data: null,
      error: profileResponse.error,
    };
  }

  const preferencesResponse = await client.from("buyer_preferences").upsert(
    {
      buyer_id: profileId,
      delivery_notes: cleanNullableText(sanitizedInput.delivery_notes),
      phone: cleanNullableText(sanitizedInput.phone),
      preferred_delivery_type: sanitizedInput.preferred_delivery_type,
      shipping_address: cleanNullableText(sanitizedInput.shipping_address),
      shipping_address_details: sanitizedInput.shipping_address_details,
      shipping_latitude: sanitizedInput.shipping_address_details?.latitude ?? null,
      shipping_longitude: sanitizedInput.shipping_address_details?.longitude ?? null,
    },
    {
      onConflict: "buyer_id",
    },
  );

  if (
    preferencesResponse.error &&
    (isMissingResourceError(preferencesResponse.error, "shipping_address_details") ||
      isMissingResourceError(preferencesResponse.error, "shipping_address") ||
      isMissingResourceError(preferencesResponse.error, "shipping_latitude") ||
      isMissingResourceError(preferencesResponse.error, "shipping_longitude"))
  ) {
    const fallbackPreferencesPayload = {
      buyer_id: profileId,
      delivery_notes: cleanNullableText(sanitizedInput.delivery_notes),
      phone: cleanNullableText(sanitizedInput.phone),
      preferred_delivery_type: sanitizedInput.preferred_delivery_type,
      ...(isMissingResourceError(preferencesResponse.error, "shipping_address")
        ? {}
        : {
            shipping_address: cleanNullableText(sanitizedInput.shipping_address),
          }),
      ...(isMissingResourceError(preferencesResponse.error, "shipping_address_details")
        ? {}
        : {
            shipping_address_details: sanitizedInput.shipping_address_details,
          }),
    };
    const fallbackPreferencesResponse = await client.from("buyer_preferences").upsert(
      fallbackPreferencesPayload,
      {
        onConflict: "buyer_id",
      },
    );

    return {
      data: profileResponse.data,
      error:
        fallbackPreferencesResponse.error &&
        !isMissingResourceError(fallbackPreferencesResponse.error, "buyer_preferences")
          ? fallbackPreferencesResponse.error
          : null,
    };
  }

  if (
    preferencesResponse.error &&
    !isMissingResourceError(preferencesResponse.error, "buyer_preferences")
  ) {
    return {
      data: profileResponse.data,
      error: preferencesResponse.error,
    };
  }

  return {
    data: profileResponse.data,
    error: null,
  };
}

export async function getBuyerOrderHistory(
  buyerId: string,
  params?: Partial<PaginationParams>,
): Promise<BuyerOrderHistoryResponse> {
  const client = getSupabaseClient();
  const page = Math.max(1, Math.floor(params?.page ?? 1));
  const limit = Math.min(Math.max(1, Math.floor(params?.limit ?? 20)), 100);
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const richSelection = [
    "id",
    "buyer_id",
    "buyer_name",
    "buyer_email",
    "buyer_phone",
    "subtotal_amount",
    "shipping_amount",
    "fees_amount",
    "total_amount",
    "currency",
    "status",
    "payment_status",
    "fulfillment_status",
    "delivery_type",
    "delivery_address",
    "delivery_notes",
    "checkout_provider",
    "external_reference",
    "mercadopago_preference_id",
    "mercadopago_payment_id",
    "mercadopago_merchant_order_id",
    "paid_at",
    "cancelled_at",
    "created_at",
    "updated_at",
    "items:order_items(id, order_id, product_id, artisan_id, lead_time_days, quantity, selected_options, selected_options_summary, stock_applied_at, unit_price, subtotal, product_title, product_description, product_image_url, category_name, artisan_name, store_name, availability_mode, fulfillment_status, created_at)",
  ].join(", ");

  const fallbackSelection = [
    "id",
    "buyer_id",
    "buyer_name",
    "buyer_phone",
    "total_amount",
    "status",
    "created_at",
    "items:order_items(id, order_id, product_id, artisan_id, quantity, unit_price, subtotal)",
  ].join(", ");

  let richQuery = client
    .from("orders")
    .select(richSelection, { count: "exact" })
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });

  if (params?.limit) {
    richQuery = richQuery.range(from, to);
  }

  const richResponse = await richQuery;

  if (!richResponse.error) {
    const orders = mapOrders((richResponse.data as Partial<OrderRecord>[] | null) ?? []);

    return {
      count: richResponse.count ?? orders.length,
      data: orders,
      error: null,
    };
  }

  let fallbackQuery = client
    .from("orders")
    .select(fallbackSelection, { count: "exact" })
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });

  if (params?.limit) {
    fallbackQuery = fallbackQuery.range(from, to);
  }

  const fallbackResponse = await fallbackQuery;

  if (fallbackResponse.error) {
    return {
      count: 0,
      data: [] as OrderRecord[],
      error: fallbackResponse.error,
    };
  }

  return {
    count: fallbackResponse.count ?? fallbackResponse.data?.length ?? 0,
    data: mapOrders((fallbackResponse.data as Partial<OrderRecord>[] | null) ?? []),
    error: null,
  };
}

export async function getBuyerOrderById(buyerId: string, orderId: string) {
  const client = getSupabaseClient();
  const selection = [
    "id",
    "buyer_id",
    "buyer_name",
    "buyer_email",
    "buyer_phone",
    "subtotal_amount",
    "shipping_amount",
    "fees_amount",
    "total_amount",
    "currency",
    "status",
    "payment_status",
    "fulfillment_status",
    "delivery_type",
    "delivery_address",
    "delivery_notes",
    "checkout_provider",
    "external_reference",
    "mercadopago_preference_id",
    "mercadopago_payment_id",
    "mercadopago_merchant_order_id",
    "paid_at",
    "cancelled_at",
    "created_at",
    "updated_at",
    "items:order_items(id, order_id, product_id, artisan_id, lead_time_days, quantity, selected_options, selected_options_summary, stock_applied_at, unit_price, subtotal, product_title, product_description, product_image_url, category_name, artisan_name, store_name, availability_mode, fulfillment_status, created_at)",
  ].join(", ");

  const response = await client
    .from("orders")
    .select(selection)
    .eq("id", orderId)
    .eq("buyer_id", buyerId)
    .single<Partial<OrderRecord>>();

  return {
    data: response.data ? mapOrders([response.data])[0] : null,
    error: response.error,
  };
}

export async function getBuyerOrderEvents(buyerId: string, orderId: string) {
  const client = getSupabaseClient();
  const orderResponse = await client
    .from("orders")
    .select("id")
    .eq("id", orderId)
    .eq("buyer_id", buyerId)
    .maybeSingle<{ id: string }>();

  if (orderResponse.error || !orderResponse.data) {
    return {
      data: [] as OrderEventRecord[],
      error: orderResponse.error,
    };
  }

  return client
    .from("order_events")
    .select("id, order_id, order_item_id, event_type, actor_id, actor_role, message, metadata, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true })
    .returns<OrderEventRecord[]>();
}

export async function getBuyerFavorites(buyerId: string) {
  const client = getSupabaseClient();
  const response = await client
    .from("buyer_favorites")
    .select(`id, buyer_id, product_id, created_at, product:products(${productSelection})`)
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false })
    .returns<BuyerFavoriteRecord[]>();

  if (response.error && isMissingResourceError(response.error, "buyer_favorites")) {
    return {
      data: [] as BuyerFavoriteRecord[],
      error: null,
    };
  }

  return {
    data: response.data ?? [],
    error: response.error,
  };
}

export async function toggleBuyerFavorite(buyerId: string, productId: string) {
  const client = getSupabaseClient();
  const existingResponse = await client
    .from("buyer_favorites")
    .select("id")
    .eq("buyer_id", buyerId)
    .eq("product_id", productId)
    .maybeSingle<{ id: string }>();

  if (existingResponse.error && isMissingResourceError(existingResponse.error, "buyer_favorites")) {
    return {
      data: null,
      error: new Error("Todavía falta activar favoritos en la base de datos."),
    };
  }

  if (existingResponse.error) {
    return {
      data: null,
      error: new Error(existingResponse.error.message),
    };
  }

  if (existingResponse.data?.id) {
    const deleteResponse = await client
      .from("buyer_favorites")
      .delete()
      .eq("id", existingResponse.data.id);

    return {
      data: deleteResponse.error ? null : { isFavorite: false },
      error: deleteResponse.error ? new Error(deleteResponse.error.message) : null,
    };
  }

  const insertResponse = await client.from("buyer_favorites").insert({
    buyer_id: buyerId,
    product_id: productId,
  });

  return {
    data: insertResponse.error ? null : { isFavorite: true },
    error: insertResponse.error ? new Error(insertResponse.error.message) : null,
  };
}

export async function getBuyerAccountSummary(buyerId: string) {
  const [ordersResponse, favoritesResponse, preferencesResponse, cartResponse] =
    await Promise.all([
      getBuyerOrderHistory(buyerId),
      getBuyerFavorites(buyerId),
      getBuyerPreferences(buyerId),
      getBuyerActiveCart(buyerId),
    ]);

  const summary = buildOrderSummary(ordersResponse.data ?? []);
  summary.favorites_count = favoritesResponse.data?.length ?? 0;
  summary.active_cart_items =
    cartResponse.data?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return {
    data: {
      ...summary,
      last_order_at:
        summary.last_order_at ?? preferencesResponse.data?.updated_at ?? null,
    },
    error:
      ordersResponse.error ??
      favoritesResponse.error ??
      preferencesResponse.error ??
      cartResponse.error ??
      null,
  };
}

export async function getBuyerPersonalizationSignals(buyerId: string) {
  const cachedSignals = buyerPersonalizationSignalsCache.get(buyerId);

  if (cachedSignals && Date.now() - cachedSignals.cachedAt < PERSONALIZATION_SIGNALS_TTL_MS) {
    return cachedSignals.signals;
  }

  const [favoritesResponse, ordersResponse] = await Promise.all([
    getBuyerFavorites(buyerId),
    getBuyerOrderHistory(buyerId),
  ]);

  const nextSignals = buildBuyerPersonalizationSignals(
    favoritesResponse.data ?? [],
    ordersResponse.data ?? [],
  );

  buyerPersonalizationSignalsCache.set(buyerId, {
    cachedAt: Date.now(),
    signals: nextSignals,
  });

  return nextSignals;
}

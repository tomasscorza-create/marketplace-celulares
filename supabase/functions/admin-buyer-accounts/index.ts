import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders } from "../_shared/cors.ts";

type ProfileRow = {
  created_at: string;
  email: string;
  full_name: string;
  id: string;
  profile_image_url: string | null;
  role: "admin" | "artisan" | "buyer";
};

type BuyerProfileRow = ProfileRow & {
  role: "buyer";
};

type BuyerPreferenceRow = {
  buyer_id: string;
  phone: string | null;
  preferred_delivery_type: string | null;
  shipping_address: string | null;
  updated_at: string;
};

type ProductAttribute = {
  key: string;
  value: string;
};

type FavoriteProductRow = {
  categories?: {
    name: string;
  } | null;
  product_attributes?: ProductAttribute[] | null;
  title: string | null;
};

type BuyerFavoriteRow = {
  buyer_id: string;
  created_at: string;
  product_id: string;
  product: FavoriteProductRow | null;
};

type OrderItemRow = {
  category_name: string | null;
  product_id: string;
  product_title: string | null;
  store_name: string | null;
};

type OrderRow = {
  buyer_id: string | null;
  created_at: string;
  id: string;
  items: OrderItemRow[] | null;
  payment_status: string;
  status: string;
  total_amount: number | string;
  updated_at: string;
};

type AdminBuyerAccountSummary = {
  created_at: string;
  email: string;
  favoritesCount: number;
  full_name: string;
  hasPhone: boolean;
  hasShippingAddress: boolean;
  id: string;
  interestTerms: string[];
  lastActivityAt: string | null;
  lastOrderAt: string | null;
  openOrdersCount: number;
  ordersCount: number;
  paidOrdersCount: number;
  preferredDeliveryType: string | null;
  profile_image_url: string | null;
  totalSpent: number;
};

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
    status,
  });
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

async function requireAdminProfile(
  supabaseUrl: string,
  supabaseServiceRoleKey: string,
  authorizationHeader: string | null,
) {
  if (!authorizationHeader) {
    return {
      adminClient: null,
      errorResponse: jsonResponse({ error: "Missing authorization header." }, 401),
    };
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
  const accessToken = authorizationHeader.replace(/^Bearer\s+/i, "").trim();

  if (!accessToken) {
    return {
      adminClient: null,
      errorResponse: jsonResponse({ error: "Missing access token." }, 401),
    };
  }

  const {
    data: { user },
    error: authError,
  } = await adminClient.auth.getUser(accessToken);

  if (authError || !user) {
    return {
      adminClient: null,
      errorResponse: jsonResponse({ error: "Unauthorized." }, 401),
    };
  }

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single<{ id: string; role: string }>();

  if (profileError || !profile || profile.role !== "admin") {
    return {
      adminClient: null,
      errorResponse: jsonResponse(
        { error: "Solo cuentas admin pueden revisar cuentas compradoras." },
        403,
      ),
    };
  }

  return {
    adminClient,
    errorResponse: null,
  };
}

function buildInterestTerms(favorites: BuyerFavoriteRow[], orders: OrderRow[]) {
  const favoriteProducts = favorites
    .map((favorite) => favorite.product)
    .filter((product): product is FavoriteProductRow => Boolean(product));
  const orderItems = orders.flatMap((order) => order.items ?? []);

  return dedupeSignals(
    [
      ...favoriteProducts.map((product) => product.categories?.name ?? null),
      ...favoriteProducts.flatMap((product) =>
        (product.product_attributes ?? []).flatMap((attribute) => [attribute.key, attribute.value]),
      ),
      ...favoriteProducts.map((product) => product.title),
      ...orderItems.map((item) => item.category_name),
      ...orderItems.map((item) => item.product_title),
      ...orderItems.map((item) => item.store_name),
    ],
    6,
  );
}

function getLastTimestamp(values: Array<string | null | undefined>) {
  const validValues = values.filter((value): value is string => Boolean(value));

  if (validValues.length === 0) {
    return null;
  }

  return validValues.sort((left, right) => +new Date(right) - +new Date(left))[0];
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const supabaseServiceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const access = await requireAdminProfile(
      supabaseUrl,
      supabaseServiceRoleKey,
      request.headers.get("Authorization"),
    );

    if (access.errorResponse || !access.adminClient) {
      return access.errorResponse;
    }

    const adminClient = access.adminClient;
    const [buyersResponse, preferencesResponse, favoritesResponse, ordersResponse] =
      await Promise.all([
        adminClient
          .from("profiles")
          .select("id, full_name, email, role, profile_image_url, created_at")
          .eq("role", "buyer")
          .returns<BuyerProfileRow[]>(),
        adminClient
          .from("buyer_preferences")
          .select("buyer_id, phone, preferred_delivery_type, shipping_address, updated_at")
          .returns<BuyerPreferenceRow[]>(),
        adminClient
          .from("buyer_favorites")
          .select(
            "buyer_id, product_id, created_at, product:products(title, product_attributes, categories(name))",
          )
          .returns<BuyerFavoriteRow[]>(),
        adminClient
          .from("orders")
          .select(
            "id, buyer_id, status, payment_status, total_amount, created_at, updated_at, items:order_items(product_id, product_title, category_name, store_name)",
          )
          .not("buyer_id", "is", null)
          .returns<OrderRow[]>(),
      ]);

    const firstError =
      buyersResponse.error ??
      preferencesResponse.error ??
      favoritesResponse.error ??
      ordersResponse.error;

    if (firstError) {
      return jsonResponse(
        { error: firstError.message ?? "No pudimos cargar las cuentas compradoras." },
        500,
      );
    }

    const preferencesByBuyer = new Map(
      (preferencesResponse.data ?? []).map((preference) => [preference.buyer_id, preference]),
    );
    const favoritesByBuyer = new Map<string, BuyerFavoriteRow[]>();
    const ordersByBuyer = new Map<string, OrderRow[]>();

    for (const favorite of favoritesResponse.data ?? []) {
      const current = favoritesByBuyer.get(favorite.buyer_id) ?? [];
      current.push(favorite);
      favoritesByBuyer.set(favorite.buyer_id, current);
    }

    for (const order of ordersResponse.data ?? []) {
      if (!order.buyer_id) {
        continue;
      }

      const current = ordersByBuyer.get(order.buyer_id) ?? [];
      current.push(order);
      ordersByBuyer.set(order.buyer_id, current);
    }

    const buyers: AdminBuyerAccountSummary[] = (buyersResponse.data ?? []).map((buyer) => {
      const preferences = preferencesByBuyer.get(buyer.id) ?? null;
      const favorites = favoritesByBuyer.get(buyer.id) ?? [];
      const orders = ordersByBuyer.get(buyer.id) ?? [];
      const paidOrders = orders.filter(
        (order) =>
          order.payment_status === "approved" ||
          order.status === "paid" ||
          order.status === "confirmed",
      );
      const openOrders = orders.filter(
        (order) => !["cancelled", "failed", "refunded"].includes(order.status),
      );

      return {
        created_at: buyer.created_at,
        email: buyer.email,
        favoritesCount: favorites.length,
        full_name: buyer.full_name,
        hasPhone: Boolean(preferences?.phone?.trim()),
        hasShippingAddress: Boolean(preferences?.shipping_address?.trim()),
        id: buyer.id,
        interestTerms: buildInterestTerms(favorites, orders),
        lastActivityAt: getLastTimestamp([
          ...favorites.map((favorite) => favorite.created_at),
          ...orders.map((order) => order.updated_at ?? order.created_at),
          preferences?.updated_at ?? null,
          buyer.created_at,
        ]),
        lastOrderAt: getLastTimestamp(orders.map((order) => order.created_at)),
        openOrdersCount: openOrders.length,
        ordersCount: orders.length,
        paidOrdersCount: paidOrders.length,
        preferredDeliveryType: preferences?.preferred_delivery_type ?? null,
        profile_image_url: buyer.profile_image_url,
        totalSpent: Number(
          paidOrders.reduce(
            (accumulator, order) => accumulator + Number(order.total_amount ?? 0),
            0,
          ).toFixed(2),
        ),
      };
    });

    buyers.sort(
      (left, right) =>
        +new Date(right.lastActivityAt ?? right.created_at) -
        +new Date(left.lastActivityAt ?? left.created_at),
    );

    return jsonResponse({ buyers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected admin buyer accounts error.";
    return jsonResponse({ error: message }, 500);
  }
});

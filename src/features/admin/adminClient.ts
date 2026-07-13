import type {
  AdminProductControlBoostLevel,
  AdminDashboardSnapshot,
  AdminArtisanMovementsSnapshot,
  AdminArtisanDeleteResult,
  AdminArtisanProfileControlsInput,
  AdminArtisanProfile,
  AdminBuyerProfile,
  AdminArtisanProfileInput,
  AdminProductControlProduct,
  AdminProductControlRecord,
  AdminProductControlSnapshot,
  AdminProductControlTag,
  AdminDashboardProduct,
  AdminArtisanProfileUpdateInput,
  AdminCategory,
  AdminCategoryInput,
  AdminBillingPeriod,
  AdminBillingSnapshot,
  AdminSalesOrder,
  AdminSalesStatusFilter,
} from "../../types/admin";
import type { FulfillmentStatus } from "../../types/commerce";

import { getSupabaseClient } from "../../lib/supabase/client";
import { buildAdminBillingSnapshot } from "./adminBilling";

import {
  ADMIN_BILLING_ITEMS_CHUNK_SIZE,
  ADMIN_BILLING_ORDERS_LIMIT,
  ADMIN_BILLING_PAYMENT_STATUSES,
  ADMIN_DASHBOARD_PRODUCTS_LIMIT,
  ADMIN_DASHBOARD_SALES_LIMIT,
  ADMIN_PRODUCT_CONTROL_SALES_LIMIT,
  type AdminArtisanMovementRow,
  type AdminBillingItemRow,
  type AdminBillingOrderRow,
  type AdminDashboardSaleRow,
  type AdminProductControlSaleRow,
  type AdminSalesItemRow,
  type AdminSalesQueryParams,
  type ApprovedOrderRow,
  type OptionalPaginationParams,
  adminArtisanProfileSelection,
  baseAdminArtisanProfileSelection,
  buildAdminBuyerAccountsFallback,
  chunkItems,
  cleanCategoryInput,
  getAdminBillingPeriodStart,
  getPaymentStatusesForAdminSales,
  getSearchPattern,
  isMissingAdminProfileControlColumn,
  normalizeAdminBillingItem,
  normalizeAdminBillingOrder,
  normalizeAdminProductControlError,
  normalizePaginationParams,
  normalizeProductControlRecord,
  shouldDeleteProductControlRecord,
  toSafeNumber,
} from "./adminClientSupport";

export async function getAdminCategories() {
  const client = getSupabaseClient();

  return client
    .from("categories")
    .select("id, name, slug, is_active, created_at")
    .order("created_at", { ascending: false })
    .returns<AdminCategory[]>();
}

export async function createAdminCategory(input: AdminCategoryInput) {
  const client = getSupabaseClient();

  return client
    .from("categories")
    .insert(cleanCategoryInput(input))
    .select("id, name, slug, is_active, created_at")
    .single<AdminCategory>();
}

export async function updateAdminCategory(
  categoryId: string,
  input: AdminCategoryInput,
) {
  const client = getSupabaseClient();

  return client
    .from("categories")
    .update(cleanCategoryInput(input))
    .eq("id", categoryId)
    .select("id, name, slug, is_active, created_at")
    .single<AdminCategory>();
}

type AdminArtisanFunctionPayload = {
  artisanId?: string;
  payload?: AdminArtisanProfileInput | AdminArtisanProfileUpdateInput;
};

async function invokeAdminArtisanFunction<TData>(
  action: "create" | "update" | "delete",
  body: AdminArtisanFunctionPayload = {},
) {
  const client = getSupabaseClient();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session?.access_token) {
    return {
      data: null,
      error: new Error("Tu sesión admin no está activa. Volvé a ingresar e intentá de nuevo."),
    };
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      data: null,
      error: new Error("Supabase no está configurado correctamente en este entorno."),
    };
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/admin-manage-artisans`, {
      body: JSON.stringify({
        action,
        ...body,
      }),
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
      },
      method: "POST",
    });

    const responseBody = (await response.json().catch(() => null)) as
      | TData
      | { error?: string }
      | null;

    if (!response.ok) {
      return {
        data: null,
        error: new Error(
          typeof responseBody === "object" &&
            responseBody !== null &&
            "error" in responseBody &&
            typeof responseBody.error === "string"
            ? responseBody.error
            : "No pudimos completar la gestión del perfil vendedor.",
        ),
      };
    }

    return {
      data: (responseBody as TData | null) ?? null,
      error: null,
    };
  } catch {
    return {
      data: null,
      error: new Error(
        "No pudimos conectar con la gestión admin en este momento. Intentá de nuevo en unos segundos.",
      ),
    };
  }
}

function buildAdminArtisanProfilesQuery(
  selection: string,
  params?: OptionalPaginationParams,
) {
  const client = getSupabaseClient();
  const { from, search, to } = normalizePaginationParams(params);

  let query = client
    .from("profiles")
    .select(selection, { count: "exact" })
    .eq("role", "artisan")
    .order("created_at", { ascending: false });

  if (search) {
    const pattern = getSearchPattern(search);
    query = query.or(
      `full_name.ilike.${pattern},email.ilike.${pattern},store_name.ilike.${pattern}`,
    );
  }

  if (params?.limit) {
    query = query.range(from, to);
  }

  return query.returns<AdminArtisanProfile[]>();
}

export async function getAdminArtisanProfiles(params?: OptionalPaginationParams) {
  const response = await buildAdminArtisanProfilesQuery(adminArtisanProfileSelection, params);

  if (isMissingAdminProfileControlColumn(response.error)) {
    return buildAdminArtisanProfilesQuery(baseAdminArtisanProfileSelection, params);
  }

  return response;
}

function paginateClientRows<T>(rows: T[], params?: OptionalPaginationParams) {
  if (!params?.limit) {
    return rows;
  }

  const { from, to } = normalizePaginationParams(params);

  return rows.slice(from, to + 1);
}

async function getApprovedOrderCreatedAtMap(limit: number) {
  const client = getSupabaseClient();
  const response = await client
    .from("orders")
    .select("id, created_at")
    .eq("payment_status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<ApprovedOrderRow[]>();

  return {
    data: response.data ? new Map(response.data.map((order) => [order.id, order.created_at])) : null,
    error: response.error,
  };
}

export async function getAdminBuyerProfiles(params?: OptionalPaginationParams) {
  const client = getSupabaseClient();
  const { from, search, to } = normalizePaginationParams(params);

  let query = client
    .from("profiles")
    .select("id, full_name, email, role, profile_image_url, created_at", { count: "exact" })
    .eq("role", "buyer")
    .order("created_at", { ascending: false });

  if (search) {
    const pattern = getSearchPattern(search);
    query = query.or(`full_name.ilike.${pattern},email.ilike.${pattern}`);
  }

  if (params?.limit) {
    query = query.range(from, to);
  }

  return query.returns<AdminBuyerProfile[]>();
}

export async function getAdminBuyerAccountsSnapshot(params?: OptionalPaginationParams) {
  const buyersResponse = await getAdminBuyerProfiles(params);

  if (buyersResponse.error) {
    return {
      data: null,
      error: buyersResponse.error,
    };
  }

  return {
    data: {
      buyers: buildAdminBuyerAccountsFallback(buyersResponse.data ?? [], []),
      buyersCount: buyersResponse.count ?? buyersResponse.data?.length ?? 0,
    },
    error: null,
  };
}

export async function getAdminArtisanProfile(profileId: string) {
  const client = getSupabaseClient();
  const loadProfile = (selection: string) =>
    client
      .from("profiles")
      .select(selection)
      .eq("id", profileId)
      .eq("role", "artisan")
      .single<AdminArtisanProfile>();
  const response = await loadProfile(adminArtisanProfileSelection);

  if (isMissingAdminProfileControlColumn(response.error)) {
    return loadProfile(baseAdminArtisanProfileSelection);
  }

  return response;
}

export async function saveAdminArtisanProfileControls(
  artisanId: string,
  input: AdminArtisanProfileControlsInput,
) {
  const client = getSupabaseClient();

  return client
    .from("profiles")
    .update({
      storefront_boost_multiplier: input.storefront_boost_multiplier,
      storefront_boosted_at: input.storefront_boosted_at,
      storefront_control_updated_at: new Date().toISOString(),
      storefront_hidden_at: input.storefront_hidden_at,
    })
    .eq("id", artisanId)
    .eq("role", "artisan")
    .select(adminArtisanProfileSelection)
    .single<AdminArtisanProfile>();
}

export async function getAdminArtisanMovements(
  artisanId: string,
): Promise<{
  count: number;
  data: AdminArtisanMovementsSnapshot | null;
  error: Error | null;
}> {
  const client = getSupabaseClient();
  const response = await client
    .from("order_items")
    .select(
      "id, order_id, product_title, quantity, subtotal, created_at, orders(id, buyer_name, payment_status, status, total_amount, created_at)",
      { count: "exact" },
    )
    .eq("artisan_id", artisanId)
    .order("created_at", { ascending: false })
    .limit(12)
    .returns<AdminArtisanMovementRow[]>();

  if (response.error) {
    return {
      count: 0,
      data: null,
      error: new Error(response.error.message),
    };
  }

  const items = (response.data ?? []).map((item) => ({
    created_at: item.created_at,
    id: item.id,
    order_id: item.order_id,
    product_title: item.product_title,
    quantity: toSafeNumber(item.quantity),
    subtotal: toSafeNumber(item.subtotal),
    orders: item.orders
      ? {
          buyer_name: item.orders.buyer_name,
          created_at: item.orders.created_at,
          id: item.orders.id,
          payment_status: item.orders.payment_status,
          status: item.orders.status,
          total_amount: toSafeNumber(item.orders.total_amount),
        }
      : null,
  }));

  return {
    count: response.count ?? items.length,
    data: {
      items,
      totalCount: response.count ?? items.length,
    },
    error: null,
  };
}

export async function getAdminDashboardProducts(params?: OptionalPaginationParams) {
  const client = getSupabaseClient();
  const { from, to } = normalizePaginationParams(params);

  let query = client
    .from("products")
    .select(
      "id, artisan_id, title, image_url, price, is_active, stock_quantity, created_at, categories(name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (params?.limit) {
    query = query.range(from, to);
  }

  return query.returns<AdminDashboardProduct[]>();
}

export async function getAdminDashboardVisibleProductsCount() {
  const client = getSupabaseClient();

  return client
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
}

export async function getAdminDashboardSales(params?: OptionalPaginationParams) {
  const client = getSupabaseClient();
  const approvedOrdersResponse = await getApprovedOrderCreatedAtMap(1000);

  if (approvedOrdersResponse.error || !approvedOrdersResponse.data) {
    return {
      count: 0,
      data: null,
      error: approvedOrdersResponse.error,
    };
  }

  const orderIds = [...approvedOrdersResponse.data.keys()];

  if (orderIds.length === 0) {
    return {
      count: 0,
      data: [],
      error: null,
    };
  }

  const response = await client
    .from("order_items")
    .select("id, order_id, artisan_id, product_title, quantity, subtotal, created_at")
    .in("order_id", orderIds)
    .returns<AdminDashboardSaleRow[]>();
  const sortedSales = (response.data ?? [])
    .map((sale) => ({
      artisan_id: sale.artisan_id,
      created_at: approvedOrdersResponse.data?.get(sale.order_id) ?? sale.created_at,
      id: sale.id,
      product_title: sale.product_title,
      quantity: sale.quantity,
      subtotal: sale.subtotal,
    }))
    .sort((left, right) => +new Date(right.created_at) - +new Date(left.created_at));

  return {
    count: sortedSales.length,
    data: response.error ? null : paginateClientRows(sortedSales, params),
    error: response.error,
  };
}

export async function getAdminProductControlProducts(params?: OptionalPaginationParams) {
  const client = getSupabaseClient();
  const { from, search, to } = normalizePaginationParams(params);

  let query = client
    .from("products")
    .select(
      "id, artisan_id, title, description, image_url, price, is_active, stock_quantity, availability_mode, lead_time_days, created_at, categories(name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (search) {
    const pattern = getSearchPattern(search);
    query = query.or(
      `title.ilike.${pattern},description.ilike.${pattern}`,
    );
  }

  if (params?.limit) {
    query = query.range(from, to);
  }

  return query.returns<AdminProductControlProduct[]>();
}

export async function getAdminProductControlSales(params?: OptionalPaginationParams) {
  const client = getSupabaseClient();
  const approvedOrdersResponse = await getApprovedOrderCreatedAtMap(1000);

  if (approvedOrdersResponse.error || !approvedOrdersResponse.data) {
    return {
      count: 0,
      data: null,
      error: approvedOrdersResponse.error,
    };
  }

  const orderIds = [...approvedOrdersResponse.data.keys()];

  if (orderIds.length === 0) {
    return {
      count: 0,
      data: [],
      error: null,
    };
  }

  const response = await client
    .from("order_items")
    .select("id, order_id, product_id, quantity, subtotal, created_at")
    .in("order_id", orderIds)
    .returns<AdminProductControlSaleRow[]>();
  const sortedSales = (response.data ?? [])
    .map((sale) => ({
      created_at: approvedOrdersResponse.data?.get(sale.order_id) ?? sale.created_at,
      id: sale.id,
      product_id: sale.product_id,
      quantity: sale.quantity,
      subtotal: sale.subtotal,
    }))
    .sort((left, right) => +new Date(right.created_at) - +new Date(left.created_at));

  return {
    count: sortedSales.length,
    data: response.error ? null : paginateClientRows(sortedSales, params),
    error: response.error,
  };
}

export async function getAdminBillingSnapshot(
  period: AdminBillingPeriod = "all",
): Promise<{
  count: number;
  data: AdminBillingSnapshot | null;
  error: Error | null;
}> {
  const client = getSupabaseClient();
  const periodStart = getAdminBillingPeriodStart(period);

  let ordersQuery = client
    .from("orders")
    .select("id, payment_status, subtotal_amount, shipping_amount, total_amount, created_at", {
      count: "exact",
    })
    .in("payment_status", ADMIN_BILLING_PAYMENT_STATUSES)
    .order("created_at", { ascending: false })
    .limit(ADMIN_BILLING_ORDERS_LIMIT);

  if (periodStart) {
    ordersQuery = ordersQuery.gte("created_at", periodStart);
  }

  const ordersResponse = await ordersQuery.returns<AdminBillingOrderRow[]>();

  if (ordersResponse.error) {
    return {
      count: 0,
      data: null,
      error: new Error(ordersResponse.error.message),
    };
  }

  const orders = (ordersResponse.data ?? []).map(normalizeAdminBillingOrder);
  const orderIds = orders.map((order) => order.id);

  if (orderIds.length === 0) {
    return {
      count: 0,
      data: buildAdminBillingSnapshot(period, [], []),
      error: null,
    };
  }

  const itemChunks = await Promise.all(
    chunkItems(orderIds, ADMIN_BILLING_ITEMS_CHUNK_SIZE).map((ids) =>
      client
        .from("order_items")
        .select(
          "id, order_id, artisan_id, artisan_name, store_name, product_title, quantity, subtotal, created_at",
        )
        .in("order_id", ids)
        .returns<AdminBillingItemRow[]>(),
    ),
  );
  const firstItemsError = itemChunks.find((response) => response.error)?.error;

  if (firstItemsError) {
    return {
      count: ordersResponse.count ?? orders.length,
      data: null,
      error: new Error(firstItemsError.message),
    };
  }

  const items = itemChunks.flatMap((response) =>
    (response.data ?? []).map(normalizeAdminBillingItem),
  );

  return {
    count: ordersResponse.count ?? orders.length,
    data: buildAdminBillingSnapshot(period, orders, items),
    error: null,
  };
}

export async function getAdminSales(
  filter: AdminSalesStatusFilter,
  params?: AdminSalesQueryParams,
) {
  const client = getSupabaseClient();
  const { from, to } = normalizePaginationParams(params);
  const paymentStatuses = getPaymentStatusesForAdminSales(filter);

  let ordersQuery = client
    .from("orders")
    .select(
      "id, buyer_id, buyer_name, buyer_email, buyer_phone, delivery_address, delivery_notes, delivery_type, fulfillment_status, payment_status, status, subtotal_amount, shipping_amount, total_amount, paid_at, created_at",
      { count: "exact" },
    )
    .in("payment_status", paymentStatuses)
    .order("created_at", { ascending: false });

  if (filter === "approved" && params?.fulfillmentFilter === "completed") {
    ordersQuery = ordersQuery.eq("fulfillment_status", "delivered");
  }

  if (filter === "approved" && params?.fulfillmentFilter === "in_process") {
    ordersQuery = ordersQuery.not("fulfillment_status", "eq", "delivered");
  }

  if (params?.limit) {
    ordersQuery = ordersQuery.range(from, to);
  }

  const ordersResponse = await ordersQuery.returns<AdminSalesOrder[]>();

  if (ordersResponse.error) {
    return {
      count: 0,
      data: null,
      error: ordersResponse.error,
    };
  }

  const orders = ordersResponse.data ?? [];
  const orderIds = orders.map((order) => order.id);

  if (orderIds.length === 0) {
    return {
      count: ordersResponse.count ?? 0,
      data: [],
      error: null,
    };
  }

  const itemsResponse = await client
    .from("order_items")
    .select(
      "id, order_id, product_id, artisan_id, product_title, product_image_url, category_name, artisan_name, store_name, availability_mode, lead_time_days, selected_options_summary, fulfillment_status, quantity, unit_price, subtotal, created_at",
    )
    .in("order_id", orderIds)
    .order("created_at", { ascending: false })
    .returns<AdminSalesItemRow[]>();

  if (itemsResponse.error) {
    return {
      count: ordersResponse.count ?? orders.length,
      data: null,
      error: itemsResponse.error,
    };
  }

  const ordersById = new Map(orders.map((order) => [order.id, order]));

  return {
    count: ordersResponse.count ?? orders.length,
    data: (itemsResponse.data ?? []).map((item) => ({
      ...item,
      orders: ordersById.get(item.order_id) ?? null,
    })),
    error: null,
  };
}

export async function updateAdminOrderItemFulfillmentStatus(
  orderItemId: string,
  fulfillmentStatus: FulfillmentStatus,
) {
  const client = getSupabaseClient();

  return client.rpc("update_order_item_fulfillment_status", {
    p_order_item_id: orderItemId,
    p_status: fulfillmentStatus,
  });
}

export async function getAdminProductControlTags() {
  const client = getSupabaseClient();
  const response = await client
    .from("product_admin_controls")
    .select("product_id, internal_tag, comment, boost_level, boost_until, updated_at")
    .order("updated_at", { ascending: false })
    .returns<AdminProductControlRecord[]>();

  return {
    data: response.data ?? [],
    error: normalizeAdminProductControlError(response.error),
  };
}

export async function getAdminDashboardSnapshot() {
  const [
    artisansResponse,
    buyersResponse,
    categoriesResponse,
    productsResponse,
    visibleProductsCountResponse,
    salesResponse,
  ] = await Promise.all([
      getAdminArtisanProfiles(),
      getAdminBuyerProfiles(),
      getAdminCategories(),
      getAdminDashboardProducts({ limit: ADMIN_DASHBOARD_PRODUCTS_LIMIT, page: 1 }),
      getAdminDashboardVisibleProductsCount(),
      getAdminDashboardSales({ limit: ADMIN_DASHBOARD_SALES_LIMIT, page: 1 }),
    ]);

  const firstError = artisansResponse.error ?? buyersResponse.error ?? categoriesResponse.error;

  if (firstError) {
    return {
      data: null,
      error: new Error(firstError.message),
    };
  }

  let warningMessage: string | null = null;

  if (productsResponse.error || salesResponse.error) {
    if (productsResponse.error && salesResponse.error) {
      warningMessage = "El panel cargó de forma parcial. No pudimos traer productos ni ventas.";
    } else if (productsResponse.error) {
      warningMessage = "El panel cargó de forma parcial. No pudimos traer los productos.";
    } else {
      warningMessage = "El panel cargó de forma parcial. No pudimos traer las ventas.";
    }
  }

  const snapshot: AdminDashboardSnapshot = {
    artisans: artisansResponse.data ?? [],
    buyers: buyersResponse.data ?? [],
    categories: categoriesResponse.data ?? [],
    productsCount: productsResponse.count ?? productsResponse.data?.length ?? 0,
    products: productsResponse.error ? [] : productsResponse.data ?? [],
    salesCount: salesResponse.count ?? salesResponse.data?.length ?? 0,
    sales: salesResponse.error ? [] : salesResponse.data ?? [],
    visibleProductsCount:
      visibleProductsCountResponse.count ??
      productsResponse.data?.filter((product) => product.is_active).length ??
      0,
    warningMessage,
  };

  return {
    data: snapshot,
    error: null,
  };
}

export async function getAdminProductControlSnapshot(params?: OptionalPaginationParams) {
  const [productsResponse, artisansResponse, salesResponse, controlResponse] = await Promise.all([
    getAdminProductControlProducts(params),
    getAdminArtisanProfiles(),
    getAdminProductControlSales({ limit: ADMIN_PRODUCT_CONTROL_SALES_LIMIT, page: 1 }),
    getAdminProductControlTags(),
  ]);

  const firstError = productsResponse.error ?? artisansResponse.error ?? controlResponse.error;

  if (firstError) {
    return {
      data: null,
      error: new Error(firstError.message),
    };
  }

  const snapshot: AdminProductControlSnapshot = {
    artisans: artisansResponse.data ?? [],
    controlRecords: controlResponse.data ?? [],
    productsCount: productsResponse.count ?? productsResponse.data?.length ?? 0,
    products: productsResponse.data ?? [],
    salesCount: salesResponse.count ?? salesResponse.data?.length ?? 0,
    sales: salesResponse.error ? [] : salesResponse.data ?? [],
    warningMessage: salesResponse.error
      ? "El control cargó sin ventas recientes. No pudimos traer ese historial por ahora."
      : null,
  };

  return {
    data: snapshot,
    error: null,
  };
}

export async function saveAdminProductControlRecord(
  productId: string,
  input: {
    boostLevel?: AdminProductControlBoostLevel | null;
    boostUntil?: string | null;
    comment?: string | null;
    internalTag?: AdminProductControlTag | null;
  },
) {
  const client = getSupabaseClient();
  const record = normalizeProductControlRecord(productId, {
    boostLevel: "boostLevel" in input ? input.boostLevel ?? null : null,
    boostUntil: "boostUntil" in input ? input.boostUntil ?? null : null,
    comment: "comment" in input ? input.comment ?? null : null,
    internalTag: "internalTag" in input ? input.internalTag ?? null : null,
  });

  if (shouldDeleteProductControlRecord(record)) {
    const deleteResponse = await client
      .from("product_admin_controls")
      .delete()
      .eq("product_id", productId);

    return {
      data: null,
      error: normalizeAdminProductControlError(deleteResponse.error),
    };
  }

  const upsertResponse = await client
    .from("product_admin_controls")
    .upsert(record, {
      onConflict: "product_id",
    })
    .select("product_id, internal_tag, comment, boost_level, boost_until, updated_at")
    .single<AdminProductControlRecord>();

  return {
    data: upsertResponse.data ?? record,
    error: normalizeAdminProductControlError(upsertResponse.error),
  };
}

export function createAdminArtisanProfile(input: AdminArtisanProfileInput) {
  return invokeAdminArtisanFunction<AdminArtisanProfile>("create", {
    payload: input,
  });
}

export function updateAdminArtisanProfile(
  artisanId: string,
  input: AdminArtisanProfileUpdateInput,
) {
  return invokeAdminArtisanFunction<AdminArtisanProfile>("update", {
    artisanId,
    payload: input,
  });
}

export function deleteAdminArtisanProfile(artisanId: string) {
  return invokeAdminArtisanFunction<AdminArtisanDeleteResult>("delete", {
    artisanId,
  });
}

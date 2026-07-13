import type {
  AdminApprovedSalesFulfillmentFilter,
  AdminBillingItem,
  AdminBillingOrder,
  AdminBillingPeriod,
  AdminBuyerAccountSummary,
  AdminBuyerProfile,
  AdminCategoryInput,
  AdminDashboardSale,
  AdminProductControlBoostLevel,
  AdminProductControlRecord,
  AdminProductControlSale,
  AdminProductControlTag,
  AdminSalesItem,
  AdminSalesOrder,
  AdminSalesStatusFilter,
} from "../../types/admin";
import type { PaginationParams } from "../../types/pagination";

export const ADMIN_DASHBOARD_PRODUCTS_LIMIT = 500;
export const ADMIN_DASHBOARD_SALES_LIMIT = 500;
export const ADMIN_PRODUCT_CONTROL_SALES_LIMIT = 1000;
export const ADMIN_BILLING_ORDERS_LIMIT = 5000;
export const ADMIN_BILLING_ITEMS_CHUNK_SIZE = 250;
export const ADMIN_BILLING_PAYMENT_STATUSES = ["approved", "authorized"];
export const baseAdminArtisanProfileSelection =
  "id, full_name, email, role, store_name, store_description, profile_image_url, storefront_theme_color, created_at";
export const adminArtisanProfileSelection =
  "id, full_name, email, role, store_name, store_description, profile_image_url, storefront_theme_color, storefront_boost_multiplier, storefront_boosted_at, storefront_hidden_at, storefront_control_updated_at, created_at";

export type OptionalPaginationParams = Partial<PaginationParams>;
export type AdminSalesQueryParams = OptionalPaginationParams & {
  fulfillmentFilter?: AdminApprovedSalesFulfillmentFilter;
};
export type AdminBuyerOrderRow = {
  buyer_id: string | null;
  created_at: string;
  payment_status?: string | null;
  status?: string | null;
  total_amount: number | string;
  updated_at?: string | null;
};
export type AdminDashboardSaleRow = AdminDashboardSale & { order_id: string };
export type AdminProductControlSaleRow = AdminProductControlSale & { order_id: string };
export type AdminSalesItemRow = Omit<AdminSalesItem, "orders">;
export type AdminArtisanMovementRow = {
  created_at: string;
  id: string;
  order_id: string;
  product_title: string;
  quantity: number | string;
  subtotal: number | string;
  orders?: {
    buyer_name: string;
    created_at: string;
    id: string;
    payment_status: AdminSalesOrder["payment_status"];
    status: string;
    total_amount: number | string;
  } | null;
};
export type ApprovedOrderRow = { created_at: string; id: string };
export type AdminBillingOrderRow = Omit<
  AdminBillingOrder,
  "shipping_amount" | "subtotal_amount" | "total_amount"
> & {
  shipping_amount: number | string | null;
  subtotal_amount: number | string | null;
  total_amount: number | string | null;
};
export type AdminBillingItemRow = Omit<AdminBillingItem, "quantity" | "subtotal"> & {
  quantity: number | string | null;
  subtotal: number | string | null;
};

export function normalizeProductControlComment(comment: string | null | undefined) {
  const normalized = `${comment ?? ""}`.trim();
  return normalized ? normalized.slice(0, 800) : null;
}

export function normalizeProductControlBoostLevel(
  boostLevel: AdminProductControlBoostLevel | null | undefined,
) {
  return boostLevel ?? null;
}

export function normalizeProductControlBoostUntil(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function normalizeAdminProductControlError(
  error: { code?: string; message?: string } | null,
) {
  if (!error) return null;
  const code = `${error.code ?? ""}`.toLowerCase();
  const message = `${error.message ?? ""}`.toLowerCase();
  if (
    code === "pgrst205" ||
    code === "42703" ||
    message.includes("product_admin_controls") ||
    message.includes("could not find the table") ||
    message.includes("could not find the column")
  ) {
    return new Error(
      "La base admin todavía no tiene configurado el control de productos. Activá esa tabla en Supabase para usar este panel.",
    );
  }
  return new Error(error.message ?? "No pudimos guardar este control admin.");
}

export function normalizeProductControlRecord(
  productId: string,
  input: {
    boostLevel?: AdminProductControlBoostLevel | null;
    boostUntil?: string | null;
    comment?: string | null;
    internalTag?: AdminProductControlTag | null;
    updatedAt?: string;
  },
): AdminProductControlRecord {
  return {
    boost_level: normalizeProductControlBoostLevel(input.boostLevel),
    boost_until: normalizeProductControlBoostUntil(input.boostUntil),
    comment: normalizeProductControlComment(input.comment),
    internal_tag: input.internalTag ?? null,
    product_id: productId,
    updated_at: input.updatedAt ?? new Date().toISOString(),
  };
}

export function shouldDeleteProductControlRecord(record: AdminProductControlRecord) {
  return (
    record.internal_tag === null &&
    record.comment === null &&
    record.boost_level === null &&
    record.boost_until === null
  );
}

export function cleanCategoryInput(input: AdminCategoryInput) {
  return {
    is_active: input.is_active,
    name: input.name.trim(),
    slug: input.slug.trim().toLowerCase(),
  };
}

export function isMissingAdminProfileControlColumn(
  error: { code?: string; details?: string | null; message?: string | null } | null,
) {
  const text = `${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();
  return (
    error?.code === "PGRST204" ||
    error?.code === "42703" ||
    text.includes("storefront_boost_multiplier") ||
    text.includes("storefront_hidden_at") ||
    text.includes("storefront_boosted_at") ||
    text.includes("storefront_control_updated_at") ||
    text.includes("could not find the") ||
    text.includes("column")
  );
}

export function normalizePaginationParams(params?: OptionalPaginationParams) {
  const page = Math.max(1, Math.floor(params?.page ?? 1));
  const limit = Math.min(Math.max(1, Math.floor(params?.limit ?? 50)), 500);
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const search = params?.search?.trim() ? params.search.trim() : undefined;
  return { from, limit, page, search, to };
}

export function getSearchPattern(search: string) {
  return `%${search.replace(/[%,]/g, " ").replace(/\s+/g, " ").trim()}%`;
}

export function getPaymentStatusesForAdminSales(filter: AdminSalesStatusFilter) {
  if (filter === "approved") return ["approved", "authorized"];
  if (filter === "pending") return ["pending", "in_process"];
  return ["rejected", "cancelled", "refunded", "charged_back"];
}

export function getAdminBillingPeriodStart(period: AdminBillingPeriod) {
  if (period === "all") return null;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (period === "7d" ? 7 : 30));
  return startDate.toISOString();
}

export function chunkItems<TItem>(items: TItem[], size: number) {
  const chunks: TItem[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export function toSafeNumber(value: number | string | null | undefined) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

export function normalizeAdminBillingOrder(row: AdminBillingOrderRow): AdminBillingOrder {
  return {
    created_at: row.created_at,
    id: row.id,
    payment_status: row.payment_status,
    shipping_amount: toSafeNumber(row.shipping_amount),
    subtotal_amount: toSafeNumber(row.subtotal_amount),
    total_amount: toSafeNumber(row.total_amount),
  };
}

export function normalizeAdminBillingItem(row: AdminBillingItemRow): AdminBillingItem {
  return {
    artisan_id: row.artisan_id,
    artisan_name: row.artisan_name,
    created_at: row.created_at,
    id: row.id,
    order_id: row.order_id,
    product_title: row.product_title,
    quantity: toSafeNumber(row.quantity),
    store_name: row.store_name,
    subtotal: toSafeNumber(row.subtotal),
  };
}

function getLatestTimestamp(values: Array<string | null | undefined>) {
  const valid = values.filter((value): value is string => Boolean(value));
  return valid.length === 0
    ? null
    : valid.sort((left, right) => +new Date(right) - +new Date(left))[0];
}

export function buildAdminBuyerAccountsFallback(
  buyers: AdminBuyerProfile[],
  orders: AdminBuyerOrderRow[],
) {
  const ordersByBuyer = new Map<string, AdminBuyerOrderRow[]>();
  orders.forEach((order) => {
    if (!order.buyer_id) return;
    ordersByBuyer.set(order.buyer_id, [...(ordersByBuyer.get(order.buyer_id) ?? []), order]);
  });

  return buyers.map<AdminBuyerAccountSummary>((buyer) => {
    const buyerOrders = ordersByBuyer.get(buyer.id) ?? [];
    const paidOrders = buyerOrders.filter(
      (order) =>
        order.payment_status === "approved" ||
        order.status === "paid" ||
        order.status === "confirmed",
    );
    const openOrders = buyerOrders.filter(
      (order) => !["cancelled", "failed", "refunded"].includes(order.status ?? ""),
    );
    return {
      created_at: buyer.created_at,
      email: buyer.email,
      favoritesCount: 0,
      full_name: buyer.full_name,
      hasPhone: false,
      hasShippingAddress: false,
      id: buyer.id,
      interestTerms: [],
      lastActivityAt: getLatestTimestamp([
        ...buyerOrders.map((order) => order.updated_at ?? order.created_at),
        buyer.created_at,
      ]),
      lastOrderAt: getLatestTimestamp(buyerOrders.map((order) => order.created_at)),
      openOrdersCount: openOrders.length,
      ordersCount: buyerOrders.length,
      paidOrdersCount: paidOrders.length,
      preferredDeliveryType: null,
      profile_image_url: buyer.profile_image_url,
      totalSpent: Number(
        paidOrders.reduce((total, order) => total + Number(order.total_amount ?? 0), 0).toFixed(2),
      ),
    };
  });
}

import type {
  AdminBillingItem,
  AdminBillingOrder,
  AdminBillingPeriod,
  AdminBillingSellerSummary,
  AdminBillingSnapshot,
} from "../../types/admin";

function toAmount(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  return Number.isFinite(amount) ? amount : 0;
}

function getSellerName(item: AdminBillingItem) {
  return item.store_name?.trim() || item.artisan_name?.trim() || "Vendedor";
}

function getLatestDate(currentValue: string | null, nextValue: string | null | undefined) {
  if (!nextValue) {
    return currentValue;
  }

  if (!currentValue) {
    return nextValue;
  }

  return +new Date(nextValue) > +new Date(currentValue) ? nextValue : currentValue;
}

export function buildAdminBillingSnapshot(
  period: AdminBillingPeriod,
  orders: AdminBillingOrder[],
  items: AdminBillingItem[],
): AdminBillingSnapshot {
  const ordersById = new Map(orders.map((order) => [order.id, order]));
  const sellers = new Map<
    string,
    AdminBillingSellerSummary & {
      orderIds: Set<string>;
    }
  >();

  items.forEach((item) => {
    const sellerKey = item.artisan_id || "missing";
    const order = ordersById.get(item.order_id);
    const currentSeller = sellers.get(sellerKey) ?? {
      artisanId: sellerKey,
      averageOrderAmount: 0,
      itemsCount: 0,
      lastSaleAt: null,
      orderIds: new Set<string>(),
      ordersCount: 0,
      productRevenue: 0,
      sellerName: getSellerName(item),
      unitsSold: 0,
    };

    currentSeller.itemsCount += 1;
    currentSeller.productRevenue += toAmount(item.subtotal);
    currentSeller.unitsSold += Number(item.quantity ?? 0);
    currentSeller.orderIds.add(item.order_id);
    currentSeller.lastSaleAt = getLatestDate(
      currentSeller.lastSaleAt,
      order?.created_at ?? item.created_at,
    );

    sellers.set(sellerKey, currentSeller);
  });

  const sellerSummaries = Array.from(sellers.values())
    .map<AdminBillingSellerSummary>((seller) => {
      const ordersCount = seller.orderIds.size;

      return {
        artisanId: seller.artisanId,
        averageOrderAmount: ordersCount > 0 ? seller.productRevenue / ordersCount : 0,
        itemsCount: seller.itemsCount,
        lastSaleAt: seller.lastSaleAt,
        ordersCount,
        productRevenue: seller.productRevenue,
        sellerName: seller.sellerName,
        unitsSold: seller.unitsSold,
      };
    })
    .sort((left, right) => right.productRevenue - left.productRevenue);

  const totalRevenue = orders.reduce(
    (total, order) => total + toAmount(order.total_amount),
    0,
  );
  const productRevenue = items.reduce((total, item) => total + toAmount(item.subtotal), 0);
  const shippingRevenue = orders.reduce(
    (total, order) => total + toAmount(order.shipping_amount),
    0,
  );
  const unitsSold = items.reduce(
    (total, item) => total + Number(item.quantity ?? 0),
    0,
  );

  return {
    averageOrderAmount: orders.length > 0 ? totalRevenue / orders.length : 0,
    generatedAt: new Date().toISOString(),
    itemsCount: items.length,
    ordersCount: orders.length,
    period,
    productRevenue,
    sellers: sellerSummaries,
    sellersCount: sellerSummaries.length,
    shippingRevenue,
    totalRevenue,
    unitsSold,
  };
}

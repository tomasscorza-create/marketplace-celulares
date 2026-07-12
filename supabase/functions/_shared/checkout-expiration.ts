export const CHECKOUT_EXPIRATION_HOURS = 24;

const PENDING_PAYMENT_STATUSES = ["pending", "in_process"] as const;
const PENDING_ORDER_STATUSES = ["draft", "pending"] as const;
const PAYMENT_ATTEMPT_EXPIRABLE_STATUSES = ["created", "pending", "in_process"] as const;

type SupabaseAdminClient = {
  from: (table: string) => any;
};

type ExpirableOrderRow = {
  created_at: string;
  id: string;
  payment_status: string;
  status: string;
};

export function getCheckoutExpirationDate(createdAt = new Date()) {
  return new Date(createdAt.getTime() + CHECKOUT_EXPIRATION_HOURS * 60 * 60 * 1000);
}

export function getCheckoutExpirationCutoff(now = new Date()) {
  return new Date(now.getTime() - CHECKOUT_EXPIRATION_HOURS * 60 * 60 * 1000);
}

export function isCheckoutExpired(createdAt: string | null | undefined, now = new Date()) {
  if (!createdAt) {
    return false;
  }

  return new Date(createdAt).getTime() <= getCheckoutExpirationCutoff(now).getTime();
}

export async function expirePendingCheckouts(adminClient: SupabaseAdminClient, now = new Date()) {
  const nowIso = now.toISOString();
  const cutoffIso = getCheckoutExpirationCutoff(now).toISOString();

  const { data: expiredOrders, error: expiredOrdersError } = await adminClient
    .from("orders")
    .select("id")
    .in("payment_status", PENDING_PAYMENT_STATUSES)
    .in("status", PENDING_ORDER_STATUSES)
    .lte("created_at", cutoffIso);

  if (expiredOrdersError) {
    throw new Error(expiredOrdersError.message);
  }

  const orderIds = (expiredOrders ?? [])
    .map((order: { id?: string | null }) => order.id)
    .filter((orderId: string | null | undefined): orderId is string => Boolean(orderId));

  if (orderIds.length === 0) {
    return { expiredCount: 0, orderIds };
  }

  const { error: attemptsError } = await adminClient
    .from("payment_attempts")
    .update({
      last_webhook_at: nowIso,
      status: "cancelled",
    })
    .in("order_id", orderIds)
    .in("status", PAYMENT_ATTEMPT_EXPIRABLE_STATUSES);

  if (attemptsError) {
    throw new Error(attemptsError.message);
  }

  const { error: cartsError } = await adminClient
    .from("carts")
    .update({
      converted_order_id: null,
      updated_at: nowIso,
    })
    .in("converted_order_id", orderIds)
    .eq("status", "active");

  if (cartsError) {
    throw new Error(cartsError.message);
  }

  const { error: orderItemsError } = await adminClient
    .from("order_items")
    .update({
      fulfillment_status: "cancelled",
    })
    .in("order_id", orderIds)
    .eq("fulfillment_status", "pending");

  if (orderItemsError) {
    throw new Error(orderItemsError.message);
  }

  const { error: ordersError } = await adminClient
    .from("orders")
    .update({
      cancelled_at: nowIso,
      fulfillment_status: "cancelled",
      payment_status: "cancelled",
      status: "cancelled",
      updated_at: nowIso,
    })
    .in("id", orderIds);

  if (ordersError) {
    throw new Error(ordersError.message);
  }

  return { expiredCount: orderIds.length, orderIds };
}

export async function getOrderExpirationStateByExternalReference(
  adminClient: SupabaseAdminClient,
  externalReference: string | null | undefined,
  now = new Date(),
) {
  if (!externalReference) {
    return null;
  }

  const { data, error } = await adminClient
    .from("orders")
    .select("id, created_at, payment_status, status")
    .eq("external_reference", externalReference)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const order = data as ExpirableOrderRow | null;

  if (!order) {
    return null;
  }

  return {
    ...order,
    isExpired: isCheckoutExpired(order.created_at, now),
    isPendingPayment: PENDING_PAYMENT_STATUSES.includes(order.payment_status as typeof PENDING_PAYMENT_STATUSES[number]),
    isPendingOrder: PENDING_ORDER_STATUSES.includes(order.status as typeof PENDING_ORDER_STATUSES[number]),
  };
}

export async function expirePendingCheckoutByExternalReference(
  adminClient: SupabaseAdminClient,
  externalReference: string | null | undefined,
  now = new Date(),
) {
  const state = await getOrderExpirationStateByExternalReference(adminClient, externalReference, now);

  if (!state || !state.isExpired || !state.isPendingPayment || !state.isPendingOrder) {
    return { expired: false, orderId: state?.id ?? null };
  }

  const nowIso = now.toISOString();

  const { error: attemptsError } = await adminClient
    .from("payment_attempts")
    .update({
      last_webhook_at: nowIso,
      status: "cancelled",
    })
    .eq("order_id", state.id)
    .in("status", PAYMENT_ATTEMPT_EXPIRABLE_STATUSES);

  if (attemptsError) {
    throw new Error(attemptsError.message);
  }

  const { error: cartsError } = await adminClient
    .from("carts")
    .update({
      converted_order_id: null,
      updated_at: nowIso,
    })
    .eq("converted_order_id", state.id)
    .eq("status", "active");

  if (cartsError) {
    throw new Error(cartsError.message);
  }

  const { error: orderItemsError } = await adminClient
    .from("order_items")
    .update({
      fulfillment_status: "cancelled",
    })
    .eq("order_id", state.id)
    .eq("fulfillment_status", "pending");

  if (orderItemsError) {
    throw new Error(orderItemsError.message);
  }

  const { error: orderError } = await adminClient
    .from("orders")
    .update({
      cancelled_at: nowIso,
      fulfillment_status: "cancelled",
      payment_status: "cancelled",
      status: "cancelled",
      updated_at: nowIso,
    })
    .eq("id", state.id);

  if (orderError) {
    throw new Error(orderError.message);
  }

  return { expired: true, orderId: state.id };
}

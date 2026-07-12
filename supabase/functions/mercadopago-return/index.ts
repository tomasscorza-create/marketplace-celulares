import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders } from "../_shared/cors.ts";
import {
  expirePendingCheckoutByExternalReference,
  getOrderExpirationStateByExternalReference,
} from "../_shared/checkout-expiration.ts";
import { getMercadoPagoConfig } from "../_shared/mercadopago-config.ts";

type MercadoPagoPaymentResponse = {
  date_created?: string | null;
  external_reference?: string | null;
  id: number;
  metadata?: {
    order_id?: string;
    payment_attempt_id?: string;
  };
  order?: {
    id?: string | number;
  } | null;
  status?: string | null;
};

type MercadoPagoPaymentSearchResponse = {
  results?: MercadoPagoPaymentResponse[];
};

type LocalPaymentReferenceRow = {
  external_reference: string | null;
};

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function redirectResponse(url: string) {
  return new Response(null, {
    headers: {
      ...corsHeaders,
      Location: url,
    },
    status: 302,
  });
}

function mapMercadoPagoStatus(status: string | null | undefined) {
  switch (status) {
    case "approved":
      return { orderStatus: "paid", paymentStatus: "approved", returnPath: "/checkout/exito" } as const;
    case "authorized":
      return { orderStatus: "pending", paymentStatus: "authorized", returnPath: "/checkout/pendiente" } as const;
    case "in_process":
    case "pending":
      return { orderStatus: "pending", paymentStatus: "in_process", returnPath: "/checkout/pendiente" } as const;
    case "rejected":
      return { orderStatus: "failed", paymentStatus: "rejected", returnPath: "/checkout/fallo" } as const;
    case "cancelled":
      return { orderStatus: "cancelled", paymentStatus: "cancelled", returnPath: "/checkout/fallo" } as const;
    case "refunded":
      return { orderStatus: "refunded", paymentStatus: "refunded", returnPath: "/checkout/fallo" } as const;
    case "charged_back":
      return { orderStatus: "failed", paymentStatus: "charged_back", returnPath: "/checkout/fallo" } as const;
    default:
      return { orderStatus: "pending", paymentStatus: "pending", returnPath: "/checkout/pendiente" } as const;
  }
}

function appendReturnParams(baseUrl: string, params: Record<string, string | null | undefined>) {
  const url = new URL(baseUrl);

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

function normalizeHttpOrigin(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.origin;
  } catch {
    return null;
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

function resolveReturnBaseUrl(returnTo: string | null, configuredAppBaseUrl: string) {
  const configuredOrigin = normalizeHttpOrigin(configuredAppBaseUrl) ?? configuredAppBaseUrl;
  const requestedOrigin = normalizeHttpOrigin(returnTo);

  if (!requestedOrigin) {
    return configuredOrigin;
  }

  if (
    requestedOrigin === configuredOrigin ||
    isSameConfiguredWebOrigin(requestedOrigin, configuredOrigin) ||
    isLocalDevelopmentOrigin(requestedOrigin)
  ) {
    return requestedOrigin;
  }

  return configuredOrigin;
}

function isSameConfiguredWebOrigin(requestedOrigin: string, configuredOrigin: string) {
  try {
    const requestedUrl = new URL(requestedOrigin);
    const configuredUrl = new URL(configuredOrigin);

    if (requestedUrl.protocol !== "https:" || configuredUrl.protocol !== "https:") {
      return false;
    }

    const requestedHost = requestedUrl.hostname.toLowerCase();
    const configuredHost = configuredUrl.hostname.toLowerCase();

    return (
      requestedHost === configuredHost ||
      requestedHost === `www.${configuredHost}` ||
      configuredHost === `www.${requestedHost}`
    );
  } catch {
    return false;
  }
}

function getPaymentStatusWeight(status: string | null | undefined) {
  switch (status) {
    case "approved":
      return 5;
    case "authorized":
      return 4;
    case "in_process":
    case "pending":
      return 3;
    case "rejected":
    case "cancelled":
      return 2;
    default:
      return 1;
  }
}

function chooseBestPaymentForReference(
  results: MercadoPagoPaymentResponse[] | undefined,
  externalReference: string,
) {
  const matchingPayments = (results ?? []).filter(
    (payment) => payment.external_reference === externalReference,
  );

  return matchingPayments.sort((left, right) => {
    const statusWeightDelta =
      getPaymentStatusWeight(right.status) - getPaymentStatusWeight(left.status);

    if (statusWeightDelta !== 0) {
      return statusWeightDelta;
    }

    return (
      new Date(right.date_created ?? 0).getTime() -
      new Date(left.date_created ?? 0).getTime()
    );
  })[0] ?? null;
}

async function resolveExternalReference({
  adminClient,
  externalReference,
  preferenceId,
}: {
  adminClient: ReturnType<typeof createClient>;
  externalReference: string | null;
  preferenceId: string | null;
}) {
  if (externalReference) {
    return externalReference;
  }

  if (!preferenceId) {
    return null;
  }

  const paymentAttemptResponse = await adminClient
    .from("payment_attempts")
    .select("external_reference")
    .eq("preference_id", preferenceId)
    .maybeSingle<LocalPaymentReferenceRow>();

  if (paymentAttemptResponse.data?.external_reference) {
    return paymentAttemptResponse.data.external_reference;
  }

  const orderResponse = await adminClient
    .from("orders")
    .select("external_reference")
    .eq("mercadopago_preference_id", preferenceId)
    .maybeSingle<LocalPaymentReferenceRow>();

  return orderResponse.data?.external_reference ?? null;
}

async function fetchMercadoPagoPaymentById({
  accessToken,
  paymentId,
}: {
  accessToken: string;
  paymentId: string;
}) {
  const mercadoPagoResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "GET",
  });
  const paymentPayload =
    (await mercadoPagoResponse.json().catch(() => null)) as MercadoPagoPaymentResponse | null;

  return mercadoPagoResponse.ok && paymentPayload?.id ? paymentPayload : null;
}

async function searchMercadoPagoPaymentByExternalReference({
  accessToken,
  externalReference,
}: {
  accessToken: string;
  externalReference: string;
}) {
  const searchUrl = new URL("https://api.mercadopago.com/v1/payments/search");

  searchUrl.searchParams.set("external_reference", externalReference);
  searchUrl.searchParams.set("sort", "date_created");
  searchUrl.searchParams.set("criteria", "desc");

  const mercadoPagoResponse = await fetch(searchUrl.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "GET",
  });
  const searchPayload =
    (await mercadoPagoResponse.json().catch(() => null)) as MercadoPagoPaymentSearchResponse | null;

  if (!mercadoPagoResponse.ok) {
    return null;
  }

  return chooseBestPaymentForReference(searchPayload?.results, externalReference);
}

async function processMercadoPagoPayment({
  adminClient,
  paymentPayload,
}: {
  adminClient: ReturnType<typeof createClient>;
  paymentPayload: MercadoPagoPaymentResponse;
}) {
  if (!paymentPayload.external_reference) {
    throw new Error("El pago de Mercado Pago no tiene external_reference.");
  }

  const mappedStatus = mapMercadoPagoStatus(paymentPayload.status);
  const nowIso = new Date().toISOString();
  const expirationState = await getOrderExpirationStateByExternalReference(
    adminClient,
    paymentPayload.external_reference,
    new Date(nowIso),
  );

  if (
    expirationState?.isExpired &&
    expirationState.payment_status !== "approved" &&
    expirationState.payment_status !== "authorized"
  ) {
    await expirePendingCheckoutByExternalReference(
      adminClient,
      paymentPayload.external_reference,
      new Date(nowIso),
    );

    return {
      orderId: expirationState.id,
      orderStatus: "cancelled",
      paymentStatus: "cancelled",
      returnPath: "/checkout/fallo",
    } as const;
  }

  await adminClient
    .from("payment_attempts")
    .update({
      last_webhook_at: nowIso,
      merchant_order_id: paymentPayload.order?.id ? String(paymentPayload.order.id) : null,
      payment_id: String(paymentPayload.id),
      raw_payload: paymentPayload,
      status: mappedStatus.paymentStatus,
    })
    .eq("external_reference", paymentPayload.external_reference);

  const orderUpdatePayload: Record<string, string | null> = {
    mercadopago_merchant_order_id: paymentPayload.order?.id
      ? String(paymentPayload.order.id)
      : null,
    mercadopago_payment_id: String(paymentPayload.id),
    payment_status: mappedStatus.paymentStatus,
    status: mappedStatus.orderStatus,
  };

  if (mappedStatus.paymentStatus === "approved") {
    orderUpdatePayload.paid_at = nowIso;
  }

  if (mappedStatus.paymentStatus === "cancelled") {
    orderUpdatePayload.cancelled_at = nowIso;
  }

  const { data: order, error: orderUpdateError } = await adminClient
    .from("orders")
    .update(orderUpdatePayload)
    .eq("external_reference", paymentPayload.external_reference)
    .select("id")
    .single<{ id: string }>();

  if (orderUpdateError || !order) {
    throw new Error("No pudimos actualizar la orden asociada al pago.");
  }

  if (mappedStatus.paymentStatus === "approved") {
    const { error: inventoryError } = await adminClient.rpc("apply_paid_order_inventory", {
      target_order_id: order.id,
    });

    if (inventoryError) {
      throw new Error(inventoryError.message);
    }

    const { data: sourceOrderItems, error: sourceOrderItemsError } = await adminClient
      .from("order_items")
      .select("source_cart_item_id")
      .eq("order_id", order.id)
      .not("source_cart_item_id", "is", null);

    if (sourceOrderItemsError) {
      throw new Error(sourceOrderItemsError.message);
    }

    const sourceCartItemIds = (sourceOrderItems ?? [])
      .map((item) => item.source_cart_item_id)
      .filter((value): value is string => Boolean(value));

    if (sourceCartItemIds.length > 0) {
      const { error: cartItemsDeleteError } = await adminClient
        .from("cart_items")
        .delete()
        .in("id", sourceCartItemIds);

      if (cartItemsDeleteError) {
        throw new Error(cartItemsDeleteError.message);
      }
    }

    const { data: checkoutCarts, error: cartsUpdateError } = await adminClient
      .from("carts")
      .update({ converted_order_id: null, updated_at: nowIso })
      .eq("converted_order_id", order.id)
      .eq("status", "active")
      .select("id");

    if (cartsUpdateError) {
      throw new Error(cartsUpdateError.message);
    }

    for (const cart of checkoutCarts ?? []) {
      const { count, error: remainingItemsError } = await adminClient
        .from("cart_items")
        .select("id", { count: "exact", head: true })
        .eq("cart_id", cart.id);

      if (remainingItemsError) {
        throw new Error(remainingItemsError.message);
      }

      if ((count ?? 0) === 0) {
        const { error: convertedCartError } = await adminClient
          .from("carts")
          .update({ status: "converted", updated_at: nowIso })
          .eq("id", cart.id)
          .eq("status", "active");

        if (convertedCartError) {
          throw new Error(convertedCartError.message);
        }
      }
    }
  }

  if (mappedStatus.paymentStatus === "cancelled" || mappedStatus.paymentStatus === "rejected") {
    await adminClient
      .from("carts")
      .update({ converted_order_id: null, updated_at: nowIso })
      .eq("converted_order_id", order.id)
      .eq("status", "active");
  }

  return { orderId: order.id, ...mappedStatus };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const appBaseUrl = getRequiredEnv("APP_BASE_URL").replace(/\/$/, "");
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const supabaseServiceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const mercadoPagoConfig = getMercadoPagoConfig();
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    const requestUrl = new URL(request.url);
    const result = requestUrl.searchParams.get("result") ?? "pending";
    const returnBaseUrl = resolveReturnBaseUrl(
      requestUrl.searchParams.get("return_to"),
      appBaseUrl,
    );
    const fallbackPath =
      result === "success"
        ? "/checkout/exito"
        : result === "failure"
          ? "/checkout/fallo"
          : "/checkout/pendiente";
    const paymentId =
      requestUrl.searchParams.get("payment_id") ??
      requestUrl.searchParams.get("collection_id") ??
      null;
    const externalReference = requestUrl.searchParams.get("external_reference");
    const preferenceId = requestUrl.searchParams.get("preference_id");
    const resolvedExternalReference = await resolveExternalReference({
      adminClient,
      externalReference,
      preferenceId,
    });
    const paymentPayload =
      (paymentId
        ? await fetchMercadoPagoPaymentById({
            accessToken: mercadoPagoConfig.accessToken,
            paymentId,
          })
        : null) ??
      (resolvedExternalReference
        ? await searchMercadoPagoPaymentByExternalReference({
            accessToken: mercadoPagoConfig.accessToken,
            externalReference: resolvedExternalReference,
          })
        : null);

    if (!paymentPayload?.id) {
      const expirationResult = await expirePendingCheckoutByExternalReference(
        adminClient,
        resolvedExternalReference ?? externalReference,
      );

      if (expirationResult.expired) {
        return redirectResponse(
          appendReturnParams(`${returnBaseUrl}/checkout/fallo`, {
            external_reference: resolvedExternalReference ?? externalReference,
            order_id: expirationResult.orderId,
            payment_id: paymentId,
            preference_id: preferenceId,
            sync: "expired",
          }),
        );
      }

      return redirectResponse(
        appendReturnParams(`${returnBaseUrl}/checkout/pendiente`, {
          external_reference: resolvedExternalReference ?? externalReference,
          payment_id: paymentId,
          preference_id: preferenceId,
          sync: paymentId ? "payment_fetch_failed" : "payment_not_found",
        }),
      );
    }

    const processedPayment = await processMercadoPagoPayment({ adminClient, paymentPayload });

    return redirectResponse(
      appendReturnParams(`${returnBaseUrl}${processedPayment.returnPath}`, {
        external_reference: paymentPayload.external_reference ?? externalReference,
        order_id: processedPayment.orderId,
        payment_id: String(paymentPayload.id),
        preference_id: preferenceId,
        sync: "ok",
      }),
    );
  } catch (error) {
    const appBaseUrl = Deno.env.get("APP_BASE_URL") ?? "http://localhost:5173";
    const requestUrl = new URL(request.url);
    const returnBaseUrl = resolveReturnBaseUrl(
      requestUrl.searchParams.get("return_to"),
      appBaseUrl,
    );
    const message = error instanceof Error ? error.message : "sync_error";

    return redirectResponse(
      appendReturnParams(`${returnBaseUrl}/checkout/pendiente`, {
        sync: "error",
        sync_error: message.slice(0, 120),
      }),
    );
  }
});

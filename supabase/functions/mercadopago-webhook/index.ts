import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders } from "../_shared/cors.ts";
import {
  expirePendingCheckoutByExternalReference,
  getOrderExpirationStateByExternalReference,
} from "../_shared/checkout-expiration.ts";
import {
  getMercadoPagoConfig,
  getMercadoPagoWebhookSecret,
} from "../_shared/mercadopago-config.ts";

type MercadoPagoWebhookBody = {
  action?: string;
  api_version?: string;
  data?: {
    id?: string | number;
  };
  date_created?: string;
  id?: string | number;
  live_mode?: boolean;
  type?: string;
};

type MercadoPagoPaymentResponse = {
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

function mapMercadoPagoStatus(status: string | null | undefined) {
  switch (status) {
    case "approved":
      return {
        orderStatus: "paid",
        paymentStatus: "approved",
      } as const;
    case "authorized":
      return {
        orderStatus: "pending",
        paymentStatus: "authorized",
      } as const;
    case "in_process":
    case "pending":
      return {
        orderStatus: "pending",
        paymentStatus: "in_process",
      } as const;
    case "rejected":
      return {
        orderStatus: "failed",
        paymentStatus: "rejected",
      } as const;
    case "cancelled":
      return {
        orderStatus: "cancelled",
        paymentStatus: "cancelled",
      } as const;
    case "refunded":
      return {
        orderStatus: "refunded",
        paymentStatus: "refunded",
      } as const;
    case "charged_back":
      return {
        orderStatus: "failed",
        paymentStatus: "charged_back",
      } as const;
    default:
      return {
        orderStatus: "pending",
        paymentStatus: "pending",
      } as const;
  }
}

function parseMercadoPagoSignature(signatureHeader: string | null) {
  if (!signatureHeader) {
    return null;
  }

  const signatureParts = new Map(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=", 2);

      return [key?.trim(), value?.trim()] as const;
    }),
  );
  const timestamp = signatureParts.get("ts");
  const signature = signatureParts.get("v1");

  if (!timestamp || !signature) {
    return null;
  }

  return {
    signature,
    timestamp,
  };
}

function toHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let result = 0;

  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return result === 0;
}

async function validateMercadoPagoSignature({
  requestUrl,
  resourceId,
  secret,
  signatureHeader,
  xRequestId,
}: {
  requestUrl: URL;
  resourceId: string;
  secret: string;
  signatureHeader: string | null;
  xRequestId: string | null;
}) {
  const parsedSignature = parseMercadoPagoSignature(signatureHeader);
  const dataId = requestUrl.searchParams.get("data.id") ?? resourceId;

  if (!parsedSignature || !dataId || !xRequestId) {
    return false;
  }

  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    {
      hash: "SHA-256",
      name: "HMAC",
    },
    false,
    ["sign"],
  );
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${parsedSignature.timestamp};`;
  const signatureBytes = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(manifest));
  const expectedSignature = toHex(signatureBytes);

  return timingSafeEqualHex(expectedSignature, parsedSignature.signature);
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
    const mercadoPagoConfig = getMercadoPagoConfig();
    const mercadoPagoWebhookSecret = getMercadoPagoWebhookSecret(mercadoPagoConfig.environment);
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    const requestUrl = new URL(request.url);
    const body =
      (await request.json().catch(() => ({}))) as MercadoPagoWebhookBody;
    const eventType = body.type ?? requestUrl.searchParams.get("type") ?? "unknown";
    const action = body.action ?? requestUrl.searchParams.get("action");
    const resourceId = String(
      body.data?.id ?? requestUrl.searchParams.get("data.id") ?? "",
    ).trim();
    const externalEventId = String(body.id ?? "").trim() || null;
    const headers = Object.fromEntries(request.headers.entries());

    if (mercadoPagoWebhookSecret) {
      const isValidWebhookSignature = await validateMercadoPagoSignature({
        requestUrl,
        resourceId,
        secret: mercadoPagoWebhookSecret,
        signatureHeader: request.headers.get("x-signature"),
        xRequestId: request.headers.get("x-request-id"),
      });

      if (!isValidWebhookSignature) {
        return jsonResponse({ error: "Invalid Mercado Pago webhook signature." }, 401);
      }
    }

    const { data: webhookEvent, error: webhookInsertError } = await adminClient
      .from("payment_webhook_events")
      .upsert(
        {
          action: action ?? null,
          event_type: eventType,
          external_event_id: externalEventId,
          headers,
          payload: body,
          processed_at: null,
          processing_error: null,
          provider: "mercadopago",
          resource_id: resourceId || null,
        },
        {
          onConflict: "provider,external_event_id",
        },
      )
      .select("id")
      .single<{ id: string }>();

    if (webhookInsertError || !webhookEvent) {
      return jsonResponse({ error: "No pudimos registrar el webhook." }, 500);
    }

    if (!resourceId || eventType !== "payment") {
      await adminClient
        .from("payment_webhook_events")
        .update({
          processed_at: new Date().toISOString(),
        })
        .eq("id", webhookEvent.id);

      return jsonResponse({ received: true });
    }

    const mercadoPagoResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${resourceId}`,
      {
        headers: {
          Authorization: `Bearer ${mercadoPagoConfig.accessToken}`,
          "Content-Type": "application/json",
        },
        method: "GET",
      },
    );

    const paymentPayload =
      (await mercadoPagoResponse.json().catch(() => null)) as MercadoPagoPaymentResponse | null;

    if (!mercadoPagoResponse.ok || !paymentPayload?.id || !paymentPayload.external_reference) {
      await adminClient
        .from("payment_webhook_events")
        .update({
          processing_error: "No pudimos recuperar el pago desde Mercado Pago.",
        })
        .eq("id", webhookEvent.id);

      return jsonResponse({ error: "No pudimos recuperar el pago desde Mercado Pago." }, 502);
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

      await adminClient
        .from("payment_webhook_events")
        .update({
          processed_at: nowIso,
          processing_error: null,
        })
        .eq("id", webhookEvent.id);

      return jsonResponse({ expired: true, received: true });
    }

    await adminClient
      .from("payment_attempts")
      .update({
        last_webhook_at: nowIso,
        merchant_order_id: paymentPayload.order?.id
          ? String(paymentPayload.order.id)
          : null,
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
      await adminClient
        .from("payment_webhook_events")
        .update({
          processing_error: "No pudimos actualizar la orden asociada al pago.",
        })
        .eq("id", webhookEvent.id);

      return jsonResponse({ error: "No pudimos actualizar la orden." }, 500);
    }

    if (mappedStatus.paymentStatus === "approved") {
      const { error: inventoryError } = await adminClient.rpc("apply_paid_order_inventory", {
        target_order_id: order.id,
      });

      if (inventoryError) {
        await adminClient
          .from("payment_webhook_events")
          .update({
            processing_error: inventoryError.message,
          })
          .eq("id", webhookEvent.id);

        return jsonResponse({ error: "No pudimos aplicar el stock pagado." }, 500);
      }

      const { data: sourceOrderItems, error: sourceOrderItemsError } = await adminClient
        .from("order_items")
        .select("source_cart_item_id")
        .eq("order_id", order.id)
        .not("source_cart_item_id", "is", null);

      if (sourceOrderItemsError) {
        await adminClient
          .from("payment_webhook_events")
          .update({
            processing_error: sourceOrderItemsError.message,
          })
          .eq("id", webhookEvent.id);

        return jsonResponse({ error: "No pudimos identificar los items pagados." }, 500);
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
          await adminClient
            .from("payment_webhook_events")
            .update({
              processing_error: cartItemsDeleteError.message,
            })
            .eq("id", webhookEvent.id);

          return jsonResponse({ error: "No pudimos limpiar los items pagados." }, 500);
        }
      }

      const { data: checkoutCarts, error: cartsUpdateError } = await adminClient
        .from("carts")
        .update({
          converted_order_id: null,
          updated_at: nowIso,
        })
        .eq("converted_order_id", order.id)
        .eq("status", "active")
        .select("id");

      if (cartsUpdateError) {
        await adminClient
          .from("payment_webhook_events")
          .update({
            processing_error: cartsUpdateError.message,
          })
          .eq("id", webhookEvent.id);

        return jsonResponse({ error: "No pudimos actualizar el carrito pagado." }, 500);
      }

      const checkoutCartIds = (checkoutCarts ?? []).map((cart) => cart.id);

      for (const cartId of checkoutCartIds) {
        const { count, error: remainingItemsError } = await adminClient
          .from("cart_items")
          .select("id", { count: "exact", head: true })
          .eq("cart_id", cartId);

        if (remainingItemsError) {
          await adminClient
            .from("payment_webhook_events")
            .update({
              processing_error: remainingItemsError.message,
            })
            .eq("id", webhookEvent.id);

          return jsonResponse({ error: "No pudimos revisar el carrito pagado." }, 500);
        }

        if ((count ?? 0) === 0) {
          const { error: convertedCartError } = await adminClient
            .from("carts")
            .update({
              status: "converted",
              updated_at: nowIso,
            })
            .eq("id", cartId)
            .eq("status", "active");

          if (convertedCartError) {
            await adminClient
              .from("payment_webhook_events")
              .update({
                processing_error: convertedCartError.message,
              })
              .eq("id", webhookEvent.id);

            return jsonResponse({ error: "No pudimos cerrar el carrito pagado." }, 500);
          }
        }
      }
    }

    if (mappedStatus.paymentStatus === "cancelled" || mappedStatus.paymentStatus === "rejected") {
      await adminClient
        .from("carts")
        .update({
          converted_order_id: null,
          updated_at: nowIso,
        })
        .eq("converted_order_id", order.id)
        .eq("status", "active");
    }

    await adminClient
      .from("payment_webhook_events")
      .update({
        processed_at: nowIso,
        processing_error: null,
      })
      .eq("id", webhookEvent.id);

    return jsonResponse({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected webhook error.";

    return jsonResponse({ error: message }, 500);
  }
});

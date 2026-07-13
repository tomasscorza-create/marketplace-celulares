import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders } from "../_shared/cors.ts";
import {
  expirePendingCheckouts,
  getCheckoutExpirationDate,
} from "../_shared/checkout-expiration.ts";
import { getMercadoPagoConfig } from "../_shared/mercadopago-config.ts";
import {
  calculateCordobaShippingAmount,
  calculateHaversineDistanceKm,
  isCordobaProvince,
} from "../_shared/shipping-rate.ts";
import { validateMadeToOrderSelection } from "../_shared/product-config.ts";
import {
  type ArtisanProfileRow,
  type BuyerPreferenceRow,
  type CartItemRow,
  type CartRow,
  type CheckoutRequestBody,
  MARKETPLACE_DISPATCH_POINT,
  type MercadoPagoPreferenceResponse,
  type NormalizedCheckoutItem,
  type ProductRow,
  type ProfileRow,
  buildCheckoutReturnUrl,
  cleanNullableText,
  getRequiredEnv,
  isMissingBuyerPreferencesError,
  isMissingColumnError,
  jsonResponse,
  normalizeDeliveryType,
  resolveCheckoutReturnBaseUrl,
} from "./checkout-support.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const supabaseAnonKey = getRequiredEnv("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const mercadoPagoConfig = getMercadoPagoConfig();
    const appBaseUrl = getRequiredEnv("APP_BASE_URL");
    const webhookBaseUrl = getRequiredEnv("WEBHOOK_BASE_URL");

    const authHeader = request.headers.get("Authorization");

    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header." }, 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    await expirePendingCheckouts(adminClient);

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized." }, 401);
    }

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("id", user.id)
      .single<ProfileRow>();

    if (profileError || !profile) {
      return jsonResponse({ error: "No pudimos validar tu cuenta." }, 403);
    }

    if (profile.role !== "buyer") {
      return jsonResponse({ error: "Solo compradores pueden iniciar el checkout." }, 403);
    }

    const requestBody = (await request.json().catch(() => ({}))) as CheckoutRequestBody;
    const checkoutReturnBaseUrl = resolveCheckoutReturnBaseUrl(
      request,
      appBaseUrl,
      requestBody.returnOrigin,
    );

    const buyerPreferencesResponse = await adminClient
      .from("buyer_preferences")
      .select(
        "buyer_id, phone, preferred_delivery_type, delivery_notes, shipping_address, shipping_address_details, shipping_latitude, shipping_longitude",
      )
      .eq("buyer_id", user.id)
      .maybeSingle<BuyerPreferenceRow>();

    const fallbackBuyerPreferencesResponse =
      buyerPreferencesResponse.error &&
      (isMissingColumnError(buyerPreferencesResponse.error, "shipping_address") ||
        isMissingColumnError(buyerPreferencesResponse.error, "shipping_address_details") ||
        isMissingColumnError(buyerPreferencesResponse.error, "shipping_latitude") ||
        isMissingColumnError(buyerPreferencesResponse.error, "shipping_longitude"))
        ? await adminClient
            .from("buyer_preferences")
            .select("buyer_id, phone, preferred_delivery_type, delivery_notes, shipping_address")
            .eq("buyer_id", user.id)
            .maybeSingle<
              Omit<
                BuyerPreferenceRow,
                "shipping_address_details" | "shipping_latitude" | "shipping_longitude"
              >
            >()
        : null;

    const buyerPreferences = buyerPreferencesResponse.data ??
      (fallbackBuyerPreferencesResponse?.data
        ? {
            ...fallbackBuyerPreferencesResponse.data,
            shipping_address_details: null,
            shipping_latitude: null,
            shipping_longitude: null,
          }
        : null);
    const buyerPreferencesError =
      buyerPreferencesResponse.error &&
      !isMissingColumnError(buyerPreferencesResponse.error, "shipping_address") &&
      !isMissingColumnError(buyerPreferencesResponse.error, "shipping_address_details") &&
      !isMissingColumnError(buyerPreferencesResponse.error, "shipping_latitude") &&
      !isMissingColumnError(buyerPreferencesResponse.error, "shipping_longitude")
        ? buyerPreferencesResponse.error
        : fallbackBuyerPreferencesResponse?.error ?? null;

    if (
      buyerPreferencesError &&
      !isMissingBuyerPreferencesError(buyerPreferencesError)
    ) {
      return jsonResponse({ error: "No pudimos leer tus datos de compra." }, 400);
    }

    const buyerPhone =
      cleanNullableText(requestBody.buyerPhone) ?? cleanNullableText(buyerPreferences?.phone) ?? "";
    const deliveryType = normalizeDeliveryType(
      requestBody.deliveryType ?? buyerPreferences?.preferred_delivery_type ?? undefined,
    );
    const requestedShippingAddress =
      cleanNullableText(requestBody.shippingAddress) ??
      cleanNullableText(buyerPreferences?.shipping_address);
    const shippingAddress = deliveryType === "shipping" ? requestedShippingAddress : null;
    const deliveryNotes =
      cleanNullableText(requestBody.deliveryNotes) ??
      cleanNullableText(buyerPreferences?.delivery_notes);

    if (!buyerPhone) {
      return jsonResponse(
        { error: "Necesitas un telefono de contacto antes de iniciar el pago." },
        409,
      );
    }

    let shippingAmount = 0;

    if (deliveryType === "shipping") {
      if (!shippingAddress) {
        return jsonResponse(
          { error: "Necesitas una direccion de entrega antes de iniciar el pago." },
          409,
        );
      }

      const buyerProvinceName =
        cleanNullableText(requestBody.shippingProvinceName) ??
        buyerPreferences?.shipping_address_details?.provinceName ??
        null;

      if (!isCordobaProvince(buyerProvinceName)) {
        return jsonResponse(
          { error: "Por ahora el envio con tarifa automatica solo esta disponible dentro de Cordoba." },
          409,
        );
      }

      const shippingLatitude =
        typeof requestBody.shippingLatitude === "number"
          ? requestBody.shippingLatitude
          : buyerPreferences?.shipping_address_details?.latitude ?? buyerPreferences?.shipping_latitude ?? null;
      const shippingLongitude =
        typeof requestBody.shippingLongitude === "number"
          ? requestBody.shippingLongitude
          : buyerPreferences?.shipping_address_details?.longitude ??
            buyerPreferences?.shipping_longitude ??
            null;

      if (typeof shippingLatitude !== "number" || typeof shippingLongitude !== "number") {
        return jsonResponse(
          { error: "Todavia no pudimos ubicar esa direccion para calcular el envio." },
          409,
        );
      }

      const shippingDistanceKm = calculateHaversineDistanceKm(
        {
          latitude: shippingLatitude,
          longitude: shippingLongitude,
        },
        MARKETPLACE_DISPATCH_POINT,
      );

      shippingAmount = calculateCordobaShippingAmount(shippingDistanceKm);
    }

    const { data: cart, error: cartError } = await adminClient
      .from("carts")
      .select("id, buyer_id, status, converted_order_id")
      .eq("buyer_id", user.id)
      .eq("status", "active")
      .single<CartRow>();

    if (cartError || !cart) {
      return jsonResponse({ error: "No encontramos un carrito activo para esta cuenta." }, 400);
    }

    if (cart.converted_order_id) {
      await adminClient
        .from("carts")
        .update({ converted_order_id: null })
        .eq("id", cart.id);
    }

    const { data: cartItems, error: cartItemsError } = await adminClient
      .from("cart_items")
      .select(
        "id, cart_id, product_id, artisan_id, quantity, unit_price, product_title, product_image_url, availability_mode, configuration_key, lead_time_days, selected_options, selected_options_summary",
      )
      .eq("cart_id", cart.id)
      .returns<CartItemRow[]>();

    if (cartItemsError) {
      return jsonResponse({ error: "No pudimos leer los productos del carrito." }, 400);
    }

    if (!cartItems || cartItems.length === 0) {
      return jsonResponse({ error: "El carrito está vacío." }, 400);
    }

    const productIds = cartItems.map((item) => item.product_id);
    const artisanIds = [...new Set(cartItems.map((item) => item.artisan_id))];

    const { data: products, error: productsError } = await adminClient
      .from("products")
      .select(
        "id, artisan_id, title, description, price, image_url, image_urls, is_active, availability_mode, stock_quantity, lead_time_days, made_to_order_options, categories(name)",
      )
      .in("id", productIds)
      .returns<ProductRow[]>();

    if (productsError || !products) {
      return jsonResponse({ error: "No pudimos validar los productos del carrito." }, 400);
    }

    const productMap = new Map(products.map((product) => [product.id, product]));

    const { data: artisanProfiles, error: artisanProfilesError } = await adminClient
      .from("profiles")
      .select("id, full_name, store_name")
      .in("id", artisanIds)
      .returns<ArtisanProfileRow[]>();

    if (artisanProfilesError || !artisanProfiles) {
      return jsonResponse({ error: "No pudimos validar los vendedores del carrito." }, 400);
    }

    const artisanProfileMap = new Map(
      artisanProfiles.map((profileRow) => [profileRow.id, profileRow]),
    );

    const normalizedItems: NormalizedCheckoutItem[] = [];

    for (const item of cartItems) {
      const product = productMap.get(item.product_id);

      if (!product || !product.is_active) {
        continue;
      }

      const quantity = Number(item.quantity);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        continue;
      }

      const artisanProfile = artisanProfileMap.get(item.artisan_id);

      if (product.availability_mode === "stock") {
        const stockQuantity = Number(product.stock_quantity ?? 0);
        const selectedOptions = Array.isArray(item.selected_options) ? item.selected_options : [];
        const selectedOptionsSummary = cleanNullableText(item.selected_options_summary);

        if (stockQuantity <= 0 || quantity > stockQuantity) {
          continue;
        }

        const unitPrice = Number(product.price);

        normalizedItems.push({
          artisan_id: item.artisan_id,
          artisan_name: artisanProfile?.full_name ?? null,
          availability_mode: "stock",
          category_name: product.categories?.name ?? null,
          lead_time_days: null,
          product_description: product.description,
          product_id: item.product_id,
          product_image_url: product.image_urls[0] ?? product.image_url,
          product_title: product.title,
          quantity,
          selected_options: selectedOptions,
          selected_options_summary: selectedOptionsSummary,
          source_cart_item_id: item.id,
          stock_quantity: stockQuantity,
          store_name: artisanProfile?.store_name ?? null,
          subtotal: Number((unitPrice * quantity).toFixed(2)),
          unit_price: unitPrice,
        });

        continue;
      }

      const selectedOptions = Array.isArray(item.selected_options) ? item.selected_options : [];
      let validatedSelection: ReturnType<typeof validateMadeToOrderSelection>;

      try {
        validatedSelection = validateMadeToOrderSelection(
          product.made_to_order_options ?? [],
          selectedOptions,
        );
      } catch {
        continue;
      }
      const unitPrice = Number(
        (Number(product.price) + validatedSelection.unitPriceModifier).toFixed(2),
      );

      normalizedItems.push({
        artisan_id: item.artisan_id,
        artisan_name: artisanProfile?.full_name ?? null,
        availability_mode: "made_to_order",
        category_name: product.categories?.name ?? null,
        lead_time_days: product.lead_time_days ?? item.lead_time_days ?? null,
        product_description: product.description,
        product_id: item.product_id,
        product_image_url: product.image_urls[0] ?? product.image_url,
        product_title: product.title,
        quantity,
        selected_options: validatedSelection.resolvedSelections,
        selected_options_summary: validatedSelection.selectedOptionsSummary,
        source_cart_item_id: item.id,
        stock_quantity: null,
        store_name: artisanProfile?.store_name ?? null,
        subtotal: Number((unitPrice * quantity).toFixed(2)),
        unit_price: unitPrice,
      });
    }

    if (normalizedItems.length === 0) {
      return jsonResponse(
        { error: "No hay piezas listas para pagar. Corregi las pendientes desde el carrito." },
        409,
      );
    }

    const subtotalAmount = Number(
      normalizedItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2),
    );
    const totalAmount = Number((subtotalAmount + shippingAmount).toFixed(2));
    const externalReference = `order_${crypto.randomUUID()}`;

    const orderInsertPayload = {
      buyer_email: profile.email,
      buyer_id: profile.id,
      buyer_name: profile.full_name,
      buyer_phone: buyerPhone,
      checkout_provider: "mercadopago",
      currency: "ARS",
      delivery_address: shippingAddress,
      delivery_notes: deliveryNotes,
      delivery_type: deliveryType,
      external_reference: externalReference,
      fees_amount: 0,
      fulfillment_status: "pending",
      payment_status: "pending",
      shipping_amount: shippingAmount,
      status: "pending",
      subtotal_amount: subtotalAmount,
      total_amount: totalAmount,
    };

    const orderInsertResponse = await adminClient
      .from("orders")
      .insert(orderInsertPayload)
      .select("id")
      .single<{ id: string }>();

    const fallbackOrderInsertResponse =
      orderInsertResponse.error && isMissingColumnError(orderInsertResponse.error, "delivery_address")
        ? await adminClient
            .from("orders")
            .insert({
              ...orderInsertPayload,
              delivery_address: undefined,
            })
            .select("id")
            .single<{ id: string }>()
        : null;

    const insertedOrder = orderInsertResponse.data ?? fallbackOrderInsertResponse?.data ?? null;
    const orderInsertError =
      orderInsertResponse.error &&
      !isMissingColumnError(orderInsertResponse.error, "delivery_address")
        ? orderInsertResponse.error
        : fallbackOrderInsertResponse?.error ?? null;

    if (orderInsertError || !insertedOrder) {
      return jsonResponse({ error: "No pudimos crear la orden interna." }, 500);
    }

    const orderId = insertedOrder.id;

    const { error: orderItemsError } = await adminClient.from("order_items").insert(
      normalizedItems.map((item) => ({
        artisan_id: item.artisan_id,
        artisan_name: item.artisan_name,
        availability_mode: item.availability_mode,
        category_name: item.category_name,
        lead_time_days: item.lead_time_days,
        order_id: orderId,
        product_description: item.product_description,
        product_id: item.product_id,
        product_image_url: item.product_image_url,
        product_title: item.product_title,
        quantity: item.quantity,
        selected_options: item.selected_options,
        selected_options_summary: item.selected_options_summary,
        source_cart_item_id: item.source_cart_item_id,
        store_name: item.store_name,
        subtotal: item.subtotal,
        unit_price: item.unit_price,
      })),
    );

    if (orderItemsError) {
      await adminClient.from("orders").delete().eq("id", orderId);
      return jsonResponse({ error: "No pudimos guardar los items de la orden." }, 500);
    }

    const { data: paymentAttempt, error: paymentAttemptError } = await adminClient
      .from("payment_attempts")
      .insert({
        amount: totalAmount,
        currency: "ARS",
        external_reference: externalReference,
        order_id: orderId,
        provider: "mercadopago",
        raw_payload: {},
        status: "created",
      })
      .select("id")
      .single<{ id: string }>();

    if (paymentAttemptError || !paymentAttempt) {
      await adminClient.from("order_items").delete().eq("order_id", orderId);
      await adminClient.from("orders").delete().eq("id", orderId);
      return jsonResponse({ error: "No pudimos preparar el intento de pago." }, 500);
    }

    const functionsBaseUrl = webhookBaseUrl.replace(/\/$/, "");
    const notificationUrl = `${functionsBaseUrl}/mercadopago-webhook`;
    const checkoutReturnUrl = `${functionsBaseUrl}/mercadopago-return`;
    const checkoutCreatedAt = new Date();
    const checkoutExpiresAt = getCheckoutExpirationDate(checkoutCreatedAt);
    const mercadoPagoBody = {
      auto_return: "approved",
      back_urls: {
        failure: buildCheckoutReturnUrl(checkoutReturnUrl, "failure", checkoutReturnBaseUrl),
        pending: buildCheckoutReturnUrl(checkoutReturnUrl, "pending", checkoutReturnBaseUrl),
        success: buildCheckoutReturnUrl(checkoutReturnUrl, "success", checkoutReturnBaseUrl),
      },
      date_of_expiration: checkoutExpiresAt.toISOString(),
      expiration_date_from: checkoutCreatedAt.toISOString(),
      expiration_date_to: checkoutExpiresAt.toISOString(),
      expires: true,
      external_reference: externalReference,
      items: normalizedItems.map((item) => ({
        currency_id: "ARS",
        description: item.selected_options_summary
          ? `${item.product_description}\n${item.selected_options_summary}`
          : item.product_description || undefined,
        id: item.product_id,
        picture_url: item.product_image_url || undefined,
        quantity: item.quantity,
        title: item.product_title,
        unit_price: item.unit_price,
      })).concat(
        shippingAmount > 0
          ? [
              {
                currency_id: "ARS",
                description: "Tarifa de envio dentro de Cordoba",
                id: "marketplace-shipping",
                quantity: 1,
                title: "Envio",
                unit_price: shippingAmount,
              },
            ]
          : [],
      ),
      metadata: {
        buyer_id: profile.id,
        order_id: orderId,
        payment_attempt_id: paymentAttempt.id,
      },
      notification_url: notificationUrl,
      payer: {
        email: profile.email,
        name: profile.full_name,
      },
      statement_descriptor: Deno.env.get("MERCADOPAGO_STATEMENT_DESCRIPTOR") ?? "MARKETPLACE",
    };

    const mercadoPagoResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      body: JSON.stringify(mercadoPagoBody),
      headers: {
        Authorization: `Bearer ${mercadoPagoConfig.accessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const mercadoPagoPayload =
      (await mercadoPagoResponse.json().catch(() => null)) as MercadoPagoPreferenceResponse | null;

    if (!mercadoPagoResponse.ok || !mercadoPagoPayload?.id || !mercadoPagoPayload.init_point) {
      await adminClient
        .from("payment_attempts")
        .update({
          raw_payload: mercadoPagoPayload ?? {},
          status: "failed",
        })
        .eq("id", paymentAttempt.id);

      await adminClient
        .from("orders")
        .update({
          payment_status: "rejected",
          status: "failed",
        })
        .eq("id", orderId);

      return jsonResponse(
        { error: "Mercado Pago no devolvió una preferencia válida para este checkout." },
        502,
      );
    }

    const checkoutUrl =
      mercadoPagoConfig.environment === "test"
        ? mercadoPagoPayload.sandbox_init_point ?? mercadoPagoPayload.init_point
        : mercadoPagoPayload.init_point;

    const { error: orderPreferenceUpdateError } = await adminClient
      .from("orders")
      .update({
        mercadopago_preference_id: mercadoPagoPayload.id,
      })
      .eq("id", orderId);

    if (orderPreferenceUpdateError) {
      await adminClient
        .from("payment_attempts")
        .update({
          raw_payload: {
            error: orderPreferenceUpdateError.message,
            mercado_pago_payload: mercadoPagoPayload,
          },
          status: "failed",
        })
        .eq("id", paymentAttempt.id);

      await adminClient
        .from("orders")
        .update({
          payment_status: "rejected",
          status: "failed",
        })
        .eq("id", orderId);

      return jsonResponse(
        { error: "No pudimos guardar la preferencia de pago en la orden." },
        500,
      );
    }

    const { error: cartConversionError } = await adminClient
      .from("carts")
      .update({
        converted_order_id: orderId,
      })
      .eq("id", cart.id);

    if (cartConversionError) {
      await adminClient
        .from("payment_attempts")
        .update({
          raw_payload: {
            error: cartConversionError.message,
            mercado_pago_payload: mercadoPagoPayload,
          },
          status: "failed",
        })
        .eq("id", paymentAttempt.id);

      await adminClient
        .from("orders")
        .update({
          payment_status: "rejected",
          status: "failed",
        })
        .eq("id", orderId);

      return jsonResponse(
        { error: "No pudimos asociar el carrito a la orden de pago." },
        500,
      );
    }

    const { error: paymentAttemptUpdateError } = await adminClient
      .from("payment_attempts")
      .update({
        checkout_url: checkoutUrl,
        preference_id: mercadoPagoPayload.id,
        raw_payload: mercadoPagoPayload,
        status: "pending",
      })
      .eq("id", paymentAttempt.id);

    if (paymentAttemptUpdateError) {
      await adminClient
        .from("orders")
        .update({
          payment_status: "rejected",
          status: "failed",
        })
        .eq("id", orderId);

      await adminClient
        .from("carts")
        .update({
          converted_order_id: null,
        })
        .eq("id", cart.id);

      return jsonResponse(
        { error: "No pudimos guardar el intento de pago de Mercado Pago." },
        500,
      );
    }

    return jsonResponse({
      checkoutUrl,
      externalReference,
      mercadoPagoEnvironment: mercadoPagoConfig.environment,
      orderId,
      paymentAttemptId: paymentAttempt.id,
      preferenceId: mercadoPagoPayload.id,
      sandboxCheckoutUrl: mercadoPagoPayload.sandbox_init_point ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected checkout error.";

    return jsonResponse({ error: message }, 500);
  }
});

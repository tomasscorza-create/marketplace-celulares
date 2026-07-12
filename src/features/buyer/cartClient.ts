import type {
  BuyerCartValidatedItem,
  BuyerCartValidation,
  CartItemRecord,
  CartRecord,
} from "../../types/commerce";
import type { BuyerPreferenceRecord } from "../../types/buyer";
import type { CartProductSelectionInput, PublicArtisanStorefront, PublicProduct } from "../../types/public";

import {
  calculateOptionPriceModifiers,
  createSelectedOptionsSummary,
  normalizeProductSelectionChoices,
} from "../../types/productAvailability";
import { getSupabaseClient } from "../../lib/supabase/client";

type CartRow = Omit<CartRecord, "items">;

type BuyerPreferenceCheckoutRow = Pick<
  BuyerPreferenceRecord,
  "buyer_id" | "delivery_notes" | "phone" | "preferred_delivery_type" | "shipping_address"
>;

const liveProductSelection =
  "id, artisan_id, category_id, title, description, price, image_url, image_urls, product_media, is_active, availability_mode, stock_quantity, lead_time_days, made_to_order_options, categories(name)";
const storefrontSelection = "id, full_name, store_name, profile_image_url";

function isNoRowError(error: { code?: string } | null) {
  return error?.code === "PGRST116";
}

function buildCartRecord(cartRow: CartRow, items: CartItemRecord[]) {
  return {
    ...cartRow,
    items,
  } satisfies CartRecord;
}

function buildEmptyValidation(cart: CartRecord | null, reason?: string): BuyerCartValidation {
  return {
    active_seller_count: 0,
    can_checkout: false,
    checkout_blockers: reason ? [reason] : [],
    checkout_notices: [],
    error_items_count: 0,
    items: [],
    missing_phone: false,
    missing_shipping_address: false,
    ready_items_count: 0,
    total_amount: 0,
    total_items: cart?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
    warning_items_count: 0,
  };
}

function getPrimaryProductImageUrl(
  product: Pick<PublicProduct, "image_url" | "image_urls" | "product_media">,
) {
  return (
    product.product_media?.[0]?.thumbnail_url ??
    product.product_media?.[0]?.url ??
    product.image_urls[0] ??
    product.image_url ??
    null
  );
}

async function loadCartItems(cartId: string) {
  const client = getSupabaseClient();

  return client
    .from("cart_items")
    .select(
      "id, cart_id, product_id, artisan_id, quantity, unit_price, product_title, product_image_url, availability_mode, configuration_key, lead_time_days, selected_options, selected_options_summary, created_at, updated_at",
    )
    .eq("cart_id", cartId)
    .order("created_at", { ascending: true })
    .returns<CartItemRecord[]>();
}

async function loadActiveCartRow(buyerId: string) {
  const client = getSupabaseClient();

  return client
    .from("carts")
    .select("id, buyer_id, status, converted_order_id, created_at, updated_at")
    .eq("buyer_id", buyerId)
    .eq("status", "active")
    .maybeSingle<CartRow>();
}

async function loadBuyerCheckoutPreferences(buyerId: string) {
  const client = getSupabaseClient();
  const richResponse = await client
    .from("buyer_preferences")
    .select("buyer_id, phone, preferred_delivery_type, delivery_notes, shipping_address")
    .eq("buyer_id", buyerId)
    .maybeSingle<BuyerPreferenceCheckoutRow>();

  if (!richResponse.error) {
    return {
      data: richResponse.data,
      error: null,
    };
  }

  const fallbackResponse = await client
    .from("buyer_preferences")
    .select("buyer_id, phone, preferred_delivery_type, delivery_notes")
    .eq("buyer_id", buyerId)
    .maybeSingle<Omit<BuyerPreferenceCheckoutRow, "shipping_address">>();

  if (fallbackResponse.error) {
    return {
      data: null as BuyerPreferenceCheckoutRow | null,
      error: fallbackResponse.error,
    };
  }

  return {
    data: fallbackResponse.data
      ? {
          ...fallbackResponse.data,
          shipping_address: null,
        }
      : null,
    error: null,
  };
}

async function loadLiveProducts(productIds: string[]) {
  const client = getSupabaseClient();

  if (productIds.length === 0) {
    return {
      data: [] as PublicProduct[],
      error: null,
    };
  }

  return client
    .from("products")
    .select(liveProductSelection)
    .in("id", productIds)
    .returns<PublicProduct[]>();
}

async function loadStorefronts(artisanIds: string[]) {
  const client = getSupabaseClient();

  if (artisanIds.length === 0) {
    return {
      data: [] as PublicArtisanStorefront[],
      error: null,
    };
  }

  return client
    .from("artisan_storefronts")
    .select(storefrontSelection)
    .in("id", artisanIds)
    .returns<PublicArtisanStorefront[]>();
}

async function clearCartCheckoutReference(cartId: string) {
  const client = getSupabaseClient();

  return client.from("carts").update({ converted_order_id: null }).eq("id", cartId);
}

function validateProductSelection(
  product: PublicProduct,
  item: CartItemRecord,
): { blockers: string[]; effectiveUnitPrice: number; effectiveLeadTimeDays: number | null; summary: string | null } {
  const blockers: string[] = [];
  const normalizedSelections = normalizeProductSelectionChoices(item.selected_options ?? []);
  const selectedOptionIds = new Set<string>();
  const validSelections = [];

  for (const selection of normalizedSelections) {
    const optionGroup = product.made_to_order_options.find((option) => option.id === selection.optionId);

    if (!optionGroup) {
      blockers.push("La configuracion elegida ya no coincide con las opciones disponibles.");
      continue;
    }

    if (selectedOptionIds.has(selection.optionId)) {
      blockers.push(`La opcion "${optionGroup.label}" necesita revision.`);
      continue;
    }

    const choice = optionGroup.choices.find((optionChoice) => optionChoice.id === selection.choiceId);

    if (!choice) {
      blockers.push(`La opcion "${optionGroup.label}" cambio y necesita revision.`);
      continue;
    }

    selectedOptionIds.add(selection.optionId);
    validSelections.push({
      ...selection,
      choiceLabel: choice.label,
      optionLabel: optionGroup.label,
      priceModifier: Number(choice.priceModifier) || 0,
    });
  }

  for (const optionGroup of product.made_to_order_options) {
    if (optionGroup.required && !selectedOptionIds.has(optionGroup.id)) {
      blockers.push(`Falta elegir "${optionGroup.label}" para continuar.`);
    }
  }

  const effectiveUnitPrice = Number(
    (Number(product.price) + calculateOptionPriceModifiers(validSelections)).toFixed(2),
  );

  return {
    blockers,
    effectiveLeadTimeDays: product.lead_time_days ?? item.lead_time_days ?? null,
    effectiveUnitPrice,
    summary: createSelectedOptionsSummary(validSelections),
  };
}

function buildValidatedItem(
  item: CartItemRecord,
  liveProduct: PublicProduct | undefined,
  storefront: PublicArtisanStorefront | undefined,
): BuyerCartValidatedItem {
  const blockers: string[] = [];
  const notices: string[] = [];
  let effectiveUnitPrice = Number(item.unit_price);
  let effectiveLeadTimeDays = item.lead_time_days ?? null;
  let summary = item.selected_options_summary;
  let isActive = false;
  let liveStockQuantity: number | null = null;
  let productImageUrl = item.product_image_url;
  let productImageUrls = item.product_image_url ? [item.product_image_url] : [];
  let productMedia: PublicProduct["product_media"] = [];
  let productTitle = item.product_title;
  let productBasePrice = Number(item.unit_price);
  let madeToOrderOptions: PublicProduct["made_to_order_options"] = [];
  let availabilityMode = item.availability_mode;
  let categoryName: string | null = null;

  if (!liveProduct) {
    blockers.push("Esta pieza ya no esta disponible en el catalogo.");
  } else {
    isActive = Boolean(liveProduct.is_active);
    productBasePrice = Number(liveProduct.price);
    productImageUrls = liveProduct.image_urls ?? [];
    productMedia = liveProduct.product_media ?? [];
    madeToOrderOptions = liveProduct.made_to_order_options ?? [];
    productImageUrl = getPrimaryProductImageUrl(liveProduct) ?? item.product_image_url;
    productTitle = liveProduct.title;
    availabilityMode = liveProduct.availability_mode;
    categoryName = liveProduct.categories?.name ?? null;

    if (!liveProduct.is_active) {
      blockers.push("Esta pieza fue pausada por el vendedor.");
    }

    if (liveProduct.availability_mode !== item.availability_mode) {
      blockers.push("La modalidad de venta cambio y necesita revision.");
    }

    if (item.availability_mode === "stock") {
      liveStockQuantity = Number(liveProduct.stock_quantity ?? 0);
      effectiveUnitPrice = Number(liveProduct.price);
      effectiveLeadTimeDays = null;

      if (liveStockQuantity <= 0) {
        blockers.push("Se quedo sin stock.");
      } else if (item.quantity > liveStockQuantity) {
        blockers.push(`Quedan ${liveStockQuantity} unidades disponibles.`);
      }
    }

    if (liveProduct.made_to_order_options.length > 0) {
      const selectionValidation = validateProductSelection(liveProduct, item);
      blockers.push(...selectionValidation.blockers);
      effectiveUnitPrice = selectionValidation.effectiveUnitPrice;
      effectiveLeadTimeDays = selectionValidation.effectiveLeadTimeDays;
      summary = selectionValidation.summary;
    } else if (item.availability_mode !== "stock") {
      effectiveLeadTimeDays = liveProduct.lead_time_days ?? item.lead_time_days ?? null;
    }

    if (Number(item.unit_price) !== effectiveUnitPrice) {
      notices.push("El precio fue actualizado.");
    }

    if (item.product_title !== liveProduct.title) {
      notices.push("La informacion del producto fue actualizada.");
    }

    if (
      liveProduct.made_to_order_options.length > 0 &&
      (item.lead_time_days ?? null) !== (effectiveLeadTimeDays ?? null)
    ) {
      notices.push("El tiempo estimado de produccion cambio.");
    }
  }

  const status: BuyerCartValidatedItem["status"] =
    blockers.length > 0 ? "error" : notices.length > 0 ? "warning" : "ready";

  return {
    artisan_id: item.artisan_id,
    artisan_name: storefront?.full_name ?? null,
    availability_mode: availabilityMode,
    blockers,
    cart_item_id: item.id,
    category_name: categoryName,
    configuration_key: item.configuration_key,
    effective_lead_time_days: effectiveLeadTimeDays,
    effective_line_total: Number((effectiveUnitPrice * item.quantity).toFixed(2)),
    effective_unit_price: effectiveUnitPrice,
    id: item.id,
    is_active: isActive,
    live_stock_quantity: liveStockQuantity,
    made_to_order_options: madeToOrderOptions,
    notices,
    product_base_price: productBasePrice,
    product_id: item.product_id,
    product_image_urls: productImageUrls,
    product_image_url: productImageUrl,
    product_media: productMedia,
    product_title: productTitle,
    quantity: item.quantity,
    selected_options: item.selected_options ?? [],
    selected_options_summary: summary,
    status,
    store_name: storefront?.store_name ?? null,
  };
}

export async function getBuyerActiveCart(buyerId: string) {
  const cartResponse = await loadActiveCartRow(buyerId);

  if (cartResponse.error) {
    if (isNoRowError(cartResponse.error)) {
      return {
        data: null as CartRecord | null,
        error: null,
      };
    }

    return {
      data: null as CartRecord | null,
      error: cartResponse.error,
    };
  }

  if (!cartResponse.data) {
    return {
      data: null as CartRecord | null,
      error: null,
    };
  }

  const itemsResponse = await loadCartItems(cartResponse.data.id);

  if (itemsResponse.error) {
    return {
      data: null as CartRecord | null,
      error: itemsResponse.error,
    };
  }

  return {
    data: buildCartRecord(cartResponse.data, itemsResponse.data ?? []),
    error: null,
  };
}

export async function getBuyerCartValidation(buyerId: string) {
  const [cartResponse, preferencesResponse] = await Promise.all([
    getBuyerActiveCart(buyerId),
    loadBuyerCheckoutPreferences(buyerId),
  ]);

  if (cartResponse.error) {
    return {
      data: null as BuyerCartValidation | null,
      error: cartResponse.error,
    };
  }

  if (preferencesResponse.error && !isNoRowError(preferencesResponse.error)) {
    return {
      data: null as BuyerCartValidation | null,
      error: preferencesResponse.error,
    };
  }

  const cart = cartResponse.data;

  if (!cart || (cart.items?.length ?? 0) === 0) {
    return {
      data: buildEmptyValidation(cart, "El carrito esta vacio."),
      error: null,
    };
  }

  const items = cart.items ?? [];
  const productIds = Array.from(new Set(items.map((item) => item.product_id)));
  const artisanIds = Array.from(new Set(items.map((item) => item.artisan_id)));
  const [productsResponse, storefrontsResponse] = await Promise.all([
    loadLiveProducts(productIds),
    loadStorefronts(artisanIds),
  ]);

  if (productsResponse.error) {
    return {
      data: null as BuyerCartValidation | null,
      error: productsResponse.error,
    };
  }

  if (storefrontsResponse.error) {
    return {
      data: null as BuyerCartValidation | null,
      error: storefrontsResponse.error,
    };
  }

  const productMap = new Map((productsResponse.data ?? []).map((product) => [product.id, product]));
  const storefrontMap = new Map((storefrontsResponse.data ?? []).map((storefront) => [storefront.id, storefront]));
  const validatedItems = items.map((item) =>
    buildValidatedItem(item, productMap.get(item.product_id), storefrontMap.get(item.artisan_id)),
  );
  const errorItemsCount = validatedItems.filter((item) => item.status === "error").length;
  const warningItemsCount = validatedItems.filter((item) => item.status === "warning").length;
  const readyItemsCount = validatedItems.filter((item) => item.status === "ready").length;
  const payableItems = validatedItems.filter((item) => item.status !== "error");
  const missingPhone = !(preferencesResponse.data?.phone ?? "").trim();
  const missingShippingAddress = !(preferencesResponse.data?.shipping_address ?? "").trim();
  const checkoutBlockers: string[] = [];
  const checkoutNotices: string[] = [];

  if (payableItems.length === 0) {
    checkoutBlockers.push("Todavia no hay piezas listas para pagar.");
  }

  if (errorItemsCount > 0 && payableItems.length > 0) {
    checkoutNotices.push("Las piezas con revision quedan separadas para corregir despues.");
  }

  if (missingPhone) {
    checkoutBlockers.push("Agrega un telefono de contacto para coordinar la compra.");
  }

  if (missingShippingAddress) {
    checkoutNotices.push("Conviene cargar una direccion de entrega antes de pagar.");
  }

  if (validatedItems.some((item) => item.availability_mode === "made_to_order")) {
    checkoutNotices.push("Hay piezas a pedido con tiempos de produccion propios.");
  }

  const activeSellerCount = new Set(payableItems.map((item) => item.artisan_id)).size;

  if (activeSellerCount > 1) {
    checkoutNotices.push(`Esta compra se va a coordinar con ${activeSellerCount} vendedores.`);
  }

  return {
    data: {
      active_seller_count: activeSellerCount,
      can_checkout: checkoutBlockers.length === 0,
      checkout_blockers: checkoutBlockers,
      checkout_notices: checkoutNotices,
      error_items_count: errorItemsCount,
      items: validatedItems,
      missing_phone: missingPhone,
      missing_shipping_address: missingShippingAddress,
      ready_items_count: readyItemsCount,
      total_amount: Number(
        payableItems.reduce((sum, item) => sum + item.effective_line_total, 0).toFixed(2),
      ),
      total_items: payableItems.reduce((sum, item) => sum + item.quantity, 0),
      warning_items_count: warningItemsCount,
    } satisfies BuyerCartValidation,
    error: null,
  };
}

export async function createBuyerCart(buyerId: string) {
  const client = getSupabaseClient();

  return client
    .from("carts")
    .insert({
      buyer_id: buyerId,
      status: "active",
    })
    .select("id, buyer_id, status, converted_order_id, created_at, updated_at")
    .single<CartRow>();
}

async function ensureBuyerCart(buyerId: string) {
  const activeCartResponse = await loadActiveCartRow(buyerId);

  if (activeCartResponse.error) {
    return {
      data: null as CartRecord | null,
      error: activeCartResponse.error,
    };
  }

  if (activeCartResponse.data) {
    return {
      data: buildCartRecord(activeCartResponse.data, []),
      error: null,
    };
  }

  const createResponse = await createBuyerCart(buyerId);

  if (createResponse.error || !createResponse.data) {
    return {
      data: null as CartRecord | null,
      error: createResponse.error,
    };
  }

  return {
    data: {
      ...createResponse.data,
      items: [],
    } satisfies CartRecord,
    error: null,
  };
}

export async function addProductToBuyerCart(
  buyerId: string,
  payload: {
    product: Pick<
      PublicProduct,
      | "artisan_id"
      | "availability_mode"
      | "id"
      | "image_url"
      | "image_urls"
      | "product_media"
      | "lead_time_days"
      | "price"
      | "stock_quantity"
      | "title"
    >;
    selection?: CartProductSelectionInput;
  },
) {
  const client = getSupabaseClient();
  const cartResponse = await ensureBuyerCart(buyerId);

  if (cartResponse.error || !cartResponse.data) {
    return {
      data: null as CartRecord | null,
      error: cartResponse.error,
    };
  }

  const cart = cartResponse.data;
  const product = payload.product;
  const selection = payload.selection;
  const existingItemResponse = await client
    .from("cart_items")
    .select(
      "id, cart_id, product_id, artisan_id, quantity, unit_price, product_title, product_image_url, availability_mode, configuration_key, lead_time_days, selected_options, selected_options_summary, created_at, updated_at",
    )
    .eq("cart_id", cart.id)
    .eq("product_id", product.id)
    .eq("configuration_key", selection?.configurationKey ?? "default")
    .maybeSingle<CartItemRecord>();

  if (existingItemResponse.error && !isNoRowError(existingItemResponse.error)) {
    return {
      data: null as CartRecord | null,
      error: existingItemResponse.error,
    };
  }

  const productImageUrl = getPrimaryProductImageUrl(product);
  const nextQuantity = (existingItemResponse.data?.quantity ?? 0) + 1;

  if (product.availability_mode === "stock" && nextQuantity > Number(product.stock_quantity ?? 0)) {
    return {
      data: null as CartRecord | null,
      error: {
        message:
          Number(product.stock_quantity ?? 0) <= 0
            ? "Este producto ya no tiene stock disponible."
            : "No hay suficiente stock disponible para sumar otra unidad.",
      },
    };
  }

  if (existingItemResponse.data) {
    const updateResponse = await client
      .from("cart_items")
      .update({
        availability_mode: product.availability_mode,
        configuration_key: selection?.configurationKey ?? "default",
        lead_time_days:
          product.availability_mode === "made_to_order"
            ? selection?.leadTimeDays ?? product.lead_time_days ?? null
            : null,
        product_image_url: productImageUrl,
        product_title: product.title,
        quantity: nextQuantity,
        selected_options: selection?.selectedOptions ?? [],
        selected_options_summary: selection?.selectedOptionsSummary ?? null,
        unit_price: selection?.unitPrice ?? product.price,
      })
      .eq("id", existingItemResponse.data.id);

    if (updateResponse.error) {
      return {
        data: null as CartRecord | null,
        error: updateResponse.error,
      };
    }
  } else {
    const insertResponse = await client.from("cart_items").insert({
      availability_mode: product.availability_mode,
      artisan_id: product.artisan_id,
      cart_id: cart.id,
      configuration_key: selection?.configurationKey ?? "default",
      lead_time_days:
        product.availability_mode === "made_to_order"
          ? selection?.leadTimeDays ?? product.lead_time_days ?? null
          : null,
      product_id: product.id,
      product_image_url: productImageUrl,
      product_title: product.title,
      quantity: 1,
      selected_options: selection?.selectedOptions ?? [],
      selected_options_summary: selection?.selectedOptionsSummary ?? null,
      unit_price: selection?.unitPrice ?? product.price,
    });

    if (insertResponse.error) {
      return {
        data: null as CartRecord | null,
        error: insertResponse.error,
      };
    }
  }

  await clearCartCheckoutReference(cart.id);

  const itemsResponse = await loadCartItems(cart.id);

  if (itemsResponse.error) {
    return {
      data: null as CartRecord | null,
      error: itemsResponse.error,
    };
  }

  return {
    data: buildCartRecord(cart, itemsResponse.data ?? []),
    error: null,
  };
}

export async function updateBuyerCartItemQuantity(
  buyerId: string,
  cartItemId: string,
  quantity: number,
) {
  const client = getSupabaseClient();

  if (quantity <= 0) {
    return removeBuyerCartItem(buyerId, cartItemId);
  }

  const cartItemResponse = await client
    .from("cart_items")
    .select("id, cart_id, product_id, availability_mode")
    .eq("id", cartItemId)
    .single<{
      availability_mode: PublicProduct["availability_mode"];
      cart_id: string;
      id: string;
      product_id: string;
    }>();

  if (cartItemResponse.error || !cartItemResponse.data) {
    return {
      data: null as CartRecord | null,
      error: cartItemResponse.error ?? { message: "No pudimos revisar este producto." },
    };
  }

  if (cartItemResponse.data.availability_mode === "stock") {
    const productResponse = await client
      .from("products")
      .select("stock_quantity")
      .eq("id", cartItemResponse.data.product_id)
      .single<{ stock_quantity: number | null }>();

    if (productResponse.error || !productResponse.data) {
      return {
        data: null as CartRecord | null,
        error: productResponse.error ?? { message: "No pudimos revisar el stock." },
      };
    }

    if (quantity > Number(productResponse.data.stock_quantity ?? 0)) {
      return {
        data: null as CartRecord | null,
        error: {
          message:
            Number(productResponse.data.stock_quantity ?? 0) <= 0
              ? "Este producto se quedo sin stock."
              : "La cantidad supera el stock disponible.",
        },
      };
    }
  }

  const response = await client.from("cart_items").update({ quantity }).eq("id", cartItemId);

  if (response.error) {
    return {
      data: null as CartRecord | null,
      error: response.error,
    };
  }

  await clearCartCheckoutReference(cartItemResponse.data.cart_id);

  return getBuyerActiveCart(buyerId);
}

export async function updateBuyerCartItemSelection(
  buyerId: string,
  payload: {
    cartItemId: string;
    product: Pick<
      PublicProduct,
      | "availability_mode"
      | "id"
      | "image_url"
      | "image_urls"
      | "lead_time_days"
      | "price"
      | "product_media"
      | "stock_quantity"
      | "title"
    >;
    selection?: CartProductSelectionInput;
  },
) {
  const client = getSupabaseClient();
  const currentItemResponse = await client
    .from("cart_items")
    .select(
      "id, cart_id, product_id, artisan_id, quantity, unit_price, product_title, product_image_url, availability_mode, configuration_key, lead_time_days, selected_options, selected_options_summary, created_at, updated_at",
    )
    .eq("id", payload.cartItemId)
    .single<CartItemRecord>();

  if (currentItemResponse.error || !currentItemResponse.data) {
    return {
      data: null as CartRecord | null,
      error: currentItemResponse.error ?? { message: "No pudimos revisar este producto." },
    };
  }

  const currentItem = currentItemResponse.data;
  const productImageUrl = getPrimaryProductImageUrl(payload.product);
  const targetConfigurationKey = payload.selection?.configurationKey ?? "default";

  if (
    payload.product.availability_mode === "stock" &&
    currentItem.quantity > Number(payload.product.stock_quantity ?? 0)
  ) {
    return {
      data: null as CartRecord | null,
      error: {
        message:
          Number(payload.product.stock_quantity ?? 0) <= 0
            ? "Este producto se quedo sin stock."
            : "La cantidad supera el stock disponible.",
      },
    };
  }

  const duplicateItemResponse = await client
    .from("cart_items")
    .select(
      "id, cart_id, product_id, artisan_id, quantity, unit_price, product_title, product_image_url, availability_mode, configuration_key, lead_time_days, selected_options, selected_options_summary, created_at, updated_at",
    )
    .eq("cart_id", currentItem.cart_id)
    .eq("product_id", payload.product.id)
    .eq("configuration_key", targetConfigurationKey)
    .neq("id", currentItem.id)
    .maybeSingle<CartItemRecord>();

  if (duplicateItemResponse.error && !isNoRowError(duplicateItemResponse.error)) {
    return {
      data: null as CartRecord | null,
      error: duplicateItemResponse.error,
    };
  }

  if (duplicateItemResponse.data) {
    const mergedQuantity = duplicateItemResponse.data.quantity + currentItem.quantity;

    if (
      payload.product.availability_mode === "stock" &&
      mergedQuantity > Number(payload.product.stock_quantity ?? 0)
    ) {
      return {
        data: null as CartRecord | null,
        error: {
          message: "La configuracion elegida supera el stock disponible.",
        },
      };
    }

    const updateDuplicateResponse = await client
      .from("cart_items")
      .update({
        availability_mode: payload.product.availability_mode,
        configuration_key: targetConfigurationKey,
        lead_time_days:
          payload.product.availability_mode === "made_to_order"
            ? payload.selection?.leadTimeDays ?? payload.product.lead_time_days ?? null
            : null,
        product_image_url: productImageUrl,
        product_title: payload.product.title,
        quantity: mergedQuantity,
        selected_options: payload.selection?.selectedOptions ?? [],
        selected_options_summary: payload.selection?.selectedOptionsSummary ?? null,
        unit_price: payload.selection?.unitPrice ?? payload.product.price,
      })
      .eq("id", duplicateItemResponse.data.id);

    if (updateDuplicateResponse.error) {
      return {
        data: null as CartRecord | null,
        error: updateDuplicateResponse.error,
      };
    }

    const deleteCurrentResponse = await client.from("cart_items").delete().eq("id", currentItem.id);

    if (deleteCurrentResponse.error) {
      return {
        data: null as CartRecord | null,
        error: deleteCurrentResponse.error,
      };
    }
  } else {
    const updateCurrentResponse = await client
      .from("cart_items")
      .update({
        availability_mode: payload.product.availability_mode,
        configuration_key: targetConfigurationKey,
        lead_time_days:
          payload.product.availability_mode === "made_to_order"
            ? payload.selection?.leadTimeDays ?? payload.product.lead_time_days ?? null
            : null,
        product_image_url: productImageUrl,
        product_title: payload.product.title,
        selected_options: payload.selection?.selectedOptions ?? [],
        selected_options_summary: payload.selection?.selectedOptionsSummary ?? null,
        unit_price: payload.selection?.unitPrice ?? payload.product.price,
      })
      .eq("id", currentItem.id);

    if (updateCurrentResponse.error) {
      return {
        data: null as CartRecord | null,
        error: updateCurrentResponse.error,
      };
    }
  }

  await clearCartCheckoutReference(currentItem.cart_id);
  return getBuyerActiveCart(buyerId);
}

export async function removeBuyerCartItem(buyerId: string, cartItemId: string) {
  const client = getSupabaseClient();
  const cartItemResponse = await client
    .from("cart_items")
    .select("cart_id")
    .eq("id", cartItemId)
    .maybeSingle<{ cart_id: string }>();
  const response = await client.from("cart_items").delete().eq("id", cartItemId);

  if (response.error) {
    return {
      data: null as CartRecord | null,
      error: response.error,
    };
  }

  if (cartItemResponse.data?.cart_id) {
    await clearCartCheckoutReference(cartItemResponse.data.cart_id);
  }

  return getBuyerActiveCart(buyerId);
}

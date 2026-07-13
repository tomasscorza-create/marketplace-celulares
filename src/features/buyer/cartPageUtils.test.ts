import type { BuyerCartValidatedItem } from "../../types/commerce";

import { describe, expect, it } from "vitest";

import {
  buildSellerCartGroups,
  getCartDeliveryTiming,
  getShippingSummary,
} from "./cartPageUtils";

function createCartItem(
  overrides: Partial<BuyerCartValidatedItem> = {},
): BuyerCartValidatedItem {
  return {
    artisan_id: "seller-1",
    artisan_name: "Nyzca Store",
    availability_mode: "stock",
    blockers: [],
    cart_item_id: "cart-item-1",
    category_name: "Fundas",
    configuration_key: "default",
    effective_lead_time_days: null,
    effective_line_total: 20000,
    effective_unit_price: 10000,
    id: "cart-item-1",
    is_active: true,
    live_stock_quantity: 10,
    made_to_order_options: [],
    notices: [],
    product_base_price: 10000,
    product_id: "product-1",
    product_image_url: null,
    product_image_urls: [],
    product_media: [],
    product_title: "Funda",
    quantity: 2,
    selected_options: [],
    selected_options_summary: null,
    status: "ready",
    store_name: "Nyzca Store",
    ...overrides,
  };
}

describe("cartPageUtils", () => {
  it("agrupa por vendedor, suma cantidades y conserva el peor estado", () => {
    const groups = buildSellerCartGroups([
      createCartItem(),
      createCartItem({
        cart_item_id: "cart-item-2",
        effective_line_total: 5000,
        product_id: "product-2",
        quantity: 1,
        status: "warning",
      }),
      createCartItem({
        artisan_id: "seller-2",
        artisan_name: null,
        cart_item_id: "cart-item-3",
        effective_line_total: 3000,
        product_id: "product-3",
        quantity: 1,
        status: "error",
        store_name: null,
      }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      artisanId: "seller-1",
      itemCount: 3,
      sellerStatus: "warning",
      totalAmount: 25000,
    });
    expect(groups[1]).toMatchObject({
      artisanName: "Vendedor",
      sellerStatus: "error",
      totalAmount: 3000,
    });
  });

  it("usa la mayor demora del carrito para retiro y envío", () => {
    const items = [
      createCartItem({ effective_lead_time_days: 2 }),
      createCartItem({ effective_lead_time_days: 5, product_id: "product-2" }),
    ];

    expect(getCartDeliveryTiming(items, "pickup").primaryLabel).toContain("5 dias");
    expect(getCartDeliveryTiming(items, "shipping").primaryLabel).toContain("5 dias");
  });

  it("bloquea el envío sin dirección o fuera de Córdoba", () => {
    const missingAddress = getShippingSummary({
      buyerDeliveryDistance: null,
      isCordobaShippingAddress: true,
      isGeocodingAddress: false,
      isShippingAddressMissingForCheckout: true,
      selectedDeliveryType: "shipping",
    });
    const outsideCordoba = getShippingSummary({
      buyerDeliveryDistance: { distanceKm: 4, label: "4 km" },
      isCordobaShippingAddress: false,
      isGeocodingAddress: false,
      isShippingAddressMissingForCheckout: false,
      selectedDeliveryType: "shipping",
    });

    expect(missingAddress).toMatchObject({ amount: 0, isReady: false });
    expect(missingAddress.reason).toContain("Completa la direccion");
    expect(outsideCordoba.reason).toContain("solo esta disponible dentro de Cordoba");
  });

  it("calcula el importe cuando la dirección está geolocalizada", () => {
    const summary = getShippingSummary({
      buyerDeliveryDistance: { distanceKm: 3, label: "3 km" },
      isCordobaShippingAddress: true,
      isGeocodingAddress: false,
      isShippingAddressMissingForCheckout: false,
      selectedDeliveryType: "shipping",
    });

    expect(summary).toMatchObject({ amount: 3200, isReady: true, reason: null });
  });
});

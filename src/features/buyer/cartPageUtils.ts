import type { BuyerCartValidatedItem } from "../../types/commerce";

import { marketplaceDispatchPoint } from "../../lib/commerce/dispatchPoint";
import { calculateCordobaShippingAmount } from "../../lib/commerce/shippingRate";
import { calculateHaversineDistanceKm, formatDistanceKm } from "../../lib/geo/distance";

export const PICKUP_ADDRESS = "Dr. T. Achaval Rodriguez 330, Cordoba";
export const SHIPPING_NOT_READY_LABEL = "Pendiente";

type CartDeliveryType = "pickup" | "shipping";

type Coordinates = {
  latitude: number;
  longitude: number;
};

type OptionalCoordinates = {
  latitude?: number | null;
  longitude?: number | null;
} | null | undefined;

type BuyerShippingCoordinates = {
  shipping_latitude?: number | null;
  shipping_longitude?: number | null;
} | null | undefined;

export type SellerCartGroup = {
  artisanId: string;
  artisanName: string;
  itemCount: number;
  items: BuyerCartValidatedItem[];
  sellerStatus: "ready" | "warning" | "error";
  storeName: string;
  totalAmount: number;
};

export type BuyerDeliveryDistance = {
  distanceKm: number;
  label: string;
};

export function getItemStatusClasses(status: "ready" | "warning" | "error") {
  switch (status) {
    case "error":
      return "border-brand-200 bg-[#FDF1EC] text-brand-500";
    case "warning":
      return "border-sun-200 bg-[#ECFEFF] text-[#0e7490]";
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

export function getItemStatusLabel(status: "ready" | "warning" | "error") {
  switch (status) {
    case "error":
      return "Requiere revision";
    case "warning":
      return "Actualizado";
    default:
      return "Listo";
  }
}

export function getAvailabilityLabel(item: {
  availability_mode: "stock" | "made_to_order";
  effective_lead_time_days: number | null;
  live_stock_quantity: number | null;
}) {
  if (item.availability_mode === "made_to_order") {
    if (item.effective_lead_time_days) {
      return `A pedido - hasta ${item.effective_lead_time_days} dias`;
    }

    return "A pedido";
  }

  if (item.live_stock_quantity === null) {
    return "Con stock";
  }

  return `${item.live_stock_quantity} disponibles`;
}

export function buildSellerCartGroups(items: BuyerCartValidatedItem[]) {
  const grouped = new Map<string, SellerCartGroup>();

  for (const item of items) {
    const existingGroup = grouped.get(item.artisan_id);
    const sellerStatus =
      item.status === "error"
        ? "error"
        : item.status === "warning" && existingGroup?.sellerStatus !== "error"
          ? "warning"
          : existingGroup?.sellerStatus ?? item.status;

    if (existingGroup) {
      existingGroup.items.push(item);
      existingGroup.itemCount += item.quantity;
      existingGroup.totalAmount += item.effective_line_total;
      existingGroup.sellerStatus = sellerStatus;
      continue;
    }

    grouped.set(item.artisan_id, {
      artisanId: item.artisan_id,
      artisanName: item.artisan_name ?? "Vendedor",
      itemCount: item.quantity,
      items: [item],
      sellerStatus,
      storeName: item.store_name ?? "Tienda independientel",
      totalAmount: item.effective_line_total,
    });
  }

  return Array.from(grouped.values());
}

export function getCartDeliveryTiming(
  items: BuyerCartValidatedItem[],
  selectedDeliveryType: CartDeliveryType,
) {
  const maxLeadTimeDays = items.reduce((currentMax, item) => {
    return Math.max(currentMax, item.effective_lead_time_days ?? 0);
  }, 0);
  const hasDelayedItems = maxLeadTimeDays > 0;

  if (selectedDeliveryType === "pickup") {
    return {
      detailLabel: hasDelayedItems ? `Hasta ${maxLeadTimeDays} dias` : "Retiro sab y dom",
      primaryLabel: hasDelayedItems
        ? `Hasta ${maxLeadTimeDays} dias para preparar`
        : "Disponible para retiro",
      secondaryLabel: "Sabado y domingo de 17 a 20",
      tertiaryLabel: "Punto de reunion sujeto a lluvia.",
    };
  }

  return {
    detailLabel: hasDelayedItems ? `Hasta ${maxLeadTimeDays} dias` : "24/48 hs",
    primaryLabel: hasDelayedItems
      ? `Hasta ${maxLeadTimeDays} dias para despacho`
      : "Envio estimado en 24/48 hs",
    secondaryLabel: hasDelayedItems
      ? "Tu pedido se entrega cuando la ultima pieza este lista."
      : "Todas las piezas del carrito estan listas.",
    tertiaryLabel: null,
  };
}

export function getBuyerDeliveryDistance({
  buyerPreferences,
  datasetCoordinates,
  exactAddressCoordinates,
  shippingAddressDetails,
}: {
  buyerPreferences: BuyerShippingCoordinates;
  datasetCoordinates: Coordinates | null;
  exactAddressCoordinates: Coordinates | null;
  shippingAddressDetails: OptionalCoordinates;
}): BuyerDeliveryDistance | null {
  const latitude =
    exactAddressCoordinates?.latitude ??
    shippingAddressDetails?.latitude ??
    buyerPreferences?.shipping_latitude ??
    datasetCoordinates?.latitude ??
    null;
  const longitude =
    exactAddressCoordinates?.longitude ??
    shippingAddressDetails?.longitude ??
    buyerPreferences?.shipping_longitude ??
    datasetCoordinates?.longitude ??
    null;

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }

  const distanceKm = calculateHaversineDistanceKm(
    {
      latitude,
      longitude,
    },
    {
      latitude: marketplaceDispatchPoint.latitude,
      longitude: marketplaceDispatchPoint.longitude,
    },
  );

  return {
    distanceKm,
    label: formatDistanceKm(distanceKm),
  };
}

export function getShippingSummary({
  buyerDeliveryDistance,
  isCordobaShippingAddress,
  isGeocodingAddress,
  isShippingAddressMissingForCheckout,
  selectedDeliveryType,
}: {
  buyerDeliveryDistance: BuyerDeliveryDistance | null;
  isCordobaShippingAddress: boolean;
  isGeocodingAddress: boolean;
  isShippingAddressMissingForCheckout: boolean;
  selectedDeliveryType: CartDeliveryType;
}) {
  if (selectedDeliveryType !== "shipping") {
    return {
      amount: 0,
      isReady: true,
      label: "Sin cargo",
      reason: null,
    };
  }

  if (isShippingAddressMissingForCheckout) {
    return {
      amount: 0,
      isReady: false,
      label: SHIPPING_NOT_READY_LABEL,
      reason: "Completa la direccion de entrega para calcular el envio.",
    };
  }

  if (!isCordobaShippingAddress) {
    return {
      amount: 0,
      isReady: false,
      label: SHIPPING_NOT_READY_LABEL,
      reason: "Por ahora el calculo de envio solo esta disponible dentro de Cordoba.",
    };
  }

  if (buyerDeliveryDistance) {
    const amount = calculateCordobaShippingAmount(buyerDeliveryDistance.distanceKm);

    return {
      amount,
      isReady: true,
      label: `$${Number(amount).toLocaleString("es-AR")}`,
      reason: null,
    };
  }

  if (isGeocodingAddress) {
    return {
      amount: 0,
      isReady: false,
      label: "Calculando",
      reason: "Estamos ubicando tu direccion para calcular el envio.",
    };
  }

  return {
    amount: 0,
    isReady: false,
    label: SHIPPING_NOT_READY_LABEL,
    reason: "Todavia no pudimos ubicar esa direccion para calcular el envio.",
  };
}

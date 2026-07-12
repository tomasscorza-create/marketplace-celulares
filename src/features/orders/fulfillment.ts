import type { DeliveryType, FulfillmentStatus } from "../../types/commerce";

export const fulfillmentLabels: Record<FulfillmentStatus, string> = {
  cancelled: "Cancelado",
  delivered: "Entregado",
  pending: "Nuevo",
  preparing: "En preparacion",
  ready: "Listo",
};

export const fulfillmentClasses: Record<FulfillmentStatus, string> = {
  cancelled: "bg-stone-200 text-stone-600",
  delivered: "bg-emerald-50 text-emerald-700",
  pending: "bg-[#CFFAFE] text-brand-500",
  preparing: "bg-[#E0F2FE] text-ocean-500",
  ready: "bg-emerald-50 text-emerald-700",
};

export function getDeliveryLabel(value: DeliveryType | string) {
  switch (value) {
    case "pickup":
      return "Retiro";
    case "shipping":
      return "Envio";
    default:
      return "A coordinar";
  }
}

export function getNextFulfillmentStatus(status: FulfillmentStatus): FulfillmentStatus | null {
  if (status === "pending") {
    return "preparing";
  }

  if (status === "preparing") {
    return "ready";
  }

  if (status === "ready") {
    return "delivered";
  }

  return null;
}

export function isOpenFulfillmentStatus(status: FulfillmentStatus) {
  return status !== "delivered" && status !== "cancelled";
}

type FulfillmentItem = {
  fulfillment_status: FulfillmentStatus;
};

export function getFulfillmentSummary(
  items: FulfillmentItem[] | null | undefined,
  fallbackStatus: FulfillmentStatus = "pending",
) {
  const safeItems = items ?? [];
  const totalItems = safeItems.length;

  if (totalItems === 0) {
    return {
      actionCount: isOpenFulfillmentStatus(fallbackStatus) ? 1 : 0,
      detail: isOpenFulfillmentStatus(fallbackStatus) ? "Pendiente" : "Completado",
      doneItems: isOpenFulfillmentStatus(fallbackStatus) ? 0 : 1,
      isMixed: false,
      label: fulfillmentLabels[fallbackStatus],
      openItems: isOpenFulfillmentStatus(fallbackStatus) ? 1 : 0,
      status: fallbackStatus,
      totalItems: 1,
    };
  }

  const counts = safeItems.reduce(
    (currentCounts, item) => {
      currentCounts[item.fulfillment_status] += 1;
      return currentCounts;
    },
    {
      cancelled: 0,
      delivered: 0,
      pending: 0,
      preparing: 0,
      ready: 0,
    } satisfies Record<FulfillmentStatus, number>,
  );
  const openItems = safeItems.filter((item) => isOpenFulfillmentStatus(item.fulfillment_status)).length;
  const doneItems = counts.delivered + counts.cancelled;
  const visibleStatusCount = Object.values(counts).filter((value) => value > 0).length;
  let status: FulfillmentStatus = fallbackStatus;

  if (counts.cancelled === totalItems) {
    status = "cancelled";
  } else if (counts.delivered === totalItems) {
    status = "delivered";
  } else if (counts.pending > 0 && counts.preparing + counts.ready + counts.delivered === 0) {
    status = "pending";
  } else if (counts.ready > 0 && counts.pending + counts.preparing === 0) {
    status = "ready";
  } else {
    status = "preparing";
  }

  return {
    actionCount: openItems,
    detail:
      openItems > 0
        ? `${openItems} por gestionar`
        : doneItems === totalItems
          ? "Completado"
          : "Sin accion",
    doneItems,
    isMixed: visibleStatusCount > 1,
    label: fulfillmentLabels[status],
    openItems,
    status,
    totalItems,
  };
}

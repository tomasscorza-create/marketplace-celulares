import { Link, useParams } from "react-router-dom";

import { PagePlaceholder } from "../components/PagePlaceholder";
import { SkeletonBlock } from "../components/SkeletonBlock";
import { buildWhatsAppUrl } from "../components/WhatsAppButton";
import { useAuth } from "../features/auth/useAuth";
import { useBuyerOrder, useBuyerOrderEvents } from "../features/buyer/buyerQueries";
import {
  fulfillmentClasses,
  getDeliveryLabel,
  getFulfillmentSummary,
} from "../features/orders/fulfillment";
import { OrderProductThumbnail } from "../features/orders/OrderProductThumbnail";
import type { OrderEventRecord, OrderRecord } from "../types/commerce";

function formatCurrency(value: number) {
  return `$${Number(value).toLocaleString("es-AR")}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Pendiente";
  }

  return new Date(value).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getOrderStatusLabel(order: OrderRecord) {
  if (order.payment_status === "approved") {
    return getFulfillmentSummary(order.items, order.fulfillment_status).label;
  }

  if (order.payment_status === "in_process") {
    return "Pago en proceso";
  }

  if (order.payment_status === "rejected") {
    return "Pago rechazado";
  }

  return "Pago pendiente";
}

function getTrackingSteps(order: OrderRecord, events: OrderEventRecord[]) {
  const summary = getFulfillmentSummary(order.items, order.fulfillment_status);
  const hasEvent = (type: string) => events.some((event) => event.event_type === type);

  return [
    {
      isDone: order.payment_status === "approved",
      label: "Pago aprobado",
      value: formatDate(order.paid_at),
    },
    {
      isDone: summary.status !== "pending" || hasEvent("fulfillment_preparing"),
      label: "Preparacion",
      value: summary.status === "pending" ? "Pendiente" : summary.label,
    },
    {
      isDone: summary.status === "ready" || summary.status === "delivered",
      label: "Listo",
      value: summary.status === "ready" ? "Para coordinar" : "",
    },
    {
      isDone: summary.status === "delivered",
      label: "Entregado",
      value: summary.status === "delivered" ? "Completado" : "",
    },
  ];
}

export function BuyerOrderDetailPage() {
  const { orderId } = useParams();
  const { user } = useAuth();
  const buyerId = user?.id;
  const orderQuery = useBuyerOrder(buyerId, orderId, Boolean(buyerId && orderId));
  const eventsQuery = useBuyerOrderEvents(
    buyerId,
    orderId,
    Boolean(orderQuery.data && buyerId && orderId),
  );
  const order = orderQuery.data;
  const events = eventsQuery.data ?? [];

  if (orderQuery.isLoading) {
    return (
      <PagePlaceholder badge="Pedido" description="" title="Cargando pedido">
        <div className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <SkeletonBlock className="h-7 w-56" />
          <SkeletonBlock className="h-24 w-full rounded-2xl" />
          <SkeletonBlock className="h-40 w-full rounded-2xl" />
        </div>
      </PagePlaceholder>
    );
  }

  if (!order) {
    return (
      <PagePlaceholder badge="Pedido" description="" title="No encontramos este pedido">
        <Link
          className="inline-flex w-full items-center justify-center rounded-full border border-ocean-500 px-5 py-3 text-sm font-medium text-ocean-500 transition-colors hover:bg-brand-50 sm:w-auto"
          to="/panel/comprador"
        >
          Volver a mis pedidos
        </Link>
      </PagePlaceholder>
    );
  }

  const orderFulfillment = getFulfillmentSummary(order.items, order.fulfillment_status);
  const trackingSteps = getTrackingSteps(order, events);
  const helpUrl = buildWhatsAppUrl(`Hola, quiero consultar por el pedido ${order.id.slice(0, 8).toUpperCase()}.`);
  const deliveryDisplay =
    order.delivery_type === "shipping" && order.delivery_address
      ? order.delivery_address
      : getDeliveryLabel(order.delivery_type);
  const shippingLabel = order.delivery_type === "shipping" ? "Envio" : "Retiro";
  const shippingValue =
    order.delivery_type === "shipping" ? formatCurrency(order.shipping_amount) : "Sin cargo";

  return (
    <PagePlaceholder
      actions={
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex w-full items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 sm:w-auto"
            to="/panel/comprador"
          >
            Mis pedidos
          </Link>
          <a
            className="inline-flex w-full items-center justify-center rounded-full bg-brand-500 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 sm:w-auto"
            href={helpUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Consultar
          </a>
        </div>
      }
      badge="Pedido"
      description=""
      title={`Pedido #${order.id.slice(0, 8).toUpperCase()}`}
    >
      <section className="grid gap-4 rounded-3xl border border-ocean-100 bg-gradient-to-b from-white to-brand-50 p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-stone-500">{formatDate(order.created_at)}</p>
            <h2 className="mt-1 text-2xl font-semibold text-stone-900">
              {getOrderStatusLabel(order)}
            </h2>
            {order.payment_status === "approved" ? (
              <p className="mt-1 text-sm text-stone-500">{orderFulfillment.detail}</p>
            ) : null}
          </div>
          <span className="rounded-full border border-ocean-100 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-ocean-500">
            {getDeliveryLabel(order.delivery_type)}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          {trackingSteps.map((step) => (
            <div
              key={step.label}
              className={[
                "rounded-2xl border px-4 py-3",
                step.isDone
                  ? "border-ocean-100 bg-white text-ocean-600"
                  : "border-stone-200 bg-white/70 text-stone-500",
              ].join(" ")}
            >
              <p className="text-xs font-semibold uppercase tracking-widest">{step.label}</p>
              <p className="mt-2 text-sm font-medium text-stone-900">{step.value || "Pendiente"}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-xl font-semibold text-stone-900">Productos</h2>
          <div className="grid gap-3">
            {(order.items ?? []).map((item) => (
              <article
                key={item.id}
                className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-3 rounded-2xl border border-stone-200 bg-stone-50/70 p-3 sm:grid-cols-[3rem_minmax(0,1fr)_auto]"
              >
                <OrderProductThumbnail alt={item.product_title} imageUrl={item.product_image_url} />
                <div className="min-w-0">
                  <p className="font-semibold text-stone-900">{item.product_title}</p>
                  <p className="mt-1 text-sm text-stone-500">{item.store_name ?? item.artisan_name}</p>
                  {item.selected_options_summary ? (
                    <p className="mt-2 text-sm text-stone-600">{item.selected_options_summary}</p>
                  ) : null}
                  <span
                    className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${fulfillmentClasses[item.fulfillment_status]}`}
                  >
                    {getFulfillmentSummary([item], item.fulfillment_status).label}
                  </span>
                </div>
                <div className="col-span-2 text-left sm:col-span-1 sm:text-right">
                  <p className="text-sm text-stone-500">Cantidad {item.quantity}</p>
                  <p className="mt-1 font-semibold text-stone-900">{formatCurrency(item.subtotal)}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="grid gap-3 self-start rounded-3xl border border-brand-100 bg-gradient-to-b from-stone-50 to-white p-5 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-500">
              Entrega
            </p>
            <p className="mt-2 text-sm font-medium text-stone-900">
              {deliveryDisplay}
            </p>
            {order.delivery_notes ? (
              <p className="mt-2 text-sm text-stone-600">{order.delivery_notes}</p>
            ) : null}
          </div>

          <div className="h-px bg-stone-200" />

          <div className="grid gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-stone-500">Productos</span>
              <span className="font-medium text-stone-900">{formatCurrency(order.subtotal_amount)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-stone-500">{shippingLabel}</span>
              <span className="font-medium text-stone-900">{shippingValue}</span>
            </div>
            <div className="flex justify-between gap-3 border-t border-stone-200 pt-3 text-base">
              <span className="font-semibold text-stone-900">Total</span>
              <span className="font-semibold text-stone-900">{formatCurrency(order.total_amount)}</span>
            </div>
          </div>
        </aside>
      </div>
    </PagePlaceholder>
  );
}

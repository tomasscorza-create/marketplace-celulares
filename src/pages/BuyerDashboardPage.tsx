import type { OrderRecord } from "../types/commerce";

import { useState } from "react";
import { Link } from "react-router-dom";

import { PaginationControls } from "../components/PaginationControls";
import { PagePlaceholder } from "../components/PagePlaceholder";
import { useAuth } from "../features/auth/useAuth";
import {
  useBuyerAccountSummary,
  useBuyerOrderHistory,
  useBuyerOrderHistoryPage,
} from "../features/buyer/buyerQueries";
import {
  fulfillmentClasses,
  getDeliveryLabel,
  getFulfillmentSummary,
} from "../features/orders/fulfillment";

function getOrderStateLabel(order: OrderRecord) {
  if (order.payment_status === "approved") {
    return getFulfillmentSummary(order.items, order.fulfillment_status).label;
  }

  if (order.payment_status === "in_process") {
    return "Pago en proceso";
  }

  return "Pendiente";
}

function getOrderAccentClass(order: OrderRecord) {
  if (order.payment_status === "approved") {
    return fulfillmentClasses[getFulfillmentSummary(order.items, order.fulfillment_status).status];
  }

  if (order.payment_status === "in_process") {
    return "bg-brand-100 text-brand-500";
  }

  return "bg-white text-stone-600";
}

function getPendingArrivalOrders(orders: OrderRecord[]) {
  return orders.filter((order) => {
    if (["cancelled", "failed", "refunded"].includes(order.status)) {
      return false;
    }

    if (order.payment_status === "approved") {
      return getFulfillmentSummary(order.items, order.fulfillment_status).openItems > 0;
    }

    return order.status === "pending" || order.payment_status === "in_process";
  });
}

const BUYER_HISTORY_PAGE_SIZE = 8;

export function BuyerDashboardPage() {
  const { profile, user } = useAuth();
  const buyerId = user?.id;
  const [historyPage, setHistoryPage] = useState(1);
  const summaryQuery = useBuyerAccountSummary(buyerId, Boolean(buyerId));
  const recentOrdersQuery = useBuyerOrderHistory(buyerId, Boolean(buyerId), {
    limit: 20,
    page: 1,
  });
  const historyQuery = useBuyerOrderHistoryPage(buyerId, Boolean(buyerId), {
    limit: BUYER_HISTORY_PAGE_SIZE,
    page: historyPage,
  });
  const summary = summaryQuery.data;
  const recentOrders = recentOrdersQuery.data ?? [];
  const historyOrders = historyQuery.data?.items ?? [];
  const totalOrdersCount = historyQuery.data?.count ?? summary?.orders_count ?? historyOrders.length;
  const activeOrders = getPendingArrivalOrders(recentOrders).slice(0, 4);
  const lastApprovedOrder = recentOrders.find((order) => order.payment_status === "approved");

  return (
    <PagePlaceholder
      actions={
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex w-full items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 sm:w-auto"
            to="/perfil/cliente"
          >
            Ver perfil
          </Link>
        </div>
      }
      badge="Compras"
      description=""
      title={profile?.full_name?.trim() ? `Mis pedidos, ${profile.full_name}` : "Mis pedidos"}
    >
      <section className="grid gap-4 rounded-3xl border border-ocean-100 bg-gradient-to-b from-white to-brand-50 p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ocean-500">
              Activos
            </p>
            <h2 className="mt-1 text-xl font-semibold text-stone-900">Pedidos en curso</h2>
          </div>
          <span className="rounded-full border border-ocean-100 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-ocean-500">
            {summary?.open_orders_count ?? 0}
          </span>
        </div>

        {recentOrdersQuery.isLoading && activeOrders.length === 0 ? (
          <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-5 text-sm text-stone-500">
            Cargando pedidos...
          </div>
        ) : null}

        {!recentOrdersQuery.isLoading && activeOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ocean-100 bg-white/90 px-4 py-5 text-sm text-stone-600">
            No tenes pedidos activos ahora mismo.
          </div>
        ) : null}

        {activeOrders.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {activeOrders.map((order) => (
              <Link
                key={order.id}
                className="rounded-2xl border border-white/80 bg-white/92 px-4 py-4 shadow-sm"
                to={`/panel/comprador/pedidos/${order.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">
                      Pedido #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      {new Date(order.created_at).toLocaleDateString("es-AR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      - {getDeliveryLabel(order.delivery_type)}
                    </p>
                  </div>
                  <span
                    className={[
                      "rounded-full border border-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest",
                      getOrderAccentClass(order),
                    ].join(" ")}
                  >
                    {getOrderStateLabel(order)}
                  </span>
                </div>

                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                      Total
                    </p>
                    <p className="mt-1 text-lg font-semibold text-stone-900">
                      ${Number(order.total_amount).toLocaleString("es-AR")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                      Productos
                    </p>
                    <p className="mt-1 text-sm font-medium text-stone-700">
                      {order.items?.length ?? 0}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      <section className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-stone-900">Historial</h2>
          <span className="text-sm text-stone-500">{totalOrdersCount} pedido(s)</span>
        </div>

        {historyOrders.length === 0 && !historyQuery.isLoading ? (
          <p className="rounded-2xl border border-dashed border-stone-300 px-4 py-5 text-sm text-stone-500">
            Todavia no hay compras registradas.
          </p>
        ) : null}

        <div className="grid gap-2">
          {historyOrders.map((order) => (
            <Link
              key={order.id}
              className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50/70 px-4 py-3 transition-colors hover:border-ocean-200 hover:bg-brand-50 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
              to={`/panel/comprador/pedidos/${order.id}`}
            >
              <div className="min-w-0">
                <p className="font-semibold text-stone-900">
                  Pedido #{order.id.slice(0, 8).toUpperCase()}
                </p>
                <p className="mt-1 text-sm text-stone-500">
                  {new Date(order.created_at).toLocaleDateString("es-AR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <span
                className={[
                  "self-center rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-widest",
                  getOrderAccentClass(order),
                ].join(" ")}
              >
                {getOrderStateLabel(order)}
              </span>
              <span className="self-center font-semibold text-stone-900">
                ${Number(order.total_amount).toLocaleString("es-AR")}
              </span>
            </Link>
          ))}
        </div>

        <PaginationControls
          currentPage={historyPage}
          isLoading={historyQuery.isLoading}
          onPageChange={setHistoryPage}
          pageSize={BUYER_HISTORY_PAGE_SIZE}
          totalCount={totalOrdersCount}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <section className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-stone-200 bg-white px-4 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                Compras totales
              </p>
              <p className="mt-2 text-3xl font-semibold text-stone-900">
                {summary?.orders_count ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white px-4 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                Pagadas
              </p>
              <p className="mt-2 text-3xl font-semibold text-stone-900">
                {summary?.paid_orders_count ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white px-4 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                Total comprado
              </p>
              <p className="mt-2 text-2xl font-semibold text-stone-900">
                ${Number(summary?.total_spent ?? 0).toLocaleString("es-AR")}
              </p>
            </div>
          </div>
        </section>

        <aside className="grid gap-3 self-start rounded-3xl border border-brand-100 bg-gradient-to-b from-stone-50 to-white p-5 shadow-sm">
          <div className="rounded-2xl border border-white/90 bg-white/90 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-500">
              Listos para coordinar
            </p>
            <p className="mt-2 text-2xl font-semibold text-stone-900">
              {summary?.ready_orders_count ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-white/90 bg-white/90 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-500">
              Ultima compra aprobada
            </p>
            <p className="mt-2 text-sm font-medium text-stone-900">
              {lastApprovedOrder
                ? new Date(lastApprovedOrder.created_at).toLocaleDateString("es-AR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Todavia sin compras aprobadas"}
            </p>
          </div>
        </aside>
      </div>
    </PagePlaceholder>
  );
}

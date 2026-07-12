import type { FulfillmentStatus } from "../types/commerce";
import type { ArtisanSaleItem } from "../types/artisan";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { PaginationControls } from "../components/PaginationControls";
import { PagePlaceholder } from "../components/PagePlaceholder";
import { SkeletonBlock } from "../components/SkeletonBlock";
import { buildWhatsAppUrlForPhone } from "../components/WhatsAppButton";
import { getArtisanSales } from "../features/artisan/artisanClient";
import { useUpdateOrderItemFulfillmentStatus } from "../features/artisan/artisanQueries";
import { useAuth } from "../features/auth/useAuth";
import {
  fulfillmentClasses,
  fulfillmentLabels,
  getFulfillmentSummary,
  getNextFulfillmentStatus,
  isOpenFulfillmentStatus,
} from "../features/orders/fulfillment";
import { OrderProductThumbnail } from "../features/orders/OrderProductThumbnail";
import { SaleDeliveryNote } from "../features/orders/SaleDeliveryNote";

const ARTISAN_SALES_PAGE_SIZE = 20;

type SaleGroup = {
  buyerName: string;
  buyerPhone: string;
  createdAt: string;
  deliveryAddress: string | null;
  deliveryNotes: string | null;
  deliveryType: string;
  items: ArtisanSaleItem[];
  orderFulfillmentStatus: FulfillmentStatus;
  orderId: string;
  paidAt: string | null;
  totalAmount: number;
};

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

function getNextStatusLabel(status: FulfillmentStatus) {
  const nextStatus = getNextFulfillmentStatus(status);

  return nextStatus ? fulfillmentLabels[nextStatus] : null;
}

function groupSalesByOrder(sales: ArtisanSaleItem[]): SaleGroup[] {
  const groups = new Map<string, SaleGroup>();

  sales.forEach((sale) => {
    const order = sale.orders;
    const orderId = sale.order_id || order?.id;

    if (!orderId || !order) {
      return;
    }

    const current = groups.get(orderId) ?? {
      buyerName: order.buyer_name || "Comprador",
      buyerPhone: order.buyer_phone || "",
      createdAt: order.created_at,
      deliveryAddress: order.delivery_address,
      deliveryNotes: order.delivery_notes,
      deliveryType: order.delivery_type,
      items: [],
      orderFulfillmentStatus: order.fulfillment_status,
      orderId,
      paidAt: order.paid_at,
      totalAmount: Number(order.total_amount ?? 0),
    };

    current.items.push(sale);
    groups.set(orderId, current);
  });

  return Array.from(groups.values()).sort(
    (left, right) => +new Date(right.createdAt) - +new Date(left.createdAt),
  );
}

export function ArtisanSalesPage() {
  const { user } = useAuth();
  const [sales, setSales] = useState<ArtisanSaleItem[]>([]);
  const [salesCount, setSalesCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const statusMutation = useUpdateOrderItemFulfillmentStatus(user?.id);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const loadSales = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      const response = await getArtisanSales(user.id, {
        limit: ARTISAN_SALES_PAGE_SIZE,
        page,
      });

      if (response.error) {
        setErrorMessage(response.error.message);
      } else {
        setSales(response.data ?? []);
        setSalesCount(response.count ?? response.data?.length ?? 0);
      }

      setIsLoading(false);
    };

    void loadSales();
  }, [page, refreshKey, user]);

  const groupedSales = useMemo(() => groupSalesByOrder(sales), [sales]);

  const filteredGroups = useMemo(() => {
    const normalizedSearch = search
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

    if (!normalizedSearch) {
      return groupedSales;
    }

    return groupedSales.filter((group) =>
      [
        group.buyerName,
        group.buyerPhone,
        group.orderId,
        group.deliveryAddress,
        ...group.items.map((item) => item.product_title || item.products?.title),
      ]
        .filter(Boolean)
        .join(" ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [groupedSales, search]);

  const summary = useMemo(() => {
    const totalRevenue = sales.reduce((accumulator, item) => accumulator + Number(item.subtotal), 0);
    const totalUnits = sales.reduce((accumulator, item) => accumulator + Number(item.quantity), 0);
    const openItems = sales.filter((item) => isOpenFulfillmentStatus(item.fulfillment_status)).length;

    return {
      openItems,
      totalRevenue,
      totalSales: salesCount,
      totalUnits,
    };
  }, [sales, salesCount]);

  const handleAdvanceStatus = async (item: ArtisanSaleItem) => {
    const nextStatus = getNextFulfillmentStatus(item.fulfillment_status);

    if (!nextStatus) {
      return;
    }

    setPendingItemId(item.id);
    setErrorMessage(null);

    try {
      await statusMutation.mutateAsync({
        orderItemId: item.id,
        status: nextStatus,
      });
      setRefreshKey((currentValue) => currentValue + 1);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No pudimos actualizar la venta.");
    } finally {
      setPendingItemId(null);
    }
  };

  return (
    <PagePlaceholder
      actions={
        <>
          <Link
            className="inline-flex w-full items-center justify-center rounded-full border border-ocean-500 px-5 py-3 text-sm font-medium text-ocean-500 transition-colors hover:bg-[#E0F2FE] sm:w-auto"
            to="/panel/vendedor/productos"
          >
            Productos
          </Link>
          <Link
            className="inline-flex w-full items-center justify-center rounded-full bg-brand-500 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 sm:w-auto"
            to="/panel/vendedor/tienda"
          >
            Mi tienda
          </Link>
        </>
      }
      badge="Ventas"
      description=""
      title="Pedidos y ventas"
    >
      <div className="grid gap-4 md:grid-cols-4">
        <article className="rounded-3xl border border-brand-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-stone-500">Pedidos</p>
          <p className="mt-2 text-3xl font-semibold text-brand-500">{summary.totalSales}</p>
        </article>
        <article className="rounded-3xl border border-ocean-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-stone-500">Por gestionar visibles</p>
          <p className="mt-2 text-3xl font-semibold text-ocean-500">{summary.openItems}</p>
        </article>
        <article className="rounded-3xl border border-sun-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-stone-500">Unidades visibles</p>
          <p className="mt-2 text-3xl font-semibold text-ocean-500">{summary.totalUnits}</p>
        </article>
        <article className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-stone-500">Monto visible</p>
          <p className="mt-2 text-2xl font-semibold text-stone-900">
            {formatCurrency(summary.totalRevenue)}
          </p>
        </article>
      </div>

      {errorMessage ? (
        <p className="mt-6 rounded-2xl border border-brand-500 bg-[#D1FAE5] px-4 py-3 text-sm text-brand-500">
          {errorMessage}
        </p>
      ) : null}

      <section className="mt-6 grid gap-3 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-stone-900">Bandeja de pedidos</h2>
          <span className="rounded-full bg-stone-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-stone-600">
            {filteredGroups.length} visibles
          </span>
        </div>

        <input
          className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-ocean-300"
          onChange={(event) => {
            setSearch(event.target.value);
          }}
          placeholder="Buscar por comprador, producto o telefono"
          type="search"
          value={search}
        />
      </section>

      <section className="mt-4 grid gap-3 rounded-3xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
        {isLoading ? (
          <div className="grid gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="grid gap-3 rounded-3xl border border-stone-200 p-4">
                <SkeletonBlock className="h-5 w-48" />
                <SkeletonBlock className="h-24 w-full rounded-2xl" />
              </div>
            ))}
          </div>
        ) : null}

        {!isLoading && filteredGroups.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-300 bg-white/80 p-6 text-sm text-stone-600">
            {search.trim() ? "No encontramos pedidos con esa busqueda." : "Todavia no hay ventas aprobadas."}
          </div>
        ) : null}

        <div className="grid gap-3">
          {filteredGroups.map((group) => {
            const groupFulfillment = getFulfillmentSummary(group.items, group.orderFulfillmentStatus);
            const whatsappUrl = group.buyerPhone
              ? buildWhatsAppUrlForPhone(
                  group.buyerPhone,
                  `Hola ${group.buyerName}, te contacto por tu pedido ${group.orderId.slice(0, 8).toUpperCase()}.`,
                )
              : null;

            return (
              <article key={group.orderId} className="grid gap-4 rounded-3xl border border-stone-200 bg-stone-50/80 p-4">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-stone-900">
                        Pedido #{group.orderId.slice(0, 8).toUpperCase()}
                      </h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${fulfillmentClasses[groupFulfillment.status]}`}
                      >
                        {groupFulfillment.label}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-stone-500">
                      {group.buyerName} - {group.buyerPhone || "Sin telefono"} - Pago {formatDate(group.paidAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {whatsappUrl ? (
                      <a
                        className="inline-flex min-h-10 items-center justify-center rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
                        href={whatsappUrl}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        WhatsApp
                      </a>
                    ) : null}
                    <span className="inline-flex min-h-10 items-center rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700">
                      {formatCurrency(group.totalAmount)}
                    </span>
                  </div>
                </div>

                <SaleDeliveryNote
                  address={group.deliveryAddress}
                  deliveryNotes={group.deliveryNotes}
                  deliveryType={group.deliveryType}
                  items={group.items.map((item) => ({
                    amount: item.subtotal,
                    details: item.selected_options_summary,
                    id: item.id,
                    productTitle: item.product_title || item.products?.title || "Producto",
                    quantity: item.quantity,
                  }))}
                  phone={group.buyerPhone}
                />

                <div className="grid gap-3">
                  {group.items.map((item) => {
                    const nextStatusLabel = getNextStatusLabel(item.fulfillment_status);
                    const isUpdating = pendingItemId === item.id;

                    return (
                      <div
                        key={item.id}
                        className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-3 rounded-2xl border border-stone-200 bg-white p-3 lg:grid-cols-[3rem_minmax(0,1fr)_16rem]"
                      >
                        <OrderProductThumbnail alt={item.product_title} imageUrl={item.product_image_url} />
                        <div className="min-w-0">
                          <p className="font-semibold text-stone-900">
                            {item.product_title || item.products?.title || "Producto"}
                          </p>
                          <p className="mt-1 text-sm text-stone-500">
                            Cantidad {item.quantity} - {formatCurrency(item.subtotal)}
                          </p>
                          <span
                            className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${fulfillmentClasses[item.fulfillment_status]}`}
                          >
                            {fulfillmentLabels[item.fulfillment_status]}
                          </span>
                        </div>

                        <div className="col-span-2 grid gap-2 rounded-2xl border border-brand-100 bg-[#FFF9EC] p-3 lg:col-span-1">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-500">
                              Gestion
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${fulfillmentClasses[item.fulfillment_status]}`}
                            >
                              {fulfillmentLabels[item.fulfillment_status]}
                            </span>
                          </div>

                          {nextStatusLabel ? (
                            <button
                              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={isUpdating || statusMutation.isPending}
                              onClick={() => {
                                void handleAdvanceStatus(item);
                              }}
                              type="button"
                            >
                              {isUpdating ? "Guardando..." : `Pasar a ${nextStatusLabel}`}
                            </button>
                          ) : (
                            <span className="inline-flex min-h-11 items-center justify-center rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-500">
                              Completado
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>

        <PaginationControls
          currentPage={page}
          isLoading={isLoading}
          onPageChange={setPage}
          pageSize={ARTISAN_SALES_PAGE_SIZE}
          totalCount={salesCount}
        />
      </section>
    </PagePlaceholder>
  );
}

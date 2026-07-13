import type {
  AdminApprovedSalesFulfillmentFilter,
  AdminSalesItem,
  AdminSalesStatusFilter,
} from "../types/admin";
import type { FulfillmentStatus } from "../types/commerce";

import { useEffect, useMemo, useState } from "react";

import { PaginationControls } from "../components/PaginationControls";
import { PagePlaceholder } from "../components/PagePlaceholder";
import { SkeletonBlock } from "../components/SkeletonBlock";
import {
  getAdminSales,
  updateAdminOrderItemFulfillmentStatus,
} from "../features/admin/adminClient";
import {
  fulfillmentClasses,
  fulfillmentLabels,
  getFulfillmentSummary,
  getNextFulfillmentStatus,
} from "../features/orders/fulfillment";
import { OrderProductThumbnail } from "../features/orders/OrderProductThumbnail";
import { SaleDeliveryNote } from "../features/orders/SaleDeliveryNote";

const PAGE_SIZE = 30;

const tabs: Array<{ key: AdminSalesStatusFilter; label: string }> = [
  { key: "approved", label: "Aprobadas" },
  { key: "pending", label: "Pendientes" },
  { key: "rejected", label: "Rechazadas" },
];

const approvedFulfillmentFilters: Array<{
  key: AdminApprovedSalesFulfillmentFilter;
  label: string;
}> = [
  { key: "in_process", label: "En proceso" },
  { key: "completed", label: "Finalizadas" },
];

type AdminSalesGroup = {
  buyerName: string;
  buyerPhone: string;
  createdAt: string;
  deliveryAddress: string | null;
  deliveryNotes: string | null;
  deliveryType: string;
  items: AdminSalesItem[];
  orderFulfillmentStatus: FulfillmentStatus;
  orderId: string;
  paymentStatus: string;
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

function groupSales(items: AdminSalesItem[]) {
  const groups = new Map<string, AdminSalesGroup>();

  items.forEach((item) => {
    const order = item.orders;
    const orderId = item.order_id || order?.id;

    if (!order || !orderId) {
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
      paymentStatus: order.payment_status,
      totalAmount: Number(order.total_amount ?? 0),
    };

    current.items.push(item);
    groups.set(orderId, current);
  });

  return Array.from(groups.values()).sort(
    (left, right) => +new Date(right.createdAt) - +new Date(left.createdAt),
  );
}

export function AdminSalesPage() {
  const [activeTab, setActiveTab] = useState<AdminSalesStatusFilter>("approved");
  const [approvedFulfillmentFilter, setApprovedFulfillmentFilter] =
    useState<AdminApprovedSalesFulfillmentFilter>("in_process");
  const [items, setItems] = useState<AdminSalesItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadSales = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      const response = await getAdminSales(activeTab, {
        fulfillmentFilter: activeTab === "approved" ? approvedFulfillmentFilter : undefined,
        limit: PAGE_SIZE,
        page,
      });

      if (response.error) {
        setErrorMessage(response.error.message);
        setItems([]);
        setTotalCount(0);
      } else {
        setItems(response.data ?? []);
        setTotalCount(response.count ?? response.data?.length ?? 0);
      }

      setIsLoading(false);
    };

    void loadSales();
  }, [activeTab, approvedFulfillmentFilter, page, refreshKey]);

  const groups = useMemo(() => groupSales(items), [items]);

  const groupsForActiveFilter = useMemo(() => {
    if (activeTab !== "approved") {
      return groups;
    }

    return groups.filter((group) => {
      const summary = getFulfillmentSummary(group.items, group.orderFulfillmentStatus);

      return approvedFulfillmentFilter === "completed"
        ? summary.status === "delivered"
        : summary.status !== "delivered";
    });
  }, [activeTab, approvedFulfillmentFilter, groups]);

  const filteredGroups = useMemo(() => {
    const normalizedSearch = search
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

    if (!normalizedSearch) {
      return groupsForActiveFilter;
    }

    return groupsForActiveFilter.filter((group) =>
      [
        group.orderId,
        group.buyerName,
        group.buyerPhone,
        group.deliveryAddress,
        ...group.items.map((item) => `${item.product_title} ${item.store_name ?? ""}`),
      ]
        .filter(Boolean)
        .join(" ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [groupsForActiveFilter, search]);

  const handleTabChange = (tab: AdminSalesStatusFilter) => {
    setActiveTab(tab);
    setPage(1);
    setSearch("");
  };

  const handleApprovedFulfillmentFilterChange = (
    filter: AdminApprovedSalesFulfillmentFilter,
  ) => {
    setApprovedFulfillmentFilter(filter);
    setPage(1);
    setSearch("");
  };

  const handleAdvanceStatus = async (item: AdminSalesItem) => {
    if (activeTab !== "approved") {
      return;
    }

    const nextStatus = getNextFulfillmentStatus(item.fulfillment_status);

    if (!nextStatus) {
      return;
    }

    setPendingItemId(item.id);
    setErrorMessage(null);

    const response = await updateAdminOrderItemFulfillmentStatus(item.id, nextStatus);

    if (response.error) {
      setErrorMessage(response.error.message);
    } else {
      setRefreshKey((currentValue) => currentValue + 1);
    }

    setPendingItemId(null);
  };

  return (
    <PagePlaceholder badge="Admin" description="" title="Ventas">
      <section className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            className={[
              "inline-flex min-h-10 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              activeTab === "approved"
                ? "bg-brand-500 text-white"
                : "border border-stone-200 bg-white text-stone-600 hover:bg-ocean-50 hover:text-ocean-500",
            ].join(" ")}
            onClick={() => handleTabChange("approved")}
            type="button"
          >
            Aprobadas
          </button>

          <div className="flex items-center gap-2">
            {tabs.filter((tab) => tab.key !== "approved").map((tab) => (
              <button
                key={tab.key}
                className={[
                  "inline-flex min-h-8 items-center justify-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  activeTab === tab.key
                    ? "border-stone-300 bg-stone-100 text-stone-800"
                    : "border-stone-200 bg-white/80 text-stone-500 hover:bg-stone-50 hover:text-stone-700",
                ].join(" ")}
                onClick={() => handleTabChange(tab.key)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "approved" ? (
          <div className="flex flex-wrap gap-2">
            {approvedFulfillmentFilters.map((filter) => (
              <button
                key={filter.key}
                className={[
                  "inline-flex min-h-9 items-center justify-center rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors",
                  approvedFulfillmentFilter === filter.key
                    ? "border-brand-200 bg-brand-50 text-brand-600"
                    : "border-stone-200 bg-white text-stone-500 hover:bg-stone-50 hover:text-stone-700",
                ].join(" ")}
                onClick={() => handleApprovedFulfillmentFilterChange(filter.key)}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>
        ) : null}

        <input
          className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-brand-300"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por pedido, comprador, vendedor o producto"
          type="search"
          value={search}
        />
      </section>

      {errorMessage ? (
        <p className="rounded-2xl border border-brand-500 bg-brand-100 px-4 py-3 text-sm text-brand-500">
          {errorMessage}
        </p>
      ) : null}

      <section className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
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
          <p className="rounded-3xl border border-dashed border-stone-300 p-6 text-sm text-stone-600">
            No hay ventas en esta categoria.
          </p>
        ) : null}

        <div className="grid gap-3">
          {filteredGroups.map((group) => {
            const groupFulfillment = getFulfillmentSummary(group.items, group.orderFulfillmentStatus);

            return (
            <article key={group.orderId} className="grid gap-4 rounded-3xl border border-stone-200 bg-stone-50/80 p-4">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-stone-900">
                      Pedido #{group.orderId.slice(0, 8).toUpperCase()}
                    </h2>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-widest text-stone-600">
                      {group.paymentStatus}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${fulfillmentClasses[groupFulfillment.status]}`}
                    >
                      {groupFulfillment.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-stone-500">
                    {group.buyerName} - {group.buyerPhone || "Sin telefono"} - {formatDate(group.createdAt)}
                  </p>
                </div>
                <span className="inline-flex min-h-10 items-center rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700">
                  {formatCurrency(group.totalAmount)}
                </span>
              </div>

              <SaleDeliveryNote
                address={group.deliveryAddress}
                deliveryNotes={group.deliveryNotes}
                deliveryType={group.deliveryType}
                items={group.items.map((item) => ({
                  amount: item.subtotal,
                  details: item.selected_options_summary,
                  id: item.id,
                  productTitle: item.product_title,
                  quantity: item.quantity,
                  sellerName: item.store_name ?? item.artisan_name,
                }))}
                phone={group.buyerPhone}
              />

              <div className="grid gap-3">
                {group.items.map((item) => {
                  const nextStatus = getNextFulfillmentStatus(item.fulfillment_status);
                  const canControl = activeTab === "approved" && Boolean(nextStatus);
                  const isUpdating = pendingItemId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-3 rounded-2xl border border-stone-200 bg-white p-3 lg:grid-cols-[3rem_minmax(0,1fr)_16rem]"
                    >
                      <OrderProductThumbnail alt={item.product_title} imageUrl={item.product_image_url} />

                      <div className="min-w-0">
                        <p className="font-semibold text-stone-900">{item.product_title || "Producto"}</p>
                        <p className="mt-1 text-sm text-stone-500">
                          {item.store_name ?? item.artisan_name ?? "Vendedor"} - Cantidad {item.quantity} - {formatCurrency(item.subtotal)}
                        </p>
                      </div>

                      <div className="col-span-2 grid gap-2 rounded-2xl border border-ocean-100 bg-[#F7FAFF] p-3 lg:col-span-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold uppercase tracking-widest text-ocean-500">
                            Control
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${fulfillmentClasses[item.fulfillment_status]}`}
                          >
                            {fulfillmentLabels[item.fulfillment_status]}
                          </span>
                        </div>

                        {canControl && nextStatus ? (
                          <button
                            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isUpdating}
                            onClick={() => {
                              void handleAdvanceStatus(item);
                            }}
                            type="button"
                          >
                            {isUpdating ? "Guardando..." : `Pasar a ${fulfillmentLabels[nextStatus]}`}
                          </button>
                        ) : (
                          <span className="inline-flex min-h-11 items-center justify-center rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-500">
                            Sin accion
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
          pageSize={PAGE_SIZE}
          totalCount={totalCount}
        />
      </section>
    </PagePlaceholder>
  );
}

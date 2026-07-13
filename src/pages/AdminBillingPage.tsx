import type { AdminBillingPeriod } from "../types/admin";

import { useDeferredValue, useMemo, useState } from "react";

import { PagePlaceholder } from "../components/PagePlaceholder";
import { SkeletonBlock } from "../components/SkeletonBlock";
import { useAdminBillingSnapshot } from "../features/admin/adminQueries";

const periodOptions: Array<{ key: AdminBillingPeriod; label: string }> = [
  { key: "all", label: "Todo" },
  { key: "30d", label: "30 dias" },
  { key: "7d", label: "7 dias" },
];

function formatCurrency(value: number) {
  return `$${Number(value).toLocaleString("es-AR")}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">{value}</p>
    </article>
  );
}

export function AdminBillingPage() {
  const [period, setPeriod] = useState<AdminBillingPeriod>("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const { data: snapshot, error, isLoading } = useAdminBillingSnapshot(period);

  const filteredSellers = useMemo(() => {
    const sellers = snapshot?.sellers ?? [];
    const normalizedSearch = normalizeText(deferredSearch);

    if (!normalizedSearch) {
      return sellers;
    }

    return sellers.filter((seller) =>
      normalizeText(`${seller.sellerName} ${seller.artisanId}`).includes(normalizedSearch),
    );
  }, [deferredSearch, snapshot?.sellers]);

  return (
    <PagePlaceholder badge="Admin" description="" title="Facturacion">
      <section className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {periodOptions.map((option) => (
              <button
                key={option.key}
                className={[
                  "inline-flex min-h-10 items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                  period === option.key
                    ? "border-ocean-500 bg-ocean-500 text-white"
                    : "border-stone-200 bg-white text-stone-600 hover:bg-ocean-50 hover:text-ocean-500",
                ].join(" ")}
                onClick={() => setPeriod(option.key)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>

          <input
            className="min-h-10 w-full rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-900 outline-none transition focus:border-ocean-300 sm:w-72"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar vendedor"
            type="search"
            value={search}
          />
        </div>
      </section>

      {error ? (
        <p className="mt-4 rounded-2xl border border-brand-500 bg-brand-100 px-4 py-3 text-sm text-brand-500">
          {error.message}
        </p>
      ) : null}

      <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
              <SkeletonBlock className="h-4 w-24 rounded-full" />
              <SkeletonBlock className="mt-3 h-8 w-28 rounded-full" />
            </div>
          ))
        ) : (
          <>
            <MetricCard
              label="Facturacion total"
              value={formatCurrency(snapshot?.totalRevenue ?? 0)}
            />
            <MetricCard
              label="Productos"
              value={formatCurrency(snapshot?.productRevenue ?? 0)}
            />
            <MetricCard label="Envios" value={formatCurrency(snapshot?.shippingRevenue ?? 0)} />
            <MetricCard label="Ventas" value={snapshot?.ordersCount ?? 0} />
            <MetricCard label="Vendedores" value={snapshot?.sellersCount ?? 0} />
          </>
        )}
      </section>

      <section className="mt-4 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-4 py-3">
          <h2 className="text-base font-semibold text-stone-900">Por vendedor</h2>
          <span className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-600">
            {filteredSellers.length}
          </span>
        </div>

        <div className="hidden grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))] gap-3 border-b border-stone-200 bg-stone-50 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-stone-500 md:grid">
          <span>Vendedor</span>
          <span>Facturacion</span>
          <span>Ventas</span>
          <span>Unidades</span>
          <span>Ultima</span>
        </div>

        {isLoading ? (
          <div className="grid gap-3 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : null}

        {!isLoading && filteredSellers.length === 0 ? (
          <p className="p-5 text-sm text-stone-600">No hay facturacion en este periodo.</p>
        ) : null}

        {!isLoading && filteredSellers.length > 0 ? (
          <div className="divide-y divide-stone-200">
            {filteredSellers.map((seller) => (
              <article
                key={seller.artisanId}
                className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))] md:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-stone-900">{seller.sellerName}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    Promedio {formatCurrency(seller.averageOrderAmount)}
                  </p>
                </div>
                <p className="text-lg font-semibold text-stone-900 md:text-base">
                  {formatCurrency(seller.productRevenue)}
                </p>
                <p className="text-sm text-stone-600">{seller.ordersCount}</p>
                <p className="text-sm text-stone-600">{seller.unitsSold}</p>
                <p className="text-sm text-stone-600">{formatDate(seller.lastSaleAt)}</p>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </PagePlaceholder>
  );
}

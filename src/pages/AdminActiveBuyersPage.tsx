import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { LoadingPanel } from "../components/LoadingPanel";
import { PaginationControls } from "../components/PaginationControls";
import { PagePlaceholder } from "../components/PagePlaceholder";
import { UserAvatar } from "../components/UserAvatar";
import { filterAndSortBuyerAccounts } from "../features/admin/adminDashboardUtils";
import { useAdminBuyerAccountsSnapshot } from "../features/admin/adminQueries";

const SORT_OPTIONS = [
  { label: "Mas compras", value: "most_orders" },
  { label: "Mas favoritos", value: "most_favorites" },
  { label: "Mayor gasto total", value: "highest_spent" },
  { label: "Ultima actividad", value: "latest_activity" },
  { label: "Mas antiguo", value: "oldest" },
  { label: "Mas nuevo", value: "newest" },
] as const;

const BUYERS_PAGE_SIZE = 50;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatShortDate(value: string | null) {
  if (!value) {
    return "Sin actividad";
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatMemberSince(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function AdminActiveBuyersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]["value"]>("most_orders");
  const deferredSearch = useDeferredValue(search.trim());
  const buyersQuery = useAdminBuyerAccountsSnapshot(true, {
    limit: BUYERS_PAGE_SIZE,
    page,
    search: deferredSearch || undefined,
  });
  const buyers = useMemo(() => buyersQuery.data?.buyers ?? [], [buyersQuery.data?.buyers]);
  const buyersCount = buyersQuery.data?.buyersCount ?? buyers.length;

  useEffect(() => {
    setSearch(searchParams.get("q") ?? "");
    const requestedSort = searchParams.get("sort");

    setSort(
      SORT_OPTIONS.some((option) => option.value === requestedSort)
        ? (requestedSort as (typeof SORT_OPTIONS)[number]["value"])
        : "most_orders",
    );
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch]);

  const filteredBuyers = useMemo(
    () => filterAndSortBuyerAccounts(buyers, search, sort),
    [buyers, search, sort],
  );

  return (
    <PagePlaceholder description="" hideHeader title="">
      <div className="grid gap-4">
        <section className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-stone-900">Compradores activos</h1>
              <p className="text-sm text-stone-500">
                {buyersQuery.isLoading ? "Cargando..." : `${filteredBuyers.length} visibles de ${buyersCount}`}
              </p>
            </div>
            <span className="rounded-full bg-stone-100 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-stone-600">
              Activos
            </span>
          </div>

          <input
            className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            onChange={(event) => {
              const nextValue = event.target.value;
              const nextSearchParams = new URLSearchParams(searchParams);

              setSearch(nextValue);
              setPage(1);

              if (nextValue.trim()) {
                nextSearchParams.set("q", nextValue);
              } else {
                nextSearchParams.delete("q");
              }

              setSearchParams(nextSearchParams, { replace: true });
            }}
            placeholder="Buscar comprador"
            type="search"
            value={search}
          />

          <select
            className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            onChange={(event) => {
              const nextValue = event.target.value as (typeof SORT_OPTIONS)[number]["value"];
              const nextSearchParams = new URLSearchParams(searchParams);

              setSort(nextValue);

              if (nextValue === "most_orders") {
                nextSearchParams.delete("sort");
              } else {
                nextSearchParams.set("sort", nextValue);
              }

              setSearchParams(nextSearchParams, { replace: true });
            }}
            value={sort}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </section>

        {buyersQuery.error?.message ? (
          <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {buyersQuery.error.message}
          </div>
        ) : null}

        {buyersQuery.isLoading ? (
          <LoadingPanel label="Cargando compradores..." />
        ) : filteredBuyers.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-300 bg-white/85 p-6 text-sm text-stone-600">
            No encontramos compradores con esa busqueda.
          </div>
        ) : (
          <section className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="grid gap-2 px-1 text-xs font-semibold uppercase tracking-widest text-stone-500 md:grid-cols-[minmax(0,1.8fr)_96px_96px_140px] md:px-3">
              <span>Comprador</span>
              <span className="hidden md:block">Compras</span>
              <span className="hidden md:block">Favoritos</span>
              <span className="hidden md:block">Gasto</span>
            </div>

            <div className="max-h-[calc(100dvh-18rem)] overflow-y-auto pr-1 [scrollbar-width:thin] sm:max-h-[calc(100dvh-19rem)] xl:max-h-[calc(100dvh-14rem)]">
              <div className="grid gap-2">
                {filteredBuyers.map((buyer) => (
                  <Link
                    key={buyer.id}
                    className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50/80 px-3 py-3 transition-colors hover:border-ocean-300 hover:bg-white md:grid-cols-[minmax(0,1.8fr)_96px_96px_140px] md:items-center"
                    to={`/cliente/${buyer.id}`}
                  >
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-3">
                        <UserAvatar
                          imageUrl={buyer.profile_image_url}
                          label={buyer.full_name}
                          sizeClassName="h-11 w-11"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-stone-900">
                            {buyer.full_name}
                          </p>
                          <p className="truncate text-xs text-stone-500">{buyer.email}</p>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-stone-500">
                        <span>Desde {formatMemberSince(buyer.created_at)}</span>
                        <span>Actividad {formatShortDate(buyer.lastActivityAt)}</span>
                        {buyer.openOrdersCount > 0 ? (
                          <span className="rounded-full bg-brand-50 px-2 py-1 font-medium text-brand-600">
                            {buyer.openOrdersCount} abierta{buyer.openOrdersCount === 1 ? "" : "s"}
                          </span>
                        ) : null}
                        {buyer.hasPhone ? (
                          <span className="rounded-full bg-stone-100 px-2 py-1 font-medium text-stone-600">
                            Telefono
                          </span>
                        ) : null}
                        {buyer.hasShippingAddress ? (
                          <span className="rounded-full bg-stone-100 px-2 py-1 font-medium text-stone-600">
                            Direccion
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {(buyer.interestTerms.length > 0
                          ? buyer.interestTerms
                          : ["Sin preferencias marcadas"])
                          .slice(0, 4)
                          .map((term) => (
                            <span
                              key={`${buyer.id}-${term}`}
                              className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[11px] text-stone-600"
                            >
                              {term}
                            </span>
                          ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-sm md:block md:text-center">
                      <span className="text-xs uppercase tracking-widest text-stone-400 md:hidden">
                        Compras
                      </span>
                      <div>
                        <span className="font-semibold text-stone-800">{buyer.ordersCount}</span>
                        <p className="mt-1 text-[11px] text-stone-500">
                          {buyer.paidOrdersCount} pagadas
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-sm md:block md:text-center">
                      <span className="text-xs uppercase tracking-widest text-stone-400 md:hidden">
                        Favoritos
                      </span>
                      <span className="font-semibold text-stone-800">{buyer.favoritesCount}</span>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-sm md:block md:text-center">
                      <span className="text-xs uppercase tracking-widest text-stone-400 md:hidden">
                        Gasto
                      </span>
                      <span className="font-semibold text-stone-800">
                        {formatCurrency(buyer.totalSpent)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <PaginationControls
              currentPage={page}
              isLoading={buyersQuery.isLoading}
              onPageChange={setPage}
              pageSize={BUYERS_PAGE_SIZE}
              totalCount={buyersCount}
            />
          </section>
        )}
      </div>
    </PagePlaceholder>
  );
}

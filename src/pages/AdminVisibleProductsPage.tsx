import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";

import { LoadingPanel } from "../components/LoadingPanel";
import { PagePlaceholder } from "../components/PagePlaceholder";
import {
  buildAdminProductControlViews,
  filterAndSortAdminProductControlViews,
} from "../features/admin/adminProductControlUtils";
import { useAdminProductControlSnapshot } from "../features/admin/adminQueries";

const SORT_OPTIONS = [
  { label: "Mas nuevo", value: "newest" },
  { label: "Mas antiguo", value: "oldest" },
  { label: "Mayor precio", value: "highest_price" },
  { label: "Mas ventas", value: "most_sales" },
  { label: "Mayor facturacion", value: "highest_revenue" },
] as const;

export function AdminVisibleProductsPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]["value"]>("newest");
  const productControlQuery = useAdminProductControlSnapshot();
  const products = useMemo(() => productControlQuery.data?.products ?? [], [productControlQuery.data?.products]);
  const artisans = useMemo(() => productControlQuery.data?.artisans ?? [], [productControlQuery.data?.artisans]);
  const sales = useMemo(() => productControlQuery.data?.sales ?? [], [productControlQuery.data?.sales]);
  const controlRecords = useMemo(
    () => productControlQuery.data?.controlRecords ?? [],
    [productControlQuery.data?.controlRecords],
  );
  const isLoading = productControlQuery.isLoading;
  const errorMessage = productControlQuery.error?.message ?? null;
  const warningMessage = productControlQuery.data?.warningMessage ?? null;

  useEffect(() => {
    setSearch(searchParams.get("q") ?? "");
    const requestedSort = searchParams.get("sort");
    setSort(
      SORT_OPTIONS.some((option) => option.value === requestedSort)
        ? (requestedSort as (typeof SORT_OPTIONS)[number]["value"])
        : "newest",
    );
  }, [searchParams]);

  const productItems = useMemo(
    () =>
      buildAdminProductControlViews(products, artisans, sales, controlRecords).filter(
        (item) => item.product.is_active,
      ),
    [products, artisans, sales, controlRecords],
  );

  const filteredItems = useMemo(
    () => filterAndSortAdminProductControlViews(productItems, search, sort),
    [productItems, search, sort],
  );

  return (
    <PagePlaceholder description="" hideHeader title="">
      <div className="grid gap-4">
        <section className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-stone-900">Productos visibles</h1>
              <p className="text-sm text-stone-500">
                {isLoading ? "Cargando..." : `${filteredItems.length} visibles`}
              </p>
            </div>
            <span className="rounded-full bg-stone-100 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-stone-600">
              Publicados
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_15rem]">
            <input
              className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100"
              onChange={(event) => {
                const nextValue = event.target.value;
                const nextSearchParams = new URLSearchParams(searchParams);

                setSearch(nextValue);

                if (nextValue.trim()) {
                  nextSearchParams.set("q", nextValue);
                } else {
                  nextSearchParams.delete("q");
                }

                setSearchParams(nextSearchParams, { replace: true });
              }}
              placeholder="Buscar producto, lote, vendedor o categoria"
              type="search"
              value={search}
            />

            <select
              className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100"
              onChange={(event) => {
                const nextValue = event.target.value as (typeof SORT_OPTIONS)[number]["value"];
                const nextSearchParams = new URLSearchParams(searchParams);

                setSort(nextValue);

                if (nextValue === "newest") {
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
          </div>
        </section>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {warningMessage ? (
          <div className="rounded-2xl border border-brand-300 bg-brand-50 px-4 py-3 text-sm text-brand-800">
            {warningMessage}
          </div>
        ) : null}

        {isLoading ? (
          <LoadingPanel label="Cargando productos..." />
        ) : filteredItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-300 bg-white/85 p-6 text-sm text-stone-600">
            No encontramos productos con esa busqueda.
          </div>
        ) : (
          <section className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="grid gap-2 px-1 text-xs font-semibold uppercase tracking-widest text-stone-500 md:grid-cols-[minmax(0,2fr)_120px_140px_130px] md:px-3">
              <span>Producto</span>
              <span className="hidden md:block">Precio</span>
              <span className="hidden md:block">Estado</span>
              <span className="hidden md:block">Ventas</span>
            </div>

            <div className="max-h-[calc(100dvh-18rem)] overflow-y-auto pr-1 [scrollbar-width:thin] sm:max-h-[calc(100dvh-19rem)] xl:max-h-[calc(100dvh-14rem)]">
              <div className="grid gap-2">
                {filteredItems.map((item) => (
                  <Link
                    key={item.id}
                    className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50/80 px-3 py-3 transition-colors hover:border-ocean-300 hover:bg-white md:grid-cols-[minmax(0,2fr)_120px_140px_130px] md:items-center"
                    state={{
                      adminProductOrigin: `${location.pathname}${location.search}`,
                    }}
                    to={`/panel/admin/control-productos?productId=${item.id}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {item.imageUrl ? (
                        <img
                          alt={item.title}
                          className="h-12 w-12 shrink-0 rounded-xl border border-stone-200 object-cover"
                          decoding="async"
                          loading="lazy"
                          src={item.imageUrl}
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-100 text-[10px] font-medium text-stone-400">
                          Sin foto
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-stone-900">{item.title}</p>
                        <p className="truncate text-xs text-stone-500">
                          {item.artisanLabel} · {item.categoryLabel}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-sm md:block md:text-center">
                      <span className="text-xs uppercase tracking-widest text-stone-400 md:hidden">
                        Precio
                      </span>
                      <span className="font-semibold text-stone-800">{item.priceLabel}</span>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-sm md:block md:text-center">
                      <span className="text-xs uppercase tracking-widest text-stone-400 md:hidden">
                        Estado
                      </span>
                      <span className="font-medium text-stone-700">{item.statusLabel}</span>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-sm md:block md:text-center">
                      <span className="text-xs uppercase tracking-widest text-stone-400 md:hidden">
                        Ventas
                      </span>
                      <span className="font-semibold text-stone-800">{item.salesCountLabel}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </PagePlaceholder>
  );
}

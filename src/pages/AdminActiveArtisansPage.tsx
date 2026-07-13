import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";

import { LoadingPanel } from "../components/LoadingPanel";
import { PagePlaceholder } from "../components/PagePlaceholder";
import { UserAvatar } from "../components/UserAvatar";
import {
  buildArtisanSummaries,
  filterAndSortArtisans,
} from "../features/admin/adminDashboardUtils";
import { useAdminDashboardData } from "../features/admin/useAdminDashboardData";

const SORT_OPTIONS = [
  { label: "Mas productos", value: "most_products" },
  { label: "Mas ventas", value: "most_sales" },
  { label: "Mayor facturacion total", value: "highest_revenue" },
  { label: "Mas antiguo", value: "oldest" },
  { label: "Mas nuevo", value: "newest" },
] as const;

const VISIBILITY_FILTERS = [
  { label: "Visibles", value: "visible" },
  { label: "Ocultas", value: "hidden" },
  { label: "Todas", value: "all" },
] as const;

export function AdminActiveArtisansPage() {
  const { artisans, errorMessage, isLoading, products, sales } = useAdminDashboardData();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]["value"]>("most_sales");
  const [visibilityFilter, setVisibilityFilter] =
    useState<(typeof VISIBILITY_FILTERS)[number]["value"]>("visible");

  useEffect(() => {
    setSearch(searchParams.get("q") ?? "");
    const requestedSort = searchParams.get("sort");
    setSort(
      SORT_OPTIONS.some((option) => option.value === requestedSort)
        ? (requestedSort as (typeof SORT_OPTIONS)[number]["value"])
        : "most_sales",
    );
    const requestedVisibility = searchParams.get("visibility");
    setVisibilityFilter(
      VISIBILITY_FILTERS.some((option) => option.value === requestedVisibility)
        ? (requestedVisibility as (typeof VISIBILITY_FILTERS)[number]["value"])
        : "visible",
    );
  }, [searchParams]);

  const artisanSummaries = useMemo(
    () => buildArtisanSummaries(artisans, products, sales),
    [artisans, products, sales],
  );

  const filteredArtisans = useMemo(() => {
    const visibleArtisans = artisanSummaries.filter((artisan) => {
      if (visibilityFilter === "all") {
        return true;
      }

      const isHidden = Boolean(artisan.storefront_hidden_at);

      return visibilityFilter === "hidden" ? isHidden : !isHidden;
    });

    return filterAndSortArtisans(visibleArtisans, search, sort);
  }, [artisanSummaries, search, sort, visibilityFilter]);

  return (
    <PagePlaceholder description="" hideHeader title="">
      <div className="grid gap-4">
        <section className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-stone-900">Vendedores activos</h1>
              <p className="text-sm text-stone-500">
                {isLoading ? "Cargando..." : `${filteredArtisans.length} perfiles`}
              </p>
            </div>
            <span className="rounded-full bg-stone-100 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-stone-600">
              Activos
            </span>
          </div>

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
            placeholder="Buscar vendedor"
            type="search"
            value={search}
          />

          <div className="flex flex-wrap gap-2">
            {VISIBILITY_FILTERS.map((option) => (
              <button
                className={[
                  "inline-flex min-h-9 items-center justify-center rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors",
                  visibilityFilter === option.value
                    ? "border-ocean-500 bg-ocean-500 text-white"
                    : "border-stone-200 bg-white text-stone-600 hover:bg-ocean-50 hover:text-ocean-500",
                ].join(" ")}
                key={option.value}
                onClick={() => {
                  const nextSearchParams = new URLSearchParams(searchParams);

                  if (option.value === "visible") {
                    nextSearchParams.delete("visibility");
                  } else {
                    nextSearchParams.set("visibility", option.value);
                  }

                  setVisibilityFilter(option.value);
                  setSearchParams(nextSearchParams, { replace: true });
                }}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>

          <select
            className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100"
            onChange={(event) => {
              const nextValue = event.target.value as (typeof SORT_OPTIONS)[number]["value"];
              const nextSearchParams = new URLSearchParams(searchParams);

              setSort(nextValue);

              if (nextValue === "most_sales") {
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

        {errorMessage ? (
          <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {isLoading ? (
          <LoadingPanel label="Cargando vendedores..." />
        ) : filteredArtisans.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-300 bg-white/85 p-6 text-sm text-stone-600">
            No encontramos vendedores con esa busqueda.
          </div>
        ) : (
          <section className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="grid gap-2 px-1 text-xs font-semibold uppercase tracking-widest text-stone-500 md:grid-cols-[minmax(0,1.6fr)_120px_120px] md:px-3">
              <span>Vendedor</span>
              <span className="hidden md:block">Productos</span>
              <span className="hidden md:block">Ventas</span>
            </div>

            <div className="max-h-[calc(100dvh-18rem)] overflow-y-auto pr-1 [scrollbar-width:thin] sm:max-h-[calc(100dvh-19rem)] xl:max-h-[calc(100dvh-14rem)]">
              <div className="grid gap-2">
                {filteredArtisans.map((artisan) => (
                  <Link
                    key={artisan.id}
                    className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50/80 px-3 py-3 transition-colors hover:border-ocean-300 hover:bg-white md:grid-cols-[minmax(0,1.6fr)_120px_120px] md:items-center"
                    state={{
                      adminSellerOrigin: `${location.pathname}${location.search}`,
                    }}
                    to={`/panel/admin/vendedores/${artisan.id}/tienda`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar
                        imageUrl={artisan.profile_image_url}
                        label={artisan.store_name?.trim() || artisan.full_name}
                        sizeClassName="h-11 w-11"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-stone-900">
                          {artisan.store_name?.trim() || artisan.full_name}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <p className="truncate text-xs text-stone-500">{artisan.full_name}</p>
                          {artisan.storefront_hidden_at ? (
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-red-700">
                              Oculta
                            </span>
                          ) : null}
                          {Number(artisan.storefront_boost_multiplier ?? 1) > 1 ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-700">
                              Impulsada
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-sm md:block md:text-center">
                      <span className="text-xs uppercase tracking-widest text-stone-400 md:hidden">
                        Productos
                      </span>
                      <span className="font-semibold text-stone-800">{artisan.productsCount}</span>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-sm md:block md:text-center">
                      <span className="text-xs uppercase tracking-widest text-stone-400 md:hidden">
                        Ventas
                      </span>
                      <span className="font-semibold text-stone-800">{artisan.salesCount}</span>
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

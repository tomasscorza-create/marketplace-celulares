import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LoadingPanel } from "../components/LoadingPanel";
import { PagePlaceholder } from "../components/PagePlaceholder";
import { useAdminArtisanProfiles } from "../features/admin/adminQueries";
import type { AdminArtisanProfile } from "../types/admin";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function AdminProductsPage() {
  const [search, setSearch] = useState("");
  const artisansQuery = useAdminArtisanProfiles();
  const artisans = useMemo<AdminArtisanProfile[]>(() => artisansQuery.data ?? [], [artisansQuery.data]);
  const isLoading = artisansQuery.isLoading;
  const errorMessage = artisansQuery.error?.message ?? null;

  const filteredArtisans = useMemo(() => {
    const normalizedSearch = normalizeText(search.trim());

    if (!normalizedSearch) {
      return artisans;
    }

    return artisans.filter((artisan) => {
      const target = normalizeText(
        [artisan.store_name, artisan.full_name, artisan.email].filter(Boolean).join(" "),
      );

      return target.includes(normalizedSearch);
    });
  }, [artisans, search]);

  return (
    <PagePlaceholder description="" hideHeader title="">
      <div className="grid gap-4">
        <section className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
          <input
            className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            onChange={(event) => {
              setSearch(event.target.value);
            }}
            placeholder="Buscar vendedor para crear o editar productos"
            type="search"
            value={search}
          />

          <Link
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-ocean-500/25 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-ocean-500 transition-colors hover:bg-[#d4e3f5]"
            to="/panel/admin/control-productos"
          >
            <svg
              className="h-4 w-4 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Control de productos
          </Link>
        </section>

        {errorMessage ? (
          <p className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        {isLoading ? (
          <LoadingPanel label="Cargando cuentas vendedoras..." />
        ) : filteredArtisans.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-300 bg-white/80 p-6 text-sm leading-6 text-stone-600">
            {artisans.length === 0
              ? "Todavía no hay cuentas vendedoras creadas."
              : "No encontramos cuentas con esa búsqueda."}
          </div>
        ) : (
          <section className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="flex items-center justify-between gap-3 px-2 py-1 text-xs font-semibold uppercase tracking-widest text-stone-500">
              <span>Cuentas vendedoras</span>
              <span>{filteredArtisans.length} resultado(s)</span>
            </div>

            <div className="max-h-[min(68dvh,56rem)] overflow-y-auto pr-1 [scrollbar-width:thin]">
              <div className="grid gap-3">
                {filteredArtisans.map((artisan) => (
                  <article
                    key={artisan.id}
                    className="grid gap-4 rounded-3xl border border-stone-200 bg-stone-50/80 p-4 lg:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div className="min-w-0 space-y-2">
                      <h2 className="text-base font-semibold text-stone-900">
                        {artisan.store_name || artisan.full_name}
                      </h2>
                      <p className="text-sm text-stone-600">{artisan.full_name}</p>
                      <p className="break-all text-sm text-stone-500">{artisan.email}</p>
                    </div>

                    <div className="grid gap-2 lg:w-52">
                      <Link
                        className="inline-flex w-full items-center justify-center rounded-full bg-brand-500 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#001f4d]"
                        to={`/panel/admin/productos/${artisan.id}?focus=create`}
                      >
                        Cargar
                      </Link>
                      <Link
                        className="inline-flex w-full items-center justify-center rounded-full border border-ocean-100 bg-white px-5 py-3 text-sm font-medium text-ocean-600 transition-colors hover:bg-ocean-50"
                        to={`/panel/admin/productos/${artisan.id}?mode=edit`}
                      >
                        Gestionar
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </PagePlaceholder>
  );
}

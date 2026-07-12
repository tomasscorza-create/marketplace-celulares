import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { PagePlaceholder } from "../components/PagePlaceholder";
import { SkeletonBlock } from "../components/SkeletonBlock";
import { PublicStorefrontCard } from "../features/public/components/PublicStorefrontCard";
import { usePublicStorefrontsPage } from "../features/public/publicQueries";

const ARTISANS_PAGE_SIZE = 12;

export function ArtisansPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const querySearch = searchParams.get("q") ?? "";
  const page = Math.max(1, Number(searchParams.get("pagina") ?? "1") || 1);
  const [draftSearch, setDraftSearch] = useState(querySearch);
  const storefrontsQuery = usePublicStorefrontsPage({
    limit: ARTISANS_PAGE_SIZE,
    page,
    search: querySearch || undefined,
  });

  const storefrontsPage = storefrontsQuery.data;
  const storefronts = useMemo(() => storefrontsPage?.items ?? [], [storefrontsPage]);
  const totalCount = storefrontsPage?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / ARTISANS_PAGE_SIZE));
  const isLoading = storefrontsQuery.isLoading;
  const errorMessage = storefrontsQuery.error ? storefrontsQuery.error.message : null;

  useEffect(() => {
    setDraftSearch(querySearch);
  }, [querySearch]);

  useEffect(() => {
    if (!storefrontsQuery.data || page <= totalPages) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("pagina", String(totalPages));
    setSearchParams(nextParams, { replace: true });
  }, [page, searchParams, setSearchParams, storefrontsQuery.data, totalPages]);

  function updateParams(nextValues: {
    page?: number;
    search?: string;
  }) {
    const nextParams = new URLSearchParams(searchParams);
    const nextSearch = nextValues.search ?? querySearch;
    const nextPage = nextValues.page ?? page;

    if (nextSearch.trim()) {
      nextParams.set("q", nextSearch.trim());
    } else {
      nextParams.delete("q");
    }

    if (nextPage > 1) {
      nextParams.set("pagina", String(nextPage));
    } else {
      nextParams.delete("pagina");
    }

    setSearchParams(nextParams);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateParams({
      page: 1,
      search: draftSearch,
    });
  }

  function clearSearch() {
    setDraftSearch("");
    setSearchParams({});
  }

  function handlePageChange(nextPage: number) {
    updateParams({
      page: nextPage,
    });
  }

  return (
    <PagePlaceholder description="" hideHeader title="">
      <div className="grid gap-4">
        <section className="grid gap-2">
          <form className="flex items-center gap-2" onSubmit={handleSearchSubmit}>
            <Link
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-ocean-200 bg-white px-3.5 text-sm font-medium text-ocean-600 transition-colors hover:bg-ocean-50 sm:h-11 sm:px-4"
              to="/catalogo"
            >
              Catálogo
            </Link>
            <div className="relative min-w-0 flex-1">
              <svg
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
              <input
                className="h-10 w-full rounded-full border border-stone-300 bg-white py-2 pl-10 pr-12 text-sm text-stone-900 outline-none transition-colors focus:border-sun-500 sm:h-11"
                onChange={(event) => {
                  setDraftSearch(event.target.value);
                }}
                placeholder="Buscar vendedores"
                type="search"
                value={draftSearch}
              />
              <button
                className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-ocean-600 text-white transition-colors hover:bg-ocean-600"
                type="submit"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
                <span className="sr-only">Buscar vendedores</span>
              </button>
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            {querySearch.trim() ? (
              <span className="rounded-full bg-ocean-50 px-2.5 py-1 text-xs font-semibold text-ocean-600">
                {querySearch.trim()}
              </span>
            ) : null}
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600">
              {totalCount === 1 ? "1 vendedor" : `${totalCount} vendedores`}
            </span>
            {querySearch.trim() ? (
              <button
                className="rounded-full border border-stone-300 bg-white px-3 py-1 text-xs font-semibold text-stone-700 transition-colors hover:border-brand-300 hover:text-brand-500"
                onClick={clearSearch}
                type="button"
              >
                Limpiar
              </button>
            ) : null}
          </div>
        </section>

        {errorMessage ? (
          <div className="rounded-2xl border border-brand-500 bg-[#D1FAE5] px-4 py-3 text-sm text-brand-500">
            {errorMessage}
          </div>
        ) : null}

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: ARTISANS_PAGE_SIZE }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <SkeletonBlock className="h-12 w-12 rounded-2xl" />
                  <div className="grid flex-1 gap-2">
                    <SkeletonBlock className="h-4 w-2/3" />
                    <SkeletonBlock className="h-4 w-1/2" />
                  </div>
                </div>
                <SkeletonBlock className="mt-3 h-4 w-full" />
                <SkeletonBlock className="mt-2 h-4 w-4/5" />
                <SkeletonBlock className="mt-3 h-9 w-full rounded-full" />
              </div>
            ))}
          </div>
        ) : null}

        {!isLoading && !errorMessage ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {storefronts.map((storefront) => (
              <PublicStorefrontCard
                key={storefront.id}
                showCatalogLink={false}
                storefront={storefront}
              />
            ))}
          </div>
        ) : null}

        {!isLoading && !errorMessage && storefronts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-300 bg-white/85 p-5 text-sm leading-6 text-stone-600">
            No encontramos vendedores para esa búsqueda.
          </div>
        ) : null}

        {!isLoading && !errorMessage && storefronts.length > 0 && totalPages > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3">
            <p className="text-sm text-stone-500">
              Página {page} de {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:border-ocean-300 hover:text-ocean-600 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => {
                  handlePageChange(page - 1);
                }}
                type="button"
              >
                Anterior
              </button>
              <button
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-ocean-200 bg-ocean-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ocean-600 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => {
                  handlePageChange(page + 1);
                }}
                type="button"
              >
                Siguiente
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </PagePlaceholder>
  );
}

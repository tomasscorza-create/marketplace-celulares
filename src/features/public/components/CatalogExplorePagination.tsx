type CatalogExplorePaginationProps = {
  currentPage: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  pages: (number | null)[];
  totalPages: number;
};

export function CatalogExplorePagination({
  currentPage,
  disabled = false,
  onPageChange,
  pages,
  totalPages,
}: CatalogExplorePaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Paginacion de productos"
      className="flex flex-wrap items-center justify-center gap-2 rounded-3xl border border-stone-200 bg-white px-3 py-3 shadow-sm"
    >
      <button
        aria-label="Ir a la pagina anterior"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-stone-600 transition-colors hover:border-ocean-500 hover:bg-brand-50 hover:text-ocean-500 disabled:cursor-not-allowed disabled:opacity-45"
        disabled={disabled || currentPage <= 1}
        onClick={() => {
          onPageChange(currentPage - 1);
        }}
        type="button"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            d="M15 18l-6-6 6-6"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </svg>
        <span className="sr-only">Pagina anterior</span>
      </button>

      {pages.map((pageNumber, index) =>
        pageNumber === null ? (
          <span
            key={`sep-${index}`}
            aria-hidden="true"
            className="inline-flex min-w-6 items-end justify-center pb-0.5 text-sm font-semibold text-stone-400 select-none"
          >
            …
          </span>
        ) : (
          <button
            key={pageNumber}
            aria-current={pageNumber === currentPage ? "page" : undefined}
            aria-label={`Ir a la pagina ${pageNumber}`}
            className={[
              "inline-flex min-w-10 items-center justify-center rounded-full border px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55",
              pageNumber === currentPage
                ? "border-ocean-500 bg-ocean-500 text-white"
                : "border-stone-200 bg-white text-stone-600 hover:border-ocean-500 hover:bg-brand-50 hover:text-ocean-500",
            ].join(" ")}
            disabled={disabled}
            onClick={() => {
              onPageChange(pageNumber);
            }}
            type="button"
          >
            {pageNumber}
          </button>
        ),
      )}

      <button
        aria-label="Ir a la pagina siguiente"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-stone-600 transition-colors hover:border-ocean-500 hover:bg-brand-50 hover:text-ocean-500 disabled:cursor-not-allowed disabled:opacity-45"
        disabled={disabled || currentPage >= totalPages}
        onClick={() => {
          onPageChange(currentPage + 1);
        }}
        type="button"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            d="M9 6l6 6-6 6"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </svg>
        <span className="sr-only">Pagina siguiente</span>
      </button>

      <span aria-live="polite" className="px-2 text-xs font-semibold uppercase tracking-widest text-stone-400">
        Pagina {currentPage} de {totalPages}
      </span>
    </nav>
  );
}

type PaginationControlsProps = {
  currentPage: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  pageSize: number;
  totalCount: number;
};

export function PaginationControls({
  currentPage,
  isLoading = false,
  onPageChange,
  pageSize,
  totalCount,
}: PaginationControlsProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const normalizedPage = Math.min(Math.max(currentPage, 1), totalPages);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] border border-stone-200 bg-white px-3 py-3 text-sm text-stone-600">
      <span>
        Pagina {normalizedPage} de {totalPages}
      </span>
      <div className="flex gap-2">
        <button
          className="rounded-full border border-stone-300 px-4 py-2 font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={isLoading || normalizedPage <= 1}
          onClick={() => onPageChange(normalizedPage - 1)}
          type="button"
        >
          Anterior
        </button>
        <button
          className="rounded-full bg-ocean-500 px-4 py-2 font-medium text-white transition-colors hover:bg-[#001f4d] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={isLoading || normalizedPage >= totalPages}
          onClick={() => onPageChange(normalizedPage + 1)}
          type="button"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}


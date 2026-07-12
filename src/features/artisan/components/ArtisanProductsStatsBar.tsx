import { memo } from "react";

type ArtisanProductsStatsBarProps = {
  totalCount: number;
  batchProductsCount: number;
  standaloneProductsCount: number;
};

/**
 * Tres tarjetas de conteos al inicio de la página de productos del
 * vendedor: total, dentro de grupos, individuales. Memoizado porque
 * el padre re-renderiza muy seguido.
 */
function ArtisanProductsStatsBarInner({
  totalCount,
  batchProductsCount,
  standaloneProductsCount,
}: ArtisanProductsStatsBarProps) {
  return (
    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
          Productos cargados
        </p>
        <p className="mt-1 text-2xl font-semibold text-stone-900">{totalCount}</p>
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
          Dentro de grupos
        </p>
        <p className="mt-1 text-2xl font-semibold text-stone-900">{batchProductsCount}</p>
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
          Individuales
        </p>
        <p className="mt-1 text-2xl font-semibold text-stone-900">{standaloneProductsCount}</p>
      </div>
    </div>
  );
}

export const ArtisanProductsStatsBar = memo(ArtisanProductsStatsBarInner);

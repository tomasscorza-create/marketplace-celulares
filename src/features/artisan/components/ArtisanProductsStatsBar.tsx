import { memo } from "react";

type ArtisanProductsStatsBarProps = {
  totalCount: number;
};

function ArtisanProductsStatsBarInner({ totalCount }: ArtisanProductsStatsBarProps) {
  return (
    <div className="mb-5">
      <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
          Productos cargados
        </p>
        <p className="mt-1 text-2xl font-semibold text-stone-900">{totalCount}</p>
      </div>
    </div>
  );
}

export const ArtisanProductsStatsBar = memo(ArtisanProductsStatsBarInner);

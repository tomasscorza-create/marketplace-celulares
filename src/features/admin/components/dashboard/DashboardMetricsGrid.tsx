import { memo } from "react";

import { SkeletonBlock } from "../../../../components/SkeletonBlock";

type DashboardPanelKey = "artisans" | "products" | "batches" | "sales" | "categories";

type DashboardMetricsGridProps = {
  isLoading: boolean;
  activeArtisansCount: number;
  activeBuyersCount: number;
  visibleProductsCount: number;
  batchesCount: number;
  salesCount: number;
  activeCategoriesCount: number;
  onOpenActiveArtisans: () => void;
  onOpenActiveBuyers: () => void;
  onOpenVisibleProducts: () => void;
  onSelectPanel: (panel: DashboardPanelKey) => void;
};

function MetricCard({
  accentClass,
  label,
  onClick,
  value,
}: {
  accentClass: string;
  label: string;
  onClick: () => void;
  value: string | number;
}) {
  return (
    <button
      className="grid gap-2 rounded-[1.75rem] border border-stone-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md"
      onClick={onClick}
      type="button"
    >
      <span className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${accentClass}`}>
        {label}
      </span>
      <span className="text-3xl font-semibold tracking-tight text-stone-900">{value}</span>
    </button>
  );
}

/**
 * Grilla de 5 métricas clickeables del dashboard admin: vendedores,
 * productos visibles, grupos, ventas, categorías. Cada click abre el
 * drawer correspondiente.
 */
function DashboardMetricsGridInner({
  isLoading,
  activeArtisansCount,
  activeBuyersCount,
  visibleProductsCount,
  batchesCount,
  salesCount,
  activeCategoriesCount,
  onOpenActiveArtisans,
  onOpenActiveBuyers,
  onOpenVisibleProducts,
  onSelectPanel,
}: DashboardMetricsGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm"
          >
            <SkeletonBlock className="h-4 w-24 rounded-full" />
            <SkeletonBlock className="mt-4 h-10 w-20 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      <MetricCard
        accentClass="text-brand-500"
        label="Vendedores activos"
        onClick={onOpenActiveArtisans}
        value={activeArtisansCount}
      />
      <MetricCard
        accentClass="text-ocean-500"
        label="Compradores activos"
        onClick={onOpenActiveBuyers}
        value={activeBuyersCount}
      />
      <MetricCard
        accentClass="text-ocean-500"
        label="Productos visibles"
        onClick={onOpenVisibleProducts}
        value={visibleProductsCount}
      />
      <MetricCard
        accentClass="text-brand-500"
        label="Grupos cargados"
        onClick={() => onSelectPanel("batches")}
        value={batchesCount}
      />
      <MetricCard
        accentClass="text-ocean-500"
        label="Ventas registradas"
        onClick={() => onSelectPanel("sales")}
        value={salesCount}
      />
      <MetricCard
        accentClass="text-stone-500"
        label="Categorías activas"
        onClick={() => onSelectPanel("categories")}
        value={activeCategoriesCount}
      />
    </div>
  );
}

export const DashboardMetricsGrid = memo(DashboardMetricsGridInner);

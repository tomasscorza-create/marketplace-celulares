import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { DownloadableQr } from "../components/DownloadableQr";
import { PagePlaceholder } from "../components/PagePlaceholder";
import {
  ADMIN_DASHBOARD_PANEL_META,
  buildArtisanSummaries,
  buildCategorySummaries,
  filterAndSortArtisans,
  filterAndSortCategories,
  filterAndSortProducts,
  filterAndSortSales,
  type DashboardPanel,
  type DashboardPanelKey,
} from "../features/admin/adminDashboardUtils";
import { AdminMarketplaceFlyerGenerator } from "../features/admin/components/AdminMarketplaceFlyerGenerator";
import { DashboardDetailDrawer } from "../features/admin/components/dashboard/DashboardDetailDrawer";
import { DashboardMetricsGrid } from "../features/admin/components/dashboard/DashboardMetricsGrid";
import { useAdminDashboardData } from "../features/admin/useAdminDashboardData";
import { buildPublicMarketplaceUrl } from "../lib/publicUrls";

const marketplaceQrUrl = buildPublicMarketplaceUrl();

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const {
    artisans,
    buyers,
    categories,
    errorMessage,
    isLoading,
    products,
    sales,
    salesCount,
    visibleProductsCount,
    warningMessage,
  } =
    useAdminDashboardData();
  const [activePanel, setActivePanel] = useState<DashboardPanel>(null);
  const [searchValue, setSearchValue] = useState("");
  const [sortValue, setSortValue] = useState("newest");
  const deferredSearch = useDeferredValue(searchValue.trim().toLowerCase());

  useEffect(() => {
    if (!activePanel) {
      return;
    }

    if (activePanel === "artisans") {
      setSortValue("most_sales");
      return;
    }

    if (activePanel === "products") {
      setSortValue("newest");
      return;
    }

    if (activePanel === "sales") {
      setSortValue("newest");
      return;
    }

    setSortValue("active_first");
  }, [activePanel]);

  const artisanSummaries = useMemo(
    () => buildArtisanSummaries(artisans, products, sales),
    [artisans, products, sales],
  );
  const categorySummaries = useMemo(
    () => buildCategorySummaries(categories, products),
    [categories, products],
  );

  const activeCategoriesCount = categories.filter((category) => category.is_active).length;

  const filteredArtisans = useMemo(
    () => filterAndSortArtisans(artisanSummaries, deferredSearch, sortValue),
    [artisanSummaries, deferredSearch, sortValue],
  );
  const filteredProducts = useMemo(
    () => filterAndSortProducts(artisans, products, deferredSearch, sortValue),
    [artisans, products, deferredSearch, sortValue],
  );
  const filteredSales = useMemo(
    () => filterAndSortSales(artisans, sales, deferredSearch, sortValue),
    [artisans, sales, deferredSearch, sortValue],
  );
  const filteredCategories = useMemo(
    () => filterAndSortCategories(categorySummaries, deferredSearch, sortValue),
    [categorySummaries, deferredSearch, sortValue],
  );

  const handleSelectPanel = (panel: DashboardPanelKey) => {
    setActivePanel(panel);
    setSearchValue("");
  };

  return (
    <PagePlaceholder description="" hideHeader title="">
      {errorMessage ? (
        <p className="mb-5 rounded-2xl border border-brand-500 bg-brand-100 px-4 py-3 text-sm text-brand-500">
          {errorMessage}
        </p>
      ) : null}

      {warningMessage ? (
        <p className="mb-5 rounded-2xl border border-brand-500 bg-brand-50 px-4 py-3 text-sm text-brand-500">
          {warningMessage}
        </p>
      ) : null}

      <div className="mb-4 flex items-center justify-between gap-3 rounded-3xl border border-stone-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(230,238,248,0.9))] px-4 py-3 shadow-sm">
        <p className="text-sm font-medium text-stone-700">
          Cada tarjeta abre su detalle para administrar esa capa del sistema.
        </p>
        <span className="rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-ocean-500">
          Acceso directo
        </span>
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-2 xl:items-stretch">
        <DownloadableQr
          description="Acceso directo al catalogo principal, listo para imprimir o compartir."
          fileBaseName="qr-marketplace-local"
          targetUrl={marketplaceQrUrl}
          title="QR del marketplace"
        />
        <AdminMarketplaceFlyerGenerator
          artisans={artisans}
          categories={categories}
          isLoading={isLoading}
          products={products}
          visibleProductsCount={visibleProductsCount}
        />
      </div>

      <DashboardMetricsGrid
        activeArtisansCount={artisanSummaries.length}
        activeBuyersCount={buyers.length}
        activeCategoriesCount={activeCategoriesCount}
        isLoading={isLoading}
        onOpenActiveArtisans={() => {
          void navigate("/panel/admin/vendedores/activos");
        }}
        onOpenActiveBuyers={() => {
          void navigate("/panel/admin/compradores/activos");
        }}
        onOpenVisibleProducts={() => {
          void navigate("/panel/admin/productos/visibles");
        }}
        onSelectPanel={handleSelectPanel}
        salesCount={salesCount}
        visibleProductsCount={visibleProductsCount}
      />

      {activePanel ? (
        <DashboardDetailDrawer
          activePanel={activePanel}
          artisans={filteredArtisans}
          categories={filteredCategories}
          onClose={() => setActivePanel(null)}
          onSearchChange={setSearchValue}
          onSortChange={setSortValue}
          panelMeta={ADMIN_DASHBOARD_PANEL_META}
          products={filteredProducts}
          sales={filteredSales}
          searchValue={searchValue}
          sortValue={sortValue}
        />
      ) : null}
    </PagePlaceholder>
  );
}

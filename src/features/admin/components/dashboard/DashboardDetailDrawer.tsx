import type { ReactNode } from "react";
import { memo } from "react";

import type {
  AdminArtisanProfile,
  AdminCategory,
  AdminDashboardProduct,
  AdminDashboardSale,
} from "../../../../types/admin";

type DashboardPanelKey = "artisans" | "products" | "sales" | "categories";

type ArtisanRow = AdminArtisanProfile & {
  productsCount: number;
  revenueTotal: number;
  salesCount: number;
};

type ProductRow = AdminDashboardProduct & { artisanName: string };
type SaleRow = AdminDashboardSale & { artisanName: string };

type CategoryRow = AdminCategory & { productsCount: number };

type DashboardDetailDrawerProps = {
  activePanel: DashboardPanelKey;
  artisans: ArtisanRow[];
  categories: CategoryRow[];
  onClose: () => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: string) => void;
  panelMeta: Record<DashboardPanelKey, { empty: string; title: string }>;
  products: ProductRow[];
  sales: SaleRow[];
  searchValue: string;
  sortValue: string;
};

function formatCurrency(value: number) {
  return `$${Number(value).toLocaleString("es-AR")}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function DetailChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600">
      {children}
    </span>
  );
}

function DashboardDetailDrawerInner({
  activePanel,
  artisans,
  categories,
  onClose,
  onSearchChange,
  onSortChange,
  panelMeta,
  products,
  sales,
  searchValue,
  sortValue,
}: DashboardDetailDrawerProps) {
  return (
    <div className="fixed inset-0 z-50 bg-stone-950/30 backdrop-blur-[2px]">
      <div className="absolute inset-0" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-[44rem] overflow-hidden border-l border-stone-200 bg-white shadow-2xl">
        <div className="grid h-full grid-rows-[auto_auto_1fr]">
          <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-4 sm:px-6">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                Detalle
              </p>
              <h2 className="text-xl font-semibold text-stone-900">
                {panelMeta[activePanel].title}
              </h2>
            </div>
            <button
              className="rounded-full border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100"
              onClick={onClose}
              type="button"
            >
              Cerrar
            </button>
          </div>

          <div className="grid gap-3 border-b border-stone-200 px-4 py-4 sm:px-6">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
              <input
                className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-ocean-300 focus:bg-white"
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Buscar"
                type="search"
                value={searchValue}
              />

              <select
                className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-ocean-300"
                onChange={(event) => onSortChange(event.target.value)}
                value={sortValue}
              >
                {activePanel === "artisans" ? (
                  <>
                    <option value="most_sales">Más ventas</option>
                    <option value="most_products">Más productos</option>
                    <option value="newest">Más nueva</option>
                    <option value="oldest">Más antigua</option>
                    <option value="alphabetical">A-Z</option>
                  </>
                ) : null}
                {activePanel === "products" ? (
                  <>
                    <option value="newest">Más nuevo</option>
                    <option value="oldest">Más antiguo</option>
                    <option value="active_first">Visibles primero</option>
                    <option value="highest_price">Mayor precio</option>
                  </>
                ) : null}
                {activePanel === "sales" ? (
                  <>
                    <option value="newest">Más nueva</option>
                    <option value="highest_amount">Mayor monto</option>
                    <option value="highest_quantity">Más unidades</option>
                  </>
                ) : null}
                {activePanel === "categories" ? (
                  <>
                    <option value="active_first">Activas primero</option>
                    <option value="name">A-Z</option>
                    <option value="newest">Más nueva</option>
                  </>
                ) : null}
              </select>
            </div>
          </div>

          <div className="overflow-y-auto px-4 py-4 sm:px-6">
            {activePanel === "artisans" && artisans.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-500">
                {panelMeta.artisans.empty}
              </p>
            ) : null}

            {activePanel === "artisans" ? (
              <div className="grid gap-3">
                {artisans.map((artisan) => (
                  <article
                    key={artisan.id}
                    className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-stone-900">
                          {artisan.store_name?.trim() || artisan.full_name}
                        </h3>
                        <p className="mt-1 text-sm text-stone-500">
                          {artisan.email}
                        </p>
                      </div>
                      <DetailChip>{formatDate(artisan.created_at)}</DetailChip>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <DetailChip>
                        {artisan.productsCount} producto(s)
                      </DetailChip>
                      <DetailChip>{artisan.salesCount} venta(s)</DetailChip>
                      <DetailChip>
                        {formatCurrency(artisan.revenueTotal)}
                      </DetailChip>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}

            {activePanel === "products" && products.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-500">
                {panelMeta.products.empty}
              </p>
            ) : null}

            {activePanel === "products" ? (
              <div className="grid gap-3">
                {products.map((product) => (
                  <article
                    key={product.id}
                    className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-stone-900">
                          {product.title}
                        </h3>
                        <p className="mt-1 text-sm text-stone-500">
                          {product.artisanName}
                        </p>
                      </div>
                      <DetailChip>{formatDate(product.created_at)}</DetailChip>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <DetailChip>
                        {product.categories?.name ?? "Sin categoría"}
                      </DetailChip>
                      <DetailChip>{formatCurrency(product.price)}</DetailChip>
                      <DetailChip>
                        {product.is_active ? "Visible" : "Oculto"}
                      </DetailChip>
                      <DetailChip>
                        {product.stock_quantity ?? 0} unidad(es)
                      </DetailChip>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}

            {activePanel === "sales" && sales.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-500">
                {panelMeta.sales.empty}
              </p>
            ) : null}

            {activePanel === "sales" ? (
              <div className="grid gap-3">
                {sales.map((sale) => (
                  <article
                    key={sale.id}
                    className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-stone-900">
                          {sale.product_title}
                        </h3>
                        <p className="mt-1 text-sm text-stone-500">
                          {sale.artisanName}
                        </p>
                      </div>
                      <DetailChip>{formatDate(sale.created_at)}</DetailChip>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <DetailChip>{sale.quantity} unidad(es)</DetailChip>
                      <DetailChip>{formatCurrency(sale.subtotal)}</DetailChip>
                      <DetailChip>Venta registrada</DetailChip>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}

            {activePanel === "categories" && categories.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-500">
                {panelMeta.categories.empty}
              </p>
            ) : null}

            {activePanel === "categories" ? (
              <div className="grid gap-3">
                {categories.map((category) => (
                  <article
                    key={category.id}
                    className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-stone-900">
                          {category.name}
                        </h3>
                        <p className="mt-1 text-sm text-stone-500">
                          {category.slug}
                        </p>
                      </div>
                      <DetailChip>{formatDate(category.created_at)}</DetailChip>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <DetailChip>
                        {category.productsCount} producto(s)
                      </DetailChip>
                      <DetailChip>
                        {category.is_active ? "Activa" : "Inactiva"}
                      </DetailChip>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}

export const DashboardDetailDrawer = memo(DashboardDetailDrawerInner);

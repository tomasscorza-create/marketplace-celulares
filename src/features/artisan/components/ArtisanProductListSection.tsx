import type { ArtisanProduct } from "../../../types/artisan";
import { getProductImageMediaItems } from "../../../types/productMedia";

import { PaginationControls } from "../../../components/PaginationControls";
import { SkeletonBlock } from "../../../components/SkeletonBlock";

type ArtisanProductListSectionProps = {
  isLoading: boolean;
  onDelete: (productId: string) => void;
  onEdit: (product: ArtisanProduct) => void;
  onProductPageChange: (page: number) => void;
  onSearchChange: (value: string) => void;
  primaryImageFor: (product: ArtisanProduct) => string | null;
  productPage: number;
  productPageSize: number;
  products: ArtisanProduct[];
  productsTotalCount: number;
  search: string;
};

function formatAvailabilityLabel(product: ArtisanProduct) {
  if (product.availability_mode === "made_to_order") {
    return product.lead_time_days ? `Bajo demanda - ${product.lead_time_days} día(s)` : "Bajo demanda";
  }

  return `Stock ${product.stock_quantity ?? 0}`;
}

function getProductImageUrls(product: ArtisanProduct) {
  const mediaImageUrls = getProductImageMediaItems(product.product_media).map(
    (item) => item.thumbnail_url ?? item.url,
  );

  return mediaImageUrls.length > 0 ? mediaImageUrls : product.image_urls;
}

export function ArtisanProductListSection({
  isLoading,
  onDelete,
  onEdit,
  onProductPageChange,
  onSearchChange,
  primaryImageFor,
  productPage,
  productPageSize,
  products,
  productsTotalCount,
  search,
}: ArtisanProductListSectionProps) {
  return (
    <section className="grid gap-4">
      <div className="grid gap-3 rounded-3xl border border-ocean-100 bg-white p-4 shadow-sm sm:p-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-stone-900">Editar productos</h2>
          <p className="text-sm text-stone-500">
            {isLoading ? "Cargando productos..." : "Gestioná tus productos desde una lista compacta."}
          </p>
        </div>

        <label className="grid gap-2 text-sm font-medium text-stone-700">
          Buscar productos
          <input
            className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-normal text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-ocean-300"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Nombre o descripción"
            type="search"
            value={search}
          />
        </label>
      </div>

      {products.length > 0 ? (
        <div className="max-h-[min(68dvh,56rem)] overflow-y-auto pr-1 [scrollbar-width:thin]">
          <div className="grid gap-3">
            {products.map((product) => {
              const primaryImage = primaryImageFor(product);
              const productImageUrls = getProductImageUrls(product);

              return (
                <article
                  key={product.id}
                  className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6"
                >
                  <div className="grid gap-4 xl:grid-cols-[96px_minmax(0,1fr)_auto] xl:items-start">
                    {primaryImage ? (
                      <img
                        alt={product.title}
                        className="aspect-[4/5] w-24 rounded-2xl object-cover"
                        src={primaryImage}
                      />
                    ) : null}

                    <div className="min-w-0 space-y-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-stone-900">{product.title}</h3>
                          <span
                            className={[
                              "rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-widest",
                              product.is_active
                                ? "bg-brand-100 text-brand-500"
                                : "bg-stone-200 text-stone-600",
                            ].join(" ")}
                          >
                            {product.is_active ? "Visible" : "Oculto"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-stone-600">
                          <span className="rounded-full bg-stone-100 px-3 py-1.5">
                            {product.categories?.name ?? "Sin categoría"}
                          </span>
                          <span className="rounded-full bg-stone-100 px-3 py-1.5">
                            ${Number(product.price).toLocaleString("es-AR")}
                          </span>
                          <span className="rounded-full bg-stone-100 px-3 py-1.5">
                            {formatAvailabilityLabel(product)}
                          </span>
                        </div>
                      </div>

                      {productImageUrls.length > 1 ? (
                        <div className="flex flex-wrap gap-2">
                          {productImageUrls.slice(1, 5).map((url, index) => (
                            <img
                              key={url}
                              alt={`Foto ${index + 2} de ${product.title}`}
                              className="aspect-square w-12 shrink-0 rounded-xl object-cover opacity-85"
                              src={url}
                            />
                          ))}
                        </div>
                      ) : null}

                      <p className="text-sm leading-6 text-stone-600">
                        {product.description || "Sin descripción."}
                      </p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 xl:w-40 xl:grid-cols-1">
                      <button
                        className="rounded-full border border-ocean-100 px-4 py-2.5 text-sm font-medium text-ocean-500 transition-colors hover:bg-ocean-50"
                        onClick={() => onEdit(product)}
                        type="button"
                      >
                        Editar
                      </button>
                      <button
                        className="rounded-full border border-brand-100 px-4 py-2.5 text-sm font-medium text-brand-500 transition-colors hover:bg-brand-50"
                        onClick={() => onDelete(product.id)}
                        type="button"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}

      {products.length > 0 ? (
        <PaginationControls
          currentPage={productPage}
          isLoading={isLoading}
          onPageChange={onProductPageChange}
          pageSize={productPageSize}
          totalCount={productsTotalCount}
        />
      ) : null}

      {isLoading ? (
        Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6"
          >
            <SkeletonBlock className="h-6 w-44 rounded-full" />
            <SkeletonBlock className="h-24 w-full rounded-2xl" />
          </div>
        ))
      ) : null}

      {!isLoading && productsTotalCount === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-5 py-10 text-center">
          <p className="text-base font-medium text-stone-900">
            {search.trim() ? "No encontramos productos con esa búsqueda" : "Todavía no hay productos cargados"}
          </p>
        </div>
      ) : null}
    </section>
  );
}

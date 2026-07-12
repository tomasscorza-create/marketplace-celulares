import type { ArtisanProduct } from "../../../types/artisan";
import { getProductImageMediaItems } from "../../../types/productMedia";
import type { ProductBatch } from "../../../types/productBatch";

import { PaginationControls } from "../../../components/PaginationControls";
import { SkeletonBlock } from "../../../components/SkeletonBlock";

function formatProductCount(count: number) {
  return `${count} ${count === 1 ? "producto" : "productos"}`;
}

function getProductImageUrls(product: ArtisanProduct) {
  const mediaImageUrls = getProductImageMediaItems(product.product_media).map(
    (item) => item.thumbnail_url ?? item.url,
  );

  return mediaImageUrls.length > 0 ? mediaImageUrls : product.image_urls;
}

type ArtisanProductListSectionProps = {
  batchPage: number;
  batchPageSize: number;
  batches: ProductBatch[];
  batchesTotalCount: number;
  isLoading: boolean;
  onBatchPageChange: (page: number) => void;
  onDelete: (productId: string) => void;
  onDeleteBatch: (batchId: string) => void;
  onEdit: (product: ArtisanProduct) => void;
  onEditBatch: (batchId: string) => void;
  onProductPageChange: (page: number) => void;
  onSearchChange: (value: string) => void;
  products: ArtisanProduct[];
  productPage: number;
  productPageSize: number;
  productsTotalCount: number;
  primaryImageFor: (product: ArtisanProduct) => string | null;
  search: string;
};

function formatAvailabilityLabel(product: {
  availability_mode: string;
  lead_time_days?: number | null;
  stock_quantity?: number | null;
}) {
  if (product.availability_mode === "made_to_order") {
    return product.lead_time_days
      ? `Bajo demanda - ${product.lead_time_days} dia(s)`
      : "Bajo demanda";
  }

  return `Stock ${product.stock_quantity ?? 0}`;
}

function formatBatchAvailabilityLabel(batch: ProductBatch) {
  if (batch.availability_mode_base === "made_to_order") {
    return batch.lead_time_days_base
      ? `Bajo demanda - ${batch.lead_time_days_base} dia(s)`
      : "Bajo demanda";
  }

  return `Stock base ${batch.stock_quantity_base ?? 0}`;
}

export function ArtisanProductListSection({
  batchPage,
  batchPageSize,
  batches,
  batchesTotalCount,
  isLoading,
  onBatchPageChange,
  onDelete,
  onDeleteBatch,
  onEdit,
  onEditBatch,
  onProductPageChange,
  onSearchChange,
  products,
  productPage,
  productPageSize,
  productsTotalCount,
  primaryImageFor,
  search,
}: ArtisanProductListSectionProps) {
  const groupedProducts = new Map<string, ArtisanProduct[]>();

  products.forEach((product) => {
    if (!product.batch_id) {
      return;
    }

    const currentProducts = groupedProducts.get(product.batch_id) ?? [];
    currentProducts.push(product);
    groupedProducts.set(product.batch_id, currentProducts);
  });

  const groupedEntries = batches.map((batch) => ({
    batch,
    batchId: batch.id,
    products: [...(groupedProducts.get(batch.id) ?? [])].sort(
      (left, right) => (left.batch_position ?? 0) - (right.batch_position ?? 0),
    ),
  }));

  const standaloneProducts = products.filter((product) => !product.batch_id);
  const hasNoResults = productsTotalCount === 0 && batchesTotalCount === 0;

  return (
    <section className="grid gap-4">
      <div className="grid gap-3 rounded-3xl border border-ocean-100 bg-white p-4 shadow-sm sm:p-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-stone-900">Editar productos</h2>
          <p className="text-sm text-stone-500">
            {isLoading
              ? "Cargando productos..."
              : "Trabaja con grupos o productos individuales desde una lista mas compacta."}
          </p>
        </div>

        <label className="grid gap-2 text-sm font-medium text-stone-700">
          Buscar en productos y grupos
          <input
            className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-normal text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-ocean-300"
            onChange={(event) => {
              onSearchChange(event.target.value);
            }}
            placeholder="Nombre, descripcion o codigo de lote"
            type="search"
            value={search}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              Individuales
            </p>
            <p className="mt-1 text-2xl font-semibold text-stone-900">{productsTotalCount}</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              Grupos
            </p>
            <p className="mt-1 text-2xl font-semibold text-stone-900">{batchesTotalCount}</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              En pantalla
            </p>
            <p className="mt-1 text-2xl font-semibold text-stone-900">
              {standaloneProducts.length + groupedEntries.length}
            </p>
          </div>
        </div>
      </div>

      {groupedEntries.length > 0 ? (
        <section className="grid gap-3">
          <div className="rounded-3xl border border-brand-100 bg-[#FFF9EC] p-4 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-stone-900">Grupos creados por lote</h3>
                <p className="text-sm text-stone-500">
                  Edita o elimina grupos completos desde una sola accion.
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em] text-brand-600">
                {batchesTotalCount} grupo{batchesTotalCount === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          <div className="max-h-[min(68dvh,56rem)] overflow-y-auto pr-1 [scrollbar-width:thin]">
            <div className="grid gap-3">
              {groupedEntries.map((entry) => {
                const coverProduct = entry.products[0];
                const coverImage = coverProduct ? primaryImageFor(coverProduct) : null;
                const productCount = entry.batch.item_count ?? entry.products.length;

                return (
                  <article
                    key={entry.batchId}
                    className="grid gap-4 rounded-3xl border border-brand-100 bg-white p-4 shadow-sm sm:p-6"
                  >
                    <div className="grid gap-4 xl:grid-cols-[96px_minmax(0,1fr)_auto] xl:items-start">
                      {coverImage ? (
                        <img
                          alt={coverProduct?.title ?? entry.batch.title_base}
                          className="aspect-[4/5] w-24 rounded-2xl object-cover"
                          src={coverImage}
                        />
                      ) : (
                        <div className="flex aspect-[4/5] w-24 items-center justify-center rounded-2xl bg-[#ECFEFF] text-xs font-semibold uppercase tracking-[0.13em] text-brand-500">
                          Lote
                        </div>
                      )}

                      <div className="min-w-0 space-y-3">
                        <div className="space-y-2">
                          <h4 className="text-lg font-semibold leading-7 text-stone-900">
                            {entry.batch.title_base || coverProduct?.title || "Grupo sin titulo"}
                          </h4>
                          <div className="flex flex-wrap gap-2 text-xs text-stone-600">
                            <span className="rounded-full bg-[#ECFEFF] px-3 py-1.5 font-semibold text-brand-500">
                              {entry.batch.batch_code}
                            </span>
                            <span className="rounded-full bg-stone-100 px-3 py-1.5">
                              {formatProductCount(productCount)}
                            </span>
                            <span className="rounded-full bg-stone-100 px-3 py-1.5">
                              ${Number(entry.batch.price_base).toLocaleString("es-AR")} base
                            </span>
                            <span className="rounded-full bg-stone-100 px-3 py-1.5">
                              {formatBatchAvailabilityLabel(entry.batch)}
                            </span>
                          </div>
                        </div>

                        {entry.batch.description_base ? (
                          <p className="text-sm leading-6 text-stone-500">
                            {entry.batch.description_base}
                          </p>
                        ) : null}

                        {entry.products.length > 0 ? (
                          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
                            {entry.products.slice(0, 8).map((product, index) => (
                              <div
                                key={product.id}
                                className="min-w-[13rem] rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700"
                              >
                                <span className="font-semibold text-stone-900">{index + 1}.</span>{" "}
                                {product.title}
                              </div>
                            ))}
                            {entry.products.length > 8 ? (
                              <div className="flex min-w-[8rem] items-center justify-center rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">
                                +{entry.products.length - 8} mas
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <p className="text-sm text-stone-400">
                            Los productos del grupo se cargan al abrir la edicion.
                          </p>
                        )}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2 xl:w-44 xl:grid-cols-1">
                        <button
                          className="rounded-full border border-ocean-100 px-4 py-2.5 text-sm font-medium text-ocean-500 transition-colors hover:bg-ocean-50"
                          onClick={() => {
                            onEditBatch(entry.batchId);
                          }}
                          type="button"
                        >
                          Editar grupo
                        </button>
                        <button
                          className="rounded-full border border-brand-100 px-4 py-2.5 text-sm font-medium text-brand-500 transition-colors hover:bg-brand-50"
                          onClick={() => {
                            onDeleteBatch(entry.batchId);
                          }}
                          type="button"
                        >
                          Eliminar grupo
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <PaginationControls
            currentPage={batchPage}
            isLoading={isLoading}
            onPageChange={onBatchPageChange}
            pageSize={batchPageSize}
            totalCount={batchesTotalCount}
          />
        </section>
      ) : null}

      {standaloneProducts.length > 0 ? (
        <section className="grid gap-3">
          <div className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
            <h3 className="text-lg font-semibold text-stone-900">Productos individuales</h3>
            <p className="mt-1 text-sm text-stone-500">
              Fichas simples para edicion directa, sin agrupar.
            </p>
          </div>

          <div className="max-h-[min(68dvh,56rem)] overflow-y-auto pr-1 [scrollbar-width:thin]">
            <div className="grid gap-3">
              {standaloneProducts.map((product) => {
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
                                "rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.13em]",
                                product.is_active
                                  ? "bg-[#CFFAFE] text-brand-500"
                                  : "bg-stone-200 text-stone-600",
                              ].join(" ")}
                            >
                              {product.is_active ? "Visible" : "Oculto"}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2 text-xs text-stone-600">
                            <span className="rounded-full bg-stone-100 px-3 py-1.5">
                              {product.categories?.name ?? "Sin categoria"}
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
                            {productImageUrls.slice(1, 5).map((url, urlIndex) => (
                                <img
                                  key={urlIndex}
                                  alt={`Foto ${urlIndex + 2} de ${product.title}`}
                                  className="aspect-square w-12 shrink-0 rounded-xl object-cover opacity-85"
                                  src={url}
                                />
                              ))}
                            {productImageUrls.length > 5 ? (
                              <div className="flex aspect-square w-12 items-center justify-center rounded-xl bg-stone-100 text-[11px] font-semibold text-stone-500">
                                +{productImageUrls.length - 5}
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        {product.description ? (
                          <p className="text-sm leading-6 text-stone-600">{product.description}</p>
                        ) : (
                          <p className="text-sm text-stone-400">Sin descripcion.</p>
                        )}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2 xl:w-40 xl:grid-cols-1">
                        <button
                          className="rounded-full border border-ocean-100 px-4 py-2.5 text-sm font-medium text-ocean-500 transition-colors hover:bg-ocean-50"
                          onClick={() => {
                            onEdit(product);
                          }}
                          type="button"
                        >
                          Editar
                        </button>
                        <button
                          className="rounded-full border border-brand-100 px-4 py-2.5 text-sm font-medium text-brand-500 transition-colors hover:bg-brand-50"
                          onClick={() => {
                            onDelete(product.id);
                          }}
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

          <PaginationControls
            currentPage={productPage}
            isLoading={isLoading}
            onPageChange={onProductPageChange}
            pageSize={productPageSize}
            totalCount={productsTotalCount}
          />
        </section>
      ) : null}

      {isLoading ? (
        <>
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6"
            >
              <SkeletonBlock className="h-6 w-44 rounded-full" />
              <SkeletonBlock className="h-24 w-full rounded-2xl" />
              <SkeletonBlock className="h-10 w-full rounded-2xl" />
            </div>
          ))}
        </>
      ) : null}

      {!isLoading && hasNoResults ? (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-5 py-10 text-center">
          <p className="text-base font-medium text-stone-900">
            {search.trim() ? "No encontramos productos con esa busqueda" : "Todavia no hay productos cargados"}
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-500">
            {search.trim()
              ? "Proba con otro nombre, descripcion o codigo de lote."
              : "Cuando publiques el primero, tambien vas a poder editarlo o agruparlo desde aca."}
          </p>
        </div>
      ) : null}
    </section>
  );
}

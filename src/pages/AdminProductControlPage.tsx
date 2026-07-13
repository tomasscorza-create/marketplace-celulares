import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";

import { LoadingPanel } from "../components/LoadingPanel";
import { PaginationControls } from "../components/PaginationControls";
import { PagePlaceholder } from "../components/PagePlaceholder";
import {
  buildAdminProductControlFollowUpItems,
  buildAdminProductControlViews,
  filterAdminProductControlViews,
  type AdminProductControlView,
} from "../features/admin/adminProductControlUtils";
import {
  useAdminProductControlSnapshot,
  useSaveAdminProductControlRecord,
} from "../features/admin/adminQueries";
import {
  AdminProductControlDetailModal,
  type FollowUpItem,
} from "../features/admin/components/AdminProductControlDetailModal";
import type {
  AdminProductControlBoostLevel,
  AdminProductControlTag,
} from "../types/admin";

const PRODUCT_CONTROL_PAGE_SIZE = 40;

export function AdminProductControlPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [hasAppliedRequestedSelection, setHasAppliedRequestedSelection] = useState(false);
  const requestedProductId = searchParams.get("productId");
  const deferredSearch = useDeferredValue(search.trim());
  const productControlQuery = useAdminProductControlSnapshot(true, {
    limit: PRODUCT_CONTROL_PAGE_SIZE,
    page,
    search: deferredSearch || undefined,
  });
  const saveControlMutation = useSaveAdminProductControlRecord();
  const products = useMemo(() => productControlQuery.data?.products ?? [], [productControlQuery.data?.products]);
  const artisans = useMemo(() => productControlQuery.data?.artisans ?? [], [productControlQuery.data?.artisans]);
  const sales = useMemo(() => productControlQuery.data?.sales ?? [], [productControlQuery.data?.sales]);
  const controlRecords = useMemo(
    () => productControlQuery.data?.controlRecords ?? [],
    [productControlQuery.data?.controlRecords],
  );
  const isLoading = productControlQuery.isLoading;
  const errorMessage = productControlQuery.error?.message ?? saveControlMutation.error?.message ?? null;
  const warningMessage = productControlQuery.data?.warningMessage ?? null;
  const productsCount = productControlQuery.data?.productsCount ?? products.length;
  const isSavingTag = saveControlMutation.isPending;
  const adminProductOrigin =
    typeof location.state === "object" &&
    location.state !== null &&
    "adminProductOrigin" in location.state &&
    typeof location.state.adminProductOrigin === "string"
      ? location.state.adminProductOrigin
      : null;

  useEffect(() => {
    setHasAppliedRequestedSelection(false);
  }, [requestedProductId]);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch]);

  const productItems = useMemo<AdminProductControlView[]>(
    () => buildAdminProductControlViews(products, artisans, sales, controlRecords),
    [products, artisans, sales, controlRecords],
  );
  const filteredItems = useMemo(
    () => filterAdminProductControlViews(productItems, search),
    [productItems, search],
  );
  const followUpItems = useMemo<FollowUpItem[]>(
    () => buildAdminProductControlFollowUpItems(productItems),
    [productItems],
  );
  const selectedItem = useMemo(
    () => productItems.find((item) => item.id === selectedProductId) ?? null,
    [productItems, selectedProductId],
  );

  useEffect(() => {
    if (!selectedProductId) {
      return;
    }

    const stillExists = productItems.some((item) => item.id === selectedProductId);

    if (!stillExists) {
      setSelectedProductId(null);
    }
  }, [productItems, selectedProductId]);

  useEffect(() => {
    if (isLoading || hasAppliedRequestedSelection || !requestedProductId) {
      return;
    }

    const requestedItem = productItems.find((item) => item.id === requestedProductId);

    if (requestedItem) {
      setSelectedProductId(requestedItem.id);
    }

    setHasAppliedRequestedSelection(true);
  }, [hasAppliedRequestedSelection, isLoading, productItems, requestedProductId]);

  async function handleSaveControl(
    productId: string,
    input: {
      boostLevel?: AdminProductControlBoostLevel | null;
      boostUntil?: string | null;
      comment?: string | null;
      internalTag?: AdminProductControlTag | null;
    },
  ) {
    try {
      await saveControlMutation.mutateAsync({
        productId,
        input,
      });
    } catch {
      // El estado de error visible queda expuesto por la mutation.
    }
  }

  return (
    <PagePlaceholder description="" hideHeader title="">
      <div className="grid gap-4">
        {adminProductOrigin ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="inline-flex items-center justify-center rounded-full border border-ocean-100 bg-white px-4 py-2 text-sm font-medium text-ocean-500 transition-colors hover:bg-ocean-50"
              to={adminProductOrigin}
            >
              Volver a productos visibles
            </Link>
          </div>
        ) : null}

        <section className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
          <input
            className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100"
            onChange={(event) => {
              setSearch(event.target.value);
            }}
            placeholder="Buscar producto por nombre, descripcion o lote"
            type="search"
            value={search}
          />
        </section>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {warningMessage ? (
          <div className="rounded-2xl border border-brand-300 bg-brand-50 px-4 py-3 text-sm text-brand-800">
            {warningMessage}
          </div>
        ) : null}

        {isLoading ? (
          <LoadingPanel label="Cargando control de productos..." />
        ) : filteredItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-300 bg-white/85 p-6 text-sm text-stone-600">
            No encontramos productos con esa búsqueda.
          </div>
        ) : (
          <section className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="flex items-center justify-between gap-3 px-1 text-xs font-semibold uppercase tracking-widest text-stone-500">
              <span>Productos</span>
              <span>
                {productsCount} resultado(s)
              </span>
            </div>

            <div className="max-h-[min(72dvh,60rem)] overflow-y-auto pr-1 [scrollbar-width:thin]">
              <div className="grid gap-3">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    className={[
                      "grid w-full gap-3 rounded-2xl border p-4 text-left transition-colors",
                      selectedItem?.id === item.id
                        ? "border-ocean-500/25 bg-brand-50/65"
                        : "border-stone-200 bg-stone-50/70 hover:border-ocean-500/18 hover:bg-white",
                    ].join(" ")}
                    onClick={() => {
                      setSelectedProductId(item.id);
                    }}
                    type="button"
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0">
                        {item.imageUrl ? (
                          <img
                            alt={item.title}
                            className="h-14 w-14 rounded-xl border border-stone-200 object-cover"
                            decoding="async"
                            loading="lazy"
                            src={item.imageUrl}
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-100 text-[10px] font-medium text-stone-400">
                            Sin foto
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-brand-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-brand-500">
                            {item.categoryLabel}
                          </span>
                          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-stone-500">
                            {item.identifierLabel}
                          </span>
                          {item.currentTag ? (
                            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-ocean-500">
                              {item.currentTag}
                            </span>
                          ) : null}
                          {item.boostSummaryLabel ? (
                            <span className="rounded-full bg-brand-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#0e7490]">
                              Boost {item.boostLevel}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <h2 className="text-base font-semibold text-stone-900">{item.title}</h2>
                            <p className="text-sm text-stone-600">{item.artisanLabel}</p>
                          </div>
                          <div className="shrink-0 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-500">
                            {item.salesCountLabel}
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <PaginationControls
              currentPage={page}
              isLoading={isLoading}
              onPageChange={setPage}
              pageSize={PRODUCT_CONTROL_PAGE_SIZE}
              totalCount={productsCount}
            />
          </section>
        )}
      </div>

      <AdminProductControlDetailModal
        categoryLabel={selectedItem?.categoryLabel ?? ""}
        createdAtLabel={selectedItem?.createdAtLabel ?? ""}
        currentBoostLevel={selectedItem?.boostLevel ?? null}
        currentBoostSummaryLabel={selectedItem?.boostSummaryLabel ?? null}
        currentBoostUntil={selectedItem?.boostUntil ?? null}
        currentComment={selectedItem?.comment ?? null}
        currentTag={selectedItem?.currentTag ?? null}
        followUpItems={followUpItems}
        identifierLabel={selectedItem?.identifierLabel ?? ""}
        imageUrl={selectedItem?.imageUrl ?? null}
        isOpen={Boolean(selectedItem)}
        isSavingTag={isSavingTag}
        lastSaleAtLabel={selectedItem?.lastSaleAtLabel ?? null}
        leadTimeLabel={selectedItem?.leadTimeLabel ?? null}
        onApplyBoost={(boostLevel, boostUntil) => {
          if (!selectedItem) {
            return;
          }

          void handleSaveControl(selectedItem.id, {
            boostLevel,
            boostUntil,
            comment: selectedItem.comment,
            internalTag: selectedItem.currentTag,
          });
        }}
        onApplyTag={(tag) => {
          if (!selectedItem) {
            return;
          }

          void handleSaveControl(selectedItem.id, {
            boostLevel: selectedItem.boostLevel,
            boostUntil: selectedItem.boostUntil,
            comment: selectedItem.comment,
            internalTag: tag,
          });
        }}
        onClearBoost={() => {
          if (!selectedItem) {
            return;
          }

          void handleSaveControl(selectedItem.id, {
            boostLevel: selectedItem.boostLevel,
            boostUntil: selectedItem.boostUntil,
            comment: selectedItem.comment,
            internalTag: selectedItem.currentTag,
          });
        }}
        onClearTag={() => {
          if (!selectedItem) {
            return;
          }

          void handleSaveControl(selectedItem.id, {
            boostLevel: selectedItem.boostLevel,
            boostUntil: selectedItem.boostUntil,
            comment: selectedItem.comment,
            internalTag: null,
          });
        }}
        onClose={() => {
          setSelectedProductId(null);
        }}
        onSaveComment={(comment) => {
          if (!selectedItem) {
            return;
          }

          void handleSaveControl(selectedItem.id, {
            boostLevel: selectedItem.boostLevel,
            boostUntil: selectedItem.boostUntil,
            comment,
            internalTag: selectedItem.currentTag,
          });
        }}
        onSelectProduct={(id) => {
          setSelectedProductId(id);
        }}
        priceLabel={selectedItem?.priceLabel ?? ""}
        productEditHref={
          selectedItem
            ? `/panel/admin/productos/${selectedItem.product.artisan_id}?mode=edit&productId=${selectedItem.id}`
            : null
        }
        productTitle={selectedItem?.title ?? ""}
        salesAmountLabel={selectedItem?.salesAmountLabel ?? ""}
        salesCountLabel={selectedItem?.salesCountLabel ?? ""}
        soldUnitsLabel={selectedItem?.soldUnitsLabel ?? ""}
        statusLabel={selectedItem?.statusLabel ?? ""}
        storefrontLabel={selectedItem?.artisanLabel ?? ""}
      />
    </PagePlaceholder>
  );
}

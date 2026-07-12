import { useEffect, useMemo, useState } from "react";

import type {
  AdminProductControlBoostLevel,
  AdminProductControlTag,
} from "../../../types/admin";

import { AdminProductControlActionsTab } from "./productControl/AdminProductControlActionsTab";
import { AdminProductControlFollowUpsTab } from "./productControl/AdminProductControlFollowUpsTab";
import { AdminProductControlInfoTab } from "./productControl/AdminProductControlInfoTab";
import { getTagOption } from "./productControl/shared";

// Tipo exportado para que la página pueda construir el array
export type FollowUpItem = {
  artisanLabel: string;
  boostLevel: AdminProductControlBoostLevel | null;
  boostSummaryLabel: string | null;
  comment: string | null;
  currentTag: AdminProductControlTag | null;
  id: string;
  imageUrl: string | null;
  title: string;
};

type AdminProductControlDetailModalProps = {
  categoryLabel: string;
  createdAtLabel: string;
  currentBoostLevel: AdminProductControlBoostLevel | null;
  currentBoostSummaryLabel: string | null;
  currentBoostUntil: string | null;
  currentComment: string | null;
  currentTag: AdminProductControlTag | null;
  followUpItems: FollowUpItem[];
  identifierLabel: string;
  imageUrl: string | null;
  isOpen: boolean;
  isSavingTag: boolean;
  lastSaleAtLabel: string | null;
  leadTimeLabel: string | null;
  onApplyBoost: (boostLevel: AdminProductControlBoostLevel, boostUntil: string) => void;
  onApplyTag: (tag: AdminProductControlTag) => void;
  onClearBoost: () => void;
  onClearTag: () => void;
  onClose: () => void;
  onSaveComment: (comment: string | null) => void;
  onSelectProduct: (id: string) => void;
  priceLabel: string;
  productEditHref: string | null;
  productTitle: string;
  salesAmountLabel: string;
  salesCountLabel: string;
  soldUnitsLabel: string;
  statusLabel: string;
  storefrontLabel: string;
};

type TabId = "info" | "acciones" | "seguimientos";

/**
 * Modal de control de productos del admin. Orquesta la cabecera fija,
 * la tab bar y el render de los 3 sub-tabs (Información, Acciones,
 * Seguimientos), cada uno en su propio archivo.
 */
export function AdminProductControlDetailModal({
  categoryLabel,
  createdAtLabel,
  currentBoostLevel,
  currentBoostSummaryLabel,
  currentBoostUntil,
  currentComment,
  currentTag,
  followUpItems,
  identifierLabel,
  imageUrl,
  isOpen,
  isSavingTag,
  lastSaleAtLabel,
  leadTimeLabel,
  onApplyBoost,
  onApplyTag,
  onClearBoost,
  onClearTag,
  onClose,
  onSaveComment,
  onSelectProduct,
  priceLabel,
  productEditHref,
  productTitle,
  salesAmountLabel,
  salesCountLabel,
  soldUnitsLabel,
  statusLabel,
  storefrontLabel,
}: AdminProductControlDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>("acciones");

  // Reset al tab "Acciones" cada vez que cambia el producto activo.
  useEffect(() => {
    setActiveTab("acciones");
  }, [productTitle]);

  const currentTagOption = useMemo(() => getTagOption(currentTag), [currentTag]);
  const totalFollowUp = followUpItems.length;

  if (!isOpen) return null;

  const TABS: Array<{ id: TabId; label: string; highlight?: boolean; count?: number }> = [
    { id: "info", label: "Información" },
    { id: "acciones", label: "Acciones", highlight: true },
    { id: "seguimientos", label: "Seguimientos", count: totalFollowUp },
  ];

  function selectAndShowInfo(id: string) {
    onSelectProduct(id);
    setActiveTab("info");
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 px-3 py-3 sm:items-center sm:px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
    >
      <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[1.8rem] border border-stone-200 bg-white shadow-[0_32px_90px_-40px_rgba(15,23,42,0.6)]">
        {/* ── Cabecera fija ── */}
        <div className="shrink-0 border-b border-stone-200 px-5 pb-0 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-600">
                  {categoryLabel}
                </span>
                <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-600">
                  {identifierLabel}
                </span>
                {currentTagOption ? (
                  <span
                    className={[
                      "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold",
                      currentTagOption.activeClassName,
                    ].join(" ")}
                  >
                    {currentTagOption.icon}
                    {currentTagOption.label}
                  </span>
                ) : null}
              </div>
              <h2 className="text-lg font-semibold text-stone-900 sm:text-xl">{productTitle}</h2>
              <p className="text-sm text-stone-500">{storefrontLabel}</p>
            </div>

            <button
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 transition-colors hover:border-ocean-500 hover:text-ocean-500"
              onClick={onClose}
              type="button"
            >
              <span aria-hidden="true" className="text-lg">×</span>
              <span className="sr-only">Cerrar detalle</span>
            </button>
          </div>

          {/* Tab bar */}
          <div className="mt-4 flex gap-1" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                aria-selected={activeTab === tab.id}
                className={[
                  "relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition-colors",
                  activeTab === tab.id
                    ? "text-ocean-500 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-ocean-500"
                    : tab.highlight
                      ? "text-sun-500 hover:text-[#0e7490]"
                      : "text-stone-500 hover:text-stone-700",
                ].join(" ")}
                onClick={() => {
                  setActiveTab(tab.id);
                }}
                role="tab"
                type="button"
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 ? (
                  <span
                    className={[
                      "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                      activeTab === tab.id
                        ? "bg-ocean-500 text-white"
                        : "bg-stone-200 text-stone-600",
                    ].join(" ")}
                  >
                    {tab.count}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {/* ── Contenido scrolleable ── */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {activeTab === "info" ? (
            <AdminProductControlInfoTab
              createdAtLabel={createdAtLabel}
              imageUrl={imageUrl}
              lastSaleAtLabel={lastSaleAtLabel}
              leadTimeLabel={leadTimeLabel}
              priceLabel={priceLabel}
              productEditHref={productEditHref}
              productTitle={productTitle}
              salesAmountLabel={salesAmountLabel}
              salesCountLabel={salesCountLabel}
              soldUnitsLabel={soldUnitsLabel}
              statusLabel={statusLabel}
            />
          ) : null}

          {activeTab === "acciones" ? (
            <AdminProductControlActionsTab
              currentBoostLevel={currentBoostLevel}
              currentBoostSummaryLabel={currentBoostSummaryLabel}
              currentBoostUntil={currentBoostUntil}
              currentComment={currentComment}
              currentTag={currentTag}
              isSavingTag={isSavingTag}
              onApplyBoost={onApplyBoost}
              onApplyTag={onApplyTag}
              onClearBoost={onClearBoost}
              onClearTag={onClearTag}
              onSaveComment={onSaveComment}
              productTitle={productTitle}
            />
          ) : null}

          {activeTab === "seguimientos" ? (
            <AdminProductControlFollowUpsTab
              followUpItems={followUpItems}
              onSelectProduct={selectAndShowInfo}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

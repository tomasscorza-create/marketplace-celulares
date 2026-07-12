import { useEffect } from "react";

import type { ProductAvailabilityMode } from "../../../types/productAvailability";
import type { ProductImageDraft } from "../imageEditorTypes";

type ProductImageQuickEditModalProps = {
  availabilityMode: ProductAvailabilityMode;
  baseDescription: string;
  basePrice: number;
  baseStockQuantity: number | null;
  baseTitle: string;
  draft: ProductImageDraft | null;
  index: number | null;
  isOpen: boolean;
  onChangeDescription: (index: number, value: string) => void;
  onChangeProductDescription: (index: number, value: string) => void;
  onChangeProductPrice: (index: number, value: number | null) => void;
  onChangeProductStockQuantity: (index: number, value: number | null) => void;
  onChangeProductTitle: (index: number, value: string) => void;
  onClose: () => void;
  onOpenCropEditor: (index: number) => void;
  onToggleCustomProductData: (index: number) => void;
  onTriggerImagePicker: (index: number) => void;
};

function resolveSummary(
  draft: ProductImageDraft,
  baseTitle: string,
  baseDescription: string,
  basePrice: number,
  baseStockQuantity: number | null,
) {
  if (!draft.useCustomProductData) {
    return {
      description: baseDescription,
      price: basePrice,
      stockQuantity: baseStockQuantity,
      title: baseTitle,
    };
  }

  return {
    description: draft.productDescription,
    price: draft.productPrice ?? 0,
    stockQuantity: draft.productStockQuantity,
    title: draft.productTitle,
  };
}

export function ProductImageQuickEditModal({
  availabilityMode,
  baseDescription,
  basePrice,
  baseStockQuantity,
  baseTitle,
  draft,
  index,
  isOpen,
  onChangeDescription,
  onChangeProductDescription,
  onChangeProductPrice,
  onChangeProductStockQuantity,
  onChangeProductTitle,
  onClose,
  onOpenCropEditor,
  onToggleCustomProductData,
  onTriggerImagePicker,
}: ProductImageQuickEditModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || draft === null || index === null) {
    return null;
  }

  const summary = resolveSummary(draft, baseTitle, baseDescription, basePrice, baseStockQuantity);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/60 px-3 py-4 sm:items-center sm:px-4 sm:py-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        aria-labelledby="product-image-quick-edit-title"
        aria-modal="true"
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-[1.75rem] bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-4 py-4 sm:px-5">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ocean-600">
              Edicion individual
            </p>
            <h2 className="text-lg font-semibold text-stone-900" id="product-image-quick-edit-title">
              Producto {index + 1}
            </h2>
            <p className="text-sm text-stone-500">
              Ajusta esta foto sin llenar de campos la vista principal.
            </p>
          </div>

          <button
            aria-label="Cerrar edicion individual"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-300 text-lg text-stone-500 transition-colors hover:bg-stone-100"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="grid gap-4 px-4 py-4 sm:px-5 sm:py-5">
          <div className="grid gap-3 rounded-[1.35rem] border border-stone-200 bg-stone-50/80 p-3">
            <div className="overflow-hidden rounded-[1.1rem] border border-stone-200 bg-stone-100">
              <img
                alt={`Foto del producto ${index + 1}`}
                className="h-44 w-full object-contain bg-stone-100 p-2 sm:h-52"
                src={draft.previewUrl}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                className="rounded-full border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
                onClick={() => {
                  onTriggerImagePicker(index);
                }}
                type="button"
              >
                Cambiar foto
              </button>
              <button
                className="rounded-full border border-sun-500 bg-[#ECFEFF] px-3 py-2 text-sm font-medium text-brand-500 transition-colors hover:bg-[#A5F3FC]"
                onClick={() => {
                  onOpenCropEditor(index);
                  onClose();
                }}
                type="button"
              >
                Recortar
              </button>
            </div>
          </div>

          <label className="grid gap-1.5 text-sm font-medium text-stone-700">
            Descripcion de la foto
            <textarea
              className="min-h-20 rounded-[1rem] border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700 outline-none transition focus:border-ocean-300 focus:bg-white"
              onChange={(event) => {
                onChangeDescription(index, event.target.value);
              }}
              placeholder="Vista lateral, detalle o variante..."
              value={draft.description}
            />
          </label>

          <div className="grid gap-3 rounded-[1.35rem] border border-stone-200 bg-stone-50/80 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Configuracion del producto
                </p>
                <p className="text-sm font-semibold text-stone-900">
                  {summary.title || "Sin titulo aun"}
                </p>
              </div>

              <button
                className={[
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  draft.useCustomProductData
                    ? "border border-sun-500 bg-[#ECFEFF] text-brand-500"
                    : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-100",
                ].join(" ")}
                onClick={() => {
                  onToggleCustomProductData(index);
                }}
                type="button"
              >
                {draft.useCustomProductData ? "Usa cambios propios" : "Usa datos base"}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-stone-600">
              <span className="rounded-full border border-stone-200 bg-white px-2.5 py-1">
                ${Number(summary.price || 0).toLocaleString("es-AR")}
              </span>
              {availabilityMode === "stock" ? (
                <span className="rounded-full border border-stone-200 bg-white px-2.5 py-1">
                  Stock {summary.stockQuantity ?? "-"}
                </span>
              ) : (
                <span className="rounded-full border border-stone-200 bg-white px-2.5 py-1">
                  Produccion bajo demanda
                </span>
              )}
              <span className="rounded-full border border-stone-200 bg-white px-2.5 py-1">
                {draft.useCustomProductData ? "Personalizado" : "Base"}
              </span>
            </div>

            {draft.useCustomProductData ? (
              <div className="grid gap-3">
                <label className="grid gap-1.5 text-sm font-medium text-stone-700">
                  Titulo de este producto
                  <input
                    className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none transition focus:border-ocean-300"
                    onChange={(event) => {
                      onChangeProductTitle(index, event.target.value);
                    }}
                    placeholder="Titulo para esta foto"
                    type="text"
                    value={draft.productTitle}
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-medium text-stone-700">
                  Descripcion de este producto
                  <textarea
                    className="min-h-20 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none transition focus:border-ocean-300"
                    onChange={(event) => {
                      onChangeProductDescription(index, event.target.value);
                    }}
                    placeholder="Descripcion propia para esta foto"
                    value={draft.productDescription}
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-medium text-stone-700">
                    Precio
                    <input
                      className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none transition focus:border-ocean-300"
                      inputMode="decimal"
                      min="0"
                      onChange={(event) => {
                        onChangeProductPrice(
                          index,
                          event.target.value === "" ? null : Number(event.target.value),
                        );
                      }}
                      step="0.01"
                      type="number"
                      value={draft.productPrice ?? ""}
                    />
                  </label>

                  {availabilityMode === "stock" ? (
                    <label className="grid gap-1.5 text-sm font-medium text-stone-700">
                      Stock
                      <input
                        className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none transition focus:border-ocean-300"
                        inputMode="numeric"
                        min="1"
                        onChange={(event) => {
                          onChangeProductStockQuantity(
                            index,
                            event.target.value === ""
                              ? null
                              : Number.parseInt(event.target.value, 10),
                          );
                        }}
                        placeholder="Ej. 3"
                        step="1"
                        type="number"
                        value={draft.productStockQuantity ?? ""}
                      />
                    </label>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-sm leading-6 text-stone-500">
                Este producto va a tomar titulo, descripcion, precio y stock desde los datos base.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

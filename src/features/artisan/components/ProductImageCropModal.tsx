import type { PointerEvent as ReactPointerEvent } from "react";
import { useEffect } from "react";

import type { ImageCropAspect } from "../../../lib/compressImage";
import type { ProductImageDraft } from "../imageEditorTypes";

type FrameSize = {
  height: number;
  width: number;
};

type ProductImageCropModalProps = {
  activeCropLayout: {
    drawHeight: number;
    drawWidth: number;
    left: number;
    top: number;
  };
  activeFrame: FrameSize;
  activeImageDraft: ProductImageDraft | null;
  activePreviewFrame: FrameSize;
  isOpen: boolean;
  onApply: () => void;
  onCancel: () => void;
  onCenter: () => void;
  onPointerCancel: () => void;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerLeave: () => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: () => void;
  onSelectAspect: (aspect: ImageCropAspect) => void;
  onZoomChange: (value: number) => void;
  productTitle: string;
};

function getScaledCropStyle(
  cropLayout: ProductImageCropModalProps["activeCropLayout"],
  sourceFrame: FrameSize,
  targetFrame: FrameSize,
) {
  const scaleFactor = targetFrame.width / sourceFrame.width;

  return {
    height: `${cropLayout.drawHeight * scaleFactor}px`,
    left: `${cropLayout.left * scaleFactor}px`,
    top: `${cropLayout.top * scaleFactor}px`,
    width: `${cropLayout.drawWidth * scaleFactor}px`,
  };
}

export function ProductImageCropModal({
  activeCropLayout,
  activeFrame,
  activeImageDraft,
  activePreviewFrame,
  isOpen,
  onApply,
  onCancel,
  onCenter,
  onPointerCancel,
  onPointerDown,
  onPointerLeave,
  onPointerMove,
  onPointerUp,
  onSelectAspect,
  onZoomChange,
  productTitle,
}: ProductImageCropModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onCancel]);

  if (!isOpen || !activeImageDraft) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 px-4 py-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        aria-labelledby="product-image-modal-title"
        aria-modal="true"
        className="max-h-[90dvh] w-full max-w-5xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-ocean-500">
              Editar foto del producto
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-900" id="product-image-modal-title">
              Ajusta el encuadre antes de guardarlo
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Usa 1:1 para una imagen equilibrada o 4:5 para una foto vertical más protagonista.
            </p>
          </div>

          <button
            aria-label="Cerrar editor de foto de producto"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-stone-300 text-lg text-stone-500 transition-colors hover:bg-stone-100"
            onClick={onCancel}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.1fr)_320px]">
          <div className="grid gap-4 rounded-3xl border border-sun-500 bg-[#ECFEFF] p-5">
            <div className="flex flex-col items-center gap-4">
              <div
                className="relative cursor-grab overflow-hidden rounded-[1.75rem] bg-stone-200 shadow-sm active:cursor-grabbing"
                onPointerCancel={onPointerCancel}
                onPointerDown={onPointerDown}
                onPointerLeave={onPointerLeave}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{
                  height: `${activeFrame.height}px`,
                  touchAction: "none",
                  width: `${activeFrame.width}px`,
                }}
              >
                <img
                  alt="Recorte del producto"
                  className="absolute max-w-none select-none"
                  draggable={false}
                  src={activeImageDraft.sourceUrl}
                  style={getScaledCropStyle(activeCropLayout, activeFrame, activeFrame)}
                />
                <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] border-4 border-ocean-500 ring-2 ring-white/90" />
              </div>

              <p className="text-center text-sm leading-6 text-stone-600">
                Arrastra la imagen para acomodarla dentro del marco elegido.
              </p>
            </div>
          </div>

          <div className="grid min-w-0 content-start gap-5 rounded-3xl border border-stone-200 bg-stone-50 p-5">
            <div className="grid gap-2">
              <p className="text-sm font-medium text-stone-700">Formato</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { aspect: "square" as const, label: "1:1" },
                  { aspect: "portrait" as const, label: "4:5" },
                ].map((option) => (
                  <button
                    key={option.aspect}
                    className={[
                      "rounded-2xl border px-4 py-3 text-sm font-medium transition-colors",
                      (activeImageDraft.crop.aspect ?? "square") === option.aspect
                        ? "border-ocean-500 bg-[#E0F2FE] text-ocean-500"
                        : "border-stone-200 bg-white text-stone-600 hover:border-sun-500 hover:bg-[#ECFEFF]",
                    ].join(" ")}
                    onClick={() => {
                      onSelectAspect(option.aspect);
                    }}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="grid gap-2 text-sm font-medium text-stone-700">
              Zoom
              <input
                className="block w-full max-w-full"
                max="2.8"
                min="1"
                onChange={(event) => {
                  onZoomChange(Number(event.target.value));
                }}
                step="0.01"
                type="range"
                value={activeImageDraft.crop.zoom}
              />
            </label>

            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="text-sm font-medium text-stone-700">Vista previa</p>
              <p className="mt-1 text-xs text-stone-500">Así se verá en el catálogo y el detalle.</p>
              <div className="mt-3 flex items-start gap-3">
                <div
                  className="relative shrink-0 overflow-hidden rounded-2xl bg-stone-200 shadow-sm"
                  style={{
                    height: `${activePreviewFrame.height}px`,
                    width: `${activePreviewFrame.width}px`,
                  }}
                >
                  <img
                    alt="Vista previa final"
                    className="absolute max-w-none select-none"
                    draggable={false}
                    src={activeImageDraft.sourceUrl}
                    style={getScaledCropStyle(
                      activeCropLayout,
                      activeFrame,
                      activePreviewFrame,
                    )}
                  />
                </div>

                <p className="min-w-0 truncate text-sm font-medium text-stone-900">
                  {productTitle || "Tu producto"}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                className="inline-flex w-full items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 sm:w-auto"
                onClick={onCenter}
                type="button"
              >
                Centrar imagen
              </button>

              <button
                className="inline-flex w-full items-center justify-center rounded-full border border-brand-500 px-5 py-3 text-sm font-medium text-brand-500 transition-colors hover:bg-[#D1FAE5] sm:w-auto"
                onClick={onCancel}
                type="button"
              >
                Cancelar
              </button>

              <button
                className="inline-flex w-full items-center justify-center rounded-full bg-brand-500 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 sm:w-auto"
                onClick={onApply}
                type="button"
              >
                Aplicar foto
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

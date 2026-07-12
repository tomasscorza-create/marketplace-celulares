import type { DragEvent } from "react";

import { useEffect, useRef, useState } from "react";

import type { ProductAvailabilityMode } from "../../../types/productAvailability";
import type { ProductImageDraft } from "../imageEditorTypes";

const MAX_IMAGES_PER_UPLOAD = 15;

type ProductImagesFieldProps = {
  availabilityMode: ProductAvailabilityMode;
  baseDescription: string;
  basePrice: number;
  baseStockQuantity: number | null;
  baseTitle: string;
  onDropImages: (files: FileList) => void;
  onOpenEditor: (index: number) => void;
  onProductDescriptionChange: (index: number, value: string) => void;
  onProductPriceChange: (index: number, value: number | null) => void;
  onProductStockQuantityChange: (index: number, value: number | null) => void;
  onProductTitleChange: (index: number, value: string) => void;
  onRemoveImage: (index: number) => void;
  onSetPrimaryImage: (index: number) => void;
  onToggleCustomProductData: (index: number) => void;
  onTriggerBulkImagePicker: () => void;
  onTriggerImagePicker: (index: number) => void;
  productImages: ProductImageDraft[];
  splitProductsByImage: boolean;
};

function resolveImageProductSummary(
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

function formatImageCount(count: number) {
  return `${count} ${count === 1 ? "foto" : "fotos"}`;
}

function formatProductCount(count: number) {
  return `${count} ${count === 1 ? "producto" : "productos"}`;
}

export function ProductImagesField({
  availabilityMode,
  baseDescription,
  basePrice,
  baseStockQuantity,
  baseTitle,
  onDropImages,
  onOpenEditor,
  onProductDescriptionChange,
  onProductPriceChange,
  onProductStockQuantityChange,
  onProductTitleChange,
  onRemoveImage,
  onSetPrimaryImage,
  onToggleCustomProductData,
  onTriggerBulkImagePicker,
  onTriggerImagePicker,
  productImages,
  splitProductsByImage,
}: ProductImagesFieldProps) {
  const totalCustomized = productImages.filter((draft) => draft.useCustomProductData).length;
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const dragDepthRef = useRef(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  const updateScrollState = () => {
    const container = scrollContainerRef.current;
    if (!container) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const { clientWidth, scrollLeft, scrollWidth } = container;
    setCanScrollLeft(scrollLeft > 8);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 8);
  };

  useEffect(() => {
    updateScrollState();
  }, [productImages.length, splitProductsByImage]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return undefined;
    }

    updateScrollState();
    container.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      container.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [productImages.length]);

  const scrollCards = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const amount = Math.max(container.clientWidth * 0.72, 220);
    container.scrollBy({
      behavior: "smooth",
      left: direction === "right" ? amount : -amount,
    });
  };

  const dropZoneClassName = [
    "transition-colors",
    isDraggingFiles ? "border-ocean-400 bg-[#E0F2FE] ring-2 ring-ocean-100" : "",
  ].join(" ");

  const hasDraggedFiles = (event: DragEvent<HTMLElement>) =>
    Array.from(event.dataTransfer.types).includes("Files");

  const handleDragEnter = (event: DragEvent<HTMLElement>) => {
    if (!hasDraggedFiles(event)) {
      return;
    }

    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDraggingFiles(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    if (!hasDraggedFiles(event)) {
      return;
    }

    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

    if (dragDepthRef.current === 0) {
      setIsDraggingFiles(false);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    if (!hasDraggedFiles(event)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    if (!hasDraggedFiles(event)) {
      return;
    }

    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDraggingFiles(false);

    if (event.dataTransfer.files.length > 0) {
      onDropImages(event.dataTransfer.files);
    }
  };

  return (
    <section
      className={[
        "grid min-w-0 content-start gap-4 overflow-hidden rounded-[1.75rem] border border-stone-200 bg-[linear-gradient(180deg,_#ffffff,_#f8f4eb)] p-4 sm:p-5",
        dropZoneClassName,
      ].join(" ")}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-stone-900">
            {splitProductsByImage ? "Fotos y productos del grupo" : "Fotos del producto"}
          </p>
          <p className="text-xs leading-5 text-stone-500">
            {productImages.length === 0
              ? `Sube hasta ${MAX_IMAGES_PER_UPLOAD} fotos por carga. La primera queda como portada.`
              : splitProductsByImage
                ? `${formatImageCount(productImages.length)} listas para crear ${formatProductCount(productImages.length)}. ${totalCustomized} ya tienen cambios propios.`
                : `${formatImageCount(productImages.length)} cargadas. La primera es la portada.`}
          </p>
        </div>

        <button
          className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-ocean-400 hover:text-ocean-600"
          onClick={onTriggerBulkImagePicker}
          type="button"
        >
          Agregar fotos
        </button>
      </div>

      {splitProductsByImage && productImages.length > 0 ? (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-sun-500 bg-[#ECFEFF] px-4 py-3 text-xs text-brand-500">
          <span className="rounded-full bg-white px-2.5 py-1 font-semibold">
            {formatProductCount(productImages.length)} en este grupo
          </span>
          <span className="rounded-full bg-white px-2.5 py-1">
            {totalCustomized} con cambios propios
          </span>
          <span className="rounded-full bg-white px-2.5 py-1">
            {productImages.length - totalCustomized} usan datos base
          </span>
        </div>
      ) : null}

      {productImages.length === 0 ? (
        <button
          className={[
            "flex flex-col items-center gap-3 rounded-[1.5rem] border-2 border-dashed border-stone-300 bg-white px-5 py-10 text-center transition-colors hover:border-ocean-400 hover:bg-[#E0F2FE]",
            isDraggingFiles ? "border-ocean-400 bg-[#E0F2FE]" : "",
          ].join(" ")}
          onClick={onTriggerBulkImagePicker}
          type="button"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ECFEFF] text-brand-500">
            <span className="text-2xl leading-none">+</span>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-stone-900">Subir fotos</p>
            <p className="text-xs leading-5 text-stone-500">
              Puedes seleccionar hasta {MAX_IMAGES_PER_UPLOAD} por carga o arrastrarlas hasta este recuadro.
            </p>
          </div>
        </button>
      ) : (
        <div
          className={[
            "relative min-w-0 max-w-full overflow-hidden rounded-[1.5rem] border border-stone-200/90 bg-white/80 px-2 py-3 sm:px-3",
            isDraggingFiles ? "border-ocean-400 bg-[#E0F2FE]" : "",
          ].join(" ")}
        >
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
              {splitProductsByImage ? "Desliza para ver cada producto" : "Desliza para ver cada foto"}
            </p>

            {productImages.length > 1 ? (
              <div className="flex items-center gap-2">
                <button
                  aria-label="Ver productos anteriores"
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-full border text-sm shadow-sm transition",
                    canScrollLeft
                      ? "border-ocean-200 bg-white text-ocean-600 hover:border-ocean-400"
                      : "border-stone-200 bg-stone-100 text-stone-300",
                  ].join(" ")}
                  disabled={!canScrollLeft}
                  onClick={() => {
                    scrollCards("left");
                  }}
                  type="button"
                >
                  ←
                </button>
                <button
                  aria-label="Ver productos siguientes"
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-full border text-sm shadow-sm transition",
                    canScrollRight
                      ? "border-ocean-200 bg-white text-ocean-600 hover:border-ocean-400"
                      : "border-stone-200 bg-stone-100 text-stone-300",
                  ].join(" ")}
                  disabled={!canScrollRight}
                  onClick={() => {
                    scrollCards("right");
                  }}
                  type="button"
                >
                  →
                </button>
              </div>
            ) : null}
          </div>

          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-white via-white/90 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white via-white/90 to-transparent" />

          <div
            ref={scrollContainerRef}
            className="flex w-full max-w-full snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-1 pb-2 pr-1 [scrollbar-width:thin]"
          >
            {productImages.map((draft, index) => {
              const summary = resolveImageProductSummary(
                draft,
                baseTitle,
                baseDescription,
                basePrice,
                baseStockQuantity,
              );

              return (
                <article
                  key={draft.id}
                  className={[
                    "grid max-w-[86vw] shrink-0 snap-start gap-3 rounded-[1.2rem] border bg-white p-3 shadow-[0_12px_28px_rgba(15,23,42,0.08)]",
                    splitProductsByImage
                      ? "w-[19rem] border-brand-100 sm:w-[21rem]"
                      : "w-[12.5rem] border-stone-300 sm:w-[14.5rem] sm:max-w-[16rem]",
                  ].join(" ")}
                >
                  <div className="relative overflow-hidden rounded-[1rem] border border-stone-200 bg-stone-50">
                    <img
                      alt={`Foto ${index + 1}`}
                      className={[
                        "h-32 w-full object-contain bg-stone-100 p-1.5 sm:h-36",
                        (draft.crop.aspect ?? "square") === "portrait" ? "sm:h-40" : "",
                      ].join(" ")}
                      src={draft.previewUrl}
                    />

                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-2">
                      {splitProductsByImage ? (
                        <span className="rounded-full border border-white/25 bg-black/60 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
                          Producto {index + 1}
                        </span>
                      ) : index === 0 ? (
                        <span className="rounded-full border border-white/25 bg-black/60 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
                          Portada
                        </span>
                      ) : (
                        <button
                          className="rounded-full border border-white/25 bg-black/60 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-sm transition-colors hover:bg-brand-500/85"
                          onClick={() => {
                            onSetPrimaryImage(index);
                          }}
                          type="button"
                        >
                          Hacer portada
                        </button>
                      )}

                      <button
                        aria-label={`Quitar foto ${index + 1}`}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/92 text-sm text-stone-500 shadow-sm transition-colors hover:text-brand-500"
                        onClick={() => {
                          onRemoveImage(index);
                        }}
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {splitProductsByImage ? (
                    <div className="grid gap-3 rounded-[1rem] border border-brand-100 bg-[#FFF9EC] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-stone-900">
                          Producto {index + 1}
                        </p>
                        <button
                          className={[
                            "rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors",
                            draft.useCustomProductData
                              ? "border border-sun-500 bg-white text-brand-500"
                              : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-100",
                          ].join(" ")}
                          onClick={() => {
                            onToggleCustomProductData(index);
                          }}
                          type="button"
                        >
                          {draft.useCustomProductData ? "Propio" : "Usa base"}
                        </button>
                      </div>

                      <label className="grid gap-1 text-xs font-medium text-stone-700">
                        Titulo
                        <input
                          className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-ocean-300"
                          onChange={(event) => {
                            if (!draft.useCustomProductData) {
                              onToggleCustomProductData(index);
                            }
                            onProductTitleChange(index, event.target.value);
                          }}
                          type="text"
                          value={draft.useCustomProductData ? draft.productTitle : summary.title}
                        />
                      </label>

                      <label className="grid gap-1 text-xs font-medium text-stone-700">
                        Descripcion
                        <textarea
                          className="min-h-20 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-ocean-300"
                          onChange={(event) => {
                            if (!draft.useCustomProductData) {
                              onToggleCustomProductData(index);
                            }
                            onProductDescriptionChange(index, event.target.value);
                          }}
                          value={draft.useCustomProductData ? draft.productDescription : summary.description}
                        />
                      </label>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="grid gap-1 text-xs font-medium text-stone-700">
                          Precio
                          <input
                            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-ocean-300"
                            inputMode="decimal"
                            min="0"
                            onChange={(event) => {
                              if (!draft.useCustomProductData) {
                                onToggleCustomProductData(index);
                              }
                              onProductPriceChange(
                                index,
                                event.target.value === "" ? null : Number(event.target.value),
                              );
                            }}
                            step="0.01"
                            type="number"
                            value={draft.useCustomProductData ? draft.productPrice ?? "" : summary.price}
                          />
                        </label>

                        {availabilityMode === "stock" ? (
                          <label className="grid gap-1 text-xs font-medium text-stone-700">
                            Stock
                            <input
                              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-ocean-300"
                              inputMode="numeric"
                              min="1"
                              onChange={(event) => {
                                if (!draft.useCustomProductData) {
                                  onToggleCustomProductData(index);
                                }
                                onProductStockQuantityChange(
                                  index,
                                  event.target.value === ""
                                    ? null
                                    : Number.parseInt(event.target.value, 10),
                                );
                              }}
                              step="1"
                              type="number"
                              value={
                                draft.useCustomProductData
                                  ? draft.productStockQuantity ?? ""
                                  : summary.stockQuantity ?? ""
                              }
                            />
                          </label>
                        ) : null}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <button
                          className="rounded-full border border-stone-200 bg-white px-3 py-2 text-[11px] font-medium text-stone-700 transition-colors hover:bg-stone-100"
                          onClick={() => {
                            onTriggerImagePicker(index);
                          }}
                          type="button"
                        >
                          Cambiar foto
                        </button>
                        <button
                          className="rounded-full border border-sun-500 bg-[#ECFEFF] px-3 py-2 text-[11px] font-medium text-brand-500 transition-colors hover:bg-[#A5F3FC]"
                          onClick={() => {
                            onOpenEditor(index);
                          }}
                          type="button"
                        >
                          Recortar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <button
                        className="rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-[11px] font-medium text-stone-700 transition-colors hover:bg-stone-100"
                        onClick={() => {
                          onTriggerImagePicker(index);
                        }}
                        type="button"
                      >
                        Cambiar foto
                      </button>
                      <button
                        className="rounded-full border border-sun-500 bg-[#ECFEFF] px-3 py-2 text-[11px] font-medium text-brand-500 transition-colors hover:bg-[#A5F3FC]"
                        onClick={() => {
                          onOpenEditor(index);
                        }}
                        type="button"
                      >
                        Recortar
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

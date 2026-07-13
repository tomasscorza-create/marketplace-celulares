import type { DragEvent } from "react";
import type { ProductImageDraft } from "../imageEditorTypes";

import { useEffect, useRef, useState } from "react";
import { MAX_IMAGES_PER_UPLOAD, formatImageCount } from "../artisanProductsPageUtils";

type ProductImagesFieldProps = {
  onDropImages: (files: FileList) => void;
  onOpenEditor: (index: number) => void;
  onRemoveImage: (index: number) => void;
  onSetPrimaryImage: (index: number) => void;
  onTriggerBulkImagePicker: () => void;
  onTriggerImagePicker: (index: number) => void;
  productImages: ProductImageDraft[];
};

export function ProductImagesField({
  onDropImages,
  onOpenEditor,
  onRemoveImage,
  onSetPrimaryImage,
  onTriggerBulkImagePicker,
  onTriggerImagePicker,
  productImages,
}: ProductImagesFieldProps) {
  const dragDepthRef = useRef(0);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  useEffect(() => {
    return () => {
      dragDepthRef.current = 0;
    };
  }, []);

  const hasDraggedFiles = (event: DragEvent<HTMLElement>) =>
    Array.from(event.dataTransfer.types).includes("Files");

  const handleDragEnter = (event: DragEvent<HTMLElement>) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDraggingFiles(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDraggingFiles(false);
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDraggingFiles(false);
    if (event.dataTransfer.files.length > 0) onDropImages(event.dataTransfer.files);
  };

  return (
    <section
      className={[
        "grid gap-4 overflow-hidden rounded-[1.75rem] border border-stone-200 bg-[linear-gradient(180deg,_#ffffff,_#f8f4eb)] p-4 sm:p-5",
        isDraggingFiles ? "border-ocean-400 bg-[#E0F2FE]" : "",
      ].join(" ")}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={(event) => {
        if (!hasDraggedFiles(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={handleDrop}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-stone-900">Fotos del producto</p>
          <p className="text-xs leading-5 text-stone-500">
            {productImages.length === 0
              ? `Subí hasta ${MAX_IMAGES_PER_UPLOAD} fotos por carga. La primera queda como portada.`
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

      {productImages.length === 0 ? (
        <button
          className="flex flex-col items-center gap-3 rounded-[1.5rem] border-2 border-dashed border-stone-300 bg-white px-5 py-10 text-center transition-colors hover:border-ocean-400 hover:bg-[#E0F2FE]"
          onClick={onTriggerBulkImagePicker}
          type="button"
        >
          <span className="text-2xl leading-none text-brand-500">+</span>
          <span className="font-medium text-stone-900">Subir fotos</span>
        </button>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {productImages.map((draft, index) => (
            <article
              key={draft.id}
              className="grid gap-3 rounded-[1.2rem] border border-stone-300 bg-white p-3 shadow-sm"
            >
              <div className="relative overflow-hidden rounded-[1rem] border border-stone-200 bg-stone-100">
                <img
                  alt={`Foto ${index + 1}`}
                  className="h-36 w-full object-contain p-1.5"
                  src={draft.previewUrl}
                />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-2">
                  {index === 0 ? (
                    <span className="rounded-full bg-black/60 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-white">
                      Portada
                    </span>
                  ) : (
                    <button
                      className="rounded-full bg-black/60 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-white"
                      onClick={() => onSetPrimaryImage(index)}
                      type="button"
                    >
                      Hacer portada
                    </button>
                  )}
                  <button
                    aria-label={`Quitar foto ${index + 1}`}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white/92 text-sm text-stone-500"
                    onClick={() => onRemoveImage(index)}
                    type="button"
                  >
                    ×
                  </button>
                </div>
              </div>
              <label className="grid gap-1 text-xs font-medium text-stone-700">
                Descripción de la foto
                <textarea
                  className="min-h-16 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800"
                  readOnly
                  value={draft.description}
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-700"
                  onClick={() => onTriggerImagePicker(index)}
                  type="button"
                >
                  Cambiar
                </button>
                <button
                  className="rounded-full border border-sun-500 bg-[#ECFEFF] px-3 py-2 text-xs font-medium text-brand-500"
                  onClick={() => onOpenEditor(index)}
                  type="button"
                >
                  Recortar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

import type { PointerEvent as ReactPointerEvent } from "react";
import { useEffect } from "react";

type ArtisanProfileImageCropModalProps = {
  accountLabel: string;
  applyLabel?: string;
  cancelLabel?: string;
  centerLabel?: string;
  closeLabel?: string;
  cropLayout: {
    drawHeight: number;
    drawWidth: number;
    left: number;
    top: number;
  };
  imageUrl: string | null;
  instruction?: string;
  isOpen: boolean;
  onApply: () => void;
  onCancel: () => void;
  onCenter: () => void;
  onPointerCancel: () => void;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerLeave: () => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: () => void;
  onZoomChange: (value: number) => void;
  previewHint?: string;
  title?: string;
  zoom: number;
};

function getScaledCropStyle(
  cropLayout: ArtisanProfileImageCropModalProps["cropLayout"],
  sourceFrameSize: number,
  targetFrameSize: number,
) {
  const scaleFactor = targetFrameSize / sourceFrameSize;

  return {
    height: `${cropLayout.drawHeight * scaleFactor}px`,
    left: `${cropLayout.left * scaleFactor}px`,
    top: `${cropLayout.top * scaleFactor}px`,
    width: `${cropLayout.drawWidth * scaleFactor}px`,
  };
}

export function ArtisanProfileImageCropModal({
  accountLabel,
  applyLabel = "Aplicar foto",
  cancelLabel = "Cancelar",
  centerLabel = "Centrar imagen",
  closeLabel = "Cerrar editor de foto",
  cropLayout,
  imageUrl,
  instruction = "Arrastra la imagen dentro del círculo para acomodarla. Cuando te guste el resultado, aplícala y luego guarda tu perfil.",
  isOpen,
  onApply,
  onCancel,
  onCenter,
  onPointerCancel,
  onPointerDown,
  onPointerLeave,
  onPointerMove,
  onPointerUp,
  onZoomChange,
  previewHint = "Así se verá en tu cuenta y perfil público.",
  title = "Ajusta el encuadre antes de guardarlo",
  zoom,
}: ArtisanProfileImageCropModalProps) {
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

  if (!isOpen || !imageUrl) {
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
        aria-labelledby="profile-image-modal-title"
        aria-modal="true"
        className="max-h-[90dvh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-ocean-500">
              Editar foto de perfil
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-900" id="profile-image-modal-title">
              {title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">{instruction}</p>
          </div>

          <button
            aria-label={closeLabel}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-stone-300 text-lg text-stone-500 transition-colors hover:bg-stone-100"
            onClick={onCancel}
            type="button"
          >
            x
          </button>
        </div>

        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.1fr)_320px]">
          <div className="grid gap-4 rounded-3xl border border-brand-500 bg-brand-50 p-5">
            <div className="flex flex-col items-center gap-4">
              <div
                className="relative h-[280px] w-[280px] cursor-grab overflow-hidden rounded-full bg-stone-200 shadow-sm active:cursor-grabbing"
                onPointerCancel={onPointerCancel}
                onPointerDown={onPointerDown}
                onPointerLeave={onPointerLeave}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{ touchAction: "none" }}
              >
                <img
                  alt="Recorte de avatar"
                  className="absolute max-w-none select-none"
                  draggable={false}
                  src={imageUrl}
                  style={getScaledCropStyle(cropLayout, 208, 280)}
                />
                <div className="pointer-events-none absolute inset-0 rounded-full border-4 border-ocean-500 ring-2 ring-white/90" />
              </div>

              <p className="text-center text-sm leading-6 text-stone-600">
                Arrastra la imagen con el dedo o el mouse para encuadrarla mejor.
              </p>
            </div>
          </div>

          <div className="grid min-w-0 content-start gap-5 rounded-3xl border border-stone-200 bg-stone-50 p-5">
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
                value={zoom}
              />
            </label>

            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="text-sm font-medium text-stone-700">Vista previa final</p>
              <div className="mt-4 flex items-center gap-4">
                <div className="relative h-20 w-20 overflow-hidden rounded-full bg-stone-200 shadow-sm">
                  <img
                    alt="Vista previa final"
                    className="absolute max-w-none select-none"
                    draggable={false}
                    src={imageUrl}
                    style={getScaledCropStyle(cropLayout, 208, 80)}
                  />
                  <div className="pointer-events-none absolute inset-0 rounded-full border-[3px] border-ocean-500 ring-1 ring-white/90" />
                </div>

                <div>
                  <p className="text-sm font-medium text-stone-900">{accountLabel}</p>
                  <p className="text-sm text-stone-500">{previewHint}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                className="inline-flex w-full items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 sm:w-auto"
                onClick={onCenter}
                type="button"
              >
                {centerLabel}
              </button>

              <button
                className="inline-flex w-full items-center justify-center rounded-full border border-brand-500 px-5 py-3 text-sm font-medium text-brand-500 transition-colors hover:bg-brand-100 sm:w-auto"
                onClick={onCancel}
                type="button"
              >
                {cancelLabel}
              </button>

              <button
                className="inline-flex w-full items-center justify-center rounded-full bg-brand-500 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 sm:w-auto"
                onClick={onApply}
                type="button"
              >
                {applyLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

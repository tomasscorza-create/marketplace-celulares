import type { Dispatch, PointerEvent as ReactPointerEvent, SetStateAction } from "react";

import { memo, useCallback } from "react";

import { createImagePreviewUrl, type ImageCropAspect } from "../../../lib/compressImage";
import { createDefaultCrop } from "../productDraftUtils";
import type { ProductImageDraft } from "../imageEditorTypes";

import { ProductImageCropModal } from "./ProductImageCropModal";

type FrameSize = {
  height: number;
  width: number;
};

type CropLayout = {
  drawHeight: number;
  drawWidth: number;
  left: number;
  top: number;
};

type ArtisanProductsCropControllerProps = {
  activeCropIndex: number | null;
  activeCropLayout: CropLayout;
  activeFrame: FrameSize;
  activeImageDraft: ProductImageDraft | null;
  activePreviewFrame: FrameSize;
  isCropModalOpen: boolean;
  productTitle: string;
  setIsCropModalOpen: Dispatch<SetStateAction<boolean>>;
  setDragState: (next: null) => void;
  setProductImages: Dispatch<SetStateAction<ProductImageDraft[]>>;
  onApplyError: (message: string) => void;
  // Pointer handlers (drag) viven en el padre porque dependen de su drag state.
  onPointerCancel: () => void;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerLeave: () => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: () => void;
};

/**
 * Wrapper sobre `ProductImageCropModal` que encapsula los 4 handlers de
 * mutación del crop (apply / cancel / center / selectAspect / zoomChange).
 *
 * Antes vivían como callbacks inline en `ArtisanProductsPage` ocupando
 * ~95 líneas y forzando re-creación en cada render. Acá viven como
 * `useCallback` con deps reales.
 */
function ArtisanProductsCropControllerInner({
  activeCropIndex,
  activeCropLayout,
  activeFrame,
  activeImageDraft,
  activePreviewFrame,
  isCropModalOpen,
  productTitle,
  setDragState,
  setIsCropModalOpen,
  setProductImages,
  onApplyError,
  onPointerCancel,
  onPointerDown,
  onPointerLeave,
  onPointerMove,
  onPointerUp,
}: ArtisanProductsCropControllerProps) {
  const handleApply = useCallback(async () => {
    if (activeCropIndex === null || !activeImageDraft) {
      return;
    }

    try {
      const nextPreviewUrl = await createImagePreviewUrl(
        activeImageDraft.file ?? activeImageDraft.sourceUrl,
        {
          crop: activeImageDraft.crop,
        },
      );

      setProductImages((currentValue) =>
        currentValue.map((draft, index) => {
          if (index !== activeCropIndex) {
            return draft;
          }

          if (
            draft.previewUrl.startsWith("blob:") &&
            draft.previewUrl !== draft.sourceUrl
          ) {
            URL.revokeObjectURL(draft.previewUrl);
          }

          return {
            ...draft,
            isEdited: true,
            previewUrl: nextPreviewUrl,
          };
        }),
      );
      setIsCropModalOpen(false);
      setDragState(null);
    } catch {
      onApplyError("No pudimos actualizar la vista previa de la foto.");
    }
  }, [
    activeCropIndex,
    activeImageDraft,
    onApplyError,
    setDragState,
    setIsCropModalOpen,
    setProductImages,
  ]);

  const handleCancel = useCallback(() => {
    setIsCropModalOpen(false);
    setDragState(null);
  }, [setDragState, setIsCropModalOpen]);

  const handleCenter = useCallback(() => {
    setProductImages((currentValue) =>
      currentValue.map((draft, index) =>
        index === activeCropIndex
          ? {
              ...draft,
              crop: createDefaultCrop(draft.crop.aspect ?? "square"),
            }
          : draft,
      ),
    );
    setDragState(null);
  }, [activeCropIndex, setDragState, setProductImages]);

  const handleSelectAspect = useCallback(
    (aspect: ImageCropAspect) => {
      setProductImages((currentValue) =>
        currentValue.map((draft, index) =>
          index === activeCropIndex
            ? {
                ...draft,
                crop: createDefaultCrop(aspect),
              }
            : draft,
        ),
      );
      setDragState(null);
    },
    [activeCropIndex, setDragState, setProductImages],
  );

  const handleZoomChange = useCallback(
    (value: number) => {
      setProductImages((currentValue) =>
        currentValue.map((draft, index) =>
          index === activeCropIndex
            ? {
                ...draft,
                crop: {
                  ...draft.crop,
                  zoom: value,
                },
              }
            : draft,
        ),
      );
    },
    [activeCropIndex, setProductImages],
  );

  return (
    <ProductImageCropModal
      activeCropLayout={activeCropLayout}
      activeFrame={activeFrame}
      activeImageDraft={activeImageDraft}
      activePreviewFrame={activePreviewFrame}
      isOpen={Boolean(activeImageDraft && isCropModalOpen)}
      onApply={handleApply}
      onCancel={handleCancel}
      onCenter={handleCenter}
      onPointerCancel={onPointerCancel}
      onPointerDown={onPointerDown}
      onPointerLeave={onPointerLeave}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onSelectAspect={handleSelectAspect}
      onZoomChange={handleZoomChange}
      productTitle={productTitle}
    />
  );
}

export const ArtisanProductsCropController = memo(ArtisanProductsCropControllerInner);

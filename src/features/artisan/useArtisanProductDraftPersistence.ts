import { useEffect } from "react";
import type { MutableRefObject } from "react";

import type { ArtisanProductInput } from "../../types/artisan";
import type { ProductImageDraft } from "./imageEditorTypes";
import {
  cleanupDraftUrls,
  hydratePersistedDraftImages,
  serializeProductImageDrafts,
  type PersistedProductDraftImage,
  type PersistedProductDraftState,
} from "./productDraftUtils";
import { initialProductForm } from "./artisanProductsPageUtils";
import { loadProductDraft, removeProductDraft, saveProductDraft } from "../../lib/browser/productDraftStorage";

type SerializedDraftImagesCache = {
  drafts: ProductImageDraft[] | null;
  persisted: PersistedProductDraftImage[];
};

type DraftPersistenceParams = {
  draftKey: string;
  draftSaveRequestIdRef: MutableRefObject<number>;
  editingProductId: string | null;
  isDraftReady: boolean;
  productForm: ArtisanProductInput;
  productImages: ProductImageDraft[];
  productImagesRef: MutableRefObject<ProductImageDraft[]>;
  serializedDraftImagesCacheRef: MutableRefObject<SerializedDraftImagesCache>;
  setDraftPersistenceState: (state: "idle" | "saving" | "saved" | "error") => void;
  setEditingProductId: (productId: string | null) => void;
  setHasAppliedLearningDefaults: (value: boolean) => void;
  setHasDraft: (value: boolean) => void;
  setIsDraftReady: (value: boolean) => void;
  setProductForm: (
    updater: ArtisanProductInput | ((current: ArtisanProductInput) => ArtisanProductInput),
  ) => void;
  setProductImages: (images: ProductImageDraft[]) => void;
  setSaveErrorMessage: (
    updater: string | null | ((current: string | null) => string | null),
  ) => void;
  setStatusMessage: (message: string | null) => void;
};

export function useArtisanProductDraftPersistence({
  draftKey,
  draftSaveRequestIdRef,
  editingProductId,
  isDraftReady,
  productForm,
  productImages,
  productImagesRef,
  serializedDraftImagesCacheRef,
  setDraftPersistenceState,
  setEditingProductId,
  setHasAppliedLearningDefaults,
  setHasDraft,
  setIsDraftReady,
  setProductForm,
  setProductImages,
  setSaveErrorMessage,
  setStatusMessage,
}: DraftPersistenceParams) {
  useEffect(() => {
    cleanupDraftUrls(productImagesRef.current);
    setProductImages([]);
    serializedDraftImagesCacheRef.current = {
      drafts: null,
      persisted: [],
    };
    setEditingProductId(null);
    setStatusMessage(null);
    setSaveErrorMessage(null);
    setHasDraft(false);
    setIsDraftReady(false);
    setDraftPersistenceState("idle");
    setProductForm(initialProductForm);
    setHasAppliedLearningDefaults(false);

    let isCancelled = false;

    const loadDraft = async () => {
      try {
        const draft = await loadProductDraft<Partial<PersistedProductDraftState>>(draftKey);

        if (isCancelled || !draft) {
          return;
        }

        const hasContent =
          draft.title?.trim() ||
          draft.description?.trim() ||
          Number(draft.price) > 0 ||
          (draft.imageDrafts?.length ?? 0) > 0 ||
          (draft.product_attributes?.length ?? 0) > 0 ||
          (draft.category_spec_values?.length ?? 0) > 0;

        if (!hasContent) {
          return;
        }

        const hydratedImages = draft.imageDrafts?.length
          ? await hydratePersistedDraftImages(draft.imageDrafts)
          : [];

        if (isCancelled) {
          cleanupDraftUrls(hydratedImages);
          return;
        }

        setHasDraft(true);
        setDraftPersistenceState("saved");
        setEditingProductId(draft.editingProductId ?? null);
        setProductForm((prev) => ({
          ...prev,
          availability_mode: draft.availability_mode ?? prev.availability_mode,
          category_id: draft.category_id ?? prev.category_id,
          title: draft.title ?? prev.title,
          description: draft.description ?? prev.description,
          price: draft.price ?? prev.price,
          is_active: draft.is_active ?? prev.is_active,
          stock_quantity: draft.stock_quantity ?? prev.stock_quantity,
          lead_time_days: draft.lead_time_days ?? prev.lead_time_days,
          made_to_order_options: draft.made_to_order_options ?? prev.made_to_order_options,
          product_attributes: draft.product_attributes ?? prev.product_attributes,
          category_spec_values: draft.category_spec_values ?? prev.category_spec_values,
        }));
        setProductImages(hydratedImages);
      } catch {
        if (!isCancelled) {
          setDraftPersistenceState("error");
          setSaveErrorMessage(
            "No pudimos restaurar el borrador del producto. Revisá IndexedDB del navegador.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsDraftReady(true);
        }
      }
    };

    void loadDraft();

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  useEffect(() => {
    if (!isDraftReady) {
      return;
    }

    const saveRequestId = ++draftSaveRequestIdRef.current;

    const hasContent =
      productForm.title.trim().length > 0 ||
      productForm.description.trim().length > 0 ||
      Number(productForm.price) > 0 ||
      productForm.product_attributes.length > 0 ||
      productForm.category_spec_values.length > 0 ||
      productImages.length > 0;

    if (!hasContent) {
      void removeProductDraft(draftKey);
      setHasDraft(false);
      setDraftPersistenceState("idle");
      return;
    }

    let isCancelled = false;

    const persistDraft = async () => {
      try {
        if (!isCancelled) {
          setDraftPersistenceState("saving");
        }

        const imageDrafts =
          serializedDraftImagesCacheRef.current.drafts === productImages
            ? serializedDraftImagesCacheRef.current.persisted
            : await serializeProductImageDrafts(productImages);

        if (serializedDraftImagesCacheRef.current.drafts !== productImages) {
          serializedDraftImagesCacheRef.current = {
            drafts: productImages,
            persisted: imageDrafts,
          };
        }

        if (isCancelled || saveRequestId !== draftSaveRequestIdRef.current) {
          return;
        }

        await saveProductDraft(draftKey, {
          availability_mode: productForm.availability_mode,
          category_id: productForm.category_id,
          description: productForm.description,
          editingProductId,
          imageDrafts,
          is_active: productForm.is_active,
          lead_time_days: productForm.lead_time_days,
          made_to_order_options: productForm.made_to_order_options,
          product_attributes: productForm.product_attributes,
          category_spec_values: productForm.category_spec_values,
          price: productForm.price,
          stock_quantity: productForm.stock_quantity,
          title: productForm.title,
        } satisfies PersistedProductDraftState);

        if (!isCancelled && saveRequestId === draftSaveRequestIdRef.current) {
          setHasDraft(true);
          setDraftPersistenceState("saved");
        }
      } catch {
        if (!isCancelled && saveRequestId === draftSaveRequestIdRef.current) {
          setDraftPersistenceState("error");
          setSaveErrorMessage((currentValue) =>
            currentValue ?? "No pudimos guardar el borrador del producto en este navegador.",
          );
        }
      }
    };

    const saveTimer = window.setTimeout(() => {
      void persistDraft();
    }, 800);

    return () => {
      isCancelled = true;
      window.clearTimeout(saveTimer);
    };
  }, [
    draftKey,
    productForm.availability_mode,
    productForm.title,
    productForm.description,
    productForm.price,
    productForm.category_id,
    productForm.is_active,
    productForm.stock_quantity,
    productForm.lead_time_days,
    productForm.made_to_order_options,
    productForm.product_attributes,
    productForm.category_spec_values,
    productImages,
    editingProductId,
    isDraftReady,
    draftSaveRequestIdRef,
    serializedDraftImagesCacheRef,
    setDraftPersistenceState,
    setHasDraft,
    setSaveErrorMessage,
  ]);
}

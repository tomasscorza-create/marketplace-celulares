import type { FormEvent, PointerEvent as ReactPointerEvent } from "react";
import type { ArtisanProduct, ArtisanProductInput } from "../types/artisan";
import type { ProductImageDraft } from "../features/artisan/imageEditorTypes";
import { isProductModel3DMediaItem } from "../types/productMedia";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { PagePlaceholder } from "../components/PagePlaceholder";
import { useAdminArtisanProfile } from "../features/admin/adminQueries";
import {
  getArtisanProductById,
  removeArtisanProductImages,
} from "../features/artisan/artisanClient";
import {
  useArtisanCategories,
  useArtisanProductLearningProfile,
  useArtisanProductStats,
  useArtisanProducts,
  useCreateArtisanProduct,
  useDeleteArtisanProduct,
  useUpdateArtisanProduct,
} from "../features/artisan/artisanQueries";
import { getErrorMessage } from "../lib/errors";
import { ArtisanProductFormSection } from "../features/artisan/components/ArtisanProductFormSection";
import { ArtisanProductListSection } from "../features/artisan/components/ArtisanProductListSection";
import { ArtisanProductsAdminHeader } from "../features/artisan/components/ArtisanProductsAdminHeader";
import { ArtisanProductsConfirmModals } from "../features/artisan/components/ArtisanProductsConfirmModals";
import { ArtisanProductsCropController } from "../features/artisan/components/ArtisanProductsCropController";
import { ArtisanProductsStatsBar } from "../features/artisan/components/ArtisanProductsStatsBar";
import {
  DRAFT_KEY_PREFIX,
  MANAGEMENT_PRODUCTS_PAGE_SIZE,
  MAX_IMAGES_PER_UPLOAD,
  type DragState,
  createInitialProductForm,
  formatImageCount,
  getPrimaryProductImage,
  getProductMedia,
  getProductStoredImageUrls,
  initialProductForm,
} from "../features/artisan/artisanProductsPageUtils";
import {
  cleanupDraftUrls,
  createDefaultCrop,
  createExistingImageDraft,
  hydratePersistedDraftImages,
  type PersistedProductDraftImage,
  type PersistedProductDraftState,
  serializeProductImageDrafts,
} from "../features/artisan/productDraftUtils";
import { useArtisanProductSubmit } from "../features/artisan/useArtisanProductSubmit";
import { useAuth } from "../features/auth/useAuth";
import { loadProductDraft, removeProductDraft, saveProductDraft } from "../lib/browser/productDraftStorage";
import {
  getCropFrameDimensions,
  getCropLayout,
  loadImage,
} from "../lib/compressImage";

export function ArtisanProductsPage() {
  const { artisanId } = useParams();
  const [searchParams] = useSearchParams();
  const { role, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const productFormRef = useRef<HTMLDivElement | null>(null);
  const productImagesRef = useRef<ProductImageDraft[]>([]);
  const serializedDraftImagesCacheRef = useRef<{
    drafts: ProductImageDraft[] | null;
    persisted: PersistedProductDraftImage[];
  }>({
    drafts: null,
    persisted: [],
  });
  const isBulkUploadRef = useRef(false);
  // Categorías, productos y lotes ahora se cargan vía React Query.
  // Cache automática + revalidación + estado loading/error sin useState manual.
  const [productForm, setProductForm] = useState<ArtisanProductInput>(initialProductForm);
  const [productImages, setProductImages] = useState<ProductImageDraft[]>([]);
  const [productModel3DFile, setProductModel3DFile] = useState<File | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [targetImageIndex, setTargetImageIndex] = useState<number | null>(null);
  const [activeCropIndex, setActiveCropIndex] = useState<number | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [editingOriginalImageUrls, setEditingOriginalImageUrls] = useState<string[]>([]);
  const [hasDraft, setHasDraft] = useState(false);
  const [isDraftReady, setIsDraftReady] = useState(false);
  const [draftPersistenceState, setDraftPersistenceState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [hasAppliedRequestedEdit, setHasAppliedRequestedEdit] = useState(false);
  const [managementSearch, setManagementSearch] = useState("");
  const [managementProductsPage, setManagementProductsPage] = useState(1);
  const [hasAppliedLearningDefaults, setHasAppliedLearningDefaults] = useState(false);
  const isAdminManaging = role === "admin" && Boolean(artisanId);
  const isCreateFocus = searchParams.get("focus") === "create";
  const isEditFocus = searchParams.get("mode") === "edit";
  const requestedProductId = searchParams.get("productId");
  const targetArtisanId = isAdminManaging ? artisanId ?? null : user?.id ?? null;
  const draftScope = isEditFocus ? "edit" : isCreateFocus ? "create" : "manage";
  const draftKey = targetArtisanId
    ? `${DRAFT_KEY_PREFIX}:${targetArtisanId}:${draftScope}`
    : `${DRAFT_KEY_PREFIX}:${draftScope}`;
  const isEditSelectionMode = isEditFocus && !editingProductId;
  const showProductForm = !isEditSelectionMode;
  const showManagementList = !isCreateFocus && (!isEditFocus || isEditSelectionMode);
  const useSingleColumnLayout = isCreateFocus || isEditSelectionMode || !showManagementList;
  const deferredManagementSearch = useDeferredValue(managementSearch);
  const normalizedManagementSearch = deferredManagementSearch.trim();

  const handleModel3DFileChange = useCallback((file: File | null) => {
    if (!file) {
      setProductModel3DFile(null);
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension !== "glb" && extension !== "gltf") {
      setSaveErrorMessage("El modelo 3D debe estar en formato .glb o .gltf.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setSaveErrorMessage("El modelo 3D no puede superar 8 MB en esta fase.");
      return;
    }

    setSaveErrorMessage(null);
    setProductModel3DFile(file);
  }, []);

  const handleRemoveModel3D = useCallback(() => {
    setProductModel3DFile(null);
    setProductForm((currentValue) => ({
      ...currentValue,
      product_media: currentValue.product_media.filter(
        (mediaItem) => !isProductModel3DMediaItem(mediaItem),
      ),
    }));
  }, []);

  // ─── Fetching via React Query ─────────────────────────────────────────
  // Cuando el admin gestiona el perfil de un vendedor, cargamos su perfil.
  const managedProfileQuery = useAdminArtisanProfile(artisanId, isAdminManaging);
  const managedProfile = isAdminManaging ? managedProfileQuery.data ?? null : null;
  const isManagedProfileLoading = isAdminManaging && managedProfileQuery.isLoading;

  // Categorías globales — comparte cache con otros pages.
  const categoriesQuery = useArtisanCategories();
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const learningProfileQuery = useArtisanProductLearningProfile(
    targetArtisanId ?? undefined,
    categories,
    Boolean(targetArtisanId),
  );
  const learningProfile = learningProfileQuery.data ?? null;

  const productListParams = useMemo(
    () => ({
      limit: MANAGEMENT_PRODUCTS_PAGE_SIZE,
      page: managementProductsPage,
      search: normalizedManagementSearch || undefined,
      standaloneOnly: true,
    }),
    [managementProductsPage, normalizedManagementSearch],
  );
  // Productos individuales y lotes del vendedor objetivo, paginados para no
  // traer todo el catalogo cuando la cuenta crece.
  const productsQuery = useArtisanProducts(
    targetArtisanId ?? undefined,
    Boolean(targetArtisanId),
    productListParams,
  );
  const products = useMemo(() => productsQuery.data?.items ?? [], [productsQuery.data?.items]);
  const productsTotalCount = productsQuery.data?.count ?? 0;

  const productStatsQuery = useArtisanProductStats(
    targetArtisanId ?? undefined,
    Boolean(targetArtisanId),
  );
  const totalProductsCount = productStatsQuery.data?.totalProducts ?? productsTotalCount;


  // Loading agregado: true mientras todavía no haya llegado nada de Supabase.
  const isLoading =
    Boolean(targetArtisanId) &&
    (categoriesQuery.isLoading ||
      productsQuery.isLoading ||
      productStatsQuery.isLoading);

  // Mutations de productos y lotes — invalidan automáticamente las queries.
  const createProductMutation = useCreateArtisanProduct(targetArtisanId ?? undefined);
  const updateProductMutation = useUpdateArtisanProduct(targetArtisanId ?? undefined);
  const deleteProductMutation = useDeleteArtisanProduct(targetArtisanId ?? undefined);

  // Error agregado de carga (para mostrar en UI si nada cargó).
  const loadErrorMessage =
    categoriesQuery.error?.message ??
    productsQuery.error?.message ??
    productStatsQuery.error?.message ??
    (isAdminManaging ? managedProfileQuery.error?.message ?? null : null) ??
    null;
  const errorMessage = saveErrorMessage ?? loadErrorMessage;

  useEffect(() => {
    setManagementProductsPage(1);
  }, [managementSearch]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(productsTotalCount / MANAGEMENT_PRODUCTS_PAGE_SIZE));

    if (managementProductsPage > totalPages) {
      setManagementProductsPage(totalPages);
    }
  }, [managementProductsPage, productsTotalCount]);


  useEffect(() => {
    setHasAppliedRequestedEdit(false);
  }, [requestedProductId]);

  useEffect(() => {
    productImagesRef.current = productImages;
  }, [productImages]);

  useEffect(() => {
    return () => {
      cleanupDraftUrls(productImagesRef.current);
    };
  }, []);

  useEffect(() => {
    cleanupDraftUrls(productImagesRef.current);
    setProductImages([]);
    serializedDraftImagesCacheRef.current = {
      drafts: null,
      persisted: [],
    };
    setEditingProductId(null);
    setEditingOriginalImageUrls([]);
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
          (draft.imageDrafts?.length ?? 0) > 0;

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
        setEditingOriginalImageUrls(draft.editingOriginalImageUrls ?? []);
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
        }));
        setProductImages(hydratedImages);
      } catch {
        if (!isCancelled) {
          setDraftPersistenceState("error");
          setSaveErrorMessage(
            "No pudimos restaurar el borrador del producto. Revisa IndexedDB del navegador.",
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
  }, [draftKey]);

  useEffect(() => {
    if (!isDraftReady) {
      return;
    }

    const hasContent =
      productForm.title.trim().length > 0 ||
      productForm.description.trim().length > 0 ||
      Number(productForm.price) > 0 ||
      productForm.product_attributes.length > 0 ||
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

        await saveProductDraft(draftKey, {
          availability_mode: productForm.availability_mode,
          category_id: productForm.category_id,
          description: productForm.description,
          editingOriginalImageUrls,
          editingProductId,
          imageDrafts,
          is_active: productForm.is_active,
          lead_time_days: productForm.lead_time_days,
          made_to_order_options: productForm.made_to_order_options,
          product_attributes: productForm.product_attributes,
          price: productForm.price,
          stock_quantity: productForm.stock_quantity,
          title: productForm.title,
        } satisfies PersistedProductDraftState);

        if (!isCancelled) {
          setHasDraft(true);
          setDraftPersistenceState("saved");
        }
      } catch {
        if (!isCancelled) {
          setDraftPersistenceState("error");
          setSaveErrorMessage((currentValue) =>
            currentValue ?? "No pudimos guardar el borrador del producto en este navegador.",
          );
        }
      }
    };

    void persistDraft();

    return () => {
      isCancelled = true;
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
    productImages,
    editingOriginalImageUrls,
    editingProductId,
    isDraftReady,
  ]);

  useEffect(() => {
    if (!showProductForm || !editingProductId) {
      return;
    }

    const scrollTimer = window.setTimeout(() => {
      productFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);

    return () => {
      window.clearTimeout(scrollTimer);
    };
  }, [editingProductId, showProductForm]);

  // Las mutations invalidan automáticamente las queries de productos,
  // así que no hace falta refetch manual. Devolvemos true para mantener
  // la firma que espera `finalizeSuccessfulSave`.
  const refreshProducts = async () => true;

  const finalizeSuccessfulSave = (
    successMessage: string,
    refreshed: boolean,
    staleDataWarning = "Guardamos los cambios, pero no pudimos refrescar la lista todavía.",
  ) => {
    setStatusMessage(refreshed ? successMessage : `${successMessage} ${staleDataWarning}`);
    resetForm();
    setUploadStatus(null);
    setIsSaving(false);
  };

  const resetForm = () => {
    cleanupDraftUrls(productImages);
    setEditingProductId(null);
    setEditingOriginalImageUrls([]);
    setProductImages([]);
    setProductModel3DFile(null);
    setActiveCropIndex(null);
    setIsCropModalOpen(false);
    setTargetImageIndex(null);
    setDragState(null);
    setProductForm(createInitialProductForm(categories, learningProfile));
    void removeProductDraft(draftKey);
    setHasDraft(false);
    setDraftPersistenceState("idle");
  };

  const discardDraft = () => {
    cleanupDraftUrls(productImages);
    setProductImages([]);
    setProductModel3DFile(null);
    serializedDraftImagesCacheRef.current = {
      drafts: null,
      persisted: [],
    };
    setActiveCropIndex(null);
    setIsCropModalOpen(false);
    setTargetImageIndex(null);
    setDragState(null);
    setProductForm(createInitialProductForm(categories, learningProfile));
    setEditingProductId(null);
    setEditingOriginalImageUrls([]);
    void removeProductDraft(draftKey);
    setHasDraft(false);
    setDraftPersistenceState("idle");
  };

  useEffect(() => {
    const suggestedCategoryId = learningProfile?.suggestedCategoryId || categories[0]?.id;

    if (!productForm.category_id && suggestedCategoryId) {
      setProductForm((currentValue) => ({
        ...currentValue,
        category_id: suggestedCategoryId,
      }));
    }
  }, [categories, learningProfile?.suggestedCategoryId, productForm.category_id]);

  useEffect(() => {
    if (
      !isDraftReady ||
      hasDraft ||
      hasAppliedLearningDefaults ||
      editingProductId ||
      !learningProfile ||
      learningProfile.historyCount === 0
    ) {
      return;
    }

    const hasManualContent =
      productForm.title.trim().length > 0 ||
      productForm.description.trim().length > 0 ||
      Number(productForm.price) > 0 ||
      productForm.product_attributes.length > 0 ||
      productImages.length > 0;

    if (hasManualContent) {
      setHasAppliedLearningDefaults(true);
      return;
    }

    setProductForm(createInitialProductForm(categories, learningProfile));
    setHasAppliedLearningDefaults(true);
  }, [
    categories,
    editingProductId,
    hasAppliedLearningDefaults,
    hasDraft,
    isDraftReady,
    learningProfile,
    productForm.description,
    productForm.price,
    productForm.product_attributes.length,
    productForm.title,
    productImages.length,
  ]);

  const activeImageDraft =
    activeCropIndex !== null ? productImages[activeCropIndex] ?? null : null;
  const activeFrame = getCropFrameDimensions(
    activeImageDraft?.crop.aspect ?? "square",
    // 120px = suma de paddings horizontales del modal en mobile (backdrop 32 + modal 48 + contenedor 40)
    Math.min(280, Math.max(160, (typeof window !== "undefined" ? window.innerWidth : 400) - 120)),
  );
  const activePreviewFrame = getCropFrameDimensions(activeImageDraft?.crop.aspect ?? "square", 120);
  const activeCropLayout = getCropLayout(
    activeImageDraft?.dimensions ?? null,
    activeImageDraft?.crop ?? createDefaultCrop(),
    activeFrame.width,
    activeFrame.height,
  );

  // Single-replace picker (Cambiar button on an existing image)
  const triggerImagePicker = (index: number) => {
    isBulkUploadRef.current = false;
    setTargetImageIndex(index);
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute("multiple");
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  // Bulk-add picker (the + button - lets user select up to remaining slots at once)
  const triggerBulkImagePicker = () => {
    isBulkUploadRef.current = true;
    setTargetImageIndex(null);
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute("multiple", "multiple");
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleBulkImageDrop = (fileList: FileList) => {
    isBulkUploadRef.current = true;
    setTargetImageIndex(null);
    void handleImageSelection(fileList);
  };

  const handleImageSelection = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setSaveErrorMessage(null);
    setStatusMessage(null);

    if (isBulkUploadRef.current) {
      // Bulk add: process all selected files without auto-opening the crop modal.
      const imageFiles = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
      const files = imageFiles.slice(0, MAX_IMAGES_PER_UPLOAD);

      const newDrafts: ProductImageDraft[] = [];
      let skippedFilesCount = imageFiles.length - files.length;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const objectUrl = URL.createObjectURL(file);
          const image = await loadImage(objectUrl);
          newDrafts.push({
            crop: createDefaultCrop(),
            description: "",
            dimensions: { height: image.height, width: image.width },
            file,
            id: `${Date.now()}-bulk-${i}`,
            isEdited: false,
            mediaUrl: null,
            originalUrl: null,
            previewUrl: objectUrl,
            sourceUrl: objectUrl,
            thumbnailUrl: null,
          });
        } catch {
          skippedFilesCount += 1;
        }
      }

      if (newDrafts.length > 0) {
        setProductImages((prev) => [...prev, ...newDrafts]);
        if (imageFiles.length > MAX_IMAGES_PER_UPLOAD) {
          setStatusMessage(
            `Se agregaron ${formatImageCount(newDrafts.length)}. Por carga se permiten hasta ${MAX_IMAGES_PER_UPLOAD}; las demas no se agregaron.`,
          );
        } else if (skippedFilesCount > 0) {
          setStatusMessage(
            `Se agregaron ${formatImageCount(newDrafts.length)}. ${skippedFilesCount} no se pudieron leer.`,
          );
        }
      } else {
        setSaveErrorMessage("No pudimos procesar las imágenes seleccionadas.");
      }

      isBulkUploadRef.current = false;
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
        fileInputRef.current.removeAttribute("multiple");
      }
    } else {
      // Single replace: swap one image and auto-open the crop modal.
      const file = fileList[0];

      if (!file || targetImageIndex === null) return;

      if (!file.type.startsWith("image/")) {
        setSaveErrorMessage("Selecciona un archivo de imagen válido.");
        return;
      }

      try {
        const objectUrl = URL.createObjectURL(file);
        const image = await loadImage(objectUrl);

        setProductImages((currentValue) => {
          const nextValue = [...currentValue];
          const previousDraft = nextValue[targetImageIndex];

          if (previousDraft?.previewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(previousDraft.previewUrl);
          }
          if (
            previousDraft?.sourceUrl &&
            previousDraft.sourceUrl !== previousDraft.previewUrl &&
            previousDraft.sourceUrl.startsWith("blob:")
          ) {
            URL.revokeObjectURL(previousDraft.sourceUrl);
          }

          nextValue[targetImageIndex] = {
            crop: createDefaultCrop(),
            description: previousDraft?.description ?? "",
            dimensions: { height: image.height, width: image.width },
            file,
            id: `${Date.now()}-${targetImageIndex}`,
            isEdited: false,
            mediaUrl: null,
            originalUrl: null,
            previewUrl: objectUrl,
            sourceUrl: objectUrl,
            thumbnailUrl: null,
          };

          return nextValue;
        });

        setActiveCropIndex(targetImageIndex);
        setIsCropModalOpen(true);
      } catch {
        setSaveErrorMessage("No pudimos procesar la imagen seleccionada.");
      } finally {
        setTargetImageIndex(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    setProductImages((currentValue) => {
      const nextValue = [...currentValue];
      const [removedDraft] = nextValue.splice(index, 1);

      if (removedDraft?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(removedDraft.previewUrl);
      }
      if (
        removedDraft?.sourceUrl &&
        removedDraft.sourceUrl !== removedDraft.previewUrl &&
        removedDraft.sourceUrl.startsWith("blob:")
      ) {
        URL.revokeObjectURL(removedDraft.sourceUrl);
      }

      return nextValue;
    });

    if (activeCropIndex === index) {
      setActiveCropIndex(null);
      setIsCropModalOpen(false);
      setDragState(null);
    } else if (activeCropIndex !== null && index < activeCropIndex) {
      setActiveCropIndex(activeCropIndex - 1);
    }

    if (targetImageIndex === index) {
      setTargetImageIndex(null);
    } else if (targetImageIndex !== null && index < targetImageIndex) {
      setTargetImageIndex(targetImageIndex - 1);
    }
  };

  const handleCropPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!activeImageDraft) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      pointerX: event.clientX,
      pointerY: event.clientY,
      originOffsetX: activeImageDraft.crop.offsetX,
      originOffsetY: activeImageDraft.crop.offsetY,
    });
  };

  const handleCropPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragState || activeCropIndex === null) {
      return;
    }

    const deltaX = event.clientX - dragState.pointerX;
    const deltaY = event.clientY - dragState.pointerY;

    setProductImages((currentValue) =>
      currentValue.map((draft, index) => {
        if (index !== activeCropIndex) {
          return draft;
        }

        return {
          ...draft,
          crop: {
            ...draft.crop,
            offsetX: Math.min(
              Math.max(dragState.originOffsetX + deltaX, -activeCropLayout.maxOffsetX),
              activeCropLayout.maxOffsetX,
            ),
            offsetY: Math.min(
              Math.max(dragState.originOffsetY + deltaY, -activeCropLayout.maxOffsetY),
              activeCropLayout.maxOffsetY,
            ),
          },
        };
      }),
    );
  };

  const stopDragging = () => {
    setDragState(null);
  };

  const submitProductForm = useArtisanProductSubmit({
    createProduct: createProductMutation.mutateAsync,
    editingOriginalImageUrls,
    editingProductId,
    onError: setSaveErrorMessage,
    onSavingChange: setIsSaving,
    onSuccess: finalizeSuccessfulSave,
    onUploadStatusChange: setUploadStatus,
    productForm,
    productImages,
    productModel3DFile,
    refreshProducts,
    targetArtisanId,
    updateProduct: updateProductMutation.mutateAsync,
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage(null);
    setSaveErrorMessage(null);

    await submitProductForm();
  };

  const startEditing = useCallback(async (product: ArtisanProduct) => {
    cleanupDraftUrls(productImages);
    const existingMedia = getProductMedia(product);
    const existingImages = existingMedia.map((item) => item.url);
    const draftsWithDimensions = await Promise.all(
      existingMedia.map(async (mediaItem, index) => {
        try {
          const image = await loadImage(mediaItem.original_url ?? mediaItem.url);

          return {
            ...createExistingImageDraft(mediaItem, index),
            description: mediaItem.description,
             dimensions: {
               height: image.height,
               width: image.width,
             },
           };
        } catch {
          return {
            ...createExistingImageDraft(mediaItem, index),
            description: mediaItem.description,
          };
        }
      }),
    );

    setEditingProductId(product.id);
    setEditingOriginalImageUrls(getProductStoredImageUrls(product));
    setProductImages(draftsWithDimensions);
    setProductModel3DFile(null);
    setProductForm({
      availability_mode: product.availability_mode,
      category_id: product.category_id,
      description: product.description,
      image_urls: existingImages,
      product_media: product.product_media,
      product_attributes: product.product_attributes ?? [],
      is_active: product.is_active,
      lead_time_days: product.lead_time_days,
      made_to_order_options: product.made_to_order_options,
      price: Number(product.price),
      stock_quantity: product.stock_quantity,
      title: product.title,
    });
    setActiveCropIndex(null);
    setIsCropModalOpen(false);
    setStatusMessage(null);
    setSaveErrorMessage(null);
  }, [productImages]);


  useEffect(() => {
    if (!isEditFocus || !requestedProductId || hasAppliedRequestedEdit || isLoading) {
      return;
    }

    let isCancelled = false;

    const applyRequestedEdit = async () => {
      const requestedProduct =
        products.find((product) => product.id === requestedProductId) ??
        (targetArtisanId
          ? (await getArtisanProductById(targetArtisanId, requestedProductId)).data ?? null
          : null);

      if (isCancelled) {
        return;
      }

      setHasAppliedRequestedEdit(true);

      if (!requestedProduct) {
        return;
      }

      void startEditing(requestedProduct);
    };

    void applyRequestedEdit();

    return () => {
      isCancelled = true;
    };
  }, [
    hasAppliedRequestedEdit,
    isEditFocus,
    isLoading,
    products,
    requestedProductId,
    startEditing,
    targetArtisanId,
  ]);

  const handleDeleteRequest = (productId: string) => {
    setPendingDeleteId(productId);
  };


  const handleDelete = async (productId: string) => {
    if (!targetArtisanId) {
      return;
    }

    const productToDelete = products.find((product) => product.id === productId);

    if (!productToDelete) {
      return;
    }

    setPendingDeleteId(null);
    setStatusMessage(null);
    setSaveErrorMessage(null);

    try {
      await deleteProductMutation.mutateAsync(productId);
    } catch (error) {
      setSaveErrorMessage(getErrorMessage(error, "No pudimos eliminar el producto."));
      return;
    }

    const productImageUrls = getProductStoredImageUrls(productToDelete);
    const imageCleanupResponse =
      productImageUrls.length > 0 ? await removeArtisanProductImages(productImageUrls) : null;

    const refreshed = await refreshProducts();

    if (!refreshed) {
      return;
    }

    if (editingProductId === productId) {
      resetForm();
    }
    setStatusMessage(
      imageCleanupResponse?.error
        ? "Producto eliminado correctamente. No pudimos quitar algunas fotos viejas."
        : "Producto eliminado correctamente.",
    );
  };


  const moveImageToPrimary = (index: number) => {
    setProductImages((currentValue) => {
      if (index <= 0 || index >= currentValue.length) {
        return currentValue;
      }

      const nextValue = [...currentValue];
      const [selectedDraft] = nextValue.splice(index, 1);
      nextValue.unshift(selectedDraft);
      return nextValue;
    });

    if (activeCropIndex === index) {
      setActiveCropIndex(0);
    } else if (activeCropIndex !== null && activeCropIndex < index) {
      setActiveCropIndex(activeCropIndex + 1);
    }
  };

  return (
    <PagePlaceholder description="" hideHeader title="">
      {isAdminManaging ? (
        <ArtisanProductsAdminHeader
          isCreateFocus={isCreateFocus}
          managedProfile={managedProfile}
        />
      ) : null}

      {!isManagedProfileLoading && !isCreateFocus && !isEditFocus ? (
        <ArtisanProductsStatsBar totalCount={totalProductsCount} />
      ) : null}

      {isAdminManaging && isManagedProfileLoading ? (
        <div className="rounded-3xl border border-stone-200 bg-white px-5 py-8 text-sm text-stone-500">
          Cargando perfil vendedor...
        </div>
      ) : null}

      {!isManagedProfileLoading ? (
      <>
      <input
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void handleImageSelection(event.target.files);
        }}
        ref={fileInputRef}
        type="file"
      />

        <div
          className={
          useSingleColumnLayout
            ? "grid items-start gap-5"
            : "grid items-start gap-5 xl:grid-cols-[minmax(0,1.02fr)_minmax(320px,0.98fr)]"
        }
      >
        {showProductForm ? (
          <div ref={productFormRef} className="scroll-mt-28">
          <ArtisanProductFormSection
            categories={categories}
            isCreateFocused={isCreateFocus}
            draftPersistenceState={draftPersistenceState}
            editingProductId={editingProductId}
            errorMessage={errorMessage}
            hasDraft={hasDraft}
            isLoading={isLoading}
            isSaving={isSaving}
            learningProfile={learningProfile}
            onAddAttribute={(initialKey) => {
              setProductForm((currentValue) => ({
                ...currentValue,
                product_attributes: [
                  ...currentValue.product_attributes,
                  {
                    key: initialKey ?? "",
                    value: "",
                  },
                ],
              }));
            }}
            onAvailabilityModeChange={(value) => {
              setProductForm((currentValue) => ({
                ...currentValue,
                availability_mode: value,
                lead_time_days:
                  value === "made_to_order"
                    ? currentValue.lead_time_days ?? 7
                    : null,
                stock_quantity:
                  value === "stock" ? Math.max(1, currentValue.stock_quantity ?? 1) : null,
              }));
            }}
            onCancel={resetForm}
            onCategoryChange={(value) => {
              setProductForm((currentValue) => ({
                ...currentValue,
                category_id: value,
              }));
            }}
            onDescriptionChange={(value) => {
              setProductForm((currentValue) => ({
                ...currentValue,
                description: value,
              }));
            }}
            onDiscardDraft={discardDraft}
            onOpenEditor={(index) => {
              setActiveCropIndex(index);
              setIsCropModalOpen(true);
            }}
            onLeadTimeDaysChange={(value) => {
              setProductForm((currentValue) => ({
                ...currentValue,
                lead_time_days: value,
              }));
            }}
            onPriceChange={(value) => {
              setProductForm((currentValue) => ({
                ...currentValue,
                price: value,
              }));
            }}
            onProductModel3DFileChange={handleModel3DFileChange}
            onRemoveAttribute={(index) => {
              setProductForm((currentValue) => ({
                ...currentValue,
                product_attributes: currentValue.product_attributes.filter(
                  (_attribute, attributeIndex) => attributeIndex !== index,
                ),
              }));
            }}
            onRemoveImage={handleRemoveImage}
            onRemoveModel3D={handleRemoveModel3D}
            onSetPrimaryImage={moveImageToPrimary}
            onStockQuantityChange={(value) => {
              setProductForm((currentValue) => ({
                ...currentValue,
                stock_quantity: value,
              }));
            }}
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
            onTitleChange={(value) => {
              setProductForm((currentValue) => ({
                ...currentValue,
                title: value,
              }));
            }}
            onToggleActive={(value) => {
              setProductForm((currentValue) => ({
                ...currentValue,
                is_active: value,
              }));
            }}
            onDropImages={handleBulkImageDrop}
            onTriggerBulkImagePicker={triggerBulkImagePicker}
            onTriggerImagePicker={triggerImagePicker}
            onUpdateMadeToOrderOptions={(options) => {
              setProductForm((currentValue) => ({
                ...currentValue,
                made_to_order_options: options,
              }));
            }}
            onUpdateAttribute={(index, field, value) => {
              setProductForm((currentValue) => ({
                ...currentValue,
                product_attributes: currentValue.product_attributes.map((attribute, attributeIndex) =>
                  attributeIndex === index
                    ? {
                        ...attribute,
                        [field]: value,
                      }
                    : attribute,
                ),
              }));
            }}
            productForm={productForm}
            productImages={productImages}
            productModel3DFile={productModel3DFile}
            statusMessage={statusMessage}
            uploadStatus={uploadStatus}
          />
          </div>
        ) : null}

        {showManagementList ? (
          <div>
            <ArtisanProductListSection
              isLoading={isLoading}
              onDelete={handleDeleteRequest}
              onEdit={(product) => {
                void startEditing(product);
              }}
              onProductPageChange={setManagementProductsPage}
              onSearchChange={setManagementSearch}
              primaryImageFor={getPrimaryProductImage}
              productPage={managementProductsPage}
              productPageSize={MANAGEMENT_PRODUCTS_PAGE_SIZE}
              products={products}
              productsTotalCount={productsTotalCount}
              search={managementSearch}
            />
          </div>
        ) : null}
      </div>

      <ArtisanProductsConfirmModals
        // Borrar producto
        pendingDeleteProductId={pendingDeleteId}
        pendingDeleteProductTitle={
          products.find((p) => p.id === pendingDeleteId)?.title ?? null
        }
        onCancelDeleteProduct={() => {
          setPendingDeleteId(null);
        }}
        onConfirmDeleteProduct={() => {
          if (pendingDeleteId) {
            void handleDelete(pendingDeleteId);
          }
        }}
      />

      <ArtisanProductsCropController
        activeCropIndex={activeCropIndex}
        activeCropLayout={activeCropLayout}
        activeFrame={activeFrame}
        activeImageDraft={activeImageDraft}
        activePreviewFrame={activePreviewFrame}
        isCropModalOpen={isCropModalOpen}
        onApplyError={setSaveErrorMessage}
        onPointerCancel={stopDragging}
        onPointerDown={handleCropPointerDown}
        onPointerLeave={stopDragging}
        onPointerMove={handleCropPointerMove}
        onPointerUp={stopDragging}
        productTitle={productForm.title}
        setDragState={setDragState}
        setIsCropModalOpen={setIsCropModalOpen}
        setProductImages={setProductImages}
      />
      </>
      ) : null}
    </PagePlaceholder>
  );
}

import type { FormEvent, PointerEvent as ReactPointerEvent } from "react";
import type { ArtisanProduct, ArtisanProductInput } from "../types/artisan";
import type { ProductImageDraft } from "../features/artisan/imageEditorTypes";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useAdminArtisanProfile } from "../features/admin/adminQueries";
import { getArtisanProductById } from "../features/artisan/artisanClient";
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
import { useCategorySpecTemplate } from "../features/categorySpecs/categorySpecsQueries";
import { ArtisanProductFormConnector } from "../features/artisan/components/ArtisanProductFormConnector";
import { ArtisanProductListSection } from "../features/artisan/components/ArtisanProductListSection";
import { ArtisanProductsAdminHeader } from "../features/artisan/components/ArtisanProductsAdminHeader";
import { ArtisanProductsConfirmModals } from "../features/artisan/components/ArtisanProductsConfirmModals";
import { ArtisanProductsCropController } from "../features/artisan/components/ArtisanProductsCropController";
import { ArtisanProductsStatsBar } from "../features/artisan/components/ArtisanProductsStatsBar";
import { ArtisanProductsPageLayout } from "../features/artisan/components/ArtisanProductsPageLayout";
import {
  DRAFT_KEY_PREFIX,
  MANAGEMENT_PRODUCTS_PAGE_SIZE,
  MAX_IMAGES_PER_UPLOAD,
  type DragState,
  createInitialProductForm,
  formatImageCount,
  getPrimaryProductImage,
  getProductMedia,
  initialProductForm,
} from "../features/artisan/artisanProductsPageUtils";
import {
  cleanupDraftUrls, createDefaultCrop, createExistingImageDraft,
  type PersistedProductDraftImage,
} from "../features/artisan/productDraftUtils";
import { useArtisanProductDraftPersistence } from "../features/artisan/useArtisanProductDraftPersistence";
import { useArtisanProductSubmit } from "../features/artisan/useArtisanProductSubmit";
import { useArtisanProductModel3D } from "../features/artisan/useArtisanProductModel3D";
import { useManagementProductPagination } from "../features/artisan/useManagementProductPagination";
import { useAuth } from "../features/auth/useAuth";
import { removeProductDraft } from "../lib/browser/productDraftStorage";
import { getCropFrameDimensions, getCropLayout, loadImage } from "../lib/compressImage";
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
  const draftSaveRequestIdRef = useRef(0);
  const isBulkUploadRef = useRef(false);
  const [productForm, setProductForm] = useState<ArtisanProductInput>(initialProductForm);
  const [productImages, setProductImages] = useState<ProductImageDraft[]>([]);
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
  const [hasDraft, setHasDraft] = useState(false);
  const [isDraftReady, setIsDraftReady] = useState(false);
  const [draftPersistenceState, setDraftPersistenceState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [hasAppliedRequestedEdit, setHasAppliedRequestedEdit] = useState(false);
  const [hasAppliedLearningDefaults, setHasAppliedLearningDefaults] = useState(false);
  const { managementProductsPage, managementSearch, setManagementProductsPage, setManagementSearch } =
    useManagementProductPagination();
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

  const {
    handleModel3DFileChange,
    handleRemoveModel3D,
    productModel3DFile,
    setProductModel3DFile,
  } = useArtisanProductModel3D({ setProductForm, setSaveErrorMessage });

  const managedProfileQuery = useAdminArtisanProfile(artisanId, isAdminManaging);
  const managedProfile = isAdminManaging ? managedProfileQuery.data ?? null : null;
  const isManagedProfileLoading = isAdminManaging && managedProfileQuery.isLoading;

  const categoriesQuery = useArtisanCategories();
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const categorySpecTemplateQuery = useCategorySpecTemplate(productForm.category_id || null);
  const categorySpecTemplate = useMemo(
    () => categorySpecTemplateQuery.data ?? [],
    [categorySpecTemplateQuery.data],
  );
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
  const isLoading =
    Boolean(targetArtisanId) &&
    (categoriesQuery.isLoading ||
      productsQuery.isLoading ||
      productStatsQuery.isLoading);

  const createProductMutation = useCreateArtisanProduct(targetArtisanId ?? undefined);
  const updateProductMutation = useUpdateArtisanProduct(targetArtisanId ?? undefined);
  const deleteProductMutation = useDeleteArtisanProduct(targetArtisanId ?? undefined);

  const loadErrorMessage =
    categoriesQuery.error?.message ??
    productsQuery.error?.message ??
    productStatsQuery.error?.message ??
    (isAdminManaging ? managedProfileQuery.error?.message ?? null : null) ??
    null;
  const errorMessage = saveErrorMessage ?? loadErrorMessage;

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(productsTotalCount / MANAGEMENT_PRODUCTS_PAGE_SIZE));

    if (managementProductsPage > totalPages) {
      setManagementProductsPage(totalPages);
    }
  }, [managementProductsPage, productsTotalCount, setManagementProductsPage]);


  useEffect(() => {
    setHasAppliedRequestedEdit(false);
  }, [requestedProductId]);

  useEffect(() => {
    productImagesRef.current = productImages;
  }, [productImages, setProductModel3DFile]);

  useEffect(() => {
    return () => {
      cleanupDraftUrls(productImagesRef.current);
    };
  }, []);

  useArtisanProductDraftPersistence({
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
  });

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

  const finalizeSuccessfulSave = (successMessage: string) => {
    setStatusMessage(successMessage);
    resetForm();
    setUploadStatus(null);
    setIsSaving(false);
  };

  const resetForm = () => {
    cleanupDraftUrls(productImages);
    setEditingProductId(null);
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
        setSaveErrorMessage("Seleccioná un archivo de imagen válido.");
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
    editingProductId,
    onError: setSaveErrorMessage,
    onSavingChange: setIsSaving,
    onSuccess: finalizeSuccessfulSave,
    onUploadStatusChange: setUploadStatus,
    productForm,
    productImages,
    productModel3DFile,
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
    setProductImages(draftsWithDimensions);
    setProductModel3DFile(null);
    setProductForm({
      availability_mode: product.availability_mode,
      category_id: product.category_id,
      description: product.description,
      image_urls: existingImages,
      product_media: product.product_media,
      product_attributes: product.product_attributes ?? [],
      category_spec_values: product.category_spec_values ?? [],
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
  }, [productImages, setProductModel3DFile]);


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

    if (editingProductId === productId) {
      resetForm();
    }
    setStatusMessage("Producto eliminado correctamente.");
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
    <ArtisanProductsPageLayout
      adminHeader={isAdminManaging ? (
        <ArtisanProductsAdminHeader
          isCreateFocus={isCreateFocus}
          managedProfile={managedProfile}
        />
      ) : null}
      statsBar={!isManagedProfileLoading && !isCreateFocus && !isEditFocus ? (
        <ArtisanProductsStatsBar totalCount={totalProductsCount} />
      ) : null}
      isManagedProfileLoading={isAdminManaging && isManagedProfileLoading}
      fileInput={<input
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void handleImageSelection(event.target.files);
        }}
        ref={fileInputRef}
        type="file"
      />}
      useSingleColumnLayout={useSingleColumnLayout}
      form={showProductForm ? (
          <div ref={productFormRef} className="scroll-mt-28">
          <ArtisanProductFormConnector
            categories={categories}
            categorySpecTemplate={categorySpecTemplate}
            isCreateFocused={isCreateFocus}
            draftPersistenceState={draftPersistenceState}
            editingProductId={editingProductId}
            errorMessage={errorMessage}
            hasDraft={hasDraft}
            isLoading={isLoading}
            isSaving={isSaving}
            learningProfile={learningProfile}
            onCancel={resetForm}
            onDiscardDraft={discardDraft}
            onOpenEditor={(index) => {
              setActiveCropIndex(index);
              setIsCropModalOpen(true);
            }}
            onProductModel3DFileChange={handleModel3DFileChange}
            onRemoveImage={handleRemoveImage}
            onRemoveModel3D={handleRemoveModel3D}
            onSetPrimaryImage={moveImageToPrimary}
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
            onDropImages={handleBulkImageDrop}
            onTriggerBulkImagePicker={triggerBulkImagePicker}
            onTriggerImagePicker={triggerImagePicker}
            productForm={productForm}
            productImages={productImages}
            productModel3DFile={productModel3DFile}
            statusMessage={statusMessage}
            setProductForm={setProductForm}
            uploadStatus={uploadStatus}
          />
          </div>
        ) : null}
      managementList={showManagementList ? (
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
      confirmModals={<ArtisanProductsConfirmModals
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
      />}
      cropController={<ArtisanProductsCropController
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
      />}
    />
  );
}

import type { FormEvent, PointerEvent as ReactPointerEvent } from "react";
import type { UserProfile } from "../types/auth";
import type { ImageCropSettings } from "../lib/compressImage";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "react-router-dom";

import { PagePlaceholder } from "../components/PagePlaceholder";
import { AdminArtisanProfileActions } from "../features/admin/components/AdminArtisanProfileActions";
import { useAdminArtisanProfile } from "../features/admin/adminQueries";
import {
  removeArtisanProfileImages,
  uploadArtisanProfileImage,
} from "../features/artisan/artisanClient";
import { useUpdateArtisanStoreProfile } from "../features/artisan/artisanQueries";
import { getErrorMessage } from "../lib/errors";
import { queryKeys } from "../lib/query/queryKeys";
import { ArtisanProfileImageCropModal } from "../features/artisan/components/ArtisanProfileImageCropModal";
import { ArtisanProfileImageSection } from "../features/artisan/components/ArtisanProfileImageSection";
import { ArtisanStoreFormSection } from "../features/artisan/components/ArtisanStoreFormSection";
import { ArtisanStorePreviewCard } from "../features/artisan/components/ArtisanStorePreviewCard";
import type { SelectedImageDimensions } from "../features/artisan/imageEditorTypes";
import { useAuth } from "../features/auth/useAuth";
import { compressImage, createImagePreviewUrl, loadImage } from "../lib/compressImage";

type DragState = {
  originOffsetX: number;
  originOffsetY: number;
  pointerX: number;
  pointerY: number;
};

type StoreProfileDraft = {
  fullName: string;
  profileImageUrl: string;
  storeDescription: string;
  storeName: string;
  themeColor: string;
};

const avatarCropDefaults: ImageCropSettings = {
  frameHeight: 208,
  frameWidth: 208,
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function buildStoreProfileDraft(profile: UserProfile | null | undefined): StoreProfileDraft {
  return {
    fullName: profile?.full_name ?? "",
    profileImageUrl: profile?.profile_image_url ?? "",
    storeDescription: profile?.store_description ?? "",
    storeName: profile?.store_name ?? "",
    themeColor: profile?.storefront_theme_color ?? "#0f766e",
  };
}

function getStoreProfileDraftSignature(draft: StoreProfileDraft) {
  return JSON.stringify(draft);
}

function getCropLayout(
  dimensions: SelectedImageDimensions | null,
  crop: ImageCropSettings,
  frameSize: number,
) {
  if (!dimensions) {
    return {
      drawHeight: frameSize,
      drawWidth: frameSize,
      left: 0,
      maxOffsetX: 0,
      maxOffsetY: 0,
      top: 0,
    };
  }

  const baseScale = Math.max(frameSize / dimensions.width, frameSize / dimensions.height);
  const drawWidth = dimensions.width * baseScale * crop.zoom;
  const drawHeight = dimensions.height * baseScale * crop.zoom;
  const maxOffsetX = Math.max(0, (drawWidth - frameSize) / 2);
  const maxOffsetY = Math.max(0, (drawHeight - frameSize) / 2);
  const offsetX = clamp(crop.offsetX, -maxOffsetX, maxOffsetX);
  const offsetY = clamp(crop.offsetY, -maxOffsetY, maxOffsetY);

  return {
    drawHeight,
    drawWidth,
    left: (frameSize - drawWidth) / 2 + offsetX,
    maxOffsetX,
    maxOffsetY,
    top: (frameSize - drawHeight) / 2 + offsetY,
  };
}

export function ArtisanStorePage() {
  const { artisanId } = useParams();
  const location = useLocation();
  const { profile, refreshProfile, role, user } = useAuth();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storeDescription, setStoreDescription] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [themeColor, setThemeColor] = useState("#0f766e");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImageSourceUrl, setSelectedImageSourceUrl] = useState<string | null>(null);
  const [selectedImagePreviewUrl, setSelectedImagePreviewUrl] = useState<string | null>(null);
  const [selectedImageDimensions, setSelectedImageDimensions] =
    useState<SelectedImageDimensions | null>(null);
  const [avatarCrop, setAvatarCrop] = useState<ImageCropSettings>(avatarCropDefaults);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const isAdminManaging = role === "admin" && Boolean(artisanId);
  const targetArtisanId = isAdminManaging ? artisanId ?? null : user?.id ?? null;
  const syncedProfileIdRef = useRef<string | null>(null);
  const syncedProfileSignatureRef = useRef<string>("");
  const hasUnsavedChangesRef = useRef(false);

  // Cuando el admin gestiona un vendedor, cargamos el perfil objetivo via query.
  // Para el vendedor logueado, usamos el `profile` del AuthProvider directamente.
  const managedProfileQuery = useAdminArtisanProfile(artisanId, isAdminManaging);
  const managedProfile: UserProfile | null = isAdminManaging
    ? managedProfileQuery.data ?? null
    : null;
  const isManagedProfileLoading = isAdminManaging && managedProfileQuery.isLoading;
  const targetProfile = isAdminManaging ? managedProfile : profile;
  const targetProfileDraft = useMemo(() => buildStoreProfileDraft(targetProfile), [targetProfile]);
  const targetProfileDraftSignature = useMemo(
    () => getStoreProfileDraftSignature(targetProfileDraft),
    [targetProfileDraft],
  );

  // Mutation: guardar cambios del perfil de tienda.
  const updateStoreMutation = useUpdateArtisanStoreProfile();
  const isSaving = updateStoreMutation.isPending;

  // Error visible: prioriza error de save, después error de carga del managed profile.
  const errorMessage =
    saveErrorMessage ?? (isAdminManaging ? managedProfileQuery.error?.message ?? null : null);
  const adminSellerOrigin =
    typeof location.state === "object" &&
    location.state !== null &&
    "adminSellerOrigin" in location.state &&
    typeof location.state.adminSellerOrigin === "string"
      ? location.state.adminSellerOrigin
      : "/panel/admin/vendedores";

  useEffect(() => {
    const nextProfileId = targetProfile?.id ?? null;

    if (!nextProfileId) {
      return;
    }

    const isSwitchingProfile = syncedProfileIdRef.current !== nextProfileId;
    const hasRemoteDraftChanged =
      syncedProfileSignatureRef.current !== targetProfileDraftSignature;
    const shouldSyncFromProfile =
      isSwitchingProfile ||
      (!hasUnsavedChangesRef.current && hasRemoteDraftChanged);

    if (!shouldSyncFromProfile) {
      return;
    }

    setFullName(targetProfileDraft.fullName);
    setStoreName(targetProfileDraft.storeName);
    setStoreDescription(targetProfileDraft.storeDescription);
    setProfileImageUrl(targetProfileDraft.profileImageUrl);
    setThemeColor(targetProfileDraft.themeColor);

    if (isSwitchingProfile) {
      setSelectedImage(null);
      setSelectedImageSourceUrl(null);
      setSelectedImagePreviewUrl(null);
      setSelectedImageDimensions(null);
      setAvatarCrop(avatarCropDefaults);
      setDragState(null);
      setIsCropModalOpen(false);
      setStatusMessage(null);
      setSaveErrorMessage(null);
    }

    syncedProfileIdRef.current = nextProfileId;
    syncedProfileSignatureRef.current = targetProfileDraftSignature;
    hasUnsavedChangesRef.current = false;
  }, [targetProfile?.id, targetProfileDraft, targetProfileDraftSignature]);

  useEffect(() => {
    if (!selectedImage) {
      setSelectedImageSourceUrl(null);
      setSelectedImagePreviewUrl(null);
      setSelectedImageDimensions(null);
      setAvatarCrop(avatarCropDefaults);
      setDragState(null);
      setIsCropModalOpen(false);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedImage);
    setSelectedImageSourceUrl(objectUrl);
    setAvatarCrop(avatarCropDefaults);
    setIsCropModalOpen(true);
  }, [selectedImage]);

  useEffect(() => {
    return () => {
      if (selectedImageSourceUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(selectedImageSourceUrl);
      }
    };
  }, [selectedImageSourceUrl]);

  useEffect(() => {
    return () => {
      if (selectedImagePreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(selectedImagePreviewUrl);
      }
    };
  }, [selectedImagePreviewUrl]);

  useEffect(() => {
    if (!selectedImageSourceUrl) {
      setSelectedImageDimensions(null);
      return;
    }

    let isCancelled = false;
    const currentImageUrl = selectedImageSourceUrl;

    const loadSelectedImageDimensions = async () => {
      try {
        const image = await loadImage(currentImageUrl);

        if (isCancelled || currentImageUrl !== selectedImageSourceUrl) {
          return;
        }

        setSelectedImageDimensions({
          width: image.width,
          height: image.height,
        });
      } catch {
        if (!isCancelled) {
          setSelectedImageDimensions(null);
        }
      }
    };

    void loadSelectedImageDimensions();

    return () => {
      isCancelled = true;
    };
  }, [selectedImageSourceUrl]);

  const cropLayout = useMemo(
    () => getCropLayout(selectedImageDimensions, avatarCrop, 208),
    [avatarCrop, selectedImageDimensions],
  );
  const accountLabel = storeName || fullName || "Tu perfil";
  const isManagedProfileMissing = isAdminManaging && !isManagedProfileLoading && !managedProfile;

  const markFormAsEdited = useCallback(() => {
    hasUnsavedChangesRef.current = true;
    setStatusMessage((currentValue) => (currentValue ? null : currentValue));
    setSaveErrorMessage((currentValue) => (currentValue ? null : currentValue));
  }, []);

  const handleFullNameChange = useCallback(
    (value: string) => {
      setFullName(value);
      markFormAsEdited();
    },
    [markFormAsEdited],
  );

  const handleStoreNameChange = useCallback(
    (value: string) => {
      setStoreName(value);
      markFormAsEdited();
    },
    [markFormAsEdited],
  );

  const handleStoreDescriptionChange = useCallback(
    (value: string) => {
      setStoreDescription(value);
      markFormAsEdited();
    },
    [markFormAsEdited],
  );

  const handleThemeColorChange = useCallback(
    (value: string) => {
      setThemeColor(value);
      markFormAsEdited();
    },
    [markFormAsEdited],
  );

  const handleSelectImage = useCallback(
    (file: File | null) => {
      setSelectedImage(file);
      if (file) {
        markFormAsEdited();
      }
    },
    [markFormAsEdited],
  );

  const handleOpenCropModal = useCallback(() => {
    setIsCropModalOpen(true);
  }, []);
  const profileImageSection = useMemo(
    () => (
      <ArtisanProfileImageSection
        displayImageUrl={selectedImagePreviewUrl || profileImageUrl}
        hasCurrentImage={Boolean(profileImageUrl)}
        hasSelectedImage={Boolean(selectedImage)}
        label={storeName || fullName || "Perfil de tienda"}
        onEditImage={handleOpenCropModal}
        onSelectImage={handleSelectImage}
      />
    ),
    [
      fullName,
      handleOpenCropModal,
      handleSelectImage,
      profileImageUrl,
      selectedImage,
      selectedImagePreviewUrl,
      storeName,
    ],
  );

  const handleCropPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!selectedImageSourceUrl) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      pointerX: event.clientX,
      pointerY: event.clientY,
      originOffsetX: avatarCrop.offsetX,
      originOffsetY: avatarCrop.offsetY,
    });
  };

  const handleCropPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragState) {
      return;
    }

    const deltaX = event.clientX - dragState.pointerX;
    const deltaY = event.clientY - dragState.pointerY;

    setAvatarCrop((currentValue) => ({
      ...currentValue,
      offsetX: clamp(
        dragState.originOffsetX + deltaX,
        -cropLayout.maxOffsetX,
        cropLayout.maxOffsetX,
      ),
      offsetY: clamp(
        dragState.originOffsetY + deltaY,
        -cropLayout.maxOffsetY,
        cropLayout.maxOffsetY,
      ),
    }));
  };

  const stopDragging = () => {
    setDragState(null);
  };

  const resetSelectedImage = () => {
    if (selectedImageSourceUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(selectedImageSourceUrl);
    }
    if (selectedImagePreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(selectedImagePreviewUrl);
    }
    setSelectedImage(null);
    setSelectedImageSourceUrl(null);
    setSelectedImagePreviewUrl(null);
    setSelectedImageDimensions(null);
    setAvatarCrop(avatarCropDefaults);
    setDragState(null);
    setIsCropModalOpen(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!targetArtisanId) {
      return;
    }

    setStatusMessage(null);
    setSaveErrorMessage(null);

    let nextProfileImageUrl = profileImageUrl;
    let uploadedProfileImageUrl: string | null = null;
    const previousProfileImageUrl = profileImageUrl;

    if (selectedImage) {
      let imageToUpload: File;

      try {
        imageToUpload = await compressImage(selectedImage, {
          crop: avatarCrop,
        });
      } catch (error) {
        setSaveErrorMessage(
          getErrorMessage(error, "No pudimos preparar la imagen para subirla."),
        );
        return;
      }

      const uploadResponse = await uploadArtisanProfileImage(targetArtisanId, imageToUpload);

      if (uploadResponse.error || !uploadResponse.data) {
        setSaveErrorMessage(
          getErrorMessage(uploadResponse.error, "No pudimos subir la foto de perfil."),
        );
        return;
      }

      nextProfileImageUrl = uploadResponse.data.publicUrl;
      uploadedProfileImageUrl = uploadResponse.data.publicUrl;
    }

    try {
      await updateStoreMutation.mutateAsync({
        profileId: targetArtisanId,
        input: {
          full_name: fullName,
          profile_image_url: nextProfileImageUrl,
          store_description: storeDescription,
          store_name: storeName,
          storefront_theme_color: themeColor,
        },
      });
    } catch (error) {
      if (uploadedProfileImageUrl) {
        await removeArtisanProfileImages([uploadedProfileImageUrl]);
      }
      setSaveErrorMessage(getErrorMessage(error, "No pudimos guardar tu tienda."));
      return;
    }

    if (
      uploadedProfileImageUrl &&
      previousProfileImageUrl &&
      previousProfileImageUrl !== uploadedProfileImageUrl
    ) {
      await removeArtisanProfileImages([previousProfileImageUrl]);
    }

    setProfileImageUrl(nextProfileImageUrl);
    resetSelectedImage();
    syncedProfileIdRef.current = targetArtisanId;
    syncedProfileSignatureRef.current = getStoreProfileDraftSignature({
      fullName,
      profileImageUrl: nextProfileImageUrl,
      storeDescription,
      storeName,
      themeColor,
    });
    hasUnsavedChangesRef.current = false;
    if (isAdminManaging && targetArtisanId) {
      // Invalida la query del perfil gestionado → refetch automático.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.admin.artisanProfile(targetArtisanId),
      });
    } else {
      await refreshProfile();
    }
    setStatusMessage("Tienda guardada correctamente.");
  };

  return (
    <PagePlaceholder
      description=""
      hideHeader
      title=""
    >
      {isAdminManaging ? (
        <div className="mb-4 grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="inline-flex items-center justify-center rounded-full border border-ocean-100 bg-white px-4 py-2 text-sm font-medium text-ocean-500 transition-colors hover:bg-ocean-50"
              to={adminSellerOrigin}
            >
              Volver a vendedores
            </Link>
            {targetArtisanId ? (
              <Link
                className="inline-flex items-center justify-center rounded-full border border-brand-100 bg-[#ECFEFF] px-4 py-2 text-sm font-medium text-brand-600 transition-colors hover:bg-[#CFFAFE]"
                to={`/panel/admin/vendedores/${targetArtisanId}/productos`}
              >
                Productos
              </Link>
            ) : null}
          </div>

          {targetArtisanId ? <AdminArtisanProfileActions artisanId={targetArtisanId} /> : null}
        </div>
      ) : null}

      {isAdminManaging && isManagedProfileLoading ? (
        <div className="rounded-3xl border border-stone-200 bg-white px-5 py-8 text-sm text-stone-500">
          Cargando perfil vendedor...
        </div>
      ) : null}

      {isManagedProfileMissing ? (
        <div className="rounded-3xl border border-brand-200 bg-[#D1FAE5] px-5 py-8 text-sm text-brand-600">
          No pudimos cargar este perfil vendedor. Volve a la lista e intenta abrirlo de nuevo.
        </div>
      ) : !isManagedProfileLoading ? (
        <div className="grid items-start gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <ArtisanStorePreviewCard
            fullName={fullName}
            imageUrl={selectedImagePreviewUrl || profileImageUrl}
            storeDescription={storeDescription}
            storeName={storeName}
            themeColor={themeColor}
          />

          <form
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
          >
            <ArtisanStoreFormSection
              errorMessage={errorMessage}
              fullName={fullName}
              isSaving={isSaving}
              onFullNameChange={handleFullNameChange}
              onStoreDescriptionChange={handleStoreDescriptionChange}
              onStoreNameChange={handleStoreNameChange}
              onThemeColorChange={handleThemeColorChange}
              profileImageSection={profileImageSection}
              statusMessage={statusMessage}
              storeDescription={storeDescription}
              storeName={storeName}
              themeColor={themeColor}
            />
          </form>
        </div>
      ) : null}

      <ArtisanProfileImageCropModal
        accountLabel={accountLabel}
        cropLayout={cropLayout}
        imageUrl={selectedImageSourceUrl}
        isOpen={Boolean(selectedImage && isCropModalOpen)}
        onApply={async () => {
          if (!selectedImage) {
            return;
          }

          try {
            const nextPreviewUrl = await createImagePreviewUrl(selectedImage, {
              crop: avatarCrop,
            });

            if (selectedImagePreviewUrl?.startsWith("blob:")) {
              URL.revokeObjectURL(selectedImagePreviewUrl);
            }

            setSelectedImagePreviewUrl(nextPreviewUrl);
            setIsCropModalOpen(false);
          } catch {
            setSaveErrorMessage("No pudimos actualizar la vista previa de la foto.");
          }
        }}
        onCancel={resetSelectedImage}
        onCenter={() => {
          setAvatarCrop(avatarCropDefaults);
          setDragState(null);
        }}
        onPointerCancel={stopDragging}
        onPointerDown={handleCropPointerDown}
        onPointerLeave={stopDragging}
        onPointerMove={handleCropPointerMove}
        onPointerUp={stopDragging}
        onZoomChange={(value) => {
          setAvatarCrop((currentValue) => ({
            ...currentValue,
            zoom: value,
          }));
        }}
        zoom={avatarCrop.zoom}
      />
    </PagePlaceholder>
  );
}

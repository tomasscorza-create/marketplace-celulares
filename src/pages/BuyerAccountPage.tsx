import type { FormEvent, PointerEvent as ReactPointerEvent } from "react";
import type { DeliveryType } from "../types/commerce";
import type { ImageCropSettings } from "../lib/compressImage";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { PagePlaceholder } from "../components/PagePlaceholder";
import { isOnlinePurchaseEnabled } from "../config/marketplace";
import { useAuth } from "../features/auth/useAuth";
import { useBuyerPreferences, useUpdateBuyerAccount } from "../features/buyer/buyerQueries";
import { ArtisanProfileImageCropModal } from "../features/artisan/components/ArtisanProfileImageCropModal";
import { ArtisanProfileImageSection } from "../features/artisan/components/ArtisanProfileImageSection";
import {
  removeArtisanProfileImages,
  uploadArtisanProfileImage,
} from "../features/artisan/artisanClient";
import { compressImage, getCropLayout, loadImage } from "../lib/compressImage";
import { getErrorMessage } from "../lib/errors";

type BuyerFormState = {
  deliveryNotes: string;
  fullName: string;
  phone: string;
  preferredDeliveryType: DeliveryType;
  profileDescription: string;
  profileImageUrl: string;
  shippingAddress: string;
};

type DragState = {
  originOffsetX: number;
  originOffsetY: number;
  pointerX: number;
  pointerY: number;
};

type SelectedImageDimensions = {
  height: number;
  width: number;
};

const MIN_FULL_NAME_LENGTH = 3;
const MAX_PROFILE_DESCRIPTION_LENGTH = 220;

const avatarCropDefaults: ImageCropSettings = {
  aspect: "square",
  frameHeight: 208,
  frameWidth: 208,
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
};

const defaultFormState: BuyerFormState = {
  deliveryNotes: "",
  fullName: "",
  phone: "",
  preferredDeliveryType: "arrange_with_seller",
  profileDescription: "",
  profileImageUrl: "",
  shippingAddress: "",
};

function buildInitialFormState(
  profile: {
    buyer_profile_bio?: string | null;
    full_name?: string | null;
    profile_image_url?: string | null;
    store_description?: string | null;
  } | null,
  preferences: {
    delivery_notes?: string | null;
    phone?: string | null;
    preferred_delivery_type?: DeliveryType | null;
    shipping_address?: string | null;
  } | null,
): BuyerFormState {
  return {
    deliveryNotes: preferences?.delivery_notes ?? "",
    fullName: profile?.full_name ?? "",
    phone: preferences?.phone ?? "",
    preferredDeliveryType: preferences?.preferred_delivery_type ?? "arrange_with_seller",
    profileDescription: profile?.buyer_profile_bio ?? profile?.store_description ?? "",
    profileImageUrl: profile?.profile_image_url ?? "",
    shippingAddress: preferences?.shipping_address ?? "",
  };
}

function getNormalizedText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function BuyerAccountPage() {
  const { profile, refreshProfile, user } = useAuth();
  const buyerId = user?.id;
  const preferencesQuery = useBuyerPreferences(buyerId, Boolean(buyerId));
  const updateBuyerAccountMutation = useUpdateBuyerAccount(buyerId);

  const [formState, setFormState] = useState<BuyerFormState>(defaultFormState);
  const [initialFormState, setInitialFormState] = useState<BuyerFormState>(defaultFormState);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [preparedProfileImageFile, setPreparedProfileImageFile] = useState<File | null>(null);
  const [selectedImageSourceUrl, setSelectedImageSourceUrl] = useState<string | null>(null);
  const [selectedImagePreviewUrl, setSelectedImagePreviewUrl] = useState<string | null>(null);
  const [selectedImageDimensions, setSelectedImageDimensions] =
    useState<SelectedImageDimensions | null>(null);
  const [avatarCrop, setAvatarCrop] = useState<ImageCropSettings>(avatarCropDefaults);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const initialStateKey = JSON.stringify(initialFormState);
  const formStateKey = JSON.stringify(formState);

  useEffect(() => {
    const nextState = buildInitialFormState(profile ?? null, preferencesQuery.data ?? null);

    setFormState((currentValue) =>
      JSON.stringify(currentValue) === initialStateKey ? nextState : currentValue,
    );
    setInitialFormState(nextState);
  }, [initialStateKey, preferencesQuery.data, profile]);

  useEffect(() => {
    if (!selectedImage) {
      setPreparedProfileImageFile(null);
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
    setSelectedImagePreviewUrl(null);
    setPreparedProfileImageFile(null);
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

    const loadSelectedImageDimensions = async () => {
      try {
        const image = await loadImage(selectedImageSourceUrl);
        setSelectedImageDimensions({
          height: image.height,
          width: image.width,
        });
      } catch {
        setSelectedImageDimensions(null);
      }
    };

    void loadSelectedImageDimensions();
  }, [selectedImageSourceUrl]);

  const normalizedState = useMemo(
    () => ({
      deliveryNotes: getNormalizedText(formState.deliveryNotes),
      fullName: getNormalizedText(formState.fullName),
      profileDescription: getNormalizedText(formState.profileDescription),
      profileImageUrl: formState.profileImageUrl.trim(),
      shippingAddress: getNormalizedText(formState.shippingAddress),
    }),
    [formState],
  );

  const cropLayout = useMemo(
    () => getCropLayout(selectedImageDimensions, avatarCrop, 208, 208),
    [avatarCrop, selectedImageDimensions],
  );
  const isSaving = updateBuyerAccountMutation.isPending;
  const hasChanged = formStateKey !== initialStateKey || Boolean(selectedImage);
  const isNameValid = normalizedState.fullName.length >= MIN_FULL_NAME_LENGTH;
  const isProfileDescriptionValid =
    normalizedState.profileDescription.length <= MAX_PROFILE_DESCRIPTION_LENGTH;
  const canSubmit = Boolean(user) && !isSaving && isNameValid && isProfileDescriptionValid && hasChanged;
  const accountError = errorMessage ?? preferencesQuery.error?.message ?? null;

  const stopDragging = () => {
    setDragState(null);
  };

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
      offsetX: clamp(dragState.originOffsetX + deltaX, -cropLayout.maxOffsetX, cropLayout.maxOffsetX),
      offsetY: clamp(dragState.originOffsetY + deltaY, -cropLayout.maxOffsetY, cropLayout.maxOffsetY),
    }));
  };

  const resetSelectedImage = () => {
    if (selectedImageSourceUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(selectedImageSourceUrl);
    }
    if (selectedImagePreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(selectedImagePreviewUrl);
    }

    setSelectedImage(null);
    setPreparedProfileImageFile(null);
    setSelectedImageSourceUrl(null);
    setSelectedImagePreviewUrl(null);
    setSelectedImageDimensions(null);
    setAvatarCrop(avatarCropDefaults);
    setDragState(null);
    setIsCropModalOpen(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user || !buyerId) {
      return;
    }

    if (!isNameValid) {
      setStatusMessage(null);
      setErrorMessage("Ingresa un nombre valido de al menos 3 caracteres.");
      return;
    }

    if (!isProfileDescriptionValid) {
      setStatusMessage(null);
      setErrorMessage("La descripcion es demasiado larga.");
      return;
    }

    setStatusMessage(null);
    setErrorMessage(null);

    let nextProfileImageUrl = normalizedState.profileImageUrl;
    let uploadedProfileImageUrl: string | null = null;
    const previousProfileImageUrl = normalizedState.profileImageUrl;

    if (selectedImage) {
      let imageToUpload = preparedProfileImageFile;

      if (!imageToUpload) {
        try {
          imageToUpload = await compressImage(selectedImage, {
            crop: avatarCrop,
          });
        } catch (error) {
          setErrorMessage(getErrorMessage(error, "No pudimos preparar la foto de perfil."));
          return;
        }
      }

      const uploadResponse = await uploadArtisanProfileImage(buyerId, imageToUpload);

      if (uploadResponse.error || !uploadResponse.data) {
        setErrorMessage(getErrorMessage(uploadResponse.error, "No pudimos subir la foto de perfil."));
        return;
      }

      nextProfileImageUrl = uploadResponse.data.publicUrl;
      uploadedProfileImageUrl = uploadResponse.data.publicUrl;
    }

    await updateBuyerAccountMutation
      .mutateAsync({
        delivery_notes: formState.deliveryNotes,
        full_name: normalizedState.fullName,
        phone: formState.phone,
        preferred_delivery_type: formState.preferredDeliveryType,
        profile_description: normalizedState.profileDescription,
        profile_image_url: nextProfileImageUrl,
        shipping_address: normalizedState.shippingAddress,
      })
      .then(async () => {
        if (
          uploadedProfileImageUrl &&
          previousProfileImageUrl &&
          previousProfileImageUrl !== uploadedProfileImageUrl
        ) {
          await removeArtisanProfileImages([previousProfileImageUrl]);
        }

        await refreshProfile();
        const nextState = {
          ...formState,
          fullName: normalizedState.fullName,
          profileDescription: normalizedState.profileDescription,
          profileImageUrl: nextProfileImageUrl,
          shippingAddress: normalizedState.shippingAddress,
        };

        setInitialFormState(nextState);
        setFormState(nextState);
        resetSelectedImage();
        setStatusMessage("Perfil actualizado.");
      })
      .catch(async (error: Error) => {
        if (uploadedProfileImageUrl) {
          await removeArtisanProfileImages([uploadedProfileImageUrl]);
        }
        setErrorMessage(error.message);
      });
  };

  return (
    <PagePlaceholder
      actions={
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex w-full items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 sm:w-auto"
            to="/perfil/cliente"
          >
            Ver perfil
          </Link>
          {isOnlinePurchaseEnabled ? (
            <Link
              className="inline-flex w-full items-center justify-center rounded-full border border-ocean-500 px-5 py-3 text-sm font-medium text-ocean-500 transition-colors hover:bg-[#E0F2FE] sm:w-auto"
              to="/panel/comprador"
            >
              Mis pedidos
            </Link>
          ) : null}
        </div>
      }
      badge="Configuracion"
      description=""
      title="Editar perfil"
    >
      {accountError ? (
        <div className="rounded-2xl border border-brand-500 bg-[#D1FAE5] px-4 py-3 text-sm text-brand-500">
          {accountError}
        </div>
      ) : null}

      {statusMessage ? (
        <div className="rounded-2xl border border-sun-500 bg-[#ECFEFF] px-4 py-3 text-sm text-brand-500">
          {statusMessage}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <form
          className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <ArtisanProfileImageSection
            activeImageMessage="Foto actual activa en tu perfil."
            description="Subi una foto, ajusta el encuadre y guarda los cambios para actualizar tu perfil."
            displayImageUrl={selectedImagePreviewUrl || formState.profileImageUrl || null}
            emptyImageMessage="Todavia no cargaste una foto."
            hasCurrentImage={Boolean(formState.profileImageUrl)}
            hasSelectedImage={Boolean(selectedImage)}
            label={normalizedState.fullName || "Perfil comprador"}
            onEditImage={() => {
              setIsCropModalOpen(true);
            }}
            onSelectImage={(file) => {
              setStatusMessage(null);
              if (errorMessage) {
                setErrorMessage(null);
              }
              setPreparedProfileImageFile(null);
              setSelectedImage(file);
            }}
            pendingImageMessage="Nueva foto lista para guardar."
            title="Foto de perfil"
          />

          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-stone-700">
              Nombre
              <input
                className="rounded-2xl border border-stone-300 px-4 py-3 text-sm text-stone-900 outline-none transition-colors focus:border-sun-500"
                onChange={(event) => {
                  setStatusMessage(null);
                  if (errorMessage) {
                    setErrorMessage(null);
                  }
                  setFormState((currentValue) => ({
                    ...currentValue,
                    fullName: event.target.value,
                  }));
                }}
                placeholder="Ej. Ana Lopez"
                type="text"
                value={formState.fullName}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-stone-700">
              Descripcion
              <textarea
                className="min-h-28 rounded-2xl border border-stone-300 px-4 py-3 text-sm text-stone-900 outline-none transition-colors focus:border-sun-500"
                onChange={(event) => {
                  setStatusMessage(null);
                  if (errorMessage) {
                    setErrorMessage(null);
                  }
                  setFormState((currentValue) => ({
                    ...currentValue,
                    profileDescription: event.target.value,
                  }));
                }}
                placeholder="Conta un poco sobre vos."
                value={formState.profileDescription}
              />
              <span className="text-xs font-normal text-stone-500">
                {normalizedState.profileDescription.length}/{MAX_PROFILE_DESCRIPTION_LENGTH}
              </span>
            </label>
          </div>

          {isOnlinePurchaseEnabled ? (
            <section className="grid gap-3 rounded-3xl border border-stone-200 bg-stone-50/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-stone-900">Datos de contacto</h2>
                  <p className="mt-1 text-sm text-stone-500">
                    {formState.phone.trim() ||
                    formState.deliveryNotes.trim() ||
                    formState.shippingAddress.trim()
                      ? "Gestiona telefono, direccion y notas desde una pantalla separada."
                      : "Carga tu telefono, direccion de entrega y notas de compra."}
                  </p>
                </div>
                <Link
                  className="inline-flex min-h-10 items-center justify-center rounded-full border border-ocean-200 bg-white px-4 py-2 text-sm font-semibold text-ocean-600 transition-colors hover:border-ocean-400 hover:bg-[#E0F2FE]"
                  to="/panel/comprador/cuenta/contacto"
                >
                  Editar datos de contacto
                </Link>
              </div>
              <div className="grid gap-3 rounded-2xl border border-white/90 bg-white px-4 py-4 text-sm text-stone-600">
                <div className="flex items-center justify-between gap-3">
                  <span>Telefono</span>
                  <span className="font-medium text-stone-900">
                    {formState.phone.trim() || "Sin cargar"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Direccion</span>
                  <span className="font-medium text-stone-900">
                    {formState.shippingAddress.trim() || "Sin cargar"}
                  </span>
                </div>
              </div>
            </section>
          ) : null}

          {!isNameValid && normalizedState.fullName.length > 0 ? (
            <p className="rounded-2xl border border-brand-100 bg-[#FDF1EC] px-4 py-3 text-sm text-brand-500">
              El nombre debe tener al menos 3 caracteres.
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-sun-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0e7490] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canSubmit}
              type="submit"
            >
              {isSaving ? "Guardando..." : hasChanged ? "Guardar cambios" : "Sin cambios"}
            </button>
          </div>
        </form>

        <aside className="grid gap-3 self-start rounded-3xl border border-sun-100 bg-[linear-gradient(180deg,_#f8fafc,_#ffffff)] p-5 shadow-sm">
          <div className="flex items-center gap-4 rounded-2xl border border-white/90 bg-white/90 px-4 py-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[1.25rem] bg-[#475569] text-xl font-semibold text-white">
              {selectedImagePreviewUrl || formState.profileImageUrl ? (
                <img
                  alt={normalizedState.fullName || "Perfil comprador"}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  src={selectedImagePreviewUrl || formState.profileImageUrl}
                />
              ) : (
                (normalizedState.fullName || "C").charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-stone-900">
                {normalizedState.fullName || "Tu perfil comprador"}
              </p>
              <p className="mt-1 text-sm text-stone-500">{profile?.email ?? user?.email ?? ""}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/90 bg-white/90 px-4 py-4 text-sm leading-6 text-stone-600">
            {normalizedState.profileDescription || "Todavia no agregaste una descripcion."}
          </div>
        </aside>
      </div>

      <ArtisanProfileImageCropModal
        accountLabel={normalizedState.fullName || "Perfil comprador"}
        cropLayout={cropLayout}
        imageUrl={selectedImageSourceUrl}
        instruction="Arrastra la imagen dentro del circulo para acomodarla. Cuando te guste, aplicala y despues guarda el perfil."
        isOpen={Boolean(selectedImage && isCropModalOpen)}
        onApply={async () => {
          if (!selectedImage) {
            return;
          }

          try {
            const processedFile = await compressImage(selectedImage, {
              crop: avatarCrop,
            });
            const nextPreviewUrl = URL.createObjectURL(processedFile);

            if (selectedImagePreviewUrl?.startsWith("blob:")) {
              URL.revokeObjectURL(selectedImagePreviewUrl);
            }

            setPreparedProfileImageFile(processedFile);
            setSelectedImagePreviewUrl(nextPreviewUrl);
            setIsCropModalOpen(false);
          } catch {
            setErrorMessage("No pudimos actualizar la vista previa de la foto.");
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
        previewHint="Asi se vera en tu perfil."
        title="Ajusta tu foto antes de guardarla"
        zoom={avatarCrop.zoom}
      />
    </PagePlaceholder>
  );
}

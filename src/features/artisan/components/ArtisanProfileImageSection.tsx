import { memo } from "react";

import { UserAvatar } from "../../../components/UserAvatar";

type ArtisanProfileImageSectionProps = {
  activeImageMessage?: string;
  description?: string;
  displayImageUrl: string | null;
  emptyImageMessage?: string;
  hasCurrentImage: boolean;
  hasSelectedImage: boolean;
  label: string;
  onEditImage: () => void;
  onSelectImage: (file: File | null) => void;
  pendingImageMessage?: string;
  title?: string;
};

export const ArtisanProfileImageSection = memo(function ArtisanProfileImageSection({
  activeImageMessage = "Avatar actual activo en tu cuenta.",
  description = "Selecciona una imagen, recórtala a tu gusto y guarda para actualizar tu avatar público.",
  displayImageUrl,
  emptyImageMessage = "Todavía no cargaste una foto.",
  hasCurrentImage,
  hasSelectedImage,
  label,
  onEditImage,
  onSelectImage,
  pendingImageMessage = "Nueva foto lista para guardar. Puedes abrir el editor nuevamente antes de confirmar.",
  title = "Foto de perfil",
}: ArtisanProfileImageSectionProps) {
  return (
    <div className="grid gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-4">
      <div className="flex items-center gap-4">
        <UserAvatar
          imageUrl={displayImageUrl}
          label={label}
          sizeClassName="h-16 w-16"
          textClassName="text-lg"
        />
        <div>
          <p className="text-sm font-medium text-stone-700">{title}</p>
          <p className="mt-1 text-sm leading-6 text-stone-500">{description}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-ocean-500 px-5 py-3 text-sm font-medium text-ocean-500 transition-colors hover:bg-[#E0F2FE]">
          Elegir foto
          <input
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              onSelectImage(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
            type="file"
          />
        </label>

        {hasSelectedImage ? (
          <button
            className="inline-flex items-center justify-center rounded-full border border-sun-500 bg-[#ECFEFF] px-5 py-3 text-sm font-medium text-brand-500 transition-colors hover:bg-[#A5F3FC]"
            onClick={onEditImage}
            type="button"
          >
            Editar encuadre
          </button>
        ) : null}

        {hasSelectedImage ? (
          <span className="text-sm text-stone-500">Foto nueva seleccionada.</span>
        ) : hasCurrentImage ? (
          <span className="text-sm text-stone-500">{activeImageMessage}</span>
        ) : (
          <span className="text-sm text-stone-500">{emptyImageMessage}</span>
        )}
      </div>

      {hasSelectedImage ? (
        <div className="rounded-2xl border border-sun-500 bg-[#ECFEFF] px-4 py-3 text-sm text-brand-500">
          {pendingImageMessage}
        </div>
      ) : null}
    </div>
  );
});

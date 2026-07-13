import { UserAvatar } from "../../../components/UserAvatar";
import { getActionButtonClassName } from "../../../components/ActionButton";
import {
  fieldErrorClassName,
  fieldHintClassName,
  fieldMetaClassName,
} from "../../../lib/forms/fieldStyles";

type AdminArtisanProfileImageSectionProps = {
  errorMessage?: string | null;
  hasCurrentImage: boolean;
  hasSelectedImage: boolean;
  imageUrl: string | null;
  label: string;
  onSelectImage: (file: File | null) => void;
};

export function AdminArtisanProfileImageSection({
  errorMessage,
  hasCurrentImage,
  hasSelectedImage,
  imageUrl,
  label,
  onSelectImage,
}: AdminArtisanProfileImageSectionProps) {
  return (
    <div className="grid gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-4">
      <div className="flex items-center gap-4">
        <UserAvatar
          imageUrl={imageUrl}
          label={label}
          sizeClassName="h-16 w-16"
          textClassName="text-lg"
        />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-stone-700">Foto de perfil</p>
            <span className={fieldMetaClassName}>Opcional</span>
          </div>
          <p className="mt-1 text-sm leading-6 text-stone-500">
            Sube una imagen JPG o PNG para mostrar el avatar publico de la cuenta vendedora.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className={`${getActionButtonClassName({ size: "sm", variant: "ghost" })} cursor-pointer`}>
          Elegir foto
          <input
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            className="hidden"
            onChange={(event) => {
              onSelectImage(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
            type="file"
          />
        </label>

        {hasSelectedImage ? (
          <span className="rounded-full bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700">
            Nueva foto lista para guardar
          </span>
        ) : hasCurrentImage ? (
          <span className="text-sm text-stone-500">La cuenta ya tiene foto activa.</span>
        ) : (
          <span className="text-sm text-stone-500">Todavia no hay foto cargada.</span>
        )}
      </div>

      {errorMessage ? (
        <p className={fieldErrorClassName}>{errorMessage}</p>
      ) : (
        <p className={fieldHintClassName}>
          Al guardar, la imagen se sube al mismo storage que usa la tienda del vendedor.
        </p>
      )}
    </div>
  );
}

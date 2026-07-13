import { memo } from "react";

import { UserAvatar } from "../../../components/UserAvatar";

type ArtisanStorePreviewCardProps = {
  fullName: string;
  imageUrl: string | null;
  storeDescription: string;
  storeName: string;
  themeColor: string;
};

export const ArtisanStorePreviewCard = memo(function ArtisanStorePreviewCard({
  fullName,
  imageUrl,
  storeDescription,
  storeName,
  themeColor,
}: ArtisanStorePreviewCardProps) {
  return (
    <aside className="rounded-3xl border border-ocean-100 bg-[linear-gradient(180deg,_#ffffff,_#e0f2fe)] p-5 shadow-sm sm:p-6">
      <p className="text-sm font-semibold uppercase tracking-widest text-ocean-500">
        Vista previa
      </p>
      <div className="mt-5 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <UserAvatar
            imageUrl={imageUrl}
            label={storeName || fullName || "Perfil de tienda"}
            sizeClassName="h-16 w-16"
            textClassName="text-lg"
          />

          <div>
            <h2 className="text-lg font-semibold text-stone-900">{storeName || "Tu tienda"}</h2>
            <p className="text-sm text-stone-500">{fullName || "Responsable"}</p>
          </div>
        </div>

        <div
          className="mt-5 rounded-2xl px-4 py-3 text-sm font-medium text-white"
          style={{ backgroundColor: themeColor || "#0f766e" }}
        >
          Color principal de tu tienda
        </div>

        <p className="mt-4 text-sm leading-6 text-stone-600">
          {storeDescription ||
            "Tu descripción aparecerá aquí para ayudar a compradores a entender tu estilo, materiales y propuesta."}
        </p>
      </div>
    </aside>
  );
});

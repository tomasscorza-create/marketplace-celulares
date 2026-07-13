import type { ReactNode } from "react";

import { memo } from "react";

import { ColorSwatchPicker } from "./ColorSwatchPicker";

type ArtisanStoreFormSectionProps = {
  errorMessage: string | null;
  fullName: string;
  isSaving: boolean;
  onFullNameChange: (value: string) => void;
  onStoreDescriptionChange: (value: string) => void;
  onStoreNameChange: (value: string) => void;
  onThemeColorChange: (value: string) => void;
  profileImageSection: ReactNode;
  statusMessage: string | null;
  storeDescription: string;
  storeName: string;
  themeColor: string;
};

export const ArtisanStoreFormSection = memo(function ArtisanStoreFormSection({
  errorMessage,
  fullName,
  isSaving,
  onFullNameChange,
  onStoreDescriptionChange,
  onStoreNameChange,
  onThemeColorChange,
  profileImageSection,
  statusMessage,
  storeDescription,
  storeName,
  themeColor,
}: ArtisanStoreFormSectionProps) {
  return (
    <div className="grid gap-4 rounded-3xl border border-brand-100 bg-white p-5 shadow-sm sm:p-6">
      <label className="grid gap-2 text-sm font-medium text-stone-700">
        Nombre del responsable
        <input
          autoComplete="name"
          className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-brand-300"
          onChange={(event) => {
            onFullNameChange(event.target.value);
          }}
          placeholder="Tu nombre o responsable de la cuenta"
          type="text"
          value={fullName}
        />
      </label>

      <label className="grid gap-2 text-sm font-medium text-stone-700">
        Nombre de la tienda
        <input
          autoComplete="organization"
          className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-brand-300"
          onChange={(event) => {
            onStoreNameChange(event.target.value);
          }}
          placeholder="Ej. Taller del Monte"
          type="text"
          value={storeName}
        />
      </label>

      <label className="grid gap-2 text-sm font-medium text-stone-700">
        Descripción de la tienda
        <textarea
          className="min-h-36 rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-brand-300"
          onChange={(event) => {
            onStoreDescriptionChange(event.target.value);
          }}
          placeholder="Cuenta que haces, en que materiales trabajas y que vuelve especial tu propuesta."
          value={storeDescription}
        />
      </label>

      {profileImageSection}

      <div className="grid gap-2">
        <span className="text-sm font-medium text-stone-700">Color principal</span>
        <ColorSwatchPicker onChange={onThemeColorChange} value={themeColor} />
      </div>

      {statusMessage ? (
        <p className="rounded-2xl border border-brand-500 bg-brand-50 px-4 py-3 text-sm text-brand-500">
          {statusMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-2xl border border-brand-500 bg-brand-100 px-4 py-3 text-sm text-brand-500">
          {errorMessage}
        </p>
      ) : null}

      <button
        className="inline-flex w-full justify-center rounded-full bg-brand-500 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-fit"
        disabled={isSaving}
        type="submit"
      >
        {isSaving ? "Guardando..." : "Guardar tienda"}
      </button>
    </div>
  );
});

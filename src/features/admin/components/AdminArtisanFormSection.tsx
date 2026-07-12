import type { ReactNode } from "react";
import type {
  AdminArtisanProfileInput,
  AdminArtisanProfileUpdateInput,
} from "../../../types/admin";

import { getActionButtonClassName } from "../../../components/ActionButton";
import {
  fieldErrorClassName,
  fieldHintClassName,
  fieldMetaClassName,
  getTextInputClassName,
  getTextareaClassName,
} from "../../../lib/forms/fieldStyles";
import type { FieldErrors } from "../../../lib/forms/validation";

export type AdminArtisanFormField =
  | "full_name"
  | "email"
  | "password"
  | "store_name"
  | "store_description";

export type AdminArtisanFormErrors = FieldErrors<AdminArtisanFormField>;

type AdminArtisanFormSectionProps = {
  artisanForm: AdminArtisanProfileInput | AdminArtisanProfileUpdateInput;
  editingArtisanId: string | null;
  errorMessage: string | null;
  fieldErrors: AdminArtisanFormErrors;
  isSaving: boolean;
  onCancel: () => void;
  onChange: <TKey extends keyof AdminArtisanProfileUpdateInput>(
    field: TKey,
    value: AdminArtisanProfileUpdateInput[TKey],
  ) => void;
  onFieldBlur: (field: AdminArtisanFormField) => void;
  profileImageSection: ReactNode;
  statusMessage: string | null;
};

export function AdminArtisanFormSection({
  artisanForm,
  editingArtisanId,
  errorMessage,
  fieldErrors,
  isSaving,
  onCancel,
  onChange,
  onFieldBlur,
  profileImageSection,
  statusMessage,
}: AdminArtisanFormSectionProps) {
  return (
    <div className="grid gap-4 rounded-3xl border border-ocean-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-stone-900">
            {editingArtisanId ? "Editar cuenta vendedora" : "Crear cuenta vendedora"}
          </h2>
        </div>

        {editingArtisanId ? (
          <button
            className={getActionButtonClassName({ size: "sm", variant: "ghost" })}
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
        ) : null}
      </div>

      <label className="grid gap-2 text-sm font-medium text-stone-700">
        <span className="flex items-center gap-2">
          Nombre
          <span className={fieldMetaClassName}>Obligatorio</span>
        </span>
        <input
          aria-describedby={fieldErrors.full_name ? "admin-artisan-name-error" : undefined}
          aria-invalid={Boolean(fieldErrors.full_name)}
          className={getTextInputClassName(Boolean(fieldErrors.full_name))}
          onBlur={() => {
            onFieldBlur("full_name");
          }}
          onChange={(event) => {
            onChange("full_name", event.target.value);
          }}
          placeholder="Ej. Martina Diaz"
          type="text"
          value={artisanForm.full_name}
        />
        {fieldErrors.full_name ? (
          <span className={fieldErrorClassName} id="admin-artisan-name-error">
            {fieldErrors.full_name}
          </span>
        ) : null}
      </label>

      <label className="grid gap-2 text-sm font-medium text-stone-700">
        <span className="flex items-center gap-2">
          Mail
          <span className={fieldMetaClassName}>Obligatorio</span>
        </span>
        <input
          aria-describedby={fieldErrors.email ? "admin-artisan-email-error" : undefined}
          aria-invalid={Boolean(fieldErrors.email)}
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          className={getTextInputClassName(Boolean(fieldErrors.email))}
          inputMode="email"
          onBlur={() => {
            onFieldBlur("email");
          }}
          onChange={(event) => {
            onChange("email", event.target.value);
          }}
          placeholder="vendedor@correo.com"
          type="email"
          value={artisanForm.email}
        />
        {fieldErrors.email ? (
          <span className={fieldErrorClassName} id="admin-artisan-email-error">
            {fieldErrors.email}
          </span>
        ) : null}
      </label>

      <label className="grid gap-2 text-sm font-medium text-stone-700">
        <span className="flex items-center gap-2">
          {editingArtisanId ? "Nueva contrasena" : "Contrasena inicial"}
          <span className={fieldMetaClassName}>
            {editingArtisanId ? "Opcional" : "Obligatorio"}
          </span>
        </span>
        <input
          aria-describedby={fieldErrors.password ? "admin-artisan-password-error" : "admin-artisan-password-hint"}
          aria-invalid={Boolean(fieldErrors.password)}
          autoComplete={editingArtisanId ? "new-password" : "off"}
          className={getTextInputClassName(Boolean(fieldErrors.password))}
          onBlur={() => {
            onFieldBlur("password");
          }}
          onChange={(event) => {
            onChange("password", event.target.value);
          }}
          placeholder={editingArtisanId ? "Dejar vacia para mantener la actual" : "Minimo 8 caracteres"}
          type="password"
          value={artisanForm.password ?? ""}
        />
        {fieldErrors.password ? (
          <span className={fieldErrorClassName} id="admin-artisan-password-error">
            {fieldErrors.password}
          </span>
        ) : (
          <span className={fieldHintClassName} id="admin-artisan-password-hint">
            {editingArtisanId
              ? "Solo completala si queres reemplazar la contrasena actual."
              : "Se crea con la contrasena generica Admindeventa."}
          </span>
        )}
      </label>

      <label className="grid gap-2 text-sm font-medium text-stone-700">
        <span className="flex items-center gap-2">
          Nombre de tienda
          <span className={fieldMetaClassName}>Opcional</span>
        </span>
        <input
          aria-describedby={fieldErrors.store_name ? "admin-artisan-store-name-error" : undefined}
          aria-invalid={Boolean(fieldErrors.store_name)}
          className={getTextInputClassName(Boolean(fieldErrors.store_name))}
          onBlur={() => {
            onFieldBlur("store_name");
          }}
          onChange={(event) => {
            onChange("store_name", event.target.value);
          }}
          placeholder="Ej. Ceramica Guemes"
          type="text"
          value={artisanForm.store_name}
        />
        {fieldErrors.store_name ? (
          <span className={fieldErrorClassName} id="admin-artisan-store-name-error">
            {fieldErrors.store_name}
          </span>
        ) : null}
      </label>

      <label className="grid gap-2 text-sm font-medium text-stone-700">
        <span className="flex items-center gap-2">
          Descripcion breve
          <span className={fieldMetaClassName}>Opcional</span>
        </span>
        <textarea
          aria-describedby={fieldErrors.store_description ? "admin-artisan-description-error" : "admin-artisan-description-hint"}
          aria-invalid={Boolean(fieldErrors.store_description)}
          className={`${getTextareaClassName(Boolean(fieldErrors.store_description))} min-h-28`}
          onBlur={() => {
            onFieldBlur("store_description");
          }}
          onChange={(event) => {
            onChange("store_description", event.target.value);
          }}
          placeholder="Conta en pocas lineas que vende este perfil."
          value={artisanForm.store_description}
        />
        {fieldErrors.store_description ? (
          <span className={fieldErrorClassName} id="admin-artisan-description-error">
            {fieldErrors.store_description}
          </span>
        ) : (
          <span className={fieldHintClassName} id="admin-artisan-description-hint">
            Ayuda a identificar rapido la tienda dentro del panel y en la vista publica.
          </span>
        )}
      </label>

      <div className="grid gap-4 sm:grid-cols-[0.8fr_0.2fr]">
        <div className="min-w-0">{profileImageSection}</div>

        <label className="grid gap-2 text-sm font-medium text-stone-700">
          <span className="flex items-center gap-2">
            Color
            <span className={fieldMetaClassName}>Opcional</span>
          </span>
          <input
            className="h-[50px] w-full rounded-xl border border-stone-300 bg-white p-2"
            onChange={(event) => {
              onChange("storefront_theme_color", event.target.value);
            }}
            type="color"
            value={artisanForm.storefront_theme_color}
          />
        </label>
      </div>

      {statusMessage ? (
        <p className="rounded-2xl border border-sun-300 bg-sun-50 px-4 py-3 text-sm text-brand-700">
          {statusMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <button
        className={`${getActionButtonClassName({ fullWidth: true, variant: "primary" })} sm:w-fit`}
        disabled={isSaving}
        type="submit"
      >
        {isSaving
          ? editingArtisanId
            ? "Guardando cuenta..."
            : "Creando cuenta..."
          : editingArtisanId
            ? "Guardar cuenta"
            : "Crear cuenta"}
      </button>
    </div>
  );
}

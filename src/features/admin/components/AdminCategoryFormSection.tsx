import type { AdminCategoryInput } from "../../../types/admin";

import { getActionButtonClassName } from "../../../components/ActionButton";
import {
  fieldErrorClassName,
  fieldHintClassName,
  fieldMetaClassName,
  getTextInputClassName,
} from "../../../lib/forms/fieldStyles";
import type { FieldErrors } from "../../../lib/forms/validation";

export type AdminCategoryFormField = "name" | "slug";
export type AdminCategoryFormErrors = FieldErrors<AdminCategoryFormField>;

type AdminCategoryFormSectionProps = {
  categoryForm: AdminCategoryInput;
  editingCategoryId: string | null;
  errorMessage: string | null;
  fieldErrors: AdminCategoryFormErrors;
  isSaving: boolean;
  onCancel: () => void;
  onFieldBlur: (field: AdminCategoryFormField) => void;
  onNameChange: (value: string) => void;
  onRegenerateSku: () => void;
  onToggleActive: (value: boolean) => void;
  statusMessage: string | null;
};

export function AdminCategoryFormSection({
  categoryForm,
  editingCategoryId,
  errorMessage,
  fieldErrors,
  isSaving,
  onCancel,
  onFieldBlur,
  onNameChange,
  onRegenerateSku,
  onToggleActive,
  statusMessage,
}: AdminCategoryFormSectionProps) {
  return (
    <div className="grid gap-4 rounded-3xl border border-ocean-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-stone-900">
            {editingCategoryId ? "Editar categoria" : "Nueva categoria"}
          </h2>
        </div>

        {editingCategoryId ? (
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
          aria-describedby={fieldErrors.name ? "admin-category-name-error" : undefined}
          aria-invalid={Boolean(fieldErrors.name)}
          className={getTextInputClassName(Boolean(fieldErrors.name))}
          onBlur={() => {
            onFieldBlur("name");
          }}
          onChange={(event) => {
            onNameChange(event.target.value);
          }}
          placeholder="Ej. Mates"
          type="text"
          value={categoryForm.name}
        />
        {fieldErrors.name ? (
          <span className={fieldErrorClassName} id="admin-category-name-error">
            {fieldErrors.name}
          </span>
        ) : null}
      </label>

      <label className="grid gap-2 text-sm font-medium text-stone-700">
        <span className="flex items-center gap-2">
          SKU
          <span className={fieldMetaClassName}>Obligatorio</span>
        </span>
        <div className="flex items-center gap-3 rounded-xl border border-stone-300 bg-white px-4 py-3">
          <input
            aria-describedby={fieldErrors.slug ? "admin-category-slug-error" : "admin-category-slug-hint"}
            aria-invalid={Boolean(fieldErrors.slug)}
            className="flex-1 bg-transparent text-sm text-stone-900 outline-none"
            onBlur={() => {
              onFieldBlur("slug");
            }}
            placeholder="MA001"
            readOnly
            type="text"
            value={categoryForm.slug}
          />
          <button
            className={getActionButtonClassName({ size: "sm", variant: "ghost" })}
            onClick={onRegenerateSku}
            type="button"
          >
            Regenerar
          </button>
        </div>
        {fieldErrors.slug ? (
          <span className={fieldErrorClassName} id="admin-category-slug-error">
            {fieldErrors.slug}
          </span>
        ) : (
          <span className={fieldHintClassName} id="admin-category-slug-hint">
            Se genera automaticamente y sirve para ordenar la categoria en el sistema.
          </span>
        )}
      </label>

      <label className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
        <input
          checked={categoryForm.is_active}
          className="h-4 w-4 accent-ocean-600"
          onChange={(event) => {
            onToggleActive(event.target.checked);
          }}
          type="checkbox"
        />
        Categoria activa y visible para uso de vendedores
      </label>

      {statusMessage ? (
        <p className="rounded-2xl border border-brand-300 bg-brand-50 px-4 py-3 text-sm text-brand-700">
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
          ? editingCategoryId
            ? "Guardando cambios..."
            : "Creando categoria..."
          : editingCategoryId
            ? "Guardar cambios"
            : "Crear categoria"}
      </button>
    </div>
  );
}

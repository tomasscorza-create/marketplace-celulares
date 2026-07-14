import { useEffect, useState } from "react";

import { getActionButtonClassName } from "../../../components/ActionButton";
import type { AdminCategorySpecTemplateField } from "../../../types/admin";

type AdminCategorySpecTemplateSectionProps = {
  categoryId: string;
  categoryName: string;
  isLoading: boolean;
  isSaving: boolean;
  onSave: (fieldLabels: string[]) => Promise<void>;
  template: AdminCategorySpecTemplateField[];
};

export function AdminCategorySpecTemplateSection({
  categoryId,
  categoryName,
  isLoading,
  isSaving,
  onSave,
  template,
}: AdminCategorySpecTemplateSectionProps) {
  const [fieldLabels, setFieldLabels] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setFieldLabels(template.map((field) => field.field_label));
    setStatusMessage(null);
    setErrorMessage(null);
  }, [categoryId, template]);

  const moveField = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= fieldLabels.length) {
      return;
    }

    setFieldLabels((current) => {
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);

      return next;
    });
  };

  const handleSave = async () => {
    setStatusMessage(null);
    setErrorMessage(null);

    const trimmedLabels = fieldLabels.map((label) => label.trim()).filter((label) => label.length > 0);
    const seenLabels = new Set<string>();
    const duplicateLabels = new Set<string>();

    for (const label of trimmedLabels) {
      if (seenLabels.has(label)) {
        duplicateLabels.add(label);
      }

      seenLabels.add(label);
    }

    if (duplicateLabels.size > 0) {
      setErrorMessage(
        `Hay campos repetidos: ${[...duplicateLabels].join(", ")}. Cambiá el nombre para que cada campo sea único.`,
      );
      return;
    }

    try {
      await onSave(fieldLabels);
      setStatusMessage("Plantilla de especificaciones guardada.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No pudimos guardar la plantilla de especificaciones.",
      );
    }
  };

  return (
    <section className="grid gap-4 rounded-3xl border border-stone-200 bg-stone-50/80 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-stone-900">
            Especificaciones de {categoryName}
          </p>
          <p className="text-sm text-stone-500">
            Define los campos (ej. RAM, Memoria) que los vendedores completaran
            al cargar un producto de esta categoria.
          </p>
        </div>

        <button
          className={getActionButtonClassName({ size: "sm", variant: "ghost" })}
          disabled={isLoading || isSaving}
          onClick={() => {
            setFieldLabels((current) => [...current, ""]);
          }}
          type="button"
        >
          Agregar campo
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-stone-500">Cargando plantilla...</p>
      ) : (
        <div className="grid gap-3">
          {fieldLabels.map((label, index) => (
            <div
              key={index}
              className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-2 rounded-2xl border border-stone-200 bg-white p-3"
            >
              <input
                className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none transition focus:border-brand-300 disabled:opacity-60"
                disabled={isSaving}
                onChange={(event) => {
                  const nextValue = event.target.value;

                  setFieldLabels((current) =>
                    current.map((entry, entryIndex) =>
                      entryIndex === index ? nextValue : entry,
                    ),
                  );
                }}
                placeholder="Ej. RAM"
                type="text"
                value={label}
              />

              <button
                className="rounded-full border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 disabled:opacity-40"
                disabled={isSaving || index === 0}
                onClick={() => {
                  moveField(index, -1);
                }}
                type="button"
              >
                ↑
              </button>

              <button
                className="rounded-full border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 disabled:opacity-40"
                disabled={isSaving || index === fieldLabels.length - 1}
                onClick={() => {
                  moveField(index, 1);
                }}
                type="button"
              >
                ↓
              </button>

              <button
                className="rounded-full border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 disabled:opacity-40"
                disabled={isSaving}
                onClick={() => {
                  setFieldLabels((current) =>
                    current.filter((_entry, entryIndex) => entryIndex !== index),
                  );
                }}
                type="button"
              >
                Quitar
              </button>
            </div>
          ))}

          {fieldLabels.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-stone-300 bg-white/80 p-4 text-sm text-stone-500">
              Esta categoria todavia no tiene campos de especificaciones.
            </p>
          ) : null}
        </div>
      )}

      {errorMessage ? <p className="text-sm text-rose-600">{errorMessage}</p> : null}
      {statusMessage ? <p className="text-sm text-emerald-600">{statusMessage}</p> : null}

      <div>
        <button
          className={getActionButtonClassName({ size: "sm", variant: "primary" })}
          disabled={isSaving || isLoading}
          onClick={() => {
            void handleSave();
          }}
          type="button"
        >
          {isSaving ? "Guardando..." : "Guardar plantilla"}
        </button>
      </div>
    </section>
  );
}

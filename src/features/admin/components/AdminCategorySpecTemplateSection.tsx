import { useEffect, useState } from "react";

import { getActionButtonClassName } from "../../../components/ActionButton";
import type { AdminCategorySpecTemplateField } from "../../../types/admin";
import { MAX_CATEGORY_SPEC_FIELDS } from "../../../types/categorySpecs";
import {
  countProductsByCategorySpecLabels,
  type CategorySpecFieldUsage,
} from "../../categorySpecs/categorySpecsClient";

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
  const [isCheckingUsage, setIsCheckingUsage] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<CategorySpecFieldUsage[] | null>(null);
  const canAddMoreFields = fieldLabels.length < MAX_CATEGORY_SPEC_FIELDS;
  const isBusy = isSaving || isCheckingUsage;

  useEffect(() => {
    setFieldLabels(template.map((field) => field.field_label));
    setStatusMessage(null);
    setErrorMessage(null);
    setPendingRemoval(null);
  }, [categoryId, template]);

  const editFields = (updater: (current: string[]) => string[]) => {
    setFieldLabels(updater);
    setPendingRemoval(null);
  };

  const moveField = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= fieldLabels.length) {
      return;
    }

    editFields((current) => {
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

    if (!pendingRemoval) {
      const removedLabels = template
        .map((field) => field.field_label)
        .filter((label) => !trimmedLabels.includes(label));

      if (removedLabels.length > 0) {
        setIsCheckingUsage(true);

        try {
          const response = await countProductsByCategorySpecLabels(categoryId, removedLabels);

          if (response.error) {
            throw new Error(
              response.error.message || "No pudimos revisar si hay productos usando estos campos.",
            );
          }

          const affected = (response.data ?? []).filter((usage) => usage.product_count > 0);

          if (affected.length > 0) {
            setPendingRemoval(affected);
            return;
          }
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "No pudimos revisar si hay productos usando estos campos.",
          );
          return;
        } finally {
          setIsCheckingUsage(false);
        }
      }
    }

    try {
      await onSave(fieldLabels);
      setStatusMessage("Plantilla de especificaciones guardada.");
      setPendingRemoval(null);
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
          <p className="text-xs text-stone-400">
            {fieldLabels.length}/{MAX_CATEGORY_SPEC_FIELDS} campos
          </p>
        </div>

        <button
          className={getActionButtonClassName({ size: "sm", variant: "ghost" })}
          disabled={isLoading || isBusy || !canAddMoreFields}
          onClick={() => {
            editFields((current) => [...current, ""]);
          }}
          type="button"
        >
          Agregar campo
        </button>
      </div>

      {!canAddMoreFields ? (
        <p className="text-xs text-stone-500">
          Llegaste al máximo de {MAX_CATEGORY_SPEC_FIELDS} campos por categoría. Quitá alguno para agregar otro.
        </p>
      ) : null}

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
                disabled={isBusy}
                onChange={(event) => {
                  const nextValue = event.target.value;

                  editFields((current) =>
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
                disabled={isBusy || index === 0}
                onClick={() => {
                  moveField(index, -1);
                }}
                type="button"
              >
                ↑
              </button>

              <button
                className="rounded-full border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 disabled:opacity-40"
                disabled={isBusy || index === fieldLabels.length - 1}
                onClick={() => {
                  moveField(index, 1);
                }}
                type="button"
              >
                ↓
              </button>

              <button
                className="rounded-full border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 disabled:opacity-40"
                disabled={isBusy}
                onClick={() => {
                  editFields((current) =>
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

      {pendingRemoval ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Esto va a afectar productos ya publicados</p>
          <ul className="mt-2 list-disc pl-5">
            {pendingRemoval.map((usage) => (
              <li key={usage.field_label}>
                "{usage.field_label}": {usage.product_count}{" "}
                {usage.product_count === 1 ? "producto" : "productos"}
              </li>
            ))}
          </ul>
          <p className="mt-2">
            Esos productos van a dejar de mostrar ese campo para editar, pero el detalle
            público va a seguir mostrando el valor que ya tenían cargado.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className={getActionButtonClassName({ size: "sm", variant: "ghost" })}
              disabled={isSaving}
              onClick={() => {
                setPendingRemoval(null);
              }}
              type="button"
            >
              Cancelar
            </button>
            <button
              className={getActionButtonClassName({ size: "sm", variant: "primary" })}
              disabled={isSaving}
              onClick={() => {
                void handleSave();
              }}
              type="button"
            >
              {isSaving ? "Guardando..." : "Guardar de todas formas"}
            </button>
          </div>
        </div>
      ) : null}

      {errorMessage ? <p className="text-sm text-rose-600">{errorMessage}</p> : null}
      {statusMessage ? <p className="text-sm text-emerald-600">{statusMessage}</p> : null}

      {pendingRemoval ? null : (
        <div>
          <button
            className={getActionButtonClassName({ size: "sm", variant: "primary" })}
            disabled={isBusy || isLoading}
            onClick={() => {
              void handleSave();
            }}
            type="button"
          >
            {isCheckingUsage ? "Revisando..." : isSaving ? "Guardando..." : "Guardar plantilla"}
          </button>
        </div>
      )}
    </section>
  );
}

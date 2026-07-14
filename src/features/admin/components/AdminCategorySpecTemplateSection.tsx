import { useEffect, useRef, useState } from "react";

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
  const [draftInput, setDraftInput] = useState("");
  const [quickAddHint, setQuickAddHint] = useState<string | null>(null);
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCheckingUsage, setIsCheckingUsage] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<CategorySpecFieldUsage[] | null>(null);
  const canAddMoreFields = fieldLabels.length < MAX_CATEGORY_SPEC_FIELDS;
  const isBusy = isSaving || isCheckingUsage;
  // Sólo sincroniza fieldLabels desde el servidor una vez por categoría (al
  // cargar). Un refetch en segundo plano (foco de ventana, invalidación tras
  // guardar) no debe pisar ediciones locales todavía no guardadas.
  const syncedCategoryIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading || syncedCategoryIdRef.current === categoryId) {
      return;
    }

    syncedCategoryIdRef.current = categoryId;
    setFieldLabels(template.map((field) => field.field_label));
    setDraftInput("");
    setQuickAddHint(null);
    setStatusMessage(null);
    setErrorMessage(null);
    setPendingRemoval(null);
  }, [categoryId, isLoading, template]);

  const editFields = (updater: (current: string[]) => string[]) => {
    setFieldLabels(updater);
    setPendingRemoval(null);
  };

  const commitLabels = (rawText: string) => {
    const candidates = rawText
      .split(/[,\n]/)
      .map((piece) => piece.trim())
      .filter((piece) => piece.length > 0);

    if (candidates.length === 0) {
      return;
    }

    let skippedDuplicate = false;
    let skippedLimit = false;

    editFields((current) => {
      const next = [...current];
      const existingLower = new Set(next.map((label) => label.trim().toLowerCase()));

      for (const candidate of candidates) {
        if (next.length >= MAX_CATEGORY_SPEC_FIELDS) {
          skippedLimit = true;
          break;
        }

        const lower = candidate.toLowerCase();

        if (existingLower.has(lower)) {
          skippedDuplicate = true;
          continue;
        }

        next.push(candidate);
        existingLower.add(lower);
      }

      return next;
    });

    if (skippedLimit) {
      setQuickAddHint(`Llegaste al máximo de ${MAX_CATEGORY_SPEC_FIELDS} campos.`);
    } else if (skippedDuplicate) {
      setQuickAddHint("Algún campo ya existía y no se agregó de nuevo.");
    } else {
      setQuickAddHint(null);
    }
  };

  const reorderField = (sourceIndex: number, targetIndex: number) => {
    if (sourceIndex === targetIndex) {
      return;
    }

    editFields((current) => {
      if (sourceIndex < 0 || sourceIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
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
      <div className="space-y-1">
        <p className="text-sm font-semibold text-stone-900">
          Especificaciones de {categoryName}
        </p>
        <p className="text-sm text-stone-500">
          Escribí un campo y presioná Enter (ej. RAM). Podés pegar varios
          separados por coma para cargarlos todos de una vez.
        </p>
        <p className="text-xs text-stone-400">
          {fieldLabels.length}/{MAX_CATEGORY_SPEC_FIELDS} campos
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-stone-500">Cargando plantilla...</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {fieldLabels.map((label, index) => (
              <div
                key={index}
                className={[
                  "flex items-center gap-0.5 rounded-full border bg-white py-1 pl-1 pr-1.5 transition-colors",
                  dragOverIndex === index && dragSourceIndex !== null && dragSourceIndex !== index
                    ? "border-brand-300 bg-brand-50"
                    : "border-stone-200",
                ].join(" ")}
                onDragOver={(event) => {
                  if (dragSourceIndex === null || isBusy) {
                    return;
                  }

                  event.preventDefault();
                  setDragOverIndex(index);
                }}
                onDrop={(event) => {
                  event.preventDefault();

                  if (dragSourceIndex !== null) {
                    reorderField(dragSourceIndex, index);
                  }

                  setDragSourceIndex(null);
                  setDragOverIndex(null);
                }}
              >
                <span
                  aria-label="Arrastrar para reordenar"
                  className={[
                    "select-none rounded-full px-1 text-xs leading-none text-stone-400",
                    isBusy ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing",
                  ].join(" ")}
                  draggable={!isBusy}
                  onDragEnd={() => {
                    setDragSourceIndex(null);
                    setDragOverIndex(null);
                  }}
                  onDragStart={(event) => {
                    setDragSourceIndex(index);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", String(index));
                  }}
                >
                  ⋮⋮
                </span>

                <input
                  className="min-w-0 bg-transparent px-1 py-0.5 text-sm text-stone-900 outline-none disabled:opacity-60"
                  disabled={isBusy}
                  onChange={(event) => {
                    const nextValue = event.target.value;

                    editFields((current) =>
                      current.map((entry, entryIndex) =>
                        entryIndex === index ? nextValue : entry,
                      ),
                    );
                  }}
                  style={{ width: `${Math.max(4, label.length + 2)}ch` }}
                  type="text"
                  value={label}
                />

                <button
                  aria-label={`Quitar ${label || "campo"}`}
                  className="rounded-full px-1.5 text-sm font-medium leading-none text-stone-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                  disabled={isBusy}
                  onClick={() => {
                    editFields((current) =>
                      current.filter((_entry, entryIndex) => entryIndex !== index),
                    );
                  }}
                  type="button"
                >
                  ×
                </button>
              </div>
            ))}

            {fieldLabels.length === 0 ? (
              <p className="text-sm text-stone-500">
                Todavía no hay campos. Escribí el primero abajo.
              </p>
            ) : null}
          </div>

          <div>
            <input
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none transition focus:border-brand-300 disabled:opacity-60"
              disabled={isBusy || !canAddMoreFields}
              onBlur={() => {
                if (draftInput.trim()) {
                  commitLabels(draftInput);
                  setDraftInput("");
                }
              }}
              onChange={(event) => {
                setDraftInput(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitLabels(draftInput);
                  setDraftInput("");
                }
              }}
              onPaste={(event) => {
                const pastedText = event.clipboardData.getData("text");

                if (/[,\n]/.test(pastedText)) {
                  event.preventDefault();
                  commitLabels(pastedText);
                  setDraftInput("");
                }
              }}
              placeholder={
                canAddMoreFields
                  ? "Ej. RAM (Enter para agregar, o pegá una lista separada por comas)"
                  : `Llegaste al máximo de ${MAX_CATEGORY_SPEC_FIELDS} campos.`
              }
              type="text"
              value={draftInput}
            />
            {quickAddHint ? <p className="mt-1 text-xs text-stone-500">{quickAddHint}</p> : null}
          </div>
        </>
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

import type { FormEvent } from "react";
import type { ArtisanProductInput } from "../../../types/artisan";
import type { CategorySpecTemplateField } from "../../../types/categorySpecs";
import type { ProductAttribute } from "../../../types/productAttributes";
import type { ProductOptionGroup } from "../../../types/productAvailability";
import type { ProductImageDraft } from "../imageEditorTypes";
import type { ArtisanProductLearningProfile } from "../artisanProductLearning";

import { useEffect, useRef, useState } from "react";
import {
  getProductAttributeValueSuggestions,
  MAX_PRODUCT_ATTRIBUTES,
  PRODUCT_ATTRIBUTE_SUGGESTIONS,
} from "../../../types/productAttributes";
import { ProductLearningPanel } from "./ProductLearningPanel";
import { ProductImagesField } from "./ProductImagesField";
import { ProductMadeToOrderOptionsField } from "./ProductMadeToOrderOptionsField";
import { ProductModel3DField } from "./ProductModel3DField";

type ArtisanProductFormSectionProps = {
  draftPersistenceState: "idle" | "saving" | "saved" | "error";
  categories: Array<{ id: string; name: string }>;
  categorySpecTemplate: CategorySpecTemplateField[];
  editingProductId: string | null;
  errorMessage: string | null;
  hasDraft: boolean;
  isCreateFocused: boolean;
  isLoading: boolean;
  isSaving: boolean;
  learningProfile: ArtisanProductLearningProfile | null;
  onAddAttribute: (initialKey?: string) => void;
  onAddAttributeValue: (key: string, value: string) => void;
  onAvailabilityModeChange: (
    value: ArtisanProductInput["availability_mode"],
  ) => void;
  onCancel: () => void;
  onCategoryChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onDiscardDraft: () => void;
  onDropImages: (files: FileList) => void;
  onLeadTimeDaysChange: (value: number | null) => void;
  onOpenEditor: (index: number) => void;
  onPriceChange: (value: number) => void;
  onProductModel3DFileChange: (file: File | null) => void;
  onRemoveAttribute: (index: number) => void;
  onRemoveAttributeGroup: (key: string) => void;
  onRenameAttributeKey: (oldKey: string, newKey: string) => void;
  onRemoveImage: (index: number) => void;
  onRemoveModel3D: () => void;
  onSetPrimaryImage: (index: number) => void;
  onStockQuantityChange: (value: number | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTitleChange: (value: string) => void;
  onToggleActive: (value: boolean) => void;
  onTriggerBulkImagePicker: () => void;
  onTriggerImagePicker: (index: number) => void;
  onUpdateMadeToOrderOptions: (options: ProductOptionGroup[]) => void;
  onUpdateAttribute: (
    index: number,
    field: keyof ProductAttribute,
    value: string,
  ) => void;
  onUpdateCategorySpecValue: (label: string, value: string) => void;
  productForm: ArtisanProductInput;
  productImages: ProductImageDraft[];
  productModel3DFile: File | null;
  statusMessage: string | null;
  uploadStatus: string | null;
};

export function ArtisanProductFormSection({
  draftPersistenceState,
  categories,
  categorySpecTemplate,
  editingProductId,
  errorMessage,
  hasDraft,
  isCreateFocused,
  isLoading,
  isSaving,
  learningProfile,
  onAddAttribute,
  onAddAttributeValue,
  onAvailabilityModeChange,
  onCancel,
  onCategoryChange,
  onDescriptionChange,
  onDiscardDraft,
  onDropImages,
  onLeadTimeDaysChange,
  onOpenEditor,
  onPriceChange,
  onProductModel3DFileChange,
  onRemoveAttribute,
  onRemoveAttributeGroup,
  onRenameAttributeKey,
  onRemoveImage,
  onRemoveModel3D,
  onSetPrimaryImage,
  onStockQuantityChange,
  onSubmit,
  onTitleChange,
  onToggleActive,
  onTriggerBulkImagePicker,
  onTriggerImagePicker,
  onUpdateMadeToOrderOptions,
  onUpdateAttribute,
  onUpdateCategorySpecValue,
  productForm,
  productImages,
  productModel3DFile,
  statusMessage,
  uploadStatus,
}: ArtisanProductFormSectionProps) {
  const isMadeToOrder = productForm.availability_mode === "made_to_order";
  const [isStockEditorOpen, setIsStockEditorOpen] = useState(false);
  const [attributeValueDraftByKey, setAttributeValueDraftByKey] = useState<Record<string, string>>({});
  const attributesListRef = useRef<HTMLDivElement | null>(null);
  const formTitle = editingProductId ? "Editar producto" : "Nuevo producto";
  const submitLabel = editingProductId ? "Guardar cambios" : "Crear producto";
  const showTopSummary = !isCreateFocused || Boolean(editingProductId);
  const canAddMoreAttributes = productForm.product_attributes.length < MAX_PRODUCT_ATTRIBUTES;
  const attributeGroups = (() => {
    const order: string[] = [];
    const entriesByKey = new Map<string, { index: number; value: string }[]>();

    productForm.product_attributes.forEach((attribute, index) => {
      if (!entriesByKey.has(attribute.key)) {
        entriesByKey.set(attribute.key, []);
        order.push(attribute.key);
      }

      entriesByKey.get(attribute.key)!.push({ index, value: attribute.value });
    });

    return order.map((key) => ({ entries: entriesByKey.get(key)!, key }));
  })();

  const commitAttributeGroupValues = (key: string, rawText: string, entries: { index: number; value: string }[]) => {
    const candidates = rawText
      .split(/[,\n]/)
      .map((piece) => piece.trim())
      .filter((piece) => piece.length > 0);

    if (candidates.length === 0) {
      return;
    }

    const existingLower = new Set(
      entries.map((entry) => entry.value.trim().toLowerCase()).filter((value) => value.length > 0),
    );
    let emptyEntryIndex = entries.find((entry) => entry.value.trim().length === 0)?.index ?? null;
    let remainingSlots = MAX_PRODUCT_ATTRIBUTES - productForm.product_attributes.length;

    for (const candidate of candidates) {
      const lower = candidate.toLowerCase();

      if (existingLower.has(lower)) {
        continue;
      }

      if (emptyEntryIndex !== null) {
        onUpdateAttribute(emptyEntryIndex, "value", candidate);
        emptyEntryIndex = null;
      } else {
        if (remainingSlots <= 0) {
          break;
        }

        onAddAttributeValue(key, candidate);
        remainingSlots -= 1;
      }

      existingLower.add(lower);
    }
  };
  const selectedCategoryName =
    categories.find((category) => category.id === productForm.category_id)?.name ??
    "esta categoria";
  const showDiscardDraftButton = hasDraft && !editingProductId;
  const showDraftStatusBadge =
    draftPersistenceState !== "idle" &&
    !(draftPersistenceState === "saved" && showDiscardDraftButton);

  useEffect(() => {
    if (isMadeToOrder) {
      setIsStockEditorOpen(false);
    }
  }, [isMadeToOrder]);

  useEffect(() => {
    if (
      !attributesListRef.current ||
      productForm.product_attributes.length <= 2
    ) {
      return;
    }

    attributesListRef.current.scrollTop =
      attributesListRef.current.scrollHeight;
  }, [productForm.product_attributes.length]);

  return (
    <form
      className="grid min-w-0 content-start gap-4 overflow-x-hidden rounded-3xl border border-brand-100 bg-white p-4 shadow-sm sm:p-6"
      onSubmit={onSubmit}
    >
      <section className="grid gap-4 rounded-3xl border border-stone-200 bg-gradient-to-b from-white to-stone-50 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-stone-900">
              {formTitle}
            </h2>
            <p className="text-sm leading-6 text-stone-500">
              {editingProductId
                ? "Ya estás editando este producto. Cambiá ficha, stock o fotos sin salir de esta pantalla."
                : isCreateFocused
                  ? "Completa los datos base, define el modo de venta, sube fotos y guarda."
                  : "Carga rapido, revisa todo en una sola vista y publica sin pasos innecesarios."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {showDraftStatusBadge ? (
              <span
                className={[
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
                  draftPersistenceState === "saved"
                    ? "bg-brand-50 text-ocean-600"
                    : draftPersistenceState === "saving"
                      ? "bg-stone-100 text-stone-600"
                      : "bg-[#FFF1EE] text-brand-500",
                ].join(" ")}
              >
                {draftPersistenceState === "saved"
                  ? "Borrador guardado"
                  : draftPersistenceState === "saving"
                    ? "Guardando borrador..."
                    : "No pudimos guardar el borrador"}
              </span>
            ) : null}

            {showDiscardDraftButton ? (
              <button
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-medium text-ocean-600 transition-colors hover:bg-ocean-100"
                onClick={onDiscardDraft}
                title="Descartar borrador"
                type="button"
              >
                Borrador guardado
                <span aria-hidden="true" className="text-ocean-400">
                  x
                </span>
              </button>
            ) : null}

            {editingProductId ? (
              <button
                className="rounded-full border border-ocean-100 px-4 py-2 text-sm font-medium text-ocean-500 transition-colors hover:bg-ocean-50"
                onClick={onCancel}
                type="button"
              >
                Cancelar
              </button>
            ) : null}
          </div>
        </div>

        {showTopSummary ? (
          <div className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
              <p className="text-sm font-semibold text-stone-900">
                Resumen rapido
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-stone-600">
                <span className="rounded-full bg-white px-2.5 py-1">
                  "Producto simple"
                </span>
                <span className="rounded-full bg-white px-2.5 py-1">
                  {productImages.length}{" "}
                  {productImages.length === 1 ? "foto" : "fotos"}
                </span>
                <span className="rounded-full bg-white px-2.5 py-1">
                  ${Number(productForm.price || 0).toLocaleString("es-AR")}
                </span>
                <span className="rounded-full bg-white px-2.5 py-1">
                  {productForm.category_id
                    ? "Categoría lista"
                    : "Sin categoría"}
                </span>
              </div>
              <p className="text-xs leading-5 text-stone-500">
                "Esta vista está pensada para completar una ficha común
                con el menor esfuerzo posible."
              </p>
          </div>
        ) : null}
      </section>

      <ProductLearningPanel
        currentTitle={productForm.title}
        learningProfile={learningProfile}
        onTitleSuggestionApply={onTitleChange}
      />

      {!isLoading && categories.length === 0 ? (
        <p className="rounded-2xl border border-brand-500 bg-brand-50 px-4 py-3 text-sm text-brand-500">
          No hay categorías disponibles en este momento. Cuando el equipo las
          active, vas a poder publicar.
        </p>
      ) : null}

      <section className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-stone-900">Datos base</p>
          <p className="text-sm text-stone-500">
            Completá una sola vez la información principal de esta ficha.
          </p>
        </div>

        <label className="grid gap-2 text-sm font-medium text-stone-700">
          Titulo
          <input
            className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-brand-300"
            onChange={(event) => {
              onTitleChange(event.target.value);
            }}
            placeholder="Ej. Mate de ceramica esmaltado"

            type="text"
            value={productForm.title}
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-stone-700">
          Descripcion
          <textarea
            className="min-h-28 rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-brand-300"
            onChange={(event) => {
              onDescriptionChange(event.target.value);
            }}
            placeholder="Materiales, terminacion, tecnica, uso recomendado o detalles de la pieza."
            value={productForm.description}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-stone-700">
            Precio base
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-stone-400">
                $
              </span>
              <input
                className="w-full rounded-xl border border-stone-300 bg-white py-3 pl-7 pr-4 text-sm text-stone-900 outline-none transition focus:border-brand-300"
                inputMode="decimal"
                min="0"
                onChange={(event) => {
                  onPriceChange(Number(event.target.value));
                }}
                placeholder="0"
                step="0.01"
                type="number"
                value={productForm.price || ""}
              />
            </div>
          </label>

          <label className="grid gap-2 text-sm font-medium text-stone-700">
            Categoria
            <select
              className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-brand-300"
              disabled={categories.length === 0}
              onChange={(event) => {
                onCategoryChange(event.target.value);
              }}
              value={productForm.category_id}
            >
              {categories.length === 0 ? (
                <option value="">Sin categorías activas</option>
              ) : null}
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {categorySpecTemplate.length > 0 ? (
        <section className="grid gap-4 rounded-3xl border border-stone-200 bg-stone-50/80 p-4 sm:p-5">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-stone-900">
              Especificaciones de {selectedCategoryName}
            </p>
            <p className="text-sm text-stone-500">
              Completa los datos tecnicos definidos para esta categoria.
            </p>
          </div>

          <div className="grid gap-3">
            {categorySpecTemplate.map((field) => {
              const currentValue =
                productForm.category_spec_values.find(
                  (entry) => entry.label === field.field_label,
                )?.value ?? "";

              return (
                <label
                  key={field.id}
                  className="grid gap-2 text-sm font-medium text-stone-700"
                >
                  {field.field_label}
                  <input
                    className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-brand-300"
                    onChange={(event) => {
                      onUpdateCategorySpecValue(field.field_label, event.target.value);
                    }}
                    placeholder={`Ej. ${field.field_label}`}
                    type="text"
                    value={currentValue}
                  />
                </label>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 rounded-3xl border border-stone-200 bg-stone-50/80 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-stone-900">Atributos</p>
            <p className="text-sm text-stone-500">
              Guarda datos extra reutilizables para ordenar, categorizar y
              personalizar mejor.
            </p>
          </div>

          <button
            className={[
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              canAddMoreAttributes
                ? "border border-ocean-100 bg-white text-ocean-600 hover:bg-ocean-50"
                : "border border-stone-200 bg-stone-100 text-stone-400",
            ].join(" ")}
            disabled={!canAddMoreAttributes}
            onClick={() => {
              onAddAttribute();
            }}
            type="button"
          >
            Agregar atributo
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRODUCT_ATTRIBUTE_SUGGESTIONS.map((suggestion) => {
            const alreadyUsed = productForm.product_attributes.some(
              (attribute) => attribute.key.trim().toLowerCase() === suggestion,
            );

            return (
              <button
                key={suggestion}
                className={[
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  alreadyUsed || !canAddMoreAttributes
                    ? "border border-stone-200 bg-stone-100 text-stone-400"
                    : "border border-brand-100 bg-white text-brand-500 hover:bg-brand-50",
                ].join(" ")}
                disabled={alreadyUsed || !canAddMoreAttributes}
                onClick={() => {
                  onAddAttribute(suggestion);
                }}
                type="button"
              >
                {suggestion}
              </button>
            );
          })}
        </div>

        {attributeGroups.length > 0 ? (
          <div
            className={[
              "grid gap-3",
              productForm.product_attributes.length > 2
                ? "max-h-[24rem] overflow-y-auto pr-1.5"
                : "",
            ].join(" ")}
            ref={attributesListRef}
          >
            {attributeGroups.map(({ entries, key }) => {
              const valueSuggestions = getProductAttributeValueSuggestions(key);
              const draftValue = attributeValueDraftByKey[key] ?? "";
              const groupCanAddMore =
                canAddMoreAttributes || entries.some((entry) => entry.value.trim().length === 0);

              return (
                <div
                  key={key}
                  className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-3"
                >
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,0.8fr)_auto] sm:items-end">
                    <label className="grid gap-2 text-sm font-medium text-stone-700">
                      Atributo
                      <input
                        className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-brand-300"
                        onChange={(event) => {
                          onRenameAttributeKey(key, event.target.value);
                        }}
                        placeholder="Ej. material"
                        type="text"
                        value={key}
                      />
                    </label>

                    <button
                      className="rounded-full border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100"
                      onClick={() => {
                        onRemoveAttributeGroup(key);
                      }}
                      type="button"
                    >
                      Quitar atributo
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {entries
                      .filter((entry) => entry.value.trim().length > 0)
                      .map((entry) => (
                        <span
                          key={entry.index}
                          className="flex items-center gap-1 rounded-full border border-brand-100 bg-brand-50 py-1 pl-3 pr-1.5 text-xs font-medium text-brand-600"
                        >
                          {entry.value}
                          <button
                            aria-label={`Quitar ${entry.value}`}
                            className="rounded-full px-1.5 text-sm leading-none text-brand-500 transition-colors hover:bg-white/70"
                            onClick={() => {
                              onRemoveAttribute(entry.index);
                            }}
                            type="button"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                  </div>

                  {valueSuggestions.length > 0 ? (
                    <div className="grid gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">
                        Ejemplos disponibles (podés elegir varios)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {valueSuggestions.map((suggestion) => {
                          const activeEntry = entries.find(
                            (entry) => entry.value.trim().toLowerCase() === suggestion,
                          );
                          const isActive = Boolean(activeEntry);

                          return (
                            <button
                              key={suggestion}
                              className={[
                                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                                isActive
                                  ? "border border-brand-200 bg-brand-50 text-brand-500"
                                  : !groupCanAddMore
                                    ? "border border-stone-200 bg-stone-100 text-stone-400"
                                    : "border border-stone-200 bg-white text-stone-600 hover:border-brand-200 hover:bg-brand-50",
                              ].join(" ")}
                              disabled={!isActive && !groupCanAddMore}
                              onClick={() => {
                                if (activeEntry) {
                                  onRemoveAttribute(activeEntry.index);
                                  return;
                                }

                                const emptyEntry = entries.find(
                                  (entry) => entry.value.trim().length === 0,
                                );

                                if (emptyEntry) {
                                  onUpdateAttribute(emptyEntry.index, "value", suggestion);
                                } else {
                                  onAddAttributeValue(key, suggestion);
                                }
                              }}
                              type="button"
                            >
                              {suggestion}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <label className="grid gap-2 text-sm font-medium text-stone-700">
                    Agregar otro valor
                    <input
                      className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-brand-300 disabled:opacity-60"
                      disabled={!groupCanAddMore}
                      onBlur={() => {
                        if (draftValue.trim()) {
                          commitAttributeGroupValues(key, draftValue, entries);
                          setAttributeValueDraftByKey((current) => ({ ...current, [key]: "" }));
                        }
                      }}
                      onChange={(event) => {
                        setAttributeValueDraftByKey((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }));
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitAttributeGroupValues(key, draftValue, entries);
                          setAttributeValueDraftByKey((current) => ({ ...current, [key]: "" }));
                        }
                      }}
                      onPaste={(event) => {
                        const pastedText = event.clipboardData.getData("text");

                        if (/[,\n]/.test(pastedText)) {
                          event.preventDefault();
                          commitAttributeGroupValues(key, pastedText, entries);
                          setAttributeValueDraftByKey((current) => ({ ...current, [key]: "" }));
                        }
                      }}
                      placeholder={
                        groupCanAddMore
                          ? "Escribí y presioná Enter (podés pegar varios separados por coma)"
                          : `Llegaste al máximo de ${MAX_PRODUCT_ATTRIBUTES} atributos.`
                      }
                      type="text"
                      value={draftValue}
                    />
                  </label>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-5 text-sm text-stone-500">
            Todavía no agregaste atributos a esta ficha.
          </div>
        )}
      </section>

      <section className="grid gap-3 rounded-3xl border border-stone-200 bg-stone-50/80 p-4 sm:p-5">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-stone-900">Modo de venta</p>
          <p className="text-sm text-stone-500">
            Definí cómo se vende la pieza antes de cargar las fotos.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            className={[
              "rounded-2xl border px-4 py-3 text-left transition-colors",
              !isMadeToOrder
                ? "border-ocean-300 bg-brand-50 text-ocean-600"
                : "border-stone-200 bg-white text-stone-700 hover:border-ocean-200",
            ].join(" ")}
            onClick={() => {
              onAvailabilityModeChange("stock");
            }}
            type="button"
          >
            <p className="text-sm font-semibold">Con stock</p>
            <p className="mt-1 text-xs text-current/80">
              La venta descuenta unidades disponibles hasta llegar a 0.
            </p>
          </button>

          <button
            className={[
              "rounded-2xl border px-4 py-3 text-left transition-colors",
              isMadeToOrder
                ? "border-brand-300 bg-brand-50 text-brand-500"
                : "border-stone-200 bg-white text-stone-700 hover:border-brand-200",
            ].join(" ")}
            onClick={() => {
              onAvailabilityModeChange("made_to_order");
            }}
            type="button"
          >
            <p className="text-sm font-semibold">Produccion bajo demanda</p>
            <p className="mt-1 text-xs text-current/80">
              El cliente ve la demora de producción y, si hace falta, puede
              elegir variables.
            </p>
          </button>
        </div>

        {!isMadeToOrder ? (
          <div className="grid gap-3">
            <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-stone-900">
                  Stock disponible
                </p>
                <p className="text-sm text-stone-500">
                  {productForm.stock_quantity ?? 0} unidad
                  {(productForm.stock_quantity ?? 0) === 1 ? "" : "es"} listas
                  para vender.
                </p>
              </div>

              <button
                className={[
                  "inline-flex min-h-10 items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                  isStockEditorOpen
                    ? "border-ocean-300 bg-brand-50 text-ocean-600"
                    : "border-stone-300 bg-white text-stone-700 hover:border-ocean-300 hover:bg-ocean-50 hover:text-ocean-600",
                ].join(" ")}
                onClick={() => {
                  setIsStockEditorOpen((currentValue) => !currentValue);
                }}
                type="button"
              >
                {isStockEditorOpen ? "Cerrar ajuste" : "Ajustar stock"}
              </button>
            </div>

            {isStockEditorOpen ? (
              <div className="grid gap-3 rounded-2xl border border-ocean-100 bg-[#F8FBFF] p-4 sm:max-w-md">
                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  Nuevo stock
                  <input
                    className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-brand-300"
                    inputMode="numeric"
                    min="1"
                    onChange={(event) => {
                      onStockQuantityChange(
                        event.target.value === ""
                          ? null
                          : Number.parseInt(event.target.value, 10),
                      );
                    }}
                    placeholder="Ej. 3"
                    step="1"
                    type="number"
                    value={productForm.stock_quantity ?? ""}
                  />
                </label>
                <p className="text-xs leading-5 text-stone-500">
                  Abre este ajuste solo cuando necesites corregir unidades
                  disponibles.
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-stone-700 sm:max-w-xs">
              Tiempo de demora (dias)
              <input
                className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-brand-300"
                inputMode="numeric"
                min="1"
                onChange={(event) => {
                  onLeadTimeDaysChange(
                    event.target.value === ""
                      ? null
                      : Number.parseInt(event.target.value, 10),
                  );
                }}
                placeholder="Ej. 7"
                step="1"
                type="number"
                value={productForm.lead_time_days ?? ""}
              />
            </label>

            <p className="text-xs leading-5 text-stone-500">
              Este modo no usa stock. El cliente vera este tiempo estimado antes
              de comprar.
            </p>
          </div>
        )}
      </section>

      <ProductMadeToOrderOptionsField
        onUpdateMadeToOrderOptions={onUpdateMadeToOrderOptions}
        productForm={productForm}
      />

      <ProductImagesField
        onDropImages={onDropImages}
        onOpenEditor={onOpenEditor}
        onRemoveImage={onRemoveImage}
        onSetPrimaryImage={onSetPrimaryImage}
        onTriggerBulkImagePicker={onTriggerBulkImagePicker}
        onTriggerImagePicker={onTriggerImagePicker}
        productImages={productImages}
      />

      <ProductModel3DField
        onFileChange={onProductModel3DFileChange}
        onRemove={onRemoveModel3D}
        productMedia={productForm.product_media}
        selectedFile={productModel3DFile}
      />

      <div className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-4 sm:p-5">
        <label className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
          <input
            checked={productForm.is_active}
            className="h-4 w-4 accent-brand-500"
            onChange={(event) => {
              onToggleActive(event.target.checked);
            }}
            type="checkbox"
          />
          Publicar en el catálogo apenas se guarde
        </label>

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

        {uploadStatus ? (
          <div className="flex items-center gap-3 rounded-2xl border border-ocean-100 bg-brand-50 px-4 py-3">
            <svg
              className="h-4 w-4 shrink-0 animate-spin text-ocean-500"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                fill="currentColor"
              />
            </svg>
            <p className="text-sm text-ocean-500">{uploadStatus}</p>
          </div>
        ) : null}

        <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-3xl border border-stone-200 bg-white/95 p-3 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-stone-500 sm:max-w-xl">
            "Desliza las fotos en horizontal para revisar portada, recortes y
            orden antes de guardar."
          </p>

          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-fit"
            disabled={isSaving || categories.length === 0}
            type="submit"
          >
            {isSaving ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    fill="currentColor"
                  />
                </svg>
                {editingProductId ? "Guardando..." : "Creando..."}
              </>
            ) : (
              submitLabel
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

import type { FormEvent } from "react";
import type { ArtisanProductInput } from "../../../types/artisan";
import type { ProductAttribute } from "../../../types/productAttributes";
import type {
  ProductOptionChoice,
  ProductOptionGroup,
} from "../../../types/productAvailability";
import type { ProductImageDraft } from "../imageEditorTypes";
import type { ArtisanProductLearningProfile } from "../artisanProductLearning";

import { useEffect, useRef, useState } from "react";
import {
  createProductChoiceId,
  createProductOptionId,
} from "../../../types/productAvailability";
import {
  getProductAttributeValueSuggestions,
  PRODUCT_ATTRIBUTE_SUGGESTIONS,
} from "../../../types/productAttributes";
import { ProductLearningPanel } from "./ProductLearningPanel";
import { ProductImagesField } from "./ProductImagesField";
import { ProductModel3DField } from "./ProductModel3DField";

type ArtisanProductFormSectionProps = {
  draftPersistenceState: "idle" | "saving" | "saved" | "error";
  categories: Array<{ id: string; name: string }>;
  editingProductId: string | null;
  errorMessage: string | null;
  hasDraft: boolean;
  isCreateFocused: boolean;
  isLoading: boolean;
  isSaving: boolean;
  learningProfile: ArtisanProductLearningProfile | null;
  onAddAttribute: (initialKey?: string) => void;
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
  productForm: ArtisanProductInput;
  productImages: ProductImageDraft[];
  productModel3DFile: File | null;
  statusMessage: string | null;
  uploadStatus: string | null;
};

function updateOptionGroup(
  groups: ProductOptionGroup[],
  optionId: string,
  updater: (group: ProductOptionGroup) => ProductOptionGroup,
) {
  return groups.map((group) =>
    group.id === optionId ? updater(group) : group,
  );
}

function updateOptionChoice(
  groups: ProductOptionGroup[],
  optionId: string,
  choiceId: string,
  updater: (choice: ProductOptionChoice) => ProductOptionChoice,
) {
  return groups.map((group) =>
    group.id === optionId
      ? {
          ...group,
          choices: group.choices.map((choice) =>
            choice.id === choiceId ? updater(choice) : choice,
          ),
        }
      : group,
  );
}

export function ArtisanProductFormSection({
  draftPersistenceState,
  categories,
  editingProductId,
  errorMessage,
  hasDraft,
  isCreateFocused,
  isLoading,
  isSaving,
  learningProfile,
  onAddAttribute,
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
  productForm,
  productImages,
  productModel3DFile,
  statusMessage,
  uploadStatus,
}: ArtisanProductFormSectionProps) {
  const isMadeToOrder = productForm.availability_mode === "made_to_order";
  const hasOptionGroups = productForm.made_to_order_options.length > 0;
  const [isStockEditorOpen, setIsStockEditorOpen] = useState(false);
  const attributesListRef = useRef<HTMLDivElement | null>(null);
  const formTitle = editingProductId ? "Editar producto" : "Nuevo producto";
  const submitLabel = editingProductId ? "Guardar cambios" : "Crear producto";
  const showTopSummary = !isCreateFocused || Boolean(editingProductId);
  const canAddMoreAttributes = productForm.product_attributes.length < 12;
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
      <section className="grid gap-4 rounded-[1.75rem] border border-stone-200 bg-[linear-gradient(180deg,_#ffffff,_#f8f4eb)] p-4 sm:p-5">
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
                    ? "bg-[#E0F2FE] text-ocean-600"
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
                className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F2FE] px-3 py-1.5 text-xs font-medium text-ocean-600 transition-colors hover:bg-ocean-100"
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

        <div
          className={
            showTopSummary
              ? "grid gap-3 lg:grid-cols-[1.2fr_0.8fr]"
              : "grid gap-3"
          }
        >
          <div className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-stone-900">
                Modo de carga
              </p>
              <p className="text-sm text-stone-500">
                Elige una sola forma de trabajo y sigue ese camino hasta
                guardar.
              </p>
            </div>

            <div className="grid gap-2">
              <button
                className="rounded-2xl border border-ocean-300 bg-[#E0F2FE] px-4 py-3 text-left text-ocean-600 transition-colors"
                type="button"
              >
                <p className="text-sm font-semibold">Un solo producto</p>
                <p className="mt-1 text-xs text-current/80">
                  Varias fotos para una misma ficha con una portada principal.
                </p>
              </button>
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
                "Esta vista estÃƒÂ¡ pensada para completar una ficha comÃƒÂºn
                con el menor esfuerzo posible."
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <ProductLearningPanel
        currentTitle={productForm.title}
        learningProfile={learningProfile}
        onTitleSuggestionApply={onTitleChange}
      />

      {!isLoading && categories.length === 0 ? (
        <p className="rounded-2xl border border-sun-500 bg-[#ECFEFF] px-4 py-3 text-sm text-brand-500">
          No hay categorías disponibles en este momento. Cuando el equipo las
          active, vas a poder publicar.
        </p>
      ) : null}

      <section className="grid gap-4 rounded-[1.75rem] border border-stone-200 bg-white p-4 sm:p-5">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-stone-900">Datos base</p>
          <p className="text-sm text-stone-500">
            Completá una sola vez la información principal de esta ficha.
          </p>
        </div>

        <label className="grid gap-2 text-sm font-medium text-stone-700">
          Titulo
          <input
            className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-ocean-300"
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
            className="min-h-28 rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-ocean-300"
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
                className="w-full rounded-xl border border-stone-300 bg-white py-3 pl-7 pr-4 text-sm text-stone-900 outline-none transition focus:border-ocean-300"
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
              className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-ocean-300"
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

      <section className="grid gap-4 rounded-[1.75rem] border border-stone-200 bg-stone-50/80 p-4 sm:p-5">
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

        {productForm.product_attributes.length > 0 ? (
          <div
            className={[
              "grid gap-3",
              productForm.product_attributes.length > 2
                ? "max-h-[24rem] overflow-y-auto pr-1.5"
                : "",
            ].join(" ")}
            ref={attributesListRef}
          >
            {productForm.product_attributes.map((attribute, index) => (
              <div
                key={`${attribute.key}-${index}`}
                className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-3"
              >
                <div className="grid gap-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_auto] sm:items-end">
                  <label className="grid gap-2 text-sm font-medium text-stone-700">
                    Atributo
                    <input
                      className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-ocean-300"
                      onChange={(event) => {
                        onUpdateAttribute(index, "key", event.target.value);
                      }}
                      placeholder="Ej. material"
                      type="text"
                      value={attribute.key}
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-medium text-stone-700">
                    Valor
                    <input
                      className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-ocean-300"
                      onChange={(event) => {
                        onUpdateAttribute(index, "value", event.target.value);
                      }}
                      placeholder="Ej. cerÃƒÂ¡mica esmaltada"
                      type="text"
                      value={attribute.value}
                    />
                  </label>

                  <button
                    className="rounded-full border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100"
                    onClick={() => {
                      onRemoveAttribute(index);
                    }}
                    type="button"
                  >
                    Quitar
                  </button>
                </div>

                <div className="grid gap-2">
                  {getProductAttributeValueSuggestions(attribute.key).length >
                  0 ? (
                    <div className="grid gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">
                        Ejemplos disponibles
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {getProductAttributeValueSuggestions(attribute.key).map(
                          (suggestion) => {
                            const isActive =
                              attribute.value.trim().toLowerCase() ===
                              suggestion;

                            return (
                              <button
                                key={`${attribute.key}-${suggestion}-${index}`}
                                className={[
                                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                                  isActive
                                    ? "border border-brand-200 bg-[#ECFEFF] text-brand-500"
                                    : "border border-stone-200 bg-white text-stone-600 hover:border-brand-200 hover:bg-brand-50",
                                ].join(" ")}
                                onClick={() => {
                                  onUpdateAttribute(index, "value", suggestion);
                                }}
                                type="button"
                              >
                                {suggestion}
                              </button>
                            );
                          },
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-5 text-sm text-stone-500">
            Todavía no agregaste atributos a esta ficha.
          </div>
        )}
      </section>

      <section className="grid gap-3 rounded-[1.75rem] border border-stone-200 bg-stone-50/80 p-4 sm:p-5">
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
                ? "border-ocean-300 bg-[#E0F2FE] text-ocean-600"
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
                ? "border-brand-300 bg-[#ECFEFF] text-brand-500"
                : "border-stone-200 bg-white text-stone-700 hover:border-brand-200",
            ].join(" ")}
            onClick={() => {
              onAvailabilityModeChange("made_to_order");
            }}
            type="button"
          >
            <p className="text-sm font-semibold">Produccion bajo demanda</p>
            <p className="mt-1 text-xs text-current/80">
              El cliente ve la demora de producciÃƒÂ³n y, si hace falta, puede
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
                    ? "border-ocean-300 bg-[#E0F2FE] text-ocean-600"
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
                    className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-ocean-300"
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
                className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-ocean-300"
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

      <section className="grid gap-4 rounded-[1.75rem] border border-stone-200 bg-stone-50/80 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-stone-900">
              Variables para elegir
            </p>
            <p className="mt-1 text-sm text-stone-500">
              Color, tamano, acabado o cualquier opcion que el comprador deba
              elegir antes de comprar.
            </p>
          </div>
          <button
            className="rounded-full border border-ocean-200 bg-white px-4 py-2 text-sm font-medium text-ocean-600 transition-colors hover:bg-ocean-50"
            onClick={() => {
              onUpdateMadeToOrderOptions([
                ...productForm.made_to_order_options,
                {
                  choices: [
                    {
                      id: createProductChoiceId(),
                      label: "",
                      priceModifier: 0,
                    },
                  ],
                  id: createProductOptionId(),
                  label: "",
                  required: true,
                },
              ]);
            }}
            type="button"
          >
            Agregar variable
          </button>
        </div>

        {!hasOptionGroups ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-4 text-sm text-stone-500">
            Todavia no definiste variables. Si este producto tiene color,
            capacidad u otras opciones, puedes cargarlas aqui.
          </div>
        ) : null}

        {productForm.made_to_order_options.map((option, optionIndex) => (
          <div
            key={option.id}
            className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-stone-900">
                Variable {optionIndex + 1}
              </p>
              <button
                className="rounded-full border border-brand-100 px-3 py-1.5 text-xs font-semibold text-brand-500 transition-colors hover:bg-brand-50"
                onClick={() => {
                  onUpdateMadeToOrderOptions(
                    productForm.made_to_order_options.filter(
                      (currentOption) => currentOption.id !== option.id,
                    ),
                  );
                }}
                type="button"
              >
                Quitar
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
              <label className="grid gap-2 text-sm font-medium text-stone-700">
                Nombre de la variable
                <input
                  className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-ocean-300"
                  onChange={(event) => {
                    onUpdateMadeToOrderOptions(
                      updateOptionGroup(
                        productForm.made_to_order_options,
                        option.id,
                        (currentOption) => ({
                          ...currentOption,
                          label: event.target.value,
                        }),
                      ),
                    );
                  }}
                  placeholder="Ej. Color"
                  type="text"
                  value={option.label}
                />
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                <input
                  checked={option.required}
                  className="h-4 w-4 accent-brand-500"
                  onChange={(event) => {
                    onUpdateMadeToOrderOptions(
                      updateOptionGroup(
                        productForm.made_to_order_options,
                        option.id,
                        (currentOption) => ({
                          ...currentOption,
                          required: event.target.checked,
                        }),
                      ),
                    );
                  }}
                  type="checkbox"
                />
                Eleccion obligatoria
              </label>
            </div>

            <div className="grid gap-2">
              {option.choices.map((choice, choiceIndex) => (
                <div
                  key={choice.id}
                  className="grid gap-2 rounded-2xl border border-stone-200 bg-stone-50/60 p-3 sm:grid-cols-[minmax(0,1fr)_150px_auto]"
                >
                  <label className="grid gap-2 text-sm font-medium text-stone-700">
                    Opcion {choiceIndex + 1}
                    <input
                      className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-ocean-300"
                      onChange={(event) => {
                        onUpdateMadeToOrderOptions(
                          updateOptionChoice(
                            productForm.made_to_order_options,
                            option.id,
                            choice.id,
                            (currentChoice) => ({
                              ...currentChoice,
                              label: event.target.value,
                            }),
                          ),
                        );
                      }}
                      placeholder="Ej. Azul"
                      type="text"
                      value={choice.label}
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-medium text-stone-700">
                    Extra $
                    <input
                      className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-ocean-300"
                      inputMode="decimal"
                      onChange={(event) => {
                        onUpdateMadeToOrderOptions(
                          updateOptionChoice(
                            productForm.made_to_order_options,
                            option.id,
                            choice.id,
                            (currentChoice) => ({
                              ...currentChoice,
                              priceModifier: Number(event.target.value) || 0,
                            }),
                          ),
                        );
                      }}
                      step="0.01"
                      type="number"
                      value={choice.priceModifier}
                    />
                  </label>

                  <div className="flex items-end">
                    <button
                      className="rounded-full border border-brand-100 px-4 py-2 text-sm font-medium text-brand-500 transition-colors hover:bg-brand-50"
                      onClick={() => {
                        onUpdateMadeToOrderOptions(
                          updateOptionGroup(
                            productForm.made_to_order_options,
                            option.id,
                            (currentOption) => ({
                              ...currentOption,
                              choices: currentOption.choices.filter(
                                (currentChoice) =>
                                  currentChoice.id !== choice.id,
                              ),
                            }),
                          ),
                        );
                      }}
                      type="button"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              className="inline-flex w-fit items-center justify-center rounded-full border border-ocean-200 bg-white px-4 py-2 text-sm font-medium text-ocean-600 transition-colors hover:bg-ocean-50"
              onClick={() => {
                onUpdateMadeToOrderOptions(
                  updateOptionGroup(
                    productForm.made_to_order_options,
                    option.id,
                    (currentOption) => ({
                      ...currentOption,
                      choices: [
                        ...currentOption.choices,
                        {
                          id: createProductChoiceId(),
                          label: "",
                          priceModifier: 0,
                        },
                      ],
                    }),
                  ),
                );
              }}
              type="button"
            >
              Agregar opcion
            </button>
          </div>
        ))}
      </section>

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

      <div className="grid gap-3 rounded-[1.75rem] border border-stone-200 bg-white p-4 sm:p-5">
        <label className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
          <input
            checked={productForm.is_active}
            className="h-4 w-4 accent-brand-500"
            onChange={(event) => {
              onToggleActive(event.target.checked);
            }}
            type="checkbox"
          />
          Publicar en el catÃƒÂ¡logo apenas se guarde
        </label>

        {statusMessage ? (
          <p className="rounded-2xl border border-sun-500 bg-[#ECFEFF] px-4 py-3 text-sm text-brand-500">
            {statusMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p className="rounded-2xl border border-brand-500 bg-[#D1FAE5] px-4 py-3 text-sm text-brand-500">
            {errorMessage}
          </p>
        ) : null}

        {uploadStatus ? (
          <div className="flex items-center gap-3 rounded-2xl border border-ocean-100 bg-[#E0F2FE] px-4 py-3">
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

        <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-[1.5rem] border border-stone-200 bg-white/95 p-3 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
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

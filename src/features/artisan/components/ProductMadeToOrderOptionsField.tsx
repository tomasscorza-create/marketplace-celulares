import type { ArtisanProductInput } from "../../../types/artisan";
import type {
  ProductOptionChoice,
  ProductOptionGroup,
} from "../../../types/productAvailability";

import {
  createProductChoiceId,
  createProductOptionId,
} from "../../../types/productAvailability";

type ProductMadeToOrderOptionsFieldProps = {
  onUpdateMadeToOrderOptions: (options: ProductOptionGroup[]) => void;
  productForm: ArtisanProductInput;
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

export function ProductMadeToOrderOptionsField({
  onUpdateMadeToOrderOptions,
  productForm,
}: ProductMadeToOrderOptionsFieldProps) {
  const hasOptionGroups = productForm.made_to_order_options.length > 0;

  return (
    <section className="grid gap-4 rounded-3xl border border-stone-200 bg-stone-50/80 p-4 sm:p-5">
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
                className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-brand-300"
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
                    className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-brand-300"
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
                    className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-brand-300"
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
  );
}

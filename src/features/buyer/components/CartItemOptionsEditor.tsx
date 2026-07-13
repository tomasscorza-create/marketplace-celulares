import { useEffect, useState } from "react";

import type { BuyerCartValidatedItem } from "../../../types/commerce";
import {
  calculateOptionPriceModifiers,
  createProductConfigurationKey,
  createSelectedOptionsSummary,
  type ProductSelectionChoice,
} from "../../../types/productAvailability";
import type { useUpdateCartItemSelection } from "../cartQueries";

type CartItemOptionsEditorProps = {
  item: BuyerCartValidatedItem;
  onError: (message: string) => void;
  onSaved: () => void;
  updateSelectionMutation: ReturnType<typeof useUpdateCartItemSelection>;
};

function buildSelectedOptionMap(selectedOptions: ProductSelectionChoice[]) {
  return Object.fromEntries(
    selectedOptions.map((selection) => [selection.optionId, selection.choiceId]),
  );
}

function buildSelectionChoices(
  item: BuyerCartValidatedItem,
  selectedOptions: Record<string, string>,
) {
  return item.made_to_order_options.flatMap<ProductSelectionChoice>((option) => {
    const choiceId = selectedOptions[option.id];
    const choice = option.choices.find((currentChoice) => currentChoice.id === choiceId);

    if (!choice) {
      return [];
    }

    return [
      {
        choiceId: choice.id,
        choiceLabel: choice.label,
        optionId: option.id,
        optionLabel: option.label,
        priceModifier: choice.priceModifier,
      },
    ];
  });
}

export function CartItemOptionsEditor({
  item,
  onError,
  onSaved,
  updateSelectionMutation,
}: CartItemOptionsEditorProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(
    () => buildSelectedOptionMap(item.selected_options),
  );
  const selectedOptionsKey = item.selected_options
    .map((selection) => `${selection.optionId}:${selection.choiceId}`)
    .join("|");

  useEffect(() => {
    setSelectedOptions(buildSelectedOptionMap(item.selected_options));
  }, [item.cart_item_id, item.configuration_key, item.selected_options, selectedOptionsKey]);

  if (item.availability_mode !== "made_to_order" || item.made_to_order_options.length === 0) {
    return null;
  }

  const selectedOptionChoices = buildSelectionChoices(item, selectedOptions);
  const missingRequiredOption = item.made_to_order_options.some(
    (option) => option.required && !selectedOptions[option.id],
  );
  const nextUnitPrice = Number(
    (item.product_base_price + calculateOptionPriceModifiers(selectedOptionChoices)).toFixed(2),
  );

  return (
    <div className="grid gap-3 rounded-2xl border border-ocean-100 bg-[#F7FAFF] px-4 py-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {item.made_to_order_options.map((option) => (
          <label key={option.id} className="grid gap-1.5 text-sm font-medium text-stone-700">
            <span>{option.label}</span>
            <select
              className="rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-brand-300"
              onChange={(event) => {
                setSelectedOptions((currentValue) => {
                  if (!event.target.value) {
                    const nextValue = { ...currentValue };
                    delete nextValue[option.id];
                    return nextValue;
                  }

                  return {
                    ...currentValue,
                    [option.id]: event.target.value,
                  };
                });
              }}
              value={selectedOptions[option.id] ?? ""}
            >
              <option value="">{option.required ? "Elegir" : "Sin seleccionar"}</option>
              {option.choices.map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {choice.label}
                  {choice.priceModifier > 0
                    ? ` (+$${Number(choice.priceModifier).toLocaleString("es-AR")})`
                    : ""}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-ocean-600">
          ${nextUnitPrice.toLocaleString("es-AR")} por unidad
        </span>
        <button
          className="inline-flex min-h-10 items-center justify-center rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={missingRequiredOption || updateSelectionMutation.isPending}
          onClick={async () => {
            const response = await updateSelectionMutation
              .mutateAsync({
                cartItemId: item.cart_item_id,
                product: {
                  availability_mode: item.availability_mode,
                  id: item.product_id,
                  image_url: item.product_image_url,
                  image_urls: item.product_image_urls,
                  lead_time_days: item.effective_lead_time_days,
                  price: item.product_base_price,
                  product_media: item.product_media,
                  stock_quantity: item.live_stock_quantity,
                  title: item.product_title,
                },
                selection: {
                  configurationKey: createProductConfigurationKey(selectedOptionChoices),
                  leadTimeDays: item.effective_lead_time_days,
                  selectedOptions: selectedOptionChoices,
                  selectedOptionsSummary: createSelectedOptionsSummary(selectedOptionChoices),
                  unitPrice: nextUnitPrice,
                },
              })
              .catch((error: Error) => {
                onError(error.message);
                return null;
              });

            if (response) {
              onSaved();
            }
          }}
          type="button"
        >
          {updateSelectionMutation.isPending ? "Guardando..." : "Guardar opciones"}
        </button>
      </div>
    </div>
  );
}

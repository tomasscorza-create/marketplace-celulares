import type { Dispatch, SetStateAction } from "react";

import type { PublicProduct } from "../../../types/public";

import { DetailSectionCard } from "./DetailSectionCard";

type ProductOptionSelectorProps = {
  canConfigureForPurchase: boolean;
  missingRequiredOption: boolean;
  product: PublicProduct;
  selectedOptions: Record<string, string>;
  selectedOptionsSummary: string | null;
  setSelectedOptions: Dispatch<SetStateAction<Record<string, string>>>;
};

export function ProductOptionSelector({
  canConfigureForPurchase,
  missingRequiredOption,
  product,
  selectedOptions,
  selectedOptionsSummary,
  setSelectedOptions,
}: ProductOptionSelectorProps) {
  return (
    <DetailSectionCard
      eyebrow={canConfigureForPurchase ? "Personaliza" : "Variantes"}
      title={canConfigureForPurchase ? "Elige tus opciones" : "Opciones de la pieza"}
      toneClassName="border-stone-200 bg-white/95"
    >
      {canConfigureForPurchase ? (
        <div className="grid gap-3">
          {product.made_to_order_options.map((option) => (
            <label key={option.id} className="grid gap-2 text-sm font-medium text-stone-700">
              <span className="flex flex-wrap items-center gap-2">
                <span>{option.label}</span>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-stone-500">
                  {option.required ? "Requerido" : "Opcional"}
                </span>
              </span>
              <select
                className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-brand-300"
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
                {!option.required ? <option value="">Sin seleccionar</option> : null}
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

          <div
            className={[
              "rounded-2xl border px-4 py-2.5 text-sm leading-6",
              missingRequiredOption
                ? "border-brand-200 bg-brand-50 text-stone-700"
                : "border-ocean-100 bg-brand-50 text-stone-700",
            ].join(" ")}
          >
            {missingRequiredOption
              ? "Faltan elecciones para habilitar la compra."
              : selectedOptionsSummary
                ? `Resumen: ${selectedOptionsSummary}.`
                : "Configuracion lista para continuar."}
          </div>
        </div>
      ) : (
        <div className="grid gap-2.5">
          {product.made_to_order_options.map((option) => (
            <div key={option.id} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-stone-700">{option.label}</p>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-stone-500 ring-1 ring-stone-200">
                  {option.required ? "Requerido" : "Opcional"}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {option.choices.map((choice) => (
                  <span
                    key={choice.id}
                    className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-600"
                  >
                    {choice.label}
                    {choice.priceModifier > 0
                      ? ` (+$${Number(choice.priceModifier).toLocaleString("es-AR")})`
                      : ""}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </DetailSectionCard>
  );
}

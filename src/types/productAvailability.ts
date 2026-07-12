export type ProductAvailabilityMode = "stock" | "made_to_order";

export type ProductOptionChoice = {
  id: string;
  label: string;
  priceModifier: number;
};

export type ProductOptionGroup = {
  id: string;
  label: string;
  required: boolean;
  choices: ProductOptionChoice[];
};

export type ProductSelectionChoice = {
  choiceId: string;
  choiceLabel: string;
  optionId: string;
  optionLabel: string;
  priceModifier: number;
};

export function createProductOptionId() {
  return `opt_${Math.random().toString(36).slice(2, 10)}`;
}

export function createProductChoiceId() {
  return `choice_${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeProductSelectionChoices(choices: ProductSelectionChoice[]) {
  return [...choices]
    .sort((left, right) =>
      `${left.optionId}:${left.choiceId}`.localeCompare(`${right.optionId}:${right.choiceId}`),
    )
    .map((choice) => ({
      choiceId: choice.choiceId,
      choiceLabel: choice.choiceLabel.trim(),
      optionId: choice.optionId,
      optionLabel: choice.optionLabel.trim(),
      priceModifier: Number(choice.priceModifier) || 0,
    }));
}

export function createProductConfigurationKey(choices: ProductSelectionChoice[]) {
  const normalized = normalizeProductSelectionChoices(choices);

  if (normalized.length === 0) {
    return "default";
  }

  return normalized
    .map((choice) => `${choice.optionId}:${choice.choiceId}:${choice.priceModifier}`)
    .join("|");
}

export function createSelectedOptionsSummary(choices: ProductSelectionChoice[]) {
  const normalized = normalizeProductSelectionChoices(choices);

  if (normalized.length === 0) {
    return null;
  }

  return normalized
    .map((choice) => `${choice.optionLabel}: ${choice.choiceLabel}`)
    .join(" · ");
}

export function calculateOptionPriceModifiers(choices: ProductSelectionChoice[]) {
  return normalizeProductSelectionChoices(choices).reduce(
    (sum, choice) => sum + (Number(choice.priceModifier) || 0),
    0,
  );
}

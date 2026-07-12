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

function normalizeProductSelectionChoices(choices: ProductSelectionChoice[]) {
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

export function createSelectedOptionsSummary(choices: ProductSelectionChoice[]) {
  const normalized = normalizeProductSelectionChoices(choices);

  if (normalized.length === 0) {
    return null;
  }

  return normalized.map((choice) => `${choice.optionLabel}: ${choice.choiceLabel}`).join(" · ");
}

export function calculateOptionPriceModifiers(choices: ProductSelectionChoice[]) {
  return normalizeProductSelectionChoices(choices).reduce(
    (sum, choice) => sum + (Number(choice.priceModifier) || 0),
    0,
  );
}

export function validateMadeToOrderSelection(
  groups: ProductOptionGroup[],
  selectedChoices: ProductSelectionChoice[],
) {
  const normalizedSelections = normalizeProductSelectionChoices(selectedChoices);
  const resolvedSelections: ProductSelectionChoice[] = [];

  for (const group of groups) {
    const selectedChoice = normalizedSelections.find((choice) => choice.optionId === group.id);

    if (!selectedChoice) {
      if (group.required) {
        throw new Error(`Falta elegir una opción para "${group.label}".`);
      }

      continue;
    }

    const matchingChoice = group.choices.find((choice) => choice.id === selectedChoice.choiceId);

    if (!matchingChoice) {
      throw new Error(`La selección enviada para "${group.label}" ya no está disponible.`);
    }

    resolvedSelections.push({
      choiceId: matchingChoice.id,
      choiceLabel: matchingChoice.label,
      optionId: group.id,
      optionLabel: group.label,
      priceModifier: Number(matchingChoice.priceModifier) || 0,
    });
  }

  const extraSelection = normalizedSelections.find(
    (choice) => !groups.some((group) => group.id === choice.optionId),
  );

  if (extraSelection) {
    throw new Error("La configuración enviada no coincide con las opciones actuales del producto.");
  }

  return {
    resolvedSelections,
    selectedOptionsSummary: createSelectedOptionsSummary(resolvedSelections),
    unitPriceModifier: calculateOptionPriceModifiers(resolvedSelections),
  };
}

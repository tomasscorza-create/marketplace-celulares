export type CategorySpecTemplateField = {
  id: string;
  category_id: string;
  field_label: string;
  sort_order: number;
};

export type CategorySpecValue = {
  label: string;
  value: string;
};

export function sanitizeCategorySpecValues(values: CategorySpecValue[]) {
  return values
    .map((entry) => ({
      label: entry.label.trim(),
      value: entry.value.trim(),
    }))
    .filter((entry) => entry.label.length > 0 && entry.value.length > 0)
    .slice(0, 20);
}

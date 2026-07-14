import { sanitizeTrimmedPairs } from "../lib/sanitizeTextPairs";

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

export const MAX_CATEGORY_SPEC_FIELDS = 20;

export function sanitizeCategorySpecValues(values: CategorySpecValue[]) {
  return sanitizeTrimmedPairs(
    values.map((entry) => [entry.label, entry.value]),
    MAX_CATEGORY_SPEC_FIELDS,
  ).map(([label, value]) => ({ label, value }));
}

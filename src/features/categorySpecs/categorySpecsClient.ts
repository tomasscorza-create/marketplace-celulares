import type {
  AdminCategorySpecTemplateField,
  AdminCategorySpecTemplateInput,
} from "../../types/admin";

import { getSupabaseClient } from "../../lib/supabase/client";

const CATEGORY_SPEC_TEMPLATE_SELECTION = "id, category_id, field_label, sort_order";

export async function getCategorySpecTemplate(categoryId: string) {
  const client = getSupabaseClient();

  return client
    .from("category_spec_templates")
    .select(CATEGORY_SPEC_TEMPLATE_SELECTION)
    .eq("category_id", categoryId)
    .order("sort_order", { ascending: true })
    .returns<AdminCategorySpecTemplateField[]>();
}

export async function saveCategorySpecTemplate(
  categoryId: string,
  fields: AdminCategorySpecTemplateInput,
) {
  const client = getSupabaseClient();

  const response = await client.rpc("save_category_spec_template", {
    target_category_id: categoryId,
    field_labels: fields.map((field) => field.field_label),
  });

  return {
    ...response,
    data: (response.data ?? null) as AdminCategorySpecTemplateField[] | null,
  };
}

export type CategorySpecFieldUsage = {
  field_label: string;
  product_count: number;
};

export async function countProductsByCategorySpecLabels(
  categoryId: string,
  fieldLabels: string[],
) {
  const client = getSupabaseClient();

  const response = await client.rpc("count_products_by_category_spec_labels", {
    target_category_id: categoryId,
    field_labels: fieldLabels,
  });

  return {
    ...response,
    data: (response.data ?? null) as CategorySpecFieldUsage[] | null,
  };
}

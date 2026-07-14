import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getErrorMessage } from "@/lib/errors";
import { queryKeys } from "@/lib/query/queryKeys";
import type {
  AdminCategorySpecTemplateField,
  AdminCategorySpecTemplateInput,
} from "@/types/admin";

import { getCategorySpecTemplate, saveCategorySpecTemplate } from "./categorySpecsClient";

const TWO_MINUTES = 2 * 60 * 1000;

export function useCategorySpecTemplate(categoryId: string | null) {
  return useQuery<AdminCategorySpecTemplateField[]>({
    staleTime: TWO_MINUTES,
    queryKey: queryKeys.categorySpecs.template(categoryId ?? ""),
    enabled: Boolean(categoryId),
    queryFn: async () => {
      const response = await getCategorySpecTemplate(categoryId as string);

      if (response.error) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos cargar la plantilla de especificaciones."),
        );
      }

      return response.data ?? [];
    },
  });
}

export function useSaveCategorySpecTemplateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      categoryId: string;
      fields: AdminCategorySpecTemplateInput;
    }) => {
      const response = await saveCategorySpecTemplate(payload.categoryId, payload.fields);

      if (response.error) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos guardar la plantilla de especificaciones."),
        );
      }

      return response.data ?? [];
    },
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.categorySpecs.template(variables.categoryId),
      });
    },
  });
}

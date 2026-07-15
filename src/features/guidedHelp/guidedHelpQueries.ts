import type { QueryClient } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getErrorMessage } from "../../lib/errors";
import { queryKeys } from "../../lib/query/queryKeys";
import type { GuidedHelpFaq, GuidedHelpFaqInput } from "../../types/guidedHelp";

import {
  createGuidedHelpFaq,
  deleteGuidedHelpFaq,
  getActiveGuidedHelpFaqs,
  getAdminGuidedHelpFaqs,
  updateGuidedHelpFaq,
} from "./guidedHelpClient";

const FIVE_MINUTES = 5 * 60 * 1000;

export function useActiveGuidedHelpFaqs() {
  return useQuery<GuidedHelpFaq[]>({
    queryKey: queryKeys.guidedHelp.activeFaqs,
    queryFn: async () => {
      const response = await getActiveGuidedHelpFaqs();

      if (response.error) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos cargar las preguntas frecuentes."),
        );
      }

      return response.data ?? [];
    },
    staleTime: FIVE_MINUTES,
  });
}

export function useAdminGuidedHelpFaqs() {
  return useQuery<GuidedHelpFaq[]>({
    queryKey: queryKeys.guidedHelp.adminFaqs,
    queryFn: async () => {
      const response = await getAdminGuidedHelpFaqs();

      if (response.error) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos cargar las preguntas frecuentes."),
        );
      }

      return response.data ?? [];
    },
  });
}

function invalidateGuidedHelpFaqs(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.guidedHelp.adminFaqs });
  void queryClient.invalidateQueries({ queryKey: queryKeys.guidedHelp.activeFaqs });
}

export function useCreateGuidedHelpFaq() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: GuidedHelpFaqInput) => {
      const response = await createGuidedHelpFaq(input);

      if (response.error || !response.data) {
        throw new Error(getErrorMessage(response.error, "No pudimos crear la pregunta."));
      }

      return response.data;
    },
    onSuccess: () => invalidateGuidedHelpFaqs(queryClient),
  });
}

export function useUpdateGuidedHelpFaq() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { faqId: string; input: GuidedHelpFaqInput }) => {
      const response = await updateGuidedHelpFaq(payload.faqId, payload.input);

      if (response.error || !response.data) {
        throw new Error(getErrorMessage(response.error, "No pudimos actualizar la pregunta."));
      }

      return response.data;
    },
    onSuccess: () => invalidateGuidedHelpFaqs(queryClient),
  });
}

export function useDeleteGuidedHelpFaq() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (faqId) => {
      const response = await deleteGuidedHelpFaq(faqId);

      if (response.error) {
        throw new Error(getErrorMessage(response.error, "No pudimos borrar la pregunta."));
      }
    },
    onSuccess: () => invalidateGuidedHelpFaqs(queryClient),
  });
}

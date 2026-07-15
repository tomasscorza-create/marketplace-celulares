import type { GuidedHelpFaq, GuidedHelpFaqInput } from "../../types/guidedHelp";

import { getSupabaseClient } from "../../lib/supabase/client";

const GUIDED_HELP_FAQ_SELECTION = "id, question, answer, sort_order, is_active, created_at";

export async function getActiveGuidedHelpFaqs() {
  const client = getSupabaseClient();

  return client
    .from("guided_help_faqs")
    .select(GUIDED_HELP_FAQ_SELECTION)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .returns<GuidedHelpFaq[]>();
}

export async function getAdminGuidedHelpFaqs() {
  const client = getSupabaseClient();

  return client
    .from("guided_help_faqs")
    .select(GUIDED_HELP_FAQ_SELECTION)
    .order("sort_order", { ascending: true })
    .returns<GuidedHelpFaq[]>();
}

export async function createGuidedHelpFaq(input: GuidedHelpFaqInput) {
  const client = getSupabaseClient();

  return client
    .from("guided_help_faqs")
    .insert(input)
    .select(GUIDED_HELP_FAQ_SELECTION)
    .single<GuidedHelpFaq>();
}

export async function updateGuidedHelpFaq(faqId: string, input: GuidedHelpFaqInput) {
  const client = getSupabaseClient();

  return client
    .from("guided_help_faqs")
    .update(input)
    .eq("id", faqId)
    .select(GUIDED_HELP_FAQ_SELECTION)
    .single<GuidedHelpFaq>();
}

export async function deleteGuidedHelpFaq(faqId: string) {
  const client = getSupabaseClient();

  return client.from("guided_help_faqs").delete().eq("id", faqId);
}

import { getSupabaseClient } from "@/lib/supabase/client";

export type SiteContentItem = {
  content_key: string;
  value: string;
};

export type SiteContentValues = Record<string, string>;

export async function getSiteContent(contentKeys: string[]) {
  const client = getSupabaseClient();

  return client
    .from("site_content")
    .select("content_key,value")
    .in("content_key", contentKeys)
    .returns<SiteContentItem[]>();
}

export async function saveSiteContent(values: SiteContentValues, userId: string | null) {
  const client = getSupabaseClient();
  const updatedAt = new Date().toISOString();

  const rows = Object.entries(values).map(([content_key, value]) => ({
    content_key,
    updated_at: updatedAt,
    updated_by: userId,
    value,
  }));

  return client
    .from("site_content")
    .upsert(rows, { onConflict: "content_key" })
    .select("content_key,value")
    .returns<SiteContentItem[]>();
}

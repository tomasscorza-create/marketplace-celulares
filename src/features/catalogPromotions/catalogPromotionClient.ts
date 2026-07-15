import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  CatalogPromotion,
  CatalogPromotionClaim,
  CatalogPromotionInput,
} from "@/types/catalogPromotions";

const PROMOTION_BUCKET = "catalog-promotions";
const promotionSelection = [
  "action_label",
  "action_type",
  "action_url",
  "benefit_type",
  "benefit_value",
  "body",
  "created_at",
  "created_by",
  "ends_at",
  "id",
  "image_path",
  "image_url",
  "is_active",
  "kind",
  "max_claims",
  "minimum_order_amount",
  "product_id",
  "sort_order",
  "starts_at",
  "title",
  "updated_at",
  "products(id,title,image_url,image_urls,price,is_active)",
].join(",");

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

export function getPublicCatalogPromotions() {
  return getSupabaseClient()
    .from("catalog_promotions")
    .select(promotionSelection)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .returns<CatalogPromotion[]>();
}

export function getAdminCatalogPromotions() {
  return getSupabaseClient()
    .from("catalog_promotions")
    .select(promotionSelection)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .returns<CatalogPromotion[]>();
}

export function getCatalogPromotionClaims(promotionIds: string[]) {
  if (promotionIds.length === 0) {
    return Promise.resolve({ data: [] as CatalogPromotionClaim[], error: null });
  }

  return getSupabaseClient()
    .from("catalog_promotion_claims")
    .select(
      "id,promotion_id,profile_id,status,claimed_at,redeemed_at,benefit_type,benefit_value,minimum_order_amount,promotion_title",
    )
    .in("promotion_id", promotionIds)
    .returns<CatalogPromotionClaim[]>();
}

export function createCatalogPromotion(input: CatalogPromotionInput) {
  return getSupabaseClient()
    .from("catalog_promotions")
    .insert(input)
    .select(promotionSelection)
    .single<CatalogPromotion>();
}

export function updateCatalogPromotion(id: string, input: CatalogPromotionInput) {
  return getSupabaseClient()
    .from("catalog_promotions")
    .update(input)
    .eq("id", id)
    .select(promotionSelection)
    .single<CatalogPromotion>();
}

export function deleteCatalogPromotion(id: string) {
  return getSupabaseClient().from("catalog_promotions").delete().eq("id", id);
}

export function claimCatalogPromotion(promotionId: string) {
  return getSupabaseClient()
    .rpc("claim_catalog_promotion", { p_promotion_id: promotionId })
    .single<CatalogPromotionClaim>();
}

export async function uploadCatalogPromotionImage(file: File) {
  const client = getSupabaseClient();
  const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
  const uploadResponse = await client.storage.from(PROMOTION_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (uploadResponse.error) return { data: null, error: uploadResponse.error };

  const { data } = client.storage.from(PROMOTION_BUCKET).getPublicUrl(path);
  return { data: { path, publicUrl: data.publicUrl }, error: null };
}

export function removeCatalogPromotionImage(path: string) {
  return getSupabaseClient().storage.from(PROMOTION_BUCKET).remove([path]);
}

export type CatalogPromotionKind =
  | "discount"
  | "coupon"
  | "product"
  | "image"
  | "message";

export type CatalogPromotionActionType =
  | "none"
  | "claim"
  | "product"
  | "internal_link"
  | "external_link";

export type CatalogPromotionBenefitType = "percentage" | "fixed_amount";

export type CatalogPromotionProduct = {
  id: string;
  image_url: string | null;
  image_urls: string[];
  is_active: boolean;
  price: number;
  title: string;
};

export type CatalogPromotion = {
  action_label: string | null;
  action_type: CatalogPromotionActionType;
  action_url: string | null;
  benefit_type: CatalogPromotionBenefitType | null;
  benefit_value: number | null;
  body: string | null;
  created_at: string;
  created_by: string | null;
  ends_at: string | null;
  id: string;
  image_path: string | null;
  image_url: string | null;
  is_active: boolean;
  kind: CatalogPromotionKind;
  max_claims: number | null;
  minimum_order_amount: number | null;
  product_id: string | null;
  products?: CatalogPromotionProduct | null;
  sort_order: number;
  starts_at: string | null;
  title: string;
  updated_at: string;
};

export type CatalogPromotionClaim = {
  benefit_type: CatalogPromotionBenefitType;
  benefit_value: number;
  claimed_at: string;
  id: string;
  minimum_order_amount: number | null;
  profile_id: string;
  promotion_id: string;
  promotion_title: string;
  redeemed_at: string | null;
  status: "available" | "redeemed" | "expired" | "cancelled";
};

export type CatalogPromotionInput = Omit<
  CatalogPromotion,
  "created_at" | "id" | "products" | "updated_at"
>;

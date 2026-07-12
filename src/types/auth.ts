export type ProfileRole = "admin" | "artisan" | "buyer";

export type UserProfile = {
  buyer_profile_bio?: string | null;
  id: string;
  full_name: string;
  email: string;
  role: ProfileRole;
  storefront_boost_multiplier?: number | null;
  storefront_boosted_at?: string | null;
  storefront_control_updated_at?: string | null;
  storefront_hidden_at?: string | null;
  store_name: string | null;
  store_description: string | null;
  profile_image_url: string | null;
  storefront_theme_color: string | null;
  created_at: string;
};

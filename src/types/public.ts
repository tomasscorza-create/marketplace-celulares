import type {
  ProductAvailabilityMode,
  ProductOptionGroup,
  ProductSelectionChoice,
} from "./productAvailability";
import type { ProductAttribute } from "./productAttributes";
import type { ProductMediaItem } from "./productMedia";

export type PublicArtisanStorefront = {
  created_at: string;
  full_name: string;
  id: string;
  profile_image_url: string | null;
  storefront_boost_multiplier?: number | null;
  storefront_boosted_at?: string | null;
  storefront_hidden_at?: string | null;
  store_description: string | null;
  store_name: string | null;
  storefront_theme_color: string | null;
};

export type PublicBuyerProfile = {
  bio_source?: "buyer_profile_bio" | "store_description";
  created_at: string;
  full_name: string;
  id: string;
  last_order_at: string | null;
  orders_count: number;
  profile_bio: string | null;
  profile_image_url: string | null;
};

export type PublicProduct = {
  artisan_id: string;
  catalog_boost_active?: boolean | null;
  category_id: string;
  created_at: string;
  description: string;
  id: string;
  image_url: string | null;
  image_urls: string[];
  product_media: ProductMediaItem[];
  product_attributes?: ProductAttribute[];
  is_active: boolean;
  lead_time_days: number | null;
  made_to_order_options: ProductOptionGroup[];
  price: number;
  stock_quantity: number | null;
  title: string;
  availability_mode: ProductAvailabilityMode;
  categories?: {
    name: string;
  } | null;
};

export type CartProductSelectionInput = {
  configurationKey: string;
  leadTimeDays: number | null;
  selectedOptions: ProductSelectionChoice[];
  selectedOptionsSummary: string | null;
  unitPrice: number;
};

export type PublicCategory = {
  id: string;
  name: string;
  slug: string;
};

export type PublicStorefrontsPage = {
  items: PublicArtisanStorefront[];
  totalCount: number;
};

export type PublicCatalogSortOrder = "newest" | "price-asc" | "price-desc";

export type PublicCatalogFeedItem = {
  isBoosted: boolean;
  product: PublicProduct;
  storefront: PublicArtisanStorefront | null;
};

export type PublicCatalogProductFeedPage = {
  items: PublicCatalogFeedItem[];
  totalCount: number;
};

export type PublicCatalogStorefrontGroup = {
  matching_products_count: number;
  products: PublicProduct[];
  storefront: PublicArtisanStorefront;
};

export type PublicCatalogStorefrontGroupsPage = {
  items: PublicCatalogStorefrontGroup[];
  totalCount: number;
};

export type PublicCatalogStorefrontSuggestions = {
  discoveryStorefronts: PublicArtisanStorefront[];
  featuredStorefronts: PublicArtisanStorefront[];
};

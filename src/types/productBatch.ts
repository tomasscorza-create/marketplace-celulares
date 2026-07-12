import type { ProductMediaItem } from "./productMedia";
import type { ProductAvailabilityMode, ProductOptionGroup } from "./productAvailability";
import type { ProductAttribute } from "./productAttributes";

export type ProductBatch = {
  artisan_id: string;
  availability_mode_base: ProductAvailabilityMode;
  batch_code: string;
  category_id: string;
  created_at: string;
  created_by: string | null;
  description_base: string;
  id: string;
  is_active_base: boolean;
  item_count: number;
  lead_time_days_base: number | null;
  made_to_order_options_base: ProductOptionGroup[];
  price_base: number;
  product_attributes_base: ProductAttribute[];
  stock_quantity_base: number | null;
  title_base: string;
  updated_at: string;
};

export type ProductBatchItemInput = {
  description: string;
  existing_product_id?: string | null;
  image_description: string;
  image_url: string;
  product_media?: ProductMediaItem[];
  position: number;
  price: number;
  stock_quantity: number | null;
  title: string;
};

export type ProductBatchInput = {
  availability_mode_base: ProductAvailabilityMode;
  category_id: string;
  description_base: string;
  is_active_base: boolean;
  items: ProductBatchItemInput[];
  lead_time_days_base: number | null;
  made_to_order_options_base: ProductOptionGroup[];
  price_base: number;
  product_attributes_base: ProductAttribute[];
  stock_quantity_base: number | null;
  title_base: string;
};

export type ProductBatchMutationResult = {
  batch_code: string;
  batch_id: string;
  created_count: number;
  deleted_count: number;
  obsolete_image_urls: string[];
  product_ids: string[];
  updated_count: number;
};

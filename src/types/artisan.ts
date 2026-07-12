import type { ProductAvailabilityMode, ProductOptionGroup } from "./productAvailability";
import type { ProductAttribute } from "./productAttributes";
import type { ProductMediaItem } from "./productMedia";
import type { DeliveryType, FulfillmentStatus, PaymentStatus } from "./commerce";

export type ArtisanCategory = {
  id: string;
  name: string;
};

export type ArtisanProduct = {
  id: string;
  artisan_id: string;
  batch_code: string | null;
  batch_id: string | null;
  batch_position: number | null;
  category_id: string;
  created_via_batch: boolean;
  created_at: string;
  description: string;
  image_url: string | null;
  image_urls: string[];
  product_media: ProductMediaItem[];
  product_attributes: ProductAttribute[];
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

export type ArtisanSaleItem = {
  artisan_id: string;
  availability_mode: ProductAvailabilityMode;
  category_name: string | null;
  created_at: string;
  fulfillment_status: FulfillmentStatus;
  id: string;
  lead_time_days: number | null;
  order_id: string;
  product_id: string;
  product_image_url: string | null;
  product_title: string;
  quantity: number;
  selected_options_summary: string | null;
  store_name: string | null;
  unit_price: number;
  subtotal: number;
  orders?: {
    buyer_email: string | null;
    buyer_name: string;
    buyer_phone: string;
    created_at: string;
    delivery_address: string | null;
    delivery_notes: string | null;
    delivery_type: DeliveryType;
    fulfillment_status: FulfillmentStatus;
    id: string;
    paid_at: string | null;
    payment_status: PaymentStatus;
    shipping_amount: number;
    status: string;
    subtotal_amount: number;
    total_amount: number;
  } | null;
  products?: {
    title: string;
  } | null;
};

export type ArtisanStoreProfileInput = {
  full_name: string;
  profile_image_url: string;
  store_description: string;
  store_name: string;
  storefront_theme_color: string;
};

export type ArtisanProductInput = {
  batch_code?: string | null;
  batch_id?: string | null;
  batch_position?: number | null;
  category_id: string;
  created_via_batch?: boolean;
  description: string;
  image_urls: string[];
  product_media: ProductMediaItem[];
  product_attributes: ProductAttribute[];
  is_active: boolean;
  lead_time_days: number | null;
  made_to_order_options: ProductOptionGroup[];
  price: number;
  stock_quantity: number | null;
  title: string;
  availability_mode: ProductAvailabilityMode;
};

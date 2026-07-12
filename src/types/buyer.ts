import type { DeliveryType, OrderRecord } from "./commerce";
import type { PublicProduct } from "./public";

export type BuyerShippingAddressDetails = {
  apartment: string;
  area: string;
  cityId?: string;
  cityName?: string;
  city: string;
  floor: string;
  latitude?: number | null;
  longitude?: number | null;
  number: string;
  provinceId?: string;
  provinceName?: string;
  reference: string;
  street: string;
  unit?: string;
};

export type BuyerProfileInput = {
  delivery_notes: string;
  full_name: string;
  phone: string;
  profile_description: string;
  profile_image_url: string;
  preferred_delivery_type: DeliveryType;
  shipping_address: string;
  shipping_address_details?: BuyerShippingAddressDetails | null;
};

export type BuyerPreferenceRecord = {
  buyer_id: string;
  created_at: string | null;
  delivery_notes: string | null;
  phone: string | null;
  preferred_delivery_type: DeliveryType;
  shipping_address: string | null;
  shipping_address_details?: BuyerShippingAddressDetails | null;
  shipping_latitude?: number | null;
  shipping_longitude?: number | null;
  updated_at: string | null;
};

export type BuyerFavoriteRecord = {
  buyer_id: string;
  created_at: string;
  id: string;
  product: PublicProduct | null;
  product_id: string;
};

export type BuyerAccountSummary = {
  active_cart_items: number;
  favorites_count: number;
  last_order_at: string | null;
  open_orders_count: number;
  orders_count: number;
  paid_orders_count: number;
  pending_payment_count: number;
  preparing_orders_count: number;
  ready_orders_count: number;
  total_spent: number;
};

export type BuyerPersonalizationSignals = {
  recentArtisanIds: string[];
  recentCategoryIds: string[];
  recentProductIds: string[];
  recentSearches: string[];
};

export type BuyerAccountData = {
  favorites: BuyerFavoriteRecord[];
  orders: OrderRecord[];
  preferences: BuyerPreferenceRecord | null;
  summary: BuyerAccountSummary;
};

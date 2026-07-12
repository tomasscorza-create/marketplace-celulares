import type {
  ProductAvailabilityMode,
  ProductOptionGroup,
  ProductSelectionChoice,
} from "./productAvailability";
import type { ProductMediaItem } from "./productMedia";

export type CartStatus = "active" | "converted" | "abandoned";

export type OrderStatus =
  | "draft"
  | "pending"
  | "paid"
  | "confirmed"
  | "cancelled"
  | "refunded"
  | "failed";

export type PaymentStatus =
  | "pending"
  | "approved"
  | "authorized"
  | "in_process"
  | "rejected"
  | "cancelled"
  | "refunded"
  | "charged_back";

export type FulfillmentStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "delivered"
  | "cancelled";

export type CheckoutProvider = "mercadopago";

export type DeliveryType = "arrange_with_seller" | "pickup" | "shipping";

export type CartItemRecord = {
  availability_mode: ProductAvailabilityMode;
  configuration_key: string;
  id: string;
  cart_id: string;
  product_id: string;
  artisan_id: string;
  lead_time_days: number | null;
  quantity: number;
  selected_options: ProductSelectionChoice[];
  selected_options_summary: string | null;
  unit_price: number;
  product_title: string;
  product_image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type CartRecord = {
  id: string;
  buyer_id: string;
  status: CartStatus;
  converted_order_id: string | null;
  created_at: string;
  updated_at: string;
  items?: CartItemRecord[];
};

export type OrderItemRecord = {
  availability_mode: ProductAvailabilityMode;
  fulfillment_status: FulfillmentStatus;
  id: string;
  order_id: string;
  product_id: string;
  artisan_id: string;
  lead_time_days: number | null;
  quantity: number;
  selected_options: ProductSelectionChoice[];
  selected_options_summary: string | null;
  stock_applied_at: string | null;
  unit_price: number;
  subtotal: number;
  product_title: string;
  product_description: string | null;
  product_image_url: string | null;
  category_name: string | null;
  artisan_name: string | null;
  store_name: string | null;
  created_at: string;
};

export type OrderRecord = {
  id: string;
  buyer_id: string | null;
  buyer_name: string;
  buyer_email: string | null;
  buyer_phone: string;
  delivery_address?: string | null;
  subtotal_amount: number;
  shipping_amount: number;
  fees_amount: number;
  total_amount: number;
  currency: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  delivery_type: DeliveryType;
  delivery_notes: string | null;
  checkout_provider: CheckoutProvider | null;
  external_reference: string | null;
  mercadopago_preference_id: string | null;
  mercadopago_payment_id: string | null;
  mercadopago_merchant_order_id: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItemRecord[];
};

export type PaymentAttemptRecord = {
  id: string;
  order_id: string;
  provider: CheckoutProvider;
  status: PaymentStatus | "created" | "failed";
  external_reference: string;
  preference_id: string | null;
  payment_id: string | null;
  merchant_order_id: string | null;
  checkout_url: string | null;
  amount: number;
  currency: string;
  raw_payload: Record<string, unknown>;
  last_webhook_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentWebhookEventRecord = {
  id: string;
  provider: CheckoutProvider;
  event_type: string;
  action: string | null;
  resource_id: string | null;
  external_event_id: string | null;
  payload: Record<string, unknown>;
  headers: Record<string, unknown>;
  processed_at: string | null;
  processing_error: string | null;
  created_at: string;
};

export type OrderEventActorRole = "admin" | "artisan" | "buyer" | "system";

export type OrderEventRecord = {
  actor_id: string | null;
  actor_role: OrderEventActorRole;
  created_at: string;
  event_type: string;
  id: string;
  message: string | null;
  metadata: Record<string, unknown>;
  order_id: string;
  order_item_id: string | null;
};

export type CreateCheckoutRequest = {
  buyerPhone?: string;
  deliveryType?: DeliveryType;
  deliveryNotes?: string;
  shippingAddress?: string;
  shippingLatitude?: number;
  shippingLongitude?: number;
  shippingProvinceName?: string;
  returnOrigin?: string;
};

export type CreateCheckoutResponse = {
  checkoutUrl: string;
  externalReference: string;
  mercadoPagoEnvironment?: "test" | "production";
  orderId: string;
  paymentAttemptId: string;
  preferenceId: string;
  sandboxCheckoutUrl: string | null;
};

export type BuyerCartValidationStatus = "ready" | "warning" | "error";

export type BuyerCartValidatedItem = {
  artisan_id: string;
  artisan_name: string | null;
  availability_mode: ProductAvailabilityMode;
  blockers: string[];
  cart_item_id: string;
  category_name: string | null;
  configuration_key: string;
  effective_lead_time_days: number | null;
  effective_line_total: number;
  effective_unit_price: number;
  id: string;
  is_active: boolean;
  live_stock_quantity: number | null;
  made_to_order_options: ProductOptionGroup[];
  notices: string[];
  product_base_price: number;
  product_id: string;
  product_image_urls: string[];
  product_image_url: string | null;
  product_media: ProductMediaItem[];
  product_title: string;
  quantity: number;
  selected_options: ProductSelectionChoice[];
  selected_options_summary: string | null;
  status: BuyerCartValidationStatus;
  store_name: string | null;
};

export type BuyerCartValidation = {
  active_seller_count: number;
  can_checkout: boolean;
  checkout_blockers: string[];
  checkout_notices: string[];
  items: BuyerCartValidatedItem[];
  missing_phone: boolean;
  missing_shipping_address: boolean;
  ready_items_count: number;
  warning_items_count: number;
  error_items_count: number;
  total_amount: number;
  total_items: number;
};

import type {
  DeliveryType,
  FulfillmentStatus,
  PaymentStatus,
} from "./commerce";
import type { ProductAvailabilityMode } from "./productAvailability";

export type AdminCategory = {
  created_at: string;
  id: string;
  is_active: boolean;
  name: string;
  slug: string;
};

export type AdminDashboardProduct = {
  artisan_id: string;
  batch_code: string | null;
  batch_id: string | null;
  categories?: {
    name: string;
  } | null;
  created_at: string;
  id: string;
  image_url: string | null;
  is_active: boolean;
  price: number;
  stock_quantity: number | null;
  title: string;
};

export type AdminProductControlTag =
  | "destacado up"
  | "prueba/test"
  | "bajar prioridad"
  | "ocultar total";

export type AdminProductControlBoostLevel = "medio" | "moderado" | "maximo";

export type AdminProductControlProduct = {
  artisan_id: string;
  availability_mode: "made_to_order" | "stock";
  batch_code: string | null;
  batch_id: string | null;
  categories?: {
    name: string;
  } | null;
  created_at: string;
  description: string;
  id: string;
  image_url: string | null;
  is_active: boolean;
  lead_time_days: number | null;
  price: number;
  stock_quantity: number | null;
  title: string;
};

export type AdminProductControlSale = {
  created_at: string;
  id: string;
  product_id: string;
  quantity: number;
  subtotal: number;
};

export type AdminProductControlRecord = {
  boost_level: AdminProductControlBoostLevel | null;
  boost_until: string | null;
  comment: string | null;
  internal_tag: AdminProductControlTag | null;
  product_id: string;
  updated_at: string;
};

export type AdminDashboardSale = {
  artisan_id: string;
  created_at: string;
  id: string;
  product_title: string;
  quantity: number;
  subtotal: number;
};

export type AdminSalesStatusFilter = "approved" | "pending" | "rejected";
export type AdminApprovedSalesFulfillmentFilter = "in_process" | "completed";
export type AdminBillingPeriod = "all" | "30d" | "7d";

export type AdminBillingOrder = {
  created_at: string;
  id: string;
  payment_status: PaymentStatus;
  shipping_amount: number;
  subtotal_amount: number;
  total_amount: number;
};

export type AdminBillingItem = {
  artisan_id: string;
  artisan_name: string | null;
  created_at: string;
  id: string;
  order_id: string;
  product_title: string;
  quantity: number;
  store_name: string | null;
  subtotal: number;
};

export type AdminBillingSellerSummary = {
  artisanId: string;
  averageOrderAmount: number;
  itemsCount: number;
  lastSaleAt: string | null;
  ordersCount: number;
  productRevenue: number;
  sellerName: string;
  unitsSold: number;
};

export type AdminBillingSnapshot = {
  averageOrderAmount: number;
  generatedAt: string;
  itemsCount: number;
  ordersCount: number;
  period: AdminBillingPeriod;
  productRevenue: number;
  sellers: AdminBillingSellerSummary[];
  sellersCount: number;
  shippingRevenue: number;
  totalRevenue: number;
  unitsSold: number;
};

export type AdminSalesOrder = {
  buyer_email: string | null;
  buyer_id: string | null;
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
};

export type AdminSalesItem = {
  artisan_id: string;
  artisan_name: string | null;
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
  subtotal: number;
  unit_price: number;
  orders?: AdminSalesOrder | null;
};

export type AdminArtisanMovementItem = {
  created_at: string;
  id: string;
  order_id: string;
  product_title: string;
  quantity: number;
  subtotal: number;
  orders?: {
    buyer_name: string;
    created_at: string;
    id: string;
    payment_status: PaymentStatus;
    status: string;
    total_amount: number;
  } | null;
};

export type AdminArtisanMovementsSnapshot = {
  items: AdminArtisanMovementItem[];
  totalCount: number;
};

export type AdminArtisanProfileControlsInput = {
  storefront_boost_multiplier: number;
  storefront_boosted_at: string | null;
  storefront_hidden_at: string | null;
};

export type AdminCategoryInput = {
  is_active: boolean;
  name: string;
  slug: string;
};

export type AdminArtisanProfile = {
  created_at: string;
  email: string;
  full_name: string;
  id: string;
  profile_image_url: string | null;
  role: "artisan";
  storefront_boost_multiplier?: number | null;
  storefront_boosted_at?: string | null;
  storefront_control_updated_at?: string | null;
  storefront_hidden_at?: string | null;
  store_description: string | null;
  store_name: string | null;
  storefront_theme_color: string | null;
};

export type AdminBuyerProfile = {
  buyer_profile_bio?: string | null;
  created_at: string;
  email: string;
  full_name: string;
  id: string;
  profile_image_url: string | null;
  role: "buyer";
};

export type AdminBuyerAccountSummary = {
  created_at: string;
  email: string;
  favoritesCount: number;
  full_name: string;
  hasPhone: boolean;
  hasShippingAddress: boolean;
  id: string;
  interestTerms: string[];
  lastActivityAt: string | null;
  lastOrderAt: string | null;
  openOrdersCount: number;
  ordersCount: number;
  paidOrdersCount: number;
  preferredDeliveryType: string | null;
  profile_image_url: string | null;
  totalSpent: number;
};

export type AdminBuyerAccountsSnapshot = {
  buyers: AdminBuyerAccountSummary[];
  buyersCount: number;
};

export type AdminArtisanProfileInput = {
  email: string;
  full_name: string;
  password: string;
  profile_image_url: string;
  store_description: string;
  store_name: string;
  storefront_theme_color: string;
};

export type AdminArtisanProfileUpdateInput = Omit<AdminArtisanProfileInput, "password"> & {
  password?: string;
};

export type AdminArtisanDeleteResult = {
  cleanupWarning?: string | null;
  deletedProfileId: string;
};

export type AdminDashboardSnapshot = {
  artisans: AdminArtisanProfile[];
  buyers: AdminBuyerProfile[];
  categories: AdminCategory[];
  productsCount: number;
  products: AdminDashboardProduct[];
  salesCount: number;
  sales: AdminDashboardSale[];
  visibleProductsCount: number;
  warningMessage: string | null;
};

export type AdminProductControlSnapshot = {
  artisans: AdminArtisanProfile[];
  controlRecords: AdminProductControlRecord[];
  productsCount: number;
  products: AdminProductControlProduct[];
  salesCount: number;
  sales: AdminProductControlSale[];
  warningMessage: string | null;
};

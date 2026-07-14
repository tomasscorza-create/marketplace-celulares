export const queryKeys = {
  admin: {
    analyticsOverview: (days: number) => ["admin", "analytics-overview", days] as const,
    analyticsUserHistory: (userId: string) => ["admin", "analytics-user-history", userId] as const,
    categories: ["admin", "categories"] as const,
    artisanProfiles: ["admin", "artisan-profiles"] as const,
    artisanProfile: (artisanId: string) => ["admin", "artisan-profile", artisanId] as const,
    artisanMovements: (artisanId: string) => ["admin", "artisan-movements", artisanId] as const,
    billingSnapshot: (period: string) => ["admin", "billing-snapshot", period] as const,
    buyerAccountsSnapshot: ["admin", "buyer-accounts-snapshot"] as const,
    dashboardSnapshot: ["admin", "dashboard-snapshot"] as const,
    dashboardProducts: ["admin", "dashboard-products"] as const,
    dashboardSales: ["admin", "dashboard-sales"] as const,
    productControlSnapshot: ["admin", "product-control-snapshot"] as const,
    productControlProducts: ["admin", "product-control-products"] as const,
    productControlSales: ["admin", "product-control-sales"] as const,
    productControlTags: ["admin", "product-control-tags"] as const,
    internalNotifications: ["admin", "internal-notifications"] as const,
  },
  buyer: {
    accountSummary: (buyerId: string) => ["buyer", "account-summary", buyerId] as const,
    cart: (buyerId: string) => ["buyer", "cart", buyerId] as const,
    cartValidation: (buyerId: string) => ["buyer", "cart-validation", buyerId] as const,
    favorites: (buyerId: string) => ["buyer", "favorites", buyerId] as const,
    order: (buyerId: string, orderId: string) => ["buyer", "order", buyerId, orderId] as const,
    orderEvents: (buyerId: string, orderId: string) =>
      ["buyer", "order-events", buyerId, orderId] as const,
    orders: (buyerId: string) => ["buyer", "orders", buyerId] as const,
    preferences: (buyerId: string) => ["buyer", "preferences", buyerId] as const,
  },
  artisan: {
    categories: ["artisan", "categories"] as const,
    product: (productId: string) => ["artisan", "product", productId] as const,
    productLearning: (artisanId: string) => ["artisan", "product-learning", artisanId] as const,
    products: (artisanId: string) => ["artisan", "products", artisanId] as const,
    productStats: (artisanId: string) => ["artisan", "product-stats", artisanId] as const,
    sales: (artisanId: string) => ["artisan", "sales", artisanId] as const,
    internalNotifications: (artisanId: string) =>
      ["artisan", "internal-notifications", artisanId] as const,
    pendingInternalNotifications: (artisanId: string) =>
      ["artisan", "pending-internal-notifications", artisanId] as const,
  },
  auth: {
    profile: (userId: string) => ["auth", "profile", userId] as const,
  },
  categorySpecs: {
    template: (categoryId: string) => ["category-specs", "template", categoryId] as const,
  },
  siteContent: {
    items: (contentKeys: string[]) => ["site-content", [...contentKeys].sort()] as const,
  },
  public: {
    artisanProducts: (artisanId: string) => ["public", "artisan-products", artisanId] as const,
    categories: ["public", "categories"] as const,
    product: (productId: string) => ["public", "product", productId] as const,
    buyerProfile: (buyerId: string) => ["public", "buyer-profile", buyerId] as const,
    storefront: (artisanId: string) => ["public", "storefront", artisanId] as const,
    storefronts: (params?: { limit?: number }) => ["public", "storefronts", params ?? {}] as const,
    storefrontsPage: (params: { limit: number; page: number; search?: string }) =>
      ["public", "storefronts-page", params] as const,
    storefrontsByIds: (artisanIds: string[]) => ["public", "storefronts-by-ids", artisanIds] as const,
    catalogProductFeedInfinite: (params: {
      categoryId?: string | null;
      limit: number;
      search?: string;
      sort: "newest" | "price-asc" | "price-desc";
    }) => ["public", "catalog-product-feed-infinite", params] as const,
    catalogStorefrontGroupsPage: (params: {
      categoryId?: string | null;
      limit: number;
      page: number;
      productsPerStorefront: number;
      search?: string;
    }) => ["public", "catalog-storefront-groups-page", params] as const,
    catalogStorefrontSuggestions: (params: {
      categoryId?: string | null;
      discoveryLimit: number;
      featuredLimit: number;
      search?: string;
    }) => ["public", "catalog-storefront-suggestions", params] as const,
    completeCatalogStorefrontGroupsPage: (params: {
      categoryId?: string | null;
      limit: number;
      page: number;
      productsPerStorefront: number;
      search?: string;
    }) => ["public", "complete-catalog-storefront-groups-page", params] as const,
  },
} as const;

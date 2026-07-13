export const marketplaceConfig = {
  appName: "Mercado Base",
  appShortName: "Base",
  catalogName: "Catalogo base",
  defaultPublicUrl: "http://localhost:5173",
  description: "Plataforma base para publicar tiendas, explorar productos y probar flujos comerciales.",
  logoPath: "/brand-mark.svg",
  sellerLabelPlural: "vendedores",
  sellerProfileLabelPlural: "perfiles de vendedores",
  storageNamespace: "neutral-marketplace",
  // Canal de venta activo. "whatsapp" oculta carrito/checkout de la UI
  // (el código y el backend quedan intactos); "checkout" restaura la compra online.
  salesChannel: "whatsapp" as "whatsapp" | "checkout",
  // Numero de WhatsApp.
  whatsappPhone: "3518037869",
} as const;

export const isOnlinePurchaseEnabled = marketplaceConfig.salesChannel === "checkout";

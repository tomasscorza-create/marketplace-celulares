export const marketplaceConfig = {
  appName: "Nyzca",
  appShortName: "Nyzca",
  catalogName: "Catálogo Nyzca",
  defaultPublicUrl: "http://localhost:5173",
  description: "Nyzca — Marketplace premium de celulares y accesorios.",
  logoPath: "/brand-mark.svg",
  sellerLabelPlural: "vendedores",
  sellerProfileLabelPlural: "perfiles de vendedores",
  storageNamespace: "neutral-marketplace",
  // Canal de venta activo. "whatsapp" oculta carrito/checkout de la UI
  // (el código y el backend quedan intactos); "checkout" restaura la compra online.
  salesChannel: "whatsapp" as "whatsapp" | "checkout",
  // Numero de WhatsApp por defecto, usado por flujos que no ofrecen eleccion
  // de contacto (p. ej. ayuda post-compra en el carrito y en el pedido).
  whatsappPhone: "3518037869",
  // Contactos entre los que puede elegir quien consulta o pide un producto
  // por WhatsApp. El primero coincide con whatsappPhone.
  whatsappContacts: [
    { name: "Tomas", phone: "3518037869" },
    { name: "Ulises", phone: "3547452834" },
  ],
} as const;

export const isOnlinePurchaseEnabled = marketplaceConfig.salesChannel === "checkout";

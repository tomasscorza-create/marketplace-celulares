import { isOnlinePurchaseEnabled } from "../config/marketplace";
import { PanelLayoutShell } from "./PanelLayoutShell";

export function BuyerLayout() {
  const buyerLinks = isOnlinePurchaseEnabled ? [
    { to: "/panel/comprador", label: "Mis pedidos", end: true },
    { to: "/perfil/cliente", label: "Perfil" },
    { to: "/panel/comprador/carrito", label: "Carrito" },
  ] : [
    { to: "/perfil/cliente", label: "Perfil" },
  ];

  return (
    <PanelLayoutShell
      accentClassName="text-brand-600"
      activeLinkClassName="bg-brand-500 text-stone-900"
      backgroundClassName="bg-gradient-to-b from-brand-50 to-stone-50"
      borderClassName="border-brand-100"
      inactiveLinkClassName="text-stone-600 hover:bg-brand-50 hover:text-brand-600"
      links={buyerLinks}
      title="Mi espacio"
    />
  );
}

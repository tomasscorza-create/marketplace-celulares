import { PanelLayoutShell } from "./PanelLayoutShell";

const adminLinks = [
  { to: "/panel/admin", label: "Inicio", end: true },
  { to: "/panel/admin/ventas", label: "Ventas" },
  { to: "/panel/admin/facturacion", label: "Facturacion" },
  { to: "/panel/admin/productos", label: "Productos" },
  { to: "/panel/admin/vendedores", label: "Vendedores" },
  { to: "/panel/admin/notificaciones", label: "Notificaciones" },
  { to: "/panel/admin/categorias", label: "Categorías" },
];

export function AdminLayout() {
  return (
    <PanelLayoutShell
      accentClassName="text-ocean-500"
      activeLinkClassName="bg-brand-500 text-white"
      backgroundClassName="bg-[radial-gradient(circle_at_top,_#e0f2fe,_#f8fafc_55%)]"
      borderClassName="border-ocean-100"
      inactiveLinkClassName="text-stone-600 hover:bg-ocean-50 hover:text-ocean-500"
      links={adminLinks}
      title="Panel Admin"
    />
  );
}

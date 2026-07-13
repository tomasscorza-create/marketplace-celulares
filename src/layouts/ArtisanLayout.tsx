import { PanelLayoutShell } from "./PanelLayoutShell";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import { getArtisanPendingFulfillmentCount } from "../features/artisan/artisanClient";
import { useAuth } from "../features/auth/useAuth";
import { useArtisanPendingInternalNotificationCount } from "../features/internalNotifications/internalNotificationsQueries";

const artisanLinks = [
  { to: "/panel/vendedor", label: "Resumen", end: true },
  { to: "/panel/vendedor/tienda", label: "Mi tienda" },
  { to: "/panel/vendedor/productos", label: "Productos" },
  { to: "/panel/vendedor/ventas", label: "Ventas" },
  { to: "/panel/vendedor/notificaciones", label: "Notificaciones" },
];

export function ArtisanLayout() {
  const { profile, user } = useAuth();
  const [pendingFulfillmentCount, setPendingFulfillmentCount] = useState(0);
  const pendingNotificationsQuery = useArtisanPendingInternalNotificationCount(
    profile?.id,
    profile?.role === "artisan",
  );
  const pendingNotificationCount = pendingNotificationsQuery.data ?? 0;

  useEffect(() => {
    if (!user) {
      setPendingFulfillmentCount(0);
      return;
    }

    let isCancelled = false;

    const loadPendingCount = async () => {
      const response = await getArtisanPendingFulfillmentCount(user.id);

      if (!isCancelled && !response.error) {
        setPendingFulfillmentCount(response.count ?? 0);
      }
    };

    void loadPendingCount();
    const intervalId = window.setInterval(() => {
      void loadPendingCount();
    }, 60 * 1000);

    const handleFocus = () => {
      void loadPendingCount();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [user]);

  const links = useMemo(
    () =>
      artisanLinks.map((link) =>
        link.to === "/panel/vendedor/ventas"
          ? { ...link, badgeCount: pendingFulfillmentCount }
          : link.to === "/panel/vendedor/notificaciones"
            ? { ...link, badgeCount: pendingNotificationCount }
            : link,
      ),
    [pendingFulfillmentCount, pendingNotificationCount],
  );

  return (
    <PanelLayoutShell
      accentClassName="text-brand-500"
      activeLinkClassName="bg-brand-500 text-white"
      backgroundClassName="bg-[radial-gradient(circle_at_top,_#f0fdfa,_#f8fafc_50%)]"
      borderClassName="border-brand-100"
      inactiveLinkClassName="text-stone-600 hover:bg-brand-50 hover:text-brand-700"
      links={links}
      notice={
        pendingNotificationCount > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-brand-200 bg-brand-50 px-4 py-3 shadow-sm sm:px-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
                Notificaciones internas
              </p>
              <p className="mt-1 text-sm font-medium text-stone-900">
                Tenés {pendingNotificationCount} aviso{pendingNotificationCount === 1 ? "" : "s"} por firmar.
              </p>
            </div>
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
              to="/panel/vendedor/notificaciones"
            >
              Revisar
            </Link>
          </div>
        ) : pendingFulfillmentCount > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-brand-500 bg-brand-50 px-4 py-3 shadow-sm sm:px-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-500">
                Ventas pendientes
              </p>
              <p className="mt-1 text-sm font-medium text-stone-900">
                Tenés {pendingFulfillmentCount} producto{pendingFulfillmentCount === 1 ? "" : "s"} por gestionar.
              </p>
            </div>
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              to="/panel/vendedor/ventas"
            >
              Gestionar ventas
            </Link>
          </div>
        ) : null
      }
      title="Panel Vendedor"
    />
  );
}

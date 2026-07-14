import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";

import { AuthProvider } from "../features/auth/AuthProvider";
import { AnalyticsProvider } from "../features/analytics/AnalyticsProvider";
import { PwaUpdatePrompt } from "../lib/pwa/PwaUpdatePrompt";
import { AppQueryProvider } from "../lib/query/AppQueryProvider";
import { marketplaceConfig } from "../config/marketplace";
import { router } from "./router";

function getRouteTitle(pathname: string) {
  if (pathname === "/") return marketplaceConfig.appName;
  if (pathname.startsWith("/catalogo")) return `Catálogo — ${marketplaceConfig.appName}`;
  if (pathname.startsWith("/producto/")) return `Producto — ${marketplaceConfig.appName}`;
  if (pathname.startsWith("/tienda/")) return `Tienda — ${marketplaceConfig.appName}`;
  if (pathname.startsWith("/vendedores")) return `Vendedores — ${marketplaceConfig.appName}`;
  if (pathname.startsWith("/iniciar-sesion")) return `Iniciar sesión — ${marketplaceConfig.appName}`;
  if (pathname.startsWith("/registro")) return `Crear cuenta — ${marketplaceConfig.appName}`;
  if (pathname.startsWith("/panel/admin")) return `Administración — ${marketplaceConfig.appName}`;
  if (pathname.startsWith("/panel/vendedor")) return `Panel vendedor — ${marketplaceConfig.appName}`;
  if (pathname.startsWith("/cuenta")) return `Mi cuenta — ${marketplaceConfig.appName}`;
  return marketplaceConfig.appName;
}

export function App() {
  useEffect(() => {
    const updateTitle = () => {
      document.title = getRouteTitle(router.state.location.pathname);
    };

    updateTitle();
    return router.subscribe(updateTitle);
  }, []);

  return (
    <AppQueryProvider>
      <AuthProvider>
        <AnalyticsProvider>
          <RouterProvider router={router} />
          <PwaUpdatePrompt />
        </AnalyticsProvider>
      </AuthProvider>
    </AppQueryProvider>
  );
}

import type { ReactNode } from "react";

import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import { RouteErrorPage } from "../components/RouteErrorPage";
import { RouteLoader } from "../components/RouteLoader";
import { ProtectedRoute } from "../features/auth/ProtectedRoute";
import { isOnlinePurchaseEnabled } from "../config/marketplace";

const PublicLayout = lazy(async () => ({
  default: (await import("../layouts/PublicLayout")).PublicLayout,
}));
const ArtisanLayout = lazy(async () => ({
  default: (await import("../layouts/ArtisanLayout")).ArtisanLayout,
}));
const BuyerLayout = lazy(async () => ({
  default: (await import("../layouts/BuyerLayout")).BuyerLayout,
}));
const AdminLayout = lazy(async () => ({
  default: (await import("../layouts/AdminLayout")).AdminLayout,
}));

const CatalogPage = lazy(async () => ({
  default: (await import("../pages/CatalogPage")).CatalogPage,
}));
const CatalogForYouPage = lazy(async () => ({
  default: (await import("../pages/CatalogForYouPage")).CatalogForYouPage,
}));
const HomePage = lazy(async () => ({
  default: (await import("../pages/HomePage")).HomePage,
}));
const ArtisansPage = lazy(async () => ({
  default: (await import("../pages/ArtisansPage")).ArtisansPage,
}));
const ProductDetailPage = lazy(async () => ({
  default: (await import("../pages/ProductDetailPage")).ProductDetailPage,
}));
const ProductQuickEditPage = lazy(async () => ({
  default: (await import("../pages/ProductQuickEditPage")).ProductQuickEditPage,
}));
const ArtisanProfilePage = lazy(async () => ({
  default: (await import("../pages/ArtisanProfilePage")).ArtisanProfilePage,
}));
const LoginPage = lazy(async () => ({
  default: (await import("../pages/LoginPage")).LoginPage,
}));
const CheckoutSuccessPage = lazy(async () => ({
  default: (await import("../pages/CheckoutSuccessPage")).CheckoutSuccessPage,
}));
const CheckoutPendingPage = lazy(async () => ({
  default: (await import("../pages/CheckoutPendingPage")).CheckoutPendingPage,
}));
const CheckoutFailurePage = lazy(async () => ({
  default: (await import("../pages/CheckoutFailurePage")).CheckoutFailurePage,
}));
const RegistroPage = lazy(async () => ({
  default: (await import("../pages/RegistroPage")).RegistroPage,
}));
const RegistroCompradorPage = lazy(async () => ({
  default: (await import("../pages/RegistroCompradorPage")).RegistroCompradorPage,
}));
const RegistroVendedorPage = lazy(async () => ({
  default: (await import("../pages/RegistroVendedorPage")).RegistroVendedorPage,
}));
const PrivacyPage = lazy(async () => ({
  default: (await import("../pages/PrivacyPage")).PrivacyPage,
}));
const ArtisanDashboardPage = lazy(async () => ({
  default: (await import("../pages/ArtisanDashboardPage")).ArtisanDashboardPage,
}));
const ArtisanStorePage = lazy(async () => ({
  default: (await import("../pages/ArtisanStorePage")).ArtisanStorePage,
}));
const ArtisanProductsPage = lazy(async () => ({
  default: (await import("../pages/ArtisanProductsPage")).ArtisanProductsPage,
}));
const ArtisanSalesPage = lazy(async () => ({
  default: (await import("../pages/ArtisanSalesPage")).ArtisanSalesPage,
}));
const ArtisanInternalNotificationsPage = lazy(async () => ({
  default: (await import("../pages/ArtisanInternalNotificationsPage"))
    .ArtisanInternalNotificationsPage,
}));
const BuyerDashboardPage = lazy(async () => ({
  default: (await import("../pages/BuyerDashboardPage")).BuyerDashboardPage,
}));
const BuyerOrderDetailPage = lazy(async () => ({
  default: (await import("../pages/BuyerOrderDetailPage")).BuyerOrderDetailPage,
}));
const BuyerCartPage = lazy(async () => ({
  default: (await import("../pages/BuyerCartPage")).BuyerCartPage,
}));
const BuyerAccountPage = lazy(async () => ({
  default: (await import("../pages/BuyerAccountPage")).BuyerAccountPage,
}));
const BuyerContactPage = lazy(async () => ({
  default: (await import("../pages/BuyerContactPage")).BuyerContactPage,
}));
const BuyerProfilePage = lazy(async () => ({
  default: (await import("../pages/BuyerProfilePage")).BuyerProfilePage,
}));
const AdminDashboardPage = lazy(async () => ({
  default: (await import("../pages/AdminDashboardPage")).AdminDashboardPage,
}));
const AdminAnalyticsPage = lazy(async () => ({
  default: (await import("../pages/AdminAnalyticsPage")).AdminAnalyticsPage,
}));
const AdminCatalogPromotionsPage = lazy(async () => ({
  default: (await import("../pages/AdminCatalogPromotionsPage")).AdminCatalogPromotionsPage,
}));
const AdminSalesPage = lazy(async () => ({
  default: (await import("../pages/AdminSalesPage")).AdminSalesPage,
}));
const AdminBillingPage = lazy(async () => ({
  default: (await import("../pages/AdminBillingPage")).AdminBillingPage,
}));
const AdminCategoriesPage = lazy(async () => ({
  default: (await import("../pages/AdminCategoriesPage")).AdminCategoriesPage,
}));
const AdminArtisansPage = lazy(async () => ({
  default: (await import("../pages/AdminArtisansPage")).AdminArtisansPage,
}));
const AdminActiveArtisansPage = lazy(async () => ({
  default: (await import("../pages/AdminActiveArtisansPage")).AdminActiveArtisansPage,
}));
const AdminActiveBuyersPage = lazy(async () => ({
  default: (await import("../pages/AdminActiveBuyersPage")).AdminActiveBuyersPage,
}));
const AdminVisibleProductsPage = lazy(async () => ({
  default: (await import("../pages/AdminVisibleProductsPage")).AdminVisibleProductsPage,
}));
const AdminProductsPage = lazy(async () => ({
  default: (await import("../pages/AdminProductsPage")).AdminProductsPage,
}));
const AdminProductControlPage = lazy(async () => ({
  default: (await import("../pages/AdminProductControlPage")).AdminProductControlPage,
}));
const AdminInternalNotificationsPage = lazy(async () => ({
  default: (await import("../pages/AdminInternalNotificationsPage"))
    .AdminInternalNotificationsPage,
}));
const NotFoundPage = lazy(async () => ({
  default: (await import("../pages/NotFoundPage")).NotFoundPage,
}));

function withRouteLoader(node: ReactNode) {
  return <Suspense fallback={<RouteLoader />}>{node}</Suspense>;
}

function withCommerceGate(node: ReactNode) {
  if (!isOnlinePurchaseEnabled) {
    return <Navigate to="/catalogo" replace />;
  }
  return withRouteLoader(node);
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: withRouteLoader(<PublicLayout />),
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        element: withRouteLoader(<HomePage />),
      },
      {
        path: "catalogo",
        element: withRouteLoader(<CatalogPage />),
      },
      {
        path: "catalogo/para-vos",
        element: withRouteLoader(<CatalogForYouPage />),
      },
      {
        path: "vendedores",
        element: withRouteLoader(<ArtisansPage />),
      },
      {
        path: "producto/:id",
        element: withRouteLoader(<ProductDetailPage />),
      },
      {
        path: "vendedor/:id",
        element: withRouteLoader(<ArtisanProfilePage />),
      },
      {
        path: "login",
        element: withRouteLoader(<LoginPage />),
      },
      {
        path: "checkout/exito",
        element: withCommerceGate(<CheckoutSuccessPage />),
      },
      {
        path: "checkout/pendiente",
        element: withCommerceGate(<CheckoutPendingPage />),
      },
      {
        path: "checkout/fallo",
        element: withCommerceGate(<CheckoutFailurePage />),
      },
      {
        path: "cliente/:id",
        element: withRouteLoader(<BuyerProfilePage />),
      },
      {
        path: "registro",
        element: withRouteLoader(<RegistroPage />),
      },
      {
        path: "registro/comprador",
        element: withRouteLoader(<RegistroCompradorPage />),
      },
      {
        path: "registro/vendedor",
        element: withRouteLoader(<RegistroVendedorPage />),
      },
      {
        path: "privacidad",
        element: withRouteLoader(<PrivacyPage />),
      },
      {
        path: "perfil/cliente",
        element: (
          <ProtectedRoute allowedRoles={["buyer"]}>
            {withRouteLoader(<BuyerProfilePage />)}
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: "/panel/vendedor",
    errorElement: <RouteErrorPage />,
    element: (
      <ProtectedRoute allowedRoles={["artisan"]}>
        {withRouteLoader(<ArtisanLayout />)}
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: withRouteLoader(<ArtisanDashboardPage />),
      },
      {
        path: "tienda",
        element: withRouteLoader(<ArtisanStorePage />),
      },
      {
        path: "productos",
        element: withRouteLoader(<ArtisanProductsPage />),
      },
      {
        path: "productos/edicion-rapida/:productId",
        element: withRouteLoader(<ProductQuickEditPage />),
      },
      {
        path: "ventas",
        element: withRouteLoader(<ArtisanSalesPage />),
      },
      {
        path: "notificaciones",
        element: withRouteLoader(<ArtisanInternalNotificationsPage />),
      },
    ],
  },
  {
    path: "/panel/comprador",
    errorElement: <RouteErrorPage />,
    element: (
      <ProtectedRoute allowedRoles={["buyer"]}>
        {withRouteLoader(<BuyerLayout />)}
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: withCommerceGate(<BuyerDashboardPage />),
      },
      {
        path: "pedidos/:orderId",
        element: withCommerceGate(<BuyerOrderDetailPage />),
      },
      {
        path: "carrito",
        element: withCommerceGate(<BuyerCartPage />),
      },
      {
        path: "cuenta",
        element: withRouteLoader(<BuyerAccountPage />),
      },
      {
        path: "cuenta/contacto",
        element: withRouteLoader(<BuyerContactPage />),
      },
    ],
  },
  {
    path: "/panel/admin",
    errorElement: <RouteErrorPage />,
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        {withRouteLoader(<AdminLayout />)}
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: withRouteLoader(<AdminDashboardPage />),
      },
      {
        path: "analitica",
        element: withRouteLoader(<AdminAnalyticsPage />),
      },
      {
        path: "promociones-catalogo",
        element: withRouteLoader(<AdminCatalogPromotionsPage />),
      },
      {
        path: "ventas",
        element: withRouteLoader(<AdminSalesPage />),
      },
      {
        path: "facturacion",
        element: withRouteLoader(<AdminBillingPage />),
      },
      {
        path: "categorias",
        element: withRouteLoader(<AdminCategoriesPage />),
      },
      {
        path: "productos",
        element: withRouteLoader(<AdminProductsPage />),
      },
      {
        path: "productos/edicion-rapida/:productId",
        element: withRouteLoader(<ProductQuickEditPage />),
      },
      {
        path: "control-productos",
        element: withRouteLoader(<AdminProductControlPage />),
      },
      {
        path: "notificaciones",
        element: withRouteLoader(<AdminInternalNotificationsPage />),
      },
      {
        path: "productos/:artisanId",
        element: withRouteLoader(<ArtisanProductsPage />),
      },
      {
        path: "vendedores",
        element: withRouteLoader(<AdminArtisansPage />),
      },
      {
        path: "vendedores/activos",
        element: withRouteLoader(<AdminActiveArtisansPage />),
      },
      {
        path: "compradores/activos",
        element: withRouteLoader(<AdminActiveBuyersPage />),
      },
      {
        path: "productos/visibles",
        element: withRouteLoader(<AdminVisibleProductsPage />),
      },
      {
        path: "vendedores/:artisanId/tienda",
        element: withRouteLoader(<ArtisanStorePage />),
      },
      {
        path: "vendedores/:artisanId/productos",
        element: withRouteLoader(<ArtisanProductsPage />),
      },
    ],
  },
  {
    path: "*",
    element: withRouteLoader(<NotFoundPage />),
    errorElement: <RouteErrorPage />,
  },
]);

import type {
  AdminArtisanProfile,
  AdminBuyerProfile,
  AdminCategory,
  AdminDashboardProduct,
  AdminDashboardSale,
} from "../../types/admin";

import { useAuth } from "../auth/useAuth";
import { useAdminDashboardSnapshot } from "./adminQueries";

type AdminDashboardData = {
  artisans: AdminArtisanProfile[];
  buyers: AdminBuyerProfile[];
  categories: AdminCategory[];
  errorMessage: string | null;
  isLoading: boolean;
  productsCount: number;
  products: AdminDashboardProduct[];
  salesCount: number;
  sales: AdminDashboardSale[];
  visibleProductsCount: number;
  warningMessage: string | null;
};

export function useAdminDashboardData(): AdminDashboardData {
  const { isLoading: isAuthLoading, role, user } = useAuth();
  const isEnabled = !isAuthLoading && Boolean(user) && role === "admin";
  const snapshotQuery = useAdminDashboardSnapshot(isEnabled);

  if (!isEnabled) {
    return {
      artisans: [],
      buyers: [],
      categories: [],
      errorMessage: null,
      isLoading: isAuthLoading,
      productsCount: 0,
      products: [],
      salesCount: 0,
      sales: [],
      visibleProductsCount: 0,
      warningMessage: null,
    };
  }

  return {
    artisans: snapshotQuery.data?.artisans ?? [],
    buyers: snapshotQuery.data?.buyers ?? [],
    categories: snapshotQuery.data?.categories ?? [],
    errorMessage: snapshotQuery.error?.message ?? null,
    isLoading: snapshotQuery.isLoading,
    productsCount: snapshotQuery.data?.productsCount ?? snapshotQuery.data?.products.length ?? 0,
    products: snapshotQuery.data?.products ?? [],
    salesCount: snapshotQuery.data?.salesCount ?? snapshotQuery.data?.sales.length ?? 0,
    sales: snapshotQuery.data?.sales ?? [],
    visibleProductsCount:
      snapshotQuery.data?.visibleProductsCount ??
      snapshotQuery.data?.products.filter((product) => product.is_active).length ??
      0,
    warningMessage: snapshotQuery.data?.warningMessage ?? null,
  };
}

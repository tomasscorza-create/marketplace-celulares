import type {
  AdminArtisanProfile,
  AdminBuyerAccountSummary,
  AdminCategory,
  AdminDashboardProduct,
  AdminDashboardSale,
} from "../../types/admin";

export type DashboardPanelKey = "artisans" | "products" | "sales" | "categories";

export type DashboardPanel = DashboardPanelKey | null;

export type ArtisanSummary = AdminArtisanProfile & {
  productsCount: number;
  revenueTotal: number;
  salesCount: number;
};

export type CategorySummary = AdminCategory & {
  productsCount: number;
};

export type DashboardProductRow = AdminDashboardProduct & { artisanName: string };
export type DashboardSaleRow = AdminDashboardSale & { artisanName: string };
export type DashboardBuyerRow = AdminBuyerAccountSummary;

export const ADMIN_DASHBOARD_PANEL_META = {
  artisans: {
    empty: "No hay vendedores para mostrar.",
    title: "Cuentas vendedoras",
  },
  categories: {
    empty: "No hay categorÃ­as para mostrar.",
    title: "CategorÃ­as",
  },
  products: {
    empty: "No hay productos cargados todavÃ­a.",
    title: "Productos",
  },
  sales: {
    empty: "No hay ventas registradas todavÃ­a.",
    title: "Ventas",
  },
} satisfies Record<DashboardPanelKey, { empty: string; title: string }>;

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function buildArtisanSummaries(
  artisans: AdminArtisanProfile[],
  products: AdminDashboardProduct[],
  sales: AdminDashboardSale[],
) {
  return artisans.map((artisan) => {
    const artisanProducts = products.filter((product) => product.artisan_id === artisan.id);
    const artisanSales = sales.filter((sale) => sale.artisan_id === artisan.id);

    return {
      ...artisan,
      productsCount: artisanProducts.length,
      revenueTotal: artisanSales.reduce(
        (accumulator, sale) => accumulator + Number(sale.subtotal),
        0,
      ),
      salesCount: artisanSales.length,
    };
  });
}
export function buildCategorySummaries(
  categories: AdminCategory[],
  products: AdminDashboardProduct[],
) {
  const counts = new Map<string, number>();

  products.forEach((product) => {
    const currentValue = counts.get(product.categories?.name ?? "") ?? 0;
    counts.set(product.categories?.name ?? "", currentValue + 1);
  });

  return categories.map((category) => ({
    ...category,
    productsCount: counts.get(category.name) ?? 0,
  }));
}

export function filterAndSortArtisans(
  artisanSummaries: ArtisanSummary[],
  searchValue: string,
  sortValue: string,
) {
  const normalizedSearch = normalizeSearchValue(searchValue);
  const filtered = artisanSummaries.filter((artisan) => {
    if (!normalizedSearch) {
      return true;
    }

    return [artisan.full_name, artisan.email, artisan.store_name ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch);
  });

  const sorted = [...filtered];

  switch (sortValue) {
    case "newest":
      sorted.sort((left, right) => +new Date(right.created_at) - +new Date(left.created_at));
      break;
    case "oldest":
      sorted.sort((left, right) => +new Date(left.created_at) - +new Date(right.created_at));
      break;
    case "most_products":
      sorted.sort((left, right) => right.productsCount - left.productsCount);
      break;
    case "highest_revenue":
      sorted.sort((left, right) => right.revenueTotal - left.revenueTotal);
      break;
    case "alphabetical":
      sorted.sort((left, right) => left.full_name.localeCompare(right.full_name));
      break;
    case "most_sales":
    default:
      sorted.sort((left, right) => right.salesCount - left.salesCount);
      break;
  }

  return sorted;
}

export function filterAndSortProducts(
  artisans: AdminArtisanProfile[],
  products: AdminDashboardProduct[],
  searchValue: string,
  sortValue: string,
) {
  const normalizedSearch = normalizeSearchValue(searchValue);
  const artisanNames = new Map(
    artisans.map((artisan) => [artisan.id, artisan.store_name?.trim() || artisan.full_name]),
  );

  const filtered = products.filter((product) => {
    if (!normalizedSearch) {
      return true;
    }

    return [
      product.title,
      product.categories?.name ?? "",
      artisanNames.get(product.artisan_id) ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch);
  });

  const sorted = [...filtered];

  switch (sortValue) {
    case "oldest":
      sorted.sort((left, right) => +new Date(left.created_at) - +new Date(right.created_at));
      break;
    case "highest_price":
      sorted.sort((left, right) => Number(right.price) - Number(left.price));
      break;
    case "active_first":
      sorted.sort((left, right) => Number(right.is_active) - Number(left.is_active));
      break;
    default:
      sorted.sort((left, right) => +new Date(right.created_at) - +new Date(left.created_at));
      break;
  }

  return sorted.map((product) => ({
    ...product,
    artisanName: artisanNames.get(product.artisan_id) ?? "Vendedor",
  }));
}
export function filterAndSortSales(
  artisans: AdminArtisanProfile[],
  sales: AdminDashboardSale[],
  searchValue: string,
  sortValue: string,
) {
  const normalizedSearch = normalizeSearchValue(searchValue);
  const artisanNames = new Map(
    artisans.map((artisan) => [artisan.id, artisan.store_name?.trim() || artisan.full_name]),
  );

  const filtered = sales.filter((sale) => {
    if (!normalizedSearch) {
      return true;
    }

    return [sale.product_title, artisanNames.get(sale.artisan_id) ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch);
  });

  const sorted = [...filtered];

  switch (sortValue) {
    case "highest_amount":
      sorted.sort((left, right) => Number(right.subtotal) - Number(left.subtotal));
      break;
    case "highest_quantity":
      sorted.sort((left, right) => Number(right.quantity) - Number(left.quantity));
      break;
    default:
      sorted.sort((left, right) => +new Date(right.created_at) - +new Date(left.created_at));
      break;
  }

  return sorted.map((sale) => ({
    ...sale,
    artisanName: artisanNames.get(sale.artisan_id) ?? "Vendedor",
  }));
}

export function filterAndSortCategories(
  categorySummaries: CategorySummary[],
  searchValue: string,
  sortValue: string,
) {
  const normalizedSearch = normalizeSearchValue(searchValue);
  const filtered = categorySummaries.filter((category) => {
    if (!normalizedSearch) {
      return true;
    }

    return [category.name, category.slug].join(" ").toLowerCase().includes(normalizedSearch);
  });

  const sorted = [...filtered];

  switch (sortValue) {
    case "name":
      sorted.sort((left, right) => left.name.localeCompare(right.name));
      break;
    case "newest":
      sorted.sort((left, right) => +new Date(right.created_at) - +new Date(left.created_at));
      break;
    default:
      sorted.sort((left, right) => Number(right.is_active) - Number(left.is_active));
      break;
  }

  return sorted;
}

export function filterAndSortBuyerAccounts(
  buyerAccounts: AdminBuyerAccountSummary[],
  searchValue: string,
  sortValue: string,
) {
  const normalizedSearch = normalizeSearchValue(searchValue);
  const filtered = buyerAccounts.filter((buyer) => {
    if (!normalizedSearch) {
      return true;
    }

    return [
      buyer.full_name,
      buyer.email,
      buyer.interestTerms.join(" "),
      buyer.hasShippingAddress ? "direccion cargada" : "",
      buyer.hasPhone ? "telefono cargado" : "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch);
  });

  const sorted = [...filtered];

  switch (sortValue) {
    case "most_favorites":
      sorted.sort((left, right) => right.favoritesCount - left.favoritesCount);
      break;
    case "highest_spent":
      sorted.sort((left, right) => right.totalSpent - left.totalSpent);
      break;
    case "latest_activity":
      sorted.sort(
        (left, right) =>
          +new Date(right.lastActivityAt ?? right.created_at) -
          +new Date(left.lastActivityAt ?? left.created_at),
      );
      break;
    case "oldest":
      sorted.sort((left, right) => +new Date(left.created_at) - +new Date(right.created_at));
      break;
    case "newest":
      sorted.sort((left, right) => +new Date(right.created_at) - +new Date(left.created_at));
      break;
    case "most_orders":
    default:
      sorted.sort((left, right) => right.ordersCount - left.ordersCount);
      break;
  }

  return sorted;
}

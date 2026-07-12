import type {
  AdminArtisanProfile,
  AdminBuyerAccountSummary,
  AdminCategory,
  AdminDashboardProduct,
  AdminDashboardSale,
} from "../../types/admin";

export type DashboardPanelKey = "artisans" | "products" | "batches" | "sales" | "categories";

export type DashboardPanel = DashboardPanelKey | null;

export type ArtisanSummary = AdminArtisanProfile & {
  productsCount: number;
  revenueTotal: number;
  salesCount: number;
};

export type BatchSummary = {
  artisanId: string;
  artisanName: string;
  batchCode: string;
  batchId: string;
  createdAt: string;
  itemCount: number;
  totalValue: number;
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
  batches: {
    empty: "No hay grupos creados todavía.",
    title: "Grupos de productos",
  },
  categories: {
    empty: "No hay categorías para mostrar.",
    title: "Categorías",
  },
  products: {
    empty: "No hay productos cargados todavía.",
    title: "Productos",
  },
  sales: {
    empty: "No hay ventas registradas todavía.",
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

export function buildBatchSummaries(
  artisans: AdminArtisanProfile[],
  products: AdminDashboardProduct[],
) {
  const byBatch = new Map<string, BatchSummary>();
  const artisanNames = new Map(
    artisans.map((artisan) => [artisan.id, artisan.store_name?.trim() || artisan.full_name]),
  );

  products.forEach((product) => {
    if (!product.batch_id || !product.batch_code) {
      return;
    }

    const current = byBatch.get(product.batch_id);

    if (!current) {
      byBatch.set(product.batch_id, {
        artisanId: product.artisan_id,
        artisanName: artisanNames.get(product.artisan_id) ?? "Vendedor",
        batchCode: product.batch_code,
        batchId: product.batch_id,
        createdAt: product.created_at,
        itemCount: 1,
        totalValue: Number(product.price),
      });
      return;
    }

    current.itemCount += 1;
    current.totalValue += Number(product.price);
    if (new Date(product.created_at) > new Date(current.createdAt)) {
      current.createdAt = product.created_at;
    }
  });

  return Array.from(byBatch.values());
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

export function filterAndSortBatches(
  batchSummaries: BatchSummary[],
  searchValue: string,
  sortValue: string,
) {
  const normalizedSearch = normalizeSearchValue(searchValue);
  const filtered = batchSummaries.filter((batch) => {
    if (!normalizedSearch) {
      return true;
    }

    return [batch.batchCode, batch.artisanName].join(" ").toLowerCase().includes(normalizedSearch);
  });

  const sorted = [...filtered];

  switch (sortValue) {
    case "newest":
      sorted.sort((left, right) => +new Date(right.createdAt) - +new Date(left.createdAt));
      break;
    case "highest_value":
      sorted.sort((left, right) => right.totalValue - left.totalValue);
      break;
    default:
      sorted.sort((left, right) => right.itemCount - left.itemCount);
      break;
  }

  return sorted;
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

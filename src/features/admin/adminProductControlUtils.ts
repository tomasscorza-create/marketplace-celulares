import type {
  AdminArtisanProfile,
  AdminProductControlBoostLevel,
  AdminProductControlProduct,
  AdminProductControlRecord,
  AdminProductControlSale,
  AdminProductControlTag,
} from "../../types/admin";

export type AdminProductControlView = {
  artisanLabel: string;
  batchLabel: string | null;
  boostLevel: AdminProductControlBoostLevel | null;
  boostSummaryLabel: string | null;
  boostUntil: string | null;
  categoryLabel: string;
  comment: string | null;
  createdAt: string;
  createdAtLabel: string;
  currentTag: AdminProductControlTag | null;
  id: string;
  identifierLabel: string;
  imageUrl: string | null;
  lastSaleAtLabel: string | null;
  leadTimeLabel: string | null;
  priceLabel: string;
  product: AdminProductControlProduct;
  salesAmount: number;
  salesAmountLabel: string;
  salesCount: number;
  salesCountLabel: string;
  soldUnits: number;
  soldUnitsLabel: string;
  statusLabel: string;
  searchableText: string;
  title: string;
};

export type AdminProductControlFollowUpItem = {
  artisanLabel: string;
  boostLevel: AdminProductControlBoostLevel | null;
  boostSummaryLabel: string | null;
  comment: string | null;
  currentTag: AdminProductControlTag | null;
  id: string;
  imageUrl: string | null;
  title: string;
};

export function normalizeAdminText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function formatAdminCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    currency: "ARS",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

export function formatAdminDateLabel(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function buildAdminProductStatusLabel(product: AdminProductControlProduct) {
  if (!product.is_active) {
    return "Oculto";
  }

  if (product.availability_mode === "made_to_order") {
    return product.lead_time_days ? `A pedido · ${product.lead_time_days} dia(s)` : "A pedido";
  }

  return `Stock ${product.stock_quantity ?? 0}`;
}

export function buildAdminProductLeadTimeLabel(product: AdminProductControlProduct) {
  if (product.availability_mode !== "made_to_order") {
    return null;
  }

  if (!product.lead_time_days) {
    return "A pedido sin demora definida";
  }

  return `${product.lead_time_days} dia(s) de demora`;
}

export function buildAdminBoostSummary(
  boostLevel: AdminProductControlBoostLevel | null,
  boostUntil: string | null,
) {
  if (!boostLevel || !boostUntil) {
    return null;
  }

  const boostDate = new Date(boostUntil);

  if (Number.isNaN(boostDate.getTime()) || boostDate.getTime() <= Date.now()) {
    return null;
  }

  return `${boostLevel} hasta ${formatAdminDateLabel(boostUntil)}`;
}

function shortProductId(productId: string) {
  return productId.slice(0, 8).toUpperCase();
}

export function buildAdminProductControlViews(
  products: AdminProductControlProduct[],
  artisans: AdminArtisanProfile[],
  sales: AdminProductControlSale[],
  controlRecords: AdminProductControlRecord[],
) {
  const artisanMap = new Map(
    artisans.map((artisan) => [artisan.id, artisan.store_name?.trim() || artisan.full_name]),
  );
  const salesByProduct = new Map<
    string,
    { count: number; lastSaleAt: string | null; revenue: number; units: number }
  >();
  const tagMap = new Map(controlRecords.map((record) => [record.product_id, record]));

  sales.forEach((sale) => {
    const currentValue = salesByProduct.get(sale.product_id) ?? {
      count: 0,
      lastSaleAt: null,
      revenue: 0,
      units: 0,
    };

    salesByProduct.set(sale.product_id, {
      count: currentValue.count + 1,
      lastSaleAt:
        !currentValue.lastSaleAt || currentValue.lastSaleAt < sale.created_at
          ? sale.created_at
          : currentValue.lastSaleAt,
      revenue: currentValue.revenue + Number(sale.subtotal),
      units: currentValue.units + Number(sale.quantity),
    });
  });

  return products.map((product) => {
    const artisanLabel = artisanMap.get(product.artisan_id) ?? "Vendedor local";
    const salesSummary = salesByProduct.get(product.id) ?? {
      count: 0,
      lastSaleAt: null,
      revenue: 0,
      units: 0,
    };
    const currentRecord = tagMap.get(product.id);
    const currentTag = currentRecord?.internal_tag ?? null;
    const boostLevel = currentRecord?.boost_level ?? null;
    const boostUntil = currentRecord?.boost_until ?? null;
    const batchLabel = product.batch_code ? product.batch_code : null;
    const identifierLabel = batchLabel
      ? `${batchLabel} · ID ${shortProductId(product.id)}`
      : `ID ${shortProductId(product.id)}`;

    return {
      artisanLabel,
      batchLabel,
      boostLevel,
      boostSummaryLabel: buildAdminBoostSummary(boostLevel, boostUntil),
      boostUntil,
      categoryLabel: product.categories?.name ?? "Sin categoria",
      comment: currentRecord?.comment ?? null,
      createdAt: product.created_at,
      createdAtLabel: formatAdminDateLabel(product.created_at) ?? "Sin fecha",
      currentTag,
      id: product.id,
      identifierLabel,
      imageUrl: product.image_url,
      lastSaleAtLabel: formatAdminDateLabel(salesSummary.lastSaleAt),
      leadTimeLabel: buildAdminProductLeadTimeLabel(product),
      priceLabel: formatAdminCurrency(Number(product.price ?? 0)),
      product,
      salesAmount: salesSummary.revenue,
      salesAmountLabel: formatAdminCurrency(salesSummary.revenue),
      salesCount: salesSummary.count,
      salesCountLabel: `${salesSummary.count} venta(s)`,
      soldUnits: salesSummary.units,
      soldUnitsLabel: `${salesSummary.units} unidad(es)`,
      statusLabel: buildAdminProductStatusLabel(product),
      searchableText: normalizeAdminText(
        [
          product.title,
          product.description,
          product.id,
          product.batch_code ?? "",
          artisanLabel,
          product.categories?.name ?? "",
          currentTag ?? "",
          currentRecord?.comment ?? "",
          boostLevel ?? "",
        ].join(" "),
      ),
      title: product.title,
    } satisfies AdminProductControlView;
  });
}

export function filterAdminProductControlViews(
  productItems: AdminProductControlView[],
  searchValue: string,
) {
  const normalizedSearch = normalizeAdminText(searchValue.trim());

  if (!normalizedSearch) {
    return productItems;
  }

  return productItems.filter((item) => item.searchableText.includes(normalizedSearch));
}

export function filterAndSortAdminProductControlViews(
  productItems: AdminProductControlView[],
  searchValue: string,
  sortValue: string,
) {
  const filtered = filterAdminProductControlViews(productItems, searchValue);
  const sorted = [...filtered];

  switch (sortValue) {
    case "oldest":
      sorted.sort((left, right) => +new Date(left.createdAt) - +new Date(right.createdAt));
      break;
    case "highest_price":
      sorted.sort((left, right) => Number(right.product.price) - Number(left.product.price));
      break;
    case "highest_revenue":
      sorted.sort((left, right) => right.salesAmount - left.salesAmount);
      break;
    case "most_sales":
      sorted.sort((left, right) => right.salesCount - left.salesCount);
      break;
    case "newest":
    default:
      sorted.sort((left, right) => +new Date(right.createdAt) - +new Date(left.createdAt));
      break;
  }

  return sorted;
}

export function buildAdminProductControlFollowUpItems(productItems: AdminProductControlView[]) {
  return productItems
    .filter(
      (item) =>
        item.currentTag !== null || Boolean(item.comment?.trim()) || item.boostSummaryLabel !== null,
    )
    .map(
      (item) =>
        ({
          artisanLabel: item.artisanLabel,
          boostLevel: item.boostLevel,
          boostSummaryLabel: item.boostSummaryLabel,
          comment: item.comment,
          currentTag: item.currentTag,
          id: item.id,
          imageUrl: item.imageUrl,
          title: item.title,
        }) satisfies AdminProductControlFollowUpItem,
    );
}

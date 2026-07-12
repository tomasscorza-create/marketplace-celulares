import type {
  ArtisanCategory,
  ArtisanProduct,
  ArtisanProductInput,
  ArtisanSaleItem,
  ArtisanStoreProfileInput,
} from "../../types/artisan";
import type { UserProfile } from "../../types/auth";
import type {
  ProductBatch,
  ProductBatchInput,
  ProductBatchMutationResult,
} from "../../types/productBatch";
import type { PaginationParams } from "../../types/pagination";
import type { FulfillmentStatus } from "../../types/commerce";
import type { ProductAttribute } from "../../types/productAttributes";
import type { ProductOptionGroup } from "../../types/productAvailability";
import { sanitizeProductAttributes } from "../../types/productAttributes";
import {
  getProductImageMediaItems,
  type ProductMediaItem,
} from "../../types/productMedia";

import { getSupabaseClient } from "../../lib/supabase/client";

const ARTISAN_PROFILE_BUCKET = "artisan-profile-images";
const ARTISAN_PRODUCT_BUCKET = "artisan-product-images";
const productSelection = "*, categories(name)";
const productBatchSelection = "*";
const MAX_PRODUCT_PAGE_SIZE = 200;

function serializeProductMediaItem(item: ProductMediaItem) {
  return {
    crop: item.crop ?? null,
    description: item.description.trim(),
    format: item.format ?? null,
    original_url: cleanNullableText(item.original_url ?? ""),
    poster_url: cleanNullableText(item.poster_url ?? ""),
    size_bytes: item.size_bytes ?? null,
    thumbnail_url: cleanNullableText(item.thumbnail_url ?? ""),
    type: item.type ?? "image",
    url: item.url,
  };
}

function getPrimaryProductImagePayload(input: ArtisanProductInput) {
  const imageMediaItems = getProductImageMediaItems(input.product_media);
  const imageUrls =
    imageMediaItems.length > 0
      ? imageMediaItems.map((item) => item.url)
      : input.image_urls.filter(Boolean);

  return {
    image_url: imageUrls[0] ?? null,
    image_urls: imageUrls,
  };
}

export type ArtisanProductListParams = Partial<PaginationParams> & {
  batchId?: string;
  standaloneOnly?: boolean;
};

export type ArtisanProductBatchListParams = Partial<PaginationParams>;

export type ArtisanProductStats = {
  batchProducts: number;
  batches: number;
  standaloneProducts: number;
  totalProducts: number;
};

export type ArtisanProductQuickUpdateInput = {
  description: string;
  price: number;
  stock_quantity: number | null;
  title: string;
};

function cleanNullableText(value: string) {
  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function sanitizeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-+/g, "-");
}

function extractStoragePathFromPublicUrl(bucket: string, imageUrl: string) {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const [pathPart] = imageUrl.split("?")[0].split("#");
  const markerIndex = pathPart.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const nextPath = pathPart.slice(markerIndex + marker.length);

  return nextPath.length > 0 ? decodeURIComponent(nextPath) : null;
}

function shouldRetryStorageUpload(error: { message?: string; statusCode?: string | number } | null) {
  const message = `${error?.message ?? ""}`.toLowerCase();
  const statusCode = `${error?.statusCode ?? ""}`.toLowerCase();

  return (
    statusCode === "504" ||
    message.includes("504") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("network") ||
    message.includes("failed to fetch")
  );
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function normalizePagination(params?: Partial<PaginationParams>) {
  const page = Math.max(1, Math.floor(params?.page ?? 1));
  const limit = Math.min(Math.max(1, Math.floor(params?.limit ?? 25)), MAX_PRODUCT_PAGE_SIZE);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  return { from, limit, page, to };
}

function normalizeSearchTerm(search?: string) {
  return (search ?? "")
    .trim()
    .replace(/[,()%_]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 80)
    .trim();
}

function isMissingColumnError(
  error: {
    code?: string;
    details?: string;
    message?: string;
  } | null,
  columnName: string,
) {
  const errorText = `${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();

  return (
    error?.code === "PGRST204" ||
    errorText.includes(columnName.toLowerCase()) ||
    errorText.includes("could not find the") ||
    errorText.includes("column")
  );
}

export async function updateArtisanStoreProfile(
  profileId: string,
  input: ArtisanStoreProfileInput,
) {
  const client = getSupabaseClient();

  return client
    .from("profiles")
    .update({
      full_name: input.full_name.trim(),
      profile_image_url: cleanNullableText(input.profile_image_url),
      store_description: cleanNullableText(input.store_description),
      store_name: cleanNullableText(input.store_name),
      storefront_theme_color: cleanNullableText(input.storefront_theme_color),
    })
    .eq("id", profileId)
    .select(
      "id, full_name, email, role, store_name, store_description, profile_image_url, storefront_theme_color, created_at",
    )
    .single<UserProfile>();
}

export async function uploadArtisanProfileImage(profileId: string, file: File) {
  const client = getSupabaseClient();
  const filePath = `${profileId}/${Date.now()}-${sanitizeFileName(file.name)}`;

  const uploadResponse = await client.storage
    .from(ARTISAN_PROFILE_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadResponse.error) {
    return {
      data: null,
      error: uploadResponse.error,
    };
  }

  const {
    data: { publicUrl },
  } = client.storage.from(ARTISAN_PROFILE_BUCKET).getPublicUrl(filePath);

  return {
    data: { path: filePath, publicUrl },
    error: null,
  };
}

export async function removeArtisanProfileImages(imageUrls: string[]) {
  const client = getSupabaseClient();
  const paths = Array.from(
    new Set(
      imageUrls
        .map((imageUrl) => extractStoragePathFromPublicUrl(ARTISAN_PROFILE_BUCKET, imageUrl))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  if (paths.length === 0) {
    return {
      data: [],
      error: null,
    };
  }

  return client.storage.from(ARTISAN_PROFILE_BUCKET).remove(paths);
}

export async function uploadArtisanProductImage(artisanId: string, file: File, subfolder = "") {
  const client = getSupabaseClient();
  const safeSubfolder = subfolder
    ? `${subfolder.toLowerCase().replace(/[^a-z0-9\-_]/g, "-").replace(/-+/g, "-")}/`
    : "";
  const filePath = `${artisanId}/${safeSubfolder}${Date.now()}-${sanitizeFileName(file.name)}`;

  let uploadResponse = await client.storage
    .from(ARTISAN_PRODUCT_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadResponse.error && shouldRetryStorageUpload(uploadResponse.error)) {
    await wait(700);
    uploadResponse = await client.storage
      .from(ARTISAN_PRODUCT_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });
  }

  if (uploadResponse.error) {
    return {
      data: null,
      error: uploadResponse.error,
    };
  }

  const {
    data: { publicUrl },
  } = client.storage.from(ARTISAN_PRODUCT_BUCKET).getPublicUrl(filePath);

  return {
    data: { path: filePath, publicUrl },
    error: null,
  };
}

export async function uploadArtisanProductModel(artisanId: string, file: File) {
  return uploadArtisanProductImage(artisanId, file, "models");
}

export async function removeArtisanProductImages(imageUrls: string[]) {
  void imageUrls;

  return {
    data: [],
    error: null,
  };
}

export async function getArtisanCategories() {
  const client = getSupabaseClient();

  return client
    .from("categories")
    .select("id, name")
    .eq("is_active", true)
    .order("name")
    .returns<ArtisanCategory[]>();
}

export async function getArtisanProducts(
  artisanId: string,
  params?: ArtisanProductListParams,
) {
  const client = getSupabaseClient();
  const pagination = normalizePagination(params);
  const searchTerm = normalizeSearchTerm(params?.search);

  let query = client
    .from("products")
    .select(productSelection, params ? { count: "exact" } : undefined)
    .eq("artisan_id", artisanId)
    .order("created_at", { ascending: false });

  if (params?.batchId) {
    query = query.eq("batch_id", params.batchId);
  }

  if (params?.standaloneOnly) {
    query = query.is("batch_id", null);
  }

  if (searchTerm) {
    query = query.or(
      `title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,batch_code.ilike.%${searchTerm}%`,
    );
  }

  if (params?.limit) {
    query = query.range(pagination.from, pagination.to);
  }

  return query.returns<ArtisanProduct[]>();
}

export async function getArtisanProductById(artisanId: string, productId: string) {
  const client = getSupabaseClient();

  return client
    .from("products")
    .select(productSelection)
    .eq("artisan_id", artisanId)
    .eq("id", productId)
    .single<ArtisanProduct>();
}

export async function getEditableArtisanProductById(productId: string) {
  const client = getSupabaseClient();

  return client
    .from("products")
    .select(productSelection)
    .eq("id", productId)
    .single<ArtisanProduct>();
}

export async function getArtisanBatchProducts(
  artisanId: string,
  batchId: string,
  expectedCount = 0,
) {
  const fetchedProducts: ArtisanProduct[] = [];
  let currentPage = 1;
  let totalCount = expectedCount;

  while (fetchedProducts.length < totalCount || currentPage === 1) {
    const response = await getArtisanProducts(artisanId, {
      batchId,
      limit: MAX_PRODUCT_PAGE_SIZE,
      page: currentPage,
    });

    if (response.error) {
      return {
        data: fetchedProducts,
        error: response.error,
      };
    }

    const pageProducts = response.data ?? [];
    totalCount = response.count ?? totalCount;
    fetchedProducts.push(...pageProducts);

    if (pageProducts.length < MAX_PRODUCT_PAGE_SIZE) {
      break;
    }

    currentPage += 1;
  }

  return {
    data: fetchedProducts,
    error: null,
  };
}

export async function getArtisanProductBatches(
  artisanId: string,
  params?: ArtisanProductBatchListParams,
) {
  const client = getSupabaseClient();
  const pagination = normalizePagination(params);
  const searchTerm = normalizeSearchTerm(params?.search);

  let query = client
    .from("product_batches")
    .select(productBatchSelection, params ? { count: "exact" } : undefined)
    .eq("artisan_id", artisanId)
    .order("created_at", { ascending: false });

  if (searchTerm) {
    query = query.or(
      `title_base.ilike.%${searchTerm}%,description_base.ilike.%${searchTerm}%,batch_code.ilike.%${searchTerm}%`,
    );
  }

  if (params?.limit) {
    query = query.range(pagination.from, pagination.to);
  }

  return query.returns<ProductBatch[]>();
}

export async function getArtisanProductStats(artisanId: string) {
  const client = getSupabaseClient();
  const [productsResponse, standaloneResponse, batchesResponse] = await Promise.all([
    client
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("artisan_id", artisanId),
    client
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("artisan_id", artisanId)
      .is("batch_id", null),
    client
      .from("product_batches")
      .select("id", { count: "exact", head: true })
      .eq("artisan_id", artisanId),
  ]);

  const error = productsResponse.error ?? standaloneResponse.error ?? batchesResponse.error;

  if (error) {
    return {
      data: null,
      error,
    };
  }

  const totalProducts = productsResponse.count ?? 0;
  const standaloneProducts = standaloneResponse.count ?? 0;

  return {
    data: {
      batchProducts: Math.max(0, totalProducts - standaloneProducts),
      batches: batchesResponse.count ?? 0,
      standaloneProducts,
      totalProducts,
    } satisfies ArtisanProductStats,
    error: null,
  };
}

export async function createArtisanProduct(artisanId: string, input: ArtisanProductInput) {
  const client = getSupabaseClient();
  const productAttributes = sanitizeProductAttributes(input.product_attributes);
  const imagePayload = getPrimaryProductImagePayload(input);
  const basePayload = {
    artisan_id: artisanId,
    batch_id: input.batch_id ?? null,
    batch_code: input.batch_code ?? null,
    batch_position: input.batch_position ?? null,
    category_id: input.category_id,
    created_via_batch: input.created_via_batch ?? false,
    title: input.title.trim(),
    description: input.description.trim(),
    price: input.price,
    ...imagePayload,
    product_media: input.product_media.map(serializeProductMediaItem),
    is_active: input.is_active,
    availability_mode: input.availability_mode,
    stock_quantity: input.availability_mode === "stock" ? input.stock_quantity ?? 0 : null,
    lead_time_days:
      input.availability_mode === "made_to_order" ? input.lead_time_days ?? null : null,
    made_to_order_options: input.made_to_order_options,
  };

  const response = await client
    .from("products")
    .insert({
      ...basePayload,
      product_attributes: productAttributes,
    })
    .select(productSelection)
    .single<ArtisanProduct>();

  if (response.error && isMissingColumnError(response.error, "product_attributes")) {
    return client
      .from("products")
      .insert(basePayload)
      .select(productSelection)
      .single<ArtisanProduct>();
  }

  return response;
}

export async function updateArtisanProduct(productId: string, input: ArtisanProductInput) {
  const client = getSupabaseClient();
  const productAttributes = sanitizeProductAttributes(input.product_attributes);
  const imagePayload = getPrimaryProductImagePayload(input);
  const basePayload = {
    category_id: input.category_id,
    batch_id: input.batch_id ?? null,
    batch_code: input.batch_code ?? null,
    batch_position: input.batch_position ?? null,
    created_via_batch: input.created_via_batch ?? false,
    title: input.title.trim(),
    description: input.description.trim(),
    price: input.price,
    ...imagePayload,
    product_media: input.product_media.map(serializeProductMediaItem),
    is_active: input.is_active,
    availability_mode: input.availability_mode,
    stock_quantity: input.availability_mode === "stock" ? input.stock_quantity ?? 0 : null,
    lead_time_days:
      input.availability_mode === "made_to_order" ? input.lead_time_days ?? null : null,
    made_to_order_options: input.made_to_order_options,
  };

  const response = await client
    .from("products")
    .update({
      ...basePayload,
      product_attributes: productAttributes,
    })
    .eq("id", productId)
    .select(productSelection)
    .single<ArtisanProduct>();

  if (response.error && isMissingColumnError(response.error, "product_attributes")) {
    return client
      .from("products")
      .update(basePayload)
      .eq("id", productId)
      .select(productSelection)
      .single<ArtisanProduct>();
  }

  return response;
}

export async function updateArtisanProductQuickFields(
  productId: string,
  input: ArtisanProductQuickUpdateInput,
) {
  const client = getSupabaseClient();

  return client
    .from("products")
    .update({
      description: input.description.trim(),
      price: input.price,
      stock_quantity: input.stock_quantity,
      title: input.title.trim(),
    })
    .eq("id", productId)
    .select(productSelection)
    .single<ArtisanProduct>();
}

export async function deleteArtisanProduct(productId: string) {
  const client = getSupabaseClient();

  return client.from("products").delete().eq("id", productId);
}

export async function createArtisanProductBatch(
  artisanId: string,
  input: ProductBatchInput,
) {
  const client = getSupabaseClient();

  const response = await client.rpc("create_product_batch", {
    p_artisan_id: artisanId,
    p_batch: {
      ...input,
      description_base: input.description_base.trim(),
      items: input.items.map((item) => ({
        ...item,
        description: item.description.trim(),
        image_description: item.image_description.trim(),
        title: item.title.trim(),
      })),
      product_attributes_base: sanitizeProductAttributes(input.product_attributes_base),
      title_base: input.title_base.trim(),
    },
  });

  return {
    data: (response.data as ProductBatchMutationResult | null) ?? null,
    error: response.error,
  };
}

export async function updateArtisanProductBatch(batchId: string, input: ProductBatchInput) {
  const client = getSupabaseClient();

  const response = await client.rpc("update_product_batch", {
    p_batch: {
      ...input,
      description_base: input.description_base.trim(),
      items: input.items.map((item) => ({
        ...item,
        description: item.description.trim(),
        image_description: item.image_description.trim(),
        title: item.title.trim(),
      })),
      product_attributes_base: sanitizeProductAttributes(input.product_attributes_base),
      title_base: input.title_base.trim(),
    },
    p_batch_id: batchId,
  });

  return {
    data: (response.data as ProductBatchMutationResult | null) ?? null,
    error: response.error,
  };
}

export async function syncArtisanBatchProductAttributes(
  batchId: string,
  productIds: string[],
  attributes: ProductAttribute[],
) {
  const client = getSupabaseClient();
  const sanitizedAttributes = sanitizeProductAttributes(attributes);

  const batchResponse = await client
    .from("product_batches")
    .update({
      product_attributes_base: sanitizedAttributes,
    })
    .eq("id", batchId);

  if (batchResponse.error && !isMissingColumnError(batchResponse.error, "product_attributes_base")) {
    return batchResponse;
  }

  if (productIds.length === 0) {
    return {
      data: null,
      error: null,
    };
  }

  const productsResponse = await client
    .from("products")
    .update({
      product_attributes: sanitizedAttributes,
    })
    .in("id", productIds);

  if (productsResponse.error && !isMissingColumnError(productsResponse.error, "product_attributes")) {
    return productsResponse;
  }

  return {
    data: null,
    error: null,
  };
}

export async function syncArtisanBatchProductOptions(
  batchId: string,
  productIds: string[],
  options: ProductOptionGroup[],
) {
  const client = getSupabaseClient();

  const batchResponse = await client
    .from("product_batches")
    .update({
      made_to_order_options_base: options,
    })
    .eq("id", batchId);

  if (
    batchResponse.error &&
    !isMissingColumnError(batchResponse.error, "made_to_order_options_base")
  ) {
    return batchResponse;
  }

  if (productIds.length === 0) {
    return {
      data: null,
      error: null,
    };
  }

  const productsResponse = await client
    .from("products")
    .update({
      made_to_order_options: options,
    })
    .in("id", productIds);

  if (productsResponse.error && !isMissingColumnError(productsResponse.error, "made_to_order_options")) {
    return productsResponse;
  }

  return {
    data: null,
    error: null,
  };
}

export async function deleteArtisanProductBatch(batchId: string) {
  const client = getSupabaseClient();

  const response = await client.rpc("delete_product_batch", {
    p_batch_id: batchId,
  });

  return {
    data: (response.data as ProductBatchMutationResult | null) ?? null,
    error: response.error,
  };
}

type ArtisanSalesOrderRow = NonNullable<ArtisanSaleItem["orders"]> & {
  items?: Array<Omit<ArtisanSaleItem, "orders">>;
};

export async function getArtisanSales(artisanId: string, params?: Partial<PaginationParams>) {
  const client = getSupabaseClient();
  const page = Math.max(1, Math.floor(params?.page ?? 1));
  const limit = Math.min(Math.max(1, Math.floor(params?.limit ?? 25)), 200);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = client
    .from("orders")
    .select(
      "id, buyer_name, buyer_email, buyer_phone, delivery_address, delivery_notes, delivery_type, fulfillment_status, payment_status, status, subtotal_amount, shipping_amount, total_amount, paid_at, created_at, items:order_items!inner(id, order_id, product_id, artisan_id, product_title, product_image_url, category_name, store_name, availability_mode, lead_time_days, selected_options_summary, fulfillment_status, quantity, unit_price, subtotal, created_at, products(title))",
      { count: "exact" },
    )
    .eq("payment_status", "approved")
    .eq("items.artisan_id", artisanId)
    .order("created_at", { ascending: false });

  if (params?.limit) {
    query = query.range(from, to);
  }

  const response = await query.returns<ArtisanSalesOrderRow[]>();

  if (response.error) {
    return {
      count: 0,
      data: null,
      error: response.error,
    };
  }

  const sales = (response.data ?? []).flatMap((order) => {
    const { items = [], ...orderData } = order;

    return items.map((item) => ({
      ...item,
      orders: orderData,
    }));
  });

  return {
    count: response.count ?? sales.length,
    data: sales,
    error: null,
  };
}

export async function getArtisanPendingFulfillmentCount(artisanId: string) {
  const client = getSupabaseClient();

  return client
    .from("order_items")
    .select("id, orders!inner(id)", { count: "exact", head: true })
    .eq("artisan_id", artisanId)
    .eq("orders.payment_status", "approved")
    .not("fulfillment_status", "in", "(delivered,cancelled)");
}

export async function updateOrderItemFulfillmentStatus(
  orderItemId: string,
  fulfillmentStatus: FulfillmentStatus,
) {
  const client = getSupabaseClient();

  return client.rpc("update_order_item_fulfillment_status", {
    p_order_item_id: orderItemId,
    p_status: fulfillmentStatus,
  });
}

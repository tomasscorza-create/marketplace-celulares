import type {
  ArtisanCategory,
  ArtisanProduct,
  ArtisanProductInput,
  ArtisanSaleItem,
  ArtisanStoreProfileInput,
} from "../../types/artisan";
import type { UserProfile } from "../../types/auth";
import type { PaginationParams } from "../../types/pagination";
import type { FulfillmentStatus } from "../../types/commerce";
import { sanitizeProductAttributes } from "../../types/productAttributes";
import {
  getProductImageMediaItems,
  type ProductMediaItem,
} from "../../types/productMedia";

import { getSupabaseClient } from "../../lib/supabase/client";

const ARTISAN_PROFILE_BUCKET = "artisan-profile-images";
const ARTISAN_PRODUCT_BUCKET = "artisan-product-images";
const productSelection = "*, categories(name)";
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

export type ArtisanProductListParams = Partial<PaginationParams>;

export type ArtisanProductStats = {
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


  if (searchTerm) {
    query = query.or(
      `title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`,
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

export async function getArtisanProductStats(artisanId: string) {
  const client = getSupabaseClient();
  const response = await client
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("artisan_id", artisanId);

  if (response.error) {
    return { data: null, error: response.error };
  }

  return {
    data: { totalProducts: response.count ?? 0 } satisfies ArtisanProductStats,
    error: null,
  };
}

export async function createArtisanProduct(artisanId: string, input: ArtisanProductInput) {
  const client = getSupabaseClient();
  const productAttributes = sanitizeProductAttributes(input.product_attributes);
  const imagePayload = getPrimaryProductImagePayload(input);
  const basePayload = {
    artisan_id: artisanId,
    category_id: input.category_id,
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

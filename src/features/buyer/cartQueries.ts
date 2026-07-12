import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "../../lib/query/queryKeys";
import type { BuyerCartValidation, CartItemRecord, CartRecord } from "../../types/commerce";
import type { CartProductSelectionInput, PublicProduct } from "../../types/public";
import {
  addProductToBuyerCart,
  getBuyerCartValidation,
  getBuyerActiveCart,
  removeBuyerCartItem,
  updateBuyerCartItemSelection,
  updateBuyerCartItemQuantity,
} from "./cartClient";

const CART_STALE_TIME = 30 * 1000;

function getPrimaryProductImageUrl(
  product: Pick<PublicProduct, "image_url" | "image_urls" | "product_media">,
) {
  return (
    product.product_media?.[0]?.thumbnail_url ??
    product.product_media?.[0]?.url ??
    product.image_urls[0] ??
    product.image_url ??
    null
  );
}

function createOptimisticCart(buyerId: string, previousCart: CartRecord | null | undefined) {
  if (previousCart) {
    return previousCart;
  }

  const now = new Date().toISOString();

  return {
    buyer_id: buyerId,
    converted_order_id: null,
    created_at: now,
    id: `temp-cart-${buyerId}`,
    items: [],
    status: "active",
    updated_at: now,
  } satisfies CartRecord;
}

function upsertOptimisticCartItem(
  cart: CartRecord,
  payload: {
    product: Pick<
      PublicProduct,
      | "artisan_id"
      | "availability_mode"
      | "id"
      | "image_url"
      | "image_urls"
      | "product_media"
      | "lead_time_days"
      | "price"
      | "stock_quantity"
      | "title"
    >;
    selection?: CartProductSelectionInput;
  },
) {
  const selection = payload.selection;
  const configurationKey = selection?.configurationKey ?? "default";
  const currentItems = cart.items ?? [];
  const existingItem = currentItems.find(
    (item) => item.product_id === payload.product.id && item.configuration_key === configurationKey,
  );
  const nextQuantity = (existingItem?.quantity ?? 0) + 1;

  if (
    payload.product.availability_mode === "stock" &&
    nextQuantity > Number(payload.product.stock_quantity ?? 0)
  ) {
    return cart;
  }

  const productImageUrl = getPrimaryProductImageUrl(payload.product);
  const now = new Date().toISOString();

  let nextItems: CartItemRecord[];

  if (existingItem) {
    nextItems = currentItems.map((item) =>
      item.id === existingItem.id
        ? {
            ...item,
            availability_mode: payload.product.availability_mode,
            lead_time_days:
              payload.product.availability_mode === "made_to_order"
                ? selection?.leadTimeDays ?? payload.product.lead_time_days ?? null
                : null,
            product_image_url: productImageUrl,
            product_title: payload.product.title,
            quantity: nextQuantity,
            selected_options: selection?.selectedOptions ?? [],
            selected_options_summary: selection?.selectedOptionsSummary ?? null,
            unit_price: selection?.unitPrice ?? payload.product.price,
            updated_at: now,
          }
        : item,
    );
  } else {
    nextItems = [
      ...currentItems,
      {
        artisan_id: payload.product.artisan_id,
        availability_mode: payload.product.availability_mode,
        cart_id: cart.id,
        configuration_key: configurationKey,
        created_at: now,
        id: `temp-cart-item-${payload.product.id}-${configurationKey}`,
        lead_time_days:
          payload.product.availability_mode === "made_to_order"
            ? selection?.leadTimeDays ?? payload.product.lead_time_days ?? null
            : null,
        product_id: payload.product.id,
        product_image_url: productImageUrl,
        product_title: payload.product.title,
        quantity: 1,
        selected_options: selection?.selectedOptions ?? [],
        selected_options_summary: selection?.selectedOptionsSummary ?? null,
        unit_price: selection?.unitPrice ?? payload.product.price,
        updated_at: now,
      },
    ];
  }

  return {
    ...cart,
    items: nextItems,
    updated_at: now,
  } satisfies CartRecord;
}

function updateOptimisticCartItemQuantity(
  cart: CartRecord | null | undefined,
  cartItemId: string,
  quantity: number,
) {
  if (!cart) {
    return cart ?? null;
  }

  if (quantity <= 0) {
    return {
      ...cart,
      items: (cart.items ?? []).filter((item) => item.id !== cartItemId),
      updated_at: new Date().toISOString(),
    } satisfies CartRecord;
  }

  return {
    ...cart,
    items: (cart.items ?? []).map((item) =>
      item.id === cartItemId
        ? {
            ...item,
            quantity,
            updated_at: new Date().toISOString(),
          }
        : item,
    ),
    updated_at: new Date().toISOString(),
  } satisfies CartRecord;
}

function removeOptimisticCartItem(cart: CartRecord | null | undefined, cartItemId: string) {
  if (!cart) {
    return cart ?? null;
  }

  return {
    ...cart,
    items: (cart.items ?? []).filter((item) => item.id !== cartItemId),
    updated_at: new Date().toISOString(),
  } satisfies CartRecord;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function useBuyerActiveCart(buyerId: string | undefined, enabled = true) {
  const isEnabled = enabled && Boolean(buyerId);

  return useQuery<CartRecord | null>({
    enabled: isEnabled,
    staleTime: CART_STALE_TIME,
    queryKey: queryKeys.buyer.cart(buyerId ?? "missing"),
    queryFn: async () => {
      const response = await getBuyerActiveCart(buyerId!);

      if (response.error) {
        throw new Error(getErrorMessage(response.error, "No pudimos cargar tu carrito."));
      }

      return response.data;
    },
  });
}

export function useBuyerCartValidation(buyerId: string | undefined, enabled = true) {
  const isEnabled = enabled && Boolean(buyerId);

  return useQuery<BuyerCartValidation>({
    enabled: isEnabled,
    staleTime: CART_STALE_TIME,
    queryKey: queryKeys.buyer.cartValidation(buyerId ?? "missing"),
    queryFn: async () => {
      const response = await getBuyerCartValidation(buyerId!);

      if (response.error || !response.data) {
        throw new Error(getErrorMessage(response.error, "No pudimos revisar tu compra."));
      }

      return response.data;
    },
  });
}

export function useAddProductToCart(buyerId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.buyer.cart(buyerId ?? "missing");
  const validationQueryKey = queryKeys.buyer.cartValidation(buyerId ?? "missing");

  return useMutation({
    mutationFn: async (
      payload: {
        product: Pick<
          PublicProduct,
          | "artisan_id"
          | "availability_mode"
          | "id"
          | "image_url"
          | "image_urls"
          | "product_media"
          | "lead_time_days"
          | "price"
          | "stock_quantity"
          | "title"
        >;
        selection?: CartProductSelectionInput;
      },
    ) => {
      if (!buyerId) {
        throw new Error("Necesitas una cuenta de comprador para usar el carrito.");
      }

      const response = await addProductToBuyerCart(buyerId, payload);

      if (response.error) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos agregar este producto al carrito."),
        );
      }

      return response.data;
    },
    onMutate: async (payload) => {
      if (!buyerId) {
        return { previousCart: null as CartRecord | null };
      }

      await queryClient.cancelQueries({ queryKey });
      const previousCart = queryClient.getQueryData<CartRecord | null>(queryKey);
      const optimisticCart = upsertOptimisticCartItem(
        createOptimisticCart(buyerId, previousCart),
        payload,
      );

      queryClient.setQueryData(queryKey, optimisticCart);

      return { previousCart };
    },
    onError: (_error, _payload, context) => {
      queryClient.setQueryData(queryKey, context?.previousCart ?? null);
    },
    onSuccess: (data) => {
      void queryClient.setQueryData(queryKey, data);
      void queryClient.invalidateQueries({ queryKey: validationQueryKey });
    },
  });
}

export function useUpdateCartItemQuantity(buyerId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.buyer.cart(buyerId ?? "missing");
  const validationQueryKey = queryKeys.buyer.cartValidation(buyerId ?? "missing");

  return useMutation({
    mutationFn: async (payload: { cartItemId: string; quantity: number }) => {
      if (!buyerId) {
        throw new Error("Necesitas una cuenta de comprador para editar el carrito.");
      }

      const response = await updateBuyerCartItemQuantity(
        buyerId,
        payload.cartItemId,
        payload.quantity,
      );

      if (response.error) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos actualizar este producto en el carrito."),
        );
      }

      return response.data;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey });
      const previousCart = queryClient.getQueryData<CartRecord | null>(queryKey);

      queryClient.setQueryData(
        queryKey,
        updateOptimisticCartItemQuantity(previousCart, payload.cartItemId, payload.quantity),
      );

      return { previousCart };
    },
    onError: (_error, _payload, context) => {
      queryClient.setQueryData(queryKey, context?.previousCart ?? null);
    },
    onSuccess: (data) => {
      void queryClient.setQueryData(queryKey, data);
      void queryClient.invalidateQueries({ queryKey: validationQueryKey });
    },
  });
}

export function useUpdateCartItemSelection(buyerId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.buyer.cart(buyerId ?? "missing");
  const validationQueryKey = queryKeys.buyer.cartValidation(buyerId ?? "missing");

  return useMutation({
    mutationFn: async (
      payload: {
        cartItemId: string;
        product: Pick<
          PublicProduct,
          | "availability_mode"
          | "id"
          | "image_url"
          | "image_urls"
          | "lead_time_days"
          | "price"
          | "product_media"
          | "stock_quantity"
          | "title"
        >;
        selection?: CartProductSelectionInput;
      },
    ) => {
      if (!buyerId) {
        throw new Error("Necesitas una cuenta de comprador para editar el carrito.");
      }

      const response = await updateBuyerCartItemSelection(buyerId, payload);

      if (response.error) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos actualizar esta configuracion."),
        );
      }

      return response.data;
    },
    onSuccess: (data) => {
      void queryClient.setQueryData(queryKey, data);
      void queryClient.invalidateQueries({ queryKey: validationQueryKey });
    },
  });
}

export function useRemoveCartItem(buyerId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.buyer.cart(buyerId ?? "missing");
  const validationQueryKey = queryKeys.buyer.cartValidation(buyerId ?? "missing");

  return useMutation({
    mutationFn: async (cartItemId: string) => {
      if (!buyerId) {
        throw new Error("Necesitas una cuenta de comprador para editar el carrito.");
      }

      const response = await removeBuyerCartItem(buyerId, cartItemId);

      if (response.error) {
        throw new Error(
          getErrorMessage(response.error, "No pudimos quitar este producto del carrito."),
        );
      }

      return response.data;
    },
    onMutate: async (cartItemId) => {
      await queryClient.cancelQueries({ queryKey });
      const previousCart = queryClient.getQueryData<CartRecord | null>(queryKey);

      queryClient.setQueryData(queryKey, removeOptimisticCartItem(previousCart, cartItemId));

      return { previousCart };
    },
    onError: (_error, _payload, context) => {
      queryClient.setQueryData(queryKey, context?.previousCart ?? null);
    },
    onSuccess: (data) => {
      void queryClient.setQueryData(queryKey, data);
      void queryClient.invalidateQueries({ queryKey: validationQueryKey });
    },
  });
}

import { Link, useLocation } from "react-router-dom";

import { saveProductDetailOrigin } from "../../../lib/browser/productDetailOrigin";
import type { BuyerCartValidatedItem } from "../../../types/commerce";
import {
  getAvailabilityLabel,
  getItemStatusClasses,
  getItemStatusLabel,
} from "../cartPageUtils";
import type {
  useRemoveCartItem,
  useUpdateCartItemQuantity,
  useUpdateCartItemSelection,
} from "../cartQueries";
import { CartItemOptionsEditor } from "./CartItemOptionsEditor";

type BuyerCartItemCardProps = {
  item: BuyerCartValidatedItem;
  onError: (message: string) => void;
  onMessage: (message: string) => void;
  onStartAction: () => void;
  removeCartItemMutation: ReturnType<typeof useRemoveCartItem>;
  updateQuantityMutation: ReturnType<typeof useUpdateCartItemQuantity>;
  updateSelectionMutation: ReturnType<typeof useUpdateCartItemSelection>;
};

function buildCartDetailState(item: BuyerCartValidatedItem) {
  return {
    cartEdit: {
      cartItemId: item.cart_item_id,
      quantity: item.quantity,
      returnTo: "/panel/comprador/carrito",
      selectedOptions: item.selected_options,
    },
  };
}

export function BuyerCartItemCard({
  item,
  onError,
  onMessage,
  onStartAction,
  removeCartItemMutation,
  updateQuantityMutation,
  updateSelectionMutation,
}: BuyerCartItemCardProps) {
  const location = useLocation();

  return (
    <article
      key={item.id}
      className="grid items-start gap-4 rounded-3xl border border-stone-200 bg-white p-4 sm:grid-cols-[104px_minmax(0,1fr)]"
    >
      <Link
        className="self-start overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 transition hover:border-ocean-200"
        onClick={() => {
          saveProductDetailOrigin(location);
        }}
        state={buildCartDetailState(item)}
        to={`/producto/${item.product_id}`}
      >
        {item.product_image_url ? (
          <img
            alt={item.product_title}
            className="aspect-[4/3] w-full object-cover"
            decoding="async"
            loading="lazy"
            src={item.product_image_url}
          />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center px-3 text-center text-xs font-semibold uppercase tracking-widest text-stone-500">
            Sin imagen
          </div>
        )}
      </Link>

      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                className="text-base font-semibold text-stone-900 transition hover:text-ocean-500"
                onClick={() => {
                  saveProductDetailOrigin(location);
                }}
                state={buildCartDetailState(item)}
                to={`/producto/${item.product_id}`}
              >
                {item.product_title}
              </Link>
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-widest ${getItemStatusClasses(item.status)}`}
              >
                {getItemStatusLabel(item.status)}
              </span>
            </div>
            <p className="mt-2 text-sm text-stone-500">
              ${Number(item.effective_unit_price).toLocaleString("es-AR")} por unidad
            </p>
            {item.selected_options_summary ? (
              <p className="mt-1 text-sm text-stone-500">{item.selected_options_summary}</p>
            ) : null}
            <p className="mt-1 text-sm text-stone-500">{getAvailabilityLabel(item)}</p>
            {item.category_name ? (
              <p className="mt-1 text-xs font-medium uppercase tracking-widest text-stone-400">
                {item.category_name}
              </p>
            ) : null}
          </div>
          <p className="text-sm font-semibold text-brand-500">
            ${Number(item.effective_line_total).toLocaleString("es-AR")}
          </p>
        </div>

        {item.blockers.length > 0 ? (
          <div className="grid gap-2 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-500">
            {item.blockers.map((blocker: string) => (
              <p key={blocker}>{blocker}</p>
            ))}
          </div>
        ) : null}

        {item.notices.length > 0 ? (
          <div className="grid gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-stone-700">
            {item.notices.map((notice: string) => (
              <p key={notice}>{notice}</p>
            ))}
          </div>
        ) : null}

        <CartItemOptionsEditor
          item={item}
          onError={onError}
          onSaved={() => {
            onMessage("Opciones guardadas.");
          }}
          updateSelectionMutation={updateSelectionMutation}
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white text-lg font-semibold text-stone-700 transition-colors hover:border-ocean-300 hover:text-ocean-600 disabled:opacity-50"
            disabled={updateQuantityMutation.isPending}
            onClick={async () => {
              onStartAction();
              const response = await updateQuantityMutation
                .mutateAsync({
                  cartItemId: item.cart_item_id,
                  quantity: item.quantity - 1,
                })
                .catch((error: Error) => {
                  onError(error.message);
                  return null;
                });

              if (response) {
                onMessage("Cantidad actualizada.");
              }
            }}
            type="button"
          >
            -
          </button>
          <span className="inline-flex min-w-[3rem] items-center justify-center rounded-full bg-stone-100 px-3 py-2 text-sm font-semibold text-stone-700">
            {item.quantity}
          </span>
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white text-lg font-semibold text-stone-700 transition-colors hover:border-ocean-300 hover:text-ocean-600 disabled:opacity-50"
            disabled={updateQuantityMutation.isPending}
            onClick={async () => {
              onStartAction();
              const response = await updateQuantityMutation
                .mutateAsync({
                  cartItemId: item.cart_item_id,
                  quantity: item.quantity + 1,
                })
                .catch((error: Error) => {
                  onError(error.message);
                  return null;
                });

              if (response) {
                onMessage("Cantidad actualizada.");
              }
            }}
            type="button"
          >
            +
          </button>
          <button
            className="ml-auto inline-flex min-h-10 items-center justify-center rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-brand-300 hover:bg-brand-100 hover:text-brand-500 disabled:opacity-50"
            disabled={removeCartItemMutation.isPending}
            onClick={async () => {
              onStartAction();
              const response = await removeCartItemMutation
                .mutateAsync(item.cart_item_id)
                .catch((error: Error) => {
                  onError(error.message);
                  return null;
                });

              if (response) {
                onMessage("Producto quitado del carrito.");
              }
            }}
            type="button"
          >
            Quitar
          </button>
        </div>
      </div>
    </article>
  );
}

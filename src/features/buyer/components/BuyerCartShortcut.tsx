import { NavLink } from "react-router-dom";

import { useBuyerActiveCart } from "../cartQueries";

type BuyerCartShortcutProps = {
  buyerId: string | undefined;
};

export function BuyerCartShortcut({ buyerId }: BuyerCartShortcutProps) {
  const buyerCartQuery = useBuyerActiveCart(buyerId, Boolean(buyerId));
  const buyerCartCount = (buyerCartQuery.data?.items ?? []).reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const hasCartItems = buyerCartCount > 0;

  return (
    <NavLink
      className={({ isActive }) =>
        [
          "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-[12px] font-semibold transition-all sm:gap-2 sm:px-4 sm:text-sm",
          isActive
            ? "border-2 border-ocean-500 bg-ocean-500 text-white shadow-[0_8px_24px_-12px_rgba(71,85,105,0.8)]"
            : hasCartItems
              ? "border-2 border-brand-500 bg-brand-50 text-brand-500 shadow-[0_10px_30px_-18px_rgba(8,145,178,0.55)] hover:border-brand-500 hover:bg-brand-100"
              : "border-2 border-ocean-500 bg-white text-ocean-500 hover:bg-ocean-500 hover:text-white",
        ].join(" ")
      }
      to="/panel/comprador/carrito"
    >
      <span aria-hidden="true">{hasCartItems ? "ðŸ›’" : "ðŸ§º"}</span>
      <span className="sm:hidden">{hasCartItems ? "Pagar" : "Carrito"}</span>
      <span className="hidden sm:inline">{hasCartItems ? "Ir a pagar" : "Carrito"}</span>
      {hasCartItems ? (
        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-brand-500 shadow-sm">
          {buyerCartCount}
        </span>
      ) : null}
    </NavLink>
  );
}

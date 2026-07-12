export const CHECKOUT_CANCELLED_MESSAGE =
  "No se realizo la compra. Tu carrito sigue pendiente para cuando quieras continuar.";

type CheckoutReturnLocation = {
  search: string;
  state: unknown;
};

export function getCheckoutReturnMessage(location: CheckoutReturnLocation) {
  const state =
    typeof location.state === "object" && location.state !== null
      ? (location.state as { cartNotice?: unknown })
      : null;

  if (typeof state?.cartNotice === "string" && state.cartNotice.trim()) {
    return state.cartNotice;
  }

  const searchParams = new URLSearchParams(location.search);

  return searchParams.get("checkout") === "cancelled" ? CHECKOUT_CANCELLED_MESSAGE : null;
}

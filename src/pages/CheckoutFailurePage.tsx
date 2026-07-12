import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getActionButtonClassName } from "../components/ActionButton";
import { PagePlaceholder } from "../components/PagePlaceholder";
import { useAuth } from "../features/auth/useAuth";

const CHECKOUT_CANCELLED_MESSAGE =
  "No se realizo la compra. Tu carrito sigue pendiente para cuando quieras continuar.";

export function CheckoutFailurePage() {
  const navigate = useNavigate();
  const { isLoading, role, user } = useAuth();

  useEffect(() => {
    if (isLoading || !user || role !== "buyer") {
      return;
    }

    navigate("/panel/comprador/carrito?checkout=cancelled", {
      replace: true,
      state: { cartNotice: CHECKOUT_CANCELLED_MESSAGE },
    });
  }, [isLoading, navigate, role, user]);

  if (isLoading || (user && role === "buyer")) {
    return (
      <PagePlaceholder
        badge="Compra"
        description="Te estamos llevando de vuelta al carrito."
        title="Compra pendiente"
      />
    );
  }

  return (
    <PagePlaceholder
      actions={
        <Link
          className={getActionButtonClassName({ variant: "brandGhost" })}
          state={{ cartNotice: CHECKOUT_CANCELLED_MESSAGE }}
          to="/panel/comprador/carrito?checkout=cancelled"
        >
          Volver al carrito
        </Link>
      }
      badge="Compra"
      description="No se realizo la compra. Si estabas comprando, tu carrito sigue pendiente."
      title="Compra pendiente"
    />
  );
}

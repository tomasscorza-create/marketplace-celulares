import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/useAuth";
import { useAddProductToCart } from "../cartQueries";
import type { CartProductSelectionInput, PublicProduct } from "../../../types/public";

type AddToCartButtonProps = {
  className?: string;
  compact?: boolean;
  disabled?: boolean;
  disabledLabel?: string;
  labels?: {
    added?: string;
    buyerOnly?: string;
    buyerOnlyNotice?: string;
    idle?: string;
    login?: string;
    pending?: string;
  };
  onAdded?: () => void;
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
};

export function AddToCartButton({
  className,
  compact = false,
  disabled = false,
  disabledLabel,
  labels,
  onAdded,
  product,
  selection,
}: AddToCartButtonProps) {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const addToCartMutation = useAddProductToCart(role === "buyer" ? user?.id : undefined);
  const [showBuyerOnlyNotice, setShowBuyerOnlyNotice] = useState(false);

  useEffect(() => {
    if (!showBuyerOnlyNotice) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setShowBuyerOnlyNotice(false);
    }, 2400);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [showBuyerOnlyNotice]);

  if (!user) {
    return (
      <Link className={className} to="/login">
        {labels?.login ?? (compact ? "Ingresar" : "Ingresar para comprar")}
      </Link>
    );
  }

  if (role !== "buyer") {
    return (
      <div className="relative">
        {showBuyerOnlyNotice ? (
          <div className="pointer-events-none absolute bottom-[calc(100%+0.55rem)] left-1/2 z-20 w-[min(17rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-sun-500/55 bg-white px-3.5 py-3 text-center text-xs font-medium leading-5 text-ocean-500 shadow-[0_18px_40px_-24px_rgba(71,85,105,0.55)]">
            {labels?.buyerOnlyNotice ?? "Ingresa como miembro de la comunidad para comprar"}
          </div>
        ) : null}

        <button
          className={className}
          onClick={() => {
            setShowBuyerOnlyNotice(true);
          }}
          type="button"
        >
          {labels?.idle ?? (compact ? "Agregar" : "Agregar al carrito")}
        </button>
      </div>
    );
  }

  if (disabled) {
    return (
      <button className={className} disabled type="button">
        {disabledLabel ?? "No disponible"}
      </button>
    );
  }

  return (
    <button
      className={className}
      disabled={addToCartMutation.isPending}
      onClick={async () => {
        const response = await addToCartMutation
          .mutateAsync({
            product,
            selection,
          })
          .catch(() => {
            return null;
          });

        if (response) {
          onAdded?.();
          navigate("/panel/comprador/carrito");
        }
      }}
      type="button"
    >
      {addToCartMutation.isPending
        ? labels?.pending ?? "Agregando..."
        : labels?.idle ?? (compact ? "Agregar" : "Agregar al carrito")}
    </button>
  );
}

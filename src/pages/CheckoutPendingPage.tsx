import { Link, useSearchParams } from "react-router-dom";

import { getActionButtonClassName } from "../components/ActionButton";
import { PagePlaceholder } from "../components/PagePlaceholder";

export function CheckoutPendingPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id");
  const targetPath = orderId ? `/panel/comprador/pedidos/${orderId}` : "/panel/comprador/carrito";

  return (
    <PagePlaceholder
      actions={
        <Link className={getActionButtonClassName({ variant: "ghost" })} to={targetPath}>
          {orderId ? "Ver pedido" : "Volver al carrito"}
        </Link>
      }
      badge="Pago"
      description="El pago todavia esta pendiente."
      title="Pago pendiente"
    />
  );
}

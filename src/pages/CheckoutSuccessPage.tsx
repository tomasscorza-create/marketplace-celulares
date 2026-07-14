import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { getActionButtonClassName } from "../components/ActionButton";
import { PagePlaceholder } from "../components/PagePlaceholder";
import { useAuth } from "../features/auth/useAuth";
import { trackAnalyticsEvent } from "../features/analytics/analyticsClient";
import { useBuyerOrder } from "../features/buyer/buyerQueries";

export function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const { role, user } = useAuth();
  const syncStatus = searchParams.get("sync");
  const orderId = searchParams.get("order_id");
  const ordersPath = orderId ? `/panel/comprador/pedidos/${orderId}` : "/panel/comprador";
  const orderQuery = useBuyerOrder(
    user?.id,
    orderId ?? undefined,
    Boolean(user?.id && orderId && role === "buyer"),
  );
  const hasSyncProblem = Boolean(syncStatus && syncStatus !== "ok");
  const order = orderQuery.data;
  const isApproved = order?.payment_status === "approved";

  useEffect(() => {
    if (!orderId || isApproved || role !== "buyer") {
      return;
    }

    const timer = window.setInterval(() => {
      void orderQuery.refetch();
    }, 3000);

    return () => {
      window.clearInterval(timer);
    };
  }, [isApproved, orderId, orderQuery, role]);

  useEffect(() => {
    if (!isApproved || !orderId || role !== "buyer") return;
    const marker = `analytics_purchase_recorded:${orderId}`;
    try {
      if (sessionStorage.getItem(marker)) return;
      sessionStorage.setItem(marker, "true");
    } catch {
      // The event can still be sent when session storage is unavailable.
    }
    void trackAnalyticsEvent("purchase_completed", {
      entityId: orderId,
      entityType: "checkout",
      path: window.location.pathname,
    });
  }, [isApproved, orderId, role]);

  const title = isApproved
    ? "Compra confirmada"
    : hasSyncProblem || orderQuery.isLoading
      ? "Pago en verificacion"
      : "Compra recibida";
  const description = isApproved
    ? "Tu pago fue aprobado. Ya podes seguir el pedido."
    : "Estamos verificando el estado final del pago.";

  return (
    <PagePlaceholder
      actions={
        <Link
          className={getActionButtonClassName({
            variant: isApproved ? "primary" : "ghost",
          })}
          to={ordersPath}
        >
          {orderId ? "Ver pedido" : "Ver mis pedidos"}
        </Link>
      }
      badge="Pago"
      description={description}
      title={title}
    />
  );
}

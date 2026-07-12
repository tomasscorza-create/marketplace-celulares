import { getDeliveryLabel } from "./fulfillment";

type SaleDeliveryNoteItem = {
  amount: number;
  details: string | null;
  id: string;
  productTitle: string;
  quantity: number;
  sellerName?: string | null;
};

type SaleDeliveryNoteProps = {
  address: string | null;
  deliveryNotes?: string | null;
  deliveryType: string;
  items: SaleDeliveryNoteItem[];
  phone: string;
};

function formatCurrency(value: number) {
  return `$${Number(value).toLocaleString("es-AR")}`;
}

export function SaleDeliveryNote({
  address,
  deliveryNotes,
  deliveryType,
  items,
  phone,
}: SaleDeliveryNoteProps) {
  const cleanAddress = address?.trim() || "";
  const shouldShowAddress = Boolean(cleanAddress) || deliveryType !== "pickup";

  return (
    <details className="group rounded-2xl border border-stone-200 bg-white text-sm text-stone-700">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl bg-[#ECFEFF] px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-600 [&::-webkit-details-marker]:hidden">
        Detalles
        <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] text-stone-500 group-open:hidden">
          +
        </span>
        <span className="hidden rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] text-stone-500 group-open:inline">
          -
        </span>
      </summary>

      <div className="grid gap-3 border-t border-stone-100 p-3">
        <dl className="grid gap-2 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
              Telefono
            </dt>
            <dd className="mt-1 font-medium text-stone-900">{phone || "Sin telefono"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
              Entrega
            </dt>
            <dd className="mt-1 font-medium text-stone-900">{getDeliveryLabel(deliveryType)}</dd>
          </div>
          {shouldShowAddress ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
                Direccion
              </dt>
              <dd className="mt-1 font-medium text-stone-900">{cleanAddress || "A coordinar"}</dd>
            </div>
          ) : null}
        </dl>

        {deliveryNotes ? <p className="rounded-2xl bg-stone-50 px-3 py-2">{deliveryNotes}</p> : null}

        <div className="grid gap-2">
          {items.map((item) => (
            <article
              key={item.id}
              className="grid gap-2 rounded-2xl border border-stone-100 bg-stone-50/70 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="min-w-0">
                <p className="font-medium text-stone-900">
                  {item.productTitle || "Producto"} x{item.quantity}
                </p>
                {item.sellerName ? (
                  <p className="mt-0.5 text-xs text-stone-500">{item.sellerName}</p>
                ) : null}
                <p className="mt-1 text-sm text-stone-600">
                  {item.details || "Sin variantes"}
                </p>
              </div>
              <p className="font-semibold text-stone-900 sm:text-right">{formatCurrency(item.amount)}</p>
            </article>
          ))}
        </div>
      </div>
    </details>
  );
}

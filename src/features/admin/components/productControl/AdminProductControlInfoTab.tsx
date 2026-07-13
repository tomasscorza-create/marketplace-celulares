import { memo } from "react";
import { Link } from "react-router-dom";

import { StatCard } from "./shared";

type AdminProductControlInfoTabProps = {
  createdAtLabel: string;
  imageUrl: string | null;
  lastSaleAtLabel: string | null;
  leadTimeLabel: string | null;
  priceLabel: string;
  productEditHref: string | null;
  productTitle: string;
  salesAmountLabel: string;
  salesCountLabel: string;
  soldUnitsLabel: string;
  statusLabel: string;
};

/**
 * Tab "Información" del modal de control de productos. Solo visualiza
 * datos del producto, sin estado interno.
 */
function AdminProductControlInfoTabInner({
  createdAtLabel,
  imageUrl,
  lastSaleAtLabel,
  leadTimeLabel,
  priceLabel,
  productEditHref,
  productTitle,
  salesAmountLabel,
  salesCountLabel,
  soldUnitsLabel,
  statusLabel,
}: AdminProductControlInfoTabProps) {
  return (
    <div className="grid gap-4 p-5">
      <div className="overflow-hidden rounded-3xl border border-stone-200 bg-[linear-gradient(180deg,_#fffdf7,_#ffffff)]">
        {imageUrl ? (
          <img alt={productTitle} className="aspect-[16/10] w-full object-cover" src={imageUrl} />
        ) : (
          <div className="flex aspect-[16/10] items-center justify-center text-sm font-medium text-stone-500">
            Sin imagen cargada
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Precio" value={priceLabel} />
        <StatCard label="Estado" value={statusLabel} />
        <StatCard label="Creado" value={createdAtLabel} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Ventas" value={salesCountLabel} />
        <StatCard label="Unidades" value={soldUnitsLabel} />
        <StatCard label="Facturación" value={salesAmountLabel} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label="Última venta" value={lastSaleAtLabel ?? "Sin ventas todavía"} muted />
        <StatCard label="Producción" value={leadTimeLabel ?? "Sin demora configurada"} muted />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/70 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">Vistas</p>
          <p className="mt-2 text-sm font-medium text-stone-500">Disponible (próximo)</p>
        </div>
        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/70 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">Conversión</p>
          <p className="mt-2 text-sm font-medium text-stone-500">Disponible (próximo)</p>
        </div>
      </div>

      {productEditHref ? (
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-ocean-500 bg-brand-50 px-4 py-3 text-sm font-semibold text-ocean-500 transition-colors hover:bg-brand-100"
          to={productEditHref}
        >
          Ir a editar producto
        </Link>
      ) : null}
    </div>
  );
}

export const AdminProductControlInfoTab = memo(AdminProductControlInfoTabInner);

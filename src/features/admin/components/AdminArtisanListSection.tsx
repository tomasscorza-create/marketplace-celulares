import type { AdminArtisanProfile } from "../../../types/admin";

import { getActionButtonClassName } from "../../../components/ActionButton";
import { LoadingPanel } from "../../../components/LoadingPanel";

type AdminArtisanListSectionProps = {
  artisans: AdminArtisanProfile[];
  isLoading: boolean;
  onDeleteRequest: (artisan: AdminArtisanProfile) => void;
  onEdit: (artisan: AdminArtisanProfile) => void;
  onSearchChange: (value: string) => void;
  searchValue: string;
  totalCount: number;
};

function formatCreatedAt(createdAt: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(createdAt));
}

export function AdminArtisanListSection({
  artisans,
  isLoading,
  onDeleteRequest,
  onEdit,
  onSearchChange,
  searchValue,
  totalCount,
}: AdminArtisanListSectionProps) {
  return (
    <section className="grid gap-4">
      <div className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-stone-900">Editar vendedores</h2>
            <p className="text-sm text-stone-500">
              {isLoading
                ? "Cargando cuentas..."
                : `${artisans.length} visibles de ${totalCount} cuenta(s).`}
            </p>
          </div>
          <span className="rounded-full bg-stone-100 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-stone-600">
            Edicion
          </span>
        </div>

        <input
          className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100"
          onChange={(event) => {
            onSearchChange(event.target.value);
          }}
          placeholder="Buscar por tienda, nombre o mail"
          type="search"
          value={searchValue}
        />
      </div>

      <div className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex items-center justify-between gap-3 px-2 py-1 text-xs font-semibold uppercase tracking-widest text-stone-500">
          <span>Listado</span>
          <span>{artisans.length} resultado(s)</span>
        </div>

        {isLoading ? (
          <LoadingPanel compact label="Cargando cuentas..." />
        ) : (
          <div className="max-h-[min(68dvh,58rem)] overflow-y-auto pr-1 [scrollbar-width:thin]">
            <div className="grid gap-3">
              {artisans.map((artisan) => (
                <article
                  key={artisan.id}
                  className="grid gap-4 rounded-3xl border border-stone-200 bg-stone-50/80 p-4 lg:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <div className="min-w-0 space-y-3">
                    <div className="space-y-2">
                      <h3 className="text-base font-semibold text-stone-900">
                        {artisan.store_name || artisan.full_name}
                      </h3>

                      <div className="grid gap-1 text-sm text-stone-500">
                        <p>{artisan.full_name}</p>
                        <p className="break-all">{artisan.email}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-stone-600">
                      <span className="rounded-full bg-white px-3 py-1.5">
                        Alta {formatCreatedAt(artisan.created_at)}
                      </span>
                      {artisan.store_name?.trim() ? (
                        <span className="rounded-full bg-white px-3 py-1.5">Con tienda</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 lg:w-48 lg:grid-cols-1">
                    <button
                      className={getActionButtonClassName({ size: "sm", variant: "ghost" })}
                      onClick={() => {
                        onEdit(artisan);
                      }}
                      type="button"
                    >
                      Editar
                    </button>
                    <button
                      className={getActionButtonClassName({ size: "sm", variant: "danger" })}
                      onClick={() => {
                        onDeleteRequest(artisan);
                      }}
                      type="button"
                    >
                      Borrar
                    </button>
                  </div>
                </article>
              ))}

              {artisans.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-stone-300 bg-white/80 p-6 text-sm leading-6 text-stone-600">
                  {searchValue.trim()
                    ? "No encontramos vendedores con esa busqueda."
                    : "Todavia no hay perfiles vendedores creados desde administracion."}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

import type { AdminCategory } from "../../../types/admin";

import { getActionButtonClassName } from "../../../components/ActionButton";
import { LoadingPanel } from "../../../components/LoadingPanel";

type AdminCategoryListSectionProps = {
  categories: AdminCategory[];
  isLoading: boolean;
  onEdit: (category: AdminCategory) => void;
  onSearchChange: (value: string) => void;
  searchValue: string;
  totalCount: number;
};

export function AdminCategoryListSection({
  categories,
  isLoading,
  onEdit,
  onSearchChange,
  searchValue,
  totalCount,
}: AdminCategoryListSectionProps) {
  return (
    <section className="grid gap-4">
      <div className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-stone-900">Categorias</h2>
            <p className="text-sm text-stone-500">
              {isLoading
                ? "Cargando categorias..."
                : `${categories.length} visibles de ${totalCount} categoria(s).`}
            </p>
          </div>
          <span className="rounded-full bg-stone-100 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-stone-600">
            Lista activa
          </span>
        </div>

        <input
          className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100"
          onChange={(event) => {
            onSearchChange(event.target.value);
          }}
          placeholder="Buscar por nombre o codigo"
          type="search"
          value={searchValue}
        />
      </div>

      <div className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex items-center justify-between gap-3 px-2 py-1 text-xs font-semibold uppercase tracking-widest text-stone-500">
          <span>Listado</span>
          <span>{categories.length} resultado(s)</span>
        </div>

        {isLoading ? (
          <LoadingPanel compact label="Cargando categorias..." />
        ) : (
          <div className="max-h-[min(68dvh,56rem)] overflow-y-auto pr-1 [scrollbar-width:thin]">
            <div className="grid gap-3">
              {categories.map((category) => (
                <article
                  key={category.id}
                  className="grid gap-4 rounded-3xl border border-stone-200 bg-stone-50/80 p-4 lg:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-stone-900">{category.name}</h3>
                      <span
                        className={[
                          "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest",
                          category.is_active
                            ? "bg-ocean-50 text-ocean-700"
                            : "bg-stone-200 text-stone-600",
                        ].join(" ")}
                      >
                        {category.is_active ? "Activa" : "Inactiva"}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-stone-600">
                      <span className="rounded-full bg-white px-3 py-1.5">{category.slug}</span>
                    </div>
                  </div>

                  <div className="grid gap-2 lg:w-36">
                    <button
                      className={getActionButtonClassName({ size: "sm", variant: "ghost" })}
                      onClick={() => {
                        onEdit(category);
                      }}
                      type="button"
                    >
                      Editar
                    </button>
                  </div>
                </article>
              ))}

              {categories.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-stone-300 bg-white/80 p-6 text-sm leading-6 text-stone-600">
                  {searchValue.trim()
                    ? "No encontramos categorias con esa busqueda."
                    : "Todavia no hay categorias creadas."}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

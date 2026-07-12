import { memo, useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import type { PublicCatalogSortOrder, PublicCategory } from "../../../types/public";

type CatalogStickySearchBarProps = {
  categories: PublicCategory[];
  draftSearch: string;
  hasActiveFilters: boolean;
  isVisible: boolean;
  onCategoryChange: (slug: string | null) => void;
  onClearFilters: () => void;
  onDraftSearchChange: (value: string) => void;
  onSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSortOrderChange: (sortOrder: PublicCatalogSortOrder) => void;
  selectedCategory: PublicCategory | null;
  selectedSortOrder: PublicCatalogSortOrder;
};

const sortOptions: { label: string; value: PublicCatalogSortOrder }[] = [
  { label: "Novedad", value: "newest" },
  { label: "Menor precio", value: "price-asc" },
  { label: "Mayor precio", value: "price-desc" },
];

function CatalogStickySearchBarInner({
  categories,
  draftSearch,
  hasActiveFilters,
  isVisible,
  onCategoryChange,
  onClearFilters,
  onDraftSearchChange,
  onSearchSubmit,
  onSortOrderChange,
  selectedCategory,
  selectedSortOrder,
}: CatalogStickySearchBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFiltersMenuOpen, setIsFiltersMenuOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isVisible) {
      setIsExpanded(false);
      setIsFiltersMenuOpen(false);
      setIsCategoriesOpen(false);
      setCategorySearch("");
    }
  }, [isVisible]);

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setIsExpanded(false);
        setIsFiltersMenuOpen(false);
        setIsCategoriesOpen(false);
        setCategorySearch("");
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsExpanded(false);
        setIsFiltersMenuOpen(false);
        setIsCategoriesOpen(false);
        setCategorySearch("");
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isExpanded]);

  if (!isVisible) {
    return null;
  }

  const activeFilterLabel =
    selectedCategory?.name ??
    sortOptions.find((option) => option.value === selectedSortOrder)?.label ??
    "Filtros";

  return (
    <div className="fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+4.15rem)] z-40 px-3 sm:top-[calc(env(safe-area-inset-top,0px)+4.55rem)] sm:px-6">
      <div className="mx-auto max-w-6xl" ref={panelRef}>
        <div className="rounded-2xl border border-stone-200 bg-[#fffdf8] shadow-[0_16px_34px_-24px_rgba(15,23,42,0.65)]">
          <button
            aria-expanded={isExpanded}
            className="flex min-h-10 w-full items-center justify-between gap-3 px-3 py-2 text-left sm:min-h-11 sm:px-4"
            onClick={() => {
              setIsExpanded((currentValue) => {
                const nextValue = !currentValue;
                if (!nextValue) {
                  setIsFiltersMenuOpen(false);
                  setIsCategoriesOpen(false);
                  setCategorySearch("");
                }
                return nextValue;
              });
            }}
            type="button"
          >
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold uppercase tracking-[0.16em] text-brand-500">
                Catalogo
              </span>
              <span className="block truncate text-[11px] text-stone-500 sm:text-xs">
                {draftSearch.trim() || activeFilterLabel}
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-ocean-500">
              Buscar
              <span aria-hidden="true">{isExpanded ? "^" : "v"}</span>
            </span>
          </button>

          {isExpanded ? (
            <div className="grid max-h-[min(68dvh,32rem)] gap-3 overflow-y-auto border-t border-stone-100 bg-[#fffdf8] px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
              <form className="grid gap-2" onSubmit={onSearchSubmit}>
                <div className="flex gap-2">
                  <input
                    className="h-10 min-w-0 flex-1 rounded-full border border-stone-300 bg-white px-4 text-sm text-stone-900 outline-none focus:border-sun-500 focus:shadow-[0_0_0_3px_rgba(8,145,178,0.18)]"
                    onChange={(event) => {
                      onDraftSearchChange(event.target.value);
                    }}
                    placeholder="Buscar piezas o vendedores"
                    type="search"
                    value={draftSearch}
                  />
                  <button
                    className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-ocean-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-ocean-600"
                    onClick={() => {
                      setIsExpanded(false);
                      setIsFiltersMenuOpen(false);
                    }}
                    type="submit"
                  >
                    Ir
                  </button>
                  <button
                    aria-expanded={isFiltersMenuOpen}
                    className={[
                      "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors",
                      isFiltersMenuOpen
                        ? "border-ocean-500 bg-ocean-50 text-ocean-500"
                        : "border-stone-300 bg-white text-stone-700 hover:border-ocean-300 hover:text-ocean-500",
                    ].join(" ")}
                    onClick={() => {
                      setIsFiltersMenuOpen((currentValue) => !currentValue);
                      setIsCategoriesOpen(false);
                      setCategorySearch("");
                    }}
                    type="button"
                  >
                    Filtros
                    <span aria-hidden="true">{isFiltersMenuOpen ? "^" : "v"}</span>
                  </button>
                </div>
              </form>

              {isFiltersMenuOpen ? (
                <div className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-3 shadow-[0_18px_44px_-30px_rgba(15,23,42,0.45)]">
                  <div className="grid gap-1">
                    <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">
                      Acceso
                    </p>
                    <Link
                      className="rounded-2xl border border-stone-200 px-3 py-2.5 text-sm font-medium text-ocean-500 transition-colors hover:bg-ocean-50"
                      onClick={() => {
                        setIsExpanded(false);
                        setIsFiltersMenuOpen(false);
                      }}
                      to="/vendedores"
                    >
                      Vendedores
                    </Link>
                  </div>

                  <div className="grid gap-1">
                    <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">
                      Orden
                    </p>
                    {sortOptions.map((option) => (
                      <button
                        className={[
                          "rounded-2xl px-3 py-2.5 text-left text-sm transition-colors",
                          selectedSortOrder === option.value
                            ? "bg-ocean-50 font-semibold text-ocean-500"
                            : "text-stone-700 hover:bg-stone-50",
                        ].join(" ")}
                        key={option.value}
                        onClick={() => {
                          onSortOrderChange(option.value);
                        }}
                        type="button"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {categories.length > 0 ? (
                    <div className="grid gap-1">
                      <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">
                        Etiquetas
                      </p>
                      <button
                        className={[
                          "flex items-center justify-between rounded-2xl border px-3 py-2.5 text-left text-sm font-medium transition-colors",
                          isCategoriesOpen
                            ? "border-ocean-500/30 bg-ocean-50 text-ocean-500"
                            : selectedCategory !== null
                              ? "border-sun-500/40 bg-sun-50 font-semibold text-brand-500"
                              : "border-stone-200 text-stone-700 hover:bg-stone-50",
                        ].join(" ")}
                        onClick={() => {
                          setIsCategoriesOpen((currentValue) => !currentValue);
                          setCategorySearch("");
                        }}
                        type="button"
                      >
                        <span>{selectedCategory !== null ? selectedCategory.name : "Todas las etiquetas"}</span>
                        <span aria-hidden="true">{isCategoriesOpen ? "^" : "v"}</span>
                      </button>

                      {isCategoriesOpen ? (
                        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
                          <div className="border-b border-stone-200 p-2">
                            <input
                              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-sun-500"
                              onChange={(event) => {
                                setCategorySearch(event.target.value);
                              }}
                              placeholder="Buscar etiqueta..."
                              type="search"
                              value={categorySearch}
                            />
                          </div>

                          <div className="max-h-[220px] overflow-y-auto py-1">
                            {("todas".includes(categorySearch.toLowerCase()) ||
                              categorySearch.trim() === "") ? (
                              <button
                                className={[
                                  "w-full px-3 py-2 text-left text-sm transition-colors",
                                  selectedCategory === null
                                    ? "bg-ocean-50 font-semibold text-ocean-500"
                                    : "text-stone-700 hover:bg-stone-100",
                                ].join(" ")}
                                onClick={() => {
                                  onCategoryChange(null);
                                  setIsCategoriesOpen(false);
                                }}
                                type="button"
                              >
                                Todas
                              </button>
                            ) : null}

                            {categories
                              .filter((category) =>
                                category.name.toLowerCase().includes(categorySearch.toLowerCase()),
                              )
                              .map((category) => (
                                <button
                                  className={[
                                    "w-full px-3 py-2 text-left text-sm transition-colors",
                                    selectedCategory?.id === category.id
                                      ? "bg-sun-50 font-semibold text-brand-500"
                                      : "text-stone-700 hover:bg-stone-100",
                                  ].join(" ")}
                                  key={category.id}
                                  onClick={() => {
                                    onCategoryChange(
                                      selectedCategory?.id === category.id ? null : category.slug,
                                    );
                                    setIsCategoriesOpen(false);
                                  }}
                                  type="button"
                                >
                                  {category.name}
                                </button>
                              ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {hasActiveFilters ? (
                    <button
                      className="rounded-2xl border border-brand-500 px-3 py-2.5 text-sm font-semibold text-brand-500 transition-colors hover:bg-brand-50"
                      onClick={() => {
                        onClearFilters();
                        setIsExpanded(false);
                        setIsFiltersMenuOpen(false);
                      }}
                      type="button"
                    >
                      Limpiar filtros
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export const CatalogStickySearchBar = memo(CatalogStickySearchBarInner);

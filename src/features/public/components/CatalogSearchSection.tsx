import { memo, useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";

import type { PublicCatalogSortOrder, PublicCategory } from "../../../types/public";

type CatalogSearchSectionProps = {
  categories: PublicCategory[];
  draftSearch: string;
  hasActiveFilters: boolean;
  onCategoryChange: (slug: string | null) => void;
  onClearFilters: () => void;
  onDraftSearchChange: (value: string) => void;
  onOpenTerms: () => void;
  onSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSortOrderChange: (sortOrder: PublicCatalogSortOrder) => void;
  selectedCategory: PublicCategory | null;
  selectedSortOrder: PublicCatalogSortOrder;
  showTermsButton: boolean;
  termsButtonLabel?: string;
};

/**
 * Sección clara superior del catálogo: título, botón de términos,
 * búsqueda, dropdown de filtros (portal) y barra de chips de categorías.
 *
 * Encapsula TODO el estado de UI local (categoryBarActive con timer 3s,
 * isFiltersMenuOpen, categoryScroll, etc.) para que sus re-renders no
 * afecten al feed de productos ni al bloque oscuro inferior.
 */
function CatalogSearchSectionInner({
  categories,
  draftSearch,
  hasActiveFilters,
  onCategoryChange,
  onClearFilters,
  onDraftSearchChange,
  onOpenTerms,
  onSearchSubmit,
  onSortOrderChange,
  selectedCategory,
  selectedSortOrder,
  showTermsButton,
  termsButtonLabel = "Información importante",
}: CatalogSearchSectionProps) {
  const [isFiltersMenuOpen, setIsFiltersMenuOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [filterPanelPos, setFilterPanelPos] = useState<{ top: number; right: number } | null>(null);
  const [categoryScroll, setCategoryScroll] = useState({ canLeft: false, canRight: false });
  const [categoryBarActive, setCategoryBarActive] = useState(false);

  const filtersMenuRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const categoryActiveTimerRef = useRef<number | null>(null);

  // Limpieza del timer al desmontar
  useEffect(() => {
    return () => {
      if (categoryActiveTimerRef.current !== null) {
        window.clearTimeout(categoryActiveTimerRef.current);
      }
    };
  }, []);

  // Activación de la barra de categorías — usada por handlers
  // y por el effect de scroll horizontal. Declarada como useCallback
  // con deps vacías porque solo toca refs y setters (todos estables).
  const activateCategoryBar = useCallback(() => {
    setCategoryBarActive(true);
    if (categoryActiveTimerRef.current !== null) {
      window.clearTimeout(categoryActiveTimerRef.current);
    }
    categoryActiveTimerRef.current = window.setTimeout(() => {
      setCategoryBarActive(false);
    }, 3000);
  }, []);

  const scrollCategories = useCallback(
    (dir: "left" | "right") => {
      categoryScrollRef.current?.scrollBy({
        left: dir === "left" ? -180 : 180,
        behavior: "smooth",
      });
      activateCategoryBar();
    },
    [activateCategoryBar],
  );

  // Cerrar dropdown: click fuera, Esc, scroll > 160px
  useEffect(() => {
    if (!isFiltersMenuOpen) {
      setIsCategoriesOpen(false);
      setCategorySearch("");
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const panel = document.getElementById("catalog-filters-panel");
      const clickedInsideButton = filtersMenuRef.current?.contains(event.target as Node);
      const clickedInsidePanel = panel?.contains(event.target as Node);
      if (!clickedInsideButton && !clickedInsidePanel) {
        setIsFiltersMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFiltersMenuOpen(false);
      }
    };

    const scrollOrigin = window.scrollY;
    const handleScroll = () => {
      if (Math.abs(window.scrollY - scrollOrigin) > 160) {
        setIsFiltersMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isFiltersMenuOpen]);

  // Detectar scroll horizontal en la barra de categorías
  useEffect(() => {
    const el = categoryScrollRef.current;
    if (!el) return;
    const update = () => {
      setCategoryScroll({
        canLeft: el.scrollLeft > 4,
        canRight: el.scrollLeft < el.scrollWidth - el.clientWidth - 4,
      });
    };
    const onScroll = () => {
      update();
      activateCategoryBar();
    };
    update();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [activateCategoryBar, categories]);

  function handleClearFiltersAndClose() {
    setIsFiltersMenuOpen(false);
    onClearFilters();
  }

  return (
    <section className="search-section grid gap-2.5 rounded-2xl border border-stone-200/70 p-3 sm:p-3.5">
      {/* Capa de efectos animados — overflow:hidden solo aquí, no afecta al dropdown */}
      <div aria-hidden="true" className="search-section-fx" />

      {showTermsButton && (
        <div className="flex justify-end">
          <button
            aria-label={termsButtonLabel}
            className={[
              "relative shrink-0 overflow-hidden rounded-xl px-4 py-2.5 text-sm font-bold tracking-wide text-white",
              "bg-gradient-to-br from-brand-400 via-brand-500 to-red-500",
              "shadow-[0_4px_18px_-2px_rgba(234,88,12,0.65),inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-1px_0_rgba(0,0,0,0.2)]",
              "transition-all duration-150 hover:brightness-110 hover:shadow-[0_6px_24px_-2px_rgba(234,88,12,0.75),inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.25)]",
              "active:scale-[0.97] active:brightness-95",
              "before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/20 before:to-transparent before:opacity-60",
            ].join(" ")}
            onClick={onOpenTerms}
            type="button"
          >
            <span className="relative">{termsButtonLabel}</span>
          </button>
        </div>
      )}

      <form aria-label="Buscar en el catálogo" className="grid gap-2" onSubmit={onSearchSubmit}>
        <div className="flex items-center gap-2">
          <div className="group relative min-w-0 flex-1">
            <input
              className="h-10 w-full rounded-full border border-stone-300 bg-white py-2 pl-5 pr-12 text-sm text-stone-900 shadow-sm outline-none transition-all duration-300 focus:border-brand-500 focus:shadow-[0_4px_20px_-4px_rgba(8,145,178,0.25)] sm:h-11"
              onChange={(event) => {
                onDraftSearchChange(event.target.value);
              }}
              placeholder="Buscar iPhone, fundas, accesorios..."
              type="search"
              value={draftSearch}
            />
            <button
              className="absolute right-1.5 top-1/2 inline-flex h-7 w-7 sm:h-8 sm:w-8 -translate-y-1/2 items-center justify-center rounded-full bg-brand-500 text-white shadow-sm transition-all duration-300 hover:scale-105 hover:bg-brand-400 hover:shadow-md active:scale-95"
              type="submit"
            >
              <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="sr-only">Buscar</span>
            </button>
          </div>

          <div className="relative" ref={filtersMenuRef}>
            <button
              ref={filterButtonRef}
              aria-controls="catalog-filters-panel"
              aria-expanded={isFiltersMenuOpen}
              aria-haspopup="dialog"
              className={[
                "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-700 transition-all duration-500 ease-out hover:border-brand-500 hover:text-brand-500 hover:bg-brand-50 sm:h-11 sm:w-11",
                categoryBarActive ? "opacity-100 scale-100" : "opacity-45 scale-[0.94]",
              ].join(" ")}
              onClick={() => {
                const rect = filterButtonRef.current?.getBoundingClientRect();
                if (rect) {
                  setFilterPanelPos({
                    top: rect.bottom + 8,
                    right: window.innerWidth - rect.right,
                  });
                }
                setIsFiltersMenuOpen((currentValue) => !currentValue);
                activateCategoryBar();
              }}
              type="button"
            >
              <span className="sr-only">Filtros</span>
              <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>

            {isFiltersMenuOpen && filterPanelPos
              ? createPortal(
                  <div
                    style={{ top: filterPanelPos.top, right: filterPanelPos.right }}
                    className="fixed z-[9999] w-[300px] max-w-[min(300px,calc(100vw-1rem))] rounded-3xl border border-stone-200 bg-white p-3 shadow-[0_24px_60px_-10px_rgba(15,23,42,0.40)]"
                    id="catalog-filters-panel"
                    role="dialog"
                  >
                    <div className="grid gap-3">
                      {/* Acceso */}
                      <div className="grid gap-1">
                        <p className="px-2 text-[11px] font-semibold uppercase tracking-widest text-stone-400">
                          Acceso
                        </p>
                        <Link
                          className="rounded-2xl border border-stone-200 px-3 py-2.5 text-sm font-medium text-ocean-500 transition-colors hover:bg-brand-50"
                          onClick={() => {
                            setIsFiltersMenuOpen(false);
                          }}
                          to="/vendedores"
                        >
                          Vendedores
                        </Link>
                      </div>

                      {/* Orden */}
                      <div className="grid gap-1">
                        <p className="px-2 text-[11px] font-semibold uppercase tracking-widest text-stone-400">
                          Orden
                        </p>
                        {[
                          { label: "Novedad", value: "newest" as const },
                          { label: "Precio más bajo", value: "price-asc" as const },
                          { label: "Precio más alto", value: "price-desc" as const },
                        ].map((option) => (
                          <button
                            key={option.value}
                            className={[
                              "rounded-2xl px-3 py-2.5 text-left text-sm transition-colors",
                              selectedSortOrder === option.value
                                ? "bg-brand-50 font-semibold text-ocean-500"
                                : "text-stone-700 hover:bg-stone-50",
                            ].join(" ")}
                            onClick={() => {
                              onSortOrderChange(option.value);
                            }}
                            type="button"
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>

                      {/* Etiquetas — sub-dropdown con buscador y scroll */}
                      <div className="grid gap-1">
                        <p className="px-2 text-[11px] font-semibold uppercase tracking-widest text-stone-400">
                          Etiquetas
                        </p>

                        <button
                          className={[
                            "flex items-center justify-between rounded-2xl border px-3 py-2.5 text-left text-sm font-medium transition-colors",
                            isCategoriesOpen
                              ? "border-ocean-500/30 bg-brand-50 text-ocean-500"
                              : selectedCategory !== null
                                ? "border-brand-500/40 bg-brand-100 font-semibold text-brand-500"
                                : "border-stone-200 text-stone-700 hover:bg-stone-50",
                          ].join(" ")}
                          onClick={() => {
                            setIsCategoriesOpen((v) => !v);
                            setCategorySearch("");
                          }}
                          type="button"
                        >
                          <span>
                            {selectedCategory !== null
                              ? selectedCategory.name
                              : "Todas las etiquetas"}
                          </span>
                          <svg
                            className={[
                              "h-4 w-4 shrink-0 transition-transform duration-200",
                              isCategoriesOpen ? "rotate-180" : "",
                            ].join(" ")}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                          >
                            <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>

                        {isCategoriesOpen ? (
                          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
                            <div className="border-b border-stone-200 p-2">
                              <input
                                autoFocus
                                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-brand-500"
                                onChange={(e) => {
                                  setCategorySearch(e.target.value);
                                }}
                                placeholder="Buscar etiqueta…"
                                type="search"
                                value={categorySearch}
                              />
                            </div>

                            <div className="max-h-[240px] overflow-y-auto py-1">
                              {("todas".includes(categorySearch.toLowerCase()) ||
                                categorySearch.trim() === "") && (
                                <button
                                  className={[
                                    "w-full px-3 py-2 text-left text-sm transition-colors",
                                    selectedCategory === null
                                      ? "bg-brand-50 font-semibold text-ocean-500"
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
                              )}

                              {categories
                                .filter((cat) =>
                                  cat.name.toLowerCase().includes(categorySearch.toLowerCase()),
                                )
                                .map((category) => (
                                  <button
                                    key={category.id}
                                    className={[
                                      "w-full px-3 py-2 text-left text-sm transition-colors",
                                      selectedCategory?.id === category.id
                                        ? "bg-brand-100 font-semibold text-brand-500"
                                        : "text-stone-700 hover:bg-stone-100",
                                    ].join(" ")}
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

                              {categorySearch.trim() !== "" &&
                                !categories.some((cat) =>
                                  cat.name.toLowerCase().includes(categorySearch.toLowerCase()),
                                ) && (
                                  <p className="px-3 py-3 text-center text-xs text-stone-400">
                                    Sin resultados
                                  </p>
                                )}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {hasActiveFilters ? (
                        <button
                          className="rounded-2xl border border-brand-500 px-3 py-2.5 text-sm font-semibold text-brand-500 transition-colors hover:bg-brand-100"
                          onClick={handleClearFiltersAndClose}
                          type="button"
                        >
                          Limpiar filtros
                        </button>
                      ) : null}
                    </div>
                  </div>,
                  document.body,
                )
              : null}
          </div>
        </div>
      </form>

      {categories.length > 0 ? (
        <div
          className={[
            "relative min-w-0 transition-all duration-500 ease-out origin-left",
            categoryBarActive ? "opacity-100 scale-100" : "opacity-45 scale-[0.94]",
          ].join(" ")}
        >
          {categoryScroll.canLeft ? (
            <>
              <button
                className="absolute left-0 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white shadow-sm transition-all hover:border-stone-300 hover:shadow active:scale-95"
                onClick={() => scrollCategories("left")}
                type="button"
              >
                <svg className="h-3 w-3 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
                </svg>
              </button>
            </>
          ) : null}

          <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-0.5 [mask-image:linear-gradient(to_right,black_85%,transparent_100%)] sm:[mask-image:linear-gradient(to_right,black_92%,transparent_100%)]" ref={categoryScrollRef}>
            <button
              className={[
                "shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] font-medium tracking-[0.04em] transition-all duration-150",
                !selectedCategory
                  ? "border-brand-500 bg-brand-500 text-white shadow-[0_2px_8px_rgba(15,118,110,0.30)] scale-[1.04]"
                  : "border-stone-200 bg-white text-stone-500 hover:scale-[1.02] hover:border-brand-500/40 hover:text-brand-600 active:scale-[0.97]",
              ].join(" ")}
              onClick={() => {
                onCategoryChange(null);
                activateCategoryBar();
              }}
              type="button"
            >
              Todas
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                className={[
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] font-medium tracking-[0.04em] transition-all duration-150",
                  selectedCategory?.id === category.id
                    ? "border-brand-500 bg-brand-500 text-white shadow-[0_2px_8px_rgba(15,118,110,0.30)] scale-[1.04]"
                    : "border-stone-200 bg-white text-stone-500 hover:scale-[1.02] hover:border-brand-500/40 hover:text-brand-600 active:scale-[0.97]",
                ].join(" ")}
                onClick={() => {
                  onCategoryChange(selectedCategory?.id === category.id ? null : category.slug);
                  activateCategoryBar();
                }}
                type="button"
              >
                {category.name}
              </button>
            ))}
            <div aria-hidden="true" className="w-6 shrink-0 sm:w-8" />
          </div>

          {categoryScroll.canRight ? (
            <>
              <button
                className="absolute right-0 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white shadow-sm transition-all hover:border-stone-300 hover:shadow active:scale-95"
                onClick={() => scrollCategories("right")}
                type="button"
              >
                <svg className="h-3 w-3 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
                </svg>
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export const CatalogSearchSection = memo(CatalogSearchSectionInner);

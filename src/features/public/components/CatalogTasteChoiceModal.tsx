import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

import {
  getCatalogImageSrcSet,
  getOptimizedCatalogImageUrl,
} from "../../../lib/images/catalogImageUrl";
import type { CatalogTasteChoiceOption } from "../catalogTasteChoices";

type CatalogTasteChoiceModalProps = {
  onClose: () => void;
  options: CatalogTasteChoiceOption[];
};

export function CatalogTasteChoiceModal({
  onClose,
  options,
}: CatalogTasteChoiceModalProps) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const previouslyFocusedElementRef = useRef<Element | null>(null);

  useEffect(() => {
    previouslyFocusedElementRef.current = document.activeElement;
    const dialogElement = dialogRef.current;
    const focusableElements = dialogElement
      ? Array.from(
          dialogElement.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        )
      : [];
    const firstFocusableElement = focusableElements[0] ?? dialogElement;
    const lastFocusableElement = focusableElements[focusableElements.length - 1] ?? dialogElement;

    firstFocusableElement?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || focusableElements.length === 0) {
        return;
      }

      if (event.shiftKey && document.activeElement === firstFocusableElement) {
        event.preventDefault();
        lastFocusableElement?.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === lastFocusableElement) {
        event.preventDefault();
        firstFocusableElement?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocusedElementRef.current instanceof HTMLElement) {
        previouslyFocusedElementRef.current.focus();
      }
    };
  }, [onClose]);

  return (
    <div
      aria-labelledby="catalog-taste-choice-title"
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-stone-950/45 px-4 py-6 backdrop-blur-sm"
      role="dialog"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <section
        className="relative z-[1] w-full max-w-3xl rounded-3xl border border-white/55 bg-stone-50 p-4 shadow-[0_28px_80px_-36px_rgba(35,24,15,0.65)] outline-none sm:p-5"
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2
              className="font-display text-xl font-semibold text-white sm:text-2xl"
              id="catalog-taste-choice-title"
            >
              Explorá más de lo que te gusta
            </h2>
            <p className="mt-1 text-sm leading-6 text-stone-500">
              Elegí una pista y abrimos una selección relacionada.
            </p>
          </div>

          <button
            aria-label="Cerrar"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-lg leading-none text-stone-500 shadow-sm transition-colors hover:border-stone-300 hover:text-stone-800"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        {options.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {options.map((option) => {
              const targetPath = option.categorySlug
                ? `/catalogo/para-vos?categoria=${encodeURIComponent(option.categorySlug)}`
                : "/catalogo/para-vos";

              return (
                <Link
                  className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-900/45 hover:shadow-elev-3"
                  key={`${option.categorySlug ?? option.categoryName}-${option.imageUrl}`}
                  onClick={onClose}
                  to={targetPath}
                >
                  <img
                    alt={option.categoryName}
                    className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.035]"
                    loading="eager"
                    sizes="(max-width: 640px) 92vw, 280px"
                    src={getOptimizedCatalogImageUrl(option.imageUrl, 420, 72)}
                    srcSet={getCatalogImageSrcSet(option.imageUrl, [280, 420, 560], 72)}
                  />
                  <div className="px-3 py-3">
                    <p className="truncate text-sm font-semibold text-stone-900">
                      {option.categoryName}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white/75 p-5 text-sm leading-6 text-stone-600">
            Todavía necesitamos más señales para preparar opciones precisas.
          </div>
        )}
      </section>
    </div>
  );
}

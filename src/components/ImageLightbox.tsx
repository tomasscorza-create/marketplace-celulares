import { useEffect, useRef } from "react";

type ImageLightboxProps = {
  alt: string;
  isOpen: boolean;
  onClose: () => void;
  src: string | null;
  subtitle?: string;
  title?: string;
};

export function ImageLightbox({
  alt,
  isOpen,
  onClose,
  src,
  subtitle,
  title,
}: ImageLightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) {
          return;
        }

        const focusable = Array.from(
          dialog.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        );

        if (focusable.length === 0) {
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === first) {
            event.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !src) {
    return null;
  }

  return (
    <div
      aria-labelledby="image-lightbox-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-5xl overflow-hidden rounded-3xl border border-white/15 bg-stone-950 shadow-[0_32px_80px_-24px_rgba(0,0,0,0.65)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-3 text-white sm:px-5">
          <div className="min-w-0">
            {subtitle ? (
              <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
                {subtitle}
              </p>
            ) : null}
            {title ? (
              <h2 className="mt-1 truncate text-base font-semibold" id="image-lightbox-title">
                {title}
              </h2>
            ) : (
              <h2 className="sr-only" id="image-lightbox-title">
                Vista ampliada
              </h2>
            )}
          </div>

          <button
            ref={closeRef}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10"
            onClick={onClose}
            type="button"
          >
            <span aria-hidden="true">x</span>
            <span className="sr-only">Cerrar imagen</span>
          </button>
        </div>

        <div className="bg-stone-950 p-3 sm:p-5">
          <img
            alt={alt}
            className="max-h-[78dvh] w-full rounded-2xl object-contain"
            src={src}
          />
        </div>
      </div>
    </div>
  );
}

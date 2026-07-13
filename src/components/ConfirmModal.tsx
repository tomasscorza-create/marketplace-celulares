import { useEffect, useRef } from "react";

type ConfirmModalProps = {
  cancelLabel?: string;
  confirmLabel?: string;
  isDanger?: boolean;
  isOpen: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
};

export function ConfirmModal({
  cancelLabel = "Cancelar",
  confirmLabel = "Confirmar",
  isDanger = false,
  isOpen,
  message,
  onCancel,
  onConfirm,
  title,
}: ConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Foco inicial en el boton cancelar, la opcion mas segura por defecto.
    cancelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape cierra el modal.
      if (event.key === "Escape") {
        onCancel();
        return;
      }

      // Mantiene Tab y Shift+Tab dentro del dialogo.
      if (event.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const focusable = Array.from(
          dialog.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        );

        if (focusable.length === 0) return;

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
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-labelledby="confirm-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
      role="dialog"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-sm rounded-3xl border border-stone-200 bg-white p-6 shadow-[0_32px_80px_-24px_rgba(71,85,105,0.35)]"
      >
        <h2 className="text-lg font-semibold text-stone-900" id="confirm-modal-title">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-stone-600">{message}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            ref={cancelRef}
            className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50"
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={[
              "rounded-full px-5 py-2.5 text-sm font-medium text-white transition-colors",
              isDanger
                ? "bg-brand-500 hover:bg-brand-700"
                : "bg-brand-500 hover:bg-brand-600",
            ].join(" ")}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

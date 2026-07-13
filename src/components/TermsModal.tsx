import { useEffect, useRef, useState } from "react";

import { marketplaceConfig } from "../config/marketplace";

type TermsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function TermsModal({ isOpen, onClose, onConfirm }: TermsModalProps) {
  const [accepted, setAccepted] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAccepted(false);
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 flex max-h-[90svh] min-h-0 w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <h2 className="text-base font-semibold text-stone-800">Informacion importante</h2>
          <button
            ref={closeButtonRef}
            aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
            onClick={onClose}
            type="button"
          >
            <svg
              fill="none"
              height="16"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              width="16"
            >
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6 text-sm leading-relaxed text-stone-600">
          <p className="text-base font-semibold text-stone-800">
            Como funciona el catalogo de {marketplaceConfig.appName}
          </p>

          <p>
            Este catalogo reune en un solo lugar productos de tiendas y vendedores
            independientes. Cualquier persona puede entrar, explorar y comprar desde aca.
          </p>

          <div className="space-y-1 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
            <p className="font-semibold text-stone-700">Todos los productos tienen oportunidad</p>
            <p>
              El catalogo no muestra siempre lo mismo. Funciona de manera rotatoria para dar
              visibilidad a distintas tiendas, productos y categorias. Ademas, el sistema puede
              priorizar lo que parece mas relevante para cada comprador segun su actividad.
            </p>
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-stone-700">Como esta organizado</p>

            <div className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-600">
                1
              </span>
              <div>
                <p className="font-semibold text-stone-700">Seccion personalizada</p>
                <p>
                  Es la primera que aparece al ingresar. Aca puede influir el historial de cada
                  comprador para mostrar productos relacionados con lo que vio o busco antes.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-600">
                2
              </span>
              <div>
                <p className="font-semibold text-stone-700">Seccion de exploracion</p>
                <p>
                  Es la parte mas amplia y variada del catalogo. Presenta productos de distintas
                  tiendas y grillas destacadas que rotan para repartir mejor la visibilidad.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-600">
                3
              </span>
              <div>
                <p className="font-semibold text-stone-700">Seccion de perfiles de vendedores</p>
                <p>
                  Al final aparecen perfiles de tiendas y vendedores. Esta seccion tambien rota para
                  ayudar a que los compradores descubran nuevas propuestas.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
            <p>
              En resumen: el catalogo trabaja para que mas productos sean vistos, lleguen a personas
              interesadas y mantengan una experiencia de exploracion dinamica.
            </p>
          </div>
        </div>

        <div className="space-y-4 border-t border-stone-100 px-6 py-5">
          <label className="flex cursor-pointer select-none items-start gap-3">
            <input
              checked={accepted}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brand-500"
              onChange={(e) => setAccepted(e.target.checked)}
              type="checkbox"
            />
            <span className="text-sm text-stone-600">Acepto terminos y usos</span>
          </label>

          <button
            className={[
              "w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all",
              accepted
                ? "bg-brand-500 text-white hover:bg-brand-600 active:scale-[0.98]"
                : "cursor-not-allowed bg-stone-100 text-stone-400",
            ].join(" ")}
            disabled={!accepted}
            onClick={() => {
              if (accepted) onConfirm();
            }}
            type="button"
          >
            Confirmo que lei y entendi
          </button>
        </div>
      </div>
    </div>
  );
}

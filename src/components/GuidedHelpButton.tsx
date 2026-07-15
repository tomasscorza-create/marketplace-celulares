import { useEffect, useRef, useState } from "react";

import { useActiveGuidedHelpFaqs } from "../features/guidedHelp/guidedHelpQueries";

function RobotIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2v3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <circle cx="12" cy="2.6" fill="currentColor" r="1.3" />
      <rect
        fill="currentColor"
        fillOpacity="0.16"
        height="13"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.8"
        width="16"
        x="4"
        y="7"
      />
      <circle cx="9" cy="13" fill="currentColor" r="1.6" />
      <circle cx="15" cy="13" fill="currentColor" r="1.6" />
      <path d="M9 17h6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M2 12h2M20 12h2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={["shrink-0 transition-transform duration-200", isOpen ? "rotate-180" : ""].join(" ")}
      fill="none"
      height="16"
      viewBox="0 0 24 24"
      width="16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function GuidedHelpButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [openQuestion, setOpenQuestion] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const faqsQuery = useActiveGuidedHelpFaqs();
  const faqs = faqsQuery.data ?? [];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="Ayuda guiada"
        className={[
          "group/help flex h-12 cursor-pointer items-center overflow-hidden rounded-full sm:h-14",
          "bg-stone-800 text-white shadow-elev-2",
          "transition-[background-color,box-shadow] duration-300",
          "hover:bg-gradient-to-br hover:from-sky-400 hover:to-brand-500 hover:shadow-elev-glow",
          isOpen ? "bg-gradient-to-br from-sky-400 to-brand-500 shadow-elev-glow" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center sm:h-14 sm:w-14">
          <RobotIcon size={22} />
        </span>

        <span
          className={[
            "overflow-hidden whitespace-nowrap text-sm font-semibold",
            "transition-[max-width,padding-right,margin-left] duration-300",
            isOpen
              ? "-ml-2 max-w-[10rem] pr-4"
              : "ml-0 max-w-0 pr-0 group-hover/help:-ml-2 group-hover/help:max-w-[10rem] group-hover/help:pr-4",
          ].join(" ")}
        >
          Ayuda guiada
        </span>
      </button>

      {isOpen ? (
        <div
          aria-label="Ayuda guiada"
          className={[
            "absolute bottom-full right-0 z-50 mb-3 flex max-h-[70vh] w-[min(22rem,calc(100vw-2.5rem))] flex-col",
            "overflow-hidden rounded-3xl border border-white/15 shadow-elev-3 ring-1 ring-black/5",
            "origin-bottom-right animate-wa-menu-pop bg-gradient-to-br from-sky-400 via-[#5f8bf0] to-brand-500",
          ].join(" ")}
          ref={panelRef}
          role="dialog"
        >
          <div className="flex shrink-0 items-center gap-2.5 px-4 pb-2 pt-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
              <RobotIcon size={18} />
            </span>
            <p className="text-base font-bold text-white">Ayuda guiada</p>
          </div>

          {faqsQuery.isLoading ? (
            <p className="px-4 pb-4 text-sm text-white/85">Cargando preguntas...</p>
          ) : faqsQuery.isError ? (
            <p className="px-4 pb-4 text-sm text-white/85">
              No pudimos cargar las preguntas frecuentes. Probá de nuevo en un momento.
            </p>
          ) : faqs.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-white/85">
              Todavía no hay preguntas cargadas. Escribinos por WhatsApp y te ayudamos.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5 overflow-y-auto px-2 pb-2.5" role="list">
              {faqs.map((item, index) => {
                const isItemOpen = openQuestion === index;
                return (
                  <li
                    className="animate-fade-in-up motion-reduce:animate-none"
                    key={item.id}
                    style={{ animationDelay: `${index * 45}ms` }}
                  >
                    <button
                      aria-expanded={isItemOpen}
                      className={[
                        "flex w-full items-center justify-between gap-3 rounded-2xl px-3.5 py-3 text-left text-sm font-semibold text-white",
                        "transition-colors duration-200 hover:bg-white/20",
                        isItemOpen ? "bg-white/15" : "bg-white/10",
                      ].join(" ")}
                      onClick={() => setOpenQuestion(isItemOpen ? null : index)}
                      type="button"
                    >
                      {item.question}
                      <ChevronIcon isOpen={isItemOpen} />
                    </button>
                    {isItemOpen ? (
                      <p className="animate-fade-in-up px-3.5 pb-1 pt-2.5 text-[13px] leading-relaxed text-white/90 motion-reduce:animate-none">
                        {item.answer}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

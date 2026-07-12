import { useEffect, useState } from "react";

/**
 * Botones flotantes de scroll-up / scroll-down del catálogo.
 *
 * Vive en su propio componente para que el state de scroll (que cambia con
 * cada scroll del usuario) NO dispare re-renders del catálogo entero.
 * El cómputo va por requestAnimationFrame y solo commit-ea cuando alguno
 * de los dos flags realmente cambia.
 */
export function CatalogScrollControls() {
  const [scrollState, setScrollState] = useState({
    canScrollUp: false,
    canScrollDown: false,
  });

  useEffect(() => {
    let rafHandle: number | null = null;
    let lastUp = false;
    let lastDown = false;

    const computeAndCommit = () => {
      rafHandle = null;
      const viewportHeight = window.innerHeight;
      const scrollTop = window.scrollY;
      const maxScrollTop = document.documentElement.scrollHeight - viewportHeight;
      const nextUp = scrollTop > 40;
      const nextDown = maxScrollTop - scrollTop > 40;

      if (nextUp === lastUp && nextDown === lastDown) {
        return;
      }
      lastUp = nextUp;
      lastDown = nextDown;
      setScrollState({ canScrollUp: nextUp, canScrollDown: nextDown });
    };

    const scheduleUpdate = () => {
      if (rafHandle !== null) return;
      rafHandle = window.requestAnimationFrame(computeAndCommit);
    };

    computeAndCommit();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (rafHandle !== null) {
        window.cancelAnimationFrame(rafHandle);
      }
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  function scrollPage(direction: "up" | "down") {
    window.scrollBy({
      top: direction === "up" ? -window.innerHeight * 0.82 : window.innerHeight * 0.82,
      behavior: "smooth",
    });
  }

  return (
    <div className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom,0px)+6rem)] right-[calc(env(safe-area-inset-right,0px)+0.75rem)] z-30 grid gap-2 sm:bottom-[calc(env(safe-area-inset-bottom,0px)+7rem)] sm:right-[calc(env(safe-area-inset-right,0px)+1rem)]">
      {scrollState.canScrollUp ? (
        <button
          className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white/95 text-stone-700 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.7)] transition-all hover:-translate-y-0.5 hover:scale-105 hover:border-ocean-300 hover:text-ocean-600"
          onClick={() => {
            scrollPage("up");
          }}
          type="button"
        >
          <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M5 15l7-7 7 7"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          <span className="sr-only">Subir catálogo</span>
        </button>
      ) : null}

      {scrollState.canScrollDown ? (
        <button
          className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white/95 text-stone-700 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.7)] transition-all hover:translate-y-0.5 hover:scale-105 hover:border-ocean-300 hover:text-ocean-600"
          onClick={() => {
            scrollPage("down");
          }}
          type="button"
        >
          <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M19 9l-7 7-7-7"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          <span className="sr-only">Bajar catálogo</span>
        </button>
      ) : null}
    </div>
  );
}

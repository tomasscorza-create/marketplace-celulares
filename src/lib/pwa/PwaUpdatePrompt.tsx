import { useEffect, useState } from "react";

import { PWA_UPDATE_AVAILABLE_EVENT } from "./registerServiceWorker";

type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>;

interface PwaUpdateEventDetail {
  updateServiceWorker: UpdateServiceWorker;
}

export function PwaUpdatePrompt() {
  const [updateServiceWorker, setUpdateServiceWorker] = useState<UpdateServiceWorker | null>(null);

  useEffect(() => {
    const showUpdate = (event: Event) => {
      const { updateServiceWorker: update } = (event as CustomEvent<PwaUpdateEventDetail>).detail;
      setUpdateServiceWorker(() => update);
    };

    window.addEventListener(PWA_UPDATE_AVAILABLE_EVENT, showUpdate);
    return () => window.removeEventListener(PWA_UPDATE_AVAILABLE_EVENT, showUpdate);
  }, []);

  if (!updateServiceWorker) {
    return null;
  }

  return (
    <aside
      aria-live="polite"
      className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] left-4 right-4 z-[100] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-teal-200 bg-white p-3 shadow-[0_20px_48px_-20px_rgba(15,23,42,0.5)] sm:left-auto"
    >
      <p className="min-w-0 flex-1 text-sm font-medium text-ocean-700">
        Hay una versión nueva disponible.
      </p>
      <button
        className="shrink-0 rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
        onClick={() => void updateServiceWorker(true)}
        type="button"
      >
        Actualizar
      </button>
    </aside>
  );
}

import { registerSW } from "virtual:pwa-register";

export const PWA_UPDATE_AVAILABLE_EVENT = "pwa-update-available";

export function registerServiceWorker() {
  if (!import.meta.env.PROD) {
    return;
  }

  const updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh() {
      window.dispatchEvent(
        new CustomEvent(PWA_UPDATE_AVAILABLE_EVENT, {
          detail: { updateServiceWorker },
        }),
      );
    },
  });
}

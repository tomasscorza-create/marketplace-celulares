import { useEffect, useMemo, useState } from "react";

function isStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    setIsStandalone(isStandaloneMode());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
      setIsInstalling(false);
    };

    const handleVisibility = () => {
      setIsStandalone(isStandaloneMode());
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener("focus", handleVisibility);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("focus", handleVisibility);
    };
  }, []);

  const canInstall = useMemo(
    () => Boolean(installPrompt) && !isStandalone,
    [installPrompt, isStandalone],
  );

  if (!canInstall) {
    return null;
  }

  return (
    <button
      className="inline-flex items-center gap-2 rounded-full border border-ocean-500/20 bg-brand-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isInstalling}
      onClick={async () => {
        if (!installPrompt) {
          return;
        }

        setIsInstalling(true);
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice.catch(() => null);

        setIsInstalling(false);

        if (choice?.outcome !== "accepted") {
          return;
        }

        setInstallPrompt(null);
      }}
      type="button"
    >
      <span aria-hidden="true">+</span>
      {isInstalling ? "Instalando..." : "Instalar app"}
    </button>
  );
}

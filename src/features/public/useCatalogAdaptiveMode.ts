import { useEffect, useState } from "react";

type NetworkInformationLike = {
  addEventListener?: (type: "change", listener: () => void) => void;
  effectiveType?: string;
  removeEventListener?: (type: "change", listener: () => void) => void;
  saveData?: boolean;
};

type AdaptiveNavigator = Navigator & {
  connection?: NetworkInformationLike;
  deviceMemory?: number;
};

type CatalogAdaptiveSnapshot = {
  effectiveType: string | null;
  hardwareConcurrency: number | null;
  isCompactViewport: boolean;
  isMobileViewport: boolean;
  prefersReducedMotion: boolean;
  saveData: boolean;
};

export type CatalogAdaptiveMode = CatalogAdaptiveSnapshot & {
  isLiteMode: boolean;
  isLowPowerDevice: boolean;
  isSingleColumnViewport: boolean;
  isSlowConnection: boolean;
  shouldLoadSecondaryCatalog: boolean;
};

function getConnection() {
  if (typeof navigator === "undefined") {
    return undefined;
  }

  return (navigator as AdaptiveNavigator).connection;
}

function getCatalogAdaptiveSnapshot(): CatalogAdaptiveSnapshot {
  if (typeof window === "undefined") {
    return {
      effectiveType: null,
      hardwareConcurrency: null,
      isCompactViewport: false,
      isMobileViewport: false,
      prefersReducedMotion: false,
      saveData: false,
    };
  }

  const connection = getConnection();
  const hardwareConcurrency =
    typeof navigator.hardwareConcurrency === "number" ? navigator.hardwareConcurrency : null;

  return {
    effectiveType: connection?.effectiveType ?? null,
    hardwareConcurrency,
    isCompactViewport: window.innerWidth <= 360,
    isMobileViewport: window.innerWidth < 640,
    prefersReducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
    saveData: Boolean(connection?.saveData),
  };
}

function getCatalogAdaptiveMode(): CatalogAdaptiveMode {
  const snapshot = getCatalogAdaptiveSnapshot();
  const adaptiveNavigator =
    typeof navigator !== "undefined" ? (navigator as AdaptiveNavigator) : null;
  const deviceMemory =
    typeof adaptiveNavigator?.deviceMemory === "number"
      ? adaptiveNavigator.deviceMemory
      : null;
  const isSlowConnection =
    snapshot.saveData ||
    snapshot.effectiveType === "slow-2g" ||
    snapshot.effectiveType === "2g";
  const isLowPowerDevice =
    snapshot.isMobileViewport &&
    ((deviceMemory !== null && deviceMemory <= 4) ||
      (snapshot.hardwareConcurrency !== null && snapshot.hardwareConcurrency <= 4));
  const isLiteMode =
    snapshot.prefersReducedMotion ||
    snapshot.isCompactViewport ||
    isSlowConnection ||
    isLowPowerDevice;

  return {
    ...snapshot,
    isLiteMode,
    isLowPowerDevice,
    isSingleColumnViewport: snapshot.isCompactViewport,
    isSlowConnection,
    shouldLoadSecondaryCatalog: !isLiteMode,
  };
}

export function useCatalogAdaptiveMode() {
  const [mode, setMode] = useState(getCatalogAdaptiveMode);

  useEffect(() => {
    const updateMode = () => {
      setMode(getCatalogAdaptiveMode());
    };

    const reducedMotionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const connection = getConnection();

    updateMode();
    window.addEventListener("resize", updateMode);
    reducedMotionQuery?.addEventListener("change", updateMode);
    connection?.addEventListener?.("change", updateMode);

    return () => {
      window.removeEventListener("resize", updateMode);
      reducedMotionQuery?.removeEventListener("change", updateMode);
      connection?.removeEventListener?.("change", updateMode);
    };
  }, []);

  return mode;
}

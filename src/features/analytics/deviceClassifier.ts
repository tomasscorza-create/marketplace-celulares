import type {
  AnalyticsBrowserFamily,
  AnalyticsConfidence,
  AnalyticsConnectionType,
  AnalyticsDeviceContext,
  AnalyticsDeviceType,
  AnalyticsOsFamily,
  AnalyticsPerformanceTier,
  AnalyticsScreenSize,
} from "../../types/analytics";
import { ANALYTICS_CLASSIFIER_VERSION } from "./analyticsContract";

type ClassifierInput = {
  deviceMemory: number | null;
  effectiveType: string | null;
  hardwareConcurrency: number | null;
  maxTouchPoints: number;
  platform: string;
  referrer: string;
  saveData: boolean;
  screenWidth: number;
  userAgent: string;
  viewportWidth: number;
};

type NavigatorWithDeviceSignals = Navigator & {
  connection?: {
    effectiveType?: string;
    saveData?: boolean;
  };
  deviceMemory?: number;
  userAgentData?: {
    mobile?: boolean;
    platform?: string;
  };
};

function detectOs(input: ClassifierInput): AnalyticsOsFamily {
  const userAgent = input.userAgent.toLowerCase();
  const platform = input.platform.toLowerCase();
  const isTouchMac = platform.includes("mac") && input.maxTouchPoints > 1;

  if (/ipad/.test(userAgent) || isTouchMac) return "ipados";
  if (/iphone|ipod/.test(userAgent)) return "ios";
  if (/android/.test(userAgent)) return "android";
  if (/windows/.test(userAgent) || platform.includes("win")) return "windows";
  if (/cros/.test(userAgent)) return "chromeos";
  if (/mac os|macintosh/.test(userAgent) || platform.includes("mac")) return "macos";
  if (/linux/.test(userAgent) || platform.includes("linux")) return "linux";
  return "other";
}

function detectDeviceType(input: ClassifierInput, osFamily: AnalyticsOsFamily): AnalyticsDeviceType {
  const userAgent = input.userAgent.toLowerCase();
  if (osFamily === "ipados" || /tablet|ipad/.test(userAgent)) return "tablet";
  if (osFamily === "ios" || osFamily === "android" || /mobile/.test(userAgent)) {
    return input.viewportWidth >= 768 && input.maxTouchPoints > 0 ? "tablet" : "mobile";
  }
  if (input.viewportWidth > 0) return "computer";
  return "other";
}

function detectBrowser(userAgent: string): AnalyticsBrowserFamily {
  const normalized = userAgent.toLowerCase();
  if (/edg\//.test(normalized)) return "edge";
  if (/opr\//.test(normalized)) return "opera";
  if (/firefox\//.test(normalized)) return "firefox";
  if (/chrome\//.test(normalized) || /crios\//.test(normalized)) return "chrome";
  if (/safari\//.test(normalized)) return "safari";
  return "other";
}

function detectPerformanceTier(input: ClassifierInput): {
  confidence: AnalyticsConfidence;
  tier: AnalyticsPerformanceTier;
} {
  const memory = input.deviceMemory;
  const cores = input.hardwareConcurrency;
  const availableSignals = Number(memory !== null) + Number(cores !== null);

  if (availableSignals === 0) return { confidence: "low", tier: "unknown" };
  if ((memory !== null && memory <= 4) || (cores !== null && cores <= 4)) {
    return { confidence: availableSignals === 2 ? "high" : "medium", tier: "low" };
  }
  if ((memory === null || memory >= 8) && (cores === null || cores >= 8)) {
    return { confidence: availableSignals === 2 ? "high" : "medium", tier: "high" };
  }
  return { confidence: availableSignals === 2 ? "high" : "medium", tier: "medium" };
}

function detectConnectionType(input: ClassifierInput): AnalyticsConnectionType {
  if (input.saveData || ["slow-2g", "2g"].includes(input.effectiveType ?? "")) return "slow";
  if (input.effectiveType === "3g") return "standard";
  if (input.effectiveType === "4g") return "fast";
  return "unknown";
}

function detectScreenSize(screenWidth: number): AnalyticsScreenSize {
  if (screenWidth < 640) return "small";
  if (screenWidth < 1200) return "medium";
  return "large";
}

function getReferrerDomain(referrer: string) {
  if (!referrer) return "direct";
  try {
    const url = new URL(referrer);
    if (typeof window !== "undefined" && url.origin === window.location.origin) return "internal";
    return url.hostname.slice(0, 120) || "direct";
  } catch {
    return "direct";
  }
}

export function classifyAnalyticsDevice(input: ClassifierInput): AnalyticsDeviceContext {
  const osFamily = detectOs(input);
  const performance = detectPerformanceTier(input);

  return {
    browserFamily: detectBrowser(input.userAgent),
    classificationConfidence: performance.confidence,
    classifierVersion: ANALYTICS_CLASSIFIER_VERSION,
    connectionType: detectConnectionType(input),
    deviceType: detectDeviceType(input, osFamily),
    osFamily,
    performanceTier: performance.tier,
    referrerDomain: getReferrerDomain(input.referrer),
    screenSize: detectScreenSize(input.screenWidth),
  };
}

export function getAnalyticsDeviceContext(): AnalyticsDeviceContext {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      browserFamily: "other",
      classificationConfidence: "low",
      classifierVersion: ANALYTICS_CLASSIFIER_VERSION,
      connectionType: "unknown",
      deviceType: "other",
      osFamily: "other",
      performanceTier: "unknown",
      referrerDomain: "direct",
      screenSize: "medium",
    };
  }

  const adaptiveNavigator = navigator as NavigatorWithDeviceSignals;
  return classifyAnalyticsDevice({
    deviceMemory:
      typeof adaptiveNavigator.deviceMemory === "number" ? adaptiveNavigator.deviceMemory : null,
    effectiveType: adaptiveNavigator.connection?.effectiveType ?? null,
    hardwareConcurrency:
      typeof navigator.hardwareConcurrency === "number" ? navigator.hardwareConcurrency : null,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    platform: adaptiveNavigator.userAgentData?.platform ?? navigator.platform ?? "",
    referrer: document.referrer,
    saveData: Boolean(adaptiveNavigator.connection?.saveData),
    screenWidth: window.screen?.width ?? window.innerWidth,
    userAgent: navigator.userAgent,
    viewportWidth: window.innerWidth,
  });
}

export type { ClassifierInput };

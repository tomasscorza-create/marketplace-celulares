import { describe, expect, it } from "vitest";

import { classifyAnalyticsDevice, type ClassifierInput } from "./deviceClassifier";

const baseInput: ClassifierInput = {
  deviceMemory: 8,
  effectiveType: "4g",
  hardwareConcurrency: 8,
  maxTouchPoints: 0,
  platform: "Win32",
  referrer: "",
  saveData: false,
  screenWidth: 1920,
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36",
  viewportWidth: 1440,
};

describe("classifyAnalyticsDevice", () => {
  it("clasifica una computadora Windows de gama alta sin identificar un modelo", () => {
    expect(classifyAnalyticsDevice(baseInput)).toMatchObject({
      browserFamily: "chrome",
      classificationConfidence: "high",
      connectionType: "fast",
      deviceType: "computer",
      osFamily: "windows",
      performanceTier: "high",
      screenSize: "large",
    });
  });

  it("clasifica un celular Android limitado como gama baja", () => {
    expect(
      classifyAnalyticsDevice({
        ...baseInput,
        deviceMemory: 4,
        hardwareConcurrency: 4,
        maxTouchPoints: 5,
        platform: "Linux armv8l",
        screenWidth: 412,
        userAgent: "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 Chrome/120.0",
        viewportWidth: 412,
      }),
    ).toMatchObject({
      deviceType: "mobile",
      osFamily: "android",
      performanceTier: "low",
      screenSize: "small",
    });
  });

  it("trata iPadOS como tablet y no inventa una gama sin señales", () => {
    expect(
      classifyAnalyticsDevice({
        ...baseInput,
        deviceMemory: null,
        hardwareConcurrency: null,
        maxTouchPoints: 5,
        platform: "MacIntel",
        screenWidth: 1024,
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Safari/605.1.15",
        viewportWidth: 1024,
      }),
    ).toMatchObject({
      classificationConfidence: "low",
      deviceType: "tablet",
      osFamily: "ipados",
      performanceTier: "unknown",
    });
  });
});

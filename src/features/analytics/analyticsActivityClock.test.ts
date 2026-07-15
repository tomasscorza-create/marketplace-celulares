import { describe, expect, it } from "vitest";

import { createAnalyticsActivityClock } from "./analyticsActivityClock";

describe("createAnalyticsActivityClock", () => {
  it("cuenta solamente el tiempo transcurrido mientras esta visible", () => {
    const clock = createAnalyticsActivityClock();

    clock.resume(1_000);
    clock.pause(7_400);
    expect(clock.takePendingSeconds(20_000)).toBe(6);
    expect(clock.takePendingSeconds(30_000)).toBe(0);
  });

  it("conserva los milisegundos pendientes entre entregas", () => {
    const clock = createAnalyticsActivityClock();

    clock.resume(0);
    expect(clock.takePendingSeconds(1_600)).toBe(1);
    expect(clock.takePendingSeconds(2_200)).toBe(1);
  });

  it("no duplica tiempo si resume mas de una vez", () => {
    const clock = createAnalyticsActivityClock();

    clock.resume(1_000);
    clock.resume(4_000);
    expect(clock.takePendingSeconds(6_000)).toBe(5);
  });

  it("limita saltos largos para no contar la suspension del dispositivo", () => {
    const clock = createAnalyticsActivityClock();

    clock.resume(0);
    expect(clock.takePendingSeconds(3_600_000)).toBe(60);
    expect(clock.takePendingSeconds(3_600_000)).toBe(0);
  });

  it("respeta el maximo de segundos por entrega", () => {
    const clock = createAnalyticsActivityClock();

    clock.resume(0);
    expect(clock.takePendingSeconds(20_000, 10)).toBe(10);
    expect(clock.takePendingSeconds(20_000, 10)).toBe(10);
  });
});

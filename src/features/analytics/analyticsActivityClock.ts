const MAX_VISIBLE_SEGMENT_MS = 60_000;

export type AnalyticsActivityClock = {
  pause: (nowMs: number) => void;
  resume: (nowMs: number) => void;
  takePendingSeconds: (nowMs: number, maxSeconds?: number) => number;
};

export function createAnalyticsActivityClock(): AnalyticsActivityClock {
  let pendingMs = 0;
  let visibleSinceMs: number | null = null;

  const collectVisibleTime = (nowMs: number) => {
    if (visibleSinceMs === null) return;

    const elapsedMs = Math.max(0, nowMs - visibleSinceMs);
    pendingMs += Math.min(elapsedMs, MAX_VISIBLE_SEGMENT_MS);
    visibleSinceMs = nowMs;
  };

  return {
    pause(nowMs) {
      collectVisibleTime(nowMs);
      visibleSinceMs = null;
    },
    resume(nowMs) {
      if (visibleSinceMs === null) visibleSinceMs = nowMs;
    },
    takePendingSeconds(nowMs, maxSeconds = 60) {
      collectVisibleTime(nowMs);
      const safeMaximum = Math.max(0, Math.floor(maxSeconds));
      const seconds = Math.min(Math.floor(pendingMs / 1_000), safeMaximum);
      pendingMs -= seconds * 1_000;
      return seconds;
    },
  };
}

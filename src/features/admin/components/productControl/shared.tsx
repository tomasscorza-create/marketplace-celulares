import type { ReactNode } from "react";

import type { AdminProductControlTag } from "../../../../types/admin";

export type TagTone = {
  activeClassName: string;
  icon: ReactNode;
  label: string;
};

export const TAG_OPTIONS: Array<{ tag: AdminProductControlTag } & TagTone> = [
  {
    tag: "destacado up",
    label: "Destacado up",
    activeClassName: "border-emerald-300 bg-emerald-50 text-emerald-700",
    icon: (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
        <path d="M8 12V4m0 0L4.75 7.25M8 4l3.25 3.25" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    tag: "prueba/test",
    label: "Prueba / test",
    activeClassName: "border-sun-300 bg-sun-50 text-sun-700",
    icon: (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
        <path d="M6 3h4m-3 0v2.25a4.25 4.25 0 0 1-1.42 3.17L4.5 9.4a1.75 1.75 0 0 0 1.17 3.1h4.66A1.75 1.75 0 0 0 11.5 9.4l-1.08-.98A4.25 4.25 0 0 1 9 5.25V3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
      </svg>
    ),
  },
  {
    tag: "bajar prioridad",
    label: "Bajar prioridad",
    activeClassName: "border-sun-300 bg-sun-50 text-sun-700",
    icon: (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
        <path d="M8 4v8m0 0l-3.25-3.25M8 12l3.25-3.25" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    tag: "ocultar total",
    label: "Ocultar total",
    activeClassName: "border-rose-300 bg-rose-50 text-rose-700",
    icon: (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
        <path d="M3.5 3.5l9 9m-4.03.85A6.7 6.7 0 0 1 2.34 8c1.2-2.26 3.18-3.5 5.66-3.5.86 0 1.67.15 2.4.43M13.66 8a7.18 7.18 0 0 1-1.82 2.28" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
      </svg>
    ),
  },
];

export function getTagOption(tag: AdminProductControlTag | null) {
  return TAG_OPTIONS.find((o) => o.tag === tag) ?? null;
}

// ─── UI helpers compartidos por los tabs ───────────────────────────────────

export function StatCard({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-[1.3rem] border border-stone-200 bg-stone-50/70 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">{label}</p>
      <p className={["mt-2 font-semibold", muted ? "text-base text-stone-700" : "text-lg text-stone-900"].join(" ")}>
        {value}
      </p>
    </div>
  );
}

export function SectionEmpty() {
  return (
    <p className="rounded-[1.2rem] border border-dashed border-stone-200 px-4 py-3 text-sm text-stone-400">
      Sin productos en este grupo.
    </p>
  );
}

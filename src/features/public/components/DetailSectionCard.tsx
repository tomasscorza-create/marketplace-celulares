import type { ReactNode } from "react";

export type DetailSectionCardProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  toneClassName?: string;
  trailing?: ReactNode;
  trailingClassName?: string;
};

export function DetailSectionCard({
  eyebrow,
  title,
  description,
  children,
  toneClassName = "",
  trailing,
  trailingClassName = "right-4 top-4 sm:right-5 sm:top-5",
}: DetailSectionCardProps) {
  return (
    <section
      className={[
        "relative overflow-hidden rounded-3xl border border-stone-200/90 bg-[linear-gradient(165deg,rgba(255,255,255,0.98),rgba(249,246,240,0.96)_52%,rgba(237,243,255,0.94))] p-4 shadow-[0_28px_58px_-40px_rgba(15,23,42,0.35)] ring-1 ring-white/70 sm:p-5",
        toneClassName,
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-x-8 top-0 h-16 rounded-full bg-white/55 blur-3xl" />
      {trailing ? <div className={`absolute z-10 ${trailingClassName}`}>{trailing}</div> : null}
      {eyebrow ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-ocean-500 sm:text-xl">{title}</h2>
      {description ? <p className="mt-1.5 text-sm leading-6 text-stone-600">{description}</p> : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </section>
  );
}

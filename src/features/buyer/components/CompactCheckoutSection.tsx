import type { ReactNode } from "react";

type CompactCheckoutSectionProps = {
  children: ReactNode;
  isExpanded: boolean;
  isProblem?: boolean;
  onToggle: () => void;
  status: string;
  title: string;
};

export function CompactCheckoutSection({
  children,
  isExpanded,
  isProblem = false,
  onToggle,
  status,
  title,
}: CompactCheckoutSectionProps) {
  return (
    <div
      className={[
        "overflow-hidden rounded-2xl border bg-white text-sm text-stone-700",
        isProblem ? "border-brand-200" : "border-stone-200",
      ].join(" ")}
    >
      <button
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-stone-50"
        onClick={onToggle}
        type="button"
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">
            {title}
          </p>
          <p
            className={[
              "mt-1 truncate text-sm font-medium",
              isProblem ? "text-brand-500" : "text-stone-900",
            ].join(" ")}
          >
            {status}
          </p>
        </div>
        <span
          className={[
            "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
            isProblem ? "bg-brand-50 text-brand-500" : "bg-emerald-50 text-emerald-700",
          ].join(" ")}
        >
          {isExpanded ? "Cerrar" : "Ver"}
        </span>
      </button>

      {isExpanded ? <div className="border-t border-stone-200 px-4 py-4">{children}</div> : null}
    </div>
  );
}

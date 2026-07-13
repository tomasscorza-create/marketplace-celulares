import type { ReactNode } from "react";

type CatalogSectionHeaderProps = {
  action?: ReactNode;
  description?: string;
  eyebrow?: string;
  id?: string;
  onDark?: boolean;
  tone?: "brand" | "ocean";
  title: string;
};

export function CatalogSectionHeader({
  action,
  description,
  eyebrow,
  id,
  onDark = false,
  tone = "brand",
  title,
}: CatalogSectionHeaderProps) {
  const eyebrowClassName = onDark
    ? "text-white/70"
    : tone === "ocean"
      ? "text-ocean-500"
      : "text-brand-500";
  const titleClassName = onDark ? "text-white/95" : "text-stone-900";
  const descriptionClassName = onDark ? "text-white/65" : "text-stone-500";

  return (
    <div
      className="flex flex-col gap-1 sm:gap-2 sm:flex-row sm:items-end sm:justify-between"
    >
      <div className="space-y-0.5 sm:space-y-1">
        {eyebrow ? (
          <p className={["text-[11px] font-semibold uppercase tracking-[0.18em]", eyebrowClassName].join(" ")}>
            {eyebrow}
          </p>
        ) : null}
        <h2 className={["font-display text-base font-semibold sm:text-xl", titleClassName].join(" ")} id={id}>
          {title}
        </h2>
        {description ? (
          <p className={["max-w-3xl text-xs leading-[1.35] sm:text-sm sm:leading-6", descriptionClassName].join(" ")}>{description}</p>
        ) : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

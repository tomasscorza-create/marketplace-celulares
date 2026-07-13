import type { ReactNode } from "react";

import { useId } from "react";

type PagePlaceholderProps = {
  badge?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children?: ReactNode;
  hideHeader?: boolean;
};

export function PagePlaceholder({
  badge,
  title,
  description,
  actions,
  children,
  hideHeader = false,
}: PagePlaceholderProps) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={!hideHeader ? titleId : undefined}
      className="min-w-0 overflow-x-clip rounded-3xl border border-stone-200/80 bg-white/95 p-4 shadow-[0_24px_80px_-48px_rgba(71,85,105,0.45)] sm:p-6"
    >
      {!hideHeader ? (
        <>
          {badge ? (
            <span className="inline-flex max-w-full whitespace-normal rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase leading-4 tracking-widest text-brand-700">
              {badge}
            </span>
          ) : null}
          <div className="mt-3 flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-ocean-500 sm:text-[2rem]" id={titleId}>
                {title}
              </h1>
              {description ? (
                <p className="mt-2.5 max-w-2xl text-[13px] leading-6 text-stone-600 sm:text-[15px] sm:leading-7">
                  {description}
                </p>
              ) : null}
            </div>

            {actions ? <div className="flex flex-wrap gap-3 lg:justify-end">{actions}</div> : null}
          </div>
        </>
      ) : null}
      {children ? (
        <div className={hideHeader ? "" : description ? "mt-5 sm:mt-6" : "mt-3"}>
          {children}
        </div>
      ) : null}
    </section>
  );
}

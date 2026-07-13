import type { ReactNode } from "react";

type StatusScreenProps = {
  actions?: ReactNode;
  align?: "center" | "left";
  description: ReactNode;
  eyebrow?: string;
  title: ReactNode;
};

export function StatusScreen({
  actions,
  align = "center",
  description,
  eyebrow,
  title,
}: StatusScreenProps) {
  const isCentered = align === "center";

  return (
    <main className="flex min-h-dvh items-center bg-gradient-to-b from-brand-50 to-stone-50 px-6 py-16 text-stone-900">
      <section
        className={[
          "mx-auto w-full max-w-2xl rounded-3xl border border-stone-200 bg-white p-10 shadow-[0_24px_80px_-48px_rgba(71,85,105,0.45)]",
          isCentered ? "text-center" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {eyebrow ? (
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-500">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={[
            "font-semibold tracking-tight text-ocean-500",
            eyebrow ? "mt-4 text-3xl" : "text-2xl",
          ].join(" ")}
        >
          {title}
        </h1>
        <p className="mt-4 text-base leading-7 text-stone-600">{description}</p>
        {actions ? (
          <div
            className={[
              "mt-8 flex flex-wrap gap-3",
              isCentered ? "justify-center" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {actions}
          </div>
        ) : null}
      </section>
    </main>
  );
}

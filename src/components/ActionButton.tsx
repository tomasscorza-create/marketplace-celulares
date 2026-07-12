import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ActionButtonVariant =
  | "brand"
  | "brandGhost"
  | "primary"
  | "secondary"
  | "danger"
  | "ghost";
type ActionButtonSize = "sm" | "md";

type ActionButtonOptions = {
  fullWidth?: boolean;
  size?: ActionButtonSize;
  variant?: ActionButtonVariant;
};

const baseClassName =
  "inline-flex items-center justify-center rounded-full font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const sizeClassNames: Record<ActionButtonSize, string> = {
  md: "px-5 py-3 text-sm",
  sm: "px-4 py-2.5 text-sm",
};

const variantClassNames: Record<ActionButtonVariant, string> = {
  brand:
    "border border-brand-500 bg-brand-500 text-white shadow-[0_12px_24px_-16px_rgba(15,118,110,0.75)] hover:bg-brand-700",
  brandGhost: "border border-brand-500 bg-white text-brand-500 hover:bg-brand-100",
  primary:
    "border border-ocean-500 bg-ocean-500 text-white shadow-[0_12px_24px_-16px_rgba(71,85,105,0.85)] hover:bg-ocean-600",
  secondary: "border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100",
  danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
  ghost: "border border-ocean-200 bg-white text-ocean-500 hover:bg-sun-50",
};

export function getActionButtonClassName({
  fullWidth = false,
  size = "md",
  variant = "primary",
}: ActionButtonOptions = {}) {
  return [
    baseClassName,
    sizeClassNames[size],
    variantClassNames[variant],
    fullWidth ? "w-full" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

type ActionButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & ActionButtonOptions
>;

export function ActionButton({
  children,
  className,
  fullWidth,
  size,
  variant,
  ...props
}: ActionButtonProps) {
  return (
    <button
      className={[getActionButtonClassName({ fullWidth, size, variant }), className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

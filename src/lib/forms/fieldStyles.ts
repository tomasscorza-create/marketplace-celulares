const baseInputClassName =
  "rounded-xl px-4 py-3 text-sm text-stone-900 outline-none transition focus:ring-2 focus:ring-offset-0";

export const fieldMetaClassName =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400";

export const fieldErrorClassName = "text-xs font-medium text-red-600";

export const fieldHintClassName = "text-xs text-stone-500";

export function getTextInputClassName(hasError: boolean) {
  return [
    baseInputClassName,
    hasError
      ? "border border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-100"
      : "border border-stone-300 bg-white focus:border-ocean-300 focus:ring-ocean-100",
  ].join(" ");
}

export function getTextareaClassName(hasError: boolean) {
  return getTextInputClassName(hasError);
}

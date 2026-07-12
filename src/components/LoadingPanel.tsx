import { SkeletonBlock } from "./SkeletonBlock";

type LoadingPanelProps = {
  compact?: boolean;
  label?: string;
};

export function LoadingPanel({
  compact = false,
  label = "Cargando contenido...",
}: LoadingPanelProps) {
  return (
    <div className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="space-y-3">
        <SkeletonBlock className="h-4 w-24 rounded-full" />
        <SkeletonBlock className={compact ? "h-8 w-40 rounded-full" : "h-10 w-52 rounded-full"} />
        {!compact ? <SkeletonBlock className="h-4 w-2/3 rounded-full" /> : null}
      </div>

      <div className="grid gap-3">
        <SkeletonBlock className="h-12 w-full rounded-2xl" />
        {!compact ? <SkeletonBlock className="h-20 w-full rounded-3xl" /> : null}
        <SkeletonBlock className="h-20 w-full rounded-3xl" />
        {!compact ? <SkeletonBlock className="h-20 w-full rounded-3xl" /> : null}
      </div>

      <p className="text-sm text-stone-500">{label}</p>
    </div>
  );
}

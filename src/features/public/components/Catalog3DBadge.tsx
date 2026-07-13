export function Catalog3DBadge() {
  return (
    <span
      aria-label="Este producto tiene vista 3D"
      className="pointer-events-none absolute right-2 top-2 z-[6] inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-ocean-500 to-brand-600 px-2 py-0.5 text-[9px] font-bold tracking-wide text-white shadow-[0_6px_16px_-6px_rgba(15,23,42,0.55)] ring-1 ring-white/40 backdrop-blur-sm sm:text-[10px]"
      title="Este producto tiene vista 3D"
    >
      <svg aria-hidden="true" className="h-2.5 w-2.5 sm:h-3 sm:w-3" fill="none" viewBox="0 0 24 24">
        <path
          d="M12 2 3 7v10l9 5 9-5V7l-9-5Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <path d="M3 7l9 5 9-5M12 22V12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
      3D
    </span>
  );
}

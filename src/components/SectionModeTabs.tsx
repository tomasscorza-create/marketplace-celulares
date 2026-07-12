type SectionModeOption<TValue extends string> = {
  label: string;
  value: TValue;
};

type SectionModeTabsProps<TValue extends string> = {
  options: SectionModeOption<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
};

export function SectionModeTabs<TValue extends string>({
  options,
  value,
  onChange,
}: SectionModeTabsProps<TValue>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((option) => (
        <button
          aria-pressed={option.value === value}
          key={option.value}
          className={[
            "inline-flex items-center justify-center rounded-full border px-4 py-2.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#BFDBFE]",
            option.value === value
              ? "border-ocean-500 bg-ocean-500 text-white shadow-[0_10px_24px_-16px_rgba(71,85,105,0.9)]"
              : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50",
          ].join(" ")}
          onClick={() => {
            onChange(option.value);
          }}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

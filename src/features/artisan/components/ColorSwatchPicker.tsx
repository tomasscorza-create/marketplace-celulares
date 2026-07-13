const PRESET_COLORS = [
  { label: "Teja",        value: "#0f766e" },
  { label: "Burdeos",     value: "#115e59" },
  { label: "Marino",      value: "#475569" },
  { label: "Azul medio",  value: "#1a4a8a" },
  { label: "Verde selva", value: "#2d6a4f" },
  { label: "Oliva",       value: "#5c6b3a" },
  { label: "Caoba",       value: "#8b5e3c" },
  { label: "Ámbar",       value: "#c47b2b" },
  { label: "Ciruela",     value: "#6b2d5e" },
  { label: "Antracita",   value: "#2e2e2e" },
];

type ColorSwatchPickerProps = {
  onChange: (value: string) => void;
  value: string;
};

function isValidHex(color: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

export function ColorSwatchPicker({ onChange, value }: ColorSwatchPickerProps) {
  const displayValue = isValidHex(value) ? value : "#0f766e";

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color.value}
            aria-label={color.label}
            className={[
              "h-9 w-9 rounded-full border-2 transition-transform hover:scale-110",
              displayValue.toLowerCase() === color.value.toLowerCase()
                ? "border-stone-900 scale-110"
                : "border-transparent",
            ].join(" ")}
            onClick={() => {
              onChange(color.value);
            }}
            style={{ backgroundColor: color.value }}
            title={color.label}
            type="button"
          />
        ))}
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-stone-300 bg-white px-4 py-3">
        <span
          className="h-6 w-6 shrink-0 rounded-full border border-stone-200 shadow-sm"
          style={{ backgroundColor: displayValue }}
        />
        <input
          className="flex-1 bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-400"
          maxLength={7}
          onChange={(event) => {
            const raw = event.target.value;
            if (raw === "" || raw === "#" || isValidHex(raw)) {
              onChange(raw || "#");
            }
          }}
          placeholder="#0f766e"
          type="text"
          value={value}
        />
      </div>
    </div>
  );
}

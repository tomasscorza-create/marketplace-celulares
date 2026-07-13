type AccessMode = "login" | "buyer-signup" | "artisan-signup";

type AccessModeOption = {
  description: string;
  label: string;
  value: AccessMode;
};

type AccessModeSelectorProps = {
  mode: AccessMode;
  onChange: (nextMode: AccessMode) => void;
  options: AccessModeOption[];
};

function getModeButtonClass(isActive: boolean) {
  return [
    "rounded-2xl border px-4 py-3 text-left transition-colors",
    isActive
      ? "border-ocean-500 bg-brand-500 text-white"
      : "border-stone-200 bg-white text-stone-700 hover:border-brand-500 hover:bg-brand-50",
  ].join(" ");
}

export function AccessModeSelector({
  mode,
  onChange,
  options,
}: AccessModeSelectorProps) {
  return (
    <aside className="rounded-2xl border border-ocean-100 bg-[linear-gradient(180deg,_#ffffff,_#e0f2fe)] p-5 shadow-sm sm:p-6">
      <p className="text-sm font-semibold uppercase tracking-widest text-ocean-500">
        Acceso a la plataforma
      </p>
      <h2 className="mt-4 text-2xl font-semibold tracking-tight text-stone-900">
        Compra sin cuenta o registra el tipo de acceso que necesites
      </h2>
      <p className="mt-3 text-sm leading-6 text-stone-600">
        El catálogo sigue abierto para explorar sin registrarte. Si quieres guardar una
        cuenta para compras, crea un usuario comprador. Si vas a vender, necesitas una
        cuenta de vendedor habilitada con clave de alta.
      </p>

      <div className="mt-6 grid gap-3">
        {options.map((option) => (
          <button
            key={option.value}
            className={getModeButtonClass(mode === option.value)}
            onClick={() => {
              onChange(option.value);
            }}
            type="button"
          >
            <span className="block text-sm font-semibold">{option.label}</span>
            <span
              className={[
                "mt-1 block text-xs",
                mode === option.value ? "text-white/80" : "text-stone-500",
              ].join(" ")}
            >
              {option.description}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}

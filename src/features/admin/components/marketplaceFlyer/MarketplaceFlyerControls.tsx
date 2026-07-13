import type { FlyerVariant, ManualFlyerSettings } from "./flyerTypes";

import { FLYER_QR_SIZE_LIMITS, FLYER_TEXT_LIMITS } from "./flyerConfig";
import { limitFlyerText } from "./flyerUtils";

type MarketplaceFlyerControlsProps = {
  flyerVariant: FlyerVariant;
  manualSettings: ManualFlyerSettings;
  onManualSettingChange: <TKey extends keyof ManualFlyerSettings>(
    field: TKey,
    value: ManualFlyerSettings[TKey],
  ) => void;
  onRandomize: () => void;
  onVariantChange: <TKey extends keyof FlyerVariant>(
    field: TKey,
    value: FlyerVariant[TKey],
  ) => void;
};

function Counter({ current, max }: { current: number; max: number }) {
  return (
    <span className="text-xs font-normal text-stone-400">
      {current}/{max}
    </span>
  );
}

export function MarketplaceFlyerControls({
  flyerVariant,
  manualSettings,
  onManualSettingChange,
  onRandomize,
  onVariantChange,
}: MarketplaceFlyerControlsProps) {
  return (
    <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
            Edicion manual
          </p>
          <h3 className="mt-1 text-base font-semibold text-stone-900">
            Personalizar folleto
          </h3>
        </div>
        <button
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100"
          onClick={onRandomize}
          type="button"
        >
          Rotar estilo
        </button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-stone-700">
          <span className="flex items-center justify-between gap-2">
            Etiqueta
            <Counter current={flyerVariant.eyebrow.length} max={FLYER_TEXT_LIMITS.eyebrow} />
          </span>
          <input
            className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-300"
            maxLength={FLYER_TEXT_LIMITS.eyebrow}
            onChange={(event) =>
              onVariantChange(
                "eyebrow",
                limitFlyerText(event.target.value, FLYER_TEXT_LIMITS.eyebrow),
              )
            }
            value={flyerVariant.eyebrow}
          />
        </label>

        <label className="grid gap-1 text-sm font-medium text-stone-700">
          <span className="flex items-center justify-between gap-2">
            Destaque
            <Counter current={flyerVariant.highlight.length} max={FLYER_TEXT_LIMITS.highlight} />
          </span>
          <input
            className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-300"
            maxLength={FLYER_TEXT_LIMITS.highlight}
            onChange={(event) =>
              onVariantChange(
                "highlight",
                limitFlyerText(event.target.value, FLYER_TEXT_LIMITS.highlight),
              )
            }
            value={flyerVariant.highlight}
          />
        </label>

        <label className="grid gap-1 text-sm font-medium text-stone-700 lg:col-span-2">
          <span className="flex items-center justify-between gap-2">
            Titulo principal
            <Counter current={flyerVariant.headline.length} max={FLYER_TEXT_LIMITS.headline} />
          </span>
          <textarea
            className="min-h-20 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-300"
            maxLength={FLYER_TEXT_LIMITS.headline}
            onChange={(event) =>
              onVariantChange(
                "headline",
                limitFlyerText(event.target.value, FLYER_TEXT_LIMITS.headline),
              )
            }
            value={flyerVariant.headline}
          />
        </label>

        <label className="grid gap-1 text-sm font-medium text-stone-700 lg:col-span-2">
          <span className="flex items-center justify-between gap-2">
            Texto inferior
            <Counter
              current={manualSettings.footerText.length}
              max={FLYER_TEXT_LIMITS.footerText}
            />
          </span>
          <input
            className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-300"
            maxLength={FLYER_TEXT_LIMITS.footerText}
            onChange={(event) =>
              onManualSettingChange(
                "footerText",
                limitFlyerText(event.target.value, FLYER_TEXT_LIMITS.footerText),
              )
            }
            value={manualSettings.footerText}
          />
        </label>

        <label className="grid gap-1 text-sm font-medium text-stone-700">
          Layout
          <select
            className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-300"
            onChange={(event) =>
              onVariantChange("layout", event.target.value as FlyerVariant["layout"])
            }
            value={flyerVariant.layout}
          >
            <option value="mosaic">Mosaico</option>
            <option value="poster">Poster</option>
            <option value="stack">Vertical</option>
          </select>
        </label>

        <label className="grid gap-1 text-sm font-medium text-stone-700">
          Color principal
          <input
            className="h-11 rounded-xl border border-stone-300 bg-white p-1"
            onChange={(event) => onVariantChange("accent", event.target.value)}
            type="color"
            value={flyerVariant.accent}
          />
        </label>

        <label className="grid gap-1 text-sm font-medium text-stone-700">
          Color titulo
          <input
            className="h-11 rounded-xl border border-stone-300 bg-white p-1"
            onChange={(event) => onManualSettingChange("headlineColor", event.target.value)}
            type="color"
            value={manualSettings.headlineColor}
          />
        </label>

        <label className="grid gap-1 text-sm font-medium text-stone-700">
          Tamano titulo: {manualSettings.headlineSize}px
          <input
            max={96}
            min={58}
            onChange={(event) =>
              onManualSettingChange("headlineSize", Number(event.target.value))
            }
            type="range"
            value={manualSettings.headlineSize}
          />
        </label>

        <label className="grid gap-1 text-sm font-medium text-stone-700">
          Tamano etiqueta: {manualSettings.eyebrowSize}px
          <input
            max={38}
            min={20}
            onChange={(event) =>
              onManualSettingChange("eyebrowSize", Number(event.target.value))
            }
            type="range"
            value={manualSettings.eyebrowSize}
          />
        </label>

        <label className="grid gap-1 text-sm font-medium text-stone-700">
          Tamano QR: {manualSettings.qrSize}px
          <input
            max={FLYER_QR_SIZE_LIMITS.max}
            min={FLYER_QR_SIZE_LIMITS.min}
            onChange={(event) => onManualSettingChange("qrSize", Number(event.target.value))}
            type="range"
            value={manualSettings.qrSize}
          />
        </label>

        <label className="grid gap-1 text-sm font-medium text-stone-700">
          Tamano texto inferior: {manualSettings.footerSize}px
          <input
            max={36}
            min={20}
            onChange={(event) =>
              onManualSettingChange("footerSize", Number(event.target.value))
            }
            type="range"
            value={manualSettings.footerSize}
          />
        </label>

        <label className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700">
          <input
            checked={manualSettings.showStats}
            onChange={(event) => onManualSettingChange("showStats", event.target.checked)}
            type="checkbox"
          />
          Mostrar datos del catalogo
        </label>
      </div>
    </div>
  );
}

import type { ArtisanProductLearningProfile } from "../artisanProductLearning";

type ProductLearningPanelProps = {
  currentTitle: string;
  learningProfile: ArtisanProductLearningProfile | null;
  onTitleSuggestionApply: (title: string) => void;
};

function getConfidenceLabel(confidence: ArtisanProductLearningProfile["confidence"]) {
  if (confidence === "high") {
    return "Alta confianza";
  }

  if (confidence === "medium") {
    return "Confianza media";
  }

  return "Aprendiendo";
}

function getTitleSuggestions(learningProfile: ArtisanProductLearningProfile) {
  return [
    ...learningProfile.suggestedTitlePrefixes,
    ...learningProfile.suggestedTitleWords,
  ].slice(0, 8);
}

export function ProductLearningPanel({
  currentTitle,
  learningProfile,
  onTitleSuggestionApply,
}: ProductLearningPanelProps) {
  if (!learningProfile || learningProfile.historyCount === 0) {
    return null;
  }

  const titleSuggestions = getTitleSuggestions(learningProfile);

  return (
    <section className="grid gap-3 rounded-3xl border border-ocean-100 bg-[#F8FBFF] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-stone-900">Precarga inteligente</p>
          <p className="text-sm leading-6 text-stone-500">
            Usamos {learningProfile.historyCount} producto
            {learningProfile.historyCount === 1 ? "" : "s"} anteriores de esta cuenta para
            completar datos probables. Todo se puede editar.
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-ocean-600">
          {getConfidenceLabel(learningProfile.confidence)}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-stone-600">
        {learningProfile.suggestedPrice ? (
          <span className="rounded-full bg-white px-2.5 py-1">
            Precio sugerido ${Number(learningProfile.suggestedPrice).toLocaleString("es-AR")}
          </span>
        ) : null}
        {learningProfile.suggestedAttributes.length ? (
          <span className="rounded-full bg-white px-2.5 py-1">
            {learningProfile.suggestedAttributes.length} atributo
            {learningProfile.suggestedAttributes.length === 1 ? "" : "s"} frecuentes
          </span>
        ) : null}
        <span className="rounded-full bg-white px-2.5 py-1">
          {learningProfile.suggestedAvailabilityMode === "made_to_order"
            ? "Suele usar bajo demanda"
            : "Suele usar stock"}
        </span>
      </div>

      {titleSuggestions.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">
            Sugerencias de titulo
          </p>
          <div className="flex flex-wrap gap-2">
            {titleSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                className="rounded-full border border-ocean-100 bg-white px-3 py-1.5 text-xs font-medium text-ocean-600 transition-colors hover:bg-ocean-50"
                onClick={() => {
                  onTitleSuggestionApply(
                    currentTitle.trim() ? `${currentTitle} ${suggestion}` : suggestion,
                  );
                }}
                type="button"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

import { memo, useEffect, useMemo, useState } from "react";

import type {
  AdminProductControlBoostLevel,
  AdminProductControlTag,
} from "../../../../types/admin";

import { TAG_OPTIONS, getTagOption } from "./shared";

const BOOST_LEVELS: Array<{ level: AdminProductControlBoostLevel; label: string; tone: string }> = [
  { level: "medio", label: "Medio", tone: "border-sky-300 bg-sky-50 text-sky-700" },
  { level: "moderado", label: "Moderado", tone: "border-violet-300 bg-violet-50 text-violet-700" },
  { level: "maximo", label: "Máximo", tone: "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700" },
];

function addDuration(unit: "hours" | "days", value: number) {
  const date = new Date();
  if (unit === "days") {
    date.setDate(date.getDate() + value);
  } else {
    date.setHours(date.getHours() + value);
  }
  return date.toISOString();
}

function formatRemainingBoostTime(boostUntil: string | null, nowTimestamp: number) {
  if (!boostUntil) {
    return null;
  }

  const boostUntilTime = new Date(boostUntil).getTime();

  if (Number.isNaN(boostUntilTime)) {
    return null;
  }

  const remainingMs = boostUntilTime - nowTimestamp;

  if (remainingMs <= 0) {
    return "Finalizado";
  }

  const totalMinutes = Math.floor(remainingMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h restantes`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m restantes`;
  }

  return `${Math.max(minutes, 1)}m restantes`;
}

type AdminProductControlActionsTabProps = {
  currentBoostLevel: AdminProductControlBoostLevel | null;
  currentBoostSummaryLabel: string | null;
  currentBoostUntil: string | null;
  currentComment: string | null;
  currentTag: AdminProductControlTag | null;
  isSavingTag: boolean;
  onApplyBoost: (boostLevel: AdminProductControlBoostLevel, boostUntil: string) => void;
  onApplyTag: (tag: AdminProductControlTag) => void;
  onClearBoost: () => void;
  onClearTag: () => void;
  onSaveComment: (comment: string | null) => void;
  productTitle: string;
};

function AdminProductControlActionsTabInner({
  currentBoostLevel,
  currentBoostSummaryLabel,
  currentBoostUntil,
  currentComment,
  currentTag,
  isSavingTag,
  onApplyBoost,
  onApplyTag,
  onClearBoost,
  onClearTag,
  onSaveComment,
  productTitle,
}: AdminProductControlActionsTabProps) {
  const [commentDraft, setCommentDraft] = useState(currentComment ?? "");
  const [boostLevelDraft, setBoostLevelDraft] = useState<AdminProductControlBoostLevel>(
    currentBoostLevel ?? "medio",
  );
  const [boostAmountDraft, setBoostAmountDraft] = useState("24");
  const [boostUnitDraft, setBoostUnitDraft] = useState<"hours" | "days">("hours");
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());

  useEffect(() => {
    setCommentDraft(currentComment ?? "");
  }, [currentComment, productTitle]);

  useEffect(() => {
    setBoostLevelDraft(currentBoostLevel ?? "medio");
  }, [currentBoostLevel, productTitle]);

  useEffect(() => {
    if (!currentBoostUntil) {
      return;
    }

    setNowTimestamp(Date.now());
    const id = window.setInterval(() => {
      setNowTimestamp(Date.now());
    }, 30000);

    return () => {
      window.clearInterval(id);
    };
  }, [currentBoostUntil]);

  const currentTagOption = useMemo(() => getTagOption(currentTag), [currentTag]);
  const remainingBoostLabel = useMemo(
    () => formatRemainingBoostTime(currentBoostUntil, nowTimestamp),
    [currentBoostUntil, nowTimestamp],
  );

  return (
    <div className="grid gap-4 p-5">
      <div className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">
              Etiqueta interna
            </p>
            <p className="text-sm font-medium text-stone-700">
              {currentTagOption?.label ?? "Sin etiqueta"}
            </p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-full border border-brand-400 bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
            onClick={() => {
              setIsHelpOpen((value) => !value);
            }}
            type="button"
          >
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
              <path
                d="M6.4 6.1a1.8 1.8 0 1 1 2.58 1.62c-.62.3-.98.7-.98 1.42m0 2.1h.01M14 8A6 6 0 1 1 2 8a6 6 0 0 1 12 0Z"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.4"
              />
            </svg>
            Ayuda
          </button>
        </div>

        {isHelpOpen ? (
          <div className="grid gap-2 rounded-2xl border border-brand-500/45 bg-brand-50 p-4 text-sm text-stone-700">
            <p>
              <strong>Destacado up:</strong> sube fuerte su prioridad y empuja su presencia.
            </p>
            <p>
              <strong>Prueba / test:</strong> rota entre usuarios para testear respuesta.
            </p>
            <p>
              <strong>Bajar prioridad:</strong> sigue visible, pero cae más abajo.
            </p>
            <p>
              <strong>Ocultar total:</strong> sale por completo del catálogo.
            </p>
            <p>
              <strong>Comentario:</strong> nota interna solo para admin.
            </p>
            <p>
              <strong>Boost:</strong> refuerzo temporal por horas o días con intensidad.
            </p>
          </div>
        ) : null}

        <div className="grid gap-2">
          {TAG_OPTIONS.map((tagOption) => (
            <button
              key={tagOption.tag}
              className={[
                "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-colors",
                currentTag === tagOption.tag
                  ? tagOption.activeClassName
                  : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50",
              ].join(" ")}
              disabled={isSavingTag}
              onClick={() => {
                onApplyTag(tagOption.tag);
              }}
              type="button"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/80">
                {tagOption.icon}
              </span>
              <span>{tagOption.label}</span>
            </button>
          ))}
        </div>

        <button
          className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-600 transition-colors hover:border-brand-500 hover:bg-brand-100 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSavingTag || currentTag === null}
          onClick={onClearTag}
          type="button"
        >
          Quitar etiqueta
        </button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">
          Comentario interno
        </p>
        <textarea
          className="min-h-24 w-full rounded-2xl border border-stone-300 px-3 py-3 text-sm text-stone-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
          onChange={(event) => {
            setCommentDraft(event.target.value);
          }}
          placeholder="Deja una nota interna para este producto"
          value={commentDraft}
        />
        <button
          className="rounded-2xl border border-ocean-500 bg-brand-50 px-4 py-3 text-sm font-semibold text-ocean-500 transition-colors hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSavingTag}
          onClick={() => {
            onSaveComment(commentDraft.trim() || null);
          }}
          type="button"
        >
          Guardar comentario
        </button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">
            Boost temporal
          </p>
          <p className="text-sm text-stone-600">{currentBoostSummaryLabel ?? "Sin boost activo"}</p>
          {remainingBoostLabel && currentBoostSummaryLabel ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              {remainingBoostLabel}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {BOOST_LEVELS.map((boostOption) => (
            <button
              key={boostOption.level}
              className={[
                "rounded-2xl border px-3 py-2 text-sm font-semibold transition-colors",
                boostLevelDraft === boostOption.level
                  ? boostOption.tone
                  : "border-stone-200 bg-stone-50 text-stone-600 hover:bg-white",
              ].join(" ")}
              onClick={() => {
                setBoostLevelDraft(boostOption.level);
              }}
              type="button"
            >
              {boostOption.label}
            </button>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]">
          <input
            className="rounded-2xl border border-stone-300 px-3 py-3 text-sm text-stone-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            inputMode="numeric"
            min="1"
            onChange={(event) => {
              setBoostAmountDraft(event.target.value);
            }}
            placeholder="Duración"
            type="number"
            value={boostAmountDraft}
          />
          <select
            className="rounded-2xl border border-stone-300 px-3 py-3 text-sm text-stone-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            onChange={(event) => {
              setBoostUnitDraft(event.target.value === "days" ? "days" : "hours");
            }}
            value={boostUnitDraft}
          >
            <option value="hours">Horas</option>
            <option value="days">Días</option>
          </select>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            className="rounded-2xl border border-brand-600 bg-brand-100 px-4 py-3 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-200 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSavingTag || Number(boostAmountDraft) <= 0}
            onClick={() => {
              const amount = Number(boostAmountDraft);
              if (!Number.isFinite(amount) || amount <= 0) {
                return;
              }
              onApplyBoost(boostLevelDraft, addDuration(boostUnitDraft, amount));
            }}
            type="button"
          >
            Aplicar boost
          </button>
          <button
            className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-600 transition-colors hover:border-brand-500 hover:bg-brand-100 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSavingTag || (!currentBoostLevel && !currentBoostUntil)}
            onClick={onClearBoost}
            type="button"
          >
            Quitar boost
          </button>
        </div>
      </div>
    </div>
  );
}

export const AdminProductControlActionsTab = memo(AdminProductControlActionsTabInner);

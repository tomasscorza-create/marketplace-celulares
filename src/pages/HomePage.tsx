import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { marketplaceConfig } from "@/config/marketplace";
import { useAuth } from "@/features/auth/useAuth";
import {
  useSaveSiteContent,
  useSiteContent,
} from "@/features/siteContent/siteContentQueries";
import type { SiteContentValues } from "@/features/siteContent/siteContentClient";

const HOME_CONTENT = {
  heroDescription: "home.hero.description",
  primaryButtonLabel: "home.primary_button.label",
  secondaryButtonLabel: "home.secondary_button.label",
} as const;

const HOME_CONTENT_KEYS = Object.values(HOME_CONTENT);

const DEFAULT_HOME_CONTENT: SiteContentValues = {
  [HOME_CONTENT.heroDescription]:
    "Todo lo que ves acá fue creado por alguien, con nombre y propósito. Descubrí piezas únicas creadas por vendedores apasionados, cada una distinta a la anterior. Algo especial te está esperando.",
  [HOME_CONTENT.primaryButtonLabel]: "Ver catálogo",
  [HOME_CONTENT.secondaryButtonLabel]: "Iniciar sesión",
};

export function HomePage() {
  const { role, user } = useAuth();
  const isAdmin = role === "admin";
  const contentQuery = useSiteContent(HOME_CONTENT_KEYS, DEFAULT_HOME_CONTENT);
  const saveContent = useSaveSiteContent(HOME_CONTENT_KEYS);
  const content = contentQuery.data ?? (contentQuery.isError ? DEFAULT_HOME_CONTENT : null);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<SiteContentValues>(DEFAULT_HOME_CONTENT);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing && content) {
      setDraft(content);
    }
  }, [content, isEditing]);

  const handleDraftChange = (contentKey: string, value: string) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [contentKey]: value,
    }));
    setSaveMessage(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextValues = {
      [HOME_CONTENT.heroDescription]:
        draft[HOME_CONTENT.heroDescription]?.trim() ||
        DEFAULT_HOME_CONTENT[HOME_CONTENT.heroDescription],
      [HOME_CONTENT.primaryButtonLabel]:
        draft[HOME_CONTENT.primaryButtonLabel]?.trim() ||
        DEFAULT_HOME_CONTENT[HOME_CONTENT.primaryButtonLabel],
      [HOME_CONTENT.secondaryButtonLabel]:
        draft[HOME_CONTENT.secondaryButtonLabel]?.trim() ||
        DEFAULT_HOME_CONTENT[HOME_CONTENT.secondaryButtonLabel],
    };

    try {
      await saveContent.mutateAsync({
        userId: user?.id ?? null,
        values: nextValues,
      });

      setDraft(nextValues);
      setIsEditing(false);
      setSaveMessage("Textos guardados.");
    } catch {
      setSaveMessage(null);
    }
  };

  return (
    <section className="relative -mx-4 flex min-h-[calc(100dvh-13rem)] items-center justify-center overflow-hidden px-4 py-12 sm:-mx-6 sm:px-6 sm:py-16">
      <h1 className="sr-only">{marketplaceConfig.appName}</h1>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,_rgba(255,249,230,0.96)_0%,_rgba(234,242,255,0.82)_44%,_rgba(251,243,238,0.95)_100%)]" />
        <div className="absolute inset-0 opacity-[0.32] [background-image:repeating-linear-gradient(115deg,_rgba(15,118,110,0.16)_0,_rgba(15,118,110,0.16)_1px,_transparent_1px,_transparent_28px),repeating-linear-gradient(25deg,_rgba(71,85,105,0.13)_0,_rgba(71,85,105,0.13)_1px,_transparent_1px,_transparent_34px)]" />
        <div className="absolute -left-24 top-10 h-24 w-[48rem] -rotate-12 bg-brand-500/12" />
        <div className="absolute -right-24 top-40 h-20 w-[42rem] rotate-12 bg-sun-500/20" />
        <div className="absolute -bottom-10 left-1/2 h-28 w-[56rem] -translate-x-1/2 rotate-[-5deg] bg-ocean-500/12" />
        <div className="absolute left-[12%] top-[18%] h-24 w-24 rotate-45 border border-brand-500/20 bg-white/18" />
        <div className="absolute right-[12%] top-[22%] h-28 w-28 rotate-12 border border-ocean-500/20 bg-white/18" />
        <div className="absolute bottom-[18%] left-[18%] h-20 w-20 rotate-[30deg] border border-sun-700/20 bg-white/16" />
      </div>

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-8 sm:gap-10">
        {content ? (
          <p
            className="max-w-2xl text-center text-[1.45rem] leading-[1.55] text-stone-800 drop-shadow-[0_1px_16px_rgba(255,255,255,0.72)] sm:text-[1.9rem]"
            style={{ fontFamily: '"Lora", Georgia, serif' }}
          >
            {content[HOME_CONTENT.heroDescription]}
          </p>
        ) : (
          <div
            aria-hidden="true"
            className="h-[11.5rem] w-full max-w-2xl animate-pulse rounded-[1.75rem] bg-white/45 shadow-[0_18px_54px_-42px_rgba(95,45,20,0.75)] sm:h-[9.25rem]"
          />
        )}

        <div className="flex w-full max-w-xl flex-col gap-5 sm:gap-6">
          {content ? (
            <>
              <Link
                className="group relative flex min-h-28 items-center justify-center overflow-hidden rounded-[1.375rem] border border-ocean-600 bg-[linear-gradient(135deg,_#0f766e_0%,_#0891b2_52%,_#2563eb_100%)] px-8 py-8 text-center text-2xl font-semibold text-white shadow-[0_30px_70px_-42px_rgba(8,145,178,0.72)] transition-all duration-200 after:absolute after:inset-0 after:-translate-x-[105%] after:bg-[linear-gradient(105deg,_transparent_28%,_rgba(255,255,255,0.24)_50%,_transparent_72%)] after:transition-transform after:duration-500 after:content-[''] hover:-translate-y-1 hover:shadow-[0_34px_78px_-40px_rgba(8,145,178,0.78)] hover:after:translate-x-[105%] focus-visible:rounded-[1.375rem] sm:min-h-32 sm:text-3xl"
                to="/catalogo"
              >
                <span className="relative z-10">{content[HOME_CONTENT.primaryButtonLabel]}</span>
              </Link>
              <Link
                className="group relative flex min-h-28 items-center justify-center overflow-hidden rounded-[1.375rem] border border-brand-300 bg-white/88 px-8 py-8 text-center text-2xl font-semibold text-brand-700 shadow-[0_30px_70px_-48px_rgba(15,118,110,0.75)] backdrop-blur-sm transition-all duration-200 after:absolute after:inset-x-8 after:bottom-5 after:h-px after:scale-x-0 after:bg-brand-500/35 after:transition-transform after:duration-300 after:content-[''] hover:-translate-y-1 hover:border-brand-500 hover:bg-brand-50 hover:after:scale-x-100 focus-visible:rounded-[1.375rem] sm:min-h-32 sm:text-3xl"
                to="/login"
              >
                <span className="relative z-10">{content[HOME_CONTENT.secondaryButtonLabel]}</span>
              </Link>
            </>
          ) : (
            <>
              <div
                aria-hidden="true"
                className="min-h-28 animate-pulse rounded-[1.375rem] border border-ocean-300/35 bg-ocean-500/20 sm:min-h-32"
              />
              <div
                aria-hidden="true"
                className="min-h-28 animate-pulse rounded-[1.375rem] border border-brand-300/35 bg-white/50 sm:min-h-32"
              />
            </>
          )}
        </div>

        {isAdmin && content ? (
          <div className="w-full max-w-xl">
            {!isEditing ? (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  className="rounded-full border border-brand-300 bg-white/90 px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm transition hover:border-brand-500 hover:bg-brand-50"
                  type="button"
                  onClick={() => {
                    setDraft(content);
                    setIsEditing(true);
                    setSaveMessage(null);
                  }}
                >
                  Editar textos
                </button>
                {saveMessage ? (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                    {saveMessage}
                  </span>
                ) : null}
              </div>
            ) : (
              <form
                className="rounded-2xl border border-brand-200 bg-white/92 p-4 shadow-[0_18px_50px_-34px_rgba(95,45,20,0.75)] backdrop-blur-sm"
                onSubmit={handleSubmit}
              >
                <div className="grid gap-3">
                  <label className="grid gap-1 text-sm font-semibold text-stone-700">
                    Texto principal
                    <textarea
                      className="min-h-32 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-normal leading-6 text-stone-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                      value={draft[HOME_CONTENT.heroDescription] ?? ""}
                      onChange={(event) =>
                        handleDraftChange(HOME_CONTENT.heroDescription, event.target.value)
                      }
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-stone-700">
                    Botón catálogo
                    <input
                      className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-normal text-stone-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                      value={draft[HOME_CONTENT.primaryButtonLabel] ?? ""}
                      onChange={(event) =>
                        handleDraftChange(HOME_CONTENT.primaryButtonLabel, event.target.value)
                      }
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-stone-700">
                    Botón ingreso
                    <input
                      className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-normal text-stone-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                      value={draft[HOME_CONTENT.secondaryButtonLabel] ?? ""}
                      onChange={(event) =>
                        handleDraftChange(HOME_CONTENT.secondaryButtonLabel, event.target.value)
                      }
                    />
                  </label>
                </div>

                {contentQuery.isError ? (
                  <p className="mt-3 rounded-xl bg-sun-50 px-3 py-2 text-sm font-medium text-sun-800">
                    Todavía falta cargar la tabla site_content en Supabase.
                  </p>
                ) : null}

                {saveContent.isError ? (
                  <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                    {saveContent.error.message}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <button
                    className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
                    type="button"
                    onClick={() => {
                      setDraft(content);
                      setIsEditing(false);
                      setSaveMessage(null);
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={saveContent.isPending}
                    type="submit"
                  >
                    {saveContent.isPending ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}

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
    "Encontrá los mejores accesorios y celulares en un solo lugar. Descubrí fundas, cargadores y tecnología de vendedores verificados, con envío directo y al mejor precio.",
  [HOME_CONTENT.primaryButtonLabel]: "Ver catálogo",
  [HOME_CONTENT.secondaryButtonLabel]: "Ingresar",
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
    <section className="relative -mx-4 flex min-h-[calc(100dvh-13rem)] flex-col items-center justify-center overflow-hidden px-4 py-16 sm:-mx-6 sm:px-6 sm:py-24">
      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-6 sm:gap-8">
        <div className="flex flex-col items-center justify-center gap-4 animate-fade-in-up">
          <img 
            src={marketplaceConfig.logoPath} 
            alt="Logo Nyzca" 
            className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl shadow-elev-glow"
          />
          <h1 className="text-center font-display text-4xl font-extrabold tracking-tight text-ocean-900 sm:text-5xl lg:text-6xl drop-shadow-sm">
            {marketplaceConfig.appName}
          </h1>
        </div>

        {content ? (
          <p className="max-w-2xl text-center text-lg sm:text-xl font-medium tracking-normal text-ocean-600 leading-relaxed animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            {content[HOME_CONTENT.heroDescription]}
          </p>
        ) : (
          <div
            aria-hidden="true"
            className="h-[11.5rem] w-full max-w-2xl animate-pulse rounded-3xl bg-white/45 shadow-[0_18px_54px_-42px_rgba(95,45,20,0.75)] sm:h-[9.25rem]"
          />
        )}

        <div className="flex w-full max-w-xl flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
          {content ? (
            <>
              <Link
                className="group relative flex w-full sm:w-auto items-center justify-center gap-2 overflow-hidden rounded-full bg-stone-900 px-8 py-3.5 text-center font-medium text-white shadow-elev-3 transition-all duration-500 hover:-translate-y-0.5 hover:bg-stone-800 hover:shadow-elev-3"
                to="/catalogo"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/30 to-blue-500/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <span className="relative z-10 flex items-center gap-2">
                  {content[HOME_CONTENT.primaryButtonLabel]}
                  <svg className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                </span>
              </Link>
              <Link
                className="group flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-stone-200/50 bg-white/40 backdrop-blur-xl px-8 py-3.5 text-center font-medium text-ocean-700 shadow-sm transition-all duration-500 hover:-translate-y-0.5 hover:border-stone-300/60 hover:bg-white/60 hover:shadow-elev-2"
                to="/login"
              >
                <span className="relative z-10">{content[HOME_CONTENT.secondaryButtonLabel]}</span>
              </Link>
            </>
          ) : (
            <>
              <div
                aria-hidden="true"
                className="h-[52px] w-[180px] animate-pulse rounded-xl bg-stone-200"
              />
              <div
                aria-hidden="true"
                className="h-[52px] w-[160px] animate-pulse rounded-xl bg-stone-200"
              />
            </>
          )}
        </div>

        {isAdmin && content ? (
          <div className="w-full max-w-xl">
            {!isEditing ? (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  className="rounded-full border border-stone-300 bg-white/90 px-4 py-2 text-sm font-semibold text-ocean-700 shadow-sm transition hover:border-stone-400 hover:bg-stone-50"
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
                className="rounded-3xl border border-white/40 bg-white/50 p-6 shadow-elev-2 backdrop-blur-2xl"
                onSubmit={handleSubmit}
              >
                <div className="grid gap-3">
                  <label className="grid gap-1 text-sm font-semibold text-stone-700">
                    Texto principal
                    <textarea
                      className="min-h-32 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-normal leading-6 text-ocean-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                      value={draft[HOME_CONTENT.heroDescription] ?? ""}
                      onChange={(event) =>
                        handleDraftChange(HOME_CONTENT.heroDescription, event.target.value)
                      }
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-stone-700">
                    Botón catálogo
                    <input
                      className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-normal text-ocean-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                      value={draft[HOME_CONTENT.primaryButtonLabel] ?? ""}
                      onChange={(event) =>
                        handleDraftChange(HOME_CONTENT.primaryButtonLabel, event.target.value)
                      }
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-stone-700">
                    Botón ingreso
                    <input
                      className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-normal text-ocean-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                      value={draft[HOME_CONTENT.secondaryButtonLabel] ?? ""}
                      onChange={(event) =>
                        handleDraftChange(HOME_CONTENT.secondaryButtonLabel, event.target.value)
                      }
                    />
                  </label>
                </div>

                {contentQuery.isError ? (
                  <p className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-sm font-medium text-brand-800">
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
                    className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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

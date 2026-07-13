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
    "Encuentra los mejores accesorios y celulares en un solo lugar. Descubre fundas, cargadores y tecnología de vendedores verificados, con envío directo y al mejor precio.",
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

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-slate-50 overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+CjxwYXRoIGQ9Ik0gMjQgMEwgMCAwIDAgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2UydThmMCIgc3Ryb2tlLXdpZHRoPSIxIiBvcGFjaXR5PSIwLjUiLz4KPC9zdmc+')] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)] opacity-40" />
        
        {/* Glowing tech orbs */}
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-500/10 blur-[80px]" />
        <div className="absolute top-1/2 -right-24 h-[30rem] w-[30rem] -translate-y-1/2 rounded-full bg-indigo-500/10 blur-[100px]" />
        <div className="absolute -bottom-48 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-[80px]" />
      </div>

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-8 sm:gap-10">
        {content ? (
          <p className="max-w-2xl text-center text-xl sm:text-2xl font-medium tracking-tight text-slate-700 leading-relaxed drop-shadow-sm">
            {content[HOME_CONTENT.heroDescription]}
          </p>
        ) : (
          <div
            aria-hidden="true"
            className="h-[11.5rem] w-full max-w-2xl animate-pulse rounded-[1.75rem] bg-white/45 shadow-[0_18px_54px_-42px_rgba(95,45,20,0.75)] sm:h-[9.25rem]"
          />
        )}

        <div className="flex w-full max-w-xl flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
          {content ? (
            <>
              <Link
                className="group relative flex w-full sm:w-auto items-center justify-center gap-2 overflow-hidden rounded-xl bg-slate-900 px-8 py-3.5 text-center font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-600 hover:shadow-blue-500/25"
                to="/catalogo"
              >
                <span className="relative z-10">{content[HOME_CONTENT.primaryButtonLabel]}</span>
              </Link>
              <Link
                className="group flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm px-8 py-3.5 text-center font-semibold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white"
                to="/login"
              >
                <span className="relative z-10">{content[HOME_CONTENT.secondaryButtonLabel]}</span>
              </Link>
            </>
          ) : (
            <>
              <div
                aria-hidden="true"
                className="h-[52px] w-[180px] animate-pulse rounded-xl bg-slate-200"
              />
              <div
                aria-hidden="true"
                className="h-[52px] w-[160px] animate-pulse rounded-xl bg-slate-200"
              />
            </>
          )}
        </div>

        {isAdmin && content ? (
          <div className="w-full max-w-xl">
            {!isEditing ? (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  className="rounded-full border border-slate-300 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
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
                className="rounded-2xl border border-slate-200 bg-white/92 p-5 shadow-xl backdrop-blur-sm"
                onSubmit={handleSubmit}
              >
                <div className="grid gap-3">
                  <label className="grid gap-1 text-sm font-semibold text-stone-700">
                    Texto principal
                    <textarea
                      className="min-h-32 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal leading-6 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      value={draft[HOME_CONTENT.heroDescription] ?? ""}
                      onChange={(event) =>
                        handleDraftChange(HOME_CONTENT.heroDescription, event.target.value)
                      }
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-stone-700">
                    Botón catálogo
                    <input
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      value={draft[HOME_CONTENT.primaryButtonLabel] ?? ""}
                      onChange={(event) =>
                        handleDraftChange(HOME_CONTENT.primaryButtonLabel, event.target.value)
                      }
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-stone-700">
                    Botón ingreso
                    <input
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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

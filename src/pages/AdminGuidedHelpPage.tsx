import type { FormEvent } from "react";

import { useState } from "react";

import { getActionButtonClassName } from "../components/ActionButton";
import { LoadingPanel } from "../components/LoadingPanel";
import { PagePlaceholder } from "../components/PagePlaceholder";
import {
  useAdminGuidedHelpFaqs,
  useCreateGuidedHelpFaq,
  useDeleteGuidedHelpFaq,
  useUpdateGuidedHelpFaq,
} from "../features/guidedHelp/guidedHelpQueries";
import type { GuidedHelpFaq, GuidedHelpFaqInput } from "../types/guidedHelp";

const emptyForm: GuidedHelpFaqInput = {
  answer: "",
  is_active: true,
  question: "",
  sort_order: 0,
};

export function AdminGuidedHelpPage() {
  const [form, setForm] = useState<GuidedHelpFaqInput>(emptyForm);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const faqsQuery = useAdminGuidedHelpFaqs();
  const faqs = faqsQuery.data ?? [];

  const createFaqMutation = useCreateGuidedHelpFaq();
  const updateFaqMutation = useUpdateGuidedHelpFaq();
  const deleteFaqMutation = useDeleteGuidedHelpFaq();
  const isSaving = createFaqMutation.isPending || updateFaqMutation.isPending;

  const resetForm = () => {
    setEditingFaqId(null);
    setForm({ ...emptyForm, sort_order: faqs.length });
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const startEditing = (faq: GuidedHelpFaq) => {
    setEditingFaqId(faq.id);
    setForm({
      answer: faq.answer,
      is_active: faq.is_active,
      question: faq.question,
      sort_order: faq.sort_order,
    });
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage(null);
    setErrorMessage(null);

    if (!form.question.trim() || !form.answer.trim()) {
      setErrorMessage("Completá la pregunta y la respuesta.");
      return;
    }

    const input: GuidedHelpFaqInput = {
      ...form,
      answer: form.answer.trim(),
      question: form.question.trim(),
    };

    try {
      if (editingFaqId) {
        await updateFaqMutation.mutateAsync({ faqId: editingFaqId, input });
        setStatusMessage("Pregunta actualizada correctamente.");
      } else {
        await createFaqMutation.mutateAsync(input);
        setStatusMessage("Pregunta creada correctamente.");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No pudimos guardar la pregunta.");
      return;
    }

    setEditingFaqId(null);
    setForm({ ...emptyForm, sort_order: faqs.length + (editingFaqId ? 0 : 1) });
  };

  const handleDelete = async (faq: GuidedHelpFaq) => {
    if (!window.confirm(`¿Borrar la pregunta "${faq.question}"?`)) {
      return;
    }

    try {
      await deleteFaqMutation.mutateAsync(faq.id);

      if (editingFaqId === faq.id) {
        resetForm();
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No pudimos borrar la pregunta.");
    }
  };

  const toggleActive = async (faq: GuidedHelpFaq) => {
    try {
      await updateFaqMutation.mutateAsync({
        faqId: faq.id,
        input: {
          answer: faq.answer,
          is_active: !faq.is_active,
          question: faq.question,
          sort_order: faq.sort_order,
        },
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No pudimos actualizar la pregunta.");
    }
  };

  return (
    <PagePlaceholder
      badge="Ayuda guiada"
      description="Administrá las preguntas frecuentes que ven los visitantes en el botón flotante Ayuda guiada. Sólo las preguntas activas se muestran públicamente, en el orden indicado."
      title="Preguntas frecuentes"
    >
      <div className="grid items-start gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <form
          className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <div>
            <h2 className="text-xl font-semibold text-stone-900">
              {editingFaqId ? "Editar pregunta" : "Nueva pregunta"}
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              El orden define en qué posición aparece dentro del acordeón (0 = primera).
            </p>
          </div>

          <label className="grid gap-1.5 text-sm font-medium text-stone-700">
            Pregunta
            <input
              className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
              onChange={(event) => {
                setForm((current) => ({ ...current, question: event.target.value }));
              }}
              placeholder="¿Cómo hago un pedido?"
              type="text"
              value={form.question}
            />
          </label>

          <label className="grid gap-1.5 text-sm font-medium text-stone-700">
            Respuesta
            <textarea
              className="min-h-[7rem] rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
              onChange={(event) => {
                setForm((current) => ({ ...current, answer: event.target.value }));
              }}
              placeholder="Explicá la respuesta con el tono habitual de la tienda."
              value={form.answer}
            />
          </label>

          <div className="flex flex-wrap items-end gap-4">
            <label className="grid gap-1.5 text-sm font-medium text-stone-700">
              Orden
              <input
                className="w-24 rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                min={0}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    sort_order: Number(event.target.value) || 0,
                  }));
                }}
                type="number"
                value={form.sort_order}
              />
            </label>

            <label className="flex items-center gap-2 pb-3 text-sm font-medium text-stone-700">
              <input
                checked={form.is_active}
                className="h-4 w-4 rounded border-stone-300 text-brand-500 focus:ring-brand-300"
                onChange={(event) => {
                  setForm((current) => ({ ...current, is_active: event.target.checked }));
                }}
                type="checkbox"
              />
              Visible públicamente
            </label>
          </div>

          {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
          {statusMessage ? <p className="text-sm text-emerald-600">{statusMessage}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button
              className={getActionButtonClassName({ variant: "primary" })}
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? "Guardando..." : editingFaqId ? "Guardar cambios" : "Crear pregunta"}
            </button>
            {editingFaqId ? (
              <button
                className={getActionButtonClassName({ variant: "secondary" })}
                onClick={resetForm}
                type="button"
              >
                Cancelar
              </button>
            ) : null}
          </div>
        </form>

        <section className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex items-center justify-between gap-3 px-2 py-1 text-xs font-semibold uppercase tracking-widest text-stone-500">
            <span>Listado</span>
            <span>{faqs.length} pregunta(s)</span>
          </div>

          {faqsQuery.isLoading ? (
            <LoadingPanel compact label="Cargando preguntas..." />
          ) : (
            <div className="max-h-[min(68dvh,56rem)] overflow-y-auto pr-1 [scrollbar-width:thin]">
              <div className="grid gap-3">
                {faqs.map((faq) => (
                  <article
                    className="grid gap-4 rounded-3xl border border-stone-200 bg-stone-50/80 p-4 lg:grid-cols-[minmax(0,1fr)_auto]"
                    key={faq.id}
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-500">
                          #{faq.sort_order}
                        </span>
                        <h3 className="text-base font-semibold text-stone-900">{faq.question}</h3>
                        <span
                          className={[
                            "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest",
                            faq.is_active
                              ? "bg-ocean-50 text-ocean-700"
                              : "bg-stone-200 text-stone-600",
                          ].join(" ")}
                        >
                          {faq.is_active ? "Visible" : "Oculta"}
                        </span>
                      </div>
                      <p className="text-sm leading-6 text-stone-600">{faq.answer}</p>
                    </div>

                    <div className="grid gap-2 lg:w-36">
                      <button
                        className={getActionButtonClassName({ size: "sm", variant: "ghost" })}
                        onClick={() => startEditing(faq)}
                        type="button"
                      >
                        Editar
                      </button>
                      <button
                        className={getActionButtonClassName({ size: "sm", variant: "secondary" })}
                        onClick={() => {
                          void toggleActive(faq);
                        }}
                        type="button"
                      >
                        {faq.is_active ? "Ocultar" : "Mostrar"}
                      </button>
                      <button
                        className={getActionButtonClassName({ size: "sm", variant: "danger" })}
                        onClick={() => {
                          void handleDelete(faq);
                        }}
                        type="button"
                      >
                        Borrar
                      </button>
                    </div>
                  </article>
                ))}

                {faqs.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-stone-300 bg-white/80 p-6 text-sm leading-6 text-stone-600">
                    Todavía no hay preguntas cargadas.
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </section>
      </div>
    </PagePlaceholder>
  );
}

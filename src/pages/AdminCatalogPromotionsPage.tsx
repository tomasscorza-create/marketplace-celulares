import { useMemo, useState, type FormEvent } from "react";

import { PagePlaceholder } from "@/components/PagePlaceholder";
import {
  removeCatalogPromotionImage,
  uploadCatalogPromotionImage,
} from "@/features/catalogPromotions/catalogPromotionClient";
import {
  useAdminCatalogPromotions,
  useCatalogPromotionProductOptions,
  useDeleteCatalogPromotion,
  useSaveCatalogPromotion,
} from "@/features/catalogPromotions/catalogPromotionQueries";
import { validateCatalogPromotionInput } from "@/features/catalogPromotions/catalogPromotionUtils";
import { useAuth } from "@/features/auth/useAuth";
import type {
  CatalogPromotion,
  CatalogPromotionActionType,
  CatalogPromotionBenefitType,
  CatalogPromotionInput,
  CatalogPromotionKind,
} from "@/types/catalogPromotions";

type PromotionForm = Omit<CatalogPromotionInput, "ends_at" | "starts_at"> & {
  ends_at: string;
  starts_at: string;
};

const fieldClassName =
  "h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100";
const textAreaClassName =
  "min-h-24 w-full resize-y rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100";

const kindOptions: Array<{ label: string; value: CatalogPromotionKind }> = [
  { label: "Mensaje", value: "message" },
  { label: "Imagen", value: "image" },
  { label: "Producto", value: "product" },
  { label: "Descuento", value: "discount" },
  { label: "Cupón", value: "coupon" },
];

const actionOptions: Array<{ label: string; value: CatalogPromotionActionType }> = [
  { label: "Sin acción", value: "none" },
  { label: "Guardar beneficio", value: "claim" },
  { label: "Abrir producto", value: "product" },
  { label: "Enlace interno", value: "internal_link" },
  { label: "Enlace externo", value: "external_link" },
];

function getInitialForm(userId: string | null = null): PromotionForm {
  return {
    action_label: null,
    action_type: "none",
    action_url: null,
    benefit_type: null,
    benefit_value: null,
    body: null,
    created_by: userId,
    ends_at: "",
    image_path: null,
    image_url: null,
    is_active: false,
    kind: "message",
    max_claims: null,
    minimum_order_amount: null,
    product_id: null,
    sort_order: 0,
    starts_at: "",
    title: "",
  };
}

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 16);
}

function toPromotionForm(promotion: CatalogPromotion): PromotionForm {
  return {
    action_label: promotion.action_label,
    action_type: promotion.action_type,
    action_url: promotion.action_url,
    benefit_type: promotion.benefit_type,
    benefit_value: promotion.benefit_value,
    body: promotion.body,
    created_by: promotion.created_by,
    ends_at: toDateTimeLocal(promotion.ends_at),
    image_path: promotion.image_path,
    image_url: promotion.image_url,
    is_active: promotion.is_active,
    kind: promotion.kind,
    max_claims: promotion.max_claims,
    minimum_order_amount: promotion.minimum_order_amount,
    product_id: promotion.product_id,
    sort_order: promotion.sort_order,
    starts_at: toDateTimeLocal(promotion.starts_at),
    title: promotion.title,
  };
}

function buildInput(form: PromotionForm, userId: string | null): CatalogPromotionInput {
  return {
    ...form,
    action_label: form.action_label?.trim() || null,
    action_url: form.action_url?.trim() || null,
    body: form.body?.trim() || null,
    created_by: form.created_by ?? userId,
    ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
    title: form.title.trim(),
  };
}

function getStatusLabel(promotion: CatalogPromotion) {
  if (!promotion.is_active) return "Inactiva";
  const now = Date.now();
  if (promotion.starts_at && new Date(promotion.starts_at).getTime() > now) return "Programada";
  if (promotion.ends_at && new Date(promotion.ends_at).getTime() <= now) return "Finalizada";
  return "Visible";
}

export function AdminCatalogPromotionsPage() {
  const { user } = useAuth();
  const promotionsQuery = useAdminCatalogPromotions();
  const productsQuery = useCatalogPromotionProductOptions();
  const saveMutation = useSaveCatalogPromotion();
  const deleteMutation = useDeleteCatalogPromotion();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PromotionForm>(() => getInitialForm(user?.id ?? null));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const promotions = promotionsQuery.data ?? [];
  const products = useMemo(
    () => (productsQuery.data ?? []).filter((product) => product.is_active),
    [productsQuery.data],
  );
  const isSaving = saveMutation.isPending;

  const resetForm = () => {
    setEditingId(null);
    setForm(getInitialForm(user?.id ?? null));
    setImageFile(null);
    setErrorMessage(null);
  };

  const updateForm = <TKey extends keyof PromotionForm>(key: TKey, value: PromotionForm[TKey]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrorMessage(null);
    setFeedback(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setErrorMessage(null);

    let input = buildInput(form, user?.id ?? null);
    const validationErrors = validateCatalogPromotionInput(input);
    if (validationErrors.length > 0) {
      setErrorMessage(validationErrors.join(" "));
      return;
    }

    let uploadedImage: { path: string; publicUrl: string } | null = null;
    try {
      if (imageFile) {
        const uploadResponse = await uploadCatalogPromotionImage(imageFile);
        if (uploadResponse.error || !uploadResponse.data) {
          throw new Error(uploadResponse.error?.message ?? "No pudimos subir la imagen.");
        }
        uploadedImage = uploadResponse.data;
        input = {
          ...input,
          image_path: uploadedImage.path,
          image_url: uploadedImage.publicUrl,
        };
      }

      await saveMutation.mutateAsync({ id: editingId, input });

      if (uploadedImage && form.image_path && form.image_path !== uploadedImage.path) {
        await removeCatalogPromotionImage(form.image_path);
      }

      resetForm();
      setFeedback(editingId ? "Promoción actualizada." : "Promoción creada.");
    } catch (error) {
      if (uploadedImage) await removeCatalogPromotionImage(uploadedImage.path);
      setErrorMessage(error instanceof Error ? error.message : "No pudimos guardar la promoción.");
    }
  };

  const startEditing = (promotion: CatalogPromotion) => {
    setEditingId(promotion.id);
    setForm(toPromotionForm(promotion));
    setImageFile(null);
    setFeedback(null);
    setErrorMessage(null);
    window.scrollTo({ behavior: "smooth", top: 0 });
  };

  const handleDelete = async (promotion: CatalogPromotion) => {
    if (!window.confirm(`¿Eliminar la promoción “${promotion.title}”?`)) return;

    setFeedback(null);
    setErrorMessage(null);
    try {
      await deleteMutation.mutateAsync(promotion.id);
      if (promotion.image_path) await removeCatalogPromotionImage(promotion.image_path);
      if (editingId === promotion.id) resetForm();
      setFeedback("Promoción eliminada.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No pudimos eliminar la promoción.");
    }
  };

  return (
    <PagePlaceholder
      badge="Catálogo"
      description="Administrá el carrusel promocional que ocupa el espacio inferior derecho de Explorar en desktop. La ubicación móvil se definirá en otra etapa."
      title="Promociones del catálogo"
    >
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <form
          className="grid gap-5 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
              {editingId ? "Editando" : "Nueva promoción"}
            </p>
            <h2 className="mt-1 font-display text-xl font-bold text-stone-950">
              Contenido y comportamiento
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
              Tipo
              <select
                className={fieldClassName}
                onChange={(event) => updateForm("kind", event.target.value as CatalogPromotionKind)}
                value={form.kind}
              >
                {kindOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
              Acción
              <select
                className={fieldClassName}
                onChange={(event) => updateForm("action_type", event.target.value as CatalogPromotionActionType)}
                value={form.action_type}
              >
                {actionOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
            Título
            <input
              className={fieldClassName}
              maxLength={100}
              onChange={(event) => updateForm("title", event.target.value)}
              placeholder="Ej. 15% en accesorios seleccionados"
              value={form.title}
            />
          </label>

          <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
            Mensaje
            <textarea
              className={textAreaClassName}
              maxLength={240}
              onChange={(event) => updateForm("body", event.target.value || null)}
              placeholder="Texto breve que aparecerá dentro del banner."
              value={form.body ?? ""}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
              Producto asociado
              <select
                className={fieldClassName}
                onChange={(event) => updateForm("product_id", event.target.value || null)}
                value={form.product_id ?? ""}
              >
                <option value="">Ninguno</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.title}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
              Orden
              <input
                className={fieldClassName}
                min={0}
                onChange={(event) => updateForm("sort_order", Number(event.target.value))}
                type="number"
                value={form.sort_order}
              />
            </label>
          </div>

          {(form.action_type === "internal_link" || form.action_type === "external_link") ? (
            <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
              Enlace
              <input
                className={fieldClassName}
                onChange={(event) => updateForm("action_url", event.target.value || null)}
                placeholder={form.action_type === "internal_link" ? "/catalogo?categoria=..." : "https://..."}
                value={form.action_url ?? ""}
              />
            </label>
          ) : null}

          {form.action_type !== "none" ? (
            <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
              Texto del botón
              <input
                className={fieldClassName}
                maxLength={40}
                onChange={(event) => updateForm("action_label", event.target.value || null)}
                placeholder="Se usa un texto automático si queda vacío"
                value={form.action_label ?? ""}
              />
            </label>
          ) : null}

          {form.action_type === "claim" ? (
            <div className="grid gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
                Beneficio
                <select
                  className={fieldClassName}
                  onChange={(event) => updateForm("benefit_type", event.target.value as CatalogPromotionBenefitType)}
                  value={form.benefit_type ?? ""}
                >
                  <option value="">Seleccionar</option>
                  <option value="percentage">Porcentaje</option>
                  <option value="fixed_amount">Monto fijo</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
                Valor
                <input className={fieldClassName} min="0.01" onChange={(event) => updateForm("benefit_value", event.target.value ? Number(event.target.value) : null)} step="0.01" type="number" value={form.benefit_value ?? ""} />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
                Compra mínima
                <input className={fieldClassName} min="0" onChange={(event) => updateForm("minimum_order_amount", event.target.value ? Number(event.target.value) : null)} step="0.01" type="number" value={form.minimum_order_amount ?? ""} />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
                Límite total de reclamos
                <input className={fieldClassName} min="1" onChange={(event) => updateForm("max_claims", event.target.value ? Number(event.target.value) : null)} type="number" value={form.max_claims ?? ""} />
              </label>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
              Inicio opcional
              <input className={fieldClassName} onChange={(event) => updateForm("starts_at", event.target.value)} type="datetime-local" value={form.starts_at} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
              Finalización opcional
              <input className={fieldClassName} onChange={(event) => updateForm("ends_at", event.target.value)} type="datetime-local" value={form.ends_at} />
            </label>
          </div>

          <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
            Imagen opcional
            <input
              accept="image/avif,image/jpeg,image/png,image/webp"
              className="block w-full rounded-xl border border-dashed border-stone-300 bg-stone-50 p-3 text-sm"
              onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
              type="file"
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-700">
            <input checked={form.is_active} className="h-4 w-4 accent-brand-600" onChange={(event) => updateForm("is_active", event.target.checked)} type="checkbox" />
            Publicar respetando las fechas programadas
          </label>

          {errorMessage ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p> : null}
          {feedback ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{feedback}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button className="h-11 rounded-xl bg-brand-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60" disabled={isSaving} type="submit">
              {isSaving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear promoción"}
            </button>
            {editingId ? <button className="h-11 rounded-xl border border-stone-300 bg-white px-5 text-sm font-bold text-stone-700" onClick={resetForm} type="button">Cancelar</button> : null}
          </div>
        </form>

        <section className="grid gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">Carrusel desktop</p>
            <h2 className="mt-1 font-display text-xl font-bold text-stone-950">Contenido configurado</h2>
          </div>

          {promotionsQuery.isLoading ? <div className="h-36 animate-pulse rounded-2xl bg-stone-100" /> : null}
          {promotionsQuery.error ? <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{promotionsQuery.error.message}</p> : null}
          {!promotionsQuery.isLoading && promotions.length === 0 ? <p className="rounded-2xl border border-dashed border-stone-300 bg-white p-5 text-sm text-stone-600">Todavía no hay promociones. Creá la primera desde el formulario.</p> : null}

          {promotions.map((promotion) => (
            <article className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-[6rem_minmax(0,1fr)_auto]" key={promotion.id}>
              <div className="flex h-20 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-100 to-ocean-100 text-xs font-bold text-brand-700">
                {promotion.image_url ? <img alt="" className="h-full w-full object-cover" src={promotion.image_url} /> : promotion.kind.toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-bold text-stone-950">{promotion.title}</h3>
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold uppercase text-stone-600">{getStatusLabel(promotion)}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm leading-5 text-stone-600">{promotion.body || "Sin descripción"}</p>
                <p className="mt-2 text-xs text-stone-400">Orden {promotion.sort_order} · {promotion.kind} · {promotion.action_type}</p>
              </div>
              <div className="flex gap-2 sm:flex-col">
                <button className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-bold text-stone-700" onClick={() => startEditing(promotion)} type="button">Editar</button>
                <button className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50" disabled={deleteMutation.isPending} onClick={() => void handleDelete(promotion)} type="button">Eliminar</button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </PagePlaceholder>
  );
}

import type { FormEvent } from "react";

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { PagePlaceholder } from "../components/PagePlaceholder";
import { SkeletonBlock } from "../components/SkeletonBlock";
import {
  useEditableArtisanProduct,
  useQuickUpdateArtisanProduct,
} from "../features/artisan/artisanQueries";
import { useAuth } from "../features/auth/useAuth";

type FormState = {
  description: string;
  price: string;
  stock: string;
  title: string;
};

const emptyForm: FormState = {
  description: "",
  price: "",
  stock: "",
  title: "",
};

function normalizeNumber(value: string) {
  const normalizedValue = value.replace(",", ".").trim();
  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function normalizeStock(value: string) {
  const parsedValue = Number(value.trim());

  return Number.isInteger(parsedValue) ? parsedValue : null;
}

export function ProductQuickEditPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { profile, role } = useAuth();
  const productQuery = useEditableArtisanProduct(productId, Boolean(productId));
  const product = productQuery.data ?? null;
  const canEdit = Boolean(
    product && (role === "admin" || (role === "artisan" && profile?.id === product.artisan_id)),
  );
  const isStockProduct = product?.availability_mode === "stock";
  const mutation = useQuickUpdateArtisanProduct(product?.artisan_id);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!product) {
      return;
    }

    setForm({
      description: product.description ?? "",
      price: String(product.price ?? ""),
      stock: product.stock_quantity === null ? "" : String(product.stock_quantity),
      title: product.title ?? "",
    });
  }, [product]);

  const previewPrice = useMemo(() => {
    const value = normalizeNumber(form.price);

    return value === null ? "" : `$${value.toLocaleString("es-AR")}`;
  }, [form.price]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!product || !canEdit) {
      return;
    }

    const title = form.title.trim();
    const description = form.description.trim();
    const price = normalizeNumber(form.price);
    const stock = isStockProduct ? normalizeStock(form.stock) : null;

    if (title.length < 2) {
      setErrorMessage("El titulo es demasiado corto.");
      return;
    }

    if (description.length < 4) {
      setErrorMessage("La descripcion es demasiado corta.");
      return;
    }

    if (price === null || price <= 0) {
      setErrorMessage("Revisa el precio.");
      return;
    }

    if (isStockProduct && (stock === null || stock < 0)) {
      setErrorMessage("Revisa el stock.");
      return;
    }

    setErrorMessage(null);

    try {
      const updatedProduct = await mutation.mutateAsync({
        input: {
          description,
          price,
          stock_quantity: isStockProduct ? stock : null,
          title,
        },
        productId: product.id,
      });

      navigate(`/producto/${updatedProduct.id}`, { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No pudimos guardar los cambios.");
    }
  };

  if (productQuery.isLoading) {
    return (
      <PagePlaceholder badge="Producto" description="" title="Edicion rapida">
        <div className="grid gap-4">
          <SkeletonBlock className="h-12 w-full rounded-2xl" />
          <SkeletonBlock className="h-32 w-full rounded-2xl" />
          <SkeletonBlock className="h-12 w-full rounded-2xl" />
        </div>
      </PagePlaceholder>
    );
  }

  if (productQuery.error || !product) {
    return (
      <PagePlaceholder
        badge="Producto"
        description={productQuery.error?.message ?? "No encontramos el producto."}
        title="No disponible"
      />
    );
  }

  if (!canEdit) {
    return (
      <PagePlaceholder
        badge="Producto"
        description="Esta cuenta no tiene acceso a la edicion de este producto."
        title="Sin acceso"
      />
    );
  }

  return (
    <PagePlaceholder
      actions={
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
          to={`/producto/${product.id}`}
        >
          Volver
        </Link>
      }
      badge="Producto"
      description=""
      title="Edicion rapida"
    >
      <form
        className="mx-auto grid max-w-2xl gap-4 rounded-3xl border border-stone-200 bg-stone-50/70 p-4 sm:p-5"
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        {errorMessage ? (
          <p className="rounded-2xl border border-brand-500 bg-brand-100 px-4 py-3 text-sm font-semibold text-brand-500">
            {errorMessage}
          </p>
        ) : null}

        <label className="grid gap-2 text-sm font-semibold text-stone-700">
          Titulo
          <input
            className="min-h-12 rounded-2xl border border-stone-300 bg-white px-4 text-base font-semibold text-white outline-none transition focus:border-brand-300"
            maxLength={120}
            onChange={(event) => {
              setForm((currentValue) => ({ ...currentValue, title: event.target.value }));
            }}
            value={form.title}
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-stone-700">
          Descripcion
          <textarea
            className="min-h-32 resize-y rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm leading-6 text-stone-900 outline-none transition focus:border-brand-300"
            maxLength={1200}
            onChange={(event) => {
              setForm((currentValue) => ({ ...currentValue, description: event.target.value }));
            }}
            value={form.description}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-stone-700">
            Precio
            <input
              className="min-h-12 rounded-2xl border border-stone-300 bg-white px-4 text-base font-semibold text-white outline-none transition focus:border-brand-300"
              inputMode="decimal"
              onChange={(event) => {
                setForm((currentValue) => ({ ...currentValue, price: event.target.value }));
              }}
              value={form.price}
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-stone-700">
            Stock
            <input
              className="min-h-12 rounded-2xl border border-stone-300 bg-white px-4 text-base font-semibold text-white outline-none transition disabled:bg-stone-100 disabled:text-stone-400 focus:border-brand-300"
              disabled={!isStockProduct}
              inputMode="numeric"
              min={0}
              onChange={(event) => {
                setForm((currentValue) => ({ ...currentValue, stock: event.target.value }));
              }}
              type="number"
              value={isStockProduct ? form.stock : ""}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white bg-white/80 px-4 py-3">
          <span className="text-sm font-semibold text-stone-500">
            {previewPrice || "Sin precio"}
          </span>
          <button
            className="inline-flex min-h-11 min-w-36 items-center justify-center rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={mutation.isPending}
            type="submit"
          >
            {mutation.isPending ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </PagePlaceholder>
  );
}

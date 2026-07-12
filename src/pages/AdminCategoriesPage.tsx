import type { FormEvent } from "react";

import { useMemo, useState } from "react";

import { PagePlaceholder } from "../components/PagePlaceholder";
import type { FieldErrors } from "../lib/forms/validation";
import {
  useAdminCategories,
  useCreateAdminCategory,
  useUpdateAdminCategory,
} from "../features/admin/adminQueries";
import {
  AdminCategoryFormSection,
  type AdminCategoryFormErrors,
  type AdminCategoryFormField,
} from "../features/admin/components/AdminCategoryFormSection";
import { AdminCategoryListSection } from "../features/admin/components/AdminCategoryListSection";
import type { AdminCategory, AdminCategoryInput } from "../types/admin";

const initialCategoryForm: AdminCategoryInput = {
  is_active: true,
  name: "",
  slug: "",
};

function generateCategorySku(
  name: string,
  categories: AdminCategory[],
  currentCategoryId?: string | null,
) {
  const normalizedName = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase();

  const prefix = (normalizedName.slice(0, 2) || "CA").padEnd(2, "X");

  const usedNumbers = categories
    .filter((category) => category.id !== currentCategoryId)
    .map((category) => category.slug.toUpperCase())
    .filter((sku) => sku.startsWith(prefix))
    .map((sku) => Number(sku.slice(2)))
    .filter((value) => Number.isInteger(value) && value > 0);

  const nextNumber = (usedNumbers.length > 0 ? Math.max(...usedNumbers) : 0) + 1;

  return `${prefix}${String(nextNumber).padStart(3, "0")}`;
}

function validateCategoryField(
  field: AdminCategoryFormField,
  values: AdminCategoryInput,
) {
  if (field === "name") {
    if (!values.name.trim()) {
      return "Ingresa un nombre para la categoria.";
    }

    if (values.name.trim().length < 2) {
      return "El nombre debe tener al menos 2 caracteres.";
    }
  }

  if (field === "slug") {
    if (!values.slug.trim()) {
      return "El SKU es obligatorio.";
    }

    if (!/^[A-Z]{2}\d{3}$/.test(values.slug.trim().toUpperCase())) {
      return "El SKU debe tener formato XX000.";
    }
  }

  return undefined;
}

function buildCategoryErrors(values: AdminCategoryInput): AdminCategoryFormErrors {
  const errors: FieldErrors<AdminCategoryFormField> = {};

  (["name", "slug"] as const).forEach((field) => {
    const error = validateCategoryField(field, values);

    if (error) {
      errors[field] = error;
    }
  });

  return errors;
}

export function AdminCategoriesPage() {
  const [categoryForm, setCategoryForm] =
    useState<AdminCategoryInput>(initialCategoryForm);
  const [search, setSearch] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AdminCategoryFormErrors>({});

  // Fetching: React Query maneja loading, error y cache automáticamente.
  const categoriesQuery = useAdminCategories();
  // Memoizar para evitar nueva ref de [] en cada render cuando data es undefined.
  // Sin esto, el useMemo de filteredCategories se invalidaría en cada render.
  const categories = useMemo(
    () => categoriesQuery.data ?? [],
    [categoriesQuery.data],
  );
  const isLoading = categoriesQuery.isLoading;
  // Errores de carga inicial (red, RLS, etc.). Independientes de los del save.
  const loadErrorMessage = categoriesQuery.error?.message ?? null;

  // Mutations: invalidan automáticamente la query de categorías al éxito.
  const createCategoryMutation = useCreateAdminCategory();
  const updateCategoryMutation = useUpdateAdminCategory();
  const isSaving = createCategoryMutation.isPending || updateCategoryMutation.isPending;

  // Mensaje de error visible en el form: prioriza error de save, luego de carga.
  const errorMessage = saveErrorMessage ?? loadErrorMessage;

  const resetForm = () => {
    setEditingCategoryId(null);
    setCategoryForm(initialCategoryForm);
    setStatusMessage(null);
    setSaveErrorMessage(null);
    setFieldErrors({});
  };

  const updateFieldError = (field: AdminCategoryFormField, nextError?: string) => {
    setFieldErrors((currentValue) => {
      const nextValue = { ...currentValue };

      if (nextError) {
        nextValue[field] = nextError;
      } else {
        delete nextValue[field];
      }

      return nextValue;
    });
  };

  const updateCategoryName = (nextName: string) => {
    const nextForm = {
      ...categoryForm,
      name: nextName,
      slug: generateCategorySku(nextName, categories, editingCategoryId),
    };

    setCategoryForm(nextForm);
    setSaveErrorMessage(null);
    setStatusMessage(null);

    if (fieldErrors.name) {
      updateFieldError("name", validateCategoryField("name", nextForm));
    }

    if (fieldErrors.slug) {
      updateFieldError("slug", validateCategoryField("slug", nextForm));
    }
  };

  const regenerateSku = () => {
    const nextForm = {
      ...categoryForm,
      slug: generateCategorySku(categoryForm.name, categories, editingCategoryId),
    };

    setCategoryForm(nextForm);

    if (fieldErrors.slug) {
      updateFieldError("slug", validateCategoryField("slug", nextForm));
    }
  };

  const handleFieldBlur = (field: AdminCategoryFormField) => {
    updateFieldError(field, validateCategoryField(field, categoryForm));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage(null);
    setSaveErrorMessage(null);

    const nextErrors = buildCategoryErrors(categoryForm);
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const wasEditing = Boolean(editingCategoryId);

    try {
      if (editingCategoryId) {
        await updateCategoryMutation.mutateAsync({
          categoryId: editingCategoryId,
          input: categoryForm,
        });
      } else {
        await createCategoryMutation.mutateAsync(categoryForm);
      }
    } catch (error) {
      setSaveErrorMessage(
        error instanceof Error
          ? error.message
          : "No pudimos guardar la categoría.",
      );
      return;
    }

    // Éxito: el invalidate de la mutation ya disparó el refetch en background.
    resetForm();
    setStatusMessage(
      wasEditing
        ? "Categoria actualizada correctamente."
        : "Categoria creada correctamente.",
    );
  };

  const startEditing = (category: AdminCategory) => {
    setEditingCategoryId(category.id);
    setCategoryForm({
      is_active: category.is_active,
      name: category.name,
      slug: category.slug,
    });
    setStatusMessage(null);
    setSaveErrorMessage(null);
    setFieldErrors({});
  };

  const filteredCategories = useMemo(() => {
    const normalizedSearch = search
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

    if (!normalizedSearch) {
      return categories;
    }

    return categories.filter((category) =>
      [category.name, category.slug]
        .filter(Boolean)
        .join(" ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [categories, search]);

  return (
    <PagePlaceholder
      badge="Categorias"
      description="Crea y administra las categorias que luego podran usar los vendedores al cargar productos."
      title="Gestion de categorias"
    >
      <div className="grid items-start gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <form
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <AdminCategoryFormSection
            categoryForm={categoryForm}
            editingCategoryId={editingCategoryId}
            errorMessage={errorMessage}
            fieldErrors={fieldErrors}
            isSaving={isSaving}
            onCancel={resetForm}
            onFieldBlur={handleFieldBlur}
            onNameChange={updateCategoryName}
            onRegenerateSku={regenerateSku}
            onToggleActive={(value) => {
              setCategoryForm((currentValue) => ({
                ...currentValue,
                is_active: value,
              }));
            }}
            statusMessage={statusMessage}
          />
        </form>

        <AdminCategoryListSection
          categories={filteredCategories}
          isLoading={isLoading}
          onEdit={startEditing}
          onSearchChange={setSearch}
          searchValue={search}
          totalCount={categories.length}
        />
      </div>
    </PagePlaceholder>
  );
}

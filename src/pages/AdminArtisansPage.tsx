import type { FormEvent } from "react";
import type {
  AdminArtisanProfile,
  AdminArtisanProfileInput,
  AdminArtisanProfileUpdateInput,
} from "../types/admin";

import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { ConfirmModal } from "../components/ConfirmModal";
import { PagePlaceholder } from "../components/PagePlaceholder";
import { SectionModeTabs } from "../components/SectionModeTabs";
import { getErrorMessage } from "../lib/errors";
import {
  loadProductDraft,
  removeProductDraft,
  saveProductDraft,
} from "../lib/browser/productDraftStorage";
import { isValidEmail, type FieldErrors } from "../lib/forms/validation";
import {
  useAdminArtisanProfiles,
  useCreateAdminArtisanProfile,
  useDeleteAdminArtisanProfile,
  useUpdateAdminArtisanProfile,
} from "../features/admin/adminQueries";
import {
  AdminArtisanFormSection,
  type AdminArtisanFormErrors,
  type AdminArtisanFormField,
} from "../features/admin/components/AdminArtisanFormSection";
import { AdminArtisanListSection } from "../features/admin/components/AdminArtisanListSection";
import { AdminArtisanProfileImageSection } from "../features/admin/components/AdminArtisanProfileImageSection";
import {
  removeArtisanProfileImages,
  uploadArtisanProfileImage,
} from "../features/artisan/artisanClient";

const initialArtisanForm: AdminArtisanProfileInput = {
  email: "",
  full_name: "",
  password: "Admindeventa",
  profile_image_url: "",
  store_description: "",
  store_name: "",
  storefront_theme_color: "#0f766e",
};

const ADMIN_ARTISAN_CREATE_DRAFT_KEY = "admin_artisan_profile_draft:create";
const ADMIN_ARTISAN_EDIT_DRAFT_KEY = "admin_artisan_profile_draft:edit";

type AdminArtisanMode = "create" | "edit";

type PersistedAdminArtisanDraft = {
  editingArtisanId: string | null;
  form: AdminArtisanProfileUpdateInput;
  selectedProfileImage:
    | {
        fileBlob: Blob;
        fileLastModified: number;
        fileName: string;
        fileType: string;
      }
    | null;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hasMeaningfulAdminArtisanDraft(
  values: AdminArtisanProfileUpdateInput,
  selectedProfileImage: File | null,
  editingArtisanId: string | null,
) {
  const password = values.password?.trim() ?? "";
  const hasMeaningfulPassword = editingArtisanId
    ? password.length > 0
    : password.length > 0 && password !== initialArtisanForm.password;

  return (
    values.full_name.trim().length > 0 ||
    values.email.trim().length > 0 ||
    values.store_name.trim().length > 0 ||
    values.store_description.trim().length > 0 ||
    values.profile_image_url.trim().length > 0 ||
    hasMeaningfulPassword ||
    selectedProfileImage !== null
  );
}

function validateAdminArtisanField(
  field: AdminArtisanFormField,
  values: AdminArtisanProfileUpdateInput,
  isEditing: boolean,
) {
  if (field === "full_name" && values.full_name.trim().length < 2) {
    return "Ingresa un nombre valido.";
  }

  if (field === "email") {
    if (!values.email.trim()) {
      return "Ingresa un mail.";
    }

    if (!isValidEmail(values.email)) {
      return "Ingresa un mail valido.";
    }
  }

  if (field === "password") {
    const password = values.password?.trim() ?? "";

    if (!isEditing && !password) {
      return "La contrasena inicial es obligatoria.";
    }

    if (password && password.length < 8) {
      return "La contrasena debe tener al menos 8 caracteres.";
    }
  }

  if (field === "store_description" && values.store_description.trim().length > 280) {
    return "La descripcion debe tener como maximo 280 caracteres.";
  }

  return undefined;
}

function buildAdminArtisanErrors(
  values: AdminArtisanProfileUpdateInput,
  isEditing: boolean,
): AdminArtisanFormErrors {
  const errors: FieldErrors<AdminArtisanFormField> = {};

  (["full_name", "email", "password", "store_name", "store_description"] as const).forEach(
    (field) => {
      const error = validateAdminArtisanField(field, values, isEditing);

      if (error) {
        errors[field] = error;
      }
    },
  );

  return errors;
}

export function AdminArtisansPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [artisanForm, setArtisanForm] = useState<AdminArtisanProfileUpdateInput>(initialArtisanForm);
  const [editingArtisanId, setEditingArtisanId] = useState<string | null>(null);
  const [pendingDeleteArtisan, setPendingDeleteArtisan] = useState<AdminArtisanProfile | null>(null);
  const [search, setSearch] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [imageErrorMessage, setImageErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AdminArtisanFormErrors>({});
  const [selectedProfileImage, setSelectedProfileImage] = useState<File | null>(null);
  const [selectedProfileImagePreviewUrl, setSelectedProfileImagePreviewUrl] =
    useState<string | null>(null);
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);
  const mode: AdminArtisanMode = searchParams.get("mode") === "edit" ? "edit" : "create";
  const activeDraftKey =
    mode === "edit" ? ADMIN_ARTISAN_EDIT_DRAFT_KEY : ADMIN_ARTISAN_CREATE_DRAFT_KEY;

  // Fetching de vendedores: cache + revalidación automática.
  const artisansQuery = useAdminArtisanProfiles();
  // Memoizar para mantener referencia estable mientras `data` no cambie.
  const artisans = useMemo(() => artisansQuery.data ?? [], [artisansQuery.data]);
  const isLoading = artisansQuery.isLoading;
  const loadErrorMessage = artisansQuery.error?.message ?? null;

  // Mutations: cada éxito invalida la lista de vendedores.
  const createArtisanMutation = useCreateAdminArtisanProfile();
  const updateArtisanMutation = useUpdateAdminArtisanProfile();
  const deleteArtisanMutation = useDeleteAdminArtisanProfile();
  const isSaving =
    createArtisanMutation.isPending || updateArtisanMutation.isPending;

  // Error visible en el panel: prioriza error de save, después de carga.
  const errorMessage = saveErrorMessage ?? loadErrorMessage;

  useEffect(() => {
    let isMounted = true;

    const hydrateDraft = async () => {
      try {
        const draft = await loadProductDraft<PersistedAdminArtisanDraft>(activeDraftKey);

        if (!isMounted || !draft) {
          setIsDraftHydrated(true);
          return;
        }

        const restoredSelectedImage = draft.selectedProfileImage
          ? new File([draft.selectedProfileImage.fileBlob], draft.selectedProfileImage.fileName, {
              lastModified: draft.selectedProfileImage.fileLastModified,
              type: draft.selectedProfileImage.fileType,
            })
          : null;

        const hasContent = hasMeaningfulAdminArtisanDraft(
          draft.form,
          restoredSelectedImage,
          draft.editingArtisanId ?? null,
        );

        if (!hasContent) {
          await removeProductDraft(activeDraftKey);
          if (isMounted) {
            setIsDraftHydrated(true);
          }
          return;
        }

        setEditingArtisanId(draft.editingArtisanId ?? null);
        setArtisanForm({
          ...initialArtisanForm,
          ...draft.form,
        });

        if (mode === "create" && draft.editingArtisanId) {
          const nextSearchParams = new URLSearchParams(searchParams);
          nextSearchParams.set("mode", "edit");
          setSearchParams(nextSearchParams, { replace: true });
        }

        if (restoredSelectedImage) {
          setSelectedProfileImage(restoredSelectedImage);
          setSelectedProfileImagePreviewUrl(URL.createObjectURL(restoredSelectedImage));
        }
      } catch {
        await removeProductDraft(activeDraftKey).catch(() => undefined);
      } finally {
        if (isMounted) {
          setIsDraftHydrated(true);
        }
      }
    };

    void hydrateDraft();

    return () => {
      isMounted = false;
    };
  }, [activeDraftKey, mode, searchParams, setSearchParams]);

  useEffect(() => {
    return () => {
      if (selectedProfileImagePreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(selectedProfileImagePreviewUrl);
      }
    };
  }, [selectedProfileImagePreviewUrl]);

  useEffect(() => {
    if (!isDraftHydrated) {
      return;
    }

    const hasContent = hasMeaningfulAdminArtisanDraft(
      artisanForm,
      selectedProfileImage,
      editingArtisanId,
    );

    if (!hasContent) {
      void removeProductDraft(activeDraftKey);
      return;
    }

    void saveProductDraft(activeDraftKey, {
        editingArtisanId,
        form: artisanForm,
        selectedProfileImage: selectedProfileImage
          ? {
              fileBlob: selectedProfileImage,
              fileLastModified: selectedProfileImage.lastModified,
              fileName: selectedProfileImage.name,
              fileType: selectedProfileImage.type,
            }
          : null,
      } satisfies PersistedAdminArtisanDraft);
  }, [activeDraftKey, artisanForm, editingArtisanId, isDraftHydrated, selectedProfileImage]);

  const updateFieldError = (field: AdminArtisanFormField, nextError?: string) => {
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

  const clearSelectedImage = () => {
    if (selectedProfileImagePreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(selectedProfileImagePreviewUrl);
    }

    setSelectedProfileImage(null);
    setSelectedProfileImagePreviewUrl(null);
    setImageErrorMessage(null);
  };

  const resetForm = () => {
    clearSelectedImage();
    setEditingArtisanId(null);
    setArtisanForm(initialArtisanForm);
    setSaveErrorMessage(null);
    setImageErrorMessage(null);
    setStatusMessage(null);
    setFieldErrors({});
    void Promise.all([
      removeProductDraft(ADMIN_ARTISAN_CREATE_DRAFT_KEY),
      removeProductDraft(ADMIN_ARTISAN_EDIT_DRAFT_KEY),
    ]);
  };

  const setMode = (nextMode: AdminArtisanMode) => {
    const nextSearchParams = new URLSearchParams(searchParams);

    if (nextMode === "create") {
      nextSearchParams.delete("mode");
      void removeProductDraft(ADMIN_ARTISAN_EDIT_DRAFT_KEY);
      setEditingArtisanId(null);
      setArtisanForm((currentValue) =>
        !editingArtisanId && hasMeaningfulAdminArtisanDraft(currentValue, selectedProfileImage, null)
          ? currentValue
          : initialArtisanForm,
      );
    } else {
      nextSearchParams.set("mode", "edit");
      void removeProductDraft(ADMIN_ARTISAN_CREATE_DRAFT_KEY);
    }

    clearSelectedImage();
    setStatusMessage(null);
    setSaveErrorMessage(null);
    setFieldErrors({});
    setSearchParams(nextSearchParams, { replace: true });
  };

  const handleChange = <TKey extends keyof AdminArtisanProfileUpdateInput>(
    field: TKey,
    value: AdminArtisanProfileUpdateInput[TKey],
  ) => {
    setArtisanForm((currentValue) => ({
      ...currentValue,
      [field]: value,
    }));
    setSaveErrorMessage(null);
    setStatusMessage(null);

    if (
      field === "full_name" ||
      field === "email" ||
      field === "password" ||
      field === "store_name" ||
      field === "store_description"
    ) {
      const fieldName = field as AdminArtisanFormField;

      if (fieldErrors[fieldName]) {
        const nextForm = {
          ...artisanForm,
          [field]: value,
        };

        updateFieldError(
          fieldName,
          validateAdminArtisanField(fieldName, nextForm, Boolean(editingArtisanId)),
        );
      }
    }
  };

  const handleFieldBlur = (field: AdminArtisanFormField) => {
    updateFieldError(
      field,
      validateAdminArtisanField(field, artisanForm, Boolean(editingArtisanId)),
    );
  };

  const handleSelectProfileImage = (file: File | null) => {
    setImageErrorMessage(null);

    if (!file) {
      clearSelectedImage();
      return;
    }

    const allowedTypes = new Set(["image/jpeg", "image/png"]);

    if (!allowedTypes.has(file.type)) {
      setImageErrorMessage("La foto debe ser JPG o PNG.");
      return;
    }

    clearSelectedImage();
    setSelectedProfileImage(file);
    setSelectedProfileImagePreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage(null);
    setSaveErrorMessage(null);
    setImageErrorMessage(null);

    const nextErrors = buildAdminArtisanErrors(artisanForm, Boolean(editingArtisanId));
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      const previousProfileImageUrl = artisanForm.profile_image_url.trim();
      // Save inicial — la mutation invalida la lista al éxito.
      const savedProfile = editingArtisanId
        ? await updateArtisanMutation.mutateAsync({
            artisanId: editingArtisanId,
            input: artisanForm,
          })
        : await createArtisanMutation.mutateAsync({
            email: artisanForm.email.trim(),
            full_name: artisanForm.full_name.trim(),
            password: artisanForm.password ?? "",
            profile_image_url: previousProfileImageUrl,
            store_description: artisanForm.store_description.trim(),
            store_name: artisanForm.store_name.trim(),
            storefront_theme_color: artisanForm.storefront_theme_color,
          });

      // Upload de imagen de perfil (acción secundaria, no bloquea el guardado base).
      if (selectedProfileImage) {
        const uploadResponse = await uploadArtisanProfileImage(savedProfile.id, selectedProfileImage);

        if (uploadResponse.error || !uploadResponse.data) {
          setImageErrorMessage("La cuenta se guardo, pero no pudimos subir la foto de perfil.");
        } else {
          const uploadedImageUrl = uploadResponse.data.publicUrl;
          try {
            await updateArtisanMutation.mutateAsync({
              artisanId: savedProfile.id,
              input: {
                email: artisanForm.email.trim(),
                full_name: artisanForm.full_name.trim(),
                password: "",
                profile_image_url: uploadedImageUrl,
                store_description: artisanForm.store_description.trim(),
                store_name: artisanForm.store_name.trim(),
                storefront_theme_color: artisanForm.storefront_theme_color,
              },
            });

            if (
              previousProfileImageUrl &&
              previousProfileImageUrl !== uploadedImageUrl
            ) {
              await removeArtisanProfileImages([previousProfileImageUrl]);
            }
          } catch {
            await removeArtisanProfileImages([uploadedImageUrl]);
            setImageErrorMessage("La cuenta se guardo, pero no pudimos vincular la nueva foto.");
          }
        }
      }

      const wasEditing = Boolean(editingArtisanId);
      resetForm();
      setStatusMessage(wasEditing ? "Cuenta vendedora actualizada." : "Cuenta vendedora creada.");
    } catch (error) {
      setSaveErrorMessage(
        getErrorMessage(error, "No pudimos guardar esta cuenta vendedora. Intenta de nuevo."),
      );
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteArtisan) {
      return;
    }

    setSaveErrorMessage(null);
    setStatusMessage(null);

    try {
      const result = await deleteArtisanMutation.mutateAsync(pendingDeleteArtisan.id);
      const wasEditingDeleted = editingArtisanId === pendingDeleteArtisan.id;
      setPendingDeleteArtisan(null);

      if (wasEditingDeleted) {
        resetForm();
      }

      setStatusMessage(
        result?.cleanupWarning
          ? `Cuenta vendedora eliminada. ${result.cleanupWarning}`
          : "Cuenta vendedora eliminada.",
      );
    } catch (error) {
      setPendingDeleteArtisan(null);
      setSaveErrorMessage(
        getErrorMessage(error, "No pudimos borrar esta cuenta vendedora. Intenta de nuevo."),
      );
    }
  };

  const filteredArtisans = useMemo(() => {
    const normalizedSearch = normalizeText(search.trim());

    if (!normalizedSearch) {
      return artisans;
    }

    return artisans.filter((artisan) =>
      [artisan.store_name, artisan.full_name, artisan.email]
        .filter(Boolean)
        .join(" ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [artisans, search]);

  const showCreateView = mode === "create";
  const showEditSelection = mode === "edit" && !editingArtisanId;

  return (
    <PagePlaceholder description="" hideHeader title="">
      <div className="grid gap-4">
        <section className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <SectionModeTabs
              onChange={setMode}
              options={[
                { label: "Crear", value: "create" },
                { label: "Editar", value: "edit" },
              ]}
              value={mode}
            />
            <Link
              className="inline-flex items-center justify-center rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition-all hover:border-stone-300 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-brand-300"
              to="/panel/admin/vendedores/activos"
            >
              Ver cuentas
            </Link>
          </div>
        </section>

        {showCreateView || editingArtisanId ? (
          <form
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
          >
            <AdminArtisanFormSection
              artisanForm={artisanForm}
              editingArtisanId={editingArtisanId}
              errorMessage={errorMessage}
              fieldErrors={fieldErrors}
              isSaving={isSaving}
              onCancel={() => {
                resetForm();
                if (mode === "edit") {
                  setMode("edit");
                }
              }}
              onChange={handleChange}
              onFieldBlur={handleFieldBlur}
              profileImageSection={
                <AdminArtisanProfileImageSection
                  errorMessage={imageErrorMessage}
                  hasCurrentImage={Boolean(artisanForm.profile_image_url)}
                  hasSelectedImage={Boolean(selectedProfileImage)}
                  imageUrl={selectedProfileImagePreviewUrl || artisanForm.profile_image_url || null}
                  label={artisanForm.store_name || artisanForm.full_name || "Perfil vendedor"}
                  onSelectImage={handleSelectProfileImage}
                />
              }
              statusMessage={statusMessage}
            />
          </form>
        ) : null}

        {showEditSelection ? (
          <AdminArtisanListSection
            artisans={filteredArtisans}
            isLoading={isLoading}
            onDeleteRequest={setPendingDeleteArtisan}
            onEdit={(artisan) => {
              clearSelectedImage();
              setEditingArtisanId(artisan.id);
              setArtisanForm({
                email: artisan.email,
                full_name: artisan.full_name,
                password: "",
                profile_image_url: artisan.profile_image_url ?? "",
                store_description: artisan.store_description ?? "",
                store_name: artisan.store_name ?? "",
                storefront_theme_color: artisan.storefront_theme_color ?? "#0f766e",
              });
              setStatusMessage(null);
              setSaveErrorMessage(null);
              setImageErrorMessage(null);
              setFieldErrors({});
            }}
            onSearchChange={setSearch}
            searchValue={search}
            totalCount={artisans.length}
          />
        ) : null}
      </div>

      <ConfirmModal
        confirmLabel="Si, borrar"
        isDanger
        isOpen={pendingDeleteArtisan !== null}
        message={`Vas a borrar la cuenta de ${pendingDeleteArtisan?.full_name ?? "este vendedor"}. Si tiene productos o ventas, primero tendras que vaciar ese contenido.`}
        onCancel={() => {
          setPendingDeleteArtisan(null);
        }}
        onConfirm={() => {
          void handleDelete();
        }}
        title="Borrar cuenta vendedora"
      />
    </PagePlaceholder>
  );
}

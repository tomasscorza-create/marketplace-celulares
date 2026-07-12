import type { ChangeEvent, FormEvent } from "react";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { DownloadableQr } from "@/components/DownloadableQr";
import { UserAvatar } from "@/components/UserAvatar";
import {
  useAdminArtisanMovements,
  useAdminArtisanProfile,
  useSaveAdminArtisanProfileControls,
  useUpdateAdminArtisanProfile,
} from "@/features/admin/adminQueries";
import {
  removeArtisanProfileImages,
  uploadArtisanProfileImage,
} from "@/features/artisan/artisanClient";
import { getErrorMessage } from "@/lib/errors";
import { buildPublicArtisanProfileUrl, buildUrlFileSlug } from "@/lib/publicUrls";
import { queryKeys } from "@/lib/query/queryKeys";

type AdminArtisanProfileActionsProps = {
  artisanId: string;
};

type QuickEditForm = {
  full_name: string;
  profile_image_url: string;
  store_description: string;
  store_name: string;
  storefront_theme_color: string;
};

type ActionPanel = "quick-edit" | "movements" | "boost" | "visibility" | "qr";

const emptyForm: QuickEditForm = {
  full_name: "",
  profile_image_url: "",
  store_description: "",
  store_name: "",
  storefront_theme_color: "#0f766e",
};

function normalizeFormColor(value: string | null | undefined) {
  return value?.trim() || "#0f766e";
}

function formatCurrency(value: number) {
  return `$${Number(value).toLocaleString("es-AR")}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Sin fecha";
  }

  return new Date(value).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AdminArtisanProfileActions({ artisanId }: AdminArtisanProfileActionsProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<ActionPanel>("quick-edit");
  const [form, setForm] = useState<QuickEditForm>(emptyForm);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImagePreviewUrl, setSelectedImagePreviewUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const profileQuery = useAdminArtisanProfile(artisanId);
  const movementsQuery = useAdminArtisanMovements(
    artisanId,
    isOpen && activePanel === "movements",
  );
  const updateProfileMutation = useUpdateAdminArtisanProfile();
  const controlMutation = useSaveAdminArtisanProfileControls();
  const profile = profileQuery.data ?? null;
  const isSavingQuickEdit = updateProfileMutation.isPending;
  const isSavingControl = controlMutation.isPending;
  const isBoosted = Number(profile?.storefront_boost_multiplier ?? 1) > 1;
  const isHidden = Boolean(profile?.storefront_hidden_at);
  const displayName = form.store_name.trim() || form.full_name.trim() || "Vendedor";
  const artisanProfileQrUrl = useMemo(
    () => buildPublicArtisanProfileUrl(artisanId),
    [artisanId],
  );
  const artisanProfileQrFileBaseName = useMemo(
    () => `qr-${buildUrlFileSlug(displayName)}`,
    [displayName],
  );

  useEffect(() => {
    if (!profile) {
      return;
    }

    setForm({
      full_name: profile.full_name,
      profile_image_url: profile.profile_image_url ?? "",
      store_description: profile.store_description ?? "",
      store_name: profile.store_name ?? "",
      storefront_theme_color: normalizeFormColor(profile.storefront_theme_color),
    });
    setSelectedImage(null);
    setStatusMessage(null);
    setErrorMessage(null);
  }, [profile]);

  useEffect(() => {
    return () => {
      if (selectedImagePreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(selectedImagePreviewUrl);
      }
    };
  }, [selectedImagePreviewUrl]);

  const quickEditImageUrl = selectedImagePreviewUrl || form.profile_image_url || null;

  const profileLoadMessage = useMemo(() => {
    if (profileQuery.isLoading) {
      return "Cargando perfil...";
    }

    if (profileQuery.error) {
      return profileQuery.error.message;
    }

    return null;
  }, [profileQuery.error, profileQuery.isLoading]);

  const actionTabs: Array<{
    badge?: string;
    key: ActionPanel;
    label: string;
    tone?: "danger" | "default";
  }> = [
    { key: "quick-edit", label: "Edicion rapida" },
    {
      badge: movementsQuery.data?.totalCount ? `${movementsQuery.data.totalCount}` : undefined,
      key: "movements",
      label: "Movimientos",
    },
    { badge: isBoosted ? "activo" : undefined, key: "boost", label: "Impulsar +20%" },
    { badge: isHidden ? "oculta" : undefined, key: "visibility", label: "Ocultar cuenta", tone: "danger" },
    { key: "qr", label: "Generar QR" },
  ];

  const updateField = <TKey extends keyof QuickEditForm>(field: TKey, value: QuickEditForm[TKey]) => {
    setForm((currentValue) => ({
      ...currentValue,
      [field]: value,
    }));
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const clearSelectedImage = () => {
    if (selectedImagePreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(selectedImagePreviewUrl);
    }

    setSelectedImage(null);
    setSelectedImagePreviewUrl(null);
  };

  const handleSelectImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    setStatusMessage(null);
    setErrorMessage(null);

    if (!file) {
      return;
    }

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setErrorMessage("La foto debe ser JPG o PNG.");
      return;
    }

    clearSelectedImage();
    setSelectedImage(file);
    setSelectedImagePreviewUrl(URL.createObjectURL(file));
  };

  const refreshCatalogCaches = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.public.storefront(artisanId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.public.artisanProducts(artisanId) });
    void queryClient.invalidateQueries({ queryKey: ["public", "catalog-product-feed-infinite"] });
    void queryClient.invalidateQueries({ queryKey: ["public", "catalog-storefront-groups-page"] });
    void queryClient.invalidateQueries({ queryKey: ["public", "complete-catalog-storefront-groups-page"] });
    void queryClient.invalidateQueries({ queryKey: ["public", "catalog-storefront-suggestions"] });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile) {
      setErrorMessage("No pudimos cargar el perfil vendedor.");
      return;
    }

    if (form.full_name.trim().length < 2) {
      setErrorMessage("Completa el nombre del responsable.");
      return;
    }

    if (form.store_description.trim().length > 280) {
      setErrorMessage("La descripcion debe tener como maximo 280 caracteres.");
      return;
    }

    setStatusMessage(null);
    setErrorMessage(null);

    const previousProfileImageUrl = profile.profile_image_url ?? "";
    let nextProfileImageUrl = form.profile_image_url.trim();
    let uploadedImageUrl: string | null = null;

    try {
      if (selectedImage) {
        const uploadResponse = await uploadArtisanProfileImage(artisanId, selectedImage);

        if (uploadResponse.error || !uploadResponse.data) {
          throw new Error("No pudimos subir la foto.");
        }

        nextProfileImageUrl = uploadResponse.data.publicUrl;
        uploadedImageUrl = uploadResponse.data.publicUrl;
      }

      const savedProfile = await updateProfileMutation.mutateAsync({
        artisanId,
        input: {
          email: profile.email,
          full_name: form.full_name.trim(),
          password: "",
          profile_image_url: nextProfileImageUrl,
          store_description: form.store_description.trim(),
          store_name: form.store_name.trim(),
          storefront_theme_color: normalizeFormColor(form.storefront_theme_color),
        },
      });

      if (
        uploadedImageUrl &&
        previousProfileImageUrl &&
        previousProfileImageUrl !== uploadedImageUrl
      ) {
        await removeArtisanProfileImages([previousProfileImageUrl]);
      }

      clearSelectedImage();
      setForm({
        full_name: savedProfile.full_name,
        profile_image_url: savedProfile.profile_image_url ?? "",
        store_description: savedProfile.store_description ?? "",
        store_name: savedProfile.store_name ?? "",
        storefront_theme_color: normalizeFormColor(savedProfile.storefront_theme_color),
      });
      setStatusMessage("Cambios guardados.");
      refreshCatalogCaches();
    } catch (error) {
      if (uploadedImageUrl) {
        await removeArtisanProfileImages([uploadedImageUrl]);
      }

      setErrorMessage(getErrorMessage(error, "No pudimos guardar estos cambios."));
    }
  };

  const saveControlState = async (
    nextValues: Partial<{
      storefront_boost_multiplier: number;
      storefront_boosted_at: string | null;
      storefront_hidden_at: string | null;
    }>,
    successMessage: string,
  ) => {
    if (!profile) {
      setErrorMessage("No pudimos cargar el perfil vendedor.");
      return;
    }

    setStatusMessage(null);
    setErrorMessage(null);

    try {
      await controlMutation.mutateAsync({
        artisanId,
        input: {
          storefront_boost_multiplier:
            nextValues.storefront_boost_multiplier ??
            Number(profile.storefront_boost_multiplier ?? 1),
          storefront_boosted_at:
            "storefront_boosted_at" in nextValues
              ? nextValues.storefront_boosted_at ?? null
              : profile.storefront_boosted_at ?? null,
          storefront_hidden_at:
            "storefront_hidden_at" in nextValues
              ? nextValues.storefront_hidden_at ?? null
              : profile.storefront_hidden_at ?? null,
        },
      });
      setStatusMessage(successMessage);
      refreshCatalogCaches();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "No pudimos guardar esta accion."));
    }
  };

  return (
    <div className="grid gap-3">
      <button
        className="inline-flex w-fit items-center justify-center rounded-full border border-red-700 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_34px_-22px_rgba(185,28,28,0.9)] transition-colors hover:bg-red-700"
        onClick={() => {
          setIsOpen((currentValue) => !currentValue);
        }}
        type="button"
      >
        Acciones
        <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold leading-none text-red-700">
          5
        </span>
      </button>

      {isOpen ? (
        <section className="grid gap-4 rounded-[1.5rem] border border-red-100 bg-white p-4 shadow-[0_26px_70px_-48px_rgba(127,29,29,0.75)]">
          <div className="flex flex-wrap gap-2">
            {actionTabs.map((tab) => {
              const isActive = activePanel === tab.key;
              const isDanger = tab.tone === "danger";

              return (
                <button
                  className={[
                    "inline-flex min-h-9 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors",
                    isActive && isDanger
                      ? "border-red-600 bg-red-600 text-white"
                      : isActive
                        ? "border-red-600 bg-red-600 text-white"
                        : isDanger
                          ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                          : "border-stone-200 bg-stone-50 text-stone-600 hover:bg-white",
                  ].join(" ")}
                  key={tab.key}
                  onClick={() => {
                    setActivePanel(tab.key);
                    setStatusMessage(null);
                    setErrorMessage(null);
                  }}
                  type="button"
                >
                  {tab.label}
                  {tab.badge ? (
                    <span
                      className={[
                        "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]",
                        isActive ? "bg-white text-red-700" : "bg-white text-stone-500",
                      ].join(" ")}
                    >
                      {tab.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {profileLoadMessage ? (
            <p className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-500">
              {profileLoadMessage}
            </p>
          ) : null}

          {!profileLoadMessage && activePanel === "quick-edit" ? (
            <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-3">
                <UserAvatar imageUrl={quickEditImageUrl} label={displayName} sizeClassName="h-14 w-14" />
                <label className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100">
                  Cambiar foto
                  <input
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    className="hidden"
                    onChange={handleSelectImage}
                    type="file"
                  />
                </label>
                {selectedImage ? (
                  <button
                    className="inline-flex min-h-10 items-center justify-center rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-500 transition-colors hover:bg-stone-100"
                    onClick={clearSelectedImage}
                    type="button"
                  >
                    Quitar
                  </button>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  Tienda
                  <input
                    className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
                    onChange={(event) => updateField("store_name", event.target.value)}
                    placeholder="Nombre visible"
                    type="text"
                    value={form.store_name}
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  Responsable
                  <input
                    className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
                    onChange={(event) => updateField("full_name", event.target.value)}
                    placeholder="Nombre"
                    type="text"
                    value={form.full_name}
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm font-medium text-stone-700">
                Descripcion
                <textarea
                  className="min-h-24 rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
                  onChange={(event) => updateField("store_description", event.target.value)}
                  placeholder="Descripcion breve"
                  value={form.store_description}
                />
              </label>

              <label className="grid w-fit gap-2 text-sm font-medium text-stone-700">
                Color
                <input
                  className="h-12 w-24 rounded-xl border border-stone-300 bg-white p-2"
                  onChange={(event) => updateField("storefront_theme_color", event.target.value)}
                  type="color"
                  value={form.storefront_theme_color}
                />
              </label>

              <button
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-fit"
                disabled={isSavingQuickEdit}
                type="submit"
              >
                {isSavingQuickEdit ? "Guardando..." : "Guardar cambios"}
              </button>
            </form>
          ) : null}

          {!profileLoadMessage && activePanel === "movements" ? (
            <div className="grid gap-3">
              {movementsQuery.isLoading ? (
                <p className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-500">
                  Cargando movimientos...
                </p>
              ) : movementsQuery.error ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {movementsQuery.error.message}
                </p>
              ) : movementsQuery.data?.items.length ? (
                movementsQuery.data.items.map((item) => (
                  <article
                    className="grid gap-2 rounded-2xl border border-stone-200 bg-stone-50 p-3 text-sm"
                    key={item.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-stone-900">{item.product_title}</p>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-700">
                        {formatCurrency(item.subtotal)}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500">
                      {formatDate(item.orders?.created_at ?? item.created_at)} - {item.orders?.buyer_name ?? "Comprador"} - {item.orders?.payment_status ?? "sin pago"}
                    </p>
                  </article>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-sm text-stone-500">
                  Todavia no hay movimientos para esta cuenta.
                </p>
              )}
            </div>
          ) : null}

          {!profileLoadMessage && activePanel === "boost" ? (
            <div className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <div>
                <p className="text-sm font-semibold text-stone-900">
                  {isBoosted ? "Cuenta impulsada" : "Sin impulso activo"}
                </p>
                <p className="mt-1 text-sm text-stone-500">
                  Peso actual: {Number(profile?.storefront_boost_multiplier ?? 1).toFixed(2)}x
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSavingControl || isBoosted}
                  onClick={() => {
                    void saveControlState(
                      {
                        storefront_boost_multiplier: 1.2,
                        storefront_boosted_at: new Date().toISOString(),
                      },
                      "Cuenta impulsada +20%.",
                    );
                  }}
                  type="button"
                >
                  Impulsar +20%
                </button>
                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSavingControl || !isBoosted}
                  onClick={() => {
                    void saveControlState(
                      {
                        storefront_boost_multiplier: 1,
                        storefront_boosted_at: null,
                      },
                      "Impulso quitado.",
                    );
                  }}
                  type="button"
                >
                  Quitar impulso
                </button>
              </div>
            </div>
          ) : null}

          {!profileLoadMessage && activePanel === "visibility" ? (
            <div className="grid gap-3 rounded-2xl border border-red-100 bg-red-50 p-4">
              <div>
                <p className="text-sm font-semibold text-red-900">
                  {isHidden ? "Cuenta oculta" : "Cuenta visible"}
                </p>
                <p className="mt-1 text-sm text-red-700">
                  {isHidden
                    ? "No aparece para compradores ni en el catalogo publico."
                    : "Al ocultarla, compradores dejan de verla y sus productos salen del catalogo."}
                </p>
              </div>
              <button
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-red-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-fit"
                disabled={isSavingControl}
                onClick={() => {
                  void saveControlState(
                    {
                      storefront_hidden_at: isHidden ? null : new Date().toISOString(),
                    },
                    isHidden ? "Cuenta visible nuevamente." : "Cuenta oculta para compradores.",
                  );
                }}
                type="button"
              >
                {isSavingControl ? "Guardando..." : isHidden ? "Mostrar cuenta" : "Ocultar cuenta"}
              </button>
            </div>
          ) : null}

          {!profileLoadMessage && activePanel === "qr" ? (
            <div className="grid gap-3">
              <DownloadableQr
                description="Apunta directo al perfil publico de este vendedor."
                fileBaseName={artisanProfileQrFileBaseName}
                targetUrl={artisanProfileQrUrl}
                title="QR del perfil"
              />
              <a
                className="inline-flex min-h-10 w-full items-center justify-center rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100 sm:w-fit"
                href={artisanProfileQrUrl}
                rel="noreferrer"
                target="_blank"
              >
                Abrir perfil publico
              </a>
            </div>
          ) : null}

          {statusMessage ? (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {statusMessage}
            </p>
          ) : null}

          {errorMessage ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

import { useEffect, useMemo, useState, type FormEvent } from "react";

import { PagePlaceholder } from "@/components/PagePlaceholder";
import { useAuth } from "@/features/auth/useAuth";
import { SYSTEM_TERMS_NOTIFICATION_ID } from "@/features/internalNotifications/internalNotificationsConstants";
import {
  useAdminInternalNotifications,
  useCreateInternalNotification,
  useDeleteInternalNotification,
} from "@/features/internalNotifications/internalNotificationsQueries";
import type { AdminInternalNotification } from "@/types/internalNotifications";

const PAGE_SIZE = 5;
const PREVIEW_LIMIT = 360;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getPreviewText(value: string) {
  const normalized = value.trim();

  if (normalized.length <= PREVIEW_LIMIT) {
    return normalized;
  }

  return `${normalized.slice(0, PREVIEW_LIMIT).trim()}...`;
}

function PaginationControls({
  currentPage,
  onPageChange,
  totalPages,
}: {
  currentPage: number;
  onPageChange: (page: number) => void;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600">
      <span>
        Página {currentPage} de {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <button
          className="inline-flex min-h-9 items-center rounded-full border border-stone-200 px-3 font-semibold transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          type="button"
        >
          Anterior
        </button>
        <button
          className="inline-flex min-h-9 items-center rounded-full border border-stone-200 px-3 font-semibold transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          type="button"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

function AdminNotificationCard({
  deleteCandidateId,
  isDeleting,
  notification,
  onCancelDelete,
  onDelete,
}: {
  deleteCandidateId: string | null;
  isDeleting: boolean;
  notification: AdminInternalNotification;
  onCancelDelete: () => void;
  onDelete: (notificationId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isSystemTermsNotification = notification.id === SYSTEM_TERMS_NOTIFICATION_ID;
  const isDeleteCandidate = deleteCandidateId === notification.id;
  const hasLongBody = notification.body.trim().length > PREVIEW_LIMIT;
  const visibleBody = isExpanded ? notification.body.trim() : getPreviewText(notification.body);

  return (
    <article className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold leading-snug text-stone-900">
              {notification.title}
            </h2>
            {isSystemTermsNotification ? (
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-brand-700">
                Base
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-stone-500">
            Publicada {formatDate(notification.published_at)}
          </p>
        </div>

        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          {notification.signed_count} firma{notification.signed_count === 1 ? "" : "s"}
        </span>
      </div>

      <p className="whitespace-pre-wrap text-sm leading-6 text-stone-700">{visibleBody}</p>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          {hasLongBody ? (
            <button
              className="inline-flex min-h-8 items-center rounded-full border border-stone-200 px-3 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
              onClick={() => setIsExpanded((value) => !value)}
              type="button"
            >
              {isExpanded ? "Ver menos" : "Ver completo"}
            </button>
          ) : null}
        </div>

        {isSystemTermsNotification ? (
          <span className="text-xs font-medium text-stone-500">No eliminable</span>
        ) : (
          <div className="flex flex-wrap justify-end gap-2">
            <button
              className={[
                "inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold transition",
                isDeleteCandidate
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
              ].join(" ")}
              disabled={isDeleting}
              onClick={() => onDelete(notification.id)}
              type="button"
            >
              {isDeleting && isDeleteCandidate
                ? "Eliminando..."
                : isDeleteCandidate
                  ? "Confirmar"
                  : "Eliminar"}
            </button>
            {isDeleteCandidate ? (
              <button
                className="inline-flex min-h-8 items-center rounded-full border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-600 transition hover:bg-stone-50"
                disabled={isDeleting}
                onClick={onCancelDelete}
                type="button"
              >
                Cancelar
              </button>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}

export function AdminInternalNotificationsPage() {
  const { user } = useAuth();
  const notificationsQuery = useAdminInternalNotifications();
  const createNotification = useCreateInternalNotification(user?.id);
  const deleteNotification = useDeleteInternalNotification();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const notifications = useMemo(() => notificationsQuery.data ?? [], [notificationsQuery.data]);
  const totalPages = Math.max(1, Math.ceil(notifications.length / PAGE_SIZE));
  const paginatedNotifications = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return notifications.slice(start, start + PAGE_SIZE);
  }, [currentPage, notifications]);
  const canSubmit = useMemo(
    () => title.trim().length >= 3 && body.trim().length >= 3 && !createNotification.isPending,
    [body, createNotification.isPending, title],
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage(null);

    if (!canSubmit) return;

    try {
      await createNotification.mutateAsync({ body, title });
      setTitle("");
      setBody("");
      setCurrentPage(1);
      setStatusMessage("Notificación publicada.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No pudimos publicar.");
    }
  }

  async function handleDelete(notificationId: string) {
    if (deleteCandidateId !== notificationId) {
      setDeleteCandidateId(notificationId);
      setStatusMessage("Tocá confirmar para eliminar esa notificación.");
      return;
    }

    try {
      await deleteNotification.mutateAsync(notificationId);
      setDeleteCandidateId(null);
      setStatusMessage("Notificación eliminada.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No pudimos eliminar.");
    }
  }

  return (
    <PagePlaceholder
      description="Avisos internos que los vendedores deben leer y firmar."
      title="Notificaciones internas"
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
        <form
          className="grid gap-4 self-start rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5"
          onSubmit={handleSubmit}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ocean-500">
              Nuevo aviso
            </p>
            <h2 className="mt-1 text-lg font-semibold text-stone-900">Publicar notificación</h2>
          </div>

          <label className="grid gap-1.5 text-sm font-medium text-stone-700">
            Título
            <input
              className="h-11 rounded-2xl border border-stone-300 bg-white px-3 text-sm outline-none transition focus:border-ocean-400 focus:ring-4 focus:ring-ocean-100"
              maxLength={140}
              onChange={(event) => setTitle(event.target.value)}
              value={title}
            />
          </label>

          <label className="grid gap-1.5 text-sm font-medium text-stone-700">
            Mensaje
            <textarea
              className="min-h-40 resize-y rounded-2xl border border-stone-300 bg-white px-3 py-3 text-sm leading-6 outline-none transition focus:border-ocean-400 focus:ring-4 focus:ring-ocean-100"
              maxLength={6000}
              onChange={(event) => setBody(event.target.value)}
              value={body}
            />
          </label>

          {statusMessage ? (
            <p className="rounded-2xl bg-stone-50 px-3 py-2 text-sm text-stone-600">
              {statusMessage}
            </p>
          ) : null}

          <button
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-ocean-500 px-5 text-sm font-semibold text-white transition hover:bg-ocean-600 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canSubmit}
            type="submit"
          >
            {createNotification.isPending ? "Publicando..." : "Publicar"}
          </button>
        </form>

        <section className="grid min-w-0 gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                Publicadas
              </p>
              <h2 className="mt-1 text-lg font-semibold text-stone-900">
                {notifications.length} notificación{notifications.length === 1 ? "" : "es"}
              </h2>
            </div>
            <PaginationControls
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              totalPages={totalPages}
            />
          </div>

          {notificationsQuery.isLoading ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-500">
              Cargando notificaciones...
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-500">
              Todavía no hay notificaciones.
            </div>
          ) : (
            paginatedNotifications.map((notification) => (
              <AdminNotificationCard
                deleteCandidateId={deleteCandidateId}
                isDeleting={deleteNotification.isPending}
                key={notification.id}
                notification={notification}
                onCancelDelete={() => {
                  setDeleteCandidateId(null);
                  setStatusMessage(null);
                }}
                onDelete={handleDelete}
              />
            ))
          )}
        </section>
      </div>
    </PagePlaceholder>
  );
}

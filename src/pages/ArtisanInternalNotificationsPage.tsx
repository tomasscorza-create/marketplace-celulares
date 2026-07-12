import { useEffect, useMemo, useState } from "react";

import { PagePlaceholder } from "@/components/PagePlaceholder";
import { useAuth } from "@/features/auth/useAuth";
import {
  useArtisanInternalNotifications,
  useSignInternalNotification,
} from "@/features/internalNotifications/internalNotificationsQueries";
import type { InternalNotificationItem } from "@/types/internalNotifications";

const PAGE_SIZE = 4;
const PREVIEW_LIMIT = 420;

type NotificationTab = "pending" | "signed";

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

function NotificationCard({
  item,
  onSign,
  pendingSignatureId,
}: {
  item: InternalNotificationItem;
  onSign: (notificationId: string) => void;
  pendingSignatureId: string | null;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isSigned = Boolean(item.signature);
  const isSigning = pendingSignatureId === item.notification.id;
  const hasLongBody = item.notification.body.trim().length > PREVIEW_LIMIT;
  const visibleBody = isExpanded
    ? item.notification.body.trim()
    : getPreviewText(item.notification.body);

  return (
    <article className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-snug text-stone-900">
            {item.notification.title}
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            Publicada {formatDate(item.notification.published_at)}
          </p>
        </div>
        <span
          className={[
            "rounded-full px-3 py-1 text-xs font-semibold",
            isSigned ? "bg-emerald-50 text-emerald-700" : "bg-sun-50 text-sun-700",
          ].join(" ")}
        >
          {isSigned ? "Firmada" : "Pendiente"}
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
          {isSigned ? (
            <p className="text-xs text-stone-500">
              Firmada el {formatDate(item.signature!.signed_at)}
            </p>
          ) : (
            <p className="text-xs text-stone-500">Requiere confirmación de lectura.</p>
          )}
        </div>

        {!isSigned ? (
          <button
            className="inline-flex min-h-9 items-center justify-center rounded-full bg-brand-500 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSigning}
            onClick={() => onSign(item.notification.id)}
            type="button"
          >
            {isSigning ? "Firmando..." : "Firmar"}
          </button>
        ) : null}
      </div>
    </article>
  );
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

export function ArtisanInternalNotificationsPage() {
  const { profile } = useAuth();
  const notificationsQuery = useArtisanInternalNotifications(profile?.id, profile?.role === "artisan");
  const signNotification = useSignInternalNotification(profile);
  const [activeTab, setActiveTab] = useState<NotificationTab>("pending");
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingSignatureId, setPendingSignatureId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const items = useMemo(() => notificationsQuery.data ?? [], [notificationsQuery.data]);
  const pendingItems = useMemo(() => items.filter((item) => !item.signature), [items]);
  const signedItems = useMemo(() => items.filter((item) => item.signature), [items]);
  const activeItems = activeTab === "pending" ? pendingItems : signedItems;
  const totalPages = Math.max(1, Math.ceil(activeItems.length / PAGE_SIZE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return activeItems.slice(start, start + PAGE_SIZE);
  }, [activeItems, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  async function handleSign(notificationId: string) {
    setStatusMessage(null);
    setPendingSignatureId(notificationId);

    try {
      await signNotification.mutateAsync(notificationId);
      setStatusMessage("Notificación firmada.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No pudimos firmar.");
    } finally {
      setPendingSignatureId(null);
    }
  }

  return (
    <PagePlaceholder
      description="Avisos internos publicados por administración."
      title="Notificaciones internas"
    >
      <div className="grid gap-4">
        <section className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-2 sm:p-5">
          <button
            className={[
              "rounded-2xl border px-4 py-3 text-left transition",
              activeTab === "pending"
                ? "border-sun-200 bg-sun-50 text-sun-800"
                : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50",
            ].join(" ")}
            onClick={() => setActiveTab("pending")}
            type="button"
          >
            <span className="block text-xs font-semibold uppercase tracking-[0.14em]">
              Pendientes
            </span>
            <span className="mt-1 block text-lg font-semibold">{pendingItems.length}</span>
          </button>
          <button
            className={[
              "rounded-2xl border px-4 py-3 text-left transition",
              activeTab === "signed"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50",
            ].join(" ")}
            onClick={() => setActiveTab("signed")}
            type="button"
          >
            <span className="block text-xs font-semibold uppercase tracking-[0.14em]">
              Firmadas
            </span>
            <span className="mt-1 block text-lg font-semibold">{signedItems.length}</span>
          </button>
        </section>

        {statusMessage ? (
          <p className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600">
            {statusMessage}
          </p>
        ) : null}

        <section className="grid gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                {activeTab === "pending" ? "Por revisar" : "Historial interno"}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-stone-900">
                {activeTab === "pending"
                  ? pendingItems.length === 0
                    ? "Todo firmado"
                    : `${pendingItems.length} pendiente${pendingItems.length === 1 ? "" : "s"}`
                  : `${signedItems.length} firmada${signedItems.length === 1 ? "" : "s"}`}
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
          ) : activeItems.length === 0 ? (
            <div
              className={[
                "rounded-2xl border p-5 text-sm",
                activeTab === "pending"
                  ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                  : "border-stone-200 bg-white text-stone-500",
              ].join(" ")}
            >
              {activeTab === "pending"
                ? "No tenés notificaciones pendientes."
                : "Aún no hay notificaciones firmadas."}
            </div>
          ) : (
            paginatedItems.map((item) => (
              <NotificationCard
                item={item}
                key={item.notification.id}
                onSign={handleSign}
                pendingSignatureId={pendingSignatureId}
              />
            ))
          )}
        </section>
      </div>
    </PagePlaceholder>
  );
}

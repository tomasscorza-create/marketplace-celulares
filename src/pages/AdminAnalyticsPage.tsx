import { useMemo, useState } from "react";

import { PagePlaceholder } from "../components/PagePlaceholder";
import { useAuth } from "../features/auth/useAuth";
import {
  useAdminAnalyticsOverview,
  useAdminAnalyticsUserHistory,
} from "../features/analytics/analyticsQueries";
import { ANALYTICS_EVENT_LABELS } from "../features/analytics/analyticsContract";
import {
  calculateSignupConversionRate,
  formatSignupConversionRate,
} from "../features/analytics/adminAnalyticsMetrics";
import { getAnalyticsMaintenanceMessage } from "../features/analytics/analyticsMaintenance";
import type {
  AnalyticsCountItem,
  AnalyticsRecentUser,
  AnalyticsRegistrationPoint,
} from "../types/analytics";

const LABELS: Record<string, string> = {
  "15_to_59": "15 a 59 segundos",
  "1_to_2": "1 a 2 minutos",
  "3_to_9": "3 a 9 minutos",
  "10_plus": "10 minutos o más",
  android: "Android",
  chromeos: "ChromeOS",
  computer: "Computadoras",
  high: "Gama alta",
  ios: "iOS",
  ipados: "iPadOS",
  linux: "Linux",
  low: "Gama baja",
  macos: "macOS",
  medium: "Gama media",
  mobile: "Celulares",
  other: "Otros",
  tablet: "Tablets",
  under_15: "Menos de 15 segundos",
  unknown: "Sin datos suficientes",
  windows: "Windows",
};

function formatCount(value: number) {
  return new Intl.NumberFormat("es-AR").format(Number(value) || 0);
}

function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes} min ${remainingSeconds}s`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function MetricCard({ label, value, hint }: { hint?: string; label: string; value: string }) {
  return (
    <article className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-ocean-600">{value}</p>
      {hint ? <p className="mt-2 text-sm text-stone-500">{hint}</p> : null}
    </article>
  );
}

function DistributionCard({
  items,
  labels = LABELS,
  title,
}: {
  items: AnalyticsCountItem[];
  labels?: Record<string, string>;
  title: string;
}) {
  const max = Math.max(...items.map((item) => Number(item.count) || 0), 1);

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-ocean-600">{title}</h2>
      <div className="mt-4 grid gap-3">
        {items.length === 0 ? <p className="text-sm text-stone-500">Todavía no hay datos.</p> : null}
        {items.map((item) => (
          <div className="grid gap-1" key={item.label}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-stone-700">{labels[item.label] ?? item.label}</span>
              <span className="text-stone-500">{formatCount(item.count)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-ocean-500"
                style={{ width: `${Math.max(4, (Number(item.count) / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RegistrationCard({ items }: { items: AnalyticsRegistrationPoint[] }) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-ocean-600">Cuentas creadas por día</h2>
      <p className="mt-1 text-sm text-stone-500">Fuente exacta: perfiles creados, sin relacionar visitas anónimas.</p>
      <div className="mt-4 max-h-80 overflow-auto">
        {items.length === 0 ? <p className="text-sm text-stone-500">No se crearon cuentas en este período.</p> : null}
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-stone-400">
            <tr>
              <th className="pb-3">Fecha</th>
              <th className="pb-3 text-right">Compradores</th>
              <th className="pb-3 text-right">Vendedores</th>
              <th className="pb-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {items.map((item) => (
              <tr key={item.date}>
                <td className="py-3 font-medium text-stone-700">{new Intl.DateTimeFormat("es-AR").format(new Date(`${item.date}T12:00:00`))}</td>
                <td className="py-3 text-right text-stone-500">{formatCount(item.buyers)}</td>
                <td className="py-3 text-right text-stone-500">{formatCount(item.artisans)}</td>
                <td className="py-3 text-right font-semibold text-ocean-600">{formatCount(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function UserButton({
  isSelected,
  onSelect,
  user,
}: {
  isSelected: boolean;
  onSelect: () => void;
  user: AnalyticsRecentUser;
}) {
  return (
    <button
      className={[
        "grid w-full gap-1 rounded-2xl border p-4 text-left transition-colors",
        isSelected
          ? "border-brand-400 bg-brand-50"
          : "border-stone-200 bg-white hover:border-ocean-300 hover:bg-ocean-50",
      ].join(" ")}
      onClick={onSelect}
      type="button"
    >
      <span className="font-semibold text-stone-800">{user.fullName}</span>
      <span className="text-sm text-stone-500">{user.email}</span>
      <span className="text-xs text-stone-400">
        {formatCount(user.sessions)} sesiones · {formatCount(user.events)} eventos · {formatDate(user.lastSeenAt)}
      </span>
    </button>
  );
}

export function AdminAnalyticsPage() {
  const { isLoading: isAuthLoading, role, user } = useAuth();
  const [days, setDays] = useState(30);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const isEnabled = !isAuthLoading && Boolean(user) && role === "admin";
  const overviewQuery = useAdminAnalyticsOverview(days, isEnabled);
  const historyQuery = useAdminAnalyticsUserHistory(selectedUserId, isEnabled);
  const overview = overviewQuery.data;
  const accountsCreated = overview ? overview.newBuyers + overview.newArtisans : 0;
  const signupConversionRate = overview
    ? calculateSignupConversionRate(overview.signupStarted, accountsCreated)
    : null;
  const isRefreshing = overviewQuery.isFetching || (Boolean(selectedUserId) && historyQuery.isFetching);
  const lastUpdatedLabel = overviewQuery.dataUpdatedAt > 0
    ? formatDate(new Date(overviewQuery.dataUpdatedAt).toISOString())
    : overview
      ? "Mostrando datos anteriores"
      : "Todavía sin actualizar";
  const refreshAnalytics = () => {
    const requests: Promise<unknown>[] = [overviewQuery.refetch()];
    if (selectedUserId) requests.push(historyQuery.refetch());
    void Promise.all(requests);
  };
  const selectedUser = useMemo(
    () => overview?.recentUsers.find((item) => item.userId === selectedUserId) ?? null,
    [overview?.recentUsers, selectedUserId],
  );

  return (
    <PagePlaceholder
      badge="Administración"
      description="Visitas agregadas y actividad vinculada únicamente a cuentas con consentimiento vigente."
      title="Analítica interna"
    >
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
          <div>
            <p className="font-semibold text-stone-800">Período del informe</p>
            <p className="text-sm text-stone-500">La IP nunca se guarda y los anónimos no tienen historial individual.</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="mr-1 text-right text-xs text-stone-500" aria-live="polite">
              <p>{isRefreshing ? "Actualizando…" : `Última actualización: ${lastUpdatedLabel}`}</p>
              <p>Automática cada 30 s con la pestaña visible</p>
            </div>
            <button
              className="rounded-full border border-ocean-300 bg-white px-4 py-2 text-sm font-semibold text-ocean-700 hover:bg-ocean-50 disabled:cursor-wait disabled:opacity-60"
              disabled={isRefreshing || !isEnabled}
              onClick={refreshAnalytics}
              type="button"
            >
              {isRefreshing ? "Actualizando…" : "Actualizar ahora"}
            </button>
            <select
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700"
              onChange={(event) => setDays(Number(event.target.value))}
              value={days}
            >
              <option value={7}>Últimos 7 días</option>
              <option value={30}>Últimos 30 días</option>
              <option value={90}>Últimos 90 días</option>
              <option value={365}>Último año</option>
            </select>
          </div>
        </div>

        {overviewQuery.isLoading ? (
          <p className="rounded-2xl border border-ocean-200 bg-ocean-50 p-4 text-sm text-ocean-700">Cargando métricas…</p>
        ) : null}
        {overviewQuery.error ? (
          <p className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            {overviewQuery.error.message}
          </p>
        ) : null}

        {overview ? (
          <>
            <section className="grid gap-4">
              <div>
                <h2 className="text-xl font-semibold text-ocean-700">Cuentas y registros</h2>
                <p className="mt-1 text-sm text-stone-500">
                  Las cuentas provienen de perfiles reales. La conversión compara ese total con inicios anónimos y es sólo orientativa.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Cuentas nuevas"
                  value={formatCount(accountsCreated)}
                  hint={`${formatCount(overview.newBuyers)} compradores · ${formatCount(overview.newArtisans)} vendedores`}
                />
                <MetricCard
                  label="Cuentas totales"
                  value={formatCount(overview.totalBuyers + overview.totalArtisans)}
                  hint={`${formatCount(overview.totalBuyers)} compradores · ${formatCount(overview.totalArtisans)} vendedores`}
                />
                <MetricCard label="Registros iniciados" value={formatCount(overview.signupStarted)} hint="Agregado anónimo" />
                <MetricCard
                  label="Conversión aproximada"
                  value={formatSignupConversionRate(signupConversionRate)}
                  hint="Cuentas nuevas / registros iniciados"
                />
              </div>
              <div className="grid gap-5 xl:grid-cols-2">
                <RegistrationCard items={overview.accountRegistrations} />
                <DistributionCard
                  items={overview.topEvents}
                  labels={ANALYTICS_EVENT_LABELS}
                  title="Eventos del período"
                />
              </div>
            </section>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Visitas anónimas" value={formatCount(overview.anonymousVisits)} hint="Sin ID persistente" />
              <MetricCard label="Sesiones consentidas" value={formatCount(overview.consentedSessions)} hint={`${formatCount(overview.consentedUsers)} usuarios`} />
              <MetricCard label="Páginas vistas" value={formatCount(overview.anonymousPageViews + overview.consentedPageViews)} />
              <MetricCard label="Tiempo activo promedio" value={formatDuration(overview.averageActiveSeconds)} hint="Sólo cuentas consentidas" />
            </div>

            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Calidad del tráfico anónimo</h2>
                  <p className="mt-1 text-sm text-amber-800">
                    Estas métricas son aproximadas. Se validan origen y rutas, se ignoran bots conocidos y se aplica un límite compartido sin guardar la IP.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{formatCount(overview.anonymousQuality.excludedEvents)}</p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                    eventos excluidos en {formatCount(overview.anonymousQuality.flaggedBuckets)} picos
                  </p>
                </div>
              </div>
            </section>

            <section
              className={[
                "rounded-3xl border p-5 shadow-sm",
                overview.analyticsMaintenance.isOverdue
                  ? "border-red-200 bg-red-50 text-red-950"
                  : "border-emerald-200 bg-emerald-50 text-emerald-950",
              ].join(" ")}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Retención automática</h2>
                  <p className="mt-1 text-sm">
                    {getAnalyticsMaintenanceMessage(overview.analyticsMaintenance)}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold">Diaria a las 03:17 UTC</p>
                  <p className="mt-1 opacity-75">
                    Último éxito: {overview.analyticsMaintenance.lastSuccessAt
                      ? formatDate(overview.analyticsMaintenance.lastSuccessAt)
                      : "sin confirmar"}
                  </p>
                </div>
              </div>
            </section>

            <div className="grid gap-5 xl:grid-cols-3">
              <DistributionCard items={overview.devices} title="Tipo de dispositivo" />
              <DistributionCard items={overview.operatingSystems} title="Sistema operativo" />
              <DistributionCard items={overview.performanceTiers} title="Gama estimada" />
            </div>

            <DistributionCard
              items={overview.sessionDurationBuckets}
              title="Duración de sesiones consentidas"
            />

            <div className="grid gap-5 xl:grid-cols-2">
              <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-ocean-600">Ciudades aproximadas</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[420px] text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-stone-400">
                      <tr><th className="pb-3">Ciudad</th><th className="pb-3">Región</th><th className="pb-3 text-right">Visitas</th></tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {overview.locations.map((item) => (
                        <tr key={`${item.city}-${item.region}-${item.countryCode}`}>
                          <td className="py-3 font-medium text-stone-700">{item.city === "unknown" ? "Sin datos" : item.city}</td>
                          <td className="py-3 text-stone-500">{item.region === "unknown" ? item.countryCode : `${item.region}, ${item.countryCode}`}</td>
                          <td className="py-3 text-right text-stone-600">{formatCount(item.count)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-ocean-600">Páginas más vistas</h2>
                <div className="mt-4 grid gap-2">
                  {overview.topPages.map((item) => (
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 px-3 py-2" key={item.path}>
                      <code className="truncate text-xs text-stone-600">{item.path}</code>
                      <span className="shrink-0 text-sm font-semibold text-ocean-600">{formatCount(item.count)}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
              <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-ocean-600">Usuarios consentidos recientes</h2>
                <p className="mt-1 text-sm text-stone-500">Seleccioná una cuenta para revisar su historial permitido.</p>
                <div className="mt-4 grid max-h-[560px] gap-2 overflow-y-auto pr-1">
                  {overview.recentUsers.map((recentUser) => (
                    <UserButton
                      isSelected={recentUser.userId === selectedUserId}
                      key={recentUser.userId}
                      onSelect={() => setSelectedUserId(recentUser.userId)}
                      user={recentUser}
                    />
                  ))}
                  {overview.recentUsers.length === 0 ? <p className="text-sm text-stone-500">Todavía no hay usuarios con actividad consentida.</p> : null}
                </div>
              </section>

              <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-ocean-600">Historial individual</h2>
                {!selectedUser ? (
                  <p className="mt-4 text-sm text-stone-500">Elegí un usuario para ver sus eventos.</p>
                ) : (
                  <>
                    <p className="mt-1 text-sm text-stone-500">{selectedUser.fullName} · {selectedUser.email}</p>
                    {historyQuery.isLoading ? <p className="mt-4 text-sm text-stone-500">Cargando historial…</p> : null}
                    {historyQuery.error ? <p className="mt-4 text-sm text-red-600">{historyQuery.error.message}</p> : null}
                    <div className="mt-4 max-h-[520px] overflow-auto">
                      <table className="w-full min-w-[620px] text-left text-sm">
                        <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-stone-400">
                          <tr><th className="pb-3">Evento</th><th className="pb-3">Ruta</th><th className="pb-3">Dispositivo</th><th className="pb-3">Ciudad</th><th className="pb-3">Fecha</th></tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {historyQuery.data?.map((event, index) => (
                            <tr key={`${event.occurred_at}-${event.event_name}-${index}`}>
                              <td className="py-3 font-medium text-stone-700">{ANALYTICS_EVENT_LABELS[event.event_name] ?? event.event_name}</td>
                              <td className="max-w-[180px] truncate py-3 text-stone-500">{event.path}</td>
                              <td className="py-3 text-stone-500">{LABELS[event.device_type] ?? event.device_type} · {LABELS[event.os_family] ?? event.os_family}</td>
                              <td className="py-3 text-stone-500">{event.city === "unknown" ? "Sin datos" : event.city}</td>
                              <td className="py-3 text-stone-500">{formatDate(event.occurred_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </section>
            </div>
          </>
        ) : null}
      </div>
    </PagePlaceholder>
  );
}

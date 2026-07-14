import { PagePlaceholder } from "../components/PagePlaceholder";
import { useAuth } from "../features/auth/useAuth";
import { useAnalytics } from "../features/analytics/useAnalytics";
import { ANALYTICS_POLICY_VERSION } from "../features/analytics/analyticsContract";

export function PrivacyPage() {
  const { role, user } = useAuth();
  const { errorMessage, hasActiveConsent, isLoading, setConsent } = useAnalytics();
  const canManageConsent = Boolean(user && (role === "buyer" || role === "artisan"));

  return (
    <PagePlaceholder
      badge="Privacidad"
      description="Qué medimos, para qué lo usamos y cómo controlar tu consentimiento."
      title="Privacidad y métricas internas"
    >
      <div className="mx-auto grid max-w-3xl gap-5">
        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-lg font-semibold text-ocean-600">Condiciones de uso</h2>
          <p className="mt-2 leading-7 text-stone-600">
            La cuenta debe utilizarse con información legítima y sin afectar la seguridad, el
            catálogo o a otros usuarios. Los datos de cuenta se usan para autenticación, roles y
            prestación del servicio. La analítica vinculada es una autorización independiente y
            opcional.
          </p>
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-lg font-semibold text-ocean-600">Visitas sin cuenta o sin permiso</h2>
          <p className="mt-2 leading-7 text-stone-600">
            Sólo contabilizamos métricas agregadas como página, categoría general de dispositivo,
            sistema operativo y ciudad aproximada. No asignamos un identificador persistente, no
            reconocemos al visitante cuando vuelve y no vinculamos esa actividad con una cuenta.
          </p>
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-lg font-semibold text-ocean-600">Seguimiento con cuenta</h2>
          <p className="mt-2 leading-7 text-stone-600">
            Sólo se habilita con consentimiento explícito. Puede incluir sesiones, tiempo activo,
            páginas, productos, búsquedas sin texto sensible, filtros y acciones comerciales. No
            guardamos contraseñas, formularios, datos de pago, direcciones, coordenadas ni IP.
          </p>
          <p className="mt-3 text-sm text-stone-500">
            Versión vigente de la política: <strong>{ANALYTICS_POLICY_VERSION}</strong>.
          </p>
        </section>

        <section className="rounded-3xl border border-ocean-200 bg-ocean-50 p-5 sm:p-7">
          <h2 className="text-lg font-semibold text-ocean-600">Tu preferencia</h2>
          {!canManageConsent ? (
            <p className="mt-2 text-stone-600">Iniciá sesión para administrar el consentimiento asociado a tu cuenta.</p>
          ) : isLoading ? (
            <p className="mt-2 text-stone-600">Consultando tu preferencia…</p>
          ) : (
            <>
              <p className="mt-2 text-stone-600">
                Estado actual: <strong>{hasActiveConsent ? "permitido" : "no permitido"}</strong>.
              </p>
              <button
                className={[
                  "mt-4 rounded-full px-5 py-2.5 text-sm font-semibold text-white",
                  hasActiveConsent ? "bg-red-600 hover:bg-red-700" : "bg-brand-500 hover:bg-brand-600",
                ].join(" ")}
                onClick={() => {
                  void setConsent(!hasActiveConsent);
                }}
                type="button"
              >
                {hasActiveConsent ? "Revocar seguimiento" : "Permitir métricas vinculadas"}
              </button>
            </>
          )}
          {errorMessage ? <p className="mt-3 text-sm text-red-600">{errorMessage}</p> : null}
        </section>
      </div>
    </PagePlaceholder>
  );
}

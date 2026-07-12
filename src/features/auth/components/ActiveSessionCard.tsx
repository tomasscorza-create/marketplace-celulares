import { Link } from "react-router-dom";

type ActiveSessionCardProps = {
  errorMessage: string | null;
  isSubmitting: boolean;
  onSignOut: () => void;
  profileError: string | null;
  profileFullName: string | null;
  roleLabel: string;
  sessionAction: {
    label: string;
    to: string;
  };
  userEmail: string | undefined;
};

export function ActiveSessionCard({
  errorMessage,
  isSubmitting,
  onSignOut,
  profileError,
  profileFullName,
  roleLabel,
  sessionAction,
  userEmail,
}: ActiveSessionCardProps) {
  return (
    <div className="grid gap-4 rounded-2xl border border-ocean-100 bg-ocean-50 p-5 sm:p-6 md:max-w-2xl">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean-500">
          Sesion activa
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-stone-900">Bienvenido de nuevo</h2>
        <p className="mt-3 text-sm leading-6 text-stone-700">Usuario actual: {userEmail}</p>
        <p className="mt-2 text-sm leading-6 text-stone-700">Acceso habilitado: {roleLabel}</p>
        {profileFullName ? (
          <p className="mt-2 text-sm leading-6 text-stone-700">Perfil: {profileFullName}</p>
        ) : null}
      </div>

      {errorMessage ? (
        <p className="rounded-2xl border border-brand-500 bg-[#D1FAE5] px-4 py-3 text-sm text-brand-500">
          {errorMessage}
        </p>
      ) : null}

      {profileError ? (
        <p className="rounded-2xl border border-sun-100 bg-sun-50 px-4 py-3 text-sm text-brand-700">
          No pudimos preparar tu acceso correctamente. Si el problema continua, revisa tu cuenta
          con administracion.
        </p>
      ) : null}

      <div className="grid gap-3 sm:flex sm:flex-wrap">
        <Link
          className="inline-flex w-full justify-center rounded-full bg-brand-500 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 sm:w-auto sm:py-2.5"
          to={sessionAction.to}
        >
          {sessionAction.label}
        </Link>
        <button
          className="inline-flex w-full justify-center rounded-full border border-ocean-200 px-5 py-3 text-sm font-medium text-ocean-500 transition-colors hover:bg-white disabled:cursor-not-allowed sm:w-auto sm:py-2.5"
          disabled={isSubmitting}
          onClick={onSignOut}
          type="button"
        >
          {isSubmitting ? "Cerrando..." : "Cerrar sesion"}
        </button>
      </div>
    </div>
  );
}

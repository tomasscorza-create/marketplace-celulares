import { Link } from "react-router-dom";

import { PagePlaceholder } from "../components/PagePlaceholder";

export function RegistroPage() {
  return (
    <PagePlaceholder
      badge="Registro"
      description="Creá tu acceso para explorar el catálogo y guardar tus datos."
      title="Crear cuenta"
    >
      <div className="mx-auto max-w-md">
        <div className="grid gap-4">
          <Link
            className="group flex flex-col gap-4 rounded-2xl border-2 border-stone-200 bg-white p-6 shadow-sm transition-all hover:border-brand-500 hover:bg-brand-50 hover:shadow-md"
            to="/registro/comprador"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-500">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </div>

            <div>
              <h2 className="text-lg font-bold text-stone-900 transition-colors group-hover:text-brand-500">
                Crear cuenta
              </h2>
              <p className="mt-1.5 text-sm leading-6 text-stone-600">
                Explorá el catálogo, guardá favoritos y contactá a los vendedores locales.
              </p>
            </div>

            <div className="mt-auto flex items-center gap-1.5 text-sm font-semibold text-brand-500">
              Continuar
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M9 5l7 7-7 7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </div>
          </Link>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3 text-sm text-stone-500">
          <span>¿Ya tenés cuenta?</span>
          <Link
            className="rounded-full border border-ocean-500 bg-ocean-500 px-5 py-2 font-semibold text-white transition-colors hover:bg-ocean-600"
            to="/login"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </PagePlaceholder>
  );
}

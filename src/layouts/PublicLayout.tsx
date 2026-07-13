import { lazy, Suspense, useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { SiteBrand } from "../components/SiteBrand";
import { marketplaceConfig } from "../config/marketplace";
import { AuthStatus } from "../features/auth/AuthStatus";
import { useAuth } from "../features/auth/useAuth";
import { useCatalogWarmup } from "../features/public/useCatalogWarmup";

const WhatsAppButton = lazy(async () => ({
  default: (await import("../components/WhatsAppButton")).WhatsAppButton,
}));
const BuyerCartShortcut = lazy(async () => ({
  default: (await import("../features/buyer/components/BuyerCartShortcut")).BuyerCartShortcut,
}));

export function PublicLayout() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { role, user } = useAuth();
  useCatalogWarmup();

  const accountFooterLink = (() => {
    if (!user) {
      return {
        label: "Acceso",
        to: "/login",
      };
    }

    if (role === "admin") {
      return {
        label: "Mi panel",
        to: "/panel/admin",
      };
    }

    if (role === "artisan") {
      return {
        label: "Mi panel",
        to: "/panel/vendedor",
      };
    }

    return {
      label: "Mi cuenta",
      to: "/panel/comprador",
    };
  })();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className="relative min-h-dvh bg-slate-50 text-slate-900 selection:bg-blue-500/30">
      {/* Hyper-Premium Graphic Background */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-slate-50">
        <img src="/tech_abstract_bg.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />
        {/* Noise overlay for premium texture */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjMDAwIiBmaWxsLW9wYWNpdHk9IjAuMDIiLz4KPC9zdmc+')] opacity-60 mix-blend-overlay" />
      </div>
      <a
        className="sr-only absolute left-4 top-4 z-[60] rounded-full bg-ocean-600 px-4 py-2 text-sm font-medium text-white focus:not-sr-only"
        href="#main-content"
      >
        Saltar al contenido principal
      </a>

      <header
        className={[
          "sticky top-0 z-50 transition-all duration-300",
          isScrolled
            ? "bg-white/60 border-b border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-2xl"
            : "bg-transparent border-b border-transparent",
        ].join(" ")}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div
            className={[
              "flex items-center justify-between gap-3 transition-all duration-200 sm:gap-4",
              isScrolled ? "py-2.5 sm:py-3" : "py-3 sm:py-4",
            ].join(" ")}
          >
            <SiteBrand isScrolled={isScrolled} />

            <div className="flex items-center gap-2">
              {role === "buyer" ? (
                <Suspense
                  fallback={
                    <div className="h-10 w-24 shrink-0 rounded-full border-2 border-stone-200 bg-white/70 sm:h-11 sm:w-28" />
                  }
                >
                  <BuyerCartShortcut buyerId={user?.id} />
                </Suspense>
              ) : null}
              <AuthStatus />
            </div>
          </div>
        </div>
      </header>

      <main
        className="relative z-10 mx-auto max-w-6xl px-4 pb-6 pt-4 sm:px-6 sm:py-10"
        id="main-content"
        tabIndex={-1}
      >
        <Outlet />
      </main>

      <div
        className="fixed z-40"
        style={{
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)",
          right: "calc(env(safe-area-inset-right, 0px) + 1rem)",
        }}
      >
        <Suspense fallback={null}>
          <WhatsAppButton
            message={`Hola, me interesa saber mas sobre ${marketplaceConfig.appName}.`}
          />
        </Suspense>
      </div>

      <footer className="relative z-10 mt-10 border-t border-slate-200/50 bg-white/40 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-500">
                {marketplaceConfig.appName}
              </p>
              <p className="mt-1 text-sm text-stone-500">
                Productos seleccionados por tiendas locales
              </p>
            </div>
            <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-stone-500">
              <NavLink className="transition-colors hover:text-brand-500" to="/catalogo">
                Catalogo
              </NavLink>
              <NavLink className="transition-colors hover:text-brand-500" to="/vendedores">
                Vendedores
              </NavLink>
              <NavLink className="transition-colors hover:text-brand-500" to={accountFooterLink.to}>
                {accountFooterLink.label}
              </NavLink>
            </nav>
          </div>
        </div>
        <div className="border-t border-stone-100 px-4 py-4 text-center text-xs text-stone-400 sm:px-6">
          (c) {new Date().getFullYear()} {marketplaceConfig.appName}. Todos los derechos
          reservados.
        </div>
      </footer>
    </div>
  );
}

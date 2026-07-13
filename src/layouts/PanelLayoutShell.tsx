import type { ReactNode } from "react";

import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";

import { InstallAppButton } from "../components/InstallAppButton";
import { SiteBrand } from "../components/SiteBrand";
import { AuthStatus } from "../features/auth/AuthStatus";
import { useAuth } from "../features/auth/useAuth";

type PanelLink = {
  to: string;
  label: string;
  badgeCount?: number;
  end?: boolean;
};

type PanelLayoutShellProps = {
  title: string;
  accentClassName: string;
  backgroundClassName: string;
  borderClassName: string;
  activeLinkClassName: string;
  inactiveLinkClassName: string;
  links: PanelLink[];
  notice?: ReactNode;
};

function getNavLinkClass(
  isActive: boolean,
  activeLinkClassName: string,
  inactiveLinkClassName: string,
) {
  return [
    "inline-flex items-center rounded-full px-4 py-2.5 text-sm font-medium transition-colors",
    isActive ? activeLinkClassName : inactiveLinkClassName,
  ].join(" ");
}

export function PanelLayoutShell({
  title,
  accentClassName,
  backgroundClassName,
  borderClassName,
  activeLinkClassName,
  inactiveLinkClassName,
  links,
  notice,
}: PanelLayoutShellProps) {
  const { profile } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const accountLabel = profile?.store_name || profile?.full_name || title;

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
    <div className={`min-h-dvh text-stone-900 ${backgroundClassName}`}>
      <a
        className="sr-only absolute left-4 top-4 z-[60] rounded-full bg-ocean-600 px-4 py-2 text-sm font-medium text-white focus:not-sr-only"
        href="#main-content"
      >
        Saltar al contenido principal
      </a>

      <header
        className={[
          "sticky top-0 z-50 border-b transition-all duration-200",
          borderClassName,
          isScrolled
            ? "bg-white/96 shadow-[0_12px_36px_-26px_rgba(15,23,42,0.45)] backdrop-blur-md"
            : "bg-white/92 backdrop-blur-sm",
        ].join(" ")}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div
            className={[
              "flex items-center justify-between gap-3 transition-all duration-200 sm:gap-4",
              isScrolled ? "py-2.5 sm:py-3" : "py-3 sm:py-4",
            ].join(" ")}
          >
            <SiteBrand isScrolled={isScrolled} subtitle={accountLabel} />

            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden sm:block">
                <InstallAppButton />
              </div>
              <Link
                className="hidden rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 md:inline-flex lg:hidden"
                to="/catalogo"
              >
                Catalogo
              </Link>
              <AuthStatus />
            </div>
          </div>

          <div className={`border-t py-3 lg:hidden ${borderClassName}`}>
            <nav className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 whitespace-nowrap no-scrollbar">
              <NavLink
                className={({ isActive }) =>
                  getNavLinkClass(isActive, activeLinkClassName, inactiveLinkClassName)
                }
                end
                to="/catalogo"
              >
                Catalogo
              </NavLink>
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  className={({ isActive }) =>
                    getNavLinkClass(isActive, activeLinkClassName, inactiveLinkClassName)
                  }
                  end={link.end}
                  to={link.to}
                >
                  <span>{link.label}</span>
                  {link.badgeCount ? (
                    <span className="ml-2 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      {link.badgeCount > 99 ? "99+" : link.badgeCount}
                    </span>
                  ) : null}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className={`hidden border-t py-3 lg:block ${borderClassName}`}>
            <nav className="flex flex-wrap items-center gap-2">
              <NavLink
                className={({ isActive }) =>
                  getNavLinkClass(isActive, activeLinkClassName, inactiveLinkClassName)
                }
                end
                to="/catalogo"
              >
                Catalogo
              </NavLink>
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  className={({ isActive }) =>
                    getNavLinkClass(isActive, activeLinkClassName, inactiveLinkClassName)
                  }
                  end={link.end}
                  to={link.to}
                >
                  <span>{link.label}</span>
                  {link.badgeCount ? (
                    <span className="ml-2 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      {link.badgeCount > 99 ? "99+" : link.badgeCount}
                    </span>
                  ) : null}
                </NavLink>
              ))}
              <span
                className={`ml-auto rounded-full bg-stone-100 px-3 py-2 text-xs font-semibold uppercase tracking-widest ${accentClassName}`}
              >
                {title}
              </span>
            </nav>
          </div>
        </div>
      </header>

      <main
        className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10"
        id="main-content"
        tabIndex={-1}
      >
        {notice ? <div className="mb-5">{notice}</div> : null}
        <Outlet />
      </main>
    </div>
  );
}

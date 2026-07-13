import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { UserAvatar } from "../../components/UserAvatar";
import { isOnlinePurchaseEnabled } from "../../config/marketplace";
import { signOut } from "./authClient";
import { useAuth } from "./useAuth";

type AccountMenuLink = {
  label: string;
  to: string;
};

type AccountMenuSection = {
  title: string;
  links: AccountMenuLink[];
};

export function AuthStatus() {
  const { isConfigured, isLoading, profile, role, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // El provider sincroniza el estado; aquí evitamos complejidad extra.
    }

    setIsOpen(false);
  };

  const toggleMenu = () => {
    setIsOpen((currentValue) => !currentValue);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const primaryLink: AccountMenuLink = (() => {
    if (!user) {
      return {
        label: "Ingresar o crear cuenta",
        to: "/login",
      };
    }

    if (role === "admin") {
      return {
        label: "Abrir administración",
        to: "/panel/admin",
      };
    }

    if (role === "artisan") {
      return {
        label: "Abrir resumen",
        to: "/panel/vendedor",
      };
    }

    return {
      label: "Mi perfil",
      to: "/perfil/cliente",
    };
  })();

  const accountSections: AccountMenuSection[] = (() => {
    if (!user) {
      return [];
    }

    if (role === "artisan") {
      return [
        {
          title: "Gestión",
          links: [
            {
              label: "Mi perfil público",
              to: `/vendedor/${user.id}`,
            },
            {
              label: "Editar tienda",
              to: "/panel/vendedor/tienda",
            },
            {
              label: "Productos",
              to: "/panel/vendedor/productos",
            },
            {
              label: "Ventas",
              to: "/panel/vendedor/ventas",
            },
          ],
        },
      ];
    }

    if (role === "admin") {
      return [
        {
          title: "Gestión",
          links: [
            {
              label: "Productos",
              to: "/panel/admin/productos",
            },
            {
              label: "Ventas",
              to: "/panel/admin/ventas",
            },
            {
              label: "Facturacion",
              to: "/panel/admin/facturacion",
            },
            {
              label: "Vendedores",
              to: "/panel/admin/vendedores",
            },
            {
              label: "Categorías",
              to: "/panel/admin/categorias",
            },
            {
              label: "Ir al catálogo",
              to: "/catalogo",
            },
          ],
        },
      ];
    }

    return [
      {
        title: "Mi perfil",
        links: [
          ...(isOnlinePurchaseEnabled ? [
            {
              label: "Mis pedidos",
              to: "/panel/comprador",
            },
            {
              label: "Mi carrito",
              to: "/panel/comprador/carrito",
            },
          ] : []),
          {
            label: "Ir al catálogo",
            to: "/catalogo",
          },
        ],
      },
    ];
  })();

  const accountBadgeLabel = (() => {
    if (!user) {
      return "Invitado";
    }

    if (role === "admin") {
      return "Administración";
    }

    if (role === "artisan") {
      return "Vendedor";
    }

    return "Miembro";
  })();

  const accountName = profile?.full_name ?? user?.email ?? "Cuenta";
  const accountImageUrl =
    profile?.profile_image_url?.trim() ||
    (typeof user?.user_metadata?.profile_image_url === "string"
      ? user.user_metadata.profile_image_url.trim()
      : "") ||
    (typeof user?.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url.trim()
      : "") ||
    null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Abrir menú de cuenta"
        className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-stone-300 bg-white transition-colors hover:border-brand-500 hover:bg-brand-50"
        onClick={toggleMenu}
        type="button"
      >
        <UserAvatar imageUrl={accountImageUrl} label={accountName} />
      </button>

      {isOpen ? (
        <div
          aria-label="Menú de cuenta"
          className="absolute right-0 top-14 z-50 max-h-[min(70dvh,calc(100dvh-5rem))] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-3xl border border-stone-200 bg-white p-4 shadow-[0_24px_80px_-36px_rgba(71,85,105,0.5)] sm:w-80"
          role="menu"
        >
          {!isConfigured ? (
            <p className="rounded-2xl border border-brand-500 bg-brand-50 px-4 py-3 text-sm text-brand-500">
              El acceso no está disponible en este momento.
            </p>
          ) : (
            <>
              <div className="rounded-2xl border border-brand-500 bg-[linear-gradient(135deg,_#ECFEFF,_#FFFFFF)] p-4">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    imageUrl={accountImageUrl}
                    label={accountName}
                    sizeClassName="h-12 w-12"
                  />
                  <div className="min-w-0">
                    <span className="inline-flex rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-widest text-brand-500">
                      {isLoading ? "Revisando" : accountBadgeLabel}
                    </span>
                    <p className="mt-2 truncate text-sm font-semibold text-stone-900">
                      {isLoading ? "Validando tu cuenta..." : accountName}
                    </p>
                  </div>
                </div>
                {user ? (
                  <p className="mt-3 text-sm text-stone-600">{user.email}</p>
                ) : (
                  <p className="mt-3 text-sm text-stone-600">
                    Explorá el catálogo y entrá a tu cuenta cuando lo necesites.
                  </p>
                )}
              </div>

              <div className="mt-4 grid gap-2">
                <Link
                  className="rounded-2xl border border-ocean-500 bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
                  onClick={closeMenu}
                  to={primaryLink.to}
                >
                  {primaryLink.label}
                </Link>

                {accountSections.map((section) => (
                  <div
                    key={section.title}
                    className="rounded-2xl border border-stone-200 bg-stone-50/70 p-2.5"
                  >
                    <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-widest text-stone-500">
                      {section.title}
                    </p>
                    <div className="grid gap-1.5">
                      {section.links.map((link) => (
                        <Link
                          key={link.to}
                          className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:border-brand-500 hover:bg-brand-50 hover:text-ocean-500"
                          onClick={closeMenu}
                          to={link.to}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}

                {user ? (
                  <button
                    className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left text-sm font-medium text-stone-700 transition-colors hover:border-brand-500 hover:bg-brand-100 hover:text-brand-600"
                    onClick={() => {
                      void handleSignOut();
                    }}
                    type="button"
                  >
                    Salir
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

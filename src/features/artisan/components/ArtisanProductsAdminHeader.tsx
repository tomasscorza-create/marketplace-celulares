import { memo } from "react";
import { Link } from "react-router-dom";

import type { UserProfile } from "../../../types/auth";

type ArtisanProductsAdminHeaderProps = {
  isCreateFocus: boolean;
  managedProfile: UserProfile | null;
};

/**
 * Header visible solo cuando un admin gestiona los productos de un
 * vendedor desde `/panel/admin/productos/:artisanId`. Muestra link de
 * "volver" y el nombre de la tienda gestionada.
 *
 * Memoizado: las props son simples y los re-renders del padre son
 * frecuentes (state de form, drag, drafts, etc.).
 */
function ArtisanProductsAdminHeaderInner({
  isCreateFocus,
  managedProfile,
}: ArtisanProductsAdminHeaderProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Link
        className="inline-flex items-center justify-center rounded-full border border-ocean-100 bg-white px-4 py-2 text-sm font-medium text-ocean-500 transition-colors hover:bg-ocean-50"
        to={isCreateFocus ? "/panel/admin/productos" : "/panel/admin/productos?mode=edit"}
      >
        {isCreateFocus ? "Volver a productos" : "Volver a editar"}
      </Link>
      {managedProfile ? (
        <span className="inline-flex rounded-full bg-stone-100 px-3 py-2 text-sm text-stone-600">
          {managedProfile.store_name || managedProfile.full_name}
        </span>
      ) : null}
    </div>
  );
}

export const ArtisanProductsAdminHeader = memo(ArtisanProductsAdminHeaderInner);

import type { ReactNode } from "react";
import type { ProfileRole } from "../../types/auth";

import { Link, Navigate, Outlet, useLocation } from "react-router-dom";

import { getActionButtonClassName } from "../../components/ActionButton";
import { StatusScreen } from "../../components/StatusScreen";

import { useAuth } from "./useAuth";

type ProtectedRouteProps = {
  allowedRoles?: ProfileRole[];
  children?: ReactNode;
};

function AccessMessage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <StatusScreen
      actions={
        <>
          <Link className={getActionButtonClassName({ size: "sm", variant: "brand" })} to="/">
            Ir al inicio
          </Link>
          <Link className={getActionButtonClassName({ size: "sm", variant: "ghost" })} to="/login">
            Ir al acceso
          </Link>
        </>
      }
      align="left"
      description={description}
      title={title}
    />
  );
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { isConfigured, isLoading, profile, profileError, role, user } = useAuth();
  const location = useLocation();

  if (!isConfigured) {
    return (
      <AccessMessage
        description="Supabase Auth no esta configurado todavia para proteger esta seccion."
        title="Configuracion pendiente"
      />
    );
  }

  if (isLoading && !user) {
    return (
      <AccessMessage
        description="Estamos validando tu sesion y tu perfil antes de entrar al panel."
        title="Verificando acceso"
      />
    );
  }

  if (!user) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  if (!profile && !isLoading) {
    return (
      <AccessMessage
        description={
          profileError
            ? "Tu cuenta inicio sesion, pero no pudimos cargar un perfil valido en la plataforma. Revisa la tabla profiles o entra con un usuario que ya tenga perfil creado."
            : "Tu cuenta inicio sesion, pero todavia no encontramos un perfil listo para entrar a esta seccion."
        }
        title="Perfil no disponible"
      />
    );
  }

  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    return (
      <AccessMessage
        description="Tu cuenta no tiene permisos para entrar a esta seccion."
        title="Acceso denegado"
      />
    );
  }

  return children ? <>{children}</> : <Outlet />;
}

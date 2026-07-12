import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";

import { getActionButtonClassName } from "./ActionButton";
import { StatusScreen } from "./StatusScreen";

function getErrorCopy(error: unknown) {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return {
        title: "No encontramos esta página",
        description:
          "La ruta que intentaste abrir no está disponible o ya no existe dentro del sitio.",
      };
    }

    return {
      title: `Error ${error.status}`,
      description:
        typeof error.statusText === "string" && error.statusText.length > 0
          ? error.statusText
          : "Ocurrió un problema al cargar esta sección.",
    };
  }

  return {
    title: "Ocurrió un problema al abrir esta pantalla",
    description:
      "La vista no pudo cargarse correctamente. Podés volver al inicio o intentar otra vez desde el catálogo.",
  };
}

export function RouteErrorPage() {
  const error = useRouteError();
  const copy = getErrorCopy(error);

  return (
    <StatusScreen
      actions={
        <>
          <Link className={getActionButtonClassName({ size: "sm", variant: "brand" })} to="/">
            Ir al inicio
          </Link>
          <Link className={getActionButtonClassName({ size: "sm", variant: "ghost" })} to="/catalogo">
            Ver catálogo
          </Link>
        </>
      }
      description={copy.description}
      eyebrow="Error de carga"
      title={copy.title}
    />
  );
}

import { Link } from "react-router-dom";

import { getActionButtonClassName } from "../components/ActionButton";
import { StatusScreen } from "../components/StatusScreen";

export function NotFoundPage() {
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
      description="La ruta no coincide con ninguna pantalla disponible en esta fase inicial del proyecto."
      eyebrow="Error 404"
      title="La página que buscás no existe"
    />
  );
}

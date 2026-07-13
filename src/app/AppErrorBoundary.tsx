import { Component, type ErrorInfo, type ReactNode } from "react";

import { getActionButtonClassName } from "../components/ActionButton";
import { StatusScreen } from "../components/StatusScreen";
import { captureException } from "../lib/monitoring/errorTracking";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public state: AppErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    captureException(error, { componentStack: errorInfo.componentStack ?? "" });
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <StatusScreen
          actions={
            <button
              className={getActionButtonClassName({ size: "sm", variant: "brand" })}
              onClick={this.handleReload}
              type="button"
            >
              Recargar la página
            </button>
          }
          description="No pudimos mostrar esta pantalla correctamente. Recargá la página para volver a intentarlo."
          eyebrow="Error de carga"
          title="Algo salió mal"
        />
      );
    }

    return this.props.children;
  }
}

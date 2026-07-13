import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./app/App";
import { AppErrorBoundary } from "./app/AppErrorBoundary";
import { initializeErrorTracking } from "./lib/monitoring/errorTracking";
import { registerServiceWorker } from "./lib/pwa/registerServiceWorker";
import "./styles/index.css";

initializeErrorTracking();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);

registerServiceWorker();

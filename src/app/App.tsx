import { RouterProvider } from "react-router-dom";

import { AuthProvider } from "../features/auth/AuthProvider";
import { PwaUpdatePrompt } from "../lib/pwa/PwaUpdatePrompt";
import { AppQueryProvider } from "../lib/query/AppQueryProvider";
import { router } from "./router";

export function App() {
  return (
    <AppQueryProvider>
      <AuthProvider>
        <RouterProvider router={router} />
        <PwaUpdatePrompt />
      </AuthProvider>
    </AppQueryProvider>
  );
}

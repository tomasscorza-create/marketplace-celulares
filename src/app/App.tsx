import { RouterProvider } from "react-router-dom";

import { AuthProvider } from "../features/auth/AuthProvider";
import { AppQueryProvider } from "../lib/query/AppQueryProvider";
import { router } from "./router";

export function App() {
  return (
    <AppQueryProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </AppQueryProvider>
  );
}

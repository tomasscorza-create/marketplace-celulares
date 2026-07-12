import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Alias "@/" → src/. Mantener sincronizado con tsconfig.app.json paths.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/")
          ) {
            return "react-vendor";
          }

          if (id.includes("node_modules/react-router") || id.includes("@remix-run")) {
            return "router-vendor";
          }

          if (id.includes("node_modules/@supabase/")) {
            return "supabase-vendor";
          }

          if (id.includes("node_modules/@tanstack/")) {
            return "query-vendor";
          }

          if (id.includes("node_modules/three/")) {
            return "three-vendor";
          }

          return "vendor";
        },
      },
    },
  },
});

import { fileURLToPath, URL } from "node:url";

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, ".", "");
  const supabaseUrl = environment.VITE_SUPABASE_URL;
  const shouldPreconnectToSupabase =
    environment.VITE_ENABLE_REMOTE_BACKEND === "true" &&
    typeof supabaseUrl === "string" &&
    supabaseUrl.startsWith("https://");
  const supabaseOrigin = shouldPreconnectToSupabase ? new URL(supabaseUrl).origin : null;

  return {
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      manifest: {
        name: "Nyzca",
        short_name: "Nyzca",
        description: "Nyzca — Marketplace premium de celulares y accesorios.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#F8FAFC",
        theme_color: "#7F6BFF",
        orientation: "portrait-primary",
        icons: [
          { src: "/brand-mark.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: "/index.html",
      },
    }),
    {
      name: "supabase-preconnect",
      transformIndexHtml() {
        if (!supabaseOrigin) {
          return [];
        }

        return [
          {
            tag: "link",
            attrs: { rel: "preconnect", href: supabaseOrigin, crossorigin: "" },
            injectTo: "head",
          },
        ];
      },
    },
  ],
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
};
});

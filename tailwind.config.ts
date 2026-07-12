import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter Variable", "Inter", "system-ui", "sans-serif"],
        display: ["Manrope Variable", "Manrope", "Inter Variable", "system-ui", "sans-serif"],
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-up": "fadeInUp 0.4s ease-out both",
      },
      // Paleta de marca.
      // Usar estos tokens semanticos en lugar de hex hardcoded.
      //   brand-* -> CTAs primarias y estados positivos en verde.
      //   sun-*   -> acentos celestes: badges, focos y highlights.
      //   ocean-* -> textos, bordes y fondos neutros en grises.
      // El nivel "500" es el tono base de cada familia.
      // Cuando necesites un tinte que no exista, agregalo aca antes de
      // hardcodear `bg-[#xxxxxx]` en JSX.
      colors: {
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          300: "#6ee7b7",
          500: "#0f766e", // base
          700: "#047857",
          900: "#064e3b",
        },
        sun: {
          50: "#ecfeff",
          100: "#cffafe",
          300: "#67e8f9",
          500: "#0891b2", // base
          700: "#0e7490",
          900: "#164e63",
        },
        ocean: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#475569", // base
          600: "#334155",
          700: "#1e293b",
          800: "#0f172a",
          900: "#020617",
        },
      },
    },
  },
  plugins: [],
};

export default config;

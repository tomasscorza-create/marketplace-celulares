var config = {
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
                waMenuPop: {
                    "0%": { opacity: "0", transform: "scale(0.82) translateY(6px)" },
                    "65%": { opacity: "1", transform: "scale(1.04) translateY(-2px)" },
                    "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
                },
            },
            animation: {
                "fade-in-up": "fadeInUp 0.4s ease-out both",
                "wa-menu-pop": "waMenuPop 0.32s cubic-bezier(0.34, 1.56, 0.64, 1) both",
            },
            // Paleta de marca consolidada para Nyzca
            // Regla de grises:
            // - stone (nativo de tailwind): superficies, fondos y bordes.
            // - ocean: exclusivo para textos.
            colors: {
                whatsapp: "#25D366", // Verde oficial
                brand: {
                    50: "#f5f3ff",
                    100: "#ede9fe",
                    200: "#ddd6fe",
                    300: "#c4b5fd",
                    400: "#a78bfa",
                    500: "#7F6BFF", // Nyzca Violet (Primary)
                    600: "#7c3aed",
                    700: "#6d28d9",
                    800: "#5b21b6",
                    900: "#4c1d95",
                },
                ocean: {
                    50: "#f8fafc",
                    100: "#f1f5f9",
                    200: "#e2e8f0",
                    300: "#cbd5e1",
                    400: "#94a3b8",
                    500: "#475569",
                    600: "#334155",
                    700: "#1e293b",
                    800: "#0f172a",
                    900: "#020617",
                },
            },
            boxShadow: {
                // Sombras tintadas con stone-900 (28, 25, 23) para mayor calidez
                "elev-1": "0 1px 2px 0 rgba(28, 25, 23, 0.05)",
                "elev-2": "0 4px 6px -1px rgba(28, 25, 23, 0.08), 0 2px 4px -2px rgba(28, 25, 23, 0.04)",
                "elev-3": "0 10px 15px -3px rgba(28, 25, 23, 0.1), 0 4px 6px -4px rgba(28, 25, 23, 0.05)",
                "elev-glow": "0 0 20px -2px rgba(127, 107, 255, 0.3)", // Brand glow
                "elev-whatsapp": "0 8px 16px -4px rgba(37, 211, 102, 0.3)", // WhatsApp glow
            },
        },
    },
    plugins: [],
};
export default config;

import type { FlyerVariant, ManualFlyerSettings } from "./flyerTypes";

export const FLYER_EXPORT_HEIGHT = 1350;
export const FLYER_EXPORT_WIDTH = 1080;
export const FLYER_PREVIEW_SCALE = 0.237;

export const FLYER_TEXT_LIMITS = {
  eyebrow: 34,
  footerText: 92,
  headline: 82,
  highlight: 28,
};

export const FLYER_QR_SIZE_LIMITS = {
  max: 190,
  min: 96,
};

export const flyerVariants: FlyerVariant[] = [
  {
    accent: "#0f766e",
    background: "linear-gradient(145deg,#f0fdfa 0%,#ffffff 48%,#e0f2fe 100%)",
    eyebrow: "Catalogo local",
    headline: "Tecnología y accesorios al mejor precio",
    highlight: "Hecho localmente",
    layout: "mosaic",
  },
  {
    accent: "#475569",
    background: "linear-gradient(155deg,#e0f2fe 0%,#ffffff 46%,#ecfeff 100%)",
    eyebrow: "Mercado base",
    headline: "Descubri tiendas y oficios en un solo lugar",
    highlight: "Compra local",
    layout: "stack",
  },
  {
    accent: "#0891b2",
    background: "linear-gradient(150deg,#ecfeff 0%,#f8fafc 42%,#f8fafc 100%)",
    eyebrow: "Mercado base",
    headline: "Explora el catalogo y encontra tu proxima pieza",
    highlight: "Escanea el QR",
    layout: "poster",
  },
];

export const defaultManualFlyerSettings: ManualFlyerSettings = {
  eyebrowSize: 30,
  footerSize: 28,
  footerText: "Escanea el QR y entra al catalogo completo.",
  headlineColor: "#475569",
  headlineSize: 84,
  qrSize: 126,
  showStats: true,
};

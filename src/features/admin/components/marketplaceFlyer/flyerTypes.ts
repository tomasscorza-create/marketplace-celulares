export type FlyerImage = {
  categoryName: string;
  imageUrl: string | null;
  price: number;
  title: string;
};

export type FlyerLayout = "stack" | "mosaic" | "poster";

export type FlyerVariant = {
  accent: string;
  background: string;
  eyebrow: string;
  headline: string;
  highlight: string;
  layout: FlyerLayout;
};

export type FlyerState = {
  images: FlyerImage[];
  variant: FlyerVariant;
};

export type ManualFlyerSettings = {
  eyebrowSize: number;
  footerSize: number;
  footerText: string;
  headlineColor: string;
  headlineSize: number;
  qrSize: number;
  showStats: boolean;
};

export type FlyerStats = {
  activeArtisansCount: number;
  activeCategoriesCount: number;
  visibleProductsCount: number;
};

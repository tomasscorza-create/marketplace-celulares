import type {
  AdminArtisanProfile,
  AdminCategory,
  AdminDashboardProduct,
} from "../../../types/admin";
import type {
  FlyerState,
  FlyerStats,
  FlyerVariant,
  ManualFlyerSettings,
} from "./marketplaceFlyer/flyerTypes";

import { useEffect, useMemo, useRef, useState } from "react";
import { toJpeg } from "html-to-image";

import { buildPublicMarketplaceUrl } from "../../../lib/publicUrls";
import { createQrPngDataUrl } from "../../../lib/qrCode";
import { MarketplaceFlyerCanvas } from "./marketplaceFlyer/MarketplaceFlyerCanvas";
import { MarketplaceFlyerControls } from "./marketplaceFlyer/MarketplaceFlyerControls";
import { defaultManualFlyerSettings, flyerVariants } from "./marketplaceFlyer/flyerConfig";
import {
  downloadDataUrl,
  getFlyerImages,
  getRandomItem,
  waitForImages,
  waitForNextPaint,
} from "./marketplaceFlyer/flyerUtils";

type AdminMarketplaceFlyerGeneratorProps = {
  artisans: AdminArtisanProfile[];
  categories: AdminCategory[];
  isLoading?: boolean;
  products: AdminDashboardProduct[];
  visibleProductsCount: number;
};

export function AdminMarketplaceFlyerGenerator({
  artisans,
  categories,
  isLoading = false,
  products,
  visibleProductsCount,
}: AdminMarketplaceFlyerGeneratorProps) {
  const flyerRef = useRef<HTMLDivElement | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [flyerState, setFlyerState] = useState<FlyerState>(() => ({
    images: [],
    variant: flyerVariants[0],
  }));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [manualSettings, setManualSettings] = useState<ManualFlyerSettings>(
    defaultManualFlyerSettings,
  );
  const marketplaceUrl = useMemo(() => buildPublicMarketplaceUrl(), []);
  const stats: FlyerStats = useMemo(
    () => ({
      activeArtisansCount: artisans.filter((artisan) => !artisan.storefront_hidden_at).length,
      activeCategoriesCount: categories.filter((category) => category.is_active).length,
      visibleProductsCount,
    }),
    [artisans, categories, visibleProductsCount],
  );

  useEffect(() => {
    let isCancelled = false;

    const generateQr = async () => {
      const nextQr = await createQrPngDataUrl(marketplaceUrl, {
        margin: 2,
        width: 512,
      });

      if (!isCancelled) {
        setQrDataUrl(nextQr);
      }
    };

    void generateQr();

    return () => {
      isCancelled = true;
    };
  }, [marketplaceUrl]);

  useEffect(() => {
    if (flyerState.images.length > 0) {
      return;
    }

    const firstImages = getFlyerImages(products, artisans);

    if (firstImages.length > 0) {
      setFlyerState({
        images: firstImages,
        variant: flyerVariants[0],
      });
    }
  }, [artisans, flyerState.images.length, products]);

  const updateVariantField = <TKey extends keyof FlyerVariant>(
    field: TKey,
    value: FlyerVariant[TKey],
  ) => {
    setFlyerState((currentValue) => ({
      ...currentValue,
      variant: {
        ...currentValue.variant,
        [field]: value,
      },
    }));
  };

  const updateManualSetting = <TKey extends keyof ManualFlyerSettings>(
    field: TKey,
    value: ManualFlyerSettings[TKey],
  ) => {
    setManualSettings((currentValue) => ({
      ...currentValue,
      [field]: value,
    }));
  };

  const randomizeFlyer = () => {
    setFlyerState({
      images: getFlyerImages(products, artisans),
      variant: getRandomItem(flyerVariants, flyerVariants[0]),
    });
    setErrorMessage(null);
  };

  const handleDownloadFlyer = async () => {
    if (!qrDataUrl || isDownloading) {
      return;
    }

    setIsDownloading(true);
    setErrorMessage(null);

    try {
      await waitForNextPaint();

      if (!flyerRef.current) {
        throw new Error("No pudimos preparar el folleto.");
      }

      await waitForImages(flyerRef.current);

      const dataUrl = await toJpeg(flyerRef.current, {
        backgroundColor: "#fffaf2",
        cacheBust: true,
        pixelRatio: 2,
        quality: 0.95,
      });

      downloadDataUrl("folleto-marketplace-local.jpg", dataUrl);
    } catch {
      setErrorMessage("No pudimos generar el JPG. Proba de nuevo con otras imagenes.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ocean-400">
            Pieza descargable
          </p>
          <h2 className="mt-2 text-xl font-semibold text-stone-900">Folleto del catalogo</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Genera un JPG con imagenes del catalogo, datos actuales y QR al sitio.
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-stone-600">
            <span className="rounded-full bg-stone-100 px-3 py-1.5">
              {stats.visibleProductsCount} productos
            </span>
            <span className="rounded-full bg-stone-100 px-3 py-1.5">
              {stats.activeArtisansCount} vendedores
            </span>
            <span className="rounded-full bg-stone-100 px-3 py-1.5">
              {stats.activeCategoriesCount} categorias
            </span>
          </div>

          {errorMessage ? (
            <p className="mt-3 rounded-2xl border border-brand-500 bg-[#D1FAE5] px-3 py-2 text-sm text-brand-500">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-stone-300 sm:w-auto"
              disabled={isLoading || isDownloading}
              onClick={randomizeFlyer}
              type="button"
            >
              Generar diseno
            </button>

            <button
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-ocean-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-ocean-600 disabled:cursor-not-allowed disabled:bg-stone-300 sm:w-auto"
              disabled={isLoading || isDownloading || !qrDataUrl}
              onClick={() => void handleDownloadFlyer()}
              type="button"
            >
              {isDownloading ? "Descargando..." : "Descargar JPG"}
            </button>

            <button
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100 sm:w-auto"
              onClick={() => setIsCustomizerOpen((currentValue) => !currentValue)}
              type="button"
            >
              {isCustomizerOpen ? "Cerrar personalizacion" : "Personalizar"}
            </button>
          </div>
        </div>

        <MarketplaceFlyerCanvas
          flyerRef={flyerRef}
          flyerState={flyerState}
          manualSettings={manualSettings}
          marketplaceUrl={marketplaceUrl}
          qrDataUrl={qrDataUrl}
          stats={stats}
        />
      </div>

      {isCustomizerOpen ? (
        <MarketplaceFlyerControls
          flyerVariant={flyerState.variant}
          manualSettings={manualSettings}
          onManualSettingChange={updateManualSetting}
          onRandomize={randomizeFlyer}
          onVariantChange={updateVariantField}
        />
      ) : null}
    </section>
  );
}

import type { RefObject } from "react";
import type { FlyerState, FlyerStats, ManualFlyerSettings } from "./flyerTypes";

import { useEffect, useState } from "react";

import {
  FLYER_EXPORT_HEIGHT,
  FLYER_EXPORT_WIDTH,
  FLYER_PREVIEW_SCALE,
} from "./flyerConfig";
import { marketplaceConfig } from "../../../../config/marketplace";
import { formatFlyerPrice } from "./flyerUtils";

type MarketplaceFlyerCanvasProps = {
  flyerRef: RefObject<HTMLDivElement | null>;
  flyerState: FlyerState;
  manualSettings: ManualFlyerSettings;
  marketplaceUrl: string;
  qrDataUrl: string;
  stats: FlyerStats;
};

function ImageFallback({ cardHeight }: { cardHeight: number }) {
  return (
    <div
      style={{
        alignItems: "center",
        background: "linear-gradient(135deg,rgba(15,118,110,0.12),rgba(71,85,105,0.1))",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        minHeight: cardHeight,
      }}
    >
      <span style={{ color: "#475569", fontSize: 42, fontWeight: 800 }}>
        {marketplaceConfig.appName}
      </span>
    </div>
  );
}

export function MarketplaceFlyerCanvas({
  flyerRef,
  flyerState,
  manualSettings,
  marketplaceUrl,
  qrDataUrl,
  stats,
}: MarketplaceFlyerCanvasProps) {
  const [failedImageUrls, setFailedImageUrls] = useState<Set<string>>(() => new Set());
  const hasFlyerImages = flyerState.images.length > 0;
  const qrFrameSize = manualSettings.qrSize + 22;

  useEffect(() => {
    setFailedImageUrls(new Set());
  }, [flyerState.images]);

  return (
    <div className="mx-auto w-full max-w-[16rem] rounded-2xl border border-stone-200 bg-stone-50 p-2 shadow-inner">
      <div className="relative h-[320px] overflow-hidden rounded-xl">
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ transform: `scale(${FLYER_PREVIEW_SCALE})` }}
        >
          <div
            ref={flyerRef}
            style={{
              background: flyerState.variant.background,
              color: "#1f2937",
              fontFamily:
                "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif",
              height: FLYER_EXPORT_HEIGHT,
              overflow: "hidden",
              padding: 72,
              position: "relative",
              width: FLYER_EXPORT_WIDTH,
            }}
          >
            <div
              style={{
                backgroundColor: flyerState.variant.accent,
                borderRadius: 999,
                height: 360,
                opacity: 0.1,
                position: "absolute",
                right: -120,
                top: -120,
                width: 360,
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                position: "relative",
                zIndex: 1,
              }}
            >
              <div>
                <p
                  style={{
                    color: flyerState.variant.accent,
                    fontSize: manualSettings.eyebrowSize,
                    fontWeight: 800,
                    letterSpacing: 5,
                    margin: 0,
                    textTransform: "uppercase",
                  }}
                >
                  {flyerState.variant.eyebrow}
                </p>
                <h3
                  style={{
                    color: manualSettings.headlineColor,
                    fontFamily: "Manrope Variable, Manrope, Inter, ui-sans-serif, system-ui, sans-serif",
                    fontSize: manualSettings.headlineSize,
                    fontWeight: 700,
                    lineHeight: 0.96,
                    margin: "26px 0 0",
                    maxWidth: 760,
                  }}
                >
                  {flyerState.variant.headline}
                </h3>
              </div>

              <div
                style={{
                  alignItems: "center",
                  backgroundColor: "#ffffff",
                  border: "2px solid rgba(71,85,105,0.12)",
                  borderRadius: 28,
                  display: "flex",
                  height: qrFrameSize,
                  justifyContent: "center",
                  width: qrFrameSize,
                }}
              >
                {qrDataUrl ? (
                  <img
                    alt="QR catalogo"
                    src={qrDataUrl}
                    style={{
                      display: "block",
                      height: manualSettings.qrSize,
                      width: manualSettings.qrSize,
                    }}
                  />
                ) : null}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gap: 22,
                gridTemplateColumns:
                  flyerState.variant.layout === "stack"
                    ? "1fr"
                    : flyerState.variant.layout === "poster"
                      ? "1.15fr 0.85fr"
                      : "1fr 1fr",
                marginTop: 54,
                position: "relative",
                zIndex: 1,
              }}
            >
              {(hasFlyerImages ? flyerState.images : [0, 1, 2]).map((item, index) => {
                const image = typeof item === "number" ? null : item;
                const isHero = index === 0;
                const cardHeight =
                  flyerState.variant.layout === "stack" ? 250 : isHero ? 510 : 244;
                const imageFailed = Boolean(
                  image?.imageUrl && failedImageUrls.has(image.imageUrl),
                );

                return (
                  <div
                    key={`${image?.title ?? "placeholder"}-${index}`}
                    style={{
                      backgroundColor: "#ffffff",
                      border: "1px solid rgba(120,113,108,0.22)",
                      borderRadius: 34,
                      boxShadow: "0 30px 65px rgba(15,23,42,0.14)",
                      gridRow:
                        isHero && flyerState.variant.layout !== "stack" ? "span 2" : undefined,
                      height: cardHeight,
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    {image?.imageUrl && !imageFailed ? (
                      <img
                        alt={image.title}
                        crossOrigin="anonymous"
                        onError={() => {
                          if (!image.imageUrl) {
                            return;
                          }

                          setFailedImageUrls((currentValue) => {
                            const nextValue = new Set(currentValue);
                            nextValue.add(image.imageUrl ?? "");
                            return nextValue;
                          });
                        }}
                        src={image.imageUrl}
                        style={{
                          display: "block",
                          height: "100%",
                          objectFit: "cover",
                          width: "100%",
                        }}
                      />
                    ) : (
                      <ImageFallback cardHeight={cardHeight} />
                    )}

                    <div
                      style={{
                        background:
                          "linear-gradient(180deg,transparent 0%,rgba(0,0,0,0.68) 100%)",
                        bottom: 0,
                        color: "#ffffff",
                        left: 0,
                        padding: 28,
                        position: "absolute",
                        right: 0,
                      }}
                    >
                      <p style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
                        {image?.title ?? "Catalogo independiente"}
                      </p>
                      <p style={{ fontSize: 17, margin: "8px 0 0", opacity: 0.86 }}>
                        {image?.categoryName ?? "Piezas locales"}
                        {image?.price ? ` - ${formatFlyerPrice(image.price)}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                alignItems: "end",
                bottom: 66,
                display: "grid",
                gap: 24,
                gridTemplateColumns: manualSettings.showStats ? "1fr auto" : "1fr",
                left: 72,
                position: "absolute",
                right: 72,
              }}
            >
              <div>
                <p
                  style={{
                    color: flyerState.variant.accent,
                    fontSize: 28,
                    fontWeight: 800,
                    margin: 0,
                    textTransform: "uppercase",
                  }}
                >
                  {flyerState.variant.highlight}
                </p>
                <p
                  style={{
                    color: "#44403c",
                    fontSize: manualSettings.footerSize,
                    lineHeight: 1.35,
                    margin: "10px 0 0",
                  }}
                >
                  {manualSettings.footerText}
                </p>
                <p style={{ color: "#78716c", fontSize: 21, margin: "14px 0 0" }}>
                  {marketplaceUrl}
                </p>
              </div>

              {manualSettings.showStats ? (
                <div style={{ display: "flex", gap: 12 }}>
                  {[
                    `${stats.visibleProductsCount} piezas`,
                    `${stats.activeArtisansCount} tiendas`,
                    `${stats.activeCategoriesCount} rubros`,
                  ].map((label) => (
                    <span
                      key={label}
                      style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid rgba(120,113,108,0.2)",
                        borderRadius: 999,
                        color: "#475569",
                        fontSize: 19,
                        fontWeight: 800,
                        padding: "14px 18px",
                      }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

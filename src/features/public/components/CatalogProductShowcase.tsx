import { useEffect, useState } from "react";
import {
  RevealOnView,
  RevealSequenceGroup,
  RevealSequenceItem,
} from "../../../components/RevealOnView";
import type { PublicCatalogFeedItem } from "../../../types/public";
import { getPrimaryProductModel3D } from "../../../types/productMedia";
import { splitCatalogShowcaseItems } from "../catalogPageUtils";
import { CatalogProduct3DPreviewSlot } from "./CatalogProduct3DPreviewSlot";
import { CatalogProductFeedCard } from "./CatalogProductFeedCard";
import { CatalogPromotionBanner } from "./CatalogPromotionBanner";

type CatalogProductShowcaseProps = {
  featuredExtraAction?: {
    label: string;
    onClick?: () => void;
    to?: string;
  };
  isLiteMode?: boolean;
  isMobileViewport?: boolean;
  isSingleColumnViewport?: boolean;
  items: PublicCatalogFeedItem[];
  presentation?: "showcase" | "product-grid";
};

export function CatalogProductShowcase({
  featuredExtraAction,
  isLiteMode = false,
  isMobileViewport = false,
  isSingleColumnViewport = false,
  items,
  presentation = "showcase",
}: CatalogProductShowcaseProps) {
  const { featuredItem, supportingItems } = splitCatalogShowcaseItems(items);
  const eagerRevealRootMargin = "0px 0px 4% 0px";
  const supportingGridClassName = isSingleColumnViewport
    ? "grid grid-cols-1 content-start gap-3.5"
    : "grid grid-cols-2 content-start gap-3.5 sm:gap-4";
  const itemsWith3D = items.filter((item) => Boolean(getPrimaryProductModel3D(item.product.product_media)));
  const [active3DIndex, setActive3DIndex] = useState(0);

  useEffect(() => {
    if (itemsWith3D.length === 0) return;

    const rotationIntervalMs = 30 * 60 * 1000;
    const updateIndex = () => {
      const globalTimeSlice = Math.floor(Date.now() / rotationIntervalMs);
      setActive3DIndex(globalTimeSlice % itemsWith3D.length);
    };

    updateIndex();
    const interval = setInterval(updateIndex, 60_000);
    return () => clearInterval(interval);
  }, [itemsWith3D.length]);

  if (!featuredItem) {
    return null;
  }

  if (presentation === "product-grid") {
    return (
      <RevealSequenceGroup
        className="grid grid-cols-1 content-start gap-3.5 min-[520px]:grid-cols-2 sm:gap-4 xl:grid-cols-3"
        rootMargin={eagerRevealRootMargin}
        threshold={0.1}
      >
        {items.map((item, index) => (
          <RevealSequenceItem className="min-w-0" index={index} key={item.product.id} stepMs={64}>
            <CatalogProductFeedCard
              isLiteMode={isLiteMode}
              item={item}
              layout="default"
              priority={!isLiteMode && index < 3}
            />
          </RevealSequenceItem>
        ))}
      </RevealSequenceGroup>
    );
  }

  const preview3DItem = itemsWith3D.length > 0 ? itemsWith3D[active3DIndex] : featuredItem;

  return (
    <div className="grid gap-3.5 sm:gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] xl:items-start">
      <div className="grid min-w-0 gap-3.5 sm:gap-4">
        <RevealOnView
          className="min-w-0"
          delayMs={0}
          rootMargin={eagerRevealRootMargin}
          threshold={0.1}
        >
          <CatalogProductFeedCard
            featuredExtraAction={featuredExtraAction}
            isLiteMode={isLiteMode}
            item={featuredItem}
            layout="featured"
            priority={!isLiteMode}
          />
        </RevealOnView>

        <RevealOnView
          className="min-w-0"
          delayMs={90}
          rootMargin={eagerRevealRootMargin}
          threshold={0.1}
        >
          <CatalogProduct3DPreviewSlot
            isLiteMode={isLiteMode}
            isMobileViewport={isMobileViewport}
            item={preview3DItem}
          />
        </RevealOnView>
      </div>

      {supportingItems.length > 0 ? (
        <div className="grid min-w-0 content-start gap-3.5 sm:gap-4">
          <RevealSequenceGroup
            className={supportingGridClassName}
            rootMargin={eagerRevealRootMargin}
            threshold={0.1}
          >
            {supportingItems.map((item, index) => (
              <RevealSequenceItem className="min-w-0" index={index} key={item.product.id} stepMs={74}>
                {/* Las primeras 2 supporting cards son above-the-fold en desktop */}
                <CatalogProductFeedCard
                  isLiteMode={isLiteMode}
                  item={item}
                  layout="default"
                  priority={!isLiteMode && index < 2}
                />
              </RevealSequenceItem>
            ))}
          </RevealSequenceGroup>

          <CatalogPromotionBanner />
        </div>
      ) : null}
    </div>
  );
}

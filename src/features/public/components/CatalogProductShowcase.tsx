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
};

export function CatalogProductShowcase({
  featuredExtraAction,
  isLiteMode = false,
  isMobileViewport = false,
  isSingleColumnViewport = false,
  items,
}: CatalogProductShowcaseProps) {
  const { featuredItem, supportingItems } = splitCatalogShowcaseItems(items);
  const eagerRevealRootMargin = "0px 0px 4% 0px";
  const supportingGridClassName = isSingleColumnViewport
    ? "grid grid-cols-1 content-start gap-3.5"
    : "grid grid-cols-2 content-start gap-3.5 sm:gap-4";

  if (!featuredItem) {
    return null;
  }

  const preview3DItem =
    items.find((item) => Boolean(getPrimaryProductModel3D(item.product.product_media))) ??
    featuredItem;

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
      ) : null}
    </div>
  );
}

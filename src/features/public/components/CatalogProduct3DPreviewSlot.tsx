import { Link } from "react-router-dom";

import type { PublicCatalogFeedItem } from "../../../types/public";
import {
  getPrimaryProductModel3D,
  getProductImageMediaItems,
} from "../../../types/productMedia";
import { AddToCartButton } from "../../buyer/components/AddToCartButton";
import { ProductModel3DViewer } from "./ProductModel3DViewer";
import { isOnlinePurchaseEnabled } from "../../../config/marketplace";
import { WhatsAppProductButton } from "../../../components/WhatsAppProductButton";

type CatalogProduct3DPreviewSlotProps = {
  isLiteMode?: boolean;
  isMobileViewport?: boolean;
  item: PublicCatalogFeedItem;
};

const priceFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
});

export function CatalogProduct3DPreviewSlot({
  isLiteMode = false,
  isMobileViewport = false,
  item,
}: CatalogProduct3DPreviewSlotProps) {
  const { product } = item;
  const categoryLabel = product.categories?.name ?? "General";
  const model3D = getPrimaryProductModel3D(product.product_media);
  const imageMediaItems = getProductImageMediaItems(product.product_media);
  const imagePoster =
    model3D?.poster_url ??
    model3D?.thumbnail_url ??
    imageMediaItems[0]?.thumbnail_url ??
    imageMediaItems[0]?.url ??
    product.image_urls[0] ??
    product.image_url ??
    null;
  const priceLabel = `$${priceFormatter.format(Number(product.price))}`;
  const isMadeToOrder = product.availability_mode === "made_to_order";
  const isSoldOut = !isMadeToOrder && Number(product.stock_quantity ?? 0) <= 0;

  return (
    <aside
      aria-label={`Vista destacada de ${product.title}`}
      className="catalog-card group relative aspect-square min-w-0 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-ocean-300 hover:shadow-[0_20px_44px_-34px_rgba(15,23,42,0.34)]"
      data-testid="catalog-product-3d-preview-slot"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,_rgba(236,254,255,0.95),_rgba(240,253,250,0.78)_34%,_rgba(255,255,255,0.96)_72%)]" />
      {model3D ? (
        <ProductModel3DViewer
          controlsLevel={isLiteMode || isMobileViewport ? "compact" : "full"}
          isLiteMode={isLiteMode}
          modelUrl={model3D.url}
          posterUrl={imagePoster}
          title={product.title}
        />
      ) : null}
      <div className="absolute inset-x-5 bottom-16 h-px bg-gradient-to-r from-transparent via-ocean-200 to-transparent" />

      <span className="absolute left-3 top-3 z-10 max-w-[70%] truncate rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-ocean-600 shadow-sm backdrop-blur-sm sm:text-[10px]">
        {categoryLabel}
      </span>

      <div className="pointer-events-none relative z-[2] grid h-full grid-rows-[1fr_auto] p-3 sm:p-4">
        {model3D ? (
          <div aria-hidden="true" />
        ) : (
          <div className="grid min-h-0 place-items-center [perspective:850px]">
            <div
              aria-hidden="true"
              className="relative h-[42%] w-[42%] min-w-24 max-w-40 transition-transform duration-500 ease-out [transform-style:preserve-3d] [transform:rotateX(58deg)_rotateZ(-36deg)] group-hover:[transform:rotateX(58deg)_rotateZ(-28deg)]"
            >
              <div className="absolute inset-0 rounded-xl bg-ocean-600 shadow-[0_22px_38px_-22px_rgba(15,23,42,0.75)] [transform:translateZ(34px)]" />
              <div className="absolute inset-0 rounded-xl bg-brand-500/95 [transform:rotateX(90deg)_translateZ(34px)] [transform-origin:bottom]" />
              <div className="absolute inset-0 rounded-xl bg-ocean-800/95 [transform:rotateY(90deg)_translateZ(34px)] [transform-origin:right]" />
              <div className="absolute left-[16%] top-[20%] h-[18%] w-[68%] rounded-sm bg-white/85 [transform:translateZ(35px)]" />
              <div className="absolute bottom-[20%] left-[18%] h-[18%] w-[28%] rounded-sm bg-sun-500 [transform:translateZ(35px)]" />
              <div className="absolute bottom-[20%] right-[18%] h-[18%] w-[28%] rounded-sm bg-white/85 [transform:translateZ(35px)]" />
            </div>
          </div>
        )}

        <div className="pointer-events-auto min-w-0 rounded-xl border border-white/70 bg-white/88 px-3 py-2 shadow-sm backdrop-blur-sm">
          <p className="line-clamp-1 text-sm font-medium leading-5 text-stone-900">
            {product.title}
          </p>
          <div className="mt-1.5 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1.5">
            <p className="text-sm font-semibold leading-none text-stone-950">
              {priceLabel}
            </p>
            <Link
              className="inline-flex h-7 items-center justify-center rounded-md border border-ocean-200 bg-white px-2.5 text-[11px] font-semibold text-ocean-700 transition-colors hover:bg-ocean-50"
              to={`/producto/${product.id}`}
            >
              Ver
            </Link>
            {!isOnlinePurchaseEnabled ? (
              <WhatsAppProductButton
                product={{
                  id: product.id,
                  title: product.title,
                  price: Number(product.price),
                }}
                variant="compact"
                className="inline-flex h-7 min-w-[4.8rem] items-center justify-center rounded-md bg-ocean-600 px-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-ocean-700 disabled:cursor-not-allowed disabled:opacity-50"
                label={isSoldOut ? "Consultar" : "WhatsApp"}
              />
            ) : (
              <AddToCartButton
                className="inline-flex h-7 min-w-[4.8rem] items-center justify-center rounded-md bg-ocean-600 px-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-ocean-700 disabled:cursor-not-allowed disabled:opacity-50"
                compact
                disabled={isSoldOut}
                disabledLabel="Sin stock"
                labels={{
                  added: "Carrito",
                  buyerOnlyNotice: "Ingresa como comprador para comprar",
                  idle: "Comprar",
                  login: "Ingresar",
                  pending: "...",
                }}
                product={product}
              />
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

import {
  getCatalogImageSrcSet,
  getOptimizedCatalogImageUrl,
} from "../../lib/images/catalogImageUrl";

type OrderProductThumbnailProps = {
  alt: string;
  imageUrl: string | null;
};

export function OrderProductThumbnail({ alt, imageUrl }: OrderProductThumbnailProps) {
  return (
    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-stone-100 sm:h-12 sm:w-12">
      {imageUrl ? (
        <img
          alt={alt}
          className="h-full w-full object-cover"
          decoding="async"
          height={48}
          loading="lazy"
          sizes="48px"
          src={getOptimizedCatalogImageUrl(imageUrl, 96, 55)}
          srcSet={getCatalogImageSrcSet(imageUrl, [80, 96, 128], 55)}
          width={48}
        />
      ) : null}
    </div>
  );
}

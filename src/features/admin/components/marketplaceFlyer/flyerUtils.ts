import type {
  AdminArtisanProfile,
  AdminDashboardProduct,
} from "../../../../types/admin";
import type { FlyerImage } from "./flyerTypes";

export function getRandomItem<TItem>(items: TItem[], fallback: TItem) {
  return items[Math.floor(Math.random() * items.length)] ?? fallback;
}

export function getShuffledItems<TItem>(items: TItem[]) {
  const shuffledItems = [...items];

  for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(Math.random() * (index + 1));
    [shuffledItems[index], shuffledItems[targetIndex]] = [
      shuffledItems[targetIndex],
      shuffledItems[index],
    ];
  }

  return shuffledItems;
}

export function formatFlyerPrice(value: number) {
  return `$${Number(value).toLocaleString("es-AR")}`;
}

export function limitFlyerText(value: string, maxLength: number) {
  return value.slice(0, maxLength);
}

export function getFlyerImages(
  products: AdminDashboardProduct[],
  artisans: AdminArtisanProfile[],
): FlyerImage[] {
  const visibleArtisanIds = new Set(
    artisans.filter((artisan) => !artisan.storefront_hidden_at).map((artisan) => artisan.id),
  );
  const productImages = getShuffledItems(
    products
      .filter(
        (product) =>
          product.is_active &&
          product.image_url &&
          (visibleArtisanIds.size === 0 || visibleArtisanIds.has(product.artisan_id)),
      )
      .map((product) => ({
        categoryName: product.categories?.name ?? "Producto independiente",
        imageUrl: product.image_url,
        price: Number(product.price),
        title: product.title,
      })),
  );

  if (productImages.length >= 3) {
    return productImages.slice(0, 3);
  }

  const artisanImages = getShuffledItems(
    artisans
      .filter((artisan) => !artisan.storefront_hidden_at && artisan.profile_image_url)
      .map((artisan) => ({
        categoryName: "Tienda independientel",
        imageUrl: artisan.profile_image_url,
        price: 0,
        title: artisan.store_name || artisan.full_name,
      })),
  );

  return [...productImages, ...artisanImages].slice(0, 3);
}

export function waitForNextPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

export async function waitForImages(element: HTMLElement) {
  const images = Array.from(element.querySelectorAll("img"));

  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          image.onload = () => resolve();
          image.onerror = () => {
            window.requestAnimationFrame(() => resolve());
          };
        }),
    ),
  );
}

export function downloadDataUrl(filename: string, dataUrl: string) {
  const link = document.createElement("a");

  link.href = dataUrl;
  link.download = filename;
  link.click();
}

/* global URL, caches, fetch, self */

const CACHE_VERSION = "v5";
const STATIC_CACHE = `neutral-marketplace-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `neutral-marketplace-runtime-${CACHE_VERSION}`;
const ASSET_CACHE = `neutral-marketplace-assets-${CACHE_VERSION}`;
const IMAGE_CACHE = `neutral-marketplace-images-${CACHE_VERSION}`;
const IMAGE_CACHE_LIMIT = 160;
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/brand-mark.svg",
  "/pwa-192.png",
  "/pwa-192.png",
  "/pwa-512.png",
  "/apple-touch-icon.png",
];

function shouldCacheResponse(response, options = {}) {
  if (!response) {
    return false;
  }

  if (options.allowOpaque && response.type === "opaque") {
    return true;
  }

  return response.status === 200 && (response.type === "basic" || response.type === "cors");
}

async function trimCache(cacheName, maxEntries) {
  if (!maxEntries) {
    return;
  }

  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  const overflow = keys.length - maxEntries;

  if (overflow <= 0) {
    return;
  }

  await Promise.all(keys.slice(0, overflow).map((key) => cache.delete(key)));
}

async function cacheResponse(cacheName, request, response, options = {}) {
  if (shouldCacheResponse(response, options)) {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
    await trimCache(cacheName, options.maxEntries);
  }
}

async function networkFirst(request, fallbackUrl) {
  try {
    const response = await fetch(request);
    await cacheResponse(RUNTIME_CACHE, request, response);
    return response;
  } catch {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    return caches.match(fallbackUrl);
  }
}

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);
  await cacheResponse(ASSET_CACHE, request, response);
  return response;
}

async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  const networkFetch = fetch(request)
    .then(async (response) => {
      await cacheResponse(RUNTIME_CACHE, request, response);
      return response;
    })
    .catch(() => cachedResponse);

  return cachedResponse ?? networkFetch;
}

async function networkFirstImage(request) {
  try {
    const response = await fetch(request);
    await cacheResponse(IMAGE_CACHE, request, response, {
      allowOpaque: true,
      maxEntries: IMAGE_CACHE_LIMIT,
    });
    return response;
  } catch {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    throw new Error("Image unavailable");
  }
}

function isRemoteProductImage(url) {
  return (
    url.hostname.endsWith(".supabase.co") &&
    (
      url.pathname.includes("/storage/v1/object/public/artisan-product-images/") ||
      url.pathname.includes("/storage/v1/render/image/public/artisan-product-images/")
    )
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![STATIC_CACHE, RUNTIME_CACHE, ASSET_CACHE, IMAGE_CACHE].includes(key))
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "/index.html"));
    return;
  }

  if (url.origin !== self.location.origin) {
    if (request.destination === "image" && isRemoteProductImage(url)) {
      event.respondWith(networkFirstImage(request));
    }

    return;
  }

  if (
    url.pathname.startsWith("/assets/") ||
    request.destination === "font" ||
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "worker"
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (
    request.destination === "image" ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/pwa-192.png" ||
    url.pathname === "/pwa-192.png" ||
    url.pathname === "/pwa-512.png" ||
    url.pathname === "/apple-touch-icon.png"
  ) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

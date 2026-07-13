import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const serviceWorkerPath = path.join(distDir, "sw.js");
const MAX_PRECACHE_JS_FILES = 20;
const MAX_PRECACHE_JS_BYTES = 900_000;

if (!existsSync(serviceWorkerPath)) {
  console.error("PWA audit failed: dist/sw.js does not exist. Run the production build first.");
  process.exit(1);
}

const serviceWorker = readFileSync(serviceWorkerPath, "utf8");
const precacheCallStart = serviceWorker.indexOf("precacheAndRoute([");
const precacheCallEnd = serviceWorker.indexOf("]", precacheCallStart);

if (precacheCallStart < 0 || precacheCallEnd < 0) {
  console.error("PWA audit failed: the Workbox precache manifest was not found.");
  process.exit(1);
}

const precacheManifest = serviceWorker.slice(precacheCallStart, precacheCallEnd + 1);
const precachedUrls = [...precacheManifest.matchAll(/url:"([^"]+)"/g)].map((match) => match[1]);
const precachedJavaScript = precachedUrls.filter((url) => url.endsWith(".js"));
const missingFiles = [];
let precachedJavaScriptBytes = 0;

for (const url of precachedJavaScript) {
  const filePath = path.join(distDir, ...url.split("/"));

  if (!existsSync(filePath)) {
    missingFiles.push(url);
    continue;
  }

  precachedJavaScriptBytes += statSync(filePath).size;
}

const forbiddenEntries = precachedJavaScript.filter(
  (url) =>
    url.includes("three-vendor") ||
    /\/(Admin|Artisan|Buyer|Product|Catalog)[A-Z][^/]*\.js$/.test(url),
);
const oversizedNonShellEntries = precachedUrls.filter(
  (url) => url.includes("argentinaGeo") || url.endsWith(".woff2"),
);
const failures = [];

if (missingFiles.length > 0) failures.push(`missing files: ${missingFiles.join(", ")}`);
if (forbiddenEntries.length > 0) {
  failures.push(`lazy or 3D chunks in precache: ${forbiddenEntries.join(", ")}`);
}
if (oversizedNonShellEntries.length > 0) {
  failures.push(`non-shell assets in precache: ${oversizedNonShellEntries.join(", ")}`);
}
if (!serviceWorker.includes("nyzca-runtime-assets-v1")) {
  failures.push("the bounded runtime asset cache is missing");
}
if (precachedJavaScript.length > MAX_PRECACHE_JS_FILES) {
  failures.push(
    `${precachedJavaScript.length} JavaScript files exceed the limit of ${MAX_PRECACHE_JS_FILES}`,
  );
}
if (precachedJavaScriptBytes > MAX_PRECACHE_JS_BYTES) {
  failures.push(
    `${Math.round(precachedJavaScriptBytes / 1000)} kB of precached JavaScript exceeds the ${Math.round(MAX_PRECACHE_JS_BYTES / 1000)} kB limit`,
  );
}

console.log(
  `PWA precache: ${precachedUrls.length} files; ${precachedJavaScript.length} JavaScript files (${Math.round(precachedJavaScriptBytes / 1000)} kB).`,
);

if (failures.length > 0) {
  failures.forEach((failure) => console.error(`PWA audit failed: ${failure}.`));
  process.exit(1);
}

console.log("PWA precache audit passed.");

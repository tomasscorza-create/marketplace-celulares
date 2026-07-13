import sharp from "sharp";
import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dir, "..");
const src = path.join(root, "public", "brand-mark.svg");
const out = path.join(root, "public");

const srcBuffer = readFileSync(src);

// Sizes for standard icons
const icons = [
  { size: 16, name: "favicon-16x16.png" },
  { size: 32, name: "favicon-32x32.png" },
  { size: 180, name: "apple-touch-icon.png" },
  { size: 192, name: "pwa-192.png" },
  { size: 512, name: "pwa-512.png" }
];

for (const { size, name } of icons) {
  await sharp(srcBuffer)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(out, name));
  console.log(`✓ ${name}`);
}

// Generate favicon.ico
async function buildIco(srcBuf, sizes) {
  const images = await Promise.all(
    sizes.map((size) =>
      sharp(srcBuf)
        .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer()
    )
  );

  const HEADER_SIZE = 6;
  const DIR_ENTRY_SIZE = 16;
  const headerAndDir = HEADER_SIZE + DIR_ENTRY_SIZE * sizes.length;
  let offset = headerAndDir;
  const entries = images.map((buf, i) => {
    const size = sizes[i];
    const entry = { size, buf, offset };
    offset += buf.length;
    return entry;
  });

  const totalSize = offset;
  const ico = Buffer.alloc(totalSize);

  ico.writeUInt16LE(0, 0);
  ico.writeUInt16LE(1, 2);
  ico.writeUInt16LE(sizes.length, 4);

  entries.forEach(({ size, buf, offset }, i) => {
    const base = HEADER_SIZE + i * DIR_ENTRY_SIZE;
    ico.writeUInt8(size >= 256 ? 0 : size, base);
    ico.writeUInt8(size >= 256 ? 0 : size, base + 1);
    ico.writeUInt8(0, base + 2);
    ico.writeUInt8(0, base + 3);
    ico.writeUInt16LE(1, base + 4);
    ico.writeUInt16LE(32, base + 6);
    ico.writeUInt32LE(buf.length, base + 8);
    ico.writeUInt32LE(offset, base + 12);
  });

  entries.forEach(({ buf, offset }) => buf.copy(ico, offset));
  return ico;
}

const ico = await buildIco(srcBuffer, [16, 32, 48]);
writeFileSync(path.join(out, "favicon.ico"), ico);
console.log("✓ favicon.ico (16×16 + 32×32 + 48×48)");

// Generate OG Cover Image (1200x630)
await sharp({
  create: {
    width: 1200,
    height: 630,
    channels: 4,
    background: { r: 127, g: 107, b: 255, alpha: 1 } // #7F6BFF
  }
})
  .composite([
    { input: await sharp(srcBuffer).resize(256, 256).toBuffer(), gravity: "center" }
  ])
  .png()
  .toFile(path.join(out, "og-cover.png"));
console.log("✓ og-cover.png");

console.log("\nListo. Archivos generados en /public.");

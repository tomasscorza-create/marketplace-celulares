// Genera favicon-16x16.png, favicon-32x32.png y favicon.ico
// desde assets-source/extracted-logo.png (1284×1261, RGBA).
// Uso: node scripts/generate-favicons.mjs

import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dir, "..");
const src = path.join(root, "assets-source", "extracted-logo.png");
const out = path.join(root, "public");

// ── PNG sizes ──────────────────────────────────────────────────────────────
const pngSizes = [16, 32];

for (const size of pngSizes) {
  await sharp(src)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(out, `favicon-${size}x${size}.png`));
  console.log(`✓ favicon-${size}x${size}.png`);
}

// ── favicon.ico (multi-size: 16, 32, 48) ──────────────────────────────────
// ICO format: header + directory + BMP/PNG data per size.
// Usamos PNG data dentro del ICO (soportado por todos los browsers modernos).
async function buildIco(src, sizes) {
  const images = await Promise.all(
    sizes.map((size) =>
      sharp(src)
        .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer()
    )
  );

  const HEADER_SIZE = 6;
  const DIR_ENTRY_SIZE = 16;
  const headerAndDir = HEADER_SIZE + DIR_ENTRY_SIZE * sizes.length;

  // Calculate offsets
  let offset = headerAndDir;
  const entries = images.map((buf, i) => {
    const size = sizes[i];
    const entry = { size, buf, offset };
    offset += buf.length;
    return entry;
  });

  const totalSize = offset;
  const ico = Buffer.alloc(totalSize);

  // ICO header
  ico.writeUInt16LE(0, 0);       // reserved
  ico.writeUInt16LE(1, 2);       // type: 1 = ICO
  ico.writeUInt16LE(sizes.length, 4); // count

  // Directory entries
  entries.forEach(({ size, buf, offset }, i) => {
    const base = HEADER_SIZE + i * DIR_ENTRY_SIZE;
    ico.writeUInt8(size >= 256 ? 0 : size, base);      // width
    ico.writeUInt8(size >= 256 ? 0 : size, base + 1);  // height
    ico.writeUInt8(0, base + 2);   // color count
    ico.writeUInt8(0, base + 3);   // reserved
    ico.writeUInt16LE(1, base + 4);  // planes
    ico.writeUInt16LE(32, base + 6); // bit count
    ico.writeUInt32LE(buf.length, base + 8);  // size of image data
    ico.writeUInt32LE(offset, base + 12);     // offset of image data
  });

  // Image data
  entries.forEach(({ buf, offset }) => buf.copy(ico, offset));

  return ico;
}

const ico = await buildIco(src, [16, 32, 48]);
writeFileSync(path.join(out, "favicon.ico"), ico);
console.log("✓ favicon.ico (16×16 + 32×32 + 48×48)");

console.log("\nListo. Archivos generados en /public.");

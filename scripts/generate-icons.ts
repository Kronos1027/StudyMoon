/**
 * One-off icon generator for StudyMoon PWA.
 * Renders the brand SVG at required sizes using sharp.
 * Run: npx tsx scripts/generate-icons.ts
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const moonSvg = (pad: number) => {
  const inner = `
    <path d="M40.5 8.6a24 24 0 1 0 14.9 33.9A19.5 19.5 0 0 1 40.5 8.6Z"
      fill="url(#body)" stroke="#6d5dfc" stroke-width="1.5" stroke-linejoin="round"/>
    <circle cx="24" cy="26" r="2.1" fill="#8f86d9" opacity="0.85"/>
    <circle cx="30" cy="38" r="1.5" fill="#8f86d9" opacity="0.7"/>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="512" height="512">
  <defs>
    <linearGradient id="body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e9eaf6"/>
      <stop offset="100%" stop-color="#b9bdff"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="#0b0d1c"/>
  <g transform="translate(${pad} ${pad}) scale(${(64 - 2 * pad) / 64})">
    <circle cx="32" cy="32" r="29" fill="#6d5dfc" opacity="0.16"/>
    ${inner}
  </g>
</svg>`;
};

async function main() {
  const outDir = path.join(process.cwd(), "public", "icons");
  await mkdir(outDir, { recursive: true });

  const targets: Array<{ file: string; size: number; svg: string }> = [
    { file: "icon-192.png", size: 192, svg: moonSvg(0) },
    { file: "icon-512.png", size: 512, svg: moonSvg(0) },
    { file: "maskable-512.png", size: 512, svg: moonSvg(7) },
    { file: "apple-touch-icon.png", size: 180, svg: moonSvg(0) },
  ];

  for (const t of targets) {
    await sharp(Buffer.from(t.svg))
      .resize(t.size, t.size)
      .png()
      .toFile(path.join(outDir, t.file));
    console.log(`generated public/icons/${t.file} (${t.size}x${t.size})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

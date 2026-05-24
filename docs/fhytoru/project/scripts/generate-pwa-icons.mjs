/**
 * Generates PWA / Apple icons and splash screens from vector markup (sharp).
 * Run: node scripts/generate-pwa-icons.mjs
 */

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.join(import.meta.dirname, "..");
const publicDir = path.join(root, "public");

/** Brand: primary #b8763e, page #faf6f0 — abstract open book + depth lines */
const iconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#b8763e"/>
  <path fill="#faf6f0" opacity="0.95" d="M256 118c-48 0-92 22-118 58v236c0 12 10 22 22 22 38 0 72-14 96-36 24 22 58 36 96 36 12 0 22-10 22-22V176c-26-36-70-58-118-58zm0 52c28 0 54 10 74 26v188c-20-16-46-26-74-26s-54 10-74 26V196c20-16 46-26 74-26z"/>
  <path fill="#3d342b" opacity="0.22" d="M256 170v62c16-4 32-6 48-6s32 2 48 6v-62c-15-10-32-16-48-16s-33 6-48 16z"/>
</svg>`;

async function writeVectorPng(size, filename) {
  const buf = await sharp(Buffer.from(iconSvg)).resize(size, size).png().toBuffer();
  await fs.writeFile(path.join(publicDir, filename), buf);
}

async function writeSplash(width, height, filename) {
  const iconInner = await sharp(Buffer.from(iconSvg)).resize(220, 220).png().toBuffer();
  const left = Math.round((width - 220) / 2);
  const top = Math.round(height * 0.36);
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: "#faf6f0",
    },
  })
    .composite([{ input: iconInner, left, top }])
    .png()
    .toFile(path.join(publicDir, filename));
}

async function writeInstallStep(filename, label, detail) {
  const w = 320;
  const h = 200;
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="100%" height="100%" fill="#faf6f0"/>
  <rect x="16" y="16" width="${w - 32}" height="${h - 32}" rx="16" fill="#f3e8dc" stroke="#b8763e" stroke-opacity="0.45"/>
  <text x="24" y="52" font-family="system-ui,sans-serif" font-size="15" font-weight="600" fill="#3d342b">${label}</text>
  <text x="24" y="82" font-family="system-ui,sans-serif" font-size="12" fill="#5c5248">${detail}</text>
</svg>`;
  const dir = path.join(publicDir, "install");
  await fs.mkdir(dir, { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(path.join(dir, filename));
}

async function main() {
  await fs.mkdir(publicDir, { recursive: true });
  await writeVectorPng(512, "icon-512.png");
  await writeVectorPng(192, "icon-192.png");
  await writeVectorPng(180, "apple-touch-icon.png");
  await writeSplash(1290, 2796, "splash-1290x2796.png");
  await writeSplash(1179, 2556, "splash-1179x2556.png");
  await writeInstallStep(
    "step-share.png",
    "步骤 1",
    "轻触 Safari 底栏分享按钮",
  );
  await writeInstallStep(
    "step-add.png",
    "步骤 2",
    "向下滚动找到添加到主屏幕",
  );
  await writeInstallStep(
    "step-done.png",
    "步骤 3",
    "点击添加完成安装",
  );
  console.log("Wrote PWA icons + splash + install steps to public/");
}

await main();

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

await mkdir('public/brand', { recursive: true });
const { data, info } = await sharp('nxlogo1b1.jpg').removeAlpha().raw().toBuffer({ resolveWithObject: true });
const rgba = Buffer.alloc(info.width * info.height * 4);
// The pale mint paper is nearly neutral; the fruit and dark lettering retain their original pixels.
for (let i = 0; i < info.width * info.height; i++) {
  const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
  const darkness = 255 - Math.min(r, g, b); const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  const alpha = Math.max(0, Math.min(1, (Math.max(darkness - 36, chroma * 1.65 - 32)) / 30));
  rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = Math.round(alpha * 255);
}
const full = await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } }).extract({ left: 94, top: 390, width: 932, height: 305 }).png().toBuffer();
await sharp(full).trim().toFile('public/brand/logo.png');
await sharp(full).trim().webp({ lossless: true }).toFile('public/brand/logo.webp');
const mark = await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } }).extract({ left: 94, top: 390, width: 305, height: 305 }).png().toBuffer();
await sharp(mark).trim().png().toFile('public/brand/mark.png');
await sharp('public/brand/mark.png').resize(128, 128, { fit: 'contain', background: '#00000000' }).png().toFile('public/brand/favicon.png');
await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#f6f8f3' } }).composite([{ input: await sharp(full).resize(920).toBuffer(), gravity: 'centre' }]).jpeg({ quality: 90 }).toFile('public/brand/share.jpg');
console.log('Logo 已抠图：透明完整字标、独立图形、图标、分享图。');

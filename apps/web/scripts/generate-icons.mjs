import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../public/icons');
const size = 512;
const half = size / 2;

const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4F46E5"/>
      <stop offset="100%" stop-color="#7C3AED"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size / 8}" fill="url(#bg)"/>
  <polygon points="${half},${size * 0.1} ${size * 0.9},${size * 0.5} ${half},${size * 0.9}" fill="rgba(255,255,255,0.08)"/>
  <polygon points="${size * 0.1},${size * 0.3} ${size * 0.7},${size * 0.3} ${size * 0.4},${size * 0.7}" fill="rgba(255,255,255,0.05)"/>
  <text x="${size * 0.35}" y="${size * 0.62}" font-family="Inter,sans-serif" font-size="${size * 0.4}" font-weight="800" fill="white">E</text>
  <text x="${size * 0.58}" y="${size * 0.62}" font-family="Inter,sans-serif" font-size="${size * 0.4}" font-weight="800" fill="#A5B4FC">P</text>
  <circle cx="${size * 0.85}" cy="${size * 0.2}" r="${size * 0.06}" fill="rgba(255,255,255,0.15)"/>
</svg>`;

await Promise.all([
  sharp(Buffer.from(svg)).resize(192, 192).png().toFile(path.join(outDir, 'icon-192x192.png')),
  sharp(Buffer.from(svg)).resize(512, 512).png().toFile(path.join(outDir, 'icon-512x512.png')),
]);

console.log('Icons generated successfully!');

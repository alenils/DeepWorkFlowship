import fs from 'fs';
import { createCanvas } from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

// Generate icon function
function generateIcon(size, color, text, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Fill background
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);

  // Add text
  const fontSize = Math.floor(size / 4);
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, size / 2, size / 2);

  // Save file
  const out = fs.createWriteStream(path.join(publicDir, filename));
  const stream = canvas.createPNGStream();
  stream.pipe(out);
  out.on('finish', () => console.log(`Created ${filename}`));
}

// Generate PWA icons
generateIcon(192, '#1E293B', 'DW', 'pwa-192x192.png');
generateIcon(512, '#1E293B', 'DW', 'pwa-512x512.png');
generateIcon(180, '#1E293B', 'DW', 'apple-touch-icon.png');
generateIcon(16, '#1E293B', 'DW', 'favicon.ico');

// Create a simple SVG mask icon
const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
  <rect width="16" height="16" fill="#1E293B"/>
  <text x="8" y="11" font-family="Arial" font-weight="bold" font-size="10" text-anchor="middle" fill="white">DW</text>
</svg>
`;
fs.writeFileSync(path.join(publicDir, 'mask-icon.svg'), svgIcon);
console.log('Created mask-icon.svg'); 
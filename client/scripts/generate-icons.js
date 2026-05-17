/**
 * scripts/generate-icons.js
 * Generates PWA icons using canvas.
 * Run: node scripts/generate-icons.js
 */

const fs   = require('fs');
const path = require('path');

// Create icons directory
const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

// Generate SVG icon (used as base)
function makeSVG(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#0a0a0f"/>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#00e5a0" opacity="0.15"/>
  <text x="50%" y="54%" font-size="${size * 0.55}" text-anchor="middle" dominant-baseline="middle" font-family="system-ui">🛒</text>
  <text x="50%" y="84%" font-size="${size * 0.12}" text-anchor="middle" dominant-baseline="middle" font-family="system-ui, sans-serif" fill="#00e5a0" font-weight="bold">HAAT</text>
</svg>`;
}

// Save SVG icons (GitHub Pages can serve these)
fs.writeFileSync(path.join(iconsDir, 'icon-192.svg'), makeSVG(192));
fs.writeFileSync(path.join(iconsDir, 'icon-512.svg'), makeSVG(512));

console.log('✓ SVG icons generated in public/icons/');
console.log('  For PNG icons, use: https://realfavicongenerator.net');
console.log('  Upload public/icons/icon-512.svg to generate all sizes.');

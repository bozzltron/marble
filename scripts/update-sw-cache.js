const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const filesToHash = [
  'public/mozworth.webp',
  'public/mozworth-debut.webp',
  'public/mozworth-walking-the-cow-cover.webp',
  'public/postcard_cover.webp',
  'public/goodbye_colorado_cover.webp',
  'public/boz4web.jpg',
  'public/logo.jpg',
  'public/mozworth.png',
  'public/apple-touch-icon.png',
  'public/favicon-32x32.png',
  'public/favicon-16x16.png',
  'public/bandcamp.svg',
  'public/instagram.svg',
  'public/youtube.svg',
  'public/facebook.svg',
  'public/soundcloud.svg',
  'public/tiktok.svg',
  'public/apple-music.svg',
  'public/amazon-music.svg',
  'public/tidal.svg',
  'public/bluesky.svg',
  'public/bandsintown.svg',
];

let hash = crypto.createHash('sha256');
for (const file of filesToHash) {
  hash.update(fs.readFileSync(path.resolve(__dirname, '..', file)));
}
const cacheHash = hash.digest('hex').slice(0, 12); // Shorten for readability

// Read sw.js, replace the cache name line
const swPath = path.resolve(__dirname, '../public/sw.js');
let swContent = fs.readFileSync(swPath, 'utf8');
swContent = swContent.replace(
  /const CACHE_NAME = "mozworth-v[0-9a-zA-Z]+";/,
  `const CACHE_NAME = "mozworth-v${cacheHash}";`
);
fs.writeFileSync(swPath, swContent);

console.log(`Updated CACHE_NAME to mozworth-v${cacheHash}`); 
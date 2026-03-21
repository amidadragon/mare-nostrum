#!/usr/bin/env node
// build.mjs — Bundle and minify all game JS into a single file for itch.io dist
import { buildSync } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, 'dist');

// JS load order from index.html (excluding libs — those stay separate)
const JS_FILES = [
  'engine.js', 'sound.js', 'narrative.js', 'cinematics.js',
  'fishing.js', 'farming.js', 'npc.js', 'events.js',
  'world.js', 'player.js', 'ui.js', 'sketch.js',
  'wreck.js', 'menu.js', 'islands.js', 'diving.js',
  'combat.js', 'economy.js', 'debug.js', 'multiplayer.js', 'mobile.js',
];

// 1. Concatenate all JS files
let combined = '';
for (const f of JS_FILES) {
  const path = join(__dirname, f);
  combined += `// === ${f} ===\n`;
  combined += readFileSync(path, 'utf8');
  combined += '\n';
}

// Write combined file for esbuild to consume
const tmpFile = join(DIST, '_combined.js');
mkdirSync(DIST, { recursive: true });
writeFileSync(tmpFile, combined);

// 2. Run esbuild minification
const outFile = join(DIST, 'game.min.js');
buildSync({
  entryPoints: [tmpFile],
  outfile: outFile,
  bundle: false,        // already concatenated, no module resolution needed
  minify: true,
  target: ['es2020'],
  sourcemap: false,
});

// Clean up temp file
const { unlinkSync } = await import('fs');
unlinkSync(tmpFile);

// 3. Read original index.html and rewrite for single bundle
let html = readFileSync(join(__dirname, 'index.html'), 'utf8');

// Remove all individual game script tags (keep p5 libs)
html = html.replace(/\s*<script src="(engine|sound|narrative|cinematics|fishing|farming|npc|events|world|player|ui|sketch|wreck|menu|islands|diving|combat|economy|debug|multiplayer|mobile)\.js[^"]*"><\/script>/g, '');

// Insert single bundle before the inline scripts
html = html.replace(
  /(\n\s*<script>\n\s*\/\/ Hide loading)/,
  `\n  <script src="game.min.js"></script>$1`
);

writeFileSync(join(DIST, 'index.html'), html);

// 4. Copy static assets
const ASSETS = [
  'libs/p5.min.js', 'libs/p5.sound.min.js',
  'libs/cinzel-latin.woff2', 'libs/cinzel-latin-ext.woff2',
  'menu_bg.webp', 'favicon.ico', 'manifest.json',
  'icon-72.png', 'icon-96.png', 'icon-128.png', 'icon-144.png',
  'icon-152.png', 'icon-192.png', 'icon-384.png', 'icon-512.png',
  'sounds/ambient_ocean.flac', 'sounds/ambient_birds.mp3',
  'sounds/ambient_wind.wav', 'sounds/ambient_rain.ogg',
  'sounds/ambient_fire.ogg', 'sounds/ambient_crickets.mp3',
  'sounds/sfx_step_sand.ogg', 'sounds/sfx_step_stone.ogg',
  'sounds/sfx_hit.wav', 'sounds/sfx_splash.wav',
  'sounds/sfx_harvest.ogg', 'sounds/sfx_build.ogg',
  'sounds/sfx_coin.wav', 'sounds/sfx_levelup.mp3',
];

for (const a of ASSETS) {
  const dest = join(DIST, a);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(join(__dirname, a), dest);
}

// 5. Generate dist-specific service worker (caches game.min.js instead of individual files)
const distSW = `const CACHE_NAME = 'mare-nostrum-v6';
const ASSETS = [
  'index.html',
  'libs/p5.min.js',
  'libs/p5.sound.min.js',
  'libs/cinzel-latin.woff2',
  'libs/cinzel-latin-ext.woff2',
  'game.min.js',
  'menu_bg.webp',
  'favicon.ico',
  'manifest.json',
  'sounds/ambient_ocean.flac',
  'sounds/ambient_birds.mp3',
  'sounds/ambient_wind.wav',
  'sounds/ambient_rain.ogg',
  'sounds/ambient_fire.ogg',
  'sounds/ambient_crickets.mp3',
  'sounds/sfx_step_sand.ogg',
  'sounds/sfx_step_stone.ogg',
  'sounds/sfx_hit.wav',
  'sounds/sfx_splash.wav',
  'sounds/sfx_harvest.ogg',
  'sounds/sfx_build.ogg',
  'sounds/sfx_coin.wav',
  'sounds/sfx_levelup.mp3',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
`;
writeFileSync(join(DIST, 'sw.js'), distSW);

// Report sizes
const { statSync } = await import('fs');
const rawSize = JS_FILES.reduce((sum, f) => sum + statSync(join(__dirname, f)).size, 0);
const minSize = statSync(outFile).size;
console.log(`Bundled ${JS_FILES.length} files:`);
console.log(`  Raw:      ${(rawSize / 1024).toFixed(0)} KB`);
console.log(`  Minified: ${(minSize / 1024).toFixed(0)} KB (${((1 - minSize / rawSize) * 100).toFixed(0)}% reduction)`);
console.log(`Output: dist/index.html + dist/game.min.js`);

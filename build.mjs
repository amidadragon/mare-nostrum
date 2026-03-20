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
  'combat.js', 'economy.js', 'debug.js',
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
html = html.replace(/\s*<script src="(engine|sound|narrative|cinematics|fishing|farming|npc|events|world|player|ui|sketch|wreck|menu|islands|diving|combat|economy|debug)\.js[^"]*"><\/script>/g, '');

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
  'menu_bg.webp', 'favicon.ico', 'manifest.json', 'sw.js',
];

for (const a of ASSETS) {
  const dest = join(DIST, a);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(join(__dirname, a), dest);
}

// Report sizes
const { statSync } = await import('fs');
const rawSize = JS_FILES.reduce((sum, f) => sum + statSync(join(__dirname, f)).size, 0);
const minSize = statSync(outFile).size;
console.log(`Bundled ${JS_FILES.length} files:`);
console.log(`  Raw:      ${(rawSize / 1024).toFixed(0)} KB`);
console.log(`  Minified: ${(minSize / 1024).toFixed(0)} KB (${((1 - minSize / rawSize) * 100).toFixed(0)}% reduction)`);
console.log(`Output: dist/index.html + dist/game.min.js`);

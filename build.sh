#!/usr/bin/env bash
set -euo pipefail

VERSION="1.0.0"
DIST_DIR="$(cd "$(dirname "$0")" && pwd)/dist"
ZIP_NAME="mare-nostrum-v${VERSION}.zip"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Step 1: Run esbuild bundler to create minified dist/
echo "=== Bundling with esbuild ==="
node "$PROJECT_DIR/build.mjs"

# Step 2: Verify core dist files exist
REQUIRED_FILES=(
  index.html
  game.min.js
  libs/p5.min.js
  libs/p5.sound.min.js
  libs/cinzel-latin.woff2
  libs/cinzel-latin-ext.woff2
  menu_bg.webp
  favicon.ico
  manifest.json
  sw.js
  icon-72.png
  icon-96.png
  icon-128.png
  icon-144.png
  icon-152.png
  icon-192.png
  icon-384.png
  icon-512.png
  logo.png
)

for f in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$DIST_DIR/$f" ]; then
    echo "ERROR: Missing dist file: $f" >&2
    exit 1
  fi
done

rm -f "$DIST_DIR/$ZIP_NAME"

# Step 3: Zip all dist contents (includes sounds/, sprites/sheets/, sprites/characters/)
cd "$DIST_DIR"
zip -r "$ZIP_NAME" . --exclude "*.zip" --exclude "_combined.js"

echo ""
echo "Built: dist/$ZIP_NAME"
zip -sf "$ZIP_NAME" | tail -5
echo "Total files: $(zip -sf "$ZIP_NAME" | wc -l)"

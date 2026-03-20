#!/usr/bin/env bash
set -euo pipefail

VERSION="1.0.0"
DIST_DIR="$(cd "$(dirname "$0")" && pwd)/dist"
ZIP_NAME="mare-nostrum-v${VERSION}.zip"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Step 1: Run esbuild bundler to create minified dist/
echo "=== Bundling with esbuild ==="
node "$PROJECT_DIR/build.mjs"

# Step 2: Zip from dist/ (minified single-bundle version)
DIST_FILES=(
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
)

# Verify all dist files exist
for f in "${DIST_FILES[@]}"; do
  if [ ! -f "$DIST_DIR/$f" ]; then
    echo "ERROR: Missing dist file: $f" >&2
    exit 1
  fi
done

rm -f "$DIST_DIR/$ZIP_NAME"

# Create zip from dist directory
cd "$DIST_DIR"
zip "$ZIP_NAME" "${DIST_FILES[@]}"

echo ""
echo "Built: dist/$ZIP_NAME"
echo "Files: ${#DIST_FILES[@]}"
zip -sf "$ZIP_NAME"

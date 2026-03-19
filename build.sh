#!/usr/bin/env bash
set -euo pipefail

VERSION="1.0.0"
DIST_DIR="$(cd "$(dirname "$0")" && pwd)/dist"
ZIP_NAME="mare-nostrum-v${VERSION}.zip"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

FILES=(
  index.html
  sketch.js
  sound.js
  combat.js
  diving.js
  economy.js
  islands.js
  narrative.js
  engine.js
  debug.js
  cinematics.js
  menu.js
  menu_bg.webp
  favicon.ico
  manifest.json
  sw.js
)

# Verify all files exist
for f in "${FILES[@]}"; do
  if [ ! -f "$PROJECT_DIR/$f" ]; then
    echo "ERROR: Missing file: $f" >&2
    exit 1
  fi
done

# Create dist directory
mkdir -p "$DIST_DIR"
rm -f "$DIST_DIR/$ZIP_NAME"

# Create flat zip (no subdirectory)
cd "$PROJECT_DIR"
zip -j "$DIST_DIR/$ZIP_NAME" "${FILES[@]}"

echo ""
echo "Built: dist/$ZIP_NAME"
echo "Files: ${#FILES[@]}"
zip -sf "$DIST_DIR/$ZIP_NAME"

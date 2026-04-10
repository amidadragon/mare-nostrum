#!/bin/bash
# Double-click this to fix git lock + start dev server
cd "$(dirname "$0")"
echo "=== Mare Nostrum V2 — Fix & Serve ==="
echo ""

# Remove stale git lock file if it exists
if [ -f .git/index.lock ]; then
  rm -f .git/index.lock
  echo "[OK] Removed stale .git/index.lock"
else
  echo "[OK] No git lock file found"
fi

echo ""
echo "Starting dev server on http://localhost:8888"
echo "Open that URL in Chrome to test the game."
echo "Press Ctrl+C to stop the server."
echo ""
python3 -m http.server 8888

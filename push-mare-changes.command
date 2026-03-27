#!/bin/bash
cd "$(dirname "$0")"
echo "=== Pushing Mare Nostrum changes ==="
git push origin lod-world
echo ""
echo "=== Done! Press any key to close ==="
read -n 1

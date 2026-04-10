#!/bin/bash
# Double-click this file to start the Mare Nostrum dev server
cd "$(dirname "$0")"
echo "Starting Mare Nostrum dev server on http://localhost:8888"
echo "Press Ctrl+C to stop."
echo ""
python3 -m http.server 8888

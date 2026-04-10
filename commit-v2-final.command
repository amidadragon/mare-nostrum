#!/bin/bash
# Double-click to commit V2 Phase 1 — removes ALL stale lock files first
cd "$(dirname "$0")"

echo "=== Mare Nostrum V2 — Final Commit ==="
echo ""

# Remove ALL stale git lock files
find .git -name "*.lock" -delete 2>/dev/null
echo "[OK] Cleaned all git lock files"

# Stage all V2 files
git add \
  expansion.js \
  index.html \
  lifecycle.js \
  nations.js \
  progression.js \
  save.js \
  sketch.js \
  agent.js \
  graph.js \
  mediterranean.js \
  swarm-integration.js \
  world-state.js \
  v2-safety.js \
  test-swarm.js \
  test-world-state.js \
  fix-and-serve.command \
  start-server.command \
  commit-v2-phase1.command \
  commit-v2-final.command

if [ $? -ne 0 ]; then
  echo "[ERROR] git add failed"
  echo "Press any key to close..."
  read -n 1
  exit 1
fi
echo "[OK] Files staged"

# Commit
git commit -m "V2 Phase 1: Unified WorldState, Swarm AI, and crash fixes

Replace the buggy swapToIsland() pattern with a stack-safe WorldState
manager that holds all 27 island states independently. Patch all 4 major
swap call sites (bot rendering, bot update, expansion, nation economy).

Add swarm intelligence background engine: 88 AI agents across 8 factions
with personality-driven decision making (recruit, trade, lobby_war, etc.)
running on a 151-node Mediterranean world graph with 1036 edges.

Key changes:
- world-state.js: Unified island state manager with safe nested swaps
- agent.js: Swarm agent personality model (8 traits, beliefs, memory)
- graph.js: In-memory graph database with typed/weighted edges
- mediterranean.js: Real Mediterranean map data and faction definitions
- swarm-integration.js: Background engine wiring agents into game loop
- v2-safety.js: Early-load safety stubs to prevent setup() crashes
- Guard all updatePortPositions() calls with typeof checks
- Nuke stale service workers on load + bump all cache versions
- All tests pass (WorldState 10-point suite, Swarm integration suite)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

if [ $? -eq 0 ]; then
  echo ""
  echo "[OK] Committed successfully!"
  git log --oneline -1
else
  echo ""
  echo "[ERROR] Commit failed — check output above"
fi

echo ""
echo "Press any key to close..."
read -n 1

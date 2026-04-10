#!/bin/bash
# Double-click to commit V2 Phase 1 changes
cd "$(dirname "$0")"

echo "=== Committing Mare Nostrum V2 Phase 1 ==="

# Remove any stale lock files
rm -f .git/index.lock 2>/dev/null

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
  commit-v2-phase1.command

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

echo ""
if [ $? -eq 0 ]; then
  echo "[OK] Committed successfully!"
  echo ""
  echo "To push: git push origin main"
  git log --oneline -1
else
  echo "[ERROR] Commit failed"
fi
echo ""
echo "Press any key to close..."
read -n 1

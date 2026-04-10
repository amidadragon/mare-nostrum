#!/bin/bash
# Double-click to commit V2 Phase 3 — swarm wars, betrayals, notification filtering
cd "$(dirname "$0")"

echo "=== Mare Nostrum V2 — Phase 3 Commit ==="
echo ""

# Remove ALL stale git lock files
find .git -name "*.lock" -delete 2>/dev/null
echo "[OK] Cleaned all git lock files"

# Stage Phase 3 modified files
git add \
  swarm-integration.js \
  index.html \
  input.js \
  commit-v2-phase3.command

if [ $? -ne 0 ]; then
  echo "[ERROR] git add failed"
  echo "Press any key to close..."
  read -n 1
  exit 1
fi
echo "[OK] Files staged"

# Commit
git commit -m "V2 Phase 3: Swarm-driven wars, betrayals, and notification relevance filter

Bridge swarm agent campaign/betrayal decisions into real game-state mutations.
Filter notifications so players only see events involving them, allies, or enemies.

Key changes:
- swarm-integration.js: _isSwarmEventRelevantToPlayer() filters notifications by
  player faction, allies, and war enemies — neutral-vs-neutral events suppressed
- swarm-integration.js: plan_campaign case triggers actual war declarations when
  campaign readiness >= 3: pushes to nation.wars arrays, updates relations,
  fires startNationRaid() against the player
- swarm-integration.js: plot_betrayal case breaks alliances when plot count >= 3:
  sets allied=false, tanks relations to -50, applies reputation/aggression penalties
  when player is the betrayal target
- swarm-integration.js: Routine events (recruit, lobby, trade, omens) filtered
  through relevance check; wars and betrayals always shown
- input.js: Route mouseWheel, mousePressed, mouseDragged, mouseReleased, and
  keyPressed to swarm screen handlers when gameScreen === 'swarm'
- index.html: Bump all cache versions to 1783000000

All Phase 3 functions verified in browser: 8/8 relevance filter tests pass,
notification bridge confirmed, zero console errors.

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

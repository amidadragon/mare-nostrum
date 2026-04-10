#!/bin/bash
# Double-click to commit V2 Phase 4 — AI territorial expansion
cd "$(dirname "$0")"

echo "=== Mare Nostrum V2 — Phase 4 Commit ==="
echo ""

# Remove ALL stale git lock files
find .git -name "*.lock" -delete 2>/dev/null
echo "[OK] Cleaned all git lock files"

# Stage Phase 4 modified files
git add \
  nations.js \
  ui.js \
  save.js \
  index.html \
  commit-v2-phase4.command

if [ $? -ne 0 ]; then
  echo "[ERROR] git add failed"
  echo "Press any key to close..."
  read -n 1
  exit 1
fi
echo "[OK] Files staged"

# Commit
git commit -m "V2 Phase 4: AI territorial expansion — factions claim and contest world islands

AI factions now expand beyond their capitals by claiming neutral world islands
and seizing enemy territories during wartime. The world map reflects ownership
with faction-colored markers.

Key changes:
- nations.js: AI territorial expansion in updateNationDaily() — factions with
  military >= 3 and level >= 3 can claim unowned non-capital world islands;
  personality-driven preferences (traders prefer economic, aggressors prefer
  military islands); claim cooldown based on personality (5-10 days)
- nations.js: Wartime territory seizure — factions at war with military >= 5
  can steal enemy territories (5% chance * aggression per day); stolen player
  islands are properly removed from state._controlledIslands
- nations.js: state._worldIslandOwners map tracks faction→island ownership;
  per-faction _territories array for quick lookup; events logged to swarm
  chronicle via _logSwarmFactionEvent()
- ui.js: World map (drawWorldMap) renders AI-owned islands with faction
  bannerColor from FACTIONS constant; shows island name + faction owner label
- save.js: Persist _worldIslandOwners across save/load
- index.html: Bump all cache versions to 1784000000

19 non-capital islands available for territorial control across 8 factions.
All functions verified in browser: ownership tracking, seizure logic, zero errors.

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
echo "--- Now pushing to remote... ---"
echo ""

git push origin lod-world

if [ $? -eq 0 ]; then
  echo ""
  echo "[OK] Pushed successfully!"
else
  echo ""
  echo "[ERROR] Push failed — check output above"
fi

echo ""
echo "Press any key to close..."
read -n 1

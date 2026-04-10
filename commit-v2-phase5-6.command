#!/bin/bash
cd "$(dirname "$0")"
# Remove any stale git lock files
find .git -name "*.lock" -delete 2>/dev/null
echo "=== Committing Phase 5-6: Territory bonuses, victory wiring, quest tracker, menu hitbox ==="
git add nations.js sketch.js ui.js menu.js diplomacy.js index.html commit-v2-phase5-6.command
git commit -m "Feature: territory income bonuses, victory trigger wiring, quest tracker & menu hitbox polish

Phase 5: AI and player factions now earn ongoing gold/resources from owned world islands.
  - nations.js: territory bonus income per island type (economic/resource/military/diplomatic)
  - sketch.js: player territory income with periodic notification
Phase 5b: Victory conditions now properly trigger via triggerVictory().
  - diplomacy.js: AI territorial domination warning when faction controls 10+ islands
  - nations.js: checkVictoryConditions result now fed to triggerVictory()
Phase 6: Polish fixes.
  - ui.js: quest tracker expanded, dynamic char clipping, better progress bar
  - menu.js: hitbox detection now accounts for slide-in animation offset
  - index.html: cache bust to 1785000000

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

echo "=== Pushing to origin ==="
git push origin HEAD
echo ""
echo "Done. Press any key to close..."
read -n 1

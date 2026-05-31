#!/bin/bash
cd "$(dirname "$0")"
# Remove any stale git lock files
find .git -name "*.lock" -delete 2>/dev/null
echo "=== Committing: Fix player northwest drift bug ==="
git add sketch.js faction_select.js index.html commit-v2-drift-fix.command
git commit -m "Fix: player no longer drifts northwest after faction select

Root cause: selectFaction() repositioned player but didn't clear
click-to-move target (targetX/targetY), causing residual auto-walk.
Also fixed startConquestGame/start1v1Game setting introPhase=null
instead of 'done', which caused the first click during faction
select to be eaten by skipIntro() instead of reaching the handler.

Changes:
  - faction_select.js: clear targetX/targetY/vx/vy after player reposition
  - sketch.js: startConquestGame & start1v1Game now set introPhase='done'
  - sketch.js: clear movement state in both game mode init functions
  - index.html: cache bust to 1786000000

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

echo "=== Pushing to origin ==="
git push origin HEAD
echo ""
echo "Done. Press any key to close..."
read -n 1

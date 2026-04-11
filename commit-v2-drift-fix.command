#!/bin/bash
cd "$(dirname "$0")"
# Remove any stale git lock files
find .git -name "*.lock" -delete 2>/dev/null
echo "=== Committing: Fix player northwest drift bug ==="
git add bot.js sketch.js faction_select.js index.html commit-v2-drift-fix.command
git commit -m "Fix: player no longer drifts northwest when playing non-Rome factions

Root cause: Rome's bot AI (bot.js) used state.player for movement, but
when the human plays as Carthage/Egypt/etc, Rome becomes an AI nation
whose island has _usesGlobalState=true. The WorldState.withIsland() swap
was skipped, so BotAI.executeTask() drove the HUMAN player's targetX/Y
instead of the bot's leader — causing immediate northwest drift.

Fix: bot.js executeTask() now reads the bot's own islandState.player
instead of state.player, with a safety check that prevents any bot
from ever writing to the human player object.

Also fixed:
  - sketch.js: startConquestGame/start1v1 set introPhase='done' (was null)
  - sketch.js: clear targetX/targetY/velocity on game mode init
  - faction_select.js: clear movement state after player reposition

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

echo "=== Pushing to origin ==="
git push origin HEAD
echo ""
echo "Done. Press any key to close..."
read -n 1

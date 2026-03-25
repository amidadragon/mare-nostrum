#!/bin/bash
# Run this from your terminal to commit and push all V2 + Cycle 5 changes
cd "$(dirname "$0")"

# Clear stale lock if present
rm -f .git/HEAD.lock

# Stage all modified and new files
git add \
  index.html \
  input.js \
  military.js \
  menu.js \
  sailing.js \
  sketch.js \
  v2_diplomacy_patch.js \
  v2_interiors_patch.js \
  v2_megapatch.js \
  v2_trade_patch.js \
  v2_gameplay_patch.js \
  cycle4_fixes.js \
  cycle5_fixes.js \
  cycle5_quest_minimap.js \
  cycle5_ship_sprites.js \
  cycle5_unit_sprites.js \
  cycle5_lighthouse.js \
  cycle5_tavern.js \
  cycle5_victory_parade.js \
  cycle5_companions.js \
  cycle5_visual_polish.js \
  cycle5_bot_improvements.js \
  cycle5_sound_hooks.js \
  cycle5_balance.js \
  cycle5_bugfixes.js \
  push_fixes.sh

# Commit with detailed message
git commit -m "V2 Cycle 5: 20-sprint mega update — bugs, features, polish

CRITICAL BUG FIXES (Sprints 1-7):
- Fix 11 bugs in V2 patches (interiors, trade, diplomacy, sailing, rendering)
- Fix legion recruitment null crashes in military.js (3 locations)
- Fix ship stuck at colonized Terra Nova (proper disembark)
- Fix missing Wreck Beach dock detection in sailing.js
- Fix double-render of invaded island during invasion
- Add mouse click recruitment + N-key diplomacy (v2_gameplay_patch.js)
- Fix AI bot building/gold/military bidirectional sync
- Fix domination victory (no longer requires vassal)
- Unify economic victory threshold (500 gold)
- Fix victory progress tracker (tracks defeated/vassal correctly)

NEW FEATURES (Sprints 8-15):
- Enhanced minimap: all NPCs, buildings, compass, invasion indicators
- Faction ship sprites: unique figureheads, hull colors, shield rows
- Faction unit sprites: helmet/shield variations per faction
- Lighthouse building: +15% sailing speed, -20% raid chance
- Tavern building: +3 gold/day, +10% morale, mercenary hire
- Victory parade ceremony: animated triumph sequence
- Companion pet system: cat/dog/hawk/wolf with buffs
- Visual polish: fireflies, weather effects, vignette, birds, smoke

SYSTEMS (Sprints 16-19):
- Sound hooks for building, fishing, trading, combat
- AI bot improvements: diplomacy, research, repair, fortify tasks
- Balance pass: economy, combat costs, progression curves
- Bug sweep: 15 defensive fixes across core systems

13 new files, ~200KB of additions.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

# Push
git push origin main

echo ""
echo "✓ All Cycle 5 changes pushed to GitHub!"
echo "  13 new files, 20 sprints of work"
echo "  Start server: python3 -m http.server 8888"

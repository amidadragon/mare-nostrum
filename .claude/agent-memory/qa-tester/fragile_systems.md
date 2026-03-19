---
name: fragile_systems
description: High-risk areas prone to regressions in Mare Nostrum
type: project
---

# Fragile Systems

## 1. Narrative Flag System
All quest objectives using `interact:` require manual flag setting in code. There is NO automatic flag-setting on discovery/events. Each new interact objective must be paired with `state.narrativeFlags['flag_name'] = true` in the appropriate handler. This has been fixed for all 7 Chapters VII-X flags as of 2026-03-18 audit. Easy to break again with new objectives.

## 2. Save/Load Field Parity
`saveGame()` and `loadGame()` are manually maintained parallel lists. New state fields must be added to BOTH. Known omissions after 2026-03-18 audit pass 4:
- Island loot states now saved — but Hyperborea uses wrong field name (iceNodes vs frostNodes — BUG-026)
- player.xpBoost / xpBoostTimer not saved (BUG-029)
- Crafted resources: steel, marble, perfume, scrolls not saved (unused currently)
Check both functions any time state is extended.

## 3. Conquest Error Recovery (sketch.js:1312)
The catch block that fires "Too many conquest errors" partially resets state. Root causes: NaN propagation from null target references. Every new enemy type needs NaN guards on spawn position.

## 4. `expandIsland()` variable scoping
CRITICAL PATTERN: `let cx`/`cy` declarations must appear BEFORE all milestone building blocks. As of 2026-03-18 they are declared AFTER (BUG-017) causing ReferenceError at levels 5/10/15/20. After any future edit to expandIsland(), verify variable declarations are before all usage.

## 5. Island Particle Arrays (islands.js)
Vulcan `ambientAsh`, Hyperborea `snowflakes`, Necropolis `wisps` are filtered each frame only when the island is `active`. If update logic ever changes to always-run, particles accumulate unbounded.

## 6. `_combatLastEnemyCount` in combat.js
Global var tracking enemy count for XP. `exitConquest()` zeroing `enemies = []` triggers XP grant for all live enemies — systematic XP exploit via fast exit.

## 7. Chapter X Heart Threshold
`rite_mare_nostrum` fires at hearts >= 8 (sketch.js) but `all_hearts_max` objective checks >= 10 (narrative.js:121). These must stay in sync. Currently they are mismatched (BUG-018).

## 8. Quarrier unlock double-notification on legacy saves
If `quarrierUnlocked` is absent from save (pre-quarrier save), loadGame defaults to `false`. Next `updateQuarrier` call at level 5+ will re-show "Quarrier joined!" notification. This is a cosmetic annoyance. Migration path: if `d.quarrierUnlocked === undefined && d.islandLevel >= 5` then set `q.unlocked = true` silently.

## 9. Distant island rendering — "Distant" functions pattern
Pattern established in audit pass 4: horizon-clamped distant rendering functions exist as `drawArenaIsleDistant()` and `drawConquestIsleDistant()`. When adding new island rendering, ALWAYS check that the new distant-rendering function is actually wired into the draw loop. BUG-024 and BUG-025 are examples of functions created but never called.

## 10. Island state field naming consistency
Hyperborea: state field is `frostNodes` but save/load used `iceNodes` (BUG-026). When saving island loot, cross-reference the field name against `initState()`. Do not invent names — copy from the object literal.

## 11. Island interact handler location (as of 2026-03-19 visual redesign)
`handleVulcanInteract`, `handleHyperboreInteract`, `handlePlentyInteract`, `handleNecropolisInteract` were moved from sketch.js to islands.js (+276 lines). Call sites remain in sketch.js keyPressed at lines 18517/18521/18525/18529. If any future modularization moves these again, ensure both the function definitions AND the call sites are updated together.

## 12. `shakeTimer` global used in islands.js
islands.js uses the `shakeTimer` global (declared at sketch.js:186). This is safe as long as islands.js is loaded after sketch.js. Do not rename or localize this variable.

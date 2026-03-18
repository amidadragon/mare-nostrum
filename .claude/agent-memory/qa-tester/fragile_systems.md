---
name: fragile_systems
description: High-risk areas prone to regressions in Mare Nostrum
type: project
---

# Fragile Systems

## 1. Narrative Flag System
All quest objectives using `interact:` require manual flag setting in code. There is NO automatic flag-setting on discovery/events. Each new interact objective must be paired with `state.narrativeFlags['flag_name'] = true` in the appropriate handler. This has been fixed for all 7 Chapters VII-X flags as of 2026-03-18 audit. Easy to break again with new objectives.

## 2. Save/Load Field Parity
`saveGame()` and `loadGame()` are manually maintained parallel lists. New state fields must be added to BOTH. Known omissions after 2026-03-18 audit:
- Island states: vulcan/hyperborea/plenty/necropolis exploration progress not saved
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

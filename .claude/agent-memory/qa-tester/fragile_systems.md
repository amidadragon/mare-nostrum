---
name: fragile_systems
description: High-risk areas prone to regressions in Mare Nostrum
type: project
---

# Fragile Systems

## 1. Narrative Flag System
All quest objectives using `interact:` require manual flag setting in code. There is NO automatic flag-setting on discovery/events. Each new interact objective must be paired with `state.narrativeFlags['flag_name'] = true` in the appropriate handler. This has been missed for 7 flags (chapters VII-X). Easy to miss on new additions.

## 2. Save/Load Field Parity
`saveGame()` and `loadGame()` are manually maintained parallel lists. New state fields must be added to BOTH. Known omissions: `colonySpec`, new island visited states (vulcan/hyperborea/plenty/necropolis phase, resource collection states). Check both functions any time state is extended.

## 3. Conquest Error Recovery (sketch.js:1312)
The catch block that fires "Too many conquest errors" partially resets state. It's a band-aid over NaN propagation. Root causes: enemy position calculations when `dist()` is called with NaN inputs, which can cascade from a null target reference. Every new enemy type needs NaN guards on spawn position.

## 4. Economy colonySpec
`state.colonySpec` is a plain object `{}` that economy.js reads via `state.colonySpec['conquest']`. It is never saved. Any feature that reads colony specialization silently returns `undefined` after a reload, breaking trade income multipliers and mining bonuses.

## 5. Island Particle Arrays (islands.js)
Vulcan `ambientAsh`, Hyperborea `snowflakes`, Necropolis `wisps` are filtered each frame only when the island is `active`. If the game ever calls their update functions while inactive (shouldn't happen currently), particles accumulate unbounded. Monitor if update logic is ever refactored to always-run.

## 6. `_combatLastEnemyCount` in combat.js
Global var tracking enemy count for XP. Resets to 0 on page load (var declaration line 220). If `updateCombatSystem` is called before `state.conquest` is initialized, `enemies.length` will be 0, `_combatLastEnemyCount` stays 0, no issue. But `exitConquest()` zeroing `enemies = []` will trigger XP grant for all live enemies — this is a systematic XP exploit via fast exit.

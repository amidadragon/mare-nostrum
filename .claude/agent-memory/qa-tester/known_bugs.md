---
name: known_bugs
description: Confirmed bugs found during full codebase audit (2026-03-18)
type: project
---

# Known Bugs — Initial Audit 2026-03-18

## CRITICAL

### BUG-001: colonySpec never saved
`state.colonySpec` (colony specialization: agricultural/mining/trading) is set at runtime but never included in `saveData` in `saveGame()`. On reload it resets to `{}`, silently deleting the player's specialization choice and removing all trade income multipliers.
- **Location:** sketch.js:20157 (saveGame), economy.js:35 (set), economy.js:125 (read)
- **Status:** Open

### BUG-002: Seven narrative flags are never set (Chapters VII–X soft-locked)
Chapters VII (volcanic_forge), VIII (frozen_memories), IX (dead_speak), X (mare_nostrum) require `interact` objectives with flags that no code ever sets:
- `discover_vulcan` — never set when entering Vulcan
- `discover_hyperborea` — never set
- `discover_necropolis` — never set
- `forge_vulcan_blade` — never set (no forge mechanic exists)
- `learn_ritual` — never set
- `final_inscription` — never set
- `rite_mare_nostrum` — never set
These chapters are permanently incompletable.
- **Location:** narrative.js:84–122 (objectives), islands.js (enterVulcan/enterHyperborea/enterNecropolis — flags missing)
- **Status:** Open

## HIGH

### BUG-003: Conquest error recovery clears soldiers but not conquest.phase
sketch.js:1313 — the "Too many conquest errors" recovery path resets `enemies` and `active`, but does NOT reset `conquest.phase`, `conquest.soldiers`, `conquest.workers`, or `conquest.buildings`. On next re-entry the island is in an inconsistent partial state (e.g., phase='defending' with no enemies).
- **Location:** sketch.js:1312–1324
- **Status:** Open

### BUG-004: XP granted for non-combat enemy count drops
combat.js:213 — `updateCombatSystem` grants XP and registers combo hits based on `enemies.length < _combatLastEnemyCount`. This fires any time the array shrinks — including `exitConquest()` which calls `enemies = []`, granting XP for every enemy alive at time of exit.
- **Location:** combat.js:211–218
- **Status:** Open

### BUG-005: Necropolis skeleton removal races with attack loop
islands.js:242 — `n.skeletons = n.skeletons.filter(s => s.hp > 0 || s.flashTimer > 0)` is called DURING the same frame as the attack loop that iterates `n.skeletons`. The array is rebuilt by filter (safe in JS), but dead skeletons with `flashTimer > 0` are retained for rendering, then next frame their `hp <= 0` is re-checked at line 236's `if (sk.hp <= 0) continue` — this is safe. However `exitNecropolis()` at line 224 also filters: `n.skeletons = n.skeletons.filter(s => s.hp > 0)` — this drops skeletons in their dying flash frame, which is a minor visual pop but not a crash.
- **Location:** islands.js:224, 242
- **Status:** Low severity, cosmetic

### BUG-006: Trapped tomb on Necropolis deals damage but gives no loot
islands.js:420–427 — if a tomb is trapped and the player has no invincTimer, the function returns after dealing damage WITHOUT marking the tomb looted (`bestTomb.looted` stays false). On next [E] press the trap fires again and again until invincTimer is active during the press. The tomb becomes infinitely damaging.
- **Location:** islands.js:418–427
- **Status:** Open

### BUG-007: `wreck` particle arrays (birds, glints) not saved
`saveGame()` saves `palms`, `crabs`, `decor` but NOT `wreck.birds` and `wreck.glints`. On reload these are initialized as empty (lines 1077–1078 in startNewGame), which is fine, but `loadGame()` at line 20383 does `state.wreck = d.wreck` then patches missing raft fields — this means if the loaded save has `birds`/`glints` undefined, those arrays remain undefined rather than `[]`. Any code calling `.push()` on them will throw.
- **Location:** sketch.js:20383 (loadGame)
- **Status:** Open (low risk since birds/glints are re-initialized on new game but could crash on old saves mid-game)

## MEDIUM

### BUG-008: `mq_standard_found` counter for Chapter IV never incremented
Chapter IV objective requires `counter: 'mq_standard_found', target: 1`. No code anywhere calls `advanceMainQuestCounter('mq_standard_found', 1)`. The legion standard is described as a "rare drop" from Terra Nova but the drop table has no such entry.
- **Location:** narrative.js:50, sketch.js (conquest loot — no match found)
- **Status:** Open

### BUG-009: `discover_vulcan` chapter check is correct behavior missing
`enterVulcan()` in islands.js:5 sets `v.phase = 'explored'` but never sets `state.narrativeFlags['discover_vulcan']`. The quest tracker HUD displays the objective but it can never check off. Same for `discover_hyperborea` and `discover_necropolis`.
- **Location:** islands.js:5 (enterVulcan), 80 (enterHyperborea), 210 (enterNecropolis)
- **Status:** Duplicate of BUG-002, flagged separately for priority

### BUG-010: Fruit tree regrow timer never decrements
`handlePlentyInteract()` sets `bestTree.timer = 600` on pick. `updatePlentyIsland()` does NOT contain any timer decrement or `t.fruit = true` reset logic for trees. Trees that lose their fruit are permanently barren.
- **Location:** islands.js:163–172 (updatePlentyIsland — no tree timer logic), islands.js:384–385 (timer set but never consumed)
- **Status:** Open

### BUG-011: `tradeRouteUI` open state not saved
`state.tradeRouteUI = true` can be set when the save fires (auto-save fires every 5 min). On load this flag is not restored (not in saveData), so the UI will always close on load. This is actually fine behavior, but `_specSelectOpen` module variable in economy.js is also not saved/restored, meaning if spec selection was open during save it silently closes on load without completing — can leave `state.colonySpec` in wrong state, combined with BUG-001.
- **Location:** economy.js:27 (_specSelectOpen), sketch.js saveGame
- **Status:** Low severity

### BUG-012: `nq_vesta_nights` counter never incremented
Vesta quest 2 requires observing stars for 3 nights (`counter: 'nq_vesta_nights'`). No code increments `advanceNPCQuestCounter('nq_vesta_nights', 1)` during day transitions or at night. Quest permanently stuck at 0/3.
- **Location:** narrative.js:212, sketch.js updateTime (no call found)
- **Status:** Open

### BUG-013: `mq_expeditions` counter never incremented
Chapter IV requires completing 3 expeditions to Terra Nova (`counter: 'mq_expeditions'`). No code calls `advanceMainQuestCounter('mq_expeditions', 1)` in exitConquest or anywhere else.
- **Location:** narrative.js:49, sketch.js (exitConquest — not found)
- **Status:** Open

## LOW

### BUG-014: dt cap at 2 means timer values under load run at double speed
`dt = min(2, _delta * 60)` — when frame rate drops to 30fps, dt=2. All timers (crop growth, quest counters, cooldowns) advance at 2x rate. At 15fps dt is still capped at 2, so below 30fps all time-based systems run at actual real-time pace (correct), but between 30–60fps they scale. This is standard game loop behavior but crops can grow noticeably faster during frame drops.
- **Location:** sketch.js:2815
- **Status:** By design but worth flagging to content designers

### BUG-015: `state.tradeRoutes` schema comment mismatch
`state.tradeRoutes` is initialized as array with comment `{ id, from, to, resource, amount, frequency, shipId, active, timer, gold }` but `createTradeRoute()` in economy.js creates objects with different fields: `{ id, from, to, good, amount, shipX, shipY, shipAngle, active, tripTimer, tripPhase, goldEarned }`. The `resource`, `frequency`, `shipId` fields listed in the comment don't exist. Not a runtime crash but creates misleading state definition.
- **Location:** sketch.js:721, economy.js:66
- **Status:** Documentation bug

### BUG-016: `state.rowing.nearIsle` comment says "arena or conquest" but handles 7 islands
sketch.js:284 — comment `// 'arena' or 'conquest' when near dock` is stale. Code handles: arena, conquest, wreck, vulcan, hyperborea, plenty, necropolis.
- **Location:** sketch.js:284
- **Status:** Documentation only

---
name: known_bugs
description: Confirmed bugs and their status — updated 2026-03-18 (post-overhaul sprint audit pass 4)
type: project
---

# Known Bugs — Updated 2026-03-18 (Audit Pass 4)

## CRITICAL

### BUG-017: `cx`/`cy` used before `let` declaration in `expandIsland()` — CRASH at levels 5, 10, 15, 20
`let cx = WORLD.islandCX, cy = WORLD.islandCY;` is declared at sketch.js:23182, but `cx` and `cy` are used at lines 23128, 23136, 23140, 23145-23146, 23149, 23156, 23159 — all inside the milestone landmark building blocks that execute BEFORE the declaration.
JavaScript `let` has a temporal dead zone. When a player reaches island level 5, 10, 15, or 20, `expandIsland()` throws `ReferenceError: Cannot access 'cx' before initialization`. Resources are already deducted (line 23107-23111) and `islandLevel++` already fired (23112) before the crash, so the player loses resources and gets a level-up but no landmark buildings spawn.
Level 25 milestone block does NOT use `cx`/`cy` so it survives.
- **Location:** sketch.js:23182 (declaration), 23128/23136/23140/23145/23146/23149/23156/23159 (uses)
- **Fix:** Move `let cx = WORLD.islandCX, cy = WORLD.islandCY;` to immediately after `let rx = getSurfaceRX(), ry = getSurfaceRY();` at line 23123.
- **Status:** Open — BLOCKS progression past level 4

### BUG-001: colonySpec never saved
**FIXED** — `colonySpec: state.colonySpec` is now in saveData at sketch.js:21303. Verified in loadGame at line 21351: `if (d.colonySpec) state.colonySpec = d.colonySpec;`
- **Status:** Fixed

### BUG-002: Seven narrative flags never set (Chapters VII–X)
**PARTIALLY FIXED.** The following flags now set correctly:
- `discover_vulcan` — set in `enterVulcan()` at islands.js:19
- `discover_hyperborea` — set in `enterHyperborea()` at islands.js:120
- `discover_necropolis` — set in `enterNecropolis()` at islands.js:288
- `forge_vulcan_blade` — set in `handleVulcanInteract()` at islands.js:364 (requires 10 iron + 5 titan bone near forge altar)
- `learn_ritual` — set in `handleHyperboreInteract()` at islands.js:460 (requires all 4 frozen ruins looted + near obelisk)
- `final_inscription` — set in `checkLoreTabletPickup()` in narrative.js:723 (fires when tablet id=19 is picked up; tablet 19 is on 'home' island at rx=0.4, ry=0.3)
- `rite_mare_nostrum` — set in keyPressed handler at sketch.js:19270 (near crystal shrine, islandLevel>=25, all NPCs>=8 hearts)
- **Status:** Fixed (partially — see BUG-018 for remaining issues)

## CRITICAL (NEW — Audit Pass 4)

### BUG-024: `drawArenaIsleDistant()` is dead code — arena renders without horizon clamping
`drawArenaIsleDistant()` (sketch.js:12566) was created to pin the arena to the horizon when viewed from the home island, but it is never called. The render loop at sketch.js:1662 still calls `drawArena()` which uses raw `w2sY(a.isleY)` with no horizon clamping. The arena island can float above the water line when camera is panned. The new function is correctly implemented but never wired into the draw loop.
- **Location:** sketch.js:1662 (calls `drawArena()`), sketch.js:12566 (`drawArenaIsleDistant()` — dead)
- **Fix:** Replace `drawArena()` at line 1662 with `drawArenaIsleDistant()`. `drawArena()` at line 1577 (inside active arena mode) should remain.
- **Status:** Open — High severity, visual regression, intended fix not applied

### BUG-025: `drawConquestIsleDistant()` is dead code — Terra Nova renders without horizon clamping
Same pattern as BUG-024. `drawConquestIsleDistant()` (sketch.js:15330) correctly clamps Terra Nova to the horizon, but is never called. The render loop at sketch.js:1665 still calls `drawConquestIsland()` which uses raw `w2sY(c.isleY)`. Terra Nova can float above the water line.
- **Location:** sketch.js:1665 (calls `drawConquestIsland()`), sketch.js:15330 (`drawConquestIsleDistant()` — dead)
- **Fix:** Replace `drawConquestIsland()` at line 1665 with `drawConquestIsleDistant()`. The call at line 1540 (inside active conquest mode) should remain as `drawConquestIsland()`.
- **Status:** Open — High severity, visual regression, intended fix not applied

## CRITICAL (from Pass 3, still open)

### BUG-018: `rite_mare_nostrum` heart threshold mismatch — Chapter X cannot complete
Chapter X `all_hearts_max` objective requires ALL NPCs at hearts >= 10 (narrative.js:121). The `rite_mare_nostrum` flag fires at hearts >= 8 (sketch.js:19265-19268). The rite triggers at 8 hearts, but the chapter objective check needs 10 hearts. A player can perform the rite at 8 hearts, flag is set, but Chapter X never completes because `all_hearts_max` check still fails. The chapter advances when ALL objectives pass; `final_ceremony` (interact: rite_mare_nostrum) is satisfied, but `all_hearts_max` is not.
Note: The effect is the player experiences the rite dialogue but the Chapter X completion never fires, no reward, no "IMPERATOR" title.
- **Location:** narrative.js:121 (check: hearts >= 10), sketch.js:19265-19268 (rite fires at >= 8)
- **Fix:** Either lower the narrative.js check to `>= 8`, or raise the rite trigger to require >= 10 hearts.
- **Status:** Open — Chapter X completion blocked unless player has exactly 10 hearts with all NPCs before performing rite

## HIGH

### BUG-026: Hyperborea frost node save/load uses wrong field name — collection state lost on reload
`saveGame()` at sketch.js:20058 saves `iceNodes: (state.hyperborea.iceNodes || []).map(...)` but the actual field is `state.hyperborea.frostNodes` (initialized at sketch.js:714, used in islands.js:116, reset daily at sketch.js:2003). `state.hyperborea.iceNodes` is never defined — the `|| []` guard makes the save write an empty array. `loadGame()` at sketch.js:20229 restores into `state.hyperborea.iceNodes` — a phantom field that does nothing. After any reload, ALL Hyperborea frost node collection states are lost.
- **Location:** sketch.js:20058 (save), sketch.js:20229 (load), sketch.js:714 (correct field: `frostNodes`)
- **Fix:** Change `state.hyperborea.iceNodes` to `state.hyperborea.frostNodes` at both lines 20058 and 20229.
- **Status:** Open — introduced in audit pass 4 island loot save work

### BUG-019: Island states (vulcan/hyperborea/plenty/necropolis) not saved
None of the four explorable island states are included in `saveData`. Specifically:
- `hyperborea.frozenRuins[*].looted` — resets on reload; player must re-loot all ruins to unlock obelisk ritual. The `learn_ritual` narrativeFlag IS saved, so a completed ritual persists, but partial ruin-looting progress is lost.
- `vulcan.obsidianNodes[*].collected` — resets on reload
- `necropolis.tombs[*].looted`, `soulNodes[*].collected`, `ghostNPCs[*].talked` — reset on reload
- `plenty.fruitTrees[*].fruit`/`timer`, `spiceNodes[*].collected` — reset on reload
- **Status:** FIXED in audit pass 4 (island loot save now added — but see BUG-026 for Hyperborea frost node naming bug)

### BUG-003: Conquest error recovery clears soldiers but not conquest.phase — STILL OPEN
- **Status:** Open

### BUG-004: XP granted for non-combat enemy count drops — STILL OPEN
- **Status:** Open

### BUG-006: Trapped tomb deals damage but leaves tomb unlooted — FIXED
`bestTomb.looted = true` now set BEFORE trap check in `handleNecropolisInteract()` (islands.js:535). Trap fires once, tomb is looted.
- **Status:** Fixed

## MEDIUM

### BUG-027: `steelPick` and `tools.lantern` sold in shop but have no gameplay effect
`steelPick` (Steel Pickaxe → "2x mining speed") and `tools.lantern` (Lantern → "night visibility") are listed in the merchant shop (sketch.js:11774-11775) and deduct gold, but no code reads `state.tools.steelPick` or `state.tools.lantern` for any gameplay modifier. Players pay gold for items that do nothing.
- **Location:** sketch.js:11774-11775 (shop adds offers), nowhere (no effect implemented)
- **Fix:** Add pickaxe speed bonus in stone/resource mining code (e.g., quarrier update or quarry hit rate), and add lantern night visibility radius expansion in the night lighting code (sketch.js near torch radius handling at 5637-5638).
- **Status:** Open — Medium severity, players misled by shop description

### BUG-028: `skeleton_death` SFX defined but never played
`snd.playSFX('skeleton_death')` (sound.js:674) is defined and synthesized, but no call site exists in islands.js or sketch.js. Skeletons die silently — `islands.js:315` filters dead skeletons without firing any audio event.
- **Location:** islands.js:315 (filter without SFX), sound.js:674 (definition)
- **Fix:** Add `if (snd) snd.playSFX('skeleton_death');` in the necropolis skeleton update loop when `sk.hp <= 0` is first detected (before the filter at line 315).
- **Status:** Open — Low severity, missing audio feedback

### BUG-029: `player.xpBoost` and `player.xpBoostTimer` not saved — Honeyed Figs effect lost on reload
`useHoneyedFigs()` (sketch.js:13515) sets `state.player.xpBoost` and `state.player.xpBoostTimer` as dynamic properties. Neither is included in `saveGame()` playerXp/playerSkills block nor loaded in `loadGame()`. If a player uses Honeyed Figs and saves/reloads before the timer expires, the XP boost is silently lost.
- **Location:** sketch.js:13518-13519 (sets fields), sketch.js:19972-19989 (save — fields absent)
- **Fix:** Add `playerXpBoost: state.player.xpBoost || 0, playerXpBoostTimer: state.player.xpBoostTimer || 0` to saveData, and restore them in loadGame after the playerSkills block.
- **Status:** Open — Low severity (1 game day duration, survives most sessions)

### BUG-008: `mq_standard_found` counter never incremented — STILL OPEN
- **Status:** Open

### BUG-010: Fruit tree regrow timer never decrements — FIXED
`updatePlentyIsland()` now at islands.js:238: `for (let t of pl.fruitTrees) { if (!t.fruit && t.timer > 0) { t.timer -= dt; if (t.timer <= 0) t.fruit = true; } }`
- **Status:** Fixed

### BUG-012: `nq_vesta_nights` counter never incremented — STILL OPEN
- **Status:** Open

### BUG-013: `mq_expeditions` counter never incremented — STILL OPEN
- **Status:** Open

### BUG-020: Obelisk "[E] Study the Obelisk" prompt renders from any distance
In `drawHyperboreEntities()` (islands.js:180-186), the `[E] Study the Obelisk` text renders at the obelisk's screen position whenever `allLooted && !ritualDone`, without any distance check. The actual interaction in `handleHyperboreInteract()` requires `dist < 40`. Player sees the prompt from across the island.
- **Location:** islands.js:180-186
- **Status:** Open — low severity, cosmetic

## LOW

### BUG-005: Necropolis skeleton removal races — STILL OPEN (cosmetic)
- **Status:** Open

### BUG-007: `wreck.birds`/`glints` not saved — FIXED
loadGame now patches: `if (!Array.isArray(state.wreck.birds)) state.wreck.birds = [];` at sketch.js:21453.
- **Status:** Fixed

### BUG-009: `discover_vulcan` duplicate — RESOLVED (merged with BUG-002 fix)
- **Status:** Fixed

### BUG-011: `tradeRouteUI` open state not saved — STILL OPEN (low)
- **Status:** Open

### BUG-015: `state.tradeRoutes` schema comment mismatch — STILL OPEN (doc only)
- **Status:** Open

### BUG-016: `state.rowing.nearIsle` comment stale — STILL OPEN (doc only)
- **Status:** Open

### BUG-022: HUD quarrier bar overlaps rank title text when quarrier is unlocked
`drawBarHUD(22, cookedY + 30, ...)` for QUARRY bar and `text(rankTitle..., 22, cookedY + 30)` both render at `cookedY + 30`. When `state.quarrier.unlocked` is true, the "CITIZEN — LV.X" text and the quarrier energy bar are drawn at the same Y position and collide. The rank title and season text below it are also pushed by 14px (bar height) causing misread of island level. Additionally, `hudH` does not account for the extra bar row when quarrier is unlocked, so the panel background is 14px short.
- **Location:** sketch.js:17961-17967 (bar at +30, text at +30); sketch.js:17911-17922 (hudH misses quarrier row)
- **Fix:** After the quarrier bar block, bump `cookedY` by 14 if quarrier unlocked, then use that offset for rank title. Also add `if (state.quarrier && state.quarrier.unlocked) hudH += 14;` in the hudH block.
- **Status:** Open — visual corruption, no gameplay impact

### BUG-023: `skipIntro()` misses camera snap — player spawns at (0,0) view
`skipIntro()` (sketch.js:2302-2307) sets `state.introPhase = 'done'` and `state.time = 6*60` but does NOT set `cam.x/y` or `camSmooth.x/y` to the player position. The normal completion path at sketch.js:2231-2232 does snap the camera. On skip, `cam` retains its default (0,0), so the first visible game frame shows the world origin, not the player. Camera snaps to player only after the smooth lerp catches up (several seconds).
- **Location:** sketch.js:2302-2307 (skipIntro), vs 2231-2232 (normal path)
- **Fix:** Add `cam.x = state.player.x; cam.y = state.player.y; camSmooth.x = cam.x; camSmooth.y = cam.y;` inside `skipIntro()` after setting `state.time`.
- **Status:** Open — Medium severity, disorienting on new game

### BUG-021: Crafted resource fields (`steel`, `marble`, `perfume`, `scrolls`) defined but unused and unsaved
State fields `steel`, `marble`, `perfume`, `scrolls` are initialized at sketch.js:760-763 but no code reads or writes them beyond initialization. They are not included in `saveData`. These are placeholder fields. If crafting is added later using these, they'll need save/load entries.
- **Location:** sketch.js:760-763
- **Status:** Open — low priority (fields unused, no gameplay impact)

### BUG-014: dt cap behavior at low framerates — by design
- **Status:** By design

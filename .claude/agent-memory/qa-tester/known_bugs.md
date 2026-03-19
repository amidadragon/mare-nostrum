---
name: Known Bugs — Mare Nostrum
description: Confirmed bugs found during QA audits, with severity and fix status
type: project
---

# Known Bugs

## CRITICAL (Game Breaking)

### BUG-101: drawNightLighting is undefined — entire island render path breaks every frame
- **File**: sketch.js:1897
- **Type**: missing_function
- **Impact**: In normal island mode, drawInner() throws ReferenceError on line 1897. The try/catch in draw() catches it silently. Every draw cycle, everything AFTER line 1897 is skipped: fishing render, particles, seasonal effects, weather effects, lightning, energy arcs, floating text, ship, oracle stone, lore tablets, festival decorations, bottles, treasure hint, shore waves, rowing boat, diving overlay, build ghost, HUD, hotbar, quest tracker, all UI panels. **The game is visually broken in normal island mode.**
- **Fix**: Add a stub to sketch.js or world.js: `function drawNightLighting() { /* night overlay drawn by drawColorGrading */ }`
- **Status**: OPEN

## HIGH (Feature Broken)

### BUG-102: V key activates both Codex and Bridge start simultaneously
- **File**: sketch.js:15151, 15194
- **Type**: logic_error
- **Impact**: When pressing V near pyramid, both the Codex toggle (line 15151) AND bridge start check (line 15194) fire for the same keypress — no return between them.
- **Fix**: Add `return;` after line 15154 (after the codex toggle block), or consolidate V key handling into one if/else chain.
- **Status**: OPEN

### BUG-103: drawFarmPlots() is defined but never called — dead code
- **File**: farming.js:255
- **Type**: dead_code
- **Impact**: Farm plots render via drawOnePlot() inside drawWorldObjectsSorted(). The extracted drawFarmPlots() function is unreachable. Any logic inside it that differs from drawOnePlot is silently dropped.
- **Fix**: Either remove drawFarmPlots() or audit if it does something drawOnePlot() doesn't.
- **Status**: OPEN (low urgency — farm currently renders via drawOnePlot)

## MEDIUM

### BUG-104: state.vulcan.obsidianNodes/frostNodes accessed without guard on day transition
- **File**: sketch.js:2244-2254
- **Type**: potential_null_error
- **Impact**: If a player loads a save where vulcan.phase is NOT 'unexplored' but the obsidianNodes array was not restored (corrupted save or version mismatch), the forEach throws. Guarded in saveGame but not at access sites.
- **Fix**: Add `|| []` guards: `(state.vulcan.obsidianNodes || []).forEach(...)`
- **Status**: OPEN

### BUG-105: V key triple-binding — wardrobe, codex, bridge all on same key
- **File**: sketch.js:15112, 15151, 15194
- **Type**: logic_error
- **Impact**: Three separate V key if-blocks in keyPressed, no clean if/else chain. Player near pyramid pressing V gets BOTH codex toggle AND bridge start attempt in same frame.
- **Fix**: Restructure into if/else if/else if chain with explicit returns.
- **Status**: OPEN (same root cause as BUG-102)

**Why:** All discovered during post-modularization audit 2026-03-19.
**How to apply:** Test after any changes to sketch.js keyPressed or drawInner.

# Known Bugs — Updated 2026-03-19 (Sprint 4 QA Audit)

## CRITICAL (NEW — Sprint 4)

### BUG-031: `updateCitizens()` ignores `dt` — citizen speed is frame-rate dependent
`updateCitizens()` (sketch.js:23221) moves citizens by `c.speed` pixels per call and decrements `c.timer` by 1 per call. It takes no `dt` argument and is called once per frame from the update loop (sketch.js:1822). At 60fps the speed is correct; at 30fps citizens move half-speed and idle twice as long. Not a crash, but breaks consistency with all other movement systems that use dt.
- **Location:** sketch.js:23221–23260, call at 1822
- **Fix:** Pass dt to updateCitizens, multiply vx/vy by dt/1 and subtract dt from timer.
- **Status:** Open — Medium severity, cosmetic at normal fps

### BUG-032: Random event system has no `state.events` array — sprint feature name misleading
The sprint listed "6 events: pirate raid, windfall, merchant, crystal surge, ghost, soldier". The system uses `state.activeEvent` (single active slot) + `state.eventCooldown` + `state.eventHistory`. There is NO `state.events` array. Searching for `state.events` returns zero results. The architecture is correct (single-event model), but the sprint naming implies an array. This is not a bug — but confirms the search target `state.events` should be `state.activeEvent` in future audits.
- **Status:** Not a bug — audit finding only

### BUG-033: `drawEvents|updateEvents|checkRandomEvents` — none of these function names exist
Sprint audit searched for these names — all return zero results. The actual functions are `checkRandomEvent` (no 's'), `updateActiveEvent`, `drawEventBanner`. No missing calls — the naming in the QA checklist was wrong. Confirmed all three are called: checkRandomEvent at line 2246, updateActiveEvent at 1828, drawEventBanner at 2103.
- **Status:** Not a bug — audit finding only

## CRITICAL

### BUG-017: `cx`/`cy` used before `let` declaration in `expandIsland()` — CRASH at levels 5, 10, 15, 20
**FIXED** — `let cx = WORLD.islandCX, cy = WORLD.islandCY` now declared at line 21340, before all milestone building blocks. Verified in 2026-03-19 audit: declaration is at line 21340, first use at 21344.
- **Status:** Fixed

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

### BUG-024: `drawArenaIsleDistant()` — FIXED
Wired into draw loop at line 1716. Confirmed in 2026-03-19 audit.
- **Status:** Fixed

### BUG-025: `drawConquestIsleDistant()` — FIXED
Wired into draw loop at line 1719. Confirmed in 2026-03-19 audit.
- **Status:** Fixed

## CRITICAL (from Pass 3, still open)

### BUG-018: `rite_mare_nostrum` heart threshold mismatch — Chapter X cannot complete
Chapter X `all_hearts_max` objective requires ALL NPCs at hearts >= 10 (narrative.js:121). The `rite_mare_nostrum` flag fires at hearts >= 8 (sketch.js:19265-19268). The rite triggers at 8 hearts, but the chapter objective check needs 10 hearts. A player can perform the rite at 8 hearts, flag is set, but Chapter X never completes because `all_hearts_max` check still fails. The chapter advances when ALL objectives pass; `final_ceremony` (interact: rite_mare_nostrum) is satisfied, but `all_hearts_max` is not.
Note: The effect is the player experiences the rite dialogue but the Chapter X completion never fires, no reward, no "IMPERATOR" title.
- **Location:** narrative.js:121 (check: hearts >= 10), sketch.js:19265-19268 (rite fires at >= 8)
- **Fix:** Either lower the narrative.js check to `>= 8`, or raise the rite trigger to require >= 10 hearts.
- **Status:** Open — Chapter X completion blocked unless player has exactly 10 hearts with all NPCs before performing rite

## HIGH

### BUG-030: ESC closes game instead of Empire Dashboard / Inventory / Skill Tree (NEW — 2026-03-19)
The first ESC block in keyPressed() (sketch.js:18169-18180) handles a subset of overlays and always returns, reaching `saveGame(); gameScreen='menu'` if no handled overlay is open. A second ESC block at line 18707 that handles `empireDashOpen`, `inventoryOpen`, and `skillTreeOpen` is UNREACHABLE. Additionally, `state.buildMode` and `state.demolishMode` are not in either ESC chain.
Result: ESC while Empire Dashboard, Inventory, Skill Tree, or Build Mode is open saves the game and goes to menu.
- **Location:** sketch.js:18169-18180 (first block, incomplete), sketch.js:18707-18712 (dead second block)
- **Fix:** Add to first ESC block (after line 18175, before saveGame()):
  `if (empireDashOpen) { empireDashOpen = false; return; }`
  `if (inventoryOpen) { inventoryOpen = false; return; }`
  `if (typeof skillTreeOpen !== 'undefined' && skillTreeOpen) { skillTreeOpen = false; return; }`
  `if (state.buildMode) { state.buildMode = false; state.demolishMode = false; return; }`
  Then remove the dead block at 18707.
- **Status:** Open — High severity, affects core game loop

### BUG-026: Hyperborea frost node save key naming mismatch
Save key is `iceNodes` (line 19426), state field is `frostNodes`. Round-trip is self-consistent (save writes iceNodes, load reads iceNodes to populate frostNodes). This is no longer data-loss but is a confusing naming inconsistency. Verified 2026-03-19: frost node collection IS saved and restored correctly.
- **Location:** sketch.js:19426 (save), sketch.js:19600 (load)
- **Status:** Cosmetic naming issue only — not a data loss bug

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

### BUG-029: `player.xpBoost` and `player.xpBoostTimer` not saved — FIXED
Both fields now saved at line 19355 and loaded at lines 19666-19667. Verified 2026-03-19.
- **Status:** Fixed

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

---

## Monitoring Session 2026-03-19 (Multi-Agent Edit Session)

### Shell escape \! artifact pattern
During 2-hour multi-agent editing, agents repeatedly introduced `\!` instead of `!` in sketch.js code. This is a heredoc bash escape artifact. The `\!` was found at multiple points: `\!==`, `\!state.x`, and `'\!'` in string literals. Node's syntax checker reports these as "Unexpected token". Agents fixed them progressively, but new ones appeared as different agents wrote code. Final state: all resolved, all files pass syntax check.

**Key locations affected**: Lines in `drawExpeditionSummaryOverlay`, `drawArenaHUD`, `updateArenaEnemy`, pyramid drawing code.

### Orphaned switch case body
Arena enemy state machine had `case 'stagger':` body (stateTimer/vx/vy code + break) with its `case` label deleted. Downstream `case 'dying':` appeared at switch-level, causing Node to report "Unexpected token 'case'". Fixed by restoring the label.

### All 12 files pass syntax check at end of session
Final `npm run check` = ALL PASS at ~T+30min of monitoring window.

---
name: Island Systems Architecture
description: Key architecture facts about the 4 new islands and their [E] interaction system
type: project
---

## Island [E] Key Handling Architecture

The 4 new islands (Vulcan, Hyperborea, Plenty, Necropolis) use early-return blocks at the top of `keyPressed()` in sketch.js (~line 18108). When `state.X.active` is true, all keys are blocked and routed through a dedicated handler in islands.js.

The handlers are: `handleVulcanInteract()`, `handleHyperboreInteract()`, `handlePlentyInteract()`, `handleNecropolisInteract()` — defined at the bottom of islands.js (~line 282+).

The main draw() loop has early-return blocks for each island's active mode (~lines 2871-2939 in sketch.js), calling their own update/draw functions from islands.js.

**Why:** The island modes each return early from draw() so they need their own keyPressed routing — the main home-island [E] handling never fires while on a new island.

**How to apply:** When adding more interactable content to any of the 4 islands, add it to the corresponding `handleXInteract()` function in islands.js. New islands follow the same pattern: add active block to draw(), add handler block to keyPressed().

## New Resources

- `state.obsidian` — Vulcan, mined from obsidianNodes (8 per visit, marked collected)
- `state.frostCrystal` — Hyperborea, from frostNodes (7) + frozenRuins loot table
- `state.exoticSpices` — Plenty, from spiceNodes (6) + fruit trees (regrow timer 600 frames)
- `state.soulEssence` — Necropolis, from soulNodes (5) + tomb loot + skeleton kills

All 4 are in save/load (~lines 20215-20216 save, 20302-20305 load).

## Forge Altar (Vulcan, Chapter VII)

Drawn inside `drawVulcanIsland()` at crater center (v.isleX, v.isleY). [E] prompt drawn in `drawVulcanEntities()`. Interaction in `handleVulcanInteract()`: within 60px of crater center, consumes 10 ironOre + 5 titanBone, sets `narrativeFlags['forge_vulcan_blade'] = true`, `player.weapon = 2`.

## Frozen Obelisk (Hyperborea, Chapter VIII)

`h.frozenObelisk = { x, y }` set on first `enterHyperborea()` (with migration guard for existing saves). Drawn in `drawHyperboreEntities()`. Interaction in `handleHyperboreInteract()`: within 40px, requires all 4 frozenRuins looted, sets `narrativeFlags['learn_ritual'] = true`.

## Lore Tablet 19 (Final Inscription, Chapter IX)

In `checkLoreTabletPickup()` in narrative.js: when `lt.id === 19` is picked up, sets `narrativeFlags['final_inscription'] = true`.

## Rite of Mare Nostrum (Crystal Shrine, Chapter X)

Crystal shrine [E] interaction added to main keyPressed() in sketch.js, checked before the pyramid upgrade shop check (~line 18443). Requires: islandLevel >= 25, all 4 NPCs >= 8 hearts. Sets `narrativeFlags['rite_mare_nostrum'] = true`.

## Quest Compass Nudges

`tickPendingNudges(dt)` in narrative.js processes `state.mainQuest.pendingNudges[]` array (added to by chapter completion code in `updateMainQuest()`). Called from sketch.js after `updateMainQuest()` at line 3064.

90-second new-game nudge fires in `updateTime()` via `state.playFrames` counter (5400 frames = ~90 seconds at 60fps).

## vesta_q2 Night Observation Fix

Now fires in `updateTime()` at 19:00-19:30 (state.time 1140-1170). Uses `state._vestaObsNight` flag to prevent double-firing. Midnight fallback removed from day rollover. `state._vestaObsNight` resets on day rollover.

## dawn_prayer / oracle_riddle Split

dawn_prayer fires during 5:30-6:30 (time 330-390). oracle_riddle fires during 6:30-8:30 (time 390-510) on a subsequent prayer at the pyramid. Both only fire when vesta_q3 is active.

## mq_standard_found Gated to dangerLevel >= 5

Legion standard drop in `handleEnemyDeath()` now requires `dangerLevel >= 5` (in addition to chapter === 3). Drop also limited to 1 total via counter check.

## Advanced Buildings (Level-Gated, sketch.js)

8 new buildings added to BLUEPRINTS (lines 183-194) with `minLevel` field:
- Level 5: granary (48x36, stone:6 wood:4), well (24x24, stone:4)
- Level 10: temple (56x40, stone:10 crystals:5 gold:20), market (36x28, wood:6 stone:3)
- Level 15: forum (64x48, stone:15 gold:50), watchtower (20x44, stone:8 ironOre:4)
- Level 20: arch (48x52, stone:20 gold:100 crystals:10), villa (60x44, stone:15 wood:10 gold:75)

`isBuildingUnlocked(buildType)` at ~line 8812 checks `state.islandLevel >= bp.minLevel`.
`canAfford`/`payCost`/`getCostString` extended to handle `gold` and `ironOre` costs.
`placeBuilding` guards against locked buildings with level-requirement message.
`drawBuildUI` rewritten to show 2 rows: base (row 0) + advanced (row 1). Locked slots show "LV{N}" and are dimmed. Click handler at ~line 18545 also updated for 2-row layout.
`drawOneBuilding` / `drawBuildIcon` have cases for all 8 new types.
Codex building total updated: 12 -> 20.

## Victory Condition (Imperator)

`checkImperatorVictory()` is called when island reaches level 25 (inside the level-up function ~line 22206). Conditions: islandLevel >= 25, all 4 NPCs at 10 hearts, conquest.colonized == true.

Sets `state.won = true` and `state.victoryCeremony = { timer: 0, phase: 'start' }`.

- `updateImperatorCeremony(dt)` called in main update loop (~line 3064)
- `drawImperatorCeremony()` called at end of main draw HUD stack (~line 3339)
- Any keypress after 3 seconds (180 frames) dismisses the ceremony banner
- `state.won` persists to save/load

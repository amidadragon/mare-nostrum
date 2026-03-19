---
name: Project Overview — Mare Nostrum
description: Game architecture, file roles, load order, key systems, modularization status
type: project
---

# Mare Nostrum — QA Overview

## Architecture
19 JS files loaded via plain script tags (no modules). p5.js global mode. All files share one global scope.

## Load Order (index.html)
1. engine.js — event bus, object pooling, camera culling (Engine object)
2. sound.js — procedural audio (SoundManager class → snd instance)
3. narrative.js — quest chains, NPC dialogue pools, lore tablets, DAILY_WANTS, favor system
4. cinematics.js — intro, sailing cutscene, pre-repair scene, doFirstRepair, completeSailToHome
5. fishing.js — FISH_TYPES, NAT_FISH_DATA, startFishing, updateFishing, drawFishing, reelFish
6. farming.js — SEASONAL_CROPS, NAT_CROP_DATA, all farm functions including drawFarmZoneBG
7. npc.js — NPC dialogue constants, drawNPC, drawNewNPC, citizens, daily wants
8. events.js — FESTIVALS, EVENT_DEFS, checkRandomEvent, updateActiveEvent, festival system
9. world.js — drawIsland, drawSky, drawOcean, drawCoastlineShape, terrain, ports
10. player.js — updatePlayer, drawPlayer, wardrobe (wardrobeOpen let var), TUNIC_COLORS, HEADWEAR
11. ui.js — drawHUD, drawHotbar, drawBuildUI, drawShopUI, EXPEDITION_MODIFIERS, all overlay UIs
12. sketch.js — MAIN: state, initState, draw loop, save/load, BLUEPRINTS, combat AI, conquest
13. wreck.js — wreck beach island, updateWreckBeach, drawWreckIsland, handleWreckInteract
14. menu.js — drawMenuScreen, handleMenuClick, settings/credits panels
15. islands.js — Vulcan, Hyperborea, Plenty, Necropolis all enter/exit/update/draw functions
16. diving.js — startDive, updateDiving, drawDivingOverlay, initDiveWorld
17. combat.js — skill tree, arena, grantXP, tryDodgeRoll, handleCombatSkillKey, drawSkillTree
18. economy.js — trade routes, HANNO merchant, colony specs, TRADE_GOODS
19. debug.js — Debug object, ` key console, cheat commands

## Key Globals (sketch.js)
state, WORLD, cam, camSmooth, particles, floatOffset, horizonOffset, shakeX, shakeY,
gameScreen, snd (created in setup), C (color constants), BLUEPRINTS, wardrobeOpen (in player.js!)

## State Machine Paths
- menu → startNewGame() → wreck beach → raft built → sail → home island
- menu → startLoadGame() → wherever last saved
- home island → rowboat → arena / conquest / islands
- ESC → saveGame() → menu

## Save Format
Version 7. Key: 'sunlitIsles_save'. Handles migration from older saves.

## Modularization Status (post-audit 2026-03-19)
Complete. 7 systems extracted from sketch.js: world.js, player.js, farming.js, fishing.js, npc.js, ui.js, events.js
KNOWN REGRESSION: drawNightLighting() call left in sketch.js:1897 but function never defined. See BUG-101.

# Mare Nostrum — Project Overview

**Why:** Needed for QA orientation across a 27k-line codebase

## File Roles (line counts as of 2026-03-18)
- `sketch.js` (23914 lines) — main game: state, draw loop, save/load, input, all subsystems
- `islands.js` (564 lines) — four new islands: Vulcan, Hyperborea, Plenty, Necropolis + [E] handlers
- `combat.js` (334 lines) — XP/leveling, active skills, dodge roll, combo, damage numbers
- `diving.js` (434 lines) — underwater exploration, treasure, creatures
- `economy.js` (500 lines) — trade routes, colony specialization, income UI
- `narrative.js` (871 lines) — 10-chapter quest chain, NPC quest chains, lore tablets
- `engine.js` (140 lines) — event bus, plugin system, object pool, camera culling
- `debug.js` (380 lines) — debug console (` key), 25+ cheat commands

## Delta Time
`drawInner()` at sketch.js computes `const dt = min(2, _delta * 60)` where `_delta` is real seconds since last frame. At 60fps dt≈1. Under load dt can be up to 2 (frame doubling cap). This is CORRECT.

## Save Key
`localStorage.setItem('sunlitIsles_save', ...)` — single key `sunlitIsles_save`. Save version: 7.

## State Machine
`gameScreen` variable: 'menu' | 'settings' | 'credits' | 'game'
Within game: controlled by boolean flags: `state.conquest.active`, `state.adventure.active`, `state.vulcan.active`, etc.

## New Systems (added before 2026-03-18 pre-release audit)
- **Quarrier companion** — auto-mines stone, unlocks at islandLevel 5. In state at sketch.js:402. update at 10971, draw at 11029. Saved: quarrierX/Y/Energy/Unlocked.
- **Landmark buildings** — 8 buildings auto-spawn at levels 5/10/15/20 in `expandIsland()`. BROKEN by BUG-017.
- **Narrative flags for islands** — all 7 missing flags now set: discover_vulcan, discover_hyperborea, discover_necropolis, forge_vulcan_blade, learn_ritual, final_inscription, rite_mare_nostrum.
- **colonySpec saved** — was BUG-001, now fixed.
- **won field saved** — victory state persists.
- **BUG-006 fixed** — trapped tomb now marks looted before dealing damage.
- **BUG-010 fixed** — fruit tree regrow timer now decrements in updatePlentyIsland.
- **BUG-007 fixed** — wreck birds/glints arrays patched on load.

## Critical Path Summary (post-audit)
1. New Game → Home: WORKS. homeIslandReached set, saveGame fires, Livia dialogue queued via updateMainQuest.
2. Chapter VII forge_vulcan_blade: WORKS. handleVulcanInteract fires at forge altar (dist<60 from isle center).
3. Chapter VIII learn_ritual: WORKS functionally. Requires all 4 frozen ruins looted, then [E] at obelisk.
4. Chapter IX final_inscription: WORKS. Tablet 19 on home island at rx=0.4,ry=0.3 — picking it up sets flag.
5. Chapter X rite_mare_nostrum: FLAG SETS but CHAPTER DOESN'T COMPLETE. Rite fires at hearts>=8 but chapter needs >=10 (BUG-018).
6. Quarrier: WORKS except landmark building crash (BUG-017) prevents buildings from spawning when quarrier first unlocks at level 5.

---
name: project_overview
description: Architecture overview of Mare Nostrum game files and key systems
type: project
---

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

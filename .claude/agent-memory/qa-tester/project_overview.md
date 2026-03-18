---
name: project_overview
description: Architecture overview of Mare Nostrum game files and key systems
type: project
---

# Mare Nostrum — Project Overview

**Why:** Needed for QA orientation across a 25k-line codebase

## File Roles
- `sketch.js` (22664 lines) — main game: state, draw loop, save/load, input, all subsystems
- `islands.js` (279 lines) — four new islands: Vulcan, Hyperborea, Plenty, Necropolis + [E] handlers
- `combat.js` (332 lines) — XP/leveling, active skills, dodge roll, combo, damage numbers
- `diving.js` (419 lines) — underwater exploration, treasure, creatures
- `economy.js` (500 lines) — trade routes, colony specialization, income UI
- `narrative.js` (847 lines) — 10-chapter quest chain, NPC quest chains, lore tablets
- `engine.js` (140 lines) — event bus, plugin system, object pool, camera culling

## Delta Time
`drawInner()` at sketch.js:2815 computes `const dt = min(2, _delta * 60)` where `_delta` is real seconds since last frame. At 60fps dt≈1. Under load dt can be up to 2 (frame doubling cap). This is CORRECT. The "const dt = 1" claim was false — the bug has already been fixed.

## Save Key
`localStorage.setItem('sunlitIsles_save', ...)` — single key `sunlitIsles_save`. Save version: 7.

## State Machine
`gameScreen` variable: 'menu' | 'settings' | 'credits' | 'game'
Within game: controlled by boolean flags: `state.conquest.active`, `state.adventure.active`, `state.vulcan.active`, etc.

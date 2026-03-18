---
name: Core Loop Analysis
description: What's actually fun, what's broken, and what the real core loop is
type: project
---

**The Real Core Loop (as built):**
1. Wreck beach — scavenge materials, build raft (tutorial/intro)
2. Sail to home island — farming, NPCs, building, fishing, diving
3. Row to Terra Nova — expedition/conquest mode
4. Colonize Terra Nova — colony system, trade routes
5. Imperial Bridge — walk between islands
6. New islands (Vulcan, Hyperborea, Plenty, Necropolis) — resource gathering stubs

**What is genuinely working:**
- Wreck beach intro: fully realized, charming (crabs, palms, scav nodes, raft building)
- Home island: farming, NPC hearts, building, fishing, cooking, cats, chickens
- Diving: functional, treasure spawning, sea creatures, breath bar
- Conquest island: tree chopping, enemy waves, soldier AI, boss system, colony
- Imperial bridge: construction + walking between islands
- Trade routes: ships visually sailing, gold income, colony spec
- Combat system: XP, combos, dodge roll, damage numbers, 3 skills
- Narrative engine: 10-chapter quest chain with objectives and rewards
- Sound: procedural lyre music, ambient waves/wind/birds, SFX pool
- Menu: beautiful animated background with parallax, boats, birds

**What is BROKEN or stub:**
- 4 new islands (Vulcan, Hyperborea, Plenty, Necropolis): enter/exit works, visuals exist, but [E] interactions do nothing — obsidianNodes, frostNodes, spiceNodes, soulNodes have no harvest handler
- `const dt = 1;` in drawInner() means delta time is always 1 frame — FPS drops will slow the game proportionally instead of maintaining game speed
- Combat skill tree in state (skills: whirlwind, shieldBash, etc.) is defined but no skill tree UI exists
- Pirate raid system (state.pirateRaid) is defined but no update/draw code
- Fleet system (state.fleet) is defined but no update/draw code
- Imperial treasury rank system is defined but never updates
- `menu_bg.webp` must exist as a file — not bundled
- New island resources not saved (obsidian, frostCrystal, exoticSpices, soulEssence missing from saveGame())
- Colony specialization only has 3 of 5 planned specs

**What is 7/10 and needs polish:**
- Conquest combat: fun but enemies can crash the system (error recovery code is evidence)
- Dialogue system: typewriter text exists but many NPCs just cycle 10 hardcoded lines
- Quest objectives: checked via closures in narrative.js but reward delivery is incomplete

**Why:** Documented during full codebase audit, March 2026.

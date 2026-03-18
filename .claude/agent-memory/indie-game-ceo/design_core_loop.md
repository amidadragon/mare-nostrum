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
- Combat skill tree UI: state.player.skills + skillPoints defined, grantXP() awards points, but NO UI exists to spend them — biggest vibe-killer per audit
- D-key conflict: keyPressed() triggers enterDive() on 'd', updatePlayer() uses keyIsDown(68) for rightward movement — simultaneous fire
- Agricultural spec misdescription: UI says "3x harvest" but code (sketch.js:18995) does harvestAmt * 1.3 (30%)
- Diving resources not saved: pearls/sponges/coral counters in state.dive never written to saveGame() — reset on reload
- Fake loading screen: index.html uses setTimeout(1500) CSS animation; if CDN slow, game silently fails
- Dawn prayer + oracle_riddle autocomplete together (sketch.js:22596-22604) — both flags set in same shrine interaction
- Livia has no dialogue entries in either dialogue system (old arrays and getExpandedDialogue() both missing her)
- Engine plugin system (registerUpdate/registerDraw in engine.js): built but never called from draw loop
- 4 new islands (Vulcan, Hyperborea, Plenty, Necropolis): Sprint 1 complete per islands.js — enter/exit/interact all wired — but no recurring reason to revisit
- Pirate raid system (state.pirateRaid) is defined but no update/draw code
- Fleet system (state.fleet) is defined but no update/draw code
- Old NPC line arrays (MARCUS_LINES, VESTA_LINES, FELIX_LINES at sketch.js:5783) are dead weight — expanded dialogue system supersedes them
- HUD shows DAY twice: left panel (drawHUD() line 18004) AND top-center widget (drawTimeWidget() line 18138)
- Damage numbers have camera-drift jank: world-space spawn, screen-space render, no camera-delta correction

**Priority fix order (from full audit):**
1. Skill tree UI (biggest impact — severs the core combat loop)
2. D-key conflict (one-line fix, high visibility bug)
3. Agricultural spec string fix (trust issue)
4. Save diving resources (data loss)
5. Fix fake loader
6. Fix oracle_riddle autocomplete
7. Fix Livia dialogue

**What is 7/10 and needs polish:**
- Combat: great juice but skills feel identical to basic attacks (no hit-stop or extra screenshake)
- Conquest combat: fun but enemies can crash the system (error recovery code is evidence)
- Dialogue system: typewriter text exists, expanded system good, but still falls back to generic on Livia
- Quest objectives: checked via closures in narrative.js but reward delivery is incomplete
- Island revisit: 4 new islands need 1 recurring daily resource each to stay relevant

**Why:** Full first-player codebase audit completed March 2026. All 8 files read (sketch.js ~24k lines, combat.js, diving.js, economy.js, islands.js, narrative.js, engine.js, debug.js, index.html).

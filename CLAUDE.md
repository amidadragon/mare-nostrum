# Mare Nostrum — Cozy Roman Solarpunk Life-Sim

## Overview
Browser-playable p5.js game. Shipwrecked Roman exile rebuilds on floating islands — farming, combat, colony building, 10-chapter narrative. v1.0.0 release candidate.

## Tech Stack
- **Renderer**: p5.js (CDN, no build step)
- **Audio**: p5.sound (procedural — 6 lyre modes, 25+ SFX, ambient per island)
- **State**: JS state machine, localStorage save/load (format v7)
- **Input**: WASD/arrows + click-to-move + touch
- **Target**: Desktop browser + mobile canvas
- **PWA**: manifest.json + sw.js for offline play

## Commands
```bash
npm run dev       # Live-server with hot reload on port 8080
npm run start     # Same but opens browser
npm run check     # Syntax-check all 19 JS files
npm run count     # Line count per file
npm run build     # Create itch.io zip at dist/mare-nostrum-v1.0.0.zip
```

## Architecture
```
index.html          — Shell, loads p5.js CDN + all 19 JS files
sketch.js           — Core game (~17k lines, state, init, draw loop, save/load)
  ├── State/Init    — Game state, initState(), setup(), BLUEPRINTS, analytics
  ├── Draw loop     — draw() → drawInner() dispatcher
  ├── Building      — 26 building types, placement, drawOneBuilding, demolish
  ├── Companions    — 4 autonomous AI critters (cat, tortoise, crow, centurion)
  ├── DayNight      — Time cycle, seasons, weather, solar energy
  ├── Particles     — Pollen, sparkles, combat effects
  ├── Save/Load     — localStorage v7 with version migration + island loot
  ├── Conquest      — Terra Nova expedition system
  └── Expansion     — expandIsland(), buildIsland(), zone-based building spawn
world.js            — Island terrain, coastline, hills, sky, ports, Atlantis rings
player.js           — Movement, animation, combat input, wardrobe, drawPlayer
farming.js          — Crops, growth stages, harvest combos, farm grid
fishing.js          — 3-phase bobber fishing, fish types, codex data
npc.js              — 4 NPCs, dialogue, daily wants, favor, ambient citizens
ui.js               — HUD, hotbar, build menu, shop, codex, journal, screenshot mode
events.js           — Random events (11 types), festivals (4 seasonal)
cinematics.js       — Intro cinematic, sailing cutscene, pre-repair scene
menu.js             — Menu screen, settings panel, scrolling credits
wreck.js            — Wreck beach island (17 functions)
combat.js           — Combat system, 9-skill tree, arena waves, 9 enemy types
diving.js           — Underwater exploration, treasure
economy.js          — Trade routes, Hanno merchant, colony income
islands.js          — 4 explorable islands (Vulcan, Hyperborea, Plenty, Necropolis)
narrative.js        — 10-chapter quest chain, NPC quests, daily wants data, lore
sound.js            — Procedural lyre (6 modes), 25+ SFX, harmony, rain ambient
engine.js           — Event bus, object pooling, camera culling
debug.js            — Debug console (` key), 25+ cheat commands
sw.js               — Service worker for offline caching
manifest.json       — PWA manifest
```

## Key Globals (shared across all JS files)
- `state` — all game state (the single source of truth)
- `WORLD` — island constants (islandCX=600, islandCY=400, islandRX=500, islandRY=320)
- `cam`, `camSmooth` — camera position
- `w2sX()`, `w2sY()`, `s2wX()`, `s2wY()` — world↔screen coordinate conversion
- `getSurfaceRX()`, `getSurfaceRY()` — island walkable area radii (90% / 36% of island)
- `addFloatingText()` — in-world popup text
- `spawnParticles()` — particle effects (capped at `_particleCap`, auto-throttles on low FPS)
- `snd` — SoundManager instance (created in setup())
- `particles[]` — global particle array
- `gameScreen` — 'menu' | 'game' | 'settings' | 'credits'
- `floatOffset` — island bob animation (used in translate context)
- `horizonOffset` — dynamic horizon position
- `trackMilestone(name)` — analytics tracking (idempotent)

## Important Patterns
- **Coordinate spaces**: Island objects are drawn inside `translate(shakeX, shakeY + floatOffset)`. Mouse→world conversion must account for this: `s2wX(mouseX - shakeX)`, `s2wY(mouseY - shakeY - floatOffset)`
- **Buildings**: Use BLUEPRINTS object with `minLevel` for level-gating. Build ghost must render in same translate context as placed buildings.
- **Island positions**: Scale dynamically via `getSurfaceRX() * factor`. Distant islands must clamp Y to horizon: `max(sy, horizonY)`
- **Save format**: Version 7. Island loot arrays need `|| []` guards (arrays only exist after first island visit).
- **Narrative flags**: Stored in `state.narrativeFlags{}`. Interact-type quest objectives check these flags.
- **Lyre system**: Single `updateLyre()` call per frame (NOT in both draw() and drawInner()). 6 modes: peaceful, tense, eerie, menu, celebration, night.
- **Tools**: `state.tools.{sickle, axe, net, copperRod, ironRod, steelPick, lantern}` — each must have both a shop entry AND gameplay effect code.
- **Debug**: Press ` in-game → /god, /gold N, /level N, /hearts N, /crystal N, etc.
- **Analytics**: `trackMilestone('name')` records to localStorage, viewable via browser console: `JSON.parse(localStorage.getItem('mare_nostrum_analytics'))`

## Common Bugs to Watch
- **Double calls**: Never call `snd.updateLyre()` twice per frame (causes oscillator fighting → silence)
- **floatOffset**: Don't apply it twice to ghost/preview renders. Check parent translate context.
- **Island arrays**: `state.vulcan.obsidianNodes`, `state.hyperborea.frostNodes` (NOT iceNodes), `state.plenty.spiceNodes`, `state.necropolis.tombs/soulNodes/ghostNPCs` — all undefined until first island visit. Always guard with `|| []` in save code.
- **Distant islands**: Must use horizon-clamped draw functions (`drawArenaIsleDistant`, `drawConquestIsleDistant`) not the full render functions.
- **Progression gate**: `state.progression.villaCleared` must be true to board ship. Safety: auto-set if Livia hearts >= 2 on load.

## Modularization Status (Complete)
19 JS files. sketch.js reduced from 25k to 17k. All systems extracted:
world.js, player.js, ui.js, npc.js, events.js, farming.js, fishing.js,
combat.js, economy.js, narrative.js, sound.js, diving.js, islands.js,
cinematics.js, menu.js, wreck.js, engine.js, debug.js
Agents can now work on 12+ files in parallel. Only sketch.js needs sequential access.

## Agent Workflow
When doing major work, use parallel agents:
- **qa-tester**: After any code changes, finds runtime bugs
- **sound-designer**: Audio issues, new SFX/music modes
- **game-designer**: Balance, content, dead features
- **art-director**: Visual bugs, sprite rendering, coordinate issues
- **devops**: Builds, deployment, PWA, performance
- **marketing**: Store page, social media, press kit
- **general-purpose**: Modularization extraction, analytics, misc

Launch multiple agents in parallel for independent tasks. They can't see each other's work — resolve conflicts when results come back.

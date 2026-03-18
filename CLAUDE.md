# Mare Nostrum — Cozy Roman Solarpunk Life-Sim

## Overview
Browser-playable p5.js game. Shipwrecked Roman exile rebuilds on floating islands — farming, combat, colony building, 10-chapter narrative.

## Tech Stack
- **Renderer**: p5.js (CDN, no build step)
- **Audio**: p5.sound (procedural — lyre, SFX, ambient)
- **State**: JS state machine, localStorage save/load
- **Input**: WASD/arrows + click-to-move + touch
- **Target**: Desktop browser + mobile canvas

## Commands
```bash
npm run dev       # Live-server with hot reload on port 8080
npm run start     # Same but opens browser
npm run check     # Syntax-check all JS files
npm run count     # Line count per file
```

## Architecture
```
index.html          — Shell, loads p5.js CDN + all JS files
sketch.js           — Main game (~23k lines, being modularized)
  ├── State/Init    — Game state, initState(), setup()
  ├── Draw loop     — draw() → drawInner() dispatcher
  ├── World         — Island terrain, floating island rendering
  ├── Player        — Movement, inventory, actions, tools
  ├── Farming       — Crops, growth stages, harvest combos
  ├── Building      — 20 building types, placement, BLUEPRINTS
  ├── Companions    — 4 autonomous AI critters
  ├── NPCs          — 4 villagers (Livia, Marcus, Vesta, Felix)
  ├── DayNight      — Time cycle, seasons, weather, solar energy
  ├── Particles     — Sunbeams, pollen, sparkles, combat effects
  ├── UI/HUD        — Resource display, dialogue, menus
  ├── SoundManager  — Procedural audio (lyre, ambient, SFX)
  ├── Save/Load     — localStorage with version migration
  └── Cinematics    — Wreck intro, sailing cutscene
combat.js           — Combat system, skills, XP, damage
diving.js           — Underwater exploration, treasure
economy.js          — Trade routes, colony income, merchant
islands.js          — 4 explorable islands (Vulcan, Hyperborea, Plenty, Necropolis)
narrative.js        — 10-chapter quest chain, NPC quests, lore tablets
engine.js           — Event bus, object pooling, camera culling
debug.js            — Debug console (` key), 25+ cheat commands
```

## Game Design
- **Setting**: Floating Mediterranean islands, solarpunk aesthetic
- **Core loop**: Farm → craft → gift NPCs → unlock hearts → expand island → explore
- **Progression**: Island levels 1-25 (Citizen → Governor → Senator → Consul → Imperator)
- **Narrative**: 10-chapter quest from shipwrecked exile to Imperator
- **Palette**: Warm greens, soft golds, sunset oranges, bioluminescent teals at night

## Key Globals (shared across files)
- `state` — all game state
- `WORLD` — island constants (islandCX, islandCY, islandRX, islandRY)
- `cam`, `camSmooth` — camera position
- `w2sX()`, `w2sY()`, `s2wX()`, `s2wY()` — world↔screen coordinate conversion
- `getSurfaceRX()`, `getSurfaceRY()` — island walkable area radii
- `addFloatingText()` — in-world popup text
- `spawnParticles()` — particle effects
- `snd` — SoundManager instance
- `particles[]` — global particle array
- `gameScreen` — 'menu' | 'game' | 'settings' | 'credits'

## Important Patterns
- Buildings use BLUEPRINTS object with `minLevel` for level-gating
- Island positions scale dynamically: `getSurfaceRX() * factor`
- Save format version 7 — old saves auto-migrate
- Narrative flags stored in `state.narrativeFlags{}` — set by interactions
- Debug console: press ` in-game, type /god, /gold, /level N, etc.

## Modularization Plan
See MODULARIZATION_PLAN.md — sketch.js can be split into 15 modules.
Priority extractions: sound.js, cinematics.js, wreck.js, menu.js

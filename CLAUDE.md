# Sunlit Isles — Cozy Solarpunk Life-Sim

## Overview
Browser-playable (PWA-ready) cozy life-sim prototype. Floating islands, solar tech fused with nature, autonomous companions, farming, and village life.

## Tech Stack
- **Renderer**: p5.js (CDN, no build step)
- **Structure**: Single index.html + sketch.js
- **State**: Simple JS state machine (no framework)
- **Input**: WASD/arrows + click-to-move + touch
- **Target**: Desktop browser + mobile-friendly canvas

## Architecture
```
index.html          — Shell, loads p5.js + sketch.js
sketch.js           — All game logic
  ├── World         — Island terrain, tile grid
  ├── Player        — Movement, inventory, actions
  ├── Farming       — Crops, growth stages, harvest
  ├── Companions    — Autonomous critters (AI routines)
  ├── NPC           — Villager dialogue, hearts
  ├── DayNight      — Time cycle, solar energy
  ├── Particles     — Sunbeams, pollen, sparkles
  └── UI            — HUD, inventory, dialogue box
```

## Game Design
- **Setting**: Single floating island, warm solarpunk aesthetic
- **Core loop**: Plant crops → companions auto-gather → harvest → gift to villager → unlock hearts
- **Companions**: Vine-monkey (gathers), Solar-bird (pollinates). Auto-work when placed in zones.
- **Energy**: Solar charges companions during day, they rest at night.
- **Palette**: Warm greens, soft golds, sunset oranges, bioluminescent teals at night.

## Iteration Plan
1. [x] MVP: Island, player, farming, 1 companion, day/night
2. [x] Villager NPCs (Livia, Marcus, Vesta, Felix) with dialogue + hearts
3. [x] Multiple companions (Lares, Woodcutter, Harvester, Centurion)
4. [x] Inventory system + crafting + cooking
5. [x] Procedural sound (p5.sound) + Roman lyre music
6. [x] Pixel art style rendering
7. [x] Save/load (localStorage)
8. [x] Conquest system (Terra Nova) + Arena Isle
9. [x] Expedition upgrades, bounty board, equipment shop
10. [x] Wreck island intro + cinematic story progression
11. [x] Island expansion levels 1-25 (Citizen → Imperator)
12. [x] Colony system — colonize Terra Nova after settling
13. [x] Imperial Bridge — walk between connected islands
14. [ ] More colonizable islands (east, north directions)
15. [ ] Colony trade routes between islands
16. [ ] Naval fleet / sea combat
17. [ ] PWA manifest + service worker

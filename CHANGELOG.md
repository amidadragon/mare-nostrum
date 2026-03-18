# Mare Nostrum — Changelog

## v0.9.0 — Imperial Expansion (Sprint 1)

### Architecture
- Added `engine.js` — Event bus, plugin system, object pooling, camera culling
- Added `debug.js` — Debug console (` key) with 25+ cheat commands
- Prepared for modular file split (core, world, combat, economy, narrative, ui, audio, main)

### Island Colonization & Connection
- Island level cap raised from 5 to 25 (Citizen → Governor → Senator → Consul → Imperator)
- Multi-resource expansion costs (crystals + stone + iron + relics + titan bone at higher tiers)
- Procedural expansion content for levels 6-25
- Colony system: colonize settled Terra Nova (unlocks at Governor rank, level 10)
- Colony leveling (1-10) with buildings, farms, workers, passive income
- Imperial Bridge: walkable stone causeway between home and colony (unlocks at Consul rank, level 20)
- Bridge construction with progress bar, Roman architecture (pillars, balustrades, torches)

### Main Menu Redesign
- Cinematic centered layout with title at 52% height
- Vertical menu items with slide-in animation and Roman chevron hover effects
- Dark vignette framing, golden dust particles, god rays
- Parallax drift on background image
- Matching loading screen with Cinzel font

### Save Format
- Bumped to version 7
- Colony state, bridge state, expanded island levels all persisted

### Debug Console
- ` to toggle
- /god, /gold, /allres, /level, /tp, /home, /terra, /settle, /colonize, /bridge
- /spawn, /heal, /weapon, /armor, /hearts, /day, /time, /fps, /save
- Eval fallback for arbitrary JS expressions

---

## v0.8.x — Previous (Pre-expansion)
- Original game with 5-level island, Terra Nova conquest, Arena Isle
- Wreck beach intro, 4 NPCs, companions, farming, fishing, cooking
- Expedition system, bounty board, equipment shop
- Procedural audio, day/night cycle, seasons, weather

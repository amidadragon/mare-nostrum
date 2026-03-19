---
name: Combat & Expedition Overhaul
description: Combat juice, new enemy types, enhanced arena, expedition summary overlay — all implemented in sketch.js
type: project
---

## What was built (March 2026)

### New Enemy Types (sketch.js)
- `shield_bearer`: HP 90, blocks frontal attacks 75% (checks if player is on same side as shield), pixel art with blue shield. `shieldSide` field tracks facing.
- `archer`: HP 25, high damage (18), keeps distance at 100px, fires arrow projectiles stored in `a.arrows[]`. Strafe movement pattern. Pixel art with bow and quiver.
- `centurion`: Boss enemy, HP 350, damage 30, transverse-crest helmet, charges like minotaur but faster (6x speed mult vs 5x), drops relic 60% chance + 50 gold + 4 crystals. Triggers `spawnBossDefeated()`.

All in `getEnemyStats()` (~line 14410) and drawn in `drawOneEnemy()`.

### Arena Wave System
- `WAVE_DEFS` extended from 5 to 10 waves (added shield_bearer/archer/centurion waves)
- `generateWaveDef(n)` for infinite waves beyond wave 10 — procedural scaling, boss every 5th wave
- `spawnWave(n)` uses `generateWaveDef` for n > 10, announces BOSS WAVE with red screen flash
- HP scaling: 8% per wave beyond wave 10
- Wave clear is now infinite (no more "victory" state — keeps going)
- Boss wave clears call `spawnBossDefeated()`

### Arena HUD Enhancements
- Wave counter shows enemy count remaining
- Boss wave indicator in orange/red
- "Next wave: BOSS WAVE!" warning during intermission
- Best wave / high score shown below wave text
- Retreat screen overlay (3s countdown): shows kills, gold earned, damage taken, new best wave if achieved
- `a.damageThisWave` tracks per-wave damage for perfect clear bonus (+5g)
- `a.totalDamageTaken` and `a.goldEarned` tracked per arena session

### Arrow Projectile System
- Stored in `a.arrows[]` (array on adventure state)
- Updated in `updateAdventure()` before loot update
- Drawn in `drawAdventureEntities()` after `drawLoot()`
- Hit detection: 20px range from player, applies armor + fortify reduction, 20-frame iframes after hit

### Kill Burst Particles
- `enemyDeath()` now spawns colored burst by type + flash ring pulse_ring particle
- Colors: wolf=brown, harpy=purple, archer=blue, shield_bearer=blue, centurion/minotaur=orange

### Combo Integration in playerAttack
- `_registerComboHit()` called on every hit
- Damage numbers use combo color (orange if multiplied)
- Shake scales with weapon tier (2+weapon, 4+weapon*2)

### Expedition Summary Overlay
- `state._expedSummary` set by `exitConquest()` — shows for 7s then fades
- `drawExpeditionSummaryOverlay()` (~line 14659) drawn in main draw loop
- Shows: expedition #, danger level, enemies defeated, gold earned, soldiers survived/lost, itemized loot
- "Flawless expedition!" if no soldiers lost
- `c._soldiersAtStart` tracked in `enterConquest()` for accurate loss count

### Rare Discoveries
- Added to `dropExpeditionLoot()` normal enemy drops
- ~4-9% chance at danger level 3+ (scales with danger)
- 50/50 split: lore_tablet (grants 50 XP) or blueprint (grants 15 gold)
- Stored in `state._pendingDiscovery` (timer-based, display TODO)
- 5 names per type defined inline

**Why:** The goal was to make combat feel impactful with juice, give arena infinite replayability, and make expedition rewards feel meaningful with a proper victory screen.

**How to apply:** When touching combat, check arrow array on `a.arrows`, enemy types include 'shield_bearer'/'archer'/'centurion'. Expedition summary uses `state._expedSummary`.

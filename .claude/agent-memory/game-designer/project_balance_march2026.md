---
name: Balance Audit March 2026
description: Findings and fixes from crystal economy, combat XP, recipes, and equipment balance audit
type: project
---

Key findings from the March 2026 balance pass on sketch.js (~22k lines).

**Why:** Full audit of recent content additions to validate progression and find dead features.
**How to apply:** Use these benchmarks when designing future content; reference the three confirmed dead features as a checklist pattern.

## Time Math (critical reference)
- `state.time += 0.18 * dt` (dt = 1 frame at 60fps)
- 1 real second = 60 frames → game time advances 10.8 game-minutes/real-second
- 1 game day = 1440 game-minutes = **8000 frames = 133 real seconds (~2.2 real minutes)**
- When writing frame-based timers for "1 game day" use **8000 frames**, not `60*60*24` (which is 86400 frames = 10.8 game days).

## Crystal Economy
- Full progression to island level 25 costs **3,256 crystals total**
- Passive sources (crystal rain 15%/day avg 3, Vesta gift 40%/day 2 crystals) yield ~250 crystals over 8 hours — not enough alone
- Active crystal node mining can yield ~2400+ crystals in 8 hours (5 nodes, 800-frame respawn each)
- Combined, reaching level 25 in 8 hours is achievable but requires active play — intentional design, not broken
- Crystal rain (day 10+, 15%, +2-4) and Vesta gift (6 hearts, 40%, +2) are marginal supplements, not primary sources

## Combat XP Pacing
- Formula: `25 + dangerLevel * 5` per kill; level threshold: `level * 100`
- DL1: 30 XP/kill. Level 1→2 needs 4 kills. Level 10→11 needs 34 kills. Reasonable early curve.
- DL10: 75 XP/kill. Level 15→16 needs 20 kills, Level 20→21 needs 27 kills. Late game scales well.
- Pacing is healthy — danger levels scale XP in proportion to enemy difficulty.

## Fixed Bugs (March 2026)

### 1. xpBoostTimer was 60x too large
- Was: `60 * 60 * 24 = 86400 frames` = 24 real minutes = ~10.8 game days
- Fixed to: `8000 frames` = exactly 1 game day
- Comment in code said "~24 real seconds" but value was 24 real MINUTES
- Location: sketch.js `useHoneyedFigs()` ~line 13505

### 2. Steel Pickaxe (state.tools.steelPick) had no effect
- Purchased for 40g with description "2x mining speed" but `state.tools.steelPick` was never read
- Fixed: crystal node `respawnTimer` now halved (400 vs 800 frames) when steelPick owned
- Location: sketch.js crystal node harvest block ~line 17554

### 3. Lantern tool (state.tools.lantern) had no effect on the player
- Purchased for 35g with description "night visibility" but `state.tools.lantern` was never read
- The `lantern` building type worked, but the handheld tool did nothing
- Fixed: added player-radius light pool (r=90) drawn in `drawNightLighting()` when tool owned
- Location: sketch.js end of `drawNightLighting()` ~line 5747

## Recipe Balance Notes
- Stew (harvest 2 + fish 1 + wood 2 → 30 HP heal): fair for ingredients, hearts 2 gate
- Garum (fish 3 → 25g): ~8.3g/fish, reasonable crafting premium, hearts 1 gate
- Honeyed Figs (exoticSpices 1 + harvest 2 → +15% XP 1 day): hearts 3 gate, late-island spice required — well gated; timer now fixed
- Ambrosia (soulEssence 2 + wine 1 + crystals 1 → full heal + 5s invuln): late-game emergency item, hearts 5 gate, ingredients all late-game. Balanced.

## Fishing Rod Bonuses (confirmed working)
- Copper Rod (30g): `biteTime * 0.85` — 15% faster bite
- Iron Rod (60g): `biteTime * 0.70` — 30% faster bite
- These ARE correctly wired in `startFishing()` ~line 8411

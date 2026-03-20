---
name: Balance & Progression Audit (March 2026)
description: Full audit of early/mid/late game pacing, iron wall, reward frequency, and numerical fixes applied
type: project
---

# Balance Audit — March 2026

## Key Values Found

### Crop Growth
- Timer threshold: `p.timer >= 120` with `growRate = 1/frame` at 60fps = ~2 min real time
- Stages: `p.stage = min(3, floor(p.timer / 40))` — 3 stages before ripe at 120
- Aqueduct within 80 world-units doubles growRate (2x speed)
- Colony plots: advance by +60/timer call at day tick — much faster than home island

### XP System
- `grantXP()` defined in combat.js, callable globally
- Before audit: only called from combat kills (25 + dangerLevel*5 per kill) and diving (+15)
- **After audit**: also called at harvest (+5 per harvest unit), fishing (fishType.weight*5), building (minLevel*5 or 10 baseline)
- Level threshold: `level * 100` XP per level — level 1→2 costs 100 XP

### Iron Ore Sources (before audit)
- Quarrier companion: level 7+, 15% per stone mine — very low
- Conquest island: combat drops 2-5 iron, 15% per regular kill
- Mining colony spec: 0.5*colonyLevel iron/day at level 5+
- Hanno merchant: Damascus Iron = 5 iron for 55g (only when stocked)
- No home-island rock nodes that yield iron

### Iron Ore Sources (after audit)
- Quarrier companion: **level 5+ at 20%, level 7+ at 35%** per stone mine
- All others unchanged

### Colonize Terra Nova Cost
- Before: 200g, 80 wood, 50 stone, 20 iron, 5 relics
- **After: 150g, 60 wood, 40 stone, 10 iron, 3 relics**
- Rationale: iron and relics both require combat — double-gating the most important mid-game unlock was too harsh

### Colony Starting Income
- Before: 5g/day
- **After: 15g/day**
- Comparison: trade routes earn 10-22g per round trip (which takes real-time minutes)

### Daily Quest Rewards
- Before: flat 6-20g regardless of island level
- **After: scale with island level — goldMult = 1 + floor(lvl/5)*0.5**
  - Level 1-4: 10-28g base
  - Level 5-9: 15-42g (1.5x)
  - Level 10-14: 20-56g (2x)
  - Level 15+: continues scaling

## Issues Found But Not Fixed (for future)
- No XP for stone/crystal mining (low priority — it's already pretty fast)
- Bridge cost (200 stone, 100 wood, 40 iron, 15 relics, 5 bone) may still be rough — requires conquest plus late game. Flag for late-game audit.
- grantXP only called from combat.js and fishing.js/sketch.js — if combat.js loads after those files, grantXP will be undefined at first call. The `typeof grantXP === 'function'` guard handles this safely.
- Colony income scaling: `+5 + colonyLevel*2` per level-up — at level 5 that's 15+10+12+14+16 = accumulated 67g/day total. Reasonable.

## Reward Frequency Analysis
- Crop harvest: every ~2 min (early), ~1 min with aqueduct
- Fish catch: every 2-5 min (90-300 frame wait / 60fps)
- Daily quests: 1 active at a time, 3-8 actions to complete
- Level ups: ~4-6 combat kills per level early game
- With farming/fishing XP added: players who don't do combat can level up meaningfully

## Files Changed
- `sketch.js`: quarrier iron chance (line ~8657), colonize cost (line ~13148), colony income (line ~13171), quest rewards (line ~17808), XP on harvest (line ~15362), XP on build (line ~7352)
- `fishing.js`: XP on fish reel (line ~200)

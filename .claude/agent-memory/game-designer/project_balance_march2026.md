---
name: Balance Audit March 2026
description: Findings and fixes from crystal economy, combat XP, recipes, equipment balance, and dead-feature audit (updated RC pass)
type: project
---

Key findings from the March 2026 balance passes on sketch.js (~21k lines) and the RC full audit.

**Why:** Full audit of recent content additions to validate progression and find dead features.
**How to apply:** Use these benchmarks when designing future content; reference the confirmed dead features as a checklist pattern.

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

## Fixed Bugs (First Pass — March 2026)

### 1. xpBoostTimer was 60x too large
- Was: `60 * 60 * 24 = 86400 frames` = 24 real minutes = ~10.8 game days
- Fixed to: `8000 frames` = exactly 1 game day
- Location: sketch.js `useHoneyedFigs()` ~line 13505

### 2. Steel Pickaxe (state.tools.steelPick) had no effect
- Purchased for 40g with description "2x mining speed" but `state.tools.steelPick` was never read
- Fixed: crystal node `respawnTimer` now halved (400 vs 800 frames) when steelPick owned
- Location: sketch.js crystal node harvest block ~line 17554

### 3. Lantern tool (state.tools.lantern) had no effect on the player
- Purchased for 35g with description "night visibility" but `state.tools.lantern` was never read
- Fixed: added player-radius light pool (r=90) drawn in `drawNightLighting()` when tool owned
- Location: sketch.js end of `drawNightLighting()` ~line 5747

## Fixed Bugs (RC Pass — March 2026)

### 4. Trade route gold too low (economy.js)
- Was: fish 5g, grain 8g, wood 6g, stone 7g, wine 12g, crystal 15g
- Fixed to: fish 10g, grain 12g, wood 10g, stone 11g, wine 18g, crystal 22g
- Fish route at 5g took ~800 real days to ROI on 50g+20wood setup cost; now ~450 days
- Route upkeep is 2g/route/day; minimum-value route (fish 10g - 2g upkeep = 8g/day) is now meaningful

### 5. Mining colony spec barely functional (economy.js)
- Was: `floor(colonyLevel * 0.5)` stone/day (5 stone at level 10)
- Fixed to: `floor(colonyLevel * 1.5)` stone/day + iron ore at level 5+ (`floor(colonyLevel * 0.5)`)
- Now 15 stone/day at level 10 — competitive with active chopping

### 6. battleCry, charge, fortify were dead skills (combat.js)
- 3 of 9 skill tree slots (Gladiator: battleCry, Praetor: charge/fortify) were in SKILL_DEFS and purchasable
  but `activateSkill()` had no cases for them — spending skill points did nothing
- Fixed: all three implemented with full behavior and skill-level scaling
  - battleCry: companion +20% speed for 600 frames (Lv1), +30s duration + 25% dmg (Lv2)
    → sets `_battleCryTimer`, read by `getBattleCrySpeedMult()` and `getBattleCryDamageMult()`
  - charge: 80px forward dash + stagger (Lv1), +40px (Lv2), +25 contact dmg (Lv3)
  - fortify: 30% dmg reduction 5s (Lv1), +5s + 10 reflect dmg (Lv2)
    → sets `_fortifyTimer`, read by `getFortifyReduction()` + `getFortifyReflect()`
- Fortify wired into all 3 enemy damage sites in sketch.js (arena minotaur charge, arena normal attack, conquest enemy attack)
- Battle cry speed wired into woodcutter, harvester, quarrier companion updates
- Battle cry damage wired into centurion attack

### 7. Whirlwind and Heal didn't scale with skill level (combat.js)
- Was: whirlwind always 20 dmg; heal always 30 HP regardless of investment
- Fixed:
  - Whirlwind Lv2: +15 dmg (35 total), +10px radius. Lv3: double knockback, -1s CD
  - Heal Lv2: 50 HP. Lv3: 80 HP, -3s CD (180 frames reduction)

### 8. ShieldBash didn't scale with skill level (combat.js)
- Was: always 60 frames stun, no damage
- Fixed: Lv2 = 90 frames stun; Lv3 = 90 frames + 15 bonus damage

### 9. NPC gifts had no daily limit (sketch.js)
- Players could spam wine to reach max hearts in minutes
- Fixed: 1 gift per NPC per in-game day (`lastGiftDay` field on all 4 NPCs)
- Soft gate: "Already gifted today" message shown, NPC still shows dialogue
- Old saves: `lastGiftDay === undefined` means first gift of session always works

### 10. Livia's gift handler didn't apply getGiftMultiplier (sketch.js)
- Marcus/Vesta/Felix used getGiftMultiplier from narrative.js; Livia's handler did not
- Fixed: Livia gift now applies preference multiplier (wine/oil = x2 for Livia)

### 11. Sea Favor Lv2/Lv3 not implemented (sketch.js)
- Description said "bite faster at Lv2, catch doubles on combos at Lv3" but `startFishing()` never checked skill level
- Fixed: Lv2 applies 0.85x bite time multiplier; Lv3 doubles catch when fishing streak >= 3

## Recipe Balance Notes
- Stew (harvest 2 + fish 1 + wood 2 → 30 HP heal): fair for ingredients, hearts 2 gate
- Garum (fish 3 → 25g): ~8.3g/fish, reasonable crafting premium, hearts 1 gate
- Honeyed Figs (exoticSpices 1 + harvest 2 → +15% XP 1 day): hearts 3 gate, late-island spice required — well gated; timer now fixed
- Ambrosia (soulEssence 2 + wine 1 + crystals 1 → full heal + 5s invuln): late-game emergency item, hearts 5 gate, ingredients all late-game. Balanced.

## Fishing Rod Bonuses (confirmed working)
- Copper Rod (30g): `biteTime * 0.85` — 15% faster bite
- Iron Rod (60g): `biteTime * 0.70` — 30% faster bite
- These ARE correctly wired in `startFishing()` ~line 8731

## Weapon/Armor Tiers (confirmed balanced)
- Weapons: Gladius 15 dmg (free), Pilum 20 dmg +12 range (40g), Flamma 25 dmg (80g). Even +5/tier is fine.
- Armors: None 0, Bronze -3 (30g), Iron -6 (60g), Steel -10 (100g). Steel vs wolf (8 base) = 1 dmg min — correct.

## Inactive Skill Slots (harmless, don't fix)
- Player initial state includes `javelin: 0, crystalBolt: 0, healAura: 0, lightning: 0` in `p.skills`
- These are vestigial from old design — no SKILL_DEFS entries for them, never read anywhere
- Harmless dead fields in state; removing would risk breaking save compatibility

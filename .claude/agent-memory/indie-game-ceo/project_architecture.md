---
name: Mare Nostrum Technical Architecture
description: File structure, known technical issues, architecture decisions
type: project
---

**File breakdown (post Sprint 1):**
- sketch.js (23,029 lines) — monolith: all main game logic, drawing, state
- narrative.js (847) — quest chain (10 chapters), NPC dialogue, journal entries
- economy.js (500) — trade routes, colony spec, merchant fleet visuals
- diving.js (434) — underwater exploration
- debug.js (380) — backtick console with /god /gold /tp etc.
- combat.js (334) — XP/leveling, skill system, damage numbers, dodge roll
- islands.js (455) — 4 new islands: Vulcan, Hyperborea, Plenty, Necropolis (FULLY FUNCTIONAL post Sprint 1)
- engine.js (140) — event bus, plugin system, object pool, camera culling

**Known bugs remaining after Sprint 1 (Sprint 2 scope):**
1. Chapters VII-X narrative flags (forge_vulcan_blade, learn_ritual, final_inscription, rite_mare_nostrum) have no setters — Chapter 7-10 can never complete
2. mq_standard_found counter: incremented at sketch.js:15505 correctly (0.08 drop chance at chapter 3)
3. nq_vesta_nights: incremented at sketch.js:3389 BUT checks player is near pyramid — correct but vague to player
4. Colony agricultural spec: economy.js:230 comment "Bonus harvest already handled through colony plots" — NOT implemented, empty stub
5. Lore tablet lookup: narrative.js:698 uses `LORE_TABLETS[lt.id]` where `lt.id` is just an integer 0-19 — this actually works correctly since lt.id is the array index. LOW PRIORITY.
6. dawn_prayer and oracle_riddle auto-complete together at sketch.js:21428-21429 — by design (both fire at same time), but vesta_q3 has two separate objectives that both complete simultaneously. This is acceptable UX but not ideal.
7. MIN_TEXT_SIZE=11 (sketch.js:8) forces all textSize() calls to minimum 11px — small decorative labels that should be 7-8px are forced up. Visual only.

**Architecture decisions:**
- dt hardcoded to 1 was FIXED in Sprint 1 (delta time now working)
- Save system: version 7, new island resources now saved (obsidian, frostCrystal, exoticSpices, soulEssence)
- Colony agricultural spec is the only un-implemented spec — trading and mining work

**Why:** Updated after Sprint 1 completion.
**How to apply:** Critical: fix Chapter 7-10 flags. Agricultural spec needs actual harvest multiplier in harvest code path.

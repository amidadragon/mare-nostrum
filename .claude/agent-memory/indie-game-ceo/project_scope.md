---
name: Mare Nostrum Project Scope
description: What's built, what's stub, what's been cut, Sprint status
type: project
---

**Sprint 1 — COMPLETE:**
- Delta time fixed (was always 1)
- All 4 new island [E] interactions wired up (Vulcan obsidian, Hyperborea frost, Plenty fruits/spices, Necropolis tombs/souls)
- Imperator victory ceremony at level 25
- Island-specific ambient audio (4 islands)
- Dark lyre modes for conquest/necropolis
- Diving audio + depth visuals
- Combat SFX (whirlwind, dodge, hit)
- Visual feedback on empty interactions ("...")
- 7 bug fixes (colonySpec save, narrative flags, etc.)
- Save/load updated with new resources

**Sprint 2 — IN PROGRESS (target: itch.io demo ready):**
Focus: bug closure + 45-min session design + itch.io readiness

**Known bugs to fix (priority order):**
1. HIGH: Chapters 7-10 narrative flags never set — game story cannot complete. Needs setter calls:
   - forge_vulcan_blade: should fire when player interacts with Vulcan forge and has materials (sketch.js near the forge interaction)
   - learn_ritual: should fire from a specific Hyperborea interaction (frozen ruin or special object)
   - final_inscription: should fire from reading Tablet 19 (the last tablet — "Tablet of Mare Nostrum")
   - rite_mare_nostrum: should fire at crystal shrine when conditions met (all NPCs max hearts + level 25)
2. MEDIUM: Colony agricultural spec stub (economy.js:230) — adds nothing to colony plots harvest
3. MEDIUM: dawn_prayer/oracle_riddle autocomplete together — split into two separate time-gated events
4. LOW: MIN_TEXT_SIZE forces labels to 11px — drop to 9px or remove override entirely
5. LOW: nq_vesta_nights counter visibility — player needs a hint to stand near pyramid at night

**What's been cut (do not re-add):**
- Fleet/pirate raid system (state.fleet, state.pirateRaid defined but no logic) — too large for scope
- Skill tree UI — skill tree state exists in player but no UI was built. DEFERRED.
- Touch/mobile controls — DEFERRED to post-itch demo
- PWA manifest/service worker — post-demo

**Itch.io readiness checklist:**
- [ ] All 10 chapters completable
- [ ] 45+ minute session loop (see design_core_loop.md)
- [ ] No crash-on-startup bugs
- [ ] Tutorial covers all core actions
- [ ] Menu screen + credits screen
- [ ] Game has a clear win state (Imperator ceremony)

**Why:** Updated post Sprint 1 with concrete bug analysis.
**How to apply:** Sprint 2 dev should close bugs 1-4 first, then content work.

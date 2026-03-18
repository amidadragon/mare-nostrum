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

**Sprint 2 — COMPLETE (working tree, not committed):**
- Sky/horizon chaos bug: FIXED (camOffsetY * 0.05 gentle parallax instead of 1:1 camera tracking)
- Quarrier companion added (auto-mines stone, unlocks at island level 5)
- Fix is uncommitted — needs a commit

**Sprint 3 — PLANNED (itch.io release sprint):**
Focus: Screenshot moments, first impression polish, narrative completion, itch.io readiness

**Known bugs to fix (Sprint 3 priority order):**
1. HIGH: Chapters 7-10 narrative flags — forge_vulcan_blade setter exists in islands.js:364, learn_ritual setter exists in islands.js:460 — need to verify they fire correctly. final_inscription fires at narrative.js:724. rite_mare_nostrum fires at sketch.js:19261. All setters EXIST but untested.
2. HIGH: Colony agricultural spec stub (economy.js:230) — adds nothing to harvest
3. MEDIUM: dawn_prayer/oracle_riddle autocomplete together — acceptable but not ideal
4. LOW: MIN_TEXT_SIZE=11 overrides decorative labels at sketch.js:8

**Itch.io readiness checklist:**
- [x] Sky/atmosphere stable
- [ ] All 10 chapters completable (need playtesting)
- [ ] 45+ minute session loop
- [ ] Photo mode / HUD hide for screenshots (new feature needed)
- [ ] Screenshot-worthy moments clearly staged
- [ ] Tutorial covers all core actions
- [ ] Menu screen + credits screen (exists but credits panel is minimal)
- [ ] Open Graph meta tags in index.html for link sharing
- [ ] Game has a clear win state (Imperator ceremony — exists)
- [ ] Version bump in index.html script tags (currently v=194)

**What's been cut (do not re-add):**
- Fleet/pirate raid system (state.fleet, state.pirateRaid defined but no logic) — too large for scope
- Skill tree UI — skill tree state exists in player but no UI. DEFERRED.
- Touch/mobile controls — DEFERRED to post-itch demo
- PWA manifest/service worker — post-demo

**Why:** Updated after Sprint 2 partial completion and Sprint 3 planning.
**How to apply:** Sprint 3 dev should: commit Sky fix + Quarrier, then tackle itch.io readiness items top-down.

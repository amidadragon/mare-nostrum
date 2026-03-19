---
name: Mare Nostrum Project Scope
description: What's built, what's stub, what's been cut, Sprint status
type: project
---

**Sprint 1 — COMPLETE:**
- Delta time fixed (was always 1)
- All 4 new island [E] interactions wired up
- Imperator victory ceremony at level 25
- Island-specific ambient audio (4 islands)
- Dark lyre modes for conquest/necropolis
- Diving audio + depth visuals
- Combat SFX
- Visual feedback on empty interactions
- Save/load updated with new resources

**Sprint V1.1 — AGENTS COMPLETED (confirmed by code audit March 2026):**
- Cypress trees rewritten — 8-layer tapered column, per-layer sway, 3-shade greens
- Thunder sound fixed — countdown timer, 20-40s between strikes
- Diving resources saved — pearls/coral/sponges/amphoras persist
- Build ghost floatOffset compensation — correct math, ghost aligns with placement
- Skill tree UI — fully implemented in combat.js, 9 skills across 3 branches, click to spend
- NPC dialogue fallback — hearts-only relaxation + full pool fallback
- Chapter 7-10 flags — all setters wired in islands.js and sketch.js
- Ambient ships — 4 ships orbiting the island (but too far/small to see — see CEO_REVIEW.md)
- Zone-based expansion — levels 2-5 hardcoded, levels 6-25 procedural, grass tufts per level
- Quarrier companion — auto-mines stone, unlocks at island level 5

**Remaining post-V1.1 (from CEO_REVIEW.md, ranked by impact/effort):**
1. Port save bug — remove portLeft/portRight from saveGame(), always recompute from islandRX on load
2. Ambient ships visibility — reduce orbit dist 1200-2500 to 600-1000, scale hull up to 1.8
3. Iron ore on home island — add 2-3 iron nodes at level 7-8, OR quarrier yields iron 10% at level 7+
4. Fishing tension — bobber dip animation, splash particle burst, miss message (15 lines)
5. Storm visual — full-screen dark overlay + 4 large foreground clouds covering y 0.26-0.32

**Sprint 3 Visual Priorities (from CEO_SPRINT3.md, March 2026):**
1. Tree flicker fix — floor(sway * t_frac) at line 11934 and 11961. 2 lines. Root cause confirmed: non-integer layerSway causes per-layer pixel edge snapping.
2. HUD visible during dialogue — add `if (dialogState.active) return;` at top of drawHUD() (line 16928). 1 line. drawHUD() only guards photoMode.
3. Ruins detail — add headless statue + amphora + mosaic tile fragment to drawRuins() after line 6529. ~30 lines. Ruins are architecturally correct but narratively silent; no Roman-specific markers.

**What's been cut (do not re-add):**
- Fleet/pirate raid system (state.fleet, state.pirateRaid defined but no logic) — too large for scope
- Touch/mobile controls — DEFERRED to post-itch demo
- Engine.js plugin system (registerUpdate/registerDraw) — built but never called, leave alone
- Iron mine building / dedicated mining NPC — not in scope; quarrier iron yield is the minimal fix

**Itch.io readiness checklist (updated):**
- [x] Sky/atmosphere stable
- [x] Cypress trees look good
- [x] Diving data saves
- [x] Skill tree UI exists
- [x] NPC dialogues don't loop
- [x] All 10 chapters completable (narrative flags all wired)
- [ ] Port interaction reliable (see fix in CEO_REVIEW.md)
- [ ] Ambient ships visible
- [ ] Iron ore accessible before conquest
- [ ] Fishing has some tension
- [ ] Storm looks like a storm
- [ ] Tutorial covers core actions
- [ ] Menu + credits screen (minimal but exists)
- [ ] Version bump to v1.1.0

**Why:** Updated after Sprint V1.1 agent completion and full code audit, March 2026.
**How to apply:** CEO_REVIEW.md has code-level fix details with line numbers for all remaining items.

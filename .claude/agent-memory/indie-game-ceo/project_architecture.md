---
name: Mare Nostrum Technical Architecture
description: File structure, known technical issues, architecture decisions — updated post Sprint V1.1 audit
type: project
---

**File breakdown (post Sprint V1.1 audit):**
- sketch.js (21,386 lines) — monolith: all main game logic, drawing, state
- narrative.js (880) — quest chain (10 chapters), NPC dialogue, journal entries
- economy.js (500) — trade routes, colony spec, merchant fleet visuals
- diving.js (603) — underwater exploration
- debug.js (380) — backtick console with /god /gold /tp etc.
- combat.js (334) — XP/leveling, skill system (FULLY IMPLEMENTED), damage numbers, dodge roll
- islands.js (574) — 4 new islands: Vulcan, Hyperborea, Plenty, Necropolis
- engine.js (140) — event bus, plugin system, object pool, camera culling

**What was fixed in Sprint V1.1 agents (confirmed by code read):**
- Cypress trees fully rewritten (8-layer tapered column, sketch.js ~11749-11795)
- Thunder bug fixed — new countdown timer pattern, sound.js lines 275-284
- Diving resources (pearls/coral/sponges/amphoras) saved to localStorage — lines 19250-19253, 19445-19448
- Build ghost floatOffset compensation correct — drawBuildGhost() line 7489
- Skill tree UI fully implemented — combat.js lines 363-334, wired into draw loop at sketch.js:1945
- NPC dialogue fallback fixed — narrative.js getExpandedDialogue() lines 436-443
- Chapter 7-10 narrative flags all wired — islands.js 367-374, 464-470; sketch.js 18300-18307
- Ambient ships added — drawAmbientShips() at sketch.js:2770, called at line 1691

**Remaining bugs after Sprint V1.1 audit (CEO_REVIEW.md has code-level fixes):**
1. Ambient ships invisible — orbit dist 1200-2500 too far, hull 20px too small to see at horizon
2. Iron ore gated behind conquest — no home island iron node, no mining NPC; mid-game economy wall
3. Storm visual underwhelming — 12 clouds but only cover top 20% of sky, no dark overlay, no foreground drift
4. Port left/right position saved to localStorage — stale coords if crash occurs between expand and save
5. Fishing has no tension — bite only shows text, no bobber dip, no SFX, no miss message

**Architecture decisions:**
- dt hardcoded to 1 was FIXED in Sprint 1 (delta time now working)
- Save system: version 7
- portLeft/portRight should NOT be in saveGame() — they're derived values; should always recompute from islandRX/RY on load (current bug source)
- Colony agricultural spec IS implemented (harvestAmt * 1.3) but UI says "3x harvest" — string mismatch remains

**Why:** Updated after full code audit in Sprint V1.1 review session, March 2026.
**How to apply:** Trust the code read over prior memory. CEO_REVIEW.md has all fix details with line numbers.

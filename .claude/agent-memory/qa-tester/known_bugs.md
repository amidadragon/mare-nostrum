---
name: Known Bugs — Mare Nostrum
description: Confirmed bugs found during QA audits, with severity and fix status
type: project
---

# Known Bugs — Last Audit: 2026-03-20 (Playwright full playthrough)

## CRITICAL (Game Breaking)

### BUG-106: `/dev` and `/home` commands both broken — duplicate switch cases in debug.js
- **Status**: FIXED — verified 2026-03-20. `/dev` at debug.js:87 and `/home` at debug.js:164 are unique cases. Both work correctly.

### BUG-107: `state.progression.tutorialsSeen` not migrated on load — TypeError crash on day 2 and 3
- **Status**: FIXED — verified 2026-03-20. Guard `if (!state.progression.tutorialsSeen) state.progression.tutorialsSeen = {}` now present at sketch.js:17319.

## CRITICAL (Previously Open — Now Fixed)

### BUG-101: drawNightLighting() missing — breaks all home island rendering
- **Status**: FIXED — `function drawNightLighting()` now exists at world.js:1782.

### BUG-031: updateCitizens() ignores dt — speed is frame-rate dependent
- **Status**: FIXED — updateCitizens now at npc.js:547 takes `dt`, uses `c.x += c.vx * dt` and `c.timer -= dt`.

## HIGH

### BUG-102: V key activates both Codex and Bridge start simultaneously
- **File**: sketch.js:15151, 15194
- **Status**: Open

### BUG-105: V key triple-binding — wardrobe, codex, bridge all on same key
- **File**: sketch.js:15112, 15151, 15194
- **Status**: Open

### BUG-030: ESC closes game instead of Empire Dashboard / Inventory / Skill Tree
- **File**: sketch.js:18169–18180 (first block), sketch.js:18707–18712 (dead second block)
- **Status**: Partially fixed — ESC now closes inventory, skill tree, recipe book. But `state.buildMode` is NOT in the ESC handler chain (see BUG-109).

### BUG-109: ESC in build mode exits to main menu instead of closing build mode
- **File**: sketch.js:15602–15622 (ESC handler), sketch.js:16290–16298 (B key toggles buildMode)
- **Type**: missing_handler — `state.buildMode` not checked in ESC chain
- **Impact**: Player opens build mode (B), presses ESC expecting to close it → falls through all overlay checks → `saveGame(); gameScreen = 'menu'`. Game saves and returns to main menu. Build mode is still true on re-entry. Reproducible every time in build mode.
- **Fix**: Add at the top of the ESC block in sketch.js:15602 — `if (state.buildMode) { state.buildMode = false; return; }` — before all other overlay checks.
- **Status**: Open — HIGH

### BUG-018: `rite_mare_nostrum` heart threshold mismatch — Chapter X cannot complete
- **File**: narrative.js:121 (needs >=10), sketch.js:19265-19268 (fires at >=8)
- **Status**: Open

### BUG-003: Conquest error recovery clears soldiers but not conquest.phase
- **Status**: Open

## MEDIUM

### BUG-104: state.vulcan.obsidianNodes/frostNodes accessed without guard on day transition
- **File**: sketch.js:2244-2254
- **Fix**: Add `|| []` guards: `(state.vulcan.obsidianNodes || []).forEach(...)`
- **Status**: Open — lines 2245/2248 now have `|| []` guard. VERIFY on next audit.

### BUG-108: drawLegionPatrol and drawLegionAmbientSoldier render TWO separate visual soldier sets
- **File**: sketch.js:11625 (drawLegionPatrol — orbit circles), sketch.js:5153 (drawLegionAmbientSoldier — Y-sorted entities)
- **Type**: design_issue — not a crash, but double-renders soldiers as two different systems that are kept in parallel
- **Impact**: `drawLegionPatrol` draws soldiers as orbit circles around castrumX/Y using `recruits` count. `drawLegionAmbientSoldier` draws individual soldiers from `legia.soldiers` array in the Y-sorted pass. Both run every frame. Both show the same soldiers in different visual styles at different positions. If the two counts diverge (e.g. after a save/load where recruits count and soldiers array are re-synced differently), the orbit count and actual soldier count won't match.
- **Fix**: Either remove `drawLegionPatrol` entirely (the Y-sorted ambient soldiers are better), or use `drawLegionPatrol` as an overlay only when no soldiers have been placed yet.
- **Status**: Open — Low crash risk, visual confusion

### BUG-022: HUD quarrier bar overlaps rank title text
- **File**: sketch.js:17961–17967
- **Status**: Open

### BUG-023: skipIntro() misses camera snap
- **File**: sketch.js:2302–2307
- **Status**: Open

### BUG-027: steelPick and tools.lantern sold in shop but have no gameplay effect
- **File**: sketch.js:11774–11775
- **Status**: Open

### BUG-008: mq_standard_found counter never incremented
- **Status**: Open

### BUG-012: nq_vesta_nights counter never incremented
- **Status**: Open

### BUG-013: mq_expeditions counter never incremented
- **Status**: Open (note: advanceMainQuestCounter is called in exitConquest — check if advanceMainQuestCounter actually writes to state)

### BUG-110: CONTINUE VOYAGE button unclickable during menu fade-in animation
- **File**: menu.js:954 (`if (menuHover < 0 || menuFadeOut > 0) return`), menu.js:475–477 (slide-in gating)
- **Type**: timing — click lands before `slideProgress` for item 0 reaches > 0
- **Impact**: Player clicks CONTINUE VOYAGE during the slide-in animation (first ~2 seconds after page load) → `menuHover` is -1 because hover detection is skipped when `slideProgress <= 0` → click silently ignored. State remains at `initState()` defaults. Player sees menu still showing.
- **Repro**: Reload page, click CONTINUE VOYAGE immediately before animation completes.
- **Fix**: Either allow hover detection before slide completes (decouple slide from hit detection), or show a loading indicator until `menuFadeIn >= 255`.
- **Status**: Open — MEDIUM

## LOW

### BUG-028: skeleton_death SFX defined but never played
- **Status**: Open

### BUG-005: Necropolis skeleton removal races
- **Status**: Open (cosmetic)

### BUG-011: tradeRouteUI open state not saved
- **Status**: Open

### BUG-020: Obelisk "[E] Study the Obelisk" prompt renders from any distance
- **File**: islands.js:180–186
- **Status**: Open (cosmetic)

### BUG-021: Crafted resource fields (steel, marble, perfume, scrolls) defined but unused and unsaved
- **Status**: Open (placeholder)

## Previously Open — Now Fixed

- BUG-106: duplicate /dev+/home switch cases in debug.js — FIXED (verified 2026-03-20)
- BUG-107: tutorialsSeen missing migration — FIXED (verified 2026-03-20)
- BUG-017: cx/cy used before let declaration in expandIsland — FIXED
- BUG-001: colonySpec never saved — FIXED
- BUG-002: Seven narrative flags never set — FIXED (partially)
- BUG-006: Trapped tomb deals damage but leaves tomb unlooted — FIXED
- BUG-007: wreck.birds/glints not saved — FIXED
- BUG-009: discover_vulcan duplicate — FIXED
- BUG-010: Fruit tree regrow timer never decrements — FIXED
- BUG-019: Island states not saved — FIXED
- BUG-024: drawArenaIsleDistant missing — FIXED
- BUG-025: drawConquestIsleDistant missing — FIXED
- BUG-029: player.xpBoost/xpBoostTimer not saved — FIXED
- BUG-101: drawNightLighting() missing — FIXED
- BUG-031: updateCitizens() ignores dt — FIXED

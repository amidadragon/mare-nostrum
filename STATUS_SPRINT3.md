# Sprint V1.1 — Audit Round 3 Status Report

**Date:** 2026-03-19
**Auditor:** Producer (Aurelian Forge Studio)

---

## 1. Compilation Check

```
npm run check → ALL 12 JS FILES PASS
```

No syntax errors. 29,386 total lines across 14 files (sketch.js: 21,551).

---

## 2. New NPC Wiring Audit: Cook & Fisherman

### Update Loop
- `updateCook(dt)` called at line 1652 — WIRED
- `updateFisherman(dt)` called at line 1653 — WIRED

### Y-Sorted Draw
- `drawCook` pushed to items array at line 6588 (guarded by `state.cook.unlocked`) — WIRED
- `drawFisherman` pushed to items array at line 6590 (guarded by `state.fisherman.unlocked`) — WIRED

### Save/Load
- **MISSING.** Neither `state.cook` nor `state.fisherman` appear in `saveGame()` or `loadGame()`.
- On reload, both NPCs reset to `unlocked: false`. If the player was level 8+ (cook) or level 6+ (fisherman), the NPC will re-announce "joined your island!" and `fishCaught` counter resets to 0.
- This is a **data loss bug** — same class as P1-2 (diving resources). Needs fix.

### Required save/load additions:
```
saveGame: cook: { unlocked: state.cook.unlocked, x: state.cook.x, y: state.cook.y }
          fisherman: { unlocked: state.fisherman.unlocked, fishCaught: state.fisherman.fishCaught }
loadGame: if (d.cook) { state.cook.unlocked = d.cook.unlocked || false; ... }
          if (d.fisherman) { state.fisherman.unlocked = d.fisherman.unlocked || false; ... }
```

---

## 3. Regression Check

### Port Positions: STILL FAILING
`node test-positions.js` fails at levels 4-25. This is a **known issue** from audit round 2. Ports go off-screen as the island grows because `updatePortPositions()` uses absolute `WORLD.islandCX - srx - 20` which becomes negative. Not a new regression — carryover.

### Farm Hardcoding: STILL PRESENT
11 call sites still use `WORLD.islandCX - 220` instead of `getFarmCenterX()`. Not a new regression — carryover.

### ESC During Dialogue: STILL BROKEN
P2-7 never implemented. ESC opens menu instead of dismissing active dialogue. Carryover.

### No NEW Regressions Detected
All previously-passing features still pass. No new compile errors, no new broken patterns introduced.

---

## 4. Features Added Today (Cumulative)

| # | Feature | Status | Sprint Item |
|---|---------|--------|-------------|
| 1 | NPC Dialogue fallback fix | DONE | P1-1 |
| 2 | Marcus [E] ghost prompt fix | DONE | P1-1 |
| 3 | Diving resources save/load | DONE | P1-2 |
| 4 | D-key dive rebound to E | DONE | P1-3 |
| 5 | Skill Tree UI (full 3x3 grid, K toggle) | DONE | P1-4 |
| 6 | Storm clouds expanded (12 clouds) | PARTIAL | P1-6 |
| 7 | Centurion dive freeze fix | DONE | P2-3 |
| 8 | Oracle double-autocomplete fix | DONE | P2-8 |
| 9 | Ag spec "+30%" string fix | PARTIAL | P2-5 |
| 10 | Night sky shooting stars | DONE | P3-5 |
| 11 | Fishing "Got away" mechanic | PARTIAL | P3-3 |
| 12 | Cook NPC (auto-cooks meals, sprite, unlocks at lvl 8) | NEW | Not in sprint |
| 13 | Fisherman NPC (catches fish at port, boat sprite, unlocks at lvl 6) | NEW | Not in sprint |
| 14 | Olive tree type (detailed sprite with gnarled trunk, silver-green canopy) | NEW | P2-1 adjacent |
| 15 | Pine tree type (umbrella stone pine sprite) | NEW | P2-1 adjacent |
| 16 | Improved cypress tree (8-layer foliage, sunlit edge, pointed tip) | IMPROVED | P2-1 |

**Total: 16 features/fixes.** 7 fully done, 3 partial, 6 new additions.

---

## 5. Itch.io Readiness Assessment

### Ready (would not block a launch)
- Core gameplay loop: farming, building, fishing, combat, diving, trading
- 10-chapter narrative with 4 NPCs + 2 new NPCs
- 4 explorable islands with unique content
- Procedural lyre music (6 modes) + 25+ SFX
- Save/load system (format v7)
- Skill tree with 9 skills across 3 branches
- Colony system with specializations
- PWA offline support
- 3 distinct tree types with detailed sprites
- Day/night cycle with shooting stars

### Blockers (must fix before launch)

| # | Issue | Severity | Effort |
|---|-------|----------|--------|
| 1 | **Cook/Fisherman not saved** — data loss on reload | HIGH | S (15 min) |
| 2 | **Port positions fail at level 4+** — ports go off-screen at high levels; camera can scroll to them but test fails and new players may not find them | HIGH | M (30-60 min) |
| 3 | **ESC opens menu during dialogue** — breaks conversation flow, feels broken | MEDIUM | S (5 min) |
| 4 | **Farm positions hardcoded** — farm doesn't scale past level 3-4, crops end up off the walkable surface | MEDIUM | S (15 min) |

### Recommended Before Launch (not blockers but hurt first impression)

| # | Issue | Impact |
|---|-------|--------|
| 1 | Build ghost floatOffset misalignment (P1-5) | Placement feels "off" |
| 2 | Storm still thin — no sun dimming, no overlay (P1-6) | Weather feels placeholder |
| 3 | Damage numbers drift with camera (P2-6) | Visual jank |
| 4 | Trees flicker at island edge (P2-9) | Visual jank |
| 5 | No onboarding tutorial hints (P4-4) | New players lost on home island |

### Honest Verdict

**Not quite ready.** The cook/fisherman save bug is a 15-minute fix. The port position issue is the real blocker — it affects the entire mid-to-late game experience. ESC during dialogue is a 5-minute fix that should have been done two sprints ago.

Fix the 4 blockers above (estimated 1-2 hours total), and this game is shippable to itch.io as a free/PWYW release. The core experience is solid — the narrative arc works, the music is atmospheric, the pixel art NPCs have personality. What's missing is edge-case polish, not substance.

**Estimated distance to launch: 1 focused sprint (2-4 hours of fixes + 1 hour QA playthrough).**

---

## 6. Sprint Velocity Summary

| Metric | Value |
|--------|-------|
| Sprint items fully completed | 7 of 25 (28%) |
| Sprint items partial | 4 of 25 (16%) |
| Sprint items not started | 14 of 25 (56%) |
| New features added (outside sprint) | 4 (cook, fisherman, olive tree, pine tree) |
| Known bugs (current) | 4 blockers + 5 polish |
| New regressions this audit | 0 |
| Files compiling | 12/12 |
| Position tests passing | 3/25 levels |

# SPRINT V1.1 — Audit & TODO for Sprint 2

**Audit Date:** 2026-03-19
**Compiled:** 762K sketch.js, 13 JS files, all syntax-check PASS
**Position Tests:** FAIL at levels 4-25 (ports go off-screen)

---

## DONE (Verified Working)

| Sprint Item | Status | Evidence |
|-------------|--------|----------|
| P1-1: NPC Dialogue Empty Fallback | DONE | `narrative.js:436-441` — relaxed filter falls back to hearts-only, then full pool. Random selection, not `pool[0]`. |
| P1-1: Marcus [E] ghost prompt | DONE | `sketch.js:20815` — checks `!(type === 'marcus' && !npc.present)` before showing prompt. |
| P1-2: Diving Resources Saved | DONE | `sketch.js:19248-19252` — saves pearls/coral/sponges/amphoras. Load at `19444-19447` with `|| 0` guards. |
| P1-3: D-Key Dive Conflict | DONE | Dive rebound to `E` key near water (`sketch.js:18167-18179`). No longer on `D`. |
| P1-6: Storm Clouds Expanded | PARTIAL | Expanded from 4 to 12 clouds, y range now 0.04-0.20. Better but still doesn't cover 0.25-0.35 range. No sun dimming. No storm overlay. No rain streak verification. |
| P2-3: Centurion Dive Freeze | DONE | `sketch.js:9766` — `if (state.diving && state.diving.active) { cen.vx = 0; cen.vy = 0; return; }` |
| P2-5: Ag Spec Wrong Multiplier | PARTIAL | `economy.js:22` fixed to "+30%". `sketch.js:17753` comment fixed. BUT: `sketch.js:756` still says "3x harvest" in comment, `sketch.js:3704` pumpkin desc still says "3x harvest yield". |
| P2-8: Oracle/Storm Double-Autocomplete | DONE | `sketch.js:20359-20371` — dawn_prayer and oracle_riddle now fire in separate time windows with guard. |
| P3-5: Night Sky / Shooting Stars | DONE | `sketch.js:2371-2391` — shooting star system implemented with random spawn + trail. |
| P1-4: Skill Tree UI | DONE | Fully implemented in `combat.js:363-614`. Toggle K key, ESC close, click-to-upgrade, 3x3 grid with branch colors/levels/costs. |
| P3-3: Fishing Tension (partial) | PARTIAL | "Got away" mechanic exists (`sketch.js:8529`). But no bobber dip animation, no reel timing window, no rare fish visual. |

---

## BROKEN (Attempted, Has Bugs)

| Sprint Item | Issue | Details |
|-------------|-------|---------|
| **Port Positions at Levels 4+** | CRITICAL | `test-positions.js` fails levels 4-25. `updatePortPositions()` at line 11898 uses `WORLD.islandCX - srx - 20` which goes negative as island grows. Ports need to be camera-relative or clamped to screen bounds. The test expects ports within 80px of grass edge AND within 600px of center — but at level 4+ the surface RX exceeds 600 making ports invisible without camera scroll. Either the test expectations are wrong (ports should be off-initial-screen but accessible via camera) or the port formula needs to scale differently. |
| **Farm Position Hardcoded** | REGRESSION RISK | `getFarmCenterX()` exists at line 1210 and uses `getSurfaceRX() * 0.45` — but 11 call sites still use hardcoded `WORLD.islandCX - 220` (lines 832, 1310, 5510, 5661, 10544, 19585, 19605, 19694, 19752, 20036, 21197). At high levels the farm won't track island growth. |
| **ESC During Dialogue** | NOT FIXED | `sketch.js:17968-17977` — ESC handler does NOT check `dialogState.active` before opening menu. No `buildMode` check either. Sprint item P2-7 was never implemented. |

---

## MISSING (Never Attempted)

| Sprint Item | Priority | Notes |
|-------------|----------|-------|
| P1-4: Skill Tree UI | DONE | Fully implemented in `combat.js:363-614`. Toggle via K key (`sketch.js:18531`), ESC close (`18508`), click-to-upgrade (`handleSkillTreeClick`), draw in overlay (`sketch.js:1945`). 3x3 grid, branch colors, level display, cost gating all present. |
| P1-5: Build Ghost Visual Offset | HIGH | `drawBuildGhost()` at line 7489 — no evidence of floatOffset compensation fix. Ghost still misaligned during island bob. |
| P2-1: Cypress Tree Redesign | NOT DONE | Current cypress at `sketch.js:11749-11785` has 8 foliage layers with rect stacking. Sprint called for per-layer jitter using `swayPhase`, third green shade, triangular tips. Current code has some improvements (sunlit edge highlight, pointed tip) but no organic jitter. Judgment call — may be "good enough" now. |
| P2-2: Island Empty at High Levels | NOT DONE | No `decorFlora` array exists. `expandIsland()` doesn't spawn additional trees in the new ring. No grass texture pass. |
| P2-4: HUD Shows "DAY" Twice | UNCLEAR | No `"Day "` string found in drawHUD — may have been fixed, or the day counter may use a different format. Needs visual verification. |
| P2-6: Damage Numbers Camera Drift | NOT DONE | `addFloatingText()` still stores screen-space coordinates. No `ft.wx`/`ft.wy` world-space storage exists. |
| P2-7: ESC Overlay Handling | NOT DONE | See BROKEN section above. |
| P2-9: Trees at Island Edge Flicker | NOT DONE | `drawOneTree()` at line 11708 still uses `isOnIsland()` which uses 90% surface radii. No `isInsideIslandEllipse` function exists. |
| P3-1: Island Resource Respawn | NOT DONE | No `respawnDays`/`respawnTimer` per-node in `islands.js`. Day tick at `sketch.js:2051-2063` does bulk reset (all nodes at once) — not the per-node timer system described in sprint. |
| P3-2: Cooking System UI | NOT DONE | No cookpot proximity recipe display. No cooking tutorial hint. |
| P3-4: Bottle Messages Rewrite | NOT DONE | `state.bottles` system exists but messages are generic. No lore tablet unlock on treasure find. |
| P4-1: Skill Tree UI Polish | NOT DONE | Depends on P1-4 completion. |
| P4-2: Wreck Beach Opening Weight | NOT DONE | No Day 1 text, no audio on first crate, no crab follower. |
| P4-3: Juice Pass — Input Feedback | NOT DONE | No screen shake on building place. `npcHeartPop` exists and is called from gift handlers — needs audit of Livia-specific branch. |
| P4-4: First-Session Onboarding | NOT DONE | `tutorialHint` system exists and works. Just needs the 5 milestone triggers wired up. |
| P4-5: Itch.io Store Page | NOT DONE | No marketing assets. |

---

## REGRESSIONS FOUND

1. **`|| []` guards in saveGame**: Island loot arrays ARE guarded (`sketch.js:19215` uses `(state.vulcan.obsidianNodes || [])`). PASS.
2. **`snd.updateLyre()` double call**: Only one call at `sketch.js:1363`. PASS.
3. **Hardcoded farm position**: 11 sites use `WORLD.islandCX - 220` instead of `getFarmCenterX()`. ACTIVE REGRESSION at high island levels.
4. **Distant island render**: Uses `drawArenaIsleDistant()` and `drawConquestIsleDistant()` correctly. `drawArena()` only called inside adventure mode translate context. PASS.
5. **`updateLyre` called from draw and drawInner**: No — only in `draw()` at line 1363. PASS.

---

## NEXT 10 ACTIONS (Priority Order)

| # | Task | Agent | File(s) | Why |
|---|------|-------|---------|-----|
| 1 | Fix port positions for levels 4-25 — ports must scale with camera system, not be absolute world coords past screen edge | art-director | sketch.js (updatePortPositions), test-positions.js | CRITICAL: test-positions.js FAIL, ports invisible at high levels |
| 2 | Fix ESC during dialogue — add `dialogState.active` and `buildMode` checks before menu open | general-purpose | sketch.js (keyPressed ESC block ~17968) | P2-7: Players lose dialogue context |
| 3 | Replace 11 hardcoded `WORLD.islandCX - 220` farm positions with `getFarmCenterX()`/`getFarmCenterY()` | general-purpose | sketch.js (lines 832, 1310, 5510, 5661, 10544, 19585, 19605, 19694, 19752, 20036, 21197) | Regression: farm doesn't scale at high island levels |
| 4 | Fix remaining "3x harvest" strings — sketch.js:756 comment, sketch.js:3704 pumpkin desc | general-purpose | sketch.js | P2-5: Player-facing string mismatch |
| 5 | Wire P4-4 First-session onboarding — 5 milestone tutorial hints | game-designer | sketch.js (harvest, build, day tick) | Low effort, high new-player impact |
| 6 | Fix P1-5 Build Ghost floatOffset — ghost preview must account for island bob | art-director | sketch.js (drawBuildGhost ~7489) | Build placement looks wrong during bob |
| 7 | Complete P1-6 Storm — extend clouds to y:0.35, add sun dimming, add storm overlay | art-director | sketch.js (drawStormClouds, drawSun, drawSky) | Storm still looks thin |
| 8 | Fix P2-9 Tree edge flicker — change isOnIsland guard to use full island radii (1.0) | art-director | sketch.js (drawOneTree ~11708) | Trees pop in/out at boundary |
| 9 | Add P2-6 Damage number world-space coords — store wx/wy in addFloatingText | general-purpose | sketch.js (addFloatingText, drawFloatingText) | Numbers drift with camera |
| 10 | Wire P4-4 Tutorial hints — 5 milestone triggers using existing tutorialHint system | game-designer | sketch.js (harvest, build, day tick handlers) | Low effort, high player impact |

---

## SPRINT VELOCITY ASSESSMENT

- **15 agent deployments today** across 2 sessions
- **6 items fully done**, 3 partial, 3 broken/regressed, 13 not started
- Priority 1 blockers: 4/6 done, 1 partial, 1 not done (build ghost)
- Priority 2 polish: 2/9 done, 1 partial, 6 not started
- Priority 3 content: 0.5/5 done (shooting stars only)
- Priority 4 stretch: 0/5 done

**Critical path**: Port positions (action 1) must be fixed before any playtest. The farm hardcoding (action 3) is a ticking bomb at high levels. ESC handling (action 2) is a 5-minute fix that should have been done already.

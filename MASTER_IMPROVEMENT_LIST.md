# Mare Nostrum — Master Improvement List
*Compiled from 6 specialist agents, 2026-03-20*

## CRITICAL (fix before any feature work)

| # | Issue | File | Time | Source |
|---|-------|------|------|--------|
| 1 | Broken comment `/ Sanity:` → should be `// Sanity:` | sketch.js:12604 | 1min | QA |
| 2 | `_particleCap` never recovers after FPS drop | sketch.js:1488 | 15min | QA |
| 3 | `jumpingFish` implicit global, no `let` declaration | sketch.js:2590 | 5min | QA |
| 4 | `/home` debug cmd doesn't set homeIslandReached | debug.js:164 | 5min | QA |
| 5 | `tutorialsSeen.gather` unguarded in wreck.js | wreck.js:116 | 5min | QA |
| 6 | sw.js missing 7 extracted files + cache mismatch | sw.js | 15min | DevOps |
| 7 | Missing SFX: visitor_arrive, crystal_charge | sound.js | 15min | Sound |

## PERFORMANCE (measurable FPS gains)

| # | Issue | File | Time | Impact |
|---|-------|------|------|--------|
| 8 | drawOcean triple-nested loop: ~3500 rects/frame | sketch.js:2474 | 2h | High |
| 9 | particles.filter() butterfly count scan every 45 frames | sketch.js:8381 | 15min | Med |
| 10 | Heatwave: 55 fill+rect calls/frame | sketch.js:3465 | 10min | Med |
| 11 | Raindrop hard cap removes visible mid-air drops | sketch.js:3503 | 15min | Low |

## VISUAL (screenshot impact)

| # | Issue | File | Time | Impact |
|---|-------|------|------|--------|
| 12 | No night darkness overlay — island bright at midnight | world.js | 2-3h | Massive |
| 13 | No building cast shadows (directional) | sketch.js | 2h | High |
| 14 | Island has no visible 3D cliff edge | world.js | 1-2h | High |
| 15 | Citizens are 5-rect blobs | npc.js | 2-3h | High |
| 16 | No ambient color temperature (golden hour) | sketch.js | 15min | Med |
| 17 | Home island missing vignette call | sketch.js | 2min | Med |
| 18 | Clouds use ellipses not pixel rects | world.js | 1h | Med |
| 19 | No water reflections at coastline | world.js | 1h | Med |

## AUDIO (immersion)

| # | Issue | File | Time | Impact |
|---|-------|------|------|--------|
| 20 | No campfire crackle — Era 1 emotional anchor silent | sound.js | 45min | High |
| 21 | No NPC interaction sounds (dialogue/gift/favor) | sound.js + npc.js | 50min | High |
| 22 | Lyre doesn't evolve with era (no Era 3 echo) | sound.js | 1-2h | High |
| 23 | Ocean waves too mechanical (single sine) | sound.js | 20min | Med |
| 24 | No footstep pitch variation | sound.js | 30min | Med |
| 25 | No dawn/dusk transition sounds | sound.js | 30min | Med |
| 26 | Crickets too mechanical (single gate) | sound.js | 20min | Med |
| 27 | SFX pool too small (4 slots, needs 6) | sound.js | 15min | Med |

## MECHANICS (player engagement)

| # | Issue | File | Time | Impact |
|---|-------|------|------|--------|
| 28 | NPC daily wants loop broken at max favor | npc.js + narrative.js | 2-3h | High |
| 29 | Trade routes passive, no market demand signal | economy.js | 3-4h | High |
| 30 | Fishing wait has no skill expression | fishing.js | 2-3h | Med |
| 31 | Harvest combo HUD counter invisible | sketch.js | 1-2h | Med |
| 32 | Night market hidden, no herald notification | sketch.js + events.js | 1-2h | Med |
| 33 | Combat skill effects invisible (fortify, battleCry) | sketch.js + combat.js | 3-4h | Med |
| 34 | NPC hearts cliff at max — NPCs become scenery | npc.js + narrative.js | 3-4h | Med |
| 35 | Cooking recipes invisible, no recipe UI | ui.js | 2-3h | Med |
| 36 | Island level milestones are silent | sketch.js + narrative.js | 6-10h | High |

## FIRST IMPRESSIONS (marketing/retention)

| # | Issue | File | Time | Impact |
|---|-------|------|------|--------|
| 37 | No companion personality in first 10 min | sketch.js | 2h | High |
| 38 | No "GET IT" moment by minute 3 | narrative.js | 3h | High |
| 39 | Island naming at level 10 — player ownership | sketch.js | 2h | High |
| 40 | Secret areas (Ice Mirror, Room 13) — viral potential | islands.js | 4-6h | High |
| 41 | 60-second atmosphere video needed | N/A | 2h | High |

## INFRASTRUCTURE

| # | Issue | File | Time | Impact |
|---|-------|------|------|--------|
| 42 | Self-host Cinzel font (blocked in itch.io iframe) | index.html | 30min | High |
| 43 | Self-host p5.js (eliminate CDN dependency) | index.html | 10min | Med |
| 44 | GitHub Actions CI (syntax check on push) | .github/ | 30min | Med |
| 45 | esbuild minification (1.4MB → ~400KB) | build.mjs | 1h | Med |
| 46 | Error tracking in engine.js | engine.js | 15min | Med |
| 47 | Playwright smoke tests | tests/ | 1h | Med |
| 48 | Save migration formalization | sketch.js | 30min | Med |

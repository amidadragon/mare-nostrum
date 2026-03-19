---
name: Island Terrain Redesign Decisions
description: Organic coastline, elevation system, and per-level building progression design — key decisions and constraints
type: project
---

Three-system island terrain redesign was specced. Key decisions and constraints for implementation:

**Why:** The island is a perfect ellipse at all zoom levels. Looks artificial. Every level-up only spawns resources/trees — no landmarks from levels 6-24. Player can't read the island's history in its built environment.

**How to apply:** See `/Users/ioio/mare-nostrum/ISLAND_REDESIGN_SPEC.md` for full details. Key rules:

## CRITICAL CONSTRAINTS

- `isOnIsland()`, `isInShallows()`, `isWalkable()`, `getSurfaceRX()`, `getSurfaceRY()` — NEVER TOUCH. Gameplay boundary stays a pure ellipse.
- The visual coastline diverges from gameplay boundary by max 15%. Visual only, inside `drawIsland()` and `drawShoreWaves()`.
- Elevation is faked — NO height field on any state object. Visual parallax offset only (up to 8px screen-space Y shift for objects on hills).

## COASTLINE SYSTEM

- Use p5.js `noise(x,y)` with `noiseSeed(999)` in setup() — FIXED SEED, not random. Island shape must be deterministic across save/load.
- Seed stored in `WORLD.noiseSeed = 999`.
- 64-vertex `beginShape/curveVertex` loop replaces each `ellipse()` call.
- North coast (angle range PI*0.6 to PI*1.4) gets extra amplitude — rocky exposure.
- East headland: +0.06 * cos(a-0.3)^3. Northwest cove: -0.05 * cos(a-PI*0.65)^3.
- If frame budget is tight: pre-compute coastline points at initState() into `state.coastlinePoints[]`, read from array each frame.

## HILL SYSTEM

5 fixed hills (relative to islandCX, islandCY):
- H1: center (0, -15), height 1.0 — pyramid
- H2: northeast (200, -60), height 0.7 — future shrine
- H3: west (-260, 5), height 0.6 — sacred grove
- H4: southeast (180, 65), height 0.45 — farm valley below
- H5: northwest (-150, -55), height 0.5 — watchtower hill

`getElevation(wx, wy)` uses smoothstep falloff per hill, defined near `isOnIsland()` (~line 1270).
Elevation offset for object parallax: `getElevationOffset(wx, wy) = -getElevation(wx,wy) * 8` screen pixels.
Apply to: trees, grass tufts, ruins, NPC render position (NOT player, NOT crops, NOT particles).

## PER-LEVEL PROGRESSION

New `state.landmarks[]` array — auto-spawned decorative buildings, NEVER player-placed or demolishable.
Save format bump to v8 when this ships.
`spawnLandmarks(lvl)` called from `expandIsland()` alongside existing milestone logic.

Key landmark levels:
- Lv1: campfire at port (initState, not expansion)
- Lv3: roman road visual gates behind islandLevel >= 3
- Lv6: two domus houses auto-spawn on H1 north slope + east of pyramid
- Lv9: aqueduct (5 arches, H2 to bathhouse)
- Lv10: existing temple/market PLUS bathhouse completes (foundation from lv8 upgrades)
- Lv13: lighthouse at east headland (cx + rx*0.88, cy - ry*0.12) with animated night beam
- Lv20: existing arch/villa PLUS colosseum partial completion
- Lv25: pyramid golden aura halo (32 orbiting dots)

Levels 5/10/15/20/25 retain existing BLUEPRINTS auto-spawn (granary, temple+market, forum+watchtower, arch+villa).
Levels 6-9, 11-14, 16-19, 21-24 get landmark objects instead of building BLUEPRINTS.

## PRIORITY

P0: noiseSeed() + organic coastline ellipses + foam tracking organic edge + rocky north coast stones.
P1: Hill tints/shadows, getElevation(), tree parallax, state.landmarks system + early levels (1,3,6-9).
P2: Hill silhouette bump, levels 11-19 content, lighthouse beam, colosseum animation.

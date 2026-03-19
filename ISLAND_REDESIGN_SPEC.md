# Mare Nostrum — Island Redesign Spec

**Status**: Research & Planning only. No code changes in this document.
**Scope**: Three systems — organic coastline, hills/elevation, per-level building progression.

---

## System 1: Organic Coastline (Procedural Perlin Noise)

### The Problem

Every water ring and grass ellipse in `drawIsland()` is a perfect ellipse call. The island reads as artificial because it is — there's no real coastline variation. A Mediterranean island of this scale (roughly 1km across based on the coordinate math) should have:
- A rocky, irregular northern coast exposed to open sea
- Protected southern bays where the ports naturally sit
- At least one small headland jutting east or west
- Coves — small concave indentations where the shoreline retreats

### The Split: Visual vs. Gameplay

`isOnIsland()` uses the ellipse math and must stay. Changing it breaks NPC pathfinding, collision, spawning, the shallows check, and a dozen other systems. **We do not touch the gameplay boundary.**

What we change is purely rendering — the drawn coastline shape diverges from the gameplay ellipse by up to ~15%. This is invisible to players in practice and common in indie games (Stardew Valley does exactly this).

### Perlin Noise Coastline Formula

For any angle `a` around the island, the visual radius at that angle is:

```
noiseVal = noise(cos(a) * FREQ + SEED_X, sin(a) * FREQ + SEED_Y)
// noiseVal is in [0, 1]
// Map to displacement: d = (noiseVal - 0.5) * AMPLITUDE

// North coast (a near -PI/2) gets stronger variation — rockier
northWeight = max(0, cos(a + PI/2))  // 1.0 at north pole, 0 at south
amplitude = BASE_AMPLITUDE + northWeight * NORTH_EXTRA

visualRX(a) = baseRX * (1 + d * cos(a))   // horizontal squeeze at sides
visualRY(a) = baseRY * (1 + d * sin(a))   // vertical squeeze at top/bottom
```

**Recommended constants:**
- `FREQ = 1.8` — roughly 5-7 visible bumps around the perimeter
- `BASE_AMPLITUDE = 0.07` — max 7% deviation from ellipse baseline
- `NORTH_EXTRA = 0.06` — north coast gets up to 13% total deviation
- `SEED_X = 42.7, SEED_Y = 11.3` — arbitrary seeds, bake these to fixed values so the island looks identical every run

**Building headlands:**
Add 1-2 fixed "pinch" terms on top of Perlin. These are deterministic, not noise:

```
// East headland — juts out toward merchant port side
headlandE = 0.06 * max(0, cos(a - 0.3))^3  // peaks at angle ~0.3 rad

// Northwest cove — bays in to give western harbor a natural sheltered feel
coveNW = -0.05 * max(0, cos(a - (PI * 0.65)))^3
```

### Drawing with Noise

Replace every `ellipse(ix, iy-N, iw*M, ih*K)` call with a `beginShape()` / `curveVertex()` loop:

```javascript
function drawOrganicEllipse(cx, cy, rx, ry, yOffset, noiseFreq, amplitude, northExtra) {
  let steps = 64;  // 64 vertices is smooth enough, fast enough
  beginShape();
  for (let i = 0; i <= steps; i++) {
    let a = (i / steps) * TWO_PI;
    let nx = cos(a) * noiseFreq + 42.7;
    let ny = sin(a) * noiseFreq + 11.3;
    let nv = noise(nx, ny) - 0.5;  // [-0.5, 0.5]
    let northW = max(0, cos(a + PI / 2));
    let amp = amplitude + northW * northExtra;
    let r = 1 + nv * amp;
    // Bake headland and cove
    let headE = 0.06 * pow(max(0, cos(a - 0.3)), 3);
    let coveNW = -0.05 * pow(max(0, cos(a - PI * 0.65)), 3);
    r += headE + coveNW;
    let px = cx + cos(a) * rx * r;
    let py = cy + yOffset + sin(a) * ry * r;
    curveVertex(floor(px), floor(py));
  }
  endShape(CLOSE);
}
```

Call this instead of `ellipse()` for each water ring and the grass/beach layers in `drawIsland()`. The foam wave loop in `drawShoreWaves()` already samples by angle — replace the fixed `rx`/`ry` with the same formula so foam follows the organic edge.

### Shallow Water Rings

Each ring uses slightly less amplitude than the outermost — inner rings are calmer, closer to shore:

| Ring | Scale | Amplitude | North Extra |
|------|-------|-----------|-------------|
| Outermost shallow (1.12) | full | 0.07 | 0.06 |
| Mid shallow (1.06) | 0.85x | 0.06 | 0.05 |
| Inner shallow (1.00) | 0.70x | 0.05 | 0.04 |
| Near-shore (0.96) | 0.55x | 0.04 | 0.03 |
| Sandy beach (0.93) | 0.40x | 0.03 | 0.025 |
| Grass (0.90) | 0.25x | 0.02 | 0.02 |

The grass ellipse is the visual interior. Its organic shape will naturally diverge from the gameplay ellipse (pure math), but players will not notice because the discrepancy is small and visually obscured by trees, buildings, and tufts at the edge.

### Foam Following the Organic Edge

In `drawShoreWaves()`, the per-angle pixel foam loop already reads:
```javascript
let ex = floor(ix + cos(a) * (rx + waveOff));
let ey = floor(cy + sin(a) * (ry + waveOff * 0.4));
```

Replace `rx` and `ry` with the sampled organic radius at angle `a`. This makes foam hug the actual drawn coastline rather than a phantom ellipse. This is the single highest-impact change for coastline authenticity.

### Rocky North Coast Texture

After drawing the organic grass ellipse, draw scattered 2x2 to 4x4 stone-colored rects along the northern edge:

```
northCoastRocks: 18 rocks placed by deterministic angle loop
angle range: [PI * 0.6, PI * 1.4]  (top 80 degrees of island)
position: (cx + cos(a) * grassRX * r, cy-18 + sin(a) * grassRY * r)
  where r = noise-derived organic radius at that angle, * 0.97 (just inside grass)
color: [118, 108, 92] base with [138, 128, 110] highlight
size: noise-driven, 3-6px wide, 2-4px tall
```

This sells the "rocky northern exposure" without any new systems.

---

## System 2: Hills and Elevation

### Philosophy

This is purely visual. We are not adding a 3D elevation system — that would require rebuilding NPC pathfinding, crop placement, and building snapping. Instead we fake elevation with:

1. **Lighter grass tint** on "hill" areas
2. **Drop shadows** cast below hills (south, because implied sun is slightly northwest)
3. **Object parallax offset** — objects on hills draw 4-8px higher in screen space than their world Y would suggest (fake height)
4. **Hill silhouette bump** — the terrain ellipse itself has slight upward offsets at hill locations

### Hill Definitions (Fixed, Baked)

Five hills, defined by center position relative to island center and their "height" factor:

| Hill | World X (relative to CX) | World Y (relative to CY) | Height Factor | Role |
|------|--------------------------|--------------------------|---------------|------|
| H1: Central | +0 | -15 | 1.0 | Pyramid sits here |
| H2: Northeast | +200 | -60 | 0.7 | Shrine in final design |
| H3: West | -260 | +5 | 0.6 | Sacred grove, wild |
| H4: Southeast | +180 | +65 | 0.45 | Gentle slope, farmland below |
| H5: Northwest | -150 | -55 | 0.5 | Future watchtower hill |

Hill radius of influence: `R = 90 + h.heightFactor * 60` (pixels in world space).

### Elevation Map Function

```javascript
// Returns [0, 1] — 0 = valley floor, 1 = hilltop
// Evaluated once per object that needs it, not per pixel
function getElevation(wx, wy) {
  const HILLS = [
    { dx:  0,    dy: -15, h: 1.0, r: 150 },
    { dx:  200,  dy: -60, h: 0.7, r: 126 },
    { dx: -260,  dy:   5, h: 0.6, r: 126 },
    { dx:  180,  dy:  65, h: 0.45, r: 117 },
    { dx: -150,  dy: -55, h: 0.5, r: 120 },
  ];
  let cx = WORLD.islandCX, cy = WORLD.islandCY;
  let total = 0;
  HILLS.forEach(h => {
    let ddx = wx - (cx + h.dx);
    let ddy = wy - (cy + h.dy);
    let d = sqrt(ddx * ddx + ddy * ddy);
    if (d < h.r) {
      // Smooth falloff (cosine curve)
      let t = 1 - d / h.r;
      total += h.h * (t * t * (3 - 2 * t));  // smoothstep
    }
  });
  return min(1, total);
}
```

### Terrain Rendering: Hill Tints

In `drawIsland()` after the main grass ellipse, add hill highlight patches. These replace the current `rect()`-based "elevation hints" (lines 4776-4789) with semantically correct hill-mapped ellipses:

```javascript
// For each hill: draw a lighter tinted ellipse at the hill's position
// Size scales with hill.r, alpha scales with hill.h
// Color: sg.r + 18*bright, sg.g + 24*bright, sg.b + 7*bright
// Alpha: 35 * hill.h * bright

// Valley shadows (between H1 and H4 = natural farming flat):
// cx + 80, cy + 45 — approximate valley center
// Color: sg.r - 16, sg.g - 13, sg.b - 9
// Alpha: 32
```

### Shadow Casting

Each hill casts a drop shadow to its south-southeast (implied sun angle: 330 degrees, northwest-ish):

```
Shadow offset: shadowX = hill.dx + 12 * hill.h, shadowY = hill.dy + 20 * hill.h
Shadow ellipse: w = hill.r * 1.6, h = hill.r * 0.55
Color: (0, 0, 0, 22 * hill.h * bright)
```

Draw shadows before the hill highlight tints so highlights appear on top.

### Object Parallax (Height Boost)

Objects on high-elevation terrain draw higher on screen. This is a screen-space Y offset applied when rendering that object:

```javascript
// Applied at draw time — not stored in state
function getElevationOffset(wx, wy) {
  let elev = getElevation(wx, wy);
  return -elev * 8;  // Up to 8px higher at peak. Negative = up in screen space.
}
```

**Apply to:**
- Trees (already have per-tuft draw passes — add offset to `sty`)
- Grass tufts
- Ruins
- NPC standing position (already render-only, don't move state.npc.y)
- Buildings — apply to the screen Y of their draw, not their world Y

**Do NOT apply to:**
- Player (would look floaty/wrong)
- Farm plots (flat by design)
- Particle positions
- UI elements

The pyramid is the center of H1. It already draws at `state.pyramid.y - 15`. No additional offset needed — it's the reference point.

### Hill Silhouette Bump (Optional, P2)

For the organic ellipse drawing loop, add a hill bump term:

```javascript
HILLS.forEach(h => {
  let hillAngle = atan2(h.dy, h.dx);
  let angDiff = abs(((a - hillAngle) + PI) % TWO_PI - PI);  // angle distance
  if (angDiff < 0.6) {
    r += h.h * 0.04 * (1 - angDiff / 0.6);  // tiny outward push at hill sides
  }
});
```

This is subtle — hills make the island slightly more lumpy at their edges. Max 4% radius change.

---

## System 3: Per-Level Building Progression (Levels 1–25)

### Current State

Only 4 milestone levels spawn buildings: 5 (granary + well), 10 (temple + market), 15 (forum + watchtower), 20 (arch + villa). Levels 1-4 and 6-9 and 11-14 are dark — the island looks identical after expanding.

The current level 6-25 fallback is pure resource/tree/crystal procedural generation with no landmark buildings. This is the 7/10 version. We need 10/10.

### Design Principle

Every level unlock should feel like a *specific* urban development moment, not just "more stuff appeared." The player should be able to look at the island and read its history in the built environment — from campfire to IMPERIUM.

### Level Progression Table

Each row shows: what auto-spawns on level-up, where, and the narrative flavor text.

**Coordinate notation:** relative to `(WORLD.islandCX, WORLD.islandCY)`. Scale factor `rx = getSurfaceRX()`, `ry = getSurfaceRY()` at the time of expansion. All positions assume post-expansion radii.

---

#### Lv 1 — DAWN (starting state, no expansion)

Already exists: pyramid, crystal shrine, farm (3x3), campfire near dock.

**Add to `initState()`**: A campfire object at `(cx - rx*0.70, cy + ry*0.40)` — east of the port, near the beach. This is the player's first night fire. Draws as a 4x4 orange rect with animated flicker particle. Simple. Memorable.

**Flavor text**: "A fire to last the night."

---

#### Lv 2 — SETTLEMENT (currently: resource quarry + crystals)

**Add**: A wooden palisade — 6-8 fence posts arranged in a rough square around the farm zone perimeter. Not a `BLUEPRINTS` fence — a decorative pre-built fence rendered in `drawIsland()` when `state.islandLevel >= 2`.

Also: A `storage_pit` object at `(cx - rx*0.52, cy + ry*0.50)` — south of the farm. Draws as a 16x12 dark rect with stone border. Counts as flavor, not a BLUEPRINT building.

**Flavor text**: "First walls. First claim."

---

#### Lv 3 — ROADS (currently: northeast ruins + resources)

**Add**: The stone path from dock to pyramid should render when `state.islandLevel >= 3`. Currently `drawRomanRoad()` always draws — check if there's a level gate. If not, add one. The road visual itself is the level 3 unlock.

Also add a `milestone_stone` decorative object at the road midpoint `(cx - rx*0.35, cy)`: a 6x12 rect with lighter top — a carved waystone. Pixel art only.

**Flavor text**: "Roads are how Rome begins."

---

#### Lv 4 — WELL (currently: northwest sacred grove + resources)

The current `BLUEPRINTS.well` has `minLevel: 5` but we want a decorative well to auto-spawn at level 4 (ahead of the player-built well at level 5 milestone). The auto-well at level 4 is at `(cx + rx*0.15, cy + ry*0.30)` — south-center, near the farm valley. It differs from the level 5 milestone well position.

Also add a `communal_fire_pit` at `(cx - rx*0.05, cy + ry*0.10)` — central gathering point. 8x8 stone ring with embers. This evolves into the forum area at level 15.

**Flavor text**: "Clean water. Community."

---

#### Lv 5 — GRANARY + WELL (existing milestone, keep as-is)

The existing code is correct: granary north of farm, well southeast. No changes to milestone logic. Upgrade the flavor text.

**Flavor text**: "CITIZEN — The harvest will not rot. The thirsty will drink."

---

#### Lv 6 — FIRST HOUSES

Auto-spawn two `house` buildings (new BLUEPRINT or rendered as decorative objects):

- House A: `(cx - rx*0.25, cy - ry*0.45)` — north slope of H1, above the road
- House B: `(cx + rx*0.10, cy - ry*0.30)` — east of pyramid

House design (if rendered decoratively, not BLUEPRINTS):
- 18x14 base rect in sandstone color `[195, 172, 135]`
- 4px dark border
- 4x4 doorway (dark)
- Flat roof (pixel art Mediterranean style, not pitched)
- Small 2x2 window

If added as BLUEPRINTS entry: `house: { name: 'Domus', w: 20, h: 16, cost: { wood: 3, stone: 2 }, minLevel: 6, blocks: true }`

Unlock the Quarrier NPC companion at level 6 (currently unlocks at level 5 — move to 6 for better pacing and to give level 5 breathing room with just granary/well).

**Flavor text**: "Others come. The exile becomes a founder."

---

#### Lv 7 — MARKET STALL (pre-cursor to the level 10 market)

Auto-spawn a small `market_stall` object at `(cx + rx*0.60, cy + ry*0.05)` — near the east shore, between pyramid and merchant port. This is distinct from the level 10 `market` BLUEPRINT building — it's a smaller precursor. Renders as:
- 24x16 wooden awning (rect with 2px top overhang)
- 3 colored dot "goods" beneath the awning

Also: First decorative road junction sign (`via_sign`) at the road fork.

**Flavor text**: "Trade, even in small things, is civilization."

---

#### Lv 8 — BATHHOUSE FOUNDATION

Add a `bathhouse_outline` decorative at `(cx + rx*0.30, cy + ry*0.20)` — southeast of center, the "under construction" version of what becomes the completed bathhouse at level 10.

Renders as: stone foundation rects only, no roof — visually communicates "under construction." Use `[128, 118, 102]` stone color with 60% alpha. Add a "construction" particle: occasional dust mote rising from it.

Also add: `aqueduct_post` objects — 2-3 short stone pillars scattered from the bathhouse toward the hilltop spring. Render as 4x12 rects.

**Flavor text**: "The baths will come. Rome was not built in a day."

---

#### Lv 9 — AQUEDUCT SEGMENT

Render the aqueduct as a connected series of arch spans from the northeast hill (H2, the "spring hill") down toward the bathhouse foundation. The aqueduct is purely decorative — it's not a placeable BLUEPRINT.

Implementation: A `drawAqueduct()` function called from `drawIsland()` when `state.islandLevel >= 9`. It draws N archway shapes between two anchor points:
- Source: `(cx + rx*0.45, cy - ry*0.55)` (H2 hill)
- Terminus: `(cx + rx*0.30, cy + ry*0.18)` (bathhouse)
- 5 arch spans between them
- Each arch: two 4x14 pillars with 2px horizontal channel on top
- Channel: 3px wide, `[145, 132, 112]` stone color

Also add the `Fisherman` NPC unlock visual cue (currently happens at `islandLevel >= 6`, move to 9 for better spread). The fisherman appears at the dock with a fishing rod pixel sprite.

**Flavor text**: "Water bends to Roman will."

---

#### Lv 10 — TEMPLE + COMPLETED BATHHOUSE (existing milestone, enhance)

Keep the existing `temple` and `market` spawns. Add:
- The bathhouse foundation from level 8 now "completes" — replace the outline with a `bathhouse` BLUEPRINT building at the same position
- The bathhouse BLUEPRINT: `{ name: 'Thermae', w: 44, h: 32, cost: { stone: 8, wood: 4, crystals: 2 }, minLevel: 10, blocks: true }`

Screen shake is already there (magnitude 6, 15 frames). Amplify to magnitude 8 for this one — it's the GOVERNOR rank.

**Flavor text**: "GOVERNOR — Temple, market, and the baths of the people. This is a city."

---

#### Lv 11 — OLIVE GROVE

Auto-plant 6 olive trees in a deliberate arc on the southeast hill slope (H4), between `(cx + rx*0.40, cy + ry*0.30)` and `(cx + rx*0.20, cy + ry*0.60)`. These are NOT regular choppable trees — they should be flagged as `{ type: 'olive', choppable: false }`. They visually differ: rounder canopy, silver-green `[145, 155, 115]` leaf color.

If olive trees are too complex to differentiate from regular trees in state/render, add them as static decorative `oliveGrove` array in state, rendered separately in `drawIsland()`.

**Flavor text**: "The first harvest of peace, not survival."

---

#### Lv 12 — FORUM FOUNDATION + PUBLIC SQUARE

Similar to level 8 bathhouse — show the future forum as an outlined foundation at `(cx + rx*0.25, cy + ry*0.35)`. Add a `piazza` decorative: a 32x32 lighter-tinted ground patch (stone paving). Draw it as a rect with the `[175, 162, 140]` limestone color before grass tufts.

Also: Add a `public_statue` object at `(cx + rx*0.05, cy - ry*0.15)` — a 4x16 pillar with a 6x6 square "statue" on top. This is the precursor to the triumphal arch visual language.

**Flavor text**: "A forum is where citizens become a people."

---

#### Lv 13 — LIGHTHOUSE

Auto-spawn a `lighthouse` at the far east headland: `(cx + rx*0.88, cy - ry*0.12)`. This sits on the organic coastline's east headland we defined in System 1.

Renders as:
- 6x28 white tower `[235, 228, 215]`
- 10x6 base platform
- 4x4 beacon top with animated glow: `fill(255, 220, 80, 80 + sin(frameCount*0.05)*40)`
- Emits a slow rotating 3px wide beam sweep when it's dark (nightMode)

The lighthouse has gameplay value: it extends merchant ship arrival range by (flavor text says this, actual mechanic is optional to implement).

**Flavor text**: "Ships see the light. The island calls to the world."

---

#### Lv 14 — THEATER DISTRICT OUTLINE

Spawn a `theater_ruins` decorative at `(cx - rx*0.30, cy + ry*0.55)` — south shore, near beach. Renders as a semicircular arrangement of 2x4 "seat" rects in 4-5 arcing rows, in weathered stone `[140, 128, 108]`. This area will become the forum entertainment district.

Add a `colonnaded_walkway` decorative: 5 evenly-spaced 4x14 columns from `(cx - rx*0.10, cy + ry*0.20)` toward `(cx + rx*0.15, cy + ry*0.20)`, connected by a 2px overhead beam. This is the main street gaining its colonnade.

**Flavor text**: "Culture follows commerce."

---

#### Lv 15 — FORUM + WATCHTOWER (existing milestone, keep + enhance)

Existing milestone is good. Enhance with:
- The forum foundation from level 12 "upgrades" — the landmark building appears at the same position as the outline
- Add 4 decorative `laurel_tree` objects around the forum (small, distinct from olive/regular trees — 12x18 canopy, darker green `[55, 85, 40]`)
- The piazza paving from level 12 becomes the forum courtyard ground

Also: A `via_appia` moment — the road between port and pyramid gains side colonnades (2 columns per side, 3 pairs). Render when `islandLevel >= 15`.

**Flavor text**: "SENATOR — The forum stands. A voice for every citizen."

---

#### Lv 16 — HARBOR EXPANSION

The port area expands. Add:
- A second pier segment: 3 additional dock planks to the left of the existing port
- A `warehousing_district` decorative cluster of 3 small 18x12 storage buildings near the port at `(cx - rx*0.75, cy + ry*0.10)` to `(cx - rx*0.85, cy + ry*0.25)`
- A `harbor_crane` pixel art decoration at the pier end: an L-shaped 2px beam structure

**Flavor text**: "The harbor does not sleep."

---

#### Lv 17 — NECROPOLIS QUARTER

On the northwest fringe of the island, add a `necropolis_path` — a short road segment from the main via toward the island edge, terminating in 4-6 small `tomb_marker` objects `(6x8 stone rects with a cross-mark on top)`. Position: `(cx - rx*0.65, cy - ry*0.35)` and nearby.

This ties narratively to the Necropolis expedition island. The markers honor the fallen from the wreck.

Also add: `memorial_flame` — a small flame effect at the necropolis entrance.

**Flavor text**: "Rome honors its dead as it honors its living."

---

#### Lv 18 — IMPERIAL BATHS EXPANSION

The bathhouse from level 10 gains a visual extension: a connected `natatio` (outdoor pool) to its south. Renders as a 36x20 rect in blue-tinted `[80, 145, 170]` water color with subtle shimmer animation. Draw it as part of the bathhouse area when `islandLevel >= 18`.

Also: 4 palm trees (distinct from regular trees — taller, narrower — render as 3x32 trunk with 20x8 frond cluster at top) planted along the south shore promenade.

**Flavor text**: "The waters are heated. The empire relaxes."

---

#### Lv 19 — COLOSSEUM FOUNDATION

Spawn a `colosseum_outline` at `(cx - rx*0.10, cy + ry*0.55)` — south-center of island, near the theater. It's an elliptical arrangement of stone blocks, rendered as an oval ring of 2px rects. Outer oval: 60x40. Inner void: 36x22. This is the "under construction" stage.

Add a `construction_crew` NPC flavor moment: 3 tiny 4x6 worker sprites visible near the construction site when zoomed in.

**Flavor text**: "Soon, the games will begin."

---

#### Lv 20 — TRIUMPHAL ARCH + VILLA (existing milestone, keep + enhance)

Good milestone. Enhance with:
- The colosseum outline from level 19 "partially completes" — draw outer walls at full alpha now
- Add a `victory_banner` animation at the arch: two thin vertical rects (4x20) flanking the arch that wave gently (sinewave on frameCount)
- Spawn 3 more `laurel_tree` objects near the villa

**Flavor text**: "CONSUL — The arch marks where Rome stood. The villa marks where Rome lives."

---

#### Lv 21 — COLOSSEUM OPENS

The colosseum from levels 19-20 "completes." Render with full walls and a `colosseum_event` — occasional crowd-cheer particle burst from the arena on a timer (every 5 minutes of real time). Add a small animated NPC crowd: 6 tiny colored rects inside the colosseum bounds that flicker on the event timer.

**Flavor text**: "The people have their spectacle. The governor has their loyalty."

---

#### Lv 22 — IMPERIAL QUARTER

Spawn a `domus_imperialis` (large villa-type building) at `(cx - rx*0.20, cy - ry*0.60)` — north hill (H5), commanding the island. This is larger than the level 20 villa: 80x56. It has a courtyard (inner rect, lighter fill) and 4 column decorations on its facade.

Also: An `imperial_garden` south of the domus — 3x3 grid of alternating `[85, 120, 55]` and `[110, 145, 80]` grass patches, plus 2 fountains (8x8 stone rim, 4x4 water center with shimmer).

**Flavor text**: "Power needs a palace."

---

#### Lv 23 — SENATE DISTRICT

Spawn a `curia` building at `(cx + rx*0.15, cy - ry*0.35)` — north side, near pyramid. 48x36 dimensions. Render with a prominent portico: 4 columns on the front facade, ornate entablature line (2px horizontal beam above columns).

Add a `senate_garden` — a formal garden with clipped hedge patterns (grid of 4x4 dark green rects).

**Flavor text**: "Even an island needs its laws."

---

#### Lv 24 — ROME IN MINIATURE

This level focuses on connectivity and density. Add:
- `side_streets`: 4 thin road segments branching off the main via (each 4px wide, 60-80px long)
- `fountain_network`: 3 additional small fountains placed near the forum, bathhouse, and villa
- `hanging_laundry`: tiny decorative — colored 2px rects strung between building facades near the residential area (H1 north slope)

**Flavor text**: "The island breathes. People live here."

---

#### Lv 25 — IMPERATOR (existing milestone, enhance dramatically)

Keep existing gold particle burst from pyramid. Add:
- The pyramid emits a permanent golden aura halo (ring of 32 tiny yellow dots orbiting it slowly, added to the pyramid render when `islandLevel === 25`)
- All building windows get a warm light effect at night (scan buildings array, add +15 alpha warm `[255, 200, 120]` window dots)
- The existing `imperatorBanner` animation triggers
- `imperial_eagle` sprite above the triumphal arch: 12x8 bird silhouette in `[200, 175, 100]` gold

**Flavor text**: "IMPERATOR — Mare Nostrum is yours. Every stone was exile. Every exile was purpose."

---

## Implementation Notes

### p5.js `noise()` Compatibility

p5.js provides `noise(x, y)` (Perlin noise, seeded by `noiseSeed()`). Call `noiseSeed(999)` once in `setup()` — before it would use a random seed each run, making the island shape different every game. Fixed seed = deterministic organic shape. This is essential. The noise seed should be stored in WORLD:

```javascript
const WORLD = {
  // ... existing ...
  noiseSeed: 999,  // island coastline seed — do not change post-ship
};
```

### Frame Budget

The organic ellipse uses 64 curve vertices × 6 rings = 384 vertex calls per `drawIsland()`. Current ellipse approach uses 6 calls. This is a meaningful increase. **Profile first.** If FPS drops on mobile, reduce steps to 48 (still smooth). The `beginShape/endShape` approach is GPU-efficient because p5.js batches it — this should be fine at 60fps on desktop.

Alternatively: pre-compute the 64-point polygon at `initState()` and on each level-up, store it in `state.coastlinePoints`, then `beginShape` just reads from the array each frame. O(64) reads instead of 64 noise samples per frame. This is the right optimization if needed.

### Decorative vs. BLUEPRINTS

Not every new level object needs to be a player-placeable BLUEPRINT. Two categories:

1. **Auto-spawned landmarks** (campfire, houses, market stall, lighthouse, aqueduct, colosseum) — stored in a `state.landmarks[]` array, each has `{ type, x, y, level }`. Rendered by a `drawLandmarks()` function in the island draw pass. These are NEVER player-placed, NEVER demolishable, and do not need cost/unlock logic.

2. **BLUEPRINTS expansions** (house, bathhouse/thermae) — proper BLUEPRINTS entries with minLevel gates, allowing players to build more of them after auto-spawn.

The `state.landmarks[]` approach keeps all decorative progression out of the existing buildings system, avoiding conflicts with demolish mode and save/load. Add it to save format v8.

### Save Format

Add to save/load (v8 bump):
```javascript
// SAVE:
landmarks: state.landmarks,
coastlinePoints: state.coastlinePoints,  // if pre-computed

// LOAD:
state.landmarks = d.landmarks || [];
state.coastlinePoints = d.coastlinePoints || null;  // recompute if null
```

### Ordering in `expandIsland()`

The current `expandIsland()` function handles levels 1-5 specifically and 6-25 procedurally. Refactor to:

```
expandIsland() {
  // ... existing cost/level-up logic ...
  spawnMilestoneBuildings(lvl);   // existing 5/10/15/20/25 logic
  spawnLandmarks(lvl);            // NEW: per-level landmark table
  spawnResources(lvl);            // existing procedural resources
  spawnTrees(lvl);                // existing tree spawning
  addFarmPlots(farmCX, farmCY, lvl);  // existing
  // ...
}
```

### Elevation `getElevation()` Placement

Define `getElevation()` near `isOnIsland()` around line 1270 in sketch.js — it belongs with the terrain query functions. It does not need to be in a separate file.

### North vs. South Asymmetry in Gameplay

The spec calls for a "rocky north coast." Currently nothing prevents NPC spawning on the north edge. After implementing the visual rocky north, consider:
- `spawnClear()` and `randomIslandPoint()` could add a soft preference away from the north edge (not a hard block, just weight the spawn distribution)
- Not required for V1 of this redesign, but noted as a natural follow-on

---

## Priority Order

**P0 (do these, they have biggest impact):**
1. `noiseSeed(999)` in setup — takes 1 line, makes all noise deterministic
2. Organic coastline ellipses — replaces 6 ellipse() calls, transforms the visual
3. Foam following organic edge — one formula change in `drawShoreWaves()`
4. Rocky north coast stone rects — 20 lines, huge authenticity gain

**P1 (high value, moderate work):**
5. Hill elevation tints + drop shadows in `drawIsland()`
6. `getElevation()` function + parallax Y offset for trees/ruins
7. Per-level `state.landmarks[]` system + `spawnLandmarks()` function
8. Levels 1, 3, 6, 7, 8, 9 landmark objects

**P2 (polish pass, do after P0+P1 are proven):**
9. Hill silhouette bump in coastline formula
10. Levels 11-19 landmarks (building density content)
11. Lighthouse animated beam
12. Colosseum completion animation at level 21
13. Pre-computed coastline points for performance

---

## What NOT to Do

- Do NOT change `isOnIsland()`, `isInShallows()`, `isWalkable()`, or any collision code
- Do NOT change `getSurfaceRX()` / `getSurfaceRY()`
- Do NOT add a real elevation/height field to any state object (crops, buildings, NPCs) — faked visual parallax only
- Do NOT add new BLUEPRINTS for levels 6-14 landmark objects — use the landmarks array
- Do NOT make the coastline noise seed random per-run — the island must look consistent across save/load
- Do NOT remove the existing `rect()` elevation hints before the `beginShape` coastline is proven to work — add, don't replace, until tested

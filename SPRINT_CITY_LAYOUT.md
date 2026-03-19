# Sprint: Roman City Layout Overhaul
## Replace random building scatter with a road-first, cluster-based city

**Emotional target:** At level 9, the player looks at their island and sees — for the first time — a Roman city plan. Streets. Blocks. Districts. Not a campsite that grew. A decision.

---

## The Core Diagnosis

### Why it looks bad now

1. **One road, no grid.** `drawRomanRoad()` draws a single E-W line at `cy-8`. There is no north-south axis. The "cross" described in ISLAND_MAP.md does not exist in code.

2. **Buildings are specks on a continent.** At Lv10, `srx ≈ 869`. The island walkable width is `869 * 2 = 1738px`. A forum building is 64px wide. That is 3.7% of the island width. Nothing clusters. Nothing reads.

3. **No block fills.** Between landmark buildings there is nothing — bare terrain. A Roman city has insulae (apartment blocks) shoulder-to-shoulder along every street. Currently zero ambient housing mass exists.

4. **Placements float.** `cx + rx * 0.55` is a point in empty space, not a position relative to a road or block. No building placement references the road it should face.

5. **Decoration does not follow buildings.** Torches and floor tiles are placed relative to building coordinates but the buildings themselves are not placed relative to any street grid, so the decoration clusters look unanchored.

---

## The Fix: Road-First Architecture

### Phase 1 — Define the road skeleton (world.js: `drawRomanRoad`)

The existing function draws one segment. Replace it with a proper Roman cross.

#### The Cross-Axis Grid (Era 2, active from Lv 9)

```
DECUMANUS (E-W main road):
  From: cx - srx * 0.85   (west, near port approach)
  To:   cx + srx * 0.80   (east, toward harbor arch)
  Y:    cy - 8             (existing avenueY — keep this, it works)
  Width: 20px (Era 2), 24px (Era 3)

CARDO (N-S cross road):
  From: cy - sry * 0.75   (north, below sacred hill / aqueduct line)
  To:   cy + sry * 0.65   (south, above port zone)
  X:    cx + rx * 0.05    (slightly east of dead center — forum sits here)
  Width: 16px (Era 2), 20px (Era 3)

INTERSECTION POINT:
  x: cx + rx * 0.05
  y: cy - 8
  This is the Forum plaza. The forum building faces south from here.
```

The Cardo does not exist in Era 1. The Decumanus in Era 1 is the existing worn dirt path — `drawRoadSeg` already handles the era-1 vs era-2 palette. No change needed there. Just add a second segment call for the Cardo inside `drawRomanRoad`, gated on `ep.era >= 2`.

#### Secondary Roads (Era 2, rendered at reduced width 12px)

```
VIA MILITARIS (center to SE castrum):
  From intersection: cx + rx * 0.05, cy - 8
  To:               cx + rx * 0.45, cy + ry * 0.5
  This already has floor tiles — now give it a rendered road underneath.

VIA SACRA (intersection north to temple approach):
  From: cx + rx * 0.05, cy - 8
  To:   cx + rx * 0.55, cy - ry * 0.35
  Branches east from the Cardo midpoint, diagonal approach to temple.

VIA GRANARIA (intersection west to farm):
  From: cx + rx * 0.05, cy - 8
  To:   getFarmCenterX(), getFarmCenterY()
  Width 10px — farm road, dirt even in Era 2.
```

Implementation: add `drawRoadSeg()` calls for each. All use the same function already in world.js — just new start/end coordinates.

---

### Phase 2 — Building cluster system (sketch.js: `expandIsland`)

Replace isolated building placement with cluster functions. Each cluster is a self-contained group of 3-8 objects that together read as a city block.

#### Cluster function signature

```javascript
function spawnCluster(type, anchorX, anchorY, level) { ... }
```

Each cluster type knows what buildings, decorations, floor tiles, torches and spacing to place. All coordinates inside the cluster are offsets from `anchorX, anchorY`. The anchor is always a point ON a road.

---

## Cluster Definitions

All measurements in world pixels. Buildings face the nearest road — place them with their front (south face in isometric) toward the road, set back 4-8px from road edge.

---

### CLUSTER: market_stall (Lv 7)

Anchor: `cx + rx * 0.5, cy - 8` (ON the Decumanus, east half)

```
Market building:    anchor + (0, 16)      — 36x28, south of road
Floor tile × 2:     anchor + (-20, 36)    — road-facing forecourt
Floor tile × 2:     anchor + (12, 36)
Torch:              anchor + (-26, 20)    — left of stall entrance
Torch:              anchor + (26, 20)     — right of stall entrance
```

Before/after: Was one building dropped at `cx + rx * 0.5, cy + ry * 0.1`. Now it's a complete stall with a forecourt plaza facing the road.

---

### CLUSTER: residential_first (Lv 6)

Anchor: `cx - rx * 0.2, cy - ry * 0.2` (NW quadrant, facing south toward Decumanus)

```
House × 1:          anchor + (0, 0)       — 36x28
House × 1:          anchor + (44, 0)      — neighbor, 4px gap between (alley)
Torch × 1:          anchor + (22, 18)     — in the alley between them
Floor tile × 2:     anchor + (4, 30)      — doorstep pavement
Floor tile × 2:     anchor + (26, 30)
```

Before/after: Was two houses side-by-side with one torch. Now they have paved doorsteps and read as a block-face.

---

### CLUSTER: residential_row (Lv 16)

Anchor: `cx - rx * 0.25, cy - ry * 0.35` (further north in residential zone, on implied side street)

```
House × 4:          anchor + (0/44/88/132, 0)   — tight row
Torch × 3:          anchor + (22/66/110, 18)    — torch in each alley
Floor tile × 6:     anchor + (0/22/44/66/88/110, 30)  — continuous pavement
Fence × 2:          anchor + (-10, -15)  and anchor + (142, -15) — block ends
```

This is a full insulae face. Six floor tiles create a continuous pavement strip — a sidewalk. This is new. Currently there is no concept of a continuous sidewalk in the codebase.

---

### CLUSTER: civic_shrine (Lv 3)

Anchor: `cx + rx * 0.4, cy - ry * 0.35` (NE quadrant, on implied path)

```
Shrine:             anchor + (0, 0)       — 32x28
Floor tile × 3:     anchor + (-24/0/24, 22)   — three-tile forecourt
```

No change from current — this cluster is already correct. Keep it.

---

### CLUSTER: temple_precinct (Lv 10)

Anchor: `cx + rx * 0.55, cy - ry * 0.35` (on Via Sacra terminus)

This replaces the current Lv10 temple spawn which places temple + 6 floor tiles + 2 torches.

```
Temple:             anchor + (0, 0)       — 56x40
Torch × 2:          anchor + (-32/+32, 16)   — flanking entrance
Floor tile × 3:     anchor + (-24/0/24, 44)  — first step row
Floor tile × 3:     anchor + (-24/0/24, 62)  — second step row
Floor tile × 3:     anchor + (-24/0/24, 80)  — approach continues south
Mosaic × 1:         anchor + (0, -30)     — mosaic on pediment plaza
Lantern × 2:        anchor + (-44/+44, 44)   — flanking the approach
```

Before/after: The current 6 floor tiles are placed relative to building coordinates but not extended into a proper Sacred Way. This cluster extends the approach 80px south of the temple — a proper processional you walk up. From street level it reads as: lanterns → mosaic pavement → torch columns → temple steps.

---

### CLUSTER: forum_district (Lv 15)

Anchor: `cx + rx * 0.05, cy - 8` (AT the Decumanus/Cardo intersection)

This is the most important cluster. It defines the heart of the city.

```
Forum:              anchor + (-32, 20)    — 64x48, south of intersection
Mosaic × 3:         anchor + (-30/0/30, 72)    — forum forecourt
Mosaic × 3:         anchor + (-30/0/30, 90)    — extended plaza south
Floor tile × 4:     anchor + (-20/0/20/40, -20) — plaza north of forum, on road
Floor tile × 4:     anchor + (-20/0/20/40, -36) — extended north
Torch × 2:          anchor + (-70/+40, 20)      — forum entrance pillars
Floor tile × 2:     anchor + (-60/+30, -20)     — cardo entry tiles
```

The floor tiles north of the forum bridge the Decumanus and Cardo intersection visually — they create a paved plaza where the two roads cross. Currently this intersection is just open terrain with nothing marking it.

---

### CLUSTER: castrum_block (Lv 8)

Anchor: `cx + rx * 0.45, cy + ry * 0.5` (SE, on Via Militaris terminus)

```
Castrum:            anchor + (0, 0)       — 52x40
Wall × 1:           anchor + (-30, 20)    — left flank wall
Wall × 1:           anchor + (30, 20)     — right flank wall
Torch × 2:          anchor + (-34/+34, 16) — flanking entrance
Floor tile × 3:     anchor + (-20/0/20, 42) — via militaris terminus paving
```

This is close to current. The addition is the two wall segments read as a fortified gatehouse — currently the castrum is a building dropped in empty space. The walls create a perimeter edge.

---

### CLUSTER: bath_district (Lv 8)

Anchor: `cx - rx * 0.3, cy + ry * 0.35` (SW quadrant)

```
Bath house:         anchor + (0, 0)       — 48x36
Floor tile × 2:     anchor + (-16/0, 32)  — entrance pavement
Torch × 1:          anchor + (0, -24)     — above bath entrance
```

The bath lacks context. Add it to the Cardo by shifting its anchor to be ON the south end of the Cardo: `cx + rx * 0.05 - 120, cy + ry * 0.35` — within walking distance of the road rather than floating in the SW.

---

### CLUSTER: granary_complex (Lv 5)

Anchor: `getFarmCenterX(), getFarmCenterY() - ry * 0.7`

```
Granary:            anchor + (0, 0)       — 48x36
Torch × 2:          anchor + (-28/+28, 14) — flanking (already exists)
Floor tile × 3:     anchor + (-16/0/16, 38) — loading dock pavement (NEW)
Fence × 1:          anchor + (0, -20)     — north boundary fence (NEW)
```

The loading dock pavement is new — three floor tiles at the south face of the granary. This makes the granary feel like a working building with a yard, not a standalone sprite.

---

### CLUSTER: library_precinct (Lv 17)

Anchor: `cx + rx * 0.3, cy - ry * 0.35` (NE civic zone, adjacent to temple)

```
Library:            anchor + (0, 0)       — 48x36
Floor tile × 3:     anchor + (-16/0/16, 34)  — entrance forecourt
Lantern × 2:        anchor + (-32/+32, 20)   — reading light
Mosaic × 1:         anchor + (0, 52)     — dedication mosaic (NEW)
```

The mosaic below the library is new — an engraved dedication plate on the pavement, visually connecting library to temple (they are neighbors).

---

## Phase 3 — Block Fill System

This is the highest-impact change for city density.

### The Problem

Between landmark buildings, the island is empty terrain. A Roman city has no empty terrain inside the walls. Every block face has buildings on it.

### The Solution: `fillCityBlock()`

At Lv 9, 12, 15, 18, add calls to a new function that populates the gaps between named landmarks with ambient domus (house) buildings. These are NOT player-interactable. They exist only as visual density.

```javascript
function fillCityBlock(roadX, roadY, side, count, spacing) {
  // roadX, roadY: point on a road
  // side: 'north', 'south', 'east', 'west' — which side of road to fill
  // count: number of houses to place
  // spacing: px between house centers
  for (let i = 0; i < count; i++) {
    let bx = (side === 'east' || side === 'west')
      ? roadX + (side === 'east' ? 22 : -22)
      : roadX + (i - count/2) * spacing;
    let by = (side === 'north' || side === 'south')
      ? roadY + (side === 'south' ? 22 : -22)
      : roadY + (i - count/2) * spacing;
    state.buildings.push({ x: bx, y: by, w: 36, h: 28, type: 'house', rot: 0, ambient: true });
  }
}
```

The `ambient: true` flag means `drawOneBuilding` can render these at reduced contrast (80% alpha) so they read as background fabric, not as featured buildings.

### Block fill calls in expandIsland

```javascript
// Lv 9 — Residential block fills along the new Cardo (north-south axis)
// West side of Cardo, between Decumanus and Villa zone
fillCityBlock(cx + rx*0.05, cy - ry*0.25, 'west', 3, 44);   // 3 houses, north of center
fillCityBlock(cx + rx*0.05, cy + ry*0.15, 'west', 2, 44);   // 2 houses, south of center

// East side of Decumanus — commercial strip east of forum
fillCityBlock(cx + rx*0.3, cy - 8, 'south', 3, 44);

// Lv 12 — Denser residential
fillCityBlock(cx - rx*0.15, cy - ry*0.15, 'west', 4, 40);
fillCityBlock(cx - rx*0.15, cy + ry*0.05, 'west', 3, 40);

// Lv 15 — Full city density, all quadrants
fillCityBlock(cx + rx*0.2, cy - ry*0.1, 'north', 4, 40);
fillCityBlock(cx - rx*0.05, cy + ry*0.2, 'east', 3, 40);
```

---

## Phase 4 — Scale Calibration

### Current building sizes vs. needed

| Building | Current | Needed | Change |
|----------|---------|--------|--------|
| house | 36x28 | 44x34 | +22% |
| market | 36x28 | 48x36 | +33% |
| forum | 64x48 | 80x60 | +25% |
| temple | 56x40 | 72x52 | +29% |
| library | 48x36 | 60x44 | +25% |
| arena | 56x44 | 72x56 | +29% |
| castrum | 52x40 | 64x48 | +23% |
| villa | 60x44 | 72x54 | +20% |

**Update BLUEPRINTS w/h values.** The renderer scales from `b.w` and `b.h` — changing BLUEPRINTS changes all instances automatically. Existing saved buildings carry their own w/h, so add a save migration in `loadState()` that normalizes building sizes on load.

Migration pattern (add to the v7 migration block):

```javascript
// Normalize building sizes to current BLUEPRINTS on load
state.buildings.forEach(b => {
  if (BLUEPRINTS[b.type]) {
    b.w = BLUEPRINTS[b.type].w;
    b.h = BLUEPRINTS[b.type].h;
  }
});
```

---

## Implementation Order

Work in this sequence — each step is testable before the next.

### Step 1: Add the Cardo to world.js (2 hours)

In `drawRomanRoad()`, after the existing single `drawRoadSeg()` call, add:

```javascript
// Cardo — N-S axis, Era 2+
if (ep.era >= 2) {
  let cardoX = w2sX(WORLD.islandCX + getSurfaceRX() * 0.05);
  let cardoNorthSY = w2sY(WORLD.islandCY - getSurfaceRY() * 0.75);
  let cardoSouthSY = w2sY(WORLD.islandCY + getSurfaceRY() * 0.65);
  let cardoSegs = max(15, floor(abs(cardoSouthSY - cardoNorthSY) / 11));
  drawRoadSeg(cardoX, cardoNorthSY, cardoX, cardoSouthSY, cardoSegs);
}
```

Expected result: a visible N-S road appears at Lv 9. The city immediately reads as having an axis. This single change — one function call — is the highest ROI move in the entire sprint.

Test: `/level 9` in debug console, zoom out. You should see a cross.

### Step 2: Add Via Sacra and Via Militaris branches (1 hour)

```javascript
if (ep.era >= 2) {
  // Via Sacra — Cardo to Temple (NE diagonal)
  let templeX = w2sX(WORLD.islandCX + getSurfaceRX() * 0.55);
  let templeY = w2sY(WORLD.islandCY - getSurfaceRY() * 0.35);
  drawRoadSeg(cardoX, roadSY, templeX, templeY, 18);

  // Via Militaris — intersection south to Castrum
  let castrumX = w2sX(WORLD.islandCX + getSurfaceRX() * 0.45);
  let castrumY = w2sY(WORLD.islandCY + getSurfaceRY() * 0.5);
  drawRoadSeg(cardoX, roadSY, castrumX, castrumY, 18);
}
```

Test: Temple and Castrum are now visually connected by roads. The military road reads as separate from the civic axis.

### Step 3: Upgrade level 10 forum/temple cluster placement (2 hours)

Replace the isolated building push calls in `expandIsland()` for Lv 10 with the `spawnCluster('temple_precinct', ...)` call. Implement `spawnCluster` as a switch on type. Start with just `temple_precinct` and `forum_district`.

Test: `/level 10` — temple should have 9 floor tiles and the full lantern approach, all aligned to the Via Sacra.

### Step 4: Add block fills at Lv 9, 12, 15 (2 hours)

Implement `fillCityBlock()`. Add the calls listed above. Use `ambient: true` flag.

In `drawOneBuilding`, check `b.ambient` and reduce alpha: wrap the entire case body in `push(); tint(255, 200);` ... `pop()` or just draw the building rect at 80% opacity for ambient houses. The easiest approach: add a separate case for ambient house that draws a simpler, slightly smaller version.

Test: `/level 15` — there should be visible residential mass filling the NW and center districts. Not a handful of buildings — actual blocks.

### Step 5: Scale buildings up (1 hour)

Update BLUEPRINTS sizes. Add the migration in `loadState()`. Test that existing saves load correctly and buildings look right at new sizes.

### Step 6: Upgrade remaining cluster placements (3 hours)

Go through Lv 6, 7, 8, 16, 17 in `expandIsland` and upgrade them to cluster functions. The Lv 8 castrum is particularly important — add the wall segments that create a fortified perimeter.

---

## Before / After Expectations

### Lv 5 (Era 1) — No change to feel
Player sees: scattered huts, dirt path, granary at the north end of the path, farm to the west. Village. Still organic. The granary cluster now has a loading dock pavement and a fence behind it — small details that read even at Era 1 scale.

### Lv 9 (Era 2 begins) — MAJOR change
**Before:** The island grows slightly. A few aqueduct buildings appear at the north. Everything still looks scattered.
**After:** A north-south road appears through the center of the island. The east-west road was always there. Now they form a cross. At the intersection: paved plaza tiles. The four quadrants suddenly read as zones. The player zooms out and goes "oh — it's a city plan."

### Lv 12
**Before:** Three lanterns placed along the east road. Nothing clusters.
**After:** The NW quadrant has 6-8 ambient domus in two rows along the Cardo's west side. The Decumanus has a row of 3 commercial buildings on its south face east of the intersection. The first time the player can "walk down a street" and have buildings on both sides.

### Lv 15 (Forum level)
**Before:** Forum building placed at `cx + rx * 0.05, cy + ry * 0.15`. Watchtower placed far east. Arch dropped on east road.
**After:** Forum cluster — forum + 8 mosaic/floor tiles + 2 torches — creates a proper civic plaza at the Decumanus/Cardo intersection. The arch marks the east end of the Decumanus visibly. Walking from the port to the forum, you pass: arch → lanterns → forum plaza.

### Lv 17
**Before:** Library building at NE, two lanterns.
**After:** Library faces the Via Sacra with a 3-tile forecourt, dedication mosaic, two lanterns. Temple is 100px south on the same road with its own 9-tile processional. Walking the Via Sacra: you pass both civic buildings in sequence, connected by continuous paving.

### Lv 25 (Imperium Maximum)
**Before:** Grand temple, arch, villa, mosaics — scattered at max island size.
**After:** The entire island is a legible city. Four districts separated by the road cross. The Cardo runs from the Grand Temple at the north through the Forum intersection to the baths and castrum at the south. Looking down from above: a Roman urban grid on an island. The player has not built a collection of buildings. They have built a city.

---

## What to NOT change

- The Decumanus position (`cy - 8`, `avenueY`) — this is the established road spine, correct.
- The Farm zone west — it is intentionally not on the grid. It is the organic pre-Roman foundation. Keep it wild-adjacent.
- The Crystal Shrine far west — it exists outside the city plan by design.
- The pyramid / sacred hill — it is NORTH of the grid, not on the Cardo. The Cardo points toward it but does not reach it. This is correct Roman urban planning: the sacred precinct sits beyond the civic grid.
- Era 1 road rendering — the existing worn-dirt path treatment is perfect for Era 1.
- The existing `expandIsland()` resource/tree/crystal procedural logic — touch none of it.

---

## Files to Edit

- `world.js` — `drawRomanRoad()`: add Cardo + secondary road segments
- `sketch.js` — `expandIsland()`: replace isolated push calls with cluster calls; add `fillCityBlock()`; add `spawnCluster()`
- `sketch.js` — `BLUEPRINTS`: update w/h for 8 building types
- `sketch.js` — `loadState()`: add building size migration
- `sketch.js` — `drawOneBuilding()`: add ambient rendering mode for block-fill houses

Do not create new files. Do not touch `farming.js`, `npc.js`, `combat.js`, `world.js` terrain functions, or any island other than the home island.

---

## Success Criteria

A playtester who has never seen the game opens it, levels to 9 using `/level 9`, and unprompted says one of:
- "Oh, it's a Roman city"
- "I can see the streets"
- "Everything is connected"

That is the bar. Not "it looks better." Recognition.

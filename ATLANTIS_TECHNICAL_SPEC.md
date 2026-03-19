# Atlantis Technical Spec — Village to Megalopolis Transformation
## Mare Nostrum | island levels 1–25

---

## 0. Codebase Context

Before designing systems, ground truths pulled from the current code:

- `state.islandLevel` (1–25), `state.islandRX/islandRY` grow via `expandIsland()` at line 23547
- `getSurfaceRX()` = `state.islandRX * 0.90`, `getSurfaceRY()` = `state.islandRY * 0.36`
- Island growth rates: rx+60/lv at lv1-5, +45 at lv6-10, +35 at lv11-15, +25 at lv16-20, +18 at lv21-25
- `drawIsland()` at line 4890 — layered organic ellipses for water/beach/grass
- `drawRomanRoad()` at line 5957 — single Via Romana, gravel-base + stone pavers
- `drawNightLighting()` at line 6022 — torch/lantern glow pools, crystal teal glow, temple warm glow
- `drawBuildings()` at line 7379 — iterates `state.buildings[]`, each building drawn in `drawOneBuilding()`
- `Engine.getPool()` at engine.js line 79 — object pool already exists, supports `alive` flag
- `Engine.isVisible()` at engine.js line 63 — camera culling already available
- `state.auroraBorealis` at line 791 — intensity field already exists in state, just never driven
- `drawSky()` at line 2411 — full day/night gradient system, draws per-scanline
- `getSkyBrightness()` at line 2402 — 0.0 (midnight) to 1.0 (midday)
- `BLUEPRINTS` at line 192 — building type registry with `minLevel` gating
- `Engine` draw layers: `['background', 'world', 'entities', 'effects', 'ui', 'overlay']`

---

## 1. Era System

### Purpose
A single `getEra()` function that everything downstream reads. No state duplication — the era is always derived from `state.islandLevel`. Systems that need era-specific behavior call this function; they do not store era in state.

### Implementation

```
function getEra() {
  let lv = state.islandLevel || 1;
  if (lv <= 8)  return 'village';
  if (lv <= 17) return 'city';
  return 'atlantis';
}
```

Placement: define once near the top of sketch.js, just after the `WORLD` constant block (around line 190). All era-dependent systems import nothing — they just call `getEra()`.

### Era Transition Thresholds

| Level | Era       | Key Narrative Beat                     |
|-------|-----------|----------------------------------------|
| 1-8   | village   | Subsistence — survival, first shelter  |
| 9-17  | city      | Prosperity — trade, civic order        |
| 18-25 | atlantis  | Transcendence — crystal tech, apotheosis |

Transitions at level 9 and level 18 trigger one-time cinematic moments (see section 5 on visual palette changes for what fires at each threshold).

### What Reads Era

Every system that reads era does so lazily (called during draw/update, not cached):

- `getEraPalette()` — building and road colors
- `drawRomanRoad()` — road material rendering
- `drawNightLighting()` — ambient light color temperature
- Sound mode trigger in `snd.updateLyre()` — new music mode `'atlantis'` for Atlantis era
- `updateAmbientCitizens()` — citizen count cap
- `drawAtlantisOverlay()` — new function, only runs if `getEra() === 'atlantis'`

### Era Transition Events

At level 9 (village → city): fire `Engine.emit('era_change', { era: 'city' })`. Triggers:
- One-time notification text
- Palette warm-to-stone shift becomes visible immediately on next draw
- Stone road segments replace gravel visually (handled inside `drawRomanRoad()`)

At level 18 (city → atlantis): fire `Engine.emit('era_change', { era: 'atlantis' })`. Triggers:
- One-time Atlantis cinematic (queue in cinematics.js, defer 1 second)
- Concentric ring initialization (see section 2)
- Citizen cap upgrade
- Aurora system activates

---

## 2. Concentric Ring System (Atlantis Era)

### Purpose
At level 18+, water channels appear as elliptical rings inside the island, giving the Atlantis aesthetic. These are purely visual — they do not change `isOnIsland()`, player movement, or any gameplay logic. Bridges are auto-spawned building objects at cardinal points.

### Data Model

Add to `state` at init (guarded so existing saves don't break):

```js
state.atlantisRings = state.atlantisRings || [];
```

Each ring object:
```js
{
  radiusFactor: 0.55,   // fraction of getSurfaceRX() — rings at 0.55, 0.35
  glowPhase: 0,         // offset for animated teal shimmer
  bridges: [            // 4 bridge objects, auto-placed on init
    { angle: 0, wx: ..., wy: ... },
    { angle: HALF_PI, ... },
    { angle: PI, ... },
    { angle: PI + HALF_PI, ... },
  ]
}
```

### Initialization

Called once when `state.islandLevel` reaches 18, inside `expandIsland()`:

```js
if (state.islandLevel === 18) {
  initAtlantisRings();
}
```

`initAtlantisRings()`:
- Creates 2 rings at `radiusFactor` 0.55 and 0.35 (outer and inner channels)
- For each ring, calculates 4 bridge world positions at N/S/E/W using current `getSurfaceRX()` and `getSurfaceRY()`
- Pushes bridge buildings into `state.buildings[]` with type `'bridge'` (reuse existing bridge building type if it exists, otherwise add it to BLUEPRINTS as a non-buildable landmark type)
- Stores ring data in `state.atlantisRings`

At level 21 and 24: add a third ring at factor 0.70 and a fourth at 0.20, expanding the channel system. Each addition calls a partial `initAtlantisRings()` that only appends new rings without clearing existing ones.

### Rendering

New function `drawAtlantisRings()`, called inside `drawIsland()` after the grass layer but before buildings. Only executes if `getEra() === 'atlantis'`.

The render layering inside `drawIsland()`:
1. Shallow water ellipses (existing)
2. Sandy beach (existing)
3. Grass (existing)
4. **Hills (existing)**
5. **Atlantis rings drawn here** — water channels cut into grass
6. Road (existing `drawRomanRoad()`)
7. Buildings (existing `drawBuildings()`)

Ring rendering approach — each ring is two fills:

```
For each ring in state.atlantisRings:
  let srx = getSurfaceRX() * ring.radiusFactor;
  let sry = getSurfaceRY() * ring.radiusFactor;
  let outerRX = srx + 18, outerRY = sry + 8;   // channel outer wall
  let innerRX = srx - 18, innerRY = sry - 8;   // channel inner wall

  // Water channel fill (teal-blue, slightly transparent)
  fill(teal color based on night/day)
  drawOrganicEllipse(ix, iy, outerRX*2, outerRY*2, iy_offset, 0.02)
  // Mask inner island back (grass color)
  fill(grass color)
  drawOrganicEllipse(ix, iy, innerRX*2, innerRY*2, iy_offset, 0.02)
```

This "cut" technique — draw water ring, redraw inner grass — is the same pattern `drawIsland()` already uses for its layered rings. It is the correct approach here.

Channel water color:
- Day: `(50, 170, 195)` — bright tropical teal
- Night: `(20, 90, 130, 180)` — deep glowing blue-teal (driven by `getSkyBrightness()`)
- Atlantis-era night adds animated glow (see section 4)

Bridges at cardinal points are already `state.buildings[]` entries drawn by the existing `drawBuildings()` — no extra rendering logic needed for them.

### isOnIsland() — No Change Required

`isOnIsland()` uses the ellipse equation against `getSurfaceRX()` / `getSurfaceRY()`. The rings are visually inside that boundary. Walkability is not affected. The channels are decorative moats — players walk over the bridge buildings as they do now. This is correct and intentional: the rings show the Atlantis canal pattern without requiring a pathfinding overhaul.

---

## 3. Ambient Citizens

### Purpose
Sprites that walk around the island, making it feel alive. Not NPCs — no dialogue, no quests, no interaction. Pure atmosphere. Count scales with island level.

### Count Table

| Island Level | Citizen Cap |
|-------------|-------------|
| 1-4         | 0           |
| 5           | 2           |
| 8           | 5           |
| 12          | 10          |
| 15          | 15          |
| 20          | 22          |
| 25          | 30          |

Formula: `floor(constrain((islandLevel - 4) * 2, 0, 30))`
This gives 2 at lv5, 10 at lv9, 20 at lv14, 30 at lv19 — reasonable curve that doesn't hit the cap too early. Clamp at 30 for performance.

### Object Pool

Use `Engine.getPool()` which already exists in engine.js. The factory function creates a citizen object:

```js
{
  alive: false,
  x: 0, y: 0,
  wx: 0, wy: 0,          // world-space position
  targetWX: 0, targetWY: 0,
  speed: 0.4,            // world units/frame
  variant: 0,            // 0=farmer, 1=merchant, 2=soldier, 3=priest
  idleTimer: 0,          // frames to wait before picking new target
  idleMax: 120,
  animFrame: 0,          // walk cycle 0-3
  animTimer: 0,
  dir: 1,                // 1=right, -1=left (for sprite flip)
  phase: 0,              // random phase offset for individuation
}
```

Pool name: `'citizens'`, max size: 30.

### Spawning and Lifecycle

`updateAmbientCitizens()` — called once per frame in the main update loop (same place companions are updated):

1. Count currently `alive` citizens in the pool
2. If count < `getCitizenCap()`, and `frameCount % 180 === 0` (spawn check every 3 seconds), activate a dead pool slot
3. Spawn position: random walkable point via the existing `getRandomWalkable()` pattern (pick point with `isOnIsland()` check)
4. Assign a variant based on era: village prefers farmer/merchant (0,1), city adds soldier (2), Atlantis adds priest (3)
5. Citizens are never manually killed — they despawn if they wander outside `isOnIsland()` for more than 60 frames (`alive = false`)

### Patrol AI

Per-citizen per-frame update inside `updateAmbientCitizens()`:

```
State machine: 'walking' or 'idle'

IDLE state:
  idleTimer--
  if idleTimer <= 0:
    pick new targetWX, targetWY:
      - 70% chance: random point within 200 world units (stay local)
      - 30% chance: random point anywhere on island
    if target passes isOnIsland() check: switch to WALKING
    else: reset idleTimer to 60 (try again soon)

WALKING state:
  move toward target at speed
  if dist to target < 3: switch to IDLE, set idleTimer = random(90, 240)
  update animFrame every 8 frames
  if off-island for 60 frames: alive = false (despawn)
```

This is intentionally simple. No steering, no avoidance. Citizens will overlap. That is acceptable for ambient atmosphere.

### Rendering

`drawAmbientCitizens()` — called in the entities layer, after buildings but before particles. Use `Engine.isVisible()` to skip off-screen citizens.

Each citizen is a 7x14 pixel rect-based sprite. No image assets — pure p5.js drawing matching the existing art style.

Sprite variants (all pixel art, ~7x14 world-pixel footprint):
- **Farmer (0)**: brown tunic, wide hat (tan rect), small tool (hoe) shape
- **Merchant (1)**: orange/gold tunic, small pack on back
- **Soldier (2)**: red cape pixel, helmet crest (small rect at top)
- **Priest (3)**: white robe (tall fill), small laurel (arc)

Walk animation: 2-frame cycle. At `animFrame % 2 === 0`, legs are slightly spread; at `animFrame % 2 === 1`, legs together. Achieved by drawing the leg rects with a 1px offset.

Shadow: small dark ellipse under each citizen (same as companion shadows). Scale 1 at era=village, unchanged.

```js
// Cull check
if (!Engine.isVisible(c.wx, c.wy, 20)) continue;

let sx = w2sX(c.wx), sy = w2sY(c.wy);
push();
translate(floor(sx), floor(sy));
scale(c.dir, 1);
// ... draw variant sprite ...
pop();
```

### Performance Budget

30 citizens × ~12 draw calls each = 360 draw calls. This is well within p5.js budget for this game — `state.buildings` already iterates 200+ objects. The `Engine.isVisible()` cull will typically remove 50-70% when zoomed in.

One concern: `isOnIsland()` called during target selection. This runs 2-3 times per citizen per idle state change. At 30 citizens with average idle of 3-4 seconds, that is ~8 calls/second total. Negligible.

---

## 4. Crystal Technology Overlay (Atlantis Era)

### Purpose
Atmospheric visual effects that signal the player they have crossed into a new technological register. All effects are additive (draw on top) and use existing rendering patterns from `drawNightLighting()`.

All crystal effects only activate when `getEra() === 'atlantis'`. They are gathered in a single new function `drawAtlantisOverlay()` called from the island draw sequence after buildings.

### 4a. Crystal Veins Along Roads

Visual: thin animated lines running parallel to the Via Romana, with a pulsing teal glow at night.

Implementation: Inside `drawRomanRoad()`, add an era branch at the end:

```js
if (getEra() === 'atlantis') {
  drawCrystalVeins(shrineSX, roadSY, empSX, roadSY);
}
```

`drawCrystalVeins(x1, y1, x2, y2)`:
- Draws two parallel lines 3px above and below the road centerline
- Color: `(80, 220, 200, alpha)` where alpha pulses via `sin(frameCount * 0.04) * 30 + 60`
- Every 40px along the road, a small crystal node: a 3x3 diamond shape with a brighter center
- At night (`getSkyBrightness() < 0.4`), alpha doubles and a soft glow ellipse is drawn underneath each node (same technique as torch glow in `drawNightLighting()`)

### 4b. Floating Crystal Particles Above Buildings

During Atlantis era, certain high-tier buildings emit crystal motes.

Trigger buildings: `temple`, `arch`, `villa`, `forum`, `crystalShrine`.

Implementation: in `updateAmbientCitizens()`'s update block (or a separate `updateAtlantisEffects()`), every 120 frames per qualifying building, call `spawnParticles()` with a new type `'crystal_mote'`:

```js
particles.push({
  x: b.x + random(-8, 8),
  y: b.y - 10,
  vx: random(-0.2, 0.2),
  vy: random(-0.8, -0.3),
  life: random(40, 80), maxLife: 80,
  type: 'burst',
  size: random(1.5, 3),
  r: 80, g: 220, b: 200,
  world: true,
});
```

This reuses the existing particle system entirely — no new code in `drawParticles()`. The existing `burst` type handles fade-out via `life/maxLife` alpha.

Cap: only spawn if `particles.length < _particleCap - 50` (preserve particle budget headroom).

### 4c. Water Channel Glow (Night)

Inside `drawAtlantisRings()`, add night glow pass after ring water fill:

```js
let bright = getSkyBrightness();
if (bright < 0.5) {
  let nightStr = map(bright, 0, 0.5, 1, 0);
  let pulse = sin(frameCount * 0.025 + ring.glowPhase) * 0.3 + 0.7;
  // Outer edge teal glow — same pattern as crystal shrine in drawNightLighting()
  for (let gr = 12; gr > 0; gr -= 2) {
    fill(40, 200, 180, 5 * nightStr * pulse * (gr / 12));
    drawOrganicEllipse(ix, iy, (outerRX + gr) * 2, (outerRY + gr) * 2, ...);
  }
}
```

This mirrors the crystal shrine glow pattern already at line 6111-6120 exactly.

### 4d. Temple Beacon (Vertical Light Beam)

A vertical column of light rising from the temple. Active Atlantis era only. Added to `drawNightLighting()` inside a `getEra() === 'atlantis'` branch.

```
let tx = w2sX(WORLD.islandCX);
let ty = w2sY(WORLD.islandCY - 15);  // temple screen position
let beaconH = height * 0.35;         // reaches upper portion of sky
let beaconPulse = sin(frameCount * 0.02) * 0.2 + 0.8;
let nightStr = 1 - getSkyBrightness();

// Beacon shaft — vertical gradient, wide at base, narrow at top
for (let bi = 0; bi < 8; bi++) {
  let t = bi / 8;
  let bw = lerp(16, 2, t);
  let ba = 8 * nightStr * beaconPulse * (1 - t);
  fill(200, 240, 220, ba);
  rect(tx - bw/2, ty - beaconH * t, bw, beaconH / 8);
}
```

Day version (bright > 0.5): no beacon rendered (invisible in daylight — correct behavior).

### 4e. Aurora Effect

`state.auroraBorealis` already exists at line 791 with intensity 0-1. It is never currently driven. This system wires it up.

**Activation logic**: in `updateAtlantisEffects()` (new function in daily update path):
- Atlantis era + night (bright < 0.3): `state.auroraBorealis` targets 0.6 + `sin(state.day * 0.7) * 0.3` (day-dependent intensity so it varies night to night)
- Any other condition: target 0.0
- Smooth: `state.auroraBorealis = lerp(state.auroraBorealis, target, 0.005)` per frame

**Rendering**: In `drawSky()`, after the main gradient loop, before stars:

```js
if (state.auroraBorealis > 0.05) {
  let auroraInt = state.auroraBorealis;
  // 3 aurora curtain bands at different sky positions
  let bands = [
    { y: skyH * 0.15, hue: [60, 220, 180], width: width * 0.6 },
    { y: skyH * 0.25, hue: [100, 200, 255], width: width * 0.45 },
    { y: skyH * 0.35, hue: [120, 180, 220], width: width * 0.3 },
  ];
  for (let band of bands) {
    let waveAmp = sin(frameCount * 0.008 + band.y) * 0.3 + 0.7;
    let bandA = 18 * auroraInt * waveAmp;
    // Curtain — horizontal sine wave strips
    for (let bx = 0; bx < width; bx += 4) {
      let yOff = sin(bx * 0.015 + frameCount * 0.006) * 8;
      fill(band.hue[0], band.hue[1], band.hue[2], bandA);
      rect(bx, band.y + yOff, 4, 3);
    }
  }
}
```

Performance note: the aurora loop runs ~200 iterations (width/4 ≈ 200 for typical canvas). This is fine. If FPS drops, the existing `_particleCap` throttle pattern could be replicated here — check `frameRate() < 30` and halve the step size.

---

## 5. Building Style Evolution — Era Palette System

### Purpose
The same building type looks materially different across eras. Village buildings are rough wood and thatch; city buildings are dressed stone; Atlantis buildings are marble and crystal. This is achieved through a palette function that modifies the fill colors inside `drawOneBuilding()`.

### getEraPalette()

Returns an object of named colors that building draw code references instead of hardcoded fills:

```js
function getEraPalette() {
  let era = getEra();
  if (era === 'village') return {
    wall:       [210, 185, 145],   // warm wood-tan
    wallDark:   [165, 138, 100],
    wallLight:  [225, 200, 158],
    roof:       [135, 95, 55],     // thatch brown
    roofDark:   [105, 70, 35],
    accent:     [180, 145, 90],
    floor:      [185, 175, 158],
    trim:       [145, 115, 80],
  };
  if (era === 'city') return {
    wall:       [205, 195, 178],   // warm grey stone
    wallDark:   [168, 158, 138],
    wallLight:  [220, 212, 195],
    roof:       [185, 90, 55],     // terracotta
    roofDark:   [155, 70, 40],
    accent:     [210, 130, 65],    // orange ochre
    floor:      [192, 182, 162],
    trim:       [195, 155, 95],
  };
  // atlantis
  return {
    wall:       [235, 232, 225],   // marble white
    wallDark:   [200, 195, 185],
    wallLight:  [248, 246, 240],
    roof:       [80, 210, 195],    // teal crystal
    roofDark:   [50, 170, 155],
    accent:     [220, 190, 80],    // gold
    floor:      [225, 220, 210],
    trim:       [90, 215, 200],    // teal trim
  };
}
```

### Integration with drawOneBuilding()

The current building draw code uses hardcoded fills everywhere. The integration strategy is surgical — do not refactor the entire function. Instead, apply palette substitution at the top of `drawOneBuilding()`:

```js
function drawOneBuilding(b) {
  let p = getEraPalette();
  // ... existing code, but fill(210, 195, 168) → fill(...p.wall)
  //                         fill(175, 145, 95)  → fill(...p.roof)
  //                         fill(185, 175, 158) → fill(...p.floor)
```

This is a find-and-replace-by-meaning operation, not mechanical. The key buildings to update for visible era effect are: `wall`, `house`, `granary`, `temple`, `market`, `forum`, `villa`, `watchtower`, `floor`. The minor prop buildings (torch, fence, lantern) do not need era-specific treatment.

Not all colors get palettized. Shadow fills, detail mortaring, and ground-level stone bases stay as-is — only the dominant face colors of the building body and roof change. This maintains legibility while shifting the feel.

### Era Transition Visual

When `state.islandLevel` crosses 9 or 18, `getEraPalette()` immediately returns the new era's values on the next frame. Buildings visually transform instantly. This is intentional — an abrupt shift as a reward signal for reaching the era threshold. If a gradual shift is preferred in future, the palette values could be lerped using a `state.eraTransitionT` timer (0 → 1 over 600 frames), but this is not needed for v1.

### Atlantis-Specific Building Details

For the Atlantis era, `drawOneBuilding()` should also add a crystal cap to certain building types (temple, watchtower, villa). This is additive code at the end of each building's switch case, gated by `getEra() === 'atlantis'`:

- Temple: add 4 crystal pillars (thin vertical rects in teal) flanking the entrance
- Watchtower: replace stone battlements with crystal spike (3px wide, 6px tall, teal) at top
- Villa: add gold trim linework (1px rects along roofline) and a teal crystal inlay on the door

These additions are each 5-8 lines of drawing code, placed inside existing switch cases.

---

## 6. System Interactions Map

Changes in this spec touch the following systems. Implementers should audit these connections:

| New System           | Touches                                                      |
|---------------------|--------------------------------------------------------------|
| `getEra()`          | Nothing reads it yet — it's the new root. Add reads everywhere else. |
| Era transitions     | `expandIsland()` — add branch checks; `Engine.emit('era_change')` |
| `getEraPalette()`   | `drawOneBuilding()` — 9 building types need fill substitutions |
| Atlantis rings      | `state` (new `atlantisRings` array), `initState()`, save/load, `drawIsland()` |
| Rings + bridges     | `state.buildings[]` — bridge objects pushed on ring init; `isOnIsland()` unchanged |
| Ambient citizens    | `Engine.getPool()`, `updateAmbientCitizens()` call in main update loop, `drawAmbientCitizens()` call in draw loop |
| Crystal veins       | `drawRomanRoad()` — era branch appended at end |
| Crystal particles   | `particles[]` array — reuses existing type, no new draw code |
| Water channel glow  | `drawAtlantisRings()` — night branch inside ring renderer |
| Temple beacon       | `drawNightLighting()` — era branch at end of function |
| Aurora              | `state.auroraBorealis` (already exists), `drawSky()` — new block after gradient |
| Save/load           | `state.atlantisRings` needs serialize/deserialize; `state.auroraBorealis` already in state |
| Sound               | `snd.updateLyre()` — new `'atlantis'` mode keyed off `getEra()` |
| Codex               | Era milestones could be codex entries (optional, out of scope here) |

---

## 7. Save/Load Considerations

New state fields introduced by this spec:

```js
// In initState():
state.atlantisRings = [];          // array of ring objects

// state.auroraBorealis already exists at line 791
```

In `saveGame()`, add:
```js
atlantisRings: state.atlantisRings,
```

In `loadGame()`, add with guard:
```js
state.atlantisRings = d.atlantisRings || [];
// Re-init rings if level >= 18 and rings array is empty (handles pre-spec saves):
if (state.islandLevel >= 18 && state.atlantisRings.length === 0) {
  initAtlantisRings();
}
```

Ambient citizen pool (`Engine.getPool('citizens', ...)`) is entirely transient — never serialized. Citizens respawn fresh on load. Correct behavior.

---

## 8. Performance Budget Summary

| System              | Worst-case cost                  | Mitigation                        |
|--------------------|----------------------------------|-----------------------------------|
| getEra() calls      | Negligible — 3 comparisons       | None needed                        |
| getEraPalette()     | Object allocation each drawOneBuilding call | Cache once per frame with a module-level var |
| Atlantis rings      | 2-4 `drawOrganicEllipse()` calls | Same as existing island layers     |
| Ring night glow     | ~6 circle() calls per ring       | Skipped when bright > 0.5          |
| Ambient citizens    | 30 sprites × ~12 draw calls      | Engine.isVisible() cull           |
| Crystal veins       | ~50 rect() calls along road      | Skipped when era != 'atlantis'    |
| Crystal particles   | ~10 extra particles in pool      | Existing _particleCap guards this  |
| Aurora              | ~200 rect() calls when active    | Halve step if frameRate < 30      |
| Temple beacon       | 8 rect() calls                   | Skipped when bright > 0.5         |

Total additional draw calls at Atlantis era, worst case night: ~600. The existing game already runs at 60fps with 2000+ draw calls. This is acceptable without optimization.

---

## 9. Implementation Order

Suggested sequencing to minimize merge conflicts and allow incremental testing:

1. **`getEra()` and `getEraPalette()`** — foundation, no visual change yet
2. **Building palette integration** — visual shift, testable via `/level 9` and `/level 18` debug commands
3. **Ambient citizens** — self-contained, testable at any level
4. **Atlantis rings** — visually impactful, drive to level 18 to verify
5. **Crystal veins** — small addition inside `drawRomanRoad()`
6. **Temple beacon** — small addition inside `drawNightLighting()`
7. **Aurora** — wire `state.auroraBorealis` to `drawSky()`
8. **Crystal particles on buildings** — last, least risky
9. **Save/load guards** — audit and add with every new state field

---

## 10. Open Design Questions

These require creative decisions before implementation:

1. **Era transition pacing**: Should the palette shift be instant or lerped over ~10 seconds? Instant feels more rewarding; lerped feels more cinematic. Current recommendation: instant on the expansion frame, with a one-time particle burst effect.

2. **Ring walkability**: Currently rings are decorative. Should bridges be passable (already true via existing bridge building logic) or should water channels block movement? Blocking movement adds puzzle/routing interest but requires `isOnIsland()` changes — out of scope for this spec.

3. **Citizen interaction**: Right now citizens are purely passive. Could be extended: hovering over one shows a flavor tooltip ("Gaius the miller" etc.). Low implementation cost, high atmosphere value. Defer to a separate spec.

4. **Fourth citizen variant count**: 4 variants (farmer/merchant/soldier/priest) is a starting set. More variety could come from combining variant with era — a village farmer looks different from an Atlantis farmer (crystal staff). Could be driven by `getEra()` inside the draw switch.

5. **Aurora in city era**: `state.auroraBorealis` could be non-zero at city era during certain narrative events (oracle prophecy, god blessing). This spec leaves that hook open — the aurora system is designed to accept any 0-1 intensity value from any source.

# Sprint: City Layout Complete Rewrite

**Goal**: Delete all building placement logic from `expandIsland()` and `spawnCluster()`. Replace with a single, clean, block-based placement system. The city must look organized at every level from 1 to 25.

**Single agent, sequential work on sketch.js only.**

---

## Context You Need Before Writing Any Code

```javascript
// Island constants
cx = WORLD.islandCX = 600
cy = WORLD.islandCY = 400

// rx and ry in all placement code below means:
let rx = getSurfaceRX()   // state.islandRX * 0.90
let ry = getSurfaceRY()   // state.islandRY * 0.36

// At key levels:
// Lv 1:  rx≈450, ry≈115
// Lv 5:  rx≈666, ry≈173
// Lv 8:  rx≈788, ry≈205
// Lv 10: rx≈869, ry≈227
// Lv 15: rx≈1026,ry≈266
// Lv 20: rx≈1139,ry≈295
// Lv 25: rx≈1220,ry≈317

// Farm center (fixed pre-srx positions, not relative):
// farmCX = WORLD.islandCX - 220 = 380
// farmCY = WORLD.islandCY - 5   = 395

// BLUEPRINTS sizes (w x h):
// house: 44x34    market: 44x34    granary: 58x44
// temple: 70x50   forum: 80x60     library: 58x44
// bath: 58x44     castrum: 64x50   arena: 68x54
// villa: 72x52    arch: 48x52      watchtower: 20x44
// shrine: 32x28   well: 24x24      aqueduct: 20x40
// torch: 8x16     lantern: 10x20   flower: 20x16
// mosaic: 32x32   floor: 32x32     bridge: 32x32
// fence: 32x8     wall: 32x8
```

---

## Step 1: Delete the following code (do NOT delete anything else)

### 1A. Inside `expandIsland()` — delete ALL building placement

Find `expandIsland()` at line ~17125. Keep the following lines untouched:
- The cost check / `canAffordExpand()` block
- `state.crystals -= cost.crystals` and the other resource deductions
- `state.islandLevel++`
- `showAchievement()` and `addNotification()` calls
- The `rxGrowth`/`ryGrowth`/`state.islandRX`/`state.islandRY` block
- `state.pyramid.level = state.islandLevel`
- `updatePortPositions()`
- The `state.islandLevel >= 25` guard at the top
- The journal unlocks: `unlockJournal('imperial_governor')` at lvl 10, `unlockJournal('imperial_senator')` at lvl 15, `unlockJournal('imperial_consul')` at lvl 20, `unlockJournal('imperator')` at lvl 25
- The `state.imperatorBanner = 300` and `checkImperatorVictory()` calls at lvl 25
- The particle burst loop at lvl 25 (the `for (let i = 0; i < 40; i++)` loop)
- The `triggerScreenShake()` calls
- The tree-pushing blocks (temple exclusion, port zone, buildings)
- The center-zone tree filter
- The grass tufts block at the bottom
- The ambient citizens block at the bottom
- The castrum legia state assignment: `state.legia.castrumLevel`, `state.legia.castrumX`, `state.legia.castrumY`, `unlockJournal('legia_founded')`

**DELETE** everything else in `expandIsland()` that places buildings, calls `spawnCluster()`, calls `state.buildings.push()`, calls `addFarmPlots()`, calls `addClampedResource()`, calls `addClampedTree()`, calls `state.crystalNodes.push()`, calls `state.ruins.push()`, or contains the procedural `lvl >= 6 && lvl <= 25` expansion block.

Specifically: delete the entire `if (state.islandLevel === 5)` block, the `if (state.islandLevel === 10)` block (but keep the `unlockJournal` line), the `if (state.islandLevel === 15)` block (keep `unlockJournal`), the `if (state.islandLevel === 20)` block (keep `unlockJournal`), the `if (state.islandLevel === 25)` block (keep `unlockJournal`, `imperatorBanner`, `checkImperatorVictory`, and the particle burst).

Delete the entire `let farmCX = ...` declaration and the `let lvl = state.islandLevel` line and everything in the `if (lvl === 2)` through `if (lvl === 24)` chain.

Delete the procedural `if (lvl >= 6 && lvl <= 25)` block entirely (resources, crystals, trees, ruins loop).

### 1B. Delete the entire `spawnCluster()` function

Find `function spawnCluster(type, anchorX, anchorY)` at line ~17012. Delete the entire function body and declaration. It will be replaced by the new system.

### 1C. Delete `placeBuildingChecked()` — do NOT delete it

Keep `placeBuildingChecked()`. It is still used by the new system.

---

## Step 2: Write the replacement — `function placeEraBuildings(lvl)`

Insert this new function immediately before `expandIsland()`. This function is called once per level-up, receives the new level number, and places exactly the right buildings for that level.

```javascript
function placeEraBuildings(lvl) {
  let rx = getSurfaceRX();
  let ry = getSurfaceRY();
  let cx = WORLD.islandCX;
  let cy = WORLD.islandCY;

  // Helper: place a building using overlap check, with small jitter fallback
  function pb(x, y, w, h, type) {
    placeBuildingChecked({ x: x, y: y, w: w, h: h, type: type, rot: 0 });
  }

  // Helper: place a row of N identical buildings spaced evenly along X
  function pbRow(startX, y, spacingX, count, w, h, type) {
    for (let i = 0; i < count; i++) {
      pb(startX + i * spacingX, y, w, h, type);
    }
  }

  // Helper: resource placement (clamped to island surface)
  function res(x, y, type) {
    addClampedResource(x, y, type, cx, cy);
  }

  // Helper: tree placement (clamped)
  function tree(x, y) {
    addClampedTree(x, y, cx, cy);
  }

  // Helper: crystal node
  function crystal(dx, dy, size, charge) {
    let sh = state.crystalShrine;
    state.crystalNodes.push({
      x: sh.x + dx, y: sh.y + dy,
      size: size, phase: random(TWO_PI),
      charge: charge, respawnTimer: 0,
    });
  }

  // Helper: ruin
  function ruin(x, y, w, h) {
    state.ruins.push({ x: x, y: y, w: w, h: h, rot: random(-0.05, 0.05) });
  }

  // ─────────────────────────────────────────────────────────────────
  // ERA 1: VILLAGE  (Lv 2-8)
  // No grid. Organic. Farms, fences, first structures.
  // ─────────────────────────────────────────────────────────────────

  if (lvl === 2) {
    // Farm perimeter fences (east side of farm plot)
    let farmCX = WORLD.islandCX - 220, farmCY = WORLD.islandCY - 5;
    pb(farmCX + 60, farmCY - 30, 32, 8, 'fence');
    pb(farmCX + 60, farmCY + 10, 32, 8, 'fence');
    // Town center brazier (campfire area)
    pb(cx + rx * 0.05, cy + ry * 0.05, 8, 16, 'torch');
    // Resources: south quarter
    res(cx - 120, cy + 70, 'stone');
    res(cx - 60,  cy + 75, 'stone');
    res(cx + 30,  cy + 70, 'vine');
    res(cx + 100, cy + 65, 'leaf');
    // Crystal
    crystal(50, 30, 14, 50);
    // Grove east expansion
    tree(cx + 180, cy + 40);
    tree(cx + 230, cy + 30);
    tree(cx + 300, cy - 10);
    // Farm plots
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.3, 'Farm fenced — the homestead grows!', '#88cc66');
    spawnParticles(farmCX + 60, farmCY - 10, 'build', 8);
  }

  if (lvl === 3) {
    let farmCX = WORLD.islandCX - 220, farmCY = WORLD.islandCY - 5;
    // Shrine plaza on Via Sacra approach (east, toward temple hill)
    // Three floor tiles in a row, then shrine behind them
    pb(cx + rx * 0.35 - 20, cy - ry * 0.3, 24, 20, 'floor');
    pb(cx + rx * 0.35,      cy - ry * 0.3, 24, 20, 'floor');
    pb(cx + rx * 0.35 + 20, cy - ry * 0.3, 24, 20, 'floor');
    pb(cx + rx * 0.4,       cy - ry * 0.35, 32, 28, 'shrine');
    // Resources: NE quarter
    res(cx + 200, cy - 70, 'vine');
    res(cx + 250, cy - 45, 'stone');
    res(cx + 160, cy - 80, 'vine');
    res(cx + 300, cy - 30, 'leaf');
    // Crystal
    crystal(-50, 30, 14, 50);
    // Trees NE grove
    tree(cx + 280, cy - 55);
    tree(cx + 320, cy - 25);
    tree(cx + 150, cy - 60);
    // Ruin on NE edge
    ruin(cx + 260, cy - 70, 30, 20);
    // Farm plots
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.3, 'Shrine consecrated — the gods watch!', '#ffaaff');
    spawnParticles(cx + rx * 0.4, cy - ry * 0.35, 'build', 10);
  }

  if (lvl === 4) {
    let farmCX = WORLD.islandCX - 220, farmCY = WORLD.islandCY - 5;
    // Well at town center (civic water access)
    pb(cx + rx * 0.1, cy + ry * 0.3, 24, 24, 'well');
    // Farm entrance fences NW
    pb(cx - rx * 0.35, cy - ry * 0.1,  32, 8, 'fence');
    pb(cx - rx * 0.35, cy + ry * 0.05, 32, 8, 'fence');
    // Resources: NW quarter
    res(cx - 250, cy - 50, 'vine');
    res(cx - 300, cy - 20, 'leaf');
    res(cx - 200, cy - 70, 'stone');
    res(cx - 340, cy + 10, 'leaf');
    // Crystal
    crystal(0, -45, 16, 60);
    // Trees east expansion
    tree(cx + 250, cy - 40);
    tree(cx + 200, cy + 50);
    tree(cx + 340, cy + 15);
    // Farm plots
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.3, 'Well dug — farm entrance fenced!', '#66aaff');
    spawnParticles(cx + rx * 0.1, cy + ry * 0.3, 'build', 8);
  }

  if (lvl === 5) {
    let farmCX = WORLD.islandCX - 220, farmCY = WORLD.islandCY - 5;
    // GRANARY: north of farm on Via Granaria
    pb(farmCX, farmCY - ry * 0.7, 58, 44, 'granary');
    pb(farmCX - 28, farmCY - ry * 0.7 + 14, 8, 16, 'torch');
    pb(farmCX + 28, farmCY - ry * 0.7 + 14, 8, 16, 'torch');
    // Second well near market/east approach
    pb(cx + rx * 0.35, cy + ry * 0.55, 24, 24, 'well');
    pb(cx + rx * 0.35 + 16, cy + ry * 0.55, 8, 16, 'torch');
    // Via Granaria paving (farm road leading north to granary)
    pb(cx - rx * 0.1, cy - ry * 0.3,  24, 20, 'floor');
    pb(cx - rx * 0.1, cy - ry * 0.15, 24, 20, 'floor');
    pb(cx - rx * 0.1, cy,             24, 20, 'floor');
    // Resources: grand perimeter ring
    res(cx - 350, cy + 30, 'stone');
    res(cx + 350, cy + 30, 'stone');
    res(cx - 150, cy + 90, 'vine');
    res(cx + 150, cy + 90, 'leaf');
    res(cx,       cy + 85, 'stone');
    // Crystals: two large flanking shrine
    crystal(-60, -10, 18, 80);
    crystal( 60, -10, 18, 80);
    // Trees: grand perimeter
    tree(cx + 360, cy);
    tree(cx + 300, cy + 50);
    tree(cx + 180, cy - 70);
    tree(cx + 240, cy + 60);
    tree(cx + 350, cy - 40);
    // Ruin south
    ruin(cx, cy + 80, 35, 22);
    // Farm plots
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.25, 'Granary & Well constructed!', '#88cc66');
    spawnParticles(farmCX, farmCY - ry * 0.3, 'build', 12);
  }

  if (lvl === 6) {
    let farmCX = WORLD.islandCX - 220, farmCY = WORLD.islandCY - 5;
    // RESIDENTIAL NW BLOCK — first two domus, side by side
    // Anchored to a fixed street address relative to current rx/ry
    let houseStreetY = cy - ry * 0.2;
    let houseStartX  = cx - rx * 0.25;
    pb(houseStartX,      houseStreetY, 44, 34, 'house');
    pb(houseStartX + 50, houseStreetY, 44, 34, 'house');
    // Torch between them on shared courtyard
    pb(houseStartX + 25, houseStreetY + 18, 8, 16, 'torch');
    // Shared garden in front
    pb(houseStartX + 22, houseStreetY - 14, 20, 16, 'flower');
    // Procedural: resources ring, crystal (even level), trees
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.3, 'Citizens settle — first Domus built!', '#aaddff');
    spawnParticles(houseStartX + 25, houseStreetY, 'build', 10);
  }

  if (lvl === 7) {
    let farmCX = WORLD.islandCX - 220, farmCY = WORLD.islandCY - 5;
    // MARKET BLOCK — east of center on Via Principalis
    // Market stall + two arcae flanking + floor paving + lantern post
    let mktX = cx + rx * 0.5;
    let mktY = cy - 8; // ON the Decumanus centerline
    pb(mktX,       mktY,      44, 34, 'market');
    pb(mktX - 30,  mktY + 24, 24, 20, 'chest');
    pb(mktX + 30,  mktY + 24, 24, 20, 'chest');
    pb(mktX,       mktY + 36, 32, 32, 'floor');
    pb(mktX - 26,  mktY - 8,  8, 16, 'torch');
    pb(mktX + 26,  mktY - 8,  8, 16, 'torch');
    // Procedural
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.3, 'Market opens for trade!', '#ffcc66');
    spawnParticles(mktX, mktY, 'build', 10);
  }

  if (lvl === 8) {
    let farmCX = WORLD.islandCX - 220, farmCY = WORLD.islandCY - 5;
    // BATH HOUSE — SW civic district
    let bathX = cx - rx * 0.3;
    let bathY = cy + ry * 0.35;
    pb(bathX, bathY, 58, 44, 'bath');
    pb(bathX - 36, bathY,      20, 16, 'flower');
    pb(bathX + 36, bathY,      20, 16, 'flower');
    pb(bathX,      bathY + 28, 32, 32, 'floor');
    pb(bathX - 32, bathY + 24, 10, 20, 'lantern');

    // CASTRUM — SE military compound (walled)
    let castX = cx + rx * 0.45;
    let castY = cy + ry * 0.5;
    pb(castX,      castY,       64, 50, 'castrum');
    pb(castX - 40, castY,       8,  50, 'wall');
    pb(castX + 40, castY,       8,  50, 'wall');
    pb(castX,      castY - 30,  80, 8,  'wall');
    pb(castX + 44, castY - 28, 20, 44, 'watchtower');
    pb(castX - 18, castY + 28,  8, 16, 'torch');
    pb(castX + 18, castY + 28,  8, 16, 'torch');

    // Via Militaris — paved approach road from center to castrum
    pb(cx + rx * 0.35, cy + ry * 0.2,  24, 20, 'floor');
    pb(cx + rx * 0.35, cy + ry * 0.3,  24, 20, 'floor');
    pb(cx + rx * 0.35, cy + ry * 0.4,  24, 20, 'floor');

    // South road from port toward center (5 tiles)
    let _port = getPortPosition();
    for (let i = 0; i < 5; i++) {
      let t = (i + 1) / 6;
      pb(lerp(_port.x, cx, t), lerp(_port.y, cy + 10, t), 24, 20, 'floor');
    }

    // Update legia state
    if (state.legia) {
      state.legia.castrumLevel = 1;
      state.legia.castrumX = castX;
      state.legia.castrumY = castY;
    }
    unlockJournal('legia_founded');

    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.3, 'Baths & Castrum — Rome grows strong!', '#cc4444');
    spawnParticles(castX, castY, 'build', 12);
  }

  // ─────────────────────────────────────────────────────────────────
  // ERA 2: CITY  (Lv 9-17)
  // Grid takes shape. Cardo crosses Decumanus.
  // ─────────────────────────────────────────────────────────────────

  if (lvl === 9) {
    let farmCX = WORLD.islandCX - 220, farmCY = WORLD.islandCY - 5;
    // AQUEDUCT ROW — spans north of island on east-west axis
    pb(cx - rx * 0.1, cy - ry * 0.55, 20, 40, 'aqueduct');
    pb(cx + rx * 0.1, cy - ry * 0.55, 20, 40, 'aqueduct');
    pb(cx + rx * 0.3, cy - ry * 0.55, 20, 40, 'aqueduct');
    // Bridge — residential NW to civic NE
    pb(cx, cy - ry * 0.3, 32, 32, 'bridge');
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.3, 'Aqueduct spans the island!', '#66ccff');
    spawnParticles(cx, cy - ry * 0.55, 'build', 12);
  }

  if (lvl === 10) {
    let farmCX = WORLD.islandCX - 220, farmCY = WORLD.islandCY - 5;
    unlockJournal('imperial_governor');
    // TEMPLE PRECINCT — civic NE, on Via Sacra
    let tempX = cx + rx * 0.5;
    let tempY = cy - ry * 0.35;
    pb(tempX, tempY, 70, 50, 'temple');
    // Processional floor grid in front of temple (3 cols x 2 rows)
    for (let row = 0; row < 2; row++) {
      for (let col = -1; col <= 1; col++) {
        pb(tempX + col * 28, tempY + 35 + row * 24, 26, 22, 'floor');
      }
    }
    // Flanking torches
    pb(tempX - 40, tempY + 10, 8, 16, 'torch');
    pb(tempX + 40, tempY + 10, 8, 16, 'torch');
    // Flower beds
    pb(tempX - 42, tempY - 10, 20, 16, 'flower');
    pb(tempX + 42, tempY - 10, 20, 16, 'flower');

    // SECOND MARKET — near port on eastern shore
    let port = getPortPosition();
    pb(port.x + 80, port.y - 30, 44, 34, 'market');

    // TOWN CENTER PLAZA — six floor tiles at crossing
    for (let r = 0; r < 2; r++) {
      for (let c = -1; c <= 1; c++) {
        pb(cx + c * 20, cy + 10 + r * 24, 26, 22, 'floor');
      }
    }
    // Civic district entry lanterns
    pb(cx + rx * 0.3, cy - ry * 0.15, 10, 20, 'lantern');
    pb(cx + rx * 0.3, cy + ry * 0.05, 10, 20, 'lantern');
    // East road paving tiles
    pb(cx + rx * 0.4, cy - ry * 0.1, 32, 32, 'floor');
    pb(cx + rx * 0.4, cy,            32, 32, 'floor');

    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.25, 'GOVERNOR — Temple & Market erected!', '#ffdd66');
    triggerScreenShake(6, 15);
    spawnParticles(tempX, tempY, 'build', 15);
  }

  if (lvl === 11) {
    let farmCX = WORLD.islandCX - 220, farmCY = WORLD.islandCY - 5;
    // TEMPLE GARDENS — flower beds and mosaic lining Via Sacra
    pb(cx + rx * 0.45, cy - ry * 0.15, 20, 16, 'flower');
    pb(cx + rx * 0.55, cy - ry * 0.15, 20, 16, 'flower');
    pb(cx + rx * 0.65, cy - ry * 0.15, 20, 16, 'flower');
    pb(cx + rx * 0.55, cy - ry * 0.55, 28, 20, 'mosaic');
    pb(cx + rx * 0.5,  cy - ry * 0.25, 10, 20, 'lantern');
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.3, 'Gardens and mosaics adorn the temple!', '#ffaaff');
    spawnParticles(cx + rx * 0.55, cy - ry * 0.15, 'build', 10);
  }

  if (lvl === 12) {
    let farmCX = WORLD.islandCX - 220, farmCY = WORLD.islandCY - 5;
    // RESIDENTIAL BLOCK 2 — two more domus north of first pair on Cardo
    let houseStreetY2 = cy - ry * 0.35;
    let houseStartX2  = cx - rx * 0.25;
    pb(houseStartX2,      houseStreetY2, 44, 34, 'house');
    pb(houseStartX2 + 50, houseStreetY2, 44, 34, 'house');
    pb(houseStartX2 + 25, houseStreetY2 + 18, 8, 16, 'torch');
    // Also a second pair on interior Cardo
    pb(cx - rx * 0.15, cy - ry * 0.15, 44, 34, 'house');
    pb(cx - rx * 0.15, cy - ry * 0.35, 44, 34, 'house');
    // Second well SW
    pb(cx - rx * 0.2, cy + ry * 0.4, 24, 24, 'well');
    // Via Principalis lanterns (3 posts along east road)
    pb(cx + rx * 0.15, cy, 10, 20, 'lantern');
    pb(cx + rx * 0.3,  cy, 10, 20, 'lantern');
    pb(cx + rx * 0.45, cy, 10, 20, 'lantern');
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.3, 'Housing fills the Cardo — second well dug!', '#ffee88');
    spawnParticles(houseStartX2, houseStreetY2, 'build', 10);
  }

  if (lvl === 13) {
    let farmCX = WORLD.islandCX - 220, farmCY = WORLD.islandCY - 5;
    // WATCHTOWER — east edge sentinel
    pb(cx + rx * 0.7, cy, 20, 44, 'watchtower');
    // WALLS — military perimeter near castrum
    pb(cx + rx * 0.25, cy + ry * 0.35, 32, 8, 'wall');
    pb(cx + rx * 0.45, cy + ry * 0.35, 32, 8, 'wall');
    // WATCHTOWER — farm-facing southern tower
    pb(cx - rx * 0.1, cy + ry * 0.35, 20, 44, 'watchtower');
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.3, 'Watchtowers stand sentinel!', '#cc8844');
    spawnParticles(cx + rx * 0.7, cy, 'build', 10);
  }

  if (lvl === 14) {
    let farmCX = WORLD.islandCX - 220, farmCY = WORLD.islandCY - 5;
    // EXTENDED AQUEDUCT — westward extension
    pb(cx - rx * 0.3, cy - ry * 0.55, 20, 40, 'aqueduct');
    pb(cx - rx * 0.5, cy - ry * 0.55, 20, 40, 'aqueduct');
    // SECOND BATH HOUSE — NE civic, serves east district
    let bath2X = cx + rx * 0.25;
    let bath2Y = cy - ry * 0.2;
    pb(bath2X,       bath2Y,      58, 44, 'bath');
    pb(bath2X - 36,  bath2Y,      20, 16, 'flower');
    pb(bath2X + 36,  bath2Y,      20, 16, 'flower');
    pb(bath2X,       bath2Y + 28, 32, 32, 'floor');
    pb(bath2X - 32,  bath2Y + 24, 10, 20, 'lantern');
    // Bridge connecting market to residential
    pb(cx + rx * 0.1, cy + ry * 0.1, 32, 32, 'bridge');
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.3, 'Bath complex rises, aqueduct extended!', '#66ccff');
    spawnParticles(bath2X, bath2Y, 'build', 10);
  }

  if (lvl === 15) {
    let farmCX = WORLD.islandCX - 220, farmCY = WORLD.islandCY - 5;
    unlockJournal('imperial_senator');
    // FORUM — at Decumanus/Cardo intersection (city heart)
    let forumX = cx + rx * 0.05;
    let forumY = cy + ry * 0.08;
    pb(forumX, forumY, 80, 60, 'forum');
    // Floor tiles surrounding forum (3x3 minus center)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        pb(forumX + dx * 50, forumY + dy * 35, 32, 32, 'floor');
      }
    }
    // Corner lanterns marking forum square
    pb(forumX - 50, forumY - 38, 10, 20, 'lantern');
    pb(forumX + 50, forumY - 38, 10, 20, 'lantern');
    pb(forumX - 50, forumY + 38, 10, 20, 'lantern');
    pb(forumX + 50, forumY + 38, 10, 20, 'lantern');
    // Mosaic processional south of forum
    pb(forumX - 28, forumY + 44, 32, 32, 'mosaic');
    pb(forumX,      forumY + 44, 32, 32, 'mosaic');
    pb(forumX + 28, forumY + 44, 32, 32, 'mosaic');
    // TRIUMPHAL ARCH — east road landmark
    pb(cx + rx * 0.65, cy, 48, 52, 'arch');
    // WATCHTOWER — far east edge
    pb(cx + rx * 0.8, cy - ry * 0.1, 20, 44, 'watchtower');
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.25, 'SENATOR — Forum raised!', '#ff9944');
    triggerScreenShake(8, 20);
    spawnParticles(forumX, forumY, 'build', 15);
  }

  if (lvl === 16) {
    let farmCX = WORLD.islandCX - 220, farmCY = WORLD.islandCY - 5;
    // HOUSING ROW — NW residential street, 4 domus in a line
    let streetX = cx - rx * 0.3;
    let streetY1 = cy - ry * 0.35;
    let streetY2 = cy - ry * 0.5;
    // First row — 4 houses
    for (let i = 0; i < 4; i++) {
      pb(streetX + i * 50, streetY1, 44, 34, 'house');
      if (i < 3) pb(streetX + i * 50 + 25, streetY1 + 18, 8, 16, 'torch');
    }
    // Fence along back of street (north side)
    pb(streetX + 75, streetY1 - 22, 180, 6, 'fence');
    // Second row behind first (deeper NW)
    pb(streetX,       streetY2, 44, 34, 'house');
    pb(streetX + 50,  streetY2, 44, 34, 'house');
    pb(streetX + 100, streetY2, 44, 34, 'house');
    pb(streetX + 25,  streetY2 + 18, 8, 16, 'torch');
    pb(streetX + 75,  streetY2 + 18, 8, 16, 'torch');
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.3, 'Housing district expands!', '#aaddff');
    spawnParticles(streetX + 75, streetY1, 'build', 12);
  }

  if (lvl === 17) {
    let farmCX = WORLD.islandCX - 220, farmCY = WORLD.islandCY - 5;
    // GREAT LIBRARY — NE civic quarter corner
    let libX = cx + rx * 0.35;
    let libY = cy - ry * 0.35;
    pb(libX, libY, 58, 44, 'library');
    // Mosaic forecourt
    pb(libX, libY + 30, 32, 32, 'mosaic');
    // Lanterns flanking entrance
    pb(libX - 34, libY + 10, 10, 20, 'lantern');
    pb(libX + 34, libY + 10, 10, 20, 'lantern');
    // Floor tiles approach
    pb(libX - 20, libY + 48, 32, 32, 'floor');
    pb(libX + 20, libY + 48, 32, 32, 'floor');
    // Shrine in library courtyard
    pb(libX + 36, libY - 14, 32, 28, 'shrine');
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.3, 'Great Library of Rome rises!', '#ddaaff');
    spawnParticles(libX, libY, 'build', 14);
  }

  // ─────────────────────────────────────────────────────────────────
  // ERA 3: ATLANTIS  (Lv 18-25)
  // Monuments. Dense. The whole island is covered.
  // ─────────────────────────────────────────────────────────────────

  if (lvl === 18) {
    let farmCX = WORLD.islandCX - 220, farmCY = WORLD.islandCY - 5;
    // ARENA — SE military district, massive landmark
    let arenaX = cx + rx * 0.35;
    let arenaY = cy + ry * 0.35;
    pb(arenaX, arenaY, 68, 54, 'arena');
    pb(arenaX - 40, arenaY + 30, 8, 16, 'torch');
    pb(arenaX + 40, arenaY + 30, 8, 16, 'torch');
    pb(arenaX,      arenaY + 34, 32, 32, 'floor');
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.3, 'Arena rises — glory awaits!', '#ff8844');
    spawnParticles(arenaX, arenaY, 'build', 14);
  }

  if (lvl === 19) {
    let farmCX = WORLD.islandCX - 220, farmCY = WORLD.islandCY - 5;
    let arenaX = cx + rx * 0.35;
    let arenaY = cy + ry * 0.35;
    // ARENA FORECOURT — mosaics and lanterns completing the arena complex
    pb(arenaX - 20, arenaY + 52, 28, 20, 'mosaic');
    pb(arenaX + 20, arenaY + 52, 28, 20, 'mosaic');
    pb(arenaX - 50, arenaY + 30, 10, 20, 'lantern');
    pb(arenaX + 50, arenaY + 30, 10, 20, 'lantern');
    // Fill military perimeter: extra wall, domus near castrum approach
    pb(cx + rx * 0.3, cy + ry * 0.15, 44, 34, 'house');
    pb(cx + rx * 0.15, cy + ry * 0.25, 44, 34, 'house');
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.3, 'Arena complete — let the games begin!', '#ff6622');
    spawnParticles(arenaX, arenaY + 30, 'build', 16);
  }

  if (lvl === 20) {
    let farmCX = WORLD.islandCX - 220, farmCY = WORLD.islandCY - 5;
    unlockJournal('imperial_consul');
    // VILLA — NW north prominence, premium residential
    let villaX = cx - rx * 0.3;
    let villaY = cy - ry * 0.55;
    pb(villaX, villaY, 72, 52, 'villa');
    pb(villaX - 42, villaY + 10, 20, 16, 'flower');
    pb(villaX + 42, villaY + 10, 20, 16, 'flower');
    pb(villaX - 42, villaY - 10, 20, 16, 'flower');
    pb(villaX + 42, villaY - 10, 20, 16, 'flower');
    pb(villaX,      villaY + 32, 32, 32, 'mosaic');
    pb(villaX + 40, villaY + 28, 10, 20, 'lantern');
    // ARCH — port gate triumphal
    let port = getPortPosition();
    pb(port.x + 120, port.y - 15, 48, 52, 'arch');
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.25, 'CONSUL — Villa Estate built!', '#ffaa00');
    triggerScreenShake(12, 30);
    spawnParticles(villaX, villaY, 'build', 20);
  }

  if (lvl === 21) {
    let farmCX = WORLD.islandCX - 220, farmCY = WORLD.islandCY - 5;
    // SENATE FORUM — second forum west of main forum
    let senX = cx - rx * 0.15;
    let senY = cy + ry * 0.15;
    pb(senX, senY, 64, 48, 'forum');
    pb(senX - 40, senY + 20, 8, 16, 'torch');
    pb(senX + 72, senY + 20, 8, 16, 'torch');
    pb(senX - 20, senY + 32, 24, 20, 'floor');
    pb(senX,      senY + 32, 24, 20, 'floor');
    pb(senX + 20, senY + 32, 24, 20, 'floor');
    pb(senX + 40, senY + 32, 24, 20, 'floor');
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.3, 'Senate convenes — Forum Magnum!', '#ffaa44');
    spawnParticles(senX, senY, 'build', 14);
  }

  if (lvl === 22) {
    let farmCX = WORLD.islandCX - 220, farmCY = WORLD.islandCY - 5;
    // HARBOR ARCH GATE — far east road terminus
    pb(cx + rx * 0.72, cy + ry * 0.1, 48, 52, 'arch');
    // Harbor road lanterns
    pb(cx + rx * 0.4, cy + ry * 0.1, 10, 20, 'lantern');
    pb(cx + rx * 0.5, cy + ry * 0.1, 10, 20, 'lantern');
    pb(cx + rx * 0.6, cy + ry * 0.1, 10, 20, 'lantern');
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.3, 'Harbor gate — the arch stands!', '#ddcc88');
    spawnParticles(cx + rx * 0.72, cy + ry * 0.1, 'build', 12);
  }

  if (lvl === 23) {
    let farmCX = WORLD.islandCX - 220, farmCY = WORLD.islandCY - 5;
    // GRAND AQUEDUCT — five segments spanning full island width
    pb(cx - rx * 0.5,  cy - ry * 0.6, 20, 40, 'aqueduct');
    pb(cx - rx * 0.25, cy - ry * 0.6, 20, 40, 'aqueduct');
    pb(cx,             cy - ry * 0.6, 20, 40, 'aqueduct');
    pb(cx + rx * 0.25, cy - ry * 0.6, 20, 40, 'aqueduct');
    pb(cx + rx * 0.5,  cy - ry * 0.6, 20, 40, 'aqueduct');
    // Grand bridges under aqueduct (pilgrimage route)
    pb(cx - rx * 0.35, cy - ry * 0.45, 32, 32, 'bridge');
    pb(cx + rx * 0.15, cy - ry * 0.45, 32, 32, 'bridge');
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.3, 'Grand Aqueduct spans all of Mare Nostrum!', '#66ccff');
    spawnParticles(cx, cy - ry * 0.6, 'build', 16);
  }

  if (lvl === 24) {
    let farmCX = WORLD.islandCX - 220, farmCY = WORLD.islandCY - 5;
    // IMPERIAL PALACE — sacred hill, between aqueduct and pyramid
    let palX = cx, palY = cy - ry * 0.5;
    pb(palX,      palY,       60, 44, 'villa');
    pb(palX - 38, palY + 52,  28, 20, 'mosaic');
    pb(palX + 18, palY + 52,  28, 20, 'mosaic');
    pb(palX - 44, palY + 20,  20, 16, 'flower');
    pb(palX + 44, palY + 20,  20, 16, 'flower');
    pb(palX - 44, palY + 40,  20, 16, 'flower');
    pb(palX + 44, palY + 40,  20, 16, 'flower');
    pb(palX - 20, palY + 60,  10, 20, 'lantern');
    pb(palX + 20, palY + 60,  10, 20, 'lantern');
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.3, 'Imperial Palace rises — glory of Rome!', '#ffcc44');
    spawnParticles(palX, palY, 'build', 18);
  }

  // Lvl 25 is handled in expandIsland() directly (imperator banner, particle burst, etc.)
  // Only add buildings here not in that block:
  if (lvl === 25) {
    // GRAND TEMPLE — island peak, final monument
    pb(cx, cy - ry * 0.7, 56, 40, 'temple');
    pb(cx - 60, cy - ry * 0.7 + 20, 20, 16, 'flower');
    pb(cx + 60, cy - ry * 0.7 + 20, 20, 16, 'flower');
    // TRIUMPHAL ARCH — south
    pb(cx + rx * 0.4, cy + ry * 0.3, 48, 52, 'arch');
    // VILLA — SW counterpoint
    pb(cx - rx * 0.4, cy + ry * 0.3, 60, 44, 'villa');
    // MOSAIC PROCESSIONAL — grand approach to pyramid
    pb(cx - 30, cy - ry * 0.1, 28, 20, 'mosaic');
    pb(cx,      cy - ry * 0.1, 28, 20, 'mosaic');
    pb(cx + 30, cy - ry * 0.1, 28, 20, 'mosaic');
    pb(cx - 50, cy - ry * 0.1, 10, 20, 'lantern');
    pb(cx + 50, cy - ry * 0.1, 10, 20, 'lantern');
    addFloatingText(width / 2, height * 0.25, 'IMPERATOR — Mare Nostrum is yours!', '#ff4400');
    triggerScreenShake(15, 40);
  }
}
```

---

## Step 3: Write the procedural perimeter helper `_addProceduralPerimeter(lvl, cx, cy, rx, ry)`

Insert this function immediately before `placeEraBuildings`. It handles resources, trees, crystals, ruins — the natural world growing alongside the city. This is exactly what the old `lvl >= 6 && lvl <= 25` procedural block did but extracted cleanly.

```javascript
function _addProceduralPerimeter(lvl, cx, cy, rx, ry) {
  let angle0 = ((lvl - 6) / 20) * TWO_PI;

  // Resources (3 to 6 per level)
  let numRes = 3 + floor(lvl / 5);
  for (let i = 0; i < numRes; i++) {
    let a = angle0 + (i / numRes) * TWO_PI * 0.3 + random(-0.2, 0.2);
    let r = random(0.55, 0.85);
    let px = cx + cos(a) * state.islandRX * r * 0.9;
    let py = cy + sin(a) * state.islandRY * r * 0.9;
    addClampedResource(px, py, ['stone', 'vine', 'leaf'][i % 3], cx, cy);
  }

  // Crystal node on even levels
  if (lvl % 2 === 0) {
    let ca = angle0 + PI;
    let crx = cx + cos(ca) * state.islandRX * 0.5;
    let cry = cy + sin(ca) * state.islandRY * 0.4;
    let cSize = min(14 + floor(lvl / 5) * 2, 24);
    state.crystalNodes.push({
      x: crx, y: cry,
      size: cSize, phase: random(TWO_PI),
      charge: 50 + lvl * 5, respawnTimer: 0,
    });
  }

  // Trees (1 to 4 per level)
  let numTrees = 1 + floor(lvl / 6);
  for (let i = 0; i < numTrees; i++) {
    let ta = random(TWO_PI);
    let tr = random(0.4, 0.85);
    addClampedTree(
      cx + cos(ta) * state.islandRX * tr * 0.9,
      cy + sin(ta) * state.islandRY * tr * 0.9,
      cx, cy
    );
  }

  // Ruin on every 3rd level
  if (lvl % 3 === 0) {
    let ra = angle0 + HALF_PI;
    let rrx = cx + cos(ra) * state.islandRX * 0.6;
    let rry = cy + sin(ra) * state.islandRY * 0.5;
    state.ruins.push({
      x: rrx, y: rry,
      w: 28 + floor(lvl / 3) * 3,
      h: 18 + floor(lvl / 4) * 2,
      rot: random(-0.05, 0.05),
    });
  }
}
```

---

## Step 4: Wire `placeEraBuildings()` into `expandIsland()`

After the `state.islandLevel++` line and after `updatePortPositions()`, add this single call:

```javascript
placeEraBuildings(state.islandLevel);
```

The tree-pushing blocks, grass tufts, and ambient citizens blocks that you kept untouched will still run after this call. That is correct — they are not placement logic, they are maintenance logic.

---

## Step 5: Verify the lvl 25 `expandIsland` block

The existing Lv 25 block in `expandIsland()` currently places buildings directly (`state.buildings.push`). After this rewrite, those placements are now inside `placeEraBuildings(25)`. You must **delete the building pushes from the original Lv 25 block** (the arch, villa, grand temple, mosaics, lanterns, flowers) but **keep** the `unlockJournal`, `imperatorBanner`, `checkImperatorVictory`, the `triggerScreenShake`, and the gold particle burst loop.

After Step 4, the sequence for Lv 25 will be:
1. `placeEraBuildings(25)` — places all buildings + screen shake + floating text
2. The kept Lv 25 block — journal unlock, particle burst, `imperatorBanner`, `checkImperatorVictory`

---

## Step 6: Verify `buildIsland()` is unchanged

Do NOT touch `buildIsland()`. It handles Lv 1 initial placement (farm, trees, crystals, resources, cats, chickens). This is correct and stays as-is.

---

## Step 7: Save-load compatibility check

Search for any reference to `spawnCluster` outside of `expandIsland()` and `spawnCluster()` itself. There are none — `spawnCluster` is only called from within `expandIsland`. Safe to delete.

Search for any save/load code that stores cluster state. Clusters were never stored separately — they push to `state.buildings[]` which is already serialized. No save format changes needed.

---

## Acceptance Criteria

Run `npm run check` — zero syntax errors.

Load a new game, use debug console (`\`` key) to test:
- `/level 5` — see granary north of farm with torches flanking, two wells, fence, floor tiles on farm road. No grid. Village feel.
- `/level 8` — see bath house SW, castrum SE with walls and watchtower, via militaris paving. Market east. Readable zones.
- `/level 10` — see temple NE with processional floor tiles and flanking torches. Second market near port. Town plaza paved.
- `/level 15` — see forum at center crossing with lanterns at all four corners, triumphal arch on east road, watchtower far east. Recognizable Roman city.
- `/level 17` — library in NE corner with mosaic forecourt and shrine. Housing rows NW dense.
- `/level 20` — villa on NW prominence with flower garden. Port arch. Feels grand.
- `/level 25` — grand temple on island peak. Full processional. Arena forecourt. Imperial palace between aqueducts and temple. DENSE.

At each level, every building must be in the correct district. No two major buildings should overlap. The city should read as organized, not scattered.

---

## What You Must NOT Change

- `buildIsland()` — initial Lv 1 placement
- `placeBuildingChecked()` — overlap check helper
- `canPlaceBuilding()` — overlap detection
- `addFarmPlots()` / `rebuildFarmGrid()` — farm system
- `addClampedResource()` / `addClampedTree()` — placement helpers
- `drawRomanRoad()` in world.js — road rendering
- BLUEPRINTS constant
- Any save/load code
- Any NPC, combat, or economy code
- The tree-pushing, grass tufts, and ambient citizens blocks inside `expandIsland()`

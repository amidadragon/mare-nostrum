// MARE NOSTRUM — Island Expansion, Era Buildings, Pre-built Islands
function placeEraBuildings(lvl) {
  let rx = getSurfaceRX();
  let ry = getSurfaceRY();
  let cx = WORLD.islandCX;
  let cy = WORLD.islandCY;
  // Farm is always in the far left zone (relative to current island center)
  let farmCX = cx - 340, farmCY = cy - 5;

  // Place all CITY_SLOTS for this level
  // Offset positions for bot islands (CITY_SLOTS are authored for home island at 600,400)
  let offsetX = WORLD.islandCX - 600;
  let offsetY = WORLD.islandCY - 400;
  CITY_SLOTS.forEach(slot => {
    if (slot.level !== lvl) return;
    let bld = { x: slot.x + offsetX, y: slot.y + offsetY, w: slot.w, h: slot.h, type: slot.type, rot: 0 };
    // Force-place decorative ground tiles (floors, mosaics) and castrum compound
    // parts that intentionally overlap parent structures
    let forcePlace = slot.type === 'floor' || slot.type === 'mosaic' || slot.type === 'castrum'
      || (slot.id && (slot.id.startsWith('wall_cast') || slot.id.startsWith('torch_cast') || slot.id === 'watchtower_cast'));
    if (forcePlace) {
      state.buildings.push(bld);
    } else {
      placeBuildingChecked(bld);
    }
  });

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
  // Per-level extras: resources, trees, crystals, ruins, farm, effects
  // (buildings handled by CITY_SLOTS above)
  // ─────────────────────────────────────────────────────────────────

  if (lvl === 2) {
    res(cx - 120, cy + 70, 'stone');
    res(cx - 60,  cy + 75, 'stone');
    res(cx + 30,  cy + 70, 'vine');
    res(cx + 100, cy + 65, 'leaf');
    crystal(50, 30, 14, 50);
    tree(cx + 180, cy + 40);
    tree(cx + 230, cy + 30);
    tree(cx + 300, cy - 10);
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.3, 'Farm fenced — the homestead grows!', '#88cc66');
    spawnParticles(220, 380, 'build', 8);
  }

  if (lvl === 3) {
    res(cx + 200, cy - 70, 'vine');
    res(cx + 250, cy - 45, 'stone');
    res(cx + 160, cy - 80, 'vine');
    res(cx + 300, cy - 30, 'leaf');
    crystal(-50, 30, 14, 50);
    tree(cx + 280, cy - 55);
    tree(cx + 320, cy - 25);
    tree(cx + 150, cy - 60);
    ruin(cx + 260, cy - 70, 30, 20);
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.3, 'Shrine consecrated — farm expands!', '#ffaaff');
    spawnParticles(760, 298, 'build', 10);
  }

  if (lvl === 4) {
    res(cx - 250, cy - 50, 'vine');
    res(cx - 300, cy - 20, 'leaf');
    res(cx - 200, cy - 70, 'stone');
    res(cx - 340, cy + 10, 'leaf');
    crystal(0, -45, 16, 60);
    tree(cx + 250, cy - 40);
    tree(cx + 200, cy + 50);
    tree(cx + 340, cy + 15);
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.3, 'Well dug — farm entrance fenced!', '#66aaff');
    spawnParticles(660, 440, 'build', 8);
  }

  if (lvl === 5) {
    res(cx - 350, cy + 30, 'stone');
    res(cx + 350, cy + 30, 'stone');
    res(cx - 150, cy + 90, 'vine');
    res(cx + 150, cy + 90, 'leaf');
    res(cx,       cy + 85, 'stone');
    crystal(-60, -10, 18, 80);
    crystal( 60, -10, 18, 80);
    tree(cx + 360, cy);
    tree(cx + 300, cy + 50);
    tree(cx + 180, cy - 70);
    tree(cx + 240, cy + 60);
    tree(cx + 350, cy - 40);
    ruin(cx, cy + 80, 35, 22);
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.25, 'Granary & Well constructed — farm fully expanded!', '#88cc66');
    spawnParticles(375, 340, 'build', 12);
  }

  if (lvl === 6) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.3, 'Citizens settle — Domus and Windmill built!', '#aaddff');
    spawnParticles(465, 330, 'build', 10);
    spawnParticles(310, 420, 'build', 8);
  }

  if (lvl === 7) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.3, 'Market opens for trade!', '#ffcc66');
    spawnParticles(810, 375, 'build', 10);
  }

  if (lvl === 8) {
    // South road from port toward center (5 tiles)
    let _port = getPortPosition();
    for (let i = 0; i < 5; i++) {
      let t = (i + 1) / 6;
      placeBuildingChecked({ x: lerp(_port.x, cx, t), y: lerp(_port.y, cy + 10, t), w: 24, h: 20, type: 'floor', rot: 0 });
    }
    // Update legia state with absolute castrum coords
    if (state.legia) {
      state.legia.castrumLevel = 1;
      state.legia.castrumX = 920;
      state.legia.castrumY = 480;
    }
    unlockJournal('legia_founded');
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.3, 'Baths & ' + getFactionTerms().barracks + ' — your settlement grows strong!', '#cc4444');
    spawnParticles(920, 480, 'build', 12);
  }

  if (lvl === 9) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.3, 'Aqueduct spans the island!', '#66ccff');
    spawnParticles(600, 218, 'build', 12);
  }

  if (lvl === 10) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.25, 'GOVERNOR — Temple & Market erected!', '#ffdd66');
    triggerScreenShake(6, 15);
    spawnParticles(820, 303, 'build', 15);
  }

  if (lvl === 11) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.3, 'Gardens and mosaics adorn the temple!', '#ffaaff');
    spawnParticles(820, 362, 'build', 10);
  }

  if (lvl === 12) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.3, 'Housing fills the Cardo — second well dug!', '#ffee88');
    spawnParticles(500, 340, 'build', 10);
  }

  if (lvl === 13) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.3, 'Watchtowers stand sentinel!', '#cc8844');
    spawnParticles(940, 392, 'build', 10);
  }

  if (lvl === 14) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.3, 'Bath complex rises, aqueduct extended!', '#66ccff');
    spawnParticles(740, 368, 'build', 10);
  }

  if (lvl === 15) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.25, 'SENATOR — Forum raised!', '#ff9944');
    triggerScreenShake(8, 20);
    spawnParticles(620, 450, 'build', 15);
  }

  if (lvl === 16) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.3, 'Housing district expands!', '#aaddff');
    spawnParticles(460, 360, 'build', 12);
  }

  if (lvl === 17) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.3, 'Great Library of Rome rises!', '#ddaaff');
    spawnParticles(760, 303, 'build', 14);
  }

  if (lvl === 18) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.3, 'Fortifications strengthened!', '#ff8844');
  }

  if (lvl === 19) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.3, 'Military barracks established!', '#ff6622');
    spawnParticles(830, 455, 'build', 16);
  }

  if (lvl === 20) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.25, 'CONSUL — Villa Estate built!', '#ffaa00');
    triggerScreenShake(12, 30);
    spawnParticles(460, 268, 'build', 20);
  }

  if (lvl === 21) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.3, 'Senate convenes — Forum Magnum!', '#ffaa44');
    spawnParticles(560, 450, 'build', 14);
  }

  if (lvl === 22) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.3, 'Harbor gate — the arch stands!', '#ddcc88');
    spawnParticles(980, 410, 'build', 12);
  }

  if (lvl === 23) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.3, 'Grand Aqueduct spans all of Mare Nostrum!', '#66ccff');
    spawnParticles(600, 210, 'build', 16);
  }

  if (lvl === 24) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.3, 'Imperial Palace rises — glory of Rome!', '#ffcc44');
    spawnParticles(600, 242, 'build', 18);
  }

  if (lvl === 25) {
    addFloatingText(width / 2, height * 0.25, 'IMPERATOR — Mare Nostrum is yours!', '#ff4400');
    triggerScreenShake(15, 40);
  }
}

function expandIsland() {
  let cost = getExpandCost(state.islandLevel);
  if (!canAffordExpand()) {
    addFloatingText(width / 2, height * 0.4, 'Need: ' + getExpandCostString(), C.buildInvalid);
    return;
  }
  if (state.islandLevel >= 25) {
    addFloatingText(width / 2, height * 0.4, 'IMPERIUM MAXIMUM!', C.textDim);
    return;
  }

  state.crystals -= cost.crystals;
  if (cost.stone) state.stone -= cost.stone;
  if (cost.ironOre) state.ironOre -= cost.ironOre;
  if (cost.ancientRelic) state.ancientRelic -= cost.ancientRelic;
  if (cost.titanBone) state.titanBone -= cost.titanBone;
  state.islandLevel++;
  triggerIslandMilestone(state.islandLevel);
  addNotification('Island expanded to Level ' + state.islandLevel, '#ffdd66');
  // Island grows less per level at higher tiers
  let rxGrowth = state.islandLevel <= 5 ? 35 : state.islandLevel <= 10 ? 28 : state.islandLevel <= 15 ? 22 : state.islandLevel <= 20 ? 16 : 12;
  let ryGrowth = state.islandLevel <= 5 ? 24 : state.islandLevel <= 10 ? 18 : state.islandLevel <= 15 ? 14 : state.islandLevel <= 20 ? 10 : 8;
  // Lerp island size over 120 frames instead of snapping
  state._expandVisualRX = state.islandRX;
  state._expandVisualRY = state.islandRY;
  state._expandTargetRX = state.islandRX + rxGrowth;
  state._expandTargetRY = state.islandRY + ryGrowth;
  state.islandRX += rxGrowth;
  state.islandRY += ryGrowth;
  state._expandFrames = 120;
  state.pyramid.level = state.islandLevel;
  updatePortPositions(); // ports follow island edge
  // Expansion ceremony effects
  if (snd) snd.playSFX('expand_rumble');
  // Expanding ring particle from island center
  particles.push({
    x: WORLD.islandCX, y: WORLD.islandCY, vx: 0, vy: 0,
    life: 90, maxLife: 90, type: 'golden_wave', size: 10,
    maxRing: 350, r: 220, g: 180, b: 80, world: true,
  });
  // Camera slow-zoom-out then ease back over 3 seconds
  state._expandCamZoom = 180;

  // Place all buildings, resources, trees, crystals, ruins for this level
  placeEraBuildings(state.islandLevel);

  // Milestone journal unlocks and special effects
  let rx = getSurfaceRX(), ry = getSurfaceRY();
  let cx = WORLD.islandCX, cy = WORLD.islandCY;
  if (state.islandLevel === 10) {
    unlockJournal('imperial_governor');
    // Island naming prompt at level 10
    if (!state.islandName) {
      state.islandNamingOpen = true;
      state.islandNamingInput = '';
    }
  }
  if (state.islandLevel === 15) {
    unlockJournal('imperial_senator');
  }
  if (state.islandLevel === 20) {
    unlockJournal('imperial_consul');
  }
  if (state.islandLevel === 25) {
    unlockJournal('imperator');
    // Gold particle burst from pyramid
    let _pyrX = state.pyramid.x, _pyrY = state.pyramid.y;
    for (let i = 0; i < 40; i++) {
      let _a = random(TWO_PI), _spd = random(2, 6);
      particles.push({
        x: _pyrX + random(-6, 6), y: _pyrY - 20 + random(-6, 6),
        vx: cos(_a) * _spd, vy: sin(_a) * _spd - 3,
        life: random(50, 100), maxLife: 100,
        type: 'harvest_burst', size: random(3, 7),
        r: 255, g: 200 + floor(random(-20, 20)), b: 40,
        gravity: 0.04, world: true,
      });
    }
    state.imperatorBanner = 300;
    checkImperatorVictory();
  }

  let farmCX = WORLD.islandCX - 340, farmCY = WORLD.islandCY - 5;
  let lvl = state.islandLevel;

  // Push existing trees away from temple (it grew)
  let texcl = getTempleExclusion();
  let pyrX = state.pyramid.x, pyrY = state.pyramid.y;
  state.trees.forEach(t => {
    let dx = t.x - pyrX, dy = t.y - pyrY;
    let d2 = dx * dx + dy * dy;
    if (d2 < texcl * texcl && d2 > 0) {
      let a = atan2(dy, dx);
      let pushDist = texcl + 20;
      t.x = pyrX + cos(a) * pushDist;
      t.y = pyrY + sin(a) * pushDist;
    }
  });
  // Push trees away from port zone
  let port = getPortPosition();
  state.trees.forEach(t => {
    let dx = t.x - port.x, dy = t.y - port.y;
    if (dx * dx + dy * dy < 70 * 70) {
      t.x = port.x - 75;
    }
  });

  // Remove trees within 50px of ANY building
  state.buildings.forEach(b => {
    state.trees = state.trees.filter(t => {
      let dx = t.x - b.x, dy = t.y - b.y;
      return dx * dx + dy * dy > 50 * 50;
    });
  });
  // Remove trees from center zone entirely (forum/plaza area)
  state.trees = state.trees.filter(t => {
    let dx = t.x - cx, dy = t.y - cy;
    let distFromCenter = dx * dx / (rx * 0.3 * rx * 0.3) + dy * dy / (ry * 0.3 * ry * 0.3);
    return distFromCenter > 1;
  });

  // Add grass tufts to new island area — more at higher levels
  let grx = getSurfaceRX(), gry = getSurfaceRY();
  let grassCount = 20 + lvl * 2;
  for (let i = 0; i < grassCount; i++) {
    let angle = random(TWO_PI);
    let rim = random(0.72, 0.92);
    let gx = cx + cos(angle) * grx * rim;
    let gy = cy + sin(angle) * gry * rim;
    if ((gx - cx) * (gx - cx) + (gy - cy) * (gy - cy) < 150 * 150) continue;
    let fdx = gx - farmCX, fdy = gy - farmCY;
    if (fdx * fdx / (110 * 110) + fdy * fdy / (50 * 50) < 1) continue;
    let tooClose = state.grassTufts.some(g2 => {
      let ddx = gx - g2.x, ddy = gy - g2.y;
      return ddx * ddx + ddy * ddy < 25 * 25;
    });
    if (tooClose) continue;
    state.grassTufts.push({
      x: gx, y: gy,
      blades: floor(random(4, 9)),
      height: random(12, 24),
      hue: random(0.7, 1.0),
      sway: random(TWO_PI),
    });
  }

  // Ambient citizens — spawn based on island level
  let targetCitizens = floor(state.islandLevel * 1.2);
  while (state.citizens.length < targetCitizens) {
    let ca = random(TWO_PI);
    let cr = random(0.2, 0.7);
    let ccx = cx + cos(ca) * getSurfaceRX() * cr;
    let ccy = cy + sin(ca) * getSurfaceRY() * cr;
    let variants = ['farmer', 'merchant', 'soldier', 'priest'];
    let weights = state.islandLevel <= 8 ? [4,2,1,1] : state.islandLevel <= 17 ? [2,3,2,1] : [1,2,3,2];
    let totalW = weights.reduce((a,b) => a+b, 0);
    let roll = floor(random(totalW));
    let vi = 0, acc = 0;
    for (let i = 0; i < weights.length; i++) { acc += weights[i]; if (roll < acc) { vi = i; break; } }
    state.citizens.push({
      x: ccx, y: ccy, vx: 0, vy: 0,
      variant: variants[vi],
      facing: random() > 0.5 ? 1 : -1,
      state: 'idle',
      timer: floor(random(60, 300)),
      speed: 0.4 + random(0.3),
      targetX: ccx, targetY: ccy,
    });
  }

  addFloatingText(width / 2, height * 0.35, '⚡ ISLAND EXPANDED LV.' + state.islandLevel, C.crystalGlow);
  spawnIslandLevelUp();
}

// ─── PER-ISLAND STATE SYSTEM ──────────────────────────────────────────────
// Each island (player + bots) gets its own state instance.
// The same game engine runs for all via state swapping.

let _realState = null;
let _swappedIsland = null;

const _islandFields = [
  'buildings','plots','citizens','trees','crystalNodes',
  'islandLevel','islandRX','islandRY',
  'wood','stone','gold','crystals','ironOre','harvest','fish','seeds',
  'meals','wine','oil',
  'pyramid','ruins','resources','factionFlora','factionWildlife',
  'chickens','crystalShrine','faction'
];

function createIslandState(faction) {
  return {
    faction: faction,
    islandLevel: 1, islandRX: 500, islandRY: 320,
    buildings: [], plots: [], trees: [], crystalNodes: [], citizens: [],
    // Resources (same starting amounts as player)
    wood: 10, stone: 5, gold: 10, crystals: 5,
    ironOre: 0, harvest: 5, fish: 2,
    seeds: 3, grapeSeeds: 0, oliveSeeds: 0,
    meals: 0, wine: 0, oil: 0,
    // Military
    legia: { army: [], castrumLevel: 0, morale: 100, recruits: 0, maxRecruits: 10 },
    // Temple
    templeHP: 100, templeMaxHP: 100,
    // NPCs
    npc: { hearts: 0 }, marcus: { hearts: 0 }, vesta: { hearts: 0 }, felix: { hearts: 0 },
    npcNames: FACTIONS[faction] ? FACTIONS[faction].npcNames : null,
    // Workers
    quarrier: null, cutter: null, fisher: null,
    // Progression
    foodShortage: 0, day: 1,
    // Port
    portLeft: null, portRight: null,
    // Visual elements (needed for full rendering parity)
    pyramid: null, ruins: [], resources: [],
    factionFlora: [], factionWildlife: [],
    chickens: [], crystalShrine: null,
  };
}

function createPrebuiltIsland(factionKey, cx, cy, targetLevel) {
  let is = createIslandState(factionKey);
  let offsetX = cx - 600;
  let offsetY = cy - 400;

  // Scale island to target level
  is.islandLevel = targetLevel;
  for (let lv = 1; lv <= targetLevel; lv++) {
    if (lv <= 5) { is.islandRX += 35; is.islandRY += 24; }
    else { is.islandRX += 28; is.islandRY += 18; }
  }

  // Place all CITY_SLOTS buildings up to target level
  is.buildings = [];
  CITY_SLOTS.forEach(function(slot) {
    if (slot.level <= targetLevel) {
      is.buildings.push({
        type: slot.type,
        x: slot.x + offsetX,
        y: slot.y + offsetY,
        w: slot.w, h: slot.h,
        hp: 100, built: true,
        isTemple: slot.type === 'temple',
        id: slot.id, rot: 0
      });
    }
  });
  // Every island MUST have a temple (even at low levels)
  if (!is.buildings.some(b => b.type === 'temple')) {
    is.buildings.push({ type: 'temple', x: cx, y: cy - (is.islandRY * 0.15), w: 70, h: 50, hp: 100, built: true, isTemple: true });
  }

  // Trees
  is.trees = [];
  for (let i = 0; i < 15; i++) {
    let a = Math.random() * Math.PI * 2, r = Math.random() * 0.4 + 0.2;
    is.trees.push({ x: cx + Math.cos(a) * is.islandRX * r * 0.7, y: cy + Math.sin(a) * is.islandRY * r * 0.3, type: 'oak', hp: 3, alive: true, health: 3, maxHealth: 3, size: 0.8 + Math.random() * 0.5, shakeTimer: 0, regrowTimer: 0 });
  }

  // Crystal nodes
  is.crystalNodes = [];
  for (let i = 0; i < 5; i++) {
    is.crystalNodes.push({ x: cx - is.islandRX * 0.7 + (Math.random() - 0.5) * 40, y: cy + (Math.random() - 0.5) * 30, charge: 50, size: 14 });
  }

  // Pyramid (main temple visual) — positioned at crystal shrine location
  is.pyramid = { x: cx, y: cy - is.islandRY * 0.12, level: targetLevel };
  // Crystal shrine
  is.crystalShrine = { x: cx - is.islandRX * 0.65, y: cy - 10 };
  // Ruins (decorative)
  is.ruins = [];
  for (let i = 0; i < 3; i++) {
    let a = Math.random() * Math.PI * 2, r = Math.random() * 0.3 + 0.35;
    is.ruins.push({ x: cx + Math.cos(a) * is.islandRX * r * 0.6, y: cy + Math.sin(a) * is.islandRY * r * 0.3, w: 20 + Math.random() * 15, h: 12 + Math.random() * 8, rot: (Math.random() - 0.5) * 0.1 });
  }
  // Resources (stone/vine/leaf nodes)
  is.resources = [];
  for (let i = 0; i < 8; i++) {
    let a = Math.random() * Math.PI * 2, r = Math.random() * 0.35 + 0.25;
    is.resources.push({ x: cx + Math.cos(a) * is.islandRX * r * 0.7, y: cy + Math.sin(a) * is.islandRY * r * 0.3, type: ['stone','vine','leaf'][i % 3], collected: false });
  }
  // Chickens
  is.chickens = [];
  for (let i = 0; i < 4; i++) {
    is.chickens.push({ x: cx - 80 + Math.random() * 40, y: cy + 10 + Math.random() * 20, facing: Math.random() > 0.5 ? 1 : -1, color: [200 + Math.floor(Math.random()*40), 170 + Math.floor(Math.random()*30), 120 + Math.floor(Math.random()*30)], pecking: false, peckTimer: 0, timer: Math.floor(Math.random() * 60), vx: 0, vy: 0 });
  }
  // Faction flora
  is.factionFlora = [];
  if (typeof FACTION_FLORA !== 'undefined') {
    let _ffl = FACTION_FLORA[factionKey] || FACTION_FLORA.rome;
    for (let fi = 0; fi < 12; fi++) {
      let fa = Math.PI * 2 * fi / 12 + 0.7, fd = 0.15 + Math.random() * 0.45;
      let tmpl = _ffl[fi % _ffl.length];
      is.factionFlora.push({ x: cx + Math.cos(fa) * is.islandRX * fd, y: cy + Math.sin(fa) * is.islandRY * fd * 0.4, col: tmpl.col, w: tmpl.w, h: tmpl.h, phase: Math.random() * Math.PI * 2 });
    }
  }
  // Faction wildlife
  is.factionWildlife = [];

  // Scale starting resources with level
  is.crystals = 20 + targetLevel * 8;
  is.wood = 30 + targetLevel * 3;
  is.stone = 15 + targetLevel * 2;
  is.gold = 50 + targetLevel * 10;

  // Farm plots
  is.plots = [];
  for (let i = 0; i < 6; i++) {
    is.plots.push({ x: cx - is.islandRX * 0.4 + (i % 3) * 28, y: cy - is.islandRY * 0.05 + Math.floor(i / 3) * 28, crop: i < 3 ? 'grain' : null, stage: i < 3 ? 'growing' : 'empty', growTimer: i < 3 ? 150 : 0 });
  }

  // Citizens (1 per 3 buildings, min 3, max 10+)
  is.citizens = [];
  let numCitizens = Math.max(3, Math.min(10 + targetLevel, Math.floor(is.buildings.length / 3) + 2));
  for (let i = 0; i < numCitizens; i++) {
    is.citizens.push({
      x: cx + (Math.random() - 0.5) * is.islandRX * 0.5,
      y: cy + (Math.random() - 0.5) * is.islandRY * 0.2,
      speed: 0.3 + Math.random() * 0.2,
      targetX: cx + (Math.random() - 0.5) * 100,
      targetY: cy + (Math.random() - 0.5) * 40,
      moveTimer: Math.floor(Math.random() * 120),
      skin: Math.floor(Math.random() * 5),
      variant: Math.floor(Math.random() * 4), // citizen type variant
      facing: Math.random() > 0.5 ? 1 : -1,
      state: 'walking',
      walkBobPhase: Math.random() * Math.PI * 2,
      tunicR: 100 + Math.floor(Math.random() * 80),
      tunicG: 80 + Math.floor(Math.random() * 60),
      tunicB: 60 + Math.floor(Math.random() * 40),
      activity: null, activityTimer: 0,
    });
  }

  is.workers = [
    { role: 'cutter', x: cx - 60, y: cy + 20, targetX: cx - 60, targetY: cy + 20, state: 'walking', timer: 0, speed: 0.5 },
    { role: 'quarrier', x: cx + 80, y: cy - 10, targetX: cx + 80, targetY: cy - 10, state: 'walking', timer: 0, speed: 0.4 },
    { role: 'priestess', x: cx - is.islandRX * 0.6, y: cy, targetX: cx - is.islandRX * 0.6, targetY: cy, state: 'walking', timer: 0, speed: 0.35 },
    { role: 'farmer', x: cx - is.islandRX * 0.3, y: cy, targetX: cx - is.islandRX * 0.3, targetY: cy, state: 'walking', timer: 0, speed: 0.4 },
  ];

  // Military
  is.legia = { army: [], castrumLevel: targetLevel >= 8 ? 1 : 0, morale: 100, recruits: 0, maxRecruits: 10 };
  if (targetLevel >= 8) {
    for (let i = 0; i < 4; i++) {
      is.legia.army.push({ type: 'legionary', hp: 20, maxHp: 20, damage: 5, speed: 1.2, garrison: false });
    }
  }

  // 4 Named NPCs (at faction-specific positions)
  is.npcs = [
    { name: 'npc1', x: cx - 80, y: cy - 20, role: 'livia', hearts: 2, facing: 'right', moving: false, targetX: cx - 60, targetY: cy - 10, moveTimer: 60 },
    { name: 'npc2', x: cx + 100, y: cy + 10, role: 'marcus', hearts: 1, facing: 'left', moving: false, targetX: cx + 80, targetY: cy, moveTimer: 90 },
    { name: 'npc3', x: cx - 30, y: cy - 50, role: 'vesta', hearts: 1, facing: 'down', moving: false, targetX: cx - 20, targetY: cy - 40, moveTimer: 120 },
    { name: 'npc4', x: cx + 50, y: cy + 30, role: 'felix', hearts: 0, facing: 'right', moving: false, targetX: cx + 60, targetY: cy + 20, moveTimer: 70 },
  ];

  is.critter = {
    type: factionKey === 'egypt' ? 'cat' : factionKey === 'gaul' ? 'boar' : factionKey === 'greece' ? 'owl' : 'wolf',
    x: cx, y: cy, targetX: cx, targetY: cy
  };

  is.templeHP = 100;
  is.gold = 50 + targetLevel * 20;
  is.wood = 30; is.stone = 20; is.crystals = 15;
  is.harvest = 20; is.fish = 10;

  return is;
}

// ─── BOT WEB WORKER ───────────────────────────────────────────────────────
function initBotWorker() {
  if (typeof Worker === 'undefined') return;
  try {
    _botWorker = new Worker('bot_worker.js');
    _botWorker.onmessage = function(e) {
      if (e.data.type === 'ready') {
        _botWorkerReady = true;
      }
      if (e.data.type === 'result') {
        _botWorkerResults = e.data.bots;
        if (e.data.mutations) {
          for (let m of e.data.mutations) applyBotMutation(m);
        }
      }
    };
    _botWorker.onerror = function(err) {
      console.warn('Bot worker error, falling back to main thread:', err.message);
      _botWorker = null;
      _botWorkerReady = false;
    };
    // Send init with nation positions
    let initData = {};
    for (let k of Object.keys(state.nations || {})) {
      let n = state.nations[k];
      if (n.isBot) initData[k] = { isleX: n.isleX, isleY: n.isleY };
    }
    _botWorker.postMessage({ type: 'init', nations: initData });
  } catch(e) {
    console.warn('Failed to create bot worker:', e);
    _botWorker = null;
  }
}

function applyBotMutation(m) {
  let nation = state.nations[m.nation];
  if (!nation || !nation.islandState) return;
  let is = nation.islandState;
  switch (m.type) {
    case 'chop':
      is.wood = (is.wood || 0) + (m.woodGain || 3);
      if (is.trees && m.target) {
        let i = is.trees.findIndex(function(t) { return Math.abs(t.x - m.target.x) < 20 && Math.abs(t.y - m.target.y) < 20; });
        if (i >= 0) is.trees.splice(i, 1);
      }
      break;
    case 'mine_crystal':
      is.crystals = (is.crystals || 0) + (m.crystalGain || 3);
      if (is.crystalNodes && m.target) {
        let n = is.crystalNodes.find(function(nd) { return Math.abs(nd.x - m.target.x) < 20 && Math.abs(nd.y - m.target.y) < 20 && (nd.charge || 0) > 0; });
        if (n) n.charge = Math.max(0, (n.charge || 0) - (m.chargeDrain || 20));
      }
      break;
    case 'mine_stone':
      is.stone = (is.stone || 0) + (m.stoneGain || 2);
      break;
    case 'harvest':
      is.harvest = (is.harvest || 0) + (m.harvestGain || 3);
      if (is.plots && m.target) {
        let p = is.plots.find(function(pl) { return pl.stage === 'ready' && Math.abs(pl.x - m.target.x) < 20; });
        if (p) { p.stage = 'empty'; p.crop = null; }
      }
      break;
    case 'plant':
      if (is.plots && m.target) {
        let p = is.plots.find(function(pl) { return !pl.crop && Math.abs(pl.x - m.target.x) < 20; });
        if (p) { p.crop = 'grain'; p.stage = 'growing'; p.growTimer = 0; }
      }
      break;
    case 'expand':
      if (typeof swapToIsland === 'function') {
        swapToIsland(is, nation.isleX, nation.isleY);
        let cost = 5 + (state.islandLevel || 1) * 8;
        if ((state.crystals || 0) >= cost) {
          state.crystals -= cost;
          state.islandLevel = (state.islandLevel || 1) + 1;
          state.islandRX = (state.islandRX || 500) + 30;
          state.islandRY = (state.islandRY || 320) + 20;
          if (typeof placeEraBuildings === 'function') placeEraBuildings(state.islandLevel);
          if (!state.trees) state.trees = [];
          for (let i = 0; i < 3; i++) {
            let a = Math.random() * Math.PI * 2, r = Math.random() * 0.3 + 0.4;
            state.trees.push({ x: nation.isleX + Math.cos(a) * state.islandRX * r * 0.7, y: nation.isleY + Math.sin(a) * state.islandRY * r * 0.3, type: 'oak', hp: 3 });
          }
        }
        swapBack();
      }
      break;
    case 'recruit':
      if ((is.gold || 0) >= 10) {
        is.gold -= 10;
        if (!is.legia) is.legia = { army: [], castrumLevel: 1, morale: 100 };
        if (!is.legia.army) is.legia.army = [];
        is.legia.army.push({ type: 'legionary', hp: 20, maxHp: 20, damage: 5, speed: 1.2, garrison: false });
        is.legia.castrumLevel = Math.max(is.legia.castrumLevel || 0, 1);
      }
      break;
    case 'defend_hit':
      if (state.invasion && state.invasion.active && state.invasion.target === m.nation) {
        let atk = state.invasion.attackers ? state.invasion.attackers.find(function(a) { return a.hp > 0; }) : null;
        if (atk) {
          atk.hp -= (m.damage || 8);
          if (typeof addFloatingText === 'function' && typeof w2sX === 'function') {
            addFloatingText(w2sX(atk.x), w2sY(atk.y) - 15, '-' + (m.damage || 8), '#ff8800');
          }
          if (atk.hp <= 0) { atk.state = 'dead'; atk.deathTimer = 0; }
        }
      }
      break;
  }
}

function swapToIsland(islandState, cx, cy) {
  if (_realState) return; // already swapped
  _realState = { cx: WORLD.islandCX, cy: WORLD.islandCY };
  for (let f of _islandFields) _realState[f] = state[f];
  for (let f of _islandFields) state[f] = islandState[f] != null ? islandState[f] : state[f];
  WORLD.islandCX = cx;
  WORLD.islandCY = cy;
  _swappedIsland = islandState;
}

function swapBack() {
  if (!_realState) return;
  if (_swappedIsland) {
    for (let f of _islandFields) _swappedIsland[f] = state[f];
  }
  for (let f of _islandFields) state[f] = _realState[f];
  WORLD.islandCX = _realState.cx;
  WORLD.islandCY = _realState.cy;
  _realState = null;
  _swappedIsland = null;
}

// ─── COORD HELPERS ────────────────────────────────────────────────────────
function dist2(x1, y1, x2, y2) {
  return sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}


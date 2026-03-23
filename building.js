// ═══════════════════════════════════════════════════════════════════════════
// building.js — Building/construction system extracted from sketch.js
// All functions and constants here are global (loaded before sketch.js)
// ═══════════════════════════════════════════════════════════════════════════

// ─── BLUEPRINTS ──────────────────────────────────────────────────
// Blueprint types — cost wood, stone, crystals
const BLUEPRINTS = {
  floor:  { name: 'Tile',     w: 32, h: 32, cost: { wood: 2 },                  key: '1', blocks: false, upkeep: 0 },
  wall:   { name: 'Wall',     w: 32, h: 8,  cost: { stone: 2 },                 key: '2', blocks: true, upkeep: 2 },
  door:   { name: 'Arch',     w: 32, h: 8,  cost: { wood: 3 },                  key: '3', blocks: false, upkeep: 0 },
  chest:  { name: 'Arca',     w: 24, h: 20, cost: { wood: 3, crystals: 1 },     key: '4', blocks: true, upkeep: 0 },
  bridge: { name: 'Bridge',   w: 32, h: 32, cost: { wood: 4 },                  key: '5', blocks: false, upkeep: 0 },
  fence:  { name: 'Baluster', w: 32, h: 6,  cost: { wood: 1 },                  key: '6', blocks: true, upkeep: 0 },
  torch:  { name: 'Brazier',  w: 8,  h: 8,  cost: { wood: 1, crystals: 1 },    key: '7', blocks: false, upkeep: 0 },
  flower: { name: 'Roses',    w: 8,  h: 8,  cost: { seeds: 1 },               key: '8', blocks: false, upkeep: 0 },
  lantern:{ name: 'Lucerna',  w: 10, h: 10, cost: { wood: 2, crystals: 1 },   key: '9', blocks: false, upkeep: 0 },
  mosaic: { name: 'Mosaic',   w: 32, h: 32, cost: { stone: 3, crystals: 1 },key: '0', blocks: false, upkeep: 0 },
  aqueduct:{ name: 'Aqueduct',w: 32, h: 12, cost: { stone: 4, wood: 2 },    key: '-', blocks: true, upkeep: 1 },
  bath:    { name: 'Balneum', w: 70, h: 52, cost: { stone: 8, wood: 4, crystals: 3 }, key: '=', blocks: true, upkeep: 2 },
  // Level 5+ (Governor)
  granary: { name: 'Granary',  w: 58, h: 44, cost: { stone: 6, wood: 4 },              key: '', blocks: true,  minLevel: 5, upkeep: 1 },
  well:    { name: 'Well',     w: 24, h: 24, cost: { stone: 4 },                        key: '', blocks: true,  minLevel: 5, upkeep: 0 },
  // Level 10+ (Senator)
  temple:  { name: 'Temple',   w: 70, h: 50, cost: { stone: 10, crystals: 5, gold: 20 },key: '', blocks: true,  minLevel: 10, upkeep: 3 },
  market:  { name: 'Market',   w: 44, h: 34, cost: { wood: 6, stone: 3 },               key: '', blocks: true,  minLevel: 10, upkeep: 2 },
  // Level 15+ (Consul)
  forum:   { name: 'Forum',    w: 80, h: 60, cost: { stone: 15, gold: 50 },             key: '', blocks: true,  minLevel: 15, upkeep: 3 },
  watchtower:{ name: 'Tower',  w: 24, h: 56, cost: { stone: 8, ironOre: 4 },            key: '', blocks: true,  minLevel: 15, upkeep: 2 },
  // Level 20+ (Consul->Imperator)
  arch:    { name: 'Arch',     w: 48, h: 52, cost: { stone: 20, gold: 100, crystals: 10 }, key: '', blocks: false, minLevel: 20, upkeep: 0 },
  villa:   { name: 'Villa',    w: 72, h: 52, cost: { stone: 15, wood: 10, gold: 75 },   key: '', blocks: true,  minLevel: 20, upkeep: 4 },
  // New building types
  shrine:  { name: 'Sacellum', w: 32, h: 28, cost: { stone: 5, crystals: 3 },           key: '', blocks: true,  minLevel: 3, upkeep: 1 },
  house:   { name: 'Domus',    w: 44, h: 34, cost: { wood: 4, stone: 3 },                key: '', blocks: true,  minLevel: 6, upkeep: 1 },
  library: { name: 'Biblioth', w: 72, h: 52, cost: { stone: 8, wood: 4, crystals: 2 },   key: '', blocks: true,  minLevel: 12, upkeep: 2 },
  // arena building removed
  campfire:{ name: 'Focus',    w: 16, h: 16, cost: { wood: 1 },                           key: '', blocks: false, upkeep: 0 },
  // Level 8+ (auto-spawned, not player-buildable)
  castrum: { name: 'Castrum',  w: 130, h: 100, cost: { stone: 10, wood: 8, ironOre: 5, gold: 50 }, key: '', blocks: true, minLevel: 8, upkeep: 2 },
  // ─── NEW BUILDING TYPES ───────────────────────────────────────────────
  altar:      { name: 'Altar',      w: 28, h: 24, cost: { gold: 20, stone: 5 },                      key: '', blocks: true,  minLevel: 2, upkeep: 1 },
  bakery:     { name: 'Pistrinum',  w: 44, h: 36, cost: { gold: 40, wood: 10 },                      key: '', blocks: true,  minLevel: 3, upkeep: 1, desc: 'Bakes bread from grain. Upgradeable (3 tiers).' },
  marketplace:{ name: 'Emporium',   w: 52, h: 38, cost: { gold: 50, wood: 10 },                      key: '', blocks: true,  minLevel: 4, upkeep: 2 },
  vineyard:   { name: 'Vinea',      w: 60, h: 40, cost: { gold: 60, wood: 15 },                      key: '', blocks: true,  minLevel: 5, upkeep: 1 },
  bathhouse:  { name: 'Thermae',    w: 64, h: 48, cost: { gold: 80, stone: 20 },                     key: '', blocks: true,  minLevel: 6, upkeep: 2 },
  guardtower: { name: 'Specula',    w: 22, h: 52, cost: { gold: 70, stone: 25 },                     key: '', blocks: true,  minLevel: 7, upkeep: 2 },
  lighthouse: { name: 'Pharos',     w: 26, h: 60, cost: { gold: 100, stone: 30 },                    key: '', blocks: true,  minLevel: 8, upkeep: 4 },
  sculptor:   { name: 'Sculptor',   w: 50, h: 40, cost: { gold: 120, stone: 40, ironOre: 10 },       key: '', blocks: true,  minLevel: 9, upkeep: 4 },
  crystal_collector: { name: 'Crystal Collector', w: 40, h: 30, cost: { stone: 15, gold: 30 }, key: '', blocks: true, minLevel: 5, desc: 'Automatically harvests nearby crystal nodes', upkeep: 1 },
  windmill: { name: 'Windmill', w: 50, h: 45, cost: { wood: 20, stone: 15, gold: 40 }, key: '', blocks: true, minLevel: 6, upkeep: 1, desc: 'Grinds grain into flour. Doubles bakery output.' },
  shipyard: { name: 'Shipyard', w: 60, h: 50, cost: { wood: 30, stone: 20, ironOre: 10, gold: 80 }, key: '', blocks: true, minLevel: 8, upkeep: 2, desc: 'Upgrade your ship: hull, cannons, sails' },
};


// ─── ADJACENCY_BONUSES ───────────────────────────────────────────
const ADJACENCY_BONUSES = {
  bakery:      { near: 'windmill',    bonus: '+50% bread',          range: 80,  mult: 1.5 },
  bakery2:     { type: 'bakery', near: 'granary', bonus: '+25% bread', range: 80, mult: 1.25 },
  market:      { near: 'bakery',      bonus: '+2 gold/day',         range: 100, goldBonus: 2 },
  house:       { near: 'well',        bonus: '+1 citizen cap',      range: 60,  popBonus: 1 },
  house2:      { type: 'house', near: 'bath', bonus: '+1 citizen cap', range: 80, popBonus: 1 },
  watchtower:  { near: 'wall',        bonus: '+20% damage',         range: 60,  dmgMult: 1.2 },
  castrum:     { near: 'watchtower',  bonus: '+10% recruit speed',  range: 100, recruitMult: 0.9 },
  temple:      { near: 'shrine',      bonus: '+20% crystal income', range: 80,  crystalMult: 1.2 },
  vineyard:    { near: 'bakery',      bonus: '+30% wine output',    range: 80,  mult: 1.3 },
  library:     { near: 'temple',      bonus: '+25% research speed', range: 100, researchMult: 1.25 },
};

// ─── ADJACENCY FUNCTIONS ─────────────────────────────────────────
function getAdjacencyBonuses(building) {
  let bonuses = [];
  let bType = building.type;
  for (let key in ADJACENCY_BONUSES) {
    let ab = ADJACENCY_BONUSES[key];
    let matchType = ab.type || key;
    if (bType !== matchType) continue;
    let found = state.buildings.some(b2 => b2 !== building && !b2.ruined &&
      b2.type === ab.near && dist(building.x, building.y, b2.x, b2.y) < ab.range);
    if (found) bonuses.push(ab);
  }
  return bonuses;
}

function hasAdjacencyBonus(building, bonusKey) {
  let ab = ADJACENCY_BONUSES[bonusKey];
  if (!ab) return false;
  let matchType = ab.type || bonusKey;
  if (building.type !== matchType) return false;
  return state.buildings.some(b2 => b2 !== building && !b2.ruined &&
    b2.type === ab.near && dist(building.x, building.y, b2.x, b2.y) < ab.range);
}

// ─── ROTATABLE_TYPES ─────────────────────────────────────────────
const ROTATABLE_TYPES = ['wall', 'door', 'fence', 'bridge', 'aqueduct', 'arch'];

// ─── MAINTENANCE + REPAIR ────────────────────────────────────────
// ─── BUILDING MAINTENANCE ────────────────────────────────────────────────────────
function calculateBuildingMaintenance() {
  let total = 0;
  for (let b of (state.buildings || [])) {
    if (b.ruined) continue;
    let bp = BLUEPRINTS[b.type];
    if (bp && bp.upkeep) total += bp.upkeep;
  }
  return total;
}

function processBuildingMaintenance() {
  let cost = calculateBuildingMaintenance();
  if (cost <= 0) return;
  if (state.gold >= cost) {
    state.gold -= cost;
    if (state.treasury) state.treasury.dailyExpense += cost;
    if (state._upkeepMissedDays > 0) state._upkeepMissedDays = 0;
    addNotification('Building upkeep: -' + cost + 'g', '#cc8844');
    // Restore durability on paid buildings
    for (let b of (state.buildings || [])) {
      if (b.durability !== undefined && b.durability < 100 && !b.ruined) {
        b.durability = min(100, b.durability + 10);
      }
    }
  } else {
    // 3-day grace period before buildings decay
    if (state._upkeepMissedDays === undefined) state._upkeepMissedDays = 0;
    state._upkeepMissedDays++;
    let paid = state.gold;
    state.gold = 0;
    if (state.treasury) state.treasury.dailyExpense += paid;
    let daysLeft = 3 - state._upkeepMissedDays;
    if (daysLeft > 0) {
      addNotification('Low gold! Buildings will decay in ' + daysLeft + ' day' + (daysLeft > 1 ? 's' : '') + '!', '#ffaa44');
    } else {
      addFloatingText(width / 2, height * 0.25, 'Buildings deteriorating! Pay maintenance!', '#ff4444');
      addNotification('Cannot afford ' + cost + 'g upkeep! Buildings losing durability.', '#ff4444');
      for (let b of (state.buildings || [])) {
        let bp = BLUEPRINTS[b.type];
        if (!bp || !bp.upkeep || bp.upkeep <= 0) continue;
        if (b.ruined) continue;
        if (b.durability === undefined) b.durability = 100;
        b.durability -= 5;
        if (b.durability <= 0) {
          b.durability = 0;
          b.ruined = true;
          addFloatingText(w2sX(b.x), w2sY(b.y) - 20, bp.name + ' ruined!', '#ff4444');
        }
      }
    }
  }
}

function getBuildingRepairCost(b) {
  let bp = BLUEPRINTS[b.type];
  if (!bp) return 0;
  let goldCost = (bp.cost && bp.cost.gold) || 0;
  return max(5, floor(goldCost * 0.5));
}

function repairBuilding(b) {
  if (!b.ruined) return false;
  let cost = getBuildingRepairCost(b);
  if (state.gold < cost) {
    addFloatingText(width / 2, height * 0.3, 'Need ' + cost + 'g to repair', '#ff6644');
    return false;
  }
  state.gold -= cost;
  b.ruined = false;
  b.durability = 100;
  let bp = BLUEPRINTS[b.type];
  addFloatingText(w2sX(b.x), w2sY(b.y) - 20, (bp ? bp.name : 'Building') + ' repaired!', '#44ff44');
  return true;
}

// ─── ISBLOCKEDBYBUILDING ─────────────────────────────────────────
// Check if a wall/fence/chest blocks movement at this point
function isBlockedByBuilding(wx, wy) {
  if (state && state.insideTemple) return false;
  if (state && state.insideCastrum) return false;
  return state.buildings.some(b => {
    if (!BLUEPRINTS[b.type] || !BLUEPRINTS[b.type].blocks) return false;
    let hw = b.w / 2 + 4;
    let hh = (b.type === 'wall' || b.type === 'fence') ? 14 : b.h / 2 + 4;
    let by = (b.type === 'wall') ? b.y - 10 : (b.type === 'fence') ? b.y : b.y;
    return wx >= b.x - hw && wx <= b.x + hw &&
           wy >= by - hh && wy <= by + hh;
  });
}

// ─── DRAWBUILDINGS+DRAWONEBUILDING ───────────────────────────────
// ─── BUILDINGS (BLUEPRINTS) ──────────────────────────────────────────────
function drawBuildings() {
  state.buildings.forEach(b => drawOneBuilding(b));
  // Adjacency bonus "+" icons
  if (!state.buildMode) {
    for (let b of state.buildings) {
      if (b.ruined) continue;
      let bonuses = getAdjacencyBonuses(b);
      if (bonuses.length > 0) {
        let bsx = w2sX(b.x), bsy = w2sY(b.y);
        if (bsx < -40 || bsx > width + 40 || bsy < -40 || bsy > height + 40) continue;
        let pulse = 0.7 + sin(frameCount * 0.06) * 0.3;
        push(); fill(100, 255, 100, floor(180 * pulse)); noStroke();
        textSize(10); textAlign(CENTER, CENTER);
        text('+', bsx, bsy - b.h / 2 - 8); pop();
      }
    }
  }
}
function drawOneBuilding(b) {
    let sx = w2sX(b.x);
    let sy = w2sY(b.y);
    // Cull offscreen buildings
    if (sx < -80 || sx > width + 80 || sy < -80 || sy > height + 80) return;
    // Try sprite first, fall back to rect-based drawing
    if (typeof SpriteManager !== 'undefined' && drawBuildingSprite(sx, sy, b.type, state.faction)) return;
    let bw = b.w;
    let bh = b.h;
    let ep = getEraPalette();
    let fc = getFactionBuildingColors();

    // Construction rise animation for newly placed buildings
    let _building = (b.buildProgress !== undefined && b.buildProgress < 1);
    let _buildEased = 1;
    if (_building) {
      b.buildProgress = min(1, b.buildProgress + 0.025 * getFactionData().buildSpeedMult);
      let t = b.buildProgress;
      _buildEased = t * (2 - t); // ease-out quad
      // Dust cloud particles during construction
      if (t < 0.6 && frameCount % 3 === 0) {
        particles.push({
          x: b.x + random(-bw * 0.4, bw * 0.4), y: b.y + random(-2, 4),
          vx: random(-0.5, 0.5), vy: random(-0.8, -0.2),
          life: 18, maxLife: 18, type: 'burst',
          r: 160, g: 140, b: 100, size: random(2, 5), world: true,
        });
      }
    }

    push();
    translate(sx, sy);
    if (b.rot && ROTATABLE_TYPES.includes(b.type)) {
      rotate(b.rot * HALF_PI);
    }
    if (_building) {
      // Scale Y from ground (base of building), fade alpha
      scale(1, _buildEased);
      drawingContext.globalAlpha = lerp(0.4, 1, _buildEased);
    }

    // Directional cast shadow for tall buildings
    if (!['floor', 'mosaic', 'bridge'].includes(b.type)) {
      let _sh = state.time / 60;
      if (_sh >= 6 && _sh <= 19) {
        // Sun from east (morning) to west (afternoon) — shadow falls opposite
        let sunAngle = map(_sh, 6, 19, -1, 1); // -1=east sun, +1=west sun
        let shadowLen = map(abs(_sh - 12.5), 0, 6.5, 0.3, 1.2); // longer at dawn/dusk
        let shadowOffX = sunAngle * bw * shadowLen;
        let shadowH = (bh || 20) * 0.3;
        noStroke();
        fill(0, 0, 0, 18);
        quad(
          -bw / 2, 0,
          bw / 2, 0,
          bw / 2 + shadowOffX, shadowH,
          -bw / 2 + shadowOffX, shadowH
        );
      }
    }

    switch (b.type) {
      case 'wall': {
        noStroke();
        let _wfc = fc;
        let wallH = 24;
        fill(0, 0, 0, 30);
        rect(-bw / 2 + 1, -2, bw, 4, 1);
        // Main wall face — faction-aware
        fill(_wfc.wall[0], _wfc.wall[1], _wfc.wall[2]);
        rect(-bw / 2, -wallH, bw, wallH, 1);
        // Top capstone
        fill(_wfc.trim[0], _wfc.trim[1], _wfc.trim[2]);
        rect(-bw / 2, -wallH - 2, bw, 4, 1);
        fill(_wfc.trim[0] + 5, _wfc.trim[1] + 8, _wfc.trim[2] + 9);
        rect(-bw / 2, -wallH - 2, bw, 1.5);
        // Bottom molding
        fill(_wfc.wall[0] - 20, _wfc.wall[1] - 15, _wfc.wall[2] - 15);
        rect(-bw / 2, -2, bw, 3, 1);
        // Wall texture — faction-aware (skip on low FPS)
        if (_fpsSmooth < 30) { noStroke(); break; }
        stroke(_wfc.wall[0] - 25, _wfc.wall[1] - 22, _wfc.wall[2] - 18, 80);
        strokeWeight(0.8);
        if (_wfc.wallTexture === 'mudbrick') {
          for (let ly = -wallH + 2; ly < -2; ly += 6) {
            line(-bw / 2 + 1, ly, bw / 2 - 1, ly);
            let off = (floor((ly + wallH) / 6) % 2) * 7;
            for (let lx = -bw / 2 + off + 5; lx < bw / 2 - 2; lx += 12) {
              line(lx, ly, lx, ly + 6);
            }
          }
        } else if (_wfc.wallTexture === 'marble' || _wfc.wallTexture === 'smooth') {
          for (let ly = -wallH + 3; ly < -2; ly += 8) {
            line(-bw / 2 + 1, ly, bw / 2 - 1, ly);
          }
        } else {
          for (let ly = -wallH + 2; ly < -2; ly += 5) {
            line(-bw / 2 + 1, ly, bw / 2 - 1, ly);
            let off = (floor((ly + wallH) / 5) % 2) * 8;
            for (let lx = -bw / 2 + off + 6; lx < bw / 2 - 2; lx += 14) {
              line(lx, ly, lx, ly + 5);
            }
          }
        }
        noStroke();
        // Block color variation
        for (let ly = -wallH + 2; ly < -2; ly += 5) {
          let off = (floor((ly + wallH) / 5) % 2) * 8;
          for (let lx = -bw / 2 + off + 1; lx < bw / 2 - 2; lx += 14) {
            let cv = sin(lx * 0.3 + ly * 0.5) * 8;
            fill(_wfc.wall[0] - 23 + cv, _wfc.wall[1] - 13 + cv, _wfc.wall[2] + cv, 30);
            rect(lx, ly + 0.5, 12, 4);
          }
        }
        fill(_wfc.wall[0] + 7, _wfc.wall[1] + 20, _wfc.wall[2] + 32, 35);
        rect(-bw / 2 + 1, -wallH, bw / 3, wallH * 0.7, 1);
        fill(_wfc.wall[0] - 58, _wfc.wall[1] - 48, _wfc.wall[2] - 36, 25);
        rect(bw / 4, -bh / 2 - 8, 4, 6);
        rect(-bw / 4, -bh / 2, 3, 4);
        break;
      }

      case 'floor':
        // Mosaic tile floor — faction ground
        noStroke();
        // Base tile — faction ground
        fill(fc.ground[0] + 30, fc.ground[1] + 30, fc.ground[2] + 30);
        rect(-bw / 2, -bh / 2, bw, bh, 1);
        // Mosaic tile grid — faction ground alternating
        let _fg = [fc.ground[0] + 30, fc.ground[1] + 30, fc.ground[2] + 30];
        let mTileColors = [
          [_fg[0] + 10, _fg[1] + 10, _fg[2] + 10],
          [_fg[0] - 10, _fg[1] - 10, _fg[2] - 10],
          [_fg[0], _fg[1] - 8, _fg[2] - 17],
          [_fg[0] - 15, _fg[1] - 15, _fg[2] - 15]
        ];
        for (let ty = -bh / 2 + 1; ty < bh / 2; ty += 4) {
          for (let tx = -bw / 2 + 1; tx < bw / 2; tx += 4) {
            let ci = abs(floor(tx / 4) + floor(ty / 4)) % 4;
            let mc = mTileColors[ci];
            fill(mc[0], mc[1], mc[2], 140);
            rect(tx, ty, 3.5, 3.5);
          }
        }
        // Mosaic grout lines
        stroke(155, 148, 132, 60);
        strokeWeight(0.3);
        for (let ty = -bh / 2; ty <= bh / 2; ty += 4) {
          line(-bw / 2, ty, bw / 2, ty);
        }
        for (let tx = -bw / 2; tx <= bw / 2; tx += 4) {
          line(tx, -bh / 2, tx, bh / 2);
        }
        noStroke();
        // Center medallion — small decorative diamond
        if (bw > 10 && bh > 10) {
          fill(200, 165, 50, 100);
          beginShape();
          vertex(0, -3); vertex(3, 0); vertex(0, 3); vertex(-3, 0);
          endShape(CLOSE);
          fill(170, 55, 35, 80);
          rect(-1, -1, 2, 2);
        }
        // Worn patina — subtle aging
        fill(165, 158, 140, 20);
        rect(-bw * 0.25, -bh * 0.25, bw * 0.5, bh * 0.5);
        break;

      case 'door': {
        noStroke();
        let _dfc = fc;
        let doorH = 30;
        // Stone frame — faction trim
        fill(_dfc.trim[0], _dfc.trim[1], _dfc.trim[2]);
        rect(-bw / 2, -doorH, bw, doorH, 1);
        // Arch/lintel top — faction shape
        if (_dfc.doorShape === 'pointed') {
          fill(_dfc.trim[0] + 10, _dfc.trim[1] + 10, _dfc.trim[2] + 10);
          beginShape(); vertex(-bw / 2 + 2, -doorH + 14); vertex(0, -doorH + 2); vertex(bw / 2 - 2, -doorH + 14); endShape(CLOSE);
        } else if (_dfc.doorShape === 'rect') {
          fill(_dfc.accent[0], _dfc.accent[1], _dfc.accent[2], 120);
          rect(-bw / 2 + 2, -doorH, bw - 4, 4, 1);
        } else {
          fill(_dfc.trim[0] + 10, _dfc.trim[1] + 10, _dfc.trim[2] + 10);
          arc(0, -doorH + 10, bw - 4, 18, PI, TWO_PI);
        }
        // Door interior
        fill(_dfc.door[0] - 50, _dfc.door[1] - 45, _dfc.door[2] - 33);
        rect(-bw / 2 + 4, -doorH + 4, bw - 8, doorH - 8, 1);
        if (_dfc.doorShape === 'arch') {
          fill(_dfc.door[0] - 60, _dfc.door[1] - 53, _dfc.door[2] - 39);
          arc(0, -doorH + 10, bw - 10, 14, PI, TWO_PI);
        }
        // Door planks
        stroke(_dfc.door[0] - 23, _dfc.door[1] - 16, _dfc.door[2] + 4, 100);
        strokeWeight(0.6);
        line(-2, -doorH + 6, -2, -4);
        line(4, -doorH + 6, 4, -4);
        noStroke();
        // Ring handle
        stroke(120, 115, 105); strokeWeight(1.5); noFill();
        arc(bw / 6, -10, 5, 6, 0, PI); noStroke();
        // Keystone
        fill(_dfc.trim[0] + 15, _dfc.trim[1] + 12, _dfc.trim[2] + 2);
        beginShape(); vertex(-3, -doorH + 2); vertex(3, -doorH + 2); vertex(2, -doorH - 2); vertex(-2, -doorH - 2); endShape(CLOSE);
        fill(0, 0, 0, 25);
        rect(-bw / 2 + 1, -1, bw, 3, 1);
        break;
      }

      case 'chest':
        // Roman strongbox (arca) — slightly open, bronze-bound
        noStroke();
        // Shadow
        fill(0, 0, 0, 25);
        rect(-(bw + 4) / 2, bh * 0.3 - 2, bw + 4, 4);
        // Body — dark stained wood with grain
        fill(65, 42, 18);
        rect(-bw / 2, -bh / 2, bw, bh * 0.6, 2);
        // Wood grain lines
        fill(58, 36, 14, 60);
        rect(-bw / 2 + 2, -bh / 2 + 2, bw - 4, 1);
        rect(-bw / 2 + 2, -bh / 2 + 5, bw - 4, 1);
        // Lid — slightly open (tilted up)
        fill(75, 52, 24);
        beginShape();
        vertex(-bw / 2 - 1, -bh / 2 - 2);
        vertex(bw / 2 + 1, -bh / 2 - 2);
        vertex(bw / 2, -bh / 2 - 10);
        vertex(-bw / 2, -bh / 2 - 8);
        endShape(CLOSE);
        // Lid top surface visible (the gap)
        fill(85, 62, 30);
        beginShape();
        vertex(-bw / 2, -bh / 2 - 8);
        vertex(bw / 2, -bh / 2 - 10);
        vertex(bw / 2 - 2, -bh / 2 - 11);
        vertex(-bw / 2 + 2, -bh / 2 - 9);
        endShape(CLOSE);
        // Bronze bands on body
        fill(160, 130, 55);
        rect(-bw / 2 - 1, -bh / 2 - 2, bw + 2, 2);
        rect(-bw / 2 - 1, -bh / 2 + bh * 0.25, bw + 2, 2);
        // Bronze band on lid
        fill(165, 135, 58);
        rect(-bw / 2, -bh / 2 - 6, bw, 1.5);
        // Bronze corner rivets
        fill(175, 145, 65);
        circle(-bw / 2 + 2, -bh / 2 + 1, 4);
        circle(bw / 2 - 2, -bh / 2 + 1, 4);
        circle(-bw / 2 + 2, -bh / 2 + bh * 0.25 + 1, 3);
        circle(bw / 2 - 2, -bh / 2 + bh * 0.25 + 1, 3);
        // Lock plate — ornate
        fill(180, 150, 65);
        rect(-3, -bh / 2 - 4, 6, 6, 1);
        fill(140, 110, 40);
        circle(0, -bh / 2 - 1, 2.5);
        // Treasure glow from the gap — golden light spilling out
        let chestGlow = 45 + sin(frameCount * 0.05 + b.x * 0.1) * 25;
        fill(255, 200, 60, chestGlow);
        rect(-bw / 2 + 2, -bh / 2 - 2, bw - 4, 2, 1);
        // Extra warm glow above lid gap
        fill(255, 210, 80, chestGlow * 0.4);
        rect(-bw / 4, -bh / 2 - 3, bw / 2, 1);
        break;

      case 'bridge':
        // Roman stone bridge — arched with balustrade
        noStroke();
        // Shadow
        fill(0, 0, 0, 35);
        rect(-bw / 2 + 2, -bh / 2 + 3, bw, bh + 1, 2);
        // Main deck — stone — faction
        fill(fc.trim[0], fc.trim[1], fc.trim[2]);
        rect(-bw / 2, -bh / 2, bw, bh, 2);
        // Stone block lines
        stroke(fc.trim[0] - 20, fc.trim[1] - 20, fc.trim[2] - 20, 70);
        strokeWeight(0.5);
        for (let pl = -bh / 2 + 5; pl < bh / 2; pl += 7) {
          line(-bw / 2 + 1, pl, bw / 2 - 1, pl);
        }
        noStroke();
        // Side walls
        fill(fc.trim[0] + 5, fc.trim[1] + 5, fc.trim[2] + 5);
        rect(-bw / 2, -bh / 2 - 6, bw, 6, 1);
        // Coping stones on top
        fill(fc.column[0], fc.column[1], fc.column[2]);
        rect(-bw / 2, -bh / 2 - 8, bw, 3, 1);
        // Drain holes (decorative)
        fill(fc.trim[0] - 85, fc.trim[1] - 88, fc.trim[2] - 87);
        circle(-bw / 4, -bh / 2 - 3, 3);
        circle(bw / 4, -bh / 2 - 3, 3);
        break;

      case 'fence':
        // Balustrade — low fence with columns — faction
        noStroke();
        // Base rail
        fill(fc.trim[0], fc.trim[1], fc.trim[2]);
        rect(-bw / 2, 0, bw, 4, 1);
        // Top rail
        fill(fc.trim[0] + 10, fc.trim[1] + 10, fc.trim[2] + 10);
        rect(-bw / 2, -14, bw, 3, 1);
        // Mini columns (balusters)
        fill(fc.column[0], fc.column[1], fc.column[2]);
        for (let i = 0; i < 4; i++) {
          let cx = -bw / 2 + 4 + i * (bw - 8) / 3;
          rect(cx - 1.5, -11, 3, 11);
          rect(cx - 2, -7, 4, 4);
        }
        // End posts — taller with caps
        fill(fc.column[0] + 10, fc.column[1] + 10, fc.column[2] + 10);
        rect(-bw / 2 - 1, -18, 5, 22, 1);
        rect(bw / 2 - 4, -18, 5, 22, 1);
        // Post caps
        fill(fc.column[0] + 20, fc.column[1] + 20, fc.column[2] + 20);
        rect(-bw / 2 - 2, -20, 7, 3, 1);
        rect(bw / 2 - 5, -20, 7, 3, 1);
        break;

      case 'torch':
        // Roman standing brazier — bronze fire bowl on tripod
        noStroke();
        // Tripod legs
        fill(140, 110, 50);
        beginShape(); vertex(-1, 0); vertex(-6, 16); vertex(-4, 16); vertex(0, 2); endShape(CLOSE);
        beginShape(); vertex(1, 0); vertex(6, 16); vertex(4, 16); vertex(0, 2); endShape(CLOSE);
        // Front leg
        fill(130, 100, 45);
        rect(-1.5, 0, 3, 16, 1);
        // Bronze bowl
        fill(175, 140, 55);
        arc(0, -2, 14, 8, 0, PI, PIE);
        fill(160, 125, 48);
        ellipse(0, -2, 14, 5);
        // Fire (animated)
        let flicker = sin(frameCount * 0.3 + b.x * 0.7) * 2;
        let flicker2 = cos(frameCount * 0.4 + b.y * 0.5) * 1.5;
        // Outer glow
        for (let gr = 28; gr > 0; gr -= 3) {
          fill(255, 120, 20, 6);
          circle(0, -6, gr);
        }
        // Fire body — layered
        fill(255, 80, 20, 180);
        beginShape();
        vertex(flicker * 0.3, -20 + flicker);
        vertex(-5, -4);
        vertex(5, -4);
        endShape(CLOSE);
        fill(255, 160, 40, 200);
        beginShape();
        vertex(flicker2 * 0.4, -16 + flicker * 0.6);
        vertex(-3.5, -4);
        vertex(3.5, -4);
        endShape(CLOSE);
        fill(255, 220, 80, 220);
        beginShape();
        vertex(0, -12 + flicker * 0.3);
        vertex(-2, -4);
        vertex(2, -4);
        endShape(CLOSE);
        // Embers
        fill(255, 200, 60, 150);
        circle(flicker * 0.5, -5, 2);
        circle(-flicker2 * 0.3, -3, 1.5);
        break;

      case 'flower':
        // Roman garden rose bush
        noStroke();
        // Leaves/bush base
        fill(40, 75, 25);
        ellipse(0, 2, 14, 8);
        fill(50, 85, 30);
        ellipse(-2, 0, 10, 7);
        ellipse(3, 1, 10, 6);
        // Stems
        stroke(45, 70, 22);
        strokeWeight(0.7);
        line(-3, -2, -4, -8);
        line(1, -1, 2, -9);
        line(4, 0, 6, -6);
        noStroke();
        // Roses — deterministic color
        let petals = [[200, 60, 80], [255, 180, 100], [180, 100, 180]][(floor(b.x * 7) % 3)];
        // Rose 1
        fill(petals[0], petals[1], petals[2], 220);
        circle(-4, -9, 5);
        fill(petals[0] + 30, petals[1] + 20, petals[2] + 20, 160);
        circle(-3.5, -9.5, 2.5);
        // Rose 2
        fill(petals[0], petals[1], petals[2], 200);
        circle(2, -10, 4.5);
        fill(petals[0] + 30, petals[1] + 20, petals[2] + 20, 140);
        circle(2.5, -10.5, 2);
        // Rose 3
        fill(petals[0] - 15, petals[1] - 10, petals[2] - 10, 180);
        circle(6, -7, 4);
        break;

      case 'lantern':
        // Roman oil lamp on pedestal
        noStroke();
        // Pedestal base
        fill(175, 168, 155);
        rect(-5, 8, 10, 4, 1);
        fill(185, 178, 165);
        rect(-4, 5, 8, 4, 1);
        // Column shaft
        fill(180, 173, 160);
        rect(-2, -10, 4, 16, 1);
        // Capital
        fill(190, 183, 170);
        rect(-4, -12, 8, 3, 1);
        // Oil lamp on top
        fill(170, 130, 55);
        ellipse(0, -14, 10, 5);
        fill(155, 118, 48);
        ellipse(4, -14, 4, 3); // spout
        // Flame
        let lampBright = getSkyBrightness();
        let lampStr = map(lampBright, 0, 1, 1, 0.25);
        // Glow
        for (let gr = 24; gr > 0; gr -= 3) {
          fill(255, 180, 60, 5 * lampStr);
          circle(4, -18, gr);
        }
        fill(255, 200, 60, 200 * lampStr);
        let lf = sin(frameCount * 0.25 + b.x) * 1;
        beginShape();
        vertex(4 + lf * 0.3, -22 + lf);
        vertex(2, -16);
        vertex(6, -16);
        endShape(CLOSE);
        fill(255, 240, 150, 160 * lampStr);
        circle(4, -17, 2);
        break;

      case 'mosaic':
        // Roman mosaic floor — detailed geometric pattern
        noStroke();
        // Base tile
        fill(195, 188, 172);
        rect(-16, -16, 32, 32, 1);
        // Outer border — terracotta
        fill(165, 80, 50, 180);
        rect(-16, -16, 32, 2);
        rect(-16, 14, 32, 2);
        rect(-16, -16, 2, 32);
        rect(14, -16, 2, 32);
        // Inner border — navy
        fill(40, 50, 100, 160);
        rect(-13, -13, 26, 2);
        rect(-13, 11, 26, 2);
        rect(-13, -13, 2, 26);
        rect(11, -13, 2, 26);
        // Geometric diamond pattern
        let mColors = [[165, 45, 35], [35, 50, 110], [190, 170, 55], [180, 90, 45]];
        for (let mx = -10; mx <= 6; mx += 6) {
          for (let my = -10; my <= 6; my += 6) {
            let ci = abs((mx + my + 20) / 6) % 4;
            let mc = mColors[floor(ci)];
            fill(mc[0], mc[1], mc[2], 200);
            // Diamond shape
            beginShape();
            vertex(mx + 2, my); vertex(mx + 4, my + 2);
            vertex(mx + 2, my + 4); vertex(mx, my + 2);
            endShape(CLOSE);
          }
        }
        // Center medallion — sun motif
        fill(200, 165, 50);
        circle(0, 0, 9);
        fill(220, 185, 60);
        circle(0, 0, 6);
        // Sun rays
        stroke(200, 165, 50, 180);
        strokeWeight(0.8);
        for (let r = 0; r < 8; r++) {
          let ra = r * TWO_PI / 8;
          line(cos(ra) * 3, sin(ra) * 3, cos(ra) * 5.5, sin(ra) * 5.5);
        }
        noStroke();
        fill(170, 55, 35);
        circle(0, 0, 3);
        break;

      case 'aqueduct':
        // Aqueduct — arched stone construction — faction
        noStroke();
        // Shadow
        fill(0, 0, 0, 25);
        rect(-15, 2, 30, 10, 1);
        // Pillars with slight taper
        fill(fc.column[0], fc.column[1], fc.column[2]);
        beginShape();
        vertex(-14, 10); vertex(-12, -10); vertex(-8, -10); vertex(-10, 10);
        endShape(CLOSE);
        beginShape();
        vertex(10, 10); vertex(8, -10); vertex(12, -10); vertex(14, 10);
        endShape(CLOSE);
        // Pillar highlight
        fill(fc.column[0] + 10, fc.column[1] + 5, fc.column[2] + 5, 80);
        rect(-13, -8, 2, 16);
        rect(9, -8, 2, 16);
        // Arch — semicircular
        fill(fc.trim[0], fc.trim[1], fc.trim[2]);
        arc(0, 0, 20, 16, PI, TWO_PI, PIE);
        // Arch interior — dark
        fill(50, 62, 35);
        arc(0, 0, 16, 12, PI, TWO_PI, PIE);
        // Keystone
        fill(fc.column[0] + 10, fc.column[1] + 10, fc.column[2] + 8);
        beginShape();
        vertex(-2, -8); vertex(2, -8); vertex(2.5, -5); vertex(-2.5, -5);
        endShape(CLOSE);
        // Water channel on top
        fill(fc.trim[0] - 5, fc.trim[1] - 5, fc.trim[2] - 5);
        rect(-16, -12, 32, 4, 1);
        // Capstone
        fill(fc.column[0] + 5, fc.column[1] + 5, fc.column[2] + 5);
        rect(-16, -14, 32, 2.5, 1);
        // Water flowing in channel
        let waterPhase = frameCount * 0.06 + b.x * 0.1;
        fill(55, 110, 170, 140);
        rect(-14, -11.5, 28, 2, 1);
        // Water shimmer
        fill(80, 150, 200, 60 + sin(waterPhase) * 25);
        rect(-10, -11.5, 8, 1.5, 1);
        rect(4, -11.5, 8, 1.5, 1);
        break;
      case 'bath':
        // Bath house — grand heated pool with steam — faction
        noStroke();
        // Shadow
        fill(0, 0, 0, 30);
        rect(-bw / 2 + 3, bh / 2 - 3, bw, 7);
        // Foundation — lower step
        fill(fc.trim[0] - 20, fc.trim[1] - 23, fc.trim[2] - 27);
        rect(-bw / 2 + 2, bh / 2 - 8, bw - 4, 8, 1);
        // Main building body
        fill(fc.wall[0], fc.wall[1], fc.wall[2]);
        rect(-bw / 2, -bh / 2 + 12, bw, bh - 12, 1);
        // Stone course texture
        stroke(fc.wall[0] - 18, fc.wall[1] - 18, fc.wall[2] - 17, 45);
        strokeWeight(0.5);
        for (let bly = -bh / 2 + 18; bly < bh / 2 - 10; bly += 6) {
          line(-bw / 2 + 1, bly, bw / 2 - 1, bly);
        }
        noStroke();
        // Blue pool — main feature, large and prominent
        fill(42, 105, 162, 195);
        rect(-bw / 2 + 12, -bh / 2 + 22, bw - 24, bh - 42, 3);
        // Pool shimmer
        let bathPhase2 = frameCount * 0.04 + b.x * 0.1;
        fill(75, 148, 210, 55 + sin(bathPhase2) * 28);
        rect(-bw / 2 + 16, -bh / 2 + 26, 16, 4, 2);
        fill(90, 165, 225, 35 + sin(bathPhase2 * 1.4) * 18);
        rect(-bw / 2 + 36, -bh / 2 + 30, 12, 3, 2);
        // Pool ripple highlight
        fill(120, 185, 230, 25 + sin(bathPhase2 * 0.9) * 12);
        rect(-bw / 2 + 14, -bh / 2 + 28, bw - 30, 2);
        // 4 entrance columns — faction
        fill(fc.column[0], fc.column[1], fc.column[2]);
        let bathCols = [-bw/2 + 4, -bw/2 + 4 + (bw-8)/3, -bw/2 + 4 + 2*(bw-8)/3, bw/2 - 4];
        bathCols.forEach(bcx => {
          rect(bcx - 3, -bh / 2 + 2, 6, 22, 1);
          fill(fc.column[0] + 10, fc.column[1] + 10, fc.column[2] + 10);
          rect(bcx - 4, -bh / 2 + 1, 8, 3, 1);  // capital
          fill(fc.column[0], fc.column[1], fc.column[2]);
          rect(bcx - 3.5, -bh / 2 + 22, 7, 2, 1); // base
          fill(fc.column[0], fc.column[1], fc.column[2]);
        });
        // Entablature
        fill(fc.trim[0] - 5, fc.trim[1] - 6, fc.trim[2] - 10);
        rect(-bw / 2 + 2, -bh / 2 + 8, bw - 4, 6, 1);
        // Pediment
        fill(fc.roof[0], fc.roof[1], fc.roof[2]);
        beginShape();
        vertex(-bw / 2 + 2, -bh / 2 + 8);
        vertex(0, -bh / 2 - 6);
        vertex(bw / 2 - 2, -bh / 2 + 8);
        endShape(CLOSE);
        // Steam particles — multiple rising columns
        {
          let steamAlpha = map(getSkyBrightness(), 0.2, 1.0, 50, 18);
          for (let si3 = 0; si3 < 4; si3++) {
            let sPhase3 = frameCount * 0.018 + si3 * 2.4 + b.x * 0.007;
            for (let sp3 = 0; sp3 < 5; sp3++) {
              let sFrac3 = sp3 / 4;
              let sx3 = -bw / 2 + 18 + si3 * (bw - 32) / 3 + floor(sin(sPhase3 + sp3 * 0.6) * (1.5 + sp3));
              let sy3 = -bh / 2 + 20 - floor(sp3 * 8 + (frameCount * 0.5 + si3 * 20) % 32);
              let sSize = 2 + floor(sFrac3 * 2);
              let sa3 = steamAlpha * (1 - sFrac3 * 0.8);
              fill(230, 235, 240, sa3);
              noStroke();
              rect(sx3, sy3, sSize, sSize);
            }
          }
        }
        // Steps to entrance
        fill(fc.trim[0] - 10, fc.trim[1] - 10, fc.trim[2] - 13);
        rect(-12, bh / 2 - 10, 24, 4, 1);
        rect(-10, bh / 2 - 6, 20, 3, 1);
        // Night: blue pool glow
        if (getSkyBrightness() < 0.35) {
          let bathNight = map(getSkyBrightness(), 0, 0.35, 1, 0);
          fill(40, 100, 175, 30 * bathNight);
          rect(-bw / 2 + 10, -bh / 2 + 20, bw - 22, bh - 40);
          fill(255, 190, 80, 40 * bathNight);
          rect(-bw / 2 + 14, -bh / 2 + 16, 8, 5);
          rect(bw / 2 - 22, -bh / 2 + 16, 8, 5);
        }
        break;

      case 'granary':
        // Granary — raised storage with tiled roof — faction
        noStroke();
        fill(0, 0, 0, 30);
        rect(-bw / 2 + 2, bh / 2 - 4, bw, 6);
        // Stilts
        fill(fc.trim[0] - 20, fc.trim[1] - 23, fc.trim[2] - 27);
        for (let gi = 0; gi < 4; gi++) {
          let gpx = -bw / 2 + 5 + gi * (bw - 10) / 3;
          rect(gpx - 2, bh / 2 - 8, 4, 8, 1);
        }
        // Body
        fill(fc.wall[0], fc.wall[1], fc.wall[2]);
        rect(-bw / 2, -bh / 2 + 6, bw, bh - 14, 2);
        stroke(fc.wall[0] - 20, fc.wall[1] - 20, fc.wall[2] - 20, 60);
        strokeWeight(0.5);
        for (let gy = -bh / 2 + 12; gy < bh / 2 - 12; gy += 6) {
          line(-bw / 2 + 2, gy, bw / 2 - 2, gy);
        }
        noStroke();
        // Ventilation slots
        fill(fc.window[0], fc.window[1], fc.window[2], 160);
        for (let gv = 0; gv < 3; gv++) {
          let gvx = -bw / 2 + 10 + gv * (bw - 16) / 2;
          rect(gvx, -bh / 2 + 14, 6, 3);
          rect(gvx, -bh / 2 + 22, 6, 3);
        }
        // Roof — faction
        fill(fc.roof[0], fc.roof[1], fc.roof[2]);
        beginShape();
        vertex(-bw / 2 - 2, -bh / 2 + 8);
        vertex(0, -bh / 2 - 4);
        vertex(bw / 2 + 2, -bh / 2 + 8);
        endShape(CLOSE);
        stroke(fc.roof[0] - 25, fc.roof[1] - 15, fc.roof[2] - 13, 80);
        strokeWeight(0.7);
        for (let rt = 1; rt < 5; rt++) {
          let rty = -bh / 2 + 8 - rt * 2.5;
          let rw2 = (bw + 4) * (1 - rt / 6) / 2;
          line(-rw2, rty, rw2, rty);
        }
        noStroke();
        fill(fc.roof[0] + 10, fc.roof[1] + 15, fc.roof[2] + 10);
        rect(-3, -bh / 2 - 5, 6, 3, 1);
        // Door with wheat symbol
        fill(fc.door[0], fc.door[1], fc.door[2]);
        rect(-4, -bh / 2 + 28, 8, 10, 1);
        fill(190, 155, 55, 140);
        circle(-2, -bh / 2 + 28, 4);
        circle(2, -bh / 2 + 28, 4);
        circle(0, -bh / 2 + 26, 4);
        break;

      case 'well':
        // Roman stone well with rope and bucket
        noStroke();
        // Ground shadow
        fill(0, 0, 0, 25);
        ellipse(0, bh / 2 - 2, bw * 0.9, 5);
        // Cobblestone surround
        fill(fc.trim[0] - 25, fc.trim[1] - 25, fc.trim[2] - 22);
        ellipse(0, bh / 2 - 4, bw + 4, 10);
        // Small cobblestones around base
        fill(fc.trim[0] - 18, fc.trim[1] - 18, fc.trim[2] - 15, 120);
        rect(-bw / 2 - 1, bh / 2 - 6, 3, 2, 1);
        rect(bw / 2 - 2, bh / 2 - 5, 3, 2, 1);
        rect(-3, bh / 2 - 3, 2, 2, 1);
        rect(2, bh / 2 - 4, 2, 2, 1);
        // Circular stone rim (ellipse)
        fill(fc.trim[0] - 10, fc.trim[1] - 10, fc.trim[2] - 10);
        ellipse(0, bh / 2 - 6, bw - 4, 8);
        // Stone shaft
        fill(fc.wall[0] - 10, fc.wall[1] - 10, fc.wall[2] - 3);
        rect(-bw / 2 + 2, -bh / 4, bw - 4, bh * 0.75, 2);
        // Stone course lines
        stroke(fc.wall[0] - 40, fc.wall[1] - 40, fc.wall[2] - 30, 70);
        strokeWeight(0.6);
        for (let wl = -bh / 4 + 5; wl < bh / 2 - 6; wl += 5) {
          line(-bw / 2 + 3, wl, bw / 2 - 3, wl);
        }
        noStroke();
        // Stone rim cap
        fill(fc.trim[0] + 10, fc.trim[1] + 10, fc.trim[2] + 10);
        rect(-bw / 2 + 1, -bh / 4 - 2, bw - 2, 4, 1);
        // Dark water with shimmer
        fill(35, 65, 95, 200);
        ellipse(0, -bh / 4 + 2, bw - 10, 5);
        fill(50, 90, 130, 80);
        ellipse(-3, -bh / 4 + 1, 8, 2);
        // Water shimmer flash
        let wellPhase = frameCount * 0.06 + b.x * 0.1;
        fill(120, 180, 220, 30 + sin(wellPhase) * 25);
        ellipse(sin(wellPhase * 0.5) * 2, -bh / 4 + 1.5, 4, 2);
        // Occasional white sparkle
        if (sin(wellPhase * 0.3) > 0.8) {
          fill(220, 240, 255, 120);
          circle(sin(wellPhase) * 3, -bh / 4 + 1, 1.5);
        }
        // Wooden crossbar
        fill(95, 68, 32);
        rect(-bw / 2 - 2, -bh / 2 - 2, bw + 4, 4, 1);
        // Upright posts
        fill(85, 60, 28);
        rect(-bw / 2, -bh / 2 - 2, 4, bh / 4 + 4, 1);
        rect(bw / 2 - 4, -bh / 2 - 2, 4, bh / 4 + 4, 1);
        // Rope dangling with sway
        stroke(130, 100, 48);
        strokeWeight(0.8);
        let ropeSway = sin(frameCount * 0.02 + b.x * 0.05) * 1;
        line(0, -bh / 2, ropeSway, -bh / 4 - 2);
        noStroke();
        // Bucket (small trapezoid)
        fill(90, 62, 25);
        beginShape();
        vertex(-3 + ropeSway, -bh / 2 - 4);
        vertex(3 + ropeSway, -bh / 2 - 4);
        vertex(4 + ropeSway, -bh / 2);
        vertex(-4 + ropeSway, -bh / 2);
        endShape(CLOSE);
        // Bucket bands
        fill(140, 115, 55);
        rect(-3 + ropeSway, -bh / 2 - 3, 6, 1);
        rect(-3 + ropeSway, -bh / 2 - 1, 6, 1);
        // Handle
        fill(120, 100, 48);
        rect(-1 + ropeSway, -bh / 2 - 5, 2, 2);
        break;

      case 'temple': {
        noStroke();
        let _tfc = fc;
        let _tFac = state.faction || 'rome';
        let _tGrand = (b.id === 'grand_temple');
        let _tPulse = sin(frameCount * 0.03 + b.x * 0.05);
        let _tGlow = 30 + _tPulse * 20;
        if (_tFac === 'rome') {
          // === ROME — Classical Temple ===
          fill(180, 175, 165);
          rect(-bw / 2 + 1, bh / 2 - 6, bw - 2, 3, 1);
          fill(190, 185, 175);
          rect(-bw / 2 + 3, bh / 2 - 11, bw - 6, 5, 1);
          fill(200, 195, 185);
          rect(-bw / 2 + 5, bh / 2 - 16, bw - 10, 5, 1);
          fill(210, 205, 195);
          rect(-bw / 2 + 2, -bh / 2 + 14, bw - 4, bh / 2 - 14, 1);
          fill(225, 220, 210);
          rect(-bw / 2 + 10, -bh / 2 + 6, bw - 20, bh / 2 + 2, 1);
          fill(235, 232, 225);
          for (let ci = 0; ci < 6; ci++) {
            let cx = -bw / 2 + 5 + ci * (bw - 10) / 5;
            rect(cx - 2, -bh / 2 + 8, 4, bh / 2 + 4, 1);
            stroke(215, 210, 200, 60); strokeWeight(0.4);
            line(cx - 0.8, -bh / 2 + 10, cx - 0.8, bh / 2 - 18);
            line(cx + 0.8, -bh / 2 + 10, cx + 0.8, bh / 2 - 18);
            noStroke();
            fill(240, 237, 230); rect(cx - 3.5, -bh / 2 + 6, 7, 3, 1);
            fill(220, 215, 205); rect(cx - 3, bh / 2 - 18, 6, 2, 1);
            fill(235, 232, 225);
          }
          fill(215, 210, 200); rect(-bw / 2 + 1, -bh / 2 + 3, bw - 2, 5, 1);
          fill(185, 100, 58);
          beginShape(); vertex(-bw / 2 + 2, -bh / 2 + 3); vertex(0, -bh / 2 - 10); vertex(bw / 2 - 2, -bh / 2 + 3); endShape(CLOSE);
          stroke(175, 28, 28); strokeWeight(0.8);
          line(-bw / 2 + 2, -bh / 2 + 3, 0, -bh / 2 - 10);
          line(0, -bh / 2 - 10, bw / 2 - 2, -bh / 2 + 3);
          noStroke();
          fill(210, 180, 60); ellipse(0, -bh / 2 - 5, 6, 5);
          fill(175, 28, 28); rect(-1.5, -bh / 2 - 7, 3, 2, 1);
          fill(95, 58, 24); rect(-5, -bh / 2 + 12, 10, 10, 1);
          arc(0, -bh / 2 + 12, 10, 6, PI, TWO_PI);
          fill(200, 160, 80, _tGlow); rect(-4, -bh / 2 + 14, 8, 7, 1);
          if (_tGrand) {
            fill(235, 232, 225, 120);
            for (let gi = 0; gi < 6; gi++) { let gx = -bw / 2 + 7 + gi * (bw - 14) / 5; rect(gx - 1.5, -bh / 2 + 10, 3, bh / 2, 1); }
            fill(220, 190, 50);
            beginShape(); vertex(-4, -bh / 2 - 12); vertex(0, -bh / 2 - 16); vertex(4, -bh / 2 - 12); endShape(CLOSE);
            ellipse(0, -bh / 2 - 12, 4, 3);
          }
        } else if (_tFac === 'carthage') {
          // === CARTHAGE — Temple of Tanit ===
          fill(212, 170, 95); rect(-bw / 2, -bh / 2 + 12, bw, bh / 2 - 6, 1);
          fill(200, 158, 82); rect(-bw / 2 + 2, bh / 2 - 6, bw - 4, 4, 1);
          fill(220, 180, 105); rect(-bw / 2, -bh / 2 + 8, bw, 6, 1);
          fill(230, 190, 115);
          for (let ci = 0; ci < 5; ci++) { rect(-bw / 2 + 3 + ci * (bw - 6) / 5, -bh / 2 + 5, (bw - 6) / 7, 4, 1); }
          fill(240, 230, 208);
          rect(-bw / 2 + 3, -bh / 2 + 2, 5, bh / 2 + 8, 1);
          rect(bw / 2 - 8, -bh / 2 + 2, 5, bh / 2 + 8, 1);
          fill(100, 40, 140);
          arc(-bw / 2 + 5.5, -bh / 2 + 5, 4, 4, PI + 0.3, TWO_PI - 0.3);
          arc(bw / 2 - 5.5, -bh / 2 + 5, 4, 4, PI + 0.3, TWO_PI - 0.3);
          fill(120, 50, 160, 140);
          rect(-bw / 2 + 9, -bh / 2 + 10, 3, bh / 2 - 4, 1);
          rect(bw / 2 - 12, -bh / 2 + 10, 3, bh / 2 - 4, 1);
          fill(200, 170, 50, 100);
          rect(-bw / 2 + 9, -bh / 2 + 10, 3, 2, 1);
          rect(bw / 2 - 12, -bh / 2 + 10, 3, 2, 1);
          fill(80, 60, 40);
          rect(-bw / 2 - 2, bh / 2 - 14, 5, 8, 1);
          rect(bw / 2 - 3, bh / 2 - 14, 5, 8, 1);
          fill(255, 140, 30, 150 + _tPulse * 40);
          ellipse(-bw / 2, bh / 2 - 16, 6, 5); ellipse(bw / 2, bh / 2 - 16, 6, 5);
          fill(255, 200, 50, 100 + _tPulse * 30);
          ellipse(-bw / 2, bh / 2 - 18, 4, 3); ellipse(bw / 2, bh / 2 - 18, 4, 3);
          fill(200, 170, 50);
          beginShape(); vertex(-4, -bh / 2 + 4); vertex(0, -bh / 2 - 2); vertex(4, -bh / 2 + 4); endShape(CLOSE);
          ellipse(0, -bh / 2 - 4, 4, 4); rect(-0.5, -bh / 2 - 1, 1, 3);
          stroke(200, 170, 50); strokeWeight(0.6); line(-3, -bh / 2, 3, -bh / 2); noStroke();
          fill(74, 48, 32); rect(-5, -bh / 2 + 14, 10, 10, 1);
          fill(200, 160, 80, _tGlow); rect(-4, -bh / 2 + 16, 8, 7, 1);
          if (_tGrand) {
            fill(120, 50, 160, 80); rect(-bw / 2 + 1, -bh / 2 + 9, bw - 2, 2, 1);
            fill(255, 140, 30, 100 + _tPulse * 50);
            ellipse(-bw / 2, bh / 2 - 20, 8, 6); ellipse(bw / 2, bh / 2 - 20, 8, 6);
          }
        } else if (_tFac === 'egypt') {
          // === EGYPT — Temple of Ra ===
          fill(232, 200, 114);
          beginShape(); vertex(-bw / 2 + 2, bh / 2 - 4); vertex(-bw / 2 + 8, -bh / 2 + 6); vertex(bw / 2 - 8, -bh / 2 + 6); vertex(bw / 2 - 2, bh / 2 - 4); endShape(CLOSE);
          fill(210, 180, 100); rect(-bw / 2, bh / 2 - 6, bw, 4, 1);
          fill(245, 240, 224);
          rect(-bw / 2 - 1, -bh / 2 - 4, 4, bh / 2 + 14, 1);
          rect(bw / 2 - 3, -bh / 2 - 4, 4, bh / 2 + 14, 1);
          fill(220, 190, 50);
          beginShape(); vertex(-bw / 2 - 1, -bh / 2 - 4); vertex(-bw / 2 + 1, -bh / 2 - 8); vertex(-bw / 2 + 3, -bh / 2 - 4); endShape(CLOSE);
          beginShape(); vertex(bw / 2 - 3, -bh / 2 - 4); vertex(bw / 2 - 1, -bh / 2 - 8); vertex(bw / 2 + 1, -bh / 2 - 4); endShape(CLOSE);
          fill(64, 176, 160, 160);
          rect(-8, -bh / 2 + 10, 2, 2); rect(-4, -bh / 2 + 10, 2, 2); rect(2, -bh / 2 + 10, 2, 2); rect(6, -bh / 2 + 10, 2, 2);
          fill(200, 170, 40, 140);
          rect(-6, -bh / 2 + 14, 2, 2); rect(0, -bh / 2 + 14, 2, 2); rect(4, -bh / 2 + 14, 2, 2);
          fill(220, 190, 50); ellipse(0, -bh / 2 + 4, 8, 7);
          fill(255, 220, 80, 140 + _tPulse * 40); ellipse(0, -bh / 2 + 4, 6, 5);
          fill(245, 240, 224);
          for (let ci = 0; ci < 3; ci++) {
            let cx = -12 + ci * 12;
            rect(cx - 1.5, -bh / 2 + 8, 3, bh / 2 + 2, 1);
            fill(64, 176, 160, 140);
            beginShape(); vertex(cx - 4, -bh / 2 + 8); vertex(cx, -bh / 2 + 4); vertex(cx + 4, -bh / 2 + 8); endShape(CLOSE);
            fill(245, 240, 224);
          }
          fill(58, 58, 74); rect(-5, -bh / 2 + 16, 10, 10, 1);
          fill(200, 160, 80, _tGlow); rect(-4, -bh / 2 + 18, 8, 7, 1);
          if (_tGrand) {
            fill(220, 190, 50, 80); ellipse(0, -bh / 2 + 4, 12, 10);
            fill(64, 176, 160, 100); rect(-14, -bh / 2 + 10, 2, 2); rect(12, -bh / 2 + 10, 2, 2);
          }
        } else if (_tFac === 'greece') {
          // === GREECE — Parthenon-style ===
          fill(220, 220, 228); rect(-bw / 2 + 1, bh / 2 - 6, bw - 2, 3, 1);
          fill(228, 228, 236); rect(-bw / 2 + 3, bh / 2 - 11, bw - 6, 5, 1);
          fill(235, 235, 242); rect(-bw / 2 + 2, -bh / 2 + 14, bw - 4, bh / 2 - 14, 1);
          fill(240, 240, 248); rect(-bw / 2 + 10, -bh / 2 + 6, bw - 20, bh / 2, 1);
          fill(242, 242, 250);
          for (let ci = 0; ci < 8; ci++) {
            let cx = -bw / 2 + 4 + ci * (bw - 8) / 7;
            rect(cx - 1.5, -bh / 2 + 8, 3, bh / 2 + 4, 1);
            fill(240, 240, 248); rect(cx - 3.5, -bh / 2 + 6, 7, 2.5, 1);
            fill(80, 144, 192, 120); circle(cx - 3, -bh / 2 + 7, 2.5); circle(cx + 3, -bh / 2 + 7, 2.5);
            fill(242, 242, 250);
          }
          fill(230, 230, 238); rect(-bw / 2 + 1, -bh / 2 + 3, bw - 2, 5, 1);
          fill(208, 112, 64);
          beginShape(); vertex(-bw / 2 + 2, -bh / 2 + 3); vertex(0, -bh / 2 - 10); vertex(bw / 2 - 2, -bh / 2 + 3); endShape(CLOSE);
          fill(80, 144, 192, 140);
          ellipse(-8, -bh / 2, 4, 3); ellipse(0, -bh / 2 - 3, 4, 3); ellipse(8, -bh / 2, 4, 3);
          fill(90, 140, 60, 180); ellipse(0, -bh / 2 + 1, 8, 6);
          fill(208, 112, 64); ellipse(0, -bh / 2 + 1, 4, 3);
          fill(90, 65, 40); rect(-5, -bh / 2 + 14, 10, 10, 1);
          arc(0, -bh / 2 + 14, 10, 6, PI, TWO_PI);
          fill(200, 160, 80, _tGlow); rect(-4, -bh / 2 + 16, 8, 7, 1);
          if (_tGrand) {
            fill(242, 242, 250, 120);
            for (let gi = 0; gi < 4; gi++) { let gx = -bw / 2 + 8 + gi * (bw - 16) / 3; rect(gx - 1, -bh / 2 + 10, 2, bh / 2, 1); }
            fill(90, 140, 60, 120); ellipse(0, -bh / 2 - 10, 6, 5);
          }
        } else if (_tFac === 'seapeople') {
          // === SEA PEOPLE — Driftwood Shrine ===
          fill(90, 72, 48); rect(-bw / 2 + 2, bh / 2 - 6, bw - 4, 4, 1);
          fill(210, 205, 195);
          rect(-bw / 2 + 4, -bh / 2 + 4, 4, bh / 2 + 8, 1);
          rect(bw / 2 - 8, -bh / 2 + 4, 4, bh / 2 + 8, 1);
          arc(-bw / 2 + 6, -bh / 2 + 6, 8, 8, PI, PI + HALF_PI);
          arc(bw / 2 - 6, -bh / 2 + 6, 8, 8, PI + HALF_PI, TWO_PI);
          fill(75, 58, 35);
          beginShape(); vertex(-bw / 4, bh / 2 - 4); vertex(-bw / 4 - 4, -bh / 2 + 12); vertex(0, -bh / 2 + 6); vertex(bw / 4 + 4, -bh / 2 + 12); vertex(bw / 4, bh / 2 - 4); endShape(CLOSE);
          fill(100, 82, 55);
          rect(-bw / 2 + 2, -bh / 2 + 2, bw - 4, 3, 1);
          rect(-bw / 2 + 6, -bh / 2 + 10, bw - 12, 2, 1);
          stroke(140, 120, 80, 100); strokeWeight(0.4);
          for (let ni = 0; ni < 5; ni++) { let nx = -bw / 4 + ni * bw / 8; line(nx, -bh / 2 + 3, nx + 1, -bh / 2 + 9); line(nx + 1, -bh / 2 + 3, nx, -bh / 2 + 9); }
          noStroke();
          fill(230, 220, 200, 160);
          circle(-bw / 4 + 2, -bh / 2 + 8, 2); circle(bw / 4 - 2, -bh / 2 + 8, 2); circle(0, -bh / 2 + 5, 2);
          fill(42, 138, 106);
          rect(-0.5, -bh / 2 - 2, 1, 6); rect(-3, -bh / 2 - 4, 1, 3); rect(2, -bh / 2 - 4, 1, 3); rect(-0.5, -bh / 2 - 4, 1, 2);
          fill(40, 35, 25); rect(-4, -bh / 2 + 14, 8, 10, 1);
          fill(200, 160, 80, _tGlow * 0.7); rect(-3, -bh / 2 + 16, 6, 7, 1);
          if (_tGrand) {
            fill(210, 205, 195, 100); arc(0, -bh / 2 + 2, bw - 8, 10, PI, TWO_PI);
            fill(42, 138, 106, 140); rect(-0.5, -bh / 2 - 8, 1, 5);
          }
        } else if (_tFac === 'persia') {
          // === PERSIA — Fire Temple (Atash Behram) ===
          fill(220, 212, 195); rect(-bw / 2, bh / 2 - 6, bw, 4, 1);
          fill(230, 222, 205); rect(-bw / 2 + 3, bh / 2 - 12, bw - 6, 6, 1);
          fill(240, 232, 208); rect(-bw / 2 + 5, -bh / 2 + 10, bw - 10, bh / 2 - 4, 1);
          fill(245, 238, 218); rect(-8, -bh / 2 - 4, 16, bh / 2 + 18, 1);
          fill(80, 50, 30);
          rect(-bw / 2 + 7, -bh / 2 + 18, 7, 10, 1); arc(-bw / 2 + 10.5, -bh / 2 + 18, 7, 5, PI, TWO_PI);
          rect(bw / 2 - 14, -bh / 2 + 18, 7, 10, 1); arc(bw / 2 - 10.5, -bh / 2 + 18, 7, 5, PI, TWO_PI);
          fill(42, 74, 138, 160);
          for (let ti = 0; ti < 4; ti++) { rect(-6 + ti * 4, -bh / 2, 2, 2); rect(-4 + ti * 4, -bh / 2 + 3, 2, 2); }
          fill(212, 160, 48, 160);
          for (let ti = 0; ti < 3; ti++) { rect(-4 + ti * 4, -bh / 2, 2, 2); rect(-6 + ti * 4, -bh / 2 + 3, 2, 2); }
          fill(255, 140, 30, 180 + _tPulse * 50); ellipse(0, -bh / 2 - 6, 8, 8);
          fill(255, 200, 50, 150 + _tPulse * 40); ellipse(0, -bh / 2 - 8, 5, 6);
          fill(255, 240, 120, 100 + _tPulse * 30); ellipse(0, -bh / 2 - 9, 3, 4);
          fill(212, 160, 48); ellipse(0, -bh / 2 + 8, 6, 4);
          beginShape(); vertex(-3, -bh / 2 + 8); vertex(-10, -bh / 2 + 5); vertex(-8, -bh / 2 + 9); endShape(CLOSE);
          beginShape(); vertex(3, -bh / 2 + 8); vertex(10, -bh / 2 + 5); vertex(8, -bh / 2 + 9); endShape(CLOSE);
          fill(80, 50, 30); rect(-4, -bh / 2 + 14, 8, 12, 1); arc(0, -bh / 2 + 14, 8, 5, PI, TWO_PI);
          fill(200, 160, 80, _tGlow); rect(-3, -bh / 2 + 16, 6, 9, 1);
          if (_tGrand) {
            fill(255, 140, 30, 120 + _tPulse * 60); ellipse(0, -bh / 2 - 10, 12, 12);
            fill(212, 160, 48, 100); rect(-bw / 2 + 5, -bh / 2 + 7, bw - 10, 2, 1);
          }
        } else if (_tFac === 'phoenicia') {
          // === PHOENICIA — Temple of Melqart ===
          fill(180, 170, 158); rect(-bw / 2, bh / 2 - 6, bw, 4, 1);
          fill(138, 16, 80); rect(-bw / 2 + 4, -bh / 2 + 8, bw - 8, bh / 2 - 2, 1);
          fill(170, 40, 100); rect(-bw / 2 + 8, -bh / 2 + 10, bw - 16, bh / 2 - 4, 1);
          fill(90, 130, 90); rect(-bw / 2 + 1, -bh / 2, 5, bh / 2 + 12, 1);
          fill(100, 140, 100); ellipse(-bw / 2 + 3.5, -bh / 2, 6, 4);
          fill(190, 170, 80); rect(bw / 2 - 6, -bh / 2, 5, bh / 2 + 12, 1);
          fill(200, 180, 90); ellipse(bw / 2 - 3.5, -bh / 2, 6, 4);
          fill(106, 74, 42); rect(-bw / 2 + 2, -bh / 2 + 6, bw - 4, 4, 1);
          fill(200, 190, 175); rect(-5, -bh / 2 - 6, 10, 14, 1);
          fill(230, 220, 200); rect(-4, -bh / 2 - 8, 8, 3, 1);
          fill(255, 200, 60, 140 + _tPulse * 40); ellipse(0, -bh / 2 - 9, 6, 5);
          fill(120, 90, 50);
          beginShape(); vertex(-8, bh / 2 - 8); vertex(-10, bh / 2 - 10); vertex(10, bh / 2 - 10); vertex(8, bh / 2 - 8); endShape(CLOSE);
          stroke(48, 112, 176, 120); strokeWeight(0.6);
          for (let wi = 0; wi < 4; wi++) { let wx = -10 + wi * 7; arc(wx, -bh / 2 + 18, 5, 3, PI, TWO_PI); }
          noStroke();
          fill(48, 112, 176, 160); rect(-0.5, -bh / 2 + 12, 1, 5); ellipse(0, -bh / 2 + 12, 3, 2);
          fill(80, 55, 30); rect(-4, -bh / 2 + 16, 8, 10, 1); arc(0, -bh / 2 + 16, 8, 5, PI, TWO_PI);
          fill(200, 160, 80, _tGlow); rect(-3, -bh / 2 + 18, 6, 7, 1);
          if (_tGrand) {
            fill(255, 200, 60, 120 + _tPulse * 50); ellipse(0, -bh / 2 - 12, 10, 8);
            fill(138, 16, 80, 100); rect(-bw / 2 + 4, -bh / 2 + 6, bw - 8, 2, 1);
          }
        } else if (_tFac === 'gaul') {
          // === GAUL — Sacred Grove / Dolmen ===
          fill(85, 100, 60); ellipse(0, bh / 2 - 4, bw - 2, 8);
          fill(130, 125, 115);
          for (let si = 0; si < 5; si++) {
            let sa = PI + si * PI / 4; let sx2 = cos(sa) * (bw / 2 - 6); let sy2 = sin(sa) * (bh / 2 - 10) * 0.5 - 4;
            rect(sx2 - 2, sy2, 4, 10, 1);
            fill(100, 95, 85, 120); circle(sx2, sy2 + 4, 2); fill(130, 125, 115);
          }
          fill(145, 138, 125); rect(-12, -bh / 2 + 8, 5, bh / 2 + 4, 1); rect(7, -bh / 2 + 8, 5, bh / 2 + 4, 1);
          fill(155, 148, 135); rect(-14, -bh / 2 + 4, 28, 5, 2);
          fill(80, 160, 50, 180); circle(-8, -bh / 2 + 10, 3); circle(0, -bh / 2 + 11, 2.5); circle(8, -bh / 2 + 10, 3);
          fill(100, 180, 60, 140); circle(-4, -bh / 2 + 12, 2); circle(4, -bh / 2 + 12, 2);
          fill(50, 42, 30); ellipse(0, bh / 2 - 10, 10, 6);
          fill(60, 50, 35); rect(-4, bh / 2 - 14, 8, 5, 1);
          fill(255, 140, 30, 160 + _tPulse * 50); ellipse(0, bh / 2 - 16, 6, 6);
          fill(255, 200, 50, 120 + _tPulse * 40); ellipse(0, bh / 2 - 18, 4, 4);
          fill(120, 115, 105, 140);
          arc(-6, -bh / 2 + 6, 4, 3, 0, PI + HALF_PI); arc(6, -bh / 2 + 6, 4, 3, HALF_PI, TWO_PI);
          if (_tGrand) {
            fill(130, 125, 115, 120);
            for (let gi = 0; gi < 3; gi++) { let ga = PI + 0.5 + gi * PI / 3; let gx = cos(ga) * (bw / 2 - 2); let gy = sin(ga) * (bh / 2 - 6) * 0.5 - 4; rect(gx - 2, gy, 4, 12, 1); }
            fill(255, 140, 30, 120 + _tPulse * 60); ellipse(0, bh / 2 - 20, 10, 8);
          }
        } else {
          // Fallback — simple generic temple
          fill(_tfc.trim[0] - 20, _tfc.trim[1] - 17, _tfc.trim[2] - 12);
          rect(-bw / 2 + 2, bh / 2 - 8, bw - 4, 4, 1);
          fill(_tfc.wall[0], _tfc.wall[1], _tfc.wall[2]);
          rect(-bw / 2 + 4, -bh / 2 + 6, bw - 8, bh / 2 + 6, 1);
          fill(_tfc.column[0], _tfc.column[1], _tfc.column[2]);
          rect(-bw / 2 + 6, -bh / 2 + 6, 4, bh / 2 + 8, 1); rect(bw / 2 - 10, -bh / 2 + 6, 4, bh / 2 + 8, 1);
          fill(_tfc.roof[0], _tfc.roof[1], _tfc.roof[2]);
          beginShape(); vertex(-bw / 2 + 2, -bh / 2 + 6); vertex(0, -bh / 2 - 6); vertex(bw / 2 - 2, -bh / 2 + 6); endShape(CLOSE);
          fill(_tfc.door[0], _tfc.door[1], _tfc.door[2]); rect(-5, -bh / 2 + 14, 10, 10, 1);
          fill(200, 160, 80, _tGlow); rect(-4, -bh / 2 + 16, 8, 7, 1);
        }
        break;
      }

      case 'market':
        // Roman market stall — awning with goods
        noStroke();
        fill(0, 0, 0, 25);
        rect(-bw / 2 + 2, bh / 2 - 4, bw, 5);
        // Wooden counter — faction
        fill(fc.wall[0], fc.wall[1], fc.wall[2]);
        rect(-bw / 2, -bh / 2 + 10, bw, bh / 2, 1);
        // Counter wood grain
        fill(fc.wall[0] - 12, fc.wall[1] - 10, fc.wall[2] - 8, 50);
        rect(-bw / 2 + 1, -bh / 2 + 10, bw - 2, 2);
        rect(-bw / 2 + 1, -bh / 2 + 16, bw - 2, 1.5);
        // Counter legs
        fill(fc.trim[0] - 15, fc.trim[1] - 18, fc.trim[2] - 20);
        rect(-bw / 2 + 3, -bh / 2 + 20, 3, bh / 2 - 2, 1);
        rect(bw / 2 - 6, -bh / 2 + 20, 3, bh / 2 - 2, 1);
        // Goods on counter — bread basket
        fill(180, 130, 45);
        ellipse(-bw / 4, -bh / 2 + 8, 10, 5);
        fill(200, 165, 80);
        ellipse(-bw / 4 - 2, -bh / 2 + 6, 4, 2.5);
        ellipse(-bw / 4 + 2, -bh / 2 + 6, 4, 2.5);
        // Amphora
        fill(170, 65, 40);
        rect(-1, -bh / 2 + 3, 5, 8, 2);
        fill(155, 55, 32);
        rect(0, -bh / 2 + 1, 3, 2, 1);
        // Green produce
        fill(55, 120, 65);
        ellipse(bw / 4, -bh / 2 + 7, 8, 5);
        fill(70, 140, 75);
        ellipse(bw / 4 - 2, -bh / 2 + 6, 3, 2);
        ellipse(bw / 4 + 2, -bh / 2 + 6, 3, 2);
        // Fruit dots
        fill(200, 50, 40, 180);
        circle(-bw / 4 + 6, -bh / 2 + 7, 2.5);
        fill(230, 180, 40, 180);
        circle(-bw / 4 + 9, -bh / 2 + 8, 2);
        // Support poles
        fill(120, 90, 40);
        rect(-bw / 2 + 1, -bh / 2 - 10, 3, 22, 1);
        rect(bw / 2 - 4, -bh / 2 - 10, 3, 22, 1);
        // Striped awning — faction
        for (let mai = 0; mai < 5; mai++) {
          let maColor = mai % 2 === 0 ? [fc.roof[0], fc.roof[1], fc.roof[2]] : [fc.wall[0] + 20, fc.wall[1] + 20, fc.wall[2] + 20];
          fill(maColor[0], maColor[1], maColor[2], 220);
          let mawx = -bw / 2 + 2 + mai * (bw - 4) / 5;
          rect(mawx, -bh / 2 - 10, (bw - 4) / 5, 10, 1);
        }
        // Fringe
        stroke(195, 175, 130, 140);
        strokeWeight(0.8);
        for (let maf = 0; maf < 7; maf++) {
          let mafx = -bw / 2 + 3 + maf * (bw - 6) / 6;
          line(mafx, -bh / 2, mafx, -bh / 2 + 3);
        }
        noStroke();
        // Hanging lantern from left pole
        fill(160, 130, 55);
        rect(-bw / 2 + 5, -bh / 2 - 6, 1, 4);
        fill(180, 150, 60);
        rect(-bw / 2 + 3, -bh / 2 - 2, 5, 4, 1);
        fill(255, 200, 80, 60 + sin(frameCount * 0.08 + b.x * 0.1) * 30);
        rect(-bw / 2 + 4, -bh / 2 - 1, 3, 2);
        // Price tablet
        fill(175, 160, 120);
        rect(-4, -bh / 2 - 14, 8, 5, 1);
        fill(100, 80, 40);
        rect(-2, -bh / 2 - 13, 4, 1);
        rect(-2, -bh / 2 - 11, 4, 1);
        // Colorful awning over market
        let awningColors = [[200,55,40],[220,180,50],[45,90,170],[190,90,35]];
        let stripeW = floor(bw / 4);
        for (let s = 0; s < 4; s++) {
          let ac = awningColors[((floor(abs(b.x) * 0.1) + s) % 4 + 4) % 4];
          fill(ac[0], ac[1], ac[2], 200);
          beginShape();
          vertex(-bw/2 + s * stripeW, -bh/2 - 2);
          vertex(-bw/2 + (s+1) * stripeW, -bh/2 - 2);
          vertex(-bw/2 + (s+1) * stripeW + 2, -bh/2 + 6);
          vertex(-bw/2 + s * stripeW - 1, -bh/2 + 6);
          endShape(CLOSE);
        }
        // Fringe
        fill(220, 215, 200, 150);
        for (let f = 0; f < floor(bw / 5); f++) {
          rect(-bw/2 + f * 5 + 2, -bh/2 + 6, 2, 3);
        }
        break;

      case 'forum':
        // Public forum — raised stone platform — faction
        noStroke();
        // Raised platform steps (front)
        fill(fc.ground[0] - 20, fc.ground[1] - 20, fc.ground[2] - 18);
        rect(-bw / 2 + 4, bh / 2 - 4, bw - 8, 4, 1);
        fill(fc.ground[0] - 12, fc.ground[1] - 12, fc.ground[2] - 10);
        rect(-bw / 2 + 2, bh / 2 - 8, bw - 4, 4, 1);
        // Main platform
        fill(fc.ground[0], fc.ground[1], fc.ground[2]);
        rect(-bw / 2, -bh / 2, bw, bh - 8, 2);
        // Mosaic checkered floor pattern
        for (let ffy = -bh / 2 + 2; ffy < bh / 2 - 10; ffy += 6) {
          for (let ffx = -bw / 2 + 2; ffx < bw / 2 - 2; ffx += 6) {
            if ((floor(ffx / 6) + floor(ffy / 6)) % 2 === 0) {
              fill(fc.ground[0] - 10, fc.ground[1] - 8, fc.ground[2] - 12, 60);
              rect(ffx, ffy, 5.5, 5.5);
            }
          }
        }
        // Flagstone grout lines
        stroke(fc.ground[0] - 20, fc.ground[1] - 20, fc.ground[2] - 20, 40);
        strokeWeight(0.4);
        for (let ffy = -bh / 2 + 8; ffy < bh / 2 - 8; ffy += 8) {
          line(-bw / 2 + 2, ffy, bw / 2 - 2, ffy);
        }
        for (let ffx = -bw / 2 + 8; ffx < bw / 2; ffx += 8) {
          line(ffx, -bh / 2 + 2, ffx, bh / 2 - 10);
        }
        noStroke();
        // 4 columns supporting a roof along top edge
        fill(fc.column[0], fc.column[1], fc.column[2]);
        for (let fci = 0; fci < 4; fci++) {
          let fcpx = -bw / 2 + 8 + fci * (bw - 16) / 3;
          rect(fcpx - 2, -bh / 2 - 4, 4, bh / 3, 1);
          // Capital
          fill(fc.column[0] + 12, fc.column[1] + 12, fc.column[2] + 8);
          rect(fcpx - 3, -bh / 2 - 6, 6, 3, 1);
          fill(fc.column[0], fc.column[1], fc.column[2]);
          // Faction-colored banner on column
          let fBannerFlap = sin(frameCount * 0.03 + fci * 1.5 + b.x * 0.01) * 1.5;
          fill(fc.accent[0], fc.accent[1], fc.accent[2], 160);
          rect(fcpx + 3, -bh / 2 + 2, 2 + fBannerFlap, 8);
        }
        // Entablature / roof beam connecting columns
        fill(fc.trim[0], fc.trim[1], fc.trim[2]);
        rect(-bw / 2 + 5, -bh / 2 - 7, bw - 10, 3, 1);
        // Side colonnade stubs
        fill(fc.column[0], fc.column[1], fc.column[2]);
        for (let ffcj = 1; ffcj < 4; ffcj++) {
          let ffcpy = -bh / 2 + 8 + ffcj * (bh - 24) / 3;
          rect(-bw / 2, ffcpy - 1.5, 6, 3, 1);
          rect(bw / 2 - 6, ffcpy - 1.5, 6, 3, 1);
        }
        // Central fountain
        fill(fc.trim[0] - 20, fc.trim[1] - 20, fc.trim[2] - 20);
        ellipse(0, 0, 20, 14);
        fill(50, 105, 160, 180);
        ellipse(0, 0, 16, 10);
        let forumPhase = frameCount * 0.05 + b.x * 0.08;
        // Water shimmer
        fill(80, 145, 200, 50 + sin(forumPhase) * 30);
        ellipse(-2, -1, 7, 4);
        fill(80, 160, 210, 100 + sin(forumPhase * 1.3) * 40);
        ellipse(0, -4, 3, 5);
        // Water spray particle
        fill(180, 215, 240, 50 + sin(forumPhase * 2) * 40);
        circle(sin(forumPhase * 0.7) * 2, -3, 2);
        // Speaker's podium (rostra with detail)
        fill(fc.trim[0] - 5, fc.trim[1] - 6, fc.trim[2] - 7);
        rect(-10, bh / 2 - 18, 20, 8, 1);
        fill(fc.trim[0] + 3, fc.trim[1] + 2, fc.trim[2]);
        rect(-8, bh / 2 - 22, 16, 5, 1);
        // Podium decoration
        fill(fc.accent[0], fc.accent[1], fc.accent[2], 80);
        rect(-6, bh / 2 - 20, 12, 2);
        // Statues on plinths
        fill(fc.column[0] - 10, fc.column[1] - 10, fc.column[2] - 8);
        rect(-bw / 2 + 11, 2, 5, 3, 1);
        rect(bw / 2 - 16, 2, 5, 3, 1);
        fill(fc.column[0] + 2, fc.column[1] + 2, fc.column[2]);
        rect(-bw / 2 + 12, -6, 3, 10, 1);
        rect(bw / 2 - 15, -6, 3, 10, 1);
        circle(-bw / 2 + 13, -7, 4);
        circle(bw / 2 - 14, -7, 4);
        break;

      case 'watchtower':
        // Defensive watchtower — faction
        noStroke();
        fill(0, 0, 0, 30);
        rect(-bw / 2 + 1, bh / 2 - 4, bw, 6);
        // Wide tapered base
        fill(fc.wall[0] - 30, fc.wall[1] - 30, fc.wall[2] - 28);
        beginShape();
        vertex(-bw / 2 - 3, bh / 2);
        vertex(bw / 2 + 3, bh / 2);
        vertex(bw / 2 + 1, bh / 2 - 10);
        vertex(-bw / 2 - 1, bh / 2 - 10);
        endShape(CLOSE);
        // Stone shaft (slightly tapered)
        fill(fc.wall[0] - 15, fc.wall[1] - 15, fc.wall[2] - 10);
        beginShape();
        vertex(-bw / 2, bh / 2 - 10);
        vertex(bw / 2, bh / 2 - 10);
        vertex(bw / 2 - 1, -bh / 2 + 8);
        vertex(-bw / 2 + 1, -bh / 2 + 8);
        endShape(CLOSE);
        // Stone block texture
        stroke(fc.wall[0] - 35, fc.wall[1] - 35, fc.wall[2] - 30, 65);
        strokeWeight(0.6);
        for (let wtl = -bh / 2 + 12; wtl < bh / 2 - 12; wtl += 6) {
          line(-bw / 2 + 2, wtl, bw / 2 - 2, wtl);
          let wtoff = (floor((wtl + 12) / 6) % 2) * 5;
          for (let wtlx = -bw / 2 + wtoff + 3; wtlx < bw / 2 - 2; wtlx += 8) {
            line(wtlx, wtl, wtlx, wtl + 6);
          }
        }
        noStroke();
        // Arrow slits (thin dark rects)
        fill(40, 30, 18, 200);
        rect(-1.5, -bh / 2 + 16, 3, 7, 1);
        rect(-1.5, -bh / 2 + 30, 3, 7, 1);
        rect(-1.5, -bh / 2 + 44, 3, 7, 1);
        // Wooden platform at top (wider than shaft)
        fill(100, 72, 32);
        rect(-bw / 2 - 2, -bh / 2 + 6, bw + 4, 4, 1);
        // Platform planks
        fill(90, 65, 28);
        rect(-bw / 2 - 1, -bh / 2 + 7, bw + 2, 1);
        // Wooden railings
        fill(95, 68, 30);
        rect(-bw / 2 - 2, -bh / 2 + 2, 2, 6);
        rect(bw / 2, -bh / 2 + 2, 2, 6);
        rect(-bw / 2 - 2, -bh / 2 + 2, bw + 4, 2);
        // Battlement merlons
        fill(fc.trim[0] + 5, fc.trim[1] + 4, fc.trim[2] + 5);
        rect(-bw / 2 - 1, -bh / 2 - 2, 4, 6, 1);
        rect(-bw / 2 + 5, -bh / 2 - 2, 4, 6, 1);
        rect(bw / 2 - 9, -bh / 2 - 2, 4, 6, 1);
        rect(bw / 2 - 3, -bh / 2 - 2, 4, 6, 1);
        // Iron reinforcement bands
        fill(70, 60, 50, 120);
        rect(-bw / 2, -bh / 2 + 20, bw, 2);
        rect(-bw / 2, -bh / 2 + 34, bw, 2);
        // Guard silhouette on platform
        fill(55, 45, 35, 160);
        rect(2, -bh / 2 - 2, 3, 6);
        circle(3, -bh / 2 - 4, 3);
        // Spear
        fill(80, 70, 55, 140);
        rect(4, -bh / 2 - 10, 1, 12);
        // Beacon torch at top
        let wtFlicker = sin(frameCount * 0.28 + b.x * 0.6) * 1.5;
        fill(255, 120, 30, 160);
        beginShape();
        vertex(-bw / 4 + wtFlicker * 0.3, -bh / 2 - 12 + wtFlicker);
        vertex(-bw / 4 - 3, -bh / 2 - 2);
        vertex(-bw / 4 + 3, -bh / 2 - 2);
        endShape(CLOSE);
        fill(255, 210, 60, 180);
        beginShape();
        vertex(-bw / 4, -bh / 2 - 9 + wtFlicker * 0.5);
        vertex(-bw / 4 - 2, -bh / 2 - 2);
        vertex(-bw / 4 + 2, -bh / 2 - 2);
        endShape(CLOSE);
        // Night: torch glow
        if (getSkyBrightness() < 0.4) {
          let wtNight = map(getSkyBrightness(), 0, 0.4, 1, 0);
          fill(255, 160, 50, 35 * wtNight);
          ellipse(-bw / 4, -bh / 2 - 4, 16, 12);
          // Arrow slit glow
          fill(255, 180, 70, 25 * wtNight);
          rect(-1, -bh / 2 + 17, 2, 5);
          rect(-1, -bh / 2 + 31, 2, 5);
        }
        break;

      case 'arch':
        // Triumphal arch — faction
        noStroke();
        // Base plinth
        fill(fc.trim[0] - 15, fc.trim[1] - 20, fc.trim[2] - 17);
        rect(-bw / 2, bh / 2 - 8, bw, 8, 1);
        // Piers
        fill(fc.wall[0], fc.wall[1], fc.wall[2]);
        rect(-bw / 2, -bh / 2 + 6, 14, bh - 14, 1);
        rect(bw / 2 - 14, -bh / 2 + 6, 14, bh - 14, 1);
        // Arch opening
        fill(38, 28, 16, 200);
        rect(-bw / 2 + 14, -bh / 2 + 12, bw - 28, bh - 20, 1);
        fill(fc.trim[0], fc.trim[1], fc.trim[2]);
        arc(0, -bh / 2 + 12, bw - 28, bh - 14, PI, TWO_PI, PIE);
        fill(38, 28, 16, 200);
        arc(0, -bh / 2 + 12, bw - 32, bh - 20, PI, TWO_PI, PIE);
        // Attic inscription block
        fill(fc.column[0] + 2, fc.column[1] + 2, fc.column[2]);
        rect(-bw / 2 + 2, -bh / 2, bw - 4, 14, 1);
        stroke(fc.trim[0] - 20, fc.trim[1] - 20, fc.trim[2] - 22, 100);
        strokeWeight(0.5);
        line(-bw / 2 + 8, -bh / 2 + 4, bw / 2 - 8, -bh / 2 + 4);
        line(-bw / 2 + 8, -bh / 2 + 7, bw / 2 - 8, -bh / 2 + 7);
        line(-bw / 2 + 8, -bh / 2 + 10, bw / 2 - 8, -bh / 2 + 10);
        noStroke();
        // Engaged columns
        fill(fc.column[0], fc.column[1], fc.column[2]);
        rect(-bw / 2 + 3, -bh / 2 + 8, 5, bh - 20, 1);
        rect(bw / 2 - 8, -bh / 2 + 8, 5, bh - 20, 1);
        fill(fc.column[0] + 10, fc.column[1] + 9, fc.column[2] + 7);
        rect(-bw / 2 + 2, -bh / 2 + 6, 7, 3, 1);
        rect(bw / 2 - 9, -bh / 2 + 6, 7, 3, 1);
        // Keystone — accent
        fill(fc.accent[0], fc.accent[1], fc.accent[2]);
        beginShape();
        vertex(-3, -bh / 2 + 10);
        vertex(3, -bh / 2 + 10);
        vertex(4, -bh / 2 + 16);
        vertex(-4, -bh / 2 + 16);
        endShape(CLOSE);
        // Victory sculptures on top
        fill(fc.column[0] + 2, fc.column[1] + 2, fc.column[2]);
        circle(-bw / 2 + 7, -bh / 2 - 3, 7);
        circle(bw / 2 - 7, -bh / 2 - 3, 7);
        // Prestige aura
        let archPulse = 20 + sin(frameCount * 0.025 + b.x * 0.04) * 12;
        fill(220, 180, 60, archPulse);
        rect(-bw / 2 + 3, -bh / 2 + 1, bw - 6, 12, 1);
        break;

      case 'villa': {
        noStroke();
        let _vfc = fc;
        // Outer wall
        fill(_vfc.wall[0] - 20, _vfc.wall[1] - 15, _vfc.wall[2] - 15);
        rect(-bw / 2, -bh / 2, bw, bh, 2);
        // Interior courtyard
        fill(_vfc.wall[0], _vfc.wall[1], _vfc.wall[2]);
        rect(-bw / 2 + 6, -bh / 2 + 6, bw - 12, bh - 12, 1);
        // Garden
        fill(60, 100, 45, 160);
        rect(-bw / 2 + 18, -bh / 4, bw / 2 - 10, bh / 4, 2);
        fill(45, 80, 35, 180);
        ellipse(-bw / 2 + 24, -bh / 4 + 6, 8, 5);
        ellipse(-bw / 2 + 32, -bh / 4 + 10, 6, 4);
        // Impluvium pool
        fill(50, 100, 155, 160);
        ellipse(-bw / 4, bh / 8, 14, 8);
        let villaPhase = frameCount * 0.04 + b.x * 0.07;
        fill(75, 140, 195, 60 + sin(villaPhase) * 25);
        ellipse(-bw / 4 - 2, bh / 8 - 1, 6, 3);
        // Peristyle columns — faction-styled
        fill(_vfc.column[0], _vfc.column[1], _vfc.column[2]);
        for (let vci = 0; vci < 3; vci++) {
          let vcx = -bw / 2 + 18 + vci * (bw / 2 - 10) / 2;
          rect(vcx - 1.5, -bh / 4 - 2, 3, bh / 4 + 12, 1);
          if (_vfc.columnType === 'ionic') {
            fill(_vfc.accent[0], _vfc.accent[1], _vfc.accent[2], 120);
            circle(vcx - 2, -bh / 4 - 1, 2);
            circle(vcx + 2, -bh / 4 - 1, 2);
            fill(_vfc.column[0], _vfc.column[1], _vfc.column[2]);
          } else if (_vfc.columnType === 'lotus') {
            fill(_vfc.accent[0], _vfc.accent[1], _vfc.accent[2], 140);
            beginShape(); vertex(vcx - 3, -bh / 4); vertex(vcx, -bh / 4 - 4); vertex(vcx + 3, -bh / 4); endShape(CLOSE);
            fill(_vfc.column[0], _vfc.column[1], _vfc.column[2]);
          }
        }
        // Main entrance — faction door
        fill(_vfc.trim[0], _vfc.trim[1], _vfc.trim[2]);
        rect(-8, bh / 2 - 10, 16, 10, 1);
        fill(_vfc.door[0], _vfc.door[1], _vfc.door[2]);
        rect(-5, bh / 2 - 10, 10, 8, 1);
        if (_vfc.doorShape !== 'rect') arc(0, bh / 2 - 10, 10, 8, PI, TWO_PI);
        // Roof trim — faction
        fill(_vfc.roof[0], _vfc.roof[1], _vfc.roof[2], 180);
        rect(-bw / 2, -bh / 2, bw, 6, 1);
        rect(-bw / 2, -bh / 2, 6, bh, 1);
        rect(bw / 2 - 6, -bh / 2, 6, bh, 1);
        // Accent border
        fill(_vfc.accent[0], _vfc.accent[1], _vfc.accent[2], 120);
        rect(-bw / 2 + 2, -bh / 2 + 2, bw - 4, 2);
        rect(-bw / 2 + 2, bh / 2 - 4, bw - 4, 2);
        break;
      }

      case 'shrine': {
        // Small sacred shrine — raised platform, columns, flame bowl — faction
        noStroke();
        fill(fc.trim[0] - 7, fc.trim[1] - 8, fc.trim[2] - 10);
        rect(-bw / 2, -bh / 2 + 10, bw, bh - 10, 1);
        for (let sry = -bh / 2 + 12; sry < bh / 2; sry += 4) {
          for (let srx = -bw / 2 + 2; srx < bw / 2 - 2; srx += 4) {
            if ((floor(srx / 4) + floor(sry / 4)) % 2 === 0) {
              fill(fc.trim[0] - 17, fc.trim[1] - 18, fc.trim[2] - 20);
              rect(srx, sry, 4, 4);
            }
          }
        }
        fill(fc.column[0] + 10, fc.column[1] + 10, fc.column[2] + 8);
        rect(-bw / 4 - 2, -bh / 2 + 2, 4, bh - 12, 1);
        rect(bw / 4 - 2, -bh / 2 + 2, 4, bh - 12, 1);
        fill(fc.column[0] + 20, fc.column[1] + 19, fc.column[2] + 16);
        rect(-bw / 4 - 3, -bh / 2 + 1, 6, 3, 1);
        rect(bw / 4 - 3, -bh / 2 + 1, 6, 3, 1);
        fill(fc.column[0], fc.column[1], fc.column[2]);
        rect(-bw / 4 - 3, bh / 2 - 4, 6, 2, 1);
        rect(bw / 4 - 3, bh / 2 - 4, 6, 2, 1);
        fill(120, 100, 65);
        rect(-4, -bh / 2 + 10, 8, 4, 1);
        rect(-3, -bh / 2 + 8, 6, 3);
        let shrineFlicker = sin(frameCount * 0.22 + b.x * 0.5) * 1.5;
        fill(255, 140, 30, 200);
        beginShape();
        vertex(shrineFlicker * 0.3, -bh / 2 + 2 + shrineFlicker);
        vertex(-3, -bh / 2 + 8);
        vertex(3, -bh / 2 + 8);
        endShape(CLOSE);
        fill(255, 210, 60, 180);
        beginShape();
        vertex(0, -bh / 2 + 4 + shrineFlicker * 0.5);
        vertex(-2, -bh / 2 + 8);
        vertex(2, -bh / 2 + 8);
        endShape(CLOSE);
        let shrinePulse = 25 + sin(frameCount * 0.04 + b.x * 0.07) * 15;
        fill(205, 165, 55, shrinePulse);
        ellipse(0, -bh / 2 + 6, 14, 10);
        break;
      }

      case 'house': {
        noStroke();
        let _fc = fc;
        // Ground shadow
        fill(0, 0, 0, 25);
        rect(-bw / 2 + 2, bh / 2 - 3, bw, 5);
        // Whitewashed walls — faction color
        fill(_fc.wall[0], _fc.wall[1], _fc.wall[2]);
        rect(-bw / 2, -bh / 2 + 8, bw, bh - 8, 1);
        // Wall highlight (sun-facing side)
        fill(_fc.wall[0] + 12, _fc.wall[1] + 12, _fc.wall[2] + 8, 50);
        rect(-bw / 2, -bh / 2 + 8, bw * 0.35, bh - 8);
        // Wall texture
        stroke(_fc.wall[0] - 20, _fc.wall[1] - 20, _fc.wall[2] - 20, 60);
        strokeWeight(0.5);
        if (_fc.wallTexture === 'mudbrick') {
          for (let hby = -bh / 2 + 10; hby < bh / 2; hby += 5) {
            line(-bw / 2 + 1, hby, bw / 2 - 1, hby);
            let hboff = (floor((hby + 10) / 5) % 2) * 6;
            for (let hbx = -bw / 2 + hboff + 5; hbx < bw / 2 - 2; hbx += 10) {
              line(hbx, hby, hbx, hby + 5);
            }
          }
        } else if (_fc.wallTexture === 'marble') {
          for (let hby = -bh / 2 + 12; hby < bh / 2; hby += 7) {
            line(-bw / 2 + 1, hby, bw / 2 - 1, hby);
          }
          stroke(_fc.wall[0] - 8, _fc.wall[1] - 10, _fc.wall[2] - 5, 30);
          for (let vi = 0; vi < 3; vi++) {
            let vx = -bw / 2 + 5 + vi * (bw / 3);
            line(vx, -bh / 2 + 10, vx + 4, bh / 2 - 4);
          }
        } else if (_fc.wallTexture === 'smooth') {
          for (let hby = -bh / 2 + 14; hby < bh / 2; hby += 10) {
            line(-bw / 2 + 1, hby, bw / 2 - 1, hby);
          }
        } else {
          for (let hby = -bh / 2 + 10; hby < bh / 2; hby += 4) {
            line(-bw / 2 + 1, hby, bw / 2 - 1, hby);
            let hboff = (floor((hby + 10) / 4) % 2) * 5;
            for (let hbx = -bw / 2 + hboff + 4; hbx < bw / 2 - 2; hbx += 8) {
              line(hbx, hby, hbx, hby + 4);
            }
          }
        }
        noStroke();
        // Wooden door with plank detail
        fill(_fc.door[0], _fc.door[1], _fc.door[2]);
        rect(-5, -bh / 2 + 14, 10, bh - 22, 1);
        fill(_fc.door[0] - 20, _fc.door[1] - 13, _fc.door[2] - 6);
        rect(-4, -bh / 2 + 15, 3.5, bh - 24);
        rect(0.5, -bh / 2 + 15, 3.5, bh - 24);
        // Door iron bands
        fill(_fc.door[0] - 40, _fc.door[1] - 30, _fc.door[2] - 20, 100);
        rect(-5, -bh / 2 + 18, 10, 1.5);
        rect(-5, -bh / 2 + 24, 10, 1.5);
        if (_fc.doorShape === 'pointed') {
          fill(_fc.trim[0], _fc.trim[1], _fc.trim[2]);
          beginShape(); vertex(-6, -bh / 2 + 14); vertex(0, -bh / 2 + 8); vertex(6, -bh / 2 + 14); endShape(CLOSE);
        } else if (_fc.doorShape === 'rect') {
          fill(_fc.accent[0], _fc.accent[1], _fc.accent[2], 140);
          rect(-7, -bh / 2 + 12, 14, 2);
        }
        // Door handle
        fill(180, 150, 70);
        rect(3, -bh / 2 + 20, 2, 2, 1);
        // Windows with shutters
        fill(_fc.window[0], _fc.window[1], _fc.window[2], 180);
        rect(-bw / 2 + 4, -bh / 2 + 12, 8, 6);
        rect(bw / 2 - 12, -bh / 2 + 12, 8, 6);
        // Window crossbars
        fill(_fc.roof[0], _fc.roof[1], _fc.roof[2]);
        rect(-bw / 2 + 3, -bh / 2 + 11, 3, 8);
        rect(-bw / 2 + 10, -bh / 2 + 11, 3, 8);
        rect(-bw / 2 + 3, -bh / 2 + 14, 10, 1.5);
        rect(bw / 2 - 13, -bh / 2 + 11, 3, 8);
        rect(bw / 2 - 6, -bh / 2 + 11, 3, 8);
        rect(bw / 2 - 13, -bh / 2 + 14, 10, 1.5);
        // Window sills
        fill(_fc.trim[0], _fc.trim[1], _fc.trim[2]);
        rect(-bw / 2 + 3, -bh / 2 + 18, 10, 2, 1);
        rect(bw / 2 - 13, -bh / 2 + 18, 10, 2, 1);
        // Terracotta roof — faction style with tile rows
        if (_fc.roofType === 'flat') {
          fill(_fc.roof[0], _fc.roof[1], _fc.roof[2]);
          rect(-bw / 2 - 1, -bh / 2 + 5, bw + 2, 5, 1);
          fill(_fc.trim[0], _fc.trim[1], _fc.trim[2]);
          rect(-bw / 2 - 1, -bh / 2 + 4, bw + 2, 3, 1);
          for (let pi = 0; pi < 4; pi++) {
            rect(-bw / 2 + 2 + pi * (bw / 4), -bh / 2 + 1, bw / 6, 4, 1);
          }
        } else if (_fc.roofType === 'pediment') {
          fill(_fc.roof[0], _fc.roof[1], _fc.roof[2]);
          beginShape(); vertex(-bw / 2 - 2, -bh / 2 + 8); vertex(0, -bh / 2 - 6); vertex(bw / 2 + 2, -bh / 2 + 8); endShape(CLOSE);
          // Tile row lines on pediment
          stroke(_fc.roof[0] - 20, _fc.roof[1] - 15, _fc.roof[2] - 10, 80);
          strokeWeight(0.5);
          for (let tr = 1; tr < 4; tr++) {
            let ty = -bh / 2 + 8 - tr * 3.2;
            let tx = (bw / 2 + 2) * (1 - tr * 3.2 / 14);
            line(-tx, ty, tx, ty);
          }
          noStroke();
          fill(_fc.trim[0], _fc.trim[1], _fc.trim[2]);
          rect(-bw / 2 - 2, -bh / 2 + 6, bw + 4, 3, 1);
          fill(_fc.accent[0], _fc.accent[1], _fc.accent[2], 160);
          circle(0, -bh / 2 - 7, 4);
        } else {
          fill(_fc.roof[0], _fc.roof[1], _fc.roof[2]);
          beginShape(); vertex(-bw / 2 - 2, -bh / 2 + 8); vertex(0, -bh / 2 - 4); vertex(bw / 2 + 2, -bh / 2 + 8); endShape(CLOSE);
          // Alternating tile rows
          fill(_fc.roof[0] + 10, _fc.roof[1] + 15, _fc.roof[2] + 10);
          beginShape(); vertex(-bw / 2 + 2, -bh / 2 + 7); vertex(0, -bh / 2 - 2); vertex(bw / 2 - 2, -bh / 2 + 7); endShape(CLOSE);
          // Tile row lines
          stroke(_fc.roof[0] - 18, _fc.roof[1] - 12, _fc.roof[2] - 8, 70);
          strokeWeight(0.5);
          for (let tr = 1; tr < 4; tr++) {
            let ty = -bh / 2 + 7 - tr * 2.6;
            let tx = (bw / 2 - 2) * (1 - tr * 2.6 / 12);
            line(-tx, ty, tx, ty);
          }
          noStroke();
          fill(0, 0, 0, 30);
          rect(-bw / 2 - 2, -bh / 2 + 7, bw + 4, 3);
        }
        // Chimney with smoke
        fill(_fc.trim[0] - 30, _fc.trim[1] - 33, _fc.trim[2] - 37);
        rect(bw / 4 - 2, -bh / 2 - 4, 5, 7);
        fill(_fc.trim[0] - 20, _fc.trim[1] - 23, _fc.trim[2] - 27);
        rect(bw / 4 - 3, -bh / 2 - 5, 7, 2, 1);
        // Smoke wisps
        {
          let hSmAlpha = map(getSkyBrightness(), 0.2, 1.0, 38, 14);
          for (let hsi = 0; hsi < 3; hsi++) {
            let hsX = bw / 4 + sin(frameCount * 0.015 + hsi * 2.1 + b.x * 0.01) * (2 + hsi);
            let hsY = -bh / 2 - 6 - hsi * 5 - (frameCount * 0.4 + hsi * 12) % 16;
            fill(170, 165, 155, hSmAlpha * (1 - hsi * 0.3));
            rect(hsX, hsY, 2 + floor(hsi * 0.5), 2 + floor(hsi * 0.5));
          }
        }
        // Flower pot / vine on right side
        fill(55, 90, 35, 180);
        rect(bw / 2 - 4, -bh / 2 + 20, 3, 3);
        fill(65, 105, 40, 160);
        rect(bw / 2 - 5, -bh / 2 + 18, 2, 3);
        fill(45, 78, 30, 140);
        rect(bw / 2 - 3, -bh / 2 + 17, 2, 2);
        // Terracotta pot
        fill(170, 95, 50);
        rect(bw / 2 - 5, -bh / 2 + 22, 4, 4, 1);
        fill(155, 82, 42);
        rect(bw / 2 - 6, -bh / 2 + 22, 6, 1.5);
        // Faction details
        if (state.faction === 'carthage') {
          fill(60, 100, 160, 140); rect(-bw / 2 + 1, -bh / 2 + 8, 3, 4);
          fill(255, 200, 80, 80 + sin(frameCount * 0.06) * 30); rect(-bw / 2 + 1, -bh / 2 + 9, 3, 2);
        } else if (state.faction === 'egypt') {
          fill(_fc.accent[0], _fc.accent[1], _fc.accent[2], 60); rect(bw / 2 - 10, -bh / 2 + 16, 6, 12);
          fill(_fc.accent[0], _fc.accent[1], _fc.accent[2], 100);
          rect(bw / 2 - 9, -bh / 2 + 17, 1, 2); rect(bw / 2 - 7, -bh / 2 + 20, 2, 1);
          rect(bw / 2 - 9, -bh / 2 + 23, 1, 3); rect(bw / 2 - 6, -bh / 2 + 24, 2, 2);
        } else if (state.faction === 'greece') {
          fill(_fc.accent[0], _fc.accent[1], _fc.accent[2], 80);
          for (let mi = 0; mi < floor(bw / 6); mi++) {
            let mx = -bw / 2 + 2 + mi * 6;
            rect(mx, -bh / 2 + 8, 3, 1); rect(mx + 3, -bh / 2 + 9, 1, 2); rect(mx + 1, -bh / 2 + 10, 3, 1);
          }
        }
        // Foundation molding
        fill(_fc.wall[0] - 25, _fc.wall[1] - 20, _fc.wall[2] - 15);
        rect(-bw / 2, bh / 2 - 4, bw, 4, 1);
        // Night glow
        if (getSkyBrightness() < 0.5) {
          let houseNight = map(getSkyBrightness(), 0, 0.5, 1, 0);
          fill(255, 200, 80, 60 * houseNight);
          rect(-bw / 2 + 4, -bh / 2 + 12, 8, 6);
          rect(bw / 2 - 12, -bh / 2 + 12, 8, 6);
          fill(255, 190, 70, 30 * houseNight);
          rect(-4, -bh / 2 + 15, 8, bh - 24);
          fill(255, 190, 70, 15 * houseNight);
          ellipse(0, -bh / 2 + 22, 18, 12);
        }
        break;
      }

      case 'library': {
        noStroke();
        // Shadow
        fill(0, 0, 0, 28);
        rect(-bw / 2 + 3, bh / 2 - 3, bw, 6);
        // Main body — faction wall
        fill(fc.wall[0], fc.wall[1], fc.wall[2]);
        rect(-bw / 2, -bh / 2 + 10, bw, bh - 10, 1);
        // Stone course lines
        stroke(fc.wall[0] - 20, fc.wall[1] - 20, fc.wall[2] - 18, 50);
        strokeWeight(0.5);
        for (let ly2 = -bh / 2 + 16; ly2 < bh / 2; ly2 += 6) {
          line(-bw / 2 + 1, ly2, bw / 2 - 1, ly2);
        }
        noStroke();
        // Scroll niches — 6 arched recesses along facade
        for (let lni = 0; lni < 6; lni++) {
          let lnx = -bw / 2 + 8 + lni * ((bw - 16) / 5);
          // Niche recess
          fill(65, 52, 35, 180);
          rect(lnx - 1, -bh / 2 + 14, 7, 12, 1);
          // Niche arch top
          fill(75, 60, 42, 160);
          arc(lnx + 2.5, -bh / 2 + 14, 7, 6, PI, TWO_PI);
          // Scroll silhouette inside niche
          fill(195, 178, 142);
          rect(lnx + 0.5, -bh / 2 + 17, 6, 7, 1);
          // Scroll end caps (papyrus yellow)
          fill(215, 195, 148);
          rect(lnx, -bh / 2 + 17, 1.5, 7);
          rect(lnx + 5, -bh / 2 + 17, 1.5, 7);
        }
        // 4 entrance columns — faction
        fill(fc.column[0], fc.column[1], fc.column[2]);
        let libColPositions = [-bw/2 + 5, -bw/2 + 5 + (bw-10)/3, -bw/2 + 5 + 2*(bw-10)/3, bw/2 - 5];
        libColPositions.forEach(lcx => {
          rect(lcx - 3, -bh / 2 + 2, 6, bh / 2 + 10, 1);
          // Fluting
          stroke(fc.column[0] - 20, fc.column[1] - 20, fc.column[2] - 18, 60);
          strokeWeight(0.4);
          line(lcx - 1, -bh / 2 + 4, lcx - 1, bh / 2 - 12);
          line(lcx + 1, -bh / 2 + 4, lcx + 1, bh / 2 - 12);
          noStroke();
          // Column capital
          fill(fc.column[0] + 15, fc.column[1] + 15, fc.column[2] + 12);
          rect(lcx - 4, -bh / 2 + 1, 8, 3, 1);
          // Base
          fill(fc.column[0] + 5, fc.column[1] + 5, fc.column[2] + 3);
          rect(lcx - 3.5, bh / 2 - 14, 7, 2, 1);
        });
        // Entablature
        fill(fc.trim[0], fc.trim[1], fc.trim[2]);
        rect(-bw / 2 + 2, -bh / 2 + 8, bw - 4, 5, 1);
        // Pediment — triangular — faction roof
        fill(fc.roof[0], fc.roof[1], fc.roof[2]);
        beginShape();
        vertex(-bw / 2 + 2, -bh / 2 + 8);
        vertex(0, -bh / 2 - 10);
        vertex(bw / 2 - 2, -bh / 2 + 8);
        endShape(CLOSE);
        // Owl symbol on pediment
        fill(160, 152, 138);
        circle(0, -bh / 2 + 1, 6);
        fill(48, 42, 32);
        circle(-1.2, -bh / 2 + 0.5, 1.8);
        circle(1.2, -bh / 2 + 0.5, 1.8);
        // Beak
        fill(185, 155, 55);
        triangle(0, -bh/2 + 1.5, -1, -bh/2 + 3, 1, -bh/2 + 3);
        // Acroteria
        fill(200, 158, 52, 180);
        circle(-bw / 2 + 4, -bh / 2 + 7, 4);
        circle(bw / 2 - 4, -bh / 2 + 7, 4);
        circle(0, -bh / 2 - 11, 4);
        // Entrance doorway — faction door
        fill(fc.door[0], fc.door[1], fc.door[2]);
        rect(-8, -bh / 2 + 13, 16, 16, 1);
        arc(0, -bh / 2 + 13, 16, 10, PI, TWO_PI);
        // Night: warm lamp glow through entrance
        if (getSkyBrightness() < 0.35) {
          let libNight = map(getSkyBrightness(), 0, 0.35, 1, 0);
          fill(255, 205, 90, 60 * libNight);
          rect(-7, -bh / 2 + 14, 14, 14);
          fill(255, 190, 70, 25 * libNight);
          ellipse(0, -bh / 2 + 26, 22, 14);
          // Reading lamp windows
          fill(255, 195, 80, 45 * libNight);
          rect(-bw / 2 + 16, -bh / 2 + 30, 8, 5);
          rect(bw / 2 - 24, -bh / 2 + 30, 8, 5);
        }
        break;
      }

      case 'campfire': {
        noStroke();
        let cfGlowPulse = 20 + sin(frameCount * 0.06 + b.x * 0.1) * 12;
        fill(255, 150, 40, cfGlowPulse);
        ellipse(0, 0, 20, 16);
        fill(65, 58, 48);
        ellipse(0, 0, 10, 8);
        for (let csi = 0; csi < 8; csi++) {
          let csAngle = csi * TWO_PI / 8;
          let csx = cos(csAngle) * 5;
          let csy = sin(csAngle) * 4;
          let csCol = csi % 2 === 0 ? [130, 120, 105] : [120, 110, 95];
          fill(csCol[0], csCol[1], csCol[2]);
          rect(csx - 1.5, csy - 1.5, 3, 3, 1);
        }
        let cfFrame = floor(frameCount / 6) % 4;
        let cfFlicker = sin(frameCount * 0.3 + b.x) * 0.8;
        fill(255, 240, 160, 220);
        rect(-1.5 + cfFlicker * 0.2, -2, 3, 3);
        fill(255, 150, 30, 200);
        if (cfFrame === 0) { rect(-2.5 + cfFlicker, -5, 5, 5); }
        else if (cfFrame === 1) { rect(-3 + cfFlicker, -4, 5, 4); rect(0, -6, 2, 2); }
        else if (cfFrame === 2) { rect(-2 + cfFlicker, -5, 4, 5); rect(-1, -7, 3, 2); }
        else { rect(-3 + cfFlicker, -5, 6, 5); }
        fill(220, 80, 20, 180);
        if (cfFrame === 0) { rect(-1, -7 + cfFlicker, 2, 3); }
        else if (cfFrame === 1) { rect(0, -8 + cfFlicker, 2, 3); }
        else if (cfFrame === 2) { rect(-1.5, -9 + cfFlicker, 3, 3); }
        else { rect(-0.5, -7 + cfFlicker * 0.5, 2, 2); }
        fill(255, 220, 80, 150);
        let sparkSeed = floor(frameCount / 8) % 3;
        rect(-3 + sparkSeed * 2 + cfFlicker, -9 - sparkSeed, 1, 1);
        rect(1 - sparkSeed + cfFlicker, -10 + sparkSeed, 1, 1);
        for (let smi = 0; smi < 3; smi++) {
          let smY = -10 - smi * 4 - (frameCount * 0.3 + smi * 5) % 12;
          let smX = sin(frameCount * 0.02 + smi * 2) * 2;
          let smA = max(0, 40 - smi * 12 - ((frameCount * 0.3 + smi * 5) % 12) * 2);
          fill(140, 135, 125, smA);
          rect(smX - 1, smY, 2, 2);
        }
        break;
      }

      case 'castrum':
        // Military fortress — faction
        noStroke();
        // Ground shadow
        fill(0, 0, 0, 35);
        rect(-bw / 2 + 4, bh / 2 - 4, bw, 10);
        // Outer stone wall — faction
        fill(fc.wall[0] - 60, fc.wall[1] - 60, fc.wall[2] - 60);
        rect(-bw / 2, -bh / 2, bw, bh, 3);
        // Stone block variation — ashlar courses
        stroke(108, 96, 78, 55);
        strokeWeight(0.8);
        for (let cy2 = -bh / 2 + 7; cy2 < bh / 2; cy2 += 8) {
          line(-bw / 2 + 1, cy2, bw / 2 - 1, cy2);
          let coff = (floor((cy2 + bh / 2) / 8) % 2) * 10;
          for (let cx2 = -bw / 2 + coff + 6; cx2 < bw / 2 - 2; cx2 += 18) {
            line(cx2, cy2, cx2, cy2 + 8);
          }
        }
        noStroke();
        // Interior parade ground — packed earth
        fill(155, 138, 112);
        rect(-bw / 2 + 12, -bh / 2 + 12, bw - 24, bh - 24);
        // Parade ground texture — subtle
        fill(148, 132, 108, 60);
        for (let pi2 = 0; pi2 < 8; pi2++) {
          rect(-bw / 2 + 18 + pi2 * 12, -bh / 2 + 20, 9, 3);
        }
        // Interior barracks building (left)
        fill(138, 124, 102);
        rect(-bw / 2 + 24, -bh / 2 + 22, 30, 20, 1);
        fill(128, 114, 92);
        rect(-bw / 2 + 24, -bh / 2 + 22, 30, 4);
        // Interior armory building (right)
        fill(138, 124, 102);
        rect(bw / 2 - 54, -bh / 2 + 22, 30, 20, 1);
        fill(128, 114, 92);
        rect(bw / 2 - 54, -bh / 2 + 22, 30, 4);
        // Training dummy (cross shape) in courtyard
        fill(110, 82, 42);
        rect(-2, -bh / 2 + 46, 4, 14);
        rect(-7, -bh / 2 + 48, 14, 3);
        fill(140, 120, 80);
        circle(0, -bh / 2 + 44, 5);
        // Weapon rack (right side of courtyard)
        fill(95, 70, 35);
        rect(bw / 4 - 3, -bh / 2 + 44, 2, 14);
        rect(bw / 4 + 4, -bh / 2 + 44, 2, 14);
        rect(bw / 4 - 3, -bh / 2 + 48, 9, 2);
        // Weapons on rack (grey tips)
        fill(140, 140, 135);
        rect(bw / 4 - 1, -bh / 2 + 42, 1, 6);
        rect(bw / 4 + 2, -bh / 2 + 43, 1, 5);
        fill(160, 155, 145);
        rect(bw / 4 - 2, -bh / 2 + 41, 2, 2);
        rect(bw / 4 + 1, -bh / 2 + 42, 2, 2);
        // Corner towers — bigger and thicker
        fill(112, 100, 82);
        rect(-bw / 2, -bh / 2, 20, 22);
        rect(bw / 2 - 20, -bh / 2, 20, 22);
        rect(-bw / 2, bh / 2 - 22, 20, 22);
        rect(bw / 2 - 20, bh / 2 - 22, 20, 22);
        // Tower cap highlights
        fill(128, 116, 96);
        rect(-bw / 2, -bh / 2, 20, 4);
        rect(bw / 2 - 20, -bh / 2, 20, 4);
        rect(-bw / 2, bh / 2 - 22, 20, 4);
        rect(bw / 2 - 20, bh / 2 - 22, 20, 4);
        // Wall crenellations (merlons) — top wall
        fill(132, 120, 100);
        for (let mi = 0; mi < 11; mi++) {
          let mx2 = -bw / 2 + 22 + mi * (bw - 44) / 10;
          rect(mx2, -bh / 2 - 6, 7, 8, 1);
        }
        // Wall crenellations — bottom wall
        for (let mi = 0; mi < 11; mi++) {
          let mx2 = -bw / 2 + 22 + mi * (bw - 44) / 10;
          rect(mx2, bh / 2 - 2, 7, 8, 1);
        }
        // Wall crenellations — left wall
        for (let mi = 0; mi < 7; mi++) {
          let my2 = -bh / 2 + 24 + mi * (bh - 48) / 6;
          rect(-bw / 2 - 6, my2, 8, 7, 1);
        }
        // Wall crenellations — right wall
        for (let mi = 0; mi < 7; mi++) {
          let my2 = -bh / 2 + 24 + mi * (bh - 48) / 6;
          rect(bw / 2 - 2, my2, 8, 7, 1);
        }
        // Gate archway (south) — faction door
        fill(fc.door[0] - 50, fc.door[1] - 23, fc.door[2] - 2);
        rect(-14, bh / 2 - 20, 28, 20, 1);
        stroke(30, 24, 14, 200);
        strokeWeight(1.4);
        for (let gi2 = -11; gi2 <= 11; gi2 += 4) {
          line(gi2, bh / 2 - 19, gi2, bh / 2 - 2);
        }
        line(-14, bh / 2 - 12, 14, bh / 2 - 12);
        line(-14, bh / 2 - 6, 14, bh / 2 - 6);
        noStroke();
        // Gate arch top
        fill(112, 100, 82);
        arc(0, bh / 2 - 20, 28, 14, PI, TWO_PI);
        // Gate guard silhouettes
        fill(65, 50, 35, 170);
        rect(-18, bh / 2 - 14, 3, 8);
        circle(-17, bh / 2 - 16, 3);
        rect(15, bh / 2 - 14, 3, 8);
        circle(16, bh / 2 - 16, 3);
        // Guard spears
        fill(100, 90, 70, 140);
        rect(-17, bh / 2 - 22, 1, 16);
        rect(17, bh / 2 - 22, 1, 16);
        // Faction legion banner — animated wave (taller pole)
        let castFlap = sin(frameCount * 0.04 + b.x * 0.01) * 2.5;
        fill(100, 75, 42);
        rect(-2, -bh / 2 - 22, 4, 26);   // pole
        fill(fc.accent[0], fc.accent[1], fc.accent[2]);
        beginShape();
        vertex(0, -bh / 2 - 21);
        vertex(16 + castFlap, -bh / 2 - 17);
        vertex(15 + castFlap * 0.6, -bh / 2 - 10);
        vertex(0, -bh / 2 - 8);
        endShape(CLOSE);
        // Faction sigil on banner
        fill(220, 195, 60, 200);
        circle(8 + castFlap * 0.4, -bh / 2 - 14, 5);
        fill(fc.accent[0], fc.accent[1], fc.accent[2], 0);
        // Military cooking smoke (darker, greyer than residential) — spread wider
        {
          let castSmokeAlpha = map(getSkyBrightness(), 0.0, 0.6, 65, 18);
          for (let si2 = 0; si2 < 3; si2++) {
            let sPhase = frameCount * 0.012 + si2 * 2.5 + b.x * 0.008;
            for (let sp = 0; sp < 5; sp++) {
              let sFrac = sp / 4;
              let sx2 = -bw / 3 + si2 * (bw / 3.5) + floor(sin(sPhase + sp * 0.8) * (3 + sp));
              let sy2 = -bh / 2 - 6 - floor(sp * 8 + (frameCount * 0.6 + si2 * 25) % 32);
              let sa = castSmokeAlpha * (1 - sFrac * 0.75);
              fill(120, 115, 108, sa);
              noStroke();
              rect(sx2, sy2, 3, 3);
            }
          }
        }
        // Night: window glow from barracks — more windows
        if (getSkyBrightness() < 0.35) {
          let nightStr = map(getSkyBrightness(), 0, 0.35, 1, 0);
          fill(255, 185, 80, 55 * nightStr);
          rect(-bw / 2 + 26, -bh / 2 + 26, 10, 7);
          rect(-bw / 2 + 40, -bh / 2 + 26, 10, 7);
          rect(bw / 2 - 36, -bh / 2 + 26, 10, 7);
          rect(bw / 2 - 50, -bh / 2 + 26, 10, 7);
          // Center courtyard glow
          fill(255, 170, 60, 20 * nightStr);
          ellipse(0, -bh / 2 + 38, 28, 16);
          // Gate torch glow
          fill(255, 160, 50, 35 * nightStr);
          ellipse(-16, bh / 2 - 16, 10, 10);
          ellipse(16, bh / 2 - 16, 10, 10);
        }
        break;

      // ─── NEW BUILDING TYPES ─────────────────────────────────────────────

      case 'altar': {
        noStroke();
        fill(fc.trim[0] - 10, fc.trim[1] - 10, fc.trim[2] - 13);
        rect(-bw / 2, -bh / 2 + 8, bw, bh - 8, 1);
        for (let ay = -bh / 2 + 9; ay < bh / 2; ay += 3) {
          for (let ax = -bw / 2 + 1; ax < bw / 2 - 1; ax += 3) {
            if ((floor(ax / 3) + floor(ay / 3)) % 2 === 0) {
              fill(fc.trim[0] - 20, fc.trim[1] - 20, fc.trim[2] - 23);
              rect(ax, ay, 3, 3);
            }
          }
        }
        fill(fc.column[0] + 2, fc.column[1] + 2, fc.column[2]);
        rect(-8, -bh / 2 + 2, 16, 12, 1);
        fill(fc.column[0] + 10, fc.column[1] + 10, fc.column[2] + 8);
        rect(-9, -bh / 2, 18, 4, 1);
        fill(145, 115, 55);
        ellipse(0, -bh / 2 + 2, 10, 5);
        fill(130, 100, 45);
        ellipse(0, -bh / 2 + 2, 8, 3);
        {
          let incAlpha = map(getSkyBrightness(), 0.2, 1.0, 45, 18);
          for (let si5 = 0; si5 < 3; si5++) {
            let sPhase5 = frameCount * 0.015 + si5 * 1.8 + b.x * 0.009;
            for (let sp5 = 0; sp5 < 4; sp5++) {
              let sFrac5 = sp5 / 3;
              let sx5b = -1 + si5 * 1 + floor(sin(sPhase5 + sp5 * 0.7) * (1 + sp5));
              let sy5b = -bh / 2 - 2 - floor(sp5 * 6 + (frameCount * 0.4 + si5 * 15) % 24);
              let sa5 = incAlpha * (1 - sFrac5 * 0.8);
              fill(200, 195, 210, sa5);
              noStroke();
              rect(sx5b, sy5b, 2, 2);
            }
          }
        }
        let altFlick = sin(frameCount * 0.25 + b.x * 0.6) * 1;
        fill(255, 200, 60, 200);
        rect(-bw / 2 + 3, -bh / 2 + 4 + altFlick, 2, 3);
        rect(bw / 2 - 5, -bh / 2 + 3 + altFlick * 0.8, 2, 3);
        fill(255, 140, 30, 160);
        rect(-bw / 2 + 3, -bh / 2 + 2 + altFlick, 2, 2);
        rect(bw / 2 - 5, -bh / 2 + 1 + altFlick * 0.8, 2, 2);
        if (getSkyBrightness() < 0.4) {
          let altNight = map(getSkyBrightness(), 0, 0.4, 1, 0);
          fill(255, 210, 100, 30 * altNight);
          ellipse(0, -bh / 2 + 4, 20, 14);
          fill(200, 160, 80, 20 * altNight);
          ellipse(0, 0, bw, bh * 0.8);
        }
        break;
      }

      case 'bakery': {
        noStroke();
        fill(0, 0, 0, 25);
        rect(-bw / 2 + 2, bh / 2 - 3, bw, 5);
        let _bkfc = fc;
        fill(_bkfc.wall[0], _bkfc.wall[1], _bkfc.wall[2]);
        rect(-bw / 2, -bh / 2 + 8, bw, bh - 8, 1);
        // Wall highlight
        fill(_bkfc.wall[0] + 10, _bkfc.wall[1] + 10, _bkfc.wall[2] + 6, 40);
        rect(-bw / 2, -bh / 2 + 8, bw * 0.3, bh - 8);
        stroke(_bkfc.wall[0] - 20, _bkfc.wall[1] - 20, _bkfc.wall[2] - 20, 50);
        strokeWeight(0.5);
        for (let bky = -bh / 2 + 12; bky < bh / 2; bky += 5) {
          line(-bw / 2 + 1, bky, bw / 2 - 1, bky);
        }
        noStroke();
        if (state.faction === 'rome' || state.faction === 'greece') {
          fill(165, 155, 138);
          arc(bw / 4, -bh / 2 + 16, 20, 16, PI, TWO_PI, PIE);
          // Brick course arcs on dome
          stroke(150, 140, 122, 70);
          strokeWeight(0.4);
          arc(bw / 4, -bh / 2 + 16, 16, 12, PI, TWO_PI);
          arc(bw / 4, -bh / 2 + 16, 10, 8, PI, TWO_PI);
          noStroke();
          fill(155, 145, 128);
          rect(bw / 4 - 10, -bh / 2 + 16, 20, 6, 1);
          fill(40, 30, 18, 200);
          rect(bw / 4 - 4, -bh / 2 + 14, 8, 8, 1);
          let ovenGlow = 80 + sin(frameCount * 0.06 + b.x * 0.1) * 40;
          fill(255, 120, 30, ovenGlow);
          rect(bw / 4 - 3, -bh / 2 + 16, 6, 5);
          // Inner glow
          fill(255, 180, 60, ovenGlow * 0.5);
          rect(bw / 4 - 2, -bh / 2 + 17, 4, 3);
        } else {
          fill(178, 130, 82);
          rect(bw / 4 - 7, -bh / 2 + 10, 14, 14, 2);
          fill(168, 120, 72);
          ellipse(bw / 4, -bh / 2 + 10, 14, 6);
          fill(40, 30, 18, 200);
          ellipse(bw / 4, -bh / 2 + 10, 8, 4);
          let tandoorGlow = 80 + sin(frameCount * 0.06 + b.x * 0.1) * 40;
          fill(255, 140, 40, tandoorGlow);
          ellipse(bw / 4, -bh / 2 + 11, 6, 3);
        }
        fill(105, 75, 35);
        rect(-bw / 2 + 4, -bh / 2 + 10, 14, 18, 1);
        fill(95, 65, 28);
        rect(-bw / 2 + 4, -bh / 2 + 15, 14, 1);
        rect(-bw / 2 + 4, -bh / 2 + 21, 14, 1);
        // Bread loaves with scoring marks
        fill(195, 155, 75);
        ellipse(-bw / 2 + 8, -bh / 2 + 13, 5, 3);
        ellipse(-bw / 2 + 14, -bh / 2 + 13, 5, 3);
        stroke(175, 135, 55, 80);
        strokeWeight(0.4);
        line(-bw / 2 + 7, -bh / 2 + 13, -bw / 2 + 9, -bh / 2 + 12);
        line(-bw / 2 + 13, -bh / 2 + 13, -bw / 2 + 15, -bh / 2 + 12);
        noStroke();
        fill(205, 165, 80);
        ellipse(-bw / 2 + 8, -bh / 2 + 19, 5, 3);
        ellipse(-bw / 2 + 14, -bh / 2 + 19, 5, 3);
        // Bottom shelf — long loaf
        fill(190, 150, 70);
        ellipse(-bw / 2 + 11, -bh / 2 + 25, 8, 3);
        // Flour sack beside counter
        fill(210, 200, 175);
        rect(-bw / 2 + 2, -bh / 2 + 27, 5, 4, 1);
        fill(195, 185, 160);
        rect(-bw / 2 + 2, -bh / 2 + 27, 5, 1.5);
        fill(fc.roof[0], fc.roof[1], fc.roof[2]);
        beginShape();
        vertex(-bw / 2 - 2, -bh / 2 + 8);
        vertex(0, -bh / 2 - 4);
        vertex(bw / 2 + 2, -bh / 2 + 8);
        endShape(CLOSE);
        fill(fc.roof[0] + 10, fc.roof[1] + 15, fc.roof[2] + 10);
        beginShape();
        vertex(-bw / 2 + 2, -bh / 2 + 7);
        vertex(0, -bh / 2 - 2);
        vertex(bw / 2 - 2, -bh / 2 + 7);
        endShape(CLOSE);
        // Tile row lines on roof
        stroke(fc.roof[0] - 18, fc.roof[1] - 12, fc.roof[2] - 8, 65);
        strokeWeight(0.5);
        for (let btr = 1; btr < 4; btr++) {
          let bty = -bh / 2 + 7 - btr * 2.6;
          let btx = (bw / 2 - 2) * (1 - btr * 2.6 / 12);
          line(-btx, bty, btx, bty);
        }
        noStroke();
        fill(fc.trim[0] - 30, fc.trim[1] - 33, fc.trim[2] - 37);
        rect(bw / 4 - 3, -bh / 2 - 6, 6, 8);
        fill(fc.trim[0] - 20, fc.trim[1] - 23, fc.trim[2] - 27);
        rect(bw / 4 - 4, -bh / 2 - 8, 8, 3, 1);
        {
          let bkSmoke = map(getSkyBrightness(), 0.2, 1.0, 50, 22);
          for (let si6 = 0; si6 < 3; si6++) {
            let sP6 = frameCount * 0.014 + si6 * 2 + b.x * 0.008;
            for (let sp6 = 0; sp6 < 4; sp6++) {
              let sF6 = sp6 / 3;
              let sx6 = bw / 4 + floor(sin(sP6 + sp6 * 0.6) * (1 + sp6));
              let sy6 = -bh / 2 - 10 - floor(sp6 * 7 + (frameCount * 0.5 + si6 * 18) % 28);
              fill(180, 175, 165, bkSmoke * (1 - sF6 * 0.75));
              noStroke();
              rect(sx6, sy6, 2 + floor(sF6), 2 + floor(sF6));
            }
          }
        }
        // Door with plank detail
        fill(fc.door[0], fc.door[1], fc.door[2]);
        rect(-3, -bh / 2 + 20, 6, 10, 1);
        fill(fc.door[0] - 15, fc.door[1] - 10, fc.door[2] - 5, 80);
        rect(-1, -bh / 2 + 21, 1, 8);
        rect(2, -bh / 2 + 21, 1, 8);
        // Foundation
        fill(_bkfc.wall[0] - 25, _bkfc.wall[1] - 20, _bkfc.wall[2] - 15);
        rect(-bw / 2, bh / 2 - 3, bw, 3, 1);
        // Night: oven + door glow + ambient warmth
        if (getSkyBrightness() < 0.4) {
          let bkNight = map(getSkyBrightness(), 0, 0.4, 1, 0);
          fill(255, 150, 50, 45 * bkNight);
          ellipse(bw / 4, -bh / 2 + 18, 18, 14);
          fill(255, 190, 70, 30 * bkNight);
          rect(-4, -bh / 2 + 20, 8, 10);
          fill(255, 160, 60, 10 * bkNight);
          ellipse(0, 0, bw + 10, bh + 6);
        }
        // Upgrade prompt when player is near
        if ((b.tier || 1) < 3 && !state.buildMode && dist(state.player.x, state.player.y, b.x, b.y) < 50) {
          let tierLabel = (b.tier || 1) === 1 ? 'Stone Oven' : 'Grand Bakery';
          fill(255, 220, 120, 200 + sin(frameCount * 0.08) * 40);
          textAlign(CENTER, CENTER); textSize(9);
          noStroke();
          text('[E] Upgrade to ' + tierLabel, 0, -bh / 2 - 18);
          textAlign(LEFT, TOP);
        }
        // Tier 2+: extra chimney with smoke
        if ((b.tier || 1) >= 2) {
          noStroke();
          fill(fc.wall[0] - 30, fc.wall[1] - 28, fc.wall[2] - 22);
          rect(-bw / 4 - 3, -bh / 2 - 10, 6, 12);
          fill(fc.wall[0] - 20, fc.wall[1] - 18, fc.wall[2] - 14);
          rect(-bw / 4 - 4, -bh / 2 - 12, 8, 3, 1);
          // Extra smoke from second chimney
          let t2Smoke = map(getSkyBrightness(), 0.2, 1.0, 45, 18);
          for (let si7 = 0; si7 < 2; si7++) {
            let sP7 = frameCount * 0.012 + si7 * 3 + b.x * 0.01;
            for (let sp7 = 0; sp7 < 3; sp7++) {
              let sF7 = sp7 / 2;
              let sx7 = -bw / 4 + floor(sin(sP7 + sp7 * 0.5) * (1 + sp7));
              let sy7 = -bh / 2 - 14 - floor(sp7 * 6 + (frameCount * 0.4 + si7 * 15) % 20);
              fill(180, 175, 165, t2Smoke * (1 - sF7 * 0.7));
              noStroke();
              rect(sx7, sy7, 2 + floor(sF7), 2 + floor(sF7));
            }
          }
        }
        // Tier 3: awning over entrance
        if ((b.tier || 1) >= 3) {
          noStroke();
          // Striped awning
          let awnC1 = [fc.roof[0], fc.roof[1], fc.roof[2]];
          let awnC2 = [fc.roof[0] + 30, fc.roof[1] + 25, fc.roof[2] + 15];
          for (let awi = 0; awi < 4; awi++) {
            let awc = awi % 2 === 0 ? awnC1 : awnC2;
            fill(awc[0], awc[1], awc[2], 210);
            rect(-8 + awi * 4, -bh / 2 + 28, 4, 6);
          }
          fill(fc.roof[0], fc.roof[1], fc.roof[2], 220);
          beginShape();
          vertex(-10, -bh / 2 + 28);
          vertex(10, -bh / 2 + 28);
          vertex(12, -bh / 2 + 30);
          vertex(-12, -bh / 2 + 30);
          endShape(CLOSE);
          // Gold coin symbol on wall (bakery sales)
          fill(220, 190, 50, 150);
          ellipse(bw / 2 - 6, -bh / 2 + 22, 5, 5);
          fill(200, 170, 30, 100);
          textSize(3);
          textAlign(CENTER, CENTER);
          text('G', bw / 2 - 6, -bh / 2 + 22);
        }
        break;
      }

      case 'windmill': {
        noStroke();
        // Shadow
        fill(0, 0, 0, 25);
        ellipse(0, bh / 2 - 2, bw * 0.7, 8);
        // Stone tower base (tapered cylinder)
        fill(fc.wall[0] - 5, fc.wall[1] - 5, fc.wall[2] - 5);
        beginShape();
        vertex(-12, bh / 2);
        vertex(-10, -bh / 2 + 14);
        vertex(10, -bh / 2 + 14);
        vertex(12, bh / 2);
        endShape(CLOSE);
        // Stone mortar lines
        stroke(fc.wall[0] - 25, fc.wall[1] - 25, fc.wall[2] - 20, 50);
        strokeWeight(0.4);
        for (let wmy = -bh / 2 + 18; wmy < bh / 2; wmy += 5) {
          let taper = map(wmy, -bh / 2 + 14, bh / 2, 10, 12);
          line(-taper, wmy, taper, wmy);
        }
        noStroke();
        // Highlight on left side
        fill(fc.wall[0] + 8, fc.wall[1] + 8, fc.wall[2] + 5, 40);
        beginShape();
        vertex(-12, bh / 2);
        vertex(-10, -bh / 2 + 14);
        vertex(-5, -bh / 2 + 14);
        vertex(-7, bh / 2);
        endShape(CLOSE);
        // Faction-colored roof cap
        fill(fc.roof[0], fc.roof[1], fc.roof[2]);
        beginShape();
        vertex(-11, -bh / 2 + 15);
        vertex(0, -bh / 2 + 4);
        vertex(11, -bh / 2 + 15);
        endShape(CLOSE);
        fill(fc.roof[0] + 10, fc.roof[1] + 12, fc.roof[2] + 8);
        beginShape();
        vertex(-8, -bh / 2 + 14);
        vertex(0, -bh / 2 + 6);
        vertex(8, -bh / 2 + 14);
        endShape(CLOSE);
        // Rotating blades (4 blades using sin/cos with frameCount)
        let wmAngle = frameCount * 0.02 + b.x * 0.1;
        let wmHubX = 0, wmHubY = -bh / 2 + 10;
        let bladeLen = 20;
        stroke(105, 80, 45);
        strokeWeight(1.5);
        for (let bi = 0; bi < 4; bi++) {
          let ba = wmAngle + bi * HALF_PI;
          let bex = wmHubX + cos(ba) * bladeLen;
          let bey = wmHubY + sin(ba) * bladeLen;
          line(wmHubX, wmHubY, bex, bey);
          // Sail cloth on each blade
          noStroke();
          fill(230, 220, 200, 180);
          beginShape();
          vertex(wmHubX + cos(ba) * 4, wmHubY + sin(ba) * 4);
          vertex(bex, bey);
          vertex(bex + cos(ba + 0.4) * 5, bey + sin(ba + 0.4) * 5);
          vertex(wmHubX + cos(ba + 0.3) * 5, wmHubY + sin(ba + 0.3) * 5);
          endShape(CLOSE);
          stroke(105, 80, 45);
          strokeWeight(1.5);
        }
        // Hub
        noStroke();
        fill(90, 70, 40);
        ellipse(wmHubX, wmHubY, 5, 5);
        // Window halfway up
        fill(40, 35, 25, 180);
        rect(-3, -2, 6, 5, 1);
        fill(140, 170, 200, 60);
        rect(-2, -1, 4, 3);
        // Door at base
        fill(fc.door[0], fc.door[1], fc.door[2]);
        rect(-4, bh / 2 - 12, 8, 12, 1);
        fill(fc.door[0] - 15, fc.door[1] - 10, fc.door[2] - 5, 80);
        rect(-2, bh / 2 - 10, 1, 8);
        rect(1, bh / 2 - 10, 1, 8);
        // Foundation
        fill(fc.wall[0] - 20, fc.wall[1] - 18, fc.wall[2] - 12);
        rect(-13, bh / 2 - 2, 26, 3, 1);
        // Night glow from window
        if (getSkyBrightness() < 0.4) {
          let wmNight = map(getSkyBrightness(), 0, 0.4, 1, 0);
          fill(255, 180, 70, 35 * wmNight);
          rect(-4, -3, 8, 7);
          fill(255, 160, 50, 15 * wmNight);
          ellipse(0, bh / 2 - 6, 16, 10);
        }
        break;
      }

      case 'marketplace': {
        noStroke();
        fill(0, 0, 0, 25);
        rect(-bw / 2 + 2, bh / 2 - 4, bw, 5);
        fill(fc.wall[0] - 15, fc.wall[1] - 15, fc.wall[2] - 10);
        rect(-bw / 2, -bh / 2 + 12, bw, bh - 12, 1);
        stroke(fc.wall[0] - 35, fc.wall[1] - 35, fc.wall[2] - 30, 50);
        strokeWeight(0.4);
        for (let mpy = -bh / 2 + 14; mpy < bh / 2; mpy += 6) {
          line(-bw / 2 + 1, mpy, bw / 2 - 1, mpy);
        }
        noStroke();
        fill(115, 85, 38);
        rect(-bw / 2 + 3, -bh / 2, 3, 18, 1);
        rect(-bw / 2 + floor(bw / 3), -bh / 2, 3, 18, 1);
        rect(bw / 2 - floor(bw / 3) - 3, -bh / 2, 3, 18, 1);
        rect(bw / 2 - 6, -bh / 2, 3, 18, 1);
        let mpAwnings = [[185, 45, 35], [45, 85, 160], [180, 145, 40]];
        let mpStallW = floor((bw - 6) / 3);
        for (let msi = 0; msi < 3; msi++) {
          let mpac = mpAwnings[((floor(abs(b.x) * 0.13) + msi) % 3 + 3) % 3];
          let mpx = -bw / 2 + 3 + msi * mpStallW;
          fill(mpac[0], mpac[1], mpac[2], 210);
          beginShape();
          vertex(mpx, -bh / 2 + 2);
          vertex(mpx + mpStallW, -bh / 2 + 2);
          vertex(mpx + mpStallW + 2, -bh / 2 + 10);
          vertex(mpx - 1, -bh / 2 + 10);
          endShape(CLOSE);
          fill(mpac[0] + 20, mpac[1] + 20, mpac[2] + 20, 160);
          for (let mf = 0; mf < floor(mpStallW / 4); mf++) {
            rect(mpx + mf * 4 + 1, -bh / 2 + 10, 2, 3);
          }
        }
        fill(130, 95, 45);
        rect(-bw / 2 + 4, -bh / 2 + 14, bw - 8, 4, 1);
        fill(180, 55, 35);
        ellipse(-bw / 2 + 10, -bh / 2 + 13, 4, 3);
        fill(200, 165, 40);
        ellipse(-bw / 2 + 14, -bh / 2 + 13, 4, 3);
        fill(55, 120, 45);
        ellipse(-bw / 2 + 18, -bh / 2 + 13, 4, 3);
        fill(170, 90, 45);
        ellipse(0, -bh / 2 + 12, 5, 7);
        rect(-1, -bh / 2 + 7, 2, 3);
        fill(130, 50, 130);
        rect(bw / 2 - 18, -bh / 2 + 11, 5, 5, 1);
        fill(45, 95, 150);
        rect(bw / 2 - 12, -bh / 2 + 11, 5, 5, 1);
        stroke(130, 100, 48, 140);
        strokeWeight(0.6);
        line(-bw / 2 + 10, -bh / 2 + 2, -bw / 2 + 10, -bh / 2 - 4);
        line(0, -bh / 2 + 2, 0, -bh / 2 - 3);
        line(bw / 2 - 10, -bh / 2 + 2, bw / 2 - 10, -bh / 2 - 4);
        noStroke();
        fill(140, 55, 35);
        rect(-bw / 2 + 9, -bh / 2 - 4, 2, 4);
        fill(55, 90, 35);
        rect(-1, -bh / 2 - 3, 2, 3);
        fill(180, 140, 55);
        rect(bw / 2 - 11, -bh / 2 - 4, 2, 4);
        fill(170, 155, 115);
        rect(-5, -bh / 2 - 6, 10, 4, 1);
        fill(95, 75, 35);
        rect(-3, -bh / 2 - 5, 6, 1);
        rect(-3, -bh / 2 - 3, 6, 1);
        break;
      }

      case 'vineyard': {
        noStroke();
        let vSeason = getSeason();
        let vGround = vSeason === 3 ? [145, 130, 110] : [135, 115, 78];
        fill(vGround[0], vGround[1], vGround[2]);
        rect(-bw / 2, -bh / 2 + 4, bw, bh - 4, 1);
        stroke(vGround[0] - 15, vGround[1] - 15, vGround[2] - 15, 60);
        strokeWeight(0.5);
        for (let vy = -bh / 2 + 8; vy < bh / 2; vy += 8) {
          line(-bw / 2 + 2, vy, bw / 2 - 2, vy);
        }
        noStroke();
        for (let row = 0; row < 4; row++) {
          let ry = -bh / 2 + 8 + row * 8;
          fill(105, 75, 35);
          for (let si7 = 0; si7 < 5; si7++) {
            let stx = -bw / 2 + 6 + si7 * (bw - 12) / 4;
            rect(stx - 1, ry - 6, 2, 10);
          }
          stroke(120, 110, 95, 100);
          strokeWeight(0.5);
          line(-bw / 2 + 6, ry - 4, bw / 2 - 6, ry - 4);
          line(-bw / 2 + 6, ry - 1, bw / 2 - 6, ry - 1);
          noStroke();
          if (vSeason !== 3) {
            let leafG = vSeason === 2 ? [140, 110, 35] : [45, 95, 30];
            fill(leafG[0], leafG[1], leafG[2], 180);
            for (let lx = -bw / 2 + 8; lx < bw / 2 - 6; lx += 5) {
              rect(lx, ry - 5, 4, 4, 1);
            }
            if (vSeason >= 1) {
              for (let gx = -bw / 2 + 10; gx < bw / 2 - 8; gx += 12) {
                let grapeCol = vSeason === 2 ? [120, 40, 80] : [100, 30, 120];
                fill(grapeCol[0], grapeCol[1], grapeCol[2], 200);
                circle(gx, ry + 1, 3);
                circle(gx + 2, ry, 3);
                circle(gx + 1, ry + 2, 2.5);
                fill(grapeCol[0] + 40, grapeCol[1] + 30, grapeCol[2] + 30, 100);
                circle(gx + 1, ry, 1.5);
              }
            }
          } else {
            fill(85, 60, 30, 120);
            for (let lx = -bw / 2 + 8; lx < bw / 2 - 6; lx += 7) {
              rect(lx, ry - 4, 1, 3);
              rect(lx + 2, ry - 3, 1, 2);
            }
          }
        }
        fill(85, 58, 28);
        ellipse(bw / 2 - 8, bh / 2 - 6, 10, 8);
        fill(75, 50, 22);
        ellipse(bw / 2 - 8, bh / 2 - 6, 8, 6);
        fill(140, 110, 50);
        rect(bw / 2 - 12, bh / 2 - 8, 8, 1);
        rect(bw / 2 - 12, bh / 2 - 4, 8, 1);
        break;
      }

      case 'bathhouse': {
        noStroke();
        fill(0, 0, 0, 30);
        rect(-bw / 2 + 3, bh / 2 - 3, bw, 7);
        fill(fc.trim[0] - 20, fc.trim[1] - 23, fc.trim[2] - 27);
        rect(-bw / 2 + 2, bh / 2 - 8, bw - 4, 8, 1);
        fill(fc.wall[0], fc.wall[1], fc.wall[2]);
        rect(-bw / 2, -bh / 2 + 10, bw, bh - 18, 1);
        stroke(fc.wall[0] - 20, fc.wall[1] - 20, fc.wall[2] - 20, 40);
        strokeWeight(0.5);
        for (let bhy = -bh / 2 + 16; bhy < bh / 2 - 10; bhy += 6) {
          line(-bw / 2 + 1, bhy, bw / 2 - 1, bhy);
        }
        noStroke();
        fill(42, 105, 162, 195);
        rect(-bw / 2 + 10, -bh / 2 + 18, bw - 20, bh - 36, 3);
        fill(fc.trim[0], fc.trim[1], fc.trim[2]);
        rect(-bw / 2 + 8, -bh / 2 + 16, bw - 16, 3);
        rect(-bw / 2 + 8, bh / 2 - 19, bw - 16, 3);
        rect(-bw / 2 + 8, -bh / 2 + 16, 3, bh - 32);
        rect(bw / 2 - 11, -bh / 2 + 16, 3, bh - 32);
        let bhPhase = frameCount * 0.04 + b.x * 0.1;
        fill(75, 148, 210, 55 + sin(bhPhase) * 28);
        rect(-bw / 2 + 14, -bh / 2 + 22, 14, 4, 2);
        fill(90, 165, 225, 35 + sin(bhPhase * 1.3) * 18);
        rect(bw / 2 - 28, -bh / 2 + 26, 12, 3, 2);
        fill(120, 185, 230, 25 + sin(bhPhase * 0.9) * 12);
        rect(-bw / 2 + 12, bh / 2 - 26, bw - 26, 2);
        fill(fc.column[0], fc.column[1], fc.column[2]);
        let bhCols = [-bw/2 + 4, -bw/2 + floor(bw/3), bw/2 - floor(bw/3), bw/2 - 4];
        bhCols.forEach(bcx => {
          rect(bcx - 2.5, -bh / 2 + 2, 5, 16, 1);
          fill(fc.column[0] + 10, fc.column[1] + 10, fc.column[2] + 10);
          rect(bcx - 3.5, -bh / 2 + 1, 7, 3, 1);
          fill(fc.column[0], fc.column[1], fc.column[2]);
        });
        fill(fc.trim[0], fc.trim[1], fc.trim[2]);
        rect(-bw / 2 + 2, -bh / 2 + 6, bw - 4, 5, 1);
        fill(fc.roof[0], fc.roof[1], fc.roof[2]);
        beginShape();
        vertex(-bw / 2 + 2, -bh / 2 + 6);
        vertex(0, -bh / 2 - 5);
        vertex(bw / 2 - 2, -bh / 2 + 6);
        endShape(CLOSE);
        {
          let bhSteam = map(getSkyBrightness(), 0.2, 1.0, 45, 16);
          for (let si8 = 0; si8 < 3; si8++) {
            let sP8 = frameCount * 0.016 + si8 * 2.2 + b.x * 0.007;
            for (let sp8 = 0; sp8 < 4; sp8++) {
              let sF8 = sp8 / 3;
              let sx8 = -bw / 2 + 16 + si8 * (bw - 28) / 2 + floor(sin(sP8 + sp8 * 0.6) * (1.5 + sp8));
              let sy8 = -bh / 2 + 16 - floor(sp8 * 7 + (frameCount * 0.45 + si8 * 18) % 28);
              fill(225, 230, 240, bhSteam * (1 - sF8 * 0.8));
              noStroke();
              rect(sx8, sy8, 2 + floor(sF8), 2 + floor(sF8));
            }
          }
        }
        fill(fc.trim[0] - 10, fc.trim[1] - 10, fc.trim[2] - 13);
        rect(-10, bh / 2 - 10, 20, 4, 1);
        rect(-8, bh / 2 - 6, 16, 3, 1);
        if (getSkyBrightness() < 0.35) {
          let bhNight = map(getSkyBrightness(), 0, 0.35, 1, 0);
          fill(40, 100, 175, 35 * bhNight);
          rect(-bw / 2 + 10, -bh / 2 + 18, bw - 20, bh - 36);
          fill(255, 190, 80, 30 * bhNight);
          ellipse(-bw / 2 + 4, -bh / 2 + 10, 10, 8);
          ellipse(bw / 2 - 4, -bh / 2 + 10, 10, 8);
        }
        break;
      }

      case 'guardtower': {
        noStroke();
        fill(0, 0, 0, 28);
        rect(-bw / 2 + 1, bh / 2 - 3, bw + 2, 5);
        fill(fc.trim[0] - 25, fc.trim[1] - 28, fc.trim[2] - 30);
        rect(-bw / 2 - 2, bh / 2 - 10, bw + 4, 10, 1);
        fill(fc.wall[0] - 70, fc.wall[1] - 80, fc.wall[2] - 90);
        rect(-bw / 2, -bh / 2 + 12, bw, bh - 22, 1);
        stroke(95, 65, 28, 80);
        strokeWeight(0.5);
        for (let gty = -bh / 2 + 16; gty < bh / 2 - 14; gty += 5) {
          line(-bw / 2 + 1, gty, bw / 2 - 1, gty);
        }
        line(-bw / 2 + floor(bw / 3), -bh / 2 + 14, -bw / 2 + floor(bw / 3), bh / 2 - 12);
        line(bw / 2 - floor(bw / 3), -bh / 2 + 14, bw / 2 - floor(bw / 3), bh / 2 - 12);
        noStroke();
        stroke(100, 72, 32, 100);
        strokeWeight(0.8);
        line(-bw / 2 + 2, -bh / 2 + 20, bw / 2 - 2, bh / 2 - 16);
        line(bw / 2 - 2, -bh / 2 + 20, -bw / 2 + 2, bh / 2 - 16);
        noStroke();
        fill(125, 92, 42);
        rect(-bw / 2 - 3, -bh / 2 + 8, bw + 6, 6, 1);
        fill(135, 100, 48);
        rect(-bw / 2 - 4, -bh / 2 + 6, bw + 8, 3, 1);
        fill(110, 78, 35);
        rect(-bw / 2 - 3, -bh / 2, 3, 10);
        rect(bw / 2, -bh / 2, 3, 10);
        fill(120, 88, 40);
        rect(-bw / 2 - 3, -bh / 2 + 1, bw + 6, 2, 1);
        fill(65, 45, 25);
        rect(-2, -bh / 2 - 4, 4, 6);
        circle(0, -bh / 2 - 6, 4);
        stroke(85, 60, 28);
        strokeWeight(0.8);
        noFill();
        arc(3, -bh / 2 - 3, 4, 8, -HALF_PI, HALF_PI);
        noStroke();
        fill(35, 25, 15, 200);
        rect(-1, -bh / 2 + 22, 2, 6, 1);
        rect(-1, -bh / 2 + 34, 2, 6, 1);
        if (getSkyBrightness() < 0.45) {
          let gtNight = map(getSkyBrightness(), 0, 0.45, 1, 0);
          fill(90, 65, 30);
          rect(-bw / 2 - 5, -bh / 2 - 2, 2, 8);
          let gtFlick = sin(frameCount * 0.28 + b.x * 0.5) * 1.5;
          fill(255, 140, 30, 200 * gtNight);
          beginShape();
          vertex(-bw / 2 - 4 + gtFlick * 0.3, -bh / 2 - 8 + gtFlick);
          vertex(-bw / 2 - 6, -bh / 2 - 2);
          vertex(-bw / 2 - 2, -bh / 2 - 2);
          endShape(CLOSE);
          fill(255, 210, 60, 180 * gtNight);
          beginShape();
          vertex(-bw / 2 - 4, -bh / 2 - 6 + gtFlick * 0.5);
          vertex(-bw / 2 - 5, -bh / 2 - 2);
          vertex(-bw / 2 - 3, -bh / 2 - 2);
          endShape(CLOSE);
          fill(255, 170, 50, 25 * gtNight);
          ellipse(0, -bh / 2 + 4, 20, 12);
        }
        break;
      }

      case 'lighthouse': {
        noStroke();
        fill(0, 0, 0, 30);
        rect(-bw / 2 + 2, bh / 2 - 4, bw + 2, 6);
        fill(fc.trim[0] - 20, fc.trim[1] - 23, fc.trim[2] - 25);
        rect(-bw / 2, bh / 2 - 12, bw, 12, 1);
        fill(fc.trim[0] - 10, fc.trim[1] - 13, fc.trim[2] - 17);
        rect(-bw / 2 + 1, bh / 2 - 14, bw - 2, 3, 1);
        let lhBotW = bw - 2;
        let lhTopW = bw * 0.6;
        fill(fc.wall[0], fc.wall[1], fc.wall[2]);
        beginShape();
        vertex(-lhBotW / 2, bh / 2 - 14);
        vertex(-lhTopW / 2, -bh / 2 + 16);
        vertex(lhTopW / 2, -bh / 2 + 16);
        vertex(lhBotW / 2, bh / 2 - 14);
        endShape(CLOSE);
        stroke(fc.wall[0] - 20, fc.wall[1] - 20, fc.wall[2] - 20, 55);
        strokeWeight(0.5);
        for (let lhy = -bh / 2 + 20; lhy < bh / 2 - 16; lhy += 6) {
          let frac = (lhy - (-bh / 2 + 16)) / (bh - 30);
          let halfW = lerp(lhTopW / 2, lhBotW / 2, frac);
          line(-halfW + 1, lhy, halfW - 1, lhy);
        }
        noStroke();
        fill(40, 55, 80, 200);
        rect(-1.5, -bh / 2 + 22, 3, 5, 1);
        rect(-1.5, -bh / 2 + 34, 3, 5, 1);
        rect(-1.5, bh / 2 - 26, 3, 5, 1);
        fill(fc.trim[0] - 10, fc.trim[1] - 10, fc.trim[2] - 13);
        rect(-lhTopW / 2 - 3, -bh / 2 + 12, lhTopW + 6, 5, 1);
        fill(fc.trim[0], fc.trim[1], fc.trim[2]);
        rect(-lhTopW / 2 - 4, -bh / 2 + 10, lhTopW + 8, 3, 1);
        fill(fc.trim[0] - 15, fc.trim[1] - 16, fc.trim[2] - 17);
        rect(-lhTopW / 2 - 3, -bh / 2 + 8, 2, 5);
        rect(lhTopW / 2 + 1, -bh / 2 + 8, 2, 5);
        fill(fc.column[0] + 5, fc.column[1] + 5, fc.column[2] + 2);
        rect(-lhTopW / 4, -bh / 2 + 2, lhTopW / 2, 10, 1);
        fill(140, 110, 50);
        arc(0, -bh / 2 + 2, lhTopW / 2 + 2, 6, PI, TWO_PI, PIE);
        fill(150, 120, 55);
        rect(-2, -bh / 2 - 2, 4, 3, 1);
        {
          let lhBright = getSkyBrightness();
          let lhStr = map(lhBright, 0, 0.5, 1, 0.2);
          let lhPulse = 0.7 + sin(frameCount * 0.05 + b.x * 0.08) * 0.3;
          fill(255, 220, 80, 120 * lhStr * lhPulse);
          rect(-lhTopW / 4 + 1, -bh / 2 + 3, lhTopW / 2 - 2, 8);
          if (lhBright < 0.4) {
            let lhNight = map(lhBright, 0, 0.4, 1, 0);
            let beamAngle = (frameCount * 0.02 + b.x * 0.01) % TWO_PI;
            let beamDx = cos(beamAngle) * 50;
            let beamDy = sin(beamAngle) * 30;
            fill(255, 240, 160, 15 * lhNight);
            beginShape();
            vertex(0, -bh / 2 + 6);
            vertex(beamDx - 8, -bh / 2 + 6 + beamDy - 5);
            vertex(beamDx + 8, -bh / 2 + 6 + beamDy + 5);
            endShape(CLOSE);
            fill(255, 230, 120, 50 * lhNight);
            ellipse(0, -bh / 2 + 6, 12, 10);
            fill(255, 200, 80, 15 * lhNight);
            rect(-lhTopW / 2, -bh / 2 + 14, lhTopW, 10);
          }
        }
        break;
      }

      case 'sculptor': {
        noStroke();
        fill(0, 0, 0, 25);
        rect(-bw / 2 + 2, bh / 2 - 3, bw, 5);
        fill(fc.wall[0], fc.wall[1], fc.wall[2]);
        rect(-bw / 2, -bh / 2 + 8, bw, bh - 8, 1);
        stroke(fc.wall[0] - 20, fc.wall[1] - 20, fc.wall[2] - 20, 45);
        strokeWeight(0.5);
        for (let scy = -bh / 2 + 14; scy < bh / 2; scy += 5) {
          line(-bw / 2 + 1, scy, bw / 2 - 1, scy);
        }
        noStroke();
        fill(fc.trim[0] - 30, fc.trim[1] - 33, fc.trim[2] - 35);
        rect(-bw / 2 + 4, -bh / 2 + 14, bw - 8, bh - 22, 1);
        fill(225, 220, 210);
        rect(-bw / 2 + 6, bh / 2 - 14, 10, 8, 1);
        fill(215, 210, 200);
        rect(-bw / 2 + 6, bh / 2 - 20, 8, 6, 1);
        fill(220, 215, 205);
        rect(-bw / 2 + 16, bh / 2 - 12, 6, 6, 1);
        fill(228, 222, 212);
        rect(-4, -bh / 2 + 26, 8, 4, 1);
        fill(232, 226, 216);
        rect(-3, -bh / 2 + 22, 6, 4);
        rect(-2.5, -bh / 2 + 16, 5, 8);
        circle(0, -bh / 2 + 15, 5);
        rect(-5, -bh / 2 + 18, 3, 2);
        rect(2, -bh / 2 + 18, 3, 2);
        let dustPhase = frameCount * 0.08 + b.x * 0.05;
        fill(210, 205, 195, 30 + sin(dustPhase) * 15);
        rect(-6, -bh / 2 + 24, 12, 3);
        fill(110, 80, 38);
        rect(bw / 2 - 16, -bh / 2 + 18, 12, 4, 1);
        fill(160, 155, 148);
        rect(bw / 2 - 14, -bh / 2 + 16, 1, 4);
        fill(95, 70, 32);
        rect(bw / 2 - 15, -bh / 2 + 15, 3, 2);
        fill(140, 135, 128);
        rect(bw / 2 - 9, -bh / 2 + 15, 4, 3, 1);
        fill(95, 70, 32);
        rect(bw / 2 - 8, -bh / 2 + 17, 2, 4);
        fill(218, 212, 202);
        rect(bw / 2 - 14, -bh / 2 + 24, 4, 6, 1);
        circle(bw / 2 - 12, -bh / 2 + 23, 3);
        fill(fc.roof[0], fc.roof[1], fc.roof[2]);
        beginShape();
        vertex(-bw / 2 - 2, -bh / 2 + 8);
        vertex(0, -bh / 2 - 4);
        vertex(bw / 2 + 2, -bh / 2 + 8);
        endShape(CLOSE);
        fill(fc.roof[0] + 10, fc.roof[1] + 15, fc.roof[2] + 10);
        beginShape();
        vertex(-bw / 2 + 2, -bh / 2 + 7);
        vertex(0, -bh / 2 - 2);
        vertex(bw / 2 - 2, -bh / 2 + 7);
        endShape(CLOSE);
        if (getSkyBrightness() < 0.4) {
          let scNight = map(getSkyBrightness(), 0, 0.4, 1, 0);
          fill(255, 195, 80, 35 * scNight);
          ellipse(0, -bh / 2 + 22, 16, 12);
          fill(255, 180, 60, 20 * scNight);
          rect(-bw / 2 + 6, -bh / 2 + 14, bw - 12, bh - 26);
        }
        break;
      }
      case 'crystal_collector': {
        noStroke();
        let ccPulse = sin(frameCount * 0.04) * 0.2 + 0.8;
        // Stone base platform
        fill(160, 155, 145);
        rect(-18, 0, 36, 12);
        fill(170, 165, 155);
        rect(-16, -2, 32, 10);
        // Two stone pillars
        fill(145, 140, 130);
        rect(-14, -14, 6, 14);
        rect(8, -14, 6, 14);
        // Crystal in center (glowing)
        let ccg = color(C.crystalGlow);
        fill(red(ccg) * ccPulse, green(ccg) * ccPulse, blue(ccg) * ccPulse, 200);
        rect(-4, -12, 8, 10);
        // Small crystal facets
        fill(red(ccg), green(ccg), blue(ccg), 120);
        rect(-2, -16, 4, 4);
        rect(-6, -8, 4, 4);
        rect(2, -8, 4, 4);
        // Glow aura
        fill(red(ccg), green(ccg), blue(ccg), 30 * ccPulse);
        ellipse(0, -6, 30, 20);
        break;
      }
    }
    // Ruined building overlay — darkened + X marker
    if (b.ruined) {
      noStroke();
      fill(0, 0, 0, 140);
      rect(-bw / 2, -bh, bw, bh);
      stroke(200, 60, 40, 180); strokeWeight(2);
      line(-bw / 4, -bh * 0.75, bw / 4, -bh * 0.25);
      line(bw / 4, -bh * 0.75, -bw / 4, -bh * 0.25);
      noStroke();
    } else if (b.durability !== undefined && b.durability < 50) {
      // Damaged overlay — slight darkening
      noStroke();
      fill(0, 0, 0, map(b.durability, 0, 50, 80, 0));
      rect(-bw / 2, -bh, bw, bh);
    }
    if (_building) drawingContext.globalAlpha = 1;
    pop();
}

// ─── BUILD UI + PLACEBUILDING ────────────────────────────────────
function drawBuildGhost() {
  // Called inside translate(shakeX, shakeY + floatOffset) — compensate mouse coords
  let wx = snapToGrid(s2wX(mouseX - shakeX));
  let wy = snapToGrid(s2wY(mouseY - shakeY - floatOffset));
  let bp = BLUEPRINTS[state.buildType];
  let bw = bp.w;
  let bh = bp.h;

  if ((state.buildRotation === 1 || state.buildRotation === 3) && ROTATABLE_TYPES.includes(state.buildType)) {
    let tmp = bw; bw = bh; bh = tmp;
  }

  let sx = w2sX(wx);
  let sy = w2sY(wy);

  let posValid;
  if (state.buildType === 'bridge') {
    let nearIsland = islandEdgeDist(wx, wy) < 0.3;
    let nearBridge = state.buildings.some(b => b.type === 'bridge' && dist2(b.x, b.y, wx, wy) < 48);
    posValid = nearIsland || nearBridge;
  } else {
    posValid = isOnIsland(wx, wy) || isOnBridge(wx, wy);
  }
  let valid = posValid && canAfford(state.buildType);

  // Ghost building sprite with transparency
  let ghostBuilding = { x: wx, y: wy, w: bw, h: bh, type: state.buildType, rot: state.buildRotation };
  push();
  drawingContext.globalAlpha = valid ? 0.55 : 0.25;
  drawOneBuilding(ghostBuilding);
  drawingContext.globalAlpha = 1.0;
  pop();

  // Adjacency bonus preview — highlight nearby buildings that would create a bonus
  if (valid) {
    for (let key in ADJACENCY_BONUSES) {
      let ab = ADJACENCY_BONUSES[key];
      let matchType = ab.type || key;
      let targets = [];
      if (state.buildType === matchType) targets = state.buildings.filter(b2 => !b2.ruined && b2.type === ab.near && dist(wx, wy, b2.x, b2.y) < ab.range);
      if (state.buildType === ab.near) targets = targets.concat(state.buildings.filter(b2 => !b2.ruined && b2.type === matchType && dist(wx, wy, b2.x, b2.y) < ab.range));
      for (let b2 of targets) {
        let bsx = w2sX(b2.x), bsy = w2sY(b2.y);
        push(); translate(bsx, bsy);
        noStroke(); fill(0, 255, 100, floor(40 + sin(frameCount * 0.1) * 20));
        rect(-b2.w / 2 - 2, -b2.h / 2 - 2, b2.w + 4, b2.h + 4, 3);
        fill(0, 255, 100); textSize(8); textAlign(CENTER, BOTTOM);
        text(ab.bonus, 0, -b2.h / 2 - 4); pop();
      }
    }
  }

  // Anchor crosshair — gold "+" at exact placement point
  push();
  translate(sx, sy);
  stroke(210, 180, 50);
  strokeWeight(1.5);
  line(-4, 0, 4, 0);
  line(0, -4, 0, 4);
  noStroke();
  pop();

  // Placement indicator ring
  push();
  translate(sx, sy);
  noFill();
  if (valid) {
    let pulse = 1 + sin(frameCount * 0.08) * 0.05;
    noStroke();
    fill(0, 255, 136, floor(30 + sin(frameCount * 0.1) * 15));
    let pw2 = floor((bw + 12) * pulse / 2), ph2 = floor((bh + 8) * pulse / 2);
    rect(-pw2, -1, pw2 * 2, 2); rect(-1, -ph2, 2, ph2 * 2);
    stroke(0, 255, 136, floor(100 + sin(frameCount * 0.1) * 50));
    strokeWeight(1);
    noFill();
    rect(-pw2, -ph2, pw2 * 2, ph2 * 2);
  } else {
    noStroke();
    fill(255, 60, 60, 20);
    rect(-(bw + 12) / 2, -(bh + 8) / 2, bw + 12, bh + 8);
    stroke(255, 60, 60, 80);
    strokeWeight(1);
    noFill();
    rect(-(bw + 12) / 2, -(bh + 8) / 2, bw + 12, bh + 8);
    // X mark
    stroke(255, 60, 60, 120);
    strokeWeight(2);
    line(-6, -6, 6, 6);
    line(6, -6, -6, 6);
  }
  noStroke();
  pop();
}

function getBuildDiscount() {
  let d = (state.prophecy && state.prophecy.type === 'build') ? 0.7 : 1;
  let natMult = typeof getNatBuildCostMult === 'function' ? getNatBuildCostMult() : 1.0;
  let masonryMult = (typeof hasTech === 'function' && hasTech('masonry')) ? 0.85 : 1.0;
  return d * natMult * masonryMult * (getFactionData().buildCostMult || 1);
}

function isBuildingUnlocked(buildType) {
  let bp = BLUEPRINTS[buildType];
  if (!bp.minLevel) return true;
  return (state.islandLevel || 1) >= bp.minLevel;
}

function canAfford(buildType) {
  let cost = BLUEPRINTS[buildType].cost;
  let d = getBuildDiscount();
  return state.crystals >= ceil((cost.crystals || 0) * d) &&
         state.wood >= ceil((cost.wood || 0) * d) &&
         state.stone >= ceil((cost.stone || 0) * d) &&
         (state.gold || 0) >= ceil((cost.gold || 0) * d) &&
         (state.ironOre || 0) >= ceil((cost.ironOre || 0) * d);
}

function payCost(buildType) {
  let cost = BLUEPRINTS[buildType].cost;
  let d = getBuildDiscount();
  state.crystals = max(0, state.crystals - ceil((cost.crystals || 0) * d));
  state.wood = max(0, state.wood - ceil((cost.wood || 0) * d));
  state.stone = max(0, state.stone - ceil((cost.stone || 0) * d));
  if (cost.gold) state.gold = max(0, state.gold - ceil(cost.gold * d));
  if (cost.ironOre) state.ironOre = max(0, state.ironOre - ceil(cost.ironOre * d));
}

function getCostString(buildType) {
  let cost = BLUEPRINTS[buildType].cost;
  let d = getBuildDiscount();
  let parts = [];
  if (cost.wood) parts.push(ceil(cost.wood * d) + 'W');
  if (cost.stone) parts.push(ceil(cost.stone * d) + 'S');
  if (cost.crystals) parts.push(ceil(cost.crystals * d) + 'C');
  if (cost.gold) parts.push(ceil(cost.gold * d) + 'G');
  if (cost.ironOre) parts.push(ceil(cost.ironOre * d) + 'Fe');
  return parts.join(' ');
}

function placeBuilding(wx, wy) {
  let bp = BLUEPRINTS[state.buildType];
  if (!isBuildingUnlocked(state.buildType)) {
    addFloatingText(w2sX(wx), w2sY(wy) - 20, 'Reach island level ' + bp.minLevel + ' to build', C.buildInvalid);
    return;
  }
  if (!canAfford(state.buildType)) {
    addFloatingText(w2sX(wx), w2sY(wy) - 20, 'Need: ' + getCostString(state.buildType), C.buildInvalid);
    return;
  }
  let posValid;
  if (state.buildType === 'bridge') {
    let nearIsland = islandEdgeDist(wx, wy) < 0.3;
    let nearBridge = state.buildings.some(b => b.type === 'bridge' && dist2(b.x, b.y, wx, wy) < 48);
    posValid = nearIsland || nearBridge;
  } else {
    posValid = isOnIsland(wx, wy) || isOnBridge(wx, wy);
  }
  if (!posValid) {
    addFloatingText(w2sX(wx), w2sY(wy) - 20, 'Can\'t build here!', C.buildInvalid);
    return;
  }

  let bw = bp.w;
  let bh = bp.h;
  if ((state.buildRotation === 1 || state.buildRotation === 3) && ROTATABLE_TYPES.includes(state.buildType)) {
    let tmp = bw; bw = bh; bh = tmp;
  }

  payCost(state.buildType);
  let newBuilding = {
    x: wx, y: wy,
    type: state.buildType,
    w: bw, h: bh,
    rot: state.buildRotation,
    buildProgress: 0,
  };
  state.buildings.push(newBuilding);
  if (typeof updatePathGrid === 'function') updatePathGrid();

  // Feature: door placement removes overlapping walls
  if (state.buildType === 'door') {
    let doorHW = bw / 2 + 2;
    let doorHH = bh / 2 + 2;
    for (let i = state.buildings.length - 2; i >= 0; i--) {
      let wb = state.buildings[i];
      if (wb.type !== 'wall') continue;
      let wHW = wb.w / 2;
      let wHH = wb.h / 2;
      if (abs(wb.x - wx) < doorHW + wHW && abs(wb.y - wy) < doorHH + wHH) {
        state.buildings.splice(i, 1);
      }
    }
  }
  if (snd) snd.playSFX('build');
  if (state.score) state.score.buildingsBuilt++;
  state.codex.buildingsBuilt[state.buildType] = true;
  unlockJournal('first_building');
  addFloatingText(w2sX(wx), w2sY(wy) - 30, '+' + bp.name, C.crystalGlow);
  spawnBuildingComplete(wx, wy);
  // First building celebration burst
  if (typeof isFirstBuilding === 'function' && isFirstBuilding()) { for (let _ci = 0; _ci < 20; _ci++) { let _ca = random(TWO_PI); particles.push({ x: wx, y: wy, vx: cos(_ca) * random(1, 3), vy: sin(_ca) * random(1, 3) - 2, life: 50, maxLife: 50, type: 'sparkle', size: random(2, 5), r: 255, g: random(180, 255), b: random(40, 120), world: true }); } addFloatingText(w2sX(wx), w2sY(wy) - 50, 'Your settlement grows!', '#44ffaa'); }
  triggerScreenShake(2, 6);
  state.dailyActivities.built++;
  checkQuestProgress('build', 1);
  if (typeof advanceMainQuestCounter === 'function') advanceMainQuestCounter('mq_built', 1);
  if (typeof grantXP === 'function') grantXP(bp.minLevel ? bp.minLevel * 5 : 10); // bigger buildings = more XP
  trackMilestone('first_build');
  if (typeof trackStat === 'function') trackStat('buildingsBuilt', 1);
  if (typeof checkDailyQuestProgress === 'function') checkDailyQuestProgress('build', 1);
  if (typeof triggerNPCReaction === 'function') triggerNPCReaction('build', wx, wy);
}

// ─── SPAWNBUILDINGCOMPLETE ───────────────────────────────────────
// ─── JUICE: BUILDING COMPLETE — dust cloud + sparkles settling ──────────
function spawnBuildingComplete(wx, wy) {
  // Dust cloud burst
  for (let i = 0; i < 8; i++) {
    let angle = random(TWO_PI);
    let speed = random(0.8, 2.5);
    particles.push({
      x: wx + random(-6, 6), y: wy + random(-4, 4),
      vx: cos(angle) * speed, vy: sin(angle) * speed * 0.5 - 1,
      life: random(30, 55), maxLife: 55,
      type: 'dust', size: random(3, 7),
      r: 160, g: 145, b: 110, world: true,
    });
  }
  // Settling sparkles
  for (let i = 0; i < 10; i++) {
    particles.push({
      x: wx + random(-20, 20), y: wy - random(10, 40),
      vx: random(-0.3, 0.3), vy: random(0.3, 1),
      life: random(40, 70), maxLife: 70,
      type: 'sundust', size: random(1.5, 3),
      r: 220, g: 200, b: 120, world: true, phase: random(TWO_PI),
    });
  }
  // Completion ring
  particles.push({
    x: wx, y: wy, vx: 0, vy: 0,
    life: 25, maxLife: 25,
    type: 'pulse_ring', size: 8,
    r: 200, g: 180, b: 100, world: true,
  });
}

// ─── IMPERIAL BRIDGE ─────────────────────────────────────────────


// ─── IMPERIAL BRIDGE — Connects home island to colonized Terra Nova ───────

function canBuildBridge() {
  return state.islandLevel >= 20 && state.conquest.colonized && !state.imperialBridge.built && !state.imperialBridge.building;
}

function getBridgeCost() {
  return { stone: 200, wood: 100, ironOre: 40, ancientRelic: 15, titanBone: 5 };
}

function startBuildBridge() {
  if (!canBuildBridge()) return;
  let cost = getBridgeCost();
  if (state.stone < cost.stone || state.wood < cost.wood || state.ironOre < cost.ironOre ||
      state.ancientRelic < cost.ancientRelic || state.titanBone < cost.titanBone) {
    addFloatingText(width / 2, height * 0.4, 'Need: 200 stone, 100 wood, 40 iron, 15 relics, 5 bone', C.buildInvalid);
    return;
  }
  state.stone -= cost.stone;
  state.wood -= cost.wood;
  state.ironOre -= cost.ironOre;
  state.ancientRelic -= cost.ancientRelic;
  state.titanBone -= cost.titanBone;

  state.imperialBridge.building = true;
  state.imperialBridge.progress = 0;

  // Generate bridge segments between home island west edge and Terra Nova east edge
  let homeX = WORLD.islandCX - state.islandRX * 0.9;
  let terraX = state.conquest.isleX + state.conquest.isleRX * 0.9;
  let bridgeY = WORLD.islandCY;
  let totalDist = homeX - terraX;
  let numSegments = floor(abs(totalDist) / 40);
  state.imperialBridge.segments = [];
  for (let i = 0; i <= numSegments; i++) {
    let t = i / numSegments;
    let sx = terraX + t * totalDist;
    // Gentle arch — bridge arcs up slightly in the middle
    let archY = bridgeY - sin(t * PI) * 30;
    state.imperialBridge.segments.push({
      x: sx, y: archY, w: 42, h: 20,
      archIdx: i, total: numSegments,
    });
  }

  addFloatingText(width / 2, height * 0.15, 'IMPERIAL BRIDGE — Construction Begins!', '#ffaa00');
  addFloatingText(width / 2, height * 0.22, 'The workers toil day and night...', '#ccaa66');
  triggerScreenShake(8, 20);
  unlockJournal('imperial_bridge_started');
}

function updateBridgeConstruction(dt) {
  let b = state.imperialBridge;
  if (!b.building) return;
  // Progress 1% per game-hour (~5.5 frames per hour at 0.18/frame)
  b.progress += 0.15 * dt;
  if (b.progress >= 100) {
    b.progress = 100;
    b.building = false;
    b.built = true;
    if (snd) snd.playSFX('fanfare');
    addFloatingText(width / 2, height * 0.15, 'THE IMPERIAL BRIDGE IS COMPLETE!', '#ffdd00');
    addFloatingText(width / 2, height * 0.22, 'Walk freely between your islands!', '#aaddff');
    triggerScreenShake(15, 40);
    unlockJournal('imperial_bridge_complete');
    spawnIslandLevelUp();
  }
}

function isOnImperialBridge(wx, wy) {
  let b = state.imperialBridge;
  if (!b.built || b.segments.length === 0) return false;
  // Check if position is on any bridge segment
  let bridgeY = WORLD.islandCY;
  let firstSeg = b.segments[0];
  let lastSeg = b.segments[b.segments.length - 1];
  let minX = min(firstSeg.x, lastSeg.x) - 20;
  let maxX = max(firstSeg.x, lastSeg.x) + 20;
  if (wx < minX || wx > maxX) return false;
  // Find the bridge Y at this X position
  let t = (wx - firstSeg.x) / (lastSeg.x - firstSeg.x);
  t = constrain(t, 0, 1);
  let archY = bridgeY - sin(t * PI) * 30;
  return abs(wy - archY) < 18;
}

function drawImperialBridge() {
  let b = state.imperialBridge;
  if (!b.built && !b.building) return;
  let segsToShow = b.building ? floor(b.segments.length * b.progress / 100) : b.segments.length;
  if (segsToShow === 0) return;

  let bright = getSkyBrightness();

  for (let i = 0; i < segsToShow; i++) {
    let seg = b.segments[i];
    let sx = w2sX(seg.x), sy = w2sY(seg.y);
    let t = i / b.segments.length;

    // Water reflection
    noStroke();
    fill(60, 80, 100, 30);
    ellipse(sx, sy + 22, seg.w + 4, 10);

    // Stone archway support pillars (every 4 segments)
    if (i % 4 === 0) {
      // Pillar going down into water
      fill(lerpColor(color(90, 82, 72), color(140, 130, 115), bright));
      rect(sx - 5, sy, 10, 30 + sin(t * PI) * 20);
      // Pillar base in water
      fill(60, 80, 100, 50);
      ellipse(sx, sy + 30 + sin(t * PI) * 20, 16, 6);
    }

    // Bridge deck — stone surface
    let deckCol = lerpColor(color(120, 112, 98), color(175, 165, 145), bright);
    fill(deckCol);
    rect(sx - seg.w / 2, sy - 6, seg.w, 12, 1);

    // Top surface highlight
    fill(lerpColor(color(145, 135, 118), color(195, 185, 165), bright));
    rect(sx - seg.w / 2, sy - 6, seg.w, 4, 1);

    // Stone block lines
    stroke(100, 92, 82, 40);
    strokeWeight(0.5);
    if (i % 2 === 0) line(sx - seg.w / 2, sy - 2, sx + seg.w / 2, sy - 2);
    noStroke();

    // Balustrade (railings) — every other segment
    if (i % 2 === 0) {
      fill(lerpColor(color(130, 120, 105), color(180, 170, 150), bright));
      // Left railing post
      rect(sx - seg.w / 2 + 2, sy - 12, 3, 8);
      // Right railing post
      rect(sx + seg.w / 2 - 5, sy - 12, 3, 8);
    }

    // Roman torch every 8 segments
    if (i % 8 === 0 && i > 0) {
      // Torch base
      fill(100, 70, 40);
      rect(sx - 2, sy - 18, 4, 12);
      // Flame
      let flicker = sin(frameCount * 0.15 + i) * 2;
      fill(255, 180, 50, 200);
      ellipse(sx, sy - 20 + flicker, 6, 8);
      fill(255, 220, 100, 150);
      ellipse(sx, sy - 21 + flicker, 4, 5);
      // Glow
      fill(255, 150, 50, 20);
      ellipse(sx, sy - 18, 30, 25);
    }
  }

  // Construction progress bar
  if (b.building) {
    let barX = width / 2 - 80, barY = height * 0.08;
    fill(0, 0, 0, 150);
    rect(barX - 2, barY - 2, 164, 16, 3);
    fill(60, 50, 40);
    rect(barX, barY, 160, 12, 2);
    fill(200, 160, 60);
    rect(barX, barY, 160 * b.progress / 100, 12, 2);
    fill(255, 240, 200);
    textSize(11); textAlign(CENTER, CENTER);
    text('BRIDGE: ' + floor(b.progress) + '%', width / 2, barY + 5);
  }
}

// ─── CANPLACEBUILDING+PLACEBUILDINGCHECKED ───────────────────────
function canPlaceBuilding(x, y, w, h) {
  // Check against existing buildings (skip ground-level decorative tiles)
  let buildingOverlap = state.buildings.some(b => {
    if (b.type === 'floor' || b.type === 'mosaic') return false;
    return Math.abs(b.x - x) < (b.w + w) / 2 + 4 &&
           Math.abs(b.y - y) < (b.h + h) / 2 + 4;
  });
  if (buildingOverlap) return false;
  // Check against farm plots
  if (state.plots) {
    let plotOverlap = state.plots.some(p => {
      return Math.abs(p.x - x) < (p.w + w) / 2 + 6 &&
             Math.abs(p.y - y) < (p.h + h) / 2 + 6;
    });
    if (plotOverlap) return false;
  }
  return true;
}

function placeBuildingChecked(bld) {
  if (canPlaceBuilding(bld.x, bld.y, bld.w, bld.h)) {
    state.buildings.push(bld);
    return true;
  }
  // Try offset positions
  let offsets = [[20, 0], [-20, 0], [0, 20], [0, -20], [25, 15], [-25, -15]];
  for (let off of offsets) {
    let nx = bld.x + off[0], ny = bld.y + off[1];
    if (canPlaceBuilding(nx, ny, bld.w, bld.h)) {
      bld.x = nx; bld.y = ny;
      state.buildings.push(bld);
      return true;
    }
  }
  // Skip placement if no valid position found — prevents overlaps
  return false;
}


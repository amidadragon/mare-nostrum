// ======================================================================
// === WORLD ISLANDS — 27-island conquest system =======================
// ======================================================================
// Center of world: 600, 400  (matches NATION_DEFAULTS / WORLD constants)
// Capital angles/dist match NATION_DEFAULTS exactly so they overlay faction islands.
// Neutral island angles are spread across 0-2PI avoiding capital angles (±0.15 rad buffer).

const WORLD_ISLANDS = [
  // ── FACTION CAPITALS (8) ── angles/dist mirror NATION_DEFAULTS ──────
  {
    key: 'rome_capital', name: 'Capitoline Hill', type: 'capital',
    angle: 3.8, dist: 4500, isleRX: 400, isleRY: 280,
    defense: 2500, faction: 'rome', controlPoints: 3,
    benefit: { desc: 'Rome capital — controls Mediterranean heartland', goldMod: 1.2 }
  },
  {
    key: 'carthage_capital', name: 'Byrsa', type: 'capital',
    angle: -0.6, dist: 4500, isleRX: 400, isleRY: 280,
    defense: 2500, faction: 'carthage', controlPoints: 3,
    benefit: { desc: 'Carthage capital — dominates western trade', tradeMod: 1.3 }
  },
  {
    key: 'egypt_capital', name: 'Alexandria', type: 'capital',
    angle: 1.4, dist: 5000, isleRX: 420, isleRY: 290,
    defense: 2000, faction: 'egypt', controlPoints: 3,
    benefit: { desc: 'Egypt capital — granary of the ancient world', foodMod: 1.4 }
  },
  {
    key: 'greece_capital', name: 'Athens', type: 'capital',
    angle: 0.2, dist: 4200, isleRX: 390, isleRY: 270,
    defense: 2000, faction: 'greece', controlPoints: 3,
    benefit: { desc: 'Greece capital — birthplace of democracy and war', militaryMod: 1.2 }
  },
  {
    key: 'persia_capital', name: 'Persepolis', type: 'capital',
    angle: 0.9, dist: 5800, isleRX: 430, isleRY: 300,
    defense: 2000, faction: 'persia', controlPoints: 3,
    benefit: { desc: 'Persia capital — richest empire in the world', goldMod: 1.5 }
  },
  {
    key: 'gaul_capital', name: 'Alesia', type: 'capital',
    angle: 3.0, dist: 5200, isleRX: 410, isleRY: 290,
    defense: 1500, faction: 'gaul', controlPoints: 2,
    benefit: { desc: 'Gaul capital — wild north, iron and wolves', militaryMod: 1.15 }
  },
  {
    key: 'phoenicia_capital', name: 'Tyre', type: 'capital',
    angle: -1.3, dist: 4800, isleRX: 380, isleRY: 260,
    defense: 1500, faction: 'phoenicia', controlPoints: 2,
    benefit: { desc: 'Phoenicia capital — masters of the sea lanes', tradeMod: 1.4 }
  },
  {
    key: 'seapeople_capital', name: 'The Leviathan', type: 'capital',
    angle: 2.5, dist: 5500, isleRX: 350, isleRY: 250,
    defense: 2000, faction: 'seapeople', controlPoints: 3,
    benefit: { desc: 'Sea People capital — raiders of the bronze age', militaryMod: 1.3 }
  },

  // ── RESOURCE ISLANDS (4) ─────────────────────────────────────────────
  // Angles: 0.45, 0.65, 1.10, 4.00  (all >0.15 away from any capital)
  {
    key: 'ironwood_forest', name: 'Ironwood Forest', type: 'resource',
    angle: 0.45, dist: 3500, isleRX: 370, isleRY: 260,
    defense: 650, faction: null, controlPoints: 1,
    benefit: { desc: '+50% wood production, ships built 25% faster', woodMod: 1.5, shipSpeedMod: 0.75 }
  },
  {
    key: 'stoneheart', name: 'Stoneheart Quarry', type: 'resource',
    angle: 0.65, dist: 3800, isleRX: 350, isleRY: 250,
    defense: 700, faction: null, controlPoints: 1,
    benefit: { desc: '+50% stone production, buildings cost 20% less', stoneMod: 1.5, buildCostMod: 0.8 }
  },
  {
    key: 'grain_sea', name: 'Grain Sea', type: 'resource',
    angle: 1.10, dist: 3200, isleRX: 380, isleRY: 270,
    defense: 600, faction: null, controlPoints: 1,
    benefit: { desc: '+50% food output, army upkeep -15%', foodMod: 1.5, upkeepMod: 0.85 }
  },
  {
    key: 'golden_hills', name: 'Golden Hills', type: 'resource',
    angle: 4.00, dist: 4000, isleRX: 360, isleRY: 255,
    defense: 750, faction: null, controlPoints: 1,
    benefit: { desc: '+50% gold income from all sources', goldMod: 1.5 }
  },

  // ── MILITARY ISLANDS (5) ─────────────────────────────────────────────
  // Angles: 1.65, 1.85, 2.05, 2.25, 3.20
  {
    key: 'iron_keep', name: 'Iron Keep', type: 'military',
    angle: 1.65, dist: 4500, isleRX: 340, isleRY: 240,
    defense: 900, faction: null, controlPoints: 2,
    benefit: { desc: '+20% army production speed, +10% garrison defense', armyProdMod: 1.2, defMod: 1.1 }
  },
  {
    key: 'warhorse', name: 'Warhorse Downs', type: 'military',
    angle: 1.85, dist: 5000, isleRX: 330, isleRY: 235,
    defense: 850, faction: null, controlPoints: 2,
    benefit: { desc: 'Unlocks cavalry units, +15% cavalry combat strength', unlockCavalry: true, cavCombatMod: 1.15 }
  },
  {
    key: 'castrum_maris', name: 'Castrum Maris', type: 'military',
    angle: 2.05, dist: 4800, isleRX: 345, isleRY: 245,
    defense: 950, faction: null, controlPoints: 2,
    benefit: { desc: 'Unlocks legionary units, +5 army capacity', unlockLegionaries: true, armyCapBonus: 5 }
  },
  {
    key: 'siege_works', name: 'Siege Works', type: 'military',
    angle: 2.25, dist: 5200, isleRX: 320, isleRY: 230,
    defense: 800, faction: null, controlPoints: 2,
    benefit: { desc: 'Unlocks siege weapons, +20% siege damage', unlockSiege: true, siegeDmgMod: 1.2 }
  },
  {
    key: 'heros_grave', name: "Hero's Grave", type: 'military',
    angle: 3.20, dist: 4000, isleRX: 300, isleRY: 215,
    defense: 700, faction: null, controlPoints: 1,
    benefit: { desc: 'Recruit one free elite hero upon capture', freeHero: true }
  },

  // ── ECONOMIC / TRADE HUB ISLANDS (6) ─────────────────────────────────
  // Angles: 3.43, 4.20, 4.45, 4.70, 5.18, 5.40
  {
    key: 'golden_bazaar', name: 'Golden Bazaar', type: 'economic',
    angle: 3.43, dist: 4200, isleRX: 360, isleRY: 255,
    defense: 600, faction: null, controlPoints: 2,
    benefit: { desc: '+25% trade income, access to luxury goods market', tradeMod: 1.25, luxuryAccess: true }
  },
  {
    key: 'emporium', name: 'Emporium', type: 'economic',
    angle: 4.20, dist: 3800, isleRX: 340, isleRY: 240,
    defense: 550, faction: null, controlPoints: 1,
    benefit: { desc: 'Open trade routes with any faction regardless of relations', tradeAny: true }
  },
  {
    key: 'silk_road', name: 'Silk Road Outpost', type: 'economic',
    angle: 4.45, dist: 5500, isleRX: 310, isleRY: 220,
    defense: 650, faction: null, controlPoints: 2,
    benefit: { desc: 'Rare goods sell for double their base value', rareGoodsMod: 2.0 }
  },
  {
    key: 'amber_coast', name: 'Amber Coast', type: 'economic',
    angle: 4.70, dist: 4600, isleRX: 350, isleRY: 248,
    defense: 600, faction: null, controlPoints: 2,
    benefit: { desc: 'All active trade routes yield +50% income', allTradeRouteMod: 1.5 }
  },
  {
    key: 'spice_islands', name: 'Spice Islands', type: 'economic',
    angle: 5.18, dist: 6000, isleRX: 290, isleRY: 205,
    defense: 700, faction: null, controlPoints: 2,
    benefit: { desc: 'Luxury goods income +100%', luxuryMod: 2.0 }
  },
  {
    key: 'ivory_port', name: 'Ivory Port', type: 'economic',
    angle: 5.40, dist: 5000, isleRX: 330, isleRY: 235,
    defense: 650, faction: null, controlPoints: 1,
    benefit: { desc: 'Sell surplus military units for gold', sellUnits: true }
  },

  // ── DIPLOMATIC ISLANDS (4) ────────────────────────────────────────────
  // Angles: 5.88, 6.10, 6.25, 2.72
  {
    key: 'senate_house', name: 'Senate House', type: 'diplomatic',
    angle: 2.72, dist: 3000, isleRX: 320, isleRY: 228,
    defense: 500, faction: null, controlPoints: 3,
    benefit: { desc: 'Required for diplomatic victory; +1 alliance slot', diplomVictory: true, allianceBonus: 1 }
  },
  {
    key: 'oracle', name: "Oracle's Isle", type: 'diplomatic',
    angle: 5.88, dist: 4400, isleRX: 300, isleRY: 215,
    defense: 500, faction: null, controlPoints: 1,
    benefit: { desc: 'Reveals enemy faction army strengths on world map', revealEnemies: true }
  },
  {
    key: 'neutral_port', name: 'Neutral Port', type: 'diplomatic',
    angle: 6.10, dist: 3600, isleRX: 315, isleRY: 225,
    defense: 520, faction: null, controlPoints: 1,
    benefit: { desc: 'Host peace conferences; +1 alliance slot', peaceTreaties: true, allianceBonus: 1 }
  },
  {
    key: 'temple_concord', name: 'Temple of Concord', type: 'diplomatic',
    angle: 6.25, dist: 4000, isleRX: 310, isleRY: 220,
    defense: 510, faction: null, controlPoints: 2,
    benefit: { desc: 'All alliance benefits are 50% stronger', allianceMod: 1.5 }
  },
];

// ── WORLD ISLAND LOOKUP HELPERS ──────────────────────────────────────────

function getWorldIsland(key) {
  return WORLD_ISLANDS.find(i => i.key === key);
}

function getIslandWorldPos(island) {
  let cx = 600, cy = 400;
  return {
    x: cx + Math.cos(island.angle) * island.dist,
    y: cy + Math.sin(island.angle) * island.dist
  };
}

function isOnWorldIsland(wx, wy) {
  if (typeof WORLD_ISLANDS === 'undefined') return null;
  for (let isle of WORLD_ISLANDS) {
    if (isle.faction) continue;
    let pos = getIslandWorldPos(isle);
    let dx = (wx - pos.x) / (isle.isleRX || 300);
    let dy = (wy - pos.y) / (isle.isleRY || 200);
    if (dx*dx + dy*dy < 1.0) return isle;
  }
  return null;
}

function getAllWorldIslands() {
  return WORLD_ISLANDS.map(isle => {
    let pos = getIslandWorldPos(isle);
    return { ...isle, isleX: pos.x, isleY: pos.y };
  });
}

function captureIsland(key) {
  if (!state._controlledIslands) state._controlledIslands = [];
  if (!state._controlledIslands.includes(key)) {
    state._controlledIslands.push(key);
  }
  let isle = getWorldIsland(key);
  if (isle && typeof addNotification === 'function') {
    addNotification('Captured ' + isle.name + '!', '#ffd700');
    if (isle.benefit && isle.benefit.desc) {
      addNotification('Bonus: ' + isle.benefit.desc, '#88ff88');
    }
  }
}

function isIslandControlled(key) {
  return state._controlledIslands && state._controlledIslands.includes(key);
}

function getIslandBenefit(key) {
  let isle = getWorldIsland(key);
  return isle ? isle.benefit : null;
}

function getIslandBonuses() {
  let bonuses = { wood: 1, stone: 1, gold: 1, food: 1, trade: 1, army: 1, defense: 1, speed: 1 };
  if (!state._controlledIslands) return bonuses;
  for (let key of state._controlledIslands) {
    let isle = typeof getWorldIsland === 'function' ? getWorldIsland(key) : null;
    if (!isle || !isle.benefit) continue;
    let b = isle.benefit;
    if (b.type === 'resource') {
      if (b.resource === 'wood') bonuses.wood += b.mult || 0.5;
      if (b.resource === 'stone') bonuses.stone += b.mult || 0.5;
      if (b.resource === 'gold') bonuses.gold += b.mult || 0.5;
      if (b.resource === 'food') bonuses.food += b.mult || 0.5;
    }
    if (b.type === 'trade') bonuses.trade += b.mult || 0.25;
    if (b.type === 'military') {
      if (b.stat === 'army_production') bonuses.army += b.mult || 0.2;
      if (b.stat === 'defense') bonuses.defense += b.mult || 0.1;
    }
  }
  return bonuses;
}

// ─── SEAMLESS EXPLORATION ISLAND HELPER ────────────────────────────────
function _isExplorationActive(key) { return state._activeExploration === key; }

// Content init functions (called on first seamless entry — generate entities at world coords)
function enterVulcanContent() {
  let v = state.vulcan; v.phase = 'explored';
  for (let i = 0; i < 5; i++) { let a = (i / 5) * TWO_PI + random(-0.3, 0.3), r = random(0.3, 0.6) * v.isleRX; v.lavaPools.push({ x: v.isleX + cos(a) * r, y: v.isleY + sin(a) * r * 0.7, r: random(18, 35), phase: random(TWO_PI) }); }
  for (let i = 0; i < 3; i++) { let a = random(TWO_PI), r = random(0.15, 0.4) * v.isleRX; v.hotSprings.push({ x: v.isleX + cos(a) * r, y: v.isleY + sin(a) * r * 0.7, healTimer: 0 }); }
  for (let i = 0; i < 8; i++) { let a = random(TWO_PI), r = random(0.2, 0.7) * v.isleRX; v.obsidianNodes.push({ x: v.isleX + cos(a) * r, y: v.isleY + sin(a) * r * 0.7, collected: false }); }
  for (let i = 0; i < 6; i++) { let a = random(TWO_PI), r = random(0.1, 0.5) * v.isleRX; v.smokeVents.push({ x: v.isleX + cos(a) * r, y: v.isleY + sin(a) * r * 0.7, phase: random(TWO_PI) }); }
}
function enterHyperboreContent() {
  let h = state.hyperborea; h.phase = 'explored';
  h.frozenObelisk = { x: h.isleX, y: h.isleY };
  for (let i = 0; i < 4; i++) { let a = (i / 4) * TWO_PI + random(-0.4, 0.4), r = random(0.25, 0.55) * h.isleRX; h.frozenRuins.push({ x: h.isleX + cos(a) * r, y: h.isleY + sin(a) * r * 0.7, looted: false }); }
  for (let i = 0; i < 7; i++) { let a = random(TWO_PI), r = random(0.2, 0.65) * h.isleRX; h.frostNodes.push({ x: h.isleX + cos(a) * r, y: h.isleY + sin(a) * r * 0.7, collected: false }); }
  for (let i = 0; i < 6; i++) { let a = random(TWO_PI), r = random(0.1, 0.5) * h.isleRX; h.penguins.push({ x: h.isleX + cos(a) * r, y: h.isleY + sin(a) * r * 0.7, vx: 0, vy: 0, state: 'idle', timer: random(60, 180) }); }
}
function enterPlentyContent() {
  let pl = state.plenty; pl.phase = 'explored';
  let treeTypes = ['mango', 'banana', 'coconut', 'fig'];
  for (let i = 0; i < 12; i++) { let a = random(TWO_PI), r = random(0.15, 0.65) * pl.isleRX; pl.fruitTrees.push({ x: pl.isleX + cos(a) * r, y: pl.isleY + sin(a) * r * 0.7, type: treeTypes[i % 4], fruit: true, timer: 0 }); }
  let cols = ['#ff4444', '#44cc44', '#4488ff', '#ffaa00', '#ff44cc'];
  for (let i = 0; i < 5; i++) pl.parrots.push({ x: pl.isleX + random(-pl.isleRX * 0.5, pl.isleRX * 0.5), y: pl.isleY + random(-pl.isleRY * 0.4, pl.isleRY * 0.4), vx: random(-0.5, 0.5), vy: random(-0.3, 0.3), color: cols[i], state: 'flying' });
  pl.waterfalls.push({ x: pl.isleX - pl.isleRX * 0.45, y: pl.isleY - pl.isleRY * 0.2, h: 35 }, { x: pl.isleX + pl.isleRX * 0.35, y: pl.isleY - pl.isleRY * 0.35, h: 28 });
  for (let i = 0; i < 6; i++) { let a = random(TWO_PI), r = random(0.2, 0.6) * pl.isleRX; pl.spiceNodes.push({ x: pl.isleX + cos(a) * r, y: pl.isleY + sin(a) * r * 0.7, collected: false }); }
}
function enterNecropolisContent() {
  let n = state.necropolis; n.phase = 'explored';
  for (let i = 0; i < 6; i++) { let a = (i / 6) * TWO_PI + random(-0.3, 0.3), r = random(0.2, 0.6) * n.isleRX; n.tombs.push({ x: n.isleX + cos(a) * r, y: n.isleY + sin(a) * r * 0.7, looted: false, trapped: random() < 0.3 }); }
  for (let i = 0; i < 4; i++) { let a = random(TWO_PI), r = random(0.15, 0.5) * n.isleRX; n.skeletons.push({ x: n.isleX + cos(a) * r, y: n.isleY + sin(a) * r * 0.7, vx: 0, vy: 0, hp: 40, maxHp: 40, attackTimer: 0, facing: 1, flashTimer: 0, state: 'patrol', patrolAngle: random(TWO_PI) }); }
  let gn = ['Aurelius', 'Cornelia', 'Septimus'], gl = ['The forge of Vulcan... obsidian tempered in soul fire creates weapons beyond mortal craft.', 'Frost crystals from the north... they bind enchantments to steel. Seek Hyperborea.', 'I once sailed to the Isle of Plenty... its spices could preserve food for centuries.'];
  for (let i = 0; i < 3; i++) { let a = (i / 3) * TWO_PI + PI * 0.3, r = random(0.3, 0.55) * n.isleRX; n.ghostNPCs.push({ x: n.isleX + cos(a) * r, y: n.isleY + sin(a) * r * 0.7, name: gn[i], line: gl[i], talked: false }); }
  for (let i = 0; i < 5; i++) { let a = random(TWO_PI), r = random(0.2, 0.6) * n.isleRX; n.soulNodes.push({ x: n.isleX + cos(a) * r, y: n.isleY + sin(a) * r * 0.7, collected: false }); }
}

// ─── DISTANCE HELPER ──────────────────────────────────────────────────
function _getIslandDist(ix, iy) {
  let px, py;
  if (state.rowing && state.rowing.active) { px = state.rowing.x; py = state.rowing.y; }
  else { px = WORLD.islandCX; py = WORLD.islandCY; }
  let d = sqrt((ix - px) * (ix - px) + (iy - py) * (iy - py));
  if (d < 500) return 'Nearby';
  if (d < 1200) return '~1 day sail';
  if (d < 2500) return '~2 days sail';
  return '~' + ceil(d / 1200) + ' days sail';
}

// ─── DISTANT ISLAND SCALING ──────────────────────────────────────────
// Returns { scale, haze, dist } for distance-based rendering when sailing
// scale: 0.08 (far) to 1.0 (nearby), haze: 0-200 alpha for atmospheric fog
function _getDistantScale(isleX, isleY, isleRX) {
  let px, py;
  if (state.rowing && state.rowing.active) { px = state.rowing.x; py = state.rowing.y; }
  else { px = WORLD.islandCX; py = WORLD.islandCY; }
  let d = sqrt((isleX - px) * (isleX - px) + (isleY - py) * (isleY - py));

  // Distance-based scale
  let nearDist = isleRX * 2.5;
  let zoomMult = (typeof camZoom !== 'undefined' && camZoom < 1) ? 1 / camZoom : 1;
  let farDist = 3500 * zoomMult;
  let t = constrain((d - nearDist) / (farDist - nearDist), 0, 1);
  let distScale = lerp(1.0, 0.08, t * t);

  // Screen-space perspective: islands higher on screen appear smaller (depth illusion)
  let sy = (typeof w2sY === 'function') ? w2sY(isleY) : height / 2;
  let horizY = max(height * 0.06, height * 0.25 - (typeof horizonOffset !== 'undefined' ? horizonOffset : 0));
  let screenBot = height * 0.85;
  let normDepth = constrain((sy - horizY) / (screenBot - horizY), 0.05, 1.0);
  let perspScale = 0.15 + normDepth * 0.85;

  // Use the smaller of distance and perspective scales
  let s = min(distScale, perspScale);
  let haze = lerp(0, 180, t);
  return { scale: s, haze: haze, dist: d };
}

// Max view distance — expanded when zoomed out during sailing
function _getMaxViewDist() {
  let base = 4000;
  // Sea People see further when sailing (navigator's instinct)
  if (typeof state !== 'undefined' && state.faction === 'seapeople' && state.rowing && state.rowing.active) base = 5500;
  if (typeof camZoom !== 'undefined' && camZoom < 1) return base / camZoom;
  return base;
}

// ─── LOD SYSTEM — Level of Detail for sailing world rendering ────────
function getIslandLOD(dist) {
  if (dist < 200) return 'full';
  if (dist < 800) return 'close';
  // When throttled, skip medium LOD — go straight to far
  if (typeof _frameBudget !== 'undefined' && _frameBudget.throttled) {
    return dist < 800 ? 'close' : 'far';
  }
  if (dist < 2000) return 'medium';
  return 'far';
}

// Cache for nation building silhouettes (avoid recalc every frame)
let _nationLODCache = {};
let _lodActivityFrame = 0;

// Draw a nation island at medium LOD — silhouette + building outlines + activity
function drawNationMediumLOD(sx, sy, rx, ry, key, nation, dScale) {
  return;
}

// Draw a nation island at close LOD — detailed terrain, buildings, soldiers, NPCs
function drawNationCloseLOD(sx, sy, rx, ry, key, nation, dScale) {
  return;
}

// Helper: get terrain color for a nation key (reused across LODs)
function _getNationTerrainColor(key) {
  let colors = {
    carthage: [185, 155, 95], egypt: [200, 175, 110], greece: [155, 170, 130],
    seapeople: [100, 105, 115], persia: [195, 165, 95], phoenicia: [170, 130, 110],
    gaul: [95, 135, 80], rome: [140, 130, 95]
  };
  return colors[key] || colors.rome;
}

// ======================================================================
// === ISLE OF VULCAN — Volcanic Island (Northwest) ====================
// ======================================================================
function isOnVulcanIsland(wx, wy) { let v = state.vulcan; let ex = (wx - v.isleX) / (v.isleRX - 20); let ey = (wy - v.isleY) / (v.isleRY - 20); return ex * ex + ey * ey < 1; }
function enterVulcan() { console.warn('enterVulcan deprecated -- openworld mode'); }
function exitVulcan() { console.warn('exitVulcan deprecated -- openworld mode'); }
function updateVulcanIsland(dt) {
  let v = state.vulcan, p = state.player;
  if (v.active) { let dx = 0, dy = 0;
  if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) dx -= 1; if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) dx += 1;
  if (keyIsDown(87) || keyIsDown(UP_ARROW)) dy -= 1; if (keyIsDown(83) || keyIsDown(DOWN_ARROW)) dy += 1;
  if (dx || dy) { let m = sqrt(dx * dx + dy * dy); p.vx = (dx / m) * p.speed * dt; p.vy = (dy / m) * p.speed * dt; p.moving = true; if (abs(dx) > abs(dy)) p.facing = dx > 0 ? 'right' : 'left'; else p.facing = dy > 0 ? 'down' : 'up'; } else { p.vx = 0; p.vy = 0; p.moving = false; }
  p.x += p.vx; p.y += p.vy; if (!isOnVulcanIsland(p.x, p.y)) { p.x -= p.vx; p.y -= p.vy; } }
  for (let hs of v.hotSprings) { if (dist(p.x, p.y, hs.x, hs.y) < 30) { hs.healTimer += dt; if (hs.healTimer > 60) { hs.healTimer = 0; if (p.hp < p.maxHp) { p.hp = min(p.hp + 5, p.maxHp); addFloatingText(w2sX(p.x), w2sY(p.y) - 20, '+5 HP', '#44ff88'); } } } }
  for (let lp of v.lavaPools) { if (dist(p.x, p.y, lp.x, lp.y) < lp.r + 5 && p.invincTimer <= 0) { p.hp = Math.max(0, p.hp - 3); p.invincTimer = 30; shakeTimer = 5; addFloatingText(w2sX(p.x), w2sY(p.y) - 15, '-3', '#ff4422'); } }
  // invincTimer decremented in main loop
  if (frameCount % 3 === 0) v.ambientAsh.push({ x: v.isleX + random(-v.isleRX, v.isleRX), y: v.isleY - v.isleRY, vy: random(0.3, 0.8), vx: random(-0.2, 0.2), life: 180, size: random(1, 3) });
  v.ambientAsh.forEach(a => { a.x += a.vx; a.y += a.vy; a.life -= dt; }); v.ambientAsh = v.ambientAsh.filter(a => a.life > 0);
  // openworld: no teleport exit, player walks off naturally
}
function drawVulcanIsland() {
  return;
}
function drawVulcanEntities() {
  return;
}
function drawVulcanDistantLabel() {
  return;
}
function drawVulcanHUD() {
  return;
}

// ======================================================================
// === HYPERBOREA — Frozen Island (Far North) ==========================
// ======================================================================
function isOnHyperboreIsland(wx, wy) { let h = state.hyperborea; let ex = (wx - h.isleX) / (h.isleRX - 20); let ey = (wy - h.isleY) / (h.isleRY - 20); return ex * ex + ey * ey < 1; }
function enterHyperborea() { console.warn('enterHyperborea deprecated -- openworld mode'); }
function exitHyperborea() { console.warn('exitHyperborea deprecated -- openworld mode'); }
function updateHyperboreIsland(dt) {
  let h = state.hyperborea, p = state.player;
  if (h.active) { let dx = 0, dy = 0;
  if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) dx -= 1; if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) dx += 1;
  if (keyIsDown(87) || keyIsDown(UP_ARROW)) dy -= 1; if (keyIsDown(83) || keyIsDown(DOWN_ARROW)) dy += 1;
  if (dx || dy) { let m = sqrt(dx * dx + dy * dy); p.vx = (dx / m) * p.speed * 0.85 * dt; p.vy = (dy / m) * p.speed * 0.85 * dt; p.moving = true; if (abs(dx) > abs(dy)) p.facing = dx > 0 ? 'right' : 'left'; else p.facing = dy > 0 ? 'down' : 'up'; } else { p.vx = 0; p.vy = 0; p.moving = false; }
  p.x += p.vx; p.y += p.vy; if (!isOnHyperboreIsland(p.x, p.y)) { p.x -= p.vx; p.y -= p.vy; } }
  for (let pg of h.penguins) { pg.timer -= dt; if (pg.timer <= 0) { if (pg.state === 'idle') { pg.state = 'waddle'; let a = random(TWO_PI); pg.vx = cos(a) * 0.4; pg.vy = sin(a) * 0.4; pg.timer = random(60, 120); } else { pg.state = 'idle'; pg.vx = 0; pg.vy = 0; pg.timer = random(90, 200); } } pg.x += pg.vx * dt; pg.y += pg.vy * dt; if (!isOnHyperboreIsland(pg.x, pg.y)) { pg.vx *= -1; pg.vy *= -1; pg.x += pg.vx * 2; pg.y += pg.vy * 2; } }
  if (frameCount % 2 === 0) h.snowflakes.push({ x: h.isleX + random(-h.isleRX * 1.2, h.isleRX * 1.2), y: h.isleY - h.isleRY * 1.1, vy: random(0.4, 1.0), vx: random(-0.3, 0.1), life: 240, size: random(1, 3) });
  h.snowflakes.forEach(s => { s.x += s.vx; s.y += s.vy; s.life -= dt; }); h.snowflakes = h.snowflakes.filter(s => s.life > 0);
  let hr = state.time / 60; if (hr > 19 || hr < 5) { h.auroraBorealis = min(1, h.auroraBorealis + 0.005 * dt); } else { h.auroraBorealis = max(0, h.auroraBorealis - 0.01 * dt); }
  // openworld: no teleport exit, player walks off naturally
}
function drawHyperboreIsland() {
  return;
}
function drawHyperboreEntities() {
  return;
}
function drawHyperboreDistantLabel() {
  return;
}
function drawHyperboreHUD() {
  return;
}

// ======================================================================
// === ISLE OF PLENTY — Tropical Paradise (Southeast) ==================
// ======================================================================
function isOnPlentyIsland(wx, wy) { let pl = state.plenty; let ex = (wx - pl.isleX) / (pl.isleRX - 20); let ey = (wy - pl.isleY) / (pl.isleRY - 20); return ex * ex + ey * ey < 1; }
function enterPlenty() { console.warn('enterPlenty deprecated -- openworld mode'); }
function exitPlenty() { console.warn('exitPlenty deprecated -- openworld mode'); }
function updatePlentyIsland(dt) {
  let pl = state.plenty, p = state.player;
  if (pl.active) { let dx = 0, dy = 0;
  if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) dx -= 1; if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) dx += 1;
  if (keyIsDown(87) || keyIsDown(UP_ARROW)) dy -= 1; if (keyIsDown(83) || keyIsDown(DOWN_ARROW)) dy += 1;
  if (dx || dy) { let m = sqrt(dx * dx + dy * dy); p.vx = (dx / m) * p.speed * dt; p.vy = (dy / m) * p.speed * dt; p.moving = true; if (abs(dx) > abs(dy)) p.facing = dx > 0 ? 'right' : 'left'; else p.facing = dy > 0 ? 'down' : 'up'; } else { p.vx = 0; p.vy = 0; p.moving = false; }
  p.x += p.vx; p.y += p.vy; if (!isOnPlentyIsland(p.x, p.y)) { p.x -= p.vx; p.y -= p.vy; } }
  for (let pr of pl.parrots) { pr.x += pr.vx * dt; pr.y += pr.vy * dt; if (frameCount % 60 === 0) { pr.vx = random(-0.6, 0.6); pr.vy = random(-0.4, 0.4); } if (!isOnPlentyIsland(pr.x, pr.y)) { pr.vx *= -1; pr.vy *= -1; pr.x += pr.vx * 3; pr.y += pr.vy * 3; } }
  if (frameCount % 5 === 0) pl.fallingLeaves.push({ x: pl.isleX + random(-pl.isleRX * 0.8, pl.isleRX * 0.8), y: pl.isleY - pl.isleRY * 0.6, vy: random(0.2, 0.5), vx: random(-0.3, 0.3), life: 200, rot: random(TWO_PI), size: random(2, 4) });
  pl.fallingLeaves.forEach(l => { l.x += l.vx + sin(frameCount * 0.03 + l.rot) * 0.15; l.y += l.vy; l.life -= dt; l.rot += 0.02; }); pl.fallingLeaves = pl.fallingLeaves.filter(l => l.life > 0);
  for (let t of pl.fruitTrees) { if (!t.fruit && t.timer > 0) { t.timer -= dt; if (t.timer <= 0) t.fruit = true; } }
  // openworld: no teleport exit, player walks off naturally
}
function drawPlentyIsland() {
  return;
}
function drawPlentyEntities() {
  return;
}
function drawPlentyDistantLabel() {
  return;
}
function drawPlentyHUD() {
  return;
}

// ======================================================================
// === NECROPOLIS — Ancient Burial Island (Far Southwest) ==============
// ======================================================================
function isOnNecropolisIsland(wx, wy) { let n = state.necropolis; let ex = (wx - n.isleX) / (n.isleRX - 20); let ey = (wy - n.isleY) / (n.isleRY - 20); return ex * ex + ey * ey < 1; }
function enterNecropolis() { console.warn('enterNecropolis deprecated -- openworld mode'); }
function exitNecropolis() { console.warn('exitNecropolis deprecated -- openworld mode'); }
function updateNecropolisIsland(dt) {
  let n = state.necropolis, p = state.player;
  if (n.active) { let dx = 0, dy = 0;
  if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) dx -= 1; if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) dx += 1;
  if (keyIsDown(87) || keyIsDown(UP_ARROW)) dy -= 1; if (keyIsDown(83) || keyIsDown(DOWN_ARROW)) dy += 1;
  if (dx || dy) { let m = sqrt(dx * dx + dy * dy); p.vx = (dx / m) * p.speed * dt; p.vy = (dy / m) * p.speed * dt; p.moving = true; if (abs(dx) > abs(dy)) p.facing = dx > 0 ? 'right' : 'left'; else p.facing = dy > 0 ? 'down' : 'up'; } else { p.vx = 0; p.vy = 0; p.moving = false; }
  p.x += p.vx; p.y += p.vy; if (!isOnNecropolisIsland(p.x, p.y)) { p.x -= p.vx; p.y -= p.vy; } }
  // timers decremented in main loop
  for (let sk of n.skeletons) { if (sk.hp <= 0) continue; if (sk.flashTimer > 0) sk.flashTimer -= dt; let dToP = dist(sk.x, sk.y, p.x, p.y);
    if (dToP < 150) { let ang = atan2(p.y - sk.y, p.x - sk.x); sk.vx = cos(ang) * 1.2; sk.vy = sin(ang) * 1.2; sk.facing = sk.vx > 0 ? 1 : -1; if (dToP < 25 && sk.attackTimer <= 0) { sk.attackTimer = 60; if (p.invincTimer <= 0) { let dmg = 8 - ((typeof getPlayerDefenseReduction === 'function') ? getPlayerDefenseReduction() : (p.armor > 0 ? p.armor * 3 : 0)); p.hp = Math.max(0, p.hp - max(1, dmg)); p.invincTimer = 30; shakeTimer = 4; addFloatingText(w2sX(p.x), w2sY(p.y) - 15, '-' + max(1, dmg), '#ff4444'); } } }
    else { sk.patrolAngle += random(-0.05, 0.05); sk.vx = cos(sk.patrolAngle) * 0.3; sk.vy = sin(sk.patrolAngle) * 0.3; sk.facing = sk.vx > 0 ? 1 : -1; }
    sk.x += sk.vx * dt; sk.y += sk.vy * dt; if (!isOnNecropolisIsland(sk.x, sk.y)) { sk.patrolAngle += PI; sk.x -= sk.vx * dt * 2; sk.y -= sk.vy * dt * 2; }
    sk.attackTimer = max(0, sk.attackTimer - dt);
    if (p.slashPhase > 0 && dToP < p.attackRange && sk.flashTimer <= 0) { sk.hp -= p.attackDamage; sk.flashTimer = 10; addFloatingText(w2sX(sk.x), w2sY(sk.y) - 10, '-' + p.attackDamage, '#ffcc44'); if (sk.hp <= 0) { state.soulEssence += 1; addFloatingText(w2sX(sk.x), w2sY(sk.y) - 20, '+1 Soul Essence', '#cc88ff'); if (typeof snd !== 'undefined' && snd) snd.playSFX('skeleton_death'); } } }
  n.skeletons = n.skeletons.filter(s => s.hp > 0 || s.flashTimer > 0);
  if (frameCount % 4 === 0) n.wisps.push({ x: n.isleX + random(-n.isleRX * 0.7, n.isleRX * 0.7), y: n.isleY + random(-n.isleRY * 0.5, n.isleRY * 0.5), vx: random(-0.15, 0.15), vy: random(-0.4, -0.1), life: 150, size: random(2, 5) });
  n.wisps.forEach(w => { w.x += w.vx + sin(frameCount * 0.02 + w.x * 0.01) * 0.1; w.y += w.vy; w.life -= dt; }); n.wisps = n.wisps.filter(w => w.life > 0);
  n.darkAura = 0.3 + sin(frameCount * 0.01) * 0.1;
  // openworld: no teleport exit, player walks off naturally
}
function drawNecropolisIsland() {
  return;
}
function drawNecropolisEntities() {
  return;
}
function drawNecropolisDistantLabel() {
  return;
}
function drawNecropolisHUD() {
  return;
}

// ======================================================================
// === ISLAND [E] INTERACTION HANDLERS =================================
// ======================================================================

function handleVulcanInteract() {
  let v = state.vulcan, p = state.player;
  // Forge altar at crater center — within 60px
  if (dist(p.x, p.y, v.isleX, v.isleY) < 60) {
    if (state.narrativeFlags && state.narrativeFlags['forge_vulcan_blade']) {
      addFloatingText(w2sX(v.isleX), w2sY(v.isleY) - 30, 'The Blade of Vulcan is already forged.', '#ff8844');
      return;
    }
    if ((state.ironOre || 0) >= 10 && (state.titanBone || 0) >= 5) {
      state.ironOre -= 10;
      state.titanBone -= 5;
      state.narrativeFlags['forge_vulcan_blade'] = true;
      state.player.weapon = 2;
      spawnParticles(v.isleX, v.isleY, 'divine', 20);
      spawnParticles(v.isleX, v.isleY, 'crystal', 12);
      addFloatingText(width / 2, height * 0.2, 'BLADE OF VULCAN FORGED', '#ff5500');
      addFloatingText(width / 2, height * 0.28, 'Weapon upgraded!', '#ffcc44');
      if (snd) snd.playSFX('upgrade');
      shakeTimer = 20;
      return;
    } else {
      let needIron = max(0, 10 - (state.ironOre || 0));
      let needBone = max(0, 5 - (state.titanBone || 0));
      addFloatingText(w2sX(v.isleX), w2sY(v.isleY) - 30, 'Need 10 iron + 5 titan bone', '#ff8844');
      if (needIron > 0) addFloatingText(w2sX(v.isleX), w2sY(v.isleY) - 44, 'Iron: ' + (state.ironOre || 0) + '/10', '#aabbcc');
      if (needBone > 0) addFloatingText(w2sX(v.isleX), w2sY(v.isleY) - 56, 'Titan Bone: ' + (state.titanBone || 0) + '/5', '#ffdd88');
      return;
    }
  }
  // Find the nearest uncollected obsidian node in range
  let best = null, bestD = Infinity;
  for (let n of v.obsidianNodes) {
    if (n.collected) continue;
    let d = dist(p.x, p.y, n.x, n.y);
    if (d < 30 && d < bestD) { bestD = d; best = n; }
  }
  if (best) {
    if (best.cooldown && best.cooldown > 0) {
      addFloatingText(w2sX(best.x), w2sY(best.y) - 14, 'Still mining...', '#cc8844');
      return;
    }
    state.obsidian++;
    best.collected = true;
    if (snd) snd.playSFX('chop');
    addFloatingText(w2sX(best.x), w2sY(best.y) - 14, '+1 Obsidian', '#8855cc');
    spawnParticles(best.x, best.y, 'crystal', 6);
    return;
  }
  // Hot springs — no interaction needed (auto-heal), but give feedback if standing in one
  for (let hs of v.hotSprings) {
    if (dist(p.x, p.y, hs.x, hs.y) < 30) {
      addFloatingText(w2sX(hs.x), w2sY(hs.y) - 14, 'Hot spring — stand still to heal', '#44ddaa');
      return;
    }
  }
  // Volcano Heart — hidden chamber inside the crater (northwest of center, near a lava vein)
  let heartX = v.isleX - v.isleRX * 0.28, heartY = v.isleY - v.isleRY * 0.35;
  if (dist(p.x, p.y, heartX, heartY) < 20) {
    if (state.narrativeFlags && state.narrativeFlags['secret_volcano_heart']) {
      addFloatingText(w2sX(heartX), w2sY(heartY) - 14, 'The Heart of Vulcan pulses faintly.', '#ff8844');
      return;
    }
    let hasObs = (state.obsidian || 0) >= 3;
    let hasFrost = (state.frostCrystal || 0) >= 2;
    if (hasObs && hasFrost) {
      state.obsidian -= 3;
      state.frostCrystal -= 2;
      state.narrativeFlags['secret_volcano_heart'] = true;
      state._volcanoHeartOverlay = true;
      state._volcanoHeartTimer = 0;
      state.crystals = (state.crystals || 0) + 3;
      state.player.maxHp += 10;
      state.player.hp = state.player.maxHp;
      trackMilestone('secret_volcano_heart');
      if (snd) snd.playSFX('upgrade');
      spawnParticles(heartX, heartY, 'divine', 30);
      spawnParticles(heartX, heartY, 'crystal', 15);
      shakeTimer = 20;
      return;
    } else {
      // Subtle hint — only if standing right on it
      addFloatingText(w2sX(heartX), w2sY(heartY) - 14, 'The rock trembles... something is sealed within.', '#ff6633');
      if (!hasObs) addFloatingText(w2sX(heartX), w2sY(heartY) - 28, 'You feel it craves dark stone...', '#aa6644');
      if (!hasFrost) addFloatingText(w2sX(heartX), w2sY(heartY) - 42, '...and frozen light.', '#88bbdd');
      return;
    }
  }
  addFloatingText(w2sX(p.x), w2sY(p.y) - 18, '...', '#886655');
}

function handleHyperboreInteract() {
  let h = state.hyperborea, p = state.player;
  // Frost crystal nodes
  let bestNode = null, bestNodeD = Infinity;
  for (let n of h.frostNodes) {
    if (n.collected) continue;
    let d = dist(p.x, p.y, n.x, n.y);
    if (d < 28 && d < bestNodeD) { bestNodeD = d; bestNode = n; }
  }
  if (bestNode) {
    state.frostCrystal++;
    bestNode.collected = true;
    if (snd) snd.playSFX('crystal');
    addFloatingText(w2sX(bestNode.x), w2sY(bestNode.y) - 14, '+1 Frost Crystal', '#88ddff');
    spawnParticles(bestNode.x, bestNode.y, 'build', 6);
    return;
  }
  // Frozen ruins search
  let bestRuin = null, bestRuinD = Infinity;
  for (let r of h.frozenRuins) {
    if (r.looted) continue;
    let d = dist(p.x, p.y, r.x, r.y);
    if (d < 35 && d < bestRuinD) { bestRuinD = d; bestRuin = r; }
  }
  if (bestRuin) {
    bestRuin.looted = true;
    let roll = random();
    if (roll < 0.5) {
      state.frostCrystal++;
      addFloatingText(w2sX(bestRuin.x), w2sY(bestRuin.y) - 14, '+1 Frost Crystal (ruins)', '#88ddff');
    } else if (roll < 0.8) {
      state.gold = (state.gold || 0) + floor(random(3, 8));
      addFloatingText(w2sX(bestRuin.x), w2sY(bestRuin.y) - 14, '+Gold (ruins)', '#ffdd66');
    } else {
      state.crystals = (state.crystals || 0) + 1;
      addFloatingText(w2sX(bestRuin.x), w2sY(bestRuin.y) - 14, '+Crystal (ruins)', '#aaddff');
    }
    if (snd) snd.playSFX('scavenge');
    spawnParticles(bestRuin.x, bestRuin.y, 'build', 5);
    return;
  }
  // Frozen obelisk — learn ritual when all ruins looted
  if (h.frozenObelisk && dist(p.x, p.y, h.frozenObelisk.x, h.frozenObelisk.y) < 40) {
    if (state.narrativeFlags && state.narrativeFlags['learn_ritual']) {
      addFloatingText(w2sX(h.frozenObelisk.x), w2sY(h.frozenObelisk.y) - 40, 'The ritual is already memorized.', '#88ddff');
      return;
    }
    let allLooted = h.frozenRuins.length >= 4 && h.frozenRuins.every(r => r.looted);
    if (allLooted) {
      state.narrativeFlags['learn_ritual'] = true;
      addFloatingText(width / 2, height * 0.2, 'RITUAL OF SOL INVICTUS MEMORIZED', '#88ddff');
      addFloatingText(width / 2, height * 0.28, 'The words burn into your mind like starlight.', '#aaddff');
      spawnParticles(h.frozenObelisk.x, h.frozenObelisk.y, 'divine', 15);
      if (snd) snd.playSFX('crystal');
    } else {
      let looted = h.frozenRuins.filter(r => r.looted).length;
      addFloatingText(w2sX(h.frozenObelisk.x), w2sY(h.frozenObelisk.y) - 40, 'Search all frozen ruins first (' + looted + '/4)', '#88ddff');
    }
    return;
  }
  // Ice Mirror — hidden reflective pool behind the glacier (northwest corner)
  let mirrorX = h.isleX - h.isleRX * 0.55, mirrorY = h.isleY - h.isleRY * 0.45;
  if (dist(p.x, p.y, mirrorX, mirrorY) < 22) {
    if (state.narrativeFlags && state.narrativeFlags['secret_ice_mirror']) {
      addFloatingText(w2sX(mirrorX), w2sY(mirrorY) - 14, 'The mirror remembers you.', '#aaddff');
      return;
    }
    state.narrativeFlags['secret_ice_mirror'] = true;
    state._iceMirrorOverlay = true;
    state._iceMirrorTimer = 0;
    trackMilestone('secret_ice_mirror');
    if (snd) snd.playSFX('crystal');
    spawnParticles(mirrorX, mirrorY, 'divine', 20);
    shakeTimer = 8;
    return;
  }
  addFloatingText(w2sX(p.x), w2sY(p.y) - 18, '...', '#778899');
}

function handlePlentyInteract() {
  let pl = state.plenty, p = state.player;
  // Spice nodes
  let bestSpice = null, bestSpiceD = Infinity;
  for (let n of pl.spiceNodes) {
    if (n.collected) continue;
    let d = dist(p.x, p.y, n.x, n.y);
    if (d < 25 && d < bestSpiceD) { bestSpiceD = d; bestSpice = n; }
  }
  if (bestSpice) {
    state.exoticSpices++;
    bestSpice.collected = true;
    if (snd) snd.playSFX('harvest');
    addFloatingText(w2sX(bestSpice.x), w2sY(bestSpice.y) - 14, '+1 Exotic Spices', '#ffaa44');
    spawnParticles(bestSpice.x, bestSpice.y, 'harvest', 6);
    return;
  }
  // Fruit trees
  let bestTree = null, bestTreeD = Infinity;
  for (let t of pl.fruitTrees) {
    if (!t.fruit) continue;
    let d = dist(p.x, p.y, t.x, t.y);
    if (d < 28 && d < bestTreeD) { bestTreeD = d; bestTree = t; }
  }
  if (bestTree) {
    bestTree.fruit = false;
    bestTree.timer = 600; // regrow after ~10 seconds
    state.exoticSpices++;
    if (snd) snd.playSFX('harvest');
    addFloatingText(w2sX(bestTree.x), w2sY(bestTree.y) - 14, '+1 Exotic Spices (' + bestTree.type + ')', '#ffcc44');
    spawnParticles(bestTree.x, bestTree.y, 'harvest', 5);
    return;
  }
  addFloatingText(w2sX(p.x), w2sY(p.y) - 18, '...', '#557744');
}

function handleNecropolisInteract() {
  let n = state.necropolis, p = state.player;
  // Soul essence nodes
  let bestSoul = null, bestSoulD = Infinity;
  for (let sn of n.soulNodes) {
    if (sn.collected) continue;
    let d = dist(p.x, p.y, sn.x, sn.y);
    if (d < 25 && d < bestSoulD) { bestSoulD = d; bestSoul = sn; }
  }
  if (bestSoul) {
    state.soulEssence++;
    bestSoul.collected = true;
    if (snd) snd.playSFX('crystal');
    addFloatingText(w2sX(bestSoul.x), w2sY(bestSoul.y) - 14, '+1 Soul Essence', '#cc88ff');
    spawnParticles(bestSoul.x, bestSoul.y, 'combat', 6);
    return;
  }
  // Tombs
  let bestTomb = null, bestTombD = Infinity;
  for (let t of n.tombs) {
    if (t.looted) continue;
    let d = dist(p.x, p.y, t.x, t.y);
    if (d < 30 && d < bestTombD) { bestTombD = d; bestTomb = t; }
  }
  if (bestTomb) {
    bestTomb.looted = true;
    if (bestTomb.trapped && p.invincTimer <= 0) {
      let dmg = 10 - ((typeof getPlayerDefenseReduction === 'function') ? getPlayerDefenseReduction() : (p.armor > 0 ? p.armor * 3 : 0));
      p.hp = Math.max(0, p.hp - max(1, dmg));
      p.invincTimer = 45;
      shakeTimer = 6;
      addFloatingText(w2sX(bestTomb.x), w2sY(bestTomb.y) - 14, 'TRAPPED! -' + max(1, dmg) + ' HP', '#ff4444');
      if (snd) snd.playSFX('scavenge');
      return;
    }
    state.soulEssence++;
    if (snd) snd.playSFX('scavenge');
    addFloatingText(w2sX(bestTomb.x), w2sY(bestTomb.y) - 14, '+1 Soul Essence (tomb)', '#cc88ff');
    spawnParticles(bestTomb.x, bestTomb.y, 'combat', 5);
    return;
  }
  // Ghost NPCs
  let bestGhost = null, bestGhostD = Infinity;
  for (let g of n.ghostNPCs) {
    if (g.talked) continue;
    let d = dist(p.x, p.y, g.x, g.y);
    if (d < 35 && d < bestGhostD) { bestGhostD = d; bestGhost = g; }
  }
  if (bestGhost) {
    bestGhost.talked = true;
    addFloatingText(w2sX(bestGhost.x), w2sY(bestGhost.y) - 28, bestGhost.name + ': ' + bestGhost.line, '#ddccff');
    return;
  }
  // Room 13 — secret tomb hidden behind the mausoleum (walk into its dark entrance)
  let mausX = n.isleX, mausY = n.isleY - 5;
  if (dist(p.x, p.y, mausX, mausY) < 18) {
    if (state.narrativeFlags && state.narrativeFlags['secret_room_13']) {
      addFloatingText(w2sX(mausX), w2sY(mausY) - 30, 'Room XIII is empty now. Its secret is yours.', '#cc88ff');
      return;
    }
    state.narrativeFlags['secret_room_13'] = true;
    state._room13Overlay = true;
    state._room13Timer = 0;
    trackMilestone('secret_room_13');
    // Reward: death shroud cosmetic
    state.wardrobe = state.wardrobe || { tunicColor: 0, headwear: 0 };
    state.wardrobe.deathShroud = true;
    state.soulEssence = (state.soulEssence || 0) + 5;
    if (snd) snd.playSFX('crystal');
    spawnParticles(mausX, mausY, 'combat', 25);
    shakeTimer = 12;
    return;
  }
  addFloatingText(w2sX(p.x), w2sY(p.y) - 18, '...', '#665577');
}

// ======================================================================
// === SECRET AREA OVERLAYS — Shareable Moment Screens ==================
// ======================================================================

function updateSecretOverlays(dt) {
  if (state._iceMirrorOverlay) {
    state._iceMirrorTimer = (state._iceMirrorTimer || 0) + dt;
    if (state._iceMirrorTimer > 600) state._iceMirrorOverlay = false;
  }
  if (state._room13Overlay) {
    state._room13Timer = (state._room13Timer || 0) + dt;
    if (state._room13Timer > 480) state._room13Overlay = false;
  }
  if (state._volcanoHeartOverlay) {
    state._volcanoHeartTimer = (state._volcanoHeartTimer || 0) + dt;
    if (state._volcanoHeartTimer > 480) state._volcanoHeartOverlay = false;
  }
}

function drawSecretOverlays() {
  if (state._iceMirrorOverlay) drawIceMirrorOverlay();
  if (state._room13Overlay) drawRoom13Overlay();
  if (state._volcanoHeartOverlay) drawVolcanoHeartOverlay();
}

function drawIceMirrorOverlay() {
  let t = state._iceMirrorTimer || 0;
  let fadeIn = min(1, t / 60);
  let fadeOut = t > 520 ? max(0, 1 - (t - 520) / 80) : 1;
  let alpha = fadeIn * fadeOut;
  if (alpha <= 0) return;

  push();
  // Dark overlay
  fill(5, 15, 30, floor(200 * alpha));
  rect(0, 0, width, height);

  // Reflective pool border
  let cx = width / 2, cy = height / 2;
  let poolW = 280, poolH = 340;

  // Shimmering border
  let shimmer = sin(frameCount * 0.03) * 10;
  fill(100, 180, 240, floor(30 * alpha));
  ellipse(cx, cy, poolW + 20 + shimmer, poolH + 20 + shimmer);
  fill(140, 210, 250, floor(20 * alpha));
  ellipse(cx, cy, poolW + 10, poolH + 10);

  // Dark mirror surface
  fill(8, 20, 40, floor(230 * alpha));
  rect(cx - poolW / 2, cy - poolH / 2, poolW, poolH, 8);

  // Ice crystal frame
  fill(120, 200, 255, floor(40 * alpha));
  for (let i = 0; i < 12; i++) {
    let a = (i / 12) * TWO_PI;
    let fx = cx + cos(a) * (poolW / 2 + 3);
    let fy = cy + sin(a) * (poolH / 2 + 3);
    rect(floor(fx) - 2, floor(fy) - 2, 4, 4);
  }

  // Title
  fill(180, 230, 255, floor(220 * alpha));
  textAlign(CENTER); textSize(14); textStyle(ITALIC);
  text('THE ICE MIRROR', cx, cy - poolH / 2 + 30);
  textStyle(NORMAL);

  // Subtitle
  fill(120, 180, 220, floor(160 * alpha));
  textSize(10);
  text('Your reflection speaks truths frozen in time', cx, cy - poolH / 2 + 44);

  // Journey stats — poetic format
  let p = state.player, s = state;
  let days = s.day || 1;
  let buildings = s.buildings ? s.buildings.length : 0;
  let fish = s.codex ? Object.keys(s.codex.fishCaught || {}).length : 0;
  let crops = s.codex ? Object.keys(s.codex.cropsGrown || {}).length : 0;
  let enemies = s.codex ? Object.keys(s.codex.enemies || {}).length : 0;
  let hearts = s.npc ? s.npc.hearts : 0;
  let islands = 0;
  if (s.narrativeFlags) {
    if (s.narrativeFlags['discover_vulcan']) islands++;
    if (s.narrativeFlags['discover_hyperborea']) islands++;
    if (s.narrativeFlags['discover_plenty']) islands++;
    if (s.narrativeFlags['discover_necropolis']) islands++;
  }

  let lineY = cy - 70;
  let lineH = 24;
  textSize(9);

  // Animated reveal — each line fades in sequentially
  let lines = [
    { col: [200, 230, 255], txt: days + ' suns have risen since the shipwreck' },
    { col: [200, 180, 140], txt: buildings + ' stones laid upon the earth' },
    { col: [140, 200, 255], txt: fish + ' creatures drawn from the deep' },
    { col: [140, 200, 100], txt: crops + ' seeds coaxed into bloom' },
    { col: [200, 100, 100], txt: enemies + ' foes faced in the dark' },
    { col: [255, 180, 200], txt: hearts > 0 ? 'A bond of ' + hearts + ' hearts with Livia' : 'No bonds yet forged' },
    { col: [200, 180, 255], txt: islands + ' distant shores touched by your feet' },
  ];

  for (let i = 0; i < lines.length; i++) {
    let lineAlpha = max(0, min(1, (t - 40 - i * 30) / 40)) * alpha;
    if (lineAlpha <= 0) continue;
    let l = lines[i];
    fill(l.col[0], l.col[1], l.col[2], floor(200 * lineAlpha));
    text(l.txt, cx, lineY + i * lineH);
  }

  // Bottom inscription
  let endAlpha = max(0, min(1, (t - 320) / 60)) * alpha;
  if (endAlpha > 0) {
    fill(160, 210, 240, floor(120 * endAlpha));
    textSize(10); textStyle(ITALIC);
    text('The ice remembers what the living forget.', cx, cy + poolH / 2 - 40);
    textStyle(NORMAL);
    fill(100, 160, 200, floor(80 * endAlpha));
    textSize(9);
    text('SECRET FOUND: Ice Mirror of Hyperborea', cx, cy + poolH / 2 - 22);
  }

  textAlign(LEFT);
  pop();
}

function drawRoom13Overlay() {
  let t = state._room13Timer || 0;
  let fadeIn = min(1, t / 50);
  let fadeOut = t > 400 ? max(0, 1 - (t - 400) / 80) : 1;
  let alpha = fadeIn * fadeOut;
  if (alpha <= 0) return;

  push();
  // Deep purple-black overlay
  fill(10, 5, 20, floor(220 * alpha));
  rect(0, 0, width, height);

  let cx = width / 2, cy = height / 2;

  // Stone tablet frame
  fill(35, 28, 42, floor(240 * alpha));
  rect(cx - 130, cy - 150, 260, 300, 4);
  fill(48, 40, 58, floor(200 * alpha));
  rect(cx - 125, cy - 145, 250, 290, 3);

  // Glowing border runes
  let runePulse = sin(frameCount * 0.04) * 0.3 + 0.7;
  fill(160, 80, 220, floor(40 * runePulse * alpha));
  for (let i = 0; i < 16; i++) {
    let rx, ry;
    if (i < 4) { rx = cx - 128 + i * 85; ry = cy - 148; }
    else if (i < 8) { rx = cx + 122; ry = cy - 148 + (i - 4) * 98; }
    else if (i < 12) { rx = cx + 122 - (i - 8) * 85; ry = cy + 142; }
    else { rx = cx - 128; ry = cy + 142 - (i - 12) * 98; }
    rect(floor(rx), floor(ry), 4, 4);
  }

  // Title
  fill(200, 140, 255, floor(230 * alpha));
  textAlign(CENTER); textSize(16); textStyle(BOLD);
  text('ROOM XIII', cx, cy - 110);
  textStyle(NORMAL);

  // Lore tablet text — revealed line by line
  textSize(11);
  let lore = [
    'Here lies the secret of the Thirteenth',
    'Tomb of the Necropolis — a chamber',
    'sealed by the priests of old.',
    '',
    'Those who feared death most',
    'built this room to hide from it.',
    'They failed, but left behind',
    'a shroud woven from shadow.',
    '',
    'Wear it, and the dead',
    'shall mistake you for their own.',
  ];

  for (let i = 0; i < lore.length; i++) {
    let lineAlpha = max(0, min(1, (t - 30 - i * 18) / 30)) * alpha;
    if (lineAlpha <= 0) continue;
    fill(180, 160, 210, floor(200 * lineAlpha));
    text(lore[i], cx, cy - 70 + i * 18);
  }

  // Reward notification
  let rewardAlpha = max(0, min(1, (t - 280) / 50)) * alpha;
  if (rewardAlpha > 0) {
    fill(255, 200, 100, floor(200 * rewardAlpha));
    textSize(9);
    text('Obtained: Death Shroud', cx, cy + 110);
    fill(180, 120, 255, floor(160 * rewardAlpha));
    textSize(10);
    text('+5 Soul Essence', cx, cy + 126);
    fill(120, 100, 160, floor(100 * rewardAlpha));
    textSize(9);
    text('SECRET FOUND: Room XIII of the Necropolis', cx, cy + 142);
  }

  textAlign(LEFT);
  pop();
}

function drawVolcanoHeartOverlay() {
  let t = state._volcanoHeartTimer || 0;
  let fadeIn = min(1, t / 50);
  let fadeOut = t > 400 ? max(0, 1 - (t - 400) / 80) : 1;
  let alpha = fadeIn * fadeOut;
  if (alpha <= 0) return;

  push();
  // Deep red-black overlay
  fill(15, 3, 2, floor(210 * alpha));
  rect(0, 0, width, height);

  let cx = width / 2, cy = height / 2;

  // Volcanic chamber — rough hewn rock frame
  fill(40, 18, 8, floor(240 * alpha));
  rect(cx - 140, cy - 130, 280, 260, 6);
  fill(55, 28, 12, floor(200 * alpha));
  rect(cx - 135, cy - 125, 270, 250, 4);

  // Lava cracks in the frame
  let lavaPulse = sin(frameCount * 0.05) * 0.4 + 0.6;
  fill(255, 80, 15, floor(40 * lavaPulse * alpha));
  rect(cx - 133, cy - 60, 266, 1);
  rect(cx - 133, cy + 20, 266, 1);
  rect(cx - 80, cy - 123, 1, 246);
  rect(cx + 80, cy - 123, 1, 246);

  // Crystal in the center — pulsing
  let crystalGlow = sin(frameCount * 0.06) * 0.3 + 0.7;
  fill(255, 100, 30, floor(50 * crystalGlow * alpha)); ellipse(cx, cy - 30, 60, 60);
  fill(255, 160, 50, floor(80 * crystalGlow * alpha)); ellipse(cx, cy - 30, 36, 36);
  fill(255, 220, 100, floor(100 * crystalGlow * alpha)); ellipse(cx, cy - 30, 18, 18);
  fill(255, 250, 200, floor(60 * crystalGlow * alpha)); ellipse(cx, cy - 30, 8, 8);

  // Title
  fill(255, 180, 80, floor(230 * alpha));
  textAlign(CENTER); textSize(14); textStyle(BOLD);
  text('HEART OF VULCAN', cx, cy - 90);
  textStyle(NORMAL);

  // Description
  textSize(11);
  let desc = [
    'Deep beneath the crater,',
    'where obsidian meets frost,',
    'the mountain yields its secret:',
    'a crystal forged in the world\'s first fire.',
    '',
    'Its warmth enters your veins.',
    'You feel... stronger.',
  ];

  for (let i = 0; i < desc.length; i++) {
    let lineAlpha = max(0, min(1, (t - 40 - i * 22) / 30)) * alpha;
    if (lineAlpha <= 0) continue;
    fill(255, 200, 150, floor(200 * lineAlpha));
    text(desc[i], cx, cy + 10 + i * 18);
  }

  // Reward
  let rewardAlpha = max(0, min(1, (t - 260) / 50)) * alpha;
  if (rewardAlpha > 0) {
    fill(255, 220, 100, floor(200 * rewardAlpha));
    textSize(9);
    text('+10 Max HP  |  +3 Crystals', cx, cy + 100);
    fill(200, 120, 60, floor(100 * rewardAlpha));
    textSize(9);
    text('SECRET FOUND: Heart of Vulcan', cx, cy + 118);
  }

  textAlign(LEFT);
  pop();
}

function getIslandRelationship(islandKey) {
  if (!islandKey) return 'none';
  // Home island
  if (islandKey === 'home' || (!state.nations[islandKey] && !getWorldIsland(islandKey) && islandKey !== 'wreck' && islandKey !== 'conquest')) return 'home';
  // Player-owned/controlled
  if (isIslandControlled(islandKey)) return 'owned';
  // Faction island
  let rv = state.nations[islandKey];
  if (rv) {
    if (rv.defeated) return 'owned';
    if (rv.allied || (state._alliances && state._alliances.includes(islandKey))) return 'ally';
    if (rv.reputation <= -30) return 'enemy';
    return 'neutral';
  }
  // World island (neutral/resource/trade/etc)
  let wisle = getWorldIsland(islandKey);
  if (wisle) {
    if (isIslandControlled(islandKey)) return 'owned';
    return 'neutral';
  }
  // Exploration islands
  if (['vulcan','hyperborea','plenty','necropolis'].includes(islandKey)) return 'neutral';
  return 'neutral';
}

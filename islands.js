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
// ======================================================================
// === HYPERBOREA — Frozen Island (Far North) ==========================
// ======================================================================
// ======================================================================
// === ISLE OF PLENTY — Tropical Paradise (Southeast) ==================
// ======================================================================
// ======================================================================
// === NECROPOLIS — Ancient Burial Island (Far Southwest) ==============
// ======================================================================
// ======================================================================
// === ISLAND [E] INTERACTION HANDLERS =================================
// ======================================================================

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

// ═══ UNIQUE WORLD ISLAND VISUALS ═══
function drawWorldIslandContent(isle, sx, sy, sc) {
  if (!isle || !isle.key) return;
  push();
  translate(sx, sy);
  noStroke();
  let s = sc || 1; // distance scale

  switch(isle.key) {
    // ═══ FACTION CAPITALS ═══
    case 'rome_capital':
      // Colosseum + Senate
      fill(180, 160, 130); rect(-20*s, -8*s, 40*s, 16*s); // senate base
      fill(200, 180, 150); triangle(-22*s, -8*s, 22*s, -8*s, 0, -20*s); // pediment
      for (let i = -2; i <= 2; i++) { fill(190, 170, 140); rect(i*8*s-2*s, -8*s, 4*s, 16*s); } // columns
      fill(160, 140, 110); ellipse(28*s, 0, 18*s, 14*s); stroke(140,120,90); noFill();
      for (let a = 0; a < PI; a += 0.4) { let ax = 28*s+cos(a)*8*s, ay = -sin(a)*6*s; rect(ax-1.5*s, ay-3*s, 3*s, 6*s); }
      noStroke(); fill(180,50,50,160); ellipse(0, -24*s, 6*s, 6*s); // SPQR banner dot
      break;

    case 'carthage_capital':
      // Harbor fortress + Tanit symbol
      fill(180, 150, 100); rect(-18*s, -6*s, 36*s, 14*s); // citadel
      fill(160, 130, 80); rect(-22*s, -10*s, 8*s, 18*s); rect(14*s, -10*s, 8*s, 18*s); // towers
      fill(140, 110, 60); triangle(-22*s, -10*s, -14*s, -10*s, -18*s, -16*s);
      triangle(14*s, -10*s, 22*s, -10*s, 18*s, -16*s); // tower caps
      fill(200, 170, 80); ellipse(0, -14*s, 8*s, 8*s); // Tanit disc
      stroke(200, 170, 80); strokeWeight(1.5*s); line(-4*s, -10*s, 4*s, -10*s); // Tanit arms
      line(0, -14*s, 0, -6*s); noStroke(); // Tanit body
      fill(80, 140, 180, 120); ellipse(0, 14*s, 30*s, 8*s); // harbor water
      break;

    case 'egypt_capital':
      // Pyramid + lighthouse
      fill(200, 180, 120); triangle(-16*s, 8*s, 16*s, 8*s, 0, -16*s); // great pyramid
      fill(180, 160, 100); triangle(12*s, 8*s, 28*s, 8*s, 20*s, -8*s); // smaller pyramid
      fill(220, 200, 140); rect(30*s, -18*s, 6*s, 26*s); // lighthouse tower
      fill(255, 230, 100, 180); ellipse(33*s, -20*s, 8*s, 8*s); // lighthouse flame
      fill(80, 150, 200, 100); rect(-24*s, 8*s, 60*s, 4*s); // Nile strip
      break;

    case 'greece_capital':
      // Parthenon + olive tree
      fill(220, 215, 200); rect(-16*s, -4*s, 32*s, 12*s); // temple base
      fill(235, 230, 215); triangle(-18*s, -4*s, 18*s, -4*s, 0, -14*s); // pediment
      for (let i = -3; i <= 3; i++) { fill(225, 220, 205); rect(i*5*s-1.5*s, -4*s, 3*s, 12*s); }
      fill(100, 140, 70); ellipse(-22*s, 2*s, 10*s, 12*s); // olive tree canopy
      fill(90, 70, 40); rect(-22*s, 6*s, 2*s, 6*s); // trunk
      fill(60, 100, 180, 100); ellipse(22*s, 6*s, 12*s, 6*s); // agora pool
      break;

    case 'persia_capital':
      // Palace with Apadana columns + winged disc
      fill(170, 140, 100); rect(-22*s, -4*s, 44*s, 14*s); // palace platform
      fill(190, 160, 120); rect(-18*s, -14*s, 36*s, 10*s); // upper palace
      for (let i = -3; i <= 3; i++) { fill(180, 150, 110); rect(i*6*s-2*s, -14*s, 4*s, 24*s); } // columns
      fill(200, 170, 60); ellipse(0, -18*s, 10*s, 6*s); // Faravahar disc
      stroke(200, 170, 60); strokeWeight(1*s);
      line(-6*s, -16*s, -12*s, -14*s); line(6*s, -16*s, 12*s, -14*s); // wings
      noStroke();
      fill(100, 60, 140, 100); rect(-24*s, 10*s, 48*s, 3*s); // royal road
      break;

    case 'phoenicia_capital':
      // Harbor city + cedar + purple dye vats
      fill(160, 140, 110); rect(-14*s, -4*s, 28*s, 12*s); // city wall
      fill(180, 160, 130); rect(-8*s, -10*s, 16*s, 6*s); // inner city
      fill(60, 120, 60); triangle(18*s, 4*s, 22*s, 4*s, 20*s, -12*s); // cedar tree
      fill(50, 100, 50); ellipse(20*s, -8*s, 10*s, 6*s); // cedar canopy
      fill(120, 40, 140, 160); ellipse(-18*s, 4*s, 6*s, 4*s); ellipse(-12*s, 6*s, 5*s, 3*s); // purple dye vats
      fill(80, 140, 180, 120); ellipse(0, 14*s, 24*s, 6*s); // harbor
      break;

    case 'gaul_capital':
      // Hill fort + palisade + standing stones
      fill(120, 100, 70); ellipse(0, 0, 32*s, 20*s); // hill mound
      fill(100, 80, 50); rect(-16*s, -2*s, 32*s, 4*s); // palisade wall
      fill(140, 120, 80); rect(-4*s, -10*s, 8*s, 12*s); // great hall
      fill(130, 110, 70); triangle(-6*s, -10*s, 10*s, -10*s, 2*s, -18*s); // roof
      fill(150, 150, 140); // standing stones
      rect(-22*s, -6*s, 3*s, 10*s); rect(20*s, -4*s, 3*s, 8*s); rect(-14*s, -8*s, 2*s, 6*s);
      fill(180, 80, 40, 140); ellipse(12*s, 4*s, 6*s, 6*s); // war boar pen glow
      break;

    case 'seapeople_capital':
      // Giant ship/kraken lair
      fill(60, 80, 100); ellipse(0, 0, 36*s, 16*s); // dark lagoon
      fill(80, 100, 60); // ship hull fragments
      beginShape(); vertex(-18*s, 4*s); vertex(-14*s, -2*s); vertex(14*s, -2*s); vertex(18*s, 4*s);
      vertex(12*s, 6*s); vertex(-12*s, 6*s); endShape(CLOSE);
      fill(100, 80, 60); rect(-2*s, -12*s, 4*s, 10*s); // mast
      fill(120, 100, 80); triangle(-2*s, -12*s, -2*s, -4*s, -14*s, -6*s); // tattered sail
      // Kraken tentacles
      stroke(100, 60, 80); strokeWeight(2*s); noFill();
      beginShape(); curveVertex(-20*s, 8*s); curveVertex(-16*s, 12*s); curveVertex(-10*s, 10*s); curveVertex(-8*s, 14*s); endShape();
      beginShape(); curveVertex(20*s, 8*s); curveVertex(16*s, 12*s); curveVertex(10*s, 10*s); curveVertex(8*s, 14*s); endShape();
      noStroke();
      fill(200, 160, 40, 140); ellipse(0, -2*s, 4*s, 4*s); // glowing treasure
      break;

    // ═══ TRADE HUBS ═══
    case 'golden_bazaar':
      // Golden market tents
      for (let i = -2; i <= 2; i++) {
        fill(200, 170, 50); triangle(i*18*s, -10*s, i*18*s-8*s, 2*s, i*18*s+8*s, 2*s);
        fill(180, 140, 30); rect(i*18*s-6*s, 2*s, 12*s, 6*s);
      }
      // Gold coins scattered
      fill(220, 190, 40, 180);
      for (let i = 0; i < 5; i++) ellipse((i-2)*12*s, 12*s + (i%2)*4*s, 3*s, 3*s);
      break;

    case 'emporium':
      // Large warehouse
      fill(140, 120, 90); rect(-20*s, -15*s, 40*s, 25*s);
      fill(160, 140, 100); rect(-20*s, -15*s, 40*s, 5*s); // roof
      // Crane
      fill(100, 80, 50); rect(22*s, -20*s, 3*s, 25*s);
      stroke(100, 80, 50); strokeWeight(1); line(22*s, -20*s, 35*s, -15*s); noStroke();
      // Crates
      fill(120, 90, 50); rect(-8*s, 12*s, 6*s, 6*s); rect(2*s, 10*s, 8*s, 8*s);
      break;

    case 'silk_road':
      // Caravanserai arch
      fill(180, 150, 110); rect(-15*s, -12*s, 30*s, 20*s, 2*s);
      fill(200, 170, 120); arc(0, -12*s, 20*s, 14*s, PI, 0);
      // Silk fabrics hanging
      fill(200, 50, 80, 180); rect(-10*s, -5*s, 5*s, 10*s);
      fill(50, 100, 200, 180); rect(0, -5*s, 5*s, 10*s);
      fill(200, 180, 50, 180); rect(8*s, -5*s, 5*s, 10*s);
      break;

    case 'spice_islands':
      // Colorful spice mounds
      fill(200, 80, 30); ellipse(-15*s, 5*s, 12*s, 6*s); // paprika
      fill(220, 200, 50); ellipse(0, 3*s, 10*s, 5*s); // turmeric
      fill(60, 120, 40); ellipse(12*s, 5*s, 11*s, 5*s); // herbs
      fill(160, 40, 40); ellipse(-5*s, 10*s, 9*s, 4*s); // saffron
      // Drying racks
      fill(100, 80, 50); rect(-20*s, -8*s, 2*s, 16*s); rect(18*s, -8*s, 2*s, 16*s);
      stroke(100, 80, 50); strokeWeight(1); line(-19*s, -6*s, 19*s, -6*s); line(-19*s, -2*s, 19*s, -2*s); noStroke();
      break;

    case 'amber_coast':
      // Golden amber stones
      fill(220, 180, 60, 200);
      for (let i = 0; i < 6; i++) {
        let ax = (i-3)*10*s + sin(i)*5*s, ay = 8*s + cos(i*2)*3*s;
        ellipse(ax, ay, 5*s + i%3*2*s, 4*s + i%2*2*s);
      }
      // Golden beach shimmer
      fill(240, 220, 140, 60); ellipse(0, 10*s, 50*s, 12*s);
      break;

    case 'ivory_port':
      // Ivory arch
      fill(230, 220, 200); rect(-12*s, -15*s, 4*s, 20*s); rect(8*s, -15*s, 4*s, 20*s);
      fill(240, 230, 210); arc(0, -15*s, 24*s, 12*s, PI, 0);
      // Elephant tusks
      fill(235, 225, 200);
      beginShape(); vertex(-20*s, 5*s); vertex(-18*s, -8*s); vertex(-15*s, -10*s); vertex(-16*s, 5*s); endShape(CLOSE);
      beginShape(); vertex(20*s, 5*s); vertex(18*s, -8*s); vertex(15*s, -10*s); vertex(16*s, 5*s); endShape(CLOSE);
      break;

    // ═══ RESOURCE ISLANDS ═══
    case 'ironwood_forest':
      // Dark trees
      for (let i = -3; i <= 3; i++) {
        fill(40, 50, 35); rect(i*10*s-1*s, -2*s, 3*s, 12*s); // trunk
        fill(30, 60, 30); ellipse(i*10*s, -6*s, 10*s, 12*s); // canopy
      }
      // Iron ore veins
      fill(100, 90, 80); rect(-15*s, 12*s, 8*s, 4*s); fill(120, 100, 85); rect(-13*s, 13*s, 4*s, 2*s);
      break;

    case 'stoneheart':
      // Marble cliffs
      fill(210, 205, 195); rect(-20*s, -10*s, 40*s, 15*s, 2*s);
      fill(230, 225, 215); rect(-18*s, -8*s, 36*s, 5*s);
      // Quarry pit
      fill(160, 155, 145); ellipse(0, 8*s, 24*s, 10*s);
      fill(140, 135, 125); ellipse(0, 8*s, 18*s, 7*s);
      // Stone blocks
      fill(200, 195, 185); rect(15*s, 2*s, 6*s, 4*s); rect(18*s, -2*s, 5*s, 4*s);
      break;

    case 'golden_hills':
      // Gold mine entrance
      fill(120, 100, 60); rect(-8*s, -5*s, 16*s, 12*s, 2*s);
      fill(40, 35, 25); ellipse(0, 2*s, 10*s, 8*s); // mine opening
      // Gold flecks
      fill(240, 210, 50, 200);
      for (let i = 0; i < 8; i++) ellipse((i-4)*6*s, 12*s + sin(i)*3*s, 2*s, 2*s);
      // Cart tracks
      stroke(100, 80, 40, 100); strokeWeight(1);
      line(-5*s, 10*s, -20*s, 15*s); line(5*s, 10*s, 20*s, 15*s); noStroke();
      break;

    case 'grain_sea':
      // Wheat fields
      fill(210, 190, 80);
      for (let i = -4; i <= 4; i++) {
        for (let j = 0; j < 3; j++) {
          rect(i*8*s, j*5*s - 2*s, 5*s, 4*s);
        }
      }
      // Windmill
      fill(180, 160, 130); rect(18*s, -15*s, 6*s, 20*s);
      fill(200, 180, 140); // blades
      push(); translate(21*s, -15*s); rotate(frameCount * 0.02);
      for (let b = 0; b < 4; b++) { rotate(HALF_PI); rect(-1*s, 0, 2*s, 12*s); }
      pop();
      break;

    // ═══ MILITARY FORTS ═══
    case 'iron_keep':
      // Black fortress
      fill(50, 50, 55); rect(-18*s, -12*s, 36*s, 22*s);
      fill(60, 60, 65); rect(-18*s, -12*s, 36*s, 4*s);
      // Towers
      fill(45, 45, 50); rect(-22*s, -16*s, 8*s, 28*s); rect(14*s, -16*s, 8*s, 28*s);
      // Iron gate
      fill(30, 30, 35); rect(-5*s, 2*s, 10*s, 8*s);
      fill(80, 80, 90); for (let i = -3; i <= 3; i++) rect(i*2*s, 2*s, 1*s, 8*s);
      // Red flag
      fill(180, 40, 40); rect(16*s, -20*s, 8*s, 5*s);
      break;

    case 'castrum_maris':
      // Roman coastal fort
      fill(170, 160, 140); rect(-15*s, -10*s, 30*s, 18*s);
      fill(180, 170, 150); rect(-15*s, -10*s, 30*s, 4*s);
      // Crenellations
      for (let i = -6; i <= 6; i++) { fill(175, 165, 145); rect(i*4*s, -13*s, 3*s, 3*s); }
      // Gate
      fill(120, 100, 70); arc(0, 4*s, 10*s, 12*s, PI, 0);
      break;

    case 'warhorse':
      // Stables
      fill(120, 90, 50); rect(-18*s, -5*s, 36*s, 14*s);
      fill(100, 70, 35); rect(-18*s, -5*s, 36*s, 3*s);
      // Horse silhouettes
      fill(140, 100, 60);
      for (let i = -1; i <= 1; i++) {
        ellipse(i*12*s, 3*s, 8*s, 5*s); // body
        ellipse(i*12*s+4*s, 0, 4*s, 4*s); // head
      }
      // Training fence
      stroke(100, 80, 40); strokeWeight(1);
      rect(-25*s, 10*s, 50*s, 1*s); noStroke();
      break;

    case 'siege_works':
      // Forge building
      fill(100, 80, 60); rect(-12*s, -8*s, 24*s, 16*s);
      // Catapult
      fill(90, 70, 40); rect(15*s, -2*s, 3*s, 10*s); // arm
      fill(80, 60, 35); rect(10*s, 6*s, 12*s, 4*s); // base
      // Fire glow
      fill(255, 150, 30, 100 + sin(frameCount * 0.1) * 40);
      ellipse(-5*s, 0, 10*s, 8*s);
      fill(255, 200, 50, 80); ellipse(-5*s, -2*s, 6*s, 5*s);
      break;

    case 'heros_grave':
      // Mausoleum
      fill(190, 185, 175); rect(-10*s, -12*s, 20*s, 18*s);
      fill(200, 195, 185); triangle(-12*s, -12*s, 12*s, -12*s, 0, -20*s);
      // Columns
      fill(210, 205, 195); rect(-10*s, -10*s, 3*s, 14*s); rect(7*s, -10*s, 3*s, 14*s);
      // Eternal flame
      fill(255, 180, 40, 180 + sin(frameCount * 0.08) * 40);
      ellipse(0, -22*s, 4*s, 6*s);
      fill(255, 220, 80, 140); ellipse(0, -23*s, 3*s, 4*s);
      break;

    // ═══ DIPLOMATIC ISLANDS ═══
    case 'senate_house':
      // Grand senate building
      fill(220, 215, 200); rect(-18*s, -10*s, 36*s, 18*s);
      fill(230, 225, 210); triangle(-20*s, -10*s, 20*s, -10*s, 0, -22*s);
      // Columns
      for (let i = -3; i <= 3; i++) { fill(235, 230, 220); rect(i*6*s-1*s, -8*s, 3*s, 14*s); }
      break;

    case 'oracle':
      // Mystical observatory
      fill(180, 170, 200); rect(-10*s, -8*s, 20*s, 16*s);
      fill(160, 150, 190); ellipse(0, -10*s, 16*s, 8*s); // dome
      // Glowing eye
      fill(100, 200, 255, 120 + sin(frameCount * 0.06) * 60);
      ellipse(0, -2*s, 8*s, 6*s);
      fill(40, 100, 200, 180); ellipse(0, -2*s, 4*s, 4*s);
      break;

    case 'neutral_port':
      // Peaceful harbor
      fill(150, 140, 120); rect(-15*s, 0, 30*s, 8*s); // pier
      fill(140, 130, 100); rect(-15*s, 0, 30*s, 2*s);
      // White flag
      fill(240, 240, 230); rect(0, -12*s, 8*s, 5*s);
      fill(100, 80, 50); rect(-1*s, -14*s, 2*s, 20*s);
      break;

    case 'temple_concord':
      // Harmony temple
      fill(210, 200, 180); rect(-12*s, -8*s, 24*s, 16*s);
      fill(220, 210, 190); triangle(-14*s, -8*s, 14*s, -8*s, 0, -18*s);
      // Olive branches
      fill(120, 150, 80); ellipse(-16*s, -4*s, 8*s, 12*s); ellipse(16*s, -4*s, 8*s, 12*s);
      break;
  }

  // Island name label (always shown when close)
  fill(255, 255, 220, 200);
  textSize(Math.max(8, 10 * s));
  textAlign(CENTER);
  text(isle.name, 0, -30 * s);

  // Controlled marker
  if (typeof isIslandControlled === 'function' && isIslandControlled(isle.key)) {
    fill(100, 255, 100, 180);
    textSize(Math.max(7, 8 * s));
    text('Controlled', 0, -22 * s);
  }

  pop();
}

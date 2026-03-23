// ─── FARMING SYSTEM ──────────────────────────────────────────────────────────
// Extracted from sketch.js — all farming constants, helpers, and draw functions.
// All symbols are global (browser JS); called freely from sketch.js.

// ─── SEASONAL CROPS ──────────────────────────────────────────────────────
const SEASONAL_CROPS = [
  { id: 'wildflower', name: 'Wildflower', season: 0, color: '#ff88cc', harvestValue: 2, desc: 'Spring bloom — 2x harvest, attracts butterflies' },
  { id: 'sunfruit',   name: 'Sunfruit',   season: 1, color: '#ffaa33', harvestValue: 2, desc: 'Summer gold — restores solar on harvest' },
  { id: 'pumpkin',    name: 'Pumpkin',     season: 2, color: '#dd7722', harvestValue: 3, desc: 'Autumn bounty — 3x harvest yield' },
  { id: 'frostherb',  name: 'Frost Herb',  season: 3, color: '#88ddff', harvestValue: 1, desc: 'Winter crystal — gives crystals on harvest' },
];

function getSeasonalCrop() {
  let season = getSeason();
  return SEASONAL_CROPS.find(c => c.season === season) || null;
}

function isSeasonalCrop(cropType) {
  return SEASONAL_CROPS.some(c => c.id === cropType);
}

function getSeasonalCropData(cropType) {
  return SEASONAL_CROPS.find(c => c.id === cropType);
}

// ─── NEW CROP TYPES ─────────────────────────────────────────────────────
// Flax: grows in 2 stages (fast), yields fiber for crafting. Grows best in spring.
// Pomegranate: grows slowly through 5 stages (extra visual detail), huge payoff. Best in autumn.
// Lotus: sacred plant, grows only near water (aqueducts), 3 stages, gives crystals. Any season.
const NEW_CROPS = [
  { id: 'flax', name: 'Flax', growthStages: 2, baseGrowTime: 1800, harvestValue: 2, bestSeason: 0,
    desc: 'Quick-growing fiber plant. Harvests fast, yields cloth.' },
  { id: 'pomegranate', name: 'Pomegranate', growthStages: 5, baseGrowTime: 6000, harvestValue: 5, bestSeason: 2,
    desc: 'Sacred fruit of Proserpina. Slow but immensely valuable.' },
  { id: 'lotus', name: 'Sacred Lotus', growthStages: 3, baseGrowTime: 3600, harvestValue: 3, bestSeason: -1,
    desc: 'Mystical bloom. Grows near water, yields crystals.' },
];

function getNewCropData(cropType) {
  return NEW_CROPS.find(c => c.id === cropType);
}

function isNewCrop(cropType) {
  return NEW_CROPS.some(c => c.id === cropType);
}

// ─── CROP QUALITY SYSTEM ────────────────────────────────────────────────
// Perfect conditions = gold-star crop worth 2x
// Conditions: right season, watered (rain or aqueduct), blessed, companion nearby
function getCropQuality(plot) {
  let score = 0;
  let season = getSeason();
  let cropType = plot.cropType;
  // Season match
  let newCrop = getNewCropData(cropType);
  let seasonalCrop = getSeasonalCropData(cropType);
  if (newCrop && newCrop.bestSeason === season) score += 2;
  else if (seasonalCrop && seasonalCrop.season === season) score += 2;
  else if (season === 0 && cropType === 'grain') score += 1; // grain likes spring
  else if (season === 2 && cropType === 'grape') score += 1; // grapes like autumn
  else if (season === 1 && cropType === 'olive') score += 1; // olives like summer
  // Watered (rain or near aqueduct)
  if (state.weather && state.weather.type === 'rain') score += 1;
  let nearAqueduct = state.buildings && state.buildings.some(b => b.type === 'aqueduct' && dist(b.x, b.y, plot.x, plot.y) < 80);
  if (nearAqueduct) score += 1;
  // Blessed (mutated)
  if (plot.blessed) score += 2;
  // Companion bonus
  let compBonus = getCompanionCropBonus(plot);
  if (compBonus > 0) score += 1;
  // Gold star threshold: 4+ = gold, 2-3 = silver
  if (score >= 4) return 'gold';
  if (score >= 2) return 'silver';
  return 'normal';
}

function getCropQualityMult(quality) {
  if (quality === 'gold') return 2.0;
  if (quality === 'silver') return 1.3;
  return 1.0;
}

// ─── COMPANION CROP BONUSES ─────────────────────────────────────────────
// Lares (companion) boosts herbs and wildflowers — spiritual crops
// Woodcutter boosts olives — trees
// Harvester boosts grain — farming crops
// Centurion boosts grapes — Roman wine tradition
function getCompanionCropBonus(plot) {
  let ct = plot.cropType;
  let bonus = 0;
  // Check if each companion is awake and near the plot
  let pg = state.progression || {};
  let ca = pg.companionsAwakened || {};
  if (ca.lares && state.companion) {
    let d = dist(state.companion.x, state.companion.y, plot.x, plot.y);
    if (d < 100 && (ct === 'herb' || ct === 'wildflower' || ct === 'lotus' || ct === 'frostherb')) bonus += 0.3;
  }
  if (ca.woodcutter && state.woodcutter) {
    let d = dist(state.woodcutter.x, state.woodcutter.y, plot.x, plot.y);
    if (d < 100 && (ct === 'olive' || ct === 'pomegranate')) bonus += 0.3;
  }
  if (ca.harvester && state.harvester) {
    let d = dist(state.harvester.x, state.harvester.y, plot.x, plot.y);
    if (d < 100 && (ct === 'grain' || ct === 'flax')) bonus += 0.3;
  }
  if (ca.centurion && state.centurion) {
    let d = dist(state.centurion.x, state.centurion.y, plot.x, plot.y);
    if (d < 100 && (ct === 'grape' || ct === 'sunfruit')) bonus += 0.3;
  }
  return bonus;
}

// Returns growth speed multiplier for companion proximity
function getCompanionGrowthBonus(plot) {
  let bonus = getCompanionCropBonus(plot);
  return bonus > 0 ? (1 + bonus) : 1; // 30% faster growth when companion matches
}

// ─── NATURALIST CODEX CROP DATA ──────────────────────────────────────────
const NAT_CROP_DATA = {
  grain:      { label: 'Grain',      rarity: 'Common',   desc: 'The backbone of Roman civilization. Plant early, harvest often.' },
  grape:      { label: 'Grapes',     rarity: 'Common',   desc: 'For wine and trade. Romans consider a vineyard a sign of permanence.' },
  olive:      { label: 'Olive',      rarity: 'Common',   desc: 'Oil, light, and life. The sacred tree of Athena grows slowly but yields much.' },
  herb:       { label: 'Herb',       rarity: 'Common',   desc: 'Rosemary and thyme. Useful in cooking, medicine, and ritual.' },
  sunfruit:   { label: 'Sunfruit',   rarity: 'Uncommon', desc: 'A mysterious crop that stores the sun\'s energy in radiant flesh.' },
  frostherb:  { label: 'Frostherb',  rarity: 'Uncommon', desc: 'A northern rarity. Its crystalline leaves shimmer in winter light.' },
  wildflower: { label: 'Wildflower', rarity: 'Uncommon', desc: 'Not eaten, but loved. Brightens the island and lifts morale.' },
  flax:       { label: 'Flax',       rarity: 'Common',   desc: 'Hardy fiber crop. Quick to grow, valued for weaving and trade.' },
  pomegranate:{ label: 'Pomegranate', rarity: 'Rare',    desc: 'Proserpina\'s sacred fruit. Slow-growing but yields enormous value.' },
  lotus:      { label: 'Sacred Lotus', rarity: 'Rare',   desc: 'A mystical flower that blooms near water. Yields crystals when harvested.' },
};

// ─── HARVEST COMBO ───────────────────────────────────────────────────────
function updateHarvestCombo(dt) {
  if (state.harvestCombo.timer > 0) {
    state.harvestCombo.timer -= dt;
    if (state.harvestCombo.timer <= 0) {
      state.harvestCombo.count = 0;
    }
  }
}

function onHarvestCombo(plot, baseYield) {
  let c = state.harvestCombo;
  c.count++;
  c.timer = (state.prophecy && state.prophecy.type === 'combo') ? 180 : 120; // extended window
  if (c.count > c.best) c.best = c.count;
  if (c.count > c.bestEver) c.bestEver = c.count;
  if (c.count > state.codex.bestCombo) state.codex.bestCombo = c.count;

  // Apply crop quality multiplier
  let quality = getCropQuality(plot);
  let qualityMult = getCropQualityMult(quality);

  // Apply companion bonus
  let compBonus = getCompanionCropBonus(plot);

  let tier = min(floor(c.count / 2), 8);
  let bonusPct = [0, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 1.0, 1.2][tier];
  let finalYield = ceil(baseYield * (1 + bonusPct + compBonus) * qualityMult);

  let comboColors = ['#ffffff','#ffffff','#ffeeaa','#ffdd66','#ffcc33','#ffaa00','#ff8800','#ff6600','#ff4400'];
  let sx = w2sX(plot.x), sy = w2sY(plot.y);
  if (c.count >= 2) {
    addFloatingText(sx + 15, sy - 35, 'x' + c.count + '!', comboColors[tier]);
  }

  // Show quality indicator
  if (quality === 'gold') {
    addFloatingText(sx - 15, sy - 45, 'GOLD STAR!', '#ffdd00');
  } else if (quality === 'silver') {
    addFloatingText(sx - 15, sy - 45, 'SILVER', '#cccccc');
  }
  // Show companion bonus
  if (compBonus > 0) {
    addFloatingText(sx + 20, sy - 45, 'Companion +' + floor(compBonus * 100) + '%', '#66ffaa');
  }

  let pCount = min(4 + c.count * 2, 30);
  spawnParticles(plot.x, plot.y, 'harvest', pCount);

  // Tier milestones with escalating rewards
  if (c.count === 4) {
    state.screenFlash = { r: 255, g: 220, b: 100, alpha: 30, timer: 15 };
  }
  if (c.count === 6) {
    state.screenFlash = { r: 255, g: 200, b: 50, alpha: 50, timer: 25 };
    state.seeds = (state.seeds || 0) + 2;
    addFloatingText(width / 2, height * 0.32, 'Combo Bonus: +2 Seeds!', '#88cc44');
  }
  if (c.count === 8) {
    state.screenFlash = { r: 255, g: 200, b: 50, alpha: 60, timer: 30 };
    state.gold = (state.gold || 0) + 10;
    addFloatingText(width / 2, height * 0.32, 'Combo Bonus: +10 Gold!', '#ffcc44');
  }
  if (c.count === 10) {
    addFloatingText(width / 2, height * 0.28, 'HARVEST FRENZY!', '#ffaa00');
    state.screenFlash = { r: 255, g: 180, b: 0, alpha: 80, timer: 45 };
    state.gold = (state.gold || 0) + 25;
    addFloatingText(width / 2, height * 0.34, '+25 Gold!', '#ffcc44');
  }
  if (c.count >= 12) {
    addFloatingText(width / 2, height * 0.28, 'PERFECT HARVEST!', C.solarBright);
    state.screenFlash = { r: 255, g: 220, b: 0, alpha: 100, timer: 60 };
    // Rare seed reward — better odds at higher combos
    let roll = random();
    if (roll < 0.20) { state.grapeSeeds = (state.grapeSeeds || 0) + 1; addFloatingText(width / 2, height * 0.34, '+1 Grape Seed!', '#9040a0'); }
    else if (roll < 0.40) { state.oliveSeeds = (state.oliveSeeds || 0) + 1; addFloatingText(width / 2, height * 0.34, '+1 Olive Seed!', '#607030'); }
    else if (roll < 0.55) { state.crystals = (state.crystals || 0) + 2; addFloatingText(width / 2, height * 0.34, '+2 Crystals!', '#44ffdd'); }
    else { state.seeds = (state.seeds || 0) + 3; addFloatingText(width / 2, height * 0.34, '+3 Seeds!', C.vineLight); }
  }
  return finalYield;
}

// ─── CROP MUTATIONS ──────────────────────────────────────────────────────
function checkCropMutation(plot) {
  if (plot.blessed) return; // already mutated
  let chance = 0.05;
  if (state.weather && state.weather.type === 'rain') chance *= 2;
  if (state.blessing && state.blessing.type === 'luck') chance *= 2;
  if (state.prophecy && state.prophecy.type === 'mutation') chance *= 3;
  let fest = getFestival();
  if (fest && fest.effect.mutation) chance *= fest.effect.mutation;
  if (state.heartRewards && state.heartRewards.includes('golden')) chance *= 1.5;
  // Aqueduct bonus
  let nearAqueduct = state.buildings && state.buildings.some(b => b.type === 'aqueduct' && dist2(b.x, b.y, plot.x, plot.y) < 80);
  if (nearAqueduct) chance *= 1.5;

  if (random() < chance) {
    plot.blessed = true;
    let sx = w2sX(plot.x), sy = w2sY(plot.y);
    addFloatingText(sx, sy - 25, 'Blessed ' + (plot.cropType || 'grain') + '!', '#ffdd00');
    spawnParticles(plot.x, plot.y, 'burst', 10);
  }
}

// ─── FARM ZONE BACKGROUND & FENCE ────────────────────────────────────────
function drawFarmZoneBG() {
  let farmCX = WORLD.islandCX - 340, farmCY = WORLD.islandCY - 5;
  let lvl = state.islandLevel;
  let pw = 38, ph = 28;
  // Calculate grid bounds
  let colStart, cols, rowStart, rows;
  if (lvl === 1)      { cols = 3; rows = 3; colStart = -1; rowStart = -1; }
  else if (lvl === 2) { cols = 4; rows = 3; colStart = -1; rowStart = -1; }
  else if (lvl === 3) { cols = 4; rows = 4; colStart = -1; rowStart = -1; }
  else if (lvl === 4) { cols = 5; rows = 4; colStart = -2; rowStart = -1; }
  else                { cols = 5; rows = 5; colStart = -2; rowStart = -2; }

  let left = farmCX + colStart * pw - 20;
  let right = farmCX + (colStart + cols - 1) * pw + 20;
  let top = farmCY + rowStart * ph - 16;
  let bot = farmCY + (rowStart + rows - 1) * ph + 16;
  let fsx = w2sX(left), fsy = w2sY(top);
  let few = right - left, feh = bot - top;

  noStroke();
  // Tilled earth background — light warm soil
  fill(90, 72, 48, 45);
  rect(fsx - 2, fsy - 2, few + 4, feh + 4, 6);
  fill(100, 82, 55, 60);
  rect(fsx, fsy, few, feh, 4);
  fill(110, 90, 60, 35);
  rect(fsx + 4, fsy + 4, few - 8, feh - 8, 3);

  // ─── Wooden fence around the farm ───
  let pad = 8;
  let fx1 = fsx - pad, fy1 = fsy - pad;
  let fw = few + pad * 2, fh = feh + pad * 2;
  let postSpacing = 24;

  // Gate — road crosses left & right sides at vertical center
  let gateH = 26;
  let gateYC = fsy + feh / 2 + 4;
  let gateY1 = gateYC - gateH / 2;
  let gateY2 = gateYC + gateH / 2;

  // Draw a fence post (vertical, with shadow and cap)
  function fPost(px, py) {
    fill(50, 38, 20, 70);
    rect(px - 2 + 1, py - 6 + 1, 6, 14);
    fill(155, 118, 68);
    rect(px - 2, py - 6, 6, 14);
    // Lighter front face
    fill(172, 138, 82);
    rect(px - 1, py - 5, 4, 5);
    // Cap
    fill(188, 155, 95);
    rect(px - 2, py - 7, 6, 3);
  }

  // Draw horizontal cross-rails between two posts
  function fRails(x1, x2, y) {
    stroke(115, 85, 48);
    strokeWeight(2);
    line(x1, y + 2, x2, y + 2);
    line(x1, y + 7, x2, y + 7);
    // Lighter highlight on top rail
    stroke(140, 110, 65, 120);
    strokeWeight(0.8);
    line(x1, y + 1, x2, y + 1);
    noStroke();
  }

  // ─── TOP fence ───
  fRails(fx1, fx1 + fw, fy1);
  for (let px = fx1; px <= fx1 + fw; px += postSpacing) fPost(px, fy1 + 4);

  // ─── BOTTOM fence ───
  fRails(fx1, fx1 + fw, fy1 + fh - 9);
  for (let px = fx1; px <= fx1 + fw; px += postSpacing) fPost(px, fy1 + fh - 5);

  // ─── LEFT fence — with gate gap ───
  // Section above gate
  if (gateY1 > fy1 + 10) {
    fRails(fx1 - 2, fx1 + 8, fy1);
    // Draw vertical cross-bars between posts (rotated rails for side view)
    for (let py = fy1 + postSpacing; py < gateY1 - 4; py += postSpacing) {
      fPost(fx1 + 3, py);
    }
    // Horizontal connecting bars for left side (above gate)
    stroke(115, 85, 48);
    strokeWeight(2);
    line(fx1 + 1, fy1 + 8, fx1 + 1, gateY1);
    line(fx1 + 6, fy1 + 8, fx1 + 6, gateY1);
    noStroke();
  }
  // Section below gate
  if (gateY2 < fy1 + fh - 10) {
    for (let py = gateY2 + 8; py < fy1 + fh - 8; py += postSpacing) {
      fPost(fx1 + 3, py);
    }
    stroke(115, 85, 48);
    strokeWeight(2);
    line(fx1 + 1, gateY2, fx1 + 1, fy1 + fh - 8);
    line(fx1 + 6, gateY2, fx1 + 6, fy1 + fh - 8);
    noStroke();
  }
  // Left gate posts (bigger, with stone caps)
  noStroke();
  fill(50, 38, 20, 80);
  rect(fx1 - 1, gateY1 - 6, 10, 10, 2);
  rect(fx1 - 1, gateY2 - 2, 10, 10, 2);
  fill(150, 115, 65);
  rect(fx1 - 2, gateY1 - 7, 10, 10, 2);
  rect(fx1 - 2, gateY2 - 3, 10, 10, 2);
  fill(185, 160, 110);
  rect(fx1 - 1, gateY1 - 8, 8, 3, 1);
  rect(fx1 - 1, gateY2 - 4, 8, 3, 1);

  // ─── RIGHT fence — with gate gap ───
  let rx = fx1 + fw - 6;
  if (gateY1 > fy1 + 10) {
    for (let py = fy1 + postSpacing; py < gateY1 - 4; py += postSpacing) {
      fPost(rx + 3, py);
    }
    stroke(115, 85, 48);
    strokeWeight(2);
    line(rx + 1, fy1 + 8, rx + 1, gateY1);
    line(rx + 6, fy1 + 8, rx + 6, gateY1);
    noStroke();
  }
  if (gateY2 < fy1 + fh - 10) {
    for (let py = gateY2 + 8; py < fy1 + fh - 8; py += postSpacing) {
      fPost(rx + 3, py);
    }
    stroke(115, 85, 48);
    strokeWeight(2);
    line(rx + 1, gateY2, rx + 1, fy1 + fh - 8);
    line(rx + 6, gateY2, rx + 6, fy1 + fh - 8);
    noStroke();
  }
  // Right gate posts
  noStroke();
  fill(50, 38, 20, 80);
  rect(rx - 1, gateY1 - 6, 10, 10, 2);
  rect(rx - 1, gateY2 - 2, 10, 10, 2);
  fill(150, 115, 65);
  rect(rx - 2, gateY1 - 7, 10, 10, 2);
  rect(rx - 2, gateY2 - 3, 10, 10, 2);
  fill(185, 160, 110);
  rect(rx - 1, gateY1 - 8, 8, 3, 1);
  rect(rx - 1, gateY2 - 4, 8, 3, 1);
}

// ─── DRAW FARM PLOTS ─────────────────────────────────────────────────────
function drawFarmPlots() {
  state.plots.forEach(p => drawOnePlot(p));
  // Drought wilt particles
  if ((state.daysSinceRain || 0) >= 3 && frameCount % 30 === 0) {
    let activePlots = state.plots.filter(p => p.planted && !p.ripe && p.stage > 0);
    if (activePlots.length > 0) {
      let wp = activePlots[floor(random(activePlots.length))];
      particles.push({
        x: wp.x + random(-4, 4), y: wp.y + random(-4, 4),
        vx: random(-0.2, 0.2), vy: -0.5,
        life: 30, maxLife: 30, type: 'burst', size: 2,
        r: 160, g: 130, b: 80, gravity: 0, world: true,
      });
    }
  }
}
function drawOnePlot(p) {
    let px = w2sX(p.x);
    let py = w2sY(p.y);
    if (px < -40 || px > width + 40 || py < -40 || py > height + 40) return;

    px = floor(px); py = floor(py);
    // Pixel stone border
    noStroke();
    fill(155, 148, 135, 80);
    rect(px - p.w/2 - 3, py - p.h/2 - 2, p.w + 6, p.h + 4);
    // Edge detail
    fill(140, 132, 118, 50);
    rect(px - p.w/2 - 3, py - p.h/2 - 2, p.w + 6, 1);

    // Pixel soil
    fill(p.planted ? color(88, 68, 45) : color(75, 60, 42));
    rect(px - p.w/2, py - p.h/2, p.w, p.h);
    // Furrow lines — pixel-style
    stroke(p.planted ? color(72, 55, 35, 70) : color(58, 45, 30, 50));
    strokeWeight(0.8);
    for (let r = -2; r <= 2; r++) {
      let fy = py + r * (p.h * 0.18);
      line(px - p.w * 0.35, fy, px + p.w * 0.35, fy);
    }
    noStroke();
    // Soil pixel texture — tiny light/dark dots
    if (p.planted) {
      fill(78, 58, 34, 50);
      for (let di = 0; di < 3; di++) {
        rect(px - 6 + di * 6, py - 3 + di * 2, 2, 1);
      }
    }
    // Fertility overlay — depleted soil shows pale/cracked
    if (typeof drawPlotFertilityOverlay === 'function') drawPlotFertilityOverlay(p, px, py);

    if (p.planted) {
      let cropDraw = drawGrainSprite;
      if (p.cropType === 'grape') cropDraw = drawGrapeSprite;
      else if (p.cropType === 'olive') cropDraw = drawOliveSprite;
      else if (p.cropType === 'flax') cropDraw = drawFlaxSprite;
      else if (p.cropType === 'pomegranate') cropDraw = drawPomegranateSprite;
      else if (p.cropType === 'lotus') cropDraw = drawLotusSprite;
      else if (isSeasonalCrop(p.cropType)) cropDraw = (x, y, s) => drawSeasonalCropSprite(x, y, s, p.cropType);

      // Crop bob when player walks through
      let _cropBob = 0;
      if (state.player.moving) {
        let _cdist = dist(state.player.x, state.player.y, p.x, p.y);
        if (_cdist < 18) {
          _cropBob = sin(frameCount * 0.2 + p.x * 0.5) * 2;
        }
      }
      if (_cropBob !== 0) { px += floor(_cropBob); }

      // Blessed crop shimmer
      if (p.blessed) {
        let shimmer = sin(frameCount * 0.08 + p.x) * 0.3 + 0.7;
        fill(255, 220, 80, 40 * shimmer);
        rect(px - 10, py - 1, 20, 2);
        rect(px - 1, py - 10, 2, 20);
        if (frameCount % 30 === 0) spawnParticles(p.x, p.y, 'burst', 2);
      }

      // Companion proximity glow — faint green aura when companion is boosting this plot
      let compB = getCompanionCropBonus(p);
      if (compB > 0) {
        let cGlow = sin(frameCount * 0.04 + p.x * 0.2) * 0.3 + 0.5;
        fill(100, 255, 150, floor(cGlow * 25));
        ellipse(px, py, 28, 20);
      }

      // Crop quality star indicator on ripe crops
      if (p.ripe) {
        let quality = getCropQuality(p);
        let ripePulse = sin(frameCount * 0.06 + p.x * 0.1) * 0.4 + 0.6;
        // Glow color varies by quality
        let glowR = quality === 'gold' ? 255 : quality === 'silver' ? 200 : 255;
        let glowG = quality === 'gold' ? 210 : quality === 'silver' ? 200 : 200;
        let glowB = quality === 'gold' ? 60 : quality === 'silver' ? 200 : 80;
        fill(glowR, glowG, glowB, 15 * ripePulse);
        rect(px - 14, py - 1, 28, 2);
        rect(px - 1, py - 14, 2, 28);
        fill(glowR, glowG, glowB, (p.blessed ? 50 : 30) * ripePulse);
        rect(px - 8, py - 1, 16, 2);
        rect(px - 1, py - 8, 2, 16);
        if (ripePulse > 0.9 && frameCount % 20 < 2) {
          fill(255, 255, 200, 200);
          rect(px + floor(random(-8, 8)), py + floor(random(-8, 4)), 2, 2);
        }
        // Quality star icon above crop
        if (quality === 'gold') {
          fill(255, 220, 40, floor(ripePulse * 200));
          // Tiny pixel star
          rect(px - 1, py - 18, 2, 2);
          rect(px - 2, py - 17, 4, 1);
          rect(px - 1, py - 16, 2, 1);
        } else if (quality === 'silver') {
          fill(200, 200, 210, floor(ripePulse * 150));
          rect(px - 1, py - 17, 2, 1);
          rect(px, py - 16, 1, 1);
        }
        cropDraw(px, py, 1.0);
      } else if (p.stage >= 3) {
        // Stage 3 — almost ripe, fuller look
        cropDraw(px, py, 0.85);
        // Tiny buds appearing
        fill(200, 180, 60, 80);
        rect(px - 2, py - 10, 1, 1);
        rect(px + 2, py - 9, 1, 1);
      } else if (p.stage >= 2) {
        cropDraw(px, py, 0.65);
        // Visible leaves
        fill(70, 110, 35, 100);
        rect(px - 4, py - 4, 2, 1);
        rect(px + 2, py - 5, 2, 1);
      } else if (p.stage >= 1) {
        // Small sprout with distinct shoot
        cropDraw(px, py, 0.35);
        // Root bulge at soil line
        fill(80, 65, 40, 60);
        rect(px - 2, py, 4, 2);
      } else {
        // Stage 0 — seed just planted, tiny bump in soil
        fill(70, 55, 35, 80);
        rect(px - 2, py - 1, 4, 2); // soil mound
        // Tiny green tip emerging
        fill(50, 80, 25);
        rect(px, py - 3, 1, 3);
        fill(65, 95, 30, 180);
        rect(px - 1, py - 4, 3, 1);
        // Moisture dots if watered
        if (state.weather && state.weather.type === 'rain') {
          fill(100, 150, 200, 80);
          rect(px - 3, py + 1, 1, 1);
          rect(px + 3, py, 1, 1);
        }
      }
    }
}

// ─── CROP SPRITES ────────────────────────────────────────────────────────
function drawGrainSprite(x, y, scale) {
  let s = floor(scale * 14);
  let sway = floor(sin(frameCount * 0.025 + x * 0.1) * 2 * scale);
  let stalks = scale > 0.6 ? 5 : 3;
  x = floor(x); y = floor(y);
  noStroke();

  for (let i = 0; i < stalks; i++) {
    let sx = x + floor((i - (stalks - 1) / 2) * 3 * scale);
    let lean = floor((i - (stalks - 1) / 2) * 1.5 * scale + sway);

    // Pixel stalk — vertical rect
    let stalkG = 75 + scale * 85;
    fill(stalkG, stalkG * 0.88, 30 + scale * 18);
    rect(sx + lean, y - s, 1, s + 2);

    // Pixel leaf blade
    if (scale > 0.5 && i % 2 === 0) {
      let leafDir = (i % 3 === 0) ? -1 : 1;
      fill(70 + scale * 50, 90 + scale * 40, 20);
      rect(sx + lean + leafDir * 2, y - floor(s * 0.4), 3 * leafDir, 1);
      rect(sx + lean + leafDir * 3, y - floor(s * 0.4) - 1, 2 * leafDir, 1);
    }

    // Pixel wheat ear — stacked kernel rects
    let headX = sx + lean, headY = y - s;
    let kernels = scale > 0.6 ? 4 : 2;
    for (let k = 0; k < kernels; k++) {
      let ky = headY - k * floor(2.5 * scale);
      let kr = 100 + scale * 140;
      let kg = 90 + scale * 80;
      let kb = 20 + (1 - scale) * 30;
      fill(kr, kg, kb);
      rect(headX - 2, ky, 2, floor(2 * scale));
      rect(headX + 1, ky, 2, floor(2 * scale));
    }

    // Pixel awns (whiskers)
    fill(180 * scale + 60, 150 * scale + 40, 30, 160);
    let topY = headY - kernels * floor(2.5 * scale);
    rect(headX - 1, topY - floor(3 * scale), 1, floor(3 * scale));
    rect(headX + 1, topY - floor(2 * scale), 1, floor(2 * scale));
  }
}

function drawGrapeSprite(x, y, scale) {
  x = floor(x); y = floor(y);
  let s = floor(scale * 12);
  let sway = floor(sin(frameCount * 0.03 + x * 0.1) * 1.5 * scale);
  noStroke();
  // Pixel vine stem
  fill(60, 100, 30);
  rect(x, y - s, 1, s + 2);
  // Pixel grape cluster
  let gx = x + sway, gy = y - s;
  let r = floor(90 + scale * 85), g = floor(22 + scale * 22), b = floor(110 + scale * 55);
  fill(r, g, b, 200);
  rect(gx - 3, gy, 6, 2);      // top row (3)
  rect(gx - 2, gy + 2, 4, 2);  // mid row (2)
  rect(gx - 1, gy + 4, 2, 2);  // bottom (1)
  // Highlight
  fill(r + 30, g + 20, b + 20, 80);
  rect(gx - 2, gy, 1, 1);
  // Pixel leaf
  fill(60, 110, 30);
  rect(gx - 5, gy - 2, 4, 2);
}

function drawOliveSprite(x, y, scale) {
  x = floor(x); y = floor(y);
  let s = floor(scale * 14);
  let sway = floor(sin(frameCount * 0.025 + x * 0.12) * 1 * scale);
  noStroke();
  // Pixel stem
  fill(80, 100, 40);
  rect(x + sway, y - s, 1, s + 2);
  // Pixel branch leaves
  fill(70 + scale * 40, 100 + scale * 30, 30);
  rect(x + sway - 4, y - floor(s * 0.3), 4, 2);
  rect(x + sway + 1, y - floor(s * 0.5), 4, 2);
  rect(x + sway - 3, y - floor(s * 0.7), 4, 2);
  // Pixel olives
  let r = floor(40 + scale * 60), g = floor(60 + scale * 50), b = floor(20 + scale * 10);
  fill(r, g, b);
  rect(x + sway - 3, y - floor(s * 0.6), 3, 3);
  rect(x + sway + 1, y - floor(s * 0.5), 3, 3);
  if (scale > 0.6) rect(x + sway - 1, y - floor(s * 0.75), 2, 2);
  // Pixel shine
  fill(r + 40, g + 30, 40, 80);
  rect(x + sway - 3, y - floor(s * 0.6), 1, 1);
}

function drawSeasonalCropSprite(x, y, scale, type) {
  x = floor(x); y = floor(y);
  let s = floor(scale * 14);
  let sway = floor(sin(frameCount * 0.03 + x * 0.1) * 1.5 * scale);
  noStroke();

  if (type === 'wildflower') {
    // Pixel stem
    fill(60, 100, 40);
    rect(x, y - s, 1, s + 2);
    // Pixel leaves
    fill(70, 120, 40);
    rect(x - 3, y - floor(s * 0.3), 3, 2);
    rect(x + 1, y - floor(s * 0.5), 3, 2);
    // Pixel flower — 5 petals as cross + corners
    let fx = x + sway, fy = y - floor(s * 0.8);
    fill(255, 120 + floor(scale * 80), 180, 200);
    rect(fx - 3, fy - 1, 6, 2);  // horizontal
    rect(fx - 1, fy - 3, 2, 6);  // vertical
    rect(fx - 2, fy - 2, 1, 1);  // corners
    rect(fx + 1, fy - 2, 1, 1);
    rect(fx - 2, fy + 1, 1, 1);
    rect(fx + 1, fy + 1, 1, 1);
    // Center
    fill(255, 220, 60);
    rect(fx - 1, fy - 1, 2, 2);
  } else if (type === 'sunfruit') {
    // Pixel stem
    fill(100, 80, 30);
    rect(x, y - s, 1, s + 2);
    fill(80, 120, 30);
    rect(x - 2, y - floor(s * 0.4), 4, 2);
    // Pixel sun fruit
    let fx = x + sway, fy = y - floor(s * 0.85);
    fill(255, 170, 30);
    rect(fx - 3, fy - 3, 6, 6);
    // Sun rays
    fill(255, 200, 60, 150);
    rect(fx - 1, fy - 5, 2, 2);
    rect(fx - 1, fy + 3, 2, 2);
    rect(fx - 5, fy - 1, 2, 2);
    rect(fx + 3, fy - 1, 2, 2);
  } else if (type === 'pumpkin') {
    // Pixel vine
    fill(50, 90, 30);
    rect(x, y - floor(s * 0.6), 1, floor(s * 0.6) + 2);
    fill(60, 100, 30);
    rect(x - 2, y - floor(s * 0.35), 4, 2);
    // Pixel pumpkin body
    let px2 = x + floor(sway * 0.5), py2 = y - floor(s * 0.15);
    fill(220, 120, 30);
    rect(px2 - 4, py2 - 3, 8, 6);
    fill(200, 100, 20);
    rect(px2 - 4, py2 - 2, 2, 4);
    rect(px2 + 2, py2 - 2, 2, 4);
    // Stem
    fill(80, 100, 30);
    rect(px2, py2 - 5, 2, 2);
  } else if (type === 'frostherb') {
    // Pixel icy stem
    fill(100, 180, 220);
    rect(x, y - s, 1, s + 2);
    // Pixel crystal leaves
    fill(140, 200, 240, 180);
    rect(x - 3, y - floor(s * 0.2), 3, 2);
    rect(x + 1, y - floor(s * 0.42), 3, 2);
    rect(x - 3, y - floor(s * 0.64), 3, 2);
    // Frost sparkle pixel
    if (frameCount % 30 < 10) {
      fill(200, 230, 255, 200);
      rect(x + sway - 1, y - floor(s * 0.8), 2, 2);
    }
  }
}

// ─── NEW CROP SPRITES ────────────────────────────────────────────────────
function drawFlaxSprite(x, y, scale) {
  x = floor(x); y = floor(y);
  let s = floor(scale * 12);
  let sway = floor(sin(frameCount * 0.035 + x * 0.12) * 2 * scale);
  noStroke();
  // Thin stalks — flax grows in clusters
  let stalks = scale > 0.5 ? 4 : 2;
  for (let i = 0; i < stalks; i++) {
    let sx2 = x + floor((i - (stalks - 1) / 2) * 2.5 * scale);
    let lean = floor((i - (stalks - 1) / 2) * scale + sway);
    // Pale green stalk
    fill(100, 140, 60);
    rect(sx2 + lean, y - s, 1, s + 1);
    // Tiny blue flower at top
    if (scale > 0.6) {
      fill(100, 140, 220);
      rect(sx2 + lean - 1, y - s - 2, 3, 2);
      // White center dot
      fill(220, 230, 240);
      rect(sx2 + lean, y - s - 1, 1, 1);
    } else if (scale > 0.3) {
      // Bud
      fill(80, 120, 180, 180);
      rect(sx2 + lean, y - s - 1, 1, 1);
    }
  }
}

function drawPomegranateSprite(x, y, scale) {
  x = floor(x); y = floor(y);
  let s = floor(scale * 16); // taller than most crops
  let sway = floor(sin(frameCount * 0.02 + x * 0.08) * 1.5 * scale);
  noStroke();
  // Woody stem — thicker
  fill(90, 65, 35);
  rect(x + sway, y - s, 2, s + 2);
  // Branches at stages 3+
  if (scale > 0.5) {
    fill(80, 60, 30);
    rect(x + sway - 4, y - floor(s * 0.5), 4, 1);
    rect(x + sway + 2, y - floor(s * 0.65), 4, 1);
  }
  // Leaves — dark green, more at higher stages
  fill(50, 90, 30);
  rect(x + sway - 3, y - floor(s * 0.4), 3, 2);
  rect(x + sway + 1, y - floor(s * 0.6), 3, 2);
  if (scale > 0.6) {
    rect(x + sway - 4, y - floor(s * 0.7), 3, 2);
    rect(x + sway + 2, y - floor(s * 0.3), 2, 2);
  }
  // Fruit — deep red, visible at scale > 0.7
  if (scale > 0.7) {
    let fx = x + sway - 1, fy = y - floor(s * 0.55);
    fill(180, 30, 30);
    rect(fx - 2, fy - 2, 5, 5);
    // Crown detail on top
    fill(140, 100, 40);
    rect(fx - 1, fy - 3, 3, 1);
    rect(fx, fy - 4, 1, 1);
    // Highlight
    fill(220, 60, 50, 80);
    rect(fx - 1, fy - 1, 2, 2);
  }
  if (scale > 0.85) {
    // Second fruit
    let fx2 = x + sway + 2, fy2 = y - floor(s * 0.35);
    fill(170, 25, 25);
    rect(fx2 - 2, fy2 - 2, 4, 4);
    fill(130, 90, 35);
    rect(fx2 - 1, fy2 - 3, 2, 1);
  }
}

function drawLotusSprite(x, y, scale) {
  x = floor(x); y = floor(y);
  let s = floor(scale * 13);
  let sway = floor(sin(frameCount * 0.025 + x * 0.15) * 1.5 * scale);
  noStroke();
  // Stem — pale green, curves
  fill(80, 140, 90);
  rect(x, y - s, 1, s + 1);
  // Lily pad base
  fill(50, 120, 60, 150);
  ellipse(x, y + 1, 10 * scale, 4 * scale);
  // Large flower at top — pink/white petals in layers
  if (scale > 0.5) {
    let fx = x + sway, fy = y - s;
    // Outer petals — pink
    fill(240, 150, 180);
    rect(fx - 4, fy - 1, 8, 2);
    rect(fx - 1, fy - 4, 2, 8);
    // Diagonal petals
    rect(fx - 3, fy - 3, 2, 2);
    rect(fx + 1, fy - 3, 2, 2);
    rect(fx - 3, fy + 1, 2, 2);
    rect(fx + 1, fy + 1, 2, 2);
    // Inner petals — lighter
    if (scale > 0.7) {
      fill(250, 200, 220);
      rect(fx - 2, fy - 2, 4, 4);
    }
    // Sacred golden center
    fill(255, 220, 60);
    rect(fx - 1, fy - 1, 2, 2);
    // Mystical sparkle
    if (scale > 0.8 && frameCount % 20 < 8) {
      fill(200, 180, 255, 150);
      rect(fx + floor(sin(frameCount * 0.1) * 3), fy - 5, 1, 1);
    }
  }
}

// ─── HARVEST BURST PARTICLES ─────────────────────────────────────────────
function spawnHarvestBurst(wx, wy, cropType) {
  // Golden particle fountain — the Ceres offering
  let baseR = 255, baseG = 200, baseB = 50;
  if (cropType === 'grape') { baseR = 140; baseG = 60; baseB = 160; }
  else if (cropType === 'olive') { baseR = 120; baseG = 160; baseB = 40; }
  else if (cropType === 'flax') { baseR = 100; baseG = 150; baseB = 220; }
  else if (cropType === 'pomegranate') { baseR = 200; baseG = 40; baseB = 40; }
  else if (cropType === 'lotus') { baseR = 240; baseG = 160; baseB = 200; }
  for (let i = 0; i < 12; i++) {
    let angle = random(TWO_PI);
    let speed = random(1.5, 4);
    particles.push({
      x: wx + random(-4, 4), y: wy + random(-4, 4),
      vx: cos(angle) * speed * 0.6,
      vy: sin(angle) * speed - 2.5, // bias upward
      life: random(35, 65), maxLife: 65,
      type: 'harvest_burst', size: random(2, 5),
      r: baseR + random(-20, 20), g: baseG + random(-20, 20), b: baseB,
      gravity: 0.06, world: true, loot: true,
    });
  }
  // Central golden flash ring
  particles.push({
    x: wx, y: wy, vx: 0, vy: 0,
    life: 20, maxLife: 20,
    type: 'pulse_ring', size: 5,
    r: 255, g: 220, b: 80,
    growRate: 2.5, world: true,
  });
}

// ─── FARM BOUNDS & GRID ──────────────────────────────────────────────────
function getFarmBounds() {
  let farmCX = WORLD.islandCX - 340, farmCY = WORLD.islandCY - 5;
  // Grid grows: base 3x3 (38x28 spacing), expands per level
  let cols = 3 + (state.islandLevel >= 2 ? 1 : 0) + (state.islandLevel >= 4 ? 1 : 0);
  let rows = 3 + (state.islandLevel >= 3 ? 1 : 0) + (state.islandLevel >= 5 ? 1 : 0);
  let farmW = cols * 20 + 20;
  let farmH = rows * 15 + 15;
  return { x: farmCX, y: farmCY, hw: farmW, hh: farmH };
}

function isInFarmZone(x, y) {
  let f = getFarmBounds();
  return abs(x - f.x) < f.hw && abs(y - f.y) < f.hh;
}

// Rebuild the entire farm grid for a given level, preserving planted state
function rebuildFarmGrid(lvl) {
  let farmCX = WORLD.islandCX - 340, farmCY = WORLD.islandCY - 5;
  let pw = 38, ph = 28;
  // Grid dimensions per level
  let cols, rows, colStart, rowStart;
  if (lvl === 1)      { cols = 3; rows = 3; colStart = -1; rowStart = -1; }
  else if (lvl === 2) { cols = 4; rows = 3; colStart = -1; rowStart = -1; }
  else if (lvl === 3) { cols = 4; rows = 4; colStart = -1; rowStart = -1; }
  else if (lvl === 4) { cols = 5; rows = 4; colStart = -2; rowStart = -1; }
  else                { cols = 5; rows = 5; colStart = -2; rowStart = -2; }

  // Build position map of existing plots to preserve planted state
  let existing = {};
  if (state.plots) {
    state.plots.forEach(p => {
      let key = Math.round(p.x) + ',' + Math.round(p.y);
      existing[key] = p;
    });
  }

  let newPlots = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let px = farmCX + (colStart + col) * pw;
      let py = farmCY + (rowStart + row) * ph;
      // Check if we already had a plot near this position
      let key = Math.round(px) + ',' + Math.round(py);
      let old = existing[key];
      if (old) {
        newPlots.push(old);
      } else {
        // Try to find nearby existing plot (within 5px)
        let found = null;
        for (let ep of (state.plots || [])) {
          if (Math.abs(ep.x - px) < 5 && Math.abs(ep.y - py) < 5) { found = ep; break; }
        }
        if (found) {
          newPlots.push(found);
        } else {
          newPlots.push({
            x: px, y: py, w: 32, h: 22,
            planted: false, stage: 0, timer: 0,
            glowing: false, ripe: false,
          });
        }
      }
    }
  }
  state.plots = newPlots;
}

// Legacy wrapper — expansion calls this
function addFarmPlots(farmCX, farmCY, lvl) {
  rebuildFarmGrid(lvl);
}

// ─── CROP ROTATION & SOIL FERTILITY ─────────────────────────────────────
// Each plot tracks fertility (0-100) and crop history. Rotating crops maintains soil health.
const ROTATION_CROPS = ['grain', 'olive', 'grape', 'flax', 'pomegranate', 'lotus'];

function ensurePlotFertility(p) {
  if (p.fertility === undefined) p.fertility = 100;
  if (!p.lastCrop) p.lastCrop = null;
  if (!p.cropHistory) p.cropHistory = [];
  if (!p.lastHarvestDay) p.lastHarvestDay = 0;
}

function getFertilityGrowthMult(p) {
  ensurePlotFertility(p);
  if (p.fertility <= 0) return 0; // crops wither at 0
  return p.fertility / 100;
}

function getFertilityColor(p) {
  ensurePlotFertility(p);
  if (p.fertility >= 80) return { r: 88, g: 68, b: 45 };    // rich dark brown
  if (p.fertility >= 40) return { r: 110, g: 90, b: 60 };   // medium brown
  return { r: 160, g: 140, b: 110 };                         // pale sandy
}

function onPlotHarvest(p) {
  ensurePlotFertility(p);
  let cropType = p.cropType || 'grain';
  let sameCrop = (p.lastCrop === cropType);
  p.fertility = max(0, p.fertility - (sameCrop ? 15 : 5));
  // Check rotation bonus: 3 different crops in sequence
  if (!p.cropHistory) p.cropHistory = [];
  p.cropHistory.push(cropType);
  if (p.cropHistory.length > 3) p.cropHistory.shift();
  let rotationBonus = false;
  if (p.cropHistory.length >= 3) {
    let unique = new Set(p.cropHistory);
    if (unique.size >= 3 && p.cropHistory.every(c => ROTATION_CROPS.includes(c))) {
      p.fertility = min(100, p.fertility + 10);
      rotationBonus = true;
    }
  }
  p.lastCrop = cropType;
  p.lastHarvestDay = state.day;
  return rotationBonus;
}

function onPlotPlant(p, cropType) {
  ensurePlotFertility(p);
  // Fallow bonus: plot was empty for 1+ days since last harvest
  if (p.lastHarvestDay > 0 && (state.day - p.lastHarvestDay) >= 1 && !p.planted) {
    p.fertility = min(100, p.fertility + 20);
    addFloatingText(w2sX(p.x), w2sY(p.y) - 45, 'Fallow Bonus! +20', '#88cc44');
  }
  let sx = w2sX(p.x), sy = w2sY(p.y);
  addFloatingText(sx, sy - 55, 'Fertility: ' + floor(p.fertility) + '%', p.fertility >= 80 ? '#88cc44' : p.fertility >= 40 ? '#ccaa44' : '#cc4444');
}

function updateFallowRecovery(dt) {
  // Empty plots recover +10 fertility per day (called from daily tick)
  state.plots.forEach(p => {
    ensurePlotFertility(p);
    if (!p.planted) p.fertility = min(100, p.fertility + 10);
  });
}

function drawPlotFertilityOverlay(p, px, py) {
  ensurePlotFertility(p);
  if (p.fertility >= 80) return; // no overlay needed for healthy soil
  // Depleted soil: pale overlay + crack pattern
  let fc = getFertilityColor(p);
  if (p.fertility < 40) {
    fill(fc.r, fc.g, fc.b, 60);
    rect(px - p.w / 2, py - p.h / 2, p.w, p.h);
    // Crack lines
    stroke(fc.r + 20, fc.g + 10, fc.b, 80);
    strokeWeight(0.6);
    line(px - 6, py - 3, px + 4, py + 2);
    line(px + 2, py - 4, px - 3, py + 3);
    noStroke();
  } else {
    fill(fc.r, fc.g, fc.b, 30);
    rect(px - p.w / 2, py - p.h / 2, p.w, p.h);
  }
}

// ─── HARVESTER NPC ───────────────────────────────────────────────────────
function updateHarvester(dt) {
  if (!state.harvester) return;
  let h = state.harvester;
  let origHSpeed = h.speed;
  if (state.blessing.type === 'speed') h.speed *= 2;
  h.pulsePhase += 0.03;

  if (h.task === 'idle') {
    // Look for ripe crops
    let ripePlot = state.plots.find(p => p.ripe && p.planted);
    if (ripePlot) {
      h.task = 'walking_to_crop';
      h.taskTarget = ripePlot;
    } else {
      // Wander near farm
      h.timer -= dt;
      if (h.timer <= 0) {
        let farmCX = WORLD.islandCX - 340, farmCY = WORLD.islandCY - 5;
        h.vx = random(-0.5, 0.5);
        h.vy = random(-0.3, 0.3);
        h.timer = random(60, 120);
        // Keep near farm
        if (abs(h.x - farmCX) > 80) h.vx = (farmCX - h.x) * 0.01;
        if (abs(h.y - farmCY) > 50) h.vy = (farmCY - h.y) * 0.01;
      }
      h.x += h.vx * dt;
      h.y += h.vy * dt;
    }
  } else if (h.task === 'walking_to_crop') {
    let t = h.taskTarget;
    if (!t || !t.ripe) { h.task = 'idle'; h.taskTarget = null; return; }
    let dx = t.x - h.x, dy = t.y - h.y;
    let d = sqrt(dx * dx + dy * dy);
    if (d < 12) {
      h.task = 'harvesting';
      h.timer = 40;
    } else {
      h.x += (dx / d) * h.speed * dt;
      h.y += (dy / d) * h.speed * dt;
    }
  } else if (h.task === 'harvesting') {
    h.timer -= dt;
    if (h.timer <= 0) {
      // Harvest the crop
      let t = h.taskTarget;
      if (t && t.ripe) {
        t.planted = false; t.ripe = false; t.stage = 0; t.timer = 0; t.glowing = false;
        h.carryItem = 'grain';
        h.carryCount += 1;
        state.harvest += 1;
        let seedH = 1 + (random() < 0.5 ? 1 : 0);
        state.seeds += seedH;
        checkQuestProgress('harvest', 1);
        spawnParticles(h.x, h.y, 'build', 4);
      }
      // Find a chest to deliver to
      let chest = state.buildings.find(b => b.type === 'chest');
      if (chest && h.carryCount >= 2) {
        h.task = 'walking_to_chest';
        h.taskTarget = chest;
      } else {
        // Keep harvesting or idle
        h.task = 'idle';
        h.taskTarget = null;
      }
    }
  } else if (h.task === 'walking_to_chest') {
    let t = h.taskTarget;
    if (!t) { h.task = 'idle'; h.taskTarget = null; return; }
    let dx = t.x - h.x, dy = t.y - h.y;
    let d = sqrt(dx * dx + dy * dy);
    if (d < 15) {
      h.task = 'depositing';
      h.timer = 25;
    } else {
      h.x += (dx / d) * h.speed * dt;
      h.y += (dy / d) * h.speed * dt;
    }
  } else if (h.task === 'depositing') {
    h.timer -= dt;
    if (h.timer <= 0) {
      // Deposit items
      state.gold += h.carryCount;
      addFloatingText(w2sX(h.x), w2sY(h.y) - 20, '+' + h.carryCount + ' gold', C.solarGold);
      h.carryItem = null;
      h.carryCount = 0;
      h.task = 'idle';
      h.taskTarget = null;
      spawnParticles(h.x, h.y, 'build', 3);
    }
  }
  h.speed = origHSpeed;
}

function drawHarvester(h_unused) {
  let h = state.harvester;
  if (!h) return;
  let sx = w2sX(h.x), sy = w2sY(h.y);
  let bob = floor(sin(frameCount * 0.05) * 1);
  let breath = sin(frameCount * 0.04 + 3) * 0.5;

  push();
  translate(floor(sx), floor(sy + bob));
  noStroke();

  // Shadow
  fill(0, 0, 0, 35);
  rect(-8, 13, 16, 2);

  // Bare feet — calloused
  fill(160, 120, 80);
  rect(-4, 11, 3, 2);
  rect(1, 11, 3, 2);
  // Toe detail
  fill(150, 110, 70);
  rect(-3, 11, 1, 1);
  rect(2, 11, 1, 1);

  // Legs
  fill(170, 130, 90);
  rect(-4, 4, 3, 8);
  rect(1, 4, 3, 8);

  // Warm brown tunic
  fill(145, 105, 65);
  rect(-7, -2, 14, 8);
  // Lighter linen apron
  fill(180, 160, 110);
  rect(-5, 1, 10, 7);
  // Apron stitch detail
  fill(165, 145, 95);
  rect(-4, 3, 8, 1);
  // Rope belt
  fill(120, 90, 50);
  rect(-7, 0, 14, 1);
  // Belt knot
  fill(130, 100, 55);
  rect(-3, 0, 2, 2);

  // Arms — sun-tanned
  fill(170, 130, 90);
  let armSwing = h.task === 'harvesting' ? floor(sin(frameCount * 0.15) * 2) : 0;
  rect(-9, 0 + armSwing, 2, 7);
  rect(7, 0 - armSwing, 2, 7);

  // Woven basket on back when carrying
  if (h.carryItem) {
    fill(140, 110, 60);
    rect(-8, -2, 3, 8);
    fill(130, 100, 50);
    rect(-8, -2, 3, 1);
    rect(-8, 2, 3, 1);
    // Items peeking out
    fill(120, 170, 60);
    rect(-7, -3, 2, 2);
  }

  // Neck
  fill(170, 130, 90);
  rect(-3, -5, 6, 3);

  // Head — warm skin
  fill(175, 138, 98);
  rect(-5, -13, 10, 9);
  // Sun-weathered highlight
  fill(185, 148, 108, 70);
  rect(-4, -12, 4, 4);

  // Straw hat — wide brim
  fill(195, 175, 105);
  rect(-8, -15, 16, 3);
  // Hat crown
  fill(185, 165, 95);
  rect(-5, -18, 10, 3);
  // Hat band — woven detail
  fill(140, 105, 60);
  rect(-5, -15, 10, 1);
  // Hat highlight
  fill(210, 190, 120, 80);
  rect(-3, -17, 4, 1);

  // Eyes — warm brown
  let blinkH = (frameCount % 240 > 234);
  if (blinkH) {
    fill(155, 118, 85);
    rect(-3, -10, 2, 1);
    rect(1, -10, 2, 1);
  } else {
    fill(50, 35, 20);
    rect(-3, -10, 2, 2);
    rect(1, -10, 2, 2);
    fill(80, 55, 35);
    rect(-3, -10, 1, 1);
    rect(1, -10, 1, 1);
  }
  // Kind smile
  fill(140, 100, 70, 100);
  rect(-1, -7, 2, 1);
  // Rosy cheeks
  fill(195, 130, 110, 40);
  rect(-4, -8, 2, 1);
  rect(2, -8, 2, 1);

  // Sickle when harvesting
  if (h.task === 'harvesting') {
    let swing = floor(sin(frameCount * 0.2) * 4);
    fill(90, 70, 35);
    rect(8 + swing, -6, 2, 8);
    fill(150, 150, 160);
    rect(7 + swing, -8, 4, 2);
    fill(170, 170, 180);
    rect(7 + swing, -8, 2, 1);
  }

  // Carry count badge
  if (h.carryItem && h.carryCount > 0) {
    fill(200, 180, 60);
    rect(-2, -22, 4, 4);
    fill(60, 40, 20);
    textSize(9);
    textAlign(CENTER, CENTER);
    text(h.carryCount, 0, -20);
    textAlign(LEFT, TOP);
  }

  pop();
}

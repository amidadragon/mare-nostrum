// MARE NOSTRUM — Cooking, Weather, Naturalist & Heart Milestones
// ─── COOKING SYSTEM ───────────────────────────────────────────────────────
const RECIPES = [
  { name: 'Meal',       item: 'meals', needs: { harvest: 2, fish: 1 }, hearts: 1, desc: '2 Harvest + 1 Fish → Meal' },
  { name: 'Wine',       item: 'wine',  needs: { harvest: 3, grapeSeeds: 1 }, hearts: 2, desc: '3 Harvest + 1 Grape → Wine' },
  { name: 'Olive Oil',  item: 'oil',   needs: { harvest: 2, oliveSeeds: 1 }, hearts: 2, desc: '2 Harvest + 1 Olive → Oil' },
  { name: 'Feast',      item: 'meals', qty: 3, needs: { harvest: 5, fish: 2, wood: 3 }, hearts: 3, desc: '5 Harvest + 2 Fish + 3 Wood → Grand Feast (3)' },
  { name: 'Stew',       item: 'stew', needs: { harvest: 2, fish: 1, wood: 2 }, hearts: 1, desc: '2 Harvest + 1 Fish + 2 Wood → Stew (heals 30 HP)' },
  { name: 'Garum',      item: 'garum', needs: { fish: 3 }, hearts: 1, desc: '3 Fish → Garum (trade: 25g)' },
  { name: 'Honeyed Figs', item: 'honeyedFigs', needs: { exoticSpices: 1, harvest: 2 }, hearts: 2, desc: '1 Spice + 2 Harvest → Honeyed Figs (+15% XP)' },
  { name: 'Ambrosia',   item: 'ambrosia', needs: { soulEssence: 2, wine: 1, crystals: 1 }, hearts: 3, desc: '2 Essence + 1 Wine + 1 Crystal → Ambrosia (full heal)' },
];

function canCook(recipe) {
  for (let [res, amt] of Object.entries(recipe.needs)) {
    if ((state[res] || 0) < amt) return false;
  }
  return true;
}

function cookRecipe(recipe) {
  if (!canCook(recipe)) return false;
  for (let [res, amt] of Object.entries(recipe.needs)) {
    state[res] -= amt;
  }
  let qty = recipe.qty || 1;
  state[recipe.item] = (state[recipe.item] || 0) + qty;
  state.dailyActivities.cooked += qty;
  if (typeof trackStat === 'function') trackStat('mealsCooked', qty);
  return true;
}

function updateCooking(dt) {
  let c = state.cooking;
  if (!c.active) return;
  c.timer -= dt;
  if (c.timer <= 0) {
    c.active = false;
    let recipe = RECIPES.find(r => r.name === c.recipe);
    if (recipe) {
      let qty = recipe.qty || 1;
      if (snd) snd.playSFX('ding');
      addFloatingText(width / 2, height * 0.35, '+' + qty + ' ' + recipe.name + '!', C.solarBright);
      spawnParticles(state.player.x, state.player.y, 'harvest', 10);
    }
    c.recipe = null;
  }
}

// Fishing system — see fishing.js

// ─── NATURALIST CODEX DATA ────────────────────────────────────────────────
// NAT_CROP_DATA — see farming.js
const NAT_ENEMY_DATA = {
  wolf:          { label: 'Wolf',          rarity: 'Common',   desc: 'Hungry and bold. The wolf was sacred to Mars -- a complicated omen.' },
  bandit:        { label: 'Bandit',        rarity: 'Common',   desc: 'Desperate men driven to desperation. They covet what you\'ve built.' },
  harpy:         { label: 'Harpy',         rarity: 'Uncommon', desc: 'Winged spirits of the storm. Neither fully mortal nor divine.' },
  secutor:       { label: 'Secutor',       rarity: 'Uncommon', desc: 'A trained gladiator -- shield-bearer who knows every feint.' },
  minotaur:      { label: 'Minotaur',      rarity: 'Rare',     desc: 'The bull-man of legend. Defeating one is the stuff of heroes.' },
  shield_bearer: { label: 'Shield Bearer', rarity: 'Uncommon', desc: 'A disciplined soldier who fights from behind an iron wall.' },
  archer:        { label: 'Archer',        rarity: 'Uncommon', desc: 'Keeps distance and fires without mercy. Close the gap fast.' },
  centurion:     { label: 'Centurion',     rarity: 'Rare',     desc: 'Commands respect even in death. A true officer gone rogue.' },
};
const NAT_RELIC_DATA = {
  bronze_eagle:  { label: 'Bronze Eagle',  rarity: 'Uncommon', desc: 'A legionary\'s standard, lost long ago. Rome\'s symbol endures.' },
  crystal_shard: { label: 'Crystal Shard', rarity: 'Common',   desc: 'A fragment humming with ancient energy, origin unknown.' },
  ancient_coin:  { label: 'Ancient Coin',  rarity: 'Common',   desc: 'A coin from a forgotten era. The face has been worn smooth by time.' },
  roman_helm:    { label: 'Roman Helm',    rarity: 'Rare',     desc: 'A ceremonial helmet, perhaps from a fallen consul. Heavy with history.' },
  sea_amphora:   { label: 'Sea Amphora',   rarity: 'Common',   desc: 'A clay vessel sealed with wax. Whatever it contained is long since gone.' },
};

// ─── WEATHER SYSTEM ──────────────────────────────────────────────────────
function updateWeather(dt) {
  let w = state.weather;
  if (w.timer > 0) {
    w.timer -= dt;
    if (w.timer <= 0) {
      w.type = 'clear';
      w.intensity = 0;
      raindrops.length = 0;
    }
  }
  // Random weather change — check once per minute of game time
  // Day 1: always good weather (no storms ruining the tutorial)
  if (state.day === 1) return;
  if (w.type === 'clear' && frameCount % 600 === 0 && !stormActive) {
    let roll = random();
    let season = getSeason();
    if (roll < 0.08) {
      w.type = 'rain';
      w.timer = random(600, 1800); // 10-30 seconds
      w.intensity = random(0.4, 1.0);
      addFloatingText(width / 2, height * 0.3, 'Rain begins...', '#6699cc');
    } else if (roll < 0.12 && season === 1) {
      w.type = 'heatwave';
      w.timer = random(900, 2400);
      w.intensity = random(0.5, 1.0);
      addFloatingText(width / 2, height * 0.3, 'Heat wave!', '#ff8844');
    } else if (roll < 0.15) {
      w.type = 'fog';
      w.timer = random(600, 1500);
      w.intensity = random(0.3, 0.7);
      addFloatingText(width / 2, height * 0.3, 'Fog rolls in...', '#aabbcc');
    }
  }
}

let raindrops = [];
let _stormWindOffset = 0; // subtle horizontal drift during storms
function drawWeatherEffects() {
  let w = state.weather;

  // Update and draw weather transitions
  if (typeof updateWeatherTransition === 'function') updateWeatherTransition();
  if (typeof drawWeatherTransitionEffects === 'function') drawWeatherTransitionEffects();

  // Storm clearing: thin out remaining raindrops (reduce spawn, let existing fall)
  if (typeof weatherTransition !== 'undefined' && weatherTransition.active && weatherTransition.type === 'storm_out') {
    let fadeT = weatherTransition.progress;
    // Draw remaining raindrops fading out
    if (raindrops.length > 0) {
      let fadedAlpha = 130 * (1 - fadeT);
      stroke(130, 170, 210, fadedAlpha);
      strokeWeight(1.2);
      let _aliveFade = [];
      for (let i = 0; i < raindrops.length; i++) {
        let r = raindrops[i];
        line(r.x, r.y, r.x + (r.wind || -1) * 3, r.y + r.len);
        r.y += r.speed;
        r.x += r.wind || -1;
        if (r.y <= height) _aliveFade.push(r);
      }
      raindrops = _aliveFade;
      noStroke();
    }
    // Spawn a few stragglers early in the transition
    if (fadeT < 0.5 && raindrops.length < floor(100 * (1 - fadeT * 2)) && random() < (1 - fadeT * 2) * 0.5) {
      raindrops.push({
        x: random(-30, width + 30), y: random(-20, -5),
        speed: random(6, 11), len: random(6, 12), wind: random(-1.5, -0.5),
      });
    }
  }

  // Drift storms get full rain + dark overlay even when weather.type isn't 'rain'
  if (stormActive && w.type !== 'rain') {
    _drawStormRain();
    return; // storm visuals override other weather
  }

  if (w.type === 'clear') return;

  if (w.type === 'rain') {
    // Storm darkening overlay — full screen
    noStroke();
    fill(15, 20, 35, 40 * w.intensity);
    rect(0, 0, width, height);
    // Spawn raindrops — more intense, angled (soft cap: stop spawning, let existing fall)
    let spawnRate = floor(w.intensity * 12);
    if (raindrops.length < 300) for (let i = 0; i < spawnRate; i++) {
      raindrops.push({
        x: random(-50, width + 50), y: random(-30, -5),
        speed: random(7, 14) * w.intensity,
        len: random(5, 12),
        wind: random(-1.5, -0.5), // diagonal rain
      });
    }
    // Draw and update raindrops
    stroke(140, 180, 220, 110 * w.intensity);
    strokeWeight(1.2);
    let _aliveDrops = [];
    for (let i = 0; i < raindrops.length; i++) {
      let r = raindrops[i];
      line(r.x, r.y, r.x + (r.wind || -0.5) * 3, r.y + r.len);
      r.y += r.speed;
      r.x += r.wind || -0.5;
      if (r.y > height) {
        // Rain splash on impact — small circle burst
        if (r.y < height * 0.85 && random() < 0.3) {
          noStroke();
          fill(140, 180, 220, 50 * w.intensity);
          circle(r.x, height * 0.75 + random(-20, 20), random(2, 4));
        }
      } else {
        _aliveDrops.push(r);
      }
    }
    raindrops = _aliveDrops;
    noStroke();

    // Ground puddle reflections — subtle wet look
    let puddleAlpha = 15 * w.intensity;
    fill(100, 140, 180, puddleAlpha);
    for (let pi = 0; pi < 6; pi++) {
      let ppx = w2sX(WORLD.islandCX + sin(pi * 1.8) * 180);
      let ppy = w2sY(WORLD.islandCY + cos(pi * 1.3) * 40);
      let shimmer = sin(frameCount * 0.04 + pi) * 0.3 + 0.7;
      ellipse(ppx, ppy, 30 + pi * 8, 8 * shimmer);
    }

    // Darken sky
    fill(15, 25, 45, 35 * w.intensity);
    rect(0, 0, width, height * 0.55);
    // Slight desaturation overlay
    fill(40, 50, 60, 12 * w.intensity);
    rect(0, 0, width, height);

  } else if (w.type === 'heatwave') {
    // Heat shimmer — fewer, larger distortion bands
    noStroke();
    for (let y = height * 0.45; y < height; y += 28) {
      let wave = sin(y * 0.04 + frameCount * 0.06) * 3;
      let wave2 = cos(y * 0.07 + frameCount * 0.04) * 1.5;
      fill(255, 210, 120, 6 * w.intensity);
      rect(wave + wave2, y, width, 18);
    }
    // Sun intensifier with rays
    let heatPulse = sin(frameCount * 0.03) * 0.2 + 0.8;
    fill(255, 200, 80, 18 * w.intensity * heatPulse);
    circle(width * 0.5, height * 0.08, 250);
    fill(255, 180, 60, 10 * w.intensity * heatPulse);
    circle(width * 0.5, height * 0.08, 350);
    // Warm overlay
    fill(255, 180, 80, 8 * w.intensity);
    rect(0, 0, width, height);

  } else if (w.type === 'fog') {
    // Static fog banks — pixel rect layers, fixed positions
    noStroke();
    let fogAlpha = floor(35 * w.intensity);
    // Layer 1-5: stacked horizontal fog bands at fixed screen positions
    for (let i = 0; i < 6; i++) {
      let fx = floor(width * (0.1 + i * 0.15));
      let fy = floor(height * 0.25 + i * 35);
      let fw = floor(250 + i * 50);
      let fh = floor(20 + i * 6);
      fill(200, 210, 220, fogAlpha);
      rect(fx - fw / 2, fy, fw, fh);
      // Softer edge rects
      fill(200, 210, 220, floor(fogAlpha * 0.5));
      rect(fx - fw / 2 - 30, fy + 2, 30, fh - 4);
      rect(fx + fw / 2, fy + 2, 30, fh - 4);
    }
    // Overall fog tint
    fill(180, 190, 200, floor(20 * w.intensity));
    rect(0, 0, width, height);
  }
}

// ─── DRIFT STORM RAIN ──────────────────────────────────────────────────
function _drawStormRain() {
  let stormRamp = 1;
  if (typeof weatherTransition !== 'undefined' && weatherTransition.active && weatherTransition.type === 'storm_in') {
    stormRamp = weatherTransition.progress;
  }
  let intensity = 0.95 * stormRamp;
  noStroke();

  // Dark gray-blue sky overlay — heavier than normal rain
  fill(12, 16, 28, 70 * stormRamp);
  rect(0, 0, width, height);
  // Extra sky darkening
  fill(10, 18, 35, 50 * stormRamp);
  rect(0, 0, width, height * 0.55);

  // Subtle wind wobble — horizontal offset that oscillates
  _stormWindOffset = sin(frameCount * 0.015) * 2.5 * stormRamp + cos(frameCount * 0.037) * 1.2 * stormRamp;

  // Spawn heavy raindrops — ramp up during transition
  let spawnCount = floor(18 * max(0.05, stormRamp));
  let dropCap = floor(500 * max(0.1, stormRamp));
  if (raindrops.length < dropCap) for (let i = 0; i < spawnCount; i++) {
    raindrops.push({
      x: random(-80, width + 80), y: random(-40, -5),
      speed: random(10, 18),
      len: random(8, 16),
      wind: random(-2.5, -1.2), // steeper diagonal in storms
    });
  }

  // Draw and update raindrops
  stroke(130, 170, 210, 130);
  strokeWeight(1.5);
  let _aliveStorm = [];
  for (let i = 0; i < raindrops.length; i++) {
    let r = raindrops[i];
    let wx = r.wind || -1.5;
    line(r.x, r.y, r.x + wx * 4, r.y + r.len);
    r.y += r.speed;
    r.x += wx;
    if (r.y > height) {
      // Splash
      if (r.y < height * 0.85 && random() < 0.35) {
        noStroke();
        fill(130, 170, 210, 55);
        circle(r.x, height * 0.75 + random(-20, 20), random(2, 5));
        stroke(130, 170, 210, 130);
        strokeWeight(1.5);
      }
    } else {
      _aliveStorm.push(r);
    }
  }
  raindrops = _aliveStorm;
  noStroke();

  // Ground puddle reflections
  fill(90, 130, 170, 18);
  for (let pi = 0; pi < 6; pi++) {
    let ppx = w2sX(WORLD.islandCX + sin(pi * 1.8) * 180);
    let ppy = w2sY(WORLD.islandCY + cos(pi * 1.3) * 40);
    let shimmer = sin(frameCount * 0.06 + pi) * 0.3 + 0.7;
    ellipse(ppx, ppy, 30 + pi * 8, 8 * shimmer);
  }

  // Desaturation wash
  fill(35, 40, 55, 18);
  rect(0, 0, width, height);

}

// ─── HEART MILESTONES ────────────────────────────────────────────────────
const HEART_MILESTONES = [
  { hearts: 2, reward: 'speed', desc: '+15% movement speed', given: false },
  { hearts: 3, reward: 'seeds', desc: '+2 seeds per harvest', given: false },
  { hearts: 4, reward: 'speed2', desc: '+30% movement speed', given: false },
  { hearts: 5, reward: 'double', desc: 'Double harvest yield', given: false },
  { hearts: 7, reward: 'recipe', desc: 'Unlocked: Grand Feast recipe', given: false },
  { hearts: 8, reward: 'companion', desc: 'Companion range doubled', given: false },
  { hearts: 10, reward: 'golden', desc: 'Golden Touch — all yields x2!', given: false },
];

function checkHeartMilestones(newHearts) {
  HEART_MILESTONES.forEach(m => {
    if (newHearts >= m.hearts && !state.heartRewards.includes(m.reward)) {
      state.heartRewards.push(m.reward);
      addFloatingText(w2sX(state.npc.x), w2sY(state.npc.y) - 55, m.desc, C.solarBright);
      spawnParticles(state.npc.x, state.npc.y, 'burst', 15);
      // Golden sparkle ring milestone effect
      for (let i = 0; i < 12; i++) {
        let a = (i / 12) * TWO_PI;
        particles.push({
          x: state.npc.x + cos(a) * 15, y: state.npc.y + sin(a) * 10,
          vx: cos(a) * 0.8, vy: sin(a) * 0.6 - 0.5,
          life: random(25, 40), maxLife: 40,
          type: 'sundust', size: random(2, 3),
          r: 220, g: 195, b: 60, phase: random(TWO_PI), world: true,
        });
      }
    }
  });
}

// Farming system — see farming.js

function drawGameVignette() {
  // Subtle screen-edge darkening for atmosphere
  let bright = getSkyBrightness();
  let vigA = bright > 0.5 ? 12 : lerp(20, 12, bright * 2); // slightly darker at night
  // Combat vignette — darken edges more when enemies are nearby
  if (_juiceCombatVignette > 0) {
    vigA += _juiceCombatVignette * 25;
    _juiceCombatVignette = max(0, _juiceCombatVignette - 0.02);
  }
  noStroke();
  // Top edge
  for (let i = 0; i < 40; i++) { fill(0, 0, 0, vigA * (1 - i / 40)); rect(0, i, width, 1); }
  // Bottom edge
  for (let i = 0; i < 30; i++) { fill(0, 0, 0, vigA * 0.7 * (1 - i / 30)); rect(0, height - i, width, 1); }
  // Side edges
  for (let i = 0; i < 25; i++) { fill(0, 0, 0, vigA * 0.5 * (1 - i / 25)); rect(i, 0, 1, height); rect(width - i, 0, 1, height); }
  // Level-up white flash
  if (_juiceLevelUpFlash > 0) {
    fill(255, 255, 255, _juiceLevelUpFlash * 180);
    rect(0, 0, width, height);
    _juiceLevelUpFlash = max(0, _juiceLevelUpFlash - 0.08);
  }
}

function drawScreenFlash() {
  if (!state.screenFlash) return;
  let f = state.screenFlash;
  fill(f.r, f.g, f.b, f.alpha * (f.timer / 60));
  rect(0, 0, width, height);
  f.timer--;
  if (f.timer <= 0) state.screenFlash = null;
}

function startDoorTransition(callback) {
  _doorTransition = { timer: 0, duration: 18, callback: callback, phase: 'out', doorAngle: 0 };
}

function updateDoorTransition() {
  if (!_doorTransition) return;
  let dt = _doorTransition;
  dt.timer++;
  if (dt.phase === 'out') {
    dt.doorAngle = min(HALF_PI * 0.8, (dt.timer / dt.duration) * HALF_PI * 0.8);
    if (dt.timer >= dt.duration) {
      if (dt.callback) dt.callback();
      dt.phase = 'in';
      dt.timer = 0;
    }
  } else {
    if (dt.timer >= dt.duration) _doorTransition = null;
  }
}

function drawDoorTransition() {
  if (!_doorTransition) return;
  let dt = _doorTransition;
  let t;
  if (dt.phase === 'out') {
    t = dt.timer / dt.duration;
  } else {
    t = 1 - dt.timer / dt.duration;
  }
  // Dim screen
  noStroke();
  fill(0, 0, 0, t * 180);
  rect(0, 0, width, height);
  // Door panels swinging open from center
  let doorW = width * 0.15;
  let doorH = height * 0.6;
  let doorY = height * 0.2;
  let openAmt = dt.phase === 'out' ? t : (1 - t);
  push();
  fill(90, 60, 30);
  stroke(60, 40, 20);
  strokeWeight(2);
  // Left door
  let lx = width / 2 - doorW * openAmt;
  rect(lx - doorW, doorY, doorW, doorH);
  // Right door
  let rx = width / 2 + doorW * openAmt;
  rect(rx, doorY, doorW, doorH);
  // Door handles
  fill(180, 150, 80);
  noStroke();
  ellipse(lx - 6, doorY + doorH / 2, 5, 5);
  ellipse(rx + 6, doorY + doorH / 2, 5, 5);
  pop();
}


// MARE NOSTRUM — Effects, Particles, Juice & Ceremonies

// ─── PARTICLES ────────────────────────────────────────────────────────────
function updateParticles(dt) {
  let bright = getSkyBrightness();

  if (frameCount % 12 === 0) {
    // Spawn near player (visible area)
    let spawnX = state.player.x + random(-width * 0.5, width * 0.5);
    let spawnY = state.player.y + random(-height * 0.4, height * 0.3);

    if (bright > 0.3) {
      particles.push({
        x: spawnX, y: spawnY,
        vx: random(-0.3, 0.3), vy: random(-0.8, -0.2),
        life: random(60, 120), maxLife: 120,
        type: 'mote', size: random(1, 3),
        r: 220, g: 160, b: 40, world: true,
      });
    } else {
      particles.push({
        x: spawnX, y: spawnY,
        vx: random(-0.4, 0.4), vy: random(-0.3, 0.3),
        life: random(80, 160), maxLife: 160,
        type: 'firefly', size: random(2, 4),
        r: 80, g: 255, b: 160, phase: random(TWO_PI), world: true,
      });
    }
  }

  // Butterflies — daytime, near farm (count with early exit instead of full scan)
  let _bflyCount = 0;
  if (bright > 0.4 && frameCount % 45 === 0) {
    for (let i = 0; i < particles.length && _bflyCount < 4; i++) { if (particles[i].type === 'butterfly') _bflyCount++; }
  }
  if (_bflyCount < 3 && bright > 0.4 && frameCount % 60 === 0) {
    let bx = WORLD.islandCX - 340 + random(-100, 100);
    let by = WORLD.islandCY + random(-40, 30);
    particles.push({
      x: bx, y: by,
      vx: random(-0.5, 0.5), vy: random(-0.3, 0.1),
      life: random(200, 400), maxLife: 400,
      type: 'butterfly', size: random(3, 5),
      r: random([200, 220, 180]), g: random([80, 120, 60]), b: random([40, 160, 200]),
      phase: random(TWO_PI), world: true,
    });
  }

  // Sun dust motes — golden sparkles in bright light
  if (bright > 0.6 && frameCount % 20 === 0) {
    let dx = state.player.x + random(-150, 150);
    let dy = state.player.y + random(-100, 80);
    if (isOnIsland(dx, dy)) {
      particles.push({
        x: dx, y: dy,
        vx: random(-0.1, 0.1), vy: random(-0.5, -0.1),
        life: random(40, 80), maxLife: 80,
        type: 'sundust', size: random(1, 2.5),
        r: 255, g: 230, b: 140, world: true,
      });
    }
  }

  // Water ripples when player walks near shore  if (state.player.moving && frameCount % 12 === 0) {    let _rpx = state.player.x, _rpy = state.player.y;    let _rdx = (_rpx - WORLD.islandCX) / getSurfaceRX();    let _rdy = (_rpy - WORLD.islandCY) / getSurfaceRY();    let _rd = _rdx * _rdx + _rdy * _rdy;    if (_rd > 0.85 && _rd <= 1.0) {      let _rea = atan2(_rpy - WORLD.islandCY, _rpx - WORLD.islandCX);      particles.push({        x: _rpx + cos(_rea) * 15, y: _rpy + sin(_rea) * 10,        vx: 0, vy: 0, life: 30, maxLife: 30, type: 'ripple', size: 3,        r: 120, g: 190, b: 230, world: true,      });    }  }  // Extra fireflies at dusk/dawn  let _jHour = (state.time || 720) / 60;  if ((_jHour >= 18 && _jHour <= 20) || (_jHour >= 5 && _jHour <= 6.5)) {    if (frameCount % 8 === 0) {      let _jfx = state.player.x + random(-200, 200);      let _jfy = state.player.y + random(-120, 80);      if (isOnIsland(_jfx, _jfy)) {        particles.push({          x: _jfx, y: _jfy, vx: random(-0.3, 0.3), vy: random(-0.2, 0.2),          life: random(100, 200), maxLife: 200, type: 'firefly', size: random(2, 4),          r: 80, g: 255, b: 160, phase: random(TWO_PI), world: true,        });      }    }  }
  // Storm rain particles (supplemental — main rain is in _drawStormRain)
  if (stormActive && frameCount % 2 === 0) {
    for (let _ri = 0; _ri < 2; _ri++) {
      particles.push({
        x: random(width), y: random(-20, height * 0.3),
        vx: random(-2, -4), vy: random(3, 7),
        life: random(30, 70), maxLife: 70,
        type: 'rain', size: random(1, 2),
        r: 100, g: 160, b: 220, world: false,
      });
    }
  }

  // Hard cap: prevent particle explosion
  if (particles.length > _particleCap) particles.splice(0, particles.length - (_particleCap - 30));

  particles.forEach(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    // Gravity for physics particles
    if (p.gravity) p.vy += p.gravity * dt;
    if (p.type === 'firefly') {
      p.vx += random(-0.05, 0.05);
      p.vy += random(-0.05, 0.05);
    }
    if (p.type === 'butterfly') {
      p.vx += random(-0.08, 0.08);
      p.vy += sin(frameCount * 0.1 + p.phase) * 0.06;
      p.vx = constrain(p.vx, -0.8, 0.8);
      p.vy = constrain(p.vy, -0.5, 0.3);
    }
  });
  // In-place compaction to avoid new array allocation
  let _pw = 0;
  for (let _pr = 0; _pr < particles.length; _pr++) {
    if (particles[_pr].life > 0) { particles[_pw++] = particles[_pr]; }
  }
  particles.length = _pw;
}

function drawParticles() {
  if (_fpsSmooth < 25) return; // skip rendering when FPS critically low
  noStroke();
  for (let _pi = 0; _pi < particles.length; _pi++) { let p = particles[_pi];
    let a = map(p.life, 0, p.maxLife, 0, 1);
    let px = p.world ? w2sX(p.x) : p.x;
    let py = p.world ? w2sY(p.y) : p.y;
    // Cull offscreen particles
    if (px < -50 || px > width + 50 || py < -50 || py > height + 50) continue;

    if (p.type === 'mote') {
      let s = floor(p.size * a);
      fill(p.r, p.g, p.b, 160 * a);
      rect(floor(px) - s, floor(py) - s, s * 2, s * 2);
    } else if (p.type === 'firefly') {
      let flicker = sin(frameCount * 0.2 + p.phase) * 0.5 + 0.5;
      let fpx = floor(px), fpy = floor(py);
      let s = floor(p.size * flicker * a);
      // Cross glow
      fill(p.r, p.g, p.b, 40 * a * flicker);
      rect(fpx - 1, fpy - p.size * 3, 2, p.size * 6);
      rect(fpx - p.size * 3, fpy - 1, p.size * 6, 2);
      // Core pixel
      fill(p.r, p.g, p.b, 200 * a * flicker);
      rect(fpx - s, fpy - s, s * 2, s * 2);
    } else if (p.type === 'dust') {
      fill(p.r, p.g, p.b, 100 * a);
      rect(floor(px), floor(py), max(1, floor(p.size * a)), max(1, floor(p.size * a)));
    } else if (p.type === 'butterfly') {
      let wingFlap = floor(sin(frameCount * 0.3 + p.phase) * 3);
      let fpx = floor(px), fpy = floor(py);
      fill(p.r, p.g, p.b, 200 * a);
      // Left wing — rect pair
      rect(fpx - 4 - wingFlap, fpy - 1, 3, 2);
      rect(fpx - 3 - wingFlap, fpy - 2, 2, 1);
      // Right wing
      rect(fpx + 1 + wingFlap, fpy - 1, 3, 2);
      rect(fpx + 1 + wingFlap, fpy - 2, 2, 1);
      // Body
      fill(40, 30, 20, 200 * a);
      rect(fpx, fpy - 1, 1, 3);
    } else if (p.type === 'sundust') {
      let sparkle = floor(sin(frameCount * 0.15 + p.phase) * 2 + 2);
      fill(p.r, p.g, p.b, 120 * a);
      // Cross sparkle
      let fpx = floor(px), fpy = floor(py);
      rect(fpx, fpy - sparkle, 1, sparkle * 2);
      rect(fpx - sparkle, fpy, sparkle * 2, 1);
    } else if (p.type === 'rain') {
      // Rain stays as line — pixel-perfect already
      fill(p.r, p.g, p.b, 120 * a);
      let len = floor(abs(p.vy) * 3);
      rect(floor(px), floor(py), max(1, floor(p.size)), len);
    } else if (p.type === 'harvest_burst') {
      let fpx = floor(px), fpy = floor(py);
      let s = max(1, floor(p.size * a));
      // Outer pixel glow cross
      fill(p.r, p.g, p.b, 60 * a * 0.4);
      rect(fpx - 1, fpy - s * 2, 2, s * 4);
      rect(fpx - s * 2, fpy - 1, s * 4, 2);
      // Core rect
      fill(p.r, p.g, p.b, 220 * a);
      rect(fpx - s, fpy - s, s * 2, s * 2);
      // Bright center pixel
      fill(255, 255, 220, 255 * a);
      rect(fpx, fpy, 1, 1);
    } else if (p.type === 'pulse_ring') {
      // Expanding pixel ring — 4 rects forming hollow square
      let ringSize = floor((1 - a) * 50 + p.size);
      let fpx = floor(px), fpy = floor(py);
      let thick = max(1, floor(2 * a));
      fill(p.r, p.g, p.b, 180 * a);
      rect(fpx - ringSize, fpy - ringSize, ringSize * 2, thick); // top
      rect(fpx - ringSize, fpy + ringSize, ringSize * 2, thick); // bottom
      rect(fpx - ringSize, fpy - ringSize, thick, ringSize * 2); // left
      rect(fpx + ringSize, fpy - ringSize, thick, ringSize * 2); // right
    } else if (p.type === 'crystal_shard') {
      let fpx = floor(px), fpy = floor(py);
      let s = max(1, floor(p.size * a));
      // Outer glow cross
      fill(p.r, p.g, p.b, 40 * a);
      rect(fpx - 1, fpy - s * 2, 2, s * 4);
      rect(fpx - s * 2, fpy - 1, s * 4, 2);
      // Diamond shape from stacked rects
      fill(p.r, p.g, p.b, 200 * a);
      rect(fpx, fpy - s, 1, 1);           // top
      rect(fpx - 1, fpy - s + 1, 3, 1);   // row 2
      rect(fpx - 1, fpy, 3, 1);           // middle
      rect(fpx - 1, fpy + 1, 3, 1);       // row 4
      rect(fpx, fpy + s, 1, 1);           // bottom
    } else if (p.type === 'wood_chip') {
      let s = max(1, floor(p.size * a));
      fill(p.r, p.g, p.b, 220 * a);
      rect(floor(px) - s, floor(py), s * 2, max(1, floor(p.size * 0.4 * a)));
    } else if (p.type === 'heart') {
      let hs = max(2, floor(p.size * a));
      let fpx = floor(px), fpy = floor(py);
      fill(p.r, p.g, p.b, 220 * a);
      // Pixel heart: top bumps + triangle
      rect(fpx - hs, fpy - hs, hs, hs);         // left bump
      rect(fpx + 1, fpy - hs, hs, hs);           // right bump
      rect(fpx - hs, fpy, hs * 2 + 1, 1);        // middle row
      rect(fpx - hs + 1, fpy + 1, hs * 2 - 1, 1); // taper
      rect(fpx, fpy + 2, 1, 1);                    // bottom point
    } else if (p.type === 'loot_coin') {
      let tumble = floor(sin((p.spin || 0.1) * frameCount) * 2);
      let fpx = floor(px), fpy = floor(py);
      let s = max(1, floor(p.size * a));
      // Cross glow
      fill(p.r, p.g, p.b, 40 * a);
      rect(fpx - 1, fpy - s * 2, 2, s * 4);
      rect(fpx - s * 2, fpy - 1, s * 4, 2);
      // Coin rect (width varies with tumble)
      let cw = max(1, s + tumble);
      fill(p.r, p.g, p.b, 240 * a);
      rect(fpx - floor(cw / 2), fpy - s, cw, s * 2);
      // Shine pixel
      fill(255, 255, 220, 180 * a);
      rect(fpx - floor(cw / 2) + 1, fpy - s + 1, 1, 1);
    } else if (p.type === 'golden_wave') {
      // Expanding pixel ring — hollow square
      let ringSize = floor((1 - a) * (p.maxRing || 200) + p.size);
      let fpx = floor(px), fpy = floor(py);
      let thick = max(1, floor(3 * a + 1));
      let rySize = floor(ringSize * 0.6);
      fill(p.r, p.g, p.b, 200 * a);
      rect(fpx - ringSize, fpy - rySize, ringSize * 2, thick);
      rect(fpx - ringSize, fpy + rySize, ringSize * 2, thick);
      rect(fpx - ringSize, fpy - rySize, thick, rySize * 2);
      rect(fpx + ringSize, fpy - rySize, thick, rySize * 2);
      // Inner ring
      fill(255, 255, 200, 120 * a);
      let inner = floor(ringSize * 0.9);
      let iry = floor(rySize * 0.9);
      rect(fpx - inner, fpy - iry, inner * 2, 1);
      rect(fpx - inner, fpy + iry, inner * 2, 1);
    } else if (p.type === 'divine_beam') {
      let shimmer = sin(frameCount * 0.15 + p.phase) * 0.3 + 0.7;
      let fpx = floor(px), fpy = floor(py);
      let s = max(1, floor(p.size * a));
      // Wide glow column
      fill(p.r, p.g, p.b, 30 * a * shimmer);
      rect(fpx - floor(p.size * 1.5), fpy - floor(p.size * 2), floor(p.size * 3), floor(p.size * 4));
      // Core pixel
      fill(p.r, p.g, p.b, 180 * a * shimmer);
      rect(fpx - s, fpy - s, s * 2, s * 2);
      // Bright center
      fill(255, 255, 240, 220 * a * shimmer);
      rect(fpx, fpy, 1, 1);
    } else if (p.type === 'season_burst') {
      let fpx = floor(px), fpy = floor(py);
      let s = max(1, floor(p.size * a));
      // Outer cross glow
      fill(p.r, p.g, p.b, 50 * a * 0.5);
      rect(fpx - 1, fpy - s * 3, 2, s * 6);
      rect(fpx - s * 3, fpy - 1, s * 6, 2);
      // Core
      fill(p.r, p.g, p.b, 200 * a);
      rect(fpx - s, fpy - s, s * 2, s * 2);
      // Bright center
      fill(255, 255, 255, 160 * a);
      rect(fpx, fpy, 1, 1);
    } else if (p.type === 'splash_drop') {
      let fpx = floor(px), fpy = floor(py);
      let s = max(1, floor(p.size * a));
      fill(p.r, p.g, p.b, 180 * a);
      rect(fpx - s, fpy - s, s * 2, s * 2);
      fill(255, 255, 255, 80 * a);
      rect(fpx, fpy - s, 1, 1);
    } else if (p.type === 'splash_ring') {
      let rad = floor(p.size * (1 - a) + 2);
      let fpx = floor(px), fpy = floor(py);
      fill(p.r, p.g, p.b, 140 * a);
      for (let ang = 0; ang < TWO_PI; ang += 0.4) {
        let rx = floor(cos(ang) * rad), ry = floor(sin(ang) * rad * 0.55);
        rect(fpx + rx, fpy + ry, 2, 1);
      }
    } else {
      let s = max(1, floor(p.size * a));
      fill(p.r, p.g, p.b, 200 * a);
      rect(floor(px) - s, floor(py) - s, s * 2, s * 2);
    }
  }
  noStroke();
}

function spawnParticles(wx, wy, type, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: wx, y: wy,
      vx: random(-2, 2), vy: random(-3, -0.5),
      life: random(25, 50), maxLife: 50,
      type: 'burst',
      r: type === 'harvest' ? 80 : (type === 'chop' ? 140 : (type === 'combat' ? 255 : (type === 'build' ? 0 : 0))),
      g: type === 'harvest' ? 255 : (type === 'chop' ? 100 : (type === 'combat' ? floor(random(80, 160)) : 220)),
      b: type === 'harvest' ? 40 : (type === 'chop' ? 40 : (type === 'combat' ? 40 : (type === 'build' ? 200 : 100))),
      size: random(2, 5),
      world: true,
    });
  }
}

// Farming system — see farming.js

// ─── JUICE: CRYSTAL PULSE ────────────────────────────────────────────────
function spawnCrystalPulse(wx, wy) {
  // Expanding teal ring
  particles.push({
    x: wx, y: wy, vx: 0, vy: 0,
    life: 30, maxLife: 30,
    type: 'pulse_ring', size: 4,
    r: 80, g: 220, b: 200,
    growRate: 2.0, world: true,
  });
  // Crystal shards floating up
  for (let i = 0; i < 5; i++) {
    let angle = (TWO_PI / 5) * i + random(-0.3, 0.3);
    particles.push({
      x: wx, y: wy,
      vx: cos(angle) * random(1, 2.5),
      vy: sin(angle) * random(1, 2.5) - 1.5,
      life: random(30, 55), maxLife: 55,
      type: 'crystal_shard', size: random(2, 4),
      r: 60 + random(0, 40), g: 200 + random(0, 55), b: 180 + random(0, 40),
      gravity: 0.04, world: true,
    });
  }
}

// ─── JUICE: WOOD CHIP SPRAY ──────────────────────────────────────────────
function spawnWoodChips(wx, wy) {
  for (let i = 0; i < 5; i++) {
    let angle = random(-PI * 0.8, -PI * 0.2); // spray upward arc
    let speed = random(2, 4.5);
    particles.push({
      x: wx + random(-3, 3), y: wy,
      vx: cos(angle) * speed + random(-0.5, 0.5),
      vy: sin(angle) * speed,
      life: random(25, 45), maxLife: 45,
      type: 'wood_chip', size: random(2, 4),
      r: 140 + random(-20, 20), g: 100 + random(-15, 15), b: 40 + random(-10, 10),
      gravity: 0.12, spin: random(-0.2, 0.2), world: true,
    });
  }
  // Bark dust cloud
  for (let i = 0; i < 2; i++) {
    particles.push({
      x: wx + random(-6, 6), y: wy + random(-5, 5),
      vx: random(-0.5, 0.5), vy: random(-1, -0.3),
      life: random(20, 35), maxLife: 35,
      type: 'dust', size: random(3, 6),
      r: 120, g: 95, b: 60, world: true,
    });
  }
}

// ─── CEREMONY: EXPEDITION LOOT CASCADE ──────────────────────────────────
function spawnLootCascade(lootBag, goldEarned) {
  // Shower of tumbling coins from top of screen
  let coinCount = min(20, 8 + floor(goldEarned / 10));
  for (let i = 0; i < coinCount; i++) {
    let delay = i * 3; // stagger
    particles.push({
      x: width * 0.3 + random(width * 0.4), y: -10 - random(40) - i * 8,
      vx: random(-1.5, 1.5), vy: random(1, 3),
      life: 80 + random(30), maxLife: 110,
      type: 'loot_coin', size: random(3, 6),
      r: 255, g: 200 + random(40), b: 40 + random(40),
      gravity: 0.06, spin: random(0.05, 0.2), world: false,
    });
  }
  // Loot-specific colored bursts for rare items
  for (let loot of lootBag) {
    let col = { iron_ore: [170,190,210], rare_hide: [200,150,100], ancient_relic: [220,130,220], titan_bone: [240,210,130] }[loot.type];
    if (col) {
      for (let i = 0; i < 3; i++) {
        particles.push({
          x: width * 0.3 + random(width * 0.4), y: -20 - random(60),
          vx: random(-2, 2), vy: random(1.5, 3.5),
          life: 70 + random(25), maxLife: 95,
          type: 'loot_coin', size: random(4, 7),
          r: col[0], g: col[1], b: col[2],
          gravity: 0.08, spin: random(0.08, 0.25), world: false,
        });
      }
    }
  }
  // Victory pulse ring
  particles.push({
    x: width / 2, y: height * 0.3,
    vx: 0, vy: 0,
    life: 50, maxLife: 50,
    type: 'pulse_ring', size: 10,
    r: 255, g: 220, b: 80, world: false,
  });
}

// ─── CEREMONY: ISLAND LEVEL-UP EARTHQUAKE + GOLDEN WAVE ─────────────────
function spawnIslandLevelUp() {
  let cx = w2sX(WORLD.islandCX), cy = w2sY(WORLD.islandCY);
  // Triple expanding golden wave
  for (let i = 0; i < 3; i++) {
    particles.push({
      x: WORLD.islandCX, y: WORLD.islandCY,
      vx: 0, vy: 0,
      life: 70 + i * 15, maxLife: 70 + i * 15,
      type: 'golden_wave', size: 5 + i * 8,
      maxRing: 250 + i * 60,
      r: 255, g: 200 - i * 20, b: 40 + i * 15, world: true,
    });
  }
  // Eruption of golden debris from island center
  for (let i = 0; i < 18; i++) {
    let angle = random(TWO_PI);
    let speed = random(2, 5);
    particles.push({
      x: WORLD.islandCX + random(-20, 20), y: WORLD.islandCY,
      vx: cos(angle) * speed, vy: sin(angle) * speed * 0.6 - random(1, 3),
      life: random(40, 70), maxLife: 70,
      type: 'harvest_burst', size: random(3, 6),
      r: 255, g: 200 + random(40), b: 40 + random(40),
      gravity: 0.1, world: true,
    });
  }
  // Dust cloud from ground cracking
  for (let i = 0; i < 10; i++) {
    particles.push({
      x: WORLD.islandCX + random(-80, 80), y: WORLD.islandCY + random(-20, 20),
      vx: random(-1, 1), vy: random(-2, -0.5),
      life: random(30, 50), maxLife: 50,
      type: 'dust', size: random(4, 8),
      r: 120, g: 110, b: 80, world: true,
    });
  }
  // Prolonged screen shake — earthquake rumble
  triggerScreenShake(8, 25);
}

// ─── ISLAND LEVEL MILESTONE CELEBRATION ─────────────────────────────────
const ISLAND_RANKS = { 5: 'Colonist', 10: 'Citizen', 15: 'Senator', 20: 'Consul', 25: 'Imperator' };

function triggerIslandMilestone(lvl) {
  let rank = ISLAND_RANKS[lvl] || null;
  // Find buildings newly unlocked at this level
  let unlocks = [];
  for (let key in BLUEPRINTS) {
    if (BLUEPRINTS[key].minLevel === lvl) unlocks.push(BLUEPRINTS[key].name);
  }
  state.islandMilestone = { level: lvl, rank: rank, unlocks: unlocks, timer: 300 };
  _juiceLevelUpFlash = 1.0; // white screen flash on level up
  if (snd) snd.playSFX('level_up');
  // Narration at milestone levels
  if (snd && snd.playNarration) {
    if (lvl === 3) snd.playNarration('level_3');
    else if (lvl === 5) snd.playNarration('level_5');
    else if (lvl === 8) snd.playNarration('level_8');
    else if (lvl === 10) snd.playNarration('level_10');
  }
  // Golden particle burst from island center
  for (let i = 0; i < 30; i++) {
    let a = random(TWO_PI), spd = random(1.5, 5);
    particles.push({
      x: WORLD.islandCX + random(-10, 10), y: WORLD.islandCY + random(-10, 10),
      vx: cos(a) * spd, vy: sin(a) * spd * 0.6 - random(1, 3),
      life: random(50, 90), maxLife: 90,
      type: 'harvest_burst', size: random(3, 7),
      r: 255, g: 210 + floor(random(-20, 20)), b: 30,
      gravity: 0.06, world: true,
    });
  }
}

function drawIslandMilestone() {
  if (!state.islandMilestone || state.islandMilestone.timer <= 0) { state.islandMilestone = null; return; }
  let m = state.islandMilestone;
  m.timer--;
  let fadeIn = min(1, (300 - m.timer) / 25);
  let fadeOut = min(1, m.timer / 40);
  let al = min(fadeIn, fadeOut);
  push(); noStroke();
  // Full-screen dim
  fill(10, 5, 2, 140 * al);
  rect(0, 0, width, height);
  // Main title
  let centerY = height * 0.38;
  let pulse = sin(frameCount * 0.08) * 0.15 + 0.85;
  fill(255, 210, 50, 255 * al * pulse);
  textSize(28); textAlign(CENTER, CENTER);
  text('ISLAND LEVEL ' + m.level + '!', width / 2, centerY);
  // Rank subtitle
  if (m.rank) {
    fill(255, 240, 180, 230 * al);
    textSize(14);
    text('Rank: ' + m.rank, width / 2, centerY + 32);
  }
  // Unlocked buildings
  if (m.unlocks.length > 0) {
    let startY = centerY + (m.rank ? 60 : 48);
    fill(200, 190, 150, 180 * al);
    textSize(9);
    text('NEW BUILDINGS UNLOCKED', width / 2, startY);
    fill(255, 230, 140, 220 * al);
    textSize(11);
    for (let i = 0; i < m.unlocks.length; i++) {
      text(m.unlocks[i], width / 2, startY + 16 + i * 16);
    }
  }
  // Decorative lines
  let shimmer = sin(frameCount * 0.06) * 0.3 + 0.7;
  stroke(255, 210, 60, 70 * al * shimmer); strokeWeight(1);
  line(width * 0.2, centerY - 20, width * 0.8, centerY - 20);
  line(width * 0.2, centerY + (m.rank ? 46 : 20), width * 0.8, centerY + (m.rank ? 46 : 20));
  // Dismiss hint
  if (m.timer < 260) {
    fill(160, 140, 100, 100 * al);
    textSize(10); noStroke();
    text('click or press any key to dismiss', width / 2, height * 0.72);
  }
  pop();
}

function dismissIslandMilestone() {
  if (state.islandMilestone && state.islandMilestone.timer > 40) {
    state.islandMilestone.timer = 40; // start fade-out
    return true;
  }
  return false;
}

// [MOVED TO building.js] spawnBuildingComplete

// ─── JUICE: BOSS DEFEATED — slow-mo effect + dramatic explosion ─────────
let _slowMoFrames = 0;
function spawnBossDefeated(wx, wy) {
  _slowMoFrames = 35; // slow-motion for ~35 frames
  // Dramatic particle explosion
  for (let i = 0; i < 25; i++) {
    let angle = (TWO_PI / 25) * i + random(-0.2, 0.2);
    let speed = random(2, 5);
    particles.push({
      x: wx, y: wy,
      vx: cos(angle) * speed, vy: sin(angle) * speed * 0.7 - 1,
      life: random(40, 70), maxLife: 70,
      type: 'harvest_burst', size: random(3, 6),
      r: 255, g: random(60, 180), b: 40,
      gravity: 0.08, world: true,
    });
  }
  // Triple expanding rings
  for (let i = 0; i < 3; i++) {
    particles.push({
      x: wx, y: wy, vx: 0, vy: 0,
      life: 40 + i * 12, maxLife: 40 + i * 12,
      type: 'golden_wave', size: 5 + i * 6,
      maxRing: 180 + i * 50,
      r: 255, g: 180 - i * 30, b: 40 + i * 20, world: true,
    });
  }
  triggerScreenShake(12, 30, 0, 0, 'circular');
  state.screenFlash = { r: 255, g: 200, b: 60, alpha: 100, timer: 40 };
}

// ─── JUICE: ISLAND DISCOVERED — fog lifts + golden border flash ─────────
function spawnIslandDiscovered(wx, wy) {
  // Golden border flash on all 4 edges
  state.screenFlash = { r: 255, g: 210, b: 80, alpha: 80, timer: 50 };
  // Rising mist particles (fog lifting)
  for (let i = 0; i < 15; i++) {
    particles.push({
      x: wx + random(-100, 100), y: wy + random(-30, 30),
      vx: random(-0.5, 0.5), vy: random(-2, -0.8),
      life: random(50, 80), maxLife: 80,
      type: 'dust', size: random(5, 10),
      r: 200, g: 210, b: 220, world: true,
    });
  }
  // Golden sparkle ring around discovery
  for (let i = 0; i < 16; i++) {
    let angle = (TWO_PI / 16) * i;
    particles.push({
      x: wx + cos(angle) * 60, y: wy + sin(angle) * 30,
      vx: cos(angle) * 0.5, vy: sin(angle) * 0.3 - 0.5,
      life: random(40, 60), maxLife: 60,
      type: 'sundust', size: random(2, 4),
      r: 255, g: 210, b: 60, world: true, phase: random(TWO_PI),
    });
  }
  triggerScreenShake(5, 15);
}

// ─── CEREMONY: DIVINE BLESSING LIGHT COLUMN ─────────────────────────────
function spawnDivineBlessing(wx, wy) {
  // Ascending column of light particles
  for (let i = 0; i < 20; i++) {
    particles.push({
      x: wx + random(-12, 12), y: wy - random(0, 80),
      vx: random(-0.3, 0.3), vy: random(-2.5, -0.8),
      life: 50 + random(40), maxLife: 90,
      type: 'divine_beam', size: random(3, 7),
      r: 255, g: 220, b: 80, phase: random(TWO_PI), world: true,
    });
  }
  // Central bright column flash — tall narrow pulse
  particles.push({
    x: wx, y: wy - 40,
    vx: 0, vy: 0,
    life: 60, maxLife: 60,
    type: 'golden_wave', size: 3, maxRing: 60,
    r: 255, g: 240, b: 150, world: true,
  });
  // Ground radiance ring
  particles.push({
    x: wx, y: wy,
    vx: 0, vy: 0,
    life: 45, maxLife: 45,
    type: 'pulse_ring', size: 8,
    r: 255, g: 200, b: 60, world: true,
  });
  // Floating motes spiraling outward
  for (let i = 0; i < 8; i++) {
    let angle = (TWO_PI / 8) * i;
    particles.push({
      x: wx, y: wy - 20,
      vx: cos(angle) * 1.5, vy: sin(angle) * 0.8 - 1,
      life: 50 + random(20), maxLife: 70,
      type: 'sundust', size: random(2, 4),
      r: 255, g: 240, b: 140, phase: angle, world: true,
    });
  }
  triggerScreenShake(3, 8);
}

// ─── CEREMONY: SEASON/FESTIVAL TRANSITION FANFARE ───────────────────────
function spawnSeasonFanfare(seasonIdx) {
  let colors = [
    [150, 240, 120], // Spring — fresh green
    [255, 200, 60],  // Summer — golden
    [200, 120, 40],  // Autumn — amber
    [180, 210, 255], // Winter — ice blue
  ];
  let col = colors[seasonIdx] || colors[0];
  let px = state.player.x, py = state.player.y;
  // Radial burst of season-colored particles
  for (let i = 0; i < 24; i++) {
    let angle = (TWO_PI / 24) * i + random(-0.1, 0.1);
    let speed = random(2, 5);
    particles.push({
      x: px + random(-5, 5), y: py + random(-5, 5),
      vx: cos(angle) * speed, vy: sin(angle) * speed * 0.7,
      life: random(40, 65), maxLife: 65,
      type: 'season_burst', size: random(3, 6),
      r: col[0] + random(-20, 20), g: col[1] + random(-20, 20), b: col[2] + random(-20, 20),
      gravity: 0.05, world: true,
    });
  }
  // Double expanding season ring
  for (let i = 0; i < 2; i++) {
    particles.push({
      x: px, y: py,
      vx: 0, vy: 0,
      life: 55 + i * 12, maxLife: 55 + i * 12,
      type: 'pulse_ring', size: 5 + i * 6,
      r: col[0], g: col[1], b: col[2], world: true,
    });
  }
  // Confetti streamers
  for (let i = 0; i < 12; i++) {
    particles.push({
      x: px + random(-60, 60), y: py - random(30, 80),
      vx: random(-1, 1), vy: random(0.5, 2),
      life: random(50, 80), maxLife: 80,
      type: 'season_burst', size: random(2, 4),
      r: random(180, 255), g: random(120, 255), b: random(60, 255),
      gravity: 0.04, world: true,
    });
  }
  triggerScreenShake(4, 10);
}

// ─── NIGHT DARKNESS OVERLAY ──────────────────────────────────────────────
function drawNightOverlay() {
  let bright = getSkyBrightness(); // 0 = deep night, 1 = full day
  if (bright >= 1) return; // no overlay needed during day
  // Max darkness at night: ~28% opacity dark blue (moonlit feel)
  let darkness = (1 - bright) * 0.28;
  noStroke();
  fill(10, 12, 40, darkness * 255);
  rect(0, 0, width, height);
}

// ─── JUICE: GOLDEN HOUR COLOR GRADING ────────────────────────────────────
function drawColorGrading() {
  let h = state.time / 60;
  let r = 0, g = 0, b = 0, a = 0;
  let season = getSeason();

  if (h >= 5 && h < 6.5) {
    // Dawn: pink-lavender wash rising to warm gold
    let t = map(h, 5, 6.5, 0, 1);
    r = lerp(50, 255, t * 0.3); g = lerp(20, 180, t * 0.2); b = lerp(70, 100, t * 0.1);
    a = lerp(35, 15, t);
  } else if (h >= 6.5 && h < 8) {
    // Sunrise golden hour: warm amber glow
    let t = map(h, 6.5, 8, 0, 1);
    r = 255; g = 195; b = 100;
    a = lerp(22, 4, t);
  } else if (h >= 11.5 && h < 14) {
    // Noon: warm bleached highlight
    let t = map(h, 11.5, 14, 0, 1);
    let intensity = sin(t * PI);
    r = 255; g = 245; b = 210;
    a = 8 * intensity;
  } else if (h >= 14.5 && h < 17) {
    // Golden hour: deep amber — the MONEY hour
    let t = map(h, 14.5, 17, 0, 1);
    let intensity = sin(t * PI);
    r = 255; g = 175; b = 55;
    a = 35 * intensity;
  } else if (h >= 17 && h < 19) {
    // Sunset golden hour: deep amber to orange-red
    let t = map(h, 17, 19, 0, 1);
    r = lerp(255, 200, t); g = lerp(160, 60, t); b = lerp(55, 80, t);
    a = lerp(32, 40, t);
  } else if (h >= 19 && h < 20.5) {
    // Dusk: deep purple settling
    let t = map(h, 19, 20.5, 0, 1);
    r = lerp(120, 15, t); g = lerp(50, 12, t); b = lerp(100, 50, t);
    a = lerp(20, 22, t);
  } else if (h >= 20.5 || h < 5) {
    // Night: deep indigo-blue (subtle tint, not darkening)
    r = 8; g = 8; b = 30;
    a = 15;
  }

  // Seasonal tint modifier
  if (season === 0 && a > 0) { g += 5; b += 3; } // spring: slightly greener
  if (season === 1) { r += 8; a = max(a, 4); } // summer: warmer always
  if (season === 2) { r += 10; g += 3; a = max(a, 5); } // autumn: amber tint
  if (season === 3) { b += 8; r -= 3; a = max(a, 6); } // winter: cool blue

  if (a > 0) {
    noStroke();
    fill(max(0, r), max(0, g), max(0, b), a);
    rect(0, 0, width, height);
  }

  // Vignette — darker edges for cinematic feel (always subtle)
  let vigA = 14 + (h >= 20 || h < 6 ? 3 : 0);
  let vigW = width * 0.35, vigH = height * 0.35;
  // Top-left corner
  fill(0, 0, 0, vigA * 0.5);
  rect(0, 0, vigW, vigH);
  // Top-right
  rect(width - vigW, 0, vigW, vigH);
  // Bottom corners
  fill(0, 0, 0, vigA * 0.4);
  rect(0, height - vigH, vigW, vigH);
  rect(width - vigW, height - vigH, vigW, vigH);
  // Edge strips
  fill(0, 0, 0, vigA * 0.3);
  rect(0, 0, 20, height);
  rect(width - 20, 0, 20, height);
  rect(0, 0, width, 12);
  rect(0, height - 12, width, 12);
}

// ─── STORM ────────────────────────────────────────────────────────────────
function updateStorm(dt) {
  stormTimer += dt;

  if (!stormActive && stormTimer > 2400 + random(-400, 400) && state.blessing.type !== 'storm' && !(state.prophecy && state.prophecy.type === 'peace')) {
    if (typeof weatherTransition !== 'undefined') {
      weatherTransition.active = true;
      weatherTransition.type = 'storm_in';
      weatherTransition.progress = 0;
      weatherTransition.earlyDrops = [];
    }
    stormActive = true;
    stormTimer = 0;
    addFloatingText(width / 2, height * 0.3, '⚡ DRIFT STORM', C.stormFlash);
    triggerScreenShake(8, 20);
  }
  if (stormActive && stormTimer > 800) {
    if (typeof weatherTransition !== 'undefined') {
      weatherTransition.active = true;
      weatherTransition.type = 'storm_out';
      weatherTransition.progress = 0;
    }
    stormActive = false;
    stormTimer = 0;
  }

  if (stormActive && frameCount % 60 === 0 && random() < 0.5) {
    let lx = random(width * 0.2, width * 0.8);
    lightningBolts.push({
      x: lx, yTop: 0, yBot: height * 0.55,
      life: 12, maxLife: 12, branches: genLightningBranches(lx),
    });
    triggerScreenShake(4, 8);
  }

  lightningBolts.forEach(l => l.life--);
  lightningBolts = lightningBolts.filter(l => l.life > 0);
}

function genLightningBranches(x) {
  let branches = [];
  let cx = x, cy = 0;
  while (cy < height * 0.55) {
    let nx = cx + random(-25, 25);
    let ny = cy + random(20, 40);
    branches.push({ x1: cx, y1: cy, x2: nx, y2: ny });
    if (random() < 0.4) {
      branches.push({ x1: cx, y1: cy, x2: cx + random(-50, 50), y2: cy + random(15, 30), side: true });
    }
    cx = nx; cy = ny;
  }
  return branches;
}

function drawLightning() {
  lightningBolts.forEach(l => {
    let a = map(l.life, 0, l.maxLife, 0, 1);
    // Full-screen flash on fresh strike — bright white then quick fade
    if (l.life > l.maxLife - 2) {
      noStroke();
      fill(230, 235, 255, 140);
      rect(0, 0, width, height);
    } else if (l.life > l.maxLife - 4) {
      noStroke();
      fill(200, 215, 240, 50 * a);
      rect(0, 0, width, height);
    }
    // Outer glow pass
    l.branches.forEach(b => {
      let w = b.side ? 1.5 : 3;
      stroke(120, 160, 220, 80 * a);
      strokeWeight(w + 2);
      line(b.x1, b.y1, b.x2, b.y2);
    });
    // Core bolt
    l.branches.forEach(b => {
      let w = b.side ? 1 : 2;
      stroke(180, 220, 255, 220 * a);
      strokeWeight(w);
      line(b.x1, b.y1, b.x2, b.y2);
      stroke(255, 255, 255, 140 * a);
      strokeWeight(w * 0.5);
      line(b.x1, b.y1, b.x2, b.y2);
    });
    noStroke();
    // Afterimage — faint purple ghost
    if (l.life < l.maxLife * 0.4 && l.life > 2) {
      l.branches.forEach(b => {
        if (b.side) return;
        stroke(100, 80, 160, 20 * a);
        strokeWeight(1);
        line(b.x1 + 2, b.y1 + 1, b.x2 + 2, b.y2 + 1);
      });
      noStroke();
    }
  });
}

function drawEnergyArcs() {
  energyArcs.forEach(a => {
    let al = map(a.life, 0, a.maxLife, 0, 1);
    stroke(0, 255, 200, 180 * al);
    strokeWeight(1.5);
    let mx = (a.x1 + a.x2) / 2 + random(-8, 8);
    let my = (a.y1 + a.y2) / 2 + random(-8, 8);
    noFill();
    beginShape();
    vertex(a.x1, a.y1);
    quadraticVertex(mx, my, a.x2, a.y2);
    endShape();
    a.life--;
  });
  energyArcs = energyArcs.filter(a => a.life > 0);
  noStroke();
}

// ─── FLOATING TEXT ────────────────────────────────────────────────────────
// ─── DIALOG SYSTEM (typewriter) ─────────────────────────────────────────
function openDialog(speaker, portrait, txt, choices, onComplete) {
  dialogState.active = true;
  dialogState.speaker = speaker;
  dialogState.portrait = portrait;
  dialogState.text = txt;
  dialogState.displayLen = 0;
  dialogState.choices = choices || null;
  dialogState.onComplete = onComplete || null;
}

function advanceDialog() {
  if (!dialogState.active) return;
  if (dialogState.displayLen < dialogState.text.length) {
    dialogState.displayLen = dialogState.text.length;
    return;
  }
  if (dialogState.choices) return; // wait for choice click
  dialogState.active = false;
  if (dialogState.onComplete) dialogState.onComplete();
}
function updateDialog(dt) {
  if (!dialogState.active) return;
  if (dialogState.displayLen < dialogState.text.length) {
    let prevLen = floor(dialogState.displayLen);
    dialogState.displayLen += dt * 0.8;
    let newLen = floor(dialogState.displayLen);
    if (newLen > prevLen && snd && typeof snd.playDialogBlip === 'function') {
      let ch = dialogState.text.charAt(newLen - 1);
      if (ch && ch !== ' ' && ch !== '.' && ch !== ',' && ch !== '!' && ch !== '?' && ch !== '-' && ch !== '\'' && ch !== '"') {
        snd.playDialogBlip(dialogState.portrait || 'livia');
      }
    }
  }
}

function drawDialogSystem() {
  if (!dialogState.active) return;
  let d = dialogState;
  let boxW = min(width - 40, 440);
  let boxH = 90;
  let bx = (width - boxW) / 2;
  let by = height - boxH - 20;

  // Dark backdrop
  noStroke();
  fill(0, 0, 0, 120);
  rect(0, 0, width, height);

  // Main dialog panel
  fill(25, 20, 14, 240);
  rect(bx, by, boxW, boxH, 6);
  // Gold border
  stroke(180, 145, 70, 200);
  strokeWeight(1.5);
  noFill();
  rect(bx, by, boxW, boxH, 6);
  // Inner line
  stroke(120, 95, 55, 80);
  strokeWeight(0.5);
  rect(bx + 4, by + 4, boxW - 8, boxH - 8, 4);
  noStroke();

  // Portrait area (left side)
  let portW = 56;
  fill(35, 28, 20);
  rect(bx + 6, by + 6, portW, boxH - 12, 4);
  stroke(140, 110, 60, 100);
  strokeWeight(0.5);
  noFill();
  rect(bx + 6, by + 6, portW, boxH - 12, 4);
  noStroke();

  // Draw pixel portrait
  push();
  translate(bx + 6 + portW / 2, by + 6 + (boxH - 12) / 2);
  drawPortrait(d.portrait);
  pop();

  // Name plate
  let nameX = bx + portW + 16;
  fill(212, 160, 64);
  textSize(9);
  textAlign(LEFT, TOP);
  text(d.speaker.toUpperCase(), nameX, by + 10);
  // Decorative line under name
  stroke(140, 110, 55, 100);
  strokeWeight(0.5);
  line(nameX, by + 22, nameX + textWidth(d.speaker.toUpperCase()) + 10, by + 22);
  noStroke();

  // Typewriter text
  let visibleText = d.text.substring(0, floor(d.displayLen));
  fill(220, 210, 190);
  textSize(11);
  let maxTW = boxW - portW - 28;
  let words = visibleText.split(' ');
  let lines = [''];
  let lineH = 11;
  words.forEach(w => {
    let test = lines[lines.length - 1] + w + ' ';
    if (textWidth(test) > maxTW) lines.push(w + ' ');
    else lines[lines.length - 1] = test;
  });
  lines.forEach((ln, i) => {
    text(ln, nameX, by + 27 + i * lineH);
  });

  // Cursor blink when text fully revealed
  if (d.displayLen >= d.text.length && !d.choices) {
    let blink = sin(frameCount * 0.1) > 0;
    if (blink) {
      fill(180, 160, 120, 180);
      textSize(10);
      textAlign(RIGHT, BOTTOM);
      text('[SPACE]', bx + boxW - 10, by + boxH - 6);
    }
  }

  // Choice buttons
  if (d.choices && d.displayLen >= d.text.length) {
    let choiceY = by + boxH + 4;
    d.choices.forEach((ch, i) => {
      let cbw = textWidth(ch.text) + 24;
      let cbx = bx + portW + 16 + i * (cbw + 8);
      let hover = mouseX > cbx && mouseX < cbx + cbw && mouseY > choiceY && mouseY < choiceY + 22;
      fill(hover ? color(60, 50, 35) : color(35, 28, 20));
      rect(cbx, choiceY, cbw, 22, 4);
      stroke(hover ? color(212, 160, 64) : color(120, 95, 55));
      strokeWeight(1);
      noFill();
      rect(cbx, choiceY, cbw, 22, 4);
      noStroke();
      fill(hover ? color(255, 220, 160) : color(180, 160, 120));
      textSize(11);
      textAlign(CENTER, CENTER);
      text(ch.text, cbx + cbw / 2, choiceY + 11);
    });
  }
  textAlign(LEFT, TOP);
}

function drawPortrait(id) {
  // Pixel art portrait faces
  noStroke();
  if (id === 'livia') {
    // Skin
    fill(210, 170, 130); rect(-10, -12, 20, 18);
    // Hair
    fill(60, 30, 15); rect(-12, -16, 24, 8); rect(-12, -12, 4, 16); rect(8, -12, 4, 16);
    // Eyes
    fill(80, 50, 30); rect(-6, -7, 4, 3); rect(2, -7, 4, 3);
    fill(255); rect(-5, -7, 2, 2); rect(3, -7, 2, 2);
    // Lips
    fill(180, 60, 60); rect(-3, -1, 6, 2);
    // Blush
    fill(200, 120, 100, 80); rect(-8, -4, 4, 2); rect(4, -4, 4, 2);
    // Gold earrings
    fill(220, 190, 60); rect(-12, -8, 2, 3); rect(10, -8, 2, 3);
  } else if (id === 'marcus') {
    fill(190, 150, 110); rect(-10, -12, 20, 18);
    fill(50, 40, 30); rect(-11, -16, 22, 6);
    fill(80, 50, 30); rect(-6, -7, 4, 3); rect(2, -7, 4, 3);
    fill(255); rect(-5, -7, 2, 2); rect(3, -7, 2, 2);
    fill(180, 140, 100); rect(-3, -1, 6, 2);
    // Beard
    fill(50, 40, 30); rect(-6, 1, 12, 4);
    // Helmet crest — faction color
    { let _fc2 = (typeof getFactionData === 'function') ? getFactionData() : null; let _hc = _fc2 && _fc2.player ? _fc2.player.cape : [180, 30, 30]; fill(_hc[0], _hc[1], _hc[2]); } rect(-3, -18, 6, 4);
  } else if (id === 'vesta') {
    fill(200, 160, 120); rect(-10, -12, 20, 18);
    fill(100, 80, 60); rect(-12, -16, 24, 7); rect(-12, -12, 3, 14); rect(9, -12, 3, 14);
    fill(60, 100, 60); rect(-6, -7, 4, 3); rect(2, -7, 4, 3);
    fill(255); rect(-5, -7, 2, 2); rect(3, -7, 2, 2);
    fill(170, 100, 80); rect(-2, -1, 4, 2);
    // Crystal necklace
    fill(0, 200, 120); rect(-2, 4, 4, 3);
  } else if (id === 'felix') {
    fill(180, 140, 100); rect(-10, -12, 20, 18);
    fill(200, 160, 60); rect(-11, -16, 22, 7);
    fill(80, 80, 120); rect(-6, -7, 4, 3); rect(2, -7, 4, 3);
    fill(255); rect(-5, -7, 2, 2); rect(3, -7, 2, 2);
    fill(180, 120, 80); rect(-3, -1, 6, 2);
    // Cat ears headband
    fill(200, 160, 60); rect(-9, -18, 4, 4); rect(5, -18, 4, 4);
  } else {
    // Generic NPC
    fill(200, 160, 120); rect(-10, -12, 20, 18);
    fill(80, 60, 40); rect(-11, -16, 22, 7);
    fill(60, 50, 40); rect(-6, -7, 4, 3); rect(2, -7, 4, 3);
    fill(255); rect(-5, -7, 2, 2); rect(3, -7, 2, 2);
    fill(180, 120, 80); rect(-3, -1, 6, 2);
  }
}

function updateFloatingText(dt) {
  floatingText.forEach(f => {
    f.y += f.vy * dt;
    f.life -= dt;
  });
  floatingText = floatingText.filter(f => f.life > 0);
}



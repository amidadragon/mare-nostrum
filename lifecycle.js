// MARE NOSTRUM — Oracle, Daily Summary, Cats & Wildlife
// ─── ORACLE PROPHECY ─────────────────────────────────────────────────────
const PROPHECIES = [
  { text: 'Jupiter smiles on the fisherman today', type: 'fish', desc: '+1 fish per catch' },
  { text: 'The soil remembers last night\'s dew', type: 'crops', desc: '+30% crop growth' },
  { text: 'Mercury quickens your feet', type: 'speed', desc: '+25% move speed' },
  { text: 'Ceres blesses the granary', type: 'harvest', desc: '+1 harvest per plot' },
  { text: 'Vulcan heats the forge', type: 'cooking', desc: 'Instant cooking' },
  { text: 'Venus turns her gaze upon you', type: 'hearts', desc: '+1 bonus heart per gift' },
  { text: 'Neptune stirs the deep waters', type: 'rarefish', desc: '3x rare fish chance' },
  { text: 'Apollo\'s light burns brighter', type: 'solar', desc: '2x solar recharge' },
  { text: 'Diana watches the woodland paths', type: 'wood', desc: '2x wood from trees' },
  { text: 'Fortuna spins her wheel kindly', type: 'luck', desc: 'All random drops better' },
  { text: 'Pluto opens a crack in the earth', type: 'crystal', desc: '3x crystal recharge' },
  { text: 'Juno watches over the home', type: 'build', desc: 'Building costs -30%' },
  { text: 'Mars rests. Peace reigns.', type: 'peace', desc: 'No storms today' },
  { text: 'Bacchus pours freely', type: 'wine', desc: 'Wine/Oil worth 2x hearts' },
  { text: 'Minerva sharpens the mind', type: 'combo', desc: 'Combo timer 2x longer' },
  { text: 'Saturn remembers the old ways', type: 'mutation', desc: '3x mutation chance' },
];

function generateProphecy() {
  let pool = [...PROPHECIES];
  // Weight by season
  let season = getSeason();
  if (season === 0) pool.push(PROPHECIES[1], PROPHECIES[1]); // crops 3x in spring
  if (season === 1) pool.push(PROPHECIES[7], PROPHECIES[7]); // solar 3x in summer
  if (season === 2) pool.push(PROPHECIES[3], PROPHECIES[3]); // harvest 3x in autumn
  if (season === 3) pool.push(PROPHECIES[8], PROPHECIES[8]); // wood 3x in winter
  let pick = pool[floor(random(pool.length))];
  return { text: pick.text, type: pick.type, desc: pick.desc, active: true };
}

function drawOracleStone() {
  // Draw near temple — a small glowing pillar
  let ox = state.pyramid.x - 50, oy = state.pyramid.y + 30;
  let sx = w2sX(ox), sy = w2sY(oy);

  // Pillar
  fill(180, 170, 155);
  rect(sx - 5, sy - 14, 10, 14, 1);
  fill(200, 190, 170);
  rect(sx - 7, sy - 16, 14, 4, 1);

  // Glowing eye — pixel cross
  let pulse = sin(frameCount * 0.05) * 0.3 + 0.7;
  fill(220, 180, 60, floor(180 * pulse));
  rect(sx - 2, sy - 12, 4, 3);
  // Glow — pixel cross
  fill(220, 180, 60, floor(30 * pulse));
  rect(sx - 7, sy - 11, 14, 2);
  rect(sx - 1, sy - 15, 2, 10);

  // Show prophecy text when player is near
  let pd = dist2(state.player.x, state.player.y, ox, oy);
  if (pd < 50 && state.prophecy && state.prophecy.active) {
    fill(0, 0, 0, 160);
    let tw = 200;
    rect(sx - tw / 2, sy - 50, tw, 28, 3);
    fill(state.prophecy.golden ? color(255, 215, 0) : color(220, 190, 80));
    textSize(10);
    textAlign(CENTER, CENTER);
    text((state.prophecy.golden ? '~ ' : '"') + state.prophecy.text + (state.prophecy.golden ? ' ~' : '"'), sx, sy - 42);
    fill(state.prophecy.golden ? color(255, 230, 100) : color(180, 160, 80));
    textSize(9);
    text(state.prophecy.desc, sx, sy - 32);
    textAlign(LEFT, TOP);
  }
}

// Farming system — see farming.js

// ─── DAILY SUMMARY ───────────────────────────────────────────────────────
function calculateDailySummary() {
  let a = state.dailyActivities;
  let acts = 0;
  if (a.harvested > 0) acts++;
  if (a.fished > 0) acts++;
  if (a.built > 0) acts++;
  if (a.gifted > 0) acts++;
  if (a.cooked > 0) acts++;
  if (a.catPetted > 0) acts++;
  if (a.crystal > 0) acts++;
  if (a.chopped > 0) acts++;

  let wreaths = 0;
  if (acts >= 3) wreaths = 1;
  if (acts >= 5) wreaths = 2;
  if (acts >= 5 && a.catPetted >= 2) wreaths = 3;

  return {
    day: state.day,
    harvested: a.harvested, fished: a.fished, built: a.built,
    gifted: a.gifted, cooked: a.cooked, catPetted: a.catPetted,
    comboBest: state.harvestCombo.best,
    activities: acts, wreaths: wreaths,
  };
}

function drawDailySummary() {
  if (!state.showSummary || !state.lastSummary) return;
  let s = state.lastSummary;

  let pw = 240, ph = 220;
  let px = width / 2 - pw / 2, py = height / 2 - ph / 2;

  rectMode(CORNER);
  noStroke();
  fill(0, 0, 0, 140);
  rect(0, 0, width, height);

  drawParchmentPanel(px, py, pw, ph);

  fill(200, 170, 90);
  textAlign(CENTER, TOP);
  textSize(12);
  text('DIES ' + s.day, width / 2, py + 12);
  fill(160, 140, 100);
  textSize(11);
  text('Daily Summary', width / 2, py + 28);
  stroke(140, 110, 55, 100);
  strokeWeight(0.5);
  line(px + 20, py + 40, px + pw - 20, py + 40);
  noStroke();

  textAlign(LEFT, TOP);
  textSize(11);
  let ly = py + 48;
  let lx = px + 18;
  fill(200, 180, 140);
  text('Crops Harvested   ' + s.harvested, lx, ly); ly += 14;
  text('Fish Caught        ' + s.fished, lx, ly); ly += 14;
  text('Buildings Placed   ' + s.built, lx, ly); ly += 14;
  text('Hearts Given       ' + s.gifted, lx, ly); ly += 14;
  text('Meals Cooked       ' + s.cooked, lx, ly); ly += 14;
  text('Cats Petted        ' + s.catPetted, lx, ly); ly += 14;
  text('Best Combo         x' + s.comboBest, lx, ly); ly += 18;

  // Wreaths
  let wreathLabels = ['', 'CORONA AENEA', 'CORONA ARGENTEA', 'CORONA LAUREA'];
  let wreathColors = ['', '#cc9944', '#bbbbdd', '#eebb22'];
  if (s.wreaths > 0) {
    fill(color(wreathColors[s.wreaths]));
    textAlign(CENTER, TOP);
    textSize(10);
    text(wreathLabels[s.wreaths], width / 2, ly);
    ly += 14;
    fill(160, 140, 100);
    textSize(10);
    if (s.wreaths >= 1) text('+2 seeds at dawn', width / 2, ly); ly += 10;
    if (s.wreaths >= 2) text('+5 gold at dawn', width / 2, ly); ly += 10;
    if (s.wreaths >= 3) text('+1 crystal + blessed dawn', width / 2, ly);
  } else {
    fill(120, 100, 70);
    textAlign(CENTER, TOP);
    textSize(11);
    text('No wreath today. Do 3+ activities!', width / 2, ly);
  }

  textAlign(LEFT, TOP);

  fill(120, 100, 70);
  textAlign(CENTER, TOP);
  textSize(10);
  text('[ click to dismiss ]', width / 2, py + ph - 16);
  textAlign(LEFT, TOP);
}

function resetDailyActivities() {
  state.dailyActivities = {
    harvested: 0, fished: 0, built: 0, gifted: 0, cooked: 0,
    catPetted: 0, crystal: 0, chopped: 0
  };
  state.harvestCombo.best = 0;
  state.harvestCombo.count = 0;
}

// ─── CAT ADOPTION ────────────────────────────────────────────────────────
const CAT_COLORS = [
  { name: 'Ginger',  r: 200, g: 130, b: 50,  passive: 'crops', desc: '+2% crop growth' },
  { name: 'Grey',    r: 140, g: 140, b: 150, passive: 'stone', desc: 'Finds stone daily' },
  { name: 'Black',   r: 40,  g: 35,  b: 45,  passive: 'night', desc: 'Better night vision' },
  { name: 'Calico',  r: 220, g: 200, b: 170, passive: 'hearts', desc: '+5% heart gain' },
  { name: 'White',   r: 240, g: 238, b: 235, passive: 'solar', desc: '+5% solar recharge' },
  { name: 'Golden',  r: 220, g: 190, b: 80,  passive: 'gold', desc: '+1 gold per day' },
];

function spawnWildCat() {
  if (state.cats.filter(c => !c.adopted).length >= 2) return;
  // Determine available colors
  let adoptedColors = state.cats.filter(c => c.adopted).map(c => c.colorName);
  let available = CAT_COLORS.filter(c => {
    if (adoptedColors.includes(c.name)) return false;
    if (c.name === 'Golden' && !(state.day % 40 >= 37)) return false; // near Saturnalia only
    if (c.name === 'Black' && state.day < 11) return false;
    if (c.name === 'Calico' && state.day < 21) return false;
    if (c.name === 'White' && state.day < 31) return false;
    return true;
  });
  if (available.length === 0) available = [CAT_COLORS[0]]; // fallback ginger

  let pick = available[floor(random(available.length))];
  let rx = state.felix ? state.felix.x : WORLD.islandCX - 200;
  let ry = state.felix ? state.felix.y : WORLD.islandCY - 10;
  state.cats.push({
    x: rx + random(-60, 60),
    y: ry + random(-40, 40),
    facing: random() > 0.5 ? 1 : -1,
    color: [pick.r, pick.g, pick.b],
    colorName: pick.name,
    passive: pick.passive,
    passiveDesc: pick.desc,
    adopted: false,
    adoptionProgress: 0,
    lastVisitDay: -1,
    behavior: 'idle',
    behaviorTimer: 0,
    petted: false,
  });
}

function updateCatAdoption() {
  state.cats.forEach(cat => {
    if (cat.adopted) return;
    let pd = dist2(state.player.x, state.player.y, cat.x, cat.y);
    if (pd < 40 && cat.lastVisitDay !== state.day) {
      cat.lastVisitDay = state.day;
      cat.adoptionProgress++;
      let sx = w2sX(cat.x), sy = w2sY(cat.y);
      if (cat.adoptionProgress === 1) {
        addFloatingText(sx, sy - 15, cat.colorName + ' cat notices you', '#ffaa66');
      } else if (cat.adoptionProgress === 2) {
        addFloatingText(sx, sy - 15, cat.colorName + ' cat is curious...', '#ffaa66');
      } else if (cat.adoptionProgress === 3) {
        addFloatingText(sx, sy - 15, cat.colorName + ' cat is warming up!', '#ffcc44');
      } else if (cat.adoptionProgress >= 4) {
        cat.adopted = true;
        addFloatingText(sx, sy - 20, 'Adopted ' + cat.colorName + ' cat!', C.solarBright);
        addFloatingText(sx, sy - 8, cat.passiveDesc, '#aaddaa');
        spawnParticles(cat.x, cat.y, 'burst', 20);
      }
    }
  });
}

let seasonLeaves = [];
let _seasonLeavesPrevSeason = -1;
function drawSeasonalEffects() {
  let season = getSeason();
  // Clear old leaves on season change to prevent leaks
  if (season !== _seasonLeavesPrevSeason) {
    seasonLeaves = [];
    _seasonLeavesPrevSeason = season;
  }
  let bright = getSkyBrightness();
  let ix = w2sX(WORLD.islandCX);
  let iy = w2sY(WORLD.islandCY);

  if (season === 0) {
    // === SPRING (Ver) — Cherry blossoms + butterflies + pollen ===
    // Cherry blossom petals — pink/white pixel petals drifting down
    let _springInterval = _fpsSmooth < 35 ? 30 : 18;
    let _springCap = _fpsSmooth < 35 ? 10 : 18;
    if (frameCount % _springInterval === 0 && seasonLeaves.length < _springCap) {
      seasonLeaves.push({
        x: ix + random(-220, 220), y: iy - random(60, 120),
        vx: random(-0.3, 0.5), vy: random(0.3, 0.7),
        rot: random(TWO_PI), rotV: random(-0.06, 0.06),
        size: random(2.5, 5), life: 180,
        type: random() > 0.7 ? 'butterfly' : 'blossom',
        c: random() > 0.4 ? color(245, 180, 200, 180) : color(255, 230, 240, 160),
      });
    }
    noStroke();
    let _slW = 0;
    for (let i = 0; i < seasonLeaves.length; i++) {
      let l = seasonLeaves[i];
      l.x += l.vx + sin(frameCount * 0.015 + i * 0.7) * 0.4;
      l.y += l.vy + cos(frameCount * 0.02 + i) * 0.1;
      l.rot += l.rotV;
      l.life--;
      if (l.life <= 0) continue;
      seasonLeaves[_slW++] = l;
      let fadeA = min(1, l.life / 30);

      if (l.type === 'butterfly') {
        // Pixel butterfly
        let wingFlap = floor(sin(frameCount * 0.25 + i * 2) * 3);
        let fpx = floor(l.x), fpy = floor(l.y);
        let bColors = [color(200, 130, 220, 190 * fadeA), color(240, 180, 100, 190 * fadeA), color(120, 200, 180, 190 * fadeA)];
        fill(bColors[i % 3]);
        rect(fpx - 3 - wingFlap, fpy - 1, 3, 2);
        rect(fpx + 1 + wingFlap, fpy - 1, 3, 2);
        fill(40, 30, 20, 200 * fadeA);
        rect(fpx, fpy - 1, 1, 3);
      } else {
        // Cherry blossom petal — rotating pixel ellipse
        push();
        translate(l.x, l.y);
        rotate(l.rot);
        fill(red(l.c), green(l.c), blue(l.c), 180 * fadeA);
        rect(-l.size * 0.5, -l.size * 0.3, l.size, l.size * 0.6);
        // Petal highlight
        fill(255, 255, 255, 60 * fadeA);
        rect(-l.size * 0.2, -l.size * 0.15, l.size * 0.4, l.size * 0.3);
        pop();
      }
    }
    seasonLeaves.length = _slW;
    // Floating pollen motes (fewer, supplemental)
    if (frameCount % 60 === 0 && bright > 0.3) {
      particles.push({
        x: WORLD.islandCX + random(-200, 200), y: WORLD.islandCY + random(-80, -20),
        vx: random(-0.2, 0.3), vy: random(-0.3, -0.1),
        life: 120, maxLife: 120, type: 'mote', size: random(1, 2),
        r: 255, g: 240, b: 150, world: true, phase: random(TWO_PI),
      });
    }

  } else if (season === 1) {
    // === SUMMER (Aestas) — Heat shimmer + cicada particles + fireflies at dusk ===
    let hour = state.time / 60;

    // Daytime: heat shimmer over ground
    if (bright > 0.7) {
      let shimmerA = (bright - 0.7) * 15;
      let _shimmerStep = _fpsSmooth < 35 ? 12 : 6;
      for (let sy = iy - 30; sy < iy + 40; sy += _shimmerStep) {
        let wave = sin(sy * 0.08 + frameCount * 0.06) * 2;
        fill(255, 230, 160, shimmerA);
        rect(ix - 150 + wave, sy, 300, 2);
      }
      // Cicada dust motes — golden sparkles rising
      if (frameCount % 30 === 0) {
        particles.push({
          x: WORLD.islandCX + random(-180, 180), y: WORLD.islandCY + random(-20, 30),
          vx: random(-0.2, 0.2), vy: random(-0.6, -0.2),
          life: 80, maxLife: 80, type: 'sundust', size: random(1, 2),
          r: 220, g: 195, b: 80, world: true, phase: random(TWO_PI),
        });
      }
    }

    // Dusk/night: fireflies
    if (hour > 17.5 || hour < 6) {
      let _ffCap = _fpsSmooth < 35 ? 6 : 12;
      if (frameCount % 35 === 0 && seasonLeaves.length < _ffCap) {
        seasonLeaves.push({
          x: ix + random(-180, 180), y: iy - random(10, 60),
          vx: random(-0.3, 0.3), vy: random(-0.2, 0.2),
          rot: random(TWO_PI), rotV: 0,
          size: random(2, 3.5), life: 250,
          type: 'firefly',
          c: color(180, 255, 100, 180), phase: random(TWO_PI),
        });
      }
      noStroke();
      let _sfW = 0;
      for (let i = 0; i < seasonLeaves.length; i++) {
        let l = seasonLeaves[i];
        l.x += l.vx + sin(frameCount * 0.01 + i * 1.3) * 0.4;
        l.y += l.vy + cos(frameCount * 0.012 + i * 0.9) * 0.3;
        l.life--;
        if (l.life <= 0) continue;
        seasonLeaves[_sfW++] = l;
        let glow = (sin(frameCount * 0.08 + (l.phase || 0)) + 1) * 0.5;
        fill(180, 255, 100, 40 * glow);
        circle(l.x, l.y, l.size * 4);
        fill(220, 255, 140, 180 * glow);
        circle(l.x, l.y, l.size);
        // Tiny glow trail
        fill(180, 255, 100, 15 * glow);
        rect(floor(l.x) - 1, floor(l.y), 2, 6);
        rect(floor(l.x), floor(l.y) - 1, 6, 2);
      }
      seasonLeaves.length = _sfW;
    } else {
      // Clear fireflies during day
      if (seasonLeaves.some(l => l.type === 'firefly')) seasonLeaves = seasonLeaves.filter(l => l.type !== 'firefly');
    }

  } else if (season === 2) {
    // === AUTUMN (Autumnus) — Falling leaves + misty mornings + harvest glow ===
    let _autumnInterval = _fpsSmooth < 35 ? 24 : 14;
    let _autumnCap = _fpsSmooth < 35 ? 12 : 20;
    if (frameCount % _autumnInterval === 0 && seasonLeaves.length < _autumnCap) {
      let leafColors = [
        color(200, 100, 30, 175), color(220, 150, 40, 170),
        color(180, 70, 25, 165), color(160, 120, 30, 160),
        color(230, 180, 50, 155),
      ];
      seasonLeaves.push({
        x: ix + random(-220, 220), y: iy - random(60, 110),
        vx: random(-0.4, 0.6), vy: random(0.3, 0.9),
        rot: random(TWO_PI), rotV: random(-0.06, 0.06),
        size: random(3, 7), life: 140, type: 'leaf',
        c: leafColors[floor(random(leafColors.length))],
      });
    }
    noStroke();
    let _alW = 0;
    for (let i = 0; i < seasonLeaves.length; i++) {
      let l = seasonLeaves[i];
      l.x += l.vx + sin(frameCount * 0.025 + i) * 0.35;
      l.y += l.vy;
      l.rot += l.rotV;
      l.life--;
      if (l.life <= 0) continue;
      seasonLeaves[_alW++] = l;
      push();
      translate(l.x, l.y);
      rotate(l.rot);
      fill(l.c);
      // Pixel leaf shape — rect + smaller rect for stem
      rect(-l.size * 0.5, -l.size * 0.3, l.size, l.size * 0.6);
      // Leaf vein highlight
      fill(255, 255, 200, 30);
      rect(-1, -l.size * 0.2, 2, l.size * 0.4);
      pop();
    }
    seasonLeaves.length = _alW;
    // Morning mist (early hours)
    let hour = state.time / 60;
    if (hour >= 5 && hour < 9) {
      let mistA = map(hour, 5, 9, 20, 0);
      fill(200, 195, 180, mistA);
      rect(ix - 200, iy - 40, 400, 60);
      fill(210, 205, 190, mistA * 0.6);
      rect(ix - 160, iy - 55, 320, 30);
    }

  } else if (season === 3) {
    // === WINTER (Hiems) — Light snow + frost + bare tree blue tint + breath vapor ===
    let _winterInterval = _fpsSmooth < 35 ? 36 : 22;
    let _winterCap = _fpsSmooth < 35 ? 8 : 14;
    if (frameCount % _winterInterval === 0 && seasonLeaves.length < _winterCap) {
      seasonLeaves.push({
        x: ix + random(-250, 250), y: iy - random(80, 130),
        vx: random(-0.35, 0.35), vy: random(0.2, 0.55),
        rot: 0, rotV: 0,
        size: random(1.5, 4), life: 170,
        type: 'snow',
        c: color(220, 230, 255, 150),
      });
    }
    noStroke();
    let _wlW = 0;
    for (let i = 0; i < seasonLeaves.length; i++) {
      let l = seasonLeaves[i];
      l.x += l.vx + sin(frameCount * 0.018 + i * 0.5) * 0.45;
      l.y += l.vy;
      l.life--;
      if (l.life <= 0) continue;
      seasonLeaves[_wlW++] = l;
      fill(l.c);
      circle(l.x, l.y, l.size);
      // Subtle sparkle on larger flakes
      if (l.size > 3 && sin(frameCount * 0.1 + i) > 0.7) {
        fill(255, 255, 255, 100);
        rect(floor(l.x), floor(l.y) - 1, 1, 3);
        rect(floor(l.x) - 1, floor(l.y), 3, 1);
      }
    }
    seasonLeaves.length = _wlW;
    // Frost on buildings — light blue pixel rects on tops
    if (bright > 0.2) {
      state.buildings.forEach((b, bi) => {
        let bx = w2sX(b.x), by = w2sY(b.y);
        if (bx < -30 || bx > width + 30 || by < -30 || by > height + 30) return;
        fill(200, 220, 245, 40);
        rect(floor(bx) - 12, floor(by) - 18, 24, 2);
        if (bi % 3 === 0) {
          fill(210, 225, 250, 25);
          rect(floor(bx) - 8, floor(by) - 20, 16, 1);
        }
      });
    }
    // Player breath vapor in cold
    if (bright > 0.1) {
      let px = w2sX(state.player.x), py = w2sY(state.player.y);
      if (frameCount % 40 < 15) {
        let breathT = (frameCount % 40) / 15;
        fill(220, 230, 245, 30 * (1 - breathT));
        let bSize = 3 + breathT * 4;
        circle(px + 6, py - 18 - breathT * 6, bSize);
      }
    }
  } else {
    seasonLeaves = [];
  }
}


// ─── AMBIENT WILDLIFE ─────────────────────────────────────────────────────
// Birds perch on buildings, butterflies near farm, fireflies at night
let _wildlifeBirds = null;
let _wildlifeFireflies = null;
let _wildlifeFarmButterflies = null;

function _initWildlifeBirds() {
  if (_wildlifeBirds) return;
  _wildlifeBirds = [];
  for (let i = 0; i < 4; i++) {
    _wildlifeBirds.push({
      x: 0, y: 0, targetX: 0, targetY: 0,
      state: 'perched', wingPhase: random(TWO_PI),
      circleAngle: random(TWO_PI), circleTimer: 0,
      flySpeed: random(1.2, 2.0), needsPerch: true,
    });
  }
}

function _pickBirdPerch(bird) {
  let tall = state.buildings.filter(b => {
    let bp = BLUEPRINTS[b.type];
    return bp && bp.blocks && b.type !== 'fence' && b.type !== 'wall';
  });
  if (tall.length === 0) {
    bird.targetX = WORLD.islandCX + random(-200, 200);
    bird.targetY = WORLD.islandCY + random(-80, -30);
  } else {
    let b = tall[floor(random(tall.length))];
    let bp = BLUEPRINTS[b.type];
    bird.targetX = b.x + random(-8, 8);
    bird.targetY = b.y - (bp ? bp.h * 0.6 : 16) - random(2, 6);
  }
  bird.x = bird.targetX; bird.y = bird.targetY;
  bird.state = 'perched'; bird.needsPerch = false;
}

function updateAmbientWildlife(dt) {
  if (!state || !state.buildings) return;
  let hour = state.time / 60;

  // ── Birds ──
  _initWildlifeBirds();
  let px = state.player.x, py = state.player.y;
  for (let bird of _wildlifeBirds) {
    if (bird.needsPerch) _pickBirdPerch(bird);
    if (bird.state === 'perched') {
      if (dist(px, py, bird.x, bird.y) < 40) {
        bird.state = 'flying';
        bird.circleAngle = atan2(bird.y - py, bird.x - px);
        bird.targetX = bird.x + cos(bird.circleAngle) * random(60, 100);
        bird.targetY = bird.y - random(30, 60);
      }
    } else if (bird.state === 'flying') {
      let dx = bird.targetX - bird.x, dy = bird.targetY - bird.y;
      let d = sqrt(dx * dx + dy * dy);
      if (d < 3) {
        bird.state = 'circling'; bird.circleTimer = random(60, 120);
        bird.circleAngle = random(TWO_PI);
      } else {
        let spd = bird.flySpeed * dt;
        bird.x += (dx / d) * spd; bird.y += (dy / d) * spd;
      }
    } else if (bird.state === 'circling') {
      bird.circleTimer -= dt;
      bird.circleAngle += 0.03 * dt;
      bird.x += cos(bird.circleAngle) * 0.5 * dt;
      bird.y += sin(bird.circleAngle) * 0.3 * dt;
      if (bird.circleTimer <= 0) { _pickBirdPerch(bird); bird.state = 'flying'; }
    }
  }

  // ── Farm butterflies ──
  if (!_wildlifeFarmButterflies) {
    let fCX = WORLD.islandCX - 340, fCY = WORLD.islandCY - 5;
    _wildlifeFarmButterflies = [];
    let wc = [[220,140,60],[200,80,120],[180,120,200]];
    for (let i = 0; i < 3; i++) {
      _wildlifeFarmButterflies.push({
        x: fCX, y: fCY, homeX: fCX, homeY: fCY,
        phase: random(TWO_PI), wingPhase: random(TWO_PI),
        r: wc[i][0], g: wc[i][1], b: wc[i][2],
      });
    }
  }
  let bright = getSkyBrightness();
  if (bright > 0.3) {
    for (let bf of _wildlifeFarmButterflies) {
      bf.phase += 0.015 * dt;
      bf.x = bf.homeX + sin(bf.phase) * 55 + sin(bf.phase * 1.7) * 20;
      bf.y = bf.homeY + cos(bf.phase * 0.8) * 25 + sin(bf.phase * 2.3) * 8;
    }
  }

  // ── Fireflies (hours 21-5) ──
  let isNight = hour >= 21 || hour < 5;
  if (isNight) {
    if (!_wildlifeFireflies) {
      _wildlifeFireflies = [];
      for (let i = 0; i < 10; i++) {
        _wildlifeFireflies.push({
          x: WORLD.islandCX + random(-300, 300),
          y: WORLD.islandCY + random(-100, 80),
          phase: random(TWO_PI), driftPhase: random(TWO_PI),
          speed: random(0.1, 0.3), pulseFreq: random(0.04, 0.08),
        });
      }
    }
    for (let ff of _wildlifeFireflies) {
      ff.phase += ff.speed * 0.01 * dt;
      ff.driftPhase += 0.005 * dt;
      ff.x += sin(ff.phase) * 0.15 * dt;
      ff.y += cos(ff.phase * 0.7) * 0.1 * dt;
      let dx = WORLD.islandCX - ff.x, dy = WORLD.islandCY - ff.y;
      if (sqrt(dx * dx + dy * dy) > 280) { ff.x += dx * 0.001 * dt; ff.y += dy * 0.001 * dt; }
    }
  } else { _wildlifeFireflies = null; }
}

function drawAmbientWildlife() {
  if (!state || !state.buildings) return;
  noStroke();
  let hour = state.time / 60;
  let bright = getSkyBrightness();

  // ── Birds ──
  if (_wildlifeBirds) {
    for (let bird of _wildlifeBirds) {
      let bx = w2sX(bird.x), by = w2sY(bird.y);
      if (bx < -20 || bx > width + 20 || by < -20 || by > height + 20) continue;
      let fpx = floor(bx), fpy = floor(by);
      fill(35, 30, 25, 200);
      if (bird.state === 'perched') {
        rect(fpx - 1, fpy, 3, 2);
        rect(fpx - 2, fpy + 1, 1, 1);
      } else {
        rect(fpx - 1, fpy, 3, 2);
        let wU = sin(frameCount * 0.3 + bird.wingPhase) * 3;
        rect(fpx - 3, fpy - floor(wU), 2, 1);
        rect(fpx + 3, fpy - floor(wU * 0.8), 2, 1);
      }
    }
  }

  // ── Farm butterflies (daytime) ──
  if (_wildlifeFarmButterflies && bright > 0.3) {
    for (let bf of _wildlifeFarmButterflies) {
      let bx = w2sX(bf.x), by = w2sY(bf.y);
      if (bx < -20 || bx > width + 20) continue;
      let fpx = floor(bx), fpy = floor(by);
      let wf = floor(sin(frameCount * 0.25 + bf.wingPhase) * 2);
      fill(bf.r, bf.g, bf.b, 190);
      rect(fpx - 3 - wf, fpy - 1, 2, 2);
      rect(fpx + 1 + wf, fpy - 1, 2, 2);
      fill(40, 30, 20, 180);
      rect(fpx, fpy - 1, 1, 3);
    }
  }

  // ── Fireflies (hours 21-5) ──
  if (_wildlifeFireflies && (hour >= 21 || hour < 5)) {
    for (let ff of _wildlifeFireflies) {
      let fx = w2sX(ff.x), fy = w2sY(ff.y);
      if (fx < -20 || fx > width + 20) continue;
      let fpx = floor(fx), fpy = floor(fy);
      let pulse = (sin(frameCount * ff.pulseFreq + ff.driftPhase) + 1) * 0.5;
      fill(255, 255, 180, floor(25 * pulse));
      rect(fpx - 2, fpy - 2, 5, 5);
      fill(255, 255, 200, floor(200 * pulse));
      rect(fpx, fpy, 2, 2);
    }
  }
}
function getMerchantPortPosition() {
  if (!state.portRight && typeof updatePortPositions === 'function') updatePortPositions();
  return state.portRight;
}


function drawVines(cx, cy, w, h) {
  strokeWeight(2);
  let vinePoints = [
    { ox: -0.42, len: 55 }, { ox: -0.28, len: 35 }, { ox: 0.1, len: 65 },
    { ox: 0.35, len: 50 }, { ox: 0.48, len: 30 },
  ];
  vinePoints.forEach((v, i) => {
    let vx = cx + v.ox * w * 0.45;
    let vy = cy - 18;
    stroke(color(C.vineGreen));
    noFill();
    beginShape();
    for (let t = 0; t <= v.len; t += 4) {
      let swayX = vx + sin(t * 0.1 + frameCount * 0.01 + i) * 6;
      vertex(swayX, vy + t);
    }
    endShape();
    noStroke();
    fill(color(C.vineLight));
    let lx = vx + sin(v.len * 0.1 + frameCount * 0.01 + i) * 6;
    ellipse(lx - 5, vy + v.len * 0.6, 8, 5);
    ellipse(lx + 5, vy + v.len * 0.8, 7, 4);
  });
  noStroke();
}


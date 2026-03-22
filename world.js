// world.js — Island terrain, sky, and world rendering
// Extracted from sketch.js. All globals (state, WORLD, cam, w2sX, w2sY, etc.) live in sketch.js.

// ─── COASTLINE ────────────────────────────────────────────────────────────
let _coastlineVerts = null;
let _coastlineLastRX = 0;
let _coastlineLastRY = 0;

function getCoastlineVerts() {
  let rx = state.islandRX, ry = state.islandRY;
  if (_coastlineVerts && _coastlineLastRX === rx && _coastlineLastRY === ry) return _coastlineVerts;
  _coastlineVerts = [];
  let numVerts = 128;
  let noiseSeed = 42;
  let noiseScale = Math.min(1, ry / 350);
  for (let i = 0; i < numVerts; i++) {
    let angle = (i / numVerts) * TWO_PI;
    let noiseVal = noise(cos(angle) * 2 + noiseSeed, sin(angle) * 2 + noiseSeed);
    let noiseVal2 = noise(cos(angle) * 0.9 + noiseSeed + 100, sin(angle) * 0.9 + noiseSeed + 100);
    let offset = (noiseVal - 0.5) * 0.18 * noiseScale + (noiseVal2 - 0.5) * 0.10 * noiseScale;

    // Angular bias: south wider (beach/port), north narrower (rocky)
    let sy = Math.sin(angle); // +1 at south (PI/2), -1 at north
    offset += sy * 0.03 * noiseScale; // south bulges out, north pulls in

    // Fixed geographic features to break ellipse symmetry
    // West headland/peninsula (angle ~PI)
    let westDist = Math.abs(angle - Math.PI);
    if (westDist < 0.35) offset += (0.35 - westDist) / 0.35 * 0.09 * noiseScale;
    // Northeast bay/indent (angle ~0.4 rad)
    let neDist = Math.abs(angle - 0.4);
    if (neDist < 0.3) offset -= (0.3 - neDist) / 0.3 * 0.075 * noiseScale;
    // South beach — wider flatter area (angle ~PI/2)
    let southDist = Math.abs(angle - Math.PI * 0.5);
    if (southDist < 0.5) offset += (0.5 - southDist) / 0.5 * 0.045 * noiseScale;
    // Northwest peninsula (angle ~3*PI/4)
    let nwDist = Math.abs(angle - Math.PI * 0.75);
    if (nwDist < 0.3) offset += (0.3 - nwDist) / 0.3 * 0.08 * noiseScale;
    // Southeast cove (angle ~5*PI/4)
    let seDist = Math.abs(angle - Math.PI * 1.25);
    if (seDist < 0.25) offset -= (0.25 - seDist) / 0.25 * 0.06 * noiseScale;
    // East bluff (angle ~0.2)
    let eDist = Math.abs(angle - 0.2);
    if (eDist < 0.25) offset += (0.25 - eDist) / 0.25 * 0.05 * noiseScale;

    _coastlineVerts.push({ angle: angle, offset: offset });
  }
  _coastlineLastRX = rx;
  _coastlineLastRY = ry;
  return _coastlineVerts;
}

function drawCoastlineShape(screenCX, screenCY, radiusX, radiusY, yOffset) {
  let verts = getCoastlineVerts();
  beginShape();
  for (let i = 0; i < verts.length; i++) {
    let v = verts[i];
    let r = 1 + v.offset;
    let vx = screenCX + cos(v.angle) * radiusX * r;
    // Attenuate yOffset at east/west edges (sin≈0) to prevent layer misalignment
    let yOff = yOffset * abs(sin(v.angle));
    let vy = (screenCY + yOff) + sin(v.angle) * radiusY * r;
    vertex(vx, vy);
  }
  endShape(CLOSE);
}

// Generic organic coastline shape for any island (distant rendering)
// seed makes each island unique, numVerts kept low for performance
function drawIslandShape(cx, cy, rx, ry, yOff, seed) {
  beginShape();
  let numVerts = 48;
  for (let i = 0; i < numVerts; i++) {
    let angle = (i / numVerts) * TWO_PI;
    let nv = noise(cos(angle) * 2 + seed, sin(angle) * 2 + seed);
    let nv2 = noise(cos(angle) * 0.9 + seed + 100, sin(angle) * 0.9 + seed + 100);
    let offset = (nv - 0.5) * 0.12 + (nv2 - 0.5) * 0.06;
    let r = 1 + offset;
    let vx = cx + cos(angle) * rx * r;
    let vyOff = yOff * abs(sin(angle));
    let vy = (cy + vyOff) + sin(angle) * ry * r;
    vertex(vx, vy);
  }
  endShape(CLOSE);
}

function _getCoastlineRadiusAtAngle(angle, baseRX, baseRY) {
  let verts = getCoastlineVerts();
  // Find the two closest verts and interpolate
  let numVerts = verts.length;
  let normAngle = ((angle % TWO_PI) + TWO_PI) % TWO_PI;
  let idx = (normAngle / TWO_PI) * numVerts;
  let i0 = Math.floor(idx) % numVerts;
  let i1 = (i0 + 1) % numVerts;
  let t = idx - Math.floor(idx);
  let offset = verts[i0].offset * (1 - t) + verts[i1].offset * t;
  let r = 1 + offset;
  return { rx: baseRX * r, ry: baseRY * r };
}

// ─── REUSABLE ISLAND COASTLINE SYSTEM ─────────────────────────────────────
// Parameterized coastline generation + multi-layer rendering for all islands.

const ISLAND_PALETTES = {
  rome:     { water: [30,80,140], shallows: [60,140,160], cliff: [140,110,80], sand: [210,190,140], grass: [80,130,60], accent: [180,50,50] },
  carthage: { water: [30,70,130], shallows: [70,130,150], cliff: [160,130,90], sand: [220,200,150], grass: [110,140,70], accent: [120,50,120] },
  egypt:    { water: [20,60,120], shallows: [50,120,140], cliff: [180,160,100], sand: [230,210,160], grass: [140,150,80], accent: [200,170,50] },
  greece:   { water: [40,90,150], shallows: [80,150,170], cliff: [200,200,200], sand: [220,210,190], grass: [90,140,70], accent: [50,80,160] },
  vulcan:   { water: [20,30,60], shallows: [40,60,80], cliff: [60,40,30], sand: [80,60,50], grass: [50,60,40], accent: [200,80,30] },
  arena:    { water: [30,80,140], shallows: [60,140,160], cliff: [150,120,90], sand: [200,180,130], grass: [90,120,60], accent: [180,150,50] },
  seapeople:{ water: [25,50,90], shallows: [45,80,110], cliff: [100,95,90], sand: [150,145,140], grass: [55,70,60], accent: [80,90,100] },
  persia:   { water: [25,65,125], shallows: [55,125,145], cliff: [170,145,95], sand: [215,195,140], grass: [100,135,65], accent: [170,130,50] },
  phoenicia:{ water: [30,75,135], shallows: [65,135,155], cliff: [155,120,95], sand: [200,180,155], grass: [85,125,60], accent: [140,40,100] },
  gaul:     { water: [35,85,145], shallows: [65,145,165], cliff: [130,120,90], sand: [190,180,145], grass: [60,110,45], accent: [80,100,60] },
  default:  { water: [30,80,140], shallows: [60,140,160], cliff: [140,110,80], sand: [210,190,140], grass: [80,130,60], accent: [100,100,100] },
};

// Cache for generated coastlines: key -> [{angle, r}]
let _islandCoastCache = {};

function generateIslandCoastline(seed, numVerts, rx, ry, features) {
  let cacheKey = seed + '_' + numVerts;
  if (_islandCoastCache[cacheKey]) return _islandCoastCache[cacheKey];
  let verts = [];
  let noiseScale = Math.min(1, ry / 350);
  for (let i = 0; i < numVerts; i++) {
    let angle = (i / numVerts) * TWO_PI;
    let nv = noise(cos(angle) * 2 + seed, sin(angle) * 2 + seed);
    let nv2 = noise(cos(angle) * 0.9 + seed + 100, sin(angle) * 0.9 + seed + 100);
    let offset = (nv - 0.5) * 0.18 * noiseScale + (nv2 - 0.5) * 0.10 * noiseScale;
    // Angular bias: south wider, north narrower
    let sy = Math.sin(angle);
    offset += sy * 0.03 * noiseScale;
    // Apply geographic features
    if (features) {
      for (let f = 0; f < features.length; f++) {
        let feat = features[f];
        let dist = Math.abs(angle - feat.angle);
        if (dist > Math.PI) dist = TWO_PI - dist;
        if (dist < feat.width) {
          let t = (feat.width - dist) / feat.width;
          if (feat.type === 'bay') offset -= t * feat.strength * noiseScale;
          else if (feat.type === 'headland' || feat.type === 'peninsula') offset += t * feat.strength * noiseScale;
        }
      }
    }
    verts.push({ angle: angle, r: 1 + offset });
  }
  _islandCoastCache[cacheKey] = verts;
  return verts;
}

function drawIslandCoastShape(cx, cy, verts, scale, rx, ry, yOffset) {
  yOffset = yOffset || 0;
  beginShape();
  for (let i = 0; i < verts.length; i++) {
    let v = verts[i];
    let vx = cx + cos(v.angle) * rx * v.r * scale;
    let yOff = yOffset * abs(sin(v.angle));
    let vy = (cy + yOff) + sin(v.angle) * ry * v.r * scale;
    vertex(vx, vy);
  }
  endShape(CLOSE);
}

function drawIslandBase(cx, cy, rx, ry, verts, palette, lod) {
  let bright = (typeof getSkyBrightness === 'function') ? getSkyBrightness() : 0.7;
  let p = palette || ISLAND_PALETTES.default;
  noStroke();

  if (lod === 'far') {
    // FAR: shadow + grass
    fill(20, 60, 80, 30);
    drawIslandCoastShape(cx + 3, cy + 4, verts, 1.05, rx, ry, -2);
    fill(p.grass[0], p.grass[1], p.grass[2]);
    drawIslandCoastShape(cx, cy, verts, 0.9, rx, ry, -4);
    return;
  }

  if (lod === 'medium') {
    // MEDIUM: water gradient (3) + beach (2) + grass
    // Water shadow
    fill(20, 60, 80, 30);
    drawIslandCoastShape(cx + 3, cy + 4, verts, 1.08, rx, ry, -2);
    // Shallow water layers
    fill(p.water[0], p.water[1], p.water[2], 120);
    drawIslandCoastShape(cx, cy, verts, 1.05, rx, ry, -2);
    fill(p.shallows[0], p.shallows[1], p.shallows[2], 140);
    drawIslandCoastShape(cx, cy, verts, 1.02, rx, ry, -2);
    fill(lerp(p.shallows[0], p.sand[0], 0.3), lerp(p.shallows[1], p.sand[1], 0.3), lerp(p.shallows[2], p.sand[2], 0.3), 160);
    drawIslandCoastShape(cx, cy, verts, 0.98, rx, ry, -3);
    // Beach
    fill(p.sand[0], p.sand[1], p.sand[2]);
    drawIslandCoastShape(cx, cy, verts, 0.92, rx, ry, -3);
    fill(p.sand[0] - 10, p.sand[1] - 10, p.sand[2] - 5);
    drawIslandCoastShape(cx, cy, verts, 0.88, rx, ry, -4);
    // Grass
    fill(p.grass[0] + 8, p.grass[1] + 8, p.grass[2] + 4);
    drawIslandCoastShape(cx, cy, verts, 0.82, rx, ry, -5);
    fill(p.grass[0], p.grass[1], p.grass[2]);
    drawIslandCoastShape(cx, cy, verts, 0.75, rx, ry, -6);
    return;
  }

  // CLOSE: full stack — water (5) + foam + cliff (3) + beach (4) + grass + rim
  // Deep water shadow
  fill(10, 30, 50, 35);
  drawIslandCoastShape(cx + 4, cy + 5, verts, 1.12, rx, ry, -2);
  // Water gradient (5 layers, deep to shallow)
  fill(p.water[0] - 10, p.water[1] - 10, p.water[2], 100);
  drawIslandCoastShape(cx, cy, verts, 1.10, rx, ry, -1);
  fill(p.water[0], p.water[1], p.water[2], 130);
  drawIslandCoastShape(cx, cy, verts, 1.07, rx, ry, -2);
  fill(lerp(p.water[0], p.shallows[0], 0.3), lerp(p.water[1], p.shallows[1], 0.3), lerp(p.water[2], p.shallows[2], 0.3), 150);
  drawIslandCoastShape(cx, cy, verts, 1.04, rx, ry, -2);
  fill(p.shallows[0], p.shallows[1], p.shallows[2], 170);
  drawIslandCoastShape(cx, cy, verts, 1.02, rx, ry, -3);
  fill(lerp(p.shallows[0], p.sand[0], 0.4), lerp(p.shallows[1], p.sand[1], 0.4), lerp(p.shallows[2], p.sand[2], 0.4), 190);
  drawIslandCoastShape(cx, cy, verts, 1.0, rx, ry, -3);
  // Foam / shore wave
  stroke(220, 235, 255, 25 + sin(frameCount * 0.04) * 12);
  strokeWeight(1.5); noFill();
  drawIslandCoastShape(cx, cy, verts, 0.99 + sin(frameCount * 0.025) * 0.005, rx, ry, -3);
  noStroke();
  // Cliff layers
  fill(p.cliff[0], p.cliff[1], p.cliff[2]);
  drawIslandCoastShape(cx, cy, verts, 0.96, rx, ry, -4);
  fill(p.cliff[0] - 15, p.cliff[1] - 15, p.cliff[2] - 10);
  drawIslandCoastShape(cx, cy, verts, 0.94, rx, ry, -4);
  fill(p.cliff[0] + 10, p.cliff[1] + 5, p.cliff[2]);
  drawIslandCoastShape(cx, cy, verts, 0.92, rx, ry, -5);
  // Beach layers
  fill(p.sand[0] + 5, p.sand[1] + 5, p.sand[2] + 5);
  drawIslandCoastShape(cx, cy, verts, 0.90, rx, ry, -5);
  fill(p.sand[0], p.sand[1], p.sand[2]);
  drawIslandCoastShape(cx, cy, verts, 0.87, rx, ry, -5);
  fill(p.sand[0] - 10, p.sand[1] - 10, p.sand[2] - 8);
  drawIslandCoastShape(cx, cy, verts, 0.84, rx, ry, -6);
  fill(p.sand[0] - 18, p.sand[1] - 15, p.sand[2] - 10);
  drawIslandCoastShape(cx, cy, verts, 0.81, rx, ry, -6);
  // Grass + rim highlight
  fill(p.grass[0] + 12, p.grass[1] + 12, p.grass[2] + 6);
  drawIslandCoastShape(cx, cy, verts, 0.78, rx, ry, -7);
  fill(p.grass[0], p.grass[1], p.grass[2]);
  drawIslandCoastShape(cx, cy, verts, 0.72, rx, ry, -8);
  // Rim highlight (lighter edge on grass)
  fill(p.grass[0] + 20, p.grass[1] + 20, p.grass[2] + 10, 60);
  drawIslandCoastShape(cx, cy, verts, 0.76, rx, ry, -7);
}


// ─── SEASON COLORS ────────────────────────────────────────────────────────
const _seasonGrassPalette = [
  { r: 72, g: 110, b: 48 },  // Spring — lush green
  { r: 82, g: 100, b: 42 },  // Summer — warm olive-gold
  { r: 95, g: 82, b: 38 },   // Autumn — golden amber
  { r: 65, g: 78, b: 55 },   // Winter — sage green
];
const _seasonRimPalette = [
  { r: 88, g: 125, b: 52 },
  { r: 100, g: 110, b: 45 },
  { r: 120, g: 95, b: 38 },
  { r: 78, g: 88, b: 60 },
];

// Season transition lerp state
let _seasonPrev = -1;
let _seasonCur = -1;
let _seasonTransitionProgress = 1; // 1 = fully transitioned
let _seasonPrevGrass = null;
let _seasonPrevRim = null;
const _seasonTransitionFrames = 1800; // 30 seconds at 60fps

function _updateSeasonTransition() {
  let s = getSeason();
  if (_seasonCur === -1) { _seasonCur = s; _seasonPrev = s; }
  if (s !== _seasonCur) {
    _seasonPrev = _seasonCur;
    _seasonCur = s;
    _seasonPrevGrass = { ..._seasonGrassPalette[_seasonPrev] };
    _seasonPrevRim = { ..._seasonRimPalette[_seasonPrev] };
    _seasonTransitionProgress = 0;
  }
  if (_seasonTransitionProgress < 1) {
    _seasonTransitionProgress = min(1, _seasonTransitionProgress + 1 / _seasonTransitionFrames);
  }
}

function _lerpRGB(a, b, t) {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}

function getSeasonGrass() {
  _updateSeasonTransition();
  let target = _seasonGrassPalette[_seasonCur] || _seasonGrassPalette[0];
  if (_seasonTransitionProgress >= 1 || !_seasonPrevGrass) return target;
  let t = _seasonTransitionProgress * _seasonTransitionProgress * (3 - 2 * _seasonTransitionProgress); // smoothstep
  return _lerpRGB(_seasonPrevGrass, target, t);
}

function getSeasonRim() {
  _updateSeasonTransition();
  let target = _seasonRimPalette[_seasonCur] || _seasonRimPalette[0];
  if (_seasonTransitionProgress >= 1 || !_seasonPrevRim) return target;
  let t = _seasonTransitionProgress * _seasonTransitionProgress * (3 - 2 * _seasonTransitionProgress);
  return _lerpRGB(_seasonPrevRim, target, t);
}

// ─── WEATHER TRANSITION STATE ─────────────────────────────────────────────
let weatherTransition = {
  active: false,
  type: null,        // 'storm_in' or 'storm_out'
  progress: 0,       // 0..1 over 5 seconds (300 frames)
  earlyDrops: [],    // pre-storm large drops
};
const _weatherTransFrames = 300; // 5 seconds at 60fps

function updateWeatherTransition() {
  if (!weatherTransition.active) return;
  weatherTransition.progress = min(1, weatherTransition.progress + 1 / _weatherTransFrames);
  if (weatherTransition.progress >= 1) {
    weatherTransition.active = false;
    weatherTransition.type = null;
    weatherTransition.earlyDrops = [];
  }
}

function drawWeatherTransitionEffects() {
  if (!weatherTransition.active) return;
  let t = weatherTransition.progress;

  if (weatherTransition.type === 'storm_in') {
    // Sky gradually darkens
    noStroke();
    let overlayAlpha = t * 55;
    fill(12, 16, 28, overlayAlpha);
    rect(0, 0, width, height);

    // Early large drops before full rain
    if (t < 0.6) {
      // Spawn a few large drops
      if (weatherTransition.earlyDrops.length < 4 && random() < 0.03) {
        weatherTransition.earlyDrops.push({
          x: random(width * 0.1, width * 0.9),
          y: random(-20, -5),
          speed: random(5, 9),
          len: random(14, 22),
          wind: random(-1.0, -0.3),
        });
      }
      stroke(130, 170, 210, 100);
      strokeWeight(2);
      for (let i = weatherTransition.earlyDrops.length - 1; i >= 0; i--) {
        let d = weatherTransition.earlyDrops[i];
        line(d.x, d.y, d.x + d.wind * 4, d.y + d.len);
        d.y += d.speed;
        d.x += d.wind;
        if (d.y > height) weatherTransition.earlyDrops.splice(i, 1);
      }
      noStroke();
    }
  } else if (weatherTransition.type === 'storm_out') {
    // Bright patch in clouds — clearing sky
    let patchAlpha = t * 40;
    noStroke();
    fill(180, 200, 220, patchAlpha);
    let px = width * 0.4 + sin(frameCount * 0.005) * 30;
    let py = height * 0.08;
    ellipse(px, py, 200 + t * 80, 40 + t * 15);
    fill(220, 230, 240, patchAlpha * 0.5);
    ellipse(px + 30, py - 5, 120 + t * 40, 25 + t * 10);
  }
}

// ─── NIGHTFALL DUSK TRIGGER ──────────────────────────────────────────────
let _duskTriggered = false;
let _duskIgnitionFlashes = []; // {x, y, life, maxLife}

function _resetDuskAtDawn() {
  let h = state.time / 60;
  if (h >= 5 && h < 6 && _duskTriggered) _duskTriggered = false;
}

function _triggerDuskMoment() {
  let h = state.time / 60;
  if (_duskTriggered || h < 18 || h >= 18.5) return;
  _duskTriggered = true;

  // Ignition flashes on torches/lanterns
  if (state.buildings) {
    state.buildings.forEach(b => {
      if (b.type === 'torch' || b.type === 'lantern' || b.type === 'campfire') {
        _duskIgnitionFlashes.push({
          x: b.x, y: b.y,
          life: 30, maxLife: 30, // half-second flash
        });
      }
    });
  }

  // Play 3 gentle descending lyre notes: D5, A4, F#4
  if (typeof snd !== 'undefined' && snd) snd.playSFX('dusk_lanterns');
}

function drawDuskIgnitionFlashes() {
  if (_duskIgnitionFlashes.length === 0) return;
  noStroke();
  for (let i = _duskIgnitionFlashes.length - 1; i >= 0; i--) {
    let f = _duskIgnitionFlashes[i];
    let sx = w2sX(f.x);
    let sy = w2sY(f.y);
    let t = f.life / f.maxLife;
    // Bright yellow-white flash that fades
    let flashAlpha = t * 200;
    let flashSize = 12 + (1 - t) * 8;
    fill(255, 240, 140, flashAlpha);
    ellipse(sx, sy - 10, flashSize, flashSize * 0.7);
    fill(255, 255, 200, flashAlpha * 0.6);
    ellipse(sx, sy - 10, flashSize * 0.5, flashSize * 0.35);
    // Tiny sparks
    if (t > 0.5 && random() < 0.4) {
      fill(255, 200, 80, flashAlpha * 0.8);
      let sparkX = sx + random(-6, 6);
      let sparkY = sy - 10 + random(-8, -2);
      rect(sparkX, sparkY, 2, 2);
    }
    f.life--;
    if (f.life <= 0) _duskIgnitionFlashes.splice(i, 1);
  }
}

// ─── CLOUD DATA ───────────────────────────────────────────────────────────
let cloudShadows = [
  { x: -0.3, y: -0.1, w: 120, h: 40, speed: 0.15 },
  { x: 0.2, y: 0.15, w: 90, h: 35, speed: 0.12 },
  { x: 0.6, y: -0.05, w: 100, h: 30, speed: 0.18 },
];

let cloudPositions = null;

// ─── SKY ──────────────────────────────────────────────────────────────────
function drawSunbeams(sunX, sunY, h) {
  // Dawn: h ~5-7, Dusk: h ~17-20
  let isDawn = h >= 5 && h < 7.5;
  let isDusk = h >= 16.5 && h < 20;
  if (!isDawn && !isDusk) return;
  if (stormActive) return;

  let intensity;
  if (isDawn) {
    intensity = 1 - abs(h - 6.2) / 1.2;
  } else {
    intensity = 1 - abs(h - 18) / 1.5;
  }
  intensity = constrain(intensity, 0, 1);
  if (intensity < 0.02) return;

  let skyH = max(height * 0.12, height * 0.25 - horizonOffset);
  noStroke();
  for (let i = 0; i < 6; i++) {
    let angle = -HALF_PI + (i - 2.5) * 0.15;
    let rayLen = skyH * 1.8;
    let baseW = 2;
    let tipW = 60 + i * 12;
    let shimmer = sin(frameCount * 0.025 + i * 1.2) * 8;
    let alpha = (16 + shimmer) * intensity;
    let warmR = isDawn ? 255 : 255;
    let warmG = isDawn ? 200 : 180;
    let warmB = isDawn ? 130 : 100;

    fill(warmR, warmG, warmB, alpha);
    beginShape();
    vertex(sunX - baseW, sunY);
    vertex(sunX + baseW, sunY);
    let endX = sunX + cos(angle) * rayLen;
    let endY = sunY + sin(angle + HALF_PI) * rayLen;
    vertex(endX + tipW / 2, endY);
    vertex(endX - tipW / 2, endY);
    endShape(CLOSE);
  }

  // Extra glow halo around sun during golden hour
  fill(255, 220, 140, 25 * intensity);
  ellipse(sunX, sunY, 45, 45);
  fill(255, 230, 160, 12 * intensity);
  ellipse(sunX, sunY, 65, 65);
}

let _cachedSkyTop = null, _cachedSkyBot = null, _cachedSkyFrame = -1;
function drawSky() {
  let bright = getSkyBrightness();
  let h = state.time / 60;

  let skyTop, skyBot;
  if (frameCount % 30 === 0 || !_cachedSkyTop) {
  if (stormActive) {
    skyTop = lerpColor(color(C.skyDeep), color(C.stormCloud), 0.7);
    skyBot = lerpColor(color(C.skyMid), color(C.stormLight), 0.5);
  } else if (h >= 5 && h < 6.5) {
    let t = map(h, 5, 6.5, 0, 1);
    skyTop = lerpColor(color(18, 16, 42), color(60, 80, 140), t);
    skyBot = lerpColor(color(35, 22, 50), color(220, 140, 100), t);
  } else if (h >= 6.5 && h < 8) {
    let t = map(h, 6.5, 8, 0, 1);
    skyTop = lerpColor(color(60, 80, 140), color(90, 150, 210), t);
    skyBot = lerpColor(color(220, 140, 100), color(200, 210, 230), t);
  } else if (h >= 8 && h < 11) {
    let t = map(h, 8, 11, 0, 1);
    skyTop = lerpColor(color(90, 150, 210), color(80, 145, 215), t);
    skyBot = lerpColor(color(200, 210, 230), color(175, 210, 240), t);
  } else if (h >= 11 && h < 14) {
    skyTop = color(80, 145, 215);
    skyBot = color(170, 210, 240);
  } else if (h >= 14 && h < 16.5) {
    let t = map(h, 14, 16.5, 0, 1);
    skyTop = lerpColor(color(80, 145, 215), color(100, 130, 190), t);
    skyBot = lerpColor(color(170, 210, 240), color(220, 190, 150), t);
  } else if (h >= 16.5 && h < 18.5) {
    let t = map(h, 16.5, 18.5, 0, 1);
    skyTop = lerpColor(color(100, 130, 190), color(50, 35, 80), t);
    skyBot = lerpColor(color(220, 190, 150), color(200, 100, 60), t);
  } else if (h >= 18.5 && h < 20.5) {
    let t = map(h, 18.5, 20.5, 0, 1);
    skyTop = lerpColor(color(50, 35, 80), color(15, 14, 38), t);
    skyBot = lerpColor(color(200, 100, 60), color(30, 20, 50), t);
  } else {
    skyTop = color(10, 12, 30);
    skyBot = color(16, 20, 42);
  }
  _cachedSkyTop = skyTop; _cachedSkyBot = skyBot;
  }
  skyTop = _cachedSkyTop; skyBot = _cachedSkyBot;

  noStroke();
  let skyH = max(height * 0.12, height * 0.25 - horizonOffset); // never compress sky below 12% of screen
  skyH = max(skyH, height * 0.06);

  let hasHorizonBand = (h >= 5 && h < 8) || (h >= 16 && h < 20.5);
  for (let y = 0; y < skyH; y += 2) {
    let t = y / skyH;
    let c = lerpColor(skyTop, skyBot, t);
    if (hasHorizonBand && t > 0.7) {
      let bandT = (t - 0.7) / 0.3;
      let warmG = h < 8 ? 160 : 110;
      let warmB = h < 8 ? 90 : 55;
      let bandA = bandT * bandT * 40;
      fill(min(255, red(c) + 240 * bandA / 255), min(255, green(c) + warmG * bandA / 255), min(255, blue(c) + warmB * bandA / 255));
    } else {
      fill(c);
    }
    rect(0, y, width, 2);
  }

  if ((bright > 0.1 || (h >= 5 && h < 7)) && !stormActive && !(typeof _frameBudget !== 'undefined' && _frameBudget.throttled)) {
    drawDriftClouds(max(bright, 0.15));
  }

  if (bright > 0.05) {
    let sunX = map(h, 5, 20, width * 0.1, width * 0.9);
    let fixedSkyH = height * 0.25;
    let sunArc = map(sin(map(h, 5, 20, 0, PI)), 0, 1, fixedSkyH * 1.05, height * 0.06);
    let sunY = sunArc;
    let sunBright = min(bright, 1) * (typeof stormActive !== 'undefined' && stormActive ? 0.2 : 1);
    drawSun(sunX, sunY, sunBright);
    drawSunbeams(sunX, sunY, h);
    if (bright < 0.35) {
      let glowA = map(bright, 0.05, 0.35, 35, 0);
      fill(255, 160, 60, glowA);
      ellipse(sunX, skyH, 180 + sin(frameCount * 0.012) * 15, 25);
      fill(255, 200, 100, glowA * 0.4);
      ellipse(sunX, skyH, 280, 12);
    }
  }

  if (bright < 0.4) {
    let starAlpha = map(bright, 0, 0.4, 220, 0);
    drawStarField(starAlpha);
    if (bright < 0.25) {
      drawMoonPhased(bright);
    }
  }

  if (stormActive || stormTimer > 300) {
    drawStormClouds();
  }
}

function drawSun(x, y, bright) {
  let r = 12;
  let fx = floor(x), fy = floor(y);
  noStroke();
  // Outer pixel glow — cross shape
  for (let g = 4; g > 0; g--) {
    let s = g * 10;
    fill(220, 140, 20, (5 - g) * 4 * bright);
    rect(fx - 1, fy - s, 2, s * 2);
    rect(fx - s, fy - 1, s * 2, 2);
  }
  // Diagonal rays — stepped pixel beams
  for (let i = 0; i < 8; i++) {
    let angle = (TWO_PI / 8) * i + frameCount * 0.004;
    let len = floor(r * 2.2 + sin(frameCount * 0.04 + i * 1.3) * r * 0.6);
    fill(240, 180, 40, 25 * bright);
    for (let d = r; d < len; d += 3) {
      let rx = floor(fx + cos(angle) * d);
      let ry = floor(fy + sin(angle) * d);
      rect(rx, ry, 2, 2);
    }
  }
  // Sun disc — pixel square with stepped corners
  fill(255, 210, 90, 240 * bright);
  rect(fx - r, fy - r + 3, r * 2, r * 2 - 6);
  rect(fx - r + 3, fy - r, r * 2 - 6, r * 2);
  rect(fx - r + 2, fy - r + 2, r * 2 - 4, r * 2 - 4);
  // Bright core
  fill(255, 240, 180, 200 * bright);
  rect(fx - floor(r * 0.55), fy - floor(r * 0.55), floor(r * 1.1), floor(r * 1.1));
  // Hot center
  fill(255, 255, 230, 150 * bright);
  rect(fx - floor(r * 0.25), fy - floor(r * 0.25), floor(r * 0.5), floor(r * 0.5));
}

function drawStarField(alpha) {
  let _starSkip = (typeof _frameBudget !== 'undefined' && _frameBudget.throttled) ? 6 : 3;
  if (frameCount % _starSkip !== 0) return;
  if (!starPositions) {
    starPositions = [];
    // Background stars — varied sizes and colors
    for (let i = 0; i < 200; i++) {
      let temp = random(); // 0=cool blue, 1=warm yellow
      starPositions.push({
        x: random(width), y: random(height * 0.5),
        s: random(0.5, 3), p: random(TWO_PI),
        twinkleSpeed: random(0.015, 0.06),
        r: lerp(190, 255, temp), g: lerp(210, 240, temp * 0.5), b: lerp(255, 200, temp),
      });
    }
    // Constellation patterns — Orion's belt, Ursa Major, Cassiopeia
    let constellations = [
      // Orion's belt (3 bright aligned stars)
      [{ x: 0.35, y: 0.18 }, { x: 0.37, y: 0.19 }, { x: 0.39, y: 0.20 }],
      // Ursa Major (Big Dipper)
      [{ x: 0.6, y: 0.06 }, { x: 0.63, y: 0.07 }, { x: 0.66, y: 0.065 }, { x: 0.68, y: 0.08 },
       { x: 0.69, y: 0.10 }, { x: 0.67, y: 0.12 }, { x: 0.65, y: 0.11 }],
      // Cassiopeia (W shape)
      [{ x: 0.15, y: 0.08 }, { x: 0.17, y: 0.11 }, { x: 0.19, y: 0.08 }, { x: 0.21, y: 0.12 }, { x: 0.23, y: 0.09 }],
    ];
    constellations.forEach(con => {
      con.forEach(st => {
        starPositions.push({
          x: st.x * width, y: st.y * height,
          s: random(2, 3.5), p: random(TWO_PI),
          twinkleSpeed: random(0.02, 0.04),
          r: 230, g: 240, b: 255, constellation: true,
        });
      });
    });
  }
  noStroke();
  starPositions.forEach(s => {
    let twinkle = map(sin(frameCount * s.twinkleSpeed + s.p), -1, 1, 0.2, 1);
    let a = alpha * twinkle;
    let sz = s.s > 1.8 ? 2 : 1;
    // Star body
    fill(s.r, s.g, s.b, a);
    rect(floor(s.x), floor(s.y), sz, sz);
    // Bright stars get cross-shaped twinkle rays
    if (s.s > 2.2 && twinkle > 0.75) {
      let rayA = a * 0.4 * (twinkle - 0.75) * 4;
      fill(s.r, s.g, s.b, rayA);
      let rayLen = floor(s.s * 1.5);
      rect(floor(s.x) - rayLen, floor(s.y), rayLen * 2 + sz, 1);
      rect(floor(s.x), floor(s.y) - rayLen, 1, rayLen * 2 + sz);
    }
    // Constellation stars get subtle glow
    if (s.constellation && twinkle > 0.5) {
      fill(s.r, s.g, s.b, a * 0.15);
      rect(floor(s.x) - 2, floor(s.y) - 2, sz + 4, sz + 4);
    }
  });
  // Shooting star (rare)
  if (!drawStarField._shootingStar && random() < 0.002) {
    drawStarField._shootingStar = {
      x: random(width * 0.2, width * 0.8), y: random(height * 0.02, height * 0.15),
      vx: random(4, 8) * (random() > 0.5 ? 1 : -1), vy: random(2, 4),
      life: 20, maxLife: 20,
    };
  }
  if (drawStarField._shootingStar) {
    let ss = drawStarField._shootingStar;
    let sa = (ss.life / ss.maxLife) * alpha;
    // Trail
    for (let ti = 0; ti < 6; ti++) {
      let trailA = sa * (1 - ti / 6) * 0.6;
      fill(255, 255, 240, trailA);
      rect(floor(ss.x - ss.vx * ti * 0.4), floor(ss.y - ss.vy * ti * 0.4), 2, 1);
    }
    // Head
    fill(255, 255, 250, sa);
    rect(floor(ss.x), floor(ss.y), 2, 2);
    ss.x += ss.vx; ss.y += ss.vy; ss.life--;
    if (ss.life <= 0) drawStarField._shootingStar = null;
  }
}
// Keep old name as alias for compatibility
function drawStars(alpha) { drawStarField(alpha); }

function drawDriftClouds(bright) {
  if (typeof drawDriftClouds._prevCamY === 'undefined') drawDriftClouds._prevCamY = camSmooth.y;
  let camDY = camSmooth.y - drawDriftClouds._prevCamY;
  drawDriftClouds._prevCamY = camSmooth.y;

  let h = state.time / 60;
  if (!cloudPositions) {
    cloudPositions = [];
    for (let i = 0; i < 8; i++) {
      cloudPositions.push({
        x: random(width * 1.5),
        y: random(height * 0.03, height * 0.22),
        w: random(55, 150),
        h: random(16, 38),
        speed: random(0.06, 0.22),
        depth: random(0.5, 1),
      });
    }
  }
  noStroke();

  let cloudR = 235, cloudG = 240, cloudB = 245;
  let highlightR = 255, highlightG = 255, highlightB = 255;
  let shadowR = 210, shadowG = 218, shadowB = 228;

  if (h >= 5 && h < 7) {
    let dt = map(h, 5, 7, 0, 1);
    cloudR = lerp(180, 235, dt); cloudG = lerp(140, 240, dt); cloudB = lerp(160, 245, dt);
    highlightR = 255; highlightG = lerp(180, 255, dt); highlightB = lerp(160, 255, dt);
    shadowR = lerp(200, 210, dt); shadowG = lerp(120, 218, dt); shadowB = lerp(140, 228, dt);
  } else if (h >= 16.5 && h < 19) {
    let dt = map(h, 16.5, 19, 0, 1);
    cloudR = lerp(245, 160, dt); cloudG = lerp(220, 120, dt); cloudB = lerp(200, 140, dt);
    highlightR = lerp(255, 220, dt); highlightG = lerp(240, 150, dt); highlightB = lerp(200, 130, dt);
    shadowR = lerp(220, 100, dt); shadowG = lerp(180, 70, dt); shadowB = lerp(170, 110, dt);
  } else if (h >= 19 || h < 5) {
    // Night clouds — lighter, more transparent (was too dark, looked like blobs)
    cloudR = 60; cloudG = 65; cloudB = 90;
    highlightR = 80; highlightG = 85; highlightB = 110;
    shadowR = 45; shadowG = 50; shadowB = 70;
  }

  cloudPositions.forEach(cl => {
    cl.x += cl.speed * cl.depth;
    if (cl.x > width + cl.w) cl.x = -cl.w;
    cl.y -= camDY * 0.04;
    cl.y = constrain(cl.y, height * 0.02, height * 0.22);
    // Night clouds: much lower alpha to avoid dark blob appearance
    let nightDim = (h >= 19 || h < 5) ? 0.4 : 1;
    let alpha = map(bright, 0.1, 0.5, 15, 55) * cl.depth * nightDim;
    let cx = floor(cl.x), cy = floor(cl.y);
    let cw = floor(cl.w), ch = floor(cl.h);

    fill(cloudR, cloudG, cloudB, alpha);
    rect(cx - cw * 0.3, cy - ch * 0.15, cw * 0.6, ch * 0.4);
    fill(highlightR, highlightG, highlightB, alpha * 0.75);
    rect(cx - cw * 0.2, cy - ch * 0.35, cw * 0.3, ch * 0.25);
    rect(cx + cw * 0.05, cy - ch * 0.3, cw * 0.22, ch * 0.2);
    fill(cloudR, cloudG, cloudB, alpha * 0.7);
    rect(cx - cw * 0.45, cy - ch * 0.05, cw * 0.2, ch * 0.25);
    rect(cx + cw * 0.28, cy - ch * 0.05, cw * 0.18, ch * 0.22);
    fill(shadowR, shadowG, shadowB, alpha * 0.5);
    rect(cx - cw * 0.25, cy + ch * 0.2, cw * 0.5, ch * 0.12);
    fill(highlightR, highlightG, highlightB, alpha * 0.35);
    rect(cx - cw * 0.15, cy - ch * 0.38, cw * 0.2, ch * 0.1);
  });
}

function drawMoonPhased(bright) {
  let h = state.time / 60;
  // Moon phase based on game day (8 phases over 32 days)
  let phase = (state.day % 32) / 32; // 0=new, 0.5=full, 1=new again
  let moonX = floor(map(h, 20, 30, width * 0.2, width * 0.8));
  if (h < 6) moonX = floor(map(h, 0, 6, width * 0.5, width * 0.9));
  let moonY = floor(height * 0.08 + sin(frameCount * 0.002) * 3);
  let moonAlpha = map(bright, 0, 0.25, 220, 0);
  noStroke();

  // No glow ellipses -- they looked like grey blobs
  let fullness = 1 - abs(phase - 0.5) * 2;

  // Moon body (~8px, small crescent)
  fill(220, 225, 235, moonAlpha);
  rect(moonX - 3, moonY - 4, 6, 8);
  rect(moonX - 4, moonY - 3, 8, 6);
  rect(moonX - 3, moonY - 3, 7, 7);

  // Phase shadow — crescent moves based on phase
  if (phase < 0.45 || phase > 0.55) {
    let shadowSide = phase < 0.5 ? 1 : -1; // which side is shadowed
    let shadowWidth = abs(phase < 0.5 ? (0.5 - phase) * 2 : (phase - 0.5) * 2);
    let sw = floor(shadowWidth * 14);
    fill(10, 18, 35, moonAlpha * 0.8);
    if (shadowSide > 0) {
      rect(moonX + 7 - sw, moonY - 6, sw + 2, 12);
      rect(moonX + 7 - sw + 2, moonY - 7, sw, 14);
    } else {
      rect(moonX - 8, moonY - 6, sw + 2, 12);
      rect(moonX - 8, moonY - 7, sw, 14);
    }
  }

  // Surface craters (always visible on lit part)
  fill(200, 205, 220, moonAlpha * 0.3);
  rect(moonX - 3, moonY + 1, 2, 2);
  rect(moonX - 2, moonY - 3, 2, 2);
  rect(moonX + 2, moonY - 1, 2, 2);

  // Moonbeam on water — cool blue column below moon
  if (fullness > 0.3) {
    let skyH = max(height * 0.06, height * 0.25 - horizonOffset);
    for (let ry = skyH; ry < skyH + 40; ry += 4) {
      let reflA = moonAlpha * 0.04 * fullness * (1 - (ry - skyH) / 40);
      let rw = floor(4 + sin(ry * 0.1 + frameCount * 0.02) * 2);
      fill(180, 200, 230, reflA);
      rect(moonX - rw, ry, rw * 2, 2);
    }
  }
}
// Keep old name as alias
function drawMoon(bright) { drawMoonPhased(bright); }

// ─── ATLANTIS RINGS ───────────────────────────────────────────────────────
function drawAtlantisRings() {
  if (state.islandLevel < 18) return;

  let lvl = state.islandLevel;
  let cx = w2sX(WORLD.islandCX);
  let cy = w2sY(WORLD.islandCY) - 18;
  let bright = getSkyBrightness();
  let isNight = bright < 0.3;

  let iw = state.islandRX * 2;
  let ih = state.islandRY * 2;
  let ySquash = 0.40;

  let rings = [
    { rf: 0.24, cw: 14, startLvl: 18 },
    { rf: 0.52, cw: 12, startLvl: 19 },
    { rf: 0.78, cw: 10, startLvl: 20 },
  ];

  let sg = getSeasonGrass();
  noStroke();

  rings.forEach(function(ring) {
    if (lvl < ring.startLvl) return;

    let fadeIn = min(1, (lvl - ring.startLvl + 1) / 2);
    let alpha = fadeIn * 180;

    let outerRX = iw * ring.rf * 0.5;
    let outerRY = ih * ring.rf * 0.5 * ySquash;
    let innerRX = outerRX - ring.cw;
    let innerRY = outerRY - ring.cw * ySquash;

    let waterR = lerp(20, 40, bright);
    let waterG = lerp(80, 160, bright);
    let waterB = lerp(100, 180, bright);

    fill(waterR, waterG, waterB, alpha);
    ellipse(cx, cy, outerRX * 2, outerRY * 2);

    fill(sg.r, sg.g, sg.b);
    ellipse(cx, cy, innerRX * 2, innerRY * 2);

    let shimmer = sin(frameCount * 0.03 + ring.rf * 10) * 0.3 + 0.5;
    fill(80, 200, 180, 20 * shimmer * fadeIn);
    ellipse(cx, cy, (outerRX - 2) * 2, (outerRY - 1) * 2);

    if (isNight && lvl >= 22) {
      let glowPulse = sin(frameCount * 0.02 + ring.rf * 5) * 0.3 + 0.7;
      fill(0, 220, 190, 25 * glowPulse * fadeIn);
      ellipse(cx, cy, (outerRX + 8) * 2, (outerRY + 4) * 2);
      fill(0, 240, 210, 15 * glowPulse * fadeIn);
      ellipse(cx, cy, outerRX * 2, outerRY * 2);
    }

    if (bright > 0.15) {
      fill(100, 210, 195, 30 * fadeIn);
      for (let r = 0; r < 8; r++) {
        let a = r * TWO_PI / 8 + frameCount * 0.005;
        let midRX = (outerRX + innerRX) / 2;
        let midRY = (outerRY + innerRY) / 2;
        let rx = cx + cos(a) * midRX;
        let ry = cy + sin(a) * midRY;
        ellipse(rx, ry, 6, 3);
      }
    }
  });

  // Bridges at cardinal points
  let bridgeColor = lvl >= 20 ? [200, 195, 180] : [170, 155, 130];
  let crystalAccent = lvl >= 22;

  let bridgeDirs = [
    { angle: -HALF_PI, label: 'N' },
    { angle: HALF_PI, label: 'S' },
    { angle: 0, label: 'E' },
    { angle: PI, label: 'W' },
  ];

  bridgeDirs.forEach(function(bd) {
    rings.forEach(function(ring) {
      if (lvl < ring.startLvl) return;

      let outerRX = iw * ring.rf * 0.5;
      let outerRY = ih * ring.rf * 0.5 * ySquash;

      let bx = cx + cos(bd.angle) * outerRX;
      let by = cy + sin(bd.angle) * outerRY;

      fill(bridgeColor[0], bridgeColor[1], bridgeColor[2]);
      push();
      translate(bx, by);
      let bw = ring.cw + 4;
      let bh = 10;
      if (bd.label === 'N' || bd.label === 'S') {
        rect(-bh / 2, -bw / 2, bh, bw);
        fill(bridgeColor[0] - 15, bridgeColor[1] - 15, bridgeColor[2] - 15);
        rect(-bh / 2, -bw / 2, bh, 2);
        rect(-bh / 2, bw / 2 - 2, bh, 2);
      } else {
        rect(-bw / 2, -bh / 2, bw, bh);
        fill(bridgeColor[0] - 15, bridgeColor[1] - 15, bridgeColor[2] - 15);
        rect(-bw / 2, -bh / 2, 2, bh);
        rect(bw / 2 - 2, -bh / 2, 2, bh);
      }

      if (crystalAccent) {
        fill(80, 220, 200, 180);
        rect(-2, -2, 4, 4);
        if (isNight) {
          fill(80, 240, 210, 40);
          ellipse(0, 0, 12, 8);
        }
      }
      pop();
    });
  });
}

// ─── ISLAND ───────────────────────────────────────────────────────────────
function drawIsland() {
  if (typeof updatePortPositions === 'function') updatePortPositions();
  let ix = w2sX(WORLD.islandCX);
  let iy = w2sY(WORLD.islandCY);
  let iw = state.islandRX * 2;
  let ih = state.islandRY * 2;

  noStroke();
  let bright = getSkyBrightness();
  let dayMix = max(0.15, bright);

  // --- Shallow water gradient (warm lagoon) ---
  // Use drawCoastlineShape so water follows the same organic coastline as the beach
  // This prevents ocean peeking through where noise offsets push the beach outward
  // Opaque base — blocks deep ocean wave patterns from bleeding through semi-transparent layers
  fill(lerp(18, 42, dayMix), lerp(45, 130, dayMix), lerp(68, 170, dayMix));
  drawCoastlineShape(ix, iy, iw * 0.56, ih * 0.25, -10);
  // Outermost: warm medium blue
  fill(lerp(20, 48, dayMix), lerp(50, 140, dayMix), lerp(75, 180, dayMix), 180);
  drawCoastlineShape(ix, iy, iw * 0.56, ih * 0.25, -10);
  // Mid shallow — turquoise
  fill(lerp(25, 60, dayMix), lerp(65, 160, dayMix), lerp(85, 190, dayMix), 200);
  drawCoastlineShape(ix, iy, iw * 0.53, ih * 0.23, -12);
  // Inner shallow — bright warm turquoise
  fill(lerp(30, 80, dayMix), lerp(75, 175, dayMix), lerp(88, 192, dayMix), 210);
  drawCoastlineShape(ix, iy, iw * 0.50, ih * 0.215, -13);
  // Near-shore — lightest aqua
  fill(lerp(38, 95, dayMix), lerp(85, 185, dayMix), lerp(92, 190, dayMix), 220);
  drawCoastlineShape(ix, iy, iw * 0.48, ih * 0.205, -14);

  // Foam waves — animated white froth at water's edge
  let foamPhase = frameCount * 0.02;
  let _foamStep = _fpsSmooth < 40 ? 0.5 : 0.3;
  for (let fa = 0; fa < TWO_PI; fa += _foamStep) {
    let foamPulse = sin(foamPhase + fa * 3) * 0.01 + 0.005;
    let foamBase = _getCoastlineRadiusAtAngle(fa, iw * 0.465, ih * 0.196);
    let foamRX = foamBase.rx + foamPulse * iw;
    let foamRY = foamBase.ry + foamPulse * ih * 0.4;
    let ffx = ix + cos(fa) * foamRX;
    let ffy = (iy - 14 * abs(sin(fa))) + sin(fa) * foamRY;
    fill(255, 255, 255, 40 + sin(foamPhase + fa * 5) * 20);
    ellipse(ffx, ffy, 8 + sin(fa * 2.7) * 3, 3);
  }

  // ─── WATER REFLECTIONS — shimmer band at coastline ───
  let reflPhase = frameCount * 0.015;
  let _reflStep = _fpsSmooth < 40 ? 0.3 : 0.18;
  for (let ra = 0; ra < TWO_PI; ra += _reflStep) {
    let wave = sin(reflPhase + ra * 4) * 0.5 + 0.5;
    let wave2 = sin(reflPhase * 1.3 + ra * 6) * 0.5 + 0.5;
    // Outer shimmer ring — light bouncing off shallow water
    let refBase = _getCoastlineRadiusAtAngle(ra, iw * 0.49, ih * 0.205);
    let refRX = refBase.rx + sin(reflPhase + ra * 2) * 0.005 * iw;
    let refRY = refBase.ry + sin(reflPhase + ra * 2) * 0.002 * ih;
    let rx2 = ix + cos(ra) * refRX;
    let ry2 = (iy - 12 * abs(sin(ra))) + sin(ra) * refRY;
    fill(200, 230, 255, 18 * wave * dayMix);
    rect(floor(rx2) - 3, floor(ry2), 6 + floor(wave2 * 4), 2);
    // Inner shimmer — closer to shore, brighter
    let refBase2 = _getCoastlineRadiusAtAngle(ra, iw * 0.475, ih * 0.198);
    let refRX2 = refBase2.rx + sin(reflPhase * 0.8 + ra * 3) * 0.004 * iw;
    let refRY2 = refBase2.ry + sin(reflPhase * 0.8 + ra * 3) * 0.002 * ih;
    let rx3 = ix + cos(ra) * refRX2;
    let ry3 = (iy - 13 * abs(sin(ra))) + sin(ra) * refRY2;
    fill(220, 240, 255, 22 * wave2 * dayMix);
    rect(floor(rx3) - 2, floor(ry3), 4 + floor(wave * 3), 1);
  }

  // Sandy bottom visible in shallow areas
  if (dayMix > 0.3) {
    let sandAlpha = (dayMix - 0.3) * 50;
    // Pale sand patches showing through clear water
    let sandSeeds = [
      { a: 0.4, r: 0.48 }, { a: 1.2, r: 0.47 }, { a: 2.1, r: 0.49 },
      { a: 3.0, r: 0.46 }, { a: 4.0, r: 0.48 }, { a: 5.2, r: 0.47 },
    ];
    sandSeeds.forEach(s => {
      let sx2 = ix + cos(s.a) * iw * s.r;
      let sy2 = (iy - 12 * abs(sin(s.a))) + sin(s.a) * ih * (s.r * 0.42);
      fill(200, 185, 140, sandAlpha);
      ellipse(sx2, sy2, 14 + sin(s.a * 3.7) * 4, 6);
    });
  }

  // Small fish shadows in shallow water (occasional)
  if (dayMix > 0.3) {
    let fishPhase = frameCount * 0.008;
    for (let fi = 0; fi < 4; fi++) {
      let fa = (fi * 1.7 + fishPhase) % TWO_PI;
      let fishDist = 0.47 + sin(fishPhase * 0.3 + fi * 2.1) * 0.015;
      let fx2 = ix + cos(fa) * iw * fishDist;
      let fy2 = (iy - 12 * abs(sin(fa))) + sin(fa) * ih * (fishDist * 0.42);
      let fishAlpha = 18 + sin(fishPhase * 2 + fi * 3) * 8;
      // Only show occasionally (fish dart in and out)
      if (sin(fishPhase * 0.5 + fi * 4.3) > 0.2) {
        fill(20, 40, 50, fishAlpha * dayMix);
        // Fish body — tiny elongated shadow
        let fishDir = fa + sin(fishPhase + fi) * 0.3;
        let fdx = cos(fishDir) * 3;
        let fdy = sin(fishDir) * 1.2;
        ellipse(fx2, fy2, 6, 2.5);
        // Tail
        rect(floor(fx2 - fdx * 1.5) - 1, floor(fy2 - fdy) - 1, 2, 2);
      }
    }
  }

  // ─── CLIFF EDGE — rocky band between water and beach ───
  // Bottom rock band — outermost, darkest
  fill(130, 115, 88);
  drawCoastlineShape(ix, iy, iw * 0.478, ih * 0.206, -7);
  // Lighter rock/sandstone
  fill(155, 140, 110);
  drawCoastlineShape(ix, iy, iw * 0.477, ih * 0.205, -9);
  // Mid brown dirt
  fill(145, 128, 100);
  drawCoastlineShape(ix, iy, iw * 0.476, ih * 0.204, -11);
  // Dark earth band (innermost cliff layer, transitions to sand)
  fill(140, 122, 95);
  drawCoastlineShape(ix, iy, iw * 0.475, ih * 0.203, -13);

  // ─── BEACH — layered sand strip between water and cliff ───
  // Wet sand at waterline (darkest, simulates wave-lapped sand)
  fill(190, 170, 140);
  drawCoastlineShape(ix, iy, iw * 0.475, ih * 0.205, -13);
  // Wet sand shimmer — subtle water sheen
  let wetShimmer = sin(frameCount * 0.03) * 0.3 + 0.5;
  fill(160, 185, 200, 22 * wetShimmer * dayMix);
  drawCoastlineShape(ix, iy, iw * 0.473, ih * 0.203, -13);
  // Main sand — warm golden beach
  fill(225, 205, 165);
  drawCoastlineShape(ix, iy, iw * 0.470, ih * 0.200, -14);
  // Inner dry sand — lighter, closer to cliff
  fill(235, 218, 178);
  drawCoastlineShape(ix, iy, iw * 0.465, ih * 0.195, -15);
  // Sand-to-grass transition — intermediate earthy tone
  fill(200, 185, 145, 120);
  drawCoastlineShape(ix, iy, iw * 0.456, ih * 0.188, -16);

  // South beach widening — extra sand arc on the south side (port side)
  fill(230, 212, 172, 180);
  for (let ba = PI * 0.3; ba < PI * 0.7; ba += 0.15) {
    let bCoast = _getCoastlineRadiusAtAngle(ba, iw * 0.478, ih * 0.210);
    let bx = ix + cos(ba) * bCoast.rx;
    let by = (iy - 12 * abs(sin(ba))) + sin(ba) * bCoast.ry;
    ellipse(bx, by, 12 + sin(ba * 3.7) * 4, 5);
  }

  // Pebbles scattered along beach (sparse)
  {
    let pebSeeds = [0.3, 1.2, 2.5, 3.8, 5.1];
    pebSeeds.forEach(pa => {
      let pCoast = _getCoastlineRadiusAtAngle(pa, iw * 0.468, ih * 0.198);
      let px2 = floor(ix + cos(pa) * pCoast.rx + sin(pa * 7.3) * 3);
      let py2 = floor((iy - 14 * abs(sin(pa))) + sin(pa) * pCoast.ry + cos(pa * 5.1) * 2);
      fill(120, 108, 88, 70 + sin(pa * 11) * 20);
      rect(px2, py2, 2, 1);
    });
  }

  // ─── COASTAL VARIETY ───
  // North rocky headland (angle PI+0.3 to TWO_PI-0.3)
  {
    for (let ha = PI + 0.3; ha < TWO_PI - 0.3; ha += 0.18) {
      let hCoast = _getCoastlineRadiusAtAngle(ha, iw * 0.462, ih * 0.193);
      let hx = floor(ix + cos(ha) * hCoast.rx + sin(ha * 3.1) * 4);
      let hy = floor((iy - 14 * abs(sin(ha))) + sin(ha) * hCoast.ry + cos(ha * 2.7) * 2);
      fill(88, 78, 62);
      rect(hx - 3, hy - 2, 5 + floor(sin(ha * 5.3) * 2), 3);
      rect(hx, hy - 4, 3, 2);
      // Barnacle clusters on headland rocks
      if (sin(ha * 7.7) > 0.3) {
        fill(105, 98, 82, 90);
        rect(hx + 1, hy, 2, 1);
        rect(hx - 1, hy + 1, 1, 1);
      }
    }
  }
  // East tide pools (angle -0.3 to PI/4) — expanded with organisms
  {
    for (let ta = -0.3; ta < PI / 4; ta += 0.18) {
      let tCoast = _getCoastlineRadiusAtAngle(ta, iw * 0.455, ih * 0.190);
      let tx = ix + cos(ta) * tCoast.rx + sin(ta * 4.1) * 3;
      let ty = (iy - 14 * abs(sin(ta))) + sin(ta) * tCoast.ry + cos(ta * 3.3) * 2;
      // Pool water — animated shimmer
      let poolShimmer = sin(frameCount * 0.04 + ta * 5) * 0.3 + 0.7;
      fill(35, 90, 105, 80 * poolShimmer);
      ellipse(tx, ty, 9 + sin(ta * 7) * 2, 4);
      fill(45, 100, 110, 70);
      ellipse(tx, ty, 7 + sin(ta * 7) * 2, 3);
      // Tiny starfish / anemone in pools
      if (sin(ta * 11.3) > 0.2) {
        fill(180, 80, 60, 100);
        rect(floor(tx) - 1, floor(ty), 2, 2);
      }
      // Sea urchin
      if (cos(ta * 9.1) > 0.6) {
        fill(30, 25, 40, 90);
        ellipse(tx + 2, ty - 1, 3, 2);
      }
    }
  }
  // South beach — sea foam patches (animated wash)
  {
    let foamT = frameCount * 0.015;
    for (let sa = PI * 0.3; sa < PI * 0.8; sa += 0.12) {
      let sfCoast = _getCoastlineRadiusAtAngle(sa, iw * 0.468, ih * 0.198);
      let wave = sin(foamT + sa * 6) * 0.5 + 0.5;
      let sfx = ix + cos(sa) * (sfCoast.rx + wave * 4);
      let sfy = (iy - 14 * abs(sin(sa))) + sin(sa) * (sfCoast.ry + wave * 2);
      fill(255, 255, 255, 20 + wave * 25);
      ellipse(sfx, sfy, 6 + wave * 4, 2);
      // Bubble dots in foam
      if (wave > 0.6) {
        fill(255, 255, 255, 35);
        rect(floor(sfx) + 2, floor(sfy), 1, 1);
        rect(floor(sfx) - 1, floor(sfy) - 1, 1, 1);
      }
    }
  }
  // Beach debris — driftwood, shells, seaweed, pebbles
  {
    let debrisSeeds = [
      { a: PI * 0.35, type: 'driftwood' },
      { a: PI * 0.45, type: 'shell' },
      { a: PI * 0.55, type: 'shell' },
      { a: PI * 0.63, type: 'pebble' },
      { a: PI * 0.70, type: 'seaweed' },
      { a: PI * 0.20, type: 'shell' },
      { a: PI * 0.85, type: 'driftwood' },
      { a: PI * 0.12, type: 'pebble' },
      { a: 0.15, type: 'seaweed' },
      { a: PI * 1.3, type: 'shell' },
      { a: PI * 1.6, type: 'pebble' },
    ];
    debrisSeeds.forEach(d => {
      let dCoast = _getCoastlineRadiusAtAngle(d.a, iw * 0.466, ih * 0.197);
      let dx = floor(ix + cos(d.a) * dCoast.rx + sin(d.a * 5.3) * 3);
      let dy = floor((iy - 15 * abs(sin(d.a))) + sin(d.a) * dCoast.ry);
      if (d.type === 'driftwood') {
        fill(130, 105, 70, 90);
        rect(dx - 5, dy, 10, 2, 1);
        fill(140, 115, 78, 70);
        rect(dx - 4, dy, 8, 1);
      } else if (d.type === 'shell') {
        fill(230, 220, 195, 110);
        ellipse(dx, dy, 4, 2.5);
        fill(240, 232, 210, 80);
        rect(floor(dx), floor(dy) - 1, 1, 1);
      } else if (d.type === 'pebble') {
        fill(105, 95, 78, 80);
        rect(floor(dx), floor(dy), 3, 2);
        fill(90, 82, 68, 60);
        rect(floor(dx) + 1, floor(dy) + 1, 2, 1);
      } else {
        // Seaweed strand
        fill(40, 75, 45, 80);
        rect(dx, dy - 1, 2, 4);
        fill(50, 85, 50, 60);
        rect(dx + 1, dy + 2, 2, 3);
      }
    });
  }

  // Grass top — seasonal colors with terrain variation
  let sg = getSeasonGrass();
  // Base grass (organic coastline)
  fill(sg.r, sg.g, sg.b);
  drawCoastlineShape(ix, iy, iw * 0.45, ih * 0.18, -18);

  // ─── HILLS — 4 elevation mounds (3-layer with sun direction) ───
  let bright2 = getSkyBrightness();
  if (bright2 > 0.1) {
    let hillAlpha = 60 * bright2;

    // H1: Central sacred hill — cast shadow below
    fill(sg.r - 25, sg.g - 20, sg.b - 12, 45 * bright2);
    ellipse(ix + iw * 0.04, iy - 10, iw * 0.18, ih * 0.07);
    // H1 north shadow face
    fill(sg.r - 20, sg.g - 16, sg.b - 10, hillAlpha * 0.9);
    drawCoastlineShape(ix + iw * 0.03, iy + 6, iw * 0.14, ih * 0.065, -16);
    // H1 body
    fill(sg.r + 22, sg.g + 28, sg.b + 10, hillAlpha);
    drawCoastlineShape(ix + iw * 0.03, iy, iw * 0.14, ih * 0.065, -22);
    // H1 south highlight face
    fill(sg.r + 35, sg.g + 40, sg.b + 15, hillAlpha * 0.5);
    drawCoastlineShape(ix + iw * 0.03, iy - 3, iw * 0.12, ih * 0.05, -24);
    // H1 rocky outcrops on shadow side
    fill(88, 78, 62, 110);
    rect(floor(ix + iw * 0.00), floor(iy - 14), 4, 3);
    rect(floor(ix + iw * 0.02), floor(iy - 11), 3, 2);
    rect(floor(ix - iw * 0.02), floor(iy - 12), 5, 3);
    rect(floor(ix + iw * 0.04), floor(iy - 10), 3, 2);
    rect(floor(ix - iw * 0.01), floor(iy - 9), 4, 3);

    // H2: Northwest hill
    // Shadow face
    fill(sg.r - 18, sg.g - 14, sg.b - 9, hillAlpha * 0.7);
    drawCoastlineShape(ix - iw * 0.22, iy + 6, iw * 0.09, ih * 0.05, -14);
    // Body
    fill(sg.r + 16, sg.g + 20, sg.b + 6, hillAlpha * 0.8);
    drawCoastlineShape(ix - iw * 0.22, iy, iw * 0.09, ih * 0.05, -20);
    // Highlight
    fill(sg.r + 28, sg.g + 32, sg.b + 10, hillAlpha * 0.4);
    drawCoastlineShape(ix - iw * 0.22, iy - 3, iw * 0.077, ih * 0.038, -22);
    // Rocky outcrops
    fill(88, 78, 62, 100);
    rect(floor(ix - iw * 0.25), floor(iy - 12), 4, 2);
    rect(floor(ix - iw * 0.23), floor(iy - 10), 3, 2);
    rect(floor(ix - iw * 0.20), floor(iy - 11), 4, 3);

    // H3: East hill (near grove)
    // Shadow face
    fill(sg.r - 16, sg.g - 12, sg.b - 8, hillAlpha * 0.65);
    drawCoastlineShape(ix + iw * 0.24, iy + 6, iw * 0.08, ih * 0.04, -15);
    // Body
    fill(sg.r + 18, sg.g + 22, sg.b + 8, hillAlpha * 0.7);
    drawCoastlineShape(ix + iw * 0.24, iy, iw * 0.08, ih * 0.04, -21);
    // Highlight
    fill(sg.r + 30, sg.g + 34, sg.b + 12, hillAlpha * 0.35);
    drawCoastlineShape(ix + iw * 0.24, iy - 3, iw * 0.068, ih * 0.032, -23);
    // Rocky outcrops
    fill(88, 78, 62, 95);
    rect(floor(ix + iw * 0.21), floor(iy - 10), 3, 2);
    rect(floor(ix + iw * 0.23), floor(iy - 12), 4, 2);
    rect(floor(ix + iw * 0.26), floor(iy - 9), 3, 2);

    // H4: South gentle slope
    // Shadow face
    fill(sg.r - 12, sg.g - 10, sg.b - 6, hillAlpha * 0.45);
    drawCoastlineShape(ix + iw * 0.05, iy + 5, iw * 0.12, ih * 0.04, -7);
    // Body
    fill(sg.r + 10, sg.g + 14, sg.b + 4, hillAlpha * 0.5);
    drawCoastlineShape(ix + iw * 0.05, iy, iw * 0.12, ih * 0.04, -12);
    // Highlight
    fill(sg.r + 22, sg.g + 26, sg.b + 8, hillAlpha * 0.25);
    drawCoastlineShape(ix + iw * 0.05, iy - 2, iw * 0.10, ih * 0.032, -14);

    // Valley shadows between hills
    fill(sg.r - 18, sg.g - 14, sg.b - 10, 35 * bright2);
    ellipse(ix - iw * 0.08, iy - 16, iw * 0.16, ih * 0.06);
    fill(sg.r - 14, sg.g - 12, sg.b - 8, 28 * bright2);
    ellipse(ix + iw * 0.14, iy - 14, iw * 0.13, ih * 0.05);

    // Contour lines — subtle elevation rings on hills
    let contourAlpha = 18 * bright2;
    // H1 contours — concentric rings suggesting height
    noFill();
    stroke(sg.r - 10, sg.g - 8, sg.b - 5, contourAlpha);
    strokeWeight(0.6);
    for (let ci = 1; ci <= 3; ci++) {
      let cFrac = ci * 0.3;
      ellipse(ix + iw * 0.03, iy - 18 - cFrac * 3, iw * 0.14 * (1 - cFrac * 0.3), ih * 0.065 * (1 - cFrac * 0.25));
    }
    // H2 contours
    for (let ci = 1; ci <= 2; ci++) {
      let cFrac = ci * 0.35;
      ellipse(ix - iw * 0.22, iy - 18 - cFrac * 2, iw * 0.09 * (1 - cFrac * 0.3), ih * 0.05 * (1 - cFrac * 0.25));
    }
    // H3 contours
    for (let ci = 1; ci <= 2; ci++) {
      let cFrac = ci * 0.35;
      ellipse(ix + iw * 0.24, iy - 18 - cFrac * 2, iw * 0.08 * (1 - cFrac * 0.3), ih * 0.04 * (1 - cFrac * 0.25));
    }
    noStroke();

    // Ridge grass — lighter strip on hill crests catching sunlight
    fill(sg.r + 30, sg.g + 36, sg.b + 14, hillAlpha * 0.3);
    ellipse(ix + iw * 0.03, iy - 26, iw * 0.10, ih * 0.015);
    fill(sg.r + 26, sg.g + 30, sg.b + 12, hillAlpha * 0.25);
    ellipse(ix - iw * 0.22, iy - 24, iw * 0.06, ih * 0.012);
    ellipse(ix + iw * 0.24, iy - 24, iw * 0.05, ih * 0.010);

    // Erosion gullies — thin dark lines on shadow faces
    stroke(sg.r - 25, sg.g - 20, sg.b - 15, 20 * bright2);
    strokeWeight(0.5);
    // H1 gullies
    line(ix + iw * 0.01, iy - 8, ix + iw * 0.03, iy + 2);
    line(ix + iw * 0.05, iy - 6, ix + iw * 0.06, iy + 4);
    // H2 gully
    line(ix - iw * 0.23, iy - 6, ix - iw * 0.21, iy + 3);
    noStroke();
  }

  // ─── VEGETATION ZONES ───
  if (bright2 > 0.1) {
    // Olive grove — NE quadrant
    fill(55, 80, 38, 55 * bright2);
    ellipse(ix + iw * 0.22, iy - 22, iw * 0.18, ih * 0.10);
    // Olive grove dappled shadow dots
    fill(30, 50, 20, 40 * bright2);
    for (let od = 0; od < 8; od++) {
      let odx = ix + iw * 0.22 + sin(od * 1.9) * iw * 0.07;
      let ody = iy - 22 + cos(od * 2.3) * ih * 0.04;
      ellipse(odx, ody, 8 + sin(od * 3.1) * 3, 4);
    }

    // Scrubland — south shore
    fill(95, 88, 48, 45 * bright2);
    ellipse(ix + iw * 0.06, iy - 6, iw * 0.22, ih * 0.07);

    // Cultivated field — west near farm
    fill(75, 118, 42, 50 * bright2);
    ellipse(ix - iw * 0.28, iy - 18, iw * 0.16, ih * 0.08);
    // Horizontal row lines across field
    fill(55, 95, 30, 35 * bright2);
    for (let fr = -2; fr <= 2; fr++) {
      let frY = floor(iy - 18 + fr * 5);
      rect(floor(ix - iw * 0.36), frY, floor(iw * 0.16), 2);
    }
  }

  // Wildflower patches — scattered colored clusters
  if (bright2 > 0.2) {
    let flowerSeeds = [
      { ox: -0.28, oy: -0.06, c: [225, 185, 60] },   // buttercup yellow
      { ox: 0.18, oy: -0.04, c: [205, 105, 135] },    // wild rose pink
      { ox: -0.12, oy: 0.02, c: [145, 125, 215] },    // lavender
      { ox: 0.32, oy: -0.02, c: [255, 150, 80] },     // poppy orange
      { ox: -0.35, oy: 0.01, c: [180, 210, 120] },    // clover green-white
      { ox: 0.06, oy: -0.08, c: [240, 220, 180] },    // chamomile
    ];
    flowerSeeds.forEach(f => {
      let fx = ix + f.ox * iw * 0.45;
      let fy = iy - 18 + f.oy * ih * 0.36;
      // Tiny flower dots (2-3 per cluster)
      for (let j = 0; j < 3; j++) {
        let dx = sin(f.ox * 17 + j * 2.3) * 4;
        let dy = cos(f.oy * 13 + j * 1.7) * 2;
        fill(f.c[0], f.c[1], f.c[2], 120 * bright2);
        rect(floor(fx + dx), floor(fy + dy), 2, 2);
      }
    });
  }

  // Mossy stones scattered on surface
  let stoneSeeds = [
    { ox: -0.30, oy: -0.03, s: 6 }, { ox: 0.22, oy: -0.06, s: 5 },
    { ox: -0.10, oy: 0.04, s: 4 },  { ox: 0.35, oy: 0.01, s: 7 },
    { ox: -0.40, oy: -0.01, s: 5 },
  ];
  stoneSeeds.forEach(st => {
    let stx = ix + st.ox * iw * 0.42;
    let sty = iy - 18 + st.oy * ih * 0.34;
    // Stone base
    fill(130, 120, 105, 80);
    ellipse(stx, sty, st.s * 1.6, st.s * 0.9);
    // Stone highlight
    fill(155, 145, 130, 60);
    ellipse(stx - 1, sty - 1, st.s * 1.0, st.s * 0.6);
    // Moss patch on stone
    fill(65, 95, 45, 70);
    ellipse(stx + 1, sty, st.s * 0.8, st.s * 0.5);
  });

  // Rim highlight — seasonal, softer (organic coastline)
  let sr2 = getSeasonRim();
  noFill();
  stroke(sr2.r, sr2.g, sr2.b, 120);
  strokeWeight(1.2);
  drawCoastlineShape(ix, iy, iw * 0.45, ih * 0.18, -18);
  noStroke();

  // Cloud shadows — tied to actual drift clouds when available
  if (bright > 0.15) {
    noStroke();
    if (cloudPositions && cloudPositions.length > 0) {
      cloudPositions.forEach(cl => {
        // Project cloud position onto island as shadow
        let shadowX = ix + (cl.x / width - 0.5) * iw * 1.2;
        let shadowY = iy - 18 + (cl.y / height) * ih * 0.6;
        let shadowW = cl.w * 0.4;
        let shadowH = cl.h * 0.2;
        fill(0, 0, 0, 12 * bright * cl.depth);
        ellipse(shadowX, shadowY, shadowW, shadowH);
      });
    } else {
      cloudShadows.forEach(cs => {
        let cx2 = ix + ((cs.x + frameCount * cs.speed * 0.001) % 1.6 - 0.8) * iw;
        let cy2 = iy - 18 + cs.y * ih * 0.3;
        fill(0, 0, 0, 12 * bright);
        ellipse(cx2, cy2, cs.w * 0.5, cs.h * 0.5);
      });
    }
  }

  // Pixel-art ground texture — dithered grass patches
  let sg2 = getSeasonGrass();
  for (let i = -5; i <= 5; i++) {
    let px2 = ix + i * (iw * 0.08) + sin(i * 2.3) * 12;
    let py2 = iy - 20 + sin(i * 1.1) * 5;
    // Dark dither patch
    fill(sg2.r - 12, sg2.g - 10, sg2.b - 6, 40);
    ellipse(px2, py2, 18 + abs(i) * 2, 6);
    // Bright dither dots (pixel texture)
    fill(sg2.r + 18, sg2.g + 22, sg2.b + 8, 35 * dayMix);
    for (let j = 0; j < 3; j++) {
      let dotX = px2 + (j - 1) * 5 + sin(i * 3.7 + j) * 3;
      let dotY = py2 + cos(i * 2.1 + j * 2) * 2;
      rect(dotX, dotY, 2, 2);
    }
  }

  // Atlantis concentric water rings (level 18+)
  drawAtlantisRings();

  // Gravel side-paths from ports to the main road
  noStroke();
  let roadSY2 = w2sY(WORLD.islandCY - 8);
  // Left port path — scattered gravel dots from port down to road
  let portPos = getPortPosition();
  let portSX = w2sX(portPos.x + 30);
  let portSY = w2sY(portPos.y);
  for (let gi = 0; gi < 12; gi++) {
    let gt = gi / 11;
    let gx = lerp(portSX, w2sX(WORLD.islandCX - 280), gt);
    let gy = lerp(portSY, roadSY2, gt);
    fill(145, 135, 118, 60 + gi * 4);
    rect(floor(gx) - 4, floor(gy) - 1, 8, 3, 1);
    // Scattered pebbles
    fill(125, 115, 98, 40);
    rect(floor(gx) - 2 + sin(gi * 2.1) * 3, floor(gy) + 1, 2, 1);
  }

  // Worn dirt paths between major buildings
  drawDirtPaths(ix, iy, iw, ih);

  // District ground fills — paved stone under the city (Era 2+)
  drawDistrictGrounds(ix, iy);

  // Roman road (drawn first so farm zone covers the end)
  drawRomanRoad(ix, iy);

  // Farm zone background — tilled soil area (on top of road)
  drawFarmZoneBG();

  // City wall / pomerium (Era 2+, drawn after roads but before buildings)
  drawCityWall(ix, iy, iw, ih);

  // Harbor port (player ship — left side)
  drawPort();
  // Merchant port (Mercator — right side)
  drawMerchantPort();

  // District props — scarecrow, training dummies, lamp posts, awnings, etc.
  drawDistrictProps(ix, iy);

  // Grass tufts — individual blade clusters
  drawGrassTufts();

  // Rocky shoreline detail — stones along the coast
  drawShoreline(ix, iy, iw, ih);

  // Edge warning glow when player is near deep water (skip when rowing)
  let playerEdge = islandEdgeDist(state.player.x, state.player.y);
  if (!state.rowing.active && !(state.diving && state.diving.active) && playerEdge > 0.05 && !isOnBridge(state.player.x, state.player.y) && !isInShallows(state.player.x, state.player.y)) {
    let warn = map(playerEdge, 0.05, 0.15, 0, 1);
    noFill();
    stroke(255, 60, 40, 80 * warn);
    strokeWeight(3 * warn);
    ellipse(ix, iy - 18, iw * 0.90, ih * 0.36);
    noStroke();
    // Crumbling particle hint
    if (frameCount % 10 === 0 && warn > 0.4) {
      let psx = w2sX(state.player.x);
      let psy = w2sY(state.player.y);
      particles.push({
        x: state.player.x + random(-10, 10),
        y: state.player.y + random(-5, 5),
        vx: random(-0.5, 0.5), vy: random(1, 3),
        life: 30, maxLife: 30, type: 'burst',
        r: 80, g: 60, b: 40, size: random(2, 4), world: true,
      });
    }
  }

  // Expansion indicator
  if (state.islandLevel < 25) {
    drawExpansionZone(ix, iy, iw, ih);
  }
}

// ─── PORT ─────────────────────────────────────────────────────────────────
function drawPort() {
  let port = getPortPosition();
  let px = w2sX(port.x);
  let py = w2sY(port.y);
  let bright = getSkyBrightness();

  push();
  translate(px, py);
  scale(-1, 1); // Mirror — pier extends left
  noStroke();

  // === ROMAN HARBOR (Portus Magnus) ===

  // --- Long stone pier extending far into the sea ---
  // Main pier — long stone walkway
  fill(135, 125, 105);
  rect(-30, -10, 180, 20, 3);
  // Top surface — lighter sandstone
  fill(165, 155, 138);
  rect(-30, -10, 180, 5, 3, 3, 0, 0);
  // Stone block lines
  stroke(120, 110, 95, 60);
  strokeWeight(0.5);
  for (let bx = -25; bx < 145; bx += 14) {
    line(bx, -9, bx, 9);
  }
  line(-28, 0, 148, 0);
  line(-28, -5, 148, -5);
  noStroke();

  // --- Breakwater arm curving into sea (protective wall) ---
  fill(120, 112, 98);
  beginShape();
  vertex(140, -10);
  vertex(170, -6);
  vertex(180, 4);
  vertex(175, 16);
  vertex(165, 22);
  vertex(150, 24);
  vertex(140, 18);
  vertex(140, 12);
  endShape(CLOSE);
  // Breakwater top surface
  fill(145, 138, 122);
  beginShape();
  vertex(140, -10);
  vertex(170, -6);
  vertex(168, -1);
  vertex(140, -5);
  endShape(CLOSE);

  // --- Stone arches under the pier ---
  fill(105, 98, 85);
  for (let i = 0; i < 8; i++) {
    let bx = -20 + i * 22;
    rect(bx, 8, 8, 14);
    fill(95, 88, 75);
    arc(bx + 4, 8, 8, 6, 0, PI);
    fill(105, 98, 85);
  }
  // Water between pillars
  fill(30, 80, 120, 50);
  for (let i = 0; i < 7; i++) {
    let bx = -12 + i * 22;
    rect(bx, 10, 14, 10);
  }

  // --- Stone steps from island down to pier ---
  for (let s = 0; s < 4; s++) {
    fill(155 - s * 5, 145 - s * 5, 130 - s * 5);
    rect(-38 - s * 6, -6 + s * 3, 12, 4, 1);
  }

  // --- Twin columns at pier entrance ---
  for (let ci = 0; ci < 2; ci++) {
    let cx = -32 + ci * 22;
    fill(170, 160, 145);
    rect(cx, -32, 5, 24);
    fill(150, 142, 128);
    rect(cx - 1, -10, 7, 3, 1);
    fill(175, 165, 150);
    rect(cx - 1, -34, 7, 3, 1);
  }
  // Lintel between columns
  fill(160, 152, 138);
  rect(-34, -36, 27, 2, 1);

  // --- Mooring bollards along the pier ---
  fill(150, 140, 120);
  for (let i = 0; i < 5; i++) {
    let bx = -10 + i * 32;
    rect(bx, -14, 5, 6, 1);
    fill(160, 150, 130);
    rect(bx - 1, -16, 7, 3, 2);
    fill(150, 140, 120);
  }

  // --- Trident symbol ---
  stroke(140, 120, 60);
  strokeWeight(1.2);
  let tx = 60, ty = -14;
  line(tx, ty, tx, ty - 12);
  line(tx - 4, ty - 10, tx + 4, ty - 10);
  line(tx - 4, ty - 10, tx - 5, ty - 13);
  line(tx, ty - 10, tx, ty - 14);
  line(tx + 4, ty - 10, tx + 5, ty - 13);
  noStroke();

  // --- Braziers at end of pier ---
  for (let bi = 0; bi < 2; bi++) {
    let bx2 = 120 + bi * 30;
    fill(90, 70, 40);
    rect(bx2, -8, 6, 5, 1);
    fill(110, 85, 45);
    rect(bx2 - 2, -10, 10, 3, 2);
    if (bright < 0.6) {
      let flicker = sin(frameCount * 0.15 + bi * 2) * 0.3 + 0.7;
      fill(255, 160, 40, 45 * flicker * (1 - bright));
      circle(bx2 + 3, -12, 16);
    }
  }

  // --- Fishing nets draped over pier edge ---
  stroke(120, 105, 75, 70);
  strokeWeight(0.5);
  for (let ni = 0; ni < 6; ni++) {
    let nx = 40 + ni * 16;
    // Horizontal net lines drooping off pier
    let droop = 4 + sin(ni * 1.7) * 2;
    line(nx, 9, nx + 8, 9 + droop);
    line(nx + 4, 9, nx + 10, 9 + droop - 1);
    // Vertical threads
    for (let nj = 0; nj < 3; nj++) {
      let tx = nx + nj * 4;
      line(tx, 9, tx + 1, 9 + droop * 0.7);
    }
  }
  // Net weight (cork floats)
  noStroke();
  fill(180, 150, 100, 90);
  for (let fi = 0; fi < 4; fi++) {
    ellipse(44 + fi * 16, 10, 3, 3);
  }

  // --- Small fishing dinghy moored alongside ---
  {
    let dinghyX = 50, dinghyY = 20;
    let dinghyBob = sin(frameCount * 0.035 + 1.5) * 1.5;
    push();
    translate(dinghyX, dinghyY + dinghyBob);
    noStroke();
    // Water lap
    fill(180, 210, 230, 15 + sin(frameCount * 0.04) * 6);
    rect(-12, 4, 24, 2);
    // Hull
    fill(100, 65, 30);
    beginShape();
    vertex(-10, -1); vertex(-8, 4); vertex(8, 4);
    vertex(10, -1); vertex(8, -3); vertex(-8, -3);
    endShape(CLOSE);
    // Plank lines
    stroke(85, 55, 22, 50); strokeWeight(0.4);
    line(-7, 0, 7, 0); line(-6, 2, 6, 2);
    noStroke();
    // Bench
    fill(110, 75, 35);
    rect(-5, -2, 10, 2);
    // Oar resting inside
    stroke(90, 65, 30); strokeWeight(0.8);
    line(-9, -2, 9, 3);
    noStroke();
    // Mooring rope to pier
    stroke(140, 120, 80, 70); strokeWeight(0.6);
    bezier(-8, -3, -10, -6, -14, -12, -12, -15);
    noStroke();
    pop();
  }

  // --- Crates, barrels, amphorae --- pixel
  // Barrel
  fill(110, 80, 45);
  rect(25, -9, 10, 12);
  fill(100, 70, 38);
  rect(25, -3, 10, 2); // barrel band
  fill(120, 88, 50);
  rect(26, -9, 8, 1); // top rim
  // Crate
  fill(120, 90, 50);
  rect(90, -8, 10, 8);
  fill(130, 100, 55);
  rect(90, -8, 10, 2);
  // Amphora pair — pixel
  for (let ai = 0; ai < 2; ai++) {
    let ax = 101 + ai * 10;
    fill(160, 110, 70);
    rect(ax, -8, 6, 10);
    fill(150, 100, 60);
    rect(ax + 1, -11, 4, 3); // neck
    fill(145, 98, 58);
    rect(ax - 1, -11, 8, 2); // handles/rim
  }
  // Rope coil on pier
  fill(140, 115, 75, 80);
  ellipse(15, -5, 7, 7);
  fill(155, 130, 85, 60);
  ellipse(15, -5, 4, 4);
  fill(125, 100, 65, 50);
  ellipse(15, -5, 2, 2);

  // --- Pier edge wear — water stains and algae ---
  fill(50, 80, 60, 25);
  rect(-28, 6, 170, 3); // algae line at waterline
  fill(90, 105, 80, 20);
  for (let wi = 0; wi < 8; wi++) {
    rect(-20 + wi * 22, 4, 10, 2);
  }

  // --- Player's trireme (NAVIS PARVA) docked — side-view ---
  if (!state.rowing.active) {
    let boatX = 90, boatY = 18;
    let boatBob = sin(frameCount * 0.03) * 2;
    push();
    translate(boatX, boatY + boatBob);
    noStroke();

    // Water lapping — pixel
    fill(180, 210, 230, floor(20 + sin(frameCount * 0.04) * 8));
    rect(-45, 12, 90, 4);
    rect(-40, 16, 80, 2);
    // Hull reflection
    fill(40, 70, 100, 18);
    rect(-40, 12, 80, 3);

    // Hull — side-view trireme
    fill(75, 45, 20);
    beginShape();
    vertex(-42, 0); vertex(-38, 8); vertex(30, 8);
    vertex(42, 3); vertex(48, -1); vertex(38, -3);
    vertex(-34, -3); vertex(-40, -1);
    endShape(CLOSE);
    // Planking
    stroke(90, 55, 25, 70); strokeWeight(0.5);
    line(-36, 2, 38, 2); line(-34, 5, 35, 5);
    noStroke();

    // Bronze ram
    fill(160, 120, 40);
    beginShape(); vertex(40, -2); vertex(52, 0); vertex(40, 2); endShape(CLOSE);
    fill(180, 140, 50, 150);
    triangle(42, -1, 50, 0, 42, 1);

    // Oars (resting, angled down)
    stroke(100, 70, 35); strokeWeight(1);
    for (let i = 0; i < 6; i++) {
      let ox = -28 + i * 10;
      line(ox, 7, ox - 2, 7 + 10);
    }
    noStroke();

    // Deck
    fill(100, 68, 32);
    rect(-36, -5, 72, 4, 1);
    // Rail
    fill(85, 55, 25);
    rect(-36, -6.5, 72, 1.5, 1);

    // Shields along rail — pixel
    for (let i = 0; i < 6; i++) {
      let shx = floor(-28 + i * 10);
      fill(160, 35, 25); rect(shx - 2, -9, 5, 5);
      fill(190, 160, 60); rect(shx - 1, -8, 2, 2);
    }

    // Mast + furled sail
    fill(90, 60, 28);
    rect(-2, -36, 3, 30, 1);
    // Yard arm
    fill(80, 52, 24);
    rect(-18, -34, 36, 2.5, 1);
    // Furled sail on yard
    fill(220, 205, 175, 200);
    rect(-16, -32, 32, 4, 2);
    // Red stripe
    fill(160, 40, 30, 160);
    rect(-16, -30, 32, 1.5, 1);

    // Rigging
    stroke(100, 80, 50, 70); strokeWeight(0.6);
    line(0, -36, -36, -5); line(0, -36, 36, -5);
    noStroke();

    // Stern post (curved)
    noFill(); stroke(120, 80, 30); strokeWeight(2);
    beginShape();
    vertex(-38, -3); quadraticVertex(-44, -14, -36, -22);
    endShape();
    noStroke();
    // Eagle — pixel
    fill(180, 140, 50); rect(-38, -26, 5, 5);
    fill(200, 160, 60); rect(-37, -29, 3, 3); // head
    fill(190, 150, 55); rect(-39, -25, 2, 3); rect(-35, -25, 2, 3); // wings

    // Stern cabin
    fill(80, 50, 22); rect(-40, -5, 9, 6, 1);
    fill(95, 65, 30); rect(-39, -4, 7, 4, 1);
    fill(140, 170, 180, 60); rect(-37, -3, 3, 2, 0.5);

    // Bow tower (raised forecastle)
    fill(110, 78, 38);
    rect(22, -16, 14, 12, 1);
    fill(125, 90, 45);
    rect(23, -15, 12, 10, 1);
    // Windows
    fill(50, 30, 10);
    rect(26, -13, 2, 4); rect(30, -13, 2, 4);
    // Crenellations
    fill(110, 78, 38);
    for (let ci = 0; ci < 3; ci++) { rect(22 + ci * 5, -19, 3, 3); }
    // Tower railing
    fill(100, 70, 34);
    rect(21, -16, 16, 1.5, 1);
    // Captain in tower — pixel
    fill(160, 35, 25); rect(28, -14, 5, 7); // tunic
    fill(180, 150, 70); rect(28, -15, 5, 3); // belt
    fill(210, 170, 120); rect(28, -19, 5, 5); // head
    fill(190, 160, 60); rect(27, -20, 7, 2); // helmet
    fill(200, 50, 40); rect(29, -22, 2, 2); // crest

    // Flag at mast
    let fw2 = sin(frameCount * 0.04) * 2.5;
    fill(160, 40, 30);
    beginShape();
    vertex(0, -36); vertex(0, -42); vertex(9 + fw2, -39);
    endShape(CLOSE);

    // Anchor
    stroke(110, 110, 110); strokeWeight(1.2);
    line(34, 3, 34, 11);
    noStroke();
    fill(100, 100, 100); rect(33, 11, 3, 3);
    stroke(100, 100, 100); strokeWeight(0.8);
    line(32, 11, 30, 14); line(36, 11, 38, 14);
    noStroke();

    pop();

    // Rope from boat to bollard
    stroke(160, 140, 90, 80);
    strokeWeight(0.8);
    noFill();
    bezier(boatX - 18, boatY, boatX - 22, boatY - 8, 82, -8, 86, -11);
    noStroke();
  }

  pop();
}

function drawMerchantPort() {
  let mp = getMerchantPortPosition();
  let px = w2sX(mp.x);
  let py = w2sY(mp.y);
  let bright = getSkyBrightness();

  push();
  translate(px, py);
  noStroke();

  // === MERCHANT DOCK (Emporium) ===

  // --- Long stone pier extending far into sea ---
  fill(135, 125, 105);
  rect(-10, -8, 190, 16, 2);
  // Top surface
  fill(165, 155, 138);
  rect(-10, -8, 190, 4, 2, 2, 0, 0);
  // Stone blocks
  stroke(120, 110, 95, 50); strokeWeight(0.5);
  for (let bx = -5; bx < 175; bx += 12) line(bx, -7, bx, 7);
  line(-8, 0, 178, 0); line(-8, -4, 178, -4);
  noStroke();

  // --- Stone arches under pier ---
  fill(105, 98, 85);
  for (let i = 0; i < 9; i++) {
    let bx = -5 + i * 20;
    rect(bx, 6, 6, 10);
    fill(95, 88, 75); arc(bx + 3, 6, 6, 5, 0, PI); fill(105, 98, 85);
  }
  fill(30, 80, 120, 40);
  for (let i = 0; i < 8; i++) rect(1 + i * 20, 8, 14, 8);

  // --- Storage house (Horreum) ---
  // Foundation
  fill(120, 112, 100);
  rect(-55, -28, 48, 32, 2);
  // Walls
  fill(175, 160, 135);
  rect(-53, -26, 44, 24, 1);
  // Roof
  fill(140, 80, 40);
  beginShape();
  vertex(-57, -28); vertex(-31, -40); vertex(-5, -28);
  endShape(CLOSE);
  fill(155, 92, 48);
  beginShape();
  vertex(-55, -28); vertex(-31, -38); vertex(-7, -28);
  endShape(CLOSE);
  // Roof tiles
  stroke(125, 70, 35, 60); strokeWeight(0.5);
  for (let i = 0; i < 4; i++) {
    let ry2 = -28 - i * 3;
    line(-52 + i * 5, ry2, -10 - i * 5, ry2);
  }
  noStroke();
  // Door
  fill(100, 65, 30);
  rect(-35, -12, 8, 14, 1, 1, 0, 0);
  fill(85, 55, 25);
  rect(-34, -11, 6, 12, 1, 1, 0, 0);
  // Door handle
  fill(160, 140, 60);
  circle(-29, -5, 2);
  // Windows
  fill(140, 170, 190, 100);
  rect(-48, -20, 5, 5, 0.5);
  rect(-20, -20, 5, 5, 0.5);
  // Window bars
  stroke(100, 80, 50, 80); strokeWeight(0.5);
  line(-46, -20, -46, -15); line(-18, -20, -18, -15);
  noStroke();
  // Sign: HORREUM
  fill(110, 75, 35);
  rect(-45, -34, 28, 6, 1);
  fill(200, 180, 130);
  textSize(4); textAlign(CENTER, CENTER);
  text('EMPORIUM', -31, -31);

  // --- Crates and barrels outside --- pixel
  // Barrels
  for (let i = 0; i < 3; i++) {
    let bx2 = floor(-12 + i * 10);
    fill(110, 80, 45);
    rect(bx2, -17, 8, 10);
    fill(100, 70, 38);
    rect(bx2, -12, 8, 2); // band
    fill(105, 75, 42);
    rect(bx2, -15, 8, 1); // upper band
    fill(115, 85, 48);
    rect(bx2, -17, 8, 1); // top rim
  }
  // Crates
  fill(120, 90, 50);
  rect(22, -18, 8, 8);
  fill(130, 100, 55);
  rect(22, -18, 8, 2);
  fill(115, 85, 48);
  rect(30, -16, 7, 7);
  fill(125, 95, 52);
  rect(30, -16, 7, 2);

  // --- Amphorae --- pixel
  for (let ai = 0; ai < 2; ai++) {
    let ax = floor(38 + ai * 9);
    fill(160, 110, 70);
    rect(ax, -14, 5, 9);
    fill(150, 100, 60);
    rect(ax + 1, -17, 3, 3); // neck
    fill(145, 98, 58);
    rect(ax - 1, -17, 7, 2); // rim/handles
  }

  // --- Mooring bollards ---
  fill(150, 140, 120);
  for (let i = 0; i < 3; i++) {
    let bx3 = 10 + i * 30;
    rect(bx3, -11, 4, 5, 1);
    fill(160, 150, 130);
    rect(bx3 - 1, -13, 6, 2, 1);
    fill(150, 140, 120);
  }

  // --- Braziers ---
  for (let bi = 0; bi < 2; bi++) {
    let bx4 = 70 + bi * 25;
    fill(90, 70, 40);
    rect(bx4, -6, 5, 4, 1);
    fill(110, 85, 45);
    rect(bx4 - 1, -8, 7, 2, 1);
    if (bright < 0.6) {
      let flicker = sin(frameCount * 0.15 + bi * 2) * 0.3 + 0.7;
      fill(255, 160, 40, 40 * flicker * (1 - bright));
      circle(bx4 + 2.5, -10, 14);
    }
  }

  // --- Ox cart carrying goods (animated when Mercator docked) ---
  if (state.ship.state === 'docked') {
    // Ox walks back and forth: storage (-40) to pier end (150)
    let oxCycle = (frameCount * 0.4) % 380; // full cycle length
    let oxX, oxDir;
    if (oxCycle < 190) {
      // Walking to ship (right) — ox sprite faces left, so flip
      oxX = -40 + oxCycle;
      oxDir = -1;
    } else {
      // Walking back to storage (left) — ox naturally faces left
      oxX = 150 - (oxCycle - 190);
      oxDir = 1;
    }
    let oxY = -2;
    let legPhase = sin(frameCount * 0.12) * 2;

    push();
    translate(oxX, oxY);
    scale(oxDir, 1);
    noStroke();

    // Cart wheels — pixel
    fill(100, 70, 35);
    rect(-16, 2, 8, 8);
    rect(4, 2, 8, 8);
    // Wheel cross spokes
    fill(80, 55, 25);
    rect(-13, 5, 2, 2); rect(-16, 5, 8, 1); rect(-13, 2, 1, 8);
    rect(7, 5, 2, 2); rect(4, 5, 8, 1); rect(7, 2, 1, 8);
    // Hub caps — pixel
    fill(140, 110, 50);
    rect(-13, 5, 2, 2); rect(7, 5, 2, 2);

    // Cart bed
    fill(120, 85, 45);
    rect(-15, -2, 26, 7, 1);
    // Cart sides
    fill(110, 78, 40);
    rect(-15, -4, 26, 2, 0.5);
    // Axle
    fill(90, 65, 30);
    rect(-14, 4, 24, 1.5);

    // Cargo on cart (sacks when going to ship, empty when returning)
    if (oxCycle < 190) {
      // Full: sacks of grain/crystals
      fill(180, 160, 110);
      rect(-10, -8, 8, 6); // grain sack
      rect(-1, -7, 7, 5);
      fill(170, 150, 100);
      rect(-5, -10, 6, 5); // top sack
      // Crystal poking out
      fill(80, 200, 160, 180);
      beginShape();
      vertex(3, -8); vertex(5, -12); vertex(7, -8);
      endShape(CLOSE);
    }

    // Yoke/harness connecting ox to cart
    stroke(100, 70, 30); strokeWeight(1.2);
    line(-16, 1, -24, 1);
    noStroke();
    // Yoke crossbar
    fill(110, 80, 40);
    rect(-26, -1, 4, 3, 0.5);

    // Ox body — pixel
    let bobOx = floor(sin(frameCount * 0.12) * 0.5);
    // Body
    fill(160, 130, 90);
    rect(-40, -6 + bobOx, 16, 10);
    // Belly lighter
    fill(175, 150, 110);
    rect(-38, -2 + bobOx, 12, 6);
    // Head
    fill(150, 120, 80);
    rect(-44, -6 + bobOx, 8, 7);
    // Snout
    fill(170, 140, 100);
    rect(-46, -4 + bobOx, 3, 3);
    // Nostrils
    fill(100, 70, 50);
    rect(-46, -3 + bobOx, 1, 1);
    rect(-46, -2 + bobOx, 1, 1);
    // Eye
    fill(40, 25, 10);
    rect(-41, -5 + bobOx, 2, 2);
    fill(255, 255, 255, 120);
    rect(-41, -5 + bobOx, 1, 1);
    // Horns — pixel
    noStroke();
    fill(200, 180, 140);
    rect(-42, -9 + bobOx, 2, 3);
    rect(-39, -9 + bobOx, 2, 3);
    rect(-43, -10 + bobOx, 1, 2);
    rect(-38, -10 + bobOx, 1, 2);
    // Ears
    fill(140, 110, 75);
    rect(-38, -6 + bobOx, 3, 2);
    rect(-45, -6 + bobOx, 3, 2);
    // Legs (animated)
    fill(130, 100, 65);
    let fl = legPhase;
    rect(-37 + fl * 0.3, 3, 2.5, 6, 0.5); // front left
    rect(-35 - fl * 0.3, 3, 2.5, 6, 0.5); // front right
    rect(-29 - fl * 0.3, 3, 2.5, 6, 0.5); // back left
    rect(-27 + fl * 0.3, 3, 2.5, 6, 0.5); // back right
    // Hooves
    fill(80, 55, 30);
    rect(-37 + fl * 0.3, 8, 2.5, 1.5, 0.5);
    rect(-35 - fl * 0.3, 8, 2.5, 1.5, 0.5);
    rect(-29 - fl * 0.3, 8, 2.5, 1.5, 0.5);
    rect(-27 + fl * 0.3, 8, 2.5, 1.5, 0.5);
    // Tail
    stroke(130, 100, 65); strokeWeight(1);
    let tailSwing = sin(frameCount * 0.08) * 3;
    noFill();
    bezier(-24, -1 + bobOx, -20, -3, -18, tailSwing, -17, 2 + tailSwing);
    noStroke();
    // Tail tuft
    fill(120, 90, 55);
    circle(-17, 2 + tailSwing, 2.5);

    pop();

    // Dust puffs behind ox
    if (frameCount % 12 === 0) {
      let dustX = oxX + (oxDir < 0 ? 10 : -45) * oxDir;
      particles.push({
        x: mp.x + dustX * 0.7, y: mp.y + 4,
        vx: random(-0.2, 0.2), vy: random(-0.3, -0.1),
        life: 15, maxLife: 15, type: 'dust', size: random(2, 3),
        r: 140, g: 125, b: 100, world: true,
      });
    }

    // Gold coins floating up from storage
    let ship = state.ship;
    for (let e of (ship.autoSellLog || [])) {
      let age = frameCount - e.t;
      if (age < 60) {
        let alpha = 255 * (1 - age / 60);
        fill(255, 200, 50, alpha);
        let coinY = -38 - age * 0.4;
        circle(-31 + sin(age * 0.1) * 4, coinY, 5);
        fill(220, 180, 40, alpha);
        textSize(9); textAlign(CENTER);
        text('+' + e.gold + 'g', -31 + sin(age * 0.1) * 4, coinY - 6);
      }
    }
    // Active trade glow on building
    let glow = sin(frameCount * 0.05) * 0.3 + 0.7;
    fill(255, 200, 50, 15 * glow);
    rect(-55, -28, 48, 32, 2);
  }

  // --- Trade route line to pier ---
  stroke(160, 140, 90, 40);
  strokeWeight(0.5);
  let dashLen = 6;
  for (let d = 0; d < 60; d += dashLen * 2) {
    line(-8 + d, 0, -8 + d + dashLen, 0);
  }
  noStroke();

  pop();
}

// ─── SHORELINE ────────────────────────────────────────────────────────────
function drawShoreline(ix, iy, iw, ih) {
  // Rocky shore details around the full island perimeter
  noStroke();
  let rx = iw * 0.46;
  let ry = ih * 0.19;
  let rockSeeds = [
    { a: 0.3, s: 5 }, { a: 0.8, s: 7 }, { a: 1.4, s: 4 },
    { a: 2.0, s: 6 }, { a: 2.6, s: 5 }, { a: 3.2, s: 8 },
    { a: 3.8, s: 3 }, { a: 4.4, s: 4 }, { a: 5.0, s: 6 },
    { a: 5.6, s: 5 }, { a: 0.9, s: 4 }, { a: 4.8, s: 7 },
    { a: 1.8, s: 3 }, { a: 3.5, s: 5 }, { a: 5.3, s: 4 },
    { a: 0.5, s: 3 }, { a: 2.3, s: 4 }, { a: 4.1, s: 3 },
  ];
  rockSeeds.forEach((r, i) => {
    let rockX = ix + cos(r.a) * (rx + 2);
    let rockY = (iy - 18) + sin(r.a) * (ry + 2);
    // Rock shadow
    fill(60 + i * 2, 52 + i * 2, 40 + i, 40);
    ellipse(rockX + 1, rockY + 1, r.s * 2, r.s * 1.2);
    // Rock body — varied colors (grey, brown, sandstone)
    let colorVar = i % 3;
    if (colorVar === 0) fill(85 + i * 3, 75 + i * 2, 58 + i * 2);
    else if (colorVar === 1) fill(100 + i * 2, 90 + i * 2, 72 + i);
    else fill(75 + i * 3, 72 + i * 2, 62 + i * 2);
    ellipse(rockX, rockY, r.s * 2, r.s * 1.2);
    // Highlight
    fill(110 + i * 2, 100 + i * 2, 82 + i, 140);
    ellipse(rockX - 1, rockY - 1, r.s * 1.2, r.s * 0.7);
    // Wet sheen on rocks near water
    fill(150, 180, 200, 25);
    ellipse(rockX, rockY + 0.5, r.s * 1.5, r.s * 0.5);
  });
  // Tiny pebbles scattered between rocks
  for (let p = 0; p < 20; p++) {
    let pa = p * 0.33 + 0.15;
    let px = ix + cos(pa) * (rx + 5 + sin(p * 1.7) * 3);
    let py = (iy - 18) + sin(pa) * (ry + 5 + cos(p * 2.3) * 2);
    fill(120, 110, 90, 50);
    rect(floor(px), floor(py), 2, 1);
  }
}

// ─── DISTRICT GROUND FILLS — paved stone under city districts ──────────────

// Draw a single rectangular insula with flagstone texture
function _drawInsula(x, y, w, h, baseR, baseG, baseB, alpha) {
  noStroke();
  // Solid base fill
  fill(baseR, baseG, baseB, alpha);
  rect(x, y, w, h);

  // Flagstone grid — 10px intervals, 2-3 alternating stone tones
  let toneOffsets = [0, 6, -4]; // lighter, darker variations
  let idx = 0;
  for (let gy = y; gy < y + h; gy += 10) {
    for (let gx = x; gx < x + w; gx += 10) {
      let ti = toneOffsets[idx % 3];
      idx++;
      let bw = min(10, x + w - gx);
      let bh = min(10, y + h - gy);
      // Stone block fill with slight variation
      fill(baseR + ti, baseG + ti - 1, baseB + ti - 2, alpha);
      rect(gx + 1, gy + 1, bw - 1, bh - 1);
    }
    // Shift pattern each row for less uniform look
    idx += 1;
  }

  // Mortar lines (horizontal)
  stroke(baseR - 20, baseG - 22, baseB - 25, alpha * 0.3);
  strokeWeight(1);
  for (let gy = y; gy <= y + h; gy += 10) {
    line(x, gy, x + w, gy);
  }
  // Mortar lines (vertical)
  for (let gx = x; gx <= x + w; gx += 10) {
    line(gx, y, gx, y + h);
  }
  noStroke();
}

// Draw a side street (narrow gap between insulae)
function _drawSideStreet(x, y, w, h, ep) {
  noStroke();
  fill(ep.roadLine[0], ep.roadLine[1], ep.roadLine[2], 140);
  rect(x, y, w, h);
}

// ─── CITY WALL / POMERIUM ─────────────────────────────────────────────────
function drawCityWall(ix, iy, iw, ih) {
  let lvl = state.islandLevel || 1;
  if (lvl < 9) return; // Era 2+ only

  let ep = getEraPalette();
  let bright = getSkyBrightness();
  let isNight = bright < 0.3;

  // Wall boundary — 70% of walkable ellipse, capped to a reasonable city size
  let wallRX = min(getSurfaceRX() * 0.70, 320);
  let wallRY = min(getSurfaceRY() * 0.70, 140);
  let wx1 = w2sX(WORLD.islandCX - wallRX), wy1 = w2sY(WORLD.islandCY - wallRY);
  let wx2 = w2sX(WORLD.islandCX + wallRX), wy2 = w2sY(WORLD.islandCY + wallRY);
  let ww = wx2 - wx1, wh = wy2 - wy1;

  // Wall thickness and height by era
  let wallH = lvl >= 18 ? 8 : 5;
  let wallThick = 4;

  // Stone colors — darker than building stone
  let sr = 90, sg = 82, sb = 72;
  if (lvl >= 18) { sr = 105; sg = 98; sb = 88; } // Era 3: lighter, grander stone

  // Gate openings: Decumanus (E-W) passes through left and right walls
  // Cardo (N-S) passes through top and bottom walls
  let decY = w2sY(392); // Decumanus centerline (WORLD.islandCY - 8)
  let cardoX = w2sX(612); // Cardo centerline
  let gateW = 28; // gate opening width
  let gateH = 28;

  noStroke();

  // --- Wall shadow (subtle drop shadow) ---
  fill(0, 0, 0, 20);
  // Top wall shadow
  rect(wx1, wy1 + wallH, ww, 3);
  // Bottom wall shadow
  rect(wx1, wy2 + wallH, ww, 3);
  // Left wall shadow
  rect(wx1 + wallThick, wy1, 3, wh);
  // Right wall shadow
  rect(wx2 + wallThick, wy1, 3, wh);

  // --- Draw 4 wall segments with gate openings (Era 3) ---
  fill(sr, sg, sb);

  if (lvl >= 18) {
    // TOP WALL — gate opening for Cardo
    rect(wx1, wy1 - wallH, cardoX - wx1 - gateW / 2, wallH);
    rect(cardoX + gateW / 2, wy1 - wallH, wx2 - (cardoX + gateW / 2), wallH);
    // BOTTOM WALL — gate opening for Cardo
    rect(wx1, wy2, cardoX - wx1 - gateW / 2, wallH);
    rect(cardoX + gateW / 2, wy2, wx2 - (cardoX + gateW / 2), wallH);
    // LEFT WALL — gate opening for Decumanus
    rect(wx1 - wallThick, wy1 - wallH, wallThick, (decY - wy1 + wallH) - gateH / 2);
    rect(wx1 - wallThick, decY + gateH / 2, wallThick, wy2 + wallH - (decY + gateH / 2));
    // RIGHT WALL — gate opening for Decumanus
    rect(wx2, wy1 - wallH, wallThick, (decY - wy1 + wallH) - gateH / 2);
    rect(wx2, decY + gateH / 2, wallThick, wy2 + wallH - (decY + gateH / 2));

    // --- Crenellations (top wall only, every 16px) ---
    let crenH = 3;
    let crenW = 6;
    fill(sr + 10, sg + 10, sb + 8);
    for (let cx = wx1; cx < wx2; cx += 16) {
      // Skip crenellations over gate openings
      if (abs(cx - cardoX) < gateW / 2 + 4) continue;
      // Top wall crenellations
      rect(cx, wy1 - wallH - crenH, crenW, crenH);
      // Bottom wall crenellations
      rect(cx, wy2 + wallH, crenW, crenH);
    }
    for (let cy = wy1; cy < wy2; cy += 16) {
      if (abs(cy - decY) < gateH / 2 + 4) continue;
      // Left wall crenellations
      rect(wx1 - wallThick - crenH, cy, crenH, crenW);
      // Right wall crenellations
      rect(wx2 + wallThick, cy, crenH, crenW);
    }

    // --- Gate torch glow at night ---
    if (isNight) {
      let nightGlow = map(bright, 0, 0.3, 1, 0);
      let ga = 45 * nightGlow;
      // North gate (Cardo top)
      fill(255, 180, 80, ga);
      ellipse(cardoX, wy1 - wallH / 2, 20, 14);
      fill(255, 220, 120, ga * 0.5);
      ellipse(cardoX, wy1 - wallH / 2, 32, 22);
      // South gate (Cardo bottom)
      fill(255, 180, 80, ga);
      ellipse(cardoX, wy2 + wallH / 2, 20, 14);
      fill(255, 220, 120, ga * 0.5);
      ellipse(cardoX, wy2 + wallH / 2, 32, 22);
      // West gate (Decumanus left)
      fill(255, 180, 80, ga);
      ellipse(wx1 - wallThick / 2, decY, 14, 20);
      fill(255, 220, 120, ga * 0.5);
      ellipse(wx1 - wallThick / 2, decY, 22, 32);
      // East gate (Decumanus right)
      fill(255, 180, 80, ga);
      ellipse(wx2 + wallThick / 2, decY, 14, 20);
      fill(255, 220, 120, ga * 0.5);
      ellipse(wx2 + wallThick / 2, decY, 22, 32);
    }
  } else {
    // Era 2 (level 9-17): simple low wall, no gates or crenellations
    // TOP WALL
    rect(wx1, wy1 - wallH, ww, wallH);
    // BOTTOM WALL
    rect(wx1, wy2, ww, wallH);
    // LEFT WALL
    rect(wx1 - wallThick, wy1 - wallH, wallThick, wh + wallH * 2);
    // RIGHT WALL
    rect(wx2, wy1 - wallH, wallThick, wh + wallH * 2);
  }

  // --- Wall top highlight (lighter stone edge) ---
  fill(sr + 20, sg + 18, sb + 15, 100);
  if (lvl >= 18) {
    // Top wall highlight (with gate gap)
    rect(wx1, wy1 - wallH, cardoX - wx1 - gateW / 2, 1);
    rect(cardoX + gateW / 2, wy1 - wallH, wx2 - (cardoX + gateW / 2), 1);
  } else {
    rect(wx1, wy1 - wallH, ww, 1);
  }

  // --- Corner watchtowers (4 decorative 8x12 towers) ---
  let twW = 8, twH = 12;
  let twColor = lvl >= 18 ? [sr + 8, sg + 6, sb + 5] : [sr - 5, sg - 5, sb - 5];
  fill(twColor[0], twColor[1], twColor[2]);
  // NW tower
  rect(wx1 - wallThick - twW / 2 + 2, wy1 - wallH - twH, twW, twH);
  // NE tower
  rect(wx2 + wallThick - twW / 2 - 2, wy1 - wallH - twH, twW, twH);
  // SW tower
  rect(wx1 - wallThick - twW / 2 + 2, wy2 + wallH, twW, twH);
  // SE tower
  rect(wx2 + wallThick - twW / 2 - 2, wy2 + wallH, twW, twH);
  // Tower top caps (lighter)
  fill(twColor[0] + 15, twColor[1] + 12, twColor[2] + 10, 140);
  rect(wx1 - wallThick - twW / 2 + 2, wy1 - wallH - twH, twW, 2);
  rect(wx2 + wallThick - twW / 2 - 2, wy1 - wallH - twH, twW, 2);
  rect(wx1 - wallThick - twW / 2 + 2, wy2 + wallH, twW, 2);
  rect(wx2 + wallThick - twW / 2 - 2, wy2 + wallH, twW, 2);
}

function drawDistrictGrounds(ix, iy) {
  if (state.islandLevel < 5) return;
  let ep = getEraPalette();
  let bright = getSkyBrightness();
  let dayMix = max(0.15, bright);

  let iw = state.islandRX * 2;
  let ih = state.islandRY * 2;
  noStroke();

  // Clip district paving to the walkable island ellipse
  push();
  noStroke(); // ensure no stroke leaks into clip
  let _clipRX = getSurfaceRX() * 0.85;
  let _clipRY = getSurfaceRY() * 0.85;
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.ellipse(ix, iy - 18, _clipRX, _clipRY, 0, 0, Math.PI * 2);
  drawingContext.clip();

  // Subtle faction ground tint (reduced from 65 to 30 alpha)
  let _fgt = (typeof getFactionBuildingColors === 'function') ? getFactionBuildingColors().groundTint : null;
  if (_fgt) {
    noStroke();
    fill(_fgt[0], _fgt[1], _fgt[2], 30);
    ellipse(ix, iy - 18, _clipRX * 2, _clipRY * 2);
  }

  // Era 1 (Lv 5-8): Small packed-earth plaza — rectangular, not elliptical
  if (ep.era === 1) {
    let _gt = _fgt || [175, 155, 125];
    let pr = lerp(_gt[0] - 15, _gt[0], dayMix), pg = lerp(_gt[1] - 15, _gt[1], dayMix), pb = lerp(_gt[2] - 15, _gt[2], dayMix);
    let pw = iw * 0.18, ph = ih * 0.10;
    _drawInsula(ix + iw * 0.02 - pw / 2, iy - 20 - ph / 2, pw, ph, pr, pg, pb, 100);
    drawingContext.restore();
    pop();
    return;
  }

  // Era 2+ (Lv 9+): Rectangular insulae blocks with side streets

  let coreAlpha = ep.era >= 3 ? 210 : 190;
  let streetW = 4; // side street width

  // ── DECUMANUS CORRIDOR — wide E-W paved strip — faction tinted ──
  let decY = iy - 18;
  let decH = ih * 0.03;
  let _roadR = _fgt ? lerp(ep.roadBase[0], _fgt[0], 0.3) : ep.roadBase[0];
  let _roadG = _fgt ? lerp(ep.roadBase[1], _fgt[1], 0.3) : ep.roadBase[1];
  let _roadB = _fgt ? lerp(ep.roadBase[2], _fgt[2], 0.3) : ep.roadBase[2];
  fill(_roadR, _roadG, _roadB, 130);
  rect(ix - iw * 0.35, decY - decH / 2, iw * 0.70, decH);

  // ── CARDO CORRIDOR — N-S paved strip — faction tinted ──
  let cardoX = ix + iw * 0.02;
  let cardoW = iw * 0.024;
  fill(_roadR, _roadG, _roadB, 110);
  rect(cardoX - cardoW / 2, iy - 18 - ih * 0.12, cardoW, ih * 0.22);

  // ── CIVIC CORE (NE of cardo/decumanus intersection) — pale stone ──
  // Two insulae blocks separated by a N-S side street
  let coreX = cardoX + cardoW / 2 + 2;
  let coreY = decY - decH / 2 - ih * 0.09;
  let coreW1 = iw * 0.10;
  let coreW2 = iw * 0.08;
  let coreH = ih * 0.08;
  _drawInsula(coreX, coreY, coreW1, coreH,
    ep.stoneBase[0] + 8, ep.stoneBase[1] + 5, ep.stoneBase[2] - 2, coreAlpha);
  _drawSideStreet(coreX + coreW1, coreY, streetW, coreH, ep);
  _drawInsula(coreX + coreW1 + streetW, coreY, coreW2, coreH,
    ep.stoneBase[0] + 10, ep.stoneBase[1] + 6, ep.stoneBase[2], coreAlpha - 10);

  // ── CIVIC CORE SOUTH (SE of intersection) — forum ground ──
  let forumX = cardoX + cardoW / 2 + 2;
  let forumY = decY + decH / 2 + 2;
  let forumW = iw * 0.14;
  let forumH = ih * 0.06;
  _drawInsula(forumX, forumY, forumW, forumH,
    ep.stoneBase[0] + 5, ep.stoneBase[1] + 2, ep.stoneBase[2] - 4, coreAlpha - 5);

  // ── TEMPLE COURT — distinct open gathering plaza ──
  {
    let tcX = forumX + 4, tcY = forumY + 2;
    let tcW = forumW - 8, tcH = forumH - 4;
    // Cream/sandstone floor
    fill(lerp(200, 225, dayMix), lerp(185, 215, dayMix), lerp(155, 185, dayMix), coreAlpha + 20);
    rect(tcX, tcY, tcW, tcH);
    // Subtle inner border (worn stone edge)
    stroke(ep.stoneBase[0] - 15, ep.stoneBase[1] - 18, ep.stoneBase[2] - 20, 60);
    strokeWeight(1);
    noFill();
    rect(tcX + 2, tcY + 2, tcW - 4, tcH - 4);
    noStroke();
    // Column markers at corners (small grey stone pillars)
    let colC = [ep.stoneBase[0] - 20, ep.stoneBase[1] - 22, ep.stoneBase[2] - 18];
    fill(colC[0], colC[1], colC[2], 180);
    rect(tcX + 2, tcY + 1, 4, 5);
    rect(tcX + tcW - 6, tcY + 1, 4, 5);
    rect(tcX + 2, tcY + tcH - 6, 4, 5);
    rect(tcX + tcW - 6, tcY + tcH - 6, 4, 5);
    // Decorative urns at mid-edges
    fill(160, 110, 70, 140);
    ellipse(tcX + tcW / 2, tcY + 1, 5, 4);
    ellipse(tcX + tcW / 2, tcY + tcH - 1, 5, 4);
  }

  // E-W side street below forum
  _drawSideStreet(forumX, forumY + forumH, forumW, streetW, ep);

  // ── MARKET EAST — darker paving, two blocks stacked vertically ──
  let mktX = coreX + coreW1 + streetW + coreW2 + streetW;
  let mktY = coreY + 2;
  let mktW = iw * 0.09;
  let mktH1 = ih * 0.05;
  let mktH2 = ih * 0.04;
  _drawInsula(mktX, mktY, mktW, mktH1,
    ep.roadBase[0] - 15, ep.roadBase[1] - 18, ep.roadBase[2] - 22, 180);
  _drawSideStreet(mktX, mktY + mktH1, mktW, streetW, ep);
  _drawInsula(mktX, mktY + mktH1 + streetW, mktW, mktH2,
    ep.roadBase[0] - 12, ep.roadBase[1] - 15, ep.roadBase[2] - 18, 165);

  // N-S side street connecting market to decumanus
  _drawSideStreet(mktX - streetW, decY - decH / 2 - ih * 0.09, streetW, ih * 0.09, ep);

  // ── RESIDENTIAL NW — warm tan, two blocks west of cardo ──
  let resX = cardoX - cardoW / 2 - 2 - iw * 0.12;
  let resY = decY - decH / 2 - ih * 0.08;
  let resW1 = iw * 0.06;
  let resW2 = iw * 0.05;
  let resH = ih * 0.07;
  _drawInsula(resX, resY, resW1, resH,
    ep.floorBase[0] - 5, ep.floorBase[1] - 8, ep.floorBase[2] - 18, 150);
  _drawSideStreet(resX + resW1, resY, streetW, resH, ep);
  _drawInsula(resX + resW1 + streetW, resY, resW2, resH,
    ep.floorBase[0], ep.floorBase[1] - 4, ep.floorBase[2] - 14, 145);

  // E-W side street connecting residential to cardo
  _drawSideStreet(resX, resY + resH, iw * 0.12, streetW, ep);

  // ── MILITARY SE — grey stone, two blocks south of decumanus, east side ──
  let milX = cardoX + cardoW / 2 + iw * 0.08;
  let milY = decY + decH / 2 + ih * 0.04;
  let milW1 = iw * 0.08;
  let milW2 = iw * 0.06;
  let milH = ih * 0.055;
  _drawInsula(milX, milY, milW1, milH,
    ep.roadBase[0] - 8, ep.roadBase[1] - 8, ep.roadBase[2] - 4, 160);
  _drawSideStreet(milX + milW1, milY, streetW, milH, ep);
  _drawInsula(milX + milW1 + streetW, milY, milW2, milH,
    ep.roadBase[0] - 5, ep.roadBase[1] - 5, ep.roadBase[2] - 2, 150);

  // N-S side street from military to decumanus
  _drawSideStreet(milX + milW1 / 2 - streetW / 2, decY + decH / 2, streetW, milY - decY - decH / 2, ep);

  // ── DISTRICT BORDER LINES — thin paths separating zones ──
  stroke(ep.roadLine[0] - 5, ep.roadLine[1] - 5, ep.roadLine[2] - 3, 55);
  strokeWeight(2);
  // Civic/residential border (N-S line west of cardo)
  line(resX + resW1 + streetW + resW2 + 2, resY - 2, resX + resW1 + streetW + resW2 + 2, resY + resH + streetW + 2);
  // Civic/market border (N-S line east of civic)
  line(mktX - 2, mktY - 2, mktX - 2, mktY + mktH1 + streetW + mktH2 + 2);
  // Civic/military border (E-W line south of decumanus)
  line(milX - 2, milY - 2, milX + milW1 + streetW + milW2 + 2, milY - 2);
  noStroke();

  // ── CITY BOUNDARY / POMERIUM (Era 2+) ──
  // Low stone wall — rectangles around the built area
  if (ep.era >= 2) {
    let bx = ix - iw * 0.22;
    let by = iy - 18 - ih * 0.14;
    let bw = iw * 0.50;
    let bh = ih * 0.26;
    let wallC = ep.era >= 3
      ? [ep.wallAccent[0], ep.wallAccent[1], ep.wallAccent[2]]
      : [ep.roadLine[0] - 10, ep.roadLine[1] - 10, ep.roadLine[2] - 8];
    let wallAlpha = ep.era >= 3 ? 130 : 100;
    // Draw boundary as spaced stone blocks (not solid line)
    noStroke();
    for (let wx = bx; wx < bx + bw; wx += 8) {
      // Top wall
      fill(wallC[0], wallC[1], wallC[2], wallAlpha);
      rect(wx, by, 6, 3);
      // Bottom wall
      fill(wallC[0] - 5, wallC[1] - 5, wallC[2] - 3, wallAlpha - 15);
      rect(wx, by + bh, 6, 3);
    }
    for (let wy = by; wy < by + bh; wy += 8) {
      // Left wall
      fill(wallC[0] - 3, wallC[1] - 3, wallC[2] - 2, wallAlpha - 10);
      rect(bx, wy, 3, 6);
      // Right wall
      fill(wallC[0] - 3, wallC[1] - 3, wallC[2] - 2, wallAlpha - 10);
      rect(bx + bw, wy, 3, 6);
    }
  }

  // ── Era 3: teal glow on paving at night ──
  if (ep.era >= 3 && bright < 0.3) {
    let nightGlow = map(bright, 0, 0.3, 1, 0);
    fill(60, 200, 180, 12 * nightGlow);
    // Glow over the main paved area
    rect(ix - iw * 0.22, iy - 18 - ih * 0.14, iw * 0.50, ih * 0.26);
  }

  // Restore ellipse clip
  drawingContext.restore();
  pop();
}

// ─── ROMAN ROAD ───────────────────────────────────────────────────────────
function drawRomanRoad(ix, iy) {
  // Via Romana — era-aware road across the island
  let ep = getEraPalette();
  let roadY = WORLD.islandCY - 8; // consistent centerline
  let shrineSX = w2sX(WORLD.islandCX - 440);
  let farmSX = w2sX(WORLD.islandCX - 340);
  let templeSX = w2sX(WORLD.islandCX);
  let groveSX = w2sX(WORLD.islandCX + 200);
  let roadSY = w2sY(roadY); // one Y for the whole road

  function drawRoadSeg(x1, y1, x2, y2, segs) {
    let rw = ep.era === 1 ? 16 : 20;
    noStroke();
    // Dark gravel/earth base (wider) — pixel
    for (let i = 0; i <= segs; i++) {
      let t = i / segs;
      let rx = floor(lerp(x1, x2, t)), ry = floor(lerp(y1, y2, t) + sin(t * PI) * 3);
      let edgeJitter = ep.era === 1 ? sin(i * 1.7) * 1.5 : 0;
      fill(ep.roadLine[0], ep.roadLine[1], ep.roadLine[2], 110);
      rect(rx - (rw + 6) / 2 + edgeJitter, ry - 2, rw + 6, 4);
    }
    // Road surface — pixel
    for (let i = 0; i <= segs; i++) {
      let t = i / segs;
      let rx = floor(lerp(x1, x2, t)), ry = floor(lerp(y1, y2, t) + sin(t * PI) * 3);
      fill(ep.roadBase[0], ep.roadBase[1], ep.roadBase[2], 155);
      rect(rx - rw / 2, ry - 2, rw, 4);
      if (i % 2 === 0) {
        fill(ep.roadBase[0] + 15, ep.roadBase[1] + 14, ep.roadBase[2] + 13, 120);
        rect(rx - rw * 0.35, ry - 1, rw * 0.33, 2);
        rect(rx + 3, ry - 1, rw * 0.33, 2);
      }
      if (i % 3 === 0) {
        fill(ep.roadLine[0], ep.roadLine[1], ep.roadLine[2], 50);
        rect(rx - 1, ry - 1, 3, 2);
      }
    }
    // Kerbstones — pixel (era 2+ only)
    noStroke();
    if (ep.era >= 2) {
      fill(ep.roadBase[0] + 20, ep.roadBase[1] + 20, ep.roadBase[2] + 10, 70);
      for (let i = 0; i <= segs; i += 2) {
        let t = i / segs;
        let rx = floor(lerp(x1, x2, t)), ry = floor(lerp(y1, y2, t) + sin(t * PI) * 3);
        rect(rx - 2, ry - rw * 0.14 - 1, 4, 2);
        rect(rx - 2, ry + rw * 0.14 - 1, 4, 2);
      }
    }
    // Era 2: stepping stones at intervals
    if (ep.era === 2) {
      fill(ep.stoneBase[0], ep.stoneBase[1], ep.stoneBase[2], 100);
      for (let i = 4; i <= segs; i += 8) {
        let t = i / segs;
        let rx = floor(lerp(x1, x2, t)), ry = floor(lerp(y1, y2, t) + sin(t * PI) * 3);
        rect(rx - 3, ry - 1, 6, 3, 1);
      }
    }
    // Era 3: teal crystal inlay strips along curbs at night
    if (ep.era === 3) {
      let bright = getSkyBrightness();
      if (bright < 0.5) {
        let glowA = map(bright, 0, 0.5, 35, 0);
        fill(ep.roadLine[0], ep.roadLine[1], ep.roadLine[2], glowA);
        for (let i = 0; i <= segs; i++) {
          let t = i / segs;
          let rx = floor(lerp(x1, x2, t)), ry = floor(lerp(y1, y2, t) + sin(t * PI) * 3);
          rect(rx - 1, ry - rw * 0.14 - 2, 2, 2);
          rect(rx - 1, ry + rw * 0.14, 2, 2);
        }
      }
    }
  }

  // Helper: draw a paved road between two world-space points (Era 2+ style)
  function drawRoadSegment(wx1, wy1, wx2, wy2, roadWidth) {
    let sx1 = w2sX(wx1), sy1 = w2sY(wy1);
    let sx2 = w2sX(wx2), sy2 = w2sY(wy2);
    let dx = sx2 - sx1, dy = sy2 - sy1;
    let len = sqrt(dx * dx + dy * dy);
    if (len < 1) return;
    let nx = -dy / len, ny = dx / len; // unit normal

    // Road surface
    stroke(ep.roadBase[0], ep.roadBase[1], ep.roadBase[2], 200);
    strokeWeight(roadWidth);
    strokeCap(SQUARE);
    line(sx1, sy1, sx2, sy2);

    // Gravel border (slightly wider, drawn behind)
    stroke(ep.roadLine[0], ep.roadLine[1], ep.roadLine[2], 90);
    strokeWeight(roadWidth + 4);
    line(sx1, sy1, sx2, sy2);

    // Re-draw surface on top
    stroke(ep.roadBase[0], ep.roadBase[1], ep.roadBase[2], 200);
    strokeWeight(roadWidth);
    line(sx1, sy1, sx2, sy2);

    // Curb lines
    stroke(ep.roadLine[0], ep.roadLine[1], ep.roadLine[2], 70);
    strokeWeight(1);
    let hw = roadWidth / 2;
    line(sx1 + nx * hw, sy1 + ny * hw, sx2 + nx * hw, sy2 + ny * hw);
    line(sx1 - nx * hw, sy1 - ny * hw, sx2 - nx * hw, sy2 - ny * hw);
    noStroke();

    // Stepping stones at intervals (Era 2+)
    if (ep.era >= 2) {
      let steps = floor(len / 40);
      for (let i = 1; i < steps; i++) {
        let t = i / steps;
        let stx = lerp(sx1, sx2, t);
        let sty = lerp(sy1, sy2, t);
        fill(ep.roadBase[0] + 15, ep.roadBase[1] + 15, ep.roadBase[2] + 15, 160);
        rect(stx - 3, sty - 2, 6, 4, 1);
      }
    }

    // Era 3: teal crystal inlay along curbs at night
    if (ep.era >= 3 && getSkyBrightness() < 0.4) {
      let glowA = map(getSkyBrightness(), 0, 0.4, 40, 0);
      stroke(80, 200, 180, glowA);
      strokeWeight(2);
      line(sx1 + nx * hw * 0.8, sy1 + ny * hw * 0.8, sx2 + nx * hw * 0.8, sy2 + ny * hw * 0.8);
      line(sx1 - nx * hw * 0.8, sy1 - ny * hw * 0.8, sx2 - nx * hw * 0.8, sy2 - ny * hw * 0.8);
      noStroke();
    }
  }

  let cx = WORLD.islandCX, cy = WORLD.islandCY;
  let rx = getSurfaceRX(), ry = getSurfaceRY();
  let avenueY = cy - 8;
  let cardoX = cx + rx * 0.05;

  // DECUMANUS — main E-W road (all eras, existing pixel-art renderer)
  let mp = getMerchantPortPosition();
  let empSX = w2sX(mp.x - 55); // left edge of storage building
  let decWestX = cx - rx * 0.85;
  let decEastX = cx + rx * 0.80;
  // Widen Decumanus in Era 2/3
  if (ep.era >= 2) {
    // Draw wider surface first via segment helper, then overlay pixel detail
    drawRoadSegment(decWestX, avenueY, decEastX, avenueY, ep.era === 2 ? 22 : 26);
  }
  let decStartSX = w2sX(decWestX);
  let totalLen = dist(decStartSX, roadSY, empSX, roadSY);
  let segs = max(20, floor(totalLen / 11));
  drawRoadSeg(decStartSX, roadSY, empSX, roadSY, segs);

  if (ep.era >= 2) {
    // CARDO — N-S cross road
    let cardoW = ep.era === 2 ? 16 : 20;
    drawRoadSegment(cardoX, cy - ry * 0.70, cardoX, cy + ry * 0.60, cardoW);

    // INTERSECTION PLAZA — forum plaza where Decumanus meets Cardo
    let plazaX = w2sX(cardoX);
    let plazaY = w2sY(avenueY);
    noStroke();
    fill(ep.roadBase[0] + 10, ep.roadBase[1] + 10, ep.roadBase[2] + 10, 220);
    rect(plazaX - 35, plazaY - 22, 70, 44, 2);
    noFill();
    stroke(ep.roadLine[0], ep.roadLine[1], ep.roadLine[2], 60);
    strokeWeight(1.5);
    rect(plazaX - 35, plazaY - 22, 70, 44, 2);
    noStroke();

    // VIA SACRA — NE diagonal toward temple
    drawRoadSegment(cardoX, avenueY, cx + rx * 0.5, cy - ry * 0.35, 14);

    // VIA MILITARIS — SE diagonal toward castrum
    drawRoadSegment(cardoX, avenueY, cx + rx * 0.45, cy + ry * 0.5, 12);
  }

  // Stone milestones at junctions — era-aware
  noStroke();
  [{ x: farmSX, y: roadSY + 8 }, { x: templeSX, y: roadSY + 8 }, { x: groveSX, y: roadSY + 8 }].forEach(j => {
    fill(ep.stoneBase[0], ep.stoneBase[1], ep.stoneBase[2]);
    rect(j.x - 3, j.y - 6, 6, 8, 2);
    fill(ep.stoneBase[0] + 15, ep.stoneBase[1] + 15, ep.stoneBase[2] + 15);
    rect(j.x - 2, j.y - 7, 4, 3, 1);
    fill(ep.roadLine[0], ep.roadLine[1], ep.roadLine[2]);
    rect(j.x - 1, j.y - 3, 2, 2);
  });
}

// ─── GRASS TUFTS ──────────────────────────────────────────────────────────
function drawGrassTufts() {
  if (!state.grassTufts) return;
  if (typeof _frameBudget !== 'undefined' && _frameBudget.throttled && frameCount % 2 !== 0) return;
  let bright = getSkyBrightness();
  let windPhase = sin(frameCount * 0.018) * 1.5;
  noStroke();
  for (let _gi = 0; _gi < state.grassTufts.length; _gi++) {
    let g = state.grassTufts[_gi];
    let sx = w2sX(g.x), sy = w2sY(g.y);
    if (sx < -50 || sx > width + 50 || sy < -50 || sy > height + 50) continue;
    let gx = floor(sx);
    let gy = floor(sy);
    let sw = floor(windPhase * sin(g.sway + frameCount * 0.004));
    let baseG = floor(130 * g.hue * (0.4 + bright * 0.6));
    let sg = getSeasonGrass();
    // Pixel grass — vertical 2px-wide rects
    for (let b = 0; b < g.blades; b++) {
      let bx = gx + (b - g.blades / 2) * 3;
      let h = floor(g.height + sin(b * 1.1) * 3);
      let tipOff = floor(sw * (0.5 + b * 0.1));
      // Dark base blade
      fill(sg.r - 8, sg.g + 10, sg.b - 4, 195);
      rect(bx, gy - h * 0.5, 2, floor(h * 0.5));
      // Brighter upper blade — shifted by wind
      fill(sg.r + 8, baseG + 20, sg.b + 4, 175);
      rect(bx + tipOff, gy - h, 2, floor(h * 0.55));
      // Highlight tip pixel on every other blade
      if (b % 2 === 0 && bright > 0.3) {
        fill(sg.r + 25, baseG + 40, sg.b + 12, 120);
        rect(bx + tipOff, gy - h - 1, 1, 2);
      }
    }
    // Pixel wildflower — tiny 2x2 colored rect
    if (g.hue > 1.3 && bright > 0.3) {
      let fc = (floor(g.x * 7 + g.y * 3) % 3);
      if (fc === 0) fill(225, 185, 60, 160);
      else if (fc === 1) fill(205, 105, 125, 150);
      else fill(145, 125, 205, 140);
      rect(gx + sw, gy - floor(g.height * 0.7), 2, 2);
    }
  }
}

// ─── DIRT PATHS — worn walking paths between major buildings ─────────────
function drawDirtPaths(ix, iy, iw, ih) {
  let lvl = state.islandLevel || 1;
  if (lvl < 2) return;
  let bright = getSkyBrightness();
  let sg = getSeasonGrass();
  noStroke();

  // Path helper: draw a worn dirt strip between two screen points
  function dirtPath(wx1, wy1, wx2, wy2, pathW) {
    let sx1 = w2sX(wx1), sy1 = w2sY(wy1);
    let sx2 = w2sX(wx2), sy2 = w2sY(wy2);
    let steps = max(8, floor(dist(sx1, sy1, sx2, sy2) / 8));
    for (let i = 0; i <= steps; i++) {
      let t = i / steps;
      let px = lerp(sx1, sx2, t);
      let py = lerp(sy1, sy2, t) + sin(t * PI * 1.5) * 2;
      let jx = sin(i * 2.3) * 1.5;
      // Darker worn earth
      fill(sg.r - 18, sg.g - 22, sg.b - 14, 40);
      rect(floor(px + jx) - floor(pathW / 2), floor(py) - 1, pathW, 3);
      // Lighter edges (dusty)
      fill(sg.r + 5, sg.g - 5, sg.b - 8, 22);
      rect(floor(px + jx) - floor(pathW / 2) - 1, floor(py), pathW + 2, 1);
    }
  }

  let cx = WORLD.islandCX, cy = WORLD.islandCY;

  // Path from campfire/center to farm area
  dirtPath(cx, cy - 8, cx - 160, cy - 5, 6);
  // Path from center to shrine/civic
  if (lvl >= 3) dirtPath(cx + 20, cy - 8, cx + 160, cy - 110, 5);
  // Path from center toward port
  dirtPath(cx, cy, cx - 280, cy + 30, 5);
  // Path from center to market area (east)
  if (lvl >= 7) dirtPath(cx + 20, cy - 8, cx + 270, cy - 30, 5);
  // Path toward military/castrum
  if (lvl >= 8) dirtPath(cx + 200, cy - 8, cx + 260, cy + 90, 5);
}

// ─── DISTRICT PROPS — visual identity objects for each zone ─────────────
function drawDistrictProps(ix, iy) {
  let lvl = state.islandLevel || 1;
  let bright = getSkyBrightness();
  let dayMix = max(0.15, bright);
  noStroke();

  // ── FARM: Scarecrow ──
  if (lvl >= 3) {
    let scx = w2sX(WORLD.islandCX - 260);
    let scy = w2sY(WORLD.islandCY - 30);
    let windSway = sin(frameCount * 0.02) * 2;
    // Post
    fill(120, 90, 50);
    rect(scx - 1, scy - 20, 3, 22);
    // Crossbar
    fill(110, 82, 45);
    rect(scx - 8 + windSway, scy - 18, 16, 2);
    // Head (burlap sack)
    fill(180, 155, 100);
    ellipse(scx, scy - 23, 8, 9);
    // Hat
    fill(100, 75, 40);
    rect(scx - 6, scy - 28, 12, 3);
    rect(scx - 3, scy - 32, 6, 4);
    // Tattered cloth flaps
    fill(140, 120, 75, 120);
    rect(scx - 9 + windSway, scy - 16, 3, 8);
    rect(scx + 6 + windSway, scy - 16, 3, 7);
  }

  // ── CIVIC: Lamp posts along road ──
  if (lvl >= 10) {
    let lampPositions = [
      { wx: WORLD.islandCX + 80, wy: WORLD.islandCY - 18 },
      { wx: WORLD.islandCX + 150, wy: WORLD.islandCY - 18 },
    ];
    lampPositions.forEach(lp => {
      let lx = w2sX(lp.wx), ly = w2sY(lp.wy);
      // Iron pole
      fill(65, 60, 55);
      rect(lx - 1, ly - 18, 2, 18);
      // Cross arm
      fill(60, 55, 50);
      rect(lx - 4, ly - 18, 8, 2);
      // Lantern box
      fill(70, 65, 58);
      rect(lx - 3, ly - 22, 6, 5);
      // Glass glow (warm at night)
      if (bright < 0.4) {
        let glowA = map(bright, 0, 0.4, 60, 0);
        fill(255, 190, 80, glowA);
        ellipse(lx, ly - 20, 10, 8);
      } else {
        fill(200, 185, 140, 40);
        rect(lx - 2, ly - 21, 4, 3);
      }
    });
  }

  // ── MILITARY: Training dummies and weapon racks ──
  if (lvl >= 8) {
    let mdx = w2sX(WORLD.islandCX + 230);
    let mdy = w2sY(WORLD.islandCY + 60);
    // Training dummy — wooden post with cross-arms and straw torso
    fill(130, 100, 60);
    rect(mdx - 1, mdy - 16, 3, 18);
    // Cross arm
    fill(120, 92, 55);
    rect(mdx - 7, mdy - 14, 14, 2);
    // Straw body
    fill(185, 165, 110);
    rect(mdx - 4, mdy - 12, 8, 10);
    fill(170, 150, 95, 80);
    rect(mdx - 3, mdy - 11, 6, 8);
    // Target circle painted on straw
    noFill();
    stroke(160, 50, 40, 80);
    strokeWeight(0.8);
    ellipse(mdx, mdy - 7, 5, 5);
    noStroke();

    // Weapon rack — 2nd dummy further right
    let wrx = w2sX(WORLD.islandCX + 250);
    let wry = w2sY(WORLD.islandCY + 50);
    // Rack frame (A-frame)
    fill(110, 85, 48);
    rect(wrx - 8, wry - 2, 2, 14);
    rect(wrx + 6, wry - 2, 2, 14);
    rect(wrx - 8, wry - 2, 16, 2);
    // Spears leaning on rack
    fill(90, 72, 42);
    rect(wrx - 5, wry - 14, 1, 14);
    rect(wrx - 2, wry - 12, 1, 12);
    rect(wrx + 1, wry - 13, 1, 13);
    rect(wrx + 4, wry - 11, 1, 11);
    // Spear tips
    fill(170, 165, 155);
    rect(wrx - 5, wry - 16, 1, 3);
    rect(wrx - 2, wry - 14, 1, 3);
    rect(wrx + 1, wry - 15, 1, 3);
    rect(wrx + 4, wry - 13, 1, 3);
  }

  // ── SACRED: Polished stone floor, flower offerings, incense wisps ──
  if (lvl >= 9) {
    let stx = w2sX(WORLD.islandCX + 0);
    let sty = w2sY(WORLD.islandCY - 150);
    // Polished stone platform
    fill(180, 175, 165, 60);
    rect(stx - 20, sty - 2, 40, 8, 1);
    // Stone texture — lighter blocks
    fill(195, 190, 180, 45);
    for (let si = 0; si < 4; si++) {
      rect(stx - 18 + si * 10, sty - 1, 8, 6);
    }
    // Flower offerings — small colored dots at base
    let flowerOffs = [
      { ox: -12, c: [225, 80, 90] }, { ox: -4, c: [255, 200, 60] },
      { ox: 4, c: [200, 120, 180] }, { ox: 11, c: [255, 160, 80] },
    ];
    flowerOffs.forEach(f => {
      fill(f.c[0], f.c[1], f.c[2], 130 * dayMix);
      ellipse(stx + f.ox, sty + 8, 3, 2);
    });
    // Incense smoke wisps — thin rising particles
    if (bright > 0.1) {
      let smokePhase = frameCount * 0.015;
      for (let wi = 0; wi < 3; wi++) {
        let wx = stx + sin(smokePhase + wi * 2.5) * 4;
        let wy = sty - 6 - wi * 6 - sin(smokePhase * 0.7 + wi) * 3;
        let wa = (35 - wi * 10) * dayMix;
        fill(165, 148, 175, wa);
        ellipse(wx, wy, 3 + wi, 2);
      }
    }
  }

  // ── MARKET: Colored awning cloth pieces and crate stacks ──
  if (lvl >= 7) {
    let mkx = w2sX(WORLD.islandCX + 270);
    let mky = w2sY(WORLD.islandCY - 35);
    // Awning — striped colored cloth
    let awningColors = [
      [180, 45, 35], [45, 90, 150], [180, 140, 40],
    ];
    for (let ai = 0; ai < 3; ai++) {
      let ac = awningColors[ai];
      let ax = mkx - 14 + ai * 12;
      fill(ac[0], ac[1], ac[2], 140);
      rect(ax, mky - 10, 10, 3);
      // Shadow under awning
      fill(0, 0, 0, 15);
      rect(ax, mky - 7, 10, 4);
    }
    // Support poles
    fill(100, 80, 50);
    rect(mkx - 14, mky - 10, 1, 12);
    rect(mkx + 20, mky - 10, 1, 12);

    // Crate stacks
    let crx = mkx + 28;
    let cry = mky - 2;
    // Bottom crate
    fill(140, 110, 65);
    rect(crx, cry, 8, 7);
    fill(155, 125, 75);
    rect(crx + 1, cry + 1, 6, 5);
    // Top crate (smaller, offset)
    fill(130, 100, 58);
    rect(crx + 1, cry - 6, 7, 6);
    fill(145, 115, 68);
    rect(crx + 2, cry - 5, 5, 4);
    // Barrel next to crates
    fill(120, 90, 50);
    ellipse(crx - 6, cry + 3, 7, 8);
    fill(95, 72, 40);
    rect(crx - 9, cry + 1, 1, 5);
    rect(crx - 3, cry + 1, 1, 5);
  }
}

// ─── ISLAND BELLY ─────────────────────────────────────────────────────────
function drawIslandBelly(cx, cy, w, h) {
  noStroke();
  // Rock strata layers — visible geological bands on cliff face
  let strataColors = [
    { r: 140, g: 125, b: 100 },  // sandstone
    { r: 120, g: 108, b: 85 },   // darker limestone
    { r: 155, g: 138, b: 110 },  // light sandstone
    { r: 105, g: 95, b: 78 },    // dark shale
    { r: 145, g: 130, b: 105 },  // medium stone
    { r: 125, g: 112, b: 90 },   // brown rock
    { r: 160, g: 145, b: 120 },  // cream limestone
    { r: 110, g: 100, b: 82 },   // grey-brown
  ];

  let spires = [
    { ox: -0.35, h: 65, w: 26 }, { ox: -0.18, h: 85, w: 22 },
    { ox: 0.0, h: 110, w: 32 }, { ox: 0.15, h: 75, w: 24 },
    { ox: 0.3, h: 60, w: 28 }, { ox: -0.5, h: 45, w: 18 },
    { ox: 0.45, h: 48, w: 20 },
  ];
  spires.forEach((s, si) => {
    let sx = cx + s.ox * w * 0.5;
    let sy = cy;

    // Draw strata layers within each spire
    let layerH = s.h / strataColors.length;
    for (let li = 0; li < strataColors.length; li++) {
      let sc = strataColors[(li + si) % strataColors.length];
      let y1 = sy + li * layerH;
      let y2 = sy + (li + 1) * layerH;
      let wFrac1 = 1 - (li * layerH) / s.h;
      let wFrac2 = 1 - ((li + 1) * layerH) / s.h;
      let hw1 = s.w / 2 * wFrac1;
      let hw2 = s.w / 2 * wFrac2;
      fill(sc.r, sc.g, sc.b);
      beginShape();
      vertex(sx - hw1, y1);
      vertex(sx + hw1, y1);
      vertex(sx + hw2, y2);
      vertex(sx - hw2, y2);
      endShape(CLOSE);
      // Subtle strata line between layers
      stroke(sc.r - 15, sc.g - 15, sc.b - 12, 50);
      strokeWeight(0.5);
      line(sx - hw1 + 1, y1, sx + hw1 - 1, y1);
      noStroke();
    }

    // Light side highlight
    fill(255, 255, 255, 15);
    triangle(sx - s.w / 4, sy, sx, sy + s.h * 0.3, sx, sy + s.h);

    // Crystal glow at tips of tall spires
    if (s.h > 65) {
      let tipGlow = 100 + sin(frameCount * 0.04 + s.ox * 10) * 50;
      fill(0, tipGlow, 80, 180);
      triangle(sx - 4, sy + s.h - 10, sx + 4, sy + s.h - 10, sx, sy + s.h + 8);
    }
  });

  // Horizontal strata crack lines across the cliff face
  stroke(90, 80, 65, 30);
  strokeWeight(0.5);
  for (let ly = 0; ly < 5; ly++) {
    let y = cy + ly * 18 + 8;
    let halfW = w * 0.38 * (1 - ly * 0.12);
    line(cx - halfW, y, cx + halfW, y);
  }
  noStroke();
}

// ─── EXPANSION ZONE ───────────────────────────────────────────────────────
function drawExpansionZone(ix, iy, iw, ih) {
  // Pulsing border showing expansion is possible
  let pulse = sin(frameCount * 0.03) * 0.3 + 0.7;
  noFill();
  stroke(0, 255, 136, 30 * pulse);
  strokeWeight(2);
  let nextRX = state.islandRX + 60;
  let nextRY = state.islandRY + 40;
  // Dashed ellipse effect
  for (let a = 0; a < TWO_PI; a += 0.15) {
    let x1 = ix + cos(a) * nextRX;
    let y1 = iy - 18 + sin(a) * nextRY * 0.36;
    let x2 = ix + cos(a + 0.08) * nextRX;
    let y2 = iy - 18 + sin(a + 0.08) * nextRY * 0.36;
    line(x1, y1, x2, y2);
  }
  noStroke();
}

// ─── NIGHT LIGHTING — torch/lantern/crystal glow at night ─────────────────
function drawNightLighting() {
  _resetDuskAtDawn();
  _triggerDuskMoment();
  drawDuskIgnitionFlashes();

  let bright = getSkyBrightness();
  if (bright > 0.45) return;
  let nightAlpha = map(bright, 0, 0.45, 1, 0);
  let ep = getEraPalette();
  let ng = ep.nightGlow;
  let nr = ep.nightRadius;

  noStroke();
  if (state.buildings) {
    state.buildings.forEach(b => {
      if (b.type !== 'torch' && b.type !== 'lantern' && b.type !== 'campfire') return;
      let sx = w2sX(b.x);
      let sy = w2sY(b.y);
      if (sx < -80 || sx > width + 80 || sy < -80 || sy > height + 80) return;
      // Warm pool-of-light gradient (outermost)
      fill(255, 200, 80, 40 * nightAlpha);
      ellipse(sx, sy, 160, 100);
      // Boosted glow layers (+50% radius, +30% brightness)
      fill(ng[0], ng[1], ng[2], 23 * nightAlpha);
      ellipse(sx, sy, nr * 5.25, nr * 3.3);
      fill(ng[0], ng[1], ng[2], 46 * nightAlpha);
      ellipse(sx, sy, nr * 2.7, nr * 1.65);
      fill(ng[0], ng[1], ng[2], 72 * nightAlpha);
      ellipse(sx, sy, nr * 1.05, nr * 0.75);
    });
  }
  if (state.crystalNodes) {
    state.crystalNodes.forEach(cn => {
      if (cn.respawnTimer > 0) return;
      let sx = w2sX(cn.x);
      let sy = w2sY(cn.y);
      if (sx < -50 || sx > width + 50 || sy < -50 || sy > height + 50) return;
      fill(80, 220, 200, 15 * nightAlpha);
      ellipse(sx, sy, 50, 30);
      fill(80, 240, 210, 8 * nightAlpha);
      ellipse(sx, sy, 80, 45);
    });
  }
  if (state.pyramid) {
    let sx = w2sX(state.pyramid.x);
    let sy = w2sY(state.pyramid.y);
    let tier = state.islandLevel <= 4 ? 1 : state.islandLevel <= 8 ? 2 : state.islandLevel <= 14 ? 3 : state.islandLevel <= 19 ? 4 : 5;
    let glowR = 40 + tier * 20;
    if (tier >= 5) {
      fill(80, 220, 200, 18 * nightAlpha);
      ellipse(sx, sy - 20, glowR * 2, glowR);
    } else {
      fill(ng[0], ng[1], ng[2], 15 * nightAlpha);
      ellipse(sx, sy - 10, glowR * 1.8, glowR * 0.9);
    }
  }
}

// ─── AMBIENT OCEAN WILDLIFE — distant sea life on the water ─────────────
let _oceanWildlife = null;

function initOceanWildlife() {
  _oceanWildlife = {
    whaleSpouts: [],
    seabirds: [],
    dolphins: [],
  };
  // Seed 3-5 seabirds
  for (let i = 0; i < 4; i++) {
    _oceanWildlife.seabirds.push({
      x: Math.random() * 1.2, y: 0.02 + Math.random() * 0.18,
      vx: (Math.random() * 0.0008 + 0.0003) * (Math.random() > 0.5 ? 1 : -1),
      wingPhase: Math.random() * Math.PI * 2,
      size: 2 + Math.random() * 2,
    });
  }
}

function drawOceanWildlife() {
  if (typeof _fpsSmooth !== 'undefined' && _fpsSmooth < 30) return;
  if (!_oceanWildlife) initOceanWildlife();
  let bright = getSkyBrightness();
  let dayMix = max(0.15, bright);
  let oceanTop = max(height * 0.06, height * 0.25 - (typeof horizonOffset !== 'undefined' ? horizonOffset : 0));

  // ── Whale spouts — rare distant plumes ──
  if (frameCount % 600 === 0 && _oceanWildlife.whaleSpouts.length < 2 && bright > 0.2) {
    _oceanWildlife.whaleSpouts.push({
      x: Math.random() * 0.7 + 0.15,
      y: oceanTop + 15 + Math.random() * 40,
      life: 90, maxLife: 90,
      height: 12 + Math.random() * 8,
    });
  }
  noStroke();
  for (let i = _oceanWildlife.whaleSpouts.length - 1; i >= 0; i--) {
    let ws = _oceanWildlife.whaleSpouts[i];
    let t = ws.life / ws.maxLife;
    let sx = ws.x * width;
    let sy = ws.y;
    // Whale back — dark arc briefly visible
    if (t > 0.7) {
      let backT = (t - 0.7) / 0.3;
      fill(30, 45, 60, 40 * backT * dayMix);
      ellipse(sx, sy + 2, 18, 5);
      // Tail fluke on dive (late phase)
      if (backT < 0.3) {
        fill(25, 40, 55, 30 * dayMix);
        triangle(sx - 6, sy, sx, sy - 4, sx + 6, sy);
      }
    }
    // Spout plume — white spray
    let spoutH = ws.height * sin(t * PI) * (t > 0.5 ? 1 : t * 2);
    let spoutAlpha = 60 * sin(t * PI) * dayMix;
    // V-shaped spray
    for (let s = 0; s < spoutH; s += 2) {
      let spread = s * 0.2;
      let dropAlpha = spoutAlpha * (1 - s / spoutH);
      fill(220, 235, 245, dropAlpha);
      rect(floor(sx - spread), floor(sy - s), 1, 2);
      rect(floor(sx + spread), floor(sy - s), 1, 2);
    }
    // Mist at base
    fill(200, 220, 235, spoutAlpha * 0.4);
    ellipse(sx, sy - 1, 8 + spoutH * 0.3, 3);
    ws.life--;
    if (ws.life <= 0) _oceanWildlife.whaleSpouts.splice(i, 1);
  }

  // ── Seabirds — small V shapes gliding ──
  for (let b of _oceanWildlife.seabirds) {
    b.x += b.vx;
    b.wingPhase += 0.06;
    if (b.x > 1.15) b.x = -0.1;
    if (b.x < -0.15) b.x = 1.1;
    let bx = floor(b.x * width);
    let by = floor(b.y * height + sin(frameCount * 0.008 + b.wingPhase) * 3);
    let wingY = sin(b.wingPhase) * 2.5;
    // Atmospheric fade — birds are distant and slightly blue
    let distFade = 0.5 + b.y * 1.5;
    let birdR = lerp(40, 100, min(1, distFade));
    let birdG = lerp(35, 110, min(1, distFade));
    let birdB = lerp(30, 125, min(1, distFade));
    fill(birdR, birdG, birdB, 140 * dayMix);
    // Wing left
    rect(bx - floor(b.size), by + floor(wingY), floor(b.size), 1);
    // Body
    rect(bx, by, 1, 1);
    // Wing right
    rect(bx + 1, by - floor(wingY), floor(b.size), 1);
  }

  // ── Dolphins — occasional arcing leaps ──
  if (frameCount % 420 === 0 && _oceanWildlife.dolphins.length < 2 && bright > 0.3) {
    let startX = Math.random() * 0.6 + 0.2;
    let dir = Math.random() > 0.5 ? 1 : -1;
    _oceanWildlife.dolphins.push({
      x: startX, y: oceanTop + 20 + Math.random() * 30,
      phase: 0, dir: dir,
      speed: 0.0015 + Math.random() * 0.001,
    });
  }
  for (let i = _oceanWildlife.dolphins.length - 1; i >= 0; i--) {
    let d = _oceanWildlife.dolphins[i];
    d.phase += 0.05;
    d.x += d.dir * d.speed;
    if (d.phase > PI) { _oceanWildlife.dolphins.splice(i, 1); continue; }
    let dx = floor(d.x * width);
    let jumpArc = -sin(d.phase) * 14;
    let dy = floor(d.y + jumpArc);
    let bodyAlpha = 150 * dayMix;
    // Body
    fill(70, 90, 115, bodyAlpha);
    rect(dx - 4 * d.dir, dy, 8, 3);
    // Head
    fill(80, 100, 125, bodyAlpha);
    rect(dx + 4 * d.dir, dy, 3, 2);
    // Dorsal fin
    fill(60, 80, 105, bodyAlpha);
    triangle(dx, dy - 1, dx + 1, dy - 4, dx + 2, dy);
    // Tail
    fill(65, 85, 110, bodyAlpha);
    rect(dx - 5 * d.dir, dy + 1, 3, 2);
    // Splash on entry/exit
    if (d.phase < 0.4 || d.phase > PI - 0.4) {
      let splashA = d.phase < 0.4 ? (0.4 - d.phase) * 200 : (d.phase - PI + 0.4) * 200;
      fill(200, 225, 240, splashA * dayMix);
      rect(dx - 3, floor(d.y), 6, 2);
      fill(230, 240, 248, splashA * 0.5 * dayMix);
      rect(dx - 5, floor(d.y) + 1, 10, 1);
    }
  }
}

// ─── ATMOSPHERIC PERSPECTIVE — distant objects fade toward blue ──────────
function applyAtmosphericPerspective(screenY) {
  // Returns alpha multiplier and blue tint based on distance from viewer
  // Objects near horizon (top) are more faded/blue
  let oceanTop = max(height * 0.06, height * 0.25 - (typeof horizonOffset !== 'undefined' ? horizonOffset : 0));
  let distFromHorizon = max(0, screenY - oceanTop);
  let maxDist = height - oceanTop;
  let nearness = constrain(distFromHorizon / maxDist, 0, 1);
  return {
    alpha: 0.35 + nearness * 0.65,
    blueShift: (1 - nearness) * 0.4,
  };
}

function drawAtmosphericHaze() {
  let bright = getSkyBrightness();
  if (bright < 0.1) return;
  let oceanTop = max(height * 0.06, height * 0.25 - (typeof horizonOffset !== 'undefined' ? horizonOffset : 0));
  let hazeH = 40;
  noStroke();
  for (let y = 0; y < hazeH; y += 2) {
    let t = 1 - y / hazeH;
    let hazeAlpha = t * t * 18 * bright;
    fill(160, 190, 220, hazeAlpha);
    rect(0, oceanTop + y, width, 2);
  }
  // Warm haze during golden hour
  let h = state.time / 60;
  if ((h >= 5 && h < 7) || (h >= 16.5 && h < 19)) {
    let warmT = h < 7 ? map(h, 5, 7, 0.5, 0) : map(h, 16.5, 19, 0, 0.5);
    for (let y = 0; y < hazeH * 0.6; y += 2) {
      let t2 = 1 - y / (hazeH * 0.6);
      fill(255, 180, 100, t2 * t2 * 8 * warmT * bright);
      rect(0, oceanTop + y, width, 2);
    }
  }
}


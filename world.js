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
  for (let i = 0; i < numVerts; i++) {
    let angle = (i / numVerts) * TWO_PI;
    let noiseVal = noise(cos(angle) * 2 + noiseSeed, sin(angle) * 2 + noiseSeed);
    let offset = (noiseVal - 0.5) * 0.06;
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
    let vy = (screenCY + yOffset) + sin(v.angle) * radiusY * r;
    vertex(vx, vy);
  }
  endShape(CLOSE);
}

// ─── SEASON COLORS ────────────────────────────────────────────────────────
function getSeasonGrass() {
  let s = getSeason();
  if (s === 0) return { r: 72, g: 110, b: 48 };  // Spring — lush green
  if (s === 1) return { r: 82, g: 100, b: 42 };  // Summer — warm olive-gold
  if (s === 2) return { r: 95, g: 82, b: 38 };   // Autumn — golden amber
  return { r: 65, g: 78, b: 55 };                 // Winter — sage green
}

function getSeasonRim() {
  let s = getSeason();
  if (s === 0) return { r: 88, g: 125, b: 52 };
  if (s === 1) return { r: 100, g: 110, b: 45 };
  if (s === 2) return { r: 120, g: 95, b: 38 };
  return { r: 78, g: 88, b: 60 };
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
  fill(255, 220, 140, 30 * intensity);
  ellipse(sunX, sunY, 70, 70);
  fill(255, 230, 160, 18 * intensity);
  ellipse(sunX, sunY, 110, 110);
}

function drawSky() {
  let bright = getSkyBrightness();
  let h = state.time / 60;

  let skyTop, skyBot;
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

  if ((bright > 0.1 || (h >= 5 && h < 7)) && !stormActive) {
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
  let r = 28;
  let fx = floor(x), fy = floor(y);
  noStroke();
  // Outer pixel glow — cross shape
  for (let g = 5; g > 0; g--) {
    let s = g * 20;
    fill(220, 140, 20, (6 - g) * 4 * bright);
    rect(fx - 2, fy - s, 4, s * 2);
    rect(fx - s, fy - 2, s * 2, 4);
  }
  // Diagonal rays — stepped pixel beams
  for (let i = 0; i < 8; i++) {
    let angle = (TWO_PI / 8) * i + frameCount * 0.004;
    let len = floor(r * 2.2 + sin(frameCount * 0.04 + i * 1.3) * r * 0.6);
    fill(240, 180, 40, 25 * bright);
    for (let d = r; d < len; d += 4) {
      let rx = floor(fx + cos(angle) * d);
      let ry = floor(fy + sin(angle) * d);
      rect(rx, ry, 3, 3);
    }
  }
  // Sun disc — pixel square with stepped corners
  fill(255, 210, 90, 240 * bright);
  rect(fx - r, fy - r + 6, r * 2, r * 2 - 12);
  rect(fx - r + 6, fy - r, r * 2 - 12, r * 2);
  rect(fx - r + 3, fy - r + 3, r * 2 - 6, r * 2 - 6);
  // Bright core
  fill(255, 240, 180, 200 * bright);
  rect(fx - floor(r * 0.55), fy - floor(r * 0.55), floor(r * 1.1), floor(r * 1.1));
  // Hot center
  fill(255, 255, 230, 150 * bright);
  rect(fx - floor(r * 0.25), fy - floor(r * 0.25), floor(r * 0.5), floor(r * 0.5));
}

function drawStarField(alpha) {
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
        depth: random(0.5, 1), // parallax depth
      });
    }
  }
  noStroke();

  // Cloud color varies by time of day
  let cloudR = 235, cloudG = 240, cloudB = 245;
  let highlightR = 255, highlightG = 255, highlightB = 255;
  let shadowR = 210, shadowG = 218, shadowB = 228;

  if (h >= 5 && h < 7) {
    // Dawn clouds — pink/orange lit undersides
    let dt = map(h, 5, 7, 0, 1);
    cloudR = lerp(180, 235, dt); cloudG = lerp(140, 240, dt); cloudB = lerp(160, 245, dt);
    highlightR = 255; highlightG = lerp(180, 255, dt); highlightB = lerp(160, 255, dt);
    shadowR = lerp(200, 210, dt); shadowG = lerp(120, 218, dt); shadowB = lerp(140, 228, dt);
  } else if (h >= 16.5 && h < 19) {
    // Sunset clouds — golden/orange/purple
    let dt = map(h, 16.5, 19, 0, 1);
    cloudR = lerp(245, 160, dt); cloudG = lerp(220, 120, dt); cloudB = lerp(200, 140, dt);
    highlightR = lerp(255, 220, dt); highlightG = lerp(240, 150, dt); highlightB = lerp(200, 130, dt);
    shadowR = lerp(220, 100, dt); shadowG = lerp(180, 70, dt); shadowB = lerp(170, 110, dt);
  } else if (h >= 19 || h < 5) {
    // Night clouds — dark silhouettes
    cloudR = 30; cloudG = 35; cloudB = 55;
    highlightR = 50; highlightG = 55; highlightB = 75;
    shadowR = 15; shadowG = 18; shadowB = 35;
  }

  cloudPositions.forEach(cl => {
    cl.x += cl.speed * cl.depth;
    if (cl.x > width + cl.w) cl.x = -cl.w;
    cl.y -= camDY * 0.04;
    cl.y = constrain(cl.y, height * 0.02, height * 0.22);
    let alpha = map(bright, 0.1, 0.5, 15, 55) * cl.depth;
    let cx = floor(cl.x), cy = floor(cl.y);
    let cw = floor(cl.w), ch = floor(cl.h);

    // Chunky pixel-art cloud — overlapping rects
    // Main body block
    fill(cloudR, cloudG, cloudB, alpha);
    rect(cx - cw * 0.3, cy - ch * 0.15, cw * 0.6, ch * 0.4);
    // Top bumps — offset blocks
    fill(highlightR, highlightG, highlightB, alpha * 0.75);
    rect(cx - cw * 0.2, cy - ch * 0.35, cw * 0.3, ch * 0.25);
    rect(cx + cw * 0.05, cy - ch * 0.3, cw * 0.22, ch * 0.2);
    // Side chunks
    fill(cloudR, cloudG, cloudB, alpha * 0.7);
    rect(cx - cw * 0.45, cy - ch * 0.05, cw * 0.2, ch * 0.25);
    rect(cx + cw * 0.28, cy - ch * 0.05, cw * 0.18, ch * 0.22);
    // Bottom shadow strip
    fill(shadowR, shadowG, shadowB, alpha * 0.5);
    rect(cx - cw * 0.25, cy + ch * 0.2, cw * 0.5, ch * 0.12);
    // Highlight block on top
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

  // Moonlight glow on water/ground (stronger at full moon)
  let fullness = 1 - abs(phase - 0.5) * 2; // 0 at new, 1 at full
  let glowR = 30 + fullness * 30;
  fill(140, 170, 210, moonAlpha * 0.06 * fullness);
  ellipse(moonX, moonY, glowR * 4, glowR * 3);
  fill(160, 185, 220, moonAlpha * 0.03 * fullness);
  ellipse(moonX, moonY, glowR * 6, glowR * 4);

  // Pixel cross glow
  fill(180, 200, 230, moonAlpha * 0.15 * (0.3 + fullness * 0.7));
  rect(moonX - 1, moonY - 20, 2, 40);
  rect(moonX - 20, moonY - 1, 40, 2);

  // Moon body
  fill(220, 225, 235, moonAlpha);
  rect(moonX - 9, moonY - 11, 18, 22);
  rect(moonX - 11, moonY - 9, 22, 18);
  rect(moonX - 10, moonY - 10, 20, 20);

  // Phase shadow — crescent moves based on phase
  if (phase < 0.45 || phase > 0.55) {
    let shadowSide = phase < 0.5 ? 1 : -1; // which side is shadowed
    let shadowWidth = abs(phase < 0.5 ? (0.5 - phase) * 2 : (phase - 0.5) * 2);
    let sw = floor(shadowWidth * 20);
    fill(10, 18, 35, moonAlpha * 0.8);
    if (shadowSide > 0) {
      rect(moonX + 10 - sw, moonY - 9, sw + 2, 18);
      rect(moonX + 10 - sw + 2, moonY - 10, sw, 20);
    } else {
      rect(moonX - 11, moonY - 9, sw + 2, 18);
      rect(moonX - 11, moonY - 10, sw, 20);
    }
  }

  // Surface craters (always visible on lit part)
  fill(200, 205, 220, moonAlpha * 0.3);
  rect(moonX - 5, moonY + 1, 3, 3);
  rect(moonX - 3, moonY - 4, 2, 2);
  rect(moonX + 2, moonY - 2, 2, 2);

  // Moonbeam on water — cool blue column below moon
  if (fullness > 0.3) {
    let skyH = max(height * 0.06, height * 0.25 - horizonOffset);
    for (let ry = skyH; ry < skyH + 50; ry += 4) {
      let reflA = moonAlpha * 0.04 * fullness * (1 - (ry - skyH) / 50);
      let rw = floor(6 + sin(ry * 0.1 + frameCount * 0.02) * 3);
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
  // Outermost: warm medium blue
  fill(lerp(20, 48, dayMix), lerp(50, 140, dayMix), lerp(75, 180, dayMix), 180);
  ellipse(ix, iy - 10, iw * 1.12, ih * 0.50);
  // Mid shallow — turquoise
  fill(lerp(25, 60, dayMix), lerp(65, 160, dayMix), lerp(85, 190, dayMix), 200);
  ellipse(ix, iy - 12, iw * 1.06, ih * 0.46);
  // Inner shallow — bright warm turquoise
  fill(lerp(30, 80, dayMix), lerp(75, 175, dayMix), lerp(88, 192, dayMix), 210);
  ellipse(ix, iy - 13, iw * 1.00, ih * 0.43);
  // Near-shore — lightest aqua
  fill(lerp(38, 95, dayMix), lerp(85, 185, dayMix), lerp(92, 190, dayMix), 220);
  ellipse(ix, iy - 14, iw * 0.96, ih * 0.41);

  // Foam waves — animated white froth at water's edge
  let foamPhase = frameCount * 0.02;
  for (let fa = 0; fa < TWO_PI; fa += 0.3) {
    let foamPulse = sin(foamPhase + fa * 3) * 0.01 + 0.005;
    let foamRX = iw * (0.465 + foamPulse);
    let foamRY = ih * (0.196 + foamPulse * 0.4);
    let ffx = ix + cos(fa) * foamRX;
    let ffy = (iy - 14) + sin(fa) * foamRY;
    fill(255, 255, 255, 40 + sin(foamPhase + fa * 5) * 20);
    ellipse(ffx, ffy, 8 + sin(fa * 2.7) * 3, 3);
  }

  // ─── WATER REFLECTIONS — shimmer band at coastline ───
  let reflPhase = frameCount * 0.015;
  for (let ra = 0; ra < TWO_PI; ra += 0.18) {
    let wave = sin(reflPhase + ra * 4) * 0.5 + 0.5;
    let wave2 = sin(reflPhase * 1.3 + ra * 6) * 0.5 + 0.5;
    // Outer shimmer ring — light bouncing off shallow water
    let refRX = iw * (0.49 + sin(reflPhase + ra * 2) * 0.005);
    let refRY = ih * (0.205 + sin(reflPhase + ra * 2) * 0.002);
    let rx2 = ix + cos(ra) * refRX;
    let ry2 = (iy - 12) + sin(ra) * refRY;
    fill(200, 230, 255, 18 * wave * dayMix);
    rect(floor(rx2) - 3, floor(ry2), 6 + floor(wave2 * 4), 2);
    // Inner shimmer — closer to shore, brighter
    let refRX2 = iw * (0.475 + sin(reflPhase * 0.8 + ra * 3) * 0.004);
    let refRY2 = ih * (0.198 + sin(reflPhase * 0.8 + ra * 3) * 0.002);
    let rx3 = ix + cos(ra) * refRX2;
    let ry3 = (iy - 13) + sin(ra) * refRY2;
    fill(220, 240, 255, 22 * wave2 * dayMix);
    rect(floor(rx3) - 2, floor(ry3), 4 + floor(wave * 3), 1);
  }

  // Sandy beach ring — warm golden sand (organic coastline)
  fill(210, 190, 145);
  drawCoastlineShape(ix, iy, iw * 0.465, ih * 0.195, -14);
  // Wet sand (darker warm inner ring — tide line)
  fill(180, 158, 115);
  drawCoastlineShape(ix, iy, iw * 0.4575, ih * 0.1875, -16);
  // Wet sand shimmer — subtle water sheen on wet zone
  let wetShimmer = sin(frameCount * 0.03) * 0.3 + 0.5;
  fill(160, 185, 200, 18 * wetShimmer * dayMix);
  drawCoastlineShape(ix, iy, iw * 0.4625, ih * 0.1925, -15);

  // ─── COASTAL VARIETY ───
  // North rocky headland (angle PI+0.3 to TWO_PI-0.3)
  {
    let hRX = iw * 0.462;
    let hRY = ih * 0.193;
    for (let ha = PI + 0.3; ha < TWO_PI - 0.3; ha += 0.18) {
      let hx = floor(ix + cos(ha) * hRX + sin(ha * 3.1) * 4);
      let hy = floor((iy - 14) + sin(ha) * hRY + cos(ha * 2.7) * 2);
      fill(88, 78, 62);
      rect(hx - 3, hy - 2, 5 + floor(sin(ha * 5.3) * 2), 3);
      rect(hx, hy - 4, 3, 2);
    }
  }
  // East tide pools (angle -0.3 to PI/4)
  {
    let tRX = iw * 0.455;
    let tRY = ih * 0.190;
    for (let ta = -0.3; ta < PI / 4; ta += 0.22) {
      let tx = ix + cos(ta) * tRX + sin(ta * 4.1) * 3;
      let ty = (iy - 14) + sin(ta) * tRY + cos(ta * 3.3) * 2;
      fill(45, 100, 110, 80);
      ellipse(tx, ty, 7 + sin(ta * 7) * 2, 3);
    }
  }

  // ─── CLIFF EDGE — layered bands below grass surface ───
  // Dark earth band (topmost cliff layer, just below grass)
  fill(82, 62, 42);
  drawCoastlineShape(ix, iy, iw * 0.455, ih * 0.185, -13);
  // Mid brown dirt
  fill(95, 72, 48);
  drawCoastlineShape(ix, iy, iw * 0.458, ih * 0.188, -11);
  // Lighter rock/sandstone
  fill(120, 100, 72);
  drawCoastlineShape(ix, iy, iw * 0.46, ih * 0.19, -9);
  // Bottom rock band — darkest, blends toward sand/water
  fill(70, 58, 40);
  drawCoastlineShape(ix, iy, iw * 0.462, ih * 0.192, -7);

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

  // District ground fills — paved stone under the city (Era 2+)
  drawDistrictGrounds(ix, iy);

  // Roman road (drawn first so farm zone covers the end)
  drawRomanRoad(ix, iy);

  // Farm zone background — tilled soil area (on top of road)
  drawFarmZoneBG();

  // Harbor port (player ship — left side)
  drawPort();
  // Merchant port (Mercator — right side)
  drawMerchantPort();

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
        textSize(5); textAlign(CENTER);
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
function drawDistrictGrounds(ix, iy) {
  if (state.islandLevel < 5) return; // village has no paving
  let ep = getEraPalette();
  let bright = getSkyBrightness();
  let dayMix = max(0.15, bright);

  // Scale: use screen-space island dimensions
  let iw = state.islandRX * 2;
  let ih = state.islandRY * 2;
  noStroke();

  // Era 1 (Lv 5-8): Just a small dirt plaza around the center
  if (ep.era === 1) {
    // Packed earth around the town center — subtle
    fill(lerp(160, 175, dayMix), lerp(140, 155, dayMix), lerp(110, 125, dayMix), 100);
    ellipse(ix + iw * 0.02, iy - 18, iw * 0.20, ih * 0.14);
    return;
  }

  // Era 2+ (Lv 9+): Full district paving

  // CIVIC CORE — largest zone, cream-stone, covers forum + temple approach + center
  let coreAlpha = ep.era >= 3 ? 210 : 190;
  fill(ep.stoneBase[0] - 5, ep.stoneBase[1] - 5, ep.stoneBase[2] - 8, coreAlpha);
  ellipse(ix + iw * 0.02, iy - 20, iw * 0.32, ih * 0.16);

  // MARKET EAST — darker stone, commercial floor
  fill(ep.roadBase[0] - 8, ep.roadBase[1] - 10, ep.roadBase[2] - 15, 160);
  ellipse(ix + iw * 0.18, iy - 14, iw * 0.16, ih * 0.10);

  // MILITARY SE — gravel/sand tone
  fill(ep.roadBase[0] - 2, ep.roadBase[1] - 5, ep.roadBase[2] - 2, 140);
  ellipse(ix + iw * 0.16, iy + ih * 0.02, iw * 0.16, ih * 0.10);

  // RESIDENTIAL NW — packed clay
  fill(ep.floorBase[0] - 12, ep.floorBase[1] - 15, ep.floorBase[2] - 18, 130);
  ellipse(ix - iw * 0.10, iy - 20, iw * 0.18, ih * 0.11);

  // DECUMANUS CORRIDOR — a wide paved strip E-W through the whole city
  let roadY = iy - 18;
  fill(ep.roadBase[0], ep.roadBase[1], ep.roadBase[2], 120);
  rect(ix - iw * 0.35, roadY - ih * 0.015, iw * 0.70, ih * 0.03);

  // CARDO CORRIDOR — N-S paved strip
  let cardoX = ix + iw * 0.02;
  fill(ep.roadBase[0], ep.roadBase[1], ep.roadBase[2], 100);
  rect(cardoX - iw * 0.012, iy - 18 - ih * 0.12, iw * 0.024, ih * 0.22);

  // Era 3: teal glow on paving at night
  if (ep.era >= 3 && bright < 0.3) {
    let nightGlow = map(bright, 0, 0.3, 1, 0);
    fill(60, 200, 180, 12 * nightGlow);
    ellipse(ix + iw * 0.02, iy - 20, iw * 0.34, ih * 0.18);
  }
}

// ─── ROMAN ROAD ───────────────────────────────────────────────────────────
function drawRomanRoad(ix, iy) {
  // Via Romana — era-aware road across the island
  let ep = getEraPalette();
  let roadY = WORLD.islandCY - 8; // consistent centerline
  let shrineSX = w2sX(WORLD.islandCX - 440);
  let farmSX = w2sX(WORLD.islandCX - 220);
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
  let bright = getSkyBrightness();
  let windPhase = sin(frameCount * 0.018) * 1.5;
  noStroke();
  state.grassTufts.forEach(g => {
    let gx = floor(w2sX(g.x));
    let gy = floor(w2sY(g.y));
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
  });
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
      fill(ng[0], ng[1], ng[2], 12 * nightAlpha);
      ellipse(sx, sy, nr * 2.5, nr * 1.5);
      fill(ng[0], ng[1], ng[2], 25 * nightAlpha);
      ellipse(sx, sy, nr * 1.2, nr * 0.8);
      fill(ng[0], ng[1], ng[2], 40 * nightAlpha);
      ellipse(sx, sy, nr * 0.5, nr * 0.35);
    });
  }
  if (state.crystalNodes) {
    state.crystalNodes.forEach(cn => {
      if (cn.respawnTimer > 0) return;
      let sx = w2sX(cn.x);
      let sy = w2sY(cn.y);
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

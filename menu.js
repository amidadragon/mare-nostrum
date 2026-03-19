// MARE NOSTRUM — Menu System
// Extracted from sketch.js. Uses globals: gameScreen, menuHover, menuFadeIn, menuKeyIdx, menuFadeOut, menuFadeAction, menuBgImg, snd, state, C

// ═══ MENU SYSTEM — Image background + animated overlays ═════════════════════
// ═══════════════════════════════════════════════════════════════════════════════

// Seeded sparkle positions (generated once)
let _menuSparkles = null;
let _menuDust = null;

function _initMenuParticles() {
  if (_menuSparkles) return;
  _menuSparkles = [];
  for (let i = 0; i < 35; i++) {
    _menuSparkles.push({
      x: 0.30 + (((i * 73 + 17) % 100) / 100) * 0.50, // sea area x: 30%-80%
      y: 0.35 + (((i * 53 + 31) % 100) / 100) * 0.35,  // sea area y: 35%-70%
      freq: 2.0 + (i % 7) * 1.3,
      phase: i * 2.7,
      gold: i % 4 === 0, // every 4th is gold instead of white
    });
  }
  _menuDust = [];
  for (let i = 0; i < 25; i++) {
    _menuDust.push({
      x: ((i * 97 + 11) % 100) / 100,
      y: 0.05 + ((i * 61 + 23) % 100) / 100 * 0.70,
      driftX: 0.002 + (i % 5) * 0.001,
      driftY: 0.001 + (i % 3) * 0.0005,
      freqX: 0.15 + (i % 4) * 0.08,
      freqY: 0.10 + (i % 3) * 0.06,
      phase: i * 1.9,
      fadeFreq: 0.4 + (i % 5) * 0.15,
    });
  }
}

function drawMenuScreen() {
  let w = width, h = height;
  let t0 = millis() / 1000;
  let aF = menuFadeIn / 255;
  noStroke();
  _initMenuParticles();

  // ─── DRAW BACKGROUND IMAGE (cover mode, subtle rocking) ───
  if (menuBgImg) {
    let scale = max(w / menuBgImg.width, h / menuBgImg.height);
    let iw = menuBgImg.width * scale;
    let ih = menuBgImg.height * scale;
    // Slow parallax drift
    let driftX = sin(t0 * 0.04) * w * 0.02;
    let driftY = cos(t0 * 0.03) * h * 0.01;
    // Subtle harbor rocking — very gentle rotation around center
    let rockAngle = sin(t0 * 0.3) * 0.002;
    push();
    translate(w / 2, h / 2);
    rotate(rockAngle);
    image(menuBgImg, -iw / 2 + driftX, -ih / 2 + driftY, iw, ih);
    pop();
  } else {
    // Procedural sky fallback — deep Mediterranean dusk
    for (let y = 0; y < h; y += 2) {
      let t = y / h;
      let r = lerp(8, 25, t);
      let g = lerp(12, 18, t);
      let b = lerp(30, 15, t);
      fill(r, g, b);
      rect(0, y, w, 2);
    }
  }

  // ─── CURSOR ───
  cursor(ARROW);

  // ─── SUB-SCREENS ───
  if (gameScreen === 'settings') { drawSettingsPanel(1); return; }
  if (gameScreen === 'credits') { drawCreditsPanel(1); return; }

  // ═══════════════════════════════════════════════════════════════════════
  // ─── ANIMATED SCENE OVERLAY — brings the background art to life ───
  // ═══════════════════════════════════════════════════════════════════════

  // ─── SUN GLOW PULSE — warm halo behind the sun ───
  let sunCX = w * 0.66, sunCY = h * 0.25;
  let sunPulse = 0.85 + sin(t0 * 0.6) * 0.15;
  fill(255, 220, 120, floor(12 * sunPulse * aF));
  ellipse(sunCX, sunCY, w * 0.35 * sunPulse, h * 0.3 * sunPulse);
  fill(255, 200, 80, floor(8 * sunPulse * aF));
  ellipse(sunCX, sunCY, w * 0.5 * sunPulse, h * 0.45 * sunPulse);

  // ─── WATER SHIMMER — horizontal scan lines on the sea ───
  let waterTop = h * 0.48, waterBot = h * 0.95;
  for (let y = floor(waterTop); y < floor(waterBot); y += 4) {
    let waveOff = sin(t0 * 1.2 + y * 0.03) * 3;
    let waveAlpha = (sin(t0 * 0.8 + y * 0.05) + 1) * 0.5;
    let deepFactor = (y - waterTop) / (waterBot - waterTop);
    fill(100, 180, 255, floor(4 * waveAlpha * aF * (1 - deepFactor * 0.6)));
    rect(waveOff, y, w, 2);
  }

  // ─── SUN REFLECTION COLUMN — shimmering golden path on water ───
  let refX = w * 0.66;
  for (let y = floor(h * 0.38); y < floor(h * 0.85); y += 3) {
    let t = (y - h * 0.38) / (h * 0.47);
    let spreadX = 15 + t * 60;
    let shimA = (sin(t0 * 2.5 + y * 0.08) + 1) * 0.5;
    let offX = sin(t0 * 0.9 + y * 0.04) * spreadX * 0.3;
    fill(255, 210, 120, floor((18 - t * 14) * shimA * aF));
    rect(floor(refX - spreadX / 2 + offX), y, floor(spreadX), 2);
  }

  // ─── BOATS BOBBING — 6 boats at fixed positions, gentle rock ───
  let boats = [
    { x: 0.42, y: 0.72, size: 0.6, phase: 0 },     // small rowboat left
    { x: 0.52, y: 0.62, size: 0.8, phase: 1.2 },    // medium boat center-left
    { x: 0.62, y: 0.68, size: 0.7, phase: 2.4 },    // boat center
    { x: 0.73, y: 0.58, size: 1.2, phase: 0.8 },    // large sailboat right
    { x: 0.55, y: 0.78, size: 0.5, phase: 3.1 },    // tiny boat near shore
    { x: 0.78, y: 0.75, size: 0.55, phase: 1.9 },   // small boat far right
    { x: 0.48, y: 0.88, size: 0.45, phase: 4.2 },   // beached boat
  ];
  for (let boat of boats) {
    let bx = boat.x * w;
    let bobY = sin(t0 * 0.8 + boat.phase) * 2.5 * boat.size;
    let rockAngle = sin(t0 * 0.6 + boat.phase + 1) * 0.03;
    let by = boat.y * h + bobY;
    // Subtle water displacement around boat
    fill(80, 160, 210, floor(15 * aF));
    ellipse(bx, by + 3, 20 * boat.size, 4 * boat.size);
    // Wake ripple
    let wakeA = (sin(t0 * 1.5 + boat.phase) + 1) * 0.3;
    fill(200, 230, 255, floor(12 * wakeA * aF));
    ellipse(bx, by + 2, 25 * boat.size, 3);
  }

  // ─── WOMAN'S HAIR & DRESS SWAY ───
  let womanX = w * 0.34, womanY = h * 0.72;
  // Hair sway — golden streaks
  let hairSway = sin(t0 * 1.5) * 4;
  let hairSway2 = sin(t0 * 1.8 + 0.5) * 3;
  fill(220, 190, 120, floor(25 * aF));
  // Hair strands blowing in wind
  for (let s = 0; s < 5; s++) {
    let sx = womanX - 8 + s * 3 + hairSway * (s * 0.2 + 0.5);
    let sy = womanY - 30 + s * 2;
    let sLen = 15 + s * 3;
    rect(floor(sx), floor(sy + hairSway2 * 0.3), 2, sLen);
  }
  // Dress hem flutter
  fill(220, 215, 225, floor(15 * aF));
  for (let d = 0; d < 4; d++) {
    let dx = womanX - 5 + d * 4 + sin(t0 * 2 + d) * 2;
    let dy = womanY + 15;
    rect(floor(dx), floor(dy + sin(t0 * 1.2 + d * 0.8) * 2), 3, 5);
  }

  // ─── BIRDS — flying across the sky ───
  if (!drawMenuScreen._birds) {
    drawMenuScreen._birds = [];
    for (let i = 0; i < 5; i++) {
      drawMenuScreen._birds.push({
        x: random(0.5, 1.0), y: random(0.12, 0.28),
        speed: random(0.008, 0.015), wingPhase: random(TWO_PI),
        size: random(3, 6),
      });
    }
  }
  for (let bird of drawMenuScreen._birds) {
    bird.x -= bird.speed * 0.016;
    if (bird.x < -0.05) { bird.x = 1.05; bird.y = random(0.1, 0.3); }
    let bx = bird.x * w, by = bird.y * h;
    let wingUp = sin(t0 * 5 + bird.wingPhase) * bird.size * 0.7;
    fill(30, 25, 40, floor(120 * aF));
    // Body
    rect(floor(bx - 1), floor(by), 3, 2);
    // Wings
    rect(floor(bx - bird.size), floor(by - wingUp), bird.size, 1);
    rect(floor(bx + 1), floor(by + wingUp * 0.8), bird.size, 1);
  }

  // ─── SHORE FOAM — animated waterline on the beach (multi-layer) ───
  let shoreY = h * 0.76;
  let foamAdvance = sin(t0 * 0.5) * 4;
  // Layer 1 — leading foam edge
  for (let x = floor(w * 0.08); x < floor(w * 0.42); x += 4) {
    let foamY = shoreY + foamAdvance + sin(x * 0.03 + t0 * 1.2) * 2;
    let foamA = (sin(t0 * 1.5 + x * 0.05) + 1) * 0.5;
    fill(230, 245, 255, floor(25 * foamA * aF));
    rect(x, floor(foamY), 4, 2);
  }
  // Layer 2 — receding foam line (offset phase, moves right)
  let foamAdv2 = sin(t0 * 0.5 + 1.8) * 5;
  for (let x = floor(w * 0.06); x < floor(w * 0.44); x += 3) {
    let foamY2 = shoreY + 4 + foamAdv2 + sin(x * 0.04 + t0 * 1.6 + 2.0) * 2.5;
    let foamA2 = (sin(t0 * 1.2 + x * 0.06 + 1.0) + 1) * 0.5;
    fill(240, 250, 255, floor(18 * foamA2 * aF));
    rect(x, floor(foamY2), 3, 1);
  }
  // Layer 3 — thin trailing foam wisps
  let foamAdv3 = sin(t0 * 0.4 + 3.5) * 3;
  for (let x = floor(w * 0.10); x < floor(w * 0.40); x += 6) {
    let foamY3 = shoreY + 8 + foamAdv3 + sin(x * 0.05 + t0 * 0.9 + 4.0) * 1.5;
    let foamA3 = (sin(t0 * 0.9 + x * 0.08 + 2.5) + 1) * 0.5;
    fill(255, 255, 255, floor(12 * foamA3 * aF));
    rect(x, floor(foamY3), 5, 1);
  }

  // ─── WINDOW LIGHTS — warm glow in building windows (oil lamp flicker) ───
  // Initialize per-light random phases once
  if (!drawMenuScreen._winPhases) {
    drawMenuScreen._winPhases = [];
    for (let i = 0; i < 10; i++) {
      drawMenuScreen._winPhases.push({
        phase1: (i * 7.3 + 2.1) % 6.28,
        phase2: (i * 4.9 + 0.8) % 6.28,
        phase3: (i * 11.1 + 5.3) % 6.28,
        speed1: 2.0 + (i % 4) * 0.7,
        speed2: 3.5 + (i % 3) * 1.2,
        speed3: 5.8 + (i % 5) * 0.9,
      });
    }
  }
  let windows = [
    [0.12, 0.38], [0.15, 0.42], [0.18, 0.35], [0.22, 0.40],
    [0.08, 0.43], [0.25, 0.37], [0.10, 0.46], [0.20, 0.44],
    [0.14, 0.50], [0.06, 0.40],
  ];
  for (let i = 0; i < windows.length; i++) {
    let wx = windows[i][0] * w, wy = windows[i][1] * h;
    let wp = drawMenuScreen._winPhases[i];
    // Multi-frequency flicker for realistic oil lamp effect
    let flicker = 0.6
      + sin(t0 * wp.speed1 + wp.phase1) * 0.18
      + sin(t0 * wp.speed2 + wp.phase2) * 0.12
      + sin(t0 * wp.speed3 + wp.phase3) * 0.08;
    // Occasional dim dip (lamp guttering)
    let gutter = sin(t0 * 0.4 + wp.phase1 * 3.0);
    if (gutter > 0.85) flicker *= 0.5;
    fill(255, 200, 100, floor(24 * flicker * aF));
    rect(floor(wx - 1), floor(wy - 1), 3, 3);
    // Inner bright core
    fill(255, 230, 160, floor(14 * flicker * aF));
    rect(floor(wx), floor(wy), 1, 1);
    // Warm glow halo
    fill(255, 170, 60, floor(10 * flicker * aF));
    ellipse(wx, wy, 14, 10);
  }

  // ─── CYPRESS TREE SWAY — trees on the hillside ───
  let cypresses = [
    [0.28, 0.20, 1.0], [0.32, 0.18, 0.8], [0.38, 0.22, 0.9],
    [0.85, 0.25, 1.1], [0.88, 0.30, 0.85], [0.92, 0.22, 0.95],
    [0.44, 0.28, 0.7],
  ];
  for (let cp of cypresses) {
    let cx2 = cp[0] * w, cy2 = cp[1] * h;
    let sway = sin(t0 * 0.8 + cp[0] * 10) * 2 * cp[2];
    // Subtle overlay sway hint
    fill(30, 60, 30, floor(10 * aF));
    rect(floor(cx2 - 3 + sway), floor(cy2 - 20 * cp[2]), 6, floor(20 * cp[2]));
  }

  // ─── CLOUD DRIFT — semi-transparent shapes drifting slowly ───
  if (!drawMenuScreen._clouds) {
    drawMenuScreen._clouds = [];
    for (let i = 0; i < 4; i++) {
      drawMenuScreen._clouds.push({
        x: random(-0.1, 1.1), y: random(0.05, 0.2),
        w: random(0.08, 0.15), h: random(0.02, 0.04),
        speed: random(0.003, 0.008), alpha: random(5, 12),
      });
    }
  }
  for (let cl of drawMenuScreen._clouds) {
    cl.x += cl.speed * 0.016;
    if (cl.x > 1.15) cl.x = -cl.w - 0.05;
    fill(255, 220, 200, floor(cl.alpha * aF));
    ellipse(cl.x * w, cl.y * h, cl.w * w, cl.h * h);
    fill(255, 230, 210, floor(cl.alpha * 0.6 * aF));
    ellipse(cl.x * w + cl.w * w * 0.2, cl.y * h - cl.h * h * 0.3, cl.w * w * 0.6, cl.h * h * 0.7);
  }

  // ─── BEACH SHELL SPARKLES — occasional glints on the foreground ───
  let shells = [[0.18, 0.85], [0.30, 0.90], [0.42, 0.92], [0.85, 0.88], [0.25, 0.87]];
  for (let i = 0; i < shells.length; i++) {
    let sparkOn = sin(t0 * 1.8 + i * 2.3) > 0.7;
    if (sparkOn) {
      let shx = shells[i][0] * w, shy = shells[i][1] * h;
      fill(255, 250, 230, floor(80 * aF));
      rect(floor(shx - 1), floor(shy - 2), 2, 4);
      rect(floor(shx - 2), floor(shy - 1), 4, 2);
    }
  }

  // ─── CINEMATIC VIGNETTE — dark edges, light center ───
  // Top vignette
  for (let y = 0; y < h * 0.25; y += 2) {
    let a = floor((1 - y / (h * 0.25)) * 120 * aF);
    fill(0, 0, 0, a);
    rect(0, y, w, 2);
  }
  // Bottom vignette — stronger, where menu lives
  for (let y = floor(h * 0.45); y < h; y += 2) {
    let t = (y - h * 0.45) / (h * 0.55);
    let a = floor(t * t * 220 * aF);
    fill(5, 3, 8, a);
    rect(0, y, w, 2);
  }
  // Side vignettes
  for (let x = 0; x < w * 0.15; x += 2) {
    let a = floor((1 - x / (w * 0.15)) * 80 * aF);
    fill(0, 0, 0, a);
    rect(x, 0, 2, h);
    rect(w - x - 2, 0, 2, h);
  }

  // ─── WATER SPARKLES — sea area ───
  for (let i = 0; i < _menuSparkles.length; i++) {
    let sp = _menuSparkles[i];
    let sx = floor(sp.x * w), sy = floor(sp.y * h);
    let on = sin(t0 * sp.freq + sp.phase) > 0.3;
    if (on) {
      let pulse = (sin(t0 * sp.freq * 1.5 + sp.phase) + 1) * 0.5;
      let a = floor((100 + pulse * 120) * aF);
      fill(sp.gold ? 255 : 255, sp.gold ? 210 : 250, sp.gold ? 80 : 230, a);
      rect(sx, sy, 2, 2);
      fill(sp.gold ? 255 : 240, sp.gold ? 200 : 240, sp.gold ? 60 : 210, floor(a * 0.2));
      ellipse(sx + 1, sy + 1, 7, 7);
    }
  }

  // ─── GOLDEN DUST — floating motes ───
  for (let i = 0; i < _menuDust.length; i++) {
    let d = _menuDust[i];
    let dx = (d.x + sin(t0 * d.freqX + d.phase) * 0.04 + t0 * d.driftX) % 1.0;
    let dy = d.y + sin(t0 * d.freqY + d.phase * 0.7) * 0.03;
    dy = ((dy % 0.85) + 0.85) % 0.85 + 0.05;
    let fadeA = (sin(t0 * d.fadeFreq + d.phase) + 1) * 0.5;
    let a = floor(fadeA * 140 * aF);
    if (a > 8) {
      let px = floor(dx * w), py = floor(dy * h);
      fill(255, 210, 90, floor(a * 0.25));
      ellipse(px, py, 6, 6);
      fill(255, 225, 120, a);
      rect(px - 1, py - 1, 2, 2);
    }
  }

  // ─── GOD RAYS — from upper right ───
  let sunX = floor(w * 0.65), sunY = floor(h * 0.2);
  let rayRot = t0 * PI / 240;
  for (let i = 0; i < 9; i++) {
    let angle = -PI * 0.55 + (i - 4) * 0.14 + rayRot;
    let rayLen = h * 0.7;
    let rw = 10 + (i % 3) * 8;
    let rayAlpha = floor((6 + (i % 2) * 4) * aF);
    fill(255, 215, 100, rayAlpha);
    beginShape();
    vertex(sunX, sunY);
    vertex(sunX + cos(angle) * rayLen - rw, sunY + sin(angle) * rayLen);
    vertex(sunX + cos(angle) * rayLen + rw, sunY + sin(angle) * rayLen);
    endShape(CLOSE);
  }

  // ─── ANIMATED HORIZON LINE — golden shimmer ───
  let horizY = floor(h * 0.42);
  let shimmer = sin(t0 * 0.8) * 0.3 + 0.7;
  fill(255, 200, 80, floor(18 * shimmer * aF));
  rect(0, horizY - 1, w, 3);

  // ═══════════════════════════════════════════════════════════════════════
  // ─── TITLE — large, centered, with golden glow ───
  // ═══════════════════════════════════════════════════════════════════════
  let titleAlpha = constrain(menuFadeIn / 180, 0, 1);
  let titleY = floor(h * 0.52);
  let ts = max(36, floor(min(w * 0.06, h * 0.08)));
  let titleBob = sin(t0 * 0.5) * 2;

  textAlign(CENTER, CENTER);
  textFont('Cinzel, Georgia, serif');

  // Title glow halo
  fill(255, 200, 80, floor(20 * titleAlpha));
  noStroke();
  ellipse(w / 2, titleY + titleBob, ts * 10, ts * 3);

  // Ornamental line above title
  let ornW = min(w * 0.35, 280);
  let ornY = titleY - ts * 0.7 + titleBob;
  stroke(200, 170, 100, floor(80 * titleAlpha));
  strokeWeight(1);
  line(w / 2 - ornW / 2, ornY, w / 2 - 20, ornY);
  line(w / 2 + 20, ornY, w / 2 + ornW / 2, ornY);
  // Diamond ornament center
  noStroke();
  fill(220, 190, 120, floor(160 * titleAlpha));
  let dSize = 5;
  beginShape();
  vertex(w / 2, ornY - dSize);
  vertex(w / 2 + dSize, ornY);
  vertex(w / 2, ornY + dSize);
  vertex(w / 2 - dSize, ornY);
  endShape(CLOSE);

  // Title text — multi-layer for depth + golden glow pulse
  textStyle(BOLD);
  textSize(ts);
  // Pulsing golden glow shadow (sin-based size oscillation)
  let glowPulse = 0.5 + sin(t0 * 0.8) * 0.5; // 0..1, slow
  let glowSize = floor(2 + glowPulse * 4); // 2..6px spread
  let glowAlpha = floor((15 + glowPulse * 25) * titleAlpha);
  fill(255, 200, 80, glowAlpha);
  for (let gd = -glowSize; gd <= glowSize; gd += 2) {
    text('MARE NOSTRUM', w / 2 + gd, titleY + titleBob);
    text('MARE NOSTRUM', w / 2, titleY + titleBob + gd);
  }
  // Outer glow
  fill(180, 140, 60, floor(40 * titleAlpha));
  text('MARE NOSTRUM', w / 2, titleY + titleBob + 3);
  text('MARE NOSTRUM', w / 2, titleY + titleBob - 1);
  // Drop shadow
  fill(10, 5, 0, floor(200 * titleAlpha));
  text('MARE NOSTRUM', w / 2 + 2, titleY + titleBob + 3);
  // Main gold text
  let goldPulse = 0.9 + sin(t0 * 1.2) * 0.1;
  fill(244 * goldPulse, 213 * goldPulse, 141, floor(255 * titleAlpha));
  text('MARE NOSTRUM', w / 2, titleY + titleBob);
  // Top highlight
  fill(255, 240, 200, floor(80 * titleAlpha));
  text('MARE NOSTRUM', w / 2, titleY + titleBob - 1);

  // ─── SUBTITLE ───
  let subAlpha = constrain((menuFadeIn - 80) / 175, 0, 1);
  let subY = titleY + ts * 0.65 + titleBob;
  textStyle(ITALIC);
  let subSize = max(11, floor(ts * 0.32));
  textSize(subSize);
  // Shadow
  fill(10, 5, 0, floor(150 * subAlpha));
  text('Shipwrecked.  Sunlit.  Reborn.', w / 2 + 1, subY + 1);
  // Text with pulsing brightness
  let subPulse = 0.85 + sin(t0 * 0.7 + 1) * 0.15;
  fill(212 * subPulse, 169 * subPulse, 106, floor(255 * subAlpha));
  text('Shipwrecked.  Sunlit.  Reborn.', w / 2, subY);

  // Ornamental line below subtitle
  let ornY2 = subY + subSize * 0.8;
  stroke(200, 170, 100, floor(50 * subAlpha));
  strokeWeight(1);
  line(w / 2 - ornW * 0.4, ornY2, w / 2 + ornW * 0.4, ornY2);
  noStroke();

  // ═══════════════════════════════════════════════════════════════════════
  // ─── MENU ITEMS — vertical, centered, with hover effects ───
  // ═══════════════════════════════════════════════════════════════════════
  textStyle(BOLD);
  textFont('Cinzel, Georgia, serif');
  let itemSize = max(13, floor(min(w * 0.02, h * 0.028)));
  textSize(itemSize);

  let hasSave = !!localStorage.getItem('sunlitIsles_save');
  let items = [];
  if (hasSave) items.push('CONTINUE VOYAGE');
  items.push('NEW VOYAGE');
  items.push('SETTINGS', 'CREDITS');
  let itemCount = items.length;

  let menuStartY = floor(h * 0.68);
  let itemGap = max(28, floor(h * 0.048));
  menuHover = -1;
  let isCursorPointer = false;

  for (let i = 0; i < itemCount; i++) {
    // Staggered slide-in: each item delayed, but all reach full alpha
    let slideProgress = constrain((menuFadeIn - 160 - i * 25) / 60, 0, 1);
    let itemAlpha = constrain(menuFadeIn / 255, 0, 1); // overall fade applies equally
    if (slideProgress <= 0) continue;

    let iy = menuStartY + i * itemGap;
    let iw = textWidth(items[i]);
    let hitPad = 20;
    let textTop = iy - itemSize * 0.8;
    let hovered = mouseX > w / 2 - iw / 2 - hitPad && mouseX < w / 2 + iw / 2 + hitPad &&
                  mouseY > textTop - 8 && mouseY < textTop + itemSize + 8;
    if (hovered) { menuHover = i; menuKeyIdx = -1; isCursorPointer = true; }
    let selected = hovered || menuKeyIdx === i;

    // Slide-in offset (items slide in from right, eased)
    let slideEase = 1 - pow(1 - slideProgress, 3); // cubic ease-out
    let slideX = (1 - slideEase) * 60;

    if (selected) {
      // Highlight bar behind text
      let barW = iw + 60;
      fill(200, 170, 80, floor(25 * itemAlpha));
      rect(w / 2 - barW / 2 + slideX, iy - itemSize * 0.55, barW, itemSize * 1.2, 3);

      // Left ornament — animated laurel/arrow
      let arrowX = w / 2 - iw / 2 - 22 + slideX;
      let arrowBob = sin(t0 * 3) * 1.5;
      fill(244, 213, 141, floor(255 * itemAlpha));
      // Roman chevron >>>
      triangle(arrowX + arrowBob, iy - 4, arrowX + arrowBob, iy + 4, arrowX + 8 + arrowBob, iy);
      triangle(arrowX + 6 + arrowBob, iy - 3, arrowX + 6 + arrowBob, iy + 3, arrowX + 12 + arrowBob, iy);

      // Right ornament — mirrored
      let arrowX2 = w / 2 + iw / 2 + 10 + slideX;
      triangle(arrowX2 - arrowBob, iy - 4, arrowX2 - arrowBob, iy + 4, arrowX2 - 8 - arrowBob, iy);
      triangle(arrowX2 - 6 - arrowBob, iy - 3, arrowX2 - 6 - arrowBob, iy + 3, arrowX2 - 12 - arrowBob, iy);

      // Bright gold text
      fill(10, 5, 0, floor(160 * itemAlpha));
      text(items[i], w / 2 + 1 + slideX, iy + 1);
      fill(255, 230, 160, floor(255 * itemAlpha));
      text(items[i], w / 2 + slideX, iy);
    } else {
      // Dim text with subtle shadow
      fill(10, 5, 0, floor(80 * itemAlpha));
      text(items[i], w / 2 + 1 + slideX, iy + 1);
      fill(170, 150, 120, floor(200 * itemAlpha));
      text(items[i], w / 2 + slideX, iy);
    }
  }

  // Set cursor style
  if (isCursorPointer) cursor(HAND);

  // ─── VERSION + HINT at bottom ───
  let botAlpha = constrain((menuFadeIn - 200) / 55, 0, 1);
  textStyle(NORMAL);
  textSize(8);
  // Parchment strip behind version
  fill(20, 15, 10, floor(100 * botAlpha));
  rect(w / 2 - 100, h - 26, 200, 16, 2);
  fill(130, 115, 85, floor(100 * botAlpha));
  text('v1.0  -  Shipwrecked. Sunlit. Reborn.', w / 2, h - 18);

  // ─── FADES ───
  if (aF < 1) { fill(0, 0, 0, floor(255 * (1 - aF))); rect(0, 0, w, h); }
  if (menuFadeOut > 0) { fill(0, 0, 0, floor(menuFadeOut)); rect(0, 0, w, h); }
}

// ─── SETTINGS PANEL (overlay) ────────────────────────────────────────────
function _drawPanelFrame(px, py, panW, panH) {
  // Outer shadow
  fill(0, 0, 0, 80);
  rect(px + 4, py + 4, panW, panH);
  // Outer border — dark wood
  fill(18, 14, 10, 250);
  rect(px - 3, py - 3, panW + 6, panH + 6);
  // Aged parchment body
  fill(42, 36, 28, 252);
  rect(px, py, panW, panH);
  // Parchment texture noise — subtle horizontal grain
  for (let ty = py + 6; ty < py + panH - 6; ty += 6) {
    let tA = 4 + ((ty * 7 + 13) % 5);
    fill(120, 100, 70, tA);
    rect(px + 4, ty, panW - 8, 1);
  }
  // Gold border — double inset
  stroke(180, 150, 55, 140);
  strokeWeight(1);
  noFill();
  rect(px + 1, py + 1, panW - 2, panH - 2);
  rect(px + 4, py + 4, panW - 8, panH - 8);
  noStroke();
  // Corner ornaments — small diamond at each corner
  let corners = [[px + 4, py + 4], [px + panW - 5, py + 4], [px + 4, py + panH - 5], [px + panW - 5, py + panH - 5]];
  fill(200, 170, 70, 160);
  for (let c of corners) {
    beginShape();
    vertex(c[0], c[1] - 3); vertex(c[0] + 3, c[1]);
    vertex(c[0], c[1] + 3); vertex(c[0] - 3, c[1]);
    endShape(CLOSE);
  }
}

function _drawSectionDivider(cx, y, divW) {
  stroke(140, 120, 60, 60);
  strokeWeight(1);
  line(cx - divW / 2, y, cx - 8, y);
  line(cx + 8, y, cx + divW / 2, y);
  noStroke();
  fill(180, 150, 70, 80);
  rect(cx - 2, y - 2, 4, 4);
}

function drawSettingsPanel(fadeA) {
  let w = width, h = height;
  let panW = 280, panH = 340;
  let px = floor(w / 2 - panW / 2), py = floor(h * 0.26);

  fill(0, 0, 0, 170); rect(0, 0, w, h);

  _drawPanelFrame(px, py, panW, panH);

  textAlign(CENTER, CENTER);
  textFont('Cinzel, Georgia, serif');
  // Title with gold glow
  fill(255, 210, 80, 20);
  textSize(15);
  text('SETTINGS', w / 2, py + 20);
  fill(244, 213, 141); textSize(14);
  text('SETTINGS', w / 2, py + 20);

  _drawSectionDivider(w / 2, py + 36, panW - 40);

  let fsY = py + 54;
  let fsOn = document.fullscreenElement != null;
  fill(190, 170, 130, 220); textSize(10);
  textAlign(RIGHT, CENTER);
  text('Fullscreen', w / 2 + 12, fsY);
  textAlign(CENTER, CENTER);
  let tbx = floor(w / 2 + 40), tby = fsY - 7;
  // Toggle track
  fill(30, 25, 18); rect(tbx, tby, 28, 14, 2);
  fill(fsOn ? 75 : 40, fsOn ? 120 : 50, fsOn ? 45 : 35, 230);
  rect(tbx + 1, tby + 1, 26, 12, 2);
  // Toggle knob with highlight
  fill(220, 210, 180); rect(tbx + (fsOn ? 16 : 2), tby + 2, 10, 10, 1);
  fill(240, 230, 200, 80); rect(tbx + (fsOn ? 17 : 3), tby + 3, 8, 2);

  if (snd) {
    _drawSectionDivider(w / 2, py + 72, panW - 50);

    let sliderY = py + 88, sliderW = 120, slX = floor(w / 2 + 10);
    let keys = ['master', 'sfx', 'ambient', 'music'];
    let labels = ['Master', 'SFX', 'Ambient', 'Music'];
    for (let ki = 0; ki < keys.length; ki++) {
      fill(190, 170, 130, 220); textSize(10);
      textAlign(RIGHT, CENTER);
      text(labels[ki], w / 2, sliderY);
      textAlign(CENTER, CENTER);
      let vol = snd.vol ? snd.vol[keys[ki]] || 0.5 : 0.5;
      // Track groove
      fill(25, 22, 16); rect(slX, sliderY - 3, sliderW, 6, 1);
      fill(35, 30, 22); rect(slX + 1, sliderY - 2, sliderW - 2, 4, 1);
      // Filled portion — warm gold gradient feel
      fill(180, 155, 50); rect(slX + 1, sliderY - 2, floor(vol * (sliderW - 2)), 4, 1);
      fill(200, 175, 70, 60); rect(slX + 1, sliderY - 2, floor(vol * (sliderW - 2)), 2);
      // Knob with glow
      let knobX = slX + floor(vol * sliderW) - 4;
      fill(255, 220, 100, 25); ellipse(knobX + 4, sliderY, 16, 16);
      fill(40, 34, 26); rect(knobX, sliderY - 6, 8, 12, 1);
      fill(220, 200, 120); rect(knobX + 1, sliderY - 5, 6, 10, 1);
      fill(240, 225, 160, 100); rect(knobX + 2, sliderY - 4, 4, 3);
      // Percentage
      fill(130, 115, 85, 100); textSize(7);
      text(floor(vol * 100) + '%', slX + sliderW + 18, sliderY);
      sliderY += 28;
    }
  }

  _drawSectionDivider(w / 2, py + 210, panW - 50);

  // Delete save — red tinted with hover
  let delY = py + 240;
  let delHover = mouseX > w/2 - 60 && mouseX < w/2 + 60 && mouseY > delY - 10 && mouseY < delY + 12;
  if (delHover) {
    fill(100, 30, 20, 40); rect(w/2 - 65, delY - 10, 130, 22, 2);
    fill(200, 70, 50, 240);
  } else {
    fill(140, 55, 42, 200);
  }
  textSize(10); text('Delete Save Data', w / 2, delY);

  let backY = py + panH - 25;
  let bkH = mouseX > w/2 - 40 && mouseX < w/2 + 40 && mouseY > backY - 8 && mouseY < backY + 10;
  // Back button with underline highlight
  if (bkH) {
    fill(255, 220, 100, 15); rect(w/2 - 45, backY - 10, 90, 22, 2);
    fill(244, 220, 140);
    stroke(244, 213, 141, 80); strokeWeight(1);
    line(w/2 - 25, backY + 8, w/2 + 25, backY + 8);
    noStroke();
  } else {
    fill(180, 165, 120);
  }
  textSize(11); text('[ BACK ]', w / 2, backY);
  textAlign(LEFT, TOP);
}

// ─── CREDITS PANEL ───────────────────────────────────────────────────────
let _creditsScroll = 0;
function drawCreditsPanel(fadeA) {
  let w = width, h = height;
  let t0 = millis() / 1000;
  let panW = 320, panH = 380;
  let px = floor(w / 2 - panW / 2), py = floor(h / 2 - panH / 2);

  fill(0, 0, 0, 185); rect(0, 0, w, h);

  _drawPanelFrame(px, py, panW, panH);

  _creditsScroll += 0.3;
  let sections = [
    { type: 'title', text: 'MARE NOSTRUM' },
    { type: 'sub', text: 'Shipwrecked. Sunlit. Reborn.' },
    { type: 'gap' },
    { type: 'divider' },
    { type: 'gap' },
    { type: 'heading', text: 'DESIGN & DIRECTION' },
    { type: 'line', text: 'Aurelian Forge Studio' },
    { type: 'gap' },
    { type: 'divider' },
    { type: 'gap' },
    { type: 'heading', text: 'CODE' },
    { type: 'line', text: 'Game Engine & Systems' },
    { type: 'line', text: 'Narrative Engine' },
    { type: 'line', text: 'Combat & Economy' },
    { type: 'line', text: 'Procedural Audio' },
    { type: 'gap' },
    { type: 'divider' },
    { type: 'gap' },
    { type: 'heading', text: 'ART' },
    { type: 'line', text: 'Hand-placed pixel primitives' },
    { type: 'line', text: 'Every tree, tile and toga' },
    { type: 'line', text: 'drawn with rect() and ellipse()' },
    { type: 'gap' },
    { type: 'divider' },
    { type: 'gap' },
    { type: 'heading', text: 'AUDIO' },
    { type: 'line', text: 'Procedural lyre system' },
    { type: 'line', text: 'Ambient wind & waves' },
    { type: 'line', text: 'All synthesized — zero samples' },
    { type: 'gap' },
    { type: 'divider' },
    { type: 'gap' },
    { type: 'heading', text: 'ENGINE' },
    { type: 'line', text: 'p5.js — Processing for the web' },
    { type: 'line', text: 'p5.sound — Web Audio API' },
    { type: 'gap' },
    { type: 'divider' },
    { type: 'gap' },
    { type: 'heading', text: 'SPECIAL THANKS' },
    { type: 'line', text: 'The p5.js community' },
    { type: 'line', text: 'Ancient Rome, for the inspiration' },
    { type: 'line', text: 'You, for playing' },
    { type: 'gap' },
    { type: 'gap' },
    { type: 'thanks', text: 'Thank you for playing' },
    { type: 'sub', text: 'Mare Nostrum endures.' },
  ];

  textAlign(CENTER, CENTER);
  textFont('Cinzel, Georgia, serif');
  let clipTop = py + 34, clipBot = py + panH - 42;
  let totalH = 0;
  for (let s of sections) {
    if (s.type === 'gap' || s.type === 'divider') totalH += 12;
    else totalH += s.type === 'title' ? 24 : s.type === 'thanks' ? 22 : 18;
  }
  let lineY = clipTop + 30 - (_creditsScroll % (totalH + panH));
  if (lineY < clipTop - totalH) _creditsScroll = 0;

  for (let s of sections) {
    if (s.type === 'gap') { lineY += 12; continue; }
    if (s.type === 'divider') {
      if (lineY > clipTop - 10 && lineY < clipBot + 10) {
        let dAlpha = 255;
        if (lineY < clipTop + 20) dAlpha = map(lineY, clipTop - 10, clipTop + 20, 0, 255);
        if (lineY > clipBot - 20) dAlpha = map(lineY, clipBot - 20, clipBot + 10, 255, 0);
        dAlpha = constrain(dAlpha, 0, 255);
        stroke(140, 120, 60, dAlpha * 0.25);
        strokeWeight(1);
        line(w / 2 - 60, lineY, w / 2 - 6, lineY);
        line(w / 2 + 6, lineY, w / 2 + 60, lineY);
        noStroke();
        fill(200, 170, 70, dAlpha * 0.4);
        rect(w / 2 - 2, lineY - 2, 4, 4);
      }
      lineY += 12; continue;
    }
    if (lineY > clipTop - 20 && lineY < clipBot + 20) {
      let alpha = 255;
      if (lineY < clipTop + 20) alpha = map(lineY, clipTop - 20, clipTop + 20, 0, 255);
      if (lineY > clipBot - 20) alpha = map(lineY, clipBot - 20, clipBot + 20, 255, 0);
      alpha = constrain(alpha, 0, 255);
      if (s.type === 'title') {
        // Glow behind title
        fill(255, 200, 80, alpha * 0.08);
        ellipse(w / 2, lineY, 180, 30);
        fill(10, 5, 0, alpha * 0.5); textSize(17);
        text(s.text, w / 2 + 1, lineY + 1);
        fill(244, 213, 141, alpha); textSize(17);
        text(s.text, w / 2, lineY);
      } else if (s.type === 'thanks') {
        let pulse = 0.8 + sin(t0 * 0.8) * 0.2;
        fill(255, 215, 80, alpha * pulse);
        textSize(14);
        text(s.text, w / 2, lineY);
      } else if (s.type === 'heading') {
        fill(220, 195, 60, alpha); textSize(11);
        textStyle(BOLD);
        text(s.text, w / 2, lineY);
        textStyle(NORMAL);
      } else if (s.type === 'sub') {
        fill(200, 170, 100, alpha * 0.7); textSize(9);
        textStyle(ITALIC);
        text(s.text, w / 2, lineY);
        textStyle(NORMAL);
      } else {
        fill(190, 175, 145, alpha * 0.85); textSize(9);
        text(s.text, w / 2, lineY);
      }
    }
    lineY += s.type === 'title' ? 24 : s.type === 'thanks' ? 22 : 18;
  }

  // Title bar — solid cover with ornament
  fill(42, 36, 28, 252); noStroke();
  rect(px + 5, py + 5, panW - 10, 28);
  fill(255, 210, 80, 18);
  textSize(14);
  text('CREDITS', w / 2, py + 18);
  fill(244, 213, 141); textSize(13); textAlign(CENTER, CENTER);
  text('CREDITS', w / 2, py + 18);
  // Underline ornament
  stroke(180, 150, 55, 80); strokeWeight(1);
  line(w / 2 - 40, py + 30, w / 2 + 40, py + 30);
  noStroke();

  // Bottom bar — solid cover
  fill(42, 36, 28, 252); noStroke();
  rect(px + 5, py + panH - 40, panW - 10, 36);

  let backY = py + panH - 22;
  let bkH = mouseX > w/2 - 40 && mouseX < w/2 + 40 && mouseY > backY - 8 && mouseY < backY + 10;
  if (bkH) {
    fill(255, 220, 100, 15); rect(w/2 - 45, backY - 10, 90, 22, 2);
    fill(244, 220, 140);
    stroke(244, 213, 141, 80); strokeWeight(1);
    line(w/2 - 25, backY + 8, w/2 + 25, backY + 8);
    noStroke();
  } else {
    fill(180, 165, 120);
  }
  textSize(11); text('[ BACK ]', w / 2, backY);
  textAlign(LEFT, TOP);
}

// ─── MENU CLICK HANDLER ─────────────────────────────────────────────────
function handleMenuClick() {
  if (gameScreen === 'settings') {
    let py = floor(height * 0.26);
    let fsY = py + 50;
    let tbx = floor(width / 2 + 40), tby = fsY - 7;
    if (mouseX > tbx && mouseX < tbx + 28 && mouseY > tby && mouseY < tby + 14) {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen().catch(() => {});
      return;
    }
    if (snd) {
      let sliderY = py + 80, sliderW = 120, slX = floor(width / 2 + 10);
      let keys = ['master', 'sfx', 'ambient', 'music'];
      for (let k of keys) {
        if (mouseX >= slX - 4 && mouseX <= slX + sliderW + 4 && mouseY >= sliderY - 10 && mouseY <= sliderY + 10) {
          snd.setVolume(k, constrain((mouseX - slX) / sliderW, 0, 1));
          return;
        }
        sliderY += 24;
      }
    }
    let delY = py + 250;
    if (mouseX > width/2 - 60 && mouseX < width/2 + 60 && mouseY > delY - 10 && mouseY < delY + 12) {
      if (localStorage.getItem('sunlitIsles_save')) localStorage.removeItem('sunlitIsles_save');
      return;
    }
    let backY = py + 340 - 25;
    if (mouseX > width/2 - 40 && mouseX < width/2 + 40 && mouseY > backY - 8 && mouseY < backY + 10) {
      gameScreen = 'menu'; return;
    }
    return;
  }
  if (gameScreen === 'credits') {
    let panH = 380, py = floor(height / 2 - panH / 2);
    let backY = py + panH - 22;
    if (mouseX > width/2 - 40 && mouseX < width/2 + 40 && mouseY > backY - 8 && mouseY < backY + 10) {
      gameScreen = 'menu'; return;
    }
    return;
  }
  if (menuHover < 0 || menuFadeOut > 0) return;
  let hasSave = !!localStorage.getItem('sunlitIsles_save');
  let btns = [];
  if (hasSave) btns.push('load');
  btns.push('new', 'settings', 'credits');
  let action = btns[menuHover];
  if (action === 'settings') { gameScreen = 'settings'; return; }
  if (action === 'credits') { gameScreen = 'credits'; return; }
  // Fade to black, then execute action
  menuFadeOut = 1;
  menuFadeAction = action === 'new' ? startNewGame : startLoadGame;
}

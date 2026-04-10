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
  if (gameScreen === 'howtoplay') { drawHowToPlayPanel(1); return; }
  if (gameScreen === 'multiplayer') { drawMultiplayerPanel(1); return; }

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


  // --- FLOATING FIREFLIES --- warm embers drifting up
  if (!drawMenuScreen._fireflies) {
    drawMenuScreen._fireflies = [];
    for (let i = 0; i < 15; i++) drawMenuScreen._fireflies.push({ x: random(0.1, 0.9), y: random(0.5, 1.0), sp: random(0.01, 0.025), ph: random(TWO_PI), wobble: random(0.3, 0.8) });
  }
  for (let ff of drawMenuScreen._fireflies) {
    ff.y -= ff.sp * 0.016;
    if (ff.y < 0.1) { ff.y = 1.0; ff.x = random(0.1, 0.9); }
    let ffA = sin(t0 * 1.5 + ff.ph) * 0.5 + 0.5;
    let ffX = ff.x * w + sin(t0 * ff.wobble + ff.ph) * 8;
    fill(255, 180, 60, floor(ffA * 120 * aF));
    ellipse(ffX, ff.y * h, 3, 3);
    fill(255, 200, 100, floor(ffA * 40 * aF));
    ellipse(ffX, ff.y * h, 7, 7);
  }

  // --- CLOUD SHADOWS --- dark patches drifting across
  if (!drawMenuScreen._cloudShadows) {
    drawMenuScreen._cloudShadows = [];
    for (let i = 0; i < 3; i++) drawMenuScreen._cloudShadows.push({ x: random(-0.3, 1.0), y: 0.25 + i * 0.15, sp: random(0.002, 0.004) });
  }
  for (let cs of drawMenuScreen._cloudShadows) {
    cs.x += cs.sp * 0.016;
    if (cs.x > 1.3) cs.x = -0.3;
    fill(0, 0, 0, floor(7 * aF));
    ellipse(cs.x * w, cs.y * h, w * 0.2, h * 0.08);
  }

  // --- LENS FLARE --- subtle horizontal streak near sun
  let flareA = (sin(t0 * 0.4) * 0.5 + 0.5) * 18;
  fill(255, 230, 160, floor(flareA * aF));
  ellipse(sunX + 20, sunY + 5, w * 0.18, 4);

  // --- SMOKE WISPS --- from buildings on right
  for (let si = 0; si < 3; si++) {
    let smX = w * (0.10 + si * 0.06);
    for (let sy2 = 0; sy2 < 30; sy2 += 3) {
      let smY = h * (0.35 - sy2 * 0.005) - t0 * 3 % 20;
      let wobX = sin(t0 * 0.6 + si * 2 + sy2 * 0.2) * 4;
      let smA = max(0, 12 - sy2 * 0.4);
      fill(180, 170, 160, floor(smA * aF));
      rect(floor(smX + wobX), floor(smY), 2, 3);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ─── ANIMATED BRAZIERS — flickering fire with warm glow cast ───
  // ═══════════════════════════════════════════════════════════════════════
  let _braziers = [
    { x: 0.12, y: 0.42, size: 1.0 },   // left building rooftop
    { x: 0.22, y: 0.44, size: 0.7 },   // left building lower
    { x: 0.86, y: 0.38, size: 0.9 },   // right side
    { x: 0.92, y: 0.42, size: 0.6 },   // far right
  ];
  for (let bi = 0; bi < _braziers.length; bi++) {
    let bz = _braziers[bi];
    let fx = bz.x * w, fy = bz.y * h;
    let flick = 0.6 + sin(t0 * 8 + bi * 3.7) * 0.2 + sin(t0 * 13 + bi * 5.1) * 0.15 + random() * 0.05;
    let fSize = 12 * bz.size * flick;
    // Warm glow cast on surroundings
    fill(255, 140, 40, floor(12 * flick * aF));
    ellipse(fx, fy, fSize * 8, fSize * 5);
    fill(255, 100, 20, floor(8 * flick * aF));
    ellipse(fx, fy - 2, fSize * 5, fSize * 3);
    // Fire core — multiple dancing tongues
    for (let fi = 0; fi < 4; fi++) {
      let tongueX = fx + sin(t0 * 10 + fi * 2.5 + bi) * 3 * bz.size;
      let tongueY = fy - fi * 2 * bz.size - sin(t0 * 7 + fi * 1.8) * 2;
      let tH = (4 - fi) * 2 * bz.size * flick;
      // Outer flame (orange)
      fill(255, 120 + fi * 30, 20, floor((180 - fi * 40) * aF * flick));
      ellipse(tongueX, tongueY, 3 * bz.size, tH);
      // Inner flame (yellow)
      if (fi < 2) {
        fill(255, 220, 80, floor((120 - fi * 30) * aF * flick));
        ellipse(tongueX, tongueY + 1, 2 * bz.size, tH * 0.6);
      }
    }
    // Sparks rising from brazier
    for (let sp = 0; sp < 2; sp++) {
      let sparkT = (t0 * 2 + bi * 1.3 + sp * 3.7) % 3.0;
      if (sparkT < 1.5) {
        let spX = fx + sin(t0 * 5 + sp * 4 + bi) * 6;
        let spY = fy - sparkT * 20 * bz.size;
        let spA = (1 - sparkT / 1.5) * 200;
        fill(255, 200, 60, floor(spA * aF));
        rect(floor(spX), floor(spY), 1, 1);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ─── TRIREME SAILING — majestic warship crossing the harbor ───
  // ═══════════════════════════════════════════════════════════════════════
  if (!drawMenuScreen._trireme) {
    drawMenuScreen._trireme = { x: 1.15, y: 0.52, speed: 0.006, oarPhase: 0 };
  }
  let tri = drawMenuScreen._trireme;
  tri.x -= tri.speed * 0.016;
  tri.oarPhase += 0.03;
  if (tri.x < -0.15) { tri.x = 1.15; tri.y = 0.50 + random() * 0.06; }
  let tx = tri.x * w, ty = tri.y * h;
  let tBob = sin(t0 * 0.7 + 2.5) * 3;
  let tRock = sin(t0 * 0.5) * 0.015;
  push();
  translate(tx, ty + tBob);
  rotate(tRock);
  // Hull
  fill(60, 45, 30, floor(180 * aF));
  beginShape();
  vertex(-28, 0); vertex(-32, -4); vertex(30, -4); vertex(35, 0);
  vertex(30, 3); vertex(-28, 3);
  endShape(CLOSE);
  // Ram/prow
  fill(100, 80, 50, floor(200 * aF));
  triangle(35, -2, 42, -1, 35, 1);
  // Mast
  stroke(70, 55, 40, floor(180 * aF));
  strokeWeight(1.5);
  line(5, -4, 5, -28);
  noStroke();
  // Sail — billowing
  let sailBillow = sin(t0 * 1.2) * 3;
  fill(200, 180, 150, floor(160 * aF));
  beginShape();
  vertex(-8, -25); vertex(18, -25);
  vertex(18 + sailBillow, -14);
  vertex(-8 + sailBillow * 0.5, -14);
  endShape(CLOSE);
  // Sail stripe (red)
  fill(160, 50, 40, floor(120 * aF));
  rect(-4 + sailBillow * 0.3, -22, 14, 3);
  // Oars — 4 per side, animated
  stroke(80, 65, 45, floor(100 * aF));
  strokeWeight(0.8);
  for (let oi = 0; oi < 4; oi++) {
    let oarX = -15 + oi * 10;
    let oarAngle = sin(tri.oarPhase + oi * 0.8) * 0.4;
    // Port side (top)
    line(oarX, -4, oarX + cos(oarAngle) * 8, -4 - sin(oarAngle) * 12);
    // Starboard side (bottom)
    line(oarX, 3, oarX + cos(oarAngle) * 8, 3 + sin(oarAngle) * 12);
  }
  noStroke();
  // Wake behind ship
  for (let wi = 0; wi < 6; wi++) {
    let wakeX = -30 - wi * 8;
    let wakeA = (1 - wi / 6) * 25;
    fill(200, 230, 255, floor(wakeA * aF));
    ellipse(wakeX, 1, 6 + wi * 2, 2);
  }
  pop();

  // ═══════════════════════════════════════════════════════════════════════
  // ─── FISH JUMPING — occasional splash in the harbor ───
  // ═══════════════════════════════════════════════════════════════════════
  if (!drawMenuScreen._fish) {
    drawMenuScreen._fish = [];
    for (let fi = 0; fi < 3; fi++) {
      drawMenuScreen._fish.push({
        x: 0.35 + random() * 0.40,
        y: 0.55 + random() * 0.20,
        timer: random() * 8,
        cycle: 5 + random() * 6,  // seconds between jumps
      });
    }
  }
  for (let fish of drawMenuScreen._fish) {
    let jumpT = (t0 + fish.timer) % fish.cycle;
    if (jumpT < 0.6) {
      let jumpPhase = jumpT / 0.6;
      let jumpArc = sin(jumpPhase * PI);
      let fjx = fish.x * w, fjy = fish.y * h;
      // Fish body arcing out of water
      let fishY = fjy - jumpArc * 18;
      let fishAngle = (jumpPhase < 0.5 ? -1 : 1) * 0.5;
      push();
      translate(fjx, fishY);
      rotate(fishAngle);
      fill(140, 160, 180, floor(180 * aF * jumpArc));
      ellipse(0, 0, 6, 3);  // body
      triangle(3, 0, 6, -2, 6, 2);  // tail
      pop();
      // Splash rings
      if (jumpPhase > 0.1) {
        let ringSize = jumpPhase * 20;
        fill(220, 240, 255, floor((1 - jumpPhase) * 60 * aF));
        ellipse(fjx, fjy, ringSize, ringSize * 0.3);
      }
      // Water droplets
      for (let di = 0; di < 3; di++) {
        let dropT = jumpPhase - 0.1 * di;
        if (dropT > 0 && dropT < 0.8) {
          let dropX = fjx + (di - 1) * 5;
          let dropY = fjy - sin(dropT * PI) * 12 * (1 - di * 0.2);
          fill(180, 210, 240, floor((1 - dropT) * 100 * aF));
          rect(floor(dropX), floor(dropY), 1, 2);
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ─── SWAYING VEGETATION — palm/cypress trees with wind ───
  // ═══════════════════════════════════════════════════════════════════════
  let vegPositions = [
    { x: 0.04, y: 0.50, h: 35, type: 'palm' },
    { x: 0.08, y: 0.48, h: 28, type: 'cypress' },
    { x: 0.94, y: 0.46, h: 32, type: 'palm' },
    { x: 0.97, y: 0.44, h: 25, type: 'cypress' },
  ];
  for (let vi = 0; vi < vegPositions.length; vi++) {
    let veg = vegPositions[vi];
    let vx = veg.x * w, vy = veg.y * h;
    let windSway = sin(t0 * 1.0 + vi * 2.3) * 4;
    let gust = sin(t0 * 2.5 + vi * 1.7) * 2;
    if (veg.type === 'palm') {
      // Trunk — curved with wind
      stroke(80, 65, 45, floor(80 * aF));
      strokeWeight(2);
      let tipX = vx + windSway + gust;
      let tipY = vy - veg.h;
      // Curved trunk (bezier approximation with 3 line segments)
      let midX = vx + windSway * 0.4;
      let midY = vy - veg.h * 0.5;
      line(vx, vy, midX, midY);
      line(midX, midY, tipX, tipY);
      noStroke();
      // Fronds — 5 drooping leaves
      for (let fi = 0; fi < 5; fi++) {
        let frondAng = -PI * 0.7 + fi * PI * 0.35;
        let frondLen = 12 + fi % 2 * 4;
        let frondSway = sin(t0 * 1.5 + fi * 1.2 + vi) * 3;
        let fEndX = tipX + cos(frondAng) * frondLen + frondSway;
        let fEndY = tipY + sin(frondAng) * frondLen * 0.6 + abs(frondSway) * 0.5;
        stroke(50, 90, 35, floor(80 * aF));
        strokeWeight(1);
        line(tipX, tipY, fEndX, fEndY);
      }
      noStroke();
    } else {
      // Cypress — tall thin triangle swaying
      let topX = vx + windSway * 0.7 + gust * 0.5;
      fill(40, 65, 30, floor(70 * aF));
      triangle(vx - 4, vy, vx + 4, vy, topX, vy - veg.h);
      fill(50, 80, 35, floor(50 * aF));
      triangle(vx - 3, vy - 5, vx + 3, vy - 5, topX, vy - veg.h + 3);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ─── ANIMATED WATER SURFACE — rolling wave bands across harbor ───
  // ═══════════════════════════════════════════════════════════════════════
  for (let wy = floor(h * 0.50); wy < floor(h * 0.90); wy += 8) {
    let depth = (wy - h * 0.50) / (h * 0.40);
    // Primary wave
    let waveX = sin(t0 * 0.8 + wy * 0.02) * 30 * (1 - depth * 0.5);
    let waveA = (sin(t0 * 1.0 + wy * 0.04) + 1) * 0.5;
    // Bright crest
    fill(160, 200, 240, floor(8 * waveA * aF * (1 - depth * 0.7)));
    rect(waveX + w * 0.1, wy, w * 0.7, 1);
    // Dark trough below
    fill(10, 30, 60, floor(6 * waveA * aF * (1 - depth * 0.7)));
    rect(waveX + w * 0.1, wy + 3, w * 0.7, 1);
  }

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
  let titleGlowA = 0.9 + sin(t0 * 1.0) * 0.1;
  fill(244 * goldPulse, 213 * goldPulse, 141, floor(255 * titleAlpha * titleGlowA));
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
  text('Cozy Roman Survival', w / 2 + 1, subY + 1);
  // Text with pulsing brightness
  let subPulse = 0.85 + sin(t0 * 0.7 + 1) * 0.15;
  fill(212 * subPulse, 169 * subPulse, 106, floor(255 * subAlpha));
  text('Cozy Roman Survival', w / 2, subY);

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

  let _rs = null;
  try { _rs = localStorage.getItem('mare_nostrum_save') || localStorage.getItem('sunlitIsles_save'); } catch(e) {}
  let hasSave = false;
  if (_rs) { try { let _d = JSON.parse(_rs); hasSave = _d && _d.version >= 1; } catch(e) {} }
  let items = [];
  if (hasSave) items.push('CONTINUE');
  items.push('CONQUEST', 'MULTIPLAYER', 'SETTINGS', 'CREDITS');
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
    let btnW = max(iw + 60, 160);
    let btnH = itemSize * 1.6;

    // Slide-in offset (items slide in from right, eased)
    let slideEase = 1 - pow(1 - slideProgress, 3);
    let slideX = (1 - slideEase) * 60;

    // Hitbox uses ACTUAL visual position (accounting for slide offset)
    let btnX = w / 2 - btnW / 2 + slideX;
    let btnY = iy - btnH * 0.45;
    let hitPad = 16;
    let hovered = mouseX > btnX - hitPad && mouseX < btnX + btnW + hitPad &&
                  mouseY > btnY - hitPad && mouseY < btnY + btnH + hitPad;
    if (hovered) { menuHover = i; menuKeyIdx = -1; isCursorPointer = true; }
    let selected = hovered || menuKeyIdx === i;

    let bScale = selected ? 1.04 : 1.0;
    let bw = btnW * bScale, bh = btnH * bScale;
    let bx = w / 2 - bw / 2 + slideX, by = iy - bh * 0.45;

    // Parchment button background
    fill(selected ? 58 : 38, selected ? 48 : 32, selected ? 35 : 22, floor(230 * itemAlpha));
    rect(bx, by, bw, bh, 3);
    // Dark border
    stroke(20, 15, 8, floor(180 * itemAlpha));
    strokeWeight(1);
    noFill();
    rect(bx, by, bw, bh, 3);
    // Gold border on selected
    if (selected) {
      let gA = floor((120 + sin(t0 * 2) * 40) * itemAlpha);
      stroke(220, 190, 80, gA);
      rect(bx - 1, by - 1, bw + 2, bh + 2, 4);
    }
    noStroke();

    if (selected) {
      // Bright gold text
      fill(10, 5, 0, floor(160 * itemAlpha));
      text(items[i], w / 2 + 1 + slideX, iy + 1);
      fill(255, 230, 160, floor(255 * itemAlpha));
      text(items[i], w / 2 + slideX, iy);
      // Faction hint on NEW VOYAGE hover
      if (items[i] === 'NEW VOYAGE') {
        textSize(max(8, floor(itemSize * 0.6)));
        textStyle(ITALIC);
        fill(180, 160, 110, floor(160 * itemAlpha));
        text('Choose your faction...', w / 2 + slideX, by + bh + 10);
        textStyle(BOLD);
        textSize(itemSize);
      }
    } else {
      fill(10, 5, 0, floor(80 * itemAlpha));
      text(items[i], w / 2 + 1 + slideX, iy + 1);
      fill(170, 150, 120, floor(200 * itemAlpha));
      text(items[i], w / 2 + slideX, iy);
    }
  }

  // Set cursor style
  if (isCursorPointer) cursor(HAND);

  // ─── PWA INSTALL BUTTON ───
  if (typeof _deferredInstallPrompt !== 'undefined' && _deferredInstallPrompt) {
    let instSize = max(9, floor(itemSize * 0.65));
    textSize(instSize);
    let instY = menuStartY + itemCount * itemGap + floor(itemGap * 0.6);
    let instW = 100, instH = instSize * 1.8;
    let instX = w / 2 - instW / 2;
    let instHov = mouseX > instX && mouseX < instX + instW &&
                  mouseY > instY - instH * 0.45 && mouseY < instY + instH * 0.55;
    if (instHov) isCursorPointer = true;
    let instA = constrain((menuFadeIn - 220) / 55, 0, 1);
    fill(instHov ? 50 : 30, instHov ? 42 : 28, instHov ? 30 : 18, floor(180 * instA));
    rect(instX, instY - instH * 0.45, instW, instH, 3);
    if (instHov) {
      stroke(180, 160, 60, floor(100 * instA));
      strokeWeight(1);
      noFill();
      rect(instX - 1, instY - instH * 0.45 - 1, instW + 2, instH + 2, 4);
      noStroke();
    }
    fill(instHov ? 220 : 150, instHov ? 200 : 140, instHov ? 140 : 100, floor(200 * instA));
    text('INSTALL APP', w / 2, instY);
    if (instHov) cursor(HAND);
  }

  // ─── VERSION + HINT at bottom ───
  let botAlpha = constrain((menuFadeIn - 200) / 55, 0, 1);
  textStyle(NORMAL);
  textSize(8);
  // Parchment strip behind version
  fill(20, 15, 10, floor(100 * botAlpha));
  rect(w / 2 - 120, h - 28, 240, 20, 2);
  // Version number — prominent
  fill(170, 145, 100, floor(160 * botAlpha));
  text('v1.0', w / 2 - 85, h - 18);
  // Tagline
  fill(130, 115, 85, floor(100 * botAlpha));
  text('Cozy Roman Survival', w / 2 + 10, h - 18);
  // Copyright line
  fill(90, 80, 60, floor(70 * botAlpha));
  textSize(7);
  text('Aurelian Forge Studio  2026', w / 2, h - 8);

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
  let panW = 280, panH = 740;
  let px = floor(w / 2 - panW / 2), py = floor(h * 0.14);

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

  // Music source toggle: Lyre / Recorded
  if (snd) {
    let msY = py + 196;
    let isRec = typeof gameSettings !== 'undefined' && gameSettings.musicSource === 'recorded';
    fill(190, 170, 130, 220); textSize(10);
    textAlign(RIGHT, CENTER);
    text('Music', w / 2 + 12, msY);
    textAlign(CENTER, CENTER);
    let msbx = floor(w / 2 + 24);
    // Lyre button
    fill(isRec ? 35 : 65, isRec ? 30 : 55, isRec ? 22 : 35); rect(msbx, msY - 7, 32, 14, 2);
    fill(isRec ? 130 : 220, isRec ? 115 : 200, isRec ? 85 : 120); textSize(8);
    text('Lyre', msbx + 16, msY);
    // Recorded button
    fill(isRec ? 65 : 35, isRec ? 55 : 30, isRec ? 35 : 22); rect(msbx + 36, msY - 7, 46, 14, 2);
    fill(isRec ? 220 : 130, isRec ? 200 : 115, isRec ? 120 : 85); textSize(8);
    text('Recorded', msbx + 59, msY);
  }

  _drawSectionDivider(w / 2, py + 218, panW - 50);

  // ─── ACCESSIBILITY ───
  let accY = py + 236;

  // Screen Shake toggle
  let shakeOn = gameSettings.screenShake;
  fill(190, 170, 130, 220); textSize(10);
  textAlign(RIGHT, CENTER);
  text('Screen Shake', w / 2 + 12, accY);
  textAlign(CENTER, CENTER);
  let stbx = floor(w / 2 + 40), stby = accY - 7;
  fill(30, 25, 18); rect(stbx, stby, 28, 14, 2);
  fill(shakeOn ? 75 : 40, shakeOn ? 120 : 50, shakeOn ? 45 : 35, 230);
  rect(stbx + 1, stby + 1, 26, 12, 2);
  fill(220, 210, 180); rect(stbx + (shakeOn ? 16 : 2), stby + 2, 10, 10, 1);
  fill(240, 230, 200, 80); rect(stbx + (shakeOn ? 17 : 3), stby + 3, 8, 2);

  // Font Size toggle (Normal / Large)
  accY += 28;
  let isLarge = gameSettings.fontScale > 1;
  fill(190, 170, 130, 220); textSize(10);
  textAlign(RIGHT, CENTER);
  text('Font Size', w / 2 + 12, accY);
  textAlign(CENTER, CENTER);
  let fsbx = floor(w / 2 + 30);
  let fsNormHov = mouseX > fsbx && mouseX < fsbx + 36 && mouseY > accY - 8 && mouseY < accY + 8;
  let fsLrgHov = mouseX > fsbx + 40 && mouseX < fsbx + 76 && mouseY > accY - 8 && mouseY < accY + 8;
  // Normal button
  fill(isLarge ? 35 : 65, isLarge ? 30 : 55, isLarge ? 22 : 35); rect(fsbx, accY - 7, 36, 14, 2);
  fill(isLarge ? 130 : 220, isLarge ? 115 : 200, isLarge ? 85 : 120); textSize(8);
  text('Normal', fsbx + 18, accY);
  // Large button
  fill(isLarge ? 65 : 35, isLarge ? 55 : 30, isLarge ? 35 : 22); rect(fsbx + 40, accY - 7, 36, 14, 2);
  fill(isLarge ? 220 : 130, isLarge ? 200 : 115, isLarge ? 120 : 85); textSize(8);
  text('Large', fsbx + 58, accY);

  // Auto-save info
  accY += 28;
  fill(130, 115, 85, 160); textSize(8);
  if (gameSettings.lastSaveTime > 0) {
    let ago = floor((Date.now() - gameSettings.lastSaveTime) / 1000);
    let agoStr;
    if (ago < 60) agoStr = 'just now';
    else if (ago < 3600) agoStr = floor(ago / 60) + 'm ago';
    else agoStr = floor(ago / 3600) + 'h ago';
    text('Last saved: ' + agoStr, w / 2, accY);
  } else {
    text('No save data yet', w / 2, accY);
  }

  _drawSectionDivider(w / 2, accY + 16, panW - 50);

  // High Contrast toggle
  accY += 28;
  let hcOn = gameSettings.highContrast || false;
  fill(190, 170, 130, 220); textSize(10);
  textAlign(RIGHT, CENTER);
  text('High Contrast', w / 2 + 12, accY);
  textAlign(CENTER, CENTER);
  let hcbx = floor(w / 2 + 40), hcby = accY - 7;
  fill(30, 25, 18); rect(hcbx, hcby, 28, 14, 2);
  fill(hcOn ? 75 : 40, hcOn ? 120 : 50, hcOn ? 45 : 35, 230);
  rect(hcbx + 1, hcby + 1, 26, 12, 2);
  fill(220, 210, 180); rect(hcbx + (hcOn ? 16 : 2), hcby + 2, 10, 10, 1);
  fill(240, 230, 200, 80); rect(hcbx + (hcOn ? 17 : 3), hcby + 3, 8, 2);

  // ─── KEYBINDS SECTION ───
  _drawSectionDivider(w / 2, accY + 18, panW - 40);
  accY += 36;
  fill(255, 210, 80, 20); textSize(12);
  text('KEYBINDS', w / 2, accY);
  fill(244, 213, 141); textSize(11);
  text('KEYBINDS', w / 2, accY);
  accY += 16;

  let kbActions = Object.keys(DEFAULT_KEYBINDS);
  let kbRowH = 18;
  let kbVisibleRows = 10;
  let kbListH = kbVisibleRows * kbRowH;
  let kbStartY = accY;
  // Clip region for scrollable keybind list
  let kbClipX = floor(w / 2 - panW / 2 + 15);
  let kbClipW = panW - 30;

  // Draw scroll area background
  fill(20, 17, 12, 120); rect(kbClipX, kbStartY, kbClipW, kbListH, 2);

  // Use drawingContext clipping for scrollable list
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(kbClipX, kbStartY, kbClipW, kbListH);
  drawingContext.clip();

  for (let ki = 0; ki < kbActions.length; ki++) {
    let act = kbActions[ki];
    let rowY = kbStartY + 9 + ki * kbRowH - _keybindScrollOffset;
    if (rowY < kbStartY - kbRowH || rowY > kbStartY + kbListH + kbRowH) continue;
    let rowHov = mouseX > kbClipX && mouseX < kbClipX + kbClipW && mouseY > rowY - 8 && mouseY < rowY + 8;
    if (rowHov) { fill(60, 50, 35, 100); rect(kbClipX + 2, rowY - 8, kbClipW - 4, kbRowH - 2, 1); }
    // Action label
    fill(190, 170, 130, 220); textSize(9);
    textAlign(LEFT, CENTER);
    text(KEYBIND_LABELS[act] || act, kbClipX + 8, rowY);
    // Key binding box
    let kbBtnX = kbClipX + kbClipW - 60;
    let isRebinding = _rebindingAction === act;
    fill(isRebinding ? 80 : 35, isRebinding ? 60 : 30, isRebinding ? 20 : 22);
    rect(kbBtnX, rowY - 7, 52, 14, 2);
    if (isRebinding) {
      fill(255, 220, 100, 180 + sin(millis() / 200) * 60); textSize(8);
    } else {
      fill(220, 200, 140); textSize(8);
    }
    textAlign(CENTER, CENTER);
    text(isRebinding ? 'Press key...' : getKeybind(act), kbBtnX + 26, rowY);
  }
  drawingContext.restore();
  textAlign(CENTER, CENTER);

  // Scroll indicators
  if (_keybindScrollOffset > 0) {
    fill(200, 180, 120, 150); textSize(8);
    text('\u25B2', w / 2, kbStartY - 2);
  }
  let maxScroll = max(0, kbActions.length * kbRowH - kbListH);
  if (_keybindScrollOffset < maxScroll) {
    fill(200, 180, 120, 150); textSize(8);
    text('\u25BC', w / 2, kbStartY + kbListH + 6);
  }

  accY = kbStartY + kbListH + 14;

  // Reset Defaults button
  let rstHov = mouseX > w/2 - 50 && mouseX < w/2 + 50 && mouseY > accY - 8 && mouseY < accY + 8;
  if (rstHov) {
    fill(60, 50, 35, 80); rect(w/2 - 55, accY - 9, 110, 18, 2);
    fill(220, 200, 140);
  } else {
    fill(160, 145, 105);
  }
  textSize(9); text('[ Reset Defaults ]', w / 2, accY);

  accY += 18;

  // Delete save — red tinted with hover
  let delY = accY + 8;
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
    { type: 'sub', text: 'v1.0.0' },
    { type: 'gap' },
    { type: 'divider' },
    { type: 'gap' },
    { type: 'heading', text: 'DESIGN & DIRECTION' },
    { type: 'line', text: 'Aurelian Forge Studio' },
    { type: 'gap' },
    { type: 'divider' },
    { type: 'gap' },
    { type: 'heading', text: 'CODE' },
    { type: 'line', text: 'Game Engine & State Machine' },
    { type: 'line', text: 'Narrative & Quest Engine' },
    { type: 'line', text: 'Combat System & Skill Trees' },
    { type: 'line', text: 'Economy & Trade Routes' },
    { type: 'line', text: 'Procedural Audio Engine' },
    { type: 'line', text: 'Island Generation & Terrain' },
    { type: 'gap' },
    { type: 'divider' },
    { type: 'gap' },
    { type: 'heading', text: 'ART' },
    { type: 'line', text: 'Hand-placed pixel primitives' },
    { type: 'line', text: 'Every tree, tile and toga' },
    { type: 'line', text: 'drawn with rect() and ellipse()' },
    { type: 'line', text: 'No sprites. No textures. Just code.' },
    { type: 'gap' },
    { type: 'divider' },
    { type: 'gap' },
    { type: 'heading', text: 'AUDIO' },
    { type: 'line', text: 'Procedural lyre — 6 musical modes' },
    { type: 'line', text: '25+ synthesized sound effects' },
    { type: 'line', text: 'Dynamic ambient soundscapes' },
    { type: 'line', text: 'All generated in real-time' },
    { type: 'line', text: 'Zero audio files. Pure synthesis.' },
    { type: 'gap' },
    { type: 'divider' },
    { type: 'gap' },
    { type: 'heading', text: 'NARRATIVE' },
    { type: 'line', text: '10-chapter quest chain' },
    { type: 'line', text: '4 unique companions' },
    { type: 'line', text: '4 NPC storylines' },
    { type: 'line', text: 'Seasonal festivals & events' },
    { type: 'gap' },
    { type: 'divider' },
    { type: 'gap' },
    { type: 'heading', text: 'ENGINE' },
    { type: 'line', text: 'q5.js — Fast p5 alternative' },
    { type: 'line', text: 'p5.sound — Web Audio API' },
    { type: 'line', text: 'PWA — plays offline' },
    { type: 'gap' },
    { type: 'divider' },
    { type: 'gap' },
    { type: 'heading', text: 'BUILT WITH' },
    { type: 'line', text: 'Claude by Anthropic' },
    { type: 'line', text: 'Boundless stubbornness' },
    { type: 'line', text: 'Far too much coffee' },
    { type: 'gap' },
    { type: 'divider' },
    { type: 'gap' },
    { type: 'heading', text: 'SPECIAL THANKS' },
    { type: 'line', text: 'The p5.js & q5.js communities' },
    { type: 'line', text: 'Ancient Rome, for the vibes' },
    { type: 'line', text: 'The Mediterranean Sea' },
    { type: 'line', text: 'Everyone who believed' },
    { type: 'line', text: 'You, for playing' },
    { type: 'gap' },
    { type: 'gap' },
    { type: 'divider' },
    { type: 'gap' },
    { type: 'thanks', text: 'Thank you for playing' },
    { type: 'sub', text: 'Mare Nostrum endures.' },
    { type: 'gap' },
    { type: 'gap' },
    { type: 'gap' },
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

// ─── HOW TO PLAY PANEL ──────────────────────────────────────────────────
function drawHowToPlayPanel(fadeA) {
  let w = width, h = height;
  let panW = 340, panH = 440;
  let px = floor(w / 2 - panW / 2), py = floor(h / 2 - panH / 2);

  fill(0, 0, 0, 185); rect(0, 0, w, h);

  _drawPanelFrame(px, py, panW, panH);

  // Title
  textAlign(CENTER, CENTER);
  textFont('Cinzel, Georgia, serif');
  fill(255, 210, 80, 18); textSize(14);
  text('HOW TO PLAY', w / 2, py + 18);
  fill(244, 213, 141); textSize(13);
  text('HOW TO PLAY', w / 2, py + 18);

  stroke(180, 150, 55, 80); strokeWeight(1);
  line(w / 2 - 50, py + 30, w / 2 + 50, py + 30);
  noStroke();

  let cy = py + 48;
  let leftX = px + 18;
  let rightX = px + panW - 18;
  textAlign(LEFT, TOP); textStyle(NORMAL);

  // Helper for section headers
  let drawHead = function(label, y) {
    textSize(10); textStyle(BOLD);
    fill(220, 195, 60);
    text(label, leftX, y);
    textStyle(NORMAL);
    return y + 16;
  };

  // Helper for key-action pairs
  let drawKey = function(key, action, y) {
    textSize(9);
    fill(200, 185, 140);
    text(key, leftX + 4, y);
    fill(160, 150, 120);
    text(action, leftX + 85, y);
    return y + 14;
  };

  cy = drawHead('MOVEMENT', cy);
  cy = drawKey('WASD / Arrows', 'Move around', cy);
  cy = drawKey('Click on ground', 'Move to location', cy);
  cy += 6;

  cy = drawHead('INTERACTION', cy);
  cy = drawKey('E', 'Interact / Gather / Talk', cy);
  cy = drawKey('F', 'Fish (near water)', cy);
  cy = drawKey('B', 'Open build menu', cy);
  cy = drawKey('J', 'Open journal', cy);
  cy = drawKey('TAB', 'Open codex', cy);
  cy = drawKey('1-5', 'Hotbar shortcuts', cy);
  cy += 6;

  cy = drawHead('COMBAT', cy);
  cy = drawKey('Click', 'Attack (when enemies near)', cy);
  cy = drawKey('1-3', 'Combat skills (unlockable)', cy);
  cy = drawKey('SHIFT', 'Sprint (hold)', cy);
  cy = drawKey('ALT', 'Dodge roll', cy);
  cy += 6;

  cy = drawHead('GENERAL', cy);
  cy = drawKey('ESC', 'Pause / Menu', cy);
  cy = drawKey('M', 'Toggle music', cy);
  cy = drawKey('P', 'Screenshot mode', cy);
  cy += 10;

  _drawSectionDivider(w / 2, cy, panW - 60);
  cy += 14;

  // Tips section
  cy = drawHead('TIPS', cy);
  textSize(8); fill(170, 155, 125);
  let tips = [
    'Explore the wreck beach for supplies before sailing.',
    'Talk to NPCs daily — they have quests and gifts.',
    'Build farms early. Food is life.',
    'The cat brings gifts. Be patient.',
    'Repair the trireme to explore distant islands.',
    'Check the journal for your current objectives.',
  ];
  for (let tip of tips) {
    fill(140, 120, 70, 120);
    text('\u2022', leftX + 2, cy);
    fill(170, 155, 125);
    text(tip, leftX + 12, cy);
    cy += 13;
  }

  // Back button
  let backY = py + panH - 22;
  let bkH = mouseX > w/2 - 40 && mouseX < w/2 + 40 && mouseY > backY - 8 && mouseY < backY + 10;
  textAlign(CENTER, CENTER);
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
  if (gameScreen === 'howtoplay') {
    let panH = 440, py = floor(height / 2 - panH / 2);
    let backY = py + panH - 22;
    if (mouseX > width/2 - 40 && mouseX < width/2 + 40 && mouseY > backY - 8 && mouseY < backY + 10) {
      gameScreen = 'menu'; return;
    }
    return;
  }
  if (gameScreen === 'settings') {
    let py = floor(height * 0.14);
    let panH = 740;
    let fsY = py + 50;
    let tbx = floor(width / 2 + 40), tby = fsY - 7;
    if (mouseX > tbx && mouseX < tbx + 28 && mouseY > tby && mouseY < tby + 14) {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen().catch(() => {});
      return;
    }
    if (snd) {
      let sliderY = py + 88, sliderW = 120, slX = floor(width / 2 + 10);
      let keys = ['master', 'sfx', 'ambient', 'music'];
      for (let k of keys) {
        if (mouseX >= slX - 4 && mouseX <= slX + sliderW + 4 && mouseY >= sliderY - 10 && mouseY <= sliderY + 10) {
          snd.setVolume(k, constrain((mouseX - slX) / sliderW, 0, 1));
          return;
        }
        sliderY += 28;
      }
    // Music source toggle
    let msY = py + 196;
    let msbx = floor(width / 2 + 24);
    if (mouseX > msbx && mouseX < msbx + 32 && mouseY > msY - 8 && mouseY < msY + 8) {
      gameSettings.musicSource = 'lyre'; _saveSettings(); return;
    }
    if (mouseX > msbx + 36 && mouseX < msbx + 82 && mouseY > msY - 8 && mouseY < msY + 8) {
      gameSettings.musicSource = 'recorded'; _saveSettings(); return;
    }
    }
    // Screen Shake toggle
    let accY = py + 236;
    let stbx = floor(width / 2 + 40), stby = accY - 7;
    if (mouseX > stbx && mouseX < stbx + 28 && mouseY > stby && mouseY < stby + 14) {
      gameSettings.screenShake = !gameSettings.screenShake;
      _saveSettings();
      return;
    }
    // Font Size buttons
    accY += 28;
    let fsbx = floor(width / 2 + 30);
    if (mouseX > fsbx && mouseX < fsbx + 36 && mouseY > accY - 8 && mouseY < accY + 8) {
      gameSettings.fontScale = 1; _saveSettings(); return;
    }
    if (mouseX > fsbx + 40 && mouseX < fsbx + 76 && mouseY > accY - 8 && mouseY < accY + 8) {
      gameSettings.fontScale = 1.25; _saveSettings(); return;
    }
    // High Contrast toggle
    accY += 28;
    let hcbx = floor(width / 2 + 40), hcby = accY - 7;
    if (mouseX > hcbx && mouseX < hcbx + 28 && mouseY > hcby && mouseY < hcby + 14) {
      gameSettings.highContrast = !gameSettings.highContrast;
      _saveSettings(); return;
    }
    // Keybind clicks
    accY += 36 + 16; // matches draw offset for keybind section header
    let kbActions = Object.keys(DEFAULT_KEYBINDS);
    let kbRowH = 18;
    let kbVisibleRows = 10;
    let kbListH = kbVisibleRows * kbRowH;
    let kbStartY = accY;
    let kbPanW = 280;
    let kbClipX = floor(width / 2 - kbPanW / 2 + 15);
    let kbClipW = kbPanW - 30;
    let kbBtnX = kbClipX + kbClipW - 60;
    // Check each keybind row
    for (let ki = 0; ki < kbActions.length; ki++) {
      let rowY = kbStartY + 9 + ki * kbRowH - _keybindScrollOffset;
      if (rowY < kbStartY - kbRowH || rowY > kbStartY + kbListH + kbRowH) continue;
      if (mouseX > kbClipX && mouseX < kbClipX + kbClipW && mouseY > rowY - 8 && mouseY < rowY + 8) {
        _rebindingAction = kbActions[ki];
        return;
      }
    }
    accY = kbStartY + kbListH + 14;
    // Reset Defaults button
    if (mouseX > width/2 - 50 && mouseX < width/2 + 50 && mouseY > accY - 8 && mouseY < accY + 8) {
      gameSettings.keybinds = {};
      _rebindingAction = null;
      _saveSettings(); return;
    }
    accY += 18;
    // Delete save
    let delY = accY + 8;
    if (mouseX > width/2 - 60 && mouseX < width/2 + 60 && mouseY > delY - 10 && mouseY < delY + 12) {
      try { if (localStorage.getItem('sunlitIsles_save')) localStorage.removeItem('sunlitIsles_save'); } catch(e) {}
      return;
    }
    let backY = py + panH - 25;
    if (mouseX > width/2 - 40 && mouseX < width/2 + 40 && mouseY > backY - 8 && mouseY < backY + 10) {
      _rebindingAction = null; _keybindScrollOffset = 0; gameScreen = 'menu'; return;
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
  if (gameScreen === 'multiplayer') {
    handleMultiplayerClick();
    return;
  }
  // PWA install button
  if (typeof _deferredInstallPrompt !== 'undefined' && _deferredInstallPrompt) {
    let _rs2 = null;
    try { _rs2 = localStorage.getItem('sunlitIsles_save'); } catch(e) {}
    let hs2 = false;
    if (_rs2) { try { let _d2 = JSON.parse(_rs2); hs2 = _d2 && _d2.version >= 8; } catch(e) {} }
    let items2 = ['NEW VOYAGE'];
    if (hs2) items2.splice(1, 0, 'CONTINUE');
    items2.push('MULTIPLAYER', 'SETTINGS', 'CREDITS');
    let itemSize2 = max(13, floor(min(width * 0.02, height * 0.028)));
    let menuStartY2 = floor(height * 0.68);
    let itemGap2 = max(28, floor(height * 0.048));
    let instSize2 = max(9, floor(itemSize2 * 0.65));
    let instY2 = menuStartY2 + items2.length * itemGap2 + floor(itemGap2 * 0.6);
    let instW2 = 100, instH2 = instSize2 * 1.8;
    let instX2 = width / 2 - instW2 / 2;
    if (mouseX > instX2 && mouseX < instX2 + instW2 &&
        mouseY > instY2 - instH2 * 0.45 && mouseY < instY2 + instH2 * 0.55) {
      _deferredInstallPrompt.prompt();
      _deferredInstallPrompt = null;
      return;
    }
  }
  if (menuHover < 0 || menuFadeOut > 0) return;
  let _rs = null;
  try { _rs = localStorage.getItem('mare_nostrum_save') || localStorage.getItem('sunlitIsles_save'); } catch(e) {}
  let hasSave = false;
  if (_rs) { try { let _d = JSON.parse(_rs); hasSave = _d && _d.version >= 1; } catch(e) {} }
  let btns = [];
  if (hasSave) btns.push('load');
  btns.push('conquest', 'multiplayer', 'settings', 'credits');
  let action = btns[menuHover];
  if (action === '1v1') { menuFadeOut = 1; menuFadeAction = function() { if (typeof start1v1Game === 'function') start1v1Game(); }; return; }
  if (action === 'conquest') { menuFadeOut = 1; menuFadeAction = function() { if (typeof startConquestGame === 'function') startConquestGame(); }; return; }
  if (action === 'multiplayer') { gameScreen = 'multiplayer'; state._mpMenuOpen = true; return; }
  if (action === 'settings') { gameScreen = 'settings'; return; }
  if (action === 'credits') { gameScreen = 'credits'; return; }
  // Fade to black, then execute action
  menuFadeOut = 1;
  menuFadeAction = action === 'new' ? startNewGame : startLoadGame;
}

// ─── MULTIPLAYER PANEL ──────────────────────────────────────────────────
let _mpJoinInput = '';
let _mpSubScreen = 'main'; // 'main' | 'host' | 'join'

function drawMultiplayerPanel(fadeA) {
  let w = width, h = height;
  let hasBots = (typeof MP !== 'undefined' && MP.bots && MP.bots.length > 0);
  let isHostOrBots = (_mpSubScreen === 'host' || hasBots);
  let panW = 320, panH = isHostOrBots ? 420 : 280;
  let px = floor(w / 2 - panW / 2), py = floor(h / 2 - panH / 2);

  _drawPanelFrame(px, py, panW, panH);

  push();
  textAlign(CENTER, CENTER);
  noStroke();

  fill(244, 213, 141); textSize(14);
  text('MULTIPLAYER', w / 2, py + 22);
  _drawSectionDivider(w / 2, py + 38, panW - 40);

  if (typeof MP === 'undefined') {
    fill(180, 100, 100); textSize(11);
    text('PeerJS not loaded', w / 2, py + 80);
    _drawBackButton(w, py, panH);
    pop(); return;
  }

  if (MP.connected) {
    fill(100, 255, 140); textSize(12);
    text('CONNECTED', w / 2, py + 60);
    fill(200, 190, 160); textSize(10);
    text('Room: ' + MP.roomCode, w / 2, py + 80);
    text('Player 2: ' + MP.remotePlayer.name, w / 2, py + 96);

    // Bot list
    _drawBotPanel(w, px, py + 110, panW);

    // Start game button
    let botsH = MP.bots.length * 20 + 40;
    let btnY = py + 110 + botsH;
    let hoverStart = mouseX > w/2 - 60 && mouseX < w/2 + 60 && mouseY > btnY - 12 && mouseY < btnY + 12;
    fill(hoverStart ? color(60, 140, 60) : color(40, 100, 40));
    rect(w/2 - 60, btnY - 12, 120, 24, 4);
    fill(255); textSize(11);
    text('ENTER LOBBY', w / 2, btnY);

    // Disconnect button
    let dcY = btnY + 40;
    let hoverDC = mouseX > w/2 - 50 && mouseX < w/2 + 50 && mouseY > dcY - 10 && mouseY < dcY + 10;
    fill(hoverDC ? color(160, 60, 60) : color(120, 40, 40));
    rect(w/2 - 50, dcY - 10, 100, 20, 4);
    fill(200); textSize(10);
    text('DISCONNECT', w / 2, dcY);

  } else if (_mpSubScreen === 'host') {
    fill(200, 190, 160); textSize(11);
    text('Hosting — add bots or share code', w / 2, py + 55);
    fill(244, 213, 141); textSize(16);
    text(MP.roomCode || '...', w / 2, py + 80);
    fill(160, 150, 120); textSize(9);
    text('Share code with friends, or play with bots', w / 2, py + 100);

    // Bot panel
    _drawBotPanel(w, px, py + 115, panW);

    // Start with bots button (only if bots added)
    let botsH = MP.bots.length * 20 + 40;
    if (MP.bots.length > 0) {
      let startY = py + 115 + botsH;
      let allReady = MP.allBotsReady();
      let hoverStart = mouseX > w/2 - 60 && mouseX < w/2 + 60 && mouseY > startY - 12 && mouseY < startY + 12;
      if (allReady) {
        fill(hoverStart ? color(60, 140, 60) : color(40, 100, 40));
      } else {
        fill(50, 50, 50);
      }
      rect(w/2 - 60, startY - 12, 120, 24, 4);
      fill(allReady ? 255 : 120); textSize(11);
      text(allReady ? 'START GAME' : 'BOTS PICKING...', w / 2, startY);
    }

    let cancelBaseY = py + 115 + botsH + (MP.bots.length > 0 ? 40 : 0);
    let cancelY = cancelBaseY;
    let hoverCancel = mouseX > w/2 - 40 && mouseX < w/2 + 40 && mouseY > cancelY - 10 && mouseY < cancelY + 10;
    fill(hoverCancel ? color(160, 60, 60) : color(120, 40, 40));
    rect(w/2 - 40, cancelY - 10, 80, 20, 4);
    fill(200); textSize(10);
    text('CANCEL', w / 2, cancelY);

  } else if (_mpSubScreen === 'join') {
    fill(200, 190, 160); textSize(11);
    text('Enter room code:', w / 2, py + 65);

    // Input box
    fill(20, 18, 15);
    rect(w/2 - 60, py + 85, 120, 28, 4);
    stroke(120, 100, 60); strokeWeight(1);
    rect(w/2 - 60, py + 85, 120, 28, 4);
    noStroke();
    fill(244, 213, 141); textSize(14);
    text(_mpJoinInput + (frameCount % 40 < 20 ? '_' : ''), w / 2, py + 99);

    fill(160, 150, 120); textSize(9);
    text('Type code and press ENTER', w / 2, py + 125);

    let cancelY = py + 155;
    let hoverCancel = mouseX > w/2 - 40 && mouseX < w/2 + 40 && mouseY > cancelY - 10 && mouseY < cancelY + 10;
    fill(hoverCancel ? color(160, 60, 60) : color(120, 40, 40));
    rect(w/2 - 40, cancelY - 10, 80, 20, 4);
    fill(200); textSize(10);
    text('CANCEL', w / 2, cancelY);

  } else {
    // Main multiplayer menu
    let hostY = py + 70;
    let joinY = py + 115;
    let botsY = py + 160;

    let hoverHost = mouseX > w/2 - 80 && mouseX < w/2 + 80 && mouseY > hostY - 14 && mouseY < hostY + 14;
    fill(hoverHost ? color(60, 80, 120) : color(35, 50, 80));
    rect(w/2 - 80, hostY - 14, 160, 28, 4);
    fill(hoverHost ? color(255, 230, 160) : color(200, 190, 160)); textSize(12);
    text('HOST GAME', w / 2, hostY);

    let hoverJoin = mouseX > w/2 - 80 && mouseX < w/2 + 80 && mouseY > joinY - 14 && mouseY < joinY + 14;
    fill(hoverJoin ? color(60, 80, 120) : color(35, 50, 80));
    rect(w/2 - 80, joinY - 14, 160, 28, 4);
    fill(hoverJoin ? color(255, 230, 160) : color(200, 190, 160)); textSize(12);
    text('JOIN GAME', w / 2, joinY);

    // Solo + Bots option
    let hoverBots = mouseX > w/2 - 80 && mouseX < w/2 + 80 && mouseY > botsY - 14 && mouseY < botsY + 14;
    fill(hoverBots ? color(80, 70, 110) : color(45, 40, 70));
    rect(w/2 - 80, botsY - 14, 160, 28, 4);
    fill(hoverBots ? color(255, 230, 160) : color(200, 190, 160)); textSize(12);
    text('PLAY vs BOTS', w / 2, botsY);
    fill(130, 120, 100); textSize(8);
    text('Solo game with AI opponents', w / 2, botsY + 20);
  }

  _drawBackButton(w, py, panH);
  pop();
}

function _drawBackButton(w, py, panH) {
  let backY = py + panH - 22;
  let hoverBack = mouseX > w/2 - 40 && mouseX < w/2 + 40 && mouseY > backY - 8 && mouseY < backY + 10;
  fill(hoverBack ? color(200, 180, 120) : color(130, 115, 85));
  textSize(10);
  text('BACK', w / 2, backY);
}

function _drawBotPanel(w, px, baseY, panW) {
  if (typeof MP === 'undefined') return;
  // Update bot lobby behavior
  MP.updateBotsLobby();

  let diffColors = { easy: [100, 180, 100], normal: [200, 180, 80], hard: [200, 80, 60] };

  // Add Bot / Remove Bot buttons
  let addBtnX = w / 2 - 75, rmBtnX = w / 2 + 10;
  let btnW2 = 65, btnH2 = 18;
  let canAdd = MP.bots.length < MP.maxBots;
  let hoverAdd = canAdd && mouseX > addBtnX && mouseX < addBtnX + btnW2 && mouseY > baseY - 9 && mouseY < baseY + 9;
  fill(hoverAdd ? color(60, 110, 60) : (canAdd ? color(40, 80, 40) : color(40, 40, 40)));
  rect(addBtnX, baseY - 9, btnW2, btnH2, 3);
  fill(canAdd ? 255 : 100); textSize(9);
  text('+ ADD BOT', addBtnX + btnW2 / 2, baseY);

  let canRm = MP.bots.length > 0;
  let hoverRm = canRm && mouseX > rmBtnX && mouseX < rmBtnX + btnW2 && mouseY > baseY - 9 && mouseY < baseY + 9;
  fill(hoverRm ? color(140, 50, 50) : (canRm ? color(100, 35, 35) : color(40, 40, 40)));
  rect(rmBtnX, baseY - 9, btnW2, btnH2, 3);
  fill(canRm ? 255 : 100); textSize(9);
  text('- REMOVE', rmBtnX + btnW2 / 2, baseY);

  // Bot list
  let ly = baseY + 18;
  for (let i = 0; i < MP.bots.length; i++) {
    let bot = MP.bots[i];
    let dc = diffColors[bot.difficulty] || diffColors.normal;

    // Bot icon (small gear/cog)
    fill(160, 160, 180);
    textSize(8);
    textAlign(LEFT, CENTER);
    text('[BOT]', px + 20, ly);

    // Name
    fill(220, 200, 160);
    textSize(10);
    text(bot.name, px + 55, ly);

    // Faction (if picked)
    if (bot.faction) {
      let facName = (typeof FACTIONS !== 'undefined' && FACTIONS[bot.faction]) ? FACTIONS[bot.faction].name : bot.faction;
      let bc = (typeof FACTIONS !== 'undefined' && FACTIONS[bot.faction]) ? FACTIONS[bot.faction].bannerColor : [180, 180, 180];
      fill(bc[0], bc[1], bc[2]);
      textSize(8);
      text(facName, px + 140, ly);
    } else {
      fill(120, 120, 100);
      textSize(8);
      text('picking...', px + 140, ly);
    }

    // Difficulty button (clickable)
    let diffBtnX = px + panW - 75, diffBtnW = 50, diffBtnH = 14;
    let hoverDiff = mouseX > diffBtnX && mouseX < diffBtnX + diffBtnW && mouseY > ly - 7 && mouseY < ly + 7;
    fill(hoverDiff ? dc[0] + 30 : dc[0], hoverDiff ? dc[1] + 30 : dc[1], hoverDiff ? dc[2] + 30 : dc[2], 200);
    rect(diffBtnX, ly - 7, diffBtnW, diffBtnH, 2);
    fill(255); textSize(8);
    textAlign(CENTER, CENTER);
    text(bot.difficulty.toUpperCase(), diffBtnX + diffBtnW / 2, ly);

    ly += 20;
  }
  textAlign(CENTER, CENTER);
}

function _handleBotPanelClick(w, px, baseY, panW) {
  if (typeof MP === 'undefined') return false;
  // Add Bot button
  let addBtnX = w / 2 - 75, rmBtnX = w / 2 + 10;
  let btnW2 = 65, btnH2 = 18;
  if (MP.bots.length < MP.maxBots && mouseX > addBtnX && mouseX < addBtnX + btnW2 && mouseY > baseY - 9 && mouseY < baseY + 9) {
    MP.addBot('normal');
    return true;
  }
  if (MP.bots.length > 0 && mouseX > rmBtnX && mouseX < rmBtnX + btnW2 && mouseY > baseY - 9 && mouseY < baseY + 9) {
    MP.removeBot();
    return true;
  }
  // Difficulty cycle buttons
  let ly = baseY + 18;
  for (let i = 0; i < MP.bots.length; i++) {
    let diffBtnX = px + panW - 75, diffBtnW = 50;
    if (mouseX > diffBtnX && mouseX < diffBtnX + diffBtnW && mouseY > ly - 7 && mouseY < ly + 7) {
      MP.cycleBotDifficulty(i);
      return true;
    }
    ly += 20;
  }
  return false;
}

function handleMultiplayerClick() {
  let w = width, h = height;
  let hasBots = (typeof MP !== 'undefined' && MP.bots && MP.bots.length > 0);
  let isHostOrBots = (_mpSubScreen === 'host' || hasBots);
  let panW = 320, panH = isHostOrBots ? 420 : 280;
  let px = floor(w / 2 - panW / 2), py = floor(h / 2 - panH / 2);

  // Back button (always present)
  let backY = py + panH - 22;
  if (mouseX > w/2 - 40 && mouseX < w/2 + 40 && mouseY > backY - 8 && mouseY < backY + 10) {
    if (_mpSubScreen !== 'main') { _mpSubScreen = 'main'; MP.clearBots(); }
    else { gameScreen = 'menu'; state._mpMenuOpen = false; }
    return;
  }

  if (typeof MP === 'undefined') return;

  // Check bot panel clicks (shared between host and connected states)
  if (_mpSubScreen === 'host' || MP.connected) {
    let botBaseY = MP.connected ? py + 110 : py + 115;
    if (_handleBotPanelClick(w, px, botBaseY, panW)) return;
  }

  if (MP.connected) {
    // Start game -> go to lobby for faction selection
    let botsH = MP.bots.length * 20 + 40;
    let btnY = py + 110 + botsH;
    if (mouseX > w/2 - 60 && mouseX < w/2 + 60 && mouseY > btnY - 12 && mouseY < btnY + 12) {
      state._mpMenuOpen = false;
      if (typeof resetLobby === 'function') resetLobby();
      gameScreen = 'lobby';
      return;
    }
    // Disconnect
    let dcY = btnY + 40;
    if (mouseX > w/2 - 50 && mouseX < w/2 + 50 && mouseY > dcY - 10 && mouseY < dcY + 10) {
      MP.disconnect();
      MP.clearBots();
      _mpSubScreen = 'main';
      return;
    }
  } else if (_mpSubScreen === 'host') {
    // Start with bots
    let botsH = MP.bots.length * 20 + 40;
    if (MP.bots.length > 0 && MP.allBotsReady()) {
      let startY = py + 115 + botsH;
      if (mouseX > w/2 - 60 && mouseX < w/2 + 60 && mouseY > startY - 12 && mouseY < startY + 12) {
        // Start game with bots — go straight to new game with faction select
        state._mpMenuOpen = false;
        menuFadeOut = 1;
        menuFadeAction = startNewGame;
        return;
      }
    }
    let cancelBaseY = py + 115 + botsH + (MP.bots.length > 0 ? 40 : 0);
    let cancelY = cancelBaseY;
    if (mouseX > w/2 - 40 && mouseX < w/2 + 40 && mouseY > cancelY - 10 && mouseY < cancelY + 10) {
      MP.disconnect();
      MP.clearBots();
      _mpSubScreen = 'main';
      return;
    }
  } else if (_mpSubScreen === 'join') {
    let cancelY = py + 155;
    if (mouseX > w/2 - 40 && mouseX < w/2 + 40 && mouseY > cancelY - 10 && mouseY < cancelY + 10) {
      _mpSubScreen = 'main';
      return;
    }
  } else {
    // Main MP menu
    let hostY = py + 70;
    let joinY = py + 115;
    let botsY = py + 160;
    if (mouseX > w/2 - 80 && mouseX < w/2 + 80 && mouseY > hostY - 14 && mouseY < hostY + 14) {
      MP.host();
      _mpSubScreen = 'host';
      return;
    }
    if (mouseX > w/2 - 80 && mouseX < w/2 + 80 && mouseY > joinY - 14 && mouseY < joinY + 14) {
      _mpSubScreen = 'join';
      _mpJoinInput = '';
      return;
    }
    if (mouseX > w/2 - 80 && mouseX < w/2 + 80 && mouseY > botsY - 14 && mouseY < botsY + 14) {
      MP.clearBots();
      _mpSubScreen = 'host'; // reuse host screen for bot setup
      // Don't call MP.host() — no PeerJS needed for solo + bots
      MP.roomCode = 'SOLO';
      return;
    }
  }
}

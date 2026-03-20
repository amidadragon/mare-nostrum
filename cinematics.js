// ═══════════════════════════════════════════════════════════════════════
// cinematics.js — Cinematic sequences (intro, pre-repair, sailing)
// Extracted from sketch.js. Uses globals: state, cam, camSmooth,
// snd, width, height, frameCount, C, WORLD, etc.
// ═══════════════════════════════════════════════════════════════════════

function _drawCinematicText(cx, ty, line, sz, r, g, b, a) {
  if (a < 5) return;
  textAlign(CENTER, CENTER);
  textFont('Cinzel, Georgia, serif');
  textSize(sz);
  let tw = textWidth(line);
  // Parchment backing
  let padX = 16, padY = 6;
  fill(15, 10, 5, floor(a * 0.35));
  rect(cx - tw / 2 - padX, ty - sz / 2 - padY, tw + padX * 2, sz + padY * 2, 2);
  // Gold border on parchment
  stroke(180, 150, 55, floor(a * 0.12));
  strokeWeight(1);
  rect(cx - tw / 2 - padX + 1, ty - sz / 2 - padY + 1, tw + padX * 2 - 2, sz + padY * 2 - 2, 2);
  noStroke();
  // Drop shadow
  fill(10, 5, 0, floor(a * 0.6));
  text(line, cx + 1, ty + 1);
  // Main text
  fill(r, g, b, a);
  text(line, cx, ty);
}

function _drawCinematicStars(w, h, alpha) {
  if (alpha < 0.05) return;
  for (let i = 0; i < 30; i++) {
    let sx = ((i * 137 + 53) % 100) / 100 * w;
    let sy = ((i * 89 + 17) % 45) / 100 * h;
    let twinkle = (sin(millis() * 0.002 * (1 + i % 3) + i * 2.7) + 1) * 0.5;
    let sa = floor((40 + twinkle * 80) * alpha);
    fill(255, 250, 230, sa);
    rect(floor(sx), floor(sy), 2, 2);
    if (i % 5 === 0 && twinkle > 0.7) {
      fill(255, 250, 230, floor(sa * 0.3));
      rect(floor(sx) - 1, floor(sy), 4, 2);
      rect(floor(sx), floor(sy) - 1, 2, 4);
    }
  }
}

// ─── INTRO CINEMATIC — SHIPWRECK SCENE ────────────────────────────────────
function drawIntroCinematic(dt) {
  state.introTimer += dt;
  let t = state.introTimer;
  let w = width, h = height;

  // Phase timings (in frames at 60fps)
  let FADE_IN = 60;       // 1 sec black fade
  let WRECKAGE = 240;     // 4 sec wreckage scene
  let TEXT_START = 120;    // text appears 2 sec into wreckage
  let WAKE = 360;          // 6 sec — player wakes
  let DONE = 420;          // 7 sec — game starts


  // --- INTRO AUDIO CUES ---
  if (snd && snd.ready) {
    let masterVol = snd.vol.master * snd.vol.ambient;
    // Storm ambient during wreckage (frames 0-240): low rumble wind
    if (t < WRECKAGE) {
      let stormIntensity = min(1, t / FADE_IN);
      snd._windGain.amp(0.14 * stormIntensity * masterVol, 0.3);
      snd._windFilter.freq(40 + sin(frameCount * 0.004) * 20);
      snd._waveGain.amp(0.10 * stormIntensity * masterVol, 0.3);
      snd._waveFilter.freq(180 + sin(frameCount * 0.003) * 40);
    }
    // Thunder crack at frame 180
    if (t >= 180 && t < 182 && !state._introThunderPlayed) {
      state._introThunderPlayed = true;
      snd.playSFX('thunder');
    }
    // Gentle wave transition after wreckage (frames 240+): calm down storm
    if (t >= WRECKAGE && t < DONE) {
      let calm = min(1, (t - WRECKAGE) / 120);
      snd._windGain.amp(lerp(0.14, 0.02, calm) * masterVol, 0.5);
      snd._windFilter.freq(lerp(40, 400, calm));
      snd._waveGain.amp(lerp(0.10, 0.05, calm) * masterVol, 0.5);
      snd._waveFilter.freq(lerp(180, 350, calm));
    }
    // Soft lyre note at exact wake moment (frame 360) -- D4 sine, gentle
    if (t >= WAKE && t < WAKE + 2 && !state._introLyrePlayed) {
      state._introLyrePlayed = true;
      snd._pluckLyre(0, 293.7, 0.10 * snd.vol.master * snd.vol.music, 800);
    }
  }


  // Background — dawn sky gradient
  let skyAlpha = min(1, t / FADE_IN);
  // Deep night → warm dawn
  let skyTop = lerpColor(color(10, 12, 20), color(45, 55, 85), skyAlpha);
  let skyBot = lerpColor(color(10, 12, 20), color(140, 90, 60), skyAlpha);
  noStroke();
  for (let y = 0; y < h; y += 4) {
    let amt = y / h;
    fill(lerpColor(skyTop, skyBot, amt));
    rect(0, y, w, 4);
  }

  // Stars visible during storm/early phase, fading as dawn breaks
  let starFade = max(0, 1 - (t - FADE_IN) / 180);
  _drawCinematicStars(w, h, skyAlpha * starFade);

  // Thunder screen shake near lightning (frame 178-184)
  let thunderShakeX = 0, thunderShakeY = 0;
  if (t >= 176 && t <= 186) {
    let shakeMag = max(0, 1 - abs(t - 180) / 6) * 4;
    thunderShakeX = sin(t * 17.3) * shakeMag;
    thunderShakeY = cos(t * 13.7) * shakeMag;
  }
  push();
  translate(thunderShakeX, thunderShakeY);

  // Ocean — dark choppy water
  let oceanY = floor(h * 0.55);
  fill(25, 50, 65);
  rect(0, oceanY, w, h - oceanY);
  // Wave lines
  for (let i = 0; i < 8; i++) {
    let wy = oceanY + 12 + i * 18;
    let waveOff = floor(sin(frameCount * 0.02 + i * 0.7) * 4);
    fill(35, 65, 80, 40);
    rect(0, wy + waveOff, w, 2);
  }

  // Beach strip
  let beachY = oceanY - 8;
  fill(170, 155, 120);
  rect(0, beachY, w, 16);
  fill(155, 140, 105, 80);
  for (let x = 0; x < w; x += 20) rect(x + floor(sin(x) * 3), beachY + 2, 8, 2);

  // ─── RAIN STREAKS during wreckage phase ───
  if (t > FADE_IN && t < WAKE) {
    let rainAlpha = min(1, (t - FADE_IN) / 60);
    for (let ri = 0; ri < 40; ri++) {
      let rx = ((ri * 137 + floor(t * 3.7)) % w);
      let ry = ((ri * 89 + floor(t * 5.2)) % (h * 0.8));
      let ra = floor((30 + (ri % 3) * 10) * rainAlpha);
      fill(200, 210, 230, ra);
      // Diagonal rain — wind from left
      rect(floor(rx), floor(ry), 1, 6);
      rect(floor(rx + 1), floor(ry + 6), 1, 4);
    }
  }

  // ─── FLOATING DEBRIS in ocean during wreckage ───
  if (t > FADE_IN + 20 && t < WAKE) {
    let debAlpha = min(255, (t - FADE_IN - 20) * 3);
    let debPieces = [
      { x: 0.20, y: 0.62, w: 14, h: 3, phase: 0.0 },
      { x: 0.65, y: 0.65, w: 10, h: 2, phase: 1.5 },
      { x: 0.75, y: 0.60, w: 12, h: 3, phase: 2.8 },
      { x: 0.30, y: 0.70, w: 8,  h: 2, phase: 4.1 },
      { x: 0.80, y: 0.72, w: 11, h: 2, phase: 0.9 },
      { x: 0.50, y: 0.68, w: 9,  h: 3, phase: 3.3 },
      { x: 0.15, y: 0.75, w: 7,  h: 2, phase: 5.0 },
    ];
    for (let dp of debPieces) {
      let dx = dp.x * w + sin(frameCount * 0.01 + dp.phase) * 8;
      let dy = dp.y * h + sin(frameCount * 0.025 + dp.phase) * 3;
      fill(65, 42, 20, debAlpha);
      rect(floor(dx), floor(dy), dp.w, dp.h);
      // Highlight on top edge
      fill(90, 60, 30, debAlpha * 0.5);
      rect(floor(dx + 1), floor(dy), dp.w - 2, 1);
    }
  }

  if (t > FADE_IN) {
    let sceneAlpha = min(255, (t - FADE_IN) * 4);

    // ─── LIGHTNING FLASH at frame 180 ───
    if (t >= 178 && t <= 181) {
      fill(255, 255, 255, floor(200 * (1 - abs(t - 180) / 3)));
      rect(0, 0, w, h);
    }

    // ─── WRECKAGE SCENE ───
    let cx = floor(w * 0.35);
    let cy = beachY - 2;

    // Broken hull — tilted, half-submerged
    push();
    translate(cx, cy);
    rotate(-0.15);
    // Hull planks — dark waterlogged wood
    fill(55, 35, 18, sceneAlpha);
    rect(-40, -8, 80, 12);
    rect(-35, -14, 60, 6);
    rect(-30, 4, 50, 6);
    // Broken ribs
    fill(70, 45, 22, sceneAlpha);
    for (let i = -3; i <= 3; i++) {
      rect(i * 10 - 1, -16, 3, 20);
    }
    // Snapped mast stump
    fill(80, 55, 25, sceneAlpha);
    rect(-3, -30, 6, 16);
    // Torn sail scrap draped over hull
    fill(190, 175, 150, sceneAlpha * 0.6);
    rect(-20, -22, 30, 10);
    fill(140, 35, 25, sceneAlpha * 0.5);
    rect(-15, -18, 20, 4); // red stripe remains
    pop();

    // Scattered debris on beach
    fill(65, 42, 20, sceneAlpha);
    rect(cx + 60, cy + 2, 12, 3);   // plank
    rect(cx + 80, cy + 4, 8, 2);    // plank
    rect(cx - 55, cy + 3, 10, 2);   // plank
    // Amphora (broken jar)
    fill(160, 100, 55, sceneAlpha);
    rect(cx + 50, cy - 4, 6, 8);
    fill(140, 85, 45, sceneAlpha);
    rect(cx + 51, cy - 6, 4, 3);    // neck
    // Rope coil
    fill(120, 95, 55, sceneAlpha);
    rect(cx - 40, cy, 5, 5);
    rect(cx - 39, cy + 1, 3, 3);

    // ─── PLAYER FIGURE — lying on beach ───
    let playerX = floor(w * 0.55);
    let playerY = cy - 1;
    let wakeProgress = max(0, (t - WAKE) / 60); // 0 → 1 as player wakes

    // Dark silhouette shadow behind figure during wake (dramatic backlit effect)
    if (wakeProgress > 0 && wakeProgress < 1.2) {
      let silAlpha = floor(min(1, wakeProgress) * 80);
      let silH = floor(lerp(4, 14, min(1, wakeProgress)));
      let silW = floor(lerp(20, 8, min(1, wakeProgress)));
      fill(10, 5, 0, silAlpha);
      rect(playerX - silW / 2, playerY - silH + 2, silW, silH);
      // Ground shadow elongated by dawn light
      fill(10, 5, 0, floor(silAlpha * 0.4));
      rect(playerX - silW, playerY + 2, silW * 2, 3);
    }

    push();
    translate(playerX, playerY);

    if (wakeProgress <= 0) {
      // Lying down — horizontal figure
      // Cape spread on sand
      fill(160, 50, 38, sceneAlpha * 0.7);
      rect(-14, 0, 28, 4);
      // Body horizontal
      fill(175, 58, 44, sceneAlpha);
      rect(-10, -3, 20, 5); // tunic
      fill(196, 162, 70, sceneAlpha);
      rect(-8, -3, 16, 2);  // armor
      // Head
      fill(212, 165, 116, sceneAlpha);
      rect(10, -5, 6, 6);   // head to the right
      // Dark hair
      fill(61, 43, 31, sceneAlpha);
      rect(10, -5, 6, 2);
      // Arms spread
      fill(212, 165, 116, sceneAlpha);
      rect(-12, -2, 3, 2);
      rect(16, -1, 3, 2);
      // Sandals
      fill(107, 66, 38, sceneAlpha);
      rect(-14, -2, 3, 2);
    } else {
      // Waking up — transitioning from lying to sitting to standing
      let sitAmount = min(1, wakeProgress * 2);
      let standAmount = max(0, (wakeProgress - 0.5) * 2);
      let bodyAngle = lerp(-HALF_PI, 0, sitAmount);

      rotate(bodyAngle);
      // Cape
      fill(196, 64, 50, sceneAlpha);
      rect(-3, -4, 3, 14);
      // Body
      fill(175, 58, 44, sceneAlpha);
      rect(-6, -4, 12, 16);
      fill(196, 162, 70, sceneAlpha);
      rect(-5, -4, 10, 6); // armor
      // Head
      fill(212, 165, 116, sceneAlpha);
      rect(-4, -12, 8, 7);
      fill(61, 43, 31, sceneAlpha);
      rect(-4, -12, 8, 2); // hair
      // Arms
      fill(212, 165, 116, sceneAlpha);
      rect(-7, 0, 2, 4);
      rect(5, 0, 2, 4);
    }
    pop();
  }

  pop(); // end thunder shake transform

  // ─── TEXT OVERLAYS ───
  textAlign(CENTER, CENTER);
  noStroke();

  // Title text — fades in during wreckage phase (character-by-character reveal)
  if (t > TEXT_START && t < DONE) {
    let textAlpha = min(255, (t - TEXT_START) * 3);
    if (t > WAKE) textAlpha = max(0, textAlpha - (t - WAKE) * 5);

    let line1 = 'Shipwrecked by cursed storm...';
    let charsShown1 = min(line1.length, floor((t - TEXT_START) / 2));
    let shown1 = line1.substring(0, charsShown1);
    _drawCinematicText(w / 2, h * 0.2, shown1, 14, 220, 195, 140, textAlpha);

    if (t > TEXT_START + 60) {
      let subAlpha = min(255, (t - TEXT_START - 60) * 3);
      if (t > WAKE) subAlpha = max(0, subAlpha - (t - WAKE) * 5);
      let line2 = 'Rebuild under Sol Invictus.';
      let charsShown2 = min(line2.length, floor((t - TEXT_START - 60) / 2));
      let shown2 = line2.substring(0, charsShown2);
      _drawCinematicText(w / 2, h * 0.2 + 24, shown2, 10, 180, 160, 120, subAlpha);
    }
  }

  // Skip hint
  if (t > 30 && t < DONE) {
    let skipA = 80 + sin(frameCount * 0.05) * 30;
    fill(15, 10, 5, floor(skipA * 0.3));
    rect(w / 2 - 80, h - 26, 160, 14, 2);
    fill(120, 110, 90, skipA);
    textSize(8);
    textAlign(CENTER, BOTTOM);
    text('[ click or press any key to skip ]', w / 2, h - 14);
  }

  // Black fade-in from nothing
  if (t < FADE_IN) {
    fill(0, 0, 0, 255 - (t / FADE_IN) * 255);
    rect(0, 0, w, h);
  }

  // Transition to gameplay
  if (t >= DONE) {
    // Fade to white then start game
    let fadeOut = min(255, (t - DONE) * 6);
    fill(255, 245, 220, fadeOut);
    rect(0, 0, w, h);
    if (fadeOut >= 255) {
      state.introPhase = 'done';
      state.time = 6 * 60; // dawn
      // Snap camera to player (wreck beach or home)
      cam.x = state.player.x; cam.y = state.player.y;
      camSmooth.x = cam.x; camSmooth.y = cam.y;
      // First-minute tutorial hint
      showTutorialHint('Gather materials — walk to glowing nodes and press [E]', state.player.x, state.player.y - 40);
    }
  }

  textAlign(LEFT, TOP);
}

// Skip intro on click or keypress
function skipIntro() {
  if (state.introPhase !== 'done') {
    state.introPhase = 'done';
    state.time = 6 * 60;
    cam.x = state.player.x; cam.y = state.player.y;
    camSmooth.x = cam.x; camSmooth.y = cam.y;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// ─── PRE-REPAIR CUTSCENE — "The Wreck Assessment" ───────────────────
// ═══════════════════════════════════════════════════════════════════════
function startPreRepairCutscene() {
  state.cutscene = 'pre_repair';
  state.cutsceneTimer = 0;
}

function drawPreRepairCutscene(dt) {
  state.cutsceneTimer += dt;
  let t = state.cutsceneTimer;
  let w = width, h = height;
  let P = 2;

  // Timings
  let FADE_IN = 40;
  let EXAMINE = 180;    // character walks to wreck
  let ASSESS = 300;     // looks up at hull
  let PLAN = 400;       // text: "She can be saved"
  let DONE = 480;

  // Background — warm beach scene, late afternoon
  let skyAlpha = min(1, t / FADE_IN);
  noStroke();

  // Sky gradient (golden hour)
  for (let y = 0; y < h * 0.5; y += 4) {
    let amt = y / (h * 0.5);
    let r = lerp(60, 220, amt) * skyAlpha;
    let g = lerp(40, 140, amt) * skyAlpha;
    let b = lerp(80, 55, amt) * skyAlpha;
    fill(r, g, b);
    rect(0, y, w, 4);
  }

  // Sea
  let seaY = floor(h * 0.50);
  for (let y = seaY; y < h * 0.78; y += 4) {
    let amt = (y - seaY) / (h * 0.28);
    fill(lerp(45, 18, amt) * skyAlpha, lerp(75, 35, amt) * skyAlpha, lerp(95, 52, amt) * skyAlpha);
    rect(0, y, w, 4);
  }
  // Wave lines
  for (let i = 0; i < 6; i++) {
    let wy = seaY + 10 + i * 14;
    let wOff = floor(sin(t * 0.03 + i * 0.8) * 3);
    fill(55, 85, 105, 50 * skyAlpha);
    rect(0, wy + wOff, w, 2);
  }

  // Beach
  let beachY = floor(h * 0.78);
  fill(165 * skyAlpha, 148 * skyAlpha, 110 * skyAlpha);
  rect(0, beachY, w, h - beachY);
  // Wet sand shimmer
  fill(140, 120, 85, 60 * skyAlpha);
  for (let x = 0; x < w; x += 18) {
    rect(x + floor(sin(t * 0.02 + x * 0.1) * 2), beachY + 2, 8, 2);
  }

  // Sun (setting, large, warm)
  let sunX = floor(w * 0.7), sunY = floor(h * 0.42);
  fill(255, 200, 80, 60 * skyAlpha);
  ellipse(sunX, sunY, 80, 80);
  fill(255, 220, 120, 120 * skyAlpha);
  ellipse(sunX, sunY, 40, 40);
  fill(255, 240, 190, 200 * skyAlpha);
  ellipse(sunX, sunY, 20, 20);

  // Golden hour haze — warm atmospheric glow across the scene
  let hazeA = floor(skyAlpha * 18);
  fill(255, 200, 100, hazeA);
  rect(0, floor(h * 0.3), w, floor(h * 0.25));
  // Sun rays fanning down from setting sun
  let rsX = floor(w * 0.7), rsY = floor(h * 0.42);
  for (let ri = 0; ri < 5; ri++) {
    let angle = -0.8 + ri * 0.35 + sin(t * 0.008 + ri) * 0.03;
    let rayLen = h * 0.4;
    fill(255, 210, 100, floor(6 * skyAlpha));
    beginShape();
    vertex(rsX, rsY);
    vertex(rsX + cos(angle) * rayLen - 6, rsY + sin(angle) * rayLen);
    vertex(rsX + cos(angle) * rayLen + 6, rsY + sin(angle) * rayLen);
    endShape(CLOSE);
  }

  // ─── THE WRECK — large, detailed, center-right ───
  let wrX = floor(w * 0.55), wrY = beachY - 4;
  let sceneA = min(255, t * 6);

  // Hull — beached, tilted
  push();
  translate(wrX, wrY);
  rotate(-0.12);

  // Waterlogged hull planks
  fill(50, 32, 16, sceneA);
  rect(-55, -10, 110, 16);
  rect(-50, -18, 90, 8);
  rect(-45, 6, 80, 8);

  // Hull ribs (exposed)
  fill(65, 42, 20, sceneA);
  for (let i = -4; i <= 4; i++) {
    rect(i * 12 - 1, -20, 3, 24);
  }

  // Snapped mast — tall stump
  fill(75, 50, 22, sceneA);
  rect(-3, -50, 7, 32);
  // Jagged break at top
  fill(60, 38, 18, sceneA);
  rect(-4, -52, 3, 4);
  rect(3, -54, 4, 3);

  // Torn sail remnants draped over hull
  fill(185, 170, 140, sceneA * 0.7);
  rect(-25, -32, 40, 14);
  rect(-20, -20, 30, 6);
  // Red stripe on sail
  fill(145, 38, 28, sceneA * 0.5);
  rect(-18, -26, 28, 4);

  // Barnacles on hull
  fill(90, 95, 80, sceneA * 0.5);
  rect(-40, 4, 4, 3); rect(-20, 5, 3, 2); rect(10, 6, 5, 3); rect(30, 4, 3, 3);

  // Anchor chain trailing
  fill(80, 75, 65, sceneA * 0.6);
  rect(45, -2, 3, 12);
  rect(48, 8, 2, 6);

  pop();

  // Scattered debris
  fill(60, 38, 18, sceneA);
  rect(wrX + 75, wrY + 4, 14, 3);
  rect(wrX - 70, wrY + 6, 10, 2);
  rect(wrX + 90, wrY + 2, 8, 2);
  // Broken oar
  fill(70, 48, 25, sceneA);
  rect(wrX - 85, wrY + 1, 22, 3);
  rect(wrX - 87, wrY, 4, 5);
  // Rope
  fill(115, 90, 50, sceneA * 0.8);
  rect(wrX + 65, wrY + 3, 6, 6);

  // ─── PLAYER CHARACTER — walking toward wreck, then examining ───
  let figX, figY;
  let examineT = max(0, (t - FADE_IN) / (EXAMINE - FADE_IN));
  examineT = min(1, examineT);
  // Walk from left toward wreck
  let startX = floor(w * 0.15), endX = floor(w * 0.40);
  figX = floor(lerp(startX, endX, examineT));
  figY = beachY - 2;

  // Draw character
  let charA = min(255, (t - 20) * 8);
  if (charA > 0) {
    // Shadow
    fill(0, 0, 0, charA * 0.2);
    ellipse(figX, figY + 2, 14, 4);

    // Looking up at wreck after reaching it
    let lookUp = t > EXAMINE ? min(1, (t - EXAMINE) / 40) : 0;

    // Cape
    let capeFlap = floor(sin(t * 0.04) * 2);
    fill(155, 48, 38, charA);
    rect(figX - 5 - capeFlap, figY - 16, 4 + capeFlap, 14);

    // Body / tunic
    fill(165, 52, 40, charA);
    rect(figX - 5, figY - 18, 10, 16);

    // Armor strips
    fill(190, 155, 65, charA);
    rect(figX - 4, figY - 18, 8, 5);

    // Head (tilted up when examining)
    let headOff = floor(lookUp * -3);
    fill(205, 160, 110, charA);
    rect(figX - 3, figY - 24 + headOff, 7, 6);
    // Hair
    fill(55, 38, 25, charA);
    rect(figX - 3, figY - 24 + headOff, 7, 2);

    // Arms — one reaching toward wreck when close
    fill(205, 160, 110, charA);
    if (t > ASSESS) {
      // Arm reaching toward hull
      rect(figX + 5, figY - 14, 8, 3);
      rect(figX + 12, figY - 13, 3, 2);
    } else {
      rect(figX - 6, figY - 14, 2, 5);
      rect(figX + 4, figY - 14, 2, 5);
    }

    // Legs
    fill(120, 60, 35, charA);
    rect(figX - 3, figY - 2, 3, 4);
    rect(figX + 1, figY - 2, 3, 4);
    // Sandals
    fill(100, 60, 30, charA);
    rect(figX - 4, figY + 2, 4, 2);
    rect(figX + 1, figY + 2, 4, 2);
  }

  // ─── Footprints in sand (behind character) ───
  if (t > FADE_IN + 20) {
    fill(145, 128, 95, 40 * skyAlpha);
    for (let fp = 0; fp < min(8, floor((t - FADE_IN - 20) / 15)); fp++) {
      let fpx = floor(lerp(startX, figX, fp / 8));
      rect(fpx, figY + 2, 3, 2);
      rect(fpx + 5, figY + 3, 3, 2);
    }
  }

  // ─── TEXT OVERLAYS ───
  noStroke();

  // "She's still in one piece..." — examining phase
  if (t > EXAMINE + 30 && t < DONE) {
    let tA = min(255, (t - EXAMINE - 30) * 4);
    if (t > PLAN + 40) tA = max(0, tA - (t - PLAN - 40) * 5);
    _drawCinematicText(w / 2, h * 0.18, '"She is beyond repair... but the wood can be salvaged."', 13, 220, 195, 140, tA);
  }

  // "I will need wood and stone..." — planning phase
  if (t > PLAN && t < DONE) {
    let tA = min(255, (t - PLAN) * 3);
    if (t > DONE - 40) tA = max(0, tA - (t - DONE + 40) * 6);
    _drawCinematicText(w / 2, h * 0.18 + 26, 'Planks for a raft. Rope and cloth for a sail.', 10, 180, 160, 120, tA);
    if (t > PLAN + 40) {
      let tA2 = min(255, (t - PLAN - 40) * 3);
      if (t > DONE - 40) tA2 = max(0, tA2 - (t - DONE + 40) * 6);
      _drawCinematicText(w / 2, h * 0.18 + 48, 'I must build a raft... and find my way home.', 9, 160, 140, 100, tA2);
    }
  }

  // Skip hint
  if (t > 20 && t < DONE) {
    let skipA = 60 + sin(t * 0.05) * 20;
    fill(15, 10, 5, floor(skipA * 0.3));
    rect(w / 2 - 80, h - 26, 160, 14, 2);
    fill(120, 110, 90, skipA);
    textSize(8); textAlign(CENTER, BOTTOM);
    text('[ click or press any key to skip ]', w / 2, h - 14);
  }

  // Black fade-in
  if (t < FADE_IN) {
    fill(0, 0, 0, 255 - (t / FADE_IN) * 255);
    rect(0, 0, w, h);
  }

  // Transition out — warm fade
  if (t >= DONE) {
    let fadeOut = min(255, (t - DONE) * 5);
    fill(255, 240, 210, fadeOut);
    rect(0, 0, w, h);
    if (fadeOut >= 255) {
      state.cutscene = null;
      // Now do the actual first repair
      doFirstRepair();
    }
  }

  textAlign(LEFT, TOP);
}

// ═══════════════════════════════════════════════════════════════════════
// ─── SAILING CUTSCENE — "Departure from the Wreck" ─────────────────
// ═══════════════════════════════════════════════════════════════════════
function startSailingCutscene() {
  state.cutscene = 'sailing';
  state.cutsceneTimer = 0;
}

function drawSailingCutscene(dt) {
  state.cutsceneTimer += dt;
  let t = state.cutsceneTimer;
  let w = width, h = height;

  // Timings
  let FADE_IN = 50;
  let PUSH_OFF = 120;    // ship pushed into water
  let SAILING = 300;     // ship crosses open water
  let ISLAND_APPEAR = 400; // home island fades in
  let ARRIVAL = 520;     // approaching shore
  let DONE = 600;

  // --- SAILING AUDIO CUES ---
  if (snd && snd.ready) {
    let masterVol = snd.vol.master * snd.vol.ambient;
    // Steady wind ambient (~300Hz filtered noise)
    let windAmt = min(1, t / FADE_IN);
    snd._windGain.amp(0.08 * windAmt * masterVol, 0.3);
    snd._windFilter.freq(300 + sin(frameCount * 0.002) * 60);
    // Gentle waves
    snd._waveGain.amp(0.05 * windAmt * masterVol, 0.3);
    snd._waveFilter.freq(280 + sin(frameCount * 0.003) * 50);
    // Oar splash every ~120 frames
    if (t > PUSH_OFF && t < DONE && floor(t) % 120 === 0 && floor(t) !== floor(t - dt)) {
      snd.playSFX('oar_splash');
    }
    // Seagull call every ~200 frames
    if (t > PUSH_OFF && t < DONE && floor(t) % 200 === 0 && floor(t) !== floor(t - dt)) {
      snd.playSFX('seagull');
    }
  }

  let skyAlpha = min(1, t / FADE_IN);
  noStroke();

  // ─── SKY — dawn breaking over open sea ───
  for (let y = 0; y < h * 0.45; y += 4) {
    let amt = y / (h * 0.45);
    let r = lerp(25, 240, amt) * skyAlpha;
    let g = lerp(20, 160, amt) * skyAlpha;
    let b = lerp(55, 65, amt) * skyAlpha;
    fill(r, g, b);
    rect(0, y, w, 4);
  }

  // Sun rising (dramatic)
  let sunRise = min(1, max(0, (t - PUSH_OFF) / 200));
  let sunX = floor(w * 0.5), sunY = floor(h * 0.38 - sunRise * 30);
  if (t > PUSH_OFF) {
    // Sun glow
    fill(255, 200, 80, 30 * skyAlpha * sunRise);
    ellipse(sunX, sunY, 120, 120);
    fill(255, 220, 100, 60 * skyAlpha * sunRise);
    ellipse(sunX, sunY, 60, 60);
    fill(255, 240, 180, 180 * skyAlpha * sunRise);
    ellipse(sunX, sunY, 24, 24);

    // God rays
    for (let ri = 0; ri < 5; ri++) {
      let angle = -1.0 + ri * 0.4 + sin(t * 0.005 + ri) * 0.05;
      let rayLen = 60 + ri * 20;
      fill(255, 220, 100, 8 * skyAlpha * sunRise);
      for (let rd = 12; rd < rayLen; rd += 4) {
        let rx = sunX + floor(cos(angle) * rd);
        let ry = sunY + floor(sin(angle) * rd);
        if (ry > 0 && ry < h * 0.45) rect(rx, ry, 3, 3);
      }
    }
  }

  // ─── SEA — vast, open water ───
  let seaY = floor(h * 0.45);
  for (let y = seaY; y < h; y += 4) {
    let amt = (y - seaY) / (h - seaY);
    let r = lerp(40, 15, amt) * skyAlpha;
    let g = lerp(70, 28, amt) * skyAlpha;
    let b = lerp(95, 48, amt) * skyAlpha;
    fill(r, g, b);
    rect(0, y, w, 4);
  }

  // Wave crests
  for (let i = 0; i < 10; i++) {
    let wy = seaY + 8 + i * floor((h - seaY) / 10);
    let wOff = floor(sin(t * 0.025 + i * 1.1) * 3);
    let wLen = 30 + floor(sin(i * 2.3) * 15);
    let wX = floor(w * 0.3 + sin(t * 0.01 + i * 0.7) * w * 0.2);
    fill(55, 85, 110, 35 * skyAlpha);
    rect(wX, wy + wOff, wLen, 2);
  }

  // Sun reflection path on water
  if (t > PUSH_OFF) {
    for (let y = seaY + 4; y < h; y += 6) {
      let shimmer = sin(t * 0.04 + y * 0.12) * 0.5 + 0.5;
      if (shimmer > 0.4) {
        let reflW = floor((2 + shimmer * 6) * (1 - (y - seaY) / (h - seaY)));
        let reflX = sunX + floor(sin(t * 0.015 + y * 0.03) * 8);
        fill(255, 210, 90, floor(shimmer * 25 * skyAlpha * sunRise));
        rect(reflX - reflW / 2, y, max(1, reflW), 2);
      }
    }
  }

  // ─── SEAGULLS — flying overhead ───
  if (!drawSailingCutscene._gulls) {
    drawSailingCutscene._gulls = [
      { x: 0.3, y: 0.18, speed: 0.012, wingPhase: 0, size: 5 },
      { x: 0.6, y: 0.22, speed: 0.009, wingPhase: 2.1, size: 4 },
      { x: 0.8, y: 0.14, speed: 0.015, wingPhase: 4.3, size: 3.5 },
    ];
  }
  for (let gull of drawSailingCutscene._gulls) {
    gull.x -= gull.speed * 0.016;
    if (gull.x < -0.05) { gull.x = 1.1; gull.y = 0.12 + (gull.wingPhase * 37 % 15) / 100; }
    let gx = gull.x * w, gy = gull.y * h;
    let wingUp = sin(t * 0.08 + gull.wingPhase) * gull.size * 0.6;
    fill(40, 35, 50, floor(140 * skyAlpha));
    // Body
    rect(floor(gx - 1), floor(gy), 3, 2);
    // V-shape wings
    rect(floor(gx - gull.size), floor(gy - wingUp), floor(gull.size), 1);
    rect(floor(gx + 1), floor(gy + wingUp * 0.7), floor(gull.size), 1);
  }

  // ─── SUN SHIMMER LINE on water — golden reflection band ───
  if (t > PUSH_OFF) {
    let shimBand = floor(seaY + 6);
    for (let sy = shimBand; sy < shimBand + 12; sy += 2) {
      let shimW = floor(20 + sin(t * 0.03 + sy * 0.2) * 12);
      let shimX = sunX + floor(sin(t * 0.02 + sy * 0.1) * 6) - shimW / 2;
      let shimA = floor((sin(t * 0.05 + sy * 0.15) + 1) * 12 * skyAlpha * sunRise);
      fill(255, 220, 100, shimA);
      rect(floor(shimX), sy, shimW, 2);
    }
  }

  // ─── DISTANT ISLAND SILHOUETTE — gradually appearing on horizon ───
  if (t > SAILING && t < ISLAND_APPEAR + 60) {
    let distAppear = min(1, (t - SAILING) / 200);
    let distX = floor(w * 0.88);
    let distY = floor(seaY + 2);
    let distA = floor(distAppear * 60 * skyAlpha);
    // Low dark landmass on horizon
    fill(25, 30, 40, distA);
    rect(distX - 20, distY - 4, 40, 6);
    rect(distX - 14, distY - 7, 28, 4);
    rect(distX - 6, distY - 10, 12, 4);
  }

  // ─── WRECK ISLAND — receding behind (left side, shrinking) ───
  if (t < ISLAND_APPEAR + 60) {
    let recede = min(1, max(0, (t - PUSH_OFF) / 250));
    let isleX = floor(lerp(w * 0.2, -w * 0.1, recede));
    let isleScale = lerp(1.0, 0.4, recede);
    let isleY = floor(h * 0.43);
    let isleA = floor((1 - recede * 0.7) * 180 * skyAlpha);

    // Island silhouette
    fill(35, 30, 22, isleA);
    let iW = floor(80 * isleScale), iH = floor(20 * isleScale);
    rect(isleX - iW / 2, isleY - iH, iW, iH);
    // Hill
    rect(isleX - iW * 0.3, isleY - iH - floor(8 * isleScale), floor(iW * 0.5), floor(8 * isleScale));
    // Palm
    rect(isleX + floor(iW * 0.2), isleY - iH - floor(14 * isleScale), floor(2 * isleScale), floor(12 * isleScale));
  }

  // ─── THE TRIREME — sailing across ───
  let shipProgress = min(1, max(0, (t - PUSH_OFF) / (ARRIVAL - PUSH_OFF)));
  // Ease in-out
  let shipEase = shipProgress < 0.5 ?
    2 * shipProgress * shipProgress :
    1 - pow(-2 * shipProgress + 2, 2) / 2;

  let shipX = floor(lerp(w * 0.25, w * 0.65, shipEase));
  let shipY = floor(h * 0.55);
  let bob = floor(sin(t * 0.04) * 3);
  shipY += bob;

  let shipA = min(255, t * 5);

  // Wake trail behind ship
  if (t > PUSH_OFF) {
    for (let wi = 0; wi < 8; wi++) {
      let wakeX = shipX - 15 - wi * 12;
      let wakeY = shipY + 8 + floor(sin(t * 0.03 + wi * 0.5) * 2);
      let wakeA = max(0, 40 - wi * 5) * skyAlpha;
      fill(170, 200, 215, wakeA);
      rect(wakeX, wakeY, 10 - wi, 2);
    }
  }

  push();
  translate(shipX, shipY);

  // Hull
  fill(55, 35, 18, shipA);
  rect(-30, 0, 60, 2);
  rect(-28, 2, 56, 2);
  rect(-32, -2, 64, 2);
  rect(-34, -4, 68, 2);
  rect(-32, -6, 64, 2);
  rect(-30, -8, 60, 2);

  // Stern (left)
  rect(-35, -6, 2, 2);
  rect(-36, -8, 2, 2);
  rect(-37, -10, 2, 2);
  rect(-36, -12, 2, 2);
  rect(-34, -13, 2, 2); // curl

  // Prow (right) — proud and forward
  rect(32, -4, 2, 2);
  rect(34, -6, 2, 2);
  rect(35, -8, 3, 2);
  // Ram
  rect(36, 0, 4, 2);

  // Hull plank detail
  fill(45, 28, 14, shipA * 0.7);
  rect(-24, -2, 48, 1);
  rect(-22, 1, 44, 1);

  // Patched hull sections (lighter wood — repaired!)
  fill(100, 75, 40, shipA * 0.6);
  rect(-18, -4, 12, 4);
  rect(8, -4, 10, 4);

  // Rim light
  fill(190, 155, 65, shipA * 0.3);
  rect(-28, -8, 56, 1);

  // ─── MAST — repaired, standing tall ───
  fill(70, 48, 22, shipA);
  rect(-1, -42, 4, 34);
  // Cross yard
  rect(-16, -38, 34, 2);

  // ─── SAIL — patched but full of wind ───
  let sailBillow = floor(sin(t * 0.05) * 2);
  // Main body (cream, billowing right = moving right)
  fill(195, 180, 155, shipA * 0.85);
  rect(-14, -36, 16 + sailBillow, 4);
  rect(-13, -32, 18 + sailBillow, 4);
  rect(-12, -28, 20 + sailBillow * 2, 4);
  rect(-11, -24, 18 + sailBillow, 4);
  rect(-10, -20, 14 + sailBillow, 4);

  // Patch marks (darker spots showing repairs)
  fill(140, 120, 90, shipA * 0.5);
  rect(-8, -30, 6, 4);
  rect(0 + sailBillow, -22, 5, 3);

  // Red stripe (Roman eagle sail marking)
  fill(150, 42, 30, shipA * 0.6);
  rect(-12, -28, 18 + sailBillow, 3);

  // Rope rigging
  fill(100, 80, 50, shipA * 0.5);
  // Stays to mast
  rect(-16, -38, 1, 8); rect(18, -38, 1, 8);

  // ─── OARS — rowing in unison ───
  for (let oi = 0; oi < 4; oi++) {
    let oarPhase = sin(t * 0.06 + oi * 0.8);
    let ox = -18 + oi * 10;
    let oarDip = floor(oarPhase * 3);
    fill(60, 40, 20, shipA * 0.7);
    rect(ox, 2, 2, 8 + oarDip);
    // Blade
    rect(ox - 1, 8 + oarDip, 4, 2);
  }

  // ─── BOW SPRAY — foam kicked up by prow ───
  if (t > PUSH_OFF) {
    let sprayInt = min(1, (t - PUSH_OFF) / 60);
    for (let si = 0; si < 6; si++) {
      let spPhase = t * 0.08 + si * 1.3;
      let spX = 36 + si * 2 + sin(spPhase) * 3;
      let spY = 2 - si * 2 + sin(spPhase + 1) * 2;
      let spA = floor((80 - si * 12) * sprayInt * skyAlpha);
      if (spA > 0) {
        fill(200, 220, 240, spA);
        rect(floor(spX), floor(spY), 2, 2);
      }
    }
    // Dripping water drops from bow
    for (let di = 0; di < 3; di++) {
      let dropPhase = (t * 0.1 + di * 2.1) % 3.0;
      if (dropPhase < 1.5) {
        let dropX = 34 + di * 3;
        let dropY = 4 + dropPhase * 6;
        fill(170, 200, 220, floor((60 - dropPhase * 40) * sprayInt));
        rect(floor(dropX), floor(dropY), 1, 2);
      }
    }
  }

  // ─── FIGURE on deck — standing at prow ───
  // Body
  fill(165, 52, 40, shipA);
  rect(20, -16, 6, 10);
  // Head
  fill(205, 160, 110, shipA);
  rect(21, -20, 5, 4);
  // Cape flowing back
  let capeF = floor(sin(t * 0.04) * 2);
  fill(150, 42, 32, shipA * 0.8);
  rect(16 - capeF, -14, 4 + capeF, 8);
  // Arm pointing forward
  fill(205, 160, 110, shipA * 0.9);
  rect(26, -14, 5, 2);

  pop();

  // ─── HOME ISLAND — appearing on right horizon ───
  if (t > ISLAND_APPEAR) {
    let appear = min(1, (t - ISLAND_APPEAR) / 120);
    let homeX = floor(lerp(w * 1.1, w * 0.82, appear));
    let homeY = floor(h * 0.43);
    let homeA = floor(appear * 200 * skyAlpha);

    // Island mass — larger, with buildings
    fill(45, 55, 35, homeA);
    rect(homeX - 50, homeY - 12, 100, 16);
    rect(homeX - 40, homeY - 20, 80, 10);
    rect(homeX - 30, homeY - 26, 60, 8);
    // Hill peak
    rect(homeX - 15, homeY - 32, 30, 8);

    // Temple/villa on hilltop
    fill(140, 125, 95, homeA * 0.8);
    // Columns
    for (let ci = -2; ci <= 2; ci++) {
      rect(homeX + ci * 5, homeY - 40, 2, 8);
    }
    // Pediment
    rect(homeX - 12, homeY - 41, 24, 2);
    rect(homeX - 8, homeY - 43, 16, 2);
    rect(homeX - 4, homeY - 45, 8, 2);

    // Warm glow from windows
    let glow = sin(t * 0.02) * 0.3 + 0.7;
    fill(255, 200, 80, homeA * 0.3 * glow);
    rect(homeX - 6, homeY - 38, 3, 3);
    rect(homeX + 3, homeY - 38, 3, 3);

    // Trees
    fill(35, 55, 28, homeA * 0.7);
    rect(homeX - 40, homeY - 24, 8, 6);
    rect(homeX + 30, homeY - 22, 10, 6);
    rect(homeX - 25, homeY - 28, 6, 5);

    // Lighthouse/port beacon
    if (appear > 0.5) {
      let beaconA = floor((appear - 0.5) * 2 * 255);
      fill(255, 220, 100, beaconA * 0.5 * glow);
      ellipse(homeX + 40, homeY - 18, 6, 6);
      fill(180, 140, 80, beaconA * 0.4);
      rect(homeX + 39, homeY - 16, 3, 10);
    }
  }

  // ─── ATMOSPHERIC FOG LAYER — drifting sea mist ───
  if (t > PUSH_OFF) {
    let fogAlpha = min(1, (t - PUSH_OFF) / 100) * skyAlpha;
    for (let fi = 0; fi < 5; fi++) {
      let fogX = ((fi * 197 + floor(t * 0.3)) % (floor(w * 1.3))) - floor(w * 0.15);
      let fogY = seaY - 8 + fi * 6;
      let fogW = 60 + fi * 20;
      fill(180, 195, 210, floor(8 * fogAlpha));
      ellipse(fogX, fogY, fogW, 8);
    }
  }

  // ─── TEXT OVERLAYS ───
  noStroke();

  // Departure text
  if (t > PUSH_OFF - 30 && t < SAILING) {
    let tA = min(255, (t - PUSH_OFF + 30) * 3);
    if (t > SAILING - 40) tA = max(0, tA - (t - SAILING + 40) * 5);
    _drawCinematicText(w / 2, h * 0.15, 'The sea opens before me...', 14, 220, 200, 155, tA);
  }

  // Mid-voyage text
  if (t > SAILING + 20 && t < ISLAND_APPEAR + 30) {
    let tA = min(255, (t - SAILING - 20) * 3);
    if (t > ISLAND_APPEAR) tA = max(0, tA - (t - ISLAND_APPEAR) * 4);
    _drawCinematicText(w / 2, h * 0.15, 'The wind catches the sail. Sol guides the way.', 11, 190, 170, 130, tA);
  }

  // Island sighted
  if (t > ISLAND_APPEAR + 40 && t < DONE) {
    let tA = min(255, (t - ISLAND_APPEAR - 40) * 3);
    if (t > DONE - 50) tA = max(0, tA - (t - DONE + 50) * 5);
    _drawCinematicText(w / 2, h * 0.15, 'Land! A new beginning...', 14, 240, 215, 150, tA);
    if (t > ISLAND_APPEAR + 90) {
      let tA2 = min(255, (t - ISLAND_APPEAR - 90) * 3);
      if (t > DONE - 50) tA2 = max(0, tA2 - (t - DONE + 50) * 5);
      _drawCinematicText(w / 2, h * 0.15 + 24, 'Home.', 10, 200, 180, 140, tA2);
    }
  }

  // Skip hint
  if (t > 20 && t < DONE) {
    let skipA = 60 + sin(t * 0.05) * 20;
    fill(15, 10, 5, floor(skipA * 0.3));
    rect(w / 2 - 80, h - 26, 160, 14, 2);
    fill(120, 110, 90, skipA);
    textSize(8); textAlign(CENTER, BOTTOM);
    text('[ click or press any key to skip ]', w / 2, h - 14);
  }

  // Black fade-in
  if (t < FADE_IN) {
    fill(0, 0, 0, 255 - (t / FADE_IN) * 255);
    rect(0, 0, w, h);
  }

  // Fade to white — transition to home
  if (t >= DONE) {
    let fadeOut = min(255, (t - DONE) * 4);
    fill(255, 245, 220, fadeOut);
    rect(0, 0, w, h);
    if (fadeOut >= 255) {
      state.cutscene = null;
      completeSailToHome();
    }
  }

  textAlign(LEFT, TOP);
}

function skipCutscene() {
  if (state.cutscene === 'pre_repair') {
    state.cutscene = null;
    doFirstRepair();
  } else if (state.cutscene === 'sailing') {
    state.cutscene = null;
    completeSailToHome();
  } else if (state.cutscene === 'home_sunrise') {
    state.cutscene = null;
    camSmooth.x = cam.x; camSmooth.y = cam.y;
    addFloatingText(width / 2, height * 0.3, 'HOME ISLAND REACHED', C.solarGold);
    addFloatingText(width / 2, height * 0.36, 'Explore the ruins...', C.textDim);
  }
}

// Actually perform the first repair step (called after pre-repair cutscene)
function doFirstRepair() {
  // Legacy: now triggers first raft build instead
  buildRaft();
  state.progression.tutorialsSeen.firstRepairCutscene = true;
}

// Transfer to home island (called after sailing cutscene)
function completeSailToHome() {
  state.progression.homeIslandReached = true;
  saveGame();
  state.progression.wreckExplored = true;
  trackMilestone('wreck_cleared');
  trackMilestone('home_reached');
  unlockJournal('home_found');

  if (snd) snd.playSFX('sail');
  let port = getPortPosition();
  state.player.x = port.x + 40;
  state.player.y = port.y;
  state.player.facing = 'left';
  cam.x = state.player.x; cam.y = state.player.y;
  camSmooth.x = cam.x; camSmooth.y = cam.y;

  state.wood += 5; state.stone += 3; state.seeds += 3;

  // Transfer wreck beach cat to home island
  if (state.wreck.cat && state.wreck.cat.introduced) {
    let port = getPortPosition();
    state.cats.push({
      x: port.x + 60, y: port.y + 10,
      vx: 0, vy: 0, facing: 1,
      timer: random(100, 300), state: 'idle',
      giftTimer: 600,
      color: state.wreck.cat.color,
    });
    addFloatingText(width / 2, height * 0.42, 'The stray cat followed you!', '#ffaa66');
  }

  // Begin sunrise cinematic before player gets control
  state.cutscene = 'home_sunrise';
  state.cutsceneTimer = 0;
}

// ─── HOME ISLAND SUNRISE — held emotional moment ──────────────────────────
function drawHomeSunriseCinematic(dt) {
  state.cutsceneTimer += dt;
  let t = state.cutsceneTimer;
  let dur = 200; // ~3.3 seconds at 60fps
  let progress = min(1, t / dur);

  // Camera slowly drifts rightward across the island
  camSmooth.x = cam.x + progress * 80;
  camSmooth.y = cam.y - progress * 10;

  // Warm D major chord at the start (D4=293.7, F#4=370, A4=440)
  if (t === dt && snd) snd.playSFX('home_sunrise_chord');

  // Golden morning overlay — blooms then fades
  let overlayAlpha;
  if (progress < 0.3) {
    overlayAlpha = (progress / 0.3) * 60; // bloom in
  } else if (progress < 0.7) {
    overlayAlpha = 60; // hold
  } else {
    overlayAlpha = 60 * (1 - (progress - 0.7) / 0.3); // fade out
  }
  fill(255, 210, 100, floor(overlayAlpha));
  rect(0, 0, width, height);

  // Text: "A new beginning..." fades in center then out
  let textAlpha = 0;
  if (progress > 0.2 && progress < 0.85) {
    let tp = (progress - 0.2) / 0.65;
    if (tp < 0.25) textAlpha = tp / 0.25;
    else if (tp < 0.75) textAlpha = 1;
    else textAlpha = 1 - (tp - 0.75) / 0.25;
  }
  if (textAlpha > 0.01) {
    _drawCinematicText(width / 2, height * 0.45, 'A new beginning...', 20,
      240, 220, 180, floor(textAlpha * 255));
  }

  // End: give player control
  if (t >= dur) {
    state.cutscene = null;
    camSmooth.x = cam.x; camSmooth.y = cam.y;
    addFloatingText(width / 2, height * 0.3, 'HOME ISLAND REACHED', C.solarGold);
    addFloatingText(width / 2, height * 0.36, 'Explore the ruins...', C.textDim);
  }
}

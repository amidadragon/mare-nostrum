// ─── SEAMLESS EXPLORATION ISLAND HELPER ────────────────────────────────
function _isExplorationActive(key) { return state._activeExploration === key; }

// Content init functions (called on first seamless entry — generate entities at world coords)
function enterVulcanContent() {
  let v = state.vulcan; v.phase = 'explored';
  for (let i = 0; i < 5; i++) { let a = (i / 5) * TWO_PI + random(-0.3, 0.3), r = random(0.3, 0.6) * v.isleRX; v.lavaPools.push({ x: v.isleX + cos(a) * r, y: v.isleY + sin(a) * r * 0.7, r: random(18, 35), phase: random(TWO_PI) }); }
  for (let i = 0; i < 3; i++) { let a = random(TWO_PI), r = random(0.15, 0.4) * v.isleRX; v.hotSprings.push({ x: v.isleX + cos(a) * r, y: v.isleY + sin(a) * r * 0.7, healTimer: 0 }); }
  for (let i = 0; i < 8; i++) { let a = random(TWO_PI), r = random(0.2, 0.7) * v.isleRX; v.obsidianNodes.push({ x: v.isleX + cos(a) * r, y: v.isleY + sin(a) * r * 0.7, collected: false }); }
  for (let i = 0; i < 6; i++) { let a = random(TWO_PI), r = random(0.1, 0.5) * v.isleRX; v.smokeVents.push({ x: v.isleX + cos(a) * r, y: v.isleY + sin(a) * r * 0.7, phase: random(TWO_PI) }); }
}
function enterHyperboreContent() {
  let h = state.hyperborea; h.phase = 'explored';
  h.frozenObelisk = { x: h.isleX, y: h.isleY };
  for (let i = 0; i < 4; i++) { let a = (i / 4) * TWO_PI + random(-0.4, 0.4), r = random(0.25, 0.55) * h.isleRX; h.frozenRuins.push({ x: h.isleX + cos(a) * r, y: h.isleY + sin(a) * r * 0.7, looted: false }); }
  for (let i = 0; i < 7; i++) { let a = random(TWO_PI), r = random(0.2, 0.65) * h.isleRX; h.frostNodes.push({ x: h.isleX + cos(a) * r, y: h.isleY + sin(a) * r * 0.7, collected: false }); }
  for (let i = 0; i < 6; i++) { let a = random(TWO_PI), r = random(0.1, 0.5) * h.isleRX; h.penguins.push({ x: h.isleX + cos(a) * r, y: h.isleY + sin(a) * r * 0.7, vx: 0, vy: 0, state: 'idle', timer: random(60, 180) }); }
}
function enterPlentyContent() {
  let pl = state.plenty; pl.phase = 'explored';
  let treeTypes = ['mango', 'banana', 'coconut', 'fig'];
  for (let i = 0; i < 12; i++) { let a = random(TWO_PI), r = random(0.15, 0.65) * pl.isleRX; pl.fruitTrees.push({ x: pl.isleX + cos(a) * r, y: pl.isleY + sin(a) * r * 0.7, type: treeTypes[i % 4], fruit: true, timer: 0 }); }
  let cols = ['#ff4444', '#44cc44', '#4488ff', '#ffaa00', '#ff44cc'];
  for (let i = 0; i < 5; i++) pl.parrots.push({ x: pl.isleX + random(-pl.isleRX * 0.5, pl.isleRX * 0.5), y: pl.isleY + random(-pl.isleRY * 0.4, pl.isleRY * 0.4), vx: random(-0.5, 0.5), vy: random(-0.3, 0.3), color: cols[i], state: 'flying' });
  pl.waterfalls.push({ x: pl.isleX - pl.isleRX * 0.45, y: pl.isleY - pl.isleRY * 0.2, h: 35 }, { x: pl.isleX + pl.isleRX * 0.35, y: pl.isleY - pl.isleRY * 0.35, h: 28 });
  for (let i = 0; i < 6; i++) { let a = random(TWO_PI), r = random(0.2, 0.6) * pl.isleRX; pl.spiceNodes.push({ x: pl.isleX + cos(a) * r, y: pl.isleY + sin(a) * r * 0.7, collected: false }); }
}
function enterNecropolisContent() {
  let n = state.necropolis; n.phase = 'explored';
  for (let i = 0; i < 6; i++) { let a = (i / 6) * TWO_PI + random(-0.3, 0.3), r = random(0.2, 0.6) * n.isleRX; n.tombs.push({ x: n.isleX + cos(a) * r, y: n.isleY + sin(a) * r * 0.7, looted: false, trapped: random() < 0.3 }); }
  for (let i = 0; i < 4; i++) { let a = random(TWO_PI), r = random(0.15, 0.5) * n.isleRX; n.skeletons.push({ x: n.isleX + cos(a) * r, y: n.isleY + sin(a) * r * 0.7, vx: 0, vy: 0, hp: 40, maxHp: 40, attackTimer: 0, facing: 1, flashTimer: 0, state: 'patrol', patrolAngle: random(TWO_PI) }); }
  let gn = ['Aurelius', 'Cornelia', 'Septimus'], gl = ['The forge of Vulcan... obsidian tempered in soul fire creates weapons beyond mortal craft.', 'Frost crystals from the north... they bind enchantments to steel. Seek Hyperborea.', 'I once sailed to the Isle of Plenty... its spices could preserve food for centuries.'];
  for (let i = 0; i < 3; i++) { let a = (i / 3) * TWO_PI + PI * 0.3, r = random(0.3, 0.55) * n.isleRX; n.ghostNPCs.push({ x: n.isleX + cos(a) * r, y: n.isleY + sin(a) * r * 0.7, name: gn[i], line: gl[i], talked: false }); }
  for (let i = 0; i < 5; i++) { let a = random(TWO_PI), r = random(0.2, 0.6) * n.isleRX; n.soulNodes.push({ x: n.isleX + cos(a) * r, y: n.isleY + sin(a) * r * 0.7, collected: false }); }
}

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
  let fac = typeof FACTIONS !== 'undefined' ? FACTIONS[key] : null;
  let bannerCol = fac ? fac.bannerColor : [150, 100, 60];
  let accentCol = fac ? fac.accentColor : [180, 140, 100];
  let terrainCol = _getNationTerrainColor(key);
  let bright = (typeof getSkyBrightness === 'function') ? getSkyBrightness() : 0.7;
  let fsx = floor(sx), fsy = floor(sy);
  let lv = nation.level || 1;

  push(); noStroke();
  if (dScale && dScale.scale < 0.98) {
    translate(fsx, fsy); scale(dScale.scale); translate(-fsx, -fsy);
  }

  // Water shadow
  fill(20, 60, 80, 30); ellipse(fsx + 2, fsy + 3, rx * 2.1, ry * 2.1);
  // Shallow water ring
  fill(55, 140, 160, 45); ellipse(fsx, fsy, rx * 2.05, ry * 2.05);
  // Beach ring
  let beachCol = _getNationTerrainColor(key);
  fill(beachCol[0] + 30, beachCol[1] + 30, beachCol[2] + 40);
  ellipse(fsx, fsy, rx * 1.95, ry * 1.95);
  // Main terrain
  fill(terrainCol[0], terrainCol[1], terrainCol[2]); ellipse(fsx, fsy, rx * 1.78, ry * 1.78);
  fill(terrainCol[0] - 15, terrainCol[1] - 10, terrainCol[2] - 10);
  ellipse(fsx, fsy, rx * 1.6, ry * 1.6);

  // Building silhouettes (small rects)
  let numB = min(3 + floor(lv * 0.5), 6);
  fill(100, 90, 75, 120);
  for (let i = 0; i < numB; i++) {
    let ba = (i / numB) * PI + 0.3;
    let br = rx * 0.25 + (i % 3) * rx * 0.1;
    let bx = fsx + cos(ba) * br - rx * 0.1;
    let by = fsy + sin(ba) * br * 0.5 - ry * 0.12;
    rect(floor(bx), floor(by - 4 - lv * 0.3), 5 + (i % 2) * 2, 4 + floor(lv * 0.3));
  }

  // Smoke wisps (1-2 animated)
  if (lv >= 2) {
    fill(180, 180, 170, 20 + sin(frameCount * 0.03) * 8);
    let smX = fsx - 5, smY = fsy - ry * 0.2 - 8 - sin(frameCount * 0.02) * 3;
    ellipse(smX, smY, 5, 3);
    if (lv >= 4) ellipse(smX + 10, smY - 2, 4, 2);
  }

  // War effects — fire/smoke
  if (nation.wars && nation.wars.length > 0) {
    let warPulse = sin(frameCount * 0.08) * 0.3 + 0.7;
    fill(200, 60, 20, 30 * warPulse); ellipse(fsx, fsy - ry * 0.1, rx * 0.6, ry * 0.4);
    fill(80, 80, 80, 20 * warPulse); ellipse(fsx + 5, fsy - ry * 0.3, rx * 0.4, ry * 0.2);
  }

  // Flag — waving
  let flagY = fsy - ry * 0.55;
  fill(accentCol[0], accentCol[1], accentCol[2], 140);
  rect(fsx, flagY - 2, 1, 12);
  fill(bannerCol[0], bannerCol[1], bannerCol[2], 160);
  let flagWave = sin(frameCount * 0.06) * 2;
  beginShape();
  vertex(fsx + 1, flagY - 2); vertex(fsx + 8 + flagWave, flagY + 1); vertex(fsx + 1, flagY + 4);
  endShape(CLOSE);

  // Tiny docked ship if trading
  if (lv >= 3) {
    fill(90, 65, 30, 100);
    let dsy = fsy + ry * 0.8;
    beginShape();
    vertex(fsx - 4, dsy); vertex(fsx - 2, dsy + 2); vertex(fsx + 2, dsy + 2); vertex(fsx + 4, dsy);
    endShape(CLOSE);
  }

  // Distance haze
  if (dScale && dScale.haze > 5) {
    fill(140 + 30 * bright, 165 + 20 * bright, 195 + 10 * bright, floor(dScale.haze * 0.4));
    ellipse(fsx, fsy, rx * 2.1, ry * 2.1);
  }

  // Name label
  fill(getNationStanceColor(nation)); textSize(max(8, floor(10 * (dScale ? dScale.scale : 1))));
  textAlign(CENTER); textStyle(ITALIC);
  text(getNationName(key), fsx, fsy + ry + 10 * (dScale ? dScale.scale : 1));
  textStyle(NORMAL); textAlign(LEFT, TOP);
  pop();
}

// Draw a nation island at close LOD — detailed terrain, buildings, soldiers, NPCs
function drawNationCloseLOD(sx, sy, rx, ry, key, nation, dScale) {
  // Close LOD reuses the full distant draw — it already has all the detail we need
  // Just add activity overlays on top
  drawSingleNationIsleDistant(key);

  // Soldier patrol dots (animated)
  let fsx = floor(sx), fsy = floor(sy);
  let soldiers = min(nation.military || 0, 8);
  let fac = typeof FACTIONS !== 'undefined' ? FACTIONS[key] : null;
  let soldierCol = fac ? fac.bannerColor : [150, 100, 60];

  push(); noStroke();
  // Only update positions every 5 frames for perf
  if (soldiers > 0) {
    for (let i = 0; i < soldiers; i++) {
      let angle = (frameCount * 0.01 + i * TWO_PI / soldiers) % TWO_PI;
      let px = fsx + cos(angle) * rx * 0.55;
      let py = fsy + sin(angle) * ry * 0.3;
      fill(soldierCol[0], soldierCol[1], soldierCol[2], 180);
      rect(floor(px) - 1, floor(py) - 1, 2, 3);
    }
  }

  // Citizens walking between buildings with purpose
  let popCount = min(nation.population || 0, 6);
  let numB = min(3 + floor((nation.level || 1) * 0.5), 6);
  for (let i = 0; i < popCount; i++) {
    // Walk figure-8 between two building positions
    let t = (frameCount * 0.005 + i * 1.7) % TWO_PI;
    let srcA = (i / numB) * PI + 0.3, dstA = ((i + 2) / numB) * PI + 0.3;
    let lerp = (sin(t) + 1) * 0.5;
    let px = fsx + cos(srcA) * rx * 0.25 * (1 - lerp) + cos(dstA) * rx * 0.3 * lerp;
    let py = fsy + sin(srcA) * ry * 0.15 * (1 - lerp) + sin(dstA) * ry * 0.2 * lerp;
    fill(200, 180, 150, 160); rect(floor(px), floor(py) - 2, 2, 3);
    // Merchant carrying: small colored dot
    if (i % 3 === 0) { fill(180, 140, 60, 140); rect(floor(px) + 2, floor(py) - 1, 2, 2); }
  }

  // Construction scaffolding — sparkle + scaffold outline
  if (nation._lastBuildFrame && frameCount - nation._lastBuildFrame < 180) {
    let prog = (frameCount - nation._lastBuildFrame) / 180;
    let ba = (numB * 0.7) / numB * PI + 0.3;
    let bx = fsx + cos(ba) * rx * 0.25, by = fsy + sin(ba) * ry * 0.15;
    stroke(120, 90, 50, 120 * (1 - prog)); noFill();
    rect(floor(bx) - 4, floor(by) - 7, 9, 8); noStroke();
    fill(255, 255, 200, 50 * (1 - prog));
    for (let di = 0; di < 2; di++) ellipse(bx + sin(frameCount * 0.06 + di) * 4, by - 5 * prog, 3, 3);
  }

  // Recruit marching from barracks
  if (nation._lastRecruitFrame && frameCount - nation._lastRecruitFrame < 120) {
    let rp = (frameCount - nation._lastRecruitFrame) / 120;
    let rpx = fsx + rp * rx * 0.4, rpy = fsy - ry * 0.1;
    fill(soldierCol[0], soldierCol[1], soldierCol[2], 200 * (1 - rp));
    rect(floor(rpx) - 1, floor(rpy) - 2, 3, 4);
  }

  // Chimney smoke on first two buildings
  for (let i = 0; i < min(numB, 2); i++) {
    let sba = (i / numB) * PI + 0.3;
    let sbx = fsx + cos(sba) * rx * 0.25 + i * rx * 0.1;
    let sby = fsy + sin(sba) * ry * 0.15 * 0.5 - ry * 0.15;
    fill(180, 180, 170, 15 + sin(frameCount * 0.04 + i * 2) * 8);
    ellipse(sbx, sby - sin(frameCount * 0.025 + i) * 3, 4, 3);
  }

  // War fire particles
  if (nation.wars && nation.wars.length > 0) {
    for (let i = 0; i < 3; i++) {
      let fx = fsx + random(-rx * 0.3, rx * 0.3);
      let fy = fsy + random(-ry * 0.2, ry * 0.2);
      fill(255, 100 + random(80), 20, 40 + sin(frameCount * 0.1 + i) * 20);
      ellipse(fx, fy, 4, 4);
    }
  }

  // Farm fields as green patches with animated farmers
  if (nation.level >= 2) {
    fill(80, 140, 50, 40);
    ellipse(fsx + rx * 0.3, fsy + ry * 0.2, rx * 0.25, ry * 0.15);
    // Farmer dot bending down (bob)
    fill(200, 180, 130, 120);
    let fby = sin(frameCount * 0.08) * 1.5;
    rect(floor(fsx + rx * 0.3), floor(fsy + ry * 0.2 + fby), 2, 2);
    if (nation.level >= 4) {
      ellipse(fsx - rx * 0.35, fsy + ry * 0.15, rx * 0.2, ry * 0.12);
      rect(floor(fsx - rx * 0.35), floor(fsy + ry * 0.15 + fby), 2, 2);
    }
  }
  pop();
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
function isOnVulcanIsland(wx, wy) { let v = state.vulcan; let ex = (wx - v.isleX) / (v.isleRX - 20); let ey = (wy - v.isleY) / (v.isleRY - 20); return ex * ex + ey * ey < 1; }
function enterVulcan() { console.warn('enterVulcan deprecated -- openworld mode'); }
function exitVulcan() { console.warn('exitVulcan deprecated -- openworld mode'); }
function updateVulcanIsland(dt) {
  let v = state.vulcan, p = state.player;
  if (v.active) { let dx = 0, dy = 0;
  if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) dx -= 1; if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) dx += 1;
  if (keyIsDown(87) || keyIsDown(UP_ARROW)) dy -= 1; if (keyIsDown(83) || keyIsDown(DOWN_ARROW)) dy += 1;
  if (dx || dy) { let m = sqrt(dx * dx + dy * dy); p.vx = (dx / m) * p.speed * dt; p.vy = (dy / m) * p.speed * dt; p.moving = true; if (abs(dx) > abs(dy)) p.facing = dx > 0 ? 'right' : 'left'; else p.facing = dy > 0 ? 'down' : 'up'; } else { p.vx = 0; p.vy = 0; p.moving = false; }
  p.x += p.vx; p.y += p.vy; if (!isOnVulcanIsland(p.x, p.y)) { p.x -= p.vx; p.y -= p.vy; } }
  for (let hs of v.hotSprings) { if (dist(p.x, p.y, hs.x, hs.y) < 30) { hs.healTimer += dt; if (hs.healTimer > 60) { hs.healTimer = 0; if (p.hp < p.maxHp) { p.hp = min(p.hp + 5, p.maxHp); addFloatingText(w2sX(p.x), w2sY(p.y) - 20, '+5 HP', '#44ff88'); } } } }
  for (let lp of v.lavaPools) { if (dist(p.x, p.y, lp.x, lp.y) < lp.r + 5 && p.invincTimer <= 0) { p.hp = Math.max(0, p.hp - 3); p.invincTimer = 30; shakeTimer = 5; addFloatingText(w2sX(p.x), w2sY(p.y) - 15, '-3', '#ff4422'); } }
  // invincTimer decremented in main loop
  if (frameCount % 3 === 0) v.ambientAsh.push({ x: v.isleX + random(-v.isleRX, v.isleRX), y: v.isleY - v.isleRY, vy: random(0.3, 0.8), vx: random(-0.2, 0.2), life: 180, size: random(1, 3) });
  v.ambientAsh.forEach(a => { a.x += a.vx; a.y += a.vy; a.life -= dt; }); v.ambientAsh = v.ambientAsh.filter(a => a.life > 0);
  // openworld: no teleport exit, player walks off naturally
}
function drawVulcanIsland() {
  let v = state.vulcan, ix = w2sX(v.isleX), iy = w2sY(v.isleY);
  let isActive = v.active || _isExplorationActive('vulcan');
  let _dScale = null;
  // Clamp to horizon when viewed from boat
  if (!isActive) {
    let horizMinY = max(height * 0.06, height * 0.25 - (typeof horizonOffset !== 'undefined' ? horizonOffset : 0)) + 10;
    iy = max(iy, horizMinY);
    _dScale = _getDistantScale(v.isleX, v.isleY, v.isleRX);
    if (_dScale.dist > _getMaxViewDist()) return; // too far to see
  }
  if (ix < -500 || ix > width + 500 || iy < -500 || iy > height + 500) return;
  push(); noStroke();
  // Apply distance-based scaling when sailing
  if (_dScale && _dScale.scale < 0.98) {
    translate(ix, iy); scale(_dScale.scale); translate(-ix, -iy);
  }
  let vt = frameCount * 0.01;
  // Deep lava-lit ocean shadow
  fill(15, 5, 2, 55); ellipse(ix + 5, iy + 8, v.isleRX * 2.2, v.isleRY * 2.2);
  // Heated water glow around island
  let heatPulse = sin(vt * 3) * 0.15 + 0.85;
  fill(120, 30, 5, 20 * heatPulse); ellipse(ix, iy, v.isleRX * 2.15, v.isleRY * 2.15);
  // Outer volcanic rim — dark basalt
  fill(45, 38, 30); ellipse(ix, iy, v.isleRX * 2, v.isleRY * 2);
  // Scorched earth bands — using scanline fill for crunchy look
  for (let row = -v.isleRY; row < v.isleRY; row += 2) {
    let t = row / v.isleRY;
    let w2 = v.isleRX * sqrt(max(0, 1 - t * t));
    let wobble = sin(row * 0.08 + 1.2) * 3;
    // Gradient from dark obsidian (outer) to ashen grey (inner)
    let band = abs(t);
    let r = lerp(38, 52, 1 - band);
    let g = lerp(30, 42, 1 - band);
    let b = lerp(22, 35, 1 - band);
    fill(r, g, b);
    rect(floor(ix - w2 + wobble), floor(iy + row), floor(w2 * 2), 2);
  }
  // Lava veins running through terrain
  for (let lv = 0; lv < 8; lv++) {
    let la = (lv / 8) * TWO_PI + lv * 0.6;
    let lr = v.isleRX * (0.3 + (lv % 3) * 0.15);
    let lx1 = ix + cos(la) * lr * 0.3;
    let ly1 = iy + sin(la) * lr * 0.3 * 0.69;
    let lx2 = ix + cos(la) * lr;
    let ly2 = iy + sin(la) * lr * 0.69;
    let lvGlow = sin(vt * 4 + lv * 1.5) * 0.3 + 0.7;
    fill(200, 60, 10, 50 * lvGlow);
    for (let seg = 0; seg < 6; seg++) {
      let st = seg / 6;
      let segX = lerp(lx1, lx2, st) + sin(seg * 1.3 + la) * 3;
      let segY = lerp(ly1, ly2, st) + cos(seg * 1.1 + la) * 2;
      rect(floor(segX), floor(segY), 3, 2);
    }
  }
  // Volcanic rock texture — jagged scattered stones
  for (let i = 0; i < 20; i++) {
    let ra = (i * 2.39996) % TWO_PI;
    let rr = ((i * 23 + 5) % 80) / 100 * 0.7;
    let rpx = ix + cos(ra) * v.isleRX * rr;
    let rpy = iy + sin(ra) * v.isleRY * rr * 0.69;
    if (i % 3 === 0) { fill(25, 20, 15, 100); rect(floor(rpx), floor(rpy), 6, 4); fill(35, 28, 22, 80); rect(floor(rpx + 1), floor(rpy), 4, 2); }
    else if (i % 3 === 1) { fill(60, 48, 35, 70); rect(floor(rpx), floor(rpy), 4, 3); }
    else { fill(20, 15, 12, 90); rect(floor(rpx), floor(rpy), 8, 2); }
  }
  // Dark sand beach ring at outer edge
  for (let bb = 0; bb < 10; bb++) {
    let ba = (bb / 10) * TWO_PI + 0.5;
    let br = 0.92;
    let bpx = ix + cos(ba) * v.isleRX * br;
    let bpy = iy + sin(ba) * v.isleRY * br * 0.69;
    fill(30, 25, 18, 80); rect(floor(bpx - 4), floor(bpy), 8, 3);
    fill(38, 32, 22, 50); rect(floor(bpx - 2), floor(bpy + 1), 5, 2);
  }
  // Charred dead trees scattered around outer rim
  let deadTreeSpots = [[-0.55, 0.3], [0.6, 0.2], [-0.4, -0.35], [0.5, -0.3], [-0.65, -0.1], [0.65, 0.35], [-0.3, 0.5]];
  for (let dt of deadTreeSpots) {
    let dtx = ix + dt[0] * v.isleRX * 0.75;
    let dty = iy + dt[1] * v.isleRY * 0.55;
    // Blackened trunk
    fill(22, 18, 12); rect(floor(dtx - 1), floor(dty - 14), 3, 14);
    // Charred branches
    fill(28, 22, 15); rect(floor(dtx - 4), floor(dty - 12), 3, 1);
    rect(floor(dtx + 2), floor(dty - 10), 4, 1);
    // Ember glow at base
    let eg = sin(vt * 3 + dt[0] * 5) * 0.3 + 0.4;
    fill(200, 60, 10, 20 * eg); rect(floor(dtx - 2), floor(dty - 1), 5, 2);
  }
  // Central volcano cone — layered
  fill(48, 40, 32); ellipse(ix, iy - 8, 130, 90);
  fill(55, 45, 36); ellipse(ix, iy - 12, 100, 68);
  fill(62, 52, 42); ellipse(ix, iy - 16, 72, 50);
  // Crater rim
  fill(45, 35, 28); ellipse(ix, iy - 18, 48, 32);
  // Crater interior — glowing
  fill(30, 20, 14); ellipse(ix, iy - 18, 36, 24);
  let glow = sin(vt * 4) * 0.3 + 0.7;
  fill(255, 70, 15, 70 * glow); ellipse(ix, iy - 18, 28, 18);
  fill(255, 130, 35, 50 * glow); ellipse(ix, iy - 18, 44, 30);
  fill(255, 200, 60, 25 * glow); ellipse(ix, iy - 18, 56, 38);
  // Lava pools
  if (isActive || dist(ix, iy, width / 2, height / 2) < 600) {
    for (let lp of v.lavaPools) {
      let lx = w2sX(lp.x), ly = w2sY(lp.y);
      let pulse = sin(frameCount * 0.06 + lp.phase) * 0.2 + 0.8;
      // Dark crust rim
      fill(35, 22, 10, 140); ellipse(lx, ly, lp.r * 2.3, lp.r * 1.6);
      // Molten lava layers
      fill(160, 40, 8, 130 * pulse); ellipse(lx, ly, lp.r * 2, lp.r * 1.4);
      fill(230, 100, 20, 90 * pulse); ellipse(lx, ly, lp.r * 1.4, lp.r);
      fill(255, 180, 50, 60 * pulse); ellipse(lx, ly, lp.r * 0.8, lp.r * 0.5);
      // Bright hotspot
      fill(255, 240, 120, 30 * pulse); ellipse(lx - 2, ly - 1, lp.r * 0.4, lp.r * 0.3);
    }
  }
  // Night glow — lava lights up surrounding ocean
  let hr = state.time / 60;
  if (hr > 19 || hr < 5) {
    fill(255, 35, 8, 18 + sin(vt * 2) * 6); ellipse(ix, iy, v.isleRX * 2.4, v.isleRY * 2.4);
    fill(255, 80, 20, 8); ellipse(ix, iy, v.isleRX * 2.8, v.isleRY * 2.8);
  }
  // Forge altar at crater center
  let crackGlow = sin(frameCount * 0.07) * 0.5 + 0.5;
  let forged = state.narrativeFlags && state.narrativeFlags['forge_vulcan_blade'];
  // Stepped platform — basalt blocks
  fill(18, 15, 10); rect(ix - 16, iy - 30, 32, 12);
  fill(25, 20, 16); rect(ix - 13, iy - 32, 26, 4);
  fill(32, 26, 20); rect(ix - 12, iy - 40, 24, 10);
  fill(38, 30, 24); rect(ix - 10, iy - 42, 20, 4);
  // Anvil block — obsidian
  fill(22, 18, 14); rect(ix - 8, iy - 48, 16, 8);
  fill(38, 32, 26); rect(ix - 6, iy - 47, 12, 5);
  fill(48, 40, 32); rect(ix - 5, iy - 46, 10, 2);
  // Glowing cracks in platform
  fill(255, forged ? 200 : 70, 0, floor(70 + crackGlow * 130));
  rect(ix - 12, iy - 33, 4, 1); rect(ix - 4, iy - 33, 8, 1); rect(ix + 8, iy - 33, 3, 1);
  rect(ix - 9, iy - 31, 3, 1); rect(ix + 1, iy - 31, 6, 1);
  rect(ix - 6, iy - 29, 5, 1); rect(ix + 4, iy - 29, 4, 1);
  // Forge glow halo
  fill(255, forged ? 170 : 50, 0, floor(35 * crackGlow));
  ellipse(ix, iy - 38, 42, 26);
  if (forged) { fill(255, 200, 80, floor(15 * crackGlow)); ellipse(ix, iy - 38, 60, 36); }
  // Distant dock indicator
  if (!isActive) {
    noStroke();
    fill(140, 120, 90);
    rect(ix - 3, iy + v.isleRY * 0.4, 6, 12); // pier
    fill(160, 140, 105);
    rect(ix - 5, iy + v.isleRY * 0.4, 10, 3); // pier top
  }
  // Atmospheric haze overlay when distant
  if (_dScale && _dScale.haze > 5) {
    // Reset transform so haze covers the scaled island properly
    resetMatrix();
    let bright = (typeof getSkyBrightness === 'function') ? getSkyBrightness() : 0.7;
    fill(140 + 30 * bright, 165 + 20 * bright, 195 + 10 * bright, floor(_dScale.haze * 0.6));
    noStroke();
    let hIx = w2sX(v.isleX), hIy = w2sY(v.isleY);
    let horizMinY2 = max(height * 0.06, height * 0.25 - (typeof horizonOffset !== 'undefined' ? horizonOffset : 0)) + 10;
    hIy = max(hIy, horizMinY2);
    let hRad = max(v.isleRX, v.isleRY) * 2.5 * _dScale.scale;
    ellipse(hIx, hIy, hRad, hRad * 0.7);
  }
  pop();
}
function drawVulcanEntities() {
  let v = state.vulcan; if (!v.active && !_isExplorationActive('vulcan')) return; let p = state.player; noStroke();
  // Forge altar [E] prompt when in range with materials
  let dForge = dist(p.x, p.y, v.isleX, v.isleY);
  if (dForge < 60 && !(state.narrativeFlags && state.narrativeFlags['forge_vulcan_blade'])) {
    let hasMats = (state.ironOre || 0) >= 10 && (state.titanBone || 0) >= 5;
    let altarSX = w2sX(v.isleX), altarSY = w2sY(v.isleY);
    fill(hasMats ? 255 : 180, hasMats ? 200 : 120, 80, 200);
    textAlign(CENTER); textSize(10);
    text(hasMats ? '[E] Forge Blade of Vulcan' : '[E] Forge (10 iron + 5 titan bone)', altarSX, altarSY - 52);
    textAlign(LEFT);
  }
  for (let hs of v.hotSprings) { let hx = w2sX(hs.x), hy = w2sY(hs.y); fill(40, 140, 120, 150); ellipse(hx, hy, 40, 28); fill(60, 180, 150, 100); ellipse(hx, hy, 28, 18); fill(200, 220, 220, 30 + sin(frameCount * 0.08 + hs.healTimer) * 15); for (let s = 0; s < 3; s++) { let sy = hy - 10 - s * 8 - (frameCount * 0.3 + s * 20) % 25, sx = hx + sin(frameCount * 0.05 + s) * 5; ellipse(sx, sy, 10 + s * 3, 6 + s * 2); } }
  for (let n of v.obsidianNodes) { if (n.collected) continue; let nx = w2sX(n.x), ny = w2sY(n.y); fill(15, 12, 20); rect(floor(nx) - 5, floor(ny) - 8, 10, 12); fill(30, 25, 40); rect(floor(nx) - 3, floor(ny) - 6, 6, 8); fill(80, 70, 120, 150); rect(floor(nx) - 1, floor(ny) - 5, 2, 3); if (dist(p.x, p.y, n.x, n.y) < 30) { fill(255, 200, 150, 180); textAlign(CENTER); textSize(10); text('[E] Mine Obsidian', nx, ny - 14); } }
  for (let sv of v.smokeVents) { let sx = w2sX(sv.x), sy = w2sY(sv.y); for (let s = 0; s < 4; s++) { let t = (frameCount * 0.5 + sv.phase * 60 + s * 15) % 60, al = max(0, 40 - t); fill(100, 90, 80, al); ellipse(sx + sin(t * 0.1 + sv.phase) * 4, sy - t * 0.6, 8 + t * 0.3, 5 + t * 0.2); } }
  for (let a of v.ambientAsh) { let al = min(100, a.life); fill(120, 100, 80, al); rect(floor(w2sX(a.x)), floor(w2sY(a.y)), floor(a.size), floor(a.size)); }
  // Volcano Heart — subtle glowing crack in the ground (no label)
  let vhX = w2sX(v.isleX - v.isleRX * 0.28), vhY = w2sY(v.isleY - v.isleRY * 0.35);
  let vhFound = state.narrativeFlags && state.narrativeFlags['secret_volcano_heart'];
  let vhPulse = sin(frameCount * 0.03) * 0.4 + 0.6;
  if (vhFound) {
    fill(255, 140, 40, floor(30 * vhPulse)); ellipse(vhX, vhY, 16, 10);
    fill(255, 200, 80, floor(15 * vhPulse)); ellipse(vhX, vhY, 8, 5);
  } else {
    // Very subtle crack — easy to walk past
    fill(180, 50, 10, floor(18 * vhPulse)); rect(floor(vhX) - 3, floor(vhY), 6, 1);
    fill(200, 70, 15, floor(12 * vhPulse)); rect(floor(vhX) - 1, floor(vhY) - 1, 2, 3);
  }
  drawPlayer();
  let dockX = w2sX(v.isleX), dockY = w2sY(v.isleY + v.isleRY * 0.82); fill(120, 80, 40); rect(floor(dockX) - 15, floor(dockY), 30, 6); fill(100, 65, 30); rect(floor(dockX) - 12, floor(dockY) + 1, 24, 4);
}
function drawVulcanDistantLabel() {
  if (state.vulcan.active) return; let v = state.vulcan, sx = w2sX(v.isleX), sy = w2sY(v.isleY);
  let minY = max(height * 0.06, height * 0.25 - horizonOffset) + 10; sy = max(sy, minY);
  if (sx < -400 || sx > width + 400 || sy < -400 || sy > height + 400) return;
  let _ds = _getDistantScale(v.isleX, v.isleY, v.isleRX);
  if (_ds.dist > _getMaxViewDist()) return;
  let _labelFade = constrain(1 - _ds.haze / 200, 0.15, 1);
  let baseY = sy + v.isleRY * _ds.scale + 12;
  push(); noStroke(); textAlign(CENTER);
  // Flame icon
  fill(255, 120, 40, floor((180 + sin(frameCount * 0.05) * 40) * _labelFade)); textSize(max(9, floor(14 * _ds.scale)));
  text('\u2740', sx, baseY - 2);
  // Name
  fill(255, 100, 60, floor(180 * _labelFade)); textSize(max(8, floor(11 * _ds.scale))); textStyle(ITALIC);
  text('Isle of Vulcan', sx, baseY + 12 * _ds.scale); textStyle(NORMAL);
  // Status + danger
  let status = v.phase === 'unexplored' ? 'Unexplored' : v.phase === 'forged' ? 'Conquered' : 'Discovered';
  let dangerIcon = '\u2620 '; // skull
  fill(220, 80, 50, floor(160 * _labelFade)); textSize(max(7, floor(9 * _ds.scale)));
  text(dangerIcon + status, sx, baseY + 24 * _ds.scale);
  // Distance
  let d = _getIslandDist(v.isleX, v.isleY);
  fill(200, 170, 130, floor(120 * _labelFade)); textSize(max(7, floor(8 * _ds.scale)));
  text(d, sx, baseY + 34 * _ds.scale);
  pop();
}
function drawVulcanHUD() {
  if (!state.vulcan.active && !_isExplorationActive('vulcan')) return; push(); fill(20, 16, 12, 220); noStroke(); rect(8, 8, 160, 50, 4); fill(255, 100, 50); textSize(10); textAlign(LEFT); text('ISLE OF VULCAN', 16, 24); fill(200, 180, 150); textSize(11); text('HP: ' + state.player.hp + '/' + state.player.maxHp, 16, 38); fill(80, 60, 120); text('Obsidian: ' + state.obsidian, 16, 50); fill(180, 160, 120, 150); textSize(10); textAlign(CENTER); text('Walk south to dock', width / 2, height - 20); pop();
}

// ======================================================================
// === HYPERBOREA — Frozen Island (Far North) ==========================
// ======================================================================
function isOnHyperboreIsland(wx, wy) { let h = state.hyperborea; let ex = (wx - h.isleX) / (h.isleRX - 20); let ey = (wy - h.isleY) / (h.isleRY - 20); return ex * ex + ey * ey < 1; }
function enterHyperborea() { console.warn('enterHyperborea deprecated -- openworld mode'); }
function exitHyperborea() { console.warn('exitHyperborea deprecated -- openworld mode'); }
function updateHyperboreIsland(dt) {
  let h = state.hyperborea, p = state.player;
  if (h.active) { let dx = 0, dy = 0;
  if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) dx -= 1; if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) dx += 1;
  if (keyIsDown(87) || keyIsDown(UP_ARROW)) dy -= 1; if (keyIsDown(83) || keyIsDown(DOWN_ARROW)) dy += 1;
  if (dx || dy) { let m = sqrt(dx * dx + dy * dy); p.vx = (dx / m) * p.speed * 0.85 * dt; p.vy = (dy / m) * p.speed * 0.85 * dt; p.moving = true; if (abs(dx) > abs(dy)) p.facing = dx > 0 ? 'right' : 'left'; else p.facing = dy > 0 ? 'down' : 'up'; } else { p.vx = 0; p.vy = 0; p.moving = false; }
  p.x += p.vx; p.y += p.vy; if (!isOnHyperboreIsland(p.x, p.y)) { p.x -= p.vx; p.y -= p.vy; } }
  for (let pg of h.penguins) { pg.timer -= dt; if (pg.timer <= 0) { if (pg.state === 'idle') { pg.state = 'waddle'; let a = random(TWO_PI); pg.vx = cos(a) * 0.4; pg.vy = sin(a) * 0.4; pg.timer = random(60, 120); } else { pg.state = 'idle'; pg.vx = 0; pg.vy = 0; pg.timer = random(90, 200); } } pg.x += pg.vx * dt; pg.y += pg.vy * dt; if (!isOnHyperboreIsland(pg.x, pg.y)) { pg.vx *= -1; pg.vy *= -1; pg.x += pg.vx * 2; pg.y += pg.vy * 2; } }
  if (frameCount % 2 === 0) h.snowflakes.push({ x: h.isleX + random(-h.isleRX * 1.2, h.isleRX * 1.2), y: h.isleY - h.isleRY * 1.1, vy: random(0.4, 1.0), vx: random(-0.3, 0.1), life: 240, size: random(1, 3) });
  h.snowflakes.forEach(s => { s.x += s.vx; s.y += s.vy; s.life -= dt; }); h.snowflakes = h.snowflakes.filter(s => s.life > 0);
  let hr = state.time / 60; if (hr > 19 || hr < 5) { h.auroraBorealis = min(1, h.auroraBorealis + 0.005 * dt); } else { h.auroraBorealis = max(0, h.auroraBorealis - 0.01 * dt); }
  // openworld: no teleport exit, player walks off naturally
}
function drawHyperboreIsland() {
  let h = state.hyperborea, ix = w2sX(h.isleX), iy = w2sY(h.isleY);
  let isActive = h.active || _isExplorationActive('hyperborea');
  let _dScale = null;
  // Clamp to horizon when viewed from boat
  if (!isActive) {
    let horizMinY = max(height * 0.06, height * 0.25 - (typeof horizonOffset !== 'undefined' ? horizonOffset : 0)) + 10;
    iy = max(iy, horizMinY);
    _dScale = _getDistantScale(h.isleX, h.isleY, h.isleRX);
    if (_dScale.dist > _getMaxViewDist()) return;
  }
  if (ix < -500 || ix > width + 500 || iy < -500 || iy > height + 500) return;
  push(); noStroke();
  if (_dScale && _dScale.scale < 0.98) {
    translate(ix, iy); scale(_dScale.scale); translate(-ix, -iy);
  }
  let ht = frameCount * 0.01;
  // Icy water shadow
  fill(15, 30, 55, 50); ellipse(ix + 4, iy + 7, h.isleRX * 2.18, h.isleRY * 2.18);
  // Frozen sea rim — ice shelf edges
  fill(140, 180, 210, 60); ellipse(ix, iy, h.isleRX * 2.12, h.isleRY * 2.12);
  // Snow terrain — scanline rendering for crisp pixel look
  for (let row = -h.isleRY; row < h.isleRY; row += 2) {
    let t = row / h.isleRY;
    let w2 = h.isleRX * sqrt(max(0, 1 - t * t));
    let wobble = sin(row * 0.07 + 0.9) * 3 + sin(row * 0.15 + 2.5) * 1.5;
    // Snow gradient — bluish at edges, bright white center
    let band = abs(t);
    let edgeFade = max(0, band - 0.6) * 2.5;
    let r = lerp(240, 175, edgeFade);
    let g = lerp(248, 210, edgeFade);
    let b = lerp(255, 235, edgeFade);
    fill(r, g, b);
    rect(floor(ix - w2 + wobble), floor(iy + row), floor(w2 * 2), 2);
  }
  // Ice cracks across surface
  for (let cr = 0; cr < 6; cr++) {
    let ca = (cr / 6) * TWO_PI + cr * 0.8;
    let cLen = h.isleRX * (0.2 + (cr % 3) * 0.12);
    fill(160, 200, 230, 50);
    for (let seg = 0; seg < 5; seg++) {
      let st = seg / 5;
      let crx = ix + cos(ca) * cLen * st + sin(seg * 1.5 + ca) * 2;
      let cry = iy + sin(ca) * cLen * st * 0.69 + cos(seg * 1.2) * 1;
      rect(floor(crx), floor(cry), 3, 1);
    }
  }
  // Snow drifts texture
  for (let i = 0; i < 12; i++) {
    let sa = (i * 2.39996) % TWO_PI;
    let sr = ((i * 19 + 3) % 70) / 100 * 0.65;
    let spx = ix + cos(sa) * h.isleRX * sr;
    let spy = iy + sin(sa) * h.isleRY * sr * 0.69;
    fill(248, 252, 255, 60);
    rect(floor(spx), floor(spy), 8, 2);
    fill(230, 242, 252, 40);
    rect(floor(spx + 2), floor(spy + 2), 6, 2);
  }
  // Glacier / ice mountain — layered angular shape
  fill(185, 215, 235); ellipse(ix - 18, iy - 12, 90, 62);
  fill(200, 225, 242); ellipse(ix - 18, iy - 18, 65, 45);
  // Ice peak highlights
  fill(230, 242, 252); ellipse(ix - 18, iy - 24, 40, 28);
  fill(245, 250, 255); ellipse(ix - 18, iy - 28, 22, 16);
  // Ice facets — angular pixel highlights
  fill(200, 230, 248, 80);
  rect(floor(ix - 35), floor(iy - 16), 6, 2);
  rect(floor(ix - 28), floor(iy - 22), 4, 2);
  fill(170, 205, 230, 60);
  rect(floor(ix - 8), floor(iy - 18), 4, 6);
  // Frozen boulders scattered
  let iceRocks = [[-0.5, 0.3], [0.4, 0.2], [-0.3, -0.4], [0.6, -0.2], [0.2, 0.5]];
  for (let ir of iceRocks) {
    let irx = ix + ir[0] * h.isleRX * 0.7;
    let iry = iy + ir[1] * h.isleRY * 0.5;
    fill(170, 195, 215); rect(floor(irx - 4), floor(iry - 2), 8, 6);
    fill(195, 215, 232); rect(floor(irx - 3), floor(iry - 3), 6, 4);
    fill(220, 235, 248, 80); rect(floor(irx - 2), floor(iry - 3), 3, 2);
  }
  // Frozen lake — southeast of center
  let lkx = ix + h.isleRX * 0.25, lky = iy + h.isleRY * 0.2;
  fill(140, 185, 215, 100); ellipse(lkx, lky, 55, 30);
  fill(170, 210, 235, 80); ellipse(lkx, lky, 40, 20);
  // Ice surface shimmer
  let iceShim = sin(ht * 3) * 0.3 + 0.7;
  fill(220, 240, 255, 30 * iceShim); ellipse(lkx - 5, lky - 3, 20, 10);
  fill(200, 225, 245, 20); rect(floor(lkx - 12), floor(lky - 1), 8, 1);
  rect(floor(lkx + 4), floor(lky + 2), 6, 1);
  // Snow-capped hill — northeast
  fill(200, 218, 235); ellipse(ix + 30, iy - 6, 60, 40);
  fill(220, 235, 248); ellipse(ix + 30, iy - 12, 40, 26);
  fill(242, 248, 255); ellipse(ix + 30, iy - 16, 24, 16);
  // Ice crystal formations — scattered spires
  let crystalSpots = [[0.35, -0.3], [-0.45, 0.15], [0.55, 0.1], [-0.2, -0.5]];
  for (let cs of crystalSpots) {
    let cx = ix + cs[0] * h.isleRX * 0.6;
    let cy = iy + cs[1] * h.isleRY * 0.45;
    let cShim = sin(ht * 4 + cs[0] * 8) * 0.3 + 0.7;
    fill(140, 210, 255, 120 * cShim);
    triangle(cx, cy - 10, cx - 3, cy + 2, cx + 3, cy + 2);
    fill(180, 230, 255, 80 * cShim);
    triangle(cx + 3, cy - 7, cx + 1, cy + 1, cx + 5, cy + 1);
    fill(100, 180, 240, 25 * cShim); ellipse(cx, cy, 14, 8);
  }
  // Aurora borealis — improved with flowing curtains
  if (h.auroraBorealis > 0) {
    let a = h.auroraBorealis;
    for (let i = 0; i < 7; i++) {
      let wave = sin(frameCount * 0.012 + i * 0.7) * 50;
      let wave2 = sin(frameCount * 0.008 + i * 1.2) * 20;
      let cols = [[50, 255, 140], [80, 200, 255], [100, 255, 180], [60, 180, 255], [90, 255, 160], [70, 220, 255], [110, 240, 180]];
      let col = cols[i];
      let al = (10 + sin(frameCount * 0.02 + i * 0.5) * 4) * a;
      fill(col[0], col[1], col[2], al);
      let ax = ix + wave + (i - 3) * 45 + wave2;
      let ay = iy - h.isleRY * 0.85 - i * 12;
      rect(floor(ax - 50), floor(ay), 100, 2);
      fill(col[0], col[1], col[2], al * 0.5);
      rect(floor(ax - 40), floor(ay + 4), 80, 2);
      rect(floor(ax - 30), floor(ay - 4), 60, 2);
    }
  }
  // Distant dock indicator
  if (!isActive) {
    noStroke();
    fill(140, 120, 90);
    rect(ix - 3, iy + h.isleRY * 0.4, 6, 12); // pier
    fill(160, 140, 105);
    rect(ix - 5, iy + h.isleRY * 0.4, 10, 3); // pier top
  }
  if (_dScale && _dScale.haze > 5) {
    resetMatrix();
    let bright = (typeof getSkyBrightness === 'function') ? getSkyBrightness() : 0.7;
    fill(140 + 30 * bright, 165 + 20 * bright, 195 + 10 * bright, floor(_dScale.haze * 0.6));
    noStroke();
    let hIx = w2sX(h.isleX), hIy = w2sY(h.isleY);
    let horizMinY2 = max(height * 0.06, height * 0.25 - (typeof horizonOffset !== 'undefined' ? horizonOffset : 0)) + 10;
    hIy = max(hIy, horizMinY2);
    let hRad = max(h.isleRX, h.isleRY) * 2.5 * _dScale.scale;
    ellipse(hIx, hIy, hRad, hRad * 0.7);
  }
  pop();
}
function drawHyperboreEntities() {
  let h = state.hyperborea; if (!h.active && !_isExplorationActive('hyperborea')) return; let p = state.player; noStroke();
  for (let r of h.frozenRuins) { let rx = w2sX(r.x), ry = w2sY(r.y); fill(r.looted ? 120 : 160, r.looted ? 130 : 165, r.looted ? 140 : 180); rect(floor(rx) - 12, floor(ry) - 8, 24, 14); fill(180, 220, 245, 120); rect(floor(rx) - 10, floor(ry) - 10, 20, 4); fill(170, 180, 195); rect(floor(rx) - 10, floor(ry) - 16, 3, 10); rect(floor(rx) + 7, floor(ry) - 16, 3, 10); if (!r.looted && dist(p.x, p.y, r.x, r.y) < 35) { fill(200, 230, 255, 180); textAlign(CENTER); textSize(10); text('[E] Search Ruins', rx, ry - 22); } }
  for (let n of h.frostNodes) { if (n.collected) continue; let nx = w2sX(n.x), ny = w2sY(n.y); let shimmer = sin(frameCount * 0.08 + n.x * 0.1) * 30; fill(120, 200, 255, 200); triangle(nx, ny - 12, nx - 5, ny + 4, nx + 5, ny + 4); fill(160, 230, 255, 150 + shimmer); triangle(nx + 1, ny - 8, nx - 3, ny + 2, nx + 4, ny + 2); fill(140, 220, 255, 30 + shimmer * 0.3); ellipse(nx, ny, 18, 18); if (dist(p.x, p.y, n.x, n.y) < 28) { fill(200, 240, 255, 180); textAlign(CENTER); textSize(10); text('[E] Harvest Frost Crystal', nx, ny - 18); } }
  for (let pg of h.penguins) { let px = w2sX(pg.x), py = w2sY(pg.y); let wobble = pg.state === 'waddle' ? sin(frameCount * 0.2) * 1 : 0; fill(20, 22, 30); rect(floor(px + wobble) - 4, floor(py) - 6, 8, 10); fill(230, 240, 250); rect(floor(px + wobble) - 2, floor(py) - 4, 4, 7); fill(20, 22, 30); rect(floor(px + wobble) - 3, floor(py) - 9, 6, 5); fill(255); rect(floor(px + wobble) - 2, floor(py) - 8, 1, 1); rect(floor(px + wobble) + 1, floor(py) - 8, 1, 1); fill(230, 160, 40); rect(floor(px + wobble) - 1, floor(py) - 7, 2, 1); }
  for (let s of h.snowflakes) { let al = min(180, s.life); fill(240, 248, 255, al); rect(floor(w2sX(s.x)), floor(w2sY(s.y)), floor(s.size), floor(s.size)); }
  // Frozen obelisk
  if (h.frozenObelisk) {
    let ox = w2sX(h.frozenObelisk.x), oy = w2sY(h.frozenObelisk.y);
    let ritualDone = state.narrativeFlags && state.narrativeFlags['learn_ritual'];
    let allLooted = h.frozenRuins.length >= 4 && h.frozenRuins.every(r => r.looted);
    let iceGlow = sin(frameCount * 0.05) * 0.4 + 0.6;
    // Shadow
    fill(0, 0, 0, 30); ellipse(ox, oy + 32, 22, 8);
    // Shaft
    fill(ritualDone ? 180 : 140, ritualDone ? 230 : 200, 255);
    rect(floor(ox) - 6, floor(oy) - 48, 12, 48);
    // Taper top
    fill(ritualDone ? 200 : 160, ritualDone ? 240 : 215, 255);
    triangle(ox, oy - 62, ox - 6, oy - 48, ox + 6, oy - 48);
    // Ice facets
    fill(200, 235, 255, 120);
    rect(floor(ox) - 4, floor(oy) - 46, 2, 42);
    rect(floor(ox) + 2, floor(oy) - 44, 1, 38);
    // Glow (stronger when all ruins looted and not yet done)
    if (allLooted && !ritualDone) {
      fill(120, 200, 255, floor(40 * iceGlow));
      ellipse(ox, oy - 24, 40 + iceGlow * 10, 80 + iceGlow * 20);
      if (dist(p.x, p.y, h.frozenObelisk.x, h.frozenObelisk.y) < 60) {
        fill(200, 240, 255, 180);
        textAlign(CENTER); textSize(10);
        text('[E] Study the Obelisk', ox, oy - 72);
        textAlign(LEFT);
      }
    } else if (!allLooted && !ritualDone && dist(p.x, p.y, h.frozenObelisk.x, h.frozenObelisk.y) < 40) {
      fill(160, 210, 255, 160);
      textAlign(CENTER); textSize(10);
      text('Search all frozen ruins first', ox, oy - 72);
      textAlign(LEFT);
    }
  }
  // Ice Mirror — subtle frozen pool behind glacier (no label, no prompt)
  let mirrorX = w2sX(h.isleX - h.isleRX * 0.55), mirrorY = w2sY(h.isleY - h.isleRY * 0.45);
  let mirrorFound = state.narrativeFlags && state.narrativeFlags['secret_ice_mirror'];
  let mirrorShimmer = sin(frameCount * 0.04) * 0.3 + 0.7;
  fill(mirrorFound ? 100 : 140, mirrorFound ? 160 : 210, 240, floor(40 * mirrorShimmer));
  ellipse(mirrorX, mirrorY, 18, 12);
  fill(200, 230, 255, floor(20 * mirrorShimmer));
  ellipse(mirrorX, mirrorY, 10, 6);
  // Barely visible ice reflection flicker
  if (frameCount % 90 < 8) { fill(255, 255, 255, 15); ellipse(mirrorX, mirrorY, 22, 14); }
  drawPlayer(); let dockX = w2sX(h.isleX), dockY = w2sY(h.isleY + h.isleRY * 0.82); fill(160, 175, 190); rect(floor(dockX) - 15, floor(dockY), 30, 6);
}
function drawHyperboreDistantLabel() {
  if (state.hyperborea.active) return; let h = state.hyperborea, sx = w2sX(h.isleX), sy = w2sY(h.isleY); let minY = max(height * 0.06, height * 0.25 - horizonOffset) + 10; sy = max(sy, minY);
  if (sx < -400 || sx > width + 400 || sy < -400 || sy > height + 400) return;
  let _ds = _getDistantScale(h.isleX, h.isleY, h.isleRX);
  if (_ds.dist > _getMaxViewDist()) return;
  let _labelFade = constrain(1 - _ds.haze / 200, 0.15, 1);
  let baseY = sy + h.isleRY * _ds.scale + 12;
  push(); noStroke(); textAlign(CENTER);
  // Snowflake icon
  fill(160, 220, 255, floor((180 + sin(frameCount * 0.05) * 40) * _labelFade)); textSize(max(9, floor(14 * _ds.scale)));
  text('\u2744', sx, baseY - 2);
  // Name
  fill(140, 200, 240, floor(180 * _labelFade)); textSize(max(8, floor(11 * _ds.scale))); textStyle(ITALIC);
  text('Hyperborea', sx, baseY + 12 * _ds.scale); textStyle(NORMAL);
  // Status + danger
  let status = h.phase === 'unexplored' ? 'Unexplored' : h.phase === 'settled' ? 'Settled' : 'Discovered';
  let dangerIcon = '\u2620 ';
  fill(140, 180, 220, floor(160 * _labelFade)); textSize(max(7, floor(9 * _ds.scale)));
  text(dangerIcon + status, sx, baseY + 24 * _ds.scale);
  // Distance
  let d = _getIslandDist(h.isleX, h.isleY);
  fill(160, 200, 220, floor(120 * _labelFade)); textSize(max(7, floor(8 * _ds.scale)));
  text(d, sx, baseY + 34 * _ds.scale);
  pop();
}
function drawHyperboreHUD() {
  if (!state.hyperborea.active && !_isExplorationActive('hyperborea')) return; push(); fill(20, 30, 45, 220); noStroke(); rect(8, 8, 160, 50, 4); fill(140, 200, 255); textSize(10); textAlign(LEFT); text('HYPERBOREA', 16, 24); fill(200, 220, 240); textSize(11); text('HP: ' + state.player.hp + '/' + state.player.maxHp, 16, 38); fill(120, 200, 255); text('Frost Crystals: ' + state.frostCrystal, 16, 50); fill(180, 210, 240, 150); textSize(10); textAlign(CENTER); text('Walk south to dock', width / 2, height - 20); pop();
}

// ======================================================================
// === ISLE OF PLENTY — Tropical Paradise (Southeast) ==================
// ======================================================================
function isOnPlentyIsland(wx, wy) { let pl = state.plenty; let ex = (wx - pl.isleX) / (pl.isleRX - 20); let ey = (wy - pl.isleY) / (pl.isleRY - 20); return ex * ex + ey * ey < 1; }
function enterPlenty() { console.warn('enterPlenty deprecated -- openworld mode'); }
function exitPlenty() { console.warn('exitPlenty deprecated -- openworld mode'); }
function updatePlentyIsland(dt) {
  let pl = state.plenty, p = state.player;
  if (pl.active) { let dx = 0, dy = 0;
  if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) dx -= 1; if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) dx += 1;
  if (keyIsDown(87) || keyIsDown(UP_ARROW)) dy -= 1; if (keyIsDown(83) || keyIsDown(DOWN_ARROW)) dy += 1;
  if (dx || dy) { let m = sqrt(dx * dx + dy * dy); p.vx = (dx / m) * p.speed * dt; p.vy = (dy / m) * p.speed * dt; p.moving = true; if (abs(dx) > abs(dy)) p.facing = dx > 0 ? 'right' : 'left'; else p.facing = dy > 0 ? 'down' : 'up'; } else { p.vx = 0; p.vy = 0; p.moving = false; }
  p.x += p.vx; p.y += p.vy; if (!isOnPlentyIsland(p.x, p.y)) { p.x -= p.vx; p.y -= p.vy; } }
  for (let pr of pl.parrots) { pr.x += pr.vx * dt; pr.y += pr.vy * dt; if (frameCount % 60 === 0) { pr.vx = random(-0.6, 0.6); pr.vy = random(-0.4, 0.4); } if (!isOnPlentyIsland(pr.x, pr.y)) { pr.vx *= -1; pr.vy *= -1; pr.x += pr.vx * 3; pr.y += pr.vy * 3; } }
  if (frameCount % 5 === 0) pl.fallingLeaves.push({ x: pl.isleX + random(-pl.isleRX * 0.8, pl.isleRX * 0.8), y: pl.isleY - pl.isleRY * 0.6, vy: random(0.2, 0.5), vx: random(-0.3, 0.3), life: 200, rot: random(TWO_PI), size: random(2, 4) });
  pl.fallingLeaves.forEach(l => { l.x += l.vx + sin(frameCount * 0.03 + l.rot) * 0.15; l.y += l.vy; l.life -= dt; l.rot += 0.02; }); pl.fallingLeaves = pl.fallingLeaves.filter(l => l.life > 0);
  for (let t of pl.fruitTrees) { if (!t.fruit && t.timer > 0) { t.timer -= dt; if (t.timer <= 0) t.fruit = true; } }
  // openworld: no teleport exit, player walks off naturally
}
function drawPlentyIsland() {
  let pl = state.plenty, ix = w2sX(pl.isleX), iy = w2sY(pl.isleY);
  let isActive = pl.active || _isExplorationActive('plenty');
  let _dScale = null;
  // Clamp to horizon when viewed from boat
  if (!isActive) {
    let horizMinY = max(height * 0.06, height * 0.25 - (typeof horizonOffset !== 'undefined' ? horizonOffset : 0)) + 10;
    iy = max(iy, horizMinY);
    _dScale = _getDistantScale(pl.isleX, pl.isleY, pl.isleRX);
    if (_dScale.dist > _getMaxViewDist()) return;
  }
  if (ix < -500 || ix > width + 500 || iy < -500 || iy > height + 500) return;
  push(); noStroke();
  if (_dScale && _dScale.scale < 0.98) {
    translate(ix, iy); scale(_dScale.scale); translate(-ix, -iy);
  }
  let pt = frameCount * 0.01;
  // Tropical lagoon shadow
  fill(8, 50, 35, 45); ellipse(ix + 4, iy + 7, pl.isleRX * 2.18, pl.isleRY * 2.18);
  // Turquoise lagoon ring
  fill(35, 170, 150, 65); ellipse(ix, iy, pl.isleRX * 2.14, pl.isleRY * 2.14);
  fill(50, 190, 170, 45); ellipse(ix, iy, pl.isleRX * 2.08, pl.isleRY * 2.08);
  // Sandy beach ring — scanline
  for (let row = -pl.isleRY; row < pl.isleRY; row += 2) {
    let t = row / pl.isleRY;
    let w2 = pl.isleRX * sqrt(max(0, 1 - t * t));
    let wobble = sin(row * 0.06 + 0.5) * 4 + sin(row * 0.14 + 1.8) * 2;
    // Beach band at edge, jungle interior
    let band = sqrt(max(0, 1 - t * t));
    let edgeDist = w2 / pl.isleRX;
    fill(235, 222, 192);
    rect(floor(ix - w2 + wobble), floor(iy + row), floor(w2 * 2), 2);
  }
  // Inner jungle canopy — lush green scanline fill
  for (let row = -pl.isleRY * 0.88; row < pl.isleRY * 0.88; row += 2) {
    let t = row / (pl.isleRY * 0.88);
    let w2 = pl.isleRX * 0.88 * sqrt(max(0, 1 - t * t));
    let wobble = sin(row * 0.07 + 2.2) * 3;
    let greenVar = sin(row * 0.12 + pt) * 8;
    fill(30 + greenVar, 125 + greenVar * 0.5, 45);
    rect(floor(ix - w2 + wobble), floor(iy + row), floor(w2 * 2), 2);
  }
  // Jungle texture — canopy patches with depth
  for (let i = 0; i < 18; i++) {
    let ja = (i * 2.39996) % TWO_PI;
    let jr = ((i * 13 + 7) % 75) / 100 * 0.7;
    let jpx = ix + cos(ja) * pl.isleRX * jr;
    let jpy = iy + sin(ja) * pl.isleRY * jr * 0.69;
    if (i % 4 === 0) { fill(40, 150, 58, 90); ellipse(jpx, jpy, 16, 10); fill(50, 165, 68, 60); ellipse(jpx - 2, jpy - 2, 10, 6); }
    else if (i % 4 === 1) { fill(25, 105, 38, 80); rect(floor(jpx), floor(jpy), 10, 6); }
    else if (i % 4 === 2) { fill(55, 160, 65, 70); ellipse(jpx, jpy, 12, 8); }
    else { fill(35, 135, 50, 100); rect(floor(jpx - 3), floor(jpy), 6, 4); fill(45, 155, 55, 60); rect(floor(jpx - 2), floor(jpy - 2), 4, 3); }
  }
  // Flower clusters in canopy — tropical bursts
  let flowerSpots = [[-0.3, -0.2], [0.4, -0.15], [-0.15, 0.25], [0.3, 0.3], [-0.5, 0.1], [0.5, -0.3]];
  for (let fs of flowerSpots) {
    let fpx = ix + fs[0] * pl.isleRX * 0.7;
    let fpy = iy + fs[1] * pl.isleRY * 0.5;
    let fPhase = sin(pt * 2 + fs[0] * 5);
    if (fPhase > 0) { fill(255, 180, 40, 120); rect(floor(fpx), floor(fpy), 3, 3); }
    else { fill(255, 80, 100, 100); rect(floor(fpx), floor(fpy), 2, 3); }
    fill(255, 220, 60, 60); rect(floor(fpx + 3), floor(fpy + 1), 2, 2);
  }
  // Central hill / ridge
  fill(28, 118, 42); ellipse(ix + 8, iy - 8, 110, 75);
  fill(35, 138, 52); ellipse(ix + 8, iy - 14, 78, 52);
  fill(45, 155, 62); ellipse(ix + 8, iy - 18, 50, 34);
  // Sunlit canopy highlight
  fill(60, 180, 70, 40); ellipse(ix - 5, iy - 16, 30, 20);
  // Waterfalls with mist
  for (let wf of (pl.waterfalls || [])) {
    let wx = w2sX(wf.x), wy = w2sY(wf.y);
    // Rock face behind waterfall
    fill(65, 55, 40); rect(floor(wx - 5), floor(wy - 4), 10, wf.h + 4);
    fill(80, 68, 50); rect(floor(wx - 4), floor(wy - 3), 8, wf.h + 2);
    // Animated water stream
    for (let wi = 0; wi < wf.h; wi += 2) {
      let shimmer = sin(pt * 12 + wi * 0.4) * 1.5;
      fill(90, 195, 215, 160 - wi);
      rect(floor(wx + shimmer) - 2, floor(wy) + wi, 4, 2);
      fill(140, 220, 235, 80 - wi * 0.5);
      rect(floor(wx + shimmer) - 3, floor(wy) + wi, 6, 2);
    }
    // Pool at base
    fill(70, 175, 195, 90); ellipse(wx, wy + wf.h + 4, 18, 8);
    fill(110, 205, 225, 50); ellipse(wx, wy + wf.h + 3, 12, 5);
    // Mist spray
    let mAlpha = 20 + sin(pt * 6) * 8;
    fill(200, 225, 240, mAlpha); ellipse(wx, wy + wf.h - 2, 22, 10);
  }
  // River/stream — winding from northwest hill to southeast shore
  for (let seg = 0; seg < 12; seg++) {
    let st = seg / 12;
    let rx = ix - pl.isleRX * 0.35 + st * pl.isleRX * 0.65;
    let ry = iy - pl.isleRY * 0.25 + st * pl.isleRY * 0.55;
    let bend = sin(st * 4 + 1.5) * 12;
    let shimmer = sin(pt * 8 + seg * 0.5) * 1;
    fill(60, 160, 185, 110); rect(floor(rx + bend + shimmer), floor(ry), 6, 5);
    fill(90, 190, 210, 70); rect(floor(rx + bend + shimmer + 1), floor(ry + 1), 4, 3);
  }
  // Tropical butterflies
  for (let bf = 0; bf < 4; bf++) {
    let bfa = (bf / 4) * TWO_PI + pt * 2;
    let bfr = pl.isleRX * 0.3;
    let bfx = ix + cos(bfa + bf) * bfr * 0.5;
    let bfy = iy + sin(bfa * 0.7 + bf) * bfr * 0.3;
    let wing = sin(frameCount * 0.15 + bf * 2) * 3;
    let bfCols = [[255, 200, 50], [255, 100, 150], [100, 200, 255], [255, 150, 50]];
    let bc = bfCols[bf];
    fill(bc[0], bc[1], bc[2], 140);
    rect(floor(bfx - abs(wing)), floor(bfy), max(1, floor(abs(wing))), 2);
    rect(floor(bfx + 1), floor(bfy), max(1, floor(abs(wing))), 2);
  }
  // Distant dock indicator
  if (!isActive) {
    noStroke();
    fill(140, 120, 90);
    rect(ix - 3, iy + pl.isleRY * 0.4, 6, 12); // pier
    fill(160, 140, 105);
    rect(ix - 5, iy + pl.isleRY * 0.4, 10, 3); // pier top
  }
  if (_dScale && _dScale.haze > 5) {
    resetMatrix();
    let bright = (typeof getSkyBrightness === 'function') ? getSkyBrightness() : 0.7;
    fill(140 + 30 * bright, 165 + 20 * bright, 195 + 10 * bright, floor(_dScale.haze * 0.6));
    noStroke();
    let hIx = w2sX(pl.isleX), hIy = w2sY(pl.isleY);
    let horizMinY2 = max(height * 0.06, height * 0.25 - (typeof horizonOffset !== 'undefined' ? horizonOffset : 0)) + 10;
    hIy = max(hIy, horizMinY2);
    let hRad = max(pl.isleRX, pl.isleRY) * 2.5 * _dScale.scale;
    ellipse(hIx, hIy, hRad, hRad * 0.7);
  }
  pop();
}
function drawPlentyEntities() {
  let pl = state.plenty; if (!pl.active && !_isExplorationActive('plenty')) return; let p = state.player; noStroke();
  for (let t of pl.fruitTrees) { let tx = w2sX(t.x), ty = w2sY(t.y); fill(90, 60, 30); rect(floor(tx) - 3, floor(ty) - 4, 6, 16); let sway = sin(frameCount * 0.02 + t.x * 0.01) * 2; fill(30, 140, 50); ellipse(tx + sway, ty - 12, 22, 18); fill(40, 160, 60, 180); ellipse(tx + sway - 3, ty - 14, 14, 12); if (t.fruit) { let fCol = t.type === 'mango' ? [255, 180, 40] : t.type === 'banana' ? [255, 230, 50] : t.type === 'coconut' ? [160, 120, 70] : [100, 50, 120]; fill(fCol[0], fCol[1], fCol[2]); rect(floor(tx + sway) - 2, floor(ty) - 8, 4, 4); rect(floor(tx + sway) + 4, floor(ty) - 10, 3, 3); } if (t.fruit && dist(p.x, p.y, t.x, t.y) < 28) { fill(200, 255, 200, 180); textAlign(CENTER); textSize(10); text('[E] Pick ' + t.type, tx, ty - 24); } }
  for (let n of pl.spiceNodes) { if (n.collected) continue; let nx = w2sX(n.x), ny = w2sY(n.y); fill(40, 100, 35); ellipse(nx, ny, 14, 10); fill(200, 50, 30); rect(floor(nx) - 2, floor(ny) - 3, 2, 2); rect(floor(nx) + 1, floor(ny) - 2, 2, 2); rect(floor(nx) - 1, floor(ny) - 5, 2, 2); if (dist(p.x, p.y, n.x, n.y) < 25) { fill(255, 220, 150, 180); textAlign(CENTER); textSize(10); text('[E] Gather Exotic Spices', nx, ny - 14); } }
  for (let pr of pl.parrots) { let px = w2sX(pr.x), py = w2sY(pr.y); let wing = sin(frameCount * 0.15 + pr.x) * 3; fill(pr.color); rect(floor(px) - 3, floor(py) - 2, 6, 4); rect(floor(px) - 5 - abs(wing), floor(py) - 1, 3, 2); rect(floor(px) + 3 + abs(wing), floor(py) - 1, 3, 2); rect(floor(px) - 2, floor(py) - 4, 4, 3); fill(0); rect(floor(px), floor(py) - 3, 1, 1); fill(255, 200, 50); rect(floor(px) + 2, floor(py) - 3, 2, 1); }
  for (let wf of pl.waterfalls) { let wx = w2sX(wf.x), wy = w2sY(wf.y); for (let i = 0; i < wf.h; i += 3) { let shimmer = sin(frameCount * 0.12 + i * 0.3) * 2; fill(120, 210, 230, 150); rect(floor(wx + shimmer) - 3, floor(wy) + i, 6, 3); } fill(80, 180, 200, 80); ellipse(wx, wy + wf.h + 5, 20, 10); }
  for (let l of pl.fallingLeaves) { let al = min(150, l.life); let cols = [[60, 140, 40], [80, 160, 50], [50, 120, 30]]; let c = cols[floor(l.rot * 10) % 3]; fill(c[0], c[1], c[2], al); push(); translate(w2sX(l.x), w2sY(l.y)); rotate(l.rot); rect(-floor(l.size / 2), -1, floor(l.size), 2); pop(); }
  drawPlayer(); let dockX = w2sX(pl.isleX), dockY = w2sY(pl.isleY + pl.isleRY * 0.82); fill(140, 100, 50); rect(floor(dockX) - 15, floor(dockY), 30, 6);
}
function drawPlentyDistantLabel() {
  if (state.plenty.active) return; let pl = state.plenty, sx = w2sX(pl.isleX), sy = w2sY(pl.isleY); let minY = max(height * 0.06, height * 0.25 - horizonOffset) + 10; sy = max(sy, minY);
  if (sx < -400 || sx > width + 400 || sy < -400 || sy > height + 400) return;
  let _ds = _getDistantScale(pl.isleX, pl.isleY, pl.isleRX);
  if (_ds.dist > _getMaxViewDist()) return;
  let _labelFade = constrain(1 - _ds.haze / 200, 0.15, 1);
  let baseY = sy + pl.isleRY * _ds.scale + 12;
  push(); noStroke(); textAlign(CENTER);
  // Leaf icon
  fill(80, 200, 80, floor((180 + sin(frameCount * 0.05) * 40) * _labelFade)); textSize(max(9, floor(14 * _ds.scale)));
  text('\u2618', sx, baseY - 2);
  // Name
  fill(60, 200, 80, floor(180 * _labelFade)); textSize(max(8, floor(11 * _ds.scale))); textStyle(ITALIC);
  text('Isle of Plenty', sx, baseY + 12 * _ds.scale); textStyle(NORMAL);
  // Status + peace
  let status = pl.phase === 'unexplored' ? 'Unexplored' : pl.phase === 'colonized' ? 'Colonized' : 'Discovered';
  let dangerIcon = '\u262E '; // peace sign
  fill(80, 180, 60, floor(160 * _labelFade)); textSize(max(7, floor(9 * _ds.scale)));
  text(dangerIcon + status, sx, baseY + 24 * _ds.scale);
  // Distance
  let d = _getIslandDist(pl.isleX, pl.isleY);
  fill(120, 180, 100, floor(120 * _labelFade)); textSize(max(7, floor(8 * _ds.scale)));
  text(d, sx, baseY + 34 * _ds.scale);
  pop();
}
function drawPlentyHUD() {
  if (!state.plenty.active && !_isExplorationActive('plenty')) return; push(); fill(15, 30, 12, 220); noStroke(); rect(8, 8, 160, 50, 4); fill(80, 220, 80); textSize(10); textAlign(LEFT); text('ISLE OF PLENTY', 16, 24); fill(200, 230, 180); textSize(11); text('HP: ' + state.player.hp + '/' + state.player.maxHp, 16, 38); fill(200, 160, 60); text('Exotic Spices: ' + state.exoticSpices, 16, 50); fill(150, 200, 120, 150); textSize(10); textAlign(CENTER); text('Walk south to dock', width / 2, height - 20); pop();
}

// ======================================================================
// === NECROPOLIS — Ancient Burial Island (Far Southwest) ==============
// ======================================================================
function isOnNecropolisIsland(wx, wy) { let n = state.necropolis; let ex = (wx - n.isleX) / (n.isleRX - 20); let ey = (wy - n.isleY) / (n.isleRY - 20); return ex * ex + ey * ey < 1; }
function enterNecropolis() { console.warn('enterNecropolis deprecated -- openworld mode'); }
function exitNecropolis() { console.warn('exitNecropolis deprecated -- openworld mode'); }
function updateNecropolisIsland(dt) {
  let n = state.necropolis, p = state.player;
  if (n.active) { let dx = 0, dy = 0;
  if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) dx -= 1; if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) dx += 1;
  if (keyIsDown(87) || keyIsDown(UP_ARROW)) dy -= 1; if (keyIsDown(83) || keyIsDown(DOWN_ARROW)) dy += 1;
  if (dx || dy) { let m = sqrt(dx * dx + dy * dy); p.vx = (dx / m) * p.speed * dt; p.vy = (dy / m) * p.speed * dt; p.moving = true; if (abs(dx) > abs(dy)) p.facing = dx > 0 ? 'right' : 'left'; else p.facing = dy > 0 ? 'down' : 'up'; } else { p.vx = 0; p.vy = 0; p.moving = false; }
  p.x += p.vx; p.y += p.vy; if (!isOnNecropolisIsland(p.x, p.y)) { p.x -= p.vx; p.y -= p.vy; } }
  // timers decremented in main loop
  for (let sk of n.skeletons) { if (sk.hp <= 0) continue; if (sk.flashTimer > 0) sk.flashTimer -= dt; let dToP = dist(sk.x, sk.y, p.x, p.y);
    if (dToP < 150) { let ang = atan2(p.y - sk.y, p.x - sk.x); sk.vx = cos(ang) * 1.2; sk.vy = sin(ang) * 1.2; sk.facing = sk.vx > 0 ? 1 : -1; if (dToP < 25 && sk.attackTimer <= 0) { sk.attackTimer = 60; if (p.invincTimer <= 0) { let dmg = 8 - ((typeof getPlayerDefenseReduction === 'function') ? getPlayerDefenseReduction() : (p.armor > 0 ? p.armor * 3 : 0)); p.hp = Math.max(0, p.hp - max(1, dmg)); p.invincTimer = 30; shakeTimer = 4; addFloatingText(w2sX(p.x), w2sY(p.y) - 15, '-' + max(1, dmg), '#ff4444'); } } }
    else { sk.patrolAngle += random(-0.05, 0.05); sk.vx = cos(sk.patrolAngle) * 0.3; sk.vy = sin(sk.patrolAngle) * 0.3; sk.facing = sk.vx > 0 ? 1 : -1; }
    sk.x += sk.vx * dt; sk.y += sk.vy * dt; if (!isOnNecropolisIsland(sk.x, sk.y)) { sk.patrolAngle += PI; sk.x -= sk.vx * dt * 2; sk.y -= sk.vy * dt * 2; }
    sk.attackTimer = max(0, sk.attackTimer - dt);
    if (p.slashPhase > 0 && dToP < p.attackRange && sk.flashTimer <= 0) { sk.hp -= p.attackDamage; sk.flashTimer = 10; addFloatingText(w2sX(sk.x), w2sY(sk.y) - 10, '-' + p.attackDamage, '#ffcc44'); if (sk.hp <= 0) { state.soulEssence += 1; addFloatingText(w2sX(sk.x), w2sY(sk.y) - 20, '+1 Soul Essence', '#cc88ff'); if (typeof snd !== 'undefined' && snd) snd.playSFX('skeleton_death'); } } }
  n.skeletons = n.skeletons.filter(s => s.hp > 0 || s.flashTimer > 0);
  if (frameCount % 4 === 0) n.wisps.push({ x: n.isleX + random(-n.isleRX * 0.7, n.isleRX * 0.7), y: n.isleY + random(-n.isleRY * 0.5, n.isleRY * 0.5), vx: random(-0.15, 0.15), vy: random(-0.4, -0.1), life: 150, size: random(2, 5) });
  n.wisps.forEach(w => { w.x += w.vx + sin(frameCount * 0.02 + w.x * 0.01) * 0.1; w.y += w.vy; w.life -= dt; }); n.wisps = n.wisps.filter(w => w.life > 0);
  n.darkAura = 0.3 + sin(frameCount * 0.01) * 0.1;
  // openworld: no teleport exit, player walks off naturally
}
function drawNecropolisIsland() {
  let n = state.necropolis, ix = w2sX(n.isleX), iy = w2sY(n.isleY);
  let isActive = n.active || _isExplorationActive('necropolis');
  let _dScale = null;
  // Clamp to horizon when viewed from boat
  if (!isActive) {
    let horizMinY = max(height * 0.06, height * 0.25 - (typeof horizonOffset !== 'undefined' ? horizonOffset : 0)) + 10;
    iy = max(iy, horizMinY);
    _dScale = _getDistantScale(n.isleX, n.isleY, n.isleRX);
    if (_dScale.dist > _getMaxViewDist()) return;
  }
  if (ix < -500 || ix > width + 500 || iy < -500 || iy > height + 500) return;
  push(); noStroke();
  if (_dScale && _dScale.scale < 0.98) {
    translate(ix, iy); scale(_dScale.scale); translate(-ix, -iy);
  }
  let nt = frameCount * 0.01;
  // Ghostly shadow — deeper, more ominous
  fill(8, 3, 18, 65); ellipse(ix + 5, iy + 8, n.isleRX * 2.22, n.isleRY * 2.22);
  // Spectral purple glow around island
  let ghostPulse = sin(nt * 2) * 0.2 + 0.8;
  fill(80, 40, 130, 18 * ghostPulse); ellipse(ix, iy, n.isleRX * 2.18, n.isleRY * 2.18);
  // Dead earth terrain — scanline fill
  for (let row = -n.isleRY; row < n.isleRY; row += 2) {
    let t = row / n.isleRY;
    let w2 = n.isleRX * sqrt(max(0, 1 - t * t));
    let wobble = sin(row * 0.07 + 1.8) * 3 + sin(row * 0.13 + 3.5) * 2;
    // Ashen grey-purple gradient
    let band = abs(t);
    let r = lerp(42, 52, 1 - band);
    let g = lerp(35, 42, 1 - band);
    let b = lerp(48, 58, 1 - band);
    fill(r, g, b);
    rect(floor(ix - w2 + wobble), floor(iy + row), floor(w2 * 2), 2);
  }
  // Dead grass / barren patches
  for (let i = 0; i < 15; i++) {
    let ga = (i * 2.39996) % TWO_PI;
    let gr = ((i * 17 + 11) % 70) / 100 * 0.65;
    let gpx = ix + cos(ga) * n.isleRX * gr;
    let gpy = iy + sin(ga) * n.isleRY * gr * 0.69;
    if (i % 3 === 0) { fill(38, 32, 28, 80); rect(floor(gpx), floor(gpy), 6, 2); }
    else if (i % 3 === 1) { fill(55, 48, 55, 60); rect(floor(gpx), floor(gpy), 4, 4); fill(48, 40, 48, 40); rect(floor(gpx + 1), floor(gpy + 1), 2, 2); }
    else { fill(45, 40, 42, 70); rect(floor(gpx), floor(gpy), 8, 2); }
  }
  // Ghostly ground veins — glowing fissures
  for (let fv = 0; fv < 5; fv++) {
    let fa = (fv / 5) * TWO_PI + fv * 1.2;
    let fLen = n.isleRX * (0.2 + (fv % 3) * 0.15);
    let fGlow = sin(nt * 3 + fv * 1.8) * 0.3 + 0.5;
    fill(120, 60, 180, 30 * fGlow);
    for (let seg = 0; seg < 5; seg++) {
      let st = seg / 5;
      let fx = ix + cos(fa) * fLen * st + sin(seg * 1.4 + fa) * 2;
      let fy = iy + sin(fa) * fLen * st * 0.69;
      rect(floor(fx), floor(fy), 3, 1);
    }
  }
  // Gravestones / broken pillars scattered across surface
  let graveSpots = [[-0.4, 0.2], [0.5, 0.15], [-0.2, -0.3], [0.35, -0.25], [-0.55, -0.1], [0.6, 0.3], [-0.1, 0.4], [0.15, -0.45]];
  for (let gs of graveSpots) {
    let gsx = ix + gs[0] * n.isleRX * 0.7;
    let gsy = iy + gs[1] * n.isleRY * 0.5;
    // Stone base
    fill(62, 55, 68); rect(floor(gsx - 3), floor(gsy - 2), 6, 4);
    // Upright stone / broken pillar
    fill(72, 65, 78); rect(floor(gsx - 2), floor(gsy - 8), 4, 8);
    // Top — some pointed, some broken flat
    if (gs[0] > 0) { fill(78, 70, 85); rect(floor(gsx - 1), floor(gsy - 10), 2, 3); }
    else { fill(68, 60, 75); rect(floor(gsx - 2), floor(gsy - 9), 4, 2); }
  }
  // Dead / twisted trees
  let deadTreeSpots = [[-0.5, -0.2], [0.55, 0.1], [-0.35, 0.35], [0.4, -0.35], [-0.6, 0.15], [0.3, 0.4]];
  for (let dt of deadTreeSpots) {
    let dtx = ix + dt[0] * n.isleRX * 0.7;
    let dty = iy + dt[1] * n.isleRY * 0.5;
    // Gnarled trunk
    fill(35, 28, 38); rect(floor(dtx - 1), floor(dty - 16), 3, 16);
    // Twisted branches
    fill(42, 35, 48);
    rect(floor(dtx - 5), floor(dty - 14), 4, 1);
    rect(floor(dtx - 6), floor(dty - 15), 2, 1);
    rect(floor(dtx + 2), floor(dty - 12), 5, 1);
    rect(floor(dtx + 5), floor(dty - 13), 2, 1);
    rect(floor(dtx - 3), floor(dty - 16), 3, 1);
    // Faint purple glow at roots
    let tGlow = sin(nt * 2 + dt[0] * 4) * 0.3 + 0.4;
    fill(100, 50, 150, 15 * tGlow); ellipse(dtx, dty, 10, 5);
  }
  // Ground fog / mist patches
  for (let fg = 0; fg < 8; fg++) {
    let fga = (fg / 8) * TWO_PI + nt * 0.3;
    let fgr = n.isleRX * (0.2 + (fg % 3) * 0.15);
    let fgx = ix + cos(fga) * fgr;
    let fgy = iy + sin(fga) * fgr * 0.6;
    let fogAlpha = 12 + sin(nt * 2 + fg * 1.5) * 6;
    fill(80, 70, 100, fogAlpha);
    ellipse(fgx, fgy, 35 + sin(nt + fg) * 8, 12 + sin(nt * 0.7 + fg) * 4);
  }
  // Edge fog crawl — creeping mist at island borders
  fill(60, 50, 80, 10 + sin(nt * 1.5) * 5);
  ellipse(ix, iy, n.isleRX * 2.05, n.isleRY * 2.05);
  // Central mausoleum — larger, more imposing
  fill(48, 42, 55); rect(floor(ix) - 28, floor(iy) - 18, 56, 32);
  fill(58, 52, 65); rect(floor(ix) - 24, floor(iy) - 26, 48, 12);
  // Roof / pediment
  fill(65, 58, 72); rect(floor(ix) - 28, floor(iy) - 28, 56, 4);
  fill(72, 64, 78); rect(floor(ix) - 22, floor(iy) - 32, 44, 6);
  // Columns
  fill(78, 70, 85); rect(floor(ix) - 26, floor(iy) - 26, 4, 26); rect(floor(ix) + 22, floor(iy) - 26, 4, 26);
  fill(85, 76, 92); rect(floor(ix) - 14, floor(iy) - 24, 3, 22); rect(floor(ix) + 11, floor(iy) - 24, 3, 22);
  // Dark entrance
  fill(20, 15, 28); rect(floor(ix) - 6, floor(iy) - 8, 12, 14);
  // Entrance glow
  let eGlow = sin(nt * 3) * 0.3 + 0.5;
  fill(120, 60, 180, 25 * eGlow); rect(floor(ix) - 4, floor(iy) - 6, 8, 10);
  // Overall eerie aura
  let glow = sin(nt * 3) * 0.3 + 0.5;
  fill(110, 55, 170, 12 * glow); ellipse(ix, iy, n.isleRX * 2.2, n.isleRY * 2.2);
  // Active dark overlay
  if (n.active) { fill(0, 0, 10, 25 * (n.darkAura || 0.3)); ellipse(ix, iy, n.isleRX * 2.5, n.isleRY * 2.5); }
  // Distant dock indicator
  if (!isActive) {
    noStroke();
    fill(140, 120, 90);
    rect(ix - 3, iy + n.isleRY * 0.4, 6, 12); // pier
    fill(160, 140, 105);
    rect(ix - 5, iy + n.isleRY * 0.4, 10, 3); // pier top
  }
  if (_dScale && _dScale.haze > 5) {
    resetMatrix();
    let bright = (typeof getSkyBrightness === 'function') ? getSkyBrightness() : 0.7;
    fill(140 + 30 * bright, 165 + 20 * bright, 195 + 10 * bright, floor(_dScale.haze * 0.6));
    noStroke();
    let hIx = w2sX(n.isleX), hIy = w2sY(n.isleY);
    let horizMinY2 = max(height * 0.06, height * 0.25 - (typeof horizonOffset !== 'undefined' ? horizonOffset : 0)) + 10;
    hIy = max(hIy, horizMinY2);
    let hRad = max(n.isleRX, n.isleRY) * 2.5 * _dScale.scale;
    ellipse(hIx, hIy, hRad, hRad * 0.7);
  }
  pop();
}
function drawNecropolisEntities() {
  let n = state.necropolis; if (!n.active && !_isExplorationActive('necropolis')) return; let p = state.player; noStroke();
  for (let t of n.tombs) { let tx = w2sX(t.x), ty = w2sY(t.y); fill(t.looted ? 60 : 80, t.looted ? 55 : 72, t.looted ? 65 : 85); rect(floor(tx) - 12, floor(ty) - 6, 24, 12); fill(t.looted ? 70 : 90, t.looted ? 65 : 82, t.looted ? 75 : 95); rect(floor(tx) - 10, floor(ty) - 8, 20, 4); fill(100, 90, 110); rect(floor(tx) - 1, floor(ty) - 5, 2, 6); rect(floor(tx) - 3, floor(ty) - 3, 6, 2); if (t.trapped && !t.looted) { fill(180, 60, 60, 100 + sin(frameCount * 0.1) * 30); rect(floor(tx) + 8, floor(ty) - 4, 3, 3); } if (!t.looted && dist(p.x, p.y, t.x, t.y) < 30) { fill(200, 180, 220, 180); textAlign(CENTER); textSize(10); text('[E] Open Tomb', tx, ty - 14); } }
  for (let sk of n.skeletons) { if (sk.hp <= 0) continue; let sx = w2sX(sk.x), sy = w2sY(sk.y); let flash = sk.flashTimer > 0; fill(flash ? 255 : 200, flash ? 200 : 190, flash ? 180 : 170); rect(floor(sx) - 4, floor(sy) - 3, 8, 8); fill(flash ? 240 : 180, flash ? 180 : 170, flash ? 160 : 150); for (let r = 0; r < 3; r++) rect(floor(sx) - 3, floor(sy) - 1 + r * 2, 6, 1); fill(flash ? 255 : 220, flash ? 220 : 210, flash ? 200 : 195); rect(floor(sx) - 4, floor(sy) - 9, 8, 7); fill(180, 60, 255, 150 + sin(frameCount * 0.1 + sk.x) * 50); rect(floor(sx) - 3, floor(sy) - 7, 2, 2); rect(floor(sx) + 1, floor(sy) - 7, 2, 2); fill(190, 180, 170); rect(floor(sx) - 3, floor(sy) - 3, 6, 2); fill(200, 190, 175); rect(floor(sx) - 6, floor(sy) - 2, 2, 6); rect(floor(sx) + 4, floor(sy) - 2, 2, 6); if (sk.hp < sk.maxHp) { fill(40, 40, 40, 180); rect(floor(sx) - 10, floor(sy) - 14, 20, 3); fill(180, 60, 60); rect(floor(sx) - 10, floor(sy) - 14, floor(20 * sk.hp / sk.maxHp), 3); } }
  for (let g of n.ghostNPCs) { let gx = w2sX(g.x), gy = w2sY(g.y); let hover = sin(frameCount * 0.04 + g.x * 0.1) * 3; fill(140, 120, 200, 60 + sin(frameCount * 0.05 + g.x) * 20); ellipse(gx, gy + hover - 4, 14, 18); fill(180, 160, 230, 80); ellipse(gx, gy + hover - 10, 10, 10); fill(200, 200, 255, 100); rect(floor(gx) - 2, floor(gy + hover) - 11, 1, 1); rect(floor(gx) + 1, floor(gy + hover) - 11, 1, 1); fill(180, 160, 220, 120); textAlign(CENTER); textSize(9); text(g.name, gx, gy + hover - 18); if (dist(p.x, p.y, g.x, g.y) < 35) { fill(200, 180, 240, 180); textSize(10); text('[E] Speak', gx, gy + hover - 24); } }
  for (let sn of n.soulNodes) { if (sn.collected) continue; let sx = w2sX(sn.x), sy = w2sY(sn.y); let pulse = sin(frameCount * 0.06 + sn.x * 0.1) * 0.3 + 0.7; fill(140, 60, 200, 80 * pulse); ellipse(sx, sy, 16, 16); fill(180, 100, 255, 120 * pulse); ellipse(sx, sy, 8, 8); fill(220, 180, 255, 60 * pulse); ellipse(sx, sy, 4, 4); if (dist(p.x, p.y, sn.x, sn.y) < 25) { fill(200, 160, 255, 180); textAlign(CENTER); textSize(10); text('[E] Absorb Soul Essence', sx, sy - 14); } }
  for (let w of n.wisps) { let al = min(80, w.life * 0.5); fill(140, 100, 200, al); ellipse(w2sX(w.x), w2sY(w.y), w.size, w.size); fill(180, 140, 240, al * 0.5); ellipse(w2sX(w.x), w2sY(w.y), w.size * 1.5, w.size * 1.5); }
  // Room 13 — faint XIII scratched into the mausoleum floor (barely visible)
  let r13X = w2sX(n.isleX), r13Y = w2sY(n.isleY - 5);
  let r13Found = state.narrativeFlags && state.narrativeFlags['secret_room_13'];
  let r13Pulse = sin(frameCount * 0.025 + 2.0) * 0.3 + 0.4;
  if (!r13Found) {
    // Tiny XIII scratched near mausoleum entrance — only visible up close
    if (dist(p.x, p.y, n.isleX, n.isleY - 5) < 60) {
      fill(120, 80, 160, floor(25 * r13Pulse));
      textAlign(CENTER); textSize(9);
      text('XIII', r13X, r13Y + 8);
      textAlign(LEFT);
    }
  } else {
    fill(160, 100, 220, floor(20 * r13Pulse)); ellipse(r13X, r13Y, 14, 10);
  }
  drawPlayer(); let dockX = w2sX(n.isleX), dockY = w2sY(n.isleY + n.isleRY * 0.82); fill(60, 50, 55); rect(floor(dockX) - 15, floor(dockY), 30, 6);
}
function drawNecropolisDistantLabel() {
  if (state.necropolis.active) return; let n = state.necropolis, sx = w2sX(n.isleX), sy = w2sY(n.isleY); let minY = max(height * 0.06, height * 0.25 - horizonOffset) + 10; sy = max(sy, minY);
  if (sx < -400 || sx > width + 400 || sy < -400 || sy > height + 400) return;
  let _ds = _getDistantScale(n.isleX, n.isleY, n.isleRX);
  if (_ds.dist > _getMaxViewDist()) return;
  let _labelFade = constrain(1 - _ds.haze / 200, 0.15, 1);
  let baseY = sy + n.isleRY * _ds.scale + 12;
  push(); noStroke(); textAlign(CENTER);
  // Skull icon
  fill(180, 100, 220, floor((180 + sin(frameCount * 0.05) * 40) * _labelFade)); textSize(max(9, floor(14 * _ds.scale)));
  text('\u2620', sx, baseY - 2);
  // Name
  fill(160, 100, 200, floor(180 * _labelFade)); textSize(max(8, floor(11 * _ds.scale))); textStyle(ITALIC);
  text('Necropolis', sx, baseY + 12 * _ds.scale); textStyle(NORMAL);
  // Status + danger
  let status = n.phase === 'unexplored' ? 'Unexplored' : n.phase === 'cleansed' ? 'Cleansed' : 'Discovered';
  let dangerIcon = '\u2620 ';
  fill(180, 80, 200, floor(160 * _labelFade)); textSize(max(7, floor(9 * _ds.scale)));
  text(dangerIcon + status, sx, baseY + 24 * _ds.scale);
  // Distance
  let d = _getIslandDist(n.isleX, n.isleY);
  fill(150, 120, 180, floor(120 * _labelFade)); textSize(max(7, floor(8 * _ds.scale)));
  text(d, sx, baseY + 34 * _ds.scale);
  pop();
}
function drawNecropolisHUD() {
  if (!state.necropolis.active && !_isExplorationActive('necropolis')) return; push(); fill(20, 12, 30, 220); noStroke(); rect(8, 8, 160, 60, 4); fill(180, 100, 240); textSize(10); textAlign(LEFT); text('NECROPOLIS', 16, 24); fill(200, 180, 210); textSize(11); text('HP: ' + state.player.hp + '/' + state.player.maxHp, 16, 38); fill(160, 100, 220); text('Soul Essence: ' + state.soulEssence, 16, 50); let alive = state.necropolis.skeletons.filter(s => s.hp > 0).length; fill(200, 80, 80); text('Skeletons: ' + alive, 16, 62); fill(160, 140, 180, 150); textSize(10); textAlign(CENTER); text('Walk south to dock', width / 2, height - 20); pop();
}

// ======================================================================
// === ISLAND [E] INTERACTION HANDLERS =================================
// ======================================================================

function handleVulcanInteract() {
  let v = state.vulcan, p = state.player;
  // Forge altar at crater center — within 60px
  if (dist(p.x, p.y, v.isleX, v.isleY) < 60) {
    if (state.narrativeFlags && state.narrativeFlags['forge_vulcan_blade']) {
      addFloatingText(w2sX(v.isleX), w2sY(v.isleY) - 30, 'The Blade of Vulcan is already forged.', '#ff8844');
      return;
    }
    if ((state.ironOre || 0) >= 10 && (state.titanBone || 0) >= 5) {
      state.ironOre -= 10;
      state.titanBone -= 5;
      state.narrativeFlags['forge_vulcan_blade'] = true;
      state.player.weapon = 2;
      spawnParticles(v.isleX, v.isleY, 'divine', 20);
      spawnParticles(v.isleX, v.isleY, 'crystal', 12);
      addFloatingText(width / 2, height * 0.2, 'BLADE OF VULCAN FORGED', '#ff5500');
      addFloatingText(width / 2, height * 0.28, 'Weapon upgraded!', '#ffcc44');
      if (snd) snd.playSFX('upgrade');
      shakeTimer = 20;
      return;
    } else {
      let needIron = max(0, 10 - (state.ironOre || 0));
      let needBone = max(0, 5 - (state.titanBone || 0));
      addFloatingText(w2sX(v.isleX), w2sY(v.isleY) - 30, 'Need 10 iron + 5 titan bone', '#ff8844');
      if (needIron > 0) addFloatingText(w2sX(v.isleX), w2sY(v.isleY) - 44, 'Iron: ' + (state.ironOre || 0) + '/10', '#aabbcc');
      if (needBone > 0) addFloatingText(w2sX(v.isleX), w2sY(v.isleY) - 56, 'Titan Bone: ' + (state.titanBone || 0) + '/5', '#ffdd88');
      return;
    }
  }
  // Find the nearest uncollected obsidian node in range
  let best = null, bestD = Infinity;
  for (let n of v.obsidianNodes) {
    if (n.collected) continue;
    let d = dist(p.x, p.y, n.x, n.y);
    if (d < 30 && d < bestD) { bestD = d; best = n; }
  }
  if (best) {
    if (best.cooldown && best.cooldown > 0) {
      addFloatingText(w2sX(best.x), w2sY(best.y) - 14, 'Still mining...', '#cc8844');
      return;
    }
    state.obsidian++;
    best.collected = true;
    if (snd) snd.playSFX('chop');
    addFloatingText(w2sX(best.x), w2sY(best.y) - 14, '+1 Obsidian', '#8855cc');
    spawnParticles(best.x, best.y, 'crystal', 6);
    return;
  }
  // Hot springs — no interaction needed (auto-heal), but give feedback if standing in one
  for (let hs of v.hotSprings) {
    if (dist(p.x, p.y, hs.x, hs.y) < 30) {
      addFloatingText(w2sX(hs.x), w2sY(hs.y) - 14, 'Hot spring — stand still to heal', '#44ddaa');
      return;
    }
  }
  // Volcano Heart — hidden chamber inside the crater (northwest of center, near a lava vein)
  let heartX = v.isleX - v.isleRX * 0.28, heartY = v.isleY - v.isleRY * 0.35;
  if (dist(p.x, p.y, heartX, heartY) < 20) {
    if (state.narrativeFlags && state.narrativeFlags['secret_volcano_heart']) {
      addFloatingText(w2sX(heartX), w2sY(heartY) - 14, 'The Heart of Vulcan pulses faintly.', '#ff8844');
      return;
    }
    let hasObs = (state.obsidian || 0) >= 3;
    let hasFrost = (state.frostCrystal || 0) >= 2;
    if (hasObs && hasFrost) {
      state.obsidian -= 3;
      state.frostCrystal -= 2;
      state.narrativeFlags['secret_volcano_heart'] = true;
      state._volcanoHeartOverlay = true;
      state._volcanoHeartTimer = 0;
      state.crystals = (state.crystals || 0) + 3;
      state.player.maxHp += 10;
      state.player.hp = state.player.maxHp;
      trackMilestone('secret_volcano_heart');
      if (snd) snd.playSFX('upgrade');
      spawnParticles(heartX, heartY, 'divine', 30);
      spawnParticles(heartX, heartY, 'crystal', 15);
      shakeTimer = 20;
      return;
    } else {
      // Subtle hint — only if standing right on it
      addFloatingText(w2sX(heartX), w2sY(heartY) - 14, 'The rock trembles... something is sealed within.', '#ff6633');
      if (!hasObs) addFloatingText(w2sX(heartX), w2sY(heartY) - 28, 'You feel it craves dark stone...', '#aa6644');
      if (!hasFrost) addFloatingText(w2sX(heartX), w2sY(heartY) - 42, '...and frozen light.', '#88bbdd');
      return;
    }
  }
  addFloatingText(w2sX(p.x), w2sY(p.y) - 18, '...', '#886655');
}

function handleHyperboreInteract() {
  let h = state.hyperborea, p = state.player;
  // Frost crystal nodes
  let bestNode = null, bestNodeD = Infinity;
  for (let n of h.frostNodes) {
    if (n.collected) continue;
    let d = dist(p.x, p.y, n.x, n.y);
    if (d < 28 && d < bestNodeD) { bestNodeD = d; bestNode = n; }
  }
  if (bestNode) {
    state.frostCrystal++;
    bestNode.collected = true;
    if (snd) snd.playSFX('crystal');
    addFloatingText(w2sX(bestNode.x), w2sY(bestNode.y) - 14, '+1 Frost Crystal', '#88ddff');
    spawnParticles(bestNode.x, bestNode.y, 'build', 6);
    return;
  }
  // Frozen ruins search
  let bestRuin = null, bestRuinD = Infinity;
  for (let r of h.frozenRuins) {
    if (r.looted) continue;
    let d = dist(p.x, p.y, r.x, r.y);
    if (d < 35 && d < bestRuinD) { bestRuinD = d; bestRuin = r; }
  }
  if (bestRuin) {
    bestRuin.looted = true;
    let roll = random();
    if (roll < 0.5) {
      state.frostCrystal++;
      addFloatingText(w2sX(bestRuin.x), w2sY(bestRuin.y) - 14, '+1 Frost Crystal (ruins)', '#88ddff');
    } else if (roll < 0.8) {
      state.gold = (state.gold || 0) + floor(random(3, 8));
      addFloatingText(w2sX(bestRuin.x), w2sY(bestRuin.y) - 14, '+Gold (ruins)', '#ffdd66');
    } else {
      state.crystals = (state.crystals || 0) + 1;
      addFloatingText(w2sX(bestRuin.x), w2sY(bestRuin.y) - 14, '+Crystal (ruins)', '#aaddff');
    }
    if (snd) snd.playSFX('scavenge');
    spawnParticles(bestRuin.x, bestRuin.y, 'build', 5);
    return;
  }
  // Frozen obelisk — learn ritual when all ruins looted
  if (h.frozenObelisk && dist(p.x, p.y, h.frozenObelisk.x, h.frozenObelisk.y) < 40) {
    if (state.narrativeFlags && state.narrativeFlags['learn_ritual']) {
      addFloatingText(w2sX(h.frozenObelisk.x), w2sY(h.frozenObelisk.y) - 40, 'The ritual is already memorized.', '#88ddff');
      return;
    }
    let allLooted = h.frozenRuins.length >= 4 && h.frozenRuins.every(r => r.looted);
    if (allLooted) {
      state.narrativeFlags['learn_ritual'] = true;
      addFloatingText(width / 2, height * 0.2, 'RITUAL OF SOL INVICTUS MEMORIZED', '#88ddff');
      addFloatingText(width / 2, height * 0.28, 'The words burn into your mind like starlight.', '#aaddff');
      spawnParticles(h.frozenObelisk.x, h.frozenObelisk.y, 'divine', 15);
      if (snd) snd.playSFX('crystal');
    } else {
      let looted = h.frozenRuins.filter(r => r.looted).length;
      addFloatingText(w2sX(h.frozenObelisk.x), w2sY(h.frozenObelisk.y) - 40, 'Search all frozen ruins first (' + looted + '/4)', '#88ddff');
    }
    return;
  }
  // Ice Mirror — hidden reflective pool behind the glacier (northwest corner)
  let mirrorX = h.isleX - h.isleRX * 0.55, mirrorY = h.isleY - h.isleRY * 0.45;
  if (dist(p.x, p.y, mirrorX, mirrorY) < 22) {
    if (state.narrativeFlags && state.narrativeFlags['secret_ice_mirror']) {
      addFloatingText(w2sX(mirrorX), w2sY(mirrorY) - 14, 'The mirror remembers you.', '#aaddff');
      return;
    }
    state.narrativeFlags['secret_ice_mirror'] = true;
    state._iceMirrorOverlay = true;
    state._iceMirrorTimer = 0;
    trackMilestone('secret_ice_mirror');
    if (snd) snd.playSFX('crystal');
    spawnParticles(mirrorX, mirrorY, 'divine', 20);
    shakeTimer = 8;
    return;
  }
  addFloatingText(w2sX(p.x), w2sY(p.y) - 18, '...', '#778899');
}

function handlePlentyInteract() {
  let pl = state.plenty, p = state.player;
  // Spice nodes
  let bestSpice = null, bestSpiceD = Infinity;
  for (let n of pl.spiceNodes) {
    if (n.collected) continue;
    let d = dist(p.x, p.y, n.x, n.y);
    if (d < 25 && d < bestSpiceD) { bestSpiceD = d; bestSpice = n; }
  }
  if (bestSpice) {
    state.exoticSpices++;
    bestSpice.collected = true;
    if (snd) snd.playSFX('harvest');
    addFloatingText(w2sX(bestSpice.x), w2sY(bestSpice.y) - 14, '+1 Exotic Spices', '#ffaa44');
    spawnParticles(bestSpice.x, bestSpice.y, 'harvest', 6);
    return;
  }
  // Fruit trees
  let bestTree = null, bestTreeD = Infinity;
  for (let t of pl.fruitTrees) {
    if (!t.fruit) continue;
    let d = dist(p.x, p.y, t.x, t.y);
    if (d < 28 && d < bestTreeD) { bestTreeD = d; bestTree = t; }
  }
  if (bestTree) {
    bestTree.fruit = false;
    bestTree.timer = 600; // regrow after ~10 seconds
    state.exoticSpices++;
    if (snd) snd.playSFX('harvest');
    addFloatingText(w2sX(bestTree.x), w2sY(bestTree.y) - 14, '+1 Exotic Spices (' + bestTree.type + ')', '#ffcc44');
    spawnParticles(bestTree.x, bestTree.y, 'harvest', 5);
    return;
  }
  addFloatingText(w2sX(p.x), w2sY(p.y) - 18, '...', '#557744');
}

function handleNecropolisInteract() {
  let n = state.necropolis, p = state.player;
  // Soul essence nodes
  let bestSoul = null, bestSoulD = Infinity;
  for (let sn of n.soulNodes) {
    if (sn.collected) continue;
    let d = dist(p.x, p.y, sn.x, sn.y);
    if (d < 25 && d < bestSoulD) { bestSoulD = d; bestSoul = sn; }
  }
  if (bestSoul) {
    state.soulEssence++;
    bestSoul.collected = true;
    if (snd) snd.playSFX('crystal');
    addFloatingText(w2sX(bestSoul.x), w2sY(bestSoul.y) - 14, '+1 Soul Essence', '#cc88ff');
    spawnParticles(bestSoul.x, bestSoul.y, 'combat', 6);
    return;
  }
  // Tombs
  let bestTomb = null, bestTombD = Infinity;
  for (let t of n.tombs) {
    if (t.looted) continue;
    let d = dist(p.x, p.y, t.x, t.y);
    if (d < 30 && d < bestTombD) { bestTombD = d; bestTomb = t; }
  }
  if (bestTomb) {
    bestTomb.looted = true;
    if (bestTomb.trapped && p.invincTimer <= 0) {
      let dmg = 10 - ((typeof getPlayerDefenseReduction === 'function') ? getPlayerDefenseReduction() : (p.armor > 0 ? p.armor * 3 : 0));
      p.hp = Math.max(0, p.hp - max(1, dmg));
      p.invincTimer = 45;
      shakeTimer = 6;
      addFloatingText(w2sX(bestTomb.x), w2sY(bestTomb.y) - 14, 'TRAPPED! -' + max(1, dmg) + ' HP', '#ff4444');
      if (snd) snd.playSFX('scavenge');
      return;
    }
    state.soulEssence++;
    if (snd) snd.playSFX('scavenge');
    addFloatingText(w2sX(bestTomb.x), w2sY(bestTomb.y) - 14, '+1 Soul Essence (tomb)', '#cc88ff');
    spawnParticles(bestTomb.x, bestTomb.y, 'combat', 5);
    return;
  }
  // Ghost NPCs
  let bestGhost = null, bestGhostD = Infinity;
  for (let g of n.ghostNPCs) {
    if (g.talked) continue;
    let d = dist(p.x, p.y, g.x, g.y);
    if (d < 35 && d < bestGhostD) { bestGhostD = d; bestGhost = g; }
  }
  if (bestGhost) {
    bestGhost.talked = true;
    addFloatingText(w2sX(bestGhost.x), w2sY(bestGhost.y) - 28, bestGhost.name + ': ' + bestGhost.line, '#ddccff');
    return;
  }
  // Room 13 — secret tomb hidden behind the mausoleum (walk into its dark entrance)
  let mausX = n.isleX, mausY = n.isleY - 5;
  if (dist(p.x, p.y, mausX, mausY) < 18) {
    if (state.narrativeFlags && state.narrativeFlags['secret_room_13']) {
      addFloatingText(w2sX(mausX), w2sY(mausY) - 30, 'Room XIII is empty now. Its secret is yours.', '#cc88ff');
      return;
    }
    state.narrativeFlags['secret_room_13'] = true;
    state._room13Overlay = true;
    state._room13Timer = 0;
    trackMilestone('secret_room_13');
    // Reward: death shroud cosmetic
    state.wardrobe = state.wardrobe || { tunicColor: 0, headwear: 0 };
    state.wardrobe.deathShroud = true;
    state.soulEssence = (state.soulEssence || 0) + 5;
    if (snd) snd.playSFX('crystal');
    spawnParticles(mausX, mausY, 'combat', 25);
    shakeTimer = 12;
    return;
  }
  addFloatingText(w2sX(p.x), w2sY(p.y) - 18, '...', '#665577');
}

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

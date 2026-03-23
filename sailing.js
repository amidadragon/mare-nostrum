// ─── SAILING SYSTEM ─────────────────────────────────────────────────────
// Extracted from sketch.js — rowing, boat drawing, ambient ships


// Ambient ships sailing between islands
let _ambientShips = null;
function _initAmbientShips() {
  _ambientShips = [];
  let cx = WORLD.islandCX, cy = WORLD.islandCY;
  // Island targets for trade routes
  let _targets = [
    { x: cx, y: cy },
    { x: state.conquest.isleX, y: state.conquest.isleY },
    { x: state.vulcan.isleX, y: state.vulcan.isleY },
    { x: state.hyperborea.isleX, y: state.hyperborea.isleY },
    { x: state.plenty.isleX, y: state.plenty.isleY },
    { x: state.necropolis.isleX, y: state.necropolis.isleY },
  ];
  let nKeys = Object.keys(state.nations || {});
  for (let k of nKeys) {
    let n = state.nations[k];
    if (n && !n.defeated) _targets.push({ x: n.isleX, y: n.isleY, nation: k });
  }
  // 5 ambient ships with varied types
  for (let i = 0; i < 5; i++) {
    let fromIdx = floor(random(_targets.length));
    let toIdx = floor(random(_targets.length));
    while (toIdx === fromIdx) toIdx = floor(random(_targets.length));
    let from = _targets[fromIdx], to = _targets[toIdx];
    let isNationShip = _targets[fromIdx].nation || _targets[toIdx].nation;
    let nationKey = _targets[fromIdx].nation || _targets[toIdx].nation || null;
    let shipType; // 0=merchant(gold flag), 1=neutral(white), 2=war(red)
    if (nationKey && state.nations[nationKey] && state.nations[nationKey].reputation <= -30) {
      shipType = 2; // enemy
    } else if (isNationShip && random() < 0.5) {
      shipType = 0; // trade
    } else {
      shipType = 1; // neutral
    }
    // Curved path: lerp from→to with a midpoint offset for arc
    let midX = (from.x + to.x) / 2 + random(-300, 300);
    let midY = (from.y + to.y) / 2 + random(-200, 200);
    _ambientShips.push({
      fromX: from.x, fromY: from.y,
      toX: to.x, toY: to.y,
      midX: midX, midY: midY,
      t: random(0, 1), // progress along path 0-1
      speed: random(0.0003, 0.0008),
      size: random(1.6, 2.5),
      type: shipType,
      nationKey: nationKey,
    });
  }
}
function drawAmbientShips() {
  if (!_ambientShips) _initAmbientShips();
  let oceanTop = max(height * 0.06, height * 0.25 - horizonOffset);
  let bright = typeof getSkyBrightness === 'function' ? getSkyBrightness() : 0.5;
  noStroke();
  for (let ship of _ambientShips) {
    ship.t += ship.speed;
    if (ship.t > 1) {
      // Reassign new route
      ship.t = 0;
      ship.fromX = ship.toX; ship.fromY = ship.toY;
      let cx = WORLD.islandCX, cy = WORLD.islandCY;
      let _newTargets = [{ x: cx, y: cy }];
      let nk = Object.keys(state.nations || {});
      for (let k of nk) { let n = state.nations[k]; if (n && !n.defeated) _newTargets.push({ x: n.isleX, y: n.isleY, nation: k }); }
      _newTargets.push({ x: state.conquest.isleX, y: state.conquest.isleY });
      _newTargets.push({ x: state.plenty.isleX, y: state.plenty.isleY });
      let pick = _newTargets[floor(random(_newTargets.length))];
      ship.toX = pick.x; ship.toY = pick.y;
      ship.midX = (ship.fromX + ship.toX) / 2 + random(-300, 300);
      ship.midY = (ship.fromY + ship.toY) / 2 + random(-200, 200);
      ship.nationKey = pick.nation || null;
      // Update type based on nation hostility
      if (ship.nationKey && state.nations[ship.nationKey] && state.nations[ship.nationKey].reputation <= -30) {
        ship.type = 2;
      } else if (ship.nationKey) {
        ship.type = random() < 0.5 ? 0 : 1;
      } else {
        ship.type = 1;
      }
    }
    // Quadratic bezier: from → mid → to
    let t = ship.t;
    let u = 1 - t;
    let wx = u * u * ship.fromX + 2 * u * t * ship.midX + t * t * ship.toX;
    let wy = u * u * ship.fromY + 2 * u * t * ship.midY + t * t * ship.toY;
    let sx = w2sX(wx), sy = w2sY(wy);
    // Clamp to ocean
    sy = max(sy, oceanTop + 15);
    if (sx < -80 || sx > width + 80 || sy > height - 20) continue;
    // Distance-based scale (atmospheric perspective)
    let dFromCam = sqrt((wx - camSmooth.x) * (wx - camSmooth.x) + (wy - camSmooth.y) * (wy - camSmooth.y));
    let distScale = constrain(1 - dFromCam / 5000, 0.3, 1);
    let distFade = constrain(1 - abs(sy - height * 0.4) / (height * 0.5), 0.15, 1);
    let sc = ship.size * distFade * distScale;
    // Direction: tangent of bezier curve
    let dx = 2 * (1 - t) * (ship.midX - ship.fromX) + 2 * t * (ship.toX - ship.midX);
    let dir = dx >= 0 ? 1 : -1;
    push();
    translate(floor(sx), floor(sy));
    scale(dir * sc, sc);
    let hAlpha = 160 * distFade * bright;
    // Hull — wooden planks
    fill(90, 62, 28, hAlpha);
    beginShape();
    vertex(-12, -1); vertex(-10, 3); vertex(10, 3); vertex(12, -1);
    vertex(9, -3); vertex(-9, -3);
    endShape(CLOSE);
    // Hull stripe
    fill(75, 50, 22, hAlpha * 0.7);
    rect(-8, -1, 16, 1);
    // Mast
    fill(70, 48, 20, hAlpha);
    rect(-1, -16, 2, 14);
    // Sail — colored by ship type
    let puff = sin(frameCount * 0.025 + ship.t * 20) * 1.5;
    let sailR, sailG, sailB;
    if (ship.nationKey && FACTION_MILITARY[ship.nationKey]) {
      let _nf = FACTION_MILITARY[ship.nationKey].conquestFlag;
      if (ship.type === 2) { sailR = _nf[0]; sailG = _nf[1] * 0.6; sailB = _nf[2] * 0.6; } // darkened faction color for hostile
      else { sailR = _nf[0]; sailG = _nf[1]; sailB = _nf[2]; } // faction color
    } else if (ship.type === 0) { sailR = 240; sailG = 210; sailB = 140; } // gold trade
    else if (ship.type === 2) { sailR = 200; sailG = 80; sailB = 70; } // red enemy
    else { sailR = 235; sailG = 228; sailB = 210; } // white neutral
    fill(sailR, sailG, sailB, hAlpha * 0.9);
    beginShape();
    vertex(0, -15); vertex(7 + puff, -9); vertex(0, -2);
    endShape(CLOSE);
    // Small flag at top of mast
    if (ship.type === 0) fill(220, 190, 60, hAlpha);
    else if (ship.type === 2) fill(200, 50, 40, hAlpha);
    else fill(200, 200, 200, hAlpha * 0.7);
    rect(1, -17, 4, 2);
    // Wake trail
    fill(180, 210, 230, 18 * distFade);
    ellipse(-14, 2, 8, 2);
    ellipse(-18, 2, 5, 1);
    pop();
  }
}

// Shore waves — drawn in the island context (after all island objects)
// Creates foam ring around the full island perimeter


// ─── PLAYER ───────────────────────────────────────────────────────────────
function updateRowing(dt) {
  let r = state.rowing;
  if (!r.active) return;
  // Freeze boat while modifier select is open
  if (state.expeditionModifierSelect) return;

  let dx = 0, dy = 0;
  if (isKeybindDown('moveLeft') || keyIsDown(LEFT_ARROW))  dx -= 1;
  if (isKeybindDown('moveRight') || keyIsDown(RIGHT_ARROW)) dx += 1;
  if (isKeybindDown('moveUp') || keyIsDown(UP_ARROW))    dy -= 1;
  if (isKeybindDown('moveDown') || keyIsDown(DOWN_ARROW))  dy += 1;
  if (dx === 0 && dy === 0 && typeof _touchJoystick !== 'undefined' && _touchJoystick.active) {
    dx = _touchJoystick.dx; dy = _touchJoystick.dy;
  }

  let rowSpeed = 3.5 * getFactionData().sailSpeedMult;
  if (typeof hasTech === 'function' && hasTech('celestial_navigation')) rowSpeed *= 1.15;
  rowSpeed *= getWeatherEffects().sailMult;
  if (state.naval) {
    let _windMult = 0.5 + cos(r.angle - (state.naval.wind ? state.naval.wind.angle : 0)) * 0.5;
    rowSpeed *= (1 + (state.naval.sailLevel || 0) * 0.15);
    rowSpeed *= (0.6 + _windMult * 0.4);
  }
  if (dx !== 0 || dy !== 0) {
    let len = sqrt(dx * dx + dy * dy);
    r.speed = lerp(r.speed, rowSpeed, 0.05);
    r.angle = atan2(dy / len, dx / len);
    r.oarPhase += 0.08;
  } else {
    r.speed *= 0.96;
    if (r.speed < 0.05) r.speed = 0;
  }

  r.x += cos(r.angle) * r.speed * dt;
  r.y += sin(r.angle) * r.speed * dt;

  // Bobbing
  let bob = sin(frameCount * 0.03) * 2;
  // Camera follows boat
  state.player.x = r.x;
  state.player.y = r.y;

  // Boundary: don't let boat go too far from island (islands surround home)
  let maxDist = state.islandRX * 8.5; // expanded for distant islands (Necropolis ~3500px)
  let bDist = dist(r.x, r.y, WORLD.islandCX, WORLD.islandCY);
  if (bDist > maxDist) {
    let ang = atan2(r.y - WORLD.islandCY, r.x - WORLD.islandCX);
    r.x = WORLD.islandCX + cos(ang) * maxDist;
    r.y = WORLD.islandCY + sin(ang) * maxDist;
    r.speed *= 0.5;
  }

  // Detect proximity to islands — set dock prompt (E to dock)
  let cq = state.conquest;
  let cqDist = dist(r.x, r.y, cq.isleX, cq.isleY);
  r.nearIsle = null;
  let cqNear = ((r.x - cq.isleX) / cq.isleRX) ** 2 + ((r.y - cq.isleY) / cq.isleRY) ** 2;
  if (cqNear < 1.5 * 1.5) { r.nearIsle = 'conquest'; unlockJournal('terra_nova'); }

  // Nation islands — elliptical proximity + collision for each
  let _nationKeys = Object.keys(state.nations || {});
  for (let _nk of _nationKeys) {
    let _nv = state.nations[_nk];
    if (!_nv || _nv.defeated) continue;
    let _nvx = ((r.x - _nv.isleX) / _nv.isleRX);
    let _nvy = ((r.y - _nv.isleY) / _nv.isleRY);
    let _nvDist = _nvx * _nvx + _nvy * _nvy;
    if (_nvDist < 1.5 * 1.5) r.nearIsle = _nk;
    if (_nvDist < 0.8 * 0.8) {
      let ang = atan2(r.y - _nv.isleY, r.x - _nv.isleX);
      r.x = _nv.isleX + cos(ang) * _nv.isleRX * 0.82;
      r.y = _nv.isleY + sin(ang) * _nv.isleRY * 0.82;
      r.speed *= 0.3;
    }
  }

  // New islands — elliptical proximity detection + collision
  let _newIsles = [
    { key: 'vulcan',    s: state.vulcan },
    { key: 'hyperborea',s: state.hyperborea },
    { key: 'plenty',    s: state.plenty },
    { key: 'necropolis',s: state.necropolis },
  ];
  for (let ni of _newIsles) {
    let nex = ((r.x - ni.s.isleX) / ni.s.isleRX);
    let ney = ((r.y - ni.s.isleY) / ni.s.isleRY);
    let neDist = nex * nex + ney * ney;
    if (neDist < 1.5 * 1.5) r.nearIsle = ni.key;
    // Collision
    if (neDist < 0.8 * 0.8) {
      let ang = atan2(r.y - ni.s.isleY, r.x - ni.s.isleX);
      r.x = ni.s.isleX + cos(ang) * ni.s.isleRX * 0.82;
      r.y = ni.s.isleY + sin(ang) * ni.s.isleRY * 0.82;
      r.speed *= 0.3;
    }
  }

  // Elliptical collision for Terra Nova (RX != RY)
  let cqNx = (r.x - cq.isleX) / cq.isleRX;
  let cqNy = (r.y - cq.isleY) / cq.isleRY;
  let cqEllDist = cqNx * cqNx + cqNy * cqNy;
  if (cqEllDist < 0.8 * 0.8) {
    let ang = atan2(r.y - cq.isleY, r.x - cq.isleX);
    r.x = cq.isleX + cos(ang) * cq.isleRX * 0.82;
    r.y = cq.isleY + sin(ang) * cq.isleRY * 0.82;
    r.speed *= 0.3;
  }

  // Don't let boat go onto island
  if (isOnIsland(r.x, r.y)) {
    let ang = atan2(r.y - WORLD.islandCY, r.x - WORLD.islandCX);
    let rx = getSurfaceRX() * 1.05;
    let ry = getSurfaceRY() * 1.05;
    r.x = WORLD.islandCX + cos(ang) * rx;
    r.y = WORLD.islandCY + sin(ang) * ry;
    r.speed = 0;
  }

  // Wake trail — behind the ship (stern/ram trails at -x)
  if (r.speed > 0.3 && frameCount % 4 === 0) {
    r.wakeTrail.push({ x: r.x - cos(r.angle) * 55, y: r.y - sin(r.angle) * 55, life: 40 });
  }
  r.wakeTrail.forEach(w => w.life--);
  r.wakeTrail = r.wakeTrail.filter(w => w.life > 0);
}


// ─── HOME ISLAND DISTANT — visible when sailing away ────────────────────
function drawHomeIslandDistant() {
  return;
}

function drawRowingBoat() {
  let r = state.rowing;
  if (!r.active) return;

  let sx = w2sX(r.x);
  let sy = w2sY(r.y);
  let bob = sin(frameCount * 0.03) * 2;

  // Wake trail — pixel rects
  noStroke();
  r.wakeTrail.forEach(w => {
    let a = (w.life / 40) * 50;
    let sz = floor((1 - w.life / 40) * 18 + 6);
    fill(200, 220, 255, a);
    rect(floor(w2sX(w.x)) - floor(sz / 2), floor(w2sY(w.y) + bob) - 1, sz, max(1, floor(sz * 0.35)));
  });
  // Bow spray — pixel splashes
  if (r.speed > 1) {
    for (let i = 0; i < 5; i++) {
      let sp = floor(sin(frameCount * 0.2 + i * 1.5) * 5);
      fill(200, 225, 240, 35 + r.speed * 8);
      rect(floor(sx + cos(r.angle) * 60 + sp) - 3, floor(sy + sin(r.angle) * 60 + bob - i * 2) - 1, 6, 3);
    }
  }

  // Determine view: side view for horizontal, top-down for vertical
  let verticalness = abs(sin(r.angle));
  let useTopDown = verticalness > 0.55;

  if (useTopDown) {
    // === TOP-DOWN VIEW (sailing up/down) ===
    // Water shadow — pixel rect
    push();
    translate(floor(sx), floor(sy + bob));
    rotate(r.angle);
    noStroke();
    fill(40, 70, 100, 20);
    rect(-55, -18, 110, 36);
    pop();

    push();
    translate(floor(sx), floor(sy + bob));
    rotate(r.angle);

    // Hull from above — pixel rects (tapered bow/stern)
    fill(75, 45, 20);
    rect(-42, -13, 80, 26);       // main body
    rect(38, -10, 14, 20);        // bow taper
    rect(52, -4, 8, 8);           // bow tip
    rect(-45, -4, 3, 8);          // stern taper

    // Deck planking
    fill(95, 65, 30);
    rect(-35, -9, 73, 18);
    fill(80, 52, 22, 50);
    for (let i = 0; i < 8; i++) rect(-30 + i * 10, -8, 1, 16);

    // Bronze ram at bow — pixel wedge
    fill(160, 120, 40);
    rect(56, -3, 8, 6);
    rect(64, -2, 4, 4);
    rect(68, -1, 2, 2);
    fill(180, 140, 50, 150);
    rect(58, -1, 6, 2);

    // Oar rows from above — pixel lines
    fill(100, 70, 35);
    for (let i = 0; i < 8; i++) {
      let ox = -25 + i * 9;
      let oarSwing = floor(sin(r.oarPhase + i * 0.4) * 4);
      rect(ox, -27, 1, 14);       // top oar
      rect(ox + oarSwing, -27, 1, 2); // oar tip top
      rect(ox, 13, 1, 14);        // bottom oar
      rect(ox + oarSwing, 25, 1, 2);  // oar tip bottom
    }

    // Shields along gunwales — pixel rects
    for (let i = 0; i < 6; i++) {
      let shx = -18 + i * 11;
      fill(160, 35, 25); rect(shx - 2, -13, 4, 4);
      fill(190, 160, 60); rect(shx - 1, -12, 2, 2);
      fill(160, 35, 25); rect(shx - 2, 9, 4, 4);
      fill(190, 160, 60); rect(shx - 1, 10, 2, 2);
    }

    // Cabin/tower at bow — pixel rects
    fill(100, 68, 32);
    rect(24, -11, 20, 22);
    fill(120, 85, 42);
    rect(26, -9, 16, 18);
    // Planking lines on cabin roof
    fill(90, 60, 28, 80);
    rect(27, -6, 14, 1); rect(27, 0, 14, 1); rect(27, 6, 14, 1);
    // Railing posts
    fill(80, 55, 25);
    rect(24, -11, 2, 22);
    rect(42, -11, 2, 22);

    // Captain (head from above) — pixel
    fill(210, 170, 120);
    rect(31, -3, 6, 6);
    fill(190, 160, 60);
    rect(31, -4, 6, 3);

    // Sail from above — pixel rect
    let sailBillow = floor(sin(frameCount * 0.03) * 4);
    // Sail shadow
    fill(60, 45, 20, 40);
    rect(-22 + sailBillow, -17, 36, 34);
    // Main sail
    fill(230, 215, 185, 235);
    rect(-22, -17, 34, 34);
    // Sail border
    fill(180, 160, 120, 150);
    rect(-22, -17, 34, 1); rect(-22, 16, 34, 1);
    rect(-22, -17, 1, 34); rect(11, -17, 1, 34);
    // Red stripe
    fill(175, 40, 30, 210);
    rect(-7 + floor(sailBillow * 0.5), -17, 8, 34);
    // SPQR text
    push();
    translate(-3 + floor(sailBillow * 0.5), 0);
    rotate(HALF_PI);
    fill(165, 35, 25, 200);
    textSize(5); textAlign(CENTER, CENTER);
    text('SPQR', 0, 0);
    pop();
    // Yard arm
    fill(100, 70, 35);
    rect(-6, -18, 2, 37);
    // Mast — pixel square
    fill(90, 60, 28);
    rect(-8, -3, 6, 6);
    fill(70, 45, 20);
    rect(-7, -2, 4, 4);
    // Rigging lines
    fill(100, 80, 50, 70);
    // Simplified as thin rects won't look great rotated, keep as lines
    stroke(100, 80, 50, 70); strokeWeight(1);
    line(-5, 0, 42, -11); line(-5, 0, 42, 11);
    line(-5, 0, -40, -11); line(-5, 0, -40, 11);
    noStroke();

    // Stern ornament — pixel
    fill(180, 140, 50);
    rect(-46, -2, 4, 4);
    fill(120, 80, 30);
    rect(-45, -1, 2, 2);

    // Rowers (heads from above) — pixel rects
    for (let i = 0; i < 4; i++) {
      let rx = -15 + i * 9;
      fill(180, 150, 120);
      rect(rx - 1, -6, 3, 3);
      rect(rx - 1, 4, 3, 3);
    }

    // Flag — pixel rects, faction color
    let _sf = getFactionMilitary();
    fill(_sf.conquestFlag[0], _sf.conquestFlag[1], _sf.conquestFlag[2]);
    let fw = floor(sin(frameCount * 0.04) * 2);
    rect(-12 + fw, -2, 7, 4);
    rect(-10 + fw, -1, 3, 2);

    pop();
  } else {
    // === SIDE VIEW (sailing left/right) ===
    // Mirror X when facing left so tower stays on top
    let drawAngle = r.angle;
    let flipX = 1;
    if (drawAngle > HALF_PI) { drawAngle -= PI; flipX = -1; }
    else if (drawAngle < -HALF_PI) { drawAngle += PI; flipX = -1; }

    // Water reflection — pixel rect
    push();
    translate(floor(sx), floor(sy + bob));
    rotate(drawAngle);
    scale(flipX, 1);
    noStroke();
    fill(40, 70, 100, 20);
    rect(-50, 12, 100, 8);
    pop();

    push();
    translate(floor(sx), floor(sy + bob));
    rotate(drawAngle);
    scale(flipX, 1);

    // Hull — pixel rects (tapered bow, blunt stern)
    fill(75, 45, 20);
    rect(-42, -4, 77, 14);        // main body
    rect(35, -4, 17, 8);          // bow taper
    rect(52, -2, 6, 4);           // bow tip
    rect(-45, -2, 3, 12);         // stern
    // Hull planking lines
    fill(90, 55, 25, 70);
    rect(-40, 2, 90, 1);
    rect(-38, 6, 83, 1);

    // Bronze ram — pixel wedge
    fill(160, 120, 40);
    rect(55, -3, 10, 6);
    rect(65, -2, 4, 4);
    rect(69, -1, 3, 2);
    fill(180, 140, 50, 150);
    rect(57, -1, 8, 2);

    // Stern ornament — pixel post (stacked rects curving up)
    fill(120, 80, 30);
    rect(-44, -4, 2, 2);
    rect(-46, -8, 2, 4);
    rect(-47, -14, 2, 6);
    rect(-46, -20, 2, 6);
    rect(-44, -26, 2, 6);
    // Ornament top
    fill(180, 140, 50);
    rect(-45, -30, 4, 4);
    fill(200, 160, 60);
    rect(-44, -33, 2, 3);

    // Oar banks — pixel lines (vertical rects)
    fill(100, 70, 35);
    for (let i = 0; i < 8; i++) {
      let ox = -30 + i * 10;
      let oarOff = floor(sin(r.oarPhase + i * 0.4) * 4);
      // Top oars
      rect(ox, -4 - 14 + oarOff, 1, 14);
      // Bottom oars
      rect(ox, 10 - oarOff, 1, 14);
    }

    // Deck
    fill(100, 68, 32);
    rect(-40, -6, 88, 5);
    fill(85, 55, 25);
    rect(-40, -8, 88, 2);

    // Shields along sides — pixel rects
    for (let i = 0; i < 6; i++) {
      let shx = -25 + i * 12;
      fill(160, 35, 25); rect(shx - 3, -7, 5, 5);
      fill(190, 160, 60); rect(shx - 1, -6, 2, 2);
      fill(160, 35, 25); rect(shx - 3, 7, 5, 5);
      fill(190, 160, 60); rect(shx - 1, 8, 2, 2);
    }

    // Mast + Sail — pixel
    fill(90, 60, 28);
    rect(-8, -42, 3, 36);
    fill(80, 52, 24);
    rect(-24, -40, 40, 2);
    // Sail — pixel rect
    let sailBillow = floor(sin(frameCount * 0.03) * 2);
    fill(220, 205, 175, 230);
    rect(-22, -38, 36, 28);
    // Red stripe on sail
    fill(160, 40, 30, 180);
    rect(-21 + sailBillow, -28, 34, 8);
    fill(160, 35, 25, 140);
    textSize(5); textAlign(CENTER, CENTER);
    text('SPQR', sailBillow - 4, -24);
    // Rigging
    stroke(100, 80, 50, 80); strokeWeight(1);
    line(-7, -42, -40, -6);
    line(-7, -42, 44, -6);
    noStroke();
    // Flag — pixel rect, faction color
    let flagWave = floor(sin(frameCount * 0.04) * 2);
    let _sf2 = getFactionMilitary();
    fill(_sf2.conquestFlag[0], _sf2.conquestFlag[1], _sf2.conquestFlag[2]);
    rect(-7, -50, 10 + flagWave, 4);
    rect(-7, -48, 6 + flagWave, 2);

    // Bow tower — pixel rects (already rect-based, remove rounded corners)
    fill(110, 78, 38);
    rect(30, -20, 18, 16);
    fill(125, 90, 45);
    rect(31, -19, 16, 14);
    fill(50, 30, 10);
    rect(34, -16, 2, 5);
    rect(39, -16, 2, 5);
    fill(110, 78, 38);
    for (let ci = 0; ci < 4; ci++) {
      rect(30 + ci * 5, -23, 3, 4);
    }
    fill(100, 70, 34);
    rect(29, -20, 20, 2);

    // Captain in tower — pixel
    fill(160, 35, 25);
    rect(37, -14, 6, 8);         // body
    fill(180, 150, 70);
    rect(37, -17, 6, 4);         // armor
    fill(210, 170, 120);
    rect(37, -22, 6, 6);         // head
    fill(190, 160, 60);
    rect(37, -24, 6, 3);         // helmet
    fill(200, 50, 40);
    rect(39, -26, 2, 3);         // plume

    // Rowers on deck — pixel
    for (let i = 0; i < 4; i++) {
      let rx = -20 + i * 10;
      fill(180, 150, 120);
      rect(rx - 2, -3, 4, 4);
      fill(200, 190, 170);
      rect(rx - 2, 1, 4, 4);
    }

    pop();
  }

  // Army units as tiny dots on ship deck
  if (state.legia && state.legia.army && state.legia.army.length > 0) {
    let _am = getFactionMilitary();
    noStroke();
    let armyN = min(state.legia.army.length, 12);
    for (let i = 0; i < armyN; i++) {
      fill(_am.tunic[0], _am.tunic[1], _am.tunic[2]);
      let dx = floor(-15 + (i % 4) * 8), dy = floor(-2 + floor(i / 4) * 5);
      rect(floor(sx) + dx, floor(sy + bob) + dy, 3, 3);
    }
  }

  // Legion formation behind boat when marching
  if (state.legia && state.legia.marching) {
    let _marchSoldiers = (state.legia.soldiers || []).concat(typeof getPatrolSoldiers === 'function' ? getPatrolSoldiers() : []);
    let boatX = floor(sx);
    let boatY = floor(sy + bob);
    let _bm = getFactionMilitary();
    noStroke();
    _marchSoldiers.forEach((s, i) => {
      let ox = -20 - (i % 3) * 12;
      let oy = 10 + floor(i / 3) * 8;
      // Small soldier body in formation — faction tunic
      fill(_bm.tunic[0], _bm.tunic[1], _bm.tunic[2]);
      rect(boatX + ox, boatY + oy, 4, 5);
      // Helmet — faction
      fill(_bm.helm[0], _bm.helm[1], _bm.helm[2]);
      rect(boatX + ox, boatY + oy - 2, 4, 2);
    });
    // Flag bearer standard in formation (front)
    if (state.legia.army && state.legia.army.some(u => u.type === 'flag_bearer')) {
      let fbx = boatX - 8, fby = boatY + 4;
      if (typeof drawFactionStandard === 'function') drawFactionStandard(fbx, fby, state.faction || 'rome', 0.6);
    }
  }
}


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
  ];
  // Add conquest island if it exists
  if (state.conquest && state.conquest.isleX) _targets.push({ x: state.conquest.isleX, y: state.conquest.isleY });
  // Add world islands as ambient ship targets
  if (typeof WORLD_ISLANDS !== 'undefined') {
    for (let wi of WORLD_ISLANDS) {
      if (!wi.faction) {
        let wpos = typeof getIslandWorldPos === 'function' ? getIslandWorldPos(wi) : null;
        if (wpos) _targets.push({ x: wpos.x, y: wpos.y });
      }
    }
  }
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
      for (let k of nk) { let n = state.nations[k]; if (n && !n.defeated && n.isleX) _newTargets.push({ x: n.isleX, y: n.isleY, nation: k }); }
      if (state.conquest && state.conquest.isleX) _newTargets.push({ x: state.conquest.isleX, y: state.conquest.isleY });
      // Add world islands as re-route targets
      if (typeof WORLD_ISLANDS !== 'undefined') {
        let _wPick = WORLD_ISLANDS[floor(random(WORLD_ISLANDS.length))];
        let _wPos = typeof getIslandWorldPos === 'function' ? getIslandWorldPos(_wPick) : null;
        if (_wPos) _newTargets.push({ x: _wPos.x, y: _wPos.y });
      }
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
    // Faction-aware hull colors
    let _afs = (ship.nationKey && typeof FACTION_SHIPS !== 'undefined' && FACTION_SHIPS[ship.nationKey]) ? FACTION_SHIPS[ship.nationKey] : null;
    let hullR = _afs ? _afs.hullColor[0] : 90, hullG = _afs ? _afs.hullColor[1] : 62, hullB = _afs ? _afs.hullColor[2] : 28;
    let deckR = _afs ? _afs.deckColor[0] : 75, deckG = _afs ? _afs.deckColor[1] : 50, deckB = _afs ? _afs.deckColor[2] : 22;
    // Hull — faction-colored planks
    fill(hullR, hullG, hullB, hAlpha);
    beginShape();
    vertex(-12, -1); vertex(-10, 3); vertex(10, 3); vertex(12, -1);
    vertex(9, -3); vertex(-9, -3);
    endShape(CLOSE);
    // Hull stripe — deck color
    fill(deckR, deckG, deckB, hAlpha * 0.7);
    rect(-8, -1, 16, 1);
    // Faction hull shields (small dots along hull for nation ships)
    if (_afs && ship.nationKey && FACTION_MILITARY[ship.nationKey]) {
      let _shc = FACTION_MILITARY[ship.nationKey].conquestFlag;
      fill(_shc[0], _shc[1], _shc[2], hAlpha * 0.8);
      noStroke();
      for (let si = -6; si <= 6; si += 4) ellipse(si, -2, 2, 2);
    }
    // Ram or bow feature for faction war ships
    if (_afs && ship.type === 2) {
      if (_afs.hasRam) {
        let ramC = _afs.ramColor;
        fill(ramC[0], ramC[1], ramC[2], hAlpha);
        triangle(12, -1, 15, -2, 15, 1);
      } else if (_afs.hasDragon) {
        fill(35, 35, 40, hAlpha);
        triangle(12, -3, 16, -5, 13, 0);
      }
    }
    // Mast
    fill(hullR * 0.8, hullG * 0.8, hullB * 0.8, hAlpha);
    rect(-1, -16, 2, 14);
    // Sail — colored by ship type / faction
    let puff = sin(frameCount * 0.025 + ship.t * 20) * 1.5;
    let sailR, sailG, sailB;
    if (ship.nationKey && FACTION_MILITARY[ship.nationKey]) {
      let _nf = FACTION_MILITARY[ship.nationKey].conquestFlag;
      if (ship.type === 2) { sailR = _nf[0]; sailG = _nf[1] * 0.6; sailB = _nf[2] * 0.6; }
      else { sailR = _nf[0]; sailG = _nf[1]; sailB = _nf[2]; }
    } else if (ship.type === 0) { sailR = 240; sailG = 210; sailB = 140; }
    else if (ship.type === 2) { sailR = 200; sailG = 80; sailB = 70; }
    else { sailR = 235; sailG = 228; sailB = 210; }
    fill(sailR, sailG, sailB, hAlpha * 0.9);
    beginShape();
    vertex(0, -15); vertex(7 + puff, -9); vertex(0, -2);
    endShape(CLOSE);
    // Sail emblem stripe for faction ships
    if (_afs) {
      fill(sailR * 0.7, sailG * 0.7, sailB * 0.7, hAlpha * 0.5);
      rect(2, -12, 3, 1);
    }
    // Small flag at top — faction-colored or type-based
    if (_afs && FACTION_MILITARY[ship.nationKey]) {
      let _ff = FACTION_MILITARY[ship.nationKey].conquestFlag;
      fill(_ff[0], _ff[1], _ff[2], hAlpha);
    } else if (ship.type === 0) fill(220, 190, 60, hAlpha);
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
  if (state.expeditionModifierSelect) return;

  // ═══ INPUT ═══
  let dx = 0, dy = 0;
  if (isKeybindDown('moveLeft') || keyIsDown(LEFT_ARROW))  dx -= 1;
  if (isKeybindDown('moveRight') || keyIsDown(RIGHT_ARROW)) dx += 1;
  if (isKeybindDown('moveUp') || keyIsDown(UP_ARROW))    dy -= 1;
  if (isKeybindDown('moveDown') || keyIsDown(DOWN_ARROW))  dy += 1;
  if (dx === 0 && dy === 0 && typeof _touchJoystick !== 'undefined' && _touchJoystick.active) {
    dx = _touchJoystick.dx; dy = _touchJoystick.dy;
  }

  // ═══ SPEED ═══
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

  // ═══ MOVE ═══
  r.x += cos(r.angle) * r.speed * dt;
  r.y += sin(r.angle) * r.speed * dt;
  state.player.x = r.x;
  state.player.y = r.y;

  // ═══ WORLD BOUNDARY (circular, hardcoded center) ═══
  let _homeX = 600, _homeY = 400;
  let maxDist = 8000;
  let bDist = dist(r.x, r.y, _homeX, _homeY);
  if (bDist > maxDist) {
    let ang = atan2(r.y - _homeY, r.x - _homeX);
    r.x = _homeX + cos(ang) * maxDist;
    r.y = _homeY + sin(ang) * maxDist;
    r.speed *= 0.5;
  }

  // ═══ ISLAND PROXIMITY — dock detection only, NO collisions ═══
  r.nearIsle = null;
  let _isConquest = state._gameMode === 'conquest';

  // Nation islands — detect nearest for dock prompt + collision
  let _nationKeys = Object.keys(state.nations || {});
  for (let _nk of _nationKeys) {
    let _nv = state.nations[_nk];
    if (!_nv || _nv.defeated) continue;
    let _nrx = _nv.isleRX || 400, _nry = _nv.isleRY || 280;
    let _nvx = (r.x - _nv.isleX) / _nrx;
    let _nvy = (r.y - _nv.isleY) / _nry;
    let _nvDist = _nvx * _nvx + _nvy * _nvy;
    if (_nvDist < 2.5 * 2.5) r.nearIsle = _nk;
    // Collision — push ship out of island body
    if (_nvDist < 0.8 * 0.8) {
      let _nd = Math.sqrt(_nvDist);
      if (_nd > 0.01) {
        r.x = _nv.isleX + (_nvx / _nd) * 0.85 * _nrx;
        r.y = _nv.isleY + (_nvy / _nd) * 0.85 * _nry;
        r.speed *= 0.3;
      }
    }
  }

  // Campaign-only islands (skip entirely in Conquest)
  if (!_isConquest) {
    // Terra Nova
    if (state.conquest) {
      let cq = state.conquest;
      let cqN = ((r.x - cq.isleX) / cq.isleRX) ** 2 + ((r.y - cq.isleY) / cq.isleRY) ** 2;
      if (cqN < 1.5 * 1.5) r.nearIsle = 'conquest';
      if (cqN < 0.7 * 0.7) {
        let ang = atan2(r.y - cq.isleY, r.x - cq.isleX);
        r.x = cq.isleX + cos(ang) * cq.isleRX * 0.85;
        r.y = cq.isleY + sin(ang) * cq.isleRY * 0.85;
      }
    }
    // Exploration islands
    let _newIsles = [
      { key: 'vulcan', s: state.vulcan }, { key: 'hyperborea', s: state.hyperborea },
      { key: 'plenty', s: state.plenty }, { key: 'necropolis', s: state.necropolis },
    ];
    for (let ni of _newIsles) {
      if (!ni.s) continue;
      let nex = (r.x - ni.s.isleX) / ni.s.isleRX, ney = (r.y - ni.s.isleY) / ni.s.isleRY;
      let neDist = nex * nex + ney * ney;
      if (neDist < 1.5 * 1.5) r.nearIsle = ni.key;
      if (neDist < 0.7 * 0.7) {
        let ang = atan2(r.y - ni.s.isleY, r.x - ni.s.isleX);
        r.x = ni.s.isleX + cos(ang) * ni.s.isleRX * 0.85;
        r.y = ni.s.isleY + sin(ang) * ni.s.isleRY * 0.85;
      }
    }
  }

  // World islands proximity + collision (all modes)
  if (typeof WORLD_ISLANDS !== 'undefined') {
    for (let isle of WORLD_ISLANDS) {
      // Skip capitals only if state.nations actually handles them
      if (isle.faction && state.nations && state.nations[isle.faction] && !state.nations[isle.faction].defeated) continue;
      let pos = getIslandWorldPos(isle);
      let _wdx = (r.x - pos.x) / (isle.isleRX || 300);
      let _wdy = (r.y - pos.y) / (isle.isleRY || 200);
      let _wdist = _wdx * _wdx + _wdy * _wdy;
      if (_wdist < 2.5 * 2.5) r.nearIsle = isle.key;
      // Collision push-back
      if (_wdist < 0.7 * 0.7) {
        let _wd = Math.sqrt(_wdist);
        if (_wd > 0.01) {
          r.x = pos.x + (_wdx / _wd) * 0.85 * (isle.isleRX || 300);
          r.y = pos.y + (_wdy / _wd) * 0.85 * (isle.isleRY || 200);
          r.speed *= 0.3;
        }
      }
    }
  }

  // Home island collision (all modes) — use actual island size
  let _hRX = (state.islandRX || 500) * 0.85;
  let _hRY = (state.islandRY || 320) * 0.35;
  let _hDx = (r.x - _homeX) / _hRX, _hDy = (r.y - _homeY) / _hRY;
  if (_hDx * _hDx + _hDy * _hDy < 1.0) {
    let ang = atan2(r.y - _homeY, r.x - _homeX);
    r.x = _homeX + cos(ang) * _hRX * 1.1;
    r.y = _homeY + sin(ang) * _hRY * 1.1;
    r.speed *= 0.3;
  }

  // ═══ WAKE TRAIL ═══
  if (r.speed > 0.3 && frameCount % 4 === 0) {
    r.wakeTrail.push({ x: r.x - cos(r.angle) * 55, y: r.y - sin(r.angle) * 55, life: 40 });
  }
  r.wakeTrail.forEach(w => w.life--);
  r.wakeTrail = r.wakeTrail.filter(w => w.life > 0);

  // Sea events — random encounters while sailing
  if (typeof updateSeaEvents === 'function') updateSeaEvents();
  if (typeof checkSeaEvent === 'function') checkSeaEvent();
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
    let _sprayCount = min(8, floor(r.speed * 2));
    for (let i = 0; i < _sprayCount; i++) {
      let sp = floor(sin(frameCount * 0.2 + i * 1.5) * 5);
      let _spAlpha = 35 + r.speed * 8;
      fill(200, 225, 240, _spAlpha);
      rect(floor(sx + cos(r.angle) * 60 + sp) - 3, floor(sy + sin(r.angle) * 60 + bob - i * 2) - 1, 6, 3);
    }
    // Side spray arcs at high speed
    if (r.speed > 2.5) {
      let _sideAng = r.angle + HALF_PI;
      let _sprayStr = min(1, (r.speed - 2.5) / 2);
      for (let si = 0; si < 3; si++) {
        let _sOff = sin(frameCount * 0.15 + si * 2) * 8;
        let _sAlpha = 25 * _sprayStr;
        fill(210, 230, 245, _sAlpha);
        rect(floor(sx + cos(_sideAng) * (20 + _sOff) + cos(r.angle) * 30), floor(sy + sin(_sideAng) * (20 + _sOff) + sin(r.angle) * 30 + bob), 3, 2);
        rect(floor(sx - cos(_sideAng) * (20 + _sOff) + cos(r.angle) * 30), floor(sy - sin(_sideAng) * (20 + _sOff) + sin(r.angle) * 30 + bob), 3, 2);
      }
    }
  }
  // Foam line along wake at moderate speed
  if (r.speed > 0.8 && r.wakeTrail.length > 2) {
    let _foamCount = min(6, floor(r.speed * 1.5));
    for (let fi = 0; fi < _foamCount; fi++) {
      let _fIdx = min(fi, r.wakeTrail.length - 1);
      let _fw = r.wakeTrail[_fIdx];
      if (!_fw) continue;
      let _fAlpha = (_fw.life / 40) * 30;
      let _fOff = sin(frameCount * 0.05 + fi * 0.8) * 6;
      fill(220, 235, 248, _fAlpha);
      rect(floor(w2sX(_fw.x) + _fOff), floor(w2sY(_fw.y) + bob), 4, 2);
      rect(floor(w2sX(_fw.x) - _fOff), floor(w2sY(_fw.y) + bob), 4, 2);
    }
  }

  // Faction-aware ship data
  let _fs = FACTION_SHIPS[state.faction] || FACTION_SHIPS.rome;
  let _fm = getFactionMilitary();
  let _fc = _fm.conquestFlag || [160, 35, 25]; // shield/stripe color
  let _fEmblems = { rome:'SPQR', carthage:'BAAL', egypt:'ANKH', greece:'NIKA',
    seapeople:'KRAK', persia:'SHAH', phoenicia:'TYRS', gaul:'FERT' };
  let _emblem = _fEmblems[state.faction] || 'SPQR';

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
    fill(_fs.hullColor[0], _fs.hullColor[1], _fs.hullColor[2]);
    rect(-42, -13, 80, 26);       // main body
    rect(38, -10, 14, 20);        // bow taper
    rect(52, -4, 8, 8);           // bow tip
    rect(-45, -4, 3, 8);          // stern taper

    // Deck planking
    fill(_fs.deckColor[0], _fs.deckColor[1], _fs.deckColor[2]);
    rect(-35, -9, 73, 18);
    fill(_fs.hullColor[0]-15, _fs.hullColor[1]-13, _fs.hullColor[2]-8, 50);
    for (let i = 0; i < 8; i++) rect(-30 + i * 10, -8, 1, 16);

    // Bow feature — ram or dragon prow
    if (_fs.hasRam) {
      fill(_fs.ramColor[0], _fs.ramColor[1], _fs.ramColor[2]);
      rect(56, -3, 8, 6);
      rect(64, -2, 4, 4);
      rect(68, -1, 2, 2);
      fill(_fs.ramColor[0]+20, _fs.ramColor[1]+20, _fs.ramColor[2]+10, 150);
      rect(58, -1, 6, 2);
    } else if (_fs.hasDragon) {
      // Dragon figurehead (Sea Peoples)
      fill(60, 60, 70);
      rect(56, -6, 4, 12); rect(60, -8, 3, 6); rect(63, -10, 2, 4);
      fill(200, 80, 30); rect(62, -9, 2, 2); // dragon eye
      fill(80, 80, 90); rect(56, -3, 6, 6); // neck
    } else {
      // Simple curved prow (Egypt, Persia, Gaul)
      fill(_fs.hullColor[0]+10, _fs.hullColor[1]+10, _fs.hullColor[2]+5);
      rect(56, -5, 4, 10); rect(60, -6, 3, 4); rect(60, 2, 3, 4);
    }

    // Oar rows from above — pixel lines
    fill(100, 70, 35);
    for (let i = 0; i < _fs.oarCount; i++) {
      let oarSpacing = floor(50 / _fs.oarCount);
      let ox = -25 + i * oarSpacing;
      let oarSwing = floor(sin(r.oarPhase + i * 0.4) * 4);
      rect(ox, -27, 1, 14);       // top oar
      rect(ox + oarSwing, -27, 1, 2); // oar tip top
      rect(ox, 13, 1, 14);        // bottom oar
      rect(ox + oarSwing, 25, 1, 2);  // oar tip bottom
    }

    // Shields along gunwales — pixel rects (faction colors)
    for (let i = 0; i < 6; i++) {
      let shx = -18 + i * 11;
      fill(_fc[0], _fc[1], _fc[2]); rect(shx - 2, -13, 4, 4);
      fill(190, 160, 60); rect(shx - 1, -12, 2, 2);
      fill(_fc[0], _fc[1], _fc[2]); rect(shx - 2, 9, 4, 4);
      fill(190, 160, 60); rect(shx - 1, 10, 2, 2);
    }

    // Cabin/tower at bow — pixel rects (faction deck tints)
    fill(_fs.deckColor[0], _fs.deckColor[1], _fs.deckColor[2]);
    rect(24, -11, 20, 22);
    fill(_fs.deckColor[0]+20, _fs.deckColor[1]+17, _fs.deckColor[2]+2);
    rect(26, -9, 16, 18);
    // Planking lines on cabin roof
    fill(_fs.deckColor[0]-10, _fs.deckColor[1]-8, _fs.deckColor[2]-4, 80);
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
    // Faction stripe
    fill(_fc[0], _fc[1], _fc[2], 210);
    rect(-7 + floor(sailBillow * 0.5), -17, 8, 34);
    // Faction emblem text
    push();
    translate(-3 + floor(sailBillow * 0.5), 0);
    rotate(HALF_PI);
    fill(_fc[0]-10, _fc[1]-5, _fc[2]-5, 200);
    textSize(5); textAlign(CENTER, CENTER);
    text(_emblem, 0, 0);
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
    fill(_fs.hullColor[0], _fs.hullColor[1], _fs.hullColor[2]);
    rect(-42, -4, 77, 14);        // main body
    rect(35, -4, 17, 8);          // bow taper
    rect(52, -2, 6, 4);           // bow tip
    rect(-45, -2, 3, 12);         // stern
    // Hull planking lines
    fill(_fs.hullColor[0]+15, _fs.hullColor[1]+10, _fs.hullColor[2]+5, 70);
    rect(-40, 2, 90, 1);
    rect(-38, 6, 83, 1);

    // Bow feature — ram or dragon prow
    if (_fs.hasRam) {
      fill(_fs.ramColor[0], _fs.ramColor[1], _fs.ramColor[2]);
      rect(55, -3, 10, 6);
      rect(65, -2, 4, 4);
      rect(69, -1, 3, 2);
      fill(_fs.ramColor[0]+20, _fs.ramColor[1]+20, _fs.ramColor[2]+10, 150);
      rect(57, -1, 8, 2);
    } else if (_fs.hasDragon) {
      // Dragon prow (Sea Peoples) — side view rising neck + head
      fill(60, 60, 70);
      rect(52, -8, 3, 12); rect(55, -14, 3, 8); rect(58, -18, 3, 6);
      fill(80, 80, 90); rect(58, -20, 4, 4); // dragon head
      fill(200, 80, 30); rect(60, -19, 2, 2); // eye
      fill(50, 50, 55); rect(62, -18, 3, 2); // snout
    } else {
      // Elegant curved prow (Egypt, Persia, Gaul)
      fill(_fs.hullColor[0]+10, _fs.hullColor[1]+10, _fs.hullColor[2]+5);
      rect(52, -6, 3, 8); rect(55, -10, 3, 6); rect(58, -12, 2, 4);
      fill(_fs.hullColor[0]+30, _fs.hullColor[1]+25, _fs.hullColor[2]+10);
      rect(57, -14, 3, 3); // decorative prow finial
    }

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
    for (let i = 0; i < _fs.oarCount; i++) {
      let ox = -30 + i * floor(60 / _fs.oarCount);
      let oarOff = floor(sin(r.oarPhase + i * 0.4) * 4);
      // Top oars
      rect(ox, -4 - 14 + oarOff, 1, 14);
      // Bottom oars
      rect(ox, 10 - oarOff, 1, 14);
    }

    // Deck
    fill(_fs.deckColor[0], _fs.deckColor[1], _fs.deckColor[2]);
    rect(-40, -6, 88, 5);
    fill(_fs.deckColor[0]-15, _fs.deckColor[1]-13, _fs.deckColor[2]-7);
    rect(-40, -8, 88, 2);

    // Shields along sides — pixel rects (faction colors)
    for (let i = 0; i < 6; i++) {
      let shx = -25 + i * 12;
      fill(_fc[0], _fc[1], _fc[2]); rect(shx - 3, -7, 5, 5);
      fill(190, 160, 60); rect(shx - 1, -6, 2, 2);
      fill(_fc[0], _fc[1], _fc[2]); rect(shx - 3, 7, 5, 5);
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
    // Faction stripe on sail
    fill(_fc[0], _fc[1], _fc[2], 180);
    rect(-21 + sailBillow, -28, 34, 8);
    fill(_fc[0], _fc[1], _fc[2], 140);
    textSize(5); textAlign(CENTER, CENTER);
    text(_emblem, sailBillow - 4, -24);
    // Rigging
    stroke(100, 80, 50, 80); strokeWeight(1);
    line(-7, -42, -40, -6);
    line(-7, -42, 44, -6);
    noStroke();
    // Flag — pixel rect, faction color
    let flagWave = floor(sin(frameCount * 0.04) * 2);
    fill(_fc[0], _fc[1], _fc[2]);
    rect(-7, -50, 10 + flagWave, 4);
    rect(-7, -48, 6 + flagWave, 2);

    // Faction-specific deck emblem (Rome: eagle standard, Egypt: lotus, etc.)
    if (_fs.hasEagle) {
      // Roman eagle standard on deck
      fill(190, 160, 60); rect(10, -20, 2, 14); // pole
      fill(200, 170, 50); rect(7, -22, 8, 3); // eagle wings
      fill(220, 190, 60); rect(10, -23, 2, 2); // eagle head
    }

    // Bow tower — pixel rects (faction deck tints)
    fill(_fs.deckColor[0]+10, _fs.deckColor[1]+10, _fs.deckColor[2]);
    rect(30, -20, 18, 16);
    fill(_fs.deckColor[0]+25, _fs.deckColor[1]+22, _fs.deckColor[2]+5);
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

    // Captain in tower — pixel (faction colors)
    fill(_fc[0], _fc[1], _fc[2]);
    rect(37, -14, 6, 8);         // body (faction tunic)
    fill(180, 150, 70);
    rect(37, -17, 6, 4);         // armor
    fill(210, 170, 120);
    rect(37, -22, 6, 6);         // head
    fill(190, 160, 60);
    rect(37, -24, 6, 3);         // helmet
    fill(_fc[0]+40, _fc[1]+15, _fc[2]+15);
    rect(39, -26, 2, 3);         // plume (faction tint)

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


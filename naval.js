// ─── NAVAL COMBAT SYSTEM ─────────────────────────────────────────────────
// Broadside cannon ship combat during sailing mode

function clearNavalCombat() {
  if (!state.naval) return;
  state.naval.enemies.length = 0;
  state.naval.cannonballs.length = 0;
  state.naval.cannonCooldown = 0;
  state.naval.boardingTarget = null;
}

function updateNavalCombat(dt) {
  if (!state.rowing || !state.rowing.active) return;
  let nav = state.naval;
  if (!nav) return;
  let r = state.rowing;
  let px = r.x, py = r.y;

  // Wind system — slowly shift toward random target
  nav.wind.changeTimer -= dt;
  if (nav.wind.changeTimer <= 0) {
    nav.wind.targetAngle = random(TWO_PI);
    nav.wind.changeTimer = random(1200, 2400);
  }
  let _wDiff = nav.wind.targetAngle - nav.wind.angle;
  while (_wDiff > PI) _wDiff -= TWO_PI;
  while (_wDiff < -PI) _wDiff += TWO_PI;
  nav.wind.angle += _wDiff * 0.002 * dt;

  // Cannon cooldown
  if (nav.cannonCooldown > 0) nav.cannonCooldown -= dt;

  // Spawn enemies near hostile nation islands (reputation < -20)
  let _nKeys = Object.keys(state.nations || {});
  for (let _nk of _nKeys) {
    let _nv = state.nations[_nk];
    if (!_nv || _nv.defeated || _nv.reputation > -20) continue;
    let _nd = dist(px, py, _nv.isleX, _nv.isleY);
    if (_nd < 1500 && nav.enemies.length < 3 && random() < 0.02) {
      let spawnAngle = random(TWO_PI);
      let spawnDist = 600 + random(200);
      let eHP = 40 + _nv.level * 10;
      nav.enemies.push({
        x: px + cos(spawnAngle) * spawnDist,
        y: py + sin(spawnAngle) * spawnDist,
        hp: eHP, maxHp: eHP,
        heading: atan2(-sin(spawnAngle), -cos(spawnAngle)),
        speed: 1.2 + _nv.level * 0.15,
        fireTimer: 60, faction: _nk,
        damage: 8 + _nv.level * 2,
        lootGold: 20 + _nv.level * 10,
        lootWood: floor(random(3, 8)),
      });
    }
  }

  // Update enemy ships — broadside AI
  for (let i = nav.enemies.length - 1; i >= 0; i--) {
    let e = nav.enemies[i];
    let toPlayer = atan2(py - e.y, px - e.x);
    let eDist = dist(e.x, e.y, px, py);

    // Steer to broadside position (perpendicular to player)
    let broadsideAngle = toPlayer + HALF_PI;
    if (eDist < 150) broadsideAngle = toPlayer + PI; // too close, back off
    else if (eDist > 400) broadsideAngle = toPlayer; // too far, close in

    let steerDiff = broadsideAngle - e.heading;
    while (steerDiff > PI) steerDiff -= TWO_PI;
    while (steerDiff < -PI) steerDiff += TWO_PI;
    e.heading += constrain(steerDiff, -0.02, 0.02) * dt;

    // Wind affects enemy speed
    let eWindMult = 0.6 + cos(e.heading - nav.wind.angle) * 0.4;
    e.x += cos(e.heading) * e.speed * eWindMult * dt;
    e.y += sin(e.heading) * e.speed * eWindMult * dt;

    // Fire when player is broadside (perpendicular ± 30 degrees)
    let angleToPlayer = atan2(py - e.y, px - e.x);
    let relAngle = angleToPlayer - e.heading;
    while (relAngle > PI) relAngle -= TWO_PI;
    while (relAngle < -PI) relAngle += TWO_PI;
    if ((abs(abs(relAngle) - HALF_PI) < 0.5) && eDist < 350) {
      if (e.fireTimer <= 0) {
        _fireCannonball(e.x, e.y, angleToPlayer, e.damage || 10, true);
        e.fireTimer = 90;
        if (snd) snd.playSFX('arrow_shoot');
      }
    }
    e.fireTimer = max(0, e.fireTimer - dt);

    // Remove if too far
    if (eDist > 2000) { nav.enemies.splice(i, 1); continue; }

    // Sunk — loot
    if (e.hp <= 0) {
      state.gold += e.lootGold || 15;
      state.wood += e.lootWood || 3;
      addFloatingText(w2sX(e.x), w2sY(e.y), '+' + (e.lootGold || 15) + 'g', '#ffcc44');
      spawnParticles(e.x, e.y, 'divine', 8);
      if (snd) snd.playSFX('death_enemy');
      if (e.faction && state.nations[e.faction]) state.nations[e.faction].reputation -= 5;
      nav.enemies.splice(i, 1);
      continue;
    }
  }

  // Update cannonballs
  for (let i = nav.cannonballs.length - 1; i >= 0; i--) {
    let cb = nav.cannonballs[i];
    cb.x += cb.vx * dt;
    cb.y += cb.vy * dt;
    cb.life -= dt;
    if (cb.life <= 0) { nav.cannonballs.splice(i, 1); continue; }

    if (!cb.isEnemy) {
      // Player cannonball vs enemies
      for (let e of nav.enemies) {
        if (dist(cb.x, cb.y, e.x, e.y) < 25) {
          e.hp -= cb.damage;
          spawnParticles(cb.x, cb.y, 'build', 3);
          triggerScreenShake(2, 8);
          if (snd) snd.playSFX('hit');
          nav.cannonballs.splice(i, 1);
          break;
        }
      }
    } else {
      // Enemy cannonball vs player
      if (dist(cb.x, cb.y, px, py) < 30) {
        nav.shipHP -= cb.damage;
        triggerScreenShake(5, 15);
        spawnParticles(px, py, 'build', 4);
        if (snd) snd.playSFX('armor_hit');
        nav.cannonballs.splice(i, 1);
        if (nav.shipHP <= 0) {
          nav.shipHP = 0;
          addFloatingText(width / 2, height * 0.3, 'SHIP DAMAGED! Retreat to port!', '#ff4444');
          nav.enemies.length = 0;
          nav.cannonballs.length = 0;
          nav.shipHP = floor(nav.shipMaxHP * 0.2);
        }
      }
    }
  }

  // Boarding check — low HP enemies nearby
  nav.boardingTarget = null;
  for (let e of nav.enemies) {
    if (e.hp > 0 && e.hp <= e.maxHp * 0.25 && dist(px, py, e.x, e.y) < 120) {
      nav.boardingTarget = e;
      e.speed *= 0.95;
      break;
    }
  }
}

function _fireCannonball(x, y, angle, damage, isEnemy) {
  state.naval.cannonballs.push({
    x: x, y: y,
    vx: cos(angle) * 5, vy: sin(angle) * 5,
    damage: damage, isEnemy: isEnemy, life: 60,
  });
}

function playerFireCannons() {
  let nav = state.naval;
  if (!nav || nav.cannonCooldown > 0) return;
  if (!state.rowing || !state.rowing.active) return;
  let r = state.rowing;
  let portAngle = r.angle + HALF_PI;
  let starAngle = r.angle - HALF_PI;

  // Auto-detect which side has enemies
  let bestAngle = portAngle;
  let bestDist = 99999;
  for (let e of nav.enemies) {
    let eAngle = atan2(e.y - r.y, e.x - r.x);
    let portDiff = eAngle - portAngle;
    while (portDiff > PI) portDiff -= TWO_PI;
    while (portDiff < -PI) portDiff += TWO_PI;
    let starDiff = eAngle - starAngle;
    while (starDiff > PI) starDiff -= TWO_PI;
    while (starDiff < -PI) starDiff += TWO_PI;
    let eDist = dist(r.x, r.y, e.x, e.y);
    if (abs(portDiff) < 1.0 && eDist < bestDist) { bestAngle = portAngle; bestDist = eDist; }
    if (abs(starDiff) < 1.0 && eDist < bestDist) { bestAngle = starAngle; bestDist = eDist; }
  }

  // Fire 2 cannonballs in spread
  let dmg = nav.cannonDamage + nav.cannonLevel * 5;
  _fireCannonball(r.x, r.y, bestAngle - 0.1, dmg, false);
  _fireCannonball(r.x, r.y, bestAngle + 0.1, dmg, false);
  nav.cannonCooldown = nav.reloadTime;
  triggerScreenShake(4, 12);
  if (snd) snd.playSFX('arrow_shoot');
}

function startBoardingCombat() {
  let nav = state.naval;
  let e = nav.boardingTarget;
  if (!e) return;
  let a = state.adventure;
  a.returnX = state.rowing.x;
  a.returnY = state.rowing.y;
  a.active = true;
  a.wave = 0; a.waveState = 'idle';
  a.enemies = []; a.loot = [];
  a.killCount = 0; a.goldEarned = 0; a.xpEarned = 0;
  state.rowing.active = false;
  state._boardingEnemy = e;
  state.player.hp = state.player.maxHp;
  state.player.x = e.x; state.player.y = e.y;
  state.player.vx = 0; state.player.vy = 0;
  state.player.invincTimer = 60;
  cam.x = e.x; cam.y = e.y;
  camSmooth.x = e.x; camSmooth.y = e.y;
  addFloatingText(width / 2, height * 0.3, 'BOARDING ACTION!', '#ff8844');
  // Spawn melee enemies on deck
  let count = 2 + floor(random(3));
  for (let ii = 0; ii < count; ii++) {
    a.enemies.push({
      x: e.x + random(-40, 40), y: e.y + random(-30, 30),
      vx: 0, vy: 0, hp: 20 + (e.damage || 10), maxHp: 20 + (e.damage || 10),
      type: 'pirate', speed: 1.2, atk: 5 + floor((e.damage || 10) / 3),
      knockbackTimer: 0, state: 'chase', stateTimer: 60,
      facing: 1, invincTimer: 0, flashTimer: 0,
    });
  }
  a.waveTimer = 0; a.waveState = 'fighting';
  let idx = nav.enemies.indexOf(e);
  if (idx >= 0) nav.enemies.splice(idx, 1);
  nav.boardingTarget = null;
}

// ─── DRAWING ─────────────────────────────────────────────────────────────

function drawNavalCombat() {
  if (!state.rowing || !state.rowing.active) return;
  let nav = state.naval;
  if (!nav) return;

  // Draw enemy ships
  for (let e of nav.enemies) {
    let sx = w2sX(e.x), sy = w2sY(e.y);
    if (sx < -100 || sx > width + 100 || sy < -100 || sy > height + 100) continue;
    let bob = sin(frameCount * 0.03 + e.x * 0.01) * 2;
    push();
    translate(floor(sx), floor(sy + bob));
    rotate(e.heading);
    noStroke();
    // Hull
    let fCol = _getNavalFactionColor(e.faction);
    fill(75, 45, 20);
    rect(-30, -8, 60, 16); rect(28, -5, 10, 10); rect(-33, -3, 4, 6);
    // Deck
    fill(95, 65, 30);
    rect(-25, -6, 50, 12);
    // Sail — faction colored
    fill(fCol[0], fCol[1], fCol[2], 220);
    rect(-12, -20, 24, 16);
    // Mast
    fill(90, 60, 28);
    rect(-1, -22, 2, 20);
    // Oars
    fill(100, 70, 35);
    for (let oi = 0; oi < 4; oi++) {
      let ox = -18 + oi * 11;
      let oarOff = floor(sin(frameCount * 0.06 + oi * 0.5) * 3);
      rect(ox, -16 + oarOff, 1, 8); rect(ox, 8 - oarOff, 1, 8);
    }
    pop();

    // HP bar
    if (e.hp < e.maxHp) {
      let barW = 40, barX = floor(sx - 20), barY = floor(sy + bob - 28);
      noStroke();
      fill(40, 40, 40, 180); rect(barX - 1, barY - 1, barW + 2, 5);
      let hpPct = e.hp / e.maxHp;
      fill(hpPct > 0.5 ? color(60, 180, 60) : hpPct > 0.25 ? color(220, 180, 40) : color(220, 50, 30));
      rect(barX, barY, floor(barW * hpPct), 3);
    }

    // Boarding prompt
    if (nav.boardingTarget === e) {
      fill(255, 200, 80, 200 + sin(frameCount * 0.08) * 40);
      noStroke(); textAlign(CENTER, CENTER); textSize(11);
      text('[E] Board!', floor(sx), floor(sy + bob - 36));
      textAlign(LEFT, TOP);
    }
  }

  // Draw cannonballs
  noStroke();
  for (let cb of nav.cannonballs) {
    let cbx = w2sX(cb.x), cby = w2sY(cb.y);
    fill(120, 110, 100, 60);
    ellipse(cbx - cb.vx * 2, cby - cb.vy * 2, 6, 6);
    fill(30, 30, 30);
    ellipse(cbx, cby, 5, 5);
  }

  // Wind arrow HUD — top right
  push();
  let _waX = width - 50, _waY = 50;
  translate(_waX, _waY);
  fill(255, 255, 255, 100); noStroke();
  textAlign(CENTER, CENTER); textSize(8);
  text('WIND', 0, -16);
  rotate(nav.wind.angle);
  stroke(255, 255, 255, 180); strokeWeight(2);
  line(0, -10, 0, 10); line(0, 10, -4, 4); line(0, 10, 4, 4);
  noStroke(); pop();

  // Ship HP bar on HUD
  if (nav.shipHP < nav.shipMaxHP) {
    let hpBarX = width / 2 - 50, hpBarY = height - 40;
    noStroke(); fill(40, 40, 40, 180);
    rect(hpBarX - 1, hpBarY - 1, 102, 10);
    let hpPct = nav.shipHP / nav.shipMaxHP;
    fill(hpPct > 0.5 ? color(60, 180, 60) : hpPct > 0.25 ? color(220, 180, 40) : color(220, 50, 30));
    rect(hpBarX, hpBarY, floor(100 * hpPct), 8);
    fill(255, 255, 255, 200); textAlign(CENTER, CENTER); textSize(7);
    text('HULL ' + nav.shipHP + '/' + nav.shipMaxHP, hpBarX + 50, hpBarY + 4);
    textAlign(LEFT, TOP);
  }

  // Reload indicator
  if (nav.cannonCooldown > 0) {
    fill(255, 180, 80, 180); noStroke();
    textAlign(CENTER, CENTER); textSize(10);
    text('RELOAD...', width / 2, height - 55);
    textAlign(LEFT, TOP);
  }

  // Enemy count
  if (nav.enemies.length > 0) {
    fill(255, 100, 80, 200); noStroke();
    textAlign(CENTER, CENTER); textSize(10);
    text('HOSTILE SHIPS: ' + nav.enemies.length, width / 2, height - 70);
    textAlign(LEFT, TOP);
  }
}

function _getNavalFactionColor(faction) {
  let colors = {
    carthage: [140, 40, 160], egypt: [40, 120, 180], greece: [60, 120, 200],
    rome: [180, 40, 30], seapeople: [60, 60, 60], persia: [180, 140, 40],
    phoenicia: [180, 60, 100], gaul: [60, 140, 60],
  };
  return colors[faction] || [150, 100, 60];
}

// ─── SHIPYARD UPGRADE UI ─────────────────────────────────────────────────

let _shipyardOpen = false;
let _shipyardHover = -1;
function openShipyard() { _shipyardOpen = true; _shipyardHover = -1; }
function closeShipyard() { _shipyardOpen = false; }

function drawShipyardUI() {
  if (!_shipyardOpen) return;
  let nav = state.naval;
  let cx = width / 2, cy = height / 2;
  fill(20, 15, 10, 220); noStroke();
  rect(cx - 160, cy - 120, 320, 240);
  stroke(140, 110, 60); strokeWeight(2); noFill();
  rect(cx - 158, cy - 118, 316, 236); noStroke();
  fill(220, 190, 130); textAlign(CENTER, CENTER); textSize(14);
  text('SHIPYARD', cx, cy - 100);

  let upgrades = [
    { name: 'Hull Plating', stat: 'hullLevel', max: 3, desc: '+25 HP', costIron: 5 + nav.hullLevel * 3, costWood: 8 + nav.hullLevel * 4 },
    { name: 'Cannons', stat: 'cannonLevel', max: 3, desc: '+5 damage', costIron: 4 + nav.cannonLevel * 3, costGold: 30 + nav.cannonLevel * 20 },
    { name: 'Sails', stat: 'sailLevel', max: 3, desc: '+15% speed', costWood: 10 + nav.sailLevel * 5, costGold: 20 + nav.sailLevel * 10 },
  ];
  for (let i = 0; i < upgrades.length; i++) {
    let u = upgrades[i];
    let yy = cy - 55 + i * 60;
    let lv = nav[u.stat], maxed = lv >= u.max;
    fill(_shipyardHover === i ? color(50, 40, 25) : color(35, 28, 18));
    rect(cx - 140, yy - 18, 280, 50);
    fill(maxed ? color(120, 200, 120) : color(220, 200, 150));
    textAlign(LEFT, CENTER); textSize(11);
    text(u.name + ' [LV.' + lv + '/' + u.max + ']', cx - 130, yy);
    fill(160, 150, 120); textSize(9);
    text(u.desc + ' per level', cx - 130, yy + 14);
    if (!maxed) {
      let costStr = '';
      if (u.costIron) costStr += u.costIron + ' iron  ';
      if (u.costWood) costStr += u.costWood + ' wood  ';
      if (u.costGold) costStr += u.costGold + 'g  ';
      fill(180, 160, 100); textSize(8); textAlign(RIGHT, CENTER);
      text(costStr, cx + 130, yy);
    } else {
      fill(100, 180, 100); textSize(9); textAlign(RIGHT, CENTER);
      text('MAX', cx + 130, yy);
    }
  }
  fill(160, 140, 100); textAlign(CENTER, CENTER); textSize(9);
  text('[ESC] Close', cx, cy + 105);
  textAlign(LEFT, TOP);
  _shipyardHover = -1;
  for (let i = 0; i < 3; i++) {
    let yy = cy - 55 + i * 60;
    if (mouseX > cx - 140 && mouseX < cx + 140 && mouseY > yy - 18 && mouseY < yy + 32) _shipyardHover = i;
  }
}

function handleShipyardClick() {
  if (!_shipyardOpen || _shipyardHover < 0) return false;
  let nav = state.naval;
  let upgrades = [
    { stat: 'hullLevel', max: 3, costIron: 5 + nav.hullLevel * 3, costWood: 8 + nav.hullLevel * 4 },
    { stat: 'cannonLevel', max: 3, costIron: 4 + nav.cannonLevel * 3, costGold: 30 + nav.cannonLevel * 20 },
    { stat: 'sailLevel', max: 3, costWood: 10 + nav.sailLevel * 5, costGold: 20 + nav.sailLevel * 10 },
  ];
  let u = upgrades[_shipyardHover];
  if (nav[u.stat] >= u.max) return true;
  if (u.costIron && (state.ironOre || 0) < u.costIron) { addFloatingText(width / 2, height * 0.25, 'Not enough iron!', '#ff6644'); return true; }
  if (u.costWood && state.wood < u.costWood) { addFloatingText(width / 2, height * 0.25, 'Not enough wood!', '#ff6644'); return true; }
  if (u.costGold && state.gold < u.costGold) { addFloatingText(width / 2, height * 0.25, 'Not enough gold!', '#ff6644'); return true; }
  if (u.costIron) state.ironOre -= u.costIron;
  if (u.costWood) state.wood -= u.costWood;
  if (u.costGold) state.gold -= u.costGold;
  nav[u.stat]++;
  if (u.stat === 'hullLevel') { nav.shipMaxHP = 100 + nav.hullLevel * 25; nav.shipHP = nav.shipMaxHP; }
  if (u.stat === 'cannonLevel') nav.cannonDamage = 15 + nav.cannonLevel * 5;
  if (snd) snd.playSFX('build');
  addFloatingText(width / 2, height * 0.25, 'Ship upgraded!', '#88ccff');
  return true;
}

function drawShipyardBuilding(b) {
  // Simple pixel-art shipyard building
  let sx = w2sX(b.x), sy = w2sY(b.y);
  noStroke();
  // Foundation
  fill(90, 70, 45);
  rect(sx - 30, sy - 10, 60, 30);
  // Roof
  fill(120, 85, 40);
  rect(sx - 32, sy - 16, 64, 8);
  // Crane arm
  fill(80, 60, 30);
  rect(sx + 20, sy - 40, 3, 30);
  rect(sx + 10, sy - 40, 15, 2);
  // Water edge
  fill(100, 160, 200, 80);
  rect(sx - 28, sy + 18, 56, 6);
  // Label
  fill(200, 180, 130, 180);
  textAlign(CENTER, CENTER); textSize(7);
  text('Shipyard', sx, sy - 22);
  textAlign(LEFT, TOP);
}

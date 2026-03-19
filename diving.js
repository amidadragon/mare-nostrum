// ═══ MARE NOSTRUM — DIVING SYSTEM (In-World) ════════════════════════════════
// Diving happens in the SAME world space as the island. When you dive,
// underwater entities spawn in the shallow water zone around the island.
// The camera stays the same, player moves with WASD, blue tint overlay.
// Surface by pressing D again or swimming back onto land.

const DIVE_TREASURES = [
  { type: 'pearl', name: 'Pearl', value: 15, rarity: 0.35, col: [240, 235, 255] },
  { type: 'sponge', name: 'Sea Sponge', value: 5, rarity: 0.45, col: [200, 180, 100] },
  { type: 'coral_piece', name: 'Coral', value: 8, rarity: 0.35, col: [255, 100, 80] },
  { type: 'amphora', name: 'Amphora', value: 40, rarity: 0.08, col: [180, 120, 60] },
  { type: 'gold_coin', name: 'Roman Coin', value: 25, rarity: 0.12, col: [220, 190, 60] },
  { type: 'ancient_helm', name: "Neptune's Helm", value: 100, rarity: 0.015, col: [100, 200, 180] },
];

function initDiveWorld() {
  let d = state.diving;
  if (d.treasures.length > 0) return; // already populated

  let cx = WORLD.islandCX, cy = WORLD.islandCY;
  let srx = state.islandRX, sry = state.islandRY;

  // Scatter treasures in the shallow water ring around the island
  for (let i = 0; i < 20; i++) {
    let angle = random(TWO_PI);
    let rim = random(1.05, 1.6); // just outside island edge
    let tx = cx + cos(angle) * srx * rim;
    let ty = cy + sin(angle) * sry * 0.45 * rim;

    let roll = random(), cumulative = 0;
    let tType = DIVE_TREASURES[0];
    for (let t of DIVE_TREASURES) {
      cumulative += t.rarity;
      if (roll < cumulative) { tType = t; break; }
    }
    d.treasures.push({
      x: tx, y: ty,
      type: tType.type, name: tType.name, value: tType.value,
      col: tType.col, collected: false, sparkle: random(TWO_PI),
      respawnTimer: 0,
    });
  }

  // Scatter sea creatures
  for (let i = 0; i < 25; i++) {
    let angle = random(TWO_PI);
    let rim = random(1.0, 1.8);
    let cx2 = cx + cos(angle) * srx * rim;
    let cy2 = cy + sin(angle) * sry * 0.45 * rim;
    let types = ['fish','fish','fish','jellyfish','turtle','octopus','seahorse'];
    let type = types[floor(random(types.length))];
    let colors = {
      fish: [[60,140,200],[200,160,40],[120,200,120],[200,100,60],[180,80,140]],
      jellyfish: [[180,120,255],[255,150,200]],
      turtle: [[80,140,60]],
      octopus: [[180,60,80],[100,60,140]],
      seahorse: [[255,180,60],[200,100,150]],
    };
    let col = colors[type][floor(random(colors[type].length))];
    let spd = { fish: 0.8, jellyfish: 0.2, turtle: 0.4, octopus: 0.3, seahorse: 0.15 }[type];
    d.creatures.push({
      x: cx2, y: cy2,
      vx: (random() > 0.5 ? 1 : -1) * spd * random(0.5, 1.2),
      vy: random(-0.1, 0.1),
      type, col, frame: random(TWO_PI),
      homeX: cx2, homeY: cy2, // wander around home
    });
  }

  // Seabed decorations
  for (let i = 0; i < 50; i++) {
    let angle = random(TWO_PI);
    let rim = random(1.0, 1.7);
    let sx = cx + cos(angle) * srx * rim;
    let sy = cy + sin(angle) * sry * 0.45 * rim;
    let types = ['sand','sand','rock','coral','seagrass','seagrass','shell'];
    d.seabed.push({
      x: sx, y: sy,
      type: types[floor(random(types.length))],
      size: random(6, 18), sway: random(TWO_PI),
    });
  }
}

function startDive() {
  let d = state.diving;
  if (d.active) { exitDive(); return; } // toggle
  // Must be in shallow water or near water
  let inShallow = typeof isInShallows === 'function' && isInShallows(state.player.x, state.player.y);
  let nearWater = !isOnIsland(state.player.x, state.player.y);
  if (!inShallow && !nearWater) {
    addFloatingText(width / 2, height * 0.4, 'Walk to the water to dive!', '#aaaaaa');
    return;
  }
  d.active = true;
  d.breath = d.maxBreath + d.lungCapacity * 25;
  d.totalDives++;
  initDiveWorld();
  addFloatingText(width / 2, height * 0.25, 'DIVING', '#66ccff');
  if (typeof unlockJournal === 'function') unlockJournal('first_dive');
  if (typeof snd !== 'undefined' && snd) snd.playSFX('water');
}

function exitDive() {
  let d = state.diving;
  if (!d.active) return;
  d.active = false;

  let collected = d.treasures.filter(t => t.collected);
  let lootValue = 0;
  for (let t of collected) {
    lootValue += t.value;
    switch (t.type) {
      case 'pearl': d.pearls++; break;
      case 'sponge': d.sponges++; break;
      case 'coral_piece': d.coral++; break;
      case 'amphora': d.amphoras++; state.gold += 20; break;
      case 'gold_coin': state.gold += t.value; break;
      case 'ancient_helm': state.gold += t.value;
        if (typeof unlockJournal === 'function') unlockJournal('neptunes_helm'); break;
    }
  }
  if (collected.length > 0) {
    addFloatingText(width / 2, height * 0.25, collected.length + ' treasures collected!', '#66ccff');
    addFloatingText(width / 2, height * 0.32, '+' + lootValue + ' value', '#ffcc44');
  } else {
    addFloatingText(width / 2, height * 0.3, 'Surfaced', '#88bbcc');
  }
}

function updateDiving(dt) {
  let d = state.diving;
  if (!d.active) return;

  // Breath
  d.breath -= 0.08 * dt;
  if (d.breath <= 0) {
    d.breath = 0;
    exitDive();
    state.player.hp -= 15;
    addFloatingText(width / 2, height * 0.25, 'Out of breath! -15 HP', '#ff6644');
    return;
  }

  // Auto-exit when back on island
  if (isOnIsland(state.player.x, state.player.y)) {
    exitDive();
    return;
  }

  // Player moves normally (handled by updatePlayer), but slower underwater
  // We just track diving state here

  // Collect nearby treasures
  let px = state.player.x, py = state.player.y;
  for (let t of d.treasures) {
    if (t.collected || t.respawnTimer > 0) continue;
    if (abs(px - t.x) < 22 && abs(py - t.y) < 22) {
      t.collected = true;
      addFloatingText(w2sX(t.x), w2sY(t.y) - 15, t.name + '!', '#ffdd88');
      if (typeof snd !== 'undefined' && snd) snd.playSFX('bubble_pop');
    }
  }

  // Respawn collected treasures after long time
  for (let t of d.treasures) {
    if (t.collected) {
      t.respawnTimer = (t.respawnTimer || 0) + dt;
      if (t.respawnTimer > 3600) { // ~60 seconds
        t.collected = false;
        t.respawnTimer = 0;
      }
    }
  }

  // Update creatures — they swim around their home area
  for (let c of d.creatures) {
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.frame += 0.05 * dt;

    // Wander back toward home
    let dx = c.homeX - c.x, dy = c.homeY - c.y;
    let dd = sqrt(dx * dx + dy * dy);
    if (dd > 120) {
      c.vx += (dx / dd) * 0.02;
      c.vy += (dy / dd) * 0.01;
    }
    // Random direction change
    if (random() < 0.005) {
      c.vx += random(-0.3, 0.3);
      c.vy += random(-0.1, 0.1);
    }
    // Clamp speed
    let spd = sqrt(c.vx * c.vx + c.vy * c.vy);
    let maxSpd = 1.2;
    if (spd > maxSpd) { c.vx *= maxSpd / spd; c.vy *= maxSpd / spd; }

    // Flee from player
    let cdx = c.x - px, cdy = c.y - py;
    let cd = sqrt(cdx * cdx + cdy * cdy);
    if (cd < 50 && cd > 0) {
      c.vx += (cdx / cd) * 0.15;
      c.vy += (cdy / cd) * 0.05;
    }
  }

  // Sea enemies — hostile creatures that attack the diver
  if (!d.seaEnemies) d.seaEnemies = [];
  // Spawn enemies — max 3, spawn on dive start or periodically
  if (d.seaEnemies.length === 0 && d.totalDives > 0) {
    // Spawn initial enemies on first frame of dive
    for (let i = 0; i < 2; i++) {
      let angle = random(TWO_PI);
      let spawnDist = 150 + random(100);
      let types = ['shark', 'eel', 'crab_giant'];
      let type = types[floor(random(types.length))];
      let stats = { shark: { hp: 60, dmg: 12, spd: 1.2, size: 14 }, eel: { hp: 30, dmg: 8, spd: 0.9, size: 8 }, crab_giant: { hp: 80, dmg: 15, spd: 0.5, size: 12 } };
      let s = stats[type];
      d.seaEnemies.push({
        x: px + cos(angle) * spawnDist, y: py + sin(angle) * spawnDist,
        vx: 0, vy: 0, hp: s.hp, maxHp: s.hp, dmg: s.dmg, spd: s.spd,
        size: s.size, type: type, attackTimer: 0, flashTimer: 0,
      });
    }
  }
  if (d.seaEnemies.filter(e => e.hp > 0).length < 3 && random() < 0.003 * dt) {
    let angle = random(TWO_PI);
    let spawnDist = 250 + random(100);
    let types = ['shark', 'eel', 'crab_giant'];
    let type = types[floor(random(types.length))];
    let stats = { shark: { hp: 60, dmg: 12, spd: 1.2, size: 14 }, eel: { hp: 30, dmg: 8, spd: 0.9, size: 8 }, crab_giant: { hp: 80, dmg: 15, spd: 0.5, size: 12 } };
    let s = stats[type];
    d.seaEnemies.push({
      x: px + cos(angle) * spawnDist, y: py + sin(angle) * spawnDist,
      vx: 0, vy: 0, hp: s.hp, maxHp: s.hp, dmg: s.dmg, spd: s.spd,
      size: s.size, type: type, attackTimer: 0, flashTimer: 0,
    });
  }
  // Update sea enemies
  for (let e of d.seaEnemies) {
    if (e.hp <= 0) continue;
    if (e.flashTimer > 0) e.flashTimer -= dt;
    // Chase player
    let edx = px - e.x, edy = py - e.y;
    let ed = sqrt(edx * edx + edy * edy);
    if (ed > 0 && ed < 200) {
      e.vx += (edx / ed) * e.spd * 0.03 * dt;
      e.vy += (edy / ed) * e.spd * 0.03 * dt;
    }
    let espd = sqrt(e.vx * e.vx + e.vy * e.vy);
    if (espd > e.spd) { e.vx *= e.spd / espd; e.vy *= e.spd / espd; }
    e.x += e.vx * dt; e.y += e.vy * dt;
    e.attackTimer -= dt;
    // Attack player on contact
    if (ed < 20 && e.attackTimer <= 0) {
      state.player.hp -= e.dmg;
      e.attackTimer = 60;
      addFloatingText(w2sX(px), w2sY(py) - 20, '-' + e.dmg + ' HP', '#ff4444');
      if (typeof snd !== 'undefined' && snd) snd.playSFX('player_hurt');
      if (state.player.hp <= 0) { exitDive(); addFloatingText(width / 2, height * 0.25, 'Dragged to surface!', '#ff6644'); }
    }
    // Player can attack them
    if (e.hp > 0 && state.player.slashPhase > 0 && ed < state.player.attackRange + e.size && e.flashTimer <= 0) {
      e.hp -= state.player.attackDamage;
      e.flashTimer = 8;
      addFloatingText(w2sX(e.x), w2sY(e.y) - 10, '-' + state.player.attackDamage, '#ffcc44');
      // Knockback
      if (ed > 0) { e.vx += (e.x - px) / ed * 3; e.vy += (e.y - py) / ed * 3; }
      if (e.hp <= 0) {
        // Loot drop
        let loot = e.type === 'shark' ? 'rareHide' : e.type === 'crab_giant' ? 'ironOre' : 'fish';
        let amt = e.type === 'shark' ? 2 : 1;
        state[loot] = (state[loot] || 0) + amt;
        addFloatingText(w2sX(e.x), w2sY(e.y) - 20, '+' + amt + ' ' + loot, '#88ddff');
        if (typeof snd !== 'undefined' && snd) snd.playSFX('fish_catch');
        if (typeof grantXP === 'function') grantXP(15);
      }
    }
  }
  // Mark dead enemies for removal — give 15 frame death animation
  for (let e of d.seaEnemies) {
    if (e.hp <= 0 && !e._deathTimer) e._deathTimer = 15;
    if (e._deathTimer > 0) e._deathTimer -= dt;
  }
  d.seaEnemies = d.seaEnemies.filter(e => e.hp > 0 || (e._deathTimer && e._deathTimer > 0));

  // Player breath bubbles (world particles)
  if (frameCount % 25 === 0) {
    particles.push({
      x: px + random(-4, 4), y: py - 5,
      vx: random(-0.1, 0.1), vy: -random(0.3, 0.8),
      life: 40, maxLife: 40, type: 'bubble',
      r: 180, g: 220, b: 255, size: random(2, 5), world: true,
    });
  }
}

// Draw underwater overlay + entities (called from normal island draw pipeline)
function drawDivingOverlay() {
  let d = state.diving;
  if (!d.active) return;

  // Blue water tint over everything
  noStroke();
  fill(10, 40, 80, 90);
  rect(0, 0, width, height);

  // Sandy seabed ground — gradient from mid-screen to bottom
  let seabedTop = height * 0.6;
  for (let band = 0; band < 6; band++) {
    let y = seabedTop + band * (height - seabedTop) / 6;
    let d2 = band / 5;
    fill(lerp(60, 35, d2), lerp(80, 55, d2), lerp(55, 35, d2), 60 + d2 * 40);
    rect(0, y, width, (height - seabedTop) / 6 + 2);
  }
  // Sand texture — scattered dots
  fill(120, 110, 80, 25);
  for (let i = 0; i < 30; i++) {
    let sx = (i * 47 + floor(state.player.x * 0.3)) % width;
    let sy = seabedTop + 20 + (i * 31) % floor(height - seabedTop - 20);
    rect(sx, sy, 2 + (i % 3), 1);
  }
  // Distant coral reef silhouettes at seabed
  fill(80, 40, 50, 40);
  for (let i = 0; i < 8; i++) {
    let rx = (i * 173 + floor(state.player.x * 0.2)) % (width + 100) - 50;
    let rh = 15 + (i * 7) % 20;
    rect(rx, height - rh - 10, 20 + (i % 3) * 8, rh, 3);
    fill(60, 90, 45, 35);
    rect(rx + 5, height - rh - 15, 8, 8, 2);
    fill(80, 40, 50, 40);
  }

  // Caustic light patterns
  let bright = typeof getSkyBrightness === 'function' ? getSkyBrightness() : 0.5;
  for (let i = 0; i < 12; i++) {
    let cx = w2sX(state.player.x + sin(frameCount * 0.01 + i * 2.1) * 200 - 100);
    let cy = w2sY(state.player.y + cos(frameCount * 0.013 + i * 1.7) * 150 - 75);
    let sz = 15 + sin(frameCount * 0.03 + i) * 8;
    fill(120, 200, 255, 12 * bright);
    beginShape();
    vertex(cx, cy - sz); vertex(cx + sz * 0.7, cy);
    vertex(cx, cy + sz); vertex(cx - sz * 0.7, cy);
    endShape(CLOSE);
  }

  // Draw seabed objects
  for (let s of d.seabed) {
    let sx = w2sX(s.x), sy = w2sY(s.y);
    if (sx < -30 || sx > width + 30 || sy < -30 || sy > height + 30) continue;
    switch (s.type) {
      case 'coral':
        let sway = sin(frameCount * 0.03 + s.sway) * 2;
        for (let b = 0; b < 3; b++) {
          fill(255, 70 + b * 30, 70, 160);
          let bx = sx - 5 + b * 5 + sway;
          rect(floor(bx), floor(sy - s.size * 0.6 - b * 2), 3, floor(s.size * 0.5 + b * 2));
          fill(255, 110 + b * 20, 90, 180);
          ellipse(floor(bx + 1), floor(sy - s.size * 0.6 - b * 2), 5, 4);
        }
        break;
      case 'seagrass':
        let gsway = sin(frameCount * 0.04 + s.sway) * 4;
        fill(35, 115, 45, 140);
        for (let bl = 0; bl < 4; bl++) {
          rect(floor(sx - 4 + bl * 3 + gsway * (bl * 0.3 + 0.4)), floor(sy - s.size), 2, floor(s.size));
        }
        break;
      case 'shell':
        fill(220, 200, 180, 130);
        ellipse(sx, sy, s.size * 0.5, s.size * 0.3);
        break;
      case 'rock':
        fill(60, 55, 48, 120);
        rect(floor(sx - s.size / 2), floor(sy - s.size / 3), floor(s.size), floor(s.size * 0.5), 2);
        break;
    }
  }

  // Draw treasures
  for (let t of d.treasures) {
    if (t.collected) continue;
    let tx = w2sX(t.x), ty = w2sY(t.y);
    if (tx < -20 || tx > width + 20 || ty < -20 || ty > height + 20) continue;

    // Depth cue
    let _td = dist(state.player.x, state.player.y, t.x, t.y);
    let _tDepth = constrain(_td / 200, 0, 1);
    let _tBlue = _tDepth * 0.3; // blue shift amount
    let sparkle = sin(frameCount * 0.08 + t.sparkle) * 0.3 + 0.7;
    // Glow (blue-shifted by depth)
    fill(lerp(t.col[0], 15, _tBlue), lerp(t.col[1], 40, _tBlue), lerp(t.col[2], 80, _tBlue), 25);
    let _tScale = lerp(1.0, 0.75, _tDepth);
    ellipse(tx, ty, 20 * _tScale, 18 * _tScale);
    // Item (blue-shifted)
    fill(lerp(t.col[0], 15, _tBlue) * sparkle, lerp(t.col[1], 40, _tBlue) * sparkle, lerp(t.col[2] || 200, 80, _tBlue), 200);
    switch (t.type) {
      case 'pearl':
        ellipse(tx, ty, 7, 7);
        fill(255, 255, 255, 100); ellipse(tx - 1, ty - 1, 3, 3);
        break;
      case 'sponge':
        rect(floor(tx - 5), floor(ty - 4), 10, 8, 2);
        break;
      case 'coral_piece':
        for (let ci = 0; ci < 3; ci++) rect(floor(tx - 4 + ci * 4), floor(ty - 4 - ci), 3, 6 + ci);
        break;
      case 'amphora':
        ellipse(tx, ty, 10, 13);
        fill(160, 100, 40); rect(floor(tx - 3), floor(ty - 8), 6, 4, 1);
        break;
      case 'gold_coin':
        fill(220, 190, 60); ellipse(tx, ty, 8, 7);
        fill(240, 210, 80); ellipse(tx, ty, 6, 5);
        break;
      case 'ancient_helm':
        fill(80, 180, 160, 200);
        rect(floor(tx - 7), floor(ty - 6), 14, 10, 2);
        fill(100, 210, 190); rect(floor(tx - 5), floor(ty - 8), 10, 4, 1);
        // Legendary glow
        fill(100, 255, 220, 10 + sin(frameCount * 0.1) * 8);
        ellipse(tx, ty, 30, 28);
        break;
    }
    // Collect hint when near
    let pd = dist(state.player.x, state.player.y, t.x, t.y);
    if (pd < 30) {
      fill(255, 255, 200, 150 + sin(frameCount * 0.1) * 40);
      textSize(7); textAlign(CENTER);
      text(t.name, tx, ty - 14);
      textAlign(LEFT, TOP);
    }
  }

  // Draw creatures
  for (let c of d.creatures) {
    let cx = w2sX(c.x), cy = w2sY(c.y);
    if (cx < -20 || cx > width + 20 || cy < -20 || cy > height + 20) continue;
    let flipX = c.vx < 0 ? -1 : 1;
    // Depth cue: distance from player affects scale and blue tint
    let _cd = dist(state.player.x, state.player.y, c.x, c.y);
    let _depthF = constrain(_cd / 200, 0, 1); // 0=close, 1=far
    let _dScale = lerp(1.0, 0.7, _depthF);
    push(); translate(cx, cy); scale(flipX * _dScale, _dScale); noStroke();
    switch (c.type) {
      case 'fish':
        fill(c.col[0], c.col[1], c.col[2], 180);
        ellipse(0, 0, 8, 4);
        let tw = sin(frameCount * 0.15 + c.frame) * 2;
        triangle(-4, 0, -7, -2 + tw, -7, 2 + tw);
        fill(255); ellipse(2, -0.5, 1.5, 1.5);
        break;
      case 'jellyfish':
        let jb = sin(frameCount * 0.06 + c.frame) * 2;
        fill(c.col[0], c.col[1], c.col[2], 120);
        ellipse(0, jb, 10, 6);
        stroke(c.col[0], c.col[1], c.col[2], 60); strokeWeight(0.7);
        for (let t = -2; t <= 2; t++) {
          let sw = sin(frameCount * 0.04 + c.frame + t) * 3;
          line(t * 2, 3 + jb, t * 2 + sw, 10 + jb);
        }
        noStroke();
        break;
      case 'turtle':
        fill(c.col[0], c.col[1], c.col[2]); ellipse(0, 0, 14, 9);
        fill(c.col[0] + 20, c.col[1] + 15, c.col[2] + 10); ellipse(0, 0, 10, 6);
        fill(c.col[0] - 10, c.col[1], c.col[2] - 10); ellipse(6, 0, 5, 4);
        let fl = sin(frameCount * 0.08 + c.frame) * 3;
        fill(c.col[0] - 10, c.col[1] - 10, c.col[2] - 10);
        ellipse(2, -5 + fl, 6, 3); ellipse(2, 5 - fl, 6, 3);
        break;
      case 'octopus':
        fill(c.col[0], c.col[1], c.col[2], 170); ellipse(0, -2, 10, 7);
        stroke(c.col[0], c.col[1], c.col[2], 120); strokeWeight(1.5); noFill();
        for (let t = 0; t < 5; t++) {
          let ta = -PI * 0.5 + (t / 4) * PI;
          let sw = sin(frameCount * 0.05 + c.frame + t) * 3;
          line(cos(ta) * 3, 2, cos(ta) * 7 + sw, 8);
        }
        noStroke();
        fill(255, 220, 100); ellipse(-2, -3, 2, 2.5); ellipse(2, -3, 2, 2.5);
        break;
      case 'seahorse':
        fill(c.col[0], c.col[1], c.col[2], 180);
        let sb = sin(frameCount * 0.04 + c.frame) * 1.5;
        ellipse(0, sb, 5, 4); ellipse(0, sb + 3, 4, 3); ellipse(0, sb - 3, 4, 3);
        fill(0); ellipse(1, sb - 2, 1, 1);
        break;
    }
    // Blue depth haze overlay
    if (_depthF > 0.15) {
      fill(15, 40, 80, 50 * _depthF);
      noStroke();
      ellipse(0, 0, 16, 12);
    }
    pop();
  }

  // Draw sea enemies
  if (d.seaEnemies) {
    for (let e of d.seaEnemies) {
      if (e.hp <= 0 && (!e._deathTimer || e._deathTimer <= 0)) continue;
      let ex = w2sX(e.x), ey = w2sY(e.y);
      if (ex < -30 || ex > width + 30 || ey < -30 || ey > height + 30) continue;
      push(); translate(ex, ey); noStroke();
      let flipX = e.vx < 0 ? -1 : 1;
      let deathScale = (e.hp <= 0 && e._deathTimer) ? max(0.1, e._deathTimer / 15) : 1;
      scale(flipX * deathScale, deathScale);
      if (e.hp <= 0) { drawingContext.globalAlpha = deathScale; }
      let flash = e.flashTimer > 0 && floor(e.flashTimer) % 4 < 2;
      if (e.type === 'shark') {
        fill(flash ? 255 : 100, flash ? 100 : 100, flash ? 100 : 110);
        // Body
        beginShape();
        vertex(-14, 0); vertex(-8, -5); vertex(6, -3); vertex(14, 0);
        vertex(6, 4); vertex(-8, 5);
        endShape(CLOSE);
        // Dorsal fin
        fill(flash ? 255 : 80, 80, 90);
        triangle(0, -3, -4, -10, 4, -3);
        // Tail
        let tw = sin(frameCount * 0.12) * 3;
        triangle(-14, 0, -20, -5 + tw, -20, 5 + tw);
        // Eye
        fill(0); ellipse(8, -1, 2, 2);
        fill(255, 50, 50, 100); ellipse(8, -1, 1, 1);
      } else if (e.type === 'eel') {
        fill(flash ? 255 : 60, flash ? 120 : 80, flash ? 60 : 30);
        let eelWave = sin(frameCount * 0.1) * 3;
        for (let seg = -3; seg <= 3; seg++) {
          let segY = sin(frameCount * 0.1 + seg * 0.8) * 2;
          ellipse(seg * 4, segY + eelWave * (seg * 0.2), 5, 4);
        }
        fill(255, 200, 0); ellipse(12, eelWave * 0.6, 2, 2);
      } else if (e.type === 'crab_giant') {
        fill(flash ? 255 : 180, flash ? 100 : 60, flash ? 60 : 30);
        ellipse(0, 0, 16, 10);
        // Claws
        let clawOpen = sin(frameCount * 0.08) * 2;
        rect(-12, -4, 4, 3 + clawOpen);
        rect(-12, 0, 4, 3);
        rect(8, -4, 4, 3 + clawOpen);
        rect(8, 0, 4, 3);
        // Legs
        for (let l = -2; l <= 2; l++) {
          if (l === 0) continue;
          rect(l * 5, 5, 2, 4);
        }
        fill(0); ellipse(-3, -2, 2, 2); ellipse(3, -2, 2, 2);
      }
      // HP bar
      if (e.hp > 0 && e.hp < e.maxHp) {
        let frac = max(0, e.hp / e.maxHp);
        fill(30, 10, 10, 160); rect(-12, -e.size - 6, 24, 3, 1);
        fill(lerp(220, 60, frac), lerp(40, 200, frac), 30); rect(-12, -e.size - 6, 24 * frac, 3, 1);
      }
      drawingContext.globalAlpha = 1;
      pop();
    }
  }

  // Breath HUD
  let barW = 100, barH = 8;
  let barX = width / 2 - barW / 2, barY = 15;
  fill(0, 0, 0, 140);
  rect(barX - 2, barY - 2, barW + 4, barH + 4, 3);
  fill(20, 40, 70);
  rect(barX, barY, barW, barH, 2);
  let breathFrac = d.breath / (d.maxBreath + d.lungCapacity * 25);
  fill(breathFrac > 0.3 ? color(60, 180, 220) : color(220, 60, 40));
  rect(barX, barY, barW * breathFrac, barH, 2);
  fill(255, 255, 255, 180); textSize(7); textAlign(CENTER, CENTER);
  text('BREATH', width / 2, barY + barH / 2);

  // Dive loot count
  let collected = d.treasures.filter(t => t.collected).length;
  if (collected > 0) {
    fill(255, 220, 100, 180); textSize(9); textAlign(LEFT);
    text('Loot: ' + collected, barX - 60, barY + 2);
  }

  // Surface hint
  fill(100, 200, 255, 80 + sin(frameCount * 0.06) * 40);
  textSize(8); textAlign(CENTER);
  text('[D] Surface  |  Walk onto land to exit', width / 2, height - 12);
  textAlign(LEFT, TOP);
}

// Dive prompt shown when near water
function drawDivePrompt() {
  if (!state || !state.diving || state.diving.active) return;
  if (state.rowing.active || state.conquest.active || state.adventure.active) return;
  let inShallow = typeof isInShallows === 'function' && isInShallows(state.player.x, state.player.y);
  if (!inShallow) return;

  fill(100, 200, 255, 160 + sin(frameCount * 0.07) * 40);
  noStroke(); textSize(10); textAlign(CENTER);
  text('[D] Dive', width / 2, height - 60);
  textAlign(LEFT, TOP);
}

console.log('[Diving] In-world underwater system loaded');

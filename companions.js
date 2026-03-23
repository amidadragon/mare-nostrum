// ═══════════════════════════════════════════════════════════════════════════
// COMPANIONS — Companion AI, pets, gifts, drawing
// Extracted from sketch.js
// ═══════════════════════════════════════════════════════════════════════════

// ─── COMPANION ────────────────────────────────────────────────────────────
function updateCompanion(dt) {
  let c = state.companion;
  let p = state.player;
  let origSpeed = c.speed;
  if (state.blessing.type === 'speed') c.speed *= 2;
  c.pulsePhase += 0.04;

  // When player is rowing, companion stays on island and idles
  if (state.rowing.active) {
    c.vx *= 0.9; c.vy *= 0.9;
    if (c.task === 'deliver') { c.task = 'idle'; }
    c.speed = origSpeed;
    return;
  }

  switch (c.task) {
    case 'idle':
      let dx = p.x + 40 - c.x;
      let dy = p.y - 10 - c.y;
      let idleDist = sqrt(dx * dx + dy * dy);
      if (idleDist > 30) {
        c.vx = (dx / idleDist) * c.speed * 0.5;
        c.vy = (dy / idleDist) * c.speed * 0.5;
      }
      // Priority: harvest ripe > plant empty > collect resources
      let ripe = state.plots.find(pl => pl.ripe);
      if (ripe && c.energy > 20) {
        c.task = 'gather';
        c.taskTarget = ripe;
      } else if (state.seeds > 0 && c.energy > 15) {
        let empty = state.plots.find(pl => !pl.planted);
        if (empty) {
          c.task = 'plant';
          c.taskTarget = empty;
        }
      }
      if (c.task === 'idle') {
        let res = state.resources.find(r => r.active);
        if (res && c.energy > 30) {
          c.task = 'collect';
          c.taskTarget = res;
        }
      }
      break;

    case 'plant':
      if (!c.taskTarget || c.taskTarget.planted || state.seeds <= 0) { c.task = 'idle'; break; }
      let plx = c.taskTarget.x;
      let ply = c.taskTarget.y;
      let pldx = plx - c.x;
      let pldy = ply - c.y;
      let pld = sqrt(pldx * pldx + pldy * pldy);
      if (pld < 18) {
        c.taskTarget.planted = true;
        c.taskTarget.stage = 0;
        c.taskTarget.timer = 0;
        c.taskTarget.cropType = 'grain';
        c.taskTarget.ripe = false;
        c.taskTarget.glowing = false;
        state.seeds--;
        c.energy = max(0, c.energy - 8);
        spawnParticles(plx, ply, 'build', 4);
        if (snd) snd.playSFX('build');
        addFloatingText(w2sX(plx), w2sY(ply) - 15, 'Planted!', C.cropGlow);
        c.task = 'idle';
      } else {
        c.vx = (pldx / pld) * c.speed * 1.0;
        c.vy = (pldy / pld) * c.speed * 1.0;
      }
      break;

    case 'gather':
      if (!c.taskTarget || !c.taskTarget.ripe) { c.task = 'idle'; break; }
      let gx = c.taskTarget.x;
      let gy = c.taskTarget.y;
      let gdx = gx - c.x;
      let gdy = gy - c.y;
      let gd = sqrt(gdx * gdx + gdy * gdy);
      if (gd < 18) {
        c.taskTarget.planted = false;
        c.taskTarget.ripe = false;
        c.taskTarget.glowing = false;
        c.taskTarget.timer = 0;
        c.taskTarget.stage = 0;
        c.carryItem = 'harvest';
        c.task = 'deliver';
        spawnHarvestBurst(gx, gy, c.taskTarget.cropType || 'grain');
      } else {
        c.vx = (gdx / gd) * c.speed * 1.2;
        c.vy = (gdy / gd) * c.speed * 1.2;
      }
      break;

    case 'collect':
      if (!c.taskTarget || !c.taskTarget.active) { c.task = 'idle'; break; }
      let cx2 = c.taskTarget.x;
      let cy2 = c.taskTarget.y;
      let cdx = cx2 - c.x;
      let cdy = cy2 - c.y;
      let cd = sqrt(cdx * cdx + cdy * cdy);
      if (cd < 18) {
        c.taskTarget.active = false;
        c.taskTarget.respawnTimer = 600;
        c.carryItem = c.taskTarget.type;
        if (c.carryItem === 'crystal_shard') { state.crystals++; checkQuestProgress('crystal', 1); }
        else if (c.carryItem === 'stone') { state.stone++; checkQuestProgress('stone', 1); }
        c.task = 'deliver';
        spawnParticles(cx2, cy2, 'collect', 6);
      } else {
        c.vx = (cdx / cd) * c.speed * 1.3;
        c.vy = (cdy / cd) * c.speed * 1.3;
      }
      break;

    case 'deliver':
      let pdx = p.x - c.x;
      let pdy = p.y - c.y;
      let pd = sqrt(pdx * pdx + pdy * pdy);
      if (pd < 25) {
        if (c.carryItem === 'harvest') {
          state.harvest++;
          let seedB = 1 + (random() < 0.5 ? 1 : 0);
          state.seeds += seedB;
          addFloatingText(w2sX(p.x), w2sY(p.y) - 20, '+1 Harvest +' + seedB + ' Seed', C.cropGlow);
        } else {
          addFloatingText(w2sX(p.x), w2sY(p.y) - 20, '+' + c.carryItem, C.crystalGlow);
        }
        c.carryItem = null;
        c.task = 'idle';
        c.energy = max(0, c.energy - 15);
        // Happy heart on delivery!
        particles.push({
          x: c.x, y: c.y - 15,
          vx: random(-0.3, 0.3), vy: -1.2,
          life: 40, maxLife: 40,
          type: 'heart', size: 5,
          r: 255, g: 100, b: 120, world: true,
        });
      } else {
        c.vx = (pdx / pd) * c.speed * 1.5;
        c.vy = (pdy / pd) * c.speed * 1.5;
      }
      break;
  }

  // Resource respawn
  state.resources.forEach(r => {
    if (!r.active) {
      r.respawnTimer -= dt;
      if (r.respawnTimer <= 0) { r.active = true; r.respawnTimer = 0; }
    }
  });

  let newCX = c.x + c.vx * dt;
  let newCY = c.y + c.vy * dt;
  if (isWalkable(newCX, newCY)) {
    c.x = newCX;
    c.y = newCY;
  } else {
    // Push back to island surface
    let edx = (c.x - WORLD.islandCX) / getSurfaceRX();
    let edy = (c.y - WORLD.islandCY) / getSurfaceRY();
    let eDist = sqrt(edx * edx + edy * edy);
    if (eDist > 0.90) {
      let scale = 0.85 / eDist;
      c.x = WORLD.islandCX + (c.x - WORLD.islandCX) * scale;
      c.y = WORLD.islandCY + (c.y - WORLD.islandCY) * scale;
    }
  }
  c.vx *= 0.8;
  c.vy *= 0.8;

  c.speed = origSpeed;
  c.trailPoints.unshift({ x: c.x, y: c.y, life: 10 });
  c.trailPoints = c.trailPoints.filter(t => t.life > 0);
  c.trailPoints.forEach(t => t.life--);
}

function drawCompanionTrail() {
  let c = state.companion;
  c.trailPoints.forEach(t => {
    noStroke();
    let a = map(t.life, 0, 10, 0, 60);
    let s = floor(map(t.life, 0, 10, 1, 3));
    fill(0, 255, 136, a);
    rect(floor(w2sX(t.x)), floor(w2sY(t.y)), s, s);
  });
}

function drawCompanion() {
  let c = state.companion;
  let sx = w2sX(c.x);
  let sy = w2sY(c.y);
  let bob = sin(frameCount * 0.08) * 4;
  let pulse = sin(c.pulsePhase) * 0.3 + 0.7;
  let energyFrac = c.energy / 100;
  let breath = 1 + sin(frameCount * 0.05) * 0.03;
  // Ethereal work sparkles
  if (c.task !== 'idle' && c.task !== 'deliver' && frameCount % 12 === 0) {
    particles.push({
      x: c.x + random(-8, 8), y: c.y + random(-12, 4),
      vx: random(-0.4, 0.4), vy: random(-1.0, -0.3),
      life: random(18, 30), maxLife: 30,
      type: 'sundust', size: random(1, 3),
      r: 160, g: 200, b: 240, phase: random(TWO_PI), world: true,
    });
  }

  push();
  translate(floor(sx), floor(sy + bob));
  scale(breath);
  noStroke();

  // Ghost alpha — pulses with energy
  let ghostA = floor(120 + 60 * energyFrac + sin(frameCount * 0.06) * 20);

  // Ethereal glow aura — cross shape, blue-white
  let glowA = floor(15 * pulse * energyFrac);
  fill(160, 200, 240, glowA);
  rect(-8, -2, 16, 2);
  rect(-2, -10, 4, 20);

  // Soft ground glow (no hard shadow for a spirit)
  fill(140, 190, 230, floor(20 * energyFrac));
  rect(-6, 10, 12, 2);

  // Spectral body — flowing robes, semi-transparent
  fill(200, 220, 240, ghostA);
  rect(-5, -2, 10, 12);
  // Robe fold — dither effect (checkerboard pixels)
  fill(180, 205, 230, floor(ghostA * 0.7));
  for (let dy = 0; dy < 12; dy += 2) {
    for (let dx = (dy % 4 === 0) ? 0 : 1; dx < 10; dx += 4) {
      rect(-5 + dx, -2 + dy, 1, 1);
    }
  }
  // Robe hem — fading/dissolving
  fill(180, 210, 240, floor(ghostA * 0.5));
  rect(-6, 8, 12, 2);
  fill(160, 200, 235, floor(ghostA * 0.3));
  rect(-4, 10, 8, 2);
  // No feet — spirit floats

  // Green laurel sash — spectral
  fill(100, 180, 80, floor(ghostA * 0.8));
  rect(-5, -2, 10, 2);

  // Spectral head
  fill(210, 225, 240, ghostA);
  rect(-4, -10, 8, 8);

  // Ethereal hair — pale silver-blue
  fill(190, 210, 235, ghostA);
  rect(-5, -12, 10, 4);
  rect(-5, -10, 2, 4);
  rect(3, -10, 2, 4);

  // Golden laurel wreath — brightest part, anchor to the living world
  fill(200, 210, 80, floor(ghostA + 40));
  rect(-5, -12, 2, 2);
  rect(-3, -13, 2, 2);
  rect(-1, -13, 2, 2);
  rect(1, -13, 2, 2);
  rect(3, -12, 2, 2);

  // Eyes — glowing blue-white
  fill(220, 240, 255, ghostA);
  rect(-3, -8, 2, 2);
  rect(1, -8, 2, 2);
  // Eye glow core
  fill(255, 255, 255, floor(ghostA * 0.9));
  rect(-3, -8, 1, 1);
  rect(1, -8, 1, 1);
  // Serene expression
  fill(180, 210, 235, floor(ghostA * 0.6));
  rect(-1, -5, 2, 1);

  // Spectral arms
  fill(200, 220, 240, floor(ghostA * 0.8));
  if (c.carryItem) {
    rect(-7, 0, 2, 3);
    rect(5, 0, 2, 3);
    // Carried item — pixel glow cross
    let itemCol = c.carryItem === 'harvest' ? color(C.cropGlow) : color(C.crystalGlow);
    fill(red(itemCol), green(itemCol), blue(itemCol), 40);
    rect(-4, -16, 8, 2);
    rect(-1, -19, 2, 8);
    fill(itemCol);
    rect(-2, -16, 4, 4);
  } else {
    rect(-7, 2, 2, 4);
    rect(5, 2, 2, 4);
  }

  // Plant tendril glow near feet — spirit connected to earth
  let tendrilA = floor(30 + sin(frameCount * 0.04 + 2) * 15);
  fill(100, 180, 80, tendrilA);
  rect(-3, 9, 1, 3);
  rect(2, 10, 1, 2);
  rect(-1, 11, 1, 1);

  pop();
}

// ─── WOODCUTTER COMPANION ─────────────────────────────────────────────────
function updateWoodcutter(dt) {
  let w = state.woodcutter;
  let origWSpeed = w.speed;
  if (state.blessing.type === 'speed') w.speed *= 2;
  let p = state.player;
  w.pulsePhase += 0.04;

  // When player is rowing, woodcutter stays on island
  if (state.rowing.active) {
    w.vx *= 0.9; w.vy *= 0.9;
    w.speed = origWSpeed;
    return;
  }

  switch (w.task) {
    case 'idle':
      // Follow player loosely
      let dx = p.x - 30 - w.x;
      let dy = p.y + 10 - w.y;
      let idleDist = sqrt(dx * dx + dy * dy);
      if (idleDist > 35) {
        w.vx = (dx / idleDist) * w.speed * 0.5;
        w.vy = (dy / idleDist) * w.speed * 0.5;
      }
      // Look for a tree to chop
      if (w.energy > 25) {
        let target = state.trees.find(t => t.alive && t.health > 0);
        if (target) {
          w.task = 'chop';
          w.taskTarget = target;
          w.chopTimer = 0;
        }
      }
      break;

    case 'chop':
      if (!w.taskTarget || !w.taskTarget.alive) { w.task = 'idle'; break; }
      let tx = w.taskTarget.x;
      let ty = w.taskTarget.y;
      let tdx = tx - w.x;
      let tdy = ty - w.y;
      let td = sqrt(tdx * tdx + tdy * tdy);
      if (td < 24) {
        w.vx *= 0.3;
        w.vy *= 0.3;
        w.chopTimer += dt;
        if (w.chopTimer > 40) {
          w.chopTimer = 0;
          w.taskTarget.health--;
          spawnParticles(tx, ty, 'build', 3);
          triggerScreenShake(1, 3);
          if (w.taskTarget.health <= 0) {
            w.taskTarget.alive = false;
            w.taskTarget.regrowTimer = 1200;
            state.wood += 3;
            checkQuestProgress('chop', 1);
            addFloatingText(w2sX(tx), w2sY(ty) - 20, '+3 Wood', '#A0724A');
            w.energy = max(0, w.energy - 8);
            w.task = 'idle';
            w.taskTarget = null;
          }
        }
      } else {
        w.vx = (tdx / td) * w.speed * 1.1;
        w.vy = (tdy / td) * w.speed * 1.1;
      }
      break;
  }

  let newX = w.x + w.vx * dt;
  let newY = w.y + w.vy * dt;
  if (isWalkable(newX, newY)) {
    w.x = newX;
    w.y = newY;
  }
  w.vx *= 0.8;
  w.vy *= 0.8;

  // Solar recharge + night rest
  let hour = state.time / 60;
  if (hour >= 6 && hour <= 18) {
    w.energy = min(100, w.energy + 0.15 * dt);
  } else {
    w.energy = min(100, w.energy + 0.03 * dt);
  }

  w.speed = origWSpeed;
  w.trailPoints.unshift({ x: w.x, y: w.y, life: 8 });
  w.trailPoints = w.trailPoints.filter(t => t.life > 0);
  w.trailPoints.forEach(t => t.life--);
}

function drawWoodcutter() {
  let w = state.woodcutter;
  let sx = w2sX(w.x);
  let sy = w2sY(w.y);
  let bob = floor(sin(frameCount * 0.07 + 1) * 2);
  let pulse = sin(w.pulsePhase) * 0.3 + 0.7;
  let energyFrac = w.energy / 100;
  let breath = 1 + sin(frameCount * 0.04 + 1) * 0.02;

  // Pixel trail — sawdust
  w.trailPoints.forEach(t => {
    noStroke();
    fill(160, 120, 60, map(t.life, 0, 8, 0, 35));
    rect(floor(w2sX(t.x)), floor(w2sY(t.y)), 2, 2);
  });

  // Wood chip particles when chopping
  if (w.task === 'chop' && frameCount % 10 === 0) {
    particles.push({
      x: w.x + random(4, 10), y: w.y + random(-10, -2),
      vx: random(0.5, 1.5), vy: random(-1.2, -0.3),
      life: random(12, 20), maxLife: 20,
      type: 'sundust', size: random(1, 2),
      r: 160, g: 120, b: 60, phase: random(TWO_PI), world: true,
    });
  }

  push();
  translate(floor(sx), floor(sy + bob));
  scale(breath);
  noStroke();

  // Warm energy glow — cross
  let wgA = floor(8 * pulse * energyFrac);
  fill(floor(180 * energyFrac), floor(120 * energyFrac), 40, wgA);
  rect(-5, -1, 10, 2);
  rect(-1, -5, 2, 10);

  // Shadow
  fill(0, 0, 0, 35);
  rect(-7, 12, 14, 2);

  // Heavy boots — laced leather
  fill(80, 55, 30);
  rect(-5, 9, 4, 3);
  rect(1, 9, 4, 3);
  // Boot laces
  fill(100, 75, 40);
  rect(-4, 9, 1, 1);
  rect(2, 9, 1, 1);

  // Legs — muscular
  fill(185, 150, 110);
  rect(-4, 3, 3, 7);
  rect(1, 3, 3, 7);

  // Dark leather tunic
  fill(92, 65, 35);
  rect(-6, -3, 12, 8);
  // Lighter vest overlay
  fill(110, 80, 45);
  rect(-4, -2, 8, 6);
  // Tunic skirt
  fill(100, 72, 38);
  rect(-6, 3, 12, 3);

  // Thick leather belt with buckle
  fill(70, 48, 22);
  rect(-6, 1, 12, 2);
  // Bronze buckle
  fill(175, 145, 50);
  rect(-1, 1, 2, 2);

  // Broad shoulders / bare arms — muscular, tanned
  fill(190, 155, 115);
  let armOff = w.task === 'chop' ? floor(sin(frameCount * 0.2) * 2) : 0;
  rect(-8, -1 + armOff, 2, 6);
  rect(6, -1 - armOff, 2, 6);
  // Forearm detail
  fill(180, 145, 105);
  rect(-8, 3 + armOff, 2, 2);
  rect(6, 3 - armOff, 2, 2);

  // Neck
  fill(190, 155, 115);
  rect(-3, -6, 6, 3);

  // Head — square-jawed, rugged
  fill(195, 160, 120);
  rect(-5, -13, 10, 8);
  // Jaw definition
  fill(180, 145, 108);
  rect(-5, -7, 2, 2);
  rect(3, -7, 2, 2);

  // Short cropped hair — dark brown
  fill(55, 38, 22);
  rect(-5, -15, 10, 4);
  // Sideburns
  rect(-5, -12, 2, 3);
  rect(3, -12, 2, 3);

  // Stubble shadow
  fill(140, 115, 85, 60);
  rect(-4, -7, 8, 2);

  // Eyes — focused, intense
  let blinkW = (frameCount % 260 > 253);
  if (blinkW) {
    fill(175, 140, 105);
    rect(-3, -10, 2, 1);
    rect(1, -10, 2, 1);
  } else {
    fill(50, 35, 20);
    rect(-3, -11, 2, 2);
    rect(1, -11, 2, 2);
    // Determined highlight
    fill(75, 55, 35);
    rect(-3, -11, 1, 1);
    rect(1, -11, 1, 1);
  }
  // Strong brow
  fill(130, 100, 70);
  rect(-4, -12, 3, 1);
  rect(1, -12, 3, 1);
  // Nose
  fill(185, 150, 112);
  rect(-1, -9, 2, 2);

  // Roman dolabra axe
  if (w.task === 'chop') {
    let swing = floor(sin(frameCount * 0.2) * 6) * 2;
    // Handle — ash wood
    fill(85, 60, 28);
    rect(7 + swing, -15, 2, 15);
    // Axe head — iron with edge
    fill(140, 140, 150);
    rect(5 + swing, -17, 6, 4);
    fill(170, 170, 180);
    rect(5 + swing, -17, 2, 4);
    // Impact sparks hint
    fill(200, 180, 100, floor(abs(sin(frameCount * 0.2)) * 40));
    rect(4 + swing, -18, 2, 1);
  } else {
    // Axe resting on shoulder
    fill(85, 60, 28);
    rect(8, -17, 2, 13);
    fill(140, 140, 150);
    rect(6, -19, 6, 4);
    fill(170, 170, 180);
    rect(6, -19, 2, 4);
  }

  pop();
}

// ─── CENTURION ───────────────────────────────────────────────────────────
function updateCenturion(dt) {
  let cen = state.centurion;
  let p = state.player;
  if (state.rowing.active) { cen.x = p.x + 15; cen.y = p.y + 8; cen.vx = 0; cen.vy = 0; return; }
  if (state.diving && state.diving.active) { cen.vx = 0; cen.vy = 0; return; } // stay put while player dives
  if (cen.flashTimer > 0) cen.flashTimer -= dt;
  if (cen.attackTimer > 0) cen.attackTimer -= dt;

  // On conquest island: fight enemies
  if (state.conquest.active) {
    let c = state.conquest;
    // Find nearest enemy
    let nearEnemy = null, nearDist = 9999;
    for (let e of c.enemies) {
      if (e.state === 'dead') continue;
      let d = dist(cen.x, cen.y, e.x, e.y);
      if (d < nearDist) { nearDist = d; nearEnemy = e; }
    }
    // Attack if in range
    if (nearEnemy && nearDist < cen.attackRange && cen.attackTimer <= 0) {
      cen.attackTimer = cen.attackCooldown;
      nearEnemy.hp -= cen.attackDamage;
      nearEnemy.flashTimer = 5;
      if (nearEnemy.hp <= 0) {
        nearEnemy.state = 'dying'; nearEnemy.stateTimer = 15;
      } else {
        nearEnemy.state = 'stagger'; nearEnemy.stateTimer = 6;
      }
      cen.facing = nearEnemy.x > cen.x ? 1 : -1;
      let kba = atan2(nearEnemy.y - cen.y, nearEnemy.x - cen.x);
      nearEnemy.x += cos(kba) * 4;
      nearEnemy.y += sin(kba) * 4;
      addFloatingText(w2sX(nearEnemy.x), w2sY(nearEnemy.y) - 15, '-' + cen.attackDamage, '#ffaa44');
      spawnParticles(nearEnemy.x, nearEnemy.y, 'combat', 2);
      // Battle shout - 20% chance
      if (Math.random() < 0.2) {
        let _shouts = ['FOR ROME!', 'HOLD THE LINE!', 'ADVANCE!', 'SHIELDS UP!', 'CHARGE!'];
        addFloatingText(w2sX(cen.x), w2sY(cen.y) - 35, _shouts[floor(Math.random() * _shouts.length)], '#ffdd66');
      }
      cen.task = 'fight';
      cen.target = nearEnemy;
      return;
    }
    // Chase nearby enemy
    if (nearEnemy && nearDist < 150) {
      let dx = nearEnemy.x - cen.x, dy = nearEnemy.y - cen.y;
      cen.vx = (dx / nearDist) * cen.speed;
      cen.vy = (dy / nearDist) * cen.speed;
      cen.x += cen.vx * dt; cen.y += cen.vy * dt;
      cen.facing = dx > 0 ? 1 : -1;
      cen.task = 'fight';
      return;
    }
  }

  // Clamp centurion to island FIRST (before follow logic to prevent edge oscillation)
  if (!state.conquest.active) {
    let ix = WORLD.islandCX, iy = WORLD.islandCY;
    let rx = getSurfaceRX() * 0.80, ry = getSurfaceRY() * 0.80;
    let ex = (cen.x - ix) / rx, ey = (cen.y - iy) / ry;
    if (ex * ex + ey * ey > 1) {
      let a = atan2(cen.y - iy, cen.x - ix);
      cen.x = ix + cos(a) * rx;
      cen.y = iy + sin(a) * ry;
      cen.vx = 0; cen.vy = 0;
    }
  } else {
    let c = state.conquest;
    let ex = (cen.x - c.isleX) / (c.isleRX * 0.9), ey = (cen.y - c.isleY) / (c.isleRY * 0.9);
    if (ex * ex + ey * ey > 1) {
      let a = atan2(cen.y - c.isleY, cen.x - c.isleX);
      cen.x = c.isleX + cos(a) * c.isleRX * 0.9;
      cen.y = c.isleY + sin(a) * c.isleRY * 0.9;
      cen.vx = 0; cen.vy = 0;
    }
  }

  // Default: follow player
  cen.task = 'follow';
  let followDist = 40;
  let dx = p.x - followDist * (p.facing === 'left' ? -1 : 1) - cen.x;
  let dy = p.y + 5 - cen.y;
  let d = sqrt(dx * dx + dy * dy);

  // Check if player is near the island edge — centurion should stop following
  let playerNearEdge = false;
  if (!state.conquest.active) {
    let pix = WORLD.islandCX, piy = WORLD.islandCY;
    let prx = getSurfaceRX() * 0.80, pry = getSurfaceRY() * 0.80;
    let pex = (p.x - pix) / prx, pey = (p.y - piy) / pry;
    playerNearEdge = pex * pex + pey * pey > 0.72;
  }

  if (d > 200 && !state.conquest.active) {
    // Too far — snap closer to center than player (not right on edge)
    let snapA = atan2(p.y - WORLD.islandCY, p.x - WORLD.islandCX);
    let snapD = sqrt((p.x - WORLD.islandCX) * (p.x - WORLD.islandCX) + (p.y - WORLD.islandCY) * (p.y - WORLD.islandCY)) * 0.85;
    cen.x = WORLD.islandCX + cos(snapA) * snapD;
    cen.y = WORLD.islandCY + sin(snapA) * snapD;
    cen.vx = 0; cen.vy = 0;
  } else if (d > 25 && !playerNearEdge) {
    // Jog to catch up - faster when further, smooth acceleration
    let urgency = min(1, max(0, (d - 25) / 150));
    let spd = cen.speed * (0.6 + urgency * 0.8);
    cen.vx += ((dx / d) * spd - cen.vx) * 0.15;
    cen.vy += ((dy / d) * spd - cen.vy) * 0.15;
    let nx = cen.x + cen.vx * dt, ny = cen.y + cen.vy * dt;
    if (isWalkable(nx, ny)) { cen.x = nx; cen.y = ny; }
    else { cen.vx = 0; cen.vy = 0; }
    cen.facing = dx > 0 ? 1 : -1;
  } else {
    cen.vx *= 0.8;
    cen.vy *= 0.8;
    // Idle fidget: small random steps when player is stationary
    if (!cen._idleTimer) cen._idleTimer = 0;
    cen._idleTimer += dt;
    if (cen._idleTimer > 300 + Math.random() * 300) {
      cen._idleTimer = 0;
      cen.facing = Math.random() < 0.5 ? 1 : -1;
      let wa = Math.random() * TWO_PI;
      let wx = cen.x + cos(wa) * (8 + Math.random() * 8);
      let wy = cen.y + sin(wa) * (5 + Math.random() * 5);
      if (isWalkable(wx, wy)) { cen.x = wx; cen.y = wy; }
    }
  }

  // Reaction to nearby enemies - turn to face, show "!" indicator
  if (!state.conquest.active) {
    let _nearThreat = typeof _findNearestRaidEnemy === 'function' ? _findNearestRaidEnemy(cen.x, cen.y, 200) : null;
    if (_nearThreat) {
      cen.facing = _nearThreat.x > cen.x ? 1 : -1;
      if (!cen._alertTimer || cen._alertTimer <= 0) {
        cen._alertTimer = 60;
        addFloatingText(w2sX(cen.x), w2sY(cen.y) - 30, '!', '#ff4444');
      }
    }
    if (cen._alertTimer > 0) cen._alertTimer -= dt;
  }
}

// ─── QUARRIER COMPANION — auto-mines stone, unlocks at island level 5 ───
function updateQuarrier(dt) {
  let q = state.quarrier;
  if (!q.unlocked) {
    if (state.islandLevel >= 5) { q.unlocked = true; addFloatingText(width / 2, height * 0.3, 'Quarrier joined your island!', '#aaaaaa'); }
    else return;
  }
  let origSpeed = q.speed;
  if (state.blessing.type === 'speed') q.speed *= 2;
  let p = state.player;
  q.pulsePhase += 0.04;
  if (state.rowing.active) { q.vx *= 0.9; q.vy *= 0.9; q.speed = origSpeed; return; }

  switch (q.task) {
    case 'idle': {
      let dx = p.x + 30 - q.x, dy = p.y + 15 - q.y;
      let d = sqrt(dx * dx + dy * dy);
      if (d > 35) { q.vx = (dx / d) * q.speed * 0.5; q.vy = (dy / d) * q.speed * 0.5; }
      if (q.energy > 25) {
        let res = state.resources.find(r => r.active && r.type === 'stone');
        if (res) { q.task = 'mine'; q.taskTarget = res; q.mineTimer = 0; }
      }
      break;
    }
    case 'mine': {
      if (!q.taskTarget || !q.taskTarget.active) { q.task = 'idle'; break; }
      let tx = q.taskTarget.x, ty = q.taskTarget.y;
      let dx = tx - q.x, dy = ty - q.y, d = sqrt(dx * dx + dy * dy);
      if (d < 20) {
        q.vx *= 0.3; q.vy *= 0.3;
        q.mineTimer += dt;
        if (q.mineTimer > 50) {
          q.mineTimer = 0;
          q.taskTarget.active = false;
          q.taskTarget.respawnTimer = 600;
          state.stone += 2;
          checkQuestProgress('stone', 2);
          addFloatingText(w2sX(tx), w2sY(ty) - 15, '+2 Stone', '#aaaaaa');
          // Iron ore chance: level 5+ at 20%, level 7+ at 35%
          let _ironChance = state.islandLevel >= 7 ? 0.35 : (state.islandLevel >= 5 ? 0.20 : 0);
          if (_ironChance > 0 && random() < _ironChance) {
            state.ironOre = (state.ironOre || 0) + 1;
            addFloatingText(w2sX(tx), w2sY(ty) - 28, '+1 Iron Ore!', '#aabbcc');
          }
          spawnParticles(tx, ty, 'collect', 5);
          if (snd) snd.playSFX('stone_mine');
          q.energy = max(0, q.energy - 10);
          q.task = 'idle'; q.taskTarget = null;
        }
      } else {
        q.vx = (dx / d) * q.speed * 1.1; q.vy = (dy / d) * q.speed * 1.1;
      }
      break;
    }
  }
  let nx = q.x + q.vx * dt, ny = q.y + q.vy * dt;
  if (isWalkable(nx, ny)) { q.x = nx; q.y = ny; }
  q.vx *= 0.8; q.vy *= 0.8;
  let hour = state.time / 60;
  if (hour >= 6 && hour <= 18) q.energy = min(100, q.energy + 0.15 * dt);
  else q.energy = min(100, q.energy + 0.03 * dt);
  q.speed = origSpeed;
  q.trailPoints.unshift({ x: q.x, y: q.y, life: 8 });
  q.trailPoints = q.trailPoints.filter(t => t.life > 0);
  q.trailPoints.forEach(t => t.life--);
}

function drawQuarrier() {
  let q = state.quarrier;
  if (!q.unlocked) return;
  let sx = w2sX(q.x), sy = w2sY(q.y);
  let bob = floor(sin(frameCount * 0.06 + 2) * 2);
  let pulse = sin(q.pulsePhase) * 0.3 + 0.7;
  let ef = q.energy / 100;

  // Stone dust trail
  q.trailPoints.forEach(t => {
    noStroke(); fill(140, 135, 125, map(t.life, 0, 8, 0, 30));
    rect(floor(w2sX(t.x)), floor(w2sY(t.y)), 2, 2);
  });

  // Rock chip particles when mining
  if (q.task === 'mine' && frameCount % 12 === 0) {
    particles.push({ x: q.x + random(-8, 8), y: q.y + random(-12, -4), vx: random(-1, 1), vy: random(-1.5, -0.5), life: random(10, 18), maxLife: 18, type: 'sundust', size: random(1, 2), r: 140, g: 130, b: 115, phase: random(TWO_PI), world: true });
  }

  push();
  translate(floor(sx), floor(sy + bob));
  noStroke();

  // Glow
  let ga = floor(8 * pulse * ef);
  fill(floor(140 * ef), floor(135 * ef), floor(120 * ef), ga);
  rect(-5, -1, 10, 2); rect(-1, -5, 2, 10);

  // Shadow
  fill(0, 0, 0, 35); rect(-7, 12, 14, 2);

  // Boots — sturdy stone-worker
  fill(90, 80, 65); rect(-5, 9, 4, 3); rect(1, 9, 4, 3);

  // Legs — dusty brown
  fill(110, 100, 80); rect(-4, 4, 3, 6); rect(1, 4, 3, 6);

  // Torso — grey stone-worker tunic
  fill(130, 125, 115); rect(-5, -4, 10, 9);
  fill(140, 135, 125); rect(-4, -3, 8, 4); // lighter chest

  // Arms
  fill(120, 110, 95); rect(-7, -2, 3, 7); rect(4, -2, 3, 7);

  // Head
  fill(190, 155, 115); rect(-3, -9, 6, 6);
  // Eyes
  fill(50, 40, 30); rect(-2, -7, 1, 1); rect(1, -7, 1, 1);
  // Headband (stone dust)
  fill(160, 155, 140); rect(-3, -9, 6, 1);

  // Pickaxe on back
  stroke(100, 85, 60); strokeWeight(1);
  line(4, -8, 8, 4); noStroke();
  fill(140, 140, 150); // iron head
  rect(7, 2, 3, 2);

  pop();

  // Label
  noStroke(); fill(140, 135, 120, 120);
  textSize(10); textAlign(CENTER, TOP);
  text('QUARRIER', floor(sx), floor(sy + 16));
  textAlign(LEFT, TOP);
}

// ─── COOK NPC ────────────────────────────────────────────────────────────
function updateCook(dt) {
  let c = state.cook;
  if (!c.unlocked) {
    if (state.islandLevel >= 8) { c.unlocked = true; addFloatingText(width / 2, height * 0.3, 'Cook joined your island!', '#ddaa44'); }
    else return;
  }
  if (state.rowing.active) return;
  c.timer += dt;
  // Auto-cook a meal every ~30 seconds if ingredients available
  if (c.timer > 1800) {
    c.timer = 0;
    if (state.harvest >= 2 && state.fish >= 1) {
      state.harvest -= 2; state.fish -= 1;
      state.meals = (state.meals || 0) + 1;
      addFloatingText(w2sX(c.x), w2sY(c.y) - 20, '+1 Meal (Cook)', '#ddaa44');
      if (snd) snd.playSFX('ding');
      c.cookTimer = 30;
    }
  }
  if (c.cookTimer > 0) c.cookTimer -= dt;
  // Idle near a brazier
  let brazier = state.buildings.find(b => b.type === 'torch');
  if (brazier) {
    let dx = brazier.x + 15 - c.x, dy = brazier.y - c.y;
    let d = sqrt(dx * dx + dy * dy);
    if (d > 25) { c.x += (dx / d) * c.speed * dt; c.y += (dy / d) * c.speed * dt; }
  }
}

function drawCook() {
  let c = state.cook;
  if (!c.unlocked) return;
  let sx = w2sX(c.x), sy = w2sY(c.y);
  let bob = floor(sin(frameCount * 0.04) * 1);
  push(); translate(floor(sx), floor(sy + bob)); noStroke();
  // Shadow
  fill(0, 0, 0, 25); ellipse(0, 10, 14, 4);
  // Feet
  fill(120, 80, 40); rect(-4, 7, 3, 3); rect(1, 7, 3, 3);
  // Apron (white)
  fill(230, 225, 210); rect(-5, -3, 10, 11, 1);
  // Tunic underneath
  fill(180, 120, 50); rect(-6, -4, 12, 6, 1);
  // Head
  fill(195, 160, 120); rect(-3, -10, 6, 7);
  // Chef hat
  fill(240, 235, 220); rect(-4, -15, 8, 6, 1);
  rect(-3, -17, 6, 3);
  // Eyes
  fill(40, 30, 20); rect(-2, -8, 1, 1); rect(1, -8, 1, 1);
  // Ladle (when cooking)
  if (c.cookTimer > 0) {
    fill(140, 120, 80); rect(5, -5, 2, 10);
    fill(160, 140, 90); ellipse(6, 6, 5, 3);
  }
  pop();
  noStroke(); fill(140, 120, 80, 120);
  textSize(10); textAlign(CENTER, TOP);
  text('COOK', floor(sx), floor(sy + 14));
  textAlign(LEFT, TOP);
}

// ─── FISHERMAN NPC ───────────────────────────────────────────────────────
function updateFisherman(dt) {
  let f = state.fisherman;
  if (!f.unlocked) {
    if (state.islandLevel >= 6) { f.unlocked = true; addFloatingText(width / 2, height * 0.3, 'Fisherman set up at the port!', '#4488aa'); }
    else return;
  }
  // Position at port shoreline
  let port = getPortPosition();
  f.boatX = port.x + 30;
  f.boatY = port.y + 40;
  f.x = f.boatX; f.y = f.boatY;
  // Catch fish every ~20 seconds
  f.timer += dt;
  f.catchTimer -= dt;
  if (f.timer > 1200) {
    f.timer = 0;
    let amt = 1 + floor(random(0, 2));
    state.fish = (state.fish || 0) + amt;
    f.fishCaught += amt;
    addFloatingText(w2sX(f.x), w2sY(f.y) - 25, '+' + amt + ' Fish (Fisherman)', '#4488aa');
    if (snd) snd.playSFX('fish_catch');
    f.catchTimer = 20;
  }
}

function drawFisherman() {
  let f = state.fisherman;
  if (!f.unlocked) return;
  let sx = w2sX(f.boatX), sy = w2sY(f.boatY);
  let bob = floor(sin(frameCount * 0.025) * 2);
  push(); translate(floor(sx), floor(sy + bob)); noStroke();
  // Small fishing boat
  fill(110, 75, 35);
  beginShape();
  vertex(-14, 2); vertex(-10, 6); vertex(10, 6); vertex(14, 2);
  vertex(8, 0); vertex(-8, 0);
  endShape(CLOSE);
  // Deck
  fill(140, 100, 50); rect(-8, 0, 16, 3, 1);
  // Fisherman sitting
  fill(190, 155, 120); rect(-2, -8, 4, 5); // head
  fill(50, 80, 130); rect(-3, -3, 6, 5, 1); // blue tunic
  fill(40, 30, 20); rect(-1, -6, 1, 1); rect(1, -6, 1, 1); // eyes
  // Straw hat
  fill(200, 180, 120); rect(-4, -10, 8, 3, 1);
  rect(-5, -8, 10, 1);
  // Fishing rod
  stroke(120, 90, 40); strokeWeight(1);
  line(3, -5, 18, -15); // rod
  stroke(180, 180, 180, 120); strokeWeight(0.5);
  let lineEnd = 8 + sin(frameCount * 0.04) * 3;
  line(18, -15, 18, lineEnd); // line into water
  noStroke();
  // Water ripple at line
  if (f.catchTimer > 0) {
    fill(180, 220, 255, 80); ellipse(18, lineEnd + 2, 6, 2);
  }
  // Fish basket
  fill(160, 130, 70); rect(-12, -1, 5, 4, 1);
  if (f.fishCaught > 0) {
    fill(100, 160, 200, 150); rect(-11, -2, 3, 2);
  }
  pop();
  noStroke(); fill(70, 120, 160, 120);
  textSize(10); textAlign(CENTER, TOP);
  text('FISHERMAN', floor(sx), floor(sy + 10));
  textAlign(LEFT, TOP);
}

function drawCenturion() {
  let cen = state.centurion;
  if (state.rowing.active) return;
  let sx = w2sX(cen.x), sy = w2sY(cen.y);
  let s = 12;
  let bobY = floor(sin(frameCount * 0.06) * 1);
  let f = cen.facing;
  let breath = sin(frameCount * 0.04 + 2) * 0.5;
  let mil = getFactionMilitary();
  let fk = state.faction || 'rome';

  push();
  translate(floor(sx), floor(sy + bobY));

  // Flash white when hit
  if (cen.flashTimer > 0 && frameCount % 4 < 2) { pop(); return; }

  noStroke();
  // Shadow
  fill(0, 0, 0, 40);
  rect(-8, s + 1, 16, 2);

  // Sandals
  fill(90, 60, 25);
  rect(-5, s - 2, 4, 3);
  rect(1, s - 2, 4, 3);
  fill(140, 130, 100);
  rect(-4, s, 1, 1);
  rect(2, s, 1, 1);

  // Legs
  fill(200, 165, 130);
  rect(-4, 4, 3, 7);
  rect(1, 4, 3, 7);
  // Greaves — faction armor tint
  fill(mil.armor[0], max(0, mil.armor[1] - 22), max(0, mil.armor[2] - 125));
  rect(-4, 6, 3, 4);
  rect(1, 6, 3, 4);
  fill(min(255, mil.armor[0] + 15), max(0, mil.armor[1] - 7), max(0, mil.armor[2] - 115), 80);
  rect(-3, 7, 1, 2);
  rect(2, 7, 1, 2);

  // Cape — faction
  fill(mil.cape[0], mil.cape[1], mil.cape[2], 180);
  let cw = floor(sin(frameCount * 0.07) * 2);
  rect(-6 * f, -5, 5, 16 + cw);
  fill(min(255, mil.cape[0] + 20), min(255, mil.cape[1] + 12), min(255, mil.cape[2] + 10), 120);
  rect(-6 * f, -5, 1, 16 + cw);

  // Tunic — faction
  fill(mil.tunic[0], mil.tunic[1], mil.tunic[2]);
  rect(-6, -4, 12, 10);
  fill(max(0, mil.tunic[0] - 18), max(0, mil.tunic[1] - 8), max(0, mil.tunic[2] - 6));
  rect(-6, -4, 4, 10);

  // Armor — faction
  fill(mil.armor[0], mil.armor[1], mil.armor[2]);
  rect(-5, -4, 10, 6);
  fill(max(0, mil.armor[0] - 27), max(0, mil.armor[1] - 27), max(0, mil.armor[2] - 25));
  rect(-5, -2, 10, 1);
  rect(-5, 0, 10, 1);
  fill(min(255, mil.armor[0] + 20), min(255, mil.armor[1] + 20), min(255, mil.armor[2] + 20), 80);
  rect(-4, -4, 3, 2);

  // Leather skirt strips
  fill(130, 95, 40);
  for (let i = -2; i <= 2; i++) {
    rect(i * 3 - 1, 2, 2, 4);
  }
  fill(180, 155, 55);
  for (let i = -2; i <= 2; i++) {
    rect(i * 3, 5, 1, 1);
  }

  // Belt
  fill(195, 165, 55);
  rect(-5, 1, 10, 2);
  fill(210, 180, 60);
  rect(-1, 1, 2, 2);

  // Pauldrons — faction armor
  fill(min(255, mil.armor[0] + 10), max(0, mil.armor[1] - 17), max(0, mil.armor[2] - 120));
  rect(-8, -5, 4, 3);
  rect(4, -5, 4, 3);
  fill(min(255, mil.armor[0] + 25), min(255, mil.armor[1] + 3), max(0, mil.armor[2] - 105), 80);
  rect(-7, -5, 2, 1);
  rect(5, -5, 2, 1);

  // Arms
  fill(200, 165, 130);
  rect(-8, -2, 2, 5);
  rect(6, -2, 2, 5);
  fill(max(0, mil.armor[0] - 5), max(0, mil.armor[1] - 32), max(0, mil.armor[2] - 130));
  rect(-8, 0, 2, 3);
  rect(6, 0, 2, 3);

  // Weapon
  if (cen.task === 'fight') {
    let swing = floor(sin(frameCount * 0.2) * 4);
    fill(185, 185, 195);
    rect(6 * f + swing, -13, 2, 11);
    fill(210, 210, 220);
    rect(6 * f + swing, -13, 1, 11);
    fill(195, 165, 55);
    rect(6 * f + swing - 1, -2, 4, 2);
    fill(200, 170, 60);
    rect(6 * f + swing, 0, 2, 1);
  } else {
    fill(90, 65, 30);
    rect(5 * f, 2, 2, 7);
    fill(175, 145, 55);
    rect(5 * f, 1, 2, 2);
  }

  // Shield — faction
  let shX = -7 * f;
  fill(mil.shield[0], mil.shield[1], mil.shield[2]);
  if (mil.shieldShape === 'round') {
    ellipse(shX, 1, 12, 12);
    fill(mil.shieldBoss[0], mil.shieldBoss[1], mil.shieldBoss[2]);
    ellipse(shX, 1, 4, 4);
  } else {
    rect(shX - 4, -5, 8, 13);
    fill(mil.shieldBoss[0], mil.shieldBoss[1], mil.shieldBoss[2]);
    rect(shX - 4, -5, 8, 1);
    rect(shX - 4, 7, 8, 1);
    rect(shX - 4, -5, 1, 13);
    rect(shX + 3, -5, 1, 13);
    fill(180, 178, 185);
    rect(shX - 1, 0, 2, 2);
    fill(mil.shieldBoss[0], mil.shieldBoss[1], mil.shieldBoss[2]);
    rect(shX - 1, -3, 1, 2);
    rect(shX, -1, 1, 2);
    rect(shX - 1, 1, 1, 2);
    rect(shX + 0, 3, 1, 2);
  }

  // Neck
  fill(200, 165, 130);
  rect(-3, -7, 6, 3);

  // Head
  fill(200, 165, 130);
  rect(-4, -11, 8, 6);
  fill(190, 155, 120);
  rect(-4, -6, 2, 1);
  rect(2, -6, 2, 1);

  // Helmet — faction-specific style
  fill(mil.helm[0], mil.helm[1], mil.helm[2]);
  if (fk === 'carthage') {
    // Turban/headwrap
    rect(-5, -14, 10, 6);
    fill(mil.helmCrest[0], mil.helmCrest[1], mil.helmCrest[2]);
    rect(-3, -15, 6, 2);
  } else if (fk === 'egypt') {
    // Nemes headdress
    rect(-5, -13, 10, 4);
    fill(mil.helmCrest[0], mil.helmCrest[1], mil.helmCrest[2]);
    rect(-6, -10, 2, 6);
    rect(4, -10, 2, 6);
    fill(mil.helm[0], mil.helm[1], mil.helm[2]);
    rect(-4, -15, 8, 3);
  } else if (fk === 'greece') {
    // Corinthian helmet
    rect(-5, -13, 10, 5);
    fill(max(0, mil.helm[0] - 10), max(0, mil.helm[1] - 10), max(0, mil.helm[2] - 10));
    rect(-5, -10, 2, 4);
    rect(3, -10, 2, 4);
    fill(mil.helmCrest[0], mil.helmCrest[1], mil.helmCrest[2]);
    rect(-2, -17, 4, 4);
    rect(-1, -19, 2, 2);
  } else {
    // Roman galea
    rect(-5, -13, 10, 4);
    fill(max(0, mil.helm[0] - 10), max(0, mil.helm[1] - 10), max(0, mil.helm[2] - 5));
    rect(-5, -10, 10, 1);
    rect(-5, -10, 2, 4);
    rect(3, -10, 2, 4);
    fill(max(0, mil.helm[0] - 15), max(0, mil.helm[1] - 15), max(0, mil.helm[2] - 10));
    rect(-4, -6, 8, 1);
    // Transverse crest — faction helmCrest
    fill(mil.helmCrest[0], mil.helmCrest[1], mil.helmCrest[2]);
    rect(-6, -15, 12, 2);
    rect(-4, -17, 8, 2);
    let cf = floor(sin(frameCount * 0.1) * 1);
    fill(max(0, mil.helmCrest[0] - 20), max(0, mil.helmCrest[1] - 5), max(0, mil.helmCrest[2] - 3));
    rect(-5, -16 + cf, 2, 3);
    rect(3, -16 - cf, 2, 3);
  }

  // Eyes
  let blinkC = (frameCount % 280 > 273);
  if (blinkC) {
    fill(185, 150, 118);
    rect(-3, -10, 2, 1);
    rect(1, -10, 2, 1);
  } else {
    fill(245, 240, 235);
    rect(-3, -10, 2, 2);
    rect(1, -10, 2, 2);
    fill(35, 25, 18);
    rect(-3 + (f > 0 ? 1 : 0), -10, 1, 1);
    rect(1 + (f > 0 ? 1 : 0), -10, 1, 1);
  }

  // Rank text — faction-appropriate title
  let _ft = (typeof getFactionTerms === 'function') ? getFactionTerms() : { leader: 'CENTURION' };
  fill(195, 170, 60, 100);
  textSize(5);
  textAlign(CENTER);
  text(_ft.leader.toUpperCase() + getCompanionPetCenturionLabel(), 0, -s * 1.3);
  textAlign(LEFT, TOP);

  pop();
}


// ─── COMPANION PETS SYSTEM — personality, leveling, gifts, world reactions ───

// XP needed per level: level 1→2 = 5, 2→3 = 8, etc.
function companionXpForLevel(lvl) {
  return [0, 5, 8, 12, 18, 25, 35, 50, 70, 100][lvl - 1] || 999;
}

function companionLevelName(lvl) {
  if (lvl <= 3) return '';
  if (lvl <= 6) return ' II';
  return ' III';
}

function addCompanionXp(pet, amount) {
  pet.xp += amount;
  let needed = companionXpForLevel(pet.level);
  let leveled = false;
  while (pet.xp >= needed && pet.level < 10) {
    pet.xp -= needed;
    pet.level++;
    leveled = true;
    needed = companionXpForLevel(pet.level);
  }
  return leveled;
}

function getFirstAdoptedCat() {
  if (!state.cats) return null;
  return state.cats.find(c => c.adopted);
}

// ─── COMPANION PROXIMITY XP ───
function updateCompanionPetProximity(dt) {
  let p = state.player;
  let cp = state.companionPets;
  let hour = state.time / 60;
  let isNight = hour >= 21 || hour < 5;

  // Cat XP from first adopted cat being near player
  let cat = getFirstAdoptedCat();
  if (cat) {
    let d = dist(p.x, p.y, cat.x, cat.y);
    if (d < 80) {
      cp.cat.nearPlayerTimer += dt;
      if (cp.cat.nearPlayerTimer > 600) { // every ~10 seconds
        cp.cat.nearPlayerTimer = 0;
        addCompanionXp(cp.cat, 1);
      }
    }
  }

  // Tortoise XP from proximity
  let t = cp.tortoise;
  let td = dist(p.x, p.y, t.x, t.y);
  if (td < 100) {
    t.nearPlayerTimer += dt;
    if (t.nearPlayerTimer > 600) {
      t.nearPlayerTimer = 0;
      addCompanionXp(t, 1);
    }
  }

  // Crow XP from proximity
  let cr = cp.crow;
  let crd = dist(p.x, p.y, cr.x, cr.y);
  if (crd < 120) {
    cr.nearPlayerTimer += dt;
    if (cr.nearPlayerTimer > 600) {
      cr.nearPlayerTimer = 0;
      addCompanionXp(cr, 1);
    }
  }

  // Centurion XP from proximity (already follows player)
  let cen = cp.centurion;
  let cend = dist(p.x, p.y, state.centurion.x, state.centurion.y);
  if (cend < 60) {
    cen.nearPlayerTimer += dt;
    if (cen.nearPlayerTimer > 600) {
      cen.nearPlayerTimer = 0;
      let _cenLvd = addCompanionXp(cen, 1);
      if (_cenLvd && typeof applyCenturionLevelStats === 'function') applyCenturionLevelStats();
    }
  }

  // Decrement gift cooldowns
  if (cp.cat.giftCooldown > 0) cp.cat.giftCooldown -= dt;
  if (cp.tortoise.giftCooldown > 0) cp.tortoise.giftCooldown -= dt;
  if (cp.crow.giftCooldown > 0) cp.crow.giftCooldown -= dt;
  if (cp.centurion.giftCooldown > 0) cp.centurion.giftCooldown -= dt;
}

// ─── TORTOISE UPDATE ───
function updateTortoise(dt) {
  let t = state.companionPets.tortoise;
  let hour = state.time / 60;
  let isNight = hour >= 21 || hour < 5;
  let isStorm = state.weather.type === 'storm' || stormActive;

  // Shell during storms
  if (isStorm && t.behavior !== 'shell') {
    t.behavior = 'shell'; t.behaviorTimer = 0; t.vx = 0; t.vy = 0;
  }
  if (t.behavior === 'shell' && !isStorm) {
    t.behavior = 'idle'; t.behaviorTimer = random(60, 200);
  }

  // Sleep at night — find sunny spot (south side of island)
  if (isNight) {
    if (!t.sleepPos) t.sleepPos = { x: WORLD.islandCX + 60, y: WORLD.islandCY + 40 };
    let dx = t.sleepPos.x - t.x, dy = t.sleepPos.y - t.y;
    let d = sqrt(dx * dx + dy * dy);
    if (d > 10) {
      t.vx = (dx / d) * 0.3; t.vy = (dy / d) * 0.3;
    } else { t.vx = 0; t.vy = 0; t.behavior = 'sleeping'; }
    t.x += t.vx * dt; t.y += t.vy * dt;
    return;
  }
  t.sleepPos = null;

  t.behaviorTimer -= dt;

  switch (t.behavior) {
    case 'idle':
      t.vx *= 0.9; t.vy *= 0.9;
      if (t.behaviorTimer <= 0) {
        if (random() < 0.3 && t.level >= 2 && t.findTimer <= 0 && t.lastFindDay !== state.day) {
          t.behavior = 'digging'; t.behaviorTimer = 120;
        } else {
          t.behavior = 'exploring'; t.behaviorTimer = random(100, 250);
          t.vx = random(-0.2, 0.2); t.vy = random(-0.1, 0.1);
          t.facing = t.vx > 0 ? 1 : -1;
        }
      }
      break;
    case 'exploring':
      t.x += t.vx * dt; t.y += t.vy * dt;
      if (!isOnIsland(t.x, t.y)) { t.vx *= -1; t.vy *= -1; t.x += t.vx * 5; t.y += t.vy * 5; }
      if (t.behaviorTimer <= 0) { t.behavior = 'idle'; t.behaviorTimer = random(60, 180); t.vx = 0; t.vy = 0; }
      break;
    case 'digging':
      t.vx = 0; t.vy = 0;
      if (t.behaviorTimer <= 0) {
        // Found buried item!
        let items = ['seed', 'crystal', 'stone'];
        let found = items[floor(random(items.length))];
        if (found === 'seed') { state.seeds++; addFloatingText(w2sX(t.x), w2sY(t.y) - 15, '+1 Seed (found!)', '#88cc44'); }
        else if (found === 'crystal') { state.crystals++; addFloatingText(w2sX(t.x), w2sY(t.y) - 15, '+1 Crystal (found!)', C.crystalGlow); }
        else { state.stone++; addFloatingText(w2sX(t.x), w2sY(t.y) - 15, '+1 Stone (found!)', '#aaaaaa'); }
        spawnParticles(t.x, t.y, 'collect', 4);
        t.lastFindDay = state.day;
        t.findTimer = 3600;
        t.behavior = 'idle'; t.behaviorTimer = random(120, 300);
      }
      break;
    case 'shell':
      t.vx = 0; t.vy = 0;
      t.shellTimer += dt;
      break;
    case 'sleeping':
      t.vx = 0; t.vy = 0;
      break;
  }

  if (t.findTimer > 0) t.findTimer -= dt;
}

// ─── CROW UPDATE ───
function updateCrow(dt) {
  let cr = state.companionPets.crow;
  let p = state.player;
  let hour = state.time / 60;
  let isNight = hour >= 21 || hour < 5;

  cr.circlePhase += 0.008 * dt;
  if (cr.cawTimer > 0) cr.cawTimer -= dt;
  if (cr.bringTimer > 0) cr.bringTimer -= dt;

  // Sleep at night — perch on highest building
  if (isNight) {
    let highest = null, bestY = 9999;
    state.buildings.forEach(b => { if (b.y < bestY) { bestY = b.y; highest = b; } });
    if (highest) {
      cr.perchTarget = { x: highest.x + 10, y: highest.y - 15 };
    } else {
      cr.perchTarget = { x: WORLD.islandCX, y: WORLD.islandCY - 80 };
    }
    let dx = cr.perchTarget.x - cr.x, dy = cr.perchTarget.y - cr.y;
    let d = sqrt(dx * dx + dy * dy);
    if (d > 8) {
      cr.vx = (dx / d) * 1.5; cr.vy = (dy / d) * 1.5;
      cr.x += cr.vx * dt; cr.y += cr.vy * dt;
    } else {
      cr.landed = true; cr.vx = 0; cr.vy = 0; cr.behavior = 'sleeping';
    }
    return;
  }
  cr.perchTarget = null;

  // Warn about enemies — caw before combat on conquest island
  if (state.conquest.active && state.conquest.enemies) {
    let nearEnemy = state.conquest.enemies.find(e => e.state !== 'dead' && dist(p.x, p.y, e.x, e.y) < 200);
    if (nearEnemy && cr.cawTimer <= 0) {
      addFloatingText(w2sX(cr.x), w2sY(cr.y) - 20, 'CAW! CAW!', '#444444');
      cr.cawTimer = 300;
      if (snd) snd.playSFX('alert');
    }
  }

  // Bring items at high level (7+), once per day
  if (cr.level >= 7 && cr.lastBringDay !== state.day && cr.bringTimer <= 0 && random() < 0.0005) {
    let gifts = [
      { item: 'seeds', amount: 2, text: '+2 Seeds', color: '#88cc44' },
      { item: 'crystals', amount: 1, text: '+1 Crystal', color: C.crystalGlow },
      { item: 'gold', amount: 1, text: '+1 Gold (shiny!)', color: '#ffcc44' },
    ];
    let gift = gifts[floor(random(gifts.length))];
    state[gift.item] = (state[gift.item] || 0) + gift.amount;
    addFloatingText(w2sX(cr.x), w2sY(cr.y) - 15, gift.text + ' (crow gift)', gift.color);
    spawnParticles(cr.x, cr.y, 'collect', 4);
    cr.lastBringDay = state.day;
    cr.bringTimer = 3600;
  }

  cr.behaviorTimer -= dt;

  switch (cr.behavior) {
    case 'circling':
      // Circle overhead near player
      let radius = 60 + sin(cr.circlePhase * 0.5) * 20;
      let targetX = p.x + cos(cr.circlePhase) * radius;
      let targetY = p.y - 50 + sin(cr.circlePhase) * radius * 0.3;
      cr.vx = (targetX - cr.x) * 0.04;
      cr.vy = (targetY - cr.y) * 0.04;
      cr.x += cr.vx * dt; cr.y += cr.vy * dt;
      cr.facing = cr.vx > 0 ? 1 : -1;
      cr.landed = false;
      if (cr.behaviorTimer <= 0) {
        // Land on a tree
        let tree = state.trees.find(t => t.alive);
        if (tree && random() < 0.6) {
          cr.behavior = 'landing'; cr.perchTarget = { x: tree.x, y: tree.y - 20 };
          cr.behaviorTimer = random(200, 400);
        } else {
          cr.behaviorTimer = random(200, 500);
        }
      }
      break;
    case 'landing':
      if (cr.perchTarget) {
        let dx = cr.perchTarget.x - cr.x, dy = cr.perchTarget.y - cr.y;
        let d = sqrt(dx * dx + dy * dy);
        if (d > 5) {
          cr.vx = (dx / d) * 2; cr.vy = (dy / d) * 2;
          cr.x += cr.vx * dt; cr.y += cr.vy * dt;
        } else {
          cr.landed = true; cr.vx = 0; cr.vy = 0;
          cr.behavior = 'perched'; cr.behaviorTimer = random(200, 500);
        }
      } else { cr.behavior = 'circling'; cr.behaviorTimer = random(200, 400); }
      break;
    case 'perched':
      cr.vx = 0; cr.vy = 0;
      if (cr.behaviorTimer <= 0) {
        cr.behavior = 'circling'; cr.behaviorTimer = random(200, 500); cr.landed = false;
      }
      break;
    case 'idle':
    default:
      cr.behavior = 'circling'; cr.behaviorTimer = random(200, 500);
      break;
  }
}

// ─── CAT PERSONALITY UPDATE ───
function updateCatPersonality(dt) {
  let cp = state.companionPets.cat;
  let cat = getFirstAdoptedCat();
  if (!cat) return;

  let hour = state.time / 60;
  let isNight = hour >= 21 || hour < 5;

  // Sleep at night near fire/hearth
  if (isNight) {
    let hearth = state.buildings.find(b => b.type === 'torch' || b.type === 'brazier');
    if (hearth && !cp.sleepPos) cp.sleepPos = { x: hearth.x + random(-10, 10), y: hearth.y + random(5, 15) };
    if (!cp.sleepPos) cp.sleepPos = { x: WORLD.islandCX + 20, y: WORLD.islandCY + 10 };
    let dx = cp.sleepPos.x - cat.x, dy = cp.sleepPos.y - cat.y;
    let d = sqrt(dx * dx + dy * dy);
    if (d > 8) { cat.vx = (dx / d) * 0.8; cat.vy = (dy / d) * 0.8; }
    else { cat.vx = 0; cat.vy = 0; cat.state = 'sitting'; }
    cp.behavior = 'sleeping';
    return;
  }
  cp.sleepPos = null;

  // Hiss at enemies on conquest island
  if (state.conquest.active && state.conquest.enemies) {
    let nearEnemy = state.conquest.enemies.find(e => e.state !== 'dead' && dist(cat.x, cat.y, e.x, e.y) < 60);
    if (nearEnemy && cp.behaviorTimer <= 0) {
      addFloatingText(w2sX(cat.x), w2sY(cat.y) - 15, 'HISS!', '#ff6644');
      cp.behaviorTimer = 180;
    }
  }

  cp.behaviorTimer -= dt;
  if (cp.behaviorTimer > 0) return;

  // Personality behaviors based on level
  if (cp.level >= 4 && random() < 0.002) {
    // Chase butterflies
    cp.behavior = 'chasing';
    cp.behaviorTimer = 120;
    cat.state = 'walking';
    cat.vx = random(-1.2, 1.2);
    cat.vy = random(-0.6, 0.6);
    cat.facing = cat.vx > 0 ? 1 : -1;
    cat.timer = 120;
    // Butterfly particles
    for (let i = 0; i < 3; i++) {
      particles.push({
        x: cat.x + random(-20, 20), y: cat.y + random(-20, -5),
        vx: random(-0.5, 0.5), vy: random(-0.8, -0.2),
        life: random(40, 80), maxLife: 80,
        type: 'sundust', size: random(2, 4),
        r: 255, g: 200, b: 100, phase: random(TWO_PI), world: true,
      });
    }
  } else if (random() < 0.001) {
    // Nap in sunbeam
    cp.behavior = 'napping';
    cp.behaviorTimer = 300;
    cat.state = 'sitting';
    cat.timer = 300;
  } else if (cp.level >= 7 && random() < 0.0008) {
    // Sit on building
    let bld = state.buildings[floor(random(state.buildings.length))];
    if (bld) {
      cat.x = bld.x + random(-5, 5); cat.y = bld.y - 5;
      cat.state = 'sitting'; cat.timer = random(200, 400);
      cp.behavior = 'onbuilding';
      cp.behaviorTimer = 400;
    }
  }
}

// ─── CENTURION PERSONALITY UPDATE ───
function updateCenturionPersonality(dt) {
  let cp = state.companionPets.centurion;
  let cen = state.centurion;
  let p = state.player;
  let hour = state.time / 60;
  let isNight = hour >= 21 || hour < 5;

  // Auto-attack enemies at level 5+ (enhance existing combat)
  if (cp.level >= 5 && !state.conquest.active) {
    // Check for home island enemies (random events, etc.)
    if (state.activeEvent && state.activeEvent.enemies) {
      let nearEnemy = state.activeEvent.enemies.find(e => e.hp > 0 && dist(cen.x, cen.y, e.x, e.y) < 80);
      if (nearEnemy && cen.attackTimer <= 0) {
        cen.attackTimer = cen.attackCooldown;
        nearEnemy.hp -= cen.attackDamage;
        addFloatingText(w2sX(nearEnemy.x), w2sY(nearEnemy.y) - 15, '-' + cen.attackDamage, '#ffaa44');
        spawnParticles(nearEnemy.x, nearEnemy.y, 'combat', 2);
      }
    }
  }

  // Sleep behavior — guard at gate
  if (isNight) {
    // Find castrum or gate
    let gate = state.buildings.find(b => b.type === 'arch' || b.type === 'castrum');
    if (gate && !cp.sleepPos) cp.sleepPos = { x: gate.x, y: gate.y + 10 };
    if (!cp.sleepPos) cp.sleepPos = { x: WORLD.islandCX + getSurfaceRX() * 0.7, y: WORLD.islandCY };
    cp.behavior = 'guarding';
    return;
  }
  cp.sleepPos = null;

  cp.behaviorTimer -= dt;
  if (cp.behaviorTimer > 0) return;

  // Salute player when nearby
  if (cp.saluteTimer <= 0 && dist(p.x, p.y, cen.x, cen.y) < 40) {
    if (random() < 0.003) {
      cp.saluteTimer = 600;
      cp.behavior = 'saluting';
      cp.behaviorTimer = 60;
      addFloatingText(w2sX(cen.x), w2sY(cen.y) - 25, 'Ave!', '#ffcc44');
    }
  }
  if (cp.saluteTimer > 0) cp.saluteTimer -= dt;

  // Patrol settlement at level 4+
  if (cp.level >= 4 && cp.patrolTimer <= 0 && cen.task === 'follow') {
    if (random() < 0.001) {
      cp.behavior = 'patrolling';
      cp.behaviorTimer = 300;
      cp.patrolTimer = 1800;
    }
  }
  if (cp.patrolTimer > 0) cp.patrolTimer -= dt;

  // Train at castrum at level 7+
  if (cp.level >= 7 && cp.trainTimer <= 0) {
    let castrum = state.buildings.find(b => b.type === 'castrum');
    if (castrum && random() < 0.0005) {
      cp.behavior = 'training';
      cp.behaviorTimer = 200;
      cp.trainTimer = 3600;
      addFloatingText(w2sX(castrum.x), w2sY(castrum.y) - 15, '*training*', '#ccaa44');
    }
  }
  if (cp.trainTimer > 0) cp.trainTimer -= dt;
}

// ─── COMPANION GIFT SYSTEM ───
function tryCompanionGift(wx, wy) {
  let p = state.player;
  let cp = state.companionPets;

  // Cat: fish → +1 XP
  let cat = getFirstAdoptedCat();
  if (cat && cp.cat.giftCooldown <= 0 && dist(wx, wy, cat.x, cat.y) < 25 && dist(p.x, p.y, cat.x, cat.y) < 50) {
    if (state.fish > 0) {
      state.fish--;
      cp.cat.giftCooldown = 300;
      let leveled = addCompanionXp(cp.cat, 1);
      addFloatingText(w2sX(cat.x), w2sY(cat.y) - 15, '*purrs*', '#ffaacc');
      spawnCompanionHeart(cat.x, cat.y);
      if (leveled) addFloatingText(w2sX(cat.x), w2sY(cat.y) - 28, 'Cat Level ' + cp.cat.level + '!', '#ffcc44');
      return true;
    }
  }

  // Tortoise: crops (harvest) → +1 XP
  let t = cp.tortoise;
  if (t.giftCooldown <= 0 && dist(wx, wy, t.x, t.y) < 25 && dist(p.x, p.y, t.x, t.y) < 50) {
    if (state.harvest > 0) {
      state.harvest--;
      t.giftCooldown = 300;
      let leveled = addCompanionXp(t, 1);
      addFloatingText(w2sX(t.x), w2sY(t.y) - 15, '*happy wiggle*', '#88cc44');
      spawnCompanionHeart(t.x, t.y);
      if (leveled) addFloatingText(w2sX(t.x), w2sY(t.y) - 28, 'Tortoise Level ' + t.level + '!', '#ffcc44');
      return true;
    }
  }

  // Crow: seeds → +1 XP
  let cr = cp.crow;
  if (cr.giftCooldown <= 0 && dist(wx, wy, cr.x, cr.y) < 30 && dist(p.x, p.y, cr.x, cr.y) < 80) {
    if (state.seeds > 0) {
      state.seeds--;
      cr.giftCooldown = 300;
      let leveled = addCompanionXp(cr, 1);
      addFloatingText(w2sX(cr.x), w2sY(cr.y) - 15, '*does a flip!*', '#8888cc');
      spawnCompanionHeart(cr.x, cr.y);
      if (leveled) addFloatingText(w2sX(cr.x), w2sY(cr.y) - 28, 'Crow Level ' + cr.level + '!', '#ffcc44');
      return true;
    }
  }

  // Centurion: gold → +1 XP
  let cen = state.centurion;
  if (cp.centurion.giftCooldown <= 0 && dist(wx, wy, cen.x, cen.y) < 25 && dist(p.x, p.y, cen.x, cen.y) < 50) {
    if (state.gold > 0) {
      state.gold--;
      cp.centurion.giftCooldown = 300;
      let leveled = addCompanionXp(cp.centurion, 1);
      if (leveled && typeof applyCenturionLevelStats === 'function') applyCenturionLevelStats();
      addFloatingText(w2sX(cen.x), w2sY(cen.y) - 25, '*salutes*', '#ffcc44');
      spawnCompanionHeart(cen.x, cen.y);
      if (leveled) addFloatingText(w2sX(cen.x), w2sY(cen.y) - 38, getFactionTerms().leader + ' Level ' + cp.centurion.level + '!', '#ffcc44');
      return true;
    }
  }

  return false;
}

function spawnCompanionHeart(wx, wy) {
  particles.push({
    x: wx, y: wy - 10,
    vx: random(-0.3, 0.3), vy: -1.0,
    life: 50, maxLife: 50,
    type: 'heart', size: 6,
    r: 255, g: 80, b: 120, world: true,
  });
}

// ─── MASTER COMPANION PETS UPDATE ───
function updateCompanionPets(dt) {
  if (!state.companionPets) return;
  updateCompanionPetProximity(dt);
  updateTortoise(dt);
  updateCrow(dt);
  updateCatPersonality(dt);
  updateCenturionPersonality(dt);
}

// ─── TORTOISE DRAW ───
function drawTortoise() {
  let t = state.companionPets.tortoise;
  let sx = w2sX(t.x), sy = w2sY(t.y);
  let bob = floor(sin(frameCount * 0.03) * 1);
  let cp = state.companionPets.tortoise;

  push();
  translate(floor(sx), floor(sy + bob));
  scale(t.facing, 1);
  noStroke();

  // Shadow
  fill(0, 0, 0, 25); rect(-8, 5, 16, 3);

  if (t.behavior === 'shell' || t.behavior === 'sleeping') {
    // Tucked in shell — dome shape
    fill(80, 110, 50); rect(-7, -3, 14, 8); // shell
    fill(90, 125, 55); rect(-6, -4, 12, 3); // shell top
    fill(70, 95, 45); // shell pattern
    rect(-4, -2, 3, 2); rect(1, -2, 3, 2); rect(-2, 0, 4, 2);
    if (t.behavior === 'sleeping') {
      // Zzz
      fill(200, 200, 255, 120); textSize(5); textAlign(CENTER);
      text('z', 8, -8 + sin(frameCount * 0.05) * 2);
      textAlign(LEFT, TOP);
    }
  } else {
    // Walking/idle tortoise
    // Legs
    fill(110, 140, 70);
    let walk = t.behavior === 'exploring' ? floor(sin(frameCount * 0.06) * 1) : 0;
    rect(-8, 2, 3, 3 + walk); rect(5, 2, 3, 3 - walk); // front/back legs
    rect(-6, 3, 2, 2); rect(4, 3, 2, 2);

    // Shell body
    fill(80, 110, 50); rect(-6, -4, 12, 8);
    fill(90, 125, 55); rect(-5, -5, 10, 3); // shell dome
    // Shell pattern — hexagonal
    fill(70, 95, 45);
    rect(-3, -3, 2, 2); rect(1, -3, 2, 2);
    rect(-4, -1, 2, 2); rect(0, -1, 2, 2); rect(3, -1, 2, 2);

    // Head
    fill(120, 150, 80);
    rect(6, -2, 4, 3);
    // Eye
    fill(30, 30, 20); rect(8, -1, 1, 1);

    // Tail
    fill(110, 140, 70); rect(-8, 0, 2, 1);

    // Digging animation
    if (t.behavior === 'digging' && frameCount % 8 < 4) {
      fill(140, 120, 80, 150);
      rect(5, 3, 3, 2); // dirt particles
      rect(8, 1, 2, 2);
    }
  }

  pop();

  // Label with level
  noStroke();
  fill(80, 110, 50, 140); textSize(6); textAlign(CENTER, TOP);
  text('TORTOISE' + companionLevelName(cp.level) + ' Lv' + cp.level, floor(sx), floor(sy + 10));
  textAlign(LEFT, TOP);
}

// ─── CROW DRAW ───
function drawCrow() {
  let cr = state.companionPets.crow;
  let sx = w2sX(cr.x), sy = w2sY(cr.y);

  push();
  translate(floor(sx), floor(sy));
  scale(cr.facing, 1);
  noStroke();

  if (cr.landed || cr.behavior === 'perched' || cr.behavior === 'sleeping') {
    // Perched crow
    fill(0, 0, 0, 25); rect(-4, 5, 8, 2); // shadow
    // Body
    fill(30, 30, 35); rect(-4, -2, 8, 6);
    // Head
    fill(35, 35, 40); rect(-2, -6, 5, 4);
    // Beak
    fill(60, 55, 30); rect(3, -4, 3, 2);
    // Eye
    fill(180, 180, 200); rect(1, -5, 1, 1);
    // Tail
    fill(25, 25, 30); rect(-6, 1, 2, 4);
    // Legs
    fill(50, 45, 30); rect(-2, 4, 1, 3); rect(1, 4, 1, 3);
    // Sleeping
    if (cr.behavior === 'sleeping') {
      fill(200, 200, 255, 120); textSize(5); textAlign(CENTER);
      text('z', 5, -10 + sin(frameCount * 0.05) * 2);
      textAlign(LEFT, TOP);
    }
  } else {
    // Flying crow — wings spread
    let wingPhase = sin(frameCount * 0.15) * 8;
    // Body
    fill(30, 30, 35); rect(-3, -1, 6, 4);
    // Head
    fill(35, 35, 40); rect(3, -3, 4, 3);
    // Beak
    fill(60, 55, 30); rect(7, -2, 2, 1);
    // Eye
    fill(180, 180, 200); rect(5, -2, 1, 1);
    // Wings
    fill(25, 25, 30);
    // Left wing
    beginShape();
    vertex(-3, 0); vertex(-10, -3 + wingPhase); vertex(-6, 1);
    endShape(CLOSE);
    // Right wing
    beginShape();
    vertex(-3, 0); vertex(-10, -3 - wingPhase); vertex(-6, 1);
    endShape(CLOSE);
    // Upper wings
    fill(40, 40, 45);
    rect(-8, -2 + floor(wingPhase * 0.3), 5, 1);
    // Tail
    fill(25, 25, 30); rect(-5, 1, 2, 3);
  }

  pop();

  // Label with level
  noStroke();
  fill(50, 50, 60, 140); textSize(6); textAlign(CENTER, TOP);
  text('CROW' + companionLevelName(cr.level) + ' Lv' + cr.level, floor(sx), floor(sy + 8));
  textAlign(LEFT, TOP);
}

// ─── COMPANION LEVEL DISPLAY (patched into existing draws) ───
function getCompanionPetCatLabel() {
  let cp = state.companionPets;
  if (!cp) return '';
  return ' Lv' + cp.cat.level;
}

function getCompanionPetCenturionLabel() {
  let cp = state.companionPets;
  if (!cp) return '';
  return ' Lv' + cp.centurion.level;
}

function drawDialogBubble(x, y, txt) {
  textSize(8.5);
  let maxW = 160;
  let lineH = 11;
  let words = txt.split(' ');
  let lines = [''];
  words.forEach(w => {
    let test = lines[lines.length - 1] + w + ' ';
    if (textWidth(test) > maxW) lines.push(w + ' ');
    else lines[lines.length - 1] = test;
  });
  let bh = lines.length * lineH + 12;
  let bw = min(maxW + 16, 180);

  fill(color(C.hudBg));
  stroke(color(C.hudBorder));
  strokeWeight(1);
  rect(x - bw / 2, y - bh, bw, bh, 5);
  fill(color(C.hudBg));
  noStroke();
  triangle(x - 5, y, x + 5, y, x, y + 8);

  fill(color(C.textBright));
  noStroke();
  textAlign(LEFT, TOP);
  textSize(8.5);
  lines.forEach((ln, i) => {
    text(ln, x - bw / 2 + 8, y - bh + 6 + i * lineH);
  });
  textAlign(CENTER, CENTER);
}

function drawHeart(x, y, s) {
  beginShape();
  vertex(x, y - s * 0.3);
  bezierVertex(x - s, y - s, x - s * 1.5, y + s * 0.3, x, y + s);
  bezierVertex(x + s * 1.5, y + s * 0.3, x + s, y - s, x, y - s * 0.3);
  endShape(CLOSE);
}

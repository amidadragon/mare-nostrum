// player.js — Player rendering, movement, animation, wardrobe, combat
// Extracted from sketch.js. All globals (state, WORLD, cam, particles, etc.)
// remain in sketch.js and are accessed here as globals.

const TUNIC_COLORS = [
  { name: 'Natural',  rgb: [220, 200, 170] },
  { name: 'Saffron',  rgb: [240, 180, 60] },
  { name: 'Indigo',   rgb: [80, 100, 200] },
  { name: 'Scarlet',  rgb: [200, 60, 60] },
  { name: 'Forest',   rgb: [80, 140, 80] },
  { name: 'Bone',     rgb: [240, 235, 220] },
];

const HEADWEAR = [
  { name: 'None',         unlocked: function() { return true; } },
  { name: 'Laurel Crown', unlocked: function() { return (state.islandLevel || 0) >= 10; } },
  { name: 'Bronze Helm',  unlocked: function() { return (state.player.totalXp || 0) >= 500 || (state.codex && state.codex.enemies && Object.values(state.codex.enemies).reduce(function(s,e) { return s + (e.count || 0); }, 0) >= 50); } },
];

let wardrobeOpen = false;


function updatePlayer(dt) {
  if (!state || !state.player) return;
  if (state.rowing && state.rowing.active) { updateRowing(dt); return; }
  let p = state.player;
  // Heart bonuses: 2+ hearts = +15% speed, 4+ hearts = +30% speed
  let heartSpeedBonus = (state.npc && state.npc.hearts >= 4) ? 1.3 : ((state.npc && state.npc.hearts >= 2) ? 1.15 : 1);
  let spd = p.speed * heartSpeedBonus;
  // Storm slows movement
  if (stormActive || (state.weather && state.weather.type === 'storm')) spd *= 0.7;
  if (state.prophecy && state.prophecy.type === 'speed') spd *= 1.25;
  // Faction passive speed modifiers (Greece +15%, Testudo/Phalanx lock)
  if (typeof getFactionMoveSpeedMult === 'function') {
    let fSpd = getFactionMoveSpeedMult();
    if (fSpd <= 0 && ((state.conquest && state.conquest.active) || (state.adventure && state.adventure.active))) { spd = 0; }
    else spd *= fSpd;
  }

  if (p.dashTimer > 0) {
    spd *= 3.5;
    p.dashTimer -= dt;
  }
  if (p.dashCooldown > 0) p.dashCooldown -= dt;
  // Tool swing hitlag: freeze animation for 2 frames on impact
  if (p._hitlagFrames > 0) {
    p._hitlagFrames -= dt;
  } else if (p.toolSwing > 0) {
    p.toolSwing -= dt;
  }

  // Slow down in shallow water / diving
  let inShallows = isInShallows(p.x, p.y);
  if (inShallows && !p._wasInShallows) {
    if (snd) snd.playSFX('water');
    // Water entry splash — burst of droplets arcing upward
    for (let si = 0; si < 7; si++) {
      let angle = -PI * 0.15 - random(0, PI * 0.7);
      particles.push({
        x: p.x + random(-6, 6), y: p.y + random(2, 6),
        vx: cos(angle) * random(1.2, 2.5), vy: sin(angle) * random(1.5, 3.0),
        life: random(18, 30), maxLife: 30,
        type: 'burst', size: random(2, 5),
        r: 160, g: 210, b: 245, gravity: 0.12, world: true,
      });
    }
    // Tiny vertical camera bob (2px down then back over 10 frames)
    p._waterBobTimer = 10;
  }
  p._wasInShallows = inShallows;
  // Water entry camera bob update
  if (p._waterBobTimer > 0) {
    p._waterBobTimer -= dt;
    let prog = p._waterBobTimer / 10;
    shakeY += sin(prog * PI) * 2;
  }
  if (inShallows) spd *= (state.diving && state.diving.active) ? 0.7 : 0.55;

  // Sprint: hold SHIFT to run 1.6x faster
  if (isKeybindDown('sprint')) spd *= 1.6;

  let dx = 0, dy = 0;
  if (isKeybindDown('moveLeft') || keyIsDown(LEFT_ARROW))  dx -= 1;
  if (isKeybindDown('moveRight') || keyIsDown(RIGHT_ARROW)) dx += 1;
  if (isKeybindDown('moveUp') || keyIsDown(UP_ARROW))    dy -= 1;
  if (isKeybindDown('moveDown') || keyIsDown(DOWN_ARROW))  dy += 1;
  // Virtual joystick input (mobile)
  if (dx === 0 && dy === 0 && typeof _touchJoystick !== 'undefined' && _touchJoystick.active) {
    dx = _touchJoystick.dx;
    dy = _touchJoystick.dy;
  }

  if (dx !== 0 || dy !== 0) {
    if (state.fishing.active) { state.fishing.active = false; state.fishing.bite = false; state.fishing.phase = null; }
    let len = sqrt(dx * dx + dy * dy);
    p.vx = (dx / len) * spd;
    p.vy = (dy / len) * spd;
    p.moving = true;
    p.targetX = null; p.targetY = null;
    let _prevFacing = p.facing;
    if (dx > 0) p.facing = 'right';
    else if (dx < 0) p.facing = 'left';
    else if (dy < 0) p.facing = 'up';
    else p.facing = 'down';
    // Dust puff on quick direction change
    if (_prevFacing && _prevFacing !== p.facing && p.moving) {
      for (let _di = 0; _di < 3; _di++) {
        particles.push({
          x: p.x + random(-3, 3), y: p.y + 6,
          vx: random(-0.8, 0.8), vy: random(-1.0, -0.3),
          life: 12, maxLife: 12, type: 'burst', size: random(2, 4),
          r: 160, g: 140, b: 100, world: true,
        });
      }
    }
  } else if (p.targetX !== null) {
    let tdx = p.targetX - p.x;
    let tdy = p.targetY - p.y;
    let tdist = sqrt(tdx * tdx + tdy * tdy);
    if (tdist < spd * 1.5) {
      p.targetX = null; p.targetY = null;
      p.vx = 0; p.vy = 0;
      p.moving = false;
    } else {
      p.vx = (tdx / tdist) * spd;
      p.vy = (tdy / tdist) * spd;
      p.moving = true;
    }
  } else {
    p.vx *= 0.7;
    p.vy *= 0.7;
    p.moving = false;
  }

  // Idle frames counter for breathing animation
  if (p.moving) { p._idleFrames = 0; } else { p._idleFrames = (p._idleFrames || 0) + dt; }

  // Footstep dust
  if (p.moving && frameCount % 8 === 0) {
    particles.push({
      x: p.x + random(-4, 4), y: p.y + 8,
      vx: random(-0.3, 0.3), vy: random(-0.5, 0),
      life: 15, maxLife: 15, type: 'burst',
      r: 140, g: 120, b: 80, size: random(2, 4), world: true,
    });
  }

  let newX = p.x + p.vx * dt;
  let newY = p.y + p.vy * dt;

  // Check if new position is walkable and not blocked
  if (isWalkable(newX, newY) && !isBlockedByBuilding(newX, newY)) {
    p.x = newX;
    p.y = newY;
  } else if (isWalkable(newX, p.y) && !isBlockedByBuilding(newX, p.y)) {
    // Slide along X
    p.x = newX;
    p.vy = 0;
  } else if (isWalkable(p.x, newY) && !isBlockedByBuilding(p.x, newY)) {
    // Slide along Y
    p.y = newY;
    p.vx = 0;
  } else {
    // Fully blocked — push back toward island center
    let pushX = WORLD.islandCX - p.x;
    let pushY = WORLD.islandCY - p.y;
    let pushD = sqrt(pushX * pushX + pushY * pushY);
    if (pushD > 0) {
      p.x += (pushX / pushD) * 1.5;
      p.y += (pushY / pushD) * 1.5;
    }
    p.vx = 0;
    p.vy = 0;
  }

  // Imperial Bridge transition: walk onto Terra Nova
  if (state.imperialBridge.built && state.conquest.colonized && isOnConquestIsland(p.x, p.y)) {
    enterConquest();
    return;
  }

  // Hard clamp: if somehow off island+shallows and not on bridge, push back
  if (!isWalkable(p.x, p.y)) {
    let edx = (p.x - WORLD.islandCX) / getSurfaceRX();
    let edy = (p.y - WORLD.islandCY) / getSurfaceRY();
    let eDist = sqrt(edx * edx + edy * edy);
    if (eDist > 1.07) {
      let sc = 1.05 / eDist;
      p.x = WORLD.islandCX + (p.x - WORLD.islandCX) * sc;
      p.y = WORLD.islandCY + (p.y - WORLD.islandCY) * sc;
    }
  }

  // Footstep particles — dust on land, splashes in shallows
  if (p.moving && frameCount % 6 === 0) {
    if (inShallows) {
      // Water splashes
      for (let si = 0; si < 2; si++) {
        particles.push({
          x: p.x + random(-6, 6), y: p.y + random(0, 4),
          vx: random(-0.5, 0.5), vy: random(-1.2, -0.3),
          life: random(12, 20), maxLife: 20,
          type: 'burst', size: random(2, 4),
          r: 180, g: 210, b: 240, world: true,
        });
      }
    } else if (isOnIsland(p.x, p.y)) {
      // Terrain-matched footsteps: sand near coast, leaves on grass inland
      let _fdx = (p.x - WORLD.islandCX) / getSurfaceRX();
      let _fdy = (p.y - WORLD.islandCY) / getSurfaceRY();
      let _fdist = _fdx * _fdx + _fdy * _fdy;
      let _isBeach = _fdist > 0.75; // outer 25% is sandy
      particles.push({
        x: p.x + random(-4, 4), y: p.y + random(2, 6),
        vx: random(-0.3, 0.3), vy: random(-0.4, -0.1),
        life: random(15, 25), maxLife: 25,
        type: 'dust', size: random(2, 4),
        r: _isBeach ? 180 : 80, g: _isBeach ? 170 : 120, b: _isBeach ? 130 : 50,
        world: true,
      });
      // Occasional leaf kick on grass
      if (!_isBeach && random() < 0.3) {
        particles.push({
          x: p.x + random(-3, 3), y: p.y + random(1, 4),
          vx: random(-0.6, 0.6), vy: random(-1.2, -0.5),
          life: random(20, 35), maxLife: 35, type: 'burst',
          size: random(1.5, 3), gravity: 0.04,
          r: 70 + floor(random(30)), g: 110 + floor(random(30)), b: 40,
          world: true,
        });
      }
    }
  }

  if (p.moving || p.dashTimer > 0) {
    p.trailPoints.unshift({ x: p.x, y: p.y, life: 12 });
  }
  p.trailPoints = p.trailPoints.filter(t => t.life > 0);
  p.trailPoints.forEach(t => t.life--);
}

function drawPlayerTrail() {
  let p = state.player;
  p.trailPoints.forEach(t => {
    let a = map(t.life, 0, 12, 0, 120);
    let sz = floor(map(t.life, 0, 12, 1, 3));
    noStroke();
    if (p.dashTimer > 0) {
      fill(255, 120, 0, a);
    } else {
      fill(200, 160, 80, a * 0.4);
    }
    rect(floor(w2sX(t.x)), floor(w2sY(t.y)), sz, sz);
  });
}

// ─── PLAYER ANIMATION UPDATE ──────────────────────────────────────────────
function updatePlayerAnim(dt) {
  let p = state.player;
  let a = p.anim;

  // Walk frame advance (4-frame cycle, ~8 frames per step)
  if (p.moving) {
    a.walkTimer += dt;
    if (a.walkTimer >= 8) {
      a.walkTimer = 0; a.walkFrame = (a.walkFrame + 1) % 4;
      // Footstep sound on frames 1 and 3 (feet hitting ground)
      if ((a.walkFrame === 1 || a.walkFrame === 3) && snd && frameCount % 2 === 0) {
        snd.playSFX(isInShallows(p.x, p.y) ? 'water' : 'step_sand');
      }
    }
  } else {
    a.walkFrame = 0; a.walkTimer = 0;
  }

  // Blink cycle — random interval 3-5 seconds
  a.blinkTimer -= dt;
  if (a.blinkTimer <= 0) {
    a.blinkFrame = 1;
    a.blinkTimer = floor(random(180, 300));
  }
  if (a.blinkFrame > 0) {
    a.blinkFrame += dt * 0.4;
    if (a.blinkFrame > 3) a.blinkFrame = 0;
  }

  // Bounce (harvest joy) decay
  if (a.bounceTimer > 0) {
    a.bounceTimer -= dt;
    let prog = a.bounceTimer / 12;
    a.bounceY = floor(sin(prog * PI) * -3);
  } else { a.bounceY = 0; }

  // Temporary emotion decay
  if (a.emotionTimer > 0) {
    a.emotionTimer -= dt;
    if (a.emotionTimer <= 0) a.emotion = 'determined';
  }

  // Time-driven emotion: weary at night (after 9pm), peaceful at temple
  let hour = state.time / 60;
  if (a.emotionTimer <= 0) {
    if (hour >= 21 || hour < 5) a.emotion = 'weary';
    else a.emotion = 'determined';
  }

  // Context helmet: off when farming/fishing, on in combat/conquest
  a.helmetOff = (p.hotbarSlot <= 3 && !state.conquest.active && !state.adventure.active);
}

// Trigger harvest joy bounce + happy face
function triggerPlayerJoy() {
  let a = state.player.anim;
  a.emotion = 'happy'; a.emotionTimer = 45;
  a.bounceTimer = 12;
}

// Trigger combat alert face
function triggerPlayerAlert() {
  let a = state.player.anim;
  if (a.emotion !== 'alert') { a.emotion = 'alert'; a.emotionTimer = 60; }
}

function drawWardrobe() {
  if (!wardrobeOpen) return;

  let pw = min(220, width - 20), ph = min(280, height - 20);
  let px = max(10, width / 2 - pw / 2);
  let py = max(10, height / 2 - ph / 2);

  noStroke();
  fill(0, 0, 0, 120);
  rect(0, 0, width, height);

  fill(45, 35, 25);
  rect(px, py, pw, ph, 6);
  fill(65, 52, 38);
  rect(px + 4, py + 4, pw - 8, ph - 8, 4);

  fill(220, 200, 160);
  textSize(14);
  textAlign(CENTER);
  text('WARDROBE', px + pw / 2, py + 24);

  fill(180, 165, 135);
  textSize(10);
  text('Tunic', px + pw / 2, py + 46);

  let swatchSize = 24;
  let swatchGap = 8;
  let swatchStartX = px + (pw - (TUNIC_COLORS.length * (swatchSize + swatchGap) - swatchGap)) / 2;

  for (let i = 0; i < TUNIC_COLORS.length; i++) {
    let sx = swatchStartX + i * (swatchSize + swatchGap);
    let sy = py + 54;
    let tc = TUNIC_COLORS[i];

    fill(tc.rgb[0], tc.rgb[1], tc.rgb[2]);
    ellipse(sx + swatchSize / 2, sy + swatchSize / 2, swatchSize, swatchSize);

    if (state.wardrobe.tunicColor === i) {
      noFill();
      stroke(220, 190, 80);
      strokeWeight(2);
      ellipse(sx + swatchSize / 2, sy + swatchSize / 2, swatchSize + 4, swatchSize + 4);
      noStroke();
    }

    fill(160, 145, 120);
    textSize(7);
    text(tc.name, sx + swatchSize / 2, sy + swatchSize + 10);
  }

  fill(180, 165, 135);
  textSize(10);
  text('Headwear', px + pw / 2, py + 110);

  let hwSize = 40;
  let hwGap = 16;
  let hwStartX = px + (pw - (HEADWEAR.length * (hwSize + hwGap) - hwGap)) / 2;

  for (let i = 0; i < HEADWEAR.length; i++) {
    let hx = hwStartX + i * (hwSize + hwGap);
    let hy = py + 120;
    let hw = HEADWEAR[i];
    let isUnlocked = hw.unlocked();

    fill(isUnlocked ? 55 : 40, isUnlocked ? 45 : 35, isUnlocked ? 35 : 30);
    rect(hx, hy, hwSize, hwSize, 4);

    if (state.wardrobe.headwear === i && isUnlocked) {
      noFill();
      stroke(220, 190, 80);
      strokeWeight(2);
      rect(hx - 2, hy - 2, hwSize + 4, hwSize + 4, 5);
      noStroke();
    }

    if (!isUnlocked) {
      fill(100, 90, 70);
      rect(hx + hwSize/2 - 5, hy + hwSize/2 - 4, 10, 8, 2);
      noFill();
      stroke(100, 90, 70);
      strokeWeight(1.5);
      arc(hx + hwSize/2, hy + hwSize/2 - 4, 8, 8, PI, TWO_PI);
      noStroke();
    } else {
      push();
      translate(hx + hwSize / 2, hy + hwSize / 2);
      noStroke();
      if (i === 0) {
        fill(195, 165, 130);
        ellipse(0, -2, 14, 16);
      } else if (i === 1) {
        fill(80, 160, 60);
        for (let l = -3; l <= 3; l++) {
          let la = l * 0.4;
          let lx = cos(la - HALF_PI) * 8;
          let ly = sin(la - HALF_PI) * 8;
          ellipse(lx, ly - 2, 5, 3);
        }
      } else if (i === 2) {
        fill(180, 150, 100);
        arc(0, 2, 18, 16, PI, TWO_PI);
        rect(-9, 2, 18, 4);
        fill(160, 130, 80);
        rect(-2, 2, 4, 8);
        fill(200, 50, 40);
        rect(-8, -8, 16, 3, 1);
      }
      pop();
    }

    fill(isUnlocked ? 160 : 100, isUnlocked ? 145 : 90, isUnlocked ? 120 : 70);
    textSize(7);
    textAlign(CENTER);
    text(hw.name, hx + hwSize / 2, hy + hwSize + 12);
  }

  fill(180, 165, 135);
  textSize(10);
  text('Preview', px + pw / 2, py + 195);

  push();
  translate(px + pw / 2, py + 235);
  scale(2);
  drawPlayerPreview();
  pop();

  fill(140, 125, 100);
  textSize(9);
  text('[V] Close', px + pw / 2, py + ph - 10);

  textAlign(LEFT);
}

function drawPlayerPreview() {
  let tc = TUNIC_COLORS[state.wardrobe ? state.wardrobe.tunicColor || 0 : 0].rgb;
  noStroke();

  fill(0, 0, 0, 30);
  ellipse(0, 8, 12, 4);

  fill(tc[0] - 30, tc[1] - 30, tc[2] - 30);
  rect(-3, 3, 2, 5);
  rect(1, 3, 2, 5);

  fill(tc[0], tc[1], tc[2]);
  rect(-4, -5, 8, 9);

  fill(120, 90, 50);
  rect(-4, 1, 8, 2);

  fill(195, 165, 130);
  rect(-3, -10, 6, 5);

  fill(50);
  rect(-2, -8, 1, 1);
  rect(1, -8, 1, 1);

  let hw = state.wardrobe ? state.wardrobe.headwear || 0 : 0;
  if (hw === 0) {
    fill(80, 60, 40);
    rect(-3, -11, 6, 2);
  } else if (hw === 1) {
    fill(80, 160, 60);
    rect(-4, -12, 8, 2);
    rect(-5, -11, 2, 2);
    rect(3, -11, 2, 2);
  } else if (hw === 2) {
    fill(180, 150, 100);
    rect(-4, -12, 8, 4);
    rect(-3, -8, 6, 1);
    fill(200, 50, 40);
    rect(-3, -13, 6, 2);
  }
}

function drawPlayer() {
  if (state.rowing.active) return;
  // Try sprite first, fall back to rect-based drawing
  if (typeof SpriteManager !== 'undefined' && drawPlayerSprite(
    w2sX(state.player.x), w2sY(state.player.y),
    state.faction, state.player.facing,
    state.player.moving ? 'walk' : 'idle',
    Math.floor(frameCount / 8) % 4
  )) return;
  let p = state.player;
  let a = p.anim;
  let sx = w2sX(p.x);
  let sy = w2sY(p.y);
  let s = p.size;

  // Idle breathing bob + bounce
  let bobY = p.moving ? sin(frameCount * 0.25) * 2 : sin(frameCount * 0.04) * 0.8;
  // Deep idle breathing — subtle weight-shift after standing still 120+ frames
  if (!p.moving && (p._idleFrames || 0) > 120) {
    bobY += sin(frameCount * 0.03) * 0.5;
  }
  // Weary slump at night
  if (a.emotion === 'weary' && !p.moving) bobY += 1;

  // Dodge roll motion blur — ghost silhouettes trailing behind
  if (typeof _dodgeState !== 'undefined' && _dodgeState.motionBlur > 0) {
    let blurDx = _dodgeState.dx * -3;
    let blurDy = _dodgeState.dy * -3;
    for (let gi = 2; gi >= 1; gi--) {
      push();
      translate(floor(sx + blurDx * gi), floor(sy + bobY + a.bounceY + blurDy * gi));
      noStroke();
      fill(180, 140, 90, 30 / gi);
      rect(-8, -16, 16, 22, 2);
      pop();
    }
  }

  push();
  translate(floor(sx), floor(sy + bobY + a.bounceY));
  // Squash & stretch on dash landing
  if (!p._squashTimer) p._squashTimer = 0;
  if (p._wasDashing && p.dashTimer <= 0) {
    p._squashTimer = 8; // start squash
  }
  p._wasDashing = p.dashTimer > 0;
  if (p._squashTimer > 0) {
    let _sqt = p._squashTimer / 8;
    let _sqX = 1 + 0.15 * sin(_sqt * PI); // wider
    let _sqY = 1 - 0.12 * sin(_sqt * PI); // shorter
    scale(_sqX, _sqY);
    p._squashTimer -= 1;
  }
  noStroke();

  let fDir = (p.facing === 'left') ? -1 : 1;
  let facingUp = (p.facing === 'up');

  // Walk cycle offsets (4-frame: 0=neutral, 1=left forward, 2=neutral, 3=right forward)
  let legOff = 0, armSwing = 0;
  if (p.moving) {
    let wf = a.walkFrame;
    legOff = (wf === 1) ? 2 : (wf === 3) ? -2 : 0;
    armSwing = (wf === 1) ? 1 : (wf === 3) ? -1 : 0;
  }

  let inWater = isInShallows(p.x, p.y);
  let isDiving = state.diving && state.diving.active;

  if (isDiving) {
    // Underwater swimming — tilted body, fluid arm/leg motion
    push();
    let swimSpeed = p.moving ? 1 : 0.3;
    let t = frameCount * swimSpeed;
    // Body tilts forward when moving
    let tiltAngle = p.moving ? fDir * 0.25 : fDir * 0.05;
    rotate(tiltAngle);
    // Gentle underwater float bob
    let floatY = sin(frameCount * 0.04) * 3;
    translate(0, floatY);

    // Shadow/glow on seabed below
    fill(0, 20, 40, 20);
    ellipse(0, 18, 22, 6);

    // Legs — flutter kick (offset sine waves)
    fill(220, 185, 150);
    let kickL = sin(t * 0.15) * 5 * swimSpeed;
    let kickR = sin(t * 0.15 + PI) * 5 * swimSpeed;
    push(); translate(-2, 8);
    rotate(kickL * 0.04);
    rect(-2, 0, 3, 10); // left thigh
    rect(-2, 9, 4, 3); // left foot
    pop();
    push(); translate(2, 8);
    rotate(kickR * 0.04);
    rect(-1, 0, 3, 10); // right thigh
    rect(-1, 9, 4, 3); // right foot
    pop();
    // Sandals
    fill(107, 66, 38);
    rect(-4, 17 + kickL * 0.5, 4, 2);
    rect(1, 17 + kickR * 0.5, 4, 2);

    // Tunic body — faction-colored when on home island
    let _dtc = TUNIC_COLORS[state.wardrobe ? state.wardrobe.tunicColor || 0 : 0].rgb;
    let _dHas = state.wardrobe && state.wardrobe.tunicColor > 0;
    let _dIsRoman = state.progression && state.progression.homeIslandReached;
    let _dft = (_dIsRoman && typeof getFactionData === 'function') ? (getFactionData().player || {}).tunic || [180, 50, 40] : [180, 50, 40];
    fill(_dHas ? _dtc[0] : _dft[0], _dHas ? _dtc[1] : _dft[1], _dHas ? _dtc[2] : _dft[2]);
    rect(-7, -4, 14, 14, 2);
    // Tunic ripple in water
    fill(_dHas ? _dtc[0] - 20 : _dft[0] - 20, _dHas ? _dtc[1] - 10 : _dft[1] - 10, _dHas ? _dtc[2] - 5 : _dft[2] - 5, 150);
    let ripple = sin(t * 0.06) * 1.5;
    rect(-8 + ripple, 2, 16, 3);
    // Belt
    fill(200, 170, 50);
    rect(-7, 3, 14, 2);
    fill(220, 190, 60);
    rect(-2, 2, 4, 3); // buckle

    // Arms — breaststroke motion
    fill(220, 185, 150);
    let armPhase = t * 0.1;
    let armLx = sin(armPhase) * 8 * swimSpeed;
    let armLy = cos(armPhase) * 4;
    let armRx = sin(armPhase + PI) * 8 * swimSpeed;
    let armRy = cos(armPhase + PI) * 4;
    // Left arm
    push(); translate(-7, -1);
    rect(armLx - 3, armLy, 3, 7);
    pop();
    // Right arm
    push(); translate(7, -1);
    rect(armRx, armRy, 3, 7);
    pop();

    // Weapon trail when attacking (faction-colored)
    if (p.slashPhase > 0) {
      let slashArc = map(p.slashPhase, 10, 0, -1, 1);
      let _wf = state.faction || 'rome';
      let _wtr = 255, _wtg = 220, _wtb = 100;
      if (_wf === 'rome') { _wtr = 255; _wtg = 100; _wtb = 80; }
      else if (_wf === 'carthage') { _wtr = 160; _wtg = 80; _wtb = 200; }
      else if (_wf === 'egypt') { _wtr = 221; _wtg = 170; _wtb = 34; }
      else if (_wf === 'greece') { _wtr = 200; _wtg = 220; _wtb = 255; }
      stroke(_wtr, _wtg, _wtb, p.slashPhase * 20);
      strokeWeight(2);
      let sx1 = fDir * 10, sy1 = -5 + slashArc * 8;
      let sx2 = fDir * 18, sy2 = slashArc * 12;
      line(sx1, sy1, sx2, sy2);
      noStroke();
      // Weapon
      fill(180, 180, 190);
      rect(fDir * 12, -4 + slashArc * 6, fDir * 8, 2);
    }

    // Head
    let isRomanDive = state.progression && state.progression.homeIslandReached;
    drawPlayerHead(fDir, facingUp, a, isRomanDive);

    pop();

    // Breath bubbles
    if (frameCount % 15 < 2) {
      fill(180, 225, 255, 140);
      let bx = fDir * 4 + sin(frameCount * 0.2) * 3;
      ellipse(bx, -20 + floatY, 3, 3);
      fill(200, 235, 255, 100);
      ellipse(bx + random(-3, 3), -25 + floatY, 2, 2);
      ellipse(bx + random(-2, 2), -29 + floatY, 1.5, 1.5);
    }
  } else if (inWater) {
    // Swimming mode — only draw upper body, add water line
    let isRomanSwim = state.progression && state.progression.homeIslandReached;
    drawPlayerBody(isRomanSwim);
    drawPlayerArms(p.moving ? floor(sin(frameCount * 0.15) * 2) : 0); // swim stroke
    drawPlayerHead(fDir, facingUp, a, isRomanSwim);
    // Water surface line over legs
    fill(60, 140, 180, 100);
    ellipse(0, 6, 28 + sin(frameCount * 0.08) * 4, 8);
    fill(100, 180, 220, 60);
    ellipse(0, 5, 22 + sin(frameCount * 0.12 + 1) * 3, 5);
    // Ripple rings when moving
    if (p.moving) {
      noFill(); stroke(120, 200, 240, 40); strokeWeight(0.5);
      let rPhase = (frameCount * 0.1) % TWO_PI;
      ellipse(0, 6, 20 + sin(rPhase) * 10, 6 + sin(rPhase) * 3);
      noStroke();
    }
  } else {
    let isRoman = state.progression && state.progression.homeIslandReached;
    drawPlayerShadow(s);
    drawPlayerFeet(s, legOff);
    drawPlayerCape(fDir, p.moving, isRoman);
    drawPlayerBody(isRoman);
    drawPlayerArms(armSwing);
    drawPlayerTool(fDir, p.hotbarSlot, p.toolSwing);
    drawPlayerHead(fDir, facingUp, a, isRoman);
  }

  // Dash cross-flash
  if (p.dashTimer > 0) {
    fill(220, 180, 50, 25);
    rect(-12, -1, 24, 2);
    rect(-1, -14, 2, 24);
  }

  pop();
}

function drawPlayerShadow(s) {
  // Shadow scales with time of day — longer at dawn/dusk
  let hr = (state.time || 720) / 60;
  let shadowStretch = 1;
  if (hr < 8) shadowStretch = map(hr, 5, 8, 2, 1);
  else if (hr > 17) shadowStretch = map(hr, 17, 20, 1, 2);
  shadowStretch = constrain(shadowStretch, 1, 2);
  let shadowAlpha = hr > 20 || hr < 5 ? 15 : 45;
  fill(0, 0, 0, shadowAlpha);
  ellipse(0, s, 20 * shadowStretch, 5);
  fill(0, 0, 0, shadowAlpha * 0.55);
  ellipse(0, s, 14 * shadowStretch, 3);
}

function drawPlayerFeet(s, legOff) {
  let _fFac = state.faction || 'rome';
  let _fIsRoman = state.progression && state.progression.homeIslandReached;
  if (_fIsRoman && _fFac === 'seapeople') {
    // Fur boots
    fill(130, 100, 60);
    rect(-5, s - 4 + legOff, 4, 4); rect(1, s - 4 - legOff, 4, 4);
    fill(145, 115, 70, 100);
    rect(-5, s - 4 + legOff, 2, 1); rect(3, s - 4 - legOff, 2, 1);
    // Fur pants visible above
    fill(110, 85, 50);
    rect(-5, s - 7 + legOff, 4, 3); rect(1, s - 7 - legOff, 4, 3);
    fill(125, 95, 60, 80);
    rect(-4, s - 6 + legOff, 2, 1); rect(2, s - 6 - legOff, 2, 1);
  } else if (_fIsRoman && _fFac === 'egypt') {
    // Gold-trimmed sandals
    fill(200, 170, 40);
    rect(-5, s - 3 + legOff, 4, 3); rect(1, s - 3 - legOff, 4, 3);
    fill(180, 150, 35);
    rect(-5, s - 1 + legOff, 4, 1); rect(1, s - 1 - legOff, 4, 1);
    // White linen kilt peek
    fill(245, 240, 224);
    rect(-5, s - 6 + legOff, 4, 2); rect(1, s - 6 - legOff, 4, 2);
  } else if (_fIsRoman && _fFac === 'gaul') {
    // Leather boots + plaid trouser peek
    fill(90, 65, 35);
    rect(-5, s - 3 + legOff, 4, 3); rect(1, s - 3 - legOff, 4, 3);
    fill(75, 55, 28);
    rect(-5, s - 1 + legOff, 4, 1); rect(1, s - 1 - legOff, 4, 1);
    // Plaid trouser peeking above boot
    let gt = getFactionData().player.tunic;
    fill(gt[0] + 20, gt[1] + 20, gt[2] + 10);
    rect(-5, s - 6 + legOff, 4, 2); rect(1, s - 6 - legOff, 4, 2);
    fill(gt[0] - 10, gt[1] - 10, gt[2] - 5, 80);
    rect(-4, s - 6 + legOff, 1, 1); rect(2, s - 6 - legOff, 1, 1);
  } else if (_fIsRoman && _fFac === 'persia') {
    // Ornate pointed shoes
    fill(106, 42, 138);
    rect(-5, s - 3 + legOff, 4, 3); rect(1, s - 3 - legOff, 4, 3);
    fill(212, 160, 48);
    rect(-5, s - 3 + legOff, 1, 1); rect(4, s - 3 - legOff, 1, 1);
    fill(90, 35, 120);
    rect(-5, s - 1 + legOff, 4, 1); rect(1, s - 1 - legOff, 4, 1);
  } else {
    // Standard caligae (Roman military sandals) with straps
    fill(107, 66, 38);
    rect(-5, s - 3 + legOff, 4, 3); rect(1, s - 3 - legOff, 4, 3);
    fill(80, 50, 25);
    rect(-5, s - 1 + legOff, 4, 1); rect(1, s - 1 - legOff, 4, 1);
    fill(120, 78, 42, 140);
    rect(-4, s - 5 + legOff, 2, 1); rect(2, s - 5 - legOff, 2, 1);
    fill(170, 140, 58, 60);
    rect(-5, s - 6 + legOff, 4, 1); rect(1, s - 6 - legOff, 4, 1);
  }
}

function drawPlayerCape(fDir, moving, isRoman) {
  let windStr = moving ? 1.5 : 0.8;
  let capeWave1 = floor(sin(frameCount * 0.06) * 2 * windStr);
  let capeWave2 = floor(sin(frameCount * 0.09 + 1) * 1.5 * windStr);
  let capeLen = 17 + capeWave1 + (moving ? 3 : 0);
  let capeBlow = moving ? floor(sin(frameCount * 0.12) * 2) * -fDir : 0;

  if (isRoman) {
    let _fpc = getFactionData().player || {};
    let _cc = _fpc.cape || [196, 64, 50];
    let capeXL = -9 * fDir;
    let capeXR = 5 * fDir;
    // Left drape
    fill(_cc[0] - 86, _cc[1] - 29, _cc[2] - 22, 120);
    rect(capeXL + capeBlow, -4, 4 * fDir, capeLen + 1);
    fill(_cc[0], _cc[1], _cc[2], 210);
    rect(capeXL + capeBlow, -5, 4 * fDir, capeLen);
    fill(_cc[0] - 36, _cc[1] - 14, _cc[2] - 10, 140);
    rect(capeXL + capeBlow + fDir, -3, 1 * fDir, capeLen - 3);
    // Right drape
    fill(_cc[0] - 86, _cc[1] - 29, _cc[2] - 22, 120);
    rect(capeXR + capeBlow, -4, 4 * fDir, capeLen - 2);
    fill(_cc[0], _cc[1], _cc[2], 210);
    rect(capeXR + capeBlow, -5, 4 * fDir, capeLen - 3);
    // Wind ripple highlights
    fill(_cc[0] + 24, _cc[1] + 21, _cc[2] + 15, 60);
    rect(capeXL + capeBlow, -5 + floor(capeLen * 0.3), 3 * fDir, 2);
    rect(capeXR + capeBlow + capeWave2 * fDir * 0.3, -5 + floor(capeLen * 0.5), 2 * fDir, 2);
    // Clean hem
    fill(_cc[0] - 56, _cc[1] - 19, _cc[2] - 15, 80);
    rect(capeXL + capeBlow, -5 + capeLen - 1, 3 * fDir, 1);
    rect(capeXR + capeBlow, -5 + capeLen - 4, 3 * fDir, 1);
  } else {
    // Castaway green cape — left shoulder only, vine detail
    let capeX = -9 * fDir;
    // Cape shadow
    fill(40, 70, 30, 120);
    rect(capeX + capeBlow, -4, 4 * fDir, capeLen + 1);
    // Cape main — muted olive green
    fill(85, 120, 55, 210);
    rect(capeX + capeBlow, -5, 4 * fDir, capeLen);
    // Inner fold
    fill(60, 90, 40, 140);
    rect(capeX + capeBlow + fDir, -3, 1 * fDir, capeLen - 3);
    // Vine detail — twisting line down the cape
    fill(50, 100, 40, 100);
    rect(capeX + capeBlow + fDir * 2, -2, 1, 3);
    rect(capeX + capeBlow + fDir, 2, 1, 3);
    rect(capeX + capeBlow + fDir * 2, 6, 1, 3);
    // Vine leaf accents
    fill(90, 150, 50, 90);
    rect(capeX + capeBlow + fDir * 3, -1, 1, 1);
    rect(capeX + capeBlow, 4, 1, 1);
    rect(capeX + capeBlow + fDir * 3, 8, 1, 1);
    // Wind ripple
    fill(110, 150, 70, 60);
    rect(capeX + capeBlow, -5 + floor(capeLen * 0.3), 3 * fDir, 2);
    rect(capeX + capeBlow + capeWave2 * fDir * 0.3, -5 + floor(capeLen * 0.6), 2 * fDir, 2);
    // Torn/frayed hem
    fill(55, 80, 35, 100);
    rect(capeX + capeBlow, -5 + capeLen - 2, 1 * fDir, 2);
    rect(capeX + capeBlow + 2 * fDir, -5 + capeLen - 1, 1 * fDir, 2);
    rect(capeX + capeBlow + fDir, -5 + capeLen, 1 * fDir, 1);
  }
}

function drawPlayerBody(isRoman) {
  let breathe = sin(frameCount * 0.04) * 0.4;
  let chestW = 14 + floor(breathe);
  let _tc = TUNIC_COLORS[state.wardrobe ? state.wardrobe.tunicColor || 0 : 0].rgb;
  let _hasCostume = state.wardrobe && state.wardrobe.tunicColor > 0;

  if (isRoman) {
  let _fpl = getFactionData().player || {};
  let _ft = _fpl.tunic || [175, 58, 44];
  let _fs = _fpl.sash || [200, 170, 50];
  let _fh = _fpl.helm || [196, 162, 70];
  let _fac = state.faction || 'rome';

  // Tunic — faction color
  fill(_hasCostume ? _tc[0] : _ft[0], _hasCostume ? _tc[1] : _ft[1], _hasCostume ? _tc[2] : _ft[2]);
  rect(-floor(chestW / 2), -5, chestW, 18);
  // Tunica shadow fold
  fill(_hasCostume ? _tc[0] - 50 : _ft[0] - 53, _hasCostume ? _tc[1] - 18 : _ft[1] - 18, _hasCostume ? _tc[2] - 14 : _ft[2] - 14, 60);
  rect(-6, 4, 2, 8);
  rect(4, 5, 2, 7);
  fill(_hasCostume ? _tc[0] - 20 : _ft[0] - 20, _hasCostume ? _tc[1] - 8 : _ft[1] - 8, _hasCostume ? _tc[2] - 6 : _ft[2] - 6, 80);
  rect(-5, 12, 2, 1);
  rect(2, 13, 3, 1);

  // ─── Faction-specific armor/body detail ───
  if (_fac === 'rome') {
    // Segmented lorica armor — horizontal bands
    fill(_fh[0], _fh[1], _fh[2]);
    rect(-6, -5, 12, 3);
    fill(_fh[0] - 16, _fh[1] - 14, _fh[2] - 8);
    rect(-6, -2, 12, 3);
    fill(_fh[0], _fh[1], _fh[2]);
    rect(-6, 1, 12, 2);
    fill(_fh[0] + 24, _fh[1] + 33, _fh[2] + 30, 50);
    rect(-5, -5, 4, 1);
    // Pteruges
    fill(140, 100, 45);
    for (let i = -2; i <= 2; i++) rect(i * 3 - 1, 3, 2, 4);
  } else if (_fac === 'carthage') {
    // Bronze cuirass with purple sash drape
    fill(180, 160, 120);
    rect(-6, -5, 12, 6);
    fill(165, 145, 105);
    rect(-6, -3, 12, 1); rect(-6, -1, 12, 1);
    // Crescent emblem on chest
    fill(120, 50, 160);
    rect(-2, -4, 4, 3);
    fill(180, 160, 120);
    rect(-1, -4, 3, 2);
  } else if (_fac === 'egypt') {
    // Gold collar/broad collar necklace
    fill(200, 170, 40);
    rect(-7, -5, 14, 2);
    fill(64, 176, 160);
    rect(-6, -5, 3, 1); rect(3, -5, 3, 1);
    // Bare chest with gold waist sash
    fill(200, 170, 40);
    rect(-6, -3, 12, 1);
  } else if (_fac === 'greece') {
    // Bronze muscled cuirass — visible chest plate
    fill(200, 195, 185);
    rect(-6, -5, 12, 7);
    fill(190, 185, 175);
    rect(-4, -3, 8, 4);
    // Abs detail
    fill(210, 205, 195, 80);
    rect(-3, -2, 2, 1); rect(1, -2, 2, 1);
    rect(-3, 0, 2, 1); rect(1, 0, 2, 1);
  } else if (_fac === 'seapeople') {
    // Bare chest with tattoo dots
    fill(212, 165, 116);
    rect(-6, -5, 12, 7);
    // Tattoo marks — small dots
    fill(60, 90, 110, 140);
    rect(-4, -3, 1, 1); rect(-2, -4, 1, 1); rect(0, -3, 1, 1);
    rect(2, -4, 1, 1); rect(4, -2, 1, 1);
    rect(-3, -1, 1, 1); rect(1, 0, 1, 1); rect(3, -1, 1, 1);
    // Fur waistband
    fill(130, 100, 60);
    rect(-7, 1, 14, 3);
    fill(145, 115, 70, 100);
    rect(-6, 1, 2, 1); rect(-2, 2, 2, 1); rect(3, 1, 2, 1);
  } else if (_fac === 'persia') {
    // Ornate scale armor pattern — blue/gold
    fill(106, 42, 138);
    rect(-6, -5, 12, 7);
    // Scale pattern — alternating gold dots
    fill(212, 160, 48, 140);
    for (let sy = -4; sy <= 0; sy += 2)
      for (let sx = -5; sx <= 4; sx += 2) rect(sx, sy, 1, 1);
    // Gold trim lines
    fill(212, 160, 48);
    rect(-6, -5, 12, 1); rect(-6, 1, 12, 1);
  } else if (_fac === 'phoenicia') {
    // Merchant sash — diagonal purple
    fill(138, 16, 80, 180);
    rect(-6, -5, 6, 3); rect(-4, -3, 6, 3); rect(-2, -1, 6, 3);
    // Gold trim on tunic
    fill(212, 160, 48);
    rect(-7, -5, 14, 1);
  } else if (_fac === 'gaul') {
    // Plaid/checkered pattern — alternating colored rects
    let gBase = _ft;
    fill(gBase[0] + 30, gBase[1] + 30, gBase[2] + 15, 100);
    for (let gy = -4; gy <= 10; gy += 3)
      rect(-6, gy, 12, 1);
    for (let gx = -5; gx <= 4; gx += 3)
      rect(gx, -4, 1, 14);
    // Torque necklace — gold arc at neck
    fill(200, 160, 32);
    rect(-4, -5, 2, 1); rect(2, -5, 2, 1);
    fill(220, 180, 45);
    rect(-2, -6, 4, 1);
  } else {
    // Generic armor bands fallback
    fill(_fh[0], _fh[1], _fh[2]);
    rect(-6, -5, 12, 3);
    fill(_fh[0] - 16, _fh[1] - 14, _fh[2] - 8);
    rect(-6, -2, 12, 3);
  }

  // Belt/sash — faction sash color
  fill(_fs[0], _fs[1], _fs[2]);
  rect(-7, 2, 14, 2);
  fill(_fs[0] + 20, _fs[1] + 20, _fs[2] + 10);
  rect(-2, 1, 4, 3);

  // Pauldrons
  fill(_fh[0] - 26, _fh[1] - 22, _fh[2] - 10);
  rect(-9, -6, 4, 3);
  rect(5, -6, 4, 3);
  fill(_fh[0] + 4, _fh[1] + 13, _fh[2] + 10, 60);
  rect(-8, -6, 2, 1);
  rect(6, -6, 2, 1);
  } else {
  // Castaway tunic
  fill(_hasCostume ? _tc[0] : 196, _hasCostume ? _tc[1] : 101, _hasCostume ? _tc[2] : 74);
  rect(-floor(chestW / 2), -5, chestW, 18);
  fill(_hasCostume ? _tc[0] - 36 : 160, _hasCostume ? _tc[1] - 21 : 80, _hasCostume ? _tc[2] - 19 : 55, 60);
  rect(-6, 4, 2, 8);
  rect(4, 5, 2, 7);
  fill(_hasCostume ? _tc[0] - 26 : 170, _hasCostume ? _tc[1] - 13 : 88, _hasCostume ? _tc[2] - 14 : 60, 80);
  rect(-5, 12, 2, 1);
  rect(2, 13, 3, 1);
  rect(-2, 13, 1, 1);
  fill(140, 120, 80);
  rect(-7, 2, 14, 2);
  fill(120, 100, 65);
  rect(-1, 2, 2, 2);
  fill(130, 95, 50);
  rect(-9, -6, 4, 3);
  fill(150, 115, 65, 60);
  rect(-8, -6, 2, 1);
  fill(212, 165, 116);
  rect(5, -6, 4, 2);
  }
}

function drawPlayerArms(armSwing) {
  // Skin tone — warm Mediterranean, muscular
  fill(212, 165, 116);
  rect(-9, -2 + armSwing, 3, 6);
  rect(7, -2 - armSwing, 3, 6);
  // Bicep highlight (muscle definition)
  fill(225, 180, 130, 80);
  rect(-8, -1 + armSwing, 1, 2);
  rect(8, -1 - armSwing, 1, 2);
  // Arm shadow — underside
  fill(166, 123, 91, 60);
  rect(-9, 2 + armSwing, 3, 2);
  rect(7, 2 - armSwing, 3, 2);
  // Wrist wrap / leather bracer
  fill(130, 90, 45, 100);
  rect(-9, 3 + armSwing, 3, 1);
  rect(7, 3 - armSwing, 3, 1);
}

function drawPlayerTool(fDir, hs, toolSwingTimer) {
  let swingOff = 0;
  if (toolSwingTimer > 0) {
    let swingProg = toolSwingTimer / 12;
    swingOff = floor(sin(swingProg * PI) * -8);
  }
  let toolX = 9 * fDir;
  let tw = fDir > 0 ? 1 : -1;
  if (hs === 0) {
    // Sickle — curved blade + wood handle
    fill(180, 180, 190);
    rect(toolX, -4 + swingOff, 2 * tw, 4);
    rect(toolX + tw, -5 + swingOff, 2 * tw, 2);
    fill(120, 90, 50);
    rect(toolX, 0 + swingOff, 2 * tw, 3);
  } else if (hs === 1) {
    // Axe
    fill(120, 90, 50);
    rect(toolX, -6 + swingOff, 2 * tw, 8);
    fill(160, 160, 170);
    rect(toolX - tw, -7 + swingOff, 4 * tw, 3);
  } else if (hs === 2) {
    // Pickaxe
    fill(120, 90, 50);
    rect(toolX, -4 + swingOff, 2 * tw, 6);
    fill(160, 160, 170);
    rect(toolX - 2 * tw, -6 + swingOff, 6 * tw, 2);
  } else if (hs === 3) {
    // Fishing rod
    fill(120, 90, 50);
    rect(toolX, -8 + swingOff, 2 * tw, 10);
    fill(100, 160, 200);
    rect(toolX + 2 * tw, -8 + swingOff, 1 * tw, 3);
  } else {
    // Faction weapon — based on getFactionMilitary().weapon
    let _wFac = state.faction || 'rome';
    let _wMil = (typeof getFactionMilitary === 'function') ? getFactionMilitary() : {};
    let _wType = _wMil.weapon || 'gladius';
    if (_wType === 'curved_sword' || _wType === 'scimitar') {
      // Curved sword (falcata/scimitar) — curved blade
      fill(152, 152, 160);
      rect(toolX, -7 + swingOff, 2 * tw, 5);
      rect(toolX + tw, -8 + swingOff, 2 * tw, 3); // curved tip
      fill(180, 180, 190);
      rect(toolX + tw, -8 + swingOff, 1 * tw, 2);
      fill(200, 170, 60);
      rect(toolX - tw, -1 + swingOff, 4 * tw, 2);
      fill(100, 70, 35);
      rect(toolX, 1 + swingOff, 2 * tw, 2);
    } else if (_wType === 'khopesh') {
      // Khopesh — hooked Egyptian sword
      fill(152, 152, 160);
      rect(toolX, -6 + swingOff, 2 * tw, 5);
      rect(toolX + tw, -8 + swingOff, 2 * tw, 3);
      rect(toolX + 2 * tw, -7 + swingOff, 1 * tw, 2); // hook
      fill(200, 170, 40);
      rect(toolX - tw, 0 + swingOff, 4 * tw, 2);
      fill(100, 70, 35);
      rect(toolX, 2 + swingOff, 2 * tw, 2);
    } else if (_wType === 'spear') {
      // Spear — long shaft + small tip
      fill(100, 75, 35);
      rect(toolX, -12 + swingOff, 2 * tw, 14);
      fill(180, 180, 190);
      rect(toolX, -14 + swingOff, 2 * tw, 3);
      fill(195, 195, 205);
      rect(toolX, -14 + swingOff, 1 * tw, 2);
    } else if (_wType === 'axe') {
      // Battle axe
      fill(100, 75, 35);
      rect(toolX, -6 + swingOff, 2 * tw, 10);
      fill(160, 160, 170);
      rect(toolX - tw, -8 + swingOff, 4 * tw, 4);
      fill(180, 180, 190);
      rect(toolX - tw, -8 + swingOff, 2 * tw, 2);
    } else if (_wType === 'longsword') {
      // Longsword — longer blade
      fill(152, 152, 160);
      rect(toolX, -10 + swingOff, 2 * tw, 9);
      fill(180, 180, 190);
      rect(toolX, -10 + swingOff, 2 * tw, 2);
      fill(200, 170, 60);
      rect(toolX - tw, 0 + swingOff, 4 * tw, 2);
      fill(100, 70, 35);
      rect(toolX, 2 + swingOff, 2 * tw, 3);
    } else {
      // Gladius (Rome default) — steel blade + gold guard + leather grip
      fill(152, 152, 160);
      rect(toolX, -8 + swingOff, 2 * tw, 7);
      fill(180, 180, 190);
      rect(toolX, -8 + swingOff, 2 * tw, 2);
      fill(200, 170, 60);
      rect(toolX - tw, 0 + swingOff, 4 * tw, 2);
      fill(100, 70, 35);
      rect(toolX, 2 + swingOff, 2 * tw, 2);
    }
  }
  // Tool swing arc trail (semicircle) — visible on tool slots 0-2
  if (toolSwingTimer > 0 && hs <= 2) {
    let arcProg = toolSwingTimer / 12;
    let arcAlpha = floor(arcProg * 120);
    stroke(255, 240, 200, arcAlpha);
    strokeWeight(1);
    noFill();
    let arcR = 14;
    let startA = fDir > 0 ? -PI * 0.7 : -PI * 0.3;
    let endA = startA + PI * arcProg;
    arc(toolX, -2 + swingOff, arcR * 2, arcR * 2, startA, endA);
    noStroke();
  }
}

function drawPlayerHead(fDir, facingUp, anim, isRoman) {
  // Head — warm Mediterranean skin
  fill(212, 165, 116);
  rect(-5, -14, 10, 8);
  // Chin shadow
  fill(166, 123, 91, 50);
  rect(-4, -7, 8, 1);
  // Short cropped dark hair (visible above helmet or when helmet off)
  fill(61, 43, 31);
  rect(-5, -14, 10, 2);
  // Sideburns
  rect(-5, -12, 1, 2);
  rect(4, -12, 1, 2);

  if (anim.helmetOff) {
    // Messy castaway hair — dark brown, wind-tousled
    fill(61, 43, 31);
    rect(-5, -16, 10, 3);  // hair base
    rect(-4, -17, 8, 1);   // hair crown
    // Messy tufts sticking out
    fill(55, 38, 26);
    rect(-6, -15, 2, 2);   // left tuft
    rect(4, -16, 2, 2);    // right tuft
    rect(-3, -18, 3, 1);   // top tuft
    rect(1, -18, 2, 1);    // another top tuft
    // Windblown strands
    let hairWind = floor(sin(frameCount * 0.04) * 1);
    fill(50, 35, 22);
    rect(4 + hairWind, -17, 2, 1);
    rect(-5 - hairWind, -16, 1, 2);
    // Highlight strands (sun-bleached tips)
    fill(85, 62, 42, 100);
    rect(-2, -18, 1, 1);
    rect(3, -17, 1, 1);
    if (isRoman) {
    // Crown — faction-tinted
    let _crownC = (typeof getFactionData === 'function' ? getFactionData().player : null) || {};
    let _crSash = _crownC.sash || [200, 170, 50];
    fill(_crSash[0], _crSash[1], _crSash[2]);
    rect(-5, -15, 2, 1);
    rect(3, -15, 2, 1);
    fill(_crSash[0] + 20, _crSash[1] + 20, _crSash[2] + 10);
    rect(-4, -16, 2, 1);
    rect(2, -16, 2, 1);
    fill(_crSash[0], _crSash[1], _crSash[2]);
    rect(-1, -17, 2, 1);
    fill(_crSash[0] + 40, _crSash[1] + 40, _crSash[2] + 30, 80);
    rect(-4, -15, 1, 1);
    rect(3, -16, 1, 1);
    } else {
    // Living vine crown with flower pixels
    fill(70, 120, 45);
    rect(-5, -15, 2, 1);
    rect(3, -15, 2, 1);
    fill(90, 140, 55);
    rect(-4, -16, 2, 1);
    rect(2, -16, 2, 1);
    rect(-1, -17, 2, 1);
    // Tiny flower pixels
    fill(220, 100, 120);
    rect(-3, -16, 1, 1);
    fill(240, 200, 80);
    rect(1, -17, 1, 1);
    // Vine tendrils
    fill(60, 110, 40, 120);
    rect(-6, -14, 1, 2);
    rect(5, -14, 1, 2);
    }
  } else {
    // Helmet — faction-specific style
    let _fhc = (typeof getFactionData === 'function' ? getFactionData().player : null) || {};
    let _helmC = _fhc.helm || [196, 162, 70];
    let _capeC = _fhc.cape || [180, 30, 20];
    let _hFac = state.faction || 'rome';
    let cf = floor(sin(frameCount * 0.08) * 1);

    if (_hFac === 'rome') {
      // Galea — with red plume
      fill(_helmC[0], _helmC[1], _helmC[2]);
      rect(-6, -16, 12, 5);
      fill(_helmC[0] - 26, _helmC[1] - 22, _helmC[2] - 10);
      rect(-6, -13, 2, 3); rect(4, -13, 2, 3);
      // Red plume
      fill(200, 35, 25);
      rect(-4, -20, 8, 4); rect(-2, -22, 4, 2);
      rect(-3, -21 + cf, 2, 3); rect(2, -21 - cf, 2, 3);
    } else if (_hFac === 'carthage') {
      // Bronze helm with nose guard
      fill(_helmC[0], _helmC[1], _helmC[2]);
      rect(-6, -16, 12, 5);
      fill(_helmC[0] - 20, _helmC[1] - 20, _helmC[2] - 15);
      rect(-6, -13, 2, 3); rect(4, -13, 2, 3);
      // Nose guard
      fill(_helmC[0] - 10, _helmC[1] - 10, _helmC[2] - 10);
      rect(-1, -13, 2, 4);
      // Purple plume — smaller
      fill(120, 50, 160);
      rect(-3, -19, 6, 3); rect(-2, -20, 4, 1);
      rect(-2, -19 + cf, 2, 2);
    } else if (_hFac === 'egypt') {
      // Nemes headdress — striped gold/blue
      fill(200, 170, 40);
      rect(-6, -16, 12, 5);
      // Blue stripes
      fill(58, 58, 74);
      rect(-5, -15, 2, 3); rect(-1, -15, 2, 3); rect(3, -15, 2, 3);
      // Lappets hanging down sides
      fill(200, 170, 40);
      rect(-7, -12, 2, 5); rect(5, -12, 2, 5);
      // Gold cobra uraeus
      fill(200, 170, 40);
      rect(-1, -18, 2, 2);
      fill(64, 176, 160);
      rect(0, -18, 1, 1);
    } else if (_hFac === 'greece') {
      // Corinthian helm with blue crest
      fill(_helmC[0], _helmC[1], _helmC[2]);
      rect(-6, -16, 12, 5);
      // Cheek guards
      fill(_helmC[0] - 15, _helmC[1] - 15, _helmC[2] - 10);
      rect(-6, -12, 2, 4); rect(4, -12, 2, 4);
      // Nasal guard
      fill(_helmC[0], _helmC[1], _helmC[2]);
      rect(-1, -12, 2, 3);
      // Blue horsehair crest
      fill(80, 144, 192);
      rect(-3, -19, 6, 3); rect(-2 + cf, -21, 4, 2);
      fill(65, 125, 175);
      rect(-2 + cf, -19, 2, 1);
    } else if (_hFac === 'seapeople') {
      // Horned helm
      fill(_helmC[0], _helmC[1], _helmC[2]);
      rect(-6, -16, 12, 5);
      fill(_helmC[0] - 20, _helmC[1] - 15, _helmC[2] - 10);
      rect(-6, -13, 2, 3); rect(4, -13, 2, 3);
      // Horns — curving outward
      fill(_helmC[0] + 10, _helmC[1] + 10, _helmC[2] + 5);
      rect(-7, -19, 2, 4); rect(5, -19, 2, 4);
      rect(-8, -21, 2, 3); rect(6, -21, 2, 3);
      rect(-8, -22, 1, 1); rect(7, -22, 1, 1);
    } else if (_hFac === 'persia') {
      // Tall hat (tiara/kulah)
      fill(_helmC[0], _helmC[1], _helmC[2]);
      rect(-5, -16, 10, 5);
      // Tall crown
      fill(_helmC[0], _helmC[1], _helmC[2]);
      rect(-4, -22, 8, 6);
      fill(_helmC[0] + 15, _helmC[1] + 10, _helmC[2] + 5, 80);
      rect(-3, -21, 2, 4);
      // Purple band
      fill(106, 42, 138);
      rect(-5, -16, 10, 1);
    } else if (_hFac === 'phoenicia') {
      // Naval cap — rounded
      fill(_helmC[0], _helmC[1], _helmC[2]);
      rect(-5, -16, 10, 4);
      rect(-4, -18, 8, 2);
      fill(_helmC[0] - 15, _helmC[1] - 10, _helmC[2] - 8);
      rect(-5, -13, 10, 1);
      // Tyrian purple band
      fill(138, 16, 80);
      rect(-5, -14, 10, 1);
    } else if (_hFac === 'gaul') {
      // Iron helm with wild hair poking out
      fill(_helmC[0], _helmC[1], _helmC[2]);
      rect(-6, -16, 12, 5);
      fill(_helmC[0] - 15, _helmC[1] - 12, _helmC[2] - 8);
      rect(-6, -13, 2, 3); rect(4, -13, 2, 3);
      // Wild hair poking from under helm
      fill(80, 55, 30);
      rect(-7, -14, 2, 3); rect(5, -14, 2, 3);
      rect(-6, -12, 1, 3); rect(5, -12, 1, 3);
      // Yellow crest
      fill(200, 160, 32);
      rect(-3, -18, 6, 2); rect(-2, -19 + cf, 4, 1);
    } else {
      // Generic fallback
      fill(_helmC[0], _helmC[1], _helmC[2]);
      rect(-6, -16, 12, 5);
      fill(_capeC[0], _capeC[1], _capeC[2]);
      rect(-4, -20, 8, 4); rect(-2, -22, 4, 2);
    }
  }

  // Wardrobe headwear override
  let _wHw = state.wardrobe ? state.wardrobe.headwear || 0 : 0;
  if (_wHw === 1 && HEADWEAR[1].unlocked()) {
    fill(80, 160, 60);
    rect(-5, -15, 2, 1); rect(3, -15, 2, 1);
    fill(90, 170, 65);
    rect(-4, -16, 2, 1); rect(2, -16, 2, 1);
    rect(-1, -17, 2, 1);
    fill(60, 140, 40, 120);
    rect(-6, -14, 1, 2); rect(5, -14, 1, 2);
  } else if (_wHw === 2 && HEADWEAR[2].unlocked()) {
    fill(196, 162, 70);
    rect(-6, -16, 12, 5);
    fill(170, 140, 60);
    rect(-6, -13, 2, 3); rect(4, -13, 2, 3);
    fill(180, 30, 20);
    rect(-4, -20, 8, 4); rect(-2, -22, 4, 2);
    let _cf = floor(sin(frameCount * 0.08) * 1);
    rect(-3, -21 + _cf, 2, 3); rect(2, -21 - _cf, 2, 3);
  }

  if (facingUp) {
    // Back of head
    fill(61, 43, 31); // hair back
    rect(-4, -13, 8, 4);
    if (!anim.helmetOff) {
      fill(170, 140, 60); // helmet back plate
      rect(-4, -13, 8, 3);
    }
  } else {
    // ─── EXPRESSIVE FACE ───
    let blinking = (anim.blinkFrame >= 1 && anim.blinkFrame <= 2);

    if (blinking) {
      // Blink — eyes become thin line
      fill(166, 123, 91);
      rect(-4, -12, 3, 1);
      rect(1, -12, 3, 1);
    } else if (anim.emotion === 'happy') {
      // Happy — crescent eyes (bottom half filled with skin)
      fill(255);
      rect(-4, -12, 3, 2);
      rect(1, -12, 3, 2);
      fill(40, 30, 20);
      let eyeOff = fDir > 0 ? 1 : 0;
      rect(-4 + eyeOff, -12, 1, 1);
      rect(1 + eyeOff, -12, 1, 1);
      // Happy squint — skin covers bottom of eye
      fill(212, 165, 116);
      rect(-4, -11, 3, 1);
      rect(1, -11, 3, 1);
      // Smile
      fill(170, 110, 90);
      rect(-2, -9, 4, 1);
      fill(212, 165, 116);
      rect(-2, -9, 1, 1); // smile curve ends
      rect(1, -9, 1, 1);
    } else if (anim.emotion === 'weary') {
      // Weary — half-lidded eyes, slight frown
      fill(255);
      rect(-4, -11, 3, 1); // lower eye position, squinted
      rect(1, -11, 3, 1);
      fill(40, 30, 20);
      let eyeOff = fDir > 0 ? 1 : 0;
      rect(-4 + eyeOff, -11, 1, 1);
      rect(1 + eyeOff, -11, 1, 1);
      // Heavy lids
      fill(212, 165, 116);
      rect(-4, -12, 3, 1);
      rect(1, -12, 3, 1);
      // Slight frown
      fill(150, 115, 90);
      rect(-1, -9, 2, 1);
    } else if (anim.emotion === 'alert') {
      // Alert — wide eyes, tense mouth
      fill(255);
      rect(-4, -13, 3, 3); // taller eye whites
      rect(1, -13, 3, 3);
      fill(40, 30, 20);
      let eyeOff = fDir > 0 ? 1 : 0;
      rect(-4 + eyeOff, -12, 2, 2); // larger pupils
      rect(1 + eyeOff, -12, 2, 2);
      fill(255, 255, 255, 200);
      rect(-3, -13, 1, 1);
      rect(2, -13, 1, 1);
      // Tense line mouth
      fill(140, 100, 80);
      rect(-2, -9, 4, 1);
    } else {
      // Determined (default) — focused, steady eyes
      fill(255);
      rect(-4, -12, 3, 2);
      rect(1, -12, 3, 2);
      fill(40, 30, 20);
      let eyeOff = fDir > 0 ? 1 : 0;
      rect(-4 + eyeOff, -12, 1, 1);
      rect(1 + eyeOff, -12, 1, 1);
      // Eye highlight
      fill(255, 255, 255, 180);
      rect(-3, -12, 1, 1);
      rect(2, -12, 1, 1);
      // Determined set mouth
      fill(170, 130, 100);
      rect(-1, -9, 2, 1);
    }

    // Scar detail — small diagonal mark on right cheek (backstory: shipwreck)
    fill(190, 145, 105, 80);
    rect(2, -10, 1, 1);
    rect(3, -9, 1, 1);
    // Gaul: long mustache (two small lines drooping from nose)
    if ((state.faction || 'rome') === 'gaul' && state.progression && state.progression.homeIslandReached) {
      fill(80, 55, 30);
      rect(-3, -9, 2, 1); rect(1, -9, 2, 1);
      rect(-4, -8, 1, 1); rect(3, -8, 1, 1);
    }
  }
}

function updatePlayerCombat(dt) {
  let p = state.player;
  let spd = p.speed;
  if (p.dashTimer > 0) { spd *= 3.5; p.dashTimer -= dt; }
  if (p.dashCooldown > 0) p.dashCooldown -= dt;

  let dx = 0, dy = 0;
  if (keyIsDown(65) || keyIsDown(LEFT_ARROW))  dx -= 1;
  if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) dx += 1;
  if (keyIsDown(87) || keyIsDown(UP_ARROW))    dy -= 1;
  if (keyIsDown(83) || keyIsDown(DOWN_ARROW))  dy += 1;
  if (dx === 0 && dy === 0 && typeof _touchJoystick !== 'undefined' && _touchJoystick.active) {
    dx = _touchJoystick.dx; dy = _touchJoystick.dy;
  }

  if (dx !== 0 || dy !== 0) {
    let len = sqrt(dx * dx + dy * dy);
    p.vx = (dx / len) * spd;
    p.vy = (dy / len) * spd;
    p.moving = true;
    if (dx > 0) p.facing = 'right';
    else if (dx < 0) p.facing = 'left';
    else if (dy < 0) p.facing = 'up';
    else p.facing = 'down';
  } else {
    p.vx *= 0.7; p.vy *= 0.7;
    p.moving = false;
  }

  let newX = p.x + p.vx * dt;
  let newY = p.y + p.vy * dt;

  // Island boundary (ellipse) — use conquest or arena depending on mode
  let isle = state.conquest.active ? state.conquest : state.adventure;
  let ex = (newX - isle.isleX) / (isle.isleRX - 20);
  let ey = (newY - isle.isleY) / (isle.isleRY - 20);
  if (ex * ex + ey * ey < 1) {
    p.x = newX; p.y = newY;
  } else {
    let ang = atan2(newY - isle.isleY, newX - isle.isleX);
    p.x = isle.isleX + cos(ang) * (isle.isleRX - 22);
    p.y = isle.isleY + sin(ang) * (isle.isleRY - 22);
    p.vx = 0; p.vy = 0;
  }

  // Footstep dust in arena
  if (p.moving && frameCount % 8 === 0) {
    particles.push({
      x: p.x + random(-4, 4), y: p.y + 8,
      vx: random(-0.3, 0.3), vy: random(-0.5, 0),
      life: 15, maxLife: 15, type: 'burst',
      r: 180, g: 160, b: 120, size: random(2, 4), world: true,
    });
  }
}

function getFacingAngle() {
  let f = state.player.facing;
  if (f === 'right') return 0;
  if (f === 'down') return HALF_PI;
  if (f === 'left') return PI;
  return -HALF_PI;
}

function playerAttack() {
  // Route through faction combat system if available
  if (typeof factionPlayerAttack === 'function') {
    factionPlayerAttack();
    return;
  }
  // Fallback: original attack (should not reach here with faction system loaded)
  let p = state.player;
  let a = state.adventure;
  if (p.attackTimer > 0) return;
  if (p.hotbarSlot !== 4) { p.hotbarSlot = 4; addFloatingText(width / 2, height - 110, 'Switched to Weapon', '#aaddaa'); }
  p.attackTimer = p.attackCooldown;
  p.slashPhase = 10;
  triggerPlayerAlert();
  let fAngle = getFacingAngle();
  let arcHalf = PI * 0.3;
  let range = p.attackRange + (p.weapon === 1 ? 12 : 0);
  for (let e of a.enemies) {
    if (e.state === 'dying' || e.state === 'dead') continue;
    let d = dist(p.x, p.y, e.x, e.y);
    if (d > range + e.size) continue;
    let angle = atan2(e.y - p.y, e.x - p.x);
    let diff = angle - fAngle;
    while (diff > PI) diff -= TWO_PI;
    while (diff < -PI) diff += TWO_PI;
    if (abs(diff) > arcHalf) continue;
    let dmg = floor(([15, 20, 25][p.weapon] || 15) * (typeof getNatBestiaryBonus === 'function' ? getNatBestiaryBonus() : 1));
    if (e.type === 'secutor' && random() < 0.5) { addFloatingText(w2sX(e.x), w2sY(e.y) - 20, 'BLOCKED', '#aaaaaa'); e.flashTimer = 4; if (snd) snd.playSFX('shield_bash'); continue; }
    if (e.type === 'shield_bearer' && random() < (e.blockChance || 0.5)) { addFloatingText(w2sX(e.x), w2sY(e.y) - 20, 'BLOCKED', '#ccbb88'); e.flashTimer = 4; if (snd) snd.playSFX('shield_bash'); continue; }
    e.hp -= dmg; e.flashTimer = 6; e.state = 'stagger'; e.stateTimer = 8;
    if (e.hp <= 0) { _juiceFreezeFrames = 2; _juiceCombatVignette = min(1, _juiceCombatVignette + 0.3); }
    let kbAngle = atan2(e.y - p.y, e.x - p.x);
    e.x += cos(kbAngle) * 5; e.y += sin(kbAngle) * 5;
    addFloatingText(w2sX(e.x), w2sY(e.y) - 20, '-' + dmg, '#ff4444');
    spawnParticles(e.x, e.y, 'combat', 4);
    triggerScreenShake(2, 4, cos(kbAngle), sin(kbAngle), 'directional');
    if (snd) snd.playSFX('hit');
  }
}

function drawSlashArc() {
  let p = state.player;
  if (p.slashPhase <= 0) return;
  let sx = floor(w2sX(p.x));
  let sy = floor(w2sY(p.y));
  let fAngle = getFacingAngle();
  let alpha = map(p.slashPhase, 0, 10, 0, 200);
  let r = p.attackRange + 5;
  let f = state.faction || 'rome';

  // Faction-specific slash colors
  let trailR = 255, trailG = 240, trailB = 180; // default gold
  let slashR = 255, slashG = 230, slashB = 140;
  let innerR = 255, innerG = 255, innerB = 200;
  if (f === 'rome') { trailR = 255; trailG = 100; trailB = 80; slashR = 255; slashG = 80; slashB = 60; }
  else if (f === 'carthage') { trailR = 160; trailG = 80; trailB = 200; slashR = 180; slashG = 100; slashB = 220; }
  else if (f === 'egypt') { trailR = 221; trailG = 170; trailB = 34; slashR = 255; slashG = 220; slashB = 80; }
  else if (f === 'greece') { trailR = 200; trailG = 220; trailB = 255; slashR = 230; slashG = 240; slashB = 255; innerR = 255; innerG = 255; innerB = 255; }

  // Greece: longer range visual
  if (f === 'greece') r = p.attackRange + 28 + 5;

  push();
  translate(sx, sy);

  // Sword tip trailing arc
  let sweepProgress = map(p.slashPhase, 10, 0, -0.3, 0.3);
  let tipX = cos(fAngle + sweepProgress * PI) * r;
  let tipY = sin(fAngle + sweepProgress * PI) * r;
  for (let i = 1; i <= 4; i++) {
    let trailOffset = sweepProgress - i * 0.12;
    let trailAlpha = map(i, 1, 4, 150, 0);
    let tx = cos(fAngle + trailOffset * PI) * (r - i * 2);
    let ty = sin(fAngle + trailOffset * PI) * (r - i * 2);
    stroke(trailR, trailG, trailB, trailAlpha);
    strokeWeight(1.5);
    line(tipX, tipY, tx, ty);
    tipX = tx;
    tipY = ty;
  }

  noStroke();
  fill(slashR, slashG, slashB, alpha);
  for (let a = -0.3; a <= 0.3; a += 0.08) {
    let ax = floor(cos(fAngle + a * PI) * r);
    let ay = floor(sin(fAngle + a * PI) * r);
    rect(ax, ay, 3, 3);
  }
  fill(innerR, innerG, innerB, alpha * 0.7);
  for (let a = -0.25; a <= 0.25; a += 0.1) {
    let ax = floor(cos(fAngle + a * PI) * r * 0.8);
    let ay = floor(sin(fAngle + a * PI) * r * 0.8);
    rect(ax, ay, 2, 2);
  }
  pop();
}

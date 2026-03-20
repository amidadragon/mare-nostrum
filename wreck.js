// ═══════════════════════════════════════════════════════════════════════════
// WRECK BEACH SYSTEM — Shipwreck Starting Area
// Extracted from sketch.js — uses globals: state, WRECK, WRECK_DEPTH_*,
// cam, w2sX, w2sY, particles, C, snd, addFloatingText, showTutorialHint,
// unlockJournal, startSailingCutscene, exitDive, getSkyBrightness, etc.
// ═══════════════════════════════════════════════════════════════════════════

// Check if world point is on wreck beach (wider, natural shape)
function isOnWreck(wx, wy) {
  let dx = (wx - WRECK.cx) / (WRECK.rx * 0.9);
  let dy = (wy - WRECK.cy) / (WRECK.ry * 0.55);
  return (dx * dx + dy * dy) <= 1.0;
}

// Returns 0=beach 1=ankle 2=waist 3=swimming 4=deep/dive
function getWreckDepth(wx, wy) {
  let ex = (wx - WRECK.cx) / WRECK.rx;
  let ey = (wy - WRECK.cy) / (WRECK.ry * 0.55);
  let d  = sqrt(ex * ex + ey * ey);
  if (d < WRECK_DEPTH_THRESHOLDS[0]) return 0;
  if (d < WRECK_DEPTH_THRESHOLDS[1]) return 1;
  if (d < WRECK_DEPTH_THRESHOLDS[2]) return 2;
  if (d < WRECK_DEPTH_THRESHOLDS[3]) return 3;
  return 4;
}

function updateWreckBeach(dt) {
  let p = state.player;

  // ── Depth calculation ────────────────────────────────────────────────────
  let prevDepth = state.diving.depth || 0;
  let curDepth  = getWreckDepth(p.x, p.y);
  state.diving.depth = curDepth;

  // Speed multiplier by depth zone
  let speedMul = WRECK_DEPTH_SPEEDS[curDepth] * 0.8; // 0.8 = wreck "injured" penalty

  // ── Movement input ────────────────────────────────────────────────────────
  let mx = 0, my = 0;
  if (keyIsDown(65) || keyIsDown(LEFT_ARROW))  mx -= 1;
  if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) mx += 1;
  if (keyIsDown(87) || keyIsDown(UP_ARROW))    my -= 1;
  if (keyIsDown(83) || keyIsDown(DOWN_ARROW))  my += 1;
  if (mx !== 0 || my !== 0) {
    let len = sqrt(mx * mx + my * my);
    mx /= len; my /= len;
    p.vx = mx * p.speed * speedMul;
    p.vy = my * p.speed * speedMul;
    p.moving = true;
    if (abs(mx) > abs(my)) p.facing = mx > 0 ? 'right' : 'left';
    else p.facing = my > 0 ? 'down' : 'up';
  } else {
    // Decelerate — faster drag in water
    let drag = curDepth >= 3 ? 0.8 : 0.7;
    p.vx *= drag; p.vy *= drag;
    if (abs(p.vx) < 0.1 && abs(p.vy) < 0.1) { p.vx = 0; p.vy = 0; p.moving = false; }
  }
  p.x += p.vx * dt; p.y += p.vy * dt;

  // ── Ocean current boundary (no teleport, no hard wall) ───────────────────
  // Explorable area: 2.5x island radius in each direction
  let boundRX = WRECK.rx * 2.5;
  let boundRY = WRECK.ry * 1.8 * 2.5 / 2.2; // proportional
  let bex = (p.x - WRECK.cx) / boundRX;
  let bey = (p.y - WRECK.cy) / boundRY;
  let bDist = bex * bex + bey * bey;
  if (bDist > 1.0) {
    // Graceful current pushback — scales with overshoot, never teleports
    let ang = atan2(p.y - WRECK.cy, p.x - WRECK.cx);
    let over = bDist - 1.0;
    let pushStr = over * 3.5 + 0.8; // stronger the further out
    p.vx -= cos(ang) * pushStr * dt;
    p.vy -= sin(ang) * pushStr * dt;
    // Message hint — only once per crossing
    if (over > 0.02 && frameCount % 90 === 0) {
      addFloatingText(w2sX(p.x), w2sY(p.y) - 20, 'The current is too strong...', '#88bbcc');
    }
  }

  // ── Splash particles on zone transitions ─────────────────────────────────
  if (curDepth !== prevDepth) {
    let sx = w2sX(p.x), sy = w2sY(p.y);
    // Entering water from beach
    if (prevDepth === 0 && curDepth === 1) {
      spawnWreckSplash(p.x, p.y, 4, 5);
    } else if (prevDepth <= 1 && curDepth === 2) {
      spawnWreckSplash(p.x, p.y, 8, 9);
    } else if (prevDepth <= 2 && curDepth === 3) {
      spawnWreckSplash(p.x, p.y, 12, 13);
    } else if (prevDepth <= 3 && curDepth === 4) {
      spawnWreckSplash(p.x, p.y, 18, 16);
    }
    // Surfacing — big exit splash
    if (prevDepth === 4 && curDepth <= 3) {
      spawnWreckSplash(p.x, p.y, 14, 14);
    }
    // Auto-exit dive if waded back to shallows
    if (state.diving.active && curDepth < 4) {
      if (typeof exitDive === 'function') exitDive();
    }
  }

  // ── Ankle-deep walking splashes ───────────────────────────────────────────
  if (curDepth === 1 && p.moving && frameCount % 18 === 0) {
    spawnWreckSplash(p.x, p.y, 3, 4);
  }
  if (curDepth === 2 && p.moving && frameCount % 12 === 0) {
    spawnWreckSplash(p.x, p.y, 5, 6);
  }

  // ── Update crabs + ambient + cat ─────────────────────────────────────────
  updateWreckCrabs(dt);
  updateWreckAmbient(dt);
  updateWreckCat(dt);

  // ── Tutorial hints ────────────────────────────────────────────────────────
  if (state.progression.tutorialsSeen && !state.progression.tutorialsSeen.gather && state.wreck.scavNodes.some(n => !n.collected)) {
    let nearest = getNearestScavNode();
    if (nearest && dist(p.x, p.y, nearest.x, nearest.y) < 50) {
      showTutorialHint('Press E to gather', nearest.x, nearest.y - 20);
    }
  }

  // ── Raft hints ────────────────────────────────────────────────────────────
  let raftX = WRECK.cx, raftY = WRECK.cy + 35;
  if (state.wreck.raftBuilt) {
    if (dist(p.x, p.y, raftX, raftY) < 55) {
      showTutorialHint('Press E to launch the raft!', raftX, raftY - 25);
    }
  } else if (dist(p.x, p.y, raftX, raftY) < 55 && (state.wood > 0 || state.seeds > 0)) {
    showTutorialHint('Press E to add materials to raft', raftX, raftY - 25);
  }
}

function spawnWreckSplash(wx, wy, count, speed) {
  for (let i = 0; i < count; i++) {
    let ang = random(TWO_PI);
    let spd = random(0.3, 1) * speed * 0.25;
    particles.push({
      x: wx + random(-4, 4), y: wy + random(-2, 2),
      vx: cos(ang) * spd, vy: sin(ang) * spd * 0.5 - random(0.5, 1.5),
      life: 20 + random(20), maxLife: 40,
      type: 'splash_drop',
      r: 180, g: 225, b: 255,
      size: random(1.5, 3.5),
      world: true,
    });
  }
  // Ring flash
  particles.push({
    x: wx, y: wy,
    vx: 0, vy: 0,
    life: 10, maxLife: 10,
    type: 'splash_ring',
    r: 200, g: 240, b: 255,
    size: speed * 2.5,
    world: true,
  });
}

function getNearestScavNode() {
  let p = state.player;
  let best = null, bestD = Infinity;
  for (let n of state.wreck.scavNodes) {
    if (n.collected) continue;
    let d = dist(p.x, p.y, n.x, n.y);
    if (d < bestD) { bestD = d; best = n; }
  }
  return bestD < 40 ? best : null;
}

function collectScavNode(node) {
  node.collected = true;
  if (snd) snd.playSFX('scavenge');
  let t = node.type;
  let label = '';
  if (t === 'stick' || t === 'plank') { state.wood += (t === 'plank' ? 2 : 1); label = '+' + (t === 'plank' ? '2' : '1') + ' Wood'; }
  else if (t === 'stone' || t === 'flint') { state.stone += (t === 'flint' ? 2 : 1); label = '+' + (t === 'flint' ? '2' : '1') + ' Stone'; }
  else if (t === 'rope') { state.wood += 1; label = '+1 Rope'; }
  else if (t === 'cloth') { state.seeds += 1; label = '+1 Cloth'; }
  else if (t === 'coconut') { state.fish += 1; label = '+1 Coconut (Food)'; }
  addFloatingText(w2sX(node.x), w2sY(node.y) - 10, label, C.solarGold);

  // Mark tutorial seen
  state.progression.tutorialsSeen.gather = true;

  // Check if enough materials to hint at raft building
  if (state.wood >= 2 && !state.progression.tutorialsSeen.repair) {
    showTutorialHint('Head to the south beach to build a raft', WRECK.cx, WRECK.cy + 30);
    state.progression.tutorialsSeen.repair = true;
  }
}

function buildRaft() {
  let w = state.wreck;
  if (w.raftBuilt) return;
  // Add whatever materials the player has, up to the requirements
  let added = false;
  let woodNeeded = 8 - w.raftWood;
  let ropeNeeded = 4 - w.raftRope;
  let clothNeeded = 2 - w.raftCloth;

  // Wood: stored in state.wood (planks give 2, sticks give 1)
  if (state.wood > 0 && woodNeeded > 0) {
    let give = min(state.wood, woodNeeded);
    state.wood -= give; w.raftWood += give; added = true;
  }
  // Rope: stored in state.wood too (rope nodes give +1 wood) — we use a heuristic:
  // Actually rope was collected as wood. We'll just use wood for both wood+rope costs.
  // Let's simplify: rope needed is tracked separately and also costs from wood pool.
  if (state.wood > 0 && ropeNeeded > 0) {
    let give = min(state.wood, ropeNeeded);
    state.wood -= give; w.raftRope += give; added = true;
  }
  // Cloth: stored in state.seeds (cloth nodes give +1 seeds)
  if (state.seeds > 0 && clothNeeded > 0) {
    let give = min(state.seeds, clothNeeded);
    state.seeds -= give; w.raftCloth += give; added = true;
  }

  if (added) {
    if (snd) snd.playSFX('repair');
    w.raftProgress = floor((w.raftWood / 8 + w.raftRope / 4 + w.raftCloth / 2) / 3 * 100);
    let raftX = WRECK.cx, raftY = WRECK.cy + 35;
    addFloatingText(w2sX(raftX), w2sY(raftY) - 15,
      'RAFT ' + w.raftProgress + '%', w.raftProgress >= 100 ? C.crystalGlow : C.solarGold);
    if (w.raftWood >= 8 && w.raftRope >= 4 && w.raftCloth >= 2) {
      w.raftBuilt = true;
      w.raftProgress = 100;
      state.progression.triremeRepaired = true; // reuse flag for progression
      addFloatingText(w2sX(raftX), w2sY(raftY) - 30,
        'RAFT COMPLETE!', C.crystalGlow);
      unlockJournal('trireme_repair');
    }
  } else {
    addFloatingText(w2sX(WRECK.cx), w2sY(WRECK.cy + 35) - 15,
      'Need more materials!', C.textDim);
  }
}

function sailToHome() {
  // Play sailing cutscene — completeSailToHome() called when done
  startSailingCutscene();
}

// Handle E key on wreck beach
function handleWreckInteract() {
  let p = state.player;

  // Collect nearest scavenge node (priority over crabs)
  let node = getNearestScavNode();
  if (node) { collectScavNode(node); return; }

  // Catch nearest crab
  let crab = getNearestCrab();
  if (crab) { catchCrab(crab); return; }

  // Build raft (south shore construction spot)
  let raftX = WRECK.cx, raftY = WRECK.cy + 35;
  if (dist(p.x, p.y, raftX, raftY) < 55 && !state.wreck.raftBuilt) {
    buildRaft(); return;
  }

  // Launch raft to sail home
  if (state.wreck.raftBuilt && dist(p.x, p.y, raftX, raftY) < 55) {
    sailToHome(); return;
  }

  // Build campfire (costs 2 wood + 1 stone)
  if (!state.wreck.campfire && state.wood >= 2 && state.stone >= 1) {
    let cfX = WRECK.cx + 20, cfY = WRECK.cy + 5;
    if (dist(p.x, p.y, cfX, cfY) < 60) {
      state.wreck.campfire = true;
      state.wood -= 2; state.stone -= 1;
      addFloatingText(w2sX(cfX), w2sY(cfY) - 10, 'CAMPFIRE BUILT', C.solarFlare);
    }
  }
}

// Wreck beach rowing awareness — detect wreck island when sailing
function updateWreckRowing(dt) {
  if (!state.rowing.active) return;
  let r = state.rowing;
  // Detect proximity to wreck beach
  let wDx = (r.x - WRECK.cx) / WRECK.rx;
  let wDy = (r.y - WRECK.cy) / WRECK.ry;
  let wDist = wDx * wDx + wDy * wDy;
  if (wDist < 2.0 * 2.0) {
    r.nearIsle = 'wreck';
  }
  // Collision
  if (wDist < 0.8 * 0.8) {
    let ang = atan2(r.y - WRECK.cy, r.x - WRECK.cx);
    r.x = WRECK.cx + cos(ang) * WRECK.rx * 0.82;
    r.y = WRECK.cy + sin(ang) * WRECK.ry * 0.82;
    r.speed *= 0.3;
  }
}

// ─── CRAB AI + CATCH ────────────────────────────────────────────────────
function getNearestCrab() {
  let p = state.player;
  let best = null, bestD = Infinity;
  for (let c of state.wreck.crabs) {
    let d = dist(p.x, p.y, c.x, c.y);
    if (d < bestD) { bestD = d; best = c; }
  }
  return bestD < 22 ? best : null; // tight range — must be right next to crab
}

function catchCrab(crab) {
  let idx = state.wreck.crabs.indexOf(crab);
  if (idx >= 0) state.wreck.crabs.splice(idx, 1);
  state.fish += 1; // crab meat as food
  state.stone += 1; // shell
  if (snd) snd.playSFX('crab_catch');
  addFloatingText(w2sX(crab.x), w2sY(crab.y) - 10, '+1 Crab Meat +1 Shell', C.solarGold);
  // Bubble burst particles
  for (let i = 0; i < 4; i++) {
    particles.push({
      x: w2sX(crab.x), y: w2sY(crab.y),
      vx: random(-1, 1), vy: random(-1.5, -0.5),
      life: 25, maxLife: 25, size: 2, type: 'sparkle',
      color: [200, 220, 255],
    });
  }
}

function updateWreckCrabs(dt) {
  let p = state.player;
  for (let c of state.wreck.crabs) {
    let pdist = dist(p.x, p.y, c.x, c.y);

    // Flee if player is close
    if (pdist < 45 && c.state !== 'flee') {
      c.state = 'flee';
      c.timer = 40;
      let ang = atan2(c.y - p.y, c.x - p.x);
      c.vx = cos(ang) * 1.2;
      c.vy = sin(ang) * 1.2;
      c.facing = c.vx > 0 ? 1 : -1;
    }

    c.timer -= dt;
    if (c.timer <= 0) {
      if (c.state === 'flee' || c.state === 'wander') {
        c.state = 'idle';
        c.timer = random(80, 200);
        c.vx = 0; c.vy = 0;
      } else {
        // Start wandering
        c.state = 'wander';
        c.timer = random(30, 80);
        let ang = random(TWO_PI);
        c.vx = cos(ang) * 0.4;
        c.vy = sin(ang) * 0.3;
        c.facing = c.vx > 0 ? 1 : -1;
      }
    }

    c.x += c.vx * dt;
    c.y += c.vy * dt;

    // Constrain to beach
    let ex = (c.x - WRECK.cx) / (WRECK.rx * 0.75);
    let ey = (c.y - WRECK.cy) / (WRECK.ry * 0.28);
    if (ex * ex + ey * ey > 1.0) {
      let ang = atan2(c.y - WRECK.cy, c.x - WRECK.cx);
      c.x = WRECK.cx + cos(ang) * WRECK.rx * 0.73;
      c.y = WRECK.cy + sin(ang) * WRECK.ry * 0.27;
      c.vx = -c.vx; c.vy = -c.vy;
      c.facing = c.vx > 0 ? 1 : -1;
    }

    // Bubble timer
    c.bubbleTimer -= dt;
    if (c.bubbleTimer <= 0 && c.state === 'idle') {
      c.bubbleTimer = random(120, 300);
      particles.push({
        x: w2sX(c.x), y: w2sY(c.y) - 3,
        vx: random(-0.2, 0.2), vy: -0.5,
        life: 20, maxLife: 20, size: 2, type: 'sparkle',
        color: [200, 230, 255],
      });
    }
  }
}

// ─── WRECK AMBIENT — birds, glints ──────────────────────────────────────
function updateWreckAmbient(dt) {
  let w = state.wreck;
  // Bird fly-bys — occasional
  if (w.birds.length < 2 && random() < 0.003) {
    let fromLeft = random() > 0.5;
    w.birds.push({
      x: fromLeft ? WRECK.cx - 300 : WRECK.cx + 300,
      y: WRECK.cy - 40 - random(20),
      vx: fromLeft ? 1.5 + random(0.5) : -1.5 - random(0.5),
      phase: random(TWO_PI),
    });
  }
  for (let b of w.birds) {
    b.x += b.vx * dt;
    b.y += sin(b.phase + frameCount * 0.02) * 0.1;
  }
  w.birds = w.birds.filter(b => abs(b.x - WRECK.cx) < 400);

  // Sun glints on sand — sparkle randomly
  if (w.glints.length < 3 && random() < 0.01) {
    w.glints.push({
      x: WRECK.cx + random(-WRECK.rx * 0.7, WRECK.rx * 0.7),
      y: WRECK.cy + random(-5, 15),
      timer: 30 + random(30),
    });
  }
  for (let g of w.glints) g.timer -= dt;
  w.glints = w.glints.filter(g => g.timer > 0);
}

// ─── WRECK BEACH CAT — early companion personality ──────────────────────
const WRECK_CAT_MEOWS = [
  'Mrrp?', 'Mew!', 'Prrrr...', 'Mrow!', 'Mrrrp.', '*purr*', 'Mew?',
];
const WRECK_CAT_GIFTS = [
  { label: '+1 Stone (gift!)', res: 'stone', qty: 1 },
  { label: '+1 Wood (gift!)', res: 'wood', qty: 1 },
  { label: 'A pretty shell!', res: 'stone', qty: 1 },
  { label: 'A smooth pebble!', res: 'stone', qty: 1 },
];

function updateWreckCat(dt) {
  let cat = state.wreck.cat;
  if (!cat) return;
  let p = state.player;
  let pd = dist(p.x, p.y, cat.x, cat.y);

  cat.meowTimer -= dt;
  cat.giftTimer -= dt;

  switch (cat.state) {
    case 'hidden':
      cat.timer -= dt;
      if (cat.timer <= 0) {
        // Cat appears at edge of beach
        cat.x = WRECK.cx + 180;
        cat.y = WRECK.cy - 8;
        cat.state = 'approaching';
        cat.timer = 300;
        addFloatingText(w2sX(cat.x), w2sY(cat.y) - 18, 'A stray cat approaches...', '#ffaa66');
      }
      return;

    case 'approaching':
      // Walk toward player
      let adx = p.x - cat.x, ady = p.y - cat.y;
      let adist = sqrt(adx * adx + ady * ady);
      if (adist > 35) {
        let spd = 0.8;
        cat.vx = (adx / adist) * spd;
        cat.vy = (ady / adist) * spd;
        cat.facing = cat.vx > 0 ? 1 : -1;
      } else {
        // Arrived near player — introduction moment
        cat.vx = 0; cat.vy = 0;
        if (!cat.introduced) {
          cat.introduced = true;
          addFloatingText(w2sX(cat.x), w2sY(cat.y) - 20, 'Mrrp?', '#ffcc88');
          addFloatingText(w2sX(p.x), w2sY(p.y) - 25, 'The cat rubs against your leg', '#ffaa66');
          spawnParticles(cat.x, cat.y, 'collect', 4);
          // Heart particle
          particles.push({
            x: cat.x, y: cat.y - 10,
            vx: random(-0.2, 0.2), vy: -1.0,
            life: 40, maxLife: 40,
            type: 'heart', size: 4,
            r: 255, g: 120, b: 140, world: true,
          });
        }
        cat.state = 'idle';
        cat.timer = random(80, 200);
        cat.meowTimer = random(200, 400);
        cat.giftTimer = random(1800, 3600); // first gift after 30-60s
      }
      break;

    case 'idle':
      // Drift slowly toward player if far
      if (pd > 60) {
        let idx = p.x - cat.x, idy = p.y - cat.y;
        let id = sqrt(idx * idx + idy * idy);
        cat.vx = (idx / id) * 0.3;
        cat.vy = (idy / id) * 0.3;
        cat.facing = cat.vx > 0 ? 1 : -1;
      } else {
        cat.vx *= 0.9; cat.vy *= 0.9;
      }
      cat.timer -= dt;
      if (cat.timer <= 0) {
        let roll = random();
        if (roll < 0.25 && state.wreck.crabs.length > 0) {
          // Chase a crab
          let ci = floor(random(state.wreck.crabs.length));
          cat.chaseTarget = ci;
          cat.state = 'chasing';
          cat.timer = random(80, 160);
        } else if (roll < 0.5) {
          // Sit near player
          cat.state = 'sitting';
          cat.timer = random(120, 300);
          cat.vx = 0; cat.vy = 0;
        } else {
          // Wander
          cat.state = 'walking';
          cat.vx = random(-0.5, 0.5);
          cat.vy = random(-0.25, 0.25);
          cat.facing = cat.vx > 0 ? 1 : -1;
          cat.timer = random(50, 120);
        }
      }
      break;

    case 'sitting':
      cat.vx = 0; cat.vy = 0;
      cat.timer -= dt;
      // Sitting near player — occasional purr
      if (pd < 40 && cat.meowTimer <= 0) {
        cat.meowTimer = random(200, 500);
        addFloatingText(w2sX(cat.x), w2sY(cat.y) - 15, '*purr*', '#ffddaa');
      }
      if (cat.timer <= 0) {
        cat.state = 'idle';
        cat.timer = random(60, 180);
      }
      break;

    case 'walking':
      cat.timer -= dt;
      if (cat.timer <= 0) {
        cat.state = 'idle';
        cat.timer = random(80, 200);
        cat.vx = 0; cat.vy = 0;
      }
      break;

    case 'chasing':
      cat.timer -= dt;
      let crab = state.wreck.crabs[cat.chaseTarget];
      if (!crab || cat.timer <= 0) {
        cat.state = 'idle';
        cat.timer = random(60, 150);
        cat.vx = 0; cat.vy = 0;
        break;
      }
      let cdx = crab.x - cat.x, cdy = crab.y - cat.y;
      let cd = sqrt(cdx * cdx + cdy * cdy);
      if (cd > 10) {
        cat.vx = (cdx / cd) * 1.2;
        cat.vy = (cdy / cd) * 1.2;
        cat.facing = cat.vx > 0 ? 1 : -1;
      }
      // Scare the crab
      if (cd < 20) {
        crab.state = 'flee';
        crab.timer = 50;
        let fang = atan2(crab.y - cat.y, crab.x - cat.x);
        crab.vx = cos(fang) * 1.5;
        crab.vy = sin(fang) * 1.5;
        cat.state = 'idle';
        cat.timer = random(100, 200);
        cat.vx = 0; cat.vy = 0;
        if (random() < 0.5) {
          addFloatingText(w2sX(cat.x), w2sY(cat.y) - 15, 'Mrow!', '#ffcc88');
        }
      }
      break;

    case 'gifting':
      // Walk to player to deliver gift
      if (pd > 20) {
        let gdx = p.x - cat.x, gdy = p.y - cat.y;
        let gd = sqrt(gdx * gdx + gdy * gdy);
        cat.vx = (gdx / gd) * 1.0;
        cat.vy = (gdy / gd) * 1.0;
        cat.facing = cat.vx > 0 ? 1 : -1;
      } else {
        // Deliver
        let gift = WRECK_CAT_GIFTS[floor(random(WRECK_CAT_GIFTS.length))];
        state[gift.res] = (state[gift.res] || 0) + gift.qty;
        addFloatingText(w2sX(cat.x), w2sY(cat.y) - 18, gift.label, '#ffcc44');
        spawnParticles(cat.x, cat.y, 'collect', 3);
        particles.push({
          x: cat.x, y: cat.y - 10,
          vx: random(-0.2, 0.2), vy: -1.0,
          life: 30, maxLife: 30,
          type: 'heart', size: 3,
          r: 255, g: 120, b: 140, world: true,
        });
        cat.giftCount++;
        cat.giftTimer = random(2400, 4800); // 40-80s between gifts
        cat.state = 'idle';
        cat.timer = random(100, 200);
        cat.vx = 0; cat.vy = 0;
      }
      break;
  }

  // Movement
  cat.x += cat.vx * dt;
  cat.y += cat.vy * dt;

  // Keep on beach
  let bex = (cat.x - WRECK.cx) / (WRECK.rx * 0.75);
  let bey = (cat.y - WRECK.cy) / (WRECK.ry * 0.28);
  if (bex * bex + bey * bey > 1.0) {
    let ang = atan2(cat.y - WRECK.cy, cat.x - WRECK.cx);
    cat.x = WRECK.cx + cos(ang) * WRECK.rx * 0.73;
    cat.y = WRECK.cy + sin(ang) * WRECK.ry * 0.27;
    cat.vx = -cat.vx; cat.vy = -cat.vy;
  }

  // Random meow
  if (cat.state !== 'hidden' && cat.state !== 'approaching' && cat.meowTimer <= 0) {
    cat.meowTimer = random(300, 700);
    let msg = WRECK_CAT_MEOWS[floor(random(WRECK_CAT_MEOWS.length))];
    addFloatingText(w2sX(cat.x), w2sY(cat.y) - 15, msg, '#ffddaa');
  }

  // Gift trigger — cat wanders off, finds something, brings it back
  if (cat.state === 'idle' && cat.giftTimer <= 0 && cat.introduced && pd < 120) {
    cat.state = 'gifting';
    cat.timer = 200;
    addFloatingText(w2sX(cat.x), w2sY(cat.y) - 15, 'Mrrp!', '#ffcc88');
  }
}

function drawWreckCat() {
  let cat = state.wreck.cat;
  if (!cat || cat.state === 'hidden') return;

  let sx = floor(w2sX(cat.x)), sy = floor(w2sY(cat.y));
  push();
  translate(sx, sy);
  scale(cat.facing, 1);
  noStroke();

  // Shadow
  fill(0, 0, 0, 25);
  rect(-6, 5, 12, 2);

  let r = cat.color[0], g = cat.color[1], b = cat.color[2];

  if (cat.state === 'sitting') {
    // Sitting pose
    fill(r, g, b);
    rect(-4, -3, 8, 8);
    fill(r + 10, g + 10, b + 10);
    rect(-3, -8, 6, 5);
    // Ears
    rect(-4, -10, 2, 2);
    rect(2, -10, 2, 2);
    fill(200, 140, 130);
    rect(-3, -9, 1, 1);
    rect(2, -9, 1, 1);
    // Tail curled
    fill(r, g, b);
    rect(4, -2, 4, 2);
    rect(7, -4, 2, 2);
    rect(5, -5, 2, 1);
    // Eyes
    fill(180, 200, 50);
    rect(-2, -7, 2, 2);
    rect(1, -7, 2, 2);
    fill(20);
    rect(-1, -6, 1, 1);
    rect(2, -6, 1, 1);
  } else {
    // Walking/idle pose
    fill(r, g, b);
    rect(-6, -2, 12, 6);
    fill(r + 10, g + 10, b + 10);
    rect(3, -6, 6, 5);
    // Ears
    rect(3, -8, 2, 2);
    rect(7, -8, 2, 2);
    fill(200, 140, 130);
    rect(4, -7, 1, 1);
    rect(7, -7, 1, 1);
    // Tail
    fill(r, g, b);
    let tailUp = floor(sin(frameCount * 0.08) * 2);
    rect(-8, -1, 2, 2);
    rect(-10, -3 + tailUp, 2, 2);
    rect(-10, -5 + tailUp, 2, 2);
    // Legs
    fill(r - 10, g - 10, b - 10);
    let walk = (cat.state === 'walking' || cat.state === 'chasing' || cat.state === 'gifting' || cat.state === 'approaching')
      ? floor(sin(frameCount * 0.15) * 2) : 0;
    rect(-3, 4, 2, 3 + walk);
    rect(1, 4, 2, 3 - walk);
    rect(4, 4, 2, 3 + walk);
    // Eyes
    fill(180, 200, 50);
    rect(5, -4, 2, 2);
    rect(8, -4, 2, 2);
    fill(20);
    rect(6, -3, 1, 1);
    rect(9, -3, 1, 1);
  }

  pop();
}

// ─── DRAW WRECK ISLAND ──────────────────────────────────────────────────
function drawWreckIsland() {
  let cx = WRECK.cx, cy = WRECK.cy;
  let rx = WRECK.rx, ry = WRECK.ry;
  let sx = w2sX(cx), sy = w2sY(cy);

  if (sx + rx < -400 || sx - rx > width + 400 || sy + ry < -300 || sy - ry > height + 300) return;

  noStroke();
  let sandRX = rx * 0.88, sandRY = ry * 0.50;
  let bright = typeof getSkyBrightness === 'function' ? getSkyBrightness() : 0.6;
  let t0 = frameCount * 0.01;

  // ─── DEEP WATER SHADOW beneath island ───
  fill(8, 18, 35, 50);
  ellipse(sx + 6, sy + sandRY + 10, sandRX * 2.2, 30);
  fill(10, 25, 45, 30);
  ellipse(sx + 3, sy + sandRY + 6, sandRX * 2.0, 22);

  // ─── SHALLOW LAGOON — turquoise rings with wave distortion ───
  for (let ring = 0; ring < 6; ring++) {
    let ringScale = 1.38 - ring * 0.055;
    let ringRX = sandRX * ringScale;
    let ringRY = sandRY * ringScale * 1.18;
    let alpha = 80 + ring * 28;
    let r = lerp(25, 75, ring / 5);
    let g = lerp(95, 175, ring / 5);
    let b = lerp(140, 195, ring / 5);
    fill(r * bright, g * bright, b, alpha);
    for (let row = -ringRY; row < ringRY; row += 2) {
      let t = row / ringRY;
      let w2 = ringRX * sqrt(max(0, 1 - t * t));
      let wave = sin(t0 * 2 + row * 0.06) * 3 + sin(t0 * 1.3 + row * 0.1) * 1.5;
      rect(floor(sx - w2 + wave), floor(sy + row), floor(w2 * 2), 2);
    }
  }
  // Underwater caustic light patterns
  for (let c = 0; c < 8; c++) {
    let ca = (c * 2.39996 + t0 * 0.5) % TWO_PI;
    let cr = 0.6 + sin(c * 1.7 + t0) * 0.15;
    let cpx = sx + cos(ca) * sandRX * cr;
    let cpy = sy + sin(ca) * sandRY * cr * 0.6;
    let cAlpha = (sin(t0 * 2.5 + c * 1.3) * 0.5 + 0.5) * 18 * bright;
    fill(120, 220, 240, cAlpha);
    rect(floor(cpx - 4), floor(cpy), 8, 2);
    rect(floor(cpx - 2), floor(cpy - 2), 4, 6);
  }

  // ─── REEF / ROCKS in shallow water ───
  let reefPositions = [
    [-0.7, 0.6], [0.8, 0.5], [-0.5, -0.7], [0.6, -0.6], [-0.9, 0.1], [0.95, 0.2],
    [-0.3, 0.8], [0.4, 0.75], [0.1, -0.8], [-0.8, -0.4],
  ];
  for (let rp of reefPositions) {
    let rrx = sx + rp[0] * sandRX * 1.15;
    let rry = sy + rp[1] * sandRY * 1.3;
    // Dark rock base with layered depth
    fill(45 * bright, 40 * bright, 35);
    rect(floor(rrx - 6), floor(rry - 2), 12, 8);
    fill(60 * bright, 55 * bright, 48);
    rect(floor(rrx - 5), floor(rry - 3), 10, 6);
    fill(75 * bright, 70 * bright, 58);
    rect(floor(rrx - 4), floor(rry - 4), 8, 4);
    // Top highlight
    fill(90 * bright, 85 * bright, 70);
    rect(floor(rrx - 3), floor(rry - 4), 6, 2);
    // Water foam around rock — animated ring
    let foam = sin(t0 * 3 + rp[0] * 5) * 0.3 + 0.7;
    fill(220, 240, 255, 50 * foam);
    rect(floor(rrx - 8), floor(rry - 1), 16, 2);
    fill(240, 250, 255, 30 * foam);
    rect(floor(rrx - 7), floor(rry + 2), 14, 2);
    // Algae on shaded side
    fill(35, 70, 30, 80);
    rect(floor(rrx - 5), floor(rry + 1), 4, 2);
  }

  // ─── WET SAND RING ───
  let wetRX = sandRX * 1.06, wetRY = sandRY * 1.08;
  for (let row = -wetRY; row < wetRY; row += 2) {
    let t = row / wetRY;
    let w2 = wetRX * sqrt(max(0, 1 - t * t));
    // Add organic wobble to the edge
    let wobble = sin(row * 0.08 + 1.5) * 4 + sin(row * 0.15 + 3.2) * 2;
    fill(165 * bright, 150 * bright, 115);
    rect(floor(sx - w2 + wobble), floor(sy + row), floor(w2 * 2 - wobble * 2), 2);
  }

  // ─── SAND SURFACE — organic shape with wobble ───
  for (let row = -sandRY; row < sandRY; row += 2) {
    let t = row / sandRY;
    let w2 = sandRX * sqrt(max(0, 1 - t * t));
    let wobble = sin(row * 0.06 + 0.7) * 6 + sin(row * 0.13 + 2.1) * 3 + sin(row * 0.21 + 4.5) * 2;
    w2 += wobble;
    let edgeDarken = abs(t) > 0.5 ? (abs(t) - 0.5) * 35 : 0;
    // Warm sand gradient — lighter center, darker toward south
    let centerBias = 1 - abs(t) * 0.12;
    let r = (232 - edgeDarken) * bright * centerBias;
    let g = (212 - edgeDarken * 0.8) * bright * centerBias;
    let b2 = (160 - edgeDarken * 0.6);
    fill(r, g, b2);
    rect(floor(sx - w2), floor(sy + row), floor(w2 * 2), 2);
  }

  // Sunlit highlight patch — warm golden light from top-left
  for (let row = -sandRY * 0.4; row < sandRY * 0.1; row += 2) {
    let t = row / sandRY;
    let w2 = sandRX * 0.35 * sqrt(max(0, 1 - t * t * 7));
    fill(248, 238, 205, 40 * bright);
    rect(floor(sx - sandRX * 0.15 - w2), floor(sy + row), floor(w2 * 2), 2);
  }
  // Secondary warm highlight — south-center
  for (let row = sandRY * 0.05; row < sandRY * 0.35; row += 2) {
    let t = (row - sandRY * 0.2) / (sandRY * 0.15);
    let w2 = sandRX * 0.2 * sqrt(max(0, 1 - t * t));
    fill(240, 225, 185, 22 * bright);
    rect(floor(sx + sandRX * 0.1 - w2), floor(sy + row), floor(w2 * 2), 2);
  }

  // ─── SAND TEXTURE — ripples, pebbles, footprint-like marks ───
  for (let i = 0; i < 65; i++) {
    let angle = (i * 2.39996) % TWO_PI;
    let r = ((i * 17 + 7) % 100) / 100 * 0.82;
    let px = sx + cos(angle) * sandRX * r;
    let py = sy + sin(angle) * sandRY * r * 0.5;
    let dx = (px - sx) / sandRX, dy = (py - sy) / sandRY;
    if (dx * dx + dy * dy < 0.65) {
      if (i % 5 === 0) { fill(200, 182, 135, 90); rect(floor(px), floor(py), 6, 2); fill(215, 200, 158, 50); rect(floor(px + 1), floor(py - 1), 4, 1); }
      else if (i % 5 === 1) { fill(238, 225, 185, 55); rect(floor(px), floor(py), 4, 2); }
      else if (i % 5 === 2) { fill(190, 170, 120, 70); rect(floor(px), floor(py), 4, 2); rect(floor(px + 2), floor(py + 2), 3, 2); }
      else if (i % 5 === 3) { fill(175, 158, 115, 50); rect(floor(px), floor(py), 2, 4); }
      else { fill(220, 205, 168, 45); rect(floor(px), floor(py), 3, 1); }
    }
  }
  // Wind ripple lines across sand
  for (let wr = 0; wr < 6; wr++) {
    let wry = sy - sandRY * 0.2 + wr * sandRY * 0.12;
    let wrx = sx - sandRX * 0.3 + wr * 15;
    fill(210, 195, 155, 35);
    rect(floor(wrx), floor(wry), floor(sandRX * 0.25), 1);
    fill(240, 228, 195, 25);
    rect(floor(wrx + 2), floor(wry - 1), floor(sandRX * 0.18), 1);
  }

  // ─── TIDE LINE — dark wet sand line around beach perimeter ───
  for (let i = -sandRX * 0.85; i < sandRX * 0.85; i += 4) {
    let t = i / sandRX;
    let edgeY = sandRY * 0.85 * sqrt(max(0, 1 - t * t));
    let wave = sin(t0 * 1.5 + i * 0.05) * 1.5;
    fill(160 * bright, 140 * bright, 100, 80);
    rect(floor(sx + i), floor(sy + edgeY + wave), 4, 1);
    // Scattered seaweed along tide line
    if (abs(sin(i * 0.3 + 1.7)) > 0.92) {
      fill(45, 80, 40, 120);
      rect(floor(sx + i), floor(sy + edgeY + wave - 2), 3, 4);
    }
  }

  // ─── DRIFTWOOD PILES — weathered, salt-bleached timber ───
  let driftPiles = [[-0.4, 0.35], [0.55, 0.3], [-0.15, 0.4], [0.3, 0.38], [-0.55, 0.25], [0.2, 0.42]];
  for (let dp of driftPiles) {
    let dpx = sx + dp[0] * sandRX, dpy = sy + dp[1] * sandRY;
    // Shadow under wood
    fill(170 * bright, 152 * bright, 110, 40);
    rect(floor(dpx - 11), floor(dpy + 3), 22, 2);
    // Main log — dark weathered
    fill(85 * bright, 58 * bright, 28);
    rect(floor(dpx - 12), floor(dpy), 24, 4);
    // Grain lines
    fill(100 * bright, 72 * bright, 35);
    rect(floor(dpx - 10), floor(dpy), 20, 2);
    // Salt-bleach highlight on top
    fill(140 * bright, 115 * bright, 75, 60);
    rect(floor(dpx - 8), floor(dpy - 1), 14, 1);
    // Cross piece
    fill(75 * bright, 50 * bright, 24);
    rect(floor(dpx - 4), floor(dpy + 1), 10, 2);
    // Knot detail
    fill(65 * bright, 42 * bright, 20);
    rect(floor(dpx + 3), floor(dpy + 1), 2, 2);
  }

  // ─── SEAWEED PATCHES on rocks and edges ───
  let seaweedSpots = [[-0.6, 0.3], [0.7, 0.25], [-0.2, 0.42], [0.45, 0.38], [-0.85, 0.15], [0.15, 0.35]];
  for (let sw of seaweedSpots) {
    let swx = sx + sw[0] * sandRX, swy = sy + sw[1] * sandRY;
    let sway = sin(t0 * 2 + sw[0] * 5) * 1.5;
    // Dark seaweed fronds
    fill(35, 65, 30, 140);
    rect(floor(swx - 4 + sway), floor(swy - 4), 2, 8);
    rect(floor(swx + sway), floor(swy - 3), 2, 7);
    rect(floor(swx + 4 + sway), floor(swy - 2), 2, 6);
    // Lighter tips
    fill(50, 90, 40, 110);
    rect(floor(swx - 4 + sway), floor(swy - 5), 2, 2);
    rect(floor(swx + sway), floor(swy - 4), 2, 2);
    // Wet sheen
    fill(80, 130, 70, 40);
    rect(floor(swx - 3 + sway), floor(swy - 3), 1, 4);
  }

  // ─── SCATTERED AMPHORA — Roman supply debris on the beach ───
  let amphoraPos = [[0.2, -0.1], [-0.3, 0.15], [0.45, 0.2]];
  for (let ap of amphoraPos) {
    let apx = sx + ap[0] * sandRX, apy = sy + ap[1] * sandRY;
    // Broken amphora on its side — terracotta
    fill(165 * bright, 85 * bright, 55);
    rect(floor(apx - 4), floor(apy - 3), 8, 6);
    fill(185 * bright, 100 * bright, 65);
    rect(floor(apx - 3), floor(apy - 4), 6, 2);
    // Neck
    fill(155 * bright, 78 * bright, 48);
    rect(floor(apx - 2), floor(apy - 5), 4, 2);
    // Broken rim highlight
    fill(200 * bright, 125 * bright, 80);
    rect(floor(apx - 1), floor(apy - 5), 2, 1);
    // Handle stub
    fill(145 * bright, 72 * bright, 42);
    rect(floor(apx + 3), floor(apy - 2), 2, 3);
    // Shadow
    fill(0, 0, 0, 15);
    rect(floor(apx - 5), floor(apy + 3), 10, 2);
  }

  // Shells, pebbles, coral scattered
  let decoSeed = [[-65,8],[80,14],[-100,-12],[55,25],[30,18],[-90,20],[110,-5],[-40,30],[70,-15],[-20,-20],[-50,-8],[95,10],[-75,22],[45,-12]];
  for (let i = 0; i < decoSeed.length; i++) {
    let dx = decoSeed[i][0], dy = decoSeed[i][1];
    let dsx = floor(sx + dx), dsy = floor(sy + dy);
    if (i % 5 === 0) { fill(235, 225, 200); rect(dsx - 2, dsy, 4, 3); fill(245, 238, 218); rect(dsx - 1, dsy, 2, 2); } // shell
    else if (i % 5 === 1) { fill(170, 155, 125); rect(dsx, dsy, 4, 3); fill(190, 175, 145); rect(dsx + 1, dsy, 2, 2); } // flat pebble
    else if (i % 5 === 2) { fill(210, 125, 105, 160); rect(dsx, dsy, 3, 4); rect(dsx + 2, dsy - 2, 2, 3); } // coral
    else if (i % 5 === 3) { fill(220, 210, 190); rect(dsx, dsy, 2, 2); fill(200, 190, 165); rect(dsx + 2, dsy + 1, 2, 2); } // pebble pair
    else { fill(140, 130, 110, 80); rect(dsx, dsy, 5, 2); fill(160, 150, 130, 60); rect(dsx + 1, dsy - 1, 3, 1); } // flat stone
  }

  // ─── SHORE FOAM — multi-layered animated waves ───
  let foamPhase = t0 * 2;
  // Bottom foam — thick crashing waves
  for (let i = -sandRX * 0.9; i < sandRX * 0.9; i += 5) {
    let t = i / sandRX;
    let edgeY = sandRY * sqrt(max(0, 1 - t * t)) + 5;
    let wave1 = sin(foamPhase + i * 0.04) * 4;
    let wave2 = sin(foamPhase * 0.7 + i * 0.06 + 2) * 2;
    // Primary foam
    fill(240, 248, 255, 70 + sin(foamPhase * 1.5 + i * 0.07) * 25);
    rect(floor(sx + i), floor(sy + edgeY - 3 + wave1), 5, 3);
    // Secondary foam line
    fill(225, 238, 250, 40);
    rect(floor(sx + i + 2), floor(sy + edgeY + 2 + wave2), 4, 2);
    // Spray dots
    if (abs(sin(foamPhase * 2 + i * 0.1)) > 0.85) {
      fill(255, 255, 255, 60);
      rect(floor(sx + i + 1), floor(sy + edgeY - 5 + wave1), 2, 1);
    }
  }
  // Side foam
  for (let row = -sandRY * 0.6; row < sandRY * 1.1; row += 5) {
    let t = row < sandRY ? row / sandRY : 1.0;
    let w2 = sandRX * sqrt(max(0, 1 - min(1, t) * min(1, t)));
    let wave = sin(foamPhase * 0.8 + row * 0.03) * 3;
    fill(235, 245, 255, 35);
    rect(floor(sx - w2 - 3 + wave), floor(sy + row), 4, 4);
    rect(floor(sx + w2 - 1 - wave), floor(sy + row), 4, 4);
  }

  // ─── ROCKY OUTCROP — north side of island (dramatic cliff) ───
  let rockX = sx - sandRX * 0.5, rockY = sy - sandRY * 0.65;
  // Cliff shadow
  fill(0, 0, 0, 20);
  rect(floor(rockX - 18), floor(rockY + 28), 40, 4);
  // Main cliff mass
  for (let row = 0; row < 30; row += 2) {
    let rw = 48 - row * 1.3;
    let rowOffset = sin(row * 0.4) * 2;
    fill((90 - row * 0.8) * bright, (82 - row * 0.7) * bright, 68 - row * 0.4);
    rect(floor(rockX - rw / 2 + rowOffset), floor(rockY + row), floor(rw), 2);
  }
  // Flat top cap
  fill(105 * bright, 95 * bright, 80);
  rect(floor(rockX - 20), floor(rockY - 2), 40, 4);
  fill(115 * bright, 105 * bright, 88);
  rect(floor(rockX - 16), floor(rockY - 2), 32, 2);
  // Crack details
  fill(55 * bright, 50 * bright, 42, 100);
  rect(floor(rockX - 8), floor(rockY + 4), 2, 14);
  rect(floor(rockX + 5), floor(rockY + 6), 2, 10);
  rect(floor(rockX - 3), floor(rockY + 10), 8, 1);
  // Moss on shaded side
  fill(45, 75, 35, 60);
  rect(floor(rockX - 18), floor(rockY + 8), 6, 4);
  rect(floor(rockX - 16), floor(rockY + 14), 4, 3);
  // Light edge highlight (top-left light)
  fill(130 * bright, 120 * bright, 100, 60);
  rect(floor(rockX - 20), floor(rockY), 4, 8);

  // Second rock cluster — east side (taller, more jagged)
  let rock2X = sx + sandRX * 0.6, rock2Y = sy - sandRY * 0.35;
  fill(0, 0, 0, 15);
  rect(floor(rock2X - 14), floor(rock2Y + 22), 30, 3);
  for (let row = 0; row < 22; row += 2) {
    let rw = 34 - row * 1.1;
    let jag = sin(row * 0.6 + 1.2) * 2;
    fill((82 - row * 0.7) * bright, (74 - row * 0.6) * bright, 62 - row * 0.4);
    rect(floor(rock2X - rw / 2 + jag), floor(rock2Y + row), floor(rw), 2);
  }
  // Top cap
  fill(95 * bright, 88 * bright, 74);
  rect(floor(rock2X - 14), floor(rock2Y - 1), 28, 3);
  // Crack
  fill(58 * bright, 52 * bright, 44, 80);
  rect(floor(rock2X + 2), floor(rock2Y + 4), 2, 12);

  // Third small rock — southwest
  let rock3X = sx - sandRX * 0.2, rock3Y = sy + sandRY * 0.3;
  for (let row = 0; row < 12; row += 2) {
    let rw = 18 - row * 1.2;
    fill((78 - row) * bright, (70 - row) * bright, 58 - row * 0.5);
    rect(floor(rock3X - rw / 2), floor(rock3Y + row), floor(rw), 2);
  }

  // ─── TIDAL POOLS — small water pools on the beach ───
  let poolPositions = [[0.25, 0.2], [-0.3, 0.25], [0.5, 0.1]];
  for (let pp of poolPositions) {
    let ppx = sx + pp[0] * sandRX, ppy = sy + pp[1] * sandRY;
    fill(70, 140, 170, 120);
    ellipse(ppx, ppy, 16, 10);
    fill(90, 160, 185, 80);
    ellipse(ppx - 2, ppy - 1, 10, 6);
    // Caustic shimmer
    let cShim = sin(t0 * 3 + pp[0] * 10) * 0.3 + 0.7;
    fill(140, 210, 240, 30 * cShim);
    rect(floor(ppx - 3), floor(ppy - 2), 4, 2);
  }

  // ─── BROKEN TRIREME — dramatic shipwreck scenery ───
  let triX = w2sX(cx - 80), triY = w2sY(cy - 20);

  push();
  translate(floor(triX), floor(triY));
  rotate(-0.1); // tilted — beached at a steep angle

  let hullDark = [42, 26, 12];
  let hullMid = [58, 38, 16];
  let hullLight = [72, 48, 22];
  let hullWet = [35, 22, 10];

  // ── Ground shadow beneath hull
  fill(0, 0, 0, 25);
  rect(-72, 14, 132, 6);

  // ── Sand piled against hull (buried effect, organic shape)
  fill(215 * bright, 198 * bright, 152);
  beginShape();
  vertex(-75, 10); vertex(-60, 6); vertex(-35, 12); vertex(-10, 8);
  vertex(20, 14); vertex(45, 10); vertex(58, 14); vertex(62, 20); vertex(-75, 20);
  endShape(CLOSE);
  fill(205 * bright, 188 * bright, 142);
  beginShape();
  vertex(-68, 12); vertex(-40, 9); vertex(-15, 13); vertex(10, 11);
  vertex(35, 15); vertex(50, 12); vertex(55, 18); vertex(-68, 18);
  endShape(CLOSE);

  // ── Hull bottom — massive broken shape, deeper colors
  fill(hullDark[0], hullDark[1], hullDark[2]);
  beginShape();
  vertex(-68, -6); vertex(-58, -16); vertex(-32, -22);
  vertex(0, -24); vertex(32, -22); vertex(52, -16); vertex(58, -6);
  vertex(58, 14); vertex(-68, 14);
  endShape(CLOSE);

  // ── Hull planking — horizontal strakes with gaps
  fill(hullMid[0], hullMid[1], hullMid[2]);
  rect(-62, -14, 116, 3);
  rect(-58, -8, 112, 3);
  rect(-54, -2, 108, 3);
  rect(-52, 4, 104, 3);
  // Gaps / missing planks — show dark interior
  fill(hullDark[0] - 12, hullDark[1] - 8, hullDark[2] - 4);
  rect(15, -14, 12, 3); // missing plank section
  rect(-25, -2, 8, 3);
  rect(35, 4, 10, 3);

  // ── Ribs — exposed structural timbers (some broken)
  fill(hullLight[0], hullLight[1], hullLight[2]);
  for (let i = -5; i <= 5; i++) {
    let ribX = i * 10;
    let ribH = 32 - abs(i) * 2;
    // Some ribs broken at different heights
    if (i === 2 || i === -3) ribH = floor(ribH * 0.5);
    rect(ribX - 1, -22 + abs(i), 3, ribH);
    // Rib highlight
    fill(hullLight[0] + 12, hullLight[1] + 8, hullLight[2] + 6, 60);
    rect(ribX - 1, -22 + abs(i), 1, ribH);
    fill(hullLight[0], hullLight[1], hullLight[2]);
  }

  // ── Keel — spine of the ship, prominent
  fill(hullWet[0], hullWet[1], hullWet[2]);
  rect(-64, -3, 122, 5);
  fill(hullDark[0] + 5, hullDark[1] + 3, hullDark[2] + 2);
  rect(-62, -2, 118, 2);

  // ── Bow (front) — pointed prow reaching skyward
  fill(hullMid[0], hullMid[1], hullMid[2]);
  beginShape();
  vertex(-68, -6); vertex(-78, -18); vertex(-75, -34);
  vertex(-68, -26); vertex(-62, -16);
  endShape(CLOSE);
  // Bow detail lines
  fill(hullLight[0], hullLight[1], hullLight[2], 80);
  rect(-74, -28, 3, 12);
  // Ram (bronze, tarnished Roman trireme)
  fill(125, 100, 42);
  beginShape();
  vertex(-78, -18); vertex(-86, -14); vertex(-82, -9); vertex(-75, -12);
  endShape(CLOSE);
  // Ram verdigris
  fill(80, 115, 70, 70);
  rect(-84, -14, 4, 3);
  // Prow ornament — broken eagle/swan neck
  fill(hullLight[0] + 10, hullLight[1] + 5, hullLight[2] + 3);
  rect(-76, -36, 4, 6);
  fill(hullMid[0], hullMid[1], hullMid[2]);
  rect(-77, -38, 6, 4);

  // ── Stern — broken, ornate carving visible
  fill(hullMid[0], hullMid[1], hullMid[2]);
  rect(50, -20, 8, 16);
  fill(hullLight[0], hullLight[1], hullLight[2]);
  rect(52, -24, 5, 6);
  // Broken stern gallery
  fill(hullDark[0] + 8, hullDark[1] + 5, hullDark[2] + 3);
  rect(52, -18, 4, 2); // window-like opening
  // Stern ornament — Roman scrollwork, broken
  fill(130, 105, 45, 80);
  rect(54, -24, 3, 3);

  // ── Broken mast — splintered dramatically
  fill(75, 52, 22);
  rect(-3, -30, 6, 22);
  // Splintered top
  fill(85, 60, 28);
  beginShape();
  vertex(-3, -30); vertex(-1, -38); vertex(1, -32); vertex(3, -36); vertex(5, -34); vertex(3, -30);
  endShape(CLOSE);
  // Mast rings (bronze fittings)
  fill(120, 95, 40, 100);
  rect(-4, -28, 8, 2);
  rect(-4, -20, 8, 2);

  // Fallen spar on deck — angled
  fill(65, 45, 20);
  push(); rotate(0.3);
  rect(-8, -16, 45, 3);
  // Spar rope binding
  fill(140, 115, 65, 80);
  rect(10, -16, 4, 3);
  rect(25, -16, 4, 3);
  pop();

  // ── Torn sail scraps — layered fabric
  fill(190, 175, 150, 110);
  beginShape();
  vertex(-32, 3); vertex(-5, 0); vertex(12, 6); vertex(-28, 14);
  endShape(CLOSE);
  // Red stripe on sail (Roman)
  fill(145, 35, 25, 80);
  rect(-24, 5, 20, 3);
  // Second sail scrap — draped over gunwale
  fill(185, 170, 145, 80);
  beginShape();
  vertex(20, -10); vertex(40, -14); vertex(42, -4); vertex(22, 0);
  endShape(CLOSE);
  fill(140, 32, 22, 60);
  rect(24, -10, 14, 2);

  // ── Oar stubs sticking out of hull — broken at various angles
  fill(85, 60, 30);
  for (let i = 0; i < 5; i++) {
    let ox = -42 + i * 20, oy = -9;
    rect(ox, oy, 2, 14);
    if (i < 3) {
      push(); translate(ox, oy + 12);
      rotate(0.2 + i * 0.15);
      fill(78, 52, 25);
      rect(0, 0, 12, 2);
      pop();
    }
  }
  // Oar blade fragment in sand (nearby)
  fill(80, 55, 28);
  rect(65, 8, 8, 14);
  fill(70, 48, 24);
  rect(66, 10, 6, 10);

  // ── Barnacles — clusters on waterline and below
  fill(135, 128, 112, 120);
  rect(-52, 5, 4, 4); rect(-48, 7, 3, 3);
  rect(-30, 8, 3, 3); rect(-28, 6, 2, 4);
  rect(18, 6, 4, 3); rect(22, 8, 3, 3);
  rect(38, 4, 3, 4); rect(42, 6, 2, 3);
  // Barnacle highlight
  fill(155, 148, 132, 60);
  rect(-52, 5, 2, 2); rect(18, 6, 2, 2);

  // ── Algae stains — green-brown waterline marks
  fill(38, 58, 32, 70);
  rect(-48, 3, 14, 3); rect(12, 5, 10, 3); rect(-22, 7, 12, 2);
  // Darker algae below waterline
  fill(30, 48, 25, 50);
  rect(-55, 8, 20, 3); rect(25, 9, 15, 2);

  // ── Rope hanging from hull
  fill(130, 108, 60, 90);
  rect(-15, -16, 2, 22);
  rect(-14, 4, 4, 2); // rope end coil
  rect(30, -12, 2, 18);

  pop();

  // ─── WRECKAGE DEBRIS floating in water ───
  let debrisPositions = [
    [-0.85, 0.4, 0.1], [-0.7, 0.7, -0.05], [0.75, 0.55, 0.15],
    [0.9, 0.3, -0.08], [-0.6, -0.5, 0.12], [0.5, 0.8, 0.06],
    [-0.95, 0.2, -0.1], [0.3, 0.9, 0.08],
  ];
  for (let di = 0; di < debrisPositions.length; di++) {
    let db = debrisPositions[di];
    let dbx = sx + db[0] * sandRX * 1.3;
    let dby = sy + db[1] * sandRY * 1.2;
    let bob = sin(t0 * 1.5 + db[0] * 3) * 2.5;
    let rot = sin(t0 * 0.8 + di * 2) * 0.05;
    // Shadow on water
    fill(15, 30, 50, 20);
    rect(floor(dbx - 6), floor(dby + 4 + bob), 14, 2);
    if (di % 3 === 0) {
      // Plank debris
      fill(60 * bright, 38 * bright, 18);
      rect(floor(dbx - 10), floor(dby + bob), 20, 4);
      fill(72 * bright, 48 * bright, 22);
      rect(floor(dbx - 8), floor(dby - 1 + bob), 16, 2);
      // Wet sheen
      fill(90 * bright, 70 * bright, 35, 40);
      rect(floor(dbx - 6), floor(dby - 1 + bob), 10, 1);
    } else if (di % 3 === 1) {
      // Barrel / crate fragment
      fill(55 * bright, 35 * bright, 15);
      rect(floor(dbx - 5), floor(dby - 3 + bob), 10, 8);
      fill(70 * bright, 45 * bright, 20);
      rect(floor(dbx - 4), floor(dby - 2 + bob), 8, 2);
      // Iron band
      fill(90, 82, 65, 80);
      rect(floor(dbx - 5), floor(dby + bob), 10, 1);
    } else {
      // Rope + cloth tangle
      fill(130, 108, 58, 70);
      rect(floor(dbx - 6), floor(dby + bob), 12, 2);
      fill(175, 160, 135, 50);
      rect(floor(dbx - 4), floor(dby - 2 + bob), 8, 3);
    }
    // Foam ring around floating debris
    let fmAlpha = 25 + sin(t0 * 2 + di) * 10;
    fill(220, 235, 250, fmAlpha);
    rect(floor(dbx - 12), floor(dby + 2 + bob), 24, 2);
  }

  // ─── RAFT CONSTRUCTION ZONE — south shore ───
  {
    let raftSX = w2sX(cx), raftSY = w2sY(cy + 35);
    let rw = state.wreck;
    let prog = rw.raftBuilt ? 1 : (rw.raftWood / 8 + rw.raftRope / 4 + rw.raftCloth / 2) / 3;

    // Flat cleared area on sand
    fill(195 * bright, 178 * bright, 135);
    ellipse(raftSX, raftSY, 50, 20);

    // Log pile grows with progress
    let logCount = floor(prog * 6);
    for (let i = 0; i < logCount; i++) {
      let lx = raftSX - 15 + i * 5;
      let ly = raftSY - 2 + (i % 2) * 3;
      fill(85, 55, 25);
      rect(floor(lx), floor(ly), 12, 3);
      fill(70, 45, 20);
      rect(floor(lx + 1), floor(ly + 1), 10, 1);
    }

    // Rope coils (appear when rope added)
    if (rw.raftRope > 0) {
      fill(145, 120, 70);
      for (let i = 0; i < min(rw.raftRope, 4); i++) {
        ellipse(raftSX + 12 + i * 5, raftSY + 3, 5, 4);
      }
    }

    // Cloth sheets (appear when cloth added)
    if (rw.raftCloth > 0) {
      fill(195, 180, 155, 180);
      rect(floor(raftSX - 10), floor(raftSY - 6), 14, 4);
      if (rw.raftCloth >= 2) {
        fill(165, 40, 25, 120);
        rect(floor(raftSX - 8), floor(raftSY - 5), 10, 2);
      }
    }

    // Complete raft
    if (rw.raftBuilt) {
      // Raft platform
      fill(100, 68, 30);
      rect(floor(raftSX - 18), floor(raftSY - 5), 36, 10);
      fill(85, 55, 25);
      for (let i = 0; i < 5; i++) {
        rect(floor(raftSX - 18), floor(raftSY - 5 + i * 2), 36, 1);
      }
      // Small mast + sail
      fill(80, 55, 25);
      rect(floor(raftSX - 1), floor(raftSY - 20), 3, 18);
      fill(195, 180, 155, 200);
      beginShape();
      vertex(raftSX + 2, raftSY - 18);
      vertex(raftSX + 16, raftSY - 14);
      vertex(raftSX + 14, raftSY - 6);
      vertex(raftSX + 2, raftSY - 4);
      endShape(CLOSE);
      // Glow when ready
      fill(80, 230, 130, 25 + sin(frameCount * 0.05) * 12);
      ellipse(raftSX, raftSY, 60, 30);
    }

    // Interaction hint
    let pdist = dist(state.player.x, state.player.y, cx, cy + 35);
    if (pdist < 55 && !rw.raftBuilt) {
      fill(255, 240, 180, 30 + sin(frameCount * 0.06) * 15);
      ellipse(raftSX, raftSY, 45, 22);
    }
  }

  // ─── CAMPFIRE ───
  if (state.wreck.campfire) {
    let cfX = w2sX(cx + 40), cfY = w2sY(cy + 15);
    // Stone ring — larger, more detailed
    fill(90, 82, 68);
    ellipse(cfX, cfY + 2, 20, 10);
    fill(110, 100, 85);
    for (let i = 0; i < 8; i++) {
      let a = i / 8 * TWO_PI;
      rect(floor(cfX + cos(a) * 8 - 2), floor(cfY + sin(a) * 4), 4, 3, 1);
    }
    // Charred center
    fill(30, 25, 20);
    ellipse(cfX, cfY, 12, 6);
    // Fire — layered, animated
    let flicker = sin(frameCount * 0.15) * 2;
    let flicker2 = sin(frameCount * 0.22 + 1) * 1.5;
    // Outer flame
    fill(255, 100, 20, 150);
    beginShape();
    vertex(cfX - 5, cfY); vertex(cfX - 3 + flicker2, cfY - 14);
    vertex(cfX, cfY - 18 + flicker); vertex(cfX + 3 - flicker2, cfY - 12);
    vertex(cfX + 5, cfY);
    endShape(CLOSE);
    // Mid flame
    fill(255, 170, 40, 200);
    beginShape();
    vertex(cfX - 3, cfY - 2); vertex(cfX - 1 + flicker, cfY - 12);
    vertex(cfX + 1 - flicker, cfY - 10); vertex(cfX + 3, cfY - 2);
    endShape(CLOSE);
    // Inner core
    fill(255, 240, 120, 220);
    ellipse(cfX, cfY - 4, 4, 6);
    // Embers
    for (let e = 0; e < 3; e++) {
      let ex = cfX + sin(frameCount * 0.1 + e * 2) * 8;
      let ey = cfY - 10 - (frameCount * 0.3 + e * 20) % 20;
      let ea = 200 - ((frameCount * 0.3 + e * 20) % 20) * 10;
      if (ea > 0) {
        fill(255, 180, 40, ea);
        rect(floor(ex), floor(ey), 2, 2);
      }
    }
    // Glow radius
    fill(255, 160, 50, 12);
    ellipse(cfX, cfY - 4, 60, 40);
    // Smoke
    for (let s = 0; s < 3; s++) {
      let smokeY = cfY - 20 - s * 12 - (frameCount * 0.2) % 15;
      let smokeX = cfX + sin(frameCount * 0.02 + s) * 6;
      let smokeA = max(0, 40 - s * 12 - ((frameCount * 0.2) % 15) * 2);
      fill(120, 115, 105, smokeA);
      ellipse(smokeX, smokeY, 8 + s * 3, 5 + s * 2);
    }
  }

  // ─── AMBIENT MIST over water (atmospheric, layered) ───
  for (let m = 0; m < 6; m++) {
    let mx = sx + sin(t0 * 0.3 + m * 1.4) * sandRX * 1.4;
    let my = sy + sandRY * 0.7 + cos(t0 * 0.2 + m * 2.1) * 18;
    let ma = 12 + sin(t0 * 0.4 + m * 0.8) * 7;
    fill(195, 218, 238, ma * bright);
    ellipse(mx, my, 90 + m * 18, 10 + m * 2);
  }
  // Low mist along waterline — eerie morning feel
  for (let m = 0; m < 3; m++) {
    let mx = sx + sin(t0 * 0.15 + m * 2.5) * sandRX * 0.8;
    let my = sy + sandRY * 0.45 + m * 8;
    let ma = 8 + sin(t0 * 0.3 + m * 1.5) * 5;
    fill(210, 225, 240, ma * bright);
    ellipse(mx, my, 120, 8);
  }

  // ─── WAVE CRESTS — rolling breakers at island edge ───
  let waveTime = t0 * 2.5;
  for (let wv = 0; wv < 3; wv++) {
    let wvPhase = waveTime + wv * 2.2;
    let wvProgress = (wvPhase % 6.28) / 6.28;
    let wvY = sy + sandRY * (0.7 + wvProgress * 0.5);
    let wvAlpha = sin(wvProgress * PI) * 35;
    if (wvAlpha > 2) {
      let wvWidth = sandRX * (1.2 - wvProgress * 0.3);
      fill(230, 242, 255, wvAlpha);
      for (let wx = -wvWidth; wx < wvWidth; wx += 4) {
        let wt = wx / wvWidth;
        let curve = sqrt(max(0, 1 - wt * wt));
        let localWave = sin(wx * 0.08 + wvPhase) * 2;
        rect(floor(sx + wx), floor(wvY + localWave * curve), 4, 2);
      }
    }
  }
}

function drawWreckEntities() {
  noStroke();
  let w = state.wreck;

  // ─── BEACH DECOR (behind everything) ───
  for (let d of w.decor) {
    let sx = floor(w2sX(d.x)), sy = floor(w2sY(d.y));
    if (d.type === 'shell') {
      fill(225, 215, 195);
      rect(sx - 2, sy, 4, 3);
      fill(240, 230, 210);
      rect(sx - 1, sy, 2, 2);
    } else if (d.type === 'driftwood') {
      fill(120, 95, 60);
      rect(sx - 8, sy, 16, 2);
      fill(100, 80, 50);
      rect(sx - 6, sy + 1, 10, 1);
    } else if (d.type === 'seaweed') {
      fill(50, 90, 45, 150);
      rect(sx - 4, sy, 2, 5);
      rect(sx, sy - 1, 2, 6);
      rect(sx + 3, sy + 1, 2, 4);
    }
  }

  // ─── SUN GLINTS ───
  for (let g of w.glints) {
    let sx = floor(w2sX(g.x)), sy = floor(w2sY(g.y));
    let a = min(200, g.timer * 5);
    fill(255, 250, 220, a);
    rect(sx - 1, sy - 3, 2, 6);
    rect(sx - 3, sy - 1, 6, 2);
    fill(255, 255, 240, a * 0.5);
    rect(sx, sy - 1, 1, 2);
  }

  // ─── PALM TREES ───
  for (let palm of w.palms) {
    if (palm.chopped) continue;
    let sx = floor(w2sX(palm.x)), sy = floor(w2sY(palm.y));
    let sz = palm.size;
    let sway = sin(frameCount * 0.015 + palm.swayPhase) * 3 * sz;

    // Trunk — brown with segments
    fill(110, 75, 40);
    rect(floor(sx - 2 * sz), floor(sy - 20 * sz), floor(4 * sz), floor(22 * sz));
    // Trunk highlights
    fill(130, 90, 50, 80);
    for (let seg = 0; seg < 4; seg++) {
      rect(floor(sx - 2 * sz), floor(sy - 20 * sz + seg * 5 * sz), floor(4 * sz), floor(1));
    }

    // Fronds — 4 leaf fans, swaying
    let topX = floor(sx + sway), topY = floor(sy - 22 * sz);
    fill(60, 120, 40);
    // Left fronds
    rect(topX - floor(12 * sz), topY - floor(2 * sz), floor(12 * sz), floor(3 * sz));
    rect(topX - floor(10 * sz), topY - floor(5 * sz), floor(8 * sz), floor(2 * sz));
    // Right fronds
    rect(topX, topY - floor(2 * sz), floor(12 * sz), floor(3 * sz));
    rect(topX + floor(2 * sz), topY - floor(5 * sz), floor(8 * sz), floor(2 * sz));
    // Center tuft
    fill(70, 135, 50);
    rect(topX - floor(3 * sz), topY - floor(6 * sz), floor(6 * sz), floor(4 * sz));
    // Drooping tips
    fill(50, 105, 35);
    rect(topX - floor(14 * sz), topY + floor(1 * sz), floor(4 * sz), floor(1));
    rect(topX + floor(10 * sz), topY + floor(1 * sz), floor(4 * sz), floor(1));

    // Coconuts on tree
    fill(120, 85, 40);
    rect(topX - floor(2 * sz), topY + floor(1 * sz), floor(3 * sz), floor(3 * sz));
    rect(topX + floor(1 * sz), topY + floor(2 * sz), floor(3 * sz), floor(3 * sz));

    // Shadow at base
    fill(0, 0, 0, 20);
    rect(floor(sx - 6 * sz), floor(sy + 1), floor(12 * sz), floor(2));
  }

  // ─── SCAVENGE NODES ───
  let nodes = w.scavNodes;
  for (let n of nodes) {
    if (n.collected) continue;
    let sx = floor(w2sX(n.x)), sy = floor(w2sY(n.y));
    let bob = sin(frameCount * 0.04 + n.x * 0.1) * 1;

    // Glow when near player
    let pDist = dist(state.player.x, state.player.y, n.x, n.y);
    if (pDist < 40) {
      fill(255, 220, 100, 30);
      rect(sx - 8, sy - 2 + bob, 16, 3);
      rect(sx - 1, sy - 8 + bob, 3, 12);
    }

    if (n.type === 'stick') {
      fill(100, 70, 35);
      rect(sx - 6, sy + bob, 12, 2);
      fill(85, 60, 30);
      rect(sx - 4, sy + 1 + bob, 8, 1);
    } else if (n.type === 'stone') {
      fill(130, 125, 115);
      rect(sx - 4, sy + bob, 8, 5);
      fill(110, 105, 95);
      rect(sx - 3, sy + 1 + bob, 6, 3);
    } else if (n.type === 'rope') {
      fill(145, 120, 70);
      rect(sx - 3, sy + bob, 6, 6);
      fill(130, 105, 60);
      rect(sx - 2, sy + 1 + bob, 4, 4);
    } else if (n.type === 'plank') {
      fill(90, 60, 25);
      rect(sx - 10, sy + bob, 20, 3);
      fill(75, 50, 20);
      rect(sx - 8, sy + 1 + bob, 16, 1);
    } else if (n.type === 'flint') {
      fill(80, 75, 70);
      rect(sx - 3, sy + bob, 5, 5);
      fill(120, 115, 105, 100);
      rect(sx - 2, sy + bob, 2, 2);
    } else if (n.type === 'cloth') {
      fill(190, 175, 150);
      rect(sx - 5, sy + bob, 10, 4);
      fill(160, 45, 30, 100);
      rect(sx - 3, sy + 1 + bob, 6, 2);
    } else if (n.type === 'coconut') {
      fill(120, 85, 40);
      rect(sx - 3, sy + bob, 6, 5);
      fill(100, 70, 30);
      rect(sx - 2, sy + 1 + bob, 4, 3);
      // Three dots
      fill(60, 40, 20);
      rect(sx - 1, sy + 2 + bob, 1, 1);
      rect(sx + 1, sy + 1 + bob, 1, 1);
    }

    // Label when very close — outlined for readability
    if (pDist < 30) {
      textSize(11); textAlign(CENTER, BOTTOM);
      let lbl = n.type === 'coconut' ? 'COCONUT' : n.type.toUpperCase();
      fill(0, 0, 0, 180);
      text(lbl, sx + 1, sy - 5 + bob);
      fill(240, 230, 200);
      text(lbl, sx, sy - 6 + bob);
    }
  }

  // ─── CRABS ───
  for (let c of w.crabs) {
    let sx = floor(w2sX(c.x)), sy = floor(w2sY(c.y));
    let f = c.facing;
    let scuttle = c.state !== 'idle' ? sin(frameCount * 0.3) * 1 : 0;

    // Body — warm terracotta
    fill(195, 95, 55);
    rect(sx - 4, sy - 2 + scuttle, 8, 5);
    // Shell highlight
    fill(220, 120, 70);
    rect(sx - 3, sy - 2 + scuttle, 6, 2);
    // Eyes
    fill(20, 20, 20);
    rect(sx - 3, sy - 3 + scuttle, 1, 1);
    rect(sx + 2, sy - 3 + scuttle, 1, 1);
    // Eye stalks
    fill(195, 95, 55);
    rect(sx - 3, sy - 4 + scuttle, 1, 2);
    rect(sx + 2, sy - 4 + scuttle, 1, 2);
    // Claws
    fill(210, 105, 60);
    rect(sx - 6 * f, sy - 1 + scuttle, 3, 3);
    rect(sx + 4 * f, sy - 1 + scuttle, 3, 3);
    // Claw pincers
    fill(180, 85, 50);
    rect(sx - 7 * f, sy - 1 + scuttle, 1, 2);
    rect(sx + 6 * f, sy - 1 + scuttle, 1, 2);
    // Legs — 3 per side
    fill(170, 80, 45);
    for (let i = 0; i < 3; i++) {
      let legOff = sin(frameCount * 0.2 + i) * (c.state !== 'idle' ? 1 : 0);
      rect(sx - 5 - floor(legOff), sy + i * 1 + scuttle, 1, 1);
      rect(sx + 4 + floor(legOff), sy + i * 1 + scuttle, 1, 1);
    }

    // "Catch" hint when close — outlined
    let pdist = dist(state.player.x, state.player.y, c.x, c.y);
    if (pdist < 30) {
      textSize(11); textAlign(CENTER, BOTTOM);
      fill(0, 0, 0, 180);
      text('E: CATCH', sx + 1, sy - 7);
      fill(240, 230, 200);
      text('E: CATCH', sx, sy - 8);
    }
  }

  // ─── STRAY CAT ───
  drawWreckCat();

  // ─── FLYING BIRDS ───
  for (let b of w.birds) {
    let sx = floor(w2sX(b.x)), sy = floor(w2sY(b.y));
    let wingUp = sin(frameCount * 0.08 + b.phase) > 0;
    fill(60, 55, 50, 120);
    // Simple bird silhouette — V shape
    if (wingUp) {
      rect(sx - 4, sy - 1, 3, 1);
      rect(sx - 2, sy - 2, 2, 1);
      rect(sx + 1, sy - 2, 2, 1);
      rect(sx + 2, sy - 1, 3, 1);
    } else {
      rect(sx - 4, sy + 1, 3, 1);
      rect(sx - 2, sy, 2, 1);
      rect(sx + 1, sy, 2, 1);
      rect(sx + 2, sy + 1, 3, 1);
    }
  }

  textAlign(LEFT, TOP);
}

function drawWreckHUD() {
  noStroke();
  let hx = 12, hy = 12;
  let w = state.wreck;
  let panelH = 95;

  // Dark semi-transparent background panel
  fill(10, 8, 5, 220);
  rect(hx - 6, hy - 6, 210, panelH, 4);
  // Subtle gold border
  stroke(150, 120, 50, 120);
  strokeWeight(1);
  noFill();
  rect(hx - 6, hy - 6, 210, panelH, 4);
  noStroke();

  // Helper: outlined text for readability
  let outText = function(txt, x, y, col) {
    fill(0, 0, 0, 180);
    text(txt, x + 1, y + 1);
    fill(col || color(240, 230, 200));
    text(txt, x, y);
  };

  textAlign(LEFT, TOP);

  // Resource header
  textSize(11);
  outText('RAFT MATERIALS', hx, hy, color(220, 200, 140));

  // Wood X/8
  textSize(11);
  let woodCol = w.raftWood >= 8 ? color(100, 255, 150) : color(200, 170, 100);
  outText('Wood ' + (state.wood + w.raftWood) + '  (' + w.raftWood + '/8)', hx, hy + 15, woodCol);

  // Rope X/4
  let ropeCol = w.raftRope >= 4 ? color(100, 255, 150) : color(180, 150, 90);
  outText('Rope ' + (state.wood > 0 ? '+' + state.wood : '') + '  (' + w.raftRope + '/4)', hx, hy + 29, ropeCol);

  // Cloth X/2
  let clothCol = w.raftCloth >= 2 ? color(100, 255, 150) : color(200, 180, 150);
  outText('Cloth ' + (state.seeds > 0 ? '+' + state.seeds : '') + '  (' + w.raftCloth + '/2)', hx, hy + 43, clothCol);

  // Raft progress bar
  let barX = hx, barY = hy + 58, barW = 140, barH = 8;
  let prog = w.raftBuilt ? 100 : w.raftProgress;
  fill(20, 18, 12, 200);
  rect(barX, barY, barW, barH, 2);
  if (prog > 0) {
    fill(w.raftBuilt ? color(80, 220, 120) : color(180, 150, 60));
    rect(barX + 1, barY + 1, floor((barW - 2) * prog / 100), barH - 2, 1);
  }
  textSize(11);
  outText(w.raftBuilt ? 'RAFT READY!' : 'Raft: ' + prog + '%', barX + barW + 6, barY - 1,
    w.raftBuilt ? color(100, 255, 150) : color(200, 190, 150));

  // Day/time + food
  textSize(11);
  let hrs = floor(state.time / 60), mins = floor(state.time % 60);
  outText('Day ' + state.day + '  ' + nf(hrs, 2) + ':' + nf(mins, 2), hx, hy + 72, color(180, 170, 140));
  outText('Food: ' + state.fish, hx + 100, hy + 72, color(100, 180, 255));

  // Hint text at bottom of panel
  textSize(11);
  let hintAlpha = 140 + sin(frameCount * 0.03) * 40;
  if (w.raftBuilt) {
    fill(0, 0, 0, 150); text('Go to the raft and press E to set sail!', hx + 1, hy + panelH + 3);
    fill(100, 255, 150, hintAlpha); text('Go to the raft and press E to set sail!', hx, hy + panelH + 2);
  } else {
    fill(0, 0, 0, 150); text('Explore the beach and shallows for materials', hx + 1, hy + panelH + 3);
    fill(200, 190, 150, hintAlpha); text('Explore the beach and shallows for materials', hx, hy + panelH + 2);
  }
}

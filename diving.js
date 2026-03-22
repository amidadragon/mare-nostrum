// === MARE NOSTRUM — DIVING SYSTEM (In-World) ==============================
// Diving happens in the SAME world space as the island. When you dive,
// underwater entities spawn in the shallow water zone around the island.
// The camera stays the same, player moves with WASD, blue tint overlay.
// Surface by pressing D again or swimming back onto land.

const DIVE_TREASURES = [
  // Shallow tier (rim 1.0-1.2)
  { type: 'sponge', name: 'Sea Sponge', value: 5, rarity: 0.45, col: [200, 180, 100], depthTier: 0 },
  { type: 'shell_fragment', name: 'Shell Fragment', value: 3, rarity: 0.50, col: [230, 215, 190], depthTier: 0 },
  { type: 'sea_glass', name: 'Sea Glass', value: 6, rarity: 0.40, col: [140, 220, 200], depthTier: 0 },
  // Mid tier (rim 1.2-1.4)
  { type: 'pearl', name: 'Pearl', value: 15, rarity: 0.35, col: [240, 235, 255], depthTier: 1 },
  { type: 'coral_piece', name: 'Coral', value: 8, rarity: 0.35, col: [255, 100, 80], depthTier: 1 },
  { type: 'gold_coin', name: 'Roman Coin', value: 25, rarity: 0.12, col: [220, 190, 60], depthTier: 1 },
  { type: 'bronze_idol', name: 'Bronze Idol', value: 30, rarity: 0.10, col: [170, 130, 60], depthTier: 1 },
  // Deep tier (rim 1.4-1.8)
  { type: 'amphora', name: 'Amphora', value: 40, rarity: 0.08, col: [180, 120, 60], depthTier: 2 },
  { type: 'triton_horn', name: "Triton's Horn", value: 55, rarity: 0.05, col: [180, 200, 140], depthTier: 2 },
  { type: 'black_pearl', name: 'Black Pearl', value: 60, rarity: 0.04, col: [40, 35, 50], depthTier: 2 },
  { type: 'ancient_helm', name: "Neptune's Helm", value: 100, rarity: 0.015, col: [100, 200, 180], depthTier: 2 },
  { type: 'sunken_crown', name: 'Sunken Crown', value: 120, rarity: 0.01, col: [220, 200, 80], depthTier: 2 },
];

// Pixel-art fish sprite definitions (each row is a horizontal line of [r,g,b] blocks)
// Fish are drawn at 2x2 pixel blocks to match the game's P=2 grid
const FISH_SPRITES = {
  roman_bass: {
    w: 8, h: 5,
    frames: [
      // frame 0 — tail up
      [
        [0,0,0,0, 0,0,0,0, 90,120,180,255, 90,120,180,255, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
        [60,100,160,255, 60,100,160,255, 80,130,200,255, 80,130,200,255, 80,130,200,255, 80,130,200,255, 0,0,0,0, 0,0,0,0],
        [60,100,160,255, 80,130,200,255, 100,150,220,255, 100,150,220,255, 100,150,220,255, 80,130,200,255, 60,90,140,255, 0,0,0,0],
        [0,0,0,0, 80,130,200,255, 100,150,220,255, 120,170,230,255, 100,150,220,255, 80,130,200,255, 255,255,255,255, 0,0,0,0],
        [0,0,0,0, 0,0,0,0, 80,130,200,255, 80,130,200,255, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
      ],
      // frame 1 — tail down
      [
        [0,0,0,0, 0,0,0,0, 80,130,200,255, 80,130,200,255, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
        [0,0,0,0, 80,130,200,255, 100,150,220,255, 100,150,220,255, 100,150,220,255, 80,130,200,255, 255,255,255,255, 0,0,0,0],
        [60,100,160,255, 80,130,200,255, 100,150,220,255, 120,170,230,255, 100,150,220,255, 80,130,200,255, 60,90,140,255, 0,0,0,0],
        [60,100,160,255, 60,100,160,255, 80,130,200,255, 80,130,200,255, 80,130,200,255, 80,130,200,255, 0,0,0,0, 0,0,0,0],
        [0,0,0,0, 0,0,0,0, 0,0,0,0, 90,120,180,255, 90,120,180,255, 0,0,0,0, 0,0,0,0, 0,0,0,0],
      ],
    ],
  },
  golden_wrasse: {
    w: 7, h: 4,
    tint: [200, 160, 40],
  },
  coral_damsel: {
    w: 6, h: 4,
    tint: [200, 100, 60],
  },
  emerald_goby: {
    w: 6, h: 3,
    tint: [80, 170, 90],
  },
};

// Transition state
let _diveTransition = { active: false, timer: 0, maxTime: 30, entering: true };
// Ambient particles (light rays, bubbles, current drift)
let _diveAmbient = { rays: [], ventBubbles: [], currentParticles: [] };

function initDiveWorld() {
  let d = state.diving;
  if (d.treasures.length > 0) return;

  let cx = WORLD.islandCX, cy = WORLD.islandCY;
  let srx = state.islandRX, sry = state.islandRY;

  // Scatter treasures with depth-based tiers
  for (let i = 0; i < 28; i++) {
    let angle = random(TWO_PI);
    let rim = random(1.05, 1.8);
    let tx = cx + cos(angle) * srx * rim;
    let ty = cy + sin(angle) * sry * 0.45 * rim;

    // Determine depth tier from distance
    let depthTier = rim < 1.2 ? 0 : rim < 1.4 ? 1 : 2;
    let tierTreasures = DIVE_TREASURES.filter(t => t.depthTier === depthTier);
    if (tierTreasures.length === 0) tierTreasures = DIVE_TREASURES;

    let roll = random(), cumulative = 0;
    let tType = tierTreasures[0];
    for (let t of tierTreasures) {
      cumulative += t.rarity;
      if (roll < cumulative) { tType = t; break; }
    }
    d.treasures.push({
      x: tx, y: ty,
      type: tType.type, name: tType.name, value: tType.value,
      col: tType.col, collected: false, sparkle: random(TWO_PI),
      respawnTimer: 0, depthTier: depthTier,
    });
  }

  // Scatter sea creatures — fish use distinct sprite types, schools group together
  let fishTypes = ['roman_bass', 'golden_wrasse', 'coral_damsel', 'emerald_goby'];
  let schoolCenters = [];
  // Create 4-5 school centers
  for (let s = 0; s < 5; s++) {
    let angle = random(TWO_PI);
    let rim = random(1.1, 1.6);
    schoolCenters.push({
      x: cx + cos(angle) * srx * rim,
      y: cy + sin(angle) * sry * 0.45 * rim,
      fishType: fishTypes[s % fishTypes.length],
      id: s,
    });
  }

  for (let i = 0; i < 30; i++) {
    let isSchool = i < 20;
    let school = isSchool ? schoolCenters[floor(random(schoolCenters.length))] : null;
    let angle, rim, cx2, cy2, type, fishSprite;

    if (isSchool) {
      cx2 = school.x + random(-40, 40);
      cy2 = school.y + random(-20, 20);
      type = 'fish';
      fishSprite = school.fishType;
    } else {
      angle = random(TWO_PI);
      rim = random(1.0, 1.8);
      cx2 = cx + cos(angle) * srx * rim;
      cy2 = cy + sin(angle) * sry * 0.45 * rim;
      let types = ['fish','jellyfish','turtle','octopus','seahorse','dolphin'];
      type = types[floor(random(types.length))];
      fishSprite = type === 'fish' ? fishTypes[floor(random(fishTypes.length))] : null;
    }

    let colors = {
      fish: [[60,140,200],[200,160,40],[120,200,120],[200,100,60],[180,80,140]],
      jellyfish: [[180,120,255],[255,150,200],[120,200,255]],
      turtle: [[80,140,60]],
      octopus: [[180,60,80],[100,60,140],[140,80,160]],
      seahorse: [[255,180,60],[200,100,150]],
      dolphin: [[100,130,170],[120,145,180]],
    };
    let col = colors[type][floor(random(colors[type].length))];
    let spd = { fish: 0.8, jellyfish: 0.2, turtle: 0.4, octopus: 0.3, seahorse: 0.15, dolphin: 1.0 }[type];
    d.creatures.push({
      x: cx2, y: cy2,
      vx: (random() > 0.5 ? 1 : -1) * spd * random(0.5, 1.2),
      vy: random(-0.1, 0.1),
      type, col, frame: random(TWO_PI),
      homeX: cx2, homeY: cy2,
      fishSprite: fishSprite,
      schoolId: isSchool ? school.id : -1,
    });
  }

  // Rare glowing deep-sea fish (1-2 max)
  for (let i = 0; i < 2; i++) {
    let angle = random(TWO_PI);
    let rim = random(1.4, 1.8);
    let gx = cx + cos(angle) * srx * rim;
    let gy = cy + sin(angle) * sry * 0.45 * rim;
    d.creatures.push({
      x: gx, y: gy,
      vx: random(-0.2, 0.2), vy: random(-0.05, 0.05),
      type: 'glowfish', col: [40, 255, 200], frame: random(TWO_PI),
      homeX: gx, homeY: gy, fishSprite: null, schoolId: -1,
    });
  }

  // Seabed decorations — expanded with terrain features
  let decoTypes = [
    'sand','sand','rock','coral','seagrass','seagrass','shell',
    'barnacle_rock','ruin_column','ruin_arch','sunken_amphora',
    'shipwreck_plank','treasure_chest','vent',
  ];
  for (let i = 0; i < 70; i++) {
    let angle = random(TWO_PI);
    let rim = random(1.0, 1.7);
    let sx = cx + cos(angle) * srx * rim;
    let sy = cy + sin(angle) * sry * 0.45 * rim;
    // Rare types only spawn a few
    let typeIdx = floor(random(decoTypes.length));
    let dtype = decoTypes[typeIdx];
    // Limit rare terrain features
    if (dtype === 'ruin_column' && i > 55) dtype = 'rock';
    if (dtype === 'ruin_arch' && i > 58) dtype = 'rock';
    if (dtype === 'sunken_amphora' && i > 60) dtype = 'coral';
    if (dtype === 'shipwreck_plank' && i > 62) dtype = 'sand';
    if (dtype === 'treasure_chest' && i > 64) dtype = 'shell';
    if (dtype === 'vent' && i > 66) dtype = 'sand';
    d.seabed.push({
      x: sx, y: sy,
      type: dtype,
      size: random(6, 18), sway: random(TWO_PI),
      variant: floor(random(3)),
    });
  }

  // Init ambient light rays — more for richer atmosphere
  _diveAmbient.rays = [];
  for (let i = 0; i < 10; i++) {
    _diveAmbient.rays.push({
      x: random(width), speed: random(0.1, 0.45),
      w: random(6, 24), alpha: random(0.02, 0.09),
      phase: random(TWO_PI),
    });
  }

  // Init seabed vent bubble sources
  _diveAmbient.ventBubbles = [];
  _diveAmbient.currentParticles = [];
}

function startDive() {
  let d = state.diving;
  if (d.active) { exitDive(); return; }
  let isOpenWater = state.rowing && state.rowing.active;
  let inShallow = typeof isInShallows === 'function' && isInShallows(state.player.x, state.player.y);
  let nearWater = !isOnIsland(state.player.x, state.player.y);
  if (!isOpenWater && !inShallow && !nearWater) {
    addFloatingText(width / 2, height * 0.4, 'Walk to the water to dive!', '#aaaaaa');
    return;
  }
  d.active = true;
  d.openWater = !!isOpenWater;
  d.breath = d.maxBreath + d.lungCapacity * 25;
  d.totalDives++;
  if (isOpenWater) {
    d.openWaterCX = state.rowing.x;
    d.openWaterCY = state.rowing.y;
    state.rowing.active = false;
    state.player.x = d.openWaterCX;
    state.player.y = d.openWaterCY;
    initOpenWaterDive();
  } else {
    initDiveWorld();
  }

  // Splash transition
  _diveTransition = { active: true, timer: 0, maxTime: 25, entering: true };
  // Spawn splash particles at player position
  let px = state.player.x, py = state.player.y;
  for (let i = 0; i < 12; i++) {
    particles.push({
      x: px + random(-10, 10), y: py + random(-5, 5),
      vx: random(-1.5, 1.5), vy: random(-2, 0.5),
      life: 20 + random(10), maxLife: 30, type: 'bubble',
      r: 180, g: 230, b: 255, size: random(2, 6), world: true,
    });
  }

  addFloatingText(width / 2, height * 0.25, 'DIVING', '#66ccff');
  if (typeof unlockJournal === 'function') unlockJournal('first_dive');
  if (typeof snd !== 'undefined' && snd) snd.playSFX('water');
}

function exitDive() {
  let d = state.diving;
  if (!d.active) return;
  let wasOpenWater = d.openWater;
  d.active = false;
  d.openWater = false;
  if (wasOpenWater) {
    state.rowing.active = true;
    state.rowing.x = state.player.x;
    state.rowing.y = state.player.y;
    d.treasures = []; d.creatures = []; d.seabed = [];
  }

  // Surface transition
  _diveTransition = { active: true, timer: 0, maxTime: 20, entering: false };

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
      case 'shell_fragment': state.gold += t.value; break;
      case 'sea_glass': state.gold += t.value; break;
      case 'bronze_idol': state.gold += t.value; break;
      case 'triton_horn': state.gold += t.value;
        if (typeof unlockJournal === 'function') unlockJournal('tritons_horn'); break;
      case 'black_pearl': d.pearls++; state.gold += t.value; break;
      case 'sunken_crown': state.gold += t.value;
        if (typeof unlockJournal === 'function') unlockJournal('sunken_crown'); break;
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

  // Update transition even when not actively diving
  if (_diveTransition.active) {
    _diveTransition.timer += dt;
    if (_diveTransition.timer >= _diveTransition.maxTime) {
      _diveTransition.active = false;
    }
  }

  if (!d.active) return;

  // Oxygen management — deeper = faster drain
  let depthMult, _playerRim;
  if (d.openWater) {
    let _odx = state.player.x - d.openWaterCX, _ody = state.player.y - d.openWaterCY;
    _playerRim = sqrt(_odx * _odx + _ody * _ody) / 150;
    depthMult = _playerRim < 0.5 ? 1.0 : _playerRim < 1.0 ? 1.3 : 1.8;
    d.depth = _playerRim < 0.5 ? 0 : _playerRim < 1.0 ? 1 : 2;
  } else {
    let _dcx = state.player.x - WORLD.islandCX, _dcy = state.player.y - WORLD.islandCY;
    _playerRim = sqrt((_dcx / state.islandRX) * (_dcx / state.islandRX) + (_dcy / (state.islandRY * 0.45)) * (_dcy / (state.islandRY * 0.45)));
    depthMult = _playerRim < 1.2 ? 1.0 : _playerRim < 1.4 ? 1.5 : 2.2;
    d.depth = _playerRim < 1.2 ? 0 : _playerRim < 1.4 ? 1 : 2;
  }
  d.breath -= 0.08 * depthMult * dt;
  // Warn when breath is low
  if (d.breath < 40 && d.breath > 38 && depthMult > 1.0) {
    addFloatingText(width / 2, height * 0.35, 'Breath draining fast! Surface!', '#ff8855');
  }
  if (d.breath <= 0) {
    d.breath = 0;
    exitDive();
    state.player.hp = Math.max(0, state.player.hp - 15);
    addFloatingText(width / 2, height * 0.25, 'Out of breath! -15 HP', '#ff6644');
    return;
  }

  // Auto-exit when back on island (skip for open water dives)
  if (!d.openWater && isOnIsland(state.player.x, state.player.y)) {
    exitDive();
    return;
  }

  let px = state.player.x, py = state.player.y;

  // Collect nearby treasures
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
      if (t.respawnTimer > 3600) {
        t.collected = false;
        t.respawnTimer = 0;
      }
    }
  }

  // Update creatures — school fish steer toward neighbors
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

    // School cohesion — fish with same schoolId steer toward school center
    if (c.schoolId >= 0 && random() < 0.02) {
      let sx = 0, sy = 0, cnt = 0;
      for (let o of d.creatures) {
        if (o.schoolId === c.schoolId && o !== c) {
          sx += o.x; sy += o.y; cnt++;
        }
      }
      if (cnt > 0) {
        sx /= cnt; sy /= cnt;
        let sdx = sx - c.x, sdy = sy - c.y;
        let sd = sqrt(sdx * sdx + sdy * sdy);
        if (sd > 20 && sd < 200) {
          c.vx += (sdx / sd) * 0.08;
          c.vy += (sdy / sd) * 0.04;
        }
      }
    }

    if (random() < 0.005) {
      c.vx += random(-0.3, 0.3);
      c.vy += random(-0.1, 0.1);
    }
    let spd = sqrt(c.vx * c.vx + c.vy * c.vy);
    let maxSpd = c.type === 'glowfish' ? 0.4 : 1.2;
    if (spd > maxSpd) { c.vx *= maxSpd / spd; c.vy *= maxSpd / spd; }

    // Flee from player (glowfish flee further)
    let fleeRange = c.type === 'glowfish' ? 80 : 50;
    let cdx = c.x - px, cdy = c.y - py;
    let cd = sqrt(cdx * cdx + cdy * cdy);
    if (cd < fleeRange && cd > 0) {
      c.vx += (cdx / cd) * 0.15;
      c.vy += (cdy / cd) * 0.05;
    }
  }

  // Sea enemies
  if (!d.seaEnemies) d.seaEnemies = [];
  if (d.seaEnemies.length === 0 && d.totalDives > 0) {
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
  for (let e of d.seaEnemies) {
    if (e.hp <= 0) continue;
    if (e.flashTimer > 0) e.flashTimer -= dt;
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
    if (ed < 20 && e.attackTimer <= 0) {
      state.player.hp = Math.max(0, state.player.hp - e.dmg);
      e.attackTimer = 60;
      addFloatingText(w2sX(px), w2sY(py) - 20, '-' + e.dmg + ' HP', '#ff4444');
      if (typeof snd !== 'undefined' && snd) snd.playSFX('player_hurt');
      if (state.player.hp <= 0) { exitDive(); addFloatingText(width / 2, height * 0.25, 'Dragged to surface!', '#ff6644'); }
    }
    if (e.hp > 0 && state.player.slashPhase > 0 && ed < state.player.attackRange + e.size && e.flashTimer <= 0) {
      e.hp -= state.player.attackDamage;
      e.flashTimer = 8;
      addFloatingText(w2sX(e.x), w2sY(e.y) - 10, '-' + state.player.attackDamage, '#ffcc44');
      if (ed > 0) { e.vx += (e.x - px) / ed * 3; e.vy += (e.y - py) / ed * 3; }
      if (e.hp <= 0) {
        let loot = e.type === 'shark' ? 'rareHide' : e.type === 'crab_giant' ? 'ironOre' : 'fish';
        let amt = e.type === 'shark' ? 2 : 1;
        state[loot] = (state[loot] || 0) + amt;
        addFloatingText(w2sX(e.x), w2sY(e.y) - 20, '+' + amt + ' ' + loot, '#88ddff');
        if (typeof snd !== 'undefined' && snd) snd.playSFX('fish_catch');
        if (typeof grantXP === 'function') grantXP(15);
      }
    }
  }
  for (let e of d.seaEnemies) {
    if (e.hp <= 0 && !e._deathTimer) e._deathTimer = 15;
    if (e._deathTimer > 0) e._deathTimer -= dt;
  }
  d.seaEnemies = d.seaEnemies.filter(e => e.hp > 0 || (e._deathTimer && e._deathTimer > 0));

  // Player breath bubbles — more at depth (breathing harder)
  let breathInterval = d.depth === 0 ? 25 : d.depth === 1 ? 18 : 10;
  if (frameCount % breathInterval === 0) {
    let bubbleCount = d.depth === 2 ? 3 : d.depth === 1 ? 2 : 1;
    for (let b = 0; b < bubbleCount; b++) {
      particles.push({
        x: px + random(-6, 6), y: py - 5,
        vx: random(-0.15, 0.15), vy: -random(0.3, 1.0),
        life: 45, maxLife: 45, type: 'bubble',
        r: 180, g: 220, b: 255, size: random(2, 5 + d.depth), world: true,
      });
    }
  }
  // Ambient rising bubbles from seabed
  if (frameCount % 20 === 0 && random() < 0.4) {
    let bx = px + random(-120, 120);
    let by = py + random(40, 80);
    particles.push({
      x: bx, y: by,
      vx: random(-0.05, 0.05), vy: -random(0.2, 0.5),
      life: 60, maxLife: 60, type: 'bubble',
      r: 160, g: 200, b: 240, size: random(1, 3), world: true,
    });
  }

  // Seabed vent bubbles — from vent decorations
  if (frameCount % 15 === 0) {
    for (let s of d.seabed) {
      if (s.type === 'vent' && random() < 0.3) {
        particles.push({
          x: s.x + random(-3, 3), y: s.y,
          vx: random(-0.05, 0.05), vy: -random(0.4, 1.0),
          life: 50, maxLife: 50, type: 'bubble',
          r: 160, g: 210, b: 240, size: random(2, 4), world: true,
        });
      }
    }
  }

  // Underwater current drift particles
  if (frameCount % 8 === 0 && _diveAmbient.currentParticles.length < 15) {
    _diveAmbient.currentParticles.push({
      x: random(width), y: random(height),
      vx: 0.3 + random(0.2), vy: random(-0.1, 0.1),
      life: 80 + random(40), size: random(1, 3),
    });
  }
  for (let i = _diveAmbient.currentParticles.length - 1; i >= 0; i--) {
    let p = _diveAmbient.currentParticles[i];
    p.x += p.vx; p.y += p.vy; p.life--;
    if (p.life <= 0 || p.x > width + 10) {
      _diveAmbient.currentParticles.splice(i, 1);
    }
  }
}

// --- DRAWING ---

function _diveBlueShift(r, g, b, depth) {
  return [
    floor(lerp(r, 12, depth * 0.35)),
    floor(lerp(g, 35, depth * 0.25)),
    floor(lerp(b, 75, depth * 0.15)),
  ];
}

function drawDivingOverlay() {
  let d = state.diving;
  if (!d.active) return;
  let bright = typeof getSkyBrightness === 'function' ? getSkyBrightness() : 0.5;

  noStroke();

  // --- Depth fog: darker blue further from surface, murkier at deep depth ---
  let playerDepth = d.depth || 0; // 0=shallow, 1=mid, 2=deep
  let murkMult = playerDepth === 0 ? 1.0 : playerDepth === 1 ? 1.3 : 1.8;
  for (let band = 0; band < 10; band++) {
    let by = band * height / 10;
    let bh = height / 10 + 1;
    let depthFrac = band / 9;
    let fogR = floor(lerp(15, 3, depthFrac));
    let fogG = floor(lerp(50, 15, depthFrac));
    let fogB = floor(lerp(90, 40, depthFrac));
    let fogA = floor(lerp(60, 140, depthFrac) * bright * murkMult);
    fill(fogR, fogG, fogB, min(220, fogA));
    rect(0, floor(by), width, floor(bh));
  }
  // Extra murk overlay at deep depth
  if (playerDepth >= 2) {
    fill(5, 12, 30, floor(40 * bright));
    rect(0, 0, width, height);
  }

  // --- Sandy seabed terrain ---
  let seabedTop = floor(height * 0.58);
  // Undulating sand floor (pixel-art dunes)
  for (let sx = 0; sx < width; sx += 2) {
    let worldX = sx + floor(state.player.x * 0.3);
    let duneH = floor(sin(worldX * 0.02) * 6 + sin(worldX * 0.05 + 1.3) * 3 + 10);
    let sandY = height - duneH;
    // Sand base
    fill(140, 120, 75, 80);
    rect(sx, floor(sandY), 2, duneH);
    // Lighter sand highlight
    if ((worldX + floor(state.player.y * 0.1)) % 8 < 2) {
      fill(170, 150, 100, 50);
      rect(sx, floor(sandY), 2, 2);
    }
    // Dark sand shadow in dune troughs
    if (duneH < 8) {
      fill(80, 65, 40, 40);
      rect(sx, floor(sandY), 2, 2);
    }
  }

  // Sand grain texture — pixel dots
  fill(160, 140, 95, 30);
  for (let i = 0; i < 40; i++) {
    let gx = (i * 47 + floor(state.player.x * 0.3)) % width;
    let gy = height - 4 - (i * 31) % 18;
    rect(floor(gx), floor(gy), 2, 2);
  }

  // --- Distant reef silhouettes (pixel-art, no rounded corners) ---
  for (let i = 0; i < 10; i++) {
    let rx = (i * 137 + floor(state.player.x * 0.15)) % (width + 80) - 40;
    let rh = 12 + (i * 7) % 18;
    // Reef body
    fill(60, 35, 45, 35);
    rect(floor(rx), floor(height - rh - 8), floor(16 + (i % 4) * 6), floor(rh));
    // Reef top — jagged pixel blocks
    fill(70, 40, 55, 30);
    rect(floor(rx + 2), floor(height - rh - 12), 4, 4);
    rect(floor(rx + 8), floor(height - rh - 10), 6, 4);
    // Coral tuft on top
    fill(45, 85, 40, 30);
    rect(floor(rx + 4), floor(height - rh - 14), 4, 4);
  }

  // --- Light rays from surface — stronger in shallow, faint in deep ---
  let rayBrightMult = playerDepth === 0 ? 1.4 : playerDepth === 1 ? 1.0 : 0.4;
  for (let ray of _diveAmbient.rays) {
    let rx = (ray.x + frameCount * ray.speed) % (width + 60) - 30;
    let rw = floor(ray.w);
    let rAlpha = floor(ray.alpha * 255 * bright * rayBrightMult);
    // Ray is a series of diagonal 2px rects descending from top
    fill(120, 200, 255, rAlpha);
    for (let ry = 0; ry < height; ry += 4) {
      let xOff = floor(ry * 0.3 + sin(ray.phase + ry * 0.01) * 4);
      let fade = 1.0 - (ry / height) * 0.7;
      fill(120, 200, 255, floor(rAlpha * fade));
      rect(floor(rx + xOff), ry, rw, 4);
    }
  }
  // Extra volumetric light shafts in shallow water
  if (playerDepth === 0) {
    for (let i = 0; i < 3; i++) {
      let shaftX = (i * 200 + floor(frameCount * 0.2)) % (width + 40) - 20;
      let shaftW = 6 + floor(sin(frameCount * 0.02 + i * 2) * 3);
      for (let sy = 0; sy < height * 0.6; sy += 4) {
        let sa = floor((1.0 - sy / (height * 0.6)) * 12 * bright);
        fill(180, 230, 255, sa);
        rect(floor(shaftX + sy * 0.15), sy, shaftW, 4);
      }
    }
  }

  // --- Caustic light patterns (pixel diamond shapes) ---
  for (let i = 0; i < 10; i++) {
    let ccx = w2sX(state.player.x + sin(frameCount * 0.01 + i * 2.1) * 200 - 100);
    let ccy = w2sY(state.player.y + cos(frameCount * 0.013 + i * 1.7) * 150 - 75);
    let sz = floor(12 + sin(frameCount * 0.03 + i) * 6);
    let ca = floor(10 * bright);
    if (ca < 1) continue;
    fill(120, 200, 255, ca);
    // Diamond as 4 pixel rects instead of beginShape
    rect(floor(ccx - 1), floor(ccy - sz), 2, floor(sz));
    rect(floor(ccx - 1), floor(ccy), 2, floor(sz));
    rect(floor(ccx - sz * 0.6), floor(ccy - 1), floor(sz * 0.6), 2);
    rect(floor(ccx), floor(ccy - 1), floor(sz * 0.6), 2);
  }

  // --- Current drift particles ---
  fill(100, 180, 220, 20);
  for (let p of _diveAmbient.currentParticles) {
    let fade = p.life > 60 ? 1 : p.life / 60;
    fill(100, 180, 220, floor(20 * fade));
    rect(floor(p.x), floor(p.y), floor(p.size) * 2, 2);
  }

  // --- Seabed objects (pixel-art only, no ellipse) ---
  for (let s of d.seabed) {
    let sx = w2sX(s.x), sy = w2sY(s.y);
    if (sx < -30 || sx > width + 30 || sy < -30 || sy > height + 30) continue;
    let fx = floor(sx), fy = floor(sy), fs = floor(s.size);
    switch (s.type) {
      case 'coral': {
        let sway = floor(sin(frameCount * 0.03 + s.sway) * 2);
        // Coral branches — pixel rects
        let colors = [[255,70,70],[255,110,90],[255,140,60],[220,50,80]];
        for (let b = 0; b < 3; b++) {
          let cc = colors[(s.variant + b) % colors.length];
          fill(cc[0], cc[1], cc[2], 160);
          let bx = fx - 4 + b * 4 + sway;
          let bh = floor(fs * 0.5 + b * 2);
          rect(bx, fy - bh, 2, bh);
          // Coral tip — 2px block
          fill(cc[0] + 30, cc[1] + 20, cc[2], 180);
          rect(bx, fy - bh - 2, 4, 2);
        }
        break;
      }
      case 'seagrass': {
        let gsway = floor(sin(frameCount * 0.04 + s.sway) * 3);
        for (let bl = 0; bl < 4; bl++) {
          let gf = (bl % 2 === 0) ? 0.3 : 0.6;
          fill(35, 100 + bl * 8, 45, 140);
          rect(fx - 4 + bl * 3 + floor(gsway * gf), fy - fs, 2, fs);
          // Darker base
          fill(25, 80, 35, 100);
          rect(fx - 4 + bl * 3 + floor(gsway * gf), fy - 2, 2, 2);
        }
        break;
      }
      case 'shell':
        // Pixel shell — small rect cluster
        fill(210, 195, 170, 130);
        rect(fx - 2, fy - 1, 4, 2);
        fill(230, 215, 190, 100);
        rect(fx - 1, fy - 2, 2, 2);
        break;
      case 'rock':
        // Chunky pixel rock
        fill(55, 50, 42, 130);
        rect(fx - floor(fs / 2), fy - floor(fs / 3), fs, floor(fs * 0.5));
        // Highlight edge
        fill(75, 68, 58, 80);
        rect(fx - floor(fs / 2), fy - floor(fs / 3), fs, 2);
        // Shadow base
        fill(35, 30, 25, 60);
        rect(fx - floor(fs / 2) + 2, fy - floor(fs / 3) + floor(fs * 0.5) - 2, fs - 4, 2);
        break;
      case 'barnacle_rock': {
        // Rocky outcrop with barnacle dots
        let rw = fs + 4, rh = floor(fs * 0.6);
        fill(50, 48, 40, 140);
        rect(fx - floor(rw / 2), fy - rh, rw, rh);
        fill(65, 60, 50, 120);
        rect(fx - floor(rw / 2), fy - rh, rw, 2);
        // Barnacles — tiny light dots
        fill(180, 175, 160, 100);
        for (let bi = 0; bi < 4; bi++) {
          rect(fx - floor(rw / 2) + 2 + bi * floor(rw / 4), fy - floor(rh * 0.6), 2, 2);
        }
        break;
      }
      case 'ruin_column': {
        // Fallen Roman column segment
        let cw = 6, ch = floor(fs * 1.2);
        fill(160, 155, 140, 120);
        rect(fx - 3, fy - ch, cw, ch);
        // Fluting detail (vertical grooves)
        fill(130, 125, 110, 80);
        rect(fx - 1, fy - ch + 2, 2, ch - 4);
        // Capital fragment
        fill(175, 170, 155, 110);
        rect(fx - 5, fy - ch - 2, 10, 4);
        // Moss/algae on top
        fill(40, 90, 50, 60);
        rect(fx - 4, fy - ch - 2, 4, 2);
        break;
      }
      case 'ruin_arch': {
        // Sunken archway — two columns + lintel
        fill(150, 145, 130, 100);
        rect(fx - 10, fy - 14, 4, 14); // left column
        rect(fx + 6, fy - 14, 4, 14);  // right column
        rect(fx - 10, fy - 16, 20, 4);  // lintel
        // Algae draping
        fill(35, 85, 45, 50);
        rect(fx - 6, fy - 14, 2, 6);
        rect(fx + 2, fy - 12, 2, 8);
        break;
      }
      case 'sunken_amphora': {
        // Amphora on its side — pixel terracotta
        fill(170, 105, 55, 160);
        rect(fx - 5, fy - 4, 10, 6);
        fill(190, 120, 65, 140);
        rect(fx - 4, fy - 3, 8, 4);
        // Neck
        fill(155, 95, 50, 150);
        rect(fx + 5, fy - 3, 4, 3);
        // Handle
        fill(140, 85, 45, 120);
        rect(fx - 2, fy - 6, 2, 2);
        break;
      }
      case 'shipwreck_plank': {
        // Waterlogged timber plank
        fill(65, 50, 30, 110);
        rect(fx - 8, fy - 2, 16, 3);
        fill(75, 58, 35, 90);
        rect(fx - 7, fy - 2, 14, 2);
        // Nail
        fill(100, 95, 80, 80);
        rect(fx + 4, fy - 3, 2, 2);
        break;
      }
      case 'treasure_chest': {
        // Pixel treasure chest
        fill(90, 65, 30, 160);
        rect(fx - 5, fy - 5, 10, 6);
        // Lid
        fill(100, 75, 35, 150);
        rect(fx - 6, fy - 7, 12, 3);
        // Metal band
        fill(170, 160, 80, 120);
        rect(fx - 5, fy - 4, 10, 2);
        // Keyhole
        fill(50, 40, 20, 140);
        rect(fx - 1, fy - 3, 2, 2);
        // Sparkle
        if (sin(frameCount * 0.06 + s.sway) > 0.5) {
          fill(255, 230, 120, 80);
          rect(fx - 7, fy - 8, 2, 2);
          rect(fx + 5, fy - 8, 2, 2);
        }
        break;
      }
      case 'vent': {
        // Seabed vent — dark crack with warmth
        fill(30, 25, 20, 100);
        rect(fx - 3, fy - 1, 6, 2);
        fill(40, 30, 25, 80);
        rect(fx - 2, fy - 2, 4, 2);
        // Warm glow
        let ventPulse = sin(frameCount * 0.05 + s.sway) * 0.3 + 0.7;
        fill(180, 80, 30, floor(20 * ventPulse));
        rect(fx - 4, fy - 3, 8, 4);
        break;
      }
    }
  }

  // --- Draw treasures (pixel-art, rect-only) ---
  for (let t of d.treasures) {
    if (t.collected) continue;
    let tx = w2sX(t.x), ty = w2sY(t.y);
    if (tx < -20 || tx > width + 20 || ty < -20 || ty > height + 20) continue;

    let _td = dist(state.player.x, state.player.y, t.x, t.y);
    let _tDepth = constrain(_td / 200, 0, 1);
    let sparkle = sin(frameCount * 0.08 + t.sparkle) * 0.3 + 0.7;
    let bc = _diveBlueShift(t.col[0], t.col[1], t.col[2], _tDepth);

    // Glow rect
    fill(bc[0], bc[1], bc[2], 20);
    rect(floor(tx) - 8, floor(ty) - 7, 16, 14);

    let cr = floor(bc[0] * sparkle), cg = floor(bc[1] * sparkle), cb = floor(bc[2]);
    fill(cr, cg, cb, 200);

    switch (t.type) {
      case 'pearl':
        // Pixel pearl — 3x3 block with highlight
        rect(floor(tx) - 2, floor(ty) - 2, 4, 4);
        fill(255, 255, 255, 120);
        rect(floor(tx) - 2, floor(ty) - 2, 2, 2);
        break;
      case 'sponge':
        rect(floor(tx) - 4, floor(ty) - 3, 8, 6);
        // Sponge holes
        fill(bc[0] - 30, bc[1] - 30, bc[2] - 20, 100);
        rect(floor(tx) - 2, floor(ty) - 1, 2, 2);
        rect(floor(tx) + 1, floor(ty) - 2, 2, 2);
        break;
      case 'coral_piece':
        for (let ci = 0; ci < 3; ci++) rect(floor(tx) - 4 + ci * 4, floor(ty) - 4 - ci, 3, 6 + ci);
        break;
      case 'amphora':
        // Pixel amphora — rect body + neck
        fill(cr, cg, cb, 200);
        rect(floor(tx) - 4, floor(ty) - 5, 8, 10);
        fill(cr + 15, cg + 10, cb, 180);
        rect(floor(tx) - 3, floor(ty) - 4, 6, 8);
        fill(floor(bc[0] * 0.8), floor(bc[1] * 0.7), floor(bc[2] * 0.6), 180);
        rect(floor(tx) - 2, floor(ty) - 7, 4, 3);
        // Handles
        fill(cr - 20, cg - 15, cb - 10, 150);
        rect(floor(tx) - 5, floor(ty) - 5, 2, 4);
        rect(floor(tx) + 3, floor(ty) - 5, 2, 4);
        break;
      case 'gold_coin':
        fill(220, 190, 60, 200);
        rect(floor(tx) - 3, floor(ty) - 3, 6, 6);
        fill(240, 210, 80, 180);
        rect(floor(tx) - 2, floor(ty) - 2, 4, 4);
        // Embossed detail
        fill(200, 170, 50, 100);
        rect(floor(tx) - 1, floor(ty) - 1, 2, 2);
        break;
      case 'ancient_helm':
        fill(80, 180, 160, 200);
        rect(floor(tx) - 6, floor(ty) - 5, 12, 8);
        fill(100, 210, 190);
        rect(floor(tx) - 4, floor(ty) - 7, 8, 3);
        // Crest
        fill(60, 150, 130, 160);
        rect(floor(tx) - 2, floor(ty) - 9, 4, 3);
        // Legendary glow — pulsing pixel border
        let glowA = floor(8 + sin(frameCount * 0.1) * 6);
        fill(100, 255, 220, glowA);
        rect(floor(tx) - 10, floor(ty) - 9, 20, 2);
        rect(floor(tx) - 10, floor(ty) + 3, 20, 2);
        rect(floor(tx) - 10, floor(ty) - 9, 2, 14);
        rect(floor(tx) + 8, floor(ty) - 9, 2, 14);
        break;
      case 'shell_fragment':
        fill(cr, cg, cb, 160);
        rect(floor(tx) - 3, floor(ty) - 1, 6, 2);
        fill(min(255, cr + 20), min(255, cg + 15), min(255, cb + 10), 120);
        rect(floor(tx) - 2, floor(ty) - 2, 4, 2);
        break;
      case 'sea_glass':
        fill(cr, cg, cb, 140);
        rect(floor(tx) - 2, floor(ty) - 2, 5, 4);
        fill(min(255, cr + 40), min(255, cg + 30), min(255, cb + 25), 80);
        rect(floor(tx) - 1, floor(ty) - 1, 3, 2);
        break;
      case 'bronze_idol':
        fill(cr, cg, cb, 200);
        rect(floor(tx) - 3, floor(ty) - 5, 6, 8);
        fill(min(255, cr + 20), min(255, cg + 15), cb, 160);
        rect(floor(tx) - 2, floor(ty) - 7, 4, 3); // head
        fill(cr - 20, cg - 15, cb - 10, 120);
        rect(floor(tx) - 5, floor(ty) - 3, 2, 4); // arm
        rect(floor(tx) + 3, floor(ty) - 3, 2, 4); // arm
        break;
      case 'triton_horn': {
        fill(cr, cg, cb, 190);
        rect(floor(tx) - 5, floor(ty) - 2, 10, 4);
        rect(floor(tx) - 3, floor(ty) - 4, 6, 2);
        fill(min(255, cr + 30), min(255, cg + 25), cb, 150);
        rect(floor(tx) + 5, floor(ty) - 1, 3, 2); // mouthpiece
        // Magical shimmer
        let hornGlow = floor(6 + sin(frameCount * 0.08 + t.sparkle) * 4);
        fill(200, 255, 180, hornGlow);
        rect(floor(tx) - 7, floor(ty) - 4, 14, 2);
        break;
      }
      case 'black_pearl':
        fill(40, 35, 50, 220);
        rect(floor(tx) - 3, floor(ty) - 3, 6, 6);
        fill(80, 70, 100, 160);
        rect(floor(tx) - 2, floor(ty) - 2, 4, 4);
        // Dark iridescent highlight
        fill(120, 100, 180, 80);
        rect(floor(tx) - 2, floor(ty) - 2, 2, 2);
        break;
      case 'sunken_crown': {
        fill(220, 200, 80, 210);
        rect(floor(tx) - 5, floor(ty) - 3, 10, 4);
        // Crown points
        fill(240, 220, 100, 200);
        rect(floor(tx) - 4, floor(ty) - 6, 2, 3);
        rect(floor(tx) - 1, floor(ty) - 7, 2, 4);
        rect(floor(tx) + 2, floor(ty) - 6, 2, 3);
        // Jewels
        fill(200, 50, 60, 180);
        rect(floor(tx) - 1, floor(ty) - 5, 2, 2);
        // Legendary glow
        let crownGlow = floor(10 + sin(frameCount * 0.09) * 8);
        fill(255, 240, 120, crownGlow);
        rect(floor(tx) - 8, floor(ty) - 8, 16, 2);
        rect(floor(tx) - 8, floor(ty) + 1, 16, 2);
        rect(floor(tx) - 8, floor(ty) - 8, 2, 11);
        rect(floor(tx) + 6, floor(ty) - 8, 2, 11);
        break;
      }
    }
    // Collect hint when near
    let pd = dist(state.player.x, state.player.y, t.x, t.y);
    if (pd < 30) {
      fill(255, 255, 200, 150 + sin(frameCount * 0.1) * 40);
      textSize(10); textAlign(CENTER);
      text(t.name, floor(tx), floor(ty) - 14);
      textAlign(LEFT, TOP);
    }
  }

  // --- Draw creatures (pixel-art sprites, rect-only) ---
  for (let c of d.creatures) {
    let cx = w2sX(c.x), cy = w2sY(c.y);
    if (cx < -20 || cx > width + 20 || cy < -20 || cy > height + 20) continue;
    let flipX = c.vx < 0 ? -1 : 1;
    let _cd = dist(state.player.x, state.player.y, c.x, c.y);
    let _depthF = constrain(_cd / 200, 0, 1);
    let _dScale = lerp(1.0, 0.7, _depthF);

    push(); translate(floor(cx), floor(cy)); scale(flipX * _dScale, _dScale); noStroke();

    switch (c.type) {
      case 'fish':
        _drawPixelFish(c, _depthF);
        break;
      case 'glowfish':
        _drawGlowFish(c);
        break;
      case 'jellyfish': {
        let jb = floor(sin(frameCount * 0.06 + c.frame) * 2);
        // Bell — pixel rect dome
        fill(c.col[0], c.col[1], c.col[2], 100);
        rect(-4, jb - 2, 8, 4);
        fill(c.col[0], c.col[1], c.col[2], 80);
        rect(-3, jb - 4, 6, 2);
        // Inner glow
        fill(c.col[0] + 40, c.col[1] + 30, c.col[2] + 20, 50);
        rect(-2, jb - 1, 4, 2);
        // Tentacles — pixel vertical lines
        for (let t = -2; t <= 2; t++) {
          let sw = floor(sin(frameCount * 0.04 + c.frame + t) * 2);
          fill(c.col[0], c.col[1], c.col[2], 50);
          rect(t * 2 + sw, 2 + jb, 2, 6 + abs(t));
        }
        break;
      }
      case 'turtle': {
        // Shell — pixel rect
        fill(c.col[0], c.col[1], c.col[2]);
        rect(-6, -4, 12, 7);
        // Shell pattern
        fill(c.col[0] + 20, c.col[1] + 15, c.col[2] + 10);
        rect(-4, -3, 8, 5);
        // Shell detail
        fill(c.col[0] - 15, c.col[1] - 10, c.col[2] - 10, 100);
        rect(-2, -2, 2, 3);
        rect(1, -2, 2, 3);
        // Head
        fill(c.col[0] - 10, c.col[1], c.col[2] - 10);
        rect(6, -2, 4, 3);
        // Flippers (animated)
        let fl = floor(sin(frameCount * 0.08 + c.frame) * 2);
        fill(c.col[0] - 10, c.col[1] - 10, c.col[2] - 10);
        rect(1, -5 + fl, 4, 2);
        rect(1, 3 - fl, 4, 2);
        break;
      }
      case 'octopus': {
        // Head
        fill(c.col[0], c.col[1], c.col[2], 170);
        rect(-4, -4, 8, 5);
        // Tentacles — pixel arms
        for (let t = 0; t < 5; t++) {
          let tx = -4 + t * 2;
          let sw = floor(sin(frameCount * 0.05 + c.frame + t) * 2);
          fill(c.col[0], c.col[1], c.col[2], 120);
          rect(tx + sw, 1, 2, 4 + (t % 2) * 2);
        }
        // Eyes
        fill(255, 220, 100);
        rect(-3, -3, 2, 2);
        rect(1, -3, 2, 2);
        break;
      }
      case 'seahorse': {
        let sb = floor(sin(frameCount * 0.04 + c.frame) * 1);
        fill(c.col[0], c.col[1], c.col[2], 180);
        // Head
        rect(-1, sb - 4, 4, 3);
        // Body segments
        rect(-1, sb - 1, 3, 2);
        rect(0, sb + 1, 3, 2);
        rect(0, sb + 3, 2, 2);
        // Tail curl
        rect(-1, sb + 5, 2, 2);
        // Eye
        fill(0);
        rect(1, sb - 3, 2, 2);
        // Dorsal fin
        fill(c.col[0] + 20, c.col[1] + 15, c.col[2], 120);
        rect(-2, sb - 2, 2, 3);
        break;
      }
      case 'dolphin': {
        let db = floor(sin(frameCount * 0.07 + c.frame) * 2);
        // Streamlined body
        fill(c.col[0], c.col[1], c.col[2], 190);
        rect(-8, db - 2, 16, 4);
        rect(-6, db - 3, 12, 6);
        // Belly — lighter
        fill(c.col[0] + 50, c.col[1] + 45, c.col[2] + 40, 140);
        rect(-5, db + 1, 10, 2);
        // Snout
        fill(c.col[0] - 10, c.col[1] - 5, c.col[2]);
        rect(8, db - 1, 4, 2);
        // Dorsal fin
        fill(c.col[0] - 15, c.col[1] - 10, c.col[2] - 10);
        rect(-1, db - 5, 3, 3);
        rect(0, db - 7, 2, 2);
        // Tail flukes (animated)
        let tf = floor(sin(frameCount * 0.12 + c.frame) * 2);
        fill(c.col[0], c.col[1], c.col[2], 170);
        rect(-10, db - 2 + tf, 2, 2);
        rect(-12, db - 4 + tf, 2, 3);
        rect(-12, db + 1 + tf, 2, 3);
        // Eye
        fill(20, 20, 30);
        rect(5, db - 1, 2, 2);
        // Friendly smile line
        fill(c.col[0] - 30, c.col[1] - 20, c.col[2] - 20, 120);
        rect(7, db, 2, 1);
        break;
      }
    }

    // Blue depth haze overlay (pixel rect)
    if (_depthF > 0.15) {
      fill(12, 35, 75, floor(50 * _depthF));
      rect(-8, -6, 16, 12);
    }
    pop();
  }

  // --- Draw sea enemies (pixel-art, rect-only for new shapes) ---
  if (d.seaEnemies) {
    for (let e of d.seaEnemies) {
      if (e.hp <= 0 && (!e._deathTimer || e._deathTimer <= 0)) continue;
      let ex = w2sX(e.x), ey = w2sY(e.y);
      if (ex < -30 || ex > width + 30 || ey < -30 || ey > height + 30) continue;
      push(); translate(floor(ex), floor(ey)); noStroke();
      let flipX = e.vx < 0 ? -1 : 1;
      let deathScale = (e.hp <= 0 && e._deathTimer) ? max(0.1, e._deathTimer / 15) : 1;
      scale(flipX * deathScale, deathScale);
      if (e.hp <= 0) { drawingContext.globalAlpha = deathScale; }
      let flash = e.flashTimer > 0 && floor(e.flashTimer) % 4 < 2;

      if (e.type === 'shark') {
        let bc = flash ? [255, 100, 100] : [90, 95, 105];
        // Body — blocky pixel shark
        fill(bc[0], bc[1], bc[2]);
        rect(-12, -3, 24, 6);
        fill(bc[0] - 10, bc[1] - 5, bc[2]);
        rect(-10, -2, 20, 4);
        // Dorsal fin
        fill(bc[0] - 20, bc[1] - 15, bc[2] - 10);
        rect(-2, -6, 4, 4);
        rect(-1, -8, 2, 2);
        // Tail
        let tw = floor(sin(frameCount * 0.12) * 2);
        fill(bc[0] - 10, bc[1] - 5, bc[2]);
        rect(-14, -3 + tw, 4, 2);
        rect(-16, -5 + tw, 2, 4);
        rect(-14, 1 + tw, 4, 2);
        // Belly lighter
        fill(bc[0] + 30, bc[1] + 25, bc[2] + 20, 100);
        rect(-8, 1, 16, 2);
        // Eye
        fill(0);
        rect(8, -2, 2, 2);
        fill(255, 40, 40, 120);
        rect(8, -2, 2, 2);
      } else if (e.type === 'eel') {
        let bc = flash ? [255, 120, 60] : [55, 75, 28];
        // Segmented body — pixel blocks in wave
        for (let seg = -3; seg <= 3; seg++) {
          let segY = floor(sin(frameCount * 0.1 + seg * 0.8) * 2);
          fill(bc[0], bc[1], bc[2]);
          rect(seg * 4 - 2, segY - 2, 4, 3);
          // Belly stripe
          fill(bc[0] + 40, bc[1] + 30, bc[2] + 20, 100);
          rect(seg * 4 - 1, segY, 2, 2);
        }
        // Eye (glowing yellow)
        fill(255, 200, 0);
        rect(12, floor(sin(frameCount * 0.1 + 2.4) * 2) - 2, 2, 2);
      } else if (e.type === 'crab_giant') {
        let bc = flash ? [255, 100, 60] : [175, 58, 28];
        // Body — wide pixel rect
        fill(bc[0], bc[1], bc[2]);
        rect(-7, -4, 14, 7);
        // Shell detail
        fill(bc[0] + 20, bc[1] + 10, bc[2] + 5, 120);
        rect(-5, -3, 10, 5);
        // Claws — blocky pixel pincers
        let clawOpen = floor(sin(frameCount * 0.08) * 2);
        fill(bc[0] - 10, bc[1] - 5, bc[2]);
        rect(-12, -4, 4, 3);
        rect(-12, -1 + clawOpen, 4, 2);
        rect(8, -4, 4, 3);
        rect(8, -1 + clawOpen, 4, 2);
        // Legs
        for (let l = -2; l <= 2; l++) {
          if (l === 0) continue;
          fill(bc[0] - 15, bc[1] - 10, bc[2] - 5);
          rect(l * 4, 3, 2, 4);
        }
        // Eyes
        fill(0);
        rect(-3, -3, 2, 2);
        rect(1, -3, 2, 2);
      }

      // HP bar
      if (e.hp > 0 && e.hp < e.maxHp) {
        let frac = max(0, e.hp / e.maxHp);
        fill(30, 10, 10, 160);
        rect(-12, -e.size - 6, 24, 3);
        fill(floor(lerp(220, 60, frac)), floor(lerp(40, 200, frac)), 30);
        rect(-12, -e.size - 6, floor(24 * frac), 3);
      }
      drawingContext.globalAlpha = 1;
      pop();
    }
  }

  // --- Blue tint color shift overlay — stronger at depth ---
  let tintAlpha = playerDepth === 0 ? 20 : playerDepth === 1 ? 35 : 55;
  fill(8, 25, 60, tintAlpha);
  rect(0, 0, width, height);
  // Vignette at deep depth — dark edges
  if (playerDepth >= 2) {
    let vigSize = floor(width * 0.3);
    for (let v = 0; v < 4; v++) {
      let va = floor(12 - v * 3);
      fill(2, 8, 20, va);
      rect(0, 0, vigSize - v * 20, height); // left
      rect(width - vigSize + v * 20, 0, vigSize - v * 20, height); // right
      rect(0, 0, width, vigSize - v * 20); // top
    }
  }

  // --- Breath HUD ---
  let barW = 100, barH = 8;
  let barX = floor(width / 2 - barW / 2), barY = 15;
  fill(0, 0, 0, 140);
  rect(barX - 2, barY - 2, barW + 4, barH + 4);
  fill(20, 40, 70);
  rect(barX, barY, barW, barH);
  let breathFrac = d.breath / (d.maxBreath + d.lungCapacity * 25);
  fill(breathFrac > 0.3 ? 60 : 220, breathFrac > 0.3 ? 180 : 60, breathFrac > 0.3 ? 220 : 40);
  rect(barX, barY, floor(barW * breathFrac), barH);
  // Pixel breath pip marks
  fill(255, 255, 255, 40);
  for (let pip = 1; pip < 4; pip++) rect(barX + floor(barW * pip / 4), barY, 1, barH);
  fill(255, 255, 255, 180); textSize(10); textAlign(CENTER, CENTER);
  text('BREATH', floor(width / 2), barY + floor(barH / 2));

  // Dive loot count
  let collected = d.treasures.filter(t => t.collected).length;
  if (collected > 0) {
    fill(255, 220, 100, 180); textSize(9); textAlign(LEFT);
    text('Loot: ' + collected, barX - 60, barY + 2);
  }

  // Depth indicator
  fill(100, 180, 220, 120); textSize(10); textAlign(RIGHT);
  let depthLabel = d.depth === 0 ? 'Shallow' : d.depth === 1 ? 'Mid' : 'Deep';
  text(depthLabel, barX + barW + 50, barY + 2);

  // Surface hint
  fill(100, 200, 255, floor(80 + sin(frameCount * 0.06) * 40));
  textSize(11); textAlign(CENTER);
  text('[D] Surface  |  Walk onto land to exit', floor(width / 2), height - 12);
  textAlign(LEFT, TOP);

  // --- Dive transition overlay ---
  _drawDiveTransition();
}

function _drawPixelFish(c, depthF) {
  let animFrame = floor(frameCount * 0.08 + c.frame) % 2;
  let bc = _diveBlueShift(c.col[0], c.col[1], c.col[2], depthF);

  // Generic pixel fish sprite (all use rect blocks)
  let tailY = floor(sin(frameCount * 0.15 + c.frame) * 2);

  // Body (6x3 pixel blocks)
  fill(bc[0], bc[1], bc[2], 180);
  rect(-4, -2, 8, 4);
  // Belly highlight
  fill(min(255, bc[0] + 30), min(255, bc[1] + 25), min(255, bc[2] + 20), 120);
  rect(-3, 0, 6, 2);
  // Dorsal accent
  fill(max(0, bc[0] - 25), max(0, bc[1] - 20), max(0, bc[2] - 15), 150);
  rect(-2, -3, 4, 2);

  // Tail (animated)
  fill(bc[0], bc[1], bc[2], 160);
  rect(-6, -1 + tailY, 2, 2);
  rect(-8, -2 + tailY, 2, 4);

  // Eye
  fill(255, 255, 255, 200);
  rect(2, -1, 2, 2);
  fill(0, 0, 0, 200);
  rect(2, -1, 2, 2);
  // Eye highlight
  fill(255, 255, 255, 150);
  rect(2, -1, 1, 1);
}

function _drawGlowFish(c) {
  let pulse = sin(frameCount * 0.06 + c.frame) * 0.3 + 0.7;

  // Glow aura
  fill(40, 255, 200, floor(15 * pulse));
  rect(-8, -6, 16, 10);
  fill(40, 255, 200, floor(8 * pulse));
  rect(-10, -8, 20, 14);

  // Body
  fill(30, 200, 160, 200);
  rect(-3, -2, 6, 3);
  // Bioluminescent spots
  fill(80, 255, 220, floor(180 * pulse));
  rect(-2, -1, 2, 2);
  rect(1, 0, 2, 2);
  // Eye (bright)
  fill(200, 255, 240);
  rect(2, -1, 2, 2);
  // Tail
  let tw = floor(sin(frameCount * 0.1 + c.frame) * 1);
  fill(40, 220, 180, 150);
  rect(-5, -1 + tw, 2, 2);

  // Light trail particles
  if (frameCount % 12 === 0) {
    fill(40, 255, 200, 40);
    rect(-6, floor(random(-2, 2)), 2, 2);
  }
}

function _drawDiveTransition() {
  if (!_diveTransition.active) return;
  let t = _diveTransition.timer / _diveTransition.maxTime;
  let alpha;
  if (_diveTransition.entering) {
    // Entering water: flash of white-blue that fades
    alpha = floor((1 - t) * 180);
    fill(20, 60, 120, alpha);
    rect(0, 0, width, height);
    // Splash rings — expanding pixel rects from center
    let ringSize = floor(t * 80);
    fill(180, 220, 255, floor((1 - t) * 100));
    let rcx = floor(width / 2), rcy = floor(height / 2);
    rect(rcx - ringSize, rcy - 2, ringSize * 2, 4);
    rect(rcx - 2, rcy - ringSize, 4, ringSize * 2);
    // Smaller inner ring
    let ring2 = floor(t * 50);
    fill(200, 240, 255, floor((1 - t) * 60));
    rect(rcx - ring2, rcy - 1, ring2 * 2, 2);
    rect(rcx - 1, rcy - ring2, 2, ring2 * 2);
  } else {
    // Exiting water: blue fades to clear
    alpha = floor((1 - t) * 120);
    fill(15, 45, 85, alpha);
    rect(0, 0, width, height);
  }
}

// Dive prompt shown when near water
function drawDivePrompt() {
  if (!state || !state.diving || state.diving.active) return;
  if (state.conquest.active) return;
  let inShallow = typeof isInShallows === 'function' && isInShallows(state.player.x, state.player.y);
  let onBoat = state.rowing && state.rowing.active;
  if (!inShallow && !onBoat) return;

  fill(100, 200, 255, floor(160 + sin(frameCount * 0.07) * 40));
  noStroke(); textSize(10); textAlign(CENTER);
  text('[D] Dive', floor(width / 2), height - 60);
  textAlign(LEFT, TOP);
}


function initOpenWaterDive() {
  let d = state.diving;
  d.treasures = []; d.creatures = []; d.seabed = [];
  let cx = d.openWaterCX, cy = d.openWaterCY;
  let fishCols = [[60,140,200],[200,160,40],[120,200,120],[200,100,60],[100,180,180]];
  for (let i = 0; i < 8; i++) {
    let angle = random(TWO_PI), r = random(40, 180);
    let fx = cx + cos(angle) * r, fy = cy + sin(angle) * r * 0.5;
    d.creatures.push({
      x: fx, y: fy, vx: random(-0.6, 0.6), vy: random(-0.1, 0.1),
      type: 'fish', col: fishCols[floor(random(fishCols.length))],
      frame: random(TWO_PI), homeX: fx, homeY: fy,
      fishSprite: null, schoolId: floor(i / 3),
    });
  }
  for (let i = 0; i < 5; i++) {
    d.seabed.push({
      x: cx + random(-200, 200), y: cy + random(80, 140),
      type: 'seagrass', size: random(8, 16), sway: random(TWO_PI), variant: floor(random(3)),
    });
  }
  let ta = random(TWO_PI), tr = random(60, 160);
  d.treasures.push({
    x: cx + cos(ta) * tr, y: cy + sin(ta) * tr * 0.5,
    type: 'amphora', name: 'Sunken Amphora', value: 5,
    col: [180, 120, 60], collected: false, sparkle: random(TWO_PI),
    respawnTimer: 0, depthTier: 1,
  });
}

// Diving system loaded

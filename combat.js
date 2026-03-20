// MARE NOSTRUM — Combat Enhancement System
// Loaded after sketch.js. Uses global state.

// ─── XP & LEVELING ──────────────────────────────────────────────────────────

function grantXP(amount) {
  let p = state.player;
  if (p.xpBoostTimer > 0) amount = floor(amount * 1.15);
  p.xp = (p.xp || 0) + amount;
  p.totalXp = (p.totalXp || 0) + amount;
  let level = p.level || 1;
  let needed = level * 100;
  while (p.xp >= needed) {
    p.xp -= needed;
    level++;
    p.skillPoints = (p.skillPoints || 0) + 1;
    p.maxHp += 10;
    p.hp = min(p.hp + 10, p.maxHp);
    addFloatingText(width / 2, height * 0.25, 'LEVEL UP! LV.' + level, '#ffdd44');
    spawnParticles(p.x, p.y, 'divine', 8);
    triggerScreenShake(4, 10);
    if (typeof snd !== 'undefined' && snd) snd.playSFX('skill_unlock');
    needed = level * 100;
  }
  p.level = level;
}

// ─── ACTIVE SKILLS ──────────────────────────────────────────────────────────

// Skill definitions: { cooldownMax (frames), ready }
const COMBAT_SKILLS = {
  whirlwind:  { cooldownMax: 300, key: '1', name: 'Whirlwind' },   // 5s
  shieldBash: { cooldownMax: 480, key: '2', name: 'Shield Bash' }, // 8s
  heal:       { cooldownMax: 900, key: '3', name: 'Heal' },        // 15s
  battleCry:  { cooldownMax: 600, key: '4', name: 'Battle Cry' },  // 10s
  charge:     { cooldownMax: 420, key: '5', name: 'War Charge' },  // 7s
  fortify:    { cooldownMax: 720, key: '6', name: 'Fortify' },     // 12s
};

// Cooldown state (frames remaining)
let _skillCooldowns = { whirlwind: 0, shieldBash: 0, heal: 0, battleCry: 0, charge: 0, fortify: 0 };

// Fortify active timer — set when fortify fires, read in damage-taking code
let _fortifyTimer = 0;
// Battle cry active timer — boosts companion speed/damage
let _battleCryTimer = 0;

function activateSkill(name) {
  if (!state.conquest.active && !state.adventure.active) return;
  if (_skillCooldowns[name] > 0) return;
  // Skills that require a skill point investment (level >= 1) to use
  let skillGated = ['battleCry', 'charge', 'fortify'];
  if (skillGated.includes(name) && getSkillLevel(name) < 1) return;
  let p = state.player;

  switch (name) {
    case 'whirlwind': {
      _skillCooldowns.whirlwind = COMBAT_SKILLS.whirlwind.cooldownMax;
      let wLv = getSkillLevel('whirlwind');
      // Lv3: CD -1s (60 frames)
      if (wLv >= 3) _skillCooldowns.whirlwind -= 60;
      p.slashPhase = 12;
      let enemies = state.conquest.active ? state.conquest.enemies : (state.adventure.enemies || []);
      // Lv2: radius +10px
      let wRadius = 50 + (wLv >= 2 ? 10 : 0);
      // Lv1: 20dmg, Lv2: 35dmg, Lv3: 35dmg + double knockback
      let dmg = wLv >= 2 ? 35 : 20;
      let kbMult = wLv >= 3 ? 2 : 1;
      for (let e of enemies) {
        if (e.state === 'dying' || e.state === 'dead') continue;
        let d = dist(p.x, p.y, e.x, e.y);
        if (d <= wRadius + (e.size || 10)) {
          e.hp -= dmg;
          e.flashTimer = 8;
          e.state = 'stagger';
          e.stateTimer = 10;
          let kba = atan2(e.y - p.y, e.x - p.x);
          e.x += cos(kba) * 8 * kbMult;
          e.y += sin(kba) * 8 * kbMult;
          _spawnDamageNumber(e.x, e.y, dmg, '#ff8800');
          _registerComboHit();
        }
      }
      spawnParticles(p.x, p.y, 'combat', 18);
      triggerScreenShake(7, 14);
      _slowMoFrames = max(_slowMoFrames, 4);
      if (typeof snd !== 'undefined' && snd) snd.playSFX('whirlwind');
      addFloatingText(w2sX(p.x), w2sY(p.y) - 35, 'WHIRLWIND!', '#ff8800');
      break;
    }
    case 'shieldBash': {
      _skillCooldowns.shieldBash = COMBAT_SKILLS.shieldBash.cooldownMax;
      let sbLv = getSkillLevel('shieldBash');
      // Lv2: stun +30 frames (1.5s total), Lv3: +15 dmg on top
      let stunFrames = sbLv >= 2 ? 90 : 60;
      let enemies = state.conquest.active ? state.conquest.enemies : (state.adventure.enemies || []);
      let nearest = null, nearD = Infinity;
      for (let e of enemies) {
        if (e.state === 'dying' || e.state === 'dead') continue;
        let d = dist(p.x, p.y, e.x, e.y);
        if (d < nearD) { nearD = d; nearest = e; }
      }
      if (nearest && nearD < 60) {
        nearest.stunTimer = stunFrames;
        nearest.state = 'stagger';
        nearest.stateTimer = stunFrames;
        nearest.flashTimer = 10;
        let kba = atan2(nearest.y - p.y, nearest.x - p.x);
        nearest.x += cos(kba) * 12;
        nearest.y += sin(kba) * 12;
        // Lv3: bonus damage
        if (sbLv >= 3) {
          nearest.hp -= 15;
          _spawnDamageNumber(nearest.x, nearest.y, 15, '#44aaff');
        } else {
          _spawnDamageNumber(nearest.x, nearest.y, 0, '#44aaff');
        }
        addFloatingText(w2sX(nearest.x), w2sY(nearest.y) - 30, 'STUNNED!', '#44aaff');
        spawnParticles(nearest.x, nearest.y, 'combat', 6);
        triggerScreenShake(3, 6);
        _cameraPush.timer = 5;
        _cameraPush.dx = cos(kba) * 3;
        _cameraPush.dy = sin(kba) * 3;
        if (typeof snd !== 'undefined' && snd) snd.playSFX('shield_bash');
      }
      break;
    }
    case 'heal': {
      _skillCooldowns.heal = COMBAT_SKILLS.heal.cooldownMax;
      let hLv = getSkillLevel('heal');
      // Lv1: 30 HP, Lv2: 50 HP, Lv3: 80 HP + CD -3s
      let healAmt = hLv >= 3 ? 80 : hLv >= 2 ? 50 : 30;
      if (hLv >= 3) _skillCooldowns.heal -= 180; // -3s at 60fps
      let healed = min(healAmt, p.maxHp - p.hp);
      p.hp = min(p.maxHp, p.hp + healAmt);
      spawnParticles(p.x, p.y, 'divine', 8);
      addFloatingText(w2sX(p.x), w2sY(p.y) - 30, '+' + healed + ' HP', '#44ff66');
      break;
    }
    case 'battleCry': {
      _skillCooldowns.battleCry = COMBAT_SKILLS.battleCry.cooldownMax;
      let bcLv = getSkillLevel('battleCry');
      // Lv1: companions +20% speed 10s (600 frames). Lv2: duration +30s, +25% dmg
      _battleCryTimer = bcLv >= 2 ? 2400 : 600; // frames
      spawnParticles(p.x, p.y, 'combat', 12);
      triggerScreenShake(4, 8);
      if (typeof snd !== 'undefined' && snd) snd.playSFX('whirlwind');
      addFloatingText(w2sX(p.x), w2sY(p.y) - 35, 'BATTLE CRY!', '#ff4444');
      break;
    }
    case 'charge': {
      _skillCooldowns.charge = COMBAT_SKILLS.charge.cooldownMax;
      let chLv = getSkillLevel('charge');
      // Lv1: dash 80px. Lv2: +40px. Lv3: +25 dmg on contact
      let chDist = chLv >= 2 ? 120 : 80;
      let chAngle = typeof getFacingAngle === 'function' ? getFacingAngle() : 0;
      let chTargetX = p.x + cos(chAngle) * chDist;
      let chTargetY = p.y + sin(chAngle) * chDist;
      p.x = chTargetX;
      p.y = chTargetY;
      p.invincTimer = max(p.invincTimer, 12);
      // Stagger & optionally damage enemies near landing point
      let enemies2 = state.conquest.active ? state.conquest.enemies : (state.adventure.enemies || []);
      for (let e of enemies2) {
        if (e.state === 'dying' || e.state === 'dead') continue;
        if (dist(p.x, p.y, e.x, e.y) < 35 + (e.size || 10)) {
          e.state = 'stagger'; e.stateTimer = 20; e.flashTimer = 6;
          if (chLv >= 3) {
            e.hp -= 25;
            _spawnDamageNumber(e.x, e.y, 25, '#ffcc44');
          }
        }
      }
      spawnParticles(p.x, p.y, 'dash', 10);
      triggerScreenShake(5, 10);
      if (typeof snd !== 'undefined' && snd) snd.playSFX('dodge');
      addFloatingText(w2sX(p.x), w2sY(p.y) - 30, 'CHARGE!', '#ffcc44');
      break;
    }
    case 'fortify': {
      _skillCooldowns.fortify = COMBAT_SKILLS.fortify.cooldownMax;
      let fLv = getSkillLevel('fortify');
      // Lv1: 30% dmg reduction for 5s (300 frames). Lv2: +5s, reflect 10 dmg
      _fortifyTimer = fLv >= 2 ? 600 : 300;
      spawnParticles(p.x, p.y, 'divine', 10);
      triggerScreenShake(2, 4);
      if (typeof snd !== 'undefined' && snd) snd.playSFX('shield_bash');
      addFloatingText(w2sX(p.x), w2sY(p.y) - 30, 'FORTIFY!', '#aaaaff');
      break;
    }
  }
}

function handleCombatSkillKey(k) {
  if (!state.conquest.active && !state.adventure.active) return false;
  if (state.conquest.buildMode) return false;
  for (let name in COMBAT_SKILLS) {
    if (k === COMBAT_SKILLS[name].key) {
      activateSkill(name);
      return true;
    }
  }
  return false;
}

// ─── DODGE ROLL ─────────────────────────────────────────────────────────────

let _dodgeState = { timer: 0, cooldown: 0, invincFrames: 0, dx: 0, dy: 0, motionBlur: 0 };

function tryDodgeRoll() {
  if (_dodgeState.cooldown > 0) return false;
  if (!state.conquest.active && !state.adventure.active) return false;
  let p = state.player;
  let angle = getFacingAngle();
  _dodgeState.timer = 8;
  _dodgeState.cooldown = 120; // 2 seconds
  _dodgeState.invincFrames = 20;
  _dodgeState.dx = cos(angle) * 5; // 40px over 8 frames
  _dodgeState.dy = sin(angle) * 5;
  p.invincTimer = max(p.invincTimer, 20);
  _dodgeState.motionBlur = 1;
  spawnParticles(p.x, p.y, 'dash', 6);
  if (typeof snd !== 'undefined' && snd) snd.playSFX('dodge');
  return true;
}

// ─── COMBO COUNTER ──────────────────────────────────────────────────────────

let _cameraPush = { timer: 0, dx: 0, dy: 0 };

let _comboCount = 0;
let _comboTimer = 0;

function _registerComboHit() {
  _comboCount++;
  _comboTimer = 60; // reset window
}

function getComboMultiplier() {
  if (_comboCount >= 5) return 1.5;
  if (_comboCount >= 3) return 1.2;
  return 1.0;
}

// ─── DAMAGE NUMBERS ─────────────────────────────────────────────────────────

let _damageNumbers = [];

function _spawnDamageNumber(wx, wy, amount, col) {
  _damageNumbers.push({
    wx: wx,            // world-space — converted each frame so camera moves don't drift the number
    wy: wy,
    ox: random(-8, 8), // fixed jitter offset in screen px
    drift: 0,          // accumulated upward drift (screen px)
    text: amount > 0 ? '-' + amount : 'STUN',
    col: col || '#ff4444',
    life: 45,
    vy: -1.2,
  });
}

// ─── MAIN UPDATE (called from sketch.js hook) ──────────────────────────────

function updateCombatSystem(dt) {
  // Skill cooldowns
  for (let name in _skillCooldowns) {
    if (_skillCooldowns[name] > 0) _skillCooldowns[name] -= dt;
  }

  // Dodge roll movement
  if (_dodgeState.timer > 0) {
    state.player.x += _dodgeState.dx * dt;
    state.player.y += _dodgeState.dy * dt;
    _dodgeState.timer -= dt;
  }
  if (_dodgeState.cooldown > 0) _dodgeState.cooldown -= dt;
  if (_dodgeState.invincFrames > 0) _dodgeState.invincFrames -= dt;
  if (_dodgeState.motionBlur > 0) _dodgeState.motionBlur -= dt;

  // Shield bash camera push — adds directional offset to screen shake
  if (_cameraPush.timer > 0) {
    let t = _cameraPush.timer / 5;
    shakeX += _cameraPush.dx * t;
    shakeY += _cameraPush.dy * t;
    _cameraPush.timer -= dt;
  }

  // Combo timer
  if (_comboTimer > 0) {
    _comboTimer -= dt;
    if (_comboTimer <= 0) _comboCount = 0;
  }

  // Fortify active timer
  if (_fortifyTimer > 0) _fortifyTimer -= dt;
  // Battle cry active timer
  if (_battleCryTimer > 0) _battleCryTimer -= dt;

  // Damage number decay
  for (let i = _damageNumbers.length - 1; i >= 0; i--) {
    let dn = _damageNumbers[i];
    dn.drift += dn.vy * dt; // accumulate screen-space upward drift
    dn.life -= dt;
    if (dn.life <= 0) _damageNumbers.splice(i, 1);
  }

  // Enemy stun timers
  let enemies = state.conquest.active ? state.conquest.enemies : (state.adventure.enemies || []);
  for (let e of enemies) {
    if (e.stunTimer && e.stunTimer > 0) {
      e.stunTimer -= dt;
      if (e.stunTimer > 0) {
        e.state = 'stagger';
        e.stateTimer = max(e.stateTimer || 0, 2);
      }
    }
  }

  // XP on enemy death — hook into enemy removal
  // (tracked via _lastEnemyCount to detect kills)
  if (typeof _combatLastEnemyCount === 'undefined') _combatLastEnemyCount = 0;
  let currentCount = enemies.length;
  if (currentCount < _combatLastEnemyCount) {
    let killed = _combatLastEnemyCount - currentCount;
    let dangerLevel = state.conquest.active ? (state.conquest.dangerLevel || 1) : 1;
    let xpPerKill = 25 + dangerLevel * 5;
    grantXP(killed * xpPerKill);
    for (let i = 0; i < killed; i++) _registerComboHit();
  }
  _combatLastEnemyCount = currentCount;
}
var _combatLastEnemyCount = 0;

// ─── MAIN DRAW (called from sketch.js hook) ─────────────────────────────────

function drawCombatOverlay() {
  push();

  // ─── FORTIFY VISUAL: blue shield shimmer around player ─────────────────
  if (_fortifyTimer > 0 && (state.conquest.active || state.adventure.active)) {
    let p = state.player;
    let psx = w2sX(p.x), psy = w2sY(p.y);
    let fortAlpha = min(1, _fortifyTimer / 30) * (0.5 + sin(frameCount * 0.12) * 0.2);
    noFill();
    // Outer shield ring
    stroke(100, 140, 255, 100 * fortAlpha);
    strokeWeight(2);
    let shieldSize = 22 + sin(frameCount * 0.08) * 3;
    ellipse(psx, psy - 6, shieldSize * 2, shieldSize * 1.6);
    // Inner shimmer
    stroke(160, 200, 255, 160 * fortAlpha);
    strokeWeight(1);
    ellipse(psx, psy - 6, shieldSize * 1.4, shieldSize * 1.1);
    noStroke();
    // Shield icon above player
    fill(120, 170, 255, 180 * fortAlpha);
    textSize(8); textAlign(CENTER, CENTER);
    text('FORTIFIED', psx, psy - 30);
    // Corner sparkle pixels
    for (let i = 0; i < 4; i++) {
      let a = (frameCount * 0.05 + i * HALF_PI) % TWO_PI;
      let sx = psx + cos(a) * shieldSize;
      let sy = psy - 6 + sin(a) * shieldSize * 0.65;
      fill(180, 210, 255, 200 * fortAlpha);
      rect(floor(sx), floor(sy), 2, 2);
    }
  }

  // ─── BATTLE CRY VISUAL: expanding red ring/pulse from player ──────────
  if (_battleCryTimer > 0 && (state.conquest.active || state.adventure.active)) {
    let p = state.player;
    let psx = w2sX(p.x), psy = w2sY(p.y);
    let cryAlpha = min(1, _battleCryTimer / 60);
    // Pulsing red ring
    noFill();
    let pulsePhase = (frameCount * 0.06) % TWO_PI;
    let ringR = 30 + sin(pulsePhase) * 8;
    stroke(255, 60, 40, 80 * cryAlpha);
    strokeWeight(2);
    ellipse(psx, psy - 4, ringR * 2, ringR * 1.4);
    // Second expanding ring (slower)
    let ringR2 = 40 + sin(pulsePhase * 0.7) * 10;
    stroke(255, 100, 60, 40 * cryAlpha);
    strokeWeight(1);
    ellipse(psx, psy - 4, ringR2 * 2, ringR2 * 1.4);
    noStroke();
    // "BATTLE CRY" label
    fill(255, 80, 60, 160 * cryAlpha);
    textSize(8); textAlign(CENTER, CENTER);
    text('BATTLE CRY', psx, psy - 32);
    // Red ember pixels radiating outward
    for (let i = 0; i < 6; i++) {
      let a = (frameCount * 0.03 + i * (TWO_PI / 6)) % TWO_PI;
      let d = ringR + sin(frameCount * 0.1 + i) * 5;
      let ex = psx + cos(a) * d;
      let ey = psy - 4 + sin(a) * d * 0.65;
      fill(255, 50 + i * 20, 30, 180 * cryAlpha);
      rect(floor(ex), floor(ey), 2, 2);
    }
  }

  // Enemy HP bars
  let enemies = state.conquest.active ? state.conquest.enemies : (state.adventure.enemies || []);
  for (let e of enemies) {
    if (!e || e.state === 'dead' || e.state === 'dying') continue;
    if (isNaN(e.x) || isNaN(e.y)) continue;
    let sx = w2sX(e.x);
    let sy = w2sY(e.y);
    if (sx < -50 || sx > width + 50 || sy < -50 || sy > height + 50) continue;
    let bw = 24, bh = 3;
    let bx = sx - bw / 2, by = sy - (e.size || 10) - 10;
    // Background
    fill(30, 10, 10, 180);
    noStroke();
    rect(bx - 1, by - 1, bw + 2, bh + 2, 1);
    // Red background
    fill(80, 20, 15);
    rect(bx, by, bw, bh, 1);
    // Green fill
    let frac = max(0, (e.hp || 0) / (e.maxHp || 1));
    let hpR = lerp(220, 60, frac);
    let hpG = lerp(40, 200, frac);
    fill(hpR, hpG, 30);
    rect(bx, by, bw * frac, bh, 1);
    // Stun indicator
    if (e.stunTimer && e.stunTimer > 0) {
      fill(100, 180, 255, 180);
      textSize(7); textAlign(CENTER);
      text('STUN', sx, by - 5);
    }
  }

  // Damage numbers — convert world pos each frame so numbers stay anchored to world, not screen
  for (let dn of _damageNumbers) {
    let alpha = map(dn.life, 0, 45, 0, 255);
    let c = color(dn.col);
    fill(red(c), green(c), blue(c), alpha);
    noStroke();
    textSize(10 + (45 - dn.life) * 0.05);
    textAlign(CENTER, CENTER);
    let sx = w2sX(dn.wx) + dn.ox;
    let sy = w2sY(dn.wy) - 15 + dn.drift;
    text(dn.text, sx, sy);
  }

  // Combo counter
  if (_comboCount >= 2) {
    let comboAlpha = min(255, _comboTimer * 6);
    let sz = 16 + _comboCount * 1.5;
    let comboCol = _comboCount >= 5 ? color(255, 100, 40, comboAlpha) :
                   _comboCount >= 3 ? color(255, 200, 40, comboAlpha) :
                                      color(200, 200, 200, comboAlpha);
    fill(comboCol);
    noStroke();
    textSize(sz); textAlign(CENTER, CENTER);
    let mult = getComboMultiplier();
    let label = _comboCount + ' HIT';
    if (mult > 1) label += '  x' + mult.toFixed(1);
    text(label, width / 2, height * 0.15);
  }

  // XP bar (below danger bar in conquest HUD area)
  if (state.conquest.active || state.adventure.active) {
    let p = state.player;
    let level = p.level || 1;
    let xp = p.xp || 0;
    let needed = level * 100;
    let frac = xp / needed;

    let barW = 140, barH = 6;
    let barX = width / 2 - barW / 2;
    let barY = 62; // below danger bar

    fill(15, 10, 30, 160);
    noStroke();
    rect(barX - 1, barY - 1, barW + 2, barH + 2, 2);
    fill(20, 15, 50);
    rect(barX, barY, barW, barH, 2);
    fill(120, 80, 220);
    rect(barX, barY, barW * frac, barH, 2);
    fill(200, 180, 255, 200);
    textSize(7); textAlign(CENTER, CENTER);
    text('LV.' + level + '  ' + floor(xp) + '/' + needed + ' XP', width / 2, barY + barH / 2);

    // Skill cooldown indicators — only show skills the player has unlocked (level >= 1)
    let skY = height - 52;
    let skX = 12;
    textAlign(LEFT, TOP);
    // Core skills (whirlwind/shieldBash/heal) always show when in combat context
    // Gladiator/Praetor extras only show if unlocked
    let alwaysShow = ['whirlwind', 'shieldBash', 'heal'];
    for (let name in COMBAT_SKILLS) {
      let sk = COMBAT_SKILLS[name];
      let unlocked = alwaysShow.includes(name) || getSkillLevel(name) >= 1;
      if (!unlocked) continue;
      let cd = _skillCooldowns[name];
      let ready = cd <= 0;
      fill(ready ? color(60, 180, 80, 200) : color(80, 60, 60, 160));
      rect(skX, skY, 60, 14, 3);
      fill(ready ? 255 : 150);
      textSize(8);
      text('[' + sk.key + '] ' + sk.name, skX + 3, skY + 2);
      if (!ready) {
        let cdSec = ceil(cd / 60);
        fill(255, 100, 80);
        textSize(7);
        text(cdSec + 's', skX + 50, skY + 3);
      }
      skX += 66;
    }
  }

  pop();
}

// ─── SKILL TREE ──────────────────────────────────────────────────────────────

let skillTreeOpen = false;

// Full skill definitions — combat actives + passive upgrades
const SKILL_DEFS = {
  // ── Gladiator branch (combat actives)
  whirlwind: {
    name: 'Whirlwind',
    branch: 'gladiator',
    maxLevel: 3,
    costs: [1, 2, 3],
    desc: ['Hit all nearby enemies for 20 dmg', 'Damage +15, radius +10px', 'Knockback doubled, CD -1s'],
    color: '#ff8800',
  },
  shieldBash: {
    name: 'Shield Bash',
    branch: 'gladiator',
    maxLevel: 3,
    costs: [1, 2, 3],
    desc: ['Stun nearest enemy 1s', 'Stun duration +0.5s', 'Bash deals 15 dmg on top'],
    color: '#44aaff',
  },
  battleCry: {
    name: 'Battle Cry',
    branch: 'gladiator',
    maxLevel: 2,
    costs: [2, 3],
    desc: ['Boost all companions +20% speed for 10s', '+30s duration, companions deal +25% dmg'],
    color: '#ff4444',
  },
  // ── Praetor branch (utility actives)
  charge: {
    name: 'War Charge',
    branch: 'praetor',
    maxLevel: 3,
    costs: [1, 2, 3],
    desc: ['Dash 80px forward, stagger enemies', 'Distance +40px', 'Charge deals 25 dmg on contact'],
    color: '#ffcc44',
  },
  heal: {
    name: 'Field Heal',
    branch: 'praetor',
    maxLevel: 3,
    costs: [1, 2, 3],
    desc: ['Restore 30 HP (15s CD)', 'Restore 50 HP', 'Restore 80 HP, CD -3s'],
    color: '#44ff66',
  },
  fortify: {
    name: 'Fortify',
    branch: 'praetor',
    maxLevel: 2,
    costs: [2, 3],
    desc: ['Reduce incoming dmg by 30% for 5s', 'Duration +5s, also reflects 10 dmg'],
    color: '#aaaaff',
  },
  // ── Mystic branch (passive life-sim)
  harvestBonus: {
    name: 'Fertile Hands',
    branch: 'mystic',
    maxLevel: 3,
    costs: [1, 1, 2],
    desc: ['+20% crop yield on harvest', '+30% yield, crops grow 10% faster', '+50% yield total, glow on ready crops'],
    color: '#88cc44',
  },
  fishingLuck: {
    name: 'Sea Favor',
    branch: 'mystic',
    maxLevel: 3,
    costs: [1, 1, 2],
    desc: ['+15% rare fish chance', '+25% rare fish, bite faster', '+40% rare fish, catch doubles on combos'],
    color: '#44ccff',
  },
  companionRegen: {
    name: 'Loyal Bond',
    branch: 'mystic',
    maxLevel: 2,
    costs: [1, 2],
    desc: ['Companions regen 2 energy/min extra', 'Regen x3, companions gain +15% speed'],
    color: '#ff88cc',
  },
};

// Apply passive skill effects — called from game systems that check these
function getSkillLevel(name) {
  let p = state && state.player;
  if (!p || !p.skills) return 0;
  return p.skills[name] || 0;
}

// Crop yield multiplier from Fertile Hands
function getHarvestSkillBonus() {
  let lv = getSkillLevel('harvestBonus');
  return lv >= 3 ? 1.5 : lv >= 2 ? 1.3 : lv >= 1 ? 1.2 : 1.0;
}

// Fishing luck multiplier from Sea Favor
function getFishingLuckBonus() {
  let lv = getSkillLevel('fishingLuck');
  return lv >= 3 ? 1.4 : lv >= 2 ? 1.25 : lv >= 1 ? 1.15 : 1.0;
}

// Naturalist's Codex completion bonuses
function getNatBestiaryBonus() {
  // +10% damage when all 8 enemy types defeated
  if (!state || !state.codex || !state.codex.enemies) return 1.0;
  return Object.keys(state.codex.enemies).length >= 8 ? 1.1 : 1.0;
}
function getNatFishingSpeedBonus() {
  // +50% bite speed (shorter wait) when all 14 fish caught
  if (!state || !state.codex || !state.codex.fish) return 1.0;
  return Object.keys(state.codex.fish).length >= 14 ? 1.5 : 1.0;
}
function getNatBuildCostMult() {
  // -20% build cost when all buildings built
  if (!state || !state.codex || !state.codex.buildingsBuilt) return 1.0;
  return Object.keys(state.codex.buildingsBuilt).length >= 20 ? 0.8 : 1.0;
}

// Companion energy regen bonus from Loyal Bond (extra per 60 frames)
function getCompanionRegenBonus() {
  let lv = getSkillLevel('companionRegen');
  return lv >= 2 ? 0.05 : lv >= 1 ? 0.033 : 0;
}

// Fortify active? Returns damage reduction fraction (0–0.3)
function getFortifyReduction() {
  return _fortifyTimer > 0 ? 0.3 : 0;
}

// Fortify reflect damage (10 dmg if Lv2)
function getFortifyReflect() {
  return (_fortifyTimer > 0 && getSkillLevel('fortify') >= 2) ? 10 : 0;
}

// Battle cry speed multiplier for companions (1.0 if inactive)
function getBattleCrySpeedMult() {
  return _battleCryTimer > 0 ? 1.2 : 1.0;
}

// Battle cry damage multiplier for companions (1.0 if inactive, 1.25 at Lv2)
function getBattleCryDamageMult() {
  if (_battleCryTimer <= 0) return 1.0;
  return getSkillLevel('battleCry') >= 2 ? 1.25 : 1.0;
}

function toggleSkillTree() {
  skillTreeOpen = !skillTreeOpen;
}

function handleSkillTreeClick(mx, my) {
  if (!skillTreeOpen) return false;
  let p = state.player;
  let pts = p.skillPoints || 0;

  let panelW = 460, panelH = 400;
  let panelX = width / 2 - panelW / 2;
  let panelY = height / 2 - panelH / 2;

  // Close button (top-right X)
  if (mx > panelX + panelW - 22 && mx < panelX + panelW - 6 &&
      my > panelY + 6 && my < panelY + 22) {
    skillTreeOpen = false;
    return true;
  }

  // Skill buttons — laid out in 3 branches, 3 rows
  let branches = ['gladiator', 'praetor', 'mystic'];
  let branchLabels = ['GLADIATOR', 'PRAETOR', 'MYSTIC'];
  let branchSkills = {
    gladiator: ['whirlwind', 'shieldBash', 'battleCry'],
    praetor: ['charge', 'heal', 'fortify'],
    mystic: ['harvestBonus', 'fishingLuck', 'companionRegen'],
  };

  let colW = panelW / 3;
  let rowH = 80;
  let startY = panelY + 72;

  for (let bi = 0; bi < branches.length; bi++) {
    let branch = branches[bi];
    let skills = branchSkills[branch];
    let cx = panelX + bi * colW + colW / 2;
    for (let si = 0; si < skills.length; si++) {
      let skillName = skills[si];
      let def = SKILL_DEFS[skillName];
      if (!def) continue;
      let skillY = startY + si * rowH;
      let btnX = cx - 60, btnY = skillY + 10, btnW = 120, btnH = 62;

      if (mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH) {
        let currentLv = getSkillLevel(skillName);
        if (currentLv >= def.maxLevel) return true; // already maxed
        let cost = def.costs[currentLv];
        if (pts < cost) {
          addFloatingText(width / 2, height / 2 - 20, 'Need ' + cost + ' skill point' + (cost > 1 ? 's' : ''), '#ff8844');
          return true;
        }
        // Spend and upgrade
        p.skillPoints -= cost;
        p.skills[skillName] = currentLv + 1;
        addFloatingText(width / 2, height / 2 - 20, def.name + ' upgraded to Lv.' + (currentLv + 1), def.color);
        spawnParticles(p.x, p.y, 'divine', 6);
        if (typeof snd !== 'undefined' && snd) snd.playSFX('skill_unlock');
        return true;
      }
    }
  }

  return true; // absorb all clicks while open
}

function drawSkillTree() {
  if (!skillTreeOpen) return;
  let p = state.player;
  let pts = p.skillPoints || 0;
  let level = p.level || 1;

  let panelW = 460, panelH = 400;
  let panelX = width / 2 - panelW / 2;
  let panelY = height / 2 - panelH / 2;

  push();
  // Backdrop
  noStroke(); fill(0, 0, 0, 160);
  rect(0, 0, width, height);

  // Panel
  drawParchmentPanel(panelX, panelY, panelW, panelH);

  // Title
  fill(212, 172, 80); textSize(13); textAlign(CENTER, TOP);
  text('SKILL TREE', width / 2, panelY + 12);

  // Skill points available
  let ptCol = pts > 0 ? color(255, 220, 80) : color(160, 140, 100);
  fill(ptCol); textSize(9); textAlign(CENTER, TOP);
  text('Skill Points Available: ' + pts + '   (Level ' + level + ')', width / 2, panelY + 30);

  // XP progress hint
  let xp = p.xp || 0;
  let needed = level * 100;
  fill(160, 140, 100, 180); textSize(7); textAlign(CENTER, TOP);
  text('Next point at level ' + (level + 1) + '  —  ' + floor(xp) + '/' + needed + ' XP', width / 2, panelY + 43);

  // Branch headers
  let branches = ['gladiator', 'praetor', 'mystic'];
  let branchLabels = ['GLADIATOR', 'PRAETOR', 'MYSTIC'];
  let branchColors = [color(255, 136, 0), color(255, 204, 68), color(136, 204, 68)];
  let branchSkills = {
    gladiator: ['whirlwind', 'shieldBash', 'battleCry'],
    praetor: ['charge', 'heal', 'fortify'],
    mystic: ['harvestBonus', 'fishingLuck', 'companionRegen'],
  };
  let branchDesc = ['Combat actives', 'Utility & healing', 'Life-sim passives'];

  let colW = panelW / 3;
  let startY = panelY + 72;
  let rowH = 80;

  for (let bi = 0; bi < branches.length; bi++) {
    let branch = branches[bi];
    let skills = branchSkills[branch];
    let cx = panelX + bi * colW + colW / 2;

    // Branch label
    fill(branchColors[bi]); textSize(8); textAlign(CENTER, TOP);
    text(branchLabels[bi], cx, panelY + 55);
    fill(160, 140, 100, 160); textSize(6); textAlign(CENTER, TOP);
    text(branchDesc[bi], cx, panelY + 66);

    for (let si = 0; si < skills.length; si++) {
      let skillName = skills[si];
      let def = SKILL_DEFS[skillName];
      if (!def) continue;
      let currentLv = getSkillLevel(skillName);
      let maxed = currentLv >= def.maxLevel;
      let skillY = startY + si * rowH;

      let btnX = cx - 60, btnY = skillY + 10, btnW = 120, btnH = 62;

      // Button bg
      let bgAlpha = maxed ? 200 : (pts > 0 && currentLv < def.maxLevel ? 180 : 120);
      fill(maxed ? color(40, 70, 30, bgAlpha) : color(35, 28, 18, bgAlpha));
      noStroke();
      rect(btnX, btnY, btnW, btnH, 4);

      // Border
      let bCol = maxed ? color(100, 200, 80, 200) : color(def.color);
      stroke(bCol); strokeWeight(maxed ? 1.5 : 0.8); noFill();
      rect(btnX, btnY, btnW, btnH, 4); noStroke();

      // Skill name
      fill(color(def.color)); textSize(8); textAlign(CENTER, TOP);
      text(def.name, cx, btnY + 4);

      // Level pips
      let pipY = btnY + 16;
      for (let pip = 0; pip < def.maxLevel; pip++) {
        let pipX = cx - (def.maxLevel - 1) * 7 + pip * 14;
        fill(pip < currentLv ? color(def.color) : color(60, 50, 35));
        noStroke();
        circle(pipX, pipY, 8);
      }

      // Description for next level
      let descIdx = min(currentLv, def.maxLevel - 1);
      fill(maxed ? color(120, 200, 100) : color(190, 175, 140));
      textSize(6); textAlign(CENTER, TOP);
      let descText = maxed ? 'MAXED' : def.desc[descIdx];
      // word-wrap to ~19 chars
      if (descText.length > 20) {
        let mid = descText.lastIndexOf(' ', 20);
        if (mid < 8) mid = 20;
        text(descText.substring(0, mid), cx, btnY + 26);
        text(descText.substring(mid + 1), cx, btnY + 34);
      } else {
        text(descText, cx, btnY + 30);
      }

      // Cost or maxed label
      if (!maxed) {
        let cost = def.costs[currentLv];
        let canAfford = pts >= cost;
        fill(canAfford ? color(255, 220, 80) : color(180, 80, 60));
        textSize(7); textAlign(CENTER, TOP);
        text(cost + ' pt' + (cost > 1 ? 's' : '') + ' — click', cx, btnY + 50);
      }

      // Connector line between skills in same branch
      if (si < skills.length - 1) {
        stroke(60, 50, 35, 120); strokeWeight(1);
        line(cx, btnY + btnH, cx, btnY + btnH + rowH - btnH);
        noStroke();
      }
    }
  }

  // Close hint
  fill(140, 120, 80, 180); textSize(7); textAlign(CENTER, BOTTOM);
  text('[K] or click X to close', width / 2, panelY + panelH - 6);

  // Close button
  fill(80, 60, 40, 200); noStroke();
  rect(panelX + panelW - 22, panelY + 6, 16, 16, 3);
  fill(200, 160, 100); textSize(9); textAlign(CENTER, CENTER);
  text('X', panelX + panelW - 14, panelY + 14);

  pop();
}

// ─── KILL BURST PARTICLES ────────────────────────────────────────────────

function spawnKillBurst(x, y, col) {
  for (let i = 0; i < 12; i++) {
    let a = random(TWO_PI), spd = random(1.5, 4);
    particles.push({
      x: x, y: y,
      vx: cos(a) * spd, vy: sin(a) * spd - 1,
      life: random(20, 45), maxLife: 45,
      type: 'burst', size: random(2, 5),
      r: col[0] + random(-20, 20),
      g: col[1] + random(-20, 20),
      b: col[2] + random(-20, 20),
      gravity: 0.08, world: true,
    });
  }
}

// ─── ARENA PROJECTILES (archer arrows) ──────────────────────────────────

var _arenaProjectiles = [];

function updateArenaProjectiles(dt, p) {
  for (let i = _arenaProjectiles.length - 1; i >= 0; i--) {
    let pr = _arenaProjectiles[i];
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    pr.life -= dt;
    if (pr.life <= 0) { _arenaProjectiles.splice(i, 1); continue; }
    // Hit player
    if (dist(pr.x, pr.y, p.x, p.y) < 15 && p.invincTimer <= 0) {
      let armorR = [0, 3, 6, 10][p.armor] || 0;
      let dmg = max(1, pr.damage - armorR);
      // Fortify damage reduction
      if (typeof getFortifyReduction === 'function') {
        dmg = max(1, floor(dmg * (1 - getFortifyReduction())));
      }
      p.hp -= dmg;
      p.invincTimer = 20;
      addFloatingText(w2sX(p.x), w2sY(p.y) - 25, '-' + dmg, '#ff6644');
      triggerScreenShake(3, 6);
      if (typeof snd !== 'undefined' && snd) snd.playSFX('player_hurt');
      _arenaProjectiles.splice(i, 1);
    }
  }
}

function drawArenaProjectiles() {
  for (let pr of _arenaProjectiles) {
    let sx = w2sX(pr.x);
    let sy = w2sY(pr.y);
    push();
    translate(sx, sy);
    let angle = atan2(pr.vy, pr.vx);
    rotate(angle);
    // Arrow shaft
    fill(120, 100, 70);
    noStroke();
    rect(-6, -1, 12, 2);
    // Arrow head
    fill(180, 180, 190);
    triangle(6, -2, 6, 2, 10, 0);
    // Fletching
    fill(200, 50, 40);
    rect(-6, -2, 2, 1);
    rect(-6, 1, 2, 1);
    pop();
  }
}

// ─── ARENA SUMMARY SCREEN ───────────────────────────────────────────────

var _arenaSummary = null;

function showArenaSummary(a, isVictory) {
  if (!a || a.wave < 1) return;
  _arenaSummary = {
    timer: 300, // 5 seconds
    wave: a.wave,
    kills: a.killCount || 0,
    gold: a.goldEarned || 0,
    victory: isVictory,
    bestWave: state.arenaHighWave || 0,
  };
}

function drawArenaSummaryOverlay() {
  let s = _arenaSummary;
  if (!s) return;
  s.timer--;
  if (s.timer <= 0) { _arenaSummary = null; return; }

  let alpha = s.timer < 60 ? floor((s.timer / 60) * 220) : 220;
  push();
  noStroke();
  fill(0, 0, 0, min(alpha, 160));
  rect(0, 0, width, height);

  let bw = 300, bh = 180;
  let bx = width / 2 - bw / 2, by = height / 2 - bh / 2;

  fill(30, 20, 10, alpha);
  stroke(200, 170, 80, alpha); strokeWeight(2);
  rect(bx, by, bw, bh, 8);
  noStroke();

  // Title
  fill(s.victory ? color(220, 185, 60, alpha) : color(255, 100, 60, alpha));
  textAlign(CENTER, TOP); textSize(18);
  text(s.victory ? 'VICTORY!' : 'RETREAT...', width / 2, by + 14);

  stroke(160, 130, 60, alpha * 0.7); strokeWeight(1);
  line(bx + 20, by + 38, bx + bw - 20, by + 38);
  noStroke();

  let ty = by + 48;
  // Wave reached
  fill(200, 185, 140, alpha); textSize(11); textAlign(LEFT, TOP);
  text('Wave Reached:', bx + 24, ty);
  fill(255, 230, 100, alpha); textAlign(RIGHT, TOP);
  text(s.wave, bx + bw - 24, ty);

  // Best wave
  ty += 22;
  fill(200, 185, 140, alpha); textAlign(LEFT, TOP);
  text('Best Wave:', bx + 24, ty);
  fill(180, 220, 255, alpha); textAlign(RIGHT, TOP);
  text(s.bestWave, bx + bw - 24, ty);

  // Enemies defeated
  ty += 22;
  fill(200, 185, 140, alpha); textAlign(LEFT, TOP);
  text('Enemies Defeated:', bx + 24, ty);
  fill(255, 220, 100, alpha); textAlign(RIGHT, TOP);
  text(s.kills, bx + bw - 24, ty);

  // Gold earned
  ty += 22;
  fill(200, 185, 140, alpha); textAlign(LEFT, TOP);
  text('Gold Earned:', bx + 24, ty);
  fill(255, 200, 60, alpha); textAlign(RIGHT, TOP);
  text('+' + s.gold, bx + bw - 24, ty);

  fill(140, 130, 100, alpha * 0.7); textAlign(CENTER, TOP); textSize(9);
  text('Returning home...', width / 2, by + bh - 20);
  pop();
}

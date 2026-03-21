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
  let _lvlUps = 0;
  while (p.xp >= needed && _lvlUps < 20) {
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
    _lvlUps++;
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
      if (typeof snd !== 'undefined' && snd) snd.playSFX('heart');
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

// ─── KILL COMBO (kills without taking damage) ───────────────────────────────

var _killCombo = 0;
var _killComboDisplay = 0; // for display animation (holds value briefly after reset)
var _killComboDisplayTimer = 0;

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

  // Kill combo display timer
  if (_killComboDisplayTimer > 0) _killComboDisplayTimer -= dt;

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

  // Guardtower auto-shoot: deal 8 dmg to nearest enemy every 60 frames
  if (state.buildings && enemies.length > 0) {
    let towers = state.buildings.filter(b => b.type === 'guardtower');
    towers.forEach(t => {
      if (!t._shootTimer) t._shootTimer = 0;
      t._shootTimer -= dt;
      if (t._shootTimer <= 0) {
        t._shootTimer = 60;
        let nearest = null, nearD = Infinity;
        for (let e of enemies) {
          if (e.state === 'dying' || e.state === 'dead') continue;
          let d2 = (e.x - t.x) * (e.x - t.x) + (e.y - t.y) * (e.y - t.y);
          if (d2 < nearD) { nearD = d2; nearest = e; }
        }
        if (nearest && nearD < 200 * 200) {
          nearest.hp -= 8;
          nearest.flashTimer = 6;
          if (typeof _spawnDamageNumber === 'function') _spawnDamageNumber(nearest.x, nearest.y, 8, '#ffaa44');
          if (typeof spawnParticles === 'function') spawnParticles(nearest.x, nearest.y, 'combat', 2);
        }
      }
    });
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
    textSize(11); textAlign(CENTER, CENTER);
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
    textSize(11); textAlign(CENTER, CENTER);
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
      textSize(10); textAlign(CENTER);
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

  // Combo counter (hit combo)
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

  // Kill combo counter (kills without taking damage)
  if (_killComboDisplay >= 2 && _killComboDisplayTimer > 0) {
    let kcAlpha = min(255, _killComboDisplayTimer * 4);
    let kcSz = 14 + min(_killComboDisplay, 10) * 2;
    let kcPulse = 1 + sin(frameCount * 0.2) * 0.05 * min(_killComboDisplay, 8);
    // Warm color ramp: white -> yellow -> orange -> red
    let kcR = 255;
    let kcG = _killComboDisplay >= 8 ? 80 : _killComboDisplay >= 5 ? 140 : _killComboDisplay >= 3 ? 200 : 220;
    let kcB = _killComboDisplay >= 5 ? 40 : _killComboDisplay >= 3 ? 60 : 100;
    fill(kcR, kcG, kcB, kcAlpha);
    noStroke();
    textSize(kcSz * kcPulse); textAlign(CENTER, CENTER);
    let kcLabel = 'x' + _killComboDisplay + '!';
    // Brief scale pop on new kill
    let popScale = _killComboDisplayTimer > 80 ? 1 + (_killComboDisplayTimer - 80) * 0.03 : 1;
    push();
    translate(width / 2, height * 0.21);
    scale(popScale);
    text(kcLabel, 0, 0);
    // Outline for readability
    fill(0, 0, 0, kcAlpha * 0.4);
    textSize(kcSz * kcPulse + 1);
    text(kcLabel, 1, 1);
    fill(kcR, kcG, kcB, kcAlpha);
    textSize(kcSz * kcPulse);
    text(kcLabel, 0, 0);
    pop();
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
    textSize(10); textAlign(CENTER, CENTER);
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
      textSize(11);
      text('[' + sk.key + '] ' + sk.name, skX + 3, skY + 2);
      if (!ready) {
        let cdSec = ceil(cd / 60);
        fill(255, 100, 80);
        textSize(10);
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
  fill(160, 140, 100, 180); textSize(10); textAlign(CENTER, TOP);
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
    fill(branchColors[bi]); textSize(11); textAlign(CENTER, TOP);
    text(branchLabels[bi], cx, panelY + 55);
    fill(160, 140, 100, 160); textSize(9); textAlign(CENTER, TOP);
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
      fill(color(def.color)); textSize(11); textAlign(CENTER, TOP);
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
      textSize(9); textAlign(CENTER, TOP);
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
        textSize(10); textAlign(CENTER, TOP);
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
  fill(140, 120, 80, 180); textSize(10); textAlign(CENTER, BOTTOM);
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
  // 10-12 radiating particles with gravity
  let count = floor(random(10, 13));
  for (let i = 0; i < count; i++) {
    let a = (TWO_PI / count) * i + random(-0.3, 0.3);
    let spd = random(1.8, 4.5);
    particles.push({
      x: x, y: y,
      vx: cos(a) * spd, vy: sin(a) * spd - 1.2,
      life: random(25, 50), maxLife: 50,
      type: 'burst', size: random(2, 5),
      r: col[0] + random(-25, 25),
      g: col[1] + random(-25, 25),
      b: col[2] + random(-25, 25),
      gravity: 0.1, world: true,
    });
  }
  // Expanding ring in enemy's color
  particles.push({
    x: x, y: y, vx: 0, vy: 0,
    life: 25, maxLife: 25,
    type: 'golden_wave', size: 3,
    maxRing: 50,
    r: min(255, col[0] + 60), g: min(255, col[1] + 60), b: min(255, col[2] + 60),
    world: true,
  });
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
      _juiceCombatVignette = min(1, _juiceCombatVignette + 0.4);
      _juiceHpShakeTimer = 12;
      addFloatingText(w2sX(p.x), w2sY(p.y) - 25, '-' + dmg, '#ff6644');
      { let _hda = atan2(p.y - pr.y, p.x - pr.x); triggerScreenShake(3, 6, cos(_hda), sin(_hda), 'directional'); }
      if (typeof snd !== 'undefined' && snd) snd.playSFX('player_hurt');
      _killCombo = 0;
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

// ═══════════════════════════════════════════════════════════════════════════
// ─── MILITARY SYSTEM — Unit Types, Army Battles, Raids, Conquests ───────
// ═══════════════════════════════════════════════════════════════════════════

const UNIT_TYPES = {
  legionary:  { name: 'Legionary',       hp: 20, damage: 5,  speed: 1.0, cost: 10, minLevel: 1, ranged: false, desc: 'Sturdy infantry' },
  archer:     { name: 'Archer',          hp: 12, damage: 8,  speed: 1.0, cost: 15, minLevel: 2, ranged: true,  desc: 'Ranged attacker' },
  cavalry:    { name: 'Cavalry',         hp: 30, damage: 7,  speed: 2.0, cost: 25, minLevel: 3, ranged: false, desc: 'Fast charger' },
  siege_ram:  { name: 'Siege Ram',       hp: 50, damage: 15, speed: 0.4, cost: 40, minLevel: 4, ranged: false, desc: 'Destroys buildings', vsBuildingMult: 3 },
  centurion:  { name: 'Elite Centurion', hp: 40, damage: 12, speed: 1.2, cost: 50, minLevel: 5, ranged: false, desc: 'Buffs nearby +20%', aura: 0.2 },
};

const CASTRUM_LEVELS = [
  null, // index 0 unused
  { name: 'Barracks',         maxSoldiers: 10, damageMult: 1.0, hpMult: 1.0, defenseMult: 1.0, unlocks: ['legionary'] },
  { name: 'Armory',           maxSoldiers: 20, damageMult: 1.2, hpMult: 1.0, defenseMult: 1.0, unlocks: ['legionary','archer'],  cost: { gold: 100, stone: 20 } },
  { name: 'War Academy',      maxSoldiers: 30, damageMult: 1.2, hpMult: 1.3, defenseMult: 1.0, unlocks: ['legionary','archer','cavalry'], cost: { gold: 300, stone: 50, ironOre: 10 } },
  { name: 'Fortress',         maxSoldiers: 40, damageMult: 1.2, hpMult: 1.3, defenseMult: 1.5, unlocks: ['legionary','archer','cavalry','siege_ram'], cost: { gold: 500, stone: 80, ironOre: 20 } },
  { name: 'Imperial Legion',  maxSoldiers: 50, damageMult: 1.4, hpMult: 1.3, defenseMult: 1.5, unlocks: ['legionary','archer','cavalry','siege_ram','centurion'], cost: { gold: 800, stone: 100, ironOre: 30, crystals: 10 } },
];

function getCastrumLevelData() {
  let lv = state.legia ? state.legia.castrumLevel : 0;
  return CASTRUM_LEVELS[min(lv, 5)] || CASTRUM_LEVELS[1];
}

function getUnlockedUnitTypes() {
  let data = getCastrumLevelData();
  if (!data) return [];
  return data.unlocks || ['legionary'];
}

function getMaxSoldiers() {
  let data = getCastrumLevelData();
  if (!data) return 10;
  return data.maxSoldiers + (getFactionData ? getFactionData().recruitBonus || 0 : 0);
}

function getArmyCount() {
  if (!state.legia || !state.legia.army) return 0;
  return state.legia.army.length;
}

function getArmyCountByType(type) {
  if (!state.legia || !state.legia.army) return 0;
  return state.legia.army.filter(u => u.type === type).length;
}

function getArmyUpkeep() {
  let count = getArmyCount();
  return ceil(count * 2); // 2g per soldier
}

function trainUnit(type) {
  let lg = state.legia;
  if (!lg || lg.castrumLevel < 1) return false;
  let def = UNIT_TYPES[type];
  if (!def) return false;
  if (lg.castrumLevel < def.minLevel) {
    addFloatingText(width / 2, height * 0.3, 'Need Castrum level ' + def.minLevel, '#ff6644');
    return false;
  }
  if (getArmyCount() >= getMaxSoldiers()) {
    addFloatingText(width / 2, height * 0.3, 'Army at capacity!', '#ff6644');
    return false;
  }
  if (state.gold < def.cost) {
    addFloatingText(width / 2, height * 0.3, 'Need ' + def.cost + ' gold', '#ff6644');
    return false;
  }
  state.gold -= def.cost;
  let data = getCastrumLevelData();
  let maxHp = floor(def.hp * (data.hpMult || 1));
  let damage = floor(def.damage * (data.damageMult || 1));
  lg.army.push({
    type: type,
    hp: maxHp,
    maxHp: maxHp,
    damage: damage,
    speed: def.speed,
    x: 0, y: 0, // set when deployed
    state: 'idle',
    attackTimer: 0,
    garrison: true, // true = home defense, false = deployed on expedition
  });
  addFloatingText(width / 2, height * 0.3, def.name + ' trained!', '#cc8844');
  if (typeof snd !== 'undefined' && snd) snd.playSFX('upgrade');
  return true;
}

// ─── MILITARY UPKEEP (called from daily tick) ───────────────────────────

function processArmyUpkeep() {
  let lg = state.legia;
  if (!lg || !lg.army || lg.army.length === 0) return;
  let cost = getArmyUpkeep();
  if (state.gold >= cost) {
    state.gold -= cost;
    lg.morale = min(100, (lg.morale || 100) + 2);
  } else {
    // Can't pay -- morale drops, soldiers may desert
    let deficit = cost - state.gold;
    state.gold = 0;
    lg.morale = max(0, (lg.morale || 100) - 10 - deficit * 2);
    addFloatingText(width / 2, height * 0.25, 'Cannot pay army! Morale drops!', '#ff4444');
    // Desert chance per soldier when morale < 30
    if (lg.morale < 30) {
      let deserted = 0;
      for (let i = lg.army.length - 1; i >= 0; i--) {
        if (random() < 0.15) {
          lg.army.splice(i, 1);
          deserted++;
        }
      }
      if (deserted > 0) {
        addFloatingText(width / 2, height * 0.3, deserted + ' soldier' + (deserted > 1 ? 's' : '') + ' deserted!', '#ff6644');
      }
    }
  }
}

// ─── ARMY BATTLE SYSTEM ─────────────────────────────────────────────────

var _armyBattle = null; // active battle state or null

function startArmyBattle(attackers, defenders, context) {
  // context: { type: 'raid'|'invade'|'defend', nationKey, onVictory, onDefeat }
  // attackers/defenders: arrays of { type, hp, maxHp, damage, speed }
  let battle = {
    phase: 'deploy', // deploy -> fighting -> result
    timer: 0,
    attackers: attackers.map((u, i) => ({
      ...u,
      x: 80 + (i % 5) * 20,
      y: 120 + floor(i / 5) * 30,
      targetIdx: -1,
      attackTimer: 0,
      side: 'left',
      alive: true,
      flashTimer: 0,
    })),
    defenders: defenders.map((u, i) => ({
      ...u,
      x: width - 80 - (i % 5) * 20,
      y: 120 + floor(i / 5) * 30,
      targetIdx: -1,
      attackTimer: 0,
      side: 'right',
      alive: true,
      flashTimer: 0,
    })),
    context: context,
    resultTimer: 0,
    result: null, // 'victory' | 'defeat'
    projectiles: [], // archer arrows during battle
    log: [],
  };
  _armyBattle = battle;
}

function updateArmyBattle(dt) {
  let b = _armyBattle;
  if (!b) return;

  b.timer += dt;

  if (b.phase === 'deploy') {
    if (b.timer > 90) { b.phase = 'fighting'; b.timer = 0; }
    return;
  }

  if (b.phase === 'result') {
    b.resultTimer += dt;
    if (b.resultTimer > 300) { // 5 seconds then close
      let ctx = b.context;
      if (b.result === 'victory' && ctx.onVictory) ctx.onVictory(b);
      if (b.result === 'defeat' && ctx.onDefeat) ctx.onDefeat(b);
      _armyBattle = null;
    }
    return;
  }

  // fighting phase
  let atk = b.attackers.filter(u => u.alive);
  let def = b.defenders.filter(u => u.alive);

  if (atk.length === 0) {
    b.phase = 'result'; b.result = 'defeat'; return;
  }
  if (def.length === 0) {
    b.phase = 'result'; b.result = 'victory'; return;
  }

  // Check for centurion aura buffs
  let atkHasCenturion = atk.some(u => u.type === 'centurion');
  let defHasCenturion = def.some(u => u.type === 'centurion');
  let atkAura = atkHasCenturion ? 1.2 : 1.0;
  let defAura = defHasCenturion ? 1.2 : 1.0;

  // Move and fight
  _updateBattleSide(b.attackers, b.defenders, dt, atkAura, b);
  _updateBattleSide(b.defenders, b.attackers, dt, defAura, b);

  // Update projectiles
  for (let i = b.projectiles.length - 1; i >= 0; i--) {
    let pr = b.projectiles[i];
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    pr.life -= dt;
    if (pr.life <= 0) { b.projectiles.splice(i, 1); continue; }
    // Check hit
    let targets = pr.side === 'left' ? b.defenders : b.attackers;
    for (let t of targets) {
      if (!t.alive) continue;
      if (abs(t.x - pr.x) < 12 && abs(t.y - pr.y) < 12) {
        t.hp -= pr.damage;
        t.flashTimer = 8;
        if (t.hp <= 0) { t.alive = false; t.hp = 0; }
        b.projectiles.splice(i, 1);
        break;
      }
    }
  }
}

function _updateBattleSide(units, enemies, dt, auraMult, battle) {
  let aliveEnemies = enemies.filter(e => e.alive);
  if (aliveEnemies.length === 0) return;

  for (let u of units) {
    if (!u.alive) continue;
    u.flashTimer = max(0, u.flashTimer - dt);
    u.attackTimer = max(0, u.attackTimer - dt);

    // Find nearest enemy
    let nearest = null, nearD = Infinity;
    for (let e of aliveEnemies) {
      let d = abs(u.x - e.x) + abs(u.y - e.y);
      if (d < nearD) { nearD = d; nearest = e; }
    }
    if (!nearest) continue;

    let isRanged = UNIT_TYPES[u.type] && UNIT_TYPES[u.type].ranged;
    let attackRange = isRanged ? 200 : 25;

    if (nearD > attackRange) {
      // Move toward enemy
      let dx = nearest.x - u.x, dy = nearest.y - u.y;
      let d = max(1, sqrt(dx * dx + dy * dy));
      let spd = (u.speed || 1) * 1.5 * dt;
      u.x += (dx / d) * spd;
      u.y += (dy / d) * spd;
    } else if (u.attackTimer <= 0) {
      // Attack
      let dmg = floor((u.damage || 5) * auraMult);
      if (isRanged) {
        // Shoot projectile
        let dx = nearest.x - u.x, dy = nearest.y - u.y;
        let d = max(1, sqrt(dx * dx + dy * dy));
        battle.projectiles.push({
          x: u.x, y: u.y,
          vx: (dx / d) * 4, vy: (dy / d) * 4,
          damage: dmg, life: 60, side: u.side,
        });
      } else {
        nearest.hp -= dmg;
        nearest.flashTimer = 8;
        if (nearest.hp <= 0) { nearest.alive = false; nearest.hp = 0; }
      }
      u.attackTimer = isRanged ? 45 : 30;
    }
  }
}

function drawArmyBattle() {
  let b = _armyBattle;
  if (!b) return;

  push();
  // Full screen overlay
  fill(15, 10, 8, 230);
  noStroke();
  rect(0, 0, width, height);

  // Title
  fill(220, 185, 80); textAlign(CENTER, TOP); textSize(14);
  let titleText = b.context.type === 'defend' ? 'ISLAND DEFENSE' :
                  b.context.type === 'raid' ? 'RAIDING ' + (b.context.nationName || 'Enemy') :
                  'INVASION OF ' + (b.context.nationName || 'Enemy');
  text(titleText, width / 2, 10);

  if (b.phase === 'deploy') {
    fill(180, 160, 120, 150 + sin(frameCount * 0.1) * 50);
    textSize(12); textAlign(CENTER, CENTER);
    text('Deploying forces...', width / 2, height / 2);
  }

  // Draw ground
  fill(60, 50, 35); noStroke();
  rect(0, height - 40, width, 40);
  fill(70, 60, 40);
  rect(0, height - 42, width, 4);

  // Draw units
  _drawBattleUnits(b.attackers, '#cc4444', 1);
  _drawBattleUnits(b.defenders, '#4488cc', -1);

  // Draw projectiles
  for (let pr of b.projectiles) {
    push();
    translate(pr.x, pr.y);
    let angle = atan2(pr.vy, pr.vx);
    rotate(angle);
    fill(120, 100, 70); noStroke();
    rect(-5, -1, 10, 2);
    fill(180, 180, 190);
    triangle(5, -2, 5, 2, 8, 0);
    pop();
  }

  // Army counts
  let atkAlive = b.attackers.filter(u => u.alive).length;
  let defAlive = b.defenders.filter(u => u.alive).length;
  fill(200, 80, 80); textSize(11); textAlign(LEFT, TOP);
  text('Your Army: ' + atkAlive + '/' + b.attackers.length, 10, 30);
  fill(80, 130, 200); textAlign(RIGHT, TOP);
  text('Enemy: ' + defAlive + '/' + b.defenders.length, width - 10, 30);

  // Result screen
  if (b.phase === 'result') {
    fill(0, 0, 0, min(180, b.resultTimer * 3));
    rect(0, 0, width, height);
    let rAlpha = min(255, b.resultTimer * 4);
    if (b.result === 'victory') {
      fill(220, 185, 60, rAlpha); textSize(22); textAlign(CENTER, CENTER);
      text('VICTORY!', width / 2, height / 2 - 20);
      fill(180, 220, 120, rAlpha); textSize(11);
      let survived = b.attackers.filter(u => u.alive).length;
      text(survived + ' of ' + b.attackers.length + ' soldiers survived', width / 2, height / 2 + 10);
    } else {
      fill(255, 80, 60, rAlpha); textSize(22); textAlign(CENTER, CENTER);
      text('DEFEAT', width / 2, height / 2 - 20);
      fill(200, 160, 120, rAlpha); textSize(11);
      text('Your army was overwhelmed...', width / 2, height / 2 + 10);
    }
  }

  pop();
}

function _drawBattleUnits(units, teamCol, facing) {
  for (let u of units) {
    if (!u.alive) continue;
    let ux = u.x, uy = u.y;
    push();
    translate(ux, uy);
    scale(facing, 1);
    noStroke();

    // Flash on hit
    if (u.flashTimer > 0) {
      fill(255, 255, 255, 200);
      ellipse(0, -4, 14, 18);
      pop(); continue;
    }

    // Shadow
    fill(0, 0, 0, 30);
    ellipse(0, 4, 12, 5);

    let uDef = UNIT_TYPES[u.type] || UNIT_TYPES.legionary;

    if (u.type === 'cavalry') {
      // Horse body
      fill(120, 90, 60);
      rect(-6, -2, 12, 8, 2);
      // Rider
      fill(160, 50, 40);
      rect(-3, -10, 6, 8);
      // Helmet
      fill(150, 140, 120);
      rect(-3, -13, 6, 3);
      // Legs
      fill(80, 60, 40);
      let step = sin(frameCount * 0.15 + ux) * 2;
      rect(-5, 6, 2, 4 + step);
      rect(-1, 6, 2, 4 - step);
      rect(2, 6, 2, 4 + step);
      rect(5, 6, 2, 4 - step);
    } else if (u.type === 'archer') {
      // Body — green tunic
      fill(60, 100, 50);
      rect(-3, -8, 6, 10);
      // Head
      fill(195, 165, 130);
      rect(-2, -12, 4, 4);
      // Hood
      fill(50, 80, 40);
      rect(-3, -13, 6, 3);
      // Bow
      stroke(120, 90, 50); strokeWeight(1);
      noFill();
      arc(4, -6, 4, 12, -HALF_PI, HALF_PI);
      noStroke();
      // Quiver
      fill(100, 70, 40);
      rect(-5, -8, 2, 6);
      // Legs
      fill(70, 50, 35);
      rect(-2, 2, 2, 3);
      rect(1, 2, 2, 3);
    } else if (u.type === 'siege_ram') {
      // Big wooden ram
      fill(100, 70, 40);
      rect(-10, -6, 20, 12, 2);
      // Metal tip
      fill(160, 160, 170);
      rect(10, -4, 4, 8);
      // Wheels
      fill(60, 50, 35);
      ellipse(-6, 8, 6, 6);
      ellipse(6, 8, 6, 6);
      // Roof
      fill(80, 60, 35);
      rect(-10, -8, 20, 3);
    } else if (u.type === 'centurion') {
      // Body — purple
      fill(100, 40, 100);
      rect(-4, -8, 8, 10);
      // Gold armor
      fill(200, 170, 60);
      rect(-4, -7, 8, 4);
      // Head + crest
      fill(195, 165, 130);
      rect(-2, -12, 4, 4);
      fill(200, 40, 40);
      rect(-1, -16, 2, 5); // red crest
      // Shield
      fill(140, 50, 35);
      rect(-6, -6, 2, 8);
      // Sword
      fill(200, 200, 210);
      rect(5, -10, 1, 8);
      // Legs
      fill(120, 40, 30);
      rect(-3, 2, 2, 4);
      rect(1, 2, 2, 4);
      // Aura glow
      noFill();
      stroke(200, 170, 60, 60 + sin(frameCount * 0.08) * 30);
      strokeWeight(1);
      ellipse(0, -2, 28, 24);
      noStroke();
    } else {
      // Legionary (default)
      fill(160, 50, 40);
      rect(-3, -8, 6, 10);
      // Armor
      fill(180, 170, 150);
      rect(-3, -7, 6, 4);
      // Head
      fill(195, 165, 130);
      rect(-2, -12, 4, 4);
      // Helmet
      fill(150, 140, 120);
      rect(-3, -13, 6, 3);
      // Shield
      fill(140, 50, 35);
      rect(-5, -6, 2, 6);
      // Sword
      fill(200, 200, 210);
      rect(4, -9, 1, 7);
      // Legs
      fill(120, 40, 30);
      rect(-2, 2, 2, 3);
      rect(1, 2, 2, 3);
    }

    // HP bar
    let hpPct = u.hp / u.maxHp;
    let barW = 16, barH = 2;
    fill(40, 0, 0, 180);
    rect(-barW / 2, -18, barW, barH);
    fill(hpPct > 0.5 ? color(80, 180, 80) : hpPct > 0.25 ? color(200, 180, 40) : color(200, 60, 40));
    rect(-barW / 2, -18, floor(barW * hpPct), barH);

    pop();
  }
}

// ─── RAID / INVADE NATION ───────────────────────────────────────────────

function launchRaidOnNation(nationKey) {
  let rv = state.nations[nationKey];
  if (!rv) return;
  let lg = state.legia;
  if (!lg || !lg.army) return;
  let deployed = lg.army.filter(u => !u.garrison);
  if (deployed.length === 0) {
    // Auto-deploy up to 5 for raid
    let available = lg.army.filter(u => u.garrison);
    let count = min(5, available.length);
    if (count === 0) { addFloatingText(width / 2, height * 0.3, 'No soldiers to raid with!', '#ff6644'); return; }
    for (let i = 0; i < count; i++) available[i].garrison = false;
    deployed = lg.army.filter(u => !u.garrison);
  }

  // Build defender army from nation's military
  let defCount = max(2, rv.military);
  let defenders = [];
  for (let i = 0; i < defCount; i++) {
    let hp = 20 + rv.level * 5;
    defenders.push({ type: 'legionary', hp: hp, maxHp: hp, damage: 4 + rv.level, speed: 1.0 });
  }

  let nationName = typeof getNationName === 'function' ? getNationName(nationKey) : nationKey;
  startArmyBattle(
    deployed.map(u => ({ ...u })),
    defenders,
    {
      type: 'raid',
      nationKey: nationKey,
      nationName: nationName,
      onVictory: function(battle) {
        let loot = floor(20 + rv.level * 10 + random(10, 30));
        state.gold += loot;
        rv.reputation = max(-100, rv.reputation - 15);
        rv.military = max(0, rv.military - floor(defCount * 0.5));
        // Casualties
        let survived = battle.attackers.filter(u => u.alive);
        lg.army = lg.army.filter(u => u.garrison); // remove deployed
        for (let s of survived) {
          s.garrison = true;
          lg.army.push(s);
        }
        addFloatingText(width / 2, height * 0.2, 'Raid success! +' + loot + 'g', '#ffdd44');
        addNotification('Raided ' + nationName + ': +' + loot + ' gold', '#ffaa44');
      },
      onDefeat: function(battle) {
        rv.reputation = max(-100, rv.reputation - 10);
        // Lose all deployed soldiers
        lg.army = lg.army.filter(u => u.garrison);
        addFloatingText(width / 2, height * 0.2, 'Raid failed! Army lost.', '#ff4444');
        addNotification('Raid on ' + nationName + ' failed', '#ff4444');
      },
    }
  );
}

function launchInvasionOnNation(nationKey) {
  let rv = state.nations[nationKey];
  if (!rv) return;
  let lg = state.legia;
  if (!lg || !lg.army) return;

  // Deploy entire non-garrison army (or all if player confirms)
  let deployed = lg.army.filter(u => !u.garrison);
  if (deployed.length < 5) {
    // Auto-deploy all soldiers for invasion
    lg.army.forEach(u => u.garrison = false);
    deployed = lg.army.slice();
  }

  if (deployed.length === 0) { addFloatingText(width / 2, height * 0.3, 'No army to invade with!', '#ff6644'); return; }

  // Stronger defenders for invasion
  let defCount = max(5, rv.military + rv.level * 2);
  let defenders = [];
  for (let i = 0; i < defCount; i++) {
    let hp = 25 + rv.level * 8;
    let types = ['legionary', 'legionary', 'legionary', 'archer'];
    if (rv.level >= 3) types.push('cavalry');
    let t = types[floor(random(types.length))];
    let tDef = UNIT_TYPES[t] || UNIT_TYPES.legionary;
    defenders.push({ type: t, hp: hp, maxHp: hp, damage: tDef.damage + rv.level, speed: tDef.speed });
  }

  let nationName = typeof getNationName === 'function' ? getNationName(nationKey) : nationKey;
  startArmyBattle(
    deployed.map(u => ({ ...u })),
    defenders,
    {
      type: 'invade',
      nationKey: nationKey,
      nationName: nationName,
      onVictory: function(battle) {
        // Conquest! Nation becomes vassal
        rv.military = 0;
        rv.defeated = true;
        rv.vassal = true;
        rv.tributePerDay = 5 + rv.level * 2;
        rv.reputation = -100;
        let survived = battle.attackers.filter(u => u.alive);
        lg.army = []; // reset
        for (let s of survived) {
          s.garrison = true;
          lg.army.push(s);
        }
        addFloatingText(width / 2, height * 0.15, nationName + ' CONQUERED!', '#ffdd44');
        addFloatingText(width / 2, height * 0.22, 'They are now your vassal. Tribute: ' + rv.tributePerDay + 'g/day', '#88cc88');
        addNotification(nationName + ' is now a vassal state!', '#ffdd44');
        if (typeof checkAllVictoryConditions === 'function') checkAllVictoryConditions();
      },
      onDefeat: function(battle) {
        rv.reputation = max(-100, rv.reputation - 20);
        // Lose all deployed soldiers
        lg.army = lg.army.filter(u => u.garrison);
        addFloatingText(width / 2, height * 0.2, 'Invasion failed!', '#ff4444');
        addNotification('Invasion of ' + nationName + ' failed — army destroyed', '#ff4444');
      },
    }
  );
}

// ─── ISLAND DEFENSE (auto-battle when raided) ──────────────────────────

function startIslandDefense(raidSize, nationKey) {
  let lg = state.legia;
  let garrison = (lg && lg.army) ? lg.army.filter(u => u.garrison) : [];
  if (garrison.length === 0) return false; // no garrison, fallback to old raid system

  let rv = state.nations && state.nations[nationKey];
  let nationLevel = rv ? rv.level : 1;
  let attackers = [];
  for (let i = 0; i < raidSize; i++) {
    let hp = 20 + nationLevel * 5;
    attackers.push({ type: 'legionary', hp: hp, maxHp: hp, damage: 4 + nationLevel, speed: 1.0 });
  }

  let data = getCastrumLevelData();
  let defMult = data ? data.defenseMult : 1.0;
  // Add watchtower bonus damage
  let towers = (state.buildings || []).filter(b => b.type === 'watchtower' || b.type === 'guardtower');
  let towerDmg = towers.length * 3;

  // Buff garrison with defense mult
  let defenderUnits = garrison.map(u => ({
    ...u,
    hp: floor(u.hp * defMult),
    maxHp: floor(u.maxHp * defMult),
    damage: u.damage + towerDmg,
  }));

  let nationName = typeof getNationName === 'function' ? getNationName(nationKey) : nationKey;
  startArmyBattle(
    attackers, // attackers are the raiders
    defenderUnits, // defenders are our garrison
    {
      type: 'defend',
      nationKey: nationKey,
      nationName: nationName,
      onVictory: function(battle) {
        // Raiders won — they steal stuff (bad for us)
        let stolen = floor(10 + nationLevel * 5);
        state.gold = max(0, state.gold - stolen);
        if (rv) rv.gold += stolen;
        addFloatingText(width / 2, height * 0.2, 'Defense failed! -' + stolen + 'g stolen', '#ff4444');
        // Remove dead garrison
        let garrisonAlive = battle.defenders.filter(u => u.alive);
        lg.army = lg.army.filter(u => !u.garrison);
        for (let s of garrisonAlive) { s.garrison = true; lg.army.push(s); }
      },
      onDefeat: function(battle) {
        // Raiders defeated (victory for us! — "defeat" is attacker losing)
        let repBonus = 5 + raidSize;
        if (rv) rv.reputation = max(-100, rv.reputation - 5);
        state.gold += floor(5 + raidSize * 3);
        addFloatingText(width / 2, height * 0.2, 'Garrison defended! +' + floor(5 + raidSize * 3) + 'g', '#88ff88');
        addNotification('Island defended! Your garrison repelled the raid.', '#88ff88');
        if (typeof grantXP === 'function') grantXP(20 + raidSize * 5);
        // Restore garrison survivors
        let garrisonAlive = battle.defenders.filter(u => u.alive);
        lg.army = lg.army.filter(u => !u.garrison);
        for (let s of garrisonAlive) { s.garrison = true; lg.army.push(s); }
      },
    }
  );
  return true;
}

// ─── VASSAL TRIBUTE (called from daily tick) ────────────────────────────

function collectVassalTribute() {
  if (!state.nations) return;
  let total = 0;
  for (let k of Object.keys(state.nations)) {
    let rv = state.nations[k];
    if (rv && rv.vassal && rv.tributePerDay) {
      state.gold += rv.tributePerDay;
      total += rv.tributePerDay;
    }
  }
  if (total > 0) {
    addNotification('Vassal tribute: +' + total + 'g', '#ddaa44');
  }
}

// ─── DEPLOY / GARRISON TOGGLE ───────────────────────────────────────────

function toggleGarrison(index) {
  let lg = state.legia;
  if (!lg || !lg.army || index < 0 || index >= lg.army.length) return;
  lg.army[index].garrison = !lg.army[index].garrison;
}

function setAllGarrison(val) {
  let lg = state.legia;
  if (!lg || !lg.army) return;
  lg.army.forEach(u => u.garrison = val);
}

function getGarrisonCount() {
  if (!state.legia || !state.legia.army) return 0;
  return state.legia.army.filter(u => u.garrison).length;
}

function getDeployedCount() {
  if (!state.legia || !state.legia.army) return 0;
  return state.legia.army.filter(u => !u.garrison).length;
}

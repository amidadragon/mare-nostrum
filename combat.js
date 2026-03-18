// MARE NOSTRUM — Combat Enhancement System
// Loaded after sketch.js. Uses global state.

// ─── XP & LEVELING ──────────────────────────────────────────────────────────

function grantXP(amount) {
  let p = state.player;
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
};

// Cooldown state (frames remaining)
let _skillCooldowns = { whirlwind: 0, shieldBash: 0, heal: 0 };

function activateSkill(name) {
  if (!state.conquest.active && !state.adventure.active) return;
  if (_skillCooldowns[name] > 0) return;
  let p = state.player;

  switch (name) {
    case 'whirlwind': {
      _skillCooldowns.whirlwind = COMBAT_SKILLS.whirlwind.cooldownMax;
      p.slashPhase = 12;
      let enemies = state.conquest.active ? state.conquest.enemies : (state.adventure.enemies || []);
      for (let e of enemies) {
        if (e.state === 'dying' || e.state === 'dead') continue;
        let d = dist(p.x, p.y, e.x, e.y);
        if (d <= 50 + (e.size || 10)) {
          let dmg = 20;
          e.hp -= dmg;
          e.flashTimer = 8;
          e.state = 'stagger';
          e.stateTimer = 10;
          let kba = atan2(e.y - p.y, e.x - p.x);
          e.x += cos(kba) * 8;
          e.y += sin(kba) * 8;
          _spawnDamageNumber(e.x, e.y, dmg, '#ff8800');
          _registerComboHit();
        }
      }
      spawnParticles(p.x, p.y, 'combat', 10);
      triggerScreenShake(4, 8);
      if (typeof snd !== 'undefined' && snd) snd.playSFX('whirlwind');
      addFloatingText(w2sX(p.x), w2sY(p.y) - 35, 'WHIRLWIND!', '#ff8800');
      break;
    }
    case 'shieldBash': {
      _skillCooldowns.shieldBash = COMBAT_SKILLS.shieldBash.cooldownMax;
      let enemies = state.conquest.active ? state.conquest.enemies : (state.adventure.enemies || []);
      let nearest = null, nearD = Infinity;
      for (let e of enemies) {
        if (e.state === 'dying' || e.state === 'dead') continue;
        let d = dist(p.x, p.y, e.x, e.y);
        if (d < nearD) { nearD = d; nearest = e; }
      }
      if (nearest && nearD < 60) {
        nearest.stunTimer = 60; // 60 frames stun
        nearest.state = 'stagger';
        nearest.stateTimer = 60;
        nearest.flashTimer = 10;
        let kba = atan2(nearest.y - p.y, nearest.x - p.x);
        nearest.x += cos(kba) * 12;
        nearest.y += sin(kba) * 12;
        _spawnDamageNumber(nearest.x, nearest.y, 0, '#44aaff');
        addFloatingText(w2sX(nearest.x), w2sY(nearest.y) - 30, 'STUNNED!', '#44aaff');
        spawnParticles(nearest.x, nearest.y, 'combat', 6);
        triggerScreenShake(3, 6);
      }
      break;
    }
    case 'heal': {
      _skillCooldowns.heal = COMBAT_SKILLS.heal.cooldownMax;
      let healed = min(30, p.maxHp - p.hp);
      p.hp = min(p.maxHp, p.hp + 30);
      spawnParticles(p.x, p.y, 'divine', 8);
      addFloatingText(w2sX(p.x), w2sY(p.y) - 30, '+' + healed + ' HP', '#44ff66');
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

let _dodgeState = { timer: 0, cooldown: 0, invincFrames: 0, dx: 0, dy: 0 };

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
  spawnParticles(p.x, p.y, 'dash', 6);
  if (typeof snd !== 'undefined' && snd) snd.playSFX('dodge');
  return true;
}

// ─── COMBO COUNTER ──────────────────────────────────────────────────────────

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
    x: w2sX(wx) + random(-8, 8),
    y: w2sY(wy) - 15,
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

  // Combo timer
  if (_comboTimer > 0) {
    _comboTimer -= dt;
    if (_comboTimer <= 0) _comboCount = 0;
  }

  // Damage number decay
  for (let i = _damageNumbers.length - 1; i >= 0; i--) {
    let dn = _damageNumbers[i];
    dn.y += dn.vy;
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
    grantXP(killed * 25);
    for (let i = 0; i < killed; i++) _registerComboHit();
  }
  _combatLastEnemyCount = currentCount;
}
var _combatLastEnemyCount = 0;

// ─── MAIN DRAW (called from sketch.js hook) ─────────────────────────────────

function drawCombatOverlay() {
  push();

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

  // Damage numbers
  for (let dn of _damageNumbers) {
    let alpha = map(dn.life, 0, 45, 0, 255);
    let c = color(dn.col);
    fill(red(c), green(c), blue(c), alpha);
    noStroke();
    textSize(10 + (45 - dn.life) * 0.05);
    textAlign(CENTER, CENTER);
    text(dn.text, dn.x, dn.y);
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

    // Skill cooldown indicators (bottom-left, above controls bar)
    let skY = height - 52;
    let skX = 12;
    textAlign(LEFT, TOP);
    for (let name in COMBAT_SKILLS) {
      let sk = COMBAT_SKILLS[name];
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

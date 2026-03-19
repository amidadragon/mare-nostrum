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
      spawnParticles(p.x, p.y, 'combat', 18);
      triggerScreenShake(7, 14);
      _slowMoFrames = max(_slowMoFrames, 4);
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
        _cameraPush.timer = 5;
        _cameraPush.dx = cos(kba) * 3;
        _cameraPush.dy = sin(kba) * 3;
        if (typeof snd !== 'undefined' && snd) snd.playSFX('shield_bash');
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

// Companion energy regen bonus from Loyal Bond (extra per 60 frames)
function getCompanionRegenBonus() {
  let lv = getSkillLevel('companionRegen');
  return lv >= 2 ? 0.05 : lv >= 1 ? 0.033 : 0;
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

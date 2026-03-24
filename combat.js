// MARE NOSTRUM — Combat Enhancement System
// Loaded after sketch.js. Uses global state.

// ─── XP & LEVELING ──────────────────────────────────────────────────────────

// Level-up popup state
var _levelUpPopup = { active: false, timer: 0, level: 0, hpGain: 0, atkGain: 0, defGain: 0, skillPt: 0 };

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
    // Stat scaling per level
    let oldMaxHp = p.maxHp;
    p.maxHp = 100 + level * 10;
    let hpGain = p.maxHp - oldMaxHp;
    p.hp = min(p.hp + hpGain, p.maxHp);
    p.levelAtk = level;  // +1 attack per level, added on top of weapon
    p.defense = floor(2 + level * 0.5); // base defense stat
    // Show level-up popup
    _levelUpPopup = { active: true, timer: 180, level: level, hpGain: hpGain, atkGain: 1, defGain: 0.5, skillPt: 1 };
    spawnParticles(p.x, p.y, 'divine', 8);
    triggerScreenShake(4, 10);
    if (typeof snd !== 'undefined' && snd) snd.playSFX('skill_unlock');
    needed = level * 100;
    _lvlUps++;
  }
  p.level = level;

  // Grant centurion 50% XP from combat when deployed
  if (state.centurion && state.centurion.task !== 'idle' && state.companionPets && state.companionPets.centurion) {
    let cenXp = floor(amount * 0.5);
    if (cenXp > 0) grantCenturionCombatXP(cenXp);
  }
}

// ─── CENTURION COMBAT XP ─────────────────────────────────────────────────────

function grantCenturionCombatXP(amount) {
  let cp = state.companionPets.centurion;
  if (cp.level >= 10) return;
  // Scale down combat XP to match companion XP curve (companionXpForLevel uses small values)
  let scaledAmt = max(1, floor(amount / 5));
  let leveled = (typeof addCompanionXp === 'function') ? addCompanionXp(cp, scaledAmt) : false;
  if (leveled) {
    // Scale centurion stats per level
    let cen = state.centurion;
    cen.maxHp = floor(120 * (1 + (cp.level - 1) * 0.15));
    cen.hp = min(cen.hp + floor(120 * 0.15), cen.maxHp);
    cen.attackDamage = floor(12 * (1 + (cp.level - 1) * 0.10));
    cen.speed = 2.8 * (1 + (cp.level - 1) * 0.05);
  }
  if (leveled) {
    let ft = (typeof getFactionTerms === 'function') ? getFactionTerms() : { leader: 'Centurion' };
    addFloatingText(w2sX(state.centurion.x), w2sY(state.centurion.y) - 38, ft.leader + ' Level ' + cp.level + '!', '#ffcc44');
    spawnParticles(state.centurion.x, state.centurion.y, 'divine', 6);
    if (typeof snd !== 'undefined' && snd) snd.playSFX('skill_unlock');
    // Unlock special ability at level 5
    if (cp.level >= 5 && !cp.ability) {
      cp.ability = getCenturionAbility();
      addFloatingText(w2sX(state.centurion.x), w2sY(state.centurion.y) - 55, 'NEW: ' + cp.ability.name + '!', '#ff88ff');
    }
  }
}

// Faction-specific centurion level 5 abilities
function getCenturionAbility() {
  let fk = state.faction || 'rome';
  switch (fk) {
    case 'rome':      return { name: 'Inspire', type: 'inspire', desc: 'Nearby soldiers +20% damage for 10s' };
    case 'carthage':  return { name: 'Trade Wisdom', type: 'trade_wisdom', desc: 'Merchant prices 10% better' };
    case 'egypt':     return { name: 'Blessing of Ra', type: 'blessing_ra', desc: 'Crystal recharge 20% faster' };
    case 'greece':    return { name: 'Philosophy', type: 'philosophy', desc: 'Research speed +15%' };
    case 'seapeople': return { name: 'Sea Sense', type: 'sea_sense', desc: 'Fishing yield +30%' };
    case 'persia':    return { name: 'Royal Decree', type: 'royal_decree', desc: 'Colony income +20%' };
    case 'phoenicia': return { name: 'Navigator', type: 'navigator', desc: 'Sailing speed +20%' };
    case 'gaul':      return { name: 'War Cry', type: 'war_cry', desc: 'All enemies flee for 3 seconds' };
    default:          return { name: 'Inspire', type: 'inspire', desc: 'Nearby soldiers +20% damage for 10s' };
  }
}

// Get centurion ability bonus multipliers (called from game systems)
function getCenturionAbilityBonus(type) {
  let cp = state.companionPets && state.companionPets.centurion;
  if (!cp || !cp.ability || cp.ability.type !== type) return 0;
  return 1;
}

// Total player attack damage (weapon base + level bonus + equipment)
function getPlayerAttackDamage() {
  let p = state.player;
  let base = p.attackDamage || 15;
  let lvlBonus = p.levelAtk || 0;
  let equipBonus = (typeof getEquipBonus === 'function') ? getEquipBonus('atk') : 0;
  let total = base + lvlBonus + equipBonus;
  if (typeof getWeatherEffects === 'function') total = floor(total * getWeatherEffects().combatMult);
  return total;
}

// Recalculate centurion combat stats from companion level (called on any centurion level-up)
function applyCenturionLevelStats() {
  let cp = state.companionPets && state.companionPets.centurion;
  if (!cp) return;
  let cen = state.centurion;
  cen.maxHp = floor(120 * (1 + (cp.level - 1) * 0.15));
  cen.hp = min(cen.hp + floor(120 * 0.15), cen.maxHp);
  cen.attackDamage = floor(12 * (1 + (cp.level - 1) * 0.10));
  cen.speed = 2.8 * (1 + (cp.level - 1) * 0.05);
  // Unlock ability at level 5
  if (cp.level >= 5 && !cp.ability) {
    cp.ability = getCenturionAbility();
    addFloatingText(w2sX(cen.x), w2sY(cen.y) - 55, 'NEW: ' + cp.ability.name + '!', '#ff88ff');
  }
}

// ─── PLAYER DEFENSE ──────────────────────────────────────────────────────────

// Total flat damage reduction from armor equipment + defense stat
function getPlayerDefenseReduction() {
  let p = state.player;
  let armorR = [0, 3, 6, 10][p.armor] || 0;
  let defR = floor((p.defense || 0) * 0.5); // defense stat: every 2 points = 1 flat reduction
  let equipDef = (typeof getEquipBonus === 'function') ? getEquipBonus('def') : 0;
  return armorR + defR + equipDef;
}

// ─── LEVEL-UP POPUP DRAW ─────────────────────────────────────────────────────

function drawLevelUpPopup() {
  if (!_levelUpPopup.active) return;
  _levelUpPopup.timer--;
  if (_levelUpPopup.timer <= 0) { _levelUpPopup.active = false; return; }

  let t = _levelUpPopup.timer;
  let fadeIn = min(1, (180 - t) / 15);
  let fadeOut = min(1, t / 20);
  let alpha = min(fadeIn, fadeOut);

  let popW = 220, popH = 130;
  let popX = width / 2 - popW / 2;
  let popY = height * 0.2;

  push();
  drawingContext.globalAlpha = alpha;

  // Faction-themed border
  let fk = state.faction || 'rome';
  let borderCol = fk === 'rome' ? [196, 64, 50] : fk === 'carthage' ? [180, 140, 40] :
    fk === 'egypt' ? [64, 176, 160] : fk === 'greece' ? [80, 144, 192] :
    fk === 'seapeople' ? [42, 138, 106] : fk === 'persia' ? [106, 42, 138] :
    fk === 'phoenicia' ? [138, 16, 80] : [90, 64, 32];

  // Outer border glow
  noFill(); strokeWeight(3); stroke(borderCol[0], borderCol[1], borderCol[2], 180 * alpha);
  rect(popX - 2, popY - 2, popW + 4, popH + 4, 6);

  // Dark panel
  noStroke(); fill(15, 15, 25, 220 * alpha);
  rect(popX, popY, popW, popH, 4);

  // Inner border
  strokeWeight(1); stroke(borderCol[0], borderCol[1], borderCol[2], 120 * alpha); noFill();
  rect(popX + 3, popY + 3, popW - 6, popH - 6, 3);

  noStroke();
  // "LEVEL UP!" title in gold
  textAlign(CENTER, TOP);
  textFont('Cinzel, Georgia, serif');
  fill(255, 220, 80, 255 * alpha);
  textSize(18);
  text('LEVEL UP!', width / 2, popY + 10);

  // Level number
  fill(240, 240, 255, 255 * alpha);
  textSize(14);
  text('Level ' + _levelUpPopup.level, width / 2, popY + 34);

  // Stat increases
  textFont('monospace');
  textSize(10);
  let ly = popY + 58;
  fill(100, 220, 100, 255 * alpha);
  text('+' + _levelUpPopup.hpGain + ' HP', width / 2 - 55, ly);
  fill(255, 140, 80, 255 * alpha);
  text('+1 ATK', width / 2, ly);
  fill(120, 160, 255, 255 * alpha);
  text('+0.5 DEF', width / 2 + 55, ly);

  // Skill point
  fill(255, 220, 80, 255 * alpha);
  textSize(11);
  text('+1 Skill Point', width / 2, ly + 18);

  textAlign(LEFT, TOP);
  textFont('monospace');
  drawingContext.globalAlpha = 1;
  pop();
}

// ─── CENTURION LEVEL-UP NOTIFICATION ─────────────────────────────────────────
var _centurionLevelPopup = { active: false, timer: 0, level: 0, name: '', abilityName: '' };

function drawCenturionLevelPopup() {
  if (!_centurionLevelPopup.active) return;
  _centurionLevelPopup.timer--;
  if (_centurionLevelPopup.timer <= 0) { _centurionLevelPopup.active = false; return; }
  // Handled by floating text already — this is just the ability unlock banner
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
  if (!(state.conquest && state.conquest.active)) return;
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
      let enemies = (state.conquest && state.conquest.active) ? (state.conquest.enemies || []) : [];
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
      let enemies = (state.conquest && state.conquest.active) ? (state.conquest.enemies || []) : [];
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
      let enemies2 = (state.conquest && state.conquest.active) ? (state.conquest.enemies || []) : [];
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
  if (!(state.conquest && state.conquest.active)) return false;
  if (state.conquest && state.conquest.buildMode) return false;
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
  if (!(state.conquest && state.conquest.active)) return false;
  let p = state.player;
  let angle = getFacingAngle();
  _dodgeState.timer = 8;
  _dodgeState.cooldown = 120; // 2 seconds
  _dodgeState.invincFrames = 20;
  _dodgeState.dx = cos(angle) * 5; // 40px over 8 frames
  _dodgeState.dy = sin(angle) * 5;
  p.invincTimer = max(p.invincTimer, 20);
  _dodgeState.motionBlur = 1;
  // Greece passive: dodge goes further
  if (typeof getFactionDodgeDistMult === 'function') {
    let mult = getFactionDodgeDistMult();
    _dodgeState.dx *= mult;
    _dodgeState.dy *= mult;
  }
  // Greece passive: enable dodge counter window
  if (typeof onPlayerDodge === 'function') onPlayerDodge();
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

  // Faction combat update
  if (typeof updateFactionCombat === 'function') updateFactionCombat(dt);

  // Enemy stun timers
  let enemies = (state.conquest && state.conquest.active) ? (state.conquest.enemies || []) : [];
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
    let dangerLevel = (state.conquest && state.conquest.active) ? (state.conquest.dangerLevel || 1) : 1;
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
  if (_fortifyTimer > 0 && ((state.conquest && state.conquest.active))) {
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
  if (_battleCryTimer > 0 && ((state.conquest && state.conquest.active))) {
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
  let enemies = (state.conquest && state.conquest.active) ? (state.conquest.enemies || []) : [];
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
  if ((state.conquest && state.conquest.active)) {
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

  let panelW = min(460, width - 20), panelH = min(400, height - 20);
  let panelX = max(10, width / 2 - panelW / 2);
  let panelY = max(10, height / 2 - panelH / 2);

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

  let panelW = min(460, width - 20), panelH = min(400, height - 20);
  let panelX = max(10, width / 2 - panelW / 2);
  let panelY = max(10, height / 2 - panelH / 2);

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

// ─── ARENA PROJECTILES (removed — arena system scrapped) ────────────────

var _arenaProjectiles = [];
function updateArenaProjectiles() {}
function drawArenaProjectiles() {}
function showArenaSummary() {}
function drawArenaSummaryOverlay() {}


// ═══════════════════════════════════════════════════════════════════════════
// ─── MILITARY SYSTEM — Unit Types, Army Battles, Raids, Conquests ───────
// ═══════════════════════════════════════════════════════════════════════════

const UNIT_TYPES = {
  legionary:  { name: 'Legionary',       hp: 20, damage: 5,  speed: 1.0, cost: 10, minLevel: 1, ranged: false, desc: 'Sturdy infantry', upkeep: 2 },
  archer:     { name: 'Archer',          hp: 12, damage: 8,  speed: 1.0, cost: 15, minLevel: 2, ranged: true,  desc: 'Ranged attacker', upkeep: 3 },
  cavalry:    { name: 'Cavalry',         hp: 30, damage: 7,  speed: 2.0, cost: 25, minLevel: 3, ranged: false, desc: 'Fast charger', upkeep: 4 },
  siege_ram:  { name: 'Siege Ram',       hp: 50, damage: 15, speed: 0.4, cost: 40, minLevel: 4, ranged: false, desc: 'Destroys buildings', vsBuildingMult: 3, upkeep: 5 },
  centurion:  { name: 'Elite Centurion', hp: 40, damage: 12, speed: 1.2, cost: 50, minLevel: 5, ranged: false, desc: 'Buffs nearby +20%', aura: 0.2, upkeep: 6 },
  flag_bearer: { name: 'Flag Bearer', hp: 30, damage: 3, speed: 1.0, cost: 40, minLevel: 5, ranged: false, desc: 'Morale +10% dmg nearby', moraleBonus: 0.10, upkeep: 4, unique: true },
};

function getUnitDisplayName(type) {
  let ft = (typeof getFactionTerms === 'function') ? getFactionTerms() : null;
  if (!ft) return UNIT_TYPES[type] ? UNIT_TYPES[type].name : type;
  if (type === 'legionary') return ft.soldier;
  if (type === 'centurion') return 'Elite ' + ft.elite;
  if (type === 'flag_bearer') return 'Standard Bearer';
  return UNIT_TYPES[type] ? UNIT_TYPES[type].name : type;
}

const CASTRUM_LEVELS = [
  null, // index 0 unused
  { name: 'Barracks',         maxSoldiers: 10, damageMult: 1.0, hpMult: 1.0, defenseMult: 1.0, unlocks: ['legionary'] },
  { name: 'Armory',           maxSoldiers: 20, damageMult: 1.2, hpMult: 1.0, defenseMult: 1.0, unlocks: ['legionary','archer'],  cost: { gold: 100, stone: 20 } },
  { name: 'War Academy',      maxSoldiers: 30, damageMult: 1.2, hpMult: 1.3, defenseMult: 1.0, unlocks: ['legionary','archer','cavalry'], cost: { gold: 300, stone: 50, ironOre: 10 } },
  { name: 'Fortress',         maxSoldiers: 40, damageMult: 1.2, hpMult: 1.3, defenseMult: 1.5, unlocks: ['legionary','archer','cavalry','siege_ram'], cost: { gold: 500, stone: 80, ironOre: 20 } },
  { name: 'Imperial Legion',  maxSoldiers: 50, damageMult: 1.4, hpMult: 1.3, defenseMult: 1.5, unlocks: ['legionary','archer','cavalry','siege_ram','centurion','flag_bearer'], cost: { gold: 800, stone: 100, ironOre: 30, crystals: 10 } },
];

const CASTRUM_LV5_NAMES = {
  rome: 'Imperial Legion', carthage: 'Sacred Host', egypt: 'Royal Guard',
  greece: 'Grand Phalanx', seapeople: 'Storm Fleet', persia: 'Immortal Corps',
  phoenicia: 'Tyrian Armada', gaul: 'Grand War Band'
};

function getCastrumLevelName(lv) {
  let data = CASTRUM_LEVELS[min(lv, 5)];
  if (!data) return '';
  if (lv === 5) return CASTRUM_LV5_NAMES[state.faction || 'rome'] || data.name;
  return data.name;
}

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
  if (!state.legia || !state.legia.army) return 0;
  let total = 0;
  for (let u of state.legia.army) {
    let def = UNIT_TYPES[u.type];
    total += (def && def.upkeep) ? def.upkeep : 2;
  }
  return total;
}

function trainUnit(type) {
  let lg = state.legia;
  if (!lg || lg.castrumLevel < 1) return false;
  let def = UNIT_TYPES[type];
  if (!def) return false;
  if (lg.castrumLevel < def.minLevel) {
    addFloatingText(width / 2, height * 0.3, 'Need ' + getFactionTerms().barracks + ' level ' + def.minLevel, '#ff6644');
    return false;
  }
  if (def.unique && lg.army.some(u => u.type === type)) {
    addFloatingText(width / 2, height * 0.3, 'Only one ' + def.name + ' allowed!', '#ff6644');
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
  state.gold = max(0, state.gold - def.cost);
  let data = getCastrumLevelData();
  let maxHp = floor(def.hp * (data.hpMult || 1));
  let damage = floor(def.damage * (data.damageMult || 1));
  lg.army.push({
    type: type,
    hp: maxHp,
    maxHp: maxHp,
    damage: damage,
    speed: def.speed,
    x: 0, y: 0, // position set by formation system
    state: 'idle',
    attackTimer: 0,
    garrison: false, // all units follow player in formation
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
    state.gold = max(0, state.gold - cost);
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

// Counter multiplier — rock/paper/scissors between unit types
function getCounterMultiplier(attackerType, defenderType) {
  if (attackerType === 'cavalry' && defenderType === 'archer') return 1.5;
  if (attackerType === 'archer' && defenderType === 'legionary') return 1.5;
  if (attackerType === 'legionary' && defenderType === 'cavalry') return 1.5;
  if (attackerType === 'cavalry' && defenderType === 'siege_ram') return 2.0;
  if (attackerType === 'centurion') return 1.15;
  return 1.0;
}

// Counter info for recruitment UI
const UNIT_COUNTER_INFO = {
  legionary: { strong: 'Cavalry', weak: 'Archers', color: '#88ccff' },
  archer:    { strong: 'Infantry', weak: 'Cavalry', color: '#88ff88' },
  cavalry:   { strong: 'Archers, Siege', weak: 'Infantry', color: '#ffcc66' },
  siege_ram: { strong: 'Buildings', weak: 'Cavalry', color: '#ff8866' },
  centurion: { strong: 'All (+15%)', weak: 'None', color: '#ddaaff' },
};

// Floating damage numbers for army battles (screen-space, not world-space)
var _battleDamageNumbers = [];
function _spawnBattleDamageNumber(sx, sy, amount, col, big) {
  _battleDamageNumbers.push({
    x: sx, y: sy,
    ox: random(-6, 6),
    drift: 0,
    text: '-' + amount,
    col: col || '#ff4444',
    life: 40,
    vy: -1.0,
    big: big || false,
  });
}

// Formation definitions
const FORMATIONS = {
  line:      { name: 'Battle Line',   desc: 'Balanced formation',        defBonus: 1.0, atkBonus: 1.0, speedBonus: 1.0 },
  shield:    { name: 'Shield Wall',   desc: '+30% defense, -20% speed',  defBonus: 1.3, atkBonus: 1.0, speedBonus: 0.8 },
  wedge:     { name: 'Wedge',         desc: '+30% attack, -15% defense', defBonus: 0.85, atkBonus: 1.3, speedBonus: 1.1 },
  skirmish:  { name: 'Skirmish',      desc: '+20% speed, spread out',    defBonus: 1.0, atkBonus: 0.9, speedBonus: 1.2 },
  testudo:   { name: 'Testudo',       desc: '+50% defense, -40% speed',  defBonus: 1.5, atkBonus: 0.8, speedBonus: 0.6 },
};
const FORMATION_KEYS = ['line', 'shield', 'wedge', 'skirmish', 'testudo'];

var _armyBattle = null; // active battle state or null

function _getFormationPositions(formationKey, count, side) {
  let positions = [];
  let baseX = side === 'left' ? 80 : width - 80;
  let centerY = height / 2;
  let dir = side === 'left' ? 1 : -1;

  switch (formationKey) {
    case 'shield': // tight rows, packed
      for (let i = 0; i < count; i++) {
        let row = floor(i / 6);
        let col = i % 6;
        positions.push({ x: baseX + dir * row * 15, y: centerY - 45 + col * 15 });
      }
      break;
    case 'wedge': // V-shape pointing at enemy
      for (let i = 0; i < count; i++) {
        let row = floor(i / 2);
        let odd = i % 2;
        let spread = row * 12;
        positions.push({ x: baseX + dir * row * 18, y: centerY + (odd ? spread : -spread) });
      }
      break;
    case 'skirmish': // spread far apart
      for (let i = 0; i < count; i++) {
        let row = floor(i / 3);
        let col = i % 3;
        positions.push({ x: baseX + dir * row * 30 + random(-5, 5), y: centerY - 60 + col * 40 + random(-5, 5) });
      }
      break;
    case 'testudo': // tight block
      for (let i = 0; i < count; i++) {
        let row = floor(i / 4);
        let col = i % 4;
        positions.push({ x: baseX + dir * row * 12, y: centerY - 24 + col * 12 });
      }
      break;
    default: // 'line' — spread evenly horizontal
      for (let i = 0; i < count; i++) {
        let row = floor(i / 5);
        let col = i % 5;
        positions.push({ x: baseX + dir * row * 20, y: centerY - 60 + col * 30 });
      }
      break;
  }
  return positions;
}

function _applyFormationToUnits(units, formationKey, side) {
  let positions = _getFormationPositions(formationKey, units.length, side);
  for (let i = 0; i < units.length; i++) {
    if (positions[i]) {
      units[i].x = positions[i].x;
      units[i].y = positions[i].y;
    }
  }
}

function startArmyBattle(attackers, defenders, context) {
  // context: { type: 'raid'|'invade'|'defend', nationKey, onVictory, onDefeat }
  // attackers/defenders: arrays of { type, hp, maxHp, damage, speed }
  _battleDamageNumbers = [];
  let battle = {
    phase: 'deploy', // deploy -> fighting -> result
    timer: 0,
    formation: 'line', // player-selected formation
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
    chargeReady: false, // set true when player clicks CHARGE
  };
  // Apply default formation positions
  _applyFormationToUnits(battle.attackers, 'line', 'left');
  _armyBattle = battle;
}

function updateArmyBattle(dt) {
  let b = _armyBattle;
  if (!b) return;

  b.timer += dt;

  if (b.phase === 'deploy') {
    if (b.chargeReady) { b.phase = 'fighting'; b.timer = 0; }
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

  // Check for centurion aura buffs + flag bearer morale bonus
  let atkHasCenturion = atk.some(u => u.type === 'centurion');
  let defHasCenturion = def.some(u => u.type === 'centurion');
  let atkHasBearer = atk.some(u => u.type === 'flag_bearer');
  let defHasBearer = def.some(u => u.type === 'flag_bearer');
  let atkAura = (atkHasCenturion ? 1.2 : 1.0) * (atkHasBearer ? 1.1 : 1.0);
  let defAura = (defHasCenturion ? 1.2 : 1.0) * (defHasBearer ? 1.1 : 1.0);

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
    let form = b.formation ? FORMATIONS[b.formation] : null;
    for (let t of targets) {
      if (!t.alive) continue;
      if (abs(t.x - pr.x) < 12 && abs(t.y - pr.y) < 12) {
        let defMult = (form && t.side === 'left') ? form.defBonus : 1.0;
        let finalDmg = max(1, floor(pr.damage / defMult));
        t.hp -= finalDmg;
        t.flashTimer = 8;
        _spawnBattleDamageNumber(t.x, t.y, finalDmg, pr.isCounter ? '#ffdd44' : '#ff4444', pr.isCounter);
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

  // Formation bonuses (only for player's attackers in army battles)
  let form = battle.formation ? FORMATIONS[battle.formation] : null;
  let isPlayerSide = (units === battle.attackers);
  let fAtkMult = (form && isPlayerSide) ? form.atkBonus : 1.0;
  let fSpdMult = (form && isPlayerSide) ? form.speedBonus : 1.0;

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
      let spd = (u.speed || 1) * 1.5 * fSpdMult * dt;
      u.x += (dx / d) * spd;
      u.y += (dy / d) * spd;
    } else if (u.attackTimer <= 0) {
      // Counter multiplier
      let counterMult = getCounterMultiplier(u.type, nearest.type);
      let isCounter = counterMult > 1.0;
      // Attack with formation + counter bonuses
      let dmg = floor((u.damage || 5) * auraMult * fAtkMult * counterMult);
      // Formation defense bonus reduces incoming damage on player side
      if (form && !isPlayerSide) {
        // Enemies hitting player units — apply player's defense bonus
        // (handled on the receiving end below)
      }
      if (isRanged) {
        let dx = nearest.x - u.x, dy = nearest.y - u.y;
        let d = max(1, sqrt(dx * dx + dy * dy));
        battle.projectiles.push({
          x: u.x, y: u.y,
          vx: (dx / d) * 4, vy: (dy / d) * 4,
          damage: dmg, life: 60, side: u.side,
          isCounter: isCounter, attackerType: u.type,
        });
      } else {
        // Apply formation defense bonus to target
        let defMult = 1.0;
        if (form && nearest.side === 'left') defMult = form.defBonus;
        let finalDmg = max(1, floor(dmg / defMult));
        nearest.hp -= finalDmg;
        nearest.flashTimer = 8;
        _spawnBattleDamageNumber(nearest.x, nearest.y, finalDmg, isCounter ? '#ffdd44' : '#ff4444', isCounter);
        if (nearest.hp <= 0) {
          nearest.alive = false; nearest.hp = 0;
          if (nearest.type === 'flag_bearer' && nearest.side === 'left' && state.legia) {
            state.legia.morale = max(0, (state.legia.morale || 100) - 30);
            addFloatingText(width / 2, height * 0.25, 'Standard fallen! Morale -30!', '#ff4444');
            state.legia._fallenBanner = true;
          }
        }
      }
      u.attackTimer = isRanged ? 45 : 30;
    }
  }
}

function drawArmyBattle() {
  let b = _armyBattle;
  if (!b) return;

  push();
  noStroke();

  // Nation island battle background — show faction-themed terrain
  let nKey = b.context.nationKey;
  let isNationBattle = nKey && (b.context.type === 'raid' || b.context.type === 'invade');
  if (isNationBattle) {
    _drawNationBattleBackground(nKey, b);
  } else {
    // Default dark overlay
    fill(15, 10, 8, 230);
    rect(0, 0, width, height);
  }

  // Title
  fill(220, 185, 80); textAlign(CENTER, TOP); textSize(14);
  let titleText = b.context.type === 'defend' ? 'ISLAND DEFENSE' :
                  b.context.type === 'raid' ? 'RAIDING ' + (b.context.nationName || 'Enemy') :
                  'INVASION OF ' + (b.context.nationName || 'Enemy');
  text(titleText, width / 2, 10);

  if (b.phase === 'deploy') {
    _drawFormationPicker(b);
  }

  // Draw ground — faction-tinted if nation battle
  if (isNationBattle) {
    let fac = typeof FACTIONS !== 'undefined' ? FACTIONS[nKey] : null;
    let groundCol = fac ? fac.style.ground : [60, 50, 35];
    fill(groundCol[0], groundCol[1], groundCol[2]); noStroke();
    rect(0, height - 40, width, 40);
    fill(groundCol[0] + 10, groundCol[1] + 10, groundCol[2] + 10);
    rect(0, height - 42, width, 4);
  } else {
    fill(60, 50, 35); noStroke();
    rect(0, height - 40, width, 40);
    fill(70, 60, 40);
    rect(0, height - 42, width, 4);
  }

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

  // Battle damage numbers
  for (let i = _battleDamageNumbers.length - 1; i >= 0; i--) {
    let dn = _battleDamageNumbers[i];
    dn.drift += dn.vy;
    dn.life -= 1;
    if (dn.life <= 0) { _battleDamageNumbers.splice(i, 1); continue; }
    let alpha = map(dn.life, 0, 40, 0, 255);
    let c = color(dn.col);
    fill(red(c), green(c), blue(c), alpha);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(dn.big ? 12 : 9);
    text(dn.text, dn.x + dn.ox, dn.y - 15 + dn.drift);
  }

  // Active formation label during fighting
  if (b.phase === 'fighting' && b.formation && b.formation !== 'line') {
    let form = FORMATIONS[b.formation];
    fill(220, 185, 80, 150); textSize(9); textAlign(LEFT, TOP);
    text('Formation: ' + form.name, 10, 46);
  }

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

// Formation picker UI during deploy phase
function _drawFormationPicker(b) {
  let panelX = 10, panelY = 50;
  let panelW = 145, btnH = 42;
  let selected = b.formation || 'line';

  // Panel background
  fill(20, 15, 10, 220); stroke(100, 80, 50, 150); strokeWeight(1);
  rect(panelX, panelY, panelW, FORMATION_KEYS.length * (btnH + 4) + 60, 4);
  noStroke();

  // Title
  fill(220, 185, 80); textAlign(CENTER, TOP); textSize(11);
  textFont('Cinzel, Georgia, serif');
  text('FORMATION', panelX + panelW / 2, panelY + 6);
  textFont('monospace');

  let by = panelY + 24;
  // Store button rects for click handling
  b._formationBtns = [];

  for (let key of FORMATION_KEYS) {
    let form = FORMATIONS[key];
    let isSelected = (key === selected);
    let bx = panelX + 6, bw = panelW - 12;

    // Button background
    if (isSelected) {
      stroke(220, 185, 80); strokeWeight(2);
      fill(50, 40, 25, 200);
    } else {
      stroke(80, 65, 40, 100); strokeWeight(1);
      fill(30, 25, 15, 180);
    }
    rect(bx, by, bw, btnH, 3);
    noStroke();

    // Formation mini-diagram
    _drawFormationIcon(bx + 12, by + btnH / 2, key, isSelected);

    // Name
    fill(isSelected ? color(240, 210, 100) : color(170, 150, 110));
    textSize(10); textAlign(LEFT, TOP);
    text(form.name, bx + 28, by + 5);

    // Description
    fill(isSelected ? color(180, 170, 140) : color(120, 110, 90));
    textSize(8);
    text(form.desc, bx + 28, by + 18);

    // Bonus numbers
    if (form.atkBonus !== 1.0 || form.defBonus !== 1.0 || form.speedBonus !== 1.0) {
      let parts = [];
      if (form.atkBonus !== 1.0) parts.push('ATK:' + floor(form.atkBonus * 100) + '%');
      if (form.defBonus !== 1.0) parts.push('DEF:' + floor(form.defBonus * 100) + '%');
      if (form.speedBonus !== 1.0) parts.push('SPD:' + floor(form.speedBonus * 100) + '%');
      fill(isSelected ? color(160, 180, 120) : color(100, 110, 80));
      textSize(7);
      text(parts.join(' '), bx + 28, by + 30);
    }

    b._formationBtns.push({ key: key, x: bx, y: by, w: bw, h: btnH });
    by += btnH + 4;
  }

  // CHARGE button
  let chargeY = by + 4;
  let chargeW = panelW - 12, chargeH = 28;
  let chargeX = panelX + 6;
  let pulse = sin(frameCount * 0.08) * 20;
  fill(160 + pulse, 60, 30); stroke(220, 185, 80); strokeWeight(2);
  rect(chargeX, chargeY, chargeW, chargeH, 4);
  noStroke();
  fill(255, 240, 200); textSize(13); textAlign(CENTER, CENTER);
  textFont('Cinzel, Georgia, serif');
  text('CHARGE!', chargeX + chargeW / 2, chargeY + chargeH / 2);
  textFont('monospace');

  b._chargeBtn = { x: chargeX, y: chargeY, w: chargeW, h: chargeH };

  // Hint text
  fill(100, 90, 70); textSize(8); textAlign(CENTER, TOP);
  text('Choose formation, then charge', panelX + panelW / 2, chargeY + chargeH + 6);
}

function _drawFormationIcon(cx, cy, key, selected) {
  let col = selected ? color(220, 200, 120) : color(120, 110, 90);
  fill(col); noStroke();
  let dots;
  switch (key) {
    case 'line':
      dots = [[-6,0],[-3,0],[0,0],[3,0],[6,0]];
      break;
    case 'shield':
      dots = [[-4,-3],[0,-3],[4,-3],[-4,0],[0,0],[4,0],[-4,3],[0,3],[4,3]];
      break;
    case 'wedge':
      dots = [[6,0],[3,-3],[3,3],[0,-6],[0,6]];
      break;
    case 'skirmish':
      dots = [[-6,-5],[0,0],[6,-5],[-6,5],[6,5]];
      break;
    case 'testudo':
      dots = [[-3,-3],[0,-3],[3,-3],[-3,0],[0,0],[3,0],[-3,3],[0,3],[3,3]];
      break;
    default:
      dots = [[0,0]];
  }
  for (let d of dots) ellipse(cx + d[0], cy + d[1], 3, 3);
}

// Handle clicks during army battle deploy phase
function handleArmyBattleClick(mx, my) {
  let b = _armyBattle;
  if (!b || b.phase !== 'deploy') return false;

  // Check formation buttons
  if (b._formationBtns) {
    for (let btn of b._formationBtns) {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        b.formation = btn.key;
        _applyFormationToUnits(b.attackers, btn.key, 'left');
        if (typeof snd !== 'undefined' && snd) snd.playSFX('click');
        return true;
      }
    }
  }

  // Check charge button
  if (b._chargeBtn) {
    let c = b._chargeBtn;
    if (mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) {
      b.chargeReady = true;
      if (typeof snd !== 'undefined' && snd) snd.playSFX('battle_cry');
      return true;
    }
  }

  return false;
}

function _drawNationBattleBackground(nKey, battle) {
  let fac = typeof FACTIONS !== 'undefined' ? FACTIONS[nKey] : null;
  let bannerCol = fac ? fac.bannerColor : [150, 100, 60];
  let style = fac ? fac.style : { wall: [200, 180, 150], roof: [160, 100, 50], ground: [130, 110, 80] };
  let groundH = height - 40;

  // Sky gradient — faction tinted
  for (let y = 0; y < groundH; y++) {
    let t = y / groundH;
    let r = lerp(30 + bannerCol[0] * 0.1, 60 + bannerCol[0] * 0.15, t);
    let g = lerp(40 + bannerCol[1] * 0.08, 70 + bannerCol[1] * 0.1, t);
    let b2 = lerp(60 + bannerCol[2] * 0.06, 50 + bannerCol[2] * 0.08, t);
    stroke(r, g, b2, 200); line(0, y, width, y);
  }
  noStroke();

  // Distant hills/terrain
  fill(style.ground[0] * 0.5, style.ground[1] * 0.5, style.ground[2] * 0.5, 120);
  beginShape();
  vertex(0, groundH);
  for (let x = 0; x <= width; x += 20) {
    vertex(x, groundH - 60 - sin(x * 0.01 + 1.5) * 25 - cos(x * 0.007) * 15);
  }
  vertex(width, groundH);
  endShape(CLOSE);

  // Buildings in the background — get damaged as battle progresses
  let numB = 5;
  let battleProgress = battle.phase === 'result' ? 1 : min(1, battle.timer / 600);
  let isInvasion = battle.context.type === 'invade';
  for (let i = 0; i < numB; i++) {
    let bx = width * 0.3 + i * (width * 0.1);
    let bw = 22 + (i * 7 % 10), bh = 30 + (i * 11 % 15);
    let by = groundH - bh;
    // Damage: buildings crack/crumble during invasion
    let damage = isInvasion ? battleProgress * (0.3 + (i * 0.13 % 0.5)) : 0;
    // Wall
    fill(style.wall[0] * (1 - damage * 0.3), style.wall[1] * (1 - damage * 0.3), style.wall[2] * (1 - damage * 0.3));
    rect(bx, by + damage * 5, bw, bh - damage * 5, 1);
    // Roof
    fill(style.roof[0] * (1 - damage * 0.4), style.roof[1] * (1 - damage * 0.4), style.roof[2] * (1 - damage * 0.4));
    rect(bx - 2, by - 4 + damage * 5, bw + 4, 4);
    // Damage cracks
    if (damage > 0.3) {
      stroke(40, 30, 20, damage * 200); strokeWeight(1);
      line(bx + bw * 0.3, by + bh * 0.2, bx + bw * 0.5, by + bh * 0.6);
      line(bx + bw * 0.6, by + bh * 0.1, bx + bw * 0.4, by + bh * 0.4);
      noStroke();
    }
    // Fire on heavily damaged buildings (invasion)
    if (damage > 0.5 && isInvasion) {
      let firePulse = sin(frameCount * 0.15 + i * 2);
      fill(255, 120 + firePulse * 30, 30, 120 + firePulse * 40);
      ellipse(bx + bw * 0.5, by + 5, 12 + firePulse * 4, 18 + firePulse * 6);
      fill(255, 200, 60, 80);
      ellipse(bx + bw * 0.5, by, 8, 10);
    }
  }

  // Nation banner — replaced with player banner if invasion victory
  let flagX = width * 0.7, flagY = groundH - 70;
  fill(bannerCol[0] * 0.5, bannerCol[1] * 0.5, bannerCol[2] * 0.5);
  rect(flagX, flagY, 3, 50);
  if (battle.result === 'victory' && isInvasion) {
    // Player's faction flag
    let pFac = typeof state !== 'undefined' && state.faction ? FACTIONS[state.faction] : null;
    let pCol = pFac ? pFac.bannerColor : [175, 28, 28];
    fill(pCol[0], pCol[1], pCol[2]);
    rect(flagX + 3, flagY + 2, 16, 10);
    fill(pCol[0] + 40, pCol[1] + 40, pCol[2] + 40);
    rect(flagX + 5, flagY + 4, 12, 6);
  } else {
    fill(bannerCol[0], bannerCol[1], bannerCol[2]);
    rect(flagX + 3, flagY + 2, 16, 10);
    fill(bannerCol[0] + 30, bannerCol[1] + 30, bannerCol[2] + 30);
    rect(flagX + 5, flagY + 4, 12, 6);
  }

  // Dock on left (attacker spawn point)
  fill(100, 75, 45);
  rect(20, groundH - 8, 60, 8, 1);
  rect(30, groundH - 4, 4, 12);
  rect(70, groundH - 4, 4, 12);

  // Smoke/atmosphere
  fill(80, 70, 60, 20 + sin(frameCount * 0.02) * 10);
  rect(0, 0, width, groundH * 0.3);
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
    } else if (u.type === 'flag_bearer') {
      // Body
      fill(160, 50, 40);
      rect(-3, -8, 6, 10);
      // Head
      fill(195, 165, 130);
      rect(-2, -12, 4, 4);
      // Helmet
      fill(150, 140, 120);
      rect(-3, -13, 6, 3);
      // Banner pole
      fill(120, 100, 60);
      rect(3, -28, 2, 22);
      // Banner cloth with flutter
      let bFlutter = sin(frameCount * 0.08 + ux * 0.1) * 2;
      let fk = state.faction || 'rome';
      let bfm = (typeof FACTION_MILITARY !== 'undefined') ? (FACTION_MILITARY[fk] || FACTION_MILITARY.rome) : { cape: [160,50,40] };
      fill(bfm.cape[0], bfm.cape[1], bfm.cape[2]);
      quad(5, -26, 15 + bFlutter, -24, 13 + bFlutter, -16, 5, -18);
      // Legs
      fill(120, 40, 30);
      rect(-2, 2, 2, 3);
      rect(1, 2, 2, 3);
      // Morale aura glow
      noFill();
      stroke(255, 220, 100, 40 + sin(frameCount * 0.06) * 20);
      strokeWeight(1);
      ellipse(0, -2, 24, 20);
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
        if (typeof getFactionData === 'function') loot = floor(loot * (getFactionData().raidLootMult || 1));
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
        if (typeof createNationColony === 'function') createNationColony(nationKey);
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
  // Adjacency: watchtower near wall = +20% tower damage
  let hasWallAdj = towers.some(t => typeof hasAdjacencyBonus === 'function' && hasAdjacencyBonus(t, 'watchtower'));
  if (hasWallAdj) towerDmg = floor(towerDmg * 1.2);

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

// ═══════════════════════════════════════════════════════════════════════════
// ─── FACTION COMBAT SYSTEM — Unique fighting styles per faction ─────────
// ═══════════════════════════════════════════════════════════════════════════

// Faction ability definitions (separate from skill tree)
const FACTION_ABILITIES = {
  rome: {
    q: { name: 'Shield Bash', maxCD: 480, desc: 'Stun + knockback', color: '#cc4444' },
    r: { name: 'Testudo', maxCD: 900, desc: '80% dmg reduction 3s', color: '#bb8833' },
    passive: 'Disciplina',
    passiveDesc: '+5% dmg per nearby soldier',
  },
  carthage: {
    q: { name: 'Fire Pot', maxCD: 600, desc: 'AoE burn 3s', color: '#ff8800' },
    r: { name: 'Mercenary Call', maxCD: 1800, desc: 'Summon 2 mercs 15s', color: '#aa44cc' },
    passive: "Merchant's Cunning",
    passiveDesc: '+30% enemy gold drops',
  },
  egypt: {
    q: { name: 'Scarab Swarm', maxCD: 720, desc: 'AoE damage 4s', color: '#44bbaa' },
    r: { name: 'Anubis Blessing', maxCD: 1500, desc: 'Full heal + 2s invincibility', color: '#ddaa22' },
    passive: 'Divine Favor',
    passiveDesc: '+30% crystal recharge',
  },
  greece: {
    q: { name: 'Olympic Dash', maxCD: 360, desc: 'Dash through enemies', color: '#4488dd' },
    r: { name: 'Phalanx Stance', maxCD: 720, desc: 'Next 3 attacks 2x dmg', color: '#ffffff' },
    passive: 'Agility',
    passiveDesc: '+15% move speed',
  },
  seapeople: {
    q: { name: 'Harpoon Throw', maxCD: 240, desc: 'Pull nearest enemy toward you', color: '#66aacc' },
    r: { name: 'Tidal Wave', maxCD: 720, desc: 'Knockback + slow all nearby enemies', color: '#3388bb' },
    passive: 'Sea Raider',
    passiveDesc: '+50% raid loot, +30% sail speed',
  },
  persia: {
    q: { name: 'Immortal Guard', maxCD: 360, desc: 'Block next 3 attacks', color: '#ddbb44' },
    r: { name: "Satrap's Gold", maxCD: 900, desc: 'Spend gold to convert an enemy', color: '#ffcc22' },
    passive: 'Imperial Administration',
    passiveDesc: '+25% colony income, extra officer slot',
  },
  phoenicia: {
    q: { name: 'Greek Fire', maxCD: 300, desc: 'Fire zone dealing damage over time', color: '#ff6622' },
    r: { name: 'Trade Fleet', maxCD: 1200, desc: 'Call in a supply drop of resources', color: '#88ccff' },
    passive: 'Master Traders',
    passiveDesc: '+30% trade income, 2x discovery speed',
  },
  gaul: {
    q: { name: 'Berserker Rage', maxCD: 480, desc: '+50% damage, -30% defense 5s', color: '#cc2222' },
    r: { name: 'Forest Ambush', maxCD: 840, desc: 'Stealth 3s, first attack 3x damage', color: '#44aa44' },
    passive: 'Wild Warriors',
    passiveDesc: '+20% combat damage, +50% forest resources',
  },
};

// Faction ability state
var _factionAbilities = { q: { cooldown: 0 }, r: { cooldown: 0 } };

// Faction-specific active state
var _testudoTimer = 0;        // Rome R: damage reduction timer
var _phalanxCharges = 0;      // Greece R: remaining 2x damage attacks
var _phalanxTimer = 0;        // Greece R: can't move timer
var _scarabSwarm = null;      // Egypt Q: { x, y, timer, tickTimer }
var _firePots = [];            // Carthage Q: [{ x, y, timer, tickTimer, radius }]
var _mercenaries = [];         // Carthage R: [{ x, y, hp, maxHp, timer, attackTimer, target }]
var _playerProjectiles = [];   // Carthage javelins, Egypt solar beams
var _factionCombo = { count: 0, timer: 0, triggered: false };
var _egyptAttackCounter = 0;  // Egypt: track attacks for crystal cost
var _greekDodgeCounter = false; // Greece: recently dodged, next hit = crit
var _greekDodgeWindow = 0;     // frames remaining for dodge-counter crit
var _immortalGuardCharges = 0; // Persia Q: incoming hits blocked
var _berserkTimer = 0;         // Gaul Q: +50% dmg, -30% def timer
var _stealthTimer = 0;         // Gaul R: stealth timer
var _stealthFirstStrike = false; // Gaul R: next attack deals 3x
var _greekFireZones = [];      // Phoenicia Q: [{ x, y, timer, tickTimer, radius }]
var _convertedEnemies = [];    // Persia R: [{ enemy, timer }]
var _tidalWaveSlow = [];       // Sea People R: [{ enemy, timer }]

// Initialize faction abilities (call on game start / load)
function initFactionAbilities() {
  _factionAbilities = { q: { cooldown: 0 }, r: { cooldown: 0 } };
  _testudoTimer = 0;
  _phalanxCharges = 0;
  _phalanxTimer = 0;
  _scarabSwarm = null;
  _firePots = [];
  _mercenaries = [];
  _playerProjectiles = [];
  _factionCombo = { count: 0, timer: 0, triggered: false };
  _egyptAttackCounter = 0;
  _greekDodgeCounter = false;
  _greekDodgeWindow = 0;
  _immortalGuardCharges = 0;
  _berserkTimer = 0;
  _stealthTimer = 0;
  _stealthFirstStrike = false;
  _greekFireZones = [];
  _convertedEnemies = [];
  _tidalWaveSlow = [];
}

// Get faction combat data
function getFactionCombatData() {
  let f = state.faction || 'rome';
  return FACTION_ABILITIES[f] || FACTION_ABILITIES.rome;
}

// ─── FACTION Q ABILITY ──────────────────────────────────────────────────

function activateFactionQ() {
  if (!(state.conquest && state.conquest.active)) return;
  if (_factionAbilities.q.cooldown > 0) return;
  let p = state.player;
  let f = state.faction || 'rome';
  let enemies = (state.conquest && state.conquest.active) ? (state.conquest.enemies || []) : [];

  switch (f) {
    case 'rome': {
      // SHIELD BASH — stun nearest enemy 1.5s, knockback
      _factionAbilities.q.cooldown = FACTION_ABILITIES.rome.q.maxCD;
      let nearest = null, nearD = Infinity;
      for (let e of enemies) {
        if (e.state === 'dying' || e.state === 'dead') continue;
        let d = dist(p.x, p.y, e.x, e.y);
        if (d < nearD) { nearD = d; nearest = e; }
      }
      if (nearest && nearD < 60) {
        nearest.stunTimer = 90; // 1.5s
        nearest.state = 'stagger';
        nearest.stateTimer = 90;
        nearest.flashTimer = 10;
        let kba = atan2(nearest.y - p.y, nearest.x - p.x);
        nearest.x += cos(kba) * 18;
        nearest.y += sin(kba) * 18;
        nearest.hp -= 10;
        _spawnDamageNumber(nearest.x, nearest.y, 10, '#cc4444');
        addFloatingText(w2sX(nearest.x), w2sY(nearest.y) - 30, 'SHIELD BASH!', '#cc4444');
        spawnParticles(nearest.x, nearest.y, 'combat', 8);
        triggerScreenShake(5, 10);
        _cameraPush.timer = 5;
        _cameraPush.dx = cos(kba) * 4;
        _cameraPush.dy = sin(kba) * 4;
        // Shield flash particles
        for (let i = 0; i < 5; i++) {
          particles.push({
            x: p.x + cos(kba) * 12, y: p.y + sin(kba) * 12,
            vx: cos(kba + random(-0.5, 0.5)) * random(1, 3),
            vy: sin(kba + random(-0.5, 0.5)) * random(1, 3),
            life: random(10, 20), maxLife: 20, type: 'burst', size: random(2, 4),
            r: 220, g: 200, b: 120, world: true,
          });
        }
      }
      if (typeof snd !== 'undefined' && snd) snd.playSFX('shield_bash');
      break;
    }
    case 'carthage': {
      // FIRE POT — AoE incendiary at facing direction
      _factionAbilities.q.cooldown = FACTION_ABILITIES.carthage.q.maxCD;
      let fAngle = getFacingAngle();
      let potX = p.x + cos(fAngle) * 80;
      let potY = p.y + sin(fAngle) * 80;
      _firePots.push({
        x: potX, y: potY, timer: 180, tickTimer: 0, radius: 40,
      });
      addFloatingText(w2sX(potX), w2sY(potY) - 20, 'FIRE POT!', '#ff8800');
      spawnParticles(potX, potY, 'combat', 10);
      triggerScreenShake(3, 6);
      if (typeof snd !== 'undefined' && snd) snd.playSFX('whirlwind');
      break;
    }
    case 'egypt': {
      // SCARAB SWARM — AoE damage cloud around cursor direction
      _factionAbilities.q.cooldown = FACTION_ABILITIES.egypt.q.maxCD;
      let fAngle2 = getFacingAngle();
      let swarmX = p.x + cos(fAngle2) * 60;
      let swarmY = p.y + sin(fAngle2) * 60;
      _scarabSwarm = { x: swarmX, y: swarmY, timer: 240, tickTimer: 0, radius: 45 };
      addFloatingText(w2sX(swarmX), w2sY(swarmY) - 20, 'SCARAB SWARM!', '#44bbaa');
      if (typeof snd !== 'undefined' && snd) snd.playSFX('whirlwind');
      break;
    }
    case 'greece': {
      // OLYMPIC DASH — dash through enemies dealing damage, i-frames
      _factionAbilities.q.cooldown = FACTION_ABILITIES.greece.q.maxCD;
      let dashAngle = getFacingAngle();
      let dashDist = 100;
      let oldX = p.x, oldY = p.y;
      p.x += cos(dashAngle) * dashDist;
      p.y += sin(dashAngle) * dashDist;
      p.invincTimer = max(p.invincTimer, 18);
      // Damage enemies along dash path
      for (let e of enemies) {
        if (e.state === 'dying' || e.state === 'dead') continue;
        // Check if enemy is near the dash line
        let ex = e.x - oldX, ey = e.y - oldY;
        let dx = p.x - oldX, dy = p.y - oldY;
        let t = max(0, min(1, (ex * dx + ey * dy) / (dx * dx + dy * dy)));
        let closestX = oldX + t * dx, closestY = oldY + t * dy;
        let d = dist(closestX, closestY, e.x, e.y);
        if (d < 30 + (e.size || 10)) {
          let dmg = 20;
          e.hp -= dmg;
          e.flashTimer = 8;
          e.state = 'stagger';
          e.stateTimer = 12;
          _spawnDamageNumber(e.x, e.y, dmg, '#4488dd');
          _registerComboHit();
        }
      }
      // Blue dash trail
      for (let i = 0; i < 8; i++) {
        let t = i / 8;
        let tx = lerp(oldX, p.x, t);
        let ty = lerp(oldY, p.y, t);
        particles.push({
          x: tx + random(-4, 4), y: ty + random(-4, 4),
          vx: random(-0.5, 0.5), vy: random(-0.5, 0.5),
          life: random(15, 25), maxLife: 25, type: 'burst', size: random(2, 4),
          r: 68, g: 136, b: 221, world: true,
        });
      }
      spawnParticles(p.x, p.y, 'dash', 8);
      triggerScreenShake(4, 8);
      addFloatingText(w2sX(p.x), w2sY(p.y) - 30, 'OLYMPIC DASH!', '#4488dd');
      if (typeof snd !== 'undefined' && snd) snd.playSFX('dodge');
      break;
    }
    case 'seapeople': {
      // HARPOON THROW — pull nearest enemy toward player
      _factionAbilities.q.cooldown = FACTION_ABILITIES.seapeople.q.maxCD;
      let nearest = null, nearD = Infinity;
      for (let e of enemies) {
        if (e.state === 'dying' || e.state === 'dead') continue;
        let d = dist(p.x, p.y, e.x, e.y);
        if (d < nearD && d < 200) { nearD = d; nearest = e; }
      }
      if (nearest) {
        let kba = atan2(p.y - nearest.y, p.x - nearest.x);
        nearest.x += cos(kba) * 80;
        nearest.y += sin(kba) * 80;
        nearest.hp -= 10;
        nearest.flashTimer = 8;
        nearest.state = 'stagger';
        nearest.stateTimer = 15;
        _spawnDamageNumber(nearest.x, nearest.y, 10, '#66aacc');
        // Harpoon line particles
        for (let i = 0; i < 6; i++) {
          let t = i / 6;
          particles.push({
            x: lerp(p.x, nearest.x, t), y: lerp(p.y, nearest.y, t),
            vx: random(-0.3, 0.3), vy: random(-0.3, 0.3),
            life: random(10, 18), maxLife: 18, type: 'burst', size: random(2, 3),
            r: 102, g: 170, b: 204, world: true,
          });
        }
        addFloatingText(w2sX(p.x), w2sY(p.y) - 30, 'HARPOON!', '#66aacc');
      }
      triggerScreenShake(4, 8);
      if (typeof snd !== 'undefined' && snd) snd.playSFX('whirlwind');
      break;
    }
    case 'persia': {
      // IMMORTAL GUARD — block next 3 incoming attacks
      _factionAbilities.q.cooldown = FACTION_ABILITIES.persia.q.maxCD;
      _immortalGuardCharges = 3;
      addFloatingText(w2sX(p.x), w2sY(p.y) - 30, 'IMMORTAL GUARD!', '#ddbb44');
      // Golden shield particles
      for (let i = 0; i < 6; i++) {
        let a = random(0, TWO_PI);
        particles.push({
          x: p.x + cos(a) * 12, y: p.y + sin(a) * 12,
          vx: cos(a) * random(0.5, 1.5), vy: sin(a) * random(0.5, 1.5),
          life: random(20, 35), maxLife: 35, type: 'burst', size: random(2, 4),
          r: 221, g: 187, b: 68, world: true,
        });
      }
      spawnParticles(p.x, p.y, 'divine', 6);
      triggerScreenShake(2, 4);
      if (typeof snd !== 'undefined' && snd) snd.playSFX('shield_bash');
      break;
    }
    case 'phoenicia': {
      // GREEK FIRE — fire zone at nearest enemy or facing direction
      _factionAbilities.q.cooldown = FACTION_ABILITIES.phoenicia.q.maxCD;
      let fAngle3 = getFacingAngle();
      let fireX = p.x + cos(fAngle3) * 80;
      let fireY = p.y + sin(fAngle3) * 80;
      // Target nearest enemy if close enough
      for (let e of enemies) {
        if (e.state === 'dying' || e.state === 'dead') continue;
        let d = dist(p.x, p.y, e.x, e.y);
        if (d < 120) { fireX = e.x; fireY = e.y; break; }
      }
      _greekFireZones.push({ x: fireX, y: fireY, timer: 240, tickTimer: 0, radius: 35 });
      addFloatingText(w2sX(fireX), w2sY(fireY) - 20, 'GREEK FIRE!', '#ff6622');
      spawnParticles(fireX, fireY, 'combat', 10);
      triggerScreenShake(3, 6);
      if (typeof snd !== 'undefined' && snd) snd.playSFX('whirlwind');
      break;
    }
    case 'gaul': {
      // BERSERKER RAGE — +50% damage, -30% defense for 5 seconds
      _factionAbilities.q.cooldown = FACTION_ABILITIES.gaul.q.maxCD;
      _berserkTimer = 300; // 5s at 60fps
      addFloatingText(w2sX(p.x), w2sY(p.y) - 30, 'BERSERKER RAGE!', '#cc2222');
      spawnParticles(p.x, p.y, 'combat', 12);
      triggerScreenShake(6, 12);
      // Red rage particles
      for (let i = 0; i < 8; i++) {
        let a = random(0, TWO_PI);
        particles.push({
          x: p.x + cos(a) * 8, y: p.y + sin(a) * 8,
          vx: cos(a) * random(1, 2.5), vy: sin(a) * random(1, 2.5),
          life: random(15, 25), maxLife: 25, type: 'burst', size: random(2, 5),
          r: 220, g: 40, b: 30, world: true,
        });
      }
      if (typeof snd !== 'undefined' && snd) snd.playSFX('whirlwind');
      break;
    }
  }
}

// ─── FACTION R ABILITY ──────────────────────────────────────────────────

function activateFactionR() {
  if (!(state.conquest && state.conquest.active)) return;
  if (_factionAbilities.r.cooldown > 0) return;
  let p = state.player;
  let f = state.faction || 'rome';

  switch (f) {
    case 'rome': {
      // TESTUDO — 80% damage reduction, can't move, 3s
      _factionAbilities.r.cooldown = FACTION_ABILITIES.rome.r.maxCD;
      _testudoTimer = 180; // 3s at 60fps
      addFloatingText(w2sX(p.x), w2sY(p.y) - 35, 'TESTUDO!', '#bb8833');
      spawnParticles(p.x, p.y, 'divine', 10);
      triggerScreenShake(2, 4);
      if (typeof snd !== 'undefined' && snd) snd.playSFX('shield_bash');
      break;
    }
    case 'carthage': {
      // MERCENARY CALL — summon 2 temporary fighters
      _factionAbilities.r.cooldown = FACTION_ABILITIES.carthage.r.maxCD;
      for (let i = 0; i < 2; i++) {
        let a = getFacingAngle() + (i === 0 ? -0.5 : 0.5);
        _mercenaries.push({
          x: p.x + cos(a) * 30,
          y: p.y + sin(a) * 30,
          hp: 40, maxHp: 40,
          timer: 900, // 15s
          attackTimer: 0,
          target: null,
          facing: p.facing,
        });
      }
      addFloatingText(w2sX(p.x), w2sY(p.y) - 35, 'MERCENARIES!', '#aa44cc');
      spawnParticles(p.x, p.y, 'divine', 8);
      triggerScreenShake(3, 6);
      if (typeof snd !== 'undefined' && snd) snd.playSFX('skill_unlock');
      break;
    }
    case 'egypt': {
      // ANUBIS BLESSING — full heal + 2s invincibility
      _factionAbilities.r.cooldown = FACTION_ABILITIES.egypt.r.maxCD;
      let healed = p.maxHp - p.hp;
      p.hp = p.maxHp;
      p.invincTimer = max(p.invincTimer, 120); // 2s
      addFloatingText(w2sX(p.x), w2sY(p.y) - 35, 'ANUBIS BLESSING!', '#ddaa22');
      if (healed > 0) addFloatingText(w2sX(p.x), w2sY(p.y) - 50, '+' + healed + ' HP', '#44ff66');
      spawnParticles(p.x, p.y, 'divine', 15);
      triggerScreenShake(4, 8);
      // Ankh particles
      for (let i = 0; i < 6; i++) {
        let a = random(0, TWO_PI);
        particles.push({
          x: p.x + cos(a) * random(5, 20), y: p.y + sin(a) * random(5, 20),
          vx: cos(a) * 0.5, vy: -random(0.8, 1.5),
          life: random(30, 50), maxLife: 50, type: 'burst', size: random(3, 5),
          r: 221, g: 170, b: 34, world: true,
        });
      }
      if (typeof snd !== 'undefined' && snd) snd.playSFX('heart');
      break;
    }
    case 'greece': {
      // PHALANX STANCE — next 3 attacks deal 2x damage + longer range, can't move 2s
      _factionAbilities.r.cooldown = FACTION_ABILITIES.greece.r.maxCD;
      _phalanxCharges = 3;
      _phalanxTimer = 120; // 2s can't move
      addFloatingText(w2sX(p.x), w2sY(p.y) - 35, 'PHALANX STANCE!', '#ffffff');
      spawnParticles(p.x, p.y, 'combat', 8);
      triggerScreenShake(3, 6);
      // White spear glow particles
      for (let i = 0; i < 4; i++) {
        particles.push({
          x: p.x + random(-8, 8), y: p.y + random(-15, -5),
          vx: random(-0.3, 0.3), vy: -random(0.5, 1),
          life: random(20, 35), maxLife: 35, type: 'burst', size: random(2, 4),
          r: 240, g: 240, b: 255, world: true,
        });
      }
      if (typeof snd !== 'undefined' && snd) snd.playSFX('shield_bash');
      break;
    }
    case 'seapeople': {
      // TIDAL WAVE — AoE knockback + slow all nearby enemies
      _factionAbilities.r.cooldown = FACTION_ABILITIES.seapeople.r.maxCD;
      let enemies = (state.conquest && state.conquest.active) ? (state.conquest.enemies || []) : [];
      for (let e of enemies) {
        if (e.state === 'dying' || e.state === 'dead') continue;
        let d = dist(p.x, p.y, e.x, e.y);
        if (d < 150) {
          let kba = atan2(e.y - p.y, e.x - p.x);
          e.x += cos(kba) * 100;
          e.y += sin(kba) * 100;
          e.hp -= 15;
          e.flashTimer = 10;
          e.state = 'stagger';
          e.stateTimer = 20;
          _spawnDamageNumber(e.x, e.y, 15, '#3388bb');
          _tidalWaveSlow.push({ enemy: e, timer: 180 }); // 3s slow
        }
      }
      for (let i = 0; i < 12; i++) {
        let a = (TWO_PI / 12) * i;
        particles.push({
          x: p.x, y: p.y,
          vx: cos(a) * random(2, 4), vy: sin(a) * random(2, 4),
          life: random(18, 30), maxLife: 30, type: 'burst', size: random(3, 6),
          r: 51, g: 136, b: 187, world: true,
        });
      }
      addFloatingText(w2sX(p.x), w2sY(p.y) - 35, 'TIDAL WAVE!', '#3388bb');
      triggerScreenShake(8, 16);
      if (typeof snd !== 'undefined' && snd) snd.playSFX('whirlwind');
      break;
    }
    case 'persia': {
      // SATRAP'S GOLD — spend 50 gold to convert nearest enemy
      let gold = state.resources ? (state.resources.gold || 0) : 0;
      if (gold < 50) {
        addFloatingText(w2sX(p.x), w2sY(p.y) - 30, 'Not enough gold!', '#ff4444');
        return;
      }
      _factionAbilities.r.cooldown = FACTION_ABILITIES.persia.r.maxCD;
      if (state.resources) state.resources.gold -= 50;
      let enemies2 = (state.conquest && state.conquest.active) ? (state.conquest.enemies || []) : [];
      let nearest = null, nearD = Infinity;
      for (let e of enemies2) {
        if (e.state === 'dying' || e.state === 'dead' || e._converted) continue;
        let d = dist(p.x, p.y, e.x, e.y);
        if (d < nearD) { nearD = d; nearest = e; }
      }
      if (nearest) {
        nearest._converted = true;
        _convertedEnemies.push({ enemy: nearest, timer: 900 }); // 15s
        addFloatingText(w2sX(nearest.x), w2sY(nearest.y) - 30, 'CONVERTED!', '#ffcc22');
        spawnParticles(nearest.x, nearest.y, 'divine', 8);
      }
      addFloatingText(w2sX(p.x), w2sY(p.y) - 35, "SATRAP'S GOLD!", '#ffcc22');
      triggerScreenShake(3, 6);
      if (typeof snd !== 'undefined' && snd) snd.playSFX('skill_unlock');
      break;
    }
    case 'phoenicia': {
      // TRADE FLEET — grant resources scaled by level
      _factionAbilities.r.cooldown = FACTION_ABILITIES.phoenicia.r.maxCD;
      let lvl = (state.player.level || 1);
      let scale = 1 + (lvl / 10);
      let woodAmt = floor(30 * scale);
      let stoneAmt = floor(20 * scale);
      let ironAmt = floor(10 * scale);
      let crystalAmt = floor(5 * scale);
      if (state.resources) {
        state.resources.wood = (state.resources.wood || 0) + woodAmt;
        state.resources.stone = (state.resources.stone || 0) + stoneAmt;
        state.resources.iron = (state.resources.iron || 0) + ironAmt;
        state.resources.crystals = (state.resources.crystals || 0) + crystalAmt;
      }
      addFloatingText(w2sX(p.x), w2sY(p.y) - 50, 'TRADE FLEET!', '#88ccff');
      addFloatingText(w2sX(p.x) - 30, w2sY(p.y) - 35, '+' + woodAmt + ' wood', '#88aa44');
      addFloatingText(w2sX(p.x) + 30, w2sY(p.y) - 35, '+' + stoneAmt + ' stone', '#aaaaaa');
      for (let i = 0; i < 6; i++) {
        particles.push({
          x: p.x + random(-40, 40), y: p.y - random(30, 60),
          vx: random(-0.2, 0.2), vy: random(0.5, 1.2),
          life: random(30, 50), maxLife: 50, type: 'burst', size: random(2, 4),
          r: 136, g: 204, b: 255, world: true,
        });
      }
      triggerScreenShake(2, 4);
      if (typeof snd !== 'undefined' && snd) snd.playSFX('skill_unlock');
      break;
    }
    case 'gaul': {
      // FOREST AMBUSH — stealth 3s, first attack 3x damage
      _factionAbilities.r.cooldown = FACTION_ABILITIES.gaul.r.maxCD;
      _stealthTimer = 180; // 3s at 60fps
      _stealthFirstStrike = true;
      addFloatingText(w2sX(p.x), w2sY(p.y) - 30, 'FOREST AMBUSH!', '#44aa44');
      for (let i = 0; i < 8; i++) {
        let a = random(0, TWO_PI);
        particles.push({
          x: p.x + cos(a) * random(5, 20), y: p.y + sin(a) * random(5, 20),
          vx: cos(a) * random(0.3, 1), vy: -random(0.5, 1.5),
          life: random(20, 35), maxLife: 35, type: 'burst', size: random(2, 4),
          r: 60, g: 140, b: 50, world: true,
        });
      }
      // Clear enemy aggro
      let enemies3 = (state.conquest && state.conquest.active) ? (state.conquest.enemies || []) : [];
      for (let e of enemies3) {
        if (e.state === 'chasing' || e.state === 'attacking') {
          e.state = 'idle';
          e.stateTimer = 60;
        }
      }
      triggerScreenShake(2, 4);
      if (typeof snd !== 'undefined' && snd) snd.playSFX('dodge');
      break;
    }
  }
}

// ─── FACTION ABILITY KEY HANDLER ────────────────────────────────────────

function handleFactionAbilityKey(k) {
  if (!(state.conquest && state.conquest.active)) return false;
  if (state.conquest && state.conquest.buildMode) return false;
  if (k === 'q' || k === 'Q') {
    activateFactionQ();
    return true;
  }
  if (k === 'r' || k === 'R') {
    activateFactionR();
    return true;
  }
  return false;
}

// ─── PLAYER PROJECTILE SYSTEM ───────────────────────────────────────────

function spawnPlayerProjectile(x, y, angle, type) {
  let speed, damage, life, pierce;
  if (type === 'javelin') {
    speed = 5; damage = 18; life = 30; pierce = true; // 150px range at 5px/frame
  } else if (type === 'solar_beam') {
    speed = 4; damage = 12; life = 25; pierce = false; // 100px range
  }
  _playerProjectiles.push({
    x: x, y: y,
    vx: cos(angle) * speed, vy: sin(angle) * speed,
    damage: damage, type: type, life: life,
    pierce: pierce, hitList: [],
  });
}

function updatePlayerProjectiles(dt, enemies) {
  for (let i = _playerProjectiles.length - 1; i >= 0; i--) {
    let pr = _playerProjectiles[i];
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    pr.life -= dt;
    if (pr.life <= 0) { _playerProjectiles.splice(i, 1); continue; }
    // Collision with enemies
    for (let e of enemies) {
      if (e.state === 'dying' || e.state === 'dead') continue;
      if (pr.hitList.includes(e)) continue;
      let d = dist(pr.x, pr.y, e.x, e.y);
      if (d < 15 + (e.size || 10)) {
        let dmg = pr.damage;
        // Phalanx bonus for Greece
        if (_phalanxCharges > 0 && (state.faction || 'rome') === 'greece') {
          dmg = floor(dmg * 2);
          _phalanxCharges--;
          if (_phalanxCharges <= 0) {
            addFloatingText(w2sX(state.player.x), w2sY(state.player.y) - 25, 'Phalanx ended', '#aaaaaa');
          }
        }
        e.hp -= dmg;
        e.flashTimer = 6;
        e.state = 'stagger';
        e.stateTimer = 8;
        _spawnDamageNumber(e.x, e.y, dmg, pr.type === 'javelin' ? '#aa44cc' : '#ddaa22');
        spawnParticles(e.x, e.y, 'combat', 3);
        _registerComboHit();
        pr.hitList.push(e);
        if (!pr.pierce) { _playerProjectiles.splice(i, 1); break; }
      }
    }
  }
}

function drawPlayerProjectiles() {
  for (let pr of _playerProjectiles) {
    let sx = w2sX(pr.x);
    let sy = w2sY(pr.y);
    push();
    translate(sx, sy);
    let angle = atan2(pr.vy, pr.vx);
    rotate(angle);
    noStroke();
    if (pr.type === 'javelin') {
      // Purple-tinted javelin
      fill(160, 80, 200);
      rect(-8, -1, 16, 2);
      fill(200, 120, 240);
      triangle(8, -2, 8, 2, 12, 0);
      // Trail
      fill(160, 80, 200, 100);
      rect(-14, -1, 6, 2);
    } else if (pr.type === 'solar_beam') {
      // Golden beam
      fill(221, 170, 34, 200);
      ellipse(0, 0, 10, 6);
      fill(255, 220, 80, 150);
      ellipse(0, 0, 6, 4);
      // Glow
      fill(255, 255, 200, 60);
      ellipse(0, 0, 16, 10);
    }
    pop();
  }
}

// ─── FACTION AoE UPDATES ────────────────────────────────────────────────

function updateFactionAoEs(dt, enemies) {
  // Fire pots (Carthage Q)
  for (let i = _firePots.length - 1; i >= 0; i--) {
    let fp = _firePots[i];
    fp.timer -= dt;
    fp.tickTimer -= dt;
    if (fp.timer <= 0) { _firePots.splice(i, 1); continue; }
    // Damage tick every 30 frames (0.5s)
    if (fp.tickTimer <= 0) {
      fp.tickTimer = 30;
      for (let e of enemies) {
        if (e.state === 'dying' || e.state === 'dead') continue;
        if (dist(fp.x, fp.y, e.x, e.y) < fp.radius + (e.size || 10)) {
          let dmg = 8;
          e.hp -= dmg;
          e.flashTimer = 4;
          _spawnDamageNumber(e.x, e.y, dmg, '#ff8800');
        }
      }
    }
    // Fire particles
    if (frameCount % 4 === 0) {
      particles.push({
        x: fp.x + random(-fp.radius * 0.6, fp.radius * 0.6),
        y: fp.y + random(-fp.radius * 0.6, fp.radius * 0.6),
        vx: random(-0.3, 0.3), vy: random(-1.5, -0.5),
        life: random(12, 22), maxLife: 22, type: 'burst', size: random(2, 5),
        r: 255, g: floor(random(100, 200)), b: 30, world: true,
      });
    }
  }

  // Scarab swarm (Egypt Q)
  if (_scarabSwarm) {
    _scarabSwarm.timer -= dt;
    _scarabSwarm.tickTimer -= dt;
    if (_scarabSwarm.timer <= 0) { _scarabSwarm = null; }
    else {
      // Damage tick every 20 frames
      if (_scarabSwarm.tickTimer <= 0) {
        _scarabSwarm.tickTimer = 20;
        for (let e of enemies) {
          if (e.state === 'dying' || e.state === 'dead') continue;
          if (dist(_scarabSwarm.x, _scarabSwarm.y, e.x, e.y) < _scarabSwarm.radius + (e.size || 10)) {
            let dmg = 6;
            e.hp -= dmg;
            e.flashTimer = 4;
            _spawnDamageNumber(e.x, e.y, dmg, '#44bbaa');
          }
        }
      }
      // Scarab particles — turquoise dots orbiting
      if (frameCount % 3 === 0) {
        let a = random(0, TWO_PI);
        let r = random(5, _scarabSwarm.radius);
        particles.push({
          x: _scarabSwarm.x + cos(a) * r,
          y: _scarabSwarm.y + sin(a) * r,
          vx: cos(a + HALF_PI) * random(0.5, 1.5),
          vy: sin(a + HALF_PI) * random(0.5, 1.5),
          life: random(10, 18), maxLife: 18, type: 'burst', size: random(1, 3),
          r: 68, g: 187, b: 170, world: true,
        });
      }
    }
  }

  // Mercenaries (Carthage R)
  for (let i = _mercenaries.length - 1; i >= 0; i--) {
    let m = _mercenaries[i];
    m.timer -= dt;
    if (m.timer <= 0 || m.hp <= 0) {
      spawnParticles(m.x, m.y, 'combat', 4);
      _mercenaries.splice(i, 1);
      continue;
    }
    // Find nearest enemy
    let nearest = null, nearD = Infinity;
    for (let e of enemies) {
      if (e.state === 'dying' || e.state === 'dead') continue;
      let d = dist(m.x, m.y, e.x, e.y);
      if (d < nearD) { nearD = d; nearest = e; }
    }
    if (nearest) {
      // Move toward enemy
      if (nearD > 25) {
        let a = atan2(nearest.y - m.y, nearest.x - m.x);
        m.x += cos(a) * 1.5 * dt;
        m.y += sin(a) * 1.5 * dt;
        m.facing = cos(a) > 0 ? 'right' : 'left';
      }
      // Attack
      m.attackTimer -= dt;
      if (nearD < 30 && m.attackTimer <= 0) {
        m.attackTimer = 30;
        let dmg = 12;
        nearest.hp -= dmg;
        nearest.flashTimer = 6;
        nearest.state = 'stagger';
        nearest.stateTimer = 6;
        _spawnDamageNumber(nearest.x, nearest.y, dmg, '#aa44cc');
        spawnParticles(nearest.x, nearest.y, 'combat', 2);
      }
    } else {
      // Follow player
      let pd = dist(m.x, m.y, state.player.x, state.player.y);
      if (pd > 50) {
        let a = atan2(state.player.y - m.y, state.player.x - m.x);
        m.x += cos(a) * 1.2 * dt;
        m.y += sin(a) * 1.2 * dt;
      }
    }
  }

  // Greek Fire zones (Phoenicia Q)
  for (let i = _greekFireZones.length - 1; i >= 0; i--) {
    let gf = _greekFireZones[i];
    gf.timer -= dt;
    gf.tickTimer -= dt;
    if (gf.timer <= 0) { _greekFireZones.splice(i, 1); continue; }
    if (gf.tickTimer <= 0) {
      gf.tickTimer = 20; // tick every ~0.33s
      for (let e of enemies) {
        if (e.state === 'dying' || e.state === 'dead') continue;
        if (dist(gf.x, gf.y, e.x, e.y) < gf.radius + (e.size || 10)) {
          let dmg = 5;
          e.hp -= dmg;
          e.flashTimer = 4;
          _spawnDamageNumber(e.x, e.y, dmg, '#ff6622');
        }
      }
    }
    if (frameCount % 3 === 0) {
      particles.push({
        x: gf.x + random(-gf.radius * 0.6, gf.radius * 0.6),
        y: gf.y + random(-gf.radius * 0.6, gf.radius * 0.6),
        vx: random(-0.4, 0.4), vy: random(-2, -0.8),
        life: random(10, 18), maxLife: 18, type: 'burst', size: random(2, 5),
        r: 255, g: floor(random(60, 140)), b: 20, world: true,
      });
    }
  }

  // Converted enemies (Persia R)
  for (let i = _convertedEnemies.length - 1; i >= 0; i--) {
    let ce = _convertedEnemies[i];
    ce.timer -= dt;
    let e = ce.enemy;
    if (ce.timer <= 0 || e.state === 'dying' || e.state === 'dead') {
      if (e._converted) e._converted = false;
      _convertedEnemies.splice(i, 1);
      continue;
    }
    // Converted enemy attacks other enemies
    let nearest = null, nearD = Infinity;
    for (let other of enemies) {
      if (other === e || other.state === 'dying' || other.state === 'dead' || other._converted) continue;
      let d = dist(e.x, e.y, other.x, other.y);
      if (d < nearD) { nearD = d; nearest = other; }
    }
    if (nearest && nearD > 25) {
      let a = atan2(nearest.y - e.y, nearest.x - e.x);
      e.x += cos(a) * 1.2 * dt;
      e.y += sin(a) * 1.2 * dt;
    }
    if (nearest && nearD < 30) {
      e.attackTimer = (e.attackTimer || 0) - dt;
      if (e.attackTimer <= 0) {
        e.attackTimer = 30;
        nearest.hp -= 10;
        nearest.flashTimer = 6;
        _spawnDamageNumber(nearest.x, nearest.y, 10, '#ffcc22');
      }
    }
    // Gold glow particles
    if (frameCount % 8 === 0) {
      particles.push({
        x: e.x + random(-6, 6), y: e.y + random(-6, 6),
        vx: random(-0.3, 0.3), vy: -random(0.3, 0.8),
        life: random(10, 18), maxLife: 18, type: 'burst', size: random(1, 3),
        r: 255, g: 204, b: 34, world: true,
      });
    }
  }

  // Tidal wave slow (Sea People R)
  for (let i = _tidalWaveSlow.length - 1; i >= 0; i--) {
    let ts = _tidalWaveSlow[i];
    ts.timer -= dt;
    if (ts.timer <= 0 || ts.enemy.state === 'dying' || ts.enemy.state === 'dead') {
      _tidalWaveSlow.splice(i, 1);
      continue;
    }
    // Apply slow by resetting stagger periodically
    if (ts.enemy.state !== 'stagger' && ts.timer % 10 === 0) {
      ts.enemy.stateTimer = max(ts.enemy.stateTimer || 0, 5);
    }
  }
}

function drawFactionAoEs() {
  // Fire pot AoE circles
  for (let fp of _firePots) {
    let sx = w2sX(fp.x), sy = w2sY(fp.y);
    let alpha = min(180, fp.timer * 2);
    // Orange AoE circle
    noFill();
    stroke(255, 140, 30, alpha * 0.5);
    strokeWeight(2);
    ellipse(sx, sy, fp.radius * 2, fp.radius * 1.4);
    // Inner glow
    fill(255, 100, 20, alpha * 0.15);
    noStroke();
    ellipse(sx, sy, fp.radius * 2, fp.radius * 1.4);
  }

  // Scarab swarm AoE
  if (_scarabSwarm) {
    let sx = w2sX(_scarabSwarm.x), sy = w2sY(_scarabSwarm.y);
    let alpha = min(180, _scarabSwarm.timer * 2);
    noFill();
    stroke(68, 187, 170, alpha * 0.5);
    strokeWeight(1.5);
    let r = _scarabSwarm.radius + sin(frameCount * 0.1) * 4;
    ellipse(sx, sy, r * 2, r * 1.4);
    noStroke();
    fill(68, 187, 170, alpha * 0.1);
    ellipse(sx, sy, r * 2, r * 1.4);
  }

  // Mercenaries
  for (let m of _mercenaries) {
    let sx = w2sX(m.x), sy = w2sY(m.y);
    push();
    translate(floor(sx), floor(sy));
    noStroke();
    // Shadow
    fill(0, 0, 0, 30);
    ellipse(0, 8, 12, 4);
    // Body (purple-tinted mercenary)
    let fDir = m.facing === 'left' ? -1 : 1;
    fill(120, 50, 160);
    rect(-4, -5, 8, 10);
    // Head
    fill(195, 165, 130);
    rect(-3, -10, 6, 5);
    // Eyes
    fill(50);
    rect(fDir > 0 ? 1 : -2, -8, 1, 1);
    // Sword
    fill(180, 180, 190);
    rect(fDir * 5, -6, fDir * 6, 2);
    // HP indicator
    let hpFrac = m.hp / m.maxHp;
    fill(30, 10, 10, 150);
    rect(-8, -14, 16, 2);
    fill(lerp(200, 60, hpFrac), lerp(40, 200, hpFrac), 30);
    rect(-8, -14, 16 * hpFrac, 2);
    // Timer indicator (fading)
    if (m.timer < 180) {
      fill(255, 255, 255, map(m.timer, 0, 180, 0, 100));
      textSize(7); textAlign(CENTER);
      text(ceil(m.timer / 60) + 's', 0, -17);
    }
    pop();
  }

  // Testudo visual (Rome R)
  if (_testudoTimer > 0) {
    let p = state.player;
    let psx = w2sX(p.x), psy = w2sY(p.y);
    let alpha = min(1, _testudoTimer / 30);
    // Large shield dome
    noFill();
    stroke(187, 136, 51, 150 * alpha);
    strokeWeight(3);
    let shieldR = 26 + sin(frameCount * 0.06) * 2;
    arc(psx, psy - 4, shieldR * 2, shieldR * 1.6, PI, TWO_PI);
    // Shield panels
    stroke(187, 136, 51, 80 * alpha);
    strokeWeight(1);
    for (let i = -2; i <= 2; i++) {
      let sx2 = psx + i * 10;
      line(sx2, psy - 4 - shieldR * 0.6, sx2, psy - 4);
    }
    noStroke();
    fill(187, 136, 51, 120 * alpha);
    textSize(11); textAlign(CENTER, CENTER);
    text('TESTUDO', psx, psy - 32);
  }

  // Phalanx charges indicator (Greece R)
  if (_phalanxCharges > 0) {
    let p = state.player;
    let psx = w2sX(p.x), psy = w2sY(p.y);
    fill(240, 240, 255, 200);
    noStroke();
    textSize(10); textAlign(CENTER, CENTER);
    text('PHALANX x' + _phalanxCharges, psx, psy - 28);
    // White glow around player
    noFill();
    stroke(240, 240, 255, 60 + sin(frameCount * 0.1) * 30);
    strokeWeight(1.5);
    ellipse(psx, psy - 4, 28, 22);
    noStroke();
  }

  // Greek Fire zones (Phoenicia Q)
  for (let gf of _greekFireZones) {
    let sx = w2sX(gf.x), sy = w2sY(gf.y);
    let alpha = min(180, gf.timer * 2);
    noFill();
    stroke(255, 100, 30, alpha * 0.6);
    strokeWeight(2);
    ellipse(sx, sy, gf.radius * 2, gf.radius * 1.4);
    fill(255, 80, 20, alpha * 0.2);
    noStroke();
    ellipse(sx, sy, gf.radius * 2, gf.radius * 1.4);
  }

  // Immortal Guard charges (Persia Q)
  if (_immortalGuardCharges > 0) {
    let p = state.player;
    let psx = w2sX(p.x), psy = w2sY(p.y);
    fill(221, 187, 68, 200);
    noStroke();
    textSize(10); textAlign(CENTER, CENTER);
    text('GUARD x' + _immortalGuardCharges, psx, psy - 28);
    noFill();
    stroke(221, 187, 68, 80 + sin(frameCount * 0.12) * 40);
    strokeWeight(2);
    ellipse(psx, psy - 4, 30, 24);
    noStroke();
  }

  // Berserker Rage (Gaul Q)
  if (_berserkTimer > 0) {
    let p = state.player;
    let psx = w2sX(p.x), psy = w2sY(p.y);
    fill(204, 34, 34, 180);
    noStroke();
    textSize(10); textAlign(CENTER, CENTER);
    text('BERSERK', psx, psy - 28);
    noFill();
    stroke(220, 40, 30, 60 + sin(frameCount * 0.15) * 40);
    strokeWeight(2);
    ellipse(psx, psy - 4, 26, 20);
    noStroke();
  }

  // Stealth (Gaul R)
  if (_stealthTimer > 0) {
    let p = state.player;
    let psx = w2sX(p.x), psy = w2sY(p.y);
    fill(68, 170, 68, 140);
    noStroke();
    textSize(9); textAlign(CENTER, CENTER);
    text('STEALTH', psx, psy - 28);
    noFill();
    stroke(60, 140, 50, 40 + sin(frameCount * 0.08) * 20);
    strokeWeight(1);
    ellipse(psx, psy - 4, 32, 26);
    noStroke();
  }

  // Converted enemies glow (Persia R)
  for (let ce of _convertedEnemies) {
    let e = ce.enemy;
    if (e.state === 'dying' || e.state === 'dead') continue;
    let sx = w2sX(e.x), sy = w2sY(e.y);
    noFill();
    stroke(255, 204, 34, 100 + sin(frameCount * 0.1) * 40);
    strokeWeight(1.5);
    ellipse(sx, sy - 4, 20, 16);
    noStroke();
  }
}

// ─── FACTION COMBAT UPDATE (called from updateCombatSystem) ─────────────

function updateFactionCombat(dt) {
  if (!(state.conquest && state.conquest.active)) return;
  let enemies = (state.conquest && state.conquest.active) ? (state.conquest.enemies || []) : [];

  // Ability cooldowns
  if (_factionAbilities.q.cooldown > 0) _factionAbilities.q.cooldown -= dt;
  if (_factionAbilities.r.cooldown > 0) _factionAbilities.r.cooldown -= dt;

  // Testudo timer (Rome R)
  if (_testudoTimer > 0) _testudoTimer -= dt;

  // Phalanx timer (Greece R — movement lock)
  if (_phalanxTimer > 0) _phalanxTimer -= dt;

  // Greek dodge counter window
  if (_greekDodgeWindow > 0) _greekDodgeWindow -= dt;

  // Berserker rage timer (Gaul Q)
  if (_berserkTimer > 0) {
    _berserkTimer -= dt;
    // Red rage particles while active
    if (frameCount % 10 === 0) {
      let p = state.player;
      particles.push({
        x: p.x + random(-8, 8), y: p.y + random(-8, 8),
        vx: random(-0.5, 0.5), vy: -random(0.5, 1.2),
        life: random(8, 15), maxLife: 15, type: 'burst', size: random(1, 3),
        r: 220, g: 40, b: 30, world: true,
      });
    }
  }

  // Stealth timer (Gaul R)
  if (_stealthTimer > 0) {
    _stealthTimer -= dt;
    if (_stealthTimer <= 0) _stealthFirstStrike = false;
  }

  // Update projectiles
  updatePlayerProjectiles(dt, enemies);

  // Update AoEs, mercs
  updateFactionAoEs(dt, enemies);

  // Faction combo system
  if (_factionCombo.timer > 0) {
    _factionCombo.timer -= dt;
    if (_factionCombo.timer <= 0) {
      _factionCombo.count = 0;
      _factionCombo.triggered = false;
    }
  }
}

// ─── FACTION-SPECIFIC ATTACK OVERRIDE ───────────────────────────────────

function factionPlayerAttack() {
  let p = state.player;
  let f = state.faction || 'rome';
  if (p.attackTimer > 0) return;

  // Auto-switch to weapon
  if (p.hotbarSlot !== 4) { p.hotbarSlot = 4; addFloatingText(width / 2, height - 110, 'Switched to Weapon', '#aaddaa'); }
  triggerPlayerAlert();

  let enemies = (state.conquest && state.conquest.active) ? (state.conquest.enemies || []) : [];

  switch (f) {
    case 'rome': {
      // Standard sword slash — same as original but with combo tracking
      p.attackTimer = p.attackCooldown;
      p.slashPhase = 10;
      let fAngle = getFacingAngle();
      let arcHalf = PI * 0.3;
      let range = p.attackRange + (p.weapon === 1 ? 12 : 0);
      let baseDmg = floor((([15, 20, 25][p.weapon] || 15) + ((typeof getEquipBonus === 'function') ? getEquipBonus('atk') : 0)) * (typeof getNatBestiaryBonus === 'function' ? getNatBestiaryBonus() : 1));
      baseDmg = floor(baseDmg * (getFactionData().combatDamageMult || 1));
      // DISCIPLINA passive: +5% per nearby friendly soldier
      let nearbyAllies = 0;
      if (state.legia && state.legia.army) {
        for (let s of state.legia.army) {
          if (!s.garrison && dist(p.x, p.y, s.x || 0, s.y || 0) < 120) nearbyAllies++;
        }
      }
      for (let m of _mercenaries) {
        if (dist(p.x, p.y, m.x, m.y) < 120) nearbyAllies++;
      }
      baseDmg = floor(baseDmg * (1 + nearbyAllies * 0.05));
      // Legia soldier bonus
      let lg = state.legia;
      if (lg && lg.deployed > 0) baseDmg = floor(baseDmg * (1 + lg.deployed * 0.15));
      // Campfire bonus
      if (state.conquest && state.conquest.active && state.conquest.buildings && state.conquest.buildings.some(b => b.type === 'campfire')) baseDmg += 3;
      // Tech bonus
      if (typeof hasTech === 'function' && hasTech('siege_weapons')) baseDmg = floor(baseDmg * 1.3);

      let hitCount = 0;
      for (let e of enemies) {
        if (e.state === 'dying' || e.state === 'dead') continue;
        let d = dist(p.x, p.y, e.x, e.y);
        if (d > range + (e.size || 10)) continue;
        let angle = atan2(e.y - p.y, e.x - p.x);
        let diff = angle - fAngle;
        while (diff > PI) diff -= TWO_PI;
        while (diff < -PI) diff += TWO_PI;
        if (abs(diff) > arcHalf) continue;
        if (e.type === 'secutor' && random() < 0.5) { addFloatingText(w2sX(e.x), w2sY(e.y) - 20, 'BLOCKED', '#aaaaaa'); e.flashTimer = 4; if (snd) snd.playSFX('shield_bash'); continue; }
        if (e.type === 'shield_bearer' && random() < (e.blockChance || 0.5)) { addFloatingText(w2sX(e.x), w2sY(e.y) - 20, 'BLOCKED', '#ccbb88'); e.flashTimer = 4; if (snd) snd.playSFX('shield_bash'); continue; }
        let dmg = baseDmg;
        // Rome combo: 3 hits = heavy strike 1.5x
        _factionCombo.count++;
        _factionCombo.timer = 90; // 1.5s window
        if (_factionCombo.count >= 3 && !_factionCombo.triggered) {
          dmg = floor(dmg * 1.5);
          _factionCombo.triggered = true;
          _factionCombo.count = 0;
          triggerScreenShake(6, 12);
          addFloatingText(w2sX(e.x), w2sY(e.y) - 35, 'HEAVY STRIKE!', '#ff4444');
          _slowMoFrames = max(typeof _slowMoFrames !== 'undefined' ? _slowMoFrames : 0, 4);
        }
        e.hp -= dmg;
        e.flashTimer = 6;
        e.state = 'stagger'; e.stateTimer = 8;
        if (e.hp <= 0) { _juiceFreezeFrames = 2; _juiceCombatVignette = min(1, _juiceCombatVignette + 0.3); }
        let kba = atan2(e.y - p.y, e.x - p.x);
        e.x += cos(kba) * 5; e.y += sin(kba) * 5;
        addFloatingText(w2sX(e.x), w2sY(e.y) - 20, '-' + dmg, '#ff4444');
        spawnParticles(e.x, e.y, 'combat', 4);
        triggerScreenShake(2, 4, cos(kba), sin(kba), 'directional');
        if (snd) snd.playSFX('hit');
        hitCount++;
        _registerComboHit();
      }
      break;
    }
    case 'carthage': {
      // JAVELIN THROW — ranged projectile, pierces first enemy
      p.attackTimer = p.attackCooldown + 5; // slightly slower
      p.slashPhase = 8;
      let fAngle = getFacingAngle();
      spawnPlayerProjectile(p.x, p.y, fAngle, 'javelin');
      // Combo: track unique enemies hit in 2s window
      _factionCombo.timer = 120;
      spawnParticles(p.x, p.y, 'combat', 2);
      if (snd) snd.playSFX('dodge');
      break;
    }
    case 'egypt': {
      // SOLAR BEAM — medium range energy bolt
      p.attackTimer = p.attackCooldown + 3;
      p.slashPhase = 8;
      let fAngle = getFacingAngle();
      spawnPlayerProjectile(p.x, p.y, fAngle, 'solar_beam');
      _egyptAttackCounter++;
      // Every 15 attacks costs 1 crystal
      if (_egyptAttackCounter >= 15) {
        _egyptAttackCounter = 0;
        if (state.crystals > 0) state.crystals--;
        if (state.crystals < 3) addFloatingText(w2sX(p.x), w2sY(p.y) - 40, 'Low crystals! Attacks will weaken', '#ffaa00');
      }
      // Combo: 5 consecutive hits without damage = solar explosion
      _factionCombo.timer = 180;
      if (snd) snd.playSFX('hit');
      break;
    }
    case 'greece': {
      // SPEAR THRUST — longer range, faster
      p.attackTimer = floor(p.attackCooldown * 0.8); // faster
      p.slashPhase = 10;
      let fAngle = getFacingAngle();
      let arcHalf = PI * 0.25; // narrower arc
      let range = p.attackRange + 28; // 70px vs 42px base
      let baseDmg = floor((([15, 20, 25][p.weapon] || 15) + ((typeof getEquipBonus === 'function') ? getEquipBonus('atk') : 0)) * (typeof getNatBestiaryBonus === 'function' ? getNatBestiaryBonus() : 1));
      baseDmg = floor(baseDmg * (getFactionData().combatDamageMult || 1));
      // Phalanx 2x damage
      let isPhalanx = _phalanxCharges > 0;
      if (isPhalanx) {
        baseDmg = floor(baseDmg * 2);
        range += 15; // longer range during phalanx
      }
      // Dodge counter crit
      if (_greekDodgeWindow > 0) {
        baseDmg = floor(baseDmg * 2.5);
        _greekDodgeWindow = 0;
        addFloatingText(w2sX(p.x), w2sY(p.y) - 40, 'COUNTER CRIT!', '#ffffff');
        triggerScreenShake(5, 10);
        // Laurel particles
        for (let i = 0; i < 4; i++) {
          particles.push({
            x: p.x + random(-10, 10), y: p.y + random(-15, -5),
            vx: random(-0.5, 0.5), vy: -random(0.8, 1.5),
            life: random(20, 35), maxLife: 35, type: 'burst', size: random(2, 4),
            r: 80, g: 160, b: 60, world: true,
          });
        }
      }

      for (let e of enemies) {
        if (e.state === 'dying' || e.state === 'dead') continue;
        let d = dist(p.x, p.y, e.x, e.y);
        if (d > range + (e.size || 10)) continue;
        let angle = atan2(e.y - p.y, e.x - p.x);
        let diff = angle - fAngle;
        while (diff > PI) diff -= TWO_PI;
        while (diff < -PI) diff += TWO_PI;
        if (abs(diff) > arcHalf) continue;
        if (e.type === 'secutor' && random() < 0.5) { addFloatingText(w2sX(e.x), w2sY(e.y) - 20, 'BLOCKED', '#aaaaaa'); e.flashTimer = 4; if (snd) snd.playSFX('shield_bash'); continue; }
        if (e.type === 'shield_bearer' && random() < (e.blockChance || 0.5)) { addFloatingText(w2sX(e.x), w2sY(e.y) - 20, 'BLOCKED', '#ccbb88'); e.flashTimer = 4; if (snd) snd.playSFX('shield_bash'); continue; }
        let dmg = baseDmg;
        e.hp -= dmg;
        e.flashTimer = 6;
        e.state = 'stagger'; e.stateTimer = 8;
        if (e.hp <= 0) { _juiceFreezeFrames = 2; _juiceCombatVignette = min(1, _juiceCombatVignette + 0.3); }
        let kba = atan2(e.y - p.y, e.x - p.x);
        e.x += cos(kba) * 5; e.y += sin(kba) * 5;
        let dmgCol = isPhalanx ? '#ffffff' : '#4488dd';
        addFloatingText(w2sX(e.x), w2sY(e.y) - 20, '-' + dmg, dmgCol);
        spawnParticles(e.x, e.y, 'combat', 4);
        triggerScreenShake(2, 4, cos(kba), sin(kba), 'directional');
        if (snd) snd.playSFX('hit');
        _registerComboHit();
      }
      if (isPhalanx) {
        _phalanxCharges--;
        if (_phalanxCharges <= 0) {
          addFloatingText(w2sX(p.x), w2sY(p.y) - 25, 'Phalanx ended', '#aaaaaa');
        }
      }
      break;
    }
    default: {
      // Generic melee for seapeople, persia, phoenicia, gaul
      p.attackTimer = p.attackCooldown;
      p.slashPhase = 10;
      let fAngle = getFacingAngle();
      let arcHalf = PI * 0.3;
      let range = p.attackRange + (p.weapon === 1 ? 12 : 0);
      let baseDmg = floor((([15, 20, 25][p.weapon] || 15) + ((typeof getEquipBonus === 'function') ? getEquipBonus('atk') : 0)) * (typeof getNatBestiaryBonus === 'function' ? getNatBestiaryBonus() : 1));
      baseDmg = floor(baseDmg * (getFactionData().combatDamageMult || 1));
      // Gaul passive: +20% combat damage
      if (f === 'gaul') baseDmg = floor(baseDmg * 1.2);
      // Berserker Rage: +50% damage
      if (_berserkTimer > 0) baseDmg = floor(baseDmg * 1.5);
      // Stealth first strike: 3x damage
      if (_stealthTimer > 0 && _stealthFirstStrike) {
        baseDmg = floor(baseDmg * 3);
        _stealthFirstStrike = false;
        _stealthTimer = 0;
        addFloatingText(w2sX(p.x), w2sY(p.y) - 40, 'AMBUSH STRIKE!', '#44aa44');
        triggerScreenShake(8, 14);
      }
      // Standard bonuses
      let lg = state.legia;
      if (lg && lg.deployed > 0) baseDmg = floor(baseDmg * (1 + lg.deployed * 0.15));
      if (state.conquest && state.conquest.active && state.conquest.buildings && state.conquest.buildings.some(b => b.type === 'campfire')) baseDmg += 3;
      if (typeof hasTech === 'function' && hasTech('siege_weapons')) baseDmg = floor(baseDmg * 1.3);

      for (let e of enemies) {
        if (e.state === 'dying' || e.state === 'dead') continue;
        if (e._converted) continue;
        let d = dist(p.x, p.y, e.x, e.y);
        if (d > range + (e.size || 10)) continue;
        let angle = atan2(e.y - p.y, e.x - p.x);
        let diff = angle - fAngle;
        while (diff > PI) diff -= TWO_PI;
        while (diff < -PI) diff += TWO_PI;
        if (abs(diff) > arcHalf) continue;
        if (e.type === 'secutor' && random() < 0.5) { addFloatingText(w2sX(e.x), w2sY(e.y) - 20, 'BLOCKED', '#aaaaaa'); e.flashTimer = 4; if (snd) snd.playSFX('shield_bash'); continue; }
        if (e.type === 'shield_bearer' && random() < (e.blockChance || 0.5)) { addFloatingText(w2sX(e.x), w2sY(e.y) - 20, 'BLOCKED', '#ccbb88'); e.flashTimer = 4; if (snd) snd.playSFX('shield_bash'); continue; }
        let dmg = baseDmg;
        e.hp -= dmg;
        e.flashTimer = 6;
        e.state = 'stagger'; e.stateTimer = 8;
        if (e.hp <= 0) { _juiceFreezeFrames = 2; _juiceCombatVignette = min(1, _juiceCombatVignette + 0.3); }
        let kba = atan2(e.y - p.y, e.x - p.x);
        e.x += cos(kba) * 5; e.y += sin(kba) * 5;
        let dmgCol = f === 'gaul' ? '#cc2222' : f === 'seapeople' ? '#66aacc' : f === 'persia' ? '#ddbb44' : '#ff6622';
        addFloatingText(w2sX(e.x), w2sY(e.y) - 20, '-' + dmg, dmgCol);
        spawnParticles(e.x, e.y, 'combat', 4);
        triggerScreenShake(2, 4, cos(kba), sin(kba), 'directional');
        if (snd) snd.playSFX('hit');
        _registerComboHit();
      }
      break;
    }
  }
}

// ─── FACTION PASSIVE EFFECTS ────────────────────────────────────────────

function getFactionDamageReduction() {
  // Testudo: 80% reduction
  if (_testudoTimer > 0) return 0.8;
  // Immortal Guard: block incoming hit entirely
  if (_immortalGuardCharges > 0) {
    _immortalGuardCharges--;
    addFloatingText(w2sX(state.player.x), w2sY(state.player.y) - 25, 'BLOCKED!', '#ddbb44');
    spawnParticles(state.player.x, state.player.y, 'divine', 3);
    if (_immortalGuardCharges <= 0) addFloatingText(w2sX(state.player.x), w2sY(state.player.y) - 40, 'Guard ended', '#aaaaaa');
    return 1.0; // full block
  }
  // Berserker Rage: -30% defense (take 30% more damage, negative reduction)
  if (_berserkTimer > 0) return -0.3;
  return 0;
}

function getFactionMoveSpeedMult() {
  let f = state.faction || 'rome';
  // Greece passive: +15% move speed
  if (f === 'greece') return 1.15;
  // Testudo: can't move
  if (_testudoTimer > 0) return 0;
  // Phalanx: can't move during setup
  if (_phalanxTimer > 0) return 0;
  return 1;
}

function getFactionGoldDropMult() {
  // Carthage passive: +30% gold drops
  if ((state.faction || 'rome') === 'carthage') return 1.3;
  return 1;
}

function getFactionCrystalRechargeMult() {
  // Egypt passive: +30% crystal recharge
  if ((state.faction || 'rome') === 'egypt') return 1.3;
  return 1;
}

function getFactionDodgeDistMult() {
  // Greece passive: dodge goes further
  if ((state.faction || 'rome') === 'greece') return 1.3;
  return 1;
}

// Called when player successfully dodges an attack (from dodge roll system)
function onPlayerDodge() {
  if ((state.faction || 'rome') === 'greece') {
    _greekDodgeWindow = 45; // 0.75s window for counter crit
  }
}

// ─── FACTION COMBAT HUD ────────────────────────────────────────────────

function drawFactionAbilityHUD() {
  if (!(state.conquest && state.conquest.active)) return;
  let f = state.faction || 'rome';
  let fData = FACTION_ABILITIES[f];
  if (!fData) return;

  push();
  let hudX = width - 140;
  let hudY = height - 55;

  // Q ability
  let qReady = _factionAbilities.q.cooldown <= 0;
  let qMaxCD = fData.q.maxCD;
  let qFrac = qReady ? 1 : 1 - (_factionAbilities.q.cooldown / qMaxCD);
  _drawAbilityIcon(hudX, hudY, 'Q', fData.q.name, fData.q.color, qFrac, qReady);

  // R ability
  let rReady = _factionAbilities.r.cooldown <= 0;
  let rMaxCD = fData.r.maxCD;
  let rFrac = rReady ? 1 : 1 - (_factionAbilities.r.cooldown / rMaxCD);
  _drawAbilityIcon(hudX + 65, hudY, 'R', fData.r.name, fData.r.color, rFrac, rReady);

  // Passive indicator
  fill(180, 165, 135, 160);
  noStroke();
  textSize(8); textAlign(CENTER, TOP);
  text(fData.passive, hudX + 32, hudY + 34);

  // Faction combo indicator
  if (_factionCombo.count > 0 && _factionCombo.timer > 0) {
    fill(255, 220, 80, min(255, _factionCombo.timer * 4));
    textSize(14); textAlign(CENTER, CENTER);
    text('x' + _factionCombo.count, hudX + 32, hudY - 15);
  }

  pop();
}

function _drawAbilityIcon(x, y, key, name, col, frac, ready) {
  noStroke();
  // Background
  fill(ready ? 40 : 25, ready ? 35 : 20, ready ? 25 : 15, 200);
  rect(x, y, 56, 30, 4);

  // Cooldown sweep
  if (!ready) {
    fill(0, 0, 0, 100);
    rect(x, y, 56 * (1 - frac), 30, frac < 0.05 ? 4 : 0);
  }

  // Border
  let c = color(col);
  stroke(red(c), green(c), blue(c), ready ? 200 : 80);
  strokeWeight(ready ? 1.5 : 0.8);
  noFill();
  rect(x, y, 56, 30, 4);
  noStroke();

  // Key label
  fill(ready ? 255 : 120);
  textSize(12); textAlign(LEFT, TOP);
  text('[' + key + ']', x + 3, y + 3);

  // Ability name (truncated)
  fill(red(c), green(c), blue(c), ready ? 220 : 100);
  textSize(8); textAlign(LEFT, TOP);
  let shortName = name.length > 10 ? name.substring(0, 9) + '.' : name;
  text(shortName, x + 3, y + 18);

  // Cooldown seconds
  if (!ready) {
    fill(255, 100, 80);
    textSize(10); textAlign(RIGHT, TOP);
    text(ceil(_factionAbilities[key.toLowerCase()].cooldown / 60) + 's', x + 53, y + 3);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── OFFICER SYSTEM ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

const OFFICER_RANKS = {
  decurion:  { name: 'Decurion',  maxTroops: 5,  xpThreshold: 0,    promoteCost: 0 },
  centurion: { name: 'Centurion', maxTroops: 15, xpThreshold: 200,  promoteCost: 200 },
  legate:    { name: 'Legate',    maxTroops: 30, xpThreshold: 600,  promoteCost: 500 },
};

function getOfficerRankName(rank) {
  let ft = (typeof getFactionTerms === 'function') ? getFactionTerms() : null;
  if (!ft) return OFFICER_RANKS[rank] ? OFFICER_RANKS[rank].name : rank;
  if (rank === 'decurion') return ft.officer;
  if (rank === 'centurion') return ft.rank2;
  if (rank === 'legate') return ft.rank3;
  return rank;
}

const OFFICER_ORDERS = {
  ESCORT:  { name: 'Escort Player', desc: 'Follow and protect' },
  PATROL:  { name: 'Patrol',        desc: 'Walk between two points' },
  ATTACK:  { name: 'Attack Island', desc: 'Sail and fight, return with loot' },
  DEFEND:  { name: 'Defend Island', desc: 'Station garrison at island' },
  SCOUT:   { name: 'Scout',         desc: 'Explore and reveal map' },
};

const OFFICER_NAMES = [
  'Gaius', 'Lucius', 'Tiberius', 'Publius', 'Quintus', 'Servius',
  'Aulus', 'Decimus', 'Gnaeus', 'Spurius', 'Manius', 'Appius',
  'Numerius', 'Vibius', 'Statius', 'Volusus', 'Postumus', 'Agrippa',
];

var officerPanelOpen = false;
var _officerSelectedIdx = -1;
var _officerOrderMode = false; // true when choosing an order for selected officer

function generateOfficerName() {
  let used = (state.officers || []).map(o => o.name);
  let avail = OFFICER_NAMES.filter(n => !used.includes(n));
  if (avail.length === 0) avail = OFFICER_NAMES;
  return avail[floor(random(avail.length))];
}

function hireOfficer() {
  if (!state.officers) state.officers = [];
  if (state.officers.length >= 3) {
    addFloatingText(width / 2, height * 0.3, 'Max 3 officers!', '#ff6644');
    return false;
  }
  let cost = 100 + state.officers.length * 100;
  if (state.gold < cost) {
    addFloatingText(width / 2, height * 0.3, 'Need ' + cost + ' gold', '#ff6644');
    return false;
  }
  state.gold -= cost;
  let o = {
    name: generateOfficerName(),
    level: 1,
    xp: 0,
    rank: 'decurion',
    troops: [],
    currentOrder: null,
    x: state.player.x + random(-30, 30),
    y: state.player.y + random(-20, 20),
    portrait: floor(random(4)),
    _patrolTimer: 0,
    _scoutTimer: 0,
    _attackTimer: 0,
    _returnTimer: 0,
  };
  state.officers.push(o);
  addFloatingText(width / 2, height * 0.3, 'Officer ' + o.name + ' hired!', '#ddaa44');
  if (typeof snd !== 'undefined' && snd) snd.playSFX('upgrade');
  return true;
}

function promoteOfficer(idx) {
  let o = state.officers[idx];
  if (!o) return false;
  let nextRank = o.rank === 'decurion' ? 'centurion' : o.rank === 'centurion' ? 'legate' : null;
  if (!nextRank) { addFloatingText(width / 2, height * 0.3, 'Already max rank!', '#aaaaaa'); return false; }
  let req = OFFICER_RANKS[nextRank];
  if (o.xp < req.xpThreshold) {
    addFloatingText(width / 2, height * 0.3, 'Need ' + req.xpThreshold + ' XP (has ' + floor(o.xp) + ')', '#ff6644');
    return false;
  }
  if (state.gold < req.promoteCost) {
    addFloatingText(width / 2, height * 0.3, 'Need ' + req.promoteCost + ' gold', '#ff6644');
    return false;
  }
  state.gold -= req.promoteCost;
  o.rank = nextRank;
  o.level++;
  addFloatingText(width / 2, height * 0.3, o.name + ' promoted to ' + req.name + '!', '#ffdd44');
  if (typeof snd !== 'undefined' && snd) snd.playSFX('skill_unlock');
  return true;
}

function assignTroopsToOfficer(officerIdx, count) {
  let o = state.officers[officerIdx];
  if (!o) return;
  let lg = state.legia;
  if (!lg || !lg.army) return;
  let maxT = OFFICER_RANKS[o.rank].maxTroops;
  let available = lg.army.filter(u => u.garrison && !u._assignedOfficer);
  let toAssign = min(count, maxT - o.troops.length, available.length);
  for (let i = 0; i < toAssign; i++) {
    available[i]._assignedOfficer = officerIdx;
    o.troops.push(available[i]);
  }
  if (toAssign > 0) addFloatingText(width / 2, height * 0.3, toAssign + ' troops assigned to ' + o.name, '#cc8844');
}

function unassignTroopsFromOfficer(officerIdx) {
  let o = state.officers[officerIdx];
  if (!o) return;
  o.troops.forEach(u => { u._assignedOfficer = undefined; });
  let count = o.troops.length;
  o.troops = [];
  if (count > 0) addFloatingText(width / 2, height * 0.3, count + ' troops unassigned from ' + o.name, '#cc8844');
}

function setOfficerOrder(officerIdx, orderType, params) {
  let o = state.officers[officerIdx];
  if (!o) return;
  o.currentOrder = { type: orderType, params: params || {}, timer: 0 };
  addFloatingText(width / 2, height * 0.3, o.name + ': ' + (OFFICER_ORDERS[orderType] ? OFFICER_ORDERS[orderType].name : orderType), '#cc8844');
}

function grantOfficerXP(officerIdx, amount) {
  let o = state.officers[officerIdx];
  if (!o) return;
  o.xp += amount;
}

function updateOfficers(dt) {
  if (!state.officers) return;
  let p = state.player;
  for (let oi = 0; oi < state.officers.length; oi++) {
    let o = state.officers[oi];
    if (!o.currentOrder) {
      // Idle: stand near castrum
      let lg = state.legia;
      let cx = (lg && lg.castrumX) ? lg.castrumX : WORLD.islandCX + 200;
      let cy = (lg && lg.castrumY) ? lg.castrumY : WORLD.islandCY + 100;
      let dx = cx + (oi * 25) - o.x, dy = cy + 15 - o.y;
      let d = sqrt(dx * dx + dy * dy);
      if (d > 5) { o.x += (dx / d) * 0.8 * dt; o.y += (dy / d) * 0.5 * dt; }
      continue;
    }
    let order = o.currentOrder;
    order.timer += dt;

    switch (order.type) {
      case 'ESCORT': {
        // Follow player
        let dx = p.x - 30 + oi * 20 - o.x;
        let dy = p.y + 15 + oi * 10 - o.y;
        let d = sqrt(dx * dx + dy * dy);
        if (d > 15) {
          let spd = min(d * 0.06, 2.5) * dt;
          o.x += (dx / d) * spd;
          o.y += (dy / d) * spd;
        }
        // Troops follow officer
        _updateOfficerTroopFollow(o, dt);
        // Auto-attack nearby enemies (home island raids)
        _officerAutoAttack(o, oi, dt);
        break;
      }
      case 'PATROL': {
        let pts = order.params;
        let tx = (order._leg || 0) === 0 ? (pts.x1 || o.x) : (pts.x2 || o.x);
        let ty = (order._leg || 0) === 0 ? (pts.y1 || o.y) : (pts.y2 || o.y);
        let dx = tx - o.x, dy = ty - o.y;
        let d = sqrt(dx * dx + dy * dy);
        if (d < 10) {
          order._leg = order._leg === 0 ? 1 : 0;
          order._waitTimer = 60;
        } else if (!order._waitTimer || order._waitTimer <= 0) {
          o.x += (dx / d) * 1.0 * dt;
          o.y += (dy / d) * 0.7 * dt;
        } else {
          order._waitTimer -= dt;
        }
        _updateOfficerTroopFollow(o, dt);
        _officerAutoAttack(o, oi, dt);
        break;
      }
      case 'ATTACK': {
        // Off-screen simulation: timer counts down, then return with loot
        let attackDuration = 1800 + o.troops.length * 60; // 30s + troops
        if (order.timer >= attackDuration && !order._resolved) {
          order._resolved = true;
          let troopPower = o.troops.reduce(function(s, u) { return s + (u.damage || 5); }, 0);
          let success = random() < 0.5 + troopPower * 0.02;
          if (success) {
            let loot = floor(30 + o.troops.length * 10 + random(20, 50));
            state.gold += loot;
            grantOfficerXP(oi, 50);
            // Casualties: 0-30% lost
            let casualties = floor(o.troops.length * random(0, 0.3));
            for (let c = 0; c < casualties && o.troops.length > 0; c++) {
              let dead = o.troops.pop();
              if (dead._assignedOfficer !== undefined) dead._assignedOfficer = undefined;
              let lg2 = state.legia;
              if (lg2 && lg2.army) {
                let idx2 = lg2.army.indexOf(dead);
                if (idx2 >= 0) lg2.army.splice(idx2, 1);
              }
            }
            addFloatingText(width / 2, height * 0.2, o.name + ' raid success! +' + loot + 'g', '#ffdd44');
            if (casualties > 0) addFloatingText(width / 2, height * 0.27, casualties + ' soldier' + (casualties > 1 ? 's' : '') + ' lost', '#ff6644');
          } else {
            // Failed: lose 50% troops
            let lost = ceil(o.troops.length * 0.5);
            for (let c = 0; c < lost && o.troops.length > 0; c++) {
              let dead = o.troops.pop();
              if (dead._assignedOfficer !== undefined) dead._assignedOfficer = undefined;
              let lg2 = state.legia;
              if (lg2 && lg2.army) {
                let idx2 = lg2.army.indexOf(dead);
                if (idx2 >= 0) lg2.army.splice(idx2, 1);
              }
            }
            grantOfficerXP(oi, 15);
            addFloatingText(width / 2, height * 0.2, o.name + ' raid failed! Lost ' + lost + ' troops', '#ff4444');
          }
          o.currentOrder = null;
        }
        break;
      }
      case 'DEFEND': {
        // Stay at castrum area, fight incoming raids with bonus
        let lg = state.legia;
        let cx = (lg && lg.castrumX) ? lg.castrumX : WORLD.islandCX + 200;
        let cy = (lg && lg.castrumY) ? lg.castrumY : WORLD.islandCY + 100;
        let dx = cx - o.x, dy = cy - o.y;
        let d = sqrt(dx * dx + dy * dy);
        if (d > 20) { o.x += (dx / d) * 0.8 * dt; o.y += (dy / d) * 0.5 * dt; }
        _updateOfficerTroopFollow(o, dt);
        _officerAutoAttack(o, oi, dt);
        break;
      }
      case 'SCOUT': {
        // Off-screen: reveals map sectors over time
        if (order.timer >= 900 && !order._resolved) { // 15 seconds
          order._resolved = true;
          grantOfficerXP(oi, 25);
          addFloatingText(width / 2, height * 0.2, o.name + ' returned from scouting!', '#88ccff');
          addNotification(o.name + ' discovered new territory', '#88ccff');
          o.currentOrder = null;
        }
        break;
      }
    }
  }
}

function _updateOfficerTroopFollow(officer, dt) {
  let troops = officer.troops;
  if (!troops || troops.length === 0) return;
  for (let i = 0; i < troops.length; i++) {
    let u = troops[i];
    let angle = PI + (i - troops.length / 2) * 0.4;
    let dist2 = 20 + (i % 2) * 8;
    let tx = officer.x + cos(angle) * dist2;
    let ty = officer.y + sin(angle) * dist2;
    if (u.x === undefined || u.x === 0) { u.x = tx; u.y = ty; }
    u.x += (tx - u.x) * 0.04 * dt;
    u.y += (ty - u.y) * 0.04 * dt;
  }
}

function _officerAutoAttack(officer, officerIdx, dt) {
  // Check all nation raid parties for nearby enemies
  if (!state.nations) return;
  let attackRange = 60;
  let troops = officer.troops || [];
  let allUnits = [officer].concat(troops);

  for (let nk of Object.keys(state.nations)) {
    let rv = state.nations[nk];
    if (!rv || !rv.raidParty || rv.raidParty.length === 0) continue;
    for (let ri = rv.raidParty.length - 1; ri >= 0; ri--) {
      let raider = rv.raidParty[ri];
      for (let u of allUnits) {
        let d = sqrt((u.x - raider.x) * (u.x - raider.x) + (u.y - raider.y) * (u.y - raider.y));
        if (d < attackRange) {
          if (!u._atkTimer || u._atkTimer <= 0) {
            let dmg = u.damage || 5;
            raider.hp -= dmg;
            raider.flashTimer = 8;
            u._atkTimer = 30;
            if (raider.hp <= 0) {
              rv.raidParty.splice(ri, 1);
              rv._raidKills = (rv._raidKills || 0) + 1;
              grantOfficerXP(officerIdx, 10);
              if (typeof spawnParticles === 'function') spawnParticles(raider.x, raider.y, 'combat', 4);
            }
          }
          break;
        }
      }
    }
  }
  // Tick attack timers
  for (let u of allUnits) {
    if (u._atkTimer && u._atkTimer > 0) u._atkTimer -= dt;
  }
}

// ─── OFFICER PANEL UI ────────────────────────────────────────────────────

function toggleOfficerPanel() {
  officerPanelOpen = !officerPanelOpen;
  _officerSelectedIdx = -1;
  _officerOrderMode = false;
  if (officerPanelOpen && snd) snd.playSFX('page_turn');
}

function handleOfficerPanelKey(k) {
  if (!officerPanelOpen) return false;

  // Close
  if (k === 'o' || k === 'O' || k === 'Escape') { officerPanelOpen = false; _officerSelectedIdx = -1; _officerOrderMode = false; return true; }

  // Order mode
  if (_officerOrderMode && _officerSelectedIdx >= 0) {
    let o = state.officers[_officerSelectedIdx];
    if (!o) { _officerOrderMode = false; return true; }
    if (k === '1') { setOfficerOrder(_officerSelectedIdx, 'ESCORT'); _officerOrderMode = false; return true; }
    if (k === '2') {
      // Patrol between castrum and port
      let lg = state.legia;
      let cx = (lg && lg.castrumX) ? lg.castrumX : WORLD.islandCX + 200;
      let cy = (lg && lg.castrumY) ? lg.castrumY : WORLD.islandCY + 100;
      setOfficerOrder(_officerSelectedIdx, 'PATROL', { x1: cx, y1: cy, x2: WORLD.islandCX, y2: WORLD.islandCY + 200 });
      _officerOrderMode = false;
      return true;
    }
    if (k === '3') { setOfficerOrder(_officerSelectedIdx, 'ATTACK'); _officerOrderMode = false; return true; }
    if (k === '4') { setOfficerOrder(_officerSelectedIdx, 'DEFEND'); _officerOrderMode = false; return true; }
    if (k === '5') { setOfficerOrder(_officerSelectedIdx, 'SCOUT'); _officerOrderMode = false; return true; }
    if (k === 'Escape') { _officerOrderMode = false; return true; }
    return true;
  }

  // Select officer 1-3
  if (k === '1' && state.officers.length >= 1) { _officerSelectedIdx = 0; return true; }
  if (k === '2' && state.officers.length >= 2) { _officerSelectedIdx = 1; return true; }
  if (k === '3' && state.officers.length >= 3) { _officerSelectedIdx = 2; return true; }

  // Hire new
  if (k === 'h' || k === 'H') { hireOfficer(); return true; }

  // Assign order
  if ((k === 'a' || k === 'A') && _officerSelectedIdx >= 0) { _officerOrderMode = true; return true; }

  // Promote
  if ((k === 'p' || k === 'P') && _officerSelectedIdx >= 0) { promoteOfficer(_officerSelectedIdx); return true; }

  // Assign 5 troops
  if ((k === 't' || k === 'T') && _officerSelectedIdx >= 0) { assignTroopsToOfficer(_officerSelectedIdx, 5); return true; }

  // Unassign troops
  if ((k === 'u' || k === 'U') && _officerSelectedIdx >= 0) { unassignTroopsFromOfficer(_officerSelectedIdx); return true; }

  // Cancel order
  if ((k === 'x' || k === 'X') && _officerSelectedIdx >= 0) {
    let o = state.officers[_officerSelectedIdx];
    if (o) { o.currentOrder = null; addFloatingText(width / 2, height * 0.3, o.name + ': order cancelled', '#cc8844'); }
    return true;
  }

  return true; // absorb all keys while open
}

function drawOfficerPanel() {
  if (!officerPanelOpen) return;
  if (!state.officers) state.officers = [];

  push();
  noStroke();
  fill(0, 0, 0, 160);
  rect(0, 0, width, height);

  let pw = min(380, width - 20), ph = min(360, height - 20);
  let px = max(10, width / 2 - pw / 2), py = max(10, height / 2 - ph / 2);
  drawParchmentPanel(px, py, pw, ph);

  fill(210, 180, 80); textAlign(CENTER, TOP); textSize(14);
  text('OFFICERS', px + pw / 2, py + 10);

  let sy = py + 32;
  fill(140, 120, 80); textSize(9); textAlign(CENTER, TOP);
  text('Max 3 officers. Each commands troops independently.', px + pw / 2, sy);
  sy += 16;

  if (state.officers.length === 0) {
    fill(160, 140, 100); textSize(10); textAlign(CENTER, TOP);
    text('No officers yet.', px + pw / 2, sy); sy += 16;
  }

  for (let i = 0; i < state.officers.length; i++) {
    let o = state.officers[i];
    let selected = i === _officerSelectedIdx;
    let rankData = OFFICER_RANKS[o.rank];
    let cardH = 52;

    // Card background
    fill(selected ? color(50, 40, 25, 200) : color(35, 28, 18, 180));
    rect(px + 10, sy, pw - 20, cardH, 4);
    if (selected) {
      stroke(200, 170, 80, 180); strokeWeight(1);
      noFill(); rect(px + 10, sy, pw - 20, cardH, 4); noStroke();
    }

    // Portrait placeholder
    fill(100, 80, 55); rect(px + 16, sy + 6, 20, 24, 2);
    fill(195, 165, 130); ellipse(px + 26, sy + 13, 12, 10); // head
    fill(160, 50, 40 + o.portrait * 20); rect(px + 20, sy + 18, 12, 10); // body

    // Name + rank
    fill(220, 195, 120); textSize(11); textAlign(LEFT, TOP);
    text((i + 1) + '. ' + o.name, px + 42, sy + 6);
    fill(160, 140, 100); textSize(9);
    text(getOfficerRankName(o.rank) + ' (Lv.' + o.level + ')  XP: ' + floor(o.xp), px + 42, sy + 19);

    // Troops + order
    fill(140, 120, 90); textSize(9);
    let troopStr = 'Troops: ' + o.troops.length + '/' + rankData.maxTroops;
    let orderStr = o.currentOrder ? o.currentOrder.type : 'Idle';
    text(troopStr + '  |  Order: ' + orderStr, px + 42, sy + 32);

    sy += cardH + 4;
  }

  // Order mode
  if (_officerOrderMode && _officerSelectedIdx >= 0) {
    sy += 4;
    fill(200, 170, 80); textSize(10); textAlign(LEFT, TOP);
    text('ASSIGN ORDER:', px + 14, sy); sy += 14;
    let orders = [['1', 'Escort Player'], ['2', 'Patrol'], ['3', 'Attack Island'], ['4', 'Defend Island'], ['5', 'Scout']];
    for (let ord of orders) {
      fill(180, 160, 120); textSize(10);
      text('[' + ord[0] + '] ' + ord[1], px + 20, sy); sy += 14;
    }
    fill(120, 100, 70); textSize(9);
    text('[ESC] Cancel', px + 20, sy); sy += 14;
  } else {
    // Controls
    sy += 6;
    stroke(100, 80, 50, 120); strokeWeight(1);
    line(px + 14, sy, px + pw - 14, sy); noStroke();
    sy += 6;

    fill(180, 160, 120); textSize(10); textAlign(LEFT, TOP);
    if (state.officers.length < 3) {
      let cost = 100 + state.officers.length * 100;
      text('[H] Hire officer (' + cost + 'g)', px + 14, sy); sy += 14;
    }
    if (_officerSelectedIdx >= 0) {
      text('[A] Assign order', px + 14, sy); sy += 14;
      text('[P] Promote', px + 14, sy); sy += 14;
      text('[T] Assign 5 troops', px + 14, sy); sy += 14;
      text('[U] Unassign all troops', px + 14, sy); sy += 14;
      text('[X] Cancel current order', px + 14, sy); sy += 14;
    }
    fill(120, 100, 70); textSize(9);
    text('[1-3] Select officer  |  [O/ESC] Close', px + 14, sy);
  }

  pop();
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── FORMATION SYSTEM + PLAYER ESCORT ───────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

let _currentFormation = 'march';
let _formationAutoTimer = 0; // timer for auto-switch back to march
const FORMATION_ORDER = ['march', 'battle', 'guard'];

const FORMATION_TYPES = {
  march: {
    name: 'March',
    getPos: function(index, total, px, py, facingAngle) {
      let row = floor(index / 2), col = (index % 2 === 0) ? -1 : 1;
      let behind = facingAngle + PI;
      return {
        x: px + cos(behind) * (row + 1) * 25 + cos(behind + HALF_PI) * col * 8,
        y: py + sin(behind) * (row + 1) * 25 + sin(behind + HALF_PI) * col * 8
      };
    }
  },
  battle: {
    name: 'Battle',
    getPos: function(index, total, px, py, facingAngle) {
      let angle = facingAngle + (-PI / 4 + (index / max(1, total - 1)) * PI / 2);
      let dist = 30 + floor(index / 4) * 15;
      return { x: px + cos(angle) * dist, y: py + sin(angle) * dist * 0.5 };
    }
  },
  guard: {
    name: 'Guard',
    getPos: function(index, total, px, py, facingAngle) {
      let angle = (index / max(1, total)) * TWO_PI;
      return { x: px + cos(angle) * 35, y: py + sin(angle) * 35 * 0.5 };
    }
  }
};

function cycleFormation() {
  let idx = FORMATION_ORDER.indexOf(_currentFormation);
  _currentFormation = FORMATION_ORDER[(idx + 1) % FORMATION_ORDER.length];
  if (typeof addFloatingText === 'function')
    addFloatingText(width / 2, height * 0.25, FORMATION_TYPES[_currentFormation].name + ' Formation!', '#ddcc44');
  if (typeof snd !== 'undefined' && snd) snd.playSFX('war_horn');
  if (typeof triggerScreenShake === 'function') triggerScreenShake(2, 8, 0, 0, 'random');
}

function getFormationName() { return FORMATION_TYPES[_currentFormation].name; }

// Sort army by type priority for formation positioning
function _sortArmyForFormation(army) {
  let priority = { centurion: 0, legionary: 1, cavalry: 2, siege_ram: 3, archer: 4 };
  return army.slice().sort(function(a, b) { return (priority[a.type] || 1) - (priority[b.type] || 1); });
}

function updatePlayerEscort(dt) {
  if (!state.legia || !state.legia.army) return;
  if (state.buildMode) return;
  // Sailing: just mark positions on ship (cosmetic, no update needed)
  if (state.rowing && state.rowing.active) return;

  let army = state.legia.army.filter(function(u) { return !u._assignedOfficer; }).slice(0, 20);
  if (army.length === 0) return;

  let p = state.player;
  let nearEnemy = _isNearEnemies(p.x, p.y, 150);

  // Decrement call-to-arms cooldown
  if (state._callToArmsCooldown > 0) state._callToArmsCooldown -= dt;

  // Auto-switch to battle when enemies near, back to march after 2s
  if (nearEnemy) {
    if (_currentFormation === 'march') _currentFormation = 'battle';
    _formationAutoTimer = 120; // ~2s at 60fps
  } else if (_formationAutoTimer > 0) {
    _formationAutoTimer -= dt;
    if (_formationAutoTimer <= 0 && _currentFormation === 'battle') _currentFormation = 'march';
  }

  let facingAngle = (p.vx !== undefined && (p.vx !== 0 || p.vy !== 0))
    ? atan2(p.vy || 0, p.vx || 0) : PI / 2;

  let sorted = _sortArmyForFormation(army);
  let formation = FORMATION_TYPES[_currentFormation];

  for (let i = 0; i < sorted.length; i++) {
    let unit = sorted[i];
    let isRanged = UNIT_TYPES[unit.type] && UNIT_TYPES[unit.type].ranged;
    let isCav = unit.type === 'cavalry';
    let pos = formation.getPos(i, sorted.length, p.x, p.y, facingAngle);

    // Initialize position and per-soldier personality
    if (unit.x === undefined || unit.x === 0) { unit.x = pos.x; unit.y = pos.y; }
    if (unit._speedMult === undefined) unit._speedMult = 0.95 + Math.random() * 0.1;
    if (unit._jitterX === undefined) { unit._jitterX = 0; unit._jitterY = 0; unit._jitterTimer = floor(Math.random() * 120); }
    if (unit._heightOff === undefined) unit._heightOff = (Math.random() - 0.5) * 4;
    if (unit._colorOff === undefined) unit._colorOff = floor((Math.random() - 0.5) * 20);
    if (unit._sinPhase === undefined) unit._sinPhase = Math.random() * TWO_PI;
    if (unit._idleFaceTimer === undefined) unit._idleFaceTimer = floor(Math.random() * 180);

    // Archers stay further back
    if (isRanged) { pos.x += cos(facingAngle + PI) * 15; pos.y += sin(facingAngle + PI) * 15; }

    // Refresh jitter offset every ~120 frames (soldiers fidget)
    unit._jitterTimer = (unit._jitterTimer || 0) + dt;
    if (unit._jitterTimer > 120) {
      unit._jitterX = (Math.random() - 0.5) * 14;
      unit._jitterY = (Math.random() - 0.5) * 10;
      unit._jitterTimer = 0;
    }

    let jitteredX = pos.x + (unit._jitterX || 0);
    let jitteredY = pos.y + (unit._jitterY || 0);

    // Chase nearby enemies (break formation)
    let chaseTarget = _findNearestRaidEnemy(unit.x, unit.y, isRanged ? 90 : 60);
    if (chaseTarget && chaseTarget.hp > 0) {
      jitteredX = chaseTarget.x + (isRanged ? (unit.x - chaseTarget.x) * 0.3 : 0);
      jitteredY = chaseTarget.y + (isRanged ? (unit.y - chaseTarget.y) * 0.3 : 0);
    }

    // Smooth lerp to target position (staggered speed per soldier)
    let dx = jitteredX - unit.x, dy = jitteredY - unit.y;
    let distToTarget = sqrt(dx * dx + dy * dy);
    let followSpeed = (0.15 + min(0.15, 0.1 * distToTarget / 200)) * unit._speedMult;
    if (distToTarget > 200) followSpeed *= 2;
    followSpeed = min(followSpeed, 0.3);
    unit.x += dx * followSpeed * dt;
    unit.y += dy * followSpeed * dt;

    // Face direction of movement (not always toward player)
    if (distToTarget > 3) {
      unit._facing = dx > 0 ? 1 : -1;
    } else {
      // Idle: look around every 3-5 seconds
      unit._idleFaceTimer = (unit._idleFaceTimer || 0) + dt;
      if (unit._idleFaceTimer > 180 + (i % 3) * 60) { unit._facing = Math.random() > 0.5 ? 1 : -1; unit._idleFaceTimer = 0; }
    }

    // Walking wobble - subtle sine sway when moving
    if (distToTarget > 5) {
      unit.x += sin(frameCount * 0.1 + unit._sinPhase) * 0.5;
    }

    // Auto-attack enemies within range
    let atkRange = isRanged ? 90 : (isCav ? 70 : 60);
    unit._escortAtkTimer = (unit._escortAtkTimer || 0) - dt;
    if (unit._escortAtkTimer <= 0) {
      let target = _findNearestRaidEnemy(unit.x, unit.y, atkRange);
      if (target) {
        let dmg = unit.damage || 5;
        target.hp -= dmg;
        target.flashTimer = 8;
        unit._escortAtkTimer = isRanged ? 45 : (isCav ? 25 : 30);
        unit._atkAnim = 8; // arm swing frames
        if (typeof _spawnDamageNumber === 'function') _spawnDamageNumber(target.x, target.y, dmg, '#ffaa44');
        if (typeof spawnParticles === 'function') spawnParticles(target.x, target.y, 'combat', 2);
        if (!unit._shoutedRecently) { if (typeof addFloatingText === 'function') addFloatingText(w2sX(unit.x), w2sY(unit.y) - 18, '!', '#ff4444'); unit._shoutedRecently = 120; }
      }
    }
    if (unit._atkAnim > 0) unit._atkAnim -= dt;
    if (unit._shoutedRecently > 0) unit._shoutedRecently -= dt;
  }
}

function _isNearEnemies(x, y, range) {
  return !!_findNearestRaidEnemy(x, y, range);
}

function _findNearestRaidEnemy(x, y, range) {
  let nearest = null, nearD = range;

  // Home island raid enemies
  if (state.nations) {
    for (let k of Object.keys(state.nations)) {
      let rv = state.nations[k];
      if (!rv || !rv.raidParty) continue;
      for (let r of rv.raidParty) {
        if (r.hp <= 0) continue;
        let d = sqrt((r.x - x) * (r.x - x) + (r.y - y) * (r.y - y));
        if (d < nearD) { nearD = d; nearest = r; }
      }
    }
  }

  // Sea People raiders
  if (state._seaPeopleRaidParty) {
    for (let r of state._seaPeopleRaidParty) {
      if (r.hp <= 0) continue;
      let d = sqrt((r.x - x) * (r.x - x) + (r.y - y) * (r.y - y));
      if (d < nearD) { nearD = d; nearest = r; }
    }
  }

  // Expedition enemies
  if (state.conquest && state.conquest.active && state.conquest.enemies) {
    for (let e of state.conquest.enemies) {
      if (e.hp <= 0) continue;
      let d = sqrt((e.x - x) * (e.x - x) + (e.y - y) * (e.y - y));
      if (d < nearD) { nearD = d; nearest = e; }
    }
  }

  return nearest;
}

function drawEscortSoldier(unit) {
  let sx = w2sX(unit.x), sy = w2sY(unit.y);
  if (sx < -30 || sx > width + 30 || sy < -30 || sy > height + 30) return;
  let mil = getFactionMilitary();
  let uDef = UNIT_TYPES[unit.type] || UNIT_TYPES.legionary;
  let facing = unit._facing || ((unit.x < state.player.x) ? 1 : -1);
  let hOff = unit._heightOff || 0;
  let cOff = unit._colorOff || 0;

  // Walking bob when moving (staggered phase per soldier)
  let _moveDist = sqrt((unit._lastX !== undefined ? unit.x - unit._lastX : 0) ** 2 + (unit._lastY !== undefined ? unit.y - unit._lastY : 0) ** 2);
  let _walkBob = _moveDist > 0.3 ? sin(frameCount * 0.2 + (unit._sinPhase || 0)) * 1 : 0;
  unit._lastX = unit.x; unit._lastY = unit.y;

  // Attack arm swing offset
  let atkSwing = (unit._atkAnim > 0) ? sin(unit._atkAnim * 0.8) * 4 : 0;

  push();
  translate(sx, sy + floatOffset + _walkBob + hOff);
  scale(facing, 1);
  noStroke();

  // Shadow
  fill(0, 0, 0, 35);
  ellipse(0, 3, 10, 5);

  if (unit.type === 'cavalry') {
    // Horse
    fill(120, 90, 60);
    rect(-5, -1, 10, 6, 2);
    // Rider
    fill(mil.tunic[0], mil.tunic[1], mil.tunic[2]);
    rect(-2, -8, 4, 7);
    fill(mil.helm[0], mil.helm[1], mil.helm[2]);
    rect(-2, -10, 4, 2);
    // Legs
    fill(80, 60, 40);
    let step = sin(frameCount * 0.15 + unit.x) * 1.5;
    rect(-4, 5, 2, 3 + step);
    rect(2, 5, 2, 3 - step);
  } else if (unit.type === 'archer') {
    fill(mil.tunic[0] * 0.8, mil.tunic[1] * 0.9, mil.tunic[2] * 0.8);
    rect(-3, -8, 6, 10);
    fill(195, 165, 130);
    rect(-2, -12, 4, 4);
    fill(mil.helm[0], mil.helm[1], mil.helm[2]);
    rect(-3, -13, 6, 3);
    // Bow
    stroke(120, 90, 50); strokeWeight(1); noFill();
    arc(4, -6, 4, 10, -HALF_PI, HALF_PI);
    noStroke();
    fill(mil.legs[0], mil.legs[1], mil.legs[2]);
    rect(-2, 2, 2, 3);
    rect(1, 2, 2, 3);
  } else if (unit.type === 'siege_ram') {
    fill(100, 70, 40);
    rect(-8, -4, 16, 10, 2);
    fill(160, 160, 170);
    rect(8, -3, 3, 6);
    fill(60, 50, 35);
    ellipse(-5, 7, 5, 5);
    ellipse(5, 7, 5, 5);
  } else if (unit.type === 'centurion') {
    fill(mil.tunic[0], mil.tunic[1], mil.tunic[2]);
    rect(-4, -8, 8, 10);
    fill(200, 170, 60);
    rect(-4, -7, 8, 4);
    fill(195, 165, 130);
    rect(-2, -12, 4, 4);
    fill(200, 40, 40);
    rect(-1, -15, 2, 4);
    fill(mil.shield[0], mil.shield[1], mil.shield[2]);
    rect(-6, -6, 2, 8);
    fill(mil.legs[0], mil.legs[1], mil.legs[2]);
    rect(-3, 2, 2, 4);
    rect(1, 2, 2, 4);
    // Aura glow
    noFill();
    stroke(200, 170, 60, 50 + sin(frameCount * 0.08) * 25);
    strokeWeight(1);
    ellipse(0, -2, 24, 20);
    noStroke();
  } else {
    // Legionary default — with per-soldier color variation
    fill(mil.tunic[0] + cOff, mil.tunic[1] + cOff, mil.tunic[2] + cOff);
    rect(-3, -8, 6, 10);
    fill(mil.armor[0] + cOff * 0.5, mil.armor[1] + cOff * 0.5, mil.armor[2] + cOff * 0.5);
    rect(-3, -7, 6, 4);
    fill(195, 165, 130);
    rect(-2, -12, 4, 4);
    fill(mil.helm[0], mil.helm[1], mil.helm[2]);
    rect(-3, -13, 6, 3);
    // Spear with attack swing
    stroke(100, 80, 60); strokeWeight(1);
    line(3 + atkSwing, -15, 3, 4); noStroke();
    fill(mil.shield[0], mil.shield[1], mil.shield[2]);
    if (mil.shieldShape === 'round') ellipse(-4, -3, 5, 5);
    else rect(-5, -6, 2, 6);
    // Walking anim — staggered phase
    let step = sin(frameCount * 0.12 + (unit._sinPhase || 0)) * 2;
    fill(mil.legs[0], mil.legs[1], mil.legs[2]);
    rect(-2, 2, 2, 3);
    rect(0 + step * 0.3, 2, 2, 3);
  }

  pop();
}

function drawOfficerSprite(officer, idx) {
  let sx = w2sX(officer.x), sy = w2sY(officer.y);
  if (sx < -30 || sx > width + 30 || sy < -30 || sy > height + 30) return;
  let mil = getFactionMilitary();

  push();
  translate(sx, sy + floatOffset);
  noStroke();

  // Shadow
  fill(0, 0, 0, 35);
  ellipse(0, 4, 14, 5);

  // Body — officer cape
  fill(mil.cape[0], mil.cape[1], mil.cape[2]);
  rect(-4, -10, 8, 12);

  // Gold armor plate
  fill(200, 170, 60);
  rect(-4, -9, 8, 5);

  // Head
  fill(195, 165, 130);
  rect(-2, -14, 4, 4);

  // Officer helm with tall crest
  fill(mil.helm[0], mil.helm[1], mil.helm[2]);
  rect(-3, -15, 6, 3);
  fill(mil.helmCrest[0], mil.helmCrest[1], mil.helmCrest[2]);
  rect(-1, -19, 2, 5); // tall crest

  // Sword
  fill(200, 200, 210);
  rect(5, -12, 1, 8);

  // Shield
  fill(mil.shield[0], mil.shield[1], mil.shield[2]);
  if (mil.shieldShape === 'round') ellipse(-5, -4, 6, 6);
  else rect(-6, -7, 2, 7);

  // Legs
  fill(mil.legs[0], mil.legs[1], mil.legs[2]);
  rect(-3, 2, 2, 4);
  rect(1, 2, 2, 4);

  // Rank indicator
  let rankCol = officer.rank === 'legate' ? color(200, 170, 60) : officer.rank === 'centurion' ? color(180, 180, 190) : color(160, 120, 80);
  fill(rankCol);
  ellipse(0, -21, 4, 4);

  // Name label
  fill(220, 200, 140, 180); textSize(8); textAlign(CENTER, BOTTOM);
  text(officer.name, 0, -23);

  pop();
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── WAR ENGINE — ATTACK SEQUENCE (enhanced naval + siege) ──────────────
// ═══════════════════════════════════════════════════════════════════════════

var _warBattle = null; // { phase, timer, attackers, defenders, ships, walls, projectiles, context }

const WAR_PHASES = ['naval', 'landing', 'siege', 'battle', 'result'];

function startWarBattle(attackerArmy, defenderArmy, context) {
  // context: { type: 'attack'|'defend', nationKey, hasShips, hasWalls, onVictory, onDefeat }
  let hasShips = context.hasShips || false;
  let hasWalls = context.hasWalls || false;

  _warBattle = {
    phase: hasShips ? 'naval' : 'landing',
    timer: 0,
    phaseTimer: 0,
    attackers: attackerArmy.map(function(u, i) {
      return {
        ...u,
        x: 60 + (i % 6) * 18,
        y: 100 + floor(i / 6) * 25 + random(-5, 5),
        targetIdx: -1,
        attackTimer: 0,
        side: 'left',
        alive: true,
        flashTimer: 0,
      };
    }),
    defenders: defenderArmy.map(function(u, i) {
      return {
        ...u,
        x: width - 60 - (i % 6) * 18,
        y: 100 + floor(i / 6) * 25 + random(-5, 5),
        targetIdx: -1,
        attackTimer: 0,
        side: 'right',
        alive: true,
        flashTimer: 0,
      };
    }),
    ships: {
      player: hasShips ? { hp: 100, maxHp: 100, x: 80, y: height / 2 } : null,
      enemy: hasShips ? { hp: 80, maxHp: 80, x: width - 80, y: height / 2 } : null,
    },
    walls: hasWalls ? { hp: 150, maxHp: 150, breached: false } : null,
    projectiles: [],
    context: context,
    result: null,
    resultTimer: 0,
    _navalDone: false,
    _landingDone: false,
    _siegeDone: false,
  };
}

function updateWarBattle(dt) {
  let w = _warBattle;
  if (!w) return;
  w.timer += dt;
  w.phaseTimer += dt;

  switch (w.phase) {
    case 'naval': {
      // Ship HP bars, auto-fire
      let ps = w.ships.player, es = w.ships.enemy;
      if (ps && es) {
        // Both ships fire at each other
        if (w.phaseTimer % 30 < dt) {
          es.hp -= 8 + floor(random(4));
          w.projectiles.push({ x: ps.x + 20, y: ps.y, vx: 4, vy: random(-0.5, 0.5), life: 40, side: 'left', damage: 0 });
        }
        if (w.phaseTimer % 40 < dt) {
          ps.hp -= 5 + floor(random(3));
          w.projectiles.push({ x: es.x - 20, y: es.y, vx: -3, vy: random(-0.5, 0.5), life: 40, side: 'right', damage: 0 });
        }
        if (es.hp <= 0 || ps.hp <= 0 || w.phaseTimer > 600) {
          w._navalDone = true;
          w.phase = 'landing';
          w.phaseTimer = 0;
          // If player ship sunk, lose 30% army
          if (ps.hp <= 0) {
            let toLose = ceil(w.attackers.filter(function(u) { return u.alive; }).length * 0.3);
            for (let i = 0; i < toLose; i++) {
              let alive = w.attackers.filter(function(u) { return u.alive; });
              if (alive.length > 0) alive[floor(random(alive.length))].alive = false;
            }
          }
        }
      } else {
        w.phase = 'landing';
        w.phaseTimer = 0;
      }
      break;
    }
    case 'landing': {
      // Troops deploy: spread out over 2 seconds
      if (w.phaseTimer > 120) {
        w._landingDone = true;
        w.phase = w.walls && !w.walls.breached ? 'siege' : 'battle';
        w.phaseTimer = 0;
      }
      // Move attackers to landing positions
      for (let u of w.attackers) {
        if (!u.alive) continue;
        let tx = 120 + (u.x - 60) * 0.8;
        u.x += (tx - u.x) * 0.03 * dt;
      }
      break;
    }
    case 'siege': {
      // Siege units attack walls, archers suppress
      if (!w.walls || w.walls.breached) { w.phase = 'battle'; w.phaseTimer = 0; break; }
      let wallX = width * 0.55;
      for (let u of w.attackers) {
        if (!u.alive) continue;
        let uDef = UNIT_TYPES[u.type] || UNIT_TYPES.legionary;
        if (u.type === 'siege_ram') {
          // Move toward wall
          if (u.x < wallX - 20) { u.x += 1.0 * dt; }
          else if (u.attackTimer <= 0) {
            let dmg = (u.damage || 15) * (uDef.vsBuildingMult || 1);
            w.walls.hp -= dmg;
            u.attackTimer = 45;
            if (typeof triggerScreenShake === 'function') triggerScreenShake(3, 6);
          }
        } else if (uDef.ranged) {
          // Shoot over walls at defenders
          if (u.attackTimer <= 0) {
            let aliveD = w.defenders.filter(function(e) { return e.alive; });
            if (aliveD.length > 0) {
              let t = aliveD[floor(random(aliveD.length))];
              w.projectiles.push({ x: u.x, y: u.y, vx: 3, vy: (t.y - u.y) * 0.02, damage: u.damage || 5, life: 80, side: 'left' });
              u.attackTimer = 50;
            }
          }
        } else {
          // Melee waits at wall
          if (u.x < wallX - 30) u.x += 0.8 * dt;
        }
        u.attackTimer = max(0, u.attackTimer - dt);
      }
      // Defenders fire from behind walls
      for (let d of w.defenders) {
        if (!d.alive) continue;
        d.attackTimer = max(0, d.attackTimer - dt);
        if (d.attackTimer <= 0) {
          let aliveA = w.attackers.filter(function(a) { return a.alive; });
          if (aliveA.length > 0) {
            let t = aliveA[floor(random(aliveA.length))];
            t.hp -= 3;
            t.flashTimer = 6;
            if (t.hp <= 0) { t.alive = false; t.hp = 0; }
            d.attackTimer = 50;
          }
        }
      }
      if (w.walls.hp <= 0) {
        w.walls.breached = true;
        w.phase = 'battle';
        w.phaseTimer = 0;
        if (typeof triggerScreenShake === 'function') triggerScreenShake(8, 20);
        addFloatingText(width / 2, height * 0.3, 'WALLS BREACHED!', '#ffaa44');
      }
      break;
    }
    case 'battle': {
      // Standard army battle logic
      let atk = w.attackers.filter(function(u) { return u.alive; });
      let def = w.defenders.filter(function(u) { return u.alive; });
      if (atk.length === 0) { w.phase = 'result'; w.result = 'defeat'; w.resultTimer = 0; break; }
      if (def.length === 0) { w.phase = 'result'; w.result = 'victory'; w.resultTimer = 0; break; }

      let atkHasCent = atk.some(function(u) { return u.type === 'centurion'; });
      let defHasCent = def.some(function(u) { return u.type === 'centurion'; });
      let atkHasFB = atk.some(function(u) { return u.type === 'flag_bearer'; });
      let defHasFB = def.some(function(u) { return u.type === 'flag_bearer'; });
      _updateBattleSide(w.attackers, w.defenders, dt, (atkHasCent ? 1.2 : 1.0) * (atkHasFB ? 1.1 : 1.0), w);
      _updateBattleSide(w.defenders, w.attackers, dt, (defHasCent ? 1.2 : 1.0) * (defHasFB ? 1.1 : 1.0), w);
      break;
    }
    case 'result': {
      w.resultTimer += dt;
      if (w.resultTimer > 300) {
        let ctx = w.context;
        if (w.result === 'victory' && ctx.onVictory) ctx.onVictory(w);
        if (w.result === 'defeat' && ctx.onDefeat) ctx.onDefeat(w);
        _warBattle = null;
      }
      break;
    }
  }

  // Update projectiles
  for (let i = w.projectiles.length - 1; i >= 0; i--) {
    let pr = w.projectiles[i];
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    pr.life -= dt;
    if (pr.life <= 0) { w.projectiles.splice(i, 1); continue; }
    if (pr.damage > 0) {
      let targets = pr.side === 'left' ? w.defenders : w.attackers;
      for (let t of targets) {
        if (!t.alive) continue;
        if (abs(t.x - pr.x) < 12 && abs(t.y - pr.y) < 12) {
          t.hp -= pr.damage;
          t.flashTimer = 8;
          if (t.hp <= 0) { t.alive = false; t.hp = 0; }
          w.projectiles.splice(i, 1);
          break;
        }
      }
    }
  }
}

function drawWarBattle() {
  let w = _warBattle;
  if (!w) return;

  push();
  noStroke();

  // Background
  let nKey = w.context.nationKey;
  if (nKey && typeof _drawNationBattleBackground === 'function') {
    _drawNationBattleBackground(nKey, w);
  } else {
    fill(15, 10, 8, 230);
    rect(0, 0, width, height);
  }

  // Phase banner
  fill(220, 185, 80); textAlign(CENTER, TOP); textSize(14);
  let phaseLabel = w.phase === 'naval' ? 'NAVAL BATTLE' :
                   w.phase === 'landing' ? 'BEACH LANDING' :
                   w.phase === 'siege' ? 'SIEGE' :
                   w.phase === 'battle' ? 'BATTLE' : '';
  text(phaseLabel, width / 2, 10);

  // Ground
  fill(60, 50, 35);
  rect(0, height - 40, width, 40);

  // Naval phase: draw ships
  if (w.phase === 'naval' && w.ships.player && w.ships.enemy) {
    _drawWarShip(w.ships.player, true);
    _drawWarShip(w.ships.enemy, false);
    // Water
    fill(40, 80, 120, 100);
    rect(0, height - 60, width, 20);
  }

  // Walls during siege
  if (w.walls && !w.walls.breached && (w.phase === 'siege' || w.phase === 'battle')) {
    let wallX = width * 0.55;
    let wallH = 60;
    let hpPct = max(0, w.walls.hp / w.walls.maxHp);
    fill(160 * hpPct, 140 * hpPct, 110 * hpPct);
    rect(wallX - 4, height - 40 - wallH, 8, wallH);
    // Crenellations
    for (let c = 0; c < 3; c++) {
      rect(wallX - 8 + c * 6, height - 40 - wallH - 6, 4, 6);
    }
    // HP bar
    fill(40, 0, 0, 180);
    rect(wallX - 20, height - 40 - wallH - 14, 40, 4);
    fill(hpPct > 0.5 ? color(80, 180, 80) : color(200, 60, 40));
    rect(wallX - 20, height - 40 - wallH - 14, floor(40 * hpPct), 4);
    // Damage cracks
    if (hpPct < 0.5) {
      stroke(40, 30, 20, 200); strokeWeight(1);
      line(wallX - 2, height - 40 - wallH * 0.3, wallX + 2, height - 40 - wallH * 0.7);
      noStroke();
    }
  }

  // Draw units
  _drawBattleUnits(w.attackers, '#cc4444', 1);
  _drawBattleUnits(w.defenders, '#4488cc', -1);

  // Projectiles
  for (let pr of w.projectiles) {
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
  let atkAlive = w.attackers.filter(function(u) { return u.alive; }).length;
  let defAlive = w.defenders.filter(function(u) { return u.alive; }).length;
  fill(200, 80, 80); textSize(11); textAlign(LEFT, TOP);
  text('Your Army: ' + atkAlive + '/' + w.attackers.length, 10, 30);
  fill(80, 130, 200); textAlign(RIGHT, TOP);
  text('Enemy: ' + defAlive + '/' + w.defenders.length, width - 10, 30);

  // Ship HP bars (naval)
  if (w.ships.player && w.phase === 'naval') {
    _drawHPBar(30, 50, 80, 6, w.ships.player.hp, w.ships.player.maxHp, 'Your Ship');
    _drawHPBar(width - 110, 50, 80, 6, w.ships.enemy.hp, w.ships.enemy.maxHp, 'Enemy Ship');
  }

  // Result screen
  if (w.phase === 'result') {
    fill(0, 0, 0, min(180, w.resultTimer * 3));
    rect(0, 0, width, height);
    let rAlpha = min(255, w.resultTimer * 4);
    if (w.result === 'victory') {
      fill(220, 185, 60, rAlpha); textSize(22); textAlign(CENTER, CENTER);
      text('VICTORY!', width / 2, height / 2 - 30);
      fill(180, 220, 120, rAlpha); textSize(11);
      let survived = w.attackers.filter(function(u) { return u.alive; }).length;
      text(survived + ' of ' + w.attackers.length + ' soldiers survived', width / 2, height / 2);
      // Loot options
      fill(200, 180, 120, rAlpha); textSize(10);
      text('[1] Occupy  [2] Vassalize  [3] Colonize', width / 2, height / 2 + 25);
    } else {
      fill(255, 80, 60, rAlpha); textSize(22); textAlign(CENTER, CENTER);
      text('DEFEAT', width / 2, height / 2 - 30);
      fill(200, 160, 120, rAlpha); textSize(11);
      text('Your army was overwhelmed...', width / 2, height / 2);
    }
  }

  pop();
}

function _drawWarShip(ship, isPlayer) {
  let sx = ship.x, sy = ship.y;
  push();
  translate(sx, sy);
  if (!isPlayer) scale(-1, 1);
  noStroke();
  // Hull
  fill(isPlayer ? color(120, 80, 40) : color(100, 60, 30));
  beginShape();
  vertex(-25, 0); vertex(-20, 10); vertex(20, 10); vertex(25, -2); vertex(20, -8); vertex(-18, -8);
  endShape(CLOSE);
  // Sail
  fill(isPlayer ? color(200, 180, 140) : color(180, 120, 80));
  rect(-5, -30, 10, 22);
  // Mast
  stroke(80, 60, 40); strokeWeight(2);
  line(0, -32, 0, 5);
  noStroke();
  // Ram
  fill(160, 160, 170);
  rect(22, -4, 6, 4);
  pop();
}

function _drawHPBar(x, y, w2, h, hp, maxHp, label) {
  let pct = maxHp > 0 ? max(0, hp / maxHp) : 0;
  fill(40, 0, 0, 180); noStroke();
  rect(x, y, w2, h);
  fill(pct > 0.5 ? color(80, 180, 80) : pct > 0.25 ? color(200, 180, 40) : color(200, 60, 40));
  rect(x, y, floor(w2 * pct), h);
  fill(200, 180, 140); textSize(8); textAlign(LEFT, BOTTOM);
  text(label + ': ' + ceil(hp) + '/' + maxHp, x, y - 2);
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── WAR ENGINE — DEFENSE SEQUENCE (enhanced with warning + camera) ─────
// ═══════════════════════════════════════════════════════════════════════════

var _defenseWarning = null; // { timer, nationKey, raidSize }

function triggerDefenseWarning(raidSize, nationKey) {
  _defenseWarning = {
    timer: 300, // 5 seconds
    nationKey: nationKey,
    raidSize: raidSize,
    phase: 'warning', // warning -> battle
    _hornPlayed: false,
    _cameraPanned: false,
  };
}

function updateDefenseWarning(dt) {
  let dw = _defenseWarning;
  if (!dw) return;

  if (dw.phase === 'warning') {
    // Play warning horn
    if (!dw._hornPlayed) {
      dw._hornPlayed = true;
      if (typeof snd !== 'undefined' && snd) snd.playSFX('war_horn');
    }
    dw.timer -= dt;
    if (dw.timer <= 0) {
      // Start the defense battle
      dw.phase = 'battle';
      let lg = state.legia;
      let garrison = (lg && lg.army) ? lg.army.filter(function(u) { return u.garrison; }) : [];
      if (garrison.length > 0) {
        startIslandDefense(dw.raidSize, dw.nationKey);
      }
      _defenseWarning = null;
    }
  }
}

function drawDefenseWarning() {
  let dw = _defenseWarning;
  if (!dw || dw.phase !== 'warning') return;

  push();
  noStroke();

  // Flashing red banner
  let flashAlpha = 150 + sin(frameCount * 0.15) * 80;
  fill(180, 30, 20, flashAlpha);
  rect(0, height * 0.15, width, 40);

  // Text
  fill(255, 240, 200, min(255, flashAlpha + 50));
  textAlign(CENTER, CENTER); textSize(16);
  text('INCOMING RAID!', width / 2, height * 0.15 + 14);

  let nationName = (typeof getNationName === 'function') ? getNationName(dw.nationKey) : dw.nationKey;
  fill(255, 220, 160, flashAlpha);
  textSize(11);
  text(nationName + ' sends ' + dw.raidSize + ' warriors!', width / 2, height * 0.15 + 30);

  // Countdown
  let secs = ceil(dw.timer / 60);
  fill(255, 255, 200);
  textSize(12);
  text('Prepare! ' + secs + 's', width / 2, height * 0.22 + 14);

  pop();
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── FORMATION COMBAT VISUALS — cluster HP bars + kill animations ───────
// ═══════════════════════════════════════════════════════════════════════════

function drawFormationOverlay(battle) {
  if (!battle) return;
  push();

  // Group HP bars for clusters of units
  let leftAlive = battle.attackers.filter(function(u) { return u.alive; });
  let rightAlive = battle.defenders.filter(function(u) { return u.alive; });

  if (leftAlive.length > 0) {
    let avgX = leftAlive.reduce(function(s, u) { return s + u.x; }, 0) / leftAlive.length;
    let avgY = min.apply(null, leftAlive.map(function(u) { return u.y; })) - 25;
    let totalHP = leftAlive.reduce(function(s, u) { return s + u.hp; }, 0);
    let maxHP = leftAlive.reduce(function(s, u) { return s + u.maxHp; }, 0);
    _drawHPBar(avgX - 30, avgY, 60, 5, totalHP, maxHP, 'Your Forces');
  }

  if (rightAlive.length > 0) {
    let avgX = rightAlive.reduce(function(s, u) { return s + u.x; }, 0) / rightAlive.length;
    let avgY = min.apply(null, rightAlive.map(function(u) { return u.y; })) - 25;
    let totalHP = rightAlive.reduce(function(s, u) { return s + u.hp; }, 0);
    let maxHP = rightAlive.reduce(function(s, u) { return s + u.maxHp; }, 0);
    _drawHPBar(avgX - 30, avgY, 60, 5, totalHP, maxHP, 'Enemy Forces');
  }

  // Commander aura glow (if centurion present)
  let cents = leftAlive.filter(function(u) { return u.type === 'centurion'; });
  for (let c of cents) {
    noFill();
    stroke(200, 170, 60, 40 + sin(frameCount * 0.06) * 20);
    strokeWeight(1);
    ellipse(c.x, c.y, 50, 40);
    noStroke();
  }

  // Dead unit fade-out
  for (let u of battle.attackers.concat(battle.defenders)) {
    if (!u.alive && u._fadeTimer === undefined) u._fadeTimer = 30;
    if (!u.alive && u._fadeTimer > 0) {
      u._fadeTimer -= 1;
      let fa = (u._fadeTimer / 30) * 150;
      fill(100, 50, 50, fa);
      noStroke();
      // Fallen soldier
      push();
      translate(u.x, u.y);
      rotate(HALF_PI);
      rect(-3, -4, 6, 8);
      pop();
    }
  }

  pop();
}

// ─── ISLAND INVASION SYSTEM ──────────────────────────────────────────────

function startInvasion(nationKey) {
  let nation = state.nations[nationKey];
  if (!nation || !state.legia || !state.legia.army) return;
  let armySize = state.legia.army.length;
  if (armySize === 0) return;

  let ix = nation.isleX, iy = nation.isleY;
  let ry = (nation.islandState && nation.islandState.islandRY) || nation.isleRY || 260;

  state.invasion = {
    active: true,
    target: nationKey,
    attackers: [],
    defenders: [],
    phase: 'fighting',
  };

  for (let i = 0; i < armySize; i++) {
    state.invasion.attackers.push({
      x: ix + random(-80, 80),
      y: iy + ry * 0.3,
      hp: 20, maxHp: 20, damage: 5, speed: 1.2,
      type: (state.legia.army[i] && state.legia.army[i].type) || 'legionary',
      state: 'advancing', target: null,
    });
  }

  // Use bot's actual army for defenders (stronger if they've recruited)
  let botArmy = (nation.islandState && nation.islandState.legia && nation.islandState.legia.army) ? nation.islandState.legia.army : [];
  let defenderCount = max(3, botArmy.length > 0 ? botArmy.length : (nation.military || 3));
  for (let i = 0; i < defenderCount; i++) {
    let unit = botArmy[i] || {};
    state.invasion.defenders.push({
      x: ix + random(-60, 60),
      y: iy + random(-40, 40),
      hp: unit.maxHp || 15, maxHp: unit.maxHp || 15,
      damage: unit.damage || 4, speed: unit.speed || 1.0,
      type: unit.type || 'legionary', state: 'defending', target: null,
    });
  }

  addNotification('Invasion of ' + getNationName(nationKey) + ' begins!', '#ff6644');
}

function updateInvasion(dt) {
  if (!state.invasion || !state.invasion.active) return;
  let inv = state.invasion;
  let nation = state.nations[inv.target];
  if (!nation) return;

  // Find pyramid/base position (invasion target)
  let templeB = (nation.islandState && nation.islandState.buildings) ?
    nation.islandState.buildings.find(b => b.isTemple || b.type === 'temple') : null;
  let pyramidPos = nation.islandState && nation.islandState.pyramid ? nation.islandState.pyramid : null;
  let templeX = templeB ? templeB.x : (pyramidPos ? pyramidPos.x : nation.isleX);
  let templeY = templeB ? templeB.y : (pyramidPos ? pyramidPos.y : nation.isleY - 30);

  // Update each attacker
  for (let a of inv.attackers) {
    if (a.hp <= 0) { a.state = 'dead'; a.deathTimer = (a.deathTimer || 0) + dt; continue; }
    a.attackTimer = max(0, (a.attackTimer || 0) - dt);

    // Find nearest alive defender
    let nearest = null, nearDist = 150;
    for (let d of inv.defenders) {
      if (d.hp <= 0) continue;
      let dd = sqrt((a.x-d.x)*(a.x-d.x) + (a.y-d.y)*(a.y-d.y));
      if (dd < nearDist) { nearest = d; nearDist = dd; }
    }

    if (nearest && nearDist < 25) {
      // ATTACK
      a.state = 'fighting';
      a.facing = nearest.x > a.x ? 'right' : 'left';
      if (a.attackTimer <= 0) {
        nearest.hp -= a.damage;
        a.attackTimer = 25; // cooldown
        a.swingAnim = 8; // frames of swing animation
        if (typeof addFloatingText === 'function')
          addFloatingText(w2sX(nearest.x), w2sY(nearest.y) - 15, '-' + a.damage, '#ff4444');
        if (typeof spawnParticles === 'function')
          spawnParticles(nearest.x, nearest.y, 'hit', 2);
        if (nearest.hp <= 0) {
          nearest.state = 'dead';
          nearest.deathTimer = 0;
        }
      }
    } else if (nearest && nearDist < 150) {
      // CHASE
      a.state = 'walking';
      let dx = nearest.x - a.x, dy = nearest.y - a.y;
      let d = sqrt(dx*dx + dy*dy);
      a.x += (dx/d) * a.speed * dt;
      a.y += (dy/d) * a.speed * dt;
      a.facing = dx > 0 ? 'right' : 'left';
      a.walkFrame = (a.walkFrame || 0) + dt * 0.15;
    } else {
      // No defenders -- advance to temple
      let dx = templeX - a.x, dy = templeY - a.y;
      let d = sqrt(dx*dx + dy*dy);
      if (d > 20) {
        a.state = 'walking';
        a.x += (dx/d) * a.speed * dt;
        a.y += (dy/d) * a.speed * dt;
        a.facing = dx > 0 ? 'right' : 'left';
        a.walkFrame = (a.walkFrame || 0) + dt * 0.15;
      } else {
        // AT TEMPLE -- attack it
        a.state = 'attacking_temple';
        if (a.attackTimer <= 0) {
          let tHP = nation.islandState ? nation.islandState.templeHP : 100;
          tHP = max(0, tHP - a.damage);
          if (nation.islandState) nation.islandState.templeHP = tHP;
          a.attackTimer = 30;
          a.swingAnim = 8;
          if (typeof addFloatingText === 'function')
            addFloatingText(w2sX(templeX), w2sY(templeY) - 20, '-' + a.damage, '#ff6644');
        }
      }
    }
    a.swingAnim = max(0, (a.swingAnim || 0) - dt);
  }

  // Update each defender (same logic but they stay near temple)
  for (let d of inv.defenders) {
    if (d.hp <= 0) { d.state = 'dead'; d.deathTimer = (d.deathTimer || 0) + dt; continue; }
    d.attackTimer = max(0, (d.attackTimer || 0) - dt);

    let nearest = null, nearDist = 120;
    for (let a of inv.attackers) {
      if (a.hp <= 0) continue;
      let dd = sqrt((d.x-a.x)*(d.x-a.x) + (d.y-a.y)*(d.y-a.y));
      if (dd < nearDist) { nearest = a; nearDist = dd; }
    }

    if (nearest && nearDist < 25) {
      d.state = 'fighting';
      d.facing = nearest.x > d.x ? 'right' : 'left';
      if (d.attackTimer <= 0) {
        nearest.hp -= d.damage;
        d.attackTimer = 30;
        d.swingAnim = 8;
        if (typeof addFloatingText === 'function')
          addFloatingText(w2sX(nearest.x), w2sY(nearest.y) - 15, '-' + d.damage, '#ff4444');
        if (nearest.hp <= 0) { nearest.state = 'dead'; nearest.deathTimer = 0; }
      }
    } else if (nearest) {
      d.state = 'walking';
      let dx = nearest.x - d.x, dy = nearest.y - d.y;
      let dd = sqrt(dx*dx + dy*dy);
      d.x += (dx/dd) * d.speed * dt;
      d.y += (dy/dd) * d.speed * dt;
      d.facing = dx > 0 ? 'right' : 'left';
      d.walkFrame = (d.walkFrame || 0) + dt * 0.15;
    } else {
      d.state = 'idle';
    }
    d.swingAnim = max(0, (d.swingAnim || 0) - dt);
  }

  // Make bot character fight too
  if (typeof BotAI !== 'undefined' && BotAI.bots[inv.target]) {
    let bot = BotAI.bots[inv.target];
    bot.task = { type: 'defend', target: { x: templeX, y: templeY }, timer: 0 };
    let nearestAtk = null, nearDist = 100;
    for (let a of inv.attackers) {
      if (a.hp <= 0) continue;
      let dd = sqrt((bot.x-a.x)*(bot.x-a.x) + (bot.y-a.y)*(bot.y-a.y));
      if (dd < nearDist) { nearestAtk = a; nearDist = dd; }
    }
    if (nearestAtk && nearDist < 30) {
      if (frameCount % 20 === 0) {
        nearestAtk.hp -= 8;
        if (typeof addFloatingText === 'function')
          addFloatingText(w2sX(nearestAtk.x), w2sY(nearestAtk.y) - 15, '-8', '#ff8800');
        if (nearestAtk.hp <= 0) { nearestAtk.state = 'dead'; nearestAtk.deathTimer = 0; }
      }
    } else if (nearestAtk) {
      let dx = nearestAtk.x - bot.x, dy = nearestAtk.y - bot.y;
      let dd = sqrt(dx*dx + dy*dy);
      bot.x += (dx/dd) * 2.5;
      bot.y += (dy/dd) * 2.5;
    }
  }

  // Victory / Defeat check
  let aliveAtk = inv.attackers.filter(a => a.hp > 0).length;
  let aliveDef = inv.defenders.filter(d => d.hp > 0).length;
  let tHP = nation.islandState ? (nation.islandState.templeHP || 0) : 100;

  if (tHP <= 0) {
    inv.active = false;
    nation.defeated = true;
    nation.vassal = true;
    nation._vassalOf = state.faction || 'rome';
    // Conquest rewards: loot gold, gain tribute, boost reputation
    let lootGold = Math.floor((nation.gold || 0) * 0.5);
    state.gold = (state.gold || 0) + lootGold;
    nation.gold = Math.floor((nation.gold || 0) * 0.5);
    let lootWood = Math.floor((nation.islandState && nation.islandState.wood || 0) * 0.3);
    let lootStone = Math.floor((nation.islandState && nation.islandState.stone || 0) * 0.3);
    state.wood = (state.wood || 0) + lootWood;
    state.stone = (state.stone || 0) + lootStone;
    // XP reward
    if (state.player) state.player.xp = (state.player.xp || 0) + 200;
    // Reputation boost with other nations (they fear you)
    if (state.nations) {
      for (let k of Object.keys(state.nations)) {
        if (k !== inv.target) {
          state.nations[k].reputation = Math.max(-100, (state.nations[k].reputation || 0) - 10);
          if (state.nations[k].military <= (nation.military || 0)) {
            // Weaker nations become more submissive
            state.nations[k].aggression = Math.max(0, (state.nations[k].aggression || 0.5) - 0.2);
          }
        }
      }
    }
    // Strategy engine update
    if (typeof StrategyEngine !== 'undefined' && StrategyEngine.session) {
      StrategyEngine.session.events.push({ day: state.day, type: 'conquest', target: inv.target });
    }
    let _cName = typeof getNationName === 'function' ? getNationName(inv.target) : inv.target;
    if (typeof addNotification === 'function') {
      addNotification('VICTORY! ' + _cName + ' conquered! +' + lootGold + 'g +' + lootWood + ' wood +' + lootStone + ' stone', '#ffdd44');
      addNotification(_cName + ' is now your vassal — pays tribute daily', '#ddcc44');
    }
    if (typeof addFloatingText === 'function')
      addFloatingText(width/2, height*0.3, 'ISLAND CONQUERED!', '#ffcc44');
    if (typeof spawnParticles === 'function') spawnParticles(width/2, height*0.4, 'divine', 20);
    if (typeof trackMilestone === 'function') trackMilestone('nation_conquered_' + inv.target);
    state._invasionTarget = null;
  } else if (aliveAtk === 0) {
    inv.active = false;
    state.legia.army = [];
    // Defeat consequences: reputation penalty, enemy emboldened
    nation.reputation = Math.max(-100, (nation.reputation || 0) - 15);
    nation.aggression = Math.min(1, (nation.aggression || 0.5) + 0.3);
    nation.military = (nation.military || 0) + 2; // defender reinforcements
    if (typeof addNotification === 'function')
      addNotification('Invasion failed! Army lost. ' + (typeof getNationName === 'function' ? getNationName(inv.target) : inv.target) + ' is emboldened!', '#ff4444');
    state._invasionTarget = null;
  }
}

function drawInvasion() {
  if (!state.invasion || !state.invasion.active) return;
  let inv = state.invasion;
  let fk = state.faction || 'rome';
  let playerFM = FACTION_MILITARY[fk] || FACTION_MILITARY.rome;
  let enemyFM = FACTION_MILITARY[inv.target] || playerFM;

  // Draw all soldiers
  _drawSoldierGroup(inv.attackers, playerFM);
  _drawSoldierGroup(inv.defenders, enemyFM);
}

function _drawSoldierGroup(soldiers, fm) {
  for (let s of soldiers) {
    let sx = w2sX(s.x), sy = w2sY(s.y);
    if (sx < -50 || sx > width + 50 || sy < -50 || sy > height + 50) continue;

    let alpha = 255;
    if (s.state === 'dead') {
      alpha = max(0, 255 - (s.deathTimer || 0) * 3);
      if (alpha <= 0) continue;
    }

    push();
    translate(floor(sx), floor(sy));
    noStroke();

    let fDir = s.facing === 'left' ? -1 : 1;
    if (fDir < 0) scale(-1, 1);

    // Hit flash — white overlay when recently struck
    let hitFlash = (s.flashTimer && s.flashTimer > 0);

    if (s.state === 'dead') {
      // Fallen soldier (horizontal) — fade + sink
      let sinkY = min(3, (s.deathTimer || 0) * 0.05);
      translate(0, sinkY);
      rotate(0.3 * fDir);
      fill(fm.tunic[0], fm.tunic[1], fm.tunic[2], alpha);
      rect(-6, 2, 12, 4, 1);
      fill(220, 190, 160, alpha);
      rect(-8, 2, 4, 3, 1);
      // Blood pool
      fill(120, 20, 20, alpha * 0.4);
      ellipse(0, 5, 10 + min(8, (s.deathTimer || 0) * 0.15), 4);
    } else {
      // Shadow
      fill(0, 0, 0, 25);
      ellipse(0, 8, 12, 5);

      // Fighting bob — slight bounce when attacking
      let fightBob = (s.state === 'fighting' && s.swingAnim > 0) ? -1.5 : 0;
      translate(0, fightBob);

      // Legs with walk animation
      let legOff = s.state === 'walking' ? sin(s.walkFrame || 0) * 2.5 : 0;
      let tr = fm.tunic[0], tg = fm.tunic[1], tb = fm.tunic[2];
      if (hitFlash) { tr = 255; tg = 255; tb = 255; }
      fill(tr * 0.7, tg * 0.7, tb * 0.7, alpha);
      rect(-3, 2 + legOff, 3, 5, 1);
      rect(1, 2 - legOff, 3, 5, 1);

      // Body
      fill(tr, tg, tb, alpha);
      rect(-5, -8, 10, 12, 1);

      // Shield (left arm) for defenders
      if (s.state === 'defending' || s.state === 'fighting') {
        fill(fm.helm[0] * 0.8, fm.helm[1] * 0.8, fm.helm[2] * 0.8, alpha);
        rect(-9, -7, 4, 8, 1);
        fill(fm.helm[0], fm.helm[1], fm.helm[2], alpha);
        rect(-8, -5, 2, 4, 0);
      } else {
        // Arms
        let skinR = hitFlash ? 255 : 220, skinG = hitFlash ? 255 : 190, skinB = hitFlash ? 255 : 160;
        fill(skinR, skinG, skinB, alpha);
        rect(-7, -5, 3, 6, 1);
      }

      // Weapon arm + weapon swing
      let armOff = (s.swingAnim && s.swingAnim > 0) ? -6 : 0;
      let skinR = hitFlash ? 255 : 220, skinG = hitFlash ? 255 : 190, skinB = hitFlash ? 255 : 160;
      fill(skinR, skinG, skinB, alpha);
      rect(4, -5 + armOff, 3, 6, 1);

      // Weapon (right hand) — glint on swing
      if (s.swingAnim && s.swingAnim > 0) {
        fill(210, 210, 220, alpha);
        rect(5, -12, 2, 8);
        // Sword glint
        fill(255, 255, 255, 120);
        rect(5, -12, 2, 2);
      } else {
        fill(180, 180, 180, alpha);
        rect(6, -6, 2, 6);
      }

      // Head
      fill(skinR, skinG, skinB, alpha);
      rect(-3, -14, 7, 7, 2);

      // Helm
      fill(fm.helm[0], fm.helm[1], fm.helm[2], alpha);
      rect(-3, -15, 7, 3, 1);
      // Helm crest for variation
      fill(fm.helm[0] + 20, fm.helm[1] + 10, fm.helm[2], alpha);
      rect(-1, -17, 3, 2, 1);

      // HP bar (only if damaged)
      if (s.hp < s.maxHp) {
        let hpRatio = s.hp / s.maxHp;
        fill(40, 40, 40, 180);
        rect(-6, -19, 12, 3);
        fill(hpRatio > 0.5 ? 50 : (hpRatio > 0.25 ? 200 : 220), hpRatio > 0.5 ? 200 : (hpRatio > 0.25 ? 140 : 40), 50);
        rect(-5, -18, 10 * hpRatio, 1);
      }

      // Hit recoil shake
      if (hitFlash) {
        // Already white-tinted above; add screen-shake offset
      }
    }

    pop();
  }
}

function drawInvasionHUD() {
  if (!state.invasion) return;
  let inv = state.invasion;

  // Before invasion: show prompt
  if (!inv.active && state._invasionTarget) {
    let nation = state.nations[state._invasionTarget];
    if (nation && state.legia && state.legia.army && state.legia.army.length > 0) {
      fill(255, 100, 60, 200 + sin(frameCount * 0.08) * 40);
      textAlign(CENTER, CENTER); textSize(14); noStroke();
      text('[E] INVADE ' + getNationName(state._invasionTarget).toUpperCase() + '!', width/2, height * 0.45);
      fill(200, 180, 140, 160); textSize(10);
      text('Your army: ' + state.legia.army.length + ' soldiers', width/2, height * 0.49);
      textAlign(LEFT, TOP);
    }
    return;
  }

  if (!inv.active) return;

  // Battle HUD
  let nation = state.nations[inv.target];
  let tHP = nation && nation.islandState ? (nation.islandState.templeHP || 0) : 0;
  let aliveAtk = inv.attackers.filter(a => a.hp > 0).length;
  let aliveDef = inv.defenders.filter(d => d.hp > 0).length;

  // Pyramid / Base HP bar (center top)
  push(); noStroke();
  fill(0, 0, 0, 180);
  rect(width/2 - 100, 60, 200, 24, 4);
  fill(180, 40, 30);
  rect(width/2 - 96, 64, 192 * (tHP / 100), 16, 2);
  fill(255); textAlign(CENTER, CENTER); textSize(11);
  text('Temple HP: ' + tHP + '/100', width/2, 72);

  // Army counts
  fill(0, 0, 0, 150);
  rect(width/2 - 100, 88, 95, 18, 3);
  rect(width/2 + 5, 88, 95, 18, 3);
  fill(100, 200, 100); textSize(9);
  text('Attackers: ' + aliveAtk, width/2 - 52, 97);
  fill(200, 100, 100);
  text('Defenders: ' + aliveDef, width/2 + 52, 97);

  textAlign(LEFT, TOP);
  pop();
}

// ═══ ISLAND INVASION — Quick combat when pressing F ═══
function startIslandInvasion(islandKey) {
  return startVisualInvasion(islandKey);
}

function startIslandInvasionAutoResolve(islandKey) {
  let defStr = 300;
  // World island defense
  if (typeof getWorldIsland === 'function') {
    let wisle = getWorldIsland(islandKey);
    if (wisle) defStr = wisle.defense || 500;
  }
  // Nation defense — scales with level and military
  let rv = state.nations[islandKey];
  if (rv) {
    defStr = 800 + (rv.level || 1) * 200 + (rv.military || 0) * 50;
    // Last Stand buff
    if (rv._lastStandBuff) defStr = Math.floor(defStr * 1.2);
  }

  // Player army strength — unit-based
  let lg = state.legia || {};
  let soldiers = lg.soldiers || 0;
  let playerStr = 0;

  if (lg.units && lg.units.length > 0) {
    // New unit system
    for (let u of lg.units) {
      let info = typeof getUnitInfo === 'function' ? getUnitInfo(u.type) : null;
      let baseStr = info ? info.str : 50;
      let lvlMult = 1 + (u.level || 0) * 0.1;
      playerStr += baseStr * lvlMult * (u.count || 1);
    }
  } else {
    // Legacy: simple soldier count
    playerStr = soldiers * 30 + (lg.castrumLevel || 0) * 100;
  }

  // Formation modifier
  let formation = state._activeFormation || 'line';
  if (typeof FORMATIONS !== 'undefined' && FORMATIONS[formation]) {
    playerStr = Math.floor(playerStr * (FORMATIONS[formation].atkBonus || FORMATIONS[formation].atkMod || 1));
  }

  // Island bonuses
  if (typeof isIslandControlled === 'function') {
    if (isIslandControlled('iron_keep')) playerStr = Math.floor(playerStr * 1.1); // +10% def from Iron Keep
    if (isIslandControlled('castrum_maris')) playerStr += 150; // +5 army cap equivalent
    if (isIslandControlled('siege_works') && rv) playerStr = Math.floor(playerStr * 1.2); // +20% siege
  }

  if (playerStr < 1) {
    if (typeof addFloatingText === 'function') addFloatingText(width/2, height*0.3, 'No army! Build a Castrum and recruit soldiers.', '#ff6644');
    if (typeof addNotification === 'function') addNotification('Press X to expand city, build Castrum at level 3, enter it with E, recruit with number keys.', '#ffaa44');
    return false;
  }

  // Combat resolution with variance
  let ratio = playerStr / Math.max(1, defStr);
  let roll = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
  let effectiveRatio = ratio * roll;
  let playerWins = effectiveRatio > 0.9;

  // Casualties scale with how close the fight was
  let closeness = Math.min(1, defStr / Math.max(1, playerStr));
  let baseCasualty = playerWins ? (0.15 + closeness * 0.25) : (0.4 + closeness * 0.3);

  if (lg.units && lg.units.length > 0) {
    // Remove casualties from units
    let totalUnits = lg.units.reduce((sum, u) => sum + (u.count || 1), 0);
    let casualties = Math.max(1, Math.floor(totalUnits * baseCasualty));
    let remaining = totalUnits - casualties;
    // Distribute losses proportionally
    for (let u of lg.units) {
      let unitLoss = Math.floor((u.count || 1) * baseCasualty);
      u.count = Math.max(0, (u.count || 1) - unitLoss);
    }
    // Remove empty units
    lg.units = lg.units.filter(u => u.count > 0);

    if (playerWins) {
      if (typeof captureIsland === 'function') captureIsland(islandKey);
      if (rv) { rv.defeated = true; rv.vassal = true; rv.military = 0; }
      if (!state._battlesWon) state._battlesWon = 0;
      state._battlesWon++;
      if (typeof addFloatingText === 'function') {
        addFloatingText(width/2, height*0.25, 'VICTORY! Island captured!', '#44ff44');
        addFloatingText(width/2, height*0.35, 'Lost ' + casualties + ' units (' + remaining + ' remain)', '#ffaa44');
      }
      if (typeof addNotification === 'function' && rv) addNotification(islandKey.toUpperCase() + ' conquered!', '#ffd700');
      if (typeof checkVictoryConditions === 'function') {
        let v = checkVictoryConditions();
        if (v && typeof triggerVictory === 'function') triggerVictory(v);
      }
    } else {
      if (typeof addFloatingText === 'function') {
        addFloatingText(width/2, height*0.25, 'DEFEATED! Retreating...', '#ff4444');
        addFloatingText(width/2, height*0.35, 'Lost ' + casualties + ' units (' + remaining + ' remain)', '#ffaa44');
      }
    }
  } else {
    // Legacy soldier system
    let casualties = Math.max(1, Math.floor(soldiers * baseCasualty));
    if (lg.soldiers) lg.soldiers = Math.max(0, lg.soldiers - casualties);

    if (playerWins) {
      if (typeof captureIsland === 'function') captureIsland(islandKey);
      if (rv) { rv.defeated = true; rv.vassal = true; rv.military = 0; }
      if (!state._battlesWon) state._battlesWon = 0;
      state._battlesWon++;
      if (typeof addFloatingText === 'function') {
        addFloatingText(width/2, height*0.25, 'VICTORY! Island captured!', '#44ff44');
        addFloatingText(width/2, height*0.35, 'Lost ' + casualties + ' soldiers', '#ffaa44');
      }
      if (typeof addNotification === 'function' && rv) addNotification(islandKey.toUpperCase() + ' conquered!', '#ffd700');
      if (typeof checkVictoryConditions === 'function') {
        let v = checkVictoryConditions();
        if (v && typeof triggerVictory === 'function') triggerVictory(v);
      }
    } else {
      if (typeof addFloatingText === 'function') {
        addFloatingText(width/2, height*0.25, 'DEFEATED! Retreating...', '#ff4444');
        addFloatingText(width/2, height*0.35, 'Lost ' + casualties + ' soldiers', '#ffaa44');
      }
    }
  }

  return playerWins;
}

// ═══ UNIT RECRUITMENT ═══
function recruitUnit(unitKey, count) {
  count = count || 1;
  let info = typeof getUnitInfo === 'function' ? getUnitInfo(unitKey) : null;
  if (!info) return false;

  let totalCost = info.cost * count;
  if (state.gold < totalCost) {
    if (typeof addFloatingText === 'function') addFloatingText(width/2, height*0.3, 'Not enough gold!', '#ff6644');
    return false;
  }

  // Check army cap
  let lg = state.legia || {};
  if (!lg.units) lg.units = [];
  let currentCount = lg.units.reduce((sum, u) => sum + (u.count || 1), 0) + (lg.soldiers || 0);
  let cap = typeof getArmyCap === 'function' ? getArmyCap() : 30;
  if (currentCount + count > cap) {
    if (typeof addFloatingText === 'function') addFloatingText(width/2, height*0.3, 'Army at capacity! (' + cap + ')', '#ff6644');
    return false;
  }

  state.gold -= totalCost;

  // Add to existing unit group or create new
  let existing = lg.units.find(u => u.type === unitKey);
  if (existing) {
    existing.count = (existing.count || 1) + count;
  } else {
    lg.units.push({ type: unitKey, count: count, level: 0 });
  }

  if (typeof addFloatingText === 'function') {
    addFloatingText(width/2, height*0.3, 'Recruited ' + count + ' ' + info.name + '!', '#44ff88');
  }
  return true;
}

// ═══ VISUAL INVASION BATTLE ═══
let _invasionBattle = null;

function startVisualInvasion(islandKey) {
  if (_invasionBattle) return false; // already in battle

  // Stop rowing when invasion starts
  if (state.rowing) {
    state.rowing.active = false;
    if (typeof camZoomTarget !== 'undefined') camZoomTarget = 1.0;
  }

  // Get defender strength
  let defStr = 300;
  let rv = state.nations[islandKey];
  if (rv) defStr = 500 + (rv.level || 1) * 100 + (rv.military || 0) * 30;
  if (typeof getWorldIsland === 'function') {
    let wisle = getWorldIsland(islandKey);
    if (wisle) defStr = wisle.defense || 500;
  }
  if (rv && rv._lastStandBuff) defStr = Math.floor(defStr * 1.2);

  // Get player army
  let lg = state.legia || {};
  let playerUnits = [];
  if (lg.army && lg.army.length > 0) {
    for (let u of lg.army) {
      playerUnits.push({
        x: -50 + Math.random() * 30,
        y: Math.random() * 200 - 100,
        hp: u.hp || u.maxHp || 20,
        maxHp: u.maxHp || 20,
        damage: u.damage || 5,
        speed: 0.8 + Math.random() * 0.4,
        type: u.type || 'legionary',
        side: 'attacker',
        target: null,
        attackTimer: 0,
        dead: false,
        deathTimer: 0
      });
    }
  }
  if (lg.units && lg.units.length > 0) {
    for (let u of lg.units) {
      let info = typeof getUnitInfo === 'function' ? getUnitInfo(u.type) : null;
      let count = u.count || 1;
      for (let i = 0; i < count; i++) {
        playerUnits.push({
          x: -50 + Math.random() * 30,
          y: Math.random() * 200 - 100,
          hp: 20 + (info ? info.str / 10 : 0),
          maxHp: 20 + (info ? info.str / 10 : 0),
          damage: 3 + (info ? info.str / 30 : 0),
          speed: 0.8 + Math.random() * 0.4,
          type: u.type || 'legionary',
          side: 'attacker',
          target: null,
          attackTimer: 0,
          dead: false,
          deathTimer: 0
        });
      }
    }
  }

  if (playerUnits.length === 0) {
    if (typeof addFloatingText === 'function') addFloatingText(width/2, height*0.3, 'No army! Build a Castrum and recruit soldiers.', '#ff6644');
    return false;
  }

  // Generate defenders based on defense strength
  let defCount = Math.max(3, Math.min(15, Math.floor(defStr / 150)));
  let defUnits = [];
  let defColor = rv ? (typeof FACTION_MILITARY !== 'undefined' && FACTION_MILITARY[islandKey] ? FACTION_MILITARY[islandKey].conquestFlag : [150, 80, 80]) : [150, 80, 80];
  if (!rv) {
    // World island defenders — color by type
    let wisle = typeof getWorldIsland === 'function' ? getWorldIsland(islandKey) : null;
    if (wisle) {
      defColor = wisle.type === 'military' ? [180, 60, 60] : wisle.type === 'economic' ? [180, 160, 60] : wisle.type === 'diplomatic' ? [60, 120, 180] : [120, 150, 80];
    }
  }
  for (let i = 0; i < defCount; i++) {
    defUnits.push({
      x: 250 + Math.random() * 30,
      y: Math.random() * 200 - 100,
      hp: 15 + Math.random() * 10,
      maxHp: 25,
      damage: 3 + Math.random() * 3,
      speed: 0.6 + Math.random() * 0.4,
      type: 'defender',
      side: 'defender',
      target: null,
      attackTimer: 0,
      dead: false,
      deathTimer: 0,
      color: defColor
    });
  }

  _invasionBattle = {
    islandKey: islandKey,
    phase: 'deploy',
    timer: 0,
    attackers: playerUnits,
    defenders: defUnits,
    resultTimer: 0,
    winner: null,
    defStr: defStr
  };

  return true;
}

function updateVisualInvasion(dt) {
  if (!_invasionBattle) return;
  let b = _invasionBattle;
  b.timer += dt;

  if (b.phase === 'deploy') {
    for (let u of b.attackers) {
      if (u.dead) continue;
      u.x += u.speed * 0.5;
    }
    for (let u of b.defenders) {
      if (u.dead) continue;
      u.x -= u.speed * 0.3;
    }
    if (b.timer > 60) b.phase = 'fighting';
  }

  if (b.phase === 'fighting') {
    // Retreat check — R key
    if (typeof keyIsDown === 'function' && keyIsDown(82)) { // R key
      b.phase = 'result';
      b.winner = 'defender'; // retreat = lose
      b.resultTimer = 120; // shorter display
      // Mark 30% of remaining attackers as dead (retreat casualties)
      let alive = b.attackers.filter(u => !u.dead);
      let casualties = Math.floor(alive.length * 0.3);
      for (let i = 0; i < casualties && i < alive.length; i++) {
        alive[i].dead = true;
      }
    }

    let allUnits = [...b.attackers, ...b.defenders];

    for (let u of allUnits) {
      if (u.dead) { u.deathTimer += dt; continue; }

      let enemies = u.side === 'attacker' ? b.defenders : b.attackers;
      let nearest = null, nearDist = 9999;
      for (let e of enemies) {
        if (e.dead) continue;
        let dx = u.x - e.x, dy = u.y - e.y;
        let d = Math.sqrt(dx*dx + dy*dy);
        if (d < nearDist) { nearDist = d; nearest = e; }
      }

      if (!nearest) continue;

      if (nearDist > 20) {
        let dx = nearest.x - u.x, dy = nearest.y - u.y;
        let d = Math.sqrt(dx*dx + dy*dy);
        u.x += (dx / d) * u.speed;
        u.y += (dy / d) * u.speed * 0.5;
      } else {
        u.attackTimer += dt;
        if (u.attackTimer > 20) {
          u.attackTimer = 0;
          nearest.hp -= u.damage * (0.8 + Math.random() * 0.4);
          if (typeof snd !== 'undefined' && snd && typeof snd.playSFX === 'function') {
            if (Math.random() < 0.3) snd.playSFX('hit'); // don't play every hit
          }
          let _aCX = width * 0.1 + width * 0.8 * 0.35;
          let _aCY = height * 0.15 + height * 0.55 * 0.5;
          if (typeof spawnParticles === 'function') spawnParticles(_aCX + nearest.x, _aCY + nearest.y, 'hit', 1);
          if (nearest.hp <= 0) {
            nearest.dead = true;
            nearest.deathTimer = 0;
            if (typeof spawnParticles === 'function') {
              spawnParticles(_aCX + nearest.x, _aCY + nearest.y, 'combat', 3);
            }
          }
        }
      }
    }

    let atkAlive = b.attackers.filter(u => !u.dead).length;
    let defAlive = b.defenders.filter(u => !u.dead).length;

    if (defAlive === 0) {
      b.phase = 'result';
      b.winner = 'attacker';
      b.resultTimer = 0;
    } else if (atkAlive === 0) {
      b.phase = 'result';
      b.winner = 'defender';
      b.resultTimer = 0;
    }
  }

  if (b.phase === 'result') {
    b.resultTimer += dt;
    if (b.resultTimer > 180) {
      let lg = state.legia || {};
      let survivingAttackers = b.attackers.filter(u => !u.dead).length;

      if (b.winner === 'attacker') {
        if (typeof captureIsland === 'function') captureIsland(b.islandKey);
        let rv = state.nations[b.islandKey];
        if (rv) { rv.defeated = true; rv.vassal = true; rv.military = 0; }
        if (!state._battlesWon) state._battlesWon = 0;
        state._battlesWon++;
        let goldReward = 50 + Math.floor(b.defStr * 0.3);
        state.gold += goldReward;
        if (typeof addNotification === 'function') addNotification('+' + goldReward + ' gold plundered!', '#ffd700');
        if (typeof addNotification === 'function') addNotification('VICTORY! ' + b.islandKey.toUpperCase() + ' conquered!', '#ffd700');
        if (typeof addFloatingText === 'function') {
          addFloatingText(width/2, height*0.2, b.islandKey.toUpperCase() + ' HAS FALLEN!', '#ffd700');
        }
        // Other nations react to conquest
        for (let k in state.nations) {
          if (k === b.islandKey) continue;
          let other = state.nations[k];
          if (!other || other.defeated) continue;
          other.reputation = Math.max(-100, (other.reputation || 0) - 10);
        }
        if (typeof checkVictoryConditions === 'function') {
          let v = checkVictoryConditions();
          if (v && typeof triggerVictory === 'function') triggerVictory(v);
        }
      } else {
        if (typeof addNotification === 'function') addNotification('DEFEATED! Retreating...', '#ff4444');
      }

      if (lg.army) {
        let remaining = Math.min(lg.army.length, survivingAttackers);
        lg.army = lg.army.slice(0, remaining);
      }
      if (lg.units && lg.units.length > 0) {
        let totalBefore = lg.units.reduce((sum, u) => sum + (u.count || 1), 0);
        let losses = totalBefore - survivingAttackers;
        for (let u of lg.units) {
          let unitLoss = Math.floor((u.count || 1) * (losses / Math.max(1, totalBefore)));
          u.count = Math.max(0, (u.count || 1) - unitLoss);
        }
        lg.units = lg.units.filter(u => u.count > 0);
      }

      let totalAtk = b.attackers.length;
      let losses2 = totalAtk - survivingAttackers;
      if (typeof addNotification === 'function') {
        addNotification('Battle: ' + survivingAttackers + '/' + totalAtk + ' survived (' + losses2 + ' lost)', '#ffaa44');
      }

      _invasionBattle = null;

      // Put player back on ship after battle
      if (typeof state !== 'undefined' && state.rowing) {
        state.rowing.active = true;
        state.rowing.speed = 0;
        if (typeof camZoomTarget !== 'undefined') camZoomTarget = 0.55;
        // Position ship near the island they just attacked
        let rv = state.nations[b.islandKey];
        if (rv && rv.isleX) {
          state.rowing.x = rv.isleX + (rv.isleRX || 400) * 1.2;
          state.rowing.y = rv.isleY;
          state.player.x = state.rowing.x;
          state.player.y = state.rowing.y;
        }
      }
    }
  }
}

function drawVisualInvasion() {
  if (!_invasionBattle) return;
  let b = _invasionBattle;

  fill(0, 0, 0, 160);
  rect(0, 0, width, height);

  let arenaX = width * 0.1, arenaY = height * 0.15;
  let arenaW = width * 0.8, arenaH = height * 0.55;

  fill(80, 100, 60);
  rect(arenaX, arenaY, arenaW, arenaH, 5);
  fill(70, 90, 50);
  for (let i = 0; i < 20; i++) {
    let gx = arenaX + Math.random() * arenaW;
    let gy = arenaY + Math.random() * arenaH;
    rect(gx, gy, 3 + Math.random() * 8, 2);
  }

  fill(160, 150, 120);
  rect(arenaX + arenaW * 0.75, arenaY, arenaW * 0.25, arenaH, 0, 5, 5, 0);

  let cx = arenaX + arenaW * 0.35;
  let cy = arenaY + arenaH * 0.5;

  noStroke();
  let allUnits = [..._invasionBattle.attackers, ..._invasionBattle.defenders];
  allUnits.sort((a, b2) => a.y - b2.y);

  for (let u of allUnits) {
    if (u.dead && u.deathTimer > 60) continue;

    let sx = cx + u.x;
    let sy = cy + u.y;
    let alpha = u.dead ? Math.max(0, 255 - u.deathTimer * 4) : 255;

    push();
    translate(sx, sy);

    if (u.dead) {
      fill(80, 60, 40, alpha);
      rect(-4, -1, 8, 3);
    } else {
      let bodyColor;
      if (u.side === 'attacker') {
        let fm = typeof getFactionMilitary === 'function' ? getFactionMilitary() : null;
        bodyColor = fm ? fm.conquestFlag : [185, 38, 28];
      } else {
        bodyColor = u.color || [150, 80, 80];
      }

      let walkPhase = sin(frameCount * 0.15 + u.x * 0.1);
      fill(60, 50, 40, alpha);
      rect(-2, 4, 2, 4 + walkPhase);
      rect(1, 4, 2, 4 - walkPhase);

      fill(bodyColor[0], bodyColor[1], bodyColor[2], alpha);
      rect(-4, -3, 8, 8);

      fill(200, 170, 130, alpha);
      ellipse(0, -5, 6, 6);

      let atkAnim = u.attackTimer > 15 ? sin((u.attackTimer - 15) * 0.5) * 6 : 0;
      fill(180, 180, 190, alpha);
      if (u.side === 'attacker') {
        rect(4, -2 - atkAnim, 2, 6);
      } else {
        rect(-6, -2 - atkAnim, 2, 6);
      }

      fill(Math.max(0, bodyColor[0] - 30), Math.max(0, bodyColor[1] - 20), Math.max(0, bodyColor[2] - 10), alpha);
      if (u.side === 'attacker') {
        rect(-5, -2, 3, 6, 1);
      } else {
        rect(3, -2, 3, 6, 1);
      }

      if (u.hp < u.maxHp) {
        fill(40, 30, 20, alpha * 0.8);
        rect(-5, -10, 10, 2);
        let hpPct = Math.max(0, u.hp / u.maxHp);
        if (hpPct > 0.5) fill(80, 200, 80, alpha);
        else fill(220, 60, 40, alpha);
        rect(-5, -10, 10 * hpPct, 2);
      }
    }

    pop();
  }

  let atkAlive = b.attackers.filter(u => !u.dead).length;
  let defAlive = b.defenders.filter(u => !u.dead).length;

  fill(0, 0, 0, 180);
  rect(arenaX, arenaY - 30, arenaW, 25, 3);

  textAlign(LEFT); textSize(12); noStroke();
  let fm = typeof getFactionMilitary === 'function' ? getFactionMilitary() : null;
  let atkCol = fm ? fm.conquestFlag : [185, 38, 28];
  fill(atkCol[0], atkCol[1], atkCol[2]);
  text('Your Army: ' + atkAlive + '/' + b.attackers.length, arenaX + 10, arenaY - 12);

  fill(200, 100, 100);
  textAlign(RIGHT);
  text('Defenders: ' + defAlive + '/' + b.defenders.length, arenaX + arenaW - 10, arenaY - 12);

  textAlign(CENTER); fill(220, 200, 140); textSize(14);
  if (b.phase === 'deploy') text('DEPLOYING...', width/2, arenaY - 12);
  if (b.phase === 'fighting') {
    text('BATTLE!', width/2, arenaY - 12);
    fill(180, 160, 120, 150);
    textSize(10); textAlign(CENTER);
    text('[R] Retreat (lose 30% army)', width/2, arenaY + arenaH + 15);
  }
  if (b.phase === 'result') {
    textSize(20);
    if (b.winner === 'attacker') {
      fill(80, 220, 80);
      text('VICTORY!', width/2, height * 0.78);
      textSize(12); fill(200, 200, 180);
      text(atkAlive + ' soldiers survived', width/2, height * 0.83);
    } else {
      fill(220, 60, 60);
      text('DEFEATED', width/2, height * 0.78);
      textSize(12); fill(200, 200, 180);
      text('Your army has fallen', width/2, height * 0.83);
    }
  }
}

function isInvasionBattleActive() {
  return _invasionBattle !== null;
}

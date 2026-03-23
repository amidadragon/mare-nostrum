// ─── NATIONS / DIPLOMACY / RAID SYSTEM ──────────────────────────────────
// Extracted from sketch.js

function createNationColony(nationKey) {
  if (state.colonies[nationKey]) return;
  let rv = state.nations[nationKey];
  if (!rv) return;
  let nationName = (typeof getNationName === 'function') ? getNationName(nationKey) : nationKey;
  let uniqueRes = null;
  if (nationKey === 'carthage') uniqueRes = 'exoticSpices';
  else if (nationKey === 'egypt') uniqueRes = 'scrolls';
  else if (nationKey === 'greece') uniqueRes = 'oil';
  else if (nationKey === 'rome') uniqueRes = 'steel';
  createColony(nationKey, {
    level: 1, buildings: (rv.buildings || []).slice(0, 3).map(function(b) { return b.type || b; }),
    population: max(3, floor((rv.population || 5) * 0.6)),
    income: 5 + (rv.level || 1) * 2, military: 0,
    name: nationName + ' Colony',
    isleX: rv.isleX, isleY: rv.isleY, isleRX: rv.isleRX, isleRY: rv.isleRY,
    uniqueResource: uniqueRes,
  });
}

// ─── MULTI-NATION AI SYSTEM ──────────────────────────────────────────────

const NATION_BUILDING_TYPES = ['hut', 'hut', 'market', 'wall', 'barracks', 'tower', 'temple', 'harbor', 'forge', 'granary'];

const NATION_DEFAULTS = {
  carthage: { gold: 100, military: 3, population: 5, personality: 'trader',
              position: { angle: -0.785, dist: 2800 }, isleRX: 400, isleRY: 280 }, // NE
  egypt:    { gold: 120, military: 2, population: 5, personality: 'balanced',
              position: { angle: 1.571, dist: 2800 }, isleRX: 420, isleRY: 290 },  // S
  greece:   { gold: 80,  military: 4, population: 5, personality: 'balanced',
              position: { angle: 0, dist: 2800 }, isleRX: 390, isleRY: 270 },      // E
  rome:      { gold: 100, military: 3, population: 5, personality: 'balanced',
              position: { angle: 3.927, dist: 2800 }, isleRX: 400, isleRY: 280 },  // NW (fallback if not player)
  seapeople: { gold: 60,  military: 5, population: 4, personality: 'raider',
              position: { angle: 2.356, dist: 3000 }, isleRX: 350, isleRY: 250 },  // SW
  persia:    { gold: 150, military: 3, population: 6, personality: 'trader',
              position: { angle: 0.785, dist: 3200 }, isleRX: 430, isleRY: 300 },  // NE far
  phoenicia: { gold: 130, military: 2, population: 5, personality: 'trader',
              position: { angle: -1.571, dist: 2800 }, isleRX: 380, isleRY: 260 }, // N
  gaul:      { gold: 70,  military: 4, population: 5, personality: 'aggressive',
              position: { angle: 3.14, dist: 3000 }, isleRX: 410, isleRY: 290 },   // W
};

const FACTION_RELATIONS = {
  rome: { greece: 10, carthage: -15, gaul: -10 },
  carthage: { phoenicia: 15, rome: -15, greece: -10 },
  egypt: { persia: -10, phoenicia: 10 },
  greece: { rome: 10, persia: -15 },
  seapeople: { phoenicia: -10 },
  persia: { greece: -15, egypt: -10, phoenicia: 5 },
  phoenicia: { carthage: 15, egypt: 10, seapeople: -10 },
  gaul: { rome: -15, seapeople: -5 },
};

const NATION_PERSONALITIES = {
  aggressive: { goldMult: 1.0, buildChance: 0.15, militaryChance: 0.15, raidThreshold: -20, allyThreshold: 60 },
  trader:     { goldMult: 1.3, buildChance: 0.25, militaryChance: 0.05, raidThreshold: -40, allyThreshold: 30 },
  balanced:   { goldMult: 1.0, buildChance: 0.20, militaryChance: 0.10, raidThreshold: -30, allyThreshold: 40 },
  raider:     { goldMult: 0.8, buildChance: 0.10, militaryChance: 0.20, raidThreshold: -15, allyThreshold: 70 },
};

const NATION_TRADE_GOODS = {
  carthage: [
    { name: 'Tyrian Purple', resource: 'exoticSpices', amount: 2, cost: 20, desc: 'Luxury dye' },
    { name: 'Incense', resource: 'exoticSpices', amount: 3, cost: 15, desc: 'Fragrant resin' },
    { name: 'War Elephants', resource: 'military', amount: 1, cost: 40, desc: 'Mercenary unit' },
  ],
  egypt: [
    { name: 'Papyrus', resource: 'scrolls', amount: 2, cost: 15, desc: 'Writing material' },
    { name: 'Lapis Lazuli', resource: 'crystal', amount: 3, cost: 25, desc: 'Sacred stone' },
    { name: 'Sacred Cat', resource: 'companion', amount: 1, cost: 50, desc: 'Companion buff' },
  ],
  greece: [
    { name: 'Olive Oil', resource: 'oil', amount: 3, cost: 12, desc: 'Cooking staple' },
    { name: 'Philosophy Scroll', resource: 'xp', amount: 50, cost: 30, desc: 'XP boost' },
    { name: 'Hoplite Training', resource: 'combatBuff', amount: 1, cost: 35, desc: 'Combat buff' },
  ],
  rome: [
    { name: 'Roman Steel', resource: 'steel', amount: 2, cost: 20, desc: 'Fine metalwork' },
    { name: 'Garum', resource: 'meals', amount: 3, cost: 10, desc: 'Fish sauce' },
    { name: 'Legion Drill', resource: 'military', amount: 1, cost: 35, desc: 'Military training' },
  ],
  seapeople: [
    { name: 'Raided Treasure', resource: 'gold', amount: 15, cost: 10, desc: 'Plundered goods' },
    { name: 'Sea Chart', resource: 'xp', amount: 30, cost: 20, desc: 'Navigation knowledge' },
    { name: 'Coral Armor', resource: 'combatBuff', amount: 1, cost: 30, desc: 'Ocean-forged mail' },
  ],
  persia: [
    { name: 'Silk Brocade', resource: 'perfume', amount: 3, cost: 25, desc: 'Luxury fabric' },
    { name: 'Immortal Training', resource: 'military', amount: 2, cost: 40, desc: 'Elite drill' },
    { name: 'Royal Wine', resource: 'wine', amount: 5, cost: 15, desc: 'Finest vintage' },
  ],
  phoenicia: [
    { name: 'Tyrian Dye', resource: 'exoticSpices', amount: 3, cost: 20, desc: 'Royal purple' },
    { name: 'Cedar Timber', resource: 'wood', amount: 10, cost: 15, desc: 'Ship-grade wood' },
    { name: 'Glass Beads', resource: 'crystal', amount: 4, cost: 30, desc: 'Artisan glasswork' },
  ],
  gaul: [
    { name: 'Mistletoe', resource: 'crystal', amount: 2, cost: 15, desc: 'Sacred herb' },
    { name: 'Iron Torque', resource: 'steel', amount: 3, cost: 25, desc: 'Celtic metalwork' },
    { name: 'Boar Hide', resource: 'rareHide', amount: 2, cost: 20, desc: 'Thick forest leather' },
  ],
};

function makeNation(key) {
  let def = NATION_DEFAULTS[key];
  let ang = def.position.angle;
  let d = def.position.dist;
  return {
    key: key,
    level: 1,
    buildings: [],
    population: def.population,
    gold: def.gold,
    military: def.military,
    aggression: key === 'carthage' ? 0.4 : key === 'egypt' ? 0.15 : 0.25,
    reputation: key === 'egypt' ? 10 : key === 'greece' ? 5 : 0,
    stance: 'neutral',
    tradeActive: false,
    lastRaid: 0,
    lastTradeDay: 0,
    defeated: false,
    allied: false,
    personality: def.personality,
    raidParty: [],
    raidWarning: 0,
    isleX: WORLD.islandCX + cos(ang) * d,
    isleY: WORLD.islandCY + sin(ang) * d,
    isleRX: def.isleRX,
    isleRY: def.isleRY,
    relations: {},
    wars: [],
    allies: [],
  };
}

// ─── PERSONAL RIVAL SYSTEM ──────────────────────────────────────────────
var RIVAL_FACTIONS = {
  rome: 'carthage', carthage: 'rome', egypt: 'persia', greece: 'persia',
  seapeople: 'rome', persia: 'greece', phoenicia: 'carthage', gaul: 'rome',
};
var RIVAL_NAMES = {
  rome: ['Scipio', 'Brutus', 'Cassius', 'Tiberius'], carthage: ['Hannibal', 'Hamilcar', 'Mago', 'Hasdrubal'],
  egypt: ['Ptolemy', 'Neferu', 'Khufu', 'Amenhotep'], greece: ['Leonidas', 'Themistocles', 'Ajax', 'Pericles'],
  seapeople: ['Ekwesh', 'Lukka', 'Shekelesh', 'Denyen'], persia: ['Darius', 'Xerxes', 'Cyrus', 'Artaxerxes'],
  phoenicia: ['Hiram', 'Elissa', 'Abibaal', 'Baal'], gaul: ['Vercingetorix', 'Ambiorix', 'Brennus', 'Diviciacus'],
};

function initPersonalRival(playerFaction) {
  let rivalFac = RIVAL_FACTIONS[playerFaction] || 'carthage';
  let names = RIVAL_NAMES[rivalFac] || RIVAL_NAMES.carthage;
  state.personalRival = {
    name: names[floor(random(names.length))], faction: rivalFac, level: 1, reputation: 0,
    lastEncounter: 0, defeated: 0, encounters: 0, alliance: false, tradePartner: false, invading: false,
  };
  state.globalReputation = 50;
}

function checkRivalEncounter() {
  let r = state.personalRival;
  if (!r || !r.name || r.alliance) return;
  let daysSince = state.day - r.lastEncounter;
  if (daysSince < 10 || (daysSince < 15 && random() > 0.4)) return;
  if (state.rivalEncounter || dialogState.active) return;
  let pLevel = state.player.level || 1;
  if (r.level < pLevel) r.level = max(r.level, pLevel - 1);
  r.encounters++;
  r.lastEncounter = state.day;
  let fName = getNationName(r.faction);
  addFloatingText(width / 2, height * 0.2, 'A familiar sail appears on the horizon...', '#ffcc44');
  addFloatingText(width / 2, height * 0.28, r.name + ' of ' + fName + ' approaches!', FACTIONS[r.faction] ? FACTIONS[r.faction].accentColorHex : '#cc8844');
  if (r.defeated >= 3 && !r.alliance) {
    openDialog(r.name, null, r.name + ' raises a white flag. "Enough! I offer alliance. Together we share enemies and profits."',
      [{ text: 'Accept Alliance', action: function() { r.alliance = true; r.tradePartner = true; addFloatingText(width/2, height*0.3, r.name+' is now your ally!', '#88ff88'); adjustReputation(10); dialogState.active = false; } },
       { text: 'Refuse', action: function() { r.reputation -= 10; addFloatingText(width/2, height*0.3, 'The rivalry continues.', '#ff8844'); dialogState.active = false; } }]);
    return;
  }
  if (r.reputation <= -50 && !r.invading) {
    r.invading = true;
    openDialog(r.name, null, r.name + ' screams across the water: "I will destroy everything you\'ve built!" A full war fleet approaches!',
      [{ text: 'Defend! (Battle)', action: function() { rivalCombat(true); dialogState.active = false; } }]);
    return;
  }
  let costNeg = 30;
  openDialog(r.name, null, r.name + ' of ' + fName + ' blocks your path. Their ship bristles with weapons.',
    [{ text: 'Challenge (Fight)', action: function() { rivalCombat(false); dialogState.active = false; } },
     { text: 'Negotiate (-' + costNeg + 'g)', action: function() { rivalNegotiate(costNeg); dialogState.active = false; } },
     { text: 'Ignore', action: function() { rivalIgnore(); dialogState.active = false; } }]);
}

function rivalCombat(isInvasion) {
  let r = state.personalRival;
  let rivalPower = r.level * 10 + r.defeated * 10;
  let playerPower = (state.player.level || 1) * 12 + (state.player.weapon || 0) * 5 + (state.player.armor || 0) * 3;
  let win = playerPower + random(-10, 15) > rivalPower;
  if (win) {
    r.defeated++;
    let goldReward = 20 + r.level * 5;
    state.gold += goldReward;
    r.reputation += 5; r.invading = false;
    adjustReputation(5);
    addFloatingText(width/2, height*0.3, r.name + ' retreats! +' + goldReward + ' gold', '#88ff88');
    if (state.score) state.score.enemiesDefeated++;
  } else {
    let goldLoss = min(state.gold, 15);
    state.gold -= goldLoss;
    r.reputation -= 10;
    adjustReputation(-3);
    addFloatingText(width/2, height*0.3, r.name + ' wins! -' + goldLoss + ' gold', '#ff6644');
    state.player.hp = max(1, state.player.hp - 20);
  }
}

function rivalNegotiate(cost) {
  let r = state.personalRival;
  if (state.gold < cost) {
    addFloatingText(width/2, height*0.3, 'Not enough gold! ' + r.name + ' laughs and raids you.', '#ff6644');
    rivalIgnore(); return;
  }
  state.gold -= cost;
  r.reputation += 10;
  adjustReputation(1);
  addFloatingText(width/2, height*0.3, r.name + ' accepts payment and departs. (-' + cost + 'g, +rep)', '#aaddff');
  if (r.reputation >= 50 && !r.tradePartner) {
    r.tradePartner = true;
    addFloatingText(width/2, height*0.36, r.name + ' respects you — trade partner unlocked! +3g/day', '#ffdd44');
  }
}

function rivalIgnore() {
  let r = state.personalRival;
  r.reputation -= 5;
  let stolen = floor(random(3, 8));
  let resource = random() < 0.5 ? 'gold' : (random() < 0.5 ? 'wood' : 'fish');
  let loss = min(state[resource] || 0, stolen);
  if (resource === 'gold') state.gold -= loss;
  else if (resource === 'wood') state.wood -= loss;
  else state.fish -= loss;
  adjustReputation(-2);
  addFloatingText(width/2, height*0.3, r.name + ' raids your routes! -' + loss + ' ' + resource, '#ff8844');
}

// ─── GLOBAL REPUTATION SYSTEM ───────────────────────────────────────────
function adjustReputation(amount) {
  state.globalReputation = constrain((state.globalReputation || 50) + amount, 0, 100);
}
function getReputationTitle() {
  let r = state.globalReputation || 50;
  if (r >= 81) return 'Legendary'; if (r >= 61) return 'Respected';
  if (r >= 41) return 'Citizen'; if (r >= 21) return 'Distrusted'; return 'Outlaw';
}
function getReputationColor() {
  let r = state.globalReputation || 50;
  if (r >= 81) return '#ffdd44'; if (r >= 61) return '#88cc44';
  if (r >= 41) return '#aabbcc'; if (r >= 21) return '#cc8844'; return '#ff4444';
}
function getReputationPriceMult() {
  return 1.5 - (state.globalReputation || 50) / 100;
}

function initNations() {
  let playerFaction = state.faction || 'rome';
  let allKeys = ['carthage', 'egypt', 'greece', 'rome', 'seapeople', 'persia', 'phoenicia', 'gaul'];
  state.nations = {};

  // Determine which factions are controlled by bots (MP lobby)
  let botFactions = {};
  if (typeof MP !== 'undefined' && MP.bots && MP.bots.length > 0) {
    for (let b of MP.bots) {
      if (b.faction) botFactions[b.faction] = { isBot: true, difficulty: b.difficulty || 'normal', botName: b.name };
    }
  }

  // Determine which factions are controlled by human players (MP lobby)
  let humanFactions = {};
  if (typeof LOBBY !== 'undefined' && LOBBY.remotePlayers) {
    for (let pid in LOBBY.remotePlayers) {
      let rp = LOBBY.remotePlayers[pid];
      if (rp.faction) humanFactions[rp.faction] = { isHuman: true, humanName: rp.name || 'Player', peerId: pid };
    }
  }

  for (let k of allKeys) {
    if (k === playerFaction) continue;
    state.nations[k] = makeNation(k);
    // Tag bot-controlled nations
    if (botFactions[k]) {
      state.nations[k].isBot = true;
      state.nations[k].botDifficulty = botFactions[k].difficulty;
      state.nations[k].botName = botFactions[k].botName;
    }
    // Tag human-controlled nations
    if (humanFactions[k]) {
      state.nations[k].isHuman = true;
      state.nations[k].humanName = humanFactions[k].humanName;
      state.nations[k].peerId = humanFactions[k].peerId;
    }
  }
  let nationKeys = Object.keys(state.nations);
  for (let k of nationKeys) {
    for (let k2 of nationKeys) {
      if (k !== k2) {
        let base = floor(random(-10, 10));
        let fRel = FACTION_RELATIONS[k];
        if (fRel && fRel[k2]) base += fRel[k2];
        state.nations[k].relations[k2] = constrain(base, -100, 100);
      }
    }
  }
}

function getNationStance(rv) {
  if (rv.vassal) return 'vassal';
  if (rv.defeated) return 'defeated';
  if (rv.allied || rv.reputation >= 50) return 'allied';
  if (rv.reputation >= 20) return 'friendly';
  if (rv.reputation >= -19) return 'neutral';
  if (rv.reputation >= -49) return 'hostile';
  return 'war';
}
function getNationStanceLabel(rv) { let s = getNationStance(rv); return s.charAt(0).toUpperCase() + s.slice(1); }
function getNationStanceColor(rv) {
  let s = getNationStance(rv);
  if (s === 'vassal') return '#ddaa44';
  if (s === 'allied') return '#88cc88';
  if (s === 'friendly') return '#aadd88';
  if (s === 'neutral') return '#ccaa66';
  if (s === 'hostile') return '#ff8844';
  if (s === 'war') return '#ff4444';
  return '#888888';
}
function getNationName(key) { return (FACTIONS[key] || {}).name || key.charAt(0).toUpperCase() + key.slice(1); }

function updateNationsDaily() {
  let keys = Object.keys(state.nations);
  for (let k of keys) updateNationDaily(k);
  if (random() < 0.12 && keys.length >= 2) generateWorldEvent(keys);
  checkVictoryConditions();
}

function updateNationDaily(key) {
  let rv = state.nations[key];
  if (!rv || rv.defeated) return;
  let pers = NATION_PERSONALITIES[rv.personality] || NATION_PERSONALITIES.balanced;
  let name = getNationName(key);

  // Bot difficulty multipliers
  let botDiff = (rv.isBot && typeof BOT_DIFFICULTY !== 'undefined' && BOT_DIFFICULTY[rv.botDifficulty])
    ? BOT_DIFFICULTY[rv.botDifficulty] : { goldMult: 1, buildMult: 1, militaryMult: 1, raidMult: 1 };

  // --- ECONOMIC AI ---
  let baseIncome = 5 + rv.population * 2;
  let tradeBonus = rv.tradeActive ? 10 : 0;
  let buildingIncome = floor(rv.buildings.length * 0.5);
  let facData = FACTIONS[key] || {};
  let income = floor((baseIncome + tradeBonus + buildingIncome) * pers.goldMult * botDiff.goldMult);
  income = floor(income * (facData.tradeIncomeMult || 1.0));
  rv.gold += income;

  // Vassal tribute income
  let otherKeys = Object.keys(state.nations).filter(k2 => k2 !== key);
  for (let k2 of otherKeys) {
    let other = state.nations[k2];
    if (other && other.vassal && other._vassalOf === key) rv.gold += 5 + other.level;
  }

  // Strategic building
  let buildCost = 30 + rv.level * 5;
  if (random() < pers.buildChance * 0.5 * botDiff.buildMult && rv.gold >= buildCost) {
    let bType = _pickNationBuilding(rv, key);
    rv.buildings.push(bType); rv.gold -= buildCost;
    rv.population += floor(random(1, 3));
    rv._lastBuildFrame = frameCount; rv._lastBuildType = bType;
    if (rv.buildings.length % 3 === 0) {
      let bNames = { hut: 'settlement', market: 'grand market', wall: 'fortification', barracks: 'barracks', tower: 'watchtower', temple: 'temple', harbor: 'harbor', forge: 'forge', granary: 'granary' };
      addNotification(name + ' has built a ' + (bNames[bType] || bType) + '!', '#cc9944');
    }
    if (rv.buildings.length % 5 === 0 && rv.level < 15) {
      rv.level++;
      addNotification(name + ' grows to ' + _getNationSettlementTier(rv.level) + '! (Level ' + rv.level + ')', '#cc6644');
    }
  }

  // --- ISLAND STATE TICK (real game systems via state swap) ---
  if (!rv.islandState && typeof createIslandState === 'function') {
    rv.islandState = createIslandState(key);
  }
  if (rv.islandState && typeof swapToIsland === 'function') {
    let isCX = rv.isleX || WORLD.islandCX + 1200;
    let isCY = rv.isleY || WORLD.islandCY;
    swapToIsland(rv.islandState, isCX, isCY);
    // Farm growth
    if (state.plots) {
      for (let p of state.plots) {
        if (p.crop && p.stage === 'growing') {
          p.growTimer = (p.growTimer || 0) + 60;
          if (p.growTimer > 300) p.stage = 'ready';
        }
      }
    }
    // Crystal recharge
    if (state.crystalNodes) {
      for (let cn of state.crystalNodes) {
        if ((cn.charge || 0) < 50) cn.charge = (cn.charge || 0) + 5;
      }
    }
    // Tree regrowth (1 new tree per day if < 12)
    if (state.trees && state.trees.length < 12) {
      let a = random(TWO_PI), r = random(0.2, 0.6);
      let rx = state.islandRX || 500, ry = state.islandRY || 320;
      state.trees.push({ x: isCX + cos(a) * rx * r * 0.7, y: isCY + sin(a) * ry * r * 0.3, type: 'oak', hp: 3 });
    }
    // Gold income from buildings
    let goldIncome = 0;
    if (state.buildings) {
      for (let b of state.buildings) {
        if (b.type === 'market' || b.type === 'marketplace') goldIncome += 2;
        if (b.type === 'vineyard') goldIncome += 1;
      }
    }
    state.gold = (state.gold || 0) + goldIncome + 3;
    // Citizen spawning (1 per 3 buildings, max 10)
    let targetPop = Math.min(10, Math.floor((state.buildings ? state.buildings.length : 0) / 3));
    if (!state.citizens) state.citizens = [];
    while (state.citizens.length < targetPop) {
      state.citizens.push({
        x: isCX + random(-80, 80), y: isCY + random(-30, 30),
        speed: 0.3 + random(0.2), targetX: isCX, targetY: isCY,
        moveTimer: 0, skin: floor(random(5)),
        tunicR: 100 + floor(random(80)), tunicG: 80 + floor(random(60)), tunicB: 60 + floor(random(40))
      });
    }
    // Update citizen positions
    for (let c of state.citizens) {
      c.moveTimer--;
      if (c.moveTimer <= 0) {
        c.targetX = isCX + random(-100, 100);
        c.targetY = isCY + random(-40, 40);
        c.moveTimer = 60 + floor(random(120));
      }
      let cdx = c.targetX - c.x, cdy = c.targetY - c.y;
      let cd = Math.sqrt(cdx*cdx + cdy*cdy);
      if (cd > 3) { c.x += (cdx/cd) * c.speed; c.y += (cdy/cd) * c.speed; }
    }
    // AUTO LEVEL UP: every 5 game-days, bot expands (adds CITY_SLOTS buildings)
    if ((state.day || 1) % 5 === 0 && (state.islandLevel || 1) < 15) {
      let oldLevel = state.islandLevel || 1;
      state.islandLevel = oldLevel + 1;
      state.islandRX = (state.islandRX || 500) + (oldLevel < 5 ? 35 : 28);
      state.islandRY = (state.islandRY || 320) + (oldLevel < 5 ? 24 : 18);
      // Add new buildings from CITY_SLOTS for this level
      let offsetX = isCX - 600, offsetY = isCY - 400;
      if (typeof CITY_SLOTS !== 'undefined') {
        CITY_SLOTS.forEach(function(slot) {
          if (slot.level === state.islandLevel) {
            state.buildings.push({
              type: slot.type, x: slot.x + offsetX, y: slot.y + offsetY,
              w: slot.w, h: slot.h, hp: 100, built: true,
              isTemple: slot.type === 'temple', id: slot.id, rot: 0
            });
          }
        });
      }
    }
    swapBack();
  }

  // --- MILITARY AI ---
  let atWar = rv.wars && rv.wars.length > 0;
  let recruitChance = pers.militaryChance * (atWar ? 0.8 : 0.4) * botDiff.militaryMult;
  if (random() < recruitChance && rv.gold >= 15) {
    let recruits = atWar ? floor(random(1, 3)) : 1;
    rv.military += recruits; rv.gold -= 15 * recruits;
    rv._lastRecruitFrame = frameCount;
  }

  // AI war declarations based on relations
  for (let k2 of otherKeys) {
    let other = state.nations[k2];
    if (!other || other.defeated || other.vassal) continue;
    let rel = rv.relations[k2] || 0;
    if (rel < -30 && rv.military > 5 && !(rv.wars && rv.wars.includes(k2)) && random() < 0.03 * rv.aggression) {
      if (!rv.wars) rv.wars = [];
      rv.wars.push(k2);
      if (!other.wars) other.wars = [];
      if (!other.wars.includes(key)) other.wars.push(key);
      rv.relations[k2] = -80; other.relations[key] = max(-80, (other.relations[key] || 0) - 40);
      addNotification(name + ' declares war on ' + getNationName(k2) + '!', '#ff6644');
      state.worldEvents.push({ type: 'war', text: name + ' declares war on ' + getNationName(k2) + '!', day: state.day, factionA: key, factionB: k2 });
      if (state.worldEvents.length > 30) state.worldEvents.shift();
    }
  }

  // --- WAR RESOLUTION (AI vs AI) ---
  if (rv.wars) {
    for (let i = rv.wars.length - 1; i >= 0; i--) {
      let warKey = rv.wars[i];
      let enemy = state.nations[warKey];
      if (!enemy || enemy.defeated) { rv.wars.splice(i, 1); continue; }
      // Attrition
      if (random() < 0.3) {
        rv.military = max(0, rv.military - 1);
        enemy.military = max(0, enemy.military - 1);
      }
      // Skirmish
      if (random() < 0.15) {
        let rvFac = FACTIONS[key] || {};
        let enFac = FACTIONS[warKey] || {};
        let rvStr = (rv.military + rv.level * 0.5) * (rvFac.combatDamageMult || 1.0);
        let enStr = (enemy.military + enemy.level * 0.5) * (enFac.combatDamageMult || 1.0);
        if (rvStr > enStr && random() < 0.6) {
          let loot = min(enemy.gold, floor(random(5, 15 + rv.level)));
          enemy.gold -= loot; rv.gold += loot;
          if (random() < 0.2 && enemy.population > 2) { enemy.population--; rv.population++; }
        } else if (enStr > rvStr && random() < 0.6) {
          let loot = min(rv.gold, floor(random(5, 15 + enemy.level)));
          rv.gold -= loot; enemy.gold += loot;
          if (random() < 0.2 && rv.population > 2) { rv.population--; enemy.population++; }
        }
      }
      // Weak nations sue for peace
      if (rv.military <= 1 && random() < 0.15) {
        rv.wars.splice(i, 1);
        enemy.wars = (enemy.wars || []).filter(w => w !== key);
        rv.relations[warKey] = 0; enemy.relations[key] = 0;
        addNotification(name + ' and ' + getNationName(warKey) + ' sign a peace treaty.', '#88cc88');
        state.worldEvents.push({ type: 'peace', text: name + ' and ' + getNationName(warKey) + ' sign a peace treaty.', day: state.day, factionA: key, factionB: warKey });
        if (state.worldEvents.length > 30) state.worldEvents.shift();
        continue;
      }
      // Vassalization
      if (enemy.military <= 0 && rv.military >= 5 && enemy.population <= 3 && random() < 0.1) {
        rv.wars.splice(i, 1);
        enemy.wars = (enemy.wars || []).filter(w => w !== key);
        enemy.vassal = true; enemy._vassalOf = key;
        enemy.relations[key] = 20; rv.relations[warKey] = 10;
        addNotification(getNationName(warKey) + ' becomes a vassal of ' + name + '!', '#ddaa44');
        state.worldEvents.push({ type: 'vassal', text: getNationName(warKey) + ' becomes a vassal of ' + name + '!', day: state.day, factionA: key, factionB: warKey });
        if (state.worldEvents.length > 30) state.worldEvents.shift();
      }
    }
  }

  // --- DIPLOMACY & RELATIONS ---
  rv.stance = getNationStance(rv);
  if (rv.tradeActive) { rv.aggression = max(0.1, rv.aggression - 0.02); }
  else if (rv.reputation < 0) { rv.aggression = min(1.0, rv.aggression + 0.01); }

  if (rv.allied) {
    let income = 3 + floor(rv.level * 0.5);
    state.gold += income; rv.gold += 3;
    if (state.day % 3 === 0) addNotification('Alliance trade: +' + income + 'g from ' + name, '#88cc88');
  }

  if (!rv.allied && rv.reputation < pers.raidThreshold && rv.raidParty.length === 0) {
    let daysSinceRaid = state.day - rv.lastRaid;
    let raidChance = constrain(map(rv.reputation, pers.raidThreshold, -100, 0.05, 0.3), 0.05, 0.3);
    if (rv.personality === 'aggressive') raidChance *= 1.5;
    if (rv.personality === 'raider') raidChance *= 2.0;
    if (rv.personality === 'trader') raidChance *= 0.4;
    raidChance *= botDiff.raidMult;
    if (daysSinceRaid >= 3 && random() < raidChance && rv.military >= 2) startNationRaid(key);
  }

  // Relation drift
  for (let k2 of otherKeys) {
    let other = state.nations[k2];
    if (!other || other.defeated) continue;
    let rel = rv.relations[k2] || 0;
    if (rv.personality === 'trader') rv.relations[k2] = min(100, rel + 0.3);
    else if (rv.personality === 'aggressive') rv.relations[k2] = max(-100, rel - 0.15);
    else if (rv.personality === 'raider') rv.relations[k2] = max(-100, rel - 0.25);
    // Shared enemies bring nations closer
    if (rv.wars && other.wars) {
      for (let wk of rv.wars) {
        if (other.wars.includes(wk)) rv.relations[k2] = min(100, (rv.relations[k2] || 0) + 0.5);
      }
    }
    // AI-to-AI trade (all personalities, not just trader)
    if (rel > 0 && random() < (rv.personality === 'trader' ? 0.08 : 0.03)) {
      let tradeAmt = 3 + floor(rv.level * 0.5);
      rv.gold += tradeAmt; other.gold += tradeAmt;
      rv.relations[k2] = min(100, (rv.relations[k2] || 0) + 1);
      other.relations[key] = min(100, (other.relations[key] || 0) + 1);
    }
    // AI-to-AI alliance
    if (rel > 50 && !(rv.allies && rv.allies.includes(k2)) && random() < 0.02) {
      if (!rv.allies) rv.allies = [];
      if (!other.allies) other.allies = [];
      rv.allies.push(k2);
      if (!other.allies.includes(key)) other.allies.push(key);
      addNotification(name + ' and ' + getNationName(k2) + ' form an alliance!', '#88cc88');
    }
    // Allied resource sharing
    if (rv.allies && rv.allies.includes(k2) && random() < 0.02) {
      rv.gold += 3; other.gold += 3;
      rv.military = max(rv.military, rv.military + (random() < 0.1 ? 1 : 0));
    }
    // AI-to-AI war declaration (aggressive nations with high military)
    if (rel < -20 && rv.military > 5 && rv.military > other.military * 1.5 && !(rv.wars && rv.wars.includes(k2)) && random() < 0.02) {
      if (!rv.wars) rv.wars = [];
      if (!other.wars) other.wars = [];
      rv.wars.push(k2); other.wars.push(key);
      addNotification(name + ' declares war on ' + getNationName(k2) + '!', '#ff4444');
    }
    // AI-to-AI war resolution (weaker side surrenders)
    if (rv.wars && rv.wars.includes(k2) && random() < 0.01) {
      if (rv.military < other.military * 0.5 && rv.military > 0) {
        rv.military = max(0, rv.military - 2); other.gold += 20;
        rv.wars = rv.wars.filter(w => w !== k2); if (other.wars) other.wars = other.wars.filter(w => w !== key);
        rv.relations[k2] = min(100, (rv.relations[k2] || 0) + 20);
        addNotification(name + ' surrenders to ' + getNationName(k2) + '!', '#ffaa44');
      }
    }
  }

  // Population growth (capped by level)
  let popCap = rv.level * 5 + 10;
  if (random() < 0.1 && rv.population < popCap) rv.population++;
  if (atWar && random() < 0.05 && rv.population > 2) rv.population--;

  // --- STRATEGIC GOALS (personality-driven) ---
  if (rv.personality === 'aggressive') {
    if (rv.gold >= 15 && random() < 0.15) { rv.military += 1; rv.gold -= 15; }
    for (let k2 of otherKeys) {
      let other = state.nations[k2];
      if (!other || other.defeated || other.vassal) continue;
      if (rv.military > other.military * 2 && !(rv.wars && rv.wars.includes(k2)) && random() < 0.04) {
        if (!rv.wars) rv.wars = [];
        rv.wars.push(k2);
        if (!other.wars) other.wars = [];
        if (!other.wars.includes(key)) other.wars.push(key);
        rv.relations[k2] = -80; other.relations[key] = max(-80, (other.relations[key] || 0) - 40);
        addNotification(name + ' attacks weakened ' + getNationName(k2) + '!', '#ff6644');
      }
    }
  } else if (rv.personality === 'trader') {
    for (let k2 of otherKeys) {
      let other = state.nations[k2];
      if (!other || other.defeated) continue;
      if (other.gold > 100 && (rv.relations[k2] || 0) > -10 && random() < 0.06) {
        rv.gold += 3; other.gold += 3;
        rv.relations[k2] = min(100, (rv.relations[k2] || 0) + 0.5);
      }
      if (rv.wars && rv.wars.includes(k2) && random() < 0.08) {
        rv.wars = rv.wars.filter(w => w !== k2);
        other.wars = (other.wars || []).filter(w => w !== key);
        rv.relations[k2] = 0; other.relations[key] = 0;
        addNotification(name + ' offers peace to ' + getNationName(k2) + '.', '#88cc88');
      }
    }
  } else if (rv.personality === 'raider') {
    if (rv.raidParty.length === 0 && rv.military >= 2 && random() < 0.08) {
      startNationRaid(key);
    }
    for (let k2 of otherKeys) {
      let other = state.nations[k2];
      if (other && other.vassal && other._vassalOf === key && random() < 0.1) {
        other.vassal = false; other._vassalOf = null;
      }
    }
    if (rv.gold >= 15 && random() < 0.12) { rv.military += 1; rv.gold -= 15; }
  } else if (rv.personality === 'balanced') {
    for (let k2 of otherKeys) {
      let other = state.nations[k2];
      if (!other || other.defeated || other.vassal) continue;
      if (other.military > 8 && (rv.relations[k2] || 0) > 0 && random() < 0.03) {
        rv.relations[k2] = min(100, (rv.relations[k2] || 0) + 2);
      }
      if (other.military < 3 && (!other.allies || other.allies.length === 0) && rv.military > 6 && !(rv.wars && rv.wars.includes(k2)) && random() < 0.02) {
        if (!rv.wars) rv.wars = [];
        rv.wars.push(k2);
        if (!other.wars) other.wars = [];
        if (!other.wars.includes(key)) other.wars.push(key);
        rv.relations[k2] = -60; other.relations[key] = max(-80, (other.relations[key] || 0) - 30);
        addNotification(name + ' moves against isolated ' + getNationName(k2) + '!', '#ff8844');
      }
    }
  }

  // Spy intel expiry
  if (rv._intelRevealedDays > 0) rv._intelRevealedDays--;
  // Trade agreement expiry
  if (rv._tradeBonusDays > 0) {
    rv._tradeBonusDays--;
    if (rv._tradeBonusDays <= 0) rv._tradeBonus = 0;
  }
}

function _pickNationBuilding(rv, key) {
  let atWar = rv.wars && rv.wars.length > 0;
  let lowMilitary = rv.military < rv.level * 2;
  if (atWar && lowMilitary && random() < 0.6) return random() < 0.5 ? 'barracks' : 'wall';
  if (rv.personality === 'trader' && random() < 0.4) return random() < 0.5 ? 'market' : 'harbor';
  if (rv.personality === 'aggressive' && random() < 0.4) return random() < 0.5 ? 'barracks' : 'tower';
  if (rv.personality === 'raider' && random() < 0.45) return random() < 0.6 ? 'barracks' : 'forge';
  if (rv.gold > 100 + rv.level * 20 && random() < 0.3) return 'temple';
  if (rv.population > rv.level * 4 && random() < 0.3) return 'granary';
  return NATION_BUILDING_TYPES[floor(random(NATION_BUILDING_TYPES.length))];
}

function _getNationSettlementTier(level) {
  if (level >= 12) return 'Metropolis';
  if (level >= 8) return 'City';
  if (level >= 4) return 'Town';
  return 'Village';
}

function _getNationMilitaryLabel(military) {
  if (military >= 20) return 'Formidable';
  if (military >= 12) return 'Strong';
  if (military >= 6) return 'Moderate';
  if (military >= 2) return 'Weak';
  return 'Defenseless';
}

function startNationRaid(key) {
  let rv = state.nations[key];
  let raidSize = min(rv.military, floor(2 + rv.level * 0.5));
  rv.military -= floor(raidSize * 0.5);
  rv.lastRaid = state.day;
  let name = getNationName(key);

  rv.raidWarning = 300;
  let shoreX = WORLD.islandCX + getSurfaceRX() * 0.95;
  let shoreY = WORLD.islandCY;
  let facRaid = FACTIONS[key] || {};
  let baseHP = 30 + rv.level * 5;
  for (let i = 0; i < raidSize; i++) {
    let rHP = baseHP;
    if (facRaid.combatDamageMult && facRaid.combatDamageMult > 1.0) rHP = floor(rHP * 1.15);
    rv.raidParty.push({
      x: shoreX + random(20, 60), y: shoreY + random(-80, 80),
      hp: rHP, maxHp: rHP,
      dmgMult: facRaid.combatDamageMult || 1.0,
      vx: 0, vy: 0, attackTimer: 0, facing: -1, flashTimer: 0, stealTimer: 0,
    });
  }
  // Spawn garrison defenders to fight raiders in real-time
  _spawnGarrisonDefenders();
  addFloatingText(width / 2, height * 0.2, name.toUpperCase() + ' RAID INCOMING!', '#ff4444');
  addNotification(name + ' sends ' + raidSize + ' raiders to your shores!', '#ff4444');
  if (snd) { snd.playSFX('war_horn'); setTimeout(function() { if (snd) snd.playSFX('ding'); }, 500); }
  rv._raidKills = 0;
}

function updateNationRaids(dt) {
  let keys = Object.keys(state.nations);
  for (let k of keys) updateSingleNationRaid(k, dt);
}

function updateSingleNationRaid(key, dt) {
  let rv = state.nations[key];
  if (!rv || rv.raidParty.length === 0) return;
  if (rv.raidWarning > 0) { rv.raidWarning -= dt; return; }
  let p = state.player;
  let name = getNationName(key);
  for (let i = rv.raidParty.length - 1; i >= 0; i--) {
    let r = rv.raidParty[i];
    r.flashTimer = max(0, r.flashTimer - dt);
    r.attackTimer = max(0, r.attackTimer - dt);
    let targetX = WORLD.islandCX + random(-100, 100);
    let targetY = WORLD.islandCY + random(-50, 50);
    let dx = targetX - r.x, dy = targetY - r.y;
    let d = sqrt(dx * dx + dy * dy);
    if (d > 30) {
      let spd = 1.2 * dt;
      r.x += (dx / d) * spd; r.y += (dy / d) * spd;
      r.facing = dx > 0 ? 1 : -1;
    } else {
      r.stealTimer += dt;
      if (r.stealTimer > 120) {
        r.stealTimer = 0;
        if (state.gold > 0) { let amt = min(state.gold, floor(2 + rv.level)); state.gold = max(0, state.gold - amt); rv.gold += amt; addFloatingText(w2sX(r.x), w2sY(r.y) - 10, 'Stolen!', '#ff6644'); }
        else if (state.wood > 0) { state.wood -= min(state.wood, 2); addFloatingText(w2sX(r.x), w2sY(r.y) - 10, 'Stolen!', '#ff6644'); }
        else if (state.stone > 0) { state.stone -= min(state.stone, 1); addFloatingText(w2sX(r.x), w2sY(r.y) - 10, 'Stolen!', '#ff6644'); }
      }
    }
    let pDist = dist(p.x, p.y, r.x, r.y);
    if (p.attackTimer > 0 && p.slashPhase > 0 && pDist < p.attackRange + 10) {
      let dmg = (typeof getPlayerAttackDamage === 'function') ? getPlayerAttackDamage() : p.attackDamage;
      r.hp -= dmg; r.flashTimer = 8;
      addFloatingText(w2sX(r.x), w2sY(r.y) - 15, '-' + dmg, '#ffaa44');
      spawnParticles(r.x, r.y, 'hit', 3);
    }
    if (pDist < 35 && r.attackTimer <= 0) {
      let _rDefR = (typeof getPlayerDefenseReduction === 'function') ? getPlayerDefenseReduction() : ((p.armor || 0) * 3);
      let dmg = max(1, floor(8 + rv.level * 2) - _rDefR);
      p.hp = max(0, p.hp - dmg); p.invincTimer = 20; r.attackTimer = 60;
      addFloatingText(w2sX(p.x), w2sY(p.y) - 15, '-' + dmg, '#ff4444');
      triggerScreenShake(3, 6);
    }
    if (state.centurion && state.centurion.task !== 'idle') {
      let cenDist = dist(state.centurion.x, state.centurion.y, r.x, r.y);
      if (cenDist < 35 && state.centurion.attackTimer <= 0) {
        r.hp -= state.centurion.attackDamage; r.flashTimer = 8;
        state.centurion.attackTimer = state.centurion.attackCooldown;
      }
    }
    let allyKeys = Object.keys(state.nations).filter(k2 => k2 !== key && state.nations[k2].allied);
    for (let ak of allyKeys) {
      if (random() < 0.02 * dt) {
        r.hp -= floor(3 + state.nations[ak].military * 0.5);
        r.flashTimer = 5;
        if (random() < 0.05) addFloatingText(w2sX(r.x), w2sY(r.y) - 20, getNationName(ak) + ' ally strikes!', '#88ccff');
      }
    }
    // Watchtower auto-fire: towers shoot nearby raiders
    if (state.buildings && frameCount % 40 === 0) {
      for (let b of state.buildings) {
        if (b.type === 'watchtower' && dist(b.x, b.y, r.x, r.y) < 200) {
          let tDmg = floor(5 + random(3));
          r.hp -= tDmg; r.flashTimer = 6;
          addFloatingText(w2sX(r.x), w2sY(r.y) - 18, '-' + tDmg, '#ccaa44');
          spawnParticles(r.x, r.y, 'hit', 2);
          break; // one tower per tick
        }
      }
    }
    // Garrison soldiers attack this raider
    if (state._garrisonDefenders) {
      for (let gs of state._garrisonDefenders) {
        if (gs.hp <= 0) continue;
        let gsDist = dist(gs.x, gs.y, r.x, r.y);
        if (gsDist < 30 && gs.attackTimer <= 0) {
          let gsDmg = gs.damage || 8;
          r.hp -= gsDmg; r.flashTimer = 6;
          gs.attackTimer = 40;
          addFloatingText(w2sX(r.x), w2sY(r.y) - 15, '-' + gsDmg, '#88ccff');
          spawnParticles(r.x, r.y, 'hit', 2);
        }
        // Raiders fight back against garrison soldiers
        if (gsDist < 35 && r.attackTimer <= 0) {
          let rDmg = max(1, floor(6 + rv.level * 2));
          gs.hp -= rDmg; gs.flashTimer = 8; r.attackTimer = 60;
          addFloatingText(w2sX(gs.x), w2sY(gs.y) - 15, '-' + rDmg, '#ff4444');
        }
      }
    }
    if (r.hp <= 0) {
      rv.raidParty.splice(i, 1);
      spawnParticles(r.x, r.y, 'death', 5);
      if (typeof grantXP === 'function') grantXP(15 + rv.level * 3);
      addFloatingText(w2sX(r.x), w2sY(r.y) - 20, '+' + (15 + rv.level * 3) + ' XP', '#ffdd44');
      if (!rv._raidKills) rv._raidKills = 0;
      rv._raidKills++;
    }
  }
  // Update garrison defender movement
  _updateGarrisonDefenders(rv.raidParty, dt);
  if (rv.raidParty.length === 0) {
    // Casualties report
    let killed = rv._raidKills || 0;
    let goldStolen = 0; // tracked during steal
    addFloatingText(width / 2, height * 0.2, 'RAID REPELLED!', '#88ff88');
    addNotification(name + ' raiders defeated! ' + killed + ' enemies slain.', '#88ff88');
    rv.reputation = max(-100, rv.reputation - 5);
    rv._raidKills = 0;
    _returnGarrisonDefenders();
  }
}

// ─── SEA PEOPLE RAID SYSTEM ─────────────────────────────────────────────

function checkSeaPeopleRaid() {
  if (state.faction === 'seapeople') return;
  if (state.player.level < 3) return;
  if (state.seaPeopleRaidCooldown > 0) { state.seaPeopleRaidCooldown--; return; }
  if (state.seaPeopleRaidActive) return;
  let chance = min(0.30, 0.08 + state.player.level * 0.02);
  if (random() >= chance) return;
  let tier = min(4, floor(state.player.level / 5) + 1);
  startSeaPeopleRaid(tier);
}

function startSeaPeopleRaid(tier) {
  state.seaPeopleRaidCooldown = 5;
  state.seaPeopleRaidActive = true;

  let raidSize, champCount, bossCount, title;
  if (tier <= 1) { raidSize = floor(random(3, 6)); champCount = 0; bossCount = 0; title = 'Sea People Scout Party'; }
  else if (tier === 2) { raidSize = floor(random(6, 11)); champCount = 1; bossCount = 0; title = 'Sea People War Band'; }
  else if (tier === 3) { raidSize = floor(random(12, 19)); champCount = 2; bossCount = 0; title = 'Sea People Fleet'; }
  else { raidSize = floor(random(20, 31)); champCount = 3; bossCount = 1; title = 'Sea People Armada'; }

  let baseHp = 25 + tier * 10;
  let baseDmg = 8 + tier * 3;

  addNotification('Sea People longships spotted on the horizon!', '#ff4444');
  addFloatingText(width / 2, height * 0.2, title.toUpperCase() + '!', '#ff4444');
  if (snd) snd.playSFX('war_horn');
  if (snd && snd.playNarration) snd.playNarration('first_raid');
  if (typeof triggerPlayerAlert === 'function') triggerPlayerAlert();
  // Spawn garrison defenders to fight raiders in real-time
  _spawnGarrisonDefenders();

  // Spawn 1-3 visual longships
  state.seaPeopleShips = [];
  let shipCount = min(3, tier);
  for (let i = 0; i < shipCount; i++) {
    state.seaPeopleShips.push({
      x: width + 40 + i * 60,
      y: max(height * 0.06, height * 0.25 - (horizonOffset || 0)) + 10 + i * 12,
      phase: random(TWO_PI),
    });
  }

  // Warning phase: 180 frames (3 seconds), then spawn raiders
  state._seaPeopleWarning = 180;
  state._seaPeopleRaidData = { raidSize: raidSize, champCount: champCount, bossCount: bossCount, baseHp: baseHp, baseDmg: baseDmg, tier: tier, title: title };
}

function updateSeaPeopleRaid(dt) {
  if (!state.seaPeopleRaidActive) return;

  // Warning phase — ships approach
  if (state._seaPeopleWarning > 0) {
    state._seaPeopleWarning -= dt;
    for (let s of state.seaPeopleShips) {
      s.x -= 1.2 * dt;
    }
    if (state._seaPeopleWarning <= 0) {
      _spawnSeaPeopleRaiders();
    }
    return;
  }

  // After warning, update raid party like nation raids
  if (!state._seaPeopleRaidParty || state._seaPeopleRaidParty.length === 0) {
    state.seaPeopleRaidActive = false;
    state.seaPeopleShips = [];
    state._seaPeopleRaidParty = null;
    let killed = state._seaPeopleRaidKills || 0;
    addFloatingText(width / 2, height * 0.2, 'SEA PEOPLE REPELLED!', '#88ff88');
    addNotification('Sea People raiders defeated! ' + killed + ' enemies slain.', '#88ff88');
    state._seaPeopleRaidKills = 0;
    _returnGarrisonDefenders();
    return;
  }

  let p = state.player;
  for (let i = state._seaPeopleRaidParty.length - 1; i >= 0; i--) {
    let r = state._seaPeopleRaidParty[i];
    r.flashTimer = max(0, r.flashTimer - dt);
    r.attackTimer = max(0, r.attackTimer - dt);
    let targetX = WORLD.islandCX + random(-100, 100);
    let targetY = WORLD.islandCY + random(-50, 50);
    let dx = targetX - r.x, dy = targetY - r.y;
    let d = sqrt(dx * dx + dy * dy);
    if (d > 30) {
      let spd = 1.2 * dt;
      r.x += (dx / d) * spd; r.y += (dy / d) * spd;
      r.facing = dx > 0 ? 1 : -1;
    } else {
      r.stealTimer += dt;
      if (r.stealTimer > 100) {
        r.stealTimer = 0;
        if (state.gold > 0) { let amt = min(state.gold, floor(3 + state._seaPeopleRaidData.tier * 2)); state.gold = max(0, state.gold - amt); addFloatingText(w2sX(r.x), w2sY(r.y) - 10, 'Plundered!', '#ff6644'); }
        else if (state.wood > 0) { state.wood -= min(state.wood, 3); addFloatingText(w2sX(r.x), w2sY(r.y) - 10, 'Plundered!', '#ff6644'); }
        else if (state.stone > 0) { state.stone -= min(state.stone, 2); addFloatingText(w2sX(r.x), w2sY(r.y) - 10, 'Plundered!', '#ff6644'); }
      }
    }
    let pDist = dist(p.x, p.y, r.x, r.y);
    if (p.attackTimer > 0 && p.slashPhase > 0 && pDist < p.attackRange + 10) {
      let dmg = (typeof getPlayerAttackDamage === 'function') ? getPlayerAttackDamage() : p.attackDamage;
      r.hp -= dmg; r.flashTimer = 8;
      addFloatingText(w2sX(r.x), w2sY(r.y) - 15, '-' + dmg, '#ffaa44');
      spawnParticles(r.x, r.y, 'hit', 3);
    }
    if (pDist < 35 && r.attackTimer <= 0) {
      let _rDefR2 = (typeof getPlayerDefenseReduction === 'function') ? getPlayerDefenseReduction() : ((p.armor || 0) * 3);
      let dmg = max(1, r.damage - _rDefR2);
      p.hp = max(0, p.hp - dmg); p.invincTimer = 20; r.attackTimer = 60;
      addFloatingText(w2sX(p.x), w2sY(p.y) - 15, '-' + dmg, '#ff4444');
      triggerScreenShake(3, 6);
    }
    if (state.centurion && state.centurion.task !== 'idle') {
      let cenDist = dist(state.centurion.x, state.centurion.y, r.x, r.y);
      if (cenDist < 35 && state.centurion.attackTimer <= 0) {
        r.hp -= state.centurion.attackDamage; r.flashTimer = 8;
        state.centurion.attackTimer = state.centurion.attackCooldown;
      }
    }
    let allyKeys = Object.keys(state.nations).filter(k2 => state.nations[k2].allied);
    for (let ak of allyKeys) {
      if (random() < 0.02 * dt) {
        r.hp -= floor(3 + state.nations[ak].military * 0.5);
        r.flashTimer = 5;
        if (random() < 0.05) addFloatingText(w2sX(r.x), w2sY(r.y) - 20, getNationName(ak) + ' ally strikes!', '#88ccff');
      }
    }
    if (state.buildings && frameCount % 40 === 0) {
      for (let b of state.buildings) {
        if (b.type === 'watchtower' && dist(b.x, b.y, r.x, r.y) < 200) {
          let tDmg = floor(5 + random(3));
          r.hp -= tDmg; r.flashTimer = 6;
          addFloatingText(w2sX(r.x), w2sY(r.y) - 18, '-' + tDmg, '#ccaa44');
          spawnParticles(r.x, r.y, 'hit', 2);
          break;
        }
      }
    }
    // Garrison soldiers attack sea people raiders
    if (state._garrisonDefenders) {
      for (let gs of state._garrisonDefenders) {
        if (gs.hp <= 0) continue;
        let gsDist = dist(gs.x, gs.y, r.x, r.y);
        if (gsDist < 30 && gs.attackTimer <= 0) {
          let gsDmg = gs.damage || 8;
          r.hp -= gsDmg; r.flashTimer = 6;
          gs.attackTimer = 40;
          addFloatingText(w2sX(r.x), w2sY(r.y) - 15, '-' + gsDmg, '#88ccff');
          spawnParticles(r.x, r.y, 'hit', 2);
        }
        if (gsDist < 35 && r.attackTimer <= 0) {
          let rDmg = max(1, r.damage || 10);
          gs.hp -= rDmg; gs.flashTimer = 8; r.attackTimer = 60;
          addFloatingText(w2sX(gs.x), w2sY(gs.y) - 15, '-' + rDmg, '#ff4444');
        }
      }
    }
    if (r.hp <= 0) {
      state._seaPeopleRaidParty.splice(i, 1);
      spawnParticles(r.x, r.y, 'death', 5);
      let xpAmt = 20 + state._seaPeopleRaidData.tier * 5;
      if (r.champion) xpAmt *= 2;
      if (r.boss) xpAmt *= 3;
      if (typeof grantXP === 'function') grantXP(xpAmt);
      addFloatingText(w2sX(r.x), w2sY(r.y) - 20, '+' + xpAmt + ' XP', '#ffdd44');
      state._seaPeopleRaidKills = (state._seaPeopleRaidKills || 0) + 1;
    }
  }
  // Update garrison defender movement toward sea people raiders
  _updateGarrisonDefenders(state._seaPeopleRaidParty || [], dt);
}

function _spawnSeaPeopleRaiders() {
  let data = state._seaPeopleRaidData;
  if (!data) return;

  // Spawn raider NPCs from eastern shore
  state._seaPeopleRaidParty = [];
  state._seaPeopleRaidKills = 0;
  let shoreX = WORLD.islandCX + getSurfaceRX() * 0.95;
  let shoreY = WORLD.islandCY;

  for (let i = 0; i < data.raidSize; i++) {
    state._seaPeopleRaidParty.push({
      x: shoreX + random(20, 60), y: shoreY + random(-80, 80),
      hp: data.baseHp, maxHp: data.baseHp, damage: data.baseDmg,
      vx: 0, vy: 0, attackTimer: 0, facing: -1, flashTimer: 0, stealTimer: 0,
    });
  }
  for (let i = 0; i < data.champCount; i++) {
    let chp = data.baseHp * 2;
    state._seaPeopleRaidParty.push({
      x: shoreX + random(20, 60), y: shoreY + random(-80, 80),
      hp: chp, maxHp: chp, damage: floor(data.baseDmg * 1.5),
      vx: 0, vy: 0, attackTimer: 0, facing: -1, flashTimer: 0, stealTimer: 0, champion: true,
    });
  }
  for (let i = 0; i < data.bossCount; i++) {
    let bhp = data.baseHp * 5;
    state._seaPeopleRaidParty.push({
      x: shoreX + random(20, 60), y: shoreY + random(-60, 60),
      hp: bhp, maxHp: bhp, damage: data.baseDmg * 2,
      vx: 0, vy: 0, attackTimer: 0, facing: -1, flashTimer: 0, stealTimer: 0, boss: true,
    });
  }

  state.seaPeopleShips = [];
}

function drawSeaPeopleShips() {
  if (!state.seaPeopleShips || state.seaPeopleShips.length === 0) return;
  for (let s of state.seaPeopleShips) {
    let bob = sin(frameCount * 0.02 + s.phase) * 3;
    let sx = s.x, sy = s.y + bob;
    push();
    translate(sx, sy);
    noStroke();
    // Hull
    fill(50, 35, 20);
    beginShape();
    vertex(-30, 0); vertex(-25, 8); vertex(25, 8); vertex(30, 0);
    vertex(25, -3); vertex(-25, -3);
    endShape(CLOSE);
    // Prow
    fill(40, 28, 15);
    beginShape();
    vertex(28, -3); vertex(35, -12); vertex(32, -10); vertex(30, 0);
    endShape(CLOSE);
    // Stern
    beginShape();
    vertex(-28, -3); vertex(-33, -10); vertex(-30, -8); vertex(-28, 0);
    endShape(CLOSE);
    // Mast
    stroke(60, 45, 25); strokeWeight(2);
    line(0, -3, 0, -28);
    // Sail — dark grey with red trim
    noStroke();
    fill(70, 65, 60, 200);
    beginShape();
    vertex(-12, -26); vertex(12, -26); vertex(10, -10); vertex(-10, -10);
    endShape(CLOSE);
    fill(120, 40, 30, 180);
    rect(-11, -14, 22, 3);
    // Dragon figurehead at prow
    fill(60, 50, 40);
    rect(33, -14, 3, 5);
    fill(42, 138, 106);
    rect(32, -18, 5, 4);
    fill(200, 60, 40);
    rect(35, -16, 2, 2); // eye
    // Oars
    stroke(70, 50, 30); strokeWeight(1);
    let oarPhase = sin(frameCount * 0.06 + s.phase) * 4;
    for (let o = 0; o < 3; o++) {
      let ox = -12 + o * 12;
      line(ox, 4, ox - 5, 12 + oarPhase);
      line(ox, 4, ox + 5, 12 - oarPhase);
    }
    noStroke();
    pop();
  }
}

function drawSeaPeopleRaiders() {
  if (!state._seaPeopleRaidParty || state._seaPeopleRaidParty.length === 0) return;
  if (state._seaPeopleWarning > 0) {
    push();
    fill(120, 40, 30, 180 + sin(frameCount * 0.15) * 60);
    noStroke(); textAlign(CENTER); textSize(14);
    text('SEA PEOPLE RAIDERS APPROACHING!', width / 2, height * 0.12);
    textSize(9); fill(255, 200, 150, 160);
    text('Defend your island!', width / 2, height * 0.15);
    pop();
    return;
  }
  let bannerCol = FACTIONS.seapeople ? FACTIONS.seapeople.bannerColor : [26, 58, 92];
  for (let r of state._seaPeopleRaidParty) {
    let sx = w2sX(r.x), sy = w2sY(r.y);
    if (sx < -30 || sx > width + 30 || sy < -30 || sy > height + 30) continue;
    push(); translate(sx, sy); scale(r.facing, 1); noStroke();
    if (r.flashTimer > 0) { fill(255, 255, 255, 200); ellipse(0, -8, 18, 24); pop(); continue; }
    fill(0, 0, 0, 30); ellipse(0, 2, 14, 5);
    fill(60, 50, 40); rect(-4, 0, 3, 6); rect(1, 0, 3, 6);
    fill(bannerCol[0] * 0.5, bannerCol[1] * 0.5, bannerCol[2] * 0.5); rect(-5, -10, 10, 12, 1);
    fill(bannerCol[0], bannerCol[1], bannerCol[2]); rect(-5, -4, 10, 2);
    fill(160, 120, 85); rect(-7, -8, 3, 7); rect(4, -8, 3, 7);
    fill(150, 110, 75); ellipse(0, -13, 8, 8);
    fill(bannerCol[0] * 0.8, bannerCol[1] * 0.8, bannerCol[2] * 0.8);
    arc(0, -15, 10, 8, PI, 0);
    fill(90, 70, 40);
    beginShape(); vertex(-5, -17); vertex(-8, -23); vertex(-4, -19); endShape(CLOSE);
    beginShape(); vertex(5, -17); vertex(8, -23); vertex(4, -19); endShape(CLOSE);
    fill(bannerCol[0] * 0.7, bannerCol[1] * 0.7, bannerCol[2] * 0.7); ellipse(-8, -6, 7, 10);
    fill(42, 138, 106); ellipse(-8, -6, 3, 3);
    fill(180, 180, 190); rect(5, -10, 2, 9);
    fill(120, 90, 40); rect(4, -4, 4, 2);
    if (r.champion) { fill(255, 200, 50, 180); ellipse(0, -26, 6, 6); }
    if (r.boss) { fill(255, 50, 50, 200); ellipse(0, -28, 8, 8); fill(255, 200, 50); ellipse(0, -28, 4, 4); }
    let sz = r.boss ? 20 : (r.champion ? 18 : 16);
    let hpPct = r.hp / r.maxHp;
    fill(40, 0, 0, 150); rect(-sz / 2, -22, sz, 3);
    fill(hpPct > 0.5 ? color(80, 180, 80) : color(200, 60, 40));
    rect(-sz / 2, -22, floor(sz * hpPct), 3);
    pop();
  }
}

// ─── GARRISON REAL-TIME DEFENSE SYSTEM ────────────────────────────────

function _spawnGarrisonDefenders() {
  if (state._garrisonDefenders && state._garrisonDefenders.length > 0) return;
  let lg = state.legia;
  if (!lg || !lg.army) return;
  let garrison = lg.army.filter(u => u.garrison);
  if (garrison.length === 0) return;
  let count = min(5, garrison.length);
  let cx = lg.castrumX || WORLD.islandCX + 200;
  let cy = lg.castrumY || WORLD.islandCY + 100;
  state._garrisonDefenders = [];
  for (let i = 0; i < count; i++) {
    let u = garrison[i];
    state._garrisonDefenders.push({
      x: cx + random(-30, 30), y: cy + random(-20, 20),
      hp: u.hp || 60, maxHp: u.maxHp || 60,
      damage: u.damage || 8,
      facing: 1, flashTimer: 0, attackTimer: 0,
      _srcIndex: lg.army.indexOf(u),
      _unitType: u.type || 'legionary',
    });
  }
  let terms = (typeof getFactionTerms === 'function') ? getFactionTerms() : { soldier: 'Soldier' };
  addFloatingText(w2sX(cx), w2sY(cy) - 30, count + ' ' + terms.soldier + 's deploying!', '#88ccff');
}

function _updateGarrisonDefenders(enemies, dt) {
  if (!state._garrisonDefenders) return;
  for (let i = state._garrisonDefenders.length - 1; i >= 0; i--) {
    let gs = state._garrisonDefenders[i];
    gs.flashTimer = max(0, gs.flashTimer - dt);
    gs.attackTimer = max(0, gs.attackTimer - dt);
    if (gs.hp <= 0) {
      spawnParticles(gs.x, gs.y, 'death', 4);
      addFloatingText(w2sX(gs.x), w2sY(gs.y) - 20, 'Soldier fallen!', '#ff6666');
      state._garrisonDefenders.splice(i, 1);
      continue;
    }
    // Find nearest living enemy
    let nearest = null, nearDist = 250;
    for (let e of enemies) {
      if (e.hp <= 0) continue;
      let d = dist(gs.x, gs.y, e.x, e.y);
      if (d < nearDist) { nearDist = d; nearest = e; }
    }
    if (nearest) {
      let dx = nearest.x - gs.x, dy = nearest.y - gs.y;
      let d = sqrt(dx * dx + dy * dy);
      gs.facing = dx > 0 ? 1 : -1;
      if (d > 25) {
        let spd = 1.8 * dt;
        gs.x += (dx / d) * spd; gs.y += (dy / d) * spd;
      }
    } else {
      // No enemies, return toward castrum
      let cx = (state.legia ? state.legia.castrumX : WORLD.islandCX + 200) || WORLD.islandCX + 200;
      let cy = (state.legia ? state.legia.castrumY : WORLD.islandCY + 100) || WORLD.islandCY + 100;
      let dx = cx - gs.x, dy = cy - gs.y;
      let d = sqrt(dx * dx + dy * dy);
      if (d > 10) { gs.x += (dx / d) * 1.0 * dt; gs.y += (dy / d) * 1.0 * dt; }
      gs.facing = dx > 0 ? 1 : -1;
    }
  }
}

function _returnGarrisonDefenders() {
  if (!state._garrisonDefenders) return;
  let lg = state.legia;
  if (lg && lg.army) {
    let deadCount = 0;
    // Sync HP back to army for survivors, track dead
    let deadIndices = [];
    for (let gs of state._garrisonDefenders) {
      if (gs.hp <= 0) {
        deadCount++;
        deadIndices.push(gs._srcIndex);
      } else if (gs._srcIndex >= 0 && gs._srcIndex < lg.army.length) {
        lg.army[gs._srcIndex].hp = gs.hp;
      }
    }
    // Remove dead garrison units from army (reverse order to preserve indices)
    deadIndices.sort((a, b) => b - a);
    for (let idx of deadIndices) {
      if (idx >= 0 && idx < lg.army.length) lg.army.splice(idx, 1);
    }
    if (deadCount > 0) addNotification(deadCount + ' garrison soldier' + (deadCount > 1 ? 's' : '') + ' lost in defense.', '#ff8866');
  }
  state._garrisonDefenders = null;
}

function _drawGarrisonDefenders() {
  if (!state._garrisonDefenders) return;
  let _m = (typeof getFactionMilitary === 'function') ? getFactionMilitary() : { tunic: [180, 40, 40], helm: [160, 140, 60], shield: [140, 30, 30], shieldShape: 'rect', legs: [120, 80, 50] };
  for (let gs of state._garrisonDefenders) {
    if (gs.hp <= 0) continue;
    let sx = w2sX(gs.x), sy = w2sY(gs.y);
    if (sx < -30 || sx > width + 30 || sy < -30 || sy > height + 30) continue;
    push(); translate(sx, sy); scale(gs.facing, 1); noStroke();
    if (gs.flashTimer > 0) { fill(255, 255, 255, 200); ellipse(0, -8, 18, 24); pop(); continue; }
    fill(0, 0, 0, 30); ellipse(0, 2, 14, 5);
    fill(_m.legs[0], _m.legs[1], _m.legs[2]);
    rect(-4, 0, 3, 6); rect(1, 0, 3, 6);
    fill(_m.tunic[0], _m.tunic[1], _m.tunic[2]);
    rect(-5, -10, 10, 12, 1);
    fill(_m.tunic[0] * 0.7, _m.tunic[1] * 0.7, _m.tunic[2] * 0.7);
    rect(-5, -4, 10, 2);
    fill(160, 120, 85);
    rect(-7, -8, 3, 7); rect(4, -8, 3, 7);
    fill(150, 110, 75); ellipse(0, -13, 8, 8);
    fill(_m.helm[0], _m.helm[1], _m.helm[2]);
    arc(0, -15, 10, 8, PI, 0); rect(-5, -16, 10, 2);
    fill(_m.shield[0], _m.shield[1], _m.shield[2]); stroke(_m.shield[0]*0.6, _m.shield[1]*0.6, _m.shield[2]*0.6); strokeWeight(1);
    if (_m.shieldShape === 'round') ellipse(-5, -4, 7, 7);
    else rect(-7, -8, 4, 8, 1);
    noStroke();
    fill(180, 180, 190); rect(5, -10, 2, 9);
    fill(120, 90, 40); rect(4, -4, 4, 2);
    let hpPct = gs.hp / gs.maxHp;
    fill(0, 40, 80, 150); rect(-8, -22, 16, 3);
    fill(hpPct > 0.5 ? color(80, 150, 220) : color(220, 120, 40));
    rect(-8, -22, floor(16 * hpPct), 3);
    pop();
  }
}

function drawNationRaiders() {
  return;
}

function openNationDiplomacy(key) { state.nationDiplomacyOpen = key; }
function closeNationDiplomacy() { state.nationDiplomacyOpen = null; }

function nationTrade(key) {
  let rv = state.nations[key];
  if (!rv) return;
  if (rv.lastTradeDay === state.day) { addFloatingText(width / 2, height * 0.3, 'Already traded today', '#ccaa44'); return; }
  let tradeCost = rv.personality === 'trader' ? 12 : 15;
  if (state.gold < tradeCost) { addFloatingText(width / 2, height * 0.3, 'Need ' + tradeCost + ' gold to trade', '#ff6644'); return; }
  state.gold = max(0, state.gold - tradeCost);
  let gain = floor(10 + rv.level * 2 + random(5));
  if (rv.personality === 'aggressive') gain = floor(gain * 1.2);
  state.gold += gain;
  let goods = NATION_TRADE_GOODS[key] || [];
  if (goods.length > 0) {
    let good = goods[floor(random(goods.length))];
    if (good.resource === 'xp' && typeof grantXP === 'function') { grantXP(good.amount); }
    else if (good.resource === 'crystal') { state.crystal = (state.crystal || 0) + good.amount; }
    else if (good.resource === 'scrolls') { state.scrolls = (state.scrolls || 0) + good.amount; }
    else if (good.resource === 'oil') { state.oil = (state.oil || 0) + good.amount; }
    else if (good.resource === 'meals') { state.meals = (state.meals || 0) + good.amount; }
    else if (good.resource === 'steel') { state.steel = (state.steel || 0) + good.amount; }
    else { state.exoticSpices = (state.exoticSpices || 0) + floor(random(1, 3)); }
    addFloatingText(width / 2, height * 0.25, 'Trade: +' + gain + 'g, +' + good.name, '#ddaa44');
  } else {
    state.exoticSpices = (state.exoticSpices || 0) + floor(random(1, 3));
    addFloatingText(width / 2, height * 0.25, 'Trade: +' + gain + 'g, +spices', '#ddaa44');
  }
  rv.reputation = min(100, rv.reputation + 5);
  rv.tradeActive = true; rv.lastTradeDay = state.day; rv.gold += tradeCost;
  addNotification(getNationName(key) + ' trade: reputation improved (+5)', '#88cc88');
}

function nationGift(key) {
  let rv = state.nations[key];
  if (!rv) return;
  if (state.gold < 25) { addFloatingText(width / 2, height * 0.3, 'Need 25 gold to gift', '#ff6644'); return; }
  state.gold = max(0, state.gold - 25); rv.gold += 25;
  let repGain = rv.personality === 'trader' ? 12 : rv.personality === 'balanced' ? 10 : 7;
  rv.reputation = min(100, rv.reputation + repGain);
  addFloatingText(width / 2, height * 0.25, 'Gift to ' + getNationName(key) + ': +' + repGain + ' rep', '#ddaa44');
  addNotification(getNationName(key) + ' appreciates your generosity!', '#88cc88');
}

function nationRaid(key) {
  let rv = state.nations[key];
  if (!rv) return;
  let lootGold = floor(20 + rv.level * 5 + random(10));
  let lootWood = floor(5 + random(5));
  let playerLoss = random() < (0.1 + rv.military * 0.03) ? 1 : 0;
  state.gold += lootGold; state.wood += lootWood;
  rv.gold = max(0, rv.gold - lootGold);
  rv.reputation = max(-100, rv.reputation - 15);
  rv.aggression = min(1.0, rv.aggression + 0.1);
  if (playerLoss && state.conquest.soldiers.length > 0) {
    state.conquest.soldiers.pop();
    addFloatingText(width / 2, height * 0.35, 'Lost a soldier in the raid!', '#ff4444');
  }
  addFloatingText(width / 2, height * 0.25, 'Raided ' + getNationName(key) + '! +' + lootGold + 'g +' + lootWood + ' wood', '#ffaa44');
  addNotification(getNationName(key) + ' reputation worsened (-15)', '#ff6644');
  closeNationDiplomacy();
}

function nationAlly(key) {
  let rv = state.nations[key];
  if (!rv) return;
  let threshold = NATION_PERSONALITIES[rv.personality].allyThreshold;
  if (rv.reputation < threshold) { addFloatingText(width / 2, height * 0.3, 'Need reputation ' + threshold + '+ (current: ' + rv.reputation + ')', '#ff6644'); return; }
  rv.allied = true; rv.aggression = 0.1; rv.raidParty = [];
  addFloatingText(width / 2, height * 0.2, 'ALLIANCE WITH ' + getNationName(key).toUpperCase() + '!', '#ffdd44');
  addNotification('Alliance formed with ' + getNationName(key) + '! Shared defense + trade bonuses.', '#ffdd44');
  spawnParticles(state.player.x, state.player.y, 'divine', 12);
  closeNationDiplomacy();
}

function nationDemandTribute(key) {
  let rv = state.nations[key];
  if (!rv) return;
  let playerMil = (state.conquest.soldiers || []).length + (state.centurion ? 2 : 0);
  if (playerMil <= rv.military) { addFloatingText(width / 2, height * 0.3, 'They laugh at your demand!', '#ff6644'); rv.reputation = max(-100, rv.reputation - 5); return; }
  if (random() < 0.4) {
    rv.reputation = max(-100, rv.reputation - 10);
    addFloatingText(width / 2, height * 0.25, getNationName(key) + ' refuses your demand!', '#ff6644');
  } else {
    let tributeGold = floor(15 + rv.level * 5 + random(10));
    state.gold += tributeGold; rv.gold = max(0, rv.gold - tributeGold);
    rv.reputation = max(-100, rv.reputation - 8);
    addFloatingText(width / 2, height * 0.25, getNationName(key) + ' pays ' + tributeGold + 'g in tribute', '#ddaa44');
  }
}

function declareWarOnNation(key) {
  let rv = state.nations[key];
  if (!rv) return;
  rv.reputation = -100; rv.aggression = 1.0; rv.allied = false; rv.tradeActive = false;
  addFloatingText(width / 2, height * 0.2, 'WAR DECLARED ON ' + getNationName(key).toUpperCase() + '!', '#ff2222');
  addNotification('War with ' + getNationName(key) + '! Expect heavy raids.', '#ff2222');
  closeNationDiplomacy();
}

function nationPeaceTreaty(key) {
  let rv = state.nations[key];
  if (!rv) return;
  let peaceCost = 50 + rv.level * 10;
  if (state.gold < peaceCost) { addFloatingText(width / 2, height * 0.3, 'Need ' + peaceCost + ' gold for peace treaty', '#ff6644'); return; }
  state.gold = max(0, state.gold - peaceCost);
  rv.reputation = 0; rv.aggression = 0.3; rv.raidParty = [];
  addFloatingText(width / 2, height * 0.2, 'PEACE WITH ' + getNationName(key).toUpperCase() + '!', '#88cc88');
  addNotification('Peace treaty signed with ' + getNationName(key) + '.', '#88cc88');
  closeNationDiplomacy();
}

function drawNationDiplomacyUI() {
  let key = state.nationDiplomacyOpen;
  if (!key || !state.nations[key]) return;
  let rv = state.nations[key];
  let name = getNationName(key);

  // Panel background
  let pw = 280, ph = 220;
  let px = width / 2 - pw / 2, py = height / 2 - ph / 2 - 30;
  noStroke();
  fill(20, 15, 10, 220); rect(px, py, pw, ph, 5);
  stroke(160, 140, 90, 180); strokeWeight(1); noFill();
  rect(px, py, pw, ph, 5); noStroke();

  // Title
  fill(240, 220, 170); textAlign(CENTER, TOP); textSize(14);
  text(name + ' — Diplomacy', px + pw / 2, py + 8);

  // Stats
  textSize(9); textAlign(LEFT, TOP);
  let sx = px + 15, sy = py + 32;
  let rep = rv.reputation || 0;
  let repCol = rep > 10 ? [100, 200, 100] : rep < -10 ? [220, 80, 60] : [200, 190, 140];
  fill(repCol[0], repCol[1], repCol[2]);
  text('Reputation: ' + rep, sx, sy);
  fill(200, 190, 140);
  text('Military: ' + (rv.military || 0) + '   Gold: ' + (rv.gold || 0) + '   Pop: ' + (rv.population || 0), sx, sy + 14);
  text('Status: ' + (rv.allied ? 'ALLIED' : rv.vassal ? 'VASSAL' : rv.defeated ? 'DEFEATED' : 'Independent'), sx, sy + 28);

  // Actions
  sy += 50;
  fill(180, 170, 140); textSize(10);
  let actions = [
    { key: '1', label: 'Trade (25g → +5 rep)', enabled: state.gold >= 25 },
    { key: '2', label: 'Gift (50g → +15 rep)', enabled: state.gold >= 50 },
    { key: '3', label: 'Propose Alliance (rep > 30)', enabled: rep > 30 && !rv.allied },
    { key: '4', label: 'Demand Tribute (rep > 20)', enabled: rep > 20 },
    { key: '5', label: 'Declare War', enabled: !rv.allied },
    { key: 'E', label: 'Invade (need army)', enabled: state.legia && state.legia.army && state.legia.army.length > 0 && !rv.defeated },
  ];
  for (let a of actions) {
    fill(a.enabled ? 220 : 100, a.enabled ? 210 : 90, a.enabled ? 170 : 70);
    text('[' + a.key + '] ' + a.label, sx, sy);
    sy += 16;
  }
  fill(140, 130, 110); text('[ESC] Close', sx, sy + 4);
  textAlign(LEFT, TOP);
}

function handleNationDiplomacyKey(k, kCode) {
  if (!state.nationDiplomacyOpen) return false;
  let key = state.nationDiplomacyOpen;
  if (kCode === 27) { closeNationDiplomacy(); return true; }
  if (k === '1') { nationTrade(key); return true; }
  if (k === '2') { nationGift(key); return true; }
  if (k === '3') { nationAlly(key); return true; }
  if (k === '4') { nationDemandTribute(key); return true; }
  if (k === '5') { declareWarOnNation(key); return true; }
  if (k === 'e' || k === 'E') {
    if (state._invasionTarget && typeof startInvasion === 'function') {
      closeNationDiplomacy(); startInvasion(state._invasionTarget); state._invasionTarget = null;
    }
    return true;
  }
  return true;
}

function drawNationIslesDistant() {
  return;
}

let _factionCoastCache = {};

function drawSingleNationIsleDistant(key) {
  return;
}

// ─── VISITABLE NATION ISLANDS ──────────────────────────────────────────────

function getNationIslandPalette(key) {
  let palettes = {
    carthage: {
      terrain: [210, 185, 130], terrainDark: [180, 155, 100], terrainRim: [195, 170, 115],
      path: [190, 165, 110], sand: [225, 205, 155], water: [40, 90, 140],
      treeLeaf: [60, 120, 50], treeTrunk: [130, 95, 55],
      special1: [160, 80, 40], special2: [200, 170, 100], // columns, market
    },
    egypt: {
      terrain: [220, 195, 120], terrainDark: [195, 170, 95], terrainRim: [210, 185, 110],
      path: [210, 185, 110], sand: [235, 215, 140], water: [30, 80, 120],
      treeLeaf: [50, 100, 40], treeTrunk: [120, 85, 45],
      special1: [200, 170, 40], special2: [64, 176, 160], // gold, teal
    },
    greece: {
      terrain: [195, 195, 185], terrainDark: [170, 170, 160], terrainRim: [185, 185, 175],
      path: [220, 218, 210], sand: [205, 200, 190], water: [50, 110, 180],
      treeLeaf: [70, 110, 50], treeTrunk: [100, 80, 50],
      special1: [240, 240, 248], special2: [80, 144, 192], // marble, blue
    },
    rome: {
      terrain: [160, 140, 110], terrainDark: [130, 115, 85], terrainRim: [150, 130, 100],
      path: [175, 160, 130], sand: [195, 175, 140], water: [35, 85, 130],
      treeLeaf: [55, 110, 45], treeTrunk: [115, 80, 45],
      special1: [175, 28, 28], special2: [180, 120, 50], // red, gold
    },
  };
  return palettes[key] || palettes.rome;
}

function generateNationIslandContent(key) {
  let rv = state.nations[key];
  if (!rv) return null;
  let fac = FACTIONS[key];
  let style = fac ? fac.style : FACTIONS.rome.style;
  let lv = rv.level;
  let rx = rv.isleRX * 0.7, ry = rv.isleRY * 0.7;
  let cx = rv.isleX, cy = rv.isleY;

  // Dock at bottom of island
  let dock = { x: cx, y: cy + ry * 0.85 };

  // Palace at center-north
  let palace = { x: cx, y: cy - ry * 0.3, w: 50 + lv * 4, h: 35 + lv * 3 };

  // Generate buildings based on level (3-8 buildings)
  let numBuildings = min(3 + lv, 8);
  let buildings = [];
  for (let i = 0; i < numBuildings; i++) {
    let angle = (i / numBuildings) * TWO_PI + random(-0.3, 0.3);
    let dist = random(0.2, 0.55) * rx;
    let bx = cx + cos(angle) * dist;
    let by = cy + sin(angle) * dist * (ry / rx);
    // Don't overlap palace or dock
    if (abs(bx - palace.x) < 40 && abs(by - palace.y) < 30) continue;
    if (abs(by - dock.y) < 25 && abs(bx - dock.x) < 30) continue;
    let bType = _pickNationBuilding(rv, key);
    let bw = random(16, 28), bh = random(18, 32);
    buildings.push({ x: bx, y: by, w: bw, h: bh, type: bType });
  }

  // Ambient NPCs (3-6)
  let numNPCs = min(3 + floor(lv / 2), 6);
  let npcs = [];
  let bannerCol = fac ? fac.bannerColor : [150, 100, 60];
  let roles = ['citizen', 'citizen', 'soldier', 'merchant', 'farmer', 'priest'];
  for (let i = 0; i < numNPCs; i++) {
    let a = random(TWO_PI), d = random(0.15, 0.5) * rx;
    let role = roles[i % roles.length];
    let destIdx = floor(random(buildings.length));
    npcs.push({
      x: cx + cos(a) * d,
      y: cy + sin(a) * d * (ry / rx),
      vx: 0, vy: 0,
      facing: random() > 0.5 ? 1 : -1,
      moveTimer: random(60, 200),
      idleTimer: 0,
      col: bannerCol,
      role: role,
      destIdx: destIdx,
    });
  }

  // Trees/scenery (faction-specific)
  let numTrees = 4 + floor(random(4));
  let trees = [];
  for (let i = 0; i < numTrees; i++) {
    let a = random(TWO_PI), d = random(0.4, 0.65) * rx;
    let tTypes = getFactionTreeTypes(key); trees.push({ x: cx + cos(a) * d, y: cy + sin(a) * d * (ry / rx), size: random(8, 16), type: tTypes[i % tTypes.length] });
  }

  // Walls if level >= 3
  let hasWalls = lv >= 3;
  let hasTowers = lv >= 5;

  // Nation wildlife
  let wildConfig = FACTION_WILDLIFE[key] || FACTION_WILDLIFE.rome;
  let wildlife = [];
  for (let wi = 0; wi < 3; wi++) {
    let wt = wildConfig[wi % wildConfig.length];
    let wa = random(TWO_PI), wd = random(0.2, 0.5) * rx;
    wildlife.push({ x: cx + cos(wa) * wd, y: cy + sin(wa) * wd * (ry / rx), vx: 0, vy: 0, type: wt.type, speed: wt.speed, size: wt.size, timer: random(60, 200), phase: random(TWO_PI), facing: random() > 0.5 ? 1 : -1 });
  }
  // Nation flora
  let floraConfig = FACTION_FLORA[key] || FACTION_FLORA.rome;
  let flora = [];
  for (let fi = 0; fi < 10; fi++) {
    let fa = random(TWO_PI), fd = random(0.15, 0.55) * rx;
    let ft = floraConfig[fi % floraConfig.length];
    flora.push({ x: cx + cos(fa) * fd, y: cy + sin(fa) * fd * (ry / rx), col: ft.col, w: ft.w, h: ft.h, phase: random(TWO_PI) });
  }
  return { dock, palace, buildings, npcs, trees, wildlife, flora, hasWalls, hasTowers, style, bannerCol };
}

function enterNationIsland(key) { console.warn('enterNationIsland deprecated -- openworld mode'); }

function exitNationIsland() { console.warn('exitNationIsland deprecated -- openworld mode'); }

function isOnNationIsland(wx, wy) {
  let key = state.visitingNation;
  if (!key) return false;
  let rv = state.nations[key];
  if (!rv) return false;
  let rx = rv.isleRX * 0.7, ry = rv.isleRY * 0.7;
  let ex = (wx - rv.isleX) / rx, ey = (wy - rv.isleY) / ry;
  return ex * ex + ey * ey < 1;
}

function updateNationIslandVisit(dt) {
  let key = state.visitingNation;
  if (!key) return;
  let rv = state.nations[key];
  let ni = state.nationIsland;
  if (!rv || !ni) return;
  let p = state.player;

  // Player movement (reuse standard WASD)
  let dx = 0, dy = 0;
  if (isKeybindDown('moveLeft') || keyIsDown(LEFT_ARROW)) dx -= 1;
  if (isKeybindDown('moveRight') || keyIsDown(RIGHT_ARROW)) dx += 1;
  if (isKeybindDown('moveUp') || keyIsDown(UP_ARROW)) dy -= 1;
  if (isKeybindDown('moveDown') || keyIsDown(DOWN_ARROW)) dy += 1;
  let niSpd = p.speed * (isKeybindDown('sprint') ? 1.6 : 1);
  if (dx || dy) {
    let m = sqrt(dx * dx + dy * dy);
    p.vx = (dx / m) * niSpd * dt;
    p.vy = (dy / m) * niSpd * dt;
    p.moving = true;
    if (abs(dx) > abs(dy)) p.facing = dx > 0 ? 'right' : 'left';
    else p.facing = dy > 0 ? 'down' : 'up';
  } else { p.vx = 0; p.vy = 0; p.moving = false; }
  p.x += p.vx; p.y += p.vy;
  if (!isOnNationIsland(p.x, p.y)) { p.x -= p.vx; p.y -= p.vy; }

  // Update NPC wandering
  for (let n of ni.npcs) {
    n.moveTimer -= dt;
    if (n.moveTimer <= 0) {
      n.vx = random(-0.3, 0.3); n.vy = random(-0.3, 0.3);
      n.facing = n.vx > 0 ? 1 : -1;
      n.moveTimer = random(80, 250);
      n.idleTimer = random(60, 120);
    }
    if (n.idleTimer > 0) { n.idleTimer -= dt; n.vx = 0; n.vy = 0; }
    else {
      let nx = n.x + n.vx * dt, ny = n.y + n.vy * dt;
      if (isOnNationIsland(nx, ny)) { n.x = nx; n.y = ny; }
      else { n.vx = -n.vx; n.vy = -n.vy; }
    }
  }

  // Update nation wildlife
  if (ni.wildlife) {
    let nrx = rv.isleRX * 0.7, nry = rv.isleRY * 0.7;
    for (let w of ni.wildlife) {
      w.timer -= dt;
      if (w.timer <= 0) { w.vx = (random() - 0.5) * w.speed * 2; w.vy = (random() - 0.5) * w.speed * 2; w.facing = w.vx > 0 ? 1 : -1; w.timer = random(80, 250); }
      let nx = w.x + w.vx * dt, ny = w.y + w.vy * dt;
      if (isOnNationIsland(nx, ny)) { w.x = nx; w.y = ny; } else { w.vx = -w.vx; w.vy = -w.vy; }
    }
  }

  // Walk off south edge = exit
  let ry = rv.isleRY * 0.7;
  // openworld: no teleport exit, player walks off naturally
}

function drawNationIslandFull() {
  return;
}

function drawNationIslandEntities() {
  return;
}

function drawNationIslandHUD() {
  return;
}

function handleNationIslandInteract() {
  if (!state.visitingNation) return false;
  let ni = state.nationIsland;
  if (!ni) return false;
  let p = state.player;

  // If diplomacy panel is open, don't handle island interactions
  if (state.nationDiplomacyOpen) return false;

  let dPalace = dist(p.x, p.y, ni.palace.x, ni.palace.y);
  let dDock = dist(p.x, p.y, ni.dock.x, ni.dock.y);

  if (dPalace < 50) {
    openNationDiplomacy(state.visitingNation);
    return true;
  }
  // openworld: dock exit deprecated, player walks off naturally
  return false;
}

// ─── SEAMLESS NATION ISLAND RENDERING (V4.0) ─────────────────────────────
function drawActiveNationContent() {
  return;
}

function updateActiveNationEntities(dt) {
  return;
}

function handleActiveNationInteract() {
  let key = state._activeNation;
  if (!key) return false;
  let rv = state.nations[key];
  let ni = rv && rv._nationContent;
  if (!ni) return false;
  if (state.nationDiplomacyOpen) return false;
  let p = state.player;
  let dPalace = dist(p.x, p.y, ni.palace.x, ni.palace.y);
  if (dPalace < 50) { openNationDiplomacy(key); return true; }
  return false;
}

// ─── WORLD EVENTS — inter-nation drama ────────────────────────────────────

function generateWorldEvent(keys) {
  let a = keys[floor(random(keys.length))];
  let b = keys.filter(k => k !== a)[floor(random(keys.length - 1))];
  if (!a || !b) return;
  let na = state.nations[a], nb = state.nations[b];
  if (!na || !nb || na.defeated || nb.defeated) return;
  let nameA = getNationName(a), nameB = getNationName(b);
  let events = [];
  if ((na.relations[b] || 0) < -30 && na.wars.indexOf(b) < 0) {
    events.push({ type: 'war', text: nameA + ' declares war on ' + nameB + '!', factionA: a, factionB: b });
  }
  if (na.personality === 'trader' || nb.personality === 'trader') {
    events.push({ type: 'trade', text: nameA + ' offers trade alliance to all nations', factionA: a, factionB: null });
  }
  if (na.military > 5) {
    events.push({ type: 'fleet', text: nameA + ' fleet spotted near your waters', factionA: a, factionB: null });
  }
  if (na.wars.indexOf(b) >= 0 && random() < 0.3) {
    events.push({ type: 'peace', text: nameA + ' and ' + nameB + ' sign peace treaty', factionA: a, factionB: b });
  }
  // AI raids AI
  if (na.wars.indexOf(b) >= 0 && na.military >= 3 && random() < 0.25) {
    events.push({ type: 'ai_raid', text: nameA + ' raids ' + nameB + '!', factionA: a, factionB: b });
  }
  // Famine or plague
  if (na.population > 15 && random() < 0.1) {
    events.push({ type: 'famine', text: 'Famine strikes ' + nameA + '!', factionA: a, factionB: null });
  }
  // Trade boom
  if (na.personality === 'trader' && na.gold > 200 && random() < 0.15) {
    events.push({ type: 'boom', text: nameA + ' enters a golden age of trade!', factionA: a, factionB: null });
  }
  // Military parade
  if (na.military >= 15 && random() < 0.1) {
    events.push({ type: 'parade', text: nameA + ' holds a grand military parade (' + na.military + ' troops)', factionA: a, factionB: null });
  }
  // Faction-specific events
  if (a === 'greece' && random() < 0.2) {
    events.push({ type: 'olympic', text: nameA + ' holds the Olympic Games!', factionA: a, factionB: null });
  }
  if (a === 'egypt' && random() < 0.2) {
    events.push({ type: 'monument', text: nameA + ' begins grand monument construction!', factionA: a, factionB: null });
  }
  if (a === 'carthage' && random() < 0.2) {
    events.push({ type: 'expedition', text: nameA + ' launches a trade expedition!', factionA: a, factionB: null });
  }
  if (a === 'gaul' && random() < 0.2) {
    events.push({ type: 'gathering', text: 'The tribes of ' + nameA + ' hold a great gathering!', factionA: a, factionB: null });
  }
  if (a === 'seapeople' && random() < 0.2) {
    events.push({ type: 'great_raid', text: nameA + ' launch a great raid on coastal nations!', factionA: a, factionB: null });
  }
  if (a === 'persia' && random() < 0.2) {
    events.push({ type: 'royal_road', text: nameA + ' expands the Royal Road!', factionA: a, factionB: null });
  }
  if (a === 'phoenicia' && random() < 0.2) {
    events.push({ type: 'colony', text: nameA + ' founds a new colony!', factionA: a, factionB: null });
  }
  if (a === 'rome' && na.wars && na.wars.length > 0 && na.military > 8 && random() < 0.15) {
    events.push({ type: 'triumph', text: nameA + ' celebrates a Triumph!', factionA: a, factionB: null });
  }

  if (events.length === 0) return;
  let evt = events[floor(random(events.length))];
  evt.day = state.day;
  state.worldEvents.push(evt);
  if (state.worldEvents.length > 30) state.worldEvents.shift();
  if (evt.type === 'war') {
    if (!na.wars.includes(b)) na.wars.push(b);
    if (!nb.wars.includes(a)) nb.wars.push(a);
    na.relations[b] = -80; nb.relations[a] = -80;
    addNotification(evt.text, '#ff6644');
  } else if (evt.type === 'peace') {
    na.wars = na.wars.filter(k => k !== b); nb.wars = nb.wars.filter(k => k !== a);
    na.relations[b] = 0; nb.relations[a] = 0;
    addNotification(evt.text, '#88cc88');
  } else if (evt.type === 'trade') {
    addNotification(evt.text, '#ddaa44'); na.gold += 10;
  } else if (evt.type === 'fleet') {
    addNotification(evt.text, '#ff8844');
    if (na.reputation < -10) na.reputation = max(-100, na.reputation - 3);
  } else if (evt.type === 'ai_raid') {
    let loot = min(nb.gold, floor(random(10, 25 + na.level)));
    nb.gold -= loot; na.gold += loot;
    na.military = max(0, na.military - 1);
    nb.military = max(0, nb.military - 1);
    if (random() < 0.3 && nb.population > 2) { nb.population--; na.population++; }
    addNotification(evt.text, '#ff8844');
  } else if (evt.type === 'famine') {
    na.population = max(2, na.population - floor(random(1, 3)));
    na.gold = max(0, na.gold - 20);
    addNotification(evt.text, '#cc8844');
  } else if (evt.type === 'boom') {
    na.gold += 50; na.population += 1;
    addNotification(evt.text, '#ddcc44');
  } else if (evt.type === 'parade') {
    addNotification(evt.text, '#aaaadd');
    na.aggression = min(1.0, na.aggression + 0.05);
  } else if (evt.type === 'olympic') {
    na.population += 2;
    for (let nk of keys) { if (state.nations[nk]) state.nations[nk].relations[a] = min(100, (state.nations[nk].relations[a] || 0) + 5); }
    addNotification(evt.text, '#88bbdd');
  } else if (evt.type === 'monument') {
    if (na.level < 15) na.level++;
    addNotification(evt.text, '#ddcc44');
  } else if (evt.type === 'expedition') {
    na.gold += 60;
    addNotification(evt.text, '#ddaa44');
  } else if (evt.type === 'gathering') {
    na.military += 3;
    addNotification(evt.text, '#cc8844');
  } else if (evt.type === 'great_raid') {
    for (let nk of keys) {
      if (nk === a) continue;
      let target = state.nations[nk];
      if (target && !target.defeated) { let loot = min(target.gold, floor(random(5, 15))); target.gold -= loot; na.gold += loot; }
    }
    addNotification(evt.text, '#ff6644');
  } else if (evt.type === 'royal_road') {
    na.gold += 40 + floor(na.population * 0.5);
    addNotification(evt.text, '#ddaa88');
  } else if (evt.type === 'colony') {
    na.population += 3;
    addNotification(evt.text, '#88cc88');
  } else if (evt.type === 'triumph') {
    na.military += 2; na.aggression = min(1.0, na.aggression + 0.05);
    for (let nk of keys) { if (state.nations[nk]) state.nations[nk].relations[a] = min(100, (state.nations[nk].relations[a] || 0) + 3); }
    addNotification(evt.text, '#ddaa44');
  }
}

// ─── VICTORY CONDITIONS ───────────────────────────────────────────────────

function checkVictoryConditions() {
  if (state.victoryAchieved) return;
  if (!state.nations) return;
  let nk = Object.keys(state.nations);
  if (nk.length === 0) return;
  let allDefeated = nk.every(k => state.nations[k].defeated || state.nations[k].reputation <= -100);
  if (allDefeated) { state.victoryAchieved = 'domination'; showVictoryScreen('domination'); return; }
  let allAllied = nk.every(k => state.nations[k].allied || state.nations[k].reputation >= 50);
  if (allAllied) { state.victoryAchieved = 'diplomatic'; showVictoryScreen('diplomatic'); return; }
  let allTrading = nk.every(k => state.nations[k].tradeActive);
  if (state.gold >= 10000 && allTrading) { state.victoryAchieved = 'economic'; showVictoryScreen('economic'); return; }
}

function showVictoryScreen(type) {
  let titles = { domination: 'DOMINATION VICTORY', diplomatic: 'DIPLOMATIC VICTORY', economic: 'ECONOMIC VICTORY' };
  let descs = { domination: 'You have conquered all nations! The Mediterranean is yours.', diplomatic: 'All nations are your allies! A new era of peace dawns.', economic: 'Your trade empire spans the sea! Wealth beyond measure.' };
  addFloatingText(width / 2, height * 0.15, titles[type] || 'VICTORY!', '#ffdd44');
  addNotification(descs[type] || 'You have won!', '#ffdd44');
  spawnParticles(state.player.x, state.player.y, 'divine', 20);
  trackMilestone('victory_' + type);
}

// Legacy compat stubs for old function names
function updateRivalRaid(dt) { updateNationRaids(dt); }
function drawRivalRaiders() { drawNationRaiders(); }
function drawRivalIsleDistant() { return; }
function openRivalDiplomacy() { openNationDiplomacy('carthage'); }
function closeRivalDiplomacy() { closeNationDiplomacy(); }
function drawRivalDiplomacyUI() { drawNationDiplomacyUI(); }
function handleRivalDiplomacyKey(k, kCode) { return handleNationDiplomacyKey(k, kCode); }
function updateRivalDaily() { /* replaced by updateNationsDaily */ }

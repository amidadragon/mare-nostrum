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
    // AI-to-AI trade
    if (rv.personality === 'trader' && rel > 10 && random() < 0.05) {
      rv.gold += 5; other.gold += 5;
      rv.relations[k2] = min(100, (rv.relations[k2] || 0) + 1);
    }
    // AI-to-AI alliance
    if (rel > 50 && !(rv.allies && rv.allies.includes(k2)) && random() < 0.02) {
      if (!rv.allies) rv.allies = [];
      if (!other.allies) other.allies = [];
      rv.allies.push(k2);
      if (!other.allies.includes(key)) other.allies.push(key);
      addNotification(name + ' and ' + getNationName(k2) + ' form an alliance!', '#88cc88');
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
  let keys = Object.keys(state.nations);
  for (let k of keys) {
    let rv = state.nations[k];
    if (!rv || rv.raidParty.length === 0) continue;
    let bannerCol = FACTIONS[k] ? FACTIONS[k].bannerColor : [150, 100, 60];
    let name = getNationName(k);
    if (rv.raidWarning > 0) {
      push();
      fill(bannerCol[0], bannerCol[1], bannerCol[2], 180 + sin(frameCount * 0.15) * 60);
      noStroke(); textAlign(CENTER); textSize(14);
      text(name.toUpperCase() + ' RAIDERS APPROACHING!', width / 2, height * 0.12);
      textSize(9); fill(255, 200, 150, 160);
      text('Defend your island!', width / 2, height * 0.15);
      pop(); continue;
    }
    for (let r of rv.raidParty) {
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
      fill(bannerCol[0] * 0.8, bannerCol[1] * 0.8, bannerCol[2] * 0.8); arc(0, -15, 10, 8, PI, 0); rect(-5, -16, 10, 2);
      fill(bannerCol[0] * 0.7, bannerCol[1] * 0.7, bannerCol[2] * 0.7); ellipse(-8, -6, 7, 10);
      fill(200, 170, 60); ellipse(-8, -6, 3, 3);
      fill(180, 180, 190); rect(5, -10, 2, 9);
      fill(120, 90, 40); rect(4, -4, 4, 2);
      let hpPct = r.hp / r.maxHp;
      fill(40, 0, 0, 150); rect(-8, -22, 16, 3);
      fill(hpPct > 0.5 ? color(80, 180, 80) : color(200, 60, 40));
      rect(-8, -22, floor(16 * hpPct), 3);
      pop();
    }
  }
  // Draw garrison defenders fighting raiders
  _drawGarrisonDefenders();
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
  if (!key) return;
  let rv = state.nations[key];
  if (!rv) return;
  let name = getNationName(key);
  let fac = FACTIONS[key];
  let bannerCol = fac ? fac.bannerColor : [150, 100, 60];
  let stanceCol = getNationStanceColor(rv);
  push();
  let pw = 380, ph = 490;
  let px = width / 2 - pw / 2, py = height / 2 - ph / 2;
  fill(20, 16, 12, 240); stroke(bannerCol[0], bannerCol[1], bannerCol[2]); strokeWeight(2);
  rect(px, py, pw, ph, 8); noStroke();
  fill(bannerCol[0], bannerCol[1], bannerCol[2], 60);
  rect(px + 2, py + 2, pw - 4, 28, 6, 6, 0, 0);
  // Portrait
  let portraitX = px + 30, portraitY = py + 50;
  fill(bannerCol[0], bannerCol[1], bannerCol[2], 80);
  rect(portraitX - 18, portraitY - 18, 36, 36, 4);
  fill(180, 145, 110); ellipse(portraitX, portraitY, 24, 28);
  fill(60, 45, 30); ellipse(portraitX - 5, portraitY - 4, 4, 4); ellipse(portraitX + 5, portraitY - 4, 4, 4);
  fill(bannerCol[0], bannerCol[1], bannerCol[2]);
  arc(portraitX, portraitY - 10, 26, 14, PI, 0);
  // Title + stance
  fill(220, 180, 120); textSize(15); textAlign(CENTER, TOP);
  text(name, width / 2, py + 7);
  fill(stanceCol); textSize(11); textAlign(LEFT, TOP);
  text(getNationStanceLabel(rv).toUpperCase(), portraitX + 28, portraitY - 15);
  fill(140, 130, 110); textSize(9);
  text('Personality: ' + rv.personality, portraitX + 28, portraitY);
  // Stats
  let sy = py + 90;
  fill(180, 170, 140); textSize(10); textAlign(LEFT, TOP);
  let _dTier = (typeof _getNationSettlementTier === 'function') ? _getNationSettlementTier(rv.level) : '';
  let _dMil = (typeof _getNationMilitaryLabel === 'function') ? _getNationMilitaryLabel(rv.military) : '';
  text(_dTier + ' (Lv.' + rv.level + ')  |  Pop: ' + rv.population + '  |  Military: ' + rv.military + ' (' + _dMil + ')  |  Gold: ' + rv.gold, px + 15, sy); sy += 14;
  // Reputation bar
  let repBarW = pw - 30, repBarH = 10;
  fill(40, 35, 30); rect(px + 15, sy, repBarW, repBarH, 3);
  let repPct = (rv.reputation + 100) / 200;
  fill(lerp(200, 80, repPct), lerp(60, 200, repPct), lerp(40, 80, repPct));
  rect(px + 16, sy + 1, floor((repBarW - 2) * repPct), repBarH - 2, 2);
  fill(220, 210, 180); textSize(8); textAlign(CENTER, TOP);
  text('Rep: ' + rv.reputation, px + pw / 2, sy + 1); sy += 16;
  fill(180, 170, 140); textSize(9); textAlign(LEFT, TOP);
  text('Buildings: ' + rv.buildings.length + '  |  Aggression: ' + nf(rv.aggression, 1, 1), px + 15, sy); sy += 14;
  // Relations with other nations
  let otherKeys = Object.keys(state.nations).filter(k2 => k2 !== key);
  let relText = '';
  for (let k2 of otherKeys) {
    let rel = rv.relations[k2] || 0;
    let relLabel = rel > 20 ? 'friendly' : rel < -20 ? 'hostile' : 'neutral';
    if (rv.wars && rv.wars.indexOf(k2) >= 0) relLabel = 'AT WAR';
    if (rv.allies && rv.allies.indexOf(k2) >= 0) relLabel = 'allied';
    relText += getNationName(k2) + ': ' + relLabel + '  ';
  }
  if (relText) { fill(140, 130, 110); textSize(8); text('Relations: ' + relText, px + 15, sy); sy += 12; }
  if (rv.vassal && rv._vassalOf) { fill(180, 150, 60); textSize(10); text('VASSAL of ' + getNationName(rv._vassalOf), px + 15, sy); sy += 14; }
  if (rv.wars && rv.wars.length > 0) {
    let _warList = rv.wars.map(function(wk) { return getNationName(wk); }).join(', ');
    fill(255, 100, 80); textSize(10); text('AT WAR with: ' + _warList, px + 15, sy); sy += 14;
  }
  if (rv.allies && rv.allies.length > 0) {
    let _allyList = rv.allies.map(function(ak) { return getNationName(ak); }).join(', ');
    fill(100, 180, 100); textSize(10); text('Allied with: ' + _allyList, px + 15, sy); sy += 14;
  }
  if (rv.allied) { fill(100, 200, 100); textSize(10); text('ALLIED WITH YOU — Shared defense, +' + (5 + rv.level) + 'g/day', px + 15, sy); sy += 14; }
  sy += 8;
  // Action buttons
  let btnW = pw - 30, btnH = 32;
  let isAtWar = rv.reputation <= -50;
  let pers = NATION_PERSONALITIES[rv.personality] || NATION_PERSONALITIES.balanced;
  let actions = [
    { label: 'TRADE', desc: 'Exchange goods (' + (rv.personality === 'trader' ? 12 : 15) + 'g) — +rep, +goods', key: '1', ok: state.gold >= (rv.personality === 'trader' ? 12 : 15) && !rv.allied && rv.lastTradeDay !== state.day && !isAtWar },
    { label: 'GIFT', desc: 'Send 25g — improve reputation', key: '2', ok: state.gold >= 25 && !rv.allied },
    { label: 'PROPOSE ALLIANCE', desc: 'Need rep ' + pers.allyThreshold + '+', key: '3', ok: rv.reputation >= pers.allyThreshold && !rv.allied },
    { label: 'DEMAND TRIBUTE', desc: 'Requires military superiority (risky)', key: '4', ok: !rv.allied && !isAtWar },
    { label: 'DECLARE WAR', desc: 'Rep to -100, heavy raids', key: '5', ok: !rv.allied && rv.reputation > -100 && !isAtWar },
    { label: 'PEACE TREATY', desc: 'Pay ' + (50 + rv.level * 10) + 'g to end hostilities', key: '6', ok: isAtWar && state.gold >= (50 + rv.level * 10) },
    { label: 'RAID', desc: 'Send small force to steal resources', key: '7', ok: !rv.allied && typeof getArmyCount === 'function' && getArmyCount() >= 3 },
    { label: 'INVADE', desc: 'Full army conquest — make vassal', key: '8', ok: !rv.allied && !rv.vassal && typeof getArmyCount === 'function' && getArmyCount() >= 10 },
  ];
  for (let i = 0; i < actions.length; i++) {
    let a = actions[i], by = sy + i * (btnH + 3);
    fill(a.ok ? color(40, 50, 35, 200) : color(40, 35, 35, 120));
    rect(px + 15, by, btnW, btnH, 4);
    fill(a.ok ? 220 : 100); textSize(10); textAlign(LEFT, TOP);
    text('[' + a.key + '] ' + a.label, px + 25, by + 3);
    fill(a.ok ? color(160, 150, 120) : color(90, 80, 70)); textSize(9);
    text(a.desc, px + 25, by + 17);
  }
  fill(120, 110, 90); textSize(10); textAlign(CENTER, TOP);
  text('Press 1-8 to act  |  ESC to close', width / 2, py + ph - 18);
  pop();
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
  if (k === '6') { nationPeaceTreaty(key); return true; }
  if (k === '7') {
    if (typeof launchRaidOnNation === 'function') { closeNationDiplomacy(); launchRaidOnNation(key); }
    return true;
  }
  if (k === '8') {
    if (typeof launchInvasionOnNation === 'function') { closeNationDiplomacy(); launchInvasionOnNation(key); }
    return true;
  }
  return true;
}

function drawNationIslesDistant() {
  let keys = Object.keys(state.nations);
  let isSailing = state.rowing && state.rowing.active;
  for (let k of keys) {
    if (!isSailing || typeof getIslandLOD !== 'function') {
      drawSingleNationIsleDistant(k);
      continue;
    }
    let rv = state.nations[k];
    if (!rv || rv.defeated) continue;
    let ds = _getDistantScale(rv.isleX, rv.isleY, rv.isleRX);
    if (ds.dist > (typeof _getMaxViewDist === 'function' ? _getMaxViewDist() : 4000)) continue;
    let lod = getIslandLOD(ds.dist);
    let sx = w2sX(rv.isleX), sy = w2sY(rv.isleY);
    let horizY = max(height * 0.06, height * 0.25 - horizonOffset) + 10;
    sy = max(sy, horizY);
    // Viewport culling
    let viewW = width / camZoom, viewH = height / camZoom;
    if (sx < -viewW * 0.6 || sx > width + viewW * 0.6 || sy < -viewH * 0.5 || sy > height + viewH * 0.5) continue;
    // FPS throttle: downgrade close -> medium if FPS < 30
    if (lod === 'close' && typeof _fpsSmooth !== 'undefined' && _fpsSmooth < 30) lod = 'medium';
    if (lod === 'close') {
      drawNationCloseLOD(sx, sy, rv.isleRX, rv.isleRY, k, rv, ds);
    } else if (lod === 'medium') {
      drawNationMediumLOD(sx, sy, rv.isleRX, rv.isleRY, k, rv, ds);
    } else {
      drawSingleNationIsleDistant(k);
    }
  }
}

let _factionCoastCache = {};

function drawSingleNationIsleDistant(key) {
  let rv = state.nations[key];
  if (!rv || rv.defeated) return;
  let fac = FACTIONS[key];
  let bannerCol = fac ? fac.bannerColor : [150, 100, 60];
  let accentCol = fac ? fac.accentColor : [180, 140, 100];
  let sx = w2sX(rv.isleX), sy = w2sY(rv.isleY);
  let _horizY = max(height * 0.06, height * 0.25 - horizonOffset) + 10;
  sy = max(sy, _horizY);
  // Distance-based scaling when sailing
  let _dScale = null;
  if (typeof _getDistantScale === 'function') {
    _dScale = _getDistantScale(rv.isleX, rv.isleY, rv.isleRX);
    if (_dScale.dist > (typeof _getMaxViewDist === 'function' ? _getMaxViewDist() : 4000)) return;
  }
  if (sx < -400 || sx > width + 400 || sy < -400 || sy > height + 400) return;
  push(); noStroke();
  if (_dScale && _dScale.scale < 0.98) {
    translate(sx, sy); scale(_dScale.scale); translate(-sx, -sy);
  }
  let bright = (typeof getSkyBrightness === 'function') ? getSkyBrightness() : 0.7;
  let hazeA = lerp(60, 30, bright);
  let fsx = floor(sx), fsy = floor(sy);
  let lv = rv.level;
  let rx = rv.isleRX, ry = rv.isleRY;
  let _bs = 0.25; // blue shift for distance

  // Faction-specific terrain colors
  let terrainCol, beachCol, treeCol;
  if (key === 'carthage') {
    terrainCol = [lerp(185, 170, _bs), lerp(155, 165, _bs), lerp(95, 130, _bs)]; // sandy
    beachCol = [200, 180, 140]; treeCol = [40, 100, 35]; // palms
  } else if (key === 'egypt') {
    terrainCol = [lerp(200, 180, _bs), lerp(175, 175, _bs), lerp(110, 140, _bs)]; // golden sand
    beachCol = [210, 190, 130]; treeCol = [50, 110, 40]; // papyrus
  } else if (key === 'greece') {
    terrainCol = [lerp(155, 160, _bs), lerp(170, 175, _bs), lerp(130, 155, _bs)]; // green-white
    beachCol = [215, 210, 195]; treeCol = [55, 95, 40]; // olives
  } else if (key === 'seapeople') {
    terrainCol = [lerp(100, 120, _bs), lerp(105, 130, _bs), lerp(115, 145, _bs)]; // dark grey-blue rocky coast
    beachCol = [150, 145, 140]; treeCol = [55, 70, 60]; // driftwood
  } else if (key === 'persia') {
    terrainCol = [lerp(195, 180, _bs), lerp(165, 165, _bs), lerp(95, 130, _bs)]; // golden amber
    beachCol = [215, 195, 140]; treeCol = [60, 105, 35]; // cypress
  } else if (key === 'phoenicia') {
    terrainCol = [lerp(170, 160, _bs), lerp(130, 145, _bs), lerp(110, 140, _bs)]; // warm brown-purple
    beachCol = [200, 180, 155]; treeCol = [50, 95, 45]; // cedar
  } else if (key === 'gaul') {
    terrainCol = [lerp(95, 120, _bs), lerp(135, 155, _bs), lerp(80, 125, _bs)]; // dark green forest
    beachCol = [175, 170, 140]; treeCol = [35, 80, 30]; // dense oak
  } else { // rome
    terrainCol = [lerp(140, 150, _bs), lerp(130, 145, _bs), lerp(95, 130, _bs)]; // earthy
    beachCol = [195, 180, 145]; treeCol = [45, 90, 35];
  }

  // Unique seed per faction
  let _islandSeed = key.charCodeAt(0) * 7 + key.charCodeAt(1) * 13;

  // Use reusable coastline system if palette exists
  let _facPalette = ISLAND_PALETTES[key] || null;
  if (_facPalette) {
    if (!_factionCoastCache[key]) {
      let _features = [];
      if (key === 'carthage') _features = [{angle: Math.PI*0.6, strength: 0.07, width: 0.4, type: 'headland'}, {angle: Math.PI*1.5, strength: 0.05, width: 0.3, type: 'bay'}];
      else if (key === 'egypt') _features = [{angle: Math.PI*0.4, strength: 0.06, width: 0.5, type: 'headland'}, {angle: Math.PI*1.1, strength: 0.04, width: 0.35, type: 'bay'}];
      else if (key === 'greece') _features = [{angle: Math.PI*0.3, strength: 0.08, width: 0.35, type: 'bay'}, {angle: Math.PI*1.3, strength: 0.06, width: 0.3, type: 'peninsula'}];
      else if (key === 'seapeople') _features = [{angle: Math.PI*0.7, strength: 0.09, width: 0.3, type: 'headland'}, {angle: Math.PI*1.6, strength: 0.07, width: 0.25, type: 'bay'}];
      else if (key === 'persia') _features = [{angle: Math.PI*0.5, strength: 0.05, width: 0.45, type: 'headland'}, {angle: Math.PI*1.4, strength: 0.04, width: 0.3, type: 'bay'}];
      else if (key === 'phoenicia') _features = [{angle: Math.PI*0.8, strength: 0.07, width: 0.35, type: 'peninsula'}, {angle: Math.PI*0.2, strength: 0.05, width: 0.3, type: 'bay'}];
      else if (key === 'gaul') _features = [{angle: Math.PI*1.0, strength: 0.06, width: 0.4, type: 'headland'}, {angle: Math.PI*1.8, strength: 0.05, width: 0.3, type: 'bay'}];
      else _features = [{angle: Math.PI*0.5, strength: 0.05, width: 0.35, type: 'headland'}];
      _factionCoastCache[key] = generateIslandCoastline(_islandSeed, 64, rx, ry, _features);
    }
    drawIslandBase(fsx, fsy, rx, ry, _factionCoastCache[key], _facPalette, 'medium');
  } else {
    // Fallback: use default palette coastline for unknown factions
    if (!_factionCoastCache[key]) {
      _factionCoastCache[key] = generateIslandCoastline(_islandSeed, 64, rx, ry, [{angle: Math.PI*0.5, strength: 0.05, width: 0.35, type: headland}]);
    }
    drawIslandBase(fsx, fsy, rx, ry, _factionCoastCache[key], ISLAND_PALETTES.default, medium);
  }

  // Trees (faction-appropriate) — 4-7 based on level
  let numTrees = min(4 + lv, 8);
  for (let i = 0; i < numTrees; i++) {
    let ta = (i * 2.39996) % TWO_PI;
    let tr = 0.25 + ((i * 19 + 3) % 50) / 100 * 0.4;
    let tpx = fsx + cos(ta) * rx * tr;
    let tpy = fsy + sin(ta) * ry * tr * 0.7;
    // Tree trunk
    fill(treeCol[0] - 15, treeCol[1] - 20, treeCol[2] - 10, 100);
    rect(floor(tpx - 1), floor(tpy - 2), 2, 5);
    // Tree canopy
    fill(treeCol[0], treeCol[1] + (i % 3) * 8, treeCol[2], hazeA + 80);
    if (key === 'carthage' || key === 'egypt') {
      // Palm-style: narrow top, fronds
      ellipse(tpx, tpy - 5, 7 + (i % 2) * 3, 5);
      ellipse(tpx - 2, tpy - 4, 5, 3);
      ellipse(tpx + 2, tpy - 4, 5, 3);
    } else {
      // Round olive/deciduous canopy
      ellipse(tpx, tpy - 4, 10 + (i % 3) * 2, 7 + (i % 2) * 2);
    }
  }

  // Buildings — faction-colored, 3-5 visible
  let numB = min(3 + floor(lv * 0.5), 6);
  let _wallR = fac && fac.style ? fac.style.wall[0] : 180;
  let _wallG = fac && fac.style ? fac.style.wall[1] : 170;
  let _wallB = fac && fac.style ? fac.style.wall[2] : 150;
  let _roofR = fac && fac.style ? fac.style.roof[0] : 160;
  let _roofG = fac && fac.style ? fac.style.roof[1] : 90;
  let _roofB = fac && fac.style ? fac.style.roof[2] : 50;
  for (let i = 0; i < numB; i++) {
    let ba = (i / numB) * PI + 0.3;
    let br = rx * 0.25 + (i % 3) * rx * 0.12;
    let bx = fsx + cos(ba) * br - rx * 0.15;
    let by = fsy + sin(ba) * br * 0.5 - ry * 0.15;
    let bw = 6 + (i % 2) * 3, bh = 5 + floor(lv * 0.4) + (i % 3) * 2;
    // Wall
    fill(_wallR, _wallG, _wallB, hazeA + 70);
    rect(floor(bx), floor(by - bh), bw, bh);
    // Roof
    fill(_roofR, _roofG, _roofB, hazeA + 60);
    rect(floor(bx - 1), floor(by - bh - 2), bw + 2, 3);
  }

  // Walls/towers at higher levels
  if (lv >= 3) {
    fill(accentCol[0] * 0.7, accentCol[1] * 0.7, accentCol[2] * 0.7, hazeA + 40);
    // Wall line
    stroke(accentCol[0] * 0.6, accentCol[1] * 0.6, accentCol[2] * 0.6, hazeA + 30);
    strokeWeight(1); noFill();
    ellipse(fsx, fsy, rx * 1.3, ry * 1.3);
    noStroke();
    // Corner towers
    for (let ti = 0; ti < 4; ti++) {
      let twA = (ti / 4) * TWO_PI + 0.4;
      let twx = fsx + cos(twA) * rx * 0.65;
      let twy = fsy + sin(twA) * ry * 0.65;
      fill(accentCol[0] * 0.8, accentCol[1] * 0.8, accentCol[2] * 0.8, hazeA + 45);
      rect(floor(twx - 2), floor(twy - 6 - lv * 0.3), 5, 6 + floor(lv * 0.3));
      // Tower cap
      fill(bannerCol[0], bannerCol[1], bannerCol[2], hazeA + 40);
      rect(floor(twx - 3), floor(twy - 8 - lv * 0.3), 7, 2);
    }
  }

  // Central tower at lv 5+
  if (lv >= 5) {
    let twH = 10 + lv;
    fill(accentCol[0], accentCol[1], accentCol[2], hazeA + 50);
    rect(fsx - 3, fsy - floor(ry * 0.15) - twH, 6, twH);
    // Banner on tower
    fill(bannerCol[0], bannerCol[1], bannerCol[2], hazeA + 55);
    rect(fsx + 3, fsy - floor(ry * 0.15) - twH, 7, 4);
    fill(accentCol[0], accentCol[1], accentCol[2], hazeA + 50);
    rect(fsx + 2, fsy - floor(ry * 0.15) - twH - 2, 1, 8);
  }

  // Smoke from chimneys
  if (lv >= 2) {
    fill(180, 180, 170, 18 + sin(frameCount * 0.03) * 8);
    for (let i = 0; i < min(lv, 4); i++) {
      let smX = fsx - 12 + i * 10, smY = fsy - floor(ry * 0.25) - 8 - sin(frameCount * 0.02 + i) * 3;
      ellipse(smX, smY, 5 + sin(frameCount * 0.04 + i) * 2, 3);
      ellipse(smX + 1, smY - 3, 3, 2);
    }
  }

  // Flag with faction colors at island peak
  let _flagY = fsy - floor(ry * 0.6);
  fill(accentCol[0], accentCol[1], accentCol[2], hazeA + 60);
  rect(fsx, _flagY - 2, 1, 14);
  fill(bannerCol[0], bannerCol[1], bannerCol[2], hazeA + 80);
  beginShape();
  vertex(fsx + 1, _flagY - 2); vertex(fsx + 10, _flagY + 1);
  vertex(fsx + 1, _flagY + 4);
  endShape(CLOSE);

  // Dock at south shore
  fill(110, 85, 50);
  rect(fsx - 3, floor(fsy + ry * 0.88), 6, 12);
  fill(130, 100, 60);
  rect(fsx - 5, floor(fsy + ry * 0.86), 10, 3);

  // Harbored ships at level 4+
  if (lv >= 4) {
    let nShips = min(floor(lv / 2), 3);
    for (let i = 0; i < nShips; i++) {
      let shX = fsx + 10 + i * 10, shY = fsy + floor(ry * 0.85);
      fill(90, 65, 30, hazeA + 50);
      beginShape();
      vertex(shX - 5, shY); vertex(shX - 3, shY + 2); vertex(shX + 3, shY + 2); vertex(shX + 5, shY);
      endShape(CLOSE);
      fill(70, 50, 25, hazeA + 40);
      rect(shX - 1, shY - 5, 1, 5);
      fill(bannerCol[0], bannerCol[1], bannerCol[2], hazeA + 40);
      triangle(shX, shY - 5, shX + 4, shY - 3, shX, shY - 1);
    }
  }

  // Atmospheric distance haze overlay
  let _hazeAlpha = _dScale ? max(20, floor(_dScale.haze * 0.5)) : 20;
  // Extra haze when clamped near horizon
  let _horizHaze = max(0, 1 - (sy - _horizY) / 200) * 25;
  _hazeAlpha = min(120, _hazeAlpha + _horizHaze);
  fill(140 + 30 * bright, 165 + 20 * bright, 195 + 10 * bright, _hazeAlpha);
  ellipse(fsx, fsy, rx * 2.2, ry * 2.2);

  // Water reflection below island
  fill(30 + 20 * bright, 60 + 30 * bright, 85 + 25 * bright, 12);
  ellipse(fsx, fsy + ry * 1.05, rx * 1.5, ry * 0.3);

  // Sword icon
  fill(getNationStanceColor(rv)); textSize(12); textAlign(CENTER);
  text('\u2694', sx, fsy - floor(ry * 0.7));
  // Name - color-coded by stance
  textSize(11); textStyle(ITALIC);
  text(getNationName(key), sx, fsy + ry + 14); textStyle(NORMAL);
  // Settlement tier + military strength
  let _tier = (typeof _getNationSettlementTier === 'function') ? _getNationSettlementTier(lv) : 'Lv.' + lv;
  let _milLabel = (typeof _getNationMilitaryLabel === 'function') ? _getNationMilitaryLabel(rv.military) : '';
  let _stanceLabel = getNationStanceLabel(rv);
  let _dangerIcon = (rv.reputation <= -20) ? '\u2620 ' : (rv.allied ? '\u262E ' : '');
  fill(getNationStanceColor(rv)); textSize(9);
  text(_dangerIcon + _stanceLabel + ' - ' + _tier, sx, fsy + ry + 24);
  // Military + vassal status
  let _extraInfo = _milLabel ? ('Military: ' + _milLabel) : '';
  if (rv.vassal && rv._vassalOf) _extraInfo = 'Vassal of ' + getNationName(rv._vassalOf);
  if (rv.wars && rv.wars.length > 0) {
    let warNames = rv.wars.map(function(wk) { return getNationName(wk); }).slice(0, 2).join(', ');
    _extraInfo += (_extraInfo ? ' | ' : '') + 'At war: ' + warNames;
  }
  if (_extraInfo) { fill(180, 160, 130, 160); textSize(7); text(_extraInfo, sx, fsy + ry + 33); }
  // Distance
  if (typeof _getIslandDist === 'function') {
    let _nd = _getIslandDist(rv.isleX, rv.isleY);
    fill(180, 170, 140, 110); textSize(8);
    text(_nd, sx, fsy + ry + 34);
  }
  textAlign(LEFT, TOP);
  pop();
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

function enterNationIsland(key) {
  let rv = state.nations[key];
  if (!rv || rv.defeated) return;
  state.visitingNation = key;
  // Persistent islands: restore from cache if previously visited
  if (rv._islandCache) {
    state.nationIsland = rv._islandCache;
  } else {
    state.nationIsland = generateNationIslandContent(key);
    rv._islandCache = state.nationIsland;
  }
  state.rowing.active = false;
  let ni = state.nationIsland;
  let p = state.player;
  p.x = ni.dock.x;
  p.y = ni.dock.y - 15;
  p.vx = 0; p.vy = 0;
  if (p.invincTimer !== undefined) p.invincTimer = 60;
  cam.x = p.x; cam.y = p.y;
  _startCamTransition(); camZoomTarget = 1.0;
  addFloatingText(width / 2, height * 0.25, getNationName(key).toUpperCase(), FACTIONS[key] ? FACTIONS[key].accentColorHex : '#ddaa44');
  addFloatingText(width / 2, height * 0.3, 'E near Palace for diplomacy  |  E near dock to sail home', '#ccbb88');
  trackMilestone('visit_nation_' + key);
}

function exitNationIsland() {
  let key = state.visitingNation;
  if (!key) return;
  let rv = state.nations[key];
  // Save island state back to cache so changes persist
  if (rv && state.nationIsland) {
    rv._islandCache = state.nationIsland;
  }
  state.visitingNation = null;
  state.nationIsland = null;
  state.nationDiplomacyOpen = null;
  let p = state.player;
  // Put player back in boat near the island
  state.rowing.active = true;
  state.rowing.x = rv.isleX;
  state.rowing.y = rv.isleY + rv.isleRY * 1.1;
  state.rowing.speed = 0;
  state.rowing.angle = HALF_PI;
  state.rowing.wakeTrail = [];
  p.x = state.rowing.x; p.y = state.rowing.y;
  p.vx = 0; p.vy = 0;
  cam.x = p.x; cam.y = p.y;
  _startCamTransition();
  addFloatingText(width / 2, height * 0.35, 'Departing ' + getNationName(key), '#ccbb88');
}

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
  if (p.y > rv.isleY + ry * 0.95) exitNationIsland();
}

function drawNationIslandFull() {
  let key = state.visitingNation;
  if (!key) return;
  let rv = state.nations[key];
  let ni = state.nationIsland;
  if (!rv || !ni) return;
  let pal = getNationIslandPalette(key);
  let cx = rv.isleX, cy = rv.isleY;
  let rx = rv.isleRX * 0.7, ry = rv.isleRY * 0.7;
  let ix = w2sX(cx), iy = w2sY(cy);
  let lv = rv.level;

  push(); noStroke();

  // Shallow water ring
  fill(pal.water[0], pal.water[1], pal.water[2], 60);
  ellipse(ix, iy, (rx + 30) * 2, (ry + 20) * 2);

  // Island base
  fill(pal.terrainDark[0], pal.terrainDark[1], pal.terrainDark[2]);
  ellipse(ix, iy + 4, rx * 2 + 6, ry * 2 + 4);
  fill(pal.terrain[0], pal.terrain[1], pal.terrain[2]);
  ellipse(ix, iy, rx * 2, ry * 2);

  // Rim highlight
  fill(pal.terrainRim[0], pal.terrainRim[1], pal.terrainRim[2], 100);
  ellipse(ix, iy - ry * 0.15, rx * 1.7, ry * 1.2);

  // Beach sand along southern edge
  fill(pal.sand[0], pal.sand[1], pal.sand[2], 150);
  arc(ix, iy, rx * 1.8, ry * 1.6, 0.3, PI - 0.3);

  // Faction-specific terrain details
  if (key === 'carthage') {
    // Desert texture — scattered sand patches (deterministic positions)
    for (let i = 0; i < 8; i++) {
      let sx = ix + sin(i * 2.7 + 0.5) * rx * 0.45, sy = iy + cos(i * 1.9 + 1.2) * ry * 0.25;
      fill(225, 205, 155, 40); ellipse(sx, sy, 25 + (i % 3) * 10, 12 + (i % 2) * 8);
    }
  } else if (key === 'egypt') {
    // Golden shimmer patches (use sin for subtle animation, deterministic base)
    for (let i = 0; i < 6; i++) {
      let sx = ix + sin(i * 3.1 + 0.8) * rx * 0.35, sy = iy + cos(i * 2.3 + 0.4) * ry * 0.25;
      fill(255, 220, 80, 20 + sin(frameCount * 0.02 + i) * 10); ellipse(sx, sy, 30 + (i % 3) * 6, 18 + (i % 2) * 5);
    }
    // Papyrus reeds along water edge (south)
    for (let i = 0; i < 5; i++) {
      let rpx = floor(ix - rx * 0.3 + i * rx * 0.15), rpy = floor(iy + ry * 0.75);
      fill(80, 130, 50); rect(rpx, rpy, 2, -12 - (i % 3) * 2);
      fill(100, 150, 60); ellipse(rpx + 1, rpy - 14, 6, 4);
    }
  } else if (key === 'greece') {
    // White marble paths
    fill(230, 228, 220, 80);
    rect(ix - 3, iy - ry * 0.5, 6, ry * 0.8); // north-south path
    rect(ix - rx * 0.3, iy - 3, rx * 0.6, 6); // east-west path
    // Olive groves (small clusters)
    for (let i = 0; i < 4; i++) {
      let gx = ix + (i % 2 === 0 ? -1 : 1) * rx * (0.25 + random(0.1));
      let gy = iy + (i < 2 ? -1 : 1) * ry * (0.15 + random(0.1));
      fill(90, 120, 60, 100); ellipse(gx, gy, 20, 14);
      fill(70, 100, 45, 120); ellipse(gx - 3, gy - 2, 14, 10);
    }
  }

  // Walls (level >= 3)
  if (ni.hasWalls) {
    let bannerCol = ni.bannerCol;
    stroke(bannerCol[0] * 0.5, bannerCol[1] * 0.5, bannerCol[2] * 0.5, 140);
    strokeWeight(2); noFill();
    ellipse(ix, iy - ry * 0.05, rx * 1.3, ry * 1.1);
    noStroke();
    // Towers at corners (level >= 5)
    if (ni.hasTowers) {
      let towerPositions = [
        { x: ix - rx * 0.6, y: iy - ry * 0.2 },
        { x: ix + rx * 0.6, y: iy - ry * 0.2 },
        { x: ix - rx * 0.5, y: iy + ry * 0.35 },
        { x: ix + rx * 0.5, y: iy + ry * 0.35 },
      ];
      for (let tp of towerPositions) {
        fill(bannerCol[0] * 0.4 + 80, bannerCol[1] * 0.4 + 60, bannerCol[2] * 0.4 + 40);
        rect(floor(tp.x) - 6, floor(tp.y) - 18, 12, 18, 1);
        fill(bannerCol[0] * 0.6, bannerCol[1] * 0.6, bannerCol[2] * 0.6);
        rect(floor(tp.x) - 7, floor(tp.y) - 20, 14, 4);
        // Crenellations
        for (let c = 0; c < 4; c++) {
          rect(floor(tp.x) - 7 + c * 4, floor(tp.y) - 23, 2, 3);
        }
      }
    }
  }

  // Trees — faction-specific types
  for (let t of ni.trees) {
    let tx = w2sX(t.x), ty = w2sY(t.y);
    let sz = t.size * 0.08; // scale for drawOneTree compat (nation trees are 8-16px, need ~1.0 scale)
    let nationSway = floor(sin(frameCount * 0.01 + t.x * 0.1) * 2);
    push(); translate(floor(tx), floor(ty)); noStroke();
    // Shadow
    fill(0, 0, 0, 25); ellipse(0, 2, t.size, 3);
    if (t.type === 'palm' || t.type === 'datepalm') {
      fill(pal.treeTrunk[0], pal.treeTrunk[1], pal.treeTrunk[2]); rect(-1, -t.size, 2, t.size);
      fill(pal.treeLeaf[0], pal.treeLeaf[1], pal.treeLeaf[2]);
      for (let f = 0; f < 6; f++) { let fa = (f / 6) * TWO_PI + sin(frameCount * 0.01) * 0.12; ellipse(floor(cos(fa) * t.size * 0.6 + nationSway * 0.3), floor(sin(fa) * t.size * 0.25 - t.size - 1), t.size * 0.45, t.size * 0.2); }
      if (t.type === 'datepalm') { fill(160, 100, 30, 140); rect(-1, -t.size - 1, 2, 2); }
    } else if (t.type === 'acacia') {
      fill(pal.treeTrunk[0], pal.treeTrunk[1], pal.treeTrunk[2]); rect(-1, -t.size * 0.6, 2, t.size * 0.6);
      fill(pal.treeLeaf[0], pal.treeLeaf[1], pal.treeLeaf[2]); rect(-t.size * 0.8 + nationSway, -t.size * 0.9, t.size * 1.6, t.size * 0.25);
      fill(pal.treeLeaf[0] + 15, pal.treeLeaf[1] + 15, pal.treeLeaf[2] + 10, 160); rect(-t.size * 0.65 + nationSway, -t.size, t.size * 1.3, t.size * 0.2);
    } else if (t.type === 'fig' || t.type === 'sycamore') {
      fill(pal.treeTrunk[0], pal.treeTrunk[1], pal.treeTrunk[2]); rect(-2, -t.size * 0.5, 4, t.size * 0.5);
      fill(pal.treeLeaf[0], pal.treeLeaf[1], pal.treeLeaf[2]); ellipse(nationSway * 0.3, -t.size * 0.8, t.size * 1.2, t.size * 0.8);
    } else if (t.type === 'papyrus') {
      fill(90, 120, 55); rect(-1, -t.size, 1, t.size); rect(0, -t.size * 0.85, 1, t.size * 0.85);
      fill(100, 140, 65); ellipse(nationSway * 0.2, -t.size - 2, t.size * 0.5, t.size * 0.2);
    } else if (t.type === 'olive') {
      fill(pal.treeTrunk[0], pal.treeTrunk[1], pal.treeTrunk[2]); rect(-2, -t.size * 0.6, 4, t.size * 0.6);
      fill(78, 98, 58); ellipse(nationSway * 0.3, -t.size * 0.8, t.size * 0.8, t.size * 0.6);
      fill(120, 145, 95, 100); ellipse(nationSway * 0.2, -t.size * 0.9, t.size * 0.5, t.size * 0.35);
    } else if (t.type === 'laurel') {
      fill(pal.treeTrunk[0], pal.treeTrunk[1], pal.treeTrunk[2]); rect(-1, -t.size * 0.6, 2, t.size * 0.6);
      fill(45, 85, 30); ellipse(nationSway * 0.3, -t.size * 0.85, t.size * 0.7, t.size * 0.7);
      fill(55, 100, 38, 180); ellipse(nationSway * 0.2, -t.size * 0.9, t.size * 0.55, t.size * 0.55);
    } else {
      // Default: oak/cypress/pine
      fill(pal.treeTrunk[0], pal.treeTrunk[1], pal.treeTrunk[2]); rect(-1, -t.size * 0.7, 2, t.size * 0.7);
      fill(pal.treeLeaf[0], pal.treeLeaf[1], pal.treeLeaf[2]);
      if (t.type === 'oak') { // cypress shape
        for (let li = 0; li < 4; li++) { let lw = (3 - abs(li - 1.5)) * t.size * 0.15; rect(floor(-lw + nationSway * (li / 4)), floor(-t.size * 0.7 - li * t.size * 0.22), floor(lw * 2), floor(t.size * 0.22)); }
      } else { // pine umbrella
        rect(-t.size * 0.6 + nationSway, -t.size - 2, t.size * 1.2, t.size * 0.25);
        rect(-t.size * 0.45 + nationSway, -t.size - 4, t.size * 0.9, t.size * 0.2);
      }
    }
    pop();
  }

  // Faction-specific scenery
  if (key === 'carthage') {
    // Market stalls
    for (let i = 0; i < 3; i++) {
      let mx = ix + (i - 1) * 35, my = iy + ry * 0.15;
      fill(180, 130, 70); rect(floor(mx) - 10, floor(my) - 12, 20, 12, 1);
      fill(pal.special1[0], pal.special1[1], pal.special1[2], 180);
      rect(floor(mx) - 12, floor(my) - 14, 24, 3); // awning
      fill(140, 100, 50, 100);
      for (let g = 0; g < 3; g++) rect(floor(mx) - 6 + g * 5, floor(my) - 8, 3, 4);
    }
    // Punic columns
    fill(pal.special2[0], pal.special2[1], pal.special2[2], 150);
    rect(floor(ix) - rx * 0.2 - 3, floor(iy) - ry * 0.4, 6, 25);
    rect(floor(ix) + rx * 0.2 - 3, floor(iy) - ry * 0.4, 6, 25);
    fill(pal.special2[0], pal.special2[1], pal.special2[2], 100);
    rect(floor(ix) - rx * 0.2 - 5, floor(iy) - ry * 0.4 - 3, 10, 3);
    rect(floor(ix) + rx * 0.2 - 5, floor(iy) - ry * 0.4 - 3, 10, 3);
    // Harbor ships
    for (let i = 0; i < min(3, floor(lv / 2) + 1); i++) {
      let hx = ix + (i - 1) * 30 + 5, hy = iy + ry * 0.75;
      fill(120, 80, 40); rect(floor(hx) - 8, floor(hy), 16, 4, 2);
      fill(160, 120, 60); rect(floor(hx), floor(hy) - 10, 2, 10);
      fill(240, 230, 210, 120); triangle(floor(hx) + 2, floor(hy) - 9, floor(hx) + 10, floor(hy) - 5, floor(hx) + 2, floor(hy) - 2);
    }
  } else if (key === 'egypt') {
    // Obelisks
    for (let i = 0; i < 2; i++) {
      let ox = ix + (i === 0 ? -1 : 1) * rx * 0.25, oy = iy - ry * 0.15;
      fill(pal.special1[0], pal.special1[1], pal.special1[2]);
      rect(floor(ox) - 3, floor(oy) - 28, 6, 28);
      fill(255, 230, 100); triangle(floor(ox), floor(oy) - 32, floor(ox) - 4, floor(oy) - 28, floor(ox) + 4, floor(oy) - 28);
    }
    // Sphinx
    fill(200, 175, 110);
    let spx = ix + rx * 0.3, spy = iy + ry * 0.2;
    rect(floor(spx) - 12, floor(spy) - 6, 24, 10, 2);
    fill(190, 165, 100);
    rect(floor(spx) - 4, floor(spy) - 14, 8, 10, 2);
    fill(60, 50, 40);
    ellipse(floor(spx) - 1, floor(spy) - 10, 2, 2);
    ellipse(floor(spx) + 3, floor(spy) - 10, 2, 2);
    // Pyramidal structure
    fill(220, 195, 120, 160);
    let prx = ix - rx * 0.35, pry = iy - ry * 0.1;
    triangle(floor(prx), floor(pry) - 30, floor(prx) - 22, floor(pry) + 8, floor(prx) + 22, floor(pry) + 8);
    fill(210, 185, 110, 100);
    triangle(floor(prx), floor(pry) - 30, floor(prx), floor(pry) + 8, floor(prx) + 22, floor(pry) + 8);
  } else if (key === 'greece') {
    // Amphitheater (semi-circle steps)
    let ax = ix + rx * 0.3, ay = iy + ry * 0.1;
    for (let s = 3; s >= 0; s--) {
      fill(220 - s * 10, 218 - s * 10, 210 - s * 10, 150);
      arc(floor(ax), floor(ay), (20 + s * 12), (12 + s * 8), PI, TWO_PI);
    }
    // Ionic columns flanking palace approach
    for (let i = 0; i < 4; i++) {
      let colX = ix - 25 + i * 17, colY = iy - ry * 0.15;
      fill(pal.special1[0], pal.special1[1], pal.special1[2], 200);
      rect(floor(colX) - 2, floor(colY) - 20, 4, 20);
      // Ionic capital — scroll
      fill(pal.special1[0], pal.special1[1], pal.special1[2], 240);
      rect(floor(colX) - 4, floor(colY) - 22, 8, 3);
      ellipse(floor(colX) - 3, floor(colY) - 22, 4, 4);
      ellipse(floor(colX) + 3, floor(colY) - 22, 4, 4);
    }
  }

  // Buildings
  for (let b of ni.buildings) {
    let bx = w2sX(b.x), by = w2sY(b.y);
    let s = ni.style;
    // Shadow
    fill(0, 0, 0, 25); ellipse(floor(bx), floor(by) + 3, b.w + 4, 6);
    // Wall
    fill(s.wall[0], s.wall[1], s.wall[2]);
    rect(floor(bx) - floor(b.w / 2), floor(by) - floor(b.h), b.w, b.h, 1);
    // Roof
    fill(s.roof[0], s.roof[1], s.roof[2]);
    if (s.roofType === 'pediment') {
      triangle(floor(bx), floor(by) - floor(b.h) - 8, floor(bx) - floor(b.w / 2) - 2, floor(by) - floor(b.h), floor(bx) + floor(b.w / 2) + 2, floor(by) - floor(b.h));
    } else if (s.roofType === 'flat') {
      rect(floor(bx) - floor(b.w / 2) - 1, floor(by) - floor(b.h) - 3, b.w + 2, 3);
    } else {
      rect(floor(bx) - floor(b.w / 2) - 2, floor(by) - floor(b.h) - 4, b.w + 4, 4);
      triangle(floor(bx) - floor(b.w / 2) - 2, floor(by) - floor(b.h) - 4, floor(bx) + floor(b.w / 2) + 2, floor(by) - floor(b.h) - 4, floor(bx), floor(by) - floor(b.h) - 10);
    }
    // Door
    fill(s.door[0], s.door[1], s.door[2]);
    rect(floor(bx) - 3, floor(by) - 8, 6, 8, 1);
    // Window
    fill(s.window[0], s.window[1], s.window[2], 160);
    rect(floor(bx) - floor(b.w / 4) - 2, floor(by) - floor(b.h * 0.6), 4, 4, 1);
    rect(floor(bx) + floor(b.w / 4) - 2, floor(by) - floor(b.h * 0.6), 4, 4, 1);
  }

  // Palace (center building, larger)
  let px = w2sX(ni.palace.x), py = w2sY(ni.palace.y);
  let pw = ni.palace.w, ph = ni.palace.h;
  let s = ni.style;
  let bannerCol = ni.bannerCol;
  // Palace shadow
  fill(0, 0, 0, 30); ellipse(floor(px), floor(py) + 4, pw + 10, 8);
  // Palace base
  fill(s.wall[0] + 10, s.wall[1] + 10, s.wall[2] + 10);
  rect(floor(px) - floor(pw / 2), floor(py) - floor(ph), pw, ph, 2);
  // Palace columns
  fill(s.column[0], s.column[1], s.column[2]);
  let numCols = 4 + floor(lv / 2);
  for (let c = 0; c < numCols; c++) {
    let colX = floor(px) - floor(pw / 2) + 4 + c * floor((pw - 8) / max(1, numCols - 1));
    rect(colX - 1, floor(py) - floor(ph) + 3, 3, ph - 3);
  }
  // Palace roof
  fill(s.roof[0], s.roof[1], s.roof[2]);
  if (s.roofType === 'pediment') {
    triangle(floor(px), floor(py) - floor(ph) - 14, floor(px) - floor(pw / 2) - 4, floor(py) - floor(ph), floor(px) + floor(pw / 2) + 4, floor(py) - floor(ph));
    fill(s.accent[0], s.accent[1], s.accent[2], 120);
    triangle(floor(px), floor(py) - floor(ph) - 11, floor(px) - floor(pw / 2) + 5, floor(py) - floor(ph) + 1, floor(px) + floor(pw / 2) - 5, floor(py) - floor(ph) + 1);
  } else {
    rect(floor(px) - floor(pw / 2) - 2, floor(py) - floor(ph) - 5, pw + 4, 5);
  }
  // Palace door
  fill(s.door[0], s.door[1], s.door[2]);
  rect(floor(px) - 5, floor(py) - 14, 10, 14, 2);
  fill(bannerCol[0], bannerCol[1], bannerCol[2], 160);
  rect(floor(px) - 4, floor(py) - 12, 8, 2);
  // Banner on palace
  fill(bannerCol[0], bannerCol[1], bannerCol[2]);
  rect(floor(px) - 1, floor(py) - floor(ph) - 22, 2, 18);
  rect(floor(px) + 1, floor(py) - floor(ph) - 22, 8, 6);
  fill(bannerCol[0] + 40, bannerCol[1] + 40, bannerCol[2] + 40);
  rect(floor(px) + 2, floor(py) - floor(ph) - 21, 6, 4);

  // Faction flora on nation island
  if (ni.flora) { for (let fl of ni.flora) drawOneFlora(fl); }

  // Dock area (south)
  let dx = w2sX(ni.dock.x), dy = w2sY(ni.dock.y);
  fill(120, 90, 50);
  rect(floor(dx) - 25, floor(dy), 50, 8, 1);
  rect(floor(dx) - 3, floor(dy) + 6, 6, 10);
  rect(floor(dx) - 20, floor(dy) + 6, 4, 8);
  rect(floor(dx) + 16, floor(dy) + 6, 4, 8);
  // Moored boat
  fill(140, 100, 55);
  rect(floor(dx) + 22, floor(dy) + 10, 14, 4, 2);
  fill(180, 160, 120);
  rect(floor(dx) + 28, floor(dy) + 2, 2, 8);

  pop();
}

function drawNationIslandEntities() {
  let key = state.visitingNation;
  if (!key) return;
  let ni = state.nationIsland;
  if (!ni) return;

  push(); noStroke();
  // NPCs
  for (let n of ni.npcs) {
    let sx = w2sX(n.x), sy = w2sY(n.y);
    if (sx < -20 || sx > width + 20 || sy < -20 || sy > height + 20) continue;
    push(); translate(floor(sx), floor(sy)); scale(n.facing, 1);
    // Shadow
    fill(0, 0, 0, 25); ellipse(0, 2, 12, 4);
    // Legs
    fill(60, 50, 40); rect(-3, 0, 2, 5); rect(1, 0, 2, 5);
    // Body (tunic in faction color)
    fill(n.col[0] * 0.6 + 100, n.col[1] * 0.6 + 100, n.col[2] * 0.6 + 100);
    rect(-4, -8, 8, 10, 1);
    // Sash
    fill(n.col[0], n.col[1], n.col[2]); rect(-4, -3, 8, 2);
    // Arms
    fill(160, 125, 90); rect(-6, -6, 2, 6); rect(4, -6, 2, 6);
    // Head
    fill(155, 120, 85); ellipse(0, -11, 7, 7);
    // Hair (dark)
    fill(50, 35, 25); arc(0, -13, 8, 5, PI, 0);
    pop();
  }

  // Faction wildlife on nation island
  if (ni.wildlife) { for (let w of ni.wildlife) drawOneFactionCreature(w); }

  // Army escort on nation island
  if (state.legia && state.legia.army && typeof drawEscortSoldier === 'function') {
    state.legia.army.filter(u => !u._assignedOfficer && u.x).slice(0, 20).forEach(u => drawEscortSoldier(u));
  }
  // Draw player
  drawPlayer();
  pop();
}

function drawNationIslandHUD() {
  let key = state.visitingNation;
  if (!key) return;
  let rv = state.nations[key];
  let ni = state.nationIsland;
  if (!rv || !ni) return;
  let name = getNationName(key);
  let bannerCol = ni.bannerCol;

  push();
  // Top banner bar
  fill(bannerCol[0], bannerCol[1], bannerCol[2], 50);
  noStroke(); rect(0, 0, width, 28);
  fill(bannerCol[0], bannerCol[1], bannerCol[2], 200);
  textSize(13); textAlign(CENTER, TOP);
  text(name + '  —  Level ' + rv.level, width / 2, 6);
  fill(220, 210, 180, 160); textSize(9);
  text(getNationStanceLabel(rv).toUpperCase() + '  |  Rep: ' + rv.reputation + '  |  Military: ' + rv.military, width / 2, 20);

  // Proximity prompts
  let p = state.player;
  let dPalace = dist(p.x, p.y, ni.palace.x, ni.palace.y);
  let dDock = dist(p.x, p.y, ni.dock.x, ni.dock.y);

  if (dPalace < 50) {
    fill(255, 255, 220, 200 + sin(frameCount * 0.08) * 40);
    textSize(12); textAlign(CENTER);
    text('[E] Enter Palace — Diplomacy', width / 2, height * 0.35);
  }
  if (dDock < 45) {
    fill(255, 255, 220, 200 + sin(frameCount * 0.08) * 40);
    textSize(12); textAlign(CENTER);
    text('[E] Board Ship — Sail Home', width / 2, height * 0.38);
  }

  // Simple health/gold display
  textAlign(LEFT, TOP);
  fill(220, 200, 160); textSize(10);
  text('HP: ' + p.hp + '/' + p.maxHp + '  Gold: ' + state.gold, 8, 32);

  pop();
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
  if (dDock < 45) {
    exitNationIsland();
    return true;
  }
  return false;
}

// ─── SEAMLESS NATION ISLAND RENDERING (V4.0) ─────────────────────────────
function drawActiveNationContent() {
  let key = state._activeNation;
  if (!key) return;
  let rv = state.nations[key];
  let ni = rv && rv._nationContent;
  if (!rv || !ni) return;
  let pal = getNationIslandPalette(key);
  push(); noStroke();
  // Palace
  let psx = w2sX(ni.palace.x), psy = w2sY(ni.palace.y);
  fill(pal.terrainDark[0], pal.terrainDark[1], pal.terrainDark[2]);
  rect(psx - ni.palace.w / 2, psy - ni.palace.h, ni.palace.w, ni.palace.h, 2);
  fill(pal.terrainRim[0], pal.terrainRim[1], pal.terrainRim[2]);
  rect(psx - ni.palace.w / 2 - 2, psy - ni.palace.h - 6, ni.palace.w + 4, 6);
  // Buildings
  for (let b of ni.buildings) {
    let bsx = w2sX(b.x), bsy = w2sY(b.y);
    fill(pal.terrain[0] * 0.8, pal.terrain[1] * 0.8, pal.terrain[2] * 0.8);
    rect(bsx - b.w / 2, bsy - b.h, b.w, b.h, 1);
  }
  // Trees
  for (let t of ni.trees) {
    let tsx = w2sX(t.x), tsy = w2sY(t.y);
    fill(60, 90, 40); ellipse(tsx, tsy - t.size, t.size * 1.2, t.size * 1.5);
    fill(80, 60, 40); rect(tsx - 1, tsy - 2, 2, 4);
  }
  // NPCs — role-based visuals
  let bannerCol = ni.bannerCol;
  for (let n of ni.npcs) {
    let sx = w2sX(n.x), sy = w2sY(n.y);
    if (sx < -20 || sx > width + 20 || sy < -20 || sy > height + 20) continue;
    fill(0, 0, 0, 25); ellipse(sx, sy + 2, 12, 4);
    if (n.role === 'soldier') {
      fill(bannerCol[0] * 0.4 + 60, bannerCol[1] * 0.4 + 60, bannerCol[2] * 0.4 + 60);
      rect(sx - 4, sy - 8, 8, 10, 1);
      fill(160, 160, 160); rect(sx + 3 * n.facing, sy - 10, 2, 12); // spear
    } else {
      fill(bannerCol[0] * 0.6 + 100, bannerCol[1] * 0.6 + 100, bannerCol[2] * 0.6 + 100);
      rect(sx - 4, sy - 8, 8, 10, 1);
    }
    fill(155, 120, 85); ellipse(sx, sy - 11, 7, 7);
    // Role props
    if (n.role === 'merchant' && n.idleTimer <= 0) { fill(180, 140, 60); rect(sx + 3 * n.facing, sy - 5, 4, 3); } // carrying goods
    if (n.role === 'farmer' && n.idleTimer > 0) { fill(100, 160, 60); ellipse(sx, sy - 2, 6, 3); } // harvesting
    if (n.role === 'priest' && n.idleTimer > 0) { fill(255, 255, 200, 40 + sin(frameCount * 0.1) * 20); ellipse(sx, sy - 14, 10, 10); } // prayer glow
  }
  // Construction scaffolding when recently built
  if (rv._lastBuildFrame && frameCount - rv._lastBuildFrame < 180 && ni.buildings.length > 0) {
    let lb = ni.buildings[ni.buildings.length - 1];
    let lbx = w2sX(lb.x), lby = w2sY(lb.y);
    let prog = (frameCount - rv._lastBuildFrame) / 180;
    stroke(120, 90, 50, 150 * (1 - prog)); noFill();
    rect(lbx - lb.w / 2 - 2, lby - lb.h - 2, lb.w + 4, lb.h + 4); // scaffolding
    noStroke();
    fill(180, 160, 120, 30 * (1 - prog)); // dust
    for (let di = 0; di < 3; di++) ellipse(lbx + sin(frameCount * 0.05 + di) * 8, lby - lb.h * prog, 5, 4);
  }
  // Wildlife
  if (ni.wildlife) { for (let w of ni.wildlife) drawOneFactionCreature(w); }
  // Flora
  if (ni.flora) { for (let f of ni.flora) { let fsx = w2sX(f.x), fsy = w2sY(f.y); fill(f.col[0], f.col[1], f.col[2], 140); ellipse(fsx, fsy, f.w, f.h); } }
  pop();
  // HUD: nation name bar + proximity prompts
  let name = getNationName(key);
  push();
  fill(bannerCol[0], bannerCol[1], bannerCol[2], 50); noStroke(); rect(0, 0, width, 28);
  fill(bannerCol[0], bannerCol[1], bannerCol[2], 200); textSize(13); textAlign(CENTER, TOP);
  text(name + '  —  Level ' + rv.level, width / 2, 6);
  let p = state.player;
  let dPalace = dist(p.x, p.y, ni.palace.x, ni.palace.y);
  if (dPalace < 50) { fill(255, 255, 220, 200 + sin(frameCount * 0.08) * 40); textSize(12); textAlign(CENTER); text('[E] Enter Palace — Diplomacy', width / 2, height * 0.35); }
  pop();
}

function updateActiveNationEntities(dt) {
  let key = state._activeNation;
  if (!key) return;
  let rv = state.nations[key];
  let ni = rv && rv._nationContent;
  if (!ni) return;
  for (let n of ni.npcs) {
    n.moveTimer -= dt;
    if (n.moveTimer <= 0) {
      // Walk toward a destination building, then pick a new one
      if (ni.buildings.length > 0) {
        n.destIdx = floor(random(ni.buildings.length));
        let dest = ni.buildings[n.destIdx];
        let dx = dest.x - n.x, dy = dest.y - n.y;
        let d = sqrt(dx * dx + dy * dy) || 1;
        let spd = n.role === 'soldier' ? 0.4 : 0.25;
        n.vx = (dx / d) * spd; n.vy = (dy / d) * spd;
      } else { n.vx = random(-0.3, 0.3); n.vy = random(-0.3, 0.3); }
      n.facing = n.vx > 0 ? 1 : -1; n.moveTimer = random(80, 250); n.idleTimer = random(40, 100);
    }
    if (n.idleTimer > 0) { n.idleTimer -= dt; } else { n.x += n.vx * dt; n.y += n.vy * dt; }
  }
  if (ni.wildlife) { for (let w of ni.wildlife) { w.timer -= dt; if (w.timer <= 0) { w.vx = (random() - 0.5) * w.speed * 2; w.vy = (random() - 0.5) * w.speed * 2; w.timer = random(80, 250); } w.x += w.vx * dt; w.y += w.vy * dt; } }
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
function drawRivalIsleDistant() { drawNationIslesDistant(); }
function openRivalDiplomacy() { openNationDiplomacy('carthage'); }
function closeRivalDiplomacy() { closeNationDiplomacy(); }
function drawRivalDiplomacyUI() { drawNationDiplomacyUI(); }
function handleRivalDiplomacyKey(k, kCode) { return handleNationDiplomacyKey(k, kCode); }
function updateRivalDaily() { /* replaced by updateNationsDaily */ }

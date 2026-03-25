// MARE NOSTRUM — Equipment, Shop & Military System
// ─── EQUIPMENT & SHOP ────────────────────────────────────────────────────

const WEAPONS = [
  { name: 'Gladius', dmg: 15, range: 0, cost: 0 },
  { name: 'Pilum', dmg: 20, range: 12, cost: 40 },
  { name: 'Flamma', dmg: 25, range: 0, cost: 80 },
];
const ARMORS = [
  { name: 'None', reduce: 0, cost: 0 },
  { name: 'Bronze', reduce: 3, cost: 30 },
  { name: 'Iron', reduce: 6, cost: 60 },
  { name: 'Steel', reduce: 10, cost: 100 },
];
const POTION_COST = 15; // gold
const POTION_HEAL = 40;

// ─── CHARACTER EQUIPMENT SYSTEM ──────────────────────────────────────────
let equipmentWindowOpen = false;
let _equipHoverSlot = null;

const EQUIP_SLOTS = {
  head:     { name: 'Head',    col: 0, row: 0 },
  chest:    { name: 'Chest',   col: 0, row: 1 },
  legs:     { name: 'Legs',    col: 0, row: 2 },
  feet:     { name: 'Feet',    col: 0, row: 3 },
  mainHand: { name: 'Weapon',  col: 1, row: 0 },
  offHand:  { name: 'Shield',  col: 1, row: 1 },
  tool:     { name: 'Tool',    col: 1, row: 2 },
  trinket:  { name: 'Trinket', col: 1, row: 3 },
};

const EQUIPMENT_DB = {
  gladius:     { slot: 'mainHand', name: 'Gladius',          atk: 5,  def: 0, spd: 0, icon: 'sword',   price: 0,   faction: 'rome' },
  pilum:       { slot: 'mainHand', name: 'Pilum',            atk: 7,  def: 0, spd: 0, icon: 'spear',   price: 40,  faction: null },
  flamma:      { slot: 'mainHand', name: 'Flamma',           atk: 10, def: 0, spd: 0, icon: 'flame',   price: 80,  faction: null },
  khopesh:     { slot: 'mainHand', name: 'Khopesh',          atk: 6,  def: 0, spd: 0, icon: 'curved',  price: 0,   faction: 'egypt' },
  xiphos:      { slot: 'mainHand', name: 'Xiphos',           atk: 5,  def: 1, spd: 0, icon: 'short',   price: 0,   faction: 'greece' },
  falcata:     { slot: 'mainHand', name: 'Falcata',          atk: 7,  def: 0, spd: 1, icon: 'curved',  price: 0,   faction: 'carthage' },
  raider_axe:  { slot: 'mainHand', name: 'Raider Axe',       atk: 8,  def: 0, spd: 0, icon: 'axe',     price: 0,   faction: 'seapeople' },
  acinaces:    { slot: 'mainHand', name: 'Acinaces',         atk: 5,  def: 0, spd: 2, icon: 'short',   price: 0,   faction: 'persia' },
  navaja:      { slot: 'mainHand', name: 'Navaja',           atk: 4,  def: 0, spd: 3, icon: 'short',   price: 0,   faction: 'phoenicia' },
  long_sword:  { slot: 'mainHand', name: 'Long Sword',       atk: 6,  def: 0, spd: -1, icon: 'long',   price: 0,   faction: 'gaul' },
  trident:     { slot: 'mainHand', name: 'Neptune Trident',  atk: 12, def: 2, spd: 0, icon: 'spear',   price: 120, faction: null },
  galea:       { slot: 'head', name: 'Galea',               atk: 0, def: 2, spd: 0,  icon: 'roman',   price: 0,   faction: 'rome' },
  corinthian:  { slot: 'head', name: 'Corinthian Helm',     atk: 0, def: 3, spd: -1, icon: 'greek',   price: 0,   faction: 'greece' },
  nemes:       { slot: 'head', name: 'Nemes Headdress',     atk: 0, def: 1, spd: 0,  icon: 'cloth',   price: 0,   faction: 'egypt' },
  punic_helm:  { slot: 'head', name: 'Punic Helm',          atk: 0, def: 2, spd: 0,  icon: 'round',   price: 0,   faction: 'carthage' },
  horned_helm: { slot: 'head', name: 'Horned Helm',         atk: 1, def: 2, spd: 0,  icon: 'horned',  price: 0,   faction: 'seapeople' },
  tiara:       { slot: 'head', name: 'Persian Tiara',       atk: 0, def: 1, spd: 1,  icon: 'cloth',   price: 0,   faction: 'persia' },
  phoen_cap:   { slot: 'head', name: 'Sailor Cap',          atk: 0, def: 1, spd: 1,  icon: 'cloth',   price: 0,   faction: 'phoenicia' },
  gallic_helm: { slot: 'head', name: 'Gallic Helm',         atk: 0, def: 3, spd: 0,  icon: 'winged',  price: 0,   faction: 'gaul' },
  centurion_crest: { slot: 'head', name: 'Centurion Crest', atk: 1, def: 4, spd: 0,  icon: 'roman',   price: 60,  faction: null },
  laurel:      { slot: 'head', name: 'Golden Laurel',       atk: 2, def: 1, spd: 1,  icon: 'crown',   price: 100, faction: null },
  lorica:      { slot: 'chest', name: 'Lorica Segmentata',  atk: 0, def: 5, spd: -1, icon: 'heavy',   price: 0,   faction: 'rome' },
  linen_armor: { slot: 'chest', name: 'Linen Cuirass',      atk: 0, def: 3, spd: 0,  icon: 'light',   price: 0,   faction: 'greece' },
  scale_mail:  { slot: 'chest', name: 'Scale Mail',         atk: 0, def: 4, spd: 0,  icon: 'medium',  price: 0,   faction: 'egypt' },
  punic_plate: { slot: 'chest', name: 'Punic Plate',        atk: 0, def: 4, spd: 0,  icon: 'medium',  price: 0,   faction: 'carthage' },
  raider_hide: { slot: 'chest', name: 'Raider Hide',        atk: 1, def: 3, spd: 0,  icon: 'light',   price: 0,   faction: 'seapeople' },
  persian_robe:{ slot: 'chest', name: 'Persian Robe',       atk: 0, def: 2, spd: 2,  icon: 'light',   price: 0,   faction: 'persia' },
  phoen_vest:  { slot: 'chest', name: 'Merchant Vest',      atk: 0, def: 2, spd: 1,  icon: 'light',   price: 0,   faction: 'phoenicia' },
  chainmail:   { slot: 'chest', name: 'Gallic Chainmail',   atk: 0, def: 4, spd: -1, icon: 'medium',  price: 0,   faction: 'gaul' },
  imperial_plate: { slot: 'chest', name: 'Imperial Plate',  atk: 1, def: 7, spd: -2, icon: 'heavy',   price: 100, faction: null },
  greaves:     { slot: 'legs', name: 'Bronze Greaves',      atk: 0, def: 2, spd: 0,  icon: 'metal',   price: 25,  faction: null },
  iron_greaves:{ slot: 'legs', name: 'Iron Greaves',        atk: 0, def: 3, spd: 0,  icon: 'metal',   price: 50,  faction: null },
  linen_skirt: { slot: 'legs', name: 'Linen Skirt',         atk: 0, def: 1, spd: 1,  icon: 'cloth',   price: 15,  faction: null },
  caligae:     { slot: 'feet', name: 'Caligae',             atk: 0, def: 0, spd: 1,  icon: 'sandal',  price: 15,  faction: null },
  war_boots:   { slot: 'feet', name: 'War Boots',           atk: 0, def: 1, spd: 2,  icon: 'boot',    price: 40,  faction: null },
  mercury_sandals: { slot: 'feet', name: 'Mercury Sandals', atk: 0, def: 0, spd: 4,  icon: 'winged',  price: 80,  faction: null },
  scutum:      { slot: 'offHand', name: 'Scutum',           atk: 0, def: 4, spd: -1, icon: 'tower',   price: 0,   faction: 'rome' },
  aspis:       { slot: 'offHand', name: 'Aspis',            atk: 0, def: 3, spd: 0,  icon: 'round',   price: 0,   faction: 'greece' },
  buckler:     { slot: 'offHand', name: 'Buckler',          atk: 0, def: 2, spd: 1,  icon: 'small',   price: 20,  faction: null },
  iron_shield: { slot: 'offHand', name: 'Iron Shield',      atk: 0, def: 5, spd: -1, icon: 'kite',    price: 60,  faction: null },
  lantern_oh:  { slot: 'offHand', name: 'Lantern',          atk: 0, def: 0, spd: 0,  icon: 'lantern', price: 35,  faction: null },
  sickle_eq:   { slot: 'tool', name: 'Bronze Sickle',      atk: 2, def: 0, spd: 0,  icon: 'sickle',  price: 15,  faction: null },
  iron_pick:   { slot: 'tool', name: 'Iron Pickaxe',       atk: 3, def: 0, spd: 0,  icon: 'pick',    price: 30,  faction: null },
  fishing_rod: { slot: 'tool', name: 'Fishing Rod',        atk: 1, def: 0, spd: 0,  icon: 'rod',     price: 20,  faction: null },
  eagle_amulet:{ slot: 'trinket', name: 'Eagle Amulet',    atk: 2, def: 1, spd: 0,  icon: 'amulet',  price: 0,   faction: 'rome' },
  ankh:        { slot: 'trinket', name: 'Ankh Charm',      atk: 0, def: 0, spd: 1,  icon: 'ankh',    price: 0,   faction: 'egypt' },
  olive_wreath:{ slot: 'trinket', name: 'Olive Wreath',    atk: 1, def: 1, spd: 1,  icon: 'wreath',  price: 0,   faction: 'greece' },
  punic_coin:  { slot: 'trinket', name: 'Punic Coin',      atk: 0, def: 2, spd: 0,  icon: 'coin',    price: 0,   faction: 'carthage' },
  sea_shell:   { slot: 'trinket', name: 'Storm Shell',     atk: 2, def: 0, spd: 1,  icon: 'shell',   price: 0,   faction: 'seapeople' },
  royal_seal:  { slot: 'trinket', name: 'Royal Seal',      atk: 1, def: 1, spd: 1,  icon: 'seal',    price: 0,   faction: 'persia' },
  star_map:    { slot: 'trinket', name: 'Star Map',         atk: 0, def: 0, spd: 3,  icon: 'scroll',  price: 0,   faction: 'phoenicia' },
  torque:      { slot: 'trinket', name: 'Golden Torque',    atk: 3, def: 0, spd: 0,  icon: 'torque',  price: 0,   faction: 'gaul' },
  mars_ring:   { slot: 'trinket', name: 'Ring of Mars',    atk: 4, def: 2, spd: 0,  icon: 'ring',    price: 80,  faction: null },
  hermes_charm:{ slot: 'trinket', name: 'Hermes Charm',    atk: 0, def: 0, spd: 5,  icon: 'feather', price: 60,  faction: null },
};

const FACTION_STARTER_GEAR = {
  rome:      { head: 'galea', chest: 'lorica', mainHand: 'gladius', offHand: 'scutum', trinket: 'eagle_amulet' },
  carthage:  { head: 'punic_helm', chest: 'punic_plate', mainHand: 'falcata', trinket: 'punic_coin' },
  egypt:     { head: 'nemes', chest: 'scale_mail', mainHand: 'khopesh', trinket: 'ankh' },
  greece:    { head: 'corinthian', chest: 'linen_armor', mainHand: 'xiphos', offHand: 'aspis', trinket: 'olive_wreath' },
  seapeople: { head: 'horned_helm', chest: 'raider_hide', mainHand: 'raider_axe', trinket: 'sea_shell' },
  persia:    { head: 'tiara', chest: 'persian_robe', mainHand: 'acinaces', trinket: 'royal_seal' },
  phoenicia: { head: 'phoen_cap', chest: 'phoen_vest', mainHand: 'navaja', trinket: 'star_map' },
  gaul:      { head: 'gallic_helm', chest: 'chainmail', mainHand: 'long_sword', trinket: 'torque' },
};

function getEquipBonus(stat) {
  if (!state || !state.equipment) return 0;
  var total = 0;
  for (var slot in state.equipment) {
    var itemId = state.equipment[slot];
    if (itemId && EQUIPMENT_DB[itemId]) total += (EQUIPMENT_DB[itemId][stat] || 0);
  }
  return total;
}

function equipItem(itemId) {
  if (!EQUIPMENT_DB[itemId]) return false;
  var item = EQUIPMENT_DB[itemId];
  if (!state.equipment) state.equipment = { head: null, chest: null, legs: null, feet: null, mainHand: null, offHand: null, tool: null, trinket: null };
  state.equipment[item.slot] = itemId;
  return true;
}

function unequipSlot(slot) {
  if (!state.equipment) return;
  state.equipment[slot] = null;
}

function buyEquipment(itemId) {
  var item = EQUIPMENT_DB[itemId];
  if (!item || item.price <= 0) return false;
  if (state.gold < item.price) return false;
  state.gold -= item.price;
  equipItem(itemId);
  addFloatingText(width / 2, height * 0.3, item.name + ' equipped!', '#ffcc44');
  if (snd) snd.playSFX('purchase');
  return true;
}
const HOTBAR_ITEMS = [
  { name: 'Sickle', icon: 'sickle', desc: 'Harvest crops', key: '1' },
  { name: 'Axe',    icon: 'axe',    desc: 'Chop trees',    key: '2' },
  { name: 'Pick',   icon: 'pick',   desc: 'Mine stone',    key: '3' },
  { name: 'Rod',    icon: 'rod',    desc: 'Fish',          key: '4' },
  { name: 'Weapon', icon: 'weapon', desc: 'Fight enemies', key: '5' },
  { name: 'Potion', icon: 'potion', desc: 'Heal (Q)',      key: '6' },
  { name: 'Stew',   icon: 'stew',   desc: 'Heal 30 HP',   key: '7' },
  { name: 'Meal',   icon: 'meal',   desc: 'Gift to NPC',   key: '8' },
  { name: 'Wine',   icon: 'wine',   desc: 'Gift (2 hearts)', key: '9' },
  { name: 'Ambrosia', icon: 'ambrosia', desc: 'Full heal', key: '0' },
];

function usePotion() {
  let p = state.player;
  if (p.potions <= 0 || p.hp >= p.maxHp) return;
  p.potions--;
  p.hp = min(p.maxHp, p.hp + POTION_HEAL);
  addFloatingText(w2sX(p.x), w2sY(p.y) - 25, '+' + POTION_HEAL + ' HP', '#44dd44');
  spawnParticles(p.x, p.y, 'harvest', 5);
}

function useStew() {
  let p = state.player;
  if (state.stew <= 0 || p.hp >= p.maxHp) return;
  state.stew--;
  p.hp = min(p.maxHp, p.hp + 30);
  addFloatingText(w2sX(p.x), w2sY(p.y) - 25, '+30 HP (Stew)', '#cc8844');
  spawnParticles(p.x, p.y, 'harvest', 5);
  if (snd) snd.playSFX('ding');
}

function useGarum() {
  if (state.garum <= 0) return;
  state.garum--;
  state.gold += 25;
  addFloatingText(width / 2, height * 0.35, '+25g from Garum trade', '#ddcc44');
  if (snd) snd.playSFX('ding');
}

function useHoneyedFigs() {
  if (state.honeyedFigs <= 0) return;
  state.honeyedFigs--;
  state.player.xpBoost = (state.player.xpBoost || 0) + 1;
  state.player.xpBoostTimer = 8000; // 1 game day (1440 game-min / 0.18 per frame = 8000 frames)
  addFloatingText(width / 2, height * 0.35, 'XP +15% for 1 day!', '#ffaa44');
  spawnParticles(state.player.x, state.player.y, 'divine', 5);
  if (snd) snd.playSFX('skill_unlock');
}

function useAmbrosia() {
  let p = state.player;
  if (state.ambrosia <= 0) return;
  state.ambrosia--;
  p.hp = p.maxHp;
  p.invincTimer = max(p.invincTimer, 300); // 5 seconds invuln
  addFloatingText(w2sX(p.x), w2sY(p.y) - 25, 'AMBROSIA! Full heal + invulnerable!', '#ffd700');
  spawnParticles(p.x, p.y, 'divine', 15);
  if (snd) snd.playSFX('fanfare');
}

function buyWeapon(tier) {
  let w = WEAPONS[tier];
  if (!w || state.gold < w.cost || state.player.weapon >= tier) return false;
  state.gold = max(0, state.gold - w.cost);
  state.player.weapon = tier;
  addFloatingText(width / 2, height * 0.3, w.name + ' acquired!', '#ffcc44');
  if (snd) snd.playSFX('purchase');
  return true;
}

function buyArmor(tier) {
  let a = ARMORS[tier];
  if (!a || state.gold < a.cost || state.player.armor >= tier) return false;
  state.gold = max(0, state.gold - a.cost);
  state.player.armor = tier;
  addFloatingText(width / 2, height * 0.3, a.name + ' Armor!', '#aaccff');
  if (snd) snd.playSFX('purchase');
  return true;
}

function buyPotion() {
  if (state.gold < POTION_COST) return false;
  state.gold = max(0, state.gold - POTION_COST);
  state.player.potions++;
  return true;
}



// ─── LEGIA MILITARY SYSTEM ───────────────────────────────────────────────

function updateLegia(dt) {
  let lg = state.legia;
  if (!lg) return;
  if (lg.trainingQueue > 0 && lg.trainingTimer > 0) {
    lg.trainingTimer -= dt;
    if (lg.trainingTimer <= 0) {
      lg.recruits = min(lg.recruits + 1, lg.maxRecruits + (typeof getFactionData === 'function' && getFactionData() ? getFactionData().recruitBonus || 0 : 0));
      lg.trainingQueue--;
      lg.trainingTimer = lg.trainingQueue > 0 ? 300 : 0;
      addFloatingText(w2sX(lg.castrumX), w2sY(lg.castrumY) - 30, (typeof getFactionTerms === 'function' ? getFactionTerms().soldier : 'Soldier') + ' Ready!', '#cc4444');
      // Spawn ambient soldier entity near castrum
      let cx = lg.castrumX, cy = lg.castrumY;
      let soldierMaxHP = 60 + (state.expeditionUpgrades ? state.expeditionUpgrades.soldierHP : 0) * 20;
      lg.soldiers.push({
        x: cx + random(-30, 30), y: cy + random(-20, 20),
        hp: soldierMaxHP, maxHp: soldierMaxHP,
        facing: random() > 0.5 ? 1 : -1,
        state: 'patrol',
        patrolTimer: floor(random(60, 200)),
        targetX: cx, targetY: cy,
      });
    }
  }
}

function handleLegiaKey(k) {
  let lg = state.legia;
  if (!lg || lg.castrumLevel < 1) return false;
  // [1] Train legionary
  if (k === '1') {
    if (typeof trainUnit === 'function') {
      trainUnit('legionary');
    } else {
      if (state.gold < 20) { addFloatingText(width / 2, height * 0.3, 'Need 20 gold', '#ff6644'); return true; }
      if (state.meals < 1) { addFloatingText(width / 2, height * 0.3, 'Need 1 meal', '#ff6644'); return true; }
      var _rb = (typeof getFactionData === 'function' && getFactionData()) ? getFactionData().recruitBonus || 0 : 0;
      if (lg.recruits + lg.trainingQueue >= lg.maxRecruits + _rb) { addFloatingText(width / 2, height * 0.3, (typeof getFactionTerms === 'function' ? getFactionTerms().army : 'Army') + ' at capacity!', '#ff6644'); return true; }
      state.gold = max(0, state.gold - 20); state.meals = max(0, state.meals - 1);
      lg.trainingQueue++; if (lg.trainingTimer <= 0) lg.trainingTimer = 300;
      addFloatingText(width / 2, height * 0.3, 'Training ' + getFactionTerms().soldier.toLowerCase() + '...', '#cc8844');
    }
    return true;
  }
  // [2] Upgrade castrum
  if (k === '2') {
    if (lg.castrumLevel >= 5) { addFloatingText(width / 2, height * 0.3, getFactionTerms().barracks + ' at max level!', '#aaaaaa'); return true; }
    let nextLv = lg.castrumLevel + 1;
    let lvData = (typeof CASTRUM_LEVELS !== 'undefined') ? CASTRUM_LEVELS[nextLv] : null;
    if (lvData && lvData.cost) {
      let c = lvData.cost;
      if (state.gold < (c.gold || 0)) { addFloatingText(width / 2, height * 0.3, 'Need ' + c.gold + ' gold', '#ff6644'); return true; }
      if (state.stone < (c.stone || 0)) { addFloatingText(width / 2, height * 0.3, 'Need ' + c.stone + ' stone', '#ff6644'); return true; }
      if (state.ironOre < (c.ironOre || 0)) { addFloatingText(width / 2, height * 0.3, 'Need ' + c.ironOre + ' iron', '#ff6644'); return true; }
      if ((c.crystals || 0) > 0 && state.crystals < c.crystals) { addFloatingText(width / 2, height * 0.3, 'Need ' + c.crystals + ' crystals', '#ff6644'); return true; }
      state.gold = max(0, state.gold - (c.gold || 0)); state.stone = max(0, state.stone - (c.stone || 0)); state.ironOre = max(0, state.ironOre - (c.ironOre || 0)); state.crystals = max(0, state.crystals - (c.crystals || 0));
      lg.castrumLevel = nextLv;
      lg.maxRecruits = lvData.maxSoldiers;
      addFloatingText(width / 2, height * 0.3, getFactionTerms().barracks + ' upgraded to ' + getCastrumLevelName(nextLv) + '!', '#cc8844');
      if (typeof snd !== 'undefined' && snd) snd.playSFX('upgrade');
    } else {
      // Fallback for levels without CASTRUM_LEVELS data
      addFloatingText(width / 2, height * 0.3, getFactionTerms().barracks + ' at max level', '#aaaaaa');
    }
    return true;
  }
  // [3] Train archer (level 2+)
  if (k === '3' && typeof trainUnit === 'function') { trainUnit('archer'); return true; }
  // [4] Train cavalry (level 3+)
  if (k === '4' && typeof trainUnit === 'function') { trainUnit('cavalry'); return true; }
  // [5] Train siege ram (level 4+)
  if (k === '5' && typeof trainUnit === 'function') { trainUnit('siege_ram'); return true; }
  // [6] Train centurion (level 5+)
  if (k === '6' && typeof trainUnit === 'function') { trainUnit('centurion'); return true; }
  // [G] Cycle formation
  if (k === 'g' || k === 'G') {
    if (typeof cycleFormation === 'function') cycleFormation();
    return true;
  }
  return false;
}


function drawLegionPatrol() {
  let lg = state.legia;
  if (!lg || lg.castrumLevel < 1 || lg.recruits < 1) return;
  // Skip orbital circles if ambient soldier entities exist (they're drawn in Y-sorted pass)
  if ((lg.soldiers && lg.soldiers.length > 0) || (typeof getPatrolSoldiers === 'function' && getPatrolSoldiers().length > 0)) return;
  let cx = lg.castrumX, cy = lg.castrumY;
  let count = min(lg.recruits, 6);
  let t = frameCount * 0.018;
  for (let i = 0; i < count; i++) {
    let a = t + (i / count) * TWO_PI;
    let r = 30 + i * 4;
    let sx = w2sX(cx + cos(a) * r);
    let sy = w2sY(cy + sin(a) * r);
    if (sx < -20 || sx > width + 20 || sy < -20 || sy > height + 20) continue;
    push();
    translate(sx, sy + floatOffset);
    let _m = getFactionMilitary();
    // Body — faction tunic
    fill(_m.tunic[0], _m.tunic[1], _m.tunic[2]); noStroke();
    rect(-4, -6, 8, 8);
    // Helmet — faction
    fill(_m.helm[0], _m.helm[1], _m.helm[2]);
    ellipse(0, -8, 8, 6);
    rect(-4, -10, 8, 4);
    // Shield — faction
    fill(_m.shield[0], _m.shield[1], _m.shield[2]); stroke(_m.shield[0]*0.6, _m.shield[1]*0.6, _m.shield[2]*0.6); strokeWeight(1);
    if (_m.shieldShape === 'round') ellipse(-5, -1, 7, 7);
    else rect(-7, -5, 4, 8, 1);
    // Legs
    fill(_m.legs[0], _m.legs[1], _m.legs[2]); noStroke();
    rect(-4, 2, 3, 5);
    rect(1, 2, 3, 5);
    pop();
  }
  // [E] prompt when player near gate (south side of castrum)
  let px = state.player.x, py2 = state.player.y;
  let gateY = cy + 50;
  if (dist(px, py2, cx, gateY) < 40) {
    push();
    fill(255, 255, 255, 200); noStroke();
    textAlign(CENTER, CENTER); textSize(10);
    text('[E] Enter ' + getFactionTerms().barracks, w2sX(cx), w2sY(gateY) - 20 + floatOffset);
    pop();
  }
}

// Derive patrol soldiers from army[] garrison units instead of separate soldiers[]
function getPatrolSoldiers() {
  if (!state.legia || !state.legia.army) return [];
  let cx = state.legia.castrumX || WORLD.islandCX + 200;
  let cy = state.legia.castrumY || WORLD.islandCY + 100;
  return state.legia.army.filter(u => u.garrison).map(u => {
    // Lazily init patrol properties on garrison army units
    if (u._patrolX === undefined) {
      u._patrolX = cx + (Math.random() - 0.5) * 60;
      u._patrolY = cy + (Math.random() - 0.5) * 40;
      u._patrolTimer = Math.floor(Math.random() * 140 + 60);
      u._patrolState = 'patrol';
      if (!u.x || u.x === 0) u.x = cx + (Math.random() - 0.5) * 60;
      if (!u.y || u.y === 0) u.y = cy + (Math.random() - 0.5) * 40;
      u.facing = Math.random() > 0.5 ? 1 : -1;
    }
    return u;
  });
}


function updateLegionAmbient(dt) {
  if (!state.legia) return;
  let cx = state.legia.castrumX || WORLD.islandCX + 200;
  let cy = state.legia.castrumY || WORLD.islandCY + 100;
  let patrol = getPatrolSoldiers();
  // Also update legacy soldiers[] if any remain (migration compat)
  let legacy = (state.legia.soldiers || []);
  let all = patrol.concat(legacy);
  all.forEach(s => {
    let timer = s._patrolTimer !== undefined ? '_patrolTimer' : 'patrolTimer';
    let pstate = s._patrolState !== undefined ? '_patrolState' : 'state';
    let tx = s._patrolX !== undefined ? '_patrolX' : 'targetX';
    let ty = s._patrolY !== undefined ? '_patrolY' : 'targetY';
    s[timer] -= dt;
    if (s[pstate] === 'idle' && s[timer] <= 0) {
      s[tx] = cx + random(-50, 50);
      s[ty] = cy + random(-30, 30);
      s[pstate] = 'patrol';
      s[timer] = floor(random(120, 300));
    } else if (s[pstate] === 'patrol') {
      let dx = (s[tx] || cx) - s.x, dy = (s[ty] || cy) - s.y;
      let d = sqrt(dx * dx + dy * dy);
      if (d < 5 || s[timer] <= 0) {
        s[pstate] = 'idle';
        s[timer] = floor(random(60, 200));
      } else {
        s.x += (dx / d) * 1.2 * dt;
        s.y += (dy / d) * 0.8 * dt;
        s.facing = dx > 0 ? 1 : -1;
      }
    }
  });
}

function drawLegionAmbientSoldier(s) {
  let sx = w2sX(s.x), sy = w2sY(s.y);
  if (sx < -30 || sx > width + 30 || sy < -30 || sy > height + 30) return;
  let mil = getFactionMilitary();
  push();
  translate(sx, sy + floatOffset);
  scale(s.facing, 1);
  noStroke();
  // Shadow
  fill(0, 0, 0, 30);
  ellipse(0, 2, 10, 4);
  // Body — faction tunic
  fill(mil.tunic[0], mil.tunic[1], mil.tunic[2]);
  rect(-3, -8, 6, 10);
  // Armor plate
  fill(mil.armor[0], mil.armor[1], mil.armor[2]);
  rect(-3, -7, 6, 4);
  // Head
  fill(195, 165, 130);
  rect(-2, -12, 4, 4);
  // Helmet — faction
  fill(mil.helm[0], mil.helm[1], mil.helm[2]);
  rect(-3, -13, 6, 3);
  // Spear
  stroke(100, 80, 60);
  strokeWeight(1);
  line(3, -16, 3, 4);
  noStroke();
  // Shield — faction
  fill(mil.shield[0], mil.shield[1], mil.shield[2]);
  if (mil.shieldShape === 'round') ellipse(-4, -3, 5, 5);
  else rect(-5, -6, 2, 6);
  // Walking animation — faction leg color
  if (s.state === 'patrol') {
    let step = sin(frameCount * 0.12 + s.x) * 2;
    fill(mil.legs[0], mil.legs[1], mil.legs[2]);
    rect(-2, 2, 2, 3);
    rect(0 + step * 0.3, 2, 2, 3);
  } else {
    fill(mil.legs[0], mil.legs[1], mil.legs[2]);
    rect(-2, 2, 2, 3);
    rect(1, 2, 2, 3);
  }
  pop();
}


// MARE NOSTRUM — Cozy Roman Survival-Crafting v2
// Camera-based rendering, expandable island, blueprint building system
// p5.js sketch
if (typeof p5 !== 'undefined') p5.disableFriendlyErrors = true;

// ─── ACCESSIBILITY SETTINGS (localStorage-persisted) ─────────────────────
const _SETTINGS_KEY = 'mare_nostrum_settings';
const DEFAULT_KEYBINDS = {
  moveUp: 'W', moveDown: 'S', moveLeft: 'A', moveRight: 'D',
  interact: 'E', sprint: 'SHIFT', dodge: 'ALT',
  buildMode: 'B', demolish: 'X', rotate: 'R',
  inventory: 'I', map: 'M', recipeBook: 'G', legia: 'L', fish: 'F', debug: '`'
};
const KEYBIND_LABELS = {
  moveUp: 'Move Up', moveDown: 'Move Down', moveLeft: 'Move Left', moveRight: 'Move Right',
  interact: 'Interact', sprint: 'Sprint', dodge: 'Dodge',
  buildMode: 'Build Mode', demolish: 'Demolish', rotate: 'Rotate',
  inventory: 'Inventory', map: 'Map', recipeBook: 'Recipe Book', legia: 'Legion', fish: 'Fish', debug: 'Debug'
};
let gameSettings = { screenShake: true, fontScale: 1, lastSaveTime: 0, musicSource: 'recorded', keybinds: {} };
let _rebindingAction = null;
let _keybindScrollOffset = 0;
function _loadSettings() {
  try {
    let d = JSON.parse(localStorage.getItem(_SETTINGS_KEY));
    if (d) {
      if (d.screenShake !== undefined) gameSettings.screenShake = d.screenShake;
      if (d.fontScale !== undefined) gameSettings.fontScale = d.fontScale;
      if (d.lastSaveTime !== undefined) gameSettings.lastSaveTime = d.lastSaveTime;
      if (d.musicSource !== undefined) gameSettings.musicSource = d.musicSource;
      if (d.keybinds) gameSettings.keybinds = d.keybinds;
    }
  } catch(e) {}
}
function _saveSettings() {
  try { localStorage.setItem(_SETTINGS_KEY, JSON.stringify(gameSettings)); } catch(e) {}
}
function getKeybind(action) {
  return gameSettings.keybinds[action] || DEFAULT_KEYBINDS[action] || '';
}
function keyMatchesAction(action, k, kc) {
  let bound = getKeybind(action).toUpperCase();
  if (bound === 'SHIFT') return kc === 16;
  if (bound === 'ALT') return kc === 18;
  if (bound === 'TAB') return kc === 9;
  if (bound === 'ENTER') return kc === 13;
  if (bound === 'ESCAPE') return kc === 27;
  if (bound === '`') return k === '`';
  return k === bound || k === bound.toLowerCase();
}
function isKeybindDown(action) {
  let bound = getKeybind(action).toUpperCase();
  if (bound === 'SHIFT') return keyIsDown(16);
  if (bound === 'ALT') return keyIsDown(18);
  return keyIsDown(bound.charCodeAt(0));
}
_loadSettings();

// ─── GLOBAL TEXT READABILITY — enforce minimum size + dark outlines ──────
const MIN_TEXT_SIZE = 10;
// Override textSize safely for both p5.js and q5.js
try {
  let _p5Class = (typeof Q5 !== 'undefined' && Q5.prototype && Q5.prototype.textSize) ? Q5 :
                 (typeof p5 !== 'undefined' && p5.prototype && p5.prototype.textSize) ? p5 : null;
  if (_p5Class) {
    let _origTextSize = _p5Class.prototype.textSize;
    _p5Class.prototype.textSize = function(s) {
      let scaled = s * (gameSettings.fontScale || 1);
      return _origTextSize.call(this, Math.max(scaled, MIN_TEXT_SIZE));
    };
  }
} catch(e) { /* q5 may not support prototype override -- use textSize normally */ }

// Outlined text helper — use for important labels
function outlinedText(str, x, y, outlineColor, mainColor) {
  let oc = outlineColor || color(0, 0, 0, 180);
  let mc = mainColor || color(255, 255, 255);
  push();
  fill(oc);
  text(str, x - 1, y - 1);
  text(str, x + 1, y - 1);
  text(str, x - 1, y + 1);
  text(str, x + 1, y + 1);
  fill(mc);
  text(str, x, y);
  pop();
}

// ─── PLAY ANALYTICS (localStorage only, no network) ─────────────────────
const _ANALYTICS_KEY = 'mare_nostrum_analytics';
let _analyticsData = null;
function _loadAnalytics() {
  if (_analyticsData) return _analyticsData;
  try { _analyticsData = JSON.parse(localStorage.getItem(_ANALYTICS_KEY)) || {}; } catch(e) { _analyticsData = {}; }
  return _analyticsData;
}
function trackMilestone(name) {
  let d = _loadAnalytics();
  if (d[name]) return;
  d[name] = { ts: Date.now(), t: new Date().toISOString() };
  try { localStorage.setItem(_ANALYTICS_KEY, JSON.stringify(d)); } catch(e) {}
}
function trackPlayTime() {
  let d = _loadAnalytics();
  d.play_time = (d.play_time || 0) + 60;
  try { localStorage.setItem(_ANALYTICS_KEY, JSON.stringify(d)); } catch(e) {}
}
setInterval(trackPlayTime, 60000);

// ─── GAME SCREEN STATE MACHINE ───────────────────────────────────────────
let gameScreen = 'menu'; // 'menu' | 'settings' | 'credits' | 'lobby' | 'game'
let menuHover = -1;      // which menu item is hovered
let menuFadeIn = 0;      // fade-in alpha (0→255 over 1 sec)
let menuKeyIdx = -1;     // keyboard-selected item index (-1 = mouse mode)
let menuFadeOut = 0;     // fade-out alpha (0→255 over 0.5 sec)
let menuFadeAction = null; // action to execute after fade-out
let menuBgImg = null;    // pre-rendered menu background image

// ─── SAVE SYSTEM INDICATOR ─────────────────────────────────────────────
let _saveIndicatorTimer = 0; // counts down from 60 (1 sec at 60fps)
const _SAVE_KEY = 'mare_nostrum_save';
const _BACKUP_KEY = 'mare_nostrum_backup';
// Migrate old save keys to new ones
try {
  let _oldSave = localStorage.getItem('sunlitIsles_save');
  if (_oldSave && !localStorage.getItem(_SAVE_KEY)) {
    localStorage.setItem(_SAVE_KEY, _oldSave);
    let _oldBackup = localStorage.getItem('sunlitIsles_backup');
    if (_oldBackup) localStorage.setItem(_BACKUP_KEY, _oldBackup);
  }
} catch(e) {}

// ─── FACTION SELECTION ──────────────────────────────────────────────────
let factionSelectActive = false;  // true when showing faction choice screen
let factionSelectHover = null;    // 'rome' | 'carthage' | 'egypt' | 'greece' | null
let factionSelectFade = 0;        // fade-in alpha
let _pendingFaction = null;        // confirmation step before faction lock

// Faction constants — bonuses and colors
const FACTIONS = {
  rome: {
    name: 'ROME',
    subtitle: 'Senatus Populusque Romanus',
    bonuses: ['+10% building speed', '+1 recruit capacity', 'Roman architecture', 'Starts with gladius'],
    buildSpeedMult: 1.1,
    recruitBonus: 1,
    tradeIncomeMult: 1.0,
    sailSpeedMult: 1.0,
    combatDamageMult: 1.0,
    fishYieldMult: 1.0,
    npcFavorMult: 1.0,
    crystalIncomeMult: 1.0,
    cropGrowthMult: 1.0,
    buildCostMult: 1.0,
    bannerColor: [175, 28, 28],
    accentColor: [180, 120, 50],
    accentColorHex: '#b47832',
    bannerGlyph: 'eagle',
    style: {
      wall: [218, 198, 168], roof: [185, 100, 58], trim: [185, 178, 165],
      accent: [175, 28, 28], door: [95, 58, 24], window: [40, 35, 25],
      column: [190, 183, 170], ground: [135, 120, 95],
      roofType: 'pitched', columnType: 'fluted', doorShape: 'arch',
      wallTexture: 'ashlar', groundTint: [165, 155, 140],
    },
    player: { tunic: [175, 58, 44], sash: [200, 170, 50], cape: [196, 64, 50], helm: [196, 162, 70] },
    npcNames: { livia: 'Livia', marcus: 'Marcus', vesta: 'Vesta', felix: 'Felix' },
  },
  carthage: {
    name: 'CARTHAGE',
    subtitle: 'The Merchant Republic',
    bonuses: ['+15% trade income', '+10% sailing speed', 'Punic architecture', 'Starts with merchant\'s pouch (+50g)'],
    buildSpeedMult: 1.0,
    recruitBonus: 0,
    tradeIncomeMult: 1.15,
    sailSpeedMult: 1.1,
    combatDamageMult: 1.0,
    fishYieldMult: 1.0,
    npcFavorMult: 1.0,
    crystalIncomeMult: 1.0,
    cropGrowthMult: 1.0,
    buildCostMult: 1.0,
    bannerColor: [100, 40, 140],
    accentColor: [140, 80, 180],
    accentColorHex: '#8c50b4',
    bannerGlyph: 'crescent',
    style: {
      wall: [212, 160, 80], roof: [196, 90, 48], trim: [240, 230, 208],
      accent: [60, 100, 160], door: [74, 48, 32], window: [60, 100, 160],
      column: [200, 170, 130], ground: [190, 165, 120],
      roofType: 'flat', columnType: 'rounded', doorShape: 'pointed',
      wallTexture: 'mudbrick', groundTint: [200, 178, 135],
    },
    player: { tunic: [240, 230, 210], sash: [120, 50, 160], cape: [120, 50, 160], helm: [140, 80, 180] },
    npcNames: { livia: 'Tanit', marcus: 'Hanno', vesta: 'Astarte', felix: 'Bomilcar' },
  },
  egypt: {
    name: 'EGYPT',
    subtitle: 'Gift of the Nile',
    bonuses: ['+20% crystal income', '+15% crop growth', '-10% building cost', 'Starts with ankh charm'],
    buildSpeedMult: 1.0,
    recruitBonus: 0,
    tradeIncomeMult: 1.0,
    sailSpeedMult: 1.0,
    combatDamageMult: 1.0,
    fishYieldMult: 1.0,
    npcFavorMult: 1.0,
    crystalIncomeMult: 1.2,
    cropGrowthMult: 1.15,
    buildCostMult: 0.9,
    bannerColor: [200, 170, 40],
    accentColor: [64, 176, 160],
    accentColorHex: '#40b0a0',
    bannerGlyph: 'eye',
    style: {
      wall: [232, 200, 114], roof: [58, 58, 74], trim: [245, 240, 224],
      accent: [64, 176, 160], door: [58, 58, 74], window: [64, 176, 160],
      column: [245, 240, 224], ground: [210, 185, 120],
      roofType: 'flat', columnType: 'lotus', doorShape: 'rect',
      wallTexture: 'smooth', groundTint: [220, 195, 140],
    },
    player: { tunic: [245, 240, 224], sash: [200, 170, 40], cape: [64, 176, 160], helm: [200, 170, 40] },
    npcNames: { livia: 'Nefertari', marcus: 'Imhotep', vesta: 'Isis', felix: 'Khufu' },
  },
  greece: {
    name: 'GREECE',
    subtitle: 'Cradle of Wisdom',
    bonuses: ['+15% combat damage', '+10% fishing yield', '+20% NPC favor', 'Starts with olive wreath'],
    buildSpeedMult: 1.0,
    recruitBonus: 0,
    tradeIncomeMult: 1.0,
    sailSpeedMult: 1.0,
    combatDamageMult: 1.15,
    fishYieldMult: 1.1,
    npcFavorMult: 1.2,
    crystalIncomeMult: 1.0,
    cropGrowthMult: 1.0,
    buildCostMult: 1.0,
    bannerColor: [50, 100, 170],
    accentColor: [80, 144, 192],
    accentColorHex: '#5090c0',
    bannerGlyph: 'owl',
    style: {
      wall: [240, 240, 248], roof: [208, 112, 64], trim: [220, 220, 230],
      accent: [80, 144, 192], door: [90, 65, 40], window: [80, 144, 192],
      column: [240, 240, 248], ground: [195, 190, 180],
      roofType: 'pediment', columnType: 'ionic', doorShape: 'arch',
      wallTexture: 'marble', groundTint: [210, 208, 200],
    },
    player: { tunic: [240, 238, 230], sash: [80, 144, 192], cape: [80, 144, 192], helm: [200, 195, 185] },
    npcNames: { livia: 'Helena', marcus: 'Leonidas', vesta: 'Athena', felix: 'Socrates' },
  },
  seapeople: {
    name: 'SEA PEOPLE',
    subtitle: 'Raiders of the Deep',
    bonuses: ['+30% sailing speed', '+50% raid loot', 'No starting island', 'Starts on a ship'],
    buildSpeedMult: 1.0,
    recruitBonus: 0,
    tradeIncomeMult: 1.0,
    sailSpeedMult: 1.3,
    combatDamageMult: 1.0,
    fishYieldMult: 1.0,
    npcFavorMult: 1.0,
    crystalIncomeMult: 1.0,
    cropGrowthMult: 1.0,
    buildCostMult: 1.0,
    raidLootMult: 1.5,
    noStartIsland: true,
    bannerColor: [26, 58, 92],
    accentColor: [42, 138, 106],
    accentColorHex: '#2a8a6a',
    bannerGlyph: 'trident',
    style: {
      wall: [138, 112, 80], roof: [90, 80, 65], trim: [110, 100, 80],
      accent: [42, 138, 106], door: [70, 55, 35], window: [26, 58, 92],
      column: [120, 105, 80], ground: [105, 90, 70],
      roofType: 'flat', columnType: 'wooden', doorShape: 'rect',
      wallTexture: 'plank', groundTint: [115, 100, 78],
    },
    player: { tunic: [26, 58, 92], sash: [90, 70, 45], cape: [42, 138, 106], helm: [138, 112, 80] },
    npcNames: { livia: 'Thalassa', marcus: 'Nereus', vesta: 'Scylla', felix: 'Triton' },
  },
  persia: {
    name: 'PERSIA',
    subtitle: 'The Immortal Empire',
    bonuses: ['+25% colony income', '+1 officer capacity', '+30% governor efficiency', 'Starts with royal scepter'],
    buildSpeedMult: 1.0,
    recruitBonus: 0,
    tradeIncomeMult: 1.0,
    sailSpeedMult: 1.0,
    combatDamageMult: 1.0,
    fishYieldMult: 1.0,
    npcFavorMult: 1.0,
    crystalIncomeMult: 1.0,
    cropGrowthMult: 1.0,
    buildCostMult: 1.0,
    colonyIncomeMult: 1.25,
    officerCapacity: 1,
    governorEfficiency: 1.3,
    bannerColor: [106, 42, 138],
    accentColor: [212, 160, 48],
    accentColorHex: '#d4a030',
    bannerGlyph: 'wingedlion',
    style: {
      wall: [240, 232, 208], roof: [106, 42, 138], trim: [212, 160, 48],
      accent: [42, 74, 138], door: [80, 50, 30], window: [42, 74, 138],
      column: [230, 220, 200], ground: [180, 160, 130],
      roofType: 'domed', columnType: 'twisted', doorShape: 'arch',
      wallTexture: 'mosaic', groundTint: [195, 178, 148],
    },
    player: { tunic: [106, 42, 138], sash: [212, 160, 48], cape: [106, 42, 138], helm: [212, 160, 48] },
    npcNames: { livia: 'Esther', marcus: 'Cyrus', vesta: 'Darius', felix: 'Zarathustra' },
  },
  phoenicia: {
    name: 'PHOENICIA',
    subtitle: 'Masters of the Sea',
    bonuses: ['+30% trade income', '2x island discovery speed', '+50% ship cargo', 'Starts with navigator\'s chart'],
    buildSpeedMult: 1.0,
    recruitBonus: 0,
    tradeIncomeMult: 1.3,
    sailSpeedMult: 1.0,
    combatDamageMult: 1.0,
    fishYieldMult: 1.0,
    npcFavorMult: 1.0,
    crystalIncomeMult: 1.0,
    cropGrowthMult: 1.0,
    buildCostMult: 1.0,
    discoverIslandSpeed: 2.0,
    shipCargoMult: 1.5,
    bannerColor: [138, 16, 80],
    accentColor: [48, 112, 176],
    accentColorHex: '#3070b0',
    bannerGlyph: 'cedar',
    style: {
      wall: [240, 240, 240], roof: [106, 74, 42], trim: [138, 16, 80],
      accent: [48, 112, 176], door: [80, 55, 30], window: [48, 112, 176],
      column: [230, 225, 218], ground: [160, 150, 135],
      roofType: 'flat', columnType: 'rounded', doorShape: 'arch',
      wallTexture: 'ashlar', groundTint: [175, 165, 148],
    },
    player: { tunic: [240, 240, 240], sash: [138, 16, 80], cape: [138, 16, 80], helm: [212, 160, 48] },
    npcNames: { livia: 'Dido', marcus: 'Hiram', vesta: 'Jezebel', felix: 'Cadmus' },
  },
  gaul: {
    name: 'GAUL',
    subtitle: 'Children of the Forest',
    bonuses: ['+20% combat damage', '+50% forest resources', 'Wildlife friendly', 'Starts with druid staff'],
    buildSpeedMult: 1.0,
    recruitBonus: 0,
    tradeIncomeMult: 1.0,
    sailSpeedMult: 1.0,
    combatDamageMult: 1.2,
    fishYieldMult: 1.0,
    npcFavorMult: 1.0,
    crystalIncomeMult: 1.0,
    cropGrowthMult: 1.0,
    buildCostMult: 1.0,
    forestResourceMult: 1.5,
    wildlifeFriendly: true,
    bannerColor: [42, 106, 48],
    accentColor: [200, 160, 32],
    accentColorHex: '#c8a020',
    bannerGlyph: 'boar',
    style: {
      wall: [140, 110, 70], roof: [160, 145, 90], trim: [90, 64, 32],
      accent: [42, 106, 48], door: [60, 42, 20], window: [42, 106, 48],
      column: [100, 80, 50], ground: [85, 100, 60],
      roofType: 'thatched', columnType: 'wooden', doorShape: 'rect',
      wallTexture: 'wattle', groundTint: [95, 110, 68],
    },
    player: { tunic: [42, 106, 48], sash: [200, 160, 32], cape: [90, 64, 32], helm: [112, 120, 124] },
    npcNames: { livia: 'Boudicca', marcus: 'Vercingetorix', vesta: 'Druantia', felix: 'Brennus' },
  },
};

// Faction data caches — invalidated only when faction changes (never mid-game)
let _factionDataCache = null;
let _factionBuildingColorsCache = null;
let _factionMilitaryCache = null;
let _factionCacheKey = null;

function _invalidateFactionCache() {
  _factionDataCache = null;
  _factionBuildingColorsCache = null;
  _factionMilitaryCache = null;
  _factionCacheKey = null;
}

function getFactionBuildingColors() {
  let key = state.faction || 'rome';
  if (_factionBuildingColorsCache && _factionCacheKey === key) return _factionBuildingColorsCache;
  let fac = getFactionData();
  let s = fac.style;
  _factionBuildingColorsCache = { wall: s.wall, roof: s.roof, trim: s.trim, accent: s.accent,
    door: s.door, window: s.window, column: s.column, ground: s.ground,
    roofType: s.roofType, columnType: s.columnType, doorShape: s.doorShape,
    wallTexture: s.wallTexture, groundTint: s.groundTint };
  return _factionBuildingColorsCache;
}

function getFactionData() {
  let key = state.faction || 'rome';
  if (_factionDataCache && _factionCacheKey === key) return _factionDataCache;
  _factionCacheKey = key;
  _factionDataCache = FACTIONS[key] || FACTIONS.rome;
  return _factionDataCache;
}

function getNPCDisplayName(npcKey) {
  let fac = getFactionData();
  return (fac.npcNames && fac.npcNames[npcKey]) || npcKey.charAt(0).toUpperCase() + npcKey.slice(1);
}

function getFactionTreeTypes(factionKey) {
  let f = factionKey || state.faction || 'rome';
  let types = {
    rome:      ['oak', 'pine', 'olive'],
    carthage:  ['palm', 'acacia', 'fig'],
    egypt:     ['papyrus', 'datepalm', 'sycamore'],
    greece:    ['olive', 'oak', 'laurel'],
    seapeople: ['palm', 'driftwood', 'mangrove'],
    persia:    ['cypress', 'pomegranate', 'cedar'],
    phoenicia: ['cedar', 'olive', 'fig'],
    gaul:      ['oak', 'birch', 'elm'],
  };
  return types[f] || types.rome;
}

const FACTION_FLORA = {
  rome: [
    { col: [140, 100, 180], w: 3, h: 3 },
    { col: [80, 120, 50], w: 4, h: 2 },
    { col: [160, 120, 200], w: 2, h: 2 },
  ],
  carthage: [
    { col: [210, 100, 40], w: 3, h: 3 },
    { col: [80, 130, 60], w: 3, h: 4 },
    { col: [190, 80, 30], w: 2, h: 2 },
  ],
  egypt: [
    { col: [60, 100, 180], w: 3, h: 2 },
    { col: [200, 180, 80], w: 4, h: 3 },
    { col: [50, 110, 170], w: 2, h: 2 },
  ],
  greece: [
    { col: [230, 230, 220], w: 3, h: 3 },
    { col: [70, 110, 50], w: 4, h: 2 },
    { col: [220, 220, 210], w: 2, h: 2 },
  ],
  seapeople: [
    { col: [40, 100, 120], w: 3, h: 2 },
    { col: [80, 130, 90], w: 4, h: 3 },
    { col: [60, 90, 110], w: 2, h: 2 },
  ],
  persia: [
    { col: [180, 100, 200], w: 3, h: 3 },
    { col: [200, 160, 60], w: 4, h: 2 },
    { col: [160, 80, 180], w: 2, h: 2 },
  ],
  phoenicia: [
    { col: [180, 30, 100], w: 3, h: 3 },
    { col: [60, 110, 170], w: 4, h: 2 },
    { col: [160, 20, 80], w: 2, h: 2 },
  ],
  gaul: [
    { col: [60, 130, 50], w: 3, h: 3 },
    { col: [100, 80, 40], w: 4, h: 2 },
    { col: [50, 120, 45], w: 2, h: 2 },
  ],
};

const FACTION_MILITARY = {
  rome: {
    tunic: [160, 50, 40], cape: [145, 28, 22], armor: [175, 172, 180],
    helm: [175, 150, 60], helmCrest: [200, 35, 25], shield: [158, 32, 25],
    shieldBoss: [200, 170, 55], legs: [120, 40, 30], plume: [180, 30, 20],
    shieldShape: 'rect', helmStyle: 'galea', weapon: 'gladius',
    conquestFlag: [185, 38, 28],
  },
  carthage: {
    tunic: [240, 230, 210], cape: [120, 50, 160], armor: [180, 160, 120],
    helm: [240, 230, 210], helmCrest: [120, 50, 160], shield: [120, 50, 160],
    shieldBoss: [200, 170, 60], legs: [100, 70, 50], plume: [160, 100, 170],
    shieldShape: 'round', helmStyle: 'turban', weapon: 'curved_sword',
    conquestFlag: [120, 50, 160],
  },
  egypt: {
    tunic: [245, 240, 224], cape: [64, 176, 160], armor: [200, 170, 40],
    helm: [200, 170, 40], helmCrest: [64, 176, 160], shield: [200, 170, 40],
    shieldBoss: [64, 176, 160], legs: [140, 110, 70], plume: [64, 176, 160],
    shieldShape: 'round', helmStyle: 'nemes', weapon: 'khopesh',
    conquestFlag: [200, 170, 40],
  },
  greece: {
    tunic: [240, 238, 230], cape: [80, 144, 192], armor: [200, 195, 185],
    helm: [200, 195, 185], helmCrest: [80, 144, 192], shield: [80, 144, 192],
    shieldBoss: [200, 195, 185], legs: [110, 85, 55], plume: [80, 144, 192],
    shieldShape: 'round', helmStyle: 'corinthian', weapon: 'spear',
    conquestFlag: [50, 100, 170],
  },
  seapeople: {
    tunic: [26, 58, 92], cape: [42, 138, 106], armor: [138, 112, 80],
    helm: [138, 112, 80], helmCrest: [42, 138, 106], shield: [26, 58, 92],
    shieldBoss: [138, 112, 80], legs: [80, 65, 45], plume: [42, 138, 106],
    shieldShape: 'round', helmStyle: 'nasal', weapon: 'axe',
    conquestFlag: [26, 58, 92],
  },
  persia: {
    tunic: [106, 42, 138], cape: [212, 160, 48], armor: [230, 220, 200],
    helm: [212, 160, 48], helmCrest: [106, 42, 138], shield: [106, 42, 138],
    shieldBoss: [212, 160, 48], legs: [90, 60, 40], plume: [212, 160, 48],
    shieldShape: 'round', helmStyle: 'tiara', weapon: 'scimitar',
    conquestFlag: [106, 42, 138],
  },
  phoenicia: {
    tunic: [240, 240, 240], cape: [138, 16, 80], armor: [200, 180, 140],
    helm: [200, 180, 140], helmCrest: [138, 16, 80], shield: [138, 16, 80],
    shieldBoss: [48, 112, 176], legs: [100, 80, 50], plume: [138, 16, 80],
    shieldShape: 'round', helmStyle: 'turban', weapon: 'curved_sword',
    conquestFlag: [138, 16, 80],
  },
  gaul: {
    tunic: [42, 106, 48], cape: [90, 64, 32], armor: [112, 120, 124],
    helm: [112, 120, 124], helmCrest: [200, 160, 32], shield: [42, 106, 48],
    shieldBoss: [200, 160, 32], legs: [70, 50, 30], plume: [200, 160, 32],
    shieldShape: 'round', helmStyle: 'galea', weapon: 'longsword',
    conquestFlag: [42, 106, 48],
  },
};

function getFactionMilitary() {
  let key = state.faction || 'rome';
  if (_factionMilitaryCache && _factionCacheKey === key) return _factionMilitaryCache;
  _factionMilitaryCache = FACTION_MILITARY[key] || FACTION_MILITARY.rome;
  return _factionMilitaryCache;
}

var _factionTermsCache = null, _factionTermsCacheKey = null;
const FACTION_TERMS = {
  rome:      { leader:'Centurion', soldier:'Legionary', barracks:'Castrum', army:'Legion', elite:'Praetorian', officer:'Decurion', rank2:'Centurion', rank3:'Legate' },
  carthage:  { leader:'Suffete', soldier:'Libyan Infantry', barracks:'War Camp', army:'Host', elite:'Sacred Band', officer:'Captain', rank2:'Suffete', rank3:'General' },
  egypt:     { leader:'Commander', soldier:'Medjay', barracks:'Garrison', army:'Royal Guard', elite:"Pharaoh's Elite", officer:'Scribe', rank2:'Commander', rank3:'Vizier' },
  greece:    { leader:'Strategos', soldier:'Hoplite', barracks:'Stratopedo', army:'Phalanx', elite:'Companion', officer:'Lochagos', rank2:'Strategos', rank3:'Polemarch' },
  seapeople: { leader:'Warchief', soldier:'Raider', barracks:'Longhouse', army:'War Band', elite:'Storm Warrior', officer:'Thane', rank2:'Warchief', rank3:'High King' },
  persia:    { leader:'Satrap', soldier:'Immortal', barracks:'Apadana', army:'Royal Army', elite:'Immortal Guard', officer:'Hazarapatis', rank2:'Satrap', rank3:'Spahbod' },
  phoenicia: { leader:'Admiral', soldier:'Marine', barracks:'Dockfort', army:'Fleet Guard', elite:'Tyrian Elite', officer:'Helmsman', rank2:'Admiral', rank3:'Archon' },
  gaul:      { leader:'Chieftain', soldier:'Warrior', barracks:'Hill Fort', army:'War Band', elite:'Champion', officer:'Ambact', rank2:'Chieftain', rank3:'Vercingetorix' },
};
function getFactionTerms() {
  let key = state.faction || 'rome';
  if (_factionTermsCache && _factionTermsCacheKey === key) return _factionTermsCache;
  _factionTermsCacheKey = key;
  _factionTermsCache = FACTION_TERMS[key] || FACTION_TERMS.rome || { leader:'Centurion', soldier:'Legionary', barracks:'Castrum', army:'Legion', elite:'Praetorian', officer:'Decurion', rank2:'Centurion', rank3:'Legate' };
  return _factionTermsCache;
}

const FACTION_WILDLIFE = {
  rome: [
    { type: 'rabbit', speed: 0.4, size: 6 },
    { type: 'songbird', speed: 0.6, size: 5 },
    { type: 'fox', speed: 0.3, size: 8 },
  ],
  carthage: [
    { type: 'camel', speed: 0.15, size: 12 },
    { type: 'falcon', speed: 0.8, size: 7 },
    { type: 'desertfox', speed: 0.35, size: 6 },
  ],
  egypt: [
    { type: 'ibis', speed: 0.25, size: 8 },
    { type: 'cat', speed: 0.3, size: 6 },
    { type: 'scarab', speed: 0.2, size: 4 },
  ],
  greece: [
    { type: 'goat', speed: 0.2, size: 10 },
    { type: 'turtle', speed: 0.08, size: 5 },
    { type: 'owl', speed: 0.5, size: 6 },
  ],
  seapeople: [
    { type: 'seagull', speed: 0.7, size: 6 },
    { type: 'crab', speed: 0.15, size: 4 },
    { type: 'pelican', speed: 0.4, size: 8 },
  ],
  persia: [
    { type: 'peacock', speed: 0.2, size: 9 },
    { type: 'gazelle', speed: 0.5, size: 8 },
    { type: 'nightingale', speed: 0.6, size: 5 },
  ],
  phoenicia: [
    { type: 'dolphin', speed: 0.6, size: 7 },
    { type: 'seagull', speed: 0.7, size: 6 },
    { type: 'cat', speed: 0.3, size: 6 },
  ],
  gaul: [
    { type: 'boar', speed: 0.25, size: 11 },
    { type: 'stag', speed: 0.4, size: 12 },
    { type: 'raven', speed: 0.5, size: 6 },
  ],
};

// ─── FACTION UNITS ────────────────────────────────────────────────────────
const FACTION_UNITS = {
  rome: [
    { name: 'Hastatus', cost: 8, currency: 'gold', hp: 30, atk: 8, def: 4, desc: 'Light infantry' },
    { name: 'Princeps', cost: 18, currency: 'gold', hp: 50, atk: 12, def: 8, desc: 'Heavy infantry' },
    { name: 'Triarius', cost: 30, currency: 'gold', hp: 70, atk: 14, def: 14, desc: 'Elite veteran' },
    { name: 'Equites', cost: 25, currency: 'gold', hp: 45, atk: 16, def: 6, desc: 'Cavalry' },
    { name: 'Scorpion', cost: 40, currency: 'gold', hp: 25, atk: 25, def: 2, desc: 'Siege weapon' },
    { name: 'Praetorian', cost: 50, currency: 'gold', hp: 80, atk: 18, def: 16, desc: 'Imperial guard' },
  ],
  carthage: [
    { name: 'Libyan', cost: 6, currency: 'gold', hp: 25, atk: 7, def: 4, desc: 'Light spearman' },
    { name: 'Numidian', cost: 15, currency: 'gold', hp: 35, atk: 10, def: 5, desc: 'Skirmish cavalry' },
    { name: 'Slinger', cost: 12, currency: 'gold', hp: 20, atk: 14, def: 2, desc: 'Ranged unit' },
    { name: 'Sacred Band', cost: 35, currency: 'gold', hp: 65, atk: 16, def: 12, desc: 'Elite warriors' },
    { name: 'War Elephant', cost: 60, currency: 'gold', hp: 120, atk: 22, def: 10, desc: 'Trampling beast' },
    { name: 'Hannibal', cost: 50, currency: 'gold', hp: 90, atk: 20, def: 14, desc: 'Legendary general' },
  ],
  egypt: [
    { name: 'Medjay', cost: 12, currency: 'gold', hp: 40, atk: 10, def: 6, desc: 'Desert ranger' },
    { name: 'Priest of Ra', cost: 20, currency: 'gold', hp: 30, atk: 8, def: 4, desc: 'Healer' },
    { name: 'Chariot', cost: 22, currency: 'gold', hp: 50, atk: 15, def: 6, desc: 'Fast attack' },
    { name: 'Sand Golem', cost: 15, currency: 'crystals', hp: 80, atk: 12, def: 12, desc: 'Mystic construct' },
    { name: 'Scarab Swarm', cost: 8, currency: 'crystals', hp: 20, atk: 18, def: 1, desc: 'Swarm attack' },
    { name: 'Anubis', cost: 40, currency: 'crystals', hp: 100, atk: 22, def: 16, desc: 'Death guardian' },
  ],
  greece: [
    { name: 'Hoplite', cost: 12, currency: 'gold', hp: 45, atk: 10, def: 10, desc: 'Shield wall' },
    { name: 'Peltast', cost: 10, currency: 'gold', hp: 25, atk: 12, def: 3, desc: 'Javelin thrower' },
    { name: 'Spartan', cost: 35, currency: 'gold', hp: 70, atk: 16, def: 14, desc: 'Elite hoplite' },
    { name: 'Companion Cavalry', cost: 28, currency: 'gold', hp: 55, atk: 18, def: 8, desc: 'Shock cavalry' },
    { name: 'Siege Trireme', cost: 45, currency: 'gold', hp: 60, atk: 20, def: 6, desc: 'Naval siege' },
    { name: 'Achilles', cost: 50, currency: 'gold', hp: 95, atk: 24, def: 12, desc: 'Legendary hero' },
  ],
  seapeople: [
    { name: 'Raider', cost: 5, currency: 'gold', hp: 20, atk: 8, def: 2, desc: 'Fast raider' },
    { name: 'Sea Warrior', cost: 14, currency: 'gold', hp: 40, atk: 12, def: 6, desc: 'Seasoned fighter' },
    { name: 'Berserker', cost: 20, currency: 'gold', hp: 50, atk: 20, def: 2, desc: 'Reckless fury' },
    { name: 'Shieldmaiden', cost: 18, currency: 'gold', hp: 45, atk: 12, def: 10, desc: 'Balanced warrior' },
    { name: 'Longship Captain', cost: 35, currency: 'gold', hp: 65, atk: 16, def: 12, desc: 'Naval commander' },
    { name: 'Sea King', cost: 0, currency: 'gold', hp: 100, atk: 22, def: 14, desc: 'Born ruler of waves' },
  ],
  persia: [
    { name: 'Immortal', cost: 15, currency: 'gold', hp: 50, atk: 12, def: 8, desc: 'Never-ending guard' },
    { name: 'Horse Archer', cost: 20, currency: 'gold', hp: 35, atk: 16, def: 4, desc: 'Mobile ranged' },
    { name: 'War Chariot', cost: 25, currency: 'gold', hp: 55, atk: 14, def: 8, desc: 'Scythed wheels' },
    { name: 'Satrap Guard', cost: 30, currency: 'gold', hp: 60, atk: 14, def: 12, desc: 'Provincial elite' },
    { name: 'Elephant Archer', cost: 50, currency: 'gold', hp: 100, atk: 20, def: 10, desc: 'Mounted archers' },
    { name: 'Great King', cost: 0, currency: 'gold', hp: 110, atk: 20, def: 16, desc: 'King of Kings' },
  ],
  phoenicia: [
    { name: 'Sailor', cost: 8, currency: 'gold', hp: 25, atk: 8, def: 4, desc: 'Deckhand fighter' },
    { name: 'Marine', cost: 16, currency: 'gold', hp: 40, atk: 12, def: 8, desc: 'Ship-to-ship' },
    { name: 'Fire Ship Crew', cost: 22, currency: 'gold', hp: 30, atk: 20, def: 2, desc: 'Incendiary' },
    { name: 'Temple Guard', cost: 28, currency: 'gold', hp: 55, atk: 14, def: 12, desc: 'Sacred defender' },
    { name: 'Purple Guard', cost: 40, currency: 'gold', hp: 70, atk: 16, def: 14, desc: 'Royal marines' },
    { name: 'Admiral', cost: 45, currency: 'gold', hp: 80, atk: 18, def: 12, desc: 'Fleet commander' },
  ],
  gaul: [
    { name: 'Warrior', cost: 6, currency: 'gold', hp: 30, atk: 10, def: 4, desc: 'Tribal fighter' },
    { name: 'Druid', cost: 18, currency: 'gold', hp: 25, atk: 6, def: 4, desc: 'Healer and buffer' },
    { name: 'Woad Raider', cost: 14, currency: 'gold', hp: 35, atk: 14, def: 2, desc: 'Painted berserker' },
    { name: 'Carnyx Bearer', cost: 20, currency: 'gold', hp: 40, atk: 10, def: 8, desc: 'Morale boost' },
    { name: 'Chieftain Guard', cost: 35, currency: 'gold', hp: 60, atk: 16, def: 12, desc: 'Noble retinue' },
    { name: 'War Chief', cost: 50, currency: 'gold', hp: 85, atk: 20, def: 14, desc: 'Tribal champion' },
  ],
};

// ─── GOD DEFINITIONS ──────────────────────────────────────────────────────
const GODS = {
  rome:      { name: 'Mars', domain: 'War', ultimate: 'Blood Oath', blessingOptions: ['battle_fury', 'iron_skin', 'rally_cry'] },
  carthage:  { name: 'Tanit', domain: 'Moon', ultimate: 'Lunar Tide', blessingOptions: ['night_veil', 'trade_wind', 'silver_tongue'] },
  egypt:     { name: 'Ra', domain: 'Sun', ultimate: 'Solar Judgment', blessingOptions: ['solar_shield', 'harvest_blessing', 'crystal_growth'] },
  greece:    { name: 'Athena', domain: 'Wisdom', ultimate: 'Oracle Vision', blessingOptions: ['tactical_insight', 'scholar_focus', 'divine_aegis'] },
  seapeople: { name: 'Poseidon', domain: 'Sea', ultimate: 'Tsunami', blessingOptions: ['calm_seas', 'fish_bounty', 'storm_call'] },
  persia:    { name: 'Ahura Mazda', domain: 'Light', ultimate: 'Eternal Flame', blessingOptions: ['purity', 'royal_decree', 'fire_blessing'] },
  phoenicia: { name: 'Melqart', domain: 'Trade', ultimate: 'Golden Touch', blessingOptions: ['merchant_favor', 'fair_winds', 'harbor_blessing'] },
  gaul:      { name: 'Cernunnos', domain: 'Nature', ultimate: 'Wild Hunt', blessingOptions: ['forest_growth', 'beast_bond', 'earth_strength'] },
};

const TEMPLE_HALLS={rome:{name:'Temple of Mars',floor1:[210,205,195],floor2:[170,165,155],wall:[45,35,28],drape:[175,28,28],accent:[200,170,50],trim:[185,178,165],altarShape:'eagle',altarColor:[200,170,50],decoType:'laurel',decoColor:[80,140,50],pet:'wolf',petColor:[140,120,100],petAccent:[100,85,70]},carthage:{name:'Temple of Tanit',floor1:[212,180,120],floor2:[180,150,100],wall:[60,40,25],drape:[120,50,160],accent:[212,180,60],trim:[240,230,208],altarShape:'crescent',altarColor:[212,180,60],decoType:'gold_disc',decoColor:[212,180,60],pet:'monkey',petColor:[160,110,60],petAccent:[200,160,110]},egypt:{name:'Temple of Ra',floor1:[232,200,114],floor2:[200,170,90],wall:[50,45,35],drape:[40,100,180],accent:[200,170,40],trim:[245,240,224],altarShape:'pyramid',altarColor:[200,170,40],decoType:'lotus',decoColor:[100,180,160],pet:'cat',petColor:[180,140,80],petAccent:[220,180,100]},greece:{name:'Temple of Athena',floor1:[240,240,248],floor2:[200,200,210],wall:[40,40,50],drape:[80,144,192],accent:[80,144,192],trim:[220,220,230],altarShape:'olive',altarColor:[80,140,50],decoType:'column',decoColor:[200,200,210],pet:'owl',petColor:[160,140,100],petAccent:[220,200,140]},seapeople:{name:'Temple of Poseidon',floor1:[138,120,90],floor2:[110,95,70],wall:[35,30,25],drape:[60,100,140],accent:[42,138,106],trim:[110,100,80],altarShape:'anchor',altarColor:[120,120,130],decoType:'net',decoColor:[90,110,100],pet:'crab',petColor:[200,80,60],petAccent:[220,120,80]},persia:{name:'Temple of Ahura Mazda',floor1:[220,200,160],floor2:[180,160,120],wall:[40,30,30],drape:[42,74,138],accent:[212,160,48],trim:[230,220,200],altarShape:'fire',altarColor:[255,140,30],decoType:'wingedsun',decoColor:[212,160,48],pet:'falcon',petColor:[120,90,60],petAccent:[180,150,100]},phoenicia:{name:'Temple of Melqart',floor1:[220,215,210],floor2:[180,175,170],wall:[45,30,30],drape:[138,16,80],accent:[180,120,40],trim:[200,190,175],altarShape:'ship',altarColor:[180,120,40],decoType:'wave',decoColor:[48,112,176],pet:'parrot',petColor:[60,180,60],petAccent:[255,80,40]},gaul:{name:'Temple of Cernunnos',floor1:[120,100,65],floor2:[95,80,50],wall:[30,28,20],drape:[42,106,48],accent:[200,160,32],trim:[100,80,50],altarShape:'dolmen',altarColor:[140,130,110],decoType:'mistletoe',decoColor:[80,140,50],pet:'boar',petColor:[120,90,60],petAccent:[80,60,40]}};
const TEMPLE_JESTER_JOKES={rome:['Why did the Roman cross the road? To get to the other empire!','A senator walks into a bar. The bar wins the election.','What is a gladiators favorite season? FALL!','I told my centurion a joke. He said That is I funny.','How do Romans cut their hair? With Caesars!','What did the grape say when the legionary stepped on it? Nothing, it let out a little wine.'],carthage:['Why are Carthaginian merchants so calm? They always find a fair trade!','I asked Hannibal for directions. He took the long way over the Alps.','What is a Punic traders favorite game? Monopoly!','Our elephants never forget... especially debts.','Why did the merchant cross the sea? Profit was on the other side!','Tanit told me the moon was full. I said, so is my warehouse!'],egypt:['Why do mummies skip vacations? They are afraid to unwind!','What is a pharaohs favorite restaurant? Pizza Tut!','I tried to write in hieroglyphs but I kept drawing a blank.','Why was the pyramid jealous? The sphinx always had a riddle!','What music do mummies listen to? Wrap music!','Ra told me to lighten up. He does that every morning.'],greece:['Why did Achilles fail math? He could never solve his heel problem!','I asked Socrates a question. He answered with twelve more.','What is an Athenians favorite dessert? Baklava-nt to miss it!','Odysseus took ten years to get home. Should have asked for directions!','Why are Greek columns always tired? They have been holding things up for ages!','Diogenes found an honest man. Just kidding, he is still looking.'],seapeople:['Why do sea people make bad comedians? Their jokes are all washed up!','I told a wave joke but it did not make a splash.','What is a raiders favorite letter? Arrrr!','Our navigator got lost. Again. That is how we found this place!','Why did the fish blush? It saw the oceans bottom!','I tried anchoring a joke but it just sank.'],persia:['Why is the Persian Empire so bright? Because of Ahura Mazdas light bulb!','A satrap walks into a palace. Nice place, he says. I will take it.','What is an immortals least favorite thing? Mortality jokes!','Zoroaster said truth is sacred. My tax collector disagrees.','Why did the courier run so fast? The Royal Road was one way!','Our gardens hang. Our empire hangs on. I just hang around.'],phoenicia:['Why did the Phoenician invent the alphabet? Tired of drawing pictures!','I shipped a joke overseas but the punchline got lost at sea.','What did the sailor say to the purple dye? You are worth a fortune!','Our ships are unsinkable! ...Do not check the harbor.','Why do Phoenicians make great friends? They always stay in touch - by letter!','Melqart blessed our trade. Now even our jokes are priceless.'],gaul:['Why did the druid hug a tree? It was an oak-casion!','A boar walked into a feast. He was the main course!','What is a Gauls favorite drink? Anything fermented!','I asked the mistletoe for advice. It just hung there.','Why do druids make bad builders? They only work with natural materials!','Cernunnos told a deer joke. It was stag-gering.']};
const TEMPLE_ACHIEVEMENTS=[{id:'first_harvest',name:'First Harvest',icon:'crop',milestone:'first_harvest'},{id:'built_temple',name:'Built Temple',icon:'temple',milestone:'first_build'},{id:'won_battle',name:'Won Battle',icon:'sword',milestone:'victory_conquest'},{id:'reached_level10',name:'Reached Lv10',icon:'star',milestone:'reached_lv10'},{id:'allied_nation',name:'Allied Nation',icon:'handshake',milestone:'visit_nation_0'},{id:'built_army',name:'Built Army',icon:'shield',milestone:'faction_chosen_rome'},{id:'explored_islands',name:'Explorer',icon:'compass',milestone:'game_complete'},{id:'tutorial_done',name:'Tutorial Done',icon:'scroll',milestone:'tutorial_complete'}];

// ─── TEMPLE ROOM (engine-based interior) ────────────────────────────────
const TEMPLE_ROOM = { cx: 600, cy: -300, hw: 180, hh: 110 };

// ─── CASTRUM ROOM (engine-based interior) ────────────────────────────────
const CASTRUM_ROOM = { cx: 600, cy: -600, hw: 200, hh: 130 };
const CASTRUM_COMMANDER_ADVICE = [
  'We need more archers to counter ranged threats.',
  'Our morale is high. Good time to attack.',
  'Build more watchtowers for defense.',
  'Train cavalry for flanking maneuvers.',
  'A siege ram would break their walls.',
  'Our soldiers grow restless. Deploy them soon.',
  'The enemy has numbers. We need elite centurions.',
  'Fortify the castrum before the next raid.',
];

// ─── WRECK ISLAND CONFIG ────────────────────────────────────────────────
const WRECK = {
  cx: -4800, cy: 0,       // wreck beach center (far west, separate from everything)
  rx: 380, ry: 200,       // large enough to feel like a real island
  scavNodes: [],           // populated on new game
  triremeHP: 0,            // 0-100, repair progress
  triremeRepaired: false,
};

// ─── TUTORIAL HINTS ─────────────────────────────────────────────────────
let tutorialHint = null;   // { text, timer, x, y } — floating contextual hint
let tutorialHintCooldown = 0;

// ─── NOTIFICATION SYSTEM ───────────────────────────────────────────────
let notifications = [];  // { text, col, timer, maxTimer, fadeIn }

// ─── UI OVERLAY STATES ─────────────────────────────────────────────────
let empireDashOpen = false;   // Tab key
let inventoryOpen = false;    // I key
let screenTransition = { active: false, alpha: 0, dir: 1, callback: null };
let achievementPopup = null;  // { text, timer, slideX }
let photoMode = false;
let photoModeWatermarkAlpha = 0;
let photoModeTipTimer = 0;
let photoModeFlash = 0;
let screenshotMode = false;
let screenshotFilter = 0; // 0=none, 1=warm, 2=cool, 3=sepia

// ─── DIALOG SYSTEM ─────────────────────────────────────────────────────
let dialogState = {
  active: false,
  speaker: '',
  portrait: null,    // 'livia', 'marcus', 'vesta', 'felix'
  text: '',
  displayLen: 0,     // typewriter chars revealed
  choices: null,     // null or [{ text, action }]
  onComplete: null,
};

// ─── PALETTE — COZY MEDITERRANEAN PIXEL ──────────────────────────────────
const C = {
  skyDeep:    '#0d1220',
  skyMid:     '#162740',
  skyHorizon: '#2a4a5a',
  stormCloud: '#2a2d3e',
  stormLight: '#3e4d65',
  islandDark: '#2a4420',
  islandMid:  '#3a5830',
  islandRim:  '#4a6a38',
  stoneDark:  '#3a3530',
  stoneMid:   '#5a5248',
  stoneLight: '#7a7268',
  ruinAccent: '#6a5430',
  crystalBase:'#1a5a44',
  crystalGlow:'#44ffaa',
  crystalDim: '#0a5533',
  solarGold:  '#d4960a',
  solarBright:'#ffbb22',
  solarFlare: '#ff7722',
  energyArc:  '#44ffdd',
  energyDim:  '#0a4433',
  vineGreen:  '#3a6a28',
  vineLight:  '#4a8a32',
  leafDark:   '#2a4a20',
  cropGlow:   '#aaff66',
  cropDim:    '#334a10',
  playerBody: '#d4b080',
  playerAccent:'#ff9922',
  npcPurple:  '#7744cc',
  npcGlow:    '#aa77ff',
  companionG: '#66ffaa',
  companionD: '#0a5533',
  stormFlash: '#bbddff',
  waterDeep:  '#0a1828',
  waterMid:   '#142a44',
  waterShimmer:'#2a5a7a',
  textBright: '#f0f4e8',
  textDim:    '#8a9878',
  hudBg:      'rgba(20,16,12,0.88)',
  hudBorder:  '#d4a040',
  hudDim:     'rgba(212,160,64,0.15)',
  buildGhost: 'rgba(212,160,64,0.3)',
  buildValid: '#66cc44',
  buildInvalid:'#cc4433',
  wallColor:  '#5a5448',
  wallTop:    '#6a6458',
  floorColor: '#3a3020',
  floorAccent:'#4a4030',
  doorColor:  '#6a4420',
  doorAccent: '#9a7a44',
  chestColor: '#5a4218',
  chestAccent:'#8a6a2a',
  // Pixel art extras
  sand:       '#e0c898',
  sandDark:   '#c4a878',
  terracotta: '#c45a38',
  marble:     '#e8e0d4',
  marbleDark: '#c8baa8',
  olive:      '#6a8e30',
  oliveDark:  '#4a6a20',
  warmWhite:  '#f8f0e0',
  parchment:  '#e8d8b8',
  bark:       '#5a4028',
  barkLight:  '#7a5838',
};

// ─── WORLD CONFIG ──────────────────────────────────────────────────────────
const WORLD = {
  islandCX: 600,    // island center X in world coords
  islandCY: 400,    // island center Y
  islandRX: 500,    // island radius X (initial) — BIGGER
  islandRY: 320,    // island radius Y (initial) — BIGGER
  tileSize: 32,     // grid snap for building
};



function getEra() {
  let lv = state.islandLevel || 1;
  return lv <= 8 ? 'village' : lv <= 17 ? 'city' : 'atlantis';
}

let _eraPaletteCache = null;
let _eraPaletteCacheFrame = -1;
function getEraPalette() {
  if (_eraPaletteCacheFrame === frameCount) return _eraPaletteCache;
  let lvl = state.islandLevel || 1;
  let ep;
  if (lvl <= 8) {
    ep = {
      era: 1,
      wallBase: [160, 130, 90],
      wallAccent: [140, 115, 75],
      roofBase: [180, 155, 100],
      roofAccent: [150, 130, 85],
      floorBase: [145, 130, 105],
      doorColor: [110, 85, 55],
      stoneBase: [155, 145, 125],
      roadBase: [135, 120, 95],
      roadLine: [115, 100, 75],
      nightGlow: [255, 180, 80],
      nightRadius: 40,
    };
  } else if (lvl <= 17) {
    ep = {
      era: 2,
      wallBase: [200, 185, 160],
      wallAccent: [185, 170, 145],
      roofBase: [185, 95, 65],
      roofAccent: [165, 80, 55],
      floorBase: [195, 185, 168],
      doorColor: [130, 100, 70],
      stoneBase: [190, 180, 162],
      roadBase: [175, 165, 148],
      roadLine: [155, 145, 128],
      nightGlow: [255, 200, 100],
      nightRadius: 60,
    };
  } else {
    ep = {
      era: 3,
      wallBase: [220, 215, 200],
      wallAccent: [200, 195, 180],
      roofBase: [170, 100, 70],
      roofAccent: [80, 200, 180],
      floorBase: [210, 205, 195],
      doorColor: [100, 180, 165],
      stoneBase: [215, 210, 198],
      roadBase: [195, 190, 178],
      roadLine: [80, 200, 180],
      nightGlow: [80, 220, 200],
      nightRadius: 90,
    };
  }
  // Tint era palette with faction ground color
  let _epFac = FACTIONS[state.faction];
  if (_epFac && _epFac.style && state.faction !== 'rome') {
    let gt = _epFac.style.groundTint;
    let mix = 0.25;
    ep.roadBase = [floor(ep.roadBase[0] * (1 - mix) + gt[0] * mix), floor(ep.roadBase[1] * (1 - mix) + gt[1] * mix), floor(ep.roadBase[2] * (1 - mix) + gt[2] * mix)];
    ep.roadLine = [floor(ep.roadLine[0] * (1 - mix) + gt[0] * mix * 0.7), floor(ep.roadLine[1] * (1 - mix) + gt[1] * mix * 0.7), floor(ep.roadLine[2] * (1 - mix) + gt[2] * mix * 0.7)];
    ep.floorBase = [floor(ep.floorBase[0] * (1 - mix) + gt[0] * mix), floor(ep.floorBase[1] * (1 - mix) + gt[1] * mix), floor(ep.floorBase[2] * (1 - mix) + gt[2] * mix)];
  }
  _eraPaletteCache = ep;
  _eraPaletteCacheFrame = frameCount;
  return ep;
}

// ─── STATE ────────────────────────────────────────────────────────────────
let state;
let _botWorker = null;
let _botWorkerResults = {};
let _botWorkerReady = false;
let cam = { x: 600, y: 400 };
let camSmooth = { x: 600, y: 400 };
let camZoom = 1.0;
let camZoomTarget = 1.0;
const CAM_ZOOM_MIN = 1.0;
const CAM_ZOOM_MIN_SAILING = 0.4;
const CAM_ZOOM_MAX = 2.0;
let particles = [];
let lightningBolts = [];
let stormTimer = 0;
let stormActive = false;
let floatOffset = 0;
let horizonOffset = 0;

let energyArcs = [];
let floatingText = [];
let shakeX = 0, shakeY = 0;

// ─── NARRATION SUBTITLE SYSTEM ───
let _narrationSub = null; // { text, timer, maxTimer }
const NARRATION_TEXTS = {
  wreck_wake: 'You open your eyes to salt and sand. The ship is broken. You are alone.',
  wreck_fire: 'The fire crackles against the dark. Warmth returns, and with it, hope.',
  wreck_sail: 'The makeshift sail catches wind. The sea stretches endlessly before you.',
  first_sail: 'The horizon beckons. For the first time since the wreck, you chart your own course.',
  first_raid: 'Longships on the horizon! The Sea People have come. Defend your island!',
  level_3: 'The settlement grows. What was wreckage is becoming a village.',
  level_5: 'Word of your colony spreads across the waters. Traders take notice.',
  level_8: 'A true town rises from nothing. The gods themselves must be watching.',
  level_10: 'From exile to empire. Your name will echo through the ages.',
  rome_intro: 'Roma Aeterna. The eternal city guides your hand. Build with order and discipline.',
  carthage_intro: 'Carthage rises again. Let gold flow like water through your markets.',
  egypt_intro: 'By the light of Ra, your dynasty begins anew upon these shores.',
  greece_intro: 'Wisdom and beauty shall be your foundation. Athens lives in you.',
  seapeople_intro: 'The sea is your homeland. Take what you need. Fear nothing.',
  persia_intro: 'The King of Kings builds not just walls, but an empire of splendor.',
  phoenicia_intro: 'Every shore is a market. Every wave, a road. Navigate wisely.',
  gaul_intro: 'The forest remembers. The druids whisper. Strength flows from the earth.',
  first_harvest: 'The first grain falls. The land provides for those who tend it.',
  first_build: 'Stone upon stone. A home rises where there was nothing.',
  first_fish: 'The sea gives freely to those with patience.',
  first_combat: 'Steel rings against steel. You will not fall so easily.',
  first_steps: 'The first steps of a long journey. This land will remember you.',
  victory: 'From exile to legend. The Mediterranean is yours. Mare Nostrum.',
  defeat: 'The sea claims another. But legends never truly die.',
  vulcan: 'Heat rises from the earth. The forge-god stirs beneath your feet.',
  necropolis: 'The dead do not rest here. Tread carefully among the tombs.',
  hyperborea: 'Ice and silence. The frozen north holds secrets older than Rome.'
};
function _showNarrationSubtitle(key) {
  let txt = NARRATION_TEXTS[key];
  if (!txt) return;
  _narrationSub = { text: txt, timer: 0, maxTimer: 300 }; // ~5s at 60fps
}
function _drawNarrationSubtitle() {
  if (!_narrationSub) return;
  _narrationSub.timer++;
  if (_narrationSub.timer >= _narrationSub.maxTimer) { _narrationSub = null; return; }
  let t = _narrationSub.timer, mx = _narrationSub.maxTimer;
  let fadeIn = min(1, t / 30), fadeOut = min(1, (mx - t) / 30);
  let al = min(fadeIn, fadeOut);
  push(); noStroke();
  fill(0, 0, 0, 160 * al);
  rect(0, height - 70, width, 70);
  fill(255, 255, 245, 255 * al);
  textAlign(CENTER, CENTER); textFont('Cinzel, serif'); textSize(15);
  text(_narrationSub.text, width / 2, height - 35);
  textAlign(LEFT, TOP);
  pop();
}

// ─── WEATHER IMPACT SYSTEM ───
function getWeatherEffects() {
  let w = (state.weather && state.weather.type) || 'clear';
  return {
    clear:    { farmMult: 1.0, fishMult: 1.0, sailMult: 1.0, combatMult: 1.0, desc: '' },
    cloudy:   { farmMult: 0.9, fishMult: 1.1, sailMult: 1.0, combatMult: 1.0, desc: 'Overcast' },
    rain:     { farmMult: 1.3, fishMult: 0.8, sailMult: 0.8, combatMult: 0.9, desc: 'Rain +30% crops, -20% fishing' },
    storm:    { farmMult: 1.5, fishMult: 0.3, sailMult: 0.5, combatMult: 0.7, desc: 'Storm — dangerous seas!' },
    heatwave: { farmMult: 0.5, fishMult: 1.0, sailMult: 1.0, combatMult: 1.0, desc: 'Heatwave -50% crops' },
    fog:      { farmMult: 0.8, fishMult: 0.6, sailMult: 0.6, combatMult: 0.8, desc: 'Fog — reduced visibility' }
  }[w] || { farmMult: 1.0, fishMult: 1.0, sailMult: 1.0, combatMult: 1.0, desc: '' };
}
let shakeTimer = 0;
// HUD resource pop animation
let hudFlash = {}; // { key: { timer, delta } } — tracks resource changes for pop effect
// Juice globals
let _juiceFreezeFrames = 0; // impact freeze frame counter
let _juiceCombatVignette = 0; // combat vignette intensity (0-1)
let _juiceLevelUpFlash = 0; // level up white flash timer
let _juiceBuildZoom = 0; // camera zoom for build menu
let _juiceSpeedLines = []; // speed line particles for dashing
let _juiceHpShakeTimer = 0; // HP bar shake on damage
let _juiceToolArc = 0; // tool swing arc timer
let _juicePickupMagnetism = true; // pickup magnetism enabled
let _currentIsland = 'home'; // seamless island detection: 'home','vulcan','hyperborea','plenty','necropolis','conquest','water', or nation key
let _doorTransition = null; // {timer, duration, callback, phase: 'out'|'in'}
let starPositions = null;

// Fixed absolute building coordinates — organized districts, no overlaps
// Island center: (600, 400). Walkable area ~500x320.
// Districts: Farm(W), Residential(NW), Center(C), Civic(NE), Market(E), Military(SE), Sacred(N)
const CITY_SLOTS = [
  // ===============================================================
  // ERA 1: VILLAGE (Lv 2-8)
  // ===============================================================

  // --- FARM DISTRICT (left, x:100-430) ---
  { id: 'fence_farm_e1',   x: 145, y: 380, w: 32, h:  8, type: 'fence',       level: 2,  district: 'farm' },
  { id: 'fence_farm_e2',   x: 145, y: 410, w: 32, h:  8, type: 'fence',       level: 2,  district: 'farm' },
  { id: 'fence_nw1',       x: 310, y: 340, w: 32, h:  8, type: 'fence',       level: 4,  district: 'farm' },
  { id: 'crystal_coll',    x: 100, y: 370, w: 40, h: 30, type: 'crystal_collector', level: 5, district: 'farm' },
  { id: 'granary',         x: 392, y: 420, w: 58, h: 44, type: 'granary',     level: 5,  district: 'farm' },
  { id: 'torch_gran_l',    x: 430, y: 420, w:  8, h: 16, type: 'torch',       level: 5,  district: 'farm' },

  // --- CIVIC / PLAZA (center, x:560-700) ---
  { id: 'torch_center',    x: 620, y: 415, w:  8, h: 16, type: 'torch',       level: 2,  district: 'center' },
  { id: 'shrine_civic',    x: 660, y: 340, w: 32, h: 28, type: 'shrine',      level: 3,  district: 'center' },
  { id: 'floor_sacra',     x: 660, y: 370, w: 32, h: 22, type: 'floor',       level: 3,  district: 'center' },
  { id: 'well_center',     x: 630, y: 440, w: 24, h: 24, type: 'well',        level: 4,  district: 'center' },
  { id: 'well_sw',         x: 570, y: 450, w: 24, h: 24, type: 'well',        level: 5,  district: 'center' },

  // --- WINDMILL (farm district, near granary) ---
  { id: 'windmill_farm',   x: 310, y: 420, w: 50, h: 45, type: 'windmill',    level: 6,  district: 'farm' },

  // --- RESIDENTIAL (center-left, x:400-550) ---
  { id: 'house_res1',      x: 420, y: 360, w: 44, h: 34, type: 'house',       level: 6,  district: 'residential' },
  { id: 'house_res2',      x: 480, y: 360, w: 44, h: 34, type: 'house',       level: 6,  district: 'residential' },
  { id: 'torch_res1',      x: 450, y: 385, w:  8, h: 16, type: 'torch',       level: 6,  district: 'residential' },

  // --- MARKET (right, x:850-980) ---
  { id: 'market_1',        x: 870, y: 370, w: 44, h: 34, type: 'market',      level: 7,  district: 'market' },
  { id: 'torch_mkt1a',     x: 844, y: 362, w:  8, h: 16, type: 'torch',       level: 7,  district: 'market' },
  { id: 'torch_mkt1b',     x: 920, y: 362, w:  8, h: 16, type: 'torch',       level: 7,  district: 'market' },

  // --- BATH (residential south, x:440-520) ---
  { id: 'bath_1',          x: 480, y: 430, w: 70, h: 52, type: 'bath',        level: 8,  district: 'residential' },

  // --- MILITARY (far right, x:855-985) ---
  { id: 'castrum',         x: 920, y: 480, w: 130, h: 100, type: 'castrum',    level: 8,  district: 'military' },
  { id: 'wall_cast_l',     x: 855, y: 480, w:  8, h: 50, type: 'wall',        level: 8,  district: 'military' },
  { id: 'wall_cast_r',     x: 985, y: 480, w:  8, h: 50, type: 'wall',        level: 8,  district: 'military' },
  { id: 'wall_cast_top',   x: 920, y: 430, w: 80, h:  8, type: 'wall',        level: 8,  district: 'military' },
  { id: 'watchtower_cast', x: 985, y: 430, w: 24, h: 56, type: 'watchtower',  level: 8,  district: 'military' },
  { id: 'torch_cast_l',    x: 900, y: 500, w:  8, h: 16, type: 'torch',       level: 8,  district: 'military' },
  { id: 'torch_cast_r',    x: 940, y: 500, w:  8, h: 16, type: 'torch',       level: 8,  district: 'military' },

  // ===============================================================
  // ERA 2: CITY (Lv 9-17)
  // ===============================================================

  // --- SACRED (north, x:500-780) ---
  { id: 'aqueduct_1',      x: 500, y: 270, w: 20, h: 40, type: 'aqueduct',    level: 9,  district: 'sacred' },
  { id: 'aqueduct_2',      x: 580, y: 270, w: 20, h: 40, type: 'aqueduct',    level: 9,  district: 'sacred' },
  { id: 'aqueduct_3',      x: 660, y: 270, w: 20, h: 40, type: 'aqueduct',    level: 9,  district: 'sacred' },
  { id: 'bridge_north',    x: 620, y: 310, w: 32, h: 32, type: 'bridge',      level: 9,  district: 'sacred' },

  // --- CIVIC/SACRED temple (x:720-840) ---
  { id: 'temple_main',     x: 760, y: 330, w: 70, h: 50, type: 'temple',      level: 10, district: 'civic' },
  { id: 'torch_temp_l',    x: 720, y: 340, w:  8, h: 16, type: 'torch',       level: 10, district: 'civic' },
  { id: 'torch_temp_r',    x: 800, y: 340, w:  8, h: 16, type: 'torch',       level: 10, district: 'civic' },
  { id: 'floor_temp',      x: 760, y: 370, w: 32, h: 22, type: 'floor',       level: 10, district: 'civic' },

  // --- MARKET expansion (x:790-830) ---
  { id: 'market_2',        x: 810, y: 420, w: 44, h: 34, type: 'market',      level: 10, district: 'market' },

  // --- PLAZA floor (center, x:580-660) ---
  { id: 'plaza_floor',     x: 620, y: 490, w: 64, h: 48, type: 'floor',       level: 10, district: 'center' },
  { id: 'lantern_civ_n',   x: 700, y: 370, w: 10, h: 20, type: 'lantern',     level: 10, district: 'civic' },

  // --- RESIDENTIAL expansion (x:400-540) ---
  { id: 'house_res3',      x: 540, y: 360, w: 44, h: 34, type: 'house',       level: 12, district: 'residential' },
  { id: 'house_res4',      x: 420, y: 320, w: 44, h: 34, type: 'house',       level: 12, district: 'residential' },
  { id: 'well_sw2',        x: 540, y: 400, w: 24, h: 24, type: 'well',        level: 12, district: 'residential' },

  // --- MILITARY walls (x:850-960) ---
  { id: 'wall_mil1',       x: 860, y: 395, w: 32, h:  8, type: 'wall',        level: 13, district: 'military' },
  { id: 'wall_mil2',       x: 892, y: 395, w: 32, h:  8, type: 'wall',        level: 13, district: 'military' },
  { id: 'watchtower_e',    x: 960, y: 370, w: 20, h: 44, type: 'watchtower',  level: 13, district: 'market' },
  { id: 'watchtower_sw',   x: 370, y: 420, w: 20, h: 44, type: 'watchtower',  level: 13, district: 'farm' },

  // --- MARKET 3 (x:920-960) ---
  { id: 'market_3',        x: 930, y: 370, w: 44, h: 34, type: 'market',      level: 13, district: 'market' },

  // --- BATH 2 (civic area, x:650-720) ---
  { id: 'bath_2',          x: 680, y: 440, w: 70, h: 52, type: 'bath',        level: 14, district: 'civic' },
  { id: 'aqueduct_4',      x: 460, y: 270, w: 20, h: 40, type: 'aqueduct',    level: 14, district: 'sacred' },
  { id: 'aqueduct_5',      x: 740, y: 270, w: 20, h: 40, type: 'aqueduct',    level: 14, district: 'sacred' },
  { id: 'bridge_mkt',      x: 660, y: 400, w: 32, h: 32, type: 'bridge',      level: 14, district: 'center' },

  // --- FORUM (center south, x:580-660) ---
  { id: 'forum_main',      x: 620, y: 480, w: 80, h: 60, type: 'forum',       level: 15, district: 'center' },
  { id: 'lantern_f_nw',    x: 575, y: 475, w: 10, h: 20, type: 'lantern',     level: 15, district: 'center' },
  { id: 'lantern_f_ne',    x: 665, y: 475, w: 10, h: 20, type: 'lantern',     level: 15, district: 'center' },
  { id: 'mosaic_forum',    x: 620, y: 520, w: 48, h: 22, type: 'mosaic',      level: 15, district: 'center' },

  // --- GRANARY 2 (farm district supply, x:340-380) ---
  { id: 'granary_2',       x: 350, y: 430, w: 58, h: 44, type: 'granary',     level: 15, district: 'farm' },
  { id: 'arch_east',       x: 960, y: 420, w: 48, h: 52, type: 'arch',        level: 15, district: 'market' },

  // --- RESIDENTIAL row (x:420-540, y:400 row) ---
  { id: 'house_row1',      x: 420, y: 410, w: 44, h: 34, type: 'house',       level: 16, district: 'residential' },
  { id: 'house_row2',      x: 475, y: 410, w: 44, h: 34, type: 'house',       level: 16, district: 'residential' },
  { id: 'house_row3',      x: 530, y: 410, w: 44, h: 34, type: 'house',       level: 16, district: 'residential' },
  { id: 'torch_row1',      x: 448, y: 432, w:  8, h: 16, type: 'torch',       level: 16, district: 'residential' },
  { id: 'torch_row2',      x: 503, y: 432, w:  8, h: 16, type: 'torch',       level: 16, district: 'residential' },
  { id: 'fence_res_back',  x: 475, y: 340, w:160, h:  6, type: 'fence',       level: 16, district: 'residential' },

  // --- LIBRARY (civic/sacred, x:720-790) ---
  { id: 'library',         x: 760, y: 400, w: 72, h: 52, type: 'library',     level: 17, district: 'civic' },
  { id: 'lantern_lib_l',   x: 720, y: 410, w: 10, h: 20, type: 'lantern',     level: 17, district: 'civic' },

  // ===============================================================
  // ERA 3: ATLANTIS (Lv 18-25)
  // ===============================================================

  // --- ARENA removed from main island (now its own island to the north) ---

  // --- MILITARY houses (x:820-870) ---
  { id: 'house_mil1',      x: 830, y: 430, w: 44, h: 34, type: 'house',       level: 19, district: 'military' },
  { id: 'house_mil2',      x: 830, y: 475, w: 44, h: 34, type: 'house',       level: 19, district: 'military' },

  // --- VILLA NW (residential, x:420-500) ---
  { id: 'villa_nw',        x: 460, y: 290, w: 72, h: 52, type: 'villa',       level: 20, district: 'residential' },
  { id: 'flower_vnw_l',    x: 415, y: 290, w: 20, h: 16, type: 'flower',      level: 20, district: 'residential' },
  { id: 'flower_vnw_r',    x: 505, y: 290, w: 20, h: 16, type: 'flower',      level: 20, district: 'residential' },
  { id: 'lantern_vnw',     x: 505, y: 320, w: 10, h: 20, type: 'lantern',     level: 20, district: 'residential' },

  // --- SENATE FORUM (center south, x:560-620) ---
  { id: 'senate_forum',    x: 560, y: 500, w: 64, h: 48, type: 'forum',       level: 21, district: 'center' },
  { id: 'torch_sen_l',     x: 524, y: 510, w:  8, h: 16, type: 'torch',       level: 21, district: 'center' },
  { id: 'torch_sen_r',     x: 596, y: 510, w:  8, h: 16, type: 'torch',       level: 21, district: 'center' },

  // --- HARBOR ARCH (far east, x:950-990) ---
  { id: 'arch_harbor',     x: 970, y: 430, w: 48, h: 52, type: 'arch',        level: 22, district: 'market' },
  { id: 'lantern_h1',      x: 940, y: 430, w: 10, h: 20, type: 'lantern',     level: 22, district: 'market' },

  // --- GRAND AQUEDUCT (sacred, x:420-780) ---
  { id: 'aqueduct_ga1',    x: 420, y: 250, w: 20, h: 40, type: 'aqueduct',    level: 23, district: 'sacred' },
  { id: 'aqueduct_ga2',    x: 780, y: 250, w: 20, h: 40, type: 'aqueduct',    level: 23, district: 'sacred' },
  { id: 'bridge_grand_l',  x: 470, y: 270, w: 32, h: 32, type: 'bridge',      level: 23, district: 'sacred' },
  { id: 'bridge_grand_r',  x: 730, y: 270, w: 32, h: 32, type: 'bridge',      level: 23, district: 'sacred' },

  // --- PALACE (sacred center, x:580-660) ---
  { id: 'palace',          x: 620, y: 250, w: 60, h: 44, type: 'villa',       level: 24, district: 'sacred' },
  { id: 'flower_pal_l',    x: 575, y: 260, w: 20, h: 16, type: 'flower',      level: 24, district: 'sacred' },
  { id: 'flower_pal_r',    x: 665, y: 260, w: 20, h: 16, type: 'flower',      level: 24, district: 'sacred' },
  { id: 'lantern_pal_l',   x: 585, y: 290, w: 10, h: 20, type: 'lantern',     level: 24, district: 'sacred' },
  { id: 'lantern_pal_r',   x: 655, y: 290, w: 10, h: 20, type: 'lantern',     level: 24, district: 'sacred' },

  // --- GRAND TEMPLE (top of sacred hill) ---
  { id: 'grand_temple',    x: 620, y: 195, w: 56, h: 40, type: 'temple',      level: 25, district: 'sacred' },

  // --- ARCH SOUTH (military gate) ---
  { id: 'arch_south',      x: 920, y: 520, w: 48, h: 52, type: 'arch',        level: 25, district: 'military' },

  // --- VILLA SW (residential, x:400-440) ---
  { id: 'villa_sw',        x: 420, y: 460, w: 60, h: 44, type: 'villa',       level: 25, district: 'residential' },

  // --- SACRED PROCESSION (center, x:580-660) ---
  { id: 'mosaic_proc',     x: 620, y: 350, w: 48, h: 22, type: 'mosaic',      level: 25, district: 'sacred' },
  { id: 'lantern_proc_l',  x: 575, y: 350, w: 10, h: 20, type: 'lantern',     level: 25, district: 'sacred' },
  { id: 'lantern_proc_r',  x: 665, y: 350, w: 10, h: 20, type: 'lantern',     level: 25, district: 'sacred' },
];

// [MOVED TO building.js] BLUEPRINTS
// ─── ADJACENCY BONUSES ──────────────────────────────────────────────────────────
// [MOVED TO building.js] ADJACENCY_BONUSES

// [MOVED TO building.js] adjacency functions

// [MOVED TO building.js] ROTATABLE_TYPES

// [MOVED TO building.js] maintenance + repair

// ─── TECH TREE ──────────────────────────────────────────────────────────────
const TECH_TREE = {
  // AGRICULTURE branch
  irrigation:              { name: 'Irrigation',              cost: 50,  branch: 'agriculture', requires: null,                     tier: 0, desc: '+20% crop growth speed' },
  crop_rotation:           { name: 'Crop Rotation',           cost: 100, branch: 'agriculture', requires: 'irrigation',             tier: 1, desc: 'Crops never deplete soil' },
  selective_breeding:      { name: 'Selective Breeding',      cost: 200, branch: 'agriculture', requires: 'crop_rotation',          tier: 2, desc: 'Chance of 2x harvest' },
  agricultural_revolution: { name: 'Agricultural Revolution', cost: 400, branch: 'agriculture', requires: 'selective_breeding',     tier: 3, desc: 'Auto-harvest ripe crops' },
  granary_network:         { name: 'Granary Network',         cost: 600, branch: 'agriculture', requires: 'agricultural_revolution',tier: 4, desc: 'RESEARCH VICTORY 1/4', capstone: true },
  // MARITIME branch
  celestial_navigation:    { name: 'Celestial Navigation',    cost: 50,  branch: 'maritime',    requires: null,                     tier: 0, desc: '+15% sailing speed' },
  advanced_hulls:          { name: 'Advanced Hulls',          cost: 100, branch: 'maritime',    requires: 'celestial_navigation',   tier: 1, desc: 'Trade ships carry more' },
  deep_sea_fishing:        { name: 'Deep Sea Fishing',        cost: 200, branch: 'maritime',    requires: 'advanced_hulls',         tier: 2, desc: 'Unlock rare deep fish' },
  naval_warfare:           { name: 'Naval Warfare',           cost: 400, branch: 'maritime',    requires: 'deep_sea_fishing',       tier: 3, desc: '-50% trade raid chance' },
  mare_nostrum_dominion:   { name: 'Mare Nostrum Dominion',   cost: 600, branch: 'maritime',    requires: 'naval_warfare',          tier: 4, desc: 'RESEARCH VICTORY 2/4', capstone: true },
  // ENGINEERING branch
  masonry:                 { name: 'Masonry',                 cost: 50,  branch: 'engineering',  requires: null,                     tier: 0, desc: '-15% building cost' },
  aqueducts_advanced:      { name: 'Advanced Aqueducts',      cost: 100, branch: 'engineering',  requires: 'masonry',               tier: 1, desc: 'All crops get water bonus' },
  siege_weapons:           { name: 'Siege Weapons',           cost: 200, branch: 'engineering',  requires: 'aqueducts_advanced',    tier: 2, desc: '+30% raid damage' },
  monumental_architecture: { name: 'Monumental Architecture', cost: 400, branch: 'engineering',  requires: 'siege_weapons',         tier: 3, desc: 'Unlock wonder building' },
  eternal_city:            { name: 'Eternal City',            cost: 600, branch: 'engineering',  requires: 'monumental_architecture',tier: 4, desc: 'RESEARCH VICTORY 3/4', capstone: true },
  // PHILOSOPHY branch
  rhetoric:                { name: 'Rhetoric',                cost: 50,  branch: 'philosophy',   requires: null,                     tier: 0, desc: '+20% NPC favor gain' },
  mathematics:             { name: 'Mathematics',             cost: 100, branch: 'philosophy',   requires: 'rhetoric',              tier: 1, desc: '+15% trade profits' },
  natural_philosophy:      { name: 'Natural Philosophy',      cost: 200, branch: 'philosophy',   requires: 'mathematics',           tier: 2, desc: 'Predict weather 1 day ahead' },
  democratic_governance:   { name: 'Democratic Governance',   cost: 400, branch: 'philosophy',   requires: 'natural_philosophy',    tier: 3, desc: 'Population +50%' },
  enlightenment:           { name: 'Enlightenment',           cost: 600, branch: 'philosophy',   requires: 'democratic_governance', tier: 4, desc: 'RESEARCH VICTORY 4/4', capstone: true },
};

const TECH_BRANCHES = ['agriculture', 'maritime', 'engineering', 'philosophy'];
const TECH_BRANCH_NAMES = { agriculture: 'Agriculture', maritime: 'Maritime', engineering: 'Engineering', philosophy: 'Philosophy' };
const TECH_BRANCH_COLORS = { agriculture: [100, 180, 60], maritime: [60, 140, 200], engineering: [200, 160, 60], philosophy: [180, 100, 200] };
const RESEARCH_CAPSTONES = ['granary_network', 'mare_nostrum_dominion', 'eternal_city', 'enlightenment'];

function hasTech(techId) { return state.research && state.research.completed && state.research.completed.includes(techId); }
function canResearch(techId) {
  let tech = TECH_TREE[techId];
  if (!tech) return false;
  if (hasTech(techId)) return false;
  if (tech.requires && !hasTech(tech.requires)) return false;
  return true;
}
function getResearchRate() {
  let base = 25;
  let libLevel = (state.research && state.research.libraryLevel) || 0;
  let rate = base + libLevel * 10;
  // NPC max hearts bonus: +5 per maxed NPC
  let maxH = 10;
  if (state.npc && state.npc.hearts >= maxH) rate += 5;
  if (state.marcus && state.marcus.hearts >= maxH) rate += 5;
  if (state.vesta && state.vesta.hearts >= maxH) rate += 5;
  if (state.felix && state.felix.hearts >= maxH) rate += 5;
  // Adjacency: library near temple = +25% research speed
  let libs = (state.buildings || []).filter(b => b.type === 'library' && !b.ruined);
  for (let lib of libs) {
    if (hasAdjacencyBonus(lib, 'library')) { rate = floor(rate * 1.25); break; }
  }
  return rate;
}
function startResearch(techId) {
  if (!state.research) return;
  if (!canResearch(techId)) return;
  state.research.current = techId;
  state.research.progress = 0;
}
function advanceResearch() {
  if (!state.research || !state.research.current) return;
  let tech = TECH_TREE[state.research.current];
  if (!tech) return;
  let rate = getResearchRate();
  state.research.progress += rate;
  state.research.points += rate;
  if (state.research.progress >= tech.cost) {
    state.research.completed.push(state.research.current);
    addFloatingText(width / 2, height * 0.2, 'Research Complete: ' + tech.name + '!', '#aaddff');
    addNotification('Discovered: ' + tech.name + ' - ' + tech.desc, '#88ccff');
    if (snd) snd.playSFX('skill_unlock');
    spawnParticles(state.player.x, state.player.y, 'divine', 10);
    // Update library level based on library count
    state.research.libraryLevel = (state.buildings || []).filter(b => b.type === 'library').length;
    state.research.current = null;
    state.research.progress = 0;
    // Check research victory
    checkResearchVictory();
  }
}
function grantResearchPoints(amount) {
  if (!state.research) return;
  if (!state.research.current) { state.research.points += amount; return; }
  state.research.progress += amount;
  state.research.points += amount;
  let tech = TECH_TREE[state.research.current];
  if (tech && state.research.progress >= tech.cost) {
    state.research.completed.push(state.research.current);
    addFloatingText(width / 2, height * 0.2, 'Research Complete: ' + tech.name + '!', '#aaddff');
    addNotification('Discovered: ' + tech.name + ' - ' + tech.desc, '#88ccff');
    if (snd) snd.playSFX('skill_unlock');
    state.research.current = null;
    state.research.progress = 0;
    checkResearchVictory();
  }
}
function checkResearchVictory() {
  if (state.victoryAchieved) return;
  let done = RESEARCH_CAPSTONES.every(c => hasTech(c));
  if (done) {
    state.victoryAchieved = 'research';
    state.victoryScreen = { type: 'research', day: state.day, timer: 0 };
    if (snd && snd.playNarration) snd.playNarration('victory');
  }
}
// Victory condition checks for all 4 types
function checkAllVictoryConditions() {
  if (state.victoryAchieved) return;
  // Domination: all nations defeated (military <= 0)
  if (state.nations) {
    let nationKeys = Object.keys(state.nations);
    if (nationKeys.length >= 3 && nationKeys.every(k => state.nations[k] && (state.nations[k].military <= 0 || state.nations[k].vassal))) {
      state.victoryAchieved = 'domination';
      state.victoryScreen = { type: 'domination', day: state.day, timer: 0 };
      if (snd && snd.playNarration) snd.playNarration('victory');
      return;
    }
  }
  // Diplomatic: reputation 50+ with all 3 nations
  if (state.nations) {
    let nationKeys = Object.keys(state.nations);
    if (nationKeys.length >= 3 && nationKeys.every(k => state.nations[k] && state.nations[k].reputation >= 50)) {
      state.victoryAchieved = 'diplomatic';
      state.victoryScreen = { type: 'diplomatic', day: state.day, timer: 0 };
      if (snd && snd.playNarration) snd.playNarration('victory');
      return;
    }
  }
  // Economic: 10000 gold + active trade with all 3 nations
  if (state.nations && state.gold >= 10000) {
    let nationKeys = Object.keys(state.nations);
    if (nationKeys.length >= 3 && nationKeys.every(k => state.nations[k] && state.nations[k].tradeActive)) {
      state.victoryAchieved = 'economic';
      state.victoryScreen = { type: 'economic', day: state.day, timer: 0 };
      if (snd && snd.playNarration) snd.playNarration('victory');
      return;
    }
  }
  // Research: checked in checkResearchVictory()
}
// Get victory progress as 0-1 for each type
function getVictoryProgress() {
  let prog = { domination: 0, diplomatic: 0, economic: 0, research: 0 };
  // Domination: fraction of nations defeated
  if (state.nations) {
    let nk = Object.keys(state.nations);
    if (nk.length > 0) {
      let defeated = nk.filter(k => state.nations[k] && state.nations[k].military <= 0).length;
      prog.domination = defeated / nk.length;
    }
  }
  // Diplomatic: avg reputation / 50
  if (state.nations) {
    let nk = Object.keys(state.nations);
    if (nk.length > 0) {
      let totalRep = nk.reduce((s, k) => s + min(50, (state.nations[k] && state.nations[k].reputation) || 0), 0);
      prog.diplomatic = totalRep / (nk.length * 50);
    }
  }
  // Economic: gold / 10000 (capped at 1)
  prog.economic = min(1, (state.gold || 0) / 10000);
  // Research: capstones completed / 4
  let capsDone = RESEARCH_CAPSTONES.filter(c => hasTech(c)).length;
  prog.research = capsDone / 4;
  return prog;
}

function initState() {
  state = {
    introPhase: 'fade_in', // intro cinematic state: fade_in | wreckage | text | wake_up | done
    introTimer: 0,         // frame counter for intro sequence
    cutscene: null,        // null | 'pre_repair' | 'sailing'
    cutsceneTimer: 0,      // frame counter for active cutscene
    time: 6 * 60,
    day: 1,
    solar: 80,
    maxSolar: 100,
    seeds: 3,
    harvest: 0,
    crystals: 5,
    wood: 5,
    stone: 5,
    gold: 10,
    fish: 0,

    // Fishing
    fishing: { active: false, timer: 0, biteTime: 0, bite: false, caught: false, streak: 0,
      phase: null, phaseTimer: 0, waitDuration: 0, nibbleTimer: 0,
      bobberX: 0, bobberY: 0, bobberDip: 0, strikeWindowEnd: 0, missLine: '' },

    // Diving — underwater exploration
    diving: {
      active: false,
      breath: 100, maxBreath: 100,
      depth: 0,            // 0=surface, 1=shallow, 2=deep
      x: 0, y: 0, vx: 0, vy: 0,
      facing: 'down', swimFrame: 0,
      diveSpot: null,      // which dive zone
      seabed: [],          // { x, y, type } — coral, rock, sand, seagrass
      treasures: [],       // { x, y, type, collected }
      creatures: [],       // { x, y, vx, vy, type, frame }
      bubbles: [],         // rising bubbles
      lightRays: [],       // god rays from surface
      lungCapacity: 0,     // 0-3, each +25 breath
      diveSpeed: 0,        // 0-2, each +20% speed
      pearls: 0, coral: 0, sponges: 0, amphoras: 0,
      totalDives: 0,
    },

    player: {
      x: 600, y: 400,
      vx: 0, vy: 0,
      speed: 3.2,
      size: 16,
      facing: 'down',
      moving: false,
      targetX: null, targetY: null,
      dashTimer: 0,
      dashCooldown: 0,
      trailPoints: [],
      // Combat stats
      hp: 100, maxHp: 100,
      attackTimer: 0, attackCooldown: 25,
      attackDamage: 15, attackRange: 42,
      invincTimer: 0, slashPhase: 0,
      weapon: 0,  // 0=gladius(15dmg), 1=pilum(20dmg,+range), 2=flamma(25dmg)
      armor: 0,   // 0=none, 1=bronze(-3dmg), 2=iron(-6dmg), 3=steel(-10dmg)
      potions: 0, // health potions
      hotbarSlot: 0, // 0-4: sickle, axe, pickaxe, rod, weapon
      toolSwing: 0,  // tool swing animation timer (counts down)
      // Animation state machine
      anim: {
        emotion: 'determined', // determined | weary | happy | alert | peaceful
        emotionTimer: 0,       // frames remaining for temporary emotions
        blinkTimer: 240,       // frames until next blink
        blinkFrame: 0,         // 0=open, 1-3=blinking
        bounceY: 0,            // harvest joy bounce offset
        bounceTimer: 0,        // frames remaining for bounce
        walkFrame: 0,          // 0-3 walk cycle frame
        walkTimer: 0,          // accumulator for walk frame advance
        helmetOff: false,      // cozy mode — no helmet when farming
      },
      defense: 2, levelAtk: 1, // defense and attack bonus from leveling
      // Combat expansion
      level: 1, xp: 0, skillPoints: 0, totalXp: 0,
      comboCount: 0, comboTimer: 0,   // chain attacks within 40 frames for combo
      dodgeTimer: 0, dodgeCooldown: 0, dodgeDir: 0, // dodge roll
      hitPause: 0,                     // 2-frame freeze on hit
      // Skill tree — 3 branches, 3 skills each (0=locked, 1=unlocked)
      skills: {
        // Gladiator
        whirlwind: 0, shieldBash: 0, battleCry: 0,
        // Praetor
        charge: 0, javelin: 0, fortify: 0,
        // Mystic
        crystalBolt: 0, healAura: 0, lightning: 0,
      },
      skillCooldowns: {}, // { skillName: framesLeft }
      fortifyTimer: 0,    // damage reduction active timer
      battleCryTimer: 0,  // soldier buff active timer
    },

    faction: null, // 'rome' | 'carthage' | 'egypt' | 'greece' | 'seapeople' | 'persia' | 'phoenicia' | 'gaul'

    // Sea People raid system
    seaPeopleRaidCooldown: 0,
    seaPeopleRaidActive: false,
    seaPeopleShips: [],

    // God system — faction deity
    god: { faction: null, prayerCooldown: 0, ultimateCharge: 0, blessingActive: null, blessingTimer: 0 },

    wardrobe: { tunicColor: 0, headwear: 0 },

    rowing: {
      active: false,
      x: 0, y: 0,       // boat world position
      angle: 0,          // facing angle (radians)
      speed: 0,
      oarPhase: 0,       // animation phase
      wakeTrail: [],     // water wake particles
      nearIsle: null,    // 'conquest' when near dock
    },

    naval: {
      enemies: [],
      cannonCooldown: 0,
      cannonballs: [],
      wind: { angle: 0, targetAngle: 0, speed: 1, changeTimer: 0 },
      boardingTarget: null,
      shipHP: 100,
      shipMaxHP: 100,
      cannonDamage: 15,
      reloadTime: 60,
      hullLevel: 0,
      cannonLevel: 0,
      sailLevel: 0,
    },

    companion: {
      x: 640, y: 420,
      vx: 0, vy: 0,
      speed: 2.0,
      task: 'idle',
      taskTarget: null,
      carryItem: null,
      energy: 100,
      pulsePhase: 0,
      trailPoints: [],
    },

    // Woodcutter companion — auto-chops trees
    woodcutter: {
      x: 560, y: 380,
      vx: 0, vy: 0,
      speed: 1.8,
      task: 'idle',
      taskTarget: null,
      chopTimer: 0,
      energy: 100,
      pulsePhase: 0,
      trailPoints: [],
    },

    // Centurion — loyal guard, follows player everywhere
    centurion: {
      x: WORLD.islandCX + 30, y: WORLD.islandCY + 10,
      vx: 0, vy: 0,
      speed: 2.8,
      facing: 1,
      task: 'follow', // follow, guard, fight
      target: null,
      attackTimer: 0, attackCooldown: 20,
      attackDamage: 12, attackRange: 30,
      hp: 120, maxHp: 120,
      flashTimer: 0,
    },

    npc: {
      x: WORLD.islandCX - 60, y: WORLD.islandCY + 20,
      hearts: 0,
      dialogTimer: 0,
      currentLine: -1,
      lines: [
        "Ave, handsome. The grain ripens beautifully this season, no?",
        "Venus herself blessed this isle. I can feel it in the warm breeze...",
        "Have you explored the ruins? They say lovers once met there by moonlight.",
        "When the storm comes, hold me close... and the crops grow twice as fast.",
        "Bring me grain and I shall share my wine with you under the cypress.",
        "The cypress sway like dancers... come, let us watch the sunset together.",
        "A strong man tends his fields. I admire that in a centurion.",
        "The trireme brings perfumes from Alexandria. Shall I wear some for you?",
        "My heart races when you bring gifts. What can I say... I am weak for you.",
        "By Bacchus, this wine is divine. Stay a while and drink with me?",
      ],
    },

    // NPC daily wants + favor system
    npcFavor: { livia: 0, marcus: 0, vesta: 0, felix: 0 },
    npcMemory: {},
    lastWantDate: '',
    todayWantsSatisfied: [],
    zonesVisitedToday: [],

    // Crystal shrine — far left side of island, well clear of farm grid
    crystalShrine: {
      x: WORLD.islandCX - 480, y: WORLD.islandCY - 15,
    },

    // Port positions — stored in state, updated on island expansion
    portLeft: null,   // rowboat dock (right side)
    portRight: null,  // merchant dock (left side)

    plots: [],
    resources: [],
    crystalNodes: [],
    ruins: [],
    buildings: [],
    trees: [],          // choppable trees

    // Merchant ship
    ship: {
      x: -300, y: WORLD.islandCY + 60,
      state: 'gone',    // gone, arriving, docked, leaving
      timer: 0,
      dockX: 0, // computed dynamically
      dockY: 0, // computed dynamically
      nextArrival: 600,
      shopOpen: false,
      shopTab: 'buy', // 'buy', 'sell', 'upgrade'
      offers: [],
      gangplank: [],  // temporary bridge tiles when docked
      autoSellTimer: 0,
      autoSellLog: [], // recent auto-sell events for HUD
    },

    // Chickens — ambient farm life
    chickens: [],

    // Harvester companion — auto-harvests ripe crops, delivers to chest
    harvester: {
      x: WORLD.islandCX - 140, y: WORLD.islandCY + 10,
      vx: 0, vy: 0,
      speed: 1.6,
      task: 'idle',      // idle, walking_to_crop, harvesting, walking_to_chest, depositing
      taskTarget: null,   // reference to plot or chest
      carryItem: null,    // 'grain'
      carryCount: 0,
      timer: 0,
      energy: 100,
      pulsePhase: 0,
      trailPoints: [],
    },

    // Quarrier companion — auto-collects stone, unlocks at island level 5
    quarrier: {
      x: WORLD.islandCX + 80, y: WORLD.islandCY + 30,
      vx: 0, vy: 0,
      speed: 1.5,
      task: 'idle',
      taskTarget: null,
      mineTimer: 0,
      energy: 100,
      pulsePhase: 0,
      trailPoints: [],
      unlocked: false,
    },

    // Cook NPC — auto-cooks meals near brazier, unlocks at level 8
    cook: {
      x: WORLD.islandCX - 100, y: WORLD.islandCY + 40,
      vx: 0, vy: 0, speed: 1.2,
      task: 'idle', timer: 0, cookTimer: 0,
      unlocked: false,
    },

    // ─── COMPANION PETS — personality, leveling, gifts ───
    companionPets: {
      cat:       { level: 1, xp: 0, behavior: 'idle', behaviorTimer: 0, giftCooldown: 0, lastGiftDay: -1, nearPlayerTimer: 0, sleepPos: null },
      tortoise:  { level: 1, xp: 0, behavior: 'idle', behaviorTimer: 0, giftCooldown: 0, lastGiftDay: -1, nearPlayerTimer: 0, sleepPos: null,
                   x: WORLD.islandCX + 140, y: WORLD.islandCY + 20, vx: 0, vy: 0, facing: 1, shellTimer: 0, findTimer: 0, lastFindDay: -1 },
      crow:      { level: 1, xp: 0, behavior: 'idle', behaviorTimer: 0, giftCooldown: 0, lastGiftDay: -1, nearPlayerTimer: 0, sleepPos: null,
                   x: WORLD.islandCX, y: WORLD.islandCY - 60, vx: 0, vy: 0, facing: 1, circlePhase: 0, cawTimer: 0, bringTimer: 0, lastBringDay: -1, landed: false, perchTarget: null },
      centurion: { level: 1, xp: 0, behavior: 'idle', behaviorTimer: 0, giftCooldown: 0, lastGiftDay: -1, nearPlayerTimer: 0, sleepPos: null,
                   patrolTimer: 0, saluteTimer: 0, trainTimer: 0, ability: null },
    },

    // Fisherman NPC — sits on boat at shore, brings fish periodically
    fisherman: {
      x: 0, y: 0, // positioned at port on init
      boatX: 0, boatY: 0,
      timer: 0, catchTimer: 0,
      unlocked: false,
      fishCaught: 0,
    },

    // Central pyramid
    pyramid: {
      x: WORLD.islandCX,
      y: WORLD.islandCY - 15,
      level: 1,       // matches island level
      chargePhase: 0,
      charging: false,
      chargeTimer: 0,
    },

    // Temple interior
    insideTemple: false,
    templePetX: 0, templePetY: 0,
    templeJesterAnimTimer: 0,
    templeJesterJokedToday: false,
    templeAdvisorTalked: false,
    templePetAnimTimer: 0,

    // Castrum interior
    insideCastrum: false,
    _castrumReturnX: 0, _castrumReturnY: 0,
    castrumSparAnim: 0,

    // Build mode
    buildMode: false,
    demolishMode: false,
    demolishConfirm: null, // { buildingIndex, building, refund }
    buildType: 'wall',
    buildRotation: 0,

    // Island expansion
    islandLevel: 1,
    islandRX: WORLD.islandRX,
    islandRY: WORLD.islandRY,
    islandName: null,         // set by player at level 10
    islandNamingOpen: false,  // UI overlay flag
    islandNamingInput: '',    // typing buffer
    islandMilestone: null,    // { level, rank, unlocks[], timer }

    // Temple blessing — random buff for 1 day
    blessing: { type: null, timer: 0, cooldown: 0 },

    // NPC quest system
    quest: null, // { type, desc, target, progress, reward }

    // Tool upgrades (0=none, 1=bronze, 2=iron)
    tools: { sickle: 0, axe: 0, net: 0 },
    // Character equipment (WoW-style slots)
    equipment: { head: null, chest: null, legs: null, feet: null, mainHand: null, offHand: null, tool: null, trinket: null },

    // Cats — ambient near ruins
    cats: [],

    // Crop seeds inventory
    grapeSeeds: 0,
    oliveSeeds: 0,
    flaxSeeds: 0,
    pomegranateSeeds: 0,
    lotusSeeds: 0,
    cropSelect: 'grain',

    // Cooking system
    meals: 0,        // cooked meals (grain + fish or harvest + wood)
    wine: 0,         // wine (grape harvest)
    oil: 0,          // olive oil
    stew: 0,         // stew (harvest + fish + wood) — heals 30 HP
    garum: 0,        // garum (3 fish) — trade value 25g
    honeyedFigs: 0,  // honeyed figs (exotic spice + harvest) — +15% XP 1 day
    ambrosia: 0,     // ambrosia (soul essence + wine + crystal) — full heal + invuln
    cooking: { active: false, timer: 0, recipe: null },

    // Weather
    weather: { type: 'clear', timer: 0, intensity: 0 }, // clear, rain, heatwave, fog
    daysSinceRain: 0,
    stormMessageShown: false, // session only, not saved

    // Heart milestones already given
    heartRewards: [],

    // Harvest combo
    harvestCombo: { count: 0, timer: 0, best: 0, bestEver: 0 },

    // Oracle prophecy
    prophecy: null, // { text, effect, type, active }

    // Daily activities tracking (for wreath rating)
    dailyActivities: {
      harvested: 0, fished: 0, built: 0, gifted: 0, cooked: 0,
      catPetted: 0, crystal: 0, chopped: 0
    },
    yesterdayWreaths: 0,
    showSummary: false,
    lastSummary: null,

    // Random events
    activeEvent: null,   // null | { id, timer, data }
    eventCooldown: {},   // { eventId: daysRemaining }
    eventHistory: [],    // [ eventId, ... ] — one-shot tracking

    // Roman festival
    festival: null,

    // Night Market (appears every 7th day at dusk)
    nightMarket: { active: false, shopOpen: false, stock: [] },

    // Message bottles & treasure
    bottles: [], // { x, y, collected: false, message, treasure: { type, x, y, found } }
    activeTreasure: null, // currently hunting treasure

    // Island visitors (random events)
    visitor: null, // { type, x, y, timer, interacted, dialogTimer, currentLine }

    // Temple court — social hub for diplomats, spies, foreign merchants
    templeCourt: {
      visitors: [],  // { type, nationKey, name, color, x, y, timer, traded, offer, greeting, trade }
      lastSpawn: 0,
    },

    // Villa Codex (completionist tracking)
    codex: {
      fishCaught: {}, // { sardine: true, tuna: true, ... }
      cropsGrown: {}, // { grain: true, grape: true, ... }
      buildingsBuilt: {}, // { floor: true, wall: true, ... }
      npcMaxHearts: 0,
      treasuresFound: 0,
      festivalsAttended: 0,
      visitorsTraded: 0,
      bestCombo: 0,
      fish: {},    // Naturalist: { sardine: { caught: true, count: N, firstDay: N } }
      crops: {},   // Naturalist: { grain: { harvested: true, count: N, firstDay: N } }
      enemies: {}, // Naturalist: { wolf: { defeated: true, count: N, firstDay: N } }
      relics: {},  // Naturalist: { bronze_eagle: { found: true, firstDay: N } }
      lore: {},    // Naturalist: { '1': { read: true, firstDay: N } }
    },
    journal: [], // unlocked journal entry IDs: ['shipwreck', 'first_harvest', ...]
    journalOpen: false, // true when viewing journal tab in codex
    codexOpen: false,
    naturalistOpen: false,
    naturalistTab: 0,

    // ─── PROGRESSION LOOP SYSTEMS ───
    achievements: [],        // unlocked achievement IDs
    achievementsPanelOpen: false,
    _achTab: 0,
    _achScroll: 0,
    playerStats: {
      totalGoldEarned: 0,
      cropsHarvested: 0,
      fishCaught: 0,
      enemiesDefeated: 0,
      daysSurvived: 0,
      buildingsBuilt: 0,
      islandsDiscovered: 0,
      timePlayed: 0,         // real seconds
      treesChopped: 0,
      giftsGiven: 0,
      crystalsCollected: 0,
      questsCompleted: 0,
      expeditionsCompleted: 0,
      divesCompleted: 0,
      catsAdopted: 0,
      mealsCooked: 0,
    },
    dailyQuests: [],         // [{ id, desc, type, target, progress, reward }]
    dailyQuestsDay: 0,       // which day the quests were generated for
    milestonesClaimed: [],   // milestone IDs already claimed

    // Screen flash effect
    screenFlash: null,

    // New NPCs
    marcus: {
      x: WORLD.islandCX + WORLD.islandRX - 60, y: WORLD.islandCY + 40,
      hearts: 0, dialogTimer: 0, currentLine: -1, lineIndex: 0,
      present: false, // only when ship is docked or hearts >= 6
      anim: { blinkTimer: 200, blinkFrame: 0, breathe: 0 },
    },
    vesta: {
      x: WORLD.islandCX - 420, y: WORLD.islandCY - 5,
      hearts: 0, dialogTimer: 0, currentLine: -1, lineIndex: 0,
      task: 'idle', taskTarget: null, timer: 0, carryCount: 0,
      anim: { blinkTimer: 260, blinkFrame: 0, breathe: 0 },
    },
    felix: {
      x: WORLD.islandCX - 200, y: WORLD.islandCY - 10,
      hearts: 0, dialogTimer: 0, currentLine: -1, lineIndex: 0,
      anim: { blinkTimer: 180, blinkFrame: 0, breathe: 0 },
    },

    // Conquest Island — wild forested island to colonize (WEST of home)
    conquest: {
      active: false,
      isleX: WORLD.islandCX - 2400,
      isleY: WORLD.islandCY + 0,
      isleRX: 450,
      isleRY: 300,
      trees: [],         // { x, y, hp, maxHp, alive }
      enemies: [],       // wild beasts
      soldiers: [],      // { x, y, vx, vy, hp, target, state, attackTimer, facing, flashTimer }
      buildings: [],     // player-placed buildings { x, y, type }
      spawnTimer: 0,
      woodPile: 0,       // local wood storage
      phase: 'unexplored', // unexplored -> landing -> clearing -> building -> defending -> settled -> colonized
      phaseTimer: 0,
      waveCount: 0,      // defense wave counter
      waveTimer: 0,
      buildMode: false,
      buildType: 'campfire',
      chopTarget: null,   // tree player is chopping
      chopTimer: 0,
      totalKills: 0,
      returnX: 0, returnY: 0,
      // Workers
      workers: [],       // { x, y, vx, vy, task, taskTarget, timer, type:'chopper'|'builder' }
      workerCap: 2,
      blueprintQueue: [], // { x, y, type, progress, maxProgress }
      // Expedition system
      expeditionNum: 0,
      expeditionTimer: 0,
      expeditionTimeLimit: 3600, // ~60s at 60fps
      dangerLevel: 0,
      lootBag: [],        // { type, qty } collected this expedition
      rareSpawnTimer: 0,
      // Colony system — after settling, island becomes a colony
      colonized: false,
      colonyLevel: 0,       // 0=not colonized, 1-10 colony growth
      colonyPlots: [],      // farm plots on colony
      colonyWorkers: 0,     // assigned workers (population)
      colonyIncome: 0,      // gold per day generated
      colonyBuildings: [],  // colony-specific structures { x, y, type, built }
      colonyGrassTufts: [], // decorative grass on colony
      boss: null,            // active boss object or null
      bossDefeated: [],      // list of defeated boss types
      crystalNodes: [],      // { x, y, collected }
      crystalRainDrops: [],   // { x, y, timer, collected } — interactive crystal rain pickups
      hudMinimized: false,
      resourceDeposits: [],  // { x, y, type:'iron'|'stone', hp, maxHp, depleted }
      fishingSpots: [],      // { x, y, cooldown }
      wildlife: [],          // ambient birds/rabbits { x, y, type, vx, vy, timer }
      // V1.2 RTS barracks auto-gen
      barracksLevel: 0,      // 0-9 (index into EXPEDITION_BARRACKS.levels)
      barracksGenTimer: 0,   // countdown to next soldier spawn batch
      stonePile: 0,          // local stone storage for upgrades
      // V1.2 unit types & leveling
      unitLevels: { swordsman: 1, archer: 1, cavalry: 1 },
      unitXP: { swordsman: 0, archer: 0, cavalry: 0 },
      // V1.2 tower levels per building index (keyed by "x,y")
      towerLevels: {},
      towerTimers: {},
    },

    // Imperial Bridge — connects home island to colonized Terra Nova
    imperialBridge: {
      built: false,
      progress: 0,        // 0-100 construction progress
      building: false,     // actively constructing
      segments: [],        // visual bridge segments (generated on build)
    },

    // New island resources
    obsidian: 0,       // Isle of Vulcan — crafting legendary weapons
    frostCrystal: 0,   // Hyperborea — enchantments
    exoticSpices: 0,   // Isle of Plenty — trade / cooking
    soulEssence: 0,    // Necropolis — powerful enchantments

    // Expedition resources (earned on Terra Nova, spent at home)
    ironOre: 0, rareHide: 0, ancientRelic: 0, titanBone: 0,
    expeditionUpgrades: {
      workerSpeed: 0,   // 0-3
      workerCap: 0,     // 0-3
      dangerResist: 0,  // 0-3
      lootBonus: 0,     // 0-3
      soldierHP: 0,     // 0-3
      expeditionTier: 0,// 0-2
    },
    expeditionLog: [],
    upgradeShopOpen: false,

    // Bounty Board — daily expedition challenges
    bountyBoard: {
      day: 0,         // last day bounties were generated
      bounties: [],   // { id, desc, type, target, progress, reward, completed }
    },

    // War horn — rally troops
    warHornCooldown: 0,
    warHornMaxCooldown: 3600, // 60s at 60fps

    // Merchant ship — random trader
    merchant: {
      active: false,
      timer: 0,
      spawnInterval: 7200, // arrives every ~2 min
      dockTimer: 0,
      dockDuration: 1800, // stays 30s
      shopOpen: false,
      stock: [], // { name, desc, cost, resource, effect, bought }
    },

    // Expedition modifiers — choose before departing
    expeditionModifier: null, // null, 'blood_moon', 'foggy', 'sacred', 'golden'
    expeditionModifierSelect: false, // true when showing modifier pick UI

    // Fog of War — revealed tiles on Terra Nova
    fogOfWar: [], // flat grid: 0=hidden, 1=revealed. Reset each expedition

    // ─── PROGRESSION (exile zero-to-hero) ───
    progression: {
      gameStarted: false,
      wreckExplored: false,
      triremeRepaired: false,
      homeIslandReached: false,
      villaCleared: false,
      farmCleared: false,
      aqueductRepaired: false,
      npcsFound: { marcus: false, vesta: false, felix: false },
      companionsAwakened: { lares: false, woodcutter: false, harvester: false, centurion: false },
      tutorialsSeen: {},
    },
    // Tutorial goal system — Chapter 1 step-by-step goals
    tutorialGoal: null, // { text, targetWX, targetWY }
    tutorialGoalStep: 0, // 0=talk to marcus, 1=harvest 3, 2=build house
    tutorialGoalComplete: false,

    // Wreck beach state
    wreck: {
      scavNodes: [],     // { x, y, type, collected }
      triremeHP: 0,      // legacy — kept for save compat, no longer used for repair
      raftProgress: 0,   // 0-100, built from collected materials
      raftBuilt: false,  // true when raftProgress >= 100
      raftWood: 0,       // wood added to raft (need 8)
      raftRope: 0,       // rope added to raft (need 4)
      raftCloth: 0,      // cloth added to raft (need 2)
      campfire: false,   // built campfire
      palms: [],         // { x, y, size, swayPhase, chopped }
      crabs: [],         // { x, y, vx, vy, facing, state, timer, flee }
      decor: [],         // { x, y, type } — shells, driftwood, seaweed
      birds: [],         // { x, y, vx, phase } — fly-by silhouettes
      glints: [],        // { x, y, timer } — sun glints on sand
    },

    // Auto-save
    autoSaveTimer: 0,
    autoSaveInterval: 18000, // every 5 min at 60fps

    // ─── ISLE OF VULCAN (Northwest) — Volcanic island ───
    vulcan: {
      active: false,
      isleX: WORLD.islandCX - 1800, isleY: WORLD.islandCY - 1800,
      isleRX: 320, isleRY: 220,
      phase: 'unexplored', // unexplored | explored | forged
      lavaPools: [],      // { x, y, r, phase } — generated on first visit
      hotSprings: [],     // { x, y, healTimer }
      obsidianNodes: [],  // { x, y, collected }
      forgeBuilt: false,
      forgeRecipes: [],
      ambientAsh: [],     // particle system
      smokeVents: [],     // { x, y, phase }
      returnX: 0, returnY: 0,
    },

    // ─── HYPERBOREA (North) — Frozen island ───
    hyperborea: {
      active: false,
      isleX: WORLD.islandCX + 0, isleY: WORLD.islandCY - 2600,
      isleRX: 350, isleRY: 240,
      phase: 'unexplored', // unexplored | explored | settled
      frozenRuins: [],    // { x, y, looted }
      iceFishing: { active: false, timer: 0, caught: false },
      frostNodes: [],     // { x, y, collected }
      penguins: [],       // { x, y, vx, vy, state, timer }
      snowflakes: [],     // particle system
      auroraBorealis: 0,  // intensity 0-1, active at night
      returnX: 0, returnY: 0,
    },

    // ─── ISLE OF PLENTY (Southeast) — Tropical paradise ───
    plenty: {
      active: false,
      isleX: WORLD.islandCX + 1800, isleY: WORLD.islandCY + 1800,
      isleRX: 380, isleRY: 260,
      phase: 'unexplored', // unexplored | explored | colonized
      fruitTrees: [],     // { x, y, type, fruit, timer }
      parrots: [],        // { x, y, vx, vy, color, state }
      waterfalls: [],     // { x, y, h }
      spiceNodes: [],     // { x, y, collected }
      colonyFarms: [],    // farm plots (3x harvest)
      fallingLeaves: [],  // particle system
      returnX: 0, returnY: 0,
    },

    // ─── NECROPOLIS (Southwest) — Ancient burial island ───
    necropolis: {
      active: false,
      isleX: WORLD.islandCX - 1800, isleY: WORLD.islandCY + 1800,
      isleRX: 300, isleRY: 200,
      phase: 'unexplored', // unexplored | explored | cleansed
      tombs: [],          // { x, y, looted, trapped }
      skeletons: [],      // enemies { x, y, vx, vy, hp, maxHp, attackTimer, facing, flashTimer }
      ghostNPCs: [],      // { x, y, name, line, talked }
      soulNodes: [],      // { x, y, collected }
      wisps: [],          // particle system — ghostly lights
      darkAura: 0,        // atmospheric darkness level
      returnX: 0, returnY: 0,
    },

    // ─── RIVAL (Carthage AI) ─────────────────────────────────────────────
    rival: {
      faction: 'carthage',
      level: 1,
      buildings: [],
      population: 5,
      gold: 100,
      military: 3,
      aggression: 0.3,
      reputation: 0,
      tradeActive: false,
      lastRaid: 0,
      lastTradeDay: 0,
      defeated: false,
      allied: false,
      raidParty: [],
      raidWarning: 0,
      diplomacyOpen: false,
      isleX: WORLD.islandCX + 1800,
      isleY: WORLD.islandCY - 1800,
      isleRX: 280,
      isleRY: 190,
    },

    // ─── PERSONAL RIVAL (recurring nemesis NPC) ────────────────────────
    personalRival: {
      name: null, faction: null, level: 1, reputation: 0,
      lastEncounter: 0, defeated: 0, encounters: 0,
      alliance: false, tradePartner: false, invading: false,
    },
    globalReputation: 50, // 0-100: Outlaw/Distrusted/Neutral/Respected/Legendary
    rivalEncounter: null, // active encounter state or null

    // ─── NATIONS (AI rivals — all factions except player's) ─────────────
    nations: {}, // populated by initNations() after faction selection
    nationDiplomacyOpen: null, // which nation's diplomacy panel is open (key or null)
    visitingNation: null, // key of nation island currently visiting (or null)
    nationIsland: null,   // { npcs, buildings, dock, palace, walls, trees } — generated on enter
    worldEvents: [],      // { text, factionA, factionB, day, type }
    victoryAchieved: null, // null | 'domination' | 'diplomatic' | 'economic' | 'research'

    // ─── RESEARCH / TECHNOLOGY ────────────────────────────────────────
    research: {
      points: 0,           // accumulated research points (lifetime)
      current: null,       // currently researching tech id
      progress: 0,         // 0-100 progress on current tech
      completed: [],       // list of completed tech ids
      libraryLevel: 0,     // library building level (boosts rate)
    },
    techTreeOpen: false,   // true when tech tree UI is showing

    // ─── ECONOMY SYSTEM ─────────────────────────────────────────────────
    // Trade routes between colonies
    tradeRoutes: [], // { id, from, to, resource, amount, frequency, shipId, active, timer, gold }
    tradeRouteUI: false, // true when trade route management panel is open

    // Merchant fleet — ships that sail between islands
    fleet: [], // { id, x, y, routeId, cargo, state, speed, type, angle, wakeTrail }
    // Ship types: 'fishing' | 'trade' | 'war'
    nextShipId: 1,

    // Colony specialization (chosen at colony level 3)
    colonySpec: {}, // { 'conquest': 'agricultural' | 'mining' | 'military' | 'trading' | 'sacred' }
    colonies: {}, colonyManageOpen: false, colonyManageSelected: null,

    // Crafted advanced resources
    steel: 0,    // Iron Ore + Wood (at forge)
    marble: 0,   // Stone + Crystal (at quarry)
    perfume: 0,  // Wine + Harvest (at market — exotic blend)
    scrolls: 0,  // Ancient Relic + Oil (at library)

    // Imperial Treasury
    treasury: {
      totalEarned: 0,     // lifetime gold earned
      dailyIncome: 0,     // last calculated daily income
      dailyExpense: 0,    // soldier upkeep + route costs
      rank: 'Pauper',     // treasury rank title
      milestones: [],     // unlocked milestone IDs
    },

    // Prestige system (New Game+)
    prestige: { count: 0, totalScore: 0, unlockedBuildings: [] },
    score: { goldEarned: 0, buildingsBuilt: 0, questsCompleted: 0, fishCaught: 0, enemiesDefeated: 0, daysSurvived: 0 },
    automation: { granaryAuto: false, fishingPier: false, tradeRouteAuto: false, watchtowerAuto: false },

    // Victory
    won: false,          // true after Imperator ceremony completes
    victoryCeremony: null, // { timer, phase } — active victory cutscene

    // Legia military system
    legia: {
      recruits: 0, maxRecruits: 10, trainingQueue: 0, trainingTimer: 0,
      castrumLevel: 0, castrumX: 0, castrumY: 0, deployed: 0, legiaUIOpen: false,
      soldiers: [], // { x, y, hp, maxHp, facing, state: 'patrol'|'idle', patrolTimer, targetX, targetY }
      army: [],     // { type, hp, maxHp, damage, speed, garrison, state, attackTimer }
      morale: 100,  // 0-100, drops if can't pay upkeep
      expeditionTarget: null, // island name string or null
      marching: false,
    },

    _expedSummary: null, // expedition victory overlay { timer, kills, gold, loot, soldiersStart, soldiersLost, isDeath }
    // Food consumption
    foodShortage: 0,     // consecutive days without enough food

    isInitialized: false,
  };
  buildIsland();
  state.prophecy = generateProphecy();
  // Spawn initial wild cats
  spawnWildCat();
  spawnWildCat();
}

function buildIsland() {
  let cx = WORLD.islandCX, cy = WORLD.islandCY;
  let srx = getSurfaceRX(), sry = getSurfaceRY();
  updatePortPositions();

  // ─── ZONE LAYOUT ───
  // Left: farm garden | Center: pyramid + NPC | Right: forest grove
  // Ring: crystals | Edges: ruins + palms

  // Farm plots — dedicated rectangular grid on the left
  state.plots = [];
  rebuildFarmGrid(1);

  // Ambient citizens
  state.citizens = [];

  // Chickens near farm
  state.chickens = [];
  let farmCX = WORLD.islandCX - 340, farmCY = WORLD.islandCY - 5;
  for (let i = 0; i < 3; i++) {
    state.chickens.push({
      x: farmCX + random(-60, 60), y: farmCY + random(-30, 30),
      vx: 0, vy: 0, facing: random() > 0.5 ? 1 : -1,
      timer: random(60, 200), pecking: false, peckTimer: 0,
      color: [random(180, 220), random(140, 180), random(80, 120)],
    });
  }

  // Cats near ruins
  state.cats = [];
  state.cats.push({
    x: cx + 200, y: cy - 30,
    vx: 0, vy: 0, facing: 1,
    timer: random(100, 300), state: 'idle', // idle, walking, sitting, gifting
    giftTimer: 0,
    color: [random(60, 100), random(50, 80), random(40, 60)], // dark fur
  });
  state.cats.push({
    x: cx - 250, y: cy + 10,
    vx: 0, vy: 0, facing: -1,
    timer: random(100, 300), state: 'sitting',
    giftTimer: 0,
    color: [random(180, 220), random(140, 170), random(100, 130)], // orange tabby
  });


  // Faction wildlife — ambient creatures
  state.factionWildlife = [];
  let fWild = FACTION_WILDLIFE[state.faction || 'rome'] || FACTION_WILDLIFE.rome;
  for (let wi = 0; wi < 5; wi++) {
    let template = fWild[wi % fWild.length];
    let wa = random(TWO_PI), wd = random(0.2, 0.55) * srx;
    state.factionWildlife.push({
      x: cx + cos(wa) * wd, y: cy + sin(wa) * wd * (sry / srx),
      vx: 0, vy: 0, type: template.type, speed: template.speed, size: template.size,
      timer: random(60, 300), phase: random(TWO_PI), facing: random() > 0.5 ? 1 : -1,
    });
  }

  // Faction flora — ground cover positions (deterministic)
  state.factionFlora = [];
  let fFlora = FACTION_FLORA[state.faction || 'rome'] || FACTION_FLORA.rome;
  randomSeed(99);
  for (let fi = 0; fi < 20; fi++) {
    let fa = random(TWO_PI), fd = random(0.15, 0.6) * srx;
    let fx = cx + cos(fa) * fd, fy = cy + sin(fa) * fd * (sry / srx);
    let template = fFlora[fi % fFlora.length];
    state.factionFlora.push({ x: fx, y: fy, col: template.col, w: template.w, h: template.h, phase: random(TWO_PI) });
  }
  randomSeed(millis());

  // Trees — natural grove flanking the road, loosely organized
  state.trees = [];
  let texcl = getTempleExclusion();
  let pyrCX = state.pyramid ? state.pyramid.x : cx;
  let pyrCY = state.pyramid ? state.pyramid.y : (cy - 15);
  let avenueY = cy - 8; // road centerline
  // Seed RNG for consistent placement
  randomSeed(42);
  // Grove on far east perimeter only — well past civic/market zone
  let treeSlots = [];
  for (let tx = cx + 380; tx <= cx + 460; tx += 48 + random(-6, 6)) {
    // Upper row — offset varies naturally
    treeSlots.push({ x: tx + random(-6, 6), y: avenueY - 30 - random(0, 16) });
    // Lower row
    treeSlots.push({ x: tx + random(-6, 6), y: avenueY + 30 + random(0, 16) });
  }
  randomSeed(millis()); // restore random
  for (let slot of treeSlots) {
    let tx = slot.x, ty = slot.y;
    // Skip if off island surface
    let ex = (tx - cx) / srx, ey = (ty - cy) / sry;
    if (ex * ex + ey * ey > 0.65) continue;
    // Temple exclusion
    let pcx = tx - pyrCX, pcy = ty - pyrCY;
    if (pcx * pcx + pcy * pcy < texcl * texcl) continue;
    let idx = state.trees.length;
    state.trees.push({
      x: tx, y: ty,
      health: 3, maxHealth: 3, alive: true, regrowTimer: 0,
      size: 0.75 + (idx * 7 % 11) * 0.04, swayPhase: idx * 1.3 + (idx % 3) * 0.7,
      type: getFactionTreeTypes()[idx % 3],
    });
  }

  // Crystal nodes — arranged around crystal shrine (left side)
  state.crystalNodes = [];
  let shrineX = state.crystalShrine.x, shrineY = state.crystalShrine.y;
  let crystalSlots = [
    { dx: -30, dy: -20 },  // left of shrine
    { dx:  30, dy: -20 },  // right of shrine
    { dx: -40, dy:  15 },  // front left
    { dx:  40, dy:  15 },  // front right
    { dx:   0, dy: -35 },  // behind shrine (altar center)
  ];
  crystalSlots.forEach((slot, i) => {
    state.crystalNodes.push({
      x: shrineX + slot.dx, y: shrineY + slot.dy,
      size: 12 + i * 2, phase: i * 1.2, charge: 40 + i * 15,
      respawnTimer: 0,
    });
  });

  // Resources — placed at fixed positions in dedicated zones
  state.resources = [];
  let resourceSlots = [
    // South resource strip
    { x: cx - 80, y: cy + 45, type: 'stone' },
    { x: cx - 40, y: cy + 50, type: 'vine' },
    { x: cx + 40, y: cy + 50, type: 'leaf' },
    { x: cx + 80, y: cy + 45, type: 'stone' },
    // East of grove
    { x: cx + 280, y: cy - 20, type: 'vine' },
    { x: cx + 260, y: cy + 15, type: 'leaf' },
    // West of farm
    { x: cx - 250, y: cy + 35, type: 'stone' },
    { x: cx - 230, y: cy + 45, type: 'vine' },
    // North edge
    { x: cx - 40, y: cy - 70, type: 'leaf' },
    { x: cx + 40, y: cy - 65, type: 'stone' },
  ];
  resourceSlots.forEach(slot => {
    let rx = slot.x, ry = slot.y;
    // Clamp to island surface
    let ex = (rx - cx) / srx, ey = (ry - cy) / sry;
    if (ex * ex + ey * ey > 0.72) {
      let sc = 0.70 / sqrt(ex * ex + ey * ey);
      rx = cx + (rx - cx) * sc;
      ry = cy + (ry - cy) * sc;
    }
    state.resources.push({
      x: rx, y: ry,
      type: slot.type,
      active: true, respawnTimer: 0, pulsePhase: random(TWO_PI),
    });
  });

  // Ruin fragments — inside walkable area, away from center
  state.ruins = [];
  let ruinAngles = [PI * 0.25, PI * 0.75, PI * 1.25]; // top-right, bottom-left, left
  ruinAngles.forEach(a => {
    let rx, ry, placed = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      let r = random(0.45, 0.65);
      rx = cx + cos(a) * srx * r;
      ry = cy + sin(a) * sry * r * 0.6; // flatten Y to stay inside ellipse
      let pdist = sqrt((rx - cx) * (rx - cx) + (ry - cy) * (ry - cy));
      if (pdist < 160) { a += 0.2; continue; }
      let fdx = rx - farmCX, fdy = ry - farmCY;
      if (fdx * fdx / (120 * 120) + fdy * fdy / (55 * 55) < 1) { a += 0.2; continue; }
      placed = true;
      break;
    }
    if (placed) {
      state.ruins.push({
        x: rx, y: ry,
        w: random(25, 40), h: random(15, 28),
        rot: random(-0.08, 0.08),
      });
    }
  });

  // ─── GRASS TUFTS — tall, around island perimeter ───
  state.grassTufts = [];
  let grx = getSurfaceRX(), gry = getSurfaceRY();
  for (let i = 0; i < 70; i++) {
    let angle = (i / 70) * TWO_PI + random(-0.1, 0.1);
    let rim = random(0.72, 0.95);
    let gx = cx + cos(angle) * grx * rim;
    let gy = cy + sin(angle) * gry * rim;
    // Skip pyramid zone (140px)
    if ((gx - cx) * (gx - cx) + (gy - cy) * (gy - cy) < 140 * 140) continue;
    // Skip farm zone
    let fdx = gx - farmCX, fdy = gy - farmCY;
    if (fdx * fdx / (110 * 110) + fdy * fdy / (50 * 50) < 1) continue;
    // Skip near any plot
    let nearPlot = state.plots.some(p => {
      let pdx = gx - p.x, pdy = gy - p.y;
      return pdx * pdx + pdy * pdy < 30 * 30;
    });
    if (nearPlot) continue;
    // Skip near ruins
    let nearRuin = state.ruins.some(ru => {
      let rdx = gx - ru.x, rdy = gy - ru.y;
      return rdx * rdx + rdy * rdy < 35 * 35;
    });
    if (nearRuin) continue;
    // Check distance from all existing grass
    let tooClose = state.grassTufts.some(g2 => {
      let ddx = gx - g2.x, ddy = gy - g2.y;
      return ddx * ddx + ddy * ddy < 25 * 25;
    });
    if (tooClose) continue;
    state.grassTufts.push({
      x: gx, y: gy,
      blades: floor(random(4, 9)),
      height: random(12, 24),
      hue: random(0.7, 1.0),
      sway: random(TWO_PI),
    });
  }

  // Player's first structure — campfire near island center
  state.buildings.push({ x: cx + 20, y: cy + 15, w: 16, h: 16, type: 'campfire', rot: 0 });

  initCitizens();

  state.isInitialized = true;
}

// ─── PRELOAD ─────────────────────────────────────────────────────────────
function preload() {
  menuBgImg = loadImage('menu_bg.webp');
}

// ─── SETUP ────────────────────────────────────────────────────────────────
function setup() {
  pixelDensity(1);
  createCanvas(windowWidth, windowHeight);
  noSmooth();
  frameRate(60);
  noCursor();
  initState();
  colorMode(RGB);
  textFont('monospace');
  // Start on menu — full opacity immediately
  gameScreen = 'menu';
  menuFadeIn = 200;
  // Sound system
  snd = new SoundManager();
  // Disable right-click context menu on canvas
  document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
  // Right-click cancels click-to-move
  document.addEventListener('mousedown', function(e) {
    if (e.button === 2 && state && state.player) {
      state.player.targetX = null; state.player.targetY = null;
      state.player.vx = 0; state.player.vy = 0; state.player.moving = false;
    }
  });
  // Pause on window blur (alt-tab)
  window.addEventListener('blur', function() { if (gameScreen === 'game' && state) state._paused = true; });
  // Pathfinding
  if (typeof initPathfinding === 'function') initPathfinding();
  // Load sprite sheets (falls back gracefully if PNGs missing)
  SpriteManager.loadAll();
  // Hide loading screen now that everything is initialized
  let loadEl = document.getElementById('loading');
  if (loadEl) { loadEl.style.opacity = '0'; setTimeout(() => loadEl.remove(), 800); }
}

function startNewGame() {
  initState();
  trackMilestone('game_start');
  // ─── SHIPWRECK START: player begins on barren wreck beach ───
  state.progression.gameStarted = true;
  state.journal = ['shipwreck'];
  state.introPhase = 'fade_in';
  state.introTimer = 0;

  // Spawn on wreck beach, not home island
  state.player.x = WRECK.cx + 40;
  state.player.y = WRECK.cy + 10;
  state.player.facing = 'right';
  cam.x = state.player.x; cam.y = state.player.y;
  camSmooth.x = cam.x; camSmooth.y = cam.y;

  // Minimal starting inventory — exile has almost nothing
  state.seeds = 0; state.harvest = 0; state.wood = 0; state.stone = 0;
  state.crystals = 0; state.gold = 0; state.fish = 0;
  state.grapeSeeds = 0; state.oliveSeeds = 0; state.flaxSeeds = 0; state.pomegranateSeeds = 0; state.lotusSeeds = 0;
  state.meals = 0; state.wine = 0; state.oil = 0;
  state.solar = 20; // low energy, dawn of exile

  // Populate wreck beach — 3 zones with survival crafting
  let wcx = WRECK.cx, wcy = WRECK.cy;
  state.wreck.scavNodes = [
    // === WRECK AREA (south) — driftwood, sailcloth, rope, tools ===
    { x: wcx - 70, y: wcy + 12, type: 'driftwood', collected: false },
    { x: wcx + 60, y: wcy + 18, type: 'driftwood', collected: false },
    { x: wcx - 30, y: wcy + 30, type: 'driftwood', collected: false },
    { x: wcx + 110, y: wcy + 5, type: 'driftwood', collected: false },
    { x: wcx - 100, y: wcy + 25, type: 'driftwood', collected: false },
    // Sailcloth (2 scattered on beach)
    { x: wcx + 40, y: wcy - 8, type: 'sailcloth', collected: false },
    { x: wcx - 80, y: wcy + 20, type: 'sailcloth', collected: false },
    // Rope (1 in wreck hull)
    { x: wcx - 65, y: wcy - 15, type: 'rope', collected: false },
    // Hammer (from wreck hull — needed to build)
    { x: wcx - 75, y: wcy - 5, type: 'hammer', collected: false },
    // Flint (from wreck hull — needed for fire)
    { x: wcx - 60, y: wcy + 2, type: 'flint', collected: false },
    // === TIDE POOLS (east) ===
    { x: wcx + 160, y: wcy + 10, type: 'rope', collected: false },
    // === JUNGLE EDGE (north) — berries, palm fronds ===
    { x: wcx + 130, y: wcy - 25, type: 'palmfrond', collected: false },
    { x: wcx - 130, y: wcy - 20, type: 'palmfrond', collected: false },
    { x: wcx + 90, y: wcy - 30, type: 'berries', collected: false },
    { x: wcx - 90, y: wcy - 28, type: 'berries', collected: false },
    // === FOOD SOURCES ===
    { x: wcx + 120, y: wcy - 10, type: 'coconut', collected: false },
    { x: wcx - 110, y: wcy - 8, type: 'coconut', collected: false },
    { x: wcx + 160, y: wcy + 2, type: 'coconut', collected: false },
    // Washed-up fish (for hunger + cat befriending)
    { x: wcx + 80, y: wcy + 35, type: 'fish', collected: false },
    { x: wcx - 50, y: wcy + 38, type: 'fish', collected: false },
    { x: wcx + 30, y: wcy + 42, type: 'fish', collected: false },
    { x: wcx - 20, y: wcy + 40, type: 'fish', collected: false },
    // Water sources
    { x: wcx - 140, y: wcy - 25, type: 'freshwater', collected: false },
    { x: wcx - 160, y: wcy - 30, type: 'spring', collected: false },
  ];
  state.wreck.triremeHP = 0;
  state.wreck.raftProgress = 0;
  state.wreck.raftBuilt = false;
  state.wreck.raftWood = 0;
  state.wreck.raftRope = 0;
  state.wreck.raftCloth = 0;
  state.wreck.campfire = false;
  // Survival init
  state.wreck.thirst = 80;
  state.wreck.hunger = 70;
  state.wreck.shelter = false;
  state.wreck.hasFire = false;
  state.wreck.sleepingInShelter = false;
  state.wreck.wreckDayStart = state.day;
  state.wreck.nightSurvived = false;
  state.wreck.caveDiscovered = false;
  state.wreck.jungleExplored = false;
  state.wreck.tidePoolsExplored = false;
  state.wreck.catFishGiven = 0;
  state.wreck.catFishOnGround = null;
  state.wreck.inventory = {
    driftwood: 0, sailcloth: 0, rope: 0, hammer: 0, flint: 0,
    palmFrond: 0, raftFrame: false, seaworthyRaft: false,
  };

  // Palm trees (7 swaying palms — more for jungle edge zone)
  state.wreck.palms = [
    { x: wcx + 140, y: wcy - 15, size: 1.0, swayPhase: 0, chopped: false },
    { x: wcx - 120, y: wcy - 12, size: 0.85, swayPhase: 1.5, chopped: false },
    { x: wcx + 170, y: wcy + 5, size: 0.9, swayPhase: 3.0, chopped: false },
    { x: wcx - 150, y: wcy + 8, size: 0.75, swayPhase: 4.5, chopped: false },
    { x: wcx + 90, y: wcy - 18, size: 0.95, swayPhase: 2.2, chopped: false },
    { x: wcx + 110, y: wcy - 28, size: 0.8, swayPhase: 5.0, chopped: false },
    { x: wcx - 100, y: wcy - 25, size: 0.9, swayPhase: 1.0, chopped: false },
  ];

  // Crabs (7 — more in tide pool zone)
  state.wreck.crabs = [];
  for (let i = 0; i < 7; i++) {
    let crabZone = i < 4 ? 0 : 1;
    state.wreck.crabs.push({
      x: crabZone === 0 ? wcx + (i - 2) * 50 + random(-20, 20) : wcx + 140 + random(-30, 30),
      y: crabZone === 0 ? wcy + 10 + random(-5, 15) : wcy + random(-5, 20),
      vx: 0, vy: 0,
      facing: random() > 0.5 ? 1 : -1,
      state: 'idle',
      timer: random(60, 200),
      bubbleTimer: random(100, 300),
    });
  }

  // Beach decor — seashells, driftwood, seaweed patches
  state.wreck.decor = [
    { x: wcx - 40, y: wcy + 18, type: 'shell' },
    { x: wcx + 70, y: wcy + 22, type: 'shell' },
    { x: wcx + 25, y: wcy + 28, type: 'shell' },
    { x: wcx - 100, y: wcy + 15, type: 'shell' },
    { x: wcx + 155, y: wcy + 18, type: 'shell' },
    { x: wcx - 55, y: wcy + 25, type: 'driftwood' },
    { x: wcx + 100, y: wcy + 30, type: 'driftwood' },
    { x: wcx + 30, y: wcy + 32, type: 'seaweed' },
    { x: wcx - 80, y: wcy + 30, type: 'seaweed' },
    { x: wcx + 140, y: wcy + 28, type: 'seaweed' },
  ];

  // Stray cat — runs away until befriended with fish (3 fish needed)
  state.wreck.cat = {
    x: wcx + 200, y: wcy - 10,
    vx: 0, vy: 0, facing: -1,
    state: 'hidden',
    timer: 1800,        // ~30s before appearing (visible but skittish)
    meowTimer: 0,
    giftTimer: 0,
    giftCount: 0,
    chaseTarget: null,
    introduced: false,
    color: [200, 130, 50],
  };

  // Flying birds (ambient)
  state.wreck.birds = [];
  state.wreck.glints = [];

  // Home island starts ruined — companions/NPCs hidden
  state.progression.homeIslandReached = false;
  state.progression.villaCleared = false;
  state.progression.farmCleared = false;

  initConquestIsland();
  initNarrativeState();
  gameScreen = 'game';
  factionSelectActive = true; factionSelectFade = 0;
  noCursor();
}

function startLoadGame() {
  initState();
  let _hasSave = false;
  try { _hasSave = !!localStorage.getItem(_SAVE_KEY); } catch(e) {}
  if (_hasSave) {
    loadGame();
    state.introPhase = 'done';
    initConquestIsland();
    if (typeof generateDailyQuests === 'function' && (!state.dailyQuests || state.dailyQuests.length === 0 || state.dailyQuestsDay !== state.day)) generateDailyQuests();
    if (typeof checkDayMilestones === 'function') checkDayMilestones();
    initNarrativeState();
    // Snap camera to player position (might be on wreck or home)
    cam.x = state.player.x; cam.y = state.player.y;
    camSmooth.x = cam.x; camSmooth.y = cam.y;
    state._paused = false;
    gameScreen = 'game';
    noCursor();
  }
}

function returnToMenu() {
  gameScreen = 'menu';
  menuFadeIn = 200;
  menuHover = -1;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  starPositions = null; // regenerate for new size
  if (typeof _initTouchButtons === 'function') _initTouchButtons();
}

// ─── CAMERA ───────────────────────────────────────────────────────────────
let _camIdleFrames = 0;
let _camTransitionFrames = 0; // fast lerp during dock/undock
function _startCamTransition() { _camTransitionFrames = 30; }
function updateCamera() {
  // Smooth follow player — bias upward so horizon stays visible
  cam.x = state.player.x;
  cam.y = state.player.y - height * 0.12; // player sits in lower 60% of screen
  let _camLerp = 0.08;
  if (_camTransitionFrames > 0) { _camLerp = lerp(0.08, 0.25, _camTransitionFrames / 30); _camTransitionFrames--; }
  camSmooth.x = lerp(camSmooth.x, cam.x, _camLerp);
  camSmooth.y = lerp(camSmooth.y, cam.y, _camLerp);

  // Island expansion visual lerp (Feature 2)
  if (state._expandFrames > 0) {
    state._expandFrames--;
    let t = 1 - state._expandFrames / 120;
    let eased = t * (2 - t);
    state.islandRX = lerp(state._expandVisualRX, state._expandTargetRX, eased);
    state.islandRY = lerp(state._expandVisualRY, state._expandTargetRY, eased);
    if (state._expandFrames <= 0) {
      state.islandRX = state._expandTargetRX;
      state.islandRY = state._expandTargetRY;
      delete state._expandVisualRX;
      delete state._expandVisualRY;
      delete state._expandTargetRX;
      delete state._expandTargetRY;
    }
  }

  // Expansion camera zoom-out effect (Feature 2)
  if (state._expandCamZoom > 0) {
    state._expandCamZoom--;
    let t = state._expandCamZoom / 180;
    let zoomOut = sin(t * PI) * 0.15;
    camSmooth.x = lerp(camSmooth.x, WORLD.islandCX, zoomOut);
    camSmooth.y = lerp(camSmooth.y, WORLD.islandCY - height * 0.1, zoomOut);
  }

  // Build mode camera pull-back (gentle zoom-out feel)
  if (state.buildMode) {
    _juiceBuildZoom = min(1, _juiceBuildZoom + 0.03);
    let bz = _juiceBuildZoom * 0.08;
    camSmooth.x = lerp(camSmooth.x, WORLD.islandCX, bz);
    camSmooth.y = lerp(camSmooth.y, WORLD.islandCY - height * 0.1, bz);
  } else if (_juiceBuildZoom > 0) {
    _juiceBuildZoom = max(0, _juiceBuildZoom - 0.05);
  }

  // Camera idle breathe (Feature 4)
  let p = state.player;
  if (!p.moving && abs(p.vx || 0) < 0.1 && abs(p.vy || 0) < 0.1) {
    _camIdleFrames++;
  } else {
    _camIdleFrames = 0;
  }
  if (_camIdleFrames > 60) {
    camSmooth.x += sin(frameCount * 0.015) * 0.3;
    camSmooth.y += sin(frameCount * 0.011) * 0.2;
  }

  // When not sailing, ensure zoom doesn't stay below 1.0
  if (!state.rowing || !state.rowing.active) {
    if (camZoomTarget < CAM_ZOOM_MIN) camZoomTarget = CAM_ZOOM_MIN;
  }
  // Smooth zoom interpolation
  camZoom = lerp(camZoom, camZoomTarget, 0.1);
}

function w2sX(wx) {
  return (wx - camSmooth.x) + width / 2;
}

function w2sY(wy) {
  return (wy - camSmooth.y) + height / 2;
}

function s2wX(sx) {
  return (sx - width / 2) / camZoom + camSmooth.x;
}

function s2wY(sy) {
  return (sy - height / 2) / camZoom + camSmooth.y;
}

// Surface radii match the drawn grass ellipse
function getSurfaceRX() { return state.islandRX * 0.90; }
function getSurfaceRY() { return state.islandRY * 0.36; }

// Dynamic farm center — scales with island size so farm doesn't crowd temple
function getFarmCenterX() { return WORLD.islandCX - 340; }
function getFarmCenterY() { return WORLD.islandCY - 5; }

// Check if world point is on the walkable grass surface
function isOnIsland(wx, wy) {
  let dx = (wx - WORLD.islandCX) / getSurfaceRX();
  let dy = (wy - WORLD.islandCY) / getSurfaceRY();
  return (dx * dx + dy * dy) <= 1.0;
}

// ═══ WRECK SYSTEM — moved to wreck.js ═════════════════════════

// Check if point is on a bridge tile (player-built or ship gangplank)
function isOnBridge(wx, wy) {
  let onBuilt = state.buildings.some(b => {
    if (b.type !== 'bridge') return false;
    return wx >= b.x - b.w / 2 - 4 && wx <= b.x + b.w / 2 + 4 &&
           wy >= b.y - b.h / 2 - 4 && wy <= b.y + b.h / 2 + 4;
  });
  if (onBuilt) return true;
  // Check ship gangplank
  if (state.ship && state.ship.gangplank) {
    return state.ship.gangplank.some(g => {
      return wx >= g.x - g.w / 2 - 4 && wx <= g.x + g.w / 2 + 4 &&
             wy >= g.y - g.h / 2 - 4 && wy <= g.y + g.h / 2 + 4;
    });
  }
  return false;
}

// Check if point is on the harbor pier (extends right from port into water)
function isOnPier(wx, wy) {
  let port = getPortPosition();
  let pierLeft = port.x - 30;
  let pierRight = port.x + 150;
  let pierTop = port.y - 15;
  let pierBot = port.y + 30; // extend south to reach the boat position
  return wx >= pierLeft && wx <= pierRight && wy >= pierTop && wy <= pierBot;
}

// Check if point is in shallow water (just beyond island edge)
function isInShallows(wx, wy) {
  let dx = (wx - WORLD.islandCX) / getSurfaceRX();
  let dy = (wy - WORLD.islandCY) / getSurfaceRY();
  let d = dx * dx + dy * dy;
  return d > 1.0 && d <= 1.15; // ~15% beyond island edge
}

function getAllIslandPositions() {
  let islands = [
    { x: WORLD.islandCX, y: WORLD.islandCY, rx: getSurfaceRX(), ry: getSurfaceRY(), key: 'home' },
  ];
  if (state.conquest) islands.push({ x: state.conquest.isleX, y: state.conquest.isleY, rx: state.conquest.isleRX, ry: state.conquest.isleRY, key: 'conquest' });
  if (state.vulcan) islands.push({ x: state.vulcan.isleX, y: state.vulcan.isleY, rx: state.vulcan.isleRX, ry: state.vulcan.isleRY, key: 'vulcan' });
  if (state.hyperborea) islands.push({ x: state.hyperborea.isleX, y: state.hyperborea.isleY, rx: state.hyperborea.isleRX, ry: state.hyperborea.isleRY, key: 'hyperborea' });
  if (state.plenty) islands.push({ x: state.plenty.isleX, y: state.plenty.isleY, rx: state.plenty.isleRX, ry: state.plenty.isleRY, key: 'plenty' });
  if (state.necropolis) islands.push({ x: state.necropolis.isleX, y: state.necropolis.isleY, rx: state.necropolis.isleRX, ry: state.necropolis.isleRY, key: 'necropolis' });
  for (let k of Object.keys(state.nations || {})) {
    let n = state.nations[k];
    if (n && n.isleX) islands.push({ x: n.isleX, y: n.isleY, rx: n.isleRX || 300, ry: n.isleRY || 200, key: k });
  }
  return islands;
}

// ═══ SEAMLESS ISLAND DETECTION (V4.0) ════════════════════════════════
function updateCurrentIsland() {
  if (!state || !state.player) return;
  let px = state.player.x, py = state.player.y;
  let prev = _currentIsland;
  // Skip detection during cutscenes, temple, wreck
  if (state.insideTemple || state.cutscene || state.introPhase !== 'done') return;
  if (state.conquest.active) return;
  if (state.rowing && state.rowing.active) { _currentIsland = 'water'; if (prev !== 'water') onIslandTransition(prev, 'water'); return; }

  if (isOnIsland(px, py)) { _currentIsland = 'home'; }
  else {
    let found = false;
    for (let isle of getAllIslandPositions()) {
      if (isle.key === 'home') continue;
      let dx = (px - isle.x) / isle.rx, dy = (py - isle.y) / isle.ry;
      if (dx * dx + dy * dy < 1.0) { _currentIsland = isle.key; found = true; break; }
    }
    if (!found) _currentIsland = 'water';
  }
  if (prev !== _currentIsland) {
    state.insideTemple = false;
    state.insideCastrum = false;
    if (state.legia) state.legia.legiaUIOpen = false;
    onIslandTransition(prev, _currentIsland);
  }
}

function onIslandTransition(from, to) {
  // Clear active nation when leaving any nation island
  if (state._activeNation && from && state.nations && state.nations[from]) {
    state._activeNation = null;
    state._invasionTarget = null;
  }
  if (to === 'water' || to === from) return;
  // Seamless exploration island entry
  let _exploIsles = ['vulcan','hyperborea','plenty','necropolis'];
  if (_exploIsles.includes(to)) {
    let isle = state[to];
    if (isle && isle.phase === 'unexplored') {
      if (to === 'vulcan') enterVulcanContent();
      else if (to === 'hyperborea') enterHyperboreContent();
      else if (to === 'plenty') enterPlentyContent();
      else if (to === 'necropolis') enterNecropolisContent();
    }
    if (!isle.frozenObelisk && to === 'hyperborea') isle.frozenObelisk = { x: isle.isleX, y: isle.isleY };
    if (state.narrativeFlags) state.narrativeFlags['discover_' + to] = true;
    // Play island-specific narration on first visit
    if (snd && snd.playNarration) {
      if (to === 'vulcan') snd.playNarration('vulcan');
      else if (to === 'necropolis') snd.playNarration('necropolis');
      else if (to === 'hyperborea') snd.playNarration('hyperborea');
    }
    trackMilestone('first_island');
    state._activeExploration = to;
  }
  if (_exploIsles.includes(from)) { state._activeExploration = null; }
  // Seamless nation island entry — generate content at world coords
  if (to && state.nations && state.nations[to]) {
    let rv = state.nations[to];
    if (rv && !rv.defeated) {
      if (!rv._nationContent) {
        rv._nationContent = generateNationIslandContent(to);
      }
      state._activeNation = to;
      trackMilestone('visit_nation_' + to);
    }
  }
  let name = null;
  if (to === 'home') name = 'HOME ISLAND';
  else if (to === 'vulcan') name = 'ISLE OF VULCAN';
  else if (to === 'hyperborea') name = 'HYPERBOREA';
  else if (to === 'plenty') name = 'ISLE OF PLENTY';
  else if (to === 'necropolis') name = 'NECROPOLIS';
  else if (to === 'conquest') name = 'TERRA NOVA';
  else if (typeof getNationName === 'function') name = getNationName(to).toUpperCase();
  if (name) addFloatingText(width / 2, height * 0.3, name, '#ffcc44');
}

function getCurrentIsland() { return _currentIsland; }
function shouldDrawHomeContent() { return _currentIsland === 'home'; }
function isNearAnyIsland(wx, wy, range) {
  range = range || 300;
  let islands = getAllIslandPositions();
  for (let isle of islands) {
    let dx = (wx - isle.x) / (isle.rx + range);
    let dy = (wy - isle.y) / (isle.ry + range);
    if (dx * dx + dy * dy < 1) return true;
  }
  return false;
}

function isOnAnyIslandSurface(wx, wy) {
  let islands = getAllIslandPositions();
  for (let isle of islands) {
    let dx = (wx - isle.x) / isle.rx;
    let dy = (wy - isle.y) / isle.ry;
    if (dx * dx + dy * dy <= 1.15) return true;
  }
  return false;
}

function findNearestIsland(wx, wy) {
  let islands = getAllIslandPositions();
  let best = islands[0], bestD = Infinity;
  for (let isle of islands) {
    let dx = (wx - isle.x) / isle.rx;
    let dy = (wy - isle.y) / isle.ry;
    let d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = isle; }
  }
  return best;
}

// Check if a point is walkable (on island, shallows, bridge, pier, swimming, or imperial bridge)
function isWalkable(wx, wy) {
  // Temple room — rectangular boundary
  if (state && state.insideTemple) {
    return abs(wx - TEMPLE_ROOM.cx) <= TEMPLE_ROOM.hw && abs(wy - TEMPLE_ROOM.cy) <= TEMPLE_ROOM.hh;
  }
  // Castrum room — rectangular boundary
  if (state && state.insideCastrum) {
    return abs(wx - CASTRUM_ROOM.cx) <= CASTRUM_ROOM.hw && abs(wy - CASTRUM_ROOM.cy) <= CASTRUM_ROOM.hh;
  }
  // While diving, player can swim in wider water area around island
  if (state && state.diving && state.diving.active) {
    let dx = (wx - WORLD.islandCX) / (state.islandRX * 2.0);
    let dy = (wy - WORLD.islandCY) / (state.islandRY * 0.8);
    return dx * dx + dy * dy < 1;
  }
  // On any island surface (includes shallows)
  if (isOnAnyIslandSurface(wx, wy)) return true;
  // Bridges/piers
  if (isOnBridge(wx, wy) || isOnPier(wx, wy) || isOnImperialBridge(wx, wy)) return true;
  // Universal swimming — walkable in water near any island
  if (!state.rowing.active && isNearAnyIsland(wx, wy, 300)) return true;
  return false;
}

// [MOVED TO building.js] isBlockedByBuilding

// Get distance from island surface edge (negative = inside, positive = outside)
function islandEdgeDist(wx, wy) {
  let dx = (wx - WORLD.islandCX) / getSurfaceRX();
  let dy = (wy - WORLD.islandCY) / getSurfaceRY();
  return sqrt(dx * dx + dy * dy) - 1.0;
}

// Spawn a random point guaranteed to be on the grass surface
function randomIslandPoint(margin) {
  margin = margin || 0.85;
  let angle = random(TWO_PI);
  let r = random(0.2, margin);
  return {
    x: WORLD.islandCX + cos(angle) * getSurfaceRX() * r,
    y: WORLD.islandCY + sin(angle) * getSurfaceRY() * r,
  };
}

// Spawn a point that doesn't overlap existing world objects, pyramid, or farm zone
function spawnClear(margin, minDist) {
  minDist = minDist || 40;
  let cx = WORLD.islandCX, cy = WORLD.islandCY;
  for (let attempt = 0; attempt < 30; attempt++) {
    let pt = randomIslandPoint(margin);
    let ok = true;
    // Pyramid exclusion zone (150px radius around center)
    let pdx = pt.x - cx, pdy = pt.y - cy;
    if (pdx * pdx + pdy * pdy < 150 * 150) { continue; }
    // Farm zone exclusion (left side arc)
    let farmCX = WORLD.islandCX - 340, farmCY = WORLD.islandCY - 5;
    let fdx = pt.x - farmCX, fdy = pt.y - farmCY;
    if (fdx * fdx / (110 * 110) + fdy * fdy / (50 * 50) < 1) { continue; }
    // Check against all placed objects
    let allObjs = [
      ...state.trees, ...state.crystalNodes, ...state.ruins,
      ...state.plots, ...state.resources
    ];
    if (state.npc) allObjs.push(state.npc);
    for (let o of allObjs) {
      let dx = pt.x - o.x;
      let dy = pt.y - o.y;
      if (dx * dx + dy * dy < minDist * minDist) { ok = false; break; }
    }
    if (ok) return pt;
  }
  return randomIslandPoint(margin);
}

// Snap to grid
function snapToGrid(v) {
  return Math.round(v / WORLD.tileSize) * WORLD.tileSize;
}

// ─── MAIN DRAW ────────────────────────────────────────────────────────────
let _prevTime = 0;
let _delta = 0.016; // seconds per frame
let _fpsSmooth = 60;
let _lowFpsFrames = 0;
let _particleCap = 200;
let _jumpingFish = [];

// ─── FRAME BUDGET MONITOR ─────────────────────────────────────────────────
let _frameBudget = { start: 0, _prevStart: 0, last: 16, avg: 16, overBudget: 0, throttled: false, recoveryFrames: 0 };

function isOnScreen(wx, wy, margin) {
  margin = margin || 50;
  let sx = w2sX(wx), sy = w2sY(wy);
  return sx > -margin && sx < width + margin && sy > -margin && sy < height + margin;
}

function draw() {
  _frameBudget.start = performance.now();
  // Engine camera bounds for culling
  if (typeof Engine !== 'undefined') Engine.updateCamBounds(camSmooth.x, camSmooth.y, width / camZoom, height / camZoom);
  // Delta time
  let now = millis();
  _delta = constrain((now - _prevTime) / 1000, 0.001, 0.1);
  _prevTime = now;
  // Impact freeze frame — pause game for N frames on critical hit
  if (_juiceFreezeFrames > 0) {
    _juiceFreezeFrames--;
    return; // skip entire frame
  }
  // Slow-motion effect (boss defeated, dramatic moments)
  if (typeof _slowMoFrames !== 'undefined' && _slowMoFrames > 0) {
    _delta *= 0.25; // quarter speed
    _slowMoFrames--;
  }
  _fpsSmooth = lerp(_fpsSmooth, 1 / _delta, 0.05);

  // ─── FPS WATCHDOG + FRAME BUDGET ───
  if (_fpsSmooth < 30) { _lowFpsFrames++; } else { _lowFpsFrames = 0; }
  // Measure previous frame duration (start was set at top of previous draw())
  if (_frameBudget._prevStart > 0) {
    _frameBudget.last = _frameBudget.start - _frameBudget._prevStart;
    _frameBudget.avg = lerp(_frameBudget.avg, _frameBudget.last, 0.1);
  }
  _frameBudget._prevStart = _frameBudget.start;
  if (_frameBudget.avg > 18) _frameBudget.overBudget++;
  else _frameBudget.overBudget = max(0, _frameBudget.overBudget - 1);
  // Auto-throttle: engage after ~0.5s of lag
  if (_frameBudget.overBudget > 30 && !_frameBudget.throttled) {
    _frameBudget.throttled = true;
    _particleCap = 100;
    _frameBudget.recoveryFrames = 0;
  }
  // Recovery: restore after 60 frames of good performance
  if (_frameBudget.throttled) {
    if (_frameBudget.overBudget === 0) _frameBudget.recoveryFrames++;
    else _frameBudget.recoveryFrames = 0;
    if (_frameBudget.recoveryFrames > 60) {
      _frameBudget.throttled = false;
      _particleCap = 200;
    }
  } else if (_particleCap < 200) {
    _particleCap = min(_particleCap + 1, 200);
  }

  // ─── MUSIC (plays on all screens) ───
  if (snd && snd.ready) {
    if (typeof gameSettings !== 'undefined' && gameSettings.musicSource === 'recorded') {
      snd.updateMusic();
    } else {
      snd.updateLyre();
    }
  }

  // ─── SCREEN ROUTER ───
  if (gameScreen === 'menu' || gameScreen === 'settings' || gameScreen === 'credits' || gameScreen === 'multiplayer' || gameScreen === 'howtoplay') {
    menuFadeIn = min(menuFadeIn + _delta * 255, 255); // 1 sec fade-in
    if (menuFadeOut > 0) {
      menuFadeOut = min(menuFadeOut + _delta * 510, 255); // 0.5 sec fade-out
      if (menuFadeOut >= 255 && menuFadeAction) { menuFadeAction(); menuFadeAction = null; menuFadeOut = 0; }
    }
    drawMenuScreen();
    // Debug console — must draw on menu screens too
    if (typeof Debug !== 'undefined') Debug.draw();
    return;
  }

  // ─── LOBBY SCREEN ───
  if (gameScreen === 'lobby') {
    if (typeof updateLobbyMovement === 'function') updateLobbyMovement();
    if (typeof drawLobby === 'function') drawLobby();
    if (typeof Debug !== 'undefined') Debug.draw();
    return;
  }

  // ─── GAME SCREEN ───
  if (!state.isInitialized) return;
  // ─── REAL-TIME AUTOSAVE (every 5 min, skip combat) ───
  state.autoSaveTimer++;
  if (state.autoSaveTimer >= state.autoSaveInterval &&
      !state.conquest.active) {
    state.autoSaveTimer = 0;
    saveGame();
  }
  try { drawInner(); } catch(err) {
    console.error('draw error:', err.message, err.stack);
    console.error('state:', (state.conquest && state.conquest.active) ? 'conquest' : 'home',
      'enemies:', state.conquest && state.conquest.enemies ? state.conquest.enemies.length : 0,
      'soldiers:', state.conquest && state.conquest.soldiers ? state.conquest.soldiers.length : 0);
    if (state.conquest && state.conquest.active && state._drawErrors > 5) {
      console.error('Too many conquest errors, forcing exit');
      state.conquest.active = false;
      state.conquest.enemies = [];
      state.conquest.soldiers = [];
      state.conquest.workers = [];
      state.conquest.phase = 'landing';
      state.rowing.active = false;
      state.player.x = WORLD.islandCX;
      state.player.y = WORLD.islandCY;
      state.player.hp = state.player.maxHp;
      cam.x = state.player.x; cam.y = state.player.y;
      camSmooth.x = cam.x; camSmooth.y = cam.y;
      state._drawErrors = 0;
    }
    state._drawErrors = (state._drawErrors || 0) + 1;
  }
  // Debug console — ALWAYS draw on top of everything, every screen
  if (typeof Debug !== 'undefined') Debug.draw();
}
// ─── DITHER HELPERS ───
let _b4 = [0,8,2,10, 12,4,14,6, 3,11,1,9, 15,7,13,5]; // 4x4 Bayer matrix (constant)
function _dith(x, y, t) {
  return t * 16 > _b4[(y & 3) * 4 + (x & 3)];
}


// ═══ MENU SYSTEM — moved to menu.js ═════════════════════════════════════════
// ═══ CINEMATICS — moved to cinematics.js ════════════════════════════════════
// Functions: drawIntroCinematic, skipIntro, startPreRepairCutscene,
// drawPreRepairCutscene, startSailingCutscene, drawSailingCutscene,
// skipCutscene, doFirstRepair, completeSailToHome


function drawInner() {
  // Clear canvas so zoomed-out edges don't show stale frames
  if (camZoom < 0.99) background(10, 18, 35);
  floatOffset = sin(frameCount * 0.015) * 1.5;
  let dt = min(2, _delta * 60);
  if (state._paused) dt = 0; // freeze all updates when paused

  // ─── INTRO CINEMATIC ─────────────────────────────────────────────────
  if (state.introPhase !== 'done') {
    drawIntroCinematic(dt);
    return;
  }

  // ─── CUTSCENES (pre-repair, sailing) ─────────────────────────────────
  if (state.cutscene === 'pre_repair') {
    drawPreRepairCutscene(dt);
    return;
  }
  if (state.cutscene === 'sailing') {
    drawSailingCutscene(dt);
    return;
  }
  if (state.cutscene === 'home_sunrise') {
    drawHomeSunriseCinematic(dt);
    return;
  }

  // ─── FACTION SELECT SCREEN ───────────────────────────────────────────
  if (factionSelectActive) {
    drawFactionSelect(dt);
    return;
  }

  // === TEMPLE INTERIOR (main engine) ===
  if (state.insideTemple) {
    updateDoorTransition();
    updateTime(dt);
    updatePlayer(dt);
    updatePlayerAnim(dt);
    // Reduce particle effects inside temple (calm space)
    if (particles && particles.length > 10) particles.length = 10;
    updateParticles(dt);
    updateFloatingText(dt);
    updateShake(dt);
    // Temple ambient: slow day/night cycle (always warm indoor lighting)
    if (state.time !== undefined) state._templeTimeBackup = state.time;
    // Pet animal occasional sounds (every ~30 seconds = 1800 frames)
    if (!state._templePetSoundTimer) state._templePetSoundTimer = 0;
    state._templePetSoundTimer++;
    if (state._templePetSoundTimer >= 1800) {
      state._templePetSoundTimer = 0;
      if (snd) {
        var _hall = TEMPLE_HALLS[state.faction || 'rome'] || TEMPLE_HALLS.rome;
        if (_hall.pet === 'cat') snd.playSFX('cat_meow');
        else if (_hall.pet === 'owl' || _hall.pet === 'falcon' || _hall.pet === 'parrot') snd.playSFX('bird_chirp');
        else if (_hall.pet === 'wolf' || _hall.pet === 'boar') snd.playSFX('oar_splash'); // low rumble as bark substitute
        else snd.playSFX('click'); // generic small sound for crab/monkey etc
      }
    }
    cam.x = TEMPLE_ROOM.cx; cam.y = TEMPLE_ROOM.cy - height * 0.06;
    camSmooth.x = lerp(camSmooth.x, cam.x, 0.1);
    camSmooth.y = lerp(camSmooth.y, cam.y, 0.1);
    camZoom = lerp(camZoom, camZoomTarget, 0.1);
    if (state.player.y > TEMPLE_ROOM.cy + TEMPLE_ROOM.hh - 10 && !_doorTransition) {
      if (snd) snd.playSFX('door_close');
      let _rx = state._templeReturnX, _ry = state._templeReturnY;
      startDoorTransition(function() {
        state.insideTemple = false;
        state.player.x = _rx; state.player.y = _ry;
        camSmooth.x = _rx; camSmooth.y = _ry - height * 0.12;
      });
    }
    push();
    translate(width / 2, height / 2);
    scale(camZoom);
    translate(-width / 2, -height / 2);
    push();
    translate(shakeX, shakeY + floatOffset);
    drawTempleRoom();
    drawPlayer();
    drawParticles();
    drawFloatingText();
    pop();
    pop();
    drawHUD();
    drawTempleRoomHUD();
    if (!screenshotMode) drawCursor();
    drawGameVignette();
    drawDoorTransition();
    drawSaveIndicator();
    return;
  }

  // === CASTRUM INTERIOR (main engine) ===
  if (state.insideCastrum) {
    updateDoorTransition();
    updateTime(dt);
    updatePlayer(dt);
    updatePlayerAnim(dt);
    updateParticles(dt);
    updateFloatingText(dt);
    updateShake(dt);
    state.castrumSparAnim = (state.castrumSparAnim + dt) % 240;
    cam.x = CASTRUM_ROOM.cx; cam.y = CASTRUM_ROOM.cy - height * 0.06;
    camSmooth.x = lerp(camSmooth.x, cam.x, 0.1);
    camSmooth.y = lerp(camSmooth.y, cam.y, 0.1);
    camZoom = lerp(camZoom, camZoomTarget, 0.1);
    if (state.player.y > CASTRUM_ROOM.cy + CASTRUM_ROOM.hh - 10 && !_doorTransition) {
      if (snd) snd.playSFX('door_close');
      let _rx = state._castrumReturnX, _ry = state._castrumReturnY;
      startDoorTransition(function() {
        state.insideCastrum = false;
        if (state.legia) state.legia.legiaUIOpen = false;
        state.player.x = _rx; state.player.y = _ry;
        camSmooth.x = _rx; camSmooth.y = _ry - height * 0.12;
      });
    }
    push();
    translate(width / 2, height / 2);
    scale(camZoom);
    translate(-width / 2, -height / 2);
    push();
    translate(shakeX, shakeY + floatOffset);
    drawCastrumRoom();
    drawPlayer();
    drawParticles();
    drawFloatingText();
    pop();
    pop();
    drawHUD();
    drawCastrumRoomHUD();
    if (!screenshotMode) drawCursor();
    drawGameVignette();
    drawDoorTransition();
    drawSaveIndicator();
    return;
  }

  updateTime(dt);
  updateCurrentIsland();
  // Safety: ensure castrumLevel matches building state
  if (state.islandLevel >= 8 && state.legia && state.legia.castrumLevel < 1 && state.buildings.some(b => b.type === 'castrum')) {
    state.legia.castrumLevel = 1;
  }
  // Openworld: force-clear legacy teleport flags every frame
  if (state.visitingNation) state.visitingNation = null;
  if (state.vulcan && state.vulcan.active) state.vulcan.active = false;
  if (state.hyperborea && state.hyperborea.active) state.hyperborea.active = false;
  if (state.plenty && state.plenty.active) state.plenty.active = false;
  if (state.necropolis && state.necropolis.active) state.necropolis.active = false;
  // Safety: if player is lost in deep ocean (not near any island, not rowing), teleport home
  // Skip during wreck beach (player is at -4800,0 which is far from all islands)
  let _onWreck = (state.progression.gameStarted && !state.progression.homeIslandReached) || (state.wreck && state.wreck._visiting);
  if (state.player && !state.rowing.active && !_onWreck && typeof isNearAnyIsland === 'function' &&
      !isNearAnyIsland(state.player.x, state.player.y, 500) && !state.insideTemple && !state.insideCastrum) {
    state.player.x = WORLD.islandCX;
    state.player.y = WORLD.islandCY;
    cam.x = state.player.x; cam.y = state.player.y;
    camSmooth.x = cam.x; camSmooth.y = cam.y;
    addNotification('Washed ashore on your island...', '#88ddff');
  }
  updateTutorialHint(dt);
  if (snd && frameCount % 10 === 0) { snd.updateAmbient(); }

  // === WRECK BEACH MODE — before home island is reached, or revisiting ===
  if (((state.progression.gameStarted && !state.progression.homeIslandReached) || state.wreck._visiting) &&
      !state.rowing.active && !state.conquest.active) {
    updateWreckBeach(dt);
    updatePlayerAnim(dt);
    updateParticles(dt);
    updateFloatingText(dt);
    updateShake(dt);
    updateCamera();

    horizonOffset = height * 0.19;
    push();
    translate(width / 2, height / 2);
    scale(camZoom);
    translate(-width / 2, -height / 2);

    push();
    translate(shakeX, shakeY);
    drawSky();
    drawOcean();
    if (typeof drawOceanWildlife === 'function') drawOceanWildlife();
    if (typeof drawAtmosphericHaze === 'function') drawAtmosphericHaze();
    // Warm golden-hour tint
    noStroke();
    fill(255, 200, 100, 12);
    rect(0, 0, width, height);
    pop();

    push();
    translate(shakeX, shakeY + floatOffset);
    drawWreckIsland();
    drawWreckEntities();
    drawPlayer();
    drawParticles();
    drawFloatingText();
    pop();

    pop(); // end zoom

    drawWreckHUD();
    drawTutorialHintUI();
    drawScreenFlash();
    drawCursor();
    drawSaveIndicator();
    return;
  }

  // Legacy island active modes removed -- V4.0 seamless system handles rendering

  if (state.conquest.active) {
    // === CONQUEST MODE ===
    updatePlayerCombat(dt);
    updatePlayerAnim(dt);
    try { updateConquest(dt); } catch(e) { console.error('updateConquest crash:', e.message, e.stack); }
    if (typeof updateCombatSystem === 'function') updateCombatSystem(dt);
    if (typeof updateArmyBattle === 'function') updateArmyBattle(dt);
    if (typeof updatePlayerEscort === 'function') updatePlayerEscort(dt);
    if (typeof updateEconomySystem === 'function') updateEconomySystem(dt);
    try { updateCenturion(dt); } catch(e) { console.error('updateCenturion crash:', e); }
    updateParticles(dt);
    updateFloatingText(dt);
    updateShake(dt);
    updateCamera();

    // Sky + ocean — push horizon above island's visible water effects
    horizonOffset = height * 0.19;
    push(); translate(width/2,height/2); scale(camZoom); translate(-width/2,-height/2);
    push();
    translate(shakeX, shakeY);
    drawSky();
    drawOcean();
    if (typeof drawOceanWildlife === 'function') drawOceanWildlife();
    if (typeof drawAtmosphericHaze === 'function') drawAtmosphericHaze();
    pop();

    // Conquest island
    push();
    translate(shakeX, shakeY);
    drawConquestIsland();
    drawConquestEntities();
    if (typeof drawCombatOverlay === 'function') drawCombatOverlay();
    if (typeof drawPlayerProjectiles === 'function') drawPlayerProjectiles();
    if (typeof drawFactionAoEs === 'function') drawFactionAoEs();
    if (typeof drawEconomyWorldOverlay === 'function') drawEconomyWorldOverlay();
    drawFogOfWar();
    drawParticles();
    drawFloatingText();
    drawModifierAtmosphere();
    pop();
    pop(); // end zoom

    drawConquestHUD();
    if (typeof drawFactionAbilityHUD === 'function') drawFactionAbilityHUD();
    if (typeof drawEconomyUIOverlay === 'function') drawEconomyUIOverlay();
    drawModifierSelectUI();
    drawBountyBoard();
    if (typeof drawLevelUpPopup === 'function') drawLevelUpPopup();
    drawScreenFlash();
    drawCursor();
  } else {
    // === NORMAL ISLAND MODE ===
    // Tutorial hints for new UI features
    // Contextual tutorial hints (show-once)
    if (state.player.moving && !state.progression.tutorialsSeen.wasd) {
      state.progression.tutorialsSeen.wasd = true;
    }
    if (!state.progression.tutorialsSeen.wasd && state.progression.homeIslandReached) {
      showTutorialHintOnce('wasd', 'WASD to move', state.player.x, state.player.y - 40);
    }
    if (state.progression.npcsFound.marcus && !state.progression.tutorialsSeen.interact) {
      showTutorialHintOnce('interact', 'Press E near objects to interact', state.player.x, state.player.y - 40);
    }
    if ((state.wood >= 3 || state.stone >= 3) && !state.progression.tutorialsSeen.buildMenu) {
      showTutorialHintOnce('buildMenu', 'Open build menu with B', state.player.x, state.player.y - 40);
    }
    if (state.seeds >= 2 && state.progression.farmCleared && !state.progression.tutorialsSeen.plantCrops) {
      showTutorialHintOnce('plantCrops', 'Plant crops in the farm area', getFarmCenterX(), getFarmCenterY() - 20);
    }
    // Update tutorial goals
    if (typeof updateTutorialGoals === 'function') updateTutorialGoals();
    if (state.day === 2 && !state.progression.tutorialsSeen.empDash) {
      state.progression.tutorialsSeen.empDash = true;
      showTutorialHint('Press TAB for Empire Dashboard', state.player.x, state.player.y - 40);
    }
    if (state.day === 3 && !state.progression.tutorialsSeen.invScreen) {
      state.progression.tutorialsSeen.invScreen = true;
      showTutorialHint('Press I to open Inventory', state.player.x, state.player.y - 40);
    }
    updateDoorTransition();
    updatePlayer(dt);
    updatePlayerAnim(dt);
    resetDailyWantsIfNeeded();
    updateZoneVisits();
    { let _pg = state.progression;
      let _full = !_pg.gameStarted || _pg.villaCleared;
      if (_full || _pg.companionsAwakened.lares) updateCompanion(dt);
      if (_full || _pg.companionsAwakened.woodcutter) updateWoodcutter(dt);
      updateQuarrier(dt);
      updateCook(dt);
      updateFisherman(dt);
      if (_full || _pg.companionsAwakened.centurion) updateCenturion(dt);
    }
    updateParticles(dt);
    updateAmbientWildlife(dt);
    updateStorm(dt);
    updateFloatingText(dt);
    updateShake(dt);
    updateShip(dt);
    updateTrees(dt);
    updateFishing(dt);
    updateChickens(dt);
    if (frameCount % 5 === 0) updateFactionWildlife(dt * 5);
    if (state._activeNation) updateActiveNationEntities(dt);
    if (state._activeExploration) {
      if (state._activeExploration === 'vulcan') updateVulcanIsland(dt);
      else if (state._activeExploration === 'hyperborea') updateHyperboreIsland(dt);
      else if (state._activeExploration === 'plenty') updatePlentyIsland(dt);
      else if (state._activeExploration === 'necropolis') updateNecropolisIsland(dt);
    }
    { let _pg = state.progression;
      let _full = !_pg.gameStarted || _pg.villaCleared;
      if (_full || _pg.companionsAwakened.harvester) updateHarvester(dt);
    }
    updateBlessing(dt);
    updateCats(dt);
    if (frameCount % 3 === 0) updateCitizens(dt * 3);
    if (typeof updateVestaCrystalGathering === 'function') updateVestaCrystalGathering(dt);
    if (typeof updateAllNPCSchedules === 'function' && frameCount % 60 === 0) updateAllNPCSchedules(dt * 60);
    updateCooking(dt);
    if (frameCount % 3 === 0) updateWeather(dt * 3);
    updatePickupMagnetism(dt);
    // Storm fishing message (first storm per session)
    if (!state.stormMessageShown && (stormActive || state.weather.type === 'storm' || state.weather.type === 'rain')) {
      addFloatingText(width / 2, height * 0.25, 'Storm fishing! Double yield!', '#ffaa44');
      state.stormMessageShown = true;
    }
    updateHarvestCombo(dt);
    updateCatAdoption();
    updateCompanionPets(dt);
    updateFestival(dt);
    updateActiveEvent(dt);
    updateVisitor(dt);
    updateTempleCourt(dt);
    updateDiscoveryEvents(dt);
    updateBridgeConstruction(dt);
    updateLegia(dt);
    updateLegionAmbient(dt);
    if (typeof updatePlayerEscort === 'function') updatePlayerEscort(dt);
    if (typeof updateDiving === 'function') updateDiving(dt);
    if (typeof updateInvasion === 'function') updateInvasion(dt);
    updateRivalRaid(dt);
    // Update bot AI characters — offloaded to Web Worker
    if (_botWorker && _botWorkerReady && frameCount % 30 === 0) {
      let _snap = {};
      for (let k of Object.keys(state.nations || {})) {
        let n = state.nations[k];
        if (!n.isBot || !n.islandState) continue;
        let is = n.islandState;
        let underAttack = state.invasion && state.invasion.active && state.invasion.target === k;
        let atkPos = null;
        if (underAttack && state.invasion.attackers) {
          let a = state.invasion.attackers.find(function(a) { return a.hp > 0; });
          if (a) atkPos = { x: a.x, y: a.y };
        }
        _snap[k] = {
          isleX: n.isleX, isleY: n.isleY,
          islandRX: is.islandRX || 500, islandRY: is.islandRY || 320,
          islandLevel: is.islandLevel || 1,
          wood: is.wood || 0, stone: is.stone || 0, gold: is.gold || 0,
          crystals: is.crystals || 0,
          trees: is.trees ? is.trees.map(function(t) { return {x:t.x,y:t.y,type:t.type,hp:t.hp}; }) : [],
          crystalNodes: is.crystalNodes ? is.crystalNodes.map(function(n) { return {x:n.x,y:n.y,charge:n.charge,size:n.size}; }) : [],
          plots: is.plots ? is.plots.map(function(p) { return {x:p.x,y:p.y,crop:p.crop,stage:p.stage}; }) : [],
          buildings: is.buildings ? is.buildings.map(function(b) { return {x:b.x,y:b.y,type:b.type}; }) : [],
          legia: is.legia ? { army: is.legia.army ? is.legia.army.map(function(u) { return {type:u.type}; }) : [] } : null,
          defeated: n.defeated || false,
          _underAttack: underAttack || false,
          _attackerPos: atkPos
        };
      }
      _botWorker.postMessage({ type: 'update', nations: _snap, dt: 1 });
    } else if (!_botWorker) {
      // Fallback: run on main thread if Worker not available
      if (typeof BotAI !== 'undefined') {
        for (let k of Object.keys(state.nations || {})) {
          if (state.nations[k].isBot) BotAI.update(k, dt);
        }
      }
    }
    updateSeaPeopleRaid(dt);
    if (typeof updateNavalCombat === 'function') updateNavalCombat(dt);
    updateNotifications(dt);
    // Narrative engine updates
    if (typeof updateMainQuest === 'function') { updateMainQuest(); updateNPCQuests(); updateNarrativeDialogue(); checkLoreTabletPickup(); }
    if (typeof tickPendingNudges === 'function') tickPendingNudges(dt);
    if (typeof tickEarlyGameNudges === 'function') tickEarlyGameNudges(dt);
    updateDialog(dt);
    updateAchievementPopup(dt);
  if (typeof updatePlayerStats === 'function') updatePlayerStats(dt);
  if (frameCount % 120 === 0 && typeof checkAchievements === 'function') checkAchievements();
    if (typeof updateHarvestArcs === 'function') updateHarvestArcs(dt);
    if (typeof updateCatchCard === 'function') updateCatchCard(dt);
    updateScreenTransition(dt);
    updateImperatorCeremony(dt);
    updateCamera();
    updateWreckRowing(dt);

    // Sky + ocean background — horizon always above island top
    if (state.rowing.active) {
      // When sailing, ocean covers almost the entire screen
      horizonOffset = height * 0.19;
    } else {
      // Horizon must always be above the island's outermost visual top edge
      // The shallow water ring is drawn at iw*1.12, ih*0.50 — that's the tallest ellipse
      let islandScreenY = w2sY(WORLD.islandCY) + floatOffset;
      let visualTopRadius = state.islandRY * 0.50 * 1.12; // outermost shallow water ring
      let islandTopScreen = islandScreenY - visualTopRadius - 10;
      let horizonY = min(islandTopScreen, height * 0.35);
      horizonY = max(horizonY, height * 0.05);
      horizonOffset = (height * 0.25) - horizonY;
    }
    // ─── ZOOM TRANSFORM — scale world rendering around screen center ───
    push();
    translate(width / 2, height / 2);
    scale(camZoom);
    translate(-width / 2, -height / 2);

    push();
    translate(shakeX, shakeY);
    drawSky();
    if (!_frameBudget.throttled) drawSkyBirds();
    drawOcean();
    if (typeof drawOceanWildlife === 'function' && !_frameBudget.throttled) drawOceanWildlife();
    if (typeof drawAtmosphericHaze === 'function') drawAtmosphericHaze();
    drawAmbientShips();
    drawSeaPeopleShips();
    pop();

    // Full island rendering (visible from boat/home) — no floatOffset for distant islands
    push();
    translate(shakeX, shakeY);
    drawImperialBridge(); // Draw bridge BEHIND islands
    drawConquestIsleDistant();
    drawConquestDistantEntities();
    drawConquestDistantLabel();
    drawRivalIsleDistant();
    // Seamless nation island content (when player is standing on a nation island)
    if (state._activeNation) drawActiveNationContent();
    if (typeof drawInvasion === 'function') drawInvasion();
    // Seamless exploration island content
    if (state._activeExploration) {
      if (state._activeExploration === 'vulcan') { drawVulcanEntities(); }
      else if (state._activeExploration === 'hyperborea') { drawHyperboreEntities(); }
      else if (state._activeExploration === 'plenty') { drawPlentyEntities(); }
      else if (state._activeExploration === 'necropolis') { drawNecropolisEntities(); }
    }
    // Fog dims distant islands
    if (state.weather.type === 'fog') {
      let _fogHorizonY = max(height * 0.06, height * 0.25 - horizonOffset) + 30;
      noStroke();
      fill(200, 200, 210, 180);
      rect(0, 0, width, _fogHorizonY);
    }
    drawColonyOverlay(); // Colony buildings/farms on settled Terra Nova
    if (typeof drawEconomyWorldOverlay === 'function') drawEconomyWorldOverlay();
    // Wreck beach visible when sailing
    if (state.rowing.active) {
      drawWreckIsland();
      // Distant label
      let wsx = w2sX(WRECK.cx), wsy = w2sY(WRECK.cy);
      let _wreckHorizY = max(height * 0.06, height * 0.25 - horizonOffset) + 10;
      wsy = max(wsy, _wreckHorizY);
      let _wreckDS = typeof _getDistantScale === 'function' ? _getDistantScale(WRECK.cx, WRECK.cy, WRECK.rx) : null;
      let _maxVD = typeof _getMaxViewDist === 'function' ? _getMaxViewDist() : 4000;
      if (_wreckDS && _wreckDS.dist > _maxVD) {} // skip label if too far
      else if (wsx > -100 && wsx < width + 100 && wsy > -100 && wsy < height + 100) {
        let _wLabelAlpha = _wreckDS ? lerp(120, 40, constrain((_wreckDS.dist - 500) / 3000, 0, 1)) : 120;
        fill(200, 180, 120, _wLabelAlpha);
        noStroke(); textSize(11); textAlign(CENTER, CENTER);
        text('Wreck Beach', floor(wsx), floor(wsy - WRECK.ry * 0.5 * (_wreckDS ? _wreckDS.scale : 1)));
        textAlign(LEFT, TOP);
      }
      // New islands visible when sailing
      drawVulcanIsland();
      drawVulcanDistantLabel();
      drawHyperboreIsland();
      drawHyperboreDistantLabel();
      drawPlentyIsland();
      drawPlentyDistantLabel();
      drawNecropolisIsland();
      drawNecropolisDistantLabel();
      drawHomeIslandDistant();
    }
    pop();

    // Island + everything on it — skip full render when sailing far from home
    let _homeDist = 0;
    if (state.rowing && state.rowing.active) {
      let _hdx = state.rowing.x - WORLD.islandCX, _hdy = state.rowing.y - WORLD.islandCY;
      _homeDist = sqrt(_hdx * _hdx + _hdy * _hdy);
    }
    push();
    translate(shakeX, shakeY + floatOffset);
    if (!state.rowing || !state.rowing.active || _homeDist < 300) {
      drawIsland();
      // Open world: render first bot nation island nearby with state swap
      if (state.nations) {
        let _owKey = Object.keys(state.nations)[0];
        if (_owKey) {
          let _own = state.nations[_owKey];
          let botCX = WORLD.islandCX + 1200;
          let botCY = WORLD.islandCY;
          _own.isleX = botCX;
          _own.isleY = botCY;
          let _owt = (typeof FACTION_TERRAIN !== 'undefined') ? (FACTION_TERRAIN[_owKey] || FACTION_TERRAIN.rome) : { seed: 42 };
          let _isRX = _own.islandState ? _own.islandState.islandRX || 400 : 400;
          let _isRY = _own.islandState ? _own.islandState.islandRY || 260 : 260;
          drawIslandAt({ cx: botCX, cy: botCY, rx: _isRX, ry: _isRY, level: _own.islandState ? _own.islandState.islandLevel : (_own.level || 1), seed: _owt.seed, factionKey: _owKey });
          // Draw bot buildings using the REAL drawOneBuilding function
          if (_own.islandState && _own.islandState.buildings) {
            // Temporarily set globals so drawOneBuilding reads correct era/faction
            let _savedLevel = state.islandLevel;
            let _savedFaction = state.faction;
            state.islandLevel = _own.islandState.islandLevel || 5;
            state.faction = _owKey;
            // Y-sort all bot entities for proper depth
            let _botItems = [];
            for (let b of _own.islandState.buildings) {
              _botItems.push({ y: b.y, draw: () => { if (typeof drawOneBuilding === 'function') drawOneBuilding(b); } });
            }
            // Trees on bot island
            if (_own.islandState.trees && typeof drawOneTree === 'function') {
              for (let t of _own.islandState.trees) {
                _botItems.push({ y: t.y, draw: () => drawOneTree(t) });
              }
            }
            // Ambient houses on bot island (generated once, cached)
            if (!_own.islandState._ambientHouses && _own.islandState.islandLevel >= 5 && typeof drawOneAmbientHouse === 'function') {
              let _bah = [];
              let _bRX = _own.islandState.islandRX || 400;
              let _bRY = _own.islandState.islandRY || 260;
              let _hCount = Math.min(8, Math.floor((_own.islandState.islandLevel - 4) * 1.5));
              for (let _hi = 0; _hi < _hCount; _hi++) {
                let _a = Math.PI * 2 * _hi / _hCount + 0.3;
                let _r = 0.25 + Math.random() * 0.25;
                let _hx = botCX + Math.cos(_a) * _bRX * _r * 0.6;
                let _hy = botCY + Math.sin(_a) * _bRY * _r * 0.3;
                let _hv = _hi % 4;
                _bah.push({ x: _hx, y: _hy, w: 20 + (_hv % 3) * 3, h: 16 + (_hv % 3) * 2, variant: _hv });
              }
              _own.islandState._ambientHouses = _bah;
            }
            if (_own.islandState._ambientHouses) {
              for (let h of _own.islandState._ambientHouses) {
                _botItems.push({ y: h.y, draw: () => drawOneAmbientHouse(h) });
              }
            }
            // Market clutter on bot island (level 8+)
            if (!_own.islandState._clutter && _own.islandState.islandLevel >= 8 && typeof drawOneClutter === 'function') {
              let _bc = [];
              let _cTypes = ['stall', 'crate', 'barrel', 'crate', 'barrel'];
              for (let _ci = 0; _ci < Math.min(5, _own.islandState.islandLevel - 7); _ci++) {
                let _a = Math.PI * 0.5 + Math.PI * _ci / 5;
                _bc.push({ x: botCX + Math.cos(_a) * 40 + (_ci - 2) * 25, y: botCY + Math.sin(_a) * 15, type: _cTypes[_ci], color: _ci % 3 });
              }
              _own.islandState._clutter = _bc;
            }
            if (_own.islandState._clutter) {
              for (let c of _own.islandState._clutter) {
                _botItems.push({ y: c.y, draw: () => drawOneClutter(c) });
              }
            }
            // Citizens using the REAL drawOneCitizen function
            if (_own.islandState.citizens) {
              for (let c of _own.islandState.citizens) {
                // Update citizen wandering
                c.moveTimer = (c.moveTimer || 0) - 1;
                if (c.moveTimer <= 0) {
                  c.targetX = botCX + (Math.random()-0.5) * _isRX * 0.5;
                  c.targetY = botCY + (Math.random()-0.5) * _isRY * 0.2;
                  c.moveTimer = 60 + Math.floor(Math.random() * 120);
                }
                let cdx = (c.targetX||botCX) - c.x, cdy = (c.targetY||botCY) - c.y;
                let cd = Math.sqrt(cdx*cdx + cdy*cdy);
                if (cd > 3) { c.x += cdx/cd * (c.speed||0.3); c.y += cdy/cd * (c.speed||0.3); c.moving = true; }
                else c.moving = false;
                _botItems.push({ y: c.y, draw: () => { if (typeof drawOneCitizen === 'function') drawOneCitizen(c); } });
              }
            }
            // Sort by Y and draw
            _botItems.sort((a, b) => a.y - b.y);
            for (let item of _botItems) item.draw();

            // Temple HP bar (drawn on top, not Y-sorted) — only when damaged
            let templeB = _own.islandState.buildings.find(b => b.isTemple || b.type === 'temple');
            if (templeB) {
              let tHP = _own.islandState.templeHP !== undefined ? _own.islandState.templeHP : 100;
              if (tHP < 100) {
                let thx = w2sX(templeB.x), thy = w2sY(templeB.y) - 35;
                noStroke();
                fill(0,0,0,150); rect(thx-25, thy, 50, 6, 2);
                let hpRatio = tHP / 100;
                fill(hpRatio > 0.5 ? Math.floor((1-hpRatio)*400) : 200, hpRatio > 0.5 ? 200 : Math.floor(hpRatio*400), 50);
                rect(thx-23, thy+1, 46*hpRatio, 4, 1);
                fill(255,255,255,200); textAlign(CENTER,BOTTOM); textSize(7);
                text('Temple '+tHP+'%', thx, thy-1); textAlign(LEFT,TOP);
                if (tHP < 50) { fill(80,80,80,50); ellipse(thx+Math.sin(frameCount*0.03)*5, thy-10, 15, 8); }
                if (tHP < 25) { fill(255,100,30,60); ellipse(thx-5, thy-5, 8, 12); }
              }
            }
            // Nation name label above bot island
            let _nlx = w2sX(botCX), _nly = w2sY(botCY - _isRY * 0.85);
            if (_nlx > -100 && _nlx < width + 100 && _nly > -50) {
              noStroke(); textAlign(CENTER, BOTTOM); textSize(11);
              fill(0,0,0,120);
              text(getNationName(_owKey), _nlx + 1, _nly + 1);
              fill(240,220,180,220);
              text(getNationName(_owKey), _nlx, _nly);
              textAlign(LEFT, TOP);
            }
            // Restore player globals
            state.islandLevel = _savedLevel;
            state.faction = _savedFaction;
          }
          // Critter pet following bot leader
          let _critter = _own.islandState ? _own.islandState.critter : null;
          if (_critter && typeof BotAI !== 'undefined' && BotAI.bots[_owKey]) {
            let bot = BotAI.bots[_owKey];
            let cdx = bot.x - _critter.x, cdy = bot.y - _critter.y;
            let cd = Math.sqrt(cdx*cdx + cdy*cdy);
            if (cd > 20) { _critter.x += cdx/cd * 1.5; _critter.y += cdy/cd * 1.5; }
            let cx2 = w2sX(_critter.x), cy2 = w2sY(_critter.y);
            push(); noStroke(); translate(Math.floor(cx2), Math.floor(cy2));
            if (_critter.type === 'cat') { fill(200,160,100); ellipse(0,0,6,4); fill(180,140,80); ellipse(-3,-1,3,3); }
            else if (_critter.type === 'wolf') { fill(130,130,130); ellipse(0,0,8,5); fill(110,110,110); ellipse(-4,-1,4,3); }
            else if (_critter.type === 'owl') { fill(160,140,100); ellipse(0,-2,5,5); fill(200,180,120); rect(-2,-4,4,3); }
            else { fill(140,100,60); ellipse(0,0,9,6); fill(120,80,40); ellipse(-5,-1,4,4); }
            pop();
          }
          // Bot AI: create and draw (update runs in Web Worker)
          if (typeof BotAI !== 'undefined') {
            if (!BotAI.bots[_owKey]) BotAI.create(_owKey, botCX, botCY);
            let _bot = BotAI.bots[_owKey];
            if (_bot && Math.abs(_bot.x - botCX) > 1000) { _bot.x = botCX; _bot.y = botCY; }
            _own.isBot = true;
            // Sync position from worker results
            if (_botWorkerResults[_owKey]) {
              let wr = _botWorkerResults[_owKey];
              _bot.x = wr.x; _bot.y = wr.y;
              _bot.facing = wr.facing; _bot.moving = wr.moving;
              _bot.walkFrame = wr.walkFrame;
              if (!_bot.task) _bot.task = wr.taskType ? { type: wr.taskType } : null;
              else if (wr.taskType) _bot.task.type = wr.taskType;
              else _bot.task = null;
            } else if (!_botWorker) {
              BotAI.update(_owKey, 1);
            }
            BotAI.draw(_owKey);
          }
        }
      }
      if (!_frameBudget.throttled || frameCount % 2 === 0) drawShoreWaves();
      drawAmbientHouses();
      drawWorldObjectsSorted();
      if (!_frameBudget.throttled) drawCitySmoke();
      drawLaundryLines();
      drawStreetWear();
      drawGranaryArea();
      drawAmphoraStacks();
      drawTempleIncense();
      drawForumBanner();
      if (!_frameBudget.throttled) drawWindowGlow();
      drawRuinOverlays();
      drawCompanionTrail();
      drawPlayerTrail();
      drawNightLighting();
      drawFishing();
      if (typeof drawTidalHUD === 'function') drawTidalHUD();
      drawParticles();
      if (!_frameBudget.throttled || frameCount % 2 === 0) drawSeasonalEffects();
      if (!_frameBudget.throttled) drawAmbientWildlife();
      drawWeatherEffects();
      drawEnergyArcs();
      drawFloatingText();
      drawShip();
      drawOracleStone();
      if (typeof drawLoreTablets === 'function') drawLoreTablets();
      // Livia's scroll (Chapter 3 quest item)
      if (state.mainQuest && state.mainQuest.chapter === 2 && !state.narrativeFlags['livia_scroll'] && state.ruins.length > 0) {
        let rx = state.ruins[0].x, ry = state.ruins[0].y;
        let ssx = w2sX(rx), ssy = w2sY(ry);
        if (ssx > -20 && ssx < width + 20) {
          push(); noStroke();
          fill(200, 180, 120); rect(ssx - 3, ssy - 6, 6, 10);
          fill(170, 150, 100); rect(ssx - 4, ssy - 7, 8, 2); rect(ssx - 4, ssy + 3, 8, 2);
          let p = sin(frameCount * 0.08) * 0.4 + 0.6;
          fill(220, 190, 80, floor(50 * p)); rect(ssx - 6, ssy - 8, 12, 14);
          pop();
          if (dist(state.player.x, state.player.y, rx, ry) < 50) {
            fill(220, 190, 80); textAlign(CENTER, CENTER); textSize(11);
            text('[E] Pick up scroll', ssx, ssy - 16); textAlign(LEFT, TOP);
          }
        }
      }
      drawFestivalDecorations();
      drawBottles();
      drawTreasureHint();
    }
    drawRowingBoat();
    if (typeof drawNavalCombat === 'function') drawNavalCombat();
    // Diving overlay — underwater tint + entities drawn in world space
    if (state.diving && state.diving.active && typeof drawDivingOverlay === 'function') drawDivingOverlay();
    if (!state.rowing || !state.rowing.active || _homeDist < 300) {
      drawLegionPatrol();
      drawRivalRaiders();
      drawSeaPeopleRaiders();
      // Build mode ghost — drawn inside island float/shake context so it matches placed buildings
      if (state.buildMode) {
        drawBuildGhost();
      }
    }
    pop();

    // Sea People raid warning border flash
    if (state.seaPeopleRaidActive && state._seaPeopleWarning > 0) {
      let flashAlpha = (sin(frameCount * 0.12) * 0.5 + 0.5) * 120;
      noFill(); stroke(180, 30, 20, flashAlpha); strokeWeight(4);
      rect(2, 2, width - 4, height - 4);
      noStroke();
    }

    // Lightning drawn outside island transform — fixed to sky, not bobbing with island
    drawLightning();

    // Rowboat proximity prompt — gate behind villa cleared or legacy save
    let _boatUnlocked = !state.progression.gameStarted || state.progression.villaCleared;
    if (!state.rowing.active && _boatUnlocked) {
      let port = getPortPosition();
      let boatWX = port.x + 80;
      let boatWY = port.y + 20;
      if (dist(state.player.x, state.player.y, boatWX, boatWY) < 60) {
        let promptX = w2sX(boatWX);
        let promptY = w2sY(boatWY) - 25 + floatOffset;
        fill(255, 255, 255, 200);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(11);
        text('[E] Board Navis Parva', promptX, promptY);
      }
    }

    // Shipyard prompt
    if (!state.rowing.active) {
      let _syB2 = (state.buildings || []).find(b => b.type === 'shipyard' && dist(state.player.x, state.player.y, b.x, b.y) < 60);
      if (_syB2) {
        let _sysx = w2sX(_syB2.x), _sysy = w2sY(_syB2.y) - 30 + floatOffset;
        fill(255, 220, 150, 200 + sin(frameCount * 0.06) * 30);
        noStroke(); textAlign(CENTER, CENTER); textSize(11);
        text('[E] Shipyard', _sysx, _sysy);
      }
    }
    // Dive prompt
    if (typeof drawDivePrompt === 'function') drawDivePrompt();

    // Expedition Forge prompt near pyramid — gate behind villa
    if (!state.rowing.active && !state.upgradeShopOpen && _boatUnlocked &&
        dist(state.player.x, state.player.y, state.pyramid.x, state.pyramid.y) < 60) {
      let fpx = w2sX(state.pyramid.x);
      let fpy = w2sY(state.pyramid.y) - 40 + floatOffset;
      fill(255, 220, 150, 200 + sin(frameCount * 0.06) * 30);
      noStroke(); textAlign(CENTER); textSize(10);
      text('[E] Expedition Forge', fpx, fpy);
      // Show last expedition result
      if (state.expeditionLog.length > 0) {
        let last = state.expeditionLog[0];
        fill(180, 170, 140, 120); textSize(10);
        let logStr = 'Last: #' + last.num + ' | Danger ' + last.danger + ' | ' + last.kills + ' kills | ' + last.gold + 'g' + (last.died ? ' [DIED]' : '');
        text(logStr, fpx, fpy + 14);
      }
    }

    // Colony & Bridge prompts near pyramid
    if (!state.rowing.active && _boatUnlocked &&
        dist(state.player.x, state.player.y, state.pyramid.x, state.pyramid.y) < 60) {
      let fpx = w2sX(state.pyramid.x);
      let fpy = w2sY(state.pyramid.y) - 55 + floatOffset;
      // Colonize prompt
      if (canColonize()) {
        let cc = getColonizeCost();
        fill(255, 200, 80, 200 + sin(frameCount * 0.05) * 30);
        noStroke(); textAlign(CENTER); textSize(9);
        text('[C] Colonize Terra Nova', fpx, fpy);
        fill(200, 180, 130, 140); textSize(10);
        text(cc.gold + 'g  ' + cc.wood + ' wood  ' + cc.stone + ' stone  ' + cc.ironOre + ' iron  ' + cc.ancientRelic + ' relics', fpx, fpy + 11);
      }
      // Colony upgrade prompt
      if (state.conquest.colonized && state.conquest.colonyLevel < 10) {
        let uc = getColonyUpgradeCost(state.conquest.colonyLevel);
        fill(180, 220, 255, 200 + sin(frameCount * 0.05) * 30);
        noStroke(); textAlign(CENTER); textSize(9);
        text('[C] Upgrade Colony (LV.' + (state.conquest.colonyLevel + 1) + ')', fpx, fpy);
        fill(150, 180, 200, 140); textSize(10);
        let costStr = uc.gold + 'g  ' + uc.wood + ' wood  ' + uc.stone + ' stone';
        if (uc.ironOre > 0) costStr += '  ' + uc.ironOre + ' iron';
        text(costStr, fpx, fpy + 11);
      }
      // Bridge prompt
      if (canBuildBridge()) {
        let bc = getBridgeCost();
        fill(255, 170, 50, 200 + sin(frameCount * 0.04) * 40);
        noStroke(); textAlign(CENTER); textSize(10);
        text('[V] Build Imperial Bridge!', fpx, fpy - 18);
        fill(220, 180, 100, 160); textSize(10);
        text(bc.stone + ' stone  ' + bc.wood + ' wood  ' + bc.ironOre + ' iron  ' + bc.ancientRelic + ' relics  ' + bc.titanBone + ' bone', fpx, fpy - 7);
      }
      if (state.imperialBridge.built) {
        fill(255, 220, 100, 180);
        noStroke(); textAlign(CENTER); textSize(11);
        text('IMPERIAL BRIDGE — Walk west to Terra Nova!', fpx, fpy - 12);
      }
    }

    // Dock prompt when rowing near an island
    if (state.rowing.active && state.rowing.nearIsle) {
      let isColonized = state.rowing.nearIsle === 'conquest' && state.conquest.colonized;
      let label = state.rowing.nearIsle === 'wreck' ? '[E] Dock at Wreck Beach' :
                  state.rowing.nearIsle === 'vulcan' ? '[E] Dock at Isle of Vulcan' :
                  state.rowing.nearIsle === 'hyperborea' ? '[E] Dock at Hyperborea' :
                  state.rowing.nearIsle === 'plenty' ? '[E] Dock at Isle of Plenty' :
                  state.rowing.nearIsle === 'necropolis' ? '[E] Dock at Necropolis' :
                  (state.nations && state.nations[state.rowing.nearIsle]) ? '[E] Dock at ' + (state.colonies[state.rowing.nearIsle] ? '[Colony] ' : '') + getNationName(state.rowing.nearIsle) :
                  isColonized ? '[E] Visit Colony' : '[E] Dock at Terra Nova';
      fill(255, 255, 220, 200 + sin(frameCount * 0.08) * 40);
      noStroke(); textAlign(CENTER); textSize(13);
      text(label, width / 2, height * 0.35);
      // Show supply cost for Terra Nova (free for colonized)
      if (state.rowing.nearIsle === 'conquest') {
        if (isColonized) {
          fill(100, 200, 100, 180); textSize(9);
          text('Colony LV.' + state.conquest.colonyLevel + ' — Free passage', width / 2, height * 0.39);
        } else {
          let en = state.conquest.expeditionNum;
          let costG = 15 + en * 5 + state.conquest.soldiers.length * 5;
          let costW = 10 + en * 3;
          let costM = min(3, 1 + floor(en / 3));
          let canGo = state.gold >= costG && state.wood >= costW && state.meals >= costM;
          fill(canGo ? color(180, 170, 130, 180) : color(200, 80, 60, 200));
          textSize(9);
          text('Cost: ' + costG + 'g  ' + costW + ' wood  ' + costM + ' meals', width / 2, height * 0.39);
        }
      }
    }

    // Compass arrows when sailing
    if (state.rowing.active) {
      let r = state.rowing;
      let islands = [
        { name: 'Home', x: WORLD.islandCX, y: WORLD.islandCY, col: '#88cc88' },
        { name: state.conquest.colonized ? 'Colony LV.' + state.conquest.colonyLevel : 'Terra Nova', x: state.conquest.isleX, y: state.conquest.isleY, col: state.conquest.colonized ? '#88cc88' : '#88aacc' },
        { name: 'Wreck Beach', x: WRECK.cx, y: WRECK.cy, col: '#ccaa66' },
        { name: 'Isle of Vulcan', x: state.vulcan.isleX, y: state.vulcan.isleY, col: '#ff5533' },
        { name: 'Hyperborea', x: state.hyperborea.isleX, y: state.hyperborea.isleY, col: '#88ddff' },
        { name: 'Isle of Plenty', x: state.plenty.isleX, y: state.plenty.isleY, col: '#44cc44' },
        { name: 'Necropolis', x: state.necropolis.isleX, y: state.necropolis.isleY, col: '#9944cc' },
      ];
      // Add all nation islands to compass
      let _nKeys = Object.keys(state.nations || {});
      for (let _nk of _nKeys) {
        let _nv = state.nations[_nk];
        if (_nv && !_nv.defeated) islands.push({ name: (state.colonies[_nk] ? "[Colony] " : "") + getNationName(_nk), x: _nv.isleX, y: _nv.isleY, col: state.colonies[_nk] ? "#88cc88" : getNationStanceColor(_nv) });
      }
      for (let isle of islands) {
        let dx = isle.x - r.x, dy = isle.y - r.y;
        let d = sqrt(dx * dx + dy * dy);
        if (d < 200) continue; // too close, skip
        let ang = atan2(dy, dx);
        let edgeR = min(width, height) * 0.38;
        let ax = width / 2 + cos(ang) * edgeR;
        let ay = height / 2 + sin(ang) * edgeR;
        push();
        translate(ax, ay);
        rotate(ang);
        fill(isle.col); noStroke();
        triangle(10, 0, -4, -5, -4, 5);
        rotate(-ang);
        fill(255, 240, 200, 180); textSize(10); textAlign(CENTER);
        text(isle.name, 0, -10);
        fill(255, 240, 200, 120); textSize(9);
        text(floor(d) + 'px', 0, 10);
        pop();
      }
    }

    pop(); // ─── END ZOOM TRANSFORM ───

    // Night darkness + golden hour color grading — atmospheric tint over the world
    if (!state.conquest.active) {
      drawNightOverlay();
      drawColorGrading();
      if (typeof drawFestivalOverlay === 'function') drawFestivalOverlay();
      // Fog overlay — lifts by midday
      if (state.weather && state.weather.type === 'fog') {
        let fogHour = (state.time || 0) / 60;
        let fogAlpha = fogHour < 12 ? lerp(120, 0, constrain((fogHour - 6) / 6, 0, 1)) : 0;
        if (fogAlpha > 1) { noStroke(); fill(210, 210, 220, fogAlpha); rect(0, 0, width, height); }
      }
      drawGameVignette();
    }

    // Multiplayer sync + HUD + rival island on horizon
    if (typeof MP !== 'undefined') { MP.update(); if (MP.connected) MP.drawRivalIsland(); MP.drawHUD(); }

    if (!screenshotMode && !photoMode) {
      drawHUD();
      if (typeof drawClockHUD === 'function') drawClockHUD();
      if (typeof drawCompassHUD === 'function') drawCompassHUD();
      if (typeof drawQuestTracker === 'function') drawQuestTracker();
      drawHotbar();
      drawFestivalBanner();
      drawFestivalAnnouncement();
      drawEventBanner();
      drawWanderingMerchantUI();
      drawBuildUI();
      drawShopUI();
      drawUpgradeShopUI();
      if (typeof drawShipyardUI === 'function') drawShipyardUI();
      drawMarketUI();
      drawCodexUI();
      drawNaturalistCodex();
      if (typeof drawLoreTabletPopup === 'function') drawLoreTabletPopup();
      if (typeof drawNarrativeDialogue === 'function') drawNarrativeDialogue();
      drawDiscoveryEvent();
      if (typeof _drawNarrationSubtitle === 'function') _drawNarrationSubtitle();
      drawTutorialHintUI();
      if (typeof drawCurrentGoalHUD === 'function') drawCurrentGoalHUD();
      drawScreenFlash();
      drawSpeedLines();
      drawImperatorBanner();
      drawIslandMilestone();
      drawDailySummary();
      drawModifierSelectUI();
      drawNotifications();
      drawDialogSystem();
      drawEmpireDashboard();
      drawInventoryScreen();
      if (typeof drawEquipmentWindow === 'function') drawEquipmentWindow();
      if (typeof drawSkillTree === 'function') drawSkillTree();
      if (typeof drawRecipeBookUI === 'function') drawRecipeBookUI();
      drawLegiaUI();
      if (typeof drawArmyBattle === 'function') drawArmyBattle();
      if (typeof drawInvasionHUD === 'function') drawInvasionHUD();
      drawRivalDiplomacyUI();
      if (state._activeNation && state.nationDiplomacyOpen) drawNationDiplomacyUI();
      if (state._activeExploration) {
        if (state._activeExploration === 'vulcan') drawVulcanHUD();
        else if (state._activeExploration === 'hyperborea') drawHyperboreHUD();
        else if (state._activeExploration === 'plenty') drawPlentyHUD();
        else if (state._activeExploration === 'necropolis') drawNecropolisHUD();
      }
      if (typeof drawTechTreeUI === 'function') drawTechTreeUI();
      if (typeof drawVictoryScreen === 'function') drawVictoryScreen();
      if (typeof drawVictoryProgressHUD === 'function') drawVictoryProgressHUD();
      drawExpeditionSummaryOverlay();
      drawWardrobe();
      drawAchievementPopup();
      if (typeof drawLevelUpPopup === 'function') drawLevelUpPopup();
      if (typeof drawAchievementsPanel === 'function') drawAchievementsPanel();
      if (typeof drawDailyQuestHUD === 'function') drawDailyQuestHUD();
      if (typeof drawHarvestArcs === 'function') drawHarvestArcs();
      if (typeof drawCatchCard === 'function') drawCatchCard();
      if (typeof drawEconomyUIOverlay === 'function') drawEconomyUIOverlay();
      drawScreenTransition();
      drawImperatorCeremony();
      drawIslandNamingOverlay();
      if (typeof drawWorldMap === 'function') drawWorldMap();
      if (typeof drawMobileControls === 'function') drawMobileControls();
      if (typeof _processTouchActions === 'function') _processTouchActions();
      push(); noStroke();
      fill(160, 140, 100, 102);
      textSize(10); textAlign(RIGHT, BOTTOM);
      text('[ P ] PHOTO  [ F9 ] SCREENSHOT', width - 18, height - 58);
      pop();
      drawCursor();
    }
    // Screenshot mode overlays — always on top of world
    drawGameVignette();
    drawScreenshotFilter();
    drawScreenshotIndicator();
    // Photo mode overlays (watermark, vignette, tip, flash)
    drawPhotoModeOverlay();
  }
  drawDoorTransition();
  drawSaveIndicator();

  // Death overlay + timer
  if (state.player._dead) {
    state.player._deathTimer--;
    let t = state.player._deathTimer;
    let alpha = map(t, 180, 0, 0, 220);
    push();
    resetMatrix();
    fill(0, 0, 0, alpha);
    noStroke();
    rect(0, 0, width, height);
    if (alpha > 80) {
      fill(255, 200, 50, min(alpha * 1.5, 255));
      textAlign(CENTER, CENTER);
      textSize(24);
      text('The gods spare you... this time', width / 2, height / 2);
      textSize(14);
      fill(200, 80, 80, min(alpha * 1.5, 255));
      text('-20% gold', width / 2, height / 2 + 35);
    }
    pop();
    if (t <= 0) {
      let p = state.player;
      let goldLost = floor(state.gold * 0.2);
      state.gold -= goldLost;
      p.hp = floor(p.maxHp * 0.5);
      p._dead = false;
      // exitConquest deprecated -- openworld
      p.x = WORLD.islandCX;
      p.y = WORLD.islandCY;
      cam.x = p.x; cam.y = p.y;
      camSmooth.x = p.x; camSmooth.y = p.y;
      addFloatingText(width / 2, height * 0.35, '-' + goldLost + ' gold', '#ff4444');
    }
  }

  // Debug perf overlay
  if (typeof Debug !== 'undefined' && Debug.visible) {
    push();
    textFont('monospace'); textSize(11); textAlign(LEFT, BOTTOM); noStroke();
    let entities = (state.buildings ? state.buildings.length : 0) + (state.trees ? state.trees.length : 0) + (state.npc ? 1 : 0);
    let lines = [
      'FPS: ' + nf(_fpsSmooth, 1, 1) + (_frameBudget.throttled ? ' [THROTTLED]' : ''),
      'Frame: ' + nf(_frameBudget.avg, 1, 1) + 'ms' + (_frameBudget.overBudget > 0 ? ' over:' + _frameBudget.overBudget : ''),
      'Particles: ' + particles.length + '/' + _particleCap,
      'Entities: ' + entities,
    ];
    for (let i = 0; i < lines.length; i++) {
      let ly = height - 8 - (lines.length - 1 - i) * 14;
      fill(0, 160); text(lines[i], 9, ly + 1);
      fill(_fpsSmooth < 30 ? color(255, 80, 80) : 220); text(lines[i], 8, ly);
    }
    pop();
  }

  // Debug console — drawn by draw() wrapper, not here
}

// ─── FOOD CONSUMPTION (daily) ─────────────────────────────────────────────
function updateFoodConsumption() {
  // Only active at island level 3+ (give early game time to set up farms)
  if ((state.islandLevel || 1) < 3) return;

  let pop = state.citizens ? state.citizens.length : 0;
  let soldiers = state.legia ? state.legia.recruits : 0;
  let totalMouths = pop + soldiers;
  if (totalMouths <= 0) return;

  let foodNeeded = totalMouths; // 1 food per person per day

  // Bakery reduces consumption based on tier: T1=0%, T2=20%, T3=40% (max 60%)
  let bakeryReduction = 0;
  for (let bk of state.buildings.filter(b => b.type === 'bakery' && !b.ruined)) {
    let tier = bk.tier || 1;
    if (tier >= 3) bakeryReduction += 0.4;
    else if (tier >= 2) bakeryReduction += 0.2;
  }
  let reduction = min(bakeryReduction, 0.6);
  foodNeeded = max(1, Math.ceil(foodNeeded * (1 - reduction)));

  // Consume from harvest first, then fish, then meals
  let consumed = 0;
  let remaining = foodNeeded;

  // Harvest
  let fromHarvest = min(state.harvest, remaining);
  state.harvest -= fromHarvest;
  consumed += fromHarvest;
  remaining -= fromHarvest;

  // Fish backup
  if (remaining > 0 && state.fish > 0) {
    let fromFish = min(state.fish, remaining);
    state.fish -= fromFish;
    consumed += fromFish;
    remaining -= fromFish;
  }

  // Meals as last resort
  if (remaining > 0 && (state.meals || 0) > 0) {
    let fromMeals = min(state.meals, remaining);
    state.meals -= fromMeals;
    consumed += fromMeals;
    remaining -= fromMeals;
  }

  // Store daily consumption for HUD display
  state._dailyFoodNeeded = foodNeeded;
  state._dailyFoodFed = consumed;

  if (consumed < foodNeeded) {
    state.foodShortage = (state.foodShortage || 0) + 1;
    addFloatingText(width / 2, height * 0.26, 'Food shortage! Citizens hungry.', '#ff6644');
    addNotification('Day ' + state.day + ': Not enough food! (' + consumed + '/' + foodNeeded + ')', '#ff6644');
    if (typeof adjustReputation === 'function') adjustReputation(-5);

    // After 5 consecutive days of shortage, citizens start leaving
    if (state.foodShortage >= 5 && pop > 2) {
      state.citizens.pop();
      addFloatingText(WORLD.islandCX, WORLD.islandCY - 50, 'A citizen has left!', '#ff5544');
      addNotification('A citizen left due to famine!', '#ff4433');
    }
    // Army morale drops from hunger
    if (state.legia && state.legia.morale > 0) {
      state.legia.morale = max(0, state.legia.morale - 5);
    }
  } else {
    state.foodShortage = 0;
    // Well-fed bonus: +1 morale, +2 reputation (feeding citizens)
    if (state.legia && state.legia.recruits > 0) {
      state.legia.morale = min(100, state.legia.morale + 1);
    }
    if (pop >= 5 && typeof adjustReputation === 'function') adjustReputation(2);
  }
}

// ─── TIME ─────────────────────────────────────────────────────────────────
function updateTime(dt) {
  state.time += 0.18 * dt;
  if (state.player.xpBoostTimer > 0) state.player.xpBoostTimer -= dt;
  // Track play frames for early nudge (90 seconds at 60fps = 5400 frames)
  if (!state.playFrames) state.playFrames = 0;
  state.playFrames += dt;
  if (state.playFrames >= 5400 && state.narrativeFlags && !state.narrativeFlags['nudge_livia_shown'] &&
      state.mainQuest && state.mainQuest.chapter === 0) {
    state.narrativeFlags['nudge_livia_shown'] = true;
    addFloatingText(width / 2, height * 0.22, 'Talk to Livia near the ruins to begin your story.', '#ddc880');
  }
  // Night transition — check vesta star observation (between 19:00-20:00, once per night)
  let hr = state.time / 60;
  if (hr >= 19 && hr < 19.5 && !state._vestaObsNight && state.narrativeFlags &&
      state.npcQuests && state.npcQuests.vesta && state.npcQuests.vesta.active === 'vesta_q2') {
    state._vestaObsNight = true;
    let px = state.player.x, py = state.player.y;
    if (typeof advanceNPCQuestCounter === 'function' && dist(px, py, state.pyramid.x, state.pyramid.y) < 120) {
      advanceNPCQuestCounter('nq_vesta_nights', 1);
      addFloatingText(width / 2, height * 0.3, 'Night observation recorded', '#88ddff');
    }
  }
  if (hr < 19) state._vestaObsNight = false;
  // Night market at 7 PM on every 7th day
  if (!state.nightMarket) state.nightMarket = { active: false, shopOpen: false, stock: [] };
  if (state.day % 7 === 0 && state.day > 0 && state.time >= 19 * 60 && !state.nightMarket.active) {
    openNightMarket();
  }
  // Close market at midnight
  if (state.nightMarket.active && state.time < 60) {
    state.nightMarket.active = false;
    state.nightMarket.shopOpen = false;
  }
  // Daily summary at 10 PM
  if (state.time >= 22 * 60 && !state.showSummary && !state.lastSummary) {
    state.lastSummary = calculateDailySummary();
    state.showSummary = true;
    state.yesterdayWreaths = state.lastSummary.wreaths;
  }

  if (state.time >= 0 && state.time < 60 && typeof unlockAchievement === 'function') unlockAchievement('night_owl');
  if (state.time >= 1440) {
    let prevSeason = getSeason();
    let _goldBeforeDay = state.gold || 0;
    state.time = 0;
    state.day++;
    // Track days since rain for drought
    if (state.weather.type === 'rain' || state.weather.type === 'storm' || stormActive) {
      state.daysSinceRain = 0;
    } else {
      state.daysSinceRain = (state.daysSinceRain || 0) + 1;
    }
    // Fallow recovery: empty plots regain fertility daily
    if (typeof updateFallowRecovery === 'function') updateFallowRecovery();
    let newSeason = getSeason();
    if (newSeason !== prevSeason) {
      // Season transition fanfare (non-festival days)
      spawnSeasonFanfare(newSeason);
      let names = ['VER (Spring)', 'AESTAS (Summer)', 'AUTUMNUS (Autumn)', 'HIEMS (Winter)'];
      addFloatingText(width / 2, height * 0.2, names[newSeason] + ' begins!', '#ffddaa');
      if (snd) snd.playSFX('season_change');
      // 20% chance of harvest windfall on season change
      if (!state.activeEvent && random() < 0.2) {
        let wDef = EVENT_DEFS.find(d => d.id === 'harvest_windfall');
        if (wDef && isEventEligible(wDef)) {
          state.activeEvent = { id: wDef.id, timer: wDef.duration, data: {} };
          if (!wDef.oneShot) state.eventCooldown[wDef.id] = wDef.cooldown;
          wDef.onStart();
        }
      }
    }
    state.showSummary = false;
    state.lastSummary = null;
    // New day setup
    state.prophecy = (typeof generateEnhancedProphecy === 'function') ? generateEnhancedProphecy() : generateProphecy();
    resetDailyActivities();
    if (typeof generateDailyQuests === 'function' && (!state.dailyQuests || state.dailyQuestsDay !== state.day)) generateDailyQuests();
    if (typeof checkDayMilestones === 'function') checkDayMilestones();
    // Vesta star observation: handled at night transition (19:00) via updateTime
    // Reset the night flag at day boundary so the next night can trigger it
    state._vestaObsNight = false;
    // Wreath bonuses from yesterday
    if (state.yesterdayWreaths >= 1) { state.seeds += 2; }
    if (state.yesterdayWreaths >= 2) { state.gold += 5; }
    if (state.yesterdayWreaths >= 3) { state.crystals += 1; state.solar = min(state.maxSolar, state.solar + 20); }
    // Colony income (daily)
    updateColonyIncome();
    if (typeof onDayTransitionEconomy === 'function') onDayTransitionEconomy();
    // Track gold earned for scoring
    if (state.score && state.gold > _goldBeforeDay) {
      state.score.goldEarned += (state.gold - _goldBeforeDay);
    }
    // ─── NEW BUILDING DAILY EFFECTS ──────────────────────────────────────
    state._altarPrayedToday = false; // Reset altar prayer
    state.templeJesterJokedToday = false;
    // God prayer cooldown tick
    if (state.god && state.god.prayerCooldown > 0) state.god.prayerCooldown = max(0, state.god.prayerCooldown - 1440);
    if (state.god && state.god.blessingTimer > 0) {
      state.god.blessingTimer = max(0, state.god.blessingTimer - 1440);
      if (state.god.blessingTimer <= 0) state.god.blessingActive = null;
    }
    // Bakery: bread per bakery based on tier (skip ruined)
    let bakeries = state.buildings.filter(b2 => b2.type === 'bakery' && !b2.ruined);
    if (bakeries.length > 0) {
      let breadAmt = 0;
      let goldFromBakery = 0;
      for (let bk of bakeries) {
        let tier = bk.tier || 1;
        let base = tier === 3 ? 6 : tier === 2 ? 4 : 2;
        // Adjacency: bakery near windmill +50%, near granary +25%
        let adjBonuses = getAdjacencyBonuses(bk);
        for (let ab of adjBonuses) { if (ab.mult) base = floor(base * ab.mult); }
        breadAmt += base;
        if (tier === 3) goldFromBakery += 2;
      }
      // Windmill bonus: doubles bakery bread output
      let hasWindmill = state.buildings.some(b2 => b2.type === 'windmill' && !b2.ruined);
      if (hasWindmill) breadAmt *= 2;
      state.harvest += breadAmt;
      let breadMsg = 'Bakery: +' + breadAmt + ' bread';
      if (hasWindmill) breadMsg += ' (Windmill 2x)';
      addFloatingText(width / 2, height * 0.32, breadMsg, '#dda844');
      if (goldFromBakery > 0) {
        state.gold += goldFromBakery;
        addFloatingText(width / 2, height * 0.35, 'Grand Bakery: +' + goldFromBakery + 'g sales', '#eedd55');
      }
    }
    // Adjacency: market near bakery = +2 gold/day
    let markets = state.buildings.filter(b2 => (b2.type === 'market' || b2.type === 'marketplace') && !b2.ruined);
    let adjMarketGold = 0;
    for (let mk of markets) {
      if (state.buildings.some(b2 => b2.type === 'bakery' && !b2.ruined && dist(mk.x, mk.y, b2.x, b2.y) < 100))
        adjMarketGold += 2;
    }
    if (adjMarketGold > 0) {
      state.gold += adjMarketGold;
      addFloatingText(width / 2, height * 0.38, 'Market adjacency: +' + adjMarketGold + 'g', '#ddcc44');
    }
    // Food consumption — citizens and soldiers eat daily
    updateFoodConsumption();
    // Vineyard: +30% trade income mult (handled via vineyard count check in economy)
    // Lighthouse: +20% fishing yield flag
    // Bathhouse: +1 NPC heart every 3 days
    let bathhouses = state.buildings.filter(b2 => b2.type === 'bathhouse' && !b2.ruined);
    if (bathhouses.length > 0 && state.npc && state.day % 3 === 0) {
      state.npc.hearts = min(10, state.npc.hearts + 1);
      if (state.livia) state.livia.hearts = min(10, state.livia.hearts + 1);
      if (state.marcus) state.marcus.hearts = min(10, state.marcus.hearts + 1);
      if (state.vesta) state.vesta.hearts = min(10, state.vesta.hearts + 1);
      if (state.felix) state.felix.hearts = min(10, state.felix.hearts + 1);
      addFloatingText(width / 2, height * 0.28, 'Thermae: NPCs feel happy', '#88ccff');
    }
    // Sculptor: +1 gold/day per sculptor (statue commissions)
    let sculptors = state.buildings.filter(b2 => b2.type === 'sculptor' && !b2.ruined);
    if (sculptors.length > 0) {
      let statueGold = sculptors.length * 1;
      state.gold += statueGold;
      addFloatingText(width / 2, height * 0.36, 'Sculptor: +' + statueGold + 'g (commissions)', '#eedd55');
    }
    // ─── RESEARCH DAILY TICK ────────────────────────────────────────────
    if (state.research) {
      // Update library level from building count
      state.research.libraryLevel = (state.buildings || []).filter(b => b.type === 'library' && !b.ruined).length;
      // Advance current research
      if (state.research.current) advanceResearch();
      // Auto-harvest from agricultural_revolution tech
      if (hasTech('agricultural_revolution')) {
        state.plots.forEach(p => {
          if (p.ripe) {
            let amt = 3;
            if (hasTech('selective_breeding') && random() < 0.25) amt *= 2;
            state.harvest += amt;
            p.planted = false; p.ripe = false; p.stage = 0; p.timer = 0;
          }
        });
      }
    }
    // ─── BUILDING MAINTENANCE ──────────────────────────────────────────
    processBuildingMaintenance();
    // Military upkeep (army pay)
    if (typeof processArmyUpkeep === 'function') processArmyUpkeep();
    // Vassal tribute collection
    if (typeof collectVassalTribute === 'function') collectVassalTribute();
    // Check all victory conditions daily
    checkAllVictoryConditions();
    // Nations AI daily tick
    if (state.nations && Object.keys(state.nations).length > 0) updateNationsDaily();
    // Sea People raid check (daily)
    checkSeaPeopleRaid();
    // Personal rival encounter check (every 10-15 days)
    if (typeof checkRivalEncounter === 'function') checkRivalEncounter();
    // Rival trade partner daily income
    if (state.personalRival && state.personalRival.tradePartner && !state.personalRival.invading) {
      state.gold += 3;
    }
    // Random event roll — 20% chance per day
    checkRandomEvent();
    // Daily island resource refresh — nodes respawn each day for revisit incentive
    if (state.vulcan && state.vulcan.phase !== 'unexplored') {
      (state.vulcan.obsidianNodes || []).forEach(n => n.collected = false);
    }
    if (state.hyperborea && state.hyperborea.phase !== 'unexplored') {
      (state.hyperborea.frostNodes || []).forEach(n => n.collected = false);
    }
    if (state.plenty && state.plenty.phase !== 'unexplored') {
      (state.plenty.spiceNodes || []).forEach(n => n.collected = false);
      (state.plenty.fruitTrees || []).forEach(t => { t.fruit = true; t.timer = 0; });
    }
    if (state.necropolis && state.necropolis.phase !== 'unexplored') {
      (state.necropolis.soulNodes || []).forEach(n => n.collected = false);
    }
    // Crystal rain event (15% chance per day after day 10) — spawns collectible drops
    if (state.day > 10 && random() < 0.15) {
      let dropCount = floor(random(3, 6));
      let srx = getSurfaceRX() * 0.7;
      let sry = getSurfaceRY() * 0.7;
      for (let _cri = 0; _cri < dropCount; _cri++) {
        let dx = WORLD.islandCX + random(-srx, srx);
        let dy = WORLD.islandCY + random(-sry, sry);
        state.crystalRainDrops.push({ x: dx, y: dy, timer: 3600, collected: false, glow: random(1000) });
      }
      addFloatingText(width / 2, height * 0.35, 'Crystal rain! ' + dropCount + ' crystals fell nearby', '#44ffaa');
      spawnParticles(state.player.x, state.player.y, 'divine', 6);
    }
    // Vesta crystal gift at 6+ hearts (daily)
    if (state.vesta && state.vesta.hearts >= 6 && random() < 0.4) {
      state.crystals += 2;
      addFloatingText(width / 2, height * 0.4, "Vesta's blessing: +2 crystals", '#aaddff');
    }
    // Cat passive: Grey finds stone, Golden gives gold
    state.cats.filter(c => c.adopted).forEach(cat => {
      if (cat.passive === 'stone' && random() < 0.3) { state.stone++; }
      if (cat.passive === 'gold') { state.gold++; }
    });
    // Spawn wild cats if needed
    if (state.cats.filter(c => !c.adopted).length < 2 && state.day > 3) spawnWildCat();
    // Marcus presence
    if (state.marcus) {
      state.marcus.present = (state.ship.state === 'docked' || state.marcus.hearts >= 6);
    }
    // Festival on last day of each season (day 10, 20, 30, 40)
    if (state.day % 10 === 0) {
      startFestival();
    } else {
      state.festival = null;
    }
    // Random visitor (20% chance per day, after day 5)
    if (state.day > 5 && !state.visitor && random() < 0.2) {
      spawnVisitor();
    }
    // Temple court visitors (daily spawn attempt)
    if (state.day > 5 && state.templeCourt) {
      spawnTempleCourtVisitors();
    }
    // Bottle washes ashore every 3-5 days (random)
    if (state.day > 2 && random() < 0.3 && state.bottles.filter(b => !b.collected).length < 2) {
      spawnBottle();
    }
    // Auto-save handled by real-time timer in draw()
  }

  let hour = state.time / 60;
  if (hour >= 6 && hour <= 18) {
    let solarRate = sin(map(hour, 6, 18, 0, PI)) * 0.12;
    if (state.blessing.type === 'solar') solarRate *= 2;
    if (state.prophecy && state.prophecy.type === 'solar') solarRate *= 2;
    // White cat passive: +5% solar
    if (state.cats.some(c => c.adopted && c.passive === 'solar')) solarRate *= 1.05;
    // Bath house bonus: 2x solar regen when nearby
    let nearBath = state.buildings.some(b => b.type === 'bath' && dist(state.player.x, state.player.y, b.x, b.y) < 60);
    if (nearBath) solarRate *= 2;
    // Egypt passive: +30% crystal/solar recharge
    if (typeof getFactionCrystalRechargeMult === 'function') solarRate *= getFactionCrystalRechargeMult();
    state.solar = min(state.maxSolar, state.solar + solarRate * dt);
    let _cRegenBonus = typeof getCompanionRegenBonus === 'function' ? getCompanionRegenBonus() : 0;
    state.companion.energy = min(100, state.companion.energy + (solarRate * 2.0 + _cRegenBonus) * dt);
  } else {
    // Slow nighttime recovery (resting)
    let _cRegenBonusN = typeof getCompanionRegenBonus === 'function' ? getCompanionRegenBonus() : 0;
    state.companion.energy = min(100, state.companion.energy + (0.02 + _cRegenBonusN) * dt);
  }
  // Heatwave drains companion energy faster
  if (state.weather.type === 'heatwave') {
    state.companion.energy = max(0, state.companion.energy - 0.03 * state.weather.intensity * dt);
    if (state.woodcutter) state.woodcutter.energy = max(0, state.woodcutter.energy - 0.03 * state.weather.intensity * dt);
  }

  // Crystal respawn at temple altar
  state.crystalNodes.forEach(c => {
    if (c.charge <= 0) {
      if (!c.respawnTimer) c.respawnTimer = 800;
      let crystalSpeed = (state.prophecy && state.prophecy.type === 'crystal') ? 3 : 1;
      crystalSpeed *= getEventCrystalMult();
      c.respawnTimer -= dt * crystalSpeed;
      if (c.respawnTimer <= 0) {
        c.charge = 30 + floor(random(30));
        c.respawnTimer = 0;
        spawnParticles(c.x, c.y, 'build', 4);
      }
    }
  });

  // Crystal Collector auto-harvest
  updateCrystalCollector(dt);

  // Crystal rain drop timers — despawn after 60s (3600 frames)
  if (state.crystalRainDrops && state.crystalRainDrops.length > 0) {
    for (let _crd = state.crystalRainDrops.length - 1; _crd >= 0; _crd--) {
      let drop = state.crystalRainDrops[_crd];
      if (drop.collected) { state.crystalRainDrops.splice(_crd, 1); continue; }
      drop.timer -= dt;
      drop.glow += 0.05 * dt;
      if (drop.timer <= 0) { state.crystalRainDrops.splice(_crd, 1); }
    }
  }

  state.plots.forEach(p => {
    if (p.planted && !p.ripe) {
      // Storm pauses crop growth
      if (state.weather.type === 'storm') return;
      let growRate = (hour >= 6 && hour <= 18) ? 0.08 : 0.02;
      if (stormActive) growRate *= 1.8;
      growRate *= getWeatherEffects().farmMult;
      // Drought slows crop growth
      let _dsr = state.daysSinceRain || 0;
      if (_dsr >= 7) growRate *= 0.3;
      else if (_dsr >= 3) growRate *= 0.5;
      if (state.prophecy && state.prophecy.type === 'crops') growRate *= 1.3;
      let fest = getFestival();
      if (fest && fest.effect.crops) growRate *= fest.effect.crops;
      // Ginger cat passive: +2% crop growth
      if (state.cats.some(c => c.adopted && c.passive === 'crops')) growRate *= 1.02;
      // Heart bonus: each NPC heart = +10% crop growth
      growRate *= (1 + state.npc.hearts * 0.03);
      // Aqueduct bonus — nearby aqueduct doubles growth
      let hasAqueduct = state.buildings.some(b => {
        if (b.type !== 'aqueduct') return false;
        let dx = b.x - p.x, dy = b.y - p.y;
        return dx * dx + dy * dy < 80 * 80;
      });
      if (hasAqueduct) growRate *= 2;
      // Adjacency: crops near well = +15% growth
      let nearWell = state.buildings.some(b => b.type === 'well' && !b.ruined &&
        dist(b.x, b.y, p.x, p.y) < 80);
      if (nearWell) growRate *= 1.15;
      if (state.blessing.type === 'crops') growRate *= 2;
      // Event multiplier: harvest_moon = 2x growth speed
      if (state.activeEvent && state.activeEvent.id === 'harvest_moon') growRate *= 2;
      // Tech: irrigation +20% crop growth
      if (typeof hasTech === 'function' && hasTech('irrigation')) growRate *= 1.2;
      // Tech: aqueducts_advanced — all crops water bonus
      if (typeof hasTech === 'function' && hasTech('aqueducts_advanced')) growRate *= 1.15;
      // First crop grows 2x faster so player sees full cycle quickly
      if (typeof getFirstCropGrowthMultiplier === 'function') growRate *= getFirstCropGrowthMultiplier();
      growRate *= (getFactionData().cropGrowthMult || 1);
      // Soil fertility affects growth speed
      if (typeof getFertilityGrowthMult === 'function') growRate *= getFertilityGrowthMult(p);
      p.timer += growRate * dt;
      let oldStage = p.stage;
      p.stage = min(3, floor(p.timer / 40));
      // Check for blessed mutation at stage 2
      if (p.stage >= 2 && oldStage < 2) checkCropMutation(p);
      // Crops wither at 0% fertility
      if (typeof getFertilityGrowthMult === 'function' && getFertilityGrowthMult(p) <= 0) {
        p.planted = false; p.ripe = false; p.stage = 0; p.timer = 0;
        addFloatingText(w2sX(p.x), w2sY(p.y) - 20, 'Crop withered!', '#cc6644');
      } else if (p.timer >= 120) { p.ripe = true; p.glowing = true; }
    }
  });
}

let _cachedSkyBrightness = -1, _skyBrightnessFrame = -1;
function getSkyBrightness() {
  if (frameCount === _skyBrightnessFrame) return _cachedSkyBrightness;
  let h = state.time / 60;
  let result;
  if (h < 5 || h > 21) result = 0.18;
  else if (h < 7) result = map(h, 5, 7, 0.18, 1);
  else if (h < 17) result = 1;
  else result = map(h, 17, 21, 1, 0.18);
  _cachedSkyBrightness = result;
  _skyBrightnessFrame = frameCount;
  return result;
}

// ─── SKY BIRDS ───────────────────────────────────────────────────────────
let skyBirds = null;
function drawSkyBirds() {
  let bright = getSkyBrightness();
  if (bright < 0.2) return;
  // Hide birds during storms, fade them back in during storm_out transition
  if (stormActive) return;
  let birdAlpha = 1;
  if (typeof weatherTransition !== 'undefined' && weatherTransition.active && weatherTransition.type === 'storm_out') {
    birdAlpha = weatherTransition.progress; // birds gradually reappear
  }
  if (typeof weatherTransition !== 'undefined' && weatherTransition.active && weatherTransition.type === 'storm_in') {
    birdAlpha = 1 - weatherTransition.progress; // birds flee
    if (birdAlpha < 0.05) return;
  }
  if (!skyBirds) {
    skyBirds = [];
    for (let i = 0; i < 5; i++) {
      skyBirds.push({
        x: random(width), y: random(height * 0.08, height * 0.35),
        speed: random(0.3, 0.8), wingPhase: random(TWO_PI),
        size: random(3, 6),
      });
    }
  }
  noFill();
  stroke(40, 35, 30, 120 * bright * birdAlpha);
  strokeWeight(1.2);
  skyBirds.forEach(b => {
    b.x += b.speed;
    if (b.x > width + 20) { b.x = -20; b.y = random(height * 0.08, height * 0.35); }
    let wing = sin(frameCount * 0.12 + b.wingPhase) * b.size;
    // V-shaped bird
    line(b.x - b.size, b.y - wing, b.x, b.y);
    line(b.x, b.y, b.x + b.size, b.y - wing);
  });
  noStroke();
}

const _stormCloudData = [
  { x: 0.0, y: 0.04, r: 140 }, { x: 0.12, y: 0.08, r: 130 },
  { x: 0.25, y: 0.03, r: 150 }, { x: 0.35, y: 0.10, r: 120 },
  { x: 0.45, y: 0.05, r: 160 }, { x: 0.55, y: 0.12, r: 135 },
  { x: 0.65, y: 0.04, r: 145 }, { x: 0.75, y: 0.09, r: 130 },
  { x: 0.85, y: 0.06, r: 155 }, { x: 0.95, y: 0.11, r: 125 },
  { x: 0.20, y: 0.18, r: 140 }, { x: 0.50, y: 0.20, r: 150 },
];
function drawStormClouds() {
  let intensity = stormActive ? 1 : map(stormTimer, 0, 600, 0, 0.5);
  noStroke();
  _stormCloudData.forEach((c, i) => {
    let cx = floor(c.x * width + sin(frameCount * 0.003 + i * 0.8) * 25);
    let cy = floor(c.y * height);
    let r = c.r;
    fill(25, 32, 50, 160 * intensity);
    ellipse(cx, cy, r * 2.2, r * 0.7);
    fill(20, 28, 45, 140 * intensity);
    ellipse(cx - r * 0.4, cy - r * 0.12, r * 1.4, r * 0.45);
    ellipse(cx + r * 0.35, cy + r * 0.08, r * 1.3, r * 0.4);
    fill(18, 24, 40, 110 * intensity);
    ellipse(cx, cy + r * 0.18, r * 1.8, r * 0.35);
  });
}

// ─── OCEAN ────────────────────────────────────────────────────────────────
// Full ocean background — the sea surrounds the island on all sides
// Shore fish state
let _shoreFish = null;
function _initShoreFish() {
  _shoreFish = [];
  let cx = WORLD.islandCX, cy = WORLD.islandCY;
  let srx = getSurfaceRX(), sry = getSurfaceRY();
  let fishColors = [
    { r: 180, g: 195, b: 210 }, // silver
    { r: 210, g: 140, b: 60 },  // orange
    { r: 50, g: 70, b: 120 },   // dark blue
    { r: 140, g: 180, b: 160 }, // pale green
    { r: 195, g: 170, b: 120 }, // sandy gold
  ];
  for (let i = 0; i < 5; i++) {
    let angle = random(0, TWO_PI);
    let dist = 1.08 + random(0, 0.08);
    _shoreFish.push({
      x: cx + cos(angle) * srx * dist,
      y: cy + sin(angle) * sry * dist,
      angle: angle,
      baseAngle: angle,
      swimPhase: random(0, TWO_PI),
      speed: 0.3 + random(0, 0.3),
      col: fishColors[i % fishColors.length],
      scatterTimer: 0,
    });
  }
}

function drawOcean() {
  let bright = getSkyBrightness();
  let dayMix = bright;
  let t = frameCount * 0.012;
  let h = state.time / 60;
  noStroke();

  let oceanTop = max(height * 0.06, height * 0.25 - horizonOffset);
  let oceanH = height - oceanTop;

  // Deep ocean gradient — time-of-day tinted
  let tintR = 0, tintG = 0, tintB = 0;
  if (h >= 5 && h < 7) { tintR = 20; tintG = 5; tintB = -10; }
  else if (h >= 16 && h < 19) { tintR = 25; tintG = 8; tintB = -15; }
  else if (h >= 21 || h < 5) { tintR = -5; tintG = -5; tintB = 8; }

  // 10-band gradient for smoother deep ocean
  for (let band = 0; band < 10; band++) {
    let y0 = oceanTop + band * oceanH / 10;
    let d = band / 9;
    let r = lerp(lerp(18, 50, dayMix), lerp(8, 22, dayMix), d) + tintR * (1 - d);
    let g = lerp(lerp(40, 140, dayMix), lerp(20, 65, dayMix), d) + tintG * (1 - d);
    let b = lerp(lerp(60, 175, dayMix), lerp(40, 100, dayMix), d) + tintB * (1 - d);
    fill(max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)));
    rect(0, y0, width, oceanH / 10 + 2);
  }

  // Subtle horizon line where sea meets sky
  {
    let hLineY = floor(oceanTop);
    let hBright = dayMix;
    fill(lerp(80, 180, hBright), lerp(110, 210, hBright), lerp(140, 235, hBright), 35 + 25 * hBright);
    rect(0, hLineY - 1, width, 3);
    fill(lerp(120, 220, hBright), lerp(150, 230, hBright), lerp(170, 245, hBright), 20 + 15 * hBright);
    rect(0, hLineY, width, 1);
    fill(lerp(100, 200, hBright), lerp(130, 215, hBright), lerp(160, 235, hBright), 10 + 8 * hBright);
    rect(0, hLineY - 4, width, 4);
  }

  // ── DEEP OCEAN WAVES — rolling rows with sin-based horizontal movement ──
  let _waveRowStep = _fpsSmooth < 40 ? 44 : 26;
  for (let wy = oceanTop + 4; wy < height; wy += _waveRowStep) {
    let depthNorm = (wy - oceanTop) / oceanH;
    let depthFade = 1 - depthNorm * 0.6;
    let waveAlpha = (28 + 24 * dayMix) * depthFade;
    // Each row has its own speed and frequency for variety
    let rowSpeed = 0.4 + depthNorm * 0.3;
    let rowFreq = 0.025 + depthNorm * 0.015;
    let offsetX = floor(sin(t * rowSpeed + wy * rowFreq) * (14 + depthNorm * 6));

    // Primary wave crest — lighter highlight
    fill(120 + 70 * dayMix, 175 + 50 * dayMix, 210 + 30 * dayMix, waveAlpha);
    let spacing = 60 + floor(depthNorm * 20);
    for (let wx = ((offsetX % spacing) + spacing) % spacing; wx < width; wx += spacing) {
      let segW = 24 + floor(sin(wy * 0.07 + wx * 0.04 + t * 0.8) * 10);
      rect(wx, wy, segW, 3);
    }

    // Foam caps on wave peaks (deep ocean — sparse white dashes)
    if (depthNorm < 0.5 && dayMix > 0.2) {
      let foamCapAlpha = waveAlpha * 0.6 * (1 - depthNorm * 2);
      fill(230, 242, 250, foamCapAlpha);
      for (let wx = ((offsetX + 30) % spacing + spacing) % spacing; wx < width; wx += spacing) {
        let capPhase = sin(t * 1.5 + wx * 0.06 + wy * 0.04);
        if (capPhase > 0.3) {
          let cw = 4 + floor(capPhase * 6);
          rect(wx, wy - 1, cw, 1);
        }
      }
    }

    // Secondary wave (counter-phase) — every other frame for perf
    if (frameCount % 2 === 0) {
      let off2 = floor(sin(t * 0.35 + wy * 0.05 + 2) * 8);
      fill(90 + 50 * dayMix, 150 + 40 * dayMix, 195 + 25 * dayMix, waveAlpha * 0.5);
      for (let wx = ((off2 % 90) + 90) % 90; wx < width; wx += 90) {
        rect(wx, wy + 5, 18 + floor(sin(wy * 0.05 + wx * 0.03) * 6), 2);
      }
      // Dark trough between waves
      fill(10 + 20 * dayMix, 25 + 50 * dayMix, 50 + 70 * dayMix, waveAlpha * 0.5);
      for (let wx = ((offsetX + 14) % 90 + 90) % 90; wx < width; wx += 90) {
        rect(wx, wy + 8, 14, 2);
      }
    }
  }

  // ── MID OCEAN — lighter waves closer to island center ──
  {
    let midTop = oceanTop + oceanH * 0.25;
    let midBot = oceanTop + oceanH * 0.65;
    let midStep = _fpsSmooth < 40 ? 32 : 20;
    for (let wy = midTop; wy < midBot; wy += midStep) {
      let midNorm = (wy - midTop) / (midBot - midTop);
      let midAlpha = 12 * dayMix * (1 - abs(midNorm - 0.5) * 2);
      let midOff = floor(sin(t * 0.7 + wy * 0.04) * 10);
      // Reflection highlight — lighter blue-white bands
      fill(150 + 80 * dayMix, 200 + 40 * dayMix, 230 + 20 * dayMix, midAlpha);
      for (let wx = ((midOff % 80) + 80) % 80; wx < width; wx += 80) {
        let sw = 16 + floor(sin(wy * 0.06 + wx * 0.05 + t) * 6);
        rect(wx, wy, sw, 2);
      }
    }
  }

  // Caustic light patterns on shallow water (near island)
  if (dayMix > 0.3) {
    let causticA = (dayMix - 0.3) * 25;
    for (let ci = 0; ci < 5; ci++) {
      let cx = floor(noise(ci * 7.3 + frameCount * 0.004) * width);
      let cy = floor(oceanTop + noise(ci * 11.1 + frameCount * 0.003) * oceanH * 0.4);
      let cSize = 4 + floor(sin(frameCount * 0.06 + ci * 2.1) * 3);
      let cAlpha = causticA * (sin(frameCount * 0.05 + ci * 1.7) * 0.5 + 0.5);
      fill(180 + 60 * dayMix, 220 + 20 * dayMix, 240, cAlpha);
      rect(cx, cy - 1, cSize, 1);
      rect(cx - 1, cy, cSize + 2, 1);
      rect(cx, cy + 1, cSize, 1);
    }
  }

  // ── FOAM WHITECAPS — pixel art foam on wave peaks ──
  if (frameCount % 2 === 0) {
    for (let fy = oceanTop + 12; fy < height; fy += 34) {
      let depthFade = 1 - (fy - oceanTop) / oceanH * 0.5;
      for (let fx = 0; fx < width; fx += 58) {
        let foamPhase = sin(t * 1.2 + fx * 0.05 + fy * 0.06);
        if (foamPhase > 0.4) {
          let foamAlpha = (foamPhase - 0.4) * 70 * depthFade * max(0.3, dayMix);
          fill(225, 238, 248, foamAlpha);
          let fw = floor(6 + foamPhase * 7);
          let foamX = floor(fx + sin(t * 0.8 + fx * 0.03) * 5);
          rect(foamX, fy, fw, 2);
          // Trailing foam spray
          if (foamPhase > 0.55) {
            fill(235, 245, 252, foamAlpha * 0.6);
            rect(foamX + fw + 2, fy + 1, floor(fw * 0.4), 1);
            rect(foamX - 3, fy + 1, 2, 1);
          }
        }
      }
    }
  }

  // ── SUN SPARKLES — glittering diamonds on water surface ──
  // More sparkles at midday, fewer at dawn/dusk, none at night
  if (dayMix > 0.35 && _fpsSmooth > 30) {
    let isMidDay = h >= 10 && h <= 14;
    let sparkleCount = isMidDay ? 10 : 6;
    let sparkleAlpha = (dayMix - 0.35) * 2.5;
    if (isMidDay) sparkleAlpha *= 1.4;
    for (let i = 0; i < sparkleCount; i++) {
      let sx2 = floor(noise(i * 10 + frameCount * 0.003) * width);
      let sy2 = floor(oceanTop + noise(i * 20 + frameCount * 0.002) * oceanH * 0.65);
      let sparkle = sin(frameCount * 0.12 + i * 2.3);
      if (sparkle > 0.6) {
        let sa = (sparkle - 0.6) * 450 * sparkleAlpha;
        fill(255, 250, 225, sa);
        // Cross sparkle shape
        rect(sx2, sy2 - 1, 2, 4);
        rect(sx2 - 1, sy2, 4, 2);
        // Extra glint at midday
        if (isMidDay && sparkle > 0.8) {
          fill(255, 255, 240, sa * 0.4);
          rect(sx2 - 1, sy2 - 2, 4, 6);
          rect(sx2 - 2, sy2 - 1, 6, 4);
        }
      }
    }
  }

  // Sun reflection column — stepped horizontal bars
  if (dayMix > 0.3) {
    let sunH = state.time / 60;
    let sunX = floor(map(sunH, 5, 20, width * 0.1, width * 0.9));
    for (let ry = oceanTop + 5; ry < oceanTop + 65; ry += 8) {
      let reflAlpha = 14 * dayMix * (1 - (ry - oceanTop) / 65);
      let rw = floor(18 + sin(ry * 0.12 + t) * 8);
      let rx = sunX + floor(sin(t * 1.5 + ry * 0.04) * 8) - rw / 2;
      fill(255, 225, 130, reflAlpha);
      rect(rx, ry, rw, 2);
      fill(255, 210, 110, reflAlpha * 0.5);
      rect(rx + rw + 2, ry + 1, 3, 1);
      rect(rx - 4, ry + 1, 3, 1);
    }
  }

  // Bioluminescence at night — glowing plankton sparkles
  if (dayMix < 0.3) {
    let bioAlpha = map(dayMix, 0, 0.3, 1, 0);
    for (let bi = 0; bi < 6; bi++) {
      let bx = floor(noise(bi * 13.7 + frameCount * 0.002) * width);
      let by = floor(oceanTop + 15 + noise(bi * 9.3 + frameCount * 0.0015) * (oceanH - 30));
      let pulse = sin(frameCount * 0.04 + bi * 2.3) * 0.5 + 0.5;
      if (pulse > 0.4) {
        let ba = (pulse - 0.4) * 150 * bioAlpha;
        fill(60, 200, 220, ba * 0.3);
        rect(bx - 2, by - 2, 5, 5);
        fill(100, 240, 255, ba);
        rect(bx, by, 2, 2);
        fill(60, 200, 220, ba * 0.15);
        rect(bx - 3, by, 2, 1);
      }
    }
  }

  // ── SHORE FISH — visible colored fish swimming near the coastline ──
  if (dayMix > 0.2 && _fpsSmooth > 25) {
    if (!_shoreFish) _initShoreFish();
    let cx = WORLD.islandCX, cy = WORLD.islandCY;
    let srx = getSurfaceRX(), sry = getSurfaceRY();
    let px = state.player.x, py = state.player.y;
    for (let i = 0; i < _shoreFish.length; i++) {
      let f = _shoreFish[i];
      f.swimPhase += 0.03;
      // Scatter away from player if within 80px
      let dpx = f.x - px, dpy = f.y - py;
      let playerDist = sqrt(dpx * dpx + dpy * dpy);
      if (playerDist < 80 && f.scatterTimer <= 0) {
        f.scatterTimer = 60;
        f.angle += (dpx > 0 ? 0.5 : -0.5);
      }
      if (f.scatterTimer > 0) {
        f.scatterTimer--;
        f.x += cos(f.angle) * f.speed * 2;
        f.y += sin(f.angle) * f.speed * 1.2;
      } else {
        // Gentle circular swimming near base angle
        f.angle = f.baseAngle + sin(f.swimPhase * 0.5) * 0.8;
        let orbitDist = 1.08 + sin(f.swimPhase * 0.3 + i * 1.7) * 0.04;
        let targetX = cx + cos(f.angle) * srx * orbitDist;
        let targetY = cy + sin(f.angle) * sry * orbitDist;
        f.x = lerp(f.x, targetX, 0.04);
        f.y = lerp(f.y, targetY, 0.04);
      }
      // Draw fish at screen coords
      let fsx = w2sX(f.x), fsy = w2sY(f.y);
      let fishDir = f.angle;
      let fdx = cos(fishDir), fdy = sin(fishDir);
      let fishAlpha = 160 * dayMix;
      // Body (4px ellipse)
      fill(f.col.r, f.col.g, f.col.b, fishAlpha);
      rect(floor(fsx - 2), floor(fsy - 1), 4, 2);
      // Tail (2px)
      fill(f.col.r - 20, f.col.g - 20, f.col.b - 10, fishAlpha * 0.8);
      rect(floor(fsx - fdx * 3), floor(fsy - fdy * 2), 2, 2);
      // Eye dot
      fill(20, 20, 30, fishAlpha);
      rect(floor(fsx + fdx * 1.5), floor(fsy), 1, 1);
    }
  }

  // Jumping fish (existing — ocean-wide)
  if (frameCount % 180 === 0) {
    if (_jumpingFish.length < 2) {
      _jumpingFish.push({
        x: random(width * 0.1, width * 0.9),
        y: oceanTop + random(30, oceanH - 30),
        phase: 0, size: random(3, 6),
      });
    }
  }
  {
    noStroke();
    for (let i = _jumpingFish.length - 1; i >= 0; i--) {
      let f = _jumpingFish[i];
      f.phase += 0.08;
      let jumpY = -sin(f.phase) * 18;
      if (f.phase > PI) { _jumpingFish.splice(i, 1); continue; }
      let fy2 = f.y + jumpY;
      let fx2 = floor(f.x), fy3 = floor(fy2);
      // Fish body
      fill(165, 185, 205, 185);
      rect(fx2 - f.size, fy3 - floor(f.size * 0.4), floor(f.size * 2.5), floor(f.size * 0.8));
      // Tail
      fill(150, 172, 195, 180);
      rect(fx2 + floor(f.size * 1.5), fy3 - floor(f.size * 0.5), floor(f.size * 0.8), floor(f.size));
      // Splash at entry/exit
      if (f.phase < 0.5 || f.phase > PI - 0.5) {
        fill(180, 220, 245, 50);
        let splashR = f.phase < 0.5 ? floor((0.5 - f.phase) * 15) : floor((f.phase - PI + 0.5) * 15);
        rect(fx2 - splashR, floor(f.y), splashR * 2, 2);
      }
      // Water droplets during arc
      if (f.phase > 0.3 && f.phase < PI - 0.3) {
        fill(180, 215, 240, 80 * (1 - abs(f.phase - PI / 2) / (PI / 2)));
        for (let di = 0; di < 2; di++) {
          let dx = floor(fx2 + sin(f.phase * 3 + di * 2.1) * f.size);
          let dy = floor(fy3 + cos(f.phase * 2 + di * 3.7) * f.size * 0.5);
          rect(dx, dy, 1, 1);
        }
      }
    }
  }
}
// Ambient ships — see sailing.js

function drawShoreWaves() {
  if (frameCount % 2 !== 0) return;
  let ix = w2sX(WORLD.islandCX);
  let iy = w2sY(WORLD.islandCY);
  let iw = state.islandRX * 2;
  let ih = state.islandRY * 2;
  let t = frameCount * 0.015;
  let bright = getSkyBrightness();
  let dayMix = max(0.3, bright);

  noStroke();
  // Animated sine-based shoreline — foam crests roll in and out
  // Uses coastline verts so waves follow the same organic shape as shallow water layers
  for (let a = 0; a < TWO_PI; a += 0.045) {
    let coastR = _getCoastlineRadiusAtAngle(a, iw * 0.56, ih * 0.25);
    // yOffset attenuation at east/west to match drawCoastlineShape fix
    let yOff = -10 * abs(sin(a));
    // Multi-frequency wave for organic shoreline movement
    let wave1 = sin(t * 2.5 + a * 6);
    let wave2 = sin(t * 1.8 + a * 3.5 + 1.2) * 0.5;
    let wave3 = sin(t * 3.5 + a * 9) * 0.25;
    let wavePhase = wave1 + wave2 + wave3;
    let waveOff = floor(wavePhase * 4 + 3);
    let ex = floor(ix + cos(a) * (coastR.rx + waveOff));
    let ey = floor((iy + yOff) + sin(a) * (coastR.ry + waveOff * 0.4));
    let foamA = (70 + sin(t * 1.2 + a * 4) * 28) * dayMix;
    // Pixel foam — animated horizontal rects
    fill(225, 242, 255, foamA);
    let fw = floor(8 + sin(t * 1.8 + a * 3) * 4);
    rect(ex - fw / 2, ey, fw, 2);
    // Bright crest pixel
    if (wavePhase > 0.4) {
      fill(252, 255, 255, (wavePhase - 0.4) * 120 * dayMix);
      rect(ex - 2, ey, 5, 1);
    }
    // Foam spray — tiny pixel dots above crest
    if (wavePhase > 0.8 && random() < 0.15) {
      fill(240, 250, 255, foamA * 0.6);
      rect(ex + floor(random(-4, 4)), ey - 2, 1, 1);
    }
  }
  // Inner pixel foam — beach-to-shallow transition
  // Uses coastline-aware radii to match island layers
  for (let a = 0; a < TWO_PI; a += 0.08) {
    let wavePhase = sin(t * 3.0 + a * 4 + 1.5);
    if (wavePhase > 0.35) {
      let beachR = _getCoastlineRadiusAtAngle(a, iw * 0.48, ih * 0.205);
      let grassR = _getCoastlineRadiusAtAngle(a, iw * 0.45, ih * 0.18);
      let beachYOff = -14 * abs(sin(a));
      let grassYOff = -18 * abs(sin(a));
      let waveOff = floor((wavePhase - 0.35) * 3);
      let ex = floor(ix + cos(a) * (beachR.rx + waveOff));
      let ey = floor((iy + beachYOff) + sin(a) * (beachR.ry + waveOff * 0.4));
      // Check against grass boundary (coastline-aware)
      let gx2 = (ex - ix) / grassR.rx;
      let gy2 = (ey - (iy + grassYOff)) / grassR.ry;
      if (gx2 * gx2 + gy2 * gy2 < 1.0) continue;
      fill(232, 248, 255, (wavePhase - 0.35) * 95 * dayMix);
      rect(ex - 3, ey, 6, 2);
    }
  }
}

// ─── SEASONS ─────────────────────────────────────────────────────────────
function getSeason() {
  // 10 days per season: Spring(0), Summer(1), Autumn(2), Winter(3)
  return floor((state.day % 40) / 10);
}

function getSeasonName() {
  return ['VER (Spring)', 'AESTAS (Summer)', 'AUTUMNUS (Autumn)', 'HIEMS (Winter)'][getSeason()];
}


// ─── NIGHT MARKET ────────────────────────────────────────────────────────
const MARKET_ITEMS = [
  { name: 'Golden Seeds (x5)', cost: { meals: 3 }, reward: 'seeds', qty: 5, desc: '5 premium seeds' },
  { name: 'Grape Seeds (x3)', cost: { meals: 2 }, reward: 'grapeSeeds', qty: 3, desc: '3 grape seeds' },
  { name: 'Olive Seeds (x3)', cost: { meals: 2 }, reward: 'oliveSeeds', qty: 3, desc: '3 olive seeds' },
  { name: 'Crystal Shard', cost: { wine: 1 }, reward: 'crystals', qty: 3, desc: '3 crystals' },
  { name: 'Stone Block (x10)', cost: { meals: 2 }, reward: 'stone', qty: 10, desc: '10 stone' },
  { name: 'Blessing Token', cost: { wine: 2 }, reward: 'blessing', qty: 1, desc: 'Random blessing' },
  { name: 'Cat Treat', cost: { meals: 1, oil: 1 }, reward: 'catTreat', qty: 1, desc: 'Befriend a cat instantly' },
  { name: 'Gold Pouch', cost: { wine: 1 }, reward: 'gold', qty: 15, desc: '15 gold' },
];

function openNightMarket() {
  // Stock 4 random items each time
  let shuffled = [...MARKET_ITEMS].sort(() => random() - 0.5);
  state.nightMarket.stock = shuffled.slice(0, 4);
  state.nightMarket.active = true;
  state.nightMarket.shopOpen = false;
  unlockJournal('night_market');
  addFloatingText(width / 2, height * 0.20, 'The Night Market has arrived!', '#ffaa44');
  addFloatingText(width / 2, height * 0.26, 'Find the merchant to browse rare wares.', '#cc8833');
  addNotification('Night Market open until midnight!', '#ffaa44');
  if (typeof snd !== 'undefined' && snd) snd.playSFX('fanfare');
  let mp = getMarketPosition();
  spawnParticles(mp.x, mp.y, 'divine', 20);
  state.screenFlash = { r: 255, g: 180, b: 50, alpha: 40, timer: 30 };
}

function canAffordMarketItem(item) {
  for (let [res, amt] of Object.entries(item.cost)) {
    if ((state[res] || 0) < amt) return false;
  }
  return true;
}

function buyMarketItem(idx) {
  let item = state.nightMarket.stock[idx];
  if (!item || !canAffordMarketItem(item)) return;
  // Pay cost
  for (let [res, amt] of Object.entries(item.cost)) {
    state[res] -= amt;
  }
  // Give reward
  if (item.reward === 'blessing') {
    let types = ['crops', 'solar', 'speed', 'luck'];
    state.blessing = { type: types[floor(random(types.length))], timer: 720 };
    if (snd) snd.playSFX('ding');
    addFloatingText(width / 2, height * 0.3, 'Blessed!', '#ffcc44');
  } else if (item.reward === 'catTreat') {
    let wild = state.cats.find(c => !c.adopted);
    if (wild) { wild.adopted = true; wild.bondStage = 4; wild.bondDay = state.day; }
    addFloatingText(width / 2, height * 0.3, 'Cat befriended!', '#ffaa88');
  } else {
    state[item.reward] = (state[item.reward] || 0) + item.qty;
    addFloatingText(width / 2, height * 0.3, '+' + item.qty + ' ' + item.reward, '#ffcc44');
  }
  // Remove from stock
  state.nightMarket.stock[idx] = null;
  spawnParticles(state.player.x, state.player.y, 'harvest', 8);
}

function getMarketPosition() {
  return { x: WORLD.islandCX + 100, y: WORLD.islandCY + getSurfaceRY() * 0.55 };
}

function drawNightMarket() {
  if (!state.nightMarket.active) return;
  let mp = getMarketPosition();
  let sx = w2sX(mp.x), sy = w2sY(mp.y);

  push();
  translate(sx, sy);

  // Market stall — wooden frame with fabric canopy
  noStroke();
  // Posts
  fill(100, 70, 35);
  rect(-25, -30, 4, 35);
  rect(21, -30, 4, 35);
  // Counter
  fill(120, 85, 45);
  rect(-27, -2, 54, 8, 2);
  fill(140, 100, 55);
  rect(-27, -2, 54, 3, 2, 2, 0, 0);
  // Canopy — pixel rect
  fill(180, 50, 30, 200);
  rect(-32, -32, 64, 8);
  fill(200, 60, 35, 200);
  rect(-30, -32, 60, 4);
  // Hanging lanterns — pixel
  let glow = sin(frameCount * 0.04) * 0.3 + 0.7;
  fill(255, 180, 50, glow * 200);
  rect(-18, -24, 6, 7);
  rect(12, -24, 6, 7);
  fill(255, 220, 100, glow * 150);
  rect(-17, -23, 4, 4);
  rect(13, -23, 4, 4);

  // Wares on counter — pixel
  fill(200, 180, 60);
  rect(-14, -6, 5, 3);
  fill(140, 60, 140);
  rect(-2, -6, 4, 3);
  fill(80, 180, 80);
  rect(10, -6, 4, 3);

  // Merchant NPC — pixel hooded figure
  fill(60, 40, 80);
  rect(-7, -24, 14, 14);
  fill(50, 30, 70);
  rect(-8, -28, 16, 6);
  // Face
  fill(210, 180, 140);
  rect(-3, -20, 6, 5);
  // Eyes
  fill(40);
  rect(-2, -19, 1, 1);
  rect(1, -19, 1, 1);

  pop();

  // Interaction prompt
  let pd = dist(state.player.x, state.player.y, mp.x, mp.y);
  if (pd < 60) {
    fill(255, 255, 255, 200);
    textAlign(CENTER, CENTER);
    textSize(10);
    text('[E] Browse Market', sx, sy - 42);
  }
}

function drawMarketUI() {
  if (!state.nightMarket.shopOpen) return;
  let panW = min(310, width - 20), panH = min(230, height - 20);
  let panX = max(10, width / 2 - panW / 2);
  let panY = max(10, height / 2 - panH / 2 - 10);

  // Backdrop
  rectMode(CORNER);
  noStroke();
  fill(0, 0, 0, 150);
  rect(0, 0, width, height);

  drawParchmentPanel(panX, panY, panW, panH);

  // Title
  fill(200, 170, 90);
  textAlign(CENTER, TOP);
  textSize(14);
  text('FORUM NOCTIS', width / 2, panY + 12);
  fill(160, 140, 100);
  textSize(11);
  text('Night Market — Trade meals & wine for rare goods', width / 2, panY + 30);
  // Decorative line
  stroke(140, 110, 55, 100);
  strokeWeight(0.5);
  line(panX + 20, panY + 42, panX + panW - 20, panY + 42);
  noStroke();

  // Items
  textAlign(LEFT, TOP);
  state.nightMarket.stock.forEach((item, i) => {
    if (!item) return;
    let oy = panY + 50 + i * 40;
    let affordable = canAffordMarketItem(item);

    // Row bg
    fill(affordable ? color(60, 50, 35, 150) : color(40, 30, 25, 100));
    rect(panX + 12, oy, panW - 24, 34, 3);
    // Left accent bar
    fill(affordable ? color(180, 150, 60) : color(80, 60, 40));
    rect(panX + 12, oy, 3, 34, 3, 0, 0, 3);

    // Name
    fill(affordable ? color(220, 200, 150) : color(100, 85, 65));
    textSize(10);
    text(item.name, panX + 22, oy + 5);

    // Cost
    let costStr = Object.entries(item.cost).map(([k, v]) => v + ' ' + k).join(' + ');
    fill(affordable ? color(160, 140, 110) : color(80, 70, 55));
    textSize(10);
    text('Cost: ' + costStr, panX + 22, oy + 20);

    // Click hint
    if (affordable) {
      fill(180, 150, 60);
      textAlign(RIGHT, TOP);
      textSize(11);
      text('CLICK', panX + panW - 18, oy + 12);
      textAlign(LEFT, TOP);
    }
  });

  // Close hint
  fill(120, 100, 70);
  textAlign(CENTER, TOP);
  textSize(11);
  text('[ESC] Close', width / 2, panY + panH - 16);
  textAlign(LEFT, TOP);
  rectMode(CORNER);
}

// ─── MESSAGE BOTTLES & TREASURE ──────────────────────────────────────────
const BOTTLE_MESSAGES = [
  { msg: 'Beneath the oldest tree, riches sleep...', reward: 'gold', qty: 20 },
  { msg: 'The temple guards a crystalline secret.', reward: 'crystals', qty: 5 },
  { msg: 'Where water meets stone, seeds take root.', reward: 'seeds', qty: 10 },
  { msg: 'The merchant hid his finest grape cuttings here.', reward: 'grapeSeeds', qty: 5 },
  { msg: 'An ancient Roman buried olive branches...', reward: 'oliveSeeds', qty: 5 },
  { msg: 'Neptune left a gift in the shallows.', reward: 'fish', qty: 8 },
  { msg: 'Vulcan\'s forge once burned here — stone remains.', reward: 'stone', qty: 15 },
  { msg: 'A woodcutter\'s hidden cache!', reward: 'wood', qty: 20 },
];

function spawnBottle() {
  // Place bottle on island edge (south side, near water)
  let angle = random(-0.8, 0.8); // mostly south
  let cx = WORLD.islandCX, cy = WORLD.islandCY;
  let bx = cx + cos(PI / 2 + angle) * (WORLD.islandRX - 20);
  let by = cy + sin(PI / 2 + angle) * (WORLD.islandRY - 10);

  let msgData = BOTTLE_MESSAGES[floor(random(BOTTLE_MESSAGES.length))];
  // Treasure location: random spot on island
  let tx = cx + random(-WORLD.islandRX * 0.6, WORLD.islandRX * 0.6);
  let ty = cy + random(-WORLD.islandRY * 0.5, WORLD.islandRY * 0.5);

  state.bottles.push({
    x: bx, y: by, collected: false,
    message: msgData.msg,
    treasure: { type: msgData.reward, qty: msgData.qty, x: tx, y: ty, found: false },
    bobPhase: random(TWO_PI),
  });
}

function collectBottle(bottle) {
  bottle.collected = true;
  state.activeTreasure = bottle.treasure;
  addFloatingText(w2sX(bottle.x), w2sY(bottle.y) - 20, 'Found a bottle!', '#44ccff');
  addFloatingText(width / 2, height * 0.3, '"' + bottle.message + '"', '#ffddaa');
  spawnParticles(bottle.x, bottle.y, 'build', 8);
}

function digTreasure() {
  let t = state.activeTreasure;
  if (!t || t.found) return false;
  let pd = dist(state.player.x, state.player.y, t.x, t.y);
  if (pd < 35) {
    t.found = true;
    state[t.type] = (state[t.type] || 0) + t.qty;
    state.codex.treasuresFound++;
    let _relicMap = { ancientRelic: 'bronze_eagle', crystals: 'crystal_shard', gold: 'ancient_coin', ironOre: 'roman_helm' };
    let _rid = _relicMap[t.type] || 'sea_amphora';
    if (!state.codex.relics) state.codex.relics = {};
    let _isNewRelic = !state.codex.relics[_rid];
    if (!state.codex.relics[_rid]) state.codex.relics[_rid] = { found: true, firstDay: state.day };
    if (_isNewRelic && typeof markCodexDiscovery === 'function') markCodexDiscovery('relics', _rid);
    unlockJournal('relic_found');
    addFloatingText(w2sX(t.x), w2sY(t.y) - 30, 'TREASURE! +' + t.qty + ' ' + t.type, '#ffcc00');
    spawnParticles(state.player.x, state.player.y, 'harvest', 20);
    triggerScreenShake(3, 10);
    state.screenFlash = { r: 255, g: 204, b: 0, alpha: 100, timer: 30 };
    state.activeTreasure = null;
    return true;
  }
  return false;
}

function drawBottles() {
  state.bottles.forEach(b => {
    if (b.collected) return;
    let sx = w2sX(b.x), sy = w2sY(b.y);
    let bob = sin(frameCount * 0.03 + b.bobPhase) * 3;

    push();
    translate(sx, sy + bob);
    // Bottle body
    fill(100, 180, 120, 200);
    noStroke();
    rect(-3, -8, 6, 10, 2);
    // Neck
    fill(90, 170, 110, 200);
    rect(-1.5, -12, 3, 5, 1);
    // Cork
    fill(180, 140, 80);
    rect(-2, -13, 4, 2, 1);
    // Paper inside
    fill(240, 230, 200, 180);
    rect(-1, -6, 2, 5, 0.5);
    // Sparkle
    if (frameCount % 40 < 10) {
      fill(255, 255, 200, 150);
      ellipse(0, -8, 3 + sin(frameCount * 0.1) * 2);
    }
    pop();
  });
}

function drawTreasureHint() {
  let t = state.activeTreasure;
  if (!t || t.found) return;
  // Draw X marker at treasure location
  let sx = w2sX(t.x), sy = w2sY(t.y);
  let pulse = sin(frameCount * 0.06) * 0.3 + 0.7;
  push();
  translate(sx, sy);
  stroke(255, 180, 0, pulse * 200);
  strokeWeight(2);
  line(-6, -6, 6, 6);
  line(-6, 6, 6, -6);
  noStroke();
  fill(255, 200, 50, floor(pulse * 100));
  rect(-8, -1, 16, 2); rect(-1, -8, 2, 16);
  pop();

  // Distance indicator on HUD
  let pd = dist(state.player.x, state.player.y, t.x, t.y);
  let warmth = pd < 30 ? 'DIG HERE! [E]' : pd < 80 ? 'BURNING HOT!' : pd < 150 ? 'Getting warmer...' : 'Cold...';
  let warmColor = pd < 30 ? '#ff4444' : pd < 80 ? '#ffaa00' : pd < 150 ? '#ffcc66' : '#88aacc';
  fill(color(warmColor));
  textAlign(CENTER, CENTER);
  textSize(10);
  text(warmth, width / 2, 72);
}

// ─── VILLA CODEX ─────────────────────────────────────────────────────────
function getCodexCompletion() {
  let c = state.codex;
  let total = 0, done = 0;
  // Fish: 5 types
  total += 5; done += Object.keys(c.fishCaught).length;
  // Crops: 7 types (grain, grape, olive + 4 seasonal)
  total += 7; done += Object.keys(c.cropsGrown).length;
  // Buildings: 20 types (12 base + 8 advanced)
  total += 20; done += Object.keys(c.buildingsBuilt).length;
  // NPC hearts: max 10
  total += 10; done += min(10, c.npcMaxHearts);
  // Treasures: 5+
  total += 5; done += min(5, c.treasuresFound);
  // Festivals: 4 seasons
  total += 4; done += min(4, c.festivalsAttended);
  // Visitors: 5 trades
  total += 5; done += min(5, c.visitorsTraded);
  // Combo: reach 10
  total += 1; done += c.bestCombo >= 10 ? 1 : 0;
  return { done, total, pct: total > 0 ? done / total : 0 };
}

// ─── EXILE'S JOURNAL — STORY ENTRIES ──────────────────────────────────────
const JOURNAL_ENTRIES = [
  { id: 'shipwreck', title: 'The Storm',
    text: 'I remember lightning splitting the mast. The sea swallowed everything — the ship, the crew, my orders from Rome. I woke on sand with salt in my wounds and the sun on my face. Wherever this is, the gods saw fit to spare me.' },
  { id: 'first_harvest', title: 'First Harvest',
    text: 'The soil here is rich — dark and warm. My first grain came up golden within days. Perhaps exile is not punishment but providence. Rome taught me to conquer; this island teaches me to tend.' },
  { id: 'first_building', title: 'Laying Stones',
    text: 'I found cut stone among the ruins — Roman stone, dressed in the old way. Someone built here before me. The mortar crumbled centuries ago, but the foundations hold. I will build upon what they left.' },
  { id: 'npc_friend', title: 'A Familiar Voice',
    text: 'The old man speaks Latin with a provincial accent — Hispania, perhaps. He says his grandfather came here seeking fortune. Three generations on this forgotten shore. "Rome lives in small acts," he told me. I believe him.' },
  { id: 'first_crystal', title: 'The Singing Stones',
    text: 'The crystals hum at dawn. I pressed my ear to one and heard — or imagined — a chorus. The locals call them "Tears of Sol Invictus." They pulse with warmth. Whatever power cursed my voyage, it also blessed this place.' },
  { id: 'first_fish', title: 'Patient Waters',
    text: 'The sea that nearly killed me now feeds me. I sat at the pier for an hour before the first bite. A legionary learns patience in the shield wall; a fisherman learns it in silence. Both keep you alive.' },
  { id: 'terra_nova', title: 'Beyond the Horizon',
    text: 'There is another island to the west — dark with forest, wreathed in mist. The locals avoid it. I see firelight some nights. Whether friend or foe waits there, a soldier must know his surroundings.' },
  { id: 'first_festival', title: 'Feast of Flowers',
    text: 'We held a festival today. Garlands on every post, honey-wine in clay cups. For a moment I forgot I was an exile. The children danced and the old man played a bone flute. Rome celebrates with spectacle; here we celebrate with warmth.' },
  { id: 'five_hearts', title: 'Bonds of Exile',
    text: 'The old man brought me wine today — unprompted, unasked. He said I remind him of his son, lost to fever years ago. We sat and watched the sunset. Exile strips away rank and pretense. What remains is simply human.' },
  { id: 'relic_found', title: 'Relic of the IX',
    text: 'Among the ruins I found a bronze eagle — a legionary standard, tarnished green. "LEG IX FID" stamped on the base. The Ninth Legion, Fidelis. They were posted to Britannia and vanished from history. Did they come here? Did they build all this?' },
  { id: 'night_market', title: 'Merchants of Moonlight',
    text: 'A merchant ship appeared at dusk, lanterns swaying. They trade under moonlight — old superstition, they say. Their wares are strange: amulets from Egypt, spices from the East. The world is wider than Rome knows.' },
  { id: 'temple_prayer', title: 'Prayer to Sol',
    text: 'I rebuilt the temple altar and prayed for the first time since the storm. Not the formal prayers of a legionary — something quieter, more honest. "Let this place be enough." The crystal behind the altar glowed. I choose to believe that was an answer.' },
  { id: 'conquest_settled', title: 'New Foundations',
    text: 'Terra Nova is ours now. Workers clear trees, builders raise walls. It is a pale echo of Roman expansion, but it feels different — we build not to conquer but to shelter. The Ninth would understand, I think. They came here seeking the same.' },
  { id: 'trireme_repair', title: 'Seaworthy Again',
    text: 'With salvaged planks and fraying rope, I have made the trireme passable. Not seaworthy by Roman standards — no centurion would board this wreck willingly. But she floats, the patched sail holds wind, and the oars still pull. That is enough.' },
  { id: 'home_found', title: 'A Shore Remembered',
    text: 'The island appeared through morning haze like a half-forgotten dream. Roman columns on the ridge, an aqueduct spine along the hill. Someone built a life here once. The docks are rotting, the fields are wild, but the bones of a colony remain. This will be home.' },
  { id: 'marcus_found', title: 'The Soldier in the Rubble',
    text: 'I found him pinned under a collapsed archway — still alive, still cursing. Marcus, a legionary like me, shipwrecked in the same storm. His leg was trapped but his spirit was not. "Get me out," he growled, "and I will guard this place with my life." I believed him.' },
  { id: 'vesta_found', title: 'Keeper of the Flame',
    text: 'She was kneeling at the ruined shrine, whispering prayers to dead embers. Vesta, a priestess who kept the sacred flame on a temple ship. The storm took her flame but not her faith. She asked only for crystals to relight it. A small price for divine counsel.' },
  { id: 'felix_found', title: 'The Farmer Who Stayed',
    text: 'Felix was already here — has been for years, he says. A freedman who chose this island over Rome. The fields were his pride before the storm flattened them. He looked at the weeds and laughed. "Weeds just mean the soil is good." I helped him pull the first row.' },
  { id: 'villa_restored', title: 'Villa Nova',
    text: 'Three souls found, three purposes joined. Marcus guards the perimeter. Vesta tends the shrine. Felix turns soil. And I — I am the thread that binds them. The villa is no longer a ruin. Smoke rises from the hearth. This is not exile anymore. This is beginning.' },
  { id: 'lares_awaken', title: 'Spirit of the Hearth',
    text: 'At Vesta\'s urging, I placed crystals on the altar and spoke the old words. The air thickened. A shape formed — luminous, translucent, vaguely human. The Lares, guardian spirit of this place. It drifted to the garden and began to tend the crops. Some help is not of this world.' },
  { id: 'woodcutter_join', title: 'The Axeman Cometh',
    text: 'After felling enough trees to prove my purpose, a figure emerged from the grove — broad-shouldered, silent, axe in hand. Not a ghost. A descendant of the colony, living wild in the forest. He nodded once and began to chop. No words needed between men who work.' },
  { id: 'harvester_join', title: 'Hands for the Harvest',
    text: 'The first ripe grain drew her out — a weathered woman with a woven basket and a sickle worn smooth from years of use. She had been watching from the ruins, waiting to see if we meant to farm or to plunder. My harvest answered her question.' },
  { id: 'centurion_join', title: 'Shield and Sword',
    text: 'Marcus vouched for me to his old comrade — a centurion who survived the wreck and hid in the hills. He appeared at the villa gate in battered armor, saluted, and took his post. "Point me at the enemy," he said. Some soldiers never stop being soldiers.' },
  { id: 'full_codex', title: 'The Whole Story',
    text: 'I have pieced it together from relics, ruins, and the old man\'s stories. The Ninth came here fleeing a plague. They built a colony, raised families, worshipped Sol Invictus under open sky. They did not vanish — they chose to stay. And now, so do I.' },
].concat(typeof NARRATIVE_JOURNAL_ENTRIES !== 'undefined' ? NARRATIVE_JOURNAL_ENTRIES : []);

function unlockJournal(id) {
  if (state.journal.includes(id)) return;
  state.journal.push(id);
  let entry = JOURNAL_ENTRIES.find(e => e.id === id);
  if (entry) {
    addFloatingText(width / 2, height * 0.25, 'Journal: ' + entry.title, '#ddc880');
    spawnParticles(state.player.x, state.player.y, 'divine', 6);
  }
  // Check for full journal completion (all entries except full_codex itself)
  let otherEntries = JOURNAL_ENTRIES.filter(e => e.id !== 'full_codex');
  if (otherEntries.every(e => state.journal.includes(e.id))) {
    unlockJournal('full_codex');
  }
}

// ─── ISLAND VISITORS ─────────────────────────────────────────────────────
const VISITORS = [
  { type: 'pilgrim', name: 'Pilgrim', color: '#ddccaa',
    greeting: 'I have traveled far to see your island...',
    offer: 'I\'ll trade 10 gold for 3 crystals.',
    trade: { give: { gold: 10 }, take: { crystals: 3 } } },
  { type: 'herbalist', name: 'Herbalist', color: '#88cc66',
    greeting: 'These herbs! I\'ve never seen such growth.',
    offer: 'Give me 5 harvest, I\'ll share rare seeds.',
    trade: { give: { harvest: 5 }, take: { grapeSeeds: 3, oliveSeeds: 3 } } },
  { type: 'bard', name: 'Wandering Bard', color: '#cc88ff',
    greeting: 'A song for the isle-keeper!',
    offer: 'A tale for a meal? I know a blessing...',
    trade: { give: { meals: 2 }, take: { blessing: true } } },
  { type: 'collector', name: 'Collector', color: '#ffaa44',
    greeting: 'I collect curiosities from every shore.',
    offer: 'Trade 3 fish for 8 stone and 5 wood?',
    trade: { give: { fish: 3 }, take: { stone: 8, wood: 5 } } },
  { type: 'mystic', name: 'Temple Mystic', color: '#aaddff',
    greeting: 'The stars led me to your shrine...',
    offer: 'An offering of 5 crystals grants a vision.',
    trade: { give: { crystals: 5 }, take: { prophecyRefresh: true } } },
];

function spawnVisitor() {
  let v = VISITORS[floor(random(VISITORS.length))];
  let port = getPortPosition();
  state.visitor = {
    type: v.type, name: v.name, color: v.color,
    greeting: v.greeting, offer: v.offer, trade: v.trade,
    x: port.x - 20, y: port.y - 10,
    timer: 1200, // stays for ~20 seconds at 60fps
    interacted: false, dialogTimer: 0, currentLine: 0,
  };
  addFloatingText(width / 2, height * 0.25, v.name + ' has arrived!', v.color);
}

function tradeWithVisitor() {
  let v = state.visitor;
  if (!v || v.interacted) return;
  // Check player can afford
  for (let [res, amt] of Object.entries(v.trade.give)) {
    if ((state[res] || 0) < amt) {
      addFloatingText(width / 2, height * 0.35, 'Not enough ' + res + '!', '#ff6666');
      return;
    }
  }
  // Pay
  for (let [res, amt] of Object.entries(v.trade.give)) {
    state[res] -= amt;
  }
  // Receive
  for (let [res, val] of Object.entries(v.trade.take)) {
    if (res === 'blessing') {
      let types = ['crops', 'solar', 'speed', 'luck'];
      state.blessing = { type: types[floor(random(types.length))], timer: 1440 };
      addFloatingText(width / 2, height * 0.3, 'Blessed by the bard!', '#cc88ff');
    } else if (res === 'prophecyRefresh') {
      state.prophecy = generateProphecy();
      addFloatingText(width / 2, height * 0.3, 'New prophecy revealed!', '#aaddff');
    } else {
      state[res] = (state[res] || 0) + val;
      addFloatingText(width / 2, height * 0.3, '+' + val + ' ' + res, '#ffcc44');
    }
  }
  v.interacted = true;
  v.dialogTimer = 120;
  v.currentLine = 1;
  state.codex.visitorsTraded++; if (typeof checkDailyQuestProgress === 'function') checkDailyQuestProgress('trade', 1);
  spawnParticles(v.x, v.y, 'harvest', 10);
}

function updateVisitor(dt) {
  if (!state.visitor) return;
  state.visitor.timer -= dt;
  if (state.visitor.dialogTimer > 0) state.visitor.dialogTimer -= dt;
  if (state.visitor.timer <= 0) {
    addFloatingText(width / 2, height * 0.3, state.visitor.name + ' departed.', '#aaaaaa');
    state.visitor = null;
  }
}

function drawVisitor() {
  let v = state.visitor;
  if (!v) return;
  let sx = w2sX(v.x), sy = w2sY(v.y);

  push();
  translate(sx, sy);
  noStroke();
  // Shadow — pixel
  fill(0, 0, 0, 30);
  rect(-9, 2, 18, 3);
  // Body (robed figure)
  fill(color(v.color));
  rect(-5, -10, 10, 14);
  // Head — pixel
  fill(210, 185, 150);
  rect(-4, -18, 8, 8);
  // Hood/hat — pixel
  fill(color(v.color));
  rect(-5, -20, 10, 4);
  rect(-6, -18, 12, 2);
  // Eyes — pixel
  fill(40);
  rect(-3, -15, 2, 2);
  rect(1, -15, 2, 2);
  // Staff
  stroke(120, 90, 50);
  strokeWeight(1.5);
  line(8, -18, 8, 5);
  noStroke();
  pop();

  // Dialog bubble
  let pd = dist(state.player.x, state.player.y, v.x, v.y);
  if (pd < 70) {
    let msg = v.interacted ? 'Safe travels!' : (v.currentLine === 0 ? v.greeting : v.offer);
    // Bubble
    fill(0, 0, 0, 160);
    rectMode(CENTER);
    let tw = textWidth(msg) + 20;
    rect(sx, sy - 32, min(tw, 200), 20, 6);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(11);
    text(msg, sx, sy - 32);
    rectMode(CORNER);

    if (!v.interacted) {
      fill(255, 200, 100);
      textSize(9);
      text('[E] Trade', sx, sy - 18);
    }
  }
}

// Farming system — see farming.js

// ─── TEMPLE COURT SYSTEM ─────────────────────────────────────────────────
// Temple court area — open space in front of main temple (x:840, y:310)
const TEMPLE_COURT = { x: 780, y: 360, w: 120, h: 80 };

const COURT_VISITOR_TYPES = {
  foreign_merchant: {
    name: 'Foreign Merchant', minLevel: 8, dailyChance: 0.15, unique: false,
    nations: {
      carthage: { greeting: 'Carthaginian wares, finest in the sea!', offer: 'Bulk resources: 20 wood + 20 stone for 15 gold', trade: { give: { gold: 15 }, take: { wood: 20, stone: 20 } } },
      egypt:    { greeting: 'From the banks of the Nile, I bring wonders.', offer: '3 crystals for just 8 gold', trade: { give: { gold: 8 }, take: { crystals: 3 } } },
      greece:   { greeting: 'Athenian crafts, touched by Athena herself.', offer: 'Fine oil and seeds for 10 gold', trade: { give: { gold: 10 }, take: { oliveSeeds: 5, oil: 2 } } },
      persia:   { greeting: 'Persian luxuries from the eastern roads.', offer: 'Exotic spices for 12 gold', trade: { give: { gold: 12 }, take: { exoticSpices: 2 } } },
      phoenicia:{ greeting: 'Phoenician dyes and cedar — the best!', offer: '15 wood + rare hide for 10 gold', trade: { give: { gold: 10 }, take: { wood: 15, rareHide: 1 } } },
      gaul:     { greeting: 'Gallic iron, forged by mountain clans.', offer: 'Iron ore for 8 gold', trade: { give: { gold: 8 }, take: { ironOre: 3 } } },
      seapeople:{ greeting: 'From hidden shores, treasures of the deep.', offer: 'Fish and pearls for 6 gold', trade: { give: { gold: 6 }, take: { fish: 8 } } },
    },
    color: '#ffaa44',
  },
  diplomat: {
    name: 'Diplomat', minLevel: 12, dailyChance: 0.05, unique: true,
    color: '#88aaff',
  },
  spy: {
    name: 'Spy', minLevel: 15, dailyChance: 0.05, unique: true,
    color: '#8866aa',
  },
};

function spawnTempleCourtVisitors() {
  let tc = state.templeCourt;
  let lvl = state.islandLevel || 1;
  let nationKeys = Object.keys(state.nations || {});
  if (nationKeys.length === 0) return;

  for (let typeKey in COURT_VISITOR_TYPES) {
    let vt = COURT_VISITOR_TYPES[typeKey];
    if (lvl < vt.minLevel) continue;
    if (random() > vt.dailyChance) continue;
    // Unique check — only one diplomat / spy at a time
    if (vt.unique && tc.visitors.some(v => v.type === typeKey)) continue;
    // Max 4 court visitors at once
    if (tc.visitors.length >= 4) break;

    let nationKey = nationKeys[floor(random(nationKeys.length))];
    let vx = TEMPLE_COURT.x + random(-TEMPLE_COURT.w / 3, TEMPLE_COURT.w / 3);
    let vy = TEMPLE_COURT.y + random(-TEMPLE_COURT.h / 3, TEMPLE_COURT.h / 3);

    let visitor = {
      type: typeKey, nationKey: nationKey, x: vx, y: vy,
      timer: 2400, // ~40 seconds
      traded: false, dialogTimer: 0,
      walking: null, // { tx, ty } target for walk-away
    };

    if (typeKey === 'foreign_merchant') {
      let nationTrades = vt.nations[nationKey] || vt.nations.carthage;
      visitor.name = getNationName(nationKey) + ' Merchant';
      visitor.greeting = nationTrades.greeting;
      visitor.offer = nationTrades.offer;
      visitor.trade = nationTrades.trade;
      visitor.color = vt.color;
    } else if (typeKey === 'diplomat') {
      let offers = [];
      let nation = state.nations[nationKey];
      if (nation && nation.reputation < -30) {
        offers.push({ label: 'Peace Treaty (100g)', cost: 100, effect: 'peace' });
      }
      offers.push({ label: 'Alliance Proposal (50g, +30 rep)', cost: 50, effect: 'alliance' });
      offers.push({ label: 'Trade Agreement (+10% trade, 10 days)', cost: 25, effect: 'trade_agreement' });
      let pick = offers[floor(random(offers.length))];
      visitor.name = getNationName(nationKey) + ' Diplomat';
      visitor.greeting = 'I speak for ' + getNationName(nationKey) + '.';
      visitor.offer = pick.label;
      visitor.trade = { diplomatEffect: pick.effect, cost: pick.cost };
      visitor.color = vt.color;
    } else if (typeKey === 'spy') {
      visitor.name = 'Hooded Stranger';
      visitor.greeting = 'I have... information, for a price.';
      visitor.offer = 'Intel on ' + getNationName(nationKey) + ' — 30 gold';
      visitor.trade = { spyTarget: nationKey, cost: 30 };
      visitor.color = vt.color;
      visitor.nationKey = null; // hidden affiliation
      visitor._spyTarget = nationKey;
    }

    tc.visitors.push(visitor);
    addFloatingText(width / 2, height * 0.25, visitor.name + ' arrives at the temple court!', visitor.color);
  }
}

function updateTempleCourt(dt) {
  let tc = state.templeCourt;
  if (!tc) return;
  for (let i = tc.visitors.length - 1; i >= 0; i--) {
    let v = tc.visitors[i];
    v.timer -= dt;
    if (v.dialogTimer > 0) v.dialogTimer -= dt;

    // Walk away after trade or timeout
    if (v.walking) {
      let dx = v.walking.tx - v.x, dy = v.walking.ty - v.y;
      let d = sqrt(dx * dx + dy * dy);
      if (d < 5) { tc.visitors.splice(i, 1); continue; }
      let spd = 0.5;
      v.x += (dx / d) * spd * dt;
      v.y += (dy / d) * spd * dt;
    } else if (v.timer <= 0) {
      // Start walking to port
      let port = getPortPosition();
      v.walking = { tx: port.x, ty: port.y };
    }
  }
}

function tradeWithCourtVisitor(v) {
  if (!v || v.traded) return;
  let tc = state.templeCourt;

  if (v.type === 'foreign_merchant') {
    // Check can afford
    for (let [res, amt] of Object.entries(v.trade.give)) {
      if ((state[res] || 0) < amt) {
        addFloatingText(width / 2, height * 0.35, 'Not enough ' + res + '!', '#ff6666');
        return;
      }
    }
    for (let [res, amt] of Object.entries(v.trade.give)) { state[res] -= amt; }
    for (let [res, val] of Object.entries(v.trade.take)) { state[res] = (state[res] || 0) + val; addFloatingText(width / 2, height * 0.3, '+' + val + ' ' + res, '#ffcc44'); }
  } else if (v.type === 'diplomat') {
    let cost = v.trade.cost;
    if ((state.gold || 0) < cost) {
      addFloatingText(width / 2, height * 0.35, 'Not enough gold!', '#ff6666');
      return;
    }
    state.gold -= cost;
    let effect = v.trade.diplomatEffect;
    let nation = state.nations[v.nationKey];
    if (effect === 'peace' && nation) {
      nation.reputation = max(nation.reputation, -10);
      if (nation.wars) nation.wars = nation.wars.filter(w => w !== (state.faction || 'rome'));
      addFloatingText(width / 2, height * 0.25, 'Peace with ' + getNationName(v.nationKey) + '!', '#88cc88');
    } else if (effect === 'alliance' && nation) {
      nation.reputation = min(100, (nation.reputation || 0) + 30);
      addFloatingText(width / 2, height * 0.25, '+30 reputation with ' + getNationName(v.nationKey), '#88aaff');
    } else if (effect === 'trade_agreement' && nation) {
      nation._tradeBonus = (nation._tradeBonus || 0) + 10;
      nation._tradeBonusDays = 10;
      addFloatingText(width / 2, height * 0.25, '+10% trade income with ' + getNationName(v.nationKey) + ' for 10 days', '#ffcc44');
    }
  } else if (v.type === 'spy') {
    if ((state.gold || 0) < v.trade.cost) {
      addFloatingText(width / 2, height * 0.35, 'Not enough gold!', '#ff6666');
      return;
    }
    state.gold -= v.trade.cost;
    let target = v._spyTarget || v.trade.spyTarget;
    let nation = state.nations[target];
    if (nation) {
      nation._intelRevealedDays = 5;
      addFloatingText(width / 2, height * 0.25, getNationName(target) + ' intel revealed for 5 days!', '#cc88ff');
      addFloatingText(width / 2, height * 0.33, 'Military: ' + (nation.military || 0) + '  Gold: ' + (nation.gold || 0) + '  Aggro: ' + (nation.aggression || 0), '#aaaacc');
    }
  }

  v.traded = true;
  v.dialogTimer = 120;
  state.codex.visitorsTraded++;
  if (typeof checkDailyQuestProgress === 'function') checkDailyQuestProgress('trade', 1);
  spawnParticles(v.x, v.y, 'harvest', 10);
  if (snd) snd.playSFX('coin');
  // Start walking away
  let port = getPortPosition();
  v.walking = { tx: port.x, ty: port.y };
}

function drawTempleCourtVisitors_single(v) {
  let sx = w2sX(v.x), sy = w2sY(v.y);
  push();
  translate(sx, sy);
  noStroke();

  // Shadow
  fill(0, 0, 0, 30);
  rect(-9, 2, 18, 3);

  if (v.type === 'diplomat') {
    let nc = FACTIONS[v.nationKey] ? FACTIONS[v.nationKey].bannerColor : [100, 100, 180];
    fill(220, 215, 200);
    rect(-5, -10, 10, 14);
    fill(nc[0], nc[1], nc[2]);
    rect(-2, -8, 3, 12);
    fill(210, 185, 150);
    rect(-4, -18, 8, 8);
    fill(80, 140, 60);
    rect(-5, -19, 10, 3);
    fill(40);
    rect(-3, -15, 2, 2);
    rect(1, -15, 2, 2);
    fill(230, 220, 180);
    rect(7, -8, 3, 8);
    stroke(180, 160, 120);
    strokeWeight(0.5);
    line(7, -8, 10, -8);
    line(7, 0, 10, 0);
    noStroke();
  } else if (v.type === 'spy') {
    fill(50, 40, 60);
    rect(-6, -12, 12, 16);
    fill(40, 30, 50);
    rect(-6, -20, 12, 10);
    rect(-5, -22, 10, 4);
    fill(30, 25, 35);
    rect(-4, -18, 8, 6);
    fill(180, 160, 200);
    rect(-2, -15, 2, 1);
    rect(1, -15, 2, 1);
  } else {
    let nc = FACTIONS[v.nationKey] ? FACTIONS[v.nationKey].bannerColor : [200, 150, 50];
    fill(nc[0], nc[1], nc[2]);
    rect(-5, -10, 10, 14);
    fill(min(255, nc[0] + 40), min(255, nc[1] + 40), min(255, nc[2] + 40));
    rect(-3, -8, 6, 10);
    fill(210, 185, 150);
    rect(-4, -18, 8, 8);
    fill(nc[0], nc[1], nc[2]);
    rect(-5, -20, 10, 4);
    fill(40);
    rect(-3, -15, 2, 2);
    rect(1, -15, 2, 2);
    fill(140, 100, 50);
    rect(-8, -6, 4, 6);
  }
  pop();

  // Dialog bubble when player is near
  let pd = dist(state.player.x, state.player.y, v.x, v.y);
  if (pd < 60) {
    let msg = v.traded ? 'Farewell!' : v.greeting;
    if (!v.traded && v.dialogTimer <= 0) msg = v.offer;
    fill(0, 0, 0, 160);
    rectMode(CENTER);
    let tw = textWidth(msg) + 20;
    rect(sx, sy - 32, min(tw, 220), 20, 6);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(11);
    text(msg, sx, sy - 32);
    rectMode(CORNER);

    if (!v.traded) {
      fill(255, 200, 100);
      textSize(9);
      text('[E] Trade', sx, sy - 18);
    }
  }
}

// ─── COOKING SYSTEM ───────────────────────────────────────────────────────
const RECIPES = [
  { name: 'Meal',       item: 'meals', needs: { harvest: 2, fish: 1 }, hearts: 1, desc: '2 Harvest + 1 Fish → Meal' },
  { name: 'Wine',       item: 'wine',  needs: { harvest: 3, grapeSeeds: 1 }, hearts: 2, desc: '3 Harvest + 1 Grape → Wine' },
  { name: 'Olive Oil',  item: 'oil',   needs: { harvest: 2, oliveSeeds: 1 }, hearts: 2, desc: '2 Harvest + 1 Olive → Oil' },
  { name: 'Feast',      item: 'meals', qty: 3, needs: { harvest: 5, fish: 2, wood: 3 }, hearts: 3, desc: '5 Harvest + 2 Fish + 3 Wood → Grand Feast (3)' },
  { name: 'Stew',       item: 'stew', needs: { harvest: 2, fish: 1, wood: 2 }, hearts: 1, desc: '2 Harvest + 1 Fish + 2 Wood → Stew (heals 30 HP)' },
  { name: 'Garum',      item: 'garum', needs: { fish: 3 }, hearts: 1, desc: '3 Fish → Garum (trade: 25g)' },
  { name: 'Honeyed Figs', item: 'honeyedFigs', needs: { exoticSpices: 1, harvest: 2 }, hearts: 2, desc: '1 Spice + 2 Harvest → Honeyed Figs (+15% XP)' },
  { name: 'Ambrosia',   item: 'ambrosia', needs: { soulEssence: 2, wine: 1, crystals: 1 }, hearts: 3, desc: '2 Essence + 1 Wine + 1 Crystal → Ambrosia (full heal)' },
];

function canCook(recipe) {
  for (let [res, amt] of Object.entries(recipe.needs)) {
    if ((state[res] || 0) < amt) return false;
  }
  return true;
}

function cookRecipe(recipe) {
  if (!canCook(recipe)) return false;
  for (let [res, amt] of Object.entries(recipe.needs)) {
    state[res] -= amt;
  }
  let qty = recipe.qty || 1;
  state[recipe.item] = (state[recipe.item] || 0) + qty;
  state.dailyActivities.cooked += qty;
  if (typeof trackStat === 'function') trackStat('mealsCooked', qty);
  return true;
}

function updateCooking(dt) {
  let c = state.cooking;
  if (!c.active) return;
  c.timer -= dt;
  if (c.timer <= 0) {
    c.active = false;
    let recipe = RECIPES.find(r => r.name === c.recipe);
    if (recipe) {
      let qty = recipe.qty || 1;
      if (snd) snd.playSFX('ding');
      addFloatingText(width / 2, height * 0.35, '+' + qty + ' ' + recipe.name + '!', C.solarBright);
      spawnParticles(state.player.x, state.player.y, 'harvest', 10);
    }
    c.recipe = null;
  }
}

// Fishing system — see fishing.js

// ─── NATURALIST CODEX DATA ────────────────────────────────────────────────
// NAT_CROP_DATA — see farming.js
const NAT_ENEMY_DATA = {
  wolf:          { label: 'Wolf',          rarity: 'Common',   desc: 'Hungry and bold. The wolf was sacred to Mars -- a complicated omen.' },
  bandit:        { label: 'Bandit',        rarity: 'Common',   desc: 'Desperate men driven to desperation. They covet what you\'ve built.' },
  harpy:         { label: 'Harpy',         rarity: 'Uncommon', desc: 'Winged spirits of the storm. Neither fully mortal nor divine.' },
  secutor:       { label: 'Secutor',       rarity: 'Uncommon', desc: 'A trained gladiator -- shield-bearer who knows every feint.' },
  minotaur:      { label: 'Minotaur',      rarity: 'Rare',     desc: 'The bull-man of legend. Defeating one is the stuff of heroes.' },
  shield_bearer: { label: 'Shield Bearer', rarity: 'Uncommon', desc: 'A disciplined soldier who fights from behind an iron wall.' },
  archer:        { label: 'Archer',        rarity: 'Uncommon', desc: 'Keeps distance and fires without mercy. Close the gap fast.' },
  centurion:     { label: 'Centurion',     rarity: 'Rare',     desc: 'Commands respect even in death. A true officer gone rogue.' },
};
const NAT_RELIC_DATA = {
  bronze_eagle:  { label: 'Bronze Eagle',  rarity: 'Uncommon', desc: 'A legionary\'s standard, lost long ago. Rome\'s symbol endures.' },
  crystal_shard: { label: 'Crystal Shard', rarity: 'Common',   desc: 'A fragment humming with ancient energy, origin unknown.' },
  ancient_coin:  { label: 'Ancient Coin',  rarity: 'Common',   desc: 'A coin from a forgotten era. The face has been worn smooth by time.' },
  roman_helm:    { label: 'Roman Helm',    rarity: 'Rare',     desc: 'A ceremonial helmet, perhaps from a fallen consul. Heavy with history.' },
  sea_amphora:   { label: 'Sea Amphora',   rarity: 'Common',   desc: 'A clay vessel sealed with wax. Whatever it contained is long since gone.' },
};

// ─── WEATHER SYSTEM ──────────────────────────────────────────────────────
function updateWeather(dt) {
  let w = state.weather;
  if (w.timer > 0) {
    w.timer -= dt;
    if (w.timer <= 0) {
      w.type = 'clear';
      w.intensity = 0;
      raindrops.length = 0;
    }
  }
  // Random weather change — check once per minute of game time
  // Day 1: always good weather (no storms ruining the tutorial)
  if (state.day === 1) return;
  if (w.type === 'clear' && frameCount % 600 === 0 && !stormActive) {
    let roll = random();
    let season = getSeason();
    if (roll < 0.08) {
      w.type = 'rain';
      w.timer = random(600, 1800); // 10-30 seconds
      w.intensity = random(0.4, 1.0);
      addFloatingText(width / 2, height * 0.3, 'Rain begins...', '#6699cc');
    } else if (roll < 0.12 && season === 1) {
      w.type = 'heatwave';
      w.timer = random(900, 2400);
      w.intensity = random(0.5, 1.0);
      addFloatingText(width / 2, height * 0.3, 'Heat wave!', '#ff8844');
    } else if (roll < 0.15) {
      w.type = 'fog';
      w.timer = random(600, 1500);
      w.intensity = random(0.3, 0.7);
      addFloatingText(width / 2, height * 0.3, 'Fog rolls in...', '#aabbcc');
    }
  }
}

let raindrops = [];
let _stormWindOffset = 0; // subtle horizontal drift during storms
function drawWeatherEffects() {
  let w = state.weather;

  // Update and draw weather transitions
  if (typeof updateWeatherTransition === 'function') updateWeatherTransition();
  if (typeof drawWeatherTransitionEffects === 'function') drawWeatherTransitionEffects();

  // Storm clearing: thin out remaining raindrops (reduce spawn, let existing fall)
  if (typeof weatherTransition !== 'undefined' && weatherTransition.active && weatherTransition.type === 'storm_out') {
    let fadeT = weatherTransition.progress;
    // Draw remaining raindrops fading out
    if (raindrops.length > 0) {
      let fadedAlpha = 130 * (1 - fadeT);
      stroke(130, 170, 210, fadedAlpha);
      strokeWeight(1.2);
      let _aliveFade = [];
      for (let i = 0; i < raindrops.length; i++) {
        let r = raindrops[i];
        line(r.x, r.y, r.x + (r.wind || -1) * 3, r.y + r.len);
        r.y += r.speed;
        r.x += r.wind || -1;
        if (r.y <= height) _aliveFade.push(r);
      }
      raindrops = _aliveFade;
      noStroke();
    }
    // Spawn a few stragglers early in the transition
    if (fadeT < 0.5 && raindrops.length < floor(100 * (1 - fadeT * 2)) && random() < (1 - fadeT * 2) * 0.5) {
      raindrops.push({
        x: random(-30, width + 30), y: random(-20, -5),
        speed: random(6, 11), len: random(6, 12), wind: random(-1.5, -0.5),
      });
    }
  }

  // Drift storms get full rain + dark overlay even when weather.type isn't 'rain'
  if (stormActive && w.type !== 'rain') {
    _drawStormRain();
    return; // storm visuals override other weather
  }

  if (w.type === 'clear') return;

  if (w.type === 'rain') {
    // Storm darkening overlay — full screen
    noStroke();
    fill(15, 20, 35, 40 * w.intensity);
    rect(0, 0, width, height);
    // Spawn raindrops — more intense, angled (soft cap: stop spawning, let existing fall)
    let spawnRate = floor(w.intensity * 12);
    if (raindrops.length < 300) for (let i = 0; i < spawnRate; i++) {
      raindrops.push({
        x: random(-50, width + 50), y: random(-30, -5),
        speed: random(7, 14) * w.intensity,
        len: random(5, 12),
        wind: random(-1.5, -0.5), // diagonal rain
      });
    }
    // Draw and update raindrops
    stroke(140, 180, 220, 110 * w.intensity);
    strokeWeight(1.2);
    let _aliveDrops = [];
    for (let i = 0; i < raindrops.length; i++) {
      let r = raindrops[i];
      line(r.x, r.y, r.x + (r.wind || -0.5) * 3, r.y + r.len);
      r.y += r.speed;
      r.x += r.wind || -0.5;
      if (r.y > height) {
        // Rain splash on impact — small circle burst
        if (r.y < height * 0.85 && random() < 0.3) {
          noStroke();
          fill(140, 180, 220, 50 * w.intensity);
          circle(r.x, height * 0.75 + random(-20, 20), random(2, 4));
        }
      } else {
        _aliveDrops.push(r);
      }
    }
    raindrops = _aliveDrops;
    noStroke();

    // Ground puddle reflections — subtle wet look
    let puddleAlpha = 15 * w.intensity;
    fill(100, 140, 180, puddleAlpha);
    for (let pi = 0; pi < 6; pi++) {
      let ppx = w2sX(WORLD.islandCX + sin(pi * 1.8) * 180);
      let ppy = w2sY(WORLD.islandCY + cos(pi * 1.3) * 40);
      let shimmer = sin(frameCount * 0.04 + pi) * 0.3 + 0.7;
      ellipse(ppx, ppy, 30 + pi * 8, 8 * shimmer);
    }

    // Darken sky
    fill(15, 25, 45, 35 * w.intensity);
    rect(0, 0, width, height * 0.55);
    // Slight desaturation overlay
    fill(40, 50, 60, 12 * w.intensity);
    rect(0, 0, width, height);

  } else if (w.type === 'heatwave') {
    // Heat shimmer — fewer, larger distortion bands
    noStroke();
    for (let y = height * 0.45; y < height; y += 28) {
      let wave = sin(y * 0.04 + frameCount * 0.06) * 3;
      let wave2 = cos(y * 0.07 + frameCount * 0.04) * 1.5;
      fill(255, 210, 120, 6 * w.intensity);
      rect(wave + wave2, y, width, 18);
    }
    // Sun intensifier with rays
    let heatPulse = sin(frameCount * 0.03) * 0.2 + 0.8;
    fill(255, 200, 80, 18 * w.intensity * heatPulse);
    circle(width * 0.5, height * 0.08, 250);
    fill(255, 180, 60, 10 * w.intensity * heatPulse);
    circle(width * 0.5, height * 0.08, 350);
    // Warm overlay
    fill(255, 180, 80, 8 * w.intensity);
    rect(0, 0, width, height);

  } else if (w.type === 'fog') {
    // Static fog banks — pixel rect layers, fixed positions
    noStroke();
    let fogAlpha = floor(35 * w.intensity);
    // Layer 1-5: stacked horizontal fog bands at fixed screen positions
    for (let i = 0; i < 6; i++) {
      let fx = floor(width * (0.1 + i * 0.15));
      let fy = floor(height * 0.25 + i * 35);
      let fw = floor(250 + i * 50);
      let fh = floor(20 + i * 6);
      fill(200, 210, 220, fogAlpha);
      rect(fx - fw / 2, fy, fw, fh);
      // Softer edge rects
      fill(200, 210, 220, floor(fogAlpha * 0.5));
      rect(fx - fw / 2 - 30, fy + 2, 30, fh - 4);
      rect(fx + fw / 2, fy + 2, 30, fh - 4);
    }
    // Overall fog tint
    fill(180, 190, 200, floor(20 * w.intensity));
    rect(0, 0, width, height);
  }
}

// ─── DRIFT STORM RAIN ──────────────────────────────────────────────────
function _drawStormRain() {
  let stormRamp = 1;
  if (typeof weatherTransition !== 'undefined' && weatherTransition.active && weatherTransition.type === 'storm_in') {
    stormRamp = weatherTransition.progress;
  }
  let intensity = 0.95 * stormRamp;
  noStroke();

  // Dark gray-blue sky overlay — heavier than normal rain
  fill(12, 16, 28, 70 * stormRamp);
  rect(0, 0, width, height);
  // Extra sky darkening
  fill(10, 18, 35, 50 * stormRamp);
  rect(0, 0, width, height * 0.55);

  // Subtle wind wobble — horizontal offset that oscillates
  _stormWindOffset = sin(frameCount * 0.015) * 2.5 * stormRamp + cos(frameCount * 0.037) * 1.2 * stormRamp;

  // Spawn heavy raindrops — ramp up during transition
  let spawnCount = floor(18 * max(0.05, stormRamp));
  let dropCap = floor(500 * max(0.1, stormRamp));
  if (raindrops.length < dropCap) for (let i = 0; i < spawnCount; i++) {
    raindrops.push({
      x: random(-80, width + 80), y: random(-40, -5),
      speed: random(10, 18),
      len: random(8, 16),
      wind: random(-2.5, -1.2), // steeper diagonal in storms
    });
  }

  // Draw and update raindrops
  stroke(130, 170, 210, 130);
  strokeWeight(1.5);
  let _aliveStorm = [];
  for (let i = 0; i < raindrops.length; i++) {
    let r = raindrops[i];
    let wx = r.wind || -1.5;
    line(r.x, r.y, r.x + wx * 4, r.y + r.len);
    r.y += r.speed;
    r.x += wx;
    if (r.y > height) {
      // Splash
      if (r.y < height * 0.85 && random() < 0.35) {
        noStroke();
        fill(130, 170, 210, 55);
        circle(r.x, height * 0.75 + random(-20, 20), random(2, 5));
        stroke(130, 170, 210, 130);
        strokeWeight(1.5);
      }
    } else {
      _aliveStorm.push(r);
    }
  }
  raindrops = _aliveStorm;
  noStroke();

  // Ground puddle reflections
  fill(90, 130, 170, 18);
  for (let pi = 0; pi < 6; pi++) {
    let ppx = w2sX(WORLD.islandCX + sin(pi * 1.8) * 180);
    let ppy = w2sY(WORLD.islandCY + cos(pi * 1.3) * 40);
    let shimmer = sin(frameCount * 0.06 + pi) * 0.3 + 0.7;
    ellipse(ppx, ppy, 30 + pi * 8, 8 * shimmer);
  }

  // Desaturation wash
  fill(35, 40, 55, 18);
  rect(0, 0, width, height);

}

// ─── HEART MILESTONES ────────────────────────────────────────────────────
const HEART_MILESTONES = [
  { hearts: 2, reward: 'speed', desc: '+15% movement speed', given: false },
  { hearts: 3, reward: 'seeds', desc: '+2 seeds per harvest', given: false },
  { hearts: 4, reward: 'speed2', desc: '+30% movement speed', given: false },
  { hearts: 5, reward: 'double', desc: 'Double harvest yield', given: false },
  { hearts: 7, reward: 'recipe', desc: 'Unlocked: Grand Feast recipe', given: false },
  { hearts: 8, reward: 'companion', desc: 'Companion range doubled', given: false },
  { hearts: 10, reward: 'golden', desc: 'Golden Touch — all yields x2!', given: false },
];

function checkHeartMilestones(newHearts) {
  HEART_MILESTONES.forEach(m => {
    if (newHearts >= m.hearts && !state.heartRewards.includes(m.reward)) {
      state.heartRewards.push(m.reward);
      addFloatingText(w2sX(state.npc.x), w2sY(state.npc.y) - 55, m.desc, C.solarBright);
      spawnParticles(state.npc.x, state.npc.y, 'burst', 15);
      // Golden sparkle ring milestone effect
      for (let i = 0; i < 12; i++) {
        let a = (i / 12) * TWO_PI;
        particles.push({
          x: state.npc.x + cos(a) * 15, y: state.npc.y + sin(a) * 10,
          vx: cos(a) * 0.8, vy: sin(a) * 0.6 - 0.5,
          life: random(25, 40), maxLife: 40,
          type: 'sundust', size: random(2, 3),
          r: 220, g: 195, b: 60, phase: random(TWO_PI), world: true,
        });
      }
    }
  });
}

// Farming system — see farming.js

function drawGameVignette() {
  // Subtle screen-edge darkening for atmosphere
  let bright = getSkyBrightness();
  let vigA = bright > 0.5 ? 12 : lerp(20, 12, bright * 2); // slightly darker at night
  // Combat vignette — darken edges more when enemies are nearby
  if (_juiceCombatVignette > 0) {
    vigA += _juiceCombatVignette * 25;
    _juiceCombatVignette = max(0, _juiceCombatVignette - 0.02);
  }
  noStroke();
  // Top edge
  for (let i = 0; i < 40; i++) { fill(0, 0, 0, vigA * (1 - i / 40)); rect(0, i, width, 1); }
  // Bottom edge
  for (let i = 0; i < 30; i++) { fill(0, 0, 0, vigA * 0.7 * (1 - i / 30)); rect(0, height - i, width, 1); }
  // Side edges
  for (let i = 0; i < 25; i++) { fill(0, 0, 0, vigA * 0.5 * (1 - i / 25)); rect(i, 0, 1, height); rect(width - i, 0, 1, height); }
  // Level-up white flash
  if (_juiceLevelUpFlash > 0) {
    fill(255, 255, 255, _juiceLevelUpFlash * 180);
    rect(0, 0, width, height);
    _juiceLevelUpFlash = max(0, _juiceLevelUpFlash - 0.08);
  }
}

function drawScreenFlash() {
  if (!state.screenFlash) return;
  let f = state.screenFlash;
  fill(f.r, f.g, f.b, f.alpha * (f.timer / 60));
  rect(0, 0, width, height);
  f.timer--;
  if (f.timer <= 0) state.screenFlash = null;
}

function startDoorTransition(callback) {
  _doorTransition = { timer: 0, duration: 18, callback: callback, phase: 'out', doorAngle: 0 };
}

function updateDoorTransition() {
  if (!_doorTransition) return;
  let dt = _doorTransition;
  dt.timer++;
  if (dt.phase === 'out') {
    dt.doorAngle = min(HALF_PI * 0.8, (dt.timer / dt.duration) * HALF_PI * 0.8);
    if (dt.timer >= dt.duration) {
      if (dt.callback) dt.callback();
      dt.phase = 'in';
      dt.timer = 0;
    }
  } else {
    if (dt.timer >= dt.duration) _doorTransition = null;
  }
}

function drawDoorTransition() {
  if (!_doorTransition) return;
  let dt = _doorTransition;
  let t;
  if (dt.phase === 'out') {
    t = dt.timer / dt.duration;
  } else {
    t = 1 - dt.timer / dt.duration;
  }
  // Dim screen
  noStroke();
  fill(0, 0, 0, t * 180);
  rect(0, 0, width, height);
  // Door panels swinging open from center
  let doorW = width * 0.15;
  let doorH = height * 0.6;
  let doorY = height * 0.2;
  let openAmt = dt.phase === 'out' ? t : (1 - t);
  push();
  fill(90, 60, 30);
  stroke(60, 40, 20);
  strokeWeight(2);
  // Left door
  let lx = width / 2 - doorW * openAmt;
  rect(lx - doorW, doorY, doorW, doorH);
  // Right door
  let rx = width / 2 + doorW * openAmt;
  rect(rx, doorY, doorW, doorH);
  // Door handles
  fill(180, 150, 80);
  noStroke();
  ellipse(lx - 6, doorY + doorH / 2, 5, 5);
  ellipse(rx + 6, doorY + doorH / 2, 5, 5);
  pop();
}

// ─── SPEED LINES (dash juice) ─────────────────────────────────────────────
function drawSpeedLines() {
  let p = state.player;
  if (p.dashTimer > 0) {
    let cx = width / 2, cy = height / 2;
    for (let i = 0; i < 3; i++) {
      let angle = random(TWO_PI);
      let startR = random(60, 140);
      let len = random(30, 70);
      _juiceSpeedLines.push({
        x: cx + cos(angle) * startR,
        y: cy + sin(angle) * startR,
        angle: angle, len: len,
        life: 8, maxLife: 8,
      });
    }
  }
  if (_juiceSpeedLines.length > 0) {
    for (let i = _juiceSpeedLines.length - 1; i >= 0; i--) {
      let sl = _juiceSpeedLines[i];
      let a = (sl.life / sl.maxLife) * 80;
      stroke(255, 255, 255, a);
      strokeWeight(0.8);
      let ex = sl.x + cos(sl.angle) * sl.len;
      let ey = sl.y + sin(sl.angle) * sl.len;
      line(sl.x, sl.y, ex, ey);
      sl.x += cos(sl.angle) * 4;
      sl.y += sin(sl.angle) * 4;
      sl.life--;
      if (sl.life <= 0) _juiceSpeedLines.splice(i, 1);
    }
    noStroke();
  }
}

// ─── PICKUP MAGNETISM ──────────────────────────────────────────────────────
function updatePickupMagnetism(dt) {
  let p = state.player;
  for (let i = 0; i < particles.length; i++) {
    let pt = particles[i];
    if (!pt.loot || !pt.world) continue;
    let dx = p.x - pt.x;
    let dy = p.y - pt.y;
    let d = sqrt(dx * dx + dy * dy);
    if (d < 40 && d > 2) {
      let pull = 2.5 * (1 - d / 40);
      pt.vx += (dx / d) * pull * dt;
      pt.vy += (dy / d) * pull * dt;
    }
  }
}

function drawImperatorBanner() {
  if (!state.imperatorBanner || state.imperatorBanner <= 0) return;
  state.imperatorBanner--;
  let t = state.imperatorBanner;
  let fadeIn = min(1, (300 - t) / 30);
  let fadeOut = min(1, t / 40);
  let al = min(fadeIn, fadeOut);
  push(); noStroke();
  fill(20, 10, 5, 180 * al);
  rect(width * 0.15, height * 0.38, width * 0.7, 50, 4);
  fill(255, 200, 40, 255 * al);
  textSize(18); textAlign(CENTER, CENTER);
  text('IMPERATOR', width / 2, height * 0.38 + 18);
  fill(220, 180, 100, 200 * al);
  textSize(9);
  text('Mare Nostrum is yours', width / 2, height * 0.38 + 38);
  let shimmer = sin(frameCount * 0.06) * 0.3 + 0.7;
  stroke(255, 210, 60, 80 * al * shimmer); strokeWeight(1);
  line(width * 0.2, height * 0.38 + 2, width * 0.8, height * 0.38 + 2);
  line(width * 0.2, height * 0.38 + 48, width * 0.8, height * 0.38 + 48);
  pop();
}

// ─── ORACLE PROPHECY ─────────────────────────────────────────────────────
const PROPHECIES = [
  { text: 'Jupiter smiles on the fisherman today', type: 'fish', desc: '+1 fish per catch' },
  { text: 'The soil remembers last night\'s dew', type: 'crops', desc: '+30% crop growth' },
  { text: 'Mercury quickens your feet', type: 'speed', desc: '+25% move speed' },
  { text: 'Ceres blesses the granary', type: 'harvest', desc: '+1 harvest per plot' },
  { text: 'Vulcan heats the forge', type: 'cooking', desc: 'Instant cooking' },
  { text: 'Venus turns her gaze upon you', type: 'hearts', desc: '+1 bonus heart per gift' },
  { text: 'Neptune stirs the deep waters', type: 'rarefish', desc: '3x rare fish chance' },
  { text: 'Apollo\'s light burns brighter', type: 'solar', desc: '2x solar recharge' },
  { text: 'Diana watches the woodland paths', type: 'wood', desc: '2x wood from trees' },
  { text: 'Fortuna spins her wheel kindly', type: 'luck', desc: 'All random drops better' },
  { text: 'Pluto opens a crack in the earth', type: 'crystal', desc: '3x crystal recharge' },
  { text: 'Juno watches over the home', type: 'build', desc: 'Building costs -30%' },
  { text: 'Mars rests. Peace reigns.', type: 'peace', desc: 'No storms today' },
  { text: 'Bacchus pours freely', type: 'wine', desc: 'Wine/Oil worth 2x hearts' },
  { text: 'Minerva sharpens the mind', type: 'combo', desc: 'Combo timer 2x longer' },
  { text: 'Saturn remembers the old ways', type: 'mutation', desc: '3x mutation chance' },
];

function generateProphecy() {
  let pool = [...PROPHECIES];
  // Weight by season
  let season = getSeason();
  if (season === 0) pool.push(PROPHECIES[1], PROPHECIES[1]); // crops 3x in spring
  if (season === 1) pool.push(PROPHECIES[7], PROPHECIES[7]); // solar 3x in summer
  if (season === 2) pool.push(PROPHECIES[3], PROPHECIES[3]); // harvest 3x in autumn
  if (season === 3) pool.push(PROPHECIES[8], PROPHECIES[8]); // wood 3x in winter
  let pick = pool[floor(random(pool.length))];
  return { text: pick.text, type: pick.type, desc: pick.desc, active: true };
}

function drawOracleStone() {
  // Draw near temple — a small glowing pillar
  let ox = state.pyramid.x - 50, oy = state.pyramid.y + 30;
  let sx = w2sX(ox), sy = w2sY(oy);

  // Pillar
  fill(180, 170, 155);
  rect(sx - 5, sy - 14, 10, 14, 1);
  fill(200, 190, 170);
  rect(sx - 7, sy - 16, 14, 4, 1);

  // Glowing eye — pixel cross
  let pulse = sin(frameCount * 0.05) * 0.3 + 0.7;
  fill(220, 180, 60, floor(180 * pulse));
  rect(sx - 2, sy - 12, 4, 3);
  // Glow — pixel cross
  fill(220, 180, 60, floor(30 * pulse));
  rect(sx - 7, sy - 11, 14, 2);
  rect(sx - 1, sy - 15, 2, 10);

  // Show prophecy text when player is near
  let pd = dist2(state.player.x, state.player.y, ox, oy);
  if (pd < 50 && state.prophecy && state.prophecy.active) {
    fill(0, 0, 0, 160);
    let tw = 200;
    rect(sx - tw / 2, sy - 50, tw, 28, 3);
    fill(state.prophecy.golden ? color(255, 215, 0) : color(220, 190, 80));
    textSize(10);
    textAlign(CENTER, CENTER);
    text((state.prophecy.golden ? '~ ' : '"') + state.prophecy.text + (state.prophecy.golden ? ' ~' : '"'), sx, sy - 42);
    fill(state.prophecy.golden ? color(255, 230, 100) : color(180, 160, 80));
    textSize(9);
    text(state.prophecy.desc, sx, sy - 32);
    textAlign(LEFT, TOP);
  }
}

// Farming system — see farming.js

// ─── DAILY SUMMARY ───────────────────────────────────────────────────────
function calculateDailySummary() {
  let a = state.dailyActivities;
  let acts = 0;
  if (a.harvested > 0) acts++;
  if (a.fished > 0) acts++;
  if (a.built > 0) acts++;
  if (a.gifted > 0) acts++;
  if (a.cooked > 0) acts++;
  if (a.catPetted > 0) acts++;
  if (a.crystal > 0) acts++;
  if (a.chopped > 0) acts++;

  let wreaths = 0;
  if (acts >= 3) wreaths = 1;
  if (acts >= 5) wreaths = 2;
  if (acts >= 5 && a.catPetted >= 2) wreaths = 3;

  return {
    day: state.day,
    harvested: a.harvested, fished: a.fished, built: a.built,
    gifted: a.gifted, cooked: a.cooked, catPetted: a.catPetted,
    comboBest: state.harvestCombo.best,
    activities: acts, wreaths: wreaths,
  };
}

function drawDailySummary() {
  if (!state.showSummary || !state.lastSummary) return;
  let s = state.lastSummary;

  let pw = 240, ph = 220;
  let px = width / 2 - pw / 2, py = height / 2 - ph / 2;

  rectMode(CORNER);
  noStroke();
  fill(0, 0, 0, 140);
  rect(0, 0, width, height);

  drawParchmentPanel(px, py, pw, ph);

  fill(200, 170, 90);
  textAlign(CENTER, TOP);
  textSize(12);
  text('DIES ' + s.day, width / 2, py + 12);
  fill(160, 140, 100);
  textSize(11);
  text('Daily Summary', width / 2, py + 28);
  stroke(140, 110, 55, 100);
  strokeWeight(0.5);
  line(px + 20, py + 40, px + pw - 20, py + 40);
  noStroke();

  textAlign(LEFT, TOP);
  textSize(11);
  let ly = py + 48;
  let lx = px + 18;
  fill(200, 180, 140);
  text('Crops Harvested   ' + s.harvested, lx, ly); ly += 14;
  text('Fish Caught        ' + s.fished, lx, ly); ly += 14;
  text('Buildings Placed   ' + s.built, lx, ly); ly += 14;
  text('Hearts Given       ' + s.gifted, lx, ly); ly += 14;
  text('Meals Cooked       ' + s.cooked, lx, ly); ly += 14;
  text('Cats Petted        ' + s.catPetted, lx, ly); ly += 14;
  text('Best Combo         x' + s.comboBest, lx, ly); ly += 18;

  // Wreaths
  let wreathLabels = ['', 'CORONA AENEA', 'CORONA ARGENTEA', 'CORONA LAUREA'];
  let wreathColors = ['', '#cc9944', '#bbbbdd', '#eebb22'];
  if (s.wreaths > 0) {
    fill(color(wreathColors[s.wreaths]));
    textAlign(CENTER, TOP);
    textSize(10);
    text(wreathLabels[s.wreaths], width / 2, ly);
    ly += 14;
    fill(160, 140, 100);
    textSize(10);
    if (s.wreaths >= 1) text('+2 seeds at dawn', width / 2, ly); ly += 10;
    if (s.wreaths >= 2) text('+5 gold at dawn', width / 2, ly); ly += 10;
    if (s.wreaths >= 3) text('+1 crystal + blessed dawn', width / 2, ly);
  } else {
    fill(120, 100, 70);
    textAlign(CENTER, TOP);
    textSize(11);
    text('No wreath today. Do 3+ activities!', width / 2, ly);
  }

  textAlign(LEFT, TOP);

  fill(120, 100, 70);
  textAlign(CENTER, TOP);
  textSize(10);
  text('[ click to dismiss ]', width / 2, py + ph - 16);
  textAlign(LEFT, TOP);
}

function resetDailyActivities() {
  state.dailyActivities = {
    harvested: 0, fished: 0, built: 0, gifted: 0, cooked: 0,
    catPetted: 0, crystal: 0, chopped: 0
  };
  state.harvestCombo.best = 0;
  state.harvestCombo.count = 0;
}

// ─── CAT ADOPTION ────────────────────────────────────────────────────────
const CAT_COLORS = [
  { name: 'Ginger',  r: 200, g: 130, b: 50,  passive: 'crops', desc: '+2% crop growth' },
  { name: 'Grey',    r: 140, g: 140, b: 150, passive: 'stone', desc: 'Finds stone daily' },
  { name: 'Black',   r: 40,  g: 35,  b: 45,  passive: 'night', desc: 'Better night vision' },
  { name: 'Calico',  r: 220, g: 200, b: 170, passive: 'hearts', desc: '+5% heart gain' },
  { name: 'White',   r: 240, g: 238, b: 235, passive: 'solar', desc: '+5% solar recharge' },
  { name: 'Golden',  r: 220, g: 190, b: 80,  passive: 'gold', desc: '+1 gold per day' },
];

function spawnWildCat() {
  if (state.cats.filter(c => !c.adopted).length >= 2) return;
  // Determine available colors
  let adoptedColors = state.cats.filter(c => c.adopted).map(c => c.colorName);
  let available = CAT_COLORS.filter(c => {
    if (adoptedColors.includes(c.name)) return false;
    if (c.name === 'Golden' && !(state.day % 40 >= 37)) return false; // near Saturnalia only
    if (c.name === 'Black' && state.day < 11) return false;
    if (c.name === 'Calico' && state.day < 21) return false;
    if (c.name === 'White' && state.day < 31) return false;
    return true;
  });
  if (available.length === 0) available = [CAT_COLORS[0]]; // fallback ginger

  let pick = available[floor(random(available.length))];
  let rx = state.felix ? state.felix.x : WORLD.islandCX - 200;
  let ry = state.felix ? state.felix.y : WORLD.islandCY - 10;
  state.cats.push({
    x: rx + random(-60, 60),
    y: ry + random(-40, 40),
    facing: random() > 0.5 ? 1 : -1,
    color: [pick.r, pick.g, pick.b],
    colorName: pick.name,
    passive: pick.passive,
    passiveDesc: pick.desc,
    adopted: false,
    adoptionProgress: 0,
    lastVisitDay: -1,
    behavior: 'idle',
    behaviorTimer: 0,
    petted: false,
  });
}

function updateCatAdoption() {
  state.cats.forEach(cat => {
    if (cat.adopted) return;
    let pd = dist2(state.player.x, state.player.y, cat.x, cat.y);
    if (pd < 40 && cat.lastVisitDay !== state.day) {
      cat.lastVisitDay = state.day;
      cat.adoptionProgress++;
      let sx = w2sX(cat.x), sy = w2sY(cat.y);
      if (cat.adoptionProgress === 1) {
        addFloatingText(sx, sy - 15, cat.colorName + ' cat notices you', '#ffaa66');
      } else if (cat.adoptionProgress === 2) {
        addFloatingText(sx, sy - 15, cat.colorName + ' cat is curious...', '#ffaa66');
      } else if (cat.adoptionProgress === 3) {
        addFloatingText(sx, sy - 15, cat.colorName + ' cat is warming up!', '#ffcc44');
      } else if (cat.adoptionProgress >= 4) {
        cat.adopted = true;
        addFloatingText(sx, sy - 20, 'Adopted ' + cat.colorName + ' cat!', C.solarBright);
        addFloatingText(sx, sy - 8, cat.passiveDesc, '#aaddaa');
        spawnParticles(cat.x, cat.y, 'burst', 20);
      }
    }
  });
}

let seasonLeaves = [];
let _seasonLeavesPrevSeason = -1;
function drawSeasonalEffects() {
  let season = getSeason();
  // Clear old leaves on season change to prevent leaks
  if (season !== _seasonLeavesPrevSeason) {
    seasonLeaves = [];
    _seasonLeavesPrevSeason = season;
  }
  let bright = getSkyBrightness();
  let ix = w2sX(WORLD.islandCX);
  let iy = w2sY(WORLD.islandCY);

  if (season === 0) {
    // === SPRING (Ver) — Cherry blossoms + butterflies + pollen ===
    // Cherry blossom petals — pink/white pixel petals drifting down
    let _springInterval = _fpsSmooth < 35 ? 30 : 18;
    let _springCap = _fpsSmooth < 35 ? 10 : 18;
    if (frameCount % _springInterval === 0 && seasonLeaves.length < _springCap) {
      seasonLeaves.push({
        x: ix + random(-220, 220), y: iy - random(60, 120),
        vx: random(-0.3, 0.5), vy: random(0.3, 0.7),
        rot: random(TWO_PI), rotV: random(-0.06, 0.06),
        size: random(2.5, 5), life: 180,
        type: random() > 0.7 ? 'butterfly' : 'blossom',
        c: random() > 0.4 ? color(245, 180, 200, 180) : color(255, 230, 240, 160),
      });
    }
    noStroke();
    let _slW = 0;
    for (let i = 0; i < seasonLeaves.length; i++) {
      let l = seasonLeaves[i];
      l.x += l.vx + sin(frameCount * 0.015 + i * 0.7) * 0.4;
      l.y += l.vy + cos(frameCount * 0.02 + i) * 0.1;
      l.rot += l.rotV;
      l.life--;
      if (l.life <= 0) continue;
      seasonLeaves[_slW++] = l;
      let fadeA = min(1, l.life / 30);

      if (l.type === 'butterfly') {
        // Pixel butterfly
        let wingFlap = floor(sin(frameCount * 0.25 + i * 2) * 3);
        let fpx = floor(l.x), fpy = floor(l.y);
        let bColors = [color(200, 130, 220, 190 * fadeA), color(240, 180, 100, 190 * fadeA), color(120, 200, 180, 190 * fadeA)];
        fill(bColors[i % 3]);
        rect(fpx - 3 - wingFlap, fpy - 1, 3, 2);
        rect(fpx + 1 + wingFlap, fpy - 1, 3, 2);
        fill(40, 30, 20, 200 * fadeA);
        rect(fpx, fpy - 1, 1, 3);
      } else {
        // Cherry blossom petal — rotating pixel ellipse
        push();
        translate(l.x, l.y);
        rotate(l.rot);
        fill(red(l.c), green(l.c), blue(l.c), 180 * fadeA);
        rect(-l.size * 0.5, -l.size * 0.3, l.size, l.size * 0.6);
        // Petal highlight
        fill(255, 255, 255, 60 * fadeA);
        rect(-l.size * 0.2, -l.size * 0.15, l.size * 0.4, l.size * 0.3);
        pop();
      }
    }
    seasonLeaves.length = _slW;
    // Floating pollen motes (fewer, supplemental)
    if (frameCount % 60 === 0 && bright > 0.3) {
      particles.push({
        x: WORLD.islandCX + random(-200, 200), y: WORLD.islandCY + random(-80, -20),
        vx: random(-0.2, 0.3), vy: random(-0.3, -0.1),
        life: 120, maxLife: 120, type: 'mote', size: random(1, 2),
        r: 255, g: 240, b: 150, world: true, phase: random(TWO_PI),
      });
    }

  } else if (season === 1) {
    // === SUMMER (Aestas) — Heat shimmer + cicada particles + fireflies at dusk ===
    let hour = state.time / 60;

    // Daytime: heat shimmer over ground
    if (bright > 0.7) {
      let shimmerA = (bright - 0.7) * 15;
      let _shimmerStep = _fpsSmooth < 35 ? 12 : 6;
      for (let sy = iy - 30; sy < iy + 40; sy += _shimmerStep) {
        let wave = sin(sy * 0.08 + frameCount * 0.06) * 2;
        fill(255, 230, 160, shimmerA);
        rect(ix - 150 + wave, sy, 300, 2);
      }
      // Cicada dust motes — golden sparkles rising
      if (frameCount % 30 === 0) {
        particles.push({
          x: WORLD.islandCX + random(-180, 180), y: WORLD.islandCY + random(-20, 30),
          vx: random(-0.2, 0.2), vy: random(-0.6, -0.2),
          life: 80, maxLife: 80, type: 'sundust', size: random(1, 2),
          r: 220, g: 195, b: 80, world: true, phase: random(TWO_PI),
        });
      }
    }

    // Dusk/night: fireflies
    if (hour > 17.5 || hour < 6) {
      let _ffCap = _fpsSmooth < 35 ? 6 : 12;
      if (frameCount % 35 === 0 && seasonLeaves.length < _ffCap) {
        seasonLeaves.push({
          x: ix + random(-180, 180), y: iy - random(10, 60),
          vx: random(-0.3, 0.3), vy: random(-0.2, 0.2),
          rot: random(TWO_PI), rotV: 0,
          size: random(2, 3.5), life: 250,
          type: 'firefly',
          c: color(180, 255, 100, 180), phase: random(TWO_PI),
        });
      }
      noStroke();
      let _sfW = 0;
      for (let i = 0; i < seasonLeaves.length; i++) {
        let l = seasonLeaves[i];
        l.x += l.vx + sin(frameCount * 0.01 + i * 1.3) * 0.4;
        l.y += l.vy + cos(frameCount * 0.012 + i * 0.9) * 0.3;
        l.life--;
        if (l.life <= 0) continue;
        seasonLeaves[_sfW++] = l;
        let glow = (sin(frameCount * 0.08 + (l.phase || 0)) + 1) * 0.5;
        fill(180, 255, 100, 40 * glow);
        circle(l.x, l.y, l.size * 4);
        fill(220, 255, 140, 180 * glow);
        circle(l.x, l.y, l.size);
        // Tiny glow trail
        fill(180, 255, 100, 15 * glow);
        rect(floor(l.x) - 1, floor(l.y), 2, 6);
        rect(floor(l.x), floor(l.y) - 1, 6, 2);
      }
      seasonLeaves.length = _sfW;
    } else {
      // Clear fireflies during day
      if (seasonLeaves.some(l => l.type === 'firefly')) seasonLeaves = seasonLeaves.filter(l => l.type !== 'firefly');
    }

  } else if (season === 2) {
    // === AUTUMN (Autumnus) — Falling leaves + misty mornings + harvest glow ===
    let _autumnInterval = _fpsSmooth < 35 ? 24 : 14;
    let _autumnCap = _fpsSmooth < 35 ? 12 : 20;
    if (frameCount % _autumnInterval === 0 && seasonLeaves.length < _autumnCap) {
      let leafColors = [
        color(200, 100, 30, 175), color(220, 150, 40, 170),
        color(180, 70, 25, 165), color(160, 120, 30, 160),
        color(230, 180, 50, 155),
      ];
      seasonLeaves.push({
        x: ix + random(-220, 220), y: iy - random(60, 110),
        vx: random(-0.4, 0.6), vy: random(0.3, 0.9),
        rot: random(TWO_PI), rotV: random(-0.06, 0.06),
        size: random(3, 7), life: 140, type: 'leaf',
        c: leafColors[floor(random(leafColors.length))],
      });
    }
    noStroke();
    let _alW = 0;
    for (let i = 0; i < seasonLeaves.length; i++) {
      let l = seasonLeaves[i];
      l.x += l.vx + sin(frameCount * 0.025 + i) * 0.35;
      l.y += l.vy;
      l.rot += l.rotV;
      l.life--;
      if (l.life <= 0) continue;
      seasonLeaves[_alW++] = l;
      push();
      translate(l.x, l.y);
      rotate(l.rot);
      fill(l.c);
      // Pixel leaf shape — rect + smaller rect for stem
      rect(-l.size * 0.5, -l.size * 0.3, l.size, l.size * 0.6);
      // Leaf vein highlight
      fill(255, 255, 200, 30);
      rect(-1, -l.size * 0.2, 2, l.size * 0.4);
      pop();
    }
    seasonLeaves.length = _alW;
    // Morning mist (early hours)
    let hour = state.time / 60;
    if (hour >= 5 && hour < 9) {
      let mistA = map(hour, 5, 9, 20, 0);
      fill(200, 195, 180, mistA);
      rect(ix - 200, iy - 40, 400, 60);
      fill(210, 205, 190, mistA * 0.6);
      rect(ix - 160, iy - 55, 320, 30);
    }

  } else if (season === 3) {
    // === WINTER (Hiems) — Light snow + frost + bare tree blue tint + breath vapor ===
    let _winterInterval = _fpsSmooth < 35 ? 36 : 22;
    let _winterCap = _fpsSmooth < 35 ? 8 : 14;
    if (frameCount % _winterInterval === 0 && seasonLeaves.length < _winterCap) {
      seasonLeaves.push({
        x: ix + random(-250, 250), y: iy - random(80, 130),
        vx: random(-0.35, 0.35), vy: random(0.2, 0.55),
        rot: 0, rotV: 0,
        size: random(1.5, 4), life: 170,
        type: 'snow',
        c: color(220, 230, 255, 150),
      });
    }
    noStroke();
    let _wlW = 0;
    for (let i = 0; i < seasonLeaves.length; i++) {
      let l = seasonLeaves[i];
      l.x += l.vx + sin(frameCount * 0.018 + i * 0.5) * 0.45;
      l.y += l.vy;
      l.life--;
      if (l.life <= 0) continue;
      seasonLeaves[_wlW++] = l;
      fill(l.c);
      circle(l.x, l.y, l.size);
      // Subtle sparkle on larger flakes
      if (l.size > 3 && sin(frameCount * 0.1 + i) > 0.7) {
        fill(255, 255, 255, 100);
        rect(floor(l.x), floor(l.y) - 1, 1, 3);
        rect(floor(l.x) - 1, floor(l.y), 3, 1);
      }
    }
    seasonLeaves.length = _wlW;
    // Frost on buildings — light blue pixel rects on tops
    if (bright > 0.2) {
      state.buildings.forEach((b, bi) => {
        let bx = w2sX(b.x), by = w2sY(b.y);
        if (bx < -30 || bx > width + 30 || by < -30 || by > height + 30) return;
        fill(200, 220, 245, 40);
        rect(floor(bx) - 12, floor(by) - 18, 24, 2);
        if (bi % 3 === 0) {
          fill(210, 225, 250, 25);
          rect(floor(bx) - 8, floor(by) - 20, 16, 1);
        }
      });
    }
    // Player breath vapor in cold
    if (bright > 0.1) {
      let px = w2sX(state.player.x), py = w2sY(state.player.y);
      if (frameCount % 40 < 15) {
        let breathT = (frameCount % 40) / 15;
        fill(220, 230, 245, 30 * (1 - breathT));
        let bSize = 3 + breathT * 4;
        circle(px + 6, py - 18 - breathT * 6, bSize);
      }
    }
  } else {
    seasonLeaves = [];
  }
}


// ─── AMBIENT WILDLIFE ─────────────────────────────────────────────────────
// Birds perch on buildings, butterflies near farm, fireflies at night
let _wildlifeBirds = null;
let _wildlifeFireflies = null;
let _wildlifeFarmButterflies = null;

function _initWildlifeBirds() {
  if (_wildlifeBirds) return;
  _wildlifeBirds = [];
  for (let i = 0; i < 4; i++) {
    _wildlifeBirds.push({
      x: 0, y: 0, targetX: 0, targetY: 0,
      state: 'perched', wingPhase: random(TWO_PI),
      circleAngle: random(TWO_PI), circleTimer: 0,
      flySpeed: random(1.2, 2.0), needsPerch: true,
    });
  }
}

function _pickBirdPerch(bird) {
  let tall = state.buildings.filter(b => {
    let bp = BLUEPRINTS[b.type];
    return bp && bp.blocks && b.type !== 'fence' && b.type !== 'wall';
  });
  if (tall.length === 0) {
    bird.targetX = WORLD.islandCX + random(-200, 200);
    bird.targetY = WORLD.islandCY + random(-80, -30);
  } else {
    let b = tall[floor(random(tall.length))];
    let bp = BLUEPRINTS[b.type];
    bird.targetX = b.x + random(-8, 8);
    bird.targetY = b.y - (bp ? bp.h * 0.6 : 16) - random(2, 6);
  }
  bird.x = bird.targetX; bird.y = bird.targetY;
  bird.state = 'perched'; bird.needsPerch = false;
}

function updateAmbientWildlife(dt) {
  if (!state || !state.buildings) return;
  let hour = state.time / 60;

  // ── Birds ──
  _initWildlifeBirds();
  let px = state.player.x, py = state.player.y;
  for (let bird of _wildlifeBirds) {
    if (bird.needsPerch) _pickBirdPerch(bird);
    if (bird.state === 'perched') {
      if (dist(px, py, bird.x, bird.y) < 40) {
        bird.state = 'flying';
        bird.circleAngle = atan2(bird.y - py, bird.x - px);
        bird.targetX = bird.x + cos(bird.circleAngle) * random(60, 100);
        bird.targetY = bird.y - random(30, 60);
      }
    } else if (bird.state === 'flying') {
      let dx = bird.targetX - bird.x, dy = bird.targetY - bird.y;
      let d = sqrt(dx * dx + dy * dy);
      if (d < 3) {
        bird.state = 'circling'; bird.circleTimer = random(60, 120);
        bird.circleAngle = random(TWO_PI);
      } else {
        let spd = bird.flySpeed * dt;
        bird.x += (dx / d) * spd; bird.y += (dy / d) * spd;
      }
    } else if (bird.state === 'circling') {
      bird.circleTimer -= dt;
      bird.circleAngle += 0.03 * dt;
      bird.x += cos(bird.circleAngle) * 0.5 * dt;
      bird.y += sin(bird.circleAngle) * 0.3 * dt;
      if (bird.circleTimer <= 0) { _pickBirdPerch(bird); bird.state = 'flying'; }
    }
  }

  // ── Farm butterflies ──
  if (!_wildlifeFarmButterflies) {
    let fCX = WORLD.islandCX - 340, fCY = WORLD.islandCY - 5;
    _wildlifeFarmButterflies = [];
    let wc = [[220,140,60],[200,80,120],[180,120,200]];
    for (let i = 0; i < 3; i++) {
      _wildlifeFarmButterflies.push({
        x: fCX, y: fCY, homeX: fCX, homeY: fCY,
        phase: random(TWO_PI), wingPhase: random(TWO_PI),
        r: wc[i][0], g: wc[i][1], b: wc[i][2],
      });
    }
  }
  let bright = getSkyBrightness();
  if (bright > 0.3) {
    for (let bf of _wildlifeFarmButterflies) {
      bf.phase += 0.015 * dt;
      bf.x = bf.homeX + sin(bf.phase) * 55 + sin(bf.phase * 1.7) * 20;
      bf.y = bf.homeY + cos(bf.phase * 0.8) * 25 + sin(bf.phase * 2.3) * 8;
    }
  }

  // ── Fireflies (hours 21-5) ──
  let isNight = hour >= 21 || hour < 5;
  if (isNight) {
    if (!_wildlifeFireflies) {
      _wildlifeFireflies = [];
      for (let i = 0; i < 10; i++) {
        _wildlifeFireflies.push({
          x: WORLD.islandCX + random(-300, 300),
          y: WORLD.islandCY + random(-100, 80),
          phase: random(TWO_PI), driftPhase: random(TWO_PI),
          speed: random(0.1, 0.3), pulseFreq: random(0.04, 0.08),
        });
      }
    }
    for (let ff of _wildlifeFireflies) {
      ff.phase += ff.speed * 0.01 * dt;
      ff.driftPhase += 0.005 * dt;
      ff.x += sin(ff.phase) * 0.15 * dt;
      ff.y += cos(ff.phase * 0.7) * 0.1 * dt;
      let dx = WORLD.islandCX - ff.x, dy = WORLD.islandCY - ff.y;
      if (sqrt(dx * dx + dy * dy) > 280) { ff.x += dx * 0.001 * dt; ff.y += dy * 0.001 * dt; }
    }
  } else { _wildlifeFireflies = null; }
}

function drawAmbientWildlife() {
  if (!state || !state.buildings) return;
  noStroke();
  let hour = state.time / 60;
  let bright = getSkyBrightness();

  // ── Birds ──
  if (_wildlifeBirds) {
    for (let bird of _wildlifeBirds) {
      let bx = w2sX(bird.x), by = w2sY(bird.y);
      if (bx < -20 || bx > width + 20 || by < -20 || by > height + 20) continue;
      let fpx = floor(bx), fpy = floor(by);
      fill(35, 30, 25, 200);
      if (bird.state === 'perched') {
        rect(fpx - 1, fpy, 3, 2);
        rect(fpx - 2, fpy + 1, 1, 1);
      } else {
        rect(fpx - 1, fpy, 3, 2);
        let wU = sin(frameCount * 0.3 + bird.wingPhase) * 3;
        rect(fpx - 3, fpy - floor(wU), 2, 1);
        rect(fpx + 3, fpy - floor(wU * 0.8), 2, 1);
      }
    }
  }

  // ── Farm butterflies (daytime) ──
  if (_wildlifeFarmButterflies && bright > 0.3) {
    for (let bf of _wildlifeFarmButterflies) {
      let bx = w2sX(bf.x), by = w2sY(bf.y);
      if (bx < -20 || bx > width + 20) continue;
      let fpx = floor(bx), fpy = floor(by);
      let wf = floor(sin(frameCount * 0.25 + bf.wingPhase) * 2);
      fill(bf.r, bf.g, bf.b, 190);
      rect(fpx - 3 - wf, fpy - 1, 2, 2);
      rect(fpx + 1 + wf, fpy - 1, 2, 2);
      fill(40, 30, 20, 180);
      rect(fpx, fpy - 1, 1, 3);
    }
  }

  // ── Fireflies (hours 21-5) ──
  if (_wildlifeFireflies && (hour >= 21 || hour < 5)) {
    for (let ff of _wildlifeFireflies) {
      let fx = w2sX(ff.x), fy = w2sY(ff.y);
      if (fx < -20 || fx > width + 20) continue;
      let fpx = floor(fx), fpy = floor(fy);
      let pulse = (sin(frameCount * ff.pulseFreq + ff.driftPhase) + 1) * 0.5;
      fill(255, 255, 180, floor(25 * pulse));
      rect(fpx - 2, fpy - 2, 5, 5);
      fill(255, 255, 200, floor(200 * pulse));
      rect(fpx, fpy, 2, 2);
    }
  }
}
function getMerchantPortPosition() {
  if (!state.portRight) updatePortPositions();
  return state.portRight;
}


function drawVines(cx, cy, w, h) {
  strokeWeight(2);
  let vinePoints = [
    { ox: -0.42, len: 55 }, { ox: -0.28, len: 35 }, { ox: 0.1, len: 65 },
    { ox: 0.35, len: 50 }, { ox: 0.48, len: 30 },
  ];
  vinePoints.forEach((v, i) => {
    let vx = cx + v.ox * w * 0.45;
    let vy = cy - 18;
    stroke(color(C.vineGreen));
    noFill();
    beginShape();
    for (let t = 0; t <= v.len; t += 4) {
      let swayX = vx + sin(t * 0.1 + frameCount * 0.01 + i) * 6;
      vertex(swayX, vy + t);
    }
    endShape();
    noStroke();
    fill(color(C.vineLight));
    let lx = vx + sin(v.len * 0.1 + frameCount * 0.01 + i) * 6;
    ellipse(lx - 5, vy + v.len * 0.6, 8, 5);
    ellipse(lx + 5, vy + v.len * 0.8, 7, 4);
  });
  noStroke();
}


// ─── PYRAMID ──────────────────────────────────────────────────────────────
// ─── TEMPLE ROOM (engine-based interior) ─────────────────────────────────
function drawTempleRoom() {
  var R = TEMPLE_ROOM, fk = state.faction || 'rome';
  var hall = TEMPLE_HALLS[fk] || TEMPLE_HALLS.rome;
  var ft = frameCount, gPulse = sin(ft * 0.03) * 0.2 + 0.8;
  var hw = R.hw, hh = R.hh;

  // Pet follow
  if (!state.templePetX) { state.templePetX = state.player.x; state.templePetY = state.player.y + 15; }
  var petDist = dist(state.templePetX, state.templePetY, state.player.x, state.player.y + 10);
  if (petDist > 25) {
    state.templePetX += (state.player.x - state.templePetX) * 0.06;
    state.templePetY += (state.player.y + 10 - state.templePetY) * 0.06;
  }

  // Dark background behind room
  noStroke();
  fill(hall.wall[0] * 0.3, hall.wall[1] * 0.3, hall.wall[2] * 0.3);
  rect(w2sX(R.cx - hw - 20), w2sY(R.cy - hh - 40), (hw + 20) * 2, (hh + 60) * 2);

  // Floor tiles
  var tileS = 24;
  for (var tx = -hw; tx < hw; tx += tileS) {
    for (var ty = -hh; ty < hh; ty += tileS) {
      var light = (floor((tx + hw) / tileS) + floor((ty + hh) / tileS)) % 2 === 0;
      fill(light ? hall.floor1[0] : hall.floor2[0], light ? hall.floor1[1] : hall.floor2[1], light ? hall.floor1[2] : hall.floor2[2]);
      rect(w2sX(R.cx + tx), w2sY(R.cy + ty), tileS, tileS);
    }
  }

  // Mosaic center
  fill(hall.accent[0], hall.accent[1], hall.accent[2], 40);
  rect(w2sX(R.cx - 30), w2sY(R.cy - 20), 60, 40);
  fill(hall.drape[0], hall.drape[1], hall.drape[2], 30);
  rect(w2sX(R.cx - 20), w2sY(R.cy - 12), 40, 24);

  // Back wall
  fill(hall.wall[0], hall.wall[1], hall.wall[2]);
  rect(w2sX(R.cx - hw), w2sY(R.cy - hh - 30), hw * 2, 30);
  fill(hall.trim[0], hall.trim[1], hall.trim[2]);
  rect(w2sX(R.cx - hw), w2sY(R.cy - hh - 2), hw * 2, 4);

  // Drapes
  fill(hall.drape[0], hall.drape[1], hall.drape[2], 180);
  rect(w2sX(R.cx - hw + 8), w2sY(R.cy - hh - 26), 12, 22);
  rect(w2sX(R.cx + hw - 20), w2sY(R.cy - hh - 26), 12, 22);

  // Side walls
  fill(hall.wall[0] * 0.8, hall.wall[1] * 0.8, hall.wall[2] * 0.8);
  rect(w2sX(R.cx - hw - 10), w2sY(R.cy - hh), 10, hh * 2);
  rect(w2sX(R.cx + hw), w2sY(R.cy - hh), 10, hh * 2);

  // === Y-SORTED OBJECTS ===
  var items = [];

  // Altar (back center)
  var altarX = R.cx, altarY = R.cy - hh + 30;
  items.push({ y: altarY, draw: function() {
    var asx = w2sX(altarX), asy = w2sY(altarY);
    fill(hall.altarColor[0] * 0.6, hall.altarColor[1] * 0.6, hall.altarColor[2] * 0.6);
    noStroke();
    rect(asx - 18, asy, 36, 14, 2);
    fill(hall.altarColor[0] * 0.8, hall.altarColor[1] * 0.8, hall.altarColor[2] * 0.8);
    rect(asx - 20, asy - 3, 40, 5, 2);
    fill(hall.altarColor[0], hall.altarColor[1], hall.altarColor[2]);
    _drawAltarIcon(hall, asx, asy);
    fill(hall.altarColor[0], hall.altarColor[1], hall.altarColor[2], 15 * gPulse);
    circle(asx, asy - 6, 60);
    if (dist(state.player.x, state.player.y, altarX, altarY) < 45) {
      fill(255, 220, 120, 200 + sin(ft * 0.08) * 40);
      textSize(8); textAlign(CENTER, CENTER);
      text(state.crystals >= 5 ? '[E] Offer 5 Crystals > +25 Solar' : '[E] Offer Crystals (need 5)', asx, asy + 24);
    }
  }});

  // Columns (4)
  var colOffs = [-hw * 0.6, -hw * 0.25, hw * 0.25, hw * 0.6];
  for (var ci = 0; ci < colOffs.length; ci++) {
    (function(cx) {
      items.push({ y: R.cy + hh - 10, draw: function() {
        var csx = w2sX(R.cx + cx), ctop = w2sY(R.cy - hh - 8), cbot = w2sY(R.cy + hh - 10);
        fill(hall.trim[0], hall.trim[1], hall.trim[2]);
        noStroke();
        rect(csx - 5, ctop, 10, cbot - ctop);
        fill(hall.trim[0] * 0.9, hall.trim[1] * 0.9, hall.trim[2] * 0.9);
        rect(csx - 7, cbot, 14, 5, 1);
        rect(csx - 7, ctop - 2, 14, 4, 1);
      }});
    })(colOffs[ci]);
  }

  // Advisor NPC (right side)
  var advX = R.cx + hw * 0.55, advY = R.cy - hh * 0.3;
  items.push({ y: advY, draw: function() {
    var asx = w2sX(advX), asy = w2sY(advY);
    noStroke();
    fill(hall.drape[0] * 0.8, hall.drape[1] * 0.8, hall.drape[2] * 0.8);
    rect(asx - 4, asy - 5, 8, 12, 2);
    fill(196, 160, 110);
    ellipse(asx, asy - 10, 8, 8);
    fill(220, 215, 200);
    arc(asx, asy - 10, 9, 6, PI, TWO_PI);
    fill(120, 90, 50);
    rect(asx + 5, asy - 16, 2, 22);
    fill(hall.accent[0], hall.accent[1], hall.accent[2]);
    circle(asx + 6, asy - 16, 3);
    if (dist(state.player.x, state.player.y, advX, advY) < 35) {
      fill(255, 220, 120, 200 + sin(ft * 0.08) * 40);
      textSize(7); textAlign(CENTER, CENTER);
      text('[E] Speak to Advisor', asx, asy + 16);
    }
  }});

  // Jester NPC (left side)
  var jestX = R.cx - hw * 0.55, jestY = R.cy + hh * 0.3;
  var jestBob = sin(ft * 0.06) * 2;
  if (state.templeJesterAnimTimer > 0) {
    state.templeJesterAnimTimer -= 1;
    jestBob = sin(ft * 0.3) * 5;
  }
  items.push({ y: jestY, draw: function() {
    var jsx = w2sX(jestX), jsy = w2sY(jestY) + jestBob;
    noStroke();
    fill(hall.accent[0], hall.accent[1], hall.accent[2]);
    rect(jsx - 4, jsy - 5, 8, 12, 2);
    fill(196, 160, 110);
    ellipse(jsx, jsy - 10, 8, 8);
    fill(hall.accent[0], hall.accent[1], hall.accent[2]);
    triangle(jsx - 5, jsy - 13, jsx, jsy - 21, jsx - 1, jsy - 11);
    triangle(jsx + 5, jsy - 13, jsx, jsy - 21, jsx + 1, jsy - 11);
    fill(255, 230, 80);
    circle(jsx - 5, jsy - 13, 2.5);
    circle(jsx + 5, jsy - 13, 2.5);
    if (dist(state.player.x, state.player.y, jestX, jestY) < 35) {
      fill(255, 220, 120, 200 + sin(ft * 0.08) * 40);
      textSize(7); textAlign(CENTER, CENTER);
      text('[E] Talk to Jester', jsx, jsy + 16);
    }
  }});

  // Pet animal
  var petBob = sin(ft * 0.08) * (petDist > 20 ? 0.5 : 1.5);
  items.push({ y: state.templePetY, draw: function() {
    var px = w2sX(state.templePetX), py = w2sY(state.templePetY) + petBob;
    noStroke();
    _drawTemplePet(hall, px, py);
    if (dist(state.player.x, state.player.y, state.templePetX, state.templePetY) < 25) {
      fill(255, 220, 120, 200 + sin(ft * 0.08) * 40);
      textSize(7); textAlign(CENTER, CENTER);
      text('[E] Pet', px, py + 12);
    }
  }});

  // Achievement plaques (left wall)
  var analytics = {};
  try { analytics = JSON.parse(localStorage.getItem('mare_nostrum_analytics')) || {}; } catch(e) {}
  for (var ai = 0; ai < TEMPLE_ACHIEVEMENTS.length; ai++) {
    (function(ach, idx) {
      var ax = R.cx - hw + 10 + (idx % 2) * 22;
      var ay = R.cy - hh * 0.3 + floor(idx / 2) * 20;
      items.push({ y: ay, draw: function() {
        var psx = w2sX(ax), psy = w2sY(ay);
        var unlocked = !!analytics[ach.milestone];
        noStroke();
        fill(unlocked ? hall.accent[0] : 60, unlocked ? hall.accent[1] : 55, unlocked ? hall.accent[2] : 50, unlocked ? 220 : 100);
        rect(psx, psy, 18, 16, 2);
        fill(unlocked ? 255 : 80);
        textSize(5); textAlign(CENTER, CENTER);
        text(ach.name, psx + 9, psy + 8);
      }});
    })(TEMPLE_ACHIEVEMENTS[ai], ai);
  }

  // Flickering wall torches (6 total — 3 per side)
  var torchPos = [
    { x: R.cx - hw + 15, y: R.cy - hh + 10 },
    { x: R.cx - hw + 15, y: R.cy },
    { x: R.cx - hw + 15, y: R.cy + hh * 0.6 },
    { x: R.cx + hw - 15, y: R.cy - hh + 10 },
    { x: R.cx + hw - 15, y: R.cy },
    { x: R.cx + hw - 15, y: R.cy + hh * 0.6 },
  ];
  for (var ti = 0; ti < torchPos.length; ti++) {
    (function(tp, idx) {
      items.push({ y: tp.y, draw: function() {
        var tsx = w2sX(tp.x), tsy = w2sY(tp.y);
        noStroke();
        fill(100, 80, 50);
        rect(tsx - 2, tsy, 4, 8);
        var tFlicker = sin(ft * 0.12 + idx * 2.7) * 2;
        var fSize = 7 + sin(ft * 0.18 + idx * 1.3) * 2;
        fill(255, 140, 30, 200);
        ellipse(tsx + tFlicker, tsy - 3, fSize, fSize + 3);
        fill(255, 220, 70, 160);
        ellipse(tsx + tFlicker * 0.6, tsy - 5, fSize * 0.6, fSize * 0.8);
        fill(255, 250, 200, 80);
        ellipse(tsx, tsy - 4, 3, 4);
        fill(255, 160, 50, 8);
        circle(tsx, tsy, 90);
      }});
    })(torchPos[ti], ti);
  }

  // Swaying faction banners (3 on back wall)
  var bannerXs = [R.cx - hw * 0.4, R.cx, R.cx + hw * 0.4];
  for (var bi = 0; bi < bannerXs.length; bi++) {
    (function(bx, idx) {
      var by = R.cy - hh - 10;
      items.push({ y: by, draw: function() {
        var bsx = w2sX(bx), bsy = w2sY(by);
        var sway = sin(ft * 0.04 + idx * 2.1) * 3;
        noStroke();
        // Banner rod
        fill(hall.trim[0] * 0.7, hall.trim[1] * 0.7, hall.trim[2] * 0.7);
        rect(bsx - 8, bsy, 16, 2);
        // Cloth
        fill(hall.drape[0], hall.drape[1], hall.drape[2], 200);
        quad(bsx - 6, bsy + 2, bsx + 6, bsy + 2,
             bsx + 5 + sway, bsy + 22, bsx - 5 + sway, bsy + 22);
        // Accent stripe
        fill(hall.accent[0], hall.accent[1], hall.accent[2], 140);
        rect(bsx - 3 + sway * 0.5, bsy + 8, 6, 3);
        // Bottom fringe
        fill(hall.drape[0] * 0.8, hall.drape[1] * 0.8, hall.drape[2] * 0.8, 180);
        triangle(bsx - 5 + sway, bsy + 22, bsx + 5 + sway, bsy + 22, bsx + sway, bsy + 28);
      }});
    })(bannerXs[bi], bi);
  }

  // Water reflections (coastal factions: seapeople, phoenicia, greece)
  var coastFactions = ['seapeople', 'phoenicia', 'greece'];
  if (coastFactions.indexOf(fk) >= 0) {
    items.push({ y: R.cy + hh - 1, draw: function() {
      noStroke();
      for (var wi = 0; wi < 6; wi++) {
        var wx = R.cx - hw + 20 + wi * (hw * 2 - 40) / 5;
        var wy = R.cy + hh - 8 + sin(ft * 0.06 + wi * 1.5) * 2;
        var shimmer = 20 + sin(ft * 0.1 + wi * 0.8) * 15;
        fill(60, 140, 200, shimmer);
        ellipse(w2sX(wx), w2sY(wy), 20, 4);
      }
    }});
  }

  // Trophy wall — defeated/vassal nations
  var trophies = [];
  if (state.nations) {
    var nKeys = Object.keys(state.nations);
    for (var ni = 0; ni < nKeys.length; ni++) {
      var nv = state.nations[nKeys[ni]];
      if (nv && (nv.defeated || nv.vassal)) {
        trophies.push({ key: nKeys[ni], defeated: !!nv.defeated, vassal: !!nv.vassal });
      }
    }
  }
  if (trophies.length > 0) {
    for (var tri = 0; tri < trophies.length; tri++) {
      (function(trophy, idx) {
        var tx = R.cx + hw - 25;
        var ty = R.cy - hh * 0.3 + idx * 24;
        items.push({ y: ty, draw: function() {
          var tsx = w2sX(tx), tsy = w2sY(ty);
          noStroke();
          // Trophy banner background
          var trRelic = LOBBY_RELICS ? LOBBY_RELICS.find(function(r) { return r.faction === trophy.key; }) : null;
          var tc = trRelic ? trRelic.color : [120, 120, 120];
          fill(tc[0], tc[1], tc[2], 60);
          rect(tsx - 14, tsy - 8, 28, 18, 2);
          fill(tc[0], tc[1], tc[2], 180);
          rect(tsx - 12, tsy - 6, 24, 14, 1);
          // Symbol placeholder (small colored rect)
          fill(tc[0] * 0.6, tc[1] * 0.6, tc[2] * 0.6);
          rect(tsx - 4, tsy - 3, 8, 8, 1);
          // Label
          fill(255, 240, 200, 200);
          textSize(5); textAlign(CENTER, CENTER);
          var facName = (typeof getNationName === 'function') ? getNationName(trophy.key) : trophy.key;
          text((trophy.vassal ? 'Vassal: ' : 'Conquered: ') + facName, tsx, tsy + 12);
        }});
      })(trophies[tri], tri);
    }
  }

  // Multiplayer temple visit placeholder
  if (typeof MP !== 'undefined' && MP.connected) {
    items.push({ y: R.cy + hh * 0.7, draw: function() {
      var nx = w2sX(R.cx), ny = w2sY(R.cy + hh * 0.7);
      fill(160, 150, 130, 120);
      noStroke();
      rect(nx - 80, ny, 160, 16, 3);
      fill(220, 210, 180, 180);
      textSize(6); textAlign(CENTER, CENTER);
      text('In multiplayer, other players can visit your temple hall (coming soon)', nx, ny + 8);
    }});
  }

  // Door marker at bottom
  var doorX = R.cx, doorY = R.cy + hh - 5;
  items.push({ y: doorY + 999, draw: function() {
    var dsx = w2sX(doorX), dsy = w2sY(doorY);
    noStroke();
    fill(hall.wall[0] * 0.6, hall.wall[1] * 0.6, hall.wall[2] * 0.6);
    rect(dsx - 14, dsy - 4, 28, 8, 2);
    fill(hall.trim[0], hall.trim[1], hall.trim[2], 160);
    textSize(7); textAlign(CENTER, CENTER);
    text('v Exit', dsx, dsy + 10);
  }});

  // Sort by Y and draw
  items.sort(function(a, b) { return a.y - b.y; });
  for (var i = 0; i < items.length; i++) items[i].draw();

  // Warm ambient glow (always warm indoor lighting — slower cycle)
  noStroke();
  var warmPulse = 6 + sin(ft * 0.01) * 3;
  fill(255, 180, 80, warmPulse);
  rect(w2sX(R.cx - hw), w2sY(R.cy - hh), hw * 2, hh * 2);
  // Soft golden vignette edges
  fill(255, 160, 60, 4);
  rect(w2sX(R.cx - hw), w2sY(R.cy - hh), 20, hh * 2);
  rect(w2sX(R.cx + hw - 20), w2sY(R.cy - hh), 20, hh * 2);
}

function drawTempleRoomHUD() {
  var hall = TEMPLE_HALLS[state.faction || 'rome'] || TEMPLE_HALLS.rome;
  fill(hall.accent[0], hall.accent[1], hall.accent[2]);
  noStroke(); textAlign(CENTER, TOP); textSize(10);
  text(hall.name, width / 2, 14);
  fill(hall.trim[0], hall.trim[1], hall.trim[2]);
  textSize(8);
  text('[ESC] Exit Temple', width / 2, height - 20);
  textAlign(LEFT, TOP);
}

function _drawAltarIcon(hall, asx, asy) {
  noStroke();
  if (hall.altarShape === 'eagle') {
    triangle(asx, asy - 15, asx - 11, asy - 5, asx + 11, asy - 5);
    rect(asx - 1.5, asy - 18, 3, 5);
    ellipse(asx, asy - 20, 5, 4);
  } else if (hall.altarShape === 'crescent') {
    arc(asx, asy - 11, 20, 20, PI + 0.4, TWO_PI - 0.4);
  } else if (hall.altarShape === 'pyramid') {
    triangle(asx, asy - 21, asx - 13, asy - 3, asx + 13, asy - 3);
  } else if (hall.altarShape === 'olive') {
    stroke(hall.altarColor[0], hall.altarColor[1], hall.altarColor[2]);
    strokeWeight(1.5); noFill();
    arc(asx, asy - 10, 16, 20, -PI * 0.8, -PI * 0.2);
    noStroke();
  } else if (hall.altarShape === 'anchor') {
    stroke(hall.altarColor[0], hall.altarColor[1], hall.altarColor[2]);
    strokeWeight(2); noFill();
    line(asx, asy - 20, asx, asy - 5);
    line(asx - 8, asy - 18, asx + 8, asy - 18);
    arc(asx, asy - 5, 14, 10, 0, PI);
    noStroke();
  } else if (hall.altarShape === 'fire') {
    for (var f = 0; f < 3; f++) {
      var fw = (3 - f) * 4, fh = 14 * (1 - f * 0.25);
      var flicker = sin(frameCount * 0.15 + f * 1.5) * 2;
      fill(255, 100 + f * 50, 20 + f * 20, 220 - f * 30);
      ellipse(asx + flicker, asy - 3 - fh * 0.5, fw * 2, fh);
    }
  } else if (hall.altarShape === 'ship') {
    beginShape();
    vertex(asx - 11, asy - 5); vertex(asx + 11, asy - 5);
    vertex(asx + 8, asy - 11); vertex(asx, asy - 18); vertex(asx - 8, asy - 11);
    endShape(CLOSE);
  } else if (hall.altarShape === 'dolmen') {
    rect(asx - 11, asy - 7, 5, 10);
    rect(asx + 6, asy - 7, 5, 10);
    rect(asx - 13, asy - 11, 26, 5, 1);
  }
}

function _templeRoomInteractE() {
  var R = TEMPLE_ROOM, fk = state.faction || 'rome';
  var hall = TEMPLE_HALLS[fk] || TEMPLE_HALLS.rome;
  var altarX = R.cx, altarY = R.cy - R.hh + 30;

  // Altar interaction (crystal -> solar)
  if (dist(state.player.x, state.player.y, altarX, altarY) < 45) {
    if (state.crystals >= 5) {
      state.crystals -= 5;
      state.solar = min(state.solar + 25, state.maxSolar);
      if (snd) snd.playSFX('crystal');
      addFloatingText(w2sX(altarX), w2sY(altarY) - 20, '+25 Solar Energy', C.solarBright);
      spawnParticles(state.player.x, state.player.y, 'divine', 8);
    } else {
      addFloatingText(w2sX(altarX), w2sY(altarY) - 20, 'Need 5 Crystals', '#ff8888');
    }
    return true;
  }

  // Advisor
  var advX = R.cx + R.hw * 0.55, advY = R.cy - R.hh * 0.3;
  if (dist(state.player.x, state.player.y, advX, advY) < 35) {
    var advice = 'You are prospering, leader!';
    if (state.harvest < 20) advice = 'Your food stores are low. Build more farms.';
    else if (state.legia && state.legia.army && state.legia.army.length < 5) advice = 'Our military is weak. Train more soldiers.';
    else if (state.nations) {
      var nk = Object.keys(state.nations);
      var badRep = nk.find(function(k) { return state.nations[k] && state.nations[k].reputation < -20; });
      if (badRep) advice = 'The nations grow restless. Consider diplomacy.';
    }
    addFloatingText(w2sX(advX), w2sY(advY) - 20, advice, '#ffd080');
    if (snd) snd.playSFX('click');
    return true;
  }

  // Jester
  var jestX = R.cx - R.hw * 0.55, jestY = R.cy + R.hh * 0.3;
  if (dist(state.player.x, state.player.y, jestX, jestY) < 35) {
    var jokes = TEMPLE_JESTER_JOKES[fk] || TEMPLE_JESTER_JOKES.rome;
    var joke = jokes[floor(random(jokes.length))];
    addFloatingText(w2sX(jestX), w2sY(jestY) - 20, joke, '#ffee88');
    state.templeJesterAnimTimer = 60;
    if (!state.templeJesterJokedToday) {
      state.templeJesterJokedToday = true;
      if (typeof state.morale !== 'undefined') state.morale = min(100, (state.morale || 50) + 5);
      addFloatingText(w2sX(jestX), w2sY(jestY) - 30, '+5 Morale', '#aaffaa');
    }
    if (snd) snd.playSFX('click');
    return true;
  }

  // Pet
  if (dist(state.player.x, state.player.y, state.templePetX || state.player.x, state.templePetY || state.player.y) < 25) {
    state.templePetAnimTimer = 90;
    var petSound = hall.pet === 'cat' ? 'Mrrrow!' : hall.pet === 'wolf' ? 'Awoo!' : hall.pet === 'owl' ? 'Hoo hoo!' : hall.pet === 'crab' ? '*click click*' : hall.pet === 'monkey' ? 'Ooh ooh!' : hall.pet === 'falcon' ? 'Screee!' : hall.pet === 'parrot' ? 'Squawk!' : 'Oink!';
    addFloatingText(w2sX(state.templePetX || state.player.x), w2sY(state.templePetY || state.player.y) - 15, petSound, '#ffccaa');
    if (snd) snd.playSFX('click');
    return true;
  }

  return false;
}

function _drawTemplePet(hall, px, py) {
  noStroke();
  var pc = hall.petColor, pa = hall.petAccent;
  fill(pc[0], pc[1], pc[2]);
  if (hall.pet === 'wolf') {
    ellipse(px, py, 10, 7);
    fill(pa[0], pa[1], pa[2]);
    ellipse(px - 5, py - 2, 5, 4);
    triangle(px - 7, py - 5, px - 5, py - 8, px - 3, py - 5);
  } else if (hall.pet === 'monkey') {
    ellipse(px, py, 8, 8);
    fill(pa[0], pa[1], pa[2]);
    ellipse(px, py - 5, 7, 6);
  } else if (hall.pet === 'cat') {
    ellipse(px, py, 9, 7);
    fill(pa[0], pa[1], pa[2]);
    ellipse(px - 4, py - 2, 6, 5);
    triangle(px - 6, py - 5, px - 4, py - 9, px - 2, py - 5);
    triangle(px - 7, py - 5, px - 5, py - 9, px - 3, py - 5);
  } else if (hall.pet === 'owl') {
    ellipse(px, py, 8, 10);
    fill(pa[0], pa[1], pa[2]);
    ellipse(px, py - 4, 8, 6);
    fill(60, 50, 30);
    circle(px - 2, py - 4, 2.5); circle(px + 2, py - 4, 2.5);
  } else if (hall.pet === 'crab') {
    ellipse(px, py, 10, 6);
    fill(pa[0], pa[1], pa[2]);
    circle(px - 6, py - 2, 4); circle(px + 6, py - 2, 4);
  } else if (hall.pet === 'falcon') {
    ellipse(px, py, 8, 6);
    fill(pa[0], pa[1], pa[2]);
    ellipse(px - 3, py - 1, 5, 4);
  } else if (hall.pet === 'parrot') {
    fill(pc[0], pc[1], pc[2]);
    ellipse(px, py, 7, 8);
    fill(pa[0], pa[1], pa[2]);
    ellipse(px, py - 4, 6, 5);
    fill(255, 200, 60);
    triangle(px - 4, py - 4, px - 6, py - 3, px - 4, py - 2);
  } else if (hall.pet === 'boar') {
    ellipse(px, py, 12, 8);
    fill(pa[0], pa[1], pa[2]);
    ellipse(px - 5, py, 5, 4);
  }
}

// ─── CASTRUM ROOM (engine-based interior) ─────────────────────────────────
function drawCastrumRoom() {
  var R = CASTRUM_ROOM, fk = state.faction || 'rome';
  var mil = FACTION_MILITARY[fk] || FACTION_MILITARY.rome;
  var ft = frameCount, hw = R.hw, hh = R.hh;
  var clv = state.legia ? state.legia.castrumLevel : 1;
  noStroke();
  var wc = clv >= 5 ? [55,50,45] : clv >= 3 ? [50,45,38] : [42,36,28];
  fill(wc[0]*0.3, wc[1]*0.3, wc[2]*0.3);
  rect(w2sX(R.cx - hw - 20), w2sY(R.cy - hh - 40), (hw + 20) * 2, (hh + 60) * 2);
  var tileS = 24;
  var f1 = clv >= 5 ? [200,195,185] : clv >= 3 ? [175,168,155] : [155,138,112];
  var f2 = clv >= 5 ? [180,175,165] : clv >= 3 ? [155,148,135] : [140,125,100];
  for (var tx = -hw; tx < hw; tx += tileS) {
    for (var ty = -hh; ty < hh; ty += tileS) {
      var light = (floor((tx + hw) / tileS) + floor((ty + hh) / tileS)) % 2 === 0;
      fill(light ? f1[0] : f2[0], light ? f1[1] : f2[1], light ? f1[2] : f2[2]);
      rect(w2sX(R.cx + tx), w2sY(R.cy + ty), tileS, tileS);
    }
  }
  fill(wc[0], wc[1], wc[2]);
  rect(w2sX(R.cx - hw), w2sY(R.cy - hh - 30), hw * 2, 30);
  fill(wc[0]+20, wc[1]+20, wc[2]+20);
  rect(w2sX(R.cx - hw), w2sY(R.cy - hh - 2), hw * 2, 4);
  fill(wc[0]*0.8, wc[1]*0.8, wc[2]*0.8);
  rect(w2sX(R.cx - hw - 10), w2sY(R.cy - hh), 10, hh * 2);
  rect(w2sX(R.cx + hw), w2sY(R.cy - hh), 10, hh * 2);
  if (clv >= 7) { fill(200,170,50,80); rect(w2sX(R.cx - hw), w2sY(R.cy - hh - 4), hw * 2, 2); }
  var items = [];
  // Training Yard (center)
  var sparX = R.cx, sparY = R.cy + 10, sparPhase = state.castrumSparAnim;
  items.push({ y: sparY, draw: function() {
    var sx1 = w2sX(sparX - 12), sy1 = w2sY(sparY), sx2 = w2sX(sparX + 12), sy2 = w2sY(sparY);
    noStroke();
    fill(mil.tunic[0], mil.tunic[1], mil.tunic[2]); rect(sx1 - 3, sy1 - 5, 6, 10, 1);
    fill(196,160,110); ellipse(sx1, sy1 - 9, 7, 7);
    fill(mil.helm[0], mil.helm[1], mil.helm[2]); arc(sx1, sy1 - 9, 8, 5, PI, TWO_PI);
    var swAng = sin(sparPhase * 0.06) * 0.6;
    push(); translate(sx1 + 4, sy1 - 2); rotate(swAng);
    fill(180,180,190); rect(0, -8, 2, 10); pop();
    fill(mil.tunic[0]*0.9, mil.tunic[1]*0.9, mil.tunic[2]*0.9); rect(sx2 - 3, sy2 - 5, 6, 10, 1);
    fill(196,160,110); ellipse(sx2, sy2 - 9, 7, 7);
    fill(mil.helm[0], mil.helm[1], mil.helm[2]); arc(sx2, sy2 - 9, 8, 5, PI, TWO_PI);
    fill(mil.shield[0], mil.shield[1], mil.shield[2]); rect(sx2 - 6, sy2 - 6, 5, 8, 1);
    var dx2 = w2sX(sparX), dy2 = w2sY(sparY - 25);
    fill(180,160,100); rect(dx2 - 2, dy2, 4, 14);
    fill(200,180,120); rect(dx2 - 6, dy2 + 2, 12, 3);
    fill(160,140,90); ellipse(dx2, dy2 - 2, 8, 8);
    var wrx = w2sX(sparX + 30), wry = w2sY(sparY - 10);
    fill(100,80,50); rect(wrx, wry, 3, 16);
    fill(180,180,190); rect(wrx - 3, wry - 6, 2, 10); rect(wrx + 4, wry - 4, 2, 8);
  }});
  // Recruitment Station (right)
  var recX = R.cx + hw * 0.55, recY = R.cy;
  items.push({ y: recY, draw: function() {
    var rsx = w2sX(recX), rsy = w2sY(recY); noStroke();
    fill(120,100,70); rect(rsx - 14, rsy - 2, 28, 8, 1);
    fill(100,85,60); rect(rsx - 16, rsy + 6, 32, 4, 1);
    fill(mil.cape[0], mil.cape[1], mil.cape[2]); rect(rsx - 3, rsy - 14, 6, 10, 1);
    fill(196,160,110); ellipse(rsx, rsy - 18, 7, 7);
    fill(180,160,100); rect(rsx + 18, rsy - 20, 16, 10, 1);
    fill(60,30,20); textSize(5); textAlign(CENTER,CENTER); text('RECRUIT', rsx + 26, rsy - 15);
    if (dist(state.player.x, state.player.y, recX, recY) < 40) {
      fill(255,220,120, 200 + sin(ft * 0.08) * 40); textSize(7); textAlign(CENTER,CENTER);
      text('[E] Recruit Soldiers', rsx, rsy + 18);
    }
  }});
  // Armory Wall (left)
  var armX = R.cx - hw * 0.55, armY = R.cy;
  items.push({ y: armY, draw: function() {
    var asx = w2sX(armX), asy = w2sY(armY); noStroke();
    fill(wc[0]+10, wc[1]+10, wc[2]+10); rect(asx - 20, asy - 20, 40, 30, 1);
    fill(mil.shield[0], mil.shield[1], mil.shield[2]);
    ellipse(asx - 10, asy - 10, 10, 10); ellipse(asx + 10, asy - 10, 10, 10);
    fill(180,180,190); rect(asx - 2, asy - 18, 2, 14); rect(asx + 6, asy - 16, 2, 12);
    fill(mil.shieldBoss[0], mil.shieldBoss[1], mil.shieldBoss[2]);
    circle(asx - 10, asy - 10, 3); circle(asx + 10, asy - 10, 3);
    if (clv >= 5) { fill(mil.armor[0], mil.armor[1], mil.armor[2]); rect(asx - 3, asy + 2, 6, 10, 1);
      fill(mil.helm[0], mil.helm[1], mil.helm[2]); ellipse(asx, asy - 1, 7, 6); }
    if (dist(state.player.x, state.player.y, armX, armY) < 40) {
      fill(255,220,120, 200 + sin(ft * 0.08) * 40); textSize(7); textAlign(CENTER,CENTER);
      text('[E] Armory', asx, asy + 20); }
  }});
  // War Table (back center)
  var wtX = R.cx, wtY = R.cy - hh + 35;
  items.push({ y: wtY, draw: function() {
    var tsx = w2sX(wtX), tsy = w2sY(wtY); noStroke();
    fill(90,70,45); rect(tsx - 25, tsy, 50, 14, 2);
    fill(70,55,35); rect(tsx - 22, tsy + 14, 4, 6); rect(tsx + 18, tsy + 14, 4, 6);
    fill(160,150,120); rect(tsx - 20, tsy + 2, 40, 10, 1);
    var facs = ['rome','carthage','egypt','greece','seapeople','persia','phoenicia','gaul'];
    for (var fi = 0; fi < facs.length; fi++) {
      var fm2 = FACTION_MILITARY[facs[fi]];
      if (fm2) { fill(fm2.cape[0], fm2.cape[1], fm2.cape[2]); circle(tsx - 16 + fi * 5, tsy + 7, 3); }
    }
    if (dist(state.player.x, state.player.y, wtX, wtY) < 40) {
      fill(255,220,120, 200 + sin(ft * 0.08) * 40); textSize(7); textAlign(CENTER,CENTER);
      text('[E] War Planning', tsx, tsy + 28); }
  }});
  // Trophy Wall (back left)
  var trX = R.cx - hw * 0.55, trY = R.cy - hh + 30;
  items.push({ y: trY, draw: function() {
    var tsx = w2sX(trX), tsy = w2sY(trY); noStroke(); var tc = 0;
    if (state.nations) { var nk = Object.keys(state.nations);
      for (var ni = 0; ni < nk.length; ni++) { if (state.nations[nk[ni]] && state.nations[nk[ni]].defeated) {
        var dfm = FACTION_MILITARY[nk[ni]]; if (dfm) { fill(dfm.cape[0], dfm.cape[1], dfm.cape[2], 180);
          rect(tsx - 8 + tc * 14, tsy, 10, 16, 1); fill(255,255,255,150); textSize(4); textAlign(CENTER,CENTER);
          text(nk[ni].charAt(0).toUpperCase(), tsx - 3 + tc * 14, tsy + 8); tc++; } } } }
    if (tc === 0) { fill(80,75,65,120); rect(tsx - 8, tsy, 10, 16, 1);
      fill(120,115,105); textSize(4); textAlign(CENTER,CENTER); text('?', tsx - 3, tsy + 8); }
  }});
  // Commander NPC
  var cmdX = R.cx + hw * 0.3, cmdY = R.cy - hh + 40;
  items.push({ y: cmdY, draw: function() {
    var csx = w2sX(cmdX), csy = w2sY(cmdY); noStroke();
    fill(mil.cape[0]*0.7, mil.cape[1]*0.7, mil.cape[2]*0.7); rect(csx - 4, csy - 5, 8, 12, 2);
    fill(196,160,110); ellipse(csx, csy - 10, 8, 8);
    fill(mil.helm[0], mil.helm[1], mil.helm[2]); arc(csx, csy - 10, 9, 6, PI, TWO_PI);
    fill(mil.helmCrest[0], mil.helmCrest[1], mil.helmCrest[2]); rect(csx - 1, csy - 15, 2, 5);
    if (dist(state.player.x, state.player.y, cmdX, cmdY) < 35) {
      fill(255,220,120, 200 + sin(ft * 0.08) * 40); textSize(7); textAlign(CENTER,CENTER);
      text('[E] Commander', csx, csy + 16); }
  }});
  // Flag Holder (back right)
  var fhX = R.cx + hw * 0.55, fhY = R.cy - hh + 30;
  items.push({ y: fhY, draw: function() {
    var fsx = w2sX(fhX), fsy = w2sY(fhY);
    drawFactionStandard(fsx, fsy, fk, 1.2);
    fill(255,220,100, 20 + sin(ft * 0.04) * 10); noStroke(); circle(fsx + 8, fsy - 10, 30);
  }});
  // Torches
  var tps = [{ x: R.cx - hw + 15, y: R.cy - hh + 10 }, { x: R.cx + hw - 15, y: R.cy - hh + 10 }];
  for (var ti3 = 0; ti3 < tps.length; ti3++) { (function(tp, idx) {
    items.push({ y: tp.y, draw: function() {
      var tsx = w2sX(tp.x), tsy = w2sY(tp.y); noStroke();
      fill(100,80,50); rect(tsx - 2, tsy, 4, 8);
      var fl = sin(ft * 0.12 + idx * 3) * 1.5;
      fill(255,140,30,200); ellipse(tsx + fl, tsy - 3, 7, 10);
      fill(255,220,70,160); ellipse(tsx + fl * 0.6, tsy - 5, 4, 6);
      fill(255,160,50,10); circle(tsx, tsy, 80);
    }}); })(tps[ti3], ti3); }
  // Faction banners at lv5+
  if (clv >= 5) { var bps = [R.cx - hw + 30, R.cx + hw - 30];
    for (var bi = 0; bi < bps.length; bi++) { (function(bx) {
      items.push({ y: R.cy - hh + 15, draw: function() {
        var bsx = w2sX(bx), bsy = w2sY(R.cy - hh + 15); noStroke();
        fill(mil.cape[0], mil.cape[1], mil.cape[2], 160); rect(bsx - 5, bsy, 10, 20, 1);
        fill(mil.tunic[0], mil.tunic[1], mil.tunic[2], 100); rect(bsx - 3, bsy + 4, 6, 6);
      }}); })(bps[bi]); } }
  // Door marker
  var doorX = R.cx, doorY = R.cy + hh - 5;
  items.push({ y: doorY + 999, draw: function() {
    var dsx = w2sX(doorX), dsy = w2sY(doorY); noStroke();
    fill(wc[0]*0.6, wc[1]*0.6, wc[2]*0.6); rect(dsx - 14, dsy - 4, 28, 8, 2);
    fill(200,195,185,160); textSize(7); textAlign(CENTER,CENTER); text('v Exit', dsx, dsy + 10);
  }});
  items.sort(function(a, b) { return a.y - b.y; });
  for (var i = 0; i < items.length; i++) items[i].draw();
  noStroke(); fill(255,160,60, clv >= 5 ? 4 : 6);
  rect(w2sX(R.cx - hw), w2sY(R.cy - hh), hw * 2, hh * 2);
}

function drawCastrumRoomHUD() {
  var ft2 = getFactionTerms();
  var clv = state.legia ? state.legia.castrumLevel : 1;
  fill(200,180,140); noStroke(); textAlign(CENTER, TOP); textSize(10);
  text(ft2.barracks + ' Interior (Lv ' + clv + ')', width / 2, 14);
  fill(180,170,155); textSize(8);
  text('[ESC] Exit ' + ft2.barracks, width / 2, height - 20);
  textAlign(LEFT, TOP);
}

function _castrumRoomInteractE() {
  var R = CASTRUM_ROOM;
  var recX = R.cx + R.hw * 0.55, recY = R.cy;
  if (dist(state.player.x, state.player.y, recX, recY) < 40) {
    if (state.legia) state.legia.legiaUIOpen = !state.legia.legiaUIOpen;
    return true;
  }
  var armX = R.cx - R.hw * 0.55, armY = R.cy;
  if (dist(state.player.x, state.player.y, armX, armY) < 40) {
    if (state.legia && state.legia.army && state.legia.army.length > 0 && state.gold >= 50) {
      state.gold -= 50;
      for (var i = 0; i < state.legia.army.length; i++) {
        state.legia.army[i].damage = floor(state.legia.army[i].damage * 1.05);
        state.legia.army[i].maxHp = floor(state.legia.army[i].maxHp * 1.05);
        state.legia.army[i].hp = min(state.legia.army[i].hp + 5, state.legia.army[i].maxHp);
      }
      addFloatingText(w2sX(armX), w2sY(armY) - 20, 'Army +5% stats! (-50g)', '#ccaa44');
      if (snd) snd.playSFX('upgrade');
    } else if (state.gold < 50) {
      addFloatingText(w2sX(armX), w2sY(armY) - 20, 'Need 50 gold', '#ff8888');
    } else { addFloatingText(w2sX(armX), w2sY(armY) - 20, 'No soldiers to upgrade', '#aaaaaa'); }
    return true;
  }
  var wtX = R.cx, wtY = R.cy - R.hh + 35;
  if (dist(state.player.x, state.player.y, wtX, wtY) < 40) {
    if (typeof state.nationPanelOpen !== 'undefined') { state.nationPanelOpen = !state.nationPanelOpen; }
    else { addFloatingText(w2sX(wtX), w2sY(wtY) - 20, 'Study the war map...', '#ddccaa'); }
    return true;
  }
  var cmdX = R.cx + R.hw * 0.3, cmdY = R.cy - R.hh + 40;
  if (dist(state.player.x, state.player.y, cmdX, cmdY) < 35) {
    var advice, lg = state.legia;
    if (lg && lg.army) {
      var archers = lg.army.filter(function(u) { return u.type === 'archer'; }).length;
      var total = lg.army.length;
      if (total === 0) advice = 'We have no army! Recruit soldiers immediately.';
      else if (archers === 0 && total > 3) advice = CASTRUM_COMMANDER_ADVICE[0];
      else if (lg.morale > 80) advice = CASTRUM_COMMANDER_ADVICE[1];
      else advice = CASTRUM_COMMANDER_ADVICE[floor(random(CASTRUM_COMMANDER_ADVICE.length))];
    } else { advice = 'Build your army, commander.'; }
    addFloatingText(w2sX(cmdX), w2sY(cmdY) - 20, advice, '#ffd080');
    if (snd) snd.playSFX('click');
    return true;
  }
  // Flag Holder — recover fallen banner
  var fhX = R.cx + R.hw * 0.55, fhY = R.cy - R.hh + 30;
  if (dist(state.player.x, state.player.y, fhX, fhY) < 40) {
    if (state.legia && state.legia._fallenBanner) {
      state.legia._fallenBanner = false;
      addFloatingText(w2sX(fhX), w2sY(fhY) - 20, 'Standard recovered!', '#ffd700');
      spawnParticles(state.player.x, state.player.y, 'divine', 6);
      if (snd) snd.playSFX('crystal');
    } else {
      addFloatingText(w2sX(fhX), w2sY(fhY) - 20, 'Your faction standard.', '#ddccaa');
    }
    return true;
  }
  return false;
}

function drawFactionStandard(x, y, faction, scale) {
  var sc = scale || 1, fm = FACTION_MILITARY[faction] || FACTION_MILITARY.rome;
  noStroke(); fill(120,100,60); rect(x, y - 20 * sc, 2 * sc, 25 * sc);
  var flutter = sin(frameCount * 0.08 + x * 0.1) * 3;
  fill(fm.cape[0], fm.cape[1], fm.cape[2]);
  quad(x + 2*sc, y - 18*sc, x + 14*sc + flutter, y - 16*sc,
       x + 12*sc + flutter, y - 6*sc, x + 2*sc, y - 8*sc);
  fill(fm.tunic[0], fm.tunic[1], fm.tunic[2], 180);
  textSize(5 * sc); textAlign(CENTER,CENTER);
  var sym = faction === 'rome' ? 'E' : faction === 'carthage' ? 'C' : faction === 'egypt' ? 'O' :
            faction === 'greece' ? 'A' : faction === 'seapeople' ? '~' : faction === 'persia' ? 'F' :
            faction === 'phoenicia' ? 'S' : 'D';
  text(sym, x + 8*sc + flutter*0.5, y - 12*sc);
  fill(200,170,50); circle(x + 1*sc, y - 20*sc, 3*sc);
}

function drawPyramid() {
  let pyr = state.pyramid;
  let sx = w2sX(pyr.x);
  let sy = w2sY(pyr.y);
  let lvl = pyr.level;
  let tier = lvl <= 4 ? 1 : lvl <= 8 ? 2 : lvl <= 14 ? 3 : lvl <= 19 ? 4 : 5;

  // Tier-based scaling — no caps
  let baseW, colH, colCount, colW, steps;
  if (tier === 1) {
    baseW = 60; colH = 28; colCount = 2; colW = 3; steps = 1;
  } else if (tier === 2) {
    baseW = 100 + (lvl - 5) * 6; colH = 45 + (lvl - 5) * 4; colCount = 4; colW = 4; steps = 3;
  } else if (tier === 3) {
    baseW = 130 + (lvl - 9) * 4; colH = 57 + (lvl - 9) * 3; colCount = 7; colW = 5; steps = 5;
  } else if (tier === 4) {
    baseW = 175 + (lvl - 15) * 7; colH = 72 + (lvl - 15) * 3; colCount = 9; colW = 5; steps = 7;
  } else {
    baseW = 210 + (lvl - 20) * 6; colH = 84 + (lvl - 20) * 2; colCount = 9; colW = 5; steps = 7;
  }

  pyr.chargePhase += 0.02;

  push();
  translate(sx, sy);
  noStroke();

  // Ground shadow
  fill(0, 0, 0, 40);
  ellipse(0, 12, baseW * 1.3, 16 + tier * 2);

  // ─── PLATFORM / STYLOBATE ───
  let cellaTop = 10 - steps * 4;
  for (let st = 0; st < steps; st++) {
    let stepW = baseW + (steps - st) * 10;
    let stepY = 10 - st * 4;
    if (tier === 1) {
      // Rough-cut basalt
      fill(74, 56, 40);
      rect(-stepW / 2, stepY, stepW, 5, 1);
      fill(84, 66, 50);
      rect(-stepW / 2, stepY, stepW, 2);
    } else {
      fill(192 - st * 5, 185 - st * 5, 175 - st * 5);
      rect(-stepW / 2, stepY, stepW, 5, 1);
      fill(205 - st * 4, 198 - st * 4, 188 - st * 4);
      rect(-stepW / 2, stepY, stepW, 2);
      fill(155 - st * 5, 148 - st * 5, 138 - st * 5, 60);
      rect(-stepW / 2 + 1, stepY + 3, stepW, 2);
    }
  }

  // Crystal step veins (Tier 5, lv21+)
  if (tier === 5 && lvl >= 21) {
    let veinAlpha = 60 + sin(frameCount * 0.04) * 20;
    stroke(80, 220, 190, veinAlpha);
    strokeWeight(0.6);
    for (let st = 0; st < steps; st++) {
      let stepW = baseW + (steps - st) * 10;
      let stepY = 10 - st * 4;
      for (let v = 0; v < 2; v++) {
        let vx = -stepW * 0.3 + v * stepW * 0.4 + sin(st + v) * 10;
        line(vx, stepY + 1, vx + stepW * 0.2, stepY + 1);
      }
    }
    noStroke();
  }

  // ─── CELLA (inner chamber wall) ───
  let cellaW = baseW * 0.7;
  let cellaH = colH - 4;
  if (tier >= 2) {
    fill(175, 168, 158);
    rect(-cellaW / 2, cellaTop - cellaH, cellaW, cellaH);
    stroke(165, 158, 148, 40);
    strokeWeight(0.5);
    for (let ly = cellaTop - cellaH + 6; ly < cellaTop; ly += 8) {
      line(-cellaW / 2 + 2, ly, cellaW / 2 - 2, ly);
    }
    noStroke();
    // Doorway
    let doorW = tier >= 3 ? 18 : 14;
    fill(40, 35, 30);
    rect(-doorW / 2, cellaTop - cellaH * 0.7, doorW, cellaH * 0.7, 2, 2, 0, 0);
    // Door arch
    fill(160, 152, 142);
    arc(0, cellaTop - cellaH * 0.7, doorW + 4, 10, -PI, 0, PIE);
    // Amber doorway glow — enhanced when player is near
    let _nearDoor = dist(state.player.x, state.player.y, pyr.x, pyr.y + 5) < 40;
    let doorGlowAlpha = _nearDoor ? (55 + sin(frameCount * 0.06) * 20) : 35;
    let glowCol = (tier === 5 && lvl >= 23) ? color(80, 240, 200, doorGlowAlpha) : color(255, 190, 80, doorGlowAlpha);
    fill(glowCol);
    rect(-doorW / 2 + 2, cellaTop - cellaH * 0.5, doorW - 4, cellaH * 0.5);
    // Warm spill when near
    if (_nearDoor) {
      fill(255, 180, 60, 15 + sin(frameCount * 0.05) * 8);
      ellipse(0, cellaTop + 4, doorW * 2.5, 12);
    }
  }

  // [E] Enter prompt near door
  if (tier >= 2 && dist(state.player.x, state.player.y, pyr.x, pyr.y + 5) < 40 && !state.buildMode) {
    fill(255, 220, 120, 200 + sin(frameCount * 0.08) * 40);
    textAlign(CENTER, CENTER); textSize(11);
    text('[E] Enter Temple', 0, cellaTop + 16);
    textAlign(LEFT, TOP);
  }

  // ─── COLUMNS ───
  let colSpacing = baseW * 0.82 / max(colCount - 1, 1);
  let colStartX = -baseW * 0.41;
  let colBase = cellaTop;
  let colTop = cellaTop - colH;

  for (let c = 0; c < colCount; c++) {
    let cx2 = colStartX + c * colSpacing;

    if (tier === 1) {
      // Rough upright stones
      fill(74, 56, 40);
      rect(cx2 - colW, colBase - 5, colW * 2, -(colH - 5));
      fill(84, 66, 50);
      rect(cx2 - colW + 0.5, colBase - 5, colW, -(colH - 8));
    } else {
      // Column base
      fill(180, 174, 164);
      rect(cx2 - colW - 2, colBase - 5, colW * 2 + 4, 5, 1);
      fill(190, 184, 174);
      rect(cx2 - colW - 1, colBase - 6, colW * 2 + 2, 2, 1);
      // Shaft with entasis
      fill(195, 188, 178);
      beginShape();
      vertex(cx2 - colW, colBase - 5);
      vertex(cx2 - colW + 0.5, colTop + 6);
      vertex(cx2 + colW - 0.5, colTop + 6);
      vertex(cx2 + colW, colBase - 5);
      endShape(CLOSE);
      // Fluting
      stroke(175, 168, 158, 50);
      strokeWeight(0.5);
      for (let f = -colW + 1.5; f <= colW - 1.5; f += 2) {
        line(cx2 + f, colBase - 5, cx2 + f * 0.9, colTop + 6);
      }
      noStroke();
      // Capital
      if (tier === 2) {
        // Simple Doric
        fill(200, 194, 184);
        rect(cx2 - colW - 1, colTop + 3, colW * 2 + 2, 3, 1);
        fill(190, 184, 174);
        ellipse(cx2, colTop + 5, colW * 2, 4);
      } else {
        // Corinthian
        fill(200, 194, 184);
        rect(cx2 - colW - 2, colTop + 2, colW * 2 + 4, 4, 1);
        fill(185, 178, 168);
        ellipse(cx2 - colW, colTop + 5, 5, 6);
        ellipse(cx2 + colW, colTop + 5, 5, 6);
        ellipse(cx2, colTop + 4, 4, 5);
        // Gold-tipped volutes (Tier 4+)
        let volCol = tier >= 4 ? color(212, 170, 64) : color(195, 188, 178);
        fill(volCol);
        circle(cx2 - colW - 1, colTop + 3, 3);
        circle(cx2 + colW + 1, colTop + 3, 3);
      }
    }

    // Crystal veins on columns (Tier 5, lv21+)
    if (tier === 5 && lvl >= 21) {
      let vAlpha = 60 + sin(frameCount * 0.04 + c * 0.8) * 30;
      stroke(80, 240, 200, vAlpha);
      strokeWeight(0.8);
      line(cx2 - 1, colBase - 8, cx2 - 0.5, colTop + 8);
      line(cx2 + 1.5, colBase - 12, cx2 + 1, colTop + 10);
      noStroke();
    }
  }

  // Tier 4+: inner row of columns (double colonnade)
  if (tier >= 4) {
    let innerCount = 4;
    let innerSpacing = baseW * 0.6 / (innerCount - 1);
    let innerStartX = -baseW * 0.3;
    for (let c = 0; c < innerCount; c++) {
      let cx2 = innerStartX + c * innerSpacing;
      fill(180, 174, 164, 160);
      beginShape();
      vertex(cx2 - colW + 1, colBase - 5);
      vertex(cx2 - colW + 1.5, colTop + 8);
      vertex(cx2 + colW - 1.5, colTop + 8);
      vertex(cx2 + colW - 1, colBase - 5);
      endShape(CLOSE);
      fill(190, 184, 174, 140);
      rect(cx2 - colW, colTop + 4, colW * 2, 4, 1);
    }
  }

  // ─── TIER 1 LINTEL ───
  if (tier === 1) {
    fill(74, 56, 40);
    rect(-32, colTop, 64, 8);
    fill(84, 66, 50);
    rect(-30, colTop + 1, 60, 3);
    // Altar block between columns
    fill(61, 43, 31);
    rect(-6, cellaTop - 10, 12, 10);
    fill(74, 56, 40);
    rect(-5, cellaTop - 9, 10, 3);
  }

  // ─── ENTABLATURE (Tier 2+) ───
  let entW, entY, pedY, pedW, pedH;
  if (tier >= 2) {
    entW = colSpacing * (colCount - 1) + colW * 2 + 12;
    entY = colTop + 2;
    // Architrave
    fill(190, 184, 174);
    rect(-entW / 2, entY - 2, entW, 2);
    fill(185, 178, 168);
    rect(-entW / 2, entY - 5, entW, 3);
    if (tier >= 3) {
      fill(180, 174, 164);
      rect(-entW / 2, entY - 7, entW, 2);
      // Frieze with triglyphs
      fill(175, 168, 158);
      rect(-entW / 2 - 2, entY - 13, entW + 4, 6);
      fill(160, 154, 144);
      for (let t = 0; t < colCount; t++) {
        let tx = colStartX + t * colSpacing;
        rect(tx - 3, entY - 12, 6, 5);
        stroke(150, 144, 134);
        strokeWeight(0.6);
        line(tx - 1, entY - 12, tx - 1, entY - 7);
        line(tx + 1, entY - 12, tx + 1, entY - 7);
        noStroke();
      }
      // Cornice
      fill(195, 188, 178);
      rect(-entW / 2 - 4, entY - 16, entW + 8, 3, 1);
      fill(185, 178, 168);
      for (let d = -entW / 2 - 2; d < entW / 2 + 2; d += 5) {
        rect(d, entY - 15, 3, 2);
      }
      // Gold cornice strip (Tier 4+)
      if (tier >= 4) {
        fill(212, 170, 64, 140);
        rect(-entW / 2 - 4, entY - 16, entW + 8, 2);
      }
    }

    // ─── PEDIMENT ───
    pedY = tier >= 3 ? entY - 16 : entY - 5;
    pedW = (tier >= 3 ? entW : entW * 0.9) / 2 + 5;
    pedH = tier === 2 ? 8 : (tier === 3 ? 18 : (tier === 4 ? 26 : 28));

    fill(190, 184, 174);
    triangle(-pedW, pedY, pedW, pedY, 0, pedY - pedH);
    // Raking cornice
    stroke(tier >= 4 ? color(212, 170, 64, 180) : color(200, 194, 184));
    strokeWeight(1.5);
    line(-pedW, pedY, 0, pedY - pedH);
    line(pedW, pedY, 0, pedY - pedH);
    line(-pedW, pedY, pedW, pedY);
    noStroke();
    // Tympanum
    fill(170, 164, 154);
    triangle(-pedW + 5, pedY, pedW - 5, pedY, 0, pedY - pedH + 4);

    // Tympanum sculpture (Tier 3+: Sol Invictus)
    if (tier >= 3) {
      let tympCY = pedY - pedH * 0.35;
      stroke(200, 180, 60, 60 + sin(pyr.chargePhase) * 25);
      strokeWeight(1.2);
      noFill();
      circle(0, tympCY, 14);
      for (let r = 0; r < 8; r++) {
        let ra = r * PI / 4 + pyr.chargePhase * 0.1;
        line(cos(ra) * 8, tympCY + sin(ra) * 8, cos(ra) * 12, tympCY + sin(ra) * 12);
      }
      noStroke();
      fill(210, 190, 70, 80 + sin(pyr.chargePhase) * 30);
      circle(0, tympCY, 6);
    }

    // Acroteria
    let acroH = tier >= 4 ? 14 : (tier >= 3 ? 10 : 6);
    let acroW = tier >= 4 ? 10 : (tier >= 3 ? 7 : 5);
    let acroCol = tier >= 4 ? color(220, 195, 60) : color(195, 188, 178);
    fill(acroCol);
    ellipse(0, pedY - pedH - 2, acroW, acroH);
    if (tier >= 3) {
      fill(210, 190, 70, 120);
      ellipse(0, pedY - pedH - 3, acroW * 0.5, acroH * 0.6);
    }
    fill(acroCol);
    ellipse(-pedW + 2, pedY - 3, acroW - 1, acroH - 2);
    ellipse(pedW - 2, pedY - 3, acroW - 1, acroH - 2);
  } else {
    // Tier 1 has no pediment — set variables for flame positioning
    entW = 64; entY = colTop + 8; pedY = colTop; pedW = 32; pedH = 0;
  }

  // ─── SACRED FLAME ───
  if (tier === 1) {
    // Small votive flame on altar
    let altarFlameY = cellaTop - 12;
    let fFlicker = sin(frameCount * 0.15) * 1;
    fill(232, 98, 26, 200);
    ellipse(fFlicker * 0.5, altarFlameY - 2, 5, 7);
    fill(255, 180, 60, 160);
    ellipse(fFlicker * 0.3, altarFlameY - 4, 3, 4);
    // Night glow for votive
    let tBright = getSkyBrightness();
    if (tBright < 0.5) {
      let ng = map(tBright, 0, 0.5, 1, 0);
      fill(255, 160, 60, 20 * ng);
      circle(0, altarFlameY, 80);
    }
  } else if (tier <= 3) {
    // Sacred flame at apex
    let flameY = pedY - pedH - 8;
    let capPulse = sin(pyr.chargePhase * 1.5) * 0.3 + 0.7;
    let glowSize = 15 + tier * 8;
    for (let gr = glowSize; gr > 0; gr -= 3) {
      fill(255, 200, 60, 8 * capPulse * (gr / glowSize));
      circle(0, flameY, gr * 2);
    }
    let flameH = 8 + tier * 4;
    for (let f = 0; f < 3; f++) {
      let fw = (3 - f) * 2 + tier;
      let fh = flameH * (1 - f * 0.25);
      let flicker = sin(frameCount * 0.15 + f * 2) * 1.5;
      fill(lerpColor(color(255, 140, 30, 180), color(255, 220, 60, 160), f / 3));
      beginShape();
      vertex(-fw + flicker, flameY + 3);
      quadraticVertex(-fw * 0.6, flameY - fh * 0.4, flicker * 0.5, flameY - fh);
      quadraticVertex(fw * 0.6, flameY - fh * 0.4, fw + flicker, flameY + 3);
      endShape(CLOSE);
    }
  }

  // ─── TIER 4+: ETERNAL ROOF FLAME ───
  if (tier >= 4) {
    let flameBaseY = pedY - pedH - 8;
    let flameH = 18 + sin(frameCount * 0.08) * 5;
    let flameW = 12;
    // Flame layer 1 — outer orange
    fill(255, 107, 0, 200);
    noStroke();
    beginShape();
    vertex(-flameW / 2, flameBaseY);
    vertex(-flameW / 4, flameBaseY - flameH * 0.6);
    vertex(0, flameBaseY - flameH);
    vertex(flameW / 4, flameBaseY - flameH * 0.6);
    vertex(flameW / 2, flameBaseY);
    endShape(CLOSE);
    // Flame layer 2 — inner gold
    fill(255, 215, 0, 220);
    beginShape();
    vertex(-flameW / 3, flameBaseY);
    vertex(-flameW / 6, flameBaseY - flameH * 0.5);
    vertex(0, flameBaseY - flameH * 0.8);
    vertex(flameW / 6, flameBaseY - flameH * 0.5);
    vertex(flameW / 3, flameBaseY);
    endShape(CLOSE);
    // Flame layer 3 — white core
    fill(255, 240, 200, 180);
    beginShape();
    vertex(-2, flameBaseY);
    vertex(0, flameBaseY - flameH * 0.5);
    vertex(2, flameBaseY);
    endShape(CLOSE);
    // Golden spark particles
    if (frameCount % 3 === 0) {
      particles.push({
        x: pyr.x + random(-4, 4),
        y: pyr.y - (cellaTop - colH + pedH + 8 + flameH),
        vx: random(-0.3, 0.3), vy: random(-2, -0.8),
        life: random(25, 45), maxLife: 45,
        type: 'burst', size: random(1.5, 3),
        r: 255, g: 200 + floor(random(-20, 20)), b: 40,
        gravity: -0.02, world: true,
      });
    }
  }

  // ─── FLANKING STATUES (Tier 3+) ───
  if (tier >= 3) {
    let statH = tier >= 4 ? 36 : 22;
    let pedH2 = tier >= 4 ? 14 : 10;
    let statCol = tier >= 4 ? color(240, 234, 224) : color(205, 200, 190);
    for (let side = -1; side <= 1; side += 2) {
      let statX = side * (baseW / 2 + 16);
      // Pedestal
      fill(175, 168, 158);
      rect(statX - 7, 6, 14, 4, 1);
      fill(180, 174, 164);
      rect(statX - 6, 6 - pedH2, 12, pedH2, 1);
      fill(190, 184, 174);
      rect(statX - 7, 6 - pedH2 - 2, 14, 2, 1);
      // Figure
      fill(statCol);
      let figBase = 6 - pedH2 - 2;
      rect(statX - 4, figBase - statH, 8, statH, 1);
      // Toga drape
      fill(red(statCol) - 10, green(statCol) - 10, blue(statCol) - 10);
      rect(statX - 2 * side, figBase - statH + 4, 4, statH - 6);
      // Head
      fill(statCol);
      circle(statX, figBase - statH - 4, tier >= 4 ? 9 : 7);
      // Arm + attribute
      fill(red(statCol) - 5, green(statCol) - 5, blue(statCol) - 5);
      rect(statX + 3 * side, figBase - statH + 2, 2, statH * 0.5, 1);
      if (side === -1) {
        // Jupiter thunderbolt / spear
        fill(170, 140, 58);
        rect(statX + 4 * side, figBase - statH - 8, 1, statH * 0.7);
      } else {
        // Minerva fasces / owl spear
        fill(170, 140, 58);
        rect(statX + 4 * side, figBase - statH - 6, 1, statH * 0.6);
      }
      // Crystal growth on statue bases (Tier 5, lv25)
      if (tier === 5 && lvl >= 25) {
        fill(94, 236, 208, 180);
        beginShape();
        vertex(statX - 5, figBase);
        vertex(statX - 3, figBase - 14);
        vertex(statX - 1, figBase);
        endShape(CLOSE);
        fill(80, 240, 200, 140);
        beginShape();
        vertex(statX + 2, figBase);
        vertex(statX + 4, figBase - 10);
        vertex(statX + 6, figBase);
        endShape(CLOSE);
      }
    }
  }

  // ─── TIER 2: BRAZIERS ───
  if (tier === 2) {
    for (let side = -1; side <= 1; side += 2) {
      let bx = side * (baseW / 2 + 6);
      fill(140, 100, 50);
      rect(bx - 2, cellaTop - 6, 4, 8);
      rect(bx - 3, cellaTop - 7, 6, 2);
      let fFlicker = sin(frameCount * 0.12 + side) * 1;
      fill(255, 140, 32, 180);
      ellipse(bx + fFlicker, cellaTop - 9, 6, 8);
      fill(255, 220, 80, 120);
      ellipse(bx + fFlicker, cellaTop - 11, 3, 5);
    }
  }

  // ─── TIER 3+: TORCH BRACKETS ON COLUMNS ───
  if (tier >= 3) {
    let torchCols = [0, colCount - 1];
    if (tier >= 4) torchCols = [0, 2, colCount - 3, colCount - 1];
    for (let ci = 0; ci < torchCols.length; ci++) {
      let cx2 = colStartX + torchCols[ci] * colSpacing;
      fill(100, 80, 50);
      rect(cx2 + 3, colBase - colH * 0.55, 5, 2);
      let fFlicker = sin(frameCount * 0.12 + ci) * 1;
      fill(255, 160, 40, 180);
      ellipse(cx2 + 6 + fFlicker, colBase - colH * 0.55 - 3, 5, 7);
      fill(255, 220, 80, 120);
      ellipse(cx2 + 6 + fFlicker, colBase - colH * 0.55 - 5, 3, 4);
    }
  }

  // ─── TIER 5: CRYSTAL FORMATIONS ───
  if (tier === 5) {
    let crystalH = min((lvl - 19) * 6, 24);
    let crystalBaseY = pedY - pedH - 8;
    let crystalTopY = crystalBaseY - crystalH;
    // Crystal hexagonal prism
    stroke(180, 220, 255);
    strokeWeight(1);
    fill(160, 200, 255, 180);
    beginShape();
    for (let i = 0; i < 6; i++) {
      let a = i * TWO_PI / 6 - HALF_PI;
      let r = crystalH * 0.25;
      vertex(cos(a) * r, crystalBaseY - crystalH / 2 + sin(a) * r * 0.4);
    }
    endShape(CLOSE);
    // Crystal taper top
    fill(180, 220, 255, 200);
    beginShape();
    vertex(-crystalH * 0.2, crystalBaseY - crystalH * 0.3);
    vertex(0, crystalTopY);
    vertex(crystalH * 0.2, crystalBaseY - crystalH * 0.3);
    endShape(CLOSE);
    noStroke();
    // Teal glow around crystal
    for (let gr = 30; gr > 0; gr -= 5) {
      fill(80, 240, 200, 4 * (gr / 30));
      circle(0, crystalBaseY - crystalH * 0.5, gr * 2);
    }
    let apexY = crystalTopY;

    // Secondary crystal clusters on stylobate corners (lv22+)
    if (lvl >= 22) {
      for (let side = -1; side <= 1; side += 2) {
        let cx = side * (baseW / 2 + 4);
        let shardH = 8 + (lvl - 22) * 3;
        fill(80, 220, 190, 180);
        beginShape();
        vertex(cx - 3, 8);
        vertex(cx - 1, 8 - shardH);
        vertex(cx + 1, 8 - shardH + 2);
        vertex(cx + 3, 8);
        endShape(CLOSE);
        fill(94, 236, 208, 140);
        beginShape();
        vertex(cx + 2, 8);
        vertex(cx + 3, 8 - shardH * 0.7);
        vertex(cx + 5, 8);
        endShape(CLOSE);
      }
    }

    // Large flanking crystal clusters (lv25)
    if (lvl >= 25) {
      for (let side = -1; side <= 1; side += 2) {
        let cx = side * (baseW / 2 - 8);
        fill(80, 236, 208, 190);
        beginShape();
        vertex(cx - 6, cellaTop);
        vertex(cx - 2, cellaTop - 40);
        vertex(cx + 2, cellaTop - 38);
        vertex(cx + 6, cellaTop);
        endShape(CLOSE);
        fill(200, 255, 240, 100);
        beginShape();
        vertex(cx - 2, cellaTop - 4);
        vertex(cx, cellaTop - 36);
        vertex(cx + 2, cellaTop - 4);
        endShape(CLOSE);
      }
    }

    // ─── TIER 5: GOLDEN LIGHT BEAM (level 22+, night only) ───
    if (lvl >= 22) {
      let bright = getSkyBrightness();
      if (bright < 0.3) {
        let beamPulse = 0.85 + 0.15 * sin(frameCount * 0.04);
        // Render pass 1: soft wide halo
        stroke(255, 217, 122, floor(12 * beamPulse));
        strokeWeight(20);
        line(0, apexY, 0, apexY - 400);
        // Render pass 2: medium beam
        stroke(255, 217, 122, floor(30 * beamPulse));
        strokeWeight(6);
        line(0, apexY, 0, apexY - 400);
        // Render pass 3: bright core
        stroke(255, 240, 180, floor(80 * beamPulse));
        strokeWeight(1.5);
        line(0, apexY, 0, apexY - 300);
        noStroke();
      }
    }

    // ─── TIER 5: CRYSTAL RING ORBIT (level 23+) ───
    if (lvl >= 23) {
      for (let r = 0; r < 12; r++) {
        let angle = r * TWO_PI / 12 + frameCount * 0.01;
        let rx = 40, ry = 14;
        let shardX = cos(angle) * rx;
        let shardY = apexY + sin(angle) * ry;
        let shardAlpha = 160 + sin(frameCount * 0.05 + r * 0.5) * 60;
        push();
        translate(shardX, shardY);
        rotate(angle + HALF_PI);
        fill(160, 200, 255, shardAlpha);
        noStroke();
        rect(-1, -4, 2, 8, 1);
        pop();
      }
    }

    // Ground glow plaza (lv24+)
    if (lvl >= 24) {
      let gpulse = sin(frameCount * 0.03) * 0.15 + 0.85;
      for (let i = 0; i < 4; i++) {
        fill(0, 200, 160, 6 * gpulse * (1 - i * 0.2));
        ellipse(0, 8, 280 - i * 20, 60 - i * 4);
      }
    }
  }

  // ─── NIGHT GLOW (all tiers) ───
  let tBrightN = getSkyBrightness();
  if (tBrightN < 0.5) {
    let nightGlow = map(tBrightN, 0, 0.5, 1, 0);
    let glowPulse = sin(pyr.chargePhase * 0.5) * 0.15 + 0.85;
    // Warm aura
    let glowR = tier === 1 ? 40 : (tier === 2 ? 60 : (tier === 3 ? 90 : (tier === 4 ? 130 : 200)));
    fill(255, 200, 80, 8 * nightGlow * glowPulse);
    ellipse(0, cellaTop - cellaH * 0.3, glowR * 2, glowR * 0.8);
    // Doorway light spill (Tier 2+)
    if (tier >= 2) {
      fill(255, 190, 70, 35 * nightGlow * glowPulse);
      rect(-8, cellaTop - cellaH * 0.5, 16, cellaH * 0.5);
    }
    // Column front highlighting
    if (tier >= 2) {
      fill(255, 210, 100, 10 * nightGlow);
      for (let c = 0; c < colCount; c++) {
        let cx2 = colStartX + c * colSpacing;
        rect(cx2 - colW, colBase - colH * 0.5, colW * 2, colH * 0.4);
      }
    }
    // Gold shimmer on metalwork (Tier 4+)
    if (tier >= 4) {
      let shimPulse = sin(frameCount * 0.04) * 0.2 + 0.8;
      fill(255, 220, 80, 12 * nightGlow * shimPulse);
      // Acroteria glow
      if (pedY !== undefined) {
        circle(0, pedY - pedH - 2, 16);
      }
    }
  }

  // ─── INTERACTION PROMPT ───
  let playerDist = dist2(state.player.x, state.player.y, pyr.x, pyr.y);
  if (playerDist < 70 && !state.buildMode) {
    let promptY2 = tier === 1 ? (colTop - 15) : (pedY - pedH - 25);
    fill(color(C.hudBg));
    stroke(color(C.hudBorder));
    strokeWeight(1);
    rect(-50, promptY2 - 2, 100, 16, 3);
    noStroke();
    fill(color(C.crystalGlow));
    textAlign(CENTER, CENTER);
    textSize(11);
    if (state.islandLevel < 25) {
      text('[X] Expand (' + getExpandCostString() + ')', 0, promptY2 + 6);
    } else {
      fill(color(C.solarBright));
      text('IMPERIUM MAXIMUM', 0, promptY2 + 6);
    }
  }

  // Level indicator
  fill(color(C.solarBright));
  textAlign(CENTER, CENTER);
  textSize(10);
  text('LV.' + lvl, 0, 22);

  pop();
}

// ─── RUINS ────────────────────────────────────────────────────────────────
function drawRuins() {
  state.ruins.forEach(r => {
    let sx = w2sX(r.x);
    let sy = w2sY(r.y);
    push();
    translate(sx, sy);
    rotate(r.rot);
    noStroke();

    // Ground shadow — pixel
    fill(0, 0, 0, 25);
    rect(-r.w * 0.65, 2, r.w * 1.3, r.h * 0.2);

    // Stone platform / base
    fill(160, 150, 135);
    rect(-r.w * 0.5, -2, r.w, 6, 1);
    fill(140, 132, 118);
    rect(-r.w * 0.48, -1, r.w * 0.96, 4, 1);

    // Marble columns (2-3 standing, 1 broken)
    let colW = 5, colSpacing = r.w / 3.5;
    let columns = [
      { x: -colSpacing, h: r.h * 0.9, broken: false },
      { x: 0, h: r.h * 0.5, broken: true },
      { x: colSpacing, h: r.h * 1.0, broken: false },
    ];

    columns.forEach(col => {
      // Column shaft — marble white/cream
      fill(195, 188, 175);
      rect(col.x - colW / 2, -col.h - 2, colW, col.h, 1);
      // Fluting (vertical grooves)
      fill(175, 168, 155, 100);
      rect(col.x - 1.5, -col.h, 1, col.h);
      rect(col.x + 1, -col.h, 1, col.h);
      // Base (wider)
      fill(180, 172, 158);
      rect(col.x - colW / 2 - 1.5, -3, colW + 3, 4, 1);
      // Capital (ornate top)
      if (!col.broken) {
        fill(190, 182, 168);
        rect(col.x - colW / 2 - 2, -col.h - 5, colW + 4, 4, 1);
        // Scroll detail on capital — pixel
        fill(170, 162, 148);
        rect(col.x - colW / 2 - 2, -col.h - 4, 3, 3);
        rect(col.x + colW / 2, -col.h - 4, 3, 3);
      } else {
        // Broken top — jagged
        fill(175, 168, 155);
        triangle(col.x - 2, -col.h - 2, col.x, -col.h - 5, col.x + 3, -col.h - 2);
      }
      // Cracks / weathering
      stroke(140, 130, 115, 60);
      strokeWeight(0.5);
      line(col.x - 1, -col.h * 0.3, col.x + 1, -col.h * 0.6);
      noStroke();
    });

    // Lintel / entablature across standing columns (if wide enough)
    if (r.w > 28) {
      let lh = columns[0].h;
      let rh = columns[2].h;
      let lintelY = -min(lh, rh) - 5;
      fill(185, 178, 165);
      // Architrave
      rect(-colSpacing - 3, lintelY, colSpacing * 2 + 6, 3, 1);
      // Frieze with simple pattern
      fill(170, 162, 148);
      rect(-colSpacing - 2, lintelY - 3, colSpacing * 2 + 4, 3);
      // Triglyph marks
      fill(155, 148, 135);
      for (let t = -1; t <= 1; t++) {
        rect(t * colSpacing - 2, lintelY - 3, 4, 3);
        stroke(140, 130, 115, 80);
        strokeWeight(0.4);
        line(t * colSpacing - 1, lintelY - 3, t * colSpacing - 1, lintelY);
        line(t * colSpacing + 1, lintelY - 3, t * colSpacing + 1, lintelY);
        noStroke();
      }
    }

    // Fallen column piece on ground
    fill(180, 172, 158, 180);
    push();
    rotate(0.3);
    rect(r.w * 0.15, -1, 12, 4, 2);
    // Fluting on fallen piece
    fill(160, 152, 138, 100);
    rect(r.w * 0.17, 0, 8, 1);
    pop();

    // Vine overgrowth on columns
    stroke(35, 85, 22, 130);
    strokeWeight(1);
    line(-colSpacing, -columns[0].h * 0.7, -colSpacing + 4, -columns[0].h * 0.4);
    line(colSpacing, -columns[2].h * 0.5, colSpacing - 3, -columns[2].h * 0.2);
    noStroke();
    // Tiny leaves on vines — pixel
    fill(45, 115, 28, 150);
    rect(-colSpacing + 1, -columns[0].h * 0.55 - 1, 3, 2);
    rect(colSpacing - 2, -columns[2].h * 0.35 - 1, 3, 2);

    // Scattered rubble — pixel
    fill(155, 148, 135, 140);
    rect(-r.w * 0.35 - 1, 2, 3, 2);
    rect(r.w * 0.4 - 1, 1, 3, 2);
    rect(r.w * 0.05 - 2, 4, 4, 2);

    // Headless marble statue torso (Roman senator)
    fill(200, 195, 185);
    rect(r.w * 0.3, -12, 6, 10, 1); // torso
    fill(190, 185, 175);
    rect(r.w * 0.3 - 1, -8, 8, 3); // shoulders
    rect(r.w * 0.3 + 1, -2, 4, 3, 1); // base
    fill(210, 205, 195);
    rect(r.w * 0.3 + 2, -11, 2, 4); // toga drape
    // Broken neck
    fill(170, 165, 155);
    rect(r.w * 0.3 + 1, -13, 4, 2);

    // Terracotta amphora with handles
    fill(180, 120, 60);
    rect(-r.w * 0.4, -8, 5, 8, 1); // body
    fill(160, 100, 45);
    rect(-r.w * 0.4 - 1, -9, 7, 2, 1); // rim
    rect(-r.w * 0.4 + 1, -1, 3, 2); // base
    // Handles
    stroke(170, 110, 50); strokeWeight(1);
    noFill();
    arc(-r.w * 0.4 - 1, -5, 4, 6, HALF_PI, PI + HALF_PI);
    arc(-r.w * 0.4 + 5, -5, 4, 6, -HALF_PI, HALF_PI);
    noStroke();
    // Painted band
    fill(140, 40, 30, 120);
    rect(-r.w * 0.4, -5, 5, 2);

    // Mosaic fragment (only on wider ruins)
    if (r.w > 28) {
      fill(50, 45, 38); rect(-8, 3, 12, 8, 1); // dark grout base
      // Colored tesserae
      let mColors = [[180,40,30],[40,80,150],[200,180,60],[240,235,220]];
      for (let my = 0; my < 3; my++) {
        for (let mx = 0; mx < 4; mx++) {
          let mc = mColors[(mx + my) % 4];
          fill(mc[0], mc[1], mc[2], 180);
          rect(-7 + mx * 3, 4 + my * 2, 2, 1.5);
        }
      }
    }

    // Subtle golden glow (ancient energy)
    let runeAlpha = 15 + sin(frameCount * 0.03 + r.rot * 20) * 10;
    fill(200, 170, 80, runeAlpha);
    circle(0, -columns[1].h * 0.5, 6);

    pop();
  });
}

function drawCitySmoke() {
  if (state.islandLevel < 6 || _fpsSmooth < 25) return;
  let bright = getSkyBrightness();
  let smokeAlpha = map(bright, 0.0, 0.5, 80, 25);

  state.buildings.forEach(b => {
    if (b.type !== 'house' && b.type !== 'villa') return;
    let sx = w2sX(b.x), sy = w2sY(b.y);
    if (sx < -60 || sx > width + 60 || sy < -60 || sy > height + 60) return;
    let chimneyX = floor(sx - b.w * 0.15);
    let chimneyY = floor(sy - b.h * 0.8);
    let windDrift = sin(frameCount * 0.005) * 0.8;

    for (let i = 0; i < 3; i++) {
      let phase = frameCount * 0.015 + i * 2.1 + b.x * 0.01;
      for (let p = 0; p < 4; p++) {
        let pFrac = p / 3;
        let px = chimneyX + floor(sin(phase + p * 0.7) * (2 + p * 1.5)) + floor(pFrac * pFrac * windDrift * 8);
        let py = chimneyY - floor(p * 6 + (frameCount * 0.7 + i * 30) % 24);
        let size = 1 + floor(pFrac * 1.5);
        let a = smokeAlpha * (1 - pFrac * 0.7);
        fill(195, 190, 182, a);
        noStroke();
        rect(px, py, size, size);
      }
    }
  });
}

function drawLaundryLines() {
  if (state.islandLevel < 6) return;
  let rx = getSurfaceRX(), ry = getSurfaceRY();
  let cx = WORLD.islandCX, cy = WORLD.islandCY;

  let lines = [
    { x1: cx - rx*0.22, x2: cx - rx*0.12, y: cy - ry*0.22, colors: [[190,50,50],[60,60,140],[140,120,50]] },
    { x1: cx - rx*0.32, x2: cx - rx*0.20, y: cy - ry*0.35, colors: [[100,110,160],[190,120,50],[60,150,120]] },
  ];

  lines.forEach((ln, li) => {
    let sx1 = w2sX(ln.x1), sx2 = w2sX(ln.x2), sy = w2sY(ln.y);
    let sway = sin(frameCount * 0.015 + li * 1.7) * 1.5;

    stroke(80, 70, 60, 130);
    strokeWeight(0.8);
    line(sx1, sy + sway * 0.3, sx2, sy + sway * 0.5);
    noStroke();

    ln.colors.forEach((c, ci) => {
      let t = (ci + 1) / (ln.colors.length + 1);
      let lx = lerp(sx1, sx2, t);
      let ly = sy + sway * t;
      fill(c[0], c[1], c[2], 200);
      rect(floor(lx) - 2, floor(ly), 4, 6);
      fill(min(255, c[0]+30), min(255, c[1]+30), min(255, c[2]+30), 80);
      rect(floor(lx) - 2, floor(ly), 4, 2);
    });
  });
}

function drawGranaryArea() {
  if (state.islandLevel < 5) return;
  // Find granary buildings from CITY_SLOTS
  let granaries = state.buildings.filter(b => b.type === 'granary');
  granaries.forEach(g => {
    let gsx = w2sX(g.x);
    let gsy = w2sY(g.y);
    if (gsx < -60 || gsx > width + 60 || gsy < -60 || gsy > height + 60) return;
    // 2 grain carts parked near granary
    let cartOffsets = [{ dx: -g.w * 0.6, dy: g.h * 0.6 }, { dx: g.w * 0.5, dy: g.h * 0.55 }];
    cartOffsets.forEach((co, ci) => {
      let cx3 = floor(gsx + co.dx);
      let cy3 = floor(gsy + co.dy);
      push();
      translate(cx3, cy3);
      noStroke();
      // Cart body — rough wood planks
      fill(95, 68, 32);
      rect(-9, -4, 18, 7, 1);
      // Plank lines
      stroke(78, 55, 25, 100);
      strokeWeight(0.5);
      line(-7, -4, -7, 3);
      line(-1, -4, -1, 3);
      line(5, -4, 5, 3);
      noStroke();
      // Grain sacks — lumpy beige
      fill(192, 172, 128);
      ellipse(-3, -6, 7, 5);
      ellipse(3, -7, 6, 5);
      ellipse(0, -8, 5, 4);
      fill(178, 158, 115);
      ellipse(-3, -5, 6, 3);
      ellipse(3, -6, 5, 3);
      // Wheels — 2 dark circles with spokes
      fill(55, 40, 20);
      circle(-7, 3, 7);
      circle(7, 3, 7);
      fill(75, 55, 28);
      circle(-7, 3, 4);
      circle(7, 3, 4);
      stroke(55, 40, 20, 180);
      strokeWeight(0.6);
      for (let sp4 = 0; sp4 < 4; sp4++) {
        let sang2 = sp4 * HALF_PI + frameCount * 0 + ci * 0.5; // static
        line(-7 + cos(sang2) * 1, 3 + sin(sang2) * 1, -7 + cos(sang2) * 3.5, 3 + sin(sang2) * 3.5);
        line(7 + cos(sang2) * 1, 3 + sin(sang2) * 1, 7 + cos(sang2) * 3.5, 3 + sin(sang2) * 3.5);
      }
      noStroke();
      pop();
    });
  });
}

function drawAmphoraStacks() {
  if (state.islandLevel < 10) return;
  let markets = state.buildings.filter(b => b.type === 'market');
  markets.forEach(m => {
    let msx = w2sX(m.x);
    let msy = w2sY(m.y);
    if (msx < -60 || msx > width + 60 || msy < -60 || msy > height + 60) return;
    // Stack of amphoras left of market
    push();
    translate(floor(msx - m.w * 0.7), floor(msy + m.h * 0.3));
    noStroke();
    // Bottom row — 3 amphoras
    for (let ai = 0; ai < 3; ai++) {
      let ax = (ai - 1) * 7;
      let aColor = ai % 2 === 0 ? [175, 95, 48] : [162, 82, 38];
      fill(aColor[0], aColor[1], aColor[2]);
      // Body — tapered oval
      ellipse(ax, 0, 5, 8);
      // Neck
      rect(ax - 1, -5, 2, 3);
      // Rim
      rect(ax - 1.5, -7, 3, 2, 1);
      // Toe (pointy bottom)
      fill(aColor[0] - 20, aColor[1] - 20, aColor[2] - 10);
      ellipse(ax, 3, 3, 4);
      // Handle lines
      stroke(aColor[0] - 30, aColor[1] - 25, aColor[2] - 15, 150);
      strokeWeight(0.7);
      line(ax - 2, -3, ax - 3, 0);
      line(ax + 2, -3, ax + 3, 0);
      noStroke();
    }
    // Top row — 2 amphoras slightly offset
    for (let ai = 0; ai < 2; ai++) {
      let ax = (ai - 0.5) * 7;
      fill(168, 88, 42);
      ellipse(ax, -8, 5, 8);
      rect(ax - 1, -13, 2, 3);
      rect(ax - 1.5, -15, 3, 2, 1);
    }
    pop();
  });
}

function drawTempleIncense() {
  if (state.islandLevel < 10) return;
  let temples = state.buildings.filter(b => b.type === 'temple');
  temples.forEach(t => {
    let tsx = w2sX(t.x);
    let tsy = w2sY(t.y);
    if (tsx < -40 || tsx > width + 40 || tsy < -60 || tsy > height + 60) return;
    // Incense rises from temple door — slow, wispy, purple-tinted
    let incAlpha = map(getSkyBrightness(), 0.0, 0.7, 55, 15);
    for (let ii = 0; ii < 2; ii++) {
      let iPhase = frameCount * 0.008 + ii * 1.8 + t.x * 0.005;
      for (let ip = 0; ip < 6; ip++) {
        let iFrac = ip / 5;
        let ix = tsx + floor(sin(iPhase + ip * 0.5) * (1 + ip * 0.8)) + (ii - 0.5) * 4;
        let iy = tsy - floor(t.h * 0.3) - floor(ip * 9 + (frameCount * 0.3 + ii * 18) % 54);
        let iSize = 1 + floor(iFrac * 1.5);
        let ia = incAlpha * (1 - iFrac * 0.85);
        // Purple-grey tint — distinct from house smoke (grey-white) and castrum smoke (dark grey)
        fill(165, 148, 175, ia);
        noStroke();
        rect(ix, iy, iSize, iSize);
      }
    }
  });
}

function drawStreetWear() {
  if (state.islandLevel < 8) return;
  let bright = getSkyBrightness();
  if (bright < 0.15) return;  // invisible at deep night
  let cx4 = WORLD.islandCX;
  let cy4 = WORLD.islandCY;
  // The Decumanus runs east-west through city center
  // Draw subtle darkened ellipses where foot traffic wears the ground
  let wearPoints = [
    { wx: cx4 - 80, wy: cy4 + 30 },
    { wx: cx4, wy: cy4 + 30 },
    { wx: cx4 + 80, wy: cy4 + 30 },
    { wx: cx4 + 140, wy: cy4 + 40 },
    { wx: cx4 - 140, wy: cy4 + 40 },
    // Forum approach
    { wx: cx4, wy: cy4 + 60 },
    { wx: cx4, wy: cy4 + 10 },
  ];
  noStroke();
  wearPoints.forEach(wp => {
    let wsx = w2sX(wp.wx);
    let wsy = w2sY(wp.wy);
    fill(80, 68, 45, 18);
    ellipse(wsx, wsy, 28, 12);
    fill(70, 58, 38, 10);
    ellipse(wsx, wsy, 44, 18);
  });
}

// ─── FACTION SELECT SCREEN ─────────────────────────────────────────────────
function drawFactionSelect(dt) {
  factionSelectFade = min(factionSelectFade + dt * 4, 255);
  let a = factionSelectFade / 255;
  background(10, 18, 35);
  noStroke();
  for (let i = 0; i < 8; i++) {
    let wy = height * 0.5 + i * 20 + sin(frameCount * 0.02 + i) * 3;
    fill(15, 30, 55, 30 * a);
    rect(0, wy, width, 10);
  }
  drawingContext.globalAlpha = a;
  textAlign(CENTER, TOP);
  textSize(18); fill(220, 195, 120);
  text('CHOOSE YOUR ALLEGIANCE', width / 2, height * 0.08);
  textSize(9); fill(160, 150, 130);
  text('This choice shapes your destiny across the Mediterranean', width / 2, height * 0.08 + 26);
  let fKeys = ['rome', 'carthage', 'egypt', 'greece', 'seapeople', 'persia', 'phoenicia', 'gaul'];
  let cardW = min(140, width * 0.2), cardH = 220, gap = 10;
  let totalW = cardW * 4 + gap * 3;
  let startX = (width - totalW) / 2;
  let row1Y = height * 0.12, row2Y = row1Y + cardH + gap;
  factionSelectHover = null;
  for (let fi = 0; fi < 8; fi++) {
    let row = fi < 4 ? 0 : 1;
    let col = fi % 4;
    let cx = startX + col * (cardW + gap);
    let cy = row === 0 ? row1Y : row2Y;
    if (mouseX >= cx && mouseX <= cx + cardW && mouseY >= cy && mouseY <= cy + cardH) {
      factionSelectHover = fKeys[fi];
    }
  }
  for (let fi = 0; fi < 8; fi++) {
    let row = fi < 4 ? 0 : 1;
    let col = fi % 4;
    let cx = startX + col * (cardW + gap);
    let cy = row === 0 ? row1Y : row2Y;
    _drawFactionCard(cx, cy, cardW, cardH, FACTIONS[fKeys[fi]], factionSelectHover === fKeys[fi], a);
  }
  textAlign(CENTER, TOP); textSize(10);
  fill(130, 120, 100, 200 * a);
  text('R: Rome  C: Carthage  E: Egypt  G: Greece  S: Sea People  P: Persia  F: Phoenicia  L: Gaul', width / 2, row2Y + cardH + 16);
  // Confirmation overlay
  if (_pendingFaction && FACTIONS[_pendingFaction]) {
    let pf = FACTIONS[_pendingFaction];
    let _isSP = _pendingFaction === 'seapeople';
    let oW = min(_isSP ? 420 : 360, width * 0.7), oH = _isSP ? 130 : 90;
    let oX = (width - oW) / 2, oY = (height - oH) / 2;
    fill(0, 0, 0, 180 * a); rect(0, 0, width, height);
    fill(25, 22, 18, 240 * a); rect(oX, oY, oW, oH, 6);
    stroke(pf.bannerColor[0], pf.bannerColor[1], pf.bannerColor[2], 200 * a);
    strokeWeight(2); noFill(); rect(oX, oY, oW, oH, 6); noStroke();
    textAlign(CENTER, CENTER); textSize(14);
    fill(220, 200, 140, 240 * a);
    text('You chose ' + pf.name, width / 2, oY + 24);
    if (_isSP) {
      textSize(10); fill(255, 100, 60, 230 * a);
      text('Warning: Sea People start on a ship with no island.', width / 2, oY + 46);
      text('This is a very different experience. Recommended for experienced players.', width / 2, oY + 60);
    }
    textSize(11); fill(170, 160, 140, 220 * a);
    text('This is permanent! Press ENTER to confirm or ESC to cancel.', width / 2, oY + (_isSP ? 82 : 52));
    textSize(10); fill(140, 130, 110, 180 * a);
    text('ENTER = confirm    ESC = cancel', width / 2, oY + (_isSP ? 100 : 74));
  }
  drawingContext.globalAlpha = 1;
}
function _drawFactionCard(x, y, w, h, fac, hovered, a) {
  let bc = fac.bannerColor;
  push(); noStroke();
  fill(0, 0, 0, 40 * a); rect(x + 2, y + 2, w, h, 4);
  fill(30, 25, 20, (hovered ? 240 : 210) * a); rect(x, y, w, h, 4);
  stroke(bc[0], bc[1], bc[2], (hovered ? 220 : 120) * a);
  strokeWeight(hovered ? 2 : 1); noFill(); rect(x, y, w, h, 4); noStroke();
  if (hovered) { fill(bc[0], bc[1], bc[2], 15 * a); rect(x, y, w, h, 4); }
  let cx = x + w / 2, gy = y + 35;
  if (fac.bannerGlyph === 'eagle') {
    fill(200, 170, 50, 220 * a);
    rect(cx - 3, gy - 5, 6, 10); rect(cx - 14, gy - 8, 10, 4);
    rect(cx + 4, gy - 8, 10, 4); rect(cx - 16, gy - 12, 4, 5); rect(cx + 12, gy - 12, 4, 5);
    fill(220, 190, 60, 220 * a); rect(cx - 2, gy - 9, 4, 4);
    fill(160, 130, 40, 200 * a); rect(cx - 5, gy + 5, 3, 3); rect(cx + 2, gy + 5, 3, 3);
  } else if (fac.bannerGlyph === 'crescent') {
    fill(180, 140, 220, 220 * a); ellipse(cx, gy, 22, 22);
    fill(30, 25, 20, 240 * a); ellipse(cx + 5, gy - 2, 18, 18);
    fill(220, 180, 60, 200 * a); ellipse(cx - 2, gy + 2, 6, 6);
  } else if (fac.bannerGlyph === 'eye') {
    // Eye of Horus
    fill(200, 170, 40, 220 * a);
    beginShape(); vertex(cx - 14, gy); vertex(cx, gy - 8); vertex(cx + 14, gy); vertex(cx, gy + 6); endShape(CLOSE);
    fill(30, 25, 20, 240 * a); ellipse(cx, gy - 1, 10, 10);
    fill(64, 176, 160, 220 * a); ellipse(cx, gy - 1, 6, 6);
    fill(245, 240, 224, 200 * a); ellipse(cx - 1, gy - 2, 2, 2);
    // Horus teardrop
    fill(200, 170, 40, 180 * a);
    beginShape(); vertex(cx, gy + 6); vertex(cx - 2, gy + 14); vertex(cx + 2, gy + 14); endShape(CLOSE);
  } else if (fac.bannerGlyph === 'owl') {
    // Owl of Athena
    fill(220, 220, 230, 220 * a);
    ellipse(cx, gy, 20, 22); // body
    fill(80, 144, 192, 220 * a);
    ellipse(cx - 5, gy - 4, 8, 8); ellipse(cx + 5, gy - 4, 8, 8); // eyes
    fill(30, 30, 40, 240 * a);
    ellipse(cx - 5, gy - 4, 4, 5); ellipse(cx + 5, gy - 4, 4, 5); // pupils
    fill(200, 170, 60, 200 * a);
    beginShape(); vertex(cx - 2, gy); vertex(cx, gy - 3); vertex(cx + 2, gy); endShape(CLOSE); // beak
    // Ear tufts
    fill(220, 220, 230, 180 * a);
    beginShape(); vertex(cx - 8, gy - 8); vertex(cx - 6, gy - 14); vertex(cx - 4, gy - 8); endShape(CLOSE);
    beginShape(); vertex(cx + 4, gy - 8); vertex(cx + 6, gy - 14); vertex(cx + 8, gy - 8); endShape(CLOSE);
  } else if (fac.bannerGlyph === 'trident') {
    // Trident of Poseidon
    fill(42, 138, 106, 220 * a);
    rect(cx - 1, gy - 12, 3, 24); // shaft
    rect(cx - 8, gy - 14, 3, 10); rect(cx + 6, gy - 14, 3, 10); // outer prongs
    rect(cx - 1, gy - 16, 3, 4); // center prong tip
    fill(26, 58, 92, 200 * a);
    rect(cx - 9, gy - 4, 19, 3); // crossbar
  } else if (fac.bannerGlyph === 'wingedlion') {
    // Winged lion of Persia
    fill(212, 160, 48, 220 * a);
    ellipse(cx, gy, 16, 14); // body
    ellipse(cx - 2, gy - 8, 10, 10); // head
    fill(106, 42, 138, 200 * a);
    beginShape(); vertex(cx + 6, gy - 6); vertex(cx + 14, gy - 14); vertex(cx + 10, gy - 2); endShape(CLOSE); // wing R
    beginShape(); vertex(cx - 6, gy - 6); vertex(cx - 14, gy - 14); vertex(cx - 10, gy - 2); endShape(CLOSE); // wing L
    fill(30, 25, 20, 240 * a);
    ellipse(cx - 4, gy - 9, 3, 3); // eye
  } else if (fac.bannerGlyph === 'cedar') {
    // Cedar tree of Phoenicia
    fill(106, 74, 42, 220 * a);
    rect(cx - 2, gy + 2, 4, 12); // trunk
    fill(42, 106, 48, 220 * a);
    beginShape(); vertex(cx, gy - 14); vertex(cx - 12, gy + 2); vertex(cx + 12, gy + 2); endShape(CLOSE); // canopy
    fill(60, 130, 60, 180 * a);
    beginShape(); vertex(cx, gy - 10); vertex(cx - 8, gy - 1); vertex(cx + 8, gy - 1); endShape(CLOSE); // inner layer
  } else if (fac.bannerGlyph === 'boar') {
    // Boar of Gaul
    fill(90, 64, 32, 220 * a);
    ellipse(cx, gy, 22, 16); // body
    fill(70, 50, 25, 220 * a);
    ellipse(cx + 8, gy - 2, 10, 10); // head
    fill(200, 160, 32, 200 * a);
    beginShape(); vertex(cx + 10, gy - 6); vertex(cx + 14, gy - 10); vertex(cx + 12, gy - 4); endShape(CLOSE); // tusk
    fill(30, 25, 20, 240 * a);
    ellipse(cx + 10, gy - 4, 3, 3); // eye
    // Bristle crest
    fill(42, 106, 48, 180 * a);
    for (let bi = -4; bi <= 4; bi += 2) rect(cx + bi, gy - 10, 2, 4);
  }
  // Keyboard shortcut hint
  var _fkMap = {rome:'R',carthage:'C',egypt:'E',greece:'G',seapeople:'S',persia:'P',phoenicia:'F',gaul:'L'};
  var _fkName = '';
  for (var _fk in _fkMap) { if (FACTIONS[_fk] === fac) { _fkName = _fk; break; } }
  if (_fkName) { textAlign(CENTER, TOP); textSize(9); fill(120, 110, 90, 180 * a); text('[' + _fkMap[_fkName] + ']', cx, gy + 8); }
  textAlign(CENTER, TOP); textSize(14);
  fill(bc[0] + 60, bc[1] + 60, bc[2] + 60, 240 * a);
  text(fac.name, cx, gy + 20);
  if (_fkName === 'seapeople') { textSize(9); fill(255, 140, 40, 240 * a); text('(ADVANCED)', cx, gy + 36); }
  if (_fkName === 'rome') { textSize(9); fill(80, 200, 80, 240 * a); text('(RECOMMENDED)', cx, gy + 36); }
  textSize(10); fill(160, 150, 130, 200 * a); text(fac.subtitle, cx, gy + 38);
  textAlign(LEFT, TOP); textSize(11);
  let ly = gy + 58;
  for (let i = 0; i < fac.bonuses.length; i++) {
    fill(180, 170, 140, 220 * a); text('+ ' + fac.bonuses[i], x + 14, ly); ly += 16;
  }
  if (hovered) {
    textAlign(CENTER, TOP); textSize(10);
    fill(bc[0] + 80, bc[1] + 80, bc[2] + 80, (sin(frameCount * 0.08) * 40 + 200) * a);
    text('[ SELECT ]', cx, y + h - 28);
  }
  pop();
}
function selectFaction(faction) {
  if (!FACTIONS[faction]) return;
  state.faction = faction;
  factionSelectActive = false;
  factionSelectFade = 0;
  if (faction === 'carthage') {
    state.gold += 50;
    addFloatingText(width / 2, height * 0.35, 'Merchant\'s pouch: +50 gold', '#ddaa44');
  } else if (faction === 'egypt') {
    addFloatingText(width / 2, height * 0.35, 'Ankh charm: +20% crystal income', '#40b0a0');
  } else if (faction === 'greece') {
    addFloatingText(width / 2, height * 0.35, 'Olive wreath: +20% NPC favor gain', '#5090c0');
  } else if (faction === 'seapeople') {
    addFloatingText(width / 2, height * 0.35, 'Ship start: +30% sail speed, +50% raid loot', '#2a8a6a');
  } else if (faction === 'persia') {
    addFloatingText(width / 2, height * 0.35, 'Royal scepter: +25% colony income', '#d4a030');
  } else if (faction === 'phoenicia') {
    addFloatingText(width / 2, height * 0.35, 'Navigator\'s chart: +30% trade, 2x discovery', '#3070b0');
  } else if (faction === 'gaul') {
    addFloatingText(width / 2, height * 0.35, 'Druid staff: +20% combat, +50% forest yield', '#c8a020');
  }
  addFloatingText(width / 2, height * 0.25, FACTIONS[faction].name + ' — ' + FACTIONS[faction].subtitle, FACTIONS[faction].accentColorHex);
  // Initialize god for this faction
  state.god = { faction: faction, prayerCooldown: 0, ultimateCharge: 0, blessingActive: null, blessingTimer: 0 };
  // Auto-equip faction starter gear
  if (typeof FACTION_STARTER_GEAR !== "undefined" && FACTION_STARTER_GEAR[faction]) {
    var gear = FACTION_STARTER_GEAR[faction];
    for (var slot in gear) { if (gear[slot]) equipItem(gear[slot]); }
  }
  trackMilestone('faction_chosen_' + faction);
  if (snd && snd.playNarration) snd.playNarration(faction + '_intro');
  // Initialize all rival nations (everyone except player's faction)
  initNations();
  // Place first bot island nearby (east of home) -- others stay at default positions for now
  let _nationKeys = Object.keys(state.nations);
  if (_nationKeys.length > 0) {
    state.nations[_nationKeys[0]].isleX = WORLD.islandCX + 1200;
    state.nations[_nationKeys[0]].isleY = WORLD.islandCY;
  }
  // Create pre-built bot islands -- real civilizations from the start
  for (let k of Object.keys(state.nations)) {
    let n = state.nations[k];
    let cx = n.isleX, cy = n.isleY;
    n.islandState = createPrebuiltIsland(k, cx, cy, 12);
    n.isBot = true;
    n.botDifficulty = 'normal';
    n.military = n.islandState.legia.army.length;
    // Create bot AI character
    if (typeof BotAI !== 'undefined') {
      BotAI.create(k, cx, cy);
    }
  }
  // Initialize bot Web Worker
  initBotWorker();
  // Initialize personal rival
  initPersonalRival(faction);
  // ALL factions: skip wreck, spawn directly on home island
  state.progression.triremeRepaired = true;
  state.progression.homeIslandReached = true;
  state.progression.villaCleared = true;
  state.introPhase = 'done';
  state.wreckPhase = 'done';
  state.isInitialized = true;
  state.player.x = WORLD.islandCX;
  state.player.y = WORLD.islandCY;
  cam.x = state.player.x; cam.y = state.player.y;
  camSmooth.x = cam.x; camSmooth.y = cam.y;
  // Build the starting island
  if (!state.buildings || state.buildings.length === 0) {
    if (typeof buildIsland === 'function') buildIsland();
  }
  addFloatingText(width / 2, height * 0.45, 'Welcome to your island!', '#ffcc44');
}

function drawForumBanner() {
  if (state.islandLevel < 15) return;
  let fac = getFactionData();
  let bc = fac.bannerColor;
  let forums = state.buildings.filter(b => b.type === 'forum');
  forums.forEach(f => {
    let fsx = w2sX(f.x);
    let fsy = w2sY(f.y);
    push();
    translate(floor(fsx - f.w * 0.25), floor(fsy - f.h * 0.55));
    noStroke();
    fill(110, 85, 45);
    rect(-1, -22, 2, 22);
    rect(-5, -22, 10, 2);
    let bannerWave = sin(frameCount * 0.035 + f.x * 0.01) * 2.5;
    fill(bc[0], bc[1], bc[2]);
    beginShape();
    vertex(0, -21);
    vertex(10 + bannerWave, -20);
    vertex(10 + bannerWave * 0.6, -15);
    vertex(0, -14);
    endShape(CLOSE);
    if (fac.bannerGlyph === 'eagle') {
      fill(220, 195, 60, 200);
      rect(2, -20, 6, 1); rect(2, -18, 5, 1); rect(2, -16, 6, 1);
    } else if (fac.bannerGlyph === 'crescent') {
      fill(220, 195, 60, 200);
      ellipse(5 + bannerWave * 0.3, -17.5, 5, 5);
      fill(bc[0], bc[1], bc[2]);
      ellipse(6.5 + bannerWave * 0.3, -18, 4, 4);
    } else if (fac.bannerGlyph === 'eye') {
      fill(fac.accentColor[0], fac.accentColor[1], fac.accentColor[2], 200);
      beginShape(); vertex(2, -17.5); vertex(5 + bannerWave * 0.3, -20); vertex(8 + bannerWave * 0.3, -17.5); vertex(5 + bannerWave * 0.3, -15); endShape(CLOSE);
      fill(30, 25, 20, 200); ellipse(5 + bannerWave * 0.3, -17.5, 2.5, 2.5);
    } else if (fac.bannerGlyph === 'owl') {
      fill(240, 240, 248, 200);
      ellipse(5 + bannerWave * 0.3, -17.5, 5, 6);
      fill(30, 30, 40, 200);
      ellipse(4 + bannerWave * 0.3, -18.5, 2, 2); ellipse(6 + bannerWave * 0.3, -18.5, 2, 2);
    }
    pop();
  });
}

const _windowGlowTypes = { forum:1, temple:1, granary:1, market:1, shrine:1, villa:1, arch:1, bakery:1, bathhouse:1, sculptor:1, marketplace:1, windmill:1 };
const _groundGlowTypes = { torch:1, lantern:1, campfire:1, villa:1, temple:1, forum:1, shrine:1, granary:1, market:1, altar:1, bakery:1, lighthouse:1, guardtower:1, bathhouse:1, sculptor:1, windmill:1 };
function drawWindowGlow() {
  let bright = getSkyBrightness();
  if (bright >= 0.35) return;
  let nightStr = map(bright, 0, 0.35, 1, 0);
  noStroke();

  for (let _gi = 0; _gi < state.buildings.length; _gi++) {
    let b = state.buildings[_gi];
    let sx5 = w2sX(b.x);
    let sy5 = w2sY(b.y);
    if (sx5 < -30 || sx5 > width + 30 || sy5 < -30 || sy5 > height + 30) continue;
    if (_windowGlowTypes[b.type]) {
      fill(255, 195, 80, 70 * nightStr);
      rect(floor(sx5 - b.w * 0.15), floor(sy5 - b.h * 0.25), 5, 4);
      rect(floor(sx5 + b.w * 0.1), floor(sy5 - b.h * 0.25), 5, 4);
      fill(255, 175, 60, 30 * nightStr);
      ellipse(sx5, sy5 - b.h * 0.1, b.w * 0.7, b.h * 0.45);
    }
    if (_groundGlowTypes[b.type]) {
      fill(255, 160, 50, 18 * nightStr);
      ellipse(sx5, sy5 + 2, 30, 15);
      fill(255, 180, 70, 35 * nightStr);
      ellipse(sx5, sy5 + 2, 14, 7);
    }
  }
}

// ─── AMBIENT BACKGROUND HOUSES + MARKET CLUTTER ─────────────────────────
// Cached ambient house/clutter positions — regenerated on level change
let _ambientCache = { level: -1, houses: [], clutter: [] };

function getAmbientHouses() {
  let lvl = state.islandLevel;
  if (_ambientCache.level === lvl) return _ambientCache;
  let cx = WORLD.islandCX, cy = WORLD.islandCY;

  // How many ambient houses based on level (conservative — island is small)
  let count = lvl < 5 ? 0 : lvl < 10 ? 4 : lvl < 15 ? 8 : lvl < 20 ? 12 : 16;

  // All candidate positions — gaps between CITY_SLOTS, denser near center
  let allCandidates = [
    // NW residential fill
    { x: 400, y: 400 }, { x: 380, y: 380 },
    { x: 410, y: 420 },
    // Center-west fill
    { x: 460, y: 410 }, { x: 500, y: 420 }, { x: 520, y: 440 },
    { x: 470, y: 440 },
    // Center fill (densest)
    { x: 560, y: 400 }, { x: 580, y: 430 }, { x: 620, y: 400 },
    { x: 640, y: 430 },
    // East of center
    { x: 700, y: 400 }, { x: 720, y: 415 }, { x: 740, y: 400 },
    { x: 680, y: 440 },
    // SE fill (between center and military)
    { x: 760, y: 440 }, { x: 800, y: 430 },
  ];

  // Filter: must be inside 80% of walkable ellipse, away from buildings and ports
  let srx = getSurfaceRX() * 0.80, sry = getSurfaceRY() * 0.80;
  let portL = state.portLeft || { x: cx - srx, y: cy };
  let portR = state.portRight || { x: cx + srx, y: cy };
  let activeSlots = CITY_SLOTS.filter(s => s.level <= lvl);
  let houses = [];
  for (let c of allCandidates) {
    if (houses.length >= count) break;
    // Must be inside 80% of walkable ellipse
    let edx = (c.x - cx) / srx, edy = (c.y - cy) / sry;
    if (edx * edx + edy * edy > 1.0) continue;
    // Port exclusion zone (80px)
    let dpL = (c.x - portL.x) * (c.x - portL.x) + (c.y - portL.y) * (c.y - portL.y);
    let dpR = (c.x - portR.x) * (c.x - portR.x) + (c.y - portR.y) * (c.y - portR.y);
    if (dpL < 80 * 80 || dpR < 80 * 80) continue;
    // Check min distance from any placed building
    let tooClose = false;
    for (let s of activeSlots) {
      let dx = c.x - s.x, dy = c.y - s.y;
      if (dx * dx + dy * dy < 30 * 30) { tooClose = true; break; }
    }
    if (tooClose) continue;
    // Assign visual variant based on position hash
    let hash = (floor(c.x * 7 + c.y * 13)) % 4;
    let w = 20 + (hash % 3) * 3;  // 20-26px wide
    let h = 16 + (hash % 3) * 2;  // 16-20px tall
    houses.push({ x: c.x, y: c.y, w: w, h: h, variant: hash });
  }

  // Market clutter (stalls, crates, barrels) — center area only, level 10+
  let clutter = [];
  if (lvl >= 10) {
    let clutterCandidates = [
      // Market stalls near center plaza
      { x: 580, y: 420, type: 'stall', color: 0 },
      { x: 625, y: 420, type: 'stall', color: 1 },
      { x: 650, y: 410, type: 'stall', color: 2 },
      // Crates/barrels in center
      { x: 555, y: 425, type: 'crate' },
      { x: 645, y: 425, type: 'barrel' },
      { x: 590, y: 405, type: 'crate' },
      { x: 670, y: 415, type: 'barrel' },
      { x: 610, y: 435, type: 'barrel' },
    ];
    let maxClutter = 8;
    for (let c of clutterCandidates) {
      if (clutter.length >= maxClutter) break;
      if (!isOnIsland(c.x, c.y)) continue;
      // Port exclusion zone
      let dpL = (c.x - portL.x) * (c.x - portL.x) + (c.y - portL.y) * (c.y - portL.y);
      let dpR = (c.x - portR.x) * (c.x - portR.x) + (c.y - portR.y) * (c.y - portR.y);
      if (dpL < 80 * 80 || dpR < 80 * 80) continue;
      clutter.push(c);
    }
  }

  _ambientCache = { level: lvl, houses: houses, clutter: clutter };
  return _ambientCache;
}

function drawOneAmbientHouse(h) {
  let sx = w2sX(h.x), sy = w2sY(h.y);
  if (sx < -50 || sx > width + 50 || sy < -50 || sy > height + 50) return;
  let hw = h.w / 2, hh = h.h;
  let v = h.variant;
  noStroke();

  // Shadow
  fill(0, 0, 0, 20);
  rect(sx - hw + 2, sy + 1, h.w, 4);

  // Walls — variant determines color
  if (v === 0 || v === 2) {
    fill(210, 195, 170); // cream/plaster walls
  } else {
    fill(180, 170, 150); // stone walls
  }
  rect(sx - hw, sy - hh, h.w, hh);

  // Wall line detail (horizontal mortar line)
  fill(0, 0, 0, 18);
  rect(sx - hw, sy - hh * 0.5, h.w, 1);

  // Roof — variant determines color
  let roofOverhang = 3;
  if (v === 0 || v === 1) {
    fill(175, 85, 55); // terracotta red roof
  } else if (v === 2) {
    fill(145, 110, 70); // brown tile roof
  } else {
    fill(160, 95, 60); // dark terracotta
  }
  // Roof body
  rect(sx - hw - roofOverhang, sy - hh - 5, h.w + roofOverhang * 2, 6);
  // Roof ridge (darker top line)
  fill(0, 0, 0, 30);
  rect(sx - hw - roofOverhang, sy - hh - 5, h.w + roofOverhang * 2, 1);
  // Tile lines on roof
  fill(0, 0, 0, 15);
  for (let rx = sx - hw - roofOverhang + 4; rx < sx + hw + roofOverhang; rx += 5) {
    rect(rx, sy - hh - 4, 1, 4);
  }

  // Door
  fill(95, 70, 45);
  let doorW = 5, doorH = min(9, hh - 3);
  rect(sx - doorW / 2, sy - doorH, doorW, doorH);
  // Door frame highlight
  fill(75, 55, 35);
  rect(sx - doorW / 2, sy - doorH, doorW, 1);
  rect(sx - doorW / 2, sy - doorH, 1, doorH);
  rect(sx + doorW / 2 - 1, sy - doorH, 1, doorH);

  // Window(s)
  fill(140, 160, 180);
  let winY = sy - hh * 0.6;
  rect(sx - hw + 3, winY, 4, 4);
  if (h.w >= 24) {
    rect(sx + hw - 7, winY, 4, 4);
  }
  // Window frame
  fill(0, 0, 0, 25);
  // Cross mullion on left window
  rect(sx - hw + 4.5, winY, 1, 4);
  rect(sx - hw + 3, winY + 1.5, 4, 1);
}

function drawOneClutter(c) {
  let sx = w2sX(c.x), sy = w2sY(c.y);
  if (sx < -60 || sx > width + 60 || sy < -60 || sy > height + 60) return;
  noStroke();

  if (c.type === 'stall') {
    // Market stall — small awning
    let colors = [
      [180, 45, 35],  // red
      [220, 200, 170], // white/cream
      [200, 170, 50],  // yellow
    ];
    let col = colors[c.color || 0];
    // Posts
    fill(120, 90, 55);
    rect(sx - 6, sy - 10, 2, 12);
    rect(sx + 4, sy - 10, 2, 12);
    // Counter
    fill(140, 110, 70);
    rect(sx - 7, sy - 2, 14, 4);
    // Awning
    fill(col[0], col[1], col[2]);
    rect(sx - 8, sy - 12, 16, 4);
    // Awning stripe
    fill(col[0] * 0.8, col[1] * 0.8, col[2] * 0.8);
    rect(sx - 8, sy - 11, 16, 1);
    // Wares on counter
    fill(180, 140, 80, 180);
    rect(sx - 4, sy - 4, 3, 2);
    rect(sx + 1, sy - 4, 3, 2);
  } else if (c.type === 'crate') {
    // Wooden crate
    fill(150, 115, 70);
    rect(sx - 4, sy - 6, 8, 6);
    // Plank lines
    fill(0, 0, 0, 20);
    rect(sx - 4, sy - 4, 8, 1);
    rect(sx, sy - 6, 1, 6);
    // Shadow
    fill(0, 0, 0, 15);
    rect(sx - 3, sy + 1, 7, 2);
  } else if (c.type === 'barrel') {
    // Barrel
    fill(130, 100, 60);
    rect(sx - 3, sy - 7, 6, 7);
    // Bands
    fill(90, 70, 40);
    rect(sx - 3, sy - 6, 6, 1);
    rect(sx - 3, sy - 3, 6, 1);
    // Highlight
    fill(255, 255, 255, 20);
    rect(sx - 1, sy - 6, 2, 5);
    // Shadow
    fill(0, 0, 0, 15);
    rect(sx - 2, sy + 1, 5, 2);
  }
}

// Legacy wrapper — now a no-op since ambient houses are Y-sorted
function drawAmbientHouses() {}

// ─── Y-SORTED WORLD RENDERING ────────────────────────────────────────────
const _flatBuildTypes = ['floor', 'mosaic', 'bridge'];
let _groundItems = [];
let _sortItems = [];
let _groundSortFrame = -999;
function drawWorldObjectsSorted() {
  // Layer 0: ground-level flat objects — re-sort only every 30 frames (static)
  if (frameCount - _groundSortFrame > 30) {
    _groundItems.length = 0;
    let templeX = state.pyramid.x, templeY = state.pyramid.y;
    state.plots.forEach(p => _groundItems.push({ y: p.y, draw: () => drawOnePlot(p) }));
    state.resources.forEach(r => { if (!(abs(r.x - templeX) < 70 && r.y > templeY - 80 && r.y < templeY + 15)) _groundItems.push({ y: r.y, draw: () => drawOneResource(r) }); });
    state.crystalNodes.forEach(c => _groundItems.push({ y: c.y, draw: () => drawOneCrystal(c) }));
    if (state.crystalRainDrops) state.crystalRainDrops.forEach(d => { if (!d.collected) _groundItems.push({ y: d.y, draw: () => drawCrystalRainDrop(d) }); });
    if (state.factionFlora) state.factionFlora.forEach(fl => _groundItems.push({ y: fl.y, draw: () => drawOneFlora(fl) }));
    _groundItems.sort((a, b) => a.y - b.y);
    _groundSortFrame = frameCount;
  }
  for (let i = 0; i < _groundItems.length; i++) _groundItems[i].draw();

  // Layer 1: tall objects + all characters (Y-sorted together)
  _sortItems.length = 0;
  _sortItems.push({ y: state.pyramid.y - 40, draw: drawPyramid });
  _sortItems.push({ y: WORLD.islandCY - 30, draw: drawRuins });
  // Buildings — pre-cull offscreen, then sort
  state.buildings.forEach(b => {
    if (!isOnScreen(b.x, b.y, 100)) return;
    let sortY = _flatBuildTypes.includes(b.type) ? b.y - 9999 : b.y + (b.h || 0) / 2;
    _sortItems.push({ y: sortY, draw: () => drawOneBuilding(b) });
  });
  // Trees — pre-cull offscreen
  state.trees.forEach(t => { if (isOnScreen(t.x, t.y, 80)) _sortItems.push({ y: t.y, draw: () => drawOneTree(t) }); });
  // Ambient houses + market clutter — pre-cull offscreen
  let amb = getAmbientHouses();
  amb.houses.forEach(h => { if (isOnScreen(h.x, h.y, 80)) _sortItems.push({ y: h.y, draw: () => drawOneAmbientHouse(h) }); });
  amb.clutter.forEach(c => { if (isOnScreen(c.x, c.y, 50)) _sortItems.push({ y: c.y, draw: () => drawOneClutter(c) }); });
  // Crystal shrine
  if (state.crystalShrine) _sortItems.push({ y: state.crystalShrine.y, draw: drawCrystalShrine });
  // Fountain
  _sortItems.push({ y: WORLD.islandCY + 35, draw: drawFountain });
  // Chickens — skip when throttled
  if (state.chickens && !_frameBudget.throttled) state.chickens.forEach((ch, i) => { if (isOnScreen(ch.x, ch.y, 40)) _sortItems.push({ y: ch.y, draw: () => drawOneChicken(ch) }); });
  // Faction wildlife — skip when throttled
  if (state.factionWildlife && !_frameBudget.throttled) state.factionWildlife.forEach(w => { if (isOnScreen(w.x, w.y, 40)) _sortItems.push({ y: w.y, draw: () => drawOneFactionCreature(w) }); });
  // Harvester companion — only if awakened
  let prog = state.progression;
  let fullyUnlocked = !prog.gameStarted || prog.villaCleared; // old saves = fully unlocked
  if (state.harvester && (fullyUnlocked || prog.companionsAwakened.harvester))
    _sortItems.push({ y: state.harvester.y, draw: drawHarvester });
  // Cats
  if (state.cats && fullyUnlocked) state.cats.forEach(cat => _sortItems.push({ y: cat.y, draw: () => drawOneCat(cat) }));
  // Ambient citizens
  // Ambient citizens — cap visible at 15
  if (state.citizens) {
    let _visCount = 0;
    for (let _ci = 0; _ci < state.citizens.length && _visCount < 15; _ci++) {
      let c = state.citizens[_ci];
      let _csx = w2sX(c.x), _csy = w2sY(c.y);
      if (_csx > -30 && _csx < width + 30 && _csy > -30 && _csy < height + 30) {
        _visCount++;
        _sortItems.push({ y: c.y, draw: () => drawOneCitizen(c) });
      }
    }
  }
  // Legion soldiers on home island (ambient garrison) — cull offscreen
  // Patrol soldiers derived from army[] garrison + legacy soldiers[]
  { let _ps = (typeof getPatrolSoldiers === 'function' ? getPatrolSoldiers() : []).concat(state.legia && state.legia.soldiers ? state.legia.soldiers : []); _ps.forEach(s => { if (isOnScreen(s.x, s.y, 40)) _sortItems.push({ y: s.y, draw: () => drawLegionAmbientSoldier(s) }); }); }
  // Army escort following player — cull offscreen
  if (state.legia && state.legia.army && typeof drawEscortSoldier === 'function') {
    let _escortCount = 0;
    for (let _ei = 0; _ei < state.legia.army.length && _escortCount < 20; _ei++) {
      let u = state.legia.army[_ei];
      if (!u._assignedOfficer && u.x) {
        _escortCount++;
        if (isOnScreen(u.x, u.y, 40)) _sortItems.push({ y: u.y, draw: () => drawEscortSoldier(u) });
      }
    }
  }
  // Characters — gated by progression
  if (fullyUnlocked || prog.companionsAwakened.lares)
    _sortItems.push({ y: state.companion.y, draw: drawCompanion });
  if (state.woodcutter && (fullyUnlocked || prog.companionsAwakened.woodcutter))
    _sortItems.push({ y: state.woodcutter.y, draw: drawWoodcutter });
  if (state.quarrier && state.quarrier.unlocked)
    _sortItems.push({ y: state.quarrier.y, draw: drawQuarrier });
  if (state.cook && state.cook.unlocked)
    _sortItems.push({ y: state.cook.y, draw: drawCook });
  if (state.fisherman && state.fisherman.unlocked)
    _sortItems.push({ y: state.fisherman.boatY, draw: drawFisherman });
  if (!state.rowing.active && (fullyUnlocked || prog.companionsAwakened.centurion))
    _sortItems.push({ y: state.centurion.y, draw: drawCenturion });
  // Companion pets — tortoise and crow
  if (state.companionPets && fullyUnlocked) {
    _sortItems.push({ y: state.companionPets.tortoise.y, draw: drawTortoise });
    _sortItems.push({ y: state.companionPets.crow.y, draw: drawCrow });
  }
  // Main NPC — always present once home reached
  if (fullyUnlocked || prog.homeIslandReached)
    _sortItems.push({ y: state.npc.y, draw: drawNPC });
  // New NPCs — gated by discovery
  if (state.marcus && state.marcus.present && (fullyUnlocked || prog.npcsFound.marcus))
    _sortItems.push({ y: state.marcus.y, draw: () => drawNewNPC(state.marcus, 'marcus') });
  if (fullyUnlocked || prog.npcsFound.vesta)
    _sortItems.push({ y: state.vesta.y, draw: () => drawNewNPC(state.vesta, 'vesta') });
  if (fullyUnlocked || prog.npcsFound.felix)
    _sortItems.push({ y: state.felix.y, draw: () => drawNewNPC(state.felix, 'felix') });
  // Night market
  if (state.nightMarket.active) {
    let mp = getMarketPosition();
    _sortItems.push({ y: mp.y, draw: drawNightMarket });
  }
  // Visitor
  if (state.visitor) _sortItems.push({ y: state.visitor.y, draw: drawVisitor });
  // Temple court visitors
  if (state.templeCourt && state.templeCourt.visitors.length > 0) {
    state.templeCourt.visitors.forEach(v => {
      _sortItems.push({ y: v.y, draw: () => drawTempleCourtVisitors_single(v) });
    });
  }
  _sortItems.push({ y: state.player.y, draw: drawPlayer });
  // Multiplayer: separate islands — remote player shown on world map + HUD panel, not on your island
  // Sort by Y (back to front)
  _sortItems.sort((a, b) => a.y - b.y);
  for (let i = 0; i < _sortItems.length; i++) _sortItems[i].draw();
}

// [MOVED TO building.js] drawBuildings+drawOneBuilding

// [MOVED TO building.js] build UI + placeBuilding

// ─── CRYSTAL NODES ────────────────────────────────────────────────────────
function drawCrystalNodes() {
  state.crystalNodes.forEach(node => drawOneCrystal(node));
}
function drawOneCrystal(node) {
    node.phase += 0.025;
    let nx = w2sX(node.x);
    let ny = w2sY(node.y);
    // Cull offscreen
    if (nx < -40 || nx > width + 40 || ny < -40 || ny > height + 40) return;

    // Depleted crystals — dim and small
    if (node.charge <= 0) {
      noStroke();
      fill(30, 60, 40, 80);
      drawCrystalShape(nx, ny, node.size * 0.4);
      fill(20, 40, 30, 60);
      drawCrystalShape(nx, ny, node.size * 0.2);
      // Respawn shimmer
      if (node.respawnTimer && node.respawnTimer < 200) {
        let shimmer = sin(frameCount * 0.1) * 0.5 + 0.5;
        fill(0, 255, 136, 20 * shimmer);
        circle(nx, ny, node.size * 1.5);
      }
      return;
    }

    let pulse = sin(node.phase) * 0.3 + 0.7;

    // Glow aura — pixel cross
    noStroke();
    let glS = floor(node.size * 1.2);
    fill(0, 255, 136, floor(12 * pulse));
    rect(nx - glS, ny - 1, glS * 2, 2);
    rect(nx - 1, ny - glS, 2, glS * 2);
    fill(0, 255, 136, floor(6 * pulse));
    rect(nx - glS * 0.7, ny - 2, glS * 1.4, 4);
    rect(nx - 2, ny - glS * 0.7, 4, glS * 1.4);

    // Stone altar pedestal — pixel
    fill(120, 115, 100, 150);
    let pedW2 = floor(node.size * 0.7), pedH2 = floor(node.size * 0.2);
    rect(nx - pedW2, ny + floor(node.size * 0.4), pedW2 * 2, pedH2);

    // Crystal body
    fill(color(C.crystalDim));
    drawCrystalShape(nx, ny, node.size * 0.8);
    fill(0, 200, 100, 180);
    drawCrystalShape(nx, ny, node.size * 0.55);
    fill(color(C.crystalGlow));
    drawCrystalShape(nx, ny, node.size * 0.3 * pulse);

    if (frameCount % 90 === 0 && random() < 0.4) {
      let targetX = nx + random(-60, 60);
      let targetY = ny + random(-40, 40);
      energyArcs.push({ x1: nx, y1: ny, x2: targetX, y2: targetY, life: 15, maxLife: 15 });
    }

    // Charge ring
    stroke(0, 255, 136, 80);
    strokeWeight(1.5);
    noFill();
    let chargeAngle = map(node.charge, 0, 100, 0, TWO_PI);
    arc(nx, ny, node.size * 2.5, node.size * 2.5, -HALF_PI, -HALF_PI + chargeAngle);
    noStroke();

    // Click prompt when player is near
    let pd = dist2(state.player.x, state.player.y, node.x, node.y);
    if (pd < 60) {
      fill(color(C.hudBg));
      stroke(color(C.hudBorder));
      strokeWeight(1);
      rect(nx - 14, ny - node.size - 16, 28, 12, 3);
      noStroke();
      fill(color(C.crystalGlow));
      textAlign(CENTER, CENTER);
      textSize(11);
      text('CLICK', nx, ny - node.size - 10);
    }
}

function drawCrystalShape(x, y, size) {
  // Pixel crystal — stacked rects forming a faceted gem
  let s = floor(size);
  let cx = floor(x), cy = floor(y);
  // Top point
  rect(cx - 1, cy - s * 1.6, 2, 2);
  // Upper facet
  rect(cx - s * 0.5, cy - s * 1.0, s, 2);
  // Mid body
  rect(cx - s, cy - s * 0.4, s * 2, 2);
  rect(cx - s * 0.8, cy - s * 0.2, s * 1.6, 2);
  rect(cx - s * 0.7, cy, s * 1.4, 2);
  rect(cx - s * 0.5, cy + s * 0.2, s, 2);
  // Bottom
  rect(cx - s * 0.7, cy + s * 0.6, s * 1.4, 2);
  rect(cx - s * 0.3, cy + s * 0.8, s * 0.6, 2);
}

// ─── CRYSTAL RAIN DROPS (interactive collectibles) ────────────────────────
function drawCrystalRainDrop(drop) {
  let nx = w2sX(drop.x), ny = w2sY(drop.y);
  if (nx < -30 || nx > width + 30 || ny < -30 || ny > height + 30) return;
  let pulse = sin(drop.glow) * 0.4 + 0.6;
  let fadeAlpha = drop.timer < 600 ? map(drop.timer, 0, 600, 0, 1) : 1;
  noStroke();
  // Glow
  fill(68, 255, 170, floor(30 * pulse * fadeAlpha));
  circle(nx, ny, 18);
  fill(68, 255, 170, floor(15 * pulse * fadeAlpha));
  circle(nx, ny, 28);
  // Crystal body — small gem
  fill(10, 85, 51, floor(220 * fadeAlpha));
  drawCrystalShape(nx, ny, 4);
  fill(0, 200, 100, floor(180 * fadeAlpha));
  drawCrystalShape(nx, ny, 2.8);
  fill(68, 255, 170, floor(255 * pulse * fadeAlpha));
  drawCrystalShape(nx, ny, 1.5 * pulse);
  // E prompt when near
  let pd = dist(state.player.x, state.player.y, drop.x, drop.y);
  if (pd < 40) {
    fill(0, 0, 0, floor(140 * fadeAlpha));
    rect(nx - 10, ny - 20, 20, 12, 3);
    fill(68, 255, 170, floor(255 * fadeAlpha));
    textAlign(CENTER, CENTER); textSize(9);
    text('[E]', nx, ny - 14);
  }
}

// ─── CRYSTAL COLLECTOR ────────────────────────────────────────────────────
// Crystal Collector auto-harvest timer tracked on the building itself
function updateCrystalCollector(dt) {
  let collectors = state.buildings.filter(b => b.type === 'crystal_collector');
  if (collectors.length === 0) return;
  collectors.forEach(col => {
    if (!col._harvestTimer) col._harvestTimer = 0;
    col._harvestTimer += dt;
    if (col._harvestTimer >= 600) { // ~10 seconds at 60fps
      col._harvestTimer = 0;
      // Find nearest charged crystal node within 150px
      let best = null, bestDist = 150;
      state.crystalNodes.forEach(c => {
        if (c.charge <= 0) return;
        let d = dist(col.x, col.y, c.x, c.y);
        if (d < bestDist) { bestDist = d; best = c; }
      });
      if (best) {
        let amt = 1;
        amt = floor(amt * (getFactionData().crystalIncomeMult || 1));
        if (amt < 1) amt = 1;
        state.crystals += amt;
        best.charge = 0;
        best.respawnTimer = state.tools.steelPick ? 400 : 800;
        // Sparkle effect at collector
        spawnParticles(col.x, col.y, 'build', 6);
        let sx = w2sX(col.x), sy = w2sY(col.y);
        addFloatingText(sx, sy - 20, '+' + amt + ' Crystal', C.crystalGlow);
        if (snd) snd.playSFX('crystal');
      }
    }
  });
}

// ─── FARM PLOTS ───────────────────────────────────────────────────────────
// Farming system — see farming.js

// ─── RESOURCES ────────────────────────────────────────────────────────────
function drawResources() {
  state.resources.forEach(r => drawOneResource(r));
}
function drawOneResource(r) {
    if (!r.active) return;
    r.pulsePhase += 0.03;
    let rx = floor(w2sX(r.x));
    let ry = floor(w2sY(r.y));
    if (rx < -50 || rx > width + 50 || ry < -50 || ry > height + 50) return;
    // Cull offscreen
    if (rx < -30 || rx > width + 30 || ry < -30 || ry > height + 30) return;
    let pulse = sin(r.pulsePhase) * 0.2 + 0.8;

    noStroke();
    // Pixel pickup glow — cross shape
    let ga = 18 + pulse * 12;
    fill(255, 255, 200, ga);
    rect(rx - 4, ry - 1, 8, 2);
    rect(rx - 1, ry - 4, 2, 8);

    if (r.type === 'crystal_shard') {
      fill(0, 200 * pulse, 100, 200);
      drawCrystalShape(rx, ry, floor(7 * pulse));
      // Pixel highlight on top facet
      fill(0, 255, 136, 80);
      rect(rx - 1, ry - 6, 2, 2);
    } else if (r.type === 'vine') {
      // Pixel vine — L-shaped stem + leaf rects
      noStroke();
      fill(50, 120, 30);
      rect(rx, ry, 2, -10);       // vertical stem
      rect(rx, ry, 8, 2);         // horizontal stem
      rect(rx + 6, ry - 6, 2, 8); // right upward stem
      // Pixel leaves
      fill(60, 140, 30);
      rect(rx - 2, ry - 10, 6, 4); // top leaf
      rect(rx + 4, ry - 8, 6, 4);  // right leaf
      // Leaf highlight
      fill(80, 165, 45);
      rect(rx, ry - 10, 2, 2);
      rect(rx + 6, ry - 8, 2, 2);
    } else if (r.type === 'stone') {
      // Pixel stone — stacked rects forming a boulder
      fill(140, 132, 118);
      rect(rx - 6, ry - 2, 12, 6);  // main body
      rect(rx - 4, ry - 4, 8, 2);   // top
      rect(rx - 4, ry + 4, 8, 2);   // bottom
      // Highlight
      fill(165, 158, 142);
      rect(rx - 4, ry - 4, 4, 4);   // top-left bright face
      // Dark chip
      fill(115, 108, 92);
      rect(rx + 2, ry + 2, 4, 2);   // bottom-right shadow
      // Speckle
      fill(125, 118, 100);
      rect(rx - 2, ry, 2, 2);
    } else {
      // Pixel leaf — diamond shape with vein
      fill(70, 120, 35);
      rect(rx - 5, ry - 1, 10, 4);  // wide middle
      rect(rx - 3, ry - 3, 6, 2);   // upper
      rect(rx - 3, ry + 3, 6, 2);   // lower
      rect(rx - 1, ry - 5, 2, 2);   // tip top
      rect(rx - 1, ry + 5, 2, 2);   // tip bottom
      // Lighter center highlight
      fill(90, 148, 48);
      rect(rx - 3, ry - 1, 6, 2);
      // Vein — center line
      fill(55, 100, 28);
      rect(rx, ry - 4, 1, 10);
    }
}

// ─── SAILING/ROWING — see sailing.js ─────────────────────────────────


// Fishing system — see fishing.js


// ─── PLAYER DRAW — MODULAR LAYERS ────────────────────────────────────────

// ─── COMPANION ────────────────────────────────────────────────────────────
function updateCompanion(dt) {
  let c = state.companion;
  let p = state.player;
  let origSpeed = c.speed;
  if (state.blessing.type === 'speed') c.speed *= 2;
  c.pulsePhase += 0.04;

  // When player is rowing, companion stays on island and idles
  if (state.rowing.active) {
    c.vx *= 0.9; c.vy *= 0.9;
    if (c.task === 'deliver') { c.task = 'idle'; }
    c.speed = origSpeed;
    return;
  }

  switch (c.task) {
    case 'idle':
      let dx = p.x + 40 - c.x;
      let dy = p.y - 10 - c.y;
      let idleDist = sqrt(dx * dx + dy * dy);
      if (idleDist > 30) {
        c.vx = (dx / idleDist) * c.speed * 0.5;
        c.vy = (dy / idleDist) * c.speed * 0.5;
      }
      // Priority: harvest ripe > plant empty > collect resources
      let ripe = state.plots.find(pl => pl.ripe);
      if (ripe && c.energy > 20) {
        c.task = 'gather';
        c.taskTarget = ripe;
      } else if (state.seeds > 0 && c.energy > 15) {
        let empty = state.plots.find(pl => !pl.planted);
        if (empty) {
          c.task = 'plant';
          c.taskTarget = empty;
        }
      }
      if (c.task === 'idle') {
        let res = state.resources.find(r => r.active);
        if (res && c.energy > 30) {
          c.task = 'collect';
          c.taskTarget = res;
        }
      }
      break;

    case 'plant':
      if (!c.taskTarget || c.taskTarget.planted || state.seeds <= 0) { c.task = 'idle'; break; }
      let plx = c.taskTarget.x;
      let ply = c.taskTarget.y;
      let pldx = plx - c.x;
      let pldy = ply - c.y;
      let pld = sqrt(pldx * pldx + pldy * pldy);
      if (pld < 18) {
        c.taskTarget.planted = true;
        c.taskTarget.stage = 0;
        c.taskTarget.timer = 0;
        c.taskTarget.cropType = 'grain';
        c.taskTarget.ripe = false;
        c.taskTarget.glowing = false;
        state.seeds--;
        c.energy = max(0, c.energy - 8);
        spawnParticles(plx, ply, 'build', 4);
        if (snd) snd.playSFX('build');
        addFloatingText(w2sX(plx), w2sY(ply) - 15, 'Planted!', C.cropGlow);
        c.task = 'idle';
      } else {
        c.vx = (pldx / pld) * c.speed * 1.0;
        c.vy = (pldy / pld) * c.speed * 1.0;
      }
      break;

    case 'gather':
      if (!c.taskTarget || !c.taskTarget.ripe) { c.task = 'idle'; break; }
      let gx = c.taskTarget.x;
      let gy = c.taskTarget.y;
      let gdx = gx - c.x;
      let gdy = gy - c.y;
      let gd = sqrt(gdx * gdx + gdy * gdy);
      if (gd < 18) {
        c.taskTarget.planted = false;
        c.taskTarget.ripe = false;
        c.taskTarget.glowing = false;
        c.taskTarget.timer = 0;
        c.taskTarget.stage = 0;
        c.carryItem = 'harvest';
        c.task = 'deliver';
        spawnHarvestBurst(gx, gy, c.taskTarget.cropType || 'grain');
      } else {
        c.vx = (gdx / gd) * c.speed * 1.2;
        c.vy = (gdy / gd) * c.speed * 1.2;
      }
      break;

    case 'collect':
      if (!c.taskTarget || !c.taskTarget.active) { c.task = 'idle'; break; }
      let cx2 = c.taskTarget.x;
      let cy2 = c.taskTarget.y;
      let cdx = cx2 - c.x;
      let cdy = cy2 - c.y;
      let cd = sqrt(cdx * cdx + cdy * cdy);
      if (cd < 18) {
        c.taskTarget.active = false;
        c.taskTarget.respawnTimer = 600;
        c.carryItem = c.taskTarget.type;
        if (c.carryItem === 'crystal_shard') { state.crystals++; checkQuestProgress('crystal', 1); }
        else if (c.carryItem === 'stone') { state.stone++; checkQuestProgress('stone', 1); }
        c.task = 'deliver';
        spawnParticles(cx2, cy2, 'collect', 6);
      } else {
        c.vx = (cdx / cd) * c.speed * 1.3;
        c.vy = (cdy / cd) * c.speed * 1.3;
      }
      break;

    case 'deliver':
      let pdx = p.x - c.x;
      let pdy = p.y - c.y;
      let pd = sqrt(pdx * pdx + pdy * pdy);
      if (pd < 25) {
        if (c.carryItem === 'harvest') {
          state.harvest++;
          let seedB = 1 + (random() < 0.5 ? 1 : 0);
          state.seeds += seedB;
          addFloatingText(w2sX(p.x), w2sY(p.y) - 20, '+1 Harvest +' + seedB + ' Seed', C.cropGlow);
        } else {
          addFloatingText(w2sX(p.x), w2sY(p.y) - 20, '+' + c.carryItem, C.crystalGlow);
        }
        c.carryItem = null;
        c.task = 'idle';
        c.energy = max(0, c.energy - 15);
        // Happy heart on delivery!
        particles.push({
          x: c.x, y: c.y - 15,
          vx: random(-0.3, 0.3), vy: -1.2,
          life: 40, maxLife: 40,
          type: 'heart', size: 5,
          r: 255, g: 100, b: 120, world: true,
        });
      } else {
        c.vx = (pdx / pd) * c.speed * 1.5;
        c.vy = (pdy / pd) * c.speed * 1.5;
      }
      break;
  }

  // Resource respawn
  state.resources.forEach(r => {
    if (!r.active) {
      r.respawnTimer -= dt;
      if (r.respawnTimer <= 0) { r.active = true; r.respawnTimer = 0; }
    }
  });

  let newCX = c.x + c.vx * dt;
  let newCY = c.y + c.vy * dt;
  if (isWalkable(newCX, newCY)) {
    c.x = newCX;
    c.y = newCY;
  } else {
    // Push back to island surface
    let edx = (c.x - WORLD.islandCX) / getSurfaceRX();
    let edy = (c.y - WORLD.islandCY) / getSurfaceRY();
    let eDist = sqrt(edx * edx + edy * edy);
    if (eDist > 0.90) {
      let scale = 0.85 / eDist;
      c.x = WORLD.islandCX + (c.x - WORLD.islandCX) * scale;
      c.y = WORLD.islandCY + (c.y - WORLD.islandCY) * scale;
    }
  }
  c.vx *= 0.8;
  c.vy *= 0.8;

  c.speed = origSpeed;
  c.trailPoints.unshift({ x: c.x, y: c.y, life: 10 });
  c.trailPoints = c.trailPoints.filter(t => t.life > 0);
  c.trailPoints.forEach(t => t.life--);
}

function drawCompanionTrail() {
  let c = state.companion;
  c.trailPoints.forEach(t => {
    noStroke();
    let a = map(t.life, 0, 10, 0, 60);
    let s = floor(map(t.life, 0, 10, 1, 3));
    fill(0, 255, 136, a);
    rect(floor(w2sX(t.x)), floor(w2sY(t.y)), s, s);
  });
}

function drawCompanion() {
  let c = state.companion;
  let sx = w2sX(c.x);
  let sy = w2sY(c.y);
  let bob = sin(frameCount * 0.08) * 4;
  let pulse = sin(c.pulsePhase) * 0.3 + 0.7;
  let energyFrac = c.energy / 100;
  let breath = 1 + sin(frameCount * 0.05) * 0.03;
  // Ethereal work sparkles
  if (c.task !== 'idle' && c.task !== 'deliver' && frameCount % 12 === 0) {
    particles.push({
      x: c.x + random(-8, 8), y: c.y + random(-12, 4),
      vx: random(-0.4, 0.4), vy: random(-1.0, -0.3),
      life: random(18, 30), maxLife: 30,
      type: 'sundust', size: random(1, 3),
      r: 160, g: 200, b: 240, phase: random(TWO_PI), world: true,
    });
  }

  push();
  translate(floor(sx), floor(sy + bob));
  scale(breath);
  noStroke();

  // Ghost alpha — pulses with energy
  let ghostA = floor(120 + 60 * energyFrac + sin(frameCount * 0.06) * 20);

  // Ethereal glow aura — cross shape, blue-white
  let glowA = floor(15 * pulse * energyFrac);
  fill(160, 200, 240, glowA);
  rect(-8, -2, 16, 2);
  rect(-2, -10, 4, 20);

  // Soft ground glow (no hard shadow for a spirit)
  fill(140, 190, 230, floor(20 * energyFrac));
  rect(-6, 10, 12, 2);

  // Spectral body — flowing robes, semi-transparent
  fill(200, 220, 240, ghostA);
  rect(-5, -2, 10, 12);
  // Robe fold — dither effect (checkerboard pixels)
  fill(180, 205, 230, floor(ghostA * 0.7));
  for (let dy = 0; dy < 12; dy += 2) {
    for (let dx = (dy % 4 === 0) ? 0 : 1; dx < 10; dx += 4) {
      rect(-5 + dx, -2 + dy, 1, 1);
    }
  }
  // Robe hem — fading/dissolving
  fill(180, 210, 240, floor(ghostA * 0.5));
  rect(-6, 8, 12, 2);
  fill(160, 200, 235, floor(ghostA * 0.3));
  rect(-4, 10, 8, 2);
  // No feet — spirit floats

  // Green laurel sash — spectral
  fill(100, 180, 80, floor(ghostA * 0.8));
  rect(-5, -2, 10, 2);

  // Spectral head
  fill(210, 225, 240, ghostA);
  rect(-4, -10, 8, 8);

  // Ethereal hair — pale silver-blue
  fill(190, 210, 235, ghostA);
  rect(-5, -12, 10, 4);
  rect(-5, -10, 2, 4);
  rect(3, -10, 2, 4);

  // Golden laurel wreath — brightest part, anchor to the living world
  fill(200, 210, 80, floor(ghostA + 40));
  rect(-5, -12, 2, 2);
  rect(-3, -13, 2, 2);
  rect(-1, -13, 2, 2);
  rect(1, -13, 2, 2);
  rect(3, -12, 2, 2);

  // Eyes — glowing blue-white
  fill(220, 240, 255, ghostA);
  rect(-3, -8, 2, 2);
  rect(1, -8, 2, 2);
  // Eye glow core
  fill(255, 255, 255, floor(ghostA * 0.9));
  rect(-3, -8, 1, 1);
  rect(1, -8, 1, 1);
  // Serene expression
  fill(180, 210, 235, floor(ghostA * 0.6));
  rect(-1, -5, 2, 1);

  // Spectral arms
  fill(200, 220, 240, floor(ghostA * 0.8));
  if (c.carryItem) {
    rect(-7, 0, 2, 3);
    rect(5, 0, 2, 3);
    // Carried item — pixel glow cross
    let itemCol = c.carryItem === 'harvest' ? color(C.cropGlow) : color(C.crystalGlow);
    fill(red(itemCol), green(itemCol), blue(itemCol), 40);
    rect(-4, -16, 8, 2);
    rect(-1, -19, 2, 8);
    fill(itemCol);
    rect(-2, -16, 4, 4);
  } else {
    rect(-7, 2, 2, 4);
    rect(5, 2, 2, 4);
  }

  // Plant tendril glow near feet — spirit connected to earth
  let tendrilA = floor(30 + sin(frameCount * 0.04 + 2) * 15);
  fill(100, 180, 80, tendrilA);
  rect(-3, 9, 1, 3);
  rect(2, 10, 1, 2);
  rect(-1, 11, 1, 1);

  pop();
}

// ─── WOODCUTTER COMPANION ─────────────────────────────────────────────────
function updateWoodcutter(dt) {
  let w = state.woodcutter;
  let origWSpeed = w.speed;
  if (state.blessing.type === 'speed') w.speed *= 2;
  let p = state.player;
  w.pulsePhase += 0.04;

  // When player is rowing, woodcutter stays on island
  if (state.rowing.active) {
    w.vx *= 0.9; w.vy *= 0.9;
    w.speed = origWSpeed;
    return;
  }

  switch (w.task) {
    case 'idle':
      // Follow player loosely
      let dx = p.x - 30 - w.x;
      let dy = p.y + 10 - w.y;
      let idleDist = sqrt(dx * dx + dy * dy);
      if (idleDist > 35) {
        w.vx = (dx / idleDist) * w.speed * 0.5;
        w.vy = (dy / idleDist) * w.speed * 0.5;
      }
      // Look for a tree to chop
      if (w.energy > 25) {
        let target = state.trees.find(t => t.alive && t.health > 0);
        if (target) {
          w.task = 'chop';
          w.taskTarget = target;
          w.chopTimer = 0;
        }
      }
      break;

    case 'chop':
      if (!w.taskTarget || !w.taskTarget.alive) { w.task = 'idle'; break; }
      let tx = w.taskTarget.x;
      let ty = w.taskTarget.y;
      let tdx = tx - w.x;
      let tdy = ty - w.y;
      let td = sqrt(tdx * tdx + tdy * tdy);
      if (td < 24) {
        w.vx *= 0.3;
        w.vy *= 0.3;
        w.chopTimer += dt;
        if (w.chopTimer > 40) {
          w.chopTimer = 0;
          w.taskTarget.health--;
          spawnParticles(tx, ty, 'build', 3);
          triggerScreenShake(1, 3);
          if (w.taskTarget.health <= 0) {
            w.taskTarget.alive = false;
            w.taskTarget.regrowTimer = 1200;
            state.wood += 3;
            checkQuestProgress('chop', 1);
            addFloatingText(w2sX(tx), w2sY(ty) - 20, '+3 Wood', '#A0724A');
            w.energy = max(0, w.energy - 8);
            w.task = 'idle';
            w.taskTarget = null;
          }
        }
      } else {
        w.vx = (tdx / td) * w.speed * 1.1;
        w.vy = (tdy / td) * w.speed * 1.1;
      }
      break;
  }

  let newX = w.x + w.vx * dt;
  let newY = w.y + w.vy * dt;
  if (isWalkable(newX, newY)) {
    w.x = newX;
    w.y = newY;
  }
  w.vx *= 0.8;
  w.vy *= 0.8;

  // Solar recharge + night rest
  let hour = state.time / 60;
  if (hour >= 6 && hour <= 18) {
    w.energy = min(100, w.energy + 0.15 * dt);
  } else {
    w.energy = min(100, w.energy + 0.03 * dt);
  }

  w.speed = origWSpeed;
  w.trailPoints.unshift({ x: w.x, y: w.y, life: 8 });
  w.trailPoints = w.trailPoints.filter(t => t.life > 0);
  w.trailPoints.forEach(t => t.life--);
}

function drawWoodcutter() {
  let w = state.woodcutter;
  let sx = w2sX(w.x);
  let sy = w2sY(w.y);
  let bob = floor(sin(frameCount * 0.07 + 1) * 2);
  let pulse = sin(w.pulsePhase) * 0.3 + 0.7;
  let energyFrac = w.energy / 100;
  let breath = 1 + sin(frameCount * 0.04 + 1) * 0.02;

  // Pixel trail — sawdust
  w.trailPoints.forEach(t => {
    noStroke();
    fill(160, 120, 60, map(t.life, 0, 8, 0, 35));
    rect(floor(w2sX(t.x)), floor(w2sY(t.y)), 2, 2);
  });

  // Wood chip particles when chopping
  if (w.task === 'chop' && frameCount % 10 === 0) {
    particles.push({
      x: w.x + random(4, 10), y: w.y + random(-10, -2),
      vx: random(0.5, 1.5), vy: random(-1.2, -0.3),
      life: random(12, 20), maxLife: 20,
      type: 'sundust', size: random(1, 2),
      r: 160, g: 120, b: 60, phase: random(TWO_PI), world: true,
    });
  }

  push();
  translate(floor(sx), floor(sy + bob));
  scale(breath);
  noStroke();

  // Warm energy glow — cross
  let wgA = floor(8 * pulse * energyFrac);
  fill(floor(180 * energyFrac), floor(120 * energyFrac), 40, wgA);
  rect(-5, -1, 10, 2);
  rect(-1, -5, 2, 10);

  // Shadow
  fill(0, 0, 0, 35);
  rect(-7, 12, 14, 2);

  // Heavy boots — laced leather
  fill(80, 55, 30);
  rect(-5, 9, 4, 3);
  rect(1, 9, 4, 3);
  // Boot laces
  fill(100, 75, 40);
  rect(-4, 9, 1, 1);
  rect(2, 9, 1, 1);

  // Legs — muscular
  fill(185, 150, 110);
  rect(-4, 3, 3, 7);
  rect(1, 3, 3, 7);

  // Dark leather tunic
  fill(92, 65, 35);
  rect(-6, -3, 12, 8);
  // Lighter vest overlay
  fill(110, 80, 45);
  rect(-4, -2, 8, 6);
  // Tunic skirt
  fill(100, 72, 38);
  rect(-6, 3, 12, 3);

  // Thick leather belt with buckle
  fill(70, 48, 22);
  rect(-6, 1, 12, 2);
  // Bronze buckle
  fill(175, 145, 50);
  rect(-1, 1, 2, 2);

  // Broad shoulders / bare arms — muscular, tanned
  fill(190, 155, 115);
  let armOff = w.task === 'chop' ? floor(sin(frameCount * 0.2) * 2) : 0;
  rect(-8, -1 + armOff, 2, 6);
  rect(6, -1 - armOff, 2, 6);
  // Forearm detail
  fill(180, 145, 105);
  rect(-8, 3 + armOff, 2, 2);
  rect(6, 3 - armOff, 2, 2);

  // Neck
  fill(190, 155, 115);
  rect(-3, -6, 6, 3);

  // Head — square-jawed, rugged
  fill(195, 160, 120);
  rect(-5, -13, 10, 8);
  // Jaw definition
  fill(180, 145, 108);
  rect(-5, -7, 2, 2);
  rect(3, -7, 2, 2);

  // Short cropped hair — dark brown
  fill(55, 38, 22);
  rect(-5, -15, 10, 4);
  // Sideburns
  rect(-5, -12, 2, 3);
  rect(3, -12, 2, 3);

  // Stubble shadow
  fill(140, 115, 85, 60);
  rect(-4, -7, 8, 2);

  // Eyes — focused, intense
  let blinkW = (frameCount % 260 > 253);
  if (blinkW) {
    fill(175, 140, 105);
    rect(-3, -10, 2, 1);
    rect(1, -10, 2, 1);
  } else {
    fill(50, 35, 20);
    rect(-3, -11, 2, 2);
    rect(1, -11, 2, 2);
    // Determined highlight
    fill(75, 55, 35);
    rect(-3, -11, 1, 1);
    rect(1, -11, 1, 1);
  }
  // Strong brow
  fill(130, 100, 70);
  rect(-4, -12, 3, 1);
  rect(1, -12, 3, 1);
  // Nose
  fill(185, 150, 112);
  rect(-1, -9, 2, 2);

  // Roman dolabra axe
  if (w.task === 'chop') {
    let swing = floor(sin(frameCount * 0.2) * 6) * 2;
    // Handle — ash wood
    fill(85, 60, 28);
    rect(7 + swing, -15, 2, 15);
    // Axe head — iron with edge
    fill(140, 140, 150);
    rect(5 + swing, -17, 6, 4);
    fill(170, 170, 180);
    rect(5 + swing, -17, 2, 4);
    // Impact sparks hint
    fill(200, 180, 100, floor(abs(sin(frameCount * 0.2)) * 40));
    rect(4 + swing, -18, 2, 1);
  } else {
    // Axe resting on shoulder
    fill(85, 60, 28);
    rect(8, -17, 2, 13);
    fill(140, 140, 150);
    rect(6, -19, 6, 4);
    fill(170, 170, 180);
    rect(6, -19, 2, 4);
  }

  pop();
}

// ─── CENTURION ───────────────────────────────────────────────────────────
function updateCenturion(dt) {
  let cen = state.centurion;
  let p = state.player;
  if (state.rowing.active) { cen.x = p.x + 15; cen.y = p.y + 8; cen.vx = 0; cen.vy = 0; return; }
  if (state.diving && state.diving.active) { cen.vx = 0; cen.vy = 0; return; } // stay put while player dives
  if (cen.flashTimer > 0) cen.flashTimer -= dt;
  if (cen.attackTimer > 0) cen.attackTimer -= dt;

  // On conquest island: fight enemies
  if (state.conquest.active) {
    let c = state.conquest;
    // Find nearest enemy
    let nearEnemy = null, nearDist = 9999;
    for (let e of c.enemies) {
      if (e.state === 'dead') continue;
      let d = dist(cen.x, cen.y, e.x, e.y);
      if (d < nearDist) { nearDist = d; nearEnemy = e; }
    }
    // Attack if in range
    if (nearEnemy && nearDist < cen.attackRange && cen.attackTimer <= 0) {
      cen.attackTimer = cen.attackCooldown;
      nearEnemy.hp -= cen.attackDamage;
      nearEnemy.flashTimer = 5;
      if (nearEnemy.hp <= 0) {
        nearEnemy.state = 'dying'; nearEnemy.stateTimer = 15;
      } else {
        nearEnemy.state = 'stagger'; nearEnemy.stateTimer = 6;
      }
      cen.facing = nearEnemy.x > cen.x ? 1 : -1;
      let kba = atan2(nearEnemy.y - cen.y, nearEnemy.x - cen.x);
      nearEnemy.x += cos(kba) * 4;
      nearEnemy.y += sin(kba) * 4;
      addFloatingText(w2sX(nearEnemy.x), w2sY(nearEnemy.y) - 15, '-' + cen.attackDamage, '#ffaa44');
      spawnParticles(nearEnemy.x, nearEnemy.y, 'combat', 2);
      // Battle shout - 20% chance
      if (Math.random() < 0.2) {
        let _shouts = ['FOR ROME!', 'HOLD THE LINE!', 'ADVANCE!', 'SHIELDS UP!', 'CHARGE!'];
        addFloatingText(w2sX(cen.x), w2sY(cen.y) - 35, _shouts[floor(Math.random() * _shouts.length)], '#ffdd66');
      }
      cen.task = 'fight';
      cen.target = nearEnemy;
      return;
    }
    // Chase nearby enemy
    if (nearEnemy && nearDist < 150) {
      let dx = nearEnemy.x - cen.x, dy = nearEnemy.y - cen.y;
      cen.vx = (dx / nearDist) * cen.speed;
      cen.vy = (dy / nearDist) * cen.speed;
      cen.x += cen.vx * dt; cen.y += cen.vy * dt;
      cen.facing = dx > 0 ? 1 : -1;
      cen.task = 'fight';
      return;
    }
  }

  // Clamp centurion to island FIRST (before follow logic to prevent edge oscillation)
  if (!state.conquest.active) {
    let ix = WORLD.islandCX, iy = WORLD.islandCY;
    let rx = getSurfaceRX() * 0.80, ry = getSurfaceRY() * 0.80;
    let ex = (cen.x - ix) / rx, ey = (cen.y - iy) / ry;
    if (ex * ex + ey * ey > 1) {
      let a = atan2(cen.y - iy, cen.x - ix);
      cen.x = ix + cos(a) * rx;
      cen.y = iy + sin(a) * ry;
      cen.vx = 0; cen.vy = 0;
    }
  } else {
    let c = state.conquest;
    let ex = (cen.x - c.isleX) / (c.isleRX * 0.9), ey = (cen.y - c.isleY) / (c.isleRY * 0.9);
    if (ex * ex + ey * ey > 1) {
      let a = atan2(cen.y - c.isleY, cen.x - c.isleX);
      cen.x = c.isleX + cos(a) * c.isleRX * 0.9;
      cen.y = c.isleY + sin(a) * c.isleRY * 0.9;
      cen.vx = 0; cen.vy = 0;
    }
  }

  // Default: follow player
  cen.task = 'follow';
  let followDist = 40;
  let dx = p.x - followDist * (p.facing === 'left' ? -1 : 1) - cen.x;
  let dy = p.y + 5 - cen.y;
  let d = sqrt(dx * dx + dy * dy);

  // Check if player is near the island edge — centurion should stop following
  let playerNearEdge = false;
  if (!state.conquest.active) {
    let pix = WORLD.islandCX, piy = WORLD.islandCY;
    let prx = getSurfaceRX() * 0.80, pry = getSurfaceRY() * 0.80;
    let pex = (p.x - pix) / prx, pey = (p.y - piy) / pry;
    playerNearEdge = pex * pex + pey * pey > 0.72;
  }

  if (d > 200 && !state.conquest.active) {
    // Too far — snap closer to center than player (not right on edge)
    let snapA = atan2(p.y - WORLD.islandCY, p.x - WORLD.islandCX);
    let snapD = sqrt((p.x - WORLD.islandCX) * (p.x - WORLD.islandCX) + (p.y - WORLD.islandCY) * (p.y - WORLD.islandCY)) * 0.85;
    cen.x = WORLD.islandCX + cos(snapA) * snapD;
    cen.y = WORLD.islandCY + sin(snapA) * snapD;
    cen.vx = 0; cen.vy = 0;
  } else if (d > 25 && !playerNearEdge) {
    // Jog to catch up - faster when further, smooth acceleration
    let urgency = min(1, max(0, (d - 25) / 150));
    let spd = cen.speed * (0.6 + urgency * 0.8);
    cen.vx += ((dx / d) * spd - cen.vx) * 0.15;
    cen.vy += ((dy / d) * spd - cen.vy) * 0.15;
    let nx = cen.x + cen.vx * dt, ny = cen.y + cen.vy * dt;
    if (isWalkable(nx, ny)) { cen.x = nx; cen.y = ny; }
    else { cen.vx = 0; cen.vy = 0; }
    cen.facing = dx > 0 ? 1 : -1;
  } else {
    cen.vx *= 0.8;
    cen.vy *= 0.8;
    // Idle fidget: small random steps when player is stationary
    if (!cen._idleTimer) cen._idleTimer = 0;
    cen._idleTimer += dt;
    if (cen._idleTimer > 300 + Math.random() * 300) {
      cen._idleTimer = 0;
      cen.facing = Math.random() < 0.5 ? 1 : -1;
      let wa = Math.random() * TWO_PI;
      let wx = cen.x + cos(wa) * (8 + Math.random() * 8);
      let wy = cen.y + sin(wa) * (5 + Math.random() * 5);
      if (isWalkable(wx, wy)) { cen.x = wx; cen.y = wy; }
    }
  }

  // Reaction to nearby enemies - turn to face, show "!" indicator
  if (!state.conquest.active) {
    let _nearThreat = typeof _findNearestRaidEnemy === 'function' ? _findNearestRaidEnemy(cen.x, cen.y, 200) : null;
    if (_nearThreat) {
      cen.facing = _nearThreat.x > cen.x ? 1 : -1;
      if (!cen._alertTimer || cen._alertTimer <= 0) {
        cen._alertTimer = 60;
        addFloatingText(w2sX(cen.x), w2sY(cen.y) - 30, '!', '#ff4444');
      }
    }
    if (cen._alertTimer > 0) cen._alertTimer -= dt;
  }
}

// ─── QUARRIER COMPANION — auto-mines stone, unlocks at island level 5 ───
function updateQuarrier(dt) {
  let q = state.quarrier;
  if (!q.unlocked) {
    if (state.islandLevel >= 5) { q.unlocked = true; addFloatingText(width / 2, height * 0.3, 'Quarrier joined your island!', '#aaaaaa'); }
    else return;
  }
  let origSpeed = q.speed;
  if (state.blessing.type === 'speed') q.speed *= 2;
  let p = state.player;
  q.pulsePhase += 0.04;
  if (state.rowing.active) { q.vx *= 0.9; q.vy *= 0.9; q.speed = origSpeed; return; }

  switch (q.task) {
    case 'idle': {
      let dx = p.x + 30 - q.x, dy = p.y + 15 - q.y;
      let d = sqrt(dx * dx + dy * dy);
      if (d > 35) { q.vx = (dx / d) * q.speed * 0.5; q.vy = (dy / d) * q.speed * 0.5; }
      if (q.energy > 25) {
        let res = state.resources.find(r => r.active && r.type === 'stone');
        if (res) { q.task = 'mine'; q.taskTarget = res; q.mineTimer = 0; }
      }
      break;
    }
    case 'mine': {
      if (!q.taskTarget || !q.taskTarget.active) { q.task = 'idle'; break; }
      let tx = q.taskTarget.x, ty = q.taskTarget.y;
      let dx = tx - q.x, dy = ty - q.y, d = sqrt(dx * dx + dy * dy);
      if (d < 20) {
        q.vx *= 0.3; q.vy *= 0.3;
        q.mineTimer += dt;
        if (q.mineTimer > 50) {
          q.mineTimer = 0;
          q.taskTarget.active = false;
          q.taskTarget.respawnTimer = 600;
          state.stone += 2;
          checkQuestProgress('stone', 2);
          addFloatingText(w2sX(tx), w2sY(ty) - 15, '+2 Stone', '#aaaaaa');
          // Iron ore chance: level 5+ at 20%, level 7+ at 35%
          let _ironChance = state.islandLevel >= 7 ? 0.35 : (state.islandLevel >= 5 ? 0.20 : 0);
          if (_ironChance > 0 && random() < _ironChance) {
            state.ironOre = (state.ironOre || 0) + 1;
            addFloatingText(w2sX(tx), w2sY(ty) - 28, '+1 Iron Ore!', '#aabbcc');
          }
          spawnParticles(tx, ty, 'collect', 5);
          if (snd) snd.playSFX('stone_mine');
          q.energy = max(0, q.energy - 10);
          q.task = 'idle'; q.taskTarget = null;
        }
      } else {
        q.vx = (dx / d) * q.speed * 1.1; q.vy = (dy / d) * q.speed * 1.1;
      }
      break;
    }
  }
  let nx = q.x + q.vx * dt, ny = q.y + q.vy * dt;
  if (isWalkable(nx, ny)) { q.x = nx; q.y = ny; }
  q.vx *= 0.8; q.vy *= 0.8;
  let hour = state.time / 60;
  if (hour >= 6 && hour <= 18) q.energy = min(100, q.energy + 0.15 * dt);
  else q.energy = min(100, q.energy + 0.03 * dt);
  q.speed = origSpeed;
  q.trailPoints.unshift({ x: q.x, y: q.y, life: 8 });
  q.trailPoints = q.trailPoints.filter(t => t.life > 0);
  q.trailPoints.forEach(t => t.life--);
}

function drawQuarrier() {
  let q = state.quarrier;
  if (!q.unlocked) return;
  let sx = w2sX(q.x), sy = w2sY(q.y);
  let bob = floor(sin(frameCount * 0.06 + 2) * 2);
  let pulse = sin(q.pulsePhase) * 0.3 + 0.7;
  let ef = q.energy / 100;

  // Stone dust trail
  q.trailPoints.forEach(t => {
    noStroke(); fill(140, 135, 125, map(t.life, 0, 8, 0, 30));
    rect(floor(w2sX(t.x)), floor(w2sY(t.y)), 2, 2);
  });

  // Rock chip particles when mining
  if (q.task === 'mine' && frameCount % 12 === 0) {
    particles.push({ x: q.x + random(-8, 8), y: q.y + random(-12, -4), vx: random(-1, 1), vy: random(-1.5, -0.5), life: random(10, 18), maxLife: 18, type: 'sundust', size: random(1, 2), r: 140, g: 130, b: 115, phase: random(TWO_PI), world: true });
  }

  push();
  translate(floor(sx), floor(sy + bob));
  noStroke();

  // Glow
  let ga = floor(8 * pulse * ef);
  fill(floor(140 * ef), floor(135 * ef), floor(120 * ef), ga);
  rect(-5, -1, 10, 2); rect(-1, -5, 2, 10);

  // Shadow
  fill(0, 0, 0, 35); rect(-7, 12, 14, 2);

  // Boots — sturdy stone-worker
  fill(90, 80, 65); rect(-5, 9, 4, 3); rect(1, 9, 4, 3);

  // Legs — dusty brown
  fill(110, 100, 80); rect(-4, 4, 3, 6); rect(1, 4, 3, 6);

  // Torso — grey stone-worker tunic
  fill(130, 125, 115); rect(-5, -4, 10, 9);
  fill(140, 135, 125); rect(-4, -3, 8, 4); // lighter chest

  // Arms
  fill(120, 110, 95); rect(-7, -2, 3, 7); rect(4, -2, 3, 7);

  // Head
  fill(190, 155, 115); rect(-3, -9, 6, 6);
  // Eyes
  fill(50, 40, 30); rect(-2, -7, 1, 1); rect(1, -7, 1, 1);
  // Headband (stone dust)
  fill(160, 155, 140); rect(-3, -9, 6, 1);

  // Pickaxe on back
  stroke(100, 85, 60); strokeWeight(1);
  line(4, -8, 8, 4); noStroke();
  fill(140, 140, 150); // iron head
  rect(7, 2, 3, 2);

  pop();

  // Label
  noStroke(); fill(140, 135, 120, 120);
  textSize(10); textAlign(CENTER, TOP);
  text('QUARRIER', floor(sx), floor(sy + 16));
  textAlign(LEFT, TOP);
}

// ─── COOK NPC ────────────────────────────────────────────────────────────
function updateCook(dt) {
  let c = state.cook;
  if (!c.unlocked) {
    if (state.islandLevel >= 8) { c.unlocked = true; addFloatingText(width / 2, height * 0.3, 'Cook joined your island!', '#ddaa44'); }
    else return;
  }
  if (state.rowing.active) return;
  c.timer += dt;
  // Auto-cook a meal every ~30 seconds if ingredients available
  if (c.timer > 1800) {
    c.timer = 0;
    if (state.harvest >= 2 && state.fish >= 1) {
      state.harvest -= 2; state.fish -= 1;
      state.meals = (state.meals || 0) + 1;
      addFloatingText(w2sX(c.x), w2sY(c.y) - 20, '+1 Meal (Cook)', '#ddaa44');
      if (snd) snd.playSFX('ding');
      c.cookTimer = 30;
    }
  }
  if (c.cookTimer > 0) c.cookTimer -= dt;
  // Idle near a brazier
  let brazier = state.buildings.find(b => b.type === 'torch');
  if (brazier) {
    let dx = brazier.x + 15 - c.x, dy = brazier.y - c.y;
    let d = sqrt(dx * dx + dy * dy);
    if (d > 25) { c.x += (dx / d) * c.speed * dt; c.y += (dy / d) * c.speed * dt; }
  }
}

function drawCook() {
  let c = state.cook;
  if (!c.unlocked) return;
  let sx = w2sX(c.x), sy = w2sY(c.y);
  let bob = floor(sin(frameCount * 0.04) * 1);
  push(); translate(floor(sx), floor(sy + bob)); noStroke();
  // Shadow
  fill(0, 0, 0, 25); ellipse(0, 10, 14, 4);
  // Feet
  fill(120, 80, 40); rect(-4, 7, 3, 3); rect(1, 7, 3, 3);
  // Apron (white)
  fill(230, 225, 210); rect(-5, -3, 10, 11, 1);
  // Tunic underneath
  fill(180, 120, 50); rect(-6, -4, 12, 6, 1);
  // Head
  fill(195, 160, 120); rect(-3, -10, 6, 7);
  // Chef hat
  fill(240, 235, 220); rect(-4, -15, 8, 6, 1);
  rect(-3, -17, 6, 3);
  // Eyes
  fill(40, 30, 20); rect(-2, -8, 1, 1); rect(1, -8, 1, 1);
  // Ladle (when cooking)
  if (c.cookTimer > 0) {
    fill(140, 120, 80); rect(5, -5, 2, 10);
    fill(160, 140, 90); ellipse(6, 6, 5, 3);
  }
  pop();
  noStroke(); fill(140, 120, 80, 120);
  textSize(10); textAlign(CENTER, TOP);
  text('COOK', floor(sx), floor(sy + 14));
  textAlign(LEFT, TOP);
}

// ─── FISHERMAN NPC ───────────────────────────────────────────────────────
function updateFisherman(dt) {
  let f = state.fisherman;
  if (!f.unlocked) {
    if (state.islandLevel >= 6) { f.unlocked = true; addFloatingText(width / 2, height * 0.3, 'Fisherman set up at the port!', '#4488aa'); }
    else return;
  }
  // Position at port shoreline
  let port = getPortPosition();
  f.boatX = port.x + 30;
  f.boatY = port.y + 40;
  f.x = f.boatX; f.y = f.boatY;
  // Catch fish every ~20 seconds
  f.timer += dt;
  f.catchTimer -= dt;
  if (f.timer > 1200) {
    f.timer = 0;
    let amt = 1 + floor(random(0, 2));
    state.fish = (state.fish || 0) + amt;
    f.fishCaught += amt;
    addFloatingText(w2sX(f.x), w2sY(f.y) - 25, '+' + amt + ' Fish (Fisherman)', '#4488aa');
    if (snd) snd.playSFX('fish_catch');
    f.catchTimer = 20;
  }
}

function drawFisherman() {
  let f = state.fisherman;
  if (!f.unlocked) return;
  let sx = w2sX(f.boatX), sy = w2sY(f.boatY);
  let bob = floor(sin(frameCount * 0.025) * 2);
  push(); translate(floor(sx), floor(sy + bob)); noStroke();
  // Small fishing boat
  fill(110, 75, 35);
  beginShape();
  vertex(-14, 2); vertex(-10, 6); vertex(10, 6); vertex(14, 2);
  vertex(8, 0); vertex(-8, 0);
  endShape(CLOSE);
  // Deck
  fill(140, 100, 50); rect(-8, 0, 16, 3, 1);
  // Fisherman sitting
  fill(190, 155, 120); rect(-2, -8, 4, 5); // head
  fill(50, 80, 130); rect(-3, -3, 6, 5, 1); // blue tunic
  fill(40, 30, 20); rect(-1, -6, 1, 1); rect(1, -6, 1, 1); // eyes
  // Straw hat
  fill(200, 180, 120); rect(-4, -10, 8, 3, 1);
  rect(-5, -8, 10, 1);
  // Fishing rod
  stroke(120, 90, 40); strokeWeight(1);
  line(3, -5, 18, -15); // rod
  stroke(180, 180, 180, 120); strokeWeight(0.5);
  let lineEnd = 8 + sin(frameCount * 0.04) * 3;
  line(18, -15, 18, lineEnd); // line into water
  noStroke();
  // Water ripple at line
  if (f.catchTimer > 0) {
    fill(180, 220, 255, 80); ellipse(18, lineEnd + 2, 6, 2);
  }
  // Fish basket
  fill(160, 130, 70); rect(-12, -1, 5, 4, 1);
  if (f.fishCaught > 0) {
    fill(100, 160, 200, 150); rect(-11, -2, 3, 2);
  }
  pop();
  noStroke(); fill(70, 120, 160, 120);
  textSize(10); textAlign(CENTER, TOP);
  text('FISHERMAN', floor(sx), floor(sy + 10));
  textAlign(LEFT, TOP);
}

function drawCenturion() {
  let cen = state.centurion;
  if (state.rowing.active) return;
  let sx = w2sX(cen.x), sy = w2sY(cen.y);
  let s = 12;
  let bobY = floor(sin(frameCount * 0.06) * 1);
  let f = cen.facing;
  let breath = sin(frameCount * 0.04 + 2) * 0.5;
  let mil = getFactionMilitary();
  let fk = state.faction || 'rome';

  push();
  translate(floor(sx), floor(sy + bobY));

  // Flash white when hit
  if (cen.flashTimer > 0 && frameCount % 4 < 2) { pop(); return; }

  noStroke();
  // Shadow
  fill(0, 0, 0, 40);
  rect(-8, s + 1, 16, 2);

  // Sandals
  fill(90, 60, 25);
  rect(-5, s - 2, 4, 3);
  rect(1, s - 2, 4, 3);
  fill(140, 130, 100);
  rect(-4, s, 1, 1);
  rect(2, s, 1, 1);

  // Legs
  fill(200, 165, 130);
  rect(-4, 4, 3, 7);
  rect(1, 4, 3, 7);
  // Greaves — faction armor tint
  fill(mil.armor[0], max(0, mil.armor[1] - 22), max(0, mil.armor[2] - 125));
  rect(-4, 6, 3, 4);
  rect(1, 6, 3, 4);
  fill(min(255, mil.armor[0] + 15), max(0, mil.armor[1] - 7), max(0, mil.armor[2] - 115), 80);
  rect(-3, 7, 1, 2);
  rect(2, 7, 1, 2);

  // Cape — faction
  fill(mil.cape[0], mil.cape[1], mil.cape[2], 180);
  let cw = floor(sin(frameCount * 0.07) * 2);
  rect(-6 * f, -5, 5, 16 + cw);
  fill(min(255, mil.cape[0] + 20), min(255, mil.cape[1] + 12), min(255, mil.cape[2] + 10), 120);
  rect(-6 * f, -5, 1, 16 + cw);

  // Tunic — faction
  fill(mil.tunic[0], mil.tunic[1], mil.tunic[2]);
  rect(-6, -4, 12, 10);
  fill(max(0, mil.tunic[0] - 18), max(0, mil.tunic[1] - 8), max(0, mil.tunic[2] - 6));
  rect(-6, -4, 4, 10);

  // Armor — faction
  fill(mil.armor[0], mil.armor[1], mil.armor[2]);
  rect(-5, -4, 10, 6);
  fill(max(0, mil.armor[0] - 27), max(0, mil.armor[1] - 27), max(0, mil.armor[2] - 25));
  rect(-5, -2, 10, 1);
  rect(-5, 0, 10, 1);
  fill(min(255, mil.armor[0] + 20), min(255, mil.armor[1] + 20), min(255, mil.armor[2] + 20), 80);
  rect(-4, -4, 3, 2);

  // Leather skirt strips
  fill(130, 95, 40);
  for (let i = -2; i <= 2; i++) {
    rect(i * 3 - 1, 2, 2, 4);
  }
  fill(180, 155, 55);
  for (let i = -2; i <= 2; i++) {
    rect(i * 3, 5, 1, 1);
  }

  // Belt
  fill(195, 165, 55);
  rect(-5, 1, 10, 2);
  fill(210, 180, 60);
  rect(-1, 1, 2, 2);

  // Pauldrons — faction armor
  fill(min(255, mil.armor[0] + 10), max(0, mil.armor[1] - 17), max(0, mil.armor[2] - 120));
  rect(-8, -5, 4, 3);
  rect(4, -5, 4, 3);
  fill(min(255, mil.armor[0] + 25), min(255, mil.armor[1] + 3), max(0, mil.armor[2] - 105), 80);
  rect(-7, -5, 2, 1);
  rect(5, -5, 2, 1);

  // Arms
  fill(200, 165, 130);
  rect(-8, -2, 2, 5);
  rect(6, -2, 2, 5);
  fill(max(0, mil.armor[0] - 5), max(0, mil.armor[1] - 32), max(0, mil.armor[2] - 130));
  rect(-8, 0, 2, 3);
  rect(6, 0, 2, 3);

  // Weapon
  if (cen.task === 'fight') {
    let swing = floor(sin(frameCount * 0.2) * 4);
    fill(185, 185, 195);
    rect(6 * f + swing, -13, 2, 11);
    fill(210, 210, 220);
    rect(6 * f + swing, -13, 1, 11);
    fill(195, 165, 55);
    rect(6 * f + swing - 1, -2, 4, 2);
    fill(200, 170, 60);
    rect(6 * f + swing, 0, 2, 1);
  } else {
    fill(90, 65, 30);
    rect(5 * f, 2, 2, 7);
    fill(175, 145, 55);
    rect(5 * f, 1, 2, 2);
  }

  // Shield — faction
  let shX = -7 * f;
  fill(mil.shield[0], mil.shield[1], mil.shield[2]);
  if (mil.shieldShape === 'round') {
    ellipse(shX, 1, 12, 12);
    fill(mil.shieldBoss[0], mil.shieldBoss[1], mil.shieldBoss[2]);
    ellipse(shX, 1, 4, 4);
  } else {
    rect(shX - 4, -5, 8, 13);
    fill(mil.shieldBoss[0], mil.shieldBoss[1], mil.shieldBoss[2]);
    rect(shX - 4, -5, 8, 1);
    rect(shX - 4, 7, 8, 1);
    rect(shX - 4, -5, 1, 13);
    rect(shX + 3, -5, 1, 13);
    fill(180, 178, 185);
    rect(shX - 1, 0, 2, 2);
    fill(mil.shieldBoss[0], mil.shieldBoss[1], mil.shieldBoss[2]);
    rect(shX - 1, -3, 1, 2);
    rect(shX, -1, 1, 2);
    rect(shX - 1, 1, 1, 2);
    rect(shX + 0, 3, 1, 2);
  }

  // Neck
  fill(200, 165, 130);
  rect(-3, -7, 6, 3);

  // Head
  fill(200, 165, 130);
  rect(-4, -11, 8, 6);
  fill(190, 155, 120);
  rect(-4, -6, 2, 1);
  rect(2, -6, 2, 1);

  // Helmet — faction-specific style
  fill(mil.helm[0], mil.helm[1], mil.helm[2]);
  if (fk === 'carthage') {
    // Turban/headwrap
    rect(-5, -14, 10, 6);
    fill(mil.helmCrest[0], mil.helmCrest[1], mil.helmCrest[2]);
    rect(-3, -15, 6, 2);
  } else if (fk === 'egypt') {
    // Nemes headdress
    rect(-5, -13, 10, 4);
    fill(mil.helmCrest[0], mil.helmCrest[1], mil.helmCrest[2]);
    rect(-6, -10, 2, 6);
    rect(4, -10, 2, 6);
    fill(mil.helm[0], mil.helm[1], mil.helm[2]);
    rect(-4, -15, 8, 3);
  } else if (fk === 'greece') {
    // Corinthian helmet
    rect(-5, -13, 10, 5);
    fill(max(0, mil.helm[0] - 10), max(0, mil.helm[1] - 10), max(0, mil.helm[2] - 10));
    rect(-5, -10, 2, 4);
    rect(3, -10, 2, 4);
    fill(mil.helmCrest[0], mil.helmCrest[1], mil.helmCrest[2]);
    rect(-2, -17, 4, 4);
    rect(-1, -19, 2, 2);
  } else {
    // Roman galea
    rect(-5, -13, 10, 4);
    fill(max(0, mil.helm[0] - 10), max(0, mil.helm[1] - 10), max(0, mil.helm[2] - 5));
    rect(-5, -10, 10, 1);
    rect(-5, -10, 2, 4);
    rect(3, -10, 2, 4);
    fill(max(0, mil.helm[0] - 15), max(0, mil.helm[1] - 15), max(0, mil.helm[2] - 10));
    rect(-4, -6, 8, 1);
    // Transverse crest — faction helmCrest
    fill(mil.helmCrest[0], mil.helmCrest[1], mil.helmCrest[2]);
    rect(-6, -15, 12, 2);
    rect(-4, -17, 8, 2);
    let cf = floor(sin(frameCount * 0.1) * 1);
    fill(max(0, mil.helmCrest[0] - 20), max(0, mil.helmCrest[1] - 5), max(0, mil.helmCrest[2] - 3));
    rect(-5, -16 + cf, 2, 3);
    rect(3, -16 - cf, 2, 3);
  }

  // Eyes
  let blinkC = (frameCount % 280 > 273);
  if (blinkC) {
    fill(185, 150, 118);
    rect(-3, -10, 2, 1);
    rect(1, -10, 2, 1);
  } else {
    fill(245, 240, 235);
    rect(-3, -10, 2, 2);
    rect(1, -10, 2, 2);
    fill(35, 25, 18);
    rect(-3 + (f > 0 ? 1 : 0), -10, 1, 1);
    rect(1 + (f > 0 ? 1 : 0), -10, 1, 1);
  }

  // Rank text — faction-appropriate title
  let _ft = (typeof getFactionTerms === 'function') ? getFactionTerms() : { leader: 'CENTURION' };
  fill(195, 170, 60, 100);
  textSize(5);
  textAlign(CENTER);
  text(_ft.leader.toUpperCase() + getCompanionPetCenturionLabel(), 0, -s * 1.3);
  textAlign(LEFT, TOP);

  pop();
}


// ─── COMPANION PETS SYSTEM — personality, leveling, gifts, world reactions ───

// XP needed per level: level 1→2 = 5, 2→3 = 8, etc.
function companionXpForLevel(lvl) {
  return [0, 5, 8, 12, 18, 25, 35, 50, 70, 100][lvl - 1] || 999;
}

function companionLevelName(lvl) {
  if (lvl <= 3) return '';
  if (lvl <= 6) return ' II';
  return ' III';
}

function addCompanionXp(pet, amount) {
  pet.xp += amount;
  let needed = companionXpForLevel(pet.level);
  let leveled = false;
  while (pet.xp >= needed && pet.level < 10) {
    pet.xp -= needed;
    pet.level++;
    leveled = true;
    needed = companionXpForLevel(pet.level);
  }
  return leveled;
}

function getFirstAdoptedCat() {
  if (!state.cats) return null;
  return state.cats.find(c => c.adopted);
}

// ─── COMPANION PROXIMITY XP ───
function updateCompanionPetProximity(dt) {
  let p = state.player;
  let cp = state.companionPets;
  let hour = state.time / 60;
  let isNight = hour >= 21 || hour < 5;

  // Cat XP from first adopted cat being near player
  let cat = getFirstAdoptedCat();
  if (cat) {
    let d = dist(p.x, p.y, cat.x, cat.y);
    if (d < 80) {
      cp.cat.nearPlayerTimer += dt;
      if (cp.cat.nearPlayerTimer > 600) { // every ~10 seconds
        cp.cat.nearPlayerTimer = 0;
        addCompanionXp(cp.cat, 1);
      }
    }
  }

  // Tortoise XP from proximity
  let t = cp.tortoise;
  let td = dist(p.x, p.y, t.x, t.y);
  if (td < 100) {
    t.nearPlayerTimer += dt;
    if (t.nearPlayerTimer > 600) {
      t.nearPlayerTimer = 0;
      addCompanionXp(t, 1);
    }
  }

  // Crow XP from proximity
  let cr = cp.crow;
  let crd = dist(p.x, p.y, cr.x, cr.y);
  if (crd < 120) {
    cr.nearPlayerTimer += dt;
    if (cr.nearPlayerTimer > 600) {
      cr.nearPlayerTimer = 0;
      addCompanionXp(cr, 1);
    }
  }

  // Centurion XP from proximity (already follows player)
  let cen = cp.centurion;
  let cend = dist(p.x, p.y, state.centurion.x, state.centurion.y);
  if (cend < 60) {
    cen.nearPlayerTimer += dt;
    if (cen.nearPlayerTimer > 600) {
      cen.nearPlayerTimer = 0;
      let _cenLvd = addCompanionXp(cen, 1);
      if (_cenLvd && typeof applyCenturionLevelStats === 'function') applyCenturionLevelStats();
    }
  }

  // Decrement gift cooldowns
  if (cp.cat.giftCooldown > 0) cp.cat.giftCooldown -= dt;
  if (cp.tortoise.giftCooldown > 0) cp.tortoise.giftCooldown -= dt;
  if (cp.crow.giftCooldown > 0) cp.crow.giftCooldown -= dt;
  if (cp.centurion.giftCooldown > 0) cp.centurion.giftCooldown -= dt;
}

// ─── TORTOISE UPDATE ───
function updateTortoise(dt) {
  let t = state.companionPets.tortoise;
  let hour = state.time / 60;
  let isNight = hour >= 21 || hour < 5;
  let isStorm = state.weather.type === 'storm' || stormActive;

  // Shell during storms
  if (isStorm && t.behavior !== 'shell') {
    t.behavior = 'shell'; t.behaviorTimer = 0; t.vx = 0; t.vy = 0;
  }
  if (t.behavior === 'shell' && !isStorm) {
    t.behavior = 'idle'; t.behaviorTimer = random(60, 200);
  }

  // Sleep at night — find sunny spot (south side of island)
  if (isNight) {
    if (!t.sleepPos) t.sleepPos = { x: WORLD.islandCX + 60, y: WORLD.islandCY + 40 };
    let dx = t.sleepPos.x - t.x, dy = t.sleepPos.y - t.y;
    let d = sqrt(dx * dx + dy * dy);
    if (d > 10) {
      t.vx = (dx / d) * 0.3; t.vy = (dy / d) * 0.3;
    } else { t.vx = 0; t.vy = 0; t.behavior = 'sleeping'; }
    t.x += t.vx * dt; t.y += t.vy * dt;
    return;
  }
  t.sleepPos = null;

  t.behaviorTimer -= dt;

  switch (t.behavior) {
    case 'idle':
      t.vx *= 0.9; t.vy *= 0.9;
      if (t.behaviorTimer <= 0) {
        if (random() < 0.3 && t.level >= 2 && t.findTimer <= 0 && t.lastFindDay !== state.day) {
          t.behavior = 'digging'; t.behaviorTimer = 120;
        } else {
          t.behavior = 'exploring'; t.behaviorTimer = random(100, 250);
          t.vx = random(-0.2, 0.2); t.vy = random(-0.1, 0.1);
          t.facing = t.vx > 0 ? 1 : -1;
        }
      }
      break;
    case 'exploring':
      t.x += t.vx * dt; t.y += t.vy * dt;
      if (!isOnIsland(t.x, t.y)) { t.vx *= -1; t.vy *= -1; t.x += t.vx * 5; t.y += t.vy * 5; }
      if (t.behaviorTimer <= 0) { t.behavior = 'idle'; t.behaviorTimer = random(60, 180); t.vx = 0; t.vy = 0; }
      break;
    case 'digging':
      t.vx = 0; t.vy = 0;
      if (t.behaviorTimer <= 0) {
        // Found buried item!
        let items = ['seed', 'crystal', 'stone'];
        let found = items[floor(random(items.length))];
        if (found === 'seed') { state.seeds++; addFloatingText(w2sX(t.x), w2sY(t.y) - 15, '+1 Seed (found!)', '#88cc44'); }
        else if (found === 'crystal') { state.crystals++; addFloatingText(w2sX(t.x), w2sY(t.y) - 15, '+1 Crystal (found!)', C.crystalGlow); }
        else { state.stone++; addFloatingText(w2sX(t.x), w2sY(t.y) - 15, '+1 Stone (found!)', '#aaaaaa'); }
        spawnParticles(t.x, t.y, 'collect', 4);
        t.lastFindDay = state.day;
        t.findTimer = 3600;
        t.behavior = 'idle'; t.behaviorTimer = random(120, 300);
      }
      break;
    case 'shell':
      t.vx = 0; t.vy = 0;
      t.shellTimer += dt;
      break;
    case 'sleeping':
      t.vx = 0; t.vy = 0;
      break;
  }

  if (t.findTimer > 0) t.findTimer -= dt;
}

// ─── CROW UPDATE ───
function updateCrow(dt) {
  let cr = state.companionPets.crow;
  let p = state.player;
  let hour = state.time / 60;
  let isNight = hour >= 21 || hour < 5;

  cr.circlePhase += 0.008 * dt;
  if (cr.cawTimer > 0) cr.cawTimer -= dt;
  if (cr.bringTimer > 0) cr.bringTimer -= dt;

  // Sleep at night — perch on highest building
  if (isNight) {
    let highest = null, bestY = 9999;
    state.buildings.forEach(b => { if (b.y < bestY) { bestY = b.y; highest = b; } });
    if (highest) {
      cr.perchTarget = { x: highest.x + 10, y: highest.y - 15 };
    } else {
      cr.perchTarget = { x: WORLD.islandCX, y: WORLD.islandCY - 80 };
    }
    let dx = cr.perchTarget.x - cr.x, dy = cr.perchTarget.y - cr.y;
    let d = sqrt(dx * dx + dy * dy);
    if (d > 8) {
      cr.vx = (dx / d) * 1.5; cr.vy = (dy / d) * 1.5;
      cr.x += cr.vx * dt; cr.y += cr.vy * dt;
    } else {
      cr.landed = true; cr.vx = 0; cr.vy = 0; cr.behavior = 'sleeping';
    }
    return;
  }
  cr.perchTarget = null;

  // Warn about enemies — caw before combat on conquest island
  if (state.conquest.active && state.conquest.enemies) {
    let nearEnemy = state.conquest.enemies.find(e => e.state !== 'dead' && dist(p.x, p.y, e.x, e.y) < 200);
    if (nearEnemy && cr.cawTimer <= 0) {
      addFloatingText(w2sX(cr.x), w2sY(cr.y) - 20, 'CAW! CAW!', '#444444');
      cr.cawTimer = 300;
      if (snd) snd.playSFX('alert');
    }
  }

  // Bring items at high level (7+), once per day
  if (cr.level >= 7 && cr.lastBringDay !== state.day && cr.bringTimer <= 0 && random() < 0.0005) {
    let gifts = [
      { item: 'seeds', amount: 2, text: '+2 Seeds', color: '#88cc44' },
      { item: 'crystals', amount: 1, text: '+1 Crystal', color: C.crystalGlow },
      { item: 'gold', amount: 1, text: '+1 Gold (shiny!)', color: '#ffcc44' },
    ];
    let gift = gifts[floor(random(gifts.length))];
    state[gift.item] = (state[gift.item] || 0) + gift.amount;
    addFloatingText(w2sX(cr.x), w2sY(cr.y) - 15, gift.text + ' (crow gift)', gift.color);
    spawnParticles(cr.x, cr.y, 'collect', 4);
    cr.lastBringDay = state.day;
    cr.bringTimer = 3600;
  }

  cr.behaviorTimer -= dt;

  switch (cr.behavior) {
    case 'circling':
      // Circle overhead near player
      let radius = 60 + sin(cr.circlePhase * 0.5) * 20;
      let targetX = p.x + cos(cr.circlePhase) * radius;
      let targetY = p.y - 50 + sin(cr.circlePhase) * radius * 0.3;
      cr.vx = (targetX - cr.x) * 0.04;
      cr.vy = (targetY - cr.y) * 0.04;
      cr.x += cr.vx * dt; cr.y += cr.vy * dt;
      cr.facing = cr.vx > 0 ? 1 : -1;
      cr.landed = false;
      if (cr.behaviorTimer <= 0) {
        // Land on a tree
        let tree = state.trees.find(t => t.alive);
        if (tree && random() < 0.6) {
          cr.behavior = 'landing'; cr.perchTarget = { x: tree.x, y: tree.y - 20 };
          cr.behaviorTimer = random(200, 400);
        } else {
          cr.behaviorTimer = random(200, 500);
        }
      }
      break;
    case 'landing':
      if (cr.perchTarget) {
        let dx = cr.perchTarget.x - cr.x, dy = cr.perchTarget.y - cr.y;
        let d = sqrt(dx * dx + dy * dy);
        if (d > 5) {
          cr.vx = (dx / d) * 2; cr.vy = (dy / d) * 2;
          cr.x += cr.vx * dt; cr.y += cr.vy * dt;
        } else {
          cr.landed = true; cr.vx = 0; cr.vy = 0;
          cr.behavior = 'perched'; cr.behaviorTimer = random(200, 500);
        }
      } else { cr.behavior = 'circling'; cr.behaviorTimer = random(200, 400); }
      break;
    case 'perched':
      cr.vx = 0; cr.vy = 0;
      if (cr.behaviorTimer <= 0) {
        cr.behavior = 'circling'; cr.behaviorTimer = random(200, 500); cr.landed = false;
      }
      break;
    case 'idle':
    default:
      cr.behavior = 'circling'; cr.behaviorTimer = random(200, 500);
      break;
  }
}

// ─── CAT PERSONALITY UPDATE ───
function updateCatPersonality(dt) {
  let cp = state.companionPets.cat;
  let cat = getFirstAdoptedCat();
  if (!cat) return;

  let hour = state.time / 60;
  let isNight = hour >= 21 || hour < 5;

  // Sleep at night near fire/hearth
  if (isNight) {
    let hearth = state.buildings.find(b => b.type === 'torch' || b.type === 'brazier');
    if (hearth && !cp.sleepPos) cp.sleepPos = { x: hearth.x + random(-10, 10), y: hearth.y + random(5, 15) };
    if (!cp.sleepPos) cp.sleepPos = { x: WORLD.islandCX + 20, y: WORLD.islandCY + 10 };
    let dx = cp.sleepPos.x - cat.x, dy = cp.sleepPos.y - cat.y;
    let d = sqrt(dx * dx + dy * dy);
    if (d > 8) { cat.vx = (dx / d) * 0.8; cat.vy = (dy / d) * 0.8; }
    else { cat.vx = 0; cat.vy = 0; cat.state = 'sitting'; }
    cp.behavior = 'sleeping';
    return;
  }
  cp.sleepPos = null;

  // Hiss at enemies on conquest island
  if (state.conquest.active && state.conquest.enemies) {
    let nearEnemy = state.conquest.enemies.find(e => e.state !== 'dead' && dist(cat.x, cat.y, e.x, e.y) < 60);
    if (nearEnemy && cp.behaviorTimer <= 0) {
      addFloatingText(w2sX(cat.x), w2sY(cat.y) - 15, 'HISS!', '#ff6644');
      cp.behaviorTimer = 180;
    }
  }

  cp.behaviorTimer -= dt;
  if (cp.behaviorTimer > 0) return;

  // Personality behaviors based on level
  if (cp.level >= 4 && random() < 0.002) {
    // Chase butterflies
    cp.behavior = 'chasing';
    cp.behaviorTimer = 120;
    cat.state = 'walking';
    cat.vx = random(-1.2, 1.2);
    cat.vy = random(-0.6, 0.6);
    cat.facing = cat.vx > 0 ? 1 : -1;
    cat.timer = 120;
    // Butterfly particles
    for (let i = 0; i < 3; i++) {
      particles.push({
        x: cat.x + random(-20, 20), y: cat.y + random(-20, -5),
        vx: random(-0.5, 0.5), vy: random(-0.8, -0.2),
        life: random(40, 80), maxLife: 80,
        type: 'sundust', size: random(2, 4),
        r: 255, g: 200, b: 100, phase: random(TWO_PI), world: true,
      });
    }
  } else if (random() < 0.001) {
    // Nap in sunbeam
    cp.behavior = 'napping';
    cp.behaviorTimer = 300;
    cat.state = 'sitting';
    cat.timer = 300;
  } else if (cp.level >= 7 && random() < 0.0008) {
    // Sit on building
    let bld = state.buildings[floor(random(state.buildings.length))];
    if (bld) {
      cat.x = bld.x + random(-5, 5); cat.y = bld.y - 5;
      cat.state = 'sitting'; cat.timer = random(200, 400);
      cp.behavior = 'onbuilding';
      cp.behaviorTimer = 400;
    }
  }
}

// ─── CENTURION PERSONALITY UPDATE ───
function updateCenturionPersonality(dt) {
  let cp = state.companionPets.centurion;
  let cen = state.centurion;
  let p = state.player;
  let hour = state.time / 60;
  let isNight = hour >= 21 || hour < 5;

  // Auto-attack enemies at level 5+ (enhance existing combat)
  if (cp.level >= 5 && !state.conquest.active) {
    // Check for home island enemies (random events, etc.)
    if (state.activeEvent && state.activeEvent.enemies) {
      let nearEnemy = state.activeEvent.enemies.find(e => e.hp > 0 && dist(cen.x, cen.y, e.x, e.y) < 80);
      if (nearEnemy && cen.attackTimer <= 0) {
        cen.attackTimer = cen.attackCooldown;
        nearEnemy.hp -= cen.attackDamage;
        addFloatingText(w2sX(nearEnemy.x), w2sY(nearEnemy.y) - 15, '-' + cen.attackDamage, '#ffaa44');
        spawnParticles(nearEnemy.x, nearEnemy.y, 'combat', 2);
      }
    }
  }

  // Sleep behavior — guard at gate
  if (isNight) {
    // Find castrum or gate
    let gate = state.buildings.find(b => b.type === 'arch' || b.type === 'castrum');
    if (gate && !cp.sleepPos) cp.sleepPos = { x: gate.x, y: gate.y + 10 };
    if (!cp.sleepPos) cp.sleepPos = { x: WORLD.islandCX + getSurfaceRX() * 0.7, y: WORLD.islandCY };
    cp.behavior = 'guarding';
    return;
  }
  cp.sleepPos = null;

  cp.behaviorTimer -= dt;
  if (cp.behaviorTimer > 0) return;

  // Salute player when nearby
  if (cp.saluteTimer <= 0 && dist(p.x, p.y, cen.x, cen.y) < 40) {
    if (random() < 0.003) {
      cp.saluteTimer = 600;
      cp.behavior = 'saluting';
      cp.behaviorTimer = 60;
      addFloatingText(w2sX(cen.x), w2sY(cen.y) - 25, 'Ave!', '#ffcc44');
    }
  }
  if (cp.saluteTimer > 0) cp.saluteTimer -= dt;

  // Patrol settlement at level 4+
  if (cp.level >= 4 && cp.patrolTimer <= 0 && cen.task === 'follow') {
    if (random() < 0.001) {
      cp.behavior = 'patrolling';
      cp.behaviorTimer = 300;
      cp.patrolTimer = 1800;
    }
  }
  if (cp.patrolTimer > 0) cp.patrolTimer -= dt;

  // Train at castrum at level 7+
  if (cp.level >= 7 && cp.trainTimer <= 0) {
    let castrum = state.buildings.find(b => b.type === 'castrum');
    if (castrum && random() < 0.0005) {
      cp.behavior = 'training';
      cp.behaviorTimer = 200;
      cp.trainTimer = 3600;
      addFloatingText(w2sX(castrum.x), w2sY(castrum.y) - 15, '*training*', '#ccaa44');
    }
  }
  if (cp.trainTimer > 0) cp.trainTimer -= dt;
}

// ─── COMPANION GIFT SYSTEM ───
function tryCompanionGift(wx, wy) {
  let p = state.player;
  let cp = state.companionPets;

  // Cat: fish → +1 XP
  let cat = getFirstAdoptedCat();
  if (cat && cp.cat.giftCooldown <= 0 && dist(wx, wy, cat.x, cat.y) < 25 && dist(p.x, p.y, cat.x, cat.y) < 50) {
    if (state.fish > 0) {
      state.fish--;
      cp.cat.giftCooldown = 300;
      let leveled = addCompanionXp(cp.cat, 1);
      addFloatingText(w2sX(cat.x), w2sY(cat.y) - 15, '*purrs*', '#ffaacc');
      spawnCompanionHeart(cat.x, cat.y);
      if (leveled) addFloatingText(w2sX(cat.x), w2sY(cat.y) - 28, 'Cat Level ' + cp.cat.level + '!', '#ffcc44');
      return true;
    }
  }

  // Tortoise: crops (harvest) → +1 XP
  let t = cp.tortoise;
  if (t.giftCooldown <= 0 && dist(wx, wy, t.x, t.y) < 25 && dist(p.x, p.y, t.x, t.y) < 50) {
    if (state.harvest > 0) {
      state.harvest--;
      t.giftCooldown = 300;
      let leveled = addCompanionXp(t, 1);
      addFloatingText(w2sX(t.x), w2sY(t.y) - 15, '*happy wiggle*', '#88cc44');
      spawnCompanionHeart(t.x, t.y);
      if (leveled) addFloatingText(w2sX(t.x), w2sY(t.y) - 28, 'Tortoise Level ' + t.level + '!', '#ffcc44');
      return true;
    }
  }

  // Crow: seeds → +1 XP
  let cr = cp.crow;
  if (cr.giftCooldown <= 0 && dist(wx, wy, cr.x, cr.y) < 30 && dist(p.x, p.y, cr.x, cr.y) < 80) {
    if (state.seeds > 0) {
      state.seeds--;
      cr.giftCooldown = 300;
      let leveled = addCompanionXp(cr, 1);
      addFloatingText(w2sX(cr.x), w2sY(cr.y) - 15, '*does a flip!*', '#8888cc');
      spawnCompanionHeart(cr.x, cr.y);
      if (leveled) addFloatingText(w2sX(cr.x), w2sY(cr.y) - 28, 'Crow Level ' + cr.level + '!', '#ffcc44');
      return true;
    }
  }

  // Centurion: gold → +1 XP
  let cen = state.centurion;
  if (cp.centurion.giftCooldown <= 0 && dist(wx, wy, cen.x, cen.y) < 25 && dist(p.x, p.y, cen.x, cen.y) < 50) {
    if (state.gold > 0) {
      state.gold--;
      cp.centurion.giftCooldown = 300;
      let leveled = addCompanionXp(cp.centurion, 1);
      if (leveled && typeof applyCenturionLevelStats === 'function') applyCenturionLevelStats();
      addFloatingText(w2sX(cen.x), w2sY(cen.y) - 25, '*salutes*', '#ffcc44');
      spawnCompanionHeart(cen.x, cen.y);
      if (leveled) addFloatingText(w2sX(cen.x), w2sY(cen.y) - 38, getFactionTerms().leader + ' Level ' + cp.centurion.level + '!', '#ffcc44');
      return true;
    }
  }

  return false;
}

function spawnCompanionHeart(wx, wy) {
  particles.push({
    x: wx, y: wy - 10,
    vx: random(-0.3, 0.3), vy: -1.0,
    life: 50, maxLife: 50,
    type: 'heart', size: 6,
    r: 255, g: 80, b: 120, world: true,
  });
}

// ─── MASTER COMPANION PETS UPDATE ───
function updateCompanionPets(dt) {
  if (!state.companionPets) return;
  updateCompanionPetProximity(dt);
  updateTortoise(dt);
  updateCrow(dt);
  updateCatPersonality(dt);
  updateCenturionPersonality(dt);
}

// ─── TORTOISE DRAW ───
function drawTortoise() {
  let t = state.companionPets.tortoise;
  let sx = w2sX(t.x), sy = w2sY(t.y);
  let bob = floor(sin(frameCount * 0.03) * 1);
  let cp = state.companionPets.tortoise;

  push();
  translate(floor(sx), floor(sy + bob));
  scale(t.facing, 1);
  noStroke();

  // Shadow
  fill(0, 0, 0, 25); rect(-8, 5, 16, 3);

  if (t.behavior === 'shell' || t.behavior === 'sleeping') {
    // Tucked in shell — dome shape
    fill(80, 110, 50); rect(-7, -3, 14, 8); // shell
    fill(90, 125, 55); rect(-6, -4, 12, 3); // shell top
    fill(70, 95, 45); // shell pattern
    rect(-4, -2, 3, 2); rect(1, -2, 3, 2); rect(-2, 0, 4, 2);
    if (t.behavior === 'sleeping') {
      // Zzz
      fill(200, 200, 255, 120); textSize(5); textAlign(CENTER);
      text('z', 8, -8 + sin(frameCount * 0.05) * 2);
      textAlign(LEFT, TOP);
    }
  } else {
    // Walking/idle tortoise
    // Legs
    fill(110, 140, 70);
    let walk = t.behavior === 'exploring' ? floor(sin(frameCount * 0.06) * 1) : 0;
    rect(-8, 2, 3, 3 + walk); rect(5, 2, 3, 3 - walk); // front/back legs
    rect(-6, 3, 2, 2); rect(4, 3, 2, 2);

    // Shell body
    fill(80, 110, 50); rect(-6, -4, 12, 8);
    fill(90, 125, 55); rect(-5, -5, 10, 3); // shell dome
    // Shell pattern — hexagonal
    fill(70, 95, 45);
    rect(-3, -3, 2, 2); rect(1, -3, 2, 2);
    rect(-4, -1, 2, 2); rect(0, -1, 2, 2); rect(3, -1, 2, 2);

    // Head
    fill(120, 150, 80);
    rect(6, -2, 4, 3);
    // Eye
    fill(30, 30, 20); rect(8, -1, 1, 1);

    // Tail
    fill(110, 140, 70); rect(-8, 0, 2, 1);

    // Digging animation
    if (t.behavior === 'digging' && frameCount % 8 < 4) {
      fill(140, 120, 80, 150);
      rect(5, 3, 3, 2); // dirt particles
      rect(8, 1, 2, 2);
    }
  }

  pop();

  // Label with level
  noStroke();
  fill(80, 110, 50, 140); textSize(6); textAlign(CENTER, TOP);
  text('TORTOISE' + companionLevelName(cp.level) + ' Lv' + cp.level, floor(sx), floor(sy + 10));
  textAlign(LEFT, TOP);
}

// ─── CROW DRAW ───
function drawCrow() {
  let cr = state.companionPets.crow;
  let sx = w2sX(cr.x), sy = w2sY(cr.y);

  push();
  translate(floor(sx), floor(sy));
  scale(cr.facing, 1);
  noStroke();

  if (cr.landed || cr.behavior === 'perched' || cr.behavior === 'sleeping') {
    // Perched crow
    fill(0, 0, 0, 25); rect(-4, 5, 8, 2); // shadow
    // Body
    fill(30, 30, 35); rect(-4, -2, 8, 6);
    // Head
    fill(35, 35, 40); rect(-2, -6, 5, 4);
    // Beak
    fill(60, 55, 30); rect(3, -4, 3, 2);
    // Eye
    fill(180, 180, 200); rect(1, -5, 1, 1);
    // Tail
    fill(25, 25, 30); rect(-6, 1, 2, 4);
    // Legs
    fill(50, 45, 30); rect(-2, 4, 1, 3); rect(1, 4, 1, 3);
    // Sleeping
    if (cr.behavior === 'sleeping') {
      fill(200, 200, 255, 120); textSize(5); textAlign(CENTER);
      text('z', 5, -10 + sin(frameCount * 0.05) * 2);
      textAlign(LEFT, TOP);
    }
  } else {
    // Flying crow — wings spread
    let wingPhase = sin(frameCount * 0.15) * 8;
    // Body
    fill(30, 30, 35); rect(-3, -1, 6, 4);
    // Head
    fill(35, 35, 40); rect(3, -3, 4, 3);
    // Beak
    fill(60, 55, 30); rect(7, -2, 2, 1);
    // Eye
    fill(180, 180, 200); rect(5, -2, 1, 1);
    // Wings
    fill(25, 25, 30);
    // Left wing
    beginShape();
    vertex(-3, 0); vertex(-10, -3 + wingPhase); vertex(-6, 1);
    endShape(CLOSE);
    // Right wing
    beginShape();
    vertex(-3, 0); vertex(-10, -3 - wingPhase); vertex(-6, 1);
    endShape(CLOSE);
    // Upper wings
    fill(40, 40, 45);
    rect(-8, -2 + floor(wingPhase * 0.3), 5, 1);
    // Tail
    fill(25, 25, 30); rect(-5, 1, 2, 3);
  }

  pop();

  // Label with level
  noStroke();
  fill(50, 50, 60, 140); textSize(6); textAlign(CENTER, TOP);
  text('CROW' + companionLevelName(cr.level) + ' Lv' + cr.level, floor(sx), floor(sy + 8));
  textAlign(LEFT, TOP);
}

// ─── COMPANION LEVEL DISPLAY (patched into existing draws) ───
function getCompanionPetCatLabel() {
  let cp = state.companionPets;
  if (!cp) return '';
  return ' Lv' + cp.cat.level;
}

function getCompanionPetCenturionLabel() {
  let cp = state.companionPets;
  if (!cp) return '';
  return ' Lv' + cp.centurion.level;
}

function drawDialogBubble(x, y, txt) {
  textSize(8.5);
  let maxW = 160;
  let lineH = 11;
  let words = txt.split(' ');
  let lines = [''];
  words.forEach(w => {
    let test = lines[lines.length - 1] + w + ' ';
    if (textWidth(test) > maxW) lines.push(w + ' ');
    else lines[lines.length - 1] = test;
  });
  let bh = lines.length * lineH + 12;
  let bw = min(maxW + 16, 180);

  fill(color(C.hudBg));
  stroke(color(C.hudBorder));
  strokeWeight(1);
  rect(x - bw / 2, y - bh, bw, bh, 5);
  fill(color(C.hudBg));
  noStroke();
  triangle(x - 5, y, x + 5, y, x, y + 8);

  fill(color(C.textBright));
  noStroke();
  textAlign(LEFT, TOP);
  textSize(8.5);
  lines.forEach((ln, i) => {
    text(ln, x - bw / 2 + 8, y - bh + 6 + i * lineH);
  });
  textAlign(CENTER, CENTER);
}

function drawHeart(x, y, s) {
  beginShape();
  vertex(x, y - s * 0.3);
  bezierVertex(x - s, y - s, x - s * 1.5, y + s * 0.3, x, y + s);
  bezierVertex(x + s * 1.5, y + s * 0.3, x + s, y - s, x, y - s * 0.3);
  endShape(CLOSE);
}

// ─── PARTICLES ────────────────────────────────────────────────────────────
function updateParticles(dt) {
  let bright = getSkyBrightness();

  if (frameCount % 12 === 0) {
    // Spawn near player (visible area)
    let spawnX = state.player.x + random(-width * 0.5, width * 0.5);
    let spawnY = state.player.y + random(-height * 0.4, height * 0.3);

    if (bright > 0.3) {
      particles.push({
        x: spawnX, y: spawnY,
        vx: random(-0.3, 0.3), vy: random(-0.8, -0.2),
        life: random(60, 120), maxLife: 120,
        type: 'mote', size: random(1, 3),
        r: 220, g: 160, b: 40, world: true,
      });
    } else {
      particles.push({
        x: spawnX, y: spawnY,
        vx: random(-0.4, 0.4), vy: random(-0.3, 0.3),
        life: random(80, 160), maxLife: 160,
        type: 'firefly', size: random(2, 4),
        r: 80, g: 255, b: 160, phase: random(TWO_PI), world: true,
      });
    }
  }

  // Butterflies — daytime, near farm (count with early exit instead of full scan)
  let _bflyCount = 0;
  if (bright > 0.4 && frameCount % 45 === 0) {
    for (let i = 0; i < particles.length && _bflyCount < 4; i++) { if (particles[i].type === 'butterfly') _bflyCount++; }
  }
  if (_bflyCount < 3 && bright > 0.4 && frameCount % 60 === 0) {
    let bx = WORLD.islandCX - 340 + random(-100, 100);
    let by = WORLD.islandCY + random(-40, 30);
    particles.push({
      x: bx, y: by,
      vx: random(-0.5, 0.5), vy: random(-0.3, 0.1),
      life: random(200, 400), maxLife: 400,
      type: 'butterfly', size: random(3, 5),
      r: random([200, 220, 180]), g: random([80, 120, 60]), b: random([40, 160, 200]),
      phase: random(TWO_PI), world: true,
    });
  }

  // Sun dust motes — golden sparkles in bright light
  if (bright > 0.6 && frameCount % 20 === 0) {
    let dx = state.player.x + random(-150, 150);
    let dy = state.player.y + random(-100, 80);
    if (isOnIsland(dx, dy)) {
      particles.push({
        x: dx, y: dy,
        vx: random(-0.1, 0.1), vy: random(-0.5, -0.1),
        life: random(40, 80), maxLife: 80,
        type: 'sundust', size: random(1, 2.5),
        r: 255, g: 230, b: 140, world: true,
      });
    }
  }

  // Water ripples when player walks near shore  if (state.player.moving && frameCount % 12 === 0) {    let _rpx = state.player.x, _rpy = state.player.y;    let _rdx = (_rpx - WORLD.islandCX) / getSurfaceRX();    let _rdy = (_rpy - WORLD.islandCY) / getSurfaceRY();    let _rd = _rdx * _rdx + _rdy * _rdy;    if (_rd > 0.85 && _rd <= 1.0) {      let _rea = atan2(_rpy - WORLD.islandCY, _rpx - WORLD.islandCX);      particles.push({        x: _rpx + cos(_rea) * 15, y: _rpy + sin(_rea) * 10,        vx: 0, vy: 0, life: 30, maxLife: 30, type: 'ripple', size: 3,        r: 120, g: 190, b: 230, world: true,      });    }  }  // Extra fireflies at dusk/dawn  let _jHour = (state.time || 720) / 60;  if ((_jHour >= 18 && _jHour <= 20) || (_jHour >= 5 && _jHour <= 6.5)) {    if (frameCount % 8 === 0) {      let _jfx = state.player.x + random(-200, 200);      let _jfy = state.player.y + random(-120, 80);      if (isOnIsland(_jfx, _jfy)) {        particles.push({          x: _jfx, y: _jfy, vx: random(-0.3, 0.3), vy: random(-0.2, 0.2),          life: random(100, 200), maxLife: 200, type: 'firefly', size: random(2, 4),          r: 80, g: 255, b: 160, phase: random(TWO_PI), world: true,        });      }    }  }
  // Storm rain particles (supplemental — main rain is in _drawStormRain)
  if (stormActive && frameCount % 2 === 0) {
    for (let _ri = 0; _ri < 2; _ri++) {
      particles.push({
        x: random(width), y: random(-20, height * 0.3),
        vx: random(-2, -4), vy: random(3, 7),
        life: random(30, 70), maxLife: 70,
        type: 'rain', size: random(1, 2),
        r: 100, g: 160, b: 220, world: false,
      });
    }
  }

  // Hard cap: prevent particle explosion
  if (particles.length > _particleCap) particles.splice(0, particles.length - (_particleCap - 30));

  particles.forEach(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    // Gravity for physics particles
    if (p.gravity) p.vy += p.gravity * dt;
    if (p.type === 'firefly') {
      p.vx += random(-0.05, 0.05);
      p.vy += random(-0.05, 0.05);
    }
    if (p.type === 'butterfly') {
      p.vx += random(-0.08, 0.08);
      p.vy += sin(frameCount * 0.1 + p.phase) * 0.06;
      p.vx = constrain(p.vx, -0.8, 0.8);
      p.vy = constrain(p.vy, -0.5, 0.3);
    }
  });
  // In-place compaction to avoid new array allocation
  let _pw = 0;
  for (let _pr = 0; _pr < particles.length; _pr++) {
    if (particles[_pr].life > 0) { particles[_pw++] = particles[_pr]; }
  }
  particles.length = _pw;
}

function drawParticles() {
  if (_fpsSmooth < 25) return; // skip rendering when FPS critically low
  noStroke();
  for (let _pi = 0; _pi < particles.length; _pi++) { let p = particles[_pi];
    let a = map(p.life, 0, p.maxLife, 0, 1);
    let px = p.world ? w2sX(p.x) : p.x;
    let py = p.world ? w2sY(p.y) : p.y;
    // Cull offscreen particles
    if (px < -50 || px > width + 50 || py < -50 || py > height + 50) continue;

    if (p.type === 'mote') {
      let s = floor(p.size * a);
      fill(p.r, p.g, p.b, 160 * a);
      rect(floor(px) - s, floor(py) - s, s * 2, s * 2);
    } else if (p.type === 'firefly') {
      let flicker = sin(frameCount * 0.2 + p.phase) * 0.5 + 0.5;
      let fpx = floor(px), fpy = floor(py);
      let s = floor(p.size * flicker * a);
      // Cross glow
      fill(p.r, p.g, p.b, 40 * a * flicker);
      rect(fpx - 1, fpy - p.size * 3, 2, p.size * 6);
      rect(fpx - p.size * 3, fpy - 1, p.size * 6, 2);
      // Core pixel
      fill(p.r, p.g, p.b, 200 * a * flicker);
      rect(fpx - s, fpy - s, s * 2, s * 2);
    } else if (p.type === 'dust') {
      fill(p.r, p.g, p.b, 100 * a);
      rect(floor(px), floor(py), max(1, floor(p.size * a)), max(1, floor(p.size * a)));
    } else if (p.type === 'butterfly') {
      let wingFlap = floor(sin(frameCount * 0.3 + p.phase) * 3);
      let fpx = floor(px), fpy = floor(py);
      fill(p.r, p.g, p.b, 200 * a);
      // Left wing — rect pair
      rect(fpx - 4 - wingFlap, fpy - 1, 3, 2);
      rect(fpx - 3 - wingFlap, fpy - 2, 2, 1);
      // Right wing
      rect(fpx + 1 + wingFlap, fpy - 1, 3, 2);
      rect(fpx + 1 + wingFlap, fpy - 2, 2, 1);
      // Body
      fill(40, 30, 20, 200 * a);
      rect(fpx, fpy - 1, 1, 3);
    } else if (p.type === 'sundust') {
      let sparkle = floor(sin(frameCount * 0.15 + p.phase) * 2 + 2);
      fill(p.r, p.g, p.b, 120 * a);
      // Cross sparkle
      let fpx = floor(px), fpy = floor(py);
      rect(fpx, fpy - sparkle, 1, sparkle * 2);
      rect(fpx - sparkle, fpy, sparkle * 2, 1);
    } else if (p.type === 'rain') {
      // Rain stays as line — pixel-perfect already
      fill(p.r, p.g, p.b, 120 * a);
      let len = floor(abs(p.vy) * 3);
      rect(floor(px), floor(py), max(1, floor(p.size)), len);
    } else if (p.type === 'harvest_burst') {
      let fpx = floor(px), fpy = floor(py);
      let s = max(1, floor(p.size * a));
      // Outer pixel glow cross
      fill(p.r, p.g, p.b, 60 * a * 0.4);
      rect(fpx - 1, fpy - s * 2, 2, s * 4);
      rect(fpx - s * 2, fpy - 1, s * 4, 2);
      // Core rect
      fill(p.r, p.g, p.b, 220 * a);
      rect(fpx - s, fpy - s, s * 2, s * 2);
      // Bright center pixel
      fill(255, 255, 220, 255 * a);
      rect(fpx, fpy, 1, 1);
    } else if (p.type === 'pulse_ring') {
      // Expanding pixel ring — 4 rects forming hollow square
      let ringSize = floor((1 - a) * 50 + p.size);
      let fpx = floor(px), fpy = floor(py);
      let thick = max(1, floor(2 * a));
      fill(p.r, p.g, p.b, 180 * a);
      rect(fpx - ringSize, fpy - ringSize, ringSize * 2, thick); // top
      rect(fpx - ringSize, fpy + ringSize, ringSize * 2, thick); // bottom
      rect(fpx - ringSize, fpy - ringSize, thick, ringSize * 2); // left
      rect(fpx + ringSize, fpy - ringSize, thick, ringSize * 2); // right
    } else if (p.type === 'crystal_shard') {
      let fpx = floor(px), fpy = floor(py);
      let s = max(1, floor(p.size * a));
      // Outer glow cross
      fill(p.r, p.g, p.b, 40 * a);
      rect(fpx - 1, fpy - s * 2, 2, s * 4);
      rect(fpx - s * 2, fpy - 1, s * 4, 2);
      // Diamond shape from stacked rects
      fill(p.r, p.g, p.b, 200 * a);
      rect(fpx, fpy - s, 1, 1);           // top
      rect(fpx - 1, fpy - s + 1, 3, 1);   // row 2
      rect(fpx - 1, fpy, 3, 1);           // middle
      rect(fpx - 1, fpy + 1, 3, 1);       // row 4
      rect(fpx, fpy + s, 1, 1);           // bottom
    } else if (p.type === 'wood_chip') {
      let s = max(1, floor(p.size * a));
      fill(p.r, p.g, p.b, 220 * a);
      rect(floor(px) - s, floor(py), s * 2, max(1, floor(p.size * 0.4 * a)));
    } else if (p.type === 'heart') {
      let hs = max(2, floor(p.size * a));
      let fpx = floor(px), fpy = floor(py);
      fill(p.r, p.g, p.b, 220 * a);
      // Pixel heart: top bumps + triangle
      rect(fpx - hs, fpy - hs, hs, hs);         // left bump
      rect(fpx + 1, fpy - hs, hs, hs);           // right bump
      rect(fpx - hs, fpy, hs * 2 + 1, 1);        // middle row
      rect(fpx - hs + 1, fpy + 1, hs * 2 - 1, 1); // taper
      rect(fpx, fpy + 2, 1, 1);                    // bottom point
    } else if (p.type === 'loot_coin') {
      let tumble = floor(sin((p.spin || 0.1) * frameCount) * 2);
      let fpx = floor(px), fpy = floor(py);
      let s = max(1, floor(p.size * a));
      // Cross glow
      fill(p.r, p.g, p.b, 40 * a);
      rect(fpx - 1, fpy - s * 2, 2, s * 4);
      rect(fpx - s * 2, fpy - 1, s * 4, 2);
      // Coin rect (width varies with tumble)
      let cw = max(1, s + tumble);
      fill(p.r, p.g, p.b, 240 * a);
      rect(fpx - floor(cw / 2), fpy - s, cw, s * 2);
      // Shine pixel
      fill(255, 255, 220, 180 * a);
      rect(fpx - floor(cw / 2) + 1, fpy - s + 1, 1, 1);
    } else if (p.type === 'golden_wave') {
      // Expanding pixel ring — hollow square
      let ringSize = floor((1 - a) * (p.maxRing || 200) + p.size);
      let fpx = floor(px), fpy = floor(py);
      let thick = max(1, floor(3 * a + 1));
      let rySize = floor(ringSize * 0.6);
      fill(p.r, p.g, p.b, 200 * a);
      rect(fpx - ringSize, fpy - rySize, ringSize * 2, thick);
      rect(fpx - ringSize, fpy + rySize, ringSize * 2, thick);
      rect(fpx - ringSize, fpy - rySize, thick, rySize * 2);
      rect(fpx + ringSize, fpy - rySize, thick, rySize * 2);
      // Inner ring
      fill(255, 255, 200, 120 * a);
      let inner = floor(ringSize * 0.9);
      let iry = floor(rySize * 0.9);
      rect(fpx - inner, fpy - iry, inner * 2, 1);
      rect(fpx - inner, fpy + iry, inner * 2, 1);
    } else if (p.type === 'divine_beam') {
      let shimmer = sin(frameCount * 0.15 + p.phase) * 0.3 + 0.7;
      let fpx = floor(px), fpy = floor(py);
      let s = max(1, floor(p.size * a));
      // Wide glow column
      fill(p.r, p.g, p.b, 30 * a * shimmer);
      rect(fpx - floor(p.size * 1.5), fpy - floor(p.size * 2), floor(p.size * 3), floor(p.size * 4));
      // Core pixel
      fill(p.r, p.g, p.b, 180 * a * shimmer);
      rect(fpx - s, fpy - s, s * 2, s * 2);
      // Bright center
      fill(255, 255, 240, 220 * a * shimmer);
      rect(fpx, fpy, 1, 1);
    } else if (p.type === 'season_burst') {
      let fpx = floor(px), fpy = floor(py);
      let s = max(1, floor(p.size * a));
      // Outer cross glow
      fill(p.r, p.g, p.b, 50 * a * 0.5);
      rect(fpx - 1, fpy - s * 3, 2, s * 6);
      rect(fpx - s * 3, fpy - 1, s * 6, 2);
      // Core
      fill(p.r, p.g, p.b, 200 * a);
      rect(fpx - s, fpy - s, s * 2, s * 2);
      // Bright center
      fill(255, 255, 255, 160 * a);
      rect(fpx, fpy, 1, 1);
    } else if (p.type === 'splash_drop') {
      let fpx = floor(px), fpy = floor(py);
      let s = max(1, floor(p.size * a));
      fill(p.r, p.g, p.b, 180 * a);
      rect(fpx - s, fpy - s, s * 2, s * 2);
      fill(255, 255, 255, 80 * a);
      rect(fpx, fpy - s, 1, 1);
    } else if (p.type === 'splash_ring') {
      let rad = floor(p.size * (1 - a) + 2);
      let fpx = floor(px), fpy = floor(py);
      fill(p.r, p.g, p.b, 140 * a);
      for (let ang = 0; ang < TWO_PI; ang += 0.4) {
        let rx = floor(cos(ang) * rad), ry = floor(sin(ang) * rad * 0.55);
        rect(fpx + rx, fpy + ry, 2, 1);
      }
    } else {
      let s = max(1, floor(p.size * a));
      fill(p.r, p.g, p.b, 200 * a);
      rect(floor(px) - s, floor(py) - s, s * 2, s * 2);
    }
  }
  noStroke();
}

function spawnParticles(wx, wy, type, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: wx, y: wy,
      vx: random(-2, 2), vy: random(-3, -0.5),
      life: random(25, 50), maxLife: 50,
      type: 'burst',
      r: type === 'harvest' ? 80 : (type === 'chop' ? 140 : (type === 'combat' ? 255 : (type === 'build' ? 0 : 0))),
      g: type === 'harvest' ? 255 : (type === 'chop' ? 100 : (type === 'combat' ? floor(random(80, 160)) : 220)),
      b: type === 'harvest' ? 40 : (type === 'chop' ? 40 : (type === 'combat' ? 40 : (type === 'build' ? 200 : 100))),
      size: random(2, 5),
      world: true,
    });
  }
}

// Farming system — see farming.js

// ─── JUICE: CRYSTAL PULSE ────────────────────────────────────────────────
function spawnCrystalPulse(wx, wy) {
  // Expanding teal ring
  particles.push({
    x: wx, y: wy, vx: 0, vy: 0,
    life: 30, maxLife: 30,
    type: 'pulse_ring', size: 4,
    r: 80, g: 220, b: 200,
    growRate: 2.0, world: true,
  });
  // Crystal shards floating up
  for (let i = 0; i < 5; i++) {
    let angle = (TWO_PI / 5) * i + random(-0.3, 0.3);
    particles.push({
      x: wx, y: wy,
      vx: cos(angle) * random(1, 2.5),
      vy: sin(angle) * random(1, 2.5) - 1.5,
      life: random(30, 55), maxLife: 55,
      type: 'crystal_shard', size: random(2, 4),
      r: 60 + random(0, 40), g: 200 + random(0, 55), b: 180 + random(0, 40),
      gravity: 0.04, world: true,
    });
  }
}

// ─── JUICE: WOOD CHIP SPRAY ──────────────────────────────────────────────
function spawnWoodChips(wx, wy) {
  for (let i = 0; i < 5; i++) {
    let angle = random(-PI * 0.8, -PI * 0.2); // spray upward arc
    let speed = random(2, 4.5);
    particles.push({
      x: wx + random(-3, 3), y: wy,
      vx: cos(angle) * speed + random(-0.5, 0.5),
      vy: sin(angle) * speed,
      life: random(25, 45), maxLife: 45,
      type: 'wood_chip', size: random(2, 4),
      r: 140 + random(-20, 20), g: 100 + random(-15, 15), b: 40 + random(-10, 10),
      gravity: 0.12, spin: random(-0.2, 0.2), world: true,
    });
  }
  // Bark dust cloud
  for (let i = 0; i < 2; i++) {
    particles.push({
      x: wx + random(-6, 6), y: wy + random(-5, 5),
      vx: random(-0.5, 0.5), vy: random(-1, -0.3),
      life: random(20, 35), maxLife: 35,
      type: 'dust', size: random(3, 6),
      r: 120, g: 95, b: 60, world: true,
    });
  }
}

// ─── CEREMONY: EXPEDITION LOOT CASCADE ──────────────────────────────────
function spawnLootCascade(lootBag, goldEarned) {
  // Shower of tumbling coins from top of screen
  let coinCount = min(20, 8 + floor(goldEarned / 10));
  for (let i = 0; i < coinCount; i++) {
    let delay = i * 3; // stagger
    particles.push({
      x: width * 0.3 + random(width * 0.4), y: -10 - random(40) - i * 8,
      vx: random(-1.5, 1.5), vy: random(1, 3),
      life: 80 + random(30), maxLife: 110,
      type: 'loot_coin', size: random(3, 6),
      r: 255, g: 200 + random(40), b: 40 + random(40),
      gravity: 0.06, spin: random(0.05, 0.2), world: false,
    });
  }
  // Loot-specific colored bursts for rare items
  for (let loot of lootBag) {
    let col = { iron_ore: [170,190,210], rare_hide: [200,150,100], ancient_relic: [220,130,220], titan_bone: [240,210,130] }[loot.type];
    if (col) {
      for (let i = 0; i < 3; i++) {
        particles.push({
          x: width * 0.3 + random(width * 0.4), y: -20 - random(60),
          vx: random(-2, 2), vy: random(1.5, 3.5),
          life: 70 + random(25), maxLife: 95,
          type: 'loot_coin', size: random(4, 7),
          r: col[0], g: col[1], b: col[2],
          gravity: 0.08, spin: random(0.08, 0.25), world: false,
        });
      }
    }
  }
  // Victory pulse ring
  particles.push({
    x: width / 2, y: height * 0.3,
    vx: 0, vy: 0,
    life: 50, maxLife: 50,
    type: 'pulse_ring', size: 10,
    r: 255, g: 220, b: 80, world: false,
  });
}

// ─── CEREMONY: ISLAND LEVEL-UP EARTHQUAKE + GOLDEN WAVE ─────────────────
function spawnIslandLevelUp() {
  let cx = w2sX(WORLD.islandCX), cy = w2sY(WORLD.islandCY);
  // Triple expanding golden wave
  for (let i = 0; i < 3; i++) {
    particles.push({
      x: WORLD.islandCX, y: WORLD.islandCY,
      vx: 0, vy: 0,
      life: 70 + i * 15, maxLife: 70 + i * 15,
      type: 'golden_wave', size: 5 + i * 8,
      maxRing: 250 + i * 60,
      r: 255, g: 200 - i * 20, b: 40 + i * 15, world: true,
    });
  }
  // Eruption of golden debris from island center
  for (let i = 0; i < 18; i++) {
    let angle = random(TWO_PI);
    let speed = random(2, 5);
    particles.push({
      x: WORLD.islandCX + random(-20, 20), y: WORLD.islandCY,
      vx: cos(angle) * speed, vy: sin(angle) * speed * 0.6 - random(1, 3),
      life: random(40, 70), maxLife: 70,
      type: 'harvest_burst', size: random(3, 6),
      r: 255, g: 200 + random(40), b: 40 + random(40),
      gravity: 0.1, world: true,
    });
  }
  // Dust cloud from ground cracking
  for (let i = 0; i < 10; i++) {
    particles.push({
      x: WORLD.islandCX + random(-80, 80), y: WORLD.islandCY + random(-20, 20),
      vx: random(-1, 1), vy: random(-2, -0.5),
      life: random(30, 50), maxLife: 50,
      type: 'dust', size: random(4, 8),
      r: 120, g: 110, b: 80, world: true,
    });
  }
  // Prolonged screen shake — earthquake rumble
  triggerScreenShake(8, 25);
}

// ─── ISLAND LEVEL MILESTONE CELEBRATION ─────────────────────────────────
const ISLAND_RANKS = { 5: 'Colonist', 10: 'Citizen', 15: 'Senator', 20: 'Consul', 25: 'Imperator' };

function triggerIslandMilestone(lvl) {
  let rank = ISLAND_RANKS[lvl] || null;
  // Find buildings newly unlocked at this level
  let unlocks = [];
  for (let key in BLUEPRINTS) {
    if (BLUEPRINTS[key].minLevel === lvl) unlocks.push(BLUEPRINTS[key].name);
  }
  state.islandMilestone = { level: lvl, rank: rank, unlocks: unlocks, timer: 300 };
  _juiceLevelUpFlash = 1.0; // white screen flash on level up
  if (snd) snd.playSFX('level_up');
  // Narration at milestone levels
  if (snd && snd.playNarration) {
    if (lvl === 3) snd.playNarration('level_3');
    else if (lvl === 5) snd.playNarration('level_5');
    else if (lvl === 8) snd.playNarration('level_8');
    else if (lvl === 10) snd.playNarration('level_10');
  }
  // Golden particle burst from island center
  for (let i = 0; i < 30; i++) {
    let a = random(TWO_PI), spd = random(1.5, 5);
    particles.push({
      x: WORLD.islandCX + random(-10, 10), y: WORLD.islandCY + random(-10, 10),
      vx: cos(a) * spd, vy: sin(a) * spd * 0.6 - random(1, 3),
      life: random(50, 90), maxLife: 90,
      type: 'harvest_burst', size: random(3, 7),
      r: 255, g: 210 + floor(random(-20, 20)), b: 30,
      gravity: 0.06, world: true,
    });
  }
}

function drawIslandMilestone() {
  if (!state.islandMilestone || state.islandMilestone.timer <= 0) { state.islandMilestone = null; return; }
  let m = state.islandMilestone;
  m.timer--;
  let fadeIn = min(1, (300 - m.timer) / 25);
  let fadeOut = min(1, m.timer / 40);
  let al = min(fadeIn, fadeOut);
  push(); noStroke();
  // Full-screen dim
  fill(10, 5, 2, 140 * al);
  rect(0, 0, width, height);
  // Main title
  let centerY = height * 0.38;
  let pulse = sin(frameCount * 0.08) * 0.15 + 0.85;
  fill(255, 210, 50, 255 * al * pulse);
  textSize(28); textAlign(CENTER, CENTER);
  text('ISLAND LEVEL ' + m.level + '!', width / 2, centerY);
  // Rank subtitle
  if (m.rank) {
    fill(255, 240, 180, 230 * al);
    textSize(14);
    text('Rank: ' + m.rank, width / 2, centerY + 32);
  }
  // Unlocked buildings
  if (m.unlocks.length > 0) {
    let startY = centerY + (m.rank ? 60 : 48);
    fill(200, 190, 150, 180 * al);
    textSize(9);
    text('NEW BUILDINGS UNLOCKED', width / 2, startY);
    fill(255, 230, 140, 220 * al);
    textSize(11);
    for (let i = 0; i < m.unlocks.length; i++) {
      text(m.unlocks[i], width / 2, startY + 16 + i * 16);
    }
  }
  // Decorative lines
  let shimmer = sin(frameCount * 0.06) * 0.3 + 0.7;
  stroke(255, 210, 60, 70 * al * shimmer); strokeWeight(1);
  line(width * 0.2, centerY - 20, width * 0.8, centerY - 20);
  line(width * 0.2, centerY + (m.rank ? 46 : 20), width * 0.8, centerY + (m.rank ? 46 : 20));
  // Dismiss hint
  if (m.timer < 260) {
    fill(160, 140, 100, 100 * al);
    textSize(10); noStroke();
    text('click or press any key to dismiss', width / 2, height * 0.72);
  }
  pop();
}

function dismissIslandMilestone() {
  if (state.islandMilestone && state.islandMilestone.timer > 40) {
    state.islandMilestone.timer = 40; // start fade-out
    return true;
  }
  return false;
}

// [MOVED TO building.js] spawnBuildingComplete

// ─── JUICE: BOSS DEFEATED — slow-mo effect + dramatic explosion ─────────
let _slowMoFrames = 0;
function spawnBossDefeated(wx, wy) {
  _slowMoFrames = 35; // slow-motion for ~35 frames
  // Dramatic particle explosion
  for (let i = 0; i < 25; i++) {
    let angle = (TWO_PI / 25) * i + random(-0.2, 0.2);
    let speed = random(2, 5);
    particles.push({
      x: wx, y: wy,
      vx: cos(angle) * speed, vy: sin(angle) * speed * 0.7 - 1,
      life: random(40, 70), maxLife: 70,
      type: 'harvest_burst', size: random(3, 6),
      r: 255, g: random(60, 180), b: 40,
      gravity: 0.08, world: true,
    });
  }
  // Triple expanding rings
  for (let i = 0; i < 3; i++) {
    particles.push({
      x: wx, y: wy, vx: 0, vy: 0,
      life: 40 + i * 12, maxLife: 40 + i * 12,
      type: 'golden_wave', size: 5 + i * 6,
      maxRing: 180 + i * 50,
      r: 255, g: 180 - i * 30, b: 40 + i * 20, world: true,
    });
  }
  triggerScreenShake(12, 30, 0, 0, 'circular');
  state.screenFlash = { r: 255, g: 200, b: 60, alpha: 100, timer: 40 };
}

// ─── JUICE: ISLAND DISCOVERED — fog lifts + golden border flash ─────────
function spawnIslandDiscovered(wx, wy) {
  // Golden border flash on all 4 edges
  state.screenFlash = { r: 255, g: 210, b: 80, alpha: 80, timer: 50 };
  // Rising mist particles (fog lifting)
  for (let i = 0; i < 15; i++) {
    particles.push({
      x: wx + random(-100, 100), y: wy + random(-30, 30),
      vx: random(-0.5, 0.5), vy: random(-2, -0.8),
      life: random(50, 80), maxLife: 80,
      type: 'dust', size: random(5, 10),
      r: 200, g: 210, b: 220, world: true,
    });
  }
  // Golden sparkle ring around discovery
  for (let i = 0; i < 16; i++) {
    let angle = (TWO_PI / 16) * i;
    particles.push({
      x: wx + cos(angle) * 60, y: wy + sin(angle) * 30,
      vx: cos(angle) * 0.5, vy: sin(angle) * 0.3 - 0.5,
      life: random(40, 60), maxLife: 60,
      type: 'sundust', size: random(2, 4),
      r: 255, g: 210, b: 60, world: true, phase: random(TWO_PI),
    });
  }
  triggerScreenShake(5, 15);
}

// ─── CEREMONY: DIVINE BLESSING LIGHT COLUMN ─────────────────────────────
function spawnDivineBlessing(wx, wy) {
  // Ascending column of light particles
  for (let i = 0; i < 20; i++) {
    particles.push({
      x: wx + random(-12, 12), y: wy - random(0, 80),
      vx: random(-0.3, 0.3), vy: random(-2.5, -0.8),
      life: 50 + random(40), maxLife: 90,
      type: 'divine_beam', size: random(3, 7),
      r: 255, g: 220, b: 80, phase: random(TWO_PI), world: true,
    });
  }
  // Central bright column flash — tall narrow pulse
  particles.push({
    x: wx, y: wy - 40,
    vx: 0, vy: 0,
    life: 60, maxLife: 60,
    type: 'golden_wave', size: 3, maxRing: 60,
    r: 255, g: 240, b: 150, world: true,
  });
  // Ground radiance ring
  particles.push({
    x: wx, y: wy,
    vx: 0, vy: 0,
    life: 45, maxLife: 45,
    type: 'pulse_ring', size: 8,
    r: 255, g: 200, b: 60, world: true,
  });
  // Floating motes spiraling outward
  for (let i = 0; i < 8; i++) {
    let angle = (TWO_PI / 8) * i;
    particles.push({
      x: wx, y: wy - 20,
      vx: cos(angle) * 1.5, vy: sin(angle) * 0.8 - 1,
      life: 50 + random(20), maxLife: 70,
      type: 'sundust', size: random(2, 4),
      r: 255, g: 240, b: 140, phase: angle, world: true,
    });
  }
  triggerScreenShake(3, 8);
}

// ─── CEREMONY: SEASON/FESTIVAL TRANSITION FANFARE ───────────────────────
function spawnSeasonFanfare(seasonIdx) {
  let colors = [
    [150, 240, 120], // Spring — fresh green
    [255, 200, 60],  // Summer — golden
    [200, 120, 40],  // Autumn — amber
    [180, 210, 255], // Winter — ice blue
  ];
  let col = colors[seasonIdx] || colors[0];
  let px = state.player.x, py = state.player.y;
  // Radial burst of season-colored particles
  for (let i = 0; i < 24; i++) {
    let angle = (TWO_PI / 24) * i + random(-0.1, 0.1);
    let speed = random(2, 5);
    particles.push({
      x: px + random(-5, 5), y: py + random(-5, 5),
      vx: cos(angle) * speed, vy: sin(angle) * speed * 0.7,
      life: random(40, 65), maxLife: 65,
      type: 'season_burst', size: random(3, 6),
      r: col[0] + random(-20, 20), g: col[1] + random(-20, 20), b: col[2] + random(-20, 20),
      gravity: 0.05, world: true,
    });
  }
  // Double expanding season ring
  for (let i = 0; i < 2; i++) {
    particles.push({
      x: px, y: py,
      vx: 0, vy: 0,
      life: 55 + i * 12, maxLife: 55 + i * 12,
      type: 'pulse_ring', size: 5 + i * 6,
      r: col[0], g: col[1], b: col[2], world: true,
    });
  }
  // Confetti streamers
  for (let i = 0; i < 12; i++) {
    particles.push({
      x: px + random(-60, 60), y: py - random(30, 80),
      vx: random(-1, 1), vy: random(0.5, 2),
      life: random(50, 80), maxLife: 80,
      type: 'season_burst', size: random(2, 4),
      r: random(180, 255), g: random(120, 255), b: random(60, 255),
      gravity: 0.04, world: true,
    });
  }
  triggerScreenShake(4, 10);
}

// ─── NIGHT DARKNESS OVERLAY ──────────────────────────────────────────────
function drawNightOverlay() {
  let bright = getSkyBrightness(); // 0 = deep night, 1 = full day
  if (bright >= 1) return; // no overlay needed during day
  // Max darkness at night: ~28% opacity dark blue (moonlit feel)
  let darkness = (1 - bright) * 0.28;
  noStroke();
  fill(10, 12, 40, darkness * 255);
  rect(0, 0, width, height);
}

// ─── JUICE: GOLDEN HOUR COLOR GRADING ────────────────────────────────────
function drawColorGrading() {
  let h = state.time / 60;
  let r = 0, g = 0, b = 0, a = 0;
  let season = getSeason();

  if (h >= 5 && h < 6.5) {
    // Dawn: pink-lavender wash rising to warm gold
    let t = map(h, 5, 6.5, 0, 1);
    r = lerp(50, 255, t * 0.3); g = lerp(20, 180, t * 0.2); b = lerp(70, 100, t * 0.1);
    a = lerp(35, 15, t);
  } else if (h >= 6.5 && h < 8) {
    // Sunrise golden hour: warm amber glow
    let t = map(h, 6.5, 8, 0, 1);
    r = 255; g = 195; b = 100;
    a = lerp(22, 4, t);
  } else if (h >= 11.5 && h < 14) {
    // Noon: warm bleached highlight
    let t = map(h, 11.5, 14, 0, 1);
    let intensity = sin(t * PI);
    r = 255; g = 245; b = 210;
    a = 8 * intensity;
  } else if (h >= 14.5 && h < 17) {
    // Golden hour: deep amber — the MONEY hour
    let t = map(h, 14.5, 17, 0, 1);
    let intensity = sin(t * PI);
    r = 255; g = 175; b = 55;
    a = 35 * intensity;
  } else if (h >= 17 && h < 19) {
    // Sunset golden hour: deep amber to orange-red
    let t = map(h, 17, 19, 0, 1);
    r = lerp(255, 200, t); g = lerp(160, 60, t); b = lerp(55, 80, t);
    a = lerp(32, 40, t);
  } else if (h >= 19 && h < 20.5) {
    // Dusk: deep purple settling
    let t = map(h, 19, 20.5, 0, 1);
    r = lerp(120, 15, t); g = lerp(50, 12, t); b = lerp(100, 50, t);
    a = lerp(20, 22, t);
  } else if (h >= 20.5 || h < 5) {
    // Night: deep indigo-blue (subtle tint, not darkening)
    r = 8; g = 8; b = 30;
    a = 15;
  }

  // Seasonal tint modifier
  if (season === 0 && a > 0) { g += 5; b += 3; } // spring: slightly greener
  if (season === 1) { r += 8; a = max(a, 4); } // summer: warmer always
  if (season === 2) { r += 10; g += 3; a = max(a, 5); } // autumn: amber tint
  if (season === 3) { b += 8; r -= 3; a = max(a, 6); } // winter: cool blue

  if (a > 0) {
    noStroke();
    fill(max(0, r), max(0, g), max(0, b), a);
    rect(0, 0, width, height);
  }

  // Vignette — darker edges for cinematic feel (always subtle)
  let vigA = 14 + (h >= 20 || h < 6 ? 3 : 0);
  let vigW = width * 0.35, vigH = height * 0.35;
  // Top-left corner
  fill(0, 0, 0, vigA * 0.5);
  rect(0, 0, vigW, vigH);
  // Top-right
  rect(width - vigW, 0, vigW, vigH);
  // Bottom corners
  fill(0, 0, 0, vigA * 0.4);
  rect(0, height - vigH, vigW, vigH);
  rect(width - vigW, height - vigH, vigW, vigH);
  // Edge strips
  fill(0, 0, 0, vigA * 0.3);
  rect(0, 0, 20, height);
  rect(width - 20, 0, 20, height);
  rect(0, 0, width, 12);
  rect(0, height - 12, width, 12);
}

// ─── STORM ────────────────────────────────────────────────────────────────
function updateStorm(dt) {
  stormTimer += dt;

  if (!stormActive && stormTimer > 2400 + random(-400, 400) && state.blessing.type !== 'storm' && !(state.prophecy && state.prophecy.type === 'peace')) {
    if (typeof weatherTransition !== 'undefined') {
      weatherTransition.active = true;
      weatherTransition.type = 'storm_in';
      weatherTransition.progress = 0;
      weatherTransition.earlyDrops = [];
    }
    stormActive = true;
    stormTimer = 0;
    addFloatingText(width / 2, height * 0.3, '⚡ DRIFT STORM', C.stormFlash);
    triggerScreenShake(8, 20);
  }
  if (stormActive && stormTimer > 800) {
    if (typeof weatherTransition !== 'undefined') {
      weatherTransition.active = true;
      weatherTransition.type = 'storm_out';
      weatherTransition.progress = 0;
    }
    stormActive = false;
    stormTimer = 0;
  }

  if (stormActive && frameCount % 60 === 0 && random() < 0.5) {
    let lx = random(width * 0.2, width * 0.8);
    lightningBolts.push({
      x: lx, yTop: 0, yBot: height * 0.55,
      life: 12, maxLife: 12, branches: genLightningBranches(lx),
    });
    triggerScreenShake(4, 8);
  }

  lightningBolts.forEach(l => l.life--);
  lightningBolts = lightningBolts.filter(l => l.life > 0);
}

function genLightningBranches(x) {
  let branches = [];
  let cx = x, cy = 0;
  while (cy < height * 0.55) {
    let nx = cx + random(-25, 25);
    let ny = cy + random(20, 40);
    branches.push({ x1: cx, y1: cy, x2: nx, y2: ny });
    if (random() < 0.4) {
      branches.push({ x1: cx, y1: cy, x2: cx + random(-50, 50), y2: cy + random(15, 30), side: true });
    }
    cx = nx; cy = ny;
  }
  return branches;
}

function drawLightning() {
  lightningBolts.forEach(l => {
    let a = map(l.life, 0, l.maxLife, 0, 1);
    // Full-screen flash on fresh strike — bright white then quick fade
    if (l.life > l.maxLife - 2) {
      noStroke();
      fill(230, 235, 255, 140);
      rect(0, 0, width, height);
    } else if (l.life > l.maxLife - 4) {
      noStroke();
      fill(200, 215, 240, 50 * a);
      rect(0, 0, width, height);
    }
    // Outer glow pass
    l.branches.forEach(b => {
      let w = b.side ? 1.5 : 3;
      stroke(120, 160, 220, 80 * a);
      strokeWeight(w + 2);
      line(b.x1, b.y1, b.x2, b.y2);
    });
    // Core bolt
    l.branches.forEach(b => {
      let w = b.side ? 1 : 2;
      stroke(180, 220, 255, 220 * a);
      strokeWeight(w);
      line(b.x1, b.y1, b.x2, b.y2);
      stroke(255, 255, 255, 140 * a);
      strokeWeight(w * 0.5);
      line(b.x1, b.y1, b.x2, b.y2);
    });
    noStroke();
    // Afterimage — faint purple ghost
    if (l.life < l.maxLife * 0.4 && l.life > 2) {
      l.branches.forEach(b => {
        if (b.side) return;
        stroke(100, 80, 160, 20 * a);
        strokeWeight(1);
        line(b.x1 + 2, b.y1 + 1, b.x2 + 2, b.y2 + 1);
      });
      noStroke();
    }
  });
}

function drawEnergyArcs() {
  energyArcs.forEach(a => {
    let al = map(a.life, 0, a.maxLife, 0, 1);
    stroke(0, 255, 200, 180 * al);
    strokeWeight(1.5);
    let mx = (a.x1 + a.x2) / 2 + random(-8, 8);
    let my = (a.y1 + a.y2) / 2 + random(-8, 8);
    noFill();
    beginShape();
    vertex(a.x1, a.y1);
    quadraticVertex(mx, my, a.x2, a.y2);
    endShape();
    a.life--;
  });
  energyArcs = energyArcs.filter(a => a.life > 0);
  noStroke();
}

// ─── FLOATING TEXT ────────────────────────────────────────────────────────
// ─── DIALOG SYSTEM (typewriter) ─────────────────────────────────────────
function openDialog(speaker, portrait, txt, choices, onComplete) {
  dialogState.active = true;
  dialogState.speaker = speaker;
  dialogState.portrait = portrait;
  dialogState.text = txt;
  dialogState.displayLen = 0;
  dialogState.choices = choices || null;
  dialogState.onComplete = onComplete || null;
}

function advanceDialog() {
  if (!dialogState.active) return;
  if (dialogState.displayLen < dialogState.text.length) {
    dialogState.displayLen = dialogState.text.length;
    return;
  }
  if (dialogState.choices) return; // wait for choice click
  dialogState.active = false;
  if (dialogState.onComplete) dialogState.onComplete();
}
function updateDialog(dt) {
  if (!dialogState.active) return;
  if (dialogState.displayLen < dialogState.text.length) {
    let prevLen = floor(dialogState.displayLen);
    dialogState.displayLen += dt * 0.8;
    let newLen = floor(dialogState.displayLen);
    if (newLen > prevLen && snd && typeof snd.playDialogBlip === 'function') {
      let ch = dialogState.text.charAt(newLen - 1);
      if (ch && ch !== ' ' && ch !== '.' && ch !== ',' && ch !== '!' && ch !== '?' && ch !== '-' && ch !== '\'' && ch !== '"') {
        snd.playDialogBlip(dialogState.portrait || 'livia');
      }
    }
  }
}

function drawDialogSystem() {
  if (!dialogState.active) return;
  let d = dialogState;
  let boxW = min(width - 40, 440);
  let boxH = 90;
  let bx = (width - boxW) / 2;
  let by = height - boxH - 20;

  // Dark backdrop
  noStroke();
  fill(0, 0, 0, 120);
  rect(0, 0, width, height);

  // Main dialog panel
  fill(25, 20, 14, 240);
  rect(bx, by, boxW, boxH, 6);
  // Gold border
  stroke(180, 145, 70, 200);
  strokeWeight(1.5);
  noFill();
  rect(bx, by, boxW, boxH, 6);
  // Inner line
  stroke(120, 95, 55, 80);
  strokeWeight(0.5);
  rect(bx + 4, by + 4, boxW - 8, boxH - 8, 4);
  noStroke();

  // Portrait area (left side)
  let portW = 56;
  fill(35, 28, 20);
  rect(bx + 6, by + 6, portW, boxH - 12, 4);
  stroke(140, 110, 60, 100);
  strokeWeight(0.5);
  noFill();
  rect(bx + 6, by + 6, portW, boxH - 12, 4);
  noStroke();

  // Draw pixel portrait
  push();
  translate(bx + 6 + portW / 2, by + 6 + (boxH - 12) / 2);
  drawPortrait(d.portrait);
  pop();

  // Name plate
  let nameX = bx + portW + 16;
  fill(212, 160, 64);
  textSize(9);
  textAlign(LEFT, TOP);
  text(d.speaker.toUpperCase(), nameX, by + 10);
  // Decorative line under name
  stroke(140, 110, 55, 100);
  strokeWeight(0.5);
  line(nameX, by + 22, nameX + textWidth(d.speaker.toUpperCase()) + 10, by + 22);
  noStroke();

  // Typewriter text
  let visibleText = d.text.substring(0, floor(d.displayLen));
  fill(220, 210, 190);
  textSize(11);
  let maxTW = boxW - portW - 28;
  let words = visibleText.split(' ');
  let lines = [''];
  let lineH = 11;
  words.forEach(w => {
    let test = lines[lines.length - 1] + w + ' ';
    if (textWidth(test) > maxTW) lines.push(w + ' ');
    else lines[lines.length - 1] = test;
  });
  lines.forEach((ln, i) => {
    text(ln, nameX, by + 27 + i * lineH);
  });

  // Cursor blink when text fully revealed
  if (d.displayLen >= d.text.length && !d.choices) {
    let blink = sin(frameCount * 0.1) > 0;
    if (blink) {
      fill(180, 160, 120, 180);
      textSize(10);
      textAlign(RIGHT, BOTTOM);
      text('[SPACE]', bx + boxW - 10, by + boxH - 6);
    }
  }

  // Choice buttons
  if (d.choices && d.displayLen >= d.text.length) {
    let choiceY = by + boxH + 4;
    d.choices.forEach((ch, i) => {
      let cbw = textWidth(ch.text) + 24;
      let cbx = bx + portW + 16 + i * (cbw + 8);
      let hover = mouseX > cbx && mouseX < cbx + cbw && mouseY > choiceY && mouseY < choiceY + 22;
      fill(hover ? color(60, 50, 35) : color(35, 28, 20));
      rect(cbx, choiceY, cbw, 22, 4);
      stroke(hover ? color(212, 160, 64) : color(120, 95, 55));
      strokeWeight(1);
      noFill();
      rect(cbx, choiceY, cbw, 22, 4);
      noStroke();
      fill(hover ? color(255, 220, 160) : color(180, 160, 120));
      textSize(11);
      textAlign(CENTER, CENTER);
      text(ch.text, cbx + cbw / 2, choiceY + 11);
    });
  }
  textAlign(LEFT, TOP);
}

function drawPortrait(id) {
  // Pixel art portrait faces
  noStroke();
  if (id === 'livia') {
    // Skin
    fill(210, 170, 130); rect(-10, -12, 20, 18);
    // Hair
    fill(60, 30, 15); rect(-12, -16, 24, 8); rect(-12, -12, 4, 16); rect(8, -12, 4, 16);
    // Eyes
    fill(80, 50, 30); rect(-6, -7, 4, 3); rect(2, -7, 4, 3);
    fill(255); rect(-5, -7, 2, 2); rect(3, -7, 2, 2);
    // Lips
    fill(180, 60, 60); rect(-3, -1, 6, 2);
    // Blush
    fill(200, 120, 100, 80); rect(-8, -4, 4, 2); rect(4, -4, 4, 2);
    // Gold earrings
    fill(220, 190, 60); rect(-12, -8, 2, 3); rect(10, -8, 2, 3);
  } else if (id === 'marcus') {
    fill(190, 150, 110); rect(-10, -12, 20, 18);
    fill(50, 40, 30); rect(-11, -16, 22, 6);
    fill(80, 50, 30); rect(-6, -7, 4, 3); rect(2, -7, 4, 3);
    fill(255); rect(-5, -7, 2, 2); rect(3, -7, 2, 2);
    fill(180, 140, 100); rect(-3, -1, 6, 2);
    // Beard
    fill(50, 40, 30); rect(-6, 1, 12, 4);
    // Helmet crest — faction color
    { let _fc2 = (typeof getFactionData === 'function') ? getFactionData() : null; let _hc = _fc2 && _fc2.player ? _fc2.player.cape : [180, 30, 30]; fill(_hc[0], _hc[1], _hc[2]); } rect(-3, -18, 6, 4);
  } else if (id === 'vesta') {
    fill(200, 160, 120); rect(-10, -12, 20, 18);
    fill(100, 80, 60); rect(-12, -16, 24, 7); rect(-12, -12, 3, 14); rect(9, -12, 3, 14);
    fill(60, 100, 60); rect(-6, -7, 4, 3); rect(2, -7, 4, 3);
    fill(255); rect(-5, -7, 2, 2); rect(3, -7, 2, 2);
    fill(170, 100, 80); rect(-2, -1, 4, 2);
    // Crystal necklace
    fill(0, 200, 120); rect(-2, 4, 4, 3);
  } else if (id === 'felix') {
    fill(180, 140, 100); rect(-10, -12, 20, 18);
    fill(200, 160, 60); rect(-11, -16, 22, 7);
    fill(80, 80, 120); rect(-6, -7, 4, 3); rect(2, -7, 4, 3);
    fill(255); rect(-5, -7, 2, 2); rect(3, -7, 2, 2);
    fill(180, 120, 80); rect(-3, -1, 6, 2);
    // Cat ears headband
    fill(200, 160, 60); rect(-9, -18, 4, 4); rect(5, -18, 4, 4);
  } else {
    // Generic NPC
    fill(200, 160, 120); rect(-10, -12, 20, 18);
    fill(80, 60, 40); rect(-11, -16, 22, 7);
    fill(60, 50, 40); rect(-6, -7, 4, 3); rect(2, -7, 4, 3);
    fill(255); rect(-5, -7, 2, 2); rect(3, -7, 2, 2);
    fill(180, 120, 80); rect(-3, -1, 6, 2);
  }
}

function updateFloatingText(dt) {
  floatingText.forEach(f => {
    f.y += f.vy * dt;
    f.life -= dt;
  });
  floatingText = floatingText.filter(f => f.life > 0);
}


// ─── TREES ────────────────────────────────────────────────────────────────
function updateTrees(dt) {
  state.trees.forEach(t => {
    if (!t.alive) {
      t.regrowTimer -= dt;
      if (t.regrowTimer <= 0) {
        t.alive = true;
        t.health = t.maxHealth;
        t.size = 0.3; // grow back small
      }
    } else if (t.size < 1.3) {
      t.size = min(t.size + 0.0005 * dt, random(0.9, 1.3));
    }
  });
}

function chopTree(tree) {
  if (!tree.alive) return;
  tree.health -= state.tools.axe ? tree.health : 1;
  if (snd) snd.playSFX('chop');
  triggerScreenShake(tree.health <= 0 ? 5 : 2, tree.health <= 0 ? 10 : 5);
  spawnWoodChips(tree.x, tree.y - 20);
  tree.shakeTimer = 12; // tree wobble on hit

  if (tree.health <= 0) {
    tree.alive = false;
    tree.regrowTimer = 1200 + random(-200, 200);
    let woodDrop = floor(random(2, 4));
    if (state.prophecy && state.prophecy.type === 'wood') woodDrop *= 2;
    let festW = getFestival();
    if (festW && festW.effect.allResources) woodDrop *= festW.effect.allResources;
    state.wood += woodDrop;
    state.dailyActivities.chopped++;
    if (typeof trackStat === 'function') trackStat('treesChopped', 1);
    if (typeof checkDailyQuestProgress === 'function') checkDailyQuestProgress('chop', 1);
    checkQuestProgress('chop', 1);
    addFloatingText(w2sX(tree.x), w2sY(tree.y) - 40, '+' + woodDrop + ' Wood', '#8B6914');
    if (state.dailyActivities.chopped === 1 && state.day <= 2) { addFloatingText(w2sX(tree.x), w2sY(tree.y) - 60, 'Great start!', '#44ffaa'); if (snd) snd.playSFX('build'); }
    // Chance for bonus
    if (random() < 0.3) {
      state.seeds += 1;
      addFloatingText(w2sX(tree.x), w2sY(tree.y) - 55, '+1 Seed', C.vineLight);
    }
  } else {
    addFloatingText(w2sX(tree.x), w2sY(tree.y) - 30, 'Chop! (' + tree.health + '/' + tree.maxHealth + ')', '#8B6914');
  }
}

function drawTrees() {
  state.trees.forEach(t => drawOneTree(t));
}
function drawOneTree(t) {
    // Skip trees outside the visible grass surface
    if (!isOnIsland(t.x, t.y)) return;
    // Cull offscreen trees
    let _tsx = w2sX(t.x), _tsy = w2sY(t.y);
    if (_tsx < -60 || _tsx > width + 60 || _tsy < -60 || _tsy > height + 60) return;
    if (!t.alive) {
      // Stump — pixel bark
      let sx = w2sX(t.x);
      let sy = w2sY(t.y);
      fill(72, 52, 28);
      noStroke();
      rect(floor(sx) - 7, floor(sy) - 2, 14, 5);
      fill(82, 60, 32);
      rect(sx - 6, sy - 4, 12, 6);
      // Ring detail
      fill(65, 48, 25);
      rect(sx - 2, sy - 2, 4, 3);
      // Regrow sprout
      if (t.regrowTimer < 600) {
        fill(72, 132, 42);
        rect(sx - 2, sy - 7, 4, 4);
        fill(58, 105, 32);
        rect(sx - 1, sy - 2, 2, 4);
      }
      return;
    }

    let sx = w2sX(t.x);
    let sy = w2sY(t.y);
    let s = t.size;
    let sway = floor(sin(frameCount * 0.01 + t.swayPhase) * 2 * s); // slower, pre-rounded to prevent flicker
    // Chop wobble
    if (t.shakeTimer > 0) {
      sway += sin(t.shakeTimer * 1.5) * t.shakeTimer * 0.8;
      t.shakeTimer--;
    }

    push();
    translate(sx, sy); // base stays fixed

    // Shadow — elliptical
    noStroke();
    fill(0, 0, 0, 30);
    ellipse(2 * s, 3, 18 * s, 5 * s);

    if (t.type === 'oak') {
      // Mediterranean Cypress — elegant tapered column, base fixed, top sways
      // Trunk — rooted firmly, no sway at base
      fill(62, 42, 22);
      beginShape();
      vertex(-3 * s, 2); vertex(-2 * s, -28 * s); vertex(2 * s, -28 * s); vertex(3 * s, 2);
      endShape(CLOSE);
      // Bark detail
      fill(72, 52, 28);
      rect(-1.5 * s, -26 * s, 3 * s, 26 * s);
      fill(50, 35, 16, 60);
      rect(-0.5 * s, -20 * s, 1 * s, 8 * s);
      rect(0.5 * s, -10 * s, 1 * s, 6 * s);

      // Foliage — sway increases toward top (realistic wind)
      let _foliageLayers = _fpsSmooth < 35 ? 5 : 8;
      for (let layer = 0; layer < _foliageLayers; layer++) {
        let t_frac = layer / (_foliageLayers - 1); // 0=bottom, 1=top
        let layerSway = floor(sway * t_frac); // pre-rounded to prevent flicker
        let layerY = -30 * s - layer * 9 * s;
        let layerW = (7 - abs(layer - 3.5) * 1.3) * s; // tapered: wider in middle, narrow at top/bottom
        let darkG = 20 + layer * 4;
        let lightG = 48 + layer * 5;
        // Dark base layer
        fill(darkG, darkG + 30, darkG - 2);
        rect(floor(-layerW + layerSway), floor(layerY), floor(layerW * 2), floor(9 * s), 1);
        // Lighter inner layer
        fill(darkG + 10, lightG, darkG + 5, 180);
        rect(floor(-layerW * 0.7 + layerSway), floor(layerY + 1), floor(layerW * 1.4), floor(7 * s), 1);
        // Sunlit edge — right side highlight (skip on low FPS)
        if (_fpsSmooth >= 35) {
          fill(45 + layer * 3, 85 + layer * 4, 35, 80);
          rect(floor(layerW * 0.3 + layerSway), floor(layerY + 2), floor(layerW * 0.4), floor(5 * s));
        }
      }
      // Pointed tip
      let tipSway = sway;
      fill(28, 58, 24);
      beginShape();
      vertex(tipSway, floor(-102 * s));
      vertex(-2 * s + tipSway, floor(-94 * s));
      vertex(2 * s + tipSway, floor(-94 * s));
      endShape(CLOSE);
      // Leaf texture — small dots scattered on foliage
      fill(38, 72, 28, 80);
      for (let li = 0; li < 5; li++) {
        let ly = floor(-85 * s + li * 12 * s);
        let lsway = sway * (0.3 + li * 0.14);
        rect(floor(sin(li * 2.1 + t.swayPhase) * 3 * s + lsway), ly, 2 * s, 2 * s);
      }
    } else if (t.type === 'olive') {
      // Olive tree — gnarled trunk, silver-green canopy
      // Thick gnarled trunk with knots
      fill(88, 68, 38);
      rect(-4 * s, -18 * s, 8 * s, 22 * s);
      // Trunk is wider at base, gnarled
      fill(95, 72, 40);
      rect(-5 * s, -4 * s, 3 * s, 8 * s);
      rect(3 * s, -4 * s, 3 * s, 8 * s);
      // Trunk knots and hollows
      fill(72, 52, 28);
      rect(-2 * s, -10 * s, 3 * s, 3 * s);
      rect(1 * s, -6 * s, 2 * s, 2 * s);
      // Bark lines — vertical cracks
      fill(65, 48, 25, 80);
      rect(-3 * s, -16 * s, 1 * s, 14 * s);
      rect(2 * s, -14 * s, 1 * s, 12 * s);
      // Twisted branch extending right
      fill(85, 62, 35);
      rect(3 * s, -18 * s, 10 * s, 3 * s);
      rect(10 * s, -20 * s, 3 * s, 3 * s);
      // Branch extending left
      rect(-8 * s, -16 * s, 6 * s, 2 * s);
      // Silver-green canopy — layered, irregular
      fill(78, 98, 58);
      rect(-16 * s, -34 * s, 14 * s, 12 * s);
      rect(4 * s, -32 * s, 14 * s, 10 * s);
      fill(88, 112, 65);
      rect(-12 * s, -38 * s, 24 * s, 14 * s);
      rect(4 * s, -26 * s, 10 * s, 8 * s);
      // Silver-green shimmer (olive leaf characteristic)
      fill(120, 145, 95, 120);
      rect(-8 * s, -40 * s, 16 * s, 6 * s);
      rect(-4 * s, -36 * s, 10 * s, 4 * s);
      // Silver underside of leaves
      fill(140, 160, 120, 70);
      rect(-14 * s, -30 * s, 8 * s, 4 * s);
      rect(8 * s, -28 * s, 8 * s, 3 * s);
      // Pixel leaf clusters
      fill(105, 135, 80, 130);
      for (let li = 0; li < 5; li++) {
        let la = TWO_PI / 5 * li + 0.3;
        let lr = 10 * s;
        rect(floor(cos(la) * lr - s), floor(-28 * s + sin(la) * lr * 0.5 - s), 3 * s, 3 * s);
      }
      // Tiny olive fruits
      fill(60, 70, 30, 100);
      rect(-6 * s, -26 * s, 2 * s, 2 * s);
      rect(8 * s, -24 * s, 2 * s, 2 * s);
      rect(2 * s, -34 * s, 2 * s, 2 * s);
    } else if (t.type === 'pine') {
      // Mediterranean Stone Pine — umbrella-shaped (Pinus pinea)
      fill(80, 55, 30);
      // Tall straight trunk
      rect(-2 * s, -20 * s, 4 * s, 24 * s);
      // Bark texture — scaly
      fill(95, 68, 38);
      rect(-1 * s, -18 * s, 2 * s, 20 * s);
      fill(70, 48, 25, 80);
      for (let bi = 0; bi < 5; bi++) {
        rect(-2 * s + (bi % 2) * s, (-16 + bi * 4) * s, 2 * s, 2 * s);
      }
      // Umbrella canopy — flat-topped, wide spread
      // Dark underside
      fill(30, 65, 25);
      rect(-18 * s, -30 * s, 36 * s, 4 * s);
      rect(-14 * s, -26 * s, 28 * s, 4 * s);
      // Main canopy — rich green flat top
      fill(42, 82, 35);
      rect(-20 * s, -38 * s, 40 * s, 10 * s);
      rect(-16 * s, -42 * s, 32 * s, 6 * s);
      // Lighter top
      fill(55, 100, 45);
      rect(-18 * s, -42 * s, 36 * s, 6 * s);
      // Sunlit highlight
      fill(70, 115, 55, 140);
      rect(-12 * s, -44 * s, 24 * s, 4 * s);
      // Canopy edge texture (irregular)
      fill(35, 72, 28, 100);
      rect(-20 * s, -36 * s, 4 * s, 4 * s);
      rect(16 * s, -36 * s, 4 * s, 4 * s);
      rect(-18 * s, -32 * s, 6 * s, 3 * s);
      rect(14 * s, -32 * s, 6 * s, 3 * s);
      // Pine cone clusters hanging
      fill(110, 75, 35, 100);
      rect(-8 * s, -28 * s, 2 * s, 3 * s);
      rect(6 * s, -27 * s, 2 * s, 3 * s);
    } else if (t.type === 'palm') {      fill(110, 80, 45); rect(-2 * s, -30 * s, 4 * s, 34 * s);      fill(95, 68, 38, 100); for (let ri = 0; ri < 8; ri++) rect(-2 * s, (-28 + ri * 4) * s, 4 * s, 1 * s);      for (let f = 0; f < 7; f++) { let fa = (f / 7) * TWO_PI + sin(frameCount * 0.008 + t.swayPhase) * 0.15, fx = cos(fa) * 14 * s, fy = sin(fa) * 6 * s - 34 * s; fill(45, 110, 35); ellipse(floor(fx + sway * 0.5), floor(fy), 10 * s, 4 * s); fill(55, 125, 42, 160); ellipse(floor(fx * 0.7 + sway * 0.3), floor(fy + 1), 7 * s, 3 * s); }      fill(140, 80, 25, 120); rect(-3 * s + sway * 0.3, -32 * s, 2 * s, 3 * s); rect(2 * s + sway * 0.3, -33 * s, 2 * s, 3 * s);    } else if (t.type === 'acacia') {      fill(100, 72, 38); rect(-2 * s, -16 * s, 4 * s, 20 * s);      fill(90, 65, 32); rect(-1 * s, -14 * s, 3 * s, 16 * s);      fill(60, 95, 35); rect(-22 * s + sway, -26 * s, 44 * s, 6 * s);      fill(50, 82, 28); rect(-20 * s + sway, -24 * s, 40 * s, 4 * s);      fill(68, 108, 42, 180); rect(-18 * s + sway, -30 * s, 36 * s, 5 * s);      fill(45, 78, 25, 100); for (let li = 0; li < 4; li++) rect(floor((-14 + li * 9) * s + sway), floor(-28 * s), 3 * s, 3 * s);    } else if (t.type === 'fig') {      fill(85, 62, 35); rect(-3 * s, -14 * s, 6 * s, 18 * s);      fill(75, 55, 30); rect(-2 * s, -12 * s, 4 * s, 14 * s);      fill(55, 95, 38); ellipse(sway * 0.5, -24 * s, 28 * s, 18 * s);      fill(65, 108, 45, 180); ellipse(sway * 0.4, -26 * s, 22 * s, 14 * s);      fill(90, 50, 70, 120); rect(-4 * s + sway * 0.3, -16 * s, 2 * s, 2 * s); rect(3 * s + sway * 0.3, -18 * s, 2 * s, 2 * s);    } else if (t.type === 'papyrus') {      fill(90, 120, 55); rect(-1 * s, -28 * s, 2 * s, 32 * s);      fill(80, 110, 48); rect(-3 * s, -24 * s, 1.5 * s, 28 * s); rect(2 * s, -26 * s, 1.5 * s, 30 * s);      fill(100, 140, 65);      for (let f = 0; f < 6; f++) { let fa = (f / 6) * PI - HALF_PI + sin(frameCount * 0.01 + t.swayPhase) * 0.1, fx = cos(fa) * 8 * s, fy = sin(fa) * 5 * s - 30 * s; rect(floor(fx + sway * 0.5), floor(fy), 2 * s, 1 * s); rect(floor(fx * 0.6 + sway * 0.3), floor(fy - 2 * s), 3 * s, 2 * s); }      fill(110, 155, 72, 140); ellipse(sway * 0.3, -32 * s, 12 * s, 6 * s);    } else if (t.type === 'datepalm') {      fill(120, 88, 48); rect(-2 * s, -34 * s, 4 * s, 38 * s);      fill(105, 78, 42, 120); for (let ri = 0; ri < 9; ri++) rect(-2 * s, (-32 + ri * 4) * s, 4 * s, 1 * s);      for (let f = 0; f < 6; f++) { let fa = (f / 6) * TWO_PI + sin(frameCount * 0.009 + t.swayPhase) * 0.12; fill(48, 105, 38); ellipse(floor(cos(fa) * 12 * s + sway * 0.5), floor(sin(fa) * 5 * s - 38 * s), 9 * s, 3.5 * s); }      fill(160, 100, 30, 140); rect(-2 * s + sway * 0.3, -36 * s, 3 * s, 4 * s); rect(1 * s + sway * 0.3, -35 * s, 2 * s, 3 * s);    } else if (t.type === 'sycamore') {      fill(95, 70, 38); rect(-4 * s, -16 * s, 8 * s, 20 * s);      fill(85, 62, 32); rect(-3 * s, -14 * s, 6 * s, 16 * s);      fill(50, 88, 35); ellipse(sway * 0.4, -26 * s, 32 * s, 16 * s);      fill(60, 100, 42, 170); ellipse(sway * 0.3, -28 * s, 26 * s, 12 * s);      fill(42, 78, 28, 100); rect(-12 * s + sway * 0.5, -22 * s, 5 * s, 4 * s); rect(8 * s + sway * 0.5, -24 * s, 5 * s, 4 * s);    } else if (t.type === 'laurel') {      fill(82, 60, 32); rect(-2 * s, -16 * s, 4 * s, 20 * s);      fill(72, 52, 28); rect(-1.5 * s, -14 * s, 3 * s, 16 * s);      fill(45, 85, 30); ellipse(sway * 0.4, -28 * s, 20 * s, 20 * s);      fill(55, 100, 38, 180); ellipse(sway * 0.3, -30 * s, 16 * s, 16 * s);      fill(65, 115, 45, 120); ellipse(3 * s + sway * 0.3, -32 * s, 10 * s, 8 * s);      fill(30, 30, 50, 100); rect(-4 * s + sway * 0.3, -22 * s, 2 * s, 2 * s); rect(3 * s + sway * 0.3, -24 * s, 2 * s, 2 * s);    }

    // Health indicator when damaged
    if (t.health < t.maxHealth) {
      let hpFrac = t.health / t.maxHealth;
      fill(color(C.hudBg));
      rect(-12, -50 * s, 24, 4, 1);
      fill(lerpColor(color(255, 60, 40), color(80, 200, 40), hpFrac));
      rect(-12, -50 * s, 24 * hpFrac, 4, 1);
    }

    pop();
}

// ─── MERCHANT SHIP ────────────────────────────────────────────────────────
function updatePortPositions() {
  // Ports always at the shoreline — just past the grass surface edge
  let srx = getSurfaceRX();
  let sry = getSurfaceRY();
  // Player port: RIGHT side of island (pier extends right into water)
  state.portLeft = {
    x: WORLD.islandCX + srx + 10,
    y: WORLD.islandCY + sry * 0.15
  };
  // Merchant port: LEFT side of island
  state.portRight = {
    x: WORLD.islandCX - srx - 20,
    y: WORLD.islandCY - sry * 0.05
  };
}

function getPortPosition() {
  if (!state.portLeft) updatePortPositions();
  return state.portLeft;
}

function updateShip(dt) {
  let ship = state.ship;
  ship.timer += dt;

  // Merchant docks on LEFT shore — far end of pier
  ship.dockX = WORLD.islandCX - getSurfaceRX() * 1.12;
  ship.dockY = WORLD.islandCY + 20;

  switch (ship.state) {
    case 'gone':
      if (ship.timer > ship.nextArrival) {
        ship.state = 'arriving';
        ship.timer = 0;
        ship.x = WORLD.islandCX - state.islandRX - 400;
        ship.y = ship.dockY;
        ship.offers = generateShopOffers();
        addFloatingText(width / 2, height * 0.3, 'A merchant ship approaches!', C.solarBright);
      }
      break;

    case 'arriving':
      let targetX = ship.dockX;
      ship.x = lerp(ship.x, targetX, 0.008);
      ship.y = ship.dockY + sin(frameCount * 0.02) * 3;
      if (abs(ship.x - targetX) < 5) {
        ship.state = 'docked';
        ship.timer = 0;
        if (snd) snd.playSFX('sail');
        addFloatingText(width / 2, height * 0.35, 'Ship docked at port! Walk to the harbor to trade.', C.solarBright);
        addNotification('Merchant trireme has arrived!', '#ffbb22');
      }
      break;

    case 'docked':
      // Gentle hover over the island
      ship.x = ship.dockX + sin(frameCount * 0.005) * 15;
      ship.y = ship.dockY + sin(frameCount * 0.02) * 4;
      if (ship.timer > 2700) {
        ship.state = 'leaving';
        ship.timer = 0;
        ship.shopOpen = false;
        addFloatingText(width / 2, height * 0.35, 'Mercator sailing away...', C.textDim);
      }
      // Player must be near the left-side merchant dock (in shallows)
      let pd = dist2(state.player.x, state.player.y, ship.dockX, ship.dockY);
      ship.shopOpen = (pd < 120);

      // Auto-sell from storage every 300 frames (~5s)
      ship.autoSellTimer = (ship.autoSellTimer || 0) + dt;
      if (ship.autoSellTimer >= 300) {
        ship.autoSellTimer = 0;
        let sold = false;
        // Sell harvest: 3 harvest → 5 gold
        if (state.harvest >= 3) {
          state.harvest -= 3;
          state.gold += 5;
          ship.autoSellLog.push({ item: 'harvest', qty: 3, gold: 5, t: frameCount });
          sold = true;
        }
        // Sell crystals: 2 crystals → 8 gold
        if (state.crystals >= 2) {
          state.crystals -= 2;
          state.gold += 8;
          ship.autoSellLog.push({ item: 'crystals', qty: 2, gold: 8, t: frameCount });
          sold = true;
        }
        // Keep log trimmed
        ship.autoSellLog = ship.autoSellLog.filter(e => frameCount - e.t < 300);
        if (sold) {
          let sx2 = w2sX(ship.dockX);
          let sy2 = w2sY(ship.dockY);
          addFloatingText(sx2, sy2 - 30, '+Gold', '#ffcc44');
          let totalGold = ship.autoSellLog.filter(e => frameCount - e.t < 5).reduce((s, e) => s + e.gold, 0);
          if (totalGold > 0) addNotification('+' + totalGold + 'g from auto-trade', '#ccaa44');
        }
      }
      break;

    case 'leaving':
      ship.x -= 2;
      ship.y += 0.1; // sail away left
      if (ship.x < WORLD.islandCX - state.islandRX - 500) {
        ship.state = 'gone';
        ship.timer = 0;
        ship.nextArrival = 3600 + random(-600, 600);
      }
      break;
  }
}

function _shopPrice(res, qty) { return (typeof getMarketPrice==='function'?getMarketPrice(res):1)*qty; }
function _shopTrend(res) { return typeof getMarketTrend==='function'?getMarketTrend(res):0; }
function _shopLabel(action, qty, name, res) { let p=_shopPrice(res,qty); let t=_shopTrend(res); return action+' '+qty+' '+name+' \u2192 '+p+'g'+(t>0?' \u2191':t<0?' \u2193':''); }
function generateShopOffers() {
  let offers = [
    { type: 'buy', item: 'harvest', qty: 3, price: _shopPrice('harvest',3), label: _shopLabel('Sell',3,'Harvest','harvest'), trend: _shopTrend('harvest') },
    { type: 'buy', item: 'crystals', qty: 2, price: _shopPrice('crystals',2), label: _shopLabel('Sell',2,'Crystals','crystals'), trend: _shopTrend('crystals') },
    { type: 'buy', item: 'wood', qty: 5, price: _shopPrice('wood',5), label: _shopLabel('Sell',5,'Wood','wood'), trend: _shopTrend('wood') },
    { type: 'buy', item: 'fish', qty: 2, price: _shopPrice('fish',2), label: _shopLabel('Sell',2,'Fish','fish'), trend: _shopTrend('fish') },
    { type: 'sell', item: 'seeds', qty: 5, price: _shopPrice('seeds',5), label: _shopLabel('Buy',5,'Seeds','seeds'), trend: _shopTrend('seeds') },
    { type: 'sell', item: 'grapeSeeds', qty: 3, price: _shopPrice('grapeSeeds',3), label: _shopLabel('Buy',3,'Grape Seeds','grapeSeeds'), trend: _shopTrend('grapeSeeds') },
    { type: 'sell', item: 'oliveSeeds', qty: 3, price: _shopPrice('oliveSeeds',3), label: _shopLabel('Buy',3,'Olive Seeds','oliveSeeds'), trend: _shopTrend('oliveSeeds') },
    { type: 'sell', item: 'stone', qty: 5, price: _shopPrice('stone',5), label: _shopLabel('Buy',5,'Stone','stone'), trend: _shopTrend('stone') },
    { type: 'sell', item: 'flaxSeeds', qty: 3, price: _shopPrice('flaxSeeds',3), label: _shopLabel('Buy',3,'Flax Seeds','flaxSeeds'), trend: _shopTrend('flaxSeeds') },
    { type: 'sell', item: 'pomegranateSeeds', qty: 2, price: _shopPrice('pomegranateSeeds',2), label: _shopLabel('Buy',2,'Pomegranate','pomegranateSeeds'), trend: _shopTrend('pomegranateSeeds') },
    { type: 'sell', item: 'lotusSeeds', qty: 2, price: _shopPrice('lotusSeeds',2), label: _shopLabel('Buy',2,'Lotus Seeds','lotusSeeds'), trend: _shopTrend('lotusSeeds') },
  ];
  // Tool upgrades (only show if not owned)
  if (!state.tools.sickle) offers.push({ type: 'tool', tool: 'sickle', price: 15, label: 'Bronze Sickle → 15 Gold (2x harvest)' });
  if (!state.tools.axe) offers.push({ type: 'tool', tool: 'axe', price: 20, label: 'Iron Axe → 20 Gold (1-hit chop)' });
  if (!state.tools.net) offers.push({ type: 'tool', tool: 'net', price: 25, label: 'Fishing Net → 25 Gold (auto fish)' });
  if (!state.tools.copperRod) offers.push({ type: 'tool', tool: 'copperRod', price: 30, label: 'Copper Rod → 30 Gold (+15% catch rate)' });
  else if (!state.tools.ironRod) offers.push({ type: 'tool', tool: 'ironRod', price: 60, label: 'Iron Rod → 60 Gold (+30% catch rate)' });
  if (!state.tools.steelPick) offers.push({ type: 'tool', tool: 'steelPick', price: 40, label: 'Steel Pickaxe → 40 Gold (2x mining speed)' });
  if (!state.tools.lantern) offers.push({ type: 'tool', tool: 'lantern', price: 35, label: 'Lantern → 35 Gold (night visibility)' });
  // Equipment upgrades
  if (typeof EQUIPMENT_DB !== 'undefined' && state.equipment) {
    var equipOffers = ['pilum','flamma','trident','centurion_crest','laurel','imperial_plate',
      'greaves','iron_greaves','linen_skirt','caligae','war_boots','mercury_sandals',
      'buckler','iron_shield','lantern_oh','sickle_eq','iron_pick','fishing_rod',
      'mars_ring','hermes_charm'];
    for (var ei = 0; ei < equipOffers.length; ei++) {
      var eid = equipOffers[ei];
      var edata = EQUIPMENT_DB[eid];
      if (!edata || edata.price <= 0) continue;
      if (state.equipment[edata.slot] === eid) continue;
      var statStr = (edata.atk ? '+' + edata.atk + ' ATK ' : '') + (edata.def ? '+' + edata.def + ' DEF ' : '') + (edata.spd ? '+' + edata.spd + ' SPD' : '');
      offers.push({ type: 'equip', equipId: eid, price: edata.price, label: edata.name + ' (' + EQUIP_SLOTS[edata.slot].name + ') → ' + edata.price + 'g (' + statStr.trim() + ')' });
    }
  }
  return offers;
}

function doTrade(offerIdx) {
  let offer = state.ship.offers[offerIdx];
  if (!offer) return;
  let priceMult = typeof getEventShopPriceMult === 'function' ? getEventShopPriceMult() : 1;
  // Marketplace (emporium) discount: -10% per marketplace building
  if (state.buildings) {
    let mpCount = state.buildings.filter(b => b.type === 'marketplace').length;
    if (mpCount > 0) priceMult *= max(0.5, 1 - 0.1 * mpCount);
  }
  if (offer.type === 'equip') {
    let finalPrice = max(1, floor(offer.price * priceMult));
    if (state.gold >= finalPrice) {
      state.gold = max(0, state.gold - finalPrice);
      equipItem(offer.equipId);
      if (snd) snd.playSFX('coin_clink');
      addFloatingText(width / 2, height * 0.5, EQUIPMENT_DB[offer.equipId].name + ' equipped!', '#ffcc44');
      spawnParticles(state.player.x, state.player.y, 'build', 8);
      state.ship.offers = generateShopOffers();
    } else {
      addFloatingText(width / 2, height * 0.5, 'Need ' + finalPrice + ' gold!', C.buildInvalid);
    }
  } else if (offer.type === 'tool') {
    let finalPrice = max(1, floor(offer.price * priceMult));
    if (state.gold >= finalPrice) {
      state.gold = max(0, state.gold - finalPrice);
      state.tools[offer.tool] = 1;
      if (snd) snd.playSFX('coin_clink');
      addFloatingText(width / 2, height * 0.5, 'Got ' + offer.tool + '!', C.solarBright);
      spawnParticles(state.player.x, state.player.y, 'build', 8);
      // Refresh offers to remove purchased tool
      state.ship.offers = generateShopOffers();
    } else {
      addFloatingText(width / 2, height * 0.5, 'Need ' + finalPrice + ' gold!', C.buildInvalid);
    }
  } else if (offer.type === 'buy') {
    if (state[offer.item] >= offer.qty) {
      state[offer.item] -= offer.qty;
      state.gold += offer.price;
      if (typeof recordMarketSell === 'function') recordMarketSell(offer.item, offer.qty);
      if (state.score) state.score.goldEarned += offer.price;
      if (snd) snd.playSFX('coin_clink');
      addFloatingText(width / 2, height * 0.5, '+' + offer.price + ' Gold!', C.solarBright);
    } else {
      addFloatingText(width / 2, height * 0.5, 'Not enough ' + offer.item + '!', C.buildInvalid);
    }
  } else {
    let finalPrice = max(1, floor(offer.price * priceMult));
    if (state.gold >= finalPrice) {
      state.gold = max(0, state.gold - finalPrice);
      state[offer.item] += offer.qty;
      if (typeof recordMarketBuy === 'function') recordMarketBuy(offer.item, offer.qty);
      if (snd) snd.playSFX('coin_clink');
      addFloatingText(width / 2, height * 0.5, '+' + offer.qty + ' ' + offer.item + '!', C.crystalGlow);
    } else {
      addFloatingText(width / 2, height * 0.5, 'Need ' + finalPrice + ' gold!', C.buildInvalid);
    }
  }
}

function drawShip() {
  let ship = state.ship;
  if (ship.state === 'gone') return;

  let sx = w2sX(ship.x);
  let sy = w2sY(ship.y);
  let bob = sin(frameCount * 0.025) * 3;

  push();
  translate(sx, sy + bob);
  // Flip ship to face island (right) when leaving, normal when docked/arriving from left
  if (ship.state === 'leaving') scale(-1, 1);
  noStroke();

  // Water around hull — pixel wake rects
  let t = frameCount * 0.03;
  for (let i = 0; i < 6; i++) {
    let wakeX = floor(-60 - i * 12 + sin(t + i) * 3);
    let wakeY = floor(8 + i * 2);
    fill(180, 210, 230, 40 - i * 5);
    rect(wakeX - 8 + i, wakeY - 1, 16 - i * 2, 2);
  }
  // Bow spray — pixel rect
  fill(200, 225, 240, floor(30 + sin(t * 2) * 15));
  rect(58, 0, 14, 3);
  // Water reflection — pixel rect
  fill(40, 70, 100, 25);
  rect(-55, 16, 110, 6);

  // ─── TRIREME HULL — pixel rects ───
  // Hull body — tapered layers of rects (wide center, narrow ends)
  fill(75, 45, 20);
  rect(-50, -4, 100, 4);   // upper hull
  rect(-48, 0, 96, 4);     // mid hull
  rect(-44, 4, 84, 4);     // lower hull
  rect(-38, 8, 72, 2);     // keel strip
  // Stern taper
  rect(-55, -2, 6, 6);
  // Bow taper
  rect(50, -2, 8, 4);
  rect(56, -1, 6, 2);

  // Hull planking — pixel lines
  stroke(90, 55, 25, 80);
  strokeWeight(1);
  line(-48, 2, 50, 2);
  line(-46, 6, 45, 6);
  noStroke();

  // Bronze ram at bow — stepped pixel wedge
  fill(160, 120, 40);
  rect(56, -2, 4, 4);
  rect(60, -1, 4, 2);
  rect(64, -1, 2, 2);
  fill(180, 140, 50, 150);
  rect(58, -1, 6, 2);

  // Oar bank — pixel vertical rects (animated)
  let rowPhase = frameCount * 0.06;
  fill(100, 70, 35);
  for (let i = 0; i < 8; i++) {
    let ox = floor(-38 + i * 10);
    let oarDip = floor(sin(rowPhase + i * 0.4) * 4);
    rect(ox, 10, 1, 10 + oarDip);
  }

  // Deck — pixel rect
  fill(100, 68, 32);
  rect(-48, -6, 96, 5);

  // Deck rail — pixel rect
  fill(85, 55, 25);
  rect(-48, -8, 96, 2);

  // ─── MAST + SAIL — pixel rects ───
  // Mast
  fill(90, 60, 28);
  rect(-2, -50, 4, 44);
  // Yard (horizontal beam)
  fill(80, 52, 24);
  rect(-28, -48, 56, 3);

  // Sail — pixel rect with billow offset
  let sailBillow = floor(sin(frameCount * 0.02) * 3);
  fill(220, 205, 175, 230);
  rect(-26 + sailBillow, -46, 52, 34);
  // Faction-colored stripe
  let _shipFM = getFactionMilitary();
  fill(_shipFM.conquestFlag[0], _shipFM.conquestFlag[1], _shipFM.conquestFlag[2], 180);
  rect(-25 + sailBillow, -32, 50, 10);

  // Rigging — pixel diagonal lines
  stroke(100, 80, 50, 100);
  strokeWeight(1);
  line(0, -50, -48, -6);
  line(0, -50, 48, -6);
  noStroke();

  // Stern ornament — pixel stepped post
  fill(120, 80, 30);
  rect(-50, -4, 3, 2);    // base
  rect(-52, -8, 3, 4);    // mid
  rect(-51, -14, 3, 6);   // upper
  rect(-50, -22, 3, 8);   // top post
  rect(-49, -28, 3, 6);   // peak
  if (state.faction === 'seapeople') {
    // Sea People: dragon/serpent figurehead at bow
    fill(60, 50, 40);
    rect(62, -8, 3, 8);   // neck
    rect(60, -16, 5, 8);  // head base
    fill(42, 138, 106);
    rect(59, -20, 7, 4);  // crest
    fill(200, 60, 40);
    rect(64, -14, 2, 2);  // eye
    // Larger hull extension
    fill(50, 35, 20);
    rect(-56, -2, 6, 4);  // wider stern
  } else {
    // Standard: eagle/standard at top — pixel rect + crown
    fill(180, 140, 50);
    rect(-51, -32, 6, 4);
    fill(200, 160, 60);
    rect(-50, -36, 4, 4);   // eagle head
    rect(-52, -34, 2, 2);   // left wing
    rect(-44, -34, 2, 2);   // right wing
  }

  // Flag at mast top — pixel rect with wave, faction color
  let flagWave = floor(sin(frameCount * 0.04) * 2);
  let _mf = getFactionMilitary();
  fill(_mf.conquestFlag[0], _mf.conquestFlag[1], _mf.conquestFlag[2]);
  rect(1, -58, 10 + flagWave, 4);
  rect(1, -54, 8 + flagWave, 4);

  // "TRADE" indicator — counter-flip text so it reads correctly
  if (ship.state === 'docked') {
    push();
    fill(color(C.solarBright));
    textAlign(CENTER, CENTER);
    textSize(10);
    text('MERCATOR', 0, -65);
    if (ship.shopOpen) {
      fill(color(C.crystalGlow));
      textSize(9);
      text('Trading...', 0, 22);
    } else {
      fill(color(C.textDim));
      textSize(11);
      text('walk near to trade', 0, 22);
    }
    pop();
  }

  pop();
}


// ─── SCREEN SHAKE ─────────────────────────────────────────────────────────
// dirX/dirY: optional direction vector for biased shake
// mode: 'random' (default), 'directional' (biased along dir), 'circular' (decaying orbit for boss kills)
let _shakeMode = 'random';
let _shakeDirX = 0, _shakeDirY = 0;
let _shakeIntensity = 0;
let _shakeMaxTimer = 0;

function triggerScreenShake(intensity, duration, dirX, dirY, mode) {
  if (!gameSettings.screenShake) return;
  shakeTimer = duration;
  _shakeMaxTimer = duration;
  _shakeIntensity = intensity;
  _shakeDirX = dirX || 0;
  _shakeDirY = dirY || 0;
  _shakeMode = mode || 'random';
  if (_shakeMode === 'directional' && (dirX || dirY)) {
    let m = sqrt(dirX * dirX + dirY * dirY) || 1;
    _shakeDirX = dirX / m;
    _shakeDirY = dirY / m;
    shakeX = _shakeDirX * intensity;
    shakeY = _shakeDirY * intensity;
  } else {
    shakeX = random(-intensity, intensity);
    shakeY = random(-intensity, intensity);
  }
}

function updateShake(dt) {
  if (shakeTimer > 0) {
    shakeTimer -= dt;
    let t = max(0, shakeTimer / (_shakeMaxTimer || 20));
    if (_shakeMode === 'directional') {
      let perp = random(-1, 1) * _shakeIntensity * 0.3 * t;
      shakeX = _shakeDirX * _shakeIntensity * t + (-_shakeDirY) * perp;
      shakeY = _shakeDirY * _shakeIntensity * t + (_shakeDirX) * perp;
    } else if (_shakeMode === 'circular') {
      let angle = shakeTimer * 0.8;
      shakeX = cos(angle) * _shakeIntensity * t;
      shakeY = sin(angle) * _shakeIntensity * 0.7 * t;
    } else {
      shakeX = random(-3, 3) * t;
      shakeY = random(-3, 3) * t;
    }
  } else {
    shakeX = 0; shakeY = 0;
    _shakeMode = 'random';
  }
  // Subtle wind sway during drift storms
  if (stormActive) {
    shakeX += _stormWindOffset;
  }
}



function drawLoot(a) {
  for (let l of a.loot) {
    let lx = floor(w2sX(l.x));
    let ly = floor(w2sY(l.y));
    let bob = floor(sin(frameCount * 0.06 + l.bobPhase) * 3);
    let alpha = l.life < 60 ? map(l.life, 0, 60, 50, 255) : 255;
    noStroke();
    // Pixel glow cross
    let gr, gg, gb;
    if (l.type === 'gold') { gr = 255; gg = 200; gb = 40; }
    else if (l.type === 'crystal') { gr = 100; gg = 200; gb = 255; }
    else if (l.type === 'wood') { gr = 180; gg = 130; gb = 60; }
    else { gr = 160; gg = 160; gb = 160; }
    fill(gr, gg, gb, alpha * 0.2);
    rect(lx - 4, ly + bob - 1, 8, 2);
    rect(lx - 1, ly + bob - 4, 2, 8);
    // Pixel orb
    fill(gr, gg, gb, alpha);
    rect(lx - 3, ly - 5 + bob, 6, 6);
    rect(lx - 4, ly - 4 + bob, 8, 4);
    // Pixel shine
    fill(255, 255, 255, alpha * 0.4);
    rect(lx - 3, ly - 5 + bob, 2, 2);
  }
}

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
      lg.recruits = min(lg.recruits + 1, lg.maxRecruits + getFactionData().recruitBonus);
      lg.trainingQueue--;
      lg.trainingTimer = lg.trainingQueue > 0 ? 300 : 0;
      addFloatingText(w2sX(lg.castrumX), w2sY(lg.castrumY) - 30, getFactionTerms().soldier + ' Ready!', '#cc4444');
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
      if (lg.recruits + lg.trainingQueue >= lg.maxRecruits + getFactionData().recruitBonus) { addFloatingText(width / 2, height * 0.3, getFactionTerms().army + ' at capacity!', '#ff6644'); return true; }
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

// ─── COLONY OVERLAY — draws colony buildings/farms on settled Terra Nova ──
// ─── INPUT ────────────────────────────────────────────────────────────────
function mouseWheel(event) {
  // Scroll keybind list in settings
  if (gameScreen === 'settings') {
    let maxScroll = max(0, Object.keys(DEFAULT_KEYBINDS).length * 18 - 10 * 18);
    _keybindScrollOffset = constrain(_keybindScrollOffset + (event.delta > 0 ? 18 : -18), 0, maxScroll);
    return false;
  }
  // Zoom camera with scroll wheel during gameplay
  if (gameScreen === 'game' && state && state.isInitialized) {
    let delta = -event.delta * 0.001;
    let zMin = (state.rowing && state.rowing.active) ? CAM_ZOOM_MIN_SAILING : CAM_ZOOM_MIN;
    camZoomTarget = constrain(camZoomTarget + delta, zMin, CAM_ZOOM_MAX);
    return false;
  }
  let dir = event.delta > 0 ? 1 : -1;
  let p = state.player;
  p.hotbarSlot = ((p.hotbarSlot + dir) % HOTBAR_ITEMS.length + HOTBAR_ITEMS.length) % HOTBAR_ITEMS.length;
  return false;
}

function mousePressed() {
  if (snd) snd.resume();
  // Right-click cancels click-to-move
  if (mouseButton === RIGHT) {
    if (state && state.player) { state.player.targetX = null; state.player.targetY = null; state.player.vx = 0; state.player.vy = 0; state.player.moving = false; }
    return;
  }
  if (gameScreen === 'lobby') { if (typeof lobbyHandleClick === 'function') lobbyHandleClick(); return; }
  if (gameScreen !== 'game') { handleMenuClick(); return; }
  if (state.introPhase !== 'done') { skipIntro(); return; }
  if (factionSelectActive) {
    if (_pendingFaction) { selectFaction(_pendingFaction); _pendingFaction = null; return; }
    if (factionSelectHover) { _pendingFaction = factionSelectHover; }
    return;
  }
  if (state.cutscene) { skipCutscene(); return; }
  // Dialog choice click handling
  if (dialogState.active && dialogState.choices && dialogState.displayLen >= dialogState.text.length) {
    let d = dialogState, boxW = min(width - 40, 440), boxH = 90;
    let bx = (width - boxW) / 2, by = height - boxH - 20, portW = 56;
    let choiceY = by + boxH + 4, choiceX = bx + portW + 16;
    for (let i = 0; i < d.choices.length; i++) {
      let ch = d.choices[i];
      let cbw = textWidth(ch.text) + 24;
      let cbx = choiceX;
      for (let j = 0; j < i; j++) cbx += textWidth(d.choices[j].text) + 24 + 8;
      if (mouseX > cbx && mouseX < cbx + cbw && mouseY > choiceY && mouseY < choiceY + 22) {
        if (typeof ch.action === 'function') ch.action();
        return;
      }
    }
    return; // block other clicks while dialog choices visible
  }
  // Multiplayer clicks (rival panel + trade offer)
  if (typeof MP !== 'undefined' && MP.connected) {
    if (state._mpTradeOffer && MP.handleTradeOfferClick(mouseX, mouseY)) return;
    if (MP.handleRivalPanelClick(mouseX, mouseY)) return;
  }
  // Shipyard click
  if (typeof handleShipyardClick === 'function' && handleShipyardClick()) return;
  // Army battle — allow clicks during deploy for formation picker
  if (typeof _armyBattle !== 'undefined' && _armyBattle) {
    if (typeof handleArmyBattleClick === 'function') handleArmyBattleClick(mouseX, mouseY);
    return;
  }
  if (dismissIslandMilestone()) return;
  // Screenshot capture on click
  if (screenshotMode) {
    photoModeFlash = 6; // ~100ms at 60fps
    if (snd) snd.playSFX('shutter_click');
    saveCanvas('mare-nostrum-' + nf(month(), 2) + nf(day(), 2) + '-' + nf(hour(), 2) + nf(minute(), 2), 'png');
    return;
  }
  // Tech tree click
  if (state.techTreeOpen && typeof handleTechTreeClick === 'function') {
    if (handleTechTreeClick(mouseX, mouseY)) return;
  }
  // Victory screen dismiss
  if (state.victoryScreen && state.victoryScreen.timer > 120) {
    state.victoryScreen = null;
    return;
  }
  // Hotbar tap detection (mobile + desktop click)
  if (typeof _handleHotbarTap === 'function' && _handleHotbarTap(mouseX, mouseY)) return;
  // Legion button click
  if (typeof handleLegionButtonClick === 'function' && handleLegionButtonClick(mouseX, mouseY)) return;
  // Wardrobe click handling
  if (wardrobeOpen) {
    let pw = 220, ph = 280;
    let px = width / 2 - pw / 2;
    let py = height / 2 - ph / 2;
    let swatchSize = 24, swatchGap = 8;
    let swatchStartX = px + (pw - (TUNIC_COLORS.length * (swatchSize + swatchGap) - swatchGap)) / 2;
    for (let i = 0; i < TUNIC_COLORS.length; i++) {
      let sx = swatchStartX + i * (swatchSize + swatchGap) + swatchSize / 2;
      let sy = py + 54 + swatchSize / 2;
      if (dist(mouseX, mouseY, sx, sy) < swatchSize / 2 + 2) {
        state.wardrobe.tunicColor = i;
        return;
      }
    }
    let hwSize = 40, hwGap = 16;
    let hwStartX = px + (pw - (HEADWEAR.length * (hwSize + hwGap) - hwGap)) / 2;
    for (let i = 0; i < HEADWEAR.length; i++) {
      let hx = hwStartX + i * (hwSize + hwGap);
      let hy = py + 120;
      if (mouseX > hx && mouseX < hx + hwSize && mouseY > hy && mouseY < hy + hwSize) {
        if (HEADWEAR[i].unlocked()) state.wardrobe.headwear = i;
        return;
      }
    }
    if (mouseX < px || mouseX > px + pw || mouseY < py || mouseY > py + ph) {
      wardrobeOpen = false;
    }
    return;
  }
  // Dismiss lore tablet popup / narrative dialogue on click
  if (typeof loreTabletPopup !== 'undefined' && loreTabletPopup) { loreTabletPopup = null; return; }
  if (typeof narrativeDialogue !== 'undefined' && narrativeDialogue) { narrativeDialogue = null; return; }
  // Skill tree click handling
  if (typeof handleSkillTreeClick === 'function' && handleSkillTreeClick(mouseX, mouseY)) return;
  // Economy UI click handling
  if (typeof handleEconomyClick === 'function' && handleEconomyClick(mouseX, mouseY)) return;
  // Expedition modifier select — click handling
  if (state.expeditionModifierSelect) {
    let panW = 340, panH = 230;
    let px = width / 2 - panW / 2, py = height / 2 - panH / 2;
    let mods = Object.keys(EXPEDITION_MODIFIERS);
    let sy = py + 48;
    for (let i = 0; i < mods.length; i++) {
      let ry = sy + i * 34;
      if (mouseX > px + 8 && mouseX < px + panW - 8 && mouseY > ry && mouseY < ry + 30) {
        // Click to select
        if (state.expeditionModifier === mods[i]) {
          // Double-click on already selected = confirm (embark)
          let expNum = state.conquest.expeditionNum;
          let supplyCost = {
            gold: 15 + expNum * 5 + state.conquest.soldiers.length * 5,
            wood: 10 + expNum * 3,
            meals: min(3, 1 + floor(expNum / 3)),
          };
          if (state.gold < supplyCost.gold) { addFloatingText(width / 2, height * 0.3, 'Need ' + supplyCost.gold + ' gold!', '#ff6644'); return; }
          if (state.wood < supplyCost.wood) { addFloatingText(width / 2, height * 0.3, 'Need ' + supplyCost.wood + ' wood!', '#ff6644'); return; }
          if (state.meals < supplyCost.meals) { addFloatingText(width / 2, height * 0.3, 'Need ' + supplyCost.meals + ' meals!', '#ff6644'); return; }
          state.gold = max(0, state.gold - supplyCost.gold);
          state.wood -= supplyCost.wood;
          state.meals -= supplyCost.meals;
          state.expeditionModifierSelect = false;
          addFloatingText(width / 2, height * 0.38, getModifier().name + ' Expedition', getModifier().color);
          // enterConquest() deprecated -- openworld seamless
        } else {
          state.expeditionModifier = mods[i];
        }
        return;
      }
    }
    return; // block other clicks
  }

  // Upgrade shop click handling
  if (state.upgradeShopOpen) {
    let panW = 320, panH = 300;
    let px = width / 2 - panW / 2, py = height / 2 - panH / 2;
    let keys = Object.keys(EXPEDITION_UPGRADES);
    let sy = py + 70;
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      let tier = state.expeditionUpgrades[key] || 0;
      let upg = EXPEDITION_UPGRADES[key];
      if (tier >= upg.tiers.length) continue;
      let btnX = px + panW - 85, btnY = sy + i * 36 + 4;
      if (mouseX > btnX && mouseX < btnX + 72 && mouseY > btnY && mouseY < btnY + 24) {
        buyExpeditionUpgrade(key);
        return;
      }
    }
    return;
  }
  // Night market click handling
  if (state.nightMarket.shopOpen) {
    let panW = 310, panH = 230;
    let panX = width / 2 - panW / 2;
    let panY = height / 2 - panH / 2 - 10;
    for (let i = 0; i < 4; i++) {
      let item = state.nightMarket.stock[i];
      if (!item || !canAffordMarketItem(item)) continue;
      let oy = panY + 50 + i * 40;
      if (mouseX > panX + 12 && mouseX < panX + panW - 12 && mouseY > oy && mouseY < oy + 34) {
        buyMarketItem(i);
        return;
      }
    }
    return;
  }
  // Dismiss daily summary
  if (state.showSummary) {
    state.showSummary = false;
    return;
  }
  // Conquest mode clicks
  if (state.conquest.active) {
    let cq = state.conquest;
    let wx = s2wX(mouseX);
    let wy = s2wY(mouseY);
    if (cq.buildMode) {
      placeConquestBuilding(wx, wy);
    } else {
      // Click to chop nearest tree
      let best = null, bestD = 40;
      for (let t of cq.trees) {
        if (!t.alive) continue;
        let d = dist(state.player.x, state.player.y, t.x, t.y);
        if (d < bestD) { best = t; bestD = d; }
      }
      if (best) {
        // Auto-switch to axe for chopping
        if (state.player.hotbarSlot !== 1) { state.player.hotbarSlot = 1; }
        cq.chopTarget = best;
        cq.chopTimer = 0;
      }
    }
    return;
  }
  if (state.buildMode) {
    if (state.demolishMode) {
      // If confirm dialog is showing, ignore clicks (use E/ESC keys)
      if (state.demolishConfirm) return;
      let wx = s2wX(mouseX), wy = s2wY(mouseY);
      let landmark = ['granary', 'well', 'temple', 'market', 'forum'];
      for (let i = state.buildings.length - 1; i >= 0; i--) {
        let b = state.buildings[i];
        if (landmark.includes(b.type)) continue;
        if (abs(wx - b.x) < (b.w || 24) * 0.7 && abs(wy - b.y) < (b.h || 24) * 0.7) {
          // Ruined buildings: repair instead of demolish
          if (b.ruined) {
            repairBuilding(b);
            return;
          }
          // Calculate 50% refund
          let bp = BLUEPRINTS[b.type];
          let refund = {};
          if (bp && bp.cost) {
            for (let res in bp.cost) {
              let amt = floor(bp.cost[res] * 0.5);
              if (amt > 0) refund[res] = amt;
            }
          }
          state.demolishConfirm = { buildingIndex: i, building: b, refund: refund };
          return;
        }
      }
      addFloatingText(w2sX(wx), w2sY(wy) - 20, 'No building here', C.textDim);
      return;
    }
    let wx = snapToGrid(s2wX(mouseX - shakeX));
    let wy = snapToGrid(s2wY(mouseY - shakeY - floatOffset));
    placeBuilding(wx, wy);
    return;
  }

  // Ship shop click handling (tabbed UI)
  if (state.ship.shopOpen && state.ship.state === 'docked') {
    if (!state.ship.shopTab) state.ship.shopTab = 'buy';
    let panW = min(320, width - 20);
    let tab = state.ship.shopTab;
    let filtered = typeof _getShopTabOffers === 'function' ? _getShopTabOffers(tab, state.ship.offers) : state.ship.offers;
    let headerH = 90;
    let panH = min(headerH + filtered.length * 28 + 28, height - 20);
    let panX = max(10, width / 2 - panW / 2);
    let panY = max(10, height / 2 - panH / 2);
    // Tab click detection
    let tabs = ['buy', 'sell', 'upgrade'];
    let tabW = floor((panW - 36) / 3);
    let tabY = panY + 42;
    for (let t = 0; t < 3; t++) {
      let tx = panX + 12 + t * (tabW + 6);
      if (mouseX > tx && mouseX < tx + tabW && mouseY > tabY && mouseY < tabY + 22) {
        state.ship.shopTab = tabs[t];
        return;
      }
    }
    // Offer click detection
    let listY = tabY + 40;
    for (let i = 0; i < filtered.length; i++) {
      let oy = listY + i * 28;
      if (mouseX > panX + 12 && mouseX < panX + panW - 12 && mouseY > oy && mouseY < oy + 24) {
        let origIdx = state.ship.offers.indexOf(filtered[i]);
        if (origIdx >= 0) doTrade(origIdx);
        return;
      }
    }
    return;
  }

  // Build mode click-to-select building type (decoration only)
  if (state.buildMode) {
    let baseTypes = ['floor', 'wall', 'door', 'chest', 'bridge', 'fence', 'torch', 'flower', 'lantern', 'mosaic', 'aqueduct', 'bath'];
    let slotW = 48, gap = 4;
    let numBase = baseTypes.length;
    let barW = numBase * slotW + (numBase - 1) * gap + 24;
    let rowH = 56;
    let barH = rowH + 8;
    let barX = width / 2 - barW / 2;
    let barY = height - barH - 16;
    if (mouseY > barY && mouseY < barY + barH) {
      let startX = barX + 12;
      let ty0 = barY + 5;
      for (let i = 0; i < baseTypes.length; i++) {
        let tx = startX + i * (slotW + gap);
        if (mouseX > tx && mouseX < tx + slotW && mouseY > ty0 && mouseY < ty0 + 48) {
          state.buildType = baseTypes[i];
          return;
        }
      }
    }
  }

  // Check if clicking a farm plot
  let clicked = false;
  let hs = state.player.hotbarSlot;
  state.plots.forEach(p => {
    let px = w2sX(p.x);
    let py = w2sY(p.y);
    if (dist(mouseX, mouseY, px, py) < p.w * 0.7) {
      clicked = true;
      if (p.ripe) {
        // Auto-switch to sickle for harvesting; bonus if already equipped
        let toolBonus = hs === 0;
        if (hs !== 0) { state.player.hotbarSlot = 0; addFloatingText(width / 2, height - 110, 'Switched to Sickle', '#aaddaa'); }
        state.player.toolSwing = 12;
        state.player._hitlagFrames = 2;
        let wasBlessed = p.blessed;
        p.planted = false; p.ripe = false; p.glowing = false;
        p.timer = 0; p.stage = 0; p.blessed = false;
        let harvestAmt = (state.npc && state.npc.hearts >= 5) ? 2 : 1;
        if (state.tools && state.tools.sickle) harvestAmt *= 2;
        if (state.blessing && state.blessing.type === 'luck') harvestAmt *= 2;
        if (state.heartRewards && state.heartRewards.includes('golden')) harvestAmt *= 2;
        if (wasBlessed) harvestAmt *= 3;
        if (state.prophecy && state.prophecy.type === 'harvest') harvestAmt += 1;
        let festR = getFestival();
        if (festR && festR.effect.allResources) harvestAmt *= festR.effect.allResources;
        // Right tool bonus: +1 harvest if sickle was already equipped
        if (toolBonus) harvestAmt += 1;
        // Agricultural colony spec: +30% harvest yield
        if (state.colonySpec && state.colonySpec['conquest'] === 'agricultural') harvestAmt = floor(harvestAmt * 1.3);
        // Fertile Hands passive skill bonus
        if (typeof getHarvestSkillBonus === 'function') harvestAmt = floor(harvestAmt * getHarvestSkillBonus());
        // Random event bonus (festival_day +50%, harvest_moon +100%)
        harvestAmt = floor(harvestAmt * getEventHarvestMult());
        // Harvest combo
        harvestAmt = onHarvestCombo(p, harvestAmt);
        // Crop rotation & soil fertility
        if (typeof onPlotHarvest === 'function') {
          let _rotBonus = onPlotHarvest(p);
          if (_rotBonus) { harvestAmt = floor(harvestAmt * 1.1); addFloatingText(w2sX(p.x), w2sY(p.y) - 65, 'Rotation Bonus! +10%', '#44cc88'); }
        }
        // Tech: selective_breeding — 25% chance 2x harvest
        if (typeof hasTech === 'function' && hasTech('selective_breeding') && random() < 0.25) {
          harvestAmt *= 2;
          addFloatingText(w2sX(p.x), w2sY(p.y) - 20, '2x BREED!', '#88cc44');
        }
        state.harvest += harvestAmt;
        state.dailyActivities.harvested += harvestAmt;
        if (snd) snd.playSFX('harvest');
        triggerPlayerJoy();
        unlockJournal('first_harvest');
        if (!state.codex.cropsGrown) state.codex.cropsGrown = {};
        state.codex.cropsGrown[p.cropType || 'grain'] = true;
        let _ck = p.cropType || 'grain';
        if (!state.codex.crops) state.codex.crops = {};
        if (!state.codex.crops[_ck]) state.codex.crops[_ck] = { harvested: true, count: 0, firstDay: state.day };
        state.codex.crops[_ck].count += harvestAmt;
        state.codex.crops[_ck].harvested = true;
        checkQuestProgress('harvest', harvestAmt);
        if (typeof advanceMainQuestCounter === 'function') advanceMainQuestCounter('mq_harvested', harvestAmt);
        if (typeof grantXP === 'function') grantXP(5 * harvestAmt);
        trackMilestone('first_harvest');
        if (typeof trackStat === 'function') trackStat('cropsHarvested', harvestAmt);
        if (typeof checkDailyQuestProgress === 'function') checkDailyQuestProgress('harvest', harvestAmt);
        if (typeof triggerNPCReaction === 'function') triggerNPCReaction('harvest', p.x, p.y);
        // Auto-seeds: each harvest gives 1-2 seeds back
        let seedBack = 1 + (random() < 0.5 ? 1 : 0);
        if (Object.keys(state.codex.crops).length >= 7) seedBack += 1;
        state.seeds += seedBack;
        addFloatingText(px, py - 25, '+' + seedBack + ' Seed', '#8fbc8f');
        // Seasonal crop bonuses
        let scData = getSeasonalCropData(p.cropType);
        if (scData) {
          if (p.cropType === 'sunfruit') { state.solar = min(state.maxSolar, state.solar + 15); addFloatingText(px, py - 35, '+15 Solar!', '#ffaa33'); }
          if (p.cropType === 'frostherb') { state.crystals += 1; addFloatingText(px, py - 35, '+1 Crystal!', '#88ddff'); }
          if (p.cropType === 'pumpkin') { harvestAmt += 2; }
          if (p.cropType === 'wildflower') { spawnParticles(p.x, p.y, 'build', 10); }
        }
        // New crop bonuses
        if (p.cropType === 'lotus') { let lc = 1 + floor(random(2)); state.crystals += lc; addFloatingText(px, py - 35, '+' + lc + ' Crystal!', '#f0a0c8'); }
        if (p.cropType === 'pomegranate') { let pg = 3 + floor(random(3)); state.gold += pg; addFloatingText(px, py - 35, '+' + pg + ' Gold!', '#c82828'); }
        if (p.cropType === 'flax') { let fb = 1; state.wood += fb; addFloatingText(px, py - 35, '+' + fb + ' Fiber!', '#6496dc'); }
        let label = wasBlessed ? '+' + harvestAmt + ' BLESSED!' : (harvestAmt > 1 ? '+' + harvestAmt + ' Harvest!' : '+Harvest');
        let labelColor = scData ? scData.color : (wasBlessed ? '#ffdd00' : C.cropGlow);
        addFloatingText(px, py - 20, label, labelColor);
        if (typeof spawnHarvestArc === 'function') spawnHarvestArc(px, py - 20, label, labelColor, 'harvest');
        // Codex discovery for crops
        if (typeof markCodexDiscovery === 'function' && state.codex.crops[_ck] && state.codex.crops[_ck].count === harvestAmt) markCodexDiscovery('crops', _ck);
        spawnHarvestBurst(p.x, p.y, p.cropType || 'grain');
        triggerScreenShake(wasBlessed ? 4 : 1.5, wasBlessed ? 8 : 4);
      } else if (!p.planted) {
        let canPlant = false;
        let cropType = state.cropSelect || 'grain';
        if (cropType === 'grape' && state.grapeSeeds > 0) { state.grapeSeeds--; canPlant = true; }
        else if (cropType === 'olive' && state.oliveSeeds > 0) { state.oliveSeeds--; canPlant = true; }
        else if (cropType === 'flax' && state.flaxSeeds > 0) { state.flaxSeeds--; canPlant = true; }
        else if (cropType === 'pomegranate' && state.pomegranateSeeds > 0) { state.pomegranateSeeds--; canPlant = true; }
        else if (cropType === 'lotus' && state.lotusSeeds > 0) { state.lotusSeeds--; canPlant = true; }
        else if (isSeasonalCrop(cropType)) {
          let sc = getSeasonalCropData(cropType);
          if (sc && sc.season === getSeason() && state.seeds > 0) { state.seeds--; canPlant = true; }
          else { cropType = 'grain'; if (state.seeds > 0) { state.seeds--; canPlant = true; } }
        }
        else if (state.seeds > 0) { state.seeds--; canPlant = true; cropType = 'grain'; }
        if (canPlant) {
          if (typeof onPlotPlant === 'function') onPlotPlant(p, cropType);
          p.planted = true; p.stage = 0; p.timer = 0; p.cropType = cropType;
          if (typeof advanceNPCQuestCounter === 'function') advanceNPCQuestCounter('nq_livia_planted', 1);
          if (snd) snd.playSFX('build');
          let label = cropType === 'grain' ? 'Planted' : 'Planted ' + cropType;
          addFloatingText(px, py - 20, label, C.vineLight);
          if (state.plots && state.plots.filter(function(pl) { return pl.planted; }).length === 1) { addFloatingText(px, py - 40, 'It will grow over time!', '#88cc44'); }
        }
      }
    }
  });

  // Check if clicking a resource node (stone, crystal_shard)
  if (!clicked) {
    let rwx = s2wX(mouseX), rwy = s2wY(mouseY);
    let nearRes = state.resources.find(r => {
      if (!r.active) return false;
      return dist2(rwx, rwy, r.x, r.y) < 22 && dist2(state.player.x, state.player.y, r.x, r.y) < 60;
    });
    if (nearRes) {
      let pickBonus = state.player.hotbarSlot === 2;
      if (!pickBonus) { state.player.hotbarSlot = 2; addFloatingText(width / 2, height - 110, 'Switched to Pick', '#aaddaa'); }
      state.player.toolSwing = 12;
      state.player._hitlagFrames = 2;
      nearRes.active = false; nearRes.respawnTimer = 600;
      let amt = pickBonus ? 2 : 1;
      if (nearRes.type === 'stone') { state.stone += amt; checkQuestProgress('stone', amt); addFloatingText(w2sX(nearRes.x), w2sY(nearRes.y) - 15, '+' + amt + ' Stone', '#aaaaaa'); }
      else if (nearRes.type === 'crystal_shard') { state.crystals += amt; checkQuestProgress('crystal', amt); addFloatingText(w2sX(nearRes.x), w2sY(nearRes.y) - 15, '+' + amt + ' Crystal', C.crystalGlow); }
      if (snd) snd.playSFX(nearRes.type === 'stone' ? 'stone_mine' : 'crystal');
      spawnParticles(nearRes.x, nearRes.y, 'collect', 5);
      clicked = true;
    }
  }

  // Check if clicking a crystal node (must be nearby)
  if (!clicked) {
    let wx = s2wX(mouseX);
    let wy = s2wY(mouseY);
    let nearCrystal = state.crystalNodes.find(c => {
      if (c.charge <= 0) return false;
      let cd = dist2(wx, wy, c.x, c.y);
      let playerDist = dist2(state.player.x, state.player.y, c.x, c.y);
      return cd < 20 && playerDist < 60;
    });
    if (nearCrystal) {
      // Auto-switch to pickaxe for mining; bonus if already equipped
      let pickBonus = state.player.hotbarSlot === 2;
      if (!pickBonus) { state.player.hotbarSlot = 2; addFloatingText(width / 2, height - 110, 'Switched to Pick', '#aaddaa'); }
      state.player.toolSwing = 12;
      state.player._hitlagFrames = 2;
      let amt = nearCrystal.charge >= 30 ? 2 : 1;
      if (pickBonus) amt += 1;
      amt = floor(amt * (getFactionData().crystalIncomeMult || 1));
      state.crystals += amt;
      if (snd) snd.playSFX('crystal');
      state.dailyActivities.crystal += amt;
        if (typeof trackStat === 'function') trackStat('crystalsCollected', amt);
        if (typeof checkDailyQuestProgress === 'function') checkDailyQuestProgress('crystal', amt);
      checkQuestProgress('crystal', amt);
      if (typeof advanceMainQuestCounter === 'function') advanceMainQuestCounter('mq_crystals_gathered', amt);
      unlockJournal('first_crystal');
      nearCrystal.charge = 0;
      // Steel Pickaxe halves respawn time (2x mining speed)
      nearCrystal.respawnTimer = state.tools.steelPick ? 400 : 800;
      let csx = w2sX(nearCrystal.x), csy = w2sY(nearCrystal.y);
      addFloatingText(csx, csy - 15, '+' + amt + ' Crystal', C.crystalGlow);
      spawnCrystalPulse(nearCrystal.x, nearCrystal.y);
      triggerScreenShake(2, 4);
      clicked = true;
    }
  }

  // Check if clicking a tree (must be nearby)
  if (!clicked) {
    let wx = s2wX(mouseX);
    let wy = s2wY(mouseY);
    let nearTree = state.trees.find(t => {
      if (!t.alive) return false;
      let td = dist2(wx, wy, t.x, t.y);
      let playerDist = dist2(state.player.x, state.player.y, t.x, t.y);
      return td < 25 && playerDist < 60;
    });
    if (nearTree) {
      // Auto-switch to axe for chopping; bonus damage if already equipped
      if (state.player.hotbarSlot === 1) nearTree.health -= 1; // axe bonus hit
      if (state.player.hotbarSlot !== 1) { state.player.hotbarSlot = 1; addFloatingText(width / 2, height - 110, 'Switched to Axe', '#aaddaa'); }
      state.player.toolSwing = 12;
      state.player._hitlagFrames = 2;
      chopTree(nearTree);
      clicked = true;
    }
  }

  // Feed companion pets (gift system)
  if (!clicked) {
    let gwx = s2wX(mouseX);
    let gwy = s2wY(mouseY);
    if (tryCompanionGift(gwx, gwy)) clicked = true;
  }

  // Pet cats
  if (!clicked) {
    let wx = s2wX(mouseX);
    let wy = s2wY(mouseY);
    let nearCat = state.cats.find(c => {
      if (!c.adopted) return false;
      let cd = dist2(wx, wy, c.x, c.y);
      let pd = dist2(state.player.x, state.player.y, c.x, c.y);
      return cd < 20 && pd < 50;
    });
    if (nearCat && !nearCat.petted) {
      nearCat.petted = true;
      state.dailyActivities.catPetted++;
      let sx = w2sX(nearCat.x), sy = w2sY(nearCat.y);
      spawnParticles(nearCat.x, nearCat.y, 'burst', 5);
      addFloatingText(sx, sy - 15, 'Petted ' + nearCat.colorName + '!', '#ffaaaa');
      clicked = true;
    }
  }

  if (!clicked && mouseButton === LEFT && !(state._buildExitFrame && frameCount - state._buildExitFrame < 10)) {
    let wx = s2wX(mouseX);
    let wy = s2wY(mouseY);
    state.player.targetX = wx;
    state.player.targetY = wy;
  }
}

function mouseDragged() {
  // Drag volume sliders in settings
  if (gameScreen === 'settings' && snd) {
    let py = floor(height * 0.18);
    let sliderY = py + 80;
    let sliderW = 120;
    let slX = floor(width / 2 + 10);
    let keys = ['master', 'sfx', 'ambient', 'music'];
    for (let k of keys) {
      if (mouseX >= slX - 10 && mouseX <= slX + sliderW + 10 && mouseY >= sliderY - 12 && mouseY <= sliderY + 12) {
        snd.setVolume(k, constrain((mouseX - slX) / sliderW, 0, 1));
        return;
      }
      sliderY += 24;
    }
  }
}

function touchStarted() {
  if (snd) snd.resume();
  // Delegate to mousePressed for touch handling
  // Return false to prevent default browser behavior (zoom, scroll)
  return false;
}

function keyPressed() {
  if (snd) snd.resume();
  // Faction select keyboard shortcuts
  if (factionSelectActive) {
    if (_pendingFaction) {
      if (keyCode === 13 || keyCode === 10) { selectFaction(_pendingFaction); _pendingFaction = null; return; }
      if (keyCode === 27) { _pendingFaction = null; return; }
      return;
    }
    if (key === 'r' || key === 'R') { _pendingFaction = 'rome'; return; }
    if (key === 'c' || key === 'C') { _pendingFaction = 'carthage'; return; }
    if (key === 'e' || key === 'E') { _pendingFaction = 'egypt'; return; }
    if (key === 'g' || key === 'G') { _pendingFaction = 'greece'; return; }
    if (key === 's' || key === 'S') { _pendingFaction = 'seapeople'; return; }
    if (key === 'p' || key === 'P') { _pendingFaction = 'persia'; return; }
    if (key === 'f' || key === 'F') { _pendingFaction = 'phoenicia'; return; }
    if (key === 'l' || key === 'L') { _pendingFaction = 'gaul'; return; }
    return;
  }
  // Island milestone overlay — dismiss on any key
  if (dismissIslandMilestone()) return;
  // E/Enter dismisses popup overlays (lore tablet, narrative dialogue, dialog, victory screen)
  if (keyCode === 69 || keyCode === 13) {
    if (typeof loreTabletPopup !== 'undefined' && loreTabletPopup) { loreTabletPopup = null; return; }
    if (typeof narrativeDialogue !== 'undefined' && narrativeDialogue) { narrativeDialogue = null; return; }
    if (dialogState.active) { advanceDialog(); return; }
    if (state.victoryScreen && state.victoryScreen.timer > 120) { state.victoryScreen = null; return; }
  }
  // Island naming overlay intercepts all keys when open
  if (typeof handleIslandNamingKey === 'function' && handleIslandNamingKey(key, keyCode)) return;
  // Debug console intercepts all keys when open
  if (typeof Debug !== 'undefined' && Debug.handleKey(key, keyCode)) return;
  // Lobby E key for relic claiming, ESC to leave
  if (gameScreen === 'lobby') {
    if ((key === 'e' || key === 'E') && typeof lobbyClaimRelic === 'function') { lobbyClaimRelic(); return; }
    if (keyCode === 27) { if (typeof resetLobby === 'function') resetLobby(); gameScreen = 'menu'; return; }
    return;
  }
  if (gameScreen !== 'game') {
    // Keybind rebinding — intercept next keypress
    if (gameScreen === 'settings' && _rebindingAction) {
      if (keyCode === 27) { _rebindingAction = null; return; } // ESC cancels
      let keyName;
      if (keyCode === 16) keyName = 'SHIFT';
      else if (keyCode === 18) keyName = 'ALT';
      else if (keyCode === 9) keyName = 'TAB';
      else if (keyCode === 13) keyName = 'ENTER';
      else if (keyCode === 32) keyName = 'SPACE';
      else if (key === '`') keyName = '`';
      else if (key.length === 1) keyName = key.toUpperCase();
      else keyName = key.toUpperCase();
      gameSettings.keybinds[_rebindingAction] = keyName;
      _rebindingAction = null;
      _saveSettings();
      return false;
    }
    // ESC from settings/credits back to menu
    if (keyCode === 27 && (gameScreen === 'settings' || gameScreen === 'credits')) {
      _rebindingAction = null; _keybindScrollOffset = 0;
      gameScreen = 'menu';
    }
    if (keyCode === 27 && (gameScreen === 'multiplayer' || gameScreen === 'howtoplay')) {
      if (typeof _mpSubScreen !== 'undefined' && _mpSubScreen !== 'main') { _mpSubScreen = 'main'; }
      else { gameScreen = 'menu'; if (state) state._mpMenuOpen = false; }
      return;
    }
    // Multiplayer join input
    if ((gameScreen === 'multiplayer' || gameScreen === 'howtoplay') && typeof _mpSubScreen !== 'undefined' && _mpSubScreen === 'join') {
      if (keyCode === ENTER && typeof _mpJoinInput !== 'undefined' && _mpJoinInput.length > 0) {
        MP.join(_mpJoinInput);
        _mpSubScreen = 'host'; // reuse host screen to show waiting
        return;
      }
      if (keyCode === BACKSPACE) { _mpJoinInput = (_mpJoinInput || '').slice(0, -1); return; }
      if (key.length === 1 && (_mpJoinInput || '').length < 8) { _mpJoinInput = (_mpJoinInput || '') + key.toUpperCase(); return; }
      return;
    }
    // ESC on menu = back to game (if save exists / game in progress)
    if (keyCode === 27 && gameScreen === 'menu' && state && state.isInitialized) {
      state._paused = false;
      gameScreen = 'game';
      return;
    }
    // Menu keyboard navigation
    if (gameScreen === 'menu') {
      let hasSave = !!localStorage.getItem(_SAVE_KEY);
      let btnCount = hasSave ? 5 : 4;
      if (keyCode === DOWN_ARROW || keyCode === 83) { // down or S
        menuKeyIdx = (menuKeyIdx + 1) % btnCount;
        menuHover = menuKeyIdx;
      } else if (keyCode === UP_ARROW || keyCode === 87) { // up or W
        menuKeyIdx = menuKeyIdx <= 0 ? btnCount - 1 : menuKeyIdx - 1;
        menuHover = menuKeyIdx;
      } else if (keyCode === ENTER || keyCode === 32) { // enter or space
        if (menuKeyIdx >= 0) { menuHover = menuKeyIdx; handleMenuClick(); }
        else if (menuHover >= 0) handleMenuClick();
      }
    }
    return;
  }
  if (state.introPhase !== 'done') { skipIntro(); return; }
  if (state.cutscene) { skipCutscene(); return; }

  // Home key resets camera zoom
  if (keyCode === 36) { camZoomTarget = 1.0; return; }

  // Victory screen dismiss
  if (state.victoryScreen && state.victoryScreen.timer > 120) {
    if (keyCode === ENTER) { state.victoryScreen = null; return; }
    if (key === 'n' || key === 'N') { state.victoryScreen = null; return; }
  }

  // F2 = instant screenshot
  if (keyCode === 113) {
    let d = new Date();
    let ts = d.getFullYear() + '-' + nf(d.getMonth()+1,2) + '-' + nf(d.getDate(),2) + '_' + nf(d.getHours(),2) + '-' + nf(d.getMinutes(),2) + '-' + nf(d.getSeconds(),2);
    saveCanvas('screenshot_' + ts, 'png');
    addFloatingText(width / 2, height * 0.1, 'Screenshot saved!', '#ffffff');
    if (snd) snd.playSFX('shutter_click');
    return;
  }

  // F9 = toggle screenshot mode
  if (keyCode === 120) {
    screenshotMode = !screenshotMode;
    screenshotFilter = 0;
    if (screenshotMode) {
      photoModeWatermarkAlpha = 0;
      photoModeTipTimer = 120;
      addFloatingText(width / 2, height * 0.1, 'SCREENSHOT MODE - Click to capture, F to cycle filters, F9 to exit', '#ffffff');
    } else {
      addFloatingText(width / 2, height * 0.1, 'HUD RESTORED', '#ffdc50');
    }
    return;
  }
  // F key in screenshot mode = cycle filter
  if (screenshotMode && (key === 'f' || key === 'F')) {
    screenshotFilter = (screenshotFilter + 1) % 4;
    let fNames = ['No Filter', 'Warm (Golden Hour)', 'Cool (Moonlit)', 'Sepia (Ancient)'];
    addFloatingText(width / 2, height * 0.1, fNames[screenshotFilter], '#ffffff');
    return;
  }

  // Multiplayer chat input
  if (typeof MP !== 'undefined' && MP.connected) {
    if (keyCode === ENTER) {
      if (state._chatOpen) {
        if (state._chatInput) MP.chat(state._chatInput);
        state._chatOpen = false;
        state._chatInput = '';
        return;
      } else {
        state._chatOpen = true;
        state._chatInput = '';
        return;
      }
    }
    if (state._chatOpen) {
      if (keyCode === ESCAPE) { state._chatOpen = false; state._chatInput = ''; return; }
      if (keyCode === BACKSPACE) { state._chatInput = (state._chatInput || '').slice(0, -1); return; }
      if (key.length === 1) { state._chatInput = (state._chatInput || '') + key; return; }
      return;
    }
  }

  // Block all input during army battle
  if (typeof _armyBattle !== 'undefined' && _armyBattle) return;

  // ESC — close overlays first, then menu as last resort
  if (keyCode === 27) {
    if (!state.tutorialGoalComplete && state.tutorialGoalStep < TUTORIAL_STEPS.length && state.progression.homeIslandReached) { skipTutorial(); addNotification('Tutorial skipped', '#aaaaaa'); return; }
    if (typeof worldMapOpen !== 'undefined' && worldMapOpen) { worldMapOpen = false; return; }
    if (state.nationDiplomacyOpen) { closeNationDiplomacy(); return; }
    // openworld: visitingNation ESC deprecated
    if (state.wreck._visiting) {
      state.wreck._visiting = false;
      state.rowing.active = true;
      state.rowing.x = WRECK.cx;
      state.rowing.y = WRECK.cy + WRECK.ry * 1.1;
      state.rowing.speed = 0; state.rowing.angle = HALF_PI; state.rowing.wakeTrail = [];
      state.player.x = state.rowing.x; state.player.y = state.rowing.y;
      cam.x = state.player.x; cam.y = state.player.y;
      camSmooth.x = cam.x; camSmooth.y = cam.y;
      return;
    }
    if (state.demolishConfirm) { state.demolishConfirm = null; return; }
    if (state.buildMode) { state.buildMode = false; state._buildExitFrame = frameCount; return; }
    if (state.insideTemple) {
      state.insideTemple = false;
      state.player.x = state._templeReturnX || state.pyramid.x;
      state.player.y = state._templeReturnY || state.pyramid.y + 10;
      camSmooth.x = state.player.x; camSmooth.y = state.player.y - height * 0.12;
      return;
    }
    if (state.insideCastrum) {
      state.insideCastrum = false;
      if (state.legia) state.legia.legiaUIOpen = false;
      state.player.x = state._castrumReturnX || (state.legia ? state.legia.castrumX : WORLD.islandCX);
      state.player.y = state._castrumReturnY || (state.legia ? state.legia.castrumY + 50 : WORLD.islandCY);
      camSmooth.x = state.player.x; camSmooth.y = state.player.y - height * 0.12;
      return;
    }
    if (wardrobeOpen) { wardrobeOpen = false; return; }
    if (dialogState.active) { dialogState.active = false; return; }
    if (state.expeditionModifierSelect) { state.expeditionModifierSelect = false; return; }
    if (state.upgradeShopOpen) { state.upgradeShopOpen = false; return; }
    if (typeof _shipyardOpen !== 'undefined' && _shipyardOpen) { closeShipyard(); return; }
    if (state.nightMarket && state.nightMarket.shopOpen) { state.nightMarket.shopOpen = false; return; }
    if (state.ship && state.ship.shopOpen) { state.ship.shopOpen = false; return; }
    if (state.tradeRouteUI) { state.tradeRouteUI = false; return; }
    if (state.colonyManageOpen) { state.colonyManageOpen = false; state.colonyManageSelected = null; return; }
    if (state.legia && state.legia.legiaUIOpen) { state.legia.legiaUIOpen = false; return; }
    if (state.activeEvent && state.activeEvent.data && state.activeEvent.data.shopOpen) { state.activeEvent.data.shopOpen = false; return; }
    if (state.naturalistOpen) { state.naturalistOpen = false; return; }
    if (typeof recipeBookOpen !== 'undefined' && recipeBookOpen) { recipeBookOpen = false; return; }
    if (state.achievementsPanelOpen) { state.achievementsPanelOpen = false; return; }
    if (empireDashOpen) { empireDashOpen = false; return; }
    if (inventoryOpen) { inventoryOpen = false; return; }
    if (equipmentWindowOpen) { equipmentWindowOpen = false; return; }
    if (typeof skillTreeOpen !== 'undefined' && skillTreeOpen) { skillTreeOpen = false; return; }
    if (state.techTreeOpen) { state.techTreeOpen = false; return; }
    if (state.codexOpen) { state.codexOpen = false; return; }
    if (state.journalOpen) { state.journalOpen = false; return; }
    saveGame();
    state._paused = true;
    gameScreen = 'menu';
    menuFadeIn = 0;
    return;
  }

  // ─── IMPERATOR CEREMONY DISMISS ───
  if (state.victoryCeremony && state.victoryCeremony.phase === 4) {
    state.victoryCeremony = null;
    return;
  }

  // Legacy island [E] interactions removed -- V4.0 seamless handlers below

  // Seamless nation island E-key (new system)
  if (state._activeNation && !state.visitingNation) {
    if (state.nationDiplomacyOpen) { handleNationDiplomacyKey(key, keyCode); return; }
    // Invasion E-key
    if ((key === 'e' || key === 'E') && state._invasionTarget && typeof startInvasion === 'function') {
      startInvasion(state._invasionTarget);
      state._invasionTarget = null;
      return;
    }
    if (key === 'e' || key === 'E') { if (handleActiveNationInteract()) return; }
  }

  // Seamless exploration island E-key
  if (state._activeExploration && (key === 'e' || key === 'E')) {
    if (state._activeExploration === 'vulcan') { handleVulcanInteract(); return; }
    if (state._activeExploration === 'hyperborea') { handleHyperboreInteract(); return; }
    if (state._activeExploration === 'plenty') { handlePlentyInteract(); return; }
    if (state._activeExploration === 'necropolis') { handleNecropolisInteract(); return; }
  }

  // ─── WRECK BEACH KEYS ───
  if (((state.progression.gameStarted && !state.progression.homeIslandReached) || state.wreck._visiting) &&
      !state.rowing.active && !state.conquest.active) {
    if (key === 'e' || key === 'E') {
      // When visiting wreck from sailing, E at south shore to depart
      if (state.wreck._visiting) {
        let wbY = WRECK.cy + WRECK.ry * 0.75;
        if (state.player.y > wbY) {
          state.wreck._visiting = false;
          state.rowing.active = true;
          state.rowing.x = WRECK.cx;
          state.rowing.y = WRECK.cy + WRECK.ry * 1.1;
          state.rowing.speed = 0;
          state.rowing.angle = HALF_PI;
          state.rowing.wakeTrail = [];
          state.player.x = state.rowing.x; state.player.y = state.rowing.y;
          cam.x = state.player.x; cam.y = state.player.y;
          camSmooth.x = cam.x; camSmooth.y = cam.y;
          addFloatingText(width / 2, height * 0.35, 'Setting sail...', '#88ccff');
          return;
        }
      }
      handleWreckInteract();
    }
    if (key === ' ' && typeof _wreckMiniGames !== 'undefined' && _wreckMiniGames.rockSkip && (_wreckMiniGames.rockPhase === 'throwing' || _wreckMiniGames.rockPhase === 'bouncing')) { handleRockBounce(); return false; }
    return; // block all other game keys on wreck
  }

  // Expedition modifier selection
  if (state.expeditionModifierSelect) {
    let mods = Object.keys(EXPEDITION_MODIFIERS);
    // Number keys 1-5 to select modifier
    for (let i = 0; i < mods.length; i++) {
      if (key === String(i + 1)) { state.expeditionModifier = mods[i]; return; }
    }
    // ESC to cancel
    if (keyCode === 27) { state.expeditionModifierSelect = false; return; }
    // ENTER to confirm and embark
    if (keyCode === ENTER) {
      // Check supply cost
      let expNum = state.conquest.expeditionNum;
      let supplyCost = {
        gold: 15 + expNum * 5 + state.conquest.soldiers.length * 5,
        wood: 10 + expNum * 3,
        meals: min(3, 1 + floor(expNum / 3)),
      };
      if (state.gold < supplyCost.gold) {
        addFloatingText(width / 2, height * 0.3, 'Need ' + supplyCost.gold + ' gold!', '#ff6644');
        return;
      }
      if (state.wood < supplyCost.wood) {
        addFloatingText(width / 2, height * 0.3, 'Need ' + supplyCost.wood + ' wood!', '#ff6644');
        return;
      }
      let totalFood = (state.meals || 0) + (state.stew || 0);
      if (totalFood < supplyCost.meals) {
        addFloatingText(width / 2, height * 0.3, 'Need ' + supplyCost.meals + ' meals/stew! (have ' + totalFood + ')', '#ff6644');
        return;
      }
      // Deduct food — use meals first, then stew
      state.gold = max(0, state.gold - supplyCost.gold);
      state.wood -= supplyCost.wood;
      let foodNeeded = supplyCost.meals;
      let mealsUsed = min(state.meals, foodNeeded);
      state.meals -= mealsUsed;
      foodNeeded -= mealsUsed;
      if (foodNeeded > 0) state.stew -= foodNeeded;
      state.expeditionModifierSelect = false;
      let modName = getModifier().name;
      addFloatingText(width / 2, height * 0.38, modName + ' Expedition', getModifier().color);
      // enterConquest() deprecated -- openworld seamless
      return;
    }
    return; // block other keys while selecting
  }

  // Economy system keys (trade routes, spec selection)
  if (typeof handleEconomyKey === 'function') {
    if (handleEconomyKey(key, keyCode)) return;
  }

  // Rival diplomacy keys
  if (handleRivalDiplomacyKey(key, keyCode)) return;

  // Conquest mode keys
  if (state.conquest.active) {
    let cq = state.conquest;
    if (key === ' ' || key === 'j' || key === 'J') {
      if (!cq.buildMode) conquestPlayerAttack();
      return;
    }
    if (key === 'e' || key === 'E') {
      // Bridge exit — walk back to home island
      if (state.imperialBridge.built && cq.colonized) {
        let bridgeEntryX = cq.isleX + cq.isleRX * 0.85;
        let bridgeEntryY = WORLD.islandCY;
        if (dist(state.player.x, state.player.y, bridgeEntryX, bridgeEntryY) < 80) {
          cq.active = false;
          state.player.x = WORLD.islandCX - state.islandRX * 0.85;
          state.player.y = WORLD.islandCY;
          state.player.vx = 0; state.player.vy = 0;
          cam.x = state.player.x; cam.y = state.player.y;
          camSmooth.x = cam.x; camSmooth.y = cam.y;
          state.centurion.x = state.player.x + 20;
          state.centurion.y = state.player.y + 10;
          addFloatingText(width / 2, height * 0.3, 'Returning home via Imperial Bridge', '#aaddff');
          return;
        }
      }
      // Only board ship when near it at south shore
      let shipX = cq.shipX || cq.isleX;
      let shipY = cq.shipY || (cq.isleY + cq.isleRY * 0.92 + 15);
      let dShip = dist(state.player.x, state.player.y, shipX, shipY);
      // exitConquest deprecated -- openworld
      // V1.2: E key — upgrade tower
      for (let b of cq.buildings) {
        if (b.type === 'watchtower' && dist(state.player.x, state.player.y, b.x, b.y) < 45) {
          let tKey = floor(b.x) + ',' + floor(b.y);
          if (!cq.towerLevels) cq.towerLevels = {};
          let tLv = cq.towerLevels[tKey] || 0;
          let tData = EXPEDITION_TOWER.levels[tLv];
          if (tData && tData.upgradeCost) {
            let cost = tData.upgradeCost;
            let canAfford = (cq.woodPile >= (cost.wood || 0)) && ((cq.stonePile || 0) >= (cost.stone || 0)) && (state.gold >= (cost.gold || 0));
            if (canAfford) {
              cq.woodPile -= cost.wood || 0;
              cq.stonePile = (cq.stonePile || 0) - (cost.stone || 0);
              state.gold -= cost.gold || 0;
              cq.towerLevels[tKey] = tLv + 1;
              addFloatingText(w2sX(b.x), w2sY(b.y) - 45, 'Tower Lv' + (tLv + 2) + '!', '#88aadd');
              if (snd) snd.playSFX('upgrade');
            } else {
              let need = [];
              if ((cost.wood || 0) > cq.woodPile) need.push((cost.wood - cq.woodPile) + ' wood');
              if ((cost.stone || 0) > (cq.stonePile || 0)) need.push((cost.stone - (cq.stonePile || 0)) + ' stone');
              if ((cost.gold || 0) > state.gold) need.push((cost.gold - state.gold) + ' gold');
              addFloatingText(w2sX(b.x), w2sY(b.y) - 45, 'Need ' + need.join(', '), '#ff6644');
            }
          } else {
            addFloatingText(w2sX(b.x), w2sY(b.y) - 45, 'Tower at max level!', '#aaaaaa');
          }
          return;
        }
      }
      // V1.2: E key — upgrade barracks
      for (let b of cq.buildings) {
        if (b.type === 'barracks' && dist(state.player.x, state.player.y, b.x, b.y) < 45) {
          let lvIdx = cq.barracksLevel - 1;
          if (lvIdx < 0) lvIdx = 0;
          if (lvIdx >= EXPEDITION_BARRACKS.levels.length - 1) {
            addFloatingText(w2sX(b.x), w2sY(b.y) - 45, 'Barracks at max level!', '#aaaaaa');
            return;
          }
          let lvData = EXPEDITION_BARRACKS.levels[lvIdx];
          if (lvData && lvData.upgradeCost) {
            let cost = lvData.upgradeCost;
            let canAfford = (cq.woodPile >= (cost.wood || 0)) && ((cq.stonePile || 0) >= (cost.stone || 0)) && (state.gold >= (cost.gold || 0));
            if (canAfford) {
              cq.woodPile -= cost.wood || 0;
              cq.stonePile = (cq.stonePile || 0) - (cost.stone || 0);
              state.gold -= cost.gold || 0;
              cq.barracksLevel++;
              addFloatingText(w2sX(b.x), w2sY(b.y) - 45, 'Barracks Lv' + cq.barracksLevel + '!', '#88cc88');
              if (snd) snd.playSFX('upgrade');
            } else {
              let need = [];
              if ((cost.wood || 0) > cq.woodPile) need.push((cost.wood - cq.woodPile) + ' wood');
              if ((cost.stone || 0) > (cq.stonePile || 0)) need.push((cost.stone - (cq.stonePile || 0)) + ' stone');
              if ((cost.gold || 0) > state.gold) need.push((cost.gold - state.gold) + ' gold');
              addFloatingText(w2sX(b.x), w2sY(b.y) - 45, 'Need ' + need.join(', '), '#ff6644');
            }
          }
          return;
        }
      }
      // E key: chop nearest tree (same as click, but proximity-based)
      if (!cq.buildMode) {
        conquestPlayerChop();
        if (cq.chopTarget) return;
      }
      // E key: mine crystal nodes
      if (cq.crystalNodes) {
        let bestCrystal = null, bestCD = 40;
        for (let cn of cq.crystalNodes) {
          if (cn.collected) continue;
          let d = dist(state.player.x, state.player.y, cn.x, cn.y);
          if (d < bestCD) { bestCrystal = cn; bestCD = d; }
        }
        if (bestCrystal) {
          bestCrystal.collected = true;
          state.gold += floor(random(15, 30));
          cq.lootBag.push({ type: 'iron_ore', qty: floor(random(2, 4)) });
          addFloatingText(w2sX(bestCrystal.x), w2sY(bestCrystal.y) - 14, '+Crystal!', '#88ddff');
          spawnParticles(bestCrystal.x, bestCrystal.y, 'crystal', 8);
          if (snd) snd.playSFX('chop');
          return;
        }
      }
      // E key: mine resource deposits (iron ore, stone)
      if (cq.resourceDeposits) {
        let bestRes = null, bestRD = 40;
        for (let rd of cq.resourceDeposits) {
          if (rd.depleted) continue;
          let d = dist(state.player.x, state.player.y, rd.x, rd.y);
          if (d < bestRD) { bestRes = rd; bestRD = d; }
        }
        if (bestRes) {
          bestRes.hp--;
          spawnParticles(bestRes.x, bestRes.y, 'chop', 3);
          if (bestRes.hp <= 0) {
            bestRes.depleted = true;
            let qty = floor(random(2, 5));
            if (bestRes.type === 'iron') {
              cq.lootBag.push({ type: 'iron_ore', qty: qty });
              addFloatingText(w2sX(bestRes.x), w2sY(bestRes.y) - 14, '+' + qty + ' Iron Ore', '#aabbcc');
            } else {
              if (!cq.stonePile) cq.stonePile = 0;
              cq.stonePile += qty;
              addFloatingText(w2sX(bestRes.x), w2sY(bestRes.y) - 14, '+' + qty + ' Stone', '#bbbbbb');
            }
            if (snd) snd.playSFX('chop');
          } else {
            addFloatingText(w2sX(bestRes.x), w2sY(bestRes.y) - 14, 'Mining... (' + bestRes.hp + '/' + bestRes.maxHp + ')', '#cccccc');
          }
          return;
        }
      }
      // E key: fishing spot at coast
      if (cq.fishingSpots) {
        let bestFish = null, bestFD = 50;
        for (let fs of cq.fishingSpots) {
          if (fs.cooldown > 0) continue;
          let d = dist(state.player.x, state.player.y, fs.x, fs.y);
          if (d < bestFD) { bestFish = fs; bestFD = d; }
        }
        if (bestFish) {
          bestFish.cooldown = 600; // 10s cooldown
          let fishTypes = ['Perch', 'Bass', 'Trout', 'Eel'];
          let caught = fishTypes[floor(random(fishTypes.length))];
          state.gold += floor(random(8, 18));
          cq.lootBag.push({ type: 'rare_hide', qty: 1 });
          addFloatingText(w2sX(bestFish.x), w2sY(bestFish.y) - 20, 'Caught a ' + caught + '!', '#44bbdd');
          spawnParticles(bestFish.x, bestFish.y, 'water', 5);
          if (snd) snd.playSFX('water');
          return;
        }
      }
    }
    // Faction abilities Q/R (take priority in combat)
    if (!cq.buildMode && typeof handleFactionAbilityKey === 'function') {
      if (handleFactionAbilityKey(key)) return;
    }
    if (key === 'b' || key === 'B') {
      cq.buildMode = !cq.buildMode;
      if (cq.buildMode) addFloatingText(width / 2, height * 0.35, 'Build Mode — click to place', '#aaddff');
      return;
    }
    // Build type selection
    if (cq.buildMode) {
      let types = Object.keys(CONQUEST_BUILDINGS);
      for (let t of types) {
        if (key === CONQUEST_BUILDINGS[t].key) { cq.buildType = t; return; }
      }
      if (keyCode === 27) { cq.buildMode = false; return; } // ESC exits build
    }
    // Combat skill keys (1/2/3 when not in build mode)
    if (!cq.buildMode && typeof handleCombatSkillKey === 'function') {
      if (handleCombatSkillKey(key)) return;
    }
    // Dodge roll on ALT (enhanced via combat.js)
    if (keyMatchesAction('dodge', key, keyCode)) {
      if (typeof tryDodgeRoll === 'function') tryDodgeRoll();
      return false;
    }
    return;
  }

  // Naval combat — SPACE fires cannons, E boards when sailing
  if (state.rowing && state.rowing.active) {
    if (key === ' ' && typeof playerFireCannons === 'function') { playerFireCannons(); return; }
  }
  // Upgrade shop close
  if (state.upgradeShopOpen) {
    if (keyCode === 27 || key === 'e' || key === 'E') { state.upgradeShopOpen = false; return; }
    return;
  }
  // Night market purchases (1-4 keys while shop open)
  if (state.nightMarket.shopOpen) {
    if (key >= '1' && key <= '4') { buyMarketItem(parseInt(key) - 1); return; }
    if (keyCode === 27 || key === 'e' || key === 'E') { state.nightMarket.shopOpen = false; return; }
    return; // Block other input while market open
  }
  // Wandering merchant purchases (1-3 keys while shop open)
  if (state.activeEvent && state.activeEvent.id === 'wandering_merchant' && state.activeEvent.data.shopOpen) {
    if (key >= '1' && key <= '3') { buyWanderingMerchantItem(parseInt(key) - 1); return; }
    if (keyCode === 27 || key === 'e' || key === 'E') { state.activeEvent.data.shopOpen = false; return; }
    return;
  }
  // Dodge roll on ALT
  if (keyMatchesAction('dodge', key, keyCode)) {
    if (typeof tryDodgeRoll === 'function') tryDodgeRoll();
    return false;
  }

  // Interact
  if (key === 'e' || key === 'E') {
    // Temple interior interactions (advisor, jester, pet, altar)
    if (state.insideTemple) {
      _templeRoomInteractE();
      return;
    }
    // Castrum interior interactions
    if (state.insideCastrum) {
      _castrumRoomInteractE();
      return;
    }
    // Dive from boat — E while rowing in open water
    if (typeof startDive === 'function' && state.rowing && state.rowing.active &&
        !state.conquest.active) {
      startDive(); return;
    }
    // Dive — E near water, but NOT if near the rowboat
    if (typeof startDive === 'function' && !state.rowing.active && !state.buildMode &&
        !state.conquest.active &&
        !state._activeExploration) {
      let _port = typeof getPortPosition === 'function' ? getPortPosition() : { x: 0, y: 0 };
      let _nearBoat = dist(state.player.x, state.player.y, _port.x + 80, _port.y + 20) < 70;
      if (!_nearBoat && isInShallows(state.player.x, state.player.y)) {
        startDive(); return;
      }
    }

    // Random event E-key interactions
    if (interactWanderingMerchant()) return;
    if (interactAncientSpirit()) return;
    if (interactGhostSighting()) return;
    if (interactWanderingSoldier()) return;

    // Crystal rain drop pickup
    if (state.crystalRainDrops && state.crystalRainDrops.length > 0) {
      let nearDrop = state.crystalRainDrops.find(d => !d.collected && dist(state.player.x, state.player.y, d.x, d.y) < 40);
      if (nearDrop) {
        nearDrop.collected = true;
        state.crystals += 1;
        state.solar = min(state.maxSolar, state.solar + 1);
        if (snd) snd.playSFX('crystal');
        addFloatingText(w2sX(nearDrop.x), w2sY(nearDrop.y) - 15, '+1 Crystal +1 Solar', '#44ffaa');
        spawnParticles(nearDrop.x, nearDrop.y, 'divine', 3);
        if (typeof trackStat === 'function') trackStat('crystalsCollected', 1);
        return;
      }
    }

    // God prayer at temple: E near temple → god dialogue → choose blessing → 1-day cooldown
    {
      let nearTemple = state.buildings.find(b => b.type === 'temple' &&
        dist(state.player.x, state.player.y, b.x, b.y) < 50);
      if (nearTemple && state.faction && GODS[state.faction]) {
        let god = GODS[state.faction];
        if (state.god.prayerCooldown <= 0) {
          // Show blessing choice dialog
          let opts = god.blessingOptions;
          let blessingNames = opts.map(b => b.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
          dialogState.active = true;
          dialogState.speaker = god.name;
          dialogState.portrait = null;
          dialogState.text = god.name + ', ' + god.domain + ' deity, hears your prayer. Choose a blessing:';
          dialogState.displayLen = 999;
          dialogState.choices = blessingNames.map((name, i) => ({
            text: name,
            action: function() {
              state.god.blessingActive = opts[i];
              state.god.blessingTimer = 1440; // 1 day
              state.god.prayerCooldown = 1440; // 1 day cooldown
              state.god.ultimateCharge = min(5, state.god.ultimateCharge + 1);
              addFloatingText(width / 2, height * 0.3, god.name + ' blesses you: ' + name + '!', FACTIONS[state.faction].accentColorHex);
              spawnParticles(nearTemple.x, nearTemple.y, 'divine', 12);
              if (snd) snd.playSFX('crystal');
              if (state.god.ultimateCharge >= 5) {
                addFloatingText(width / 2, height * 0.38, 'Ultimate ready! Press G to activate ' + god.ultimate, '#ffd700');
              }
              dialogState.active = false;
            }
          }));
          dialogState.onComplete = null;
          return;
        } else {
          addFloatingText(width / 2, height * 0.3, god.name + ' requires rest before next prayer', '#998866');
          return;
        }
      }
    }

    // Altar prayer: once/day random blessing
    {
      let nearAltar = state.buildings.find(b => b.type === 'altar' &&
        dist(state.player.x, state.player.y, b.x, b.y) < 40);
      if (nearAltar) {
        if (!state._altarPrayedToday) {
          state._altarPrayedToday = true;
          let types = ['crops', 'solar', 'speed', 'luck'];
          state.blessing = { type: types[floor(random(types.length))], timer: 1440 };
          addFloatingText(width / 2, height * 0.3, 'Blessed: ' + state.blessing.type + '!', '#ddaa55');
          spawnParticles(nearAltar.x, nearAltar.y, 'divine', 8);
          if (snd) snd.playSFX('crystal');
        } else {
          addFloatingText(width / 2, height * 0.3, 'Already prayed today', '#998866');
        }
        return;
      }
    }

    // Bakery upgrade: E near bakery shows tier upgrade dialog
    {
      let nearBakery = state.buildings.find(b => b.type === 'bakery' && !b.ruined &&
        dist(state.player.x, state.player.y, b.x, b.y) < 50);
      if (nearBakery) {
        let tier = nearBakery.tier || 1;
        if (tier < 3) {
          let nextTier = tier + 1;
          let tierNames = { 2: 'Stone Oven Bakery', 3: 'Grand Bakery' };
          let tierDescs = { 2: '4 bread/day, -20% food use', 3: '6 bread/day, -40% food use, +2g/day' };
          let tierCosts = { 2: { gold: 80, stone: 15 }, 3: { gold: 150, stone: 30, ironOre: 5 } };
          let cost = tierCosts[nextTier];
          let canAfford = (state.gold >= (cost.gold || 0)) && (state.stone >= (cost.stone || 0)) && (state.ironOre >= (cost.ironOre || 0));
          let costStr = Object.entries(cost).map(([k, v]) => v + ' ' + k).join(', ');
          dialogState.active = true;
          dialogState.speaker = 'Pistrinum';
          dialogState.portrait = null;
          dialogState.text = 'Upgrade to ' + tierNames[nextTier] + '?\n' + tierDescs[nextTier] + '\nCost: ' + costStr;
          dialogState.displayLen = 999;
          dialogState.choices = [
            {
              text: canAfford ? 'Upgrade (Tier ' + nextTier + ')' : 'Cannot afford',
              action: function() {
                if (canAfford) {
                  state.gold -= cost.gold || 0;
                  state.stone -= cost.stone || 0;
                  state.ironOre -= cost.ironOre || 0;
                  nearBakery.tier = nextTier;
                  addFloatingText(width / 2, height * 0.3, tierNames[nextTier] + ' built!', '#dda844');
                  spawnParticles(nearBakery.x, nearBakery.y, 'build', 10);
                  if (snd) snd.playSFX('upgrade');
                }
                dialogState.active = false;
              }
            },
            { text: 'Cancel', action: function() { dialogState.active = false; } }
          ];
          dialogState.onComplete = null;
          return;
        } else {
          addFloatingText(width / 2, height * 0.3, 'Grand Bakery — fully upgraded!', '#dda844');
          return;
        }
      }
    }

    // Discovery event interaction (NPC rescue, etc.)
    if (handleDiscoveryInteract()) return;

    // Narrative interact checks (lore tablets, quest objectives)
    if (typeof state.narrativeFlags !== 'undefined' && state.mainQuest) {
      let px = state.player.x, py = state.player.y;
      // Lore tablet E-key pickup
      if (typeof checkLoreTabletPickup === 'function') checkLoreTabletPickup();
      // Livia scroll near ruins (Chapter 3, objective 2)
      if (state.mainQuest.chapter === 2 && state.npc.hearts >= 4 && !state.narrativeFlags['livia_scroll']) {
        if (state.ruins.length > 0 && dist(px, py, state.ruins[0].x, state.ruins[0].y) < 50) {
          state.narrativeFlags['livia_scroll'] = true;
          addFloatingText(width / 2, height * 0.25, 'Found a hidden scroll!', '#ddc880');
          spawnParticles(px, py, 'divine', 6);
        }
      }
      // Return scroll to Livia (Chapter 3, objective 3)
      if (state.narrativeFlags['livia_scroll'] && !state.narrativeFlags['livia_scroll_return'] && dist(px, py, state.npc.x, state.npc.y) < 60) {
        state.narrativeFlags['livia_scroll_return'] = true;
        addFloatingText(width / 2, height * 0.25, 'Scroll delivered to Livia', '#ddc880');
      }
      // Livia letter — deliver to merchant ship (NPC quest)
      if (state.npcQuests && state.npcQuests.livia && state.npcQuests.livia.active === 'livia_q3' && !state.narrativeFlags['livia_letter']) {
        if (state.ship.state === 'docked' && state.wood >= 5 && state.harvest >= 3) {
          let sp = typeof getPortPosition === 'function' ? getPortPosition() : { x: 0, y: 0 };
          if (dist(px, py, sp.x, sp.y) < 80) {
            state.narrativeFlags['livia_letter'] = true;
            addFloatingText(width / 2, height * 0.25, 'Letter entrusted to the merchant', '#88ccff');
          }
        }
      }
      // Felix manuscript read (NPC quest)
      if (state.npcQuests && state.npcQuests.felix && state.npcQuests.felix.active === 'felix_q3' && !state.narrativeFlags['read_manuscript']) {
        if (state.felix && dist(px, py, state.felix.x, state.felix.y) < 60 && state.harvest >= 3 && state.wood >= 4) {
          state.narrativeFlags['read_manuscript'] = true;
          addFloatingText(width / 2, height * 0.25, 'You read Felix\'s manuscript...', '#88cc88');
        }
      }
    }

    // Rowboat embark/disembark
    if (state.rowing.active) {
      let r = state.rowing;
      // Dock at nearby island
      // Board enemy ship if boarding target available
      if (state.naval && state.naval.boardingTarget && typeof startBoardingCombat === 'function') { startBoardingCombat(); return; }
      if (r.nearIsle === 'conquest') {
        if (state.conquest.colonized) {
          // Colonized — free, peaceful entry
          // enterConquest() deprecated -- openworld seamless
          return;
        }
        // Open modifier selection UI
        state.expeditionModifierSelect = true;
        state.expeditionModifier = state.expeditionModifier || 'normal';
        return;
      }
      if (r.nearIsle === 'wreck') {
        // Dock at wreck beach
        state.rowing.active = false;
        state.wreck._visiting = true;
        state.player.x = WRECK.cx + 40;
        state.player.y = WRECK.cy + 10;
        state.player.vx = 0; state.player.vy = 0;
        cam.x = state.player.x; cam.y = state.player.y;
        _startCamTransition(); camZoomTarget = 1.0;
        addFloatingText(width / 2, height * 0.35, 'Wreck Beach', C.sand);
        return;
      }
      if (['vulcan','hyperborea','plenty','necropolis'].includes(r.nearIsle)) {
        let _ei = state[r.nearIsle];
        state.rowing.active = false;
        let _da = atan2(r.y - _ei.isleY, r.x - _ei.isleX);
        state.player.x = _ei.isleX + cos(_da) * _ei.isleRX * 0.6;
        state.player.y = _ei.isleY + sin(_da) * _ei.isleRY * 0.6;
        state.player.vx = 0; state.player.vy = 0;
        cam.x = state.player.x; cam.y = state.player.y;
        _startCamTransition(); camZoomTarget = 1.0;
        return;
      }
      if (state.nations && state.nations[r.nearIsle]) {
        // Seamless disembark — don't teleport, just step onto the island
        let _nv = state.nations[r.nearIsle];
        state.rowing.active = false;
        let _dockAng = atan2(r.y - _nv.isleY, r.x - _nv.isleX);
        state.player.x = _nv.isleX + cos(_dockAng) * _nv.isleRX * 0.6;
        state.player.y = _nv.isleY + sin(_dockAng) * _nv.isleRY * 0.6;
        state.player.vx = 0; state.player.vy = 0;
        cam.x = state.player.x; cam.y = state.player.y;
        _startCamTransition(); camZoomTarget = 1.0;
        // Set invasion target if player has army
        if (state.legia && state.legia.army && state.legia.army.length > 0 && !_nv.defeated && !_nv.vassal) {
          state._invasionTarget = r.nearIsle;
        }
        return;
      }
      // Otherwise disembark — snap player back to pier
      let port = getPortPosition();
      state.rowing.active = false;
      state.player.x = port.x + 40;
      state.player.y = port.y;
      state.player.vx = 0;
      state.player.vy = 0;
      addFloatingText(width / 2, height * 0.35, 'Back on solid ground', C.textBright);
      return;
    }
    // Shipyard interaction — E near shipyard building
    if (typeof openShipyard === 'function' && !state.rowing.active) {
      let _syB = (state.buildings || []).find(b => b.type === 'shipyard' && dist(state.player.x, state.player.y, b.x, b.y) < 60);
      if (_syB) { openShipyard(); return; }
    }
    // Check if near rowboat at pier (pier extends left from port) — gate behind villa
    let _canBoard = !state.progression.gameStarted || state.progression.villaCleared;
    let port = getPortPosition();
    let boatWorldX = port.x + 80;
    let boatWorldY = port.y + 20;
    if (_canBoard && dist(state.player.x, state.player.y, boatWorldX, boatWorldY) < 60) {
      state.rowing.active = true;
      state.rowing.x = boatWorldX;
      state.rowing.y = boatWorldY;
      state.rowing.angle = 0; // facing right (east, away from island)
      state.rowing.speed = 0;
      state.rowing.oarPhase = 0;
      state.rowing.wakeTrail = [];
      addFloatingText(width / 2, height * 0.35, 'Rowing the Navis Parva! WASD to sail, E to dock', C.solarBright);
      if (snd && snd.playNarration) snd.playNarration('first_sail');
      return;
    }
    // Visitor trade
    if (state.visitor && !state.visitor.interacted && dist(state.player.x, state.player.y, state.visitor.x, state.visitor.y) < 70) {
      tradeWithVisitor(); return;
    }
    // Temple court visitor trade
    if (state.templeCourt && state.templeCourt.visitors.length > 0) {
      let nearCourt = state.templeCourt.visitors.find(v => !v.traded && !v.walking && dist(state.player.x, state.player.y, v.x, v.y) < 60);
      if (nearCourt) { tradeWithCourtVisitor(nearCourt); return; }
    }
    // Treasure dig
    if (state.activeTreasure && !state.activeTreasure.found) {
      if (digTreasure()) return;
    }
    // Collect bottles
    let nearBottle = state.bottles.find(b => !b.collected && dist(state.player.x, state.player.y, b.x, b.y) < 40);
    if (nearBottle) { collectBottle(nearBottle); return; }
    // E key: mine nearest charged crystal node
    {
      let nearCrystal = state.crystalNodes.find(c =>
        c.charge > 0 && dist(state.player.x, state.player.y, c.x, c.y) < 60
      );
      if (nearCrystal) {
        let pickBonus = state.player.hotbarSlot === 2;
        if (!pickBonus) { state.player.hotbarSlot = 2; addFloatingText(width / 2, height - 110, 'Switched to Pick', '#aaddaa'); }
        state.player.toolSwing = 12;
        state.player._hitlagFrames = 2;
        let amt = nearCrystal.charge >= 30 ? 2 : 1;
        if (pickBonus) amt += 1;
        amt = floor(amt * (getFactionData().crystalIncomeMult || 1));
        state.crystals += amt;
        if (snd) snd.playSFX('crystal');
        state.dailyActivities.crystal += amt;
        if (typeof trackStat === 'function') trackStat('crystalsCollected', amt);
        if (typeof checkDailyQuestProgress === 'function') checkDailyQuestProgress('crystal', amt);
        checkQuestProgress('crystal', amt);
        if (typeof advanceMainQuestCounter === 'function') advanceMainQuestCounter('mq_crystals_gathered', amt);
        unlockJournal('first_crystal');
        nearCrystal.charge = 0;
        nearCrystal.respawnTimer = state.tools.steelPick ? 400 : 800;
        let csx = w2sX(nearCrystal.x), csy = w2sY(nearCrystal.y);
        addFloatingText(csx, csy - 15, '+' + amt + ' Crystal', C.crystalGlow);
        if (state.dailyActivities.crystal === amt && state.day <= 2) { addFloatingText(csx, csy - 35, 'These power island expansion!', '#88ddff'); }
        spawnCrystalPulse(nearCrystal.x, nearCrystal.y);
        triggerScreenShake(2, 4);
        return;
      }
    }
    // E key: harvest nearest ripe crop
    {
      let nearPlot = state.plots.find(p =>
        p.ripe && dist(state.player.x, state.player.y, p.x, p.y) < 40
      );
      if (nearPlot) {
        let p = nearPlot;
        let hs = state.player.hotbarSlot;
        let toolBonus = hs === 0;
        if (hs !== 0) { state.player.hotbarSlot = 0; addFloatingText(width / 2, height - 110, 'Switched to Sickle', '#aaddaa'); }
        state.player.toolSwing = 12;
        state.player._hitlagFrames = 2;
        let wasBlessed = p.blessed;
        p.planted = false; p.ripe = false; p.glowing = false;
        p.timer = 0; p.stage = 0; p.blessed = false;
        let harvestAmt = (state.npc && state.npc.hearts >= 5) ? 2 : 1;
        if (state.tools && state.tools.sickle) harvestAmt *= 2;
        if (state.blessing && state.blessing.type === 'luck') harvestAmt *= 2;
        if (state.heartRewards && state.heartRewards.includes('golden')) harvestAmt *= 2;
        if (wasBlessed) harvestAmt *= 3;
        if (state.prophecy && state.prophecy.type === 'harvest') harvestAmt += 1;
        let festR = getFestival();
        if (festR && festR.effect.allResources) harvestAmt *= festR.effect.allResources;
        if (toolBonus) harvestAmt += 1;
        if (state.colonySpec && state.colonySpec['conquest'] === 'agricultural') harvestAmt = floor(harvestAmt * 1.3);
        if (typeof getHarvestSkillBonus === 'function') harvestAmt = floor(harvestAmt * getHarvestSkillBonus());
        harvestAmt = floor(harvestAmt * getEventHarvestMult());
        harvestAmt = onHarvestCombo(p, harvestAmt);
        // Crop rotation & soil fertility
        if (typeof onPlotHarvest === 'function') {
          let _rotBonus = onPlotHarvest(p);
          if (_rotBonus) { harvestAmt = floor(harvestAmt * 1.1); addFloatingText(w2sX(p.x), w2sY(p.y) - 65, 'Rotation Bonus! +10%', '#44cc88'); }
        }
        if (typeof hasTech === 'function' && hasTech('selective_breeding') && random() < 0.25) {
          harvestAmt *= 2;
          addFloatingText(w2sX(p.x), w2sY(p.y) - 20, '2x BREED!', '#88cc44');
        }
        state.harvest += harvestAmt;
        state.dailyActivities.harvested += harvestAmt;
        if (snd) snd.playSFX('harvest');
        triggerPlayerJoy();
        unlockJournal('first_harvest');
        if (!state.codex.cropsGrown) state.codex.cropsGrown = {};
        state.codex.cropsGrown[p.cropType || 'grain'] = true;
        let _ck = p.cropType || 'grain';
        if (!state.codex.crops) state.codex.crops = {};
        if (!state.codex.crops[_ck]) state.codex.crops[_ck] = { harvested: true, count: 0, firstDay: state.day };
        state.codex.crops[_ck].count += harvestAmt;
        state.codex.crops[_ck].harvested = true;
        checkQuestProgress('harvest', harvestAmt);
        if (typeof advanceMainQuestCounter === 'function') advanceMainQuestCounter('mq_harvested', harvestAmt);
        if (typeof grantXP === 'function') grantXP(5 * harvestAmt);
        trackMilestone('first_harvest');
        if (typeof trackStat === 'function') trackStat('cropsHarvested', harvestAmt);
        if (typeof checkDailyQuestProgress === 'function') checkDailyQuestProgress('harvest', harvestAmt);
        if (typeof triggerNPCReaction === 'function') triggerNPCReaction('harvest', p.x, p.y);
        let seedBack = 1 + (random() < 0.5 ? 1 : 0);
        if (Object.keys(state.codex.crops).length >= 7) seedBack += 1;
        state.seeds += seedBack;
        let px = w2sX(p.x), py = w2sY(p.y);
        addFloatingText(px, py - 25, '+' + seedBack + ' Seed', '#8fbc8f');
        let scData = getSeasonalCropData(p.cropType);
        if (scData) {
          if (p.cropType === 'sunfruit') { state.solar = min(state.maxSolar, state.solar + 15); addFloatingText(px, py - 35, '+15 Solar!', '#ffaa33'); }
          if (p.cropType === 'frostherb') { state.crystals += 1; addFloatingText(px, py - 35, '+1 Crystal!', '#88ddff'); }
          if (p.cropType === 'pumpkin') { harvestAmt += 2; }
          if (p.cropType === 'wildflower') { spawnParticles(p.x, p.y, 'build', 10); }
        }
        if (p.cropType === 'lotus') { let lc = 1 + floor(random(2)); state.crystals += lc; addFloatingText(px, py - 35, '+' + lc + ' Crystal!', '#f0a0c8'); }
        if (p.cropType === 'pomegranate') { let pg = 3 + floor(random(3)); state.gold += pg; addFloatingText(px, py - 35, '+' + pg + ' Gold!', '#c82828'); }
        if (p.cropType === 'flax') { let fb = 1; state.wood += fb; addFloatingText(px, py - 35, '+' + fb + ' Fiber!', '#6496dc'); }
        let label = wasBlessed ? '+' + harvestAmt + ' BLESSED!' : (harvestAmt > 1 ? '+' + harvestAmt + ' Harvest!' : '+Harvest');
        let labelColor = (typeof getSeasonalCropData === 'function' && getSeasonalCropData(p.cropType)) ? getSeasonalCropData(p.cropType).color : (wasBlessed ? '#ffdd00' : C.cropGlow);
        addFloatingText(px, py - 20, label, labelColor);
        if (typeof spawnHarvestArc === 'function') spawnHarvestArc(px, py - 20, label, labelColor, 'harvest');
        if (typeof markCodexDiscovery === 'function' && state.codex.crops[_ck] && state.codex.crops[_ck].count === harvestAmt) markCodexDiscovery('crops', _ck);
        spawnHarvestBurst(p.x, p.y, p.cropType || 'grain');
        triggerScreenShake(wasBlessed ? 4 : 1.5, wasBlessed ? 8 : 4);
        return;
      }
    }
    // Legia castrum interaction — gate is on south side of building
    if (state.legia && state.legia.castrumLevel > 0 &&
        dist(state.player.x, state.player.y, state.legia.castrumX, state.legia.castrumY + 50) < 40) {
      if (!state.insideCastrum && !_doorTransition) {
        if (snd) snd.playSFX('door_creak');
        state.player.vx = 0; state.player.vy = 0; state.player.moving = false;
        state._castrumReturnX = state.player.x;
        state._castrumReturnY = state.player.y;
        startDoorTransition(function() {
          state.insideCastrum = true;
          state.player.x = CASTRUM_ROOM.cx;
          state.player.y = CASTRUM_ROOM.cy + CASTRUM_ROOM.hh * 0.5;
          state.player.vx = 0; state.player.vy = 0; state.player.moving = false;
          camSmooth.x = CASTRUM_ROOM.cx; camSmooth.y = CASTRUM_ROOM.cy - height * 0.06;
          var ft2 = getFactionTerms();
          addFloatingText(width / 2, height * 0.3, 'Entering ' + ft2.barracks, '#ddccaa');
        });
      }
      return;
    }
    // Night market interaction
    if (state.nightMarket.active) {
      let mp = getMarketPosition();
      if (dist(state.player.x, state.player.y, mp.x, mp.y) < 60) {
        state.nightMarket.shopOpen = !state.nightMarket.shopOpen;
        if (state.nightMarket.shopOpen && snd) snd.playSFX('door_creak');
        return;
      }
    }
    // Rite of Mare Nostrum — crystal shrine (Chapter X)
    if (state.crystalShrine && dist(state.player.x, state.player.y, state.crystalShrine.x, state.crystalShrine.y) < 55) {
      if (state.narrativeFlags && !state.narrativeFlags['rite_mare_nostrum']) {
        let lvlOk = (state.islandLevel || 0) >= 25;
        let heartsOk = state.npc && state.npc.hearts >= 10 &&
                       state.marcus && state.marcus.hearts >= 10 &&
                       state.vesta && state.vesta.hearts >= 10 &&
                       state.felix && state.felix.hearts >= 10;
        if (lvlOk && heartsOk) {
          state.narrativeFlags['rite_mare_nostrum'] = true;
          trackMilestone('game_complete');
          addFloatingText(width / 2, height * 0.18, 'RITE OF MARE NOSTRUM', '#ffd700');
          addFloatingText(width / 2, height * 0.26, 'The crystals sing. The sea is yours.', '#aaddff');
          addFloatingText(width / 2, height * 0.34, 'All hearts aligned. All islands joined.', '#ff88cc');
          spawnParticles(state.crystalShrine.x, state.crystalShrine.y, 'divine', 20);
          if (snd) snd.playSFX('upgrade');
          shakeTimer = 10;
          if (state.mainQuest) {
            state.mainQuest.dialogueQueue.push({ npc: 'livia', line: "Imperator. Not by conquest — by love. By grain and stone and stubborn hope. Rome would not understand. But the gods do. And so do I.", timer: 400 });
          }
          return;
        } else if (!lvlOk) {
          addFloatingText(w2sX(state.crystalShrine.x), w2sY(state.crystalShrine.y) - 30, 'Reach island level 25 first (' + (state.islandLevel || 0) + '/25)', '#aaddff');
          return;
        } else {
          addFloatingText(w2sX(state.crystalShrine.x), w2sY(state.crystalShrine.y) - 30, 'All four must hold you dear (10 hearts each)', '#ff88cc');
          return;
        }
      } else if (state.narrativeFlags && state.narrativeFlags['rite_mare_nostrum']) {
        addFloatingText(w2sX(state.crystalShrine.x), w2sY(state.crystalShrine.y) - 30, 'The rite is complete. Mare Nostrum endures.', '#ffd700');
        return;
      }
    }
    // Temple interior entry — near door (front of pyramid)
    if (!state.insideTemple && !_doorTransition && dist(state.player.x, state.player.y, state.pyramid.x, state.pyramid.y + 5) < 40) {
      if (snd) snd.playSFX('door_creak');
      state.player.vx = 0; state.player.vy = 0; state.player.moving = false;
      state._templeReturnX = state.player.x;
      state._templeReturnY = state.player.y;
      startDoorTransition(function() {
        state.insideTemple = true;
        state.player.x = TEMPLE_ROOM.cx;
        state.player.y = TEMPLE_ROOM.cy + TEMPLE_ROOM.hh * 0.5;
        state.player.vx = 0; state.player.vy = 0; state.player.moving = false;
        camSmooth.x = TEMPLE_ROOM.cx; camSmooth.y = TEMPLE_ROOM.cy - height * 0.06;
        var _th = TEMPLE_HALLS[state.faction || 'rome'] || TEMPLE_HALLS.rome;
        addFloatingText(width / 2, height * 0.3, 'Entering ' + _th.name, '#ffd080');
        state.templePetX = 0; state.templePetY = 0; state.templeJesterJokedToday = false;
      });
      return;
    }
    // Upgrade Forge at pyramid
    if (dist(state.player.x, state.player.y, state.pyramid.x, state.pyramid.y) < 60) {
      state.upgradeShopOpen = !state.upgradeShopOpen;
      return;
    }
    let p = state.player;
    let n = state.npc;
    let d = dist2(p.x, p.y, n.x, n.y);
    if (d < 80) {
      checkNPCWantSatisfied('livia');
      // Gift priority: wine/oil (2 hearts), meals (1 heart), harvest (1 heart)
      let giftHearts = 0;
      let giftName = '';
      if (state.wine > 0) {
        state.wine--; giftHearts = 2; giftName = 'Wine';
      } else if (state.oil > 0) {
        state.oil--; giftHearts = 2; giftName = 'Olive Oil';
      } else if (state.meals > 0) {
        state.meals--; giftHearts = 1; giftName = 'Meal';
      } else if (state.harvest > 0) {
        state.harvest--; giftHearts = 1; giftName = 'Harvest';
      }
      if (giftHearts > 0) {
        n.hearts = min(10, n.hearts + giftHearts);
        let _liviaGiftLine = (typeof getExpandedDialogue === 'function') ? getExpandedDialogue('livia') : null;
        n.currentLine = _liviaGiftLine || n.lines[floor(random(n.lines.length))];
        n.dialogTimer = 180;
        let heartText = giftHearts > 1 ? '♥ +' + giftHearts + ' Hearts (' + giftName + ')' : '♥ +Heart';
        addFloatingText(w2sX(n.x), w2sY(n.y) - 30, heartText, '#ff6688');
        npcHeartPop(n);
        if (snd) snd.playSFX('gift_accepted');
        state.dailyActivities.gifted++;
        if (typeof trackStat === 'function') trackStat('giftsGiven', 1);
        if (typeof checkDailyQuestProgress === 'function') checkDailyQuestProgress('gift', 1);
        unlockJournal('npc_friend');
        if (n.hearts >= 5) unlockJournal('five_hearts');
        checkHeartMilestones(n.hearts);
        if (typeof addNPCMemory === 'function') addNPCMemory('livia', 'gift', giftName);
      } else {
        if (snd) snd.playSFX('dialogue_open');
        if (typeof addNPCMemory === 'function') addNPCMemory('livia', 'chat');
        // Check for Livia personal quest first
        let _liviaQ = (typeof getAvailableNPCQuest === 'function' && state.npcQuests) ? getAvailableNPCQuest('livia') : null;
        if (_liviaQ && !state.npcQuests.livia.active) {
          startNPCQuest('livia', _liviaQ); n.dialogTimer = 250;
        } else if (!state.quest) {
          state.quest = generateQuest();
          n.dialogTimer = 200;
          addFloatingText(w2sX(n.x), w2sY(n.y) - 30, 'New Quest: ' + state.quest.desc, C.solarBright);
        } else {
          // Show expanded dialogue or fall back to generic lines
          let _liviaLine = (typeof getExpandedDialogue === 'function') ? getExpandedDialogue('livia') : null;
          n.dialogTimer = 150;
          n.currentLine = _liviaLine || n.lines[floor(random(n.lines.length))];
          addFloatingText(w2sX(n.x), w2sY(n.y) - 30, state.quest.desc + ' (' + state.quest.progress + '/' + state.quest.target + ')', C.textBright);
        }
      }
    }

    // New NPC interactions
    let newNpcs = [
      { npc: state.marcus, lines: MARCUS_LINES, mid: MARCUS_LINES_MID, high: MARCUS_LINES_HIGH, name: 'Marcus' },
      { npc: state.vesta, lines: VESTA_LINES, mid: VESTA_LINES_MID, high: VESTA_LINES_HIGH, name: 'Vesta' },
      { npc: state.felix, lines: FELIX_LINES, mid: FELIX_LINES_MID, high: FELIX_LINES_HIGH, name: 'Felix' },
    ];
    newNpcs.forEach(({ npc: nn, lines, mid, high, name }) => {
      if (!nn) return;
      if (name === 'Marcus' && !nn.present) return;
      let dd = dist2(p.x, p.y, nn.x, nn.y);
      if (dd < 80) {
        checkNPCWantSatisfied(name.toLowerCase());
        // Gift check
        let giftH = 0, giftN = '';
        let wineBonus = (state.prophecy && state.prophecy.type === 'wine') ? 2 : 1;
        if (state.wine > 0) { state.wine--; giftH = 2 * wineBonus; giftN = 'Wine'; }
        else if (state.oil > 0) { state.oil--; giftH = 2 * wineBonus; giftN = 'Oil'; }
        else if (state.meals > 0) { state.meals--; giftH = 1; giftN = 'Meal'; }
        else if (state.harvest > 0) { state.harvest--; giftH = 1; giftN = 'Harvest'; }
        else if (state.fish > 0 && name === 'Marcus') { state.fish--; giftH = 1; giftN = 'Fish'; }
        else if (state.crystals > 1 && name === 'Vesta') { state.crystals--; giftH = 1; giftN = 'Crystal'; }

        if (state.prophecy && state.prophecy.type === 'hearts') giftH += 1;
        // Gift preference multiplier
        if (giftH > 0 && typeof getGiftMultiplier === 'function') {
          let _giftType = giftN.toLowerCase() === 'wine' ? 'wine' : giftN.toLowerCase() === 'oil' ? 'oil' : giftN.toLowerCase() === 'meal' ? 'meals' : giftN.toLowerCase() === 'harvest' ? 'harvest' : giftN.toLowerCase() === 'fish' ? 'fish' : giftN.toLowerCase() === 'crystal' ? 'crystals' : giftN.toLowerCase();
          giftH = ceil(giftH * getGiftMultiplier(name.toLowerCase(), _giftType));
        }
        let festH = getFestival();
        if (festH && festH.effect.hearts) giftH *= festH.effect.hearts;
        let calicoCat = state.cats.find(c => c.adopted && c.passive === 'hearts');
        if (calicoCat && giftH > 0) giftH = ceil(giftH * 1.05);

        if (giftH > 0) {
          nn.hearts = min(10, nn.hearts + giftH);
          let maxH = max(state.npc.hearts, state.marcus ? state.marcus.hearts : 0, state.vesta.hearts, state.felix.hearts);
          if (maxH > state.codex.npcMaxHearts) state.codex.npcMaxHearts = maxH;
          nn.currentLine = getNPCDialogue(nn, lines, mid, high, name.toLowerCase());
          nn.dialogTimer = 180;
          npcHeartPop(nn);
          if (snd) snd.playSFX('gift_accepted');
          state.dailyActivities.gifted++;
          let ht = giftH > 1 ? '+' + giftH + ' Hearts (' + giftN + ')' : '+Heart';
          addFloatingText(w2sX(nn.x), w2sY(nn.y) - 30, ht, '#ff6688');
          if (typeof addNPCMemory === 'function') addNPCMemory(name.toLowerCase(), 'gift', giftN);
        } else {
          if (snd) snd.playSFX('dialogue_open');
          // Offer NPC personal quest or use expanded dialogue
          let _nk = name.toLowerCase();
          let _aq = (typeof getAvailableNPCQuest === 'function' && state.npcQuests) ? getAvailableNPCQuest(_nk) : null;
          if (_aq && !state.npcQuests[_nk].active) {
            startNPCQuest(_nk, _aq); nn.dialogTimer = 250;
          } else {
            let _ed = (typeof getExpandedDialogue === 'function') ? getExpandedDialogue(_nk) : null;
            nn.currentLine = _ed || getNPCDialogue(nn, lines, mid, high, _nk);
            nn.dialogTimer = 150;
          }
          if (typeof addNPCMemory === 'function') addNPCMemory(_nk, 'chat');
        }
      }
    });
  }

  // Fishing / Trade with ship
  if (keyMatchesAction('fish', key, keyCode)) {
    if (state.fishing.active && state.fishing.phase === 'strike') {
      // Successful strike!
      reelFish();
    } else if (state.fishing.active && state.fishing.phase === 'wait') {
      // Too early!
      addFloatingText(w2sX(state.player.x), w2sY(state.player.y) - 30, 'Too early!', '#ff8866');
      state.fishing.phase = 'cooldown';
      state.fishing.phaseTimer = 120; // 2 second cooldown
      state.fishing.bobberDip = 0;
      state.fishing.bite = false;
      state.fishing.streak = 0;
      if (snd) snd.playSFX('water');
    } else if (state.fishing.active && (state.fishing.phase === 'reel' || state.fishing.phase === 'cooldown' || state.fishing.phase === 'cast')) {
      // Ignore during these phases
    } else if (state.ship.shopOpen && state.ship.state === 'docked') {
      // Trade handled by number keys below
    } else if (!state.fishing.active && !state.buildMode) {
      // Auto-switch to rod for fishing
      if (state.player.hotbarSlot !== 3) { state.player.hotbarSlot = 3; addFloatingText(width / 2, height - 110, 'Switched to Rod', '#aaddaa'); }
      startFishing();
    }
  }
  // Legia UI number keys
  if (state.legia && state.legia.legiaUIOpen) {
    if (key === 'l' || key === 'L' || key === 'e' || key === 'E') { state.legia.legiaUIOpen = false; return; }
    if ((key === 'r' || key === 'R') && state.legia.soldiers && state.legia.soldiers.length > 0) {
      state.legia.marching = true;
      state.legia.legiaUIOpen = false;
      addFloatingText(width / 2, height * 0.3, 'The legion marches! Board your ship.', '#cc4444');
      return;
    }
    if (handleLegiaKey(key)) return;
    return; // block all other keys while legiaUI open
  }

  // Shop tab switching with number keys when shop is open
  if (state.ship.shopOpen && state.ship.state === 'docked') {
    let tabs = ['buy', 'sell', 'upgrade'];
    let tabIdx = parseInt(key) - 1;
    if (tabIdx >= 0 && tabIdx < 3) {
      state.ship.shopTab = tabs[tabIdx];
    }
  }

  // Crop select (when not in build mode or shop)
  if (!state.buildMode && !(state.ship.shopOpen && state.ship.state === 'docked')) {
    if (key === '1') { state.cropSelect = 'grain'; addFloatingText(width / 2, height * 0.4, 'Crop: Grain', C.vineLight); }
    if (key === '2') { state.cropSelect = 'grape'; addFloatingText(width / 2, height * 0.4, 'Crop: Grape', '#9040a0'); }
    if (key === '3') { state.cropSelect = 'olive'; addFloatingText(width / 2, height * 0.4, 'Crop: Olive', '#607030'); }
    if (key === '4') {
      let sc = getSeasonalCrop();
      if (sc) { state.cropSelect = sc.id; addFloatingText(width / 2, height * 0.4, 'Crop: ' + sc.name, sc.color); }
    }
    if (key === '5' && state.flaxSeeds > 0) { state.cropSelect = 'flax'; addFloatingText(width / 2, height * 0.4, 'Crop: Flax', '#6496dc'); }
    if (key === '6' && state.pomegranateSeeds > 0) { state.cropSelect = 'pomegranate'; addFloatingText(width / 2, height * 0.4, 'Crop: Pomegranate', '#c82828'); }
    if (key === '7' && state.lotusSeeds > 0) { state.cropSelect = 'lotus'; addFloatingText(width / 2, height * 0.4, 'Crop: Sacred Lotus', '#f0a0c8'); }
  }

  // Dive attack — SPACE while underwater
  if (state.diving && state.diving.active && (key === ' ' || key === 'j' || key === 'J')) {
    let p = state.player;
    if (p.attackTimer <= 0) {
      p.attackTimer = p.attackCooldown;
      p.slashPhase = 10;
      p.toolSwing = 12;
      if (snd) snd.playSFX('hit');
    }
    return;
  }

  // Hotbar 1-0 direct select
  if (!state.buildMode && !state.conquest.active) {
    let numKey = key === '0' ? 9 : parseInt(key) - 1;
    if (numKey >= 0 && numKey < HOTBAR_ITEMS.length) {
      let item = HOTBAR_ITEMS[numKey];
      // Consumable items (slots 5+) — use immediately instead of selecting
      if (numKey === 5) { usePotion(); return; }
      if (numKey === 6) { useStew(); return; }
      if (numKey === 7 || numKey === 8) { state.player.hotbarSlot = numKey; addFloatingText(width / 2, height - 110, item.name, '#aaddaa'); return; }
      if (numKey === 9) { useAmbrosia(); return; }
      state.player.hotbarSlot = numKey;
      addFloatingText(width / 2, height - 110, item.name, '#aaddaa');
      return;
    }
  }

  // Dialog advance with Space
  if (dialogState.active && key === ' ') { advanceDialog(); return; }

  // Empire Dashboard toggle (Tab)
  if (keyCode === 9) {
    if (state.codexOpen) {
      state.journalOpen = !state.journalOpen;
    } else {
      empireDashOpen = !empireDashOpen;
      if (empireDashOpen) inventoryOpen = false;
    }
    if (snd) snd.playSFX('page_turn');
    return false; // prevent browser tab switching
  }

  // V key: Call to Arms (if army exists) or Wardrobe toggle
  if (key === 'v' || key === 'V') {
    if (gameScreen === 'game' && !state.diving.active && !state.rowing.active) {
      // Call to Arms: teleport army to player
      if (state.legia && state.legia.army && state.legia.army.length > 0 && !state.legia.garrison) {
        if (!state._callToArmsCooldown || state._callToArmsCooldown <= 0) {
          let army = state.legia.army;
          for (let i = 0; i < army.length; i++) {
            let angle = (i / army.length) * Math.PI * 2;
            army[i].x = state.player.x + Math.cos(angle) * (50 + Math.random() * 50);
            army[i].y = state.player.y + Math.sin(angle) * (50 + Math.random() * 50);
          }
          if (typeof _currentFormation !== 'undefined') _currentFormation = 'battle';
          if (typeof addFloatingText === 'function') addFloatingText(width / 2, height * 0.25, 'CALL TO ARMS!', '#ff4444');
          if (typeof snd !== 'undefined' && snd) snd.playSFX('war_horn');
          if (typeof triggerScreenShake === 'function') triggerScreenShake(4, 12, 0, 0, 'random');
          state._callToArmsCooldown = 60;
          return;
        }
      }
      // Fallback: wardrobe
      wardrobeOpen = !wardrobeOpen;
      return;
    }
  }

  // Inventory toggle (I key)
  if (keyMatchesAction('inventory', key, keyCode)) {
    inventoryOpen = !inventoryOpen;
    if (inventoryOpen) empireDashOpen = false;
    if (snd) snd.playSFX('page_turn');
    return;
  }

  // Character Equipment toggle (O key)
  if (key === 'o' || key === 'O') {
    equipmentWindowOpen = !equipmentWindowOpen;
    if (equipmentWindowOpen) { empireDashOpen = false; inventoryOpen = false; }
    if (snd) snd.playSFX('page_turn');
    return;
  }

  // Achievements panel toggle (U key)
  if (key === 'u' || key === 'U') {
    state.achievementsPanelOpen = !state.achievementsPanelOpen;
    if (state.achievementsPanelOpen) { empireDashOpen = false; inventoryOpen = false; }
    return;
  }
  if (state.achievementsPanelOpen) {
    if (key === '1') { state._achTab = 0; return; }
    if (key === '2') { state._achTab = 1; return; }
    if (key === '3') { state._achTab = 2; return; }
    if (keyCode === UP_ARROW) { state._achScroll = Math.max(0, (state._achScroll || 0) - 1); return; }
    if (keyCode === DOWN_ARROW) { state._achScroll = Math.min(ACHIEVEMENTS.length - 1, (state._achScroll || 0) + 1); return; }
  }

  // Skill tree toggle (K key)
  // HUD minimize toggle (H key)
  if (key === 'h' || key === 'H') {
    state.hudMinimized = !state.hudMinimized;
    addFloatingText(width / 2, height * 0.1, state.hudMinimized ? 'HUD minimized (H to expand)' : 'HUD expanded', '#ffdc50');
    return;
  }

  if (key === 'k' || key === 'K') {
    if (typeof toggleSkillTree === 'function') toggleSkillTree();
    return;
  }

  // Legion panel toggle (L key)
  if (keyMatchesAction('legia', key, keyCode)) {
    if (state.legia && state.legia.castrumLevel >= 1) {
      state.legia.legiaUIOpen = !state.legia.legiaUIOpen;
      return;
    }
  }

  // Naturalist's Codex toggle (N key)
  if (key === 'n' || key === 'N') {
    state.naturalistOpen = !state.naturalistOpen;
    if (state.naturalistOpen) { state.codexOpen = false; state.journalOpen = false; }
    return;
  }
  if (state.naturalistOpen) {
    if (key === '1') { state.naturalistTab = 0; return; }
    if (key === '2') { state.naturalistTab = 1; return; }
    if (key === '3') { state.naturalistTab = 2; return; }
    if (key === '4') { state.naturalistTab = 3; return; }
    if (key === '5') { state.naturalistTab = 4; return; }
    if (key === '6') { state.naturalistTab = 5; return; }
  }

  // Recipe Book toggle (G key)
  if (keyMatchesAction('recipeBook', key, keyCode)) {
    if (typeof recipeBookOpen !== 'undefined') {
      recipeBookOpen = !recipeBookOpen;
      return;
    }
  }

  // Block input when overlays are open
  if (empireDashOpen || inventoryOpen || equipmentWindowOpen || state.naturalistOpen || wardrobeOpen || (typeof recipeBookOpen !== 'undefined' && recipeBookOpen)) return;
  if (state.techTreeOpen) return; // tech tree blocks other input

  // Tech tree toggle (Y key)
  if (key === 'y' || key === 'Y') {
    state.techTreeOpen = !state.techTreeOpen;
    if (snd) snd.playSFX('page_turn');
    return;
  }

  // World Map toggle (M key)
  if (keyMatchesAction('map', key, keyCode)) {
    if (typeof worldMapOpen !== 'undefined') {
      worldMapOpen = !worldMapOpen;
      if (snd) snd.playSFX('page_turn');
    }
    return;
  }

  // Villa Codex toggle (C key)
  if (key === 'c' || key === 'C') {
    state.codexOpen = !state.codexOpen;
    state.journalOpen = false;
    if (snd) snd.playSFX('page_turn');
    return;
  }

  // Demolish confirmation: E to confirm, ESC handled above
  if (state.demolishConfirm && (key === 'e' || key === 'E')) {
    let dc = state.demolishConfirm;
    let b = dc.building;
    let idx = state.buildings.indexOf(b);
    if (idx >= 0) {
      state.buildings.splice(idx, 1);
      let refundParts = [];
      for (let res in dc.refund) {
        state[res] = (state[res] || 0) + dc.refund[res];
        let name = res === 'ironOre' ? 'iron' : res;
        refundParts.push('+' + dc.refund[res] + ' ' + name);
      }
      let sx = w2sX(b.x), sy = w2sY(b.y);
      addFloatingText(sx, sy - 20, 'Demolished', '#ff6644');
      if (refundParts.length > 0) {
        addFloatingText(sx, sy - 40, refundParts.join(', '), '#44cc44');
      }
      spawnParticles(b.x, b.y, 'chop', 6);
      if (snd) snd.playSFX('chop');
    }
    state.demolishConfirm = null;
    return;
  }

  // Build mode toggle
  if (keyMatchesAction('buildMode', key, keyCode)) {
    state.buildMode = !state.buildMode;
    state.demolishMode = false;
    state.demolishConfirm = null;
    if (state.buildMode) {
      addFloatingText(width / 2, height * 0.4, 'BUILD MODE ON', C.crystalGlow);
    } else {
      addFloatingText(width / 2, height * 0.4, 'BUILD MODE OFF', C.textDim);
      state._buildExitFrame = frameCount;
    }
  }

  // Build type selection
  if (state.buildMode) {
    if (key === '1') state.buildType = 'floor';
    if (key === '2') state.buildType = 'wall';
    if (key === '3') state.buildType = 'door';
    if (key === '4') state.buildType = 'chest';
    if (key === '5') state.buildType = 'bridge';
    if (key === '6') state.buildType = 'fence';
    if (key === '7') state.buildType = 'torch';
    if (key === '8') state.buildType = 'flower';
    if (key === '9') state.buildType = 'lantern';
    if (key === '0') state.buildType = 'mosaic';
    if (key === '-') state.buildType = 'aqueduct';
    if (key === '=') state.buildType = 'bath';
    if (key === 'r' || key === 'R' || key === 'q' || key === 'Q') {
      if (ROTATABLE_TYPES.includes(state.buildType)) {
        state.buildRotation = (state.buildRotation + 1) % 4;
        addFloatingText(width / 2, height * 0.4, 'Rotated ' + (state.buildRotation * 90) + '\u00B0', '#aaddff');
      }
      return; // prevent R from giving seeds while in build mode
    }
    if (keyMatchesAction('demolish', key, keyCode)) {
      state.demolishMode = !state.demolishMode;
      state.demolishConfirm = null;
      addFloatingText(width / 2, height * 0.4, state.demolishMode ? 'DEMOLISH MODE — click building' : 'DEMOLISH OFF', state.demolishMode ? '#ff6644' : C.textDim);
    }
  }

  // Expand island (only when not in build mode)
  if (!state.buildMode && (key === 'x' || key === 'X')) {
    expandIsland();
  }

  // Build Imperial Bridge (G key — near pyramid)
  if (key === 'g' || key === 'G') {
    let nearPyramid = dist2(state.player.x, state.player.y, state.pyramid.x, state.pyramid.y) < 70;
    if (nearPyramid && typeof canBuildBridge === 'function' && canBuildBridge()) {
      startBuildBridge();
    }
  }

  // Pray at temple
  if (key === 't' || key === 'T') {
    // Try awakening Lares first
    if (tryAwakenLares()) return;
    let pd = dist2(state.player.x, state.player.y, state.pyramid.x, state.pyramid.y);
    if (pd < 100) {
      prayAtTemple();
    } else {
      addFloatingText(width / 2, height * 0.4, 'Get closer to the temple', C.textDim);
    }
  }

  // God ultimate — G key (requires 5 prayers)
  if (key === 'g' || key === 'G') {
    if (state.god && state.god.ultimateCharge >= 5 && state.faction && GODS[state.faction]) {
      let god = GODS[state.faction];
      state.god.ultimateCharge = 0;
      addFloatingText(width / 2, height * 0.25, god.ultimate + '!', '#ffd700');
      spawnParticles(state.player.x, state.player.y, 'divine', 20);
      if (snd) snd.playSFX('fanfare');
      // Apply ultimate effect based on faction
      if (state.faction === 'rome') { state.player.battleCryTimer = 600; } // 10 sec battle fury
      else if (state.faction === 'carthage') { state.gold += 100; }
      else if (state.faction === 'egypt') { state.solar = state.maxSolar; state.crystals += 10; }
      else if (state.faction === 'greece') { state.player.xp += 200; }
      else if (state.faction === 'seapeople') { state.fish += 50; state.wood += 20; }
      else if (state.faction === 'persia') { state.gold += 80; if (state.colonies) for (let ck of Object.keys(state.colonies)) state.colonies[ck].gold += 30; }
      else if (state.faction === 'phoenicia') { state.gold += 60; state.tradeRoutes.forEach(r => { r.goldEarned += 50; }); }
      else if (state.faction === 'gaul') { state.wood += 30; state.stone += 20; state.harvest += 20; }
      trackMilestone('god_ultimate_' + state.faction);
    }
  }

  // Cook — C key near a brazier/torch building; also Colony at pyramid
  if (key === 'c' || key === 'C') {
    // Colony management at pyramid takes priority
    let nearPyramid = dist2(state.player.x, state.player.y, state.pyramid.x, state.pyramid.y) < 70;
    if (nearPyramid && canColonize()) {
      colonizeTerraNovaAction();
      return;
    }
    if (nearPyramid && state.conquest.colonized && state.conquest.colonyLevel < 10) {
      upgradeColony();
      return;
    }
    if (state.cooking.active) {
      addFloatingText(width / 2, height * 0.4, 'Already cooking...', C.textDim);
    } else {
      let nearBrazier = state.buildings.some(b => {
        if (b.type !== 'torch') return false;
        return dist2(state.player.x, state.player.y, b.x, b.y) < 80;
      });
      if (nearBrazier) {
        // Try recipes in order of value (best first)
        let cooked = false;
        for (let i = RECIPES.length - 1; i >= 0; i--) {
          if (canCook(RECIPES[i])) {
            cookRecipe(RECIPES[i]);
            state.cooking.active = true;
            let festCook = getFestival();
            let instantCook = (state.prophecy && state.prophecy.type === 'cooking') || (festCook && festCook.effect.cooking);
            state.cooking.timer = instantCook ? 1 : 120;
            state.cooking.recipe = RECIPES[i].name;
            addFloatingText(width / 2, height * 0.35, 'Cooking ' + RECIPES[i].name + '...', C.solarBright);
            cooked = true;
            break;
          }
        }
        if (!cooked) {
          addFloatingText(width / 2, height * 0.4, 'No ingredients! Need harvest + fish', C.textDim);
        }
      } else {
        addFloatingText(width / 2, height * 0.4, 'Build a Brazier first, then stand near it', C.textDim);
      }
    }
  }

  // Photo mode toggle
  if (key === 'p' || key === 'P') {
    photoMode = !photoMode;
    if (photoMode) {
      photoModeWatermarkAlpha = 0;
      photoModeTipTimer = 120; // ~2 seconds at 60fps
    }
    addFloatingText(width / 2, height * 0.3, photoMode ? 'PHOTO MODE' : 'HUD RESTORED', '#ffdc50');
  }
  // Save / Load
  if (key === 'l' || key === 'L') { loadGame(); }

  // Debug seeds
  if (key === 'r' || key === 'R') {
    state.seeds += 3;
    addFloatingText(width / 2, height * 0.4, '+3 Seeds', C.vineLight);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── WRECK BEACH SYSTEM — Shipwreck Starting Area ────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// ─── WRECK DEPTH ZONES ──────────────────────────────────────────────────────
// Normalized dist from island center thresholds and their speed multipliers
const WRECK_DEPTH_THRESHOLDS = [0.9, 1.05, 1.3, 1.6]; // beach|ankle|waist|swim|dive
const WRECK_DEPTH_SPEEDS     = [1.0,  0.85, 0.65, 0.5, 0.45];
const WRECK_DEPTH_LABELS     = ['beach','ankle','waist','swimming','deep'];

// ═══ WRECK FUNCTIONS — moved to wreck.js ═════════════════════════

// ─── TUTORIAL HINT SYSTEM ────────────────────────────────────────────────
function showTutorialHint(text, wx, wy) {
  if (tutorialHintCooldown > 0) return;
  tutorialHint = { text: text, timer: 180, wx: wx, wy: wy };
  tutorialHintCooldown = 120;
}

function updateTutorialHint(dt) {
  if (tutorialHint) {
    tutorialHint.timer -= dt;
    if (tutorialHint.timer <= 0) tutorialHint = null;
  }
  if (tutorialHintCooldown > 0) tutorialHintCooldown -= dt;
}

// ─── CONTEXTUAL TUTORIAL HINTS (show-once system) ──────────────────────
function showTutorialHintOnce(key, text, wx, wy) {
  if (!state.progression.tutorialsSeen) state.progression.tutorialsSeen = {};
  if (state.progression.tutorialsSeen[key]) return;
  state.progression.tutorialsSeen[key] = true;
  tutorialHint = { text: text, timer: 300, wx: wx, wy: wy };
  tutorialHintCooldown = 60;
}

// ─── TUTORIAL GOAL SYSTEM — 6-step onboarding ──────────────────────────
const TUTORIAL_STEPS = [
  { id: 'move',    text: 'Use WASD to move around your island',                check: function() { return state.player.moving; } },
  { id: 'chop',    text: 'Walk to a tree and press E to chop wood',            check: function() { return state.dailyActivities.chopped > 0 || state.playerStats.treesChopped > 0; } },
  { id: 'crystal', text: 'Walk to the glowing crystals and press E to mine',   check: function() { return state.dailyActivities.crystal > 0 || state.playerStats.crystalsCollected > 0; } },
  { id: 'farm',    text: 'Walk to the farm plots and press E to plant seeds',  check: function() { return state.plots && state.plots.some(function(p) { return p.planted; }); } },
  { id: 'build',   text: 'Press B to open Build Mode and place a building',    check: function() { return state.buildings.length > 0; } },
  { id: 'attack',  text: 'Press SPACE to attack! Try it on nearby creatures',   check: function() { return state.progression.tutorialsSeen && state.progression.tutorialsSeen.attacked; } },
  { id: 'expand',  text: 'Visit the Crystal Shrine to expand your island!',    check: function() { return state.islandLevel > 1; } },
];

function skipTutorial() {
  state.tutorialGoalStep = TUTORIAL_STEPS.length;
  state.tutorialGoalComplete = true;
  state.tutorialGoal = null;
}

function _nearestEntity(arr, filterFn) {
  let best = null, bd = Infinity;
  for (let i = 0; i < arr.length; i++) {
    let e = arr[i];
    if (filterFn && !filterFn(e)) continue;
    let d = (e.x - state.player.x) * (e.x - state.player.x) + (e.y - state.player.y) * (e.y - state.player.y);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function updateTutorialGoals() {
  if (!state.progression.homeIslandReached) return;
  if (state.tutorialGoalComplete) return;
  if (state.prestige && state.prestige.count > 0) { skipTutorial(); return; }
  let step = state.tutorialGoalStep;
  if (step >= TUTORIAL_STEPS.length) { skipTutorial(); return; }
  let s = TUTORIAL_STEPS[step];
  // Find target position for directional arrow
  let tx = state.player.x, ty = state.player.y;
  if (s.id === 'chop')    { let t = _nearestEntity(state.trees || [], function(t) { return t.alive; }); if (t) { tx = t.x; ty = t.y; } }
  if (s.id === 'crystal') { let c = _nearestEntity(state.crystalNodes || [], function(c) { return c.charge > 0; }); if (c) { tx = c.x; ty = c.y; } }
  if (s.id === 'farm')    { tx = getFarmCenterX(); ty = getFarmCenterY(); }
  if (s.id === 'expand')  { if (state.crystalShrine) { tx = state.crystalShrine.x; ty = state.crystalShrine.y; } }
  state.tutorialGoal = { text: s.text, targetWX: tx, targetWY: ty, stepId: s.id };
  if (s.check()) {
    // Tutorial step narration triggers
    if (s.id === 'chop' && snd) snd.playSFX('ding'); // brief congratulatory chime
    if (s.id === 'farm' && snd && snd.playNarration) snd.playNarration('first_steps');
    if (s.id === 'build' && snd && snd.playNarration) snd.playNarration('first_build');
    state.tutorialGoalStep = step + 1;
    if (step + 1 >= TUTORIAL_STEPS.length) {
      state.tutorialGoalComplete = true;
      state.tutorialGoal = null;
      addNotification('Tutorial complete! Explore freely.', '#44ffaa');
      if (snd) snd.playSFX('fanfare'); // fanfare on tutorial complete
      trackMilestone('tutorial_complete');
    }
  }
}

// ─── DAY 1 SCRIPTED MOMENTS ────────────────────────────────────────────
function isDay1() { return state.day === 1; }
function getFirstCropGrowthMultiplier() { return (state.day === 1 && state.harvest === 0) ? 2.0 : 1.0; }
function shouldGuaranteeFish() { return state.day === 1 && (state.codex.fishCaught ? Object.keys(state.codex.fishCaught).length === 0 : true); }
function isFirstBuilding() { return state.buildings.length === 0; }


// ═══════════════════════════════════════════════════════════════════════════
// ─── NPC DISCOVERY + COMPANION AWAKENING ─────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// Discovery state for dialog popups
let discoveryEvent = null; // { type:'npc'|'companion', who, phase, timer, text }

function updateDiscoveryEvents(dt) {
  let prog = state.progression;
  if (!prog.gameStarted || !prog.homeIslandReached) return;
  let p = state.player;

  // Active discovery dialog
  if (discoveryEvent) {
    discoveryEvent.timer -= dt;
    if (discoveryEvent.timer <= 0) {
      // Complete the discovery
      completeDiscovery(discoveryEvent);
      discoveryEvent = null;
    }
    return; // block other checks while event active
  }

  // ─── NPC Discovery Triggers (only before villa cleared) ───
  if (!prog.villaCleared) {
  // Marcus — trapped near port barracks (right side of island)
  if (!prog.npcsFound.marcus) {
    let mx = WORLD.islandCX + WORLD.islandRX - 100, my = WORLD.islandCY + 20;
    if (dist(p.x, p.y, mx, my) < 55) {
      discoveryEvent = {
        type: 'npc', who: 'marcus', phase: 0, timer: 240,
        text: '"By Jupiter... a fellow Roman! Help me — I am pinned under this rubble!"',
        subtext: 'Press E to free Marcus',
      };
      state.marcus.x = mx; state.marcus.y = my;
    }
  }

  // Vesta — praying in damaged crystal shrine (left side)
  if (!prog.npcsFound.vesta) {
    let vx = state.crystalShrine.x, vy = state.crystalShrine.y;
    if (dist(p.x, p.y, vx, vy) < 50) {
      discoveryEvent = {
        type: 'npc', who: 'vesta', phase: 0, timer: 240,
        text: '"The sacred flame... it has gone dark. Please, bring crystals to relight it."',
        subtext: 'Press E to help Vesta',
      };
    }
  }

  // Felix — in overgrown farm field (left side, near farm)
  if (!prog.npcsFound.felix) {
    let fx = WORLD.islandCX - 200, fy = WORLD.islandCY - 10;
    if (dist(p.x, p.y, fx, fy) < 55) {
      discoveryEvent = {
        type: 'npc', who: 'felix', phase: 0, timer: 240,
        text: '"Salve, exile! These fields are overrun... help me clear the weeds?"',
        subtext: 'Press E to help Felix',
      };
    }
  }
  } // end if (!prog.villaCleared)

  // ─── Companion Awakening at Temple/Pyramid ───
  // Lares (spirit) — first companion, awakened by praying at pyramid with 2 crystals
  if (!prog.companionsAwakened.lares && prog.npcsFound.vesta) {
    let tx = state.pyramid.x, ty = state.pyramid.y;
    if (dist(p.x, p.y, tx, ty) < 50 && state.crystals >= 2) {
      showTutorialHint('Press T to awaken Lares spirit (2 crystals)', tx, ty - 30);
    }
  }

  // Woodcutter — awakened after clearing 5 trees
  if (!prog.companionsAwakened.woodcutter && prog.companionsAwakened.lares) {
    let treesChopped = state.trees.filter(t => !t.alive).length;
    if (treesChopped >= 5) {
      prog.companionsAwakened.woodcutter = true;
      state.woodcutter.x = state.player.x + 30;
      state.woodcutter.y = state.player.y + 10;
      addFloatingText(width / 2, height * 0.3, 'WOODCUTTER JOINS YOU', C.solarGold);
      addFloatingText(width / 2, height * 0.36, 'Auto-chops nearby trees', C.textDim);
      unlockJournal('woodcutter_join');
    }
  }

  // Harvester — awakened after first successful harvest
  if (!prog.companionsAwakened.harvester && prog.companionsAwakened.lares) {
    if (state.harvest > 0 || state.codex.cropsGrown.grain) {
      prog.companionsAwakened.harvester = true;
      state.harvester.x = WORLD.islandCX - 140;
      state.harvester.y = WORLD.islandCY + 10;
      addFloatingText(width / 2, height * 0.3, 'HARVESTER JOINS YOU', C.solarGold);
      addFloatingText(width / 2, height * 0.36, 'Auto-harvests ripe crops', C.textDim);
      unlockJournal('harvester_join');
    }
  }

  // Centurion — awakened after finding Marcus (military NPC) + reaching 10 gold
  if (!prog.companionsAwakened.centurion && prog.npcsFound.marcus && state.gold >= 10) {
    prog.companionsAwakened.centurion = true;
    state.centurion.x = state.player.x - 20;
    state.centurion.y = state.player.y + 15;
    addFloatingText(width / 2, height * 0.3, getFactionTerms().leader.toUpperCase() + ' JOINS YOU', C.solarGold);
    addFloatingText(width / 2, height * 0.36, 'Loyal guard, follows & fights', C.textDim);
    unlockJournal('centurion_join');
  }

  // Villa cleared — unlock when all 3 NPCs found
  if (!prog.villaCleared && prog.npcsFound.marcus && prog.npcsFound.vesta && prog.npcsFound.felix) {
    prog.villaCleared = true;
    addFloatingText(width / 2, height * 0.25, 'VILLA RESTORED', C.solarBright);
    addFloatingText(width / 2, height * 0.31, 'All villagers found — the island lives again!', C.textDim);
    unlockJournal('villa_restored');
    // Screen flash celebration
    state.screenFlash = { r: 255, g: 240, b: 180, alpha: 120, timer: 30 };
  }
}

function handleDiscoveryInteract() {
  if (!discoveryEvent) return false;
  completeDiscovery(discoveryEvent);
  discoveryEvent = null;
  return true;
}

function completeDiscovery(evt) {
  let prog = state.progression;

  if (evt.type === 'npc') {
    if (evt.who === 'marcus') {
      prog.npcsFound.marcus = true;
      state.marcus.present = true;
      state.marcus.hearts = 1;
      addFloatingText(width / 2, height * 0.3, 'MARCUS FREED', C.solarGold);
      addFloatingText(width / 2, height * 0.36, 'Veteran soldier joins your villa', C.textDim);
      unlockJournal('marcus_found');
      // Spawn heart particles
      for (let i = 0; i < 8; i++) {
        particles.push({
          x: w2sX(state.marcus.x), y: w2sY(state.marcus.y) - 10,
          vx: random(-1.5, 1.5), vy: random(-2, -0.5),
          life: 50 + random(20), maxLife: 70,
          size: random(3, 6), type: 'heart',
          color: [255, 120, 150],
        });
      }
    } else if (evt.who === 'vesta') {
      prog.npcsFound.vesta = true;
      state.vesta.hearts = 1;
      addFloatingText(width / 2, height * 0.3, 'VESTA JOINS', C.npcGlow);
      addFloatingText(width / 2, height * 0.36, 'Priestess tends the sacred flame', C.textDim);
      unlockJournal('vesta_found');
    } else if (evt.who === 'felix') {
      prog.npcsFound.felix = true;
      state.felix.hearts = 1;
      prog.farmCleared = true;
      addFloatingText(width / 2, height * 0.3, 'FELIX JOINS', C.vineLight);
      addFloatingText(width / 2, height * 0.36, 'Farmer restores the fields', C.textDim);
      unlockJournal('felix_found');
    }
  }
}

// Awaken Lares companion at pyramid (called from T key at temple)
function tryAwakenLares() {
  let prog = state.progression;
  if (!prog.gameStarted || prog.companionsAwakened.lares) return false;
  if (!prog.npcsFound.vesta) return false;
  if (state.crystals < 2) {
    addFloatingText(width / 2, height * 0.35, 'Need 2 crystals', C.buildInvalid);
    return false;
  }
  let tx = state.pyramid.x, ty = state.pyramid.y;
  if (dist(state.player.x, state.player.y, tx, ty) > 60) return false;

  state.crystals -= 2;
  prog.companionsAwakened.lares = true;
  state.companion.x = tx + 20;
  state.companion.y = ty + 15;
  state.companion.energy = 100;
  addFloatingText(width / 2, height * 0.25, 'LARES SPIRIT AWAKENED', C.crystalGlow);
  addFloatingText(width / 2, height * 0.31, 'The guardian returns... farming companion active', C.textDim);
  unlockJournal('lares_awaken');
  state.screenFlash = { r: 100, g: 255, b: 180, alpha: 80, timer: 30 };
  // Sparkle particles
  for (let i = 0; i < 12; i++) {
    let angle = (i / 12) * TWO_PI;
    particles.push({
      x: w2sX(tx), y: w2sY(ty),
      vx: cos(angle) * 2, vy: sin(angle) * 2,
      life: 40, maxLife: 40, size: 3, type: 'sparkle',
      color: [100, 255, 200],
    });
  }
  return true;
}


// ======================================================================
// === IMPERATOR VICTORY CEREMONY ======================================
// ======================================================================

function checkImperatorVictory() {
  if (state.won) return;
  if (state.islandLevel < 25) return;
  let liviaHearts = state.npc ? state.npc.hearts : 0;
  let marcusHearts = state.marcus ? state.marcus.hearts : 0;
  let vestaHearts = state.vesta ? state.vesta.hearts : 0;
  let felixHearts = state.felix ? state.felix.hearts : 0;
  if (liviaHearts < 10 || marcusHearts < 10 || vestaHearts < 10 || felixHearts < 10) return;
  if (!state.conquest.colonized) return;
  state.won = true;
  state.victoryCeremony = { timer: 0, phase: 1 };
}

function updateImperatorCeremony(dt) {
  if (!state.victoryCeremony) return;
  let vc = state.victoryCeremony;
  vc.timer += dt;
  if (vc.phase === 1 && vc.timer >= 60) vc.phase = 2;
  if (vc.phase === 2 && vc.timer >= 180) vc.phase = 3;
  if (vc.phase === 3 && vc.timer >= 360) vc.phase = 4;
  // Phase 3: gold particle cannon (8/frame)
  if (vc.phase === 3) {
    for (let i = 0; i < 8; i++) {
      particles.push({
        x: width * 0.5 + random(-width * 0.3, width * 0.3),
        y: height + 4,
        vx: random(-2, 2), vy: random(-6, -2),
        life: random(60, 140), maxLife: 140,
        type: 'burst', size: random(3, 8),
        r: 255, g: floor(random(180, 240)), b: 20,
        world: false,
      });
    }
  }
  // Phase 4: gentle lingering particles
  if (vc.phase === 4 && frameCount % 4 === 0) {
    for (let i = 0; i < 2; i++) {
      particles.push({
        x: random(0, width), y: random(0, height),
        vx: random(-0.5, 0.5), vy: random(-1.5, -0.3),
        life: random(40, 90), maxLife: 90,
        type: 'burst', size: random(2, 5),
        r: 255, g: floor(random(200, 240)), b: 40,
        world: false,
      });
    }
  }
  if (vc.timer < 30) triggerScreenShake(8, 2);
  if (vc.timer > 720) state.victoryCeremony = null;
}

function drawImperatorCeremony() {
  if (!state.victoryCeremony) return;
  let vc = state.victoryCeremony;
  let t = vc.timer;
  push(); noStroke();

  // Phase 1 (0-60): Blackout fade in
  if (vc.phase === 1) {
    let fadeAlpha = map(t, 0, 60, 0, 255);
    fill(0, 0, 0, fadeAlpha);
    rect(0, 0, width, height);
    pop(); return;
  }

  // Full black backdrop for phases 2-4
  let bgAlpha = t > 660 ? map(t, 660, 720, 255, 0) : 255;
  fill(0, 0, 0, bgAlpha);
  rect(0, 0, width, height);

  // Phase 2+ (60+): NPC silhouettes
  if (vc.phase >= 2) {
    let silAlpha = vc.phase === 2 ? map(t, 60, 100, 0, 255) : bgAlpha;
    let npcNames = ['Livia', 'Marcus', 'Vesta', 'Felix'];
    let npcHearts = [
      state.npc ? state.npc.hearts : 0,
      state.marcus ? state.marcus.hearts : 0,
      state.vesta ? state.vesta.hearts : 0,
      state.felix ? state.felix.hearts : 0
    ];
    let spacing = width / 5;
    for (let i = 0; i < 4; i++) {
      let cx = spacing * (i + 1);
      let cy = height * 0.72;
      // 12x24 gold pixel silhouette
      fill(218, 165, 32, silAlpha * 0.9);
      rect(cx - 4, cy - 24, 8, 8);
      rect(cx - 6, cy - 16, 12, 14);
      rect(cx - 5, cy - 2, 4, 8);
      rect(cx + 1, cy - 2, 4, 8);
      // Name
      fill(255, 220, 80, silAlpha);
      textAlign(CENTER, TOP); textSize(9);
      text(npcNames[i], cx, cy + 10);
      // Golden hearts
      fill(255, 200, 40, silAlpha * 0.8);
      textSize(11);
      let heartStr = '';
      for (let h = 0; h < min(npcHearts[i], 10); h++) heartStr += '\u2665';
      text(heartStr, cx, cy + 22);
    }
  }

  // Phase 3+ (180+): IMPERATOR title + subtitle
  if (vc.phase >= 3) {
    let titleAlpha = vc.phase === 3 ? map(t, 180, 220, 0, 255) : bgAlpha;
    let bannerY = height * 0.28 + sin(t * 0.03) * 3;
    fill(255, 220, 80, titleAlpha);
    textAlign(CENTER, CENTER);
    textSize(42); textStyle(BOLD);
    text('IMPERATOR', width / 2, bannerY);
    textStyle(NORMAL); textSize(13);
    fill(220, 200, 140, titleAlpha * 0.85);
    text('By grain and stone and stubborn hope.', width / 2, bannerY + 30);
  }

  // Phase 4 (360-720): Warm golden tint + linger text + blink prompt
  if (vc.phase === 4) {
    let tintAlpha = t > 660 ? map(t, 660, 720, 40, 0) : map(t, 360, 420, 0, 40);
    fill(255, 200, 60, tintAlpha);
    rect(0, 0, width, height);
    let fadeA = t > 660 ? map(t, 660, 720, 255, 0) : 255;
    fill(220, 200, 140, fadeA * 0.9);
    textAlign(CENTER, CENTER); textSize(14);
    text('Mare Nostrum is yours.', width / 2, height * 0.45);
    let blinkA = (sin(t * 0.08) * 0.4 + 0.6) * fadeA * 0.7;
    fill(160, 140, 80, blinkA);
    textSize(9);
    text('[any key] to continue', width / 2, height * 0.55);
  }

  pop();
}

// ─── ISLAND NAMING OVERLAY — triggered at level 10 ──────────────────────
function drawIslandNamingOverlay() {
  if (!state.islandNamingOpen) return;
  push();
  rectMode(CORNER);
  noStroke();
  fill(0, 0, 0, 180);
  rect(0, 0, width, height);
  let pw = 320,
    ph = 140;
  let px = (width - pw) / 2,
    py = (height - ph) / 2;
  fill(35, 28, 18, 245);
  rect(px, py, pw, ph, 6);
  stroke(180, 145, 70, 220);
  strokeWeight(2);
  noFill();
  rect(px, py, pw, ph, 6);
  noStroke();
  fill(212, 175, 80);
  textAlign(CENTER, TOP);
  textSize(12);
  text('NAME YOUR ISLAND', width / 2, py + 14);
  fill(180, 160, 120);
  textSize(11);
  text('You have earned the title of Governor.', width / 2, py + 34);
  text('Give your island a name worthy of Rome.', width / 2, py + 46);
  fill(25, 20, 15);
  rect(px + 30, py + 66, pw - 60, 24, 3);
  stroke(140, 115, 60, 120);
  strokeWeight(1);
  noFill();
  rect(px + 30, py + 66, pw - 60, 24, 3);
  noStroke();
  fill(220, 200, 160);
  textSize(11);
  textAlign(CENTER, CENTER);
  let displayText = state.islandNamingInput || '';
  let blink = frameCount % 60 < 30 ? '|' : '';
  text(displayText + blink, width / 2, py + 78);
  fill(140, 120, 80, 180);
  textSize(11);
  textAlign(CENTER, TOP);
  let canConfirm = displayText.trim().length >= 1;
  text(canConfirm ? '[Enter] to confirm' : 'Type a name...', width / 2, py + 100);
  fill(100, 90, 70, 140);
  text(canConfirm ? '[Escape] to skip' : '[Escape] to skip — default: "Insula Nova"', width / 2, py + 114);
  pop();
}

function handleIslandNamingKey(k, kc) {
  if (!state.islandNamingOpen) return false;
  if (kc === 13) {
    let name = (state.islandNamingInput || '').trim();
    if (name.length < 1) name = 'Insula Nova';
    state.islandName = name;
    state.islandNamingOpen = false;
    state.islandNamingInput = '';
    addFloatingText(width / 2, height * 0.2, 'Your island: ' + state.islandName, '#ffd700');
    if (typeof snd !== 'undefined' && snd) snd.playSFX('fanfare');
    if (typeof saveGame === 'function') saveGame();
    return true;
  }
  if (kc === 27) {
    state.islandName = (state.islandNamingInput || '').trim() || 'Insula Nova';
    state.islandNamingOpen = false;
    state.islandNamingInput = '';
    addFloatingText(width / 2, height * 0.2, 'Your island: ' + state.islandName, '#ffd700');
    if (typeof saveGame === 'function') saveGame();
    return true;
  }
  if (kc === 8) {
    state.islandNamingInput = (state.islandNamingInput || '').slice(0, -1);
    return true;
  }
  if (k.length === 1 && (state.islandNamingInput || '').length < 24) {
    state.islandNamingInput = (state.islandNamingInput || '') + k;
    return true;
  }
  return true;
}

// ═══ SAVE SYSTEM — moved to save.js ═══════════════════════════════════

// ─── ZONE PLACEMENT HELPERS ──────────────────────────────────────────────
// getFarmBounds, isInFarmZone — see farming.js

function clampToIsland(x, y, cx, cy, maxR) {
  maxR = maxR || 0.70;
  let srx = getSurfaceRX(), sry = getSurfaceRY();
  let ex = (x - cx) / srx, ey = (y - cy) / sry;
  if (ex * ex + ey * ey > maxR) {
    let sc = (maxR - 0.02) / sqrt(ex * ex + ey * ey);
    x = cx + (x - cx) * sc;
    y = cy + (y - cy) * sc;
  }
  return { x, y };
}

function addClampedResource(x, y, type, cx, cy) {
  let p = clampToIsland(x, y, cx, cy, 0.72);
  // Push away from farm zone
  if (isInFarmZone(p.x, p.y)) {
    let f = getFarmBounds();
    p.x = f.x + f.hw + 30;
  }
  state.resources.push({
    x: p.x, y: p.y, type: type,
    active: true, respawnTimer: 0, pulsePhase: random(TWO_PI),
  });
}

function addClampedCrystal(x, y, cx, cy) {
  let p = clampToIsland(x, y, cx, cy, 0.65);
  if (isInFarmZone(p.x, p.y)) {
    let f = getFarmBounds();
    p.x = f.x + f.hw + 30;
  }
  state.crystalNodes.push({
    x: p.x, y: p.y, size: random(10, 16), phase: random(TWO_PI), charge: random(40, 80),
  });
}

function getTempleExclusion() {
  let lvl = state.pyramid ? state.pyramid.level : 1;
  let tier = lvl <= 4 ? 1 : lvl <= 8 ? 2 : lvl <= 14 ? 3 : lvl <= 19 ? 4 : 5;
  let radii = [80, 120, 160, 200, 250];
  return radii[tier - 1];
}

function addClampedTree(x, y, cx, cy) {
  let p = clampToIsland(x, y, cx, cy, 0.65);
  if (isInFarmZone(p.x, p.y)) {
    let f = getFarmBounds();
    p.x = f.x + f.hw + 40;
  }
  // Avoid temple center — scales with level, uses pyramid position
  let excl = getTempleExclusion();
  let pyrX = state.pyramid ? state.pyramid.x : cx;
  let pyrY = state.pyramid ? state.pyramid.y : (cy - 15);
  let dx = p.x - pyrX, dy = p.y - pyrY;
  if (dx * dx + dy * dy < excl * excl) {
    let a = atan2(dy, dx);
    let pushDist = excl + 20;
    p.x = pyrX + cos(a) * pushDist;
    p.y = pyrY + sin(a) * pushDist;
  }
  // Avoid port zone (right side of island)
  let portX = cx + getSurfaceRX() * 0.85;
  let portY = cy + 20;
  let pdx = p.x - portX, pdy = p.y - portY;
  if (pdx * pdx + pdy * pdy < 60 * 60) {
    p.x = portX - 65;
  }
  // Skip if too close to any existing building
  let tooNearBuilding = state.buildings.some(b => {
    let bdx = p.x - b.x, bdy = p.y - b.y;
    return bdx * bdx + bdy * bdy < 60 * 60;
  });
  if (tooNearBuilding) return;
  // Skip if in center zone (forum/plaza area)
  let _srx = getSurfaceRX(), _sry = getSurfaceRY();
  let cnx = (p.x - cx) / (_srx * 0.3), cny = (p.y - cy) / (_sry * 0.3);
  if (cnx * cnx + cny * cny < 1) return;
  state.trees.push({
    x: p.x, y: p.y,
    health: 3, maxHealth: 3, alive: true, regrowTimer: 0,
    size: random(0.8, 1.1), swayPhase: random(TWO_PI),
    type: getFactionTreeTypes()[floor(random(3))],
  });
}

// Farming system — see farming.js

// Regenerate faction wildlife/flora (called on load since these aren't saved)
function initFactionNaturals() {
  let cx = WORLD.islandCX, cy = WORLD.islandCY;
  let srx = getSurfaceRX(), sry = getSurfaceRY();
  let fWild = FACTION_WILDLIFE[state.faction || 'rome'] || FACTION_WILDLIFE.rome;
  state.factionWildlife = [];
  for (let wi = 0; wi < 5; wi++) {
    let template = fWild[wi % fWild.length];
    let wa = random(TWO_PI), wd = random(0.2, 0.55) * srx;
    state.factionWildlife.push({
      x: cx + cos(wa) * wd, y: cy + sin(wa) * wd * (sry / srx),
      vx: 0, vy: 0, type: template.type, speed: template.speed, size: template.size,
      timer: random(60, 300), phase: random(TWO_PI), facing: random() > 0.5 ? 1 : -1,
    });
  }
  let fFlora = FACTION_FLORA[state.faction || 'rome'] || FACTION_FLORA.rome;
  state.factionFlora = [];
  randomSeed(99);
  for (let fi = 0; fi < 20; fi++) {
    let fa = random(TWO_PI), fd = random(0.15, 0.6) * srx;
    let fx = cx + cos(fa) * fd, fy = cy + sin(fa) * fd * (sry / srx);
    let template = fFlora[fi % fFlora.length];
    state.factionFlora.push({ x: fx, y: fy, col: template.col, w: template.w, h: template.h, phase: random(TWO_PI) });
  }
  randomSeed(millis());
}

// ─── FACTION WILDLIFE & FLORA ──────────────────────────────────────────

function updateFactionWildlife(dt) {
  if (!state.factionWildlife) return;
  let cx = WORLD.islandCX, cy = WORLD.islandCY;
  let srx = getSurfaceRX(), sry = getSurfaceRY();
  for (let w of state.factionWildlife) {
    w.timer -= dt;
    if (w.timer <= 0) {
      w.vx = (random() - 0.5) * w.speed * 2;
      w.vy = (random() - 0.5) * w.speed * 2;
      w.facing = w.vx > 0 ? 1 : -1;
      w.timer = random(80, 300);
    }
    let nx = w.x + w.vx * dt, ny = w.y + w.vy * dt;
    let ex = (nx - cx) / srx, ey = (ny - cy) / sry;
    if (ex * ex + ey * ey < 0.55) { w.x = nx; w.y = ny; }
    else { w.vx = -w.vx; w.vy = -w.vy; }
    // Flee from player
    let px = state.player.x, py = state.player.y;
    let d2 = (w.x - px) * (w.x - px) + (w.y - py) * (w.y - py);
    if (d2 < 40 * 40 && w.type !== 'camel' && w.type !== 'goat') {
      let a = atan2(w.y - py, w.x - px);
      w.vx = cos(a) * w.speed * 3;
      w.vy = sin(a) * w.speed * 3;
      w.timer = 30;
    }
  }
}

function drawOneFactionCreature(w) {
  let sx = w2sX(w.x), sy = w2sY(w.y);
  if (sx < -20 || sx > width + 20 || sy < -20 || sy > height + 20) return;
  push(); translate(floor(sx), floor(sy)); scale(w.facing, 1); noStroke();
  let sz = w.size;
  if (w.type === 'rabbit') {
    fill(160, 130, 90); rect(-3, -sz, 6, sz); // body
    fill(170, 140, 100); rect(-2, -sz - 3, 2, 4); rect(1, -sz - 4, 2, 5); // ears
    fill(40, 30, 20); rect(2, -sz + 1, 1, 1); // eye
    fill(180, 150, 110); ellipse(0, 0, 4, 2); // shadow-ish tail
  } else if (w.type === 'songbird') {
    let bob = sin(frameCount * 0.15 + w.phase) * 2;
    fill(180, 80, 50); rect(-2, -sz + bob, 4, 3); // body
    fill(200, 100, 60); rect(-1, -sz - 1 + bob, 2, 2); // head
    fill(60, 50, 40); rect(2, -sz + bob, 1, 1); // beak
    fill(140, 60, 40); rect(-3, -sz + 1 + bob, 1, 2); rect(3, -sz + 2 + bob, 1, 2); // wings
  } else if (w.type === 'fox') {
    fill(200, 120, 50); rect(-4, -sz, 8, sz - 1); // body
    fill(210, 130, 60); rect(-2, -sz - 3, 4, 4); // head
    fill(220, 140, 70); rect(-3, -sz - 5, 2, 3); rect(2, -sz - 5, 2, 3); // ears
    fill(240, 230, 210); rect(-1, -sz + 2, 3, 2); // belly
    fill(40, 30, 20); rect(1, -sz - 2, 1, 1); // eye
    fill(200, 110, 40); rect(4, -sz + 1, 4, 2); // tail
  } else if (w.type === 'camel') {
    fill(190, 160, 110); rect(-6, -sz, 12, sz - 2); // body
    fill(180, 150, 100); rect(-2, -sz - 4, 3, 5); // neck
    fill(175, 145, 95); rect(-1, -sz - 6, 3, 3); // head
    fill(195, 165, 115); rect(-3, -sz + 2, 2, 3); rect(3, -sz + 2, 2, 3); // humps
    fill(170, 140, 90); rect(-5, 0, 2, 3); rect(1, 0, 2, 3); rect(5, 0, 2, 3); // legs
    fill(40, 30, 20); rect(0, -sz - 5, 1, 1); // eye
  } else if (w.type === 'falcon') {
    let fy = sin(frameCount * 0.04 + w.phase) * 8 - 40;
    fill(100, 70, 40); rect(-3, fy, 6, 3); // body
    fill(90, 60, 35); rect(-6, fy + 1, 3, 1); rect(4, fy + 1, 3, 1); // wings
    fill(80, 55, 30, 100); rect(-8, fy + 1 + sin(frameCount * 0.06 + w.phase) * 1, 2, 1); rect(7, fy + 1 + sin(frameCount * 0.06 + w.phase) * 1, 2, 1); // wingtips
  } else if (w.type === 'desertfox') {
    fill(210, 180, 130); rect(-3, -sz, 6, sz - 1);
    fill(220, 190, 140); rect(-2, -sz - 2, 3, 3);
    fill(230, 200, 150); rect(-3, -sz - 4, 2, 3); rect(2, -sz - 4, 2, 3); // big ears
    fill(40, 30, 20); rect(0, -sz - 1, 1, 1);
  } else if (w.type === 'ibis') {
    fill(240, 235, 225); rect(-2, -sz, 4, sz - 3); // body
    fill(235, 230, 220); rect(-1, -sz - 3, 2, 4); // neck
    fill(220, 210, 200); rect(-1, -sz - 4, 3, 2); // head
    fill(40, 40, 40); rect(2, -sz - 3, 4, 1); // long beak
    fill(200, 80, 60); rect(-1, -sz - 5, 2, 1); // red crown
    fill(60, 60, 60); rect(-1, 0, 1, 4); rect(1, 0, 1, 4); // long legs
  } else if (w.type === 'cat') {
    fill(80, 70, 50); rect(-2, -sz, 4, sz - 1);
    fill(90, 80, 60); rect(-2, -sz - 2, 3, 3);
    fill(100, 90, 70); rect(-2, -sz - 3, 1, 2); rect(2, -sz - 3, 1, 2); // ears
    fill(200, 180, 60); rect(0, -sz - 1, 1, 1); // eye
    fill(70, 60, 40); rect(3, -sz + 2, 3, 1); // tail up
  } else if (w.type === 'scarab') {
    fill(30, 60, 40); rect(-2, -2, 4, 3);
    fill(40, 80, 50); rect(-1, -3, 3, 2);
    fill(80, 140, 60, 120); rect(-1, -2, 2, 2); // iridescent
  } else if (w.type === 'goat') {
    fill(220, 210, 195); rect(-4, -sz, 8, sz - 2);
    fill(210, 200, 185); rect(-2, -sz - 3, 4, 4);
    fill(160, 150, 130); rect(-2, -sz - 5, 1, 3); rect(2, -sz - 5, 1, 3); // horns
    fill(40, 30, 20); rect(1, -sz - 2, 1, 1);
    fill(200, 190, 170); rect(-3, 0, 2, 3); rect(2, 0, 2, 3); // legs
  } else if (w.type === 'turtle') {
    fill(80, 100, 60); rect(-3, -3, 6, 4); // shell
    fill(70, 90, 50); rect(-2, -4, 4, 2); // top
    fill(120, 110, 80); rect(3, -2, 2, 1); // head
    fill(90, 80, 55); rect(-3, 1, 2, 1); rect(3, 1, 2, 1); // legs
  } else if (w.type === 'owl') {
    let bright = typeof getSkyBrightness === 'function' ? getSkyBrightness() : 0.5;
    if (bright < 0.4) { // only visible at night/dusk
      fill(140, 120, 90); rect(-3, -sz, 6, sz - 1);
      fill(150, 130, 100); rect(-2, -sz - 2, 5, 3);
      fill(200, 180, 80); rect(-1, -sz - 1, 1, 1); rect(2, -sz - 1, 1, 1); // eyes glow
      fill(130, 110, 80); rect(-4, -sz + 1, 1, 2); rect(5, -sz + 1, 1, 2); // wings
    }
  }
  pop();
}

function drawOneFlora(fl) {
  let sx = w2sX(fl.x), sy = w2sY(fl.y);
  if (sx < -10 || sx > width + 10 || sy < -10 || sy > height + 10) return;
  noStroke();
  let sway = sin(frameCount * 0.02 + fl.phase) * 0.5;
  fill(fl.col[0], fl.col[1], fl.col[2], 160);
  rect(floor(sx + sway) - 1, floor(sy) - 1, fl.w, fl.h);
  fill(fl.col[0] + 20, fl.col[1] + 20, fl.col[2] + 20, 100);
  rect(floor(sx + sway), floor(sy), max(1, fl.w - 1), max(1, fl.h - 1));
}

// ─── CHICKENS ──────────────────────────────────────────────────────────
function updateChickens(dt) {
  if (!state.chickens) return;
  let farmCX = WORLD.islandCX - 340, farmCY = WORLD.islandCY - 5;
  state.chickens.forEach(ch => {
    ch.timer -= dt;
    if (ch.pecking) {
      ch.peckTimer -= dt;
      if (ch.peckTimer <= 0) ch.pecking = false;
      return;
    }
    if (ch.timer <= 0) {
      // Decide: peck or wander
      if (random() < 0.3) {
        ch.pecking = true;
        ch.peckTimer = random(30, 60);
        ch.vx = 0; ch.vy = 0;
      } else {
        // Wander within farm area
        let tx = farmCX + random(-80, 80);
        let ty = farmCY + random(-50, 50);
        let dx = tx - ch.x, dy = ty - ch.y;
        let d = sqrt(dx * dx + dy * dy);
        if (d > 1) {
          ch.vx = (dx / d) * 0.5;
          ch.vy = (dy / d) * 0.3;
          ch.facing = ch.vx > 0 ? 1 : -1;
        }
      }
      ch.timer = random(60, 180);
    }
    ch.x += ch.vx * dt;
    ch.y += ch.vy * dt;
    // Keep near farm
    if (abs(ch.x - farmCX) > 100) ch.vx *= -1;
    if (abs(ch.y - farmCY) > 60) ch.vy *= -1;
  });
}

function drawOneChicken(ch) {
  let sx = w2sX(ch.x), sy = w2sY(ch.y);
  let peck = ch.pecking ? floor(sin(frameCount * 0.3) * 2) * 2 : 0;
  push();
  translate(floor(sx), floor(sy));
  scale(ch.facing, 1);

  noStroke();
  // Shadow
  fill(0, 0, 0, 30);
  rect(-5, 4, 10, 2);
  // Body
  fill(ch.color[0], ch.color[1], ch.color[2]);
  rect(-5, -3, 10, 7);
  // Tail feathers
  fill(ch.color[0] - 30, ch.color[1] - 20, ch.color[2] - 10);
  rect(-8, -3, 3, 2);
  rect(-9, -4, 2, 1);
  // Wing
  fill(ch.color[0] - 15, ch.color[1] - 10, ch.color[2]);
  rect(-1, -2, 5, 4);
  // Head
  fill(ch.color[0] + 10, ch.color[1] + 10, ch.color[2] + 10);
  rect(3, -6 + peck, 4, 4);
  // Beak
  fill(220, 180, 60);
  rect(7, -5 + peck, 3, 2);
  // Eye
  fill(20);
  rect(5, -5 + peck, 1, 1);
  // Comb
  fill(200, 40, 30);
  rect(4, -8 + peck, 2, 2);
  rect(3, -7 + peck, 2, 1);
  // Feet
  fill(200, 160, 50);
  rect(2, 4, 1, 3);
  rect(0, 7, 1, 1);
  rect(3, 7, 1, 1);
  rect(-1, 4, 1, 3);
  rect(-3, 7, 1, 1);
  rect(0, 7, 1, 1);

  pop();
}

// ─── FOUNTAIN ────────────────────────────────────────────────────────
function drawFountain() {
  let fx = w2sX(WORLD.islandCX + 50);
  let fy = w2sY(WORLD.islandCY + 35);
  push();
  translate(fx, fy);
  noStroke();

  // Outer pool rim — pixel stone
  fill(140, 135, 120);
  rect(-18, -4, 36, 12);
  fill(165, 158, 145);
  rect(-17, -3, 34, 10);
  // Pool inner
  fill(120, 115, 105);
  rect(-15, -2, 30, 8);
  // Water surface
  fill(35, 75, 120, 160);
  rect(-13, -1, 26, 6);
  // Water shimmer — pixel ripple rects
  let shimmer = sin(frameCount * 0.05) * 0.3 + 0.7;
  fill(100, 170, 220, 50 * shimmer);
  let ripX = floor(sin(frameCount * 0.02) * 3);
  rect(ripX - 3, 1, 6, 1);
  // Bright highlight
  fill(120, 180, 220, 40 * shimmer);
  rect(1, 0, 4, 1);

  // Central fluted column
  fill(180, 175, 165);
  rect(-3, -22, 6, 22);
  // Fluting
  fill(160, 155, 145, 120);
  rect(-2, -22, 1, 22);
  rect(1, -22, 1, 22);
  // Column base
  fill(170, 165, 155);
  rect(-5, -2, 10, 3);

  // Upper basin — pixel trapezoid
  fill(170, 165, 155);
  rect(-9, -20, 18, 4);
  rect(-7, -22, 14, 2);
  // Water in upper basin
  fill(45, 85, 135, 130);
  rect(-6, -20, 12, 2);
  // Basin rim
  fill(185, 178, 165);
  rect(-7, -22, 14, 1);

  // Finial on top
  fill(175, 168, 155);
  rect(-2, -25, 4, 3);
  rect(-1, -27, 2, 2);

  // Water drops falling — pixel rects
  let t = frameCount * 0.06;
  for (let a = 0; a < 4; a++) {
    let dropX = floor(sin(t + a * 1.6) * 10);
    let dropY = floor(-18 + ((t * 3 + a * 7) % 18));
    let dropAlpha = 180 - (dropY + 18) * 7;
    fill(100, 170, 230, max(0, dropAlpha));
    rect(dropX, dropY, 1, 2);
  }

  // Splash mist — pixel rects
  for (let s = 0; s < 3; s++) {
    let mx = floor(sin(frameCount * 0.04 + s * 2.1) * 8);
    fill(140, 200, 240, 30 + floor(sin(frameCount * 0.08 + s) * 15));
    rect(mx, 1, 2, 1);
  }

  pop();
}

// ─── CRYSTAL SHRINE ──────────────────────────────────────────────────
function drawCrystalShrine() {
  let sh = state.crystalShrine;
  let sx = w2sX(sh.x);
  let sy = w2sY(sh.y);
  let pulse = sin(frameCount * 0.03) * 0.3 + 0.7;
  let fac = state.faction || 'rome';

  push();
  translate(sx, sy);
  noStroke();

  // Ground shadow
  fill(0, 0, 0, 35);
  rect(-38, 8, 76, 12);

  if (fac === 'rome') {
    // ─── ROME: Classical Roman Temple ───
    // Marble stepped platform
    fill(200, 195, 185);
    rect(-36, 4, 72, 10);
    fill(210, 205, 195);
    rect(-32, 1, 64, 8);
    fill(220, 215, 205);
    rect(-28, -1, 56, 6);

    // Four fluted marble columns
    let cols = [{x:-24,y:-1,h:30},{x:-10,y:-1,h:30},{x:10,y:-1,h:30},{x:24,y:-1,h:30}];
    cols.forEach(c => {
      // Column base
      fill(195, 190, 180);
      rect(c.x - 4, c.y, 8, 3);
      // Column shaft — marble white
      fill(230, 225, 218);
      rect(c.x - 3, c.y - c.h, 6, c.h);
      // Fluting lines
      fill(210, 205, 198, 80);
      rect(c.x - 1, c.y - c.h, 1, c.h);
      rect(c.x + 2, c.y - c.h, 1, c.h);
      // Capital — Corinthian style
      fill(215, 210, 200);
      rect(c.x - 5, c.y - c.h - 3, 10, 3);
      fill(225, 220, 210);
      rect(c.x - 4, c.y - c.h - 4, 8, 2);
    });

    // Architrave — horizontal beam
    fill(215, 210, 200);
    rect(-30, -34, 60, 4);
    // Triangular pediment
    fill(225, 220, 210);
    for (let i = 0; i < 10; i++) {
      rect(-25 + i * 2.5, -38 - i * 1, 50 - i * 5, 1);
    }
    // Pediment face
    fill(235, 230, 222);
    rect(-22, -38, 44, 4);
    // SPQR inscription
    fill(175, 28, 28);
    textSize(6); textAlign(CENTER, CENTER);
    text('SPQR', 0, -36);
    textAlign(LEFT, TOP);

    // Red tile roof behind pediment
    fill(185, 100, 58);
    rect(-28, -42, 56, 5);
    fill(175, 90, 50);
    rect(-26, -43, 52, 2);
    // Roof tile lines
    fill(170, 85, 48, 80);
    for (let t = -24; t < 24; t += 6) rect(t, -42, 2, 5);

    // Eternal flame on altar
    fill(160, 155, 145);
    rect(-6, -4, 12, 6);
    fill(175, 168, 158);
    rect(-5, -6, 10, 3);
    // Flame
    let fFlicker = floor(sin(frameCount * 0.1) * 2);
    fill(255, 160, 30, 220);
    rect(-2 + fFlicker, -14, 4, 8);
    fill(255, 200, 50, 180);
    rect(-1 + fFlicker, -16, 2, 4);
    fill(255, 240, 100, 140);
    rect(0, -18 + fFlicker, 1, 2);
    // Flame glow
    fill(255, 180, 50, 15 * pulse);
    ellipse(0, -10, 20, 24);

  } else if (fac === 'carthage') {
    // ─── CARTHAGE: Tophet Sanctuary ───
    // Sandstone platform
    fill(195, 155, 95);
    rect(-34, 2, 68, 12);
    fill(205, 165, 105);
    rect(-30, 0, 60, 8);

    // Sandstone walls — thick mudbrick
    fill(212, 170, 100);
    rect(-28, -30, 10, 34);
    rect(18, -30, 10, 34);
    // Wall texture — mudbrick lines
    fill(195, 155, 90, 60);
    for (let row = -28; row < 4; row += 4) {
      rect(-27, row, 8, 1);
      rect(19, row, 8, 1);
    }

    // Tanit symbol carved in left wall
    fill(160, 120, 70);
    // Triangle body
    rect(-25, -18, 1, 6); rect(-24, -16, 1, 4); rect(-23, -14, 1, 2);
    rect(-21, -14, 1, 2); rect(-20, -16, 1, 4); rect(-19, -18, 1, 6);
    // Horizontal arms
    rect(-26, -20, 8, 1);
    // Circle head
    rect(-24, -23, 4, 3); rect(-23, -24, 2, 1);

    // Arched doorway
    fill(50, 35, 22);
    rect(-8, -20, 16, 24);
    // Pointed arch top
    fill(50, 35, 22);
    rect(-6, -24, 12, 4);
    rect(-4, -26, 8, 2);
    rect(-2, -27, 4, 1);
    // Arch trim
    fill(220, 180, 110);
    rect(-9, -20, 1, 24); rect(8, -20, 1, 24);
    rect(-7, -24, 1, 4); rect(6, -24, 1, 4);

    // Flat roof with crenellations
    fill(200, 160, 95);
    rect(-30, -32, 60, 3);
    for (let cr = -28; cr < 28; cr += 8) {
      rect(cr, -35, 4, 3);
    }

    // Crescent moon symbol on top center
    fill(220, 195, 80);
    rect(-4, -42, 8, 8);
    fill(200, 160, 95); // cut inner circle for crescent
    rect(-2, -42, 6, 7);
    fill(220, 195, 80);
    rect(-1, -40, 1, 3); // crescent tip detail

    // Incense braziers — left and right
    for (let bx of [-16, 16]) {
      fill(140, 100, 45);
      rect(bx - 3, -4, 6, 6);
      fill(160, 120, 55);
      rect(bx - 2, -5, 4, 2);
      // Smoke wisps
      let sw = floor(sin(frameCount * 0.04 + bx) * 2);
      fill(180, 170, 160, 60);
      rect(bx - 1 + sw, -10, 2, 5);
      fill(180, 170, 160, 30);
      rect(bx + sw, -16, 1, 5);
    }

  } else if (fac === 'egypt') {
    // ─── EGYPT: Solar Temple ───
    // Golden sandstone platform
    fill(210, 185, 110);
    rect(-34, 2, 68, 12);
    fill(225, 198, 120);
    rect(-30, 0, 60, 8);

    // Golden sandstone walls
    fill(232, 200, 114);
    rect(-26, -28, 12, 32);
    rect(14, -28, 12, 32);
    // Smooth wall texture
    fill(220, 188, 105, 50);
    rect(-25, -26, 10, 28);
    rect(15, -26, 10, 28);

    // Lotus columns flanking door
    for (let lx of [-14, 14]) {
      // Column shaft
      fill(245, 240, 224);
      rect(lx - 2, -26, 4, 30);
      // Lotus capital — petals
      fill(64, 176, 160);
      rect(lx - 4, -30, 8, 4);
      fill(80, 190, 170);
      rect(lx - 3, -31, 6, 2);
      // Lotus tip
      fill(64, 176, 160);
      rect(lx - 1, -32, 2, 2);
    }

    // Rectangular doorway
    fill(58, 58, 74);
    rect(-8, -20, 16, 24);
    // Door frame — gold trim
    fill(200, 170, 40);
    rect(-9, -22, 1, 26); rect(8, -22, 1, 26);
    rect(-9, -22, 18, 1);

    // Eye of Horus above door
    fill(64, 176, 160);
    // Main eye shape
    rect(-5, -26, 10, 3);
    fill(58, 58, 74);
    rect(-2, -26, 4, 2); // pupil
    fill(64, 176, 160);
    // Horus tail (curved line extending right)
    rect(5, -25, 3, 1); rect(7, -24, 2, 1); rect(8, -23, 1, 1);
    // Tear drop below
    rect(-1, -23, 2, 2); rect(0, -21, 1, 1);

    // Pyramid-shaped roof
    fill(200, 170, 40);
    for (let i = 0; i < 12; i++) {
      rect(-28 + i * 2, -30 - i * 1.5, 56 - i * 4, 2);
    }
    // Pyramid cap — gold
    fill(230, 200, 60);
    rect(-4, -48, 8, 3);
    fill(245, 220, 80, 120 * pulse);
    rect(-2, -49, 4, 2);

    // Obelisks flanking entrance
    for (let ox of [-34, 34]) {
      fill(210, 185, 110);
      rect(ox - 2, -20, 4, 24);
      fill(225, 198, 120);
      rect(ox - 1, -24, 2, 4);
      // Pyramidion top
      fill(200, 170, 40);
      rect(ox - 1, -26, 2, 2);
      rect(ox, -27, 1, 1);
      // Hieroglyph marks
      fill(64, 176, 160, 120);
      rect(ox - 1, -14, 2, 1);
      rect(ox - 1, -8, 2, 1);
      rect(ox - 1, -2, 2, 1);
    }

    // Turquoise and gold sun disk on top
    fill(64, 176, 160, 100 * pulse);
    ellipse(0, -46, 10, 10);
    fill(230, 200, 60, 160 * pulse);
    ellipse(0, -46, 6, 6);

  } else if (fac === 'greece') {
    // ─── GREECE: Parthenon-style Temple ───
    // White marble stepped platform
    fill(220, 220, 230);
    rect(-36, 4, 72, 10);
    fill(230, 230, 238);
    rect(-32, 1, 64, 8);
    fill(238, 238, 245);
    rect(-28, -1, 56, 6);

    // Six Ionic columns with scroll capitals
    let cols = [{x:-24},{x:-14},{x:-4},{x:4},{x:14},{x:24}];
    cols.forEach(c => {
      // Column base — attic base
      fill(220, 220, 228);
      rect(c.x - 4, -1, 8, 3);
      // Column shaft — white marble, slender
      fill(240, 240, 248);
      rect(c.x - 2, -28, 4, 28);
      // Fluting
      fill(225, 225, 235, 80);
      rect(c.x, -28, 1, 28);
      // Ionic scroll capital
      fill(235, 235, 242);
      rect(c.x - 5, -31, 10, 3);
      // Scroll volutes — small curls
      fill(220, 220, 230);
      rect(c.x - 5, -33, 3, 3);
      rect(c.x + 2, -33, 3, 3);
      fill(240, 240, 248);
      rect(c.x - 4, -32, 1, 1);
      rect(c.x + 3, -32, 1, 1);
    });

    // Architrave and frieze
    fill(235, 235, 242);
    rect(-30, -34, 60, 3);
    // Blue trim frieze
    fill(80, 144, 192);
    rect(-28, -37, 56, 3);
    // Meander pattern in frieze
    fill(240, 240, 248);
    for (let m = -26; m < 26; m += 6) {
      rect(m, -36, 2, 1);
      rect(m + 2, -37, 2, 1);
    }

    // Triangular pediment
    fill(238, 238, 245);
    for (let i = 0; i < 10; i++) {
      rect(-25 + i * 2.5, -40 - i * 1, 50 - i * 5, 1);
    }
    // Pediment face
    fill(245, 245, 250);
    rect(-22, -40, 44, 3);

    // Owl relief in pediment center
    fill(200, 200, 210);
    // Owl body
    rect(-3, -44, 6, 4);
    // Owl head
    rect(-2, -46, 4, 2);
    // Owl eyes
    fill(80, 144, 192);
    rect(-1, -46, 1, 1);
    rect(1, -46, 1, 1);
    // Owl wings
    fill(200, 200, 210);
    rect(-5, -43, 2, 3);
    rect(4, -43, 2, 3);

    // Olive wreath above door
    fill(90, 140, 50);
    rect(-5, -30, 2, 1); rect(-3, -31, 2, 1); rect(-1, -31, 2, 1);
    rect(1, -31, 2, 1); rect(3, -30, 2, 1);
    fill(75, 120, 40);
    rect(-4, -31, 1, 1); rect(3, -31, 1, 1);

    // Roof — terracotta with blue trim
    fill(208, 112, 64);
    rect(-28, -48, 56, 5);
    fill(80, 144, 192);
    rect(-28, -48, 56, 1);

    // Doorway
    fill(90, 65, 40);
    rect(-6, -18, 12, 22);
    // Arched top
    fill(90, 65, 40);
    rect(-4, -20, 8, 2);
    // Door frame — blue trim
    fill(80, 144, 192);
    rect(-7, -20, 1, 24); rect(6, -20, 1, 24);
  }

  // Crystal on altar (all factions keep the sacred crystal)
  fill(0, 255, 136, 20 * pulse);
  rect(-1, -18, 2, 14);
  fill(0, 180, 100, 200);
  rect(-2, -16, 4, 4);
  rect(-3, -12, 6, 4);
  fill(0, 220, 120, 180);
  rect(-1, -15, 2, 5);
  fill(0, 255, 180, 150 * pulse);
  rect(0, -14, 1, 4);

  // Floating energy particles
  for (let p = 0; p < 5; p++) {
    let angle = frameCount * 0.015 + p * TWO_PI / 5;
    let radius = 25 + floor(sin(frameCount * 0.04 + p * 1.5) * 6);
    let py = floor(-14 + cos(frameCount * 0.02 + p) * 8);
    let px = floor(cos(angle) * radius);
    fill(0, 255, 136, 80 * pulse);
    rect(px - 1, py - 1, 2, 2);
  }

  pop();
}

// Farming system — see farming.js

// ─── TEMPLE BLESSINGS ──────────────────────────────────────────────
function prayAtTemple() {
  if (state.blessing.cooldown > 0) {
    addFloatingText(width / 2, height * 0.35, 'The gods rest. Return tomorrow.', C.textDim);
    return;
  }
  let blessings = [
    { type: 'crops', desc: 'Ceres blesses your harvest! 2x crop speed', duration: 1440 },
    { type: 'solar', desc: 'Apollo fills your solar! 2x solar regen', duration: 1440 },
    { type: 'speed', desc: 'Mercury quickens all! Companions 2x speed', duration: 1440 },
    { type: 'storm', desc: 'Neptune shields you! Storm immunity', duration: 1440 },
    { type: 'luck', desc: 'Fortuna smiles! Double all pickups', duration: 1440 },
  ];
  let b = blessings[floor(random(blessings.length))];
  state.blessing = { type: b.type, timer: b.duration, cooldown: 2880 };
  unlockJournal('temple_prayer');
  addFloatingText(width / 2, height * 0.3, b.desc, C.solarBright);
  spawnDivineBlessing(state.pyramid.x, state.pyramid.y - 30);
  // Storm prayer for Chapter 5 quest
  if (typeof state.narrativeFlags !== 'undefined' && stormActive && state.mainQuest && state.mainQuest.chapter === 4) {
    state.narrativeFlags['storm_prayer'] = true;
    addFloatingText(width / 2, height * 0.22, 'The crystals respond to your prayer!', '#aaddff');
  }
  // Dawn prayer for Vesta quest (5:30-6:30 = 330-390 minutes)
  if (typeof state.narrativeFlags !== 'undefined' && state.npcQuests && state.npcQuests.vesta && state.npcQuests.vesta.active === 'vesta_q3') {
    if (state.time >= 330 && state.time <= 390) {
      state.narrativeFlags['dawn_prayer'] = true;
      addFloatingText(width / 2, height * 0.22, 'Sol Invictus speaks at dawn...', '#ffd700');
      // oracle_riddle fires separately when player prays again later in the day (6:30-8:30)
      if (!state._oracleRiddleWindow) state._oracleRiddleWindow = true;
    }
    // oracle_riddle fires when praying during the riddle window (after dawn_prayer, 6:30-8:30)
    if (state.narrativeFlags['dawn_prayer'] && !state.narrativeFlags['oracle_riddle'] &&
        state.time >= 390 && state.time <= 510) {
      state.narrativeFlags['oracle_riddle'] = true;
      addFloatingText(width / 2, height * 0.22, 'You answer the riddle. Sol is satisfied.', '#ffd700');
      state._oracleRiddleWindow = false;
    }
  }
}

function updateBlessing(dt) {
  if (state.blessing.timer > 0) state.blessing.timer -= 0.18 * dt;
  if (state.blessing.timer <= 0) state.blessing.type = null;
  if (state.blessing.cooldown > 0) state.blessing.cooldown -= 0.18 * dt;
}

// ─── NPC QUESTS ────────────────────────────────────────────────────
function generateQuest() {
  // Scale quest rewards with island level — earlier levels get base, later levels get more
  let lvl = state.islandLevel || 1;
  let goldMult = 1 + floor(lvl / 5) * 0.5; // +50% gold every 5 levels
  let quests = [
    { type: 'harvest', desc: 'Harvest 5 crops', target: 5, reward: { gold: floor(15 * goldMult), seeds: 5 } },
    { type: 'fish', desc: 'Catch 3 fish', target: 3, reward: { gold: floor(12 * goldMult), crystals: 2 } },
    { type: 'chop', desc: 'Chop 4 trees', target: 4, reward: { gold: floor(10 * goldMult), stone: 5 } },
    { type: 'stone', desc: 'Gather 8 stone', target: 8, reward: { gold: floor(18 * goldMult), seeds: 3 } },
    { type: 'build', desc: 'Place 3 buildings', target: 3, reward: { gold: floor(22 * goldMult), crystals: 3 } },
    { type: 'crystal', desc: 'Collect 4 crystals', target: 4, reward: { gold: floor(28 * goldMult) } },
  ];
  let q = quests[floor(random(quests.length))];
  return { type: q.type, desc: q.desc, target: q.target, progress: 0, reward: q.reward };
}

function checkQuestProgress(type, amount) {
  if (!state.quest || state.quest.type !== type) return;
  state.quest.progress += amount;
  if (state.quest.progress >= state.quest.target) {
    // Quest complete!
    let r = state.quest.reward;
    if (r.gold) { state.gold += r.gold; if (typeof trackStat === 'function') trackStat('totalGoldEarned', r.gold); }
    if (r.seeds) state.seeds += r.seeds;
    if (r.crystals) state.crystals += r.crystals;
    if (r.stone) state.stone += r.stone;
    let rewardText = Object.entries(r).map(([k, v]) => '+' + v + ' ' + k).join(', ');
    addFloatingText(width / 2, height * 0.3, 'QUEST COMPLETE! ' + rewardText, C.solarBright);
    addNotification('Quest complete! ' + rewardText, '#ffcc44');
    showAchievement('Quest Completed'); if (typeof trackStat === 'function') trackStat('questsCompleted', 1);
    spawnParticles(state.npc.x, state.npc.y, 'build', 10);
    state.npc.hearts = min(10, state.npc.hearts + 1);
    state.quest = null;
  }
}

// ─── CATS ──────────────────────────────────────────────────────────
function updateCats(dt) {
  if (!state.cats) return;
  state.cats.forEach(cat => {
    cat.timer -= dt;
    cat.giftTimer -= dt;

    if (cat.state === 'sitting') {
      if (cat.timer <= 0) {
        cat.state = 'idle';
        cat.timer = random(60, 180);
      }
    } else if (cat.state === 'idle') {
      if (cat.timer <= 0) {
        if (random() < 0.3) {
          cat.state = 'sitting';
          cat.timer = random(120, 300);
          cat.vx = 0; cat.vy = 0;
        } else {
          // Wander
          cat.vx = random(-0.6, 0.6);
          cat.vy = random(-0.3, 0.3);
          cat.facing = cat.vx > 0 ? 1 : -1;
          cat.state = 'walking';
          cat.timer = random(40, 100);
        }
      }
    } else if (cat.state === 'walking') {
      cat.x += cat.vx * dt;
      cat.y += cat.vy * dt;
      if (cat.timer <= 0) {
        cat.state = 'idle';
        cat.timer = random(60, 180);
        cat.vx = 0; cat.vy = 0;
      }
      // Keep on island
      if (!isOnIsland(cat.x, cat.y)) {
        cat.vx *= -1; cat.vy *= -1;
        cat.x += cat.vx * 5; cat.y += cat.vy * 5;
      }
    }

    // Gift: occasionally bring crystal shard to player
    if (cat.giftTimer <= 0 && random() < 0.0003) {
      let pd = dist2(cat.x, cat.y, state.player.x, state.player.y);
      if (pd < 100) {
        state.crystals += 1;
        addFloatingText(w2sX(cat.x), w2sY(cat.y) - 15, '+1 Crystal (gift!)', C.crystalGlow);
        spawnParticles(cat.x, cat.y, 'collect', 4);
        cat.giftTimer = 3000;
      }
    }
  });
}

function drawOneCat(cat) {
  let sx = w2sX(cat.x), sy = w2sY(cat.y);
  push();
  translate(floor(sx), floor(sy));
  scale(cat.facing, 1);
  noStroke();

  // Shadow
  fill(0, 0, 0, 25);
  rect(-6, 5, 12, 2);

  if (cat.state === 'sitting') {
    // Sitting cat — pixel body
    fill(cat.color[0], cat.color[1], cat.color[2]);
    rect(-4, -3, 8, 8);
    // Head
    fill(cat.color[0] + 10, cat.color[1] + 10, cat.color[2] + 10);
    rect(-3, -8, 6, 5);
    // Ears
    rect(-4, -10, 2, 2);
    rect(2, -10, 2, 2);
    // Inner ears
    fill(200, 140, 130);
    rect(-3, -9, 1, 1);
    rect(2, -9, 1, 1);
    // Tail curled — pixel
    fill(cat.color[0], cat.color[1], cat.color[2]);
    rect(4, -2, 4, 2);
    rect(7, -4, 2, 2);
    rect(5, -5, 2, 1);
  } else {
    // Walking/idle cat — pixel
    fill(cat.color[0], cat.color[1], cat.color[2]);
    rect(-6, -2, 12, 6);
    // Head
    fill(cat.color[0] + 10, cat.color[1] + 10, cat.color[2] + 10);
    rect(3, -6, 6, 5);
    // Ears
    rect(3, -8, 2, 2);
    rect(7, -8, 2, 2);
    // Inner ears
    fill(200, 140, 130);
    rect(4, -7, 1, 1);
    rect(7, -7, 1, 1);
    // Tail — pixel segments
    fill(cat.color[0], cat.color[1], cat.color[2]);
    let tailUp = floor(sin(frameCount * 0.08) * 2);
    rect(-8, -1, 2, 2);
    rect(-10, -3 + tailUp, 2, 2);
    rect(-10, -5 + tailUp, 2, 2);
    // Legs
    fill(cat.color[0] - 10, cat.color[1] - 10, cat.color[2] - 10);
    let walk = cat.state === 'walking' ? floor(sin(frameCount * 0.15) * 2) : 0;
    rect(-3, 4, 2, 3 + walk);
    rect(1, 4, 2, 3 - walk);
    rect(4, 4, 2, 3 + walk);
  }

  // Eyes — pixel
  let ex = cat.state === 'sitting' ? -2 : 5;
  let ey = cat.state === 'sitting' ? -7 : -4;
  fill(180, 200, 50);
  rect(ex, ey, 2, 2);
  rect(ex + 3, ey, 2, 2);
  fill(20);
  rect(ex + 1, ey + 1, 1, 1);
  rect(ex + 4, ey + 1, 1, 1);

  // Adopted cat label with companion level
  if (cat.adopted && cat.colorName) {
    fill(cat.color[0], cat.color[1], cat.color[2], 140);
    textSize(5); textAlign(CENTER, TOP);
    text(cat.colorName + getCompanionPetCatLabel(), 0, 8);
    textAlign(LEFT, TOP);
  }

  pop();
}

// Farming system — see farming.js
function getExpandCost(lvl) {
  // Levels 1-5: crystals only
  // Levels 6-10: crystals + stone
  // Levels 11-15: crystals + stone + iron
  // Levels 16-25: crystals capped at 200, add relics/bone for variety
  let crystalCost = [5, 10, 18, 28, 40, 55, 70, 90, 110, 135, 155, 170, 180, 190, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200][lvl - 1] || 200;
  let cost = { crystals: crystalCost };
  if (lvl >= 6) cost.stone = 10 + (lvl - 6) * 5;
  if (lvl >= 11) cost.ironOre = 3 + (lvl - 11) * 3;
  if (lvl >= 16) cost.ancientRelic = 1 + (lvl - 16) * 1;
  if (lvl >= 21) cost.titanBone = 1 + (lvl - 21) * 1;
  return cost;
}

function canAffordExpand() {
  let cost = getExpandCost(state.islandLevel);
  if (state.crystals < cost.crystals) return false;
  if (cost.stone && state.stone < cost.stone) return false;
  if (cost.ironOre && state.ironOre < cost.ironOre) return false;
  if (cost.ancientRelic && state.ancientRelic < cost.ancientRelic) return false;
  if (cost.titanBone && state.titanBone < cost.titanBone) return false;
  return true;
}

function getExpandCostString() {
  let cost = getExpandCost(state.islandLevel);
  let parts = [cost.crystals + ' crystals'];
  if (cost.stone) parts.push(cost.stone + ' stone');
  if (cost.ironOre) parts.push(cost.ironOre + ' iron');
  if (cost.ancientRelic) parts.push(cost.ancientRelic + ' relics');
  if (cost.titanBone) parts.push(cost.titanBone + ' bone');
  return parts.join(', ');
}

// [MOVED TO building.js] canPlaceBuilding+placeBuildingChecked

function _addProceduralPerimeter(lvl, cx, cy, rx, ry) {
  let angle0 = ((lvl - 6) / 20) * TWO_PI;

  // Resources (3 to 6 per level)
  let numRes = 3 + floor(lvl / 5);
  for (let i = 0; i < numRes; i++) {
    let a = angle0 + (i / numRes) * TWO_PI * 0.3 + random(-0.2, 0.2);
    let r = random(0.55, 0.85);
    let px = cx + cos(a) * state.islandRX * r * 0.9;
    let py = cy + sin(a) * state.islandRY * r * 0.9;
    addClampedResource(px, py, ['stone', 'vine', 'leaf'][i % 3], cx, cy);
  }

  // Crystal node every 3 levels
  if (lvl % 3 === 0) {
    let ca = angle0 + PI;
    let crx = cx + cos(ca) * state.islandRX * 0.85;
    let cry = cy + sin(ca) * state.islandRY * 0.65;
    // Push away from farm zone
    if (typeof isInFarmZone === 'function' && isInFarmZone(crx, cry)) {
      let f = getFarmBounds();
      crx = f.x - f.hw - 40;
    }
    let cSize = min(14 + floor(lvl / 5) * 2, 24);
    state.crystalNodes.push({
      x: crx, y: cry,
      size: cSize, phase: random(TWO_PI),
      charge: 50 + lvl * 5, respawnTimer: 0,
    });
  }

  // Trees (1 to 4 per level)
  let numTrees = 1 + floor(lvl / 6);
  for (let i = 0; i < numTrees; i++) {
    let ta = random(TWO_PI);
    let tr = random(0.4, 0.85);
    addClampedTree(
      cx + cos(ta) * state.islandRX * tr * 0.9,
      cy + sin(ta) * state.islandRY * tr * 0.9,
      cx, cy
    );
  }

  // Ruin on every 3rd level
  if (lvl % 3 === 0) {
    let ra = angle0 + HALF_PI;
    let rrx = cx + cos(ra) * state.islandRX * 0.6;
    let rry = cy + sin(ra) * state.islandRY * 0.5;
    state.ruins.push({
      x: rrx, y: rry,
      w: 28 + floor(lvl / 3) * 3,
      h: 18 + floor(lvl / 4) * 2,
      rot: random(-0.05, 0.05),
    });
  }
}

function placeEraBuildings(lvl) {
  let rx = getSurfaceRX();
  let ry = getSurfaceRY();
  let cx = WORLD.islandCX;
  let cy = WORLD.islandCY;
  // Farm is always in the far left zone (relative to current island center)
  let farmCX = cx - 340, farmCY = cy - 5;

  // Place all CITY_SLOTS for this level
  // Offset positions for bot islands (CITY_SLOTS are authored for home island at 600,400)
  let offsetX = WORLD.islandCX - 600;
  let offsetY = WORLD.islandCY - 400;
  CITY_SLOTS.forEach(slot => {
    if (slot.level !== lvl) return;
    let bld = { x: slot.x + offsetX, y: slot.y + offsetY, w: slot.w, h: slot.h, type: slot.type, rot: 0 };
    // Force-place decorative ground tiles (floors, mosaics) and castrum compound
    // parts that intentionally overlap parent structures
    let forcePlace = slot.type === 'floor' || slot.type === 'mosaic' || slot.type === 'castrum'
      || (slot.id && (slot.id.startsWith('wall_cast') || slot.id.startsWith('torch_cast') || slot.id === 'watchtower_cast'));
    if (forcePlace) {
      state.buildings.push(bld);
    } else {
      placeBuildingChecked(bld);
    }
  });

  // Helper: resource placement (clamped to island surface)
  function res(x, y, type) {
    addClampedResource(x, y, type, cx, cy);
  }

  // Helper: tree placement (clamped)
  function tree(x, y) {
    addClampedTree(x, y, cx, cy);
  }

  // Helper: crystal node
  function crystal(dx, dy, size, charge) {
    let sh = state.crystalShrine;
    state.crystalNodes.push({
      x: sh.x + dx, y: sh.y + dy,
      size: size, phase: random(TWO_PI),
      charge: charge, respawnTimer: 0,
    });
  }

  // Helper: ruin
  function ruin(x, y, w, h) {
    state.ruins.push({ x: x, y: y, w: w, h: h, rot: random(-0.05, 0.05) });
  }

  // ─────────────────────────────────────────────────────────────────
  // Per-level extras: resources, trees, crystals, ruins, farm, effects
  // (buildings handled by CITY_SLOTS above)
  // ─────────────────────────────────────────────────────────────────

  if (lvl === 2) {
    res(cx - 120, cy + 70, 'stone');
    res(cx - 60,  cy + 75, 'stone');
    res(cx + 30,  cy + 70, 'vine');
    res(cx + 100, cy + 65, 'leaf');
    crystal(50, 30, 14, 50);
    tree(cx + 180, cy + 40);
    tree(cx + 230, cy + 30);
    tree(cx + 300, cy - 10);
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.3, 'Farm fenced — the homestead grows!', '#88cc66');
    spawnParticles(220, 380, 'build', 8);
  }

  if (lvl === 3) {
    res(cx + 200, cy - 70, 'vine');
    res(cx + 250, cy - 45, 'stone');
    res(cx + 160, cy - 80, 'vine');
    res(cx + 300, cy - 30, 'leaf');
    crystal(-50, 30, 14, 50);
    tree(cx + 280, cy - 55);
    tree(cx + 320, cy - 25);
    tree(cx + 150, cy - 60);
    ruin(cx + 260, cy - 70, 30, 20);
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.3, 'Shrine consecrated — farm expands!', '#ffaaff');
    spawnParticles(760, 298, 'build', 10);
  }

  if (lvl === 4) {
    res(cx - 250, cy - 50, 'vine');
    res(cx - 300, cy - 20, 'leaf');
    res(cx - 200, cy - 70, 'stone');
    res(cx - 340, cy + 10, 'leaf');
    crystal(0, -45, 16, 60);
    tree(cx + 250, cy - 40);
    tree(cx + 200, cy + 50);
    tree(cx + 340, cy + 15);
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.3, 'Well dug — farm entrance fenced!', '#66aaff');
    spawnParticles(660, 440, 'build', 8);
  }

  if (lvl === 5) {
    res(cx - 350, cy + 30, 'stone');
    res(cx + 350, cy + 30, 'stone');
    res(cx - 150, cy + 90, 'vine');
    res(cx + 150, cy + 90, 'leaf');
    res(cx,       cy + 85, 'stone');
    crystal(-60, -10, 18, 80);
    crystal( 60, -10, 18, 80);
    tree(cx + 360, cy);
    tree(cx + 300, cy + 50);
    tree(cx + 180, cy - 70);
    tree(cx + 240, cy + 60);
    tree(cx + 350, cy - 40);
    ruin(cx, cy + 80, 35, 22);
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.25, 'Granary & Well constructed — farm fully expanded!', '#88cc66');
    spawnParticles(375, 340, 'build', 12);
  }

  if (lvl === 6) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.3, 'Citizens settle — Domus and Windmill built!', '#aaddff');
    spawnParticles(465, 330, 'build', 10);
    spawnParticles(310, 420, 'build', 8);
  }

  if (lvl === 7) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.3, 'Market opens for trade!', '#ffcc66');
    spawnParticles(810, 375, 'build', 10);
  }

  if (lvl === 8) {
    // South road from port toward center (5 tiles)
    let _port = getPortPosition();
    for (let i = 0; i < 5; i++) {
      let t = (i + 1) / 6;
      placeBuildingChecked({ x: lerp(_port.x, cx, t), y: lerp(_port.y, cy + 10, t), w: 24, h: 20, type: 'floor', rot: 0 });
    }
    // Update legia state with absolute castrum coords
    if (state.legia) {
      state.legia.castrumLevel = 1;
      state.legia.castrumX = 920;
      state.legia.castrumY = 480;
    }
    unlockJournal('legia_founded');
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFarmPlots(farmCX, farmCY, lvl);
    addFloatingText(width / 2, height * 0.3, 'Baths & ' + getFactionTerms().barracks + ' — your settlement grows strong!', '#cc4444');
    spawnParticles(920, 480, 'build', 12);
  }

  if (lvl === 9) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.3, 'Aqueduct spans the island!', '#66ccff');
    spawnParticles(600, 218, 'build', 12);
  }

  if (lvl === 10) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.25, 'GOVERNOR — Temple & Market erected!', '#ffdd66');
    triggerScreenShake(6, 15);
    spawnParticles(820, 303, 'build', 15);
  }

  if (lvl === 11) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.3, 'Gardens and mosaics adorn the temple!', '#ffaaff');
    spawnParticles(820, 362, 'build', 10);
  }

  if (lvl === 12) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.3, 'Housing fills the Cardo — second well dug!', '#ffee88');
    spawnParticles(500, 340, 'build', 10);
  }

  if (lvl === 13) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.3, 'Watchtowers stand sentinel!', '#cc8844');
    spawnParticles(940, 392, 'build', 10);
  }

  if (lvl === 14) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.3, 'Bath complex rises, aqueduct extended!', '#66ccff');
    spawnParticles(740, 368, 'build', 10);
  }

  if (lvl === 15) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.25, 'SENATOR — Forum raised!', '#ff9944');
    triggerScreenShake(8, 20);
    spawnParticles(620, 450, 'build', 15);
  }

  if (lvl === 16) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.3, 'Housing district expands!', '#aaddff');
    spawnParticles(460, 360, 'build', 12);
  }

  if (lvl === 17) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.3, 'Great Library of Rome rises!', '#ddaaff');
    spawnParticles(760, 303, 'build', 14);
  }

  if (lvl === 18) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.3, 'Fortifications strengthened!', '#ff8844');
  }

  if (lvl === 19) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.3, 'Military barracks established!', '#ff6622');
    spawnParticles(830, 455, 'build', 16);
  }

  if (lvl === 20) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.25, 'CONSUL — Villa Estate built!', '#ffaa00');
    triggerScreenShake(12, 30);
    spawnParticles(460, 268, 'build', 20);
  }

  if (lvl === 21) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.3, 'Senate convenes — Forum Magnum!', '#ffaa44');
    spawnParticles(560, 450, 'build', 14);
  }

  if (lvl === 22) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.3, 'Harbor gate — the arch stands!', '#ddcc88');
    spawnParticles(980, 410, 'build', 12);
  }

  if (lvl === 23) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.3, 'Grand Aqueduct spans all of Mare Nostrum!', '#66ccff');
    spawnParticles(600, 210, 'build', 16);
  }

  if (lvl === 24) {
    _addProceduralPerimeter(lvl, cx, cy, rx, ry);
    addFloatingText(width / 2, height * 0.3, 'Imperial Palace rises — glory of Rome!', '#ffcc44');
    spawnParticles(600, 242, 'build', 18);
  }

  if (lvl === 25) {
    addFloatingText(width / 2, height * 0.25, 'IMPERATOR — Mare Nostrum is yours!', '#ff4400');
    triggerScreenShake(15, 40);
  }
}

function expandIsland() {
  let cost = getExpandCost(state.islandLevel);
  if (!canAffordExpand()) {
    addFloatingText(width / 2, height * 0.4, 'Need: ' + getExpandCostString(), C.buildInvalid);
    return;
  }
  if (state.islandLevel >= 25) {
    addFloatingText(width / 2, height * 0.4, 'IMPERIUM MAXIMUM!', C.textDim);
    return;
  }

  state.crystals -= cost.crystals;
  if (cost.stone) state.stone -= cost.stone;
  if (cost.ironOre) state.ironOre -= cost.ironOre;
  if (cost.ancientRelic) state.ancientRelic -= cost.ancientRelic;
  if (cost.titanBone) state.titanBone -= cost.titanBone;
  state.islandLevel++;
  triggerIslandMilestone(state.islandLevel);
  addNotification('Island expanded to Level ' + state.islandLevel, '#ffdd66');
  // Island grows less per level at higher tiers
  let rxGrowth = state.islandLevel <= 5 ? 35 : state.islandLevel <= 10 ? 28 : state.islandLevel <= 15 ? 22 : state.islandLevel <= 20 ? 16 : 12;
  let ryGrowth = state.islandLevel <= 5 ? 24 : state.islandLevel <= 10 ? 18 : state.islandLevel <= 15 ? 14 : state.islandLevel <= 20 ? 10 : 8;
  // Lerp island size over 120 frames instead of snapping
  state._expandVisualRX = state.islandRX;
  state._expandVisualRY = state.islandRY;
  state._expandTargetRX = state.islandRX + rxGrowth;
  state._expandTargetRY = state.islandRY + ryGrowth;
  state.islandRX += rxGrowth;
  state.islandRY += ryGrowth;
  state._expandFrames = 120;
  state.pyramid.level = state.islandLevel;
  updatePortPositions(); // ports follow island edge
  // Expansion ceremony effects
  if (snd) snd.playSFX('expand_rumble');
  // Expanding ring particle from island center
  particles.push({
    x: WORLD.islandCX, y: WORLD.islandCY, vx: 0, vy: 0,
    life: 90, maxLife: 90, type: 'golden_wave', size: 10,
    maxRing: 350, r: 220, g: 180, b: 80, world: true,
  });
  // Camera slow-zoom-out then ease back over 3 seconds
  state._expandCamZoom = 180;

  // Place all buildings, resources, trees, crystals, ruins for this level
  placeEraBuildings(state.islandLevel);

  // Milestone journal unlocks and special effects
  let rx = getSurfaceRX(), ry = getSurfaceRY();
  let cx = WORLD.islandCX, cy = WORLD.islandCY;
  if (state.islandLevel === 10) {
    unlockJournal('imperial_governor');
    // Island naming prompt at level 10
    if (!state.islandName) {
      state.islandNamingOpen = true;
      state.islandNamingInput = '';
    }
  }
  if (state.islandLevel === 15) {
    unlockJournal('imperial_senator');
  }
  if (state.islandLevel === 20) {
    unlockJournal('imperial_consul');
  }
  if (state.islandLevel === 25) {
    unlockJournal('imperator');
    // Gold particle burst from pyramid
    let _pyrX = state.pyramid.x, _pyrY = state.pyramid.y;
    for (let i = 0; i < 40; i++) {
      let _a = random(TWO_PI), _spd = random(2, 6);
      particles.push({
        x: _pyrX + random(-6, 6), y: _pyrY - 20 + random(-6, 6),
        vx: cos(_a) * _spd, vy: sin(_a) * _spd - 3,
        life: random(50, 100), maxLife: 100,
        type: 'harvest_burst', size: random(3, 7),
        r: 255, g: 200 + floor(random(-20, 20)), b: 40,
        gravity: 0.04, world: true,
      });
    }
    state.imperatorBanner = 300;
    checkImperatorVictory();
  }

  let farmCX = WORLD.islandCX - 340, farmCY = WORLD.islandCY - 5;
  let lvl = state.islandLevel;

  // Push existing trees away from temple (it grew)
  let texcl = getTempleExclusion();
  let pyrX = state.pyramid.x, pyrY = state.pyramid.y;
  state.trees.forEach(t => {
    let dx = t.x - pyrX, dy = t.y - pyrY;
    let d2 = dx * dx + dy * dy;
    if (d2 < texcl * texcl && d2 > 0) {
      let a = atan2(dy, dx);
      let pushDist = texcl + 20;
      t.x = pyrX + cos(a) * pushDist;
      t.y = pyrY + sin(a) * pushDist;
    }
  });
  // Push trees away from port zone
  let port = getPortPosition();
  state.trees.forEach(t => {
    let dx = t.x - port.x, dy = t.y - port.y;
    if (dx * dx + dy * dy < 70 * 70) {
      t.x = port.x - 75;
    }
  });

  // Remove trees within 50px of ANY building
  state.buildings.forEach(b => {
    state.trees = state.trees.filter(t => {
      let dx = t.x - b.x, dy = t.y - b.y;
      return dx * dx + dy * dy > 50 * 50;
    });
  });
  // Remove trees from center zone entirely (forum/plaza area)
  state.trees = state.trees.filter(t => {
    let dx = t.x - cx, dy = t.y - cy;
    let distFromCenter = dx * dx / (rx * 0.3 * rx * 0.3) + dy * dy / (ry * 0.3 * ry * 0.3);
    return distFromCenter > 1;
  });

  // Add grass tufts to new island area — more at higher levels
  let grx = getSurfaceRX(), gry = getSurfaceRY();
  let grassCount = 20 + lvl * 2;
  for (let i = 0; i < grassCount; i++) {
    let angle = random(TWO_PI);
    let rim = random(0.72, 0.92);
    let gx = cx + cos(angle) * grx * rim;
    let gy = cy + sin(angle) * gry * rim;
    if ((gx - cx) * (gx - cx) + (gy - cy) * (gy - cy) < 150 * 150) continue;
    let fdx = gx - farmCX, fdy = gy - farmCY;
    if (fdx * fdx / (110 * 110) + fdy * fdy / (50 * 50) < 1) continue;
    let tooClose = state.grassTufts.some(g2 => {
      let ddx = gx - g2.x, ddy = gy - g2.y;
      return ddx * ddx + ddy * ddy < 25 * 25;
    });
    if (tooClose) continue;
    state.grassTufts.push({
      x: gx, y: gy,
      blades: floor(random(4, 9)),
      height: random(12, 24),
      hue: random(0.7, 1.0),
      sway: random(TWO_PI),
    });
  }

  // Ambient citizens — spawn based on island level
  let targetCitizens = floor(state.islandLevel * 1.2);
  while (state.citizens.length < targetCitizens) {
    let ca = random(TWO_PI);
    let cr = random(0.2, 0.7);
    let ccx = cx + cos(ca) * getSurfaceRX() * cr;
    let ccy = cy + sin(ca) * getSurfaceRY() * cr;
    let variants = ['farmer', 'merchant', 'soldier', 'priest'];
    let weights = state.islandLevel <= 8 ? [4,2,1,1] : state.islandLevel <= 17 ? [2,3,2,1] : [1,2,3,2];
    let totalW = weights.reduce((a,b) => a+b, 0);
    let roll = floor(random(totalW));
    let vi = 0, acc = 0;
    for (let i = 0; i < weights.length; i++) { acc += weights[i]; if (roll < acc) { vi = i; break; } }
    state.citizens.push({
      x: ccx, y: ccy, vx: 0, vy: 0,
      variant: variants[vi],
      facing: random() > 0.5 ? 1 : -1,
      state: 'idle',
      timer: floor(random(60, 300)),
      speed: 0.4 + random(0.3),
      targetX: ccx, targetY: ccy,
    });
  }

  addFloatingText(width / 2, height * 0.35, '⚡ ISLAND EXPANDED LV.' + state.islandLevel, C.crystalGlow);
  spawnIslandLevelUp();
}

// ─── PER-ISLAND STATE SYSTEM ──────────────────────────────────────────────
// Each island (player + bots) gets its own state instance.
// The same game engine runs for all via state swapping.

let _realState = null;
let _swappedIsland = null;

const _islandFields = [
  'buildings','plots','citizens','trees','crystalNodes',
  'islandLevel','islandRX','islandRY',
  'wood','stone','gold','crystals','ironOre','harvest','fish','seeds',
  'meals','wine','oil'
];

function createIslandState(faction) {
  return {
    faction: faction,
    islandLevel: 1, islandRX: 500, islandRY: 320,
    buildings: [], plots: [], trees: [], crystalNodes: [], citizens: [],
    // Resources (same starting amounts as player)
    wood: 10, stone: 5, gold: 10, crystals: 5,
    ironOre: 0, harvest: 5, fish: 2,
    seeds: 3, grapeSeeds: 0, oliveSeeds: 0,
    meals: 0, wine: 0, oil: 0,
    // Military
    legia: { army: [], castrumLevel: 0, morale: 100, recruits: 0, maxRecruits: 10 },
    // Temple
    templeHP: 100, templeMaxHP: 100,
    // NPCs
    npc: { hearts: 0 }, marcus: { hearts: 0 }, vesta: { hearts: 0 }, felix: { hearts: 0 },
    npcNames: FACTIONS[faction] ? FACTIONS[faction].npcNames : null,
    // Workers
    quarrier: null, cutter: null, fisher: null,
    // Progression
    foodShortage: 0, day: 1,
    // Port
    portLeft: null, portRight: null,
  };
}

function createPrebuiltIsland(factionKey, cx, cy, targetLevel) {
  let is = createIslandState(factionKey);
  let offsetX = cx - 600;
  let offsetY = cy - 400;

  // Scale island to target level
  is.islandLevel = targetLevel;
  for (let lv = 1; lv <= targetLevel; lv++) {
    if (lv <= 5) { is.islandRX += 35; is.islandRY += 24; }
    else { is.islandRX += 28; is.islandRY += 18; }
  }

  // Place all CITY_SLOTS buildings up to target level
  is.buildings = [];
  CITY_SLOTS.forEach(function(slot) {
    if (slot.level <= targetLevel) {
      is.buildings.push({
        type: slot.type,
        x: slot.x + offsetX,
        y: slot.y + offsetY,
        w: slot.w, h: slot.h,
        hp: 100, built: true,
        isTemple: slot.type === 'temple',
        id: slot.id, rot: 0
      });
    }
  });
  // Every island MUST have a temple (even at low levels)
  if (!is.buildings.some(b => b.type === 'temple')) {
    is.buildings.push({ type: 'temple', x: cx, y: cy - (is.islandRY * 0.15), w: 70, h: 50, hp: 100, built: true, isTemple: true });
  }

  // Trees
  is.trees = [];
  for (let i = 0; i < 15; i++) {
    let a = Math.random() * Math.PI * 2, r = Math.random() * 0.4 + 0.2;
    is.trees.push({ x: cx + Math.cos(a) * is.islandRX * r * 0.7, y: cy + Math.sin(a) * is.islandRY * r * 0.3, type: 'oak', hp: 3 });
  }

  // Crystal nodes
  is.crystalNodes = [];
  for (let i = 0; i < 5; i++) {
    is.crystalNodes.push({ x: cx - is.islandRX * 0.7 + (Math.random() - 0.5) * 40, y: cy + (Math.random() - 0.5) * 30, charge: 50, size: 14 });
  }

  // Farm plots
  is.plots = [];
  for (let i = 0; i < 6; i++) {
    is.plots.push({ x: cx - is.islandRX * 0.4 + (i % 3) * 28, y: cy - is.islandRY * 0.05 + Math.floor(i / 3) * 28, crop: i < 3 ? 'grain' : null, stage: i < 3 ? 'growing' : 'empty', growTimer: i < 3 ? 150 : 0 });
  }

  // Citizens (1 per 3 buildings, max 10)
  is.citizens = [];
  let numCitizens = Math.min(10, Math.floor(is.buildings.length / 3));
  for (let i = 0; i < numCitizens; i++) {
    is.citizens.push({
      x: cx + (Math.random() - 0.5) * is.islandRX * 0.5,
      y: cy + (Math.random() - 0.5) * is.islandRY * 0.2,
      speed: 0.3 + Math.random() * 0.2,
      targetX: cx + (Math.random() - 0.5) * 100,
      targetY: cy + (Math.random() - 0.5) * 40,
      moveTimer: Math.floor(Math.random() * 120),
      skin: Math.floor(Math.random() * 5),
      variant: Math.floor(Math.random() * 4), // citizen type variant
      facing: Math.random() > 0.5 ? 1 : -1,
      state: 'walking',
      walkBobPhase: Math.random() * Math.PI * 2,
      tunicR: 100 + Math.floor(Math.random() * 80),
      tunicG: 80 + Math.floor(Math.random() * 60),
      tunicB: 60 + Math.floor(Math.random() * 40),
      activity: null, activityTimer: 0,
    });
  }

  is.workers = [
    { role: 'cutter', x: cx - 60, y: cy + 20, targetX: cx - 60, targetY: cy + 20, state: 'walking', timer: 0, speed: 0.5 },
    { role: 'quarrier', x: cx + 80, y: cy - 10, targetX: cx + 80, targetY: cy - 10, state: 'walking', timer: 0, speed: 0.4 },
    { role: 'priestess', x: cx - is.islandRX * 0.6, y: cy, targetX: cx - is.islandRX * 0.6, targetY: cy, state: 'walking', timer: 0, speed: 0.35 },
    { role: 'farmer', x: cx - is.islandRX * 0.3, y: cy, targetX: cx - is.islandRX * 0.3, targetY: cy, state: 'walking', timer: 0, speed: 0.4 },
  ];

  // Military
  is.legia = { army: [], castrumLevel: targetLevel >= 8 ? 1 : 0, morale: 100, recruits: 0, maxRecruits: 10 };
  if (targetLevel >= 8) {
    for (let i = 0; i < 4; i++) {
      is.legia.army.push({ type: 'legionary', hp: 20, maxHp: 20, damage: 5, speed: 1.2, garrison: false });
    }
  }

  // 4 Named NPCs (at faction-specific positions)
  is.npcs = [
    { name: 'npc1', x: cx - 80, y: cy - 20, role: 'livia', hearts: 2, facing: 'right', moving: false, targetX: cx - 60, targetY: cy - 10, moveTimer: 60 },
    { name: 'npc2', x: cx + 100, y: cy + 10, role: 'marcus', hearts: 1, facing: 'left', moving: false, targetX: cx + 80, targetY: cy, moveTimer: 90 },
    { name: 'npc3', x: cx - 30, y: cy - 50, role: 'vesta', hearts: 1, facing: 'down', moving: false, targetX: cx - 20, targetY: cy - 40, moveTimer: 120 },
    { name: 'npc4', x: cx + 50, y: cy + 30, role: 'felix', hearts: 0, facing: 'right', moving: false, targetX: cx + 60, targetY: cy + 20, moveTimer: 70 },
  ];

  is.critter = {
    type: factionKey === 'egypt' ? 'cat' : factionKey === 'gaul' ? 'boar' : factionKey === 'greece' ? 'owl' : 'wolf',
    x: cx, y: cy, targetX: cx, targetY: cy
  };

  is.templeHP = 100;
  is.gold = 50 + targetLevel * 20;
  is.wood = 30; is.stone = 20; is.crystals = 15;
  is.harvest = 20; is.fish = 10;

  return is;
}

// ─── BOT WEB WORKER ───────────────────────────────────────────────────────
function initBotWorker() {
  if (typeof Worker === 'undefined') return;
  try {
    _botWorker = new Worker('bot_worker.js');
    _botWorker.onmessage = function(e) {
      if (e.data.type === 'ready') {
        _botWorkerReady = true;
      }
      if (e.data.type === 'result') {
        _botWorkerResults = e.data.bots;
        if (e.data.mutations) {
          for (let m of e.data.mutations) applyBotMutation(m);
        }
      }
    };
    _botWorker.onerror = function(err) {
      console.warn('Bot worker error, falling back to main thread:', err.message);
      _botWorker = null;
      _botWorkerReady = false;
    };
    // Send init with nation positions
    let initData = {};
    for (let k of Object.keys(state.nations || {})) {
      let n = state.nations[k];
      if (n.isBot) initData[k] = { isleX: n.isleX, isleY: n.isleY };
    }
    _botWorker.postMessage({ type: 'init', nations: initData });
  } catch(e) {
    console.warn('Failed to create bot worker:', e);
    _botWorker = null;
  }
}

function applyBotMutation(m) {
  let nation = state.nations[m.nation];
  if (!nation || !nation.islandState) return;
  let is = nation.islandState;
  switch (m.type) {
    case 'chop':
      is.wood = (is.wood || 0) + (m.woodGain || 3);
      if (is.trees && m.target) {
        let i = is.trees.findIndex(function(t) { return Math.abs(t.x - m.target.x) < 20 && Math.abs(t.y - m.target.y) < 20; });
        if (i >= 0) is.trees.splice(i, 1);
      }
      break;
    case 'mine_crystal':
      is.crystals = (is.crystals || 0) + (m.crystalGain || 3);
      if (is.crystalNodes && m.target) {
        let n = is.crystalNodes.find(function(nd) { return Math.abs(nd.x - m.target.x) < 20 && Math.abs(nd.y - m.target.y) < 20 && (nd.charge || 0) > 0; });
        if (n) n.charge = Math.max(0, (n.charge || 0) - (m.chargeDrain || 20));
      }
      break;
    case 'mine_stone':
      is.stone = (is.stone || 0) + (m.stoneGain || 2);
      break;
    case 'harvest':
      is.harvest = (is.harvest || 0) + (m.harvestGain || 3);
      if (is.plots && m.target) {
        let p = is.plots.find(function(pl) { return pl.stage === 'ready' && Math.abs(pl.x - m.target.x) < 20; });
        if (p) { p.stage = 'empty'; p.crop = null; }
      }
      break;
    case 'plant':
      if (is.plots && m.target) {
        let p = is.plots.find(function(pl) { return !pl.crop && Math.abs(pl.x - m.target.x) < 20; });
        if (p) { p.crop = 'grain'; p.stage = 'growing'; p.growTimer = 0; }
      }
      break;
    case 'expand':
      if (typeof swapToIsland === 'function') {
        swapToIsland(is, nation.isleX, nation.isleY);
        let cost = 5 + (state.islandLevel || 1) * 8;
        if ((state.crystals || 0) >= cost) {
          state.crystals -= cost;
          state.islandLevel = (state.islandLevel || 1) + 1;
          state.islandRX = (state.islandRX || 500) + 30;
          state.islandRY = (state.islandRY || 320) + 20;
          if (typeof placeEraBuildings === 'function') placeEraBuildings(state.islandLevel);
          if (!state.trees) state.trees = [];
          for (let i = 0; i < 3; i++) {
            let a = Math.random() * Math.PI * 2, r = Math.random() * 0.3 + 0.4;
            state.trees.push({ x: nation.isleX + Math.cos(a) * state.islandRX * r * 0.7, y: nation.isleY + Math.sin(a) * state.islandRY * r * 0.3, type: 'oak', hp: 3 });
          }
        }
        swapBack();
      }
      break;
    case 'recruit':
      if ((is.gold || 0) >= 10) {
        is.gold -= 10;
        if (!is.legia) is.legia = { army: [], castrumLevel: 1, morale: 100 };
        if (!is.legia.army) is.legia.army = [];
        is.legia.army.push({ type: 'legionary', hp: 20, maxHp: 20, damage: 5, speed: 1.2, garrison: false });
        is.legia.castrumLevel = Math.max(is.legia.castrumLevel || 0, 1);
      }
      break;
    case 'defend_hit':
      if (state.invasion && state.invasion.active && state.invasion.target === m.nation) {
        let atk = state.invasion.attackers ? state.invasion.attackers.find(function(a) { return a.hp > 0; }) : null;
        if (atk) {
          atk.hp -= (m.damage || 8);
          if (typeof addFloatingText === 'function' && typeof w2sX === 'function') {
            addFloatingText(w2sX(atk.x), w2sY(atk.y) - 15, '-' + (m.damage || 8), '#ff8800');
          }
          if (atk.hp <= 0) { atk.state = 'dead'; atk.deathTimer = 0; }
        }
      }
      break;
  }
}

function swapToIsland(islandState, cx, cy) {
  if (_realState) return; // already swapped
  _realState = { cx: WORLD.islandCX, cy: WORLD.islandCY };
  for (let f of _islandFields) _realState[f] = state[f];
  for (let f of _islandFields) state[f] = islandState[f] != null ? islandState[f] : state[f];
  WORLD.islandCX = cx;
  WORLD.islandCY = cy;
  _swappedIsland = islandState;
}

function swapBack() {
  if (!_realState) return;
  if (_swappedIsland) {
    for (let f of _islandFields) _swappedIsland[f] = state[f];
  }
  for (let f of _islandFields) state[f] = _realState[f];
  WORLD.islandCX = _realState.cx;
  WORLD.islandCY = _realState.cy;
  _realState = null;
  _swappedIsland = null;
}

// ─── COORD HELPERS ────────────────────────────────────────────────────────
function dist2(x1, y1, x2, y2) {
  return sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── SOUND MANAGER — Procedural Audio via p5.sound ─────────────────────
// ═══════════════════════════════════════════════════════════════════════════

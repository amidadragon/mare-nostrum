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
let _selectedBotDifficulty = 'normal'; // 'easy' | 'normal' | 'hard'
let _seaMapOpen = false; // M key toggles sea minimap
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
    subtitle: 'Scourge of the Bronze Age',
    bonuses: ['+30% sailing speed', '+50% raid loot', '+15% combat on water', 'Starts on a ship'],
    buildSpeedMult: 1.0,
    recruitBonus: 0,
    tradeIncomeMult: 0.85,
    sailSpeedMult: 1.3,
    combatDamageMult: 1.15,
    fishYieldMult: 1.2,
    npcFavorMult: 0.8,
    crystalIncomeMult: 1.0,
    cropGrowthMult: 0.9,
    buildCostMult: 1.1,
    raidLootMult: 1.5,
    noStartIsland: true,
    bannerColor: [35, 30, 45],
    accentColor: [140, 45, 30],
    accentColorHex: '#8c2d1e',
    bannerGlyph: 'serpent',
    style: {
      wall: [55, 50, 45], roof: [40, 35, 30], trim: [80, 60, 50],
      accent: [140, 45, 30], door: [45, 35, 28], window: [35, 30, 45],
      column: [65, 55, 45], ground: [50, 45, 40],
      roofType: 'flat', columnType: 'wooden', doorShape: 'arch',
      wallTexture: 'plank', groundTint: [60, 52, 42],
    },
    player: { tunic: [35, 30, 45], sash: [140, 45, 30], cape: [25, 22, 35], helm: [90, 80, 65] },
    npcNames: { livia: 'Meresankh', marcus: 'Lukka', vesta: 'Shekelesh', felix: 'Denyen' },
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
    { col: [55, 50, 45], w: 3, h: 2 },
    { col: [100, 80, 60], w: 4, h: 3 },
    { col: [70, 55, 40], w: 2, h: 2 },
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
    tunic: [35, 30, 45], cape: [25, 22, 35], armor: [70, 60, 50],
    helm: [90, 80, 65], helmCrest: [140, 45, 30], shield: [40, 35, 30],
    shieldBoss: [140, 45, 30], legs: [50, 40, 32], plume: [140, 45, 30],
    shieldShape: 'round', helmStyle: 'horned', weapon: 'axe',
    conquestFlag: [35, 30, 45],
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
  seapeople: { leader:'Sea Lord', soldier:'Raider', barracks:'War Camp', army:'Horde', elite:'Dread Corsair', officer:'Reaver', rank2:'Sea Lord', rank3:'Destroyer' },
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
    { type: 'raven', speed: 0.6, size: 6 },
    { type: 'crab', speed: 0.15, size: 5 },
    { type: 'vulture', speed: 0.35, size: 9 },
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
    { name: 'Sherden', cost: 5, currency: 'gold', hp: 22, atk: 9, def: 2, desc: 'Sword-wielding raider' },
    { name: 'Peleset', cost: 14, currency: 'gold', hp: 42, atk: 12, def: 7, desc: 'Armored spearman' },
    { name: 'Lukkan Marauder', cost: 20, currency: 'gold', hp: 48, atk: 18, def: 3, desc: 'Savage fury' },
    { name: 'Tjeker Corsair', cost: 18, currency: 'gold', hp: 44, atk: 14, def: 8, desc: 'Ship-borne fighter' },
    { name: 'Weshesh Champion', cost: 35, currency: 'gold', hp: 68, atk: 18, def: 12, desc: 'Elite destroyer' },
    { name: 'Sea Lord', cost: 0, currency: 'gold', hp: 110, atk: 24, def: 14, desc: 'Dread of all coasts' },
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
  seapeople: { name: 'Dagon', domain: 'Abyss', ultimate: 'Maelstrom', blessingOptions: ['blood_tide', 'fish_bounty', 'storm_call'] },
  persia:    { name: 'Ahura Mazda', domain: 'Light', ultimate: 'Eternal Flame', blessingOptions: ['purity', 'royal_decree', 'fire_blessing'] },
  phoenicia: { name: 'Melqart', domain: 'Trade', ultimate: 'Golden Touch', blessingOptions: ['merchant_favor', 'fair_winds', 'harbor_blessing'] },
  gaul:      { name: 'Cernunnos', domain: 'Nature', ultimate: 'Wild Hunt', blessingOptions: ['forest_growth', 'beast_bond', 'earth_strength'] },
};

const TEMPLE_HALLS={rome:{name:'Temple of Mars',floor1:[210,205,195],floor2:[170,165,155],wall:[45,35,28],drape:[175,28,28],accent:[200,170,50],trim:[185,178,165],altarShape:'eagle',altarColor:[200,170,50],decoType:'laurel',decoColor:[80,140,50],pet:'wolf',petColor:[140,120,100],petAccent:[100,85,70]},carthage:{name:'Temple of Tanit',floor1:[212,180,120],floor2:[180,150,100],wall:[60,40,25],drape:[120,50,160],accent:[212,180,60],trim:[240,230,208],altarShape:'crescent',altarColor:[212,180,60],decoType:'gold_disc',decoColor:[212,180,60],pet:'monkey',petColor:[160,110,60],petAccent:[200,160,110]},egypt:{name:'Temple of Ra',floor1:[232,200,114],floor2:[200,170,90],wall:[50,45,35],drape:[40,100,180],accent:[200,170,40],trim:[245,240,224],altarShape:'pyramid',altarColor:[200,170,40],decoType:'lotus',decoColor:[100,180,160],pet:'cat',petColor:[180,140,80],petAccent:[220,180,100]},greece:{name:'Temple of Athena',floor1:[240,240,248],floor2:[200,200,210],wall:[40,40,50],drape:[80,144,192],accent:[80,144,192],trim:[220,220,230],altarShape:'olive',altarColor:[80,140,50],decoType:'column',decoColor:[200,200,210],pet:'owl',petColor:[160,140,100],petAccent:[220,200,140]},seapeople:{name:'Shrine of Dagon',floor1:[60,52,42],floor2:[48,42,35],wall:[28,25,22],drape:[140,45,30],accent:[120,40,25],trim:[80,65,50],altarShape:'anchor',altarColor:[140,45,30],decoType:'net',decoColor:[70,60,50],pet:'crab',petColor:[200,80,60],petAccent:[220,120,80]},persia:{name:'Temple of Ahura Mazda',floor1:[220,200,160],floor2:[180,160,120],wall:[40,30,30],drape:[42,74,138],accent:[212,160,48],trim:[230,220,200],altarShape:'fire',altarColor:[255,140,30],decoType:'wingedsun',decoColor:[212,160,48],pet:'falcon',petColor:[120,90,60],petAccent:[180,150,100]},phoenicia:{name:'Temple of Melqart',floor1:[220,215,210],floor2:[180,175,170],wall:[45,30,30],drape:[138,16,80],accent:[180,120,40],trim:[200,190,175],altarShape:'ship',altarColor:[180,120,40],decoType:'wave',decoColor:[48,112,176],pet:'parrot',petColor:[60,180,60],petAccent:[255,80,40]},gaul:{name:'Temple of Cernunnos',floor1:[120,100,65],floor2:[95,80,50],wall:[30,28,20],drape:[42,106,48],accent:[200,160,32],trim:[100,80,50],altarShape:'dolmen',altarColor:[140,130,110],decoType:'mistletoe',decoColor:[80,140,50],pet:'boar',petColor:[120,90,60],petAccent:[80,60,40]}};
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
let _viewW = 0, _viewH = 0, _viewX = 0, _viewY = 0;
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
  seapeople_intro: 'We are the storm that toppled empires. The sea remembers what the land forgets.',
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
  // ERA 0: SETTLEMENT (Lv 1) — first structures after shipwreck
  // ===============================================================
  { id: 'shelter_start',   x: 580, y: 400, w: 28, h: 22, type: 'domus',        level: 1,  district: 'center' },
  { id: 'campfire_start',  x: 610, y: 410, w: 12, h: 12, type: 'torch',        level: 1,  district: 'center' },
  { id: 'fence_start',     x: 560, y: 420, w: 32, h:  8, type: 'fence',        level: 1,  district: 'center' },

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

  // --- MILITARY (NE of center, x:715-845) ---
  { id: 'castrum',         x: 780, y: 340, w: 130, h: 100, type: 'castrum',    level: 3,  district: 'military' },
  { id: 'wall_cast_l',     x: 715, y: 340, w:  8, h: 50, type: 'wall',        level: 3,  district: 'military' },
  { id: 'wall_cast_r',     x: 845, y: 340, w:  8, h: 50, type: 'wall',        level: 3,  district: 'military' },
  { id: 'wall_cast_top',   x: 780, y: 290, w: 80, h:  8, type: 'wall',        level: 3,  district: 'military' },
  { id: 'watchtower_cast', x: 845, y: 290, w: 24, h: 56, type: 'watchtower',  level: 3,  district: 'military' },
  { id: 'torch_cast_l',    x: 760, y: 360, w:  8, h: 16, type: 'torch',       level: 3,  district: 'military' },
  { id: 'torch_cast_r',    x: 800, y: 360, w:  8, h: 16, type: 'torch',       level: 3,  district: 'military' },

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

// ═══ TECH TREE, RESEARCH, VICTORY, FACTION DATA — moved to progression.js ═══
// ─── PRELOAD ─────────────────────────────────────────────────────────────
function preload() {
  menuBgImg = loadImage('menu_bg.webp');
  preloadAllSprites();
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

// ═══ 1v1 STRATEGY MODE — Player vs AI, both start at level 1 ═══
function start1v1Game(playerFaction) {
  initState();
  state._gameMode = '1v1';
  trackMilestone('1v1_start');
  state.progression.gameStarted = true;
  state.progression.villaCleared = true;
  state.progression.tutorialDone = true;
  state.introPhase = null;
  // Both player and bot start at level 5 — visible civilization from start
  state.islandLevel = 5;
  state.islandRX = 500 + 35 * 5; // 675
  state.islandRY = 320 + 24 * 5; // 440
  state.player.x = WORLD.islandCX;
  state.player.y = WORLD.islandCY;
  cam.x = state.player.x; cam.y = state.player.y;
  camSmooth.x = cam.x; camSmooth.y = cam.y;
  // Starting resources — level 5 start
  state.wood = 40; state.stone = 25; state.crystals = 30;
  state.gold = 50; state.seeds = 8; state.harvest = 15;
  state.solar = 100;
  // Random faction if not specified
  let factions = ['rome', 'carthage', 'egypt', 'greece', 'seapeople', 'persia', 'phoenicia', 'gaul'];
  if (!playerFaction) playerFaction = factions[Math.floor(Math.random() * factions.length)];
  // Select faction (this inits nations + bot islands at level 5 via _gameMode)
  if (typeof selectFaction === 'function') selectFaction(playerFaction);
  // Place buildings for levels 1-5
  if (typeof placeEraBuildings === 'function') { for (let lv = 1; lv <= 5; lv++) placeEraBuildings(lv); }
  gameScreen = 'game';
  if (typeof addNotification === 'function') {
    addNotification('1v1 Strategy Mode — Race to dominance!', '#ffdd44');
    addNotification('Build, expand, and conquer your rival civilization!', '#aaddff');
  }
}

// ═══ CONQUEST MODE — 8 factions, all start equal, race to victory ═══
function startConquestGame(playerFaction) {
  initState();
  state._gameMode = 'conquest';
  trackMilestone('conquest_start');
  state.progression.gameStarted = true;
  state.progression.villaCleared = true;
  state.progression.tutorialDone = true;
  state.progression.homeIslandReached = true;
  state.progression.wreckExplored = true;
  state.progression.triremeRepaired = true;
  state.progression.farmCleared = true;
  state.progression.companionsAwakened = { lares: true, woodcutter: true, harvester: true, centurion: true };
  state.progression.npcsFound = { marcus: true, vesta: true, felix: true };
  state.introPhase = null;
  // Everyone starts at level 1 — build from scratch
  state.islandLevel = 1;
  state.islandRX = 500;
  state.islandRY = 320;
  state.player.x = WORLD.islandCX;
  state.player.y = WORLD.islandCY;
  cam.x = state.player.x; cam.y = state.player.y;
  camSmooth.x = cam.x; camSmooth.y = cam.y;
  // Equal starting resources
  state.wood = 15; state.stone = 10; state.crystals = 8;
  state.gold = 100; state.seeds = 5; state.harvest = 8;
  state.solar = 100; state.fish = 3;
  // Tools unlocked
  state.tools = { sickle: 1, axe: 1, net: 1 };
  // Conquest starts with a castrum + starting army
  state.legia.castrumLevel = 1;
  state.legia.castrumX = 780;
  state.legia.castrumY = 340;
  // Starting army — 3 legionaries ready to fight
  state.legia.army = [
    { type: 'legionary', hp: 20, maxHp: 20, damage: 5, speed: 1.2, garrison: false },
    { type: 'legionary', hp: 20, maxHp: 20, damage: 5, speed: 1.2, garrison: false },
    { type: 'legionary', hp: 20, maxHp: 20, damage: 5, speed: 1.2, garrison: false }
  ];
  // Show faction select screen — player picks their faction
  if (!playerFaction) {
    // Open faction select overlay — selectFaction callback will finish setup
    factionSelectActive = true;
    factionSelectFade = 0;
    gameScreen = 'game';
    return;
  }
  // Faction specified — finish setup
  if (typeof selectFaction === 'function') selectFaction(playerFaction);
  if (typeof buildIsland === 'function') buildIsland();
  // Place castrum building on island
  state.buildings.push({ x: 780, y: 340, type: 'castrum', w: 130, h: 100, rot: 0, buildProgress: 1 });
  gameScreen = 'game';
  if (typeof addNotification === 'function') {
    addNotification('Starting: 100 gold, 3 legionaries, castrum ready', '#88ff88');
    addNotification('CONQUEST MODE — Rise above all nations!', '#ffdd44');
    addNotification('Expand, build armies, forge alliances, and dominate.', '#aaddff');
    addNotification('Capture 6 capitals, control 4 trade hubs + 100k gold, or hold the Senate with 4 allies to win!', '#88ff88');
  }
  // Tutorial hints — delayed
  state._tutorialStart = frameCount;
  state._tutorialTimers = [
    { frame: 300, msg: 'Walk to the Castrum (NE building) and press E to enter', color: '#aaddff' },
    { frame: 600, msg: 'Inside Castrum: press 1 to recruit Legionaries (10 gold each)', color: '#aaddff' },
    { frame: 900, msg: 'Walk to the left pier and press E to board your ship', color: '#aaddff' },
    { frame: 1200, msg: 'Sail to another island and press F to invade!', color: '#aaddff' },
  ];
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

// Check if point is on the harbor pier (left side of island)
function isOnPier(wx, wy) {
  // Player dock (left side)
  let port = getPortPosition();
  let pierLeft = port.x - 30;
  let pierRight = port.x + 150;
  let pierTop = port.y - 15;
  let pierBot = port.y + 30;
  if (wx >= pierLeft && wx <= pierRight && wy >= pierTop && wy <= pierBot) return true;
  // Merchant dock (right side)
  if (typeof getMerchantPortPosition === 'function') {
    let mp = getMerchantPortPosition();
    let mpLeft = mp.x - 150;
    let mpRight = mp.x + 30;
    let mpTop = mp.y - 15;
    let mpBot = mp.y + 30;
    if (wx >= mpLeft && wx <= mpRight && wy >= mpTop && wy <= mpBot) return true;
  }
  return false;
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
      // Old expedition islands removed - no phase transition needed
    }
    if (state.narrativeFlags) state.narrativeFlags['discover_' + to] = true;
    // Play island-specific narration on first visit
    if (snd && snd.playNarration) {
      // Old expedition island narrations removed
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
  // Ship deck — elliptical boundary (Sea Peoples home)
  if (state && state.onShipDeck && typeof SHIP_DECK !== 'undefined') {
    var _sdx = (wx - SHIP_DECK.cx) / (SHIP_DECK.hw + 10);
    var _sdy = (wy - SHIP_DECK.cy) / (SHIP_DECK.hh + 5);
    return _sdx * _sdx + _sdy * _sdy <= 1.15;
  }
  // Below deck — rectangular boundary
  if (state && state.belowDeck && typeof BELOW_DECK !== 'undefined') {
    return abs(wx - BELOW_DECK.cx) <= BELOW_DECK.hw && abs(wy - BELOW_DECK.cy) <= BELOW_DECK.hh;
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

  // ─── WORLD ISLAND VISIT: swap island coords so all home-island logic works on the visited island ───
  let _savedHomeIsland = null;
  if (state._activeWorldIsland && state._worldIslePos) {
    _savedHomeIsland = {
      cx: WORLD.islandCX, cy: WORLD.islandCY,
      rx: state.islandRX, ry: state.islandRY,
      seed: typeof _coastlineSeed !== 'undefined' ? _coastlineSeed : 42
    };
    let _wp = state._worldIslePos;
    WORLD.islandCX = _wp.x;
    WORLD.islandCY = _wp.y;
    state.islandRX = _wp.rx;
    state.islandRY = _wp.ry;
    let _wisle = typeof getWorldIsland === 'function' ? getWorldIsland(state._activeWorldIsland) : null;
    if (typeof _coastlineSeed !== 'undefined') {
      _coastlineSeed = _wisle ? (_wisle.key.length * 7 + _wisle.angle * 100) : 42;
    }
    if (typeof _coastlineVerts !== 'undefined') _coastlineVerts = null;
  }

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
      !state.conquest.active &&
      !(typeof isInvasionBattleActive === 'function' && isInvasionBattleActive())) {
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
  // ─── WORLD ISLAND VISIT: restore home island coords ───
  if (_savedHomeIsland) {
    WORLD.islandCX = _savedHomeIsland.cx;
    WORLD.islandCY = _savedHomeIsland.cy;
    state.islandRX = _savedHomeIsland.rx;
    state.islandRY = _savedHomeIsland.ry;
    if (typeof _coastlineSeed !== 'undefined') _coastlineSeed = _savedHomeIsland.seed;
    if (typeof _coastlineVerts !== 'undefined') _coastlineVerts = null;
  }
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


// ═══ UNIVERSAL ISLAND UPDATE — runs the same simulation for any island ═══
// Called for player island every frame, for bot islands on staggered schedule.
// All systems read from global `state` which is swapped via swapToIsland/swapBack.
function updateIslandSystems(dt, isPlayer) {
  // Bot islands use strategic economy (updateNationDaily), not per-frame simulation.
  // Only run lightweight visual updates for bots — citizens, wildlife, military ambient.
  if (!isPlayer) {
    // Bot leader movement (click-to-move via BotAI)
    if (typeof updatePlayer === 'function') updatePlayer(dt);
    if (typeof updatePlayerAnim === 'function') updatePlayerAnim(dt);
    // Visual systems only
    if (typeof updateCitizens === 'function' && frameCount % 3 === 0) updateCitizens(dt * 3);
    if (typeof updateFactionWildlife === 'function' && frameCount % 5 === 0) updateFactionWildlife(dt * 5);
    if (typeof updateChickens === 'function') updateChickens(dt);
    if (typeof updateLegionAmbient === 'function') updateLegionAmbient(dt);
    if (typeof updateTrees === 'function') updateTrees(dt);
    return;
  }

  // === PLAYER ISLAND: full simulation ===
  // Time & environment
  if (typeof updateTime === 'function') updateTime(dt);
  if (typeof updateWeather === 'function' && frameCount % 3 === 0) updateWeather(dt * 3);
  if (typeof updateStorm === 'function') updateStorm(dt);

  // Player movement
  if (typeof updatePlayer === 'function') updatePlayer(dt);
  if (typeof updatePlayerAnim === 'function') updatePlayerAnim(dt);

  // Companions
  let _pg = state.progression;
  let _full = !_pg || !_pg.gameStarted || _pg.villaCleared;
  if (typeof updateCompanion === 'function' && (_full || (_pg.companionsAwakened && _pg.companionsAwakened.lares))) updateCompanion(dt);
  if (typeof updateWoodcutter === 'function' && (_full || (_pg.companionsAwakened && _pg.companionsAwakened.woodcutter))) updateWoodcutter(dt);
  if (typeof updateHarvester === 'function' && (_full || (_pg.companionsAwakened && _pg.companionsAwakened.harvester))) updateHarvester(dt);
  if (typeof updateQuarrier === 'function') updateQuarrier(dt);
  if (typeof updateCenturion === 'function' && (_full || (_pg.companionsAwakened && _pg.companionsAwakened.centurion))) updateCenturion(dt);
  if (typeof updateCook === 'function') updateCook(dt);
  if (typeof updateFisherman === 'function') updateFisherman(dt);

  // Citizens & wildlife
  if (typeof updateCitizens === 'function' && frameCount % 3 === 0) updateCitizens(dt * 3);
  if (typeof updateFactionWildlife === 'function' && frameCount % 5 === 0) updateFactionWildlife(dt * 5);
  if (typeof updateChickens === 'function') updateChickens(dt);
  if (typeof updateCats === 'function') updateCats(dt);
  if (typeof updateCompanionPets === 'function') updateCompanionPets(dt);

  // Resource systems
  if (typeof updateVestaCrystalGathering === 'function') updateVestaCrystalGathering(dt);
  if (typeof updateTrees === 'function') updateTrees(dt);
  if (typeof updateFishing === 'function') updateFishing(dt);
  if (typeof updateBlessing === 'function') updateBlessing(dt);
  if (typeof updateHarvestCombo === 'function') updateHarvestCombo(dt);
  if (typeof updateCooking === 'function') updateCooking(dt);

  // Military
  if (typeof updateLegia === 'function') updateLegia(dt);
  if (typeof updateLegionAmbient === 'function') updateLegionAmbient(dt);

  // Events & festivals
  if (typeof updateFestival === 'function') updateFestival(dt);
  if (typeof updateActiveEvent === 'function') updateActiveEvent(dt);

  // NPC schedules
  if (typeof updateAllNPCSchedules === 'function' && frameCount % 60 === 0) updateAllNPCSchedules(dt * 60);

  // Player-only visual systems
  if (typeof updateParticles === 'function') updateParticles(dt);
  if (typeof updateFloatingText === 'function') updateFloatingText(dt);
  if (typeof updateShake === 'function') updateShake(dt);
  if (typeof updatePickupMagnetism === 'function') updatePickupMagnetism(dt);
  if (typeof updateCatAdoption === 'function') updateCatAdoption();
  if (typeof updateVisitor === 'function') updateVisitor(dt);
  if (typeof updateTempleCourt === 'function') updateTempleCourt(dt);
  if (typeof updateDiscoveryEvents === 'function') updateDiscoveryEvents(dt);
  if (typeof updateNotifications === 'function') updateNotifications(dt);
}

// ═══ CONQUEST MODE: tick all bot islands ═══
function updateConquestIslands(dt) {
  if (!state.nations) return;
  let botKeys = Object.keys(state.nations).filter(k => state.nations[k].isBot && state.nations[k].islandState);
  if (botKeys.length === 0) return;

  // Staggered: update 1 bot island per frame (round-robin)
  let idx = frameCount % botKeys.length;
  let k = botKeys[idx];
  let nation = state.nations[k];
  let is = nation.islandState;

  swapToIsland(is, nation.isleX, nation.isleY);

  // Bot AI generates synthetic input for this island's leader
  if (typeof BotAI !== 'undefined') BotAI.update(k, dt);

  // Run the same island systems as the player
  updateIslandSystems(dt * botKeys.length, false);

  swapBack();
}

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
    drawSeaMap();
    // Strategy power rankings (top-right corner)
    if (typeof StrategyEngine !== 'undefined' && StrategyEngine.session && !photoMode && !screenshotMode && !dialogState.active) {
      StrategyEngine.drawPowerRankings();
      // Conquest victory check (every 60 frames)
      if (state._gameMode === 'conquest' && frameCount % 60 === 0 && !state._victoryShown) {
        let _vic = StrategyEngine.checkVictory();
        if (_vic) { state._victory = _vic; state._victoryShown = true; }
      }
      if (state._victory) StrategyEngine.drawVictoryScreen(state._victory);
    }
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

  // === BELOW DECK INTERIOR (Sea Peoples ship) ===
  if (state.belowDeck && typeof updateShipHome === 'function') {
    updateShipHome(dt);
    renderShipHome();
    return;
  }
  // Sea Peoples passive systems (fishing, trade income) run on deck + while sailing
  if ((state.onShipDeck || (state.rowing && state.rowing.active)) &&
      typeof isSeaPeoplesFaction === 'function' && isSeaPeoplesFaction() &&
      typeof updateShipHome === 'function') {
    updateShipHome(dt);
  }

  updateTime(dt);
  updateCurrentIsland();
  // Safety: ensure castrumLevel matches building state
  if (state.islandLevel >= 8 && state.legia && state.legia.castrumLevel < 1 && state.buildings.some(b => b.type === 'castrum')) {
    state.legia.castrumLevel = 1;
  }
  // Openworld: force-clear legacy teleport flags every frame
  if (state.visitingNation) state.visitingNation = null;
  // Special islands: activate when sailing (proximity-based rendering handled in draw functions)
  if (state.rowing && state.rowing.active) {
    if (state.vulcan) state.vulcan.active = true;
    if (state.hyperborea) state.hyperborea.active = true;
    if (state.plenty) state.plenty.active = true;
    if (state.necropolis) state.necropolis.active = true;
  }
  // Safety: if player is lost in deep ocean (not near any island, not rowing), teleport home
  // Skip during wreck beach (player is at -4800,0 which is far from all islands)
  let _onWreck = (state.progression.gameStarted && !state.progression.homeIslandReached) || (state.wreck && state.wreck._visiting);
  if (state.player && !state.rowing.active && !_onWreck && !state._activeWorldIsland && typeof isNearAnyIsland === 'function' &&
      !isNearAnyIsland(state.player.x, state.player.y, 500) && !state.insideTemple && !state.insideCastrum && !state.onShipDeck && !state.belowDeck) {
    // Sea Peoples: teleport back to ship deck
    if (typeof isSeaPeoplesFaction === 'function' && isSeaPeoplesFaction() && typeof returnToShipDeck === 'function') {
      returnToShipDeck();
      addNotification('Pulled back to your ship...', '#cc4422');
    } else {
      state.player.x = WORLD.islandCX;
      state.player.y = WORLD.islandCY;
      cam.x = state.player.x; cam.y = state.player.y;
      camSmooth.x = cam.x; camSmooth.y = cam.y;
      addNotification('Washed ashore on your island...', '#88ddff');
    }
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
    if (typeof updateVisualInvasion === 'function') updateVisualInvasion(dt);
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
    _viewW = width / camZoom; _viewH = height / camZoom; _viewX = (width - _viewW) / 2; _viewY = (height - _viewH) / 2;
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
    if (typeof drawVisualInvasion === 'function' && typeof isInvasionBattleActive === 'function' && isInvasionBattleActive()) {
      drawVisualInvasion();
    }
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
      // Old expedition islands update calls removed
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
    // Update bot islands — full island simulation with staggered updates
    updateConquestIslands(dt);
    if (typeof updateDiplomacy === 'function') updateDiplomacy(dt);
    if (typeof updatePet === 'function') updatePet(dt);
    if (typeof updateTavern === 'function') updateTavern(dt);
    updateSeaPeopleRaid(dt);
    if (typeof updateNavalCombat === 'function') updateNavalCombat(dt);
    if (typeof updateVisualInvasion === 'function') updateVisualInvasion(dt);
    updateNotifications(dt);
    // Conquest tutorial hints
    if (state._tutorialTimers && state._tutorialTimers.length > 0) {
      let t = state._tutorialTimers[0];
      if (frameCount >= t.frame + (state._tutorialStart || 0)) {
        addNotification(t.msg, t.color);
        state._tutorialTimers.shift();
      }
    }
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
    if (state._gameMode !== 'conquest') updateWreckRowing(dt);

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
      // Keep sky visible — horizon should be at least 25% from top
      let horizonY = min(islandTopScreen, height * 0.25);
      horizonY = max(horizonY, height * 0.15);
      horizonOffset = (height * 0.25) - horizonY;
    }
    // When visiting a nation island, recalculate horizon based on that island's position
    if (state._activeNation) {
      let nv = state.nations[state._activeNation];
      if (nv) {
        let islandScreenY = w2sY(nv.isleY) + floatOffset;
        let visualTopRadius = (nv.isleRY || 280) * 0.50 * 1.12;
        let islandTopScreen = islandScreenY - visualTopRadius - 10;
        let horizonY = min(islandTopScreen, height * 0.35);
        horizonY = max(horizonY, height * 0.05);
        horizonOffset = (height * 0.25) - horizonY;
      }
    }
    // When visiting a world island, recalculate horizon based on that island
    if (state._activeWorldIsland && state._worldIslePos) {
      let _wp = state._worldIslePos;
      let islandScreenY = w2sY(_wp.y) + floatOffset;
      let visualTopRadius = _wp.ry * 0.50 * 1.12;
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
    _viewW = width / camZoom; _viewH = height / camZoom; _viewX = (width - _viewW) / 2; _viewY = (height - _viewH) / 2;

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
    // Campaign-only distant islands (skip in Conquest mode)
    if (state._gameMode !== 'conquest') {
      drawImperialBridge();
      drawConquestIsleDistant();
      drawConquestDistantEntities();
      drawConquestDistantLabel();
    }
    drawRivalIsleDistant();
    if (typeof drawInvasion === 'function') drawInvasion();
    // Seamless exploration island content
    if (state._activeExploration) {
      // Old expedition islands removed
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
    // Campaign islands visible when sailing (skip in Conquest — only nation islands exist)
    if (state.rowing.active && state._gameMode !== 'conquest') {
      drawWreckIsland();
      let wsx = w2sX(WRECK.cx), wsy = w2sY(WRECK.cy);
      let _wreckHorizY = max(height * 0.06, height * 0.25 - horizonOffset) + 10;
      wsy = max(wsy, _wreckHorizY);
      let _wreckDS = typeof _getDistantScale === 'function' ? _getDistantScale(WRECK.cx, WRECK.cy, WRECK.rx) : null;
      let _maxVD = typeof _getMaxViewDist === 'function' ? _getMaxViewDist() : 4000;
      if (_wreckDS && _wreckDS.dist > _maxVD) {}
      else if (wsx > -100 && wsx < width + 100 && wsy > -100 && wsy < height + 100) {
        let _wLabelAlpha = _wreckDS ? lerp(120, 40, constrain((_wreckDS.dist - 500) / 3000, 0, 1)) : 120;
        fill(200, 180, 120, _wLabelAlpha);
        noStroke(); textSize(11); textAlign(CENTER, CENTER);
        text('Wreck Beach', floor(wsx), floor(wsy - WRECK.ry * 0.5 * (_wreckDS ? _wreckDS.scale : 1)));
        textAlign(LEFT, TOP);
      }
      // Old expedition islands removed
    }
    if (state.rowing.active) {
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
    // Home island: render when on it (not visiting another island), LOD when sailing away
    // When on a world island, WORLD coords are swapped so drawIsland() renders the visited island
    let _isSailing = state.rowing && state.rowing.active;
    let _onNationIsland = !!state._activeNation || !!state._activeExploration;
    let _onWorldIsland = !!state._activeWorldIsland;
    let _onOtherIsland = _onNationIsland || _onWorldIsland;
    // Sea Peoples: ship deck OR sailing — never render home island
    let _isSeaPeople = typeof isSeaPeoplesFaction === 'function' && isSeaPeoplesFaction();
    if (state.onShipDeck && typeof drawShipDeck === 'function') {
      drawShipDeck();
      if (typeof clampPlayerToShipDeck === 'function') clampPlayerToShipDeck();
    } else if (_onWorldIsland || (!_isSeaPeople && ((!_isSailing && !_onOtherIsland) || (_isSailing && _homeDist < 800)))) {
      drawIsland(); // Full island render (home island or visited world island)
      if (!_onWorldIsland && typeof drawHomeLighthouse === 'function') drawHomeLighthouse();
    } else if (!_isSeaPeople && _isSailing && _homeDist < 2000) {
      // Medium LOD for home island while sailing away (not when visiting other islands)
      drawIsland();
    } else if (!_isSeaPeople && _isSailing && _homeDist < 4000) {
      // Far LOD — simplified silhouette of home island
      let _hsx = w2sX(WORLD.islandCX), _hsy = w2sY(WORLD.islandCY);
      let _hrx = Math.max(10, Math.floor(state.islandRX * 0.12));
      let _hry = Math.max(5, Math.floor(state.islandRY * 0.06));
      let _hAlpha = Math.max(40, 180 - Math.floor(_homeDist * 0.03));
      noStroke();
      fill(80, 120, 70, _hAlpha); ellipse(_hsx, _hsy, _hrx * 2, _hry * 2);
      fill(120, 160, 100, _hAlpha * 0.7); ellipse(_hsx, _hsy - 2, _hrx * 1.4, _hry * 0.8);
      fill(220, 200, 160, _hAlpha); textSize(7); textAlign(CENTER, BOTTOM);
      text('HOME', _hsx, _hsy - _hry - 4); textAlign(LEFT, TOP);
    }
    // World island terrain now rendered by drawIsland() above via WORLD coord swap
    {
      // ═══ LOD WORLD: render all nation islands based on distance ═══
      // Tier 1 (>2000px): silhouette ellipse + faction label
      // Tier 2 (800-2000px): terrain + building blocks
      // Tier 3 (<800px or visiting): full drawWorldObjectsSorted via state swap
      if (state.nations && (state.rowing && state.rowing.active || state._activeNation || state._activeWorldIsland)) {
        let _camX = camSmooth.x || state.player.x;
        let _camY = camSmooth.y || state.player.y;
        let _nationKeys = Object.keys(state.nations);
        for (let _nki = 0; _nki < _nationKeys.length; _nki++) {
          let _owKey = _nationKeys[_nki];
          let _own = state.nations[_owKey];
          if (!_own || _own.defeated) continue;
          let botCX = _own.isleX || WORLD.islandCX + 1200;
          let botCY = _own.isleY || WORLD.islandCY;
          // Screen-cull: skip islands far off-screen
          let _bsx = w2sX(botCX), _bsy = w2sY(botCY);
          if (_bsx < -800 || _bsx > width + 800 || _bsy < -600 || _bsy > height + 600) continue;
          let _isRX = _own.islandState ? _own.islandState.islandRX || 400 : 400;
          let _isRY = _own.islandState ? _own.islandState.islandRY || 260 : 260;
          // Calculate world distance from camera to island center
          let _dx = botCX - _camX, _dy = botCY - _camY;
          let _dist = Math.sqrt(_dx * _dx + _dy * _dy);
          let _isVisiting = state._activeNation === _owKey;
          let _facData = (typeof FACTIONS !== 'undefined' && FACTIONS[_owKey]) ? FACTIONS[_owKey] : null;
          let _facName = _facData ? _facData.name : _owKey;
          let _facColor = _facData && _facData.color ? _facData.color : [180, 150, 100];
          let _isLevel = _own.islandState ? (_own.islandState.islandLevel || 1) : (_own.level || 1);

          if (_isVisiting || _dist < 800) {
            // ═══ TIER 3: FULL RENDER (close or visiting) ═══
            let _owt = (typeof FACTION_TERRAIN !== 'undefined') ? (FACTION_TERRAIN[_owKey] || FACTION_TERRAIN.rome) : { seed: 42 };
            drawIslandAt({ cx: botCX, cy: botCY, rx: _isRX, ry: _isRY, level: _isLevel, seed: _owt.seed, factionKey: _owKey });
            // Faction flora visible at TIER 3 distance (sailing view)
            drawFactionFlora(_owKey, botCX, botCY, _isRX, _isRY);
            if (_isVisiting && !(typeof isInvasionBattleActive === 'function' && isInvasionBattleActive())) {
              // Draw biome content AFTER terrain — skip during invasion battle (battle units replace NPCs)
              drawActiveNationContent();
            } else if (_own.islandState && _own.islandState.buildings && typeof swapToIsland === 'function') {
              // Only render bot island via state swap when NOT visiting — drawActiveNationContent handles visited islands
              swapToIsland(_own.islandState, botCX, botCY);
              state.faction = _owKey;
              if (!state.pyramid) state.pyramid = { x: botCX, y: botCY - 40, level: state.islandLevel || 1 };
              if (!state.resources) state.resources = [];
              if (!state.factionFlora) state.factionFlora = [];
              if (!state.factionWildlife) state.factionWildlife = [];
              if (!state.chickens) state.chickens = [];
              if (!state.cats) state.cats = [];
              if (!state.ruins) state.ruins = [];
              if (!state.crystalRainDrops) state.crystalRainDrops = [];
              if (!state.plots) state.plots = [];
              if (!state.crystalShrine) state.crystalShrine = { x: botCX + 50, y: botCY - 30 };
              if (!state.progression) state.progression = { gameStarted: true, villaCleared: true, companionsAwakened: { lares: true, woodcutter: true, harvester: true, centurion: true }, tutorialsSeen: {} };
              if (!state.legia) state.legia = { army: [], soldiers: [], castrumX: botCX + 100, castrumY: botCY + 50, castrumLevel: 0 };
              if (!state.companion) state.companion = { x: botCX + 40, y: botCY + 20, vx: 0, vy: 0, speed: 2, task: 'idle', taskTarget: null, carryItem: null, energy: 100, pulsePhase: 0, trailPoints: [] };
              if (!state.player) state.player = { x: botCX, y: botCY, vx: 0, vy: 0, speed: 3.2, size: 16, facing: 'down', moving: false, targetX: null, targetY: null, hp: 100, maxHp: 100, anim: { emotion: 'determined', emotionTimer: 0, blinkTimer: 240, blinkFrame: 0, bounceY: 0, bounceTimer: 0, walkFrame: 0, walkTimer: 0, helmetOff: false }, level: 1, xp: 0, weapon: 0, armor: 0, skills: {}, skillCooldowns: {} };
              _groundSortFrame = -999;
              drawWorldObjectsSorted();
              swapBack();
            }
            // Bot AI draw
            if (typeof BotAI !== 'undefined') {
              if (!BotAI.bots[_owKey]) BotAI.create(_owKey, botCX, botCY);
              _own.isBot = true;
              BotAI.draw(_owKey);
            }

          } else if (_dist < 2000) {
            // ═══ TIER 2: MEDIUM LOD (terrain + building blocks + banner) ═══
            let _owt = (typeof FACTION_TERRAIN !== 'undefined') ? (FACTION_TERRAIN[_owKey] || FACTION_TERRAIN.rome) : { seed: 42 };
            drawIslandAt({ cx: botCX, cy: botCY, rx: _isRX, ry: _isRY, level: _isLevel, seed: _owt.seed, factionKey: _owKey });
            // Draw buildings as colored blocks (no state swap needed)
            if (_own.islandState && _own.islandState.buildings) {
              noStroke();
              for (let _bi = 0; _bi < _own.islandState.buildings.length; _bi++) {
                let _b = _own.islandState.buildings[_bi];
                let _bbx = w2sX(_b.x), _bby = w2sY(_b.y);
                if (_bbx < -30 || _bbx > width + 30) continue;
                let _bAlpha = Math.max(80, 200 - Math.floor(_dist * 0.08));
                fill(_facColor[0], _facColor[1], _facColor[2], _bAlpha);
                rect(Math.floor(_bbx - (_b.w || 20) / 2), Math.floor(_bby - (_b.h || 16)), _b.w || 20, _b.h || 16, 2);
              }
            }
            // Faction-specific flora decoration
            drawFactionFlora(_owKey, botCX, botCY, _isRX, _isRY);
            // Faction banner
            let _bfx = w2sX(botCX), _bfy = w2sY(botCY - _isRY * 0.3);
            push(); noStroke();
            fill(100, 80, 50); rect(Math.floor(_bfx) - 1, Math.floor(_bfy) - 30, 2, 32);
            fill(_facColor[0], _facColor[1], _facColor[2], 200);
            let _wave = Math.sin(frameCount * 0.04 + botCX) * 2;
            rect(Math.floor(_bfx) + 1, Math.floor(_bfy) - 28, 12 + _wave, 10);
            fill(255, 255, 255, 180); textSize(8); textAlign(CENTER, BOTTOM);
            text(_facName, Math.floor(_bfx), Math.floor(_bfy) - 32);
            textSize(7); fill(200, 190, 160, 160);
            text('Lv' + _isLevel + ' \u2694' + (_own.military || 0), Math.floor(_bfx), Math.floor(_bfy) - 22);
            textAlign(LEFT, TOP);
            pop();

          } else {
            // ═══ TIER 1: FAR LOD (silhouette + label) ═══
            let _alpha = Math.max(40, Math.min(160, 300 - Math.floor(_dist * 0.06)));
            noStroke();
            // Island silhouette ellipse
            let _sx = Math.floor(_bsx), _sy = Math.floor(_bsy);
            let _srx = Math.max(8, Math.floor(_isRX * 0.15)), _sry = Math.max(4, Math.floor(_isRY * 0.08));
            fill(_facColor[0] * 0.4, _facColor[1] * 0.4, _facColor[2] * 0.4, _alpha);
            ellipse(_sx, _sy, _srx * 2, _sry * 2);
            fill(_facColor[0] * 0.6, _facColor[1] * 0.6, _facColor[2] * 0.6, _alpha * 0.7);
            ellipse(_sx, _sy - 2, _srx * 1.6, _sry * 1.2);
            // Label
            fill(_facColor[0], _facColor[1], _facColor[2], _alpha);
            textSize(7); textAlign(CENTER, BOTTOM);
            text(_facName, _sx, _sy - _sry - 4);
            textSize(6); fill(200, 190, 170, _alpha * 0.7);
            text('Lv' + _isLevel, _sx, _sy - _sry + 4);
            textAlign(LEFT, TOP);
          }
        }
      }
      // Render ALL world islands during sailing (capitals + neutrals)
      if (typeof WORLD_ISLANDS !== 'undefined' && state.rowing && state.rowing.active) {
        for (let isle of WORLD_ISLANDS) {
          // Skip capitals ONLY if state.nations actually renders them
          if (isle.faction && state.nations && state.nations[isle.faction] && !state.nations[isle.faction].defeated) continue;
          let pos = getIslandWorldPos(isle);
          let dx = pos.x - state.player.x;
          let dy = pos.y - state.player.y;
          let dist = Math.sqrt(dx*dx + dy*dy);
          if (dist > 3000) continue; // too far to render
          let sx = w2sX(pos.x);
          let sy = w2sY(pos.y);
          if (sx < -200 || sx > width+200 || sy < -200 || sy > height+200) continue;
          let sc = Math.max(0.3, 1 - dist/3000);
          let rx = (isle.isleRX || 300) * sc;
          let ry = (isle.isleRY || 200) * sc;
          // Determine LOD level and render full terrain for all distances
          let lodLevel = 3;
          if (dist >= 800) lodLevel = 2;
          if (dist >= 1800) lodLevel = 1;

          // Use full terrain engine with unique seed per island
          let islandSeed = isle.key.length * 7 + isle.angle * 100;
          if (typeof drawIslandAt === 'function') {
            drawIslandAt({
              cx: pos.x,
              cy: pos.y,
              rx: isle.isleRX || 300,
              ry: isle.isleRY || 200,
              level: lodLevel,
              seed: islandSeed
            });
          }

          // Draw unique feature overlays at reduced distance (LOD-based)
          if (dist < 1200 && typeof drawIslandAt === 'function') {
            push();
            translate(sx, sy);

            // Per-island unique visual overlays (rendered in screen space after island)
            switch(isle.key) {
              // RESOURCE ISLANDS
              case 'ironwood_forest':
                // Dense dark forest: multiple tall dark trees with broad canopies
                fill(40, 60, 35);
                for (let i = 0; i < 5; i++) {
                  let ox = (i - 2) * ry * 0.25;
                  let treeH = ry * (0.25 + i * 0.05);
                  fill(60, 40, 20); rect(ox - 2, -treeH, 4, treeH);
                  fill(30, 70, 40); ellipse(ox, -treeH - ry*0.15, ry*0.2, ry*0.18);
                }
                break;
              case 'stoneheart':
                // Rocky grey terrain: quarry pit in center with stone blocks
                fill(150, 150, 150); ellipse(0, 0, rx*1.3, ry*1.3);
                fill(100, 100, 100); ellipse(0, 0, rx*0.7, ry*0.7); // quarry pit
                fill(120, 120, 120);
                for (let i = 0; i < 4; i++) {
                  let a = (i * PI / 2);
                  rect(cos(a) * ry*0.3 - 3, sin(a) * ry*0.3 - 3, 6, 6);
                }
                break;
              case 'grain_sea':
                // Golden wheat fields: rows of crops, windmill
                fill(200, 180, 80); // golden terrain base
                // Wheat rows
                stroke(160, 140, 60); strokeWeight(1);
                for (let i = -ry*0.35; i < ry*0.35; i += ry*0.1) {
                  line(-rx*0.4, i, rx*0.4, i);
                }
                noStroke();
                // Windmill
                fill(140, 100, 60); rect(-3, -ry*0.3, 6, ry*0.2);
                fill(200, 180, 100); ellipse(0, -ry*0.35, 8, 8);
                break;
              case 'golden_hills':
                // Hilly terrain with gold tones: mine entrance and sparkles
                fill(180, 160, 80); // gold/amber hills
                // Mine entrance
                fill(60, 40, 20); ellipse(0, ry*0.1, ry*0.25, ry*0.18);
                fill(80, 50, 20); ellipse(0, ry*0.1, ry*0.15, ry*0.12);
                // Gold sparkles
                fill(255, 230, 100); noStroke();
                for (let i = 0; i < 4; i++) {
                  ellipse((i-1.5)*ry*0.15, (i%2)*ry*0.2 - ry*0.2, 3, 3);
                }
                break;
              // MILITARY ISLANDS
              case 'iron_keep':
                // Fortress: thick stone walls with watchtower
                fill(100, 100, 110);
                rect(-rx*0.3, -ry*0.3, rx*0.6, ry*0.6); // outer wall
                fill(70, 70, 80);
                rect(-rx*0.25, -ry*0.25, rx*0.5, ry*0.5); // inner
                // Watchtower
                fill(90, 90, 100); rect(-3, -ry*0.35, 6, ry*0.3);
                fill(120, 120, 130); rect(-5, -ry*0.38, 10, 3);
                break;
              case 'warhorse':
                // Pastures with horses and stable
                fill(120, 150, 80); // green pasture
                // Fenced paddocks
                stroke(100, 80, 60); strokeWeight(1);
                rect(-rx*0.3, -ry*0.25, rx*0.6, ry*0.5);
                noStroke();
                // Stable building
                fill(120, 90, 60); rect(-ry*0.2, ry*0.1, ry*0.4, ry*0.15);
                // Horses (small brown shapes)
                fill(80, 50, 30);
                ellipse(-ry*0.25, -ry*0.1, 6, 4);
                ellipse(ry*0.15, -ry*0.15, 6, 4);
                break;
              case 'castrum_maris':
                // Roman fort: rectangular walls, training grounds
                fill(120, 90, 60); // tan terrain
                stroke(80, 60, 40); strokeWeight(2);
                rect(-rx*0.35, -ry*0.3, rx*0.7, ry*0.6); // fort walls
                noStroke();
                // Legion banner
                fill(200, 50, 50); rect(-2, -ry*0.35, 4, 12);
                fill(255, 200, 0); ellipse(0, -ry*0.32, 5, 4);
                break;
              case 'siege_works':
                // Workshop: catapult, woodpiles, forge
                fill(130, 100, 70);
                // Catapult frame
                stroke(80, 50, 30); strokeWeight(2);
                line(-ry*0.1, -ry*0.2, ry*0.15, -ry*0.1);
                line(-ry*0.1, -ry*0.2, ry*0.1, ry*0.15);
                noStroke();
                // Woodpiles
                fill(90, 60, 40);
                rect(-ry*0.25, ry*0.05, ry*0.2, ry*0.2);
                rect(ry*0.15, ry*0.05, ry*0.2, ry*0.2);
                break;
              case 'heros_grave':
                // Ancient tomb: mausoleum with eternal flame glow
                fill(160, 160, 150); // pale stone
                rect(-rx*0.25, -ry*0.25, rx*0.5, ry*0.45);
                fill(200, 200, 190); // marble columns
                rect(-rx*0.2, -ry*0.2, 6, ry*0.3);
                rect(rx*0.14, -ry*0.2, 6, ry*0.3);
                // Eternal flame
                fill(255, 150, 50, 150);
                ellipse(0, -ry*0.25, 8, 12);
                fill(255, 200, 100, 100);
                ellipse(0, -ry*0.28, 12, 14);
                break;
              // ECONOMIC ISLANDS
              case 'golden_bazaar':
                // Colorful market stalls with tent tops
                fill(200, 140, 80); // market ground
                // Multiple colored tents
                let colors = [[255,100,100], [100,150,255], [255,200,50], [200,100,200]];
                for (let i = 0; i < 4; i++) {
                  fill(colors[i][0], colors[i][1], colors[i][2]);
                  triangle((i-1.5)*ry*0.18 - 4, ry*0.1, (i-1.5)*ry*0.18, ry*0.1 - 8, (i-1.5)*ry*0.18 + 4, ry*0.1);
                }
                // Gold coin
                fill(255, 200, 0); ellipse(0, -ry*0.2, 6, 6);
                break;
              case 'emporium':
                // Grand warehouse with docked ships
                fill(150, 120, 80); // warehouse
                rect(-rx*0.3, -ry*0.2, rx*0.6, ry*0.35);
                fill(200, 200, 200); // roof
                triangle(-rx*0.3, -ry*0.2, 0, -ry*0.35, rx*0.3, -ry*0.2);
                // Cargo crates
                fill(100, 80, 60);
                rect(-ry*0.15, ry*0.05, ry*0.1, ry*0.1);
                rect(ry*0.1, ry*0.05, ry*0.1, ry*0.1);
                break;
              case 'silk_road':
                // Exotic tent with silk banners and camel
                fill(200, 140, 70); // sandy terrain
                fill(180, 80, 180); // purple tent
                triangle(-ry*0.2, ry*0.05, 0, -ry*0.2, ry*0.2, ry*0.05);
                // Camel silhouette
                fill(100, 70, 40);
                ellipse(-ry*0.15, ry*0.15, 8, 6);
                ellipse(-ry*0.1, ry*0.1, 4, 5);
                break;
              case 'amber_coast':
                // Amber beach: lighthouse and amber nodes
                fill(210, 170, 100); // amber sand
                // Lighthouse
                fill(220, 150, 80); rect(-2, -ry*0.35, 4, ry*0.3);
                fill(255, 200, 100); ellipse(0, -ry*0.38, 8, 6);
                // Crystallized amber nodes
                fill(255, 180, 50);
                for (let i = 0; i < 4; i++) {
                  let a = (i * PI/2);
                  ellipse(cos(a)*ry*0.25, sin(a)*ry*0.25, 4, 4);
                }
                break;
              case 'spice_islands':
                // Tropical: palm trees and exotic flowers
                fill(120, 160, 90); // lush green
                // Palm trees
                fill(100, 60, 20);
                rect(-ry*0.2, -ry*0.25, 3, ry*0.3);
                rect(ry*0.15, -ry*0.2, 3, ry*0.25);
                fill(80, 150, 60);
                ellipse(-ry*0.2, -ry*0.3, 12, 10);
                ellipse(ry*0.15, -ry*0.25, 12, 10);
                // Exotic flowers
                fill(200, 50, 100);
                ellipse(-ry*0.05, 0, 4, 4);
                ellipse(ry*0.2, -ry*0.05, 4, 4);
                break;
              case 'ivory_port':
                // White/cream terrain with elephant tusk icon
                fill(220, 210, 190); // ivory/cream
                // Elephant tusk
                fill(240, 235, 210);
                arc(0, 0, ry*0.3, ry*0.4, -PI/4, PI/4, CHORD);
                // Stacked ivory goods
                fill(200, 190, 170);
                rect(-ry*0.15, ry*0.1, ry*0.12, ry*0.08);
                rect(ry*0.1, ry*0.12, ry*0.12, ry*0.08);
                break;
              // DIPLOMATIC ISLANDS
              case 'senate_house':
                // Grand marble building with columns and laurel wreath
                fill(200, 200, 190); // white marble
                rect(-rx*0.3, -ry*0.25, rx*0.6, ry*0.45);
                fill(220, 220, 210);
                for (let i = 0; i < 4; i++) {
                  rect((i-1.5)*rx*0.15 - 2, -ry*0.25, 4, ry*0.3);
                }
                // Laurel wreath
                fill(100, 150, 50);
                arc(0, -ry*0.3, 14, 12, 0, PI);
                break;
              case 'oracle':
                // Mysterious temple with swirling mist
                fill(150, 140, 160); // temple stone
                rect(-rx*0.2, -ry*0.2, rx*0.4, ry*0.4);
                // Ancient pillars
                fill(170, 160, 180);
                rect(-rx*0.15, -ry*0.15, 4, ry*0.3);
                rect(rx*0.11, -ry*0.15, 4, ry*0.3);
                // Crystal ball glow
                fill(150, 100, 200, 120);
                ellipse(0, -ry*0.05, 8, 8);
                fill(200, 150, 255, 80);
                ellipse(0, -ry*0.05, 12, 12);
                break;
              case 'neutral_port':
                // Harbor with docks and white peace flag
                fill(160, 150, 140); // grey buildings
                rect(-rx*0.25, -ry*0.2, rx*0.5, ry*0.3);
                fill(120, 120, 120);
                rect(-rx*0.3, -ry*0.15, 10, ry*0.25);
                // Peace flag (white)
                fill(255, 255, 255); rect(-1, -ry*0.3, 4, 8);
                fill(200, 200, 255); ellipse(1, -ry*0.28, 6, 4);
                break;
              case 'temple_concord':
                // Beautiful temple with golden roof and doves
                fill(200, 190, 170); // marble
                rect(-rx*0.25, -ry*0.2, rx*0.5, ry*0.35);
                // Golden roof
                fill(255, 200, 50);
                triangle(-rx*0.25, -ry*0.2, 0, -ry*0.3, rx*0.25, -ry*0.2);
                // Olive tree
                fill(80, 100, 60);
                rect(-1, ry*0.05, 2, ry*0.15);
                fill(100, 140, 80);
                ellipse(0, -ry*0.05, 10, 10);
                // Doves (white dots)
                fill(255, 255, 255);
                ellipse(-ry*0.2, -ry*0.15, 3, 3);
                ellipse(ry*0.15, -ry*0.12, 3, 3);
                break;
              // ═══ FACTION CAPITAL ISLANDS ═══
              case 'rome_capital':
                // Roman forum: colosseum arches, red SPQR banner, marble columns
                fill(200, 195, 180); // marble base
                rect(-rx*0.3, -ry*0.15, rx*0.6, ry*0.35);
                // Colosseum arches
                fill(180, 175, 160);
                for (let i = 0; i < 5; i++) {
                  arc((i-2)*rx*0.12, ry*0.05, rx*0.1, ry*0.2, PI, 0);
                }
                // SPQR banner
                fill(180, 30, 30); rect(-2, -ry*0.4, 4, 14);
                fill(255, 200, 0); textSize(5); textAlign(CENTER); text('SPQR', 0, -ry*0.27); textAlign(LEFT, TOP);
                break;
              case 'carthage_capital':
                // Phoenician harbor: purple sails, crescent moon, merchant docks
                fill(180, 160, 130); // sandstone
                rect(-rx*0.25, -ry*0.15, rx*0.5, ry*0.3);
                // Purple sails
                fill(120, 30, 120);
                triangle(-rx*0.2, ry*0.1, -rx*0.15, -ry*0.15, -rx*0.1, ry*0.1);
                triangle(rx*0.1, ry*0.1, rx*0.15, -ry*0.15, rx*0.2, ry*0.1);
                // Crescent moon symbol
                fill(255, 200, 0);
                arc(0, -ry*0.3, 10, 10, -PI*0.75, PI*0.75);
                fill(180, 160, 130);
                arc(2, -ry*0.3, 8, 8, -PI*0.75, PI*0.75);
                break;
              case 'egypt_capital':
                // Egyptian: pyramid, obelisk, golden sands, papyrus
                fill(210, 190, 140); // desert sand base
                // Great pyramid
                fill(200, 175, 120);
                triangle(-rx*0.2, ry*0.1, 0, -ry*0.3, rx*0.2, ry*0.1);
                fill(180, 155, 100);
                triangle(0, -ry*0.3, rx*0.2, ry*0.1, rx*0.05, ry*0.1);
                // Obelisk
                fill(160, 140, 100); rect(rx*0.25 - 2, -ry*0.25, 4, ry*0.3);
                fill(255, 200, 0); triangle(rx*0.25 - 3, -ry*0.25, rx*0.25, -ry*0.32, rx*0.25 + 3, -ry*0.25);
                // Nile blue streak
                stroke(60, 120, 180); strokeWeight(2);
                line(-rx*0.35, ry*0.15, rx*0.35, ry*0.12);
                noStroke();
                break;
              case 'greece_capital':
                // Greek: Parthenon columns, olive wreath, white marble
                fill(230, 225, 215); // white marble
                rect(-rx*0.3, -ry*0.15, rx*0.6, ry*0.3);
                // Parthenon columns
                fill(210, 205, 195);
                for (let i = 0; i < 6; i++) {
                  rect((i-2.5)*rx*0.1 - 1.5, -ry*0.15, 3, ry*0.25);
                }
                // Pediment
                fill(220, 215, 205);
                triangle(-rx*0.3, -ry*0.15, 0, -ry*0.3, rx*0.3, -ry*0.15);
                // Olive wreath
                fill(100, 150, 60);
                arc(0, -ry*0.35, 12, 10, PI, 0);
                break;
              case 'persia_capital':
                // Persian: Persepolis gate, bull capitals, gold/blue tiles
                fill(180, 155, 120); // sandstone
                rect(-rx*0.3, -ry*0.15, rx*0.6, ry*0.35);
                // Gate pillars
                fill(160, 135, 100);
                rect(-rx*0.25, -ry*0.3, 6, ry*0.4);
                rect(rx*0.2, -ry*0.3, 6, ry*0.4);
                // Bull capital icons
                fill(140, 100, 60);
                ellipse(-rx*0.22, -ry*0.32, 8, 6);
                ellipse(rx*0.23, -ry*0.32, 8, 6);
                // Blue-gold decorative band
                fill(30, 80, 160); rect(-rx*0.15, -ry*0.17, rx*0.3, 4);
                fill(255, 200, 50); rect(-rx*0.15, -ry*0.13, rx*0.3, 3);
                break;
              case 'gaul_capital':
                // Celtic: stone circle, wooden longhouse, mistletoe
                fill(100, 130, 80); // deep forest green
                // Stone circle
                fill(150, 150, 140);
                for (let i = 0; i < 6; i++) {
                  let a = i * PI / 3;
                  rect(cos(a)*ry*0.25 - 2, sin(a)*ry*0.25 - 4, 4, 8, 1);
                }
                // Central altar
                fill(120, 120, 110);
                rect(-4, -3, 8, 6, 1);
                // Mistletoe
                fill(180, 200, 80);
                ellipse(0, -ry*0.3, 8, 6);
                fill(255, 255, 200);
                ellipse(-1, -ry*0.28, 2, 2);
                ellipse(2, -ry*0.31, 2, 2);
                break;
              case 'phoenicia_capital':
                // Phoenician: cedar tree, purple dye vats, merchant fleet
                fill(180, 160, 120); // warm sand
                // Great Cedar of Lebanon
                fill(80, 50, 30); rect(-1, -ry*0.15, 3, ry*0.3);
                fill(30, 80, 40);
                for (let i = 0; i < 4; i++) {
                  let w = (4-i)*rx*0.08;
                  triangle(-w, -ry*0.15 - i*ry*0.07, 0, -ry*0.2 - i*ry*0.07, w, -ry*0.15 - i*ry*0.07);
                }
                // Purple dye vats
                fill(100, 20, 100);
                ellipse(-rx*0.2, ry*0.1, 8, 5);
                ellipse(-rx*0.1, ry*0.12, 8, 5);
                break;
              case 'seapeople_capital':
                // Sea People: skull totem, raider ships, dark sails, bonfire
                fill(80, 90, 100); // dark rocky shore
                // Skull totem
                fill(200, 200, 190);
                ellipse(0, -ry*0.25, 10, 12);
                fill(40, 40, 50);
                ellipse(-2, -ry*0.27, 3, 3);
                ellipse(3, -ry*0.27, 3, 3);
                // Raider ship
                fill(60, 40, 30);
                rect(-rx*0.25, ry*0.1, rx*0.2, 4, 2);
                fill(50, 50, 50);
                triangle(-rx*0.2, ry*0.1, -rx*0.15, -ry*0.05, -rx*0.1, ry*0.1);
                // Bonfire
                fill(255, 120, 30, 180);
                ellipse(rx*0.15, -ry*0.05, 8, 10);
                fill(255, 80, 20, 120);
                ellipse(rx*0.15, -ry*0.08, 6, 12);
                break;
            }
            pop();
          }

          // Island name label and controlled marker
          push();
          translate(sx, sy);
          if (dist < 1500) {
            fill(255, 255, 220, 200);
            textSize(10);
            textAlign(CENTER);
            text(isle.name, 0, -ry*0.9);
            // Controlled marker
            if (isIslandControlled(isle.key)) {
              fill(100, 255, 100);
              ellipse(0, -ry*0.5, 6, 6);
            }
          }
          pop();
        }
      }
      if (!_frameBudget.throttled || frameCount % 2 === 0) drawShoreWaves();
      drawAmbientHouses();
      if (!state._activeNation) drawWorldObjectsSorted(); // Skip home island objects when visiting nation
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
    // Castrum entry prompt
    if (state.legia && state.legia.castrumLevel > 0 && !state.insideCastrum) {
      let cdx = state.player.x - state.legia.castrumX;
      let cdy = state.player.y - (state.legia.castrumY + 50);
      if (cdx*cdx + cdy*cdy < 40*40) {
        let sx = w2sX(state.legia.castrumX);
        let sy = w2sY(state.legia.castrumY + 70) + floatOffset;
        // Glow if player has never entered castrum
        if (!state._castrumVisited) {
          let glowAlpha = 80 + sin(frameCount * 0.06) * 40;
          fill(255, 200, 50, glowAlpha);
          noStroke();
          ellipse(w2sX(state.legia.castrumX), w2sY(state.legia.castrumY) + floatOffset, 40, 20);
        }
        fill(255, 220, 120, 200 + sin(frameCount * 0.08) * 40);
        textAlign(CENTER); textSize(11); noStroke();
        text('[E] Enter Castrum', sx, sy);
      }
    }

    // Dive prompt
    if (typeof drawDivePrompt === 'function') drawDivePrompt();

    // Ancient Temple prompt near pyramid — gate behind villa
    if (!state.rowing.active && !state.upgradeShopOpen && _boatUnlocked &&
        dist(state.player.x, state.player.y, state.pyramid.x, state.pyramid.y) < 60) {
      let fpx = w2sX(state.pyramid.x);
      let fpy = w2sY(state.pyramid.y) - 40 + floatOffset;
      fill(255, 220, 150, 200 + sin(frameCount * 0.06) * 30);
      noStroke(); textAlign(CENTER); textSize(10);
      text('[E] Ancient Temple', fpx, fpy);
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
      let _nearKey = state.rowing.nearIsle;
      // Special islands keep original prompts
      if (_nearKey === 'conquest') {
        let isColonized = state.conquest.colonized;
        let label = isColonized ? '[E] Visit Colony' : '[E] Dock at Terra Nova';
        fill(255, 255, 220, 200 + sin(frameCount * 0.08) * 40);
        noStroke(); textAlign(CENTER); textSize(13);
        text(label, width / 2, height * 0.35);
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
      } else if (_nearKey === 'wreck') {
        fill(255, 255, 220, 200 + sin(frameCount * 0.08) * 40);
        noStroke(); textAlign(CENTER); textSize(13);
        text('[E] Dock at Wreck Beach', width / 2, height * 0.35);
      } else {
        // Relationship-aware prompt
        let _dockName = _nearKey;
        if (typeof getWorldIsland === 'function') {
          let _wi = getWorldIsland(_nearKey);
          if (_wi) _dockName = _wi.name;
        }
        if (state.nations && state.nations[_nearKey]) {
          _dockName = typeof getNationName === 'function' ? getNationName(_nearKey) : _nearKey.charAt(0).toUpperCase() + _nearKey.slice(1);
        }

        let _rel = typeof getIslandRelationship === 'function' ? getIslandRelationship(_nearKey) : 'neutral';
        let _promptY = height * 0.35;
        textAlign(CENTER); textSize(14); noStroke();
        let _promptAlpha = 200 + sin(frameCount * 0.08) * 40;

        if (_rel === 'home') {
          fill(80, 200, 80, _promptAlpha);
          text('Visit Home [E]', width/2, _promptY);
        } else if (_rel === 'owned') {
          fill(220, 180, 50, _promptAlpha);
          text('Your Territory: ' + _dockName + ' [E]', width/2, _promptY);
        } else if (_rel === 'ally') {
          fill(80, 140, 220, _promptAlpha);
          text('Visit Ally: ' + _dockName + ' [E]', width/2, _promptY);
        } else if (_rel === 'enemy') {
          fill(220, 60, 60, _promptAlpha);
          text('Invade ' + _dockName + ' [F]', width/2, _promptY);
          if (typeof getWorldIsland === 'function') {
            let _defIsle = getWorldIsland(_nearKey);
            if (_defIsle && _defIsle.defense) {
              fill(200, 160, 100, 180);
              textSize(11);
              text('Defense: ' + _defIsle.defense, width/2, _promptY + 16);
            }
          }
        } else {
          // Neutral
          fill(220, 220, 200, _promptAlpha);
          text('Visit ' + _dockName + ' [E]  /  Invade [F]', width/2, _promptY);
          if (typeof getWorldIsland === 'function') {
            let _defIsle = getWorldIsland(_nearKey);
            if (_defIsle && _defIsle.defense) {
              fill(200, 160, 100, 180);
              textSize(11);
              text('Defense: ' + _defIsle.defense, width/2, _promptY + 16);
            }
          }
        }
      }
    }

    // Sailing speed + wind indicator
    if (state.rowing && state.rowing.active) {
      let spd = state.rowing.speed || 0;
      let _windAng = (state.naval && state.naval.wind) ? state.naval.wind.angle : (frameCount * 0.001);
      let _windStr = (state.naval && state.naval.wind) ? (state.naval.wind.strength || 0.5) : 0.5;
      let _headwind = cos(state.rowing.angle - _windAng);
      let _windFavor = 0.5 + _headwind * 0.5; // 0=headwind, 1=tailwind

      // Mini wind rose (bottom-right corner)
      let _wrx = width - 50, _wry = height - 50;
      push();
      // Background circle
      fill(15, 12, 8, 160); noStroke();
      ellipse(_wrx, _wry, 44, 44);
      stroke(120, 100, 70, 100); strokeWeight(0.5); noFill();
      ellipse(_wrx, _wry, 44, 44);
      // Cardinal ticks
      stroke(160, 140, 100, 120); strokeWeight(1);
      for (let ci = 0; ci < 4; ci++) {
        let ca = ci * HALF_PI - HALF_PI;
        line(_wrx + cos(ca) * 18, _wry + sin(ca) * 18, _wrx + cos(ca) * 20, _wry + sin(ca) * 20);
      }
      noStroke();
      // N label
      fill(220, 200, 140, 180); textSize(7); textAlign(CENTER, CENTER);
      text('N', _wrx, _wry - 15);
      // Wind arrow
      let _wArrLen = 8 + _windStr * 6;
      fill(_windFavor > 0.6 ? color(80, 200, 120, 200) : _windFavor < 0.4 ? color(200, 80, 60, 200) : color(200, 180, 100, 200));
      translate(_wrx, _wry);
      rotate(_windAng);
      triangle(_wArrLen, 0, -_wArrLen * 0.5, -4, -_wArrLen * 0.5, 4);
      // Wind streaks
      stroke(_windFavor > 0.6 ? color(80, 200, 120, 80) : _windFavor < 0.4 ? color(200, 80, 60, 80) : color(200, 180, 100, 80));
      strokeWeight(1);
      line(-_wArrLen * 0.3, -3, -_wArrLen * 0.6, -3);
      line(-_wArrLen * 0.3, 3, -_wArrLen * 0.6, 3);
      noStroke();
      pop();

      // Speed text + wind label
      fill(200, 200, 180, 150); textSize(8); textAlign(RIGHT);
      text('Speed: ' + spd.toFixed(1), width - 20, height - 20);
      let _windLabel = _windFavor > 0.7 ? 'Tailwind' : _windFavor < 0.3 ? 'Headwind' : 'Crosswind';
      let _windCol = _windFavor > 0.7 ? [80, 200, 120] : _windFavor < 0.3 ? [200, 80, 60] : [200, 180, 100];
      fill(_windCol[0], _windCol[1], _windCol[2], 150);
      text(_windLabel, width - 20, height - 10);

      // Distance from home + coordinates
      let _homeDx = state.rowing.x - WORLD.islandCX, _homeDy = state.rowing.y - WORLD.islandCY;
      let _homeDist2 = floor(sqrt(_homeDx * _homeDx + _homeDy * _homeDy));
      fill(160, 160, 150, 120); textSize(7);
      text(_homeDist2 + 'm from home', width - 20, height - 30);

      // Track distance sailed (cumulative stat)
      if (!state._sailDistTotal) state._sailDistTotal = 0;
      state._sailDistTotal += spd * 0.016; // rough dt
    }

    // Compass arrows when sailing
    if (state.rowing.active) {
      let r = state.rowing;
      let islands = [
        { name: 'Home', x: WORLD.islandCX, y: WORLD.islandCY, col: '#88cc88' },
        { name: state.conquest.colonized ? 'Colony LV.' + state.conquest.colonyLevel : 'Terra Nova', x: state.conquest.isleX, y: state.conquest.isleY, col: state.conquest.colonized ? '#88cc88' : '#88aacc' },
        { name: 'Wreck Beach', x: WRECK.cx, y: WRECK.cy, col: '#ccaa66' },
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
      if (typeof drawContextActionBar === 'function') drawContextActionBar();
      if (typeof drawBuildingTooltip === 'function') drawBuildingTooltip();
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
      if (typeof drawDiplomacyPanel === 'function') drawDiplomacyPanel();
      if (typeof drawControlsOverlay === 'function') drawControlsOverlay();
      if (typeof drawArmyBattle === 'function') drawArmyBattle();
      // drawVisualInvasion is called in the world render pass (lines 2383/3172), not here
      if (typeof drawInvasionHUD === 'function') drawInvasionHUD();
      drawRivalDiplomacyUI();
      if (state._activeNation && state.nationDiplomacyOpen) drawNationDiplomacyUI();
      if (state._activeExploration) {
        // Old expedition islands HUD removed
      }
      if (typeof drawTechTreeUI === 'function') drawTechTreeUI();
      if (typeof drawTavernPanel === 'function') drawTavernPanel();
      if (typeof drawSeaEventUI === 'function') drawSeaEventUI();
      if (typeof drawArrivalBanner === 'function') drawArrivalBanner();
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
    // Strategy engine daily tick
    if (typeof StrategyEngine !== 'undefined' && StrategyEngine.session) StrategyEngine.updateStrategy();
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

// ═══ SKY BIRDS, OCEAN, SEASONS, NIGHT MARKET — moved to environment.js ═══

// ═══ BOTTLES, CODEX, VISITORS, TEMPLE COURT — moved to social.js ═══

// ═══ COOKING, WEATHER, HEART MILESTONES — moved to systems.js ═══
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

// ═══ ORACLE, DAILY SUMMARY, CATS, WILDLIFE — moved to lifecycle.js ═══

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

  // Advisor — opens diplomacy panel
  var advX = R.cx + R.hw * 0.55, advY = R.cy - R.hh * 0.3;
  if (dist(state.player.x, state.player.y, advX, advY) < 35) {
    state._diplomacyOpen = !state._diplomacyOpen;
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
  var _cs = FACTION_CASTRUM_STYLE[fk] || FACTION_CASTRUM_STYLE.rome;
  var ft = frameCount, hw = R.hw, hh = R.hh;
  var clv = state.legia ? state.legia.castrumLevel : 1;
  noStroke();
  var _wbase = _cs.wallColor;
  var wc = clv >= 5 ? [_wbase[0]*0.34,_wbase[1]*0.32,_wbase[2]*0.30] : clv >= 3 ? [_wbase[0]*0.30,_wbase[1]*0.28,_wbase[2]*0.26] : [_wbase[0]*0.25,_wbase[1]*0.23,_wbase[2]*0.20];
  fill(_wbase[0]*0.13, _wbase[1]*0.12, _wbase[2]*0.11);
  rect(w2sX(R.cx - hw - 20), w2sY(R.cy - hh - 40), (hw + 20) * 2, (hh + 60) * 2);
  var tileS = 24;
  var _fw = _cs.wallColor;
  var f1 = clv >= 5 ? [_fw[0]*1.1,_fw[1]*1.14,_fw[2]*1.2] : clv >= 3 ? [_fw[0]*0.97,_fw[1]*0.99,_fw[2]*1.02] : [_fw[0]*0.86,_fw[1]*0.81,_fw[2]*0.72];
  var f2 = clv >= 5 ? [_fw[0],_fw[1]*1.03,_fw[2]*1.07] : clv >= 3 ? [_fw[0]*0.86,_fw[1]*0.87,_fw[2]*0.87] : [_fw[0]*0.78,_fw[1]*0.74,_fw[2]*0.65];
  for (var tx = -hw; tx < hw; tx += tileS) {
    for (var ty = -hh; ty < hh; ty += tileS) {
      var light = (floor((tx + hw) / tileS) + floor((ty + hh) / tileS)) % 2 === 0;
      fill(light ? f1[0] : f2[0], light ? f1[1] : f2[1], light ? f1[2] : f2[2]);
      rect(w2sX(R.cx + tx), w2sY(R.cy + ty), tileS, tileS);
    }
  }
  fill(_cs.roofColor[0], _cs.roofColor[1], _cs.roofColor[2]);
  rect(w2sX(R.cx - hw), w2sY(R.cy - hh - 30), hw * 2, 30);
  fill(min(255,_cs.roofColor[0]+30), min(255,_cs.roofColor[1]+30), min(255,_cs.roofColor[2]+30));
  rect(w2sX(R.cx - hw), w2sY(R.cy - hh - 2), hw * 2, 4);
  fill(wc[0]*0.8, wc[1]*0.8, wc[2]*0.8);
  rect(w2sX(R.cx - hw - 10), w2sY(R.cy - hh), 10, hh * 2);
  rect(w2sX(R.cx + hw), w2sY(R.cy - hh), 10, hh * 2);
  if (clv >= 7) { fill(_cs.accentColor[0],_cs.accentColor[1],_cs.accentColor[2],80); rect(w2sX(R.cx - hw), w2sY(R.cy - hh - 4), hw * 2, 2); }
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
    var _ac = _cs.accentColor;
    fill(_ac[0]*0.87,_ac[1]*0.80,_ac[2]*0.45); rect(dx2 - 2, dy2, 4, 14);
    fill(_ac[0]*0.96,_ac[1]*0.90,_ac[2]*0.55); rect(dx2 - 6, dy2 + 2, 12, 3);
    fill(_ac[0]*0.78,_ac[1]*0.72,_ac[2]*0.40); ellipse(dx2, dy2 - 2, 8, 8);
    var wrx = w2sX(sparX + 30), wry = w2sY(sparY - 10);
    fill(_ac[0]*0.54,_ac[1]*0.47,_ac[2]*0.25); rect(wrx, wry, 3, 16);
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
  let _ps = FACTION_CASTRUM_STYLE[state.faction] || FACTION_CASTRUM_STYLE.rome;

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
      fill(_ps.wallColor[0] + 12 - st * 5, _ps.wallColor[1] + 15 - st * 5, _ps.wallColor[2] + 20 - st * 5);
      rect(-stepW / 2, stepY, stepW, 5, 1);
      fill(_ps.wallColor[0] + 25 - st * 4, _ps.wallColor[1] + 28 - st * 4, _ps.wallColor[2] + 33 - st * 4);
      rect(-stepW / 2, stepY, stepW, 2);
      fill(_ps.wallColor[0] - 25 - st * 5, _ps.wallColor[1] - 22 - st * 5, _ps.wallColor[2] - 17 - st * 5, 60);
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
    fill(_ps.wallColor[0] - 5, _ps.wallColor[1] - 2, _ps.wallColor[2] + 3);
    rect(-cellaW / 2, cellaTop - cellaH, cellaW, cellaH);
    stroke(_ps.wallColor[0] - 15, _ps.wallColor[1] - 12, _ps.wallColor[2] - 7, 40);
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
    fill(_ps.wallColor[0] - 20, _ps.wallColor[1] - 18, _ps.wallColor[2] - 13);
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
      fill(_ps.wallColor[0], _ps.wallColor[1] + 4, _ps.wallColor[2] + 9);
      rect(cx2 - colW - 2, colBase - 5, colW * 2 + 4, 5, 1);
      fill(_ps.wallColor[0] + 10, _ps.wallColor[1] + 14, _ps.wallColor[2] + 19);
      rect(cx2 - colW - 1, colBase - 6, colW * 2 + 2, 2, 1);
      // Shaft with entasis
      fill(_ps.wallColor[0] + 15, _ps.wallColor[1] + 18, _ps.wallColor[2] + 23);
      beginShape();
      vertex(cx2 - colW, colBase - 5);
      vertex(cx2 - colW + 0.5, colTop + 6);
      vertex(cx2 + colW - 0.5, colTop + 6);
      vertex(cx2 + colW, colBase - 5);
      endShape(CLOSE);
      // Fluting
      stroke(_ps.wallColor[0] - 5, _ps.wallColor[1] - 2, _ps.wallColor[2] + 3, 50);
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

    fill(_ps.wallColor[0] + 10, _ps.wallColor[1] + 14, _ps.wallColor[2] + 19);
    triangle(-pedW, pedY, pedW, pedY, 0, pedY - pedH);
    // Raking cornice
    stroke(tier >= 4 ? color(212, 170, 64, 180) : color(200, 194, 184));
    strokeWeight(1.5);
    line(-pedW, pedY, 0, pedY - pedH);
    line(pedW, pedY, 0, pedY - pedH);
    line(-pedW, pedY, pedW, pedY);
    noStroke();
    // Tympanum
    fill(_ps.wallColor[0] - 10, _ps.wallColor[1] - 6, _ps.wallColor[2] - 1);
    triangle(-pedW + 5, pedY, pedW - 5, pedY, 0, pedY - pedH + 4);

    // Tympanum sculpture (Tier 3+: faction-specific)
    if (tier >= 3) {
      let tympCY = pedY - pedH * 0.35;
      let _fk = state.faction || 'rome';
      noStroke();
      if (_fk === 'rome') {
        // Eagle silhouette
        fill(_ps.accentColor[0], _ps.accentColor[1], _ps.accentColor[2], 180);
        triangle(-6, tympCY + 3, 0, tympCY - 5, 6, tympCY + 3); // body
        triangle(-10, tympCY, -3, tympCY + 1, -6, tympCY + 4); // left wing
        triangle(10, tympCY, 3, tympCY + 1, 6, tympCY + 4); // right wing
      } else if (_fk === 'carthage') {
        // Elephant silhouette
        fill(_ps.accentColor[0], _ps.accentColor[1], _ps.accentColor[2], 180);
        ellipse(0, tympCY + 1, 10, 8); rect(-2, tympCY + 4, 2, 3); rect(2, tympCY + 4, 2, 3);
        rect(4, tympCY - 1, 3, 4); // trunk
      } else if (_fk === 'egypt') {
        // Gold capstone / ankh
        fill(200, 170, 40, 200);
        triangle(-5, tympCY + 3, 0, tympCY - 6, 5, tympCY + 3);
        fill(220, 190, 50, 160 + sin(pyr.chargePhase) * 40);
        triangle(-3, tympCY + 2, 0, tympCY - 4, 3, tympCY + 2);
      } else if (_fk === 'greece') {
        // Owl face
        fill(220, 215, 200, 180);
        ellipse(0, tympCY, 10, 9);
        fill(200, 180, 50); ellipse(-2, tympCY - 1, 3, 3); ellipse(2, tympCY - 1, 3, 3);
        fill(40); ellipse(-2, tympCY - 1, 1.5, 1.5); ellipse(2, tympCY - 1, 1.5, 1.5);
      } else if (_fk === 'persia') {
        // Winged lion
        fill(_ps.accentColor[0], _ps.accentColor[1], _ps.accentColor[2], 180);
        ellipse(0, tympCY + 1, 8, 6);
        triangle(-8, tympCY - 1, -3, tympCY, -5, tympCY + 3);
        triangle(8, tympCY - 1, 3, tympCY, 5, tympCY + 3);
      } else if (_fk === 'gaul') {
        // Boar head
        fill(_ps.accentColor[0], _ps.accentColor[1], _ps.accentColor[2], 180);
        ellipse(0, tympCY, 10, 7);
        fill(200, 180, 140); rect(3, tympCY - 3, 4, 2); // tusks
      } else if (_fk === 'phoenicia') {
        // Cedar tree
        fill(60, 100, 50, 180);
        triangle(-6, tympCY + 3, 0, tympCY - 5, 6, tympCY + 3);
        fill(80, 50, 30); rect(-1, tympCY + 3, 2, 3);
      } else if (_fk === 'seapeople') {
        // Dragon head
        fill(_ps.accentColor[0], _ps.accentColor[1], _ps.accentColor[2], 200);
        beginShape(); vertex(-4, tympCY + 3); vertex(-3, tympCY - 4); vertex(0, tympCY - 6);
        vertex(3, tympCY - 3); vertex(5, tympCY + 3); endShape(CLOSE);
        fill(200, 50, 30); ellipse(1, tympCY - 2, 2, 2); // eye
      }
    }

    // Apex finial (small, faction-colored — replaces old circle acroteria)
    let acroCol = color(_ps.accentColor[0], _ps.accentColor[1], _ps.accentColor[2]);
    fill(acroCol);
    // Small pointed finial at apex
    triangle(-3, pedY - pedH, 0, pedY - pedH - 8, 3, pedY - pedH);
    // Corner finials
    fill(_ps.wallColor[0] + 10, _ps.wallColor[1] + 14, _ps.wallColor[2] + 19);
    triangle(-pedW + 1, pedY - 1, -pedW + 3, pedY - 6, -pedW + 5, pedY - 1);
    triangle(pedW - 1, pedY - 1, pedW - 3, pedY - 6, pedW - 5, pedY - 1);
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

// ═══ FACTION SELECT SCREEN — moved to faction_select.js ═══
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
  // Farm plots sorted with characters so crops never incorrectly overlap NPCs/player
  state.plots.forEach(p => _sortItems.push({ y: p.y - 20, draw: () => drawOnePlot(p) }));
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
  // Island workers (bot island NPCs: cutter, quarrier, priestess, farmer)
  if (state.workers) {
    for (let _wi = 0; _wi < state.workers.length; _wi++) {
      let w = state.workers[_wi];
      if (isOnScreen(w.x, w.y, 40)) _sortItems.push({ y: w.y, draw: () => drawOneWorker(w) });
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
  if (typeof drawPet === 'function') drawPet();
  // Army escort soldiers rendered by drawEscortSoldier in the Y-sorted pass above
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

// ═══ COMPANIONS — moved to companions.js ═══

// ═══ EFFECTS — moved to effects.js ═══
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

// ═══ MERCHANT SHIP — moved to merchant.js ═══

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

// ═══ EQUIPMENT & MILITARY — moved to military.js ═══

// ─── COLONY OVERLAY — draws colony buildings/farms on settled Terra Nova ──
// ═══ INPUT — moved to input.js ═══

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

// ─── FACTION-SPECIFIC FLORA (for capital islands during sailing) ─────────────
function drawFactionFlora(factionKey, botCX, botCY, isRX, isRY) {
  if (!factionKey) factionKey = 'rome';
  noStroke();

  // Vegetation placed around island perimeter, scaled by island size
  // Alpha decays with distance (handled by caller via _bAlpha pattern)

  if (factionKey === 'rome') {
    // Italian cypress (tall narrow dark green), olive trees (round), stone pine
    let h = isRY * 0.4;
    // Italian cypress trees (tall triangles)
    fill(34, 80, 20, 180);
    let cy1 = w2sY(botCY + isRY * 0.35);
    rect(w2sX(botCX - isRX * 0.4) - 2, cy1 - h, 4, h);
    rect(w2sX(botCX + isRX * 0.4) - 2, cy1 - h, 4, h);
    // Olive trees (round canopy on brown trunk)
    fill(120, 100, 60); // brown trunk
    rect(w2sX(botCX - isRX * 0.25) - 1, cy1 - 8, 2, 8);
    rect(w2sX(botCX + isRX * 0.25) - 1, cy1 - 8, 2, 8);
    fill(140, 150, 90, 180); // silvery-green canopy
    ellipse(w2sX(botCX - isRX * 0.25), cy1 - 10, 16, 14);
    ellipse(w2sX(botCX + isRX * 0.25), cy1 - 10, 16, 14);
    // Stone pine umbrella shape
    fill(100, 120, 50, 180);
    ellipse(w2sX(botCX), w2sY(botCY - isRY * 0.25), 20, 18);
  }
  else if (factionKey === 'carthage') {
    // Date palm (tall trunk + fan top), pomegranate (small red dots), desert scrub
    let h = isRY * 0.5;
    // Date palms (tall trunks with fan-like fronds)
    fill(180, 140, 80); // trunk color
    rect(w2sX(botCX - isRX * 0.35) - 2, w2sY(botCY + isRY * 0.35) - h, 4, h);
    rect(w2sX(botCX + isRX * 0.35) - 2, w2sY(botCY + isRY * 0.35) - h, 4, h);
    // Palm fronds (fan shape at top)
    fill(120, 140, 70, 180);
    ellipse(w2sX(botCX - isRX * 0.35), w2sY(botCY + isRY * 0.35) - h - 4, 14, 8);
    ellipse(w2sX(botCX + isRX * 0.35), w2sY(botCY + isRY * 0.35) - h - 4, 14, 8);
    // Pomegranate bushes (small red/orange dots on green)
    fill(100, 120, 50, 180);
    ellipse(w2sX(botCX - isRX * 0.1), w2sY(botCY + isRY * 0.2), 12, 10);
    fill(200, 80, 40, 180);
    rect(w2sX(botCX - isRX * 0.1) - 3, w2sY(botCY + isRY * 0.2) - 2, 2, 2);
    rect(w2sX(botCX - isRX * 0.1) + 1, w2sY(botCY + isRY * 0.2) + 1, 2, 2);
  }
  else if (factionKey === 'egypt') {
    // Papyrus reeds (thin tall green stalks), palm trees, lotus flowers (pink dots near shore)
    let cy_shore = w2sY(botCY + isRY * 0.35);
    // Papyrus reeds (thin vertical lines near water)
    fill(100, 140, 80, 180);
    for (let i = -2; i <= 2; i++) {
      let px = w2sX(botCX + isRX * (0.25 + i * 0.1));
      rect(px - 1, cy_shore - 20, 2, 20);
    }
    // Palm trees
    fill(160, 120, 70); // trunk
    rect(w2sX(botCX - isRX * 0.3) - 2, cy_shore - 25, 4, 25);
    fill(110, 140, 70, 180); // canopy
    ellipse(w2sX(botCX - isRX * 0.3), cy_shore - 28, 18, 16);
    // Lotus flowers (pink dots near shore)
    fill(200, 120, 160, 180);
    ellipse(w2sX(botCX + isRX * 0.2), cy_shore - 4, 3, 3);
    ellipse(w2sX(botCX - isRX * 0.2), cy_shore - 6, 3, 3);
  }
  else if (factionKey === 'greece') {
    // Olive groves (silvery-green round canopies), laurel bushes, grape vines
    let cy = w2sY(botCY - isRY * 0.2);
    // Olive grove
    fill(140, 150, 90, 180);
    ellipse(w2sX(botCX - isRX * 0.3), cy, 18, 16);
    ellipse(w2sX(botCX + isRX * 0.3), cy, 18, 16);
    ellipse(w2sX(botCX), cy + 10, 16, 14);
    // Laurel bushes
    fill(80, 120, 60, 180);
    ellipse(w2sX(botCX - isRX * 0.1), w2sY(botCY + isRY * 0.25), 12, 10);
    // Grape vines (purple dots on trellis-like shapes)
    fill(140, 80, 160, 180);
    rect(w2sX(botCX + isRX * 0.2) - 1, w2sY(botCY + isRY * 0.15), 2, 12);
    fill(120, 60, 140, 180);
    for (let i = 0; i < 3; i++) {
      ellipse(w2sX(botCX + isRX * 0.2) + 2, w2sY(botCY + isRY * 0.15) + 3 + i * 4, 3, 3);
    }
  }
  else if (factionKey === 'persia') {
    // Organized gardens (rows of trees), cypress avenue, rose bushes (red dots), fountains
    let cy = w2sY(botCY - isRY * 0.15);
    // Cypress avenue (row of narrow trees)
    fill(60, 100, 40, 180);
    for (let i = -1; i <= 1; i++) {
      let cx = w2sX(botCX + isRX * (i * 0.2));
      rect(cx - 2, cy - 30, 4, 30);
    }
    // Rose bushes (red dots on green mounds)
    fill(80, 110, 60, 180);
    ellipse(w2sX(botCX - isRX * 0.25), w2sY(botCY + isRY * 0.3), 14, 12);
    fill(200, 50, 80, 180);
    rect(w2sX(botCX - isRX * 0.25) - 2, w2sY(botCY + isRY * 0.3) - 2, 2, 2);
    rect(w2sX(botCX - isRX * 0.25) + 2, w2sY(botCY + isRY * 0.3) + 1, 2, 2);
    // Fountains (blue circles)
    fill(60, 140, 180, 180);
    ellipse(w2sX(botCX + isRX * 0.3), w2sY(botCY - isRY * 0.3), 8, 8);
  }
  else if (factionKey === 'gaul') {
    // Dense oak forests (large round canopies), wildflowers (colored dots), mushrooms
    let cy = w2sY(botCY - isRY * 0.1);
    // Oak forest (large round canopies)
    fill(80, 120, 50, 180);
    ellipse(w2sX(botCX - isRX * 0.35), cy - 5, 24, 22);
    ellipse(w2sX(botCX + isRX * 0.35), cy - 5, 24, 22);
    ellipse(w2sX(botCX - isRX * 0.1), cy + 15, 20, 18);
    // Wildflowers (scattered colored dots)
    fill(240, 100, 100, 180); // red flowers
    ellipse(w2sX(botCX - isRX * 0.25), w2sY(botCY + isRY * 0.25), 3, 3);
    fill(100, 200, 100, 180); // green flowers
    ellipse(w2sX(botCX + isRX * 0.15), w2sY(botCY + isRY * 0.2), 3, 3);
    fill(200, 150, 50, 180); // yellow flowers
    ellipse(w2sX(botCX), w2sY(botCY + isRY * 0.3), 3, 3);
    // Mushrooms
    fill(200, 100, 80, 180);
    ellipse(w2sX(botCX + isRX * 0.1), w2sY(botCY + isRY * 0.35), 5, 4);
  }
  else if (factionKey === 'phoenicia') {
    // Cedar trees (tall triangular), coastal grass, fishing nets
    let h = isRY * 0.45;
    // Cedar trees (Lebanese cedar - tall triangular)
    fill(60, 90, 40, 180);
    let cx_cedar = w2sX(botCX - isRX * 0.3);
    let cy_cedar = w2sY(botCY + isRY * 0.3);
    rect(cx_cedar - 2, cy_cedar - h, 4, h);
    // Triangular canopy
    for (let layer = 0; layer < 3; layer++) {
      let w = 18 - layer * 4;
      let y = cy_cedar - h + layer * 8;
      fill(80, 110, 50, 180);
      ellipse(cx_cedar, y - w / 2, w, w * 0.7);
    }
    // Coastal grass
    fill(100, 130, 70, 180);
    for (let i = 0; i < 4; i++) {
      let gx = w2sX(botCX + isRX * (0.1 + i * 0.15));
      let gy = w2sY(botCY + isRY * 0.35);
      rect(gx - 1, gy - 8, 2, 8);
    }
    // Fishing nets (brown lines)
    fill(100, 80, 50, 100);
    line(w2sX(botCX + isRX * 0.4), w2sY(botCY + isRY * 0.3), w2sX(botCX + isRX * 0.45), w2sY(botCY + isRY * 0.35));
    line(w2sX(botCX + isRX * 0.42), w2sY(botCY + isRY * 0.25), w2sX(botCX + isRX * 0.48), w2sY(botCY + isRY * 0.33));
  }
  else if (factionKey === 'seapeople') {
    // Sparse scrub, driftwood, kelp/seaweed at shore, dark volcanic rock patches
    let cy_shore = w2sY(botCY + isRY * 0.35);
    // Sparse scrub bushes
    fill(80, 100, 60, 150);
    ellipse(w2sX(botCX - isRX * 0.3), cy_shore - 10, 12, 10);
    ellipse(w2sX(botCX + isRX * 0.25), cy_shore - 5, 10, 8);
    // Driftwood (brown angled lines)
    stroke(100, 70, 40, 150);
    strokeWeight(2);
    line(w2sX(botCX - isRX * 0.1), cy_shore, w2sX(botCX - isRX * 0.1) + 15, cy_shore + 5);
    line(w2sX(botCX + isRX * 0.15), cy_shore + 3, w2sX(botCX + isRX * 0.15) - 12, cy_shore + 8);
    noStroke();
    // Kelp/seaweed at shore (dark green wavy lines)
    fill(40, 80, 50, 150);
    for (let i = -1; i <= 1; i++) {
      let kx = w2sX(botCX + isRX * (0.35 + i * 0.1));
      ellipse(kx, cy_shore + 4, 3, 6);
    }
    // Dark volcanic rock patches
    fill(50, 40, 30, 120);
    ellipse(w2sX(botCX - isRX * 0.4), w2sY(botCY + isRY * 0.1), 14, 12);
    ellipse(w2sX(botCX + isRX * 0.38), w2sY(botCY + isRY * 0.2), 10, 10);
  }
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

// ═══ SEA MAP — minimap showing island positions (M key) ═══
function drawSeaMap() {
  if (!_seaMapOpen) return;
  let mapW = min(400, width - 40), mapH = min(350, height - 40);
  let mx = (width - mapW) / 2, my = (height - mapH) / 2;
  let worldRadius = 7000; // matches sailing boundary
  let scale = min(mapW, mapH) * 0.4 / worldRadius;
  let centerX = mx + mapW / 2, centerY = my + mapH / 2;

  // Background
  noStroke();
  fill(0, 0, 0, 180); rect(0, 0, width, height);
  fill(15, 30, 55); rect(mx, my, mapW, mapH, 6);
  fill(20, 45, 75); rect(mx + 3, my + 3, mapW - 6, mapH - 6, 4);

  // Ocean grid circles
  stroke(30, 55, 90, 80); strokeWeight(0.5); noFill();
  for (let r = 1000; r <= 6000; r += 1000) {
    ellipse(centerX, centerY, r * scale * 2, r * scale * 2);
  }
  noStroke();

  // Compass rose
  fill(80, 100, 130); textSize(8); textAlign(CENTER, CENTER);
  text('N', centerX, my + 14);
  text('S', centerX, my + mapH - 10);
  text('W', mx + 10, centerY);
  text('E', mx + mapW - 10, centerY);

  // Title
  fill(220, 200, 160); textSize(13); textAlign(CENTER, TOP);
  text('SEA CHART', centerX, my + 8);

  // Home island
  let homeSX = centerX, homeSY = centerY;
  fill(100, 200, 100); ellipse(homeSX, homeSY, 10, 8);
  fill(220, 220, 180); textSize(7); textAlign(CENTER, TOP);
  text('HOME', homeSX, homeSY + 6);

  // Player boat (if sailing)
  if (state.rowing && state.rowing.active) {
    let bx = centerX + (state.rowing.x - WORLD.islandCX) * scale;
    let by = centerY + (state.rowing.y - WORLD.islandCY) * scale;
    fill(255, 255, 100); noStroke();
    // Arrow pointing in sailing direction
    push(); translate(bx, by); rotate(state.rowing.angle || 0);
    triangle(0, -4, -3, 3, 3, 3);
    pop();
  }

  // Nation islands
  if (state.nations) {
    for (let k of Object.keys(state.nations)) {
      let n = state.nations[k];
      if (!n || n.defeated) continue;
      let ix = centerX + ((n.isleX || 0) - WORLD.islandCX) * scale;
      let iy = centerY + ((n.isleY || 0) - WORLD.islandCY) * scale;
      // Faction color
      let fc = (typeof FACTIONS !== 'undefined' && FACTIONS[k] && FACTIONS[k].color) ? FACTIONS[k].color : [180, 150, 100];
      let isLevel = n.islandState ? (n.islandState.islandLevel || 1) : (n.level || 1);
      // Dot size based on level
      let dotR = 4 + isLevel * 0.4;
      // Stance color ring
      let stance = n.stance || 'neutral';
      if (stance === 'allied' || n.allied) { stroke(80, 200, 80); strokeWeight(1.5); }
      else if (n.wars && n.wars.length > 0) { stroke(220, 60, 60); strokeWeight(1.5); }
      else if (n.vassal) { stroke(200, 200, 80); strokeWeight(1); }
      else { noStroke(); }
      fill(fc[0], fc[1], fc[2]);
      ellipse(ix, iy, dotR * 2, dotR * 1.6);
      noStroke();
      // Label
      let facName = (typeof FACTIONS !== 'undefined' && FACTIONS[k]) ? FACTIONS[k].name : k;
      fill(220, 210, 190); textSize(6); textAlign(CENTER, TOP);
      text(facName, ix, iy + dotR + 2);
      fill(180, 170, 150); textSize(5);
      text('Lv' + isLevel + ' \u2694' + (n.military || 0), ix, iy + dotR + 10);
    }
  }

  // Exploration islands removed

  // Draw world islands (neutral)
  if (typeof WORLD_ISLANDS !== 'undefined') {
    for (let isle of WORLD_ISLANDS) {
      if (isle.faction) continue; // capitals already drawn as nation dots
      let pos = getIslandWorldPos(isle);
      let ix = centerX + (pos.x - WORLD.islandCX) * scale;
      let iy = centerY + (pos.y - WORLD.islandCY) * scale;
      // Color by type
      let tc = isle.type === 'military' ? [200,80,80] : isle.type === 'economic' ? [200,180,60] : isle.type === 'diplomatic' ? [80,160,200] : [120,180,100];
      let controlled = isIslandControlled(isle.key);
      fill(tc[0], tc[1], tc[2], controlled ? 255 : 150);
      noStroke();
      ellipse(ix, iy, controlled ? 8 : 6, controlled ? 8 : 6);
      // Label on hover
      if (abs(mouseX - ix) < 10 && abs(mouseY - iy) < 10) {
        fill(255, 255, 220);
        textSize(9);
        textAlign(CENTER);
        text(isle.name, ix, iy - 8);
      }
    }
  }

  // Legend
  fill(160, 150, 130); textSize(7); textAlign(CENTER, BOTTOM);
  text('[M] Close   [ESC] Close', centerX, my + mapH - 6);
  textAlign(LEFT, TOP);
}

function drawOneWorker(w) {
  let sx = w2sX(w.x), sy = w2sY(w.y);
  if (sx < -30 || sx > width + 30 || sy < -30 || sy > height + 30) return;
  push(); translate(Math.floor(sx), Math.floor(sy)); noStroke();
  let fDir = (w.targetX || w.x) >= w.x ? 1 : -1;
  let walking = w.state === 'walking' || w.state === 'moving';
  let step = walking ? sin(frameCount * 0.15 + (w.x * 0.1)) * 2 : 0;
  let bob = walking ? abs(sin(frameCount * 0.15 + (w.x * 0.1))) * 0.5 : 0;
  // Role colors
  let tunic, tool;
  if (w.role === 'cutter')    { tunic = [120, 80, 50]; tool = 'axe'; }
  else if (w.role === 'quarrier')  { tunic = [100, 100, 110]; tool = 'pick'; }
  else if (w.role === 'priestess') { tunic = [180, 160, 220]; tool = 'staff'; }
  else if (w.role === 'farmer')    { tunic = [90, 130, 70]; tool = 'hoe'; }
  else { tunic = [140, 120, 100]; tool = null; }
  scale(fDir, 1);
  // Shadow
  fill(0, 0, 0, 25); ellipse(0, 4, 10, 4);
  // Legs
  fill(200, 170, 140);
  rect(-2, -1 - bob, 2, 4); rect(1 + step * 0.2, -1 + bob, 2, 4);
  // Tunic
  fill(tunic[0], tunic[1], tunic[2]); rect(-4, -8, 8, 8);
  // Arms + tool
  fill(200, 170, 140); rect(-5, -6, 2, 5); rect(4, -6, 2, 5);
  if (tool === 'axe' && w.state === 'working') {
    fill(120, 100, 80); rect(5, -8, 1, 6); fill(160, 160, 170); rect(5, -9, 3, 2);
  } else if (tool === 'pick' && w.state === 'working') {
    fill(120, 100, 80); rect(5, -8, 1, 6); fill(140, 140, 150); rect(4, -9, 4, 1);
  } else if (tool === 'staff') {
    fill(160, 140, 80); rect(5, -10, 1, 10); fill(180, 220, 255); ellipse(6, -10, 3, 3);
  } else if (tool === 'hoe' && w.state === 'working') {
    fill(120, 100, 80); rect(5, -8, 1, 6); fill(140, 140, 140); rect(4, -8, 3, 1);
  }
  // Head
  fill(200, 170, 140); rect(-3, -14, 6, 6, 1);
  // Hair by role
  if (w.role === 'priestess') { fill(200, 180, 140); rect(-3, -15, 6, 2); }
  else { fill(60, 40, 25); rect(-3, -15, 6, 2); }
  // Eyes
  fill(40, 30, 20); rect(-1, -12, 1, 1); rect(2, -12, 1, 1);
  // Role label when working
  if (w.state === 'working') {
    scale(fDir, 1); // undo facing for text
    fill(255, 255, 255, 160); textAlign(CENTER, BOTTOM); textSize(6);
    let labels = { cutter: 'Chopping', quarrier: 'Mining', priestess: 'Praying', farmer: 'Farming' };
    text(labels[w.role] || '', 0, -18);
    textAlign(LEFT, TOP);
  }
  pop();
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

// ═══ EXPANSION & ISLAND STATE — moved to expansion.js ═══
// ═══════════════════════════════════════════════════════════════════════════
// ─── SOUND MANAGER — Procedural Audio via p5.sound ─────────────────────
// ═══════════════════════════════════════════════════════════════════════════

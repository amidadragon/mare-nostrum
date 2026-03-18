// MARE NOSTRUM — Cozy Roman Survival-Crafting v2
// Camera-based rendering, expandable island, blueprint building system
// p5.js sketch
p5.disableFriendlyErrors = true;

// ─── GLOBAL TEXT READABILITY — enforce minimum size + dark outlines ──────
const _origTextSize = p5.prototype.textSize;
const MIN_TEXT_SIZE = 11;
p5.prototype.textSize = function(s) {
  return _origTextSize.call(this, max(s, MIN_TEXT_SIZE));
};

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

// ─── GAME SCREEN STATE MACHINE ───────────────────────────────────────────
let gameScreen = 'menu'; // 'menu' | 'settings' | 'credits' | 'game'
let menuHover = -1;      // which menu item is hovered
let menuFadeIn = 0;      // fade-in alpha (0→255 over 1 sec)
let menuKeyIdx = -1;     // keyboard-selected item index (-1 = mouse mode)
let menuFadeOut = 0;     // fade-out alpha (0→255 over 0.5 sec)
let menuFadeAction = null; // action to execute after fade-out
let menuBgImg = null;    // pre-rendered menu background image

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

// ─── STATE ────────────────────────────────────────────────────────────────
let state;
let cam = { x: 600, y: 400 };
let camSmooth = { x: 600, y: 400 };
let particles = [];
let lightningBolts = [];
let stormTimer = 0;
let stormActive = false;
let floatOffset = 0;
let horizonOffset = 0;
let cloudShadows = [
  { x: -0.3, y: -0.1, w: 120, h: 40, speed: 0.15 },
  { x: 0.2, y: 0.15, w: 90, h: 35, speed: 0.12 },
  { x: 0.6, y: -0.05, w: 100, h: 30, speed: 0.18 },
];
let energyArcs = [];
let floatingText = [];
let shakeX = 0, shakeY = 0;
let shakeTimer = 0;
// HUD resource pop animation
let hudFlash = {}; // { key: { timer, delta } } — tracks resource changes for pop effect
let starPositions = null;

// Blueprint types — cost wood, stone, crystals
const BLUEPRINTS = {
  floor:  { name: 'Tile',     w: 32, h: 32, cost: { wood: 2 },                  key: '1', blocks: false },
  wall:   { name: 'Wall',     w: 32, h: 8,  cost: { stone: 2 },                 key: '2', blocks: true },
  door:   { name: 'Arch',     w: 32, h: 8,  cost: { wood: 3 },                  key: '3', blocks: false },
  chest:  { name: 'Arca',     w: 24, h: 20, cost: { wood: 3, crystals: 1 },     key: '4', blocks: true },
  bridge: { name: 'Bridge',   w: 32, h: 32, cost: { wood: 4 },                  key: '5', blocks: false },
  fence:  { name: 'Baluster', w: 32, h: 6,  cost: { wood: 1 },                  key: '6', blocks: true },
  torch:  { name: 'Brazier',  w: 8,  h: 8,  cost: { wood: 1, crystals: 1 },    key: '7', blocks: false },
  flower: { name: 'Roses',    w: 8,  h: 8,  cost: { seeds: 1 },               key: '8', blocks: false },
  lantern:{ name: 'Lucerna',  w: 10, h: 10, cost: { wood: 2, crystals: 1 },   key: '9', blocks: false },
  mosaic: { name: 'Mosaic',   w: 32, h: 32, cost: { stone: 3, crystals: 1 },key: '0', blocks: false },
  aqueduct:{ name: 'Aqueduct',w: 32, h: 12, cost: { stone: 4, wood: 2 },    key: '-', blocks: true },
  bath:    { name: 'Balneum', w: 48, h: 36, cost: { stone: 8, wood: 4, crystals: 3 }, key: '=', blocks: true },
  // Level 5+ (Governor)
  granary: { name: 'Granary',  w: 48, h: 36, cost: { stone: 6, wood: 4 },              key: '', blocks: true,  minLevel: 5 },
  well:    { name: 'Well',     w: 24, h: 24, cost: { stone: 4 },                        key: '', blocks: true,  minLevel: 5 },
  // Level 10+ (Senator)
  temple:  { name: 'Temple',   w: 56, h: 40, cost: { stone: 10, crystals: 5, gold: 20 },key: '', blocks: true,  minLevel: 10 },
  market:  { name: 'Market',   w: 36, h: 28, cost: { wood: 6, stone: 3 },               key: '', blocks: true,  minLevel: 10 },
  // Level 15+ (Consul)
  forum:   { name: 'Forum',    w: 64, h: 48, cost: { stone: 15, gold: 50 },             key: '', blocks: true,  minLevel: 15 },
  watchtower:{ name: 'Tower',  w: 20, h: 44, cost: { stone: 8, ironOre: 4 },            key: '', blocks: true,  minLevel: 15 },
  // Level 20+ (Consul->Imperator)
  arch:    { name: 'Arch',     w: 48, h: 52, cost: { stone: 20, gold: 100, crystals: 10 }, key: '', blocks: false, minLevel: 20 },
  villa:   { name: 'Villa',    w: 60, h: 44, cost: { stone: 15, wood: 10, gold: 75 },   key: '', blocks: true,  minLevel: 20 },
};

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
    crystals: 2,
    wood: 5,
    stone: 3,
    gold: 0,
    fish: 0,

    // Fishing
    fishing: { active: false, timer: 0, biteTime: 0, bite: false, caught: false },

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
      // Combat expansion
      xp: 0, skillPoints: 0, totalXp: 0,
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

    rowing: {
      active: false,
      x: 0, y: 0,       // boat world position
      angle: 0,          // facing angle (radians)
      speed: 0,
      oarPhase: 0,       // animation phase
      wakeTrail: [],     // water wake particles
      nearIsle: null,    // 'arena' or 'conquest' when near dock
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

    // Crystal shrine — far left side of island, well clear of farm grid
    crystalShrine: {
      x: WORLD.islandCX - 440, y: WORLD.islandCY - 15,
    },

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

    // Central pyramid
    pyramid: {
      x: WORLD.islandCX,
      y: WORLD.islandCY - 15,
      level: 1,       // matches island level
      chargePhase: 0,
      charging: false,
      chargeTimer: 0,
    },

    // Build mode
    buildMode: false,
    buildType: 'wall',
    buildRotation: 0,

    // Island expansion
    islandLevel: 1,
    islandRX: WORLD.islandRX,
    islandRY: WORLD.islandRY,

    // Temple blessing — random buff for 1 day
    blessing: { type: null, timer: 0, cooldown: 0 },

    // NPC quest system
    quest: null, // { type, desc, target, progress, reward }

    // Tool upgrades (0=none, 1=bronze, 2=iron)
    tools: { sickle: 0, axe: 0, net: 0 },

    // Cats — ambient near ruins
    cats: [],

    // Crop seeds inventory
    grapeSeeds: 0,
    oliveSeeds: 0,
    cropSelect: 'grain',

    // Cooking system
    meals: 0,        // cooked meals (grain + fish or harvest + wood)
    wine: 0,         // wine (grape harvest)
    oil: 0,          // olive oil
    cooking: { active: false, timer: 0, recipe: null },

    // Weather
    weather: { type: 'clear', timer: 0, intensity: 0 }, // clear, rain, heatwave, fog

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

    // Roman festival
    festival: null,

    // Night Market (appears every 7th day at dusk)
    nightMarket: { active: false, shopOpen: false, stock: [] },

    // Message bottles & treasure
    bottles: [], // { x, y, collected: false, message, treasure: { type, x, y, found } }
    activeTreasure: null, // currently hunting treasure

    // Island visitors (random events)
    visitor: null, // { type, x, y, timer, interacted, dialogTimer, currentLine }

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
    },
    journal: [], // unlocked journal entry IDs: ['shipwreck', 'first_harvest', ...]
    journalOpen: false, // true when viewing journal tab in codex
    codexOpen: false,

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
      isleX: WORLD.islandCX - 2200,
      isleY: WORLD.islandCY,
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

    // Adventure mode (Arena Isle)
    adventure: {
      active: false,
      wave: 0,
      waveTimer: 0,
      waveState: 'idle', // idle, fighting, intermission, victory
      enemies: [],
      loot: [],
      killCount: 0,
      bestWave: 0,
      // Arena isle position (NORTH of home island)
      isleX: WORLD.islandCX,
      isleY: WORLD.islandCY - 900,
      isleRX: 160,
      isleRY: 110,
      returnX: 0, returnY: 0, // saved player pos on home island
    },

    // ─── ISLE OF VULCAN (Southeast) — Volcanic island ───
    vulcan: {
      active: false,
      isleX: WORLD.islandCX + 1800, isleY: WORLD.islandCY + 1700,
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

    // ─── HYPERBOREA (Far North) — Frozen island ───
    hyperborea: {
      active: false,
      isleX: WORLD.islandCX + 400, isleY: WORLD.islandCY - 3000,
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

    // ─── ISLE OF PLENTY (East) — Tropical paradise ───
    plenty: {
      active: false,
      isleX: WORLD.islandCX + 2000, isleY: WORLD.islandCY - 300,
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

    // ─── NECROPOLIS (Far Southwest) — Ancient burial island ───
    necropolis: {
      active: false,
      isleX: WORLD.islandCX - 2400, isleY: WORLD.islandCY + 2500,
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

    // Victory
    won: false,          // true after Imperator ceremony completes
    victoryCeremony: null, // { timer, phase } — active victory cutscene

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

  // ─── ZONE LAYOUT ───
  // Left: farm garden | Center: pyramid + NPC | Right: forest grove
  // Ring: crystals | Edges: ruins + palms

  // Farm plots — dedicated rectangular grid on the left
  state.plots = [];
  rebuildFarmGrid(1);

  // Chickens near farm
  state.chickens = [];
  let farmCX = getFarmCenterX(), farmCY = getFarmCenterY();
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

  // Trees — natural grove flanking the road, loosely organized
  state.trees = [];
  let texcl = getTempleExclusion();
  let pyrCX = state.pyramid ? state.pyramid.x : cx;
  let pyrCY = state.pyramid ? state.pyramid.y : (cy - 15);
  let avenueY = cy - 8; // road centerline
  // Seed RNG for consistent placement
  randomSeed(42);
  // Two loose rows flanking road, plus scattered extras behind
  let treeSlots = [];
  for (let tx = cx + 100; tx <= cx + 360; tx += 48 + random(-8, 8)) {
    // Upper row — offset varies naturally
    treeSlots.push({ x: tx + random(-6, 6), y: avenueY - 26 - random(0, 12) });
    // Lower row
    treeSlots.push({ x: tx + random(-6, 6), y: avenueY + 26 + random(0, 12) });
    // Occasional extra tree set back further (grove depth)
    if (random() > 0.5) treeSlots.push({ x: tx + random(-10, 10), y: avenueY - 48 - random(0, 15) });
    if (random() > 0.6) treeSlots.push({ x: tx + random(-10, 10), y: avenueY + 48 + random(0, 10) });
  }
  randomSeed(millis()); // restore random
  for (let slot of treeSlots) {
    let tx = slot.x, ty = slot.y;
    // Skip if off island surface
    let ex = (tx - cx) / srx, ey = (ty - cy) / sry;
    if (ex * ex + ey * ey > 0.72) continue;
    // Temple exclusion
    let pcx = tx - pyrCX, pcy = ty - pyrCY;
    if (pcx * pcx + pcy * pcy < texcl * texcl) continue;
    let idx = state.trees.length;
    state.trees.push({
      x: tx, y: ty,
      health: 3, maxHealth: 3, alive: true, regrowTimer: 0,
      size: 0.75 + (idx * 7 % 11) * 0.04, swayPhase: idx * 1.3 + (idx % 3) * 0.7,
      type: 'oak',
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

  // Ruin fragments — at island edges only, far from pyramid
  state.ruins = [];
  let ruinAngles = [PI * 0.25, PI * 0.75, PI * 1.5]; // top-right, bottom-left, bottom
  ruinAngles.forEach(a => {
    let rx, ry, placed = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      let r = random(0.55, 0.72);
      rx = cx + cos(a) * srx * r;
      ry = cy + sin(a) * sry * r;
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
  initState();
  colorMode(RGB);
  textFont('monospace');
  // Start on menu — full opacity immediately
  gameScreen = 'menu';
  menuFadeIn = 200;
  // Sound system
  snd = new SoundManager();
}

function startNewGame() {
  initState();
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
  state.grapeSeeds = 0; state.oliveSeeds = 0;
  state.meals = 0; state.wine = 0; state.oil = 0;
  state.solar = 20; // low energy, dawn of exile

  // Populate wreck beach — scavenge nodes for raft building + food
  // Raft needs: 8 wood, 4 rope, 2 cloth. Nodes on beach AND in shallow water.
  let wcx = WRECK.cx, wcy = WRECK.cy;
  state.wreck.scavNodes = [
    // Planks on beach (5 planks = 10 wood)
    { x: wcx - 70, y: wcy + 12, type: 'plank', collected: false },
    { x: wcx + 60, y: wcy + 18, type: 'plank', collected: false },
    { x: wcx + 110, y: wcy + 5, type: 'plank', collected: false },
    { x: wcx - 100, y: wcy + 25, type: 'plank', collected: false },
    { x: wcx + 30, y: wcy + 22, type: 'plank', collected: false },
    // Planks in shallow water (3 — player must wade out)
    { x: wcx - 140, y: wcy + 50, type: 'plank', collected: false },
    { x: wcx + 160, y: wcy + 45, type: 'plank', collected: false },
    { x: wcx + 80, y: wcy + 55, type: 'plank', collected: false },
    // Rope on beach (2 coils)
    { x: wcx - 20, y: wcy - 15, type: 'rope', collected: false },
    { x: wcx + 90, y: wcy - 5, type: 'rope', collected: false },
    // Rope in water (3 — tangled in debris)
    { x: wcx - 50, y: wcy + 48, type: 'rope', collected: false },
    { x: wcx + 140, y: wcy + 52, type: 'rope', collected: false },
    { x: wcx - 120, y: wcy + 42, type: 'rope', collected: false },
    // Cloth on beach (1 torn sail scrap)
    { x: wcx + 40, y: wcy - 8, type: 'cloth', collected: false },
    // Cloth in water (2 — floating sail pieces)
    { x: wcx - 80, y: wcy + 46, type: 'cloth', collected: false },
    { x: wcx + 120, y: wcy + 50, type: 'cloth', collected: false },
    // Coconuts (food — 3)
    { x: wcx + 120, y: wcy - 10, type: 'coconut', collected: false },
    { x: wcx - 110, y: wcy - 8, type: 'coconut', collected: false },
    { x: wcx + 160, y: wcy + 2, type: 'coconut', collected: false },
  ];
  state.wreck.triremeHP = 0;
  state.wreck.raftProgress = 0;
  state.wreck.raftBuilt = false;
  state.wreck.raftWood = 0;
  state.wreck.raftRope = 0;
  state.wreck.raftCloth = 0;
  state.wreck.campfire = false;

  // Palm trees (5 swaying palms around beach edges)
  state.wreck.palms = [
    { x: wcx + 140, y: wcy - 15, size: 1.0, swayPhase: 0, chopped: false },
    { x: wcx - 120, y: wcy - 12, size: 0.85, swayPhase: 1.5, chopped: false },
    { x: wcx + 170, y: wcy + 5, size: 0.9, swayPhase: 3.0, chopped: false },
    { x: wcx - 150, y: wcy + 8, size: 0.75, swayPhase: 4.5, chopped: false },
    { x: wcx + 90, y: wcy - 18, size: 0.95, swayPhase: 2.2, chopped: false },
  ];

  // Crabs (5 cute wandering crabs)
  state.wreck.crabs = [];
  for (let i = 0; i < 5; i++) {
    state.wreck.crabs.push({
      x: wcx + (i - 2) * 50 + random(-20, 20),
      y: wcy + 10 + random(-5, 15),
      vx: 0, vy: 0,
      facing: random() > 0.5 ? 1 : -1,
      state: 'idle', // idle, wander, flee
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
  noCursor();
}

function startLoadGame() {
  initState();
  if (localStorage.getItem('sunlitIsles_save')) {
    loadGame();
    state.introPhase = 'done';
    initConquestIsland();
    initNarrativeState();
    // Snap camera to player position (might be on wreck or home)
    cam.x = state.player.x; cam.y = state.player.y;
    camSmooth.x = cam.x; camSmooth.y = cam.y;
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
}

// ─── CAMERA ───────────────────────────────────────────────────────────────
function updateCamera() {
  // Smooth follow player
  cam.x = state.player.x;
  cam.y = state.player.y;
  camSmooth.x = lerp(camSmooth.x, cam.x, 0.08);
  camSmooth.y = lerp(camSmooth.y, cam.y, 0.08);
}

function w2sX(wx) {
  return (wx - camSmooth.x) + width / 2;
}

function w2sY(wy) {
  return (wy - camSmooth.y) + height / 2;
}

function s2wX(sx) {
  return (sx - width / 2) + camSmooth.x;
}

function s2wY(sy) {
  return (sy - height / 2) + camSmooth.y;
}

// Surface radii match the drawn grass ellipse
function getSurfaceRX() { return state.islandRX * 0.90; }
function getSurfaceRY() { return state.islandRY * 0.36; }

// Dynamic farm center — scales with island size so farm doesn't crowd temple
function getFarmCenterX() { return WORLD.islandCX - getSurfaceRX() * 0.45; }
function getFarmCenterY() { return WORLD.islandCY - getSurfaceRY() * 0.04; }

// Check if world point is on the walkable grass surface
function isOnIsland(wx, wy) {
  let dx = (wx - WORLD.islandCX) / getSurfaceRX();
  let dy = (wy - WORLD.islandCY) / getSurfaceRY();
  return (dx * dx + dy * dy) <= 1.0;
}

// Check if world point is on wreck beach (wider, natural shape)
function isOnWreck(wx, wy) {
  let dx = (wx - WRECK.cx) / (WRECK.rx * 0.9);
  let dy = (wy - WRECK.cy) / (WRECK.ry * 0.55);
  return (dx * dx + dy * dy) <= 1.0;
}

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

// Check if point is on the harbor pier (extends left from port)
function isOnPier(wx, wy) {
  let port = getPortPosition();
  let pierLeft = port.x - 150;
  let pierRight = port.x + 30;
  let pierTop = port.y - 10;
  let pierBot = port.y + 10;
  return wx >= pierLeft && wx <= pierRight && wy >= pierTop && wy <= pierBot;
}

// Check if point is in shallow water (just beyond island edge)
function isInShallows(wx, wy) {
  let dx = (wx - WORLD.islandCX) / getSurfaceRX();
  let dy = (wy - WORLD.islandCY) / getSurfaceRY();
  let d = dx * dx + dy * dy;
  return d > 1.0 && d <= 1.15; // ~15% beyond island edge
}

// Check if a point is walkable (on island, shallows, bridge, pier, or imperial bridge)
function isWalkable(wx, wy) {
  // While diving, player can swim in wider water area around island
  if (state && state.diving && state.diving.active) {
    let dx = (wx - WORLD.islandCX) / (state.islandRX * 2.0);
    let dy = (wy - WORLD.islandCY) / (state.islandRY * 0.8);
    return dx * dx + dy * dy < 1;
  }
  return isOnIsland(wx, wy) || isInShallows(wx, wy) || isOnBridge(wx, wy) || isOnPier(wx, wy) || isOnImperialBridge(wx, wy);
}

// Check if a wall/fence/chest blocks movement at this point
function isBlockedByBuilding(wx, wy) {
  return state.buildings.some(b => {
    if (!BLUEPRINTS[b.type] || !BLUEPRINTS[b.type].blocks) return false;
    let hw = b.w / 2 + 4;
    let hh = (b.type === 'wall' || b.type === 'fence') ? 14 : b.h / 2 + 4;
    let by = (b.type === 'wall') ? b.y - 10 : (b.type === 'fence') ? b.y : b.y;
    return wx >= b.x - hw && wx <= b.x + hw &&
           wy >= by - hh && wy <= by + hh;
  });
}

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
    let farmCX = getFarmCenterX(), farmCY = getFarmCenterY();
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

function draw() {
  // Engine camera bounds for culling
  if (typeof Engine !== 'undefined') Engine.updateCamBounds(camSmooth.x, camSmooth.y, width, height);
  // Delta time
  let now = millis();
  _delta = constrain((now - _prevTime) / 1000, 0.001, 0.1);
  _prevTime = now;
  // Slow-motion effect (boss defeated, dramatic moments)
  if (typeof _slowMoFrames !== 'undefined' && _slowMoFrames > 0) {
    _delta *= 0.25; // quarter speed
    _slowMoFrames--;
  }
  _fpsSmooth = lerp(_fpsSmooth, 1 / _delta, 0.05);

  // ─── MUSIC (plays on all screens) ───
  if (snd && snd.ready) snd.updateLyre();

  // ─── SCREEN ROUTER ───
  if (gameScreen === 'menu' || gameScreen === 'settings' || gameScreen === 'credits') {
    menuFadeIn = min(menuFadeIn + _delta * 255, 255); // 1 sec fade-in
    if (menuFadeOut > 0) {
      menuFadeOut = min(menuFadeOut + _delta * 510, 255); // 0.5 sec fade-out
      if (menuFadeOut >= 255 && menuFadeAction) { menuFadeAction(); menuFadeAction = null; menuFadeOut = 0; }
    }
    drawMenuScreen();
    return;
  }

  // ─── GAME SCREEN ───
  if (!state.isInitialized) return;
  try { drawInner(); } catch(err) {
    console.error('draw error:', err.message, err.stack);
    console.error('state:', state.conquest.active ? 'conquest' : state.adventure.active ? 'adventure' : 'home',
      'enemies:', state.conquest.enemies?.length, 'soldiers:', state.conquest.soldiers?.length,
      'workers:', state.conquest.workers?.length, 'trees:', state.conquest.trees?.length);
    if (state.conquest.active && state._drawErrors > 5) {
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
}
// ─── DITHER HELPERS ───
let _b4 = [0,8,2,10, 12,4,14,6, 3,11,1,9, 15,7,13,5]; // 4x4 Bayer matrix (constant)
function _dith(x, y, t) {
  return t * 16 > _b4[(y & 3) * 4 + (x & 3)];
}


// ═══ MENU SYSTEM — Image background + animated overlays ═════════════════════
// ═══════════════════════════════════════════════════════════════════════════════

// Seeded sparkle positions (generated once)
let _menuSparkles = null;
let _menuDust = null;

function _initMenuParticles() {
  if (_menuSparkles) return;
  _menuSparkles = [];
  for (let i = 0; i < 35; i++) {
    _menuSparkles.push({
      x: 0.30 + (((i * 73 + 17) % 100) / 100) * 0.50, // sea area x: 30%-80%
      y: 0.35 + (((i * 53 + 31) % 100) / 100) * 0.35,  // sea area y: 35%-70%
      freq: 2.0 + (i % 7) * 1.3,
      phase: i * 2.7,
      gold: i % 4 === 0, // every 4th is gold instead of white
    });
  }
  _menuDust = [];
  for (let i = 0; i < 25; i++) {
    _menuDust.push({
      x: ((i * 97 + 11) % 100) / 100,
      y: 0.05 + ((i * 61 + 23) % 100) / 100 * 0.70,
      driftX: 0.002 + (i % 5) * 0.001,
      driftY: 0.001 + (i % 3) * 0.0005,
      freqX: 0.15 + (i % 4) * 0.08,
      freqY: 0.10 + (i % 3) * 0.06,
      phase: i * 1.9,
      fadeFreq: 0.4 + (i % 5) * 0.15,
    });
  }
}

function drawMenuScreen() {
  let w = width, h = height;
  let t0 = millis() / 1000;
  let aF = menuFadeIn / 255;
  noStroke();
  _initMenuParticles();

  // ─── DRAW BACKGROUND IMAGE (cover mode, subtle rocking) ───
  if (menuBgImg) {
    let scale = max(w / menuBgImg.width, h / menuBgImg.height);
    let iw = menuBgImg.width * scale;
    let ih = menuBgImg.height * scale;
    // Slow parallax drift
    let driftX = sin(t0 * 0.04) * w * 0.02;
    let driftY = cos(t0 * 0.03) * h * 0.01;
    // Subtle harbor rocking — very gentle rotation around center
    let rockAngle = sin(t0 * 0.3) * 0.002;
    push();
    translate(w / 2, h / 2);
    rotate(rockAngle);
    image(menuBgImg, -iw / 2 + driftX, -ih / 2 + driftY, iw, ih);
    pop();
  } else {
    // Procedural sky fallback — deep Mediterranean dusk
    for (let y = 0; y < h; y += 2) {
      let t = y / h;
      let r = lerp(8, 25, t);
      let g = lerp(12, 18, t);
      let b = lerp(30, 15, t);
      fill(r, g, b);
      rect(0, y, w, 2);
    }
  }

  // ─── CURSOR ───
  cursor(ARROW);

  // ─── SUB-SCREENS ───
  if (gameScreen === 'settings') { drawSettingsPanel(1); return; }
  if (gameScreen === 'credits') { drawCreditsPanel(1); return; }

  // ═══════════════════════════════════════════════════════════════════════
  // ─── ANIMATED SCENE OVERLAY — brings the background art to life ───
  // ═══════════════════════════════════════════════════════════════════════

  // ─── SUN GLOW PULSE — warm halo behind the sun ───
  let sunCX = w * 0.66, sunCY = h * 0.25;
  let sunPulse = 0.85 + sin(t0 * 0.6) * 0.15;
  fill(255, 220, 120, floor(12 * sunPulse * aF));
  ellipse(sunCX, sunCY, w * 0.35 * sunPulse, h * 0.3 * sunPulse);
  fill(255, 200, 80, floor(8 * sunPulse * aF));
  ellipse(sunCX, sunCY, w * 0.5 * sunPulse, h * 0.45 * sunPulse);

  // ─── WATER SHIMMER — horizontal scan lines on the sea ───
  let waterTop = h * 0.48, waterBot = h * 0.95;
  for (let y = floor(waterTop); y < floor(waterBot); y += 4) {
    let waveOff = sin(t0 * 1.2 + y * 0.03) * 3;
    let waveAlpha = (sin(t0 * 0.8 + y * 0.05) + 1) * 0.5;
    let deepFactor = (y - waterTop) / (waterBot - waterTop);
    fill(100, 180, 255, floor(4 * waveAlpha * aF * (1 - deepFactor * 0.6)));
    rect(waveOff, y, w, 2);
  }

  // ─── SUN REFLECTION COLUMN — shimmering golden path on water ───
  let refX = w * 0.66;
  for (let y = floor(h * 0.38); y < floor(h * 0.85); y += 3) {
    let t = (y - h * 0.38) / (h * 0.47);
    let spreadX = 15 + t * 60;
    let shimA = (sin(t0 * 2.5 + y * 0.08) + 1) * 0.5;
    let offX = sin(t0 * 0.9 + y * 0.04) * spreadX * 0.3;
    fill(255, 210, 120, floor((18 - t * 14) * shimA * aF));
    rect(floor(refX - spreadX / 2 + offX), y, floor(spreadX), 2);
  }

  // ─── BOATS BOBBING — 6 boats at fixed positions, gentle rock ───
  let boats = [
    { x: 0.42, y: 0.72, size: 0.6, phase: 0 },     // small rowboat left
    { x: 0.52, y: 0.62, size: 0.8, phase: 1.2 },    // medium boat center-left
    { x: 0.62, y: 0.68, size: 0.7, phase: 2.4 },    // boat center
    { x: 0.73, y: 0.58, size: 1.2, phase: 0.8 },    // large sailboat right
    { x: 0.55, y: 0.78, size: 0.5, phase: 3.1 },    // tiny boat near shore
    { x: 0.78, y: 0.75, size: 0.55, phase: 1.9 },   // small boat far right
    { x: 0.48, y: 0.88, size: 0.45, phase: 4.2 },   // beached boat
  ];
  for (let boat of boats) {
    let bx = boat.x * w;
    let bobY = sin(t0 * 0.8 + boat.phase) * 2.5 * boat.size;
    let rockAngle = sin(t0 * 0.6 + boat.phase + 1) * 0.03;
    let by = boat.y * h + bobY;
    // Subtle water displacement around boat
    fill(80, 160, 210, floor(15 * aF));
    ellipse(bx, by + 3, 20 * boat.size, 4 * boat.size);
    // Wake ripple
    let wakeA = (sin(t0 * 1.5 + boat.phase) + 1) * 0.3;
    fill(200, 230, 255, floor(12 * wakeA * aF));
    ellipse(bx, by + 2, 25 * boat.size, 3);
  }

  // ─── WOMAN'S HAIR & DRESS SWAY ───
  let womanX = w * 0.34, womanY = h * 0.72;
  // Hair sway — golden streaks
  let hairSway = sin(t0 * 1.5) * 4;
  let hairSway2 = sin(t0 * 1.8 + 0.5) * 3;
  fill(220, 190, 120, floor(25 * aF));
  // Hair strands blowing in wind
  for (let s = 0; s < 5; s++) {
    let sx = womanX - 8 + s * 3 + hairSway * (s * 0.2 + 0.5);
    let sy = womanY - 30 + s * 2;
    let sLen = 15 + s * 3;
    rect(floor(sx), floor(sy + hairSway2 * 0.3), 2, sLen);
  }
  // Dress hem flutter
  fill(220, 215, 225, floor(15 * aF));
  for (let d = 0; d < 4; d++) {
    let dx = womanX - 5 + d * 4 + sin(t0 * 2 + d) * 2;
    let dy = womanY + 15;
    rect(floor(dx), floor(dy + sin(t0 * 1.2 + d * 0.8) * 2), 3, 5);
  }

  // ─── BIRDS — flying across the sky ───
  if (!drawMenuScreen._birds) {
    drawMenuScreen._birds = [];
    for (let i = 0; i < 5; i++) {
      drawMenuScreen._birds.push({
        x: random(0.5, 1.0), y: random(0.12, 0.28),
        speed: random(0.008, 0.015), wingPhase: random(TWO_PI),
        size: random(3, 6),
      });
    }
  }
  for (let bird of drawMenuScreen._birds) {
    bird.x -= bird.speed * 0.016;
    if (bird.x < -0.05) { bird.x = 1.05; bird.y = random(0.1, 0.3); }
    let bx = bird.x * w, by = bird.y * h;
    let wingUp = sin(t0 * 5 + bird.wingPhase) * bird.size * 0.7;
    fill(30, 25, 40, floor(120 * aF));
    // Body
    rect(floor(bx - 1), floor(by), 3, 2);
    // Wings
    rect(floor(bx - bird.size), floor(by - wingUp), bird.size, 1);
    rect(floor(bx + 1), floor(by + wingUp * 0.8), bird.size, 1);
  }

  // ─── SHORE FOAM — animated waterline on the beach (multi-layer) ───
  let shoreY = h * 0.76;
  let foamAdvance = sin(t0 * 0.5) * 4;
  // Layer 1 — leading foam edge
  for (let x = floor(w * 0.08); x < floor(w * 0.42); x += 4) {
    let foamY = shoreY + foamAdvance + sin(x * 0.03 + t0 * 1.2) * 2;
    let foamA = (sin(t0 * 1.5 + x * 0.05) + 1) * 0.5;
    fill(230, 245, 255, floor(25 * foamA * aF));
    rect(x, floor(foamY), 4, 2);
  }
  // Layer 2 — receding foam line (offset phase, moves right)
  let foamAdv2 = sin(t0 * 0.5 + 1.8) * 5;
  for (let x = floor(w * 0.06); x < floor(w * 0.44); x += 3) {
    let foamY2 = shoreY + 4 + foamAdv2 + sin(x * 0.04 + t0 * 1.6 + 2.0) * 2.5;
    let foamA2 = (sin(t0 * 1.2 + x * 0.06 + 1.0) + 1) * 0.5;
    fill(240, 250, 255, floor(18 * foamA2 * aF));
    rect(x, floor(foamY2), 3, 1);
  }
  // Layer 3 — thin trailing foam wisps
  let foamAdv3 = sin(t0 * 0.4 + 3.5) * 3;
  for (let x = floor(w * 0.10); x < floor(w * 0.40); x += 6) {
    let foamY3 = shoreY + 8 + foamAdv3 + sin(x * 0.05 + t0 * 0.9 + 4.0) * 1.5;
    let foamA3 = (sin(t0 * 0.9 + x * 0.08 + 2.5) + 1) * 0.5;
    fill(255, 255, 255, floor(12 * foamA3 * aF));
    rect(x, floor(foamY3), 5, 1);
  }

  // ─── WINDOW LIGHTS — warm glow in building windows (oil lamp flicker) ───
  // Initialize per-light random phases once
  if (!drawMenuScreen._winPhases) {
    drawMenuScreen._winPhases = [];
    for (let i = 0; i < 10; i++) {
      drawMenuScreen._winPhases.push({
        phase1: (i * 7.3 + 2.1) % 6.28,
        phase2: (i * 4.9 + 0.8) % 6.28,
        phase3: (i * 11.1 + 5.3) % 6.28,
        speed1: 2.0 + (i % 4) * 0.7,
        speed2: 3.5 + (i % 3) * 1.2,
        speed3: 5.8 + (i % 5) * 0.9,
      });
    }
  }
  let windows = [
    [0.12, 0.38], [0.15, 0.42], [0.18, 0.35], [0.22, 0.40],
    [0.08, 0.43], [0.25, 0.37], [0.10, 0.46], [0.20, 0.44],
    [0.14, 0.50], [0.06, 0.40],
  ];
  for (let i = 0; i < windows.length; i++) {
    let wx = windows[i][0] * w, wy = windows[i][1] * h;
    let wp = drawMenuScreen._winPhases[i];
    // Multi-frequency flicker for realistic oil lamp effect
    let flicker = 0.6
      + sin(t0 * wp.speed1 + wp.phase1) * 0.18
      + sin(t0 * wp.speed2 + wp.phase2) * 0.12
      + sin(t0 * wp.speed3 + wp.phase3) * 0.08;
    // Occasional dim dip (lamp guttering)
    let gutter = sin(t0 * 0.4 + wp.phase1 * 3.0);
    if (gutter > 0.85) flicker *= 0.5;
    fill(255, 200, 100, floor(24 * flicker * aF));
    rect(floor(wx - 1), floor(wy - 1), 3, 3);
    // Inner bright core
    fill(255, 230, 160, floor(14 * flicker * aF));
    rect(floor(wx), floor(wy), 1, 1);
    // Warm glow halo
    fill(255, 170, 60, floor(10 * flicker * aF));
    ellipse(wx, wy, 14, 10);
  }

  // ─── CYPRESS TREE SWAY — trees on the hillside ───
  let cypresses = [
    [0.28, 0.20, 1.0], [0.32, 0.18, 0.8], [0.38, 0.22, 0.9],
    [0.85, 0.25, 1.1], [0.88, 0.30, 0.85], [0.92, 0.22, 0.95],
    [0.44, 0.28, 0.7],
  ];
  for (let cp of cypresses) {
    let cx2 = cp[0] * w, cy2 = cp[1] * h;
    let sway = sin(t0 * 0.8 + cp[0] * 10) * 2 * cp[2];
    // Subtle overlay sway hint
    fill(30, 60, 30, floor(10 * aF));
    rect(floor(cx2 - 3 + sway), floor(cy2 - 20 * cp[2]), 6, floor(20 * cp[2]));
  }

  // ─── CLOUD DRIFT — semi-transparent shapes drifting slowly ───
  if (!drawMenuScreen._clouds) {
    drawMenuScreen._clouds = [];
    for (let i = 0; i < 4; i++) {
      drawMenuScreen._clouds.push({
        x: random(-0.1, 1.1), y: random(0.05, 0.2),
        w: random(0.08, 0.15), h: random(0.02, 0.04),
        speed: random(0.003, 0.008), alpha: random(5, 12),
      });
    }
  }
  for (let cl of drawMenuScreen._clouds) {
    cl.x += cl.speed * 0.016;
    if (cl.x > 1.15) cl.x = -cl.w - 0.05;
    fill(255, 220, 200, floor(cl.alpha * aF));
    ellipse(cl.x * w, cl.y * h, cl.w * w, cl.h * h);
    fill(255, 230, 210, floor(cl.alpha * 0.6 * aF));
    ellipse(cl.x * w + cl.w * w * 0.2, cl.y * h - cl.h * h * 0.3, cl.w * w * 0.6, cl.h * h * 0.7);
  }

  // ─── BEACH SHELL SPARKLES — occasional glints on the foreground ───
  let shells = [[0.18, 0.85], [0.30, 0.90], [0.42, 0.92], [0.85, 0.88], [0.25, 0.87]];
  for (let i = 0; i < shells.length; i++) {
    let sparkOn = sin(t0 * 1.8 + i * 2.3) > 0.7;
    if (sparkOn) {
      let shx = shells[i][0] * w, shy = shells[i][1] * h;
      fill(255, 250, 230, floor(80 * aF));
      rect(floor(shx - 1), floor(shy - 2), 2, 4);
      rect(floor(shx - 2), floor(shy - 1), 4, 2);
    }
  }

  // ─── CINEMATIC VIGNETTE — dark edges, light center ───
  // Top vignette
  for (let y = 0; y < h * 0.25; y += 2) {
    let a = floor((1 - y / (h * 0.25)) * 120 * aF);
    fill(0, 0, 0, a);
    rect(0, y, w, 2);
  }
  // Bottom vignette — stronger, where menu lives
  for (let y = floor(h * 0.45); y < h; y += 2) {
    let t = (y - h * 0.45) / (h * 0.55);
    let a = floor(t * t * 220 * aF);
    fill(5, 3, 8, a);
    rect(0, y, w, 2);
  }
  // Side vignettes
  for (let x = 0; x < w * 0.15; x += 2) {
    let a = floor((1 - x / (w * 0.15)) * 80 * aF);
    fill(0, 0, 0, a);
    rect(x, 0, 2, h);
    rect(w - x - 2, 0, 2, h);
  }

  // ─── WATER SPARKLES — sea area ───
  for (let i = 0; i < _menuSparkles.length; i++) {
    let sp = _menuSparkles[i];
    let sx = floor(sp.x * w), sy = floor(sp.y * h);
    let on = sin(t0 * sp.freq + sp.phase) > 0.3;
    if (on) {
      let pulse = (sin(t0 * sp.freq * 1.5 + sp.phase) + 1) * 0.5;
      let a = floor((100 + pulse * 120) * aF);
      fill(sp.gold ? 255 : 255, sp.gold ? 210 : 250, sp.gold ? 80 : 230, a);
      rect(sx, sy, 2, 2);
      fill(sp.gold ? 255 : 240, sp.gold ? 200 : 240, sp.gold ? 60 : 210, floor(a * 0.2));
      ellipse(sx + 1, sy + 1, 7, 7);
    }
  }

  // ─── GOLDEN DUST — floating motes ───
  for (let i = 0; i < _menuDust.length; i++) {
    let d = _menuDust[i];
    let dx = (d.x + sin(t0 * d.freqX + d.phase) * 0.04 + t0 * d.driftX) % 1.0;
    let dy = d.y + sin(t0 * d.freqY + d.phase * 0.7) * 0.03;
    dy = ((dy % 0.85) + 0.85) % 0.85 + 0.05;
    let fadeA = (sin(t0 * d.fadeFreq + d.phase) + 1) * 0.5;
    let a = floor(fadeA * 140 * aF);
    if (a > 8) {
      let px = floor(dx * w), py = floor(dy * h);
      fill(255, 210, 90, floor(a * 0.25));
      ellipse(px, py, 6, 6);
      fill(255, 225, 120, a);
      rect(px - 1, py - 1, 2, 2);
    }
  }

  // ─── GOD RAYS — from upper right ───
  let sunX = floor(w * 0.65), sunY = floor(h * 0.2);
  let rayRot = t0 * PI / 240;
  for (let i = 0; i < 9; i++) {
    let angle = -PI * 0.55 + (i - 4) * 0.14 + rayRot;
    let rayLen = h * 0.7;
    let rw = 10 + (i % 3) * 8;
    let rayAlpha = floor((6 + (i % 2) * 4) * aF);
    fill(255, 215, 100, rayAlpha);
    beginShape();
    vertex(sunX, sunY);
    vertex(sunX + cos(angle) * rayLen - rw, sunY + sin(angle) * rayLen);
    vertex(sunX + cos(angle) * rayLen + rw, sunY + sin(angle) * rayLen);
    endShape(CLOSE);
  }

  // ─── ANIMATED HORIZON LINE — golden shimmer ───
  let horizY = floor(h * 0.42);
  let shimmer = sin(t0 * 0.8) * 0.3 + 0.7;
  fill(255, 200, 80, floor(18 * shimmer * aF));
  rect(0, horizY - 1, w, 3);

  // ═══════════════════════════════════════════════════════════════════════
  // ─── TITLE — large, centered, with golden glow ───
  // ═══════════════════════════════════════════════════════════════════════
  let titleAlpha = constrain(menuFadeIn / 180, 0, 1);
  let titleY = floor(h * 0.52);
  let ts = max(36, floor(min(w * 0.06, h * 0.08)));
  let titleBob = sin(t0 * 0.5) * 2;

  textAlign(CENTER, CENTER);
  textFont('Cinzel, Georgia, serif');

  // Title glow halo
  fill(255, 200, 80, floor(20 * titleAlpha));
  noStroke();
  ellipse(w / 2, titleY + titleBob, ts * 10, ts * 3);

  // Ornamental line above title
  let ornW = min(w * 0.35, 280);
  let ornY = titleY - ts * 0.7 + titleBob;
  stroke(200, 170, 100, floor(80 * titleAlpha));
  strokeWeight(1);
  line(w / 2 - ornW / 2, ornY, w / 2 - 20, ornY);
  line(w / 2 + 20, ornY, w / 2 + ornW / 2, ornY);
  // Diamond ornament center
  noStroke();
  fill(220, 190, 120, floor(160 * titleAlpha));
  let dSize = 5;
  beginShape();
  vertex(w / 2, ornY - dSize);
  vertex(w / 2 + dSize, ornY);
  vertex(w / 2, ornY + dSize);
  vertex(w / 2 - dSize, ornY);
  endShape(CLOSE);

  // Title text — multi-layer for depth + golden glow pulse
  textStyle(BOLD);
  textSize(ts);
  // Pulsing golden glow shadow (sin-based size oscillation)
  let glowPulse = 0.5 + sin(t0 * 0.8) * 0.5; // 0..1, slow
  let glowSize = floor(2 + glowPulse * 4); // 2..6px spread
  let glowAlpha = floor((15 + glowPulse * 25) * titleAlpha);
  fill(255, 200, 80, glowAlpha);
  for (let gd = -glowSize; gd <= glowSize; gd += 2) {
    text('MARE NOSTRUM', w / 2 + gd, titleY + titleBob);
    text('MARE NOSTRUM', w / 2, titleY + titleBob + gd);
  }
  // Outer glow
  fill(180, 140, 60, floor(40 * titleAlpha));
  text('MARE NOSTRUM', w / 2, titleY + titleBob + 3);
  text('MARE NOSTRUM', w / 2, titleY + titleBob - 1);
  // Drop shadow
  fill(10, 5, 0, floor(200 * titleAlpha));
  text('MARE NOSTRUM', w / 2 + 2, titleY + titleBob + 3);
  // Main gold text
  let goldPulse = 0.9 + sin(t0 * 1.2) * 0.1;
  fill(244 * goldPulse, 213 * goldPulse, 141, floor(255 * titleAlpha));
  text('MARE NOSTRUM', w / 2, titleY + titleBob);
  // Top highlight
  fill(255, 240, 200, floor(80 * titleAlpha));
  text('MARE NOSTRUM', w / 2, titleY + titleBob - 1);

  // ─── SUBTITLE ───
  let subAlpha = constrain((menuFadeIn - 80) / 175, 0, 1);
  let subY = titleY + ts * 0.65 + titleBob;
  textStyle(ITALIC);
  let subSize = max(11, floor(ts * 0.32));
  textSize(subSize);
  // Shadow
  fill(10, 5, 0, floor(150 * subAlpha));
  text('Shipwrecked.  Sunlit.  Reborn.', w / 2 + 1, subY + 1);
  // Text with pulsing brightness
  let subPulse = 0.85 + sin(t0 * 0.7 + 1) * 0.15;
  fill(212 * subPulse, 169 * subPulse, 106, floor(255 * subAlpha));
  text('Shipwrecked.  Sunlit.  Reborn.', w / 2, subY);

  // Ornamental line below subtitle
  let ornY2 = subY + subSize * 0.8;
  stroke(200, 170, 100, floor(50 * subAlpha));
  strokeWeight(1);
  line(w / 2 - ornW * 0.4, ornY2, w / 2 + ornW * 0.4, ornY2);
  noStroke();

  // ═══════════════════════════════════════════════════════════════════════
  // ─── MENU ITEMS — vertical, centered, with hover effects ───
  // ═══════════════════════════════════════════════════════════════════════
  textStyle(BOLD);
  textFont('Cinzel, Georgia, serif');
  let itemSize = max(13, floor(min(w * 0.02, h * 0.028)));
  textSize(itemSize);

  let hasSave = !!localStorage.getItem('sunlitIsles_save');
  let items = [];
  if (hasSave) items.push('CONTINUE VOYAGE');
  items.push('NEW VOYAGE');
  items.push('SETTINGS', 'CREDITS');
  let itemCount = items.length;

  let menuStartY = floor(h * 0.68);
  let itemGap = max(28, floor(h * 0.048));
  menuHover = -1;
  let isCursorPointer = false;

  for (let i = 0; i < itemCount; i++) {
    // Staggered slide-in: each item delayed, but all reach full alpha
    let slideProgress = constrain((menuFadeIn - 160 - i * 25) / 60, 0, 1);
    let itemAlpha = constrain(menuFadeIn / 255, 0, 1); // overall fade applies equally
    if (slideProgress <= 0) continue;

    let iy = menuStartY + i * itemGap;
    let iw = textWidth(items[i]);
    let hitPad = 16;
    let hovered = mouseX > w / 2 - iw / 2 - hitPad && mouseX < w / 2 + iw / 2 + hitPad &&
                  mouseY > iy - hitPad && mouseY < iy + hitPad;
    if (hovered) { menuHover = i; menuKeyIdx = -1; isCursorPointer = true; }
    let selected = hovered || menuKeyIdx === i;

    // Slide-in offset (items slide in from right, eased)
    let slideEase = 1 - pow(1 - slideProgress, 3); // cubic ease-out
    let slideX = (1 - slideEase) * 60;

    if (selected) {
      // Highlight bar behind text
      let barW = iw + 60;
      fill(200, 170, 80, floor(25 * itemAlpha));
      rect(w / 2 - barW / 2 + slideX, iy - itemSize * 0.55, barW, itemSize * 1.2, 3);

      // Left ornament — animated laurel/arrow
      let arrowX = w / 2 - iw / 2 - 22 + slideX;
      let arrowBob = sin(t0 * 3) * 1.5;
      fill(244, 213, 141, floor(255 * itemAlpha));
      // Roman chevron >>>
      triangle(arrowX + arrowBob, iy - 4, arrowX + arrowBob, iy + 4, arrowX + 8 + arrowBob, iy);
      triangle(arrowX + 6 + arrowBob, iy - 3, arrowX + 6 + arrowBob, iy + 3, arrowX + 12 + arrowBob, iy);

      // Right ornament — mirrored
      let arrowX2 = w / 2 + iw / 2 + 10 + slideX;
      triangle(arrowX2 - arrowBob, iy - 4, arrowX2 - arrowBob, iy + 4, arrowX2 - 8 - arrowBob, iy);
      triangle(arrowX2 - 6 - arrowBob, iy - 3, arrowX2 - 6 - arrowBob, iy + 3, arrowX2 - 12 - arrowBob, iy);

      // Bright gold text
      fill(10, 5, 0, floor(160 * itemAlpha));
      text(items[i], w / 2 + 1 + slideX, iy + 1);
      fill(255, 230, 160, floor(255 * itemAlpha));
      text(items[i], w / 2 + slideX, iy);
    } else {
      // Dim text with subtle shadow
      fill(10, 5, 0, floor(80 * itemAlpha));
      text(items[i], w / 2 + 1 + slideX, iy + 1);
      fill(170, 150, 120, floor(200 * itemAlpha));
      text(items[i], w / 2 + slideX, iy);
    }
  }

  // Set cursor style
  if (isCursorPointer) cursor(HAND);

  // ─── VERSION + HINT at bottom ───
  let botAlpha = constrain((menuFadeIn - 200) / 55, 0, 1);
  textStyle(NORMAL);
  textSize(8);
  fill(120, 110, 90, floor(120 * botAlpha));
  text('v0.9  -  Shipwrecked. Sunlit. Reborn.', w / 2, h - 18);

  // ─── FADES ───
  if (aF < 1) { fill(0, 0, 0, floor(255 * (1 - aF))); rect(0, 0, w, h); }
  if (menuFadeOut > 0) { fill(0, 0, 0, floor(menuFadeOut)); rect(0, 0, w, h); }
}

// ─── SETTINGS PANEL (overlay) ────────────────────────────────────────────
function drawSettingsPanel(fadeA) {
  let w = width, h = height;
  let panW = 280, panH = 340;
  let px = floor(w / 2 - panW / 2), py = floor(h * 0.26);

  fill(0, 0, 0, 160); rect(0, 0, w, h);

  fill(25, 20, 15, 245); rect(px - 2, py - 2, panW + 4, panH + 4);
  fill(40, 34, 26, 252); rect(px, py, panW, panH);
  fill(180, 150, 55, 130);
  rect(px, py, panW, 2); rect(px, py + panH - 2, panW, 2);
  rect(px, py, 2, panH); rect(px + panW - 2, py, 2, panH);

  textAlign(CENTER, CENTER);
  fill(220, 195, 60); textSize(14);
  text('SETTINGS', w / 2, py + 20);

  let fsY = py + 50;
  let fsOn = document.fullscreenElement != null;
  fill(180, 160, 120, 200); textSize(10);
  text('Fullscreen', w / 2 - 30, fsY);
  let tbx = floor(w / 2 + 40), tby = fsY - 7;
  fill(fsOn ? 85 : 45, fsOn ? 130 : 55, fsOn ? 50 : 40, 230);
  rect(tbx, tby, 28, 14);
  fill(220, 210, 180); rect(tbx + (fsOn ? 16 : 2), tby + 2, 10, 10);

  if (snd) {
    let sliderY = py + 80, sliderW = 120, slX = floor(w / 2 + 10);
    let keys = ['master', 'sfx', 'ambient', 'music'];
    let labels = ['Master', 'SFX', 'Ambient', 'Music'];
    for (let ki = 0; ki < keys.length; ki++) {
      fill(180, 160, 120, 200); textSize(10);
      text(labels[ki], w / 2 - 45, sliderY);
      let vol = snd.vol ? snd.vol[keys[ki]] || 0.5 : 0.5;
      fill(40, 35, 28); rect(slX, sliderY - 3, sliderW, 6);
      fill(190, 165, 60); rect(slX, sliderY - 3, floor(vol * sliderW), 6);
      fill(220, 200, 120); rect(slX + floor(vol * sliderW) - 3, sliderY - 5, 6, 10);
      sliderY += 24;
    }
  }

  let delY = py + 250;
  fill(140, 50, 40, 200); textSize(10);
  text('Delete Save Data', w / 2, delY);

  let backY = py + panH - 25;
  let bkH = mouseX > w/2 - 40 && mouseX < w/2 + 40 && mouseY > backY - 8 && mouseY < backY + 10;
  fill(bkH ? 220 : 180, bkH ? 195 : 165, bkH ? 100 : 70);
  textSize(11); text('[ BACK ]', w / 2, backY);
  textAlign(LEFT, TOP);
}

// ─── CREDITS PANEL ───────────────────────────────────────────────────────
function drawCreditsPanel(fadeA) {
  let w = width, h = height;
  let panW = 280, panH = 240;
  let px = floor(w / 2 - panW / 2), py = floor(h * 0.32);

  fill(0, 0, 0, 160); rect(0, 0, w, h);

  fill(25, 20, 15, 245); rect(px - 2, py - 2, panW + 4, panH + 4);
  fill(40, 34, 26, 252); rect(px, py, panW, panH);
  fill(180, 150, 55, 130);
  rect(px, py, panW, 2); rect(px, py + panH - 2, panW, 2);
  rect(px, py, 2, panH); rect(px + panW - 2, py, 2, panH);

  textAlign(CENTER, CENTER);
  fill(220, 195, 60); textSize(14);
  text('CREDITS', w / 2, py + 20);

  fill(200, 180, 140, 220); textSize(9);
  let cy = py + 50;
  let lines = [
    'MARE NOSTRUM', 'Shipwrecked. Sunlit. Reborn.', '',
    'Design & Code', 'Aurelian Forge Studio', '',
    'Engine: p5.js', 'Art: Hand-placed pixel rects', '',
    'Built with love, olive oil,', 'and far too many rect() calls.',
  ];
  for (let i = 0; i < lines.length; i++) {
    let isT = i === 0 || i === 3;
    fill(isT ? 220 : 180, isT ? 195 : 165, isT ? 60 : 120, isT ? 255 : 180);
    textSize(isT ? 11 : 9);
    text(lines[i], w / 2, cy + i * 14);
  }

  let backY = py + panH - 25;
  let bkH = mouseX > w/2 - 40 && mouseX < w/2 + 40 && mouseY > backY - 8 && mouseY < backY + 10;
  fill(bkH ? 220 : 180, bkH ? 195 : 165, bkH ? 100 : 70);
  textSize(11); text('[ BACK ]', w / 2, backY);
  textAlign(LEFT, TOP);
}

// ─── MENU CLICK HANDLER ─────────────────────────────────────────────────
function handleMenuClick() {
  if (gameScreen === 'settings') {
    let py = floor(height * 0.28);
    let fsY = py + 50;
    let tbx = floor(width / 2 + 40), tby = fsY - 7;
    if (mouseX > tbx && mouseX < tbx + 28 && mouseY > tby && mouseY < tby + 14) {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen().catch(() => {});
      return;
    }
    if (snd) {
      let sliderY = py + 80, sliderW = 120, slX = floor(width / 2 + 10);
      let keys = ['master', 'sfx', 'ambient', 'music'];
      for (let k of keys) {
        if (mouseX >= slX - 4 && mouseX <= slX + sliderW + 4 && mouseY >= sliderY - 10 && mouseY <= sliderY + 10) {
          snd.setVolume(k, constrain((mouseX - slX) / sliderW, 0, 1));
          return;
        }
        sliderY += 24;
      }
    }
    let delY = py + 250;
    if (mouseX > width/2 - 60 && mouseX < width/2 + 60 && mouseY > delY - 10 && mouseY < delY + 12) {
      if (localStorage.getItem('sunlitIsles_save')) localStorage.removeItem('sunlitIsles_save');
      return;
    }
    let backY = py + 340 - 25;
    if (mouseX > width/2 - 40 && mouseX < width/2 + 40 && mouseY > backY - 8 && mouseY < backY + 10) {
      gameScreen = 'menu'; return;
    }
    return;
  }
  if (gameScreen === 'credits') {
    let panH = 240, py = floor(height * 0.32);
    let backY = py + panH - 25;
    if (mouseX > width/2 - 40 && mouseX < width/2 + 40 && mouseY > backY - 8 && mouseY < backY + 10) {
      gameScreen = 'menu'; return;
    }
    return;
  }
  if (menuHover < 0 || menuFadeOut > 0) return;
  let hasSave = !!localStorage.getItem('sunlitIsles_save');
  let btns = [];
  if (hasSave) btns.push('load');
  btns.push('new', 'settings', 'credits');
  let action = btns[menuHover];
  if (action === 'settings') { gameScreen = 'settings'; return; }
  if (action === 'credits') { gameScreen = 'credits'; return; }
  // Fade to black, then execute action
  menuFadeOut = 1;
  menuFadeAction = action === 'new' ? startNewGame : startLoadGame;
}

// ─── INTRO CINEMATIC — SHIPWRECK SCENE ────────────────────────────────────
function drawIntroCinematic(dt) {
  state.introTimer += dt;
  let t = state.introTimer;
  let w = width, h = height;

  // Phase timings (in frames at 60fps)
  let FADE_IN = 60;       // 1 sec black fade
  let WRECKAGE = 240;     // 4 sec wreckage scene
  let TEXT_START = 120;    // text appears 2 sec into wreckage
  let WAKE = 360;          // 6 sec — player wakes
  let DONE = 420;          // 7 sec — game starts


  // --- INTRO AUDIO CUES ---
  if (snd && snd.ready) {
    let masterVol = snd.vol.master * snd.vol.ambient;
    // Storm ambient during wreckage (frames 0-240): low rumble wind
    if (t < WRECKAGE) {
      let stormIntensity = min(1, t / FADE_IN);
      snd._windGain.amp(0.14 * stormIntensity * masterVol, 0.3);
      snd._windFilter.freq(40 + sin(frameCount * 0.004) * 20);
      snd._waveGain.amp(0.10 * stormIntensity * masterVol, 0.3);
      snd._waveFilter.freq(180 + sin(frameCount * 0.003) * 40);
    }
    // Thunder crack at frame 180
    if (t >= 180 && t < 182 && !state._introThunderPlayed) {
      state._introThunderPlayed = true;
      snd.playSFX('thunder');
    }
    // Gentle wave transition after wreckage (frames 240+): calm down storm
    if (t >= WRECKAGE && t < DONE) {
      let calm = min(1, (t - WRECKAGE) / 120);
      snd._windGain.amp(lerp(0.14, 0.02, calm) * masterVol, 0.5);
      snd._windFilter.freq(lerp(40, 400, calm));
      snd._waveGain.amp(lerp(0.10, 0.05, calm) * masterVol, 0.5);
      snd._waveFilter.freq(lerp(180, 350, calm));
    }
    // Soft lyre note at exact wake moment (frame 360) -- D4 sine, gentle
    if (t >= WAKE && t < WAKE + 2 && !state._introLyrePlayed) {
      state._introLyrePlayed = true;
      snd._pluckLyre(0, 293.7, 0.10 * snd.vol.master * snd.vol.music, 800);
    }
  }


  // Background — dawn sky gradient
  let skyAlpha = min(1, t / FADE_IN);
  // Deep night → warm dawn
  let skyTop = lerpColor(color(10, 12, 20), color(45, 55, 85), skyAlpha);
  let skyBot = lerpColor(color(10, 12, 20), color(140, 90, 60), skyAlpha);
  noStroke();
  for (let y = 0; y < h; y += 4) {
    let amt = y / h;
    fill(lerpColor(skyTop, skyBot, amt));
    rect(0, y, w, 4);
  }

  // Thunder screen shake near lightning (frame 178-184)
  let thunderShakeX = 0, thunderShakeY = 0;
  if (t >= 176 && t <= 186) {
    let shakeMag = max(0, 1 - abs(t - 180) / 6) * 4;
    thunderShakeX = sin(t * 17.3) * shakeMag;
    thunderShakeY = cos(t * 13.7) * shakeMag;
  }
  push();
  translate(thunderShakeX, thunderShakeY);

  // Ocean — dark choppy water
  let oceanY = floor(h * 0.55);
  fill(25, 50, 65);
  rect(0, oceanY, w, h - oceanY);
  // Wave lines
  for (let i = 0; i < 8; i++) {
    let wy = oceanY + 12 + i * 18;
    let waveOff = floor(sin(frameCount * 0.02 + i * 0.7) * 4);
    fill(35, 65, 80, 40);
    rect(0, wy + waveOff, w, 2);
  }

  // Beach strip
  let beachY = oceanY - 8;
  fill(170, 155, 120);
  rect(0, beachY, w, 16);
  fill(155, 140, 105, 80);
  for (let x = 0; x < w; x += 20) rect(x + floor(sin(x) * 3), beachY + 2, 8, 2);

  // ─── RAIN STREAKS during wreckage phase ───
  if (t > FADE_IN && t < WAKE) {
    let rainAlpha = min(1, (t - FADE_IN) / 60);
    for (let ri = 0; ri < 40; ri++) {
      let rx = ((ri * 137 + floor(t * 3.7)) % w);
      let ry = ((ri * 89 + floor(t * 5.2)) % (h * 0.8));
      let ra = floor((30 + (ri % 3) * 10) * rainAlpha);
      fill(200, 210, 230, ra);
      // Diagonal rain — wind from left
      rect(floor(rx), floor(ry), 1, 6);
      rect(floor(rx + 1), floor(ry + 6), 1, 4);
    }
  }

  // ─── FLOATING DEBRIS in ocean during wreckage ───
  if (t > FADE_IN + 20 && t < WAKE) {
    let debAlpha = min(255, (t - FADE_IN - 20) * 3);
    let debPieces = [
      { x: 0.20, y: 0.62, w: 14, h: 3, phase: 0.0 },
      { x: 0.65, y: 0.65, w: 10, h: 2, phase: 1.5 },
      { x: 0.75, y: 0.60, w: 12, h: 3, phase: 2.8 },
      { x: 0.30, y: 0.70, w: 8,  h: 2, phase: 4.1 },
      { x: 0.80, y: 0.72, w: 11, h: 2, phase: 0.9 },
      { x: 0.50, y: 0.68, w: 9,  h: 3, phase: 3.3 },
      { x: 0.15, y: 0.75, w: 7,  h: 2, phase: 5.0 },
    ];
    for (let dp of debPieces) {
      let dx = dp.x * w + sin(frameCount * 0.01 + dp.phase) * 8;
      let dy = dp.y * h + sin(frameCount * 0.025 + dp.phase) * 3;
      fill(65, 42, 20, debAlpha);
      rect(floor(dx), floor(dy), dp.w, dp.h);
      // Highlight on top edge
      fill(90, 60, 30, debAlpha * 0.5);
      rect(floor(dx + 1), floor(dy), dp.w - 2, 1);
    }
  }

  if (t > FADE_IN) {
    let sceneAlpha = min(255, (t - FADE_IN) * 4);

    // ─── LIGHTNING FLASH at frame 180 ───
    if (t >= 178 && t <= 181) {
      fill(255, 255, 255, floor(200 * (1 - abs(t - 180) / 3)));
      rect(0, 0, w, h);
    }

    // ─── WRECKAGE SCENE ───
    let cx = floor(w * 0.35);
    let cy = beachY - 2;

    // Broken hull — tilted, half-submerged
    push();
    translate(cx, cy);
    rotate(-0.15);
    // Hull planks — dark waterlogged wood
    fill(55, 35, 18, sceneAlpha);
    rect(-40, -8, 80, 12);
    rect(-35, -14, 60, 6);
    rect(-30, 4, 50, 6);
    // Broken ribs
    fill(70, 45, 22, sceneAlpha);
    for (let i = -3; i <= 3; i++) {
      rect(i * 10 - 1, -16, 3, 20);
    }
    // Snapped mast stump
    fill(80, 55, 25, sceneAlpha);
    rect(-3, -30, 6, 16);
    // Torn sail scrap draped over hull
    fill(190, 175, 150, sceneAlpha * 0.6);
    rect(-20, -22, 30, 10);
    fill(140, 35, 25, sceneAlpha * 0.5);
    rect(-15, -18, 20, 4); // red stripe remains
    pop();

    // Scattered debris on beach
    fill(65, 42, 20, sceneAlpha);
    rect(cx + 60, cy + 2, 12, 3);   // plank
    rect(cx + 80, cy + 4, 8, 2);    // plank
    rect(cx - 55, cy + 3, 10, 2);   // plank
    // Amphora (broken jar)
    fill(160, 100, 55, sceneAlpha);
    rect(cx + 50, cy - 4, 6, 8);
    fill(140, 85, 45, sceneAlpha);
    rect(cx + 51, cy - 6, 4, 3);    // neck
    // Rope coil
    fill(120, 95, 55, sceneAlpha);
    rect(cx - 40, cy, 5, 5);
    rect(cx - 39, cy + 1, 3, 3);

    // ─── PLAYER FIGURE — lying on beach ───
    let playerX = floor(w * 0.55);
    let playerY = cy - 1;
    let wakeProgress = max(0, (t - WAKE) / 60); // 0 → 1 as player wakes

    // Dark silhouette shadow behind figure during wake (dramatic backlit effect)
    if (wakeProgress > 0 && wakeProgress < 1.2) {
      let silAlpha = floor(min(1, wakeProgress) * 80);
      let silH = floor(lerp(4, 14, min(1, wakeProgress)));
      let silW = floor(lerp(20, 8, min(1, wakeProgress)));
      fill(10, 5, 0, silAlpha);
      rect(playerX - silW / 2, playerY - silH + 2, silW, silH);
      // Ground shadow elongated by dawn light
      fill(10, 5, 0, floor(silAlpha * 0.4));
      rect(playerX - silW, playerY + 2, silW * 2, 3);
    }

    push();
    translate(playerX, playerY);

    if (wakeProgress <= 0) {
      // Lying down — horizontal figure
      // Cape spread on sand
      fill(160, 50, 38, sceneAlpha * 0.7);
      rect(-14, 0, 28, 4);
      // Body horizontal
      fill(175, 58, 44, sceneAlpha);
      rect(-10, -3, 20, 5); // tunic
      fill(196, 162, 70, sceneAlpha);
      rect(-8, -3, 16, 2);  // armor
      // Head
      fill(212, 165, 116, sceneAlpha);
      rect(10, -5, 6, 6);   // head to the right
      // Dark hair
      fill(61, 43, 31, sceneAlpha);
      rect(10, -5, 6, 2);
      // Arms spread
      fill(212, 165, 116, sceneAlpha);
      rect(-12, -2, 3, 2);
      rect(16, -1, 3, 2);
      // Sandals
      fill(107, 66, 38, sceneAlpha);
      rect(-14, -2, 3, 2);
    } else {
      // Waking up — transitioning from lying to sitting to standing
      let sitAmount = min(1, wakeProgress * 2);
      let standAmount = max(0, (wakeProgress - 0.5) * 2);
      let bodyAngle = lerp(-HALF_PI, 0, sitAmount);

      rotate(bodyAngle);
      // Cape
      fill(196, 64, 50, sceneAlpha);
      rect(-3, -4, 3, 14);
      // Body
      fill(175, 58, 44, sceneAlpha);
      rect(-6, -4, 12, 16);
      fill(196, 162, 70, sceneAlpha);
      rect(-5, -4, 10, 6); // armor
      // Head
      fill(212, 165, 116, sceneAlpha);
      rect(-4, -12, 8, 7);
      fill(61, 43, 31, sceneAlpha);
      rect(-4, -12, 8, 2); // hair
      // Arms
      fill(212, 165, 116, sceneAlpha);
      rect(-7, 0, 2, 4);
      rect(5, 0, 2, 4);
    }
    pop();
  }

  pop(); // end thunder shake transform

  // ─── TEXT OVERLAYS ───
  textAlign(CENTER, CENTER);
  noStroke();

  // Title text — fades in during wreckage phase (character-by-character reveal)
  if (t > TEXT_START && t < DONE) {
    let textAlpha = min(255, (t - TEXT_START) * 3);
    if (t > WAKE) textAlpha = max(0, textAlpha - (t - WAKE) * 5); // fade out

    fill(220, 195, 140, textAlpha);
    textSize(14);
    // Character-by-character reveal (1 char per 2 frames)
    let line1 = 'Shipwrecked by cursed storm...';
    let charsShown1 = min(line1.length, floor((t - TEXT_START) / 2));
    text(line1.substring(0, charsShown1), w / 2, h * 0.2);

    if (t > TEXT_START + 60) {
      let subAlpha = min(255, (t - TEXT_START - 60) * 3);
      if (t > WAKE) subAlpha = max(0, subAlpha - (t - WAKE) * 5);
      fill(180, 160, 120, subAlpha);
      textSize(10);
      let line2 = 'Rebuild under Sol Invictus.';
      let charsShown2 = min(line2.length, floor((t - TEXT_START - 60) / 2));
      text(line2.substring(0, charsShown2), w / 2, h * 0.2 + 22);
    }
  }

  // Skip hint
  if (t > 30 && t < DONE) {
    fill(120, 110, 90, 80 + sin(frameCount * 0.05) * 30);
    textSize(8);
    textAlign(CENTER, BOTTOM);
    text('[ click or press any key to skip ]', w / 2, h - 16);
  }

  // Black fade-in from nothing
  if (t < FADE_IN) {
    fill(0, 0, 0, 255 - (t / FADE_IN) * 255);
    rect(0, 0, w, h);
  }

  // Transition to gameplay
  if (t >= DONE) {
    // Fade to white then start game
    let fadeOut = min(255, (t - DONE) * 6);
    fill(255, 245, 220, fadeOut);
    rect(0, 0, w, h);
    if (fadeOut >= 255) {
      state.introPhase = 'done';
      state.time = 6 * 60; // dawn
      // Snap camera to player (wreck beach or home)
      cam.x = state.player.x; cam.y = state.player.y;
      camSmooth.x = cam.x; camSmooth.y = cam.y;
      // First-minute tutorial hint
      showTutorialHint('Gather materials — walk to glowing nodes and press [E]', state.player.x, state.player.y - 40);
    }
  }

  textAlign(LEFT, TOP);
}

// Skip intro on click or keypress
function skipIntro() {
  if (state.introPhase !== 'done') {
    state.introPhase = 'done';
    state.time = 6 * 60;
    cam.x = state.player.x; cam.y = state.player.y;
    camSmooth.x = cam.x; camSmooth.y = cam.y;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// ─── PRE-REPAIR CUTSCENE — "The Wreck Assessment" ───────────────────
// ═══════════════════════════════════════════════════════════════════════
function startPreRepairCutscene() {
  state.cutscene = 'pre_repair';
  state.cutsceneTimer = 0;
}

function drawPreRepairCutscene(dt) {
  state.cutsceneTimer += dt;
  let t = state.cutsceneTimer;
  let w = width, h = height;
  let P = 2;

  // Timings
  let FADE_IN = 40;
  let EXAMINE = 180;    // character walks to wreck
  let ASSESS = 300;     // looks up at hull
  let PLAN = 400;       // text: "She can be saved"
  let DONE = 480;

  // Background — warm beach scene, late afternoon
  let skyAlpha = min(1, t / FADE_IN);
  noStroke();

  // Sky gradient (golden hour)
  for (let y = 0; y < h * 0.5; y += 4) {
    let amt = y / (h * 0.5);
    let r = lerp(60, 220, amt) * skyAlpha;
    let g = lerp(40, 140, amt) * skyAlpha;
    let b = lerp(80, 55, amt) * skyAlpha;
    fill(r, g, b);
    rect(0, y, w, 4);
  }

  // Sea
  let seaY = floor(h * 0.50);
  for (let y = seaY; y < h * 0.78; y += 4) {
    let amt = (y - seaY) / (h * 0.28);
    fill(lerp(45, 18, amt) * skyAlpha, lerp(75, 35, amt) * skyAlpha, lerp(95, 52, amt) * skyAlpha);
    rect(0, y, w, 4);
  }
  // Wave lines
  for (let i = 0; i < 6; i++) {
    let wy = seaY + 10 + i * 14;
    let wOff = floor(sin(t * 0.03 + i * 0.8) * 3);
    fill(55, 85, 105, 50 * skyAlpha);
    rect(0, wy + wOff, w, 2);
  }

  // Beach
  let beachY = floor(h * 0.78);
  fill(165 * skyAlpha, 148 * skyAlpha, 110 * skyAlpha);
  rect(0, beachY, w, h - beachY);
  // Wet sand shimmer
  fill(140, 120, 85, 60 * skyAlpha);
  for (let x = 0; x < w; x += 18) {
    rect(x + floor(sin(t * 0.02 + x * 0.1) * 2), beachY + 2, 8, 2);
  }

  // Sun (setting, large, warm)
  let sunX = floor(w * 0.7), sunY = floor(h * 0.42);
  fill(255, 200, 80, 60 * skyAlpha);
  ellipse(sunX, sunY, 80, 80);
  fill(255, 220, 120, 120 * skyAlpha);
  ellipse(sunX, sunY, 40, 40);
  fill(255, 240, 190, 200 * skyAlpha);
  ellipse(sunX, sunY, 20, 20);

  // ─── THE WRECK — large, detailed, center-right ───
  let wrX = floor(w * 0.55), wrY = beachY - 4;
  let sceneA = min(255, t * 6);

  // Hull — beached, tilted
  push();
  translate(wrX, wrY);
  rotate(-0.12);

  // Waterlogged hull planks
  fill(50, 32, 16, sceneA);
  rect(-55, -10, 110, 16);
  rect(-50, -18, 90, 8);
  rect(-45, 6, 80, 8);

  // Hull ribs (exposed)
  fill(65, 42, 20, sceneA);
  for (let i = -4; i <= 4; i++) {
    rect(i * 12 - 1, -20, 3, 24);
  }

  // Snapped mast — tall stump
  fill(75, 50, 22, sceneA);
  rect(-3, -50, 7, 32);
  // Jagged break at top
  fill(60, 38, 18, sceneA);
  rect(-4, -52, 3, 4);
  rect(3, -54, 4, 3);

  // Torn sail remnants draped over hull
  fill(185, 170, 140, sceneA * 0.7);
  rect(-25, -32, 40, 14);
  rect(-20, -20, 30, 6);
  // Red stripe on sail
  fill(145, 38, 28, sceneA * 0.5);
  rect(-18, -26, 28, 4);

  // Barnacles on hull
  fill(90, 95, 80, sceneA * 0.5);
  rect(-40, 4, 4, 3); rect(-20, 5, 3, 2); rect(10, 6, 5, 3); rect(30, 4, 3, 3);

  // Anchor chain trailing
  fill(80, 75, 65, sceneA * 0.6);
  rect(45, -2, 3, 12);
  rect(48, 8, 2, 6);

  pop();

  // Scattered debris
  fill(60, 38, 18, sceneA);
  rect(wrX + 75, wrY + 4, 14, 3);
  rect(wrX - 70, wrY + 6, 10, 2);
  rect(wrX + 90, wrY + 2, 8, 2);
  // Broken oar
  fill(70, 48, 25, sceneA);
  rect(wrX - 85, wrY + 1, 22, 3);
  rect(wrX - 87, wrY, 4, 5);
  // Rope
  fill(115, 90, 50, sceneA * 0.8);
  rect(wrX + 65, wrY + 3, 6, 6);

  // ─── PLAYER CHARACTER — walking toward wreck, then examining ───
  let figX, figY;
  let examineT = max(0, (t - FADE_IN) / (EXAMINE - FADE_IN));
  examineT = min(1, examineT);
  // Walk from left toward wreck
  let startX = floor(w * 0.15), endX = floor(w * 0.40);
  figX = floor(lerp(startX, endX, examineT));
  figY = beachY - 2;

  // Draw character
  let charA = min(255, (t - 20) * 8);
  if (charA > 0) {
    // Shadow
    fill(0, 0, 0, charA * 0.2);
    ellipse(figX, figY + 2, 14, 4);

    // Looking up at wreck after reaching it
    let lookUp = t > EXAMINE ? min(1, (t - EXAMINE) / 40) : 0;

    // Cape
    let capeFlap = floor(sin(t * 0.04) * 2);
    fill(155, 48, 38, charA);
    rect(figX - 5 - capeFlap, figY - 16, 4 + capeFlap, 14);

    // Body / tunic
    fill(165, 52, 40, charA);
    rect(figX - 5, figY - 18, 10, 16);

    // Armor strips
    fill(190, 155, 65, charA);
    rect(figX - 4, figY - 18, 8, 5);

    // Head (tilted up when examining)
    let headOff = floor(lookUp * -3);
    fill(205, 160, 110, charA);
    rect(figX - 3, figY - 24 + headOff, 7, 6);
    // Hair
    fill(55, 38, 25, charA);
    rect(figX - 3, figY - 24 + headOff, 7, 2);

    // Arms — one reaching toward wreck when close
    fill(205, 160, 110, charA);
    if (t > ASSESS) {
      // Arm reaching toward hull
      rect(figX + 5, figY - 14, 8, 3);
      rect(figX + 12, figY - 13, 3, 2);
    } else {
      rect(figX - 6, figY - 14, 2, 5);
      rect(figX + 4, figY - 14, 2, 5);
    }

    // Legs
    fill(120, 60, 35, charA);
    rect(figX - 3, figY - 2, 3, 4);
    rect(figX + 1, figY - 2, 3, 4);
    // Sandals
    fill(100, 60, 30, charA);
    rect(figX - 4, figY + 2, 4, 2);
    rect(figX + 1, figY + 2, 4, 2);
  }

  // ─── Footprints in sand (behind character) ───
  if (t > FADE_IN + 20) {
    fill(145, 128, 95, 40 * skyAlpha);
    for (let fp = 0; fp < min(8, floor((t - FADE_IN - 20) / 15)); fp++) {
      let fpx = floor(lerp(startX, figX, fp / 8));
      rect(fpx, figY + 2, 3, 2);
      rect(fpx + 5, figY + 3, 3, 2);
    }
  }

  // ─── TEXT OVERLAYS ───
  textAlign(CENTER, CENTER);
  noStroke();

  // "She's still in one piece..." — examining phase
  if (t > EXAMINE + 30 && t < DONE) {
    let tA = min(255, (t - EXAMINE - 30) * 4);
    if (t > PLAN + 40) tA = max(0, tA - (t - PLAN - 40) * 5);
    fill(220, 195, 140, tA);
    textSize(13);
    text('"She is beyond repair... but the wood can be salvaged."', w / 2, h * 0.18);
  }

  // "I will need wood and stone..." — planning phase
  if (t > PLAN && t < DONE) {
    let tA = min(255, (t - PLAN) * 3);
    if (t > DONE - 40) tA = max(0, tA - (t - DONE + 40) * 6);
    fill(180, 160, 120, tA);
    textSize(10);
    text('Planks for a raft. Rope and cloth for a sail.', w / 2, h * 0.18 + 24);
    if (t > PLAN + 40) {
      let tA2 = min(255, (t - PLAN - 40) * 3);
      if (t > DONE - 40) tA2 = max(0, tA2 - (t - DONE + 40) * 6);
      fill(160, 140, 100, tA2);
      textSize(9);
      text('I must build a raft... and find my way home.', w / 2, h * 0.18 + 44);
    }
  }

  // Skip hint
  if (t > 20 && t < DONE) {
    fill(120, 110, 90, 60 + sin(t * 0.05) * 20);
    textSize(8); textAlign(CENTER, BOTTOM);
    text('[ click or press any key to skip ]', w / 2, h - 16);
  }

  // Black fade-in
  if (t < FADE_IN) {
    fill(0, 0, 0, 255 - (t / FADE_IN) * 255);
    rect(0, 0, w, h);
  }

  // Transition out — warm fade
  if (t >= DONE) {
    let fadeOut = min(255, (t - DONE) * 5);
    fill(255, 240, 210, fadeOut);
    rect(0, 0, w, h);
    if (fadeOut >= 255) {
      state.cutscene = null;
      // Now do the actual first repair
      doFirstRepair();
    }
  }

  textAlign(LEFT, TOP);
}

// ═══════════════════════════════════════════════════════════════════════
// ─── SAILING CUTSCENE — "Departure from the Wreck" ─────────────────
// ═══════════════════════════════════════════════════════════════════════
function startSailingCutscene() {
  state.cutscene = 'sailing';
  state.cutsceneTimer = 0;
}

function drawSailingCutscene(dt) {
  state.cutsceneTimer += dt;
  let t = state.cutsceneTimer;
  let w = width, h = height;

  // Timings
  let FADE_IN = 50;
  let PUSH_OFF = 120;    // ship pushed into water
  let SAILING = 300;     // ship crosses open water
  let ISLAND_APPEAR = 400; // home island fades in
  let ARRIVAL = 520;     // approaching shore
  let DONE = 600;

  // --- SAILING AUDIO CUES ---
  if (snd && snd.ready) {
    let masterVol = snd.vol.master * snd.vol.ambient;
    // Steady wind ambient (~300Hz filtered noise)
    let windAmt = min(1, t / FADE_IN);
    snd._windGain.amp(0.08 * windAmt * masterVol, 0.3);
    snd._windFilter.freq(300 + sin(frameCount * 0.002) * 60);
    // Gentle waves
    snd._waveGain.amp(0.05 * windAmt * masterVol, 0.3);
    snd._waveFilter.freq(280 + sin(frameCount * 0.003) * 50);
    // Oar splash every ~120 frames
    if (t > PUSH_OFF && t < DONE && floor(t) % 120 === 0 && floor(t) !== floor(t - dt)) {
      snd.playSFX('oar_splash');
    }
    // Seagull call every ~200 frames
    if (t > PUSH_OFF && t < DONE && floor(t) % 200 === 0 && floor(t) !== floor(t - dt)) {
      snd.playSFX('seagull');
    }
  }

  let skyAlpha = min(1, t / FADE_IN);
  noStroke();

  // ─── SKY — dawn breaking over open sea ───
  for (let y = 0; y < h * 0.45; y += 4) {
    let amt = y / (h * 0.45);
    let r = lerp(25, 240, amt) * skyAlpha;
    let g = lerp(20, 160, amt) * skyAlpha;
    let b = lerp(55, 65, amt) * skyAlpha;
    fill(r, g, b);
    rect(0, y, w, 4);
  }

  // Sun rising (dramatic)
  let sunRise = min(1, max(0, (t - PUSH_OFF) / 200));
  let sunX = floor(w * 0.5), sunY = floor(h * 0.38 - sunRise * 30);
  if (t > PUSH_OFF) {
    // Sun glow
    fill(255, 200, 80, 30 * skyAlpha * sunRise);
    ellipse(sunX, sunY, 120, 120);
    fill(255, 220, 100, 60 * skyAlpha * sunRise);
    ellipse(sunX, sunY, 60, 60);
    fill(255, 240, 180, 180 * skyAlpha * sunRise);
    ellipse(sunX, sunY, 24, 24);

    // God rays
    for (let ri = 0; ri < 5; ri++) {
      let angle = -1.0 + ri * 0.4 + sin(t * 0.005 + ri) * 0.05;
      let rayLen = 60 + ri * 20;
      fill(255, 220, 100, 8 * skyAlpha * sunRise);
      for (let rd = 12; rd < rayLen; rd += 4) {
        let rx = sunX + floor(cos(angle) * rd);
        let ry = sunY + floor(sin(angle) * rd);
        if (ry > 0 && ry < h * 0.45) rect(rx, ry, 3, 3);
      }
    }
  }

  // ─── SEA — vast, open water ───
  let seaY = floor(h * 0.45);
  for (let y = seaY; y < h; y += 4) {
    let amt = (y - seaY) / (h - seaY);
    let r = lerp(40, 15, amt) * skyAlpha;
    let g = lerp(70, 28, amt) * skyAlpha;
    let b = lerp(95, 48, amt) * skyAlpha;
    fill(r, g, b);
    rect(0, y, w, 4);
  }

  // Wave crests
  for (let i = 0; i < 10; i++) {
    let wy = seaY + 8 + i * floor((h - seaY) / 10);
    let wOff = floor(sin(t * 0.025 + i * 1.1) * 3);
    let wLen = 30 + floor(sin(i * 2.3) * 15);
    let wX = floor(w * 0.3 + sin(t * 0.01 + i * 0.7) * w * 0.2);
    fill(55, 85, 110, 35 * skyAlpha);
    rect(wX, wy + wOff, wLen, 2);
  }

  // Sun reflection path on water
  if (t > PUSH_OFF) {
    for (let y = seaY + 4; y < h; y += 6) {
      let shimmer = sin(t * 0.04 + y * 0.12) * 0.5 + 0.5;
      if (shimmer > 0.4) {
        let reflW = floor((2 + shimmer * 6) * (1 - (y - seaY) / (h - seaY)));
        let reflX = sunX + floor(sin(t * 0.015 + y * 0.03) * 8);
        fill(255, 210, 90, floor(shimmer * 25 * skyAlpha * sunRise));
        rect(reflX - reflW / 2, y, max(1, reflW), 2);
      }
    }
  }

  // ─── SEAGULLS — flying overhead ───
  if (!drawSailingCutscene._gulls) {
    drawSailingCutscene._gulls = [
      { x: 0.3, y: 0.18, speed: 0.012, wingPhase: 0, size: 5 },
      { x: 0.6, y: 0.22, speed: 0.009, wingPhase: 2.1, size: 4 },
      { x: 0.8, y: 0.14, speed: 0.015, wingPhase: 4.3, size: 3.5 },
    ];
  }
  for (let gull of drawSailingCutscene._gulls) {
    gull.x -= gull.speed * 0.016;
    if (gull.x < -0.05) { gull.x = 1.1; gull.y = 0.12 + (gull.wingPhase * 37 % 15) / 100; }
    let gx = gull.x * w, gy = gull.y * h;
    let wingUp = sin(t * 0.08 + gull.wingPhase) * gull.size * 0.6;
    fill(40, 35, 50, floor(140 * skyAlpha));
    // Body
    rect(floor(gx - 1), floor(gy), 3, 2);
    // V-shape wings
    rect(floor(gx - gull.size), floor(gy - wingUp), floor(gull.size), 1);
    rect(floor(gx + 1), floor(gy + wingUp * 0.7), floor(gull.size), 1);
  }

  // ─── SUN SHIMMER LINE on water — golden reflection band ───
  if (t > PUSH_OFF) {
    let shimBand = floor(seaY + 6);
    for (let sy = shimBand; sy < shimBand + 12; sy += 2) {
      let shimW = floor(20 + sin(t * 0.03 + sy * 0.2) * 12);
      let shimX = sunX + floor(sin(t * 0.02 + sy * 0.1) * 6) - shimW / 2;
      let shimA = floor((sin(t * 0.05 + sy * 0.15) + 1) * 12 * skyAlpha * sunRise);
      fill(255, 220, 100, shimA);
      rect(floor(shimX), sy, shimW, 2);
    }
  }

  // ─── DISTANT ISLAND SILHOUETTE — gradually appearing on horizon ───
  if (t > SAILING && t < ISLAND_APPEAR + 60) {
    let distAppear = min(1, (t - SAILING) / 200);
    let distX = floor(w * 0.88);
    let distY = floor(seaY + 2);
    let distA = floor(distAppear * 60 * skyAlpha);
    // Low dark landmass on horizon
    fill(25, 30, 40, distA);
    rect(distX - 20, distY - 4, 40, 6);
    rect(distX - 14, distY - 7, 28, 4);
    rect(distX - 6, distY - 10, 12, 4);
  }

  // ─── WRECK ISLAND — receding behind (left side, shrinking) ───
  if (t < ISLAND_APPEAR + 60) {
    let recede = min(1, max(0, (t - PUSH_OFF) / 250));
    let isleX = floor(lerp(w * 0.2, -w * 0.1, recede));
    let isleScale = lerp(1.0, 0.4, recede);
    let isleY = floor(h * 0.43);
    let isleA = floor((1 - recede * 0.7) * 180 * skyAlpha);

    // Island silhouette
    fill(35, 30, 22, isleA);
    let iW = floor(80 * isleScale), iH = floor(20 * isleScale);
    rect(isleX - iW / 2, isleY - iH, iW, iH);
    // Hill
    rect(isleX - iW * 0.3, isleY - iH - floor(8 * isleScale), floor(iW * 0.5), floor(8 * isleScale));
    // Palm
    rect(isleX + floor(iW * 0.2), isleY - iH - floor(14 * isleScale), floor(2 * isleScale), floor(12 * isleScale));
  }

  // ─── THE TRIREME — sailing across ───
  let shipProgress = min(1, max(0, (t - PUSH_OFF) / (ARRIVAL - PUSH_OFF)));
  // Ease in-out
  let shipEase = shipProgress < 0.5 ?
    2 * shipProgress * shipProgress :
    1 - pow(-2 * shipProgress + 2, 2) / 2;

  let shipX = floor(lerp(w * 0.25, w * 0.65, shipEase));
  let shipY = floor(h * 0.55);
  let bob = floor(sin(t * 0.04) * 3);
  shipY += bob;

  let shipA = min(255, t * 5);

  // Wake trail behind ship
  if (t > PUSH_OFF) {
    for (let wi = 0; wi < 8; wi++) {
      let wakeX = shipX - 15 - wi * 12;
      let wakeY = shipY + 8 + floor(sin(t * 0.03 + wi * 0.5) * 2);
      let wakeA = max(0, 40 - wi * 5) * skyAlpha;
      fill(170, 200, 215, wakeA);
      rect(wakeX, wakeY, 10 - wi, 2);
    }
  }

  push();
  translate(shipX, shipY);

  // Hull
  fill(55, 35, 18, shipA);
  rect(-30, 0, 60, 2);
  rect(-28, 2, 56, 2);
  rect(-32, -2, 64, 2);
  rect(-34, -4, 68, 2);
  rect(-32, -6, 64, 2);
  rect(-30, -8, 60, 2);

  // Stern (left)
  rect(-35, -6, 2, 2);
  rect(-36, -8, 2, 2);
  rect(-37, -10, 2, 2);
  rect(-36, -12, 2, 2);
  rect(-34, -13, 2, 2); // curl

  // Prow (right) — proud and forward
  rect(32, -4, 2, 2);
  rect(34, -6, 2, 2);
  rect(35, -8, 3, 2);
  // Ram
  rect(36, 0, 4, 2);

  // Hull plank detail
  fill(45, 28, 14, shipA * 0.7);
  rect(-24, -2, 48, 1);
  rect(-22, 1, 44, 1);

  // Patched hull sections (lighter wood — repaired!)
  fill(100, 75, 40, shipA * 0.6);
  rect(-18, -4, 12, 4);
  rect(8, -4, 10, 4);

  // Rim light
  fill(190, 155, 65, shipA * 0.3);
  rect(-28, -8, 56, 1);

  // ─── MAST — repaired, standing tall ───
  fill(70, 48, 22, shipA);
  rect(-1, -42, 4, 34);
  // Cross yard
  rect(-16, -38, 34, 2);

  // ─── SAIL — patched but full of wind ───
  let sailBillow = floor(sin(t * 0.05) * 2);
  // Main body (cream, billowing right = moving right)
  fill(195, 180, 155, shipA * 0.85);
  rect(-14, -36, 16 + sailBillow, 4);
  rect(-13, -32, 18 + sailBillow, 4);
  rect(-12, -28, 20 + sailBillow * 2, 4);
  rect(-11, -24, 18 + sailBillow, 4);
  rect(-10, -20, 14 + sailBillow, 4);

  // Patch marks (darker spots showing repairs)
  fill(140, 120, 90, shipA * 0.5);
  rect(-8, -30, 6, 4);
  rect(0 + sailBillow, -22, 5, 3);

  // Red stripe (Roman eagle sail marking)
  fill(150, 42, 30, shipA * 0.6);
  rect(-12, -28, 18 + sailBillow, 3);

  // Rope rigging
  fill(100, 80, 50, shipA * 0.5);
  // Stays to mast
  rect(-16, -38, 1, 8); rect(18, -38, 1, 8);

  // ─── OARS — rowing in unison ───
  for (let oi = 0; oi < 4; oi++) {
    let oarPhase = sin(t * 0.06 + oi * 0.8);
    let ox = -18 + oi * 10;
    let oarDip = floor(oarPhase * 3);
    fill(60, 40, 20, shipA * 0.7);
    rect(ox, 2, 2, 8 + oarDip);
    // Blade
    rect(ox - 1, 8 + oarDip, 4, 2);
  }

  // ─── FIGURE on deck — standing at prow ───
  // Body
  fill(165, 52, 40, shipA);
  rect(20, -16, 6, 10);
  // Head
  fill(205, 160, 110, shipA);
  rect(21, -20, 5, 4);
  // Cape flowing back
  let capeF = floor(sin(t * 0.04) * 2);
  fill(150, 42, 32, shipA * 0.8);
  rect(16 - capeF, -14, 4 + capeF, 8);
  // Arm pointing forward
  fill(205, 160, 110, shipA * 0.9);
  rect(26, -14, 5, 2);

  pop();

  // ─── HOME ISLAND — appearing on right horizon ───
  if (t > ISLAND_APPEAR) {
    let appear = min(1, (t - ISLAND_APPEAR) / 120);
    let homeX = floor(lerp(w * 1.1, w * 0.82, appear));
    let homeY = floor(h * 0.43);
    let homeA = floor(appear * 200 * skyAlpha);

    // Island mass — larger, with buildings
    fill(45, 55, 35, homeA);
    rect(homeX - 50, homeY - 12, 100, 16);
    rect(homeX - 40, homeY - 20, 80, 10);
    rect(homeX - 30, homeY - 26, 60, 8);
    // Hill peak
    rect(homeX - 15, homeY - 32, 30, 8);

    // Temple/villa on hilltop
    fill(140, 125, 95, homeA * 0.8);
    // Columns
    for (let ci = -2; ci <= 2; ci++) {
      rect(homeX + ci * 5, homeY - 40, 2, 8);
    }
    // Pediment
    rect(homeX - 12, homeY - 41, 24, 2);
    rect(homeX - 8, homeY - 43, 16, 2);
    rect(homeX - 4, homeY - 45, 8, 2);

    // Warm glow from windows
    let glow = sin(t * 0.02) * 0.3 + 0.7;
    fill(255, 200, 80, homeA * 0.3 * glow);
    rect(homeX - 6, homeY - 38, 3, 3);
    rect(homeX + 3, homeY - 38, 3, 3);

    // Trees
    fill(35, 55, 28, homeA * 0.7);
    rect(homeX - 40, homeY - 24, 8, 6);
    rect(homeX + 30, homeY - 22, 10, 6);
    rect(homeX - 25, homeY - 28, 6, 5);

    // Lighthouse/port beacon
    if (appear > 0.5) {
      let beaconA = floor((appear - 0.5) * 2 * 255);
      fill(255, 220, 100, beaconA * 0.5 * glow);
      ellipse(homeX + 40, homeY - 18, 6, 6);
      fill(180, 140, 80, beaconA * 0.4);
      rect(homeX + 39, homeY - 16, 3, 10);
    }
  }

  // ─── TEXT OVERLAYS ───
  textAlign(CENTER, CENTER);
  noStroke();

  // Departure text
  if (t > PUSH_OFF - 30 && t < SAILING) {
    let tA = min(255, (t - PUSH_OFF + 30) * 3);
    if (t > SAILING - 40) tA = max(0, tA - (t - SAILING + 40) * 5);
    fill(220, 200, 155, tA);
    textSize(14);
    text('The sea opens before me...', w / 2, h * 0.15);
  }

  // Mid-voyage text
  if (t > SAILING + 20 && t < ISLAND_APPEAR + 30) {
    let tA = min(255, (t - SAILING - 20) * 3);
    if (t > ISLAND_APPEAR) tA = max(0, tA - (t - ISLAND_APPEAR) * 4);
    fill(190, 170, 130, tA);
    textSize(11);
    text('The wind catches the sail. Sol guides the way.', w / 2, h * 0.15);
  }

  // Island sighted
  if (t > ISLAND_APPEAR + 40 && t < DONE) {
    let tA = min(255, (t - ISLAND_APPEAR - 40) * 3);
    if (t > DONE - 50) tA = max(0, tA - (t - DONE + 50) * 5);
    fill(240, 215, 150, tA);
    textSize(14);
    text('Land! A new beginning...', w / 2, h * 0.15);
    if (t > ISLAND_APPEAR + 90) {
      let tA2 = min(255, (t - ISLAND_APPEAR - 90) * 3);
      if (t > DONE - 50) tA2 = max(0, tA2 - (t - DONE + 50) * 5);
      fill(200, 180, 140, tA2);
      textSize(10);
      text('Home.', w / 2, h * 0.15 + 22);
    }
  }

  // Skip hint
  if (t > 20 && t < DONE) {
    fill(120, 110, 90, 60 + sin(t * 0.05) * 20);
    textSize(8); textAlign(CENTER, BOTTOM);
    text('[ click or press any key to skip ]', w / 2, h - 16);
  }

  // Black fade-in
  if (t < FADE_IN) {
    fill(0, 0, 0, 255 - (t / FADE_IN) * 255);
    rect(0, 0, w, h);
  }

  // Fade to white — transition to home
  if (t >= DONE) {
    let fadeOut = min(255, (t - DONE) * 4);
    fill(255, 245, 220, fadeOut);
    rect(0, 0, w, h);
    if (fadeOut >= 255) {
      state.cutscene = null;
      completeSailToHome();
    }
  }

  textAlign(LEFT, TOP);
}

function skipCutscene() {
  if (state.cutscene === 'pre_repair') {
    state.cutscene = null;
    doFirstRepair();
  } else if (state.cutscene === 'sailing') {
    state.cutscene = null;
    completeSailToHome();
  }
}

// Actually perform the first repair step (called after pre-repair cutscene)
function doFirstRepair() {
  // Legacy: now triggers first raft build instead
  buildRaft();
  state.progression.tutorialsSeen.firstRepairCutscene = true;
}

// Transfer to home island (called after sailing cutscene)
function completeSailToHome() {
  state.progression.homeIslandReached = true;
  saveGame();
  state.progression.wreckExplored = true;
  unlockJournal('home_found');

  if (snd) snd.playSFX('sail');
  let port = getPortPosition();
  state.player.x = port.x + 40;
  state.player.y = port.y;
  state.player.facing = 'left';
  cam.x = state.player.x; cam.y = state.player.y;
  camSmooth.x = cam.x; camSmooth.y = cam.y;

  state.wood += 5; state.stone += 3; state.seeds += 3;

  addFloatingText(width / 2, height * 0.3, 'HOME ISLAND REACHED', C.solarGold);
  addFloatingText(width / 2, height * 0.36, 'Explore the ruins...', C.textDim);
}

function drawInner() {
  floatOffset = sin(frameCount * 0.015) * 1.5;
  const dt = min(2, _delta * 60);

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

  updateTime(dt);
  updateTutorialHint(dt);
  if (snd) { snd.updateAmbient(); snd.updateLyre(); }

  // === WRECK BEACH MODE — before home island is reached ===
  if (state.progression.gameStarted && !state.progression.homeIslandReached &&
      !state.rowing.active && !state.conquest.active && !state.adventure.active) {
    updateWreckBeach(dt);
    updatePlayerAnim(dt);
    updateParticles(dt);
    updateFloatingText(dt);
    updateShake(dt);
    updateCamera();

    horizonOffset = height * 0.19;
    push();
    translate(shakeX, shakeY);
    drawSky();
    drawOcean();
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

    drawWreckHUD();
    drawTutorialHintUI();
    drawScreenFlash();
    drawCursor();
    return;
  }

  // === NEW ISLAND ACTIVE MODES ===
  if (state.vulcan.active) {
    updatePlayerAnim(dt);
    updateVulcanIsland(dt);
    updateParticles(dt);
    updateFloatingText(dt);
    updateShake(dt);
    updateCamera();
    horizonOffset = height * 0.19;
    push(); translate(shakeX, shakeY); drawSky(); drawOcean(); pop();
    push(); translate(shakeX, shakeY);
    drawVulcanIsland();
    drawVulcanEntities();
    drawParticles(); drawFloatingText(); pop();
    drawVulcanHUD();
    drawScreenFlash(); drawCursor();
    return;
  }
  if (state.hyperborea.active) {
    updatePlayerAnim(dt);
    updateHyperboreIsland(dt);
    updateParticles(dt);
    updateFloatingText(dt);
    updateShake(dt);
    updateCamera();
    horizonOffset = height * 0.19;
    push(); translate(shakeX, shakeY); drawSky(); drawOcean(); pop();
    push(); translate(shakeX, shakeY);
    drawHyperboreIsland();
    drawHyperboreEntities();
    drawParticles(); drawFloatingText(); pop();
    drawHyperboreHUD();
    drawScreenFlash(); drawCursor();
    return;
  }
  if (state.plenty.active) {
    updatePlayerAnim(dt);
    updatePlentyIsland(dt);
    updateParticles(dt);
    updateFloatingText(dt);
    updateShake(dt);
    updateCamera();
    horizonOffset = height * 0.19;
    push(); translate(shakeX, shakeY); drawSky(); drawOcean(); pop();
    push(); translate(shakeX, shakeY);
    drawPlentyIsland();
    drawPlentyEntities();
    drawParticles(); drawFloatingText(); pop();
    drawPlentyHUD();
    drawScreenFlash(); drawCursor();
    return;
  }
  if (state.necropolis.active) {
    updatePlayerCombat(dt);
    updatePlayerAnim(dt);
    updateNecropolisIsland(dt);
    updateParticles(dt);
    updateFloatingText(dt);
    updateShake(dt);
    updateCamera();
    horizonOffset = height * 0.19;
    push(); translate(shakeX, shakeY); drawSky(); drawOcean(); pop();
    push(); translate(shakeX, shakeY);
    drawNecropolisIsland();
    drawNecropolisEntities();
    drawParticles(); drawFloatingText(); pop();
    drawNecropolisHUD();
    drawScreenFlash(); drawCursor();
    return;
  }

  if (state.conquest.active) {
    // === CONQUEST MODE ===
    updatePlayerCombat(dt);
    updatePlayerAnim(dt);
    try { updateConquest(dt); } catch(e) { console.error('updateConquest crash:', e.message, e.stack); }
    if (typeof updateCombatSystem === 'function') updateCombatSystem(dt);
    if (typeof updateEconomySystem === 'function') updateEconomySystem(dt);
    try { updateCenturion(dt); } catch(e) { console.error('updateCenturion crash:', e); }
    updateParticles(dt);
    updateFloatingText(dt);
    updateShake(dt);
    updateCamera();

    // Sky + ocean — push horizon above island's visible water effects
    horizonOffset = height * 0.19;
    push();
    translate(shakeX, shakeY);
    drawSky();
    drawOcean();
    pop();

    // Conquest island
    push();
    translate(shakeX, shakeY);
    drawConquestIsland();
    drawConquestEntities();
    if (typeof drawCombatOverlay === 'function') drawCombatOverlay();
    if (typeof drawEconomyWorldOverlay === 'function') drawEconomyWorldOverlay();
    drawFogOfWar();
    drawParticles();
    drawFloatingText();
    drawModifierAtmosphere();
    pop();

    drawConquestHUD();
    if (typeof drawEconomyUIOverlay === 'function') drawEconomyUIOverlay();
    drawModifierSelectUI();
    drawBountyBoard();
    drawScreenFlash();
    drawCursor();
  } else if (state.adventure.active) {
    // === ADVENTURE MODE ===
    updatePlayerCombat(dt);
    updatePlayerAnim(dt);
    updateAdventure(dt);
    updateParticles(dt);
    updateFloatingText(dt);
    updateShake(dt);
    updateCamera();

    // Sky + ocean — push horizon above island
    horizonOffset = height * 0.19;
    push();
    translate(shakeX, shakeY);
    drawSky();
    drawOcean();
    pop();

    // Arena
    push();
    translate(shakeX, shakeY);
    drawArena();
    drawAdventureEntities();
    drawParticles();
    drawFloatingText();
    pop();

    drawAdventureHUD();
    drawScreenFlash();
    drawCursor();
  } else {
    // === NORMAL ISLAND MODE ===
    // Tutorial hints for new UI features
    if (state.day === 2 && !state.progression.tutorialsSeen.empDash) {
      state.progression.tutorialsSeen.empDash = true;
      showTutorialHint('Press TAB for Empire Dashboard', state.player.x, state.player.y - 40);
    }
    if (state.day === 3 && !state.progression.tutorialsSeen.invScreen) {
      state.progression.tutorialsSeen.invScreen = true;
      showTutorialHint('Press I to open Inventory', state.player.x, state.player.y - 40);
    }
    updatePlayer(dt);
    updatePlayerAnim(dt);
    { let _pg = state.progression;
      let _full = !_pg.gameStarted || _pg.villaCleared;
      if (_full || _pg.companionsAwakened.lares) updateCompanion(dt);
      if (_full || _pg.companionsAwakened.woodcutter) updateWoodcutter(dt);
      updateQuarrier(dt);
      if (_full || _pg.companionsAwakened.centurion) updateCenturion(dt);
    }
    updateParticles(dt);
    updateStorm(dt);
    updateFloatingText(dt);
    updateShake(dt);
    updateShip(dt);
    updateTrees(dt);
    updateFishing(dt);
    updateChickens(dt);
    { let _pg = state.progression;
      let _full = !_pg.gameStarted || _pg.villaCleared;
      if (_full || _pg.companionsAwakened.harvester) updateHarvester(dt);
    }
    updateVestaCrystals(dt);
    updateBlessing(dt);
    updateCats(dt);
    updateCooking(dt);
    updateWeather(dt);
    updateHarvestCombo(dt);
    updateCatAdoption();
    updateFestival(dt);
    updateVisitor(dt);
    updateDiscoveryEvents(dt);
    updateBridgeConstruction(dt);
    if (typeof updateDiving === 'function') updateDiving(dt);
    updateNotifications(dt);
    // Narrative engine updates
    if (typeof updateMainQuest === 'function') { updateMainQuest(); updateNPCQuests(); updateNarrativeDialogue(); checkLoreTabletPickup(); }
    if (typeof tickPendingNudges === 'function') tickPendingNudges(dt);
    updateDialog(dt);
    updateAchievementPopup(dt);
    updateScreenTransition(dt);
    updateImperatorCeremony(dt);
    updateCamera();
    updateWreckRowing(dt);

    // Sky + ocean background — horizon always above island top
    if (state.rowing.active) {
      // When sailing, ocean covers almost the entire screen
      horizonOffset = height * 0.19;
    } else {
      // Sky stays fixed — only slight parallax from camera, not 1:1 tracking
      let camOffsetY = (camSmooth.y - WORLD.islandCY) * 0.05; // very gentle parallax
      let baseHorizon = height * 0.22;
      let horizonY = constrain(baseHorizon - camOffsetY, height * 0.06, height * 0.25);
      horizonOffset = (height * 0.25) - horizonY;
    }
    push();
    translate(shakeX, shakeY);
    drawSky();
    drawSkyBirds();
    drawOcean();
    pop();

    // Full island rendering (visible from boat/home) — no floatOffset for distant islands
    push();
    translate(shakeX, shakeY);
    drawArena();
    drawArenaDistantLabel();
    drawImperialBridge(); // Draw bridge BEHIND islands
    drawConquestIsland();
    drawConquestDistantEntities();
    drawConquestDistantLabel();
    drawColonyOverlay(); // Colony buildings/farms on settled Terra Nova
    if (typeof drawEconomyWorldOverlay === 'function') drawEconomyWorldOverlay();
    // Wreck beach visible when sailing
    if (state.rowing.active) {
      drawWreckIsland();
      // Distant label
      let wsx = w2sX(WRECK.cx), wsy = w2sY(WRECK.cy);
      if (wsx > -100 && wsx < width + 100 && wsy > -100 && wsy < height + 100) {
        fill(200, 180, 120, 120);
        noStroke(); textSize(8); textAlign(CENTER, CENTER);
        text('Wreck Beach', floor(wsx), floor(wsy - WRECK.ry * 0.5));
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
    }
    pop();

    // Island + everything on it
    push();
    translate(shakeX, shakeY + floatOffset);
    drawIsland();
    drawWorldObjectsSorted();
    drawRuinOverlays();
    drawCompanionTrail();
    drawPlayerTrail();
    drawNightLighting();
    drawFishing();
    drawParticles();
    drawSeasonalEffects();
    drawWeatherEffects();
    drawLightning();
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
          fill(220, 190, 80); textAlign(CENTER, CENTER); textSize(8);
          text('[E] Pick up scroll', ssx, ssy - 16); textAlign(LEFT, TOP);
        }
      }
    }
    drawFestivalDecorations();
    drawBottles();
    drawTreasureHint();
    drawShoreWaves();
    drawRowingBoat();
    // Diving overlay — underwater tint + entities drawn in world space
    if (state.diving && state.diving.active && typeof drawDivingOverlay === 'function') drawDivingOverlay();
    pop();

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
        fill(180, 170, 140, 120); textSize(7);
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
        fill(200, 180, 130, 140); textSize(7);
        text(cc.gold + 'g  ' + cc.wood + ' wood  ' + cc.stone + ' stone  ' + cc.ironOre + ' iron  ' + cc.ancientRelic + ' relics', fpx, fpy + 11);
      }
      // Colony upgrade prompt
      if (state.conquest.colonized && state.conquest.colonyLevel < 10) {
        let uc = getColonyUpgradeCost(state.conquest.colonyLevel);
        fill(180, 220, 255, 200 + sin(frameCount * 0.05) * 30);
        noStroke(); textAlign(CENTER); textSize(9);
        text('[C] Upgrade Colony (LV.' + (state.conquest.colonyLevel + 1) + ')', fpx, fpy);
        fill(150, 180, 200, 140); textSize(7);
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
        fill(220, 180, 100, 160); textSize(7);
        text(bc.stone + ' stone  ' + bc.wood + ' wood  ' + bc.ironOre + ' iron  ' + bc.ancientRelic + ' relics  ' + bc.titanBone + ' bone', fpx, fpy - 7);
      }
      if (state.imperialBridge.built) {
        fill(255, 220, 100, 180);
        noStroke(); textAlign(CENTER); textSize(8);
        text('IMPERIAL BRIDGE — Walk west to Terra Nova!', fpx, fpy - 12);
      }
    }

    // Dock prompt when rowing near an island
    if (state.rowing.active && state.rowing.nearIsle) {
      let isColonized = state.rowing.nearIsle === 'conquest' && state.conquest.colonized;
      let label = state.rowing.nearIsle === 'arena' ? '[E] Dock at Arena' :
                  state.rowing.nearIsle === 'wreck' ? '[E] Dock at Wreck Beach' :
                  state.rowing.nearIsle === 'vulcan' ? '[E] Dock at Isle of Vulcan' :
                  state.rowing.nearIsle === 'hyperborea' ? '[E] Dock at Hyperborea' :
                  state.rowing.nearIsle === 'plenty' ? '[E] Dock at Isle of Plenty' :
                  state.rowing.nearIsle === 'necropolis' ? '[E] Dock at Necropolis' :
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
        { name: 'Arena', x: state.adventure.isleX, y: state.adventure.isleY, col: '#cc8888' },
        { name: state.conquest.colonized ? 'Colony LV.' + state.conquest.colonyLevel : 'Terra Nova', x: state.conquest.isleX, y: state.conquest.isleY, col: state.conquest.colonized ? '#88cc88' : '#88aacc' },
        { name: 'Wreck Beach', x: WRECK.cx, y: WRECK.cy, col: '#ccaa66' },
        { name: 'Isle of Vulcan', x: state.vulcan.isleX, y: state.vulcan.isleY, col: '#ff5533' },
        { name: 'Hyperborea', x: state.hyperborea.isleX, y: state.hyperborea.isleY, col: '#88ddff' },
        { name: 'Isle of Plenty', x: state.plenty.isleX, y: state.plenty.isleY, col: '#44cc44' },
        { name: 'Necropolis', x: state.necropolis.isleX, y: state.necropolis.isleY, col: '#9944cc' },
      ];
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
        fill(255, 240, 200, 180); textSize(7); textAlign(CENTER);
        text(isle.name, 0, -10);
        fill(255, 240, 200, 120); textSize(6);
        text(floor(d) + 'px', 0, 10);
        pop();
      }
    }

    // Build mode ghost
    if (state.buildMode) {
      drawBuildGhost();
    }

    // Golden hour color grading — atmospheric tint over the world
    if (!state.conquest.active && !state.adventure.active) drawColorGrading();

    drawHUD();
    if (!photoMode && typeof drawQuestTracker === 'function') drawQuestTracker();
    drawHotbar();
    drawFestivalBanner();
    drawBuildUI();
    drawShopUI();
    drawUpgradeShopUI();
    drawMarketUI();
    drawCodexUI();
    if (typeof drawLoreTabletPopup === 'function') drawLoreTabletPopup();
    if (typeof drawNarrativeDialogue === 'function') drawNarrativeDialogue();
    drawDiscoveryEvent();
    if (!photoMode) drawTutorialHintUI();
    drawScreenFlash();
    drawImperatorBanner();
    drawDailySummary();
    drawModifierSelectUI();
    drawNotifications();
    drawDialogSystem();
    drawEmpireDashboard();
    drawInventoryScreen();
    if (typeof drawSkillTree === 'function') drawSkillTree();
    drawAchievementPopup();
    if (typeof drawEconomyUIOverlay === 'function') drawEconomyUIOverlay();
    drawScreenTransition();
    drawImperatorCeremony();
    // Photo mode hint — always visible at low alpha
    if (!photoMode) {
      push(); noStroke();
      fill(160, 140, 100, 102);
      textSize(7); textAlign(RIGHT, BOTTOM);
      text('[ P ] PHOTO', width - 18, height - 6);
      pop();
    }
    if (!photoMode) drawCursor();
  }

  // Debug console — always on top of everything
  if (typeof Debug !== 'undefined') Debug.draw();
}

// ─── TIME ─────────────────────────────────────────────────────────────────
function updateTime(dt) {
  state.time += 0.18 * dt;
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

  if (state.time >= 1440) {
    let prevSeason = getSeason();
    state.time = 0;
    state.day++;
    let newSeason = getSeason();
    if (newSeason !== prevSeason) {
      // Season transition fanfare (non-festival days)
      spawnSeasonFanfare(newSeason);
      let names = ['VER (Spring)', 'AESTAS (Summer)', 'AUTUMNUS (Autumn)', 'HIEMS (Winter)'];
      addFloatingText(width / 2, height * 0.2, names[newSeason] + ' begins!', '#ffddaa');
    }
    state.showSummary = false;
    state.lastSummary = null;
    // New day setup
    state.prophecy = (typeof generateEnhancedProphecy === 'function') ? generateEnhancedProphecy() : generateProphecy();
    resetDailyActivities();
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
    // Bottle washes ashore every 3-5 days (random)
    if (state.day > 2 && random() < 0.3 && state.bottles.filter(b => !b.collected).length < 2) {
      spawnBottle();
    }
    // Auto-save every 2 days
    if (state.day % 2 === 0) {
      saveGame();
      addFloatingText(width / 2, height * 0.35, 'Auto-saved', C.textDim);
    }
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
      c.respawnTimer -= dt * crystalSpeed;
      if (c.respawnTimer <= 0) {
        c.charge = 30 + floor(random(30));
        c.respawnTimer = 0;
        spawnParticles(c.x, c.y, 'build', 4);
      }
    }
  });

  state.plots.forEach(p => {
    if (p.planted && !p.ripe) {
      let growRate = (hour >= 6 && hour <= 18) ? 0.18 : 0.05;
      if (stormActive) growRate *= 1.8;
      if (state.weather.type === 'rain') growRate *= (1.5 + state.weather.intensity * 0.5);
      if (state.weather.type === 'heatwave') growRate *= 0.5;
      if (state.prophecy && state.prophecy.type === 'crops') growRate *= 1.3;
      let fest = getFestival();
      if (fest && fest.effect.crops) growRate *= fest.effect.crops;
      // Ginger cat passive: +2% crop growth
      if (state.cats.some(c => c.adopted && c.passive === 'crops')) growRate *= 1.02;
      // Heart bonus: each NPC heart = +10% crop growth
      growRate *= (1 + state.npc.hearts * 0.10);
      // Aqueduct bonus — nearby aqueduct doubles growth
      let hasAqueduct = state.buildings.some(b => {
        if (b.type !== 'aqueduct') return false;
        let dx = b.x - p.x, dy = b.y - p.y;
        return dx * dx + dy * dy < 80 * 80;
      });
      if (hasAqueduct) growRate *= 2;
      if (state.blessing.type === 'crops') growRate *= 2;
      p.timer += growRate * dt;
      let oldStage = p.stage;
      p.stage = min(3, floor(p.timer / 40));
      // Check for blessed mutation at stage 2
      if (p.stage >= 2 && oldStage < 2) checkCropMutation(p);
      if (p.timer >= 120) { p.ripe = true; p.glowing = true; }
    }
  });
}

function getSkyBrightness() {
  let h = state.time / 60;
  if (h < 5 || h > 21) return 0;
  if (h < 7) return map(h, 5, 7, 0, 1);
  if (h < 17) return 1;
  return map(h, 17, 21, 1, 0);
}

// ─── SKY ──────────────────────────────────────────────────────────────────
function drawSky() {
  let bright = getSkyBrightness();
  let h = state.time / 60;

  let skyTop, skyBot;
  if (stormActive) {
    skyTop = lerpColor(color(C.skyDeep), color(C.stormCloud), 0.7);
    skyBot = lerpColor(color(C.skyMid), color(C.stormLight), 0.5);
  } else if (h >= 5 && h < 6.5) {
    let t = map(h, 5, 6.5, 0, 1);
    skyTop = lerpColor(color(18, 16, 42), color(60, 80, 140), t);
    skyBot = lerpColor(color(35, 22, 50), color(220, 140, 100), t);
  } else if (h >= 6.5 && h < 8) {
    let t = map(h, 6.5, 8, 0, 1);
    skyTop = lerpColor(color(60, 80, 140), color(90, 150, 210), t);
    skyBot = lerpColor(color(220, 140, 100), color(200, 210, 230), t);
  } else if (h >= 8 && h < 11) {
    let t = map(h, 8, 11, 0, 1);
    skyTop = lerpColor(color(90, 150, 210), color(80, 145, 215), t);
    skyBot = lerpColor(color(200, 210, 230), color(175, 210, 240), t);
  } else if (h >= 11 && h < 14) {
    skyTop = color(80, 145, 215);
    skyBot = color(170, 210, 240);
  } else if (h >= 14 && h < 16.5) {
    let t = map(h, 14, 16.5, 0, 1);
    skyTop = lerpColor(color(80, 145, 215), color(100, 130, 190), t);
    skyBot = lerpColor(color(170, 210, 240), color(220, 190, 150), t);
  } else if (h >= 16.5 && h < 18.5) {
    let t = map(h, 16.5, 18.5, 0, 1);
    skyTop = lerpColor(color(100, 130, 190), color(50, 35, 80), t);
    skyBot = lerpColor(color(220, 190, 150), color(200, 100, 60), t);
  } else if (h >= 18.5 && h < 20.5) {
    let t = map(h, 18.5, 20.5, 0, 1);
    skyTop = lerpColor(color(50, 35, 80), color(15, 14, 38), t);
    skyBot = lerpColor(color(200, 100, 60), color(30, 20, 50), t);
  } else {
    skyTop = color(10, 12, 30);
    skyBot = color(16, 20, 42);
  }

  noStroke();
  let skyH = height * 0.25 - horizonOffset;
  skyH = max(skyH, height * 0.06);

  let hasHorizonBand = (h >= 5 && h < 8) || (h >= 16 && h < 20.5);
  for (let y = 0; y < skyH; y += 2) {
    let t = y / skyH;
    let c = lerpColor(skyTop, skyBot, t);
    if (hasHorizonBand && t > 0.7) {
      let bandT = (t - 0.7) / 0.3;
      let warmG = h < 8 ? 160 : 110;
      let warmB = h < 8 ? 90 : 55;
      let bandA = bandT * bandT * 40;
      fill(min(255, red(c) + 240 * bandA / 255), min(255, green(c) + warmG * bandA / 255), min(255, blue(c) + warmB * bandA / 255));
    } else {
      fill(c);
    }
    rect(0, y, width, 2);
  }

  if ((bright > 0.1 || (h >= 5 && h < 7)) && !stormActive) {
    drawDriftClouds(max(bright, 0.15));
  }

  if (bright > 0.05) {
    let sunX = map(h, 5, 20, width * 0.1, width * 0.9);
    let sunArc = map(sin(map(h, 5, 20, 0, PI)), 0, 1, skyH * 1.05, height * 0.06);
    let sunY = sunArc - horizonOffset * 0.5;
    drawSun(sunX, sunY, min(bright, 1));
    if (bright < 0.35) {
      let glowA = map(bright, 0.05, 0.35, 35, 0);
      fill(255, 160, 60, glowA);
      ellipse(sunX, skyH, 180 + sin(frameCount * 0.012) * 15, 25);
      fill(255, 200, 100, glowA * 0.4);
      ellipse(sunX, skyH, 280, 12);
    }
  }

  if (bright < 0.4) {
    let starAlpha = map(bright, 0, 0.4, 220, 0);
    drawStarField(starAlpha);
    if (bright < 0.25) {
      drawMoonPhased(bright);
    }
  }

  if (stormActive || stormTimer > 300) {
    drawStormClouds();
  }
}

function drawSun(x, y, bright) {
  let r = 28;
  let fx = floor(x), fy = floor(y);
  noStroke();
  // Outer pixel glow — cross shape
  for (let g = 5; g > 0; g--) {
    let s = g * 20;
    fill(220, 140, 20, (6 - g) * 4 * bright);
    rect(fx - 2, fy - s, 4, s * 2);
    rect(fx - s, fy - 2, s * 2, 4);
  }
  // Diagonal rays — stepped pixel beams
  for (let i = 0; i < 8; i++) {
    let angle = (TWO_PI / 8) * i + frameCount * 0.004;
    let len = floor(r * 2.2 + sin(frameCount * 0.04 + i * 1.3) * r * 0.6);
    fill(240, 180, 40, 25 * bright);
    for (let d = r; d < len; d += 4) {
      let rx = floor(fx + cos(angle) * d);
      let ry = floor(fy + sin(angle) * d);
      rect(rx, ry, 3, 3);
    }
  }
  // Sun disc — pixel square with stepped corners
  fill(255, 210, 90, 240 * bright);
  rect(fx - r, fy - r + 6, r * 2, r * 2 - 12);
  rect(fx - r + 6, fy - r, r * 2 - 12, r * 2);
  rect(fx - r + 3, fy - r + 3, r * 2 - 6, r * 2 - 6);
  // Bright core
  fill(255, 240, 180, 200 * bright);
  rect(fx - floor(r * 0.55), fy - floor(r * 0.55), floor(r * 1.1), floor(r * 1.1));
  // Hot center
  fill(255, 255, 230, 150 * bright);
  rect(fx - floor(r * 0.25), fy - floor(r * 0.25), floor(r * 0.5), floor(r * 0.5));
}

function drawStarField(alpha) {
  if (!starPositions) {
    starPositions = [];
    // Background stars — varied sizes and colors
    for (let i = 0; i < 160; i++) {
      let temp = random(); // 0=cool blue, 1=warm yellow
      starPositions.push({
        x: random(width), y: random(height * 0.5),
        s: random(0.5, 3), p: random(TWO_PI),
        twinkleSpeed: random(0.015, 0.06),
        r: lerp(190, 255, temp), g: lerp(210, 240, temp * 0.5), b: lerp(255, 200, temp),
      });
    }
    // Constellation patterns — Orion's belt, Ursa Major, Cassiopeia
    let constellations = [
      // Orion's belt (3 bright aligned stars)
      [{ x: 0.35, y: 0.18 }, { x: 0.37, y: 0.19 }, { x: 0.39, y: 0.20 }],
      // Ursa Major (Big Dipper)
      [{ x: 0.6, y: 0.06 }, { x: 0.63, y: 0.07 }, { x: 0.66, y: 0.065 }, { x: 0.68, y: 0.08 },
       { x: 0.69, y: 0.10 }, { x: 0.67, y: 0.12 }, { x: 0.65, y: 0.11 }],
      // Cassiopeia (W shape)
      [{ x: 0.15, y: 0.08 }, { x: 0.17, y: 0.11 }, { x: 0.19, y: 0.08 }, { x: 0.21, y: 0.12 }, { x: 0.23, y: 0.09 }],
    ];
    constellations.forEach(con => {
      con.forEach(st => {
        starPositions.push({
          x: st.x * width, y: st.y * height,
          s: random(2, 3.5), p: random(TWO_PI),
          twinkleSpeed: random(0.02, 0.04),
          r: 230, g: 240, b: 255, constellation: true,
        });
      });
    });
  }
  noStroke();
  starPositions.forEach(s => {
    let twinkle = map(sin(frameCount * s.twinkleSpeed + s.p), -1, 1, 0.2, 1);
    let a = alpha * twinkle;
    let sz = s.s > 1.8 ? 2 : 1;
    // Star body
    fill(s.r, s.g, s.b, a);
    rect(floor(s.x), floor(s.y), sz, sz);
    // Bright stars get cross-shaped twinkle rays
    if (s.s > 2.2 && twinkle > 0.75) {
      let rayA = a * 0.4 * (twinkle - 0.75) * 4;
      fill(s.r, s.g, s.b, rayA);
      let rayLen = floor(s.s * 1.5);
      rect(floor(s.x) - rayLen, floor(s.y), rayLen * 2 + sz, 1);
      rect(floor(s.x), floor(s.y) - rayLen, 1, rayLen * 2 + sz);
    }
    // Constellation stars get subtle glow
    if (s.constellation && twinkle > 0.5) {
      fill(s.r, s.g, s.b, a * 0.15);
      rect(floor(s.x) - 2, floor(s.y) - 2, sz + 4, sz + 4);
    }
  });
  // Shooting star (rare)
  if (!drawStarField._shootingStar && random() < 0.002) {
    drawStarField._shootingStar = {
      x: random(width * 0.2, width * 0.8), y: random(height * 0.02, height * 0.15),
      vx: random(4, 8) * (random() > 0.5 ? 1 : -1), vy: random(2, 4),
      life: 20, maxLife: 20,
    };
  }
  if (drawStarField._shootingStar) {
    let ss = drawStarField._shootingStar;
    let sa = (ss.life / ss.maxLife) * alpha;
    // Trail
    for (let ti = 0; ti < 6; ti++) {
      let trailA = sa * (1 - ti / 6) * 0.6;
      fill(255, 255, 240, trailA);
      rect(floor(ss.x - ss.vx * ti * 0.4), floor(ss.y - ss.vy * ti * 0.4), 2, 1);
    }
    // Head
    fill(255, 255, 250, sa);
    rect(floor(ss.x), floor(ss.y), 2, 2);
    ss.x += ss.vx; ss.y += ss.vy; ss.life--;
    if (ss.life <= 0) drawStarField._shootingStar = null;
  }
}
// Keep old name as alias for compatibility
function drawStars(alpha) { drawStarField(alpha); }

let cloudPositions = null;
function drawDriftClouds(bright) {
  if (typeof drawDriftClouds._prevCamY === 'undefined') drawDriftClouds._prevCamY = camSmooth.y;
  let camDY = camSmooth.y - drawDriftClouds._prevCamY;
  drawDriftClouds._prevCamY = camSmooth.y;

  let h = state.time / 60;
  if (!cloudPositions) {
    cloudPositions = [];
    for (let i = 0; i < 8; i++) {
      cloudPositions.push({
        x: random(width * 1.5),
        y: random(height * 0.03, height * 0.22),
        w: random(55, 150),
        h: random(16, 38),
        speed: random(0.06, 0.22),
        depth: random(0.5, 1), // parallax depth
      });
    }
  }
  noStroke();

  // Cloud color varies by time of day
  let cloudR = 235, cloudG = 240, cloudB = 245;
  let highlightR = 255, highlightG = 255, highlightB = 255;
  let shadowR = 210, shadowG = 218, shadowB = 228;

  if (h >= 5 && h < 7) {
    // Dawn clouds — pink/orange lit undersides
    let dt = map(h, 5, 7, 0, 1);
    cloudR = lerp(180, 235, dt); cloudG = lerp(140, 240, dt); cloudB = lerp(160, 245, dt);
    highlightR = 255; highlightG = lerp(180, 255, dt); highlightB = lerp(160, 255, dt);
    shadowR = lerp(200, 210, dt); shadowG = lerp(120, 218, dt); shadowB = lerp(140, 228, dt);
  } else if (h >= 16.5 && h < 19) {
    // Sunset clouds — golden/orange/purple
    let dt = map(h, 16.5, 19, 0, 1);
    cloudR = lerp(245, 160, dt); cloudG = lerp(220, 120, dt); cloudB = lerp(200, 140, dt);
    highlightR = lerp(255, 220, dt); highlightG = lerp(240, 150, dt); highlightB = lerp(200, 130, dt);
    shadowR = lerp(220, 100, dt); shadowG = lerp(180, 70, dt); shadowB = lerp(170, 110, dt);
  } else if (h >= 19 || h < 5) {
    // Night clouds — dark silhouettes
    cloudR = 30; cloudG = 35; cloudB = 55;
    highlightR = 50; highlightG = 55; highlightB = 75;
    shadowR = 15; shadowG = 18; shadowB = 35;
  }

  cloudPositions.forEach(cl => {
    cl.x += cl.speed * cl.depth;
    if (cl.x > width + cl.w) cl.x = -cl.w;
    cl.y -= camDY * 0.04;
    cl.y = constrain(cl.y, height * 0.02, height * 0.22);
    let alpha = map(bright, 0.1, 0.5, 15, 55) * cl.depth;
    let cx = floor(cl.x), cy = floor(cl.y);
    let cw = floor(cl.w), ch = floor(cl.h);

    // Main cloud body — soft ellipses
    fill(cloudR, cloudG, cloudB, alpha);
    ellipse(cx, cy, cw * 0.8, ch * 0.6);
    // Upper bumps
    fill(highlightR, highlightG, highlightB, alpha * 0.75);
    ellipse(cx - cw * 0.15, cy - ch * 0.2, cw * 0.5, ch * 0.4);
    ellipse(cx + cw * 0.2, cy - ch * 0.15, cw * 0.35, ch * 0.3);
    // Side puffs
    fill(cloudR, cloudG, cloudB, alpha * 0.6);
    ellipse(cx - cw * 0.35, cy + ch * 0.05, cw * 0.3, ch * 0.35);
    ellipse(cx + cw * 0.35, cy + ch * 0.05, cw * 0.25, ch * 0.3);
    // Bottom shadow
    fill(shadowR, shadowG, shadowB, alpha * 0.5);
    ellipse(cx, cy + ch * 0.2, cw * 0.7, ch * 0.25);
    // Bright highlight on top
    fill(highlightR, highlightG, highlightB, alpha * 0.35);
    ellipse(cx - cw * 0.05, cy - ch * 0.25, cw * 0.3, ch * 0.15);
  });
}

function drawMoonPhased(bright) {
  let h = state.time / 60;
  // Moon phase based on game day (8 phases over 32 days)
  let phase = (state.day % 32) / 32; // 0=new, 0.5=full, 1=new again
  let moonX = floor(map(h, 20, 30, width * 0.2, width * 0.8));
  if (h < 6) moonX = floor(map(h, 0, 6, width * 0.5, width * 0.9));
  let moonY = floor(height * 0.08 + sin(frameCount * 0.002) * 3 - horizonOffset * 0.5);
  let moonAlpha = map(bright, 0, 0.25, 220, 0);
  noStroke();

  // Moonlight glow on water/ground (stronger at full moon)
  let fullness = 1 - abs(phase - 0.5) * 2; // 0 at new, 1 at full
  let glowR = 30 + fullness * 30;
  fill(140, 170, 210, moonAlpha * 0.06 * fullness);
  ellipse(moonX, moonY, glowR * 4, glowR * 3);
  fill(160, 185, 220, moonAlpha * 0.03 * fullness);
  ellipse(moonX, moonY, glowR * 6, glowR * 4);

  // Pixel cross glow
  fill(180, 200, 230, moonAlpha * 0.15 * (0.3 + fullness * 0.7));
  rect(moonX - 1, moonY - 20, 2, 40);
  rect(moonX - 20, moonY - 1, 40, 2);

  // Moon body
  fill(220, 225, 235, moonAlpha);
  rect(moonX - 9, moonY - 11, 18, 22);
  rect(moonX - 11, moonY - 9, 22, 18);
  rect(moonX - 10, moonY - 10, 20, 20);

  // Phase shadow — crescent moves based on phase
  if (phase < 0.45 || phase > 0.55) {
    let shadowSide = phase < 0.5 ? 1 : -1; // which side is shadowed
    let shadowWidth = abs(phase < 0.5 ? (0.5 - phase) * 2 : (phase - 0.5) * 2);
    let sw = floor(shadowWidth * 20);
    fill(10, 18, 35, moonAlpha * 0.8);
    if (shadowSide > 0) {
      rect(moonX + 10 - sw, moonY - 9, sw + 2, 18);
      rect(moonX + 10 - sw + 2, moonY - 10, sw, 20);
    } else {
      rect(moonX - 11, moonY - 9, sw + 2, 18);
      rect(moonX - 11, moonY - 10, sw, 20);
    }
  }

  // Surface craters (always visible on lit part)
  fill(200, 205, 220, moonAlpha * 0.3);
  rect(moonX - 5, moonY + 1, 3, 3);
  rect(moonX - 3, moonY - 4, 2, 2);
  rect(moonX + 2, moonY - 2, 2, 2);

  // Moonbeam on water — cool blue column below moon
  if (fullness > 0.3) {
    let skyH = max(height * 0.06, height * 0.25 - horizonOffset);
    for (let ry = skyH; ry < skyH + 50; ry += 4) {
      let reflA = moonAlpha * 0.04 * fullness * (1 - (ry - skyH) / 50);
      let rw = floor(6 + sin(ry * 0.1 + frameCount * 0.02) * 3);
      fill(180, 200, 230, reflA);
      rect(moonX - rw, ry, rw * 2, 2);
    }
  }
}
// Keep old name as alias
function drawMoon(bright) { drawMoonPhased(bright); }

// ─── SKY BIRDS ───────────────────────────────────────────────────────────
let skyBirds = null;
function drawSkyBirds() {
  let bright = getSkyBrightness();
  if (bright < 0.2) return;
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
  stroke(40, 35, 30, 120 * bright);
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

function drawStormClouds() {
  let intensity = stormActive ? 1 : map(stormTimer, 0, 600, 0, 0.5);
  noStroke();
  let cloudData = [
    { x: 0.1, y: 0.05 }, { x: 0.35, y: 0.02 }, { x: 0.6, y: 0.06 }, { x: 0.8, y: 0.03 },
  ];
  cloudData.forEach((c, i) => {
    let cx = floor(c.x * width + sin(frameCount * 0.003 + i) * 20);
    let cy = floor(c.y * height);
    let r = 100 + i * 30;
    // Soft storm clouds — ellipses
    fill(30, 40, 60, 140 * intensity);
    ellipse(cx, cy, r * 2, r * 0.5);
    fill(25, 35, 55, 120 * intensity);
    ellipse(cx - r * 0.3, cy - r * 0.1, r * 1.2, r * 0.35);
    ellipse(cx + r * 0.3, cy + r * 0.05, r * 1.0, r * 0.3);
    fill(20, 28, 48, 90 * intensity);
    ellipse(cx, cy + r * 0.15, r * 1.5, r * 0.25);
  });
}

// ─── OCEAN ────────────────────────────────────────────────────────────────
// Full ocean background — the sea surrounds the island on all sides
function drawOcean() {
  let bright = getSkyBrightness();
  let dayMix = bright;
  let t = frameCount * 0.012;
  let h = state.time / 60;
  noStroke();

  let oceanTop = max(height * 0.06, height * 0.25 - horizonOffset);

  // Deep ocean gradient — time-of-day tinted
  let tintR = 0, tintG = 0, tintB = 0;
  if (h >= 5 && h < 7) { tintR = 20; tintG = 5; tintB = -10; } // dawn warm
  else if (h >= 16 && h < 19) { tintR = 25; tintG = 8; tintB = -15; } // dusk warm
  else if (h >= 21 || h < 5) { tintR = -5; tintG = -5; tintB = 8; } // night cool

  for (let band = 0; band < 12; band++) {
    let oceanH = height - oceanTop;
    let y0 = oceanTop + band * oceanH / 12;
    let d = band / 11;
    let r = lerp(lerp(18, 50, dayMix), lerp(8, 22, dayMix), d) + tintR * (1 - d);
    let g = lerp(lerp(40, 140, dayMix), lerp(20, 65, dayMix), d) + tintG * (1 - d);
    let b = lerp(lerp(60, 175, dayMix), lerp(40, 100, dayMix), d) + tintB * (1 - d);
    fill(max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)));
    rect(0, y0, width, oceanH / 12 + 2);
  }

  // Animated sine wave scan-lines — stepped pixel art
  let waveStep = floor(t * 0.8);
  for (let wy = oceanTop + 4; wy < height; wy += 7) {
    let depthFade = 1 - (wy - oceanTop) / (height - oceanTop) * 0.6;
    let waveAlpha = (25 + 22 * dayMix) * depthFade;
    let offsetX = floor(sin(t * 0.5 + wy * 0.03) * 12);
    // Primary wave highlight
    fill(120 + 70 * dayMix, 175 + 50 * dayMix, 210 + 30 * dayMix, waveAlpha);
    for (let wx = offsetX % 28; wx < width; wx += 28) {
      let segW = 12 + floor(sin(wy * 0.07 + wx * 0.04 + waveStep * 0.1) * 4);
      rect(wx, wy, segW, 2);
    }
    // Secondary sine wave (counter-phase for depth)
    if (floor(wy / 7) % 2 === 0) {
      let off2 = floor(sin(t * 0.35 + wy * 0.05 + 2) * 8);
      fill(90 + 50 * dayMix, 150 + 40 * dayMix, 195 + 25 * dayMix, waveAlpha * 0.5);
      for (let wx = off2 % 35; wx < width; wx += 35) {
        rect(wx, wy + 3, 8 + floor(sin(wy * 0.05 + wx * 0.03) * 3), 1);
      }
    }
    // Dark dither trough
    if (floor(wy / 7) % 3 === 0) {
      fill(10 + 20 * dayMix, 25 + 50 * dayMix, 50 + 70 * dayMix, waveAlpha * 0.6);
      for (let wx = (offsetX + 14) % 28; wx < width; wx += 36) {
        rect(wx, wy + 3, 8, 1);
      }
    }
  }

  // Caustic light patterns on shallow water (near island)
  if (dayMix > 0.3) {
    let causticA = (dayMix - 0.3) * 25;
    for (let ci = 0; ci < 15; ci++) {
      let cx = floor(noise(ci * 7.3 + frameCount * 0.004) * width);
      let cy = floor(oceanTop + noise(ci * 11.1 + frameCount * 0.003) * (height - oceanTop) * 0.4);
      let cSize = 4 + floor(sin(frameCount * 0.06 + ci * 2.1) * 3);
      let cAlpha = causticA * (sin(frameCount * 0.05 + ci * 1.7) * 0.5 + 0.5);
      fill(180 + 60 * dayMix, 220 + 20 * dayMix, 240, cAlpha);
      // Diamond-shaped caustic
      rect(cx, cy - 1, cSize, 1);
      rect(cx - 1, cy, cSize + 2, 1);
      rect(cx, cy + 1, cSize, 1);
    }
  }

  // Pixel foam whitecaps
  for (let fy = oceanTop + 12; fy < height; fy += 20) {
    let depthFade = 1 - (fy - oceanTop) / (height - oceanTop) * 0.5;
    for (let fx = 0; fx < width; fx += 38) {
      let foamPhase = sin(t * 1.2 + fx * 0.05 + fy * 0.06);
      if (foamPhase > 0.45) {
        let foamAlpha = (foamPhase - 0.45) * 65 * depthFade * max(0.3, dayMix);
        fill(225, 238, 248, foamAlpha);
        let fw = floor(6 + foamPhase * 6);
        let foamX = floor(fx + sin(t * 0.8 + fx * 0.03) * 4);
        rect(foamX, fy, fw, 2);
        if (foamPhase > 0.6) {
          rect(foamX + fw + 3, fy + 1, floor(fw * 0.5), 1);
        }
      }
    }
  }

  // Sun sparkles on water
  if (dayMix > 0.5) {
    let sparkleAlpha = (dayMix - 0.5) * 2;
    for (let i = 0; i < 25; i++) {
      let sx2 = floor(noise(i * 10 + frameCount * 0.003) * width);
      let sy2 = floor(oceanTop + noise(i * 20 + frameCount * 0.002) * (height - oceanTop) * 0.6);
      let sparkle = sin(frameCount * 0.1 + i * 2.5);
      if (sparkle > 0.65) {
        let sa = (sparkle - 0.65) * 500 * sparkleAlpha;
        fill(255, 248, 220, sa);
        rect(sx2, sy2 - 1, 2, 4);
        rect(sx2 - 1, sy2, 4, 2);
      }
    }
  }

  // Sun reflection column — stepped horizontal bars
  if (dayMix > 0.3) {
    let sunH = state.time / 60;
    let sunX = floor(map(sunH, 5, 20, width * 0.1, width * 0.9));
    for (let ry = oceanTop + 5; ry < oceanTop + 65; ry += 5) {
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
    for (let bi = 0; bi < 18; bi++) {
      let bx = floor(noise(bi * 13.7 + frameCount * 0.002) * width);
      let by = floor(oceanTop + 15 + noise(bi * 9.3 + frameCount * 0.0015) * (height - oceanTop - 30));
      let pulse = sin(frameCount * 0.04 + bi * 2.3) * 0.5 + 0.5;
      if (pulse > 0.4) {
        let ba = (pulse - 0.4) * 150 * bioAlpha;
        // Outer glow
        fill(60, 200, 220, ba * 0.3);
        rect(bx - 2, by - 2, 5, 5);
        // Core
        fill(100, 240, 255, ba);
        rect(bx, by, 2, 2);
        // Tiny trail
        fill(60, 200, 220, ba * 0.15);
        rect(bx - 3, by, 2, 1);
      }
    }
  }

  // Jumping fish
  if (frameCount % 180 === 0 || (typeof jumpingFish === 'undefined')) {
    if (typeof jumpingFish === 'undefined') jumpingFish = [];
    if (jumpingFish.length < 2) {
      jumpingFish.push({
        x: random(width * 0.1, width * 0.9),
        y: oceanTop + random(30, height - oceanTop - 30),
        phase: 0, size: random(3, 6),
      });
    }
  }
  if (typeof jumpingFish !== 'undefined') {
    noStroke();
    for (let i = jumpingFish.length - 1; i >= 0; i--) {
      let f = jumpingFish[i];
      f.phase += 0.08;
      let jumpY = -sin(f.phase) * 18;
      if (f.phase > PI) { jumpingFish.splice(i, 1); continue; }
      let fy2 = f.y + jumpY;
      let fx2 = floor(f.x), fy3 = floor(fy2);
      fill(165, 185, 205, 185);
      rect(fx2 - f.size, fy3 - floor(f.size * 0.4), floor(f.size * 2.5), floor(f.size * 0.8));
      fill(150, 172, 195, 180);
      rect(fx2 + floor(f.size * 1.5), fy3 - floor(f.size * 0.5), floor(f.size * 0.8), floor(f.size));
      if (f.phase < 0.5 || f.phase > PI - 0.5) {
        fill(180, 220, 245, 50);
        let splashR = f.phase < 0.5 ? floor((0.5 - f.phase) * 15) : floor((f.phase - PI + 0.5) * 15);
        rect(fx2 - splashR, floor(f.y), splashR * 2, 2);
      }
    }
  }
}

// Shore waves — drawn in the island context (after all island objects)
// Creates foam ring around the full island perimeter
function drawShoreWaves() {
  let ix = w2sX(WORLD.islandCX);
  let iy = w2sY(WORLD.islandCY);
  // Outermost shallow water ring: ellipse(ix, iy-10, iw*1.12, ih*0.50)
  // where iw = islandRX*2, so semi-axes are islandRX*1.12 and islandRY*0.50
  // Waves at the outer edge of the shallow lagoon where it meets open ocean
  let rx = state.islandRX * 1.12;   // match outermost shallow water semi-axis
  let ry = state.islandRY * 0.50;   // match outermost shallow water semi-axis
  let cy = iy - 10;  // match outermost shallow water center
  let t = frameCount * 0.015;
  let bright = getSkyBrightness();
  let dayMix = max(0.3, bright);

  noStroke();
  // Animated sine-based shoreline — foam crests roll in and out
  for (let a = 0; a < TWO_PI; a += 0.025) {
    // Multi-frequency wave for organic shoreline movement
    let wave1 = sin(t * 2.5 + a * 6);
    let wave2 = sin(t * 1.8 + a * 3.5 + 1.2) * 0.5;
    let wave3 = sin(t * 3.5 + a * 9) * 0.25;
    let wavePhase = wave1 + wave2 + wave3;
    let waveOff = floor(wavePhase * 4 + 3);
    let ex = floor(ix + cos(a) * (rx + waveOff));
    let ey = floor(cy + sin(a) * (ry + waveOff * 0.4));
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
  let beachRX = state.islandRX * 0.96;
  let beachRY = state.islandRY * 0.41;
  let beachCY = iy - 14;
  let grassRX = state.islandRX * 0.90;
  let grassRY = state.islandRY * 0.36;
  let grassCY = iy - 18;
  for (let a = 0; a < TWO_PI; a += 0.05) {
    let wavePhase = sin(t * 3.0 + a * 4 + 1.5);
    if (wavePhase > 0.35) {
      let waveOff = floor((wavePhase - 0.35) * 3);
      let ex = floor(ix + cos(a) * (beachRX + waveOff));
      let ey = floor(beachCY + sin(a) * (beachRY + waveOff * 0.4));
      let gx2 = (ex - ix) / grassRX;
      let gy2 = (ey - grassCY) / grassRY;
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

function getSeasonGrass() {
  let s = getSeason();
  if (s === 0) return { r: 72, g: 110, b: 48 };  // Spring — lush green
  if (s === 1) return { r: 82, g: 100, b: 42 };  // Summer — warm olive-gold
  if (s === 2) return { r: 95, g: 82, b: 38 };   // Autumn — golden amber
  return { r: 65, g: 78, b: 55 };                 // Winter — sage green
}

function getSeasonRim() {
  let s = getSeason();
  if (s === 0) return { r: 88, g: 125, b: 52 };
  if (s === 1) return { r: 100, g: 110, b: 45 };
  if (s === 2) return { r: 120, g: 95, b: 38 };
  return { r: 78, g: 88, b: 60 };
}

// ─── ROMAN FESTIVALS ─────────────────────────────────────────────────────
const FESTIVALS = [
  { name: 'FLORALIA', season: 0, desc: 'Festival of Flowers — crops grow 2x, mutations 5x',
    effect: { crops: 2, mutation: 5 }, color: '#ff88cc' },
  { name: 'NEPTUNALIA', season: 1, desc: 'Festival of Waters — fish 3x, rain guaranteed',
    effect: { fish: 3, forceRain: true }, color: '#44aaff' },
  { name: 'VINALIA', season: 2, desc: 'Festival of Wine — cooking instant, hearts 2x',
    effect: { cooking: true, hearts: 2 }, color: '#cc44ff' },
  { name: 'SATURNALIA', season: 3, desc: 'Festival of Saturn — all resources 2x, gold rain',
    effect: { allResources: 2, goldRain: true }, color: '#ffcc44' },
];

function getFestival() {
  if (!state.festival || !state.festival.active) return null;
  return FESTIVALS[state.festival.season];
}

function startFestival() {
  let season = getSeason();
  state.festival = { active: true, season: season, timer: 0, celebrated: false };
  state.codex.festivalsAttended++;
  unlockJournal('first_festival');
  let f = FESTIVALS[season];
  addFloatingText(width / 2, height * 0.25, f.name + '!', f.color);
  addFloatingText(width / 2, height * 0.32, f.desc, '#ffffff');
  spawnSeasonFanfare(season);
  if (f.effect.forceRain) {
    state.weather = { type: 'rain', timer: 1440, intensity: 0.7 };
  }
}

function drawFestivalBanner() {
  let f = getFestival();
  if (!f) return;
  let pulse = sin(frameCount * 0.05) * 0.3 + 0.7;
  fill(0, 0, 0, 120);
  noStroke();
  rectMode(CENTER);
  rect(width / 2, 55, 260, 28, 8);
  fill(color(f.color));
  textAlign(CENTER, CENTER);
  textSize(13);
  text(f.name + ' — ' + f.desc.split('—')[1].trim(), width / 2, 55);
  rectMode(CORNER);
}

function drawFestivalDecorations() {
  let f = getFestival();
  if (!f) return;
  // Floating lanterns near buildings during festivals
  state.buildings.forEach((b, i) => {
    let lx = w2sX(b.x) + sin(frameCount * 0.02 + i * 1.7) * 8;
    let ly = w2sY(b.y) - 50 + cos(frameCount * 0.03 + i * 2.1) * 4;
    let pulse = sin(frameCount * 0.06 + i) * 0.3 + 0.7;
    fill(color(f.color + hex(floor(pulse * 180), 2).slice(-2)));
    noStroke();
    rect(floor(lx) - 4, floor(ly) - 5, 8, 10);
    fill(255, 255, 200, pulse * 200);
    rect(floor(lx) - 2, floor(ly) - 2, 4, 4);
    stroke(color(f.color));
    strokeWeight(0.5);
    line(lx, ly + 6, lx, ly + 14);
    noStroke();
  });
}

function updateFestival(dt) {
  if (!state.festival || !state.festival.active) return;
  state.festival.timer += dt;
  let f = FESTIVALS[state.festival.season];
  // Saturnalia gold rain: +1 gold every 3 seconds
  if (f.effect.goldRain && frameCount % 180 === 0) {
    state.gold += 1;
    let rx = state.player.x + random(-60, 60);
    let ry = state.player.y + random(-60, 60);
    spawnParticles(rx, ry, 'harvest', 3);
    addFloatingText(w2sX(rx), w2sY(ry) - 20, '+1 Gold', '#ffcc44');
  }
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
  addFloatingText(width / 2, height * 0.25, 'The Night Market has arrived!', '#ffaa44');
  spawnParticles(state.player.x, state.player.y, 'build', 15);
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
  let panW = 310, panH = 230;
  let panX = width / 2 - panW / 2;
  let panY = height / 2 - panH / 2 - 10;

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
  textSize(8);
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
    textSize(7);
    text('Cost: ' + costStr, panX + 22, oy + 20);

    // Click hint
    if (affordable) {
      fill(180, 150, 60);
      textAlign(RIGHT, TOP);
      textSize(8);
      text('CLICK', panX + panW - 18, oy + 12);
      textAlign(LEFT, TOP);
    }
  });

  // Close hint
  fill(120, 100, 70);
  textAlign(CENTER, TOP);
  textSize(8);
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
  { id: 'arena_found', title: 'The Arena',
    text: 'On the northern isle, I found an amphitheatre carved from living rock. Sand-floored, tiered seats, even a gate mechanism. Someone built this for combat — or sport. The beasts that roam there suggest both.' },
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

function drawJournalUI() {
  if (!state.journalOpen) return;
  let pw = 360, ph = 340;
  let panX = width / 2 - pw / 2;
  let panY = height / 2 - ph / 2;

  rectMode(CORNER);
  noStroke();
  fill(0, 0, 0, 160);
  rect(0, 0, width, height);

  drawParchmentPanel(panX, panY, pw, ph);

  // Title
  fill(200, 170, 90);
  textAlign(CENTER, TOP);
  textSize(14);
  text("EXILE'S JOURNAL", width / 2, panY + 12);

  fill(160, 140, 100);
  textSize(9);
  text(state.journal.length + ' / ' + JOURNAL_ENTRIES.length + ' entries discovered', width / 2, panY + 30);

  // Scrollable entries
  let startY = panY + 50;
  let maxEntries = 7; // visible at once
  textAlign(LEFT, TOP);

  for (let i = 0; i < JOURNAL_ENTRIES.length && i < maxEntries; i++) {
    let entry = JOURNAL_ENTRIES[i];
    let unlocked = state.journal.includes(entry.id);
    let ry = startY + i * 38;

    // Row bg
    fill(i % 2 === 0 ? color(55, 45, 30, 100) : color(50, 40, 28, 60));
    rect(panX + 12, ry, pw - 24, 34, 3);

    if (unlocked) {
      // Title
      fill(210, 190, 130);
      textSize(10);
      text(entry.title, panX + 20, ry + 3);
      // Preview text (truncated)
      fill(160, 145, 110);
      textSize(7);
      let preview = entry.text.substring(0, 65) + '...';
      text(preview, panX + 20, ry + 18);
    } else {
      // Locked
      fill(90, 80, 60);
      textSize(10);
      text('???  —  ' + (i < 4 ? 'Keep exploring...' : 'A deeper mystery awaits'), panX + 20, ry + 10);
    }
  }

  // More indicator
  if (JOURNAL_ENTRIES.length > maxEntries) {
    fill(120, 100, 70);
    textAlign(CENTER, TOP);
    textSize(8);
    text('... ' + (JOURNAL_ENTRIES.length - maxEntries) + ' more entries below ...', width / 2, startY + maxEntries * 38 + 4);
  }

  // Tab hint
  fill(120, 100, 70);
  textAlign(CENTER, TOP);
  textSize(8);
  text('[TAB] Codex    [V] Close', width / 2, panY + ph - 16);
  textAlign(LEFT, TOP);
}

function drawCodexUI() {
  if (!state.codexOpen) return;
  if (state.journalOpen) { drawJournalUI(); return; }
  let pw = 340, ph = 320;
  let panX = width / 2 - pw / 2;
  let panY = height / 2 - ph / 2;

  rectMode(CORNER);
  noStroke();
  fill(0, 0, 0, 160);
  rect(0, 0, width, height);

  drawParchmentPanel(panX, panY, pw, ph);

  // Title
  fill(200, 170, 90);
  textAlign(CENTER, TOP);
  textSize(14);
  text('VILLA CODEX', width / 2, panY + 12);

  let comp = getCodexCompletion();
  fill(160, 140, 100);
  textSize(9);
  text(comp.done + ' / ' + comp.total + ' (' + floor(comp.pct * 100) + '%)', width / 2, panY + 30);

  // Progress bar
  stroke(140, 110, 55, 100);
  strokeWeight(0.5);
  line(panX + 30, panY + 44, panX + pw - 30, panY + 44);
  noStroke();
  fill(60, 50, 35);
  rect(panX + 30, panY + 48, pw - 60, 8, 4);
  fill(200, 170, 90);
  rect(panX + 30, panY + 48, (pw - 60) * comp.pct, 8, 4);

  // Categories
  let c = state.codex;
  let categories = [
    { name: 'Fish Caught', done: Object.keys(c.fishCaught).length, total: 5,
      items: ['sardine', 'tuna', 'octopus', 'eel', 'goldfish'], check: k => c.fishCaught[k] },
    { name: 'Crops Grown', done: Object.keys(c.cropsGrown).length, total: 7,
      items: ['grain', 'grape', 'olive', 'wildflower', 'sunfruit', 'pumpkin', 'frostherb'], check: k => c.cropsGrown[k] },
    { name: 'Buildings', done: Object.keys(c.buildingsBuilt).length, total: 20,
      items: Object.keys(BLUEPRINTS), check: k => c.buildingsBuilt[k] },
    { name: 'Treasures', done: min(5, c.treasuresFound), total: 5 },
    { name: 'Festivals', done: min(4, c.festivalsAttended), total: 4 },
    { name: 'Visitor Trades', done: min(5, c.visitorsTraded), total: 5 },
    { name: 'Best Combo', done: c.bestCombo >= 10 ? 1 : 0, total: 1,
      extra: 'Record: ' + c.bestCombo },
  ];

  let startY = panY + 68;
  textAlign(LEFT, TOP);
  categories.forEach((cat, i) => {
    let ry = startY + i * 32;
    // Row bg
    fill(i % 2 === 0 ? color(55, 45, 30, 100) : color(50, 40, 28, 60));
    rect(panX + 12, ry - 2, pw - 24, 28, 3);
    // Name
    fill(cat.done >= cat.total ? color(180, 200, 100) : color(200, 180, 140));
    textSize(10);
    text(cat.name, panX + 20, ry + 2);
    // Count
    fill(cat.done >= cat.total ? color(180, 200, 100) : color(140, 120, 90));
    textSize(9);
    textAlign(RIGHT, TOP);
    text(cat.done + '/' + cat.total + (cat.extra ? ' — ' + cat.extra : ''), panX + pw - 20, ry + 3);
    textAlign(LEFT, TOP);
    // Items preview
    if (cat.items) {
      let ix = panX + 20;
      textSize(7);
      cat.items.forEach((item, j) => {
        if (j > 6) return;
        let found = cat.check(item);
        fill(found ? color(160, 180, 90) : color(80, 70, 55));
        text(found ? item : '???', ix, ry + 16);
        ix += textWidth(found ? item : '???') + 6;
      });
    }
  });

  // Close hint
  fill(120, 100, 70);
  textAlign(CENTER, TOP);
  textSize(8);
  text('[TAB] Journal    [V] Close', width / 2, panY + ph - 16);
  textAlign(LEFT, TOP);
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
    x: port.x + 20, y: port.y - 10,
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
  state.codex.visitorsTraded++;
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
    textSize(8);
    text(msg, sx, sy - 32);
    rectMode(CORNER);

    if (!v.interacted) {
      fill(255, 200, 100);
      textSize(9);
      text('[E] Trade', sx, sy - 18);
    }
  }
}

// ─── SEASONAL CROPS ──────────────────────────────────────────────────────
const SEASONAL_CROPS = [
  { id: 'wildflower', name: 'Wildflower', season: 0, color: '#ff88cc', harvestValue: 2, desc: 'Spring bloom — 2x harvest, attracts butterflies' },
  { id: 'sunfruit',   name: 'Sunfruit',   season: 1, color: '#ffaa33', harvestValue: 2, desc: 'Summer gold — restores solar on harvest' },
  { id: 'pumpkin',    name: 'Pumpkin',     season: 2, color: '#dd7722', harvestValue: 3, desc: 'Autumn bounty — 3x harvest yield' },
  { id: 'frostherb',  name: 'Frost Herb',  season: 3, color: '#88ddff', harvestValue: 1, desc: 'Winter crystal — gives crystals on harvest' },
];

function getSeasonalCrop() {
  let season = getSeason();
  return SEASONAL_CROPS.find(c => c.season === season) || null;
}

function isSeasonalCrop(cropType) {
  return SEASONAL_CROPS.some(c => c.id === cropType);
}

function getSeasonalCropData(cropType) {
  return SEASONAL_CROPS.find(c => c.id === cropType);
}

// ─── COOKING SYSTEM ───────────────────────────────────────────────────────
const RECIPES = [
  { name: 'Meal',       item: 'meals', needs: { harvest: 2, fish: 1 }, hearts: 2, desc: '2 Harvest + 1 Fish → Meal' },
  { name: 'Wine',       item: 'wine',  needs: { harvest: 3, grapeSeeds: 1 }, hearts: 3, desc: '3 Harvest + 1 Grape → Wine' },
  { name: 'Olive Oil',  item: 'oil',   needs: { harvest: 2, oliveSeeds: 1 }, hearts: 3, desc: '2 Harvest + 1 Olive → Oil' },
  { name: 'Feast',      item: 'meals', qty: 3, needs: { harvest: 5, fish: 2, wood: 3 }, hearts: 5, desc: '5 Harvest + 2 Fish + 3 Wood → Grand Feast (3)' },
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
      addFloatingText(width / 2, height * 0.35, '+' + qty + ' ' + recipe.name + '!', C.solarBright);
      spawnParticles(state.player.x, state.player.y, 'harvest', 10);
    }
    c.recipe = null;
  }
}

// ─── FISH TYPES ───────────────────────────────────────────────────────────
const FISH_TYPES = [
  { name: 'Sardine',  weight: 1, color: '#88aacc', minH: 0, maxH: 24, season: -1 },
  { name: 'Tuna',     weight: 2, color: '#4477aa', minH: 6, maxH: 18, season: -1 },
  { name: 'Octopus',  weight: 3, color: '#9955aa', minH: 18, maxH: 6, season: 1 },  // night, summer
  { name: 'Eel',      weight: 2, color: '#556633', minH: 20, maxH: 5, season: -1 },  // night only
  { name: 'Goldfish', weight: 5, color: '#ffaa33', minH: 10, maxH: 14, season: 0 },  // spring noon — rare
];

function rollFishType() {
  let h = state.time / 60;
  let season = getSeason();
  let eligible = FISH_TYPES.filter(f => {
    // Time check — wraps around midnight
    if (f.minH < f.maxH) {
      if (h < f.minH || h > f.maxH) return false;
    } else {
      if (h < f.minH && h > f.maxH) return false;
    }
    if (f.season >= 0 && f.season !== season) return false;
    return true;
  });
  if (eligible.length === 0) return FISH_TYPES[0]; // fallback sardine
  // Weighted random — rarer fish less likely, prophecy boosts rare
  let rareMult = (state.prophecy && state.prophecy.type === 'rarefish') ? 3 : 1;
  if (typeof getFishingLuckBonus === 'function') rareMult *= getFishingLuckBonus();
  let weights = eligible.map(f => f.weight > 2 ? (1 / f.weight) * rareMult : 1 / f.weight);
  let total = weights.reduce((a, b) => a + b, 0);
  let r = random() * total;
  let sum = 0;
  for (let i = 0; i < eligible.length; i++) {
    sum += weights[i];
    if (r <= sum) return eligible[i];
  }
  return eligible[0];
}

// ─── WEATHER SYSTEM ──────────────────────────────────────────────────────
function updateWeather(dt) {
  let w = state.weather;
  if (w.timer > 0) {
    w.timer -= dt;
    if (w.timer <= 0) {
      w.type = 'clear';
      w.intensity = 0;
    }
  }
  // Random weather change — check once per minute of game time
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
function drawWeatherEffects() {
  let w = state.weather;
  if (w.type === 'clear') return;

  if (w.type === 'rain') {
    // Spawn raindrops — more intense, angled
    let spawnRate = floor(w.intensity * 12);
    for (let i = 0; i < spawnRate; i++) {
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
    for (let i = raindrops.length - 1; i >= 0; i--) {
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
        raindrops.splice(i, 1);
      }
    }
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
    // Heat shimmer — enhanced wavy distortion
    noStroke();
    for (let y = height * 0.45; y < height; y += 8) {
      let wave = sin(y * 0.04 + frameCount * 0.06) * 3;
      let wave2 = cos(y * 0.07 + frameCount * 0.04) * 1.5;
      fill(255, 210, 120, 6 * w.intensity);
      rect(wave + wave2, y, width, 5);
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
  // Cap raindrop array
  if (raindrops.length > 300) raindrops.splice(0, 100);
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

// ─── HARVEST COMBO ───────────────────────────────────────────────────────
function updateHarvestCombo(dt) {
  if (state.harvestCombo.timer > 0) {
    state.harvestCombo.timer -= dt;
    if (state.harvestCombo.timer <= 0) {
      state.harvestCombo.count = 0;
    }
  }
}

function onHarvestCombo(plot, baseYield) {
  let c = state.harvestCombo;
  c.count++;
  c.timer = (state.prophecy && state.prophecy.type === 'combo') ? 180 : 90;
  if (c.count > c.best) c.best = c.count;
  if (c.count > c.bestEver) c.bestEver = c.count;
  if (c.count > state.codex.bestCombo) state.codex.bestCombo = c.count;

  let tier = min(floor(c.count / 2), 6);
  let bonusPct = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6][tier];
  let finalYield = ceil(baseYield * (1 + bonusPct));

  let comboColors = ['#ffffff','#ffffff','#ffeeaa','#ffdd66','#ffcc33','#ffaa00','#ff8800'];
  let sx = w2sX(plot.x), sy = w2sY(plot.y);
  if (c.count >= 2) {
    addFloatingText(sx + 15, sy - 35, 'x' + c.count + '!', comboColors[tier]);
  }

  let pCount = min(4 + c.count * 2, 30);
  spawnParticles(plot.x, plot.y, 'harvest', pCount);

  if (c.count === 8) {
    state.screenFlash = { r: 255, g: 200, b: 50, alpha: 60, timer: 30 };
  }
  if (c.count >= 12) {
    addFloatingText(width / 2, height * 0.28, 'PERFECT HARVEST!', C.solarBright);
    state.screenFlash = { r: 255, g: 220, b: 0, alpha: 100, timer: 60 };
    // Rare seed reward
    let roll = random();
    if (roll < 0.25) { state.grapeSeeds++; addFloatingText(width / 2, height * 0.34, '+1 Grape Seed!', '#9040a0'); }
    else if (roll < 0.5) { state.oliveSeeds++; addFloatingText(width / 2, height * 0.34, '+1 Olive Seed!', '#607030'); }
    else { state.seeds++; addFloatingText(width / 2, height * 0.34, '+1 Seed!', C.vineLight); }
  }
  return finalYield;
}

function drawScreenFlash() {
  if (!state.screenFlash) return;
  let f = state.screenFlash;
  fill(f.r, f.g, f.b, f.alpha * (f.timer / 60));
  rect(0, 0, width, height);
  f.timer--;
  if (f.timer <= 0) state.screenFlash = null;
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
    textSize(7);
    textAlign(CENTER, CENTER);
    text((state.prophecy.golden ? '~ ' : '"') + state.prophecy.text + (state.prophecy.golden ? ' ~' : '"'), sx, sy - 42);
    fill(state.prophecy.golden ? color(255, 230, 100) : color(180, 160, 80));
    textSize(6);
    text(state.prophecy.desc, sx, sy - 32);
    textAlign(LEFT, TOP);
  }
}

// ─── CROP MUTATIONS ──────────────────────────────────────────────────────
function checkCropMutation(plot) {
  if (plot.blessed) return; // already mutated
  let chance = 0.05;
  if (state.weather.type === 'rain') chance *= 2;
  if (state.blessing.type === 'luck') chance *= 2;
  if (state.prophecy && state.prophecy.type === 'mutation') chance *= 3;
  let fest = getFestival();
  if (fest && fest.effect.mutation) chance *= fest.effect.mutation;
  if (state.heartRewards.includes('golden')) chance *= 1.5;
  // Aqueduct bonus
  let nearAqueduct = state.buildings.some(b => b.type === 'aqueduct' && dist2(b.x, b.y, plot.x, plot.y) < 80);
  if (nearAqueduct) chance *= 1.5;

  if (random() < chance) {
    plot.blessed = true;
    let sx = w2sX(plot.x), sy = w2sY(plot.y);
    addFloatingText(sx, sy - 25, 'Blessed ' + (plot.cropType || 'grain') + '!', '#ffdd00');
    spawnParticles(plot.x, plot.y, 'burst', 10);
  }
}

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
  textSize(8);
  text('Daily Summary', width / 2, py + 28);
  stroke(140, 110, 55, 100);
  strokeWeight(0.5);
  line(px + 20, py + 40, px + pw - 20, py + 40);
  noStroke();

  textAlign(LEFT, TOP);
  textSize(8);
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
    textSize(7);
    if (s.wreaths >= 1) text('+2 seeds at dawn', width / 2, ly); ly += 10;
    if (s.wreaths >= 2) text('+5 gold at dawn', width / 2, ly); ly += 10;
    if (s.wreaths >= 3) text('+1 crystal + blessed dawn', width / 2, ly);
  } else {
    fill(120, 100, 70);
    textAlign(CENTER, TOP);
    textSize(8);
    text('No wreath today. Do 3+ activities!', width / 2, ly);
  }

  textAlign(LEFT, TOP);

  fill(120, 100, 70);
  textAlign(CENTER, TOP);
  textSize(7);
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

// ─── NPC DIALOGUES ───────────────────────────────────────────────────────
const MARCUS_LINES = [
  "Looking to trade? I don't do charity.",
  "These waters are tricky. I've sailed worse, but not by much.",
  "Don't touch the merchandise. Just... point and I'll hand it to you.",
  "Your island's got potential. Not that I care. I care about gold.",
  "Been trading thirty years. The sea is the only honest thing left.",
  "I had a ship. A real one. Three-masted. She was called Fortuna.",
  "Storm took her. Five years ago. I don't talk about it.",
  "Hmph. You're better at this than I expected. For a farmer.",
  "Bring me something good next time. Not seeds. Something with substance.",
  "...See you next trip, then.",
];
const MARCUS_LINES_MID = [
  "Your fishing's improving. I've been watching.",
  "The octopus here are cunning. Respect them.",
  "Lucia's wine isn't bad. Don't tell her I said that.",
  "I carved Fortuna's name into the dock. Old superstition.",
  "The sea brought me here. I stayed because... the trade routes are good.",
];
const MARCUS_LINES_HIGH = [
  "I'm building a stall. Don't make a big deal about it.",
  "If I'm going to be here, might as well have a proper setup.",
  "I've been thinking about trade routes. Passive income. Interested?",
  "I used to dream about Fortuna sinking. Not anymore.",
  "I'm staying because I'm tired of leaving.",
];

const VESTA_LINES = [
  "The temple welcomes all seekers. I am Vesta. I tend the flame.",
  "You carry the scent of the mainland. It fades.",
  "The crystals are the island's memory. Handle them with reverence.",
  "I speak with the stars. They speak back.",
  "Time moves differently here. You've noticed?",
  "The blessings are not mine to give. I merely ask. The island decides.",
  "I came here before any of you. How long ago? Longer than you'd believe.",
  "Pray when you feel lost. The answer won't come immediately. But it will.",
  "The cats understand the island better than any of us.",
  "Come again. The temple is always open.",
];
const VESTA_LINES_MID = [
  "I was not always a priestess. I was a potter's daughter.",
  "I dreamed of this island for seven years before I found it.",
  "The crystals sing if you hold them long enough. A low tone.",
  "Your tone is... hopeful. Yes. That's the word.",
  "The island has moods. Today it's contemplative. Can you feel it?",
];
const VESTA_LINES_HIGH = [
  "The temple is changing. Growing. You've seen the columns straightening?",
  "This island was not always floating. It was lifted by an act of love.",
  "The crystals are the god's tears. Or their laughter.",
  "The island remembers love. It rewards it.",
  "Take this flame. It will never go out. Like the love that raised this island.",
];

const FELIX_LINES = [
  "Ah! A visitor! Don't touch anything. Especially the scrolls.",
  "I'm Felix. Former senator, current researcher. Retired, technically.",
  "These ruins are Pre-Republican, possibly. The stonework suggests--",
  "I came here to study simplicity. Instead I found cats.",
  "That grey cat? I've named her Minerva. She ignores me. Accurately named.",
  "Lucia brings me food because she thinks I forget to eat. She's correct.",
  "The ruins have carvings. Most are decorative. One chamber has writing I can't translate.",
  "Felix tried to pay me in 'knowledge' once. His name is also Felix. That's me.",
  "You're building things. Good. Civilization requires infrastructure. And cats.",
  "I had a villa on the mainland. Forty rooms. I was miserable.",
];
const FELIX_LINES_MID = [
  "I was a terrible senator. I kept proposing library funding.",
  "They laughed at my proposal for a public cat sanctuary.",
  "The calico brought me a dead mouse. In cat society, highest honor.",
  "I'm rewriting my manuscript. Title: 'The Song of Floating Stones.'",
  "Lucia read the first chapter. She cried. I've never been more terrified.",
];
const FELIX_LINES_HIGH = [
  "The library is built. My books are shelved. The cats claimed every corner.",
  "My manuscript is finished. I dedicated it to the island. And to you.",
  "I thought I came here to study simplicity. The most complex thing I found was friendship.",
  "The cats are wearing togas now. I didn't do this.",
  "Read this key. Inside is everything I know about this island.",
];

function getNPCDialogue(npc, lines, linesMid, linesHigh) {
  if (npc.hearts >= 7) {
    let idx = npc.lineIndex % linesHigh.length;
    npc.lineIndex++;
    return linesHigh[idx];
  } else if (npc.hearts >= 4) {
    let idx = npc.lineIndex % linesMid.length;
    npc.lineIndex++;
    return linesMid[idx];
  } else {
    let idx = npc.lineIndex % lines.length;
    npc.lineIndex++;
    return lines[idx];
  }
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
function drawSeasonalEffects() {
  let season = getSeason();
  let bright = getSkyBrightness();
  let ix = w2sX(WORLD.islandCX);
  let iy = w2sY(WORLD.islandCY);

  if (season === 0) {
    // === SPRING (Ver) — Cherry blossoms + butterflies + pollen ===
    // Cherry blossom petals — pink/white pixel petals drifting down
    if (frameCount % 12 === 0 && seasonLeaves.length < 25) {
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
    for (let i = seasonLeaves.length - 1; i >= 0; i--) {
      let l = seasonLeaves[i];
      l.x += l.vx + sin(frameCount * 0.015 + i * 0.7) * 0.4;
      l.y += l.vy + cos(frameCount * 0.02 + i) * 0.1;
      l.rot += l.rotV;
      l.life--;
      if (l.life <= 0) { seasonLeaves.splice(i, 1); continue; }
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
        let c2 = l.c;
        c2.setAlpha(180 * fadeA);
        fill(c2);
        rect(-l.size * 0.5, -l.size * 0.3, l.size, l.size * 0.6);
        // Petal highlight
        fill(255, 255, 255, 60 * fadeA);
        rect(-l.size * 0.2, -l.size * 0.15, l.size * 0.4, l.size * 0.3);
        pop();
      }
    }
    // Floating pollen motes (fewer, supplemental)
    if (frameCount % 40 === 0 && bright > 0.3) {
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
      for (let sy = iy - 30; sy < iy + 40; sy += 6) {
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
      if (frameCount % 35 === 0 && seasonLeaves.length < 12) {
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
      for (let i = seasonLeaves.length - 1; i >= 0; i--) {
        let l = seasonLeaves[i];
        l.x += l.vx + sin(frameCount * 0.01 + i * 1.3) * 0.4;
        l.y += l.vy + cos(frameCount * 0.012 + i * 0.9) * 0.3;
        l.life--;
        if (l.life <= 0) { seasonLeaves.splice(i, 1); continue; }
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
    } else {
      // Clear fireflies during day
      seasonLeaves = seasonLeaves.filter(l => l.type !== 'firefly');
    }

  } else if (season === 2) {
    // === AUTUMN (Autumnus) — Falling leaves + misty mornings + harvest glow ===
    if (frameCount % 14 === 0 && seasonLeaves.length < 20) {
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
    for (let i = seasonLeaves.length - 1; i >= 0; i--) {
      let l = seasonLeaves[i];
      l.x += l.vx + sin(frameCount * 0.025 + i) * 0.35;
      l.y += l.vy;
      l.rot += l.rotV;
      l.life--;
      if (l.life <= 0) { seasonLeaves.splice(i, 1); continue; }
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
    if (frameCount % 22 === 0 && seasonLeaves.length < 14) {
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
    for (let i = seasonLeaves.length - 1; i >= 0; i--) {
      let l = seasonLeaves[i];
      l.x += l.vx + sin(frameCount * 0.018 + i * 0.5) * 0.45;
      l.y += l.vy;
      l.life--;
      if (l.life <= 0) { seasonLeaves.splice(i, 1); continue; }
      fill(l.c);
      circle(l.x, l.y, l.size);
      // Subtle sparkle on larger flakes
      if (l.size > 3 && sin(frameCount * 0.1 + i) > 0.7) {
        fill(255, 255, 255, 100);
        rect(floor(l.x), floor(l.y) - 1, 1, 3);
        rect(floor(l.x) - 1, floor(l.y), 3, 1);
      }
    }
    // Frost on buildings — light blue pixel rects on tops
    if (bright > 0.2) {
      state.buildings.forEach((b, bi) => {
        let bx = w2sX(b.x), by = w2sY(b.y);
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

// ─── ISLAND ───────────────────────────────────────────────────────────────
function drawIsland() {
  let ix = w2sX(WORLD.islandCX);
  let iy = w2sY(WORLD.islandCY);
  let iw = state.islandRX * 2;
  let ih = state.islandRY * 2;

  noStroke();
  let bright = getSkyBrightness();
  let dayMix = max(0.15, bright);

  // --- Shallow water gradient (warm lagoon) ---
  // Outermost: warm medium blue
  fill(lerp(20, 48, dayMix), lerp(50, 140, dayMix), lerp(75, 180, dayMix), 180);
  ellipse(ix, iy - 10, iw * 1.12, ih * 0.50);
  // Mid shallow — turquoise
  fill(lerp(25, 60, dayMix), lerp(65, 160, dayMix), lerp(85, 190, dayMix), 200);
  ellipse(ix, iy - 12, iw * 1.06, ih * 0.46);
  // Inner shallow — bright warm turquoise
  fill(lerp(30, 80, dayMix), lerp(75, 175, dayMix), lerp(88, 192, dayMix), 210);
  ellipse(ix, iy - 13, iw * 1.00, ih * 0.43);
  // Near-shore — lightest aqua
  fill(lerp(38, 95, dayMix), lerp(85, 185, dayMix), lerp(92, 190, dayMix), 220);
  ellipse(ix, iy - 14, iw * 0.96, ih * 0.41);

  // Foam waves — animated white froth at water's edge
  let foamPhase = frameCount * 0.02;
  for (let fa = 0; fa < TWO_PI; fa += 0.3) {
    let foamPulse = sin(foamPhase + fa * 3) * 0.01 + 0.005;
    let foamRX = iw * (0.465 + foamPulse);
    let foamRY = ih * (0.196 + foamPulse * 0.4);
    let ffx = ix + cos(fa) * foamRX;
    let ffy = (iy - 14) + sin(fa) * foamRY;
    fill(255, 255, 255, 40 + sin(foamPhase + fa * 5) * 20);
    ellipse(ffx, ffy, 8 + sin(fa * 2.7) * 3, 3);
  }

  // Sandy beach ring — warm golden sand
  fill(210, 190, 145);
  ellipse(ix, iy - 14, iw * 0.93, ih * 0.39);
  // Wet sand (darker warm inner ring — tide line)
  fill(180, 158, 115);
  ellipse(ix, iy - 16, iw * 0.915, ih * 0.375);
  // Wet sand shimmer — subtle water sheen on wet zone
  let wetShimmer = sin(frameCount * 0.03) * 0.3 + 0.5;
  fill(160, 185, 200, 18 * wetShimmer * dayMix);
  ellipse(ix, iy - 15, iw * 0.925, ih * 0.385);

  // Grass top — seasonal colors with terrain variation
  let sg = getSeasonGrass();
  // Base grass
  fill(sg.r, sg.g, sg.b);
  ellipse(ix, iy - 18, iw * 0.90, ih * 0.36);

  // Elevation hints — lighter hilltop zones
  let bright2 = getSkyBrightness();
  // Central hill (lighter grass = higher ground)
  fill(sg.r + 18 * bright2, sg.g + 24 * bright2, sg.b + 8 * bright2, 50 * bright2);
  ellipse(ix + iw * 0.05, iy - 24, iw * 0.30, ih * 0.14);
  // Left hillock
  fill(sg.r + 12 * bright2, sg.g + 16 * bright2, sg.b + 4 * bright2, 40 * bright2);
  ellipse(ix - iw * 0.22, iy - 20, iw * 0.18, ih * 0.10);
  // Right hillock
  fill(sg.r + 14 * bright2, sg.g + 18 * bright2, sg.b + 6 * bright2, 35 * bright2);
  ellipse(ix + iw * 0.25, iy - 22, iw * 0.16, ih * 0.08);

  // Valley shadows (darker depressions between hills)
  fill(sg.r - 15, sg.g - 12, sg.b - 8, 30);
  ellipse(ix - iw * 0.08, iy - 16, iw * 0.14, ih * 0.06);
  fill(sg.r - 12, sg.g - 10, sg.b - 6, 25);
  ellipse(ix + iw * 0.15, iy - 14, iw * 0.12, ih * 0.05);

  // Wildflower patches — scattered colored clusters
  if (bright2 > 0.2) {
    let flowerSeeds = [
      { ox: -0.28, oy: -0.06, c: [225, 185, 60] },   // buttercup yellow
      { ox: 0.18, oy: -0.04, c: [205, 105, 135] },    // wild rose pink
      { ox: -0.12, oy: 0.02, c: [145, 125, 215] },    // lavender
      { ox: 0.32, oy: -0.02, c: [255, 150, 80] },     // poppy orange
      { ox: -0.35, oy: 0.01, c: [180, 210, 120] },    // clover green-white
      { ox: 0.06, oy: -0.08, c: [240, 220, 180] },    // chamomile
    ];
    flowerSeeds.forEach(f => {
      let fx = ix + f.ox * iw * 0.45;
      let fy = iy - 18 + f.oy * ih * 0.36;
      // Tiny flower dots (2-3 per cluster)
      for (let j = 0; j < 3; j++) {
        let dx = sin(f.ox * 17 + j * 2.3) * 4;
        let dy = cos(f.oy * 13 + j * 1.7) * 2;
        fill(f.c[0], f.c[1], f.c[2], 120 * bright2);
        rect(floor(fx + dx), floor(fy + dy), 2, 2);
      }
    });
  }

  // Mossy stones scattered on surface
  let stoneSeeds = [
    { ox: -0.30, oy: -0.03, s: 6 }, { ox: 0.22, oy: -0.06, s: 5 },
    { ox: -0.10, oy: 0.04, s: 4 },  { ox: 0.35, oy: 0.01, s: 7 },
    { ox: -0.40, oy: -0.01, s: 5 },
  ];
  stoneSeeds.forEach(st => {
    let stx = ix + st.ox * iw * 0.42;
    let sty = iy - 18 + st.oy * ih * 0.34;
    // Stone base
    fill(130, 120, 105, 80);
    ellipse(stx, sty, st.s * 1.6, st.s * 0.9);
    // Stone highlight
    fill(155, 145, 130, 60);
    ellipse(stx - 1, sty - 1, st.s * 1.0, st.s * 0.6);
    // Moss patch on stone
    fill(65, 95, 45, 70);
    ellipse(stx + 1, sty, st.s * 0.8, st.s * 0.5);
  });

  // Rim highlight — seasonal, softer
  let sr2 = getSeasonRim();
  noFill();
  stroke(sr2.r, sr2.g, sr2.b, 120);
  strokeWeight(1.2);
  ellipse(ix, iy - 18, iw * 0.90, ih * 0.36);
  noStroke();

  // Cloud shadows — tied to actual drift clouds when available
  if (bright > 0.15) {
    noStroke();
    if (cloudPositions && cloudPositions.length > 0) {
      cloudPositions.forEach(cl => {
        // Project cloud position onto island as shadow
        let shadowX = ix + (cl.x / width - 0.5) * iw * 1.2;
        let shadowY = iy - 18 + (cl.y / height) * ih * 0.6;
        let shadowW = cl.w * 0.8;
        let shadowH = cl.h * 0.4;
        fill(0, 0, 0, 14 * bright * cl.depth);
        ellipse(shadowX, shadowY, shadowW, shadowH);
      });
    } else {
      cloudShadows.forEach(cs => {
        let cx2 = ix + ((cs.x + frameCount * cs.speed * 0.001) % 1.6 - 0.8) * iw;
        let cy2 = iy - 18 + cs.y * ih * 0.3;
        fill(0, 0, 0, 16 * bright);
        ellipse(cx2, cy2, cs.w, cs.h);
      });
    }
  }

  // Pixel-art ground texture — dithered grass patches
  let sg2 = getSeasonGrass();
  for (let i = -5; i <= 5; i++) {
    let px2 = ix + i * (iw * 0.08) + sin(i * 2.3) * 12;
    let py2 = iy - 20 + sin(i * 1.1) * 5;
    // Dark dither patch
    fill(sg2.r - 12, sg2.g - 10, sg2.b - 6, 40);
    ellipse(px2, py2, 18 + abs(i) * 2, 6);
    // Bright dither dots (pixel texture)
    fill(sg2.r + 18, sg2.g + 22, sg2.b + 8, 35 * dayMix);
    for (let j = 0; j < 3; j++) {
      let dotX = px2 + (j - 1) * 5 + sin(i * 3.7 + j) * 3;
      let dotY = py2 + cos(i * 2.1 + j * 2) * 2;
      rect(dotX, dotY, 2, 2);
    }
  }

  // Gravel side-paths from ports to the main road
  noStroke();
  let roadSY2 = w2sY(WORLD.islandCY - 8);
  // Left port path — scattered gravel dots from port down to road
  let portPos = getPortPosition();
  let portSX = w2sX(portPos.x + 30);
  let portSY = w2sY(portPos.y);
  for (let gi = 0; gi < 12; gi++) {
    let gt = gi / 11;
    let gx = lerp(portSX, w2sX(WORLD.islandCX - 280), gt);
    let gy = lerp(portSY, roadSY2, gt);
    fill(145, 135, 118, 60 + gi * 4);
    rect(floor(gx) - 4, floor(gy) - 1, 8, 3, 1);
    // Scattered pebbles
    fill(125, 115, 98, 40);
    rect(floor(gx) - 2 + sin(gi * 2.1) * 3, floor(gy) + 1, 2, 1);
  }

  // Roman road (drawn first so farm zone covers the end)
  drawRomanRoad(ix, iy);

  // Farm zone background — tilled soil area (on top of road)
  drawFarmZoneBG();

  // Harbor port (player ship — left side)
  drawPort();
  // Merchant port (Mercator — right side)
  drawMerchantPort();

  // Grass tufts — individual blade clusters
  drawGrassTufts();

  // Rocky shoreline detail — stones along the coast
  drawShoreline(ix, iy, iw, ih);

  // Edge warning glow when player is near deep water (skip when rowing)
  let playerEdge = islandEdgeDist(state.player.x, state.player.y);
  if (!state.rowing.active && playerEdge > 0.05 && !isOnBridge(state.player.x, state.player.y) && !isInShallows(state.player.x, state.player.y)) {
    let warn = map(playerEdge, 0.05, 0.15, 0, 1);
    noFill();
    stroke(255, 60, 40, 80 * warn);
    strokeWeight(3 * warn);
    ellipse(ix, iy - 18, iw * 0.90, ih * 0.36);
    noStroke();
    // Crumbling particle hint
    if (frameCount % 10 === 0 && warn > 0.4) {
      let psx = w2sX(state.player.x);
      let psy = w2sY(state.player.y);
      particles.push({
        x: state.player.x + random(-10, 10),
        y: state.player.y + random(-5, 5),
        vx: random(-0.5, 0.5), vy: random(1, 3),
        life: 30, maxLife: 30, type: 'burst',
        r: 80, g: 60, b: 40, size: random(2, 4), world: true,
      });
    }
  }

  // Expansion indicator
  if (state.islandLevel < 25) {
    drawExpansionZone(ix, iy, iw, ih);
  }
}

function drawPort() {
  let port = getPortPosition();
  let px = w2sX(port.x);
  let py = w2sY(port.y);
  let bright = getSkyBrightness();

  push();
  translate(px, py);
  scale(-1, 1); // Mirror — pier extends left
  noStroke();

  // === ROMAN HARBOR (Portus Magnus) ===

  // --- Long stone pier extending far into the sea ---
  // Main pier — long stone walkway
  fill(135, 125, 105);
  rect(-30, -10, 180, 20, 3);
  // Top surface — lighter sandstone
  fill(165, 155, 138);
  rect(-30, -10, 180, 5, 3, 3, 0, 0);
  // Stone block lines
  stroke(120, 110, 95, 60);
  strokeWeight(0.5);
  for (let bx = -25; bx < 145; bx += 14) {
    line(bx, -9, bx, 9);
  }
  line(-28, 0, 148, 0);
  line(-28, -5, 148, -5);
  noStroke();

  // --- Breakwater arm curving into sea (protective wall) ---
  fill(120, 112, 98);
  beginShape();
  vertex(140, -10);
  vertex(170, -6);
  vertex(180, 4);
  vertex(175, 16);
  vertex(165, 22);
  vertex(150, 24);
  vertex(140, 18);
  vertex(140, 12);
  endShape(CLOSE);
  // Breakwater top surface
  fill(145, 138, 122);
  beginShape();
  vertex(140, -10);
  vertex(170, -6);
  vertex(168, -1);
  vertex(140, -5);
  endShape(CLOSE);

  // --- Stone arches under the pier ---
  fill(105, 98, 85);
  for (let i = 0; i < 8; i++) {
    let bx = -20 + i * 22;
    rect(bx, 8, 8, 14);
    fill(95, 88, 75);
    arc(bx + 4, 8, 8, 6, 0, PI);
    fill(105, 98, 85);
  }
  // Water between pillars
  fill(30, 80, 120, 50);
  for (let i = 0; i < 7; i++) {
    let bx = -12 + i * 22;
    rect(bx, 10, 14, 10);
  }

  // --- Stone steps from island down to pier ---
  for (let s = 0; s < 4; s++) {
    fill(155 - s * 5, 145 - s * 5, 130 - s * 5);
    rect(-38 - s * 6, -6 + s * 3, 12, 4, 1);
  }

  // --- Twin columns at pier entrance ---
  for (let ci = 0; ci < 2; ci++) {
    let cx = -32 + ci * 22;
    fill(170, 160, 145);
    rect(cx, -32, 5, 24);
    fill(150, 142, 128);
    rect(cx - 1, -10, 7, 3, 1);
    fill(175, 165, 150);
    rect(cx - 1, -34, 7, 3, 1);
  }
  // Lintel between columns
  fill(160, 152, 138);
  rect(-34, -36, 27, 2, 1);

  // --- Mooring bollards along the pier ---
  fill(150, 140, 120);
  for (let i = 0; i < 5; i++) {
    let bx = -10 + i * 32;
    rect(bx, -14, 5, 6, 1);
    fill(160, 150, 130);
    rect(bx - 1, -16, 7, 3, 2);
    fill(150, 140, 120);
  }

  // --- Trident symbol ---
  stroke(140, 120, 60);
  strokeWeight(1.2);
  let tx = 60, ty = -14;
  line(tx, ty, tx, ty - 12);
  line(tx - 4, ty - 10, tx + 4, ty - 10);
  line(tx - 4, ty - 10, tx - 5, ty - 13);
  line(tx, ty - 10, tx, ty - 14);
  line(tx + 4, ty - 10, tx + 5, ty - 13);
  noStroke();

  // --- Braziers at end of pier ---
  for (let bi = 0; bi < 2; bi++) {
    let bx2 = 120 + bi * 30;
    fill(90, 70, 40);
    rect(bx2, -8, 6, 5, 1);
    fill(110, 85, 45);
    rect(bx2 - 2, -10, 10, 3, 2);
    if (bright < 0.6) {
      let flicker = sin(frameCount * 0.15 + bi * 2) * 0.3 + 0.7;
      fill(255, 160, 40, 45 * flicker * (1 - bright));
      circle(bx2 + 3, -12, 16);
    }
  }

  // --- Crates, barrels, amphorae --- pixel
  // Barrel
  fill(110, 80, 45);
  rect(25, -9, 10, 12);
  fill(100, 70, 38);
  rect(25, -3, 10, 2); // barrel band
  fill(120, 88, 50);
  rect(26, -9, 8, 1); // top rim
  // Crate
  fill(120, 90, 50);
  rect(90, -8, 10, 8);
  fill(130, 100, 55);
  rect(90, -8, 10, 2);
  // Amphora pair — pixel
  for (let ai = 0; ai < 2; ai++) {
    let ax = 101 + ai * 10;
    fill(160, 110, 70);
    rect(ax, -8, 6, 10);
    fill(150, 100, 60);
    rect(ax + 1, -11, 4, 3); // neck
    fill(145, 98, 58);
    rect(ax - 1, -11, 8, 2); // handles/rim
  }

  // --- Player's trireme (NAVIS PARVA) docked — side-view ---
  if (!state.rowing.active) {
    let boatX = 90, boatY = 18;
    let boatBob = sin(frameCount * 0.03) * 2;
    push();
    translate(boatX, boatY + boatBob);
    noStroke();

    // Water lapping — pixel
    fill(180, 210, 230, floor(20 + sin(frameCount * 0.04) * 8));
    rect(-45, 12, 90, 4);
    rect(-40, 16, 80, 2);
    // Hull reflection
    fill(40, 70, 100, 18);
    rect(-40, 12, 80, 3);

    // Hull — side-view trireme
    fill(75, 45, 20);
    beginShape();
    vertex(-42, 0); vertex(-38, 8); vertex(30, 8);
    vertex(42, 3); vertex(48, -1); vertex(38, -3);
    vertex(-34, -3); vertex(-40, -1);
    endShape(CLOSE);
    // Planking
    stroke(90, 55, 25, 70); strokeWeight(0.5);
    line(-36, 2, 38, 2); line(-34, 5, 35, 5);
    noStroke();

    // Bronze ram
    fill(160, 120, 40);
    beginShape(); vertex(40, -2); vertex(52, 0); vertex(40, 2); endShape(CLOSE);
    fill(180, 140, 50, 150);
    triangle(42, -1, 50, 0, 42, 1);

    // Oars (resting, angled down)
    stroke(100, 70, 35); strokeWeight(1);
    for (let i = 0; i < 6; i++) {
      let ox = -28 + i * 10;
      line(ox, 7, ox - 2, 7 + 10);
    }
    noStroke();

    // Deck
    fill(100, 68, 32);
    rect(-36, -5, 72, 4, 1);
    // Rail
    fill(85, 55, 25);
    rect(-36, -6.5, 72, 1.5, 1);

    // Shields along rail — pixel
    for (let i = 0; i < 6; i++) {
      let shx = floor(-28 + i * 10);
      fill(160, 35, 25); rect(shx - 2, -9, 5, 5);
      fill(190, 160, 60); rect(shx - 1, -8, 2, 2);
    }

    // Mast + furled sail
    fill(90, 60, 28);
    rect(-2, -36, 3, 30, 1);
    // Yard arm
    fill(80, 52, 24);
    rect(-18, -34, 36, 2.5, 1);
    // Furled sail on yard
    fill(220, 205, 175, 200);
    rect(-16, -32, 32, 4, 2);
    // Red stripe
    fill(160, 40, 30, 160);
    rect(-16, -30, 32, 1.5, 1);

    // Rigging
    stroke(100, 80, 50, 70); strokeWeight(0.6);
    line(0, -36, -36, -5); line(0, -36, 36, -5);
    noStroke();

    // Stern post (curved)
    noFill(); stroke(120, 80, 30); strokeWeight(2);
    beginShape();
    vertex(-38, -3); quadraticVertex(-44, -14, -36, -22);
    endShape();
    noStroke();
    // Eagle — pixel
    fill(180, 140, 50); rect(-38, -26, 5, 5);
    fill(200, 160, 60); rect(-37, -29, 3, 3); // head
    fill(190, 150, 55); rect(-39, -25, 2, 3); rect(-35, -25, 2, 3); // wings

    // Stern cabin
    fill(80, 50, 22); rect(-40, -5, 9, 6, 1);
    fill(95, 65, 30); rect(-39, -4, 7, 4, 1);
    fill(140, 170, 180, 60); rect(-37, -3, 3, 2, 0.5);

    // Bow tower (raised forecastle)
    fill(110, 78, 38);
    rect(22, -16, 14, 12, 1);
    fill(125, 90, 45);
    rect(23, -15, 12, 10, 1);
    // Windows
    fill(50, 30, 10);
    rect(26, -13, 2, 4); rect(30, -13, 2, 4);
    // Crenellations
    fill(110, 78, 38);
    for (let ci = 0; ci < 3; ci++) { rect(22 + ci * 5, -19, 3, 3); }
    // Tower railing
    fill(100, 70, 34);
    rect(21, -16, 16, 1.5, 1);
    // Captain in tower — pixel
    fill(160, 35, 25); rect(28, -14, 5, 7); // tunic
    fill(180, 150, 70); rect(28, -15, 5, 3); // belt
    fill(210, 170, 120); rect(28, -19, 5, 5); // head
    fill(190, 160, 60); rect(27, -20, 7, 2); // helmet
    fill(200, 50, 40); rect(29, -22, 2, 2); // crest

    // Flag at mast
    let fw2 = sin(frameCount * 0.04) * 2.5;
    fill(160, 40, 30);
    beginShape();
    vertex(0, -36); vertex(0, -42); vertex(9 + fw2, -39);
    endShape(CLOSE);

    // Anchor
    stroke(110, 110, 110); strokeWeight(1.2);
    line(34, 3, 34, 11);
    noStroke();
    fill(100, 100, 100); rect(33, 11, 3, 3);
    stroke(100, 100, 100); strokeWeight(0.8);
    line(32, 11, 30, 14); line(36, 11, 38, 14);
    noStroke();

    pop();

    // Rope from boat to bollard
    stroke(160, 140, 90, 80);
    strokeWeight(0.8);
    noFill();
    bezier(boatX - 18, boatY, boatX - 22, boatY - 8, 82, -8, 86, -11);
    noStroke();
  }

  pop();
}

function getMerchantPortPosition() {
  let mpx = WORLD.islandCX + getSurfaceRX() * 0.82;
  let mpy = WORLD.islandCY - 8; // same Y as Via Romana centerline
  return { x: mpx, y: mpy };
}

function drawMerchantPort() {
  let mp = getMerchantPortPosition();
  let px = w2sX(mp.x);
  let py = w2sY(mp.y);
  let bright = getSkyBrightness();

  push();
  translate(px, py);
  noStroke();

  // === MERCHANT DOCK (Emporium) ===

  // --- Long stone pier extending far into sea ---
  fill(135, 125, 105);
  rect(-10, -8, 190, 16, 2);
  // Top surface
  fill(165, 155, 138);
  rect(-10, -8, 190, 4, 2, 2, 0, 0);
  // Stone blocks
  stroke(120, 110, 95, 50); strokeWeight(0.5);
  for (let bx = -5; bx < 175; bx += 12) line(bx, -7, bx, 7);
  line(-8, 0, 178, 0); line(-8, -4, 178, -4);
  noStroke();

  // --- Stone arches under pier ---
  fill(105, 98, 85);
  for (let i = 0; i < 9; i++) {
    let bx = -5 + i * 20;
    rect(bx, 6, 6, 10);
    fill(95, 88, 75); arc(bx + 3, 6, 6, 5, 0, PI); fill(105, 98, 85);
  }
  fill(30, 80, 120, 40);
  for (let i = 0; i < 8; i++) rect(1 + i * 20, 8, 14, 8);

  // --- Storage house (Horreum) ---
  // Foundation
  fill(120, 112, 100);
  rect(-55, -28, 48, 32, 2);
  // Walls
  fill(175, 160, 135);
  rect(-53, -26, 44, 24, 1);
  // Roof
  fill(140, 80, 40);
  beginShape();
  vertex(-57, -28); vertex(-31, -40); vertex(-5, -28);
  endShape(CLOSE);
  fill(155, 92, 48);
  beginShape();
  vertex(-55, -28); vertex(-31, -38); vertex(-7, -28);
  endShape(CLOSE);
  // Roof tiles
  stroke(125, 70, 35, 60); strokeWeight(0.5);
  for (let i = 0; i < 4; i++) {
    let ry2 = -28 - i * 3;
    line(-52 + i * 5, ry2, -10 - i * 5, ry2);
  }
  noStroke();
  // Door
  fill(100, 65, 30);
  rect(-35, -12, 8, 14, 1, 1, 0, 0);
  fill(85, 55, 25);
  rect(-34, -11, 6, 12, 1, 1, 0, 0);
  // Door handle
  fill(160, 140, 60);
  circle(-29, -5, 2);
  // Windows
  fill(140, 170, 190, 100);
  rect(-48, -20, 5, 5, 0.5);
  rect(-20, -20, 5, 5, 0.5);
  // Window bars
  stroke(100, 80, 50, 80); strokeWeight(0.5);
  line(-46, -20, -46, -15); line(-18, -20, -18, -15);
  noStroke();
  // Sign: HORREUM
  fill(110, 75, 35);
  rect(-45, -34, 28, 6, 1);
  fill(200, 180, 130);
  textSize(4); textAlign(CENTER, CENTER);
  text('EMPORIUM', -31, -31);

  // --- Crates and barrels outside --- pixel
  // Barrels
  for (let i = 0; i < 3; i++) {
    let bx2 = floor(-12 + i * 10);
    fill(110, 80, 45);
    rect(bx2, -17, 8, 10);
    fill(100, 70, 38);
    rect(bx2, -12, 8, 2); // band
    fill(105, 75, 42);
    rect(bx2, -15, 8, 1); // upper band
    fill(115, 85, 48);
    rect(bx2, -17, 8, 1); // top rim
  }
  // Crates
  fill(120, 90, 50);
  rect(22, -18, 8, 8);
  fill(130, 100, 55);
  rect(22, -18, 8, 2);
  fill(115, 85, 48);
  rect(30, -16, 7, 7);
  fill(125, 95, 52);
  rect(30, -16, 7, 2);

  // --- Amphorae --- pixel
  for (let ai = 0; ai < 2; ai++) {
    let ax = floor(38 + ai * 9);
    fill(160, 110, 70);
    rect(ax, -14, 5, 9);
    fill(150, 100, 60);
    rect(ax + 1, -17, 3, 3); // neck
    fill(145, 98, 58);
    rect(ax - 1, -17, 7, 2); // rim/handles
  }

  // --- Mooring bollards ---
  fill(150, 140, 120);
  for (let i = 0; i < 3; i++) {
    let bx3 = 10 + i * 30;
    rect(bx3, -11, 4, 5, 1);
    fill(160, 150, 130);
    rect(bx3 - 1, -13, 6, 2, 1);
    fill(150, 140, 120);
  }

  // --- Braziers ---
  for (let bi = 0; bi < 2; bi++) {
    let bx4 = 70 + bi * 25;
    fill(90, 70, 40);
    rect(bx4, -6, 5, 4, 1);
    fill(110, 85, 45);
    rect(bx4 - 1, -8, 7, 2, 1);
    if (bright < 0.6) {
      let flicker = sin(frameCount * 0.15 + bi * 2) * 0.3 + 0.7;
      fill(255, 160, 40, 40 * flicker * (1 - bright));
      circle(bx4 + 2.5, -10, 14);
    }
  }

  // --- Ox cart carrying goods (animated when Mercator docked) ---
  if (state.ship.state === 'docked') {
    // Ox walks back and forth: storage (-40) to pier end (150)
    let oxCycle = (frameCount * 0.4) % 380; // full cycle length
    let oxX, oxDir;
    if (oxCycle < 190) {
      // Walking to ship (right) — ox sprite faces left, so flip
      oxX = -40 + oxCycle;
      oxDir = -1;
    } else {
      // Walking back to storage (left) — ox naturally faces left
      oxX = 150 - (oxCycle - 190);
      oxDir = 1;
    }
    let oxY = -2;
    let legPhase = sin(frameCount * 0.12) * 2;

    push();
    translate(oxX, oxY);
    scale(oxDir, 1);
    noStroke();

    // Cart wheels — pixel
    fill(100, 70, 35);
    rect(-16, 2, 8, 8);
    rect(4, 2, 8, 8);
    // Wheel cross spokes
    fill(80, 55, 25);
    rect(-13, 5, 2, 2); rect(-16, 5, 8, 1); rect(-13, 2, 1, 8);
    rect(7, 5, 2, 2); rect(4, 5, 8, 1); rect(7, 2, 1, 8);
    // Hub caps — pixel
    fill(140, 110, 50);
    rect(-13, 5, 2, 2); rect(7, 5, 2, 2);

    // Cart bed
    fill(120, 85, 45);
    rect(-15, -2, 26, 7, 1);
    // Cart sides
    fill(110, 78, 40);
    rect(-15, -4, 26, 2, 0.5);
    // Axle
    fill(90, 65, 30);
    rect(-14, 4, 24, 1.5);

    // Cargo on cart (sacks when going to ship, empty when returning)
    if (oxCycle < 190) {
      // Full: sacks of grain/crystals
      fill(180, 160, 110);
      rect(-10, -8, 8, 6); // grain sack
      rect(-1, -7, 7, 5);
      fill(170, 150, 100);
      rect(-5, -10, 6, 5); // top sack
      // Crystal poking out
      fill(80, 200, 160, 180);
      beginShape();
      vertex(3, -8); vertex(5, -12); vertex(7, -8);
      endShape(CLOSE);
    }

    // Yoke/harness connecting ox to cart
    stroke(100, 70, 30); strokeWeight(1.2);
    line(-16, 1, -24, 1);
    noStroke();
    // Yoke crossbar
    fill(110, 80, 40);
    rect(-26, -1, 4, 3, 0.5);

    // Ox body — pixel
    let bobOx = floor(sin(frameCount * 0.12) * 0.5);
    // Body
    fill(160, 130, 90);
    rect(-40, -6 + bobOx, 16, 10);
    // Belly lighter
    fill(175, 150, 110);
    rect(-38, -2 + bobOx, 12, 6);
    // Head
    fill(150, 120, 80);
    rect(-44, -6 + bobOx, 8, 7);
    // Snout
    fill(170, 140, 100);
    rect(-46, -4 + bobOx, 3, 3);
    // Nostrils
    fill(100, 70, 50);
    rect(-46, -3 + bobOx, 1, 1);
    rect(-46, -2 + bobOx, 1, 1);
    // Eye
    fill(40, 25, 10);
    rect(-41, -5 + bobOx, 2, 2);
    fill(255, 255, 255, 120);
    rect(-41, -5 + bobOx, 1, 1);
    // Horns — pixel
    noStroke();
    fill(200, 180, 140);
    rect(-42, -9 + bobOx, 2, 3);
    rect(-39, -9 + bobOx, 2, 3);
    rect(-43, -10 + bobOx, 1, 2);
    rect(-38, -10 + bobOx, 1, 2);
    // Ears
    fill(140, 110, 75);
    rect(-38, -6 + bobOx, 3, 2);
    rect(-45, -6 + bobOx, 3, 2);
    // Legs (animated)
    fill(130, 100, 65);
    let fl = legPhase;
    rect(-37 + fl * 0.3, 3, 2.5, 6, 0.5); // front left
    rect(-35 - fl * 0.3, 3, 2.5, 6, 0.5); // front right
    rect(-29 - fl * 0.3, 3, 2.5, 6, 0.5); // back left
    rect(-27 + fl * 0.3, 3, 2.5, 6, 0.5); // back right
    // Hooves
    fill(80, 55, 30);
    rect(-37 + fl * 0.3, 8, 2.5, 1.5, 0.5);
    rect(-35 - fl * 0.3, 8, 2.5, 1.5, 0.5);
    rect(-29 - fl * 0.3, 8, 2.5, 1.5, 0.5);
    rect(-27 + fl * 0.3, 8, 2.5, 1.5, 0.5);
    // Tail
    stroke(130, 100, 65); strokeWeight(1);
    let tailSwing = sin(frameCount * 0.08) * 3;
    noFill();
    bezier(-24, -1 + bobOx, -20, -3, -18, tailSwing, -17, 2 + tailSwing);
    noStroke();
    // Tail tuft
    fill(120, 90, 55);
    circle(-17, 2 + tailSwing, 2.5);

    pop();

    // Dust puffs behind ox
    if (frameCount % 12 === 0) {
      let dustX = oxX + (oxDir < 0 ? 10 : -45) * oxDir;
      particles.push({
        x: mp.x + dustX * 0.7, y: mp.y + 4,
        vx: random(-0.2, 0.2), vy: random(-0.3, -0.1),
        life: 15, maxLife: 15, type: 'dust', size: random(2, 3),
        r: 140, g: 125, b: 100, world: true,
      });
    }

    // Gold coins floating up from storage
    let ship = state.ship;
    for (let e of (ship.autoSellLog || [])) {
      let age = frameCount - e.t;
      if (age < 60) {
        let alpha = 255 * (1 - age / 60);
        fill(255, 200, 50, alpha);
        let coinY = -38 - age * 0.4;
        circle(-31 + sin(age * 0.1) * 4, coinY, 5);
        fill(220, 180, 40, alpha);
        textSize(5); textAlign(CENTER);
        text('+' + e.gold + 'g', -31 + sin(age * 0.1) * 4, coinY - 6);
      }
    }
    // Active trade glow on building
    let glow = sin(frameCount * 0.05) * 0.3 + 0.7;
    fill(255, 200, 50, 15 * glow);
    rect(-55, -28, 48, 32, 2);
  }

  // --- Trade route line to pier ---
  stroke(160, 140, 90, 40);
  strokeWeight(0.5);
  let dashLen = 6;
  for (let d = 0; d < 60; d += dashLen * 2) {
    line(-8 + d, 0, -8 + d + dashLen, 0);
  }
  noStroke();

  pop();
}

function drawShoreline(ix, iy, iw, ih) {
  // Rocky shore details around the full island perimeter
  noStroke();
  let rx = iw * 0.46;
  let ry = ih * 0.19;
  let rockSeeds = [
    { a: 0.3, s: 5 }, { a: 0.8, s: 7 }, { a: 1.4, s: 4 },
    { a: 2.0, s: 6 }, { a: 2.6, s: 5 }, { a: 3.2, s: 8 },
    { a: 3.8, s: 3 }, { a: 4.4, s: 4 }, { a: 5.0, s: 6 },
    { a: 5.6, s: 5 }, { a: 0.9, s: 4 }, { a: 4.8, s: 7 },
    { a: 1.8, s: 3 }, { a: 3.5, s: 5 }, { a: 5.3, s: 4 },
    { a: 0.5, s: 3 }, { a: 2.3, s: 4 }, { a: 4.1, s: 3 },
  ];
  rockSeeds.forEach((r, i) => {
    let rockX = ix + cos(r.a) * (rx + 2);
    let rockY = (iy - 18) + sin(r.a) * (ry + 2);
    // Rock shadow
    fill(60 + i * 2, 52 + i * 2, 40 + i, 40);
    ellipse(rockX + 1, rockY + 1, r.s * 2, r.s * 1.2);
    // Rock body — varied colors (grey, brown, sandstone)
    let colorVar = i % 3;
    if (colorVar === 0) fill(85 + i * 3, 75 + i * 2, 58 + i * 2);
    else if (colorVar === 1) fill(100 + i * 2, 90 + i * 2, 72 + i);
    else fill(75 + i * 3, 72 + i * 2, 62 + i * 2);
    ellipse(rockX, rockY, r.s * 2, r.s * 1.2);
    // Highlight
    fill(110 + i * 2, 100 + i * 2, 82 + i, 140);
    ellipse(rockX - 1, rockY - 1, r.s * 1.2, r.s * 0.7);
    // Wet sheen on rocks near water
    fill(150, 180, 200, 25);
    ellipse(rockX, rockY + 0.5, r.s * 1.5, r.s * 0.5);
  });
  // Tiny pebbles scattered between rocks
  for (let p = 0; p < 20; p++) {
    let pa = p * 0.33 + 0.15;
    let px = ix + cos(pa) * (rx + 5 + sin(p * 1.7) * 3);
    let py = (iy - 18) + sin(pa) * (ry + 5 + cos(p * 2.3) * 2);
    fill(120, 110, 90, 50);
    rect(floor(px), floor(py), 2, 1);
  }
}

function drawFarmZoneBG() {
  let farmCX = WORLD.islandCX - 220, farmCY = WORLD.islandCY - 5;
  let lvl = state.islandLevel;
  let pw = 38, ph = 28;
  // Calculate grid bounds
  let colStart, cols, rowStart, rows;
  if (lvl === 1)      { cols = 3; rows = 3; colStart = -1; rowStart = -1; }
  else if (lvl === 2) { cols = 4; rows = 3; colStart = -1; rowStart = -1; }
  else if (lvl === 3) { cols = 4; rows = 4; colStart = -1; rowStart = -1; }
  else if (lvl === 4) { cols = 5; rows = 4; colStart = -2; rowStart = -1; }
  else                { cols = 5; rows = 5; colStart = -2; rowStart = -2; }

  let left = farmCX + colStart * pw - 20;
  let right = farmCX + (colStart + cols - 1) * pw + 20;
  let top = farmCY + rowStart * ph - 16;
  let bot = farmCY + (rowStart + rows - 1) * ph + 16;
  let fsx = w2sX(left), fsy = w2sY(top);
  let few = right - left, feh = bot - top;

  noStroke();
  // Tilled earth background — warm rich soil
  fill(65, 48, 28, 70);
  rect(fsx - 2, fsy - 2, few + 4, feh + 4, 6);
  fill(78, 58, 34, 95);
  rect(fsx, fsy, few, feh, 4);
  fill(85, 65, 38, 50);
  rect(fsx + 4, fsy + 4, few - 8, feh - 8, 3);

  // ─── Wooden fence around the farm ───
  let pad = 8;
  let fx1 = fsx - pad, fy1 = fsy - pad;
  let fw = few + pad * 2, fh = feh + pad * 2;
  let postSpacing = 24;

  // Gate — road crosses left & right sides at vertical center
  let gateH = 26;
  let gateYC = fsy + feh / 2 + 4;
  let gateY1 = gateYC - gateH / 2;
  let gateY2 = gateYC + gateH / 2;

  // Draw a fence post (vertical, with shadow and cap)
  function fPost(px, py) {
    fill(50, 38, 20, 70);
    rect(px - 2 + 1, py - 6 + 1, 6, 14);
    fill(155, 118, 68);
    rect(px - 2, py - 6, 6, 14);
    // Lighter front face
    fill(172, 138, 82);
    rect(px - 1, py - 5, 4, 5);
    // Cap
    fill(188, 155, 95);
    rect(px - 2, py - 7, 6, 3);
  }

  // Draw horizontal cross-rails between two posts
  function fRails(x1, x2, y) {
    stroke(115, 85, 48);
    strokeWeight(2);
    line(x1, y + 2, x2, y + 2);
    line(x1, y + 7, x2, y + 7);
    // Lighter highlight on top rail
    stroke(140, 110, 65, 120);
    strokeWeight(0.8);
    line(x1, y + 1, x2, y + 1);
    noStroke();
  }

  // ─── TOP fence ───
  fRails(fx1, fx1 + fw, fy1);
  for (let px = fx1; px <= fx1 + fw; px += postSpacing) fPost(px, fy1 + 4);

  // ─── BOTTOM fence ───
  fRails(fx1, fx1 + fw, fy1 + fh - 9);
  for (let px = fx1; px <= fx1 + fw; px += postSpacing) fPost(px, fy1 + fh - 5);

  // ─── LEFT fence — with gate gap ───
  // Section above gate
  if (gateY1 > fy1 + 10) {
    fRails(fx1 - 2, fx1 + 8, fy1);
    // Draw vertical cross-bars between posts (rotated rails for side view)
    for (let py = fy1 + postSpacing; py < gateY1 - 4; py += postSpacing) {
      fPost(fx1 + 3, py);
    }
    // Horizontal connecting bars for left side (above gate)
    stroke(115, 85, 48);
    strokeWeight(2);
    line(fx1 + 1, fy1 + 8, fx1 + 1, gateY1);
    line(fx1 + 6, fy1 + 8, fx1 + 6, gateY1);
    noStroke();
  }
  // Section below gate
  if (gateY2 < fy1 + fh - 10) {
    for (let py = gateY2 + 8; py < fy1 + fh - 8; py += postSpacing) {
      fPost(fx1 + 3, py);
    }
    stroke(115, 85, 48);
    strokeWeight(2);
    line(fx1 + 1, gateY2, fx1 + 1, fy1 + fh - 8);
    line(fx1 + 6, gateY2, fx1 + 6, fy1 + fh - 8);
    noStroke();
  }
  // Left gate posts (bigger, with stone caps)
  noStroke();
  fill(50, 38, 20, 80);
  rect(fx1 - 1, gateY1 - 6, 10, 10, 2);
  rect(fx1 - 1, gateY2 - 2, 10, 10, 2);
  fill(150, 115, 65);
  rect(fx1 - 2, gateY1 - 7, 10, 10, 2);
  rect(fx1 - 2, gateY2 - 3, 10, 10, 2);
  fill(185, 160, 110);
  rect(fx1 - 1, gateY1 - 8, 8, 3, 1);
  rect(fx1 - 1, gateY2 - 4, 8, 3, 1);

  // ─── RIGHT fence — with gate gap ───
  let rx = fx1 + fw - 6;
  if (gateY1 > fy1 + 10) {
    for (let py = fy1 + postSpacing; py < gateY1 - 4; py += postSpacing) {
      fPost(rx + 3, py);
    }
    stroke(115, 85, 48);
    strokeWeight(2);
    line(rx + 1, fy1 + 8, rx + 1, gateY1);
    line(rx + 6, fy1 + 8, rx + 6, gateY1);
    noStroke();
  }
  if (gateY2 < fy1 + fh - 10) {
    for (let py = gateY2 + 8; py < fy1 + fh - 8; py += postSpacing) {
      fPost(rx + 3, py);
    }
    stroke(115, 85, 48);
    strokeWeight(2);
    line(rx + 1, gateY2, rx + 1, fy1 + fh - 8);
    line(rx + 6, gateY2, rx + 6, fy1 + fh - 8);
    noStroke();
  }
  // Right gate posts
  noStroke();
  fill(50, 38, 20, 80);
  rect(rx - 1, gateY1 - 6, 10, 10, 2);
  rect(rx - 1, gateY2 - 2, 10, 10, 2);
  fill(150, 115, 65);
  rect(rx - 2, gateY1 - 7, 10, 10, 2);
  rect(rx - 2, gateY2 - 3, 10, 10, 2);
  fill(185, 160, 110);
  rect(rx - 1, gateY1 - 8, 8, 3, 1);
  rect(rx - 1, gateY2 - 4, 8, 3, 1);
}

function drawRomanRoad(ix, iy) {
  // Via Romana — one straight road across the island
  let roadY = WORLD.islandCY - 8; // consistent centerline
  let shrineSX = w2sX(WORLD.islandCX - 440);
  let farmSX = w2sX(WORLD.islandCX - 220);
  let templeSX = w2sX(WORLD.islandCX);
  let groveSX = w2sX(WORLD.islandCX + 200);
  let roadSY = w2sY(roadY); // one Y for the whole road

  function drawRoadSeg(x1, y1, x2, y2, segs) {
    let rw = 20;
    noStroke();
    // Dark gravel base (wider) — pixel
    for (let i = 0; i <= segs; i++) {
      let t = i / segs;
      let rx = floor(lerp(x1, x2, t)), ry = floor(lerp(y1, y2, t) + sin(t * PI) * 3);
      fill(95, 88, 75, 110);
      rect(rx - (rw + 6) / 2, ry - 2, rw + 6, 4);
    }
    // Stone pavers — pixel
    for (let i = 0; i <= segs; i++) {
      let t = i / segs;
      let rx = floor(lerp(x1, x2, t)), ry = floor(lerp(y1, y2, t) + sin(t * PI) * 3);
      fill(145, 138, 125, 155);
      rect(rx - rw / 2, ry - 2, rw, 4);
      if (i % 2 === 0) {
        fill(160, 152, 138, 120);
        rect(rx - rw * 0.35, ry - 1, rw * 0.33, 2);
        rect(rx + 3, ry - 1, rw * 0.33, 2);
      }
      if (i % 3 === 0) {
        fill(120, 112, 98, 50);
        rect(rx - 1, ry - 1, 3, 2);
      }
    }
    // Kerbstones — pixel
    noStroke();
    fill(165, 155, 135, 70);
    for (let i = 0; i <= segs; i += 2) {
      let t = i / segs;
      let rx = floor(lerp(x1, x2, t)), ry = floor(lerp(y1, y2, t) + sin(t * PI) * 3);
      rect(rx - 2, ry - rw * 0.14 - 1, 4, 2);
      rect(rx - 2, ry + rw * 0.14 - 1, 4, 2);
    }
  }

  // One straight Via Romana: Shrine → Farm → Temple → Grove → Emporium
  let mp = getMerchantPortPosition();
  let empSX = w2sX(mp.x - 55); // left edge of storage building
  let totalLen = dist(shrineSX + 50, roadSY, empSX, roadSY);
  let segs = max(20, floor(totalLen / 11));
  drawRoadSeg(shrineSX + 50, roadSY, empSX, roadSY, segs);

  // Stone milestones at junctions
  noStroke();
  [{ x: farmSX, y: roadSY + 8 }, { x: templeSX, y: roadSY + 8 }, { x: groveSX, y: roadSY + 8 }].forEach(j => {
    fill(155, 145, 130);
    rect(j.x - 3, j.y - 6, 6, 8, 2);
    fill(170, 160, 145);
    rect(j.x - 2, j.y - 7, 4, 3, 1);
    fill(120, 110, 95);
    rect(j.x - 1, j.y - 3, 2, 2);
  });
}

function drawNightLighting() {
  let bright = getSkyBrightness();
  if (bright > 0.55) return;
  let nightStr = map(bright, 0, 0.55, 1, 0);
  noStroke();

  // Global moonlight wash — cool blue tint over everything
  if (bright < 0.3) {
    let moonWash = map(bright, 0, 0.3, 12, 0);
    let phase = (state.day % 32) / 32;
    let fullness = 1 - abs(phase - 0.5) * 2;
    fill(60, 80, 140, moonWash * fullness);
    rect(0, 0, width, height);
  }

  // Building shadows from moonlight (cast downward-right)
  if (bright < 0.3) {
    let shadowA = map(bright, 0, 0.3, 15, 0);
    state.buildings.forEach(b => {
      let bx = w2sX(b.x), by = w2sY(b.y);
      fill(0, 0, 20, shadowA);
      rect(floor(bx) + 3, floor(by) + 2, 18, 6);
    });
  }

  // Torch and lantern light pools — warm radial glow
  state.buildings.forEach(b => {
    let bx = w2sX(b.x);
    let by = w2sY(b.y);
    if (b.type === 'torch' || b.type === 'lantern') {
      let radius = b.type === 'lantern' ? 70 : 50;
      let flicker = sin(frameCount * 0.08 + b.x) * 0.15 + 0.85;
      let flicker2 = sin(frameCount * 0.13 + b.x * 0.7) * 0.08;
      let r = radius * (flicker + flicker2);
      // Outer warm glow
      for (let gr = r; gr > 0; gr -= 3) {
        let ga = 6 * nightStr * flicker * (gr / r);
        fill(255, 180, 60, ga);
        circle(bx, by - 5, gr * 2);
      }
      // Inner hot core
      fill(255, 220, 120, 15 * nightStr * flicker);
      circle(bx, by - 8, 16);
      // Ground light pool (warm ellipse beneath)
      fill(255, 180, 60, 8 * nightStr * flicker);
      ellipse(bx, by + 5, r * 1.2, r * 0.4);

      // Ember particles from torches
      if (b.type === 'torch' && frameCount % 15 === 0 && nightStr > 0.4) {
        particles.push({
          x: b.x + random(-2, 2), y: b.y - 8,
          vx: random(-0.4, 0.4), vy: random(-1.2, -0.4),
          life: random(20, 40), maxLife: 40,
          type: 'burst', size: random(1, 2.5),
          r: 255, g: random(120, 200), b: 40,
          world: true,
        });
      }
    }
    // Window glow for doors/houses
    if (b.type === 'door') {
      let flicker2 = sin(frameCount * 0.05 + b.x * 0.3) * 0.1 + 0.9;
      fill(255, 200, 100, 25 * nightStr * flicker2);
      ellipse(bx, by + 3, 45, 18);
      fill(255, 180, 80, 55 * nightStr * flicker2);
      rect(bx - 5, by - 18, 10, 14, 1);
      // Light spill from doorway onto ground
      fill(255, 190, 90, 8 * nightStr * flicker2);
      beginShape();
      vertex(bx - 5, by);
      vertex(bx + 5, by);
      vertex(bx + 15, by + 12);
      vertex(bx - 15, by + 12);
      endShape(CLOSE);
    }
  });

  // Temple warm glow
  let tx = w2sX(WORLD.islandCX);
  let ty = w2sY(WORLD.islandCY - 15);
  let templeFlicker = sin(frameCount * 0.04) * 0.1 + 0.9;
  for (let gr = 75; gr > 0; gr -= 3) {
    fill(255, 200, 100, 4.5 * nightStr * templeFlicker * (gr / 75));
    circle(tx, ty - 20, gr * 2);
  }
  // Temple ground pool
  fill(255, 190, 90, 6 * nightStr * templeFlicker);
  ellipse(tx, ty, 100, 25);

  // Crystal shrine teal glow — pulsing
  if (state.crystalShrine) {
    let csx = w2sX(state.crystalShrine.x);
    let csy = w2sY(state.crystalShrine.y);
    let crystPulse = sin(frameCount * 0.03) * 0.3 + 0.7;
    for (let gr = 45; gr > 0; gr -= 4) {
      fill(60, 220, 190, 4 * nightStr * crystPulse * (gr / 45));
      circle(csx, csy, gr * 2);
    }
    // Crystal rays — pixel cross glow
    let rayA = 12 * nightStr * crystPulse;
    fill(80, 240, 210, rayA);
    rect(floor(csx) - 1, floor(csy) - 25, 2, 50);
    rect(floor(csx) - 25, floor(csy) - 1, 50, 2);
  }

  // Crystal nodes glow
  state.crystalNodes.forEach(cn => {
    if (cn.charge <= 0) return;
    let cx = w2sX(cn.x), cy = w2sY(cn.y);
    let pulse = sin(frameCount * 0.04 + cn.x * 0.1) * 0.3 + 0.7;
    fill(60, 200, 180, 8 * nightStr * pulse);
    circle(cx, cy, 30);
    fill(80, 230, 210, 3 * nightStr * pulse);
    circle(cx, cy, 50);
  });

  // Brazier glow
  state.buildings.forEach(b => {
    if (b.type !== 'brazier') return;
    let bx = w2sX(b.x), by = w2sY(b.y);
    let flicker3 = sin(frameCount * 0.1 + b.y) * 0.2 + 0.8;
    for (let gr = 55; gr > 0; gr -= 3) {
      fill(255, 160, 50, 5.5 * nightStr * flicker3 * (gr / 55));
      circle(bx, by - 5, gr * 2);
    }
    // Fire sparks
    if (frameCount % 25 === 0 && nightStr > 0.3) {
      for (let si = 0; si < 2; si++) {
        particles.push({
          x: b.x + random(-4, 4), y: b.y - 6,
          vx: random(-0.5, 0.5), vy: random(-1.5, -0.5),
          life: random(15, 30), maxLife: 30,
          type: 'burst', size: random(1, 2),
          r: 255, g: random(140, 200), b: 30,
          world: true,
        });
      }
    }
  });
}

function drawGrassTufts() {
  if (!state.grassTufts) return;
  let bright = getSkyBrightness();
  let windPhase = sin(frameCount * 0.018) * 1.5;
  noStroke();
  state.grassTufts.forEach(g => {
    let gx = floor(w2sX(g.x));
    let gy = floor(w2sY(g.y));
    let sw = floor(windPhase * sin(g.sway + frameCount * 0.004));
    let baseG = floor(130 * g.hue * (0.4 + bright * 0.6));
    let sg = getSeasonGrass();
    // Pixel grass — vertical 2px-wide rects
    for (let b = 0; b < g.blades; b++) {
      let bx = gx + (b - g.blades / 2) * 3;
      let h = floor(g.height + sin(b * 1.1) * 3);
      let tipOff = floor(sw * (0.5 + b * 0.1));
      // Dark base blade
      fill(sg.r - 8, sg.g + 10, sg.b - 4, 195);
      rect(bx, gy - h * 0.5, 2, floor(h * 0.5));
      // Brighter upper blade — shifted by wind
      fill(sg.r + 8, baseG + 20, sg.b + 4, 175);
      rect(bx + tipOff, gy - h, 2, floor(h * 0.55));
      // Highlight tip pixel on every other blade
      if (b % 2 === 0 && bright > 0.3) {
        fill(sg.r + 25, baseG + 40, sg.b + 12, 120);
        rect(bx + tipOff, gy - h - 1, 1, 2);
      }
    }
    // Pixel wildflower — tiny 2x2 colored rect
    if (g.hue > 1.3 && bright > 0.3) {
      let fc = (floor(g.x * 7 + g.y * 3) % 3);
      if (fc === 0) fill(225, 185, 60, 160);
      else if (fc === 1) fill(205, 105, 125, 150);
      else fill(145, 125, 205, 140);
      rect(gx + sw, gy - floor(g.height * 0.7), 2, 2);
    }
  });
}

function drawIslandBelly(cx, cy, w, h) {
  noStroke();
  // Rock strata layers — visible geological bands on cliff face
  let strataColors = [
    { r: 140, g: 125, b: 100 },  // sandstone
    { r: 120, g: 108, b: 85 },   // darker limestone
    { r: 155, g: 138, b: 110 },  // light sandstone
    { r: 105, g: 95, b: 78 },    // dark shale
    { r: 145, g: 130, b: 105 },  // medium stone
    { r: 125, g: 112, b: 90 },   // brown rock
    { r: 160, g: 145, b: 120 },  // cream limestone
    { r: 110, g: 100, b: 82 },   // grey-brown
  ];

  let spires = [
    { ox: -0.35, h: 65, w: 26 }, { ox: -0.18, h: 85, w: 22 },
    { ox: 0.0, h: 110, w: 32 }, { ox: 0.15, h: 75, w: 24 },
    { ox: 0.3, h: 60, w: 28 }, { ox: -0.5, h: 45, w: 18 },
    { ox: 0.45, h: 48, w: 20 },
  ];
  spires.forEach((s, si) => {
    let sx = cx + s.ox * w * 0.5;
    let sy = cy;

    // Draw strata layers within each spire
    let layerH = s.h / strataColors.length;
    for (let li = 0; li < strataColors.length; li++) {
      let sc = strataColors[(li + si) % strataColors.length];
      let y1 = sy + li * layerH;
      let y2 = sy + (li + 1) * layerH;
      let wFrac1 = 1 - (li * layerH) / s.h;
      let wFrac2 = 1 - ((li + 1) * layerH) / s.h;
      let hw1 = s.w / 2 * wFrac1;
      let hw2 = s.w / 2 * wFrac2;
      fill(sc.r, sc.g, sc.b);
      beginShape();
      vertex(sx - hw1, y1);
      vertex(sx + hw1, y1);
      vertex(sx + hw2, y2);
      vertex(sx - hw2, y2);
      endShape(CLOSE);
      // Subtle strata line between layers
      stroke(sc.r - 15, sc.g - 15, sc.b - 12, 50);
      strokeWeight(0.5);
      line(sx - hw1 + 1, y1, sx + hw1 - 1, y1);
      noStroke();
    }

    // Light side highlight
    fill(255, 255, 255, 15);
    triangle(sx - s.w / 4, sy, sx, sy + s.h * 0.3, sx, sy + s.h);

    // Crystal glow at tips of tall spires
    if (s.h > 65) {
      let tipGlow = 100 + sin(frameCount * 0.04 + s.ox * 10) * 50;
      fill(0, tipGlow, 80, 180);
      triangle(sx - 4, sy + s.h - 10, sx + 4, sy + s.h - 10, sx, sy + s.h + 8);
    }
  });

  // Horizontal strata crack lines across the cliff face
  stroke(90, 80, 65, 30);
  strokeWeight(0.5);
  for (let ly = 0; ly < 5; ly++) {
    let y = cy + ly * 18 + 8;
    let halfW = w * 0.38 * (1 - ly * 0.12);
    line(cx - halfW, y, cx + halfW, y);
  }
  noStroke();
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

function drawExpansionZone(ix, iy, iw, ih) {
  // Pulsing border showing expansion is possible
  let pulse = sin(frameCount * 0.03) * 0.3 + 0.7;
  noFill();
  stroke(0, 255, 136, 30 * pulse);
  strokeWeight(2);
  let nextRX = state.islandRX + 60;
  let nextRY = state.islandRY + 40;
  // Dashed ellipse effect
  for (let a = 0; a < TWO_PI; a += 0.15) {
    let x1 = ix + cos(a) * nextRX;
    let y1 = iy - 18 + sin(a) * nextRY * 0.36;
    let x2 = ix + cos(a + 0.08) * nextRX;
    let y2 = iy - 18 + sin(a + 0.08) * nextRY * 0.36;
    line(x1, y1, x2, y2);
  }
  noStroke();
}

// ─── PYRAMID ──────────────────────────────────────────────────────────────
function drawPyramid() {
  let pyr = state.pyramid;
  let sx = w2sX(pyr.x);
  let sy = w2sY(pyr.y);
  let lvl = pyr.level;

  // Proportional scaling — temple grows wider AND taller gracefully
  let baseW = 55 + lvl * 16;
  let colH = 35 + lvl * 10;
  let colCount = 4 + (lvl >= 3 ? 2 : 0) + (lvl >= 5 ? 2 : 0); // 4, 4, 6, 6, 8
  let colW = 4 + (lvl >= 3 ? 1 : 0);  // thicker columns at high level
  let steps = 2 + Math.min(lvl, 3);

  pyr.chargePhase += 0.02;

  push();
  translate(sx, sy);
  noStroke();

  // Ground shadow
  fill(0, 0, 0, 40);
  ellipse(0, 12, baseW * 1.3, 16);

  // ─── PLATFORM / STYLOBATE ───
  // Wide marble platform with proper Roman stepped base
  for (let st = 0; st < steps; st++) {
    let stepW = baseW + (steps - st) * 10;
    let stepY = 10 - st * 4;
    // Step shadow (depth)
    fill(155 - st * 5, 148 - st * 5, 138 - st * 5, 60);
    rect(-stepW / 2 + 1, stepY + 3, stepW, 2);
    // Main step — warm marble
    fill(192 - st * 5, 185 - st * 5, 175 - st * 5);
    rect(-stepW / 2, stepY, stepW, 5, 1);
    // Step front face — lighter (sunlit)
    fill(205 - st * 4, 198 - st * 4, 188 - st * 4);
    rect(-stepW / 2, stepY, stepW, 2);
    // Step edge bevel highlight
    fill(215 - st * 4, 208 - st * 4, 198 - st * 4, 100);
    rect(-stepW / 2, stepY, stepW, 0.8);
  }

  // ─── CELLA (inner chamber wall) ───
  let cellaW = baseW * 0.7;
  let cellaH = colH - 4;
  let cellaTop = 10 - steps * 4;
  // Back wall
  fill(175, 168, 158);
  rect(-cellaW / 2, cellaTop - cellaH, cellaW, cellaH);
  // Wall texture — subtle horizontal lines
  stroke(165, 158, 148, 40);
  strokeWeight(0.5);
  for (let ly = cellaTop - cellaH + 6; ly < cellaTop; ly += 8) {
    line(-cellaW / 2 + 2, ly, cellaW / 2 - 2, ly);
  }
  noStroke();
  // Cella doorway (dark entrance)
  fill(40, 35, 30);
  rect(-8, cellaTop - cellaH * 0.7, 16, cellaH * 0.7, 2, 2, 0, 0);
  // Door arch
  fill(160, 152, 142);
  arc(0, cellaTop - cellaH * 0.7, 18, 10, -PI, 0, PIE);

  // ─── COLUMNS — proper Corinthian style ───
  let colSpacing = baseW * 0.82 / (colCount - 1);
  let colStartX = -baseW * 0.41;
  let colBase = cellaTop;
  let colTop = cellaTop - cellaH;

  for (let c = 0; c < colCount; c++) {
    let cx2 = colStartX + c * colSpacing;

    // Column base — Attic style (torus + scotia + torus)
    fill(180, 174, 164);
    rect(cx2 - colW - 2, colBase - 5, colW * 2 + 4, 5, 1);
    fill(190, 184, 174);
    rect(cx2 - colW - 1, colBase - 6, colW * 2 + 2, 2, 1);

    // Column shaft — slight entasis (wider at bottom)
    fill(195, 188, 178);
    beginShape();
    vertex(cx2 - colW, colBase - 5);
    vertex(cx2 - colW + 0.5, colTop + 6);
    vertex(cx2 + colW - 0.5, colTop + 6);
    vertex(cx2 + colW, colBase - 5);
    endShape(CLOSE);

    // Fluting — vertical grooves
    stroke(175, 168, 158, 50);
    strokeWeight(0.5);
    for (let f = -colW + 1.5; f <= colW - 1.5; f += 2) {
      line(cx2 + f, colBase - 5, cx2 + f * 0.9, colTop + 6);
    }
    noStroke();

    // Capital — Corinthian (ornate with acanthus leaves)
    fill(200, 194, 184);
    rect(cx2 - colW - 2, colTop + 2, colW * 2 + 4, 4, 1); // abacus
    // Acanthus leaf decorations
    fill(185, 178, 168);
    ellipse(cx2 - colW, colTop + 5, 5, 6);
    ellipse(cx2 + colW, colTop + 5, 5, 6);
    ellipse(cx2, colTop + 4, 4, 5);
    // Volute scrolls
    fill(195, 188, 178);
    circle(cx2 - colW - 1, colTop + 3, 3);
    circle(cx2 + colW + 1, colTop + 3, 3);
  }

  // ─── ENTABLATURE ───
  let entW = colSpacing * (colCount - 1) + colW * 2 + 12;
  let entY = colTop + 2;

  // Architrave — three fasciae
  fill(190, 184, 174);
  rect(-entW / 2, entY - 2, entW, 2);
  fill(185, 178, 168);
  rect(-entW / 2, entY - 5, entW, 3);
  fill(180, 174, 164);
  rect(-entW / 2, entY - 7, entW, 2);

  // Frieze — with triglyphs and metopes
  fill(175, 168, 158);
  rect(-entW / 2 - 2, entY - 13, entW + 4, 6);
  // Triglyphs (vertical grooves)
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

  // Cornice — projecting top molding
  fill(195, 188, 178);
  rect(-entW / 2 - 4, entY - 16, entW + 8, 3, 1);
  // Dentils
  fill(185, 178, 168);
  for (let d = -entW / 2 - 2; d < entW / 2 + 2; d += 5) {
    rect(d, entY - 15, 3, 2);
  }

  // ─── PEDIMENT ───
  let pedY = entY - 16;
  let pedW = entW / 2 + 5;
  let pedH = 12 + lvl * 4;

  // Outer triangle with raking cornice
  fill(190, 184, 174);
  triangle(-pedW, pedY, pedW, pedY, 0, pedY - pedH);
  // Raking cornice edge
  stroke(200, 194, 184);
  strokeWeight(1.5);
  line(-pedW, pedY, 0, pedY - pedH);
  line(pedW, pedY, 0, pedY - pedH);
  line(-pedW, pedY, pedW, pedY);
  noStroke();

  // Tympanum (inner panel)
  fill(170, 164, 154);
  triangle(-pedW + 5, pedY, pedW - 5, pedY, 0, pedY - pedH + 4);

  // Tympanum relief sculpture — sun god / eagle motif
  let tympCY = pedY - pedH * 0.35;
  // Laurel wreath circle
  stroke(200, 180, 60, 60 + sin(pyr.chargePhase) * 25);
  strokeWeight(1.2);
  noFill();
  circle(0, tympCY, 14);
  // Sun rays
  for (let r = 0; r < 8; r++) {
    let ra = r * PI / 4 + pyr.chargePhase * 0.1;
    let r1 = 8, r2 = 12;
    line(cos(ra) * r1, tympCY + sin(ra) * r1, cos(ra) * r2, tympCY + sin(ra) * r2);
  }
  noStroke();
  // Center medallion
  fill(210, 190, 70, 80 + sin(pyr.chargePhase) * 30);
  circle(0, tympCY, 6);

  // Acroterion (decorative finials at pediment corners)
  fill(195, 188, 178);
  // Center acroterion — palmette
  ellipse(0, pedY - pedH - 2, 6, 8);
  fill(210, 190, 70, 120);
  ellipse(0, pedY - pedH - 3, 3, 5);
  // Side acroteria
  fill(195, 188, 178);
  ellipse(-pedW + 2, pedY - 3, 5, 6);
  ellipse(pedW - 2, pedY - 3, 5, 6);

  // ─── SACRED FLAME / CRYSTAL (top) ───
  let flameY = pedY - pedH - 8;
  let capPulse = sin(pyr.chargePhase * 1.5) * 0.3 + 0.7;

  // Glow aura
  let glowSize = 15 + lvl * 5;
  for (let gr = glowSize; gr > 0; gr -= 3) {
    fill(0, 255, 136, 6 * capPulse * (gr / glowSize));
    circle(0, flameY, gr * 2);
  }
  // Warm inner glow
  for (let gr = glowSize * 0.5; gr > 0; gr -= 2) {
    fill(255, 200, 60, 12 * capPulse * (gr / (glowSize * 0.5)));
    circle(0, flameY, gr * 2);
  }

  // Sacred flame shape (animated)
  let flameH = 8 + lvl * 3;
  for (let f = 0; f < 3; f++) {
    let fw = (3 - f) * 2.5 + lvl;
    let fh = flameH * (1 - f * 0.25);
    let flicker = sin(frameCount * 0.15 + f * 2) * 1.5;
    fill(lerpColor(color(0, 200, 100, 180), color(255, 200, 40, 160), f / 3));
    beginShape();
    vertex(-fw + flicker, flameY + 3);
    quadraticVertex(-fw * 0.6, flameY - fh * 0.4, flicker * 0.5, flameY - fh);
    quadraticVertex(fw * 0.6, flameY - fh * 0.4, fw + flicker, flameY + 3);
    endShape(CLOSE);
  }

  // ─── LEVEL DECORATIONS ───
  // Level 2+: bronze torches flanking entrance
  if (lvl >= 2) {
    for (let side = -1; side <= 1; side += 2) {
      let tx = side * (cellaW / 2 + 8);
      // Torch pole
      fill(140, 100, 50);
      rect(tx - 1.5, cellaTop - colH * 0.6, 3, colH * 0.4);
      // Torch fire
      let fFlicker = sin(frameCount * 0.12 + side) * 1;
      fill(255, 160, 40, 180);
      ellipse(tx + fFlicker, cellaTop - colH * 0.6 - 3, 6, 8);
      fill(255, 220, 80, 120);
      ellipse(tx + fFlicker, cellaTop - colH * 0.6 - 5, 3, 5);
    }
  }

  // Level 3+: golden eagles on pediment
  if (lvl >= 3) {
    for (let side = -1; side <= 1; side += 2) {
      let eagleX = side * (pedW * 0.5);
      let eagleY = pedY - pedH * 0.15;
      fill(200, 170, 50);
      // Eagle body
      ellipse(eagleX, eagleY, 6, 4);
      // Wings spread
      beginShape();
      vertex(eagleX - 3 * side, eagleY);
      vertex(eagleX - 8 * side, eagleY - 4);
      vertex(eagleX - 6 * side, eagleY - 1);
      endShape(CLOSE);
    }
  }

  // Level 3+: marble statues flanking entrance
  if (lvl >= 3) {
    for (let side = -1; side <= 1; side += 2) {
      let statX = side * (baseW / 2 + 12);
      // Ornate pedestal with molding
      fill(175, 168, 158);
      rect(statX - 6, 4, 12, 4, 1);
      fill(180, 174, 164);
      rect(statX - 5, 0, 10, 5, 1);
      fill(190, 184, 174);
      rect(statX - 6, -1, 12, 2, 1);
      // Statue figure — Roman senator/god
      fill(205, 200, 190);
      // Toga/body
      rect(statX - 3, -12, 6, 13, 1);
      // Toga drape detail
      fill(195, 190, 180);
      rect(statX - 2 * side, -10, 3, 10);
      // Head with laurel
      fill(210, 205, 195);
      circle(statX, -16, 7);
      // Laurel wreath on statue
      fill(160, 175, 80, 100);
      rect(statX - 3, -18, 2, 1);
      rect(statX + 1, -18, 2, 1);
      // Arm raised holding torch/spear
      fill(200, 195, 185);
      rect(statX + 3 * side, -14, 2, 8, 1);
      // Spear in hand
      fill(170, 140, 58);
      rect(statX + 4 * side, -22, 1, 14);
      // Spear tip
      fill(190, 190, 200);
      rect(statX + 4 * side, -24, 1, 3);
    }
  }

  // Level 5: golden roof tiles shimmer
  if (lvl >= 5) {
    let shimmer = sin(frameCount * 0.03) * 0.3 + 0.7;
    fill(220, 190, 60, 30 * shimmer);
    triangle(-pedW + 5, pedY, pedW - 5, pedY, 0, pedY - pedH + 4);
    // Gold acroteria
    fill(220, 195, 60);
    ellipse(0, pedY - pedH - 2, 8, 10);
    ellipse(-pedW + 2, pedY - 3, 7, 8);
    ellipse(pedW - 2, pedY - 3, 7, 8);
  }

  // Level 25: glowing golden apex
  if (lvl >= 25) {
    let gPulse = sin(frameCount * 0.04) * 0.3 + 0.7;
    fill(255, 220, 60, 40 * gPulse);
    ellipse(0, pedY - pedH - 2, 24, 24);
    fill(255, 200, 40, 60 * gPulse);
    ellipse(0, pedY - pedH - 2, 14, 14);
    fill(255, 240, 120);
    ellipse(0, pedY - pedH - 2, 6, 6);
  }

  // Night golden glow — temple radiates warmth after dark
  let tBright = getSkyBrightness();
  if (tBright < 0.5) {
    let nightGlow = map(tBright, 0, 0.5, 1, 0);
    let glowPulse = sin(pyr.chargePhase * 0.5) * 0.15 + 0.85;
    // Warm golden aura around temple
    fill(255, 200, 80, 8 * nightGlow * glowPulse);
    ellipse(0, cellaTop - cellaH * 0.3, baseW * 1.5, colH * 1.2);
    // Window/doorway light spill
    fill(255, 190, 70, 35 * nightGlow * glowPulse);
    rect(-6, cellaTop - cellaH * 0.5, 12, cellaH * 0.5);
    // Column highlighting from interior light
    fill(255, 210, 100, 10 * nightGlow);
    for (let c = 0; c < colCount; c++) {
      let cx2 = colStartX + c * colSpacing;
      rect(cx2 - colW, colBase - colH * 0.5, colW * 2, colH * 0.4);
    }
  }

  // ─── INTERACTION PROMPT ───
  let playerDist = dist2(state.player.x, state.player.y, pyr.x, pyr.y);
  if (playerDist < 70 && !state.buildMode) {
    fill(color(C.hudBg));
    stroke(color(C.hudBorder));
    strokeWeight(1);
    let promptY2 = pedY - pedH - 25;
    rect(-50, promptY2 - 2, 100, 16, 3);
    noStroke();
    fill(color(C.crystalGlow));
    textAlign(CENTER, CENTER);
    textSize(8);
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
  textSize(7);
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

    // Subtle golden glow (ancient energy)
    let runeAlpha = 15 + sin(frameCount * 0.03 + r.rot * 20) * 10;
    fill(200, 170, 80, runeAlpha);
    circle(0, -columns[1].h * 0.5, 6);

    pop();
  });
}

// ─── Y-SORTED WORLD RENDERING ────────────────────────────────────────────
function drawWorldObjectsSorted() {
  // Layer 0: ground-level flat objects (always behind characters)
  let ground = [];
  let templeX = state.pyramid.x, templeY = state.pyramid.y;
  let inTemple = (x, y) => abs(x - templeX) < 70 && y > templeY - 80 && y < templeY + 15;
  state.plots.forEach(p => ground.push({ y: p.y, draw: () => drawOnePlot(p) }));
  state.resources.forEach(r => { if (!inTemple(r.x, r.y)) ground.push({ y: r.y, draw: () => drawOneResource(r) }); });
  state.crystalNodes.forEach(c => ground.push({ y: c.y, draw: () => drawOneCrystal(c) }));
  ground.sort((a, b) => a.y - b.y);
  ground.forEach(i => i.draw());

  // Layer 1: tall objects + all characters (Y-sorted together)
  let items = [];
  // Temple and ruins — sort by bottom edge (steps extend ~12px below center)
  items.push({ y: state.pyramid.y + 12, draw: drawPyramid });
  items.push({ y: WORLD.islandCY - 30, draw: drawRuins });
  // Buildings — sort by bottom edge so characters in front overlap correctly
  state.buildings.forEach(b => items.push({ y: b.y + (b.h || 0) / 2, draw: () => drawOneBuilding(b) }));
  // Trees
  state.trees.forEach(t => items.push({ y: t.y, draw: () => drawOneTree(t) }));
  // Crystal shrine
  if (state.crystalShrine) items.push({ y: state.crystalShrine.y, draw: drawCrystalShrine });
  // Fountain
  items.push({ y: WORLD.islandCY + 35, draw: drawFountain });
  // Chickens
  if (state.chickens) state.chickens.forEach((ch, i) => items.push({ y: ch.y, draw: () => drawOneChicken(ch) }));
  // Harvester companion — only if awakened
  let prog = state.progression;
  let fullyUnlocked = !prog.gameStarted || prog.villaCleared; // old saves = fully unlocked
  if (state.harvester && (fullyUnlocked || prog.companionsAwakened.harvester))
    items.push({ y: state.harvester.y, draw: drawHarvester });
  // Cats
  if (state.cats && fullyUnlocked) state.cats.forEach(cat => items.push({ y: cat.y, draw: () => drawOneCat(cat) }));
  // Characters — gated by progression
  if (fullyUnlocked || prog.companionsAwakened.lares)
    items.push({ y: state.companion.y, draw: drawCompanion });
  if (state.woodcutter && (fullyUnlocked || prog.companionsAwakened.woodcutter))
    items.push({ y: state.woodcutter.y, draw: drawWoodcutter });
  if (state.quarrier && state.quarrier.unlocked)
    items.push({ y: state.quarrier.y, draw: drawQuarrier });
  if (!state.rowing.active && (fullyUnlocked || prog.companionsAwakened.centurion))
    items.push({ y: state.centurion.y, draw: drawCenturion });
  // Main NPC — always present once home reached
  if (fullyUnlocked || prog.homeIslandReached)
    items.push({ y: state.npc.y, draw: drawNPC });
  // New NPCs — gated by discovery
  if (state.marcus && state.marcus.present && (fullyUnlocked || prog.npcsFound.marcus))
    items.push({ y: state.marcus.y, draw: () => drawNewNPC(state.marcus, 'marcus') });
  if (fullyUnlocked || prog.npcsFound.vesta)
    items.push({ y: state.vesta.y, draw: () => drawNewNPC(state.vesta, 'vesta') });
  if (fullyUnlocked || prog.npcsFound.felix)
    items.push({ y: state.felix.y, draw: () => drawNewNPC(state.felix, 'felix') });
  // Night market
  if (state.nightMarket.active) {
    let mp = getMarketPosition();
    items.push({ y: mp.y, draw: drawNightMarket });
  }
  // Visitor
  if (state.visitor) items.push({ y: state.visitor.y, draw: drawVisitor });
  items.push({ y: state.player.y, draw: drawPlayer });
  // Sort by Y (back to front)
  items.sort((a, b) => a.y - b.y);
  items.forEach(i => i.draw());
}

// ─── BUILDINGS (BLUEPRINTS) ──────────────────────────────────────────────
function drawBuildings() {
  state.buildings.forEach(b => drawOneBuilding(b));
}
function drawOneBuilding(b) {
    let sx = w2sX(b.x);
    let sy = w2sY(b.y);
    let bw = b.w;
    let bh = b.h;

    push();
    translate(sx, sy);

    switch (b.type) {
      case 'wall':
        // Roman stone wall — ashlar blocks with visible mortar
        noStroke();
        // Shadow base
        fill(0, 0, 0, 30);
        rect(-bw / 2 + 1, -bh / 2 - 18, bw, 22 + bh, 1);
        // Main wall face — warm limestone
        fill(195, 185, 168);
        rect(-bw / 2, -bh / 2 - 20, bw, 20 + bh, 1);
        // Top capstone — lighter with molding
        fill(210, 200, 182);
        rect(-bw / 2, -bh / 2 - 22, bw, 4, 1);
        fill(215, 208, 192);
        rect(-bw / 2, -bh / 2 - 22, bw, 1.5);
        // Bottom molding — heavier base
        fill(180, 170, 152);
        rect(-bw / 2, -bh / 2 + bh - 2, bw, 3, 1);
        fill(170, 160, 142);
        rect(-bw / 2, -bh / 2 + bh, bw, 1);
        // Ashlar stone blocks with mortar lines
        // Mortar fill (lighter than stone)
        stroke(155, 148, 132, 80);
        strokeWeight(0.8);
        for (let ly = -bh / 2 - 16; ly < -bh / 2 + bh - 2; ly += 5) {
          line(-bw / 2 + 1, ly, bw / 2 - 1, ly);
          let off = (floor((ly + 16) / 5) % 2) * 8;
          for (let lx = -bw / 2 + off + 6; lx < bw / 2 - 2; lx += 14) {
            line(lx, ly, lx, ly + 5);
          }
        }
        noStroke();
        // Individual stone block color variation
        for (let ly = -bh / 2 - 16; ly < -bh / 2 + bh - 2; ly += 5) {
          let off = (floor((ly + 16) / 5) % 2) * 8;
          for (let lx = -bw / 2 + off + 1; lx < bw / 2 - 2; lx += 14) {
            let cv = sin(lx * 0.3 + ly * 0.5) * 8;
            fill(195 + cv, 185 + cv, 168 + cv, 30);
            rect(lx, ly + 0.5, 12, 4);
          }
        }
        // Sunlit highlight on top-left
        fill(225, 218, 200, 35);
        rect(-bw / 2 + 1, -bh / 2 - 20, bw / 3, 18, 1);
        // Weathering — dark spots
        fill(160, 150, 132, 25);
        rect(bw / 4, -bh / 2 - 8, 4, 6);
        rect(-bw / 4, -bh / 2, 3, 4);
        break;

      case 'floor':
        // Roman mosaic tile floor — decorative pattern
        noStroke();
        // Base tile — warm marble
        fill(185, 178, 162);
        rect(-bw / 2, -bh / 2, bw, bh, 1);
        // Mosaic tile grid — alternating colors
        let mTileColors = [
          [195, 188, 172], [175, 168, 152], [185, 170, 145], [170, 162, 148]
        ];
        for (let ty = -bh / 2 + 1; ty < bh / 2; ty += 4) {
          for (let tx = -bw / 2 + 1; tx < bw / 2; tx += 4) {
            let ci = abs(floor(tx / 4) + floor(ty / 4)) % 4;
            let mc = mTileColors[ci];
            fill(mc[0], mc[1], mc[2], 140);
            rect(tx, ty, 3.5, 3.5);
          }
        }
        // Mosaic grout lines
        stroke(155, 148, 132, 60);
        strokeWeight(0.3);
        for (let ty = -bh / 2; ty <= bh / 2; ty += 4) {
          line(-bw / 2, ty, bw / 2, ty);
        }
        for (let tx = -bw / 2; tx <= bw / 2; tx += 4) {
          line(tx, -bh / 2, tx, bh / 2);
        }
        noStroke();
        // Center medallion — small decorative diamond
        if (bw > 10 && bh > 10) {
          fill(200, 165, 50, 100);
          beginShape();
          vertex(0, -3); vertex(3, 0); vertex(0, 3); vertex(-3, 0);
          endShape(CLOSE);
          fill(170, 55, 35, 80);
          rect(-1, -1, 2, 2);
        }
        // Worn patina — subtle aging
        fill(165, 158, 140, 20);
        rect(-bw * 0.25, -bh * 0.25, bw * 0.5, bh * 0.5);
        break;

      case 'door':
        // Roman arched doorway — stone frame with wooden door
        noStroke();
        // Stone frame
        fill(190, 182, 165);
        rect(-bw / 2, -bh / 2 - 28, bw, 28 + bh, 1);
        // Arch top
        fill(200, 192, 175);
        arc(0, -bh / 2 - 10, bw - 4, 18, PI, TWO_PI);
        // Dark interior / door
        fill(60, 40, 22);
        rect(-bw / 2 + 4, -bh / 2 - 22, bw - 8, 22 + bh - 4, 1);
        fill(50, 32, 16);
        arc(0, -bh / 2 - 10, bw - 10, 14, PI, TWO_PI);
        // Door planks
        stroke(72, 50, 28, 100);
        strokeWeight(0.6);
        line(-2, -bh / 2 - 20, -2, bh / 2 - 4);
        line(4, -bh / 2 - 20, 4, bh / 2 - 4);
        noStroke();
        // Iron ring handle
        stroke(120, 115, 105);
        strokeWeight(1.5);
        noFill();
        arc(bw / 6, -bh / 2 - 4, 5, 6, 0, PI);
        noStroke();
        // Keystone at arch top
        fill(210, 200, 180);
        beginShape();
        vertex(-3, -bh / 2 - 18);
        vertex(3, -bh / 2 - 18);
        vertex(2, -bh / 2 - 24);
        vertex(-2, -bh / 2 - 24);
        endShape(CLOSE);
        break;

      case 'chest':
        // Roman strongbox (arca) — slightly open, bronze-bound
        noStroke();
        // Shadow
        fill(0, 0, 0, 25);
        rect(-(bw + 4) / 2, bh * 0.3 - 2, bw + 4, 4);
        // Body — dark stained wood with grain
        fill(65, 42, 18);
        rect(-bw / 2, -bh / 2, bw, bh * 0.6, 2);
        // Wood grain lines
        fill(58, 36, 14, 60);
        rect(-bw / 2 + 2, -bh / 2 + 2, bw - 4, 1);
        rect(-bw / 2 + 2, -bh / 2 + 5, bw - 4, 1);
        // Lid — slightly open (tilted up)
        fill(75, 52, 24);
        beginShape();
        vertex(-bw / 2 - 1, -bh / 2 - 2);
        vertex(bw / 2 + 1, -bh / 2 - 2);
        vertex(bw / 2, -bh / 2 - 10);
        vertex(-bw / 2, -bh / 2 - 8);
        endShape(CLOSE);
        // Lid top surface visible (the gap)
        fill(85, 62, 30);
        beginShape();
        vertex(-bw / 2, -bh / 2 - 8);
        vertex(bw / 2, -bh / 2 - 10);
        vertex(bw / 2 - 2, -bh / 2 - 11);
        vertex(-bw / 2 + 2, -bh / 2 - 9);
        endShape(CLOSE);
        // Bronze bands on body
        fill(160, 130, 55);
        rect(-bw / 2 - 1, -bh / 2 - 2, bw + 2, 2);
        rect(-bw / 2 - 1, -bh / 2 + bh * 0.25, bw + 2, 2);
        // Bronze band on lid
        fill(165, 135, 58);
        rect(-bw / 2, -bh / 2 - 6, bw, 1.5);
        // Bronze corner rivets
        fill(175, 145, 65);
        circle(-bw / 2 + 2, -bh / 2 + 1, 4);
        circle(bw / 2 - 2, -bh / 2 + 1, 4);
        circle(-bw / 2 + 2, -bh / 2 + bh * 0.25 + 1, 3);
        circle(bw / 2 - 2, -bh / 2 + bh * 0.25 + 1, 3);
        // Lock plate — ornate
        fill(180, 150, 65);
        rect(-3, -bh / 2 - 4, 6, 6, 1);
        fill(140, 110, 40);
        circle(0, -bh / 2 - 1, 2.5);
        // Treasure glow from the gap — golden light spilling out
        let chestGlow = 45 + sin(frameCount * 0.05 + b.x * 0.1) * 25;
        fill(255, 200, 60, chestGlow);
        rect(-bw / 2 + 2, -bh / 2 - 2, bw - 4, 2, 1);
        // Extra warm glow above lid gap
        fill(255, 210, 80, chestGlow * 0.4);
        rect(-bw / 4, -bh / 2 - 3, bw / 2, 1);
        break;

      case 'bridge':
        // Roman stone bridge — arched with balustrade
        noStroke();
        // Shadow
        fill(0, 0, 0, 35);
        rect(-bw / 2 + 2, -bh / 2 + 3, bw, bh + 1, 2);
        // Main deck — stone
        fill(170, 162, 148);
        rect(-bw / 2, -bh / 2, bw, bh, 2);
        // Stone block lines
        stroke(150, 142, 128, 70);
        strokeWeight(0.5);
        for (let pl = -bh / 2 + 5; pl < bh / 2; pl += 7) {
          line(-bw / 2 + 1, pl, bw / 2 - 1, pl);
        }
        noStroke();
        // Side walls
        fill(185, 178, 162);
        rect(-bw / 2, -bh / 2 - 6, bw, 6, 1);
        // Coping stones on top
        fill(195, 188, 172);
        rect(-bw / 2, -bh / 2 - 8, bw, 3, 1);
        // Drain holes (decorative)
        fill(100, 90, 78);
        circle(-bw / 4, -bh / 2 - 3, 3);
        circle(bw / 4, -bh / 2 - 3, 3);
        break;

      case 'fence':
        // Roman balustrade — low marble fence with columns
        noStroke();
        // Base rail
        fill(185, 178, 165);
        rect(-bw / 2, 0, bw, 4, 1);
        // Top rail
        fill(195, 188, 175);
        rect(-bw / 2, -14, bw, 3, 1);
        // Mini columns (balusters)
        fill(190, 183, 170);
        for (let i = 0; i < 4; i++) {
          let cx = -bw / 2 + 4 + i * (bw - 8) / 3;
          rect(cx - 1.5, -11, 3, 11);
          // Bulge in middle — pixel
          rect(cx - 2, -7, 4, 4);
        }
        // End posts — taller with caps
        fill(200, 193, 180);
        rect(-bw / 2 - 1, -18, 5, 22, 1);
        rect(bw / 2 - 4, -18, 5, 22, 1);
        // Post caps
        fill(210, 203, 190);
        rect(-bw / 2 - 2, -20, 7, 3, 1);
        rect(bw / 2 - 5, -20, 7, 3, 1);
        break;

      case 'torch':
        // Roman standing brazier — bronze fire bowl on tripod
        noStroke();
        // Tripod legs
        fill(140, 110, 50);
        beginShape(); vertex(-1, 0); vertex(-6, 16); vertex(-4, 16); vertex(0, 2); endShape(CLOSE);
        beginShape(); vertex(1, 0); vertex(6, 16); vertex(4, 16); vertex(0, 2); endShape(CLOSE);
        // Front leg
        fill(130, 100, 45);
        rect(-1.5, 0, 3, 16, 1);
        // Bronze bowl
        fill(175, 140, 55);
        arc(0, -2, 14, 8, 0, PI, PIE);
        fill(160, 125, 48);
        ellipse(0, -2, 14, 5);
        // Fire (animated)
        let flicker = sin(frameCount * 0.3 + b.x * 0.7) * 2;
        let flicker2 = cos(frameCount * 0.4 + b.y * 0.5) * 1.5;
        // Outer glow
        for (let gr = 28; gr > 0; gr -= 3) {
          fill(255, 120, 20, 6);
          circle(0, -6, gr);
        }
        // Fire body — layered
        fill(255, 80, 20, 180);
        beginShape();
        vertex(flicker * 0.3, -20 + flicker);
        vertex(-5, -4);
        vertex(5, -4);
        endShape(CLOSE);
        fill(255, 160, 40, 200);
        beginShape();
        vertex(flicker2 * 0.4, -16 + flicker * 0.6);
        vertex(-3.5, -4);
        vertex(3.5, -4);
        endShape(CLOSE);
        fill(255, 220, 80, 220);
        beginShape();
        vertex(0, -12 + flicker * 0.3);
        vertex(-2, -4);
        vertex(2, -4);
        endShape(CLOSE);
        // Embers
        fill(255, 200, 60, 150);
        circle(flicker * 0.5, -5, 2);
        circle(-flicker2 * 0.3, -3, 1.5);
        break;

      case 'flower':
        // Roman garden rose bush
        noStroke();
        // Leaves/bush base
        fill(40, 75, 25);
        ellipse(0, 2, 14, 8);
        fill(50, 85, 30);
        ellipse(-2, 0, 10, 7);
        ellipse(3, 1, 10, 6);
        // Stems
        stroke(45, 70, 22);
        strokeWeight(0.7);
        line(-3, -2, -4, -8);
        line(1, -1, 2, -9);
        line(4, 0, 6, -6);
        noStroke();
        // Roses — deterministic color
        let petals = [[200, 60, 80], [255, 180, 100], [180, 100, 180]][(floor(b.x * 7) % 3)];
        // Rose 1
        fill(petals[0], petals[1], petals[2], 220);
        circle(-4, -9, 5);
        fill(petals[0] + 30, petals[1] + 20, petals[2] + 20, 160);
        circle(-3.5, -9.5, 2.5);
        // Rose 2
        fill(petals[0], petals[1], petals[2], 200);
        circle(2, -10, 4.5);
        fill(petals[0] + 30, petals[1] + 20, petals[2] + 20, 140);
        circle(2.5, -10.5, 2);
        // Rose 3
        fill(petals[0] - 15, petals[1] - 10, petals[2] - 10, 180);
        circle(6, -7, 4);
        break;

      case 'lantern':
        // Roman oil lamp on pedestal
        noStroke();
        // Pedestal base
        fill(175, 168, 155);
        rect(-5, 8, 10, 4, 1);
        fill(185, 178, 165);
        rect(-4, 5, 8, 4, 1);
        // Column shaft
        fill(180, 173, 160);
        rect(-2, -10, 4, 16, 1);
        // Capital
        fill(190, 183, 170);
        rect(-4, -12, 8, 3, 1);
        // Oil lamp on top
        fill(170, 130, 55);
        ellipse(0, -14, 10, 5);
        fill(155, 118, 48);
        ellipse(4, -14, 4, 3); // spout
        // Flame
        let lampBright = getSkyBrightness();
        let lampStr = map(lampBright, 0, 1, 1, 0.25);
        // Glow
        for (let gr = 24; gr > 0; gr -= 3) {
          fill(255, 180, 60, 5 * lampStr);
          circle(4, -18, gr);
        }
        fill(255, 200, 60, 200 * lampStr);
        let lf = sin(frameCount * 0.25 + b.x) * 1;
        beginShape();
        vertex(4 + lf * 0.3, -22 + lf);
        vertex(2, -16);
        vertex(6, -16);
        endShape(CLOSE);
        fill(255, 240, 150, 160 * lampStr);
        circle(4, -17, 2);
        break;

      case 'mosaic':
        // Roman mosaic floor — detailed geometric pattern
        noStroke();
        // Base tile
        fill(195, 188, 172);
        rect(-16, -16, 32, 32, 1);
        // Outer border — terracotta
        fill(165, 80, 50, 180);
        rect(-16, -16, 32, 2);
        rect(-16, 14, 32, 2);
        rect(-16, -16, 2, 32);
        rect(14, -16, 2, 32);
        // Inner border — navy
        fill(40, 50, 100, 160);
        rect(-13, -13, 26, 2);
        rect(-13, 11, 26, 2);
        rect(-13, -13, 2, 26);
        rect(11, -13, 2, 26);
        // Geometric diamond pattern
        let mColors = [[165, 45, 35], [35, 50, 110], [190, 170, 55], [180, 90, 45]];
        for (let mx = -10; mx <= 6; mx += 6) {
          for (let my = -10; my <= 6; my += 6) {
            let ci = abs((mx + my + 20) / 6) % 4;
            let mc = mColors[floor(ci)];
            fill(mc[0], mc[1], mc[2], 200);
            // Diamond shape
            beginShape();
            vertex(mx + 2, my); vertex(mx + 4, my + 2);
            vertex(mx + 2, my + 4); vertex(mx, my + 2);
            endShape(CLOSE);
          }
        }
        // Center medallion — sun motif
        fill(200, 165, 50);
        circle(0, 0, 9);
        fill(220, 185, 60);
        circle(0, 0, 6);
        // Sun rays
        stroke(200, 165, 50, 180);
        strokeWeight(0.8);
        for (let r = 0; r < 8; r++) {
          let ra = r * TWO_PI / 8;
          line(cos(ra) * 3, sin(ra) * 3, cos(ra) * 5.5, sin(ra) * 5.5);
        }
        noStroke();
        fill(170, 55, 35);
        circle(0, 0, 3);
        break;

      case 'aqueduct':
        // Roman aqueduct — proper arched stone construction
        noStroke();
        // Shadow
        fill(0, 0, 0, 25);
        rect(-15, 2, 30, 10, 1);
        // Pillars with slight taper
        fill(185, 178, 165);
        beginShape();
        vertex(-14, 10); vertex(-12, -10); vertex(-8, -10); vertex(-10, 10);
        endShape(CLOSE);
        beginShape();
        vertex(10, 10); vertex(8, -10); vertex(12, -10); vertex(14, 10);
        endShape(CLOSE);
        // Pillar highlight
        fill(195, 188, 175, 80);
        rect(-13, -8, 2, 16);
        rect(9, -8, 2, 16);
        // Arch — semicircular
        fill(190, 183, 170);
        arc(0, 0, 20, 16, PI, TWO_PI, PIE);
        // Arch interior — dark
        fill(50, 62, 35);
        arc(0, 0, 16, 12, PI, TWO_PI, PIE);
        // Keystone
        fill(200, 193, 178);
        beginShape();
        vertex(-2, -8); vertex(2, -8); vertex(2.5, -5); vertex(-2.5, -5);
        endShape(CLOSE);
        // Water channel on top
        fill(180, 173, 160);
        rect(-16, -12, 32, 4, 1);
        // Capstone
        fill(195, 188, 175);
        rect(-16, -14, 32, 2.5, 1);
        // Water flowing in channel
        let waterPhase = frameCount * 0.06 + b.x * 0.1;
        fill(55, 110, 170, 140);
        rect(-14, -11.5, 28, 2, 1);
        // Water shimmer
        fill(80, 150, 200, 60 + sin(waterPhase) * 25);
        rect(-10, -11.5, 8, 1.5, 1);
        rect(4, -11.5, 8, 1.5, 1);
        break;
      case 'bath':
        // Roman bath house (balneum) — heated pool with columns
        noStroke();
        // Foundation
        fill(170, 160, 145);
        rect(-24, -8, 48, 36, 2);
        fill(180, 172, 158);
        rect(-22, -6, 44, 32, 2);
        // Pool
        fill(55, 120, 170, 180);
        rect(-18, -2, 36, 22, 3);
        // Water shimmer
        let bathPhase = frameCount * 0.04 + b.x * 0.1;
        fill(80, 160, 210, 60 + sin(bathPhase) * 30);
        rect(-14, 2, 12, 3, 2);
        rect(4, 6, 12, 3, 2);
        // Steam
        for (let si = 0; si < 3; si++) {
          let steamY = -10 - sin(frameCount * 0.02 + si * 2) * 8;
          let steamA = 40 - abs(sin(frameCount * 0.02 + si * 2)) * 20;
          fill(255, 255, 255, steamA);
          ellipse(-8 + si * 8, steamY, 6 + sin(si + frameCount * 0.03) * 2, 4);
        }
        // Mini columns
        fill(190, 185, 172);
        rect(-22, -6, 3, 12, 1);
        rect(19, -6, 3, 12, 1);
        // Column caps
        fill(200, 195, 180);
        rect(-23, -8, 5, 3, 1);
        rect(18, -8, 5, 3, 1);
        // Steps
        fill(175, 168, 155);
        rect(-10, 22, 20, 4, 1);
        rect(-8, 25, 16, 3, 1);
        break;

      case 'granary':
        // Roman granary — raised storage with tiled roof
        noStroke();
        fill(0, 0, 0, 30);
        rect(-bw / 2 + 2, bh / 2 - 4, bw, 6);
        // Stilts
        fill(165, 155, 138);
        for (let gi = 0; gi < 4; gi++) {
          let gpx = -bw / 2 + 5 + gi * (bw - 10) / 3;
          rect(gpx - 2, bh / 2 - 8, 4, 8, 1);
        }
        // Body
        fill(185, 175, 158);
        rect(-bw / 2, -bh / 2 + 6, bw, bh - 14, 2);
        stroke(165, 155, 138, 60);
        strokeWeight(0.5);
        for (let gy = -bh / 2 + 12; gy < bh / 2 - 12; gy += 6) {
          line(-bw / 2 + 2, gy, bw / 2 - 2, gy);
        }
        noStroke();
        // Ventilation slots
        fill(60, 45, 25, 160);
        for (let gv = 0; gv < 3; gv++) {
          let gvx = -bw / 2 + 10 + gv * (bw - 16) / 2;
          rect(gvx, -bh / 2 + 14, 6, 3);
          rect(gvx, -bh / 2 + 22, 6, 3);
        }
        // Terracotta roof
        fill(170, 95, 55);
        beginShape();
        vertex(-bw / 2 - 2, -bh / 2 + 8);
        vertex(0, -bh / 2 - 4);
        vertex(bw / 2 + 2, -bh / 2 + 8);
        endShape(CLOSE);
        stroke(145, 80, 42, 80);
        strokeWeight(0.7);
        for (let rt = 1; rt < 5; rt++) {
          let rty = -bh / 2 + 8 - rt * 2.5;
          let rw2 = (bw + 4) * (1 - rt / 6) / 2;
          line(-rw2, rty, rw2, rty);
        }
        noStroke();
        fill(190, 110, 65);
        rect(-3, -bh / 2 - 5, 6, 3, 1);
        // Door with wheat symbol
        fill(80, 58, 22);
        rect(-4, -bh / 2 + 28, 8, 10, 1);
        fill(190, 155, 55, 140);
        circle(-2, -bh / 2 + 28, 4);
        circle(2, -bh / 2 + 28, 4);
        circle(0, -bh / 2 + 26, 4);
        break;

      case 'well':
        // Roman stone well with rope and bucket
        noStroke();
        fill(0, 0, 0, 25);
        ellipse(0, bh / 2 - 2, bw * 0.9, 5);
        // Base ring
        fill(175, 168, 155);
        ellipse(0, bh / 2 - 6, bw - 4, 8);
        // Shaft
        fill(185, 178, 165);
        rect(-bw / 2 + 2, -bh / 4, bw - 4, bh * 0.75, 2);
        stroke(155, 148, 135, 70);
        strokeWeight(0.6);
        for (let wl = -bh / 4 + 5; wl < bh / 2 - 6; wl += 5) {
          line(-bw / 2 + 3, wl, bw / 2 - 3, wl);
        }
        noStroke();
        fill(195, 188, 175);
        rect(-bw / 2 + 1, -bh / 4 - 2, bw - 2, 4, 1);
        // Dark water
        fill(35, 65, 95, 200);
        ellipse(0, -bh / 4 + 2, bw - 10, 5);
        fill(50, 90, 130, 80);
        ellipse(-3, -bh / 4 + 1, 8, 2);
        // Crossbeam
        fill(95, 68, 32);
        rect(-bw / 2 - 2, -bh / 2 - 2, bw + 4, 4, 1);
        fill(85, 60, 28);
        rect(-bw / 2, -bh / 2 - 2, 4, bh / 4 + 4, 1);
        rect(bw / 2 - 4, -bh / 2 - 2, 4, bh / 4 + 4, 1);
        // Rope and bucket
        stroke(130, 100, 48);
        strokeWeight(0.8);
        line(0, -bh / 2, 0, -bh / 4 - 2);
        noStroke();
        fill(90, 62, 25);
        rect(-3, -bh / 2 - 4, 6, 5, 1);
        fill(140, 115, 55);
        rect(-3, -bh / 2 - 3, 6, 1);
        rect(-3, -bh / 2 - 1, 6, 1);
        break;

      case 'temple':
        // Roman columned temple — front facade
        noStroke();
        // Foundation steps
        fill(160, 152, 138);
        rect(-bw / 2 + 2, bh / 2 - 8, bw - 4, 4, 1);
        fill(170, 162, 148);
        rect(-bw / 2 + 4, bh / 2 - 14, bw - 8, 6, 1);
        // Stylobate platform
        fill(180, 172, 158);
        rect(-bw / 2, -bh / 2 + 18, bw, bh / 2 - 18, 1);
        // Cella
        fill(188, 180, 165);
        rect(-bw / 2 + 8, -bh / 2 + 4, bw - 16, bh / 2 + 8, 1);
        // 4 front columns
        fill(200, 193, 178);
        for (let tci = 0; tci < 4; tci++) {
          let tcpx = -bw / 2 + 6 + tci * (bw - 12) / 3;
          rect(tcpx - 2.5, -bh / 2 + 6, 5, bh / 2 + 10, 1);
          stroke(175, 168, 153, 60);
          strokeWeight(0.4);
          line(tcpx - 1, -bh / 2 + 8, tcpx - 1, bh / 2 - 18);
          line(tcpx + 1, -bh / 2 + 8, tcpx + 1, bh / 2 - 18);
          noStroke();
          fill(205, 198, 183);
          rect(tcpx - 4, -bh / 2 + 4, 8, 3, 1);
          fill(195, 188, 173);
          rect(tcpx - 3.5, bh / 2 - 20, 7, 2, 1);
          fill(200, 193, 178);
        }
        // Entablature
        fill(192, 185, 170);
        rect(-bw / 2 + 2, -bh / 2 + 2, bw - 4, 6, 1);
        // Pediment
        fill(198, 190, 175);
        beginShape();
        vertex(-bw / 2 + 2, -bh / 2 + 2);
        vertex(0, -bh / 2 - 10);
        vertex(bw / 2 - 2, -bh / 2 + 2);
        endShape(CLOSE);
        fill(210, 200, 182);
        rect(-2, -bh / 2 - 12, 4, 3, 1);
        // Acroteria
        fill(205, 165, 55, 180);
        circle(-bw / 2 + 4, -bh / 2 + 1, 4);
        circle(bw / 2 - 4, -bh / 2 + 1, 4);
        circle(0, -bh / 2 - 12, 4);
        // Door
        fill(50, 35, 18);
        rect(-6, -bh / 2 + 10, 12, 12, 1);
        arc(0, -bh / 2 + 10, 12, 8, PI, TWO_PI);
        // Divine glow
        let templePulse = 30 + sin(frameCount * 0.03 + b.x * 0.05) * 20;
        fill(200, 160, 80, templePulse);
        rect(-5, -bh / 2 + 12, 10, 8, 1);
        break;

      case 'market':
        // Roman market stall — awning with goods
        noStroke();
        fill(0, 0, 0, 25);
        rect(-bw / 2 + 2, bh / 2 - 4, bw, 5);
        // Counter
        fill(145, 110, 55);
        rect(-bw / 2, -bh / 2 + 10, bw, bh / 2, 1);
        fill(120, 90, 40);
        rect(-bw / 2 + 3, -bh / 2 + 20, 3, bh / 2 - 2, 1);
        rect(bw / 2 - 6, -bh / 2 + 20, 3, bh / 2 - 2, 1);
        // Goods on counter
        fill(180, 130, 45);
        ellipse(-bw / 4, -bh / 2 + 8, 10, 5);
        fill(170, 65, 40);
        rect(-1, -bh / 2 + 3, 5, 8, 2);
        fill(55, 120, 65);
        ellipse(bw / 4, -bh / 2 + 7, 8, 5);
        // Support poles
        fill(120, 90, 40);
        rect(-bw / 2 + 1, -bh / 2 - 10, 3, 22, 1);
        rect(bw / 2 - 4, -bh / 2 - 10, 3, 22, 1);
        // Striped awning
        for (let mai = 0; mai < 5; mai++) {
          let maColor = mai % 2 === 0 ? [195, 55, 40] : [220, 205, 175];
          fill(maColor[0], maColor[1], maColor[2], 220);
          let mawx = -bw / 2 + 2 + mai * (bw - 4) / 5;
          rect(mawx, -bh / 2 - 10, (bw - 4) / 5, 10, 1);
        }
        // Fringe
        stroke(195, 175, 130, 140);
        strokeWeight(0.8);
        for (let maf = 0; maf < 7; maf++) {
          let mafx = -bw / 2 + 3 + maf * (bw - 6) / 6;
          line(mafx, -bh / 2, mafx, -bh / 2 + 3);
        }
        noStroke();
        // Price tablet
        fill(175, 160, 120);
        rect(-4, -bh / 2 - 14, 8, 5, 1);
        fill(100, 80, 40);
        rect(-2, -bh / 2 - 13, 4, 1);
        rect(-2, -bh / 2 - 11, 4, 1);
        break;

      case 'forum':
        // Roman public forum — tiled plaza with central fountain
        noStroke();
        fill(175, 168, 155);
        rect(-bw / 2, -bh / 2, bw, bh, 2);
        // Flagstone grid
        stroke(155, 148, 135, 50);
        strokeWeight(0.6);
        for (let ffy = -bh / 2 + 8; ffy < bh / 2; ffy += 8) {
          line(-bw / 2 + 2, ffy, bw / 2 - 2, ffy);
        }
        for (let ffx = -bw / 2 + 8; ffx < bw / 2; ffx += 8) {
          line(ffx, -bh / 2 + 2, ffx, bh / 2 - 2);
        }
        noStroke();
        // Border colonnade stubs
        fill(188, 180, 165);
        for (let ffci = 0; ffci < 5; ffci++) {
          let ffcpx = -bw / 2 + 5 + ffci * (bw - 10) / 4;
          rect(ffcpx - 1.5, -bh / 2, 3, 6, 1);
          rect(ffcpx - 1.5, bh / 2 - 6, 3, 6, 1);
        }
        for (let ffcj = 1; ffcj < 4; ffcj++) {
          let ffcpy = -bh / 2 + 8 + ffcj * (bh - 16) / 3;
          rect(-bw / 2, ffcpy - 1.5, 6, 3, 1);
          rect(bw / 2 - 6, ffcpy - 1.5, 6, 3, 1);
        }
        // Central fountain
        fill(165, 158, 145);
        ellipse(0, 0, 20, 14);
        fill(50, 105, 160, 180);
        ellipse(0, 0, 16, 10);
        let forumPhase = frameCount * 0.05 + b.x * 0.08;
        fill(80, 145, 200, 50 + sin(forumPhase) * 30);
        ellipse(-2, -1, 7, 4);
        fill(80, 160, 210, 100 + sin(forumPhase * 1.3) * 40);
        ellipse(0, -4, 3, 5);
        // Rostra
        fill(180, 172, 158);
        rect(-10, bh / 2 - 10, 20, 8, 1);
        fill(188, 180, 165);
        rect(-8, bh / 2 - 14, 16, 5, 1);
        // Statues
        fill(192, 185, 170);
        rect(-bw / 2 + 12, -2, 3, 10, 1);
        rect(bw / 2 - 15, -2, 3, 10, 1);
        circle(-bw / 2 + 13, -3, 4);
        circle(bw / 2 - 14, -3, 4);
        break;

      case 'watchtower':
        // Roman defensive watchtower
        noStroke();
        fill(0, 0, 0, 30);
        rect(-bw / 2 + 1, bh / 2 - 4, bw, 6);
        // Wide base
        fill(165, 155, 140);
        rect(-bw / 2 - 3, bh / 2 - 10, bw + 6, 10, 1);
        // Shaft
        fill(180, 172, 158);
        rect(-bw / 2, -bh / 2 + 8, bw, bh - 18, 1);
        stroke(160, 152, 138, 65);
        strokeWeight(0.6);
        for (let wtl = -bh / 2 + 12; wtl < bh / 2 - 12; wtl += 6) {
          line(-bw / 2 + 1, wtl, bw / 2 - 1, wtl);
          let wtoff = (floor((wtl + 12) / 6) % 2) * 5;
          for (let wtlx = -bw / 2 + wtoff + 3; wtlx < bw / 2 - 2; wtlx += 8) {
            line(wtlx, wtl, wtlx, wtl + 6);
          }
        }
        noStroke();
        // Arrow slits
        fill(40, 30, 18, 200);
        rect(-1.5, -bh / 2 + 16, 3, 7, 1);
        rect(-1.5, -bh / 2 + 30, 3, 7, 1);
        // Battlement
        fill(185, 177, 162);
        rect(-bw / 2, -bh / 2 + 6, bw, 6, 1);
        // Merlons
        fill(190, 182, 167);
        rect(-bw / 2, -bh / 2, 4, 8, 1);
        rect(-bw / 2 + 6, -bh / 2, 4, 8, 1);
        rect(bw / 2 - 10, -bh / 2, 4, 8, 1);
        rect(bw / 2 - 4, -bh / 2, 4, 8, 1);
        // Iron reinforcement bands
        fill(70, 60, 50, 120);
        rect(-bw / 2, -bh / 2 + 20, bw, 2);
        rect(-bw / 2, -bh / 2 + 34, bw, 2);
        // Beacon torch
        let wtFlicker = sin(frameCount * 0.28 + b.x * 0.6) * 1.5;
        fill(255, 120, 30, 160);
        beginShape();
        vertex(wtFlicker * 0.3, -bh / 2 - 8 + wtFlicker);
        vertex(-3, -bh / 2 + 2);
        vertex(3, -bh / 2 + 2);
        endShape(CLOSE);
        fill(255, 210, 60, 180);
        beginShape();
        vertex(0, -bh / 2 - 5 + wtFlicker * 0.5);
        vertex(-2, -bh / 2 + 2);
        vertex(2, -bh / 2 + 2);
        endShape(CLOSE);
        break;

      case 'arch':
        // Triumphal arch
        noStroke();
        // Base plinth
        fill(170, 162, 148);
        rect(-bw / 2, bh / 2 - 8, bw, 8, 1);
        // Piers
        fill(188, 180, 165);
        rect(-bw / 2, -bh / 2 + 6, 14, bh - 14, 1);
        rect(bw / 2 - 14, -bh / 2 + 6, 14, bh - 14, 1);
        // Arch opening
        fill(38, 28, 16, 200);
        rect(-bw / 2 + 14, -bh / 2 + 12, bw - 28, bh - 20, 1);
        fill(180, 172, 158);
        arc(0, -bh / 2 + 12, bw - 28, bh - 14, PI, TWO_PI, PIE);
        fill(38, 28, 16, 200);
        arc(0, -bh / 2 + 12, bw - 32, bh - 20, PI, TWO_PI, PIE);
        // Attic inscription block
        fill(192, 185, 170);
        rect(-bw / 2 + 2, -bh / 2, bw - 4, 14, 1);
        stroke(165, 158, 143, 100);
        strokeWeight(0.5);
        line(-bw / 2 + 8, -bh / 2 + 4, bw / 2 - 8, -bh / 2 + 4);
        line(-bw / 2 + 8, -bh / 2 + 7, bw / 2 - 8, -bh / 2 + 7);
        line(-bw / 2 + 8, -bh / 2 + 10, bw / 2 - 8, -bh / 2 + 10);
        noStroke();
        // Engaged columns
        fill(196, 188, 173);
        rect(-bw / 2 + 3, -bh / 2 + 8, 5, bh - 20, 1);
        rect(bw / 2 - 8, -bh / 2 + 8, 5, bh - 20, 1);
        fill(200, 192, 177);
        rect(-bw / 2 + 2, -bh / 2 + 6, 7, 3, 1);
        rect(bw / 2 - 9, -bh / 2 + 6, 7, 3, 1);
        // Keystone — gold
        fill(200, 160, 55);
        beginShape();
        vertex(-3, -bh / 2 + 10);
        vertex(3, -bh / 2 + 10);
        vertex(4, -bh / 2 + 16);
        vertex(-4, -bh / 2 + 16);
        endShape(CLOSE);
        // Victory sculptures on top
        fill(192, 185, 170);
        circle(-bw / 2 + 7, -bh / 2 - 3, 7);
        circle(bw / 2 - 7, -bh / 2 - 3, 7);
        // Prestige aura
        let archPulse = 20 + sin(frameCount * 0.025 + b.x * 0.04) * 12;
        fill(220, 180, 60, archPulse);
        rect(-bw / 2 + 3, -bh / 2 + 1, bw - 6, 12, 1);
        break;

      case 'villa':
        // Roman luxury villa — walled compound with garden
        noStroke();
        // Outer wall
        fill(175, 168, 155);
        rect(-bw / 2, -bh / 2, bw, bh, 2);
        // Interior courtyard
        fill(188, 182, 168);
        rect(-bw / 2 + 6, -bh / 2 + 6, bw - 12, bh - 12, 1);
        // Garden
        fill(60, 100, 45, 160);
        rect(-bw / 2 + 18, -bh / 4, bw / 2 - 10, bh / 4, 2);
        fill(45, 80, 35, 180);
        ellipse(-bw / 2 + 24, -bh / 4 + 6, 8, 5);
        ellipse(-bw / 2 + 32, -bh / 4 + 10, 6, 4);
        // Impluvium pool
        fill(50, 100, 155, 160);
        ellipse(-bw / 4, bh / 8, 14, 8);
        let villaPhase = frameCount * 0.04 + b.x * 0.07;
        fill(75, 140, 195, 60 + sin(villaPhase) * 25);
        ellipse(-bw / 4 - 2, bh / 8 - 1, 6, 3);
        // Peristyle columns
        fill(198, 190, 176);
        for (let vci = 0; vci < 3; vci++) {
          let vcx = -bw / 2 + 18 + vci * (bw / 2 - 10) / 2;
          rect(vcx - 1.5, -bh / 4 - 2, 3, bh / 4 + 12, 1);
        }
        // Main entrance
        fill(165, 158, 145);
        rect(-8, bh / 2 - 10, 16, 10, 1);
        fill(50, 35, 18);
        rect(-5, bh / 2 - 10, 10, 8, 1);
        arc(0, bh / 2 - 10, 10, 8, PI, TWO_PI);
        // Terracotta roof trim
        fill(165, 88, 50, 180);
        rect(-bw / 2, -bh / 2, bw, 6, 1);
        rect(-bw / 2, -bh / 2, 6, bh, 1);
        rect(bw / 2 - 6, -bh / 2, 6, bh, 1);
        // Gold mosaic border
        fill(195, 160, 55, 120);
        rect(-bw / 2 + 2, -bh / 2 + 2, bw - 4, 2);
        rect(-bw / 2 + 2, bh / 2 - 4, bw - 4, 2);
        break;
    }
    pop();
}

function drawBuildGhost() {
  let wx = snapToGrid(s2wX(mouseX));
  let wy = snapToGrid(s2wY(mouseY));
  let bp = BLUEPRINTS[state.buildType];
  let bw = bp.w;
  let bh = bp.h;

  if (state.buildRotation === 1 && (state.buildType === 'wall' || state.buildType === 'door')) {
    let tmp = bw; bw = bh; bh = tmp;
  }

  let sx = w2sX(wx);
  let sy = w2sY(wy) + floatOffset;

  let posValid;
  if (state.buildType === 'bridge') {
    let nearIsland = islandEdgeDist(wx, wy) < 0.3;
    let nearBridge = state.buildings.some(b => b.type === 'bridge' && dist2(b.x, b.y, wx, wy) < 48);
    posValid = nearIsland || nearBridge;
  } else {
    posValid = isOnIsland(wx, wy) || isOnBridge(wx, wy);
  }
  let valid = posValid && canAfford(state.buildType);

  // Draw the actual building sprite as ghost
  push();
  translate(sx, sy);
  if (valid) {
    tint(0, 255, 136, 120);
    drawFilter = BLEND;
  }
  // Semi-transparent version of the actual building
  push();
  if (valid) {
    drawingContext.globalAlpha = 0.5;
  } else {
    drawingContext.globalAlpha = 0.3;
  }
  // Draw the actual building sprite
  let ghostBuilding = { x: wx, y: wy, w: bw, h: bh, type: state.buildType };
  pop();
  pop();

  // Use drawOneBuilding with transparency
  push();
  drawingContext.globalAlpha = valid ? 0.55 : 0.25;
  translate(0, floatOffset);
  drawOneBuilding(ghostBuilding);
  drawingContext.globalAlpha = 1.0;
  pop();

  // Placement indicator ring
  push();
  translate(sx, sy);
  noFill();
  if (valid) {
    let pulse = 1 + sin(frameCount * 0.08) * 0.05;
    noStroke();
    fill(0, 255, 136, floor(30 + sin(frameCount * 0.1) * 15));
    let pw2 = floor((bw + 12) * pulse / 2), ph2 = floor((bh + 8) * pulse / 2);
    rect(-pw2, -1, pw2 * 2, 2); rect(-1, -ph2, 2, ph2 * 2);
    stroke(0, 255, 136, floor(100 + sin(frameCount * 0.1) * 50));
    strokeWeight(1);
    noFill();
    rect(-pw2, -ph2, pw2 * 2, ph2 * 2);
  } else {
    noStroke();
    fill(255, 60, 60, 20);
    rect(-(bw + 12) / 2, -(bh + 8) / 2, bw + 12, bh + 8);
    stroke(255, 60, 60, 80);
    strokeWeight(1);
    noFill();
    rect(-(bw + 12) / 2, -(bh + 8) / 2, bw + 12, bh + 8);
    // X mark
    stroke(255, 60, 60, 120);
    strokeWeight(2);
    line(-6, -6, 6, 6);
    line(6, -6, -6, 6);
  }
  noStroke();
  pop();
}

function getBuildDiscount() {
  return (state.prophecy && state.prophecy.type === 'build') ? 0.7 : 1;
}

function isBuildingUnlocked(buildType) {
  let bp = BLUEPRINTS[buildType];
  if (!bp.minLevel) return true;
  return (state.islandLevel || 1) >= bp.minLevel;
}

function canAfford(buildType) {
  let cost = BLUEPRINTS[buildType].cost;
  let d = getBuildDiscount();
  return state.crystals >= ceil((cost.crystals || 0) * d) &&
         state.wood >= ceil((cost.wood || 0) * d) &&
         state.stone >= ceil((cost.stone || 0) * d) &&
         (state.gold || 0) >= ceil((cost.gold || 0) * d) &&
         (state.ironOre || 0) >= ceil((cost.ironOre || 0) * d);
}

function payCost(buildType) {
  let cost = BLUEPRINTS[buildType].cost;
  let d = getBuildDiscount();
  state.crystals -= ceil((cost.crystals || 0) * d);
  state.wood -= ceil((cost.wood || 0) * d);
  state.stone -= ceil((cost.stone || 0) * d);
  if (cost.gold) state.gold -= ceil(cost.gold * d);
  if (cost.ironOre) state.ironOre -= ceil(cost.ironOre * d);
}

function getCostString(buildType) {
  let cost = BLUEPRINTS[buildType].cost;
  let d = getBuildDiscount();
  let parts = [];
  if (cost.wood) parts.push(ceil(cost.wood * d) + 'W');
  if (cost.stone) parts.push(ceil(cost.stone * d) + 'S');
  if (cost.crystals) parts.push(ceil(cost.crystals * d) + 'C');
  if (cost.gold) parts.push(ceil(cost.gold * d) + 'G');
  if (cost.ironOre) parts.push(ceil(cost.ironOre * d) + 'Fe');
  return parts.join(' ');
}

function placeBuilding(wx, wy) {
  let bp = BLUEPRINTS[state.buildType];
  if (!isBuildingUnlocked(state.buildType)) {
    addFloatingText(w2sX(wx), w2sY(wy) - 20, 'Reach island level ' + bp.minLevel + ' to build', C.buildInvalid);
    return;
  }
  if (!canAfford(state.buildType)) {
    addFloatingText(w2sX(wx), w2sY(wy) - 20, 'Need: ' + getCostString(state.buildType), C.buildInvalid);
    return;
  }
  let posValid;
  if (state.buildType === 'bridge') {
    let nearIsland = islandEdgeDist(wx, wy) < 0.3;
    let nearBridge = state.buildings.some(b => b.type === 'bridge' && dist2(b.x, b.y, wx, wy) < 48);
    posValid = nearIsland || nearBridge;
  } else {
    posValid = isOnIsland(wx, wy) || isOnBridge(wx, wy);
  }
  if (!posValid) {
    addFloatingText(w2sX(wx), w2sY(wy) - 20, 'Can\'t build here!', C.buildInvalid);
    return;
  }

  let bw = bp.w;
  let bh = bp.h;
  if (state.buildRotation === 1 && (state.buildType === 'wall' || state.buildType === 'door')) {
    let tmp = bw; bw = bh; bh = tmp;
  }

  payCost(state.buildType);
  state.buildings.push({
    x: wx, y: wy,
    type: state.buildType,
    w: bw, h: bh,
  });
  if (snd) snd.playSFX('build');
  state.codex.buildingsBuilt[state.buildType] = true;
  unlockJournal('first_building');
  addFloatingText(w2sX(wx), w2sY(wy) - 30, '+' + bp.name, C.crystalGlow);
  spawnBuildingComplete(wx, wy);
  triggerScreenShake(2, 6);
  state.dailyActivities.built++;
  checkQuestProgress('build', 1);
  if (typeof advanceMainQuestCounter === 'function') advanceMainQuestCounter('mq_built', 1);
}

// ─── CRYSTAL NODES ────────────────────────────────────────────────────────
function drawCrystalNodes() {
  state.crystalNodes.forEach(node => drawOneCrystal(node));
}
function drawOneCrystal(node) {
    node.phase += 0.025;
    let nx = w2sX(node.x);
    let ny = w2sY(node.y);

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
      textSize(8);
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

// ─── FARM PLOTS ───────────────────────────────────────────────────────────
function drawFarmPlots() {
  state.plots.forEach(p => drawOnePlot(p));
}
function drawOnePlot(p) {
    let px = w2sX(p.x);
    let py = w2sY(p.y);

    px = floor(px); py = floor(py);
    // Pixel stone border
    noStroke();
    fill(140, 132, 118, 120);
    rect(px - p.w/2 - 3, py - p.h/2 - 2, p.w + 6, p.h + 4);
    // Edge detail
    fill(120, 112, 98, 80);
    rect(px - p.w/2 - 3, py - p.h/2 - 2, p.w + 6, 1);

    // Pixel soil
    fill(p.planted ? color(68, 48, 28) : color(52, 38, 22));
    rect(px - p.w/2, py - p.h/2, p.w, p.h);
    // Furrow lines — pixel-style
    stroke(p.planted ? color(52, 35, 18, 110) : color(38, 26, 14, 80));
    strokeWeight(0.8);
    for (let r = -2; r <= 2; r++) {
      let fy = py + r * (p.h * 0.18);
      line(px - p.w * 0.35, fy, px + p.w * 0.35, fy);
    }
    noStroke();
    // Soil pixel texture — tiny light/dark dots
    if (p.planted) {
      fill(78, 58, 34, 50);
      for (let di = 0; di < 3; di++) {
        rect(px - 6 + di * 6, py - 3 + di * 2, 2, 1);
      }
    }

    if (p.planted) {
      let cropDraw = drawGrainSprite;
      if (p.cropType === 'grape') cropDraw = drawGrapeSprite;
      else if (p.cropType === 'olive') cropDraw = drawOliveSprite;
      else if (isSeasonalCrop(p.cropType)) cropDraw = (x, y, s) => drawSeasonalCropSprite(x, y, s, p.cropType);

      // Blessed crop shimmer
      if (p.blessed) {
        let shimmer = sin(frameCount * 0.08 + p.x) * 0.3 + 0.7;
        fill(255, 220, 80, 40 * shimmer);
        rect(px - 10, py - 1, 20, 2);
        rect(px - 1, py - 10, 2, 20);
        if (frameCount % 30 === 0) spawnParticles(p.x, p.y, 'burst', 2);
      }

      if (p.ripe) {
        let ripePulse = sin(frameCount * 0.06 + p.x * 0.1) * 0.4 + 0.6;
        // Pixel glow cross
        fill(255, 210, 60, 15 * ripePulse);
        rect(px - 14, py - 1, 28, 2);
        rect(px - 1, py - 14, 2, 28);
        fill(p.blessed ? color(255, 220, 60, 50 * ripePulse) : color(255, 200, 80, 30 * ripePulse));
        rect(px - 8, py - 1, 16, 2);
        rect(px - 1, py - 8, 2, 16);
        if (ripePulse > 0.9 && frameCount % 20 < 2) {
          fill(255, 255, 200, 200);
          rect(px + floor(random(-8, 8)), py + floor(random(-8, 4)), 2, 2);
        }
        cropDraw(px, py, 1.0);
      } else if (p.stage >= 2) {
        cropDraw(px, py, 0.7);
      } else if (p.stage >= 1) {
        cropDraw(px, py, 0.4);
      } else {
        // Pixel seed sprout
        fill(50, 70, 20);
        rect(px, py - 4, 1, 4);
        fill(60, 80, 25, 180);
        rect(px - 1, py - 5, 3, 2);
      }
    }
}

function drawGrainSprite(x, y, scale) {
  let s = floor(scale * 14);
  let sway = floor(sin(frameCount * 0.025 + x * 0.1) * 2 * scale);
  let stalks = scale > 0.6 ? 5 : 3;
  x = floor(x); y = floor(y);
  noStroke();

  for (let i = 0; i < stalks; i++) {
    let sx = x + floor((i - (stalks - 1) / 2) * 3 * scale);
    let lean = floor((i - (stalks - 1) / 2) * 1.5 * scale + sway);

    // Pixel stalk — vertical rect
    let stalkG = 75 + scale * 85;
    fill(stalkG, stalkG * 0.88, 30 + scale * 18);
    rect(sx + lean, y - s, 1, s + 2);

    // Pixel leaf blade
    if (scale > 0.5 && i % 2 === 0) {
      let leafDir = (i % 3 === 0) ? -1 : 1;
      fill(70 + scale * 50, 90 + scale * 40, 20);
      rect(sx + lean + leafDir * 2, y - floor(s * 0.4), 3 * leafDir, 1);
      rect(sx + lean + leafDir * 3, y - floor(s * 0.4) - 1, 2 * leafDir, 1);
    }

    // Pixel wheat ear — stacked kernel rects
    let headX = sx + lean, headY = y - s;
    let kernels = scale > 0.6 ? 4 : 2;
    for (let k = 0; k < kernels; k++) {
      let ky = headY - k * floor(2.5 * scale);
      let kr = 100 + scale * 140;
      let kg = 90 + scale * 80;
      let kb = 20 + (1 - scale) * 30;
      fill(kr, kg, kb);
      rect(headX - 2, ky, 2, floor(2 * scale));
      rect(headX + 1, ky, 2, floor(2 * scale));
    }

    // Pixel awns (whiskers)
    fill(180 * scale + 60, 150 * scale + 40, 30, 160);
    let topY = headY - kernels * floor(2.5 * scale);
    rect(headX - 1, topY - floor(3 * scale), 1, floor(3 * scale));
    rect(headX + 1, topY - floor(2 * scale), 1, floor(2 * scale));
  }
}

// ─── RESOURCES ────────────────────────────────────────────────────────────
function drawResources() {
  state.resources.forEach(r => drawOneResource(r));
}
function drawOneResource(r) {
    if (!r.active) return;
    r.pulsePhase += 0.03;
    let rx = floor(w2sX(r.x));
    let ry = floor(w2sY(r.y));
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

// ─── PLAYER ───────────────────────────────────────────────────────────────
function updateRowing(dt) {
  let r = state.rowing;
  if (!r.active) return;
  // Freeze boat while modifier select is open
  if (state.expeditionModifierSelect) return;

  let dx = 0, dy = 0;
  if (keyIsDown(65) || keyIsDown(LEFT_ARROW))  dx -= 1;
  if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) dx += 1;
  if (keyIsDown(87) || keyIsDown(UP_ARROW))    dy -= 1;
  if (keyIsDown(83) || keyIsDown(DOWN_ARROW))  dy += 1;

  let rowSpeed = 3.5;
  if (dx !== 0 || dy !== 0) {
    let len = sqrt(dx * dx + dy * dy);
    r.speed = lerp(r.speed, rowSpeed, 0.05);
    r.angle = atan2(dy / len, dx / len);
    r.oarPhase += 0.08;
  } else {
    r.speed *= 0.96;
    if (r.speed < 0.05) r.speed = 0;
  }

  r.x += cos(r.angle) * r.speed * dt;
  r.y += sin(r.angle) * r.speed * dt;

  // Bobbing
  let bob = sin(frameCount * 0.03) * 2;
  // Camera follows boat
  state.player.x = r.x;
  state.player.y = r.y;

  // Boundary: don't let boat go too far from island (islands surround home)
  let maxDist = state.islandRX * 8.5; // expanded for distant islands (Necropolis ~3500px)
  let bDist = dist(r.x, r.y, WORLD.islandCX, WORLD.islandCY);
  if (bDist > maxDist) {
    let ang = atan2(r.y - WORLD.islandCY, r.x - WORLD.islandCX);
    r.x = WORLD.islandCX + cos(ang) * maxDist;
    r.y = WORLD.islandCY + sin(ang) * maxDist;
    r.speed *= 0.5;
  }

  // Detect proximity to islands — set dock prompt (E to dock)
  let a = state.adventure;
  let aisleDist = dist(r.x, r.y, a.isleX, a.isleY);
  let cq = state.conquest;
  let cqDist = dist(r.x, r.y, cq.isleX, cq.isleY);
  r.nearIsle = null;
  if (aisleDist < a.isleRX * 1.5) r.nearIsle = 'arena';
  let cqNear = ((r.x - cq.isleX) / cq.isleRX) ** 2 + ((r.y - cq.isleY) / cq.isleRY) ** 2;
  if (cqNear < 1.5 * 1.5) { r.nearIsle = 'conquest'; unlockJournal('terra_nova'); }

  // New islands — elliptical proximity detection + collision
  let _newIsles = [
    { key: 'vulcan',    s: state.vulcan },
    { key: 'hyperborea',s: state.hyperborea },
    { key: 'plenty',    s: state.plenty },
    { key: 'necropolis',s: state.necropolis },
  ];
  for (let ni of _newIsles) {
    let nex = ((r.x - ni.s.isleX) / ni.s.isleRX);
    let ney = ((r.y - ni.s.isleY) / ni.s.isleRY);
    let neDist = nex * nex + ney * ney;
    if (neDist < 1.5 * 1.5) r.nearIsle = ni.key;
    // Collision
    if (neDist < 0.8 * 0.8) {
      let ang = atan2(r.y - ni.s.isleY, r.x - ni.s.isleX);
      r.x = ni.s.isleX + cos(ang) * ni.s.isleRX * 0.82;
      r.y = ni.s.isleY + sin(ang) * ni.s.isleRY * 0.82;
      r.speed *= 0.3;
    }
  }

  // Keep boat from going through islands
  if (aisleDist < a.isleRX * 0.8) {
    let ang = atan2(r.y - a.isleY, r.x - a.isleX);
    r.x = a.isleX + cos(ang) * a.isleRX * 0.82;
    r.y = a.isleY + sin(ang) * a.isleRY * 0.82;
    r.speed *= 0.3;
  }
  // Elliptical collision for Terra Nova (RX != RY)
  let cqNx = (r.x - cq.isleX) / cq.isleRX;
  let cqNy = (r.y - cq.isleY) / cq.isleRY;
  let cqEllDist = cqNx * cqNx + cqNy * cqNy;
  if (cqEllDist < 0.8 * 0.8) {
    let ang = atan2(r.y - cq.isleY, r.x - cq.isleX);
    r.x = cq.isleX + cos(ang) * cq.isleRX * 0.82;
    r.y = cq.isleY + sin(ang) * cq.isleRY * 0.82;
    r.speed *= 0.3;
  }

  // Don't let boat go onto island
  if (isOnIsland(r.x, r.y)) {
    let ang = atan2(r.y - WORLD.islandCY, r.x - WORLD.islandCX);
    let rx = getSurfaceRX() * 1.05;
    let ry = getSurfaceRY() * 1.05;
    r.x = WORLD.islandCX + cos(ang) * rx;
    r.y = WORLD.islandCY + sin(ang) * ry;
    r.speed = 0;
  }

  // Wake trail — behind the ship (stern/ram trails at -x)
  if (r.speed > 0.3 && frameCount % 4 === 0) {
    r.wakeTrail.push({ x: r.x - cos(r.angle) * 55, y: r.y - sin(r.angle) * 55, life: 40 });
  }
  r.wakeTrail.forEach(w => w.life--);
  r.wakeTrail = r.wakeTrail.filter(w => w.life > 0);
}

function drawRowingBoat() {
  let r = state.rowing;
  if (!r.active) return;

  let sx = w2sX(r.x);
  let sy = w2sY(r.y);
  let bob = sin(frameCount * 0.03) * 2;

  // Wake trail — pixel rects
  noStroke();
  r.wakeTrail.forEach(w => {
    let a = (w.life / 40) * 50;
    let sz = floor((1 - w.life / 40) * 18 + 6);
    fill(200, 220, 255, a);
    rect(floor(w2sX(w.x)) - floor(sz / 2), floor(w2sY(w.y) + bob) - 1, sz, max(1, floor(sz * 0.35)));
  });
  // Bow spray — pixel splashes
  if (r.speed > 1) {
    for (let i = 0; i < 5; i++) {
      let sp = floor(sin(frameCount * 0.2 + i * 1.5) * 5);
      fill(200, 225, 240, 35 + r.speed * 8);
      rect(floor(sx + cos(r.angle) * 60 + sp) - 3, floor(sy + sin(r.angle) * 60 + bob - i * 2) - 1, 6, 3);
    }
  }

  // Determine view: side view for horizontal, top-down for vertical
  let verticalness = abs(sin(r.angle));
  let useTopDown = verticalness > 0.55;

  if (useTopDown) {
    // === TOP-DOWN VIEW (sailing up/down) ===
    // Water shadow — pixel rect
    push();
    translate(floor(sx), floor(sy + bob));
    rotate(r.angle);
    noStroke();
    fill(40, 70, 100, 20);
    rect(-55, -18, 110, 36);
    pop();

    push();
    translate(floor(sx), floor(sy + bob));
    rotate(r.angle);

    // Hull from above — pixel rects (tapered bow/stern)
    fill(75, 45, 20);
    rect(-42, -13, 80, 26);       // main body
    rect(38, -10, 14, 20);        // bow taper
    rect(52, -4, 8, 8);           // bow tip
    rect(-45, -4, 3, 8);          // stern taper

    // Deck planking
    fill(95, 65, 30);
    rect(-35, -9, 73, 18);
    fill(80, 52, 22, 50);
    for (let i = 0; i < 8; i++) rect(-30 + i * 10, -8, 1, 16);

    // Bronze ram at bow — pixel wedge
    fill(160, 120, 40);
    rect(56, -3, 8, 6);
    rect(64, -2, 4, 4);
    rect(68, -1, 2, 2);
    fill(180, 140, 50, 150);
    rect(58, -1, 6, 2);

    // Oar rows from above — pixel lines
    fill(100, 70, 35);
    for (let i = 0; i < 8; i++) {
      let ox = -25 + i * 9;
      let oarSwing = floor(sin(r.oarPhase + i * 0.4) * 4);
      rect(ox, -27, 1, 14);       // top oar
      rect(ox + oarSwing, -27, 1, 2); // oar tip top
      rect(ox, 13, 1, 14);        // bottom oar
      rect(ox + oarSwing, 25, 1, 2);  // oar tip bottom
    }

    // Shields along gunwales — pixel rects
    for (let i = 0; i < 6; i++) {
      let shx = -18 + i * 11;
      fill(160, 35, 25); rect(shx - 2, -13, 4, 4);
      fill(190, 160, 60); rect(shx - 1, -12, 2, 2);
      fill(160, 35, 25); rect(shx - 2, 9, 4, 4);
      fill(190, 160, 60); rect(shx - 1, 10, 2, 2);
    }

    // Cabin/tower at bow — pixel rects
    fill(100, 68, 32);
    rect(24, -11, 20, 22);
    fill(120, 85, 42);
    rect(26, -9, 16, 18);
    // Planking lines on cabin roof
    fill(90, 60, 28, 80);
    rect(27, -6, 14, 1); rect(27, 0, 14, 1); rect(27, 6, 14, 1);
    // Railing posts
    fill(80, 55, 25);
    rect(24, -11, 2, 22);
    rect(42, -11, 2, 22);

    // Captain (head from above) — pixel
    fill(210, 170, 120);
    rect(31, -3, 6, 6);
    fill(190, 160, 60);
    rect(31, -4, 6, 3);

    // Sail from above — pixel rect
    let sailBillow = floor(sin(frameCount * 0.03) * 4);
    // Sail shadow
    fill(60, 45, 20, 40);
    rect(-22 + sailBillow, -17, 36, 34);
    // Main sail
    fill(230, 215, 185, 235);
    rect(-22, -17, 34, 34);
    // Sail border
    fill(180, 160, 120, 150);
    rect(-22, -17, 34, 1); rect(-22, 16, 34, 1);
    rect(-22, -17, 1, 34); rect(11, -17, 1, 34);
    // Red stripe
    fill(175, 40, 30, 210);
    rect(-7 + floor(sailBillow * 0.5), -17, 8, 34);
    // SPQR text
    push();
    translate(-3 + floor(sailBillow * 0.5), 0);
    rotate(HALF_PI);
    fill(165, 35, 25, 200);
    textSize(5); textAlign(CENTER, CENTER);
    text('SPQR', 0, 0);
    pop();
    // Yard arm
    fill(100, 70, 35);
    rect(-6, -18, 2, 37);
    // Mast — pixel square
    fill(90, 60, 28);
    rect(-8, -3, 6, 6);
    fill(70, 45, 20);
    rect(-7, -2, 4, 4);
    // Rigging lines
    fill(100, 80, 50, 70);
    // Simplified as thin rects won't look great rotated, keep as lines
    stroke(100, 80, 50, 70); strokeWeight(1);
    line(-5, 0, 42, -11); line(-5, 0, 42, 11);
    line(-5, 0, -40, -11); line(-5, 0, -40, 11);
    noStroke();

    // Stern ornament — pixel
    fill(180, 140, 50);
    rect(-46, -2, 4, 4);
    fill(120, 80, 30);
    rect(-45, -1, 2, 2);

    // Rowers (heads from above) — pixel rects
    for (let i = 0; i < 4; i++) {
      let rx = -15 + i * 9;
      fill(180, 150, 120);
      rect(rx - 1, -6, 3, 3);
      rect(rx - 1, 4, 3, 3);
    }

    // Flag — pixel rects
    fill(160, 40, 30);
    let fw = floor(sin(frameCount * 0.04) * 2);
    rect(-12 + fw, -2, 7, 4);
    rect(-10 + fw, -1, 3, 2);

    pop();
  } else {
    // === SIDE VIEW (sailing left/right) ===
    // Mirror X when facing left so tower stays on top
    let drawAngle = r.angle;
    let flipX = 1;
    if (drawAngle > HALF_PI) { drawAngle -= PI; flipX = -1; }
    else if (drawAngle < -HALF_PI) { drawAngle += PI; flipX = -1; }

    // Water reflection — pixel rect
    push();
    translate(floor(sx), floor(sy + bob));
    rotate(drawAngle);
    scale(flipX, 1);
    noStroke();
    fill(40, 70, 100, 20);
    rect(-50, 12, 100, 8);
    pop();

    push();
    translate(floor(sx), floor(sy + bob));
    rotate(drawAngle);
    scale(flipX, 1);

    // Hull — pixel rects (tapered bow, blunt stern)
    fill(75, 45, 20);
    rect(-42, -4, 77, 14);        // main body
    rect(35, -4, 17, 8);          // bow taper
    rect(52, -2, 6, 4);           // bow tip
    rect(-45, -2, 3, 12);         // stern
    // Hull planking lines
    fill(90, 55, 25, 70);
    rect(-40, 2, 90, 1);
    rect(-38, 6, 83, 1);

    // Bronze ram — pixel wedge
    fill(160, 120, 40);
    rect(55, -3, 10, 6);
    rect(65, -2, 4, 4);
    rect(69, -1, 3, 2);
    fill(180, 140, 50, 150);
    rect(57, -1, 8, 2);

    // Stern ornament — pixel post (stacked rects curving up)
    fill(120, 80, 30);
    rect(-44, -4, 2, 2);
    rect(-46, -8, 2, 4);
    rect(-47, -14, 2, 6);
    rect(-46, -20, 2, 6);
    rect(-44, -26, 2, 6);
    // Ornament top
    fill(180, 140, 50);
    rect(-45, -30, 4, 4);
    fill(200, 160, 60);
    rect(-44, -33, 2, 3);

    // Oar banks — pixel lines (vertical rects)
    fill(100, 70, 35);
    for (let i = 0; i < 8; i++) {
      let ox = -30 + i * 10;
      let oarOff = floor(sin(r.oarPhase + i * 0.4) * 4);
      // Top oars
      rect(ox, -4 - 14 + oarOff, 1, 14);
      // Bottom oars
      rect(ox, 10 - oarOff, 1, 14);
    }

    // Deck
    fill(100, 68, 32);
    rect(-40, -6, 88, 5);
    fill(85, 55, 25);
    rect(-40, -8, 88, 2);

    // Shields along sides — pixel rects
    for (let i = 0; i < 6; i++) {
      let shx = -25 + i * 12;
      fill(160, 35, 25); rect(shx - 3, -7, 5, 5);
      fill(190, 160, 60); rect(shx - 1, -6, 2, 2);
      fill(160, 35, 25); rect(shx - 3, 7, 5, 5);
      fill(190, 160, 60); rect(shx - 1, 8, 2, 2);
    }

    // Mast + Sail — pixel
    fill(90, 60, 28);
    rect(-8, -42, 3, 36);
    fill(80, 52, 24);
    rect(-24, -40, 40, 2);
    // Sail — pixel rect
    let sailBillow = floor(sin(frameCount * 0.03) * 2);
    fill(220, 205, 175, 230);
    rect(-22, -38, 36, 28);
    // Red stripe on sail
    fill(160, 40, 30, 180);
    rect(-21 + sailBillow, -28, 34, 8);
    fill(160, 35, 25, 140);
    textSize(5); textAlign(CENTER, CENTER);
    text('SPQR', sailBillow - 4, -24);
    // Rigging
    stroke(100, 80, 50, 80); strokeWeight(1);
    line(-7, -42, -40, -6);
    line(-7, -42, 44, -6);
    noStroke();
    // Flag — pixel rect
    let flagWave = floor(sin(frameCount * 0.04) * 2);
    fill(160, 40, 30);
    rect(-7, -50, 10 + flagWave, 4);
    rect(-7, -48, 6 + flagWave, 2);

    // Bow tower — pixel rects (already rect-based, remove rounded corners)
    fill(110, 78, 38);
    rect(30, -20, 18, 16);
    fill(125, 90, 45);
    rect(31, -19, 16, 14);
    fill(50, 30, 10);
    rect(34, -16, 2, 5);
    rect(39, -16, 2, 5);
    fill(110, 78, 38);
    for (let ci = 0; ci < 4; ci++) {
      rect(30 + ci * 5, -23, 3, 4);
    }
    fill(100, 70, 34);
    rect(29, -20, 20, 2);

    // Captain in tower — pixel
    fill(160, 35, 25);
    rect(37, -14, 6, 8);         // body
    fill(180, 150, 70);
    rect(37, -17, 6, 4);         // armor
    fill(210, 170, 120);
    rect(37, -22, 6, 6);         // head
    fill(190, 160, 60);
    rect(37, -24, 6, 3);         // helmet
    fill(200, 50, 40);
    rect(39, -26, 2, 3);         // plume

    // Rowers on deck — pixel
    for (let i = 0; i < 4; i++) {
      let rx = -20 + i * 10;
      fill(180, 150, 120);
      rect(rx - 2, -3, 4, 4);
      fill(200, 190, 170);
      rect(rx - 2, 1, 4, 4);
    }

    pop();
  }
}

function updatePlayer(dt) {
  if (state.rowing.active) { updateRowing(dt); return; }
  let p = state.player;
  // Heart bonuses: 2+ hearts = +15% speed, 4+ hearts = +30% speed
  let heartSpeedBonus = state.npc.hearts >= 4 ? 1.3 : (state.npc.hearts >= 2 ? 1.15 : 1);
  let spd = p.speed * heartSpeedBonus;
  if (state.prophecy && state.prophecy.type === 'speed') spd *= 1.25;

  if (p.dashTimer > 0) {
    spd *= 3.5;
    p.dashTimer -= dt;
  }
  if (p.dashCooldown > 0) p.dashCooldown -= dt;
  if (p.toolSwing > 0) p.toolSwing -= dt;

  // Slow down in shallow water / diving
  let inShallows = isInShallows(p.x, p.y);
  if (inShallows) spd *= (state.diving && state.diving.active) ? 0.7 : 0.55;

  let dx = 0, dy = 0;
  if (keyIsDown(65) || keyIsDown(LEFT_ARROW))  dx -= 1;
  if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) dx += 1;
  if (keyIsDown(87) || keyIsDown(UP_ARROW))    dy -= 1;
  if (keyIsDown(83) || keyIsDown(DOWN_ARROW))  dy += 1;

  if (dx !== 0 || dy !== 0) {
    if (state.fishing.active) { state.fishing.active = false; state.fishing.bite = false; }
    let len = sqrt(dx * dx + dy * dy);
    p.vx = (dx / len) * spd;
    p.vy = (dy / len) * spd;
    p.moving = true;
    p.targetX = null; p.targetY = null;
    if (dx > 0) p.facing = 'right';
    else if (dx < 0) p.facing = 'left';
    else if (dy < 0) p.facing = 'up';
    else p.facing = 'down';
  } else if (p.targetX !== null) {
    let tdx = p.targetX - p.x;
    let tdy = p.targetY - p.y;
    let tdist = sqrt(tdx * tdx + tdy * tdy);
    if (tdist < spd * 1.5) {
      p.targetX = null; p.targetY = null;
      p.vx = 0; p.vy = 0;
      p.moving = false;
    } else {
      p.vx = (tdx / tdist) * spd;
      p.vy = (tdy / tdist) * spd;
      p.moving = true;
    }
  } else {
    p.vx *= 0.7;
    p.vy *= 0.7;
    p.moving = false;
  }

  // Footstep dust
  if (p.moving && frameCount % 8 === 0) {
    particles.push({
      x: p.x + random(-4, 4), y: p.y + 8,
      vx: random(-0.3, 0.3), vy: random(-0.5, 0),
      life: 15, maxLife: 15, type: 'burst',
      r: 140, g: 120, b: 80, size: random(2, 4), world: true,
    });
  }

  let newX = p.x + p.vx * dt;
  let newY = p.y + p.vy * dt;

  // Check if new position is walkable and not blocked
  if (isWalkable(newX, newY) && !isBlockedByBuilding(newX, newY)) {
    p.x = newX;
    p.y = newY;
  } else if (isWalkable(newX, p.y) && !isBlockedByBuilding(newX, p.y)) {
    // Slide along X
    p.x = newX;
    p.vy = 0;
  } else if (isWalkable(p.x, newY) && !isBlockedByBuilding(p.x, newY)) {
    // Slide along Y
    p.y = newY;
    p.vx = 0;
  } else {
    // Fully blocked — push back toward island center
    let pushX = WORLD.islandCX - p.x;
    let pushY = WORLD.islandCY - p.y;
    let pushD = sqrt(pushX * pushX + pushY * pushY);
    if (pushD > 0) {
      p.x += (pushX / pushD) * 1.5;
      p.y += (pushY / pushD) * 1.5;
    }
    p.vx = 0;
    p.vy = 0;
  }

  // Imperial Bridge transition: walk onto Terra Nova
  if (state.imperialBridge.built && state.conquest.colonized && isOnConquestIsland(p.x, p.y)) {
    enterConquest();
    return;
  }

  // Hard clamp: if somehow off island+shallows and not on bridge, push back
  if (!isWalkable(p.x, p.y)) {
    let edx = (p.x - WORLD.islandCX) / getSurfaceRX();
    let edy = (p.y - WORLD.islandCY) / getSurfaceRY();
    let eDist = sqrt(edx * edx + edy * edy);
    if (eDist > 1.07) {
      let sc = 1.05 / eDist;
      p.x = WORLD.islandCX + (p.x - WORLD.islandCX) * sc;
      p.y = WORLD.islandCY + (p.y - WORLD.islandCY) * sc;
    }
  }

  // Footstep particles — dust on land, splashes in shallows
  if (p.moving && frameCount % 6 === 0) {
    if (inShallows) {
      // Water splashes
      for (let si = 0; si < 2; si++) {
        particles.push({
          x: p.x + random(-6, 6), y: p.y + random(0, 4),
          vx: random(-0.5, 0.5), vy: random(-1.2, -0.3),
          life: random(12, 20), maxLife: 20,
          type: 'burst', size: random(2, 4),
          r: 180, g: 210, b: 240, world: true,
        });
      }
    } else if (isOnIsland(p.x, p.y)) {
      particles.push({
        x: p.x + random(-4, 4), y: p.y + random(2, 6),
        vx: random(-0.3, 0.3), vy: random(-0.4, -0.1),
        life: random(15, 25), maxLife: 25,
        type: 'dust', size: random(2, 4),
        r: 120, g: 100, b: 70, world: true,
      });
    }
  }

  if (p.moving || p.dashTimer > 0) {
    p.trailPoints.unshift({ x: p.x, y: p.y, life: 12 });
  }
  p.trailPoints = p.trailPoints.filter(t => t.life > 0);
  p.trailPoints.forEach(t => t.life--);
}

function updateFishing(dt) {
  let f = state.fishing;
  if (!f.active) return;
  f.timer += dt;
  if (!f.bite && f.timer >= f.biteTime) {
    f.bite = true;
    f.timer = 0;
    if (state.tools.net) {
      // Auto-catch with fishing net
      reelFish();
      return;
    }
    addFloatingText(w2sX(state.player.x), w2sY(state.player.y) - 40, '! BITE !', '#ffaa00');
  }
  if (f.bite && f.timer > 90) {
    // Missed the catch
    f.active = false;
    f.bite = false;
    addFloatingText(w2sX(state.player.x), w2sY(state.player.y) - 30, 'Got away...', C.textDim);
  }
}

function startFishing() {
  let edgeDist = islandEdgeDist(state.player.x, state.player.y);
  if (edgeDist > -0.08) {
    // Near island edge
    state.fishing.active = true;
    state.fishing.timer = 0;
    state.fishing.biteTime = random(60, 180);
    state.fishing.bite = false;
    state.fishing.caught = false;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.moving = false;
    state.player.targetX = null;
    state.player.targetY = null;
    addFloatingText(w2sX(state.player.x), w2sY(state.player.y) - 30, 'Casting line...', '#66ccff');
  } else {
    addFloatingText(w2sX(state.player.x), w2sY(state.player.y) - 30, 'Go to island edge to fish!', C.buildInvalid);
  }
}

function reelFish() {
  let f = state.fishing;
  if (f.active && f.bite) {
    f.active = false;
    f.bite = false;
    let fishType = rollFishType();
    let amt = fishType.weight >= 3 ? 2 : 1;
    if (state.heartRewards.includes('golden')) amt *= 2;
    if (state.prophecy && state.prophecy.type === 'fish') amt += 1;
    let fest = getFestival();
    if (fest && fest.effect.fish) amt *= fest.effect.fish;
    state.fish += amt;
    if (snd) snd.playSFX('fish_catch');
    state.dailyActivities.fished += amt;
    checkQuestProgress('fish', amt);
    state.codex.fishCaught[fishType.name.toLowerCase()] = true;
    unlockJournal('first_fish');
    addFloatingText(w2sX(state.player.x), w2sY(state.player.y) - 40, '+' + amt + ' ' + fishType.name + '!', fishType.color);
    spawnParticles(state.player.x, state.player.y, 'build', 6);
  }
}

function drawFishing() {
  let f = state.fishing;
  if (!f.active) return;
  let px = w2sX(state.player.x);
  let py = w2sY(state.player.y);
  // Fishing rod
  stroke(140, 100, 40);
  strokeWeight(2);
  let rodEndX = px + (state.player.facing === 'left' ? -30 : 30);
  let rodEndY = py - 20;
  line(px, py - 10, rodEndX, rodEndY);
  // Line dropping down
  stroke(200, 200, 200, 150);
  strokeWeight(0.8);
  let lineEndY = rodEndY + 25 + sin(frameCount * 0.1) * 3;
  line(rodEndX, rodEndY, rodEndX, lineEndY);
  // Bobber — pixel
  noStroke();
  fill(255, 60, 60);
  rect(floor(rodEndX) - 2, floor(lineEndY) - 2, 4, 4);
  fill(255, 255, 255);
  rect(floor(rodEndX) - 1, floor(lineEndY) - 2, 2, 2);
  // Bite indicator
  if (f.bite) {
    fill(255, 200, 40, 150 + floor(sin(frameCount * 0.3) * 100));
    textSize(10);
    textAlign(CENTER, BOTTOM);
    text('!! PRESS F !!', floor(px), floor(py) - 50);
    // Splash — pixel rects
    fill(100, 180, 255, 120);
    for (let s = 0; s < 3; s++) {
      rect(floor(rodEndX) + floor(random(-6, 6)), floor(lineEndY) + floor(random(-4, 2)), 2, 2);
    }
  }
  noStroke();
}

function drawPlayerTrail() {
  let p = state.player;
  p.trailPoints.forEach(t => {
    let a = map(t.life, 0, 12, 0, 120);
    let sz = floor(map(t.life, 0, 12, 1, 3));
    noStroke();
    if (p.dashTimer > 0) {
      fill(255, 120, 0, a);
    } else {
      fill(200, 160, 80, a * 0.4);
    }
    rect(floor(w2sX(t.x)), floor(w2sY(t.y)), sz, sz);
  });
}

// ─── PLAYER ANIMATION UPDATE ──────────────────────────────────────────────
function updatePlayerAnim(dt) {
  let p = state.player;
  let a = p.anim;

  // Walk frame advance (4-frame cycle, ~8 frames per step)
  if (p.moving) {
    a.walkTimer += dt;
    if (a.walkTimer >= 8) { a.walkTimer = 0; a.walkFrame = (a.walkFrame + 1) % 4; }
  } else {
    a.walkFrame = 0; a.walkTimer = 0;
  }

  // Blink cycle — random interval 3-5 seconds
  a.blinkTimer -= dt;
  if (a.blinkTimer <= 0) {
    a.blinkFrame = 1;
    a.blinkTimer = floor(random(180, 300));
  }
  if (a.blinkFrame > 0) {
    a.blinkFrame += dt * 0.4;
    if (a.blinkFrame > 3) a.blinkFrame = 0;
  }

  // Bounce (harvest joy) decay
  if (a.bounceTimer > 0) {
    a.bounceTimer -= dt;
    let prog = a.bounceTimer / 12;
    a.bounceY = floor(sin(prog * PI) * -3);
  } else { a.bounceY = 0; }

  // Temporary emotion decay
  if (a.emotionTimer > 0) {
    a.emotionTimer -= dt;
    if (a.emotionTimer <= 0) a.emotion = 'determined';
  }

  // Time-driven emotion: weary at night (after 9pm), peaceful at temple
  let hour = state.time / 60;
  if (a.emotionTimer <= 0) {
    if (hour >= 21 || hour < 5) a.emotion = 'weary';
    else a.emotion = 'determined';
  }

  // Context helmet: off when farming/fishing, on in combat/conquest
  a.helmetOff = (p.hotbarSlot <= 3 && !state.conquest.active && !state.adventure.active);
}

// Trigger harvest joy bounce + happy face
function triggerPlayerJoy() {
  let a = state.player.anim;
  a.emotion = 'happy'; a.emotionTimer = 45;
  a.bounceTimer = 12;
}

// Trigger combat alert face
function triggerPlayerAlert() {
  let a = state.player.anim;
  if (a.emotion !== 'alert') { a.emotion = 'alert'; a.emotionTimer = 60; }
}

// ─── PLAYER DRAW — MODULAR LAYERS ────────────────────────────────────────
function drawPlayer() {
  if (state.rowing.active) return;
  let p = state.player;
  let a = p.anim;
  let sx = w2sX(p.x);
  let sy = w2sY(p.y);
  let s = p.size;

  // Idle breathing bob + bounce
  let bobY = p.moving ? sin(frameCount * 0.25) * 2 : sin(frameCount * 0.04) * 0.8;
  // Weary slump at night
  if (a.emotion === 'weary' && !p.moving) bobY += 1;

  // Dodge roll motion blur — ghost silhouettes trailing behind
  if (typeof _dodgeState !== 'undefined' && _dodgeState.motionBlur > 0) {
    let blurDx = _dodgeState.dx * -3;
    let blurDy = _dodgeState.dy * -3;
    for (let gi = 2; gi >= 1; gi--) {
      push();
      translate(floor(sx + blurDx * gi), floor(sy + bobY + a.bounceY + blurDy * gi));
      noStroke();
      fill(180, 140, 90, 30 / gi);
      rect(-8, -16, 16, 22, 2);
      pop();
    }
  }

  push();
  translate(floor(sx), floor(sy + bobY + a.bounceY));
  noStroke();

  let fDir = (p.facing === 'left') ? -1 : 1;
  let facingUp = (p.facing === 'up');

  // Walk cycle offsets (4-frame: 0=neutral, 1=left forward, 2=neutral, 3=right forward)
  let legOff = 0, armSwing = 0;
  if (p.moving) {
    let wf = a.walkFrame;
    legOff = (wf === 1) ? 2 : (wf === 3) ? -2 : 0;
    armSwing = (wf === 1) ? 1 : (wf === 3) ? -1 : 0;
  }

  drawPlayerShadow(s);
  drawPlayerFeet(s, legOff);
  drawPlayerCape(fDir, p.moving);
  drawPlayerBody();
  drawPlayerArms(armSwing);
  drawPlayerTool(fDir, p.hotbarSlot, p.toolSwing);
  drawPlayerHead(fDir, facingUp, a);

  // Dash cross-flash
  if (p.dashTimer > 0) {
    fill(220, 180, 50, 25);
    rect(-12, -1, 24, 2);
    rect(-1, -14, 2, 24);
  }

  pop();
}

function drawPlayerShadow(s) {
  // Elliptical shadow — more natural, scales with player
  fill(0, 0, 0, 45);
  ellipse(0, s, 20, 5);
  fill(0, 0, 0, 25);
  ellipse(0, s, 14, 3);
}

function drawPlayerFeet(s, legOff) {
  // Caligae (Roman military sandals) with straps
  fill(107, 66, 38);
  rect(-5, s - 3 + legOff, 4, 3);
  rect(1, s - 3 - legOff, 4, 3);
  // Sandal sole — darker bottom
  fill(80, 50, 25);
  rect(-5, s - 1 + legOff, 4, 1);
  rect(1, s - 1 - legOff, 4, 1);
  // Leather straps criss-crossing up ankle
  fill(120, 78, 42, 140);
  rect(-4, s - 5 + legOff, 2, 1);
  rect(2, s - 5 - legOff, 2, 1);
  // Shin guard/greave bottom hint
  fill(170, 140, 58, 60);
  rect(-5, s - 6 + legOff, 4, 1);
  rect(1, s - 6 - legOff, 4, 1);
}

function drawPlayerCape(fDir, moving) {
  // Flowing red cape — swaying with wind and movement
  let windStr = moving ? 1.5 : 0.8;
  let capeWave1 = floor(sin(frameCount * 0.06) * 2 * windStr);
  let capeWave2 = floor(sin(frameCount * 0.09 + 1) * 1.5 * windStr);
  let capeLen = 17 + capeWave1 + (moving ? 3 : 0);
  let capeX = -9 * fDir;
  let capeBlow = moving ? floor(sin(frameCount * 0.12) * 2) * -fDir : 0;

  // Cape shadow layer (slightly offset for depth)
  fill(110, 35, 28, 120);
  rect(capeX + capeBlow, -4, 4 * fDir, capeLen + 1);
  // Cape main fabric
  fill(196, 64, 50, 210);
  rect(capeX + capeBlow, -5, 4 * fDir, capeLen);
  // Cape inner fold (darker stripe for fabric drape)
  fill(160, 50, 40, 140);
  rect(capeX + capeBlow + fDir, -3, 1 * fDir, capeLen - 3);
  // Wind ripple highlight
  fill(220, 85, 65, 60);
  rect(capeX + capeBlow, -5 + floor(capeLen * 0.3), 3 * fDir, 2);
  rect(capeX + capeBlow + capeWave2 * fDir * 0.3, -5 + floor(capeLen * 0.6), 2 * fDir, 2);
  // Torn/frayed hem — ragged bottom edge
  fill(130, 42, 32, 100);
  rect(capeX + capeBlow, -5 + capeLen - 2, 1 * fDir, 2);
  rect(capeX + capeBlow + 2 * fDir, -5 + capeLen - 1, 1 * fDir, 2);
  rect(capeX + capeBlow + fDir, -5 + capeLen, 1 * fDir, 1);
}

function drawPlayerBody() {
  // Breathing animation — subtle chest expansion
  let breathe = sin(frameCount * 0.04) * 0.4;
  let chestW = 14 + floor(breathe);

  // Tunica — warm crimson with torn detail
  fill(175, 58, 44);
  rect(-floor(chestW / 2), -5, chestW, 18);
  // Tunica shadow fold
  fill(122, 40, 30, 60);
  rect(-6, 4, 2, 8);
  rect(4, 5, 2, 7);
  // Torn tunic edge — tattered hem
  fill(155, 50, 38, 80);
  rect(-5, 12, 2, 1);
  rect(2, 13, 3, 1);

  // Lorica segmentata — warm bronze bands
  fill(196, 162, 70);
  rect(-6, -5, 12, 3);
  fill(180, 148, 62);
  rect(-6, -2, 12, 3);
  fill(196, 162, 70);
  rect(-6, 1, 12, 2);
  // Armor highlight
  fill(220, 195, 100, 50);
  rect(-5, -5, 4, 1);

  // Pteruges (leather strips)
  fill(140, 100, 45);
  for (let i = -2; i <= 2; i++) rect(i * 3 - 1, 3, 2, 4);

  // Belt — gold with buckle
  fill(200, 170, 50);
  rect(-7, 2, 14, 2);
  fill(220, 190, 60);
  rect(-2, 1, 4, 3);

  // Pauldrons — bronze
  fill(170, 140, 60);
  rect(-9, -6, 4, 3);
  rect(5, -6, 4, 3);
  // Pauldron highlight
  fill(200, 175, 80, 60);
  rect(-8, -6, 2, 1);
  rect(6, -6, 2, 1);
}

function drawPlayerArms(armSwing) {
  // Skin tone — warm Mediterranean, muscular
  fill(212, 165, 116);
  rect(-9, -2 + armSwing, 3, 6);
  rect(7, -2 - armSwing, 3, 6);
  // Bicep highlight (muscle definition)
  fill(225, 180, 130, 80);
  rect(-8, -1 + armSwing, 1, 2);
  rect(8, -1 - armSwing, 1, 2);
  // Arm shadow — underside
  fill(166, 123, 91, 60);
  rect(-9, 2 + armSwing, 3, 2);
  rect(7, 2 - armSwing, 3, 2);
  // Wrist wrap / leather bracer
  fill(130, 90, 45, 100);
  rect(-9, 3 + armSwing, 3, 1);
  rect(7, 3 - armSwing, 3, 1);
}

function drawPlayerTool(fDir, hs, toolSwingTimer) {
  let swingOff = 0;
  if (toolSwingTimer > 0) {
    let swingProg = toolSwingTimer / 12;
    swingOff = floor(sin(swingProg * PI) * -8);
  }
  let toolX = 9 * fDir;
  let tw = fDir > 0 ? 1 : -1;
  if (hs === 0) {
    // Sickle — curved blade + wood handle
    fill(180, 180, 190);
    rect(toolX, -4 + swingOff, 2 * tw, 4);
    rect(toolX + tw, -5 + swingOff, 2 * tw, 2);
    fill(120, 90, 50);
    rect(toolX, 0 + swingOff, 2 * tw, 3);
  } else if (hs === 1) {
    // Axe
    fill(120, 90, 50);
    rect(toolX, -6 + swingOff, 2 * tw, 8);
    fill(160, 160, 170);
    rect(toolX - tw, -7 + swingOff, 4 * tw, 3);
  } else if (hs === 2) {
    // Pickaxe
    fill(120, 90, 50);
    rect(toolX, -4 + swingOff, 2 * tw, 6);
    fill(160, 160, 170);
    rect(toolX - 2 * tw, -6 + swingOff, 6 * tw, 2);
  } else if (hs === 3) {
    // Fishing rod
    fill(120, 90, 50);
    rect(toolX, -8 + swingOff, 2 * tw, 10);
    fill(100, 160, 200);
    rect(toolX + 2 * tw, -8 + swingOff, 1 * tw, 3);
  } else {
    // Gladius — steel blade + gold guard + leather grip
    fill(152, 152, 160);
    rect(toolX, -8 + swingOff, 2 * tw, 7);
    fill(180, 180, 190);
    rect(toolX, -8 + swingOff, 2 * tw, 2); // blade tip highlight
    fill(200, 170, 60);
    rect(toolX - tw, 0 + swingOff, 4 * tw, 2); // guard
    fill(100, 70, 35);
    rect(toolX, 2 + swingOff, 2 * tw, 2); // grip
  }
}

function drawPlayerHead(fDir, facingUp, anim) {
  // Head — warm Mediterranean skin
  fill(212, 165, 116);
  rect(-5, -14, 10, 8);
  // Chin shadow
  fill(166, 123, 91, 50);
  rect(-4, -7, 8, 1);
  // Short cropped dark hair (visible above helmet or when helmet off)
  fill(61, 43, 31);
  rect(-5, -14, 10, 2);
  // Sideburns
  rect(-5, -12, 1, 2);
  rect(4, -12, 1, 2);

  if (anim.helmetOff) {
    // Messy castaway hair — dark brown, wind-tousled
    fill(61, 43, 31);
    rect(-5, -16, 10, 3);  // hair base
    rect(-4, -17, 8, 1);   // hair crown
    // Messy tufts sticking out
    fill(55, 38, 26);
    rect(-6, -15, 2, 2);   // left tuft
    rect(4, -16, 2, 2);    // right tuft
    rect(-3, -18, 3, 1);   // top tuft
    rect(1, -18, 2, 1);    // another top tuft
    // Windblown strands
    let hairWind = floor(sin(frameCount * 0.04) * 1);
    fill(50, 35, 22);
    rect(4 + hairWind, -17, 2, 1);
    rect(-5 - hairWind, -16, 1, 2);
    // Highlight strands (sun-bleached tips)
    fill(85, 62, 42, 100);
    rect(-2, -18, 1, 1);
    rect(3, -17, 1, 1);
    // Laurel wreath — gold-green leaves
    fill(140, 160, 60);
    rect(-5, -15, 2, 1);
    rect(3, -15, 2, 1);
    fill(160, 180, 70);
    rect(-4, -16, 2, 1);
    rect(2, -16, 2, 1);
  } else {
    // Helmet — bronze with crest
    fill(196, 162, 70);
    rect(-6, -16, 12, 5);
    // Cheek guards
    fill(170, 140, 60);
    rect(-6, -13, 2, 3);
    rect(4, -13, 2, 3);
    // Crest (tattered red plume)
    fill(180, 30, 20);
    rect(-4, -20, 8, 4);
    rect(-2, -22, 4, 2);
    // Crest flutter
    let cf = floor(sin(frameCount * 0.08) * 1);
    rect(-3, -21 + cf, 2, 3);
    rect(2, -21 - cf, 2, 3);
    // Plume wear/tear — gap pixels
    fill(196, 162, 70);
    rect(3, -19, 1, 1); // torn spot
  }

  if (facingUp) {
    // Back of head
    fill(61, 43, 31); // hair back
    rect(-4, -13, 8, 4);
    if (!anim.helmetOff) {
      fill(170, 140, 60); // helmet back plate
      rect(-4, -13, 8, 3);
    }
  } else {
    // ─── EXPRESSIVE FACE ───
    let blinking = (anim.blinkFrame >= 1 && anim.blinkFrame <= 2);

    if (blinking) {
      // Blink — eyes become thin line
      fill(166, 123, 91);
      rect(-4, -12, 3, 1);
      rect(1, -12, 3, 1);
    } else if (anim.emotion === 'happy') {
      // Happy — crescent eyes (bottom half filled with skin)
      fill(255);
      rect(-4, -12, 3, 2);
      rect(1, -12, 3, 2);
      fill(40, 30, 20);
      let eyeOff = fDir > 0 ? 1 : 0;
      rect(-4 + eyeOff, -12, 1, 1);
      rect(1 + eyeOff, -12, 1, 1);
      // Happy squint — skin covers bottom of eye
      fill(212, 165, 116);
      rect(-4, -11, 3, 1);
      rect(1, -11, 3, 1);
      // Smile
      fill(170, 110, 90);
      rect(-2, -9, 4, 1);
      fill(212, 165, 116);
      rect(-2, -9, 1, 1); // smile curve ends
      rect(1, -9, 1, 1);
    } else if (anim.emotion === 'weary') {
      // Weary — half-lidded eyes, slight frown
      fill(255);
      rect(-4, -11, 3, 1); // lower eye position, squinted
      rect(1, -11, 3, 1);
      fill(40, 30, 20);
      let eyeOff = fDir > 0 ? 1 : 0;
      rect(-4 + eyeOff, -11, 1, 1);
      rect(1 + eyeOff, -11, 1, 1);
      // Heavy lids
      fill(212, 165, 116);
      rect(-4, -12, 3, 1);
      rect(1, -12, 3, 1);
      // Slight frown
      fill(150, 115, 90);
      rect(-1, -9, 2, 1);
    } else if (anim.emotion === 'alert') {
      // Alert — wide eyes, tense mouth
      fill(255);
      rect(-4, -13, 3, 3); // taller eye whites
      rect(1, -13, 3, 3);
      fill(40, 30, 20);
      let eyeOff = fDir > 0 ? 1 : 0;
      rect(-4 + eyeOff, -12, 2, 2); // larger pupils
      rect(1 + eyeOff, -12, 2, 2);
      fill(255, 255, 255, 200);
      rect(-3, -13, 1, 1);
      rect(2, -13, 1, 1);
      // Tense line mouth
      fill(140, 100, 80);
      rect(-2, -9, 4, 1);
    } else {
      // Determined (default) — focused, steady eyes
      fill(255);
      rect(-4, -12, 3, 2);
      rect(1, -12, 3, 2);
      fill(40, 30, 20);
      let eyeOff = fDir > 0 ? 1 : 0;
      rect(-4 + eyeOff, -12, 1, 1);
      rect(1 + eyeOff, -12, 1, 1);
      // Eye highlight
      fill(255, 255, 255, 180);
      rect(-3, -12, 1, 1);
      rect(2, -12, 1, 1);
      // Determined set mouth
      fill(170, 130, 100);
      rect(-1, -9, 2, 1);
    }

    // Scar detail — small diagonal mark on right cheek (backstory: shipwreck)
    fill(190, 145, 105, 80);
    rect(2, -10, 1, 1);
    rect(3, -9, 1, 1);
  }
}

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

  // Default: follow player
  cen.task = 'follow';
  let followDist = 35;
  let dx = p.x - followDist * (p.facing === 'left' ? -1 : 1) - cen.x;
  let dy = p.y + 5 - cen.y;
  let d = sqrt(dx * dx + dy * dy);
  if (d > 20) {
    let spd = d > 100 ? cen.speed * 1.5 : cen.speed;
    cen.vx = (dx / d) * spd;
    cen.vy = (dy / d) * spd;
    cen.x += cen.vx * dt;
    cen.y += cen.vy * dt;
    cen.facing = dx > 0 ? 1 : -1;
  } else {
    cen.vx *= 0.8;
    cen.vy *= 0.8;
  }

  // Clamp to island
  if (!state.conquest.active) {
    let ix = WORLD.islandCX, iy = WORLD.islandCY;
    let rx = getSurfaceRX() * 0.92, ry = getSurfaceRY() * 0.92;
    let ex = (cen.x - ix) / rx, ey = (cen.y - iy) / ry;
    if (ex * ex + ey * ey > 1) {
      let a = atan2(cen.y - iy, cen.x - ix);
      cen.x = ix + cos(a) * rx;
      cen.y = iy + sin(a) * ry;
    }
  } else {
    let c = state.conquest;
    let ex = (cen.x - c.isleX) / (c.isleRX * 0.9), ey = (cen.y - c.isleY) / (c.isleRY * 0.9);
    if (ex * ex + ey * ey > 1) {
      let a = atan2(cen.y - c.isleY, cen.x - c.isleX);
      cen.x = c.isleX + cos(a) * c.isleRX * 0.9;
      cen.y = c.isleY + sin(a) * c.isleRY * 0.9;
    }
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
  textSize(7); textAlign(CENTER, TOP);
  text('QUARRIER', floor(sx), floor(sy + 16));
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

  push();
  translate(floor(sx), floor(sy + bobY));

  // Flash white when hit
  if (cen.flashTimer > 0 && frameCount % 4 < 2) { pop(); return; }

  noStroke();
  // Shadow
  fill(0, 0, 0, 40);
  rect(-8, s + 1, 16, 2);

  // Caligae (military sandals) with studs
  fill(90, 60, 25);
  rect(-5, s - 2, 4, 3);
  rect(1, s - 2, 4, 3);
  // Hobnail studs
  fill(140, 130, 100);
  rect(-4, s, 1, 1);
  rect(2, s, 1, 1);

  // Legs — greaves (shin guards)
  fill(200, 165, 130);
  rect(-4, 4, 3, 7);
  rect(1, 4, 3, 7);
  // Bronze greaves
  fill(180, 150, 55);
  rect(-4, 6, 3, 4);
  rect(1, 6, 3, 4);
  fill(195, 165, 65, 80);
  rect(-3, 7, 1, 2);
  rect(2, 7, 1, 2);

  // Red paludamentum (commander's cape — behind body)
  fill(145, 28, 22, 180);
  let cw = floor(sin(frameCount * 0.07) * 2);
  rect(-6 * f, -5, 5, 16 + cw);
  // Cape edge highlight
  fill(165, 40, 32, 120);
  rect(-6 * f, -5, 1, 16 + cw);

  // Crimson tunica
  fill(158, 38, 32);
  rect(-6, -4, 12, 10);
  // Tunica shadow fold
  fill(140, 30, 26);
  rect(-6, -4, 4, 10);

  // Lorica segmentata (plate armor)
  fill(175, 172, 180);
  rect(-5, -4, 10, 6);
  // Armor bands
  fill(148, 145, 155);
  rect(-5, -2, 10, 1);
  rect(-5, 0, 10, 1);
  // Armor highlight — polished
  fill(195, 192, 200, 80);
  rect(-4, -4, 3, 2);

  // Pteruges (leather skirt strips)
  fill(130, 95, 40);
  for (let i = -2; i <= 2; i++) {
    rect(i * 3 - 1, 2, 2, 4);
  }
  // Pteruges tips — brass studs
  fill(180, 155, 55);
  for (let i = -2; i <= 2; i++) {
    rect(i * 3, 5, 1, 1);
  }

  // Cingulum (military belt)
  fill(195, 165, 55);
  rect(-5, 1, 10, 2);
  // Belt medallion
  fill(210, 180, 60);
  rect(-1, 1, 2, 2);

  // Pauldrons — polished bronze
  fill(185, 155, 60);
  rect(-8, -5, 4, 3);
  rect(4, -5, 4, 3);
  // Pauldron highlights
  fill(200, 175, 75, 80);
  rect(-7, -5, 2, 1);
  rect(5, -5, 2, 1);

  // Arms — battle-hardened
  fill(200, 165, 130);
  rect(-8, -2, 2, 5);
  rect(6, -2, 2, 5);
  // Vambrace (forearm guard)
  fill(170, 140, 50);
  rect(-8, 0, 2, 3);
  rect(6, 0, 2, 3);

  // Gladius — the Roman short sword
  if (cen.task === 'fight') {
    let swing = floor(sin(frameCount * 0.2) * 4);
    // Blade
    fill(185, 185, 195);
    rect(6 * f + swing, -13, 2, 11);
    // Blade edge highlight
    fill(210, 210, 220);
    rect(6 * f + swing, -13, 1, 11);
    // Gold hilt
    fill(195, 165, 55);
    rect(6 * f + swing - 1, -2, 4, 2);
    // Pommel
    fill(200, 170, 60);
    rect(6 * f + swing, 0, 2, 1);
  } else {
    // Sheathed at hip
    fill(90, 65, 30);
    rect(5 * f, 2, 2, 7); // scabbard
    fill(175, 145, 55);
    rect(5 * f, 1, 2, 2); // hilt visible
  }

  // Scutum (shield) — curved Roman infantry shield
  let shX = -7 * f;
  fill(158, 32, 25);
  rect(shX - 4, -5, 8, 13);
  // Shield rim — gold
  fill(190, 165, 55);
  rect(shX - 4, -5, 8, 1);
  rect(shX - 4, 7, 8, 1);
  rect(shX - 4, -5, 1, 13);
  rect(shX + 3, -5, 1, 13);
  // Shield boss — iron
  fill(180, 178, 185);
  rect(shX - 1, 0, 2, 2);
  // Shield lightning bolt emblem
  fill(200, 170, 55);
  rect(shX - 1, -3, 1, 2);
  rect(shX, -1, 1, 2);
  rect(shX - 1, 1, 1, 2);
  rect(shX + 0, 3, 1, 2);

  // Neck
  fill(200, 165, 130);
  rect(-3, -7, 6, 3);

  // Head
  fill(200, 165, 130);
  rect(-4, -11, 8, 6);
  // Jaw — strong
  fill(190, 155, 120);
  rect(-4, -6, 2, 1);
  rect(2, -6, 2, 1);

  // Galea (helmet) — bronze with iron
  fill(175, 150, 60);
  rect(-5, -13, 10, 4);
  // Brow guard
  fill(165, 140, 55);
  rect(-5, -10, 10, 1);
  // Cheek guards
  fill(165, 140, 55);
  rect(-5, -10, 2, 4);
  rect(3, -10, 2, 4);
  // Neck guard
  fill(160, 135, 50);
  rect(-4, -6, 8, 1);

  // Transverse crest — RED horsehair (marks centurion rank)
  fill(200, 35, 25);
  rect(-6, -15, 12, 2);
  rect(-4, -17, 8, 2);
  // Crest flutter
  let cf = floor(sin(frameCount * 0.1) * 1);
  fill(180, 30, 22);
  rect(-5, -16 + cf, 2, 3);
  rect(3, -16 - cf, 2, 3);

  // Eyes — steely gaze, tracking facing
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

  // Rank text — gold
  fill(195, 170, 60, 100);
  textSize(5);
  textAlign(CENTER);
  text('CENTURION', 0, -s * 1.3);
  textAlign(LEFT, TOP);

  pop();
}

// ─── NPC ──────────────────────────────────────────────────────────────────
function drawNPC() {
  let n = state.npc;
  let sx = w2sX(n.x);
  let sy = w2sY(n.y);
  let bob = sin(frameCount * 0.03) * 1.2;
  let breathe = sin(frameCount * 0.04) * 0.4;

  push();
  translate(floor(sx), floor(sy + bob));

  // Natural elliptical shadow
  noStroke();
  fill(0, 0, 0, 35);
  ellipse(0, 17, 18, 5);

  scale(0.72);
  translate(0, -2);

  noStroke();
  // Pixel gold sandals
  fill(200, 170, 70);
  rect(-8, 20, 5, 3);
  rect(3, 20, 5, 3);
  // Ankle tie pixels
  fill(190, 160, 60);
  rect(-6, 18, 1, 2);
  rect(5, 18, 1, 2);

  // Pixel stola — ivory silk
  fill(248, 240, 225);
  rect(-10, -5, 20, 26);
  // Thigh slit — show skin on right side
  fill(220, 185, 150);
  rect(5, 12, 4, 9);
  // Dress highlight — right panel
  fill(255, 250, 240, 100);
  rect(4, -4, 6, 24);

  // Pixel palla — crimson drape over left shoulder
  fill(140, 30, 50, 200);
  rect(-10, -6, 14, 14);
  // Palla tail flowing
  fill(120, 25, 40, 160);
  rect(-12, 8, 4, 14);

  // Pixel gold belt
  fill(220, 190, 60);
  rect(-10, 3, 20, 2);
  // Belt details
  fill(200, 170, 50);
  rect(-8, 3, 2, 2);
  rect(-2, 3, 2, 2);
  rect(4, 3, 2, 2);
  // Ruby medallion
  fill(160, 25, 50);
  rect(-1, 3, 2, 2);

  // Gold neckline trim
  fill(220, 190, 60);
  rect(-10, -6, 2, 1);
  rect(-8, -5, 2, 1);
  rect(-6, -4, 2, 1);
  rect(4, -4, 2, 1);
  rect(6, -5, 2, 1);
  rect(8, -6, 2, 1);

  // Pixel arms — bare shoulders
  fill(220, 185, 150);
  rect(-12, -2, 2, 8);
  rect(10, -2, 2, 8);
  // Gold bracelets
  fill(210, 180, 60);
  rect(-12, 4, 2, 1);
  rect(10, 4, 2, 1);

  // Pixel amphora in left hand
  fill(180, 110, 65);
  rect(-15, -4, 4, 6);
  fill(160, 95, 50);
  rect(-15, -6, 3, 2); // neck
  rect(-16, -4, 1, 3); // handle

  // Pixel neck
  fill(220, 185, 150);
  rect(-4, -9, 8, 4);

  // Pixel head
  fill(220, 185, 150);
  rect(-8, -22, 16, 14);

  // Pixel blonde hair — flowing golden locks
  fill(215, 185, 105);
  // Top volume
  rect(-9, -24, 18, 6);
  // Left flowing locks
  rect(-10, -20, 3, 18);
  rect(-11, -14, 2, 12);
  // Right flowing locks
  rect(7, -20, 3, 18);
  rect(9, -14, 2, 12);
  // Hair wave animation
  let hairSway = floor(sin(frameCount * 0.03) * 1);
  rect(-11 + hairSway, -6, 2, 4);
  rect(9 - hairSway, -6, 2, 4);
  // Darker roots / depth
  fill(190, 160, 85);
  rect(-9, -22, 18, 2);
  rect(-10, -18, 3, 4);
  rect(7, -18, 3, 4);
  // Sun-lit highlight strands
  fill(240, 215, 140, 120);
  rect(-8, -24, 3, 2);
  rect(5, -23, 3, 2);
  rect(-4, -25, 4, 1);
  // Forehead strand
  fill(225, 195, 115);
  rect(2, -22, 4, 2);
  rect(-3, -23, 3, 1);

  // Pixel gold laurel crown — ornate with leaves
  fill(220, 195, 60);
  rect(-6, -25, 4, 2);
  rect(-2, -26, 4, 2);
  rect(2, -25, 4, 2);
  // Crown shimmer
  let crownShimmer = sin(frameCount * 0.05) * 0.3 + 0.7;
  fill(245, 225, 100, 60 * crownShimmer);
  rect(-2, -26, 4, 2);
  // Green olive leaves
  fill(90, 140, 50);
  rect(-8, -24, 2, 2);
  rect(6, -24, 2, 2);
  fill(75, 120, 40);
  rect(-7, -25, 2, 1);
  rect(5, -25, 2, 1);
  // Tiny ruby centerpiece
  fill(180, 30, 50);
  rect(-1, -25, 2, 2);
  fill(210, 50, 70, 100);
  rect(0, -25, 1, 1);

  // Pixel eyes — large, warm, expressive (with blink)
  let npcBlink = (frameCount % 300 > 292);
  if (npcBlink) {
    // Closed eyes — serene smile
    fill(200, 165, 135);
    rect(-6, -16, 4, 1);
    rect(2, -16, 4, 1);
    // Kohl eyeliner still visible
    fill(20, 15, 10);
    rect(-7, -17, 5, 1);
    rect(2, -17, 5, 1);
    // Happy crescent hint when blinking
    fill(220, 185, 150);
    rect(-5, -15, 2, 1);
    rect(3, -15, 2, 1);
  } else {
    fill(255);
    rect(-6, -17, 4, 3);
    rect(2, -17, 4, 3);
    // Iris — warm blue-green
    fill(45, 85, 95);
    rect(-5, -17, 2, 2);
    rect(3, -17, 2, 2);
    // Pupil
    fill(25, 45, 50);
    rect(-4, -16, 1, 1);
    rect(4, -16, 1, 1);
    // Highlights — bright sparkle
    fill(255, 255, 255, 240);
    rect(-5, -17, 1, 1);
    rect(3, -17, 1, 1);
    // Second smaller highlight
    fill(255, 255, 255, 120);
    rect(-3, -16, 1, 1);
    rect(5, -16, 1, 1);
    // Kohl eyeliner — elegant dark frame
    fill(20, 15, 10);
    rect(-7, -18, 5, 1);
    rect(2, -18, 5, 1);
    // Long lashes
    rect(-7, -19, 1, 1);
    rect(-6, -19, 1, 1);
    rect(5, -19, 1, 1);
    rect(6, -19, 1, 1);
  }

  // Pixel eyebrows
  fill(45, 28, 15);
  rect(-6, -20, 4, 1);
  rect(2, -20, 4, 1);

  // Pixel nose
  fill(200, 165, 135);
  rect(0, -14, 1, 2);

  // Pixel lips — crimson
  fill(195, 65, 75);
  rect(-2, -12, 4, 1); // upper lip
  fill(180, 55, 65);
  rect(-3, -11, 6, 2); // lower lip
  // Lip shine
  fill(220, 100, 110, 80);
  rect(0, -12, 1, 1);

  // Pixel blush
  fill(220, 130, 120, 50);
  rect(-7, -14, 3, 2);
  rect(4, -14, 3, 2);

  // Pixel beauty mark
  fill(60, 30, 20);
  rect(5, -13, 1, 1);

  // Pixel gold earrings
  fill(220, 195, 60);
  rect(-9, -16, 2, 2);
  rect(7, -16, 2, 2);
  // Dangling gems
  let earOff = floor(sin(frameCount * 0.06) * 1);
  fill(220, 195, 60);
  rect(-9 + earOff, -14, 1, 2);
  rect(8 - earOff, -14, 1, 2);
  fill(140, 20, 50);
  rect(-9 + earOff, -12, 1, 1);
  rect(8 - earOff, -12, 1, 1);

  // Pixel gold necklace
  fill(210, 180, 60);
  rect(-5, -8, 2, 1);
  rect(-3, -7, 2, 1);
  rect(1, -7, 2, 1);
  rect(3, -8, 2, 1);
  // Pendant
  fill(210, 180, 60);
  rect(-1, -6, 2, 2);
  fill(0, 140, 100, 180);
  rect(-1, -6, 1, 1);

  // Counter-scale for UI elements (dialog, prompt, hearts)
  let invS = 1 / 0.72;
  push();
  scale(invS);

  if (n.currentLine !== -1 && n.currentLine !== null) {
    let ln = (typeof n.currentLine === 'string') ? n.currentLine : n.lines[n.currentLine];
    drawDialogBubble(0, -34, ln);
    n.dialogTimer--;
    if (n.dialogTimer <= 0) n.currentLine = -1;
  } else {
    let p = state.player;
    let d = dist2(p.x, p.y, n.x, n.y);
    if (d < 80) {
      noStroke();
      fill(color(C.hudBg));
      stroke(color(C.hudBorder));
      strokeWeight(1);
      rect(-16, -30, 32, 14, 3);
      noStroke();
      fill(color(C.crystalGlow));
      textAlign(CENTER, CENTER);
      textSize(9);
      text('[E]', 0, -23);
    }
  }

  for (let h = 0; h < n.hearts; h++) {
    fill(200, 50, 80, 180);
    drawHeart(h * 12 - (n.hearts * 6) + 6, -26 - (n.currentLine !== -1 && n.currentLine !== null ? 28 : 0), 4);
  }
  // Relationship tier label
  if (typeof getRelationshipTier === 'function' && n.hearts > 0) {
    let tier = getRelationshipTier(n.hearts);
    fill(color(tier.color)); textAlign(CENTER, CENTER); textSize(5);
    text(tier.title, 0, -34 - (n.currentLine !== -1 && n.currentLine !== null ? 28 : 0));
    textAlign(LEFT, TOP);
  }

  pop(); // counter-scale
  pop(); // main translate
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

  if (frameCount % 8 === 0) {
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

  // Butterflies — daytime, near farm
  if (bright > 0.4 && frameCount % 45 === 0 && particles.filter(p => p.type === 'butterfly').length < 4) {
    let bx = WORLD.islandCX - 220 + random(-100, 100);
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
  if (bright > 0.6 && frameCount % 12 === 0) {
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

  // Storm rain (screen-space)
  if (stormActive && frameCount % 3 === 0) {
    particles.push({
      x: random(width), y: random(-20, height * 0.5),
      vx: random(-1, -3), vy: random(1, 4),
      life: random(30, 70), maxLife: 70,
      type: 'rain', size: random(1, 2),
      r: 100, g: 160, b: 220, world: false,
    });
  }

  // Hard cap: prevent particle explosion
  if (particles.length > 300) particles.splice(0, particles.length - 250);

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
  particles = particles.filter(p => p.life > 0);
}

function drawParticles() {
  noStroke();
  particles.forEach(p => {
    let a = map(p.life, 0, p.maxLife, 0, 1);
    let px = p.world ? w2sX(p.x) : p.x;
    let py = p.world ? w2sY(p.y) : p.y;

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
  });
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

// ─── JUICE: HARVEST BURST ────────────────────────────────────────────────
function spawnHarvestBurst(wx, wy, cropType) {
  // Golden particle fountain — the Ceres offering
  let baseR = 255, baseG = 200, baseB = 50;
  if (cropType === 'grape') { baseR = 140; baseG = 60; baseB = 160; }
  else if (cropType === 'olive') { baseR = 120; baseG = 160; baseB = 40; }
  for (let i = 0; i < 12; i++) {
    let angle = random(TWO_PI);
    let speed = random(1.5, 4);
    particles.push({
      x: wx + random(-4, 4), y: wy + random(-4, 4),
      vx: cos(angle) * speed * 0.6,
      vy: sin(angle) * speed - 2.5, // bias upward
      life: random(35, 65), maxLife: 65,
      type: 'harvest_burst', size: random(2, 5),
      r: baseR + random(-20, 20), g: baseG + random(-20, 20), b: baseB,
      gravity: 0.06, world: true,
    });
  }
  // Central golden flash ring
  particles.push({
    x: wx, y: wy, vx: 0, vy: 0,
    life: 20, maxLife: 20,
    type: 'pulse_ring', size: 5,
    r: 255, g: 220, b: 80,
    growRate: 2.5, world: true,
  });
}

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
  for (let i = 0; i < 8; i++) {
    let angle = (TWO_PI / 8) * i + random(-0.3, 0.3);
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
  for (let i = 0; i < 8; i++) {
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
  for (let i = 0; i < 4; i++) {
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

// ─── JUICE: BUILDING COMPLETE — dust cloud + sparkles settling ──────────
function spawnBuildingComplete(wx, wy) {
  // Dust cloud burst
  for (let i = 0; i < 8; i++) {
    let angle = random(TWO_PI);
    let speed = random(0.8, 2.5);
    particles.push({
      x: wx + random(-6, 6), y: wy + random(-4, 4),
      vx: cos(angle) * speed, vy: sin(angle) * speed * 0.5 - 1,
      life: random(30, 55), maxLife: 55,
      type: 'dust', size: random(3, 7),
      r: 160, g: 145, b: 110, world: true,
    });
  }
  // Settling sparkles
  for (let i = 0; i < 10; i++) {
    particles.push({
      x: wx + random(-20, 20), y: wy - random(10, 40),
      vx: random(-0.3, 0.3), vy: random(0.3, 1),
      life: random(40, 70), maxLife: 70,
      type: 'sundust', size: random(1.5, 3),
      r: 220, g: 200, b: 120, world: true, phase: random(TWO_PI),
    });
  }
  // Completion ring
  particles.push({
    x: wx, y: wy, vx: 0, vy: 0,
    life: 25, maxLife: 25,
    type: 'pulse_ring', size: 8,
    r: 200, g: 180, b: 100, world: true,
  });
}

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
  triggerScreenShake(10, 25);
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
    // Early morning: fading warm mist
    let t = map(h, 6.5, 8, 0, 1);
    r = 255; g = 210; b = 140;
    a = lerp(12, 0, t);
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
  } else if (h >= 17 && h < 18.5) {
    // Sunset: orange-red intensifying
    let t = map(h, 17, 18.5, 0, 1);
    r = lerp(255, 200, t); g = lerp(140, 60, t); b = lerp(50, 80, t);
    a = lerp(28, 38, t);
  } else if (h >= 18.5 && h < 20.5) {
    // Dusk: deep purple settling
    let t = map(h, 18.5, 20.5, 0, 1);
    r = lerp(120, 15, t); g = lerp(50, 12, t); b = lerp(100, 50, t);
    a = lerp(30, 45, t);
  } else if (h >= 20.5 || h < 5) {
    // Night: deep indigo-blue
    r = 8; g = 8; b = 30;
    a = 42;
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
  let vigA = 18 + (h >= 20 || h < 6 ? 12 : 0);
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
    stormActive = true;
    stormTimer = 0;
    addFloatingText(width / 2, height * 0.3, '⚡ DRIFT STORM', C.stormFlash);
    triggerScreenShake(8, 20);
  }
  if (stormActive && stormTimer > 800) {
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
    // Full-screen flash on fresh strike
    if (l.life > l.maxLife - 3) {
      noStroke();
      fill(220, 230, 255, 60 * a);
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
function addFloatingText(x, y, txt, col) {
  floatingText.push({ x, y, txt, col, life: 80, maxLife: 80, vy: -0.6 });
}

// ─── NOTIFICATION FEED ───────────────────────────────────────────────────
function addNotification(txt, col) {
  col = col || '#d4a040';
  notifications.push({ text: txt, col: col, timer: 300, maxTimer: 300, fadeIn: 0 });
  if (notifications.length > 6) notifications.shift();
}

function updateNotifications(dt) {
  for (let i = notifications.length - 1; i >= 0; i--) {
    let n = notifications[i];
    n.fadeIn = min(n.fadeIn + dt * 0.08, 1);
    n.timer -= dt;
    if (n.timer <= 0) { notifications.splice(i, 1); }
  }
}

function drawNotifications() {
  if (notifications.length === 0) return;
  let nx = width - 14;
  let ny = height - 70;
  textAlign(RIGHT, BOTTOM);
  for (let i = notifications.length - 1; i >= 0; i--) {
    let n = notifications[i];
    let fadeOut = n.timer < 40 ? n.timer / 40 : 1;
    let alpha = n.fadeIn * fadeOut;
    let slideX = (1 - n.fadeIn) * 60;
    let c = color(n.col);
    fill(20, 15, 10, 180 * alpha);
    noStroke();
    let tw = textWidth(n.text) + 16;
    rect(nx - tw + slideX, ny - 11, tw, 14, 3);
    fill(red(c), green(c), blue(c), 255 * alpha);
    textSize(7);
    text(n.text, nx - 4 + slideX, ny);
    ny -= 16;
  }
  textAlign(LEFT, TOP);
}

// ─── ACHIEVEMENT POPUP ──────────────────────────────────────────────────
function showAchievement(txt) {
  achievementPopup = { text: txt, timer: 240, slideX: 250 };
}

function updateAchievementPopup(dt) {
  if (!achievementPopup) return;
  let a = achievementPopup;
  // Slide in
  if (a.timer > 200) a.slideX = max(0, a.slideX - dt * 8);
  // Slide out
  else if (a.timer < 40) a.slideX = min(250, a.slideX + dt * 8);
  a.timer -= dt;
  if (a.timer <= 0) achievementPopup = null;
}

function drawAchievementPopup() {
  if (!achievementPopup) return;
  let a = achievementPopup;
  let pw = 200, ph = 36;
  let px = width - pw + a.slideX;
  let py = 100;
  // Panel
  noStroke();
  fill(25, 20, 12, 230);
  rect(px, py, pw, ph, 4);
  stroke(212, 160, 64, 200);
  strokeWeight(1.5);
  noFill();
  rect(px, py, pw, ph, 4);
  noStroke();
  // Star icon
  fill(255, 200, 40);
  textSize(14);
  textAlign(LEFT, CENTER);
  text('\u2605', px + 8, py + ph / 2);
  // Text
  fill(240, 220, 180);
  textSize(8);
  text(a.text, px + 26, py + ph / 2 - 1);
  textAlign(LEFT, TOP);
}

// ─── SCREEN TRANSITIONS ─────────────────────────────────────────────────
function startScreenTransition(callback) {
  screenTransition = { active: true, alpha: 0, dir: 1, callback: callback };
}

function updateScreenTransition(dt) {
  if (!screenTransition.active) return;
  let s = screenTransition;
  s.alpha += s.dir * dt * 8;
  if (s.dir === 1 && s.alpha >= 255) {
    s.alpha = 255;
    if (s.callback) { s.callback(); s.callback = null; }
    s.dir = -1;
  }
  if (s.dir === -1 && s.alpha <= 0) {
    s.alpha = 0;
    s.active = false;
  }
}

function drawScreenTransition() {
  if (!screenTransition.active) return;
  noStroke();
  fill(10, 8, 5, screenTransition.alpha);
  rect(0, 0, width, height);
}

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
    dialogState.displayLen += dt * 0.8;
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
  textSize(8);
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
      textSize(7);
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
      textSize(8);
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
    // Helmet crest
    fill(180, 30, 30); rect(-3, -18, 6, 4);
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

function drawFloatingText() {
  floatingText.forEach(f => {
    let a = map(f.life, 0, f.maxLife, 0, 255);
    let age = f.maxLife - f.life;
    // Scale pop: start at 1.4x, settle to 1.0 with bounce ease
    let scaleT = min(age / 12, 1);
    let sc = 1 + 0.4 * (1 - scaleT) * (1 + sin(scaleT * PI * 2) * 0.3);
    let c = color(f.col);
    // Drop shadow
    c.setAlpha(a * 0.3);
    noStroke();
    fill(c);
    textAlign(CENTER, CENTER);
    textSize(11 * sc);
    text(f.txt, f.x + 1, f.y + 1);
    // Main text
    c.setAlpha(a);
    fill(c);
    text(f.txt, f.x, f.y);
  });
  textAlign(LEFT, TOP);
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
    checkQuestProgress('chop', 1);
    addFloatingText(w2sX(tree.x), w2sY(tree.y) - 40, '+' + woodDrop + ' Wood', '#8B6914');
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
    let sway = sin(frameCount * 0.015 + t.swayPhase) * 3 * s;
    // Chop wobble
    if (t.shakeTimer > 0) {
      sway += sin(t.shakeTimer * 1.5) * t.shakeTimer * 0.8;
      t.shakeTimer--;
    }

    push();
    translate(sx + sway, sy);

    // Shadow — elliptical, natural
    noStroke();
    fill(0, 0, 0, 35);
    ellipse(2 * s, 3, 22 * s, 6 * s);

    if (t.type === 'oak') {
      // Cypress — tall, narrow, dark green column (iconic Mediterranean)
      // Trunk — thin and straight
      fill(65, 45, 24);
      rect(-2 * s, -30 * s, 4 * s, 34 * s);
      fill(78, 56, 30);
      rect(-1 * s, -28 * s, 2 * s, 30 * s);
      // Bark texture
      fill(55, 38, 18, 80);
      for (let bi = 0; bi < 5; bi++) {
        rect(0, (-25 + bi * 7) * s, 1 * s, 2 * s);
      }
      // Tall narrow conical foliage — dense dark green column
      fill(22, 55, 20);
      rect(-3 * s, -95 * s, 6 * s, 8 * s);
      rect(-4 * s, -87 * s, 8 * s, 10 * s);
      rect(-5 * s, -77 * s, 10 * s, 12 * s);
      rect(-6 * s, -65 * s, 12 * s, 14 * s);
      rect(-6 * s, -51 * s, 12 * s, 16 * s);
      rect(-5 * s, -35 * s, 10 * s, 12 * s);
      // Mid layer — slightly lighter
      fill(32, 68, 28);
      rect(-2 * s, -93 * s, 4 * s, 6 * s);
      rect(-3 * s, -87 * s, 6 * s, 10 * s);
      rect(-4 * s, -77 * s, 8 * s, 12 * s);
      rect(-5 * s, -65 * s, 10 * s, 12 * s);
      rect(-4 * s, -53 * s, 8 * s, 14 * s);
      // Sunlit highlight — right side
      fill(45, 88, 38, 130);
      rect(1 * s, -85 * s, 3 * s, 40 * s);
      rect(0, -60 * s, 2 * s, 20 * s);
      // Tip — pointed top
      fill(25, 58, 22);
      rect(-1 * s, -98 * s, 2 * s, 4 * s);
      rect(0, -100 * s, 1 * s, 3 * s);
      // Leaf texture dots
      fill(38, 75, 30, 100);
      for (let li = 0; li < 6; li++) {
        let ly = floor(-88 * s + li * 10 * s);
        rect(floor(sin(li * 2.1) * 2 * s), ly, 2 * s, 2 * s);
      }
    } else if (t.type === 'pine') {
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
    } else {
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
    }

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
function getPortPosition() {
  // Port always sits at the island's left shoreline, scaling with size
  let portX = WORLD.islandCX - getSurfaceRX() * 0.95;
  let portY = WORLD.islandCY + getSurfaceRY() * 0.15;
  return { x: portX, y: portY };
}

function updateShip(dt) {
  let ship = state.ship;
  ship.timer += dt;

  // Merchant docks on RIGHT shore — far end of pier
  ship.dockX = WORLD.islandCX + getSurfaceRX() * 1.12;
  ship.dockY = WORLD.islandCY + 20;

  switch (ship.state) {
    case 'gone':
      if (ship.timer > ship.nextArrival) {
        ship.state = 'arriving';
        ship.timer = 0;
        ship.x = WORLD.islandCX + state.islandRX + 400;
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
      // Player must be near the right-side merchant dock (in shallows)
      let pd = dist2(state.player.x, state.player.y, ship.dockX, ship.dockY);
      ship.shopOpen = (pd < 120);

      // Auto-sell from storage every 90 frames (~1.5s)
      ship.autoSellTimer = (ship.autoSellTimer || 0) + dt;
      if (ship.autoSellTimer >= 90) {
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
      ship.x += 2;
      ship.y += 0.1; // sail away right
      if (ship.x > WORLD.islandCX + state.islandRX + 500) {
        ship.state = 'gone';
        ship.timer = 0;
        ship.nextArrival = 3600 + random(-600, 600);
      }
      break;
  }
}

function generateShopOffers() {
  let offers = [
    { type: 'buy', item: 'harvest', qty: 3, price: 5, label: 'Sell 3 Harvest → 5 Gold' },
    { type: 'buy', item: 'crystals', qty: 2, price: 8, label: 'Sell 2 Crystals → 8 Gold' },
    { type: 'buy', item: 'wood', qty: 5, price: 3, label: 'Sell 5 Wood → 3 Gold' },
    { type: 'buy', item: 'fish', qty: 2, price: 6, label: 'Sell 2 Fish → 6 Gold' },
    { type: 'sell', item: 'seeds', qty: 5, price: 3, label: 'Buy 5 Seeds → 3 Gold' },
    { type: 'sell', item: 'grapeSeeds', qty: 3, price: 5, label: 'Buy 3 Grape Seeds → 5 Gold' },
    { type: 'sell', item: 'oliveSeeds', qty: 3, price: 5, label: 'Buy 3 Olive Seeds → 5 Gold' },
    { type: 'sell', item: 'stone', qty: 5, price: 4, label: 'Buy 5 Stone → 4 Gold' },
  ];
  // Tool upgrades (only show if not owned)
  if (!state.tools.sickle) offers.push({ type: 'tool', tool: 'sickle', price: 15, label: 'Bronze Sickle → 15 Gold (2x harvest)' });
  if (!state.tools.axe) offers.push({ type: 'tool', tool: 'axe', price: 20, label: 'Iron Axe → 20 Gold (1-hit chop)' });
  if (!state.tools.net) offers.push({ type: 'tool', tool: 'net', price: 25, label: 'Fishing Net → 25 Gold (auto fish)' });
  return offers;
}

function doTrade(offerIdx) {
  let offer = state.ship.offers[offerIdx];
  if (!offer) return;
  if (offer.type === 'tool') {
    if (state.gold >= offer.price) {
      state.gold -= offer.price;
      state.tools[offer.tool] = 1;
      addFloatingText(width / 2, height * 0.5, 'Got ' + offer.tool + '!', C.solarBright);
      spawnParticles(state.player.x, state.player.y, 'build', 8);
      // Refresh offers to remove purchased tool
      state.ship.offers = generateShopOffers();
    } else {
      addFloatingText(width / 2, height * 0.5, 'Need ' + offer.price + ' gold!', C.buildInvalid);
    }
  } else if (offer.type === 'buy') {
    if (state[offer.item] >= offer.qty) {
      state[offer.item] -= offer.qty;
      state.gold += offer.price;
      addFloatingText(width / 2, height * 0.5, '+' + offer.price + ' Gold!', C.solarBright);
    } else {
      addFloatingText(width / 2, height * 0.5, 'Not enough ' + offer.item + '!', C.buildInvalid);
    }
  } else {
    if (state.gold >= offer.price) {
      state.gold -= offer.price;
      state[offer.item] += offer.qty;
      addFloatingText(width / 2, height * 0.5, '+' + offer.qty + ' ' + offer.item + '!', C.crystalGlow);
    } else {
      addFloatingText(width / 2, height * 0.5, 'Need ' + offer.price + ' gold!', C.buildInvalid);
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
  // Flip ship to face island (left) when docked or arriving
  if (ship.state === 'docked' || ship.state === 'arriving') scale(-1, 1);
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
  // Red stripe
  fill(160, 40, 30, 180);
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
  // Eagle/standard at top — pixel rect + crown
  fill(180, 140, 50);
  rect(-51, -32, 6, 4);
  fill(200, 160, 60);
  rect(-50, -36, 4, 4);   // eagle head
  rect(-52, -34, 2, 2);   // left wing
  rect(-44, -34, 2, 2);   // right wing

  // Flag at mast top — pixel rect with wave
  let flagWave = floor(sin(frameCount * 0.04) * 2);
  fill(160, 40, 30);
  rect(1, -58, 10 + flagWave, 4);
  rect(1, -54, 8 + flagWave, 4);

  // "TRADE" indicator — counter-flip text so it reads correctly
  if (ship.state === 'docked') {
    push();
    scale(-1, 1); // undo the ship flip for text
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
      textSize(8);
      text('walk near to trade', 0, 22);
    }
    pop();
  }

  pop();
}

function drawShopUI() {
  let ship = state.ship;
  if (!ship.shopOpen || ship.state !== 'docked') return;

  let panW = 300;
  let panH = 54 + ship.offers.length * 28 + 24;
  let panX = width / 2 - panW / 2;
  let panY = height / 2 - panH / 2;

  // Dim backdrop
  rectMode(CORNER);
  noStroke();
  fill(0, 0, 0, 140);
  rect(0, 0, width, height);

  drawParchmentPanel(panX, panY, panW, panH);

  // Title with Roman flair
  fill(200, 170, 90);
  textSize(14);
  textAlign(CENTER, TOP);
  text('MERCATOR', width / 2, panY + 12);
  // Subtitle
  fill(160, 140, 100);
  textSize(8);
  text('Merchant Ship  —  Gold: ' + state.gold, width / 2, panY + 30);
  // Decorative line under title
  stroke(140, 110, 55, 100);
  strokeWeight(0.5);
  line(panX + 20, panY + 42, panX + panW - 20, panY + 42);
  noStroke();

  textAlign(LEFT, TOP);
  ship.offers.forEach((offer, i) => {
    let oy = panY + 54 + i * 28;
    let canDo = offer.type === 'buy' ?
      state[offer.item] >= offer.qty :
      state.gold >= offer.price;

    // Row background
    fill(canDo ? color(60, 50, 35, 150) : color(40, 30, 25, 100));
    rect(panX + 12, oy, panW - 24, 24, 3);
    // Left accent bar
    fill(canDo ? color(180, 150, 60) : color(80, 60, 40));
    rect(panX + 12, oy, 3, 24, 3, 0, 0, 3);

    // Label
    fill(canDo ? color(220, 200, 150) : color(100, 85, 65));
    textSize(9);
    text(offer.label, panX + 22, oy + 8);

    // Click hint
    if (canDo) {
      fill(180, 150, 60);
      textAlign(RIGHT, TOP);
      textSize(8);
      text('CLICK', panX + panW - 18, oy + 9);
      textAlign(LEFT, TOP);
    }
  });

  // Close hint
  fill(120, 100, 70);
  textAlign(CENTER, TOP);
  textSize(8);
  text('[E] Close', width / 2, panY + panH - 16);
  textAlign(LEFT, TOP);
}

// ─── SCREEN SHAKE ─────────────────────────────────────────────────────────
function triggerScreenShake(intensity, duration) {
  shakeTimer = duration;
  shakeX = random(-intensity, intensity);
  shakeY = random(-intensity, intensity);
}

function updateShake(dt) {
  if (shakeTimer > 0) {
    shakeTimer -= dt;
    shakeX = random(-3, 3) * (shakeTimer / 20);
    shakeY = random(-3, 3) * (shakeTimer / 20);
  } else {
    shakeX = 0; shakeY = 0;
  }
}

// ─── ADVENTURE / COMBAT ──────────────────────────────────────────────────

const WAVE_DEFS = [
  [{ type: 'wolf', count: 3 }],
  [{ type: 'wolf', count: 2 }, { type: 'bandit', count: 2 }],
  [{ type: 'harpy', count: 2 }, { type: 'bandit', count: 1 }],
  [{ type: 'secutor', count: 2 }, { type: 'harpy', count: 1 }],
  [{ type: 'minotaur', count: 1 }],
];

function getEnemyStats(type) {
  switch (type) {
    case 'wolf':     return { hp: 30, damage: 8, speed: 2.2, size: 12 };
    case 'bandit':   return { hp: 45, damage: 12, speed: 1.5, size: 14 };
    case 'harpy':    return { hp: 35, damage: 10, speed: 2.8, size: 14 };
    case 'secutor':  return { hp: 70, damage: 15, speed: 1.2, size: 16 };
    case 'minotaur': return { hp: 200, damage: 25, speed: 1.0, size: 24 };
    default:         return { hp: 30, damage: 8, speed: 1.5, size: 12 };
  }
}

function spawnWave(n) {
  let a = state.adventure;
  a.enemies = [];
  let defs = WAVE_DEFS[min(n - 1, WAVE_DEFS.length - 1)];
  let total = defs.reduce((s, d) => s + d.count, 0);
  let idx = 0;
  for (let def of defs) {
    for (let i = 0; i < def.count; i++) {
      let angle = (TWO_PI / total) * idx + random(-0.3, 0.3);
      let stats = getEnemyStats(def.type);
      a.enemies.push({
        type: def.type,
        x: a.isleX + cos(angle) * (a.isleRX - 20),
        y: a.isleY + sin(angle) * (a.isleRY - 20),
        vx: 0, vy: 0,
        hp: stats.hp, maxHp: stats.hp,
        damage: stats.damage, speed: stats.speed, size: stats.size,
        state: 'chase', stateTimer: 0,
        attackCooldown: 0, facing: 1, flashTimer: 0,
        chargeAngle: 0, chargeTimer: 0,
      });
      idx++;
    }
  }
  a.wave = n;
  a.waveState = 'fighting';
  a.waveTimer = 0;
  addFloatingText(width / 2, height * 0.25, 'WAVE ' + n, '#ffcc44');
  triggerScreenShake(4, 10);
}

function enterAdventure() {
  let a = state.adventure;
  let p = state.player;
  a.returnX = WORLD.islandCX;
  a.returnY = WORLD.islandCY;
  a.active = true;
  a.wave = 0;
  a.waveState = 'idle';
  unlockJournal('arena_found');
  a.enemies = [];
  a.loot = [];
  a.killCount = 0;
  state.rowing.active = false;
  p.hp = p.maxHp;
  p.x = a.isleX;
  p.y = a.isleY + 40;
  p.vx = 0; p.vy = 0;
  p.invincTimer = 60;
  // Snap camera to arena so it doesn't float in the sky
  cam.x = p.x; cam.y = p.y;
  camSmooth.x = p.x; camSmooth.y = p.y;
  addFloatingText(width / 2, height * 0.3, 'THE ARENA', '#ffcc44');
  // Start wave 1 after short delay
  a.waveTimer = 90;
  a.waveState = 'intermission';
}

function exitAdventure() {
  let a = state.adventure;
  let p = state.player;
  a.active = false;
  a.enemies = [];
  a.loot = [];
  // Always return to home island center (player was rowing before)
  p.x = WORLD.islandCX;
  p.y = WORLD.islandCY;
  p.vx = 0; p.vy = 0;
  p.attackTimer = 0;
  p.slashPhase = 0;
  p.invincTimer = 0;
  // Heal over time after returning
  if (p.hp < p.maxHp * 0.5) p.hp = floor(p.maxHp * 0.5);
  // Snap camera to home so island doesn't float
  cam.x = p.x; cam.y = p.y;
  camSmooth.x = p.x; camSmooth.y = p.y;
  addFloatingText(width / 2, height * 0.3, 'Returned Home', '#88cc88');
}

function updateAdventure(dt) {
  let a = state.adventure;
  let p = state.player;

  // Decrement player combat timers
  if (p.attackTimer > 0) p.attackTimer -= dt;
  if (p.invincTimer > 0) p.invincTimer -= dt;
  if (p.slashPhase > 0) p.slashPhase -= dt;

  // Wave state machine
  if (a.waveState === 'intermission') {
    a.waveTimer -= dt;
    if (a.waveTimer <= 0) {
      spawnWave(a.wave + 1);
    }
  } else if (a.waveState === 'fighting') {
    // Update enemies
    for (let i = a.enemies.length - 1; i >= 0; i--) {
      let e = a.enemies[i];
      updateEnemyAI(e, dt, p, a);
      if (e.state === 'dead') {
        enemyDeath(e, a);
        a.enemies.splice(i, 1);
      }
    }
    // Check wave clear
    if (a.enemies.length === 0) {
      if (a.wave >= WAVE_DEFS.length) {
        a.waveState = 'victory';
        a.waveTimer = 0;
        if (a.wave > a.bestWave) a.bestWave = a.wave;
        state.gold += 20;
        state.crystals += 2;
        addFloatingText(width / 2, height * 0.25, 'VICTORY!', '#ffdd44');
        triggerScreenShake(6, 15);
      } else {
        a.waveState = 'intermission';
        a.waveTimer = 120; // 2 seconds between waves
        if (a.wave > a.bestWave) a.bestWave = a.wave;
        addFloatingText(width / 2, height * 0.3, 'Wave ' + a.wave + ' Complete!', '#aaddff');
      }
    }
  }

  // Update loot
  for (let i = a.loot.length - 1; i >= 0; i--) {
    let l = a.loot[i];
    l.life -= dt;
    if (l.life <= 0) { a.loot.splice(i, 1); continue; }
    // Auto-collect
    if (dist(p.x, p.y, l.x, l.y) < 30) {
      if (l.type === 'gold') { state.gold += l.amount; addFloatingText(w2sX(l.x), w2sY(l.y) - 15, '+' + l.amount + ' Gold', '#ffcc44'); }
      else if (l.type === 'crystal') { state.crystals += l.amount; addFloatingText(w2sX(l.x), w2sY(l.y) - 15, '+' + l.amount + ' Crystal', '#88ddff'); }
      else if (l.type === 'wood') { state.wood += l.amount; addFloatingText(w2sX(l.x), w2sY(l.y) - 15, '+' + l.amount + ' Wood', '#bb8844'); }
      else if (l.type === 'stone') { state.stone += l.amount; addFloatingText(w2sX(l.x), w2sY(l.y) - 15, '+' + l.amount + ' Stone', '#aaaaaa'); }
      a.loot.splice(i, 1);
    }
  }

  // Player death
  if (p.hp <= 0) {
    p.hp = floor(p.maxHp * 0.5);
    addFloatingText(width / 2, height * 0.35, 'Retreat!', '#ff6644');
    triggerScreenShake(8, 20);
    exitAdventure();
  }
}

function updatePlayerCombat(dt) {
  let p = state.player;
  let spd = p.speed;
  if (p.dashTimer > 0) { spd *= 3.5; p.dashTimer -= dt; }
  if (p.dashCooldown > 0) p.dashCooldown -= dt;

  let dx = 0, dy = 0;
  if (keyIsDown(65) || keyIsDown(LEFT_ARROW))  dx -= 1;
  if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) dx += 1;
  if (keyIsDown(87) || keyIsDown(UP_ARROW))    dy -= 1;
  if (keyIsDown(83) || keyIsDown(DOWN_ARROW))  dy += 1;

  if (dx !== 0 || dy !== 0) {
    let len = sqrt(dx * dx + dy * dy);
    p.vx = (dx / len) * spd;
    p.vy = (dy / len) * spd;
    p.moving = true;
    if (dx > 0) p.facing = 'right';
    else if (dx < 0) p.facing = 'left';
    else if (dy < 0) p.facing = 'up';
    else p.facing = 'down';
  } else {
    p.vx *= 0.7; p.vy *= 0.7;
    p.moving = false;
  }

  let newX = p.x + p.vx * dt;
  let newY = p.y + p.vy * dt;

  // Island boundary (ellipse) — use conquest or arena depending on mode
  let isle = state.conquest.active ? state.conquest : state.adventure;
  let ex = (newX - isle.isleX) / (isle.isleRX - 20);
  let ey = (newY - isle.isleY) / (isle.isleRY - 20);
  if (ex * ex + ey * ey < 1) {
    p.x = newX; p.y = newY;
  } else {
    let ang = atan2(newY - isle.isleY, newX - isle.isleX);
    p.x = isle.isleX + cos(ang) * (isle.isleRX - 22);
    p.y = isle.isleY + sin(ang) * (isle.isleRY - 22);
    p.vx = 0; p.vy = 0;
  }

  // Footstep dust in arena
  if (p.moving && frameCount % 8 === 0) {
    particles.push({
      x: p.x + random(-4, 4), y: p.y + 8,
      vx: random(-0.3, 0.3), vy: random(-0.5, 0),
      life: 15, maxLife: 15, type: 'burst',
      r: 180, g: 160, b: 120, size: random(2, 4), world: true,
    });
  }
}

function getFacingAngle() {
  let f = state.player.facing;
  if (f === 'right') return 0;
  if (f === 'down') return HALF_PI;
  if (f === 'left') return PI;
  return -HALF_PI;
}

function playerAttack() {
  let p = state.player;
  let a = state.adventure;
  if (p.attackTimer > 0) return;
  // Auto-switch to weapon for combat
  if (p.hotbarSlot !== 4) { p.hotbarSlot = 4; addFloatingText(width / 2, height - 110, 'Switched to Weapon', '#aaddaa'); }
  p.attackTimer = p.attackCooldown;
  p.slashPhase = 10;
  triggerPlayerAlert();

  let fAngle = getFacingAngle();
  let arcHalf = PI * 0.3;
  let range = p.attackRange + (p.weapon === 1 ? 12 : 0); // pilum extra range

  for (let e of a.enemies) {
    if (e.state === 'dying' || e.state === 'dead') continue;
    let d = dist(p.x, p.y, e.x, e.y);
    if (d > range + e.size) continue;
    let angle = atan2(e.y - p.y, e.x - p.x);
    let diff = angle - fAngle;
    // Normalize angle diff to [-PI, PI]
    while (diff > PI) diff -= TWO_PI;
    while (diff < -PI) diff += TWO_PI;
    if (abs(diff) > arcHalf) continue;

    // Hit! — weapon damage
    let dmg = [15, 20, 25][p.weapon] || 15;
    // Secutor blocks frontal 50%
    if (e.type === 'secutor' && random() < 0.5) {
      addFloatingText(w2sX(e.x), w2sY(e.y) - 20, 'BLOCKED', '#aaaaaa');
      e.flashTimer = 4;
      continue;
    }
    e.hp -= dmg;
    e.flashTimer = 6;
    e.state = 'stagger';
    e.stateTimer = 8;
    // Knockback
    let kb = 5;
    let kbAngle = atan2(e.y - p.y, e.x - p.x);
    e.x += cos(kbAngle) * kb;
    e.y += sin(kbAngle) * kb;
    addFloatingText(w2sX(e.x), w2sY(e.y) - 20, '-' + dmg, '#ff4444');
    spawnParticles(e.x, e.y, 'combat', 4);
    triggerScreenShake(2, 4);
    if (snd) snd.playSFX('hit');
  }
}

function updateEnemyAI(e, dt, p, a) {
  if (e.flashTimer > 0) e.flashTimer -= dt;
  if (e.attackCooldown > 0) e.attackCooldown -= dt;

  switch (e.state) {
    case 'chase': {
      let dx = p.x - e.x;
      let dy = p.y - e.y;
      let d = sqrt(dx * dx + dy * dy);
      e.facing = dx > 0 ? 1 : -1;

      // Harpy swoops sideways
      let mx = dx, my = dy;
      if (e.type === 'harpy') {
        let perp = sin(frameCount * 0.04 + e.x) * 40;
        mx += -dy / d * perp * 0.03;
        my += dx / d * perp * 0.03;
      }
      // Bandit flanks slightly
      if (e.type === 'bandit') {
        mx += -dy * 0.15;
        my += dx * 0.15;
      }

      let md = sqrt(mx * mx + my * my);
      if (md > 0) {
        e.vx = (mx / md) * e.speed;
        e.vy = (my / md) * e.speed;
      }
      e.x += e.vx * dt;
      e.y += e.vy * dt;

      // Minotaur charge mechanic
      if (e.type === 'minotaur' && d < 120 && e.attackCooldown <= 0) {
        e.state = 'windup';
        e.stateTimer = 45; // 0.75s windup
        e.chargeAngle = atan2(dy, dx);
        e.vx = 0; e.vy = 0;
        break;
      }

      // Attack when close
      if (d < e.size + 20 && e.attackCooldown <= 0) {
        e.state = 'attack';
        e.stateTimer = 15; // windup
      }
      break;
    }
    case 'windup': {
      // Minotaur charge windup - shake in place
      e.x += random(-1, 1);
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        e.state = 'charging';
        e.stateTimer = 30; // charge duration
      }
      break;
    }
    case 'charging': {
      // Minotaur charge!
      e.x += cos(e.chargeAngle) * e.speed * 5 * dt;
      e.y += sin(e.chargeAngle) * e.speed * 5 * dt;
      e.stateTimer -= dt;
      // Damage player on contact
      if (dist(e.x, e.y, p.x, p.y) < e.size + p.size && p.invincTimer <= 0) {
        let armorR = [0, 3, 6, 10][p.armor] || 0;
        let dmg = max(1, floor(e.damage * 1.5) - armorR);
        p.hp -= dmg;
        p.invincTimer = 45;
        addFloatingText(w2sX(p.x), w2sY(p.y) - 25, '-' + dmg, '#ff6644');
        triggerScreenShake(6, 10);
        if (snd) snd.playSFX('player_hurt');
      }
      // Arena boundary
      let bx = (e.x - a.isleX) / (a.isleRX - 10);
      let by = (e.y - a.isleY) / (a.isleRY - 10);
      if (bx * bx + by * by > 1 || e.stateTimer <= 0) {
        e.state = 'chase';
        e.attackCooldown = 120;
      }
      break;
    }
    case 'attack': {
      e.stateTimer -= dt;
      e.vx = 0; e.vy = 0;
      if (e.stateTimer <= 0) {
        // Deal damage
        let d = dist(e.x, e.y, p.x, p.y);
        if (d < e.size + 25 && p.invincTimer <= 0) {
          let armorReduce = [0, 3, 6, 10][p.armor] || 0;
          let eDmg = max(1, e.damage - armorReduce);
          p.hp -= eDmg;
          p.invincTimer = 30;
          addFloatingText(w2sX(p.x), w2sY(p.y) - 25, '-' + eDmg, '#ff6644');
          triggerScreenShake(4, 8);
          spawnParticles(p.x, p.y, 'combat', 3);
          if (snd) snd.playSFX('player_hurt');
        }
        e.state = 'chase';
        e.attackCooldown = e.type === 'wolf' ? 40 : 60;
      }
      break;
    }
    case 'stagger': {
      e.stateTimer -= dt;
      e.vx *= 0.8; e.vy *= 0.8;
      if (e.stateTimer <= 0) {
        if (e.hp <= 0) { e.state = 'dying'; e.stateTimer = 20; }
        else e.state = 'chase';
      }
      break;
    }
    case 'dying': {
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) e.state = 'dead';
      break;
    }
  }

  // Enemy separation
  for (let other of a.enemies) {
    if (other === e) continue;
    let sd = dist(e.x, e.y, other.x, other.y);
    if (sd < e.size + other.size) {
      let sa = atan2(e.y - other.y, e.x - other.x);
      e.x += cos(sa) * 0.8;
      e.y += sin(sa) * 0.8;
    }
  }

  // Clamp to arena
  let bex = (e.x - a.isleX) / (a.isleRX - 10);
  let bey = (e.y - a.isleY) / (a.isleRY - 10);
  if (bex * bex + bey * bey > 1) {
    let ba = atan2(e.y - a.isleY, e.x - a.isleX);
    e.x = a.isleX + cos(ba) * (a.isleRX - 12);
    e.y = a.isleY + sin(ba) * (a.isleRY - 12);
  }
}

function enemyDeath(e, a) {
  a.killCount++;
  spawnParticles(e.x, e.y, 'combat', 8);
  // Drop loot
  let drops = [];
  switch (e.type) {
    case 'wolf': drops.push({ type: 'gold', amount: floor(random(3, 6)) }); break;
    case 'bandit':
      drops.push({ type: 'gold', amount: floor(random(5, 9)) });
      if (random() < 0.2) drops.push({ type: 'wood', amount: 1 });
      break;
    case 'harpy':
      drops.push({ type: 'gold', amount: floor(random(4, 7)) });
      if (random() < 0.3) drops.push({ type: 'crystal', amount: 1 });
      break;
    case 'secutor':
      drops.push({ type: 'gold', amount: floor(random(8, 13)) });
      if (random() < 0.4) drops.push({ type: 'stone', amount: 1 });
      break;
    case 'minotaur':
      drops.push({ type: 'gold', amount: 30 });
      drops.push({ type: 'crystal', amount: 3 });
      spawnBossDefeated(e.x, e.y);
      break;
  }
  for (let d of drops) {
    a.loot.push({
      x: e.x + random(-15, 15), y: e.y + random(-10, 10),
      type: d.type, amount: d.amount,
      bobPhase: random(TWO_PI), life: 600,
    });
  }
}

// ─── DISTANT ISLAND LABELS & ENTITIES ────────────────────────────────────

function drawArenaDistantLabel() {
  if (state.adventure.active) return;
  let a = state.adventure;
  let sx = w2sX(a.isleX);
  let sy = w2sY(a.isleY);
  if (sx < -300 || sx > width + 300 || sy < -300 || sy > height + 300) return;
  push();
  noStroke();
  fill(200, 185, 150, 140 + sin(frameCount * 0.03) * 30);
  textSize(9); textAlign(CENTER); textStyle(ITALIC);
  text('Arena Isle', sx, sy + a.isleRY + 18);
  textStyle(NORMAL);
  if (a.bestWave > 0) {
    fill(180, 160, 120, 120);
    textSize(7);
    text('Best: Wave ' + a.bestWave, sx, sy + a.isleRY + 28);
  }
  pop();
}

function drawConquestDistantLabel() {
  if (state.conquest.active) return;
  let c = state.conquest;
  let sx = w2sX(c.isleX);
  let sy = w2sY(c.isleY);
  if (sx < -400 || sx > width + 400 || sy < -400 || sy > height + 400) return;
  push();
  noStroke();
  fill(170, 160, 130, 140);
  textSize(9); textAlign(CENTER); textStyle(ITALIC);
  let label = c.colonized ? 'Terra Nova (Colony LV.' + c.colonyLevel + ')' :
              c.phase === 'settled' ? 'Terra Nova (Settled)' :
              c.phase === 'unexplored' ? 'Terra Nova' : 'Terra Nova';
  text(label, sx, sy + c.isleRY + 18);
  textStyle(NORMAL);
  if (c.colonized) {
    fill(160, 200, 130, 140);
    textSize(7);
    text(c.colonyWorkers + ' colonists  +' + c.colonyIncome + 'g/day', sx, sy + c.isleRY + 28);
    if (state.imperialBridge.built) {
      fill(200, 180, 100, 120); textSize(6);
      text('BRIDGE CONNECTED', sx, sy + c.isleRY + 38);
    }
  } else if (c.buildings.length > 0) {
    fill(160, 150, 115, 110);
    textSize(7);
    text(c.buildings.length + ' buildings, ' + c.workers.length + ' workers', sx, sy + c.isleRY + 28);
  }
  pop();
}

function drawConquestDistantEntities() {
  // Draw persistent soldiers + workers on Terra Nova when viewing from afar
  if (state.conquest.active) return;
  let c = state.conquest;
  let items = [];
  for (let s of c.soldiers) {
    if (s.hp > 0) items.push({ y: s.y, draw: () => drawConquestSoldier(s) });
  }
  for (let w of c.workers) {
    items.push({ y: w.y, draw: () => drawConquestWorker(w) });
  }
  items.sort((a, b) => a.y - b.y);
  for (let it of items) it.draw();
}

// ─── ARENA DRAWING ───────────────────────────────────────────────────────

function drawArenaIsleDistant() {
  // Draw the arena isle silhouette in the ocean (when on home island)
  if (state.adventure.active) return;
  let a = state.adventure;
  let sx = w2sX(a.isleX);
  let sy = w2sY(a.isleY);
  if (sx < -200 || sx > width + 200 || sy < -200 || sy > height + 200) return;
  push();
  noStroke();
  let pulse = sin(frameCount * 0.02) * 0.1 + 1;
  // Mysterious glow on water — pixel
  let fsx = floor(sx), fsy = floor(sy);
  let rw = floor(a.isleRX * 0.35), rh = floor(a.isleRY * 0.17);
  fill(180, 120, 60, 15 * pulse);
  rect(fsx - rw, fsy + 2, rw * 2, rh);
  // Water reflection
  fill(30, 80, 100, 35);
  rect(fsx - floor(a.isleRX * 0.27), fsy + 8, floor(a.isleRX * 0.55), floor(a.isleRY * 0.1));
  // Rocky base
  fill(90, 80, 65);
  rect(fsx - floor(a.isleRX * 0.25), fsy, floor(a.isleRX * 0.5), floor(a.isleRY * 0.08));
  // Grass/land
  fill(70, 100, 55);
  rect(fsx - floor(a.isleRX * 0.23), fsy - 2, floor(a.isleRX * 0.46), floor(a.isleRY * 0.09));
  // Beach fringe
  fill(190, 175, 130, 180);
  rect(fsx - floor(a.isleRX * 0.24), fsy + 1, floor(a.isleRX * 0.48), floor(a.isleRY * 0.04));
  fill(70, 100, 55);
  rect(fsx - floor(a.isleRX * 0.21), fsy - 3, floor(a.isleRX * 0.42), floor(a.isleRY * 0.07));
  // Tiny colosseum silhouette — pixel rects
  fill(150, 140, 120);
  rect(fsx - 16, fsy - 10, 32, 6);
  // Columns
  for (let i = -2; i <= 2; i++) {
    let ch = i === 0 ? 10 : (abs(i) === 1 ? 8 : 5);
    rect(fsx + i * 7 - 1, fsy - 4 - ch, 2, ch);
    rect(fsx + i * 7 - 2, fsy - 5 - ch, 4, 1);
  }
  // Tiny torch glow — pixel
  let fl = floor(sin(frameCount * 0.12) * 1);
  fill(255, 160, 40, 60 + fl * 20);
  rect(fsx - 17, fsy - 9, 3, 3);
  rect(fsx + 15, fsy - 9, 3, 3);
  // Label with parchment style
  fill(200, 185, 150, 140 + sin(frameCount * 0.03) * 30);
  textSize(8);
  textAlign(CENTER);
  textStyle(ITALIC);
  text('Arena Isle', sx, sy + 22);
  textStyle(NORMAL);
  // Best wave marker
  if (a.bestWave > 0) {
    fill(180, 160, 120, 120);
    textSize(7);
    text('Best: Wave ' + a.bestWave, sx, sy + 31);
  }
  pop();
}

function drawArena() {
  let a = state.adventure;
  push();

  let ix = w2sX(a.isleX);
  let iy = w2sY(a.isleY);
  noStroke();

  // Deep water shadow beneath island
  fill(20, 60, 80, 50);
  ellipse(ix + 5, iy + 8, a.isleRX * 2.3, a.isleRY * 2.3);
  // Shallow water ring with foam
  fill(60, 150, 170, 70);
  ellipse(ix, iy, a.isleRX * 2.25, a.isleRY * 2.25);
  fill(80, 170, 190, 50);
  let foamPulse = sin(frameCount * 0.025) * 3;
  ellipse(ix, iy, a.isleRX * 2.2 + foamPulse, a.isleRY * 2.2 + foamPulse);

  // Rocky cliff base
  fill(110, 95, 75);
  ellipse(ix, iy + 4, a.isleRX * 2.05, a.isleRY * 2.05);
  // Beach sand
  fill(215, 200, 155);
  ellipse(ix, iy, a.isleRX * 2, a.isleRY * 2);

  // Outer spectator seating (tiered stone)
  fill(155, 145, 125);
  ellipse(ix, iy, a.isleRX * 1.85, a.isleRY * 1.85);
  fill(145, 135, 115);
  ellipse(ix, iy, a.isleRX * 1.78, a.isleRY * 1.78);
  // Seating rows (subtle lines)
  noFill();
  stroke(130, 120, 100, 80);
  strokeWeight(0.5);
  ellipse(ix, iy, a.isleRX * 1.82, a.isleRY * 1.82);
  noStroke();

  // Arena sand floor
  fill(200, 185, 145);
  ellipse(ix, iy, a.isleRX * 1.7, a.isleRY * 1.7);
  // Inner arena — compacted sand
  fill(185, 170, 130);
  ellipse(ix, iy, a.isleRX * 1.5, a.isleRY * 1.5);

  // Sand texture dots
  fill(175, 160, 120, 60);
  for (let i = 0; i < 30; i++) {
    let ang = (i / 30) * TWO_PI + i * 1.7;
    let r2 = (i % 3 + 1) * a.isleRX * 0.18;
    ellipse(ix + cos(ang) * r2, iy + sin(ang) * r2 * 0.68, 3, 2);
  }

  // Arena circle marking (inscribed)
  noFill();
  stroke(150, 135, 100, 120);
  strokeWeight(2);
  ellipse(ix, iy, a.isleRX * 1.2, a.isleRY * 1.2);
  // Decorative inner ring
  strokeWeight(1);
  stroke(150, 135, 100, 60);
  ellipse(ix, iy, a.isleRX * 0.6, a.isleRY * 0.6);
  // Cross markings
  stroke(140, 125, 90, 80);
  strokeWeight(1);
  line(ix - a.isleRX * 0.55, iy, ix + a.isleRX * 0.55, iy);
  line(ix, iy - a.isleRY * 0.55, ix, iy + a.isleRY * 0.55);
  noStroke();

  // Scuff marks / old battle marks on sand
  fill(160, 140, 100, 30);
  ellipse(ix - 30, iy + 15, 18, 8);
  ellipse(ix + 45, iy - 20, 14, 6);
  ellipse(ix - 10, iy - 35, 12, 10);

  // Stone wall ring with arched openings
  for (let i = 0; i < 24; i++) {
    let ang = (i / 24) * TWO_PI;
    let wx = ix + cos(ang) * a.isleRX * 0.92;
    let wy = iy + sin(ang) * a.isleRY * 0.92;
    // Skip openings at cardinal points (gates)
    let isGate = false;
    for (let ca of [0, HALF_PI, PI, PI + HALF_PI]) {
      if (abs(ang - ca) < 0.15 || abs(ang - ca - TWO_PI) < 0.15) isGate = true;
    }
    if (isGate) continue;
    // Stone block with shadow
    fill(105, 95, 80);
    rect(wx - 5, wy - 8, 11, 13, 1);
    fill(130, 120, 100);
    rect(wx - 5, wy - 9, 10, 12, 1);
  }

  // Gate arches at cardinal points
  let gateAngles = [0, HALF_PI, PI, PI + HALF_PI];
  for (let ga of gateAngles) {
    let gx = ix + cos(ga) * a.isleRX * 0.92;
    let gy = iy + sin(ga) * a.isleRY * 0.92;
    // Arch pillars
    fill(150, 140, 120);
    rect(gx - 8, gy - 14, 4, 18, 1);
    rect(gx + 4, gy - 14, 4, 18, 1);
    // Arch top
    fill(160, 150, 130);
    arc(gx, gy - 14, 16, 10, PI, TWO_PI);
    // Keystone
    fill(180, 170, 140);
    rect(gx - 2, gy - 18, 4, 4, 1);
  }

  // Columns — 8 around the arena (alternating intact/ruined)
  for (let ci = 0; ci < 8; ci++) {
    let ca = (ci / 8) * TWO_PI + PI / 8;
    let cx = ix + cos(ca) * a.isleRX * 0.84;
    let cy = iy + sin(ca) * a.isleRY * 0.84;
    let intact = ci % 3 !== 2; // every 3rd is ruined
    // Column shadow
    fill(100, 90, 70, 40);
    ellipse(cx + 2, cy + 2, 10, 6);
    if (intact) {
      // Full column
      fill(185, 175, 155);
      rect(cx - 5, cy, 10, 5, 1); // base
      fill(200, 192, 175);
      rect(cx - 3, cy - 28, 6, 30); // shaft
      // Fluting (vertical lines)
      stroke(180, 172, 155, 80);
      strokeWeight(0.5);
      line(cx - 1, cy - 26, cx - 1, cy);
      line(cx + 1, cy - 26, cx + 1, cy);
      noStroke();
      // Ionic capital (scrolls)
      fill(215, 205, 185);
      rect(cx - 6, cy - 31, 12, 3, 1);
      ellipse(cx - 5, cy - 30, 4, 4);
      ellipse(cx + 5, cy - 30, 4, 4);
    } else {
      // Ruined stump
      fill(160, 150, 130);
      rect(cx - 5, cy, 10, 5, 1);
      fill(170, 160, 140);
      rect(cx - 3, cy - 12, 6, 14);
      // Rubble
      fill(145, 135, 115);
      ellipse(cx + 7, cy + 2, 5, 4);
      ellipse(cx - 6, cy + 3, 4, 3);
      ellipse(cx + 3, cy + 5, 3, 3);
    }
  }

  // Torches with animated flames
  let torchAngles = [PI / 4, 3 * PI / 4, 5 * PI / 4, 7 * PI / 4];
  for (let ti = 0; ti < torchAngles.length; ti++) {
    let ta = torchAngles[ti];
    let tx = ix + cos(ta) * a.isleRX * 0.78;
    let ty = iy + sin(ta) * a.isleRY * 0.78;
    // Torch bracket (on wall)
    fill(80, 60, 35);
    rect(tx - 1, ty - 4, 3, 8);
    // Torch bowl
    fill(90, 65, 30);
    ellipse(tx, ty - 6, 8, 4);
    // Flame layers
    let fl1 = sin(frameCount * 0.18 + ti * 2) * 2;
    let fl2 = cos(frameCount * 0.22 + ti * 3) * 1.5;
    fill(255, 200, 60, 220);
    ellipse(tx + fl2 * 0.3, ty - 12 + fl1, 7, 11);
    fill(255, 140, 30, 180);
    ellipse(tx + fl2 * 0.5, ty - 14 + fl1, 5, 8);
    fill(255, 80, 20, 120);
    ellipse(tx, ty - 15 + fl1, 3, 5);
    // Warm glow on ground
    fill(255, 160, 50, 18);
    ellipse(tx, ty, 40, 25);
    // Spark particles
    if (frameCount % 12 === ti * 3) {
      fill(255, 200, 80, 150);
      ellipse(tx + random(-3, 3), ty - 18 + random(-3, 0), 2, 2);
    }
  }

  // Roman banners between columns (red/gold fabric)
  for (let bi = 0; bi < 4; bi++) {
    let ba = (bi / 4) * TWO_PI + PI / 4 + 0.3;
    let bx = ix + cos(ba) * a.isleRX * 0.88;
    let by = iy + sin(ba) * a.isleRY * 0.88;
    let wave = sin(frameCount * 0.04 + bi) * 2;
    // Pole
    fill(120, 90, 50);
    rect(bx - 1, by - 24, 2, 20);
    // Banner fabric
    fill(160, 35, 25, 200);
    beginShape();
    vertex(bx + 1, by - 22);
    vertex(bx + 12 + wave, by - 20);
    vertex(bx + 10 + wave, by - 10);
    vertex(bx + 1, by - 12);
    endShape(CLOSE);
    // Gold trim
    stroke(200, 170, 80, 150);
    strokeWeight(0.5);
    line(bx + 1, by - 22, bx + 12 + wave, by - 20);
    line(bx + 1, by - 12, bx + 10 + wave, by - 10);
    noStroke();
  }

  // Rowboat at south shore (retreat point)
  let boatX = ix;
  let boatY = iy + a.isleRY * 0.96;
  // Boat shadow
  fill(0, 0, 0, 25);
  ellipse(boatX + 2, boatY + 3, 32, 10);
  // Hull
  fill(110, 72, 35);
  ellipse(boatX, boatY, 30, 14);
  // Deck
  fill(140, 100, 55);
  ellipse(boatX, boatY - 1, 26, 10);
  // Planking lines
  stroke(120, 85, 45, 100);
  strokeWeight(0.5);
  line(boatX - 10, boatY, boatX + 10, boatY);
  line(boatX - 8, boatY - 2, boatX + 8, boatY - 2);
  noStroke();
  // Mast
  fill(100, 70, 35);
  rect(boatX - 1, boatY - 18, 2, 16);
  // Pennant
  let pw = sin(frameCount * 0.06) * 2;
  fill(180, 40, 30, 180);
  triangle(boatX + 1, boatY - 18, boatX + 10 + pw, boatY - 16, boatX + 1, boatY - 13);

  pop();
}

function drawOneEnemy(e) {
  let sx = w2sX(e.x);
  let sy = w2sY(e.y);
  let dying = e.state === 'dying';
  let sc = dying ? (e.stateTimer / 20) : 1;
  let alpha = dying ? map(e.stateTimer, 0, 20, 0, 255) : 255;

  push();
  translate(sx, sy);
  scale(sc);

  let f = e.flashTimer > 0;
  let fc = f ? 255 : 0; // flash component
  // Breathing animation
  let breathe = sin(frameCount * 0.06 + e.x) * 0.5;
  // Walk bob
  let walkBob = (e.state === 'chase') ? sin(frameCount * 0.15 + e.y) * 1.5 : 0;

  switch (e.type) {
    case 'wolf': {
      let wb = floor(walkBob);
      let ef = e.facing;
      // Pixel shadow
      fill(0, 0, 0, 30);
      rect(-10, 5, 22, 2);
      // Pixel hind legs
      fill(f ? 255 : 115, f ? 255 : 80, f ? 255 : 45);
      let lp = floor(sin(frameCount * 0.15) * 2);
      rect(-ef * 6 - 2, 2 + lp, 3, 6);
      rect(-ef * 2 - 2, 2 - lp, 3, 6);
      // Pixel body
      fill(f ? 255 : 130, f ? 255 : 95, f ? 255 : 55);
      rect(-10, -6 + wb, 22, 12);
      // Fur stripe
      fill(f ? 255 : 120, f ? 255 : 85, f ? 255 : 45);
      rect(-6, -4 + wb, 12, 4);
      // Pixel head
      fill(f ? 255 : 145, f ? 255 : 105, f ? 255 : 65);
      rect(ef * 6, -8 + wb, 10 * ef, 10);
      // Pixel snout
      fill(f ? 255 : 155, f ? 255 : 115, f ? 255 : 75);
      rect(ef * 14, -4 + wb, 4 * ef, 4);
      // Pixel ears
      fill(f ? 255 : 100, f ? 255 : 70, f ? 255 : 35);
      rect(ef * 8, -12 + wb, 3, 4);
      rect(ef * 12, -11 + wb, 3, 3);
      // Inner ear
      fill(f ? 255 : 160, f ? 255 : 100, f ? 255 : 80);
      rect(ef * 9, -11 + wb, 1, 2);
      // Pixel red eyes
      fill(240, 40, 30);
      rect(ef * 12, -6 + wb, 2, 2);
      fill(255, 100, 80);
      rect(ef * 12, -6 + wb, 1, 1);
      // Teeth when attacking
      if (e.state === 'attack') {
        fill(240, 235, 220);
        rect(ef * 16, -2 + wb, 2, 1);
        rect(ef * 14, 0 + wb, 2, 1);
      }
      // Pixel nose
      fill(40, 30, 20);
      rect(ef * 17, -4 + wb, 2, 2);
      // Pixel tail
      fill(f ? 255 : 120, f ? 255 : 85, f ? 255 : 45);
      let tw = floor(sin(frameCount * 0.12 + e.x) * 3);
      rect(-ef * 12, -2, 3, 2);
      rect(-ef * 14, -4 + tw, 2, 2);
      rect(-ef * 16, -6 + tw, 2, 2);
      break;
    }
    case 'bandit': {
      let wb = floor(walkBob);
      // Pixel shadow
      fill(0, 0, 0, 30);
      rect(-8, 7, 16, 2);
      // Pixel legs
      fill(f ? 255 : 80, f ? 255 : 60, f ? 255 : 40);
      let bleg = floor(sin(frameCount * 0.12) * 2);
      rect(-4, 6 + bleg, 3, 7);
      rect(1, 6 - bleg, 3, 7);
      // Pixel sandals
      fill(f ? 255 : 120, f ? 255 : 90, f ? 255 : 50);
      rect(-5, 12 + bleg, 4, 2);
      rect(0, 12 - bleg, 4, 2);
      // Pixel body (ragged tunic)
      fill(f ? 255 : 105, f ? 255 : 80, f ? 255 : 55);
      rect(-8, -6 + wb, 16, 14);
      // Pixel belt
      fill(f ? 255 : 70, f ? 255 : 50, f ? 255 : 30);
      rect(-7, 3 + wb, 14, 2);
      fill(f ? 255 : 160, f ? 255 : 140, f ? 255 : 60);
      rect(-1, 3 + wb, 2, 2); // buckle
      // Pixel arm
      fill(f ? 255 : 195, f ? 255 : 165, f ? 255 : 125);
      rect(e.facing * 8, -2 + wb, 3, 6);
      // Pixel club
      fill(f ? 255 : 75, f ? 255 : 50, f ? 255 : 25);
      rect(e.facing * 9, -16 + wb, 2, 14);
      // Club head
      fill(f ? 255 : 65, f ? 255 : 42, f ? 255 : 20);
      rect(e.facing * 8, -18 + wb, 4, 4);
      // Studs
      fill(f ? 255 : 160, f ? 255 : 155, f ? 255 : 150);
      rect(e.facing * 8, -17 + wb, 1, 1);
      rect(e.facing * 10, -16 + wb, 1, 1);
      // Pixel head
      fill(f ? 255 : 210, f ? 255 : 180, f ? 255 : 140);
      rect(-5, -14 + wb, 10, 8);
      // Pixel scruffy hair
      fill(f ? 255 : 70, f ? 255 : 50, f ? 255 : 30);
      rect(-6, -16 + wb, 12, 4);
      // Pixel headband
      fill(f ? 255 : 165, f ? 255 : 35, f ? 255 : 25);
      rect(-6, -14 + wb, 12, 2);
      // Headband knot
      fill(f ? 255 : 140, f ? 255 : 25, f ? 255 : 20);
      rect(5, -15 + wb, 2, 3);
      // Pixel eyes
      fill(40);
      rect(-4, -11 + wb, 2, 2);
      rect(2, -11 + wb, 2, 2);
      // Pixel angry brows
      fill(50);
      rect(-5, -13 + wb, 3, 1);
      rect(3, -13 + wb, 3, 1);
      // Pixel scar
      fill(180, 140, 110, 150);
      rect(3, -9 + wb, 1, 3);
      break;
    }
    case 'harpy': {
      let wf = floor(sin(frameCount * 0.14) * 8);
      let hv = floor(sin(frameCount * 0.07 + e.x) * 3);
      // Pixel shadow
      fill(0, 0, 0, 25);
      rect(-8, 16, 16, 2);
      // Pixel talons
      noStroke();
      fill(f ? 255 : 180, f ? 255 : 150, f ? 255 : 60);
      rect(-4, 8 + hv, 2, 4);
      rect(-1, 8 + hv, 2, 4);
      rect(2, 8 + hv, 2, 4);
      rect(4, 8 + hv, 2, 4);
      // Pixel wings
      fill(f ? 255 : 85, f ? 255 : 125, f ? 255 : 75);
      // Left wing
      rect(-20, -8 + wf + hv, 14, 4);
      rect(-16, -4 + wf + hv, 10, 4);
      // Right wing
      rect(6, -8 + wf + hv, 14, 4);
      rect(6, -4 + wf + hv, 10, 4);
      // Inner wing
      fill(f ? 255 : 110, f ? 255 : 155, f ? 255 : 95);
      rect(-12, -4 + wf + hv, 6, 6);
      rect(6, -4 + wf + hv, 6, 6);
      // Pixel body
      fill(f ? 255 : 125, f ? 255 : 165, f ? 255 : 105);
      rect(-6, -8 + hv, 12, 16);
      // Chest pattern
      fill(f ? 255 : 140, f ? 255 : 180, f ? 255 : 120, 150);
      rect(-4, -4 + hv, 8, 10);
      // Pixel head
      fill(f ? 255 : 205, f ? 255 : 185, f ? 255 : 145);
      rect(-5, -16 + hv, 10, 8);
      // Pixel crest/hair
      fill(f ? 255 : 100, f ? 255 : 60, f ? 255 : 120);
      rect(-3, -20 + hv, 6, 4);
      rect(-1, -22 + hv, 2, 2);
      // Pixel beak
      fill(f ? 255 : 210, f ? 255 : 170, f ? 255 : 40);
      rect(e.facing * 4, -13 + hv, 4 * e.facing, 3);
      // Pixel eyes (purple)
      fill(200, 50, 200);
      rect(-4, -14 + hv, 2, 2);
      rect(2, -14 + hv, 2, 2);
      fill(255, 150, 255);
      rect(-4, -14 + hv, 1, 1);
      rect(2, -14 + hv, 1, 1);
      break;
    }
    case 'secutor': {
      let wb = floor(walkBob);
      // Pixel shadow
      fill(0, 0, 0, 35);
      rect(-10, 9, 22, 2);
      // Pixel legs
      fill(f ? 255 : 130, f ? 255 : 120, f ? 255 : 100);
      let sleg = floor(sin(frameCount * 0.1) * 1.5);
      rect(-5, 6 + sleg + wb, 4, 8);
      rect(2, 6 - sleg + wb, 4, 8);
      // Pixel boots
      fill(f ? 255 : 100, f ? 255 : 80, f ? 255 : 55);
      rect(-6, 13 + sleg + wb, 5, 3);
      rect(1, 13 - sleg + wb, 5, 3);
      // Pixel body (armor)
      fill(f ? 255 : 145, f ? 255 : 135, f ? 255 : 115);
      rect(-10, -8 + wb, 20, 16);
      // Pixel chest plate
      fill(f ? 255 : 175, f ? 255 : 165, f ? 255 : 145);
      rect(-7, -6 + wb, 14, 12);
      // Cross detail
      fill(f ? 255 : 155, f ? 255 : 145, f ? 255 : 125);
      rect(-6, -1 + wb, 12, 1);
      rect(-1, -5 + wb, 1, 10);
      // Pixel rivets
      fill(f ? 255 : 190, f ? 255 : 180, f ? 255 : 160);
      rect(-5, -5 + wb, 1, 1);
      rect(4, -5 + wb, 1, 1);
      rect(-5, 4 + wb, 1, 1);
      rect(4, 4 + wb, 1, 1);
      // Pixel shield
      fill(f ? 255 : 130, f ? 255 : 120, f ? 255 : 90);
      rect(-e.facing * 14, -8 + wb, 8, 16);
      fill(f ? 255 : 155, f ? 255 : 145, f ? 255 : 115);
      rect(-e.facing * 13, -5 + wb, 6, 10);
      fill(f ? 255 : 170, f ? 255 : 160, f ? 255 : 130);
      rect(-e.facing * 12, -2 + wb, 4, 4);
      // Pixel sword arm
      fill(f ? 255 : 195, f ? 255 : 165, f ? 255 : 125);
      rect(e.facing * 9, -3 + wb, 3, 6);
      // Pixel gladius
      fill(f ? 255 : 200, f ? 255 : 200, f ? 255 : 210);
      rect(e.facing * 11, -16 + wb, 2, 14);
      fill(f ? 255 : 170, f ? 255 : 150, f ? 255 : 80);
      rect(e.facing * 10, -2 + wb, 4, 2); // guard
      // Pixel helmet
      fill(f ? 255 : 165, f ? 255 : 155, f ? 255 : 135);
      rect(-7, -20 + wb, 14, 12);
      // Pixel face guard
      fill(f ? 255 : 145, f ? 255 : 135, f ? 255 : 115);
      rect(-5, -16 + wb, 10, 6);
      // Pixel red plume
      fill(f ? 255 : 185, f ? 255 : 35, f ? 255 : 25);
      rect(-4, -26 + wb, 8, 6);
      rect(-2, -28 + wb, 4, 2);
      // Pixel eye slits
      fill(30);
      rect(-4, -15 + wb, 3, 2);
      rect(1, -15 + wb, 3, 2);
      // Eye glow
      fill(200, 180, 140, 80);
      rect(-3, -15 + wb, 2, 1);
      rect(2, -15 + wb, 2, 1);
      break;
    }
    case 'minotaur': {
      let wb = floor(walkBob);
      // Pixel shadow
      fill(0, 0, 0, 45);
      rect(-18, 16, 36, 3);
      // Pixel legs
      fill(f ? 255 : 95, f ? 255 : 60, f ? 255 : 35);
      let mleg = floor(sin(frameCount * 0.08) * 2);
      rect(-10, 10 + mleg + wb, 7, 12);
      rect(3, 10 - mleg + wb, 7, 12);
      // Pixel hooves
      fill(f ? 255 : 60, f ? 255 : 40, f ? 255 : 20);
      rect(-11, 20 + mleg + wb, 9, 3);
      rect(2, 20 - mleg + wb, 9, 3);
      // Pixel body
      fill(f ? 255 : 110, f ? 255 : 70, f ? 255 : 45);
      rect(-16, -16 + wb, 32, 28);
      // Chest detail
      fill(f ? 255 : 125, f ? 255 : 82, f ? 255 : 52);
      rect(-10, -12 + wb, 8, 14);
      rect(2, -12 + wb, 8, 14);
      // Pixel arms
      fill(f ? 255 : 115, f ? 255 : 75, f ? 255 : 48);
      rect(-20, -10 + wb, 4, 14);
      rect(16, -10 + wb, 4, 14);
      // Pixel fists
      fill(f ? 255 : 100, f ? 255 : 65, f ? 255 : 40);
      rect(-21, 4 + wb, 6, 6);
      rect(15, 4 + wb, 6, 6);
      // Pixel head
      fill(f ? 255 : 100, f ? 255 : 65, f ? 255 : 40);
      rect(-10, -30 + wb, 20, 16);
      // Brow ridge
      fill(f ? 255 : 85, f ? 255 : 52, f ? 255 : 30);
      rect(-10, -32 + wb, 20, 4);
      // Pixel horns
      fill(f ? 255 : 230, f ? 255 : 220, f ? 255 : 190);
      rect(-14, -38 + wb, 4, 8);
      rect(-16, -42 + wb, 4, 6);
      rect(10, -38 + wb, 4, 8);
      rect(12, -42 + wb, 4, 6);
      // Pixel snout
      fill(f ? 255 : 85, f ? 255 : 55, f ? 255 : 32);
      rect(-6, -22 + wb, 12, 6);
      // Pixel nostrils
      fill(35, 20, 10);
      rect(-4, -20 + wb, 2, 2);
      rect(2, -20 + wb, 2, 2);
      // Pixel nose ring
      fill(f ? 255 : 200, f ? 255 : 170, f ? 255 : 60);
      rect(-2, -18 + wb, 4, 2);
      rect(-3, -18 + wb, 1, 1);
      rect(2, -18 + wb, 1, 1);
      // Pixel eyes (red)
      fill(255, 50, 20);
      rect(-8, -28 + wb, 4, 3);
      rect(4, -28 + wb, 4, 3);
      fill(180, 20, 10);
      rect(-7, -28 + wb, 2, 2);
      rect(5, -28 + wb, 2, 2);
      // Snort when winding up
      if (e.state === 'windup') {
        fill(200, 180, 160, 100);
        for (let s = 0; s < 3; s++) {
          rect(-6 - s * 3, -19 + wb, 2, 2);
          rect(6 + s * 3, -19 + wb, 2, 2);
        }
      }
      // Charging aura
      if (e.state === 'charging') {
        fill(255, 40, 20, 25);
        rect(-20, -16, 40, 2);
        rect(-1, -32, 2, 40);
      }
      break;
    }
    case 'bear': {
      let wb = floor(walkBob);
      let ef = e.facing;
      // Pixel shadow
      fill(0, 0, 0, 35);
      rect(-12, 7, 24, 2);
      // Pixel body
      fill(f ? 255 : 90, f ? 255 : 60, f ? 255 : 30);
      rect(-12, -8 + wb, 24, 16);
      // Fur highlight
      fill(f ? 255 : 110, f ? 255 : 75, f ? 255 : 40);
      rect(-8, -6 + wb, 14, 8);
      // Pixel head
      fill(f ? 255 : 100, f ? 255 : 68, f ? 255 : 35);
      rect(ef * 8, -12 + wb, 12 * ef, 10);
      // Pixel snout
      fill(f ? 255 : 120, f ? 255 : 90, f ? 255 : 60);
      rect(ef * 16, -6 + wb, 4 * ef, 4);
      // Pixel nose
      fill(30, 20, 15);
      rect(ef * 19, -6 + wb, 2, 2);
      // Pixel ears
      fill(f ? 255 : 80, f ? 255 : 50, f ? 255 : 25);
      rect(ef * 10, -14 + wb, 3, 3);
      rect(ef * 15, -14 + wb, 3, 3);
      // Pixel eyes
      fill(200, 50, 30);
      rect(ef * 15, -10 + wb, 2, 2);
      // Pixel paws
      fill(f ? 255 : 80, f ? 255 : 52, f ? 255 : 28);
      let pb = floor(sin(frameCount * 0.12) * 2);
      rect(-8, 6 + pb, 5, 4);
      rect(3, 6 - pb, 5, 4);
      break;
    }
    case 'dire_wolf': {
      let wb = floor(walkBob);
      let ef = e.facing;
      // Pixel shadow
      fill(0, 0, 0, 30);
      rect(-10, 4, 20, 2);
      // Pixel body (dark)
      fill(f ? 255 : 60, f ? 255 : 55, f ? 255 : 70);
      rect(-10, -5 + wb, 20, 10);
      // Dark stripe
      fill(f ? 255 : 45, f ? 255 : 40, f ? 255 : 55);
      rect(-6, -3 + wb, 12, 4);
      // Pixel head
      fill(f ? 255 : 70, f ? 255 : 65, f ? 255 : 80);
      rect(ef * 5, -8 + wb, 10 * ef, 8);
      // Pixel snout
      fill(f ? 255 : 80, f ? 255 : 75, f ? 255 : 90);
      rect(ef * 13, -4 + wb, 4 * ef, 4);
      // Pixel ears
      fill(f ? 255 : 50, f ? 255 : 45, f ? 255 : 60);
      rect(ef * 7, -12 + wb, 3, 4);
      rect(ef * 11, -11 + wb, 3, 3);
      // Pixel purple eyes
      fill(180, 60, 255);
      rect(ef * 11, -6 + wb, 2, 2);
      fill(220, 120, 255);
      rect(ef * 11, -6 + wb, 1, 1);
      // Pixel speed streaks
      if (e.state === 'chase') {
        fill(100, 80, 160, 40);
        for (let s = 1; s <= 3; s++) {
          rect(-ef * (10 + s * 6), -2 + wb, 4, 1);
        }
      }
      break;
    }
    case 'guardian': {
      let wb = floor(walkBob);
      // Pixel shadow
      fill(0, 0, 0, 40);
      rect(-16, 10, 32, 3);
      // Pixel body (stone golem)
      fill(f ? 255 : 100, f ? 255 : 95, f ? 255 : 110);
      rect(-14, -12 + wb, 28, 24);
      // Stone texture
      fill(f ? 255 : 85, f ? 255 : 80, f ? 255 : 95);
      rect(-10, -8 + wb, 10, 10);
      rect(4, -4 + wb, 8, 8);
      // Pixel head
      fill(f ? 255 : 120, f ? 255 : 115, f ? 255 : 130);
      rect(-7, -24 + wb, 14, 12);
      // Pixel visor
      fill(f ? 255 : 50, f ? 255 : 45, f ? 255 : 60);
      rect(-5, -22 + wb, 10, 3);
      // Pixel glowing eyes
      fill(0, 255, 136);
      rect(-4, -21 + wb, 2, 2);
      rect(2, -21 + wb, 2, 2);
      // Pixel arms
      fill(f ? 255 : 90, f ? 255 : 85, f ? 255 : 100);
      let armOff = e.state === 'attack' ? floor(sin(e.stateTimer * 0.2) * 4) : 0;
      rect(-18, -4 + wb + armOff, 4, 14);
      rect(14, -4 + wb - armOff, 4, 14);
      // Pixel runes (glowing)
      let runeGlow = floor(sin(frameCount * 0.04) * 30);
      fill(0, 200 + runeGlow, 100 + runeGlow, 150);
      rect(-1, -7 + wb, 2, 2);
      rect(-8, 0 + wb, 2, 2);
      rect(6, 0 + wb, 2, 2);
      // Pixel aura — cross
      fill(0, 255, 136, 12);
      rect(-18, -1, 36, 2);
      rect(-1, -18, 2, 36);
      break;
    }
  }

  // HP bar above enemy (polished)
  if (e.hp < e.maxHp && e.state !== 'dying') {
    let barW = max(e.size * 2.2, 24);
    let barH = 3;
    let barY = -e.size - (e.type === 'minotaur' || e.type === 'guardian' ? 50 : 16);
    // Bar background
    fill(30, 10, 10, 180);
    rect(-barW / 2 - 1, barY - 1, barW + 2, barH + 2, 2);
    // Empty bar
    fill(70, 25, 20);
    rect(-barW / 2, barY, barW, barH, 1);
    // Filled bar (color shifts red→yellow at low HP)
    let hpFrac = e.hp / e.maxHp;
    let r = hpFrac > 0.4 ? 200 : 240;
    let g = hpFrac > 0.4 ? 45 : 180;
    fill(r, g, 25);
    rect(-barW / 2, barY, barW * hpFrac, barH, 1);
    // Name label for boss
    if (e.type === 'minotaur' || e.type === 'guardian') {
      fill(255, 220, 180, 200);
      textSize(8);
      textAlign(CENTER);
      text('MINOTAURUS', 0, barY - 5);
    }
  }

  pop();
}

function drawSlashArc() {
  let p = state.player;
  if (p.slashPhase <= 0) return;
  let sx = floor(w2sX(p.x));
  let sy = floor(w2sY(p.y));
  let fAngle = getFacingAngle();
  let alpha = map(p.slashPhase, 0, 10, 0, 200);
  let r = p.attackRange + 5;

  push();
  translate(sx, sy);
  noStroke();
  // Pixel slash — scatter rects along arc
  fill(255, 230, 140, alpha);
  for (let a = -0.3; a <= 0.3; a += 0.08) {
    let ax = floor(cos(fAngle + a * PI) * r);
    let ay = floor(sin(fAngle + a * PI) * r);
    rect(ax, ay, 3, 3);
  }
  // Inner bright pixels
  fill(255, 255, 200, alpha * 0.7);
  for (let a = -0.25; a <= 0.25; a += 0.1) {
    let ax = floor(cos(fAngle + a * PI) * r * 0.8);
    let ay = floor(sin(fAngle + a * PI) * r * 0.8);
    rect(ax, ay, 2, 2);
  }
  pop();
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

function drawAdventureEntities() {
  let a = state.adventure;
  let p = state.player;
  // Y-sort all: enemies + player + loot
  let items = [];
  for (let e of a.enemies) {
    items.push({ y: e.y, draw: () => drawOneEnemy(e) });
  }
  items.push({ y: p.y, draw: () => {
    // Draw player (blinking during invincibility)
    if (p.invincTimer > 0 && frameCount % 4 < 2) return;
    drawPlayer();
  }});
  items.sort((a, b) => a.y - b.y);
  for (let it of items) it.draw();
  // Loot on ground (below everything but still visible)
  drawLoot(a);
  // Slash arc on top
  drawSlashArc();
}

function drawAdventureHUD() {
  let p = state.player;
  let a = state.adventure;
  push();

  // HP Bar — top center
  let barW = 200, barH = 16;
  let barX = width / 2 - barW / 2;
  let barY = 15;
  // Background
  fill(40, 15, 15, 200);
  rect(barX - 2, barY - 2, barW + 4, barH + 4, 4);
  // Empty
  fill(80, 25, 20);
  rect(barX, barY, barW, barH, 3);
  // Filled
  let hpFrac = max(0, p.hp / p.maxHp);
  let hpCol = hpFrac > 0.5 ? color(180, 50, 30) : (hpFrac > 0.25 ? color(200, 120, 20) : color(220, 40, 40));
  fill(hpCol);
  rect(barX, barY, barW * hpFrac, barH, 3);
  // Text
  fill(255);
  textSize(10);
  textAlign(CENTER, CENTER);
  text('HP ' + max(0, floor(p.hp)) + ' / ' + p.maxHp, width / 2, barY + barH / 2);

  // Wave indicator
  let waveText = '';
  if (a.waveState === 'fighting') waveText = 'WAVE ' + a.wave + ' / ' + WAVE_DEFS.length;
  else if (a.waveState === 'intermission') waveText = 'Next wave in ' + ceil(a.waveTimer / 60) + '...';
  else if (a.waveState === 'victory') waveText = 'VICTORY! Press E to return';
  else if (a.waveState === 'idle') waveText = 'Prepare...';
  fill(255, 230, 180);
  textSize(12);
  text(waveText, width / 2, barY + barH + 16);

  // Kill count
  fill(200, 180, 140, 180);
  textSize(9);
  textAlign(LEFT, TOP);
  text('Kills: ' + a.killCount, 15, 15);
  text('Gold: ' + state.gold, 15, 28);

  // Attack cooldown indicator
  if (p.attackTimer > 0) {
    let cdFrac = p.attackTimer / p.attackCooldown;
    fill(60, 60, 60, 150);
    ellipse(width / 2, barY + barH + 42, 20, 20);
    fill(255, 200, 80, 200);
    arc(width / 2, barY + barH + 42, 18, 18, -HALF_PI, -HALF_PI + TWO_PI * (1 - cdFrac));
  }

  // Retreat hint
  if (a.waveState !== 'fighting') {
    fill(180, 180, 160, 150);
    textSize(9);
    textAlign(CENTER);
    text('[E] Board boat to retreat', width / 2, height - 25);
  }

  // Controls hint
  fill(160, 150, 130, 120);
  textSize(8);
  textAlign(RIGHT, BOTTOM);
  text('WASD move | SPACE attack | SHIFT dash', width - 10, height - 10);

  pop();
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
const HOTBAR_ITEMS = [
  { name: 'Sickle', icon: 'sickle', desc: 'Harvest crops' },
  { name: 'Axe',    icon: 'axe',    desc: 'Chop trees' },
  { name: 'Pick',   icon: 'pick',   desc: 'Mine stone' },
  { name: 'Rod',    icon: 'rod',    desc: 'Fish' },
  { name: 'Weapon', icon: 'weapon', desc: 'Fight enemies' },
];

function usePotion() {
  let p = state.player;
  if (p.potions <= 0 || p.hp >= p.maxHp) return;
  p.potions--;
  p.hp = min(p.maxHp, p.hp + POTION_HEAL);
  addFloatingText(w2sX(p.x), w2sY(p.y) - 25, '+' + POTION_HEAL + ' HP', '#44dd44');
  spawnParticles(p.x, p.y, 'harvest', 5);
}

function buyWeapon(tier) {
  let w = WEAPONS[tier];
  if (!w || state.gold < w.cost || state.player.weapon >= tier) return false;
  state.gold -= w.cost;
  state.player.weapon = tier;
  addFloatingText(width / 2, height * 0.3, w.name + ' acquired!', '#ffcc44');
  return true;
}

function buyArmor(tier) {
  let a = ARMORS[tier];
  if (!a || state.gold < a.cost || state.player.armor >= tier) return false;
  state.gold -= a.cost;
  state.player.armor = tier;
  addFloatingText(width / 2, height * 0.3, a.name + ' Armor!', '#aaccff');
  return true;
}

function buyPotion() {
  if (state.gold < POTION_COST) return false;
  state.gold -= POTION_COST;
  state.player.potions++;
  return true;
}

// ─── EXPEDITION UPGRADES ─────────────────────────────────────────────────
const EXPEDITION_UPGRADES = {
  workerSpeed:    { name: 'Swift Workers',    tiers: [{ gold: 50, wood: 20 },  { gold: 150, ironOre: 8 },  { gold: 300, ironOre: 15, rareHide: 5 }],  desc: 'Workers chop/build 25% faster' },
  workerCap:      { name: 'Worker Barracks',  tiers: [{ gold: 60, wood: 25 },  { gold: 180, ironOre: 12 }, { gold: 350, rareHide: 8, ancientRelic: 1 }], desc: '+1 max worker per tier' },
  dangerResist:   { name: 'Scout Network',    tiers: [{ gold: 40, wood: 15 },  { gold: 120, rareHide: 5 }, { gold: 250, ancientRelic: 2 }],             desc: 'Danger escalates slower' },
  lootBonus:      { name: 'Plunder Expertise',tiers: [{ gold: 60, wood: 20 },  { gold: 200, ironOre: 10 }, { gold: 400, titanBone: 2 }],                 desc: '+15% loot per tier' },
  soldierHP:      { name: 'Veteran Training', tiers: [{ gold: 50, ironOre: 5 },{ gold: 160, rareHide: 6 }, { gold: 320, ancientRelic: 3, titanBone: 1 }],desc: 'Soldiers start tougher' },
  expeditionTier: { name: 'Cartographer',     tiers: [{ gold: 100, ancientRelic: 2 }, { gold: 250, titanBone: 3, ancientRelic: 3 }],                      desc: 'Harder but richer expeditions' },
};

function drawUpgradeShopUI() {
  if (!state.upgradeShopOpen) return;
  push();
  let panW = 360, panH = 320;
  let px = width / 2 - panW / 2, py = height / 2 - panH / 2;

  // Parchment background
  fill(40, 35, 25, 230);
  stroke(120, 100, 60);
  strokeWeight(2);
  rect(px, py, panW, panH, 8);
  noStroke();

  // Title
  fill(220, 200, 150); textSize(14); textAlign(CENTER);
  text('EXPEDITION FORGE', px + panW / 2, py + 20);
  fill(160, 140, 100); textSize(8);
  text('Upgrade your expeditions at the temple', px + panW / 2, py + 34);

  // Resource bar
  let ry = py + 44;
  fill(30, 25, 18, 180);
  rect(px + 8, ry, panW - 16, 18, 3);
  fill(200, 180, 130); textSize(7); textAlign(LEFT);
  let resText = 'Gold:' + state.gold + '  Wood:' + state.wood + '  Iron:' + state.ironOre +
    '  Hide:' + state.rareHide + '  Relic:' + state.ancientRelic + '  Bone:' + state.titanBone;
  text(resText, px + 12, ry + 12);

  // Upgrades list
  let keys = Object.keys(EXPEDITION_UPGRADES);
  let sy = py + 70;
  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    let upg = EXPEDITION_UPGRADES[key];
    let tier = state.expeditionUpgrades[key] || 0;
    let maxTier = upg.tiers.length;
    let atMax = (key === 'expeditionTier') ? tier >= maxTier : tier >= maxTier;

    let rowY = sy + i * 36;
    // Row bg
    fill(i % 2 === 0 ? 45 : 40, i % 2 === 0 ? 38 : 33, 28, 150);
    rect(px + 8, rowY, panW - 16, 32, 3);

    // Name + desc
    fill(atMax ? 100 : 220, atMax ? 180 : 200, atMax ? 60 : 150);
    textSize(10); textAlign(LEFT);
    text(upg.name + (atMax ? ' (MAX)' : ' [Tier ' + tier + '/' + maxTier + ']'), px + 14, rowY + 12);
    fill(150, 140, 110); textSize(7);
    text(upg.desc, px + 14, rowY + 24);

    // Cost + buy button
    if (!atMax) {
      let cost = upg.tiers[tier];
      let resNames = {gold:'gold', wood:'wood', ironOre:'iron', rareHide:'hide', ancientRelic:'relic', titanBone:'bone'};
      let costStr = Object.entries(cost).map(([k, v]) => v + ' ' + (resNames[k]||k)).join(', ');
      let canAfford = canAffordUpgrade(cost);

      fill(canAfford ? 80 : 50, canAfford ? 160 : 50, canAfford ? 80 : 50, 200);
      let btnX = px + panW - 85, btnY = rowY + 4;
      rect(btnX, btnY, 72, 24, 4);
      fill(canAfford ? 220 : 120, canAfford ? 240 : 120, canAfford ? 220 : 120);
      textSize(7); textAlign(CENTER, CENTER);
      text(costStr, btnX + 36, btnY + 12);
    }
  }

  // Close hint
  fill(140, 130, 100, 120); textSize(8); textAlign(CENTER);
  text('[E] Close', px + panW / 2, py + panH - 10);
  pop();
}

function canAffordUpgrade(cost) {
  for (let [key, val] of Object.entries(cost)) {
    if (key === 'gold' && state.gold < val) return false;
    if (key === 'wood' && state.wood < val) return false;
    if (key === 'ironOre' && state.ironOre < val) return false;
    if (key === 'rareHide' && state.rareHide < val) return false;
    if (key === 'ancientRelic' && state.ancientRelic < val) return false;
    if (key === 'titanBone' && state.titanBone < val) return false;
  }
  return true;
}

function buyExpeditionUpgrade(key) {
  let upg = EXPEDITION_UPGRADES[key];
  let tier = state.expeditionUpgrades[key] || 0;
  if (tier >= upg.tiers.length) return false;
  let cost = upg.tiers[tier];
  if (!canAffordUpgrade(cost)) return false;

  // Deduct costs
  for (let [k, v] of Object.entries(cost)) {
    if (k === 'gold') state.gold -= v;
    if (k === 'wood') state.wood -= v;
    if (k === 'ironOre') state.ironOre -= v;
    if (k === 'rareHide') state.rareHide -= v;
    if (k === 'ancientRelic') state.ancientRelic -= v;
    if (k === 'titanBone') state.titanBone -= v;
  }
  state.expeditionUpgrades[key] = tier + 1;
  addFloatingText(width / 2, height * 0.35, upg.name + ' upgraded!', '#88ccff');
  triggerScreenShake(2, 5);
  return true;
}

// ─── BOUNTY BOARD ───────────────────────────────────────────────────────
const BOUNTY_TEMPLATES = [
  { type: 'kills',     desc: 'Slay {n} wolves',        target: 3,  reward: { gold: 30 },               enemy: 'wolf' },
  { type: 'kills',     desc: 'Slay {n} boars',         target: 2,  reward: { gold: 40, ironOre: 2 },   enemy: 'boar' },
  { type: 'kills',     desc: 'Slay {n} bears',         target: 2,  reward: { gold: 50, rareHide: 2 },  enemy: 'bear' },
  { type: 'kills',     desc: 'Slay {n} dire wolves',   target: 3,  reward: { gold: 45, ironOre: 3 },   enemy: 'dire_wolf' },
  { type: 'danger',    desc: 'Reach danger level {n}',  target: 4,  reward: { gold: 60 } },
  { type: 'danger',    desc: 'Reach danger level {n}',  target: 7,  reward: { gold: 100, ancientRelic: 1 } },
  { type: 'survive',   desc: 'Survive {n} seconds',     target: 45, reward: { gold: 50, ironOre: 3 } },
  { type: 'survive',   desc: 'Survive {n} seconds',     target: 90, reward: { gold: 80, rareHide: 3 } },
  { type: 'loot',      desc: 'Collect {n} iron ore',    target: 3,  reward: { gold: 60 } },
  { type: 'loot',      desc: 'Collect {n} rare hides',  target: 2,  reward: { gold: 70 } },
  { type: 'chop',      desc: 'Chop {n} trees',          target: 8,  reward: { gold: 25, wood: 50 } },
  { type: 'build',     desc: 'Build {n} structures',    target: 2,  reward: { gold: 40, ironOre: 2 } },
  { type: 'nokill',    desc: 'Return alive (no death)',  target: 1,  reward: { gold: 35 } },
];

function generateBounties() {
  let bb = state.bountyBoard;
  if (bb.day === state.day) return; // already generated today
  bb.day = state.day;
  bb.bounties = [];
  // Pick 3 unique bounties
  let pool = [...BOUNTY_TEMPLATES];
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    let idx = floor(random(pool.length));
    let tmpl = pool.splice(idx, 1)[0];
    bb.bounties.push({
      id: i,
      desc: tmpl.desc.replace('{n}', tmpl.target),
      type: tmpl.type,
      target: tmpl.target,
      enemy: tmpl.enemy || null,
      progress: 0,
      reward: { ...tmpl.reward },
      completed: false,
    });
  }
}

function updateBountyProgress(type, value, enemyType) {
  let bb = state.bountyBoard;
  for (let b of bb.bounties) {
    if (b.completed) continue;
    if (b.type === type) {
      if (type === 'kills' && b.enemy && b.enemy !== enemyType) continue;
      if (type === 'danger' || type === 'survive') {
        b.progress = max(b.progress, value); // track max reached
      } else {
        b.progress += value;
      }
      if (b.progress >= b.target && !b.completed) {
        b.completed = true;
        // Grant reward
        for (let [k, v] of Object.entries(b.reward)) {
          if (k === 'gold') state.gold += v;
          if (k === 'wood') state.wood += v;
          if (k === 'ironOre') state.ironOre += v;
          if (k === 'rareHide') state.rareHide += v;
          if (k === 'ancientRelic') state.ancientRelic += v;
          if (k === 'titanBone') state.titanBone += v;
        }
        let rewardStr = Object.entries(b.reward).map(([k, v]) => '+' + v + ' ' + k).join('  ');
        addFloatingText(width / 2, height * 0.15, 'BOUNTY COMPLETE!', '#ffdd44');
        addFloatingText(width / 2, height * 0.2, rewardStr, '#aaddff');
        triggerScreenShake(4, 10);
      }
    }
  }
}

function drawBountyBoard() {
  let bb = state.bountyBoard;
  if (!bb.bounties || bb.bounties.length === 0) return;
  // Show bounties in conquest HUD — top right
  let bx = width - 180, by = 12;
  push();
  fill(30, 25, 18, 200);
  stroke(120, 100, 60, 150);
  strokeWeight(1);
  rect(bx, by, 170, 16 + bb.bounties.length * 22, 5);
  noStroke();
  fill(200, 180, 120); textSize(8); textAlign(LEFT);
  text('BOUNTIES', bx + 8, by + 11);
  for (let i = 0; i < bb.bounties.length; i++) {
    let b = bb.bounties[i];
    let ry = by + 18 + i * 22;
    fill(b.completed ? 60 : 35, b.completed ? 50 : 30, 25, 150);
    rect(bx + 4, ry, 162, 18, 3);
    fill(b.completed ? color(100, 180, 80) : color(180, 160, 120));
    textSize(7); textAlign(LEFT);
    text(b.desc, bx + 8, ry + 10);
    // Progress
    fill(b.completed ? color(100, 200, 80) : color(140, 120, 80));
    textAlign(RIGHT);
    let progText = b.completed ? 'DONE' : b.progress + '/' + b.target;
    text(progText, bx + 162, ry + 10);
    textAlign(LEFT);
  }
  pop();
}

// ─── EXPEDITION MODIFIERS ────────────────────────────────────────────────
const EXPEDITION_MODIFIERS = {
  normal:     { name: 'Standard',    desc: 'No modifiers',           color: '#bbbbbb', enemyMult: 1.0, lootMult: 1.0, spawnMult: 1.0, speedMult: 1.0 },
  blood_moon: { name: 'Blood Moon',  desc: '2x enemies, 2x loot',   color: '#ff4444', enemyMult: 1.5, lootMult: 2.0, spawnMult: 0.5, speedMult: 1.2 },
  foggy:      { name: 'Fog of Dread',desc: 'Thick fog, rare spawns', color: '#8899aa', enemyMult: 0.7, lootMult: 1.3, spawnMult: 1.5, speedMult: 0.8 },
  sacred:     { name: 'Sacred Ground',desc:'No enemies, 3x trees',   color: '#88ddff', enemyMult: 0.0, lootMult: 0.3, spawnMult: 99,  speedMult: 1.0 },
  golden:     { name: 'Golden Age',  desc: '+50% gold, fast danger', color: '#ffcc44', enemyMult: 1.2, lootMult: 1.0, spawnMult: 0.8, speedMult: 1.0, goldMult: 1.5, dangerMult: 1.5 },
};

function getModifier() {
  let key = state.expeditionModifier || 'normal';
  return EXPEDITION_MODIFIERS[key] || EXPEDITION_MODIFIERS.normal;
}

function drawModifierSelectUI() {
  if (!state.expeditionModifierSelect) return;
  push();
  // Dim backdrop
  fill(0, 0, 0, 160);
  rect(0, 0, width, height);

  let panW = 340, panH = 230;
  let px = width / 2 - panW / 2, py = height / 2 - panH / 2;

  // Panel bg
  fill(35, 30, 22, 240);
  stroke(140, 110, 60);
  strokeWeight(2);
  rect(px, py, panW, panH, 8);
  noStroke();

  // Title
  fill(220, 200, 150); textSize(13); textAlign(CENTER);
  text('CHOOSE EXPEDITION TYPE', px + panW / 2, py + 20);
  fill(160, 140, 100); textSize(7);
  text('Select a modifier for this expedition', px + panW / 2, py + 34);

  // Modifier options
  let mods = Object.keys(EXPEDITION_MODIFIERS);
  let sy = py + 48;
  for (let i = 0; i < mods.length; i++) {
    let key = mods[i];
    let mod = EXPEDITION_MODIFIERS[key];
    let ry = sy + i * 34;
    let selected = (state.expeditionModifier || 'normal') === key;

    // Row bg
    fill(selected ? 55 : 40, selected ? 48 : 35, selected ? 35 : 25, 180);
    if (selected) { stroke(200, 180, 100, 120); strokeWeight(1); }
    rect(px + 8, ry, panW - 16, 30, 4);
    noStroke();

    // Color indicator
    fill(mod.color);
    ellipse(px + 20, ry + 15, 8, 8);

    // Name + desc
    fill(selected ? 255 : 200, selected ? 240 : 190, selected ? 200 : 150);
    textSize(10); textAlign(LEFT);
    text(mod.name, px + 30, ry + 11);
    fill(150, 140, 110); textSize(7);
    text(mod.desc, px + 30, ry + 23);

    // Key hint
    fill(180, 160, 100, 150);
    textSize(9); textAlign(RIGHT);
    text('[' + (i + 1) + ']', px + panW - 16, ry + 15);
    textAlign(LEFT);
  }

  // Supply cost preview
  let en = state.conquest.expeditionNum;
  let costG = 15 + en * 5 + state.conquest.soldiers.length * 5;
  let costW = 10 + en * 3;
  let costM = min(3, 1 + floor(en / 3));
  let canGo = state.gold >= costG && state.wood >= costW && state.meals >= costM;
  fill(canGo ? 140 : 180, canGo ? 130 : 60, canGo ? 100 : 50, 160); textSize(8); textAlign(CENTER);
  text('Cost: ' + costG + 'g  ' + costW + ' wood  ' + costM + ' meals', px + panW / 2, py + panH - 24);
  // Confirm hint
  fill(180, 160, 100, 180); textSize(9);
  text('Click to select, double-click to embark  |  [ESC] Cancel', px + panW / 2, py + panH - 10);
  pop();
}

// ─── FOG OF WAR ─────────────────────────────────────────────────────────
const FOG_GRID = 20; // grid cell size in world units
const FOG_REVEAL_R = 5; // reveal radius in cells (~100px)

function initFogOfWar() {
  let c = state.conquest;
  let cols = ceil(c.isleRX * 2 / FOG_GRID) + 2;
  let rows = ceil(c.isleRY * 2 / FOG_GRID) + 2;
  state.fogOfWar = new Array(cols * rows).fill(0);
  state._fogCols = cols;
  state._fogRows = rows;
  state._fogOX = c.isleX - c.isleRX - FOG_GRID;
  state._fogOY = c.isleY - c.isleRY - FOG_GRID;
}

function revealFog(wx, wy) {
  if (!state._fogCols) return;
  let gx = floor((wx - state._fogOX) / FOG_GRID);
  let gy = floor((wy - state._fogOY) / FOG_GRID);
  let r = FOG_REVEAL_R;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      let cx = gx + dx, cy = gy + dy;
      if (cx < 0 || cy < 0 || cx >= state._fogCols || cy >= state._fogRows) continue;
      state.fogOfWar[cy * state._fogCols + cx] = 1;
    }
  }
}

function drawFogOfWar() {
  if (!state._fogCols || !state.fogOfWar.length) return;
  let c = state.conquest;
  // Only draw fog if foggy modifier or always show partial
  let fogAlpha = state.expeditionModifier === 'foggy' ? 220 : 140;
  push();
  noStroke();
  for (let gy = 0; gy < state._fogRows; gy++) {
    for (let gx = 0; gx < state._fogCols; gx++) {
      if (state.fogOfWar[gy * state._fogCols + gx] === 1) continue;
      let wx = state._fogOX + gx * FOG_GRID;
      let wy = state._fogOY + gy * FOG_GRID;
      // Skip if outside island ellipse
      let ex = (wx + FOG_GRID / 2 - c.isleX) / c.isleRX;
      let ey = (wy + FOG_GRID / 2 - c.isleY) / c.isleRY;
      if (ex * ex + ey * ey > 1.1) continue;
      let sx = w2sX(wx), sy = w2sY(wy);
      fill(15, 20, 15, fogAlpha);
      rect(sx, sy, FOG_GRID + 1, FOG_GRID + 1);
    }
  }
  pop();
}

function drawModifierAtmosphere() {
  let mod = state.expeditionModifier;
  if (!mod || mod === 'normal') return;
  let c = state.conquest;
  let ix = w2sX(c.isleX), iy = w2sY(c.isleY);
  push();
  noStroke();
  if (mod === 'blood_moon') {
    // Red tint over everything
    fill(120, 20, 10, 25 + sin(frameCount * 0.03) * 10);
    ellipse(ix, iy, c.isleRX * 2.2, c.isleRY * 2.2);
    // Blood moon in sky
    fill(180, 40, 20, 60);
    ellipse(width * 0.8, 40, 30, 30);
    fill(200, 60, 30, 80);
    ellipse(width * 0.8, 40, 24, 24);
  } else if (mod === 'foggy') {
    // Thick fog patches
    for (let i = 0; i < 6; i++) {
      let fx = ix + sin(frameCount * 0.005 + i * 2) * c.isleRX * 0.6;
      let fy = iy + cos(frameCount * 0.004 + i * 1.7) * c.isleRY * 0.4;
      fill(160, 180, 170, 30 + sin(frameCount * 0.02 + i) * 12);
      ellipse(fx, fy, 200 + sin(i) * 60, 100 + cos(i) * 30);
    }
  } else if (mod === 'sacred') {
    // Gentle blue-white glow
    fill(100, 160, 220, 12 + sin(frameCount * 0.02) * 6);
    ellipse(ix, iy, c.isleRX * 1.8, c.isleRY * 1.8);
    // Sparkles
    if (frameCount % 20 === 0) {
      let sx = c.isleX + random(-c.isleRX * 0.7, c.isleRX * 0.7);
      let sy = c.isleY + random(-c.isleRY * 0.7, c.isleRY * 0.7);
      spawnParticles(sx, sy, 'collect', 1);
    }
  } else if (mod === 'golden') {
    // Golden shimmer
    fill(200, 170, 50, 10 + sin(frameCount * 0.04) * 8);
    ellipse(ix, iy, c.isleRX * 2, c.isleRY * 2);
  }
  pop();
}

// ─── CONQUEST ISLAND ─────────────────────────────────────────────────────

const CONQUEST_BUILDINGS = {
  campfire:   { name: 'Campfire',    cost: 4,  key: '1', desc: 'Light + morale',   soldiers: 0, workerType: null },
  palisade:   { name: 'Palisade',    cost: 6,  key: '2', desc: 'Wall defense',     soldiers: 0, workerType: null },
  hut:        { name: 'Shelter',     cost: 8,  key: '3', desc: '+1 Chopper',       soldiers: 1, workerType: 'chopper' },
  watchtower: { name: 'Watchtower',  cost: 10, key: '4', desc: 'Spot enemies',     soldiers: 0, workerType: null },
  barracks:   { name: 'Barracks',    cost: 14, key: '5', desc: '+2 Soldiers +1 Builder', soldiers: 2, workerType: 'builder' },
};

function isOnConquestIsland(wx, wy) {
  let c = state.conquest;
  let ex = (wx - c.isleX) / (c.isleRX - 25);
  let ey = (wy - c.isleY) / (c.isleRY - 25);
  return ex * ex + ey * ey < 1;
}

function initConquestIsland() {
  let c = state.conquest;
  // Migrate: if trees exist but are centered on old island position, regenerate
  if (c.trees.length > 5) {
    let avgX = 0, avgY = 0;
    for (let t of c.trees) { avgX += t.x; avgY += t.y; }
    avgX /= c.trees.length; avgY /= c.trees.length;
    let d = dist(avgX, avgY, c.isleX, c.isleY);
    if (d > c.isleRX * 0.3) {
      c.trees = [];
      c.buildings = [];
      c.soldiers = [];
      c.workers = [];
    }
  }
  if (c.trees.length > 0) return;
  // Dense forest — more trees for bigger island
  for (let i = 0; i < 110; i++) {
    let angle = random(TWO_PI);
    let r = random(0.15, 0.88);
    let tx = c.isleX + cos(angle) * c.isleRX * r;
    let ty = c.isleY + sin(angle) * c.isleRY * r;
    // Leave a clearing at south where player lands
    let landDist = dist(tx, ty, c.isleX, c.isleY + c.isleRY * 0.5);
    if (landDist < 70) continue;
    c.trees.push({ x: tx, y: ty, hp: 3, maxHp: 3, alive: true, size: random(0.8, 1.2) });
  }
}

function enterConquest() {
  startScreenTransition(null);
  let c = state.conquest;
  let p = state.player;
  c.active = true;
  // Park ship at south shore dock
  let dockX = c.isleX;
  let dockY = c.isleY + c.isleRY * 0.92;
  state.rowing.active = false;
  state.rowing.docked = true;
  state.rowing.x = dockX;
  state.rowing.y = dockY + 15;
  c.shipX = dockX;
  c.shipY = dockY + 15;
  // Player steps off onto island
  p.hp = p.maxHp;
  p.x = dockX;
  p.y = dockY - 20;
  p.vx = 0; p.vy = 0;
  p.invincTimer = 90;
  c.buildMode = false;
  c.chopTarget = null;
  c.chopTimer = 0;
  // Move centurion to conquest island
  state.centurion.x = p.x + 20;
  state.centurion.y = p.y + 10;
  state.centurion.hp = state.centurion.maxHp;
  // Snap camera
  cam.x = p.x; cam.y = p.y;
  camSmooth.x = p.x; camSmooth.y = p.y;
  initConquestIsland();

  // Start with 2 soldiers on first visit
  let soldierHP = 60 + state.expeditionUpgrades.soldierHP * 20;
  if (c.soldiers.length === 0 && c.phase === 'unexplored') {
    for (let i = 0; i < 2; i++) {
      let ang = (i / 2) * PI - HALF_PI;
      c.soldiers.push({
        x: p.x + cos(ang) * 30, y: p.y + sin(ang) * 30,
        vx: 0, vy: 0, hp: soldierHP, maxHp: soldierHP,
        state: 'follow', target: null,
        attackTimer: 0, facing: 1, flashTimer: 0,
      });
    }
    c.phase = 'landing';
    c.phaseTimer = 0;
  }

  // Expedition reset — clean slate for enemies
  c.expeditionTimer = 0;
  c.dangerLevel = 0;
  c.lootBag = [];
  c.rareSpawnTimer = 0;
  c.enemies = [];
  c.spawnTimer = 600; // grace period
  // Purge dead/corrupted soldiers and workers
  c.soldiers = c.soldiers.filter(s => s.hp > 0);
  c.workers = c.workers.filter(w => w && w.type);
  // Purge completed blueprints
  c.blueprintQueue = (c.blueprintQueue || []).filter(b => b.progress < b.maxProgress);

  // Regrow 60% of cleared trees between expeditions
  if (c.expeditionNum > 0) {
    let dead = c.trees.filter(t => !t.alive);
    let regrow = floor(dead.length * 0.6);
    for (let i = 0; i < regrow && i < dead.length; i++) {
      dead[i].alive = true;
      dead[i].hp = dead[i].maxHp;
    }
  }

  c.expeditionNum++;
  if (typeof advanceMainQuestCounter === 'function') advanceMainQuestCounter('mq_expeditions', 1);
  // Init fog of war
  initFogOfWar();
  // Reveal around landing zone
  revealFog(p.x, p.y);
  // Generate daily bounties if not already
  generateBounties();
  // Reset bounty progress for new expedition
  for (let b of state.bountyBoard.bounties) {
    if (!b.completed) b.progress = 0;
  }
  addFloatingText(width / 2, height * 0.2, 'EXPEDITION #' + c.expeditionNum, '#ddcc88');
  addFloatingText(width / 2, height * 0.28, getPhaseObjective(c.phase), '#bbaa77');
  triggerScreenShake(3, 8);
}

function exitConquest(isDeath) {
  let c = state.conquest;
  let p = state.player;
  c.active = false;
  c.buildMode = false;
  // Reset combat tracking before clearing enemies to prevent XP exploit
  _combatLastEnemyCount = 0;
  // Keep soldiers/buildings/trees/workers — persistent state
  c.enemies = [];
  // Board the ship at Terra Nova's dock — position outside collision ellipse
  let dockX = c.isleX;
  let dockY = c.isleY + c.isleRY * 1.05;
  p.x = dockX;
  p.y = dockY;
  p.vx = 0; p.vy = 0;
  state.rowing.active = true;
  state.rowing.docked = false;
  state.rowing.x = dockX;
  state.rowing.y = dockY;
  state.rowing.speed = 0;
  state.rowing.angle = HALF_PI; // facing south (away from island)
  // Return centurion to ship
  state.centurion.x = p.x + 20;
  state.centurion.y = p.y + 10;
  if (p.hp < p.maxHp * 0.5) p.hp = floor(p.maxHp * 0.5);
  // Snap camera
  cam.x = p.x; cam.y = p.y;
  camSmooth.x = p.x; camSmooth.y = p.y;

  // Bounty: survived without dying
  if (!isDeath) updateBountyProgress('nokill', 1);

  // Advance narrative quest counter for expeditions
  if (typeof advanceMainQuestCounter === 'function') {
    advanceMainQuestCounter('mq_expeditions', 1);
  }

  // Transfer expedition loot
  let lootMult = isDeath ? 0.5 : 1.0;
  let lootBonusMult = 1 + state.expeditionUpgrades.lootBonus * 0.15;
  let modGoldMult = getModifier().goldMult || 1.0;
  let goldEarned = floor((10 + c.dangerLevel * 5 + c.expeditionNum * 2) * lootMult * modGoldMult);
  state.gold += goldEarned;

  for (let loot of c.lootBag) {
    let qty = max(1, floor(loot.qty * lootMult * lootBonusMult));
    switch (loot.type) {
      case 'wood': state.wood += qty; break;
      case 'iron_ore': state.ironOre += qty; break;
      case 'rare_hide': state.rareHide += qty; break;
      case 'ancient_relic': state.ancientRelic += qty; break;
      case 'titan_bone': state.titanBone += qty; break;
    }
  }

  // Log expedition
  state.expeditionLog.unshift({
    num: c.expeditionNum, danger: c.dangerLevel,
    kills: c.totalKills, gold: goldEarned, died: !!isDeath,
    loot: c.lootBag.length,
  });
  if (state.expeditionLog.length > 5) state.expeditionLog.pop();

  if (isDeath) {
    addFloatingText(width / 2, height * 0.25, 'RETREAT! (50% loot lost)', '#ff6644');
  } else {
    addFloatingText(width / 2, height * 0.25, 'Expedition Complete!', '#88cc88');
    spawnLootCascade(c.lootBag, goldEarned);
  }
  addFloatingText(width / 2, height * 0.33, '+' + goldEarned + ' Gold', '#ffcc44');
  // Itemized loot summary
  let lootSummary = {};
  for (let loot of c.lootBag) {
    let name = {wood:'Wood', iron_ore:'Iron', rare_hide:'Hide', ancient_relic:'Relic', titan_bone:'Bone'}[loot.type] || loot.type;
    lootSummary[name] = (lootSummary[name] || 0) + max(1, floor(loot.qty * lootMult * lootBonusMult));
  }
  let yOff = 0.38;
  for (let [name, qty] of Object.entries(lootSummary)) {
    let col = {Wood:'#bb8844', Iron:'#aabbcc', Hide:'#cc9966', Relic:'#ff88ff', Bone:'#ffdd88'}[name] || '#cccccc';
    addFloatingText(width / 2, height * yOff, '+' + qty + ' ' + name, col);
    yOff += 0.04;
  }
  c.totalKills = 0;
  c.lootBag = [];
}

function getPhaseObjective(phase) {
  switch (phase) {
    case 'landing': return 'Chop trees to gather wood [CLICK trees]';
    case 'clearing': return 'Build defenses [B] — wolves prowl the forest';
    case 'building': return 'Place a Barracks to begin the defense';
    case 'defending': return 'Survive the beast waves!';
    case 'settled': return 'Terra Nova is yours! Colonize at home pyramid [C]';
    case 'colonized': return 'Your colony thrives!';
    default: return '';
  }
}

function advanceConquestPhase(c) {
  let oldPhase = c.phase;
  let livingTrees = c.trees.filter(t => t.alive).length;
  let totalTrees = c.trees.length;
  let numBuildings = c.buildings.length;
  let hasBarracks = c.buildings.some(b => b.type === 'barracks');

  switch (c.phase) {
    case 'landing':
      // Advance when 8+ trees chopped or campfire placed
      if ((totalTrees - livingTrees >= 8) || c.buildings.some(b => b.type === 'campfire')) {
        c.phase = 'clearing';
      }
      break;
    case 'clearing':
      // Advance when 3+ buildings placed
      if (numBuildings >= 3) {
        c.phase = 'building';
      }
      break;
    case 'building':
      // Advance when barracks placed
      if (hasBarracks) {
        c.phase = 'defending';
        c.waveCount = 0;
        c.waveTimer = 180; // 3 second grace before first wave
      }
      break;
    case 'defending':
      // Advance when all 3 waves cleared
      if (c.waveCount >= 3 && c.enemies.length === 0) {
        c.phase = 'settled';
        unlockJournal('conquest_settled');
        addFloatingText(width / 2, height * 0.2, 'TERRA NOVA SETTLED', '#ffdd66');
        addFloatingText(width / 2, height * 0.3, '+50 Gold  +20 Max HP', '#aaddff');
        state.gold += 50;
        state.player.maxHp += 20;
        state.player.hp = state.player.maxHp;
        triggerScreenShake(8, 20);
      }
      break;
  }

  if (c.phase !== oldPhase) {
    addFloatingText(width / 2, height * 0.22, getPhaseObjective(c.phase), '#ccbb88');
    triggerScreenShake(4, 10);
  }
}

// ─── COLONY SYSTEM — After settling Terra Nova ────────────────────────────

function canColonize() {
  return state.conquest.phase === 'settled' && !state.conquest.colonized && state.islandLevel >= 10;
}

function getColonizeCost() {
  return { gold: 200, wood: 80, stone: 50, ironOre: 20, ancientRelic: 5 };
}

function colonizeTerraNovaAction() {
  if (!canColonize()) return;
  let cost = getColonizeCost();
  if (state.gold < cost.gold || state.wood < cost.wood || state.stone < cost.stone ||
      state.ironOre < cost.ironOre || state.ancientRelic < cost.ancientRelic) {
    addFloatingText(width / 2, height * 0.4, 'Need: ' + cost.gold + 'g, ' + cost.wood + ' wood, ' + cost.stone + ' stone, ' + cost.ironOre + ' iron, ' + cost.ancientRelic + ' relics', C.buildInvalid);
    return;
  }
  state.gold -= cost.gold;
  state.wood -= cost.wood;
  state.stone -= cost.stone;
  state.ironOre -= cost.ironOre;
  state.ancientRelic -= cost.ancientRelic;

  let c = state.conquest;
  c.colonized = true;
  c.colonyLevel = 1;
  c.phase = 'colonized';
  c.colonyWorkers = 3;
  c.colonyIncome = 5; // gold per game-day

  // Initialize colony farms — 3x2 grid near center
  c.colonyPlots = [];
  let farmX = c.isleX - 80, farmY = c.isleY - 30;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      c.colonyPlots.push({
        x: farmX + col * 30, y: farmY + row * 28,
        w: 26, h: 24, planted: false, stage: 0, timer: 0, ripe: false, cropType: 'grain'
      });
    }
  }

  // Colony buildings — start with forum
  c.colonyBuildings = [
    { x: c.isleX, y: c.isleY - 80, type: 'forum', built: true },
  ];

  // Colony grass
  c.colonyGrassTufts = [];
  for (let i = 0; i < 20; i++) {
    let a = random(TWO_PI), r = random(0.3, 0.75);
    c.colonyGrassTufts.push({
      x: c.isleX + cos(a) * c.isleRX * r,
      y: c.isleY + sin(a) * c.isleRY * r,
      blades: floor(random(4, 8)), height: random(10, 20),
      hue: random(0.7, 1.0), sway: random(TWO_PI),
    });
  }

  // Clear remaining enemies and make island peaceful
  c.enemies = [];
  c.soldiers = [];

  unlockJournal('terra_nova_colonized');
  addFloatingText(width / 2, height * 0.15, 'TERRA NOVA COLONIZED!', '#ffdd66');
  addFloatingText(width / 2, height * 0.22, 'Colony Level 1 — Income: +5g/day', '#aaddff');
  addFloatingText(width / 2, height * 0.29, 'Workers: 3 — Farms: 6', '#88cc88');
  triggerScreenShake(10, 25);
  spawnLootCascade([], 200);
}

function getColonyUpgradeCost(colLvl) {
  let base = 50;
  return {
    gold: base + colLvl * 80,
    wood: 20 + colLvl * 15,
    stone: 15 + colLvl * 12,
    ironOre: colLvl >= 3 ? 5 + (colLvl - 3) * 5 : 0,
  };
}

function upgradeColony() {
  let c = state.conquest;
  if (!c.colonized || c.colonyLevel >= 10) return;
  let cost = getColonyUpgradeCost(c.colonyLevel);
  if (state.gold < cost.gold || state.wood < cost.wood || state.stone < cost.stone ||
      (cost.ironOre > 0 && state.ironOre < cost.ironOre)) {
    addFloatingText(width / 2, height * 0.4, 'Need more resources to upgrade colony!', C.buildInvalid);
    return;
  }
  state.gold -= cost.gold;
  state.wood -= cost.wood;
  state.stone -= cost.stone;
  if (cost.ironOre > 0) state.ironOre -= cost.ironOre;

  c.colonyLevel++;
  c.colonyWorkers += 2;
  c.colonyIncome += 5 + c.colonyLevel * 2;

  // Add more farm plots
  let newPlots = 2 + floor(c.colonyLevel / 2);
  let farmX = c.isleX - 80 + (c.colonyLevel % 3) * 100 - 100;
  let farmY = c.isleY + 20 + floor(c.colonyLevel / 3) * 40;
  for (let i = 0; i < newPlots; i++) {
    c.colonyPlots.push({
      x: farmX + (i % 3) * 30, y: farmY + floor(i / 3) * 28,
      w: 26, h: 24, planted: false, stage: 0, timer: 0, ripe: false, cropType: 'grain'
    });
  }

  // Add colony building per level
  let buildingTypes = ['granary', 'barracks', 'market', 'temple', 'aqueduct', 'bathhouse', 'villa', 'lighthouse', 'colosseum', 'palace'];
  let btype = buildingTypes[min(c.colonyLevel - 1, buildingTypes.length - 1)];
  let ba = ((c.colonyLevel - 1) / 10) * TWO_PI;
  c.colonyBuildings.push({
    x: c.isleX + cos(ba) * c.isleRX * 0.45,
    y: c.isleY + sin(ba) * c.isleRY * 0.35,
    type: btype, built: true,
  });

  // Grow island slightly
  c.isleRX += 20;
  c.isleRY += 15;

  // More grass
  for (let i = 0; i < 8; i++) {
    let a = random(TWO_PI), r = random(0.4, 0.8);
    c.colonyGrassTufts.push({
      x: c.isleX + cos(a) * c.isleRX * r,
      y: c.isleY + sin(a) * c.isleRY * r,
      blades: floor(random(4, 8)), height: random(10, 20),
      hue: random(0.7, 1.0), sway: random(TWO_PI),
    });
  }

  addFloatingText(width / 2, height * 0.15, 'COLONY LEVEL ' + c.colonyLevel + '!', '#ffdd66');
  addFloatingText(width / 2, height * 0.22, 'Income: +' + c.colonyIncome + 'g/day  Workers: ' + c.colonyWorkers, '#aaddff');
  triggerScreenShake(6, 15);
}

// Colony income — called from updateTime
function updateColonyIncome() {
  let c = state.conquest;
  if (c.colonized && c.colonyIncome > 0) {
    state.gold += c.colonyIncome;
    addNotification('+' + c.colonyIncome + 'g from Terra Nova colony', '#ddcc66');
    // Auto-harvest colony farms
    let harvested = 0;
    for (let p of c.colonyPlots) {
      if (!p.planted) {
        p.planted = true; p.stage = 0; p.timer = 0; p.ripe = false;
      }
      p.timer += 60; // colonies advance crops faster
      if (p.timer >= 300 && p.stage < 3) { p.stage++; p.timer = 0; }
      if (p.stage >= 3 && !p.ripe) { p.ripe = true; }
      if (p.ripe) {
        p.ripe = false; p.stage = 0; p.timer = 0;
        harvested++;
      }
    }
    if (harvested > 0) {
      state.harvest += floor(harvested * 0.5);
      state.seeds += floor(harvested * 0.3);
    }
  }
}

// ─── IMPERIAL BRIDGE — Connects home island to colonized Terra Nova ───────

function canBuildBridge() {
  return state.islandLevel >= 20 && state.conquest.colonized && !state.imperialBridge.built && !state.imperialBridge.building;
}

function getBridgeCost() {
  return { stone: 200, wood: 100, ironOre: 40, ancientRelic: 15, titanBone: 5 };
}

function startBuildBridge() {
  if (!canBuildBridge()) return;
  let cost = getBridgeCost();
  if (state.stone < cost.stone || state.wood < cost.wood || state.ironOre < cost.ironOre ||
      state.ancientRelic < cost.ancientRelic || state.titanBone < cost.titanBone) {
    addFloatingText(width / 2, height * 0.4, 'Need: 200 stone, 100 wood, 40 iron, 15 relics, 5 bone', C.buildInvalid);
    return;
  }
  state.stone -= cost.stone;
  state.wood -= cost.wood;
  state.ironOre -= cost.ironOre;
  state.ancientRelic -= cost.ancientRelic;
  state.titanBone -= cost.titanBone;

  state.imperialBridge.building = true;
  state.imperialBridge.progress = 0;

  // Generate bridge segments between home island west edge and Terra Nova east edge
  let homeX = WORLD.islandCX - state.islandRX * 0.9;
  let terraX = state.conquest.isleX + state.conquest.isleRX * 0.9;
  let bridgeY = WORLD.islandCY;
  let totalDist = homeX - terraX;
  let numSegments = floor(abs(totalDist) / 40);
  state.imperialBridge.segments = [];
  for (let i = 0; i <= numSegments; i++) {
    let t = i / numSegments;
    let sx = terraX + t * totalDist;
    // Gentle arch — bridge arcs up slightly in the middle
    let archY = bridgeY - sin(t * PI) * 30;
    state.imperialBridge.segments.push({
      x: sx, y: archY, w: 42, h: 20,
      archIdx: i, total: numSegments,
    });
  }

  addFloatingText(width / 2, height * 0.15, 'IMPERIAL BRIDGE — Construction Begins!', '#ffaa00');
  addFloatingText(width / 2, height * 0.22, 'The workers toil day and night...', '#ccaa66');
  triggerScreenShake(8, 20);
  unlockJournal('imperial_bridge_started');
}

function updateBridgeConstruction(dt) {
  let b = state.imperialBridge;
  if (!b.building) return;
  // Progress 1% per game-hour (~5.5 frames per hour at 0.18/frame)
  b.progress += 0.15 * dt;
  if (b.progress >= 100) {
    b.progress = 100;
    b.building = false;
    b.built = true;
    addFloatingText(width / 2, height * 0.15, 'THE IMPERIAL BRIDGE IS COMPLETE!', '#ffdd00');
    addFloatingText(width / 2, height * 0.22, 'Walk freely between your islands!', '#aaddff');
    triggerScreenShake(15, 40);
    unlockJournal('imperial_bridge_complete');
    spawnIslandLevelUp();
  }
}

function isOnImperialBridge(wx, wy) {
  let b = state.imperialBridge;
  if (!b.built || b.segments.length === 0) return false;
  // Check if position is on any bridge segment
  let bridgeY = WORLD.islandCY;
  let firstSeg = b.segments[0];
  let lastSeg = b.segments[b.segments.length - 1];
  let minX = min(firstSeg.x, lastSeg.x) - 20;
  let maxX = max(firstSeg.x, lastSeg.x) + 20;
  if (wx < minX || wx > maxX) return false;
  // Find the bridge Y at this X position
  let t = (wx - firstSeg.x) / (lastSeg.x - firstSeg.x);
  t = constrain(t, 0, 1);
  let archY = bridgeY - sin(t * PI) * 30;
  return abs(wy - archY) < 18;
}

function drawImperialBridge() {
  let b = state.imperialBridge;
  if (!b.built && !b.building) return;
  let segsToShow = b.building ? floor(b.segments.length * b.progress / 100) : b.segments.length;
  if (segsToShow === 0) return;

  let bright = getSkyBrightness();

  for (let i = 0; i < segsToShow; i++) {
    let seg = b.segments[i];
    let sx = w2sX(seg.x), sy = w2sY(seg.y);
    let t = i / b.segments.length;

    // Water reflection
    noStroke();
    fill(60, 80, 100, 30);
    ellipse(sx, sy + 22, seg.w + 4, 10);

    // Stone archway support pillars (every 4 segments)
    if (i % 4 === 0) {
      // Pillar going down into water
      fill(lerpColor(color(90, 82, 72), color(140, 130, 115), bright));
      rect(sx - 5, sy, 10, 30 + sin(t * PI) * 20);
      // Pillar base in water
      fill(60, 80, 100, 50);
      ellipse(sx, sy + 30 + sin(t * PI) * 20, 16, 6);
    }

    // Bridge deck — stone surface
    let deckCol = lerpColor(color(120, 112, 98), color(175, 165, 145), bright);
    fill(deckCol);
    rect(sx - seg.w / 2, sy - 6, seg.w, 12, 1);

    // Top surface highlight
    fill(lerpColor(color(145, 135, 118), color(195, 185, 165), bright));
    rect(sx - seg.w / 2, sy - 6, seg.w, 4, 1);

    // Stone block lines
    stroke(100, 92, 82, 40);
    strokeWeight(0.5);
    if (i % 2 === 0) line(sx - seg.w / 2, sy - 2, sx + seg.w / 2, sy - 2);
    noStroke();

    // Balustrade (railings) — every other segment
    if (i % 2 === 0) {
      fill(lerpColor(color(130, 120, 105), color(180, 170, 150), bright));
      // Left railing post
      rect(sx - seg.w / 2 + 2, sy - 12, 3, 8);
      // Right railing post
      rect(sx + seg.w / 2 - 5, sy - 12, 3, 8);
    }

    // Roman torch every 8 segments
    if (i % 8 === 0 && i > 0) {
      // Torch base
      fill(100, 70, 40);
      rect(sx - 2, sy - 18, 4, 12);
      // Flame
      let flicker = sin(frameCount * 0.15 + i) * 2;
      fill(255, 180, 50, 200);
      ellipse(sx, sy - 20 + flicker, 6, 8);
      fill(255, 220, 100, 150);
      ellipse(sx, sy - 21 + flicker, 4, 5);
      // Glow
      fill(255, 150, 50, 20);
      ellipse(sx, sy - 18, 30, 25);
    }
  }

  // Construction progress bar
  if (b.building) {
    let barX = width / 2 - 80, barY = height * 0.08;
    fill(0, 0, 0, 150);
    rect(barX - 2, barY - 2, 164, 16, 3);
    fill(60, 50, 40);
    rect(barX, barY, 160, 12, 2);
    fill(200, 160, 60);
    rect(barX, barY, 160 * b.progress / 100, 12, 2);
    fill(255, 240, 200);
    textSize(8); textAlign(CENTER, CENTER);
    text('BRIDGE: ' + floor(b.progress) + '%', width / 2, barY + 5);
  }
}

function updateConquest(dt) {
  let c = state.conquest;
  let p = state.player;
  // Sanity: ensure arrays exist
  if (!Array.isArray(c.enemies)) c.enemies = [];
  if (!Array.isArray(c.soldiers)) c.soldiers = [];
  if (!Array.isArray(c.workers)) c.workers = [];
  if (!Array.isArray(c.trees)) c.trees = [];
  if (!Array.isArray(c.buildings)) c.buildings = [];
  if (!Array.isArray(c.blueprintQueue)) c.blueprintQueue = [];
  if (!Array.isArray(c.lootBag)) c.lootBag = [];
  // Sanity: player position must be a number
  if (isNaN(p.x) || isNaN(p.y)) { p.x = c.isleX; p.y = c.isleY; }
  // Player combat timers
  if (p.attackTimer > 0) p.attackTimer -= dt;
  if (p.invincTimer > 0) p.invincTimer -= dt;
  if (p.slashPhase > 0) p.slashPhase -= dt;
  c.phaseTimer += dt;

  // Player chopping
  if (c.chopTarget) {
    let t = c.chopTarget;
    if (!t.alive) { c.chopTarget = null; c.chopTimer = 0; }
    else {
      let d = dist(p.x, p.y, t.x, t.y);
      if (d > 35) { c.chopTarget = null; c.chopTimer = 0; } // walked away
      else {
        c.chopTimer += dt;
        if (c.chopTimer >= 25) {
          c.chopTimer = 0;
          t.hp--;
          spawnParticles(t.x, t.y, 'chop', 3);
          if (t.hp <= 0) {
            t.alive = false;
            let woodGain = floor(random(2, 4));
            c.woodPile += woodGain;
            addFloatingText(w2sX(t.x), w2sY(t.y) - 10, '+' + woodGain + ' Wood', '#bb8844');
            updateBountyProgress('chop', 1);
            c.chopTarget = null;
            c.chopTimer = 0;
          }
        }
      }
    }
  }

  // Colonized mode — peaceful, no enemies or danger
  if (c.colonized) {
    // Auto-advance colony farms
    for (let p of c.colonyPlots) {
      if (!p.planted) { p.planted = true; p.stage = 0; p.timer = 0; }
      p.timer += dt;
      if (p.timer >= 120 && p.stage < 3) { p.stage++; p.timer = 0; }
      if (p.stage >= 3 && !p.ripe) p.ripe = true;
    }
    // No combat update — skip rest of conquest combat logic
    advanceConquestPhase(c);
    return;
  }

  // Expedition timer + danger escalation
  c.expeditionTimer += dt;
  let dangerMult = (getModifier().dangerMult || 1.0);
  let dangerInterval = (600 + state.expeditionUpgrades.dangerResist * 200) / dangerMult;
  c.dangerLevel = min(10, floor(c.expeditionTimer / dangerInterval));
  let tierMult = state.expeditionUpgrades.expeditionTier;

  // Enemy spawning based on danger level + modifier
  let mod = getModifier();
  if (c.phase !== 'unexplored' && mod.enemyMult > 0) {
    c.spawnTimer -= dt;
    let spawnInterval = max(120, 480 - c.dangerLevel * 40) * (mod.spawnMult || 1.0);
    let maxEnemies = floor((3 + c.dangerLevel) * mod.enemyMult);
    // Nightfall (danger 10+): constant spawns
    if (c.expeditionTimer > c.expeditionTimeLimit) {
      spawnInterval = max(60, spawnInterval * 0.5);
      maxEnemies += 3;
    }
    if (c.spawnTimer <= 0 && c.enemies.length < maxEnemies && c.enemies.length < 20) {
      // Pick enemy type based on danger
      let types = ['wolf'];
      if (c.dangerLevel >= 3) types.push('boar');
      if (c.dangerLevel >= 5) types.push('bear');
      if (c.dangerLevel >= 7) types.push('dire_wolf');
      let type = types[floor(random(types.length))];
      spawnConquestEnemy(c, type);
      c.spawnTimer = spawnInterval + random(spawnInterval * 0.3);
    }
  }

  // Rare events
  c.rareSpawnTimer += dt;
  if (c.rareSpawnTimer >= 3600) { // check every ~60s
    c.rareSpawnTimer = 0;
    if (c.dangerLevel >= 5 && random() < 0.2) {
      // Treasure cache — drop lots of loot
      let tx = c.isleX + random(-c.isleRX * 0.5, c.isleRX * 0.5);
      let ty = c.isleY + random(-c.isleRY * 0.5, c.isleRY * 0.5);
      dropExpeditionLoot(tx, ty, 'treasure');
      addFloatingText(w2sX(tx), w2sY(ty) - 20, 'TREASURE!', '#ffdd44');
      triggerScreenShake(4, 8);
    }
    if (c.dangerLevel >= 8 && random() < 0.1) {
      // Spawn guardian mini-boss
      spawnConquestEnemy(c, 'guardian');
      addFloatingText(width / 2, height * 0.15, 'ANCIENT GUARDIAN APPEARS!', '#ff4444');
      triggerScreenShake(6, 15);
    }
  }

  // Phase-based advancement still applies for structure
  switch (c.phase) {
    case 'landing':
      break;
    case 'clearing':
    case 'building':
    case 'defending':
      break;
    case 'settled':
      break;
  }

  // Update enemies — purge stuck/corrupt entries
  for (let i = c.enemies.length - 1; i >= 0; i--) {
    let e = c.enemies[i];
    if (!e || !e.state) { c.enemies.splice(i, 1); continue; }
    updateConquestEnemy(e, dt, p, c);
    // Force dead if stuck in dying for too long (>120 frames)
    if (e.state === 'dying' && e.stateTimer < -100) e.state = 'dead';
    if (e.state === 'dead') {
      spawnParticles(e.x, e.y, 'combat', 6);
      c.totalKills++;
      if (typeof advanceNPCQuestCounter === 'function') advanceNPCQuestCounter('nq_marcus_kills', 1);
      updateBountyProgress('kills', 1, e.type);
      dropExpeditionLoot(e.x, e.y, e.type);
      c.enemies.splice(i, 1);
    }
  }

  // Remove dead soldiers
  c.soldiers = c.soldiers.filter(s => s.hp > 0 || s.state !== 'dead');

  // Update soldiers (pass index for formation)
  for (let i = 0; i < c.soldiers.length; i++) {
    updateConquestSoldier(c.soldiers[i], dt, p, c, i, c.soldiers.length);
  }

  // Update workers
  updateConquestWorkers(dt);

  // Phase advancement
  advanceConquestPhase(c);

  // Bounty tracking: danger level + survive time
  updateBountyProgress('danger', c.dangerLevel);
  updateBountyProgress('survive', floor(c.expeditionTimer / 60)); // seconds

  // Fog of war — reveal around player + soldiers every 10 frames
  if (frameCount % 10 === 0) {
    revealFog(p.x, p.y);
    for (let s of c.soldiers) {
      if (s.hp > 0) revealFog(s.x, s.y);
    }
  }

  // Player death — retreat with 50% loot
  if (p.hp <= 0) {
    p.hp = floor(p.maxHp * 0.5);
    triggerScreenShake(8, 20);
    exitConquest(true);
  }
}

function spawnConquestEnemy(c, type) {
  let sa = random(TWO_PI);
  let sx = c.isleX + cos(sa) * c.isleRX * 0.85;
  let sy = c.isleY + sin(sa) * c.isleRY * 0.85;
  let statMap = {
    wolf:      { hp: 25,  damage: 6,  speed: 2.0, size: 12 },
    boar:      { hp: 50,  damage: 10, speed: 1.2, size: 16 },
    bear:      { hp: 80,  damage: 15, speed: 1.0, size: 18 },
    dire_wolf: { hp: 40,  damage: 12, speed: 2.8, size: 14 },
    guardian:  { hp: 300, damage: 20, speed: 0.8, size: 22 },
  };
  let stats = statMap[type] || statMap.wolf;
  // Scale HP with danger + expedition tier
  let dangerScale = 1 + c.dangerLevel * 0.15;
  let tierScale = 1 + state.expeditionUpgrades.expeditionTier * 0.2;
  let scaledHp = floor(stats.hp * dangerScale * tierScale);
  // Nightfall speed boost
  let speedMult = (c.expeditionTimer > c.expeditionTimeLimit) ? 1.5 : 1.0;
  c.enemies.push({
    type: type, x: sx, y: sy, vx: 0, vy: 0,
    hp: scaledHp, maxHp: scaledHp, damage: stats.damage,
    speed: stats.speed * speedMult, size: stats.size,
    state: 'chase', stateTimer: 0, attackCooldown: 0,
    facing: 1, flashTimer: 0,
  });
}

function dropExpeditionLoot(x, y, sourceType) {
  let c = state.conquest;
  let lootBonus = (1 + state.expeditionUpgrades.lootBonus * 0.15) * (getModifier().lootMult || 1.0);
  let drops = [];

  if (sourceType === 'treasure') {
    // Treasure cache — guaranteed rare drops
    drops.push({ type: 'iron_ore', qty: floor(random(2, 5) * lootBonus) });
    drops.push({ type: 'rare_hide', qty: floor(random(1, 3) * lootBonus) });
    if (c.dangerLevel >= 7) drops.push({ type: 'titan_bone', qty: 1 });
    if (random() < 0.3) drops.push({ type: 'ancient_relic', qty: 1 });
    state.gold += floor(20 * lootBonus);
    addFloatingText(w2sX(x), w2sY(y) - 30, '+20 Gold', '#ffcc44');
  } else if (sourceType === 'guardian') {
    // Boss drops
    drops.push({ type: 'ancient_relic', qty: 1 });
    state.gold += 50;
    addFloatingText(w2sX(x), w2sY(y) - 15, '+50 Gold', '#ffcc44');
    if (random() < 0.4) drops.push({ type: 'titan_bone', qty: 1 });
  } else {
    // Normal enemy drops
    state.gold += floor(random(2, 5));
    addFloatingText(w2sX(x), w2sY(y) - 15, '+Gold', '#ffcc44');
    // Common: wood
    if (random() < 0.4) drops.push({ type: 'wood', qty: floor(random(1, 3) * lootBonus) });
    // Uncommon: iron/hide
    if (random() < 0.15 + c.dangerLevel * 0.02) drops.push({ type: 'iron_ore', qty: 1 });
    if (random() < 0.1 + c.dangerLevel * 0.02) drops.push({ type: 'rare_hide', qty: 1 });
    // Rare: relic (danger 5+)
    if (c.dangerLevel >= 5 && random() < 0.05) drops.push({ type: 'ancient_relic', qty: 1 });
    // Very rare: titan bone (danger 7+)
    if (c.dangerLevel >= 7 && random() < 0.02) drops.push({ type: 'titan_bone', qty: 1 });
    // Legion standard — rare quest drop (Chapter 4, danger level 5+)
    if (typeof advanceMainQuestCounter === 'function' && state.mainQuest && state.mainQuest.chapter === 3 &&
        c.dangerLevel >= 5 && random() < 0.08 &&
        (state.mainQuest.counters['mq_standard_found'] || 0) < 1) {
      advanceMainQuestCounter('mq_standard_found', 1);
      addFloatingText(w2sX(x), w2sY(y) - 40, 'LEGION STANDARD FOUND!', '#ffd700');
      spawnParticles(x, y, 'divine', 12);
    }
  }

  // Add to loot bag and show floating text
  for (let d of drops) {
    c.lootBag.push(d);
    // Track loot bounties
    if (d.type === 'iron_ore') updateBountyProgress('loot', d.qty);
    if (d.type === 'rare_hide') updateBountyProgress('loot', d.qty);
    let labels = { wood: 'Wood', iron_ore: 'Iron', rare_hide: 'Hide', ancient_relic: 'Relic!', titan_bone: 'Titan Bone!' };
    let colors = { wood: '#bb8844', iron_ore: '#aabbcc', rare_hide: '#cc9966', ancient_relic: '#ff88ff', titan_bone: '#ffdd88' };
    addFloatingText(w2sX(x) + random(-15, 15), w2sY(y) - 25 - random(10), '+' + d.qty + ' ' + (labels[d.type] || d.type), colors[d.type] || '#ffffff');
  }
}

function updateConquestEnemy(e, dt, p, c) {
  // Safety: corrupted enemy -> mark dead immediately
  if (!e || isNaN(e.x) || isNaN(e.y) || !e.state) { e.state = 'dead'; return; }
  if (e.flashTimer > 0) e.flashTimer -= dt;
  if (e.attackCooldown > 0) e.attackCooldown -= dt;
  // Safety: force dying if hp <= 0 but not already dying/dead
  if (e.hp <= 0 && e.state !== 'dying' && e.state !== 'dead') {
    e.state = 'dying'; e.stateTimer = 15;
  }
  // Safety: stuck in unknown state
  if (!['chase','attack','stagger','dying','dead'].includes(e.state)) {
    e.state = 'chase'; e.stateTimer = 0;
  }

  // Find nearest target (player or soldier)
  let nearestD = dist(e.x, e.y, p.x, p.y);
  let targetX = p.x, targetY = p.y;
  for (let s of c.soldiers) {
    if (s.hp <= 0) continue;
    let sd = dist(e.x, e.y, s.x, s.y);
    if (sd < nearestD) { nearestD = sd; targetX = s.x; targetY = s.y; }
  }

  // Palisade blocking — slow enemies near palisades
  for (let b of c.buildings) {
    if (b.type === 'palisade') {
      let bd = dist(e.x, e.y, b.x, b.y);
      if (bd < 30) {
        let pushAng = atan2(e.y - b.y, e.x - b.x);
        e.x += cos(pushAng) * 0.8;
        e.y += sin(pushAng) * 0.8;
      }
    }
  }

  switch (e.state) {
    case 'chase': {
      let dx = targetX - e.x, dy = targetY - e.y;
      let d = sqrt(dx * dx + dy * dy);
      if (d > 0) { e.vx = (dx / d) * e.speed; e.vy = (dy / d) * e.speed; }
      e.x += e.vx * dt; e.y += e.vy * dt;
      e.facing = dx > 0 ? 1 : -1;
      if (d < e.size + 18 && e.attackCooldown <= 0) {
        e.state = 'attack'; e.stateTimer = 15;
      }
      break;
    }
    case 'attack': {
      e.stateTimer -= dt; e.vx = 0; e.vy = 0;
      if (e.stateTimer <= 0) {
        if (nearestD < e.size + 25) {
          let hitPlayer = dist(e.x, e.y, p.x, p.y) < e.size + 25;
          if (hitPlayer && p.invincTimer <= 0) {
            let armorR = [0, 3, 6, 10][p.armor] || 0;
            let dmg = max(1, e.damage - armorR);
            p.hp -= dmg;
            p.invincTimer = 30;
            addFloatingText(w2sX(p.x), w2sY(p.y) - 25, '-' + dmg, '#ff6644');
            triggerScreenShake(3, 6);
            if (snd) snd.playSFX('player_hurt');
          } else {
            for (let s of c.soldiers) {
              if (s.hp <= 0) continue;
              if (dist(e.x, e.y, s.x, s.y) < e.size + 20) {
                s.hp -= e.damage;
                s.flashTimer = 6;
                addFloatingText(w2sX(s.x), w2sY(s.y) - 15, '-' + e.damage, '#ff8844');
                break;
              }
            }
          }
        }
        e.state = 'chase';
        e.attackCooldown = 50;
      }
      break;
    }
    case 'stagger': {
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        if (e.hp <= 0) { e.state = 'dying'; e.stateTimer = 15; }
        else e.state = 'chase';
      }
      break;
    }
    case 'dying': {
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) e.state = 'dead';
      break;
    }
  }

  // Clamp to island
  let bex = (e.x - c.isleX) / (c.isleRX - 10);
  let bey = (e.y - c.isleY) / (c.isleRY - 10);
  if (bex * bex + bey * bey > 1) {
    let ba = atan2(e.y - c.isleY, e.x - c.isleX);
    e.x = c.isleX + cos(ba) * (c.isleRX - 12);
    e.y = c.isleY + sin(ba) * (c.isleRY - 12);
  }
}

function updateConquestSoldier(s, dt, p, c, idx, total) {
  if (!s || isNaN(s.x) || isNaN(s.y)) { if (s) s.hp = 0; return; }
  if (s.hp <= 0) { s.state = 'dead'; return; }
  if (s.flashTimer > 0) s.flashTimer -= dt;
  if (s.attackTimer > 0) s.attackTimer -= dt;
  idx = idx || 0;
  total = total || 1;

  // Find nearest enemy
  let nearestE = null, nearestD = 140;
  for (let e of c.enemies) {
    if (e.state === 'dying' || e.state === 'dead') continue;
    let d = dist(s.x, s.y, e.x, e.y);
    if (d < nearestD) { nearestD = d; nearestE = e; }
  }

  if (nearestE && nearestD < 120) {
    // COMBAT — charge nearest enemy
    let dx = nearestE.x - s.x, dy = nearestE.y - s.y;
    let d = sqrt(dx * dx + dy * dy);
    s.facing = dx > 0 ? 1 : -1;
    if (d > 22) {
      s.x += (dx / d) * 2.5 * dt;
      s.y += (dy / d) * 2.5 * dt;
    } else if (s.attackTimer <= 0) {
      nearestE.hp -= 10;
      nearestE.flashTimer = 5;
      nearestE.state = 'stagger';
      nearestE.stateTimer = 6;
      s.attackTimer = 30;
      let kba = atan2(nearestE.y - s.y, nearestE.x - s.x);
      nearestE.x += cos(kba) * 3;
      nearestE.y += sin(kba) * 3;
      spawnParticles(nearestE.x, nearestE.y, 'combat', 2);
    }
  } else {
    // FORMATION — always form up behind player
    let ftx, fty;
    // Player facing direction (use velocity or last movement)
    let facingAngle = atan2(p.vy || 0, p.vx || 0);
    if (abs(p.vx || 0) < 0.1 && abs(p.vy || 0) < 0.1) {
      facingAngle = p.facing > 0 ? 0 : PI;
    }
    // Formation: rows of 5, stacked behind player
    let cols = min(5, total);
    let row = floor(idx / cols);
    let col = idx % cols;
    let centerCol = (cols - 1) / 2;
    // Perpendicular to facing direction
    let perpAngle = facingAngle + HALF_PI;
    let backAngle = facingAngle + PI; // behind player
    let spacing = 28;
    let rowDist = 35 + row * 28; // distance behind player
    // Position: behind player, spread perpendicular
    let lateral = (col - centerCol) * spacing;
    ftx = p.x + cos(backAngle) * rowDist + cos(perpAngle) * lateral;
    fty = p.y + sin(backAngle) * rowDist + sin(perpAngle) * lateral;
    let dx = ftx - s.x, dy = fty - s.y;
    let d = sqrt(dx * dx + dy * dy);
    // Move faster when far from formation slot, slower when close
    let spd = d > 60 ? 3.0 : (d > 20 ? 1.8 : 1.0);
    if (d > 6) {
      s.x += (dx / d) * spd * dt;
      s.y += (dy / d) * spd * dt;
    }
    s.facing = dx > 0 ? 1 : (dx < 0 ? -1 : s.facing);
  }

  // Separation — push apart from other soldiers to prevent stacking
  for (let i = 0; i < c.soldiers.length; i++) {
    let o = c.soldiers[i];
    if (o === s || o.hp <= 0) continue;
    let sdx = s.x - o.x, sdy = s.y - o.y;
    let sd = sdx * sdx + sdy * sdy;
    if (sd < 400 && sd > 0) { // 20px min separation
      let sdd = sqrt(sd);
      s.x += (sdx / sdd) * 0.8;
      s.y += (sdy / sdd) * 0.8;
    }
  }

  // Clamp to island
  let bex = (s.x - c.isleX) / (c.isleRX - 15);
  let bey = (s.y - c.isleY) / (c.isleRY - 15);
  if (bex * bex + bey * bey > 1) {
    let ba = atan2(s.y - c.isleY, s.x - c.isleX);
    s.x = c.isleX + cos(ba) * (c.isleRX - 17);
    s.y = c.isleY + sin(ba) * (c.isleRY - 17);
  }
}

function conquestPlayerChop() {
  let c = state.conquest;
  let p = state.player;
  if (c.buildMode) return;
  // Find nearest tree in front of player
  let fAngle = getFacingAngle();
  let best = null, bestD = 40;
  for (let t of c.trees) {
    if (!t.alive) continue;
    let d = dist(p.x, p.y, t.x, t.y);
    if (d > bestD) continue;
    let a = atan2(t.y - p.y, t.x - p.x);
    let diff = a - fAngle;
    while (diff > PI) diff -= TWO_PI;
    while (diff < -PI) diff += TWO_PI;
    if (abs(diff) < PI * 0.5) { best = t; bestD = d; }
  }
  if (best) {
    c.chopTarget = best;
    c.chopTimer = 0;
  }
}

function placeConquestBuilding(wx, wy) {
  let c = state.conquest;
  let type = c.buildType;
  let bp = CONQUEST_BUILDINGS[type];
  if (!bp) return;
  if (c.woodPile < bp.cost) {
    addFloatingText(w2sX(wx), w2sY(wy) - 20, 'Need ' + bp.cost + ' wood', '#ff6644');
    return;
  }
  if (!isOnConquestIsland(wx, wy)) {
    addFloatingText(w2sX(wx), w2sY(wy) - 20, "Can't build here", '#ff6644');
    return;
  }
  // Check not too close to another building
  for (let b of c.buildings) {
    if (dist(wx, wy, b.x, b.y) < 28) {
      addFloatingText(w2sX(wx), w2sY(wy) - 20, 'Too close', '#ff6644');
      return;
    }
  }
  // Check not on a tree
  for (let t of c.trees) {
    if (t.alive && dist(wx, wy, t.x, t.y) < 18) {
      addFloatingText(w2sX(wx), w2sY(wy) - 20, 'Clear trees first', '#ff6644');
      return;
    }
  }

  c.woodPile -= bp.cost;

  // If builders available, queue as blueprint; otherwise instant build
  let hasBuilder = c.workers.some(w => w.type === 'builder' && w.task !== 'dead');
  if (hasBuilder && type !== 'campfire') {
    c.blueprintQueue.push({ x: wx, y: wy, type: type, progress: 0, maxProgress: bp.cost * 8 });
    addFloatingText(w2sX(wx), w2sY(wy) - 25, bp.name + ' blueprint placed!', '#aaddff');
  } else {
    completeConquestBuilding(c, wx, wy, type);
  }
  triggerScreenShake(2, 5);
  spawnParticles(wx, wy, 'build', 5);
}

function completeConquestBuilding(c, wx, wy, type) {
  let bp = CONQUEST_BUILDINGS[type];
  c.buildings.push({ x: wx, y: wy, type: type });
  updateBountyProgress('build', 1);
  addFloatingText(w2sX(wx), w2sY(wy) - 25, bp.name + ' built!', '#aaddff');

  // Spawn soldiers
  let soldierHP = 60 + state.expeditionUpgrades.soldierHP * 20;
  if (bp.soldiers > 0) {
    for (let i = 0; i < bp.soldiers; i++) {
      let ang = random(TWO_PI);
      c.soldiers.push({
        x: wx + cos(ang) * 20, y: wy + sin(ang) * 20,
        vx: 0, vy: 0, hp: soldierHP, maxHp: soldierHP,
        state: 'follow', target: null,
        attackTimer: 0, facing: 1, flashTimer: 0,
      });
    }
    addFloatingText(w2sX(wx), w2sY(wy) - 40, '+' + bp.soldiers + ' Soldier' + (bp.soldiers > 1 ? 's' : ''), '#88cc88');
  }

  // Spawn worker
  let wCap = 2 + state.expeditionUpgrades.workerCap;
  if (bp.workerType && c.workers.length < wCap) {
    spawnConquestWorker(c, wx, wy, bp.workerType);
  }
}

function spawnConquestWorker(c, wx, wy, type) {
  let ang = random(TWO_PI);
  let spd = 1.4 * (1 + state.expeditionUpgrades.workerSpeed * 0.25);
  c.workers.push({
    x: wx + cos(ang) * 15, y: wy + sin(ang) * 15,
    vx: 0, vy: 0, task: 'idle', taskTarget: null, timer: 0,
    type: type, speed: spd, facing: 1,
  });
  addFloatingText(w2sX(wx), w2sY(wy) - 55, '+1 ' + (type === 'chopper' ? 'Chopper' : 'Builder'), '#77bbaa');
}

function updateConquestWorkers(dt) {
  let c = state.conquest;
  let spd = 1.4 * (1 + state.expeditionUpgrades.workerSpeed * 0.25);

  // Purge corrupted workers
  c.workers = c.workers.filter(w => w && !isNaN(w.x) && !isNaN(w.y) && w.type);
  for (let w of c.workers) {
    w.speed = spd;
    // Safety: unknown task state
    if (!['idle','walking','working'].includes(w.task)) w.task = 'idle';
    switch (w.task) {
      case 'idle': {
        if (w.type === 'chopper') {
          // Find nearest alive tree
          let best = null, bestD = 9999;
          for (let t of c.trees) {
            if (!t.alive) continue;
            let d = dist(w.x, w.y, t.x, t.y);
            if (d < bestD) { bestD = d; best = t; }
          }
          if (best) { w.task = 'walking'; w.taskTarget = best; }
        } else if (w.type === 'builder') {
          // Find nearest unfinished blueprint
          let best = null, bestD = 9999;
          for (let bp of c.blueprintQueue) {
            if (bp.progress >= bp.maxProgress) continue;
            // Skip if another builder is already on it
            let taken = c.workers.some(ow => ow !== w && ow.taskTarget === bp && ow.task !== 'idle');
            if (taken) continue;
            let d = dist(w.x, w.y, bp.x, bp.y);
            if (d < bestD) { bestD = d; best = bp; }
          }
          if (best) { w.task = 'walking'; w.taskTarget = best; }
        }
        break;
      }
      case 'walking': {
        let t = w.taskTarget;
        if (!t || (t.alive === false && w.type === 'chopper')) { w.task = 'idle'; w.taskTarget = null; break; }
        let ddx = t.x - w.x, ddy = t.y - w.y;
        let dd = sqrt(ddx * ddx + ddy * ddy);
        if (dd > 0) {
          w.vx = (ddx / dd) * w.speed;
          w.vy = (ddy / dd) * w.speed;
          w.x += w.vx * dt; w.y += w.vy * dt;
          w.facing = ddx > 0 ? 1 : -1;
        }
        if (dd < 20) { w.task = 'working'; w.timer = 0; }
        break;
      }
      case 'working': {
        w.timer += dt;
        w.vx = 0; w.vy = 0;
        if (w.type === 'chopper') {
          let t = w.taskTarget;
          if (!t || !t.alive) { w.task = 'idle'; w.taskTarget = null; break; }
          if (w.timer >= 50) { // slower than player
            w.timer = 0;
            t.hp--;
            spawnParticles(t.x, t.y, 'chop', 2);
            if (t.hp <= 0) {
              t.alive = false;
              let woodGain = floor(random(2, 4));
              c.woodPile += woodGain;
              addFloatingText(w2sX(t.x), w2sY(t.y) - 10, '+' + woodGain + ' Wood', '#bb8844');
              w.task = 'idle'; w.taskTarget = null;
            }
          }
        } else if (w.type === 'builder') {
          let bp = w.taskTarget;
          if (!bp || bp.progress >= bp.maxProgress) { w.task = 'idle'; w.taskTarget = null; break; }
          bp.progress += dt;
          if (frameCount % 30 === 0) spawnParticles(bp.x, bp.y, 'build', 1);
          if (bp.progress >= bp.maxProgress) {
            completeConquestBuilding(c, bp.x, bp.y, bp.type);
            // Remove from queue
            let idx = c.blueprintQueue.indexOf(bp);
            if (idx >= 0) c.blueprintQueue.splice(idx, 1);
            w.task = 'idle'; w.taskTarget = null;
          }
        }
        break;
      }
    }

    // Clamp to island
    let bex = (w.x - c.isleX) / (c.isleRX - 20);
    let bey = (w.y - c.isleY) / (c.isleRY - 20);
    if (bex * bex + bey * bey > 1) {
      let ba = atan2(w.y - c.isleY, w.x - c.isleX);
      w.x = c.isleX + cos(ba) * (c.isleRX - 22);
      w.y = c.isleY + sin(ba) * (c.isleRY - 22);
    }
  }
}

function drawConquestWorker(w) {
  let sx = w2sX(w.x), sy = w2sY(w.y);
  push();
  translate(floor(sx), floor(sy));
  let sc = w.facing;
  noStroke();

  // Pixel shadow
  fill(0, 0, 0, 30);
  rect(-6, 5, 12, 2);

  // Pixel body (brown tunic)
  fill(140, 110, 70);
  rect(-4, -10, 8, 10);
  // Pixel head
  fill(200, 170, 130);
  rect(-3, -16, 6, 6);
  // Pixel hat
  if (w.type === 'chopper') {
    fill(200, 180, 100);
    rect(-5, -18, 10, 2); // brim
    rect(-2, -20, 4, 2);  // top
  } else {
    fill(120, 90, 50);
    rect(-3, -20, 6, 4);
  }
  // Pixel tool
  if (w.type === 'chopper') {
    fill(100, 80, 50);
    rect(5 * sc, -16, 2, 10); // handle
    fill(160, 160, 170);
    rect(4 * sc, -18, 4, 4); // axe head
  } else {
    fill(100, 80, 50);
    rect(5 * sc, -15, 2, 8); // handle
    fill(140, 130, 120);
    rect(4 * sc, -17, 4, 3); // hammer head
  }
  // Pixel working animation
  if (w.task === 'working') {
    let bob = floor(sin(frameCount * 0.15) * 2);
    fill(255, 220, 100, 100);
    rect(-1, -5 + bob, 2, 2);
    // Pixel sparks
    for (let i = 0; i < 2; i++) {
      let sx2 = floor(sin(frameCount * 0.2 + i * 3) * 6);
      let sy2 = floor(-12 - abs(cos(frameCount * 0.15 + i * 2)) * 4);
      fill(255, 200, 80, 150 - i * 50);
      rect(sx2, sy2, 2, 2);
    }
  }
  // Pixel eyes
  fill(40, 30, 20);
  rect(-2, -14, 1, 1);
  rect(1, -14, 1, 1);
  // Task label
  if (w.task !== 'idle') {
    fill(200, 180, 130, 120); textSize(5); textAlign(CENTER);
    let label = w.task === 'walking' ? (w.type === 'chopper' ? 'to tree' : 'to site') : (w.type === 'chopper' ? 'chopping' : 'building');
    text(label, 0, -22);
  }
  pop();
}

function conquestPlayerAttack() {
  let p = state.player;
  let c = state.conquest;
  if (p.attackTimer > 0) return;
  p.attackTimer = p.attackCooldown;
  p.slashPhase = 10;
  let fAngle = getFacingAngle();
  let arcHalf = PI * 0.3;
  let range = p.attackRange + (p.weapon === 1 ? 12 : 0);
  let dmg = [15, 20, 25][p.weapon] || 15;

  // Check campfire morale bonus
  if (c.buildings.some(b => b.type === 'campfire')) dmg += 3;

  for (let e of c.enemies) {
    if (e.state === 'dying' || e.state === 'dead') continue;
    let d = dist(p.x, p.y, e.x, e.y);
    if (d > range + e.size) continue;
    let angle = atan2(e.y - p.y, e.x - p.x);
    let diff = angle - fAngle;
    while (diff > PI) diff -= TWO_PI;
    while (diff < -PI) diff += TWO_PI;
    if (abs(diff) > arcHalf) continue;
    e.hp -= dmg;
    e.flashTimer = 6;
    e.state = 'stagger';
    e.stateTimer = 8;
    let kba = atan2(e.y - p.y, e.x - p.x);
    e.x += cos(kba) * 5;
    e.y += sin(kba) * 5;
    addFloatingText(w2sX(e.x), w2sY(e.y) - 20, '-' + dmg, '#ff4444');
    spawnParticles(e.x, e.y, 'combat', 4);
    triggerScreenShake(2, 4);
  }
}

// ─── CONQUEST DRAWING ────────────────────────────────────────────────────

function drawConquestIsleDistant() {
  if (state.conquest.active) return;
  let c = state.conquest;
  let sx = w2sX(c.isleX);
  let sy = w2sY(c.isleY);
  if (sx < -350 || sx > width + 350 || sy < -350 || sy > height + 350) return;
  push();
  noStroke();
  // Mist halo — pixel rect
  fill(180, 210, 190, 25 + floor(sin(frameCount * 0.012) * 12));
  let mhW = floor(c.isleRX * 0.8), mhH = floor(c.isleRY * 0.45);
  rect(floor(sx - mhW / 2), floor(sy - mhH / 2), mhW, mhH);
  // Dark forested island body — pixel rect
  fill(35, 65, 30);
  let ibW = floor(c.isleRX * 0.55), ibH = floor(c.isleRY * 0.22);
  rect(floor(sx - ibW / 2), floor(sy + 2 - ibH / 2), ibW, ibH);
  // Beach rim — pixel rect
  fill(170, 155, 115, 80);
  let brW = floor(c.isleRX * 0.58), brH = floor(c.isleRY * 0.18);
  rect(floor(sx - brW / 2), floor(sy + 3 - brH / 2), brW, brH);
  // Tree silhouettes — stacked pixel rects
  fill(25, 55, 22);
  for (let i = -4; i <= 4; i++) {
    let th = 8 + (4 - abs(i)) * 2;
    let tx = floor(sx + i * 8);
    for (let r = 0; r < th; r += 2) {
      let w = floor(map(r, 0, th, 2, 10));
      rect(tx - floor(w / 2), floor(sy - 2 - th + r), w, 2);
    }
  }
  // Beacon fire on settled islands — pixel rects
  if (c.phase === 'settled' || c.buildings.length > 0) {
    let fl = floor(sin(frameCount * 0.12) * 2);
    fill(255, 160, 40, 140);
    rect(floor(sx - 2), floor(sy - 17 + fl), 5, 7);
    fill(255, 100, 20, 80);
    rect(floor(sx - 1), floor(sy - 18 + fl), 3, 4);
  }
  // Label
  fill(170, 160, 130, 140);
  textSize(8); textAlign(CENTER); textStyle(ITALIC);
  let label = c.phase === 'settled' ? 'Terra Nova (Settled)' :
              c.phase === 'unexplored' ? 'Terra Nova — ???' : 'Terra Nova';
  text(label, sx, sy + 22);
  textStyle(NORMAL);
  pop();
}

function drawConquestIsland() {
  let c = state.conquest;
  let ix = w2sX(c.isleX);
  let iy = w2sY(c.isleY);
  push();
  noStroke();

  // Water shadow
  fill(20, 60, 80, 40);
  ellipse(ix + 5, iy + 7, c.isleRX * 2.15, c.isleRY * 2.15);
  // Shallow water ring
  fill(55, 145, 165, 55);
  ellipse(ix, iy, c.isleRX * 2.12, c.isleRY * 2.12);
  // Shore waves
  stroke(200, 220, 255, 30 + sin(frameCount * 0.04) * 15);
  strokeWeight(1.5);
  noFill();
  ellipse(ix, iy, c.isleRX * 2.08 + sin(frameCount * 0.025) * 3, c.isleRY * 2.08 + sin(frameCount * 0.025) * 2);
  noStroke();
  // Beach
  fill(195, 180, 135);
  ellipse(ix, iy, c.isleRX * 2, c.isleRY * 2);
  // Beach detail — darker sand patches
  fill(180, 165, 120, 60);
  for (let i = 0; i < 8; i++) {
    let ba = (i / 8) * TWO_PI + 1.1;
    let br = c.isleRX * 0.94;
    ellipse(ix + cos(ba) * br, iy + sin(ba) * br * 0.69, 12, 6);
  }
  // Grass
  fill(60, 105, 42);
  ellipse(ix, iy, c.isleRX * 1.85, c.isleRY * 1.85);
  // Lighter meadow center (cleared area)
  let clearRadius = map(c.trees.filter(t => !t.alive).length, 0, c.trees.length, 0.3, 1.2);
  fill(70, 120, 48, 60);
  ellipse(ix, iy + c.isleRY * 0.15, c.isleRX * clearRadius, c.isleRY * clearRadius * 0.7);

  // Phase atmosphere
  if (c.phase === 'landing' || c.phase === 'unexplored') {
    // Edge mist
    fill(140, 160, 140, 18 + sin(frameCount * 0.02) * 8);
    ellipse(ix, iy, c.isleRX * 2, c.isleRY * 2);
  } else if (c.phase === 'defending') {
    // Red danger tinge at edges
    fill(180, 40, 30, 10 + sin(frameCount * 0.05) * 6);
    ellipse(ix, iy, c.isleRX * 2.1, c.isleRY * 2.1);
  } else if (c.phase === 'settled') {
    // Golden glow
    fill(255, 220, 100, 8);
    ellipse(ix, iy, c.isleRX * 1.5, c.isleRY * 1.5);
  }

  // Grass tufts
  fill(75, 130, 50, 70);
  for (let i = 0; i < 25; i++) {
    let ga = (i / 25) * TWO_PI + i * 2.3;
    let gr = (i % 5 + 1.5) * c.isleRX * 0.11;
    ellipse(ix + cos(ga) * gr, iy + sin(ga) * gr * 0.69, 7, 3);
  }

  // Y-sorted: trees + buildings
  let sortItems = [];
  for (let t of (c.trees || [])) {
    if (!t || isNaN(t.y)) continue;
    sortItems.push({ y: t.y, draw: () => { try { drawConquestTree(t); } catch(e) { /* skip */ } } });
  }
  for (let b of (c.buildings || [])) {
    if (!b || isNaN(b.y)) continue;
    sortItems.push({ y: b.y + 8, draw: () => { try { drawConquestBuilding(b); } catch(e) { /* skip */ } } });
  }
  sortItems.sort((a, b) => a.y - b.y);
  for (let it of sortItems) it.draw();

  // Build ghost (if in build mode)
  if (c.buildMode) drawConquestBuildGhost();

  // Parked ship at south shore dock — only when player is on the island
  if (!c.active) { pop(); return; }
  let shipX = c.shipX || c.isleX;
  let shipY = c.shipY || (c.isleY + c.isleRY * 0.92 + 15);
  let bsx = w2sX(shipX);
  let bsy = w2sY(shipY);
  let bob = sin(frameCount * 0.03) * 1.5;
  // Docked warship — side-view trireme matching sailing ship style
  push();
  translate(bsx, bsy + bob);
  noStroke();

  // Water around hull — gentle lapping
  let wt = frameCount * 0.03;
  for (let i = 0; i < 4; i++) {
    let wakeX = -55 - i * 8 + sin(wt + i) * 2;
    fill(180, 210, 230, 30 - i * 5);
    ellipse(wakeX, 8, 14 - i, 3);
  }
  fill(200, 225, 240, 20 + sin(wt * 1.5) * 10);
  ellipse(60, 3, 10, 4);
  // Hull reflection
  fill(40, 70, 100, 20);
  ellipse(0, 16, 110, 12);

  // --- TRIREME HULL ---
  fill(75, 45, 20);
  beginShape();
  vertex(-55, 0);
  vertex(-50, 10);
  vertex(40, 10);
  vertex(55, 4);
  vertex(60, -2);
  vertex(50, -4);
  vertex(-45, -4);
  vertex(-52, -2);
  endShape(CLOSE);

  // Hull planking
  stroke(90, 55, 25, 80);
  strokeWeight(0.6);
  line(-48, 2, 50, 2);
  line(-46, 6, 45, 6);
  noStroke();

  // Bronze ram
  fill(160, 120, 40);
  beginShape();
  vertex(50, -3); vertex(65, -1); vertex(50, 3);
  endShape(CLOSE);
  fill(180, 140, 50, 150);
  triangle(52, -2, 62, -1, 52, 1);

  // Oar bank (resting — angled down)
  stroke(100, 70, 35);
  strokeWeight(1.2);
  for (let i = 0; i < 8; i++) {
    let ox = -38 + i * 10;
    let oarLen = 12;
    line(ox, 8, ox - 2, 8 + oarLen);
  }
  noStroke();

  // Deck
  fill(100, 68, 32);
  rect(-48, -6, 96, 5, 1);
  // Deck rail
  fill(85, 55, 25);
  rect(-48, -8, 96, 2, 1);

  // Shields along rail
  for (let i = 0; i < 8; i++) {
    let shx = -40 + i * 11;
    fill(140, 30, 25);
    ellipse(shx, -8, 6, 6);
    fill(180, 160, 60);
    ellipse(shx, -8, 2.5, 2.5);
  }

  // --- MAST + FURLED SAIL ---
  // Mast
  fill(90, 60, 28);
  rect(-2, -45, 4, 39, 1);
  // Yard arm
  fill(80, 52, 24);
  rect(-24, -43, 48, 3, 1);
  // Furled sail on yard
  fill(220, 205, 175, 200);
  rect(-22, -41, 44, 5, 2);
  // Red stripe on furled sail
  fill(160, 40, 30, 160);
  rect(-22, -39, 44, 2, 1);

  // Rigging
  stroke(100, 80, 50, 80);
  strokeWeight(0.8);
  line(0, -45, -48, -6);
  line(0, -45, 48, -6);
  line(0, -45, 0, -6);
  noStroke();

  // Stern post (curved)
  noFill();
  stroke(120, 80, 30);
  strokeWeight(2.5);
  beginShape();
  vertex(-50, -4);
  quadraticVertex(-56, -18, -48, -28);
  endShape();
  noStroke();
  // Eagle standard
  fill(180, 140, 50);
  ellipse(-48, -30, 6, 6);
  fill(200, 160, 60);
  triangle(-51, -30, -45, -30, -48, -35);

  // Stern cabin
  fill(80, 50, 22);
  rect(-52, -6, 12, 8, 1);
  fill(95, 65, 30);
  rect(-51, -5, 10, 6, 1);
  // Cabin window
  fill(140, 170, 180, 80);
  rect(-48, -3, 4, 2, 0.5);

  // Flag at mast top
  let flagWave = sin(frameCount * 0.04) * 3;
  fill(160, 40, 30);
  beginShape();
  vertex(0, -45);
  vertex(0, -53);
  vertex(12 + flagWave, -49);
  endShape(CLOSE);

  // Anchor hanging from bow
  stroke(120, 120, 120);
  strokeWeight(1.5);
  line(45, 4, 45, 14);
  noStroke();
  fill(100, 100, 100);
  ellipse(45, 15, 4, 4);
  // Anchor arms
  stroke(100, 100, 100);
  strokeWeight(1);
  line(43, 14, 40, 18);
  line(47, 14, 50, 18);
  noStroke();

  pop();
  // Board ship prompt when player is near
  let p = state.player;
  let dShip = dist(p.x, p.y, shipX, shipY);
  if (dShip < 70) {
    fill(220, 210, 170, 200 + sin(frameCount * 0.08) * 30);
    textSize(10); textAlign(CENTER);
    text('[E] Board Ship', bsx, bsy - 22);
  }

  pop();
}

function drawConquestTree(t) {
  let sx = w2sX(t.x);
  let sy = w2sY(t.y);
  let sz = t.size || 1;
  push();
  noStroke();
  if (t.alive) {
    // Highlight if this is the chop target
    let isTarget = state.conquest.chopTarget === t;
    // Shadow
    fill(0, 0, 0, 25);
    ellipse(sx + 2, sy + 4, 18 * sz, 7 * sz);
    // Trunk
    fill(isTarget ? 140 : 85, isTarget ? 100 : 60, isTarget ? 60 : 32);
    rect(sx - 2 * sz, sy - 14 * sz, 4 * sz, 18 * sz);
    // Foliage layers
    fill(35 + (isTarget ? 20 : 0), 90, 28);
    triangle(sx - 11 * sz, sy - 9 * sz, sx + 11 * sz, sy - 9 * sz, sx, sy - 30 * sz);
    fill(45 + (isTarget ? 20 : 0), 108, 33);
    triangle(sx - 9 * sz, sy - 16 * sz, sx + 9 * sz, sy - 16 * sz, sx, sy - 33 * sz);
    fill(55 + (isTarget ? 20 : 0), 118, 38);
    triangle(sx - 6 * sz, sy - 22 * sz, sx + 6 * sz, sy - 22 * sz, sx, sy - 35 * sz);
    // Damage marks
    if (t.hp < t.maxHp) {
      stroke(200, 150, 80, 180);
      strokeWeight(1.2);
      for (let ch = 0; ch < (t.maxHp - t.hp); ch++) {
        line(sx - 1 + ch * 3, sy - 6 + ch * 2, sx + 2 + ch * 3, sy - 2 + ch * 2);
      }
      noStroke();
    }
    // Chop progress indicator
    if (isTarget) {
      let prog = state.conquest.chopTimer / 25;
      fill(40, 40, 40, 140);
      rect(sx - 10, sy + 8, 20, 3, 1);
      fill(200, 160, 60);
      rect(sx - 10, sy + 8, 20 * prog, 3, 1);
    }
  } else {
    // Stump
    fill(75, 50, 28);
    ellipse(sx, sy, 9 * sz, 6 * sz);
    rect(sx - 4 * sz, sy - 5 * sz, 8 * sz, 6 * sz, 1);
    // Rings on stump top
    noFill(); stroke(100, 75, 45, 80); strokeWeight(0.5);
    ellipse(sx, sy - 3 * sz, 4 * sz, 3 * sz);
    noStroke();
    // Scattered chips
    fill(110, 80, 45, 60);
    ellipse(sx - 6, sy + 2, 3, 2);
    ellipse(sx + 5, sy + 1, 2, 3);
    ellipse(sx - 3, sy + 4, 2, 2);
  }
  pop();
}

function drawConquestBuilding(b) {
  let sx = w2sX(b.x);
  let sy = w2sY(b.y);
  push();
  noStroke();
  // Shadow
  fill(0, 0, 0, 20);
  ellipse(sx + 2, sy + 4, 30, 10);

  switch (b.type) {
    case 'campfire': {
      // Stone ring
      fill(120, 110, 95);
      for (let i = 0; i < 8; i++) {
        let a = (i / 8) * TWO_PI;
        ellipse(sx + cos(a) * 9, sy + sin(a) * 6, 6, 5);
      }
      // Logs
      fill(90, 65, 35);
      push(); translate(sx, sy); rotate(0.3);
      rect(-8, -1, 16, 3, 1);
      rotate(-0.6);
      rect(-7, -1, 14, 3, 1);
      pop();
      // Fire
      let fl = sin(frameCount * 0.15) * 2;
      fill(255, 180, 40, 200);
      ellipse(sx, sy - 5 + fl, 12, 16);
      fill(255, 100, 20, 160);
      ellipse(sx + sin(frameCount * 0.2) * 1, sy - 8 + fl, 7, 11);
      fill(255, 60, 10, 100);
      ellipse(sx, sy - 10 + fl, 3, 6);
      // Embers
      if (frameCount % 12 < 6) {
        fill(255, 200, 80, 100);
        ellipse(sx + sin(frameCount * 0.08) * 4, sy - 14 + fl, 2, 2);
      }
      // Ground glow
      fill(255, 140, 40, 15);
      ellipse(sx, sy, 60, 40);
      break;
    }
    case 'palisade': {
      // Posts with variation
      for (let i = -3; i <= 3; i++) {
        let h = 20 + (i % 2) * 3;
        fill(95 + i * 3, 65 + i * 2, 32);
        rect(sx + i * 6 - 2, sy - h, 5, h + 4);
        // Pointed top
        fill(85, 58, 28);
        triangle(sx + i * 6 - 2, sy - h, sx + i * 6 + 3, sy - h, sx + i * 6 + 0.5, sy - h - 5);
      }
      // Cross beams
      fill(80, 55, 28);
      rect(sx - 20, sy - 12, 40, 3, 1);
      rect(sx - 19, sy - 6, 38, 2, 1);
      break;
    }
    case 'hut': {
      // Warm limestone walls
      fill(195, 178, 148);
      rect(sx - 16, sy - 10, 32, 18);
      // Wall stone texture — pixel blocks
      fill(180, 162, 132, 80);
      for (let i = 0; i < 3; i++) rect(sx - 14 + i * 11, sy - 8, 8, 14);
      fill(205, 188, 158, 40);
      rect(sx - 12, sy - 6, 6, 4); // light stone highlight
      // Door — warm wood
      fill(95, 68, 38);
      rect(sx - 4, sy - 4, 9, 12);
      fill(75, 52, 28);
      rect(sx - 2, sy - 2, 2, 10); // plank line
      fill(180, 150, 70);
      rect(sx + 3, sy + 1, 2, 2); // handle
      // Terracotta tile roof
      fill(185, 88, 48);
      beginShape();
      vertex(sx - 20, sy - 10);
      vertex(sx, sy - 26);
      vertex(sx + 20, sy - 10);
      endShape(CLOSE);
      // Roof tile rows — pixel terracotta
      fill(170, 78, 42);
      for (let ri = 0; ri < 3; ri++) {
        let ry2 = sy - 10 - ri * 5;
        let rw = 18 - ri * 5;
        rect(sx - rw, ry2, rw * 2, 2);
      }
      // Roof ridge — darker
      fill(155, 68, 35);
      rect(sx - 3, sy - 27, 6, 3);
      // Window with warm light
      fill(235, 200, 130, 160);
      rect(sx + 8, sy - 6, 6, 6);
      fill(250, 220, 150, 70);
      rect(sx + 6, sy - 8, 10, 10); // window glow
      break;
    }
    case 'watchtower': {
      // Base — warm sandstone
      fill(165, 148, 115);
      rect(sx - 9, sy - 8, 18, 16);
      // Tower body
      fill(178, 160, 125);
      rect(sx - 7, sy - 36, 14, 30);
      // Stone block texture
      fill(155, 138, 105, 70);
      for (let i = 0; i < 4; i++) {
        rect(sx - 5, sy - 30 + i * 7, 10, 5);
      }
      // Platform
      fill(148, 132, 100);
      rect(sx - 12, sy - 38, 24, 4);
      // Crenellations
      fill(138, 122, 92);
      for (let i = -1; i <= 1; i++) {
        rect(sx + i * 8 - 3, sy - 43, 5, 5);
      }
      // Flag — crimson SPQR
      fill(185, 38, 28, 210);
      let fw = sin(frameCount * 0.05) * 2.5;
      rect(sx + 8, sy - 50, 2, 14);
      triangle(sx + 10, sy - 50, sx + 20 + fw, sy - 47, sx + 10, sy - 44);
      break;
    }
    case 'barracks': {
      // Large building — warm limestone
      fill(175, 155, 118);
      rect(sx - 22, sy - 12, 44, 22);
      // Stone foundation — darker
      fill(148, 135, 108);
      rect(sx - 23, sy + 8, 46, 4);
      // Door (wide)
      fill(80, 55, 30);
      rect(sx - 6, sy - 6, 12, 16, 1);
      // Barracks emblem
      fill(160, 40, 30);
      ellipse(sx, sy - 10, 6, 6);
      fill(200, 180, 80);
      rect(sx - 0.5, sy - 13, 1, 6);
      // Roof
      fill(105, 75, 38);
      beginShape();
      vertex(sx - 26, sy - 12);
      vertex(sx, sy - 30);
      vertex(sx + 26, sy - 12);
      endShape(CLOSE);
      // Windows
      fill(200, 180, 120, 130);
      rect(sx - 16, sy - 6, 5, 5, 1);
      rect(sx + 12, sy - 6, 5, 5, 1);
      // Weapon rack detail
      fill(150, 140, 120);
      rect(sx + 16, sy - 4, 2, 10);
      rect(sx + 19, sy - 2, 2, 8);
      break;
    }
  }
  pop();
}

function drawConquestBuildGhost() {
  let c = state.conquest;
  let bp = CONQUEST_BUILDINGS[c.buildType];
  if (!bp) return;
  let wx = s2wX(mouseX);
  let wy = s2wY(mouseY);
  let sx = w2sX(wx);
  let sy = w2sY(wy);
  let valid = isOnConquestIsland(wx, wy) && c.woodPile >= bp.cost;
  // Check tree/building proximity
  if (valid) {
    for (let t of c.trees) { if (t.alive && dist(wx, wy, t.x, t.y) < 18) { valid = false; break; } }
  }
  if (valid) {
    for (let b of c.buildings) { if (dist(wx, wy, b.x, b.y) < 28) { valid = false; break; } }
  }
  push();
  drawingContext.globalAlpha = valid ? 0.5 : 0.25;
  drawConquestBuilding({ x: wx, y: wy, type: c.buildType });
  drawingContext.globalAlpha = 1;
  // Ring
  noFill();
  if (valid) {
    stroke(0, 255, 136, 90 + sin(frameCount * 0.1) * 40);
    let pulse = 1 + sin(frameCount * 0.08) * 0.04;
    strokeWeight(1.5);
    ellipse(sx, sy, 36 * pulse, 24 * pulse);
  } else {
    stroke(255, 60, 60, 70);
    strokeWeight(1.5);
    ellipse(sx, sy, 36, 24);
    stroke(255, 60, 60, 120);
    strokeWeight(2);
    line(sx - 6, sy - 4, sx + 6, sy + 4);
    line(sx + 6, sy - 4, sx - 6, sy + 4);
  }
  noStroke();
  pop();
}

function drawConquestSoldier(s) {
  let sx = w2sX(s.x);
  let sy = w2sY(s.y);
  if (s.hp <= 0) return;
  push();
  translate(floor(sx), floor(sy));
  noStroke();
  let f = s.flashTimer > 0;
  // Pixel shadow
  fill(0, 0, 0, 25);
  rect(-7, 6, 14, 2);
  // Pixel legs
  fill(f ? 255 : 120, f ? 255 : 100, f ? 255 : 70);
  let leg = floor(sin(frameCount * 0.12 + s.x) * 1.5);
  rect(-3, 4 + leg, 2, 6);
  rect(1, 4 - leg, 2, 6);
  // Pixel body (red tunic)
  fill(f ? 255 : 160, f ? 255 : 45, f ? 255 : 35);
  rect(-6, -6, 12, 12);
  // Pixel armor plate
  fill(f ? 255 : 170, f ? 255 : 160, f ? 255 : 135);
  rect(-4, -5, 8, 8);
  // Pixel head
  fill(f ? 255 : 200, f ? 255 : 175, f ? 255 : 135);
  rect(-4, -12, 8, 6);
  // Pixel helmet
  fill(f ? 255 : 155, f ? 255 : 145, f ? 255 : 120);
  rect(-5, -14, 10, 4);
  // Pixel plume
  fill(f ? 255 : 180, f ? 255 : 30, f ? 255 : 20);
  rect(-1, -18, 2, 4);
  // Pixel shield
  fill(f ? 255 : 140, f ? 255 : 35, f ? 255 : 25);
  rect(-s.facing * 8 - 3, -4, 6, 10);
  fill(f ? 255 : 180, f ? 255 : 160, f ? 255 : 80);
  rect(-s.facing * 8 - 1, -1, 2, 4);
  // Pixel sword
  fill(f ? 255 : 195, f ? 255 : 195, f ? 255 : 205);
  rect(s.facing * 6, -10, 2, 12);
  // Pixel eyes
  fill(30);
  rect(-3, -11, 2, 2);
  rect(1, -11, 2, 2);
  // HP bar
  if (s.hp < s.maxHp) {
    fill(40, 15, 15, 160);
    rect(-10, -20, 20, 3);
    fill(80, 180, 50);
    rect(-10, -20, floor(20 * (s.hp / s.maxHp)), 3);
  }
  pop();
}

function drawConquestEntities() {
  let c = state.conquest;
  let p = state.player;
  if (!c) return;
  let items = [];
  for (let e of (c.enemies || [])) {
    if (!e || isNaN(e.y)) continue;
    items.push({ y: e.y, draw: () => { try { drawOneEnemy(e); } catch(err) { /* skip */ } } });
  }
  for (let s of (c.soldiers || [])) {
    if (!s || s.hp <= 0 || isNaN(s.y)) continue;
    items.push({ y: s.y, draw: () => { try { drawConquestSoldier(s); } catch(err) { /* skip */ } } });
  }
  for (let w of (c.workers || [])) {
    if (!w || isNaN(w.y)) continue;
    items.push({ y: w.y, draw: () => { try { drawConquestWorker(w); } catch(err) { /* skip */ } } });
  }
  // Centurion on conquest island
  items.push({ y: state.centurion.y, draw: drawCenturion });
  // Draw blueprint ghosts
  for (let bp of c.blueprintQueue) {
    let bpx = w2sX(bp.x), bpy = w2sY(bp.y);
    items.push({ y: bp.y, draw: () => {
      push();
      let prog = bp.progress / bp.maxProgress;
      tint(255, 100 + 155 * prog);
      // Translucent outline of building
      fill(200, 180, 120, 60 + 120 * prog);
      stroke(255, 200, 100, 80);
      strokeWeight(1);
      rect(bpx - 12, bpy - 12, 24, 24, 3);
      noStroke();
      // Progress bar
      let barW = 20;
      fill(40, 40, 40, 150);
      rect(bpx - barW/2, bpy + 14, barW, 3, 1);
      fill(100, 220, 100);
      rect(bpx - barW/2, bpy + 14, barW * prog, 3, 1);
      // Label
      fill(200, 180, 120, 160);
      textSize(6); textAlign(CENTER);
      let bpDef = CONQUEST_BUILDINGS[bp.type];
      text(bpDef ? bpDef.name : bp.type, bpx, bpy + 22);
      pop();
    }});
  }
  items.push({ y: p.y, draw: () => {
    if (p.invincTimer > 0 && frameCount % 4 < 2) return;
    drawPlayer();
  }});
  items.sort((a, b) => a.y - b.y);
  for (let it of items) it.draw();
  drawSlashArc();
}

function drawConquestHUD() {
  let p = state.player;
  let c = state.conquest;
  push();

  // HP Bar (top center)
  let barW = 200, barH = 14;
  let barX = width / 2 - barW / 2, barY = 12;
  fill(30, 10, 10, 200);
  rect(barX - 2, barY - 2, barW + 4, barH + 4, 5);
  fill(60, 20, 15);
  rect(barX, barY, barW, barH, 4);
  let hpFrac = max(0, p.hp / p.maxHp);
  let hpCol = hpFrac > 0.5 ? color(180, 50, 30) : (hpFrac > 0.25 ? color(200, 120, 20) : color(220, 40, 40));
  fill(hpCol);
  rect(barX, barY, barW * hpFrac, barH, 4);
  fill(255); textSize(9); textAlign(CENTER, CENTER);
  text('HP ' + max(0, floor(p.hp)) + ' / ' + p.maxHp, width / 2, barY + barH / 2);

  // Danger bar (top center, below HP)
  let dangerY = barY + barH + 6;
  let dangerW = 160, dangerH = 8;
  let dangerX = width / 2 - dangerW / 2;
  let dangerFrac = min(1, c.expeditionTimer / c.expeditionTimeLimit);
  fill(20, 15, 10, 180);
  rect(dangerX - 1, dangerY - 1, dangerW + 2, dangerH + 2, 3);
  // Gradient: green->yellow->red
  let dr = dangerFrac < 0.5 ? lerp(60, 220, dangerFrac * 2) : lerp(220, 255, (dangerFrac - 0.5) * 2);
  let dg = dangerFrac < 0.5 ? lerp(180, 180, dangerFrac * 2) : lerp(180, 40, (dangerFrac - 0.5) * 2);
  fill(dr, dg, 30);
  rect(dangerX, dangerY, dangerW * dangerFrac, dangerH, 2);
  fill(255, 240, 200, 200); textSize(7); textAlign(CENTER, CENTER);
  text('DANGER ' + c.dangerLevel, width / 2, dangerY + dangerH / 2);

  // Danger warning effects
  if (dangerFrac > 0.75) {
    // Red pulsing border
    let pa = sin(frameCount * 0.08) * 40 + 40;
    noFill();
    stroke(255, 40, 20, pa);
    strokeWeight(3);
    rect(0, 0, width, height);
    noStroke();
  }
  if (dangerFrac >= 1.0) {
    // NIGHTFALL text
    fill(255, 60, 30, 180 + sin(frameCount * 0.1) * 50);
    textSize(14); textAlign(CENTER);
    text('NIGHTFALL', width / 2, dangerY + dangerH + 16);
  } else if (dangerFrac > 0.5) {
    fill(220, 180, 80, 140); textSize(8); textAlign(CENTER);
    text('Danger rising...', width / 2, dangerY + dangerH + 12);
  }

  // Phase objective
  let phaseY = dangerY + dangerH + 22;
  fill(180, 170, 140, 140); textSize(9); textAlign(CENTER);
  if (c.colonized) {
    fill(130, 200, 130, 180);
    text('Colony LV.' + c.colonyLevel + ' — Peaceful', width / 2, phaseY);
    if (state.imperialBridge.built) {
      fill(200, 180, 100, 150); textSize(8);
      text('[E] near east shore to return via bridge', width / 2, phaseY + 14);
    }
  } else {
    text(getPhaseObjective(c.phase), width / 2, phaseY);
  }

  // Expedition number + modifier
  let modInfo = getModifier();
  fill(200, 190, 160, 100); textSize(7);
  let expLabel = 'Expedition #' + c.expeditionNum;
  if (state.expeditionModifier && state.expeditionModifier !== 'normal') {
    expLabel += '  [' + modInfo.name + ']';
  }
  fill(modInfo.color || '#bbbbbb');
  text(expLabel, width / 2, phaseY + 12);

  // Left panel — resources
  let lx = 12, ly = 12;
  fill(20, 20, 20, 160);
  rect(lx - 4, ly - 4, 130, 100, 5);
  fill(200, 180, 130); textSize(9); textAlign(LEFT, TOP);
  // Wood
  fill(160, 120, 60); rect(lx, ly, 8, 8, 1);
  fill(220, 200, 150); text('Wood: ' + c.woodPile, lx + 12, ly);
  // Soldiers
  fill(180, 50, 40); rect(lx, ly + 13, 8, 8, 1);
  fill(220, 200, 150);
  let aliveSoldiers = c.soldiers.filter(s => s.hp > 0).length;
  text('Soldiers: ' + aliveSoldiers, lx + 12, ly + 13);
  // Workers
  fill(140, 110, 70); rect(lx, ly + 26, 8, 8, 1);
  fill(220, 200, 150);
  text('Workers: ' + c.workers.length, lx + 12, ly + 26);
  // Trees
  let livingTrees = c.trees.filter(t => t.alive).length;
  fill(50, 100, 35); rect(lx, ly + 39, 8, 8, 1);
  fill(220, 200, 150); text('Trees: ' + livingTrees, lx + 12, ly + 39);
  // Buildings
  fill(140, 120, 80); rect(lx, ly + 52, 8, 8, 1);
  fill(220, 200, 150); text('Built: ' + c.buildings.length + ' | Queue: ' + c.blueprintQueue.length, lx + 12, ly + 52);
  // Gold
  fill(200, 180, 60); rect(lx, ly + 65, 8, 8, 1);
  fill(220, 200, 150); text('Gold: ' + state.gold, lx + 12, ly + 65);
  // Loot bag count
  fill(180, 140, 200); rect(lx, ly + 78, 8, 8, 1);
  fill(220, 200, 150); text('Loot: ' + c.lootBag.length + ' items', lx + 12, ly + 78);

  // Potion
  if (p.potions > 0) {
    fill(100, 220, 100, 180); textSize(8);
    text('Potions: ' + p.potions + ' [Q]', lx, ly + 93);
  }

  // Bottom bar — equipment + controls
  fill(20, 20, 20, 120);
  rect(0, height - 26, width, 26);
  fill(160, 150, 130, 140); textSize(8); textAlign(RIGHT, BOTTOM);
  text(WEAPONS[p.weapon].name + ' | ' + ARMORS[p.armor].name, width - 10, height - 14);
  fill(130, 120, 100, 120);
  text('WASD move | SPACE attack | SHIFT dash | B build | Q potion | E board ship (near dock)', width - 10, height - 3);

  // Build mode UI
  if (c.buildMode) drawConquestBuildUI();

  pop();
}

function drawConquestBuildUI() {
  let c = state.conquest;
  let types = Object.keys(CONQUEST_BUILDINGS);
  let slotW = 80, slotH = 50;
  let totalW = types.length * slotW + (types.length - 1) * 4;
  let startX = width / 2 - totalW / 2;
  let startY = height - 85;

  // Background
  push();
  fill(20, 20, 20, 180);
  rect(startX - 8, startY - 6, totalW + 16, slotH + 12, 6);

  for (let i = 0; i < types.length; i++) {
    let t = types[i];
    let bp = CONQUEST_BUILDINGS[t];
    let tx = startX + i * (slotW + 4);
    let selected = c.buildType === t;
    let canAfford = c.woodPile >= bp.cost;

    // Slot bg
    fill(selected ? color(60, 80, 50, 200) : color(40, 40, 40, 160));
    stroke(selected ? color(120, 200, 100, 180) : color(80, 70, 60, 80));
    strokeWeight(selected ? 2 : 1);
    rect(tx, startY, slotW, slotH, 4);
    noStroke();

    // Key hint
    fill(selected ? 255 : 160); textSize(8); textAlign(CENTER, TOP);
    text('[' + bp.key + ']', tx + slotW / 2, startY + 2);
    // Name
    fill(canAfford ? (selected ? 255 : 200) : color(120, 80, 80));
    textSize(8);
    text(bp.name, tx + slotW / 2, startY + 12);
    // Cost
    fill(canAfford ? color(180, 160, 100) : color(160, 60, 50));
    textSize(7);
    text(bp.cost + ' wood', tx + slotW / 2, startY + 23);
    // Desc
    fill(140, 130, 110, 140); textSize(6);
    text(bp.desc, tx + slotW / 2, startY + 33);
    // Soldiers bonus
    if (bp.soldiers > 0) {
      fill(100, 200, 100, 160); textSize(6);
      text('+' + bp.soldiers + ' soldier' + (bp.soldiers > 1 ? 's' : ''), tx + slotW / 2, startY + 41);
    }
  }
  pop();
}

// ─── COLONY OVERLAY — draws colony buildings/farms on settled Terra Nova ──
function drawColonyOverlay() {
  let c = state.conquest;
  if (!c.colonized || state.conquest.active) return;
  let sx = w2sX(c.isleX), sy = w2sY(c.isleY);
  if (sx < -500 || sx > width + 500 || sy < -500 || sy > height + 500) return;
  let bright = getSkyBrightness();

  push();
  noStroke();

  // Colony grass tufts
  if (c.colonyGrassTufts) {
    for (let g of c.colonyGrassTufts) {
      let gx = w2sX(g.x), gy = w2sY(g.y);
      let sway = sin(frameCount * 0.03 + g.sway) * 2;
      fill(lerpColor(color(50, 90, 40), color(80, 140, 60), bright * g.hue));
      for (let b = 0; b < g.blades; b++) {
        let bx = gx + (b - g.blades / 2) * 2 + sway;
        rect(floor(bx), floor(gy - g.height), 1, floor(g.height));
      }
    }
  }

  // Colony farms — simplified view from distance
  for (let p of c.colonyPlots) {
    let px = w2sX(p.x), py = w2sY(p.y);
    // Soil
    fill(lerpColor(color(60, 45, 25), color(100, 80, 50), bright));
    rect(floor(px), floor(py), floor(p.w * 0.6), floor(p.h * 0.6), 1);
    // Crops if planted
    if (p.planted && p.stage > 0) {
      let cropH = p.stage * 3;
      fill(lerpColor(color(50, 100, 30), color(100, 180, 60), bright));
      for (let ci = 0; ci < 3; ci++) {
        rect(floor(px + 3 + ci * 5), floor(py + p.h * 0.3 - cropH), 2, cropH);
      }
    }
  }

  // Colony buildings
  for (let b of c.colonyBuildings) {
    let bx = w2sX(b.x), by = w2sY(b.y);
    let bw, bh;
    switch (b.type) {
      case 'forum':
        bw = 40; bh = 30;
        // Stone base
        fill(lerpColor(color(140, 130, 110), color(200, 190, 170), bright));
        rect(floor(bx - bw / 2), floor(by - bh / 2), bw, bh, 2);
        // Columns
        fill(lerpColor(color(180, 170, 155), color(230, 220, 200), bright));
        rect(floor(bx - bw / 2 + 4), floor(by - bh / 2 - 8), 3, 12);
        rect(floor(bx + bw / 2 - 7), floor(by - bh / 2 - 8), 3, 12);
        rect(floor(bx - 2), floor(by - bh / 2 - 8), 3, 12);
        // Roof
        fill(lerpColor(color(160, 80, 40), color(200, 120, 60), bright));
        triangle(bx - bw / 2 - 2, by - bh / 2 - 6, bx + bw / 2 + 2, by - bh / 2 - 6, bx, by - bh / 2 - 20);
        // Label
        fill(255, 240, 200, 150); textSize(6); textAlign(CENTER);
        text('FORUM', bx, by + bh / 2 + 8);
        break;
      case 'granary':
        bw = 24; bh = 20;
        fill(lerpColor(color(130, 100, 50), color(180, 150, 80), bright));
        rect(floor(bx - bw / 2), floor(by - bh / 2), bw, bh, 1);
        fill(lerpColor(color(100, 70, 30), color(150, 120, 60), bright));
        rect(floor(bx - bw / 2), floor(by - bh / 2 - 6), bw + 4, 6, 1);
        break;
      case 'market':
        bw = 30; bh = 18;
        fill(lerpColor(color(160, 140, 100), color(220, 200, 160), bright));
        rect(floor(bx - bw / 2), floor(by - bh / 2), bw, bh, 1);
        fill(200, 60, 40, 150);
        rect(floor(bx - bw / 2 - 2), floor(by - bh / 2 - 8), bw + 4, 8);
        break;
      case 'temple':
        bw = 28; bh = 24;
        fill(lerpColor(color(180, 175, 165), color(240, 235, 225), bright));
        rect(floor(bx - bw / 2), floor(by - bh / 2), bw, bh, 1);
        fill(lerpColor(color(200, 195, 185), color(250, 245, 235), bright));
        for (let ci = 0; ci < 3; ci++) {
          rect(floor(bx - bw / 2 + 4 + ci * 10), floor(by - bh / 2 - 10), 3, 14);
        }
        triangle(bx - bw / 2 - 2, by - bh / 2 - 8, bx + bw / 2 + 2, by - bh / 2 - 8, bx, by - bh / 2 - 22);
        break;
      default:
        bw = 22; bh = 18;
        fill(lerpColor(color(120, 110, 95), color(170, 160, 140), bright));
        rect(floor(bx - bw / 2), floor(by - bh / 2), bw, bh, 1);
        fill(lerpColor(color(140, 80, 40), color(180, 110, 60), bright));
        rect(floor(bx - bw / 2 - 1), floor(by - bh / 2 - 5), bw + 2, 5, 1);
        break;
    }
  }

  // Colony label
  fill(255, 230, 180, 180); textSize(9); textAlign(CENTER);
  let labelY = sy - floor(c.isleRY * 0.55);
  text('Colony LV.' + c.colonyLevel, sx, labelY);
  fill(200, 190, 150, 120); textSize(7);
  text(c.colonyWorkers + ' workers  +' + c.colonyIncome + 'g/day', sx, labelY + 12);
  textAlign(LEFT, TOP);

  pop();
}

// ─── HUD ──────────────────────────────────────────────────────────────────
// Track resource changes for HUD pop animation
let _hudPrev = {};
function trackHudResource(key, val) {
  if (_hudPrev[key] !== undefined && _hudPrev[key] !== val) {
    hudFlash[key] = { timer: 15, delta: val - _hudPrev[key] };
  }
  _hudPrev[key] = val;
}
function drawHudResource(x, y, label, val, col, key) {
  trackHudResource(key, val);
  let flash = hudFlash[key];
  let sc = 1, flashAlpha = 0;
  if (flash && flash.timer > 0) {
    let t = flash.timer / 15;
    sc = 1 + 0.15 * t;
    flashAlpha = t;
    flash.timer--;
  }
  push();
  translate(x, y);
  scale(sc);
  fill(col);
  textSize(9);
  textAlign(LEFT, TOP);
  text(label + val, 0, 0);
  // Gold flash pulse on change
  if (flashAlpha > 0) {
    let pulse = 0.5 + 0.5 * sin(flashAlpha * PI);
    fill(255, 200, 60, 160 * flashAlpha * pulse);
    text(label + val, 0, 0);
  }
  pop();
}

// ═══ EMPIRE DASHBOARD (Tab key) ═════════════════════════════════════════
function drawEmpireDashboard() {
  if (!empireDashOpen) return;
  noStroke(); fill(0, 0, 0, 200); rect(0, 0, width, height);
  let pw = min(width - 40, 560), ph = min(height - 40, 420);
  let px = (width - pw) / 2, py = (height - ph) / 2;
  fill(35, 28, 18, 245); rect(px, py, pw, ph, 6);
  fill(50, 40, 28, 40); rect(px + 2, py + 2, pw - 4, ph * 0.25, 4, 4, 0, 0);
  stroke(180, 145, 70, 220); strokeWeight(2); noFill(); rect(px, py, pw, ph, 6);
  stroke(120, 95, 55, 80); strokeWeight(0.5); rect(px + 6, py + 6, pw - 12, ph - 12, 4); noStroke();
  fill(180, 145, 70, 140);
  rect(px+4,py+4,5,5); rect(px+pw-9,py+4,5,5); rect(px+4,py+ph-9,5,5); rect(px+pw-9,py+ph-9,5,5);
  fill(212, 175, 80); textAlign(CENTER, TOP); textSize(14);
  text('IMPERIUM ROMANUM', width/2, py+14);
  let rkT = state.islandLevel>=25?'IMPERATOR':state.islandLevel>=20?'CONSUL':state.islandLevel>=15?'SENATOR':state.islandLevel>=10?'GOVERNOR':'CITIZEN';
  fill(160,140,100); textSize(8); text(rkT+' \u2014 Island Level '+state.islandLevel, width/2, py+32);
  stroke(120,95,55,80); strokeWeight(0.5); line(px+20,py+46,px+pw-20,py+46); noStroke();
  let mX=px+14,mY=py+54,mW=pw*0.45,mH=ph*0.5;
  fill(20,25,35,200); rect(mX,mY,mW,mH,4);
  stroke(100,85,55,100); strokeWeight(0.5); noFill(); rect(mX,mY,mW,mH,4); noStroke();
  fill(140,120,80); textSize(7); textAlign(CENTER,TOP); text('WORLD MAP',mX+mW/2,mY+3);
  let _isls=[{n:'Home',x:WORLD.islandCX,y:WORLD.islandCY,c:color(80,120,50),rx:18,ry:12},{n:'Arena',x:state.adventure.isleX,y:state.adventure.isleY,c:color(160,80,60),rx:8,ry:6},{n:'Terra Nova',x:state.conquest.isleX,y:state.conquest.isleY,c:state.conquest.colonized?color(80,160,80):color(80,120,160),rx:14,ry:10},{n:'Vulcan',x:state.vulcan.isleX,y:state.vulcan.isleY,c:color(180,60,30),rx:10,ry:8},{n:'Hyperborea',x:state.hyperborea.isleX,y:state.hyperborea.isleY,c:color(100,180,220),rx:11,ry:8},{n:'Plenty',x:state.plenty.isleX,y:state.plenty.isleY,c:color(60,160,60),rx:12,ry:9},{n:'Necropolis',x:state.necropolis.isleX,y:state.necropolis.isleY,c:color(120,50,160),rx:10,ry:7}];
  let _mnX=Infinity,_mxX=-Infinity,_mnY=Infinity,_mxY=-Infinity;
  _isls.forEach(i=>{_mnX=min(_mnX,i.x);_mxX=max(_mxX,i.x);_mnY=min(_mnY,i.y);_mxY=max(_mxY,i.y);});
  let _mSc=min((mW-40)/max(_mxX-_mnX,1),(mH-40)/max(_mxY-_mnY,1));
  let _mcx=mX+mW/2,_mcy=mY+mH/2+6,_aX=(_mnX+_mxX)/2,_aY=(_mnY+_mxY)/2;
  if(state.conquest.colonized){stroke(160,140,80,60);strokeWeight(0.5);_empDL(_mcx+(WORLD.islandCX-_aX)*_mSc,_mcy+(WORLD.islandCY-_aY)*_mSc,_mcx+(state.conquest.isleX-_aX)*_mSc,_mcy+(state.conquest.isleY-_aY)*_mSc,4);noStroke();}
  _isls.forEach(il=>{let ix=_mcx+(il.x-_aX)*_mSc,iy=_mcy+(il.y-_aY)*_mSc;fill(il.c);noStroke();ellipse(ix,iy,il.rx,il.ry);fill(200,185,150,180);textSize(5.5);textAlign(CENTER,TOP);text(il.n,ix,iy+il.ry/2+2);});
  fill(255,80,40,180+sin(frameCount*0.15)*60);circle(_mcx+(state.player.x-_aX)*_mSc,_mcy+(state.player.y-_aY)*_mSc,5);
  let sX=px+pw*0.52,sY=py+54,sW=pw*0.45;
  fill(160,140,90);textSize(8);textAlign(LEFT,TOP);text('EMPIRE STATISTICS',sX,sY);sY+=14;
  let _cI=state.conquest.colonized?state.conquest.colonyIncome:0,_tP=1+(state.conquest.colonized?state.conquest.colonyWorkers:0),_mS=state.conquest.soldiers.length+(state.centurion.hp>0?1:0);
  [{l:'GOLD',v:state.gold,c:'#ffbb22'},{l:'POPULATION',v:_tP,c:'#aaddaa'},{l:'MILITARY',v:_mS+' sol.',c:'#dd8888'},{l:'DAILY INCOME',v:'+'+_cI+'g',c:'#ddcc66'},{l:'EXPEDITIONS',v:state.conquest.expeditionNum,c:'#88aadd'},{l:'TOTAL KILLS',v:state.conquest.totalKills,c:'#cc8866'},{l:'DAY',v:state.day,c:'#aabbcc'},{l:'SEASON',v:getSeasonName().split(' ')[0],c:'#88cc66'}].forEach(s=>{fill(color(s.c));textSize(7);textAlign(LEFT,TOP);text(s.l,sX,sY);textAlign(RIGHT,TOP);text(''+s.v,sX+sW,sY);sY+=13;});
  textAlign(LEFT,TOP);sY+=6;fill(140,120,80);textSize(7);text('RANK PROGRESS',sX,sY);sY+=11;
  let _rks=[{n:'Citizen',l:1},{n:'Governor',l:10},{n:'Senator',l:15},{n:'Consul',l:20},{n:'Imperator',l:25}],_cR=0;
  for(let i=_rks.length-1;i>=0;i--){if(state.islandLevel>=_rks[i].l){_cR=i;break;}}
  let _nR=min(_cR+1,_rks.length-1),_rF=_cR===_nR?1:(state.islandLevel-_rks[_cR].l)/(_rks[_nR].l-_rks[_cR].l);
  fill(40,35,25);rect(sX,sY,sW,10,4);fill(180,145,60);rect(sX,sY,sW*_rF,10,4);
  fill(255,230,180);textSize(6);textAlign(CENTER,CENTER);text(_rks[_cR].n+' \u2192 '+_rks[_nR].n,sX+sW/2,sY+5);textAlign(LEFT,TOP);
  let cdY=py+ph*0.62;stroke(120,95,55,60);strokeWeight(0.5);line(px+20,cdY-6,px+pw-20,cdY-6);noStroke();
  fill(160,140,90);textSize(8);text('COLONIES & FLEET',px+14,cdY);cdY+=14;
  if(state.conquest.colonized){let cw=pw*0.4,ch=ph*0.26;fill(30,25,18,200);rect(px+14,cdY,cw,ch,4);stroke(120,100,60,100);strokeWeight(0.5);noFill();rect(px+14,cdY,cw,ch,4);noStroke();fill(140,200,140);textSize(8);text('Terra Nova',px+22,cdY+6);fill(120,110,80);textSize(7);text('Colony Level '+state.conquest.colonyLevel,px+22,cdY+18);text('Workers: '+state.conquest.colonyWorkers,px+22,cdY+30);text('Income: +'+state.conquest.colonyIncome+'g/day',px+22,cdY+42);
  } else {fill(100,90,70);textSize(7);text('No colonies yet. Conquer Terra Nova (LV.10+)',px+14,cdY+4);}
  let fX=px+pw*0.52;fill(120,110,80);textSize(7);text('FLEET',fX,cdY);text('Navis Parva - Active',fX,cdY+13);
  fill(state.ship.state==='docked'?color(140,200,140):color(90,80,60));text('Merchant - '+(state.ship.state==='docked'?'DOCKED':state.ship.state==='gone'?'At sea':state.ship.state.toUpperCase()),fX,cdY+26);
  if(state.imperialBridge.built){fill(200,170,90);text('Imperial Bridge - ACTIVE',fX,cdY+39);}
  fill(120,100,70);textSize(7);textAlign(CENTER,BOTTOM);text('[TAB] Close',width/2,py+ph-6);textAlign(LEFT,TOP);
}
function _empDL(x1,y1,x2,y2,dl){let d=dist(x1,y1,x2,y2);if(d<1)return;let dx=(x2-x1)/d,dy=(y2-y1)/d;for(let i=0;i<d;i+=dl*2){let e=min(i+dl,d);line(x1+dx*i,y1+dy*i,x1+dx*e,y1+dy*e);}}

// ═══ INVENTORY SCREEN (I key) ═══════════════════════════════════════════
function drawInventoryScreen() {
  if (!inventoryOpen) return;
  noStroke(); fill(0,0,0,190); rect(0,0,width,height);
  let pw=min(width-40,440),ph=min(height-40,380),px=(width-pw)/2,py=(height-ph)/2;
  fill(30,24,16,245);rect(px,py,pw,ph,6);stroke(180,145,70,220);strokeWeight(1.5);noFill();rect(px,py,pw,ph,6);stroke(120,95,55,80);strokeWeight(0.5);rect(px+5,py+5,pw-10,ph-10,4);noStroke();
  fill(212,175,80);textAlign(CENTER,TOP);textSize(13);text('INVENTARIUM',width/2,py+12);
  let gX=px+16,gY=py+36,cW=60,cH=36,cols=floor((pw-32)/cW);
  let _res=[{n:'Seeds',v:state.seeds,c:'#88cc44'},{n:'Harvest',v:state.harvest,c:'#ccaa44'},{n:'Wood',v:state.wood,c:'#8c6428'},{n:'Stone',v:state.stone,c:'#7a7268'},{n:'Crystals',v:state.crystals,c:'#44ffaa'},{n:'Gold',v:state.gold,c:'#ffbb22'},{n:'Fish',v:state.fish,c:'#64b4ff'},{n:'Iron',v:state.ironOre,c:'#aab8cc'},{n:'Hide',v:state.rareHide,c:'#c8a078'},{n:'Relics',v:state.ancientRelic,c:'#dc8cdc'},{n:'Bone',v:state.titanBone,c:'#f0dc8c'},{n:'Grape Sd',v:state.grapeSeeds,c:'#8c3ca0'},{n:'Olive Sd',v:state.oliveSeeds,c:'#6a8e30'}];
  _res.forEach((r,i)=>{let cx=gX+(i%cols)*cW,cy=gY+floor(i/cols)*cH;fill(r.v>0?color(40,35,25,200):color(25,20,14,150));rect(cx,cy,cW-4,cH-4,3);if(r.v>0){stroke(100,85,55,60);strokeWeight(0.5);noFill();rect(cx,cy,cW-4,cH-4,3);noStroke();}fill(r.v>0?color(r.c):color(60,50,40));textSize(10);textAlign(CENTER,TOP);text(r.v,cx+(cW-4)/2,cy+4);fill(r.v>0?color(160,140,100):color(70,60,45));textSize(6);text(r.n,cx+(cW-4)/2,cy+18);});
  let eY=gY+ceil(_res.length/cols)*cH+10;stroke(120,95,55,60);strokeWeight(0.5);line(px+20,eY,px+pw-20,eY);noStroke();eY+=6;
  fill(160,140,90);textSize(8);textAlign(LEFT,TOP);text('EQUIPMENT',px+16,eY);eY+=14;
  let _p=state.player;
  [{l:'WEAPON',v:WEAPONS[_p.weapon].name,d:'DMG '+WEAPONS[_p.weapon].dmg,c:'#ddccaa'},{l:'ARMOR',v:ARMORS[_p.armor].name,d:_p.armor>0?'REDUCE -'+ARMORS[_p.armor].reduce:'None',c:'#aabbcc'},{l:'POTIONS',v:_p.potions+'x',d:'Heals '+POTION_HEAL+' HP',c:'#44dd88'}].forEach((eq,i)=>{let sx=px+16+i*(pw/3-4),sw=pw/3-12;fill(35,28,20,200);rect(sx,eY,sw,40,4);stroke(100,85,55,80);strokeWeight(0.5);noFill();rect(sx,eY,sw,40,4);noStroke();fill(120,100,70);textSize(6);textAlign(CENTER,TOP);text(eq.l,sx+sw/2,eY+3);fill(color(eq.c));textSize(9);text(eq.v,sx+sw/2,eY+12);fill(100,90,65);textSize(6);text(eq.d,sx+sw/2,eY+25);});
  let coY=eY+50;fill(160,140,90);textSize(8);textAlign(LEFT,TOP);text('CONSUMABLES',px+16,coY);coY+=14;
  [{n:'Meals',v:state.meals,c:'#dcb450'},{n:'Wine',v:state.wine,c:'#a03250'},{n:'Oil',v:state.oil,c:'#8ca03c'}].forEach((c,i)=>{let cx=px+16+i*(pw/3-4),cw=pw/3-12;fill(35,28,20,180);rect(cx,coY,cw,32,3);fill(c.v>0?color(c.c):color(60,50,40));textSize(10);textAlign(CENTER,TOP);text(c.v,cx+cw/2,coY+3);fill(c.v>0?color(140,120,85):color(60,50,40));textSize(6);text(c.n,cx+cw/2,coY+16);});
  let tY=coY+40;let _tN=['Basic','Bronze','Iron'];fill(120,100,70);textSize(7);textAlign(LEFT,TOP);
  text('TOOLS:  Sickle: '+_tN[state.tools.sickle]+'  |  Axe: '+_tN[state.tools.axe]+'  |  Net: '+_tN[state.tools.net],px+16,tY);
  fill(120,100,70);textSize(7);textAlign(CENTER,BOTTOM);text('[I] Close',width/2,py+ph-6);textAlign(LEFT,TOP);
}

function drawHotbar() {
  let p = state.player;
  let slot = p.hotbarSlot;
  let slotW = 28, slotH = 28, gap = 4;
  let totalW = HOTBAR_ITEMS.length * (slotW + gap) - gap;
  let bx = floor((width - totalW) / 2);
  let by = height - slotH - 12;

  noStroke();
  for (let i = 0; i < HOTBAR_ITEMS.length; i++) {
    let sx = bx + i * (slotW + gap);
    let selected = i === slot;

    // Slot background
    fill(selected ? 45 : 20, selected ? 38 : 16, selected ? 28 : 12, 200);
    rect(sx, by, slotW, slotH);
    // Gold border for selected
    if (selected) {
      fill(212, 160, 64, 200);
      rect(sx, by, slotW, 2);
      rect(sx, by + slotH - 2, slotW, 2);
      rect(sx, by, 2, slotH);
      rect(sx + slotW - 2, by, 2, slotH);
    } else {
      fill(80, 70, 55, 100);
      rect(sx, by, slotW, 1);
      rect(sx, by + slotH - 1, slotW, 1);
      rect(sx, by, 1, slotH);
      rect(sx + slotW - 1, by, 1, slotH);
    }

    // Pixel icon in slot
    let cx = sx + floor(slotW / 2);
    let cy = by + floor(slotH / 2);
    let item = HOTBAR_ITEMS[i];

    if (item.icon === 'sickle') {
      // Pixel sickle — curved blade
      fill(180, 180, 190);
      rect(cx - 1, cy - 6, 2, 6);  // handle
      rect(cx + 1, cy - 8, 4, 2);  // blade top
      rect(cx + 3, cy - 6, 2, 4);  // blade right
      fill(120, 90, 50);
      rect(cx - 2, cy, 4, 4);      // grip
    } else if (item.icon === 'axe') {
      // Pixel axe
      fill(120, 90, 50);
      rect(cx - 1, cy - 4, 2, 10); // handle
      fill(160, 160, 170);
      rect(cx - 4, cy - 6, 6, 4);  // head
      fill(180, 180, 190);
      rect(cx - 4, cy - 6, 2, 4);  // edge
    } else if (item.icon === 'pick') {
      // Pixel pickaxe
      fill(120, 90, 50);
      rect(cx - 1, cy - 2, 2, 8);  // handle
      fill(160, 160, 170);
      rect(cx - 5, cy - 5, 10, 3); // head
      fill(140, 140, 150);
      rect(cx - 5, cy - 5, 2, 2);  // point
      rect(cx + 3, cy - 5, 2, 2);  // point
    } else if (item.icon === 'rod') {
      // Pixel fishing rod
      fill(120, 90, 50);
      rect(cx + 1, cy - 6, 2, 12); // rod
      fill(100, 160, 200);
      rect(cx + 3, cy - 6, 1, 1);  // tip
      rect(cx + 3, cy - 5, 1, 4);  // line
      fill(200, 200, 60);
      rect(cx + 2, cy - 1, 2, 1);  // hook
    } else if (item.icon === 'weapon') {
      // Pixel gladius/weapon
      let wn = WEAPONS[p.weapon].name;
      fill(190, 190, 200);
      rect(cx - 1, cy - 7, 2, 10); // blade
      fill(180, 180, 190);
      rect(cx - 1, cy - 8, 2, 2);  // tip
      fill(200, 170, 60);
      rect(cx - 2, cy + 2, 4, 2);  // guard
      fill(100, 70, 35);
      rect(cx - 1, cy + 4, 2, 3);  // grip
    }

    // Slot number (tiny, top-left)
    fill(selected ? 212 : 80, selected ? 160 : 70, selected ? 64 : 50, selected ? 255 : 140);
    textSize(5);
    textAlign(LEFT, TOP);
    text(i + 1, sx + 2, by + 2);
  }

  // Selected item name below hotbar
  fill(212, 160, 64);
  textSize(7);
  textAlign(CENTER, TOP);
  let cur = HOTBAR_ITEMS[slot];
  let displayName = cur.icon === 'weapon' ? WEAPONS[p.weapon].name : cur.name;
  text(displayName + ' — ' + cur.desc, width / 2, by + slotH + 3);
  textAlign(LEFT, TOP);
}

function drawHUD() {
  if (photoMode) return;
  let h = state.time / 60;
  let mins = floor(state.time % 60);
  let ampm = h >= 12 ? 'PM' : 'AM';
  let displayH = floor(h % 12) || 12;
  let timeStr = displayH + ':' + nf(mins, 2) + ' ' + ampm;

  // Top-left panel — fade when player is in that screen quadrant
  let _psx = w2sX(state.player.x), _psy = w2sY(state.player.y);
  let _hudFade = (_psx < width * 0.35 && _psy < height * 0.45) ? 0.35 : 1.0;
  drawingContext.globalAlpha = _hudFade;

  // Top-left panel — compact
  let hudH = 195;
  if (state.ironOre > 0) hudH += 12;
  if (state.rareHide > 0) hudH += 12;
  if (state.ancientRelic > 0) hudH += 12;
  if (state.titanBone > 0) hudH += 12;
  if (state.meals > 0) hudH += 12;
  if (state.wine > 0) hudH += 12;
  if (state.oil > 0) hudH += 12;
  if (state.blessing.type) hudH += 12;
  if (state.quest) hudH += 12;
  if (state.weather.type !== 'clear') hudH += 12;
  hudH += 12; // crop select line
  if (state.quarrier && state.quarrier.unlocked) hudH += 14;
  drawHUDPanel(12, 12, 195, hudH - 14);
  textAlign(LEFT, TOP);

  drawBarHUD(22, 20, 100, 8, state.solar / state.maxSolar, C.solarBright, C.solarGold, 'SOLAR');

  // Core resources — always show
  let resY = 38;
  drawHudResource(22, resY, 'SEEDS    ', state.seeds, color(C.textBright), 'seeds'); resY += 11;
  drawHudResource(22, resY, 'HARVEST  ', state.harvest, color(C.textBright), 'harvest'); resY += 11;
  drawHudResource(22, resY, 'WOOD     ', state.wood, color(140, 100, 40), 'wood'); resY += 11;
  drawHudResource(22, resY, 'STONE    ', state.stone, color(C.stoneLight), 'stone'); resY += 11;
  drawHudResource(22, resY, 'CRYSTALS ', state.crystals, color(C.crystalGlow), 'crystals'); resY += 11;
  // Conditional resources — only when player has them
  if (state.gold > 0) { drawHudResource(22, resY, 'GOLD     ', state.gold, color(C.solarBright), 'gold'); resY += 11; }
  if (state.fish > 0) { drawHudResource(22, resY, 'FISH     ', state.fish, color(100, 180, 255), 'fish'); resY += 11; }
  // Expedition resources
  let expResY = resY;
  if (state.ironOre > 0 || state.rareHide > 0 || state.ancientRelic > 0 || state.titanBone > 0) {
    fill(170, 185, 200);
    if (state.ironOre > 0) { text('IRON     ' + state.ironOre, 22, expResY); expResY += 12; }
    fill(200, 160, 120);
    if (state.rareHide > 0) { text('HIDE     ' + state.rareHide, 22, expResY); expResY += 12; }
    fill(220, 140, 220);
    if (state.ancientRelic > 0) { text('RELIC    ' + state.ancientRelic, 22, expResY); expResY += 12; }
    fill(240, 220, 140);
    if (state.titanBone > 0) { text('BONE     ' + state.titanBone, 22, expResY); expResY += 12; }
  }
  // Cooked goods
  let cookedY = expResY;
  if (state.meals > 0 || state.wine > 0 || state.oil > 0) {
    fill(220, 180, 80);
    if (state.meals > 0) { text('MEALS    ' + state.meals, 22, cookedY); cookedY += 12; }
    if (state.wine > 0) { fill(160, 50, 80); text('WINE     ' + state.wine, 22, cookedY); cookedY += 12; }
    if (state.oil > 0) { fill(140, 160, 60); text('OIL      ' + state.oil, 22, cookedY); cookedY += 12; }
  }

  drawBarHUD(22, cookedY + 2, 100, 7, state.companion.energy / 100, C.companionG, C.companionD, 'CRITTER');
  drawBarHUD(22, cookedY + 16, 100, 7, state.woodcutter.energy / 100, '#A0724A', '#4A3520', 'CUTTER');
  if (state.quarrier.unlocked) drawBarHUD(22, cookedY + 30, 100, 7, state.quarrier.energy / 100, '#8A8078', '#3A3530', 'QUARRY');
  let qOff = (state.quarrier && state.quarrier.unlocked) ? 14 : 0;

  // Island level
  fill(color(C.textDim));
  textSize(7);
  let rankTitle = state.islandLevel >= 25 ? 'IMPERATOR' : state.islandLevel >= 20 ? 'CONSUL' : state.islandLevel >= 15 ? 'SENATOR' : state.islandLevel >= 10 ? 'GOVERNOR' : 'CITIZEN';
  text(rankTitle + ' — LV.' + state.islandLevel, 22, cookedY + 30 + qOff);
  // Skill points alert
  if ((state.player.skillPoints || 0) > 0) {
    fill(255, 220, 80); textSize(7);
    text('[K] ' + state.player.skillPoints + ' skill pt' + (state.player.skillPoints > 1 ? 's' : '') + ' ready', 22, cookedY + 41 + qOff);
  }
  // Season
  let seasonCol = getSeason() === 2 ? color(200, 140, 40) : getSeason() === 3 ? color(180, 200, 220) : getSeason() === 1 ? color(200, 180, 60) : color(80, 160, 50);
  fill(seasonCol);
  textSize(7);
  text(getSeasonName(), 22, cookedY + 41 + qOff);

  // Ship status
  let hudY = cookedY + 53;
  if (state.ship.state !== 'gone') {
    fill(color(C.solarBright));
    textSize(7);
    text('SHIP: ' + state.ship.state.toUpperCase(), 22, hudY);
    hudY += 12;
  }

  // Grape/olive seeds — only show when player has some
  if (state.grapeSeeds > 0 || state.oliveSeeds > 0) {
    fill(140, 60, 160);
    textSize(7);
    let seedStr = '';
    if (state.grapeSeeds > 0) seedStr += 'GRAPE ' + state.grapeSeeds + '  ';
    if (state.oliveSeeds > 0) seedStr += 'OLIVE ' + state.oliveSeeds;
    text(seedStr.trim(), 22, hudY);
    hudY += 11;
  }

  // Crop select
  fill(color(C.textDim));
  let sc = getSeasonalCrop();
  let cropHint = sc ? '  (1/2/3/4)' : '  (1/2/3)';
  text('CROP: ' + (state.cropSelect || 'grain').toUpperCase() + cropHint, 22, hudY);
  hudY += 11;

  // Blessing indicator
  if (state.blessing.type) {
    let blessCol = state.blessing.type === 'crops' ? '#88cc44' : state.blessing.type === 'solar' ? '#ffcc44' : state.blessing.type === 'speed' ? '#44ccff' : state.blessing.type === 'storm' ? '#8888ff' : '#ff88ff';
    fill(color(blessCol));
    textSize(7);
    let bMin = floor(state.blessing.timer / 60);
    text('BLESSING: ' + state.blessing.type.toUpperCase() + ' (' + bMin + 'm)', 22, hudY);
    hudY += 12;
  }

  // Weather indicator
  if (state.weather.type !== 'clear') {
    let wCol = state.weather.type === 'rain' ? '#6699cc' : state.weather.type === 'heatwave' ? '#ff8844' : '#aabbcc';
    fill(color(wCol));
    textSize(7);
    let wSec = floor(state.weather.timer / 60);
    text('WEATHER: ' + state.weather.type.toUpperCase() + ' (' + wSec + 's)', 22, hudY);
    hudY += 12;
  }

  // Quest tracker
  if (state.quest) {
    fill(color(C.solarGold));
    textSize(7);
    text('QUEST: ' + state.quest.desc + ' ' + state.quest.progress + '/' + state.quest.target, 22, hudY);
    hudY += 12;
  }

  drawingContext.globalAlpha = 1.0;

  // Storm warning
  if (stormActive) {
    fill(color(C.stormFlash));textSize(9);textAlign(CENTER,TOP);text('DRIFT STORM ACTIVE',width/2,40);textAlign(LEFT,TOP);
  }

  // ─── QUEST TRACKER (right side) ───
  if(state.quest){let qtX=width-170,qtY=100;noStroke();fill(25,20,14,180);rect(qtX,qtY,156,32,4);
    stroke(180,145,70,100);strokeWeight(0.5);noFill();rect(qtX,qtY,156,32,4);noStroke();
    fill(212,160,64);textSize(7);textAlign(LEFT,TOP);text('QUEST',qtX+6,qtY+3);
    fill(200,190,160);textSize(7);text(state.quest.desc.length>22?state.quest.desc.substring(0,22)+'..':state.quest.desc,qtX+6,qtY+13);
    let _qF=state.quest.progress/state.quest.target;fill(40,35,25);rect(qtX+6,qtY+24,100,4,2);
    fill(212,160,64);rect(qtX+6,qtY+24,100*_qF,4,2);fill(160,140,100);textSize(6);textAlign(RIGHT,TOP);
    text(state.quest.progress+'/'+state.quest.target,qtX+150,qtY+22);textAlign(LEFT,TOP);}

  // Controls (bottom right) — context-aware, minimal
  let cr = width - 12, cb = height - 12;
  let controlLines = [];
  if (state.buildMode) {
    controlLines = ['WASD move  |  CLICK place  |  Q rotate  |  B close'];
  } else if (state.rowing && state.rowing.active) {
    controlLines = ['WASD row  |  E dock  |  ESC menu'];
  } else if (state.wreck && state.wreck.active) {
    controlLines = ['WASD move  |  E gather  |  TAB raft'];
  } else {
    controlLines = ['WASD move  |  E interact/dive  |  B build', 'TAB empire  |  K skills  |  P photo  |  ESC menu'];
  }
  let controlH = 10 + controlLines.length * 12;
  drawHUDPanel(cr - 200, cb - controlH, 200, controlH);
  fill(160, 140, 100, 180); textSize(7); textAlign(LEFT, TOP);
  for (let ci = 0; ci < controlLines.length; ci++) {
    text(controlLines[ci], cr - 194, cb - controlH + 5 + ci * 12);
  }

  noStroke();
  textAlign(LEFT, TOP);

  // ─── MINI-MAP (top right) ───
  let mmW = 110, mmH = 70;
  let mmX = width - mmW - 16, mmY = 16;
  noStroke();
  fill(15, 20, 30, 230);
  rect(mmX, mmY, mmW, mmH, 4);
  // Gold border (matches HUD style)
  stroke(180, 145, 70, 160);
  strokeWeight(1);
  noFill();
  rect(mmX, mmY, mmW, mmH, 4);
  // Inner decorative line
  stroke(120, 95, 55, 60);
  strokeWeight(0.5);
  rect(mmX + 2, mmY + 2, mmW - 4, mmH - 4, 3);
  noStroke();
  // Island name label
  fill(180, 160, 120, 160); textSize(5); textAlign(CENTER, TOP);
  text('INSULA DOMUS', mmX + mmW / 2, mmY + 2); textAlign(LEFT, TOP);
  let mcx = mmX + mmW / 2, mcy = mmY + mmH / 2;
  let scaleX = (mmW - 12) / (state.islandRX * 2);
  let scaleY = (mmH - 12) / (state.islandRY * 2);
  // Island shape
  noStroke();
  fill(65, 85, 40, 220);
  ellipse(mcx, mcy, (mmW - 14), (mmH - 14) * 0.7);
  // Island rim
  stroke(90, 110, 50, 150);
  strokeWeight(1);
  noFill();
  ellipse(mcx, mcy, (mmW - 14), (mmH - 14) * 0.7);
  noStroke();
  // Farm plots
  fill(90, 60, 25, 180);
  state.plots.forEach(pl => {
    let dx = (pl.x - WORLD.islandCX) * scaleX;
    let dy = (pl.y - WORLD.islandCY) * scaleY;
    rect(mcx + dx - 1.5, mcy + dy - 1, 3, 2);
  });
  // Trees
  fill(40, 80, 30, 200);
  state.trees.forEach(t => {
    if (!t.alive) return;
    let dx = (t.x - WORLD.islandCX) * scaleX;
    let dy = (t.y - WORLD.islandCY) * scaleY;
    circle(mcx + dx, mcy + dy, 2.5);
  });
  // Crystals
  fill(0, 255, 136, 180);
  state.crystalNodes.forEach(c => {
    let dx = (c.x - WORLD.islandCX) * scaleX;
    let dy = (c.y - WORLD.islandCY) * scaleY;
    circle(mcx + dx, mcy + dy, 2);
  });
  // Temple
  fill(220, 210, 190, 200);
  rect(mcx - 3, mcy - 2, 6, 4, 1);
  // Player — bright blinking dot
  let pdx = (state.player.x - WORLD.islandCX) * scaleX;
  let pdy = (state.player.y - WORLD.islandCY) * scaleY;
  fill(255, 80, 40, 180 + sin(frameCount * 0.15) * 60);
  circle(mcx + pdx, mcy + pdy, 4);
  // NPC
  let ndx = (state.npc.x - WORLD.islandCX) * scaleX;
  let ndy = (state.npc.y - WORLD.islandCY) * scaleY;
  fill(200, 80, 200, 180);
  circle(mcx + ndx, mcy + ndy, 3);
  // Bridge indicator (west arrow)
  if (state.imperialBridge.built) {
    stroke(200, 170, 90, 120); strokeWeight(0.5);
    line(mmX + 4, mcy, mmX + 12, mcy);
    fill(200, 170, 90, 120); noStroke();
    triangle(mmX + 3, mcy, mmX + 7, mcy - 2, mmX + 7, mcy + 2);
    fill(180, 160, 120, 100); textSize(4); textAlign(LEFT, CENTER);
    text('Bridge', mmX + 3, mcy + 6); textAlign(LEFT, TOP);
  }
}

function drawBuildUI() {
  if (!state.buildMode) return;

  // Build mode = personal decoration only. Landmark buildings auto-spawn with island levels.
  let baseTypes = ['floor', 'wall', 'door', 'chest', 'bridge', 'fence', 'torch', 'flower', 'lantern', 'mosaic', 'aqueduct', 'bath'];
  let slotW = 48;
  let gap = 4;
  let numBase = baseTypes.length;
  let barW = numBase * slotW + (numBase - 1) * gap + 24;
  let rowH = 56;
  let barH = rowH + 8;
  let barX = width / 2 - barW / 2;
  let barY = height - barH - 16;

  // Bar background
  noStroke();
  fill(20, 15, 10, 200);
  rect(barX - 3, barY - 3, barW + 6, barH + 6, 8);
  fill(45, 35, 25, 240);
  rect(barX, barY, barW, barH, 6);
  stroke(160, 130, 80, 150);
  strokeWeight(1.2);
  noFill();
  rect(barX, barY, barW, barH, 6);
  stroke(120, 95, 55, 80);
  strokeWeight(0.5);
  rect(barX + 3, barY + 3, barW - 6, barH - 6, 4);
  // Divider between rows
  stroke(120, 95, 55, 60);
  strokeWeight(0.8);
  line(barX + 6, barY + rowH + 4, barX + barW - 6, barY + rowH + 4);
  noStroke();

  // Row labels
  fill(160, 130, 70, 160);
  textSize(6);
  textAlign(LEFT, TOP);
  text('BASE', barX + 4, barY + 3);
  fill(140, 100, 55, 140);
  text('ADV', barX + 4, barY + rowH + 6);

  let startX = barX + 12;

  function drawSlot(t, i, row) {
    let tx = startX + i * (slotW + gap);
    let ty = barY + row * (rowH + 4) + 5;
    let selected = state.buildType === t;
    let unlocked = isBuildingUnlocked(t);
    let affordable = unlocked && canAfford(t);
    let bp = BLUEPRINTS[t];

    // Slot background
    if (selected) {
      fill(80, 65, 40, 180);
      stroke(200, 170, 90, 220);
      strokeWeight(1.5);
    } else if (!unlocked) {
      fill(20, 16, 12, 160);
      stroke(60, 45, 30, 80);
      strokeWeight(0.8);
    } else {
      fill(35, 28, 20, 160);
      stroke(affordable ? color(120, 100, 70, 100) : color(80, 40, 30, 80));
      strokeWeight(0.8);
    }
    rect(tx, ty, slotW, 48, 4);
    noStroke();

    // Icon
    push();
    if (!unlocked) drawingContext.globalAlpha = 0.3;
    translate(tx + slotW / 2, ty + 16);
    scale(1.3);
    drawBuildIcon(t, selected);
    drawingContext.globalAlpha = 1.0;
    pop();

    if (!unlocked) {
      // Lock icon
      fill(120, 90, 50, 180);
      textSize(8);
      textAlign(CENTER, TOP);
      text('LV' + bp.minLevel, tx + slotW / 2, ty + 32);
      fill(80, 60, 35, 160);
      textSize(6);
      text(bp.name, tx + slotW / 2, ty + 42);
    } else {
      // Key binding
      fill(selected ? color(200, 170, 90) : color(140, 120, 85));
      textSize(7);
      textAlign(CENTER, TOP);
      if (bp.key) text(bp.key, tx + slotW / 2, ty + 32);
      // Name
      fill(selected ? color(220, 200, 160) : (affordable ? color(140, 120, 85) : color(120, 60, 50)));
      textSize(6);
      text(bp.name, tx + slotW / 2, ty + 42);
    }
  }

  baseTypes.forEach((t, i) => drawSlot(t, i, 0));

  // Title bar
  fill(200, 170, 90, 220);
  textSize(9);
  textAlign(CENTER, BOTTOM);
  text('AEDIFICIUM  [B to close]', width / 2, barY - 4);

  // Selected item tooltip with cost or lock message
  let bp = BLUEPRINTS[state.buildType];
  let unlocked = isBuildingUnlocked(state.buildType);
  textSize(8);
  textAlign(CENTER, BOTTOM);
  if (!unlocked) {
    fill(160, 110, 55);
    text(bp.name.toUpperCase() + '  --  Reach island level ' + bp.minLevel, width / 2, barY - 16);
  } else {
    let costStr = getCostString(state.buildType);
    fill(220, 200, 160);
    text(bp.name.toUpperCase() + '  --  ' + costStr, width / 2, barY - 16);
  }
  textAlign(LEFT, TOP);
}

function drawBuildIcon(type, selected) {
  let c1 = selected ? color(220, 210, 180) : color(C.textDim);
  let c2 = selected ? color(180, 170, 150) : color(100, 95, 85);
  let accent = selected ? color(200, 160, 80) : color(140, 120, 70);
  noStroke();
  fill(c1);
  switch (type) {
    case 'wall':
      // Marble ashlar blocks
      fill(c1);
      rect(-10, -6, 20, 12, 1);
      stroke(c2);
      strokeWeight(0.5);
      line(-10, -1, 10, -1);
      line(-10, 4, 10, 4);
      line(-3, -6, -3, -1);
      line(5, -1, 5, 4);
      line(-5, 4, -5, 6);
      noStroke();
      // Sunlit highlight
      fill(255, 240, 200, selected ? 50 : 20);
      rect(-10, -6, 20, 4);
      break;
    case 'floor':
      // Herringbone stone tile
      fill(c1);
      rect(-10, -8, 20, 16, 1);
      stroke(c2);
      strokeWeight(0.4);
      // Herringbone pattern
      for (let hy = -6; hy <= 6; hy += 4) {
        for (let hx = -8; hx <= 8; hx += 8) {
          line(hx, hy, hx + 4, hy + 2);
          line(hx + 4, hy + 2, hx + 8, hy);
          line(hx + 4, hy + 2, hx + 4, hy + 4);
        }
      }
      noStroke();
      break;
    case 'door':
      // Roman arched doorway
      fill(c1);
      rect(-10, -4, 20, 12, 1);
      fill(0, 0, 0, selected ? 120 : 80);
      rect(-5, -2, 10, 10);
      // Arch top
      arc(0, -2, 10, 10, PI, TWO_PI);
      // Keystone
      fill(accent);
      beginShape();
      vertex(-2, -6); vertex(2, -6);
      vertex(1.5, -3); vertex(-1.5, -3);
      endShape(CLOSE);
      break;
    case 'chest':
      // Roman arca with bronze bands
      fill(selected ? color(110, 70, 35) : color(80, 55, 30));
      rect(-8, -2, 16, 10, 1);
      // Lid
      fill(selected ? color(130, 85, 40) : color(95, 65, 35));
      rect(-9, -5, 18, 5, 2);
      // Bronze bands
      fill(accent);
      rect(-9, -5, 18, 1.2);
      rect(-9, 2, 18, 1.2);
      // Lock plate
      fill(accent);
      rect(-1, 0, 3, 3);
      fill(0, 0, 0, 80);
      rect(0, 1, 1, 1);
      break;
    case 'bridge':
      fill(c1);
      rect(-10, -4, 20, 8);
      fill(c2);
      rect(-10, -6, 20, 3);
      // Pixel arch
      fill(0, 0, 0, 60);
      rect(-4, 2, 8, 2);
      rect(-2, 4, 4, 2);
      fill(selected ? color(60, 120, 200, 80) : color(40, 80, 140, 50));
      rect(-6, 3, 12, 2);
      break;
    case 'fence':
      fill(c1);
      rect(-10, -4, 20, 2);
      rect(-10, 6, 20, 2);
      for (let bx = -7; bx <= 7; bx += 4.5) {
        fill(c2);
        rect(floor(bx) - 1, -2, 2, 8);
        fill(c1);
        rect(floor(bx) - 1, 1, 3, 3);
      }
      break;
    case 'torch':
      fill(accent);
      // Tripod legs — pixel
      rect(-4, 2, 2, 8);
      rect(2, 2, 2, 8);
      // Bowl
      rect(-5, 0, 10, 3);
      // Fire — pixel rects
      fill(255, 120, 20, selected ? 220 : 120);
      rect(-2, -3, 4, 3);
      fill(255, 200, 40, selected ? 200 : 100);
      rect(-1, -4, 2, 3);
      fill(255, 255, 180, selected ? 160 : 60);
      rect(0, -5, 1, 2);
      break;
    case 'flower':
      fill(selected ? color(50, 100, 40) : color(40, 70, 30));
      rect(-7, -1, 14, 8);
      let rc = selected ? color(180, 30, 50) : color(130, 30, 40);
      fill(rc);
      rect(-5, -2, 3, 3);
      rect(2, -1, 3, 3);
      rect(-1, 2, 3, 3);
      fill(selected ? color(220, 60, 80) : color(160, 50, 60));
      rect(-4, -1, 1, 1);
      rect(3, 0, 1, 1);
      break;
    case 'lantern':
      fill(c1);
      rect(-3, 2, 6, 8);
      rect(-5, 9, 10, 2);
      fill(accent);
      rect(-4, -1, 8, 3);
      // Spout
      rect(4, -1, 3, 2);
      // Flame
      fill(255, 200, 60, selected ? 220 : 100);
      rect(6, -4, 2, 3);
      fill(255, 255, 180, selected ? 180 : 60);
      rect(6, -5, 2, 1);
      break;
    case 'mosaic':
      fill(selected ? color(200, 180, 140) : color(140, 130, 110));
      rect(-8, -8, 16, 16);
      fill(selected ? color(160, 60, 30) : color(120, 50, 30));
      rect(-8, -8, 16, 2);
      rect(-8, 6, 16, 2);
      rect(-8, -6, 2, 12);
      rect(6, -6, 2, 12);
      // Diamond — pixel stacked rects
      fill(selected ? color(40, 60, 120) : color(30, 45, 80));
      rect(0, -5, 1, 1);
      rect(-1, -4, 3, 1);
      rect(-2, -3, 5, 1);
      rect(-3, -2, 7, 1);
      rect(-4, -1, 9, 2);
      rect(-3, 1, 7, 1);
      rect(-2, 2, 5, 1);
      rect(-1, 3, 3, 1);
      rect(0, 4, 1, 1);
      // Center
      fill(selected ? color(200, 160, 40) : color(140, 110, 40));
      rect(-1, -1, 2, 2);
      break;
    case 'aqueduct':
      fill(c1);
      rect(-9, -4, 4, 12);
      rect(5, -4, 4, 12);
      // Pixel arch
      fill(c1);
      rect(-5, -4, 10, 2);
      rect(-3, -2, 6, 2);
      rect(-10, -7, 20, 4);
      // Water
      fill(selected ? color(60, 130, 210, 150) : color(40, 80, 140, 80));
      rect(-8, -6, 16, 2);
      // Keystone
      fill(accent);
      rect(-1, -4, 2, 2);
      break;
    case 'granary':
      // Granary icon — raised structure with roof
      fill(c1);
      rect(-9, -2, 18, 10, 1);
      // Stilts
      fill(c2);
      rect(-7, 8, 3, 4);
      rect(4, 8, 3, 4);
      // Roof
      fill(selected ? color(170, 95, 55) : color(120, 65, 38));
      rect(-10, -6, 20, 5, 1);
      // Ventilation dots
      fill(0, 0, 0, selected ? 100 : 60);
      rect(-5, 1, 3, 2);
      rect(2, 1, 3, 2);
      break;
    case 'well':
      // Well icon — round shaft with crossbeam
      fill(c1);
      rect(-6, -4, 12, 12, 2);
      // Dark water
      fill(selected ? color(40, 90, 140, 180) : color(25, 55, 90, 120));
      ellipse(0, -1, 8, 4);
      // Crossbeam
      fill(selected ? color(120, 85, 40) : color(85, 60, 30));
      rect(-8, -7, 16, 3, 1);
      rect(-7, -7, 2, 6);
      rect(5, -7, 2, 6);
      break;
    case 'temple':
      // Temple icon — columns and pediment
      fill(c1);
      rect(-10, 0, 20, 8, 1);
      // Columns
      for (let ti = 0; ti < 4; ti++) {
        rect(-9 + ti * 6, -8, 3, 10, 1);
      }
      // Entablature
      rect(-11, -10, 22, 3, 1);
      // Pediment
      beginShape();
      vertex(-10, -10); vertex(0, -16); vertex(10, -10);
      endShape(CLOSE);
      // Acroteria
      fill(accent);
      circle(-10, -11, 3);
      circle(10, -11, 3);
      circle(0, -17, 3);
      break;
    case 'market':
      // Market icon — awning stall
      fill(selected ? color(195, 55, 40) : color(130, 40, 30));
      rect(-10, -10, 20, 8, 1);
      fill(selected ? color(220, 205, 175) : color(150, 140, 115));
      rect(-5, -10, 5, 8);
      rect(5, -10, 5, 8);
      // Counter
      fill(c1);
      rect(-10, -2, 20, 10, 1);
      // Goods
      fill(accent);
      rect(-7, -1, 4, 4, 1);
      fill(selected ? color(55, 120, 65) : color(40, 80, 45));
      ellipse(4, 1, 6, 4);
      break;
    case 'forum':
      // Forum icon — plaza with central fountain
      fill(c1);
      rect(-10, -10, 20, 20, 1);
      // Grid lines
      stroke(c2);
      strokeWeight(0.4);
      line(-10, -3, 10, -3);
      line(-10, 4, 10, 4);
      line(-3, -10, -3, 10);
      line(4, -10, 4, 10);
      noStroke();
      // Central fountain
      fill(selected ? color(50, 120, 180, 200) : color(35, 75, 120, 120));
      ellipse(-1, 0, 6, 4);
      // Columns
      fill(c1);
      rect(-11, -11, 3, 4, 1);
      rect(8, -11, 3, 4, 1);
      rect(-11, 7, 3, 4, 1);
      rect(8, 7, 3, 4, 1);
      break;
    case 'watchtower':
      // Watchtower icon — tall tower with battlements
      fill(c1);
      rect(-5, -10, 10, 20, 1);
      // Merlons
      fill(c2);
      rect(-5, -14, 3, 5, 1);
      rect(2, -14, 3, 5, 1);
      // Arrow slit
      fill(0, 0, 0, selected ? 120 : 70);
      rect(-1.5, -6, 3, 5, 1);
      // Torch
      fill(selected ? color(255, 160, 30, 220) : color(200, 110, 20, 100));
      rect(-1, -14, 2, 3);
      fill(selected ? color(255, 220, 80, 220) : color(200, 180, 50, 100));
      rect(-0.5, -15, 1, 2);
      break;
    case 'arch':
      // Triumphal arch icon
      fill(c1);
      rect(-10, -10, 7, 20, 1);
      rect(3, -10, 7, 20, 1);
      // Arch opening
      fill(0, 0, 0, selected ? 130 : 80);
      rect(-3, -8, 6, 16);
      arc(0, -8, 6, 8, PI, TWO_PI);
      // Attic
      fill(c1);
      rect(-10, -14, 20, 5, 1);
      // Keystone — gold
      fill(accent);
      rect(-1.5, -10, 3, 3, 1);
      break;
    case 'villa':
      // Villa icon — walled compound with garden
      fill(c1);
      rect(-10, -10, 20, 20, 1);
      // Interior
      fill(c2);
      rect(-7, -7, 14, 14, 1);
      // Garden — green patch
      fill(selected ? color(55, 100, 40, 200) : color(35, 65, 25, 140));
      rect(0, -5, 6, 8, 1);
      // Pool
      fill(selected ? color(50, 110, 170, 200) : color(30, 70, 110, 120));
      ellipse(-4, 2, 6, 4);
      // Roof edge
      fill(selected ? color(165, 88, 50, 180) : color(110, 60, 35, 120));
      rect(-10, -10, 20, 3, 1);
      break;
  }
}

function drawHUDPanel(x, y, w, h) {
  noStroke();
  // Lighter, more elegant panel
  fill(0, 0, 0, 25);
  rect(x + 1, y + 1, w, h, 3);
  // Semi-transparent dark background
  fill(25, 20, 15, 160);
  rect(x, y, w, h, 3);
  // Single pixel golden border
  stroke(180, 150, 80, 120);
  strokeWeight(0.8);
  noFill();
  rect(x, y, w, h, 3);
  noStroke();
}

function drawParchmentPanel(x, y, w, h) {
  // Full parchment overlay panel for popups
  noStroke();
  // Dark backdrop
  fill(20, 15, 10, 230);
  rect(x, y, w, h, 5);
  // Parchment inner
  fill(45, 35, 25, 240);
  rect(x + 2, y + 2, w - 4, h - 4, 4);
  // Gold ornamental border
  stroke(180, 145, 70);
  strokeWeight(1.5);
  noFill();
  rect(x + 1, y + 1, w - 2, h - 2, 5);
  // Inner decorative line
  stroke(140, 110, 55, 120);
  strokeWeight(0.6);
  rect(x + 5, y + 5, w - 10, h - 10, 3);
  // Corner ornaments
  noStroke();
  fill(180, 145, 70, 150);
  let cs = 4;
  // top-left
  rect(x + 3, y + 3, cs, cs);
  // top-right
  rect(x + w - 3 - cs, y + 3, cs, cs);
  // bottom-left
  rect(x + 3, y + h - 3 - cs, cs, cs);
  // bottom-right
  rect(x + w - 3 - cs, y + h - 3 - cs, cs, cs);
  noStroke();
}

function drawBarHUD(x, y, w, h, frac, colFull, colEmpty, label) {
  fill(color(colEmpty));
  rect(x, y, w, h, 2);
  fill(color(colFull));
  rect(x, y, w * frac, h, 2);
  fill(color(C.textDim));
  textSize(7);
  textAlign(LEFT, TOP);
  text(label, x + w + 5, y + 1);
}

// ─── CURSOR ───────────────────────────────────────────────────────────────
function drawCursor() {
  let mx = mouseX, my = mouseY;

  if (state.buildMode) {
    // Build cursor — golden Roman column marker
    noFill();
    stroke(200, 170, 60, 200);
    strokeWeight(1.5);
    // Column shaft
    line(mx, my - 10, mx, my + 6);
    // Capital (top ornament)
    line(mx - 4, my - 10, mx + 4, my - 10);
    line(mx - 3, my - 12, mx + 3, my - 12);
    // Base
    line(mx - 4, my + 6, mx + 4, my + 6);
    line(mx - 5, my + 8, mx + 5, my + 8);
    // Golden glow dot
    noStroke(); fill(255, 200, 60, 120);
    ellipse(mx, my - 2, 4, 4);
  } else {
    // Roman spear/pilum cursor — historical pointer
    noFill();
    let pulse = sin(frameCount * 0.06) * 0.15 + 0.85;
    // Spear shaft (angled like a pointer)
    stroke(180, 155, 100, floor(200 * pulse));
    strokeWeight(1.5);
    line(mx, my, mx + 10, my + 14);
    // Spearhead (iron tip)
    stroke(160, 150, 130, floor(220 * pulse));
    strokeWeight(2);
    line(mx, my, mx - 1, my - 3);
    line(mx - 1, my - 3, mx + 1, my - 5);
    line(mx + 1, my - 5, mx + 2, my - 2);
    line(mx + 2, my - 2, mx, my);
    // Tip highlight
    noStroke(); fill(220, 200, 150, floor(180 * pulse));
    triangle(mx, my, mx - 1, my - 4, mx + 2, my - 2);
    // Small laurel leaves at shaft base
    stroke(80, 120, 50, floor(140 * pulse));
    strokeWeight(1);
    // Left leaf
    noFill();
    arc(mx + 6, my + 8, 6, 4, PI * 0.8, PI * 1.6);
    // Right leaf
    arc(mx + 8, my + 7, 6, 4, PI * 1.4, PI * 2.2);
  }
  noStroke();
}

// ─── INPUT ────────────────────────────────────────────────────────────────
function mouseWheel(event) {
  let dir = event.delta > 0 ? 1 : -1;
  let p = state.player;
  p.hotbarSlot = ((p.hotbarSlot + dir) % HOTBAR_ITEMS.length + HOTBAR_ITEMS.length) % HOTBAR_ITEMS.length;
  return false;
}

function mousePressed() {
  if (snd) snd.resume();
  if (gameScreen !== 'game') { handleMenuClick(); return; }
  if (state.introPhase !== 'done') { skipIntro(); return; }
  if (state.cutscene) { skipCutscene(); return; }
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
          state.gold -= supplyCost.gold;
          state.wood -= supplyCost.wood;
          state.meals -= supplyCost.meals;
          state.expeditionModifierSelect = false;
          addFloatingText(width / 2, height * 0.38, getModifier().name + ' Expedition', getModifier().color);
          enterConquest();
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
    let wx = snapToGrid(s2wX(mouseX));
    let wy = snapToGrid(s2wY(mouseY));
    placeBuilding(wx, wy);
    return;
  }

  // Ship shop click handling
  if (state.ship.shopOpen && state.ship.state === 'docked') {
    let panW = 300;
    let panH = 54 + state.ship.offers.length * 28 + 24;
    let panX = width / 2 - panW / 2;
    let panY = height / 2 - panH / 2;
    for (let i = 0; i < state.ship.offers.length; i++) {
      let oy = panY + 54 + i * 28;
      if (mouseX > panX + 12 && mouseX < panX + panW - 12 && mouseY > oy && mouseY < oy + 24) {
        doTrade(i);
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
        let wasBlessed = p.blessed;
        p.planted = false; p.ripe = false; p.glowing = false;
        p.timer = 0; p.stage = 0; p.blessed = false;
        let harvestAmt = state.npc.hearts >= 5 ? 2 : 1;
        if (state.tools.sickle) harvestAmt *= 2;
        if (state.blessing.type === 'luck') harvestAmt *= 2;
        if (state.heartRewards.includes('golden')) harvestAmt *= 2;
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
        // Harvest combo
        harvestAmt = onHarvestCombo(p, harvestAmt);
        state.harvest += harvestAmt;
        state.dailyActivities.harvested += harvestAmt;
        if (snd) snd.playSFX('harvest');
        triggerPlayerJoy();
        unlockJournal('first_harvest');
        state.codex.cropsGrown[p.cropType || 'grain'] = true;
        checkQuestProgress('harvest', harvestAmt);
        if (typeof advanceMainQuestCounter === 'function') advanceMainQuestCounter('mq_harvested', harvestAmt);
        // Auto-seeds: each harvest gives 1-2 seeds back
        let seedBack = 1 + (random() < 0.5 ? 1 : 0);
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
        let label = wasBlessed ? '+' + harvestAmt + ' BLESSED!' : (harvestAmt > 1 ? '+' + harvestAmt + ' Harvest!' : '+Harvest');
        let labelColor = scData ? scData.color : (wasBlessed ? '#ffdd00' : C.cropGlow);
        addFloatingText(px, py - 20, label, labelColor);
        spawnHarvestBurst(p.x, p.y, p.cropType || 'grain');
        triggerScreenShake(wasBlessed ? 4 : 1.5, wasBlessed ? 8 : 4);
      } else if (!p.planted) {
        let canPlant = false;
        let cropType = state.cropSelect || 'grain';
        if (cropType === 'grape' && state.grapeSeeds > 0) { state.grapeSeeds--; canPlant = true; }
        else if (cropType === 'olive' && state.oliveSeeds > 0) { state.oliveSeeds--; canPlant = true; }
        else if (isSeasonalCrop(cropType)) {
          let sc = getSeasonalCropData(cropType);
          if (sc && sc.season === getSeason() && state.seeds > 0) { state.seeds--; canPlant = true; }
          else { cropType = 'grain'; if (state.seeds > 0) { state.seeds--; canPlant = true; } }
        }
        else if (state.seeds > 0) { state.seeds--; canPlant = true; cropType = 'grain'; }
        if (canPlant) {
          p.planted = true; p.stage = 0; p.timer = 0; p.cropType = cropType;
          if (typeof advanceNPCQuestCounter === 'function') advanceNPCQuestCounter('nq_livia_planted', 1);
          let label = cropType === 'grain' ? 'Planted' : 'Planted ' + cropType;
          addFloatingText(px, py - 20, label, C.vineLight);
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
      let amt = nearCrystal.charge >= 30 ? 2 : 1;
      if (pickBonus) amt += 1;
      state.crystals += amt;
      if (snd) snd.playSFX('crystal');
      state.dailyActivities.crystal += amt;
      checkQuestProgress('crystal', amt);
      if (typeof advanceMainQuestCounter === 'function') advanceMainQuestCounter('mq_crystals_gathered', amt);
      unlockJournal('first_crystal');
      nearCrystal.charge = 0;
      nearCrystal.respawnTimer = 800; // respawns after ~800 frames
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
      chopTree(nearTree);
      clicked = true;
    }
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

  if (!clicked) {
    let wx = s2wX(mouseX);
    let wy = s2wY(mouseY);
    state.player.targetX = wx;
    state.player.targetY = wy;
  }
}

function mouseDragged() {
  // Drag volume sliders in settings
  if (gameScreen === 'settings' && snd) {
    let py = floor(height * 0.28);
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
}

function keyPressed() {
  if (snd) snd.resume();
  // Debug console intercepts all keys when open
  if (typeof Debug !== 'undefined' && Debug.handleKey(key, keyCode)) return;
  if (gameScreen !== 'game') {
    // ESC from settings/credits back to menu
    if (keyCode === 27 && (gameScreen === 'settings' || gameScreen === 'credits')) {
      gameScreen = 'menu';
    }
    // Menu keyboard navigation
    if (gameScreen === 'menu') {
      let hasSave = !!localStorage.getItem('sunlitIsles_save');
      let btnCount = hasSave ? 4 : 3;
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

  // ESC — save and return to main menu
  if (keyCode === 27) {
    saveGame();
    gameScreen = 'menu';
    menuFadeIn = 0;
    return;
  }

  // ─── IMPERATOR CEREMONY DISMISS ───
  if (state.victoryCeremony && state.victoryCeremony.phase === 4) {
    state.victoryCeremony = null;
    return;
  }

  // ─── NEW ISLAND [E] INTERACTIONS ───
  if (state.vulcan.active) {
    if (key === 'e' || key === 'E') handleVulcanInteract();
    return;
  }
  if (state.hyperborea.active) {
    if (key === 'e' || key === 'E') handleHyperboreInteract();
    return;
  }
  if (state.plenty.active) {
    if (key === 'e' || key === 'E') handlePlentyInteract();
    return;
  }
  if (state.necropolis.active) {
    if (key === 'e' || key === 'E') handleNecropolisInteract();
    return;
  }

  // ─── WRECK BEACH KEYS ───
  if (state.progression.gameStarted && !state.progression.homeIslandReached &&
      !state.rowing.active && !state.conquest.active && !state.adventure.active) {
    if (key === 'e' || key === 'E') handleWreckInteract();
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
      if (state.meals < supplyCost.meals) {
        addFloatingText(width / 2, height * 0.3, 'Need ' + supplyCost.meals + ' meals!', '#ff6644');
        return;
      }
      // Deduct and embark
      state.gold -= supplyCost.gold;
      state.wood -= supplyCost.wood;
      state.meals -= supplyCost.meals;
      state.expeditionModifierSelect = false;
      let modName = getModifier().name;
      addFloatingText(width / 2, height * 0.38, modName + ' Expedition', getModifier().color);
      enterConquest();
      return;
    }
    return; // block other keys while selecting
  }

  // Economy system keys (trade routes, spec selection)
  if (typeof handleEconomyKey === 'function') {
    if (handleEconomyKey(key, keyCode)) return;
  }

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
      if (dShip < 60) { exitConquest(); return; }
    }
    if (key === 'q' || key === 'Q') { usePotion(); return; }
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
    // Dodge roll on SHIFT (enhanced via combat.js)
    if (keyCode === SHIFT) {
      if (typeof tryDodgeRoll === 'function') tryDodgeRoll();
      if (state.player.dashCooldown <= 0 && state.solar >= 10) {
        state.player.dashTimer = 10;
        state.player.dashCooldown = 60;
        state.solar -= 10;
        spawnParticles(state.player.x, state.player.y, 'dash', 5);
      }
    }
    return;
  }

  // Adventure mode keys
  if (state.adventure.active) {
    // Attack
    if (key === ' ' || key === 'j' || key === 'J') { playerAttack(); return; }
    // Retreat (only between waves or victory)
    if ((key === 'e' || key === 'E') && state.adventure.waveState !== 'fighting') {
      exitAdventure(); return;
    }
    // Potion
    if (key === 'q' || key === 'Q') { usePotion(); return; }
    // Dash works in arena too
    if (keyCode === SHIFT && state.player.dashCooldown <= 0 && state.solar >= 10) {
      state.player.dashTimer = 10;
      state.player.dashCooldown = 60;
      state.solar -= 10;
      spawnParticles(state.player.x, state.player.y, 'dash', 5);
    }
    return; // Block all other keys during adventure
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
  // Dash
  if (keyCode === SHIFT && state.player.dashCooldown <= 0 && state.solar >= 10) {
    state.player.dashTimer = 10;
    state.player.dashCooldown = 60;
    state.solar -= 10;
    if (snd) snd.playSFX('dash');
    spawnParticles(state.player.x, state.player.y, 'dash', 5);
  }

  // Interact
  if (key === 'e' || key === 'E') {
    // Dive — E near water (moved from D key to avoid movement conflict)
    if (typeof startDive === 'function' && !state.rowing.active && !state.buildMode &&
        !state.conquest.active && !state.adventure.active) {
      let inWater = isInShallows(state.player.x, state.player.y) ||
                    !isOnIsland(state.player.x, state.player.y);
      if (inWater) { startDive(); return; }
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
      if (r.nearIsle === 'arena') { enterAdventure(); return; }
      if (r.nearIsle === 'conquest') {
        if (state.conquest.colonized) {
          // Colonized — free, peaceful entry
          enterConquest();
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
        state.player.x = WRECK.cx + 40;
        state.player.y = WRECK.cy + 10;
        state.player.vx = 0; state.player.vy = 0;
        cam.x = state.player.x; cam.y = state.player.y;
        camSmooth.x = cam.x; camSmooth.y = cam.y;
        addFloatingText(width / 2, height * 0.35, 'Wreck Beach', C.sand);
        return;
      }
      if (r.nearIsle === 'vulcan') { enterVulcan(); return; }
      if (r.nearIsle === 'hyperborea') { enterHyperborea(); return; }
      if (r.nearIsle === 'plenty') { enterPlenty(); return; }
      if (r.nearIsle === 'necropolis') { enterNecropolis(); return; }
      // Otherwise disembark — snap player back to pier
      let port = getPortPosition();
      state.rowing.active = false;
      state.player.x = port.x - 40;
      state.player.y = port.y;
      state.player.vx = 0;
      state.player.vy = 0;
      addFloatingText(width / 2, height * 0.35, 'Back on solid ground', C.textBright);
      return;
    }
    // Check if near rowboat at pier (pier extends left from port) — gate behind villa
    let _canBoard = !state.progression.gameStarted || state.progression.villaCleared;
    let port = getPortPosition();
    let boatWorldX = port.x - 80;
    let boatWorldY = port.y + 20;
    if (_canBoard && dist(state.player.x, state.player.y, boatWorldX, boatWorldY) < 60) {
      state.rowing.active = true;
      state.rowing.x = boatWorldX;
      state.rowing.y = boatWorldY;
      state.rowing.angle = PI; // facing left (west, away from island)
      state.rowing.speed = 0;
      state.rowing.oarPhase = 0;
      state.rowing.wakeTrail = [];
      addFloatingText(width / 2, height * 0.35, 'Rowing the Navis Parva! WASD to sail, E to dock', C.solarBright);
      return;
    }
    // Visitor trade
    if (state.visitor && !state.visitor.interacted && dist(state.player.x, state.player.y, state.visitor.x, state.visitor.y) < 70) {
      tradeWithVisitor(); return;
    }
    // Treasure dig
    if (state.activeTreasure && !state.activeTreasure.found) {
      if (digTreasure()) return;
    }
    // Collect bottles
    let nearBottle = state.bottles.find(b => !b.collected && dist(state.player.x, state.player.y, b.x, b.y) < 40);
    if (nearBottle) { collectBottle(nearBottle); return; }
    // Night market interaction
    if (state.nightMarket.active) {
      let mp = getMarketPosition();
      if (dist(state.player.x, state.player.y, mp.x, mp.y) < 60) {
        state.nightMarket.shopOpen = !state.nightMarket.shopOpen;
        return;
      }
    }
    // Rite of Mare Nostrum — crystal shrine (Chapter X)
    if (state.crystalShrine && dist(state.player.x, state.player.y, state.crystalShrine.x, state.crystalShrine.y) < 55) {
      if (state.narrativeFlags && !state.narrativeFlags['rite_mare_nostrum']) {
        let lvlOk = (state.islandLevel || 0) >= 25;
        let heartsOk = state.npc && state.npc.hearts >= 8 &&
                       state.marcus && state.marcus.hearts >= 8 &&
                       state.vesta && state.vesta.hearts >= 8 &&
                       state.felix && state.felix.hearts >= 8;
        if (lvlOk && heartsOk) {
          state.narrativeFlags['rite_mare_nostrum'] = true;
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
          addFloatingText(w2sX(state.crystalShrine.x), w2sY(state.crystalShrine.y) - 30, 'All four must hold you dear (8+ hearts each)', '#ff88cc');
          return;
        }
      } else if (state.narrativeFlags && state.narrativeFlags['rite_mare_nostrum']) {
        addFloatingText(w2sX(state.crystalShrine.x), w2sY(state.crystalShrine.y) - 30, 'The rite is complete. Mare Nostrum endures.', '#ffd700');
        return;
      }
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
      // Gift priority: wine/oil (3 hearts), meals (2 hearts), harvest (1 heart)
      let giftHearts = 0;
      let giftName = '';
      if (state.wine > 0) {
        state.wine--; giftHearts = 3; giftName = 'Wine';
      } else if (state.oil > 0) {
        state.oil--; giftHearts = 3; giftName = 'Olive Oil';
      } else if (state.meals > 0) {
        state.meals--; giftHearts = 2; giftName = 'Meal';
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
        state.dailyActivities.gifted++;
        unlockJournal('npc_friend');
        if (n.hearts >= 5) unlockJournal('five_hearts');
        checkHeartMilestones(n.hearts);
      } else {
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
        // Gift check
        let giftH = 0, giftN = '';
        let wineBonus = (state.prophecy && state.prophecy.type === 'wine') ? 2 : 1;
        if (state.wine > 0) { state.wine--; giftH = 3 * wineBonus; giftN = 'Wine'; }
        else if (state.oil > 0) { state.oil--; giftH = 3 * wineBonus; giftN = 'Oil'; }
        else if (state.meals > 0) { state.meals--; giftH = 2; giftN = 'Meal'; }
        else if (state.harvest > 0) { state.harvest--; giftH = 1; giftN = 'Harvest'; }
        else if (state.fish > 0 && name === 'Marcus') { state.fish--; giftH = 2; giftN = 'Fish'; }
        else if (state.crystals > 1 && name === 'Vesta') { state.crystals--; giftH = 2; giftN = 'Crystal'; }

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
          nn.currentLine = getNPCDialogue(nn, lines, mid, high);
          nn.dialogTimer = 180;
          npcHeartPop(nn);
          state.dailyActivities.gifted++;
          let ht = giftH > 1 ? '+' + giftH + ' Hearts (' + giftN + ')' : '+Heart';
          addFloatingText(w2sX(nn.x), w2sY(nn.y) - 30, ht, '#ff6688');
        } else {
          // Offer NPC personal quest or use expanded dialogue
          let _nk = name.toLowerCase();
          let _aq = (typeof getAvailableNPCQuest === 'function' && state.npcQuests) ? getAvailableNPCQuest(_nk) : null;
          if (_aq && !state.npcQuests[_nk].active) {
            startNPCQuest(_nk, _aq); nn.dialogTimer = 250;
          } else {
            let _ed = (typeof getExpandedDialogue === 'function') ? getExpandedDialogue(_nk) : null;
            nn.currentLine = _ed || getNPCDialogue(nn, lines, mid, high);
            nn.dialogTimer = 150;
          }
        }
      }
    });
  }

  // Fishing / Trade with ship
  if (key === 'f' || key === 'F') {
    if (state.fishing.active && state.fishing.bite) {
      reelFish();
    } else if (state.ship.shopOpen && state.ship.state === 'docked') {
      // Trade handled by number keys below
    } else if (!state.fishing.active && !state.buildMode) {
      // Auto-switch to rod for fishing
      if (state.player.hotbarSlot !== 3) { state.player.hotbarSlot = 3; addFloatingText(width / 2, height - 110, 'Switched to Rod', '#aaddaa'); }
      startFishing();
    }
  }
  // Trade number keys when shop is open
  if (state.ship.shopOpen && state.ship.state === 'docked') {
    let tradeIdx = parseInt(key) - 1;
    if (tradeIdx >= 0 && tradeIdx < state.ship.offers.length) {
      doTrade(tradeIdx);
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
  }

  // Dialog advance with Space
  if (dialogState.active && key === ' ') { advanceDialog(); return; }

  // Close overlays with ESC
  if (keyCode === 27) {
    if (empireDashOpen) { empireDashOpen = false; return; }
    if (inventoryOpen) { inventoryOpen = false; return; }
    if (typeof skillTreeOpen !== 'undefined' && skillTreeOpen) { skillTreeOpen = false; return; }
    if (dialogState.active) { dialogState.active = false; return; }
  }

  // Empire Dashboard toggle (Tab)
  if (keyCode === 9) {
    if (state.codexOpen) {
      state.journalOpen = !state.journalOpen;
    } else {
      empireDashOpen = !empireDashOpen;
      if (empireDashOpen) inventoryOpen = false;
    }
    return false; // prevent browser tab switching
  }

  // Inventory toggle (I key)
  if (key === 'i' || key === 'I') {
    inventoryOpen = !inventoryOpen;
    if (inventoryOpen) empireDashOpen = false;
    return;
  }

  // Skill tree toggle (K key)
  if (key === 'k' || key === 'K') {
    if (typeof toggleSkillTree === 'function') toggleSkillTree();
    return;
  }

  // Block input when overlays are open
  if (empireDashOpen || inventoryOpen) return;

  // Villa Codex toggle
  if (key === 'v' || key === 'V') {
    state.codexOpen = !state.codexOpen;
    state.journalOpen = false;
  }

  // Build mode toggle
  if (key === 'b' || key === 'B') {
    state.buildMode = !state.buildMode;
    if (state.buildMode) {
      addFloatingText(width / 2, height * 0.4, 'BUILD MODE ON', C.crystalGlow);
    } else {
      addFloatingText(width / 2, height * 0.4, 'BUILD MODE OFF', C.textDim);
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
    if (key === 'q' || key === 'Q') state.buildRotation = (state.buildRotation + 1) % 2;
  }

  // Expand island
  if (key === 'x' || key === 'X') {
    expandIsland();
  }

  // Build Imperial Bridge
  if (key === 'v' || key === 'V') {
    let nearPyramid = dist2(state.player.x, state.player.y, state.pyramid.x, state.pyramid.y) < 70;
    if (nearPyramid && canBuildBridge()) {
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

// Returns 0=beach 1=ankle 2=waist 3=swimming 4=deep/dive
function getWreckDepth(wx, wy) {
  let ex = (wx - WRECK.cx) / WRECK.rx;
  let ey = (wy - WRECK.cy) / (WRECK.ry * 0.55);
  let d  = sqrt(ex * ex + ey * ey);
  if (d < WRECK_DEPTH_THRESHOLDS[0]) return 0;
  if (d < WRECK_DEPTH_THRESHOLDS[1]) return 1;
  if (d < WRECK_DEPTH_THRESHOLDS[2]) return 2;
  if (d < WRECK_DEPTH_THRESHOLDS[3]) return 3;
  return 4;
}

function updateWreckBeach(dt) {
  let p = state.player;

  // ── Depth calculation ────────────────────────────────────────────────────
  let prevDepth = state.diving.depth || 0;
  let curDepth  = getWreckDepth(p.x, p.y);
  state.diving.depth = curDepth;

  // Speed multiplier by depth zone
  let speedMul = WRECK_DEPTH_SPEEDS[curDepth] * 0.8; // 0.8 = wreck "injured" penalty

  // ── Movement input ────────────────────────────────────────────────────────
  let mx = 0, my = 0;
  if (keyIsDown(65) || keyIsDown(LEFT_ARROW))  mx -= 1;
  if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) mx += 1;
  if (keyIsDown(87) || keyIsDown(UP_ARROW))    my -= 1;
  if (keyIsDown(83) || keyIsDown(DOWN_ARROW))  my += 1;
  if (mx !== 0 || my !== 0) {
    let len = sqrt(mx * mx + my * my);
    mx /= len; my /= len;
    p.vx = mx * p.speed * speedMul;
    p.vy = my * p.speed * speedMul;
    p.moving = true;
    if (abs(mx) > abs(my)) p.facing = mx > 0 ? 'right' : 'left';
    else p.facing = my > 0 ? 'down' : 'up';
  } else {
    // Decelerate — faster drag in water
    let drag = curDepth >= 3 ? 0.8 : 0.7;
    p.vx *= drag; p.vy *= drag;
    if (abs(p.vx) < 0.1 && abs(p.vy) < 0.1) { p.vx = 0; p.vy = 0; p.moving = false; }
  }
  p.x += p.vx * dt; p.y += p.vy * dt;

  // ── Ocean current boundary (no teleport, no hard wall) ───────────────────
  // Explorable area: 2.5x island radius in each direction
  let boundRX = WRECK.rx * 2.5;
  let boundRY = WRECK.ry * 1.8 * 2.5 / 2.2; // proportional
  let bex = (p.x - WRECK.cx) / boundRX;
  let bey = (p.y - WRECK.cy) / boundRY;
  let bDist = bex * bex + bey * bey;
  if (bDist > 1.0) {
    // Graceful current pushback — scales with overshoot, never teleports
    let ang = atan2(p.y - WRECK.cy, p.x - WRECK.cx);
    let over = bDist - 1.0;
    let pushStr = over * 3.5 + 0.8; // stronger the further out
    p.vx -= cos(ang) * pushStr * dt;
    p.vy -= sin(ang) * pushStr * dt;
    // Message hint — only once per crossing
    if (over > 0.02 && frameCount % 90 === 0) {
      addFloatingText(w2sX(p.x), w2sY(p.y) - 20, 'The current is too strong...', '#88bbcc');
    }
  }

  // ── Splash particles on zone transitions ─────────────────────────────────
  if (curDepth !== prevDepth) {
    let sx = w2sX(p.x), sy = w2sY(p.y);
    // Entering water from beach
    if (prevDepth === 0 && curDepth === 1) {
      spawnWreckSplash(p.x, p.y, 4, 5);
    } else if (prevDepth <= 1 && curDepth === 2) {
      spawnWreckSplash(p.x, p.y, 8, 9);
    } else if (prevDepth <= 2 && curDepth === 3) {
      spawnWreckSplash(p.x, p.y, 12, 13);
    } else if (prevDepth <= 3 && curDepth === 4) {
      spawnWreckSplash(p.x, p.y, 18, 16);
    }
    // Surfacing — big exit splash
    if (prevDepth === 4 && curDepth <= 3) {
      spawnWreckSplash(p.x, p.y, 14, 14);
    }
    // Auto-exit dive if waded back to shallows
    if (state.diving.active && curDepth < 4) {
      if (typeof exitDive === 'function') exitDive();
    }
  }

  // ── Ankle-deep walking splashes ───────────────────────────────────────────
  if (curDepth === 1 && p.moving && frameCount % 18 === 0) {
    spawnWreckSplash(p.x, p.y, 3, 4);
  }
  if (curDepth === 2 && p.moving && frameCount % 12 === 0) {
    spawnWreckSplash(p.x, p.y, 5, 6);
  }

  // ── Update crabs + ambient ────────────────────────────────────────────────
  updateWreckCrabs(dt);
  updateWreckAmbient(dt);

  // ── Tutorial hints ────────────────────────────────────────────────────────
  if (!state.progression.tutorialsSeen.gather && state.wreck.scavNodes.some(n => !n.collected)) {
    let nearest = getNearestScavNode();
    if (nearest && dist(p.x, p.y, nearest.x, nearest.y) < 50) {
      showTutorialHint('Press E to gather', nearest.x, nearest.y - 20);
    }
  }

  // ── Raft hints ────────────────────────────────────────────────────────────
  let raftX = WRECK.cx, raftY = WRECK.cy + 35;
  if (state.wreck.raftBuilt) {
    if (dist(p.x, p.y, raftX, raftY) < 55) {
      showTutorialHint('Press E to launch the raft!', raftX, raftY - 25);
    }
  } else if (dist(p.x, p.y, raftX, raftY) < 55 && (state.wood > 0 || state.seeds > 0)) {
    showTutorialHint('Press E to add materials to raft', raftX, raftY - 25);
  }
}

function spawnWreckSplash(wx, wy, count, speed) {
  for (let i = 0; i < count; i++) {
    let ang = random(TWO_PI);
    let spd = random(0.3, 1) * speed * 0.25;
    particles.push({
      x: wx + random(-4, 4), y: wy + random(-2, 2),
      vx: cos(ang) * spd, vy: sin(ang) * spd * 0.5 - random(0.5, 1.5),
      life: 20 + random(20), maxLife: 40,
      type: 'splash_drop',
      r: 180, g: 225, b: 255,
      size: random(1.5, 3.5),
      world: true,
    });
  }
  // Ring flash
  particles.push({
    x: wx, y: wy,
    vx: 0, vy: 0,
    life: 10, maxLife: 10,
    type: 'splash_ring',
    r: 200, g: 240, b: 255,
    size: speed * 2.5,
    world: true,
  });
}

function getNearestScavNode() {
  let p = state.player;
  let best = null, bestD = Infinity;
  for (let n of state.wreck.scavNodes) {
    if (n.collected) continue;
    let d = dist(p.x, p.y, n.x, n.y);
    if (d < bestD) { bestD = d; best = n; }
  }
  return bestD < 40 ? best : null;
}

function collectScavNode(node) {
  node.collected = true;
  if (snd) snd.playSFX('scavenge');
  let t = node.type;
  let label = '';
  if (t === 'stick' || t === 'plank') { state.wood += (t === 'plank' ? 2 : 1); label = '+' + (t === 'plank' ? '2' : '1') + ' Wood'; }
  else if (t === 'stone' || t === 'flint') { state.stone += (t === 'flint' ? 2 : 1); label = '+' + (t === 'flint' ? '2' : '1') + ' Stone'; }
  else if (t === 'rope') { state.wood += 1; label = '+1 Rope'; }
  else if (t === 'cloth') { state.seeds += 1; label = '+1 Cloth'; }
  else if (t === 'coconut') { state.fish += 1; label = '+1 Coconut (Food)'; }
  addFloatingText(w2sX(node.x), w2sY(node.y) - 10, label, C.solarGold);

  // Mark tutorial seen
  state.progression.tutorialsSeen.gather = true;

  // Check if enough materials to hint at raft building
  if (state.wood >= 2 && !state.progression.tutorialsSeen.repair) {
    showTutorialHint('Head to the south beach to build a raft', WRECK.cx, WRECK.cy + 30);
    state.progression.tutorialsSeen.repair = true;
  }
}

function buildRaft() {
  let w = state.wreck;
  if (w.raftBuilt) return;
  // Add whatever materials the player has, up to the requirements
  let added = false;
  let woodNeeded = 8 - w.raftWood;
  let ropeNeeded = 4 - w.raftRope;
  let clothNeeded = 2 - w.raftCloth;

  // Wood: stored in state.wood (planks give 2, sticks give 1)
  if (state.wood > 0 && woodNeeded > 0) {
    let give = min(state.wood, woodNeeded);
    state.wood -= give; w.raftWood += give; added = true;
  }
  // Rope: stored in state.wood too (rope nodes give +1 wood) — we use a heuristic:
  // Actually rope was collected as wood. We'll just use wood for both wood+rope costs.
  // Let's simplify: rope needed is tracked separately and also costs from wood pool.
  if (state.wood > 0 && ropeNeeded > 0) {
    let give = min(state.wood, ropeNeeded);
    state.wood -= give; w.raftRope += give; added = true;
  }
  // Cloth: stored in state.seeds (cloth nodes give +1 seeds)
  if (state.seeds > 0 && clothNeeded > 0) {
    let give = min(state.seeds, clothNeeded);
    state.seeds -= give; w.raftCloth += give; added = true;
  }

  if (added) {
    if (snd) snd.playSFX('repair');
    w.raftProgress = floor((w.raftWood / 8 + w.raftRope / 4 + w.raftCloth / 2) / 3 * 100);
    let raftX = WRECK.cx, raftY = WRECK.cy + 35;
    addFloatingText(w2sX(raftX), w2sY(raftY) - 15,
      'RAFT ' + w.raftProgress + '%', w.raftProgress >= 100 ? C.crystalGlow : C.solarGold);
    if (w.raftWood >= 8 && w.raftRope >= 4 && w.raftCloth >= 2) {
      w.raftBuilt = true;
      w.raftProgress = 100;
      state.progression.triremeRepaired = true; // reuse flag for progression
      addFloatingText(w2sX(raftX), w2sY(raftY) - 30,
        'RAFT COMPLETE!', C.crystalGlow);
      unlockJournal('trireme_repair');
    }
  } else {
    addFloatingText(w2sX(WRECK.cx), w2sY(WRECK.cy + 35) - 15,
      'Need more materials!', C.textDim);
  }
}

function sailToHome() {
  // Play sailing cutscene — completeSailToHome() called when done
  startSailingCutscene();
}

// Handle E key on wreck beach
function handleWreckInteract() {
  let p = state.player;

  // Collect nearest scavenge node (priority over crabs)
  let node = getNearestScavNode();
  if (node) { collectScavNode(node); return; }

  // Catch nearest crab
  let crab = getNearestCrab();
  if (crab) { catchCrab(crab); return; }

  // Build raft (south shore construction spot)
  let raftX = WRECK.cx, raftY = WRECK.cy + 35;
  if (dist(p.x, p.y, raftX, raftY) < 55 && !state.wreck.raftBuilt) {
    buildRaft(); return;
  }

  // Launch raft to sail home
  if (state.wreck.raftBuilt && dist(p.x, p.y, raftX, raftY) < 55) {
    sailToHome(); return;
  }

  // Build campfire (costs 2 wood + 1 stone)
  if (!state.wreck.campfire && state.wood >= 2 && state.stone >= 1) {
    let cfX = WRECK.cx + 20, cfY = WRECK.cy + 5;
    if (dist(p.x, p.y, cfX, cfY) < 60) {
      state.wreck.campfire = true;
      state.wood -= 2; state.stone -= 1;
      addFloatingText(w2sX(cfX), w2sY(cfY) - 10, 'CAMPFIRE BUILT', C.solarFlare);
    }
  }
}

// Wreck beach rowing awareness — detect wreck island when sailing
function updateWreckRowing(dt) {
  if (!state.rowing.active) return;
  let r = state.rowing;
  // Detect proximity to wreck beach
  let wDx = (r.x - WRECK.cx) / WRECK.rx;
  let wDy = (r.y - WRECK.cy) / WRECK.ry;
  let wDist = wDx * wDx + wDy * wDy;
  if (wDist < 2.0 * 2.0) {
    r.nearIsle = 'wreck';
  }
  // Collision
  if (wDist < 0.8 * 0.8) {
    let ang = atan2(r.y - WRECK.cy, r.x - WRECK.cx);
    r.x = WRECK.cx + cos(ang) * WRECK.rx * 0.82;
    r.y = WRECK.cy + sin(ang) * WRECK.ry * 0.82;
    r.speed *= 0.3;
  }
}

// ─── CRAB AI + CATCH ────────────────────────────────────────────────────
function getNearestCrab() {
  let p = state.player;
  let best = null, bestD = Infinity;
  for (let c of state.wreck.crabs) {
    let d = dist(p.x, p.y, c.x, c.y);
    if (d < bestD) { bestD = d; best = c; }
  }
  return bestD < 22 ? best : null; // tight range — must be right next to crab
}

function catchCrab(crab) {
  let idx = state.wreck.crabs.indexOf(crab);
  if (idx >= 0) state.wreck.crabs.splice(idx, 1);
  state.fish += 1; // crab meat as food
  state.stone += 1; // shell
  if (snd) snd.playSFX('crab_catch');
  addFloatingText(w2sX(crab.x), w2sY(crab.y) - 10, '+1 Crab Meat +1 Shell', C.solarGold);
  // Bubble burst particles
  for (let i = 0; i < 4; i++) {
    particles.push({
      x: w2sX(crab.x), y: w2sY(crab.y),
      vx: random(-1, 1), vy: random(-1.5, -0.5),
      life: 25, maxLife: 25, size: 2, type: 'sparkle',
      color: [200, 220, 255],
    });
  }
}

function updateWreckCrabs(dt) {
  let p = state.player;
  for (let c of state.wreck.crabs) {
    let pdist = dist(p.x, p.y, c.x, c.y);

    // Flee if player is close
    if (pdist < 45 && c.state !== 'flee') {
      c.state = 'flee';
      c.timer = 40;
      let ang = atan2(c.y - p.y, c.x - p.x);
      c.vx = cos(ang) * 1.2;
      c.vy = sin(ang) * 1.2;
      c.facing = c.vx > 0 ? 1 : -1;
    }

    c.timer -= dt;
    if (c.timer <= 0) {
      if (c.state === 'flee' || c.state === 'wander') {
        c.state = 'idle';
        c.timer = random(80, 200);
        c.vx = 0; c.vy = 0;
      } else {
        // Start wandering
        c.state = 'wander';
        c.timer = random(30, 80);
        let ang = random(TWO_PI);
        c.vx = cos(ang) * 0.4;
        c.vy = sin(ang) * 0.3;
        c.facing = c.vx > 0 ? 1 : -1;
      }
    }

    c.x += c.vx * dt;
    c.y += c.vy * dt;

    // Constrain to beach
    let ex = (c.x - WRECK.cx) / (WRECK.rx * 0.75);
    let ey = (c.y - WRECK.cy) / (WRECK.ry * 0.28);
    if (ex * ex + ey * ey > 1.0) {
      let ang = atan2(c.y - WRECK.cy, c.x - WRECK.cx);
      c.x = WRECK.cx + cos(ang) * WRECK.rx * 0.73;
      c.y = WRECK.cy + sin(ang) * WRECK.ry * 0.27;
      c.vx = -c.vx; c.vy = -c.vy;
      c.facing = c.vx > 0 ? 1 : -1;
    }

    // Bubble timer
    c.bubbleTimer -= dt;
    if (c.bubbleTimer <= 0 && c.state === 'idle') {
      c.bubbleTimer = random(120, 300);
      particles.push({
        x: w2sX(c.x), y: w2sY(c.y) - 3,
        vx: random(-0.2, 0.2), vy: -0.5,
        life: 20, maxLife: 20, size: 2, type: 'sparkle',
        color: [200, 230, 255],
      });
    }
  }
}

// ─── WRECK AMBIENT — birds, glints ──────────────────────────────────────
function updateWreckAmbient(dt) {
  let w = state.wreck;
  // Bird fly-bys — occasional
  if (w.birds.length < 2 && random() < 0.003) {
    let fromLeft = random() > 0.5;
    w.birds.push({
      x: fromLeft ? WRECK.cx - 300 : WRECK.cx + 300,
      y: WRECK.cy - 40 - random(20),
      vx: fromLeft ? 1.5 + random(0.5) : -1.5 - random(0.5),
      phase: random(TWO_PI),
    });
  }
  for (let b of w.birds) {
    b.x += b.vx * dt;
    b.y += sin(b.phase + frameCount * 0.02) * 0.1;
  }
  w.birds = w.birds.filter(b => abs(b.x - WRECK.cx) < 400);

  // Sun glints on sand — sparkle randomly
  if (w.glints.length < 3 && random() < 0.01) {
    w.glints.push({
      x: WRECK.cx + random(-WRECK.rx * 0.7, WRECK.rx * 0.7),
      y: WRECK.cy + random(-5, 15),
      timer: 30 + random(30),
    });
  }
  for (let g of w.glints) g.timer -= dt;
  w.glints = w.glints.filter(g => g.timer > 0);
}

// ─── DRAW WRECK ISLAND ──────────────────────────────────────────────────
function drawWreckIsland() {
  let cx = WRECK.cx, cy = WRECK.cy;
  let rx = WRECK.rx, ry = WRECK.ry;
  let sx = w2sX(cx), sy = w2sY(cy);

  if (sx + rx < -400 || sx - rx > width + 400 || sy + ry < -300 || sy - ry > height + 300) return;

  noStroke();
  let sandRX = rx * 0.88, sandRY = ry * 0.50;
  let bright = typeof getSkyBrightness === 'function' ? getSkyBrightness() : 0.6;
  let t0 = frameCount * 0.01;

  // ─── DEEP WATER SHADOW beneath island ───
  fill(10, 25, 45, 40);
  ellipse(sx + 5, sy + sandRY + 8, sandRX * 2.0, 25);

  // ─── SHALLOW LAGOON — turquoise rings with wave distortion ───
  for (let ring = 0; ring < 5; ring++) {
    let ringScale = 1.35 - ring * 0.06;
    let ringRX = sandRX * ringScale;
    let ringRY = sandRY * ringScale * 1.15;
    let alpha = 90 + ring * 25;
    let r = lerp(35, 95, ring / 4);
    let g = lerp(110, 185, ring / 4);
    let b = lerp(155, 200, ring / 4);
    fill(r * bright, g * bright, b, alpha);
    for (let row = -ringRY; row < ringRY; row += 3) {
      let t = row / ringRY;
      let w2 = ringRX * sqrt(max(0, 1 - t * t));
      let wave = sin(t0 * 2 + row * 0.06) * 3;
      rect(floor(sx - w2 + wave), floor(sy + row), floor(w2 * 2), 3);
    }
  }

  // ─── REEF / ROCKS in shallow water ───
  let reefPositions = [
    [-0.7, 0.6], [0.8, 0.5], [-0.5, -0.7], [0.6, -0.6], [-0.9, 0.1], [0.95, 0.2],
    [-0.3, 0.8], [0.4, 0.75], [0.1, -0.8], [-0.8, -0.4],
  ];
  for (let rp of reefPositions) {
    let rrx = sx + rp[0] * sandRX * 1.15;
    let rry = sy + rp[1] * sandRY * 1.3;
    // Dark rock
    fill(60 * bright, 55 * bright, 48);
    rect(floor(rrx - 5), floor(rry - 3), 10, 6, 1);
    fill(75 * bright, 70 * bright, 58);
    rect(floor(rrx - 4), floor(rry - 3), 8, 3, 1);
    // Water foam around rock
    let foam = sin(t0 * 3 + rp[0] * 5) * 0.3 + 0.7;
    fill(220, 240, 255, 40 * foam);
    rect(floor(rrx - 7), floor(rry - 1), 14, 2);
  }

  // ─── WET SAND RING ───
  let wetRX = sandRX * 1.06, wetRY = sandRY * 1.08;
  for (let row = -wetRY; row < wetRY; row += 2) {
    let t = row / wetRY;
    let w2 = wetRX * sqrt(max(0, 1 - t * t));
    // Add organic wobble to the edge
    let wobble = sin(row * 0.08 + 1.5) * 4 + sin(row * 0.15 + 3.2) * 2;
    fill(165 * bright, 150 * bright, 115);
    rect(floor(sx - w2 + wobble), floor(sy + row), floor(w2 * 2 - wobble * 2), 2);
  }

  // ─── SAND SURFACE — organic shape with wobble ───
  for (let row = -sandRY; row < sandRY; row += 2) {
    let t = row / sandRY;
    let w2 = sandRX * sqrt(max(0, 1 - t * t));
    // Organic edge — multiple sine waves create natural coastline
    let wobble = sin(row * 0.06 + 0.7) * 6 + sin(row * 0.13 + 2.1) * 3 + sin(row * 0.21 + 4.5) * 2;
    w2 += wobble;
    let edgeDarken = abs(t) > 0.5 ? (abs(t) - 0.5) * 30 : 0;
    let r = (228 - edgeDarken) * bright;
    let g = (208 - edgeDarken * 0.8) * bright;
    let b2 = (158 - edgeDarken * 0.5);
    fill(r, g, b2);
    rect(floor(sx - w2), floor(sy + row), floor(w2 * 2), 2);
  }

  // Sunlit highlight patch
  for (let row = -sandRY * 0.35; row < sandRY * 0.15; row += 2) {
    let t = row / sandRY;
    let w2 = sandRX * 0.3 * sqrt(max(0, 1 - t * t * 8));
    fill(245, 235, 200, 35 * bright);
    rect(floor(sx - sandRX * 0.1 - w2), floor(sy + row), floor(w2 * 2), 2);
  }

  // ─── SAND TEXTURE ───
  for (let i = 0; i < 55; i++) {
    let angle = (i * 2.39996) % TWO_PI; // golden angle distribution
    let r = ((i * 17 + 7) % 100) / 100 * 0.8;
    let px = sx + cos(angle) * sandRX * r;
    let py = sy + sin(angle) * sandRY * r * 0.5;
    let dx = (px - sx) / sandRX, dy = (py - sy) / sandRY;
    if (dx * dx + dy * dy < 0.6) {
      if (i % 4 === 0) { fill(205, 188, 140, 80); rect(floor(px), floor(py), 5, 2); }
      else if (i % 4 === 1) { fill(235, 220, 180, 50); rect(floor(px), floor(py), 3, 1); }
      else if (i % 4 === 2) { fill(195, 175, 125, 60); rect(floor(px), floor(py), 4, 2); }
      else { fill(215, 200, 160, 40); rect(floor(px), floor(py), 2, 3); }
    }
  }

  // ─── TIDE LINE — dark wet sand line around beach perimeter ───
  for (let i = -sandRX * 0.85; i < sandRX * 0.85; i += 4) {
    let t = i / sandRX;
    let edgeY = sandRY * 0.85 * sqrt(max(0, 1 - t * t));
    let wave = sin(t0 * 1.5 + i * 0.05) * 1.5;
    fill(160 * bright, 140 * bright, 100, 80);
    rect(floor(sx + i), floor(sy + edgeY + wave), 4, 1);
    // Scattered seaweed along tide line
    if (abs(sin(i * 0.3 + 1.7)) > 0.92) {
      fill(45, 80, 40, 120);
      rect(floor(sx + i), floor(sy + edgeY + wave - 2), 3, 4);
    }
  }

  // ─── DRIFTWOOD PILES — scattered larger pieces ───
  let driftPiles = [[-0.4, 0.35], [0.55, 0.3], [-0.15, 0.4], [0.3, 0.38]];
  for (let dp of driftPiles) {
    let dpx = sx + dp[0] * sandRX, dpy = sy + dp[1] * sandRY;
    fill(95 * bright, 65 * bright, 32);
    rect(floor(dpx - 10), floor(dpy), 20, 3);
    rect(floor(dpx - 6), floor(dpy + 2), 14, 2);
    fill(80 * bright, 55 * bright, 28);
    rect(floor(dpx - 8), floor(dpy + 1), 6, 1);
  }

  // ─── SEAWEED PATCHES on rocks and edges ───
  let seaweedSpots = [[-0.6, 0.3], [0.7, 0.25], [-0.2, 0.42], [0.45, 0.38], [-0.85, 0.15]];
  for (let sw of seaweedSpots) {
    let swx = sx + sw[0] * sandRX, swy = sy + sw[1] * sandRY;
    let sway = sin(t0 * 2 + sw[0] * 5) * 1;
    fill(40, 75, 35, 130);
    rect(floor(swx - 3 + sway), floor(swy - 3), 2, 6);
    rect(floor(swx + sway), floor(swy - 2), 2, 5);
    rect(floor(swx + 3 + sway), floor(swy - 1), 2, 4);
    fill(55, 95, 45, 100);
    rect(floor(swx - 1 + sway), floor(swy - 4), 2, 3);
  }

  // Shells, pebbles, coral scattered
  let decoSeed = [[-65,8],[80,14],[-100,-12],[55,25],[30,18],[-90,20],[110,-5],[-40,30],[70,-15],[-20,-20]];
  for (let i = 0; i < decoSeed.length; i++) {
    let dx = decoSeed[i][0], dy = decoSeed[i][1];
    let dsx = floor(sx + dx), dsy = floor(sy + dy);
    if (i % 3 === 0) { fill(235, 225, 200); ellipse(dsx, dsy, 4, 3); fill(245, 238, 218); ellipse(dsx, dsy - 1, 2, 2); }
    else if (i % 3 === 1) { fill(180, 165, 130); rect(dsx, dsy, 5, 3, 1); }
    else { fill(215, 130, 110, 150); rect(dsx, dsy, 3, 4); rect(dsx + 2, dsy - 2, 2, 3); }
  }

  // ─── SHORE FOAM — multi-layered animated waves ───
  let foamPhase = t0 * 2;
  // Bottom foam — thick crashing waves
  for (let i = -sandRX * 0.9; i < sandRX * 0.9; i += 5) {
    let t = i / sandRX;
    let edgeY = sandRY * sqrt(max(0, 1 - t * t)) + 5;
    let wave1 = sin(foamPhase + i * 0.04) * 4;
    let wave2 = sin(foamPhase * 0.7 + i * 0.06 + 2) * 2;
    // Primary foam
    fill(240, 248, 255, 70 + sin(foamPhase * 1.5 + i * 0.07) * 25);
    rect(floor(sx + i), floor(sy + edgeY - 3 + wave1), 5, 3);
    // Secondary foam line
    fill(225, 238, 250, 40);
    rect(floor(sx + i + 2), floor(sy + edgeY + 2 + wave2), 4, 2);
    // Spray dots
    if (abs(sin(foamPhase * 2 + i * 0.1)) > 0.85) {
      fill(255, 255, 255, 60);
      rect(floor(sx + i + 1), floor(sy + edgeY - 5 + wave1), 2, 1);
    }
  }
  // Side foam
  for (let row = -sandRY * 0.6; row < sandRY * 1.1; row += 5) {
    let t = row < sandRY ? row / sandRY : 1.0;
    let w2 = sandRX * sqrt(max(0, 1 - min(1, t) * min(1, t)));
    let wave = sin(foamPhase * 0.8 + row * 0.03) * 3;
    fill(235, 245, 255, 35);
    rect(floor(sx - w2 - 3 + wave), floor(sy + row), 4, 4);
    rect(floor(sx + w2 - 1 - wave), floor(sy + row), 4, 4);
  }

  // ─── ROCKY OUTCROP — north side of island (dramatic cliff) ───
  let rockX = sx - sandRX * 0.5, rockY = sy - sandRY * 0.6;
  for (let row = 0; row < 25; row += 2) {
    let rw = 40 - row * 1.2;
    fill((85 - row) * bright, (78 - row) * bright, 65 - row * 0.5);
    rect(floor(rockX - rw / 2), floor(rockY + row), floor(rw), 2);
  }
  fill(100 * bright, 92 * bright, 78);
  rect(floor(rockX - 15), floor(rockY), 30, 4, 1);
  // Rock texture lines
  fill(70 * bright, 65 * bright, 55, 80);
  rect(floor(rockX - 10), floor(rockY + 8), 20, 1);
  rect(floor(rockX - 8), floor(rockY + 14), 16, 1);

  // Second rock cluster — east side
  let rock2X = sx + sandRX * 0.6, rock2Y = sy - sandRY * 0.3;
  for (let row = 0; row < 18; row += 2) {
    let rw = 30 - row;
    fill((80 - row) * bright, (72 - row) * bright, 60 - row * 0.5);
    rect(floor(rock2X - rw / 2), floor(rock2Y + row), floor(rw), 2);
  }

  // ─── TIDAL POOLS — small water pools on the beach ───
  let poolPositions = [[0.25, 0.2], [-0.3, 0.25], [0.5, 0.1]];
  for (let pp of poolPositions) {
    let ppx = sx + pp[0] * sandRX, ppy = sy + pp[1] * sandRY;
    fill(70, 140, 170, 120);
    ellipse(ppx, ppy, 16, 10);
    fill(90, 160, 185, 80);
    ellipse(ppx - 2, ppy - 1, 10, 6);
    // Caustic shimmer
    let cShim = sin(t0 * 3 + pp[0] * 10) * 0.3 + 0.7;
    fill(140, 210, 240, 30 * cShim);
    rect(floor(ppx - 3), floor(ppy - 2), 4, 2);
  }

  // ─── BROKEN TRIREME — scenery only, not repairable ───
  let triX = w2sX(cx - 80), triY = w2sY(cy - 20);

  push();
  translate(floor(triX), floor(triY));
  rotate(-0.08); // tilted — beached at an angle

  // Always show as wrecked — dark weathered wood
  let hullDark = [48, 30, 14];
  let hullMid = [62, 40, 18];
  let hullLight = [75, 50, 24];

  // Sand piled against hull (buried effect)
  fill(210 * bright, 192 * bright, 148);
  beginShape();
  vertex(-70, 12); vertex(-55, 8); vertex(-30, 14); vertex(0, 10);
  vertex(30, 16); vertex(55, 12); vertex(60, 18); vertex(-70, 18);
  endShape(CLOSE);

  // Hull bottom — massive curved shape
  fill(hullDark[0], hullDark[1], hullDark[2]);
  beginShape();
  vertex(-65, -5); vertex(-55, -14); vertex(-30, -20);
  vertex(0, -22); vertex(30, -20); vertex(50, -14); vertex(55, -5);
  vertex(55, 12); vertex(-65, 12);
  endShape(CLOSE);

  // Hull planking
  fill(hullMid[0], hullMid[1], hullMid[2]);
  rect(-60, -12, 110, 3);
  rect(-55, -6, 105, 3);
  rect(-50, 0, 100, 3);
  rect(-48, 6, 96, 3);

  // Ribs — exposed structural timbers
  fill(hullLight[0], hullLight[1], hullLight[2]);
  for (let i = -5; i <= 5; i++) {
    let ribX = i * 10;
    let ribH = 30 - abs(i) * 2;
    rect(ribX - 1, -20 + abs(i), 3, ribH);
  }

  // Keel — spine of the ship
  fill(hullDark[0] - 10, hullDark[1] - 8, hullDark[2] - 5);
  rect(-60, -2, 115, 4);

  // Bow (front) — pointed, sticking up
  fill(hullMid[0], hullMid[1], hullMid[2]);
  beginShape();
  vertex(-65, -5); vertex(-75, -15); vertex(-72, -28);
  vertex(-65, -22); vertex(-60, -14);
  endShape(CLOSE);
  // Ram (bronze, Roman trireme)
  fill(140, 110, 50);
  beginShape();
  vertex(-75, -15); vertex(-82, -12); vertex(-78, -8); vertex(-72, -10);
  endShape(CLOSE);

  // Stern ornament — broken
  fill(hullMid[0], hullMid[1], hullMid[2]);
  rect(48, -18, 6, 14);
  fill(hullLight[0], hullLight[1], hullLight[2]);
  rect(50, -22, 4, 6);

  // Broken mast — always wrecked (scenery)
  fill(80, 55, 25);
  rect(-2, -28, 5, 20);
  fill(90, 65, 30);
  beginShape();
  vertex(-2, -28); vertex(0, -34); vertex(3, -30); vertex(5, -33); vertex(3, -28);
  endShape(CLOSE);
  // Fallen spar on deck
  fill(70, 48, 22);
  push(); rotate(0.3);
  rect(-5, -15, 40, 3);
  pop();

  // Torn sail scrap on ground
  fill(195, 180, 155, 100);
  beginShape();
  vertex(-30, 5); vertex(-5, 2); vertex(10, 8); vertex(-25, 12);
  endShape(CLOSE);
  fill(145, 38, 28, 70);
  rect(-22, 6, 18, 3);

  // Oar stubs sticking out of hull
  fill(90, 65, 35);
  for (let i = 0; i < 4; i++) {
    let ox = -40 + i * 22, oy = -8;
    rect(ox, oy, 2, 12);
    if (i < 2) { // broken oars
      rect(ox - 8, oy + 10, 10, 2);
    }
  }

  // Barnacles on hull
  fill(130, 125, 110, 100);
  rect(-50, 6, 3, 3); rect(-30, 8, 2, 2);
  rect(20, 7, 3, 2); rect(40, 5, 2, 3);

  // Wreck atmosphere — no repair bar, just dramatic scenery
  // Barnacle and algae stains
  fill(40, 60, 35, 60);
  rect(-45, 4, 12, 3); rect(15, 6, 8, 2); rect(-20, 8, 10, 2);

  pop();

  // ─── WRECKAGE DEBRIS in water ───
  let debrisPositions = [
    [-0.85, 0.4, 0.1], [-0.7, 0.7, -0.05], [0.75, 0.55, 0.15],
    [0.9, 0.3, -0.08], [-0.6, -0.5, 0.12],
  ];
  for (let db of debrisPositions) {
    let dbx = sx + db[0] * sandRX * 1.3;
    let dby = sy + db[1] * sandRY * 1.2;
    let bob = sin(t0 * 1.5 + db[0] * 3) * 2;
    fill(65 * bright, 42 * bright, 20);
    rect(floor(dbx - 8), floor(dby + bob), 16, 3);
    rect(floor(dbx - 5), floor(dby - 2 + bob), 10, 2);
  }

  // ─── RAFT CONSTRUCTION ZONE — south shore ───
  {
    let raftSX = w2sX(cx), raftSY = w2sY(cy + 35);
    let rw = state.wreck;
    let prog = rw.raftBuilt ? 1 : (rw.raftWood / 8 + rw.raftRope / 4 + rw.raftCloth / 2) / 3;

    // Flat cleared area on sand
    fill(195 * bright, 178 * bright, 135);
    ellipse(raftSX, raftSY, 50, 20);

    // Log pile grows with progress
    let logCount = floor(prog * 6);
    for (let i = 0; i < logCount; i++) {
      let lx = raftSX - 15 + i * 5;
      let ly = raftSY - 2 + (i % 2) * 3;
      fill(85, 55, 25);
      rect(floor(lx), floor(ly), 12, 3);
      fill(70, 45, 20);
      rect(floor(lx + 1), floor(ly + 1), 10, 1);
    }

    // Rope coils (appear when rope added)
    if (rw.raftRope > 0) {
      fill(145, 120, 70);
      for (let i = 0; i < min(rw.raftRope, 4); i++) {
        ellipse(raftSX + 12 + i * 5, raftSY + 3, 5, 4);
      }
    }

    // Cloth sheets (appear when cloth added)
    if (rw.raftCloth > 0) {
      fill(195, 180, 155, 180);
      rect(floor(raftSX - 10), floor(raftSY - 6), 14, 4);
      if (rw.raftCloth >= 2) {
        fill(165, 40, 25, 120);
        rect(floor(raftSX - 8), floor(raftSY - 5), 10, 2);
      }
    }

    // Complete raft
    if (rw.raftBuilt) {
      // Raft platform
      fill(100, 68, 30);
      rect(floor(raftSX - 18), floor(raftSY - 5), 36, 10);
      fill(85, 55, 25);
      for (let i = 0; i < 5; i++) {
        rect(floor(raftSX - 18), floor(raftSY - 5 + i * 2), 36, 1);
      }
      // Small mast + sail
      fill(80, 55, 25);
      rect(floor(raftSX - 1), floor(raftSY - 20), 3, 18);
      fill(195, 180, 155, 200);
      beginShape();
      vertex(raftSX + 2, raftSY - 18);
      vertex(raftSX + 16, raftSY - 14);
      vertex(raftSX + 14, raftSY - 6);
      vertex(raftSX + 2, raftSY - 4);
      endShape(CLOSE);
      // Glow when ready
      fill(80, 230, 130, 25 + sin(frameCount * 0.05) * 12);
      ellipse(raftSX, raftSY, 60, 30);
    }

    // Interaction hint
    let pdist = dist(state.player.x, state.player.y, cx, cy + 35);
    if (pdist < 55 && !rw.raftBuilt) {
      fill(255, 240, 180, 30 + sin(frameCount * 0.06) * 15);
      ellipse(raftSX, raftSY, 45, 22);
    }
  }

  // ─── CAMPFIRE ───
  if (state.wreck.campfire) {
    let cfX = w2sX(cx + 40), cfY = w2sY(cy + 15);
    // Stone ring — larger, more detailed
    fill(90, 82, 68);
    ellipse(cfX, cfY + 2, 20, 10);
    fill(110, 100, 85);
    for (let i = 0; i < 8; i++) {
      let a = i / 8 * TWO_PI;
      rect(floor(cfX + cos(a) * 8 - 2), floor(cfY + sin(a) * 4), 4, 3, 1);
    }
    // Charred center
    fill(30, 25, 20);
    ellipse(cfX, cfY, 12, 6);
    // Fire — layered, animated
    let flicker = sin(frameCount * 0.15) * 2;
    let flicker2 = sin(frameCount * 0.22 + 1) * 1.5;
    // Outer flame
    fill(255, 100, 20, 150);
    beginShape();
    vertex(cfX - 5, cfY); vertex(cfX - 3 + flicker2, cfY - 14);
    vertex(cfX, cfY - 18 + flicker); vertex(cfX + 3 - flicker2, cfY - 12);
    vertex(cfX + 5, cfY);
    endShape(CLOSE);
    // Mid flame
    fill(255, 170, 40, 200);
    beginShape();
    vertex(cfX - 3, cfY - 2); vertex(cfX - 1 + flicker, cfY - 12);
    vertex(cfX + 1 - flicker, cfY - 10); vertex(cfX + 3, cfY - 2);
    endShape(CLOSE);
    // Inner core
    fill(255, 240, 120, 220);
    ellipse(cfX, cfY - 4, 4, 6);
    // Embers
    for (let e = 0; e < 3; e++) {
      let ex = cfX + sin(frameCount * 0.1 + e * 2) * 8;
      let ey = cfY - 10 - (frameCount * 0.3 + e * 20) % 20;
      let ea = 200 - ((frameCount * 0.3 + e * 20) % 20) * 10;
      if (ea > 0) {
        fill(255, 180, 40, ea);
        rect(floor(ex), floor(ey), 2, 2);
      }
    }
    // Glow radius
    fill(255, 160, 50, 12);
    ellipse(cfX, cfY - 4, 60, 40);
    // Smoke
    for (let s = 0; s < 3; s++) {
      let smokeY = cfY - 20 - s * 12 - (frameCount * 0.2) % 15;
      let smokeX = cfX + sin(frameCount * 0.02 + s) * 6;
      let smokeA = max(0, 40 - s * 12 - ((frameCount * 0.2) % 15) * 2);
      fill(120, 115, 105, smokeA);
      ellipse(smokeX, smokeY, 8 + s * 3, 5 + s * 2);
    }
  }

  // ─── AMBIENT MIST over water (atmospheric) ───
  for (let m = 0; m < 4; m++) {
    let mx = sx + sin(t0 * 0.3 + m * 1.8) * sandRX * 1.3;
    let my = sy + sandRY * 0.8 + cos(t0 * 0.2 + m * 2.3) * 15;
    let ma = 15 + sin(t0 * 0.5 + m) * 8;
    fill(200, 220, 240, ma * bright);
    ellipse(mx, my, 80 + m * 20, 12);
  }
}

function drawWreckEntities() {
  noStroke();
  let w = state.wreck;

  // ─── BEACH DECOR (behind everything) ───
  for (let d of w.decor) {
    let sx = floor(w2sX(d.x)), sy = floor(w2sY(d.y));
    if (d.type === 'shell') {
      fill(225, 215, 195);
      rect(sx - 2, sy, 4, 3);
      fill(240, 230, 210);
      rect(sx - 1, sy, 2, 2);
    } else if (d.type === 'driftwood') {
      fill(120, 95, 60);
      rect(sx - 8, sy, 16, 2);
      fill(100, 80, 50);
      rect(sx - 6, sy + 1, 10, 1);
    } else if (d.type === 'seaweed') {
      fill(50, 90, 45, 150);
      rect(sx - 4, sy, 2, 5);
      rect(sx, sy - 1, 2, 6);
      rect(sx + 3, sy + 1, 2, 4);
    }
  }

  // ─── SUN GLINTS ───
  for (let g of w.glints) {
    let sx = floor(w2sX(g.x)), sy = floor(w2sY(g.y));
    let a = min(200, g.timer * 5);
    fill(255, 250, 220, a);
    rect(sx - 1, sy - 3, 2, 6);
    rect(sx - 3, sy - 1, 6, 2);
    fill(255, 255, 240, a * 0.5);
    rect(sx, sy - 1, 1, 2);
  }

  // ─── PALM TREES ───
  for (let palm of w.palms) {
    if (palm.chopped) continue;
    let sx = floor(w2sX(palm.x)), sy = floor(w2sY(palm.y));
    let sz = palm.size;
    let sway = sin(frameCount * 0.015 + palm.swayPhase) * 3 * sz;

    // Trunk — brown with segments
    fill(110, 75, 40);
    rect(floor(sx - 2 * sz), floor(sy - 20 * sz), floor(4 * sz), floor(22 * sz));
    // Trunk highlights
    fill(130, 90, 50, 80);
    for (let seg = 0; seg < 4; seg++) {
      rect(floor(sx - 2 * sz), floor(sy - 20 * sz + seg * 5 * sz), floor(4 * sz), floor(1));
    }

    // Fronds — 4 leaf fans, swaying
    let topX = floor(sx + sway), topY = floor(sy - 22 * sz);
    fill(60, 120, 40);
    // Left fronds
    rect(topX - floor(12 * sz), topY - floor(2 * sz), floor(12 * sz), floor(3 * sz));
    rect(topX - floor(10 * sz), topY - floor(5 * sz), floor(8 * sz), floor(2 * sz));
    // Right fronds
    rect(topX, topY - floor(2 * sz), floor(12 * sz), floor(3 * sz));
    rect(topX + floor(2 * sz), topY - floor(5 * sz), floor(8 * sz), floor(2 * sz));
    // Center tuft
    fill(70, 135, 50);
    rect(topX - floor(3 * sz), topY - floor(6 * sz), floor(6 * sz), floor(4 * sz));
    // Drooping tips
    fill(50, 105, 35);
    rect(topX - floor(14 * sz), topY + floor(1 * sz), floor(4 * sz), floor(1));
    rect(topX + floor(10 * sz), topY + floor(1 * sz), floor(4 * sz), floor(1));

    // Coconuts on tree
    fill(120, 85, 40);
    rect(topX - floor(2 * sz), topY + floor(1 * sz), floor(3 * sz), floor(3 * sz));
    rect(topX + floor(1 * sz), topY + floor(2 * sz), floor(3 * sz), floor(3 * sz));

    // Shadow at base
    fill(0, 0, 0, 20);
    rect(floor(sx - 6 * sz), floor(sy + 1), floor(12 * sz), floor(2));
  }

  // ─── SCAVENGE NODES ───
  let nodes = w.scavNodes;
  for (let n of nodes) {
    if (n.collected) continue;
    let sx = floor(w2sX(n.x)), sy = floor(w2sY(n.y));
    let bob = sin(frameCount * 0.04 + n.x * 0.1) * 1;

    // Glow when near player
    let pDist = dist(state.player.x, state.player.y, n.x, n.y);
    if (pDist < 40) {
      fill(255, 220, 100, 30);
      rect(sx - 8, sy - 2 + bob, 16, 3);
      rect(sx - 1, sy - 8 + bob, 3, 12);
    }

    if (n.type === 'stick') {
      fill(100, 70, 35);
      rect(sx - 6, sy + bob, 12, 2);
      fill(85, 60, 30);
      rect(sx - 4, sy + 1 + bob, 8, 1);
    } else if (n.type === 'stone') {
      fill(130, 125, 115);
      rect(sx - 4, sy + bob, 8, 5);
      fill(110, 105, 95);
      rect(sx - 3, sy + 1 + bob, 6, 3);
    } else if (n.type === 'rope') {
      fill(145, 120, 70);
      rect(sx - 3, sy + bob, 6, 6);
      fill(130, 105, 60);
      rect(sx - 2, sy + 1 + bob, 4, 4);
    } else if (n.type === 'plank') {
      fill(90, 60, 25);
      rect(sx - 10, sy + bob, 20, 3);
      fill(75, 50, 20);
      rect(sx - 8, sy + 1 + bob, 16, 1);
    } else if (n.type === 'flint') {
      fill(80, 75, 70);
      rect(sx - 3, sy + bob, 5, 5);
      fill(120, 115, 105, 100);
      rect(sx - 2, sy + bob, 2, 2);
    } else if (n.type === 'cloth') {
      fill(190, 175, 150);
      rect(sx - 5, sy + bob, 10, 4);
      fill(160, 45, 30, 100);
      rect(sx - 3, sy + 1 + bob, 6, 2);
    } else if (n.type === 'coconut') {
      fill(120, 85, 40);
      rect(sx - 3, sy + bob, 6, 5);
      fill(100, 70, 30);
      rect(sx - 2, sy + 1 + bob, 4, 3);
      // Three dots
      fill(60, 40, 20);
      rect(sx - 1, sy + 2 + bob, 1, 1);
      rect(sx + 1, sy + 1 + bob, 1, 1);
    }

    // Label when very close — outlined for readability
    if (pDist < 30) {
      textSize(11); textAlign(CENTER, BOTTOM);
      let lbl = n.type === 'coconut' ? 'COCONUT' : n.type.toUpperCase();
      fill(0, 0, 0, 180);
      text(lbl, sx + 1, sy - 5 + bob);
      fill(240, 230, 200);
      text(lbl, sx, sy - 6 + bob);
    }
  }

  // ─── CRABS ───
  for (let c of w.crabs) {
    let sx = floor(w2sX(c.x)), sy = floor(w2sY(c.y));
    let f = c.facing;
    let scuttle = c.state !== 'idle' ? sin(frameCount * 0.3) * 1 : 0;

    // Body — warm terracotta
    fill(195, 95, 55);
    rect(sx - 4, sy - 2 + scuttle, 8, 5);
    // Shell highlight
    fill(220, 120, 70);
    rect(sx - 3, sy - 2 + scuttle, 6, 2);
    // Eyes
    fill(20, 20, 20);
    rect(sx - 3, sy - 3 + scuttle, 1, 1);
    rect(sx + 2, sy - 3 + scuttle, 1, 1);
    // Eye stalks
    fill(195, 95, 55);
    rect(sx - 3, sy - 4 + scuttle, 1, 2);
    rect(sx + 2, sy - 4 + scuttle, 1, 2);
    // Claws
    fill(210, 105, 60);
    rect(sx - 6 * f, sy - 1 + scuttle, 3, 3);
    rect(sx + 4 * f, sy - 1 + scuttle, 3, 3);
    // Claw pincers
    fill(180, 85, 50);
    rect(sx - 7 * f, sy - 1 + scuttle, 1, 2);
    rect(sx + 6 * f, sy - 1 + scuttle, 1, 2);
    // Legs — 3 per side
    fill(170, 80, 45);
    for (let i = 0; i < 3; i++) {
      let legOff = sin(frameCount * 0.2 + i) * (c.state !== 'idle' ? 1 : 0);
      rect(sx - 5 - floor(legOff), sy + i * 1 + scuttle, 1, 1);
      rect(sx + 4 + floor(legOff), sy + i * 1 + scuttle, 1, 1);
    }

    // "Catch" hint when close — outlined
    let pdist = dist(state.player.x, state.player.y, c.x, c.y);
    if (pdist < 30) {
      textSize(11); textAlign(CENTER, BOTTOM);
      fill(0, 0, 0, 180);
      text('E: CATCH', sx + 1, sy - 7);
      fill(240, 230, 200);
      text('E: CATCH', sx, sy - 8);
    }
  }

  // ─── FLYING BIRDS ───
  for (let b of w.birds) {
    let sx = floor(w2sX(b.x)), sy = floor(w2sY(b.y));
    let wingUp = sin(frameCount * 0.08 + b.phase) > 0;
    fill(60, 55, 50, 120);
    // Simple bird silhouette — V shape
    if (wingUp) {
      rect(sx - 4, sy - 1, 3, 1);
      rect(sx - 2, sy - 2, 2, 1);
      rect(sx + 1, sy - 2, 2, 1);
      rect(sx + 2, sy - 1, 3, 1);
    } else {
      rect(sx - 4, sy + 1, 3, 1);
      rect(sx - 2, sy, 2, 1);
      rect(sx + 1, sy, 2, 1);
      rect(sx + 2, sy + 1, 3, 1);
    }
  }

  textAlign(LEFT, TOP);
}

function drawWreckHUD() {
  noStroke();
  let hx = 12, hy = 12;
  let w = state.wreck;
  let panelH = 95;

  // Dark semi-transparent background panel
  fill(10, 8, 5, 220);
  rect(hx - 6, hy - 6, 210, panelH, 4);
  // Subtle gold border
  stroke(150, 120, 50, 120);
  strokeWeight(1);
  noFill();
  rect(hx - 6, hy - 6, 210, panelH, 4);
  noStroke();

  // Helper: outlined text for readability
  let outText = function(txt, x, y, col) {
    fill(0, 0, 0, 180);
    text(txt, x + 1, y + 1);
    fill(col || color(240, 230, 200));
    text(txt, x, y);
  };

  textAlign(LEFT, TOP);

  // Resource header
  textSize(11);
  outText('RAFT MATERIALS', hx, hy, color(220, 200, 140));

  // Wood X/8
  textSize(11);
  let woodCol = w.raftWood >= 8 ? color(100, 255, 150) : color(200, 170, 100);
  outText('Wood ' + (state.wood + w.raftWood) + '  (' + w.raftWood + '/8)', hx, hy + 15, woodCol);

  // Rope X/4
  let ropeCol = w.raftRope >= 4 ? color(100, 255, 150) : color(180, 150, 90);
  outText('Rope ' + (state.wood > 0 ? '+' + state.wood : '') + '  (' + w.raftRope + '/4)', hx, hy + 29, ropeCol);

  // Cloth X/2
  let clothCol = w.raftCloth >= 2 ? color(100, 255, 150) : color(200, 180, 150);
  outText('Cloth ' + (state.seeds > 0 ? '+' + state.seeds : '') + '  (' + w.raftCloth + '/2)', hx, hy + 43, clothCol);

  // Raft progress bar
  let barX = hx, barY = hy + 58, barW = 140, barH = 8;
  let prog = w.raftBuilt ? 100 : w.raftProgress;
  fill(20, 18, 12, 200);
  rect(barX, barY, barW, barH, 2);
  if (prog > 0) {
    fill(w.raftBuilt ? color(80, 220, 120) : color(180, 150, 60));
    rect(barX + 1, barY + 1, floor((barW - 2) * prog / 100), barH - 2, 1);
  }
  textSize(11);
  outText(w.raftBuilt ? 'RAFT READY!' : 'Raft: ' + prog + '%', barX + barW + 6, barY - 1,
    w.raftBuilt ? color(100, 255, 150) : color(200, 190, 150));

  // Day/time + food
  textSize(11);
  let hrs = floor(state.time / 60), mins = floor(state.time % 60);
  outText('Day ' + state.day + '  ' + nf(hrs, 2) + ':' + nf(mins, 2), hx, hy + 72, color(180, 170, 140));
  outText('Food: ' + state.fish, hx + 100, hy + 72, color(100, 180, 255));

  // Hint text at bottom of panel
  textSize(11);
  let hintAlpha = 140 + sin(frameCount * 0.03) * 40;
  if (w.raftBuilt) {
    fill(0, 0, 0, 150); text('Go to the raft and press E to set sail!', hx + 1, hy + panelH + 3);
    fill(100, 255, 150, hintAlpha); text('Go to the raft and press E to set sail!', hx, hy + panelH + 2);
  } else {
    fill(0, 0, 0, 150); text('Explore the beach and shallows for materials', hx + 1, hy + panelH + 3);
    fill(200, 190, 150, hintAlpha); text('Explore the beach and shallows for materials', hx, hy + panelH + 2);
  }
}

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

function drawTutorialHintUI() {
  if (!tutorialHint) return;
  let h = tutorialHint;
  let sx = w2sX(h.wx), sy = w2sY(h.wy);
  // Fade in/out
  let fadeIn = min(1, (180 - h.timer < 20) ? (180 - h.timer) / 20 : 1);
  let fadeOut = min(1, h.timer / 30);
  let a = min(fadeIn, fadeOut) * 255;
  let bob = sin(frameCount * 0.06) * 3;

  noStroke();
  textSize(9);
  let tw = textWidth(h.text) + 24;
  let hx = floor(sx - tw / 2), hy = floor(sy - 12 + bob);
  // Dark background with gold border
  fill(20, 16, 10, a * 0.8);
  rect(hx, hy, tw, 20, 4);
  stroke(212, 160, 64, a * 0.6);
  strokeWeight(1);
  noFill();
  rect(hx, hy, tw, 20, 4);
  noStroke();
  // Animated arrow pointing down
  let arrowY = hy + 22 + sin(frameCount * 0.08) * 3;
  fill(212, 160, 64, a * 0.8);
  triangle(sx - 4, arrowY, sx + 4, arrowY, sx, arrowY + 6);
  // Text
  fill(255, 240, 180, a);
  textAlign(CENTER, CENTER);
  text(h.text, floor(sx), hy + 10);
  textAlign(LEFT, TOP);
}

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
    addFloatingText(width / 2, height * 0.3, 'CENTURION JOINS YOU', C.solarGold);
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

function drawDiscoveryEvent() {
  if (!discoveryEvent) return;
  let evt = discoveryEvent;
  let a = min(255, (240 - evt.timer) * 4);
  if (evt.timer < 30) a = floor(evt.timer * 8);

  // Dark overlay strip
  noStroke();
  fill(15, 12, 8, floor(a * 0.7));
  rect(0, height * 0.35, width, 70);

  // Gold border
  fill(200, 170, 60, floor(a * 0.5));
  rect(0, height * 0.35, width, 2);
  rect(0, height * 0.35 + 68, width, 2);

  // Dialog text
  fill(240, 225, 180, a);
  textSize(11);
  textAlign(CENTER, CENTER);
  text(evt.text, width / 2, height * 0.35 + 25);

  // Subtext
  fill(180, 220, 150, a * (0.6 + sin(frameCount * 0.08) * 0.3));
  textSize(9);
  text(evt.subtext, width / 2, height * 0.35 + 48);
  textAlign(LEFT, TOP);
}

// Draw ruin overlay on buildings when NPCs not yet found
function drawRuinOverlays() {
  let prog = state.progression;
  if (!prog.gameStarted || prog.villaCleared) return;

  noStroke();
  // Overgrown vines on farm if not cleared
  if (!prog.farmCleared) {
    let plots = state.plots;
    for (let i = 0; i < plots.length; i++) {
      let p = plots[i];
      let sx = w2sX(p.x), sy = w2sY(p.y);
      if (sx < -50 || sx > width + 50 || sy < -50 || sy > height + 50) continue;
      // Dead brown overlay
      fill(80, 65, 35, 100);
      rect(floor(sx - p.w / 2), floor(sy - p.h / 2), p.w, p.h);
      // Weed tufts
      fill(60, 80, 30, 120);
      if (i % 3 === 0) {
        rect(floor(sx - 4), floor(sy - 6), 2, 6);
        rect(floor(sx + 2), floor(sy - 4), 2, 4);
      }
    }
  }

  // Cracked/vine overlay near NPCs that aren't found
  if (!prog.npcsFound.marcus) {
    // Rubble pile near Marcus location
    let mx = w2sX(WORLD.islandCX + WORLD.islandRX - 100);
    let my = w2sY(WORLD.islandCY + 20);
    if (mx > -100 && mx < width + 100) {
      fill(90, 80, 65, 180);
      rect(floor(mx - 15), floor(my - 5), 30, 12);
      rect(floor(mx - 10), floor(my - 10), 20, 6);
      fill(70, 65, 55, 150);
      rect(floor(mx - 8), floor(my + 2), 12, 4);
      // Help text glow
      if (dist(state.player.x, state.player.y, WORLD.islandCX + WORLD.islandRX - 100, WORLD.islandCY + 20) < 70) {
        fill(255, 200, 100, 60 + sin(frameCount * 0.06) * 30);
        textSize(8); textAlign(CENTER, CENTER);
        text('Someone is trapped...', floor(mx), floor(my - 18));
        textAlign(LEFT, TOP);
      }
    }
  }
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
      textSize(8);
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

function saveGame() {
  let saveData = {
    version: 7,
    day: state.day, time: state.time,
    seeds: state.seeds, harvest: state.harvest, wood: state.wood,
    stone: state.stone, crystals: state.crystals, gold: state.gold, fish: state.fish,
    grapeSeeds: state.grapeSeeds, oliveSeeds: state.oliveSeeds,
    meals: state.meals, wine: state.wine, oil: state.oil,
    weather: state.weather, heartRewards: state.heartRewards,
    marcusHearts: state.marcus ? state.marcus.hearts : 0,
    vestaHearts: state.vesta ? state.vesta.hearts : 0,
    felixHearts: state.felix ? state.felix.hearts : 0,
    harvestComboBestEver: state.harvestCombo.bestEver || 0,
    solar: state.solar, maxSolar: state.maxSolar,
    islandLevel: state.islandLevel, islandRX: state.islandRX, islandRY: state.islandRY,
    pyramidLevel: state.pyramid.level,
    playerX: state.player.x, playerY: state.player.y, playerFacing: state.player.facing,
    npcHearts: state.npc.hearts,
    companionX: state.companion.x, companionY: state.companion.y, companionEnergy: state.companion.energy,
    woodcutterX: state.woodcutter.x, woodcutterY: state.woodcutter.y, woodcutterEnergy: state.woodcutter.energy,
    quarrierX: state.quarrier.x, quarrierY: state.quarrier.y, quarrierEnergy: state.quarrier.energy, quarrierUnlocked: state.quarrier.unlocked,
    harvesterX: state.harvester ? state.harvester.x : null,
    harvesterY: state.harvester ? state.harvester.y : null,
    blessing: state.blessing,
    quest: state.quest,
    tools: state.tools,
    cropSelect: state.cropSelect,
    cats: state.cats ? state.cats.map(c => ({ x: c.x, y: c.y, facing: c.facing, color: c.color })) : [],
    plots: state.plots.map(p => ({ x: p.x, y: p.y, w: p.w, h: p.h, planted: p.planted, stage: p.stage, timer: p.timer, ripe: p.ripe, cropType: p.cropType || 'grain' })),
    buildings: state.buildings.map(b => ({ x: b.x, y: b.y, w: b.w, h: b.h, type: b.type, rot: b.rot })),
    trees: state.trees.map(t => ({ x: t.x, y: t.y, health: t.health, maxHealth: t.maxHealth, alive: t.alive, size: t.size, type: t.type })),
    crystalShrine: state.crystalShrine ? { x: state.crystalShrine.x, y: state.crystalShrine.y } : null,
    crystalNodes: state.crystalNodes.map(c => ({ x: c.x, y: c.y, size: c.size, phase: c.phase, charge: c.charge })),
    resources: state.resources.map(r => ({ x: r.x, y: r.y, type: r.type, active: r.active, respawnTimer: r.respawnTimer })),
    ruins: state.ruins.map(r => ({ x: r.x, y: r.y, w: r.w, h: r.h, rot: r.rot })),
    grassTufts: state.grassTufts.map(g => ({ x: g.x, y: g.y, blades: g.blades, height: g.height, hue: g.hue, sway: g.sway })),
    codex: state.codex,
    journal: state.journal,
    // Expedition system
    ironOre: state.ironOre, rareHide: state.rareHide,
    ancientRelic: state.ancientRelic, titanBone: state.titanBone,
    obsidian: state.obsidian, frostCrystal: state.frostCrystal,
    exoticSpices: state.exoticSpices, soulEssence: state.soulEssence,
    expeditionUpgrades: state.expeditionUpgrades,
    expeditionLog: state.expeditionLog,
    // Conquest persistence
    conquestPhase: state.conquest.phase,
    conquestWoodPile: state.conquest.woodPile,
    conquestExpeditionNum: state.conquest.expeditionNum,
    conquestBuildings: state.conquest.buildings,
    conquestBlueprintQueue: state.conquest.blueprintQueue.map(b => ({ x: b.x, y: b.y, type: b.type, progress: b.progress, maxProgress: b.maxProgress })),
    conquestSoldiers: state.conquest.soldiers.filter(s => s.hp > 0).map(s => ({ x: s.x, y: s.y, hp: s.hp, maxHp: s.maxHp })),
    conquestWorkers: state.conquest.workers.map(w => ({ x: w.x, y: w.y, type: w.type })),
    conquestTrees: state.conquest.trees.map(t => ({ x: t.x, y: t.y, hp: t.hp, maxHp: t.maxHp, alive: t.alive, size: t.size })),
    // Colony system
    conquestColonized: state.conquest.colonized,
    conquestColonyLevel: state.conquest.colonyLevel,
    conquestColonyWorkers: state.conquest.colonyWorkers,
    conquestColonyIncome: state.conquest.colonyIncome,
    conquestColonyPlots: state.conquest.colonyPlots,
    conquestColonyBuildings: state.conquest.colonyBuildings,
    conquestColonyGrassTufts: state.conquest.colonyGrassTufts,
    conquestIsleRX: state.conquest.isleRX,
    conquestIsleRY: state.conquest.isleRY,
    // Colony specialization
    colonySpec: state.colonySpec,
    // Imperial Bridge
    imperialBridge: state.imperialBridge,
    bountyBoard: state.bountyBoard,
    // Island exploration phases
    vulcanPhase: state.vulcan.phase,
    hyperboreaPhase: state.hyperborea.phase,
    plentyPhase: state.plenty.phase,
    necropolisPhase: state.necropolis.phase,
    // Victory
    won: state.won || false,
    // Progression system
    progression: state.progression,
    // Narrative engine
    mainQuest: state.mainQuest || null,
    npcQuests: state.npcQuests || null,
    loreTablets: state.loreTablets || null,
    narrativeFlags: state.narrativeFlags || null,
    // Diving resources & upgrades
    diving: {
      pearls: state.diving.pearls,
      coral: state.diving.coral,
      sponges: state.diving.sponges,
      amphoras: state.diving.amphoras,
      lungCapacity: state.diving.lungCapacity,
      diveSpeed: state.diving.diveSpeed,
      totalDives: state.diving.totalDives,
    },
    wreck: {
      scavNodes: state.wreck.scavNodes,
      triremeHP: state.wreck.triremeHP,
      raftProgress: state.wreck.raftProgress,
      raftBuilt: state.wreck.raftBuilt,
      raftWood: state.wreck.raftWood,
      raftRope: state.wreck.raftRope,
      raftCloth: state.wreck.raftCloth,
      campfire: state.wreck.campfire,
      palms: state.wreck.palms,
      crabs: state.wreck.crabs,
      decor: state.wreck.decor,
    },
  };
  try {
    localStorage.setItem('sunlitIsles_save', JSON.stringify(saveData));
    addFloatingText(width / 2, height * 0.4, 'GAME SAVED', C.crystalGlow);
  } catch(e) {
    addFloatingText(width / 2, height * 0.4, 'Save failed!', C.buildInvalid);
  }
}

function loadGame() {
  let raw = localStorage.getItem('sunlitIsles_save');
  if (!raw) {
    addFloatingText(width / 2, height * 0.4, 'No save found!', C.buildInvalid);
    return;
  }
  try {
    let d = JSON.parse(raw);
    state.day = d.day || 1; state.time = d.time || 360;
    state.seeds = d.seeds || 0; state.harvest = d.harvest || 0; state.wood = d.wood || 0;
    state.stone = d.stone || 0; state.crystals = d.crystals || 0; state.gold = d.gold || 0;
    state.fish = d.fish || 0;
    state.grapeSeeds = d.grapeSeeds || 0; state.oliveSeeds = d.oliveSeeds || 0;
    state.meals = d.meals || 0; state.wine = d.wine || 0; state.oil = d.oil || 0;
    state.heartRewards = d.heartRewards || [];
    if (d.weather) state.weather = d.weather;
    if (state.marcus) state.marcus.hearts = d.marcusHearts || 0;
    if (state.vesta) {
      state.vesta.hearts = d.vestaHearts || 0;
      state.vesta.x = WORLD.islandCX - 420;
      state.vesta.y = WORLD.islandCY - 5;
      state.vesta.task = 'idle'; state.vesta.timer = 0; state.vesta.carryCount = 0;
    }
    if (state.felix) state.felix.hearts = d.felixHearts || 0;
    state.harvestCombo.bestEver = d.harvestComboBestEver || 0;
    if (d.codex) state.codex = d.codex;
    if (d.journal) state.journal = d.journal;
    // Expedition resources
    state.ironOre = d.ironOre || 0;
    state.rareHide = d.rareHide || 0;
    state.ancientRelic = d.ancientRelic || 0;
    state.titanBone = d.titanBone || 0;
    state.obsidian = d.obsidian || 0;
    state.frostCrystal = d.frostCrystal || 0;
    state.exoticSpices = d.exoticSpices || 0;
    state.soulEssence = d.soulEssence || 0;
    if (d.expeditionUpgrades) {
      let eu = d.expeditionUpgrades;
      state.expeditionUpgrades = {
        workerSpeed: eu.workerSpeed || 0,
        workerCap: eu.workerCap || 0,
        dangerResist: eu.dangerResist || 0,
        lootBonus: eu.lootBonus || 0,
        soldierHP: eu.soldierHP || 0,
        expeditionTier: eu.expeditionTier || 0,
      };
    }
    if (d.expeditionLog) state.expeditionLog = d.expeditionLog;
    // Conquest persistence — always load to inactive (player starts on home island)
    state.conquest.active = false;
    state.conquest.enemies = [];
    state.conquest.lootBag = [];
    state.conquest.expeditionTimer = 0;
    state.conquest.dangerLevel = 0;
    state.conquest.rareSpawnTimer = 0;
    state.conquest.spawnTimer = 0;
    state.conquest.chopTarget = null;
    state.conquest.chopTimer = 0;
    state.conquest.buildMode = false;
    if (d.conquestPhase) state.conquest.phase = d.conquestPhase;
    state.conquest.woodPile = d.conquestWoodPile || 0;
    state.conquest.expeditionNum = d.conquestExpeditionNum || 0;
    if (d.bountyBoard) state.bountyBoard = d.bountyBoard;
    if (d.conquestBuildings) state.conquest.buildings = d.conquestBuildings;
    if (d.conquestBlueprintQueue) state.conquest.blueprintQueue = d.conquestBlueprintQueue;
    if (d.conquestTrees) {
      state.conquest.trees = d.conquestTrees.map(t => ({ ...t }));
    }
    if (d.conquestSoldiers) {
      state.conquest.soldiers = d.conquestSoldiers.map(s => ({
        ...s, vx: 0, vy: 0, state: 'follow', target: null,
        attackTimer: 0, facing: 1, flashTimer: 0,
      }));
    }
    if (d.conquestWorkers) {
      state.conquest.workers = d.conquestWorkers.map(w => ({
        x: w.x, y: w.y, vx: 0, vy: 0, task: 'idle', taskTarget: null,
        timer: 0, type: w.type, speed: 1.4, facing: 1,
      }));
    }
    // Colony system
    if (d.conquestColonized) {
      state.conquest.colonized = d.conquestColonized;
      state.conquest.colonyLevel = d.conquestColonyLevel || 1;
      state.conquest.colonyWorkers = d.conquestColonyWorkers || 3;
      state.conquest.colonyIncome = d.conquestColonyIncome || 5;
      state.conquest.colonyPlots = d.conquestColonyPlots || [];
      state.conquest.colonyBuildings = d.conquestColonyBuildings || [];
      state.conquest.colonyGrassTufts = d.conquestColonyGrassTufts || [];
      if (d.conquestIsleRX) state.conquest.isleRX = d.conquestIsleRX;
      if (d.conquestIsleRY) state.conquest.isleRY = d.conquestIsleRY;
    }
    // Imperial Bridge
    if (d.imperialBridge) {
      state.imperialBridge = d.imperialBridge;
    }
    // Colony specialization
    if (d.colonySpec) state.colonySpec = d.colonySpec;
    // Island exploration phases — prevents re-generating content on revisit
    if (d.vulcanPhase) state.vulcan.phase = d.vulcanPhase;
    if (d.hyperboreaPhase) state.hyperborea.phase = d.hyperboreaPhase;
    if (d.plentyPhase) state.plenty.phase = d.plentyPhase;
    if (d.necropolisPhase) state.necropolis.phase = d.necropolisPhase;
    // Victory state
    state.won = d.won || false;
    // Ensure prophecy exists
    if (!state.prophecy) state.prophecy = generateProphecy();
    // Load progression — old saves without progression = fully unlocked (veteran)
    if (d.progression) {
      state.progression = d.progression;
    } else {
      // Legacy save — mark everything as unlocked
      state.progression.gameStarted = false; // false = old save, skip progression gates
    }
    // Load narrative engine state
    if (d.mainQuest) state.mainQuest = d.mainQuest;
    if (d.npcQuests) state.npcQuests = d.npcQuests;
    if (d.loreTablets) state.loreTablets = d.loreTablets;
    if (d.narrativeFlags) state.narrativeFlags = d.narrativeFlags;
    // Load wreck state
    if (d.wreck) {
      state.wreck = d.wreck;
      // Compat defaults for saves before raft system
      if (state.wreck.raftProgress === undefined) state.wreck.raftProgress = 0;
      if (state.wreck.raftBuilt === undefined) state.wreck.raftBuilt = false;
      if (state.wreck.raftWood === undefined) state.wreck.raftWood = 0;
      if (state.wreck.raftRope === undefined) state.wreck.raftRope = 0;
      if (state.wreck.raftCloth === undefined) state.wreck.raftCloth = 0;
      if (!Array.isArray(state.wreck.birds)) state.wreck.birds = [];
      if (!Array.isArray(state.wreck.glints)) state.wreck.glints = [];
    }
    // Diving resources & upgrades
    if (d.diving) {
      state.diving.pearls = d.diving.pearls || 0;
      state.diving.coral = d.diving.coral || 0;
      state.diving.sponges = d.diving.sponges || 0;
      state.diving.amphoras = d.diving.amphoras || 0;
      state.diving.lungCapacity = d.diving.lungCapacity || 0;
      state.diving.diveSpeed = d.diving.diveSpeed || 0;
      state.diving.totalDives = d.diving.totalDives || 0;
    }
    state.solar = d.solar || 80; state.maxSolar = d.maxSolar || 100;
    state.islandLevel = d.islandLevel || 1; state.islandRX = d.islandRX || WORLD.islandRX; state.islandRY = d.islandRY || WORLD.islandRY;
    if (d.pyramidLevel) state.pyramid.level = d.pyramidLevel;
    state.player.x = d.playerX || WORLD.islandCX; state.player.y = d.playerY || WORLD.islandCY;
    if (d.playerFacing) state.player.facing = d.playerFacing;
    state.npc.hearts = d.npcHearts || 0;
    if (d.companionX) { state.companion.x = d.companionX; state.companion.y = d.companionY; }
    state.companion.energy = d.companionEnergy || 100;
    if (d.woodcutterX) { state.woodcutter.x = d.woodcutterX; state.woodcutter.y = d.woodcutterY; }
    state.woodcutter.energy = d.woodcutterEnergy || 100;
    if (d.quarrierX) { state.quarrier.x = d.quarrierX; state.quarrier.y = d.quarrierY; }
    state.quarrier.energy = d.quarrierEnergy || 100;
    state.quarrier.unlocked = d.quarrierUnlocked || (state.islandLevel >= 5);
    if (d.harvesterX && state.harvester) {
      state.harvester.x = d.harvesterX; state.harvester.y = d.harvesterY;
    }
    // Restore new systems
    if (d.blessing) state.blessing = d.blessing;
    if (d.quest) state.quest = d.quest;
    if (d.tools) state.tools = d.tools;
    if (d.cropSelect) state.cropSelect = d.cropSelect;
    // Rebuild farm grid based on level instead of loading chaotic positions
    rebuildFarmGrid(state.islandLevel);
    // Restore planted state from save
    if (d.plots) {
      d.plots.forEach((sp, i) => {
        if (i < state.plots.length) {
          state.plots[i].planted = sp.planted;
          state.plots[i].stage = sp.stage;
          state.plots[i].timer = sp.timer;
          state.plots[i].ripe = sp.ripe;
          state.plots[i].glowing = sp.ripe || false;
          state.plots[i].cropType = sp.cropType || 'grain';
        }
      });
    }
    if (d.buildings) state.buildings = d.buildings;
    if (d.trees) {
      // Rebuild trees as natural grove flanking the road
      let cx = WORLD.islandCX, cy = WORLD.islandCY;
      let srx = getSurfaceRX(), sry = getSurfaceRY();
      let avenueY = cy - 8;
      let texcl2 = getTempleExclusion();
      let pyrCX2 = state.pyramid ? state.pyramid.x : cx;
      let pyrCY2 = state.pyramid ? state.pyramid.y : (cy - 15);
      randomSeed(42);
      let slots = [];
      for (let tx = cx + 100; tx <= cx + 360; tx += 48 + random(-8, 8)) {
        slots.push({ x: tx + random(-6, 6), y: avenueY - 26 - random(0, 12) });
        slots.push({ x: tx + random(-6, 6), y: avenueY + 26 + random(0, 12) });
        if (random() > 0.5) slots.push({ x: tx + random(-10, 10), y: avenueY - 48 - random(0, 15) });
        if (random() > 0.6) slots.push({ x: tx + random(-10, 10), y: avenueY + 48 + random(0, 10) });
      }
      randomSeed(millis());
      let validSlots = slots.filter(s => {
        let ex = (s.x - cx) / srx, ey = (s.y - cy) / sry;
        if (ex * ex + ey * ey > 0.72) return false;
        let pcx = s.x - pyrCX2, pcy = s.y - pyrCY2;
        if (pcx * pcx + pcy * pcy < texcl2 * texcl2) return false;
        return true;
      });
      state.trees = validSlots.map((slot, i) => {
        let saved = d.trees[i] || {};
        return {
          x: slot.x, y: slot.y,
          health: saved.health != null ? saved.health : 3,
          maxHealth: saved.maxHealth || 3,
          alive: saved.alive != null ? saved.alive : true,
          regrowTimer: saved.alive === false ? 600 : 0,
          size: 0.75 + (i * 7 % 11) * 0.04,
          swayPhase: i * 1.3 + (i % 3) * 0.7,
          type: 'oak',
        };
      });
    }
    // Always use current shrine position (layout may have changed)
    state.crystalShrine = { x: WORLD.islandCX - 440, y: WORLD.islandCY - 15 };
    // Rebuild crystal nodes around shrine
    let shX = state.crystalShrine.x, shY = state.crystalShrine.y;
    let cSlots = [
      { dx: -30, dy: -20 }, { dx: 30, dy: -20 }, { dx: -40, dy: 15 },
      { dx: 40, dy: 15 }, { dx: 0, dy: -35 },
    ];
    state.crystalNodes = cSlots.map((s, i) => ({
      x: shX + s.dx, y: shY + s.dy,
      size: 12 + i * 2, phase: i * 1.2, charge: 40 + i * 15, respawnTimer: 0,
    }));
    // Add extra crystals for higher island levels
    if (state.islandLevel >= 2) state.crystalNodes.push({ x: shX + 50, y: shY + 30, size: 14, phase: random(TWO_PI), charge: 50, respawnTimer: 0 });
    if (state.islandLevel >= 3) state.crystalNodes.push({ x: shX - 50, y: shY + 30, size: 14, phase: random(TWO_PI), charge: 50, respawnTimer: 0 });
    if (state.islandLevel >= 4) state.crystalNodes.push({ x: shX, y: shY - 45, size: 16, phase: random(TWO_PI), charge: 60, respawnTimer: 0 });
    if (state.islandLevel >= 5) {
      state.crystalNodes.push({ x: shX - 60, y: shY - 10, size: 18, phase: random(TWO_PI), charge: 80, respawnTimer: 0 });
      state.crystalNodes.push({ x: shX + 60, y: shY - 10, size: 18, phase: random(TWO_PI), charge: 80, respawnTimer: 0 });
    }
    if (d.resources) {
      state.resources = d.resources.map(r => ({ ...r, pulsePhase: random(TWO_PI) }));
    }
    if (d.ruins) {
      state.ruins = d.ruins.map(r => ({ ...r }));
    }
    if (d.grassTufts) {
      state.grassTufts = d.grassTufts.map(g => ({ ...g }));
    }
    // Restore cats from save or rebuild
    if (d.cats && d.cats.length > 0) {
      state.cats = d.cats.map(c => ({
        ...c, state: 'idle', vx: 0, vy: 0,
        timer: random(60, 180), giftTimer: 1000,
      }));
    } else if (!state.cats || state.cats.length === 0) {
      state.cats = [];
      let ruinX = WORLD.islandCX + 100, ruinY = WORLD.islandCY - 40;
      for (let i = 0; i < 2; i++) {
        state.cats.push({
          x: ruinX + random(-40, 40), y: ruinY + random(-20, 20),
          vx: 0, vy: 0, facing: random() > 0.5 ? 1 : -1,
          state: 'idle', timer: random(60, 180), giftTimer: 1000,
          color: [random(140, 200), random(100, 160), random(60, 120)],
        });
      }
    }
    // Rebuild chickens if not present
    if (!state.chickens || state.chickens.length === 0) {
      let farmCX = WORLD.islandCX - 220, farmCY = WORLD.islandCY - 5;
      state.chickens = [];
      for (let i = 0; i < 3; i++) {
        state.chickens.push({
          x: farmCX + random(-60, 60), y: farmCY + random(-30, 30),
          vx: 0, vy: 0, facing: random() > 0.5 ? 1 : -1,
          timer: random(60, 200), pecking: false, peckTimer: 0,
          color: [random(180, 220), random(140, 180), random(80, 120)],
        });
      }
    }
    addFloatingText(width / 2, height * 0.4, 'GAME LOADED', C.crystalGlow);
  } catch(e) {
    addFloatingText(width / 2, height * 0.4, 'Load failed!', C.buildInvalid);
  }
}

// ─── ZONE PLACEMENT HELPERS ──────────────────────────────────────────────
// Farm zone bounding box — used to keep other elements away
function getFarmBounds() {
  let farmCX = WORLD.islandCX - 220, farmCY = WORLD.islandCY - 5;
  // Grid grows: base 3x3 (38x28 spacing), expands per level
  let cols = 3 + (state.islandLevel >= 2 ? 1 : 0) + (state.islandLevel >= 4 ? 1 : 0);
  let rows = 3 + (state.islandLevel >= 3 ? 1 : 0) + (state.islandLevel >= 5 ? 1 : 0);
  let farmW = cols * 20 + 20;
  let farmH = rows * 15 + 15;
  return { x: farmCX, y: farmCY, hw: farmW, hh: farmH };
}

function isInFarmZone(x, y) {
  let f = getFarmBounds();
  return abs(x - f.x) < f.hw && abs(y - f.y) < f.hh;
}

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
  return 100 + lvl * 20; // 120 at lv1, up to 200 at lv5
}

function addClampedTree(x, y, cx, cy) {
  let p = clampToIsland(x, y, cx, cy, 0.72);
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
  state.trees.push({
    x: p.x, y: p.y,
    health: 3, maxHealth: 3, alive: true, regrowTimer: 0,
    size: random(0.8, 1.1), swayPhase: random(TWO_PI),
    type: 'oak',
  });
}

// Rebuild the entire farm grid for a given level, preserving planted state
function rebuildFarmGrid(lvl) {
  let farmCX = WORLD.islandCX - 220, farmCY = WORLD.islandCY - 5;
  let pw = 38, ph = 28;
  // Grid dimensions per level
  let cols, rows, colStart, rowStart;
  if (lvl === 1)      { cols = 3; rows = 3; colStart = -1; rowStart = -1; }
  else if (lvl === 2) { cols = 4; rows = 3; colStart = -1; rowStart = -1; }
  else if (lvl === 3) { cols = 4; rows = 4; colStart = -1; rowStart = -1; }
  else if (lvl === 4) { cols = 5; rows = 4; colStart = -2; rowStart = -1; }
  else                { cols = 5; rows = 5; colStart = -2; rowStart = -2; }

  // Build position map of existing plots to preserve planted state
  let existing = {};
  if (state.plots) {
    state.plots.forEach(p => {
      let key = Math.round(p.x) + ',' + Math.round(p.y);
      existing[key] = p;
    });
  }

  let newPlots = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let px = farmCX + (colStart + col) * pw;
      let py = farmCY + (rowStart + row) * ph;
      // Check if we already had a plot near this position
      let key = Math.round(px) + ',' + Math.round(py);
      let old = existing[key];
      if (old) {
        newPlots.push(old);
      } else {
        // Try to find nearby existing plot (within 5px)
        let found = null;
        for (let ep of (state.plots || [])) {
          if (Math.abs(ep.x - px) < 5 && Math.abs(ep.y - py) < 5) { found = ep; break; }
        }
        if (found) {
          newPlots.push(found);
        } else {
          newPlots.push({
            x: px, y: py, w: 32, h: 22,
            planted: false, stage: 0, timer: 0,
            glowing: false, ripe: false,
          });
        }
      }
    }
  }
  state.plots = newPlots;
}

// Legacy wrapper — expansion calls this
function addFarmPlots(farmCX, farmCY, lvl) {
  rebuildFarmGrid(lvl);
}

// ─── CHICKENS ──────────────────────────────────────────────────────────
function updateChickens(dt) {
  if (!state.chickens) return;
  let farmCX = WORLD.islandCX - 220, farmCY = WORLD.islandCY - 5;
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

  push();
  translate(sx, sy);
  noStroke();

  // Ground shadow
  fill(0, 0, 0, 35);
  rect(-38, 8, 76, 12);

  // Stone platform — pixel tiers
  fill(150, 145, 135);
  rect(-33, 2, 66, 12);
  fill(165, 158, 148);
  rect(-28, 0, 56, 10);
  // Inner platform
  fill(175, 168, 158);
  rect(-21, -2, 42, 8);

  // Four corner columns — pixel
  let colPositions = [
    { x: -22, y: -2, h: 28 },
    { x: 22, y: -2, h: 24 },
    { x: -16, y: 8, h: 20 },
    { x: 16, y: 8, h: 22 },
  ];
  colPositions.forEach(col => {
    fill(170, 163, 153);
    rect(col.x - 4, col.y, 8, 4);
    fill(185, 178, 168);
    rect(col.x - 3, col.y - col.h, 6, col.h);
    fill(170, 163, 153, 80);
    rect(col.x - 1, col.y - col.h, 1, col.h);
    rect(col.x + 2, col.y - col.h, 1, col.h);
    // Broken top — pixel jagged
    fill(175, 168, 158);
    rect(col.x - 1, col.y - col.h - 3, 2, 3);
    rect(col.x - 2, col.y - col.h - 1, 1, 1);
  });

  // Central altar stone
  fill(160, 155, 145);
  rect(-12, -6, 24, 10);
  fill(175, 168, 158);
  rect(-12, -8, 24, 4);
  fill(140, 133, 123, 80);
  rect(-11, -7, 22, 1);

  // Green crystal — pixel cross glow
  fill(0, 255, 136, 20 * pulse);
  rect(-1, -30, 2, 30);
  rect(-12, -16, 24, 2);
  // Main crystal — stacked rects
  fill(0, 180, 100, 200);
  rect(-1, -28, 2, 2);  // tip
  rect(-2, -26, 4, 4);
  rect(-4, -22, 8, 6);
  rect(-5, -16, 10, 4);
  rect(-5, -12, 10, 4);
  // Inner highlight
  fill(0, 220, 120, 180);
  rect(-1, -26, 2, 2);
  rect(-2, -24, 4, 6);
  rect(-2, -18, 4, 6);
  // Bright core
  fill(0, 255, 180, 150 * pulse);
  rect(-1, -22, 2, 8);

  // Side crystals — pixel
  fill(0, 160, 90, 180);
  rect(-11, -16, 4, 8);
  rect(-10, -18, 2, 2);
  fill(0, 200, 110, 150);
  rect(-10, -15, 2, 5);

  fill(0, 160, 90, 180);
  rect(8, -14, 4, 7);
  rect(9, -16, 2, 2);
  fill(0, 200, 110, 150);
  rect(9, -13, 2, 5);

  // Floating energy particles — pixel rects
  for (let p = 0; p < 5; p++) {
    let angle = frameCount * 0.015 + p * TWO_PI / 5;
    let radius = 25 + floor(sin(frameCount * 0.04 + p * 1.5) * 6);
    let py = floor(-14 + cos(frameCount * 0.02 + p) * 8);
    let px = floor(cos(angle) * radius);
    fill(0, 255, 136, 80 * pulse);
    rect(px - 1, py - 1, 2, 2);
  }

  // Vine growth on columns — pixel leaves
  colPositions.forEach((col, i) => {
    fill(60, 120, 40, 100);
    for (let v = 0; v < 3; v++) {
      let vy = floor(col.y - col.h * (0.3 + v * 0.25));
      let vx = col.x + (i % 2 === 0 ? 3 : -3);
      rect(vx - 2, vy - 1, 4, 2);
    }
  });

  pop();
}

// ─── HARVESTER COMPANION ───────────────────────────────────────────
function updateHarvester(dt) {
  if (!state.harvester) return;
  let h = state.harvester;
  let origHSpeed = h.speed;
  if (state.blessing.type === 'speed') h.speed *= 2;
  h.pulsePhase += 0.03;

  if (h.task === 'idle') {
    // Look for ripe crops
    let ripePlot = state.plots.find(p => p.ripe && p.planted);
    if (ripePlot) {
      h.task = 'walking_to_crop';
      h.taskTarget = ripePlot;
    } else {
      // Wander near farm
      h.timer -= dt;
      if (h.timer <= 0) {
        let farmCX = WORLD.islandCX - 220, farmCY = WORLD.islandCY - 5;
        h.vx = random(-0.5, 0.5);
        h.vy = random(-0.3, 0.3);
        h.timer = random(60, 120);
        // Keep near farm
        if (abs(h.x - farmCX) > 80) h.vx = (farmCX - h.x) * 0.01;
        if (abs(h.y - farmCY) > 50) h.vy = (farmCY - h.y) * 0.01;
      }
      h.x += h.vx * dt;
      h.y += h.vy * dt;
    }
  } else if (h.task === 'walking_to_crop') {
    let t = h.taskTarget;
    if (!t || !t.ripe) { h.task = 'idle'; h.taskTarget = null; return; }
    let dx = t.x - h.x, dy = t.y - h.y;
    let d = sqrt(dx * dx + dy * dy);
    if (d < 12) {
      h.task = 'harvesting';
      h.timer = 40;
    } else {
      h.x += (dx / d) * h.speed * dt;
      h.y += (dy / d) * h.speed * dt;
    }
  } else if (h.task === 'harvesting') {
    h.timer -= dt;
    if (h.timer <= 0) {
      // Harvest the crop
      let t = h.taskTarget;
      if (t && t.ripe) {
        t.planted = false; t.ripe = false; t.stage = 0; t.timer = 0; t.glowing = false;
        h.carryItem = 'grain';
        h.carryCount += 1;
        state.harvest += 1;
        let seedH = 1 + (random() < 0.5 ? 1 : 0);
        state.seeds += seedH;
        checkQuestProgress('harvest', 1);
        spawnParticles(h.x, h.y, 'build', 4);
      }
      // Find a chest to deliver to
      let chest = state.buildings.find(b => b.type === 'chest');
      if (chest && h.carryCount >= 2) {
        h.task = 'walking_to_chest';
        h.taskTarget = chest;
      } else {
        // Keep harvesting or idle
        h.task = 'idle';
        h.taskTarget = null;
      }
    }
  } else if (h.task === 'walking_to_chest') {
    let t = h.taskTarget;
    if (!t) { h.task = 'idle'; h.taskTarget = null; return; }
    let dx = t.x - h.x, dy = t.y - h.y;
    let d = sqrt(dx * dx + dy * dy);
    if (d < 15) {
      h.task = 'depositing';
      h.timer = 25;
    } else {
      h.x += (dx / d) * h.speed * dt;
      h.y += (dy / d) * h.speed * dt;
    }
  } else if (h.task === 'depositing') {
    h.timer -= dt;
    if (h.timer <= 0) {
      // Deposit items
      state.gold += h.carryCount;
      addFloatingText(w2sX(h.x), w2sY(h.y) - 20, '+' + h.carryCount + ' gold', C.solarGold);
      h.carryItem = null;
      h.carryCount = 0;
      h.task = 'idle';
      h.taskTarget = null;
      spawnParticles(h.x, h.y, 'build', 3);
    }
  }
  h.speed = origHSpeed;
}

// ─── VESTA — CRYSTAL PRIESTESS AI ──────────────────────────────────────
function updateVestaCrystals(dt) {
  if (!state.vesta) return;
  let v = state.vesta;
  if (!v.task) v.task = 'idle';
  if (!v.timer) v.timer = 0;
  if (!v.carryCount) v.carryCount = 0;

  let shrineX = state.crystalShrine.x, shrineY = state.crystalShrine.y;

  if (v.task === 'idle') {
    // If carrying crystals, return to shrine first
    if (v.carryCount > 0) {
      v.task = 'returning';
      v.taskTarget = null;
      return;
    }
    // Look for a crystal node with any charge to harvest
    let target = state.crystalNodes.find(c => c.charge >= 15 && (!c.respawnTimer || c.respawnTimer <= 0));
    if (target) {
      v.task = 'walking_to_crystal';
      v.taskTarget = target;
    } else {
      // Wander near shrine
      v.timer -= dt;
      if (v.timer <= 0) {
        v.timer = random(80, 160);
        let dx = shrineX + random(-40, 40) - v.x;
        let dy = shrineY + random(-25, 25) - v.y;
        let d = sqrt(dx * dx + dy * dy);
        if (d > 5) { v.x += dx * 0.02; v.y += dy * 0.02; }
      }
    }
  } else if (v.task === 'walking_to_crystal') {
    let t = v.taskTarget;
    if (!t || t.charge < 5) { v.task = 'idle'; v.taskTarget = null; return; }
    let dx = t.x - v.x, dy = t.y - v.y;
    let d = sqrt(dx * dx + dy * dy);
    if (d < 15) {
      v.task = 'harvesting';
      v.timer = 60;
    } else {
      v.x += (dx / d) * 1.4 * dt;
      v.y += (dy / d) * 1.4 * dt;
    }
  } else if (v.task === 'harvesting') {
    v.timer -= dt;
    // Sparkle while harvesting
    if (frameCount % 8 === 0) spawnParticles(v.x, v.y - 10, 'crystal', 2);
    if (v.timer <= 0) {
      let t = v.taskTarget;
      if (t && t.charge >= 5) {
        // Drain the crystal fully so it enters respawn cycle
        let gained = ceil(t.charge / 15);
        t.charge = 0;
        t.respawnTimer = 500 + random(-100, 100);
        v.carryCount += gained;
        state.crystals += gained;
        spawnParticles(v.x, v.y, 'build', 5);
        addFloatingText(w2sX(v.x), w2sY(v.y) - 30, '+' + gained + ' Crystal', '#00ff88');
      }
      // Look for next crystal or return
      let next = state.crystalNodes.find(c => c !== t && c.charge >= 15 && (!c.respawnTimer || c.respawnTimer <= 0));
      if (next && v.carryCount < 4) {
        v.task = 'walking_to_crystal';
        v.taskTarget = next;
      } else {
        v.task = 'returning';
        v.taskTarget = null;
      }
    }
  } else if (v.task === 'returning') {
    let dx = shrineX - v.x, dy = shrineY - v.y;
    let d = sqrt(dx * dx + dy * dy);
    if (d < 15) {
      // Deposit crystals with a prayer effect
      spawnParticles(v.x, v.y - 10, 'crystal', 6);
      addFloatingText(w2sX(v.x), w2sY(v.y) - 35, 'Offering ' + v.carryCount + ' crystals', '#cc88ff');
      v.carryCount = 0;
      v.task = 'idle';
      v.timer = 100; // rest briefly
    } else {
      v.x += (dx / d) * 1.4 * dt;
      v.y += (dy / d) * 1.4 * dt;
    }
  }
}

function drawHarvester(h_unused) {
  let h = state.harvester;
  if (!h) return;
  let sx = w2sX(h.x), sy = w2sY(h.y);
  let bob = floor(sin(frameCount * 0.05) * 1);
  let breath = sin(frameCount * 0.04 + 3) * 0.5;

  push();
  translate(floor(sx), floor(sy + bob));
  noStroke();

  // Shadow
  fill(0, 0, 0, 35);
  rect(-8, 13, 16, 2);

  // Bare feet — calloused
  fill(160, 120, 80);
  rect(-4, 11, 3, 2);
  rect(1, 11, 3, 2);
  // Toe detail
  fill(150, 110, 70);
  rect(-3, 11, 1, 1);
  rect(2, 11, 1, 1);

  // Legs
  fill(170, 130, 90);
  rect(-4, 4, 3, 8);
  rect(1, 4, 3, 8);

  // Warm brown tunic
  fill(145, 105, 65);
  rect(-7, -2, 14, 8);
  // Lighter linen apron
  fill(180, 160, 110);
  rect(-5, 1, 10, 7);
  // Apron stitch detail
  fill(165, 145, 95);
  rect(-4, 3, 8, 1);
  // Rope belt
  fill(120, 90, 50);
  rect(-7, 0, 14, 1);
  // Belt knot
  fill(130, 100, 55);
  rect(-3, 0, 2, 2);

  // Arms — sun-tanned
  fill(170, 130, 90);
  let armSwing = h.task === 'harvesting' ? floor(sin(frameCount * 0.15) * 2) : 0;
  rect(-9, 0 + armSwing, 2, 7);
  rect(7, 0 - armSwing, 2, 7);

  // Woven basket on back when carrying
  if (h.carryItem) {
    fill(140, 110, 60);
    rect(-8, -2, 3, 8);
    fill(130, 100, 50);
    rect(-8, -2, 3, 1);
    rect(-8, 2, 3, 1);
    // Items peeking out
    fill(120, 170, 60);
    rect(-7, -3, 2, 2);
  }

  // Neck
  fill(170, 130, 90);
  rect(-3, -5, 6, 3);

  // Head — warm skin
  fill(175, 138, 98);
  rect(-5, -13, 10, 9);
  // Sun-weathered highlight
  fill(185, 148, 108, 70);
  rect(-4, -12, 4, 4);

  // Straw hat — wide brim
  fill(195, 175, 105);
  rect(-8, -15, 16, 3);
  // Hat crown
  fill(185, 165, 95);
  rect(-5, -18, 10, 3);
  // Hat band — woven detail
  fill(140, 105, 60);
  rect(-5, -15, 10, 1);
  // Hat highlight
  fill(210, 190, 120, 80);
  rect(-3, -17, 4, 1);

  // Eyes — warm brown
  let blinkH = (frameCount % 240 > 234);
  if (blinkH) {
    fill(155, 118, 85);
    rect(-3, -10, 2, 1);
    rect(1, -10, 2, 1);
  } else {
    fill(50, 35, 20);
    rect(-3, -10, 2, 2);
    rect(1, -10, 2, 2);
    fill(80, 55, 35);
    rect(-3, -10, 1, 1);
    rect(1, -10, 1, 1);
  }
  // Kind smile
  fill(140, 100, 70, 100);
  rect(-1, -7, 2, 1);
  // Rosy cheeks
  fill(195, 130, 110, 40);
  rect(-4, -8, 2, 1);
  rect(2, -8, 2, 1);

  // Sickle when harvesting
  if (h.task === 'harvesting') {
    let swing = floor(sin(frameCount * 0.2) * 4);
    fill(90, 70, 35);
    rect(8 + swing, -6, 2, 8);
    fill(150, 150, 160);
    rect(7 + swing, -8, 4, 2);
    fill(170, 170, 180);
    rect(7 + swing, -8, 2, 1);
  }

  // Carry count badge
  if (h.carryItem && h.carryCount > 0) {
    fill(200, 180, 60);
    rect(-2, -22, 4, 4);
    fill(60, 40, 20);
    textSize(5);
    textAlign(CENTER, CENTER);
    text(h.carryCount, 0, -20);
    textAlign(LEFT, TOP);
  }

  pop();
}

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
  let quests = [
    { type: 'harvest', desc: 'Harvest 5 crops', target: 5, reward: { gold: 10, seeds: 5 } },
    { type: 'fish', desc: 'Catch 3 fish', target: 3, reward: { gold: 8, crystals: 2 } },
    { type: 'chop', desc: 'Chop 4 trees', target: 4, reward: { gold: 6, stone: 5 } },
    { type: 'stone', desc: 'Gather 8 stone', target: 8, reward: { gold: 12, seeds: 3 } },
    { type: 'build', desc: 'Place 3 buildings', target: 3, reward: { gold: 15, crystals: 3 } },
    { type: 'crystal', desc: 'Collect 4 crystals', target: 4, reward: { gold: 20 } },
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
    if (r.gold) state.gold += r.gold;
    if (r.seeds) state.seeds += r.seeds;
    if (r.crystals) state.crystals += r.crystals;
    if (r.stone) state.stone += r.stone;
    let rewardText = Object.entries(r).map(([k, v]) => '+' + v + ' ' + k).join(', ');
    addFloatingText(width / 2, height * 0.3, 'QUEST COMPLETE! ' + rewardText, C.solarBright);
    addNotification('Quest complete! ' + rewardText, '#ffcc44');
    showAchievement('Quest Completed');
    spawnParticles(state.npc.x, state.npc.y, 'build', 10);
    state.npc.hearts = min(10, state.npc.hearts + 1);
    state.quest = null;
  }
}

// ─── NEW NPCs ─────────────────────────────────────────────────────
function updateNPCAnim(npc) {
  if (!npc.anim) npc.anim = { blinkTimer: 200, blinkFrame: 0, breathe: 0 };
  let a = npc.anim;
  a.breathe = sin(frameCount * 0.04 + npc.x * 0.01) * 0.5;
  a.blinkTimer--;
  if (a.blinkTimer <= 0) {
    a.blinkFrame = 6; // blink for 6 frames
    a.blinkTimer = floor(random(180, 320));
  }
  if (a.blinkFrame > 0) a.blinkFrame--;
}

function npcHeartPop(npc) {
  // Burst of heart particles on gift receive
  for (let i = 0; i < 5; i++) {
    particles.push({
      x: npc.x + random(-6, 6), y: npc.y - 18 + random(-4, 4),
      vx: random(-1, 1), vy: random(-1.5, -0.3),
      life: random(20, 35), maxLife: 35,
      type: 'sundust', size: random(1, 3),
      r: 255, g: 100, b: 130, phase: random(TWO_PI), world: true,
    });
  }
  addFloatingText(w2sX(npc.x), w2sY(npc.y) - 30, '\u2665', '#ff6688');
}

function drawNewNPC(npc, type) {
  let sx = w2sX(npc.x), sy = w2sY(npc.y);
  updateNPCAnim(npc);
  let a = npc.anim;
  let bob = floor(sin(frameCount * 0.03 + npc.x * 0.1) + a.breathe) * 1;
  let blinking = a.blinkFrame > 0;

  push();
  translate(floor(sx), floor(sy + bob));
  noStroke();

  // Elliptical shadow — natural
  fill(0, 0, 0, 30);
  ellipse(0, 13, 20, 5);

  // Hover glow when player is near — warm aura
  let pd = dist2(state.player.x, state.player.y, npc.x, npc.y);
  if (pd < 80 && npc.dialogTimer <= 0) {
    let ga = 12 + floor(sin(frameCount * 0.08) * 6);
    fill(255, 220, 150, ga);
    ellipse(0, 0, 24, 30);
  }

  if (type === 'marcus') {
    // ─── MARCUS — Centurion with Flowing Cape ───
    // Flowing red cape behind
    let cWave = floor(sin(frameCount * 0.05) * 2);
    let cLen = 18 + cWave;
    fill(140, 30, 25, 160);
    rect(5, -4, 4, cLen);
    fill(175, 40, 32, 190);
    rect(4, -5, 4, cLen - 1);
    fill(120, 25, 20, 80);
    rect(5, -5 + cLen - 2, 2, 2);

    // Heavy military sandals
    fill(90, 60, 25);
    rect(-5, 9, 4, 3);
    rect(1, 9, 4, 3);
    fill(75, 48, 18);
    rect(-5, 11, 4, 1);
    rect(1, 11, 4, 1);
    // Muscular legs
    fill(200, 165, 130);
    rect(-4, 4, 3, 6);
    rect(1, 4, 3, 6);
    // Red tunica base
    fill(155, 35, 30);
    rect(-7, -4, 14, 10);
    // Pteruges
    fill(130, 95, 40);
    for (let i = -2; i <= 2; i++) rect(i * 3 - 1, 5, 2, 3);
    // Lorica segmentata — riveted plate armor
    fill(170, 168, 175);
    rect(-6, -4, 12, 6);
    fill(145, 142, 152);
    rect(-6, -2, 12, 1);
    rect(-6, 0, 12, 1);
    fill(200, 198, 205);
    rect(-5, -3, 1, 1); rect(4, -3, 1, 1);
    rect(-5, -1, 1, 1); rect(4, -1, 1, 1);
    fill(195, 193, 200, 80);
    rect(-5, -4, 4, 2);
    // Gold belt with phalerae
    fill(190, 160, 50);
    rect(-6, 1, 12, 2);
    fill(210, 180, 60);
    rect(-2, 1, 4, 2);
    // Larger pauldrons
    fill(160, 158, 168);
    rect(-9, -5, 4, 4);
    rect(5, -5, 4, 4);
    fill(175, 173, 180, 80);
    rect(-8, -5, 2, 1);
    rect(6, -5, 2, 1);
    // Muscular arms
    fill(200, 165, 130);
    rect(-9, -1, 2, 5);
    rect(7, -1, 2, 5);
    // Scutum — large shield with eagle
    fill(155, 30, 25);
    rect(-13, -5, 5, 12);
    fill(190, 165, 55);
    rect(-12, -1, 3, 1); rect(-11, -2, 1, 1); rect(-11, 0, 1, 1);
    fill(200, 175, 60);
    rect(-12, 1, 3, 2);
    fill(190, 165, 55);
    rect(-13, -5, 5, 1); rect(-13, 6, 5, 1);
    // Gladius — sheathed
    fill(100, 80, 40);
    rect(7, 1, 2, 7);
    fill(180, 180, 190);
    rect(7, 0, 2, 2);
    fill(200, 170, 60);
    rect(7, 0, 2, 1);
    // Neck
    fill(200, 165, 130);
    rect(-3, -7, 6, 3);
    // Head
    fill(200, 165, 130);
    rect(-5, -14, 10, 8);
    // Bronze galea with tall crest
    fill(170, 145, 60);
    rect(-6, -16, 12, 5);
    fill(180, 155, 65);
    rect(-6, -12, 12, 1);
    // Cheek guards
    fill(160, 135, 55);
    rect(-6, -12, 2, 4);
    rect(4, -12, 2, 4);
    // Tall transverse crest — centurion
    fill(185, 35, 28);
    let cf = floor(sin(frameCount * 0.09) * 1);
    rect(-4, -18, 8, 2);
    rect(-3 + cf, -19, 6, 2);
    rect(-2 + cf, -20, 4, 1);
    fill(165, 28, 22);
    rect(-3 + cf, -18, 2, 1);
    // Jaw / stubble
    fill(180, 148, 115, 90);
    rect(-4, -8, 8, 2);
    // Eyes — stern
    if (blinking) {
      fill(180, 148, 115);
      rect(-3, -11, 2, 1);
      rect(1, -11, 2, 1);
    } else {
      fill(255);
      rect(-3, -12, 2, 2);
      rect(1, -12, 2, 2);
      fill(40, 30, 20);
      rect(-2, -12, 1, 1);
      rect(2, -12, 1, 1);
    }
    // Battle scar
    fill(190, 140, 120);
    rect(-4, -10, 1, 3);
    // Strong furrowed brow
    fill(150, 120, 90);
    rect(-4, -13, 3, 1);
    rect(1, -13, 3, 1);
    // Stern mouth
    fill(160, 130, 105);
    rect(-2, -8, 4, 1);

  } else if (type === 'vesta') {
    // ─── VESTA — Sacred Priestess ───
    // Gold sandals
    fill(200, 170, 70);
    rect(-4, 10, 3, 2);
    rect(1, 10, 3, 2);
    // Purple robes — flowing priestess vestments
    fill(95, 50, 120);
    rect(-7, -3, 14, 16);
    // Robe shadow fold
    fill(75, 38, 100);
    rect(-7, -3, 5, 16);
    // Gold trim at hem
    fill(200, 170, 80);
    rect(-7, 11, 14, 1);
    // Lighter overlay — inner robe
    fill(115, 65, 140, 120);
    rect(2, -2, 5, 14);
    // Gold sacred sash
    fill(210, 180, 60);
    rect(-7, 0, 14, 2);
    // Sash medallion — Vesta's flame symbol
    fill(230, 200, 70);
    rect(-2, 0, 4, 3);
    fill(255, 160, 40, 140);
    rect(-1, 0, 2, 2);
    // Arms — graceful, extended slightly
    fill(220, 190, 160);
    rect(-9, -1, 2, 5);
    rect(7, -1, 2, 5);
    // Gold bracelets
    fill(210, 180, 60);
    rect(-9, 2, 2, 1);
    rect(7, 2, 2, 1);
    // Crystal staff in right hand — glowing amethyst
    // Staff shaft
    fill(120, 100, 65);
    rect(8, -16, 2, 18);
    fill(140, 118, 78);
    rect(8, -16, 1, 18);
    // Crystal at top — amethyst, pulsing
    let crystPulse = sin(frameCount * 0.06) * 0.3 + 0.7;
    fill(160, 80, 200, 220);
    rect(7, -20, 4, 4);
    fill(180, 100, 220, 180);
    rect(8, -21, 2, 2);
    // Crystal glow aura
    let gA = floor(15 * crystPulse);
    fill(180, 120, 240, gA);
    rect(5, -22, 8, 2);
    rect(8, -24, 2, 8);
    // Crystal inner light
    fill(220, 180, 255, floor(80 * crystPulse));
    rect(8, -20, 1, 2);
    // Radiant glow around crystal
    fill(160, 100, 220, floor(8 * crystPulse));
    ellipse(9, -19, 16, 16);
    // Veil over head — flowing
    fill(235, 230, 225);
    rect(-5, -14, 10, 5);
    rect(-6, -10, 2, 8);
    rect(4, -10, 2, 8);
    // Head beneath veil
    fill(220, 195, 170);
    rect(-4, -12, 8, 8);
    // Dark hair peeking under veil
    fill(40, 28, 20);
    rect(-5, -10, 2, 5);
    rect(3, -10, 2, 5);
    // Hair sheen
    fill(60, 42, 32, 100);
    rect(-5, -10, 1, 2);
    rect(4, -10, 1, 2);
    // Crescent moon on forehead
    fill(220, 210, 255);
    rect(-1, -14, 2, 2);
    rect(-2, -13, 1, 1);
    // Eyes — deep violet, serene
    if (blinking) {
      fill(200, 175, 155);
      rect(-3, -9, 2, 1);
      rect(1, -9, 2, 1);
    } else {
      fill(100, 70, 130);
      rect(-3, -10, 2, 2);
      rect(1, -10, 2, 2);
      // Eye highlights
      fill(180, 160, 220, 180);
      rect(-3, -10, 1, 1);
      rect(1, -10, 1, 1);
    }
    // Serene smile
    fill(190, 140, 130, 80);
    rect(-1, -7, 2, 1);
    // Subtle glow aura behind
    fill(200, 180, 255, 8 + floor(sin(frameCount * 0.04) * 6));
    rect(-10, -16, 20, 30);

  } else if (type === 'felix') {
    // ─── FELIX — Humble Farmer ───
    // Bare feet — calloused
    fill(160, 120, 80);
    rect(-4, 10, 3, 2);
    rect(1, 10, 3, 2);
    // Toe detail
    fill(150, 110, 70);
    rect(-3, 10, 1, 1);
    rect(2, 10, 1, 1);
    // Legs
    fill(180, 150, 110);
    rect(-4, 4, 3, 7);
    rect(1, 4, 3, 7);
    // Earth-brown tunic
    fill(140, 105, 65);
    rect(-6, -3, 12, 9);
    // Tunic lighter center
    fill(155, 118, 75);
    rect(-3, -2, 6, 8);
    // Olive green apron
    fill(85, 110, 50);
    rect(-5, 1, 10, 7);
    // Rope belt
    fill(120, 90, 50);
    rect(-6, 0, 12, 1);
    // Belt knot
    fill(130, 100, 55);
    rect(3, 0, 2, 2);
    // Arms — sun-weathered skin
    fill(175, 140, 100);
    rect(-8, -1, 2, 6);
    rect(6, -1, 2, 6);
    // Sickle in right hand — curved blade + wood handle
    fill(80, 55, 25);
    rect(7, -4, 2, 10); // handle
    fill(95, 68, 32);
    rect(7, -4, 2, 2); // handle grip
    // Curved sickle blade
    fill(170, 170, 180);
    rect(8, -6, 2, 3);
    rect(9, -8, 2, 2);
    rect(10, -9, 2, 2);
    // Blade edge highlight
    fill(195, 195, 205);
    rect(10, -9, 1, 2);
    // Neck
    fill(175, 140, 100);
    rect(-3, -6, 6, 3);
    // Head — ruddy and sun-worn
    fill(185, 148, 108);
    rect(-5, -14, 10, 9);
    // Sun-weathered highlight
    fill(195, 158, 118, 80);
    rect(-4, -13, 4, 4);
    // Straw hat — wide brim
    fill(195, 175, 105);
    rect(-8, -16, 16, 3);
    // Hat crown
    fill(185, 165, 95);
    rect(-5, -19, 10, 3);
    // Hat band
    fill(140, 100, 55);
    rect(-5, -16, 10, 1);
    // Wispy gray-brown hair under hat
    fill(150, 135, 115);
    rect(-5, -14, 2, 3);
    rect(3, -14, 2, 3);
    // Short beard — grizzled
    fill(160, 145, 125);
    rect(-3, -5, 6, 2);
    rect(-2, -3, 4, 1);
    // Eyes — warm brown, crinkled
    if (blinking) {
      fill(170, 135, 100);
      rect(-3, -11, 2, 1);
      rect(1, -11, 2, 1);
    } else {
      fill(60, 40, 25);
      rect(-3, -12, 2, 2);
      rect(1, -12, 2, 2);
      // Warm highlight
      fill(90, 65, 40);
      rect(-3, -12, 1, 1);
      rect(1, -12, 1, 1);
    }
    // Crow's feet (smile wrinkles)
    fill(165, 130, 95, 80);
    rect(-5, -11, 1, 1);
    rect(4, -11, 1, 1);
    // Ruddy nose
    fill(195, 140, 110);
    rect(-1, -10, 2, 2);
    // Kind smile
    fill(145, 105, 80, 100);
    rect(-1, -7, 2, 1);
  }

  // Hearts above head
  for (let h = 0; h < min(npc.hearts, 10); h++) {
    let hx = h * 7 - (min(npc.hearts, 10) * 3.5) + 3.5;
    fill(h < npc.hearts ? '#ff6688' : '#443344');
    drawHeart(hx, -22, 3);
  }
  // Relationship tier label
  if (typeof getRelationshipTier === 'function' && npc.hearts > 0) {
    let _tier = getRelationshipTier(npc.hearts);
    fill(color(_tier.color)); textAlign(CENTER, CENTER); textSize(5);
    text(_tier.title, 0, -28);
    textAlign(LEFT, TOP);
  }

  // Dialog bubble
  if (npc.dialogTimer > 0) {
    npc.dialogTimer--;
    fill(0, 0, 0, 160);
    rect(-70, -52, 140, 22, 4);
    fill(255);
    textSize(6);
    textAlign(CENTER, CENTER);
    let line = npc.currentLine >= 0 ? npc.currentLine : '';
    text(line, 0, -41);
    textAlign(LEFT, TOP);
  }

  // [E] prompt when player is near — with warm glow
  if (pd < 80 && npc.dialogTimer <= 0) {
    fill(255, 230, 180, 180);
    textSize(7);
    textAlign(CENTER, CENTER);
    text('[E]', 0, -27);
    textAlign(LEFT, TOP);
  }

  pop();
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

  pop();
}

// ─── CROP VARIETY ──────────────────────────────────────────────────
function drawGrapeSprite(x, y, scale) {
  x = floor(x); y = floor(y);
  let s = floor(scale * 12);
  let sway = floor(sin(frameCount * 0.03 + x * 0.1) * 1.5 * scale);
  noStroke();
  // Pixel vine stem
  fill(60, 100, 30);
  rect(x, y - s, 1, s + 2);
  // Pixel grape cluster
  let gx = x + sway, gy = y - s;
  let r = floor(90 + scale * 85), g = floor(22 + scale * 22), b = floor(110 + scale * 55);
  fill(r, g, b, 200);
  rect(gx - 3, gy, 6, 2);      // top row (3)
  rect(gx - 2, gy + 2, 4, 2);  // mid row (2)
  rect(gx - 1, gy + 4, 2, 2);  // bottom (1)
  // Highlight
  fill(r + 30, g + 20, b + 20, 80);
  rect(gx - 2, gy, 1, 1);
  // Pixel leaf
  fill(60, 110, 30);
  rect(gx - 5, gy - 2, 4, 2);
}

function drawOliveSprite(x, y, scale) {
  x = floor(x); y = floor(y);
  let s = floor(scale * 14);
  let sway = floor(sin(frameCount * 0.025 + x * 0.12) * 1 * scale);
  noStroke();
  // Pixel stem
  fill(80, 100, 40);
  rect(x + sway, y - s, 1, s + 2);
  // Pixel branch leaves
  fill(70 + scale * 40, 100 + scale * 30, 30);
  rect(x + sway - 4, y - floor(s * 0.3), 4, 2);
  rect(x + sway + 1, y - floor(s * 0.5), 4, 2);
  rect(x + sway - 3, y - floor(s * 0.7), 4, 2);
  // Pixel olives
  let r = floor(40 + scale * 60), g = floor(60 + scale * 50), b = floor(20 + scale * 10);
  fill(r, g, b);
  rect(x + sway - 3, y - floor(s * 0.6), 3, 3);
  rect(x + sway + 1, y - floor(s * 0.5), 3, 3);
  if (scale > 0.6) rect(x + sway - 1, y - floor(s * 0.75), 2, 2);
  // Pixel shine
  fill(r + 40, g + 30, 40, 80);
  rect(x + sway - 3, y - floor(s * 0.6), 1, 1);
}

function drawSeasonalCropSprite(x, y, scale, type) {
  x = floor(x); y = floor(y);
  let s = floor(scale * 14);
  let sway = floor(sin(frameCount * 0.03 + x * 0.1) * 1.5 * scale);
  noStroke();

  if (type === 'wildflower') {
    // Pixel stem
    fill(60, 100, 40);
    rect(x, y - s, 1, s + 2);
    // Pixel leaves
    fill(70, 120, 40);
    rect(x - 3, y - floor(s * 0.3), 3, 2);
    rect(x + 1, y - floor(s * 0.5), 3, 2);
    // Pixel flower — 5 petals as cross + corners
    let fx = x + sway, fy = y - floor(s * 0.8);
    fill(255, 120 + floor(scale * 80), 180, 200);
    rect(fx - 3, fy - 1, 6, 2);  // horizontal
    rect(fx - 1, fy - 3, 2, 6);  // vertical
    rect(fx - 2, fy - 2, 1, 1);  // corners
    rect(fx + 1, fy - 2, 1, 1);
    rect(fx - 2, fy + 1, 1, 1);
    rect(fx + 1, fy + 1, 1, 1);
    // Center
    fill(255, 220, 60);
    rect(fx - 1, fy - 1, 2, 2);
  } else if (type === 'sunfruit') {
    // Pixel stem
    fill(100, 80, 30);
    rect(x, y - s, 1, s + 2);
    fill(80, 120, 30);
    rect(x - 2, y - floor(s * 0.4), 4, 2);
    // Pixel sun fruit
    let fx = x + sway, fy = y - floor(s * 0.85);
    fill(255, 170, 30);
    rect(fx - 3, fy - 3, 6, 6);
    // Sun rays
    fill(255, 200, 60, 150);
    rect(fx - 1, fy - 5, 2, 2);
    rect(fx - 1, fy + 3, 2, 2);
    rect(fx - 5, fy - 1, 2, 2);
    rect(fx + 3, fy - 1, 2, 2);
  } else if (type === 'pumpkin') {
    // Pixel vine
    fill(50, 90, 30);
    rect(x, y - floor(s * 0.6), 1, floor(s * 0.6) + 2);
    fill(60, 100, 30);
    rect(x - 2, y - floor(s * 0.35), 4, 2);
    // Pixel pumpkin body
    let px2 = x + floor(sway * 0.5), py2 = y - floor(s * 0.15);
    fill(220, 120, 30);
    rect(px2 - 4, py2 - 3, 8, 6);
    fill(200, 100, 20);
    rect(px2 - 4, py2 - 2, 2, 4);
    rect(px2 + 2, py2 - 2, 2, 4);
    // Stem
    fill(80, 100, 30);
    rect(px2, py2 - 5, 2, 2);
  } else if (type === 'frostherb') {
    // Pixel icy stem
    fill(100, 180, 220);
    rect(x, y - s, 1, s + 2);
    // Pixel crystal leaves
    fill(140, 200, 240, 180);
    rect(x - 3, y - floor(s * 0.2), 3, 2);
    rect(x + 1, y - floor(s * 0.42), 3, 2);
    rect(x - 3, y - floor(s * 0.64), 3, 2);
    // Frost sparkle pixel
    if (frameCount % 30 < 10) {
      fill(200, 230, 255, 200);
      rect(x + sway - 1, y - floor(s * 0.8), 2, 2);
    }
  }
}

function getExpandCost(lvl) {
  // Levels 1-5: crystals only (original)
  // Levels 6-10: crystals + stone
  // Levels 11-15: crystals + stone + iron
  // Levels 16-20: crystals + stone + iron + relics
  // Levels 21-25: all resources + titan bone
  let crystalCost = [5, 10, 18, 28, 40, 55, 70, 90, 110, 135, 160, 190, 220, 255, 290, 330, 370, 415, 460, 510, 570, 630, 700, 780, 860][lvl - 1] || 860;
  let cost = { crystals: crystalCost };
  if (lvl >= 6) cost.stone = 10 + (lvl - 6) * 8;
  if (lvl >= 11) cost.ironOre = 5 + (lvl - 11) * 4;
  if (lvl >= 16) cost.ancientRelic = 2 + (lvl - 16) * 2;
  if (lvl >= 21) cost.titanBone = 1 + (lvl - 21) * 2;
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
  showAchievement('Island Level ' + state.islandLevel + ' Reached!');
  addNotification('Island expanded to Level ' + state.islandLevel, '#ffdd66');
  // Island grows less per level at higher tiers
  let rxGrowth = state.islandLevel <= 5 ? 60 : state.islandLevel <= 10 ? 45 : state.islandLevel <= 15 ? 35 : state.islandLevel <= 20 ? 25 : 18;
  let ryGrowth = state.islandLevel <= 5 ? 40 : state.islandLevel <= 10 ? 30 : state.islandLevel <= 15 ? 22 : state.islandLevel <= 20 ? 16 : 12;
  state.islandRX += rxGrowth;
  state.islandRY += ryGrowth;
  state.pyramid.level = state.islandLevel;

  // Milestone unlocks — landmark buildings auto-spawn at key levels
  let rx = getSurfaceRX(), ry = getSurfaceRY();
  let cx = WORLD.islandCX, cy = WORLD.islandCY;
  if (state.islandLevel === 5) {
    // Granary near farm, Well near center
    let fc = { x: getFarmCenterX(), y: getFarmCenterY() };
    state.buildings.push({ x: fc.x + rx * 0.15, y: fc.y - ry * 0.3, w: 48, h: 36, type: 'granary', rot: 0 });
    state.buildings.push({ x: cx + rx * 0.2, y: cy + ry * 0.4, w: 24, h: 24, type: 'well', rot: 0 });
    addFloatingText(width / 2, height * 0.25, 'CITIZEN — Granary & Well constructed!', '#88cc66');
    spawnParticles(fc.x + rx * 0.15, fc.y - ry * 0.3, 'build', 12);
  }
  if (state.islandLevel === 10) {
    unlockJournal('imperial_governor');
    // Temple on the east side, Market near port
    let port = getPortPosition();
    state.buildings.push({ x: cx + rx * 0.55, y: cy - ry * 0.35, w: 56, h: 40, type: 'temple', rot: 0 });
    state.buildings.push({ x: port.x + 80, y: port.y - 30, w: 36, h: 28, type: 'market', rot: 0 });
    addFloatingText(width / 2, height * 0.25, 'GOVERNOR — Temple & Market erected!', '#ffdd66');
    triggerScreenShake(6, 15);
    spawnParticles(cx + rx * 0.55, cy - ry * 0.35, 'build', 15);
  }
  if (state.islandLevel === 15) {
    unlockJournal('imperial_senator');
    // Forum in the south, Watchtower on the far east edge
    state.buildings.push({ x: cx, y: cy + ry * 0.5, w: 64, h: 48, type: 'forum', rot: 0 });
    state.buildings.push({ x: cx + rx * 0.8, y: cy - ry * 0.1, w: 20, h: 44, type: 'watchtower', rot: 0 });
    addFloatingText(width / 2, height * 0.25, 'SENATOR — Forum & Watchtower raised!', '#ff9944');
    triggerScreenShake(8, 20);
    spawnParticles(cx, cy + ry * 0.5, 'build', 15);
  }
  if (state.islandLevel === 20) {
    unlockJournal('imperial_consul');
    // Triumphal Arch near port entrance, Villa on the north
    let port = getPortPosition();
    state.buildings.push({ x: port.x + 120, y: port.y - 15, w: 48, h: 52, type: 'arch', rot: 0 });
    state.buildings.push({ x: cx - rx * 0.3, y: cy - ry * 0.55, w: 60, h: 44, type: 'villa', rot: 0 });
    addFloatingText(width / 2, height * 0.25, 'CONSUL — Triumphal Arch & Villa built! Imperial Bridge Unlocked!', '#ffaa00');
    triggerScreenShake(12, 30);
    spawnParticles(port.x + 120, port.y - 15, 'build', 20);
  }
  if (state.islandLevel === 25) {
    unlockJournal('imperator');
    addFloatingText(width / 2, height * 0.25, 'IMPERATOR — Mare Nostrum is yours!', '#ff4400');
    triggerScreenShake(15, 40);
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

  let farmCX = getFarmCenterX(), farmCY = getFarmCenterY();
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

  // ─── ZONE-BASED EXPANSION — each level adds elements at fixed positions ───
  // Positions are relative to island center, scaled by current island size

  // Level-specific zone additions
  if (lvl === 2) {
    // SOUTH QUARTER — resource quarry + crystal
    let zoneResources = [
      { x: cx - 120, y: cy + 70, type: 'stone' },
      { x: cx - 60,  y: cy + 75, type: 'stone' },
      { x: cx + 30,  y: cy + 70, type: 'vine' },
      { x: cx + 100, y: cy + 65, type: 'leaf' },
    ];
    zoneResources.forEach(r => addClampedResource(r.x, r.y, r.type, cx, cy));
    // Extra shrine crystal
    let sh2 = state.crystalShrine;
    state.crystalNodes.push({ x: sh2.x + 50, y: sh2.y + 30, size: 14, phase: random(TWO_PI), charge: 50, respawnTimer: 0 });
    // Trees — right grove expansion
    addClampedTree(cx + 180, cy + 40, cx, cy);
    addClampedTree(cx + 230, cy + 30, cx, cy);
    addClampedTree(cx + 300, cy - 10, cx, cy);
    // Farm extension — row south of existing farm
    addFarmPlots(farmCX, farmCY, lvl);

  } else if (lvl === 3) {
    // NORTHEAST QUARTER — ruins + resources
    let zoneResources = [
      { x: cx + 200, y: cy - 70, type: 'vine' },
      { x: cx + 250, y: cy - 45, type: 'stone' },
      { x: cx + 160, y: cy - 80, type: 'vine' },
      { x: cx + 300, y: cy - 30, type: 'leaf' },
    ];
    zoneResources.forEach(r => addClampedResource(r.x, r.y, r.type, cx, cy));
    // Extra shrine crystal
    let sh3 = state.crystalShrine;
    state.crystalNodes.push({ x: sh3.x - 50, y: sh3.y + 30, size: 14, phase: random(TWO_PI), charge: 50, respawnTimer: 0 });
    // Trees — right grove northeast extension
    addClampedTree(cx + 280, cy - 55, cx, cy);
    addClampedTree(cx + 320, cy - 25, cx, cy);
    addClampedTree(cx + 150, cy - 60, cx, cy);
    // Extra ruin — northeast edge
    state.ruins.push({ x: cx + 260, y: cy - 70, w: 30, h: 20, rot: 0.05 });
    // Farm extension
    addFarmPlots(farmCX, farmCY, lvl);

  } else if (lvl === 4) {
    // NORTHWEST QUARTER — sacred grove + resources
    let zoneResources = [
      { x: cx - 250, y: cy - 50, type: 'vine' },
      { x: cx - 300, y: cy - 20, type: 'leaf' },
      { x: cx - 200, y: cy - 70, type: 'stone' },
      { x: cx - 340, y: cy + 10, type: 'leaf' },
    ];
    zoneResources.forEach(r => addClampedResource(r.x, r.y, r.type, cx, cy));
    // Extra shrine crystal
    let sh4 = state.crystalShrine;
    state.crystalNodes.push({ x: sh4.x, y: sh4.y - 45, size: 16, phase: random(TWO_PI), charge: 60, respawnTimer: 0 });
    // Trees — right grove deeper expansion
    addClampedTree(cx + 250, cy - 40, cx, cy);
    addClampedTree(cx + 200, cy + 50, cx, cy);
    addClampedTree(cx + 340, cy + 15, cx, cy);
    // Farm extension
    addFarmPlots(farmCX, farmCY, lvl);

  } else if (lvl === 5) {
    // GRAND RING — final expansion, elements all around edges
    let zoneResources = [
      { x: cx - 350, y: cy + 30, type: 'stone' },
      { x: cx + 350, y: cy + 30, type: 'stone' },
      { x: cx - 150, y: cy + 90, type: 'vine' },
      { x: cx + 150, y: cy + 90, type: 'leaf' },
      { x: cx,       y: cy + 85, type: 'stone' },
    ];
    zoneResources.forEach(r => addClampedResource(r.x, r.y, r.type, cx, cy));
    // Grand shrine crystals — larger, flanking the shrine
    let sh5 = state.crystalShrine;
    state.crystalNodes.push({ x: sh5.x - 60, y: sh5.y - 10, size: 18, phase: random(TWO_PI), charge: 80, respawnTimer: 0 });
    state.crystalNodes.push({ x: sh5.x + 60, y: sh5.y - 10, size: 18, phase: random(TWO_PI), charge: 80, respawnTimer: 0 });
    // Trees — grand right grove perimeter
    addClampedTree(cx + 360, cy, cx, cy);
    addClampedTree(cx + 300, cy + 50, cx, cy);
    addClampedTree(cx + 180, cy - 70, cx, cy);
    addClampedTree(cx + 240, cy + 60, cx, cy);
    addClampedTree(cx + 350, cy - 40, cx, cy);
    // Extra ruin — south
    state.ruins.push({ x: cx, y: cy + 80, w: 35, h: 22, rot: -0.03 });
    // Farm extension
    addFarmPlots(farmCX, farmCY, lvl);
  } else if (lvl >= 6 && lvl <= 25) {
    // IMPERIAL EXPANSION — procedural content for levels 6-25
    // Each level adds resources, trees, crystals at randomized positions around the expanded rim
    let angle0 = ((lvl - 6) / 20) * TWO_PI; // distribute zones around island
    let numRes = 3 + floor(lvl / 5);
    for (let i = 0; i < numRes; i++) {
      let a = angle0 + (i / numRes) * TWO_PI * 0.3 + random(-0.2, 0.2);
      let r = random(0.55, 0.85);
      let rx = cx + cos(a) * state.islandRX * r * 0.9;
      let ry = cy + sin(a) * state.islandRY * r * 0.9;
      let types = ['stone', 'vine', 'leaf'];
      addClampedResource(rx, ry, types[i % 3], cx, cy);
    }
    // Crystal nodes — 1 every 2 levels
    if (lvl % 2 === 0) {
      let ca = angle0 + PI;
      let crx = cx + cos(ca) * state.islandRX * 0.5;
      let cry = cy + sin(ca) * state.islandRY * 0.4;
      let cSize = 14 + floor(lvl / 5) * 2;
      state.crystalNodes.push({ x: crx, y: cry, size: min(cSize, 24), phase: random(TWO_PI), charge: 50 + lvl * 5, respawnTimer: 0 });
    }
    // Trees — 3-5 per level
    let numTrees = 3 + floor(random(0, 3));
    for (let i = 0; i < numTrees; i++) {
      let ta = random(TWO_PI);
      let tr = random(0.4, 0.85);
      addClampedTree(cx + cos(ta) * state.islandRX * tr * 0.9, cy + sin(ta) * state.islandRY * tr * 0.9, cx, cy);
    }
    // Ruins every 3 levels
    if (lvl % 3 === 0) {
      let ra = angle0 + HALF_PI;
      let rrx = cx + cos(ra) * state.islandRX * 0.6;
      let rry = cy + sin(ra) * state.islandRY * 0.5;
      state.ruins.push({ x: rrx, y: rry, w: 28 + floor(lvl / 3) * 3, h: 18 + floor(lvl / 4) * 2, rot: random(-0.05, 0.05) });
    }
    // Farm extension every 2 levels
    if (lvl % 2 === 0) {
      addFarmPlots(farmCX, farmCY, lvl);
    }
  }

  // Add grass tufts to new island area
  let grx = getSurfaceRX(), gry = getSurfaceRY();
  for (let i = 0; i < 15; i++) {
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

  addFloatingText(width / 2, height * 0.35, '⚡ ISLAND EXPANDED LV.' + state.islandLevel, C.crystalGlow);
  spawnIslandLevelUp();
}

// ─── COORD HELPERS ────────────────────────────────────────────────────────
function dist2(x1, y1, x2, y2) {
  return sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── SOUND MANAGER — Procedural Audio via p5.sound ─────────────────────
// ═══════════════════════════════════════════════════════════════════════════

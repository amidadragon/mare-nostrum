// MARE NOSTRUM — Tech Tree, Research, Victory Conditions, Faction Data
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
  // Domination: all nations defeated or vassals (must have at least 1 vassal)
  if (state.nations) {
    let nationKeys = Object.keys(state.nations);
    let hasVassal = nationKeys.some(k => state.nations[k] && state.nations[k].vassal);
    let allSubdued = nationKeys.length >= 1 && nationKeys.every(k => state.nations[k] && (state.nations[k].defeated || state.nations[k].vassal));
    if (allSubdued) { // vassal no longer required — defeating all nations is sufficient
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
    cosmetics: { sesterces: 0, owned: [] },

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

    // Ship home (Sea Peoples)
    onShipDeck: false,
    belowDeck: false,
    shipUpgrades: [],
    shipWorldX: 0, shipWorldY: 0,
    _belowDeckReturnX: 0, _belowDeckReturnY: 0,

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
      barracksLevel: 0,      // 0-9 (index into CONQUEST_BARRACKS.levels)
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

    // Expedition resources (earned on Terra Nova, spent at home)
    ironOre: 0, rareHide: 0, ancientRelic: 0, titanBone: 0,
    templeUpgrades: {
      workerSpeed: 0,   // 0-3
      workerCap: 0,     // 0-3
      dangerResist: 0,  // 0-3
      lootBonus: 0,     // 0-3
      soldierHP: 0,     // 0-3
      warTier: 0,       // 0-2
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
    conquestModifier: null, // null, 'blood_moon', 'foggy', 'sacred', 'golden'
    conquestModifierSelect: false, // true when showing modifier pick UI

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
  // Sea Peoples live on their ship — no home island to build
  if (state && state.faction === 'seapeople') return;
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


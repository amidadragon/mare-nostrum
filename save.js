// ═══ SAVE SYSTEM — extracted from sketch.js ═══════════════════════════
// saveGame, loadGame, migrateSave, exportSave, importSave, drawSaveIndicator
// Depends on globals: state, _SAVE_KEY, _BACKUP_KEY, gameSettings, _saveSettings, SAVE_VERSION

function saveGame() {
  gameSettings.lastSaveTime = Date.now(); _saveSettings();
  let saveData = {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    day: state.day, time: state.time,
    seeds: state.seeds, harvest: state.harvest, wood: state.wood,
    stone: state.stone, crystals: state.crystals, gold: state.gold, fish: state.fish,
    grapeSeeds: state.grapeSeeds, oliveSeeds: state.oliveSeeds,
    flaxSeeds: state.flaxSeeds, pomegranateSeeds: state.pomegranateSeeds, lotusSeeds: state.lotusSeeds,
    meals: state.meals, wine: state.wine, oil: state.oil,
    stew: state.stew, garum: state.garum, honeyedFigs: state.honeyedFigs, ambrosia: state.ambrosia,
    foodShortage: state.foodShortage || 0,
    hudMinimized: state.hudMinimized || false,
    seaPeopleRaidCooldown: state.seaPeopleRaidCooldown || 0,
    templeCourt: { visitors: [], lastSpawn: state.templeCourt ? state.templeCourt.lastSpawn : 0 },
    weather: state.weather, daysSinceRain: state.daysSinceRain || 0, heartRewards: state.heartRewards,
    marcusHearts: state.marcus ? state.marcus.hearts : 0,
    vestaHearts: state.vesta ? state.vesta.hearts : 0,
    felixHearts: state.felix ? state.felix.hearts : 0,
    harvestComboBestEver: state.harvestCombo.bestEver || 0,
    solar: state.solar, maxSolar: state.maxSolar,
    islandLevel: state.islandLevel, islandRX: state.islandRX, islandRY: state.islandRY, islandName: state.islandName || null,
    pyramidLevel: state.pyramid.level,
    insideTemple: false,
    insideCastrum: false,
    playerX: state.player.x, playerY: state.player.y, playerFacing: state.player.facing,
    playerXp: state.player.xp, playerTotalXp: state.player.totalXp,
    playerLevel: state.player.level, playerSkillPoints: state.player.skillPoints, playerDefense: state.player.defense || 2, playerLevelAtk: state.player.levelAtk || 0,
    companionPets: state.companionPets ? {
      cat:       { level: state.companionPets.cat.level, xp: state.companionPets.cat.xp },
      tortoise:  { level: state.companionPets.tortoise.level, xp: state.companionPets.tortoise.xp, x: state.companionPets.tortoise.x, y: state.companionPets.tortoise.y },
      crow:      { level: state.companionPets.crow.level, xp: state.companionPets.crow.xp, x: state.companionPets.crow.x, y: state.companionPets.crow.y },
      centurion: { level: state.companionPets.centurion.level, xp: state.companionPets.centurion.xp, ability: state.companionPets.centurion.ability || null },
    } : null,
    playerSkills: state.player.skills, playerMaxHp: state.player.maxHp,
    playerWeapon: state.player.weapon || 0, playerArmor: state.player.armor || 0, playerPotions: state.player.potions || 0,
    playerXpBoost: state.player.xpBoost || 0, playerXpBoostTimer: state.player.xpBoostTimer || 0,
    npcHearts: state.npc.hearts,
    companionX: state.companion.x, companionY: state.companion.y, companionEnergy: state.companion.energy,
    woodcutterX: state.woodcutter.x, woodcutterY: state.woodcutter.y, woodcutterEnergy: state.woodcutter.energy,
    quarrierX: state.quarrier.x, quarrierY: state.quarrier.y, quarrierEnergy: state.quarrier.energy, quarrierUnlocked: state.quarrier.unlocked,
    harvesterX: state.harvester ? state.harvester.x : null,
    harvesterY: state.harvester ? state.harvester.y : null,
    blessing: state.blessing,
    quest: state.quest,
    tools: state.tools,
    equipment: state.equipment || null,
    cropSelect: state.cropSelect,
    cats: state.cats ? state.cats.map(c => ({ x: c.x, y: c.y, facing: c.facing, color: c.color })) : [],
    citizens: state.citizens ? state.citizens.map(c => ({ x: c.x, y: c.y, variant: c.variant, facing: c.facing, speed: c.speed })) : [],
    plots: (state.plots || []).map(p => ({ x: p.x, y: p.y, w: p.w, h: p.h, planted: p.planted, stage: p.stage, timer: p.timer, ripe: p.ripe, cropType: p.cropType || 'grain', fertility: p.fertility, lastCrop: p.lastCrop, cropHistory: p.cropHistory, lastHarvestDay: p.lastHarvestDay })),
    buildings: (state.buildings || []).map(b => ({ x: b.x, y: b.y, w: b.w, h: b.h, type: b.type, rot: b.rot, tier: b.tier || undefined })),
    trees: (state.trees || []).map(t => ({ x: t.x, y: t.y, health: t.health, maxHealth: t.maxHealth, alive: t.alive, size: t.size, type: t.type })),
    crystalShrine: state.crystalShrine ? { x: state.crystalShrine.x, y: state.crystalShrine.y } : null,
    crystalNodes: state.crystalNodes.map(c => ({ x: c.x, y: c.y, size: c.size, phase: c.phase, charge: c.charge })),
    crystalRainDrops: (state.crystalRainDrops || []).filter(d => !d.collected).map(d => ({ x: d.x, y: d.y, timer: d.timer, glow: d.glow })),
    resources: state.resources.map(r => ({ x: r.x, y: r.y, type: r.type, active: r.active, respawnTimer: r.respawnTimer })),
    ruins: state.ruins.map(r => ({ x: r.x, y: r.y, w: r.w, h: r.h, rot: r.rot })),
    grassTufts: (state.grassTufts || []).map(g => ({ x: g.x, y: g.y, blades: g.blades, height: g.height, hue: g.hue, sway: g.sway })),
    codex: state.codex,
    journal: state.journal,
    // Expedition system
    ironOre: state.ironOre, rareHide: state.rareHide,
    ancientRelic: state.ancientRelic, titanBone: state.titanBone,
    obsidian: state.obsidian, frostCrystal: state.frostCrystal,
    exoticSpices: state.exoticSpices, soulEssence: state.soulEssence,
    steel: state.steel || 0, marble: state.marble || 0, perfume: state.perfume || 0, scrolls: state.scrolls || 0,
    expeditionUpgrades: state.expeditionUpgrades,
    expeditionLog: state.expeditionLog,
    // Market supply/demand
    marketSupply: state.marketSupply || null,
    marketDemand: state.marketDemand || null,
    // Conquest persistence
    conquestPhase: state.conquest.phase,
    conquestWoodPile: state.conquest.woodPile,
    conquestStonePile: state.conquest.stonePile || 0,
    conquestExpeditionNum: state.conquest.expeditionNum,
    conquestBuildings: state.conquest.buildings,
    conquestBlueprintQueue: state.conquest.blueprintQueue.map(b => ({ x: b.x, y: b.y, type: b.type, progress: b.progress, maxProgress: b.maxProgress })),
    conquestSoldiers: state.conquest.soldiers.filter(s => s.hp > 0).map(s => ({ x: s.x, y: s.y, hp: s.hp, maxHp: s.maxHp, _unitType: s._unitType || 'swordsman' })),
    conquestWorkers: state.conquest.workers.map(w => ({ x: w.x, y: w.y, type: w.type })),
    // V1.2 RTS state
    conquestBarracksLevel: state.conquest.barracksLevel || 0,
    conquestUnitLevels: state.conquest.unitLevels || { swordsman: 1, archer: 1, cavalry: 1 },
    conquestUnitXP: state.conquest.unitXP || { swordsman: 0, archer: 0, cavalry: 0 },
    conquestTowerLevels: state.conquest.towerLevels || {},
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
    // Trade routes
    tradeRoutes: (state.tradeRoutes || []).map(r => ({ id: r.id, from: r.from, to: r.to, good: r.good, amount: r.amount, active: r.active, goldEarned: r.goldEarned || 0, tripPhase: r.tripPhase || 'outbound', raided: r.raided || false })),
    // Nations (multi-rival system)
    nations: (function() {
      let saved = {};
      let keys = Object.keys(state.nations || {});
      for (let k of keys) {
        let n = state.nations[k];
        saved[k] = {
          key: n.key, level: n.level, buildings: n.buildings, population: n.population,
          gold: n.gold, military: n.military, aggression: n.aggression, reputation: n.reputation,
          stance: n.stance, tradeActive: n.tradeActive, lastRaid: n.lastRaid, lastTradeDay: n.lastTradeDay,
          defeated: n.defeated, allied: n.allied, personality: n.personality,
          isleX: n.isleX, isleY: n.isleY, isleRX: n.isleRX, isleRY: n.isleRY,
          relations: n.relations, wars: n.wars || [], allies: n.allies || [],
          vassal: n.vassal || false, _vassalOf: n._vassalOf || null, tributePerDay: n.tributePerDay || 0,
        };
      }
      return saved;
    })(),
    colonies: (function() { var saved = {}; for (var ck of Object.keys(state.colonies || {})) { var cc = state.colonies[ck]; saved[ck] = { level: cc.level, buildings: cc.buildings, population: cc.population, gold: cc.gold, income: cc.income, military: cc.military, resources: cc.resources, governor: cc.governor, autoHarvest: cc.autoHarvest, autoTrade: cc.autoTrade, name: cc.name, isleX: cc.isleX, isleY: cc.isleY, isleRX: cc.isleRX, isleRY: cc.isleRY, uniqueResource: cc.uniqueResource, daysOwned: cc.daysOwned || 0, troopsStationed: cc.troopsStationed || 0 }; } return saved; })(),
    worldEvents: state.worldEvents || [],
    victoryAchieved: state.victoryAchieved || null,
    // Diplomacy system
    _alliances: state._alliances || [],
    _controlledIslands: state._controlledIslands || [],
    _victoriesEarned: state._victoriesEarned || [],
    _victoryAchieved: state._victoryAchieved || null,
    _lastStandActive: state._lastStandActive || false,
    // Personal rival & reputation
    personalRival: state.personalRival || null,
    globalReputation: state.globalReputation || 50,
    // Imperial Bridge
    imperialBridge: state.imperialBridge,
    bountyBoard: state.bountyBoard,
    cook: state.cook ? { unlocked: state.cook.unlocked, x: state.cook.x, y: state.cook.y } : null,
    fisherman: state.fisherman ? { unlocked: state.fisherman.unlocked, fishCaught: state.fisherman.fishCaught } : null,
    // Island exploration phases
    vulcanPhase: state.vulcan.phase,
    hyperboreaPhase: state.hyperborea.phase,
    plentyPhase: state.plenty.phase,
    necropolisPhase: state.necropolis.phase,
    // Island loot states (BUG-019)
    vulcanLoot: {
      obsidianCollected: (state.vulcan.obsidianNodes || []).map(n => n.collected),
      hotSprings: (state.vulcan.hotSprings || []).map(h => ({ x: h.x, y: h.y })),
      lavaPools: (state.vulcan.lavaPools || []).map(l => ({ x: l.x, y: l.y, r: l.r })),
      obsidianPositions: (state.vulcan.obsidianNodes || []).map(n => ({ x: n.x, y: n.y })),
      smokeVents: (state.vulcan.smokeVents || []).map(s => ({ x: s.x, y: s.y })),
    },
    hyperboreaLoot: {
      ruinsLooted: (state.hyperborea.frozenRuins || []).map(r => r.looted),
      ruinPositions: (state.hyperborea.frozenRuins || []).map(r => ({ x: r.x, y: r.y })),
      iceNodes: (state.hyperborea.frostNodes || []).map(n => ({ x: n.x, y: n.y, collected: n.collected })),
    },
    plentyLoot: {
      spiceCollected: (state.plenty.spiceNodes || []).map(n => n.collected),
      spicePositions: (state.plenty.spiceNodes || []).map(n => ({ x: n.x, y: n.y })),
      fruitTrees: (state.plenty.fruitTrees || []).map(t => ({ x: t.x, y: t.y, fruit: t.fruit })),
    },
    necropolisLoot: {
      tombsLooted: (state.necropolis.tombs || []).map(t => t.looted),
      tombTrapped: (state.necropolis.tombs || []).map(t => !!t.trapped),
      tombPositions: (state.necropolis.tombs || []).map(t => ({ x: t.x, y: t.y })),
      soulCollected: (state.necropolis.soulNodes || []).map(n => n.collected),
      soulPositions: (state.necropolis.soulNodes || []).map(n => ({ x: n.x, y: n.y })),
      ghostTalked: (state.necropolis.ghostNPCs || []).map(g => g.talked),
      ghostNames: (state.necropolis.ghostNPCs || []).map(g => g.name || ''),
      ghostLines: (state.necropolis.ghostNPCs || []).map(g => g.line || ''),
      ghostPositions: (state.necropolis.ghostNPCs || []).map(g => ({ x: g.x, y: g.y })),
    },
    // Legia military system
    legia: state.legia || null,
    legiaUnits: (state.legia ? state.legia.units : []) || [],
    _battlesWon: state._battlesWon || 0,
    _activeFormation: state._activeFormation || 'line',
    // Random events
    activeEvent: state.activeEvent || null,
    eventCooldown: state.eventCooldown || {},
    eventHistory: state.eventHistory || [],
    // Faction
    faction: state.faction || 'rome',
    _gameMode: state._gameMode || null,
    // God system
    god: state.god || { faction: null, prayerCooldown: 0, ultimateCharge: 0, blessingActive: null, blessingTimer: 0 },
    // Wardrobe cosmetics
    wardrobe: state.wardrobe || { tunicColor: 0, headwear: 0 },
    naval: state.naval ? { shipHP: state.naval.shipHP, shipMaxHP: state.naval.shipMaxHP, cannonDamage: state.naval.cannonDamage, hullLevel: state.naval.hullLevel || 0, cannonLevel: state.naval.cannonLevel || 0, sailLevel: state.naval.sailLevel || 0 } : null,
    // Victory
    won: state.won || false,
    achievements: state.achievements || [],
    playerStats: state.playerStats || null,
    dailyQuests: state.dailyQuests || [],
    dailyQuestsDay: state.dailyQuestsDay || 0,
    milestonesClaimed: state.milestonesClaimed || [],
    // Research / Technology
    research: state.research ? {
      points: state.research.points || 0,
      current: state.research.current,
      progress: state.research.progress || 0,
      completed: state.research.completed || [],
      libraryLevel: state.research.libraryLevel || 0,
    } : null,
    victoryAchieved: state.victoryAchieved || null,
    // Prestige / Score / Automation
    prestige: state.prestige || { count: 0, totalScore: 0, unlockedBuildings: [] },
    score: state.score || { goldEarned: 0, buildingsBuilt: 0, questsCompleted: 0, fishCaught: 0, enemiesDefeated: 0, daysSurvived: 0 },
    automation: state.automation || { granaryAuto: false, fishingPier: false, tradeRouteAuto: false, watchtowerAuto: false },
    // Progression system
    progression: state.progression,
    tutorialGoalComplete: state.tutorialGoalComplete || false,
    tutorialGoalStep: state.tutorialGoalStep || 0,
    // Narrative engine
    mainQuest: state.mainQuest || null,
    npcFavor: state.npcFavor || { livia: 0, marcus: 0, vesta: 0, felix: 0 },
    lastWantDate: state.lastWantDate || '',
    todayWantsSatisfied: state.todayWantsSatisfied || [],
    zonesVisitedToday: state.zonesVisitedToday || [],
    npcQuests: state.npcQuests || null,
    npcMemory: state.npcMemory || null,
    loreTablets: state.loreTablets || null,
    narrativeFlags: state.narrativeFlags || null,
    _narrationsPlayed: state._narrationsPlayed || [],
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
      loreItems: state.wreck.loreItems || null,
      cat: state.wreck.cat ? { x: state.wreck.cat.x, y: state.wreck.cat.y, introduced: state.wreck.cat.introduced, giftCount: state.wreck.cat.giftCount || 0, state: state.wreck.cat.state } : null,
      decor: state.wreck.decor,
      thirst: state.wreck.thirst,
      hunger: state.wreck.hunger,
      shelter: state.wreck.shelter,
      hasFire: state.wreck.hasFire,
      inventory: state.wreck.inventory,
      catFishGiven: state.wreck.catFishGiven || 0,
      nightSurvived: state.wreck.nightSurvived,
      wreckDayStart: state.wreck.wreckDayStart,
      caveDiscovered: state.wreck.caveDiscovered,
    },
    _pets: state._pets || [],
    _activePet: state._activePet || null,
    _lighthouses: state._lighthouses || {},
    _tavern: state._tavern || null,
    _revealedIslands: state._revealedIslands || [],
  };
  try {
    // Backup current save before overwriting
    let existing = localStorage.getItem(_SAVE_KEY);
    if (existing) {
      try { localStorage.setItem(_BACKUP_KEY, existing); } catch(be) { /* backup failed, continue anyway */ }
    }

    let json = JSON.stringify(saveData);

    // Size check — warn if approaching 5MB localStorage limit
    let sizeKB = Math.round(json.length / 1024);
    if (sizeKB > 4096) {
      console.warn('[SAVE] Save size ' + sizeKB + 'KB exceeds 4MB warning threshold!');
      addFloatingText(width / 2, height * 0.35, 'Warning: save file very large!', C.buildInvalid);
    } else if (sizeKB > 2048) {
      console.log('[SAVE] Save size: ' + sizeKB + 'KB');
    }

    let compressed = json;
    if (typeof LZString !== 'undefined') {
      compressed = LZString.compressToUTF16(json);
    }
    localStorage.setItem(_SAVE_KEY, compressed);

    // Validate: read back and verify parse
    let readback = localStorage.getItem(_SAVE_KEY);
    if (!readback) throw new Error('Save readback empty');
    // Decompress if needed, then verify JSON
    let rbJson = readback;
    if (typeof LZString !== 'undefined') {
      try { let d = LZString.decompressFromUTF16(readback); if (d) rbJson = d; } catch(e) {}
    }
    JSON.parse(rbJson); // throws if corrupt

    _saveIndicatorTimer = 60;
    addFloatingText(width / 2, height * 0.4, 'GAME SAVED', C.crystalGlow);
  } catch(e) {
    console.error('[SAVE] Save failed:', e);
    // Attempt to restore from backup
    try {
      let backup = localStorage.getItem(_BACKUP_KEY);
      if (backup) {
        localStorage.setItem(_SAVE_KEY, backup);
        addFloatingText(width / 2, height * 0.4, 'Save failed — backup restored', C.buildInvalid);
      } else {
        addFloatingText(width / 2, height * 0.4, 'Save failed!', C.buildInvalid);
      }
    } catch(re) {
      addFloatingText(width / 2, height * 0.4, 'Save failed!', C.buildInvalid);
    }
  }
}

// ─── SAVE FORMAT VERSION ─────────────────────────────────────────────────
// Current version: 9
// Migration history:
//   v1 — Base save: day, time, resources, plots, buildings, trees
//   v2 — Added NPC hearts, companion/woodcutter positions, crystals, solar
//   v3 — Added island expansion (islandLevel, islandRX/RY), pyramid, player XP/skills
//   v4 — Added expedition system (ironOre, rareHide, etc.), conquest persistence
//   v5 — Added colony system, imperial bridge, bounty board, cook/fisherman NPCs
//   v6 — Added island exploration phases, loot states, legia military, random events
//   v7 — Added narrative engine (mainQuest, npcFavor, npcQuests, loreTablets,
//         narrativeFlags), diving, wreck beach, wardrobe, progression, islandName,
//         codex.lore, codex.relics, won flag
//   v8 — Added prestige (New Game+), score tracking, automation endgame,
//         dynamic market prices with supply/demand
// ─────────────────────────────────────────────────────────────────────────

const SAVE_VERSION = 10;

function migrateSave(d) {
  let v = d.version || 1;

  // v1 -> v2: NPC hearts, companion positions, crystal system, solar energy
  if (v < 2) {
    d.marcusHearts = d.marcusHearts || 0;
    d.vestaHearts = d.vestaHearts || 0;
    d.felixHearts = d.felixHearts || 0;
    d.npcHearts = d.npcHearts || 0;
    d.crystals = d.crystals || 0;
    d.solar = d.solar || 80;
    d.maxSolar = d.maxSolar || 100;
    d.heartRewards = d.heartRewards || [];
    v = 2;
  }

  // v2 -> v3: Island expansion, pyramid, player XP/skills, harvest combo
  if (v < 3) {
    d.islandLevel = d.islandLevel || 1;
    d.islandRX = d.islandRX || WORLD.islandRX;
    d.islandRY = d.islandRY || WORLD.islandRY;
    d.pyramidLevel = d.pyramidLevel || 0;
    d.playerXp = d.playerXp || 0;
    d.playerTotalXp = d.playerTotalXp || 0;
    d.playerLevel = d.playerLevel || 1;
    d.playerSkillPoints = d.playerSkillPoints || 0;
    d.playerSkills = d.playerSkills || {};
    d.playerMaxHp = d.playerMaxHp || 100;
    d.harvestComboBestEver = d.harvestComboBestEver || 0;
    v = 3;
  }

  // v3 -> v4: Expedition system, conquest persistence
  if (v < 4) {
    d.ironOre = d.ironOre || 0;
    d.rareHide = d.rareHide || 0;
    d.ancientRelic = d.ancientRelic || 0;
    d.titanBone = d.titanBone || 0;
    d.obsidian = d.obsidian || 0;
    d.frostCrystal = d.frostCrystal || 0;
    d.exoticSpices = d.exoticSpices || 0;
    d.soulEssence = d.soulEssence || 0;
    d.expeditionUpgrades = d.expeditionUpgrades || {};
    d.expeditionLog = d.expeditionLog || [];
    d.conquestPhase = d.conquestPhase || 'locked';
    d.conquestWoodPile = d.conquestWoodPile || 0;
    d.conquestExpeditionNum = d.conquestExpeditionNum || 0;
    d.conquestBuildings = d.conquestBuildings || [];
    d.conquestBlueprintQueue = d.conquestBlueprintQueue || [];
    d.conquestSoldiers = d.conquestSoldiers || [];
    d.conquestWorkers = d.conquestWorkers || [];
    d.conquestTrees = d.conquestTrees || [];
    v = 4;
  }

  // v4 -> v5: Colony system, imperial bridge, bounty board, cook/fisherman
  if (v < 5) {
    d.conquestColonized = d.conquestColonized || false;
    d.conquestColonyLevel = d.conquestColonyLevel || 1;
    d.conquestColonyWorkers = d.conquestColonyWorkers || 3;
    d.conquestColonyIncome = d.conquestColonyIncome || 5;
    d.conquestColonyPlots = d.conquestColonyPlots || [];
    d.conquestColonyBuildings = d.conquestColonyBuildings || [];
    d.conquestColonyGrassTufts = d.conquestColonyGrassTufts || [];
    d.imperialBridge = d.imperialBridge || null;
    d.bountyBoard = d.bountyBoard || null;
    d.cook = d.cook || null;
    d.fisherman = d.fisherman || null;
    d.colonySpec = d.colonySpec || {};
    v = 5;
  }

  // v5 -> v6: Island exploration phases, loot states, legia, random events
  if (v < 6) {
    d.vulcanPhase = d.vulcanPhase || 'unexplored';
    d.hyperboreaPhase = d.hyperboreaPhase || 'unexplored';
    d.plentyPhase = d.plentyPhase || 'unexplored';
    d.necropolisPhase = d.necropolisPhase || 'unexplored';
    d.vulcanLoot = d.vulcanLoot || null;
    d.hyperboreaLoot = d.hyperboreaLoot || null;
    d.plentyLoot = d.plentyLoot || null;
    d.necropolisLoot = d.necropolisLoot || null;
    d.legia = d.legia || null;
    d.arenaHighWave = d.arenaHighWave || 0;
    d.arenaBridgeBuilt = d.arenaBridgeBuilt || false;
    d.activeEvent = d.activeEvent || null;
    d.eventCooldown = d.eventCooldown || {};
    d.eventHistory = d.eventHistory || [];
    v = 6;
  }

  // v6 -> v7: Narrative engine, diving, wreck, wardrobe, progression, islandName
  if (v < 7) {
    d.mainQuest = d.mainQuest || null;
    d.npcFavor = d.npcFavor || { livia: 0, marcus: 0, vesta: 0, felix: 0 };
    d.lastWantDate = d.lastWantDate || '';
    d.todayWantsSatisfied = d.todayWantsSatisfied || [];
    d.zonesVisitedToday = d.zonesVisitedToday || [];
    d.npcQuests = d.npcQuests || null;
    d.loreTablets = d.loreTablets || null;
    d.narrativeFlags = d.narrativeFlags || null;
    d.diving = d.diving || null;
    d.wreck = d.wreck || null;
    d.wardrobe = d.wardrobe || { tunicColor: 0, headwear: 0 };
    d.won = d.won || false;
    d.progression = d.progression || null;
    d.islandName = d.islandName || null;
    d.playerXpBoost = d.playerXpBoost || 0;
    d.playerXpBoostTimer = d.playerXpBoostTimer || 0;
    if (d.codex && typeof d.codex === 'object') {
      d.codex.lore = d.codex.lore || {};
      d.codex.relics = d.codex.relics || {};
    }
    v = 7;
  }

  // v7 -> v8: Prestige system, score tracking, automation, dynamic market
  if (v < 8) {
    d.prestige = d.prestige || { count: 0, totalScore: 0, unlockedBuildings: [] };
    d.score = d.score || { goldEarned: 0, buildingsBuilt: 0, questsCompleted: 0, fishCaught: 0, enemiesDefeated: 0, daysSurvived: d.day || 0 };
    d.automation = d.automation || { granaryAuto: false, fishingPier: false, tradeRouteAuto: false, watchtowerAuto: false };
    v = 8;
  }

  // v8 -> v9: Colony management system
  if (v < 9) {
    d.colonies = d.colonies || {};
    v = 9;
  }

  // v9 -> v10: 8-faction system, god NPCs, faction units
  if (v < 10) {
    d.god = d.god || { faction: d.faction || 'rome', prayerCooldown: 0, ultimateCharge: 0, blessingActive: null, blessingTimer: 0 };
    v = 10;
  }

  d.version = v;
  return d;
}


function loadGame() {
  let raw = localStorage.getItem(_SAVE_KEY);
  if (!raw) {
    addFloatingText(width / 2, height * 0.4, 'No save found!', C.buildInvalid);
    return;
  }
  // Try LZ-String decompression, fall back to raw JSON
  let json = raw;
  if (typeof LZString !== 'undefined') {
    try { let dec = LZString.decompressFromUTF16(raw); if (dec) json = dec; } catch(e) {}
  }
  let d;
  try {
    d = JSON.parse(json);
  } catch(parseErr) {
    console.error('[LOAD] Main save corrupt, trying backup:', parseErr);
    try {
      let backup = localStorage.getItem(_BACKUP_KEY);
      if (backup) {
        let bJson = backup;
        if (typeof LZString !== 'undefined') {
          try { let dec = LZString.decompressFromUTF16(backup); if (dec) bJson = dec; } catch(e) {}
        }
        d = JSON.parse(bJson);
        localStorage.setItem(_SAVE_KEY, backup); // restore main from backup
        addFloatingText(width / 2, height * 0.35, 'Recovered from backup save', [255, 200, 80]);
      }
    } catch(backupErr) {
      console.error('[LOAD] Backup also corrupt:', backupErr);
    }
    if (!d) {
      addFloatingText(width / 2, height * 0.4, 'Save corrupted — starting new game', C.buildInvalid);
      console.error('[LOAD] Both saves corrupt. Player must start fresh.');
      return;
    }
  }
  try {
    d = migrateSave(d);
    state.day = d.day || 1; state.time = d.time || 360;
    state.seeds = d.seeds || 0; state.harvest = d.harvest || 0; state.wood = d.wood || 0;
    state.stone = d.stone || 0; state.crystals = d.crystals || 0; state.gold = d.gold || 0;
    state.fish = d.fish || 0;
    state.grapeSeeds = d.grapeSeeds || 0; state.oliveSeeds = d.oliveSeeds || 0;
    state.flaxSeeds = d.flaxSeeds || 0; state.pomegranateSeeds = d.pomegranateSeeds || 0; state.lotusSeeds = d.lotusSeeds || 0;
    state.meals = d.meals || 0; state.wine = d.wine || 0; state.oil = d.oil || 0;
    state.stew = d.stew || 0; state.garum = d.garum || 0; state.honeyedFigs = d.honeyedFigs || 0; state.ambrosia = d.ambrosia || 0;
    state.foodShortage = d.foodShortage || 0;
    state.hudMinimized = d.hudMinimized || false;
    state.seaPeopleRaidCooldown = d.seaPeopleRaidCooldown || 0;
    if (d.templeCourt) { state.templeCourt.lastSpawn = d.templeCourt.lastSpawn || 0; }
    state.heartRewards = Array.isArray(d.heartRewards) ? d.heartRewards : [];
    if (d.weather && typeof d.weather === 'object') state.weather = { type: d.weather.type || 'clear', timer: d.weather.timer || 0, intensity: d.weather.intensity || 0 };
    state.daysSinceRain = d.daysSinceRain || 0;
    state.stormMessageShown = false; // session only
    if (state.marcus) state.marcus.hearts = d.marcusHearts || 0;
    if (state.vesta) {
      state.vesta.hearts = d.vestaHearts || 0;
      state.vesta.x = WORLD.islandCX - 420;
      state.vesta.y = WORLD.islandCY - 5;
      state.vesta.task = 'idle'; state.vesta.timer = 0; state.vesta.carryCount = 0;
    }
    if (state.felix) state.felix.hearts = d.felixHearts || 0;
    state.harvestCombo.bestEver = d.harvestComboBestEver || 0;
    if (d.codex && typeof d.codex === 'object') {
      state.codex = d.codex;
      if (!state.codex.fishCaught || typeof state.codex.fishCaught !== 'object') state.codex.fishCaught = {};
      if (!state.codex.cropsGrown || typeof state.codex.cropsGrown !== 'object') state.codex.cropsGrown = {};
      if (!state.codex.buildingsBuilt || typeof state.codex.buildingsBuilt !== 'object') state.codex.buildingsBuilt = {};
      if (!state.codex.fish)    state.codex.fish    = {};
      if (!state.codex.crops)   state.codex.crops   = {};
      if (!state.codex.enemies) state.codex.enemies = {};
      if (!state.codex.relics)  state.codex.relics  = {};
      if (!state.codex.lore)    state.codex.lore    = {};
      if (state.codex.npcMaxHearts === undefined) state.codex.npcMaxHearts = 0;
      if (state.codex.treasuresFound === undefined) state.codex.treasuresFound = 0;
      if (state.codex.festivalsAttended === undefined) state.codex.festivalsAttended = 0;
      if (state.codex.visitorsTraded === undefined) state.codex.visitorsTraded = 0;
      if (state.codex.bestCombo === undefined) state.codex.bestCombo = 0;
    }
    if (Array.isArray(d.journal)) state.journal = d.journal;
    // Temple court migration
    if (!state.templeCourt) state.templeCourt = { visitors: [], lastSpawn: 0 };
    // Expedition resources
    state.ironOre = d.ironOre || 0;
    state.rareHide = d.rareHide || 0;
    state.ancientRelic = d.ancientRelic || 0;
    state.titanBone = d.titanBone || 0;
    state.obsidian = d.obsidian || 0;
    state.frostCrystal = d.frostCrystal || 0;
    state.exoticSpices = d.exoticSpices || 0;
    state.soulEssence = d.soulEssence || 0;
    state.steel = d.steel || 0; state.marble = d.marble || 0; state.perfume = d.perfume || 0; state.scrolls = d.scrolls || 0;
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
    // Market supply/demand
    if (d.marketSupply) state.marketSupply = d.marketSupply;
    if (d.marketDemand) state.marketDemand = d.marketDemand;
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
    state.conquest.stonePile = d.conquestStonePile || 0;
    state.conquest.expeditionNum = d.conquestExpeditionNum || 0;
    // V1.2 RTS state
    state.conquest.barracksLevel = d.conquestBarracksLevel || 0;
    state.conquest.unitLevels = d.conquestUnitLevels || { swordsman: 1, archer: 1, cavalry: 1 };
    state.conquest.unitXP = d.conquestUnitXP || { swordsman: 0, archer: 0, cavalry: 0 };
    state.conquest.towerLevels = d.conquestTowerLevels || {};
    state.conquest.towerTimers = {};
    state.conquest.barracksGenTimer = 0;
    if (d.bountyBoard && typeof d.bountyBoard === 'object') state.bountyBoard = d.bountyBoard;
    if (d.cook) { state.cook.unlocked = d.cook.unlocked; state.cook.x = d.cook.x || state.cook.x; state.cook.y = d.cook.y || state.cook.y; }
    if (d.fisherman) { state.fisherman.unlocked = d.fisherman.unlocked; state.fisherman.fishCaught = d.fisherman.fishCaught || 0; }
    if (d.conquestBuildings) state.conquest.buildings = d.conquestBuildings;
    if (d.conquestBlueprintQueue) state.conquest.blueprintQueue = d.conquestBlueprintQueue;
    if (d.conquestTrees) {
      state.conquest.trees = d.conquestTrees.map(t => ({ ...t }));
    }
    if (d.conquestSoldiers) {
      state.conquest.soldiers = d.conquestSoldiers.map(s => ({
        ...s, vx: 0, vy: 0, state: 'follow', target: null,
        attackTimer: 0, facing: 1, flashTimer: 0,
        _unitType: s._unitType || 'swordsman',
        _charging: (s._unitType === 'cavalry'),
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
    if (d.imperialBridge && typeof d.imperialBridge === 'object') {
      state.imperialBridge = d.imperialBridge;
    }
    // Colony specialization
    // Trade routes — restore from save
    if (d.tradeRoutes && Array.isArray(d.tradeRoutes)) {
      let _trHP = getPortPosition();
      let _trCP = { x: state.conquest.isleX + state.conquest.isleRX * 0.9, y: state.conquest.isleY + state.conquest.isleRY * 0.7 };
      state.tradeRoutes = d.tradeRoutes.map(function(r) { return { id: r.id || 1, from: r.from || { x: _trHP.x, y: _trHP.y, name: 'Home' }, to: r.to || { x: _trCP.x, y: _trCP.y, name: 'Terra Nova' }, good: r.good, amount: r.amount || 1, shipX: _trHP.x, shipY: _trHP.y, shipAngle: 0, active: r.active !== false, tripTimer: 0, tripPhase: r.tripPhase || 'outbound', goldEarned: r.goldEarned || 0, raided: r.raided || false, raidTimer: 0, raidSmokeParticles: [] }; });
      if (typeof _nextRouteId !== 'undefined' && state.tradeRoutes.length > 0) { let _ids = state.tradeRoutes.map(function(r) { return r.id || 0; }); _nextRouteId = Math.max.apply(null, _ids) + 1; if (!isFinite(_nextRouteId)) _nextRouteId = 1; }
    }
    if (d.colonySpec) state.colonySpec = d.colonySpec;
    // Colony management system
    if (d.colonies && typeof d.colonies === 'object') {
      state.colonies = {};
      for (var ck of Object.keys(d.colonies)) {
        var sc = d.colonies[ck];
        state.colonies[ck] = {
          level: sc.level || 1, buildings: sc.buildings || [], population: sc.population || 5,
          gold: sc.gold || 0, income: sc.income || 10, military: sc.military || 0,
          resources: sc.resources || { wood: 0, stone: 0 },
          governor: sc.governor || null, autoHarvest: sc.autoHarvest || false, autoTrade: sc.autoTrade || false,
          name: sc.name || ck, isleX: sc.isleX || 0, isleY: sc.isleY || 0,
          isleRX: sc.isleRX || 300, isleRY: sc.isleRY || 200,
          uniqueResource: sc.uniqueResource || null,
          daysOwned: sc.daysOwned || 0, troopsStationed: sc.troopsStationed || 0,
        };
      }
    }
    // Nations (multi-rival system) -- load or migrate from old single rival
    if (d.nations && Object.keys(d.nations).length > 0) {
      state.nations = {};
      for (let nk of Object.keys(d.nations)) {
        let sn = d.nations[nk];
        let n = makeNation(nk);
        n.level = sn.level || 1; n.buildings = sn.buildings || [];
        n.population = sn.population || 5; n.gold = sn.gold || 100;
        n.military = sn.military || 3; n.aggression = sn.aggression || 0.3;
        n.reputation = sn.reputation || 0; n.stance = sn.stance || 'neutral';
        n.tradeActive = sn.tradeActive || false; n.lastRaid = sn.lastRaid || 0;
        n.lastTradeDay = sn.lastTradeDay || 0; n.defeated = sn.defeated || false;
        n.allied = sn.allied || false; n.personality = sn.personality || n.personality;
        // Nation positions always use compass layout from NATION_DEFAULTS (not old saves)
        if (sn.isleRX) n.isleRX = sn.isleRX; if (sn.isleRY) n.isleRY = sn.isleRY;
        n.relations = sn.relations || {}; n.wars = sn.wars || []; n.allies = sn.allies || [];
        n.vassal = sn.vassal || false; n._vassalOf = sn._vassalOf || null; n.tributePerDay = sn.tributePerDay || 0;
        n.raidParty = []; n.raidWarning = 0;
        state.nations[nk] = n;
      }
    } else if (d.rival) {
      // Migrate old single-rival save to multi-nation
      initNations();
      let oldKey = d.rival.faction || 'carthage';
      if (state.nations[oldKey]) {
        let n = state.nations[oldKey];
        n.level = d.rival.level || 1; n.buildings = d.rival.buildings || [];
        n.population = d.rival.population || 5; n.gold = d.rival.gold || 100;
        n.military = d.rival.military || 3; n.aggression = d.rival.aggression || 0.3;
        n.reputation = d.rival.reputation || 0;
        n.tradeActive = d.rival.tradeActive || false; n.lastRaid = d.rival.lastRaid || 0;
        n.lastTradeDay = d.rival.lastTradeDay || 0; n.defeated = d.rival.defeated || false;
        n.allied = d.rival.allied || false;
      }
    } else {
      initNations();
    }
    state.worldEvents = Array.isArray(d.worldEvents) ? d.worldEvents : [];
    state.victoryAchieved = d.victoryAchieved || null;
    // Personal rival & reputation
    if (d.personalRival) {
      state.personalRival = d.personalRival;
    } else if (state.faction) {
      initPersonalRival(state.faction);
    }
    state.globalReputation = d.globalReputation || 50;
    state.rivalEncounter = null;
    state.nationDiplomacyOpen = null;
    state.visitingNation = null;
    state.nationIsland = null;
    // Openworld: reset all legacy active flags on load
    if (state.vulcan) state.vulcan.active = false;
    if (state.hyperborea) state.hyperborea.active = false;
    if (state.plenty) state.plenty.active = false;
    if (state.necropolis) state.necropolis.active = false;
    // Island exploration phases — prevents re-generating content on revisit
    if (d.vulcanPhase) state.vulcan.phase = d.vulcanPhase;
    if (d.hyperboreaPhase) state.hyperborea.phase = d.hyperboreaPhase;
    if (d.plentyPhase) state.plenty.phase = d.plentyPhase;
    if (d.necropolisPhase) state.necropolis.phase = d.necropolisPhase;
    // Island loot states (BUG-019)
    if (d.vulcanLoot && state.vulcan.phase !== 'unexplored') {
      let vl = d.vulcanLoot;
      if (vl.obsidianPositions) state.vulcan.obsidianNodes = vl.obsidianPositions.map((p, i) => ({ x: p.x, y: p.y, collected: vl.obsidianCollected[i] || false }));
      if (vl.hotSprings) state.vulcan.hotSprings = vl.hotSprings.map(h => ({ x: h.x, y: h.y, healTimer: 0 }));
      if (vl.lavaPools) state.vulcan.lavaPools = vl.lavaPools.map(l => ({ x: l.x, y: l.y, r: l.r, phase: random(TWO_PI) }));
      if (vl.smokeVents) state.vulcan.smokeVents = vl.smokeVents.map(s => ({ x: s.x, y: s.y, phase: random(TWO_PI) }));
    }
    if (d.hyperboreaLoot && state.hyperborea.phase !== 'unexplored') {
      let hl = d.hyperboreaLoot;
      if (hl.ruinPositions) state.hyperborea.frozenRuins = hl.ruinPositions.map((p, i) => ({ x: p.x, y: p.y, looted: hl.ruinsLooted[i] || false }));
      if (hl.iceNodes) state.hyperborea.frostNodes = hl.iceNodes.map(n => ({ x: n.x, y: n.y, collected: n.collected || false }));
    }
    if (d.plentyLoot && state.plenty.phase !== 'unexplored') {
      let pl = d.plentyLoot;
      if (pl.spicePositions) state.plenty.spiceNodes = pl.spicePositions.map((p, i) => ({ x: p.x, y: p.y, collected: pl.spiceCollected[i] || false }));
      if (pl.fruitTrees) state.plenty.fruitTrees = pl.fruitTrees.map(t => ({ x: t.x, y: t.y, fruit: t.fruit }));
    }
    if (d.necropolisLoot && state.necropolis.phase !== 'unexplored') {
      let nl = d.necropolisLoot;
      if (nl.tombPositions) state.necropolis.tombs = nl.tombPositions.map((p, i) => ({ x: p.x, y: p.y, looted: nl.tombsLooted[i] || false, trapped: nl.tombTrapped ? nl.tombTrapped[i] || false : false }));
      if (nl.soulPositions) state.necropolis.soulNodes = nl.soulPositions.map((p, i) => ({ x: p.x, y: p.y, collected: nl.soulCollected[i] || false }));
      let _gn = ['Aurelius', 'Cornelia', 'Septimus'], _gl = ['The forge of Vulcan... obsidian tempered in soul fire creates weapons beyond mortal craft.', 'Frost crystals from the north... they bind enchantments to steel. Seek Hyperborea.', 'I once sailed to the Isle of Plenty... its spices could preserve food for centuries.'];
      if (nl.ghostPositions) state.necropolis.ghostNPCs = nl.ghostPositions.map((p, i) => ({ x: p.x, y: p.y, talked: nl.ghostTalked[i] || false, name: nl.ghostNames ? nl.ghostNames[i] : _gn[i] || '', line: nl.ghostLines ? nl.ghostLines[i] : _gl[i] || '' }));
    }
    // Legia military system
    if (d.legia) {
      state.legia.recruits = d.legia.recruits || 0;
      state.legia.maxRecruits = d.legia.maxRecruits || 10;
      state.legia.trainingQueue = d.legia.trainingQueue || 0;
      state.legia.trainingTimer = d.legia.trainingTimer || 0;
      state.legia.castrumLevel = d.legia.castrumLevel || 0;
      state.legia.castrumX = d.legia.castrumX || 0;
      state.legia.castrumY = d.legia.castrumY || 0;
      state.legia.deployed = d.legia.deployed || 0;
      state.legia.legiaUIOpen = false; // never restore open
      state.legia.soldiers = d.legia.soldiers || [];
      state.legia.army = d.legia.army || [];
      state.legia.morale = d.legia.morale != null ? d.legia.morale : 100;
      state.legia.expeditionTarget = null; // reset expedition state on load
      state.legia.marching = false;
      state.legia.units = d.legiaUnits || [];
    }
    if (d._battlesWon) state._battlesWon = d._battlesWon;
    if (d._activeFormation) state._activeFormation = d._activeFormation;
    // Safety: ensure castrum is active if island level >= 8
    if (state.islandLevel >= 8 && state.legia && state.legia.castrumLevel < 1) {
      state.legia.castrumLevel = 1;
      state.legia.castrumX = 920;
      state.legia.castrumY = 480;
      // Ensure castrum building exists
      if (!state.buildings.some(b => b.type === 'castrum')) {
        state.buildings.push({ x: 920, y: 480, w: 130, h: 100, type: 'castrum', rot: 0 });
      }
    }
    // Random events
    if (d.activeEvent && typeof d.activeEvent === 'object') state.activeEvent = d.activeEvent;
    if (d.eventCooldown && typeof d.eventCooldown === 'object') state.eventCooldown = d.eventCooldown;
    if (Array.isArray(d.eventHistory)) state.eventHistory = d.eventHistory;
    // Faction — default to 'rome' for existing saves
    state.faction = d.faction || 'rome';
    state._gameMode = d._gameMode || null;
    // Diplomacy system
    state._alliances = d._alliances || [];
    state._controlledIslands = d._controlledIslands || [];
    state._victoriesEarned = d._victoriesEarned || [];
    state._victoryAchieved = d._victoryAchieved || null;
    state._lastStandActive = d._lastStandActive || false;
    state._pets = d._pets || [];
    state._activePet = d._activePet || null;
    state._lighthouses = d._lighthouses || {};
    state._tavern = d._tavern || null;
    state._revealedIslands = d._revealedIslands || [];
    // God system
    if (d.god) {
      state.god = { faction: d.god.faction || state.faction, prayerCooldown: d.god.prayerCooldown || 0,
        ultimateCharge: d.god.ultimateCharge || 0, blessingActive: d.god.blessingActive || null,
        blessingTimer: d.god.blessingTimer || 0 };
    } else {
      state.god = { faction: state.faction, prayerCooldown: 0, ultimateCharge: 0, blessingActive: null, blessingTimer: 0 };
    }
    // Regenerate faction wildlife/flora (not saved, always regenerated)
    if (typeof initFactionNaturals === 'function') initFactionNaturals();
    // Wardrobe cosmetics
    state.wardrobe = d.wardrobe || { tunicColor: 0, headwear: 0 };
    if (d.naval) { state.naval.shipHP = d.naval.shipHP || 100; state.naval.shipMaxHP = d.naval.shipMaxHP || 100; state.naval.cannonDamage = d.naval.cannonDamage || 15; state.naval.hullLevel = d.naval.hullLevel || 0; state.naval.cannonLevel = d.naval.cannonLevel || 0; state.naval.sailLevel = d.naval.sailLevel || 0; }
    // Research / Technology
    if (d.research) {
      state.research = {
        points: d.research.points || 0,
        current: d.research.current || null,
        progress: d.research.progress || 0,
        completed: d.research.completed || [],
        libraryLevel: d.research.libraryLevel || 0,
      };
    }
    state.victoryAchieved = d.victoryAchieved || null;
    // Victory state
    state.won = !!d.won;
    state.achievements = Array.isArray(d.achievements) ? d.achievements : [];
    state.playerStats = (d.playerStats && typeof d.playerStats === 'object') ? d.playerStats : { totalGoldEarned: 0, cropsHarvested: 0, fishCaught: 0, enemiesDefeated: 0, daysSurvived: 0, buildingsBuilt: 0, islandsDiscovered: 0, timePlayed: 0, treesChopped: 0, giftsGiven: 0, crystalsCollected: 0, questsCompleted: 0, expeditionsCompleted: 0, divesCompleted: 0, catsAdopted: 0, mealsCooked: 0 };
    state.dailyQuests = Array.isArray(d.dailyQuests) ? d.dailyQuests : [];
    state.dailyQuestsDay = d.dailyQuestsDay || 0;
    state.milestonesClaimed = Array.isArray(d.milestonesClaimed) ? d.milestonesClaimed : [];
    // Prestige / Score / Automation
    if (d.prestige && typeof d.prestige === 'object') state.prestige = d.prestige;
    if (d.score && typeof d.score === 'object') state.score = d.score;
    if (d.automation && typeof d.automation === 'object') state.automation = d.automation;
    if (!state.prestige) state.prestige = { count: 0, totalScore: 0, unlockedBuildings: [] };
    if (!state.score) state.score = { goldEarned: 0, buildingsBuilt: 0, questsCompleted: 0, fishCaught: 0, enemiesDefeated: 0, daysSurvived: 0 };
    if (!state.automation) state.automation = { granaryAuto: false, fishingPier: false, tradeRouteAuto: false, watchtowerAuto: false };
    // Ensure prophecy exists
    if (!state.prophecy) state.prophecy = generateProphecy();
    // Load progression — old saves without progression = fully unlocked (veteran)
    if (d.progression) {
      state.progression = d.progression;
      if (!state.progression.tutorialsSeen) state.progression.tutorialsSeen = {};
      if (!state.progression.companionsAwakened) state.progression.companionsAwakened = { lares: false, woodcutter: false, harvester: false, centurion: false };
      if (!state.progression.npcsFound) state.progression.npcsFound = { livia: false, marcus: false, vesta: false, felix: false };
      // Safety: if player has hearts with Livia, villa must be cleared
      if (state.npc.hearts >= 2 && !state.progression.villaCleared) {
        state.progression.villaCleared = true;
      }
    } else {
      // Legacy save — mark everything as unlocked
      state.progression.gameStarted = false; // false = old save, skip progression gates
    }
    // Restore tutorial progress
    if (d.tutorialGoalComplete) state.tutorialGoalComplete = true;
    if (d.tutorialGoalStep) state.tutorialGoalStep = d.tutorialGoalStep;
    // Load narrative engine state
    if (d.mainQuest && typeof d.mainQuest === 'object') state.mainQuest = d.mainQuest;
    if (d.npcFavor && typeof d.npcFavor === 'object') state.npcFavor = d.npcFavor;
    state.lastWantDate = d.lastWantDate || '';
    state.todayWantsSatisfied = Array.isArray(d.todayWantsSatisfied) ? d.todayWantsSatisfied : [];
    state.zonesVisitedToday = Array.isArray(d.zonesVisitedToday) ? d.zonesVisitedToday : [];
    if (d.npcQuests && typeof d.npcQuests === 'object') state.npcQuests = d.npcQuests;
    if (d.npcMemory && typeof d.npcMemory === 'object') state.npcMemory = d.npcMemory;
    if (d.loreTablets && typeof d.loreTablets === 'object') state.loreTablets = d.loreTablets;
    if (d.narrativeFlags && typeof d.narrativeFlags === 'object') state.narrativeFlags = d.narrativeFlags;
    state._narrationsPlayed = Array.isArray(d._narrationsPlayed) ? d._narrationsPlayed : [];
    // Load wreck state
    if (d.wreck && typeof d.wreck === 'object') {
      state.wreck = d.wreck;
      // Compat defaults for saves before raft system
      if (state.wreck.raftProgress === undefined) state.wreck.raftProgress = 0;
      if (state.wreck.raftBuilt === undefined) state.wreck.raftBuilt = false;
      if (state.wreck.raftWood === undefined) state.wreck.raftWood = 0;
      if (d.wreck.loreItems) state.wreck.loreItems = d.wreck.loreItems;
      if (d.wreck.cat) { state.wreck.cat = state.wreck.cat || {}; Object.assign(state.wreck.cat, d.wreck.cat); state.wreck.cat.vx = 0; state.wreck.cat.vy = 0; state.wreck.cat.timer = 60; state.wreck.cat.meowTimer = 0; }
      if (state.wreck.raftRope === undefined) state.wreck.raftRope = 0;
      if (state.wreck.raftCloth === undefined) state.wreck.raftCloth = 0;
      if (!Array.isArray(state.wreck.birds)) state.wreck.birds = [];
      // Survival expansion compat
      if (state.wreck.thirst === undefined) state.wreck.thirst = 80;
      if (state.wreck.hunger === undefined) state.wreck.hunger = 70;
      if (state.wreck.shelter === undefined) state.wreck.shelter = false;
      if (state.wreck.hasFire === undefined) state.wreck.hasFire = false;
      if (!state.wreck.inventory) state.wreck.inventory = { driftwood: 0, sailcloth: 0, rope: 0, hammer: 0, flint: 0, palmFrond: 0, raftFrame: false, seaworthyRaft: false };
      if (state.wreck.catFishGiven === undefined) state.wreck.catFishGiven = 0;
      if (state.wreck.nightSurvived === undefined) state.wreck.nightSurvived = false;
      if (state.wreck.wreckDayStart === undefined) state.wreck.wreckDayStart = state.day;
      if (state.wreck.caveDiscovered === undefined) state.wreck.caveDiscovered = false;
      if (!Array.isArray(state.wreck.glints)) state.wreck.glints = [];
      if (!Array.isArray(state.wreck.palms)) state.wreck.palms = [];
      if (!Array.isArray(state.wreck.crabs)) state.wreck.crabs = [];
      if (!Array.isArray(state.wreck.decor)) state.wreck.decor = [];
      if (!Array.isArray(state.wreck.scavNodes)) state.wreck.scavNodes = [];
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
    state.islandName = d.islandName || null;
    updatePortPositions(); // recompute from restored island size (must be after islandRX/RY load)
    if (d.pyramidLevel) state.pyramid.level = d.pyramidLevel;
    state.player.x = d.playerX || WORLD.islandCX; state.player.y = d.playerY || WORLD.islandCY;
    if (d.playerFacing) state.player.facing = d.playerFacing;
    if (d.playerXp !== undefined) state.player.xp = d.playerXp;
    if (d.playerTotalXp !== undefined) state.player.totalXp = d.playerTotalXp;
    if (d.playerLevel) state.player.level = d.playerLevel;
    if (d.playerSkillPoints !== undefined) state.player.skillPoints = d.playerSkillPoints;
    if (d.playerSkills) state.player.skills = d.playerSkills;
    if (d.playerMaxHp) state.player.maxHp = d.playerMaxHp;
    state.player.weapon = d.playerWeapon || 0;
    state.player.armor = d.playerArmor || 0;
    state.player.defense = d.playerDefense || floor(2 + (state.player.level || 1) * 0.5);
    state.player.levelAtk = d.playerLevelAtk || (state.player.level || 1);
    // Recalculate level-scaled stats for existing saves
    let _rlvl = state.player.level || 1;
    state.player.maxHp = max(state.player.maxHp || 100, 100 + _rlvl * 10);
    // attackDamage is weapon-based; levelAtk adds on top via getPlayerAttackDamage()
    if (state.companionPets && state.companionPets.centurion) {
      let _rcl = state.companionPets.centurion.level || 1;
      state.centurion.maxHp = floor(120 * (1 + (_rcl - 1) * 0.15));
      state.centurion.hp = min(state.centurion.hp, state.centurion.maxHp);
      state.centurion.attackDamage = floor(12 * (1 + (_rcl - 1) * 0.10));
      state.centurion.speed = 2.8 * (1 + (_rcl - 1) * 0.05);
    }
    state.player.potions = d.playerPotions || 0;
    if (d.playerXpBoost) state.player.xpBoost = d.playerXpBoost;
    if (d.playerXpBoostTimer) state.player.xpBoostTimer = d.playerXpBoostTimer;
    state.npc.hearts = d.npcHearts || 0;
    if (d.companionX) { state.companion.x = d.companionX; state.companion.y = d.companionY; }
    state.companion.energy = d.companionEnergy || 100;
    // Restore companion pets levels/XP
    if (d.companionPets && state.companionPets) {
      if (d.companionPets.cat) { state.companionPets.cat.level = d.companionPets.cat.level || 1; state.companionPets.cat.xp = d.companionPets.cat.xp || 0; }
      if (d.companionPets.tortoise) { state.companionPets.tortoise.level = d.companionPets.tortoise.level || 1; state.companionPets.tortoise.xp = d.companionPets.tortoise.xp || 0; if (d.companionPets.tortoise.x) { state.companionPets.tortoise.x = d.companionPets.tortoise.x; state.companionPets.tortoise.y = d.companionPets.tortoise.y; } }
      if (d.companionPets.crow) { state.companionPets.crow.level = d.companionPets.crow.level || 1; state.companionPets.crow.xp = d.companionPets.crow.xp || 0; if (d.companionPets.crow.x) { state.companionPets.crow.x = d.companionPets.crow.x; state.companionPets.crow.y = d.companionPets.crow.y; } }
      if (d.companionPets.centurion) { state.companionPets.centurion.level = d.companionPets.centurion.level || 1; state.companionPets.centurion.xp = d.companionPets.centurion.xp || 0; state.companionPets.centurion.ability = d.companionPets.centurion.ability || null; }
    }
    if (d.woodcutterX) { state.woodcutter.x = d.woodcutterX; state.woodcutter.y = d.woodcutterY; }
    state.woodcutter.energy = d.woodcutterEnergy || 100;
    if (d.quarrierX) { state.quarrier.x = d.quarrierX; state.quarrier.y = d.quarrierY; }
    state.quarrier.energy = d.quarrierEnergy || 100;
    state.quarrier.unlocked = d.quarrierUnlocked || (state.islandLevel >= 5);
    if (d.harvesterX && state.harvester) {
      state.harvester.x = d.harvesterX; state.harvester.y = d.harvesterY;
    }
    // Restore new systems
    if (d.blessing && typeof d.blessing === 'object') state.blessing = { type: d.blessing.type || null, timer: d.blessing.timer || 0, cooldown: d.blessing.cooldown || 0 };
    if (d.quest) state.quest = d.quest;
    if (d.tools && typeof d.tools === 'object') state.tools = { sickle: d.tools.sickle || 0, axe: d.tools.axe || 0, net: d.tools.net || 0 };
    if (d.equipment && typeof d.equipment === 'object') state.equipment = d.equipment;
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
          if (sp.fertility !== undefined) state.plots[i].fertility = sp.fertility;
          if (sp.lastCrop) state.plots[i].lastCrop = sp.lastCrop;
          if (sp.cropHistory) state.plots[i].cropHistory = sp.cropHistory;
          if (sp.lastHarvestDay) state.plots[i].lastHarvestDay = sp.lastHarvestDay;
        }
      });
    }
    if (d.buildings) state.buildings = d.buildings;
    // Normalize building sizes to current BLUEPRINTS on load
    if (state.buildings) {
      state.buildings.forEach(b => {
        if (BLUEPRINTS[b.type]) {
          b.w = BLUEPRINTS[b.type].w;
          b.h = BLUEPRINTS[b.type].h;
        }
      });
    }
    // Migrate city layout v2: snap buildings to new CITY_SLOTS positions
    if (state.buildings && state.islandLevel >= 2) {
      let claimed = new Set();
      state.buildings.forEach(b => {
        // Find the closest matching CITY_SLOT for this building type
        let bestSlot = null, bestDist = 999;
        CITY_SLOTS.forEach(s => {
          if (s.type !== b.type || s.level > state.islandLevel) return;
          if (claimed.has(s.id)) return;
          let d = Math.abs(s.x - b.x) + Math.abs(s.y - b.y);
          if (d < bestDist) { bestDist = d; bestSlot = s; }
        });
        if (bestSlot && bestDist < 300) {
          b.x = bestSlot.x; b.y = bestSlot.y;
          b.w = bestSlot.w; b.h = bestSlot.h;
          claimed.add(bestSlot.id);
        }
      });
    }
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
        if (ex * ex + ey * ey > 0.65) return false;
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
          type: saved.type || getFactionTreeTypes()[i % 3],
        };
      });
    }
    // Always use current shrine position (layout may have changed)
    state.crystalShrine = { x: WORLD.islandCX + 50, y: WORLD.islandCY - 30 };
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
    state.crystalRainDrops = (d.crystalRainDrops || []).map(d2 => ({ x: d2.x, y: d2.y, timer: d2.timer, collected: false, glow: d2.glow || 0 }));
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
      let farmCX = WORLD.islandCX - 340, farmCY = WORLD.islandCY - 5;
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
    // Restore citizens from save or init empty
    if (d.citizens && d.citizens.length > 0) {
      state.citizens = d.citizens.map(c => ({
        x: c.x, y: c.y, vx: 0, vy: 0,
        variant: c.variant, facing: c.facing,
        state: 'idle', timer: floor(random(60, 300)),
        speed: c.speed || 0.5, targetX: c.x, targetY: c.y,
      }));
    } else {
      initCitizens();
    }
    addFloatingText(width / 2, height * 0.4, 'GAME LOADED', C.crystalGlow);
  } catch(e) {
    console.error('[LOAD] Load failed:', e);
    addFloatingText(width / 2, height * 0.4, 'Load failed!', C.buildInvalid);
  }
}

// ─── SAVE EXPORT / IMPORT (debug console) ─────────────────────────────────
function exportSave() {
  let raw = localStorage.getItem(_SAVE_KEY);
  if (!raw) { console.log('[SAVE] No save to export.'); return; }
  // Decompress if needed — export always writes plain JSON
  let json = raw;
  if (typeof LZString !== 'undefined') {
    try { let dec = LZString.decompressFromUTF16(raw); if (dec) json = dec; } catch(e) {}
  }
  try { JSON.parse(json); } catch(e) { console.error('[SAVE] Current save is corrupt!'); return; }
  let blob = new Blob([json], { type: 'application/json' });
  let url = URL.createObjectURL(blob);
  let a = document.createElement('a');
  a.href = url;
  a.download = 'mare_nostrum_save_' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  console.log('[SAVE] Save exported (' + Math.round(json.length / 1024) + 'KB)');
}

function importSave(json) {
  if (typeof json !== 'string') { console.error('[SAVE] importSave expects a JSON string.'); return false; }
  try {
    let d = JSON.parse(json);
    if (!d.version || !d.day) { console.error('[SAVE] Invalid save format: missing version or day.'); return false; }
    // Backup current before import
    let existing = localStorage.getItem(_SAVE_KEY);
    if (existing) { try { localStorage.setItem(_BACKUP_KEY, existing); } catch(e) {} }
    localStorage.setItem(_SAVE_KEY, json);
    console.log('[SAVE] Save imported (v' + d.version + ', day ' + d.day + '). Call loadGame() to apply.');
    return true;
  } catch(e) {
    console.error('[SAVE] Import failed — invalid JSON:', e);
    return false;
  }
}

// ─── SAVE INDICATOR DRAWING ───────────────────────────────────────────────
function drawSaveIndicator() {
  if (_saveIndicatorTimer <= 0) return;
  _saveIndicatorTimer--;
  let alpha = _saveIndicatorTimer > 30 ? 255 : map(_saveIndicatorTimer, 0, 30, 0, 255);
  push();
  resetMatrix();
  let ix = width - 40, iy = 40;
  noStroke();
  fill(180, 180, 200, alpha);
  rect(ix - 10, iy - 12, 20, 24, 2);
  fill(60, 60, 80, alpha);
  rect(ix - 6, iy - 12, 12, 10);
  fill(220, 220, 240, alpha);
  rect(ix - 3, iy - 10, 6, 6);
  fill(60, 60, 80, alpha);
  rect(ix - 7, iy + 2, 14, 8, 1);
  pop();
}

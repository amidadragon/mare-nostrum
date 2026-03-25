// MARE NOSTRUM — Cycle 5: Bot AI Improvements
// Enhanced decision-making with personality-driven action scoring, defensive improvements,
// economic intelligence, and new task types (diplomacy, research, repair, fortify)

(function() {
  'use strict';

  // ═══ FACTION PERSONALITY PROFILES ═══
  // Define behavioral traits for each faction type
  const FACTION_PERSONALITIES = {
    'traders': { tradeScore: 3.5, buildScore: 1.5, raidScore: 0.3, diplomacyScore: 3.0, researchScore: 1.2 },
    'aggressive': { raidScore: 4.0, recruitScore: 3.5, tradeScore: 0.5, diplomacyScore: 0.8, researchScore: 0.8 },
    'balanced': { tradeScore: 1.5, raidScore: 1.5, recruitScore: 1.5, diplomacyScore: 1.5, researchScore: 1.5 },
    'raiders': { raidScore: 4.5, recruitScore: 4.0, tradeScore: 0.2, diplomacyScore: 0.5, researchScore: 0.5 },
  };

  // Get faction type — default to 'balanced'
  function getFactionType(nationKey) {
    if (typeof FACTIONS !== 'undefined' && FACTIONS[nationKey]) {
      return FACTIONS[nationKey].type || 'balanced';
    }
    return 'balanced';
  }

  // Get personality multiplier for an action type
  function getPersonalityMultiplier(nationKey, actionType) {
    let type = getFactionType(nationKey);
    let profile = FACTION_PERSONALITIES[type] || FACTION_PERSONALITIES['balanced'];

    let multipliers = {
      'trade': profile.tradeScore || 1.0,
      'market': profile.tradeScore || 1.0,
      'diplomacy': profile.diplomacyScore || 1.0,
      'alliance': profile.diplomacyScore || 1.0,
      'research': profile.researchScore || 1.0,
      'recruit': profile.recruitScore || 1.5,
      'counter_attack': profile.raidScore || 1.0,
      'raid': profile.raidScore || 1.0,
      'build': profile.buildScore || 1.0,
    };

    return multipliers[actionType] || 1.0;
  }

  // ═══ SAVE ORIGINAL METHODS ═══
  const originalScoreActions = BotAI.scoreActions;
  const originalCreateTask = BotAI.createTask;
  const originalExecuteTask = BotAI.executeTask;

  // ═══ ENHANCED ACTION SCORING ═══
  BotAI.scoreActions = function(nationKey) {
    let nation = state.nations[nationKey];
    let is = nation.islandState;
    if (!is) return [{ type: 'patrol', score: 0.1 }];

    let wood = is.wood || 0, stone = is.stone || 0, crystals = is.crystals || 0;
    let gold = is.gold || 0, level = is.islandLevel || 1;
    let harvest = is.harvest || 0;
    let expandCost = 5 + level * 8;
    let underAttack = state.invasion && state.invasion.active && state.invasion.target === nationKey;
    let actions = [];

    let phase = level < 8 ? 'early' : level < 12 ? 'mid' : 'late';
    let expandBonus = phase === 'early' ? 2.0 : 0.5;
    let militaryBonus = phase === 'mid' ? 2.0 : (phase === 'late' ? 1.5 : 0.3);

    // ─── DEFENSIVE ACTIONS ───
    if (underAttack) actions.push({ type: 'defend', score: 10.0 });
    if (underAttack && is.buildings && is.buildings.length > 0) {
      actions.push({ type: 'retreat', score: 8.0 });
    }
    if (underAttack && gold >= 20) {
      actions.push({ type: 'repair', score: 7.5 });
    }

    // ─── EXPANSION & LEVELING ───
    if (crystals >= expandCost && level < 15) actions.push({ type: 'expand', score: 3.0 + expandBonus });

    // ─── MILITARY ACTIONS ───
    let armySize = is.legia ? (is.legia.army ? is.legia.army.length : 0) : 0;
    let maxArmy = Math.min(10, 3 + Math.floor(level / 3));
    if (is.buildings && is.buildings.some(b => b.type === 'castrum') && gold >= 10 && armySize < maxArmy) {
      let recruitScore = 1.5 + militaryBonus + (underAttack ? 3.0 : 0);
      recruitScore *= getPersonalityMultiplier(nationKey, 'recruit');
      actions.push({ type: 'recruit', score: recruitScore });
    }

    // ─── RAID/COUNTER-ATTACK ───
    let alreadyRaiding = nation.raidParty && nation.raidParty.length > 0;
    if (armySize >= 5 && !alreadyRaiding && !underAttack && !nation.allied) {
      let counterScore = 1.5 + armySize * 0.1;
      counterScore *= getPersonalityMultiplier(nationKey, 'counter_attack');
      actions.push({ type: 'counter_attack', score: counterScore });
    }

    // ─── FORTIFY WHEN THREATENED ───
    if (!underAttack && armySize >= 3) {
      let enemyNearby = false;
      if (typeof state.nations === 'object') {
        for (let otherKey in state.nations) {
          if (otherKey !== nationKey) {
            let other = state.nations[otherKey];
            if (other.isleX && other.isleY && nation.isleX && nation.isleY) {
              let dist = Math.hypot(other.isleX - nation.isleX, other.isleY - nation.isleY);
              if (dist < 400 && (other.military || 0) > armySize) {
                enemyNearby = true;
                break;
              }
            }
          }
        }
      }
      if (enemyNearby && wood >= 10 && !is.buildings.some(b => b.type === 'wall')) {
        let fortifyScore = 2.5 + (other.military - armySize) * 0.1;
        actions.push({ type: 'fortify', score: fortifyScore });
      }
    }

    // ─── TRADE & MARKET ACTIONS ───
    if (is.buildings && is.buildings.some(b => b.type === 'forum' || b.type === 'market') && harvest > 2) {
      let tradeScore = 1.2 * getPersonalityMultiplier(nationKey, 'trade');
      actions.push({ type: 'trade', score: tradeScore });
    }

    // ─── ECONOMIC ACTIONS: Sell surplus for gold ───
    if (gold < 15 && harvest > 0) {
      let surplus = Math.floor(harvest * 0.3);
      if (surplus > 0) {
        let economicScore = 2.0 + (20 - gold) * 0.1;
        economicScore *= getPersonalityMultiplier(nationKey, 'trade');
        actions.push({ type: 'sell_surplus', score: economicScore });
      }
    }

    // ─── BUILD GOLD-GENERATING BUILDINGS ───
    if (gold < 20 && wood >= 10 && stone >= 5 && level >= 3) {
      let hasMarket = is.buildings && is.buildings.some(b => b.type === 'market');
      let hasForum = is.buildings && is.buildings.some(b => b.type === 'forum');
      let hasTavern = is.buildings && is.buildings.some(b => b.type === 'tavern');

      if (!hasMarket || !hasForum || !hasTavern) {
        let buildScore = 1.5 + (20 - gold) * 0.1;
        buildScore *= getPersonalityMultiplier(nationKey, 'build');
        actions.push({ type: 'build_economy', score: buildScore });
      }
    }

    // ─── STANDARD BUILD ACTIONS ───
    if (wood >= 15 && stone >= 10 && is.buildings && level >= 3) {
      let hasWall = is.buildings.some(b => b.type === 'wall');
      let hasTower = is.buildings.some(b => b.type === 'watchtower');
      let hasForge = is.buildings.some(b => b.type === 'forge');
      if (!hasWall || !hasTower || !hasForge) {
        let buildScore = 1.0 * getPersonalityMultiplier(nationKey, 'build');
        actions.push({ type: 'build', score: buildScore });
      }
    }

    // ─── DIPLOMACY ACTIONS ───
    if (level >= 5 && typeof state.nations === 'object') {
      let livingNations = Object.keys(state.nations).filter(k =>
        k !== nationKey && state.nations[k].isleX !== undefined
      );
      if (livingNations.length > 0) {
        let diplomacyScore = 1.0 * getPersonalityMultiplier(nationKey, 'diplomacy');
        if (diplomacyScore > 0.3) {
          actions.push({ type: 'diplomacy', score: diplomacyScore });
        }
      }
    }

    // ─── RESEARCH ACTIONS ───
    if (level >= 5 && is.buildings && is.buildings.some(b => b.type === 'library')) {
      let researchScore = 0.8 * getPersonalityMultiplier(nationKey, 'research');
      if (researchScore > 0.3) {
        actions.push({ type: 'research', score: researchScore });
      }
    }

    // ─── REPLANT & RESOURCE MANAGEMENT ───
    if (is.trees && is.trees.length < 5 && wood >= 3) {
      actions.push({ type: 'replant', score: 0.8 });
    }

    // ─── DEFAULT PATROL ───
    actions.push({ type: 'patrol', score: 0.1 });

    actions.sort((a, b) => b.score - a.score);
    return actions;
  };

  // ═══ EXTENDED TASK CREATION ═══
  BotAI.createTask = function(type, nationKey, nation) {
    let cx = nation.isleX, cy = nation.isleY;
    let rx = state.islandRX || 500, ry = state.islandRY || 320;

    switch (type) {
      // ─── NEW TASK TYPES ───
      case 'diplomacy': {
        // Move to center of island to send diplomatic message
        return { type, target: { x: cx, y: cy }, timer: 0 };
      }
      case 'research': {
        let lib = state.buildings ? state.buildings.find(b => b.type === 'library') : null;
        return { type, target: lib ? { x: lib.x, y: lib.y } : { x: cx, y: cy }, timer: 0 };
      }
      case 'repair': {
        // Find nearest damaged building
        let damaged = state.buildings ? state.buildings.find(b => b.hp && b.hp < b.maxHealth * 0.7) : null;
        return { type, target: damaged ? { x: damaged.x, y: damaged.y } : { x: cx, y: cy }, timer: 0 };
      }
      case 'fortify': {
        // Go near castrum to build walls
        let castrum = state.buildings ? state.buildings.find(b => b.type === 'castrum') : null;
        return { type, target: castrum ? { x: castrum.x + 50, y: castrum.y } : { x: cx, y: cy }, timer: 0 };
      }
      case 'retreat': {
        // Move to castrum area for defense
        let castrum = state.buildings ? state.buildings.find(b => b.type === 'castrum') : null;
        return { type, target: castrum ? { x: castrum.x, y: castrum.y } : { x: cx, y: cy }, timer: 0 };
      }
      case 'sell_surplus': {
        let market = state.buildings ? state.buildings.find(b => b.type === 'market' || b.type === 'forum') : null;
        return { type, target: market ? { x: market.x, y: market.y } : { x: cx, y: cy }, timer: 0 };
      }
      case 'build_economy': {
        // Random spot to build economic building
        return { type, target: { x: cx + (Math.random() - 0.5) * rx * 0.3, y: cy + (Math.random() - 0.5) * ry * 0.15 }, timer: 0 };
      }
      // ─── EXISTING TASK TYPES (delegate to original) ───
      default:
        return originalCreateTask.call(this, type, nationKey, nation);
    }
  };

  // ═══ EXTENDED TASK EXECUTION ═══
  BotAI.executeTask = function(nationKey, bot, nation, dt) {
    let task = bot.task;
    if (!task || !task.target) { bot.task = null; return; }

    let p = state.player;
    if (!p) { bot.task = null; return; }

    // Drive player via click-to-move
    let dx = task.target.x - p.x, dy = task.target.y - p.y;
    let d = Math.sqrt(dx * dx + dy * dy);

    if (d > 20) {
      p.targetX = task.target.x;
      p.targetY = task.target.y;
      return;
    }

    // Arrived at target
    p.targetX = null; p.targetY = null;
    task.timer = (task.timer || 0) + dt;

    switch (task.type) {
      case 'diplomacy':
        if (task.timer > 8) {
          this.botDiplomacy(nationKey, nation);
          bot.task = null;
        } break;

      case 'research':
        if (task.timer > 10) {
          this.botResearch(nationKey, nation);
          bot.task = null;
        } break;

      case 'repair':
        if (task.timer > 12) {
          this.botRepair(nationKey, nation);
          bot.task = null;
        } break;

      case 'fortify':
        if (task.timer > 8) {
          this.botFortify(nationKey, nation);
          bot.task = null;
        } break;

      case 'retreat':
        if (task.timer > 6) {
          this.botRetreat(nationKey, nation);
          bot.task = null;
        } break;

      case 'sell_surplus':
        if (task.timer > 6) {
          this.botSellSurplus(nationKey, nation);
          bot.task = null;
        } break;

      case 'build_economy':
        if (task.timer > 8) {
          this.botBuildEconomy(nationKey, nation, task.target);
          bot.task = null;
        } break;

      // ─── DELEGATE EXISTING TASKS ───
      default:
        originalExecuteTask.call(this, nationKey, bot, nation, dt);
    }
  };

  // ═══ NEW BOT BEHAVIOR METHODS ═══

  BotAI.botDiplomacy = function(nationKey, nation) {
    if (typeof state.nations !== 'object') return;

    let livingNations = Object.keys(state.nations).filter(k =>
      k !== nationKey && state.nations[k].isleX !== undefined
    );

    if (livingNations.length === 0) return;

    let target = state.nations[livingNations[Math.floor(Math.random() * livingNations.length)]];
    if (!target) return;

    // Random diplomatic action: alliance or trade offer
    let action = Math.random() < 0.5 ? 'alliance' : 'trade';

    // Improve relations with target
    if (!target.allies) target.allies = {};
    target.allies[nationKey] = (target.allies[nationKey] || 0) + 1;

    if (typeof addNotification === 'function') {
      let _name = typeof getNationName === 'function' ? getNationName(nationKey) : nationKey;
      let _tname = typeof getNationName === 'function' ? getNationName(target.key || 'Unknown') : 'neighbor';
      if (action === 'alliance') {
        addNotification(_name + ' proposes an alliance with ' + _tname + '!', '#88dd88');
      } else {
        addNotification(_name + ' offers trade to ' + _tname + '!', '#ddaa44');
      }
    }
  };

  BotAI.botResearch = function(nationKey, nation) {
    let is = nation.islandState;
    if (!is) return;

    // Progress tech tree or unlock new building ability
    if (!nation.researchProgress) nation.researchProgress = 0;
    nation.researchProgress += 1 + Math.floor((is.islandLevel || 1) * 0.2);

    // Occasionally unlock new techs
    if (nation.researchProgress > 50) {
      let techs = ['advanced_farming', 'metallurgy', 'shipbuilding'];
      let newTech = techs[Math.floor(Math.random() * techs.length)];
      if (!nation.techs) nation.techs = {};
      nation.techs[newTech] = true;
      nation.researchProgress = 0;

      if (typeof addNotification === 'function') {
        let _name = typeof getNationName === 'function' ? getNationName(nationKey) : nationKey;
        addNotification(_name + ' completes research: ' + newTech, '#aaccff');
      }
    }
  };

  BotAI.botRepair = function(nationKey, nation) {
    let is = nation.islandState;
    if (!is || !is.buildings) return;

    // Find most damaged building
    let damaged = is.buildings.reduce((worst, b) => {
      if (!b.hp || !b.maxHealth) return worst;
      let ratio = b.hp / b.maxHealth;
      if (!worst || ratio < (worst.hp / worst.maxHealth)) return b;
      return worst;
    }, null);

    if (damaged && damaged.hp < damaged.maxHealth) {
      let repairAmount = 25 + Math.floor((is.islandLevel || 1) * 5);
      damaged.hp = Math.min(damaged.maxHealth, damaged.hp + repairAmount);

      if (typeof addNotification === 'function') {
        let _name = typeof getNationName === 'function' ? getNationName(nationKey) : nationKey;
        addNotification(_name + ' repairs a ' + damaged.type, '#ffcc88');
      }
    }
  };

  BotAI.botFortify = function(nationKey, nation) {
    let is = nation.islandState;
    if (!is || !is.buildings) return;

    let wood = is.wood || 0, stone = is.stone || 0;
    if (wood < 10 || stone < 5) return;

    // Build wall near castrum
    let castrum = is.buildings.find(b => b.type === 'castrum');
    if (!castrum) return;

    let wallThere = is.buildings.some(b => b.type === 'wall' &&
      Math.abs(b.x - castrum.x) < 80 && Math.abs(b.y - castrum.y) < 80);

    if (!wallThere) {
      let wall = {
        type: 'wall',
        x: castrum.x + (Math.random() - 0.5) * 60,
        y: castrum.y + (Math.random() - 0.5) * 60,
        w: 30, h: 8,
        hp: 100, built: true, rot: 0, buildProgress: 0
      };

      is.wood = Math.max(0, wood - 10);
      is.stone = Math.max(0, stone - 5);

      if (typeof placeBuildingChecked === 'function') {
        placeBuildingChecked(wall);
      }

      if (typeof spawnParticles === 'function') {
        spawnParticles(wall.x, wall.y, 'build', 8);
      }
    }
  };

  BotAI.botRetreat = function(nationKey, nation) {
    let is = nation.islandState;
    if (!is || !is.citizens || is.citizens.length === 0) return;

    // Move citizens toward castrum for safety
    let castrum = is.buildings ? is.buildings.find(b => b.type === 'castrum') : null;
    if (!castrum) return;

    let retreating = is.citizens.slice(0, Math.floor(is.citizens.length * 0.3));
    retreating.forEach(c => {
      c.targetX = castrum.x + (Math.random() - 0.5) * 40;
      c.targetY = castrum.y + (Math.random() - 0.5) * 30;
      c.moveTimer = 60;
    });

    if (typeof addNotification === 'function') {
      let _name = typeof getNationName === 'function' ? getNationName(nationKey) : nationKey;
      addNotification(_name + ' retreats citizens to safety!', '#ff8844');
    }
  };

  BotAI.botSellSurplus = function(nationKey, nation) {
    let is = nation.islandState;
    if (!is) return;

    let harvest = is.harvest || 0;
    let goldGain = Math.floor(harvest * 0.4);

    if (goldGain > 0) {
      is.harvest = Math.max(0, harvest - Math.floor(harvest * 0.3));
      is.gold = (is.gold || 0) + goldGain;
      nation.gold = is.gold;

      if (typeof addNotification === 'function') {
        let _name = typeof getNationName === 'function' ? getNationName(nationKey) : nationKey;
        addNotification(_name + ' sells surplus crops for ' + goldGain + ' gold!', '#ffdd44');
      }
    }
  };

  BotAI.botBuildEconomy = function(nationKey, nation, target) {
    let is = nation.islandState;
    if (!is || !is.buildings) return;

    let wood = is.wood || 0, stone = is.stone || 0;
    if (wood < 10 || stone < 5) return;

    let _bType = 'market';
    if (!is.buildings.some(b => b.type === 'market')) _bType = 'market';
    else if (!is.buildings.some(b => b.type === 'forum')) _bType = 'forum';
    else if (!is.buildings.some(b => b.type === 'tavern')) _bType = 'tavern';

    let _bw = 24, _bh = 20;
    let _bld = { type: _bType, x: target.x, y: target.y, w: _bw, h: _bh, hp: 100, built: true, rot: 0, buildProgress: 0 };

    if (typeof placeBuildingChecked === 'function') {
      is.wood = Math.max(0, wood - 10);
      is.stone = Math.max(0, stone - 5);
      placeBuildingChecked(_bld);
    }

    if (typeof spawnParticles === 'function') spawnParticles(target.x, target.y, 'build', 6);
  };

})();

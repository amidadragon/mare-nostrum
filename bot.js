// MARE NOSTRUM — Bot AI Controller
// The bot is a synthetic player. It controls state.player via click-to-move
// and triggers the same interaction functions a human player would use.
// After swapToIsland(), state.player IS the bot's leader.

const BotAI = {
  bots: {},

  create(nationKey, cx, cy) {
    this.bots[nationKey] = {
      task: null, taskCooldown: 0,
      faction: nationKey,
      cx: cx, cy: cy,
    };
  },

  // ═══ UTILITY AI: score every action, pick the best ═══
  scoreActions(nationKey) {
    let nation = state.nations[nationKey];
    let is = nation.islandState;
    if (!is) return [{ type: 'patrol', score: 0.1 }];

    let wood = is.wood || 0, stone = is.stone || 0, crystals = is.crystals || 0;
    let gold = is.gold || 0, level = is.islandLevel || 1;
    let expandCost = 5 + level * 8;
    let underAttack = state.invasion && state.invasion.active && state.invasion.target === nationKey;
    let actions = [];

    let phase = level < 8 ? 'early' : level < 14 ? 'mid' : 'late';
    let expandBonus = phase === 'early' ? 2.0 : (phase === 'mid' ? 1.2 : 0.5);
    let militaryBonus = phase === 'mid' ? 2.0 : (phase === 'late' ? 1.5 : 0.3);

    if (underAttack) actions.push({ type: 'defend', score: 10.0 });
    if (crystals >= expandCost && level < 22) actions.push({ type: 'expand', score: 3.0 + expandBonus });

    let armySize = is.legia ? (is.legia.army ? is.legia.army.length : 0) : 0;
    let maxArmy = Math.min(10, 3 + Math.floor(level / 3));
    if (is.buildings && is.buildings.some(b => b.type === 'castrum') && gold >= 10 && armySize < maxArmy)
      actions.push({ type: 'recruit', score: 1.5 + militaryBonus + (underAttack ? 3.0 : 0) });

    let alreadyRaiding = nation.raidParty && nation.raidParty.length > 0;
    if (armySize >= 5 && !alreadyRaiding && !underAttack && !nation.allied)
      actions.push({ type: 'counter_attack', score: 1.5 + armySize * 0.1 });

    if (is.buildings && is.buildings.some(b => b.type === 'forum' || b.type === 'market') && (is.harvest || 0) > 2)
      actions.push({ type: 'trade', score: 1.2 });

    if (wood >= 15 && stone >= 10 && is.buildings && level >= 3) {
      let hasWall = is.buildings.some(b => b.type === 'wall');
      let hasTower = is.buildings.some(b => b.type === 'watchtower');
      let hasForge = is.buildings.some(b => b.type === 'forge');
      if (!hasWall || !hasTower || !hasForge)
        actions.push({ type: 'build', score: 1.0 });
    }

    if (is.trees && is.trees.length < 5 && wood >= 3)
      actions.push({ type: 'replant', score: 0.8 });

    actions.push({ type: 'patrol', score: 0.1 });
    actions.sort((a, b) => b.score - a.score);
    return actions;
  },

  // ═══ MAIN UPDATE — called inside swapToIsland context ═══
  // state.player IS the bot's leader. state.* IS the bot's island.
  update(nationKey, dt) {
    let bot = this.bots[nationKey];
    if (!bot) return;
    let nation = state.nations[nationKey];
    if (!nation || !nation.islandState) return;

    // Sync nation gold to island state
    if (nation.gold > 0 && (state.gold || 0) < nation.gold) {
      state.gold = nation.gold;
    }
    // Sync military count
    if (state.legia && state.legia.army) {
      nation.military = Math.max(nation.military || 0, state.legia.army.length);
    }

    // Auto-raid when strong enough
    let _armySz = state.legia && state.legia.army ? state.legia.army.length : 0;
    let _alreadyRaiding = nation.raidParty && nation.raidParty.length > 0;
    if (_armySz >= 4 && !_alreadyRaiding && !nation.allied && !nation.vassal && Math.random() < 0.001) {
      let _raidChance = (state._gameMode === '1v1') ? 0.5 : ((nation.reputation || 0) < -10 ? 0.3 : 0.1);
      if (Math.random() < _raidChance && typeof startNationRaid === 'function') {
        let _rName = typeof getNationName === 'function' ? getNationName(nationKey) : nationKey;
        if (typeof addNotification === 'function') addNotification(_rName + ' launches a raid!', '#ff4444');
        startNationRaid(nationKey);
        if (state.legia && state.legia.army) {
          let sent = Math.min(2, state.legia.army.length);
          state.legia.army.splice(0, sent);
          nation.military = state.legia.army.length;
        }
      }
    }

    // Task cooldown
    let _cd = (state._gameMode === '1v1') ? 5 : 10;
    bot.taskCooldown = Math.max(0, (bot.taskCooldown || 0) - dt);

    // Pick new task
    if (!bot.task && bot.taskCooldown <= 0) {
      let actions = this.scoreActions(nationKey);
      let pick = (actions.length > 1 && Math.random() < 0.2) ? 1 : 0;
      bot.task = this.createTask(actions[pick].type, nationKey, nation);
      if (!bot.task) bot.task = { type: 'patrol', target: { x: bot.cx, y: bot.cy }, timer: 0 };
      bot.taskCooldown = _cd;
    }

    // Execute current task — drive state.player via click-to-move
    if (bot.task) this.executeTask(nationKey, bot, nation, dt);
  },

  createTask(type, nationKey, nation) {
    let cx = nation.isleX, cy = nation.isleY;
    let rx = state.islandRX || 500, ry = state.islandRY || 320;
    switch (type) {
      case 'expand': {
        let shrine = state.crystalShrine;
        return { type, target: shrine ? { x: shrine.x, y: shrine.y + 15 } : { x: cx - rx * 0.7, y: cy }, timer: 0 };
      }
      case 'recruit': {
        let b = state.buildings ? state.buildings.find(b => b.type === 'castrum') : null;
        return { type, target: b ? { x: b.x, y: b.y + 20 } : { x: cx, y: cy }, timer: 0 };
      }
      case 'defend': {
        let atk = state.invasion && state.invasion.attackers ? state.invasion.attackers.find(a => a.hp > 0) : null;
        return { type, target: atk ? { x: atk.x, y: atk.y } : { x: cx, y: cy }, timer: 0 };
      }
      case 'counter_attack': return { type, target: { x: cx, y: cy }, timer: 0 };
      case 'trade': {
        let b = state.buildings ? state.buildings.find(b => b.type === 'forum' || b.type === 'market') : null;
        return { type, target: b ? { x: b.x, y: b.y } : { x: cx, y: cy }, timer: 0 };
      }
      case 'replant': return { type, target: { x: cx + (Math.random() - 0.5) * rx * 0.4, y: cy + (Math.random() - 0.5) * ry * 0.15 }, timer: 0 };
      case 'build': return { type, target: { x: cx + (Math.random() - 0.5) * rx * 0.3, y: cy + (Math.random() - 0.5) * ry * 0.15 }, timer: 0 };
      default: {
        let a = Math.random() * Math.PI * 2, r = Math.random() * 0.4 + 0.1;
        return { type: 'patrol', target: { x: cx + Math.cos(a) * rx * r * 0.6, y: cy + Math.sin(a) * ry * r * 0.25 }, timer: 0 };
      }
    }
  },

  executeTask(nationKey, bot, nation, dt) {
    let task = bot.task;
    if (!task || !task.target) { bot.task = null; return; }

    let p = state.player;
    if (!p) { bot.task = null; return; }

    // Drive player via click-to-move — same as human clicking
    let dx = task.target.x - p.x, dy = task.target.y - p.y;
    let d = Math.sqrt(dx * dx + dy * dy);

    if (d > 20) {
      // Set click-to-move target — updatePlayer() handles the movement
      p.targetX = task.target.x;
      p.targetY = task.target.y;
      return;
    }

    // Arrived at target — clear movement, execute action
    p.targetX = null; p.targetY = null;
    task.timer = (task.timer || 0) + dt;

    switch (task.type) {
      case 'expand':
        if (task.timer > 10) {
          this.botExpand(nationKey, nation);
          bot.task = null;
        } break;
      case 'recruit':
        if (task.timer > 6) {
          this.botRecruit(nationKey, nation);
          bot.task = null;
        } break;
      case 'defend':
        // Attack nearby enemies — same as space bar
        if (typeof playerAttack === 'function' && task.timer > 10) {
          playerAttack();
          task.timer = 0;
          // Retarget to next attacker
          let atk = state.invasion && state.invasion.attackers ? state.invasion.attackers.find(a => a.hp > 0) : null;
          if (atk) { task.target = { x: atk.x, y: atk.y }; }
          else { bot.task = null; }
        } break;
      case 'counter_attack':
        if (task.timer > 6) {
          if (typeof startNationRaid === 'function' && nation.raidParty && nation.raidParty.length === 0) {
            startNationRaid(nationKey);
            if (state.legia && state.legia.army) {
              let sent = Math.min(3, state.legia.army.length);
              state.legia.army.splice(0, sent);
            }
          }
          bot.task = null;
        } break;
      case 'trade':
        if (task.timer > 6) {
          this.botTrade(nationKey, nation);
          bot.task = null;
        } break;
      case 'replant':
        if (task.timer > 6) {
          this.botReplant(nationKey, nation);
          bot.task = null;
        } break;
      case 'build':
        if (task.timer > 8) {
          this.botBuild(nationKey, nation, task.target);
          bot.task = null;
        } break;
      case 'patrol':
        if (task.timer > 30) bot.task = null; break;
    }
  },

  // ═══ INTERACTION FUNCTIONS — same effects as player pressing E ═══

  botExpand(nationKey, nation) {
    let cost = 5 + (state.islandLevel || 1) * 8;
    if ((state.crystals || 0) < cost) return;
    state.crystals -= cost;
    state.islandLevel = (state.islandLevel || 1) + 1;
    state.islandRX = (state.islandRX || 500) + 30;
    state.islandRY = (state.islandRY || 320) + 20;
    if (typeof placeEraBuildings === 'function') placeEraBuildings(state.islandLevel);
    // New trees
    if (!state.trees) state.trees = [];
    for (let i = 0; i < 3; i++) {
      let a = Math.random() * Math.PI * 2, r = Math.random() * 0.3 + 0.4;
      state.trees.push({ x: nation.isleX + Math.cos(a) * state.islandRX * r * 0.7, y: nation.isleY + Math.sin(a) * state.islandRY * r * 0.3, type: 'oak', hp: 3, alive: true, health: 3, maxHealth: 3, size: 0.4 + Math.random() * 0.3, shakeTimer: 0, regrowTimer: 0 });
    }
    // New citizens
    if (!state.citizens) state.citizens = [];
    let nc = Math.min(3, Math.floor(state.islandLevel / 4));
    for (let ci = 0; ci < nc; ci++) {
      state.citizens.push({ x: nation.isleX + (Math.random() - 0.5) * 100, y: nation.isleY + (Math.random() - 0.5) * 40, speed: 0.3 + Math.random() * 0.2, targetX: nation.isleX, targetY: nation.isleY, moveTimer: 60, skin: Math.floor(Math.random() * 5), variant: Math.floor(Math.random() * 4), facing: Math.random() > 0.5 ? 1 : -1, state: 'walking', walkBobPhase: Math.random() * Math.PI * 2, tunicR: 100 + Math.floor(Math.random() * 80), tunicG: 80 + Math.floor(Math.random() * 60), tunicB: 60 + Math.floor(Math.random() * 40), activity: null, activityTimer: 0 });
    }
    if (state.pyramid) state.pyramid.level = state.islandLevel;
    if (typeof spawnParticles === 'function') spawnParticles(nation.isleX, nation.isleY, 'build', 12);
    let _name = typeof getNationName === 'function' ? getNationName(nationKey) : nationKey;
    if (typeof addNotification === 'function') addNotification(_name + ' expands to level ' + state.islandLevel + '!', '#aaddff');
  },

  botRecruit(nationKey, nation) {
    if (typeof trainUnit === 'function') {
      if (!state.legia) state.legia = { army: [], castrumLevel: 1, morale: 100, trainingQueue: 0, trainingTimer: 0, recruits: 0, maxRecruits: 10, castrumX: nation.isleX + 100, castrumY: nation.isleY + 50 };
      trainUnit('legionary');
      nation.military = state.legia.army ? state.legia.army.length : 0;
    }
    if (state.legia && state.legia.army && state.legia.army.length % 3 === 0 && typeof addNotification === 'function') {
      let _name = typeof getNationName === 'function' ? getNationName(nationKey) : nationKey;
      addNotification(_name + ' army: ' + state.legia.army.length + ' soldiers', '#cc8844');
    }
  },

  botTrade(nationKey, nation) {
    let tradeGold = 2 + Math.floor((state.islandLevel || 1) * 0.3);
    let tradeCost = Math.min(2, state.harvest || 0);
    if (tradeCost > 0) {
      state.harvest -= tradeCost;
      state.gold = (state.gold || 0) + tradeGold;
    }
    nation.gold = state.gold || 0;
  },

  botReplant(nationKey, nation) {
    if ((state.wood || 0) < 3) return;
    state.wood -= 3;
    let a = Math.random() * Math.PI * 2, r = Math.random() * 0.3 + 0.2;
    if (!state.trees) state.trees = [];
    state.trees.push({ x: nation.isleX + Math.cos(a) * (state.islandRX || 400) * r * 0.7, y: nation.isleY + Math.sin(a) * (state.islandRY || 260) * r * 0.3, type: 'oak', hp: 3, alive: true, health: 3, maxHealth: 3, size: 0.3, shakeTimer: 0, regrowTimer: 0 });
  },

  botBuild(nationKey, nation, target) {
    let _bType = 'wall';
    if (state.buildings && !state.buildings.some(b => b.type === 'watchtower')) _bType = 'watchtower';
    else if (state.buildings && !state.buildings.some(b => b.type === 'forge')) _bType = 'forge';
    else if (state.buildings && !state.buildings.some(b => b.type === 'windmill')) _bType = 'windmill';
    else _bType = ['wall', 'domus', 'well'][Math.floor(Math.random() * 3)];
    let _bw = _bType === 'wall' ? 30 : 24, _bh = _bType === 'wall' ? 8 : 20;
    let _bld = { type: _bType, x: target.x, y: target.y, w: _bw, h: _bh, hp: 100, built: true, rot: 0, buildProgress: 0 };
    if (typeof placeBuildingChecked === 'function') {
      state.wood = Math.max(0, (state.wood || 0) - 10);
      state.stone = Math.max(0, (state.stone || 0) - 5);
      placeBuildingChecked(_bld);
    }
    if (typeof spawnParticles === 'function') spawnParticles(target.x, target.y, 'build', 5);
  },

  // ═══ DRAW — renders bot leader when viewing from distance ═══
  // When camera is on the bot island, state.player draws via drawPlayer().
  // This draw() is for the distant view where we see the bot walking around.
  draw(nationKey) {
    let bot = this.bots[nationKey];
    if (!bot) return;
    let nation = state.nations[nationKey];
    if (!nation || !nation.islandState) return;
    let is = nation.islandState;
    let p = is.player;
    if (!p) return;

    let sx = w2sX(p.x), sy = w2sY(p.y);
    if (sx < -50 || sx > width + 50 || sy < -50 || sy > height + 50) return;

    let fm = (typeof FACTION_MILITARY !== 'undefined' && FACTION_MILITARY[nationKey]) ?
      FACTION_MILITARY[nationKey] : { tunic: [160, 50, 40], cape: [145, 28, 22], legs: [120, 40, 30], helm: [175, 150, 60] };
    let walking = p.moving;
    let legOff = 0, bobY = 0;
    if (walking) {
      let wf = (p.anim && p.anim.walkFrame) || 0;
      legOff = Math.sin(wf) * 2.5;
      bobY = Math.sin(wf * 1.5) * 1.5;
    }

    push(); translate(Math.floor(sx), Math.floor(sy + bobY)); noStroke();
    fill(0, 0, 0, 25); ellipse(0, 8, 14, 6);
    let fDir = (p.facing === 'left') ? -1 : 1;
    if (fDir < 0) scale(-1, 1);
    fill(fm.legs[0], fm.legs[1], fm.legs[2]); rect(-3, 2 + legOff, 3, 5, 1); rect(1, 2 - legOff, 3, 5, 1);
    fill(fm.tunic[0], fm.tunic[1], fm.tunic[2]); rect(-5, -10, 10, 14, 2);
    fill(fm.cape[0], fm.cape[1], fm.cape[2], 180); rect(2, -8, 4, 10, 1);
    fill(220, 190, 160); rect(-7, -6, 3, 6, 1); rect(4, -6, 3, 6, 1);
    fill(220, 190, 160); rect(-4, -18, 8, 8, 2);
    fill(fm.helm[0], fm.helm[1], fm.helm[2]); rect(-4, -19, 8, 3, 1); rect(-5, -17, 2, 4, 1); rect(3, -17, 2, 4, 1);
    if (p.facing !== 'up') { fill(40, 30, 20); rect(-2, -15, 2, 2); rect(2, -15, 2, 2); }
    if (fDir < 0) scale(-1, 1);

    // Task label
    if (bot.task && bot.task.type !== 'patrol') {
      let labels = { expand: 'Expanding!', recruit: 'Recruiting', defend: 'DEFENDING!', build: 'Building', trade: 'Trading', replant: 'Planting', counter_attack: 'Mustering!' };
      fill(255, 255, 255, 180); textAlign(CENTER, BOTTOM); textSize(7);
      text(labels[bot.task.type] || '', 0, -22);
    }
    let facName = (typeof FACTIONS !== 'undefined' && FACTIONS[nationKey]) ? FACTIONS[nationKey].name : nationKey;
    fill(fm.tunic[0], fm.tunic[1], fm.tunic[2], 200); textSize(8); textAlign(CENTER, BOTTOM);
    text(facName, 0, -28); textAlign(LEFT, TOP);
    pop();
  },

  initIslandResources(nationKey) {
    let nation = state.nations[nationKey];
    if (!nation || !nation.islandState) return;
    let is = nation.islandState, cx = nation.isleX, cy = nation.isleY;
    let rx = is.islandRX || 500, ry = is.islandRY || 320;
    if (!is.trees || !is.trees.length) {
      is.trees = [];
      for (let i = 0; i < 12; i++) { let a = Math.random() * Math.PI * 2, r = Math.random() * 0.45 + 0.2; is.trees.push({ x: cx + Math.cos(a) * rx * r * 0.8, y: cy + Math.sin(a) * ry * r * 0.35, type: 'oak', hp: 3 }); }
    }
    if (!is.crystalNodes || !is.crystalNodes.length) {
      is.crystalNodes = [];
      for (let i = 0; i < 5; i++) is.crystalNodes.push({ x: cx - rx * 0.7 + (Math.random() - 0.5) * 40, y: cy + (Math.random() - 0.5) * 30, charge: 50, size: 14 });
    }
    if (!is.plots || !is.plots.length) {
      is.plots = [];
      for (let i = 0; i < 6; i++) is.plots.push({ x: cx - rx * 0.4 + (i % 3) * 28, y: cy - ry * 0.05 + Math.floor(i / 3) * 28, crop: null, stage: 'empty', growTimer: 0 });
    }
  }
};

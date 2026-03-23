// MARE NOSTRUM — Bot AI (Utility AI)
// Each bot is an autonomous player that gathers resources, expands through
// the REAL progression system, and defends their island.
// NO random building placement. Bot expands → placeEraBuildings() handles layout.

const BotAI = {
  bots: {},

  create(nationKey, cx, cy) {
    this.bots[nationKey] = {
      x: cx, y: cy, facing: 'down', moving: false,
      task: null, taskCooldown: 0, speed: 4.5,
      faction: nationKey, walkFrame: 0,
    };
  },

  // ═══ AUTONOMOUS WORKERS: parallel resource gathering ═══
  updateWorkers(nationKey, is, nation, dt) {
    if (!is || !is.workers) return;
    let cx = nation.isleX, cy = nation.isleY;
    for (let w of is.workers) {
      // Movement toward target
      let dx = (w.targetX || w.x) - w.x, dy = (w.targetY || w.y) - w.y;
      let d = Math.sqrt(dx * dx + dy * dy);
      if (d > 8 && w.state !== 'working') {
        w.x += (dx / d) * (w.speed || 0.5) * dt * 2;
        w.y += (dy / d) * (w.speed || 0.5) * dt * 2;
        w.state = 'moving';
        return; // one worker per frame to avoid swap conflicts
      }
      // At target — perform action
      w.timer = (w.timer || 0) + dt;
      if (w.state === 'moving') { w.state = 'working'; w.timer = 0; }
      if (w.state === 'idle' && w.timer > 30) {
        // Find new target based on role
        this.assignWorkerTarget(w, is, cx, cy);
        w.timer = 0;
      }
      if (w.state === 'working' && w.timer > 20) {
        // Execute action via swapToIsland
        this.executeWorkerAction(w, is, nation);
        w.state = 'idle'; w.timer = 0;
        // Assign next target immediately
        this.assignWorkerTarget(w, is, cx, cy);
      }
    }
  },

  assignWorkerTarget(w, is, cx, cy) {
    let rx = is.islandRX || 500, ry = is.islandRY || 320;
    switch (w.role) {
      case 'cutter': {
        let t = is.trees && is.trees.length > 0 ? is.trees.find(t => t.alive !== false) : null;
        if (t) { w.targetX = t.x; w.targetY = t.y; w.state = 'moving'; }
        else { w.targetX = cx + (Math.random() - 0.5) * rx * 0.3; w.targetY = cy + (Math.random() - 0.5) * ry * 0.1; w.state = 'idle'; }
      } break;
      case 'quarrier': {
        let r = is.resources ? is.resources.find(r => r.type === 'stone' && r.active !== false) : null;
        if (r) { w.targetX = r.x; w.targetY = r.y; w.state = 'moving'; }
        else { w.targetX = cx + (Math.random() - 0.5) * rx * 0.3; w.targetY = cy + (Math.random() - 0.5) * ry * 0.1; w.state = 'idle'; }
      } break;
      case 'priestess': {
        let n = is.crystalNodes ? is.crystalNodes.find(n => (n.charge || 0) > 10) : null;
        if (n) { w.targetX = n.x; w.targetY = n.y; w.state = 'moving'; }
        else { w.targetX = cx - rx * 0.5; w.targetY = cy; w.state = 'idle'; }
      } break;
      case 'farmer': {
        // Prioritize harvesting ready plots, then planting empty ones
        let ready = is.plots ? is.plots.find(p => p.stage === 'ready') : null;
        if (ready) { w.targetX = ready.x; w.targetY = ready.y; w._farmAction = 'harvest'; w.state = 'moving'; break; }
        let empty = is.plots ? is.plots.find(p => !p.crop) : null;
        if (empty && (is.seeds || 0) > 0) { w.targetX = empty.x; w.targetY = empty.y; w._farmAction = 'plant'; w.state = 'moving'; break; }
        w.targetX = cx + (Math.random() - 0.5) * rx * 0.2; w.targetY = cy + (Math.random() - 0.5) * ry * 0.1; w.state = 'idle';
      } break;
    }
  },

  executeWorkerAction(w, is, nation) {
    if (typeof swapToIsland !== 'function') return;
    swapToIsland(is, nation.isleX, nation.isleY);
    switch (w.role) {
      case 'cutter': {
        let tree = state.trees ? state.trees.find(t => Math.abs(t.x - w.x) < 25 && Math.abs(t.y - w.y) < 25 && t.alive !== false) : null;
        if (tree && typeof chopTree === 'function') {
          chopTree(tree);
          if (typeof spawnParticles === 'function') spawnParticles(tree.x, tree.y, 'collect', 3);
        }
      } break;
      case 'quarrier': {
        let r = state.resources ? state.resources.find(r => r.type === 'stone' && r.active !== false && Math.abs(r.x - w.x) < 25 && Math.abs(r.y - w.y) < 25) : null;
        if (r) { r.active = false; r.respawnTimer = 600; state.stone = (state.stone || 0) + 1; }
        else { state.stone = (state.stone || 0) + 1; } // quarry from terrain
        if (typeof spawnParticles === 'function') spawnParticles(w.x, w.y, 'collect', 2);
      } break;
      case 'priestess': {
        let node = state.crystalNodes ? state.crystalNodes.find(n => Math.abs(n.x - w.x) < 25 && Math.abs(n.y - w.y) < 25 && (n.charge || 0) > 0) : null;
        if (node) {
          let gain = (node.charge || 0) >= 30 ? 2 : 1;
          state.crystals = (state.crystals || 0) + gain;
          node.charge = 0; node.respawnTimer = 800;
          if (typeof spawnParticles === 'function') spawnParticles(node.x, node.y, 'crystal', 3);
        }
      } break;
      case 'farmer': {
        if (w._farmAction === 'harvest') {
          let plot = state.plots ? state.plots.find(p => p.stage === 'ready' && Math.abs(p.x - w.x) < 25 && Math.abs(p.y - w.y) < 25) : null;
          if (plot) {
            let gain = 1 + Math.floor((state.islandLevel || 1) / 5);
            state.harvest = (state.harvest || 0) + gain;
            state.seeds = (state.seeds || 0) + 1;
            plot.stage = 'empty'; plot.crop = null; plot.growTimer = 0;
            if (typeof spawnParticles === 'function') spawnParticles(plot.x, plot.y, 'harvest', 3);
          }
        } else if (w._farmAction === 'plant') {
          let plot = state.plots ? state.plots.find(p => !p.crop && Math.abs(p.x - w.x) < 25 && Math.abs(p.y - w.y) < 25) : null;
          if (plot && (state.seeds || 0) > 0) {
            state.seeds--;
            plot.crop = 'grain'; plot.stage = 'growing'; plot.growTimer = 0;
          }
        }
      } break;
    }
    swapBack();
    // Sync nation gold after any action
    nation.gold = is.gold || 0;
  },

  // ═══ UTILITY AI: strategy only — workers handle resource gathering ═══
  scoreActions(nationKey) {
    let nation = state.nations[nationKey];
    let is = nation.islandState;
    if (!is) return [{ type: 'patrol', score: 0.1 }];

    let wood = is.wood || 0, stone = is.stone || 0, crystals = is.crystals || 0;
    let gold = is.gold || 0, level = is.islandLevel || 1;
    let expandCost = 5 + level * 8;
    let underAttack = state.invasion && state.invasion.active && state.invasion.target === nationKey;
    let actions = [];

    // Phase-based strategy: early=expand, mid=military, late=dominate
    let phase = level < 8 ? 'early' : level < 12 ? 'mid' : 'late';
    let expandBonus = phase === 'early' ? 2.0 : 0.5;
    let militaryBonus = phase === 'mid' ? 2.0 : (phase === 'late' ? 1.5 : 0.3);

    if (underAttack) actions.push({ type: 'defend', score: 10.0 });
    // EXPAND: highest priority in early game
    if (crystals >= expandCost && level < 15) actions.push({ type: 'expand', score: 3.0 + expandBonus });
    // RECRUIT: high priority in mid/late game
    let armySize = is.legia ? (is.legia.army ? is.legia.army.length : 0) : 0;
    let maxArmy = Math.min(10, 3 + Math.floor(level / 3));
    if (is.buildings && is.buildings.some(b => b.type === 'castrum') && gold >= 10 && armySize < maxArmy)
      actions.push({ type: 'recruit', score: 1.5 + militaryBonus + (underAttack ? 3.0 : 0) });
    // Counter-attack: bot sends raiders when military is strong enough
    let alreadyRaiding = nation.raidParty && nation.raidParty.length > 0;
    if (armySize >= 5 && !alreadyRaiding && !underAttack && !nation.allied)
      actions.push({ type: 'counter_attack', score: 1.5 + armySize * 0.1 });
    // Trade: bots with market/forum generate gold
    if (is.buildings && is.buildings.some(b => b.type === 'forum' || b.type === 'market') && (is.harvest || 0) > 2)
      actions.push({ type: 'trade', score: 1.2 });
    // Build: place strategic buildings when resources available
    if (wood >= 15 && stone >= 10 && is.buildings && level >= 3) {
      let hasWall = is.buildings.some(b => b.type === 'wall');
      let hasTower = is.buildings.some(b => b.type === 'watchtower');
      let hasForge = is.buildings.some(b => b.type === 'forge');
      if (!hasWall || !hasTower || !hasForge)
        actions.push({ type: 'build', score: 1.0 });
    }
    // Replant trees when workers have chopped too many
    if (is.trees && is.trees.length < 5 && wood >= 3)
      actions.push({ type: 'replant', score: 0.8 });
    actions.push({ type: 'patrol', score: 0.1 });

    actions.sort((a, b) => b.score - a.score);
    return actions;
  },

  update(nationKey, dt) {
    let bot = this.bots[nationKey];
    if (!bot) return;
    let nation = state.nations[nationKey];
    if (!nation || !nation.islandState) return;
    // Sync nation gold to island state so bot can spend it
    if (nation.gold > 0 && (nation.islandState.gold || 0) < nation.gold) {
      nation.islandState.gold = nation.gold;
    }
    // Sync military count from island army
    if (nation.islandState.legia && nation.islandState.legia.army) {
      nation.military = Math.max(nation.military || 0, nation.islandState.legia.army.length);
    }
    // Slowly recharge crystal nodes (1 charge per 200 frames)
    if (nation.islandState.crystalNodes && dt > 0) {
      for (let cn of nation.islandState.crystalNodes) {
        if ((cn.charge || 0) < 50) cn.charge = Math.min(50, (cn.charge || 0) + 0.3);
      }
    }
    // Crop growth only: plots grow naturally (same rate as player)
    let is = nation.islandState;
    if (is && is.plots) {
      for (let p of is.plots) {
        if (p.crop && p.stage === 'growing') {
          p.growTimer = (p.growTimer || 0) + 0.3;
          if (p.growTimer >= 200) p.stage = 'ready';
        }
      }
    }
    // Update autonomous workers (parallel economy)
    this.updateWorkers(nationKey, is, nation, dt);
    // Auto-raid: launch attack on player when strong enough
    let _armySz = is && is.legia && is.legia.army ? is.legia.army.length : 0;
    let _alreadyRaiding = nation.raidParty && nation.raidParty.length > 0;
    let _canRaid = _armySz >= 4 && !_alreadyRaiding && !nation.allied && !nation.vassal;
    if (_canRaid && Math.random() < 0.001) {
      // Aggression check: raid more in 1v1, or when reputation is low
      let _raidChance = (state._gameMode === '1v1') ? 0.5 : ((nation.reputation || 0) < -10 ? 0.3 : 0.1);
      if (Math.random() < _raidChance && typeof startNationRaid === 'function') {
        let _rName = typeof getNationName === 'function' ? getNationName(nationKey) : nationKey;
        if (typeof addNotification === 'function') addNotification(_rName + ' launches a raid on your shores!', '#ff4444');
        if (typeof snd !== 'undefined' && snd && snd.playSFX) snd.playSFX('war_horn');
        startNationRaid(nationKey);
        // Consume army units for the raid
        if (is.legia && is.legia.army) {
          let sent = Math.min(2, is.legia.army.length);
          is.legia.army.splice(0, sent);
          nation.military = is.legia.army.length;
        }
      }
    }
    // Track player level for race comparisons
    state._realPlayerLevel = state.islandLevel;
    // Faster AI in 1v1 mode (cooldown 8 vs 20)
    let _cd = (state._gameMode === '1v1') ? 5 : 10;
    bot.taskCooldown = Math.max(0, (bot.taskCooldown || 0) - dt);
    if (!bot.task && bot.taskCooldown <= 0) {
      let actions = this.scoreActions(nationKey);
      // In 1v1, sometimes pick 2nd best action for variety
      let pick = (state._gameMode === '1v1' && actions.length > 1 && Math.random() < 0.2) ? 1 : 0;
      bot.task = this.createTask(actions[pick].type, nationKey, nation);
      if (!bot.task) bot.task = { type: 'patrol', target: { x: nation.isleX, y: nation.isleY }, timer: 0 };
      bot.taskCooldown = _cd;
    }
    if (bot.task) this.executeTask(nationKey, bot, nation, dt);

    // Festival system: celebrate milestones
    if (!nation._festivalTimer) nation._festivalTimer = 0;
    nation._festivalTimer--;
    if (nation._festivalTimer <= 0) {
      nation._festivalTimer = 1800 + Math.floor(Math.random() * 600); // every ~30-40 game-seconds
      let is = nation.islandState;
      if (is && is.islandLevel >= 5) {
        nation._festival = { active: true, timer: 180, type: ['harvest', 'solstice', 'victory', 'prayer'][Math.floor(Math.random() * 4)] };
        let _name = typeof getNationName === 'function' ? getNationName(nationKey) : nationKey;
        let _fNames = { harvest: 'Harvest Festival', solstice: 'Solstice Celebration', victory: 'Victory Games', prayer: 'Day of Prayer' };
        if (typeof addNotification === 'function' && Math.random() < 0.3) // 30% chance to notify (not spammy)
          addNotification(_name + ' celebrates ' + (_fNames[nation._festival.type] || 'a festival') + '!', '#ffcc44');
        // Festival is celebration only — no free resources
      }
    }
    // Draw festival effects (firework particles near temple)
    if (nation._festival && nation._festival.active) {
      nation._festival.timer--;
      if (nation._festival.timer <= 0) { nation._festival.active = false; }
      else if (nation._festival.timer % 20 === 0 && typeof spawnParticles === 'function') {
        spawnParticles(nation.isleX + (Math.random()-0.5)*60, nation.isleY - 20, 'divine', 3);
      }
    }
  },

  createTask(type, nationKey, nation) {
    let is = nation.islandState, cx = nation.isleX, cy = nation.isleY;
    let rx = is.islandRX || 500, ry = is.islandRY || 320;
    switch (type) {
      case 'expand': return { type, target: {x: cx-rx*0.7, y: cy}, timer: 0 };
      case 'recruit': { let b = is.buildings ? is.buildings.find(b => b.type==='castrum') : null; return { type, target: b ? {x:b.x,y:b.y} : {x:cx,y:cy}, timer: 0 }; }
      case 'defend': { let a = state.invasion && state.invasion.attackers ? state.invasion.attackers.find(a => a.hp>0) : null; return { type, target: a ? {x:a.x,y:a.y} : {x:cx,y:cy}, timer: 0 }; }
      case 'counter_attack': return { type, target: {x: cx, y: cy}, timer: 0 };
      case 'trade': { let b = is.buildings ? is.buildings.find(b => b.type==='forum'||b.type==='market') : null; return { type, target: b ? {x:b.x,y:b.y} : {x:cx,y:cy}, timer: 0 }; }
      case 'replant': return { type, target: {x: cx+(Math.random()-0.5)*rx*0.4, y: cy+(Math.random()-0.5)*ry*0.15}, timer: 0 };
      case 'build': return { type, target: {x: cx + (Math.random()-0.5)*rx*0.3, y: cy + (Math.random()-0.5)*ry*0.15}, timer: 0 };
      default: { let a=Math.random()*Math.PI*2, r=Math.random()*0.4+0.1; return { type:'patrol', target: {x:cx+Math.cos(a)*rx*r*0.6, y:cy+Math.sin(a)*ry*r*0.25}, timer: 0 }; }
    }
  },

  executeTask(nationKey, bot, nation, dt) {
    let task = bot.task, is = nation.islandState;
    if (!task || !task.target) { bot.task = null; return; }
    let dx = task.target.x - bot.x, dy = task.target.y - bot.y;
    let d = Math.sqrt(dx*dx + dy*dy);

    if (d > 12) {
      bot.x += (dx/d) * bot.speed * dt;
      bot.y += (dy/d) * bot.speed * dt;
      bot.moving = true;
      bot.facing = Math.abs(dx) > Math.abs(dy) ? (dx>0?'right':'left') : (dy>0?'down':'up');
      bot.walkFrame += dt * 0.15;
      return;
    }
    bot.moving = false;
    task.timer += dt;

    switch (task.type) {
      case 'expand':
        if (task.timer > 14) {
          // REAL expansion via state swap -- placeEraBuildings handles building layout
          if (typeof swapToIsland === 'function') {
            swapToIsland(is, nation.isleX, nation.isleY);
            let cost = 5 + (state.islandLevel||1) * 8;
            if ((state.crystals||0) >= cost) {
              state.crystals -= cost;
              state.islandLevel = (state.islandLevel||1) + 1;
              state.islandRX = (state.islandRX||500) + 30;
              state.islandRY = (state.islandRY||320) + 20;
              if (typeof placeEraBuildings === 'function') placeEraBuildings(state.islandLevel);
              if (!state.trees) state.trees = [];
              for (let i = 0; i < 3; i++) {
                let a = Math.random()*Math.PI*2, r = Math.random()*0.3+0.4;
                state.trees.push({ x: nation.isleX+Math.cos(a)*state.islandRX*r*0.7, y: nation.isleY+Math.sin(a)*state.islandRY*r*0.3, type: 'oak', hp: 3, alive: true, health: 3, maxHealth: 3, size: 0.4 + Math.random()*0.3, shakeTimer: 0, regrowTimer: 0 });
              }
              // Spawn new citizens with expansion
              if (!state.citizens) state.citizens = [];
              let _newCitz = Math.min(3, Math.floor(state.islandLevel / 4));
              for (let ci = 0; ci < _newCitz; ci++) {
                state.citizens.push({ x: nation.isleX + (Math.random()-0.5)*100, y: nation.isleY + (Math.random()-0.5)*40, speed: 0.3 + Math.random()*0.2, targetX: nation.isleX, targetY: nation.isleY, moveTimer: 60, skin: Math.floor(Math.random()*5), variant: Math.floor(Math.random()*4), facing: Math.random()>0.5?1:-1, state: 'walking', walkBobPhase: Math.random()*Math.PI*2, tunicR: 100+Math.floor(Math.random()*80), tunicG: 80+Math.floor(Math.random()*60), tunicB: 60+Math.floor(Math.random()*40), activity: null, activityTimer: 0 });
              }
              // Update pyramid level
              if (state.pyramid) state.pyramid.level = state.islandLevel;
              // Construction particles
              if (typeof spawnParticles === 'function') spawnParticles(nation.isleX, nation.isleY, 'build', 12);
              let _name = typeof getNationName === 'function' ? getNationName(nationKey) : nationKey;
              if (typeof addNotification === 'function') {
                let _ahead = state.islandLevel > (nation._prevPlayerLevel || 1);
                let _raceMsg = (state._gameMode === '1v1') ? (_ahead ? ' — AHEAD of you!' : '') : '';
                addNotification(_name + ' expands to level ' + state.islandLevel + '!' + _raceMsg, _ahead ? '#ff8844' : '#aaddff');
                if (_ahead && state._gameMode === '1v1' && typeof snd !== 'undefined' && snd && snd.playSFX) snd.playSFX('war_horn');
              }
              // Track player level for comparison (read from real state after swap)
              nation._prevPlayerLevel = state._realPlayerLevel;
            }
            swapBack();
          }
          bot.task = null;
        } break;
      case 'recruit':
        if (task.timer > 8) {
          // Use REAL trainUnit() via state swap
          if (typeof swapToIsland === 'function' && typeof trainUnit === 'function') {
            swapToIsland(is, nation.isleX, nation.isleY);
            if (!state.legia) state.legia = { army: [], castrumLevel: 1, morale: 100, trainingQueue: 0, trainingTimer: 0, recruits: 0, maxRecruits: 10, castrumX: nation.isleX + 100, castrumY: nation.isleY + 50 };
            trainUnit('legionary');
            nation.military = state.legia.army ? state.legia.army.length : 0;
            swapBack();
          }
          if (is.legia && is.legia.army && is.legia.army.length % 3 === 0 && typeof addNotification === 'function') {
            let _name = typeof getNationName === 'function' ? getNationName(nationKey) : nationKey;
            addNotification(_name + ' army grows to ' + (is.legia.army ? is.legia.army.length : 0) + ' soldiers', '#cc8844');
          }
          bot.task = null;
        } break;
      case 'defend':
        if (state.invasion && state.invasion.active && state.invasion.target === nationKey) {
          let atk = state.invasion.attackers.find(a => a.hp > 0);
          if (atk) {
            let dd = Math.sqrt((bot.x-atk.x)*(bot.x-atk.x)+(bot.y-atk.y)*(bot.y-atk.y));
            if (dd < 25 && task.timer > 15) {
              atk.hp -= 8; task.timer = 0;
              if (typeof addFloatingText==='function') addFloatingText(w2sX(atk.x), w2sY(atk.y)-15, '-8', '#ff8800');
              if (atk.hp <= 0) { atk.state = 'dead'; atk.deathTimer = 0; }
            } else if (dd > 25) { bot.x += ((atk.x-bot.x)/dd)*3; bot.y += ((atk.y-bot.y)/dd)*3; bot.moving = true; }
          } else { bot.task = null; }
        } else { bot.task = null; }
        break;
      case 'counter_attack':
        // Warning at 20 frames (halfway through preparation)
        if (task.timer > 8 && !task._warned) {
          task._warned = true;
          let _wName = typeof getNationName === 'function' ? getNationName(nationKey) : nationKey;
          if (typeof addNotification === 'function') addNotification(_wName + ' is mustering forces for an attack!', '#ff8844');
          if (typeof snd !== 'undefined' && snd && snd.playSFX) snd.playSFX('war_horn');
        }
        if (task.timer > 8) {
          // Launch raid on player using existing nation raid system
          if (typeof startNationRaid === 'function' && nation.raidParty && nation.raidParty.length === 0) {
            startNationRaid(nationKey);
            // Consume some army units
            if (is.legia && is.legia.army) {
              let sent = Math.min(3, is.legia.army.length);
              is.legia.army.splice(0, sent);
            }
          }
          bot.task = null;
        } break;
      case 'trade':
        if (task.timer > 6) {
          if (typeof swapToIsland === 'function') {
            swapToIsland(is, nation.isleX, nation.isleY);
            // Trade generates gold based on market/forum level — requires harvest as trade goods
            let tradeGold = 2 + Math.floor((state.islandLevel || 1) * 0.3);
            let tradeCost = Math.min(2, state.harvest || 0); // spend harvest as trade goods
            if (tradeCost > 0) {
              state.harvest -= tradeCost;
              state.gold = (state.gold || 0) + tradeGold;
            }
            swapBack();
          }
          nation.gold = is.gold || 0; // sync
          if (!nation._tradeNotified && typeof addNotification === 'function') {
            let _name = typeof getNationName === 'function' ? getNationName(nationKey) : nationKey;
            addNotification(_name + ' establishes trade routes', '#ddcc44');
            nation._tradeNotified = true;
          }
          bot.task = null;
        } break;
      case 'replant':
        if (task.timer > 8) {
          if (typeof swapToIsland === 'function') {
            swapToIsland(is, nation.isleX, nation.isleY);
            if ((state.wood || 0) >= 3) {
              state.wood -= 3;
              let a = Math.random() * Math.PI * 2, r = Math.random() * 0.3 + 0.2;
              if (!state.trees) state.trees = [];
              state.trees.push({ x: nation.isleX + Math.cos(a) * (state.islandRX||400) * r * 0.7, y: nation.isleY + Math.sin(a) * (state.islandRY||260) * r * 0.3, type: 'oak', hp: 3, alive: true, health: 3, maxHealth: 3, size: 0.3, shakeTimer: 0, regrowTimer: 0 });
              if (typeof addFloatingText === 'function') addFloatingText(w2sX(bot.x), w2sY(bot.y) - 20, 'Planted tree', '#66aa44');
            }
            swapBack();
          }
          bot.task = null;
        } break;
      case 'build':
        if (task.timer > 10) {
          // Use REAL placeBuildingChecked() via state swap
          let _bType = 'wall';
          if (!is.buildings.some(b => b.type === 'watchtower')) _bType = 'watchtower';
          else if (!is.buildings.some(b => b.type === 'forge')) _bType = 'forge';
          else if (!is.buildings.some(b => b.type === 'windmill')) _bType = 'windmill';
          else _bType = ['wall', 'domus', 'well'][Math.floor(Math.random() * 3)];
          let _bw = _bType === 'wall' ? 30 : 24, _bh = _bType === 'wall' ? 8 : 20;
          let _bld = { type: _bType, x: task.target.x, y: task.target.y, w: _bw, h: _bh, hp: 100, built: true, rot: 0, buildProgress: 0 };
          if (typeof swapToIsland === 'function' && typeof placeBuildingChecked === 'function') {
            swapToIsland(is, nation.isleX, nation.isleY);
            state.wood = Math.max(0, (state.wood||0) - 10);
            state.stone = Math.max(0, (state.stone||0) - 5);
            placeBuildingChecked(_bld);
            swapBack();
          }
          if (typeof addFloatingText === 'function') addFloatingText(w2sX(bot.x), w2sY(bot.y) - 20, 'Built ' + _bType, '#aaddff');
          if (typeof spawnParticles === 'function') spawnParticles(task.target.x, task.target.y, 'build', 5);
          bot.task = null;
        } break;
      case 'patrol':
        if (task.timer > 40) bot.task = null; break;
    }
  },

  draw(nationKey) {
    let bot = this.bots[nationKey];
    if (!bot) return;
    let sx = w2sX(bot.x), sy = w2sY(bot.y);
    if (sx < -50 || sx > width+50 || sy < -50 || sy > height+50) return;

    let fm = (typeof FACTION_MILITARY!=='undefined' && FACTION_MILITARY[nationKey]) ?
      FACTION_MILITARY[nationKey] : { tunic:[160,50,40], cape:[145,28,22], legs:[120,40,30], helm:[175,150,60] };
    let legOff = 0, bobY = 0;
    if (bot.moving) { legOff = Math.sin(bot.walkFrame)*2.5; bobY = Math.sin(bot.walkFrame*1.5)*1.5; }

    push(); translate(Math.floor(sx), Math.floor(sy+bobY)); noStroke();
    fill(0,0,0,25); ellipse(0,8,14,6);
    let fDir = bot.facing==='left' ? -1 : 1;
    if (fDir<0) scale(-1,1);
    fill(fm.legs[0],fm.legs[1],fm.legs[2]); rect(-3,2+legOff,3,5,1); rect(1,2-legOff,3,5,1);
    fill(fm.tunic[0],fm.tunic[1],fm.tunic[2]); rect(-5,-10,10,14,2);
    fill(fm.cape[0],fm.cape[1],fm.cape[2],180); rect(2,-8,4,10,1);
    fill(220,190,160); rect(-7,-6,3,6,1); rect(4,-6,3,6,1);
    fill(220,190,160); rect(-4,-18,8,8,2);
    fill(fm.helm[0],fm.helm[1],fm.helm[2]); rect(-4,-19,8,3,1); rect(-5,-17,2,4,1); rect(3,-17,2,4,1);
    if (bot.facing!=='up') { fill(40,30,20); rect(-2,-15,2,2); rect(2,-15,2,2); }
    if (fDir<0) scale(-1,1);

    if (bot.task && bot.task.type !== 'patrol') {
      let labels = { expand:'Expanding!', recruit:'Recruiting', defend:'DEFENDING!', build:'Building', trade:'Trading', replant:'Planting', counter_attack:'Mustering!' };
      fill(255,255,255,180); textAlign(CENTER,BOTTOM); textSize(7);
      text(labels[bot.task.type]||'', 0, -22);
    }
    let facName = (typeof FACTIONS!=='undefined' && FACTIONS[nationKey]) ? FACTIONS[nationKey].name : nationKey;
    fill(fm.tunic[0],fm.tunic[1],fm.tunic[2],200); textSize(8); textAlign(CENTER,BOTTOM);
    text(facName, 0, -28); textAlign(LEFT,TOP);
    pop();
  },

  initIslandResources(nationKey) {
    let nation = state.nations[nationKey];
    if (!nation || !nation.islandState) return;
    let is = nation.islandState, cx = nation.isleX, cy = nation.isleY;
    let rx = is.islandRX||500, ry = is.islandRY||320;
    if (!is.trees || !is.trees.length) {
      is.trees = [];
      for (let i = 0; i < 12; i++) { let a=Math.random()*Math.PI*2, r=Math.random()*0.45+0.2; is.trees.push({x:cx+Math.cos(a)*rx*r*0.8, y:cy+Math.sin(a)*ry*r*0.35, type:'oak', hp:3}); }
    }
    if (!is.crystalNodes || !is.crystalNodes.length) {
      is.crystalNodes = [];
      for (let i = 0; i < 5; i++) is.crystalNodes.push({x:cx-rx*0.7+(Math.random()-0.5)*40, y:cy+(Math.random()-0.5)*30, charge:50, size:14});
    }
    if (!is.plots || !is.plots.length) {
      is.plots = [];
      for (let i = 0; i < 6; i++) is.plots.push({x:cx-rx*0.4+(i%3)*28, y:cy-ry*0.05+Math.floor(i/3)*28, crop:null, stage:'empty', growTimer:0});
    }
  }
};

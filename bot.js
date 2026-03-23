// MARE NOSTRUM — Bot AI Character System
// Each bot is a visible character on their island that plays the game autonomously.
// Uses the same game functions as the player via state swapping.

const BotAI = {
  bots: {}, // key -> bot data

  // Create a bot for a nation
  create(nationKey, cx, cy) {
    this.bots[nationKey] = {
      x: cx,
      y: cy,
      facing: 'down',
      moving: false,
      task: null,        // current task: {type, target:{x,y}, timer, data}
      taskCooldown: 0,   // frames before picking next task
      speed: 1.5,
      faction: nationKey,
      // Walk animation
      walkFrame: 0,
      // Stats
      chopCount: 0,
      buildCount: 0,
    };
  },

  // Main update -- call once per frame for each bot
  update(nationKey, dt) {
    let bot = this.bots[nationKey];
    if (!bot) return;
    let nation = state.nations[nationKey];
    if (!nation || !nation.islandState) return;

    bot.taskCooldown -= dt;

    // If no task or task complete, pick a new one
    if (!bot.task && bot.taskCooldown <= 0) {
      bot.task = this.pickTask(nationKey, bot, nation);
      bot.taskCooldown = 30; // minimum 0.5s between task picks
    }

    if (bot.task) {
      this.executeTask(nationKey, bot, nation, dt);
    }
  },

  // Priority-based task selection
  pickTask(nationKey, bot, nation) {
    let is = nation.islandState;
    let cx = nation.isleX, cy = nation.isleY;
    let rx = is.islandRX || 500, ry = is.islandRY || 320;

    // Priority 1: Need wood (< 15)
    if ((is.wood || 0) < 15 && is.trees && is.trees.length > 0) {
      let tree = is.trees[floor(random(is.trees.length))];
      return { type: 'chop', target: { x: tree.x, y: tree.y }, timer: 0, treeIndex: is.trees.indexOf(tree) };
    }

    // Priority 2: Need food (< 10 harvest)
    if ((is.harvest || 0) < 10 && is.plots) {
      // Find a ready plot or empty plot
      let readyPlot = is.plots.find(p => p.stage === 'ready');
      if (readyPlot) {
        return { type: 'harvest', target: { x: readyPlot.x, y: readyPlot.y }, timer: 0 };
      }
      let emptyPlot = is.plots.find(p => !p.crop);
      if (emptyPlot) {
        return { type: 'plant', target: { x: emptyPlot.x, y: emptyPlot.y }, timer: 0 };
      }
    }

    // Priority 3: Mine crystals (< 10)
    if ((is.crystals || 0) < 10 && is.crystalNodes && is.crystalNodes.length > 0) {
      let node = is.crystalNodes.find(n => n.charge > 0);
      if (node) {
        return { type: 'mine', target: { x: node.x, y: node.y }, timer: 0 };
      }
    }

    // Priority 4: Build something (if can afford and < 20 buildings)
    if ((is.wood || 0) >= 10 && (is.stone || 0) >= 5 && is.buildings.length < 20) {
      let ang = random(TWO_PI), rd = random(0.2, 0.5);
      let bx = cx + cos(ang) * rx * rd * 0.8;
      let by = cy + sin(ang) * ry * rd * 0.35;
      return { type: 'build', target: { x: bx, y: by }, timer: 0 };
    }

    // Priority 5: Patrol (walk around randomly)
    let ang = random(TWO_PI), rd = random(0.2, 0.6);
    let px = cx + cos(ang) * rx * rd * 0.7;
    let py = cy + sin(ang) * ry * rd * 0.3;
    return { type: 'patrol', target: { x: px, y: py }, timer: 0 };
  },

  // Execute current task
  executeTask(nationKey, bot, nation, dt) {
    let task = bot.task;
    let tx = task.target.x, ty = task.target.y;
    let dx = tx - bot.x, dy = ty - bot.y;
    let dist = Math.sqrt(dx * dx + dy * dy);

    // Walk toward target
    if (dist > 15) {
      let spd = bot.speed * dt;
      bot.x += (dx / dist) * spd;
      bot.y += (dy / dist) * spd;
      bot.moving = true;
      bot.facing = abs(dx) > abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      bot.walkFrame += dt * 0.15;
      return;
    }

    // Arrived at target -- perform action
    bot.moving = false;
    task.timer += dt;

    let is = nation.islandState;

    if (task.type === 'chop' && task.timer > 30) {
      // Chop tree: add wood, remove tree
      is.wood = (is.wood || 0) + 3;
      if (is.trees && task.treeIndex >= 0 && task.treeIndex < is.trees.length) {
        is.trees.splice(task.treeIndex, 1);
      }
      bot.chopCount++;
      bot.task = null;
    }
    else if (task.type === 'mine' && task.timer > 40) {
      is.crystals = (is.crystals || 0) + 2;
      // Deplete node
      let node = is.crystalNodes ? is.crystalNodes.find(n => n.charge > 0) : null;
      if (node) node.charge = 0;
      bot.task = null;
    }
    else if (task.type === 'harvest' && task.timer > 20) {
      is.harvest = (is.harvest || 0) + 3;
      let plot = is.plots ? is.plots.find(p => p.stage === 'ready') : null;
      if (plot) { plot.stage = 'empty'; plot.crop = null; }
      bot.task = null;
    }
    else if (task.type === 'plant' && task.timer > 20) {
      let plot = is.plots ? is.plots.find(p => !p.crop) : null;
      if (plot) { plot.crop = 'grain'; plot.stage = 'growing'; plot.growTimer = 0; }
      bot.task = null;
    }
    else if (task.type === 'build' && task.timer > 60) {
      // Place a real building
      let bpKeys = Object.keys(BLUEPRINTS).filter(bk => {
        let bp = BLUEPRINTS[bk];
        return (bp.minLevel || 1) <= (is.islandLevel || 1) &&
               (bp.cost ? (is.wood || 0) >= (bp.cost.wood || 0) && (is.stone || 0) >= (bp.cost.stone || 0) : true);
      });
      if (bpKeys.length > 0) {
        let bk = bpKeys[floor(random(bpKeys.length))];
        let bp = BLUEPRINTS[bk];
        is.buildings.push({ type: bk, x: task.target.x, y: task.target.y, w: bp.w || 40, h: bp.h || 40, hp: 100, built: true });
        is.wood = max(0, (is.wood || 0) - (bp.cost ? bp.cost.wood || 0 : 5));
        is.stone = max(0, (is.stone || 0) - (bp.cost ? bp.cost.stone || 0 : 3));
        bot.buildCount++;
      }
      bot.task = null;
    }
    else if (task.type === 'patrol' && task.timer > 60) {
      bot.task = null; // Done patrolling this spot
    }
  },

  // Draw a bot character on their island
  draw(nationKey) {
    let bot = this.bots[nationKey];
    if (!bot) return;

    let sx = w2sX(bot.x), sy = w2sY(bot.y);
    if (sx < -50 || sx > width + 50 || sy < -50 || sy > height + 50) return;

    let fm = (typeof FACTION_MILITARY !== 'undefined' && FACTION_MILITARY[nationKey]) ?
      FACTION_MILITARY[nationKey] : { tunic: [160, 50, 40], cape: [145, 28, 22], legs: [120, 40, 30], helm: [175, 150, 60] };
    let fDir = (bot.facing === 'left') ? -1 : 1;

    // Walk animation
    let legOff = 0, bobY = 0;
    if (bot.moving) {
      legOff = sin(bot.walkFrame) * 2.5;
      bobY = sin(bot.walkFrame * 1.5) * 1.5;
    }

    push();
    translate(floor(sx), floor(sy + bobY));
    noStroke();

    // Shadow
    fill(0, 0, 0, 30);
    ellipse(0, 8, 14, 6);

    if (fDir < 0) scale(-1, 1);

    // Legs
    fill(fm.legs[0], fm.legs[1], fm.legs[2]);
    rect(-3, 2 + legOff, 3, 5, 1);
    rect(1, 2 - legOff, 3, 5, 1);

    // Body/tunic
    fill(fm.tunic[0], fm.tunic[1], fm.tunic[2]);
    rect(-5, -10, 10, 14, 2);

    // Cape
    fill(fm.cape[0], fm.cape[1], fm.cape[2], 180);
    rect(2, -8, 4, 10, 1);

    // Arms
    fill(220, 190, 160);
    let armOff = bot.moving ? sin(bot.walkFrame) * 1.5 : 0;
    rect(-7, -6 + armOff, 3, 6, 1);
    rect(4, -6 - armOff, 3, 6, 1);

    // Head
    fill(220, 190, 160);
    rect(-4, -18, 8, 8, 2);

    // Helm
    fill(fm.helm[0], fm.helm[1], fm.helm[2]);
    rect(-4, -19, 8, 3, 1);
    rect(-5, -17, 2, 4, 1);
    rect(3, -17, 2, 4, 1);

    // Eyes
    if (bot.facing !== 'up') {
      fill(40, 30, 20);
      rect(-2, -15, 2, 2);
      rect(2, -15, 2, 2);
    }

    if (fDir < 0) scale(-1, 1);

    // Task indicator above head
    fill(255, 255, 255, 180);
    textAlign(CENTER, BOTTOM);
    textSize(7);
    if (bot.task) {
      let label = { chop: 'Chopping', mine: 'Mining', harvest: 'Harvesting', plant: 'Planting', build: 'Building', patrol: '...' }[bot.task.type] || '';
      text(label, 0, -22);
    }
    textAlign(LEFT, TOP);

    // Name label
    let facName = (typeof FACTIONS !== 'undefined' && FACTIONS[nationKey]) ? FACTIONS[nationKey].name : nationKey;
    fill(fm.tunic[0], fm.tunic[1], fm.tunic[2], 200);
    textSize(8);
    textAlign(CENTER, BOTTOM);
    text(facName, 0, -26);
    textAlign(LEFT, TOP);

    pop();
  },

  // Initialize trees on a bot island (so they have stuff to chop)
  initIslandResources(nationKey) {
    let nation = state.nations[nationKey];
    if (!nation || !nation.islandState) return;
    let is = nation.islandState;
    let cx = nation.isleX, cy = nation.isleY;
    let rx = is.islandRX || 500, ry = is.islandRY || 320;

    // Trees
    if (!is.trees || is.trees.length === 0) {
      is.trees = [];
      for (let i = 0; i < 15; i++) {
        let ang = random(TWO_PI), rd = random(0.2, 0.7);
        is.trees.push({
          x: cx + cos(ang) * rx * rd * 0.8,
          y: cy + sin(ang) * ry * rd * 0.35,
          type: random(['oak', 'pine', 'palm']),
          hp: 3
        });
      }
    }

    // Crystal nodes
    if (!is.crystalNodes || is.crystalNodes.length === 0) {
      is.crystalNodes = [];
      for (let i = 0; i < 5; i++) {
        let ang = random(TWO_PI), rd = random(0.3, 0.6);
        is.crystalNodes.push({
          x: cx + cos(ang) * rx * rd * 0.8,
          y: cy + sin(ang) * ry * rd * 0.35,
          charge: 50, size: 14
        });
      }
    }

    // Farm plots
    if (!is.plots || is.plots.length === 0) {
      is.plots = [];
      for (let i = 0; i < 6; i++) {
        is.plots.push({
          x: cx - rx * 0.3 + (i % 3) * 28,
          y: cy - ry * 0.1 + floor(i / 3) * 28,
          crop: null, stage: 'empty', growTimer: 0
        });
      }
    }
  }
};

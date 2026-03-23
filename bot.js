// MARE NOSTRUM — Bot AI Character System
// Each bot is a visible character on their island that plays the game autonomously.
// Schedule-based daily routine, uses real game functions via state swap.

const BotAI = {
  bots: {},

  create(nationKey, cx, cy) {
    this.bots[nationKey] = {
      x: cx, y: cy,
      facing: 'down', moving: false,
      task: null,
      schedule: 'dawn',
      speed: 2.5,
      faction: nationKey,
      walkFrame: 0,
      personality: 'balanced',
    };
  },

  update(nationKey, dt) {
    let bot = this.bots[nationKey];
    let nation = state.nations[nationKey];
    if (!bot || !nation || !nation.islandState) return;

    // Update schedule based on game time
    let hour = (state.time || 0) / 60;
    if (hour >= 5 && hour < 8) bot.schedule = 'dawn';
    else if (hour >= 8 && hour < 11) bot.schedule = 'morning';
    else if (hour >= 11 && hour < 14) bot.schedule = 'noon';
    else if (hour >= 14 && hour < 17) bot.schedule = 'afternoon';
    else if (hour >= 17 && hour < 20) bot.schedule = 'evening';
    else bot.schedule = 'night';

    if (!bot.task) bot.task = this.think(nationKey, bot, nation);
    if (bot.task) this.doTask(nationKey, bot, nation, dt);
  },

  // THE BRAIN -- thinks like a real player
  think(nationKey, bot, nation) {
    let is = nation.islandState;
    let cx = nation.isleX, cy = nation.isleY;
    let rx = is.islandRX || 500, ry = is.islandRY || 320;

    // EMERGENCY: under attack
    if (state.invasion && state.invasion.active && state.invasion.target === nationKey) {
      return { type: 'defend', target: this.findNearestAttacker(nationKey), timer: 0 };
    }

    switch (bot.schedule) {
      case 'dawn':
        if ((is.crystals||0) < 20) return this.findCrystalTask(cx, cy, is);
        return this.findChopTask(cx, cy, is);
      case 'morning':
        if (this.hasReadyCrops(is)) return this.findHarvestTask(is);
        if (this.hasEmptyPlots(is)) return this.findPlantTask(is);
        return this.findChopTask(cx, cy, is);
      case 'noon':
        if (this.canExpand(is)) return { type: 'expand', target: this.findShrine(cx, cy, is), timer: 0 };
        if ((is.wood||0) >= 15 && (is.stone||0) >= 5) return this.findBuildSpot(cx, cy, is);
        return this.findChopTask(cx, cy, is);
      case 'afternoon':
        if (is.legia && is.legia.castrumLevel > 0 && is.legia.army.length < 5 && (is.gold||0) >= 10)
          return { type: 'recruit', target: this.findCastrum(cx, cy, is), timer: 0 };
        return this.findMineTask(cx, cy, is);
      case 'evening':
        if ((is.wood||0) < 10) return this.findChopTask(cx, cy, is);
        if ((is.harvest||0) < 5) return this.findHarvestTask(is);
        return this.patrol(cx, cy, rx, ry);
      case 'night':
        return this.patrol(cx, cy, rx, ry);
    }
    return this.patrol(cx, cy, rx, ry);
  },

  // --- Task finders ---
  findCrystalTask(cx, cy, is) {
    let node = is.crystalNodes ? is.crystalNodes.find(n => (n.charge||0) > 0) : null;
    if (node) return { type: 'mine_crystal', target: { x: node.x, y: node.y }, timer: 0 };
    return this.patrol(cx, cy, is.islandRX||500, is.islandRY||320);
  },
  findChopTask(cx, cy, is) {
    if (is.trees && is.trees.length > 0) {
      let tree = is.trees[floor(random(is.trees.length))];
      return { type: 'chop', target: { x: tree.x, y: tree.y }, timer: 0 };
    }
    return this.patrol(cx, cy, is.islandRX||500, is.islandRY||320);
  },
  hasReadyCrops(is) { return is.plots && is.plots.some(p => p.stage === 'ready'); },
  hasEmptyPlots(is) { return is.plots && is.plots.some(p => !p.crop); },
  findHarvestTask(is) {
    let plot = is.plots ? is.plots.find(p => p.stage === 'ready') : null;
    if (plot) return { type: 'harvest', target: { x: plot.x, y: plot.y }, timer: 0 };
    return null;
  },
  findPlantTask(is) {
    let plot = is.plots ? is.plots.find(p => !p.crop) : null;
    if (plot) return { type: 'plant', target: { x: plot.x, y: plot.y }, timer: 0 };
    return null;
  },
  canExpand(is) {
    let cost = 5 + (is.islandLevel||1) * 8;
    return (is.crystals||0) >= cost && (is.islandLevel||1) < 15;
  },
  findShrine(cx, cy, is) { return { x: cx - (is.islandRX||500) * 0.7, y: cy }; },
  findCastrum(cx, cy, is) {
    let b = is.buildings ? is.buildings.find(b => b.type === 'castrum') : null;
    return b ? { x: b.x, y: b.y } : { x: cx + 100, y: cy };
  },
  findBuildSpot(cx, cy, is) {
    let ang = random(TWO_PI), rd = random(0.2, 0.5);
    return { type: 'build', target: { x: cx + cos(ang)*(is.islandRX||500)*rd*0.7, y: cy + sin(ang)*(is.islandRY||320)*rd*0.3 }, timer: 0 };
  },
  findMineTask(cx, cy, is) {
    return { type: 'mine_stone', target: { x: cx + random(-50,50), y: cy + random(-30,30) }, timer: 0 };
  },
  patrol(cx, cy, rx, ry) {
    let ang = random(TWO_PI), rd = random(0.2, 0.5);
    return { type: 'patrol', target: { x: cx + cos(ang)*rx*rd*0.6, y: cy + sin(ang)*ry*rd*0.3 }, timer: 0 };
  },
  findNearestAttacker(nationKey) {
    if (!state.invasion || !state.invasion.attackers) return { x: 0, y: 0 };
    let alive = state.invasion.attackers.filter(a => a.hp > 0);
    return alive.length > 0 ? { x: alive[0].x, y: alive[0].y } : { x: 0, y: 0 };
  },

  // --- Execute current task ---
  doTask(nationKey, bot, nation, dt) {
    let task = bot.task;
    let tx = task.target.x, ty = task.target.y;
    let dx = tx - bot.x, dy = ty - bot.y;
    let dist = Math.sqrt(dx*dx + dy*dy);

    // Walk toward target
    if (dist > 12) {
      bot.x += (dx/dist) * bot.speed * dt;
      bot.y += (dy/dist) * bot.speed * dt;
      bot.moving = true;
      bot.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      bot.walkFrame += dt * 0.15;
      return;
    }

    // Arrived -- perform action
    bot.moving = false;
    task.timer += dt;
    let is = nation.islandState;

    switch (task.type) {
      case 'chop':
        if (task.timer > 40) {
          is.wood = (is.wood||0) + 3;
          if (is.trees) {
            let ti = is.trees.findIndex(t => Math.abs(t.x-tx)<20 && Math.abs(t.y-ty)<20);
            if (ti >= 0) is.trees.splice(ti, 1);
          }
          bot.task = null;
        }
        break;
      case 'mine_crystal':
        if (task.timer > 50) {
          is.crystals = (is.crystals||0) + 3;
          let node = is.crystalNodes ? is.crystalNodes.find(n => Math.abs(n.x-tx)<20 && Math.abs(n.y-ty)<20) : null;
          if (node) node.charge = Math.max(0, (node.charge||0) - 20);
          bot.task = null;
        }
        break;
      case 'mine_stone':
        if (task.timer > 45) {
          is.stone = (is.stone||0) + 2;
          bot.task = null;
        }
        break;
      case 'harvest':
        if (task.timer > 25) {
          is.harvest = (is.harvest||0) + 3;
          let hp = is.plots ? is.plots.find(p => p.stage === 'ready' && Math.abs(p.x-tx)<20) : null;
          if (hp) { hp.stage = 'empty'; hp.crop = null; }
          bot.task = null;
        }
        break;
      case 'plant':
        if (task.timer > 20) {
          let pp = is.plots ? is.plots.find(p => !p.crop && Math.abs(p.x-tx)<20) : null;
          if (pp) { pp.crop = 'grain'; pp.stage = 'growing'; pp.growTimer = 0; }
          bot.task = null;
        }
        break;
      case 'expand':
        if (task.timer > 60) {
          let cx = nation.isleX, cy = nation.isleY;
          if (typeof swapToIsland === 'function') {
            swapToIsland(is, cx, cy);
            let cost = 5 + (state.islandLevel||1) * 8;
            if ((state.crystals||0) >= cost) {
              state.crystals -= cost;
              state.islandLevel++;
              state.islandRX += 30;
              state.islandRY += 20;
              if (typeof placeEraBuildings === 'function') placeEraBuildings(state.islandLevel);
              for (let i = 0; i < 3; i++) {
                let a = random(TWO_PI), r = random(0.3, 0.7);
                state.trees.push({ x: cx+cos(a)*state.islandRX*r*0.7, y: cy+sin(a)*state.islandRY*r*0.3, type: 'oak', hp: 3 });
              }
            }
            swapBack();
          }
          bot.task = null;
        }
        break;
      case 'build':
        if (task.timer > 50) {
          if (typeof BLUEPRINTS !== 'undefined') {
            let bpKeys = Object.keys(BLUEPRINTS).filter(bk => {
              let bp = BLUEPRINTS[bk];
              return (bp.minLevel||1) <= (is.islandLevel||1) &&
                     (!bp.cost || ((is.wood||0) >= (bp.cost.wood||0) && (is.stone||0) >= (bp.cost.stone||0)));
            });
            if (bpKeys.length > 0 && is.buildings.length < 25) {
              let bk = bpKeys[floor(random(bpKeys.length))];
              let bp = BLUEPRINTS[bk];
              is.buildings.push({ type: bk, x: tx, y: ty, w: bp.w||40, h: bp.h||40, hp: 100, built: true });
              if (bp.cost) {
                is.wood = Math.max(0, (is.wood||0) - (bp.cost.wood||0));
                is.stone = Math.max(0, (is.stone||0) - (bp.cost.stone||0));
              }
            }
          }
          bot.task = null;
        }
        break;
      case 'recruit':
        if (task.timer > 40) {
          if ((is.gold||0) >= 10) {
            is.gold -= 10;
            if (!is.legia) is.legia = { army: [], castrumLevel: 1, morale: 100 };
            is.legia.army.push({ type: 'legionary', hp: 20, maxHp: 20, damage: 5, speed: 1.2, garrison: false });
            is.legia.castrumLevel = Math.max(is.legia.castrumLevel||0, 1);
          }
          bot.task = null;
        }
        break;
      case 'defend':
        if (state.invasion && state.invasion.active) {
          let nearest = state.invasion.attackers ? state.invasion.attackers.find(a => a.hp > 0) : null;
          if (nearest) {
            let dd = Math.sqrt((bot.x-nearest.x)*(bot.x-nearest.x)+(bot.y-nearest.y)*(bot.y-nearest.y));
            if (dd < 25 && task.timer > 20) { nearest.hp -= 8; task.timer = 0; }
            else if (dd > 25) {
              bot.x += ((nearest.x-bot.x)/dd)*3; bot.y += ((nearest.y-bot.y)/dd)*3;
              bot.moving = true;
            }
          }
        } else { bot.task = null; }
        break;
      case 'patrol':
        if (task.timer > 90) bot.task = null;
        break;
    }
  },

  // Draw a bot character on their island
  draw(nationKey) {
    let bot = this.bots[nationKey];
    if (!bot) return;
    let sx = w2sX(bot.x), sy = w2sY(bot.y);
    if (sx < -50 || sx > width + 50 || sy < -50 || sy > height + 50) return;

    let fm = (typeof FACTION_MILITARY !== 'undefined' && FACTION_MILITARY[nationKey]) ?
      FACTION_MILITARY[nationKey] : { tunic: [160,50,40], cape: [145,28,22], legs: [120,40,30], helm: [175,150,60] };
    let fDir = (bot.facing === 'left') ? -1 : 1;
    let legOff = 0, bobY = 0;
    if (bot.moving) { legOff = sin(bot.walkFrame)*2.5; bobY = sin(bot.walkFrame*1.5)*1.5; }

    push();
    translate(floor(sx), floor(sy + bobY));
    noStroke();
    fill(0,0,0,30); ellipse(0, 8, 14, 6);
    if (fDir < 0) scale(-1, 1);
    fill(fm.legs[0],fm.legs[1],fm.legs[2]);
    rect(-3, 2+legOff, 3, 5, 1); rect(1, 2-legOff, 3, 5, 1);
    fill(fm.tunic[0],fm.tunic[1],fm.tunic[2]);
    rect(-5, -10, 10, 14, 2);
    fill(fm.cape[0],fm.cape[1],fm.cape[2],180);
    rect(2, -8, 4, 10, 1);
    fill(220,190,160);
    let armOff = bot.moving ? sin(bot.walkFrame)*1.5 : 0;
    rect(-7, -6+armOff, 3, 6, 1); rect(4, -6-armOff, 3, 6, 1);
    fill(220,190,160); rect(-4, -18, 8, 8, 2);
    fill(fm.helm[0],fm.helm[1],fm.helm[2]);
    rect(-4, -19, 8, 3, 1); rect(-5, -17, 2, 4, 1); rect(3, -17, 2, 4, 1);
    if (bot.facing !== 'up') { fill(40,30,20); rect(-2,-15,2,2); rect(2,-15,2,2); }
    if (fDir < 0) scale(-1, 1);
    fill(255,255,255,180); textAlign(CENTER, BOTTOM); textSize(7);
    if (bot.task) {
      let label = { chop:'Chopping', mine_crystal:'Mining', mine_stone:'Mining', harvest:'Harvesting', plant:'Planting', build:'Building', expand:'Expanding', recruit:'Recruiting', defend:'Defending!', patrol:'...' }[bot.task.type] || '';
      text(label, 0, -22);
    }
    let facName = (typeof FACTIONS !== 'undefined' && FACTIONS[nationKey]) ? FACTIONS[nationKey].name : nationKey;
    fill(fm.tunic[0],fm.tunic[1],fm.tunic[2],200); textSize(8); textAlign(CENTER, BOTTOM);
    text(facName, 0, -26);
    textAlign(LEFT, TOP);
    pop();
  },
};

// MARE NOSTRUM — Bot AI (Utility AI)
// Each bot is an autonomous player that gathers resources, expands through
// the REAL progression system, and defends their island.
// NO random building placement. Bot expands → placeEraBuildings() handles layout.

const BotAI = {
  bots: {},

  create(nationKey, cx, cy) {
    this.bots[nationKey] = {
      x: cx, y: cy, facing: 'down', moving: false,
      task: null, taskCooldown: 0, speed: 2.5,
      faction: nationKey, walkFrame: 0,
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

    if (underAttack) actions.push({ type: 'defend', score: 10.0 });
    if (crystals >= expandCost && level < 15) actions.push({ type: 'expand', score: 3.0 + level * 0.2 });
    if (is.crystalNodes && is.crystalNodes.some(n => (n.charge||0) > 0) && crystals < expandCost)
      actions.push({ type: 'mine_crystal', score: 2.5 * (1 - crystals / expandCost) });
    if (is.trees && is.trees.length > 0 && wood < 30)
      actions.push({ type: 'chop', score: 2.0 * (1 - wood / 30) });
    if (is.plots && is.plots.some(p => p.stage === 'ready'))
      actions.push({ type: 'harvest', score: 1.8 });
    if (is.plots && is.plots.some(p => !p.crop))
      actions.push({ type: 'plant', score: 1.2 });
    if (stone < 15) actions.push({ type: 'mine_stone', score: 1.5 * (1 - stone / 15) });
    if (is.buildings && is.buildings.some(b => b.type === 'castrum') && gold >= 10 && (!is.legia || is.legia.army.length < 5))
      actions.push({ type: 'recruit', score: 1.0 + (underAttack ? 3.0 : 0) });
    actions.push({ type: 'patrol', score: 0.1 });

    actions.sort((a, b) => b.score - a.score);
    return actions;
  },

  update(nationKey, dt) {
    let bot = this.bots[nationKey];
    if (!bot) return;
    let nation = state.nations[nationKey];
    if (!nation || !nation.islandState) return;
    bot.taskCooldown = Math.max(0, (bot.taskCooldown || 0) - dt);
    if (!bot.task && bot.taskCooldown <= 0) {
      let actions = this.scoreActions(nationKey);
      bot.task = this.createTask(actions[0].type, nationKey, nation);
      bot.taskCooldown = 20;
    }
    if (bot.task) this.executeTask(nationKey, bot, nation, dt);
  },

  createTask(type, nationKey, nation) {
    let is = nation.islandState, cx = nation.isleX, cy = nation.isleY;
    let rx = is.islandRX || 500, ry = is.islandRY || 320;
    switch (type) {
      case 'mine_crystal': { let n = is.crystalNodes.find(n => (n.charge||0) > 0); return n ? { type, target: {x:n.x,y:n.y}, timer: 0 } : null; }
      case 'chop': { let t = is.trees[Math.floor(Math.random()*is.trees.length)]; return t ? { type, target: {x:t.x,y:t.y}, timer: 0 } : null; }
      case 'harvest': { let p = is.plots.find(p => p.stage==='ready'); return p ? { type, target: {x:p.x,y:p.y}, timer: 0 } : null; }
      case 'plant': { let p = is.plots.find(p => !p.crop); return p ? { type, target: {x:p.x,y:p.y}, timer: 0 } : null; }
      case 'mine_stone': return { type, target: {x: cx+(Math.random()-0.5)*rx*0.4, y: cy+(Math.random()-0.5)*ry*0.2}, timer: 0 };
      case 'expand': return { type, target: {x: cx-rx*0.7, y: cy}, timer: 0 };
      case 'recruit': { let b = is.buildings ? is.buildings.find(b => b.type==='castrum') : null; return { type, target: b ? {x:b.x,y:b.y} : {x:cx,y:cy}, timer: 0 }; }
      case 'defend': { let a = state.invasion && state.invasion.attackers ? state.invasion.attackers.find(a => a.hp>0) : null; return { type, target: a ? {x:a.x,y:a.y} : {x:cx,y:cy}, timer: 0 }; }
      default: { let a=Math.random()*Math.PI*2, r=Math.random()*0.4+0.1; return { type:'patrol', target: {x:cx+Math.cos(a)*rx*r*0.6, y:cy+Math.sin(a)*ry*r*0.25}, timer: 0 }; }
    }
  },

  executeTask(nationKey, bot, nation, dt) {
    let task = bot.task, is = nation.islandState;
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
      case 'chop':
        if (task.timer > 35) {
          is.wood = (is.wood||0) + 3;
          if (is.trees) { let i = is.trees.findIndex(t => Math.abs(t.x-task.target.x)<20 && Math.abs(t.y-task.target.y)<20); if (i>=0) is.trees.splice(i,1); }
          bot.task = null;
        } break;
      case 'mine_crystal':
        if (task.timer > 45) {
          is.crystals = (is.crystals||0) + 3;
          let n = is.crystalNodes ? is.crystalNodes.find(n => Math.abs(n.x-task.target.x)<20 && Math.abs(n.y-task.target.y)<20 && (n.charge||0)>0) : null;
          if (n) n.charge = Math.max(0, (n.charge||0)-20);
          bot.task = null;
        } break;
      case 'mine_stone':
        if (task.timer > 40) { is.stone = (is.stone||0) + 2; bot.task = null; } break;
      case 'harvest':
        if (task.timer > 20) {
          is.harvest = (is.harvest||0) + 3;
          let p = is.plots ? is.plots.find(p => p.stage==='ready' && Math.abs(p.x-task.target.x)<20) : null;
          if (p) { p.stage = 'empty'; p.crop = null; }
          bot.task = null;
        } break;
      case 'plant':
        if (task.timer > 18) {
          let p = is.plots ? is.plots.find(p => !p.crop && Math.abs(p.x-task.target.x)<20) : null;
          if (p) { p.crop = 'grain'; p.stage = 'growing'; p.growTimer = 0; }
          bot.task = null;
        } break;
      case 'expand':
        if (task.timer > 50) {
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
                state.trees.push({ x: nation.isleX+Math.cos(a)*state.islandRX*r*0.7, y: nation.isleY+Math.sin(a)*state.islandRY*r*0.3, type: 'oak', hp: 3 });
              }
            }
            swapBack();
          }
          bot.task = null;
        } break;
      case 'recruit':
        if (task.timer > 30) {
          if ((is.gold||0) >= 10) {
            is.gold -= 10;
            if (!is.legia) is.legia = { army: [], castrumLevel: 1, morale: 100 };
            if (!is.legia.army) is.legia.army = [];
            is.legia.army.push({ type: 'legionary', hp: 20, maxHp: 20, damage: 5, speed: 1.2, garrison: false });
            is.legia.castrumLevel = Math.max(is.legia.castrumLevel||0, 1);
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
      case 'patrol':
        if (task.timer > 80) bot.task = null; break;
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
      let labels = { chop:'Chopping', mine_crystal:'Mining', mine_stone:'Quarrying', harvest:'Harvesting', plant:'Planting', expand:'Expanding!', recruit:'Recruiting', defend:'DEFENDING!' };
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

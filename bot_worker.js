// MARE NOSTRUM — Bot AI Web Worker
// Runs BotAI.think() and movement for all nations in a background thread.
// Sends back bot positions, facing, task labels, and state mutations.

let bots = {};
let nationStates = {};

function scoreActions(nationKey) {
  let is = nationStates[nationKey];
  if (!is) return [{ type: 'patrol', score: 0.1 }];

  let wood = is.wood || 0, stone = is.stone || 0, crystals = is.crystals || 0;
  let gold = is.gold || 0, level = is.islandLevel || 1;
  let expandCost = 5 + level * 8;
  let underAttack = is._underAttack || false;
  let actions = [];

  if (underAttack) actions.push({ type: 'defend', score: 10.0 });
  if (crystals >= expandCost && level < 15) actions.push({ type: 'expand', score: 3.0 + level * 0.2 });
  if (is.crystalNodes && is.crystalNodes.some(function(n) { return (n.charge||0) > 0; }) && crystals < expandCost)
    actions.push({ type: 'mine_crystal', score: 2.5 * (1 - crystals / expandCost) });
  if (is.trees && is.trees.length > 0 && wood < 30)
    actions.push({ type: 'chop', score: 2.0 * (1 - wood / 30) });
  if (is.plots && is.plots.some(function(p) { return p.stage === 'ready'; }))
    actions.push({ type: 'harvest', score: 1.8 });
  if (is.plots && is.plots.some(function(p) { return !p.crop; }))
    actions.push({ type: 'plant', score: 1.2 });
  if (stone < 15) actions.push({ type: 'mine_stone', score: 1.5 * (1 - stone / 15) });
  if (is.buildings && is.buildings.some(function(b) { return b.type === 'castrum'; }) && gold >= 10 && (!is.legia || !is.legia.army || is.legia.army.length < 5))
    actions.push({ type: 'recruit', score: 1.0 + (underAttack ? 3.0 : 0) });
  actions.push({ type: 'patrol', score: 0.1 });

  actions.sort(function(a, b) { return b.score - a.score; });
  return actions;
}

function createTask(type, nationKey) {
  let is = nationStates[nationKey];
  if (!is) return null;
  let cx = is.isleX, cy = is.isleY;
  let rx = is.islandRX || 500, ry = is.islandRY || 320;
  switch (type) {
    case 'mine_crystal': {
      let n = is.crystalNodes ? is.crystalNodes.find(function(nd) { return (nd.charge||0) > 0; }) : null;
      return n ? { type: type, target: {x:n.x,y:n.y}, timer: 0 } : null;
    }
    case 'chop': {
      let t = is.trees ? is.trees[Math.floor(Math.random()*is.trees.length)] : null;
      return t ? { type: type, target: {x:t.x,y:t.y}, timer: 0 } : null;
    }
    case 'harvest': {
      let p = is.plots ? is.plots.find(function(pl) { return pl.stage==='ready'; }) : null;
      return p ? { type: type, target: {x:p.x,y:p.y}, timer: 0 } : null;
    }
    case 'plant': {
      let p = is.plots ? is.plots.find(function(pl) { return !pl.crop; }) : null;
      return p ? { type: type, target: {x:p.x,y:p.y}, timer: 0 } : null;
    }
    case 'mine_stone':
      return { type: type, target: {x: cx+(Math.random()-0.5)*rx*0.4, y: cy+(Math.random()-0.5)*ry*0.2}, timer: 0 };
    case 'expand':
      return { type: type, target: {x: cx-rx*0.7, y: cy}, timer: 0 };
    case 'recruit': {
      let b = is.buildings ? is.buildings.find(function(bl) { return bl.type==='castrum'; }) : null;
      return { type: type, target: b ? {x:b.x,y:b.y} : {x:cx,y:cy}, timer: 0 };
    }
    case 'defend': {
      let atk = is._attackerPos;
      return { type: type, target: atk ? {x:atk.x,y:atk.y} : {x:cx,y:cy}, timer: 0 };
    }
    default: {
      let a = Math.random()*Math.PI*2, r = Math.random()*0.4+0.1;
      return { type:'patrol', target: {x:cx+Math.cos(a)*rx*r*0.6, y:cy+Math.sin(a)*ry*r*0.25}, timer: 0 };
    }
  }
}

function updateBot(nationKey, dt, mutations) {
  let bot = bots[nationKey];
  let is = nationStates[nationKey];
  if (!bot || !is) return;

  bot.taskCooldown = Math.max(0, (bot.taskCooldown || 0) - dt);
  if (!bot.task && bot.taskCooldown <= 0) {
    let actions = scoreActions(nationKey);
    bot.task = createTask(actions[0].type, nationKey);
    bot.taskCooldown = 20;
  }
  if (bot.task) executeTask(nationKey, bot, is, dt, mutations);
}

function executeTask(nationKey, bot, is, dt, mutations) {
  let task = bot.task;
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
        mutations.push({ type: 'chop', nation: nationKey, target: task.target, woodGain: 3 });
        bot.task = null;
      } break;
    case 'mine_crystal':
      if (task.timer > 45) {
        mutations.push({ type: 'mine_crystal', nation: nationKey, target: task.target, crystalGain: 3, chargeDrain: 20 });
        bot.task = null;
      } break;
    case 'mine_stone':
      if (task.timer > 40) {
        mutations.push({ type: 'mine_stone', nation: nationKey, stoneGain: 2 });
        bot.task = null;
      } break;
    case 'harvest':
      if (task.timer > 20) {
        mutations.push({ type: 'harvest', nation: nationKey, target: task.target, harvestGain: 3 });
        bot.task = null;
      } break;
    case 'plant':
      if (task.timer > 18) {
        mutations.push({ type: 'plant', nation: nationKey, target: task.target });
        bot.task = null;
      } break;
    case 'expand':
      if (task.timer > 50) {
        mutations.push({ type: 'expand', nation: nationKey });
        bot.task = null;
      } break;
    case 'recruit':
      if (task.timer > 30) {
        mutations.push({ type: 'recruit', nation: nationKey });
        bot.task = null;
      } break;
    case 'defend':
      if (is._underAttack) {
        let atk = is._attackerPos;
        if (atk) {
          let dd = Math.sqrt((bot.x-atk.x)*(bot.x-atk.x)+(bot.y-atk.y)*(bot.y-atk.y));
          if (dd < 25 && task.timer > 15) {
            mutations.push({ type: 'defend_hit', nation: nationKey, damage: 8 });
            task.timer = 0;
          } else if (dd > 25) {
            bot.x += ((atk.x-bot.x)/dd)*3;
            bot.y += ((atk.y-bot.y)/dd)*3;
            bot.moving = true;
          }
        } else { bot.task = null; }
      } else { bot.task = null; }
      break;
    case 'patrol':
      if (task.timer > 80) bot.task = null; break;
  }
}

self.onmessage = function(e) {
  let msg = e.data;

  if (msg.type === 'init') {
    bots = {};
    for (let key of Object.keys(msg.nations)) {
      let n = msg.nations[key];
      bots[key] = {
        x: n.isleX, y: n.isleY,
        facing: 'down', moving: false,
        task: null, taskCooldown: 0,
        speed: 2.5, faction: key,
        walkFrame: 0
      };
    }
    self.postMessage({ type: 'ready' });
  }

  if (msg.type === 'update') {
    nationStates = msg.nations;
    let dt = msg.dt || 1;
    let mutations = [];

    for (let key of Object.keys(bots)) {
      if (!nationStates[key]) continue;
      if (nationStates[key].defeated) continue;
      updateBot(key, dt, mutations);
    }

    let botStates = {};
    for (let key of Object.keys(bots)) {
      let b = bots[key];
      botStates[key] = {
        x: b.x, y: b.y,
        facing: b.facing, moving: b.moving,
        walkFrame: b.walkFrame,
        taskType: b.task ? b.task.type : null
      };
    }

    self.postMessage({ type: 'result', bots: botStates, mutations: mutations });
  }

  if (msg.type === 'sync_positions') {
    for (let key of Object.keys(msg.positions)) {
      if (bots[key]) {
        bots[key].x = msg.positions[key].x;
        bots[key].y = msg.positions[key].y;
      }
    }
  }
};

// MARE NOSTRUM — Economy & Trade System
// Loaded after sketch.js. Uses global state.

// ─── TRADE ROUTE DEFINITIONS ─────────────────────────────────────────────────

const TRADE_GOODS = {
  grain:   { name: 'Grain',   icon: '#ddcc44', goldPerTrip: 12 },
  wood:    { name: 'Wood',    icon: '#aa8844', goldPerTrip: 10 },
  stone:   { name: 'Stone',   icon: '#888888', goldPerTrip: 11 },
  wine:    { name: 'Wine',    icon: '#884466', goldPerTrip: 18 },
  fish:    { name: 'Fish',    icon: '#4488aa', goldPerTrip: 10 },
  crystal: { name: 'Crystal', icon: '#44ffaa', goldPerTrip: 22 },
};

const MAX_TRADE_ROUTES = 3;
const TRADE_ROUTE_COST = { gold: 50, wood: 20 };
const TRADE_SHIP_SPEED = 0.4;

// ─── COLONY SPECIALIZATION ──────────────────────────────────────────────────

const COLONY_SPECS = {
  agricultural: { name: 'Agricultural', desc: '+30% harvest from colony', color: '#88cc44' },
  mining:       { name: 'Mining',       desc: '+1.5/level stone daily, iron at lv5+', color: '#aaaacc' },
  trading:      { name: 'Trading',      desc: '2x gold from routes',   color: '#ddaa44' },
};

let _specSelectOpen = false;

function openColonySpecSelect() {
  _specSelectOpen = true;
}

function selectColonySpec(specKey) {
  if (!COLONY_SPECS[specKey]) return;
  state.colonySpec['conquest'] = specKey;
  _specSelectOpen = false;
  addFloatingText(width / 2, height * 0.2,
    'Colony specializes in ' + COLONY_SPECS[specKey].name + '!',
    COLONY_SPECS[specKey].color);
  addNotification('Colony spec: ' + COLONY_SPECS[specKey].name + ' — ' + COLONY_SPECS[specKey].desc, COLONY_SPECS[specKey].color);
}

// ─── TRADE ROUTE MANAGEMENT ─────────────────────────────────────────────────

let _nextRouteId = 1;

function createTradeRoute(good) {
  if (!good || !TRADE_GOODS[good]) return false;
  if (state.tradeRoutes.length >= MAX_TRADE_ROUTES) {
    addFloatingText(width / 2, height * 0.3, 'Max 3 trade routes!', '#ff6644');
    return false;
  }
  if (state.gold < TRADE_ROUTE_COST.gold || state.wood < TRADE_ROUTE_COST.wood) {
    addFloatingText(width / 2, height * 0.3, 'Need 50 gold + 20 wood!', '#ff6644');
    return false;
  }
  state.gold -= TRADE_ROUTE_COST.gold;
  state.wood -= TRADE_ROUTE_COST.wood;

  let homePort = getPortPosition();
  let colonyPort = {
    x: state.conquest.isleX + state.conquest.isleRX * 0.9,
    y: state.conquest.isleY + state.conquest.isleRY * 0.7,
  };

  let route = {
    id: _nextRouteId++,
    from: { x: homePort.x, y: homePort.y, name: 'Home' },
    to: { x: colonyPort.x, y: colonyPort.y, name: 'Terra Nova' },
    good: good,
    amount: 1,
    shipX: homePort.x,
    shipY: homePort.y,
    shipAngle: 0,
    active: true,
    tripTimer: 0,
    tripPhase: 'outbound', // outbound | returning
    goldEarned: 0,
  };
  state.tradeRoutes.push(route);
  addFloatingText(width / 2, height * 0.25, 'Trade route created: ' + TRADE_GOODS[good].name, '#ddaa44');
  addNotification('New trade route: ' + TRADE_GOODS[good].name + ' to Terra Nova', '#ddaa44');
  return true;
}

function removeTradeRoute(routeId) {
  let idx = state.tradeRoutes.findIndex(r => r.id === routeId);
  if (idx >= 0) {
    state.tradeRoutes.splice(idx, 1);
    addNotification('Trade route cancelled', '#aa6644');
  }
}

// ─── TRADE SHIP SIMULATION ──────────────────────────────────────────────────

function updateTradeRoutes(dt) {
  for (let route of state.tradeRoutes) {
    if (!route.active) continue;
    route.tripTimer += dt;

    let targetX, targetY;
    if (route.tripPhase === 'outbound') {
      targetX = route.to.x; targetY = route.to.y;
    } else {
      targetX = route.from.x; targetY = route.from.y;
    }

    let dx = targetX - route.shipX;
    let dy = targetY - route.shipY;
    let d = sqrt(dx * dx + dy * dy);
    route.shipAngle = atan2(dy, dx);

    if (d > 5) {
      let speedMult = (typeof getTradeSpeedMult === 'function') ? getTradeSpeedMult() : 1;
      route.shipX += (dx / d) * TRADE_SHIP_SPEED * speedMult * dt;
      route.shipY += (dy / d) * TRADE_SHIP_SPEED * speedMult * dt;
    } else {
      // Arrived
      if (route.tripPhase === 'outbound') {
        route.tripPhase = 'returning';
      } else {
        // Completed a round trip
        route.tripPhase = 'outbound';
        let goldGain = TRADE_GOODS[route.good].goldPerTrip;
        // Faction bonus: Carthage +15% trade income
        if (typeof getFactionData === 'function') goldGain = floor(goldGain * getFactionData().tradeIncomeMult);
        // Vineyard bonus: +30% trade value per vineyard
        if (state.buildings) {
          let vineyards = state.buildings.filter(b => b.type === 'vineyard').length;
          if (vineyards > 0) goldGain = floor(goldGain * (1 + 0.3 * vineyards));
        }
        // Trading spec doubles gold
        if (state.colonySpec['conquest'] === 'trading') goldGain *= 2;
        // Tech: mathematics +15% trade profits
        if (typeof hasTech === 'function' && hasTech('mathematics')) goldGain = floor(goldGain * 1.15);
        // Tech: advanced_hulls — trade ships carry more (+25%)
        if (typeof hasTech === 'function' && hasTech('advanced_hulls')) goldGain = floor(goldGain * 1.25);
        // Demand bonus: +50% if this good is in demand
        let demandMult = getDemandBonus(route.good);
        goldGain = floor(goldGain * demandMult);
        state.gold += goldGain;
        route.goldEarned += goldGain;
        let demandTag = demandMult > 1 ? ' (DEMAND!)' : '';
        addFloatingText(width / 2, height * 0.35, '+' + goldGain + 'g from ' + TRADE_GOODS[route.good].name + ' trade' + demandTag, demandMult > 1 ? '#ffdd44' : '#ddcc44');
      }
    }
  }
}

// ─── TRADE SHIP DRAWING (world space) ────────────────────────────────────────

function drawTradeShips() {
  for (let route of state.tradeRoutes) {
    if (!route.active) continue;
    let sx = w2sX(route.shipX);
    let sy = w2sY(route.shipY);
    if (sx < -30 || sx > width + 30 || sy < -30 || sy > height + 30) continue;

    push();
    translate(sx, sy);
    let fa = route.shipAngle;
    rotate(fa);

    // Small trade ship
    noStroke();
    // Hull shadow
    fill(20, 40, 60, 40);
    ellipse(0, 4, 24, 8);
    // Hull
    fill(120, 80, 40);
    beginShape();
    vertex(-12, -2); vertex(-10, 4); vertex(10, 4); vertex(12, -2);
    vertex(8, -4); vertex(-8, -4);
    endShape(CLOSE);
    // Deck
    fill(160, 120, 60);
    rect(-7, -3, 14, 4, 1);
    // Mast
    fill(100, 70, 30);
    rect(-1, -14, 2, 12);
    // Sail
    let sailPuff = sin(frameCount * 0.04 + route.id) * 1.5;
    fill(240, 230, 210, 220);
    beginShape();
    vertex(0, -13); vertex(8 + sailPuff, -8); vertex(0, -3);
    endShape(CLOSE);
    // Cargo color dot
    let gc = TRADE_GOODS[route.good];
    if (gc) {
      fill(gc.icon);
      ellipse(0, -1, 4, 4);
    }
    // Wake
    fill(180, 210, 230, 30);
    ellipse(-14, 2, 8, 3);
    ellipse(-18, 2, 6, 2);

    pop();
  }
}

// ─── TRADE ROUTE DRAWING (sea lane dotted lines) ────────────────────────────

function drawTradeRoutePaths() {
  for (let route of state.tradeRoutes) {
    if (!route.active) continue;
    let fx = w2sX(route.from.x), fy = w2sY(route.from.y);
    let tx = w2sX(route.to.x), ty = w2sY(route.to.y);
    // Dotted line
    stroke(180, 160, 100, 40);
    strokeWeight(1);
    let steps = floor(dist(fx, fy, tx, ty) / 10);
    for (let i = 0; i < steps; i += 2) {
      let t1 = i / steps, t2 = (i + 1) / steps;
      line(lerp(fx, tx, t1), lerp(fy, ty, t1), lerp(fx, tx, t2), lerp(fy, ty, t2));
    }
    noStroke();
  }
}

// ─── DAILY INCOME CALCULATION ───────────────────────────────────────────────

function calculateDailyTradeIncome() {
  let income = 0;
  for (let route of state.tradeRoutes) {
    if (!route.active) continue;
    let base = TRADE_GOODS[route.good].goldPerTrip;
    if (state.colonySpec['conquest'] === 'trading') base *= 2;
    base = floor(base * getDemandBonus(route.good));
    income += base;
  }
  // Upkeep: 2 gold per route
  let upkeep = state.tradeRoutes.filter(r => r.active).length * 2;
  return { income, upkeep, net: income - upkeep };
}

// Hook into day transition (called from economy update)
function onDayTransitionEconomy() {
  // Init new state if missing (legacy saves)
  initPrestigeState();
  // Track days survived for scoring
  if (state.score) state.score.daysSurvived = state.day || 0;
  // Process automation daily income
  processAutomationDaily();

  let c = state.conquest;
  if (!c.colonized) return;

  let trade = calculateDailyTradeIncome();

  // Apply colony spec bonuses to harvest
  if (state.colonySpec['conquest'] === 'agricultural') {
    // +30% harvest bonus applied at harvest time in sketch.js farm plot harvest code
  }
  if (state.colonySpec['conquest'] === 'mining') {
    let mineBonus = floor(c.colonyLevel * 1.5);
    state.stone += mineBonus;
    if (c.colonyLevel >= 5) state.ironOre = (state.ironOre || 0) + floor(c.colonyLevel * 0.5);
  }

  // Trade ships earn gold on each completed round trip (in updateTradeRoutes).
  // Daily upkeep is deducted here; income shown is an estimate for display only.
  if (trade.upkeep > 0) {
    state.gold = max(0, state.gold - trade.upkeep);
    addNotification('Trade upkeep: -' + trade.upkeep + 'g (' + state.tradeRoutes.filter(r => r.active).length + ' routes)', '#ddcc66');
  }

  // Check if colony should offer spec selection
  if (c.colonyLevel >= 3 && !state.colonySpec['conquest'] && !_specSelectOpen) {
    openColonySpecSelect();
  }
}

// ─── TRADE ROUTE UI (press R near port) ──────────────────────────────────────

function drawTradeRouteUI() {
  if (!state.tradeRouteUI) return;
  push();

  let pw = 320, ph = 260;
  let px = width / 2 - pw / 2, py = height / 2 - ph / 2;

  // Panel background
  fill(20, 16, 12, 230);
  stroke(180, 150, 80);
  strokeWeight(2);
  rect(px, py, pw, ph, 8);
  noStroke();

  // Title
  fill(220, 200, 140);
  textSize(14); textAlign(CENTER, TOP);
  text('TRADE ROUTES', width / 2, py + 10);

  // Daily summary
  let trade = calculateDailyTradeIncome();
  fill(180, 170, 130);
  textSize(9);
  text('Daily trade income: +' + trade.income + 'g  Upkeep: -' + trade.upkeep + 'g  Net: ' +
    (trade.net >= 0 ? '+' : '') + trade.net + 'g', width / 2, py + 30);

  // Demand indicator
  let demandGoods = getCurrentDemandGoods();
  if (demandGoods.length > 0) {
    let dNames = demandGoods.map(k => TRADE_GOODS[k] ? TRADE_GOODS[k].name : k);
    fill(255, 220, 80);
    textSize(8);
    text('IN DEMAND: ' + dNames.join(', ') + ' (+50% gold)', width / 2, py + 42);
  }

  // Active routes
  textAlign(LEFT, TOP);
  let ry = py + 52;
  if (state.tradeRoutes.length === 0) {
    fill(140, 130, 110);
    textSize(9);
    text('No active trade routes', px + 15, ry);
    ry += 18;
  } else {
    for (let i = 0; i < state.tradeRoutes.length; i++) {
      let r = state.tradeRoutes[i];
      let g = TRADE_GOODS[r.good];
      // Route row
      fill(40, 35, 28, 180);
      rect(px + 10, ry, pw - 20, 28, 4);
      // Good color dot
      fill(g.icon);
      ellipse(px + 24, ry + 14, 8, 8);
      // Text
      fill(220, 200, 150);
      textSize(9);
      text(g.name + ' route  |  Earned: ' + r.goldEarned + 'g', px + 34, ry + 4);
      fill(160, 140, 110);
      textSize(8);
      text(r.from.name + ' -> ' + r.to.name + '  |  ' + g.goldPerTrip + 'g/trip', px + 34, ry + 16);
      // Cancel button area hint
      fill(180, 80, 60, 150);
      textSize(7); textAlign(RIGHT, TOP);
      text('[' + (i + 1) + '] cancel', px + pw - 15, ry + 8);
      textAlign(LEFT, TOP);
      ry += 34;
    }
  }

  // Create new route section
  ry += 8;
  fill(160, 150, 120);
  textSize(10);
  text('Create Route (50g + 20 wood):', px + 15, ry);
  ry += 16;

  let goodKeys = Object.keys(TRADE_GOODS);
  let gx = px + 15;
  for (let i = 0; i < goodKeys.length; i++) {
    let gk = goodKeys[i];
    let g = TRADE_GOODS[gk];
    let bw = 46, bh = 22;
    let canAfford = state.gold >= 50 && state.wood >= 20 && state.tradeRoutes.length < MAX_TRADE_ROUTES;
    let inDemand = isGoodInDemand(gk);
    fill(canAfford ? (inDemand ? color(50, 55, 30, 220) : color(40, 50, 35, 200)) : color(40, 35, 35, 150));
    rect(gx, ry, bw, bh, 3);
    // Demand glow border
    if (inDemand) {
      stroke(255, 220, 80, 120 + sin(frameCount * 0.08) * 40);
      strokeWeight(1);
      noFill();
      rect(gx, ry, bw, bh, 3);
      noStroke();
    }
    fill(g.icon);
    ellipse(gx + 8, ry + bh / 2, 6, 6);
    fill(canAfford ? 220 : 120);
    textSize(7);
    text(g.name, gx + 14, ry + 4);
    textSize(6);
    let effectiveGold = inDemand ? floor(g.goldPerTrip * 1.5) : g.goldPerTrip;
    fill(inDemand ? color(255, 220, 80) : (canAfford ? color(180, 170, 120) : color(100, 90, 80)));
    text(effectiveGold + 'g' + (inDemand ? ' +50%' : ''), gx + 14, ry + 13);
    gx += bw + 3;
    if (i === 2) { gx = px + 15; ry += bh + 4; }
  }

  // Instructions
  ry += 30;
  fill(120, 110, 90);
  textSize(8); textAlign(CENTER, TOP);
  text('Click a good to create route  |  ESC or R to close', width / 2, ry);

  // Colony spec status
  if (state.colonySpec['conquest']) {
    let spec = COLONY_SPECS[state.colonySpec['conquest']];
    fill(spec.color);
    textSize(8);
    text('Spec: ' + spec.name + ' — ' + spec.desc, width / 2, py + ph - 18);
  }

  pop();
}

// ─── COLONY SPEC SELECT UI ──────────────────────────────────────────────────

function drawColonySpecSelectUI() {
  if (!_specSelectOpen) return;
  push();

  let pw = 280, ph = 180;
  let px = width / 2 - pw / 2, py = height / 2 - ph / 2;

  fill(15, 12, 8, 240);
  stroke(200, 170, 80);
  strokeWeight(2);
  rect(px, py, pw, ph, 8);
  noStroke();

  fill(240, 220, 160);
  textSize(13); textAlign(CENTER, TOP);
  text('CHOOSE COLONY SPECIALIZATION', width / 2, py + 12);

  let specKeys = Object.keys(COLONY_SPECS);
  let sy = py + 38;
  for (let i = 0; i < specKeys.length; i++) {
    let sk = specKeys[i];
    let sp = COLONY_SPECS[sk];
    fill(30, 28, 22, 200);
    rect(px + 12, sy, pw - 24, 34, 5);
    fill(sp.color);
    textSize(11); textAlign(LEFT, TOP);
    text('[' + (i + 1) + '] ' + sp.name, px + 20, sy + 4);
    fill(170, 160, 130);
    textSize(8);
    text(sp.desc, px + 20, sy + 19);
    sy += 40;
  }

  fill(120, 110, 90);
  textSize(8); textAlign(CENTER, TOP);
  text('Press 1, 2, or 3 to choose', width / 2, py + ph - 18);

  pop();
}

// ─── KEY HANDLERS ────────────────────────────────────────────────────────────

function handleEconomyKey(k, kCode) {
  // Prestige UI
  if (handlePrestigeKey(k, kCode)) return true;

  // Colony spec selection
  if (_specSelectOpen) {
    let specKeys = Object.keys(COLONY_SPECS);
    if (k >= '1' && k <= '3') {
      let idx = parseInt(k) - 1;
      if (idx < specKeys.length) selectColonySpec(specKeys[idx]);
      return true;
    }
    if (kCode === 27) { _specSelectOpen = false; return true; }
    return true; // block other keys
  }

  // Trade route UI
  if (state.tradeRouteUI) {
    if (kCode === 27 || k === 'r' || k === 'R') {
      state.tradeRouteUI = false;
      return true;
    }
    // Cancel route with number keys
    if (k >= '1' && k <= '3') {
      let idx = parseInt(k) - 1;
      if (idx < state.tradeRoutes.length) {
        removeTradeRoute(state.tradeRoutes[idx].id);
      }
      return true;
    }
    return true; // block other keys while panel open
  }

  // Open trade route UI with R near port
  if ((k === 'r' || k === 'R') && !state.conquest.active && !state.adventure.active && !state.rowing.active) {
    let port = getPortPosition();
    let d = dist(state.player.x, state.player.y, port.x, port.y);
    if (d < 80 && state.conquest.colonized) {
      state.tradeRouteUI = true;
      return true;
    }
  }

  return false;
}

// Handle trade route UI mouse clicks
function handleEconomyClick(mx, my) {
  if (handlePrestigeClick(mx, my)) return true;
  if (!state.tradeRouteUI) return false;

  // Check if clicking on a good button to create route
  let pw = 320, ph = 260;
  let px = width / 2 - pw / 2, py = height / 2 - ph / 2;
  let routeCount = state.tradeRoutes.length;
  let ry = py + 52 + (routeCount > 0 ? routeCount * 34 : 18) + 24;

  let goodKeys = Object.keys(TRADE_GOODS);
  let gx = px + 15;
  for (let i = 0; i < goodKeys.length; i++) {
    let bw = 46, bh = 22;
    if (mx >= gx && mx <= gx + bw && my >= ry && my <= ry + bh) {
      createTradeRoute(goodKeys[i]);
      return true;
    }
    gx += bw + 3;
    if (i === 2) { gx = px + 15; ry += bh + 4; }
  }
  return false;
}

// ─── MARKET DEMAND SYSTEM ───────────────────────────────────────────────────

// 2 goods are "in demand" each day — selling them via trade routes gives +50% gold
let _currentDemand = [];
let _demandDay = -1;

function updateMarketDemand() {
  let day = state.day || 0;
  if (day === _demandDay) return;
  _demandDay = day;
  let goodKeys = Object.keys(TRADE_GOODS);
  // Pick 2 demand goods, seeded by day
  let seed = day * 7 + 31;
  let i1 = Math.floor(_hannoSeededRandom(seed) * goodKeys.length);
  let i2 = Math.floor(_hannoSeededRandom(seed + 99) * (goodKeys.length - 1));
  if (i2 >= i1) i2++;
  _currentDemand = [goodKeys[i1], goodKeys[i2]];
  // Notify on day transition if player has trade routes
  if (state.tradeRoutes.length > 0 || state.conquest.colonized) {
    let names = _currentDemand.map(k => TRADE_GOODS[k].name);
    addNotification('Market demand: ' + names.join(' & ') + ' (+50% gold)', '#ddaa44');
  }
}

function isGoodInDemand(goodKey) {
  return _currentDemand.includes(goodKey);
}

function getDemandBonus(goodKey) {
  return isGoodInDemand(goodKey) ? 1.5 : 1.0;
}

function getCurrentDemandGoods() {
  return _currentDemand;
}

// ─── MAIN UPDATE (called from sketch.js hook) ──────────────────────────────

let _prestigeInited = false;
function updateEconomySystem(dt) {
  if (!_prestigeInited) { initPrestigeState(); _prestigeInited = true; }
  updateMarketDemand();
  updateMarketPrices();
  updateTradeRoutes(dt);
  updateAutomation(dt);
}

// ─── MAIN DRAW (called from sketch.js hooks) ────────────────────────────────

function drawEconomyWorldOverlay() {
  // Trade route paths and ships (world space — called inside translate block)
  if (state.tradeRoutes.length > 0) {
    drawTradeRoutePaths();
    drawTradeShips();
  }
}

function drawEconomyUIOverlay() {
  drawTradeRouteUI();
  drawColonySpecSelectUI();
  drawPrestigeUI();

  // Port hint when near port and colony exists
  if (!state.tradeRouteUI && !state.conquest.active && !state.rowing.active && state.conquest.colonized) {
    let port = getPortPosition();
    let d = dist(state.player.x, state.player.y, port.x, port.y);
    if (d < 80) {
      push();
      noStroke();
      let portSX = w2sX(port.x), portSY = w2sY(port.y);
      fill(200, 190, 140, 180);
      textSize(9); textAlign(CENTER, CENTER);
      text('[R] Trade Routes', portSX, portSY - 25);
      // Show demand goods as a hint near port
      let dg = getCurrentDemandGoods();
      if (dg.length > 0) {
        let dNames = dg.map(k => TRADE_GOODS[k] ? TRADE_GOODS[k].name : k);
        fill(255, 220, 80, 160 + sin(frameCount * 0.06) * 40);
        textSize(7);
        text('Demand: ' + dNames.join(', ') + ' (+50%)', portSX, portSY - 13);
      }
      pop();
    }
  }
}

// ─── HANNO'S MERCHANT STOCK ─────────────────────────────────────────────────

const HANNO_STOCK_POOL = [
  // Tools & upgrades
  { id: 'copper_hook',     name: 'Copper Hook',      price: 25,  currency: 'gold', category: 'tool',     desc: 'Better fishing line -- catch rate +20%' },
  { id: 'iron_sickle',     name: 'Iron Sickle',      price: 40,  currency: 'gold', category: 'tool',     desc: 'Harvest two crops at once' },
  { id: 'bronze_lantern',  name: 'Bronze Lantern',   price: 30,  currency: 'gold', category: 'tool',     desc: 'See further at night' },
  // Seeds & farming
  { id: 'saffron_seeds',   name: 'Saffron Seeds',    price: 35,  currency: 'gold', category: 'seed',     desc: 'Exotic spice -- grows in summer only' },
  { id: 'silk_cotton',     name: 'Silk Cotton Seeds', price: 50,  currency: 'gold', category: 'seed',     desc: 'Rare fiber crop -- high trade value' },
  { id: 'imported_emmer',  name: 'Imported Emmer',   price: 20,  currency: 'gold', category: 'seed',     desc: 'Hardy wheat -- grows in any season' },
  // Materials
  { id: 'etruscan_marble', name: 'Etruscan Marble',  price: 60,  currency: 'gold', category: 'material', desc: '3 white stone blocks for building' },
  { id: 'phoenician_dye',  name: 'Phoenician Dye',   price: 45,  currency: 'gold', category: 'material', desc: 'Purple dye -- cosmetic unlock ingredient' },
  { id: 'damascus_iron',   name: 'Damascus Iron',    price: 55,  currency: 'gold', category: 'material', desc: '5 iron ingots of superior quality' },
  // Food & recipes
  { id: 'cretan_honey',    name: 'Cretan Honey',     price: 15,  currency: 'gold', category: 'food',     desc: 'Sweet honey -- gift for any NPC (+2 hearts)' },
  { id: 'garum_amphora',   name: 'Garum Amphora',    price: 20,  currency: 'gold', category: 'food',     desc: 'Fermented fish sauce -- cooking ingredient' },
  { id: 'alexandrian_wine',name: 'Alexandrian Wine',  price: 35,  currency: 'gold', category: 'food',     desc: 'Fine wine -- doubles feast effect' },
  // Rare collectibles
  { id: 'etruscan_coin',   name: 'Etruscan Coin',    price: 80,  currency: 'gold', category: 'relic',    desc: 'Ancient coin -- adds to Codex relic collection' },
  { id: 'greek_scroll',    name: 'Greek Scroll',     price: 70,  currency: 'gold', category: 'relic',    desc: 'Philosophical text -- Felix loves these' },
  { id: 'persian_rug',     name: 'Persian Rug',      price: 90,  currency: 'gold', category: 'relic',    desc: 'Decorative -- unlocks villa carpet cosmetic' },
  // Crystal & magic
  { id: 'charged_crystal', name: 'Charged Crystal',  price: 3,   currency: 'crystals', category: 'crystal', desc: 'Pre-charged -- 100 solar energy stored' },
  { id: 'crystal_lens',    name: 'Crystal Lens',     price: 5,   currency: 'crystals', category: 'crystal', desc: 'Focus lens -- crystal shrine charge rate +50%' },
  // Combat
  { id: 'gladius_oil',     name: 'Gladius Oil',      price: 30,  currency: 'gold', category: 'combat',   desc: 'Weapon maintenance -- +3 damage for 5 fights' },
  { id: 'health_salve',    name: 'Health Salve',     price: 20,  currency: 'gold', category: 'combat',   desc: 'Healing potion -- restores 50 HP' },
  { id: 'shield_polish',   name: 'Shield Polish',    price: 25,  currency: 'gold', category: 'combat',   desc: 'Block chance +15% for 3 fights' },
];

// ─── HANNO'S DAILY DIALOGUE ─────────────────────────────────────────────────

const HANNO_DIALOGUE = [
  "Hanno of Carthage, at your service. I've sailed worse seas for lesser ports.",
  "The winds favored me today. See anything you like? I won't be here long.",
  "Business is business, friend. But between us -- I keep the good stuff for regulars.",
  "My grandfather traded with Rome. Look how that turned out. Still, coin is coin.",
  "I've heard stories about this island. Crystal towers? Glowing water? You Romans are strange.",
  "Every port has its treasure. Yours is that temple. Mine is knowing when to leave.",
  "Fresh stock from Carthage, Alexandria, and one very suspicious port in Crete.",
];

// Seeded random -- deterministic per day
function _hannoSeededRandom(seed) {
  let x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

// Get Hanno's stock for a given day
function getHannoStock(dayCount) {
  let daySeed = Math.floor(Date.now() / 86400000); // real-world day
  let isMarketDay = dayCount % 7 === 0;
  let numSlots = isMarketDay ? 5 : 3;

  // Deterministic shuffle using day seed
  let indices = [];
  for (let i = 0; i < HANNO_STOCK_POOL.length; i++) indices.push(i);
  // Fisher-Yates with seeded random
  for (let i = indices.length - 1; i > 0; i--) {
    let j = Math.floor(_hannoSeededRandom(daySeed * 1000 + i) * (i + 1));
    let tmp = indices[i]; indices[i] = indices[j]; indices[j] = tmp;
  }

  let stock = [];
  for (let s = 0; s < numSlots && s < indices.length; s++) {
    let item = Object.assign({}, HANNO_STOCK_POOL[indices[s]]);
    // Quantity: 1-3 per item
    item.qty = 1 + Math.floor(_hannoSeededRandom(daySeed * 100 + s * 7) * 3);
    // Rare flag: ~1 in 7 chance per slot
    item.isRare = _hannoSeededRandom(daySeed * 50 + s * 13) < 0.143;
    // Market day discount
    if (isMarketDay) item.price = Math.floor(item.price * 0.8);
    stock.push(item);
  }
  return stock;
}

// Get Hanno's daily dialogue line
function getHannoDialogue(dayCount) {
  let daySeed = Math.floor(Date.now() / 86400000);
  let idx = Math.floor(_hannoSeededRandom(daySeed * 777) * HANNO_DIALOGUE.length);
  return HANNO_DIALOGUE[idx];
}

// Check if today is market day
function isMarketDay(dayCount) {
  return dayCount % 7 === 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── DYNAMIC MARKET PRICES ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

const MARKET_BASE_PRICES = {
  // Sell prices (player sells TO merchant): resource -> gold
  harvest: { base: 2, min: 1, max: 4 },
  crystals: { base: 4, min: 2, max: 6 },
  wood: { base: 1, min: 1, max: 2 },
  fish: { base: 3, min: 2, max: 5 },
  stone: { base: 1, min: 1, max: 2 },
  wine: { base: 5, min: 3, max: 8 },
  oil: { base: 4, min: 2, max: 6 },
  obsidian: { base: 6, min: 4, max: 10 },
  frostCrystal: { base: 7, min: 4, max: 11 },
  exoticSpices: { base: 5, min: 3, max: 8 },
  // Buy prices (player buys FROM merchant): gold -> resource
  seeds: { base: 1, min: 1, max: 2 },
  grapeSeeds: { base: 2, min: 1, max: 3 },
  oliveSeeds: { base: 2, min: 1, max: 3 },
  flaxSeeds: { base: 2, min: 1, max: 3 },
  pomegranateSeeds: { base: 4, min: 2, max: 6 },
  lotusSeeds: { base: 5, min: 3, max: 8 },
};

// Track what player sold yesterday — drives next-day price drop
let _marketSellHistory = {}; // { resource: qtySold }
let _marketPrices = {};      // { resource: { price, trend } } trend: -1, 0, +1
let _marketPriceDay = -1;

function updateMarketPrices() {
  let day = state.day || 0;
  if (day === _marketPriceDay) return;
  let prevPrices = {};
  for (let k in _marketPrices) prevPrices[k] = _marketPrices[k].price;
  _marketPriceDay = day;
  let mDay = isMarketDay(day);
  let prestige = state.prestige ? state.prestige.count : 0;

  for (let res in MARKET_BASE_PRICES) {
    let mb = MARKET_BASE_PRICES[res];
    let base = mb.base;
    // Prestige makes prices slightly higher (economy inflates)
    base = Math.floor(base * (1 + prestige * 0.1));
    // Random daily modifier: -20% to +30%
    let rand = _hannoSeededRandom(day * 31 + res.length * 7 + 13);
    let modifier = 0.8 + rand * 0.5; // 0.8 to 1.3
    // Market day bonus: +20% sell, -15% buy
    if (mDay) {
      if (['seeds','grapeSeeds','oliveSeeds','flaxSeeds','pomegranateSeeds','lotusSeeds'].includes(res)) {
        modifier *= 0.85; // cheaper to buy
      } else {
        modifier *= 1.2; // better sell price
      }
    }
    // Supply/demand: if player sold a lot yesterday, price drops
    let sold = _marketSellHistory[res] || 0;
    if (sold > 0) {
      let dropPct = Math.min(0.3, sold * 0.05); // -5% per unit sold, max -30%
      modifier *= (1 - dropPct);
    }
    let finalPrice = Math.max(mb.min, Math.min(mb.max, Math.round(base * modifier)));
    let trend = 0;
    if (prevPrices[res] !== undefined) {
      if (finalPrice > prevPrices[res]) trend = 1;
      else if (finalPrice < prevPrices[res]) trend = -1;
    }
    _marketPrices[res] = { price: finalPrice, trend: trend };
  }
  // Reset sell history for tomorrow
  _marketSellHistory = {};
}

function getMarketPrice(resource) {
  if (_marketPrices[resource]) return _marketPrices[resource].price;
  let mb = MARKET_BASE_PRICES[resource];
  return mb ? mb.base : 1;
}

function getMarketTrend(resource) {
  if (_marketPrices[resource]) return _marketPrices[resource].trend;
  return 0;
}

function recordMarketSell(resource, qty) {
  _marketSellHistory[resource] = (_marketSellHistory[resource] || 0) + qty;
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── PRESTIGE SYSTEM (New Game+) ───────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function initPrestigeState() {
  if (!state.prestige) {
    state.prestige = {
      count: 0,            // number of times prestiged
      totalScore: 0,       // cumulative score across all runs
      unlockedBuildings: [],// prestige building IDs unlocked
    };
  }
  if (!state.score) {
    state.score = {
      goldEarned: 0,
      buildingsBuilt: 0,
      questsCompleted: 0,
      fishCaught: 0,
      enemiesDefeated: 0,
      daysSurvived: 0,
    };
  }
  if (!state.automation) {
    state.automation = {
      granaryAuto: false,      // auto-harvest ripe crops
      fishingPier: false,      // generates fish/day
      tradeRouteAuto: false,   // trade routes run 2x speed
      watchtowerAuto: false,   // auto-defend vs raiders
    };
  }
}

const PRESTIGE_BUILDINGS = {
  colosseum: {
    name: 'Colosseum',
    desc: 'Gladiatorial games generate 10g/day passively',
    cost: { stone: 30, gold: 200, ironOre: 10 },
    minLevel: 20,
    w: 96, h: 72, blocks: true,
    effect: 'passiveGold',
    dailyGold: 10,
  },
  lighthouse: {
    name: 'Lighthouse',
    desc: 'Guides fishermen — fishing yields +50%',
    cost: { stone: 20, wood: 15, crystals: 10 },
    minLevel: 15,
    w: 28, h: 64, blocks: true,
    effect: 'fishBonus',
    fishMult: 1.5,
  },
  observatory: {
    name: 'Observatory',
    desc: 'Predict weather — shows next 3 days forecast',
    cost: { stone: 25, crystals: 15, gold: 100 },
    minLevel: 18,
    w: 40, h: 50, blocks: true,
    effect: 'weatherPredict',
  },
};

const AUTOMATION_COSTS = {
  granaryAuto: { gold: 150, wood: 30, stone: 20, ironOre: 8 },
  fishingPier: { gold: 120, wood: 25, stone: 15 },
  tradeRouteAuto: { gold: 200, wood: 20, crystals: 10 },
  watchtowerAuto: { gold: 180, stone: 25, ironOre: 10 },
};

function canAffordAutomation(autoKey) {
  let cost = AUTOMATION_COSTS[autoKey];
  if (!cost) return false;
  for (let k in cost) {
    let have = (k === 'gold') ? state.gold : (state[k] || 0);
    if (have < cost[k]) return false;
  }
  return true;
}

function buyAutomation(autoKey) {
  if (!canAffordAutomation(autoKey)) return false;
  let cost = AUTOMATION_COSTS[autoKey];
  for (let k in cost) {
    if (k === 'gold') state.gold -= cost[k];
    else state[k] -= cost[k];
  }
  state.automation[autoKey] = true;
  addFloatingText(width / 2, height * 0.25, 'Automation unlocked!', '#44ffaa');
  addNotification('Automation: ' + autoKey.replace(/([A-Z])/g, ' $1').trim() + ' activated', '#44ffaa');
  return true;
}

function hasPrestigeBuilding(bType) {
  return state.prestige && state.prestige.unlockedBuildings &&
    state.prestige.unlockedBuildings.includes(bType);
}

function canAffordPrestigeBuilding(bType) {
  let pb = PRESTIGE_BUILDINGS[bType];
  if (!pb) return false;
  let cost = pb.cost;
  for (let k in cost) {
    let have = (k === 'gold') ? state.gold : (state[k] || 0);
    if (have < cost[k]) return false;
  }
  return true;
}

function buyPrestigeBuilding(bType) {
  if (hasPrestigeBuilding(bType)) return false;
  if (!canAffordPrestigeBuilding(bType)) return false;
  let pb = PRESTIGE_BUILDINGS[bType];
  for (let k in pb.cost) {
    if (k === 'gold') state.gold -= pb.cost[k];
    else state[k] -= pb.cost[k];
  }
  state.prestige.unlockedBuildings.push(bType);
  addFloatingText(width / 2, height * 0.2, pb.name + ' built!', '#ffdd44');
  addNotification('Prestige building: ' + pb.name + ' — ' + pb.desc, '#ffdd44');
  return true;
}

// ─── PRESTIGE (New Game+) TRIGGER ───────────────────────────────────────

function canPrestige() {
  return state.won && state.mainQuest && state.mainQuest.chapter >= 9;
}

function doPrestige() {
  if (!canPrestige()) return;
  let finalScore = calculateScore();
  let count = (state.prestige ? state.prestige.count : 0) + 1;
  let totalScore = (state.prestige ? state.prestige.totalScore : 0) + finalScore;
  let unlockedBuildings = state.prestige ? [...state.prestige.unlockedBuildings] : [];
  // Keep tools
  let tools = { ...state.tools };
  // Keep faction
  let faction = state.faction || 'rome';
  // Keep some resources (50% of each)
  let keepGold = Math.floor((state.gold || 0) * 0.5);
  let keepCrystals = Math.floor((state.crystals || 0) * 0.5);
  let keepIron = Math.floor((state.ironOre || 0) * 0.5);
  // Keep achievement/codex progress
  let codex = state.codex ? JSON.parse(JSON.stringify(state.codex)) : null;
  let achievements = state.achievements ? [...state.achievements] : [];
  let arenaHigh = state.arenaHighWave || 0;

  // Reset game state
  initState();

  // NG+ skips wreck beach — start on home island directly
  state.introPhase = 'done';
  state.progression.gameStarted = true;
  state.progression.homeIslandReached = true;
  state.progression.villaCleared = true;
  state.progression.farmCleared = true;
  state.progression.wreckExplored = true;
  state.progression.npcsFound = { livia: true, marcus: true, vesta: true, felix: true };
  state.progression.companionsAwakened = { lares: true, woodcutter: true, harvester: true, centurion: true };
  state.faction = faction;

  // Restore kept progress
  state.prestige = { count: count, totalScore: totalScore, unlockedBuildings: unlockedBuildings };
  state.score = { goldEarned: 0, buildingsBuilt: 0, questsCompleted: 0, fishCaught: 0, enemiesDefeated: 0, daysSurvived: 0 };
  state.automation = { granaryAuto: false, fishingPier: false, tradeRouteAuto: false, watchtowerAuto: false };
  state.tools = tools;
  state.gold = keepGold;
  state.crystals = keepCrystals;
  state.ironOre = keepIron;
  if (codex) state.codex = codex;
  state.achievements = achievements;
  state.arenaHighWave = arenaHigh;

  // Initialize systems that depend on state being set up
  if (typeof initConquestIsland === 'function') initConquestIsland();
  if (typeof initNarrativeState === 'function') initNarrativeState();
  if (typeof initNations === 'function') initNations();
  if (typeof initFactionAbilities === 'function') initFactionAbilities();

  // Prestige difficulty scaling
  // (Applied via getPrestigeDifficultyMult in gameplay checks)

  addFloatingText(width / 2, height * 0.2, 'NEW GAME+ (Prestige ' + count + ')', '#ffdd44');
  addNotification('Prestige ' + count + '! World is harder. New buildings unlocked.', '#ffdd44');
}

function getPrestigeDifficultyMult() {
  let p = state.prestige ? state.prestige.count : 0;
  return 1 + p * 0.25; // +25% difficulty per prestige
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── AUTOMATION ENDGAME ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function updateAutomation(dt) {
  if (!state.automation) return;
  // Auto-harvest: collect ripe crops automatically
  if (state.automation.granaryAuto && state.plots) {
    for (let p of state.plots) {
      if (p.ripe && p.planted) {
        let amt = 1;
        if (state.tools.sickle) amt = 2;
        if (p.cropType === 'grain') { state.harvest += amt; state.seeds += 1; }
        else if (p.cropType === 'grape') state.wine = (state.wine || 0) + amt;
        else if (p.cropType === 'olive') state.oil = (state.oil || 0) + amt;
        else if (p.cropType === 'flax') state.harvest += amt;
        else state.harvest += amt;
        p.planted = false; p.ripe = false; p.stage = 0; p.timer = 0;
        if (state.score) state.score.goldEarned += 0; // tracked by gold gain elsewhere
      }
    }
  }
  // Auto-defend: watchtower shoots at raid parties from all nations
  if (state.automation.watchtowerAuto && state.nations) {
    let _wtKeys = Object.keys(state.nations);
    for (let _wtk of _wtKeys) {
      let _wtn = state.nations[_wtk];
      if (!_wtn || !_wtn.raidParty || _wtn.raidParty.length === 0) continue;
      for (let i = _wtn.raidParty.length - 1; i >= 0; i--) {
        let r = _wtn.raidParty[i];
        r.hp -= 2 * dt;
        if (r.hp <= 0) {
          _wtn.raidParty.splice(i, 1);
          if (state.score) state.score.enemiesDefeated++;
          addFloatingText(width / 2, height * 0.4, 'Watchtower defends!', '#44aaff');
        }
      }
    }
  }
  // Trade route auto: 2x ship speed
  if (state.automation.tradeRouteAuto) {
    // Applied in updateTradeRoutes via getTradeSpeedMult()
  }
}

function getTradeSpeedMult() {
  let m = (state.automation && state.automation.tradeRouteAuto) ? 2.0 : 1.0;
  if (typeof hasTech === 'function' && hasTech('celestial_navigation')) m *= 1.15;
  return m;
}

// Daily automation income (called from onDayTransitionEconomy)
function processAutomationDaily() {
  if (!state.automation) return;
  // Fishing pier: generates fish per day
  if (state.automation.fishingPier) {
    let fishAmt = 4;
    if (hasPrestigeBuilding('lighthouse')) fishAmt = Math.floor(fishAmt * 1.5);
    state.fish += fishAmt;
    if (state.score) state.score.fishCaught += fishAmt;
    addNotification('Fishing pier: +' + fishAmt + ' fish', '#4488aa');
  }
  // Colosseum passive gold
  if (hasPrestigeBuilding('colosseum')) {
    let goldAmt = PRESTIGE_BUILDINGS.colosseum.dailyGold;
    state.gold += goldAmt;
    if (state.score) state.score.goldEarned += goldAmt;
    addNotification('Colosseum games: +' + goldAmt + 'g', '#ddaa44');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── SCORING / LEADERBOARD ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function calculateScore() {
  if (!state.score) return 0;
  let s = state.score;
  return (s.goldEarned * 1) +
    (s.buildingsBuilt * 10) +
    (s.questsCompleted * 50) +
    (s.fishCaught * 5) +
    (s.enemiesDefeated * 3) +
    (s.daysSurvived * 2);
}

function getScoreBreakdown() {
  if (!state.score) return [];
  let s = state.score;
  return [
    { label: 'Gold earned', value: s.goldEarned, points: s.goldEarned * 1 },
    { label: 'Buildings built', value: s.buildingsBuilt, points: s.buildingsBuilt * 10 },
    { label: 'Quests completed', value: s.questsCompleted, points: s.questsCompleted * 50 },
    { label: 'Fish caught', value: s.fishCaught, points: s.fishCaught * 5 },
    { label: 'Enemies defeated', value: s.enemiesDefeated, points: s.enemiesDefeated * 3 },
    { label: 'Days survived', value: s.daysSurvived, points: s.daysSurvived * 2 },
  ];
}

// ─── PRESTIGE / SCORE UI ──────────────────────────────────────────────

let _prestigeUIOpen = false;

function drawPrestigeUI() {
  if (!_prestigeUIOpen) return;
  push();

  let pw = 380, ph = 420;
  let px = width / 2 - pw / 2, py = height / 2 - ph / 2;

  // Panel
  fill(15, 12, 8, 240);
  stroke(200, 170, 60);
  strokeWeight(2);
  rect(px, py, pw, ph, 8);
  noStroke();

  // Title
  fill(255, 220, 100);
  textSize(16); textAlign(CENTER, TOP);
  let pCount = state.prestige ? state.prestige.count : 0;
  text('IMPERATOR LEGACY' + (pCount > 0 ? '  [Prestige ' + pCount + ']' : ''), width / 2, py + 12);

  // Score breakdown
  let breakdown = getScoreBreakdown();
  let sy = py + 42;
  fill(180, 170, 130); textSize(10); textAlign(LEFT, TOP);
  for (let i = 0; i < breakdown.length; i++) {
    let b = breakdown[i];
    fill(40, 35, 28, 180);
    rect(px + 12, sy, pw - 24, 22, 3);
    fill(200, 190, 150); textSize(9); textAlign(LEFT, TOP);
    text(b.label + ': ' + b.value, px + 20, sy + 6);
    fill(255, 220, 80); textAlign(RIGHT, TOP);
    text('+' + b.points + ' pts', px + pw - 20, sy + 6);
    sy += 26;
  }

  // Total score
  sy += 8;
  fill(255, 230, 120); textSize(14); textAlign(CENTER, TOP);
  text('TOTAL SCORE: ' + calculateScore(), width / 2, sy);
  if (pCount > 0) {
    sy += 20;
    fill(200, 190, 140); textSize(9);
    text('Cumulative: ' + ((state.prestige ? state.prestige.totalScore : 0) + calculateScore()), width / 2, sy);
  }

  // Prestige buildings section
  sy += 30;
  fill(220, 200, 140); textSize(12); textAlign(CENTER, TOP);
  text('PRESTIGE BUILDINGS', width / 2, sy);
  sy += 18;

  let pbKeys = Object.keys(PRESTIGE_BUILDINGS);
  for (let i = 0; i < pbKeys.length; i++) {
    let bk = pbKeys[i];
    let pb = PRESTIGE_BUILDINGS[bk];
    let owned = hasPrestigeBuilding(bk);
    let canBuy = !owned && canAffordPrestigeBuilding(bk) && pCount > 0;
    fill(owned ? color(30, 50, 30, 200) : color(40, 35, 28, 180));
    rect(px + 12, sy, pw - 24, 32, 4);
    fill(owned ? color(100, 220, 100) : (canBuy ? color(220, 200, 150) : color(120, 110, 90)));
    textSize(10); textAlign(LEFT, TOP);
    text((owned ? '[BUILT] ' : '') + pb.name, px + 20, sy + 4);
    fill(160, 150, 120); textSize(7);
    text(pb.desc, px + 20, sy + 18);
    if (!owned && pCount > 0) {
      let costStr = Object.entries(pb.cost).map(([k, v]) => v + ' ' + k).join(', ');
      fill(canBuy ? color(180, 160, 60) : color(100, 90, 70));
      textSize(7); textAlign(RIGHT, TOP);
      text(costStr, px + pw - 20, sy + 4);
    }
    sy += 36;
  }

  // Automation section
  sy += 4;
  fill(220, 200, 140); textSize(12); textAlign(CENTER, TOP);
  text('AUTOMATION', width / 2, sy);
  sy += 18;

  let autoNames = { granaryAuto: 'Auto-Harvest Granary', fishingPier: 'Fishing Pier', tradeRouteAuto: 'Trade Route Express', watchtowerAuto: 'Watchtower Defense' };
  let autoDescs = { granaryAuto: 'Auto-collect ripe crops', fishingPier: 'Generates fish daily', tradeRouteAuto: 'Trade ships sail 2x speed', watchtowerAuto: 'Auto-defend vs raiders' };
  let autoKeys = Object.keys(AUTOMATION_COSTS);
  for (let i = 0; i < autoKeys.length; i++) {
    let ak = autoKeys[i];
    let owned = state.automation && state.automation[ak];
    let canBuy = !owned && canAffordAutomation(ak);
    fill(owned ? color(30, 50, 30, 200) : color(40, 35, 28, 180));
    rect(px + 12, sy, pw - 24, 28, 4);
    fill(owned ? color(100, 220, 100) : (canBuy ? color(220, 200, 150) : color(120, 110, 90)));
    textSize(9); textAlign(LEFT, TOP);
    text((owned ? '[ACTIVE] ' : '') + autoNames[ak], px + 20, sy + 4);
    fill(160, 150, 120); textSize(7);
    text(autoDescs[ak], px + 20, sy + 16);
    if (!owned) {
      let cost = AUTOMATION_COSTS[ak];
      let costStr = Object.entries(cost).map(([k, v]) => v + ' ' + k).join(', ');
      fill(canBuy ? color(180, 160, 60) : color(100, 90, 70));
      textSize(7); textAlign(RIGHT, TOP);
      text(costStr, px + pw - 20, sy + 4);
    }
    sy += 32;
  }

  // New Game+ button
  if (canPrestige()) {
    sy += 8;
    let btnW = 180, btnH = 30;
    let btnX = width / 2 - btnW / 2;
    fill(120, 80, 20, 220);
    stroke(255, 200, 60);
    strokeWeight(1);
    rect(btnX, sy, btnW, btnH, 6);
    noStroke();
    fill(255, 230, 100);
    textSize(12); textAlign(CENTER, CENTER);
    text('NEW GAME+ (Prestige)', width / 2, sy + btnH / 2);
  }

  // Close hint
  fill(120, 110, 90); textSize(8); textAlign(CENTER, TOP);
  text('ESC to close', width / 2, py + ph - 16);

  pop();
}

function handlePrestigeClick(mx, my) {
  if (!_prestigeUIOpen) return false;
  let pw = 380, ph = 420;
  let px = width / 2 - pw / 2, py = height / 2 - ph / 2;
  let pCount = state.prestige ? state.prestige.count : 0;

  // Prestige buildings click
  let sy = py + 42 + getScoreBreakdown().length * 26 + 8 + 20 + (pCount > 0 ? 20 : 0) + 30 + 18;
  let pbKeys = Object.keys(PRESTIGE_BUILDINGS);
  for (let i = 0; i < pbKeys.length; i++) {
    let bk = pbKeys[i];
    if (mx >= px + 12 && mx <= px + pw - 12 && my >= sy && my <= sy + 32) {
      if (!hasPrestigeBuilding(bk) && pCount > 0) {
        buyPrestigeBuilding(bk);
        return true;
      }
    }
    sy += 36;
  }

  // Automation click
  sy += 4 + 18;
  let autoKeys = Object.keys(AUTOMATION_COSTS);
  for (let i = 0; i < autoKeys.length; i++) {
    let ak = autoKeys[i];
    if (mx >= px + 12 && mx <= px + pw - 12 && my >= sy && my <= sy + 28) {
      if (!state.automation[ak]) {
        buyAutomation(ak);
        return true;
      }
    }
    sy += 32;
  }

  // New Game+ button
  if (canPrestige()) {
    sy += 8;
    let btnW = 180, btnH = 30;
    let btnX = width / 2 - btnW / 2;
    if (mx >= btnX && mx <= btnX + btnW && my >= sy && my <= sy + btnH) {
      doPrestige();
      _prestigeUIOpen = false;
      return true;
    }
  }

  return false;
}

function handlePrestigeKey(k, kCode) {
  if (_prestigeUIOpen) {
    if (kCode === 27) { _prestigeUIOpen = false; return true; }
    return true;
  }
  // Open prestige UI with P key when won or after chapter 10
  if ((k === 'p' || k === 'P') && !state.conquest.active && !state.adventure.active && !state.rowing.active) {
    if (state.won || (state.mainQuest && state.mainQuest.chapter >= 9)) {
      _prestigeUIOpen = true;
      return true;
    }
  }
  return false;
}

// ─── PRICE TREND ARROWS FOR SHOP UI ──────────────────────────────────

function drawPriceTrendArrow(x, y, trend) {
  push();
  noStroke();
  if (trend > 0) {
    fill(80, 200, 80);
    triangle(x, y - 4, x - 3, y + 2, x + 3, y + 2);
  } else if (trend < 0) {
    fill(200, 80, 80);
    triangle(x, y + 4, x - 3, y - 2, x + 3, y - 2);
  } else {
    fill(160, 160, 120);
    rect(x - 3, y - 1, 6, 2);
  }
  pop();
}

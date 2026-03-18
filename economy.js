// MARE NOSTRUM — Economy & Trade System
// Loaded after sketch.js. Uses global state.

// ─── TRADE ROUTE DEFINITIONS ─────────────────────────────────────────────────

const TRADE_GOODS = {
  grain:   { name: 'Grain',   icon: '#ddcc44', goldPerTrip: 8 },
  wood:    { name: 'Wood',    icon: '#aa8844', goldPerTrip: 6 },
  stone:   { name: 'Stone',   icon: '#888888', goldPerTrip: 7 },
  wine:    { name: 'Wine',    icon: '#884466', goldPerTrip: 12 },
  fish:    { name: 'Fish',    icon: '#4488aa', goldPerTrip: 5 },
  crystal: { name: 'Crystal', icon: '#44ffaa', goldPerTrip: 15 },
};

const MAX_TRADE_ROUTES = 3;
const TRADE_ROUTE_COST = { gold: 50, wood: 20 };
const TRADE_SHIP_SPEED = 0.4;

// ─── COLONY SPECIALIZATION ──────────────────────────────────────────────────

const COLONY_SPECS = {
  agricultural: { name: 'Agricultural', desc: '+30% harvest from colony', color: '#88cc44' },
  mining:       { name: 'Mining',       desc: '2x stone & iron',       color: '#aaaacc' },
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
      route.shipX += (dx / d) * TRADE_SHIP_SPEED * dt;
      route.shipY += (dy / d) * TRADE_SHIP_SPEED * dt;
    } else {
      // Arrived
      if (route.tripPhase === 'outbound') {
        route.tripPhase = 'returning';
      } else {
        // Completed a round trip
        route.tripPhase = 'outbound';
        let goldGain = TRADE_GOODS[route.good].goldPerTrip;
        // Trading spec doubles gold
        if (state.colonySpec['conquest'] === 'trading') goldGain *= 2;
        state.gold += goldGain;
        route.goldEarned += goldGain;
        addFloatingText(width / 2, height * 0.35, '+' + goldGain + 'g from ' + TRADE_GOODS[route.good].name + ' trade', '#ddcc44');
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
    income += base;
  }
  // Upkeep: 2 gold per route
  let upkeep = state.tradeRoutes.filter(r => r.active).length * 2;
  return { income, upkeep, net: income - upkeep };
}

// Hook into day transition (called from economy update)
function onDayTransitionEconomy() {
  let c = state.conquest;
  if (!c.colonized) return;

  let trade = calculateDailyTradeIncome();
  let colonyIncome = c.colonyIncome || 0;
  let totalIncome = colonyIncome + trade.net;

  // Apply colony spec bonuses to harvest
  if (state.colonySpec['conquest'] === 'agricultural') {
    // +30% harvest bonus applied at harvest time in sketch.js farm plot harvest code
  }
  if (state.colonySpec['conquest'] === 'mining') {
    state.stone += floor(c.colonyLevel * 0.5);
  }

  if (trade.net !== 0) {
    addNotification('Trade: +' + trade.income + 'g income, -' + trade.upkeep + 'g upkeep = ' +
      (trade.net >= 0 ? '+' : '') + trade.net + 'g', '#ddcc66');
    state.gold += trade.net;
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
    fill(canAfford ? color(40, 50, 35, 200) : color(40, 35, 35, 150));
    rect(gx, ry, bw, bh, 3);
    fill(g.icon);
    ellipse(gx + 8, ry + bh / 2, 6, 6);
    fill(canAfford ? 220 : 120);
    textSize(7);
    text(g.name, gx + 14, ry + 4);
    textSize(6);
    fill(canAfford ? color(180, 170, 120) : color(100, 90, 80));
    text(g.goldPerTrip + 'g', gx + 14, ry + 13);
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

// ─── MAIN UPDATE (called from sketch.js hook) ──────────────────────────────

function updateEconomySystem(dt) {
  updateTradeRoutes(dt);
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

  // Port hint when near port and colony exists
  if (!state.tradeRouteUI && !state.conquest.active && !state.rowing.active && state.conquest.colonized) {
    let port = getPortPosition();
    let d = dist(state.player.x, state.player.y, port.x, port.y);
    if (d < 80) {
      push();
      fill(200, 190, 140, 180);
      noStroke();
      textSize(9); textAlign(CENTER, CENTER);
      text('[R] Trade Routes', w2sX(port.x), w2sY(port.y) - 25);
      pop();
    }
  }
}

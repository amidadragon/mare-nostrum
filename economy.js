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
  state.gold = max(0, state.gold - TRADE_ROUTE_COST.gold);
  state.wood = max(0, state.wood - TRADE_ROUTE_COST.wood);

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
    raided: false,
    raidTimer: 0,
    raidSmokeParticles: [],
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

    // Tick down raid timer — ship pauses while being raided
    if (route.raidTimer > 0) {
      route.raidTimer -= dt * 60; // dt is in seconds, timer is in frames
      // Spawn smoke particles during raid
      if (!route.raidSmokeParticles) route.raidSmokeParticles = [];
      if (route.raidSmokeParticles.length < 8 && random() < 0.3) {
        route.raidSmokeParticles.push({ x: random(-10, 10), y: random(-15, 5), life: 60, alpha: 200 });
      }
      for (let sp = route.raidSmokeParticles.length - 1; sp >= 0; sp--) {
        let p = route.raidSmokeParticles[sp];
        p.y -= 0.3; p.alpha -= 3; p.life--;
        if (p.life <= 0 || p.alpha <= 0) route.raidSmokeParticles.splice(sp, 1);
      }
      if (route.raidTimer <= 0) { route.raidTimer = 0; route.raidSmokeParticles = []; }
      continue; // skip movement while raided
    }

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
        let wasRaided = route.raided;
        // Reset raid state for next trip
        route.raided = false;
        route.raidTimer = 0;
        if (wasRaided) {
          // Gold already lost during raid — no income this trip
          addFloatingText(width / 2, height * 0.35, 'Trade cargo lost to raiders!', '#ff6644');
        } else {
          let goldGain = TRADE_GOODS[route.good].goldPerTrip;
          // Faction bonus: Carthage +15% trade income
          if (typeof getFactionData === 'function') goldGain = floor(goldGain * (getFactionData().tradeIncomeMult || 1));
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
          // Reputation price modifier
          if (typeof getReputationPriceMult === 'function') goldGain = max(0, floor(goldGain * (2 - getReputationPriceMult())));
          state.gold += goldGain;
          route.goldEarned += goldGain;
          if (typeof adjustReputation === 'function') adjustReputation(1);
          let demandTag = demandMult > 1 ? ' (DEMAND!)' : '';
          let _tgName = TRADE_GOODS[route.good] ? TRADE_GOODS[route.good].name : route.good;
          addFloatingText(width / 2, height * 0.35, '+' + goldGain + 'g from ' + _tgName + ' trade' + demandTag, demandMult > 1 ? '#ffdd44' : '#ddcc44');
        }
      }
    }
  }
}

// ─── TRADE ROUTE RAIDING ─────────────────────────────────────────────────────

function checkTradeRouteRaids() {
  if (!state.tradeRoutes || state.tradeRoutes.length === 0) return;
  if (state.faction === 'seapeople') return; // Sea People don't raid their own

  for (let route of state.tradeRoutes) {
    if (!route.active) continue;
    if (route.raided) continue; // already raided this trip

    // Base raid chance: 3% per day (Sea People always a threat)
    let raidChance = 0.03;

    // Hostile nations increase raid chance (+2% per hostile nation)
    let hostileNames = [];
    let allyCount = 0;
    if (state.nations) {
      let nKeys = Object.keys(state.nations);
      for (let k of nKeys) {
        let n = state.nations[k];
        if (!n || n.defeated) continue;
        if (n.allied) { allyCount++; continue; }
        if (n.reputation <= -30) {
          raidChance += 0.02;
          hostileNames.push(k);
        }
      }
    }

    // Naval Warfare tech: -50% raid chance
    if (typeof hasTech === 'function' && hasTech('naval_warfare')) raidChance *= 0.5;

    // Watchtowers reduce raids by 10% each (up to 50%)
    if (state.buildings) {
      let towers = state.buildings.filter(b => b.type === 'watchtower').length;
      raidChance *= (1 - min(0.5, towers * 0.1));
    }

    // Allies reduce raids: -10% per ally
    raidChance *= (1 - min(0.3, allyCount * 0.1));

    // Watchtower automation provides additional -15%
    if (state.automation && state.automation.watchtowerAuto) raidChance *= 0.85;

    raidChance = max(0.005, raidChance); // minimum 0.5% floor

    if (random() < raidChance) {
      // Raided!
      route.raided = true;
      route.raidTimer = 300; // ~5 seconds at 60fps
      route.raidShipX = route.shipX + random(-40, 40);
      route.raidShipY = route.shipY + random(-30, 30);
      route.raidSmokeParticles = [];

      let lostGold = TRADE_GOODS[route.good] ? TRADE_GOODS[route.good].goldPerTrip : 15;
      // Faction bonus still applies to loss calculation
      if (typeof getFactionData === 'function') lostGold = floor(lostGold * (getFactionData().tradeIncomeMult || 1));
      route.raidLostGold = lostGold;

      // Deduct gold (can't go below 0)
      state.gold = max(0, state.gold - lostGold);

      // Pick raider name
      let raiderName = 'Sea People';
      if (hostileNames.length > 0 && random() < 0.5) {
        let rk = hostileNames[floor(random(hostileNames.length))];
        raiderName = (typeof getNationName === 'function') ? getNationName(rk) : rk;
      }
      route.raiderName = raiderName;

      addNotification('Trade ship raided by ' + raiderName + '! Lost ' + lostGold + ' gold.', '#ff4444');
      addFloatingText(route.shipX, route.shipY, '-' + lostGold + 'g RAIDED!', '#ff3c3c');
      if (typeof snd !== 'undefined' && snd && snd.playSFX) snd.playSFX('hit');
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
    // Wake (only when not raided/paused)
    if (!route.raided || route.raidTimer <= 0) {
      fill(180, 210, 230, 30);
      ellipse(-14, 2, 8, 3);
      ellipse(-18, 2, 6, 2);
    }

    pop();

    // Raid visual overlay (drawn in screen space, not rotated)
    if (route.raided && route.raidTimer > 0) {
      push();
      // Red flash on trade ship
      let flashAlpha = 60 + sin(frameCount * 0.15) * 40;
      fill(255, 40, 40, flashAlpha);
      noStroke();
      ellipse(sx, sy, 30, 20);

      // Raider ship nearby
      let rsx = w2sX(route.raidShipX || route.shipX + 30);
      let rsy = w2sY(route.raidShipY || route.shipY + 20);
      // Dark raider hull
      fill(40, 30, 25);
      beginShape();
      vertex(rsx - 10, rsy - 1); vertex(rsx - 8, rsy + 3); vertex(rsx + 8, rsy + 3); vertex(rsx + 10, rsy - 1);
      vertex(rsx + 6, rsy - 3); vertex(rsx - 6, rsy - 3);
      endShape(CLOSE);
      // Dark sail
      fill(80, 30, 30, 200);
      beginShape();
      vertex(rsx, rsy - 10); vertex(rsx + 6, rsy - 5); vertex(rsx, rsy - 1);
      endShape(CLOSE);
      // Skull on sail
      fill(200, 180, 160, 180);
      ellipse(rsx + 2, rsy - 6, 3, 3);

      // Smoke particles
      if (route.raidSmokeParticles) {
        for (let p of route.raidSmokeParticles) {
          fill(80, 70, 60, p.alpha);
          ellipse(sx + p.x, sy + p.y, 6, 5);
        }
      }

      // "RAIDED!" text
      if (route.raidTimer > 150) {
        fill(255, 60, 60, min(255, route.raidTimer));
        textSize(10); textAlign(CENTER, CENTER);
        text('RAIDED!', sx, sy - 22);
        textAlign(LEFT, TOP);
      }
      pop();
    }
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
    if (!TRADE_GOODS[route.good]) continue;
    let base = TRADE_GOODS[route.good].goldPerTrip;
    if (state.colonySpec && state.colonySpec['conquest'] === 'trading') base *= 2;
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

  // Check for trade route raids (daily)
  checkTradeRouteRaids();

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

  let pw = 320, ph = 290;
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
      let rIsRaided = r.raided && r.raidTimer > 0;
      fill(rIsRaided ? color(60, 25, 20, 200) : color(40, 35, 28, 180));
      rect(px + 10, ry, pw - 20, 28, 4);
      if (rIsRaided) { stroke(255, 60, 40, 100); strokeWeight(1); noFill(); rect(px + 10, ry, pw - 20, 28, 4); noStroke(); }
      // Good color dot
      fill(g.icon);
      ellipse(px + 24, ry + 14, 8, 8);
      // Text
      fill(rIsRaided ? color(255, 120, 100) : color(220, 200, 150));
      textSize(9);
      let statusTag = rIsRaided ? '  \u2620 RAIDED' : '';
      text(g.name + ' route  |  Earned: ' + r.goldEarned + 'g' + statusTag, px + 34, ry + 4);
      fill(rIsRaided ? color(200, 100, 80) : color(160, 140, 110));
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

  // Raid protection summary
  if (state.tradeRoutes.length > 0) {
    ry += 4;
    let protections = [];
    if (typeof hasTech === 'function' && hasTech('naval_warfare')) protections.push('Naval Warfare -50%');
    if (state.buildings) {
      let tw = state.buildings.filter(b => b.type === 'watchtower').length;
      if (tw > 0) protections.push(tw + ' Watchtower' + (tw > 1 ? 's' : '') + ' -' + min(50, tw * 10) + '%');
    }
    if (state.automation && state.automation.watchtowerAuto) protections.push('Auto-Defense -15%');
    if (state.nations) {
      let allies = Object.keys(state.nations).filter(k => state.nations[k] && state.nations[k].allied).length;
      if (allies > 0) protections.push(allies + ' Ally -' + min(30, allies * 10) + '%');
    }
    fill(120, 140, 130);
    textSize(7);
    text('Raid protection: ' + (protections.length > 0 ? protections.join(', ') : 'NONE — build watchtowers or research Naval Warfare'), px + 15, ry);
    ry += 12;
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
  if ((k === 'r' || k === 'R') && !state.conquest.active && !state.rowing.active) {
    let port = getPortPosition();
    let d = dist(state.player.x, state.player.y, port.x, port.y);
    if (d < 80 && state.conquest.colonized) {
      state.tradeRouteUI = true;
      return true;
    }
  }

  // Colony management UI (C key)
  if (state.colonyManageOpen) {
    if (handleColonyManageKey(k, kCode)) return true;
  }
  if ((k === 'c' || k === 'C') && !state.conquest.active && !state.rowing.active &&
      !state.tradeRouteUI && !state.colonyManageOpen && !state.buildMode) {
    if (Object.keys(state.colonies || {}).length > 0) {
      state.colonyManageOpen = true;
      state.colonyManageSelected = null;
      return true;
    }
  }

  return false;
}

// Handle trade route UI mouse clicks
function handleEconomyClick(mx, my) {
  if (handlePrestigeClick(mx, my)) return true;
  if (handleColonyManageClick(mx, my)) return true;
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
  if (goodKeys.length < 2) { _currentDemand = goodKeys.slice(0, 2); return; }
  let i1 = Math.floor(_hannoSeededRandom(seed) * goodKeys.length);
  let i2 = Math.floor(_hannoSeededRandom(seed + 99) * (goodKeys.length - 1));
  if (i2 >= i1) i2++;
  i2 = Math.min(i2, goodKeys.length - 1);
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
  return;
}

function drawEconomyUIOverlay() {
  drawTradeRouteUI();
  drawColonySpecSelectUI();
  drawPrestigeUI();
  drawColonyManageUI();

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

// ─── SUPPLY & DEMAND MARKET SYSTEM ──────────────────────────────────────
// Supply tracks market saturation per good. Selling increases supply (lowers price),
// buying decreases supply (raises price). Supply drifts toward 50 daily.
let _marketPrices = {};      // { resource: { price, trend } } trend: -1, 0, +1
let _marketPriceDay = -1;
let _demandEvents = [];      // [{ good, amount, daysLeft }]

function _initMarketSupply() {
  if (!state.marketSupply) {
    state.marketSupply = {};
    for (let res in MARKET_BASE_PRICES) state.marketSupply[res] = 50;
  }
  if (!state.marketDemand) {
    state.marketDemand = {};
    for (let res in MARKET_BASE_PRICES) state.marketDemand[res] = 50;
  }
}

function updateMarketPrices() {
  let day = state.day || 0;
  if (day === _marketPriceDay) return;
  let prevPrices = {};
  for (let k in _marketPrices) prevPrices[k] = _marketPrices[k].price;
  _marketPriceDay = day;
  _initMarketSupply();
  let mDay = isMarketDay(day);
  let prestige = state.prestige ? state.prestige.count : 0;

  // Daily supply decay toward 50 by 10%
  for (let res in state.marketSupply) {
    state.marketSupply[res] += (50 - state.marketSupply[res]) * 0.1;
  }
  // Tick demand events
  for (let i = _demandEvents.length - 1; i >= 0; i--) {
    _demandEvents[i].daysLeft--;
    if (_demandEvents[i].daysLeft <= 0) _demandEvents.splice(i, 1);
  }
  // Daily demand decay toward 50
  for (let res in state.marketDemand) {
    state.marketDemand[res] += (50 - state.marketDemand[res]) * 0.1;
  }
  // Apply active demand events
  for (let ev of _demandEvents) {
    if (state.marketDemand[ev.good] !== undefined) state.marketDemand[ev.good] += ev.amount;
  }
  // Random daily demand event (~20% chance)
  let rand0 = _hannoSeededRandom(day * 97 + 41);
  if (rand0 < 0.2) {
    let goods = ['harvest', 'wood', 'fish', 'wine', 'crystals', 'stone'];
    let pick = goods[Math.floor(_hannoSeededRandom(day * 53 + 7) * goods.length)];
    let amt = 15 + Math.floor(_hannoSeededRandom(day * 19 + 3) * 20);
    _demandEvents.push({ good: pick, amount: amt, daysLeft: 3 });
    let gName = MARKET_BASE_PRICES[pick] ? pick : pick;
    if (typeof addNotification === 'function') addNotification('Market buzz: High demand for ' + gName + '!', '#ddaa44');
  }
  // Festival demand boosts
  if (typeof getFestival === 'function') {
    let fest = getFestival();
    if (fest) {
      if (fest.name === 'Saturnalia') { state.marketDemand.harvest = (state.marketDemand.harvest || 50) + 20; state.marketDemand.wine = (state.marketDemand.wine || 50) + 15; }
      if (fest.name === 'Neptunalia') state.marketDemand.fish = (state.marketDemand.fish || 50) + 25;
    }
  }

  for (let res in MARKET_BASE_PRICES) {
    let mb = MARKET_BASE_PRICES[res];
    let base = mb.base;
    base = Math.floor(base * (1 + prestige * 0.1));
    // Supply/demand ratio drives price
    let supply = state.marketSupply[res] || 50;
    let demand = state.marketDemand[res] || 50;
    let ratio = demand / Math.max(10, supply);
    // Clamp ratio to 0.3x - 3.0x range
    ratio = Math.max(0.3, Math.min(3.0, ratio));
    let modifier = ratio;
    // Random daily jitter: +/- 10%
    let rand = _hannoSeededRandom(day * 31 + res.length * 7 + 13);
    modifier *= (0.9 + rand * 0.2);
    // Market day bonus
    if (mDay) {
      if (['seeds','grapeSeeds','oliveSeeds','flaxSeeds','pomegranateSeeds','lotusSeeds'].includes(res)) {
        modifier *= 0.85;
      } else {
        modifier *= 1.2;
      }
    }
    let finalPrice = Math.max(mb.min, Math.min(mb.max, Math.round(base * modifier)));
    let trend = 0;
    if (prevPrices[res] !== undefined) {
      if (finalPrice > prevPrices[res]) trend = 1;
      else if (finalPrice < prevPrices[res]) trend = -1;
    }
    _marketPrices[res] = { price: finalPrice, trend: trend };
  }
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

// Returns true if price is above base (good time to sell)
function isPriceAboveBase(resource) {
  let mb = MARKET_BASE_PRICES[resource];
  if (!mb) return false;
  return getMarketPrice(resource) > mb.base;
}

function recordMarketSell(resource, qty) {
  _initMarketSupply();
  state.marketSupply[resource] = (state.marketSupply[resource] || 50) + qty * 5;
}

function recordMarketBuy(resource, qty) {
  _initMarketSupply();
  state.marketSupply[resource] = Math.max(5, (state.marketSupply[resource] || 50) - qty * 5);
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
    if (k === 'gold') state.gold = Math.max(0, state.gold - cost[k]);
    else state[k] = Math.max(0, (state[k] || 0) - cost[k]);
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
    if (k === 'gold') state.gold = Math.max(0, state.gold - pb.cost[k]);
    else state[k] = Math.max(0, (state[k] || 0) - pb.cost[k]);
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
  // Reset game state
  initState(); _demandDay = -1; _marketPriceDay = -1; _prestigeInited = false; _demandEvents = [];

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
  if ((k === 'p' || k === 'P') && !state.conquest.active && !state.rowing.active) {
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

// ═══════════════════════════════════════════════════════════════════════════
// ─── COLONY MANAGEMENT UI (Press C) ──────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

let _colonyNPCPool = ['Marcus', 'Livia', 'Vesta', 'Felix', 'Gaius', 'Aurelia', 'Quintus', 'Cassia'];

function drawColonyManageUI() {
  if (!state.colonyManageOpen) return;
  push();

  let pw = 420, ph = 400;
  let px = width / 2 - pw / 2, py = height / 2 - ph / 2;

  // Panel background
  fill(15, 12, 8, 240);
  stroke(140, 180, 100);
  strokeWeight(2);
  rect(px, py, pw, ph, 8);
  noStroke();

  // Title
  fill(140, 220, 100);
  textSize(15); textAlign(CENTER, TOP);
  let colKeys = Object.keys(state.colonies || {});
  text('COLONY MANAGEMENT  (' + colKeys.length + ' colonies)', width / 2, py + 10);

  // Total income summary
  let totalIncome = 0;
  for (let k of colKeys) { let col = state.colonies[k]; totalIncome += (col.income || 0) + Math.floor((col.population || 0) * 0.5); }
  fill(200, 190, 140); textSize(9);
  text('Total colony income: +' + totalIncome + 'g/day  |  Home income: ~' + (state.islandLevel || 1) * 5 + 'g/day', width / 2, py + 30);

  let sel = state.colonyManageSelected;
  let sy = py + 48;

  if (!sel) {
    // Colony list view
    if (colKeys.length === 0) {
      fill(140, 130, 110); textSize(10); textAlign(CENTER, TOP);
      text('No colonies yet. Conquer Terra Nova or defeat a nation.', width / 2, sy + 20);
    } else {
      for (let i = 0; i < colKeys.length; i++) {
        let k = colKeys[i];
        let col = state.colonies[k];
        let rowH = 44;
        // Row background
        fill(30, 28, 22, 200);
        rect(px + 10, sy, pw - 20, rowH, 5);
        // Colony name
        fill(220, 210, 160); textSize(11); textAlign(LEFT, TOP);
        text('[' + (i + 1) + '] ' + col.name, px + 18, sy + 4);
        // Level, pop, income
        fill(170, 160, 130); textSize(8);
        text('LV.' + col.level + '  Pop: ' + col.population + '  Income: +' + (col.income + Math.floor(col.population * 0.5)) + 'g/day  Military: ' + col.military, px + 18, sy + 18);
        // Governor
        fill(col.governor ? color(100, 200, 100) : color(120, 110, 90)); textSize(7);
        text('Governor: ' + (col.governor || 'None') + '  |  Trade: ' + (col.autoTrade ? 'ON' : 'OFF'), px + 18, sy + 30);
        // Unique resource
        if (col.uniqueResource) {
          fill(200, 180, 80); textSize(7); textAlign(RIGHT, TOP);
          text(col.uniqueResource, px + pw - 18, sy + 4);
          textAlign(LEFT, TOP);
        }
        sy += rowH + 4;
      }
    }

    // Instructions
    fill(120, 110, 90); textSize(8); textAlign(CENTER, TOP);
    text('Press 1-' + colKeys.length + ' to select  |  ESC or C to close', width / 2, py + ph - 18);
  } else {
    // Colony detail view
    let col = state.colonies[sel];
    if (!col) { state.colonyManageSelected = null; pop(); return; }

    fill(220, 210, 160); textSize(13); textAlign(CENTER, TOP);
    text(col.name + '  (LV.' + col.level + ')', width / 2, sy);
    sy += 22;

    // Stats
    fill(180, 170, 140); textSize(9); textAlign(LEFT, TOP);
    text('Population: ' + col.population, px + 18, sy);
    text('Income: +' + (col.income + Math.floor(col.population * 0.5)) + 'g/day', px + 180, sy);
    sy += 16;
    text('Military: ' + col.military, px + 18, sy);
    text('Troops stationed: ' + (col.troopsStationed || 0), px + 180, sy);
    sy += 16;
    text('Colony gold: ' + col.gold + 'g', px + 18, sy);
    text('Days owned: ' + (col.daysOwned || 0), px + 180, sy);
    sy += 16;
    text('Resources — Wood: ' + (col.resources ? col.resources.wood : 0) + '  Stone: ' + (col.resources ? col.resources.stone : 0), px + 18, sy);
    sy += 16;
    if (col.uniqueResource) {
      fill(200, 180, 80);
      text('Unique resource: ' + col.uniqueResource + ' (produces every 3 days at LV.2+)', px + 18, sy);
      sy += 16;
    }
    text('Governor: ' + (col.governor || 'None (assign for auto-growth)'), px + 18, sy);
    sy += 22;

    // Buildings
    fill(200, 190, 150); textSize(10);
    text('Buildings: ' + (col.buildings.length > 0 ? col.buildings.join(', ') : 'None'), px + 18, sy);
    sy += 20;

    // Action buttons (text-based)
    fill(140, 220, 100); textSize(10); textAlign(LEFT, TOP);
    let actions = [];
    actions.push({ key: 'V', label: '[V] Visit colony (sail there)', action: 'visit' });
    actions.push({ key: 'B', label: '[B] Build remotely (10 wood + 5 stone)', action: 'build' });
    actions.push({ key: 'G', label: '[G] Assign governor' + (col.governor ? ' (current: ' + col.governor + ')' : ''), action: 'governor' });
    actions.push({ key: 'T', label: '[T] Toggle trade route (' + (col.autoTrade ? 'ON' : 'OFF') + ')', action: 'trade' });
    actions.push({ key: 'S', label: '[S] Station troops (+1 military, costs 20g)', action: 'troops' });

    for (let a of actions) {
      fill(30, 28, 22, 180);
      rect(px + 14, sy, pw - 28, 22, 4);
      fill(180, 220, 140); textSize(9);
      text(a.label, px + 22, sy + 5);
      sy += 26;
    }

    // Back
    fill(120, 110, 90); textSize(8); textAlign(CENTER, TOP);
    text('ESC = back to list  |  C = close', width / 2, py + ph - 18);
  }

  pop();
}

function handleColonyManageKey(k, kCode) {
  if (!state.colonyManageOpen) return false;
  let colKeys = Object.keys(state.colonies || {});

  // Close
  if (kCode === 27) {
    if (state.colonyManageSelected) {
      state.colonyManageSelected = null; // back to list
    } else {
      state.colonyManageOpen = false; state.colonyManageSelected = null;
    }
    return true;
  }
  if (k === 'c' || k === 'C') {
    state.colonyManageOpen = false; state.colonyManageSelected = null;
    return true;
  }

  // In list view — number selects colony
  if (!state.colonyManageSelected) {
    let num = parseInt(k);
    if (num >= 1 && num <= colKeys.length) {
      state.colonyManageSelected = colKeys[num - 1];
      return true;
    }
    return true; // block keys while panel open
  }

  // In detail view — action keys
  let sel = state.colonyManageSelected;
  let col = state.colonies[sel];
  if (!col) return true;

  if (k === 'v' || k === 'V') {
    // Visit colony — sail there
    // Put player in rowboat aimed at colony position
    state.colonyManageOpen = false; state.colonyManageSelected = null;
    state.rowing.active = true; state.rowing.docked = false;
    state.rowing.x = state.player.x;
    state.rowing.y = state.player.y + 50;
    state.rowing.speed = 0;
    state.rowing.angle = atan2(col.isleY - state.player.y, col.isleX - state.player.x);
    state.rowing.wakeTrail = [];
    addFloatingText(width / 2, height * 0.3, 'Sailing to ' + col.name + '...', '#88ccff');
    return true;
  }

  if (k === 'b' || k === 'B') {
    // Remote build
    if (state.wood >= 10 && state.stone >= 5) {
      state.wood -= 10; state.stone -= 5;
      let bTypes = ['granary', 'barracks', 'market', 'wall', 'temple'];
      let bt = bTypes[col.buildings.length % bTypes.length];
      col.buildings.push(bt);
      col.income += 2;
      addFloatingText(width / 2, height * 0.25, bt + ' built in ' + col.name + '!', '#88cc88');
      addNotification(col.name + ': ' + bt + ' constructed', '#88cc88');
    } else {
      addFloatingText(width / 2, height * 0.3, 'Need 10 wood + 5 stone!', '#ff6644');
    }
    return true;
  }

  if (k === 'g' || k === 'G') {
    // Assign governor — cycle through NPC pool
    let idx = _colonyNPCPool.indexOf(col.governor);
    idx = (idx + 1) % _colonyNPCPool.length;
    col.governor = _colonyNPCPool[idx];
    addFloatingText(width / 2, height * 0.25, col.governor + ' governs ' + col.name, '#aaddff');
    return true;
  }

  if (k === 't' || k === 'T') {
    col.autoTrade = !col.autoTrade;
    addFloatingText(width / 2, height * 0.25, 'Trade route: ' + (col.autoTrade ? 'ON' : 'OFF'), '#ddaa44');
    return true;
  }

  if (k === 's' || k === 'S') {
    if (state.gold >= 20) {
      state.gold -= 20;
      col.military += 1;
      col.troopsStationed = (col.troopsStationed || 0) + 1;
      addFloatingText(width / 2, height * 0.25, '+1 troops stationed at ' + col.name, '#cc8844');
    } else {
      addFloatingText(width / 2, height * 0.3, 'Need 20 gold!', '#ff6644');
    }
    return true;
  }

  return true; // block all keys while in detail view
}

function handleColonyManageClick(mx, my) {
  if (!state.colonyManageOpen) return false;
  let colKeys = Object.keys(state.colonies || {});

  if (!state.colonyManageSelected) {
    // Click on colony row to select
    let pw = 420, ph = 400;
    let px = width / 2 - pw / 2, py = height / 2 - ph / 2;
    let sy = py + 48;
    for (let i = 0; i < colKeys.length; i++) {
      if (mx >= px + 10 && mx <= px + pw - 10 && my >= sy && my <= sy + 44) {
        state.colonyManageSelected = colKeys[i];
        return true;
      }
      sy += 48;
    }
  }
  return true; // consume click when panel open
}

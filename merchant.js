// MARE NOSTRUM — Merchant Ship & Hanno Trading System
// ─── MERCHANT SHIP ────────────────────────────────────────────────────────
function updatePortPositions() {
  // Ports always at the shoreline — just past the grass surface edge
  let srx = getSurfaceRX();
  let sry = getSurfaceRY();
  // Player port: RIGHT side of island (pier extends right into water)
  state.portLeft = {
    x: WORLD.islandCX + srx + 10,
    y: WORLD.islandCY + sry * 0.15
  };
  // Merchant port: LEFT side of island
  state.portRight = {
    x: WORLD.islandCX - srx - 20,
    y: WORLD.islandCY - sry * 0.05
  };
}

function getPortPosition() {
  if (!state.portLeft) updatePortPositions();
  return state.portLeft;
}

function updateShip(dt) {
  let ship = state.ship;
  ship.timer += dt;

  // Merchant docks on LEFT shore — far end of pier
  ship.dockX = WORLD.islandCX - getSurfaceRX() * 1.12;
  ship.dockY = WORLD.islandCY + 20;

  switch (ship.state) {
    case 'gone':
      if (ship.timer > ship.nextArrival) {
        ship.state = 'arriving';
        ship.timer = 0;
        ship.x = WORLD.islandCX - state.islandRX - 400;
        ship.y = ship.dockY;
        ship.offers = generateShopOffers();
        addFloatingText(width / 2, height * 0.3, 'A merchant ship approaches!', C.solarBright);
      }
      break;

    case 'arriving':
      let targetX = ship.dockX;
      ship.x = lerp(ship.x, targetX, 0.008);
      ship.y = ship.dockY + sin(frameCount * 0.02) * 3;
      if (abs(ship.x - targetX) < 5) {
        ship.state = 'docked';
        ship.timer = 0;
        if (snd) snd.playSFX('sail');
        addFloatingText(width / 2, height * 0.35, 'Ship docked at port! Walk to the harbor to trade.', C.solarBright);
        addNotification('Merchant trireme has arrived!', '#ffbb22');
      }
      break;

    case 'docked':
      // Gentle hover over the island
      ship.x = ship.dockX + sin(frameCount * 0.005) * 15;
      ship.y = ship.dockY + sin(frameCount * 0.02) * 4;
      if (ship.timer > 2700) {
        ship.state = 'leaving';
        ship.timer = 0;
        ship.shopOpen = false;
        addFloatingText(width / 2, height * 0.35, 'Mercator sailing away...', C.textDim);
      }
      // Player must be near the left-side merchant dock (in shallows)
      let pd = dist2(state.player.x, state.player.y, ship.dockX, ship.dockY);
      ship.shopOpen = (pd < 120);

      // Auto-sell from storage every 300 frames (~5s)
      ship.autoSellTimer = (ship.autoSellTimer || 0) + dt;
      if (ship.autoSellTimer >= 300) {
        ship.autoSellTimer = 0;
        let sold = false;
        // Sell harvest: 3 harvest → 5 gold
        if (state.harvest >= 3) {
          state.harvest -= 3;
          state.gold += 5;
          ship.autoSellLog.push({ item: 'harvest', qty: 3, gold: 5, t: frameCount });
          sold = true;
        }
        // Sell crystals: 2 crystals → 8 gold
        if (state.crystals >= 2) {
          state.crystals -= 2;
          state.gold += 8;
          ship.autoSellLog.push({ item: 'crystals', qty: 2, gold: 8, t: frameCount });
          sold = true;
        }
        // Keep log trimmed
        ship.autoSellLog = ship.autoSellLog.filter(e => frameCount - e.t < 300);
        if (sold) {
          let sx2 = w2sX(ship.dockX);
          let sy2 = w2sY(ship.dockY);
          addFloatingText(sx2, sy2 - 30, '+Gold', '#ffcc44');
          let totalGold = ship.autoSellLog.filter(e => frameCount - e.t < 5).reduce((s, e) => s + e.gold, 0);
          if (totalGold > 0) addNotification('+' + totalGold + 'g from auto-trade', '#ccaa44');
        }
      }
      break;

    case 'leaving':
      ship.x -= 2;
      ship.y += 0.1; // sail away left
      if (ship.x < WORLD.islandCX - state.islandRX - 500) {
        ship.state = 'gone';
        ship.timer = 0;
        ship.nextArrival = 3600 + random(-600, 600);
      }
      break;
  }
}

function _shopPrice(res, qty) { return (typeof getMarketPrice==='function'?getMarketPrice(res):1)*qty; }
function _shopTrend(res) { return typeof getMarketTrend==='function'?getMarketTrend(res):0; }
function _shopLabel(action, qty, name, res) { let p=_shopPrice(res,qty); let t=_shopTrend(res); return action+' '+qty+' '+name+' \u2192 '+p+'g'+(t>0?' \u2191':t<0?' \u2193':''); }
function generateShopOffers() {
  let offers = [
    { type: 'buy', item: 'harvest', qty: 3, price: _shopPrice('harvest',3), label: _shopLabel('Sell',3,'Harvest','harvest'), trend: _shopTrend('harvest') },
    { type: 'buy', item: 'crystals', qty: 2, price: _shopPrice('crystals',2), label: _shopLabel('Sell',2,'Crystals','crystals'), trend: _shopTrend('crystals') },
    { type: 'buy', item: 'wood', qty: 5, price: _shopPrice('wood',5), label: _shopLabel('Sell',5,'Wood','wood'), trend: _shopTrend('wood') },
    { type: 'buy', item: 'fish', qty: 2, price: _shopPrice('fish',2), label: _shopLabel('Sell',2,'Fish','fish'), trend: _shopTrend('fish') },
    { type: 'sell', item: 'seeds', qty: 5, price: _shopPrice('seeds',5), label: _shopLabel('Buy',5,'Seeds','seeds'), trend: _shopTrend('seeds') },
    { type: 'sell', item: 'grapeSeeds', qty: 3, price: _shopPrice('grapeSeeds',3), label: _shopLabel('Buy',3,'Grape Seeds','grapeSeeds'), trend: _shopTrend('grapeSeeds') },
    { type: 'sell', item: 'oliveSeeds', qty: 3, price: _shopPrice('oliveSeeds',3), label: _shopLabel('Buy',3,'Olive Seeds','oliveSeeds'), trend: _shopTrend('oliveSeeds') },
    { type: 'sell', item: 'stone', qty: 5, price: _shopPrice('stone',5), label: _shopLabel('Buy',5,'Stone','stone'), trend: _shopTrend('stone') },
    { type: 'sell', item: 'flaxSeeds', qty: 3, price: _shopPrice('flaxSeeds',3), label: _shopLabel('Buy',3,'Flax Seeds','flaxSeeds'), trend: _shopTrend('flaxSeeds') },
    { type: 'sell', item: 'pomegranateSeeds', qty: 2, price: _shopPrice('pomegranateSeeds',2), label: _shopLabel('Buy',2,'Pomegranate','pomegranateSeeds'), trend: _shopTrend('pomegranateSeeds') },
    { type: 'sell', item: 'lotusSeeds', qty: 2, price: _shopPrice('lotusSeeds',2), label: _shopLabel('Buy',2,'Lotus Seeds','lotusSeeds'), trend: _shopTrend('lotusSeeds') },
  ];
  // Tool upgrades (only show if not owned)
  if (!state.tools.sickle) offers.push({ type: 'tool', tool: 'sickle', price: 15, label: 'Bronze Sickle → 15 Gold (2x harvest)' });
  if (!state.tools.axe) offers.push({ type: 'tool', tool: 'axe', price: 20, label: 'Iron Axe → 20 Gold (1-hit chop)' });
  if (!state.tools.net) offers.push({ type: 'tool', tool: 'net', price: 25, label: 'Fishing Net → 25 Gold (auto fish)' });
  if (!state.tools.copperRod) offers.push({ type: 'tool', tool: 'copperRod', price: 30, label: 'Copper Rod → 30 Gold (+15% catch rate)' });
  else if (!state.tools.ironRod) offers.push({ type: 'tool', tool: 'ironRod', price: 60, label: 'Iron Rod → 60 Gold (+30% catch rate)' });
  if (!state.tools.steelPick) offers.push({ type: 'tool', tool: 'steelPick', price: 40, label: 'Steel Pickaxe → 40 Gold (2x mining speed)' });
  if (!state.tools.lantern) offers.push({ type: 'tool', tool: 'lantern', price: 35, label: 'Lantern → 35 Gold (night visibility)' });
  // Equipment upgrades
  if (typeof EQUIPMENT_DB !== 'undefined' && state.equipment) {
    var equipOffers = ['pilum','flamma','trident','centurion_crest','laurel','imperial_plate',
      'greaves','iron_greaves','linen_skirt','caligae','war_boots','mercury_sandals',
      'buckler','iron_shield','lantern_oh','sickle_eq','iron_pick','fishing_rod',
      'mars_ring','hermes_charm'];
    for (var ei = 0; ei < equipOffers.length; ei++) {
      var eid = equipOffers[ei];
      var edata = EQUIPMENT_DB[eid];
      if (!edata || edata.price <= 0) continue;
      if (state.equipment[edata.slot] === eid) continue;
      var statStr = (edata.atk ? '+' + edata.atk + ' ATK ' : '') + (edata.def ? '+' + edata.def + ' DEF ' : '') + (edata.spd ? '+' + edata.spd + ' SPD' : '');
      offers.push({ type: 'equip', equipId: eid, price: edata.price, label: edata.name + ' (' + EQUIP_SLOTS[edata.slot].name + ') → ' + edata.price + 'g (' + statStr.trim() + ')' });
    }
  }
  return offers;
}

function doTrade(offerIdx) {
  let offer = state.ship.offers[offerIdx];
  if (!offer) return;
  let priceMult = typeof getEventShopPriceMult === 'function' ? getEventShopPriceMult() : 1;
  // Marketplace (emporium) discount: -10% per marketplace building
  if (state.buildings) {
    let mpCount = state.buildings.filter(b => b.type === 'marketplace').length;
    if (mpCount > 0) priceMult *= max(0.5, 1 - 0.1 * mpCount);
  }
  if (offer.type === 'equip') {
    let finalPrice = max(1, floor(offer.price * priceMult));
    if (state.gold >= finalPrice) {
      state.gold = max(0, state.gold - finalPrice);
      equipItem(offer.equipId);
      if (snd) snd.playSFX('coin_clink');
      addFloatingText(width / 2, height * 0.5, EQUIPMENT_DB[offer.equipId].name + ' equipped!', '#ffcc44');
      spawnParticles(state.player.x, state.player.y, 'build', 8);
      state.ship.offers = generateShopOffers();
    } else {
      addFloatingText(width / 2, height * 0.5, 'Need ' + finalPrice + ' gold!', C.buildInvalid);
    }
  } else if (offer.type === 'tool') {
    let finalPrice = max(1, floor(offer.price * priceMult));
    if (state.gold >= finalPrice) {
      state.gold = max(0, state.gold - finalPrice);
      state.tools[offer.tool] = 1;
      if (snd) snd.playSFX('coin_clink');
      addFloatingText(width / 2, height * 0.5, 'Got ' + offer.tool + '!', C.solarBright);
      spawnParticles(state.player.x, state.player.y, 'build', 8);
      // Refresh offers to remove purchased tool
      state.ship.offers = generateShopOffers();
    } else {
      addFloatingText(width / 2, height * 0.5, 'Need ' + finalPrice + ' gold!', C.buildInvalid);
    }
  } else if (offer.type === 'buy') {
    if (state[offer.item] >= offer.qty) {
      state[offer.item] -= offer.qty;
      state.gold += offer.price;
      if (typeof recordMarketSell === 'function') recordMarketSell(offer.item, offer.qty);
      if (state.score) state.score.goldEarned += offer.price;
      if (snd) snd.playSFX('coin_clink');
      addFloatingText(width / 2, height * 0.5, '+' + offer.price + ' Gold!', C.solarBright);
    } else {
      addFloatingText(width / 2, height * 0.5, 'Not enough ' + offer.item + '!', C.buildInvalid);
    }
  } else {
    let finalPrice = max(1, floor(offer.price * priceMult));
    if (state.gold >= finalPrice) {
      state.gold = max(0, state.gold - finalPrice);
      state[offer.item] += offer.qty;
      if (typeof recordMarketBuy === 'function') recordMarketBuy(offer.item, offer.qty);
      if (snd) snd.playSFX('coin_clink');
      addFloatingText(width / 2, height * 0.5, '+' + offer.qty + ' ' + offer.item + '!', C.crystalGlow);
    } else {
      addFloatingText(width / 2, height * 0.5, 'Need ' + finalPrice + ' gold!', C.buildInvalid);
    }
  }
}

function drawShip() {
  let ship = state.ship;
  if (ship.state === 'gone') return;

  let sx = w2sX(ship.x);
  let sy = w2sY(ship.y);
  let bob = sin(frameCount * 0.025) * 3;

  push();
  translate(sx, sy + bob);
  // Flip ship to face island (right) when leaving, normal when docked/arriving from left
  if (ship.state === 'leaving') scale(-1, 1);
  noStroke();

  // Water around hull — pixel wake rects
  let t = frameCount * 0.03;
  for (let i = 0; i < 6; i++) {
    let wakeX = floor(-60 - i * 12 + sin(t + i) * 3);
    let wakeY = floor(8 + i * 2);
    fill(180, 210, 230, 40 - i * 5);
    rect(wakeX - 8 + i, wakeY - 1, 16 - i * 2, 2);
  }
  // Bow spray — pixel rect
  fill(200, 225, 240, floor(30 + sin(t * 2) * 15));
  rect(58, 0, 14, 3);
  // Water reflection — pixel rect
  fill(40, 70, 100, 25);
  rect(-55, 16, 110, 6);

  // ─── TRIREME HULL — pixel rects ───
  // Hull body — tapered layers of rects (wide center, narrow ends)
  fill(75, 45, 20);
  rect(-50, -4, 100, 4);   // upper hull
  rect(-48, 0, 96, 4);     // mid hull
  rect(-44, 4, 84, 4);     // lower hull
  rect(-38, 8, 72, 2);     // keel strip
  // Stern taper
  rect(-55, -2, 6, 6);
  // Bow taper
  rect(50, -2, 8, 4);
  rect(56, -1, 6, 2);

  // Hull planking — pixel lines
  stroke(90, 55, 25, 80);
  strokeWeight(1);
  line(-48, 2, 50, 2);
  line(-46, 6, 45, 6);
  noStroke();

  // Bronze ram at bow — stepped pixel wedge
  fill(160, 120, 40);
  rect(56, -2, 4, 4);
  rect(60, -1, 4, 2);
  rect(64, -1, 2, 2);
  fill(180, 140, 50, 150);
  rect(58, -1, 6, 2);

  // Oar bank — pixel vertical rects (animated)
  let rowPhase = frameCount * 0.06;
  fill(100, 70, 35);
  for (let i = 0; i < 8; i++) {
    let ox = floor(-38 + i * 10);
    let oarDip = floor(sin(rowPhase + i * 0.4) * 4);
    rect(ox, 10, 1, 10 + oarDip);
  }

  // Deck — pixel rect
  fill(100, 68, 32);
  rect(-48, -6, 96, 5);

  // Deck rail — pixel rect
  fill(85, 55, 25);
  rect(-48, -8, 96, 2);

  // ─── MAST + SAIL — pixel rects ───
  // Mast
  fill(90, 60, 28);
  rect(-2, -50, 4, 44);
  // Yard (horizontal beam)
  fill(80, 52, 24);
  rect(-28, -48, 56, 3);

  // Sail — pixel rect with billow offset
  let sailBillow = floor(sin(frameCount * 0.02) * 3);
  fill(220, 205, 175, 230);
  rect(-26 + sailBillow, -46, 52, 34);
  // Faction-colored stripe
  let _shipFM = getFactionMilitary();
  fill(_shipFM.conquestFlag[0], _shipFM.conquestFlag[1], _shipFM.conquestFlag[2], 180);
  rect(-25 + sailBillow, -32, 50, 10);

  // Rigging — pixel diagonal lines
  stroke(100, 80, 50, 100);
  strokeWeight(1);
  line(0, -50, -48, -6);
  line(0, -50, 48, -6);
  noStroke();

  // Stern ornament — pixel stepped post
  fill(120, 80, 30);
  rect(-50, -4, 3, 2);    // base
  rect(-52, -8, 3, 4);    // mid
  rect(-51, -14, 3, 6);   // upper
  rect(-50, -22, 3, 8);   // top post
  rect(-49, -28, 3, 6);   // peak
  if (state.faction === 'seapeople') {
    // Sea People: dragon/serpent figurehead at bow
    fill(60, 50, 40);
    rect(62, -8, 3, 8);   // neck
    rect(60, -16, 5, 8);  // head base
    fill(42, 138, 106);
    rect(59, -20, 7, 4);  // crest
    fill(200, 60, 40);
    rect(64, -14, 2, 2);  // eye
    // Larger hull extension
    fill(50, 35, 20);
    rect(-56, -2, 6, 4);  // wider stern
  } else {
    // Standard: eagle/standard at top — pixel rect + crown
    fill(180, 140, 50);
    rect(-51, -32, 6, 4);
    fill(200, 160, 60);
    rect(-50, -36, 4, 4);   // eagle head
    rect(-52, -34, 2, 2);   // left wing
    rect(-44, -34, 2, 2);   // right wing
  }

  // Flag at mast top — pixel rect with wave, faction color
  let flagWave = floor(sin(frameCount * 0.04) * 2);
  let _mf = getFactionMilitary();
  fill(_mf.conquestFlag[0], _mf.conquestFlag[1], _mf.conquestFlag[2]);
  rect(1, -58, 10 + flagWave, 4);
  rect(1, -54, 8 + flagWave, 4);

  // "TRADE" indicator — counter-flip text so it reads correctly
  if (ship.state === 'docked') {
    push();
    fill(color(C.solarBright));
    textAlign(CENTER, CENTER);
    textSize(10);
    text('MERCATOR', 0, -65);
    if (ship.shopOpen) {
      fill(color(C.crystalGlow));
      textSize(9);
      text('Trading...', 0, 22);
    } else {
      fill(color(C.textDim));
      textSize(11);
      text('walk near to trade', 0, 22);
    }
    pop();
  }

  pop();
}


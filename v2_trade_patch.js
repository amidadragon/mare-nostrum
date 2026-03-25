(function() {
  'use strict';

  // ============================================================================
  // RESOURCE BASE VALUES (gold equivalent)
  // ============================================================================
  var RESOURCE_VALUES = {
    harvest: 3,
    wood: 4,
    stone: 5,
    fish: 3,
    crystals: 8,
    wine: 6,
    oil: 5,
    gold: 1
  };

  var RESOURCES = Object.keys(RESOURCE_VALUES);

  // ============================================================================
  // NATION SPECIALIZATION & NEEDS
  // ============================================================================
  var NATION_SPECS = {
    egypt: { surplus: ['crystals', 'stone'], deficit: ['wood', 'harvest'] },
    carthage: { surplus: ['gold', 'wine'], deficit: ['stone', 'harvest'] },
    greece: { surplus: ['oil', 'fish'], deficit: ['crystals', 'wood'] },
    persia: { surplus: ['gold', 'stone'], deficit: ['fish', 'harvest'] },
    phoenicia: { surplus: ['wood', 'fish'], deficit: ['crystals', 'wine'] },
    gaul: { surplus: ['harvest', 'wood'], deficit: ['gold', 'stone'] },
    seapeople: { surplus: ['fish'], deficit: ['harvest', 'wood', 'stone', 'crystals', 'wine', 'oil', 'gold'] },
    rome: { surplus: ['harvest', 'gold'], deficit: ['wine', 'oil'] }
  };

  // ============================================================================
  // TRADE SYSTEM
  // ============================================================================
  var TradeSystem = {
    tradeFleet: [],
    tradeHistory: [],
    nationNeeds: {},
    incomingOffers: [],
    panelOpen: false,
    selectedNation: null,
    offerResources: {},
    requestResources: {},
    lastNeedsRefresh: 0,
    nextBotTradeTime: 0,

    // Initialize nation needs
    init: function() {
      var nationKey;
      for (nationKey in NATION_SPECS) {
        if (NATION_SPECS.hasOwnProperty(nationKey)) {
          this.generateNationNeeds(nationKey);
        }
      }
      this.lastNeedsRefresh = typeof frameCount !== 'undefined' ? frameCount : 0;
      this.nextBotTradeTime = this.lastNeedsRefresh + 18000; // ~5 game-days at 60fps
    },

    generateNationNeeds: function(nationKey) {
      var spec = NATION_SPECS[nationKey];
      var needs = {
        surplus: {},
        deficit: {},
        replenishTime: (typeof frameCount !== 'undefined' ? frameCount : 0) + 18000
      };

      // Surplus: what nation has extra of
      var i;
      for (i = 0; i < spec.surplus.length; i++) {
        needs.surplus[spec.surplus[i]] = 50 + Math.floor(Math.random() * 100);
      }

      // Deficit: what nation needs
      for (i = 0; i < spec.deficit.length; i++) {
        needs.deficit[spec.deficit[i]] = 30 + Math.floor(Math.random() * 60);
      }

      this.nationNeeds[nationKey] = needs;
    },

    getGoldValue: function(resourceName, qty) {
      return (RESOURCE_VALUES[resourceName] || 0) * qty;
    },

    getTotalValue: function(resourceObj) {
      var total = 0;
      var key;
      for (key in resourceObj) {
        if (resourceObj.hasOwnProperty(key)) {
          total += this.getGoldValue(key, resourceObj[key]);
        }
      }
      return total;
    },

    calculateAcceptanceChance: function(nationKey, offer, request) {
      if (typeof state === 'undefined') return 0;

      var nation = state.nations[nationKey];
      if (!nation || nation.defeated || nation.vassal || nation.isBot === false) {
        return 0;
      }

      var rep = nation.reputation || 0;
      if (rep < -30) return 0;

      var offerValue = this.getTotalValue(offer);
      var requestValue = this.getTotalValue(request);

      // Fairness check: player offering more is better
      var fairnessRatio = requestValue > 0 ? offerValue / requestValue : 1;
      var fairnessBonus = Math.min(fairnessRatio, 2); // cap at 2x

      // Base chance from reputation (0-100)
      var baseChance = 40 + (rep / 100) * 50; // -100 rep = 40%, +100 rep = 90%

      // Apply fairness multiplier
      var finalChance = baseChance * fairnessBonus;

      return Math.min(finalChance, 95);
    },

    hasPlayerResources: function(resourceObj) {
      if (typeof state === 'undefined') return false;

      var key;
      for (key in resourceObj) {
        if (resourceObj.hasOwnProperty(key)) {
          var playerQty = state[key] || 0;
          if (playerQty < resourceObj[key]) {
            return false;
          }
        }
      }
      return true;
    },

    executeTradeOnArrival: function(ship) {
      if (typeof state === 'undefined') return;

      var nation = state.nations[ship.nationKey];
      if (!nation) return;

      var chance = this.calculateAcceptanceChance(ship.nationKey, ship.offer, ship.request);
      var accepted = Math.random() * 100 < chance;

      if (accepted) {
        // Deduct offered resources from player
        var key;
        for (key in ship.offer) {
          if (ship.offer.hasOwnProperty(key)) {
            state[key] = (state[key] || 0) - ship.offer[key];
          }
        }

        // Add requested resources to player
        for (key in ship.request) {
          if (ship.request.hasOwnProperty(key)) {
            state[key] = (state[key] || 0) + ship.request[key];
          }
        }

        // Reputation boost (more generous = bigger boost)
        var fairnessRatio = ship.request.length > 0 ? this.getTotalValue(ship.offer) / this.getTotalValue(ship.request) : 1;
        var repBoost = 5 + (fairnessRatio > 1 ? 5 : 0);
        nation.reputation = (nation.reputation || 0) + repBoost;

        // Log trade
        this.tradeHistory.push({
          frame: typeof frameCount !== 'undefined' ? frameCount : 0,
          nationKey: ship.nationKey,
          offer: ship.offer,
          request: ship.request,
          success: true
        });

        if (typeof addNotification !== 'undefined') {
          var nationName = typeof getNationName !== 'undefined' ? getNationName(ship.nationKey) : ship.nationKey;
          addNotification('Trade with ' + nationName + ' accepted!', [200, 200, 100]);
        }
        if (typeof snd !== 'undefined' && typeof snd.playSFX !== 'undefined') {
          snd.playSFX('coin_clink');
        }
      } else {
        // Trade rejected
        this.tradeHistory.push({
          frame: typeof frameCount !== 'undefined' ? frameCount : 0,
          nationKey: ship.nationKey,
          offer: ship.offer,
          request: ship.request,
          success: false
        });

        if (typeof addNotification !== 'undefined') {
          var nationName = typeof getNationName !== 'undefined' ? getNationName(ship.nationKey) : ship.nationKey;
          addNotification(nationName + ' rejected the trade offer.', [200, 100, 100]);
        }
      }
    },

    dispatchMerchant: function(nationKey, offerRes, requestRes) {
      if (typeof state === 'undefined') return false;

      // Check player has resources
      if (!this.hasPlayerResources(offerRes)) {
        if (typeof addNotification !== 'undefined') {
          addNotification('Insufficient resources to trade!', [200, 100, 100]);
        }
        return false;
      }

      var nation = state.nations[nationKey];
      if (!nation) return false;

      // Calculate distance
      var playerX = state.player ? state.player.x : (typeof WORLD !== 'undefined' && WORLD.islandCX ? WORLD.islandCX : 0);
      var playerY = state.player ? state.player.y : (typeof WORLD !== 'undefined' && WORLD.islandCY ? WORLD.islandCY : 0);
      var targetX = nation.isleX || 0;
      var targetY = nation.isleY || 0;

      var distance = Math.sqrt((targetX - playerX) * (targetX - playerX) + (targetY - playerY) * (targetY - playerY));
      var travelSpeed = 0.3;
      var travelTime = Math.ceil(distance / travelSpeed);

      var ship = {
        nationKey: nationKey,
        offer: JSON.parse(JSON.stringify(offerRes)),
        request: JSON.parse(JSON.stringify(requestRes)),
        startX: playerX,
        startY: playerY,
        targetX: targetX,
        targetY: targetY,
        progress: 0,
        maxProgress: travelTime,
        returnTrip: false,
        currentX: playerX,
        currentY: playerY
      };

      this.tradeFleet.push(ship);

      if (typeof addNotification !== 'undefined') {
        var nationName = typeof getNationName !== 'undefined' ? getNationName(nationKey) : nationKey;
        addNotification('Merchant dispatched to ' + nationName + '!', [100, 150, 200]);
      }
      if (typeof snd !== 'undefined' && typeof snd.playSFX !== 'undefined') {
        snd.playSFX('sail');
      }

      return true;
    },

    update: function(dt) {
      if (typeof state === 'undefined') return;

      // Update trade ships
      var i = 0;
      while (i < this.tradeFleet.length) {
        var ship = this.tradeFleet[i];
        ship.progress += 1;

        // Lerp position
        var t = Math.min(ship.progress / ship.maxProgress, 1);
        if (!ship.returnTrip) {
          ship.currentX = ship.startX + (ship.targetX - ship.startX) * t;
          ship.currentY = ship.startY + (ship.targetY - ship.startY) * t;
        } else {
          ship.currentX = ship.targetX + (ship.startX - ship.targetX) * t;
          ship.currentY = ship.targetY + (ship.startY - ship.targetY) * t;
        }

        // Check arrival
        if (t >= 1) {
          if (!ship.returnTrip) {
            // First leg complete: execute trade
            this.executeTradeOnArrival(ship);
            ship.returnTrip = true;
            ship.progress = 0;
          } else {
            // Return leg complete: remove ship
            this.tradeFleet.splice(i, 1);
            continue;
          }
        }
        i += 1;
      }

      // Refresh nation needs periodically
      var now = typeof frameCount !== 'undefined' ? frameCount : 0;
      if (now - this.lastNeedsRefresh > 18000) { // ~5 game-days
        for (var key in NATION_SPECS) {
          if (NATION_SPECS.hasOwnProperty(key)) {
            this.generateNationNeeds(key);
          }
        }
        this.lastNeedsRefresh = now;
      }

      // Bot nations send trade offers
      if (now > this.nextBotTradeTime) {
        this.generateBotOffer();
        this.nextBotTradeTime = now + 18000 + Math.floor(Math.random() * 18000);
      }
    },

    generateBotOffer: function() {
      if (typeof state === 'undefined') return;

      // Pick random bot nation
      var bots = [];
      var key;
      for (key in state.nations) {
        if (state.nations.hasOwnProperty(key)) {
          var nation = state.nations[key];
          if (nation.isBot && !nation.defeated && !nation.vassal) {
            bots.push(key);
          }
        }
      }

      if (bots.length === 0) return;

      var nationKey = bots[Math.floor(Math.random() * bots.length)];
      var needs = this.nationNeeds[nationKey];
      if (!needs) return;

      // Build offer: they offer their surplus
      var offer = {};
      var surplusKeys = Object.keys(needs.surplus);
      var i;
      for (i = 0; i < surplusKeys.length && i < 2; i++) {
        var res = surplusKeys[i];
        offer[res] = Math.floor(needs.surplus[res] * 0.3);
      }

      // Build request: they want their deficit
      var request = {};
      var deficitKeys = Object.keys(needs.deficit);
      for (i = 0; i < deficitKeys.length && i < 2; i++) {
        var res = deficitKeys[i];
        request[res] = Math.floor(needs.deficit[res] * 0.4);
      }

      var offerObj = {
        nationKey: nationKey,
        offer: offer,
        request: request,
        expiresAt: (typeof frameCount !== 'undefined' ? frameCount : 0) + 3600
      };

      this.incomingOffers.push(offerObj);

      if (typeof addNotification !== 'undefined') {
        var nationName = typeof getNationName !== 'undefined' ? getNationName(nationKey) : nationKey;
        var offerText = nationName + ' offers: ';
        for (var res in offer) {
          if (offer.hasOwnProperty(res)) {
            offerText += offer[res] + ' ' + res + ' ';
          }
        }
        addNotification(offerText + '(Press Y to accept)', [150, 150, 100]);
      }
    },

    togglePanel: function() {
      this.panelOpen = !this.panelOpen;
      if (!this.panelOpen) {
        this.selectedNation = null;
        this.offerResources = {};
        this.requestResources = {};
      }
      if (typeof snd !== 'undefined' && typeof snd.playSFX !== 'undefined') {
        snd.playSFX('click');
      }
    },

    selectNation: function(nationKey) {
      this.selectedNation = nationKey;
      this.offerResources = {};
      this.requestResources = {};
    },

    draw: function() {
      // Draw merchant ships in transit
      var i;
      for (i = 0; i < this.tradeFleet.length; i++) {
        var ship = this.tradeFleet[i];
        if (typeof w2sX !== 'undefined' && typeof w2sY !== 'undefined') {
          var sx = w2sX(ship.currentX);
          var sy = w2sY(ship.currentY);

          if (typeof push !== 'undefined' && typeof pop !== 'undefined') {
            push();
            fill(220, 180, 100);
            noStroke();
            triangle(sx - 5, sy + 10, sx + 5, sy + 10, sx, sy - 5);
            pop();
          }
        }
      }
    },

    drawPanel: function() {
      if (!this.panelOpen || typeof state === 'undefined') return;

      // Full-screen overlay
      fill(0, 0, 0, 180);
      noStroke();
      rect(0, 0, typeof width !== 'undefined' ? width : 800, typeof height !== 'undefined' ? height : 600);

      var panelX = 40;
      var panelY = 40;
      var panelW = (typeof width !== 'undefined' ? width : 800) - 80;
      var panelH = (typeof height !== 'undefined' ? height : 600) - 80;

      // Panel background
      fill(20, 15, 10);
      stroke(200, 150, 50);
      strokeWeight(2);
      rect(panelX, panelY, panelW, panelH);

      textAlign(typeof LEFT !== 'undefined' ? LEFT : 0, typeof TOP !== 'undefined' ? TOP : 0);
      textSize(16);
      fill(200, 150, 50);
      text('TRADE PANEL', panelX + 20, panelY + 20);

      // Left side: nation list
      var listX = panelX + 20;
      var listY = panelY + 50;
      var listW = 150;

      fill(100, 80, 60);
      text('Nations:', listX, listY);

      var nationListY = listY + 25;
      var nationCount = 0;
      for (var nKey in state.nations) {
        if (state.nations.hasOwnProperty(nKey)) {
          var nation = state.nations[nKey];
          if (nation.isBot && !nation.defeated && !nation.vassal) {
            var textColor = this.selectedNation === nKey ? [220, 180, 80] : [150, 130, 100];
            fill(textColor[0], textColor[1], textColor[2]);
            text(nKey, listX, nationListY + nationCount * 25);

            // Reputation indicator
            var rep = (nation.reputation || 0);
            var repColor = rep > 50 ? [100, 200, 100] : rep > 0 ? [150, 150, 100] : [200, 100, 100];
            fill(repColor[0], repColor[1], repColor[2]);
            textSize(12);
            text('Rep: ' + rep, listX + 80, nationListY + nationCount * 25);
            textSize(16);

            nationCount += 1;
          }
        }
      }

      // Center: selected nation details
      if (this.selectedNation && state.nations[this.selectedNation]) {
        var selectedNation = state.nations[this.selectedNation];
        var detailX = panelX + 200;
        var detailY = panelY + 50;

        fill(200, 150, 50);
        textSize(14);
        var nationName = typeof getNationName !== 'undefined' ? getNationName(this.selectedNation) : this.selectedNation;
        text(nationName, detailX, detailY);

        textSize(12);
        fill(150, 130, 100);
        var needs = this.nationNeeds[this.selectedNation];
        if (needs) {
          var surplusKeys = Object.keys(needs.surplus);
          text('They have:', detailX, detailY + 30);
          var si;
          for (si = 0; si < surplusKeys.length; si++) {
            fill(200, 200, 100);
            text('+ ' + surplusKeys[si] + ': ' + needs.surplus[surplusKeys[si]], detailX + 10, detailY + 50 + si * 20);
          }

          var deficitKeys = Object.keys(needs.deficit);
          text('They need:', detailX, detailY + 120);
          var di;
          for (di = 0; di < deficitKeys.length; di++) {
            fill(150, 200, 150);
            text('- ' + deficitKeys[di] + ': ' + needs.deficit[deficitKeys[di]], detailX + 10, detailY + 140 + di * 20);
          }
        }
      }

      // Right side: trade proposal builder
      var buildX = panelX + 500;
      var buildY = panelY + 50;

      fill(200, 150, 50);
      textSize(14);
      text('Trade Builder', buildX, buildY);

      textSize(11);
      fill(150, 130, 100);
      text('You offer:', buildX, buildY + 30);

      var offerY = buildY + 50;
      var res;
      for (res in RESOURCE_VALUES) {
        if (RESOURCE_VALUES.hasOwnProperty(res)) {
          var offerQty = this.offerResources[res] || 0;
          var playerQty = state[res] || 0;
          var color = offerQty > 0 ? [150, 200, 150] : [100, 100, 100];
          fill(color[0], color[1], color[2]);
          text(res + ': ' + offerQty + ' (have: ' + playerQty + ')', buildX, offerY);
          offerY += 18;
        }
      }

      fill(150, 130, 100);
      text('You request:', buildX, offerY + 20);

      var requestY = offerY + 40;
      for (res in RESOURCE_VALUES) {
        if (RESOURCE_VALUES.hasOwnProperty(res)) {
          var requestQty = this.requestResources[res] || 0;
          var color = requestQty > 0 ? [150, 150, 200] : [100, 100, 100];
          fill(color[0], color[1], color[2]);
          text(res + ': ' + requestQty, buildX, requestY);
          requestY += 18;
        }
      }

      // Bottom: send button and info
      var buttonY = panelY + panelH - 60;
      fill(200, 150, 50);
      textSize(12);
      if (this.selectedNation) {
        var chance = this.calculateAcceptanceChance(this.selectedNation, this.offerResources, this.requestResources);
        text('Acceptance chance: ' + Math.floor(chance) + '%', buildX, buttonY);

        fill(100, 150, 200);
        rect(buildX, buttonY + 20, 100, 30);
        fill(0, 0, 0);
        textAlign(typeof CENTER !== 'undefined' ? CENTER : 3, typeof CENTER !== 'undefined' ? CENTER : 3);
        text('SEND TRADE', buildX + 50, buttonY + 35);
        textAlign(typeof LEFT !== 'undefined' ? LEFT : 0, typeof TOP !== 'undefined' ? TOP : 0);
      }

      fill(150, 100, 50);
      textSize(10);
      text('Close with ESC or T', panelX + 20, panelY + panelH - 20);
    },

    handleKey: function(key) {
      if (key === 't' || key === 'T') {
        if (!this.panelOpen) {
          this.togglePanel();
        } else {
          this.togglePanel();
        }
        return;
      }

      // Y/N for incoming offers
      if (key === 'y' || key === 'Y') {
        if (this.incomingOffers.length > 0) {
          var offer = this.incomingOffers[0];
          this.dispatchMerchant(offer.nationKey, offer.request, offer.offer);
          this.incomingOffers.splice(0, 1);
        }
        return;
      }

      if (key === 'n' || key === 'N') {
        if (this.incomingOffers.length > 0) {
          this.incomingOffers.splice(0, 1);
          if (typeof addNotification !== 'undefined') {
            addNotification('Trade offer declined.', [150, 100, 100]);
          }
        }
        return;
      }
    }
  };

  // ============================================================================
  // INITIALIZATION & PATCHING
  // ============================================================================

  // Initialize trade system
  TradeSystem.init();
  window.TradeSystem = TradeSystem;

  // Patch the game loop to include trade updates
  var originalDraw = typeof draw !== 'undefined' ? draw : null;
  if (originalDraw) {
    // Append trade drawing to existing draw
  }

  // Patch keyPressed to handle trade hotkeys
  var originalKeyPressed = typeof keyPressed !== 'undefined' ? keyPressed : null;
  if (typeof window !== 'undefined') {
    window.keyPressed = function() {
      if (typeof key !== 'undefined') {
        TradeSystem.handleKey(key);
      }
      if (originalKeyPressed) {
        return originalKeyPressed();
      }
    };
  }

  // Integration: these should be called in the main game loop
  // Call TradeSystem.update(dt) each frame
  // Call TradeSystem.draw() in the main draw loop
  // Call TradeSystem.drawPanel() in the main draw loop after all game objects

  console.log('[V2 TRADE] Loaded: Enhanced trading ecosystem');
})();

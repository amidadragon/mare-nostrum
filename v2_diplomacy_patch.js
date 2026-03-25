(function() {
  var DIPLOMACY_SCREEN_WIDTH = 0.92;
  var DIPLOMACY_SCREEN_HEIGHT = 0.92;
  var ACTION_COOLDOWN = 10;

  var originalDrawDiplomacyUI = typeof drawNationDiplomacyUI !== 'undefined' ? drawNationDiplomacyUI : null;
  var originalHandleDiplomacyKey = typeof handleNationDiplomacyKey !== 'undefined' ? handleNationDiplomacyKey : null;

  window.DiplomacySystem = {
    events: [],
    actionLog: {},
    relationships: {},
    worldViewOpen: false,
    selectedActionIndex: 0,

    init: function() {
      for (var key in state.nations) {
        this.actionLog[key] = [];
        this.relationships[key] = {
          lastTrade: 0,
          lastWar: 0,
          nap: false,
          napEndDay: 0,
          openBorders: false,
          bordersEndDay: 0,
          married: false,
          federated: false
        };
      }
    },

    addEvent: function(title, description, options, callback) {
      this.events.push({
        title: title,
        description: description,
        options: options,
        callback: callback,
        day: state.day
      });
    },

    logAction: function(nationKey, action, success) {
      if (!this.actionLog[nationKey]) this.actionLog[nationKey] = [];
      var logEntry = {
        action: action,
        success: success,
        day: state.day
      };
      this.actionLog[nationKey].unshift(logEntry);
      if (this.actionLog[nationKey].length > 5) {
        this.actionLog[nationKey].pop();
      }
    },

    getRelationshipLevel: function(nationKey) {
      var rep = state.nations[nationKey].reputation;
      if (rep > 50) return 'Friendly';
      if (rep > 20) return 'Warm';
      if (rep > 0) return 'Neutral+';
      if (rep === 0) return 'Neutral';
      if (rep > -20) return 'Cool';
      if (rep > -50) return 'Cold';
      if (rep > -80) return 'Hostile';
      return 'War';
    },

    checkValidAction: function(nationKey, action) {
      var nation = state.nations[nationKey];
      switch(action) {
        case 'nap':
          return state.gold >= 15 && nation.reputation > -20;
        case 'openBorders':
          return state.gold >= 20 && nation.reputation > 10;
        case 'embargo':
          return !nation.allied;
        case 'spy':
          return state.gold >= 40;
        case 'marriage':
          return state.gold >= 100 && state.harvest >= 50 && nation.reputation > 50 && !state.nations[nationKey].defeated;
        case 'federation':
          return state.gold >= 200 && nation.reputation > 75 && nation.allied;
        case 'vassalize':
          return state.military > (nation.military * 3);
        default:
          return true;
      }
    },

    executeAction: function(nationKey, action) {
      var nation = state.nations[nationKey];
      var rel = this.relationships[nationKey];

      switch(action) {
        case 'nap':
          if (this.checkValidAction(nationKey, action)) {
            state.gold -= 15;
            nation.reputation += 3;
            rel.nap = true;
            rel.napEndDay = state.day + 30;
            this.logAction(nationKey, 'Non-Aggression Pact', true);
          }
          break;
        case 'openBorders':
          if (this.checkValidAction(nationKey, action)) {
            state.gold -= 20;
            nation.reputation += 5;
            rel.openBorders = true;
            rel.bordersEndDay = state.day + 60;
            this.logAction(nationKey, 'Open Borders', true);
          }
          break;
        case 'embargo':
          if (this.checkValidAction(nationKey, action)) {
            nation.reputation -= 20;
            nation.tradeActive = false;
            this.logAction(nationKey, 'Embargo', true);
          }
          break;
        case 'spy':
          if (this.checkValidAction(nationKey, action)) {
            state.gold -= 40;
            var caught = Math.random() < 0.3;
            if (caught) {
              nation.reputation -= 15;
              this.logAction(nationKey, 'Spy Mission (Caught)', false);
            } else {
              this.logAction(nationKey, 'Spy Mission (Success)', true);
            }
          }
          break;
        case 'marriage':
          if (this.checkValidAction(nationKey, action)) {
            state.gold -= 100;
            state.harvest -= 50;
            nation.reputation += 30;
            rel.married = true;
            this.logAction(nationKey, 'Marriage Alliance', true);
          }
          break;
        case 'federation':
          if (this.checkValidAction(nationKey, action)) {
            state.gold -= 200;
            rel.federated = true;
            nation.reputation += 20;
            this.logAction(nationKey, 'Federation Proposal', true);
          }
          break;
        case 'vassalize':
          if (this.checkValidAction(nationKey, action)) {
            nation.vassal = true;
            nation.reputation -= 30;
            for (var k in state.nations) {
              if (k !== nationKey && k !== state.faction) {
                state.nations[k].reputation -= 10;
              }
            }
            this.logAction(nationKey, 'Vassalized', true);
          }
          break;
      }
    },

    updateExpiredAgreements: function() {
      for (var key in this.relationships) {
        var rel = this.relationships[key];
        if (rel.nap && state.day >= rel.napEndDay) {
          rel.nap = false;
        }
        if (rel.openBorders && state.day >= rel.bordersEndDay) {
          rel.openBorders = false;
        }
      }
    },

    triggerRandomEvent: function() {
      if (Math.random() > 0.05) return;

      var eventTypes = [
        'borderIncident',
        'tradeDispute',
        'allianceRequest',
        'warDeclaration',
        'peaceEnvoy',
        'festivalInvitation'
      ];

      var eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      var nationKeys = Object.keys(state.nations).filter(function(k) { return k !== state.faction; });
      var randomNation = nationKeys[Math.floor(Math.random() * nationKeys.length)];

      if (!randomNation) return;

      var nationName = getNationName(randomNation);

      switch(eventType) {
        case 'borderIncident':
          this.addEvent(
            'Border Incident',
            nationName + ' accuses you of encroaching on their territory.',
            ['Pay 20g', 'Ignore'],
            function(choice) {
              if (choice === 0) {
                state.gold -= 20;
                state.nations[randomNation].reputation += 5;
              } else {
                state.nations[randomNation].reputation -= 5;
              }
            }
          );
          break;
        case 'festivalInvitation':
          this.addEvent(
            'Festival Invitation',
            nationName + ' invites you to their spring festival.',
            ['Attend (+15g cost)', 'Decline'],
            function(choice) {
              if (choice === 0) {
                state.gold -= 15;
                state.nations[randomNation].reputation += 10;
              } else {
                state.nations[randomNation].reputation -= 5;
              }
            }
          );
          break;
      }
    }
  };

  if (typeof state !== 'undefined' && typeof state.nations !== 'undefined') {
    DiplomacySystem.init();
  }

  window.drawNationDiplomacyUI = function() {
    if (!state.diplomacyPanel) return;

    DiplomacySystem.updateExpiredAgreements();

    var key = state.diplomacyKey;
    var nation = state.nations[key];
    var screenW = width * DIPLOMACY_SCREEN_WIDTH;
    var screenH = height * DIPLOMACY_SCREEN_HEIGHT;
    var panelX = (width - screenW) / 2;
    var panelY = (height - screenH) / 2;

    push();
    fill(20, 20, 40);
    stroke(200, 180, 100);
    strokeWeight(3);
    rect(panelX, panelY, screenW, screenH, 8);

    var headerH = 60;
    fill(60, 50, 80);
    rect(panelX, panelY, screenW, headerH);

    fill(200, 180, 100);
    textSize(28);
    textAlign(LEFT, TOP);
    text(getNationName(key), panelX + 20, panelY + 12);

    var repLevel = DiplomacySystem.getRelationshipLevel(key);
    textSize(14);
    fill(200, 150, 150);
    text('Status: ' + repLevel, panelX + 20, panelY + 40);

    var repColor = lerpColor(color(255, 0, 0), color(0, 255, 0), (nation.reputation + 100) / 200);
    fill(repColor);
    rect(panelX + screenW - 180, panelY + 10, 160, 20);
    fill(0);
    textSize(12);
    text('Rep: ' + nation.reputation, panelX + screenW - 170, panelY + 12);

    var contentY = panelY + headerH + 15;
    var col1X = panelX + 15;
    var col2X = panelX + screenW * 0.35;
    var col3X = panelX + screenW * 0.65;
    var contentH = screenH - headerH - 30;

    fill(200, 150, 150);
    textSize(16);
    textAlign(LEFT, TOP);
    text('NATION INTEL', col1X, contentY);

    fill(150, 140, 160);
    textSize(12);
    var intelY = contentY + 25;
    text('Military: ' + nation.military, col1X, intelY);
    text('Economic: ' + nation.gold, col1X, intelY + 18);
    text('Population: ' + nation.population, col1X, intelY + 36);
    text('Personality: ' + nation.personality, col1X, intelY + 54);

    var actionLog = DiplomacySystem.actionLog[key] || [];
    fill(100, 200, 150);
    textSize(12);
    text('Recent Actions:', col1X, intelY + 80);
    for (var i = 0; i < Math.min(3, actionLog.length); i++) {
      var logText = actionLog[i].action + ' (' + (state.day - actionLog[i].day) + ' days ago)';
      fill(150, 150, 150);
      text(logText, col1X, intelY + 98 + i * 16);
    }

    fill(200, 150, 150);
    textSize(16);
    text('DIPLOMATIC ACTIONS', col2X, contentY);

    var actions = [
      { key: 'trade', label: '1. Trade', color: [100, 200, 100], cost: '0g' },
      { key: 'gift', label: '2. Gift', color: [150, 200, 100], cost: '10g' },
      { key: 'nap', label: '3. Non-Agg Pact', color: [100, 200, 100], cost: '15g' },
      { key: 'openBorders', label: '4. Open Borders', color: [100, 200, 150], cost: '20g' },
      { key: 'ally', label: '5. Alliance', color: [200, 200, 100], cost: '0g' },
      { key: 'embassy', label: '6. Embassy', color: [200, 180, 100], cost: '30g' },
      { key: 'marriage', label: '7. Marriage', color: [200, 150, 200], cost: '100g+50h' },
      { key: 'tribute', label: '8. Demand Tribute', color: [200, 100, 100], cost: '0g' },
      { key: 'embargo', label: '9. Embargo', color: [200, 80, 80], cost: '0g' }
    ];

    var actionY = contentY + 25;
    for (var i = 0; i < Math.min(9, actions.length); i++) {
      var action = actions[i];
      var valid = DiplomacySystem.checkValidAction(key, action.key);

      fill(action.color[0] * (valid ? 1 : 0.4),
           action.color[1] * (valid ? 1 : 0.4),
           action.color[2] * (valid ? 1 : 0.4));
      rect(col2X, actionY + i * 28, 180, 24, 3);

      fill(valid ? 255 : 120);
      textSize(11);
      textAlign(LEFT, CENTER);
      text(action.label + ' [' + action.cost + ']', col2X + 8, actionY + i * 28 + 12);
    }

    fill(200, 150, 150);
    textSize(16);
    textAlign(LEFT, TOP);
    text('WORLD STANDING', col3X, contentY);

    var standings = [];
    for (var k in state.nations) {
      standings.push({ key: k, power: state.nations[k].military + state.nations[k].gold });
    }
    standings.sort(function(a, b) { return b.power - a.power; });

    var standingY = contentY + 25;
    fill(150, 150, 150);
    textSize(11);
    for (var i = 0; i < Math.min(5, standings.length); i++) {
      var standKey = standings[i].key;
      var abbr = standKey.substring(0, 3).toUpperCase();
      var marker = standKey === key ? '> ' : '  ';
      text(marker + (i + 1) + '. ' + abbr + ' (' + standings[i].power + ')', col3X, standingY + i * 20);
    }

    standingY += 120;
    fill(100, 180, 150);
    textSize(11);
    text('Allies: ', col3X, standingY);
    if (nation.allied && nation.allied.length > 0) {
      text(nation.allied.join(', '), col3X, standingY + 16);
    } else {
      text('None', col3X, standingY + 16);
    }

    pop();
  };

  window.handleNationDiplomacyKey = function(k, kCode) {
    if (!state.diplomacyPanel) return;

    var key = state.diplomacyKey;
    var actionMap = {
      '1': 'trade',
      '2': 'gift',
      '3': 'nap',
      '4': 'openBorders',
      '5': 'ally',
      '6': 'embassy',
      '7': 'marriage',
      '8': 'tribute',
      '9': 'embargo'
    };

    if (actionMap[k]) {
      var action = actionMap[k];

      switch(action) {
        case 'trade':
          if (typeof nationTrade === 'function') nationTrade(key);
          break;
        case 'gift':
          if (typeof nationGift === 'function') nationGift(key);
          break;
        case 'nap':
          DiplomacySystem.executeAction(key, 'nap');
          break;
        case 'openBorders':
          DiplomacySystem.executeAction(key, 'openBorders');
          break;
        case 'ally':
          if (typeof nationAlly === 'function') nationAlly(key);
          break;
        case 'embassy':
          state.nations[key].reputation += 10;
          state.gold -= 30;
          DiplomacySystem.logAction(key, 'Embassy Built', true);
          break;
        case 'marriage':
          DiplomacySystem.executeAction(key, 'marriage');
          break;
        case 'tribute':
          if (typeof nationDemandTribute === 'function') nationDemandTribute(key);
          break;
        case 'embargo':
          DiplomacySystem.executeAction(key, 'embargo');
          break;
      }
    }

    if (kCode === 27) {
      closeNationDiplomacy();
    }
  };

  var originalKeyPressed = typeof keyPressed !== 'undefined' ? keyPressed : null;

  window.keyPressed = function() {
    // Close diplomacy views with ESC
    if (keyCode === 27) {
      if (DiplomacySystem.worldViewOpen) {
        DiplomacySystem.worldViewOpen = false;
        return false;
      }
    }

    // Intercept keys when diplomacy world view is open
    if (DiplomacySystem.worldViewOpen) {
      if (keyCode === 27) {
        DiplomacySystem.worldViewOpen = false;
      }
      return false;
    }

    // Nation diplomacy panel is handled by the base game's input.js
    // (state.nationDiplomacyOpen is checked there already)

    // Pass through to previous handler (trade patch or base game)
    if (originalKeyPressed) {
      return originalKeyPressed();
    }
  };

  var originalDraw = typeof draw !== 'undefined' ? draw : null;
  window.drawDiplomacyWorldView = function() {
    if (!DiplomacySystem.worldViewOpen) return;

    push();
    background(10, 10, 20, 200);

    fill(200, 180, 100);
    textSize(24);
    textAlign(CENTER, TOP);
    text('WORLD DIPLOMACY MAP', width / 2, 20);

    textSize(12);
    fill(150, 150, 150);
    text('Press ESC to close', width / 2, 50);

    var centerX = width / 2;
    var centerY = height / 2;
    var radius = Math.min(width, height) * 0.35;

    for (var key in state.nations) {
      var nation = state.nations[key];
      var angle = (Object.keys(state.nations).indexOf(key) / Object.keys(state.nations).length) * TWO_PI;
      var x = centerX + Math.cos(angle) * radius;
      var y = centerY + Math.sin(angle) * radius;

      var repColor = lerpColor(color(255, 0, 0), color(0, 255, 0), (nation.reputation + 100) / 200);
      fill(repColor);
      ellipse(x, y, 30, 30);

      fill(0);
      textSize(10);
      textAlign(CENTER, CENTER);
      text(key.substring(0, 3).toUpperCase(), x, y);
    }

    pop();
  };

  console.log('[V2 DIPLOMACY] Loaded: Enhanced diplomacy system');

})();

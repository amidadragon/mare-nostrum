// MARE NOSTRUM — Strategy Engine
// Every game is a strategy match: player vs 3-7 bot civilizations.
// Each civilization has its own procedural island, economy, military, and AI.
// Victory: domination, diplomatic, economic, or cultural.

const StrategyEngine = {
  // ═══ GAME SESSION ═══
  session: null,

  initSession(playerFaction, difficulty, nationCount) {
    this.session = {
      startDay: 1,
      difficulty: difficulty || 'normal',
      nationCount: nationCount || 3,
      playerFaction: playerFaction,
      turn: 0,
      events: [],
      worldTensions: 0, // 0-100, drives global conflict rate
      tradeVolume: 0,   // total gold traded this session
      warCount: 0,       // wars declared this session
      alliances: [],     // active alliance pairs [{a, b, day}]
      era: 1,            // global era (advances when avg level hits thresholds)
    };
    return this.session;
  },

  // ═══ STRATEGY TICK (called every in-game day) ═══
  updateStrategy() {
    if (!this.session || !state.nations) return;
    this.session.turn++;
    let nk = Object.keys(state.nations);

    // Era advancement: avg nation level
    let avgLevel = nk.reduce((s, k) => s + (state.nations[k].level || 1), state.islandLevel || 1) / (nk.length + 1);
    this.session.era = avgLevel < 5 ? 1 : avgLevel < 10 ? 2 : avgLevel < 15 ? 3 : 4;

    // World tension: rises with wars, drops with trade
    let wars = nk.filter(k => state.nations[k].wars && state.nations[k].wars.length > 0).length;
    let allies = nk.filter(k => state.nations[k].allies && state.nations[k].allies.length > 0).length;
    this.session.worldTensions = Math.min(100, Math.max(0,
      this.session.worldTensions + wars * 2 - allies * 1 - 0.5
    ));

    // Catch-up logic: weaker bots get resource bonuses, anti-snowball coalitions
    let rankings = this.getPowerRankings();
    let leaderPower = rankings.length > 0 ? rankings[0].power : 100;
    for (let k of nk) {
      let n = state.nations[k];
      if (!n || !n.isBot) continue;
      let botDiff = (typeof BOT_DIFFICULTY !== 'undefined' && BOT_DIFFICULTY[n.botDifficulty]) ? BOT_DIFFICULTY[n.botDifficulty] : {};
      let myPower = (n.islandState ? (n.islandState.islandLevel || n.level || 1) : (n.level || 1)) * 10 + (n.gold || 0) * 0.2 + (n.military || 0) * 5;
      let ratio = myPower / Math.max(1, leaderPower);
      n._catchupActive = ratio < (botDiff.catchupThreshold || 0.4);
      // Anti-snowball: non-leaders drift toward each other
      if (rankings.length > 0 && rankings[0].power > myPower * 2 && !n.vassal) {
        for (let k2 of nk) {
          if (k2 !== k && k2 !== rankings[0].key && state.nations[k2] && !state.nations[k2].vassal) {
            n.relations[k2] = Math.min(100, (n.relations[k2] || 0) + 0.5);
          }
        }
      }
    }

    // Era transition notifications
    let prevEra = this.session.era;
    if (this.session.turn % 30 === 0) {
      this._eraCheck(prevEra);
    }

    // World status ticker — every 15 days, brief summary of strongest bot
    if (this.session.turn % 15 === 0 && typeof addNotification === 'function') {
      let rankings = this.getPowerRankings().filter(r => !r.isPlayer);
      if (rankings.length > 0) {
        let top = rankings[0];
        let topN = nk.length > 0 ? state.nations[rankings[0].key] : null;
        if (topN) {
          let lvl = topN.islandState ? (topN.islandState.islandLevel || 1) : (topN.level || 1);
          let mil = topN.military || 0;
          addNotification('World Report: ' + top.name + ' leads (Lv' + lvl + ', ' + mil + ' troops, ' + top.power + ' power)', '#ccbb88');
        }
      }
    }

    // Bot strategic goals (long-term AI)
    for (let k of nk) {
      this._updateBotStrategy(k);
    }

    // Random world events
    if (Math.random() < 0.03 + this.session.worldTensions * 0.001) {
      this._worldEvent(nk);
    }
  },

  // ═══ BOT LONG-TERM STRATEGY ═══
  _updateBotStrategy(nationKey) {
    let n = state.nations[nationKey];
    if (!n || n.defeated) return;
    let is = n.islandState;
    if (!is) return;

    // Assess relative power
    let nk = Object.keys(state.nations);
    let myPower = (n.military || 0) * 2 + (n.gold || 0) * 0.1 + (n.population || 0);
    let avgPower = nk.reduce((s, k) => {
      let nn = state.nations[k];
      return s + (nn.military || 0) * 2 + (nn.gold || 0) * 0.1 + (nn.population || 0);
    }, 0) / Math.max(1, nk.length);
    let playerPower = (state.legia && state.legia.army ? state.legia.army.length : 0) * 2 + (state.gold || 0) * 0.1;

    // Set strategic posture based on relative strength
    if (!n._strategy) n._strategy = { posture: 'develop', target: null, timer: 0 };
    n._strategy.timer--;

    if (n._strategy.timer <= 0) {
      n._strategy.timer = 20 + Math.floor(Math.random() * 30);

      if (myPower > avgPower * 1.8 && n.personality !== 'trader') {
        // Strong: look for weak targets
        n._strategy.posture = 'expand';
        let weakest = nk.filter(k => k !== nationKey && !state.nations[k].defeated && !state.nations[k].allied)
          .sort((a, b) => (state.nations[a].military || 0) - (state.nations[b].military || 0))[0];
        n._strategy.target = weakest || null;
      } else if (myPower < avgPower * 0.5) {
        // Weak: seek allies
        n._strategy.posture = 'defensive';
        let strongest = nk.filter(k => k !== nationKey && !state.nations[k].defeated)
          .sort((a, b) => (state.nations[b].military || 0) - (state.nations[a].military || 0))[0];
        n._strategy.target = strongest || null;
        // Try to ally with strong neighbors
        if (strongest && n.relations && (n.relations[strongest] || 0) > 20) {
          if (!n.allies) n.allies = [];
          if (!n.allies.includes(strongest)) {
            n.allies.push(strongest);
            let other = state.nations[strongest];
            if (other && !other.allies) other.allies = [];
            if (other && !other.allies.includes(nationKey)) other.allies.push(nationKey);
            if (typeof addNotification === 'function')
              addNotification((typeof getNationName === 'function' ? getNationName(nationKey) : nationKey) + ' seeks alliance with ' + (typeof getNationName === 'function' ? getNationName(strongest) : strongest), '#88ccaa');
          }
        }
      } else if (n.personality === 'trader') {
        n._strategy.posture = 'trade';
      } else {
        n._strategy.posture = 'develop';
      }
    }

    // Apply strategic posture to nation behavior
    if (n._strategy.posture === 'expand' && n.gold > 20) {
      // Spend gold on military
      if (Math.random() < 0.1) { n.military++; n.gold -= 15; }
    } else if (n._strategy.posture === 'trade') {
      // Boost gold generation
      if (Math.random() < 0.05) n.gold += 5;
    }
  },

  // ═══ WORLD EVENTS ═══
  _worldEvent(nationKeys) {
    let events = [
      { type: 'plague', weight: 1, msg: ' suffers a plague! Population -2', effect: (k) => { state.nations[k].population = Math.max(1, (state.nations[k].population || 5) - 2); } },
      { type: 'bumperCrop', weight: 2, msg: ' has a bumper harvest! Gold +30', effect: (k) => { state.nations[k].gold += 30; } },
      { type: 'mercenaries', weight: 1, msg: ' hires mercenaries! Military +2', effect: (k) => { state.nations[k].military += 2; state.nations[k].gold -= 20; } },
      { type: 'earthquake', weight: 1, msg: ' hit by earthquake! Buildings damaged', effect: (k) => { if (state.nations[k].islandState && state.nations[k].islandState.buildings) state.nations[k].islandState.buildings.splice(-1, 1); } },
      { type: 'goldenAge', weight: 1, msg: ' enters a golden age! All stats +', effect: (k) => { state.nations[k].gold += 20; state.nations[k].population++; state.nations[k].reputation = (state.nations[k].reputation || 0) + 5; } },
      { type: 'refugee', weight: 2, msg: ' receives refugees! Population +3', effect: (k) => { state.nations[k].population += 3; } },
    ];

    // Weighted random selection
    let totalWeight = events.reduce((s, e) => s + e.weight, 0);
    let r = Math.random() * totalWeight;
    let event = events[0];
    for (let e of events) { r -= e.weight; if (r <= 0) { event = e; break; } }

    // Apply to random nation
    let target = nationKeys[Math.floor(Math.random() * nationKeys.length)];
    let name = typeof getNationName === 'function' ? getNationName(target) : target;

    // Only apply if nation can afford it
    if (event.type === 'mercenaries' && state.nations[target].gold < 20) return;

    event.effect(target);
    if (typeof addNotification === 'function') {
      let color = ['plague', 'earthquake'].includes(event.type) ? '#ff6644' : '#88cc88';
      addNotification(name + event.msg, color);
    }

    this.session.events.push({ day: state.day, type: event.type, target: target });
  },

  // ═══ ERA CHECK ═══
  _eraCheck(prevEra) {
    if (this.session.era !== prevEra) {
      let eraNames = ['', 'Bronze Age', 'Iron Age', 'Classical Age', 'Imperial Age'];
      if (typeof addNotification === 'function') {
        addNotification('The world enters the ' + eraNames[this.session.era] + '!', '#ffdd44');
      }
    }
  },

  // ═══ POWER RANKINGS ═══
  getPowerRankings() {
    let rankings = [];
    // Player
    let playerPower = (state.islandLevel || 1) * 10 + (state.gold || 0) * 0.2 + (state.legia && state.legia.army ? state.legia.army.length : 0) * 5;
    rankings.push({ key: state.faction || 'rome', name: 'You', power: Math.floor(playerPower), isPlayer: true });
    // Bots
    if (state.nations) {
      for (let k of Object.keys(state.nations)) {
        let n = state.nations[k];
        if (n.defeated && !n.vassal) continue;
        let _nLvl = n.islandState ? (n.islandState.islandLevel || n.level || 1) : (n.level || 1);
        let power = _nLvl * 10 + (n.gold || 0) * 0.2 + (n.military || 0) * 5 + (n.population || 0) * 2;
        if (n.vassal) power = Math.floor(power * 0.5); // vassals count at half power
        let name = typeof getNationName === 'function' ? getNationName(k) : k;
        rankings.push({ key: k, name: name, power: Math.floor(power), isPlayer: false });
      }
    }
    rankings.sort((a, b) => b.power - a.power);
    return rankings;
  },

  // ═══ DRAW POWER RANKINGS (mini-leaderboard) ═══
  drawPowerRankings() {
    if (!this.session) return;
    let rankings = this.getPowerRankings();
    let x = width - 135, y = 140;
    let panelH = 18 + Math.min(5, rankings.length) * 13;
    noStroke();
    fill(0, 0, 0, 130); rect(x - 5, y - 5, 135, panelH, 3);
    fill(220, 200, 160); textSize(8); textAlign(LEFT, TOP);
    let eraNames = ['', 'Bronze', 'Iron', 'Classical', 'Imperial'];
    text('RANKINGS (' + (eraNames[this.session.era] || '?') + ')', x, y);
    for (let i = 0; i < Math.min(5, rankings.length); i++) {
      let r = rankings[i];
      let ry = y + 13 + i * 12;
      let prefix = i === 0 ? '\u2655 ' : (i + 1) + '. ';
      fill(r.isPlayer ? 255 : 180, r.isPlayer ? 220 : 170, r.isPlayer ? 100 : 140, r.isPlayer ? 255 : 200);
      text(prefix + r.name, x, ry);
      textAlign(RIGHT, TOP);
      text(r.power, x + 125, ry);
      textAlign(LEFT, TOP);
    }
  },

  // ═══ VICTORY CONDITIONS (Conquest mode) ═══
  checkVictory() {
    if (state._gameMode !== 'conquest' || !state.nations) return null;
    if (state._victoryShown) return null;

    // EXPANSION VICTORY: first to level 15
    if ((state.islandLevel || 1) >= 15) {
      return { winner: state.faction, name: 'You', condition: 'expansion', message: 'Your civilization reached Level 15!' };
    }
    for (let k of Object.keys(state.nations)) {
      let n = state.nations[k];
      if (n.islandState && (n.islandState.islandLevel || 1) >= 15) {
        let name = typeof getNationName === 'function' ? getNationName(k) : k;
        return { winner: k, name: name, condition: 'expansion', isPlayer: false, message: name + ' reached Level 15!' };
      }
    }

    // DOMINATION VICTORY: all other nations defeated or vassalized
    let activeNations = Object.keys(state.nations).filter(k => !state.nations[k].defeated || state.nations[k].vassal);
    let allVassals = activeNations.every(k => state.nations[k].vassal);
    if (activeNations.length === 0 || allVassals) {
      return { winner: state.faction, name: 'You', condition: 'domination', message: 'All nations bow before you!' };
    }

    // ECONOMIC VICTORY: accumulate 500 gold
    if ((state.gold || 0) >= 500) {
      return { winner: state.faction, name: 'You', condition: 'economic', message: 'Your treasury overflows with 500 gold!' };
    }
    for (let k of Object.keys(state.nations)) {
      let n = state.nations[k];
      if ((n.gold || 0) >= 500) {
        let name = typeof getNationName === 'function' ? getNationName(k) : k;
        return { winner: k, name: name, condition: 'economic', isPlayer: false, message: name + ' amassed 500 gold!' };
      }
    }

    return null;
  },

  // ═══ DRAW VICTORY SCREEN ═══
  drawVictoryScreen(victory) {
    if (!victory) return;
    // Darken background
    fill(0, 0, 0, 180); rect(0, 0, width, height);
    // Victory panel
    let px = width / 2 - 180, py = height / 2 - 100;
    fill(30, 25, 20, 240); rect(px, py, 360, 200, 8);
    fill(180, 160, 100); rect(px + 2, py + 2, 356, 196, 7);
    fill(30, 25, 20, 240); rect(px + 6, py + 6, 348, 188, 5);
    // Title
    let isWin = victory.winner === state.faction;
    fill(isWin ? 255 : 200, isWin ? 220 : 80, isWin ? 100 : 80);
    textSize(22); textAlign(CENTER, TOP);
    text(isWin ? 'VICTORY!' : 'DEFEAT', width / 2, py + 20);
    // Condition
    let condNames = { expansion: 'Expansion Victory', domination: 'Domination Victory', economic: 'Economic Victory' };
    fill(220, 200, 160); textSize(12);
    text(condNames[victory.condition] || victory.condition, width / 2, py + 52);
    // Message
    fill(200, 190, 170); textSize(10);
    text(victory.message, width / 2, py + 75);
    // Winner
    fill(180, 170, 140); textSize(9);
    text('Winner: ' + victory.name, width / 2, py + 100);
    // Rankings
    let rankings = this.getPowerRankings();
    fill(160, 150, 130); textSize(8);
    for (let i = 0; i < Math.min(5, rankings.length); i++) {
      let r = rankings[i];
      fill(r.isPlayer ? 255 : 160, r.isPlayer ? 220 : 150, r.isPlayer ? 100 : 130);
      text((i + 1) + '. ' + r.name + ' — ' + r.power + ' power', width / 2, py + 120 + i * 12);
    }
    // Return to menu prompt
    fill(180, 170, 140, 150 + Math.sin(frameCount * 0.05) * 80); textSize(10);
    text('Press any key to return to menu', width / 2, py + 180);
    textAlign(LEFT, TOP);
  },
};

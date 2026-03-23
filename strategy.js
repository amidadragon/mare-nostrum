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

    // Era transition notifications
    let prevEra = this.session.era;
    if (this.session.turn % 30 === 0) {
      this._eraCheck(prevEra);
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
        if (n.defeated) continue;
        let power = (n.level || 1) * 10 + (n.gold || 0) * 0.2 + (n.military || 0) * 5 + (n.population || 0) * 2;
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
    let x = width - 140, y = 100;
    noStroke();
    fill(0, 0, 0, 140); rect(x - 5, y - 5, 140, 15 + rankings.length * 14, 3);
    fill(220, 200, 160); textSize(8); textAlign(LEFT, TOP);
    text('POWER RANKINGS', x, y);
    for (let i = 0; i < Math.min(8, rankings.length); i++) {
      let r = rankings[i];
      let ry = y + 14 + i * 13;
      fill(r.isPlayer ? 255 : 180, r.isPlayer ? 220 : 170, r.isPlayer ? 100 : 140, r.isPlayer ? 255 : 200);
      text((i + 1) + '. ' + r.name, x, ry);
      textAlign(RIGHT, TOP);
      text(r.power, x + 130, ry);
      textAlign(LEFT, TOP);
    }
    // Era indicator
    let eraNames = ['', 'Bronze', 'Iron', 'Classical', 'Imperial'];
    fill(200, 190, 140, 150); textSize(7);
    text('Era: ' + (eraNames[this.session.era] || 'Bronze'), x, y + 16 + Math.min(8, rankings.length) * 13);
  },
};

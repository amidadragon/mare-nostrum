// MARE NOSTRUM — Multiplayer (PeerJS WebRTC)
// Optional 1v1 real-time multiplayer. All calls guarded — single player unaffected.

// ═══════════════════════════════════════════════════════════
// BOT MANAGER — AI bots for multiplayer lobby
// ═══════════════════════════════════════════════════════════

const BOT_DIFFICULTY = {
  easy:   { goldMult: 0.5, buildMult: 0.5, militaryMult: 0.5, raidMult: 0.3 },
  normal: { goldMult: 1.0, buildMult: 1.0, militaryMult: 1.0, raidMult: 1.0 },
  hard:   { goldMult: 1.5, buildMult: 1.5, militaryMult: 1.5, raidMult: 1.5 },
};

const _BOT_NAMES = [
  'Maximus', 'Hannibal', 'Cleopatra', 'Leonidas', 'Boudicca',
  'Darius', 'Hiram', 'Brennus', 'Scipio', 'Nefertiti',
  'Themistocles', 'Sargon', 'Zenobia', 'Alaric', 'Hatshepsut',
  'Pyrrhus', 'Semiramis', 'Vercingetorix', 'Hamilcar', 'Ramesses'
];

function _randomBotName() {
  let available = _BOT_NAMES.filter(n => !MP.bots.find(b => b.name === n));
  if (available.length === 0) return 'Bot ' + MP.bots.length;
  return available[Math.floor(Math.random() * available.length)];
}

const _BOT_DIFF_CYCLE = ['easy', 'normal', 'hard'];

const MP = {
  peer: null,
  conn: null,
  isHost: false,
  connected: false,
  roomCode: '',
  remotePlayer: { x: 600, y: 400, facing: 'down', moving: false, faction: 'rome', name: 'Player 2', anim: 'idle', hp: 0, tool: null },
  remoteScreen: 'game',
  remoteBuildings: [],
  remoteIslandLevel: 1,
  remoteMilitary: 0,
  remoteGold: 0,
  chatMessages: [],
  _lastSync: 0,
  _lastPos: 0,

  // --- Bot system ---
  bots: [],
  maxBots: 7,

  addBot(difficulty) {
    if (this.bots.length >= this.maxBots) return null;
    difficulty = difficulty || 'normal';
    let bot = {
      id: 'bot_' + this.bots.length + '_' + Date.now(),
      name: _randomBotName(),
      faction: null,
      difficulty: difficulty,
      x: 550 + Math.random() * 100,
      y: 300 + Math.random() * 80,
      targetX: 550 + Math.random() * 100,
      targetY: 300 + Math.random() * 80,
      moveTimer: 0,
      pickTimer: 180 + Math.floor(Math.random() * 300), // 3-8s to pick faction
      ready: false,
    };
    this.bots.push(bot);
    return bot;
  },

  removeBot() {
    if (this.bots.length > 0) this.bots.pop();
  },

  cycleBotDifficulty(index) {
    if (index < 0 || index >= this.bots.length) return;
    let bot = this.bots[index];
    let ci = _BOT_DIFF_CYCLE.indexOf(bot.difficulty);
    bot.difficulty = _BOT_DIFF_CYCLE[(ci + 1) % _BOT_DIFF_CYCLE.length];
  },

  updateBotsLobby() {
    if (this.bots.length === 0) return;
    let allFactions = ['carthage', 'egypt', 'greece', 'rome', 'seapeople', 'persia', 'phoenicia', 'gaul'];
    // Determine claimed factions (by player + other bots)
    let claimed = [];
    if (state && state.faction) claimed.push(state.faction);
    for (let b of this.bots) { if (b.faction) claimed.push(b.faction); }

    for (let b of this.bots) {
      // Wander
      b.moveTimer--;
      if (b.moveTimer <= 0) {
        b.targetX = 480 + Math.random() * 200;
        b.targetY = 270 + Math.random() * 100;
        b.moveTimer = 120 + Math.floor(Math.random() * 120); // 2-4s
      }
      let dx = b.targetX - b.x, dy = b.targetY - b.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 2) {
        b.x += (dx / dist) * 0.5;
        b.y += (dy / dist) * 0.5;
      }

      // Auto-pick faction
      if (!b.faction && b.pickTimer > 0) {
        b.pickTimer--;
        if (b.pickTimer <= 0) {
          let available = allFactions.filter(f => !claimed.includes(f));
          if (available.length > 0) {
            b.faction = available[Math.floor(Math.random() * available.length)];
            claimed.push(b.faction);
            b.ready = true;
          }
        }
      }
    }
  },

  getClaimedFactions() {
    let claimed = [];
    if (state && state.faction) claimed.push(state.faction);
    for (let b of this.bots) { if (b.faction) claimed.push(b.faction); }
    return claimed;
  },

  allBotsReady() {
    return this.bots.length > 0 && this.bots.every(b => b.ready);
  },

  clearBots() {
    this.bots = [];
  },

  host() {
    this.isHost = true;
    this.roomCode = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.peer = new Peer('mare-' + this.roomCode);
    this.peer.on('open', () => {
      addNotification('Room: ' + this.roomCode + ' — waiting for player...', '#88ddff');
    });
    this.peer.on('connection', (conn) => {
      this.conn = conn;
      this.connected = true;
      this._setupConn();
      addNotification('Player 2 connected!', '#00ff88');
    });
    this.peer.on('error', (err) => {
      addNotification('Network error: ' + err.type, '#ff4444');
    });
  },

  join(code) {
    this.isHost = false;
    this.roomCode = code.toUpperCase();
    this.peer = new Peer();
    this.peer.on('open', () => {
      this.conn = this.peer.connect('mare-' + this.roomCode);
      this.conn.on('open', () => {
        this.connected = true;
        this._setupConn();
        addNotification('Connected to host!', '#00ff88');
      });
    });
    this.peer.on('error', (err) => {
      addNotification('Connection failed: ' + err.type, '#ff4444');
    });
  },

  _setupConn() {
    this.conn.on('data', (data) => this._onData(data));
    this.conn.on('close', () => {
      this.connected = false;
      addNotification('Player disconnected', '#ff8844');
    });
    this.send('init', {
      faction: state.faction || 'rome',
      islandLevel: state.islandLevel,
      name: state.islandName || 'Player'
    });
  },

  send(type, data) {
    if (!this.conn || !this.connected) return;
    try { this.conn.send({ type, data, t: Date.now() }); } catch(e) {}
  },

  _onData(msg) {
    switch(msg.type) {
      case 'init':
        this.remotePlayer.faction = msg.data.faction;
        this.remoteIslandLevel = msg.data.islandLevel;
        this.remotePlayer.name = msg.data.name || 'Player 2';
        addNotification(this.remotePlayer.name + ' (' + msg.data.faction + ') joined!', '#ffdd44');
        break;
      case 'pos':
        this.remotePlayer.x = msg.data.x;
        this.remotePlayer.y = msg.data.y;
        this.remotePlayer.facing = msg.data.f;
        this.remotePlayer.moving = msg.data.m;
        this.remotePlayer.anim = msg.data.anim || 'idle';
        break;
      case 'sync':
        this.remoteIslandLevel = msg.data.level;
        this.remoteBuildings = msg.data.buildings || [];
        this.remoteMilitary = msg.data.military;
        this.remoteGold = msg.data.gold;
        this.remoteScreen = msg.data.screen || 'game';
        this.remotePlayer.hp = msg.data.hp || 0;
        this.remotePlayer.tool = msg.data.tool || null;
        break;
      case 'chat':
        this.chatMessages.push({ from: this.remotePlayer.name, text: msg.data.text, time: Date.now() });
        if (this.chatMessages.length > 20) this.chatMessages.shift();
        addNotification(this.remotePlayer.name + ': ' + msg.data.text, '#aaddff');
        break;
      case 'attack':
        addNotification('INCOMING ATTACK from ' + this.remotePlayer.name + '!', '#ff4444');
        if (snd) snd.playSFX('war_horn');
        if (typeof startIslandDefense === 'function') {
          startIslandDefense(msg.data.troops, this.remotePlayer.faction || 'rome');
        }
        break;
      case 'trade_offer':
        state._mpTradeOffer = {
          from: this.remotePlayer.name,
          offeredGold: msg.data.myGold || 0,
          offeredWood: msg.data.myWood || 0,
          wantedGold: msg.data.wantGold || 0,
          wantedWood: msg.data.wantWood || 0,
          time: Date.now()
        };
        addNotification(this.remotePlayer.name + ' offers a trade!', '#ffdd44');
        break;
      case 'trade_accept':
        state.gold += msg.data.theirGold || 0;
        state.wood += msg.data.theirWood || 0;
        addNotification('Trade completed!', '#00ff88');
        break;
      case 'trade_decline':
        addNotification(this.remotePlayer.name + ' declined your trade.', '#ff8844');
        break;
      case 'lobby_pos':
      case 'relic_claim':
      case 'lobby_ready':
      case 'lobby_start':
        msg._peerId = this.conn && this.conn.peer ? this.conn.peer : 'remote';
        if (typeof handleLobbyMessage === 'function') handleLobbyMessage(msg);
        break;
    }
  },

  update() {
    if (!this.connected || !state || !state.player) return;
    let now = Date.now();

    if (now - this._lastPos > 100) {
      let p = state.player;
      let anim = p.dashTimer > 0 ? 'rolling' : (p.toolSwing > 0 ? 'attacking' : (p.moving ? 'walking' : 'idle'));
      this.send('pos', {
        x: p.x, y: p.y,
        f: p.facing, m: p.moving,
        anim: anim
      });
      this._lastPos = now;
    }

    if (now - this._lastSync > 5000) {
      this.send('sync', {
        level: state.islandLevel,
        buildings: (state.buildings || []).map(b => ({ x: b.x, y: b.y, type: b.type })),
        military: (state.legia && state.legia.army) ? state.legia.army.length : 0,
        gold: state.gold,
        screen: (typeof gameScreen !== 'undefined') ? gameScreen : 'game',
        hp: state.player.hp || 0,
        tool: state.equippedTool || null
      });
      this._lastSync = now;
    }
  },

  // Draw rival island on the horizon (visible from your island)
  drawRivalIsland() {
    if (!this.connected) return;
    let rp = this.remotePlayer;
    let fm = (typeof FACTION_MILITARY !== 'undefined' && FACTION_MILITARY[rp.faction]) ?
      FACTION_MILITARY[rp.faction] : { tunic: [160,50,40], cape: [145,28,22] };

    // Position: northeast horizon
    let baseX = width * 0.82;
    let baseY = height * 0.12 + sin(frameCount * 0.015) * 3; // gentle bob

    push();
    noStroke();

    // Island silhouette
    fill(80, 90, 70, 180);
    ellipse(baseX, baseY + 8, 70, 18);
    fill(90, 105, 80, 200);
    ellipse(baseX, baseY + 5, 60, 14);

    // Buildings silhouette
    fill(fm.tunic[0], fm.tunic[1], fm.tunic[2], 140);
    rect(baseX - 15, baseY - 12, 8, 14, 1); // tower
    rect(baseX - 5, baseY - 8, 12, 10, 1);  // main building
    rect(baseX + 10, baseY - 6, 7, 8, 1);   // small building

    // Flag with faction color
    fill(fm.cape[0], fm.cape[1], fm.cape[2], 180);
    rect(baseX - 15, baseY - 18, 1, 8);     // pole
    let flagWave = sin(frameCount * 0.1) * 2;
    rect(baseX - 14, baseY - 18, 8 + flagWave, 4, 1); // flag

    // Name label
    fill(255, 220, 120, 180);
    textAlign(CENTER, BOTTOM);
    textSize(8);
    text(rp.name + "'s Isle", baseX, baseY - 20);

    // Level indicator
    fill(200, 200, 200, 150);
    textSize(7);
    text('Lv.' + this.remoteIslandLevel, baseX, baseY - 12);

    textAlign(LEFT, TOP);
    pop();
  },

  drawHUD() {
    if (!this.connected && !state._mpMenuOpen) return;

    push();
    noStroke();
    // Rival panel (top-right)
    if (this.connected) {
      let rp = this.remotePlayer;
      let fm = (typeof FACTION_MILITARY !== 'undefined' && FACTION_MILITARY[rp.faction]) ?
        FACTION_MILITARY[rp.faction] : { tunic: [160,50,40] };
      let pw = 150, ph = 62;
      let px = width - pw - 10, py = 8;

      // Panel background
      fill(20, 15, 8, 200);
      stroke(fm.tunic[0], fm.tunic[1], fm.tunic[2], 150);
      strokeWeight(1);
      rect(px, py, pw, ph, 4);
      noStroke();

      // Connection dot
      fill(0, 255, 120);
      ellipse(px + 10, py + 10, 6, 6);

      // Name + faction
      fill(255, 220, 120);
      textSize(10);
      textAlign(LEFT, TOP);
      text(rp.name, px + 18, py + 5);
      fill(180, 180, 180);
      textSize(8);
      let facName = (typeof FACTIONS !== 'undefined' && FACTIONS[rp.faction]) ? FACTIONS[rp.faction].name : rp.faction;
      text(facName + ' | Lv.' + this.remoteIslandLevel, px + 18, py + 18);

      // Stats row
      fill(255, 210, 80);
      textSize(8);
      text('Gold: ' + this.remoteGold, px + 8, py + 32);
      fill(200, 200, 200);
      text('Army: ' + this.remoteMilitary, px + 80, py + 32);

      // Action buttons
      let btnW = 65, btnH = 14, btnY2 = py + 44;
      // Trade button
      fill(60, 100, 50);
      rect(px + 6, btnY2, btnW, btnH, 2);
      fill(255);
      textSize(7);
      textAlign(CENTER, CENTER);
      text('TRADE', px + 6 + btnW/2, btnY2 + btnH/2);
      // Attack button
      fill(120, 40, 40);
      rect(px + 78, btnY2, btnW, btnH, 2);
      fill(255);
      text('ATTACK', px + 78 + btnW/2, btnY2 + btnH/2);

      textAlign(LEFT, TOP);
    } else {
      fill('#ff4444');
      ellipse(width - 20, 20, 8, 8);
      fill(255);
      textSize(9);
      textAlign(RIGHT, TOP);
      text('OFFLINE', width - 28, 14);
    }

    if (this.chatMessages.length > 0) {
      let cy = height - 80;
      textSize(10);
      textAlign(LEFT, BOTTOM);
      for (let i = this.chatMessages.length - 1; i >= Math.max(0, this.chatMessages.length - 5); i--) {
        let m = this.chatMessages[i];
        let age = (Date.now() - m.time) / 1000;
        if (age > 30) continue;
        let alpha = age > 25 ? (30 - age) / 5 : 1;
        fill(255, 255, 255, 180 * alpha);
        text(m.from + ': ' + m.text, 14, cy);
        cy -= 14;
      }
    }

    // Chat input
    if (state._chatOpen) {
      fill(0, 0, 0, 180);
      rect(10, height - 36, 300, 24, 4);
      fill(255);
      textSize(11);
      textAlign(LEFT, CENTER);
      text('> ' + (state._chatInput || '') + (frameCount % 40 < 20 ? '_' : ''), 16, height - 24);
    }

    // Trade offer popup
    this.drawTradeOffer();

    textAlign(LEFT, TOP);
    pop();
  },

  drawTradeOffer() {
    let offer = state._mpTradeOffer;
    if (!offer) return;
    if (Date.now() - offer.time > 30000) {
      this.send('trade_decline', {});
      state._mpTradeOffer = null;
      addNotification('Trade offer expired.', '#ff8844');
      return;
    }

    let pw = 260, ph = 130;
    let px = width / 2 - pw / 2, py = height / 2 - ph / 2;

    fill(40, 30, 15, 230);
    stroke(180, 150, 80);
    strokeWeight(2);
    rect(px, py, pw, ph, 6);
    noStroke();

    fill(255, 220, 120);
    textSize(12);
    textAlign(CENTER, TOP);
    text('Trade from ' + offer.from, width / 2, py + 10);

    fill(255);
    textSize(11);
    textAlign(LEFT, TOP);
    let ly = py + 30;
    text('Offers: ' + offer.offeredGold + ' gold, ' + offer.offeredWood + ' wood', px + 14, ly);
    text('Wants:  ' + offer.wantedGold + ' gold, ' + offer.wantedWood + ' wood', px + 14, ly + 18);

    let secsLeft = Math.ceil((30000 - (Date.now() - offer.time)) / 1000);
    fill(180, 180, 180);
    textSize(9);
    textAlign(CENTER, TOP);
    text(secsLeft + 's remaining', width / 2, ly + 40);

    let btnY = py + ph - 34;
    let btnW = 90, btnH = 24;
    let axP = width / 2 - btnW - 10;
    fill(40, 140, 60);
    rect(axP, btnY, btnW, btnH, 4);
    fill(255);
    textSize(11);
    textAlign(CENTER, CENTER);
    text('ACCEPT', axP + btnW / 2, btnY + btnH / 2);
    let dxP = width / 2 + 10;
    fill(140, 40, 40);
    rect(dxP, btnY, btnW, btnH, 4);
    fill(255);
    text('DECLINE', dxP + btnW / 2, btnY + btnH / 2);

    textAlign(LEFT, TOP);
  },

  handleTradeOfferClick(mx, my) {
    let offer = state._mpTradeOffer;
    if (!offer) return false;

    let pw = 260, ph = 130;
    let px = width / 2 - pw / 2, py = height / 2 - ph / 2;
    let btnY = py + ph - 34;
    let btnW = 90, btnH = 24;

    let axP = width / 2 - btnW - 10;
    if (mx > axP && mx < axP + btnW && my > btnY && my < btnY + btnH) {
      if (state.gold < offer.wantedGold || state.wood < offer.wantedWood) {
        addNotification('Not enough resources!', '#ff4444');
        return true;
      }
      state.gold -= offer.wantedGold;
      state.wood -= offer.wantedWood;
      state.gold += offer.offeredGold;
      state.wood += offer.offeredWood;
      this.send('trade_accept', { theirGold: offer.wantedGold, theirWood: offer.wantedWood });
      addNotification('Trade accepted!', '#00ff88');
      state._mpTradeOffer = null;
      return true;
    }

    let dxP = width / 2 + 10;
    if (mx > dxP && mx < dxP + btnW && my > btnY && my < btnY + btnH) {
      this.send('trade_decline', {});
      state._mpTradeOffer = null;
      addNotification('Trade declined.', '#ff8844');
      return true;
    }

    if (mx > px && mx < px + pw && my > py && my < py + ph) return true;
    return false;
  },

  handleRivalPanelClick(mx, my) {
    if (!this.connected) return false;
    let pw = 150, ph = 62;
    let px = width - pw - 10, py = 8;
    if (mx < px || mx > px + pw || my < py || my > py + ph) return false;

    let btnW = 65, btnH = 14, btnY2 = py + 44;
    // Trade button
    if (mx > px + 6 && mx < px + 6 + btnW && my > btnY2 && my < btnY2 + btnH) {
      // Quick trade: offer 20 gold for 20 wood
      let offerGold = Math.min(20, state.gold);
      this.offerTrade(offerGold, 0, 0, 20);
      addNotification('Offered ' + offerGold + ' gold for 20 wood.', '#ffdd44');
      return true;
    }
    // Attack button
    if (mx > px + 78 && mx < px + 78 + btnW && my > btnY2 && my < btnY2 + btnH) {
      let deployed = 0;
      if (state.legia && state.legia.army) {
        deployed = state.legia.army.filter(s => !s.garrison).length;
      }
      if (deployed < 3) {
        addNotification('Need at least 3 deployed soldiers to attack!', '#ff4444');
      } else {
        this.attackRemote(deployed);
      }
      return true;
    }
    return true; // consumed click (on panel)
  },

  chat(text) {
    if (!this.connected) return;
    this.send('chat', { text: text });
    this.chatMessages.push({ from: 'You', text: text, time: Date.now() });
    if (this.chatMessages.length > 20) this.chatMessages.shift();
  },

  attackRemote(troops) {
    if (!this.connected) return;
    this.send('attack', { troops: troops });
    addNotification('Attacking ' + this.remotePlayer.name + '!', '#ff8844');
  },

  offerTrade(myGold, myWood, wantGold, wantWood) {
    if (!this.connected) return;
    this.send('trade_offer', { myGold: myGold, myWood: myWood, wantGold: wantGold, wantWood: wantWood });
  },

  disconnect() {
    if (this.conn) this.conn.close();
    if (this.peer) this.peer.destroy();
    this.connected = false;
    this.peer = null;
    this.conn = null;
  }
};

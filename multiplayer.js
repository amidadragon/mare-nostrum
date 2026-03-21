// MARE NOSTRUM — Multiplayer (PeerJS WebRTC)
// Optional 1v1 real-time multiplayer. All calls guarded — single player unaffected.

const MP = {
  peer: null,
  conn: null,
  isHost: false,
  connected: false,
  roomCode: '',
  remotePlayer: { x: 600, y: 400, facing: 'down', moving: false, faction: 'rome', name: 'Player 2' },
  remoteBuildings: [],
  remoteIslandLevel: 1,
  remoteMilitary: 0,
  remoteGold: 0,
  chatMessages: [],
  _lastSync: 0,
  _lastPos: 0,

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
        break;
      case 'sync':
        this.remoteIslandLevel = msg.data.level;
        this.remoteBuildings = msg.data.buildings || [];
        this.remoteMilitary = msg.data.military;
        this.remoteGold = msg.data.gold;
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
    }
  },

  update() {
    if (!this.connected || !state || !state.player) return;
    let now = Date.now();

    if (now - this._lastPos > 100) {
      this.send('pos', {
        x: state.player.x, y: state.player.y,
        f: state.player.facing, m: state.player.moving
      });
      this._lastPos = now;
    }

    if (now - this._lastSync > 5000) {
      this.send('sync', {
        level: state.islandLevel,
        buildings: (state.buildings || []).map(b => ({ x: b.x, y: b.y, type: b.type })),
        military: (state.legia && state.legia.army) ? state.legia.army.length : 0,
        gold: state.gold
      });
      this._lastSync = now;
    }
  },

  drawRemotePlayer() {
    if (!this.connected) return;
    let rp = this.remotePlayer;
    let shX = (typeof shakeX !== 'undefined') ? shakeX : 0;
    let shY = (typeof shakeY !== 'undefined') ? shakeY : 0;
    let fOff = (typeof floatOffset !== 'undefined') ? floatOffset : 0;
    let sx = w2sX(rp.x) + shX, sy = w2sY(rp.y) + shY + fOff;
    if (sx < -50 || sx > width + 50) return;

    push();
    let fc = { rome: [180,50,50], carthage: [140,80,180], egypt: [200,170,50], greece: [60,120,200] };
    let c = fc[rp.faction] || fc.rome;

    // Glow outline to distinguish remote player
    let glowAlpha = (typeof frameCount !== 'undefined') ? (sin(frameCount * 0.08) * 30 + 60) : 60;
    noFill();
    stroke(c[0], c[1], c[2], glowAlpha);
    strokeWeight(2);
    ellipse(sx, sy - 5, 20, 28);
    noStroke();

    // Shadow
    fill(0, 0, 0, 40);
    ellipse(sx, sy + 8, 14, 6);

    // Body
    fill(c[0], c[1], c[2]);
    rect(sx - 5, sy - 12, 10, 14, 2);

    // Head
    fill(220, 190, 160);
    rect(sx - 4, sy - 18, 8, 7, 2);

    // Name label
    fill(255, 255, 255, 200);
    textAlign(CENTER, BOTTOM);
    textSize(9);
    text(rp.name, sx, sy - 22);
    textAlign(LEFT, TOP);
    pop();
  },

  drawHUD() {
    if (!this.connected && !state._mpMenuOpen) return;

    push();
    noStroke();
    fill(this.connected ? '#00ff88' : '#ff4444');
    ellipse(width - 20, 20, 8, 8);
    fill(255);
    textSize(9);
    textAlign(RIGHT, TOP);
    text(this.connected ? 'P2: ' + this.remotePlayer.name : 'OFFLINE', width - 28, 14);

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

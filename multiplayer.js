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
          startIslandDefense({ military: msg.data.troops, faction: this.remotePlayer.faction });
        }
        break;
      case 'trade_offer':
        state._mpTradeOffer = msg.data;
        addNotification(this.remotePlayer.name + ' offers a trade!', '#ffdd44');
        break;
      case 'trade_accept':
        state.gold += msg.data.theirGold || 0;
        state.wood += msg.data.theirWood || 0;
        addNotification('Trade completed!', '#00ff88');
        break;
    }
  },

  update() {
    if (!this.connected) return;
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
        buildings: state.buildings.map(b => ({ x: b.x, y: b.y, type: b.type })),
        military: state.legia ? state.legia.army.length : 0,
        gold: state.gold
      });
      this._lastSync = now;
    }
  },

  drawRemotePlayer() {
    if (!this.connected) return;
    let rp = this.remotePlayer;
    let sx = w2sX(rp.x), sy = w2sY(rp.y);
    if (sx < -50 || sx > width + 50) return;

    push();
    let fc = { rome: [180,50,50], carthage: [140,80,180], egypt: [200,170,50], greece: [60,120,200] };
    let c = fc[rp.faction] || fc.rome;

    fill(0, 0, 0, 40); noStroke();
    ellipse(sx, sy + 8, 14, 6);

    fill(c[0], c[1], c[2]);
    rect(sx - 5, sy - 12, 10, 14, 2);

    fill(220, 190, 160);
    rect(sx - 4, sy - 18, 8, 7, 2);

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

    textAlign(LEFT, TOP);
    pop();
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

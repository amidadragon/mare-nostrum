// ═══ MARE NOSTRUM DEBUG CONSOLE ════════════════════════════════════════════
// Press ` (backtick) to toggle. Type commands and press Enter.
// Loaded AFTER sketch.js so it can access all game globals.

const Debug = {
  open: false,
  input: '',
  history: [],
  log: [],
  maxLog: 20,
  cursorBlink: 0,

  toggle() {
    this.open = !this.open;
    this.input = '';
  },

  addLog(msg, color) {
    this.log.push({ msg, color: color || '#aaffaa', time: millis() });
    if (this.log.length > this.maxLog) this.log.shift();
  },

  exec(cmd) {
    this.history.push(cmd);
    if (this.history.length > 50) this.history.shift();
    let parts = cmd.trim().split(/\s+/);
    let c = parts[0].toLowerCase();
    let args = parts.slice(1);

    try {
      switch (c) {
        case '/god':
          state.player.hp = 99999;
          state.player.maxHp = 99999;
          state.player.attackDamage = 999;
          this.addLog('GOD MODE — invincible, max damage', '#ffdd44');
          break;

        case '/gold':
          let g = parseInt(args[0]) || 9999;
          state.gold += g;
          this.addLog('+' + g + ' gold (total: ' + state.gold + ')', '#ffcc44');
          break;

        case '/crystals':
          let cr = parseInt(args[0]) || 999;
          state.crystals += cr;
          this.addLog('+' + cr + ' crystals', '#44ffaa');
          break;

        case '/wood':
          let wd = parseInt(args[0]) || 999;
          state.wood += wd;
          this.addLog('+' + wd + ' wood', '#bb8844');
          break;

        case '/stone':
          let st = parseInt(args[0]) || 999;
          state.stone += st;
          this.addLog('+' + st + ' stone', '#aaaaaa');
          break;

        case '/iron':
          let ir = parseInt(args[0]) || 99;
          state.ironOre += ir;
          this.addLog('+' + ir + ' iron ore', '#aabbcc');
          break;

        case '/relics':
          let rl = parseInt(args[0]) || 50;
          state.ancientRelic += rl;
          this.addLog('+' + rl + ' ancient relics', '#ff88ff');
          break;

        case '/bone':
          let bn = parseInt(args[0]) || 20;
          state.titanBone += bn;
          this.addLog('+' + bn + ' titan bone', '#ffdd88');
          break;

        case '/seeds':
          let sd = parseInt(args[0]) || 99;
          state.seeds += sd;
          this.addLog('+' + sd + ' seeds', '#88cc44');
          break;

        case '/level':
          let lvl = parseInt(args[0]) || 20;
          while (state.islandLevel < lvl && state.islandLevel < 25) {
            state.islandLevel++;
            state.islandRX += 40;
            state.islandRY += 25;
            state.pyramid.level = state.islandLevel;
          }
          this.addLog('Island level set to ' + state.islandLevel, '#ffaa00');
          break;

        case '/tp':
        case '/teleport':
          let tx = parseFloat(args[0]);
          let ty = parseFloat(args[1]);
          if (!isNaN(tx) && !isNaN(ty)) {
            state.player.x = tx;
            state.player.y = ty;
            cam.x = tx; cam.y = ty;
            camSmooth.x = tx; camSmooth.y = ty;
            this.addLog('Teleported to (' + tx + ', ' + ty + ')', '#88ddff');
          } else {
            this.addLog('Usage: /tp <x> <y>', '#ff8888');
          }
          break;

        case '/home':
          state.player.x = WORLD.islandCX;
          state.player.y = WORLD.islandCY;
          cam.x = state.player.x; cam.y = state.player.y;
          camSmooth.x = cam.x; camSmooth.y = cam.y;
          if (state.conquest.active) state.conquest.active = false;
          if (state.adventure.active) state.adventure.active = false;
          state.rowing.active = false;
          this.addLog('Teleported home', '#88ddff');
          break;

        case '/terra':
          state.player.x = state.conquest.isleX;
          state.player.y = state.conquest.isleY;
          cam.x = state.player.x; cam.y = state.player.y;
          camSmooth.x = cam.x; camSmooth.y = cam.y;
          this.addLog('Teleported to Terra Nova', '#88ddff');
          break;

        case '/settle':
          state.conquest.phase = 'settled';
          state.conquest.waveCount = 3;
          this.addLog('Terra Nova settled!', '#88cc88');
          break;

        case '/colonize':
          if (typeof colonizeTerraNovaAction === 'function') {
            state.conquest.phase = 'settled';
            // Give resources for colonization
            state.gold = Math.max(state.gold, 300);
            state.wood = Math.max(state.wood, 100);
            state.stone = Math.max(state.stone, 60);
            state.ironOre = Math.max(state.ironOre, 25);
            state.ancientRelic = Math.max(state.ancientRelic, 10);
            colonizeTerraNovaAction();
            this.addLog('Terra Nova colonized!', '#ffdd44');
          }
          break;

        case '/bridge':
          if (typeof startBuildBridge === 'function') {
            state.imperialBridge.built = true;
            state.imperialBridge.building = false;
            state.imperialBridge.progress = 100;
            // Generate segments
            let homeX = WORLD.islandCX - state.islandRX * 0.9;
            let terraX = state.conquest.isleX + state.conquest.isleRX * 0.9;
            let bridgeY = WORLD.islandCY;
            let totalDist = homeX - terraX;
            let numSegs = Math.floor(Math.abs(totalDist) / 40);
            state.imperialBridge.segments = [];
            for (let i = 0; i <= numSegs; i++) {
              let t = i / numSegs;
              state.imperialBridge.segments.push({
                x: terraX + t * totalDist,
                y: bridgeY - Math.sin(t * Math.PI) * 30,
                w: 42, h: 20, archIdx: i, total: numSegs,
              });
            }
            this.addLog('Imperial Bridge complete!', '#ffaa00');
          }
          break;

        case '/day':
          let d = parseInt(args[0]) || 1;
          state.day += d;
          this.addLog('Advanced ' + d + ' day(s). Now day ' + state.day, '#aaddff');
          break;

        case '/time':
          let hr = parseInt(args[0]);
          if (!isNaN(hr)) {
            state.time = hr * 60;
            this.addLog('Time set to ' + hr + ':00', '#aaddff');
          } else {
            this.addLog('Current time: ' + Math.floor(state.time / 60) + ':' + String(Math.floor(state.time % 60)).padStart(2, '0'), '#aaddff');
          }
          break;

        case '/heal':
          state.player.hp = state.player.maxHp;
          state.centurion.hp = state.centurion.maxHp;
          this.addLog('Full heal!', '#88ff88');
          break;

        case '/weapon':
          let wlvl = parseInt(args[0]);
          if (!isNaN(wlvl)) {
            state.player.weapon = constrain(wlvl, 0, 2);
            this.addLog('Weapon set to tier ' + wlvl, '#ffaa44');
          }
          break;

        case '/armor':
          let alvl = parseInt(args[0]);
          if (!isNaN(alvl)) {
            state.player.armor = constrain(alvl, 0, 3);
            this.addLog('Armor set to tier ' + alvl, '#aabbdd');
          }
          break;

        case '/hearts':
          let npc = args[0] || 'npc';
          let hearts = parseInt(args[1]) || 10;
          if (state[npc] && state[npc].hearts !== undefined) {
            state[npc].hearts = hearts;
            this.addLog(npc + ' hearts set to ' + hearts, '#ff88aa');
          } else {
            this.addLog('NPCs: npc, marcus, vesta, felix', '#ff8888');
          }
          break;

        case '/pos':
          this.addLog('Player: (' + Math.floor(state.player.x) + ', ' + Math.floor(state.player.y) + ')', '#aaddff');
          this.addLog('Camera: (' + Math.floor(cam.x) + ', ' + Math.floor(cam.y) + ')', '#aaddff');
          break;

        case '/save':
          if (typeof saveGame === 'function') { saveGame(); this.addLog('Game saved', '#88ff88'); }
          break;

        case '/fps':
          this.addLog('FPS: ' + Math.floor(frameRate()), '#aaddff');
          break;

        case '/allres':
          state.gold += 9999; state.wood += 999; state.stone += 999;
          state.crystals += 999; state.seeds += 999; state.harvest += 999;
          state.fish += 999; state.ironOre += 999; state.rareHide += 99;
          state.ancientRelic += 99; state.titanBone += 50;
          state.grapeSeeds += 99; state.oliveSeeds += 99;
          state.meals += 99; state.wine += 99; state.oil += 99;
          this.addLog('All resources maxed!', '#ffdd44');
          break;

        case '/spawn':
          let etype = args[0] || 'wolf';
          if (state.conquest.active) {
            let c = state.conquest;
            let ex = state.player.x + (Math.random() - 0.5) * 200;
            let ey = state.player.y + (Math.random() - 0.5) * 200;
            if (typeof spawnConquestEnemy === 'function') {
              spawnConquestEnemy(c, etype);
              this.addLog('Spawned ' + etype, '#ff8844');
            }
          } else {
            this.addLog('Must be on conquest island to spawn enemies', '#ff8888');
          }
          break;

        case '/help':
          this.addLog('─── DEBUG COMMANDS ───', '#ffdd44');
          this.addLog('/god — invincible + max damage', '#aaffaa');
          this.addLog('/gold /wood /stone /crystals /iron /relics /bone /seeds [n]', '#aaffaa');
          this.addLog('/allres — max all resources', '#aaffaa');
          this.addLog('/level [n] — set island level', '#aaffaa');
          this.addLog('/tp <x> <y> — teleport', '#aaffaa');
          this.addLog('/home /terra — quick teleport', '#aaffaa');
          this.addLog('/settle — settle Terra Nova', '#aaffaa');
          this.addLog('/colonize — colonize Terra Nova', '#aaffaa');
          this.addLog('/bridge — complete Imperial Bridge', '#aaffaa');
          this.addLog('/day [n] — advance days', '#aaffaa');
          this.addLog('/time [hr] — set time', '#aaffaa');
          this.addLog('/heal — full heal', '#aaffaa');
          this.addLog('/weapon [0-2] /armor [0-3]', '#aaffaa');
          this.addLog('/hearts <npc> [n] — set hearts', '#aaffaa');
          this.addLog('/spawn <type> — spawn enemy', '#aaffaa');
          this.addLog('/pos /fps /save', '#aaffaa');
          break;

        default:
          // Try eval for advanced debugging
          try {
            let result = eval(cmd);
            this.addLog('> ' + String(result).substring(0, 80), '#cccccc');
          } catch (e2) {
            this.addLog('Unknown command: ' + c + ' (/help for list)', '#ff8888');
          }
      }
    } catch (e) {
      this.addLog('Error: ' + e.message, '#ff4444');
    }
  },

  draw() {
    if (!this.open) return;
    this.cursorBlink += 0.05;

    let w = width, h = height;
    let panelH = Math.min(h * 0.45, 320);
    let panelY = h - panelH;

    push();
    // Background
    noStroke();
    fill(5, 8, 15, 220);
    rect(0, panelY, w, panelH);
    // Top border
    fill(180, 150, 80, 100);
    rect(0, panelY, w, 2);

    // Title
    fill(180, 150, 80, 200);
    textFont('Courier New, monospace');
    textSize(10);
    textAlign(LEFT, TOP);
    text('MARE NOSTRUM DEBUG CONSOLE', 10, panelY + 6);
    fill(100, 90, 70, 120);
    text('` to close | /help for commands', 10, panelY + 18);

    // Log
    let logY = panelY + 34;
    let lineH = 14;
    let maxLines = Math.floor((panelH - 60) / lineH);
    let startIdx = Math.max(0, this.log.length - maxLines);
    for (let i = startIdx; i < this.log.length; i++) {
      let entry = this.log[i];
      fill(entry.color || '#aaffaa');
      textSize(10);
      text(entry.msg, 14, logY);
      logY += lineH;
    }

    // Input line
    let inputY = h - 24;
    fill(20, 25, 35, 200);
    rect(0, inputY - 4, w, 24);
    fill(180, 150, 80);
    textSize(11);
    let cursor = Math.sin(this.cursorBlink * 3) > 0 ? '_' : ' ';
    text('> ' + this.input + cursor, 10, inputY);

    pop();
  },

  handleKey(key, keyCode) {
    if (key === '`') {
      this.toggle();
      return true;
    }
    if (!this.open) return false;

    if (keyCode === 13) { // Enter
      if (this.input.trim()) {
        this.addLog('> ' + this.input, '#888888');
        this.exec(this.input);
        this.input = '';
      }
      return true;
    }
    if (keyCode === 8) { // Backspace
      this.input = this.input.slice(0, -1);
      return true;
    }
    if (keyCode === 27) { // Escape
      this.open = false;
      return true;
    }
    // Printable characters
    if (key.length === 1 && keyCode !== 192) { // not backtick
      this.input += key;
      return true;
    }
    return true; // consume all keys when open
  },
};

console.log('[Debug] Debug console loaded. Press ` to open.');

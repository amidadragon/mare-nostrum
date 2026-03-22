// ═══ MARE NOSTRUM DEBUG CONSOLE ════════════════════════════════════════════
// Press ` (backtick) to toggle. Type commands and press Enter.
// Loaded AFTER sketch.js so it can access all game globals.

// Raw DOM listener — works in Electron, bypasses p5.js entirely
document.addEventListener('keydown', function(e) {
  if (typeof Debug === 'undefined') return;
  // Toggle console
  if (e.code === 'Backquote' || e.key === '`' || e.key === '~' || e.key === '§' || e.keyCode === 192) {
    e.preventDefault();
    e.stopPropagation();
    Debug.toggle();
    return;
  }
  // When console is open, handle ALL input here
  if (Debug.open) {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Enter') {
      if (Debug.input.trim()) {
        Debug.addLog('> ' + Debug.input, '#888888');
        Debug.exec(Debug.input);
        Debug.input = '';
      }
    } else if (e.key === 'Backspace') {
      Debug.input = Debug.input.slice(0, -1);
    } else if (e.key === 'Escape') {
      Debug.open = false;
      Debug.input = '';
    } else if (e.key.length === 1) {
      Debug.input += e.key;
    }
  }
});

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

        case '/dev': {
          const alreadyHome = state.progression && state.progression.homeIslandReached;
          if (alreadyHome) {
            // Already on home island — god mode + max resources
            state.player.hp = 99999;
            state.player.maxHp = 99999;
            state.player.attackDamage = 999;
            state.gold += 9999; state.wood += 999; state.stone += 999;
            state.crystals += 999; state.seeds += 99; state.harvest += 500;
            state.fish += 99; state.ironOre += 999; state.ancientRelic += 99;
            state.titanBone += 50; state.grapeSeeds += 50; state.oliveSeeds += 50;
            state.meals += 50; state.wine += 50; state.oil += 50;
            state.solar = state.maxSolar || 100;
            this.addLog('GOD MODE — invincible, max damage, max resources', '#ffdd44');
          } else {
            // On wreck beach — fully transition to home island
            if (!state.progression) state.progression = {};
            state.progression.gameStarted = true;
            state.progression.homeIslandReached = true;
            state.progression.raftBuilt = true;
            state.progression.villaCleared = true;
            state.progression.wreckComplete = true;
            state.progression.farmCleared = true;
            state.progression.triremeRepaired = true;
            state.gameMode = 'home';
            state.introPhase = 'done';
            state.cutscene = null;
            state.wreckPhase = 'done';
            state.isInitialized = true;
            state.rowing = state.rowing || {}; state.rowing.active = false;
            state.conquest = state.conquest || {}; state.conquest.active = false;
            state.adventure = state.adventure || {}; state.adventure.active = false;
            if (!state.buildings || state.buildings.length === 0) buildIsland();
            state.player.x = WORLD.islandCX;
            state.player.y = WORLD.islandCY;
            cam.x = state.player.x; cam.y = state.player.y;
            camSmooth.x = cam.x; camSmooth.y = cam.y;
            this.addLog('Teleported to home island', '#88ff88');
            this.addLog('Type /dev again for god mode + max resources', '#aaffaa');
          }
          break;
        }

        case '/level':
          let lvl = parseInt(args[0]) || 20;
          // Give resources so expandIsland doesn't fail on cost check
          state.crystals = 9999; state.stone = 9999; state.ironOre = 9999;
          state.gold = 9999; state.ancientRelic = 999; state.titanBone = 999;
          state.wood = 9999;
          while (state.islandLevel < lvl && state.islandLevel < 25) {
            if (typeof expandIsland === 'function') {
              expandIsland();
            } else {
              state.islandLevel++;
              state.islandRX += 40;
              state.islandRY += 25;
              state.pyramid.level = state.islandLevel;
            }
          }
          this.addLog('Island level set to ' + state.islandLevel + ' (with buildings)', '#ffaa00');
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
          state.progression.homeIslandReached = true;
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

        case '/devmode': {
          // Instant mid-game state — skip all early progression
          // Resources
          state.gold += 5000; state.wood += 500; state.stone += 500;
          state.crystals += 500; state.seeds += 99; state.harvest += 200;
          state.fish += 50; state.ironOre += 100; state.ancientRelic += 30;
          state.titanBone += 20; state.grapeSeeds += 30; state.oliveSeeds += 30;
          state.meals += 20; state.wine += 20; state.oil += 20;
          state.solar = state.maxSolar || 100;
          // Progression
          state.progression.gameStarted = true;
          state.progression.homeIslandReached = true;
          state.progression.villaCleared = true;
          state.progression.farmCleared = true;
          state.progression.triremeRepaired = true;
          if (state.progression.tutorialsSeen) {
            state.progression.tutorialsSeen.empDash = true;
            state.progression.tutorialsSeen.invScreen = true;
          }
          // Island level
          while (state.islandLevel < 10) {
            state.islandLevel++;
            state.islandRX += 40;
            state.islandRY += 25;
          }
          if (state.pyramid) state.pyramid.level = state.islandLevel;
          // Player stats
          state.player.hp = state.player.maxHp;
          state.player.weapon = 1;
          state.player.armor = 1;
          state.player.attackDamage = 25;
          // Tools
          if (state.tools) {
            state.tools.sickle = true;
            state.tools.axe = true;
            state.tools.net = true;
            state.tools.copperRod = true;
            state.tools.ironRod = true;
            state.tools.steelPick = true;
            state.tools.lantern = true;
          }
          // Quest to chapter 3 (mid-game)
          if (state.mainQuest) {
            state.mainQuest.chapter = Math.max(state.mainQuest.chapter, 3);
          }
          // NPC hearts
          if (state.npc) state.npc.hearts = Math.max(state.npc.hearts || 0, 5);
          if (state.marcus) state.marcus.hearts = Math.max(state.marcus.hearts || 0, 4);
          if (state.vesta) state.vesta.hearts = Math.max(state.vesta.hearts || 0, 3);
          if (state.felix) state.felix.hearts = Math.max(state.felix.hearts || 0, 3);
          // Day/time
          state.day = Math.max(state.day || 1, 10);
          state.time = 9 * 60; // 9 AM
          // Teleport home
          state.player.x = WORLD.islandCX;
          state.player.y = WORLD.islandCY;
          cam.x = state.player.x; cam.y = state.player.y;
          camSmooth.x = cam.x; camSmooth.y = cam.y;
          if (state.conquest.active) state.conquest.active = false;
          if (state.adventure.active) state.adventure.active = false;
          state.rowing.active = false;

          this.addLog('═══ DEV MODE ACTIVATED ═══', '#ffdd44');
          this.addLog('Lv10, mid-game, all tools, 5k gold', '#ffdd44');
          this.addLog('Quest Ch3, NPCs befriended, Roman skin ON', '#ffdd44');
          this.addLog('Type /help for more commands', '#aaffaa');
          break;
        }

        case '/quest': {
          let ch = parseInt(args[0]);
          if (!isNaN(ch) && state.mainQuest) {
            state.mainQuest.chapter = constrain(ch, 0, 9);
            this.addLog('Quest set to chapter ' + ch, '#ffaa00');
          } else {
            this.addLog('Current chapter: ' + (state.mainQuest ? state.mainQuest.chapter : '?') + ' | Usage: /quest <0-9>', '#aaddff');
          }
          break;
        }

        case '/skin': {
          let skin = args[0] || '';
          if (skin === 'roman') {
            state.progression.homeIslandReached = true;
            this.addLog('Roman skin enabled', '#ffaa00');
          } else if (skin === 'castaway' || skin === 'wreck') {
            state.progression.homeIslandReached = false;
            this.addLog('Castaway skin enabled', '#88cc44');
          } else {
            this.addLog('Usage: /skin roman | /skin castaway', '#aaddff');
            this.addLog('Currently: ' + (state.progression.homeIslandReached ? 'Roman' : 'Castaway'), '#aaddff');
          }
          break;
        }

        case '/tools': {
          if (state.tools) {
            state.tools.sickle = true; state.tools.axe = true;
            state.tools.net = true; state.tools.copperRod = true;
            state.tools.ironRod = true; state.tools.steelPick = true;
            state.tools.lantern = true;
          }
          this.addLog('All tools unlocked', '#ffaa00');
          break;
        }

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
          this.addLog('─── DEV MODE ───', '#ffdd44');
          this.addLog('/dev — instant mid-game (Lv10, tools, gold, quest ch3)', '#aaffaa');
          this.addLog('/quest [0-9] — jump to quest chapter', '#aaffaa');
          this.addLog('/skin roman|castaway — toggle character skin', '#aaffaa');
          this.addLog('/tools — unlock all tools', '#aaffaa');
          break;

        case '/skipwreck':
          if (typeof completeSailToHome === 'function') completeSailToHome();
          else { gameScreen = 'game'; state.currentIsland = 'home'; }
          this.addLog('Skipped wreck — welcome home', '#ffdd44');
          break;

        case '/skipintro':
          gameScreen = 'game'; state.currentIsland = 'home';
          state.progression.gameStarted = true;
          state.progression.villaCleared = true;
          state.faction = state.faction || 'rome';
          state.gold = 200; state.wood = 50; state.stone = 30;
          state.player.level = 5;
          state.player.maxHp = 100 + 5 * 10;
          state.player.hp = state.player.maxHp;
          state.player.levelAtk = 5;
          state.player.defense = floor(2 + 5 * 0.5);
          state.player.skillPoints = (state.player.skillPoints || 0) + 4;
          this.addLog('Skipped all intros — Lv5 with resources', '#ffdd44');
          break;

        case '/host':
          if (typeof MP !== 'undefined') { MP.host(); this.addLog('Hosting game...', '#88ddff'); }
          else this.addLog('MP not loaded', '#ff8888');
          break;

        case '/join':
          if (typeof MP !== 'undefined' && args[0]) { MP.join(args[0]); this.addLog('Joining ' + args[0] + '...', '#88ddff'); }
          else this.addLog('Usage: /join CODE', '#ff8888');
          break;

        case '/chat':
          if (typeof MP !== 'undefined' && MP.connected) { MP.chat(args.join(' ')); this.addLog('Sent: ' + args.join(' '), '#aaddff'); }
          else this.addLog('Not connected', '#ff8888');
          break;

        case '/screenshots': {
          let times = [
            { name: 'dawn', t: 5 * 60 },
            { name: 'golden_hour', t: 7 * 60 },
            { name: 'noon', t: 12 * 60 },
            { name: 'sunset', t: 19 * 60 },
            { name: 'night', t: 23 * 60 }
          ];
          this.addLog('Auto-capturing 5 store screenshots...', '#ffcc44');
          times.forEach((entry, i) => {
            setTimeout(() => {
              state.time = entry.t;
              Debug.addLog('Set time: ' + entry.name, '#88ccff');
              setTimeout(() => {
                saveCanvas('store_' + entry.name, 'png');
                Debug.addLog('Captured: store_' + entry.name + '.png', '#aaffaa');
              }, 1000);
            }, i * 2000);
          });
          break;
        }

        case '/attack':
          if (typeof MP !== 'undefined' && MP.connected) { MP.attackRemote(parseInt(args[0]) || 5); this.addLog('Attacking with ' + (parseInt(args[0]) || 5) + ' troops', '#ff8844'); }
          else this.addLog('Not connected', '#ff8888');
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
    if (key === '`' || key === '§' || key === '~' || keyCode === 112 || keyCode === 192 || keyCode === 223) { // backtick, ~, §, F1, and common backtick keycodes
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
    if (key.length === 1 && keyCode !== 192 && key !== '§') { // not backtick or §
      this.input += key;
      return true;
    }
    return true; // consume all keys when open
  },
};

console.log('[Debug] Debug console loaded. Press ` to open.');

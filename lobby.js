// ═══════════════════════════════════════════════════════════════════════════
// LOBBY SYSTEM — Shared shipwreck beach for faction selection before game
// Uses globals: MP, gameScreen, state, FACTIONS, width, height, frameCount,
// addNotification, mouseX, mouseY, startNewGame, startLoadGame
// ═══════════════════════════════════════════════════════════════════════════

const LOBBY_RELICS = [
  { faction: 'rome', x: 400, y: 280, symbol: 'eagle', color: [180, 50, 50] },
  { faction: 'carthage', x: 500, y: 250, symbol: 'crescent', color: [140, 80, 180] },
  { faction: 'egypt', x: 600, y: 240, symbol: 'ankh', color: [200, 170, 50] },
  { faction: 'greece', x: 700, y: 250, symbol: 'owl', color: [60, 120, 200] },
  { faction: 'seapeople', x: 780, y: 280, symbol: 'trident', color: [80, 160, 160] },
  { faction: 'persia', x: 820, y: 330, symbol: 'flame', color: [200, 140, 40] },
  { faction: 'phoenicia', x: 780, y: 380, symbol: 'ship', color: [160, 60, 140] },
  { faction: 'gaul', x: 700, y: 410, symbol: 'dolmen', color: [100, 140, 60] }
];

const LOBBY = {
  player: { x: 600, y: 420 },
  remotePlayers: {},   // peerId -> { x, y, name, faction }
  claims: {},          // faction -> playerName
  myFaction: null,
  ready: {},           // peerId -> boolean
  myReady: false,
  countdown: 0,        // countdown timer (frames, 180 = 3 sec)
  started: false,
  beachBounds: { x1: 340, y1: 210, x2: 860, y2: 450 },
  campfireFlicker: 0,
  allPickedBanner: 0,  // fade-in timer for "ALL FACTIONS CHOSEN" banner
  autoStartTimer: 0,   // auto-start countdown (frames) after all picked
  cinematicTimer: 0,   // sailing cinematic timer
  cinematicActive: false,
};

function drawLobby() {
  push();
  // Sailing cinematic takes over entire screen
  if (LOBBY.cinematicActive) {
    _drawLobbySailingCinematic();
    textAlign(LEFT, TOP);
    pop();
    return;
  }
  // Ocean background gradient
  for (let y = 0; y < height; y += 4) {
    let t = y / height;
    fill(lerpColor(color(10, 20, 50), color(20, 50, 80), t));
    noStroke();
    rect(0, y, width, 4);
  }

  // Sandy beach island
  let cx = 600, cy = 340;
  noStroke();
  // Shallow water ring
  fill(30, 90, 120, 100);
  ellipse(cx, cy + 20, 580, 320);
  fill(40, 110, 140, 80);
  ellipse(cx, cy + 15, 550, 300);
  // Sand
  fill(194, 170, 120);
  ellipse(cx, cy + 10, 500, 260);
  fill(204, 182, 132);
  ellipse(cx, cy, 480, 240);
  // Lighter sand center
  fill(214, 194, 148);
  ellipse(cx, cy - 5, 420, 200);

  // Wreckage debris
  fill(90, 65, 35);
  rect(420, 370, 40, 6, 2);  // plank
  rect(730, 390, 35, 5, 2);  // plank
  fill(80, 60, 30);
  rect(380, 350, 8, 30, 2);  // mast piece
  // Torn sail
  fill(180, 170, 150, 140);
  triangle(382, 350, 395, 340, 410, 355);
  fill(170, 160, 140, 120);
  triangle(384, 352, 400, 345, 405, 358);

  // Central campfire
  let flick = sin(frameCount * 0.15) * 3;
  let flick2 = cos(frameCount * 0.2) * 2;
  // Stone ring
  fill(80, 75, 70);
  ellipse(cx, cy + 10, 30, 16);
  fill(90, 85, 78);
  ellipse(cx, cy + 9, 26, 12);
  // Fire glow
  fill(255, 160, 40, 60);
  ellipse(cx, cy + 4, 24 + flick, 20 + flick);
  // Fire
  fill(255, 120, 20);
  ellipse(cx + flick2, cy + 2, 10, 14 + flick);
  fill(255, 200, 60);
  ellipse(cx - flick2, cy, 6, 10 + flick * 0.5);
  fill(255, 240, 150);
  ellipse(cx, cy - 2, 3, 6);
  // Sparks
  for (let i = 0; i < 3; i++) {
    let sa = sin(frameCount * 0.1 + i * 2.1) * 8;
    let sy2 = cy - 10 - (frameCount * 0.5 + i * 20) % 30;
    let alpha = max(0, 255 - ((frameCount * 0.5 + i * 20) % 30) * 8);
    fill(255, 200, 80, alpha);
    rect(cx + sa, sy2, 2, 2);
  }

  // Draw relic pedestals
  for (let r of LOBBY_RELICS) {
    _drawRelicPedestal(r);
  }

  // Draw remote players
  for (let pid in LOBBY.remotePlayers) {
    let rp = LOBBY.remotePlayers[pid];
    _drawLobbyPlayer(rp.x, rp.y, rp.name, rp.faction);
  }

  // Draw bots
  if (typeof MP !== 'undefined' && MP.bots) {
    MP.updateBotsLobby();
    for (let b of MP.bots) {
      if (b.faction && !LOBBY.claims[b.faction]) LOBBY.claims[b.faction] = b.name;
      _drawLobbyPlayer(b.x, b.y, b.name, b.faction);
    }
  }

  // Draw local player
  _drawLobbyPlayer(LOBBY.player.x, LOBBY.player.y, state.islandName || 'Player', LOBBY.myFaction);

  // Title
  textAlign(CENTER, TOP);
  fill(255, 220, 120);
  textSize(18);
  text('CHOOSE YOUR DESTINY', width / 2, 20);
  fill(200, 180, 130);
  textSize(10);
  text('Walk to a relic altar and press [E] to claim your faction', width / 2, 44);

  // Connection status
  fill(0, 255, 120);
  textSize(9);
  textAlign(LEFT, TOP);
  text('Room: ' + (MP.roomCode || '???'), 10, 10);
  let pCount = 1 + Object.keys(LOBBY.remotePlayers).length;
  text(pCount + ' player' + (pCount > 1 ? 's' : '') + ' in lobby', 10, 24);

  // All-picked detection
  let _allPicked = _checkAllFactionsPicked();
  if (_allPicked && !LOBBY.allPickedBanner) LOBBY.allPickedBanner = 1;
  if (LOBBY.allPickedBanner > 0 && LOBBY.allPickedBanner < 60) LOBBY.allPickedBanner++;

  // "ALL FACTIONS CHOSEN" banner
  if (LOBBY.allPickedBanner > 0 && !LOBBY.countdown && !LOBBY.cinematicActive) {
    let bannerAlpha = min(255, LOBBY.allPickedBanner * 8);
    fill(0, 0, 0, bannerAlpha * 0.4);
    rect(width / 2 - 160, 65, 320, 30, 6);
    fill(255, 220, 80, bannerAlpha);
    textAlign(CENTER, CENTER);
    textSize(14);
    text('ALL FACTIONS CHOSEN', width / 2, 80);
    // Auto-start countdown (10 seconds = 600 frames)
    if (LOBBY.allPickedBanner >= 60) {
      LOBBY.autoStartTimer++;
      let autoSecs = ceil((600 - LOBBY.autoStartTimer) / 60);
      fill(200, 180, 130, bannerAlpha * 0.8);
      textSize(9);
      text('Auto-departing in ' + autoSecs + 's...', width / 2, 98);
      if (LOBBY.autoStartTimer >= 600 && !LOBBY.countdown) {
        LOBBY.countdown = 180;
        MP.send('lobby_start', {});
      }
    }
    textAlign(LEFT, TOP);
  }

  // Ready / Start UI
  _drawLobbyButtons();

  // Countdown overlay
  if (LOBBY.countdown > 0) {
    let secs = ceil(LOBBY.countdown / 60);
    fill(0, 0, 0, 150);
    rect(0, 0, width, height);
    fill(255, 220, 120);
    textAlign(CENTER, CENTER);
    textSize(48);
    text(secs, width / 2, height / 2 - 20);
    textSize(16);
    text('Departing...', width / 2, height / 2 + 30);
  }

  textAlign(LEFT, TOP);
  pop();
}

function _drawRelicPedestal(r) {
  let claimed = LOBBY.claims[r.faction];
  let isNear = dist(LOBBY.player.x, LOBBY.player.y, r.x, r.y) < 50;
  let pulse = (sin(frameCount * 0.05) * 0.3 + 0.7);
  let c = r.color;

  // Pedestal base
  fill(120, 110, 100);
  rect(r.x - 12, r.y + 6, 24, 10, 2);
  fill(140, 130, 118);
  rect(r.x - 10, r.y - 2, 20, 10, 2);

  // Glow
  let glowA = claimed ? 100 : (isNear ? 80 * pulse : 40 * pulse);
  fill(c[0], c[1], c[2], glowA);
  ellipse(r.x, r.y - 4, 28, 20);

  // Relic symbol
  push();
  let symA = claimed ? 255 : 180 * pulse;
  fill(c[0], c[1], c[2], symA);
  noStroke();
  _drawFactionSymbol(r.symbol, r.x, r.y - 8, 10);
  pop();

  // Label
  textAlign(CENTER, TOP);
  let facData = (typeof FACTIONS !== 'undefined' && FACTIONS[r.faction]) ? FACTIONS[r.faction] : null;
  let label = facData ? facData.name : r.faction.toUpperCase();
  fill(255, 220, 120, 200);
  textSize(8);
  text(label, r.x, r.y + 18);

  if (claimed) {
    fill(200, 200, 200, 180);
    textSize(7);
    text('Claimed: ' + claimed, r.x, r.y + 28);
  } else if (isNear) {
    fill(100, 255, 140, 200 * pulse);
    textSize(8);
    text('[E] Claim', r.x, r.y + 28);
  }
  textAlign(LEFT, TOP);
}

function _drawFactionSymbol(sym, x, y, s) {
  // Simple pixel-art symbols
  switch (sym) {
    case 'eagle':   // V shape
      triangle(x - s, y - s * 0.6, x, y + s * 0.4, x + s, y - s * 0.6);
      rect(x - 1, y - s * 0.8, 2, s * 0.4);
      break;
    case 'crescent': // arc
      arc(x, y, s * 2, s * 2, PI * 0.3, PI * 1.7);
      fill(194, 170, 120); // cut out inner (sand color)
      ellipse(x + s * 0.3, y - s * 0.1, s * 1.4, s * 1.4);
      break;
    case 'ankh':    // cross + circle
      ellipse(x, y - s * 0.5, s * 0.8, s * 0.8);
      rect(x - 1, y - s * 0.1, 2, s);
      rect(x - s * 0.4, y + s * 0.1, s * 0.8, 2);
      break;
    case 'owl':     // two eyes + beak
      ellipse(x - s * 0.3, y, s * 0.6, s * 0.6);
      ellipse(x + s * 0.3, y, s * 0.6, s * 0.6);
      triangle(x - 2, y + s * 0.3, x, y + s * 0.7, x + 2, y + s * 0.3);
      break;
    case 'trident': // three prongs
      rect(x - 1, y - s * 0.2, 2, s * 1.2);
      rect(x - s * 0.5, y - s * 0.6, 2, s * 0.6);
      rect(x + s * 0.5 - 1, y - s * 0.6, 2, s * 0.6);
      rect(x - s * 0.5, y - s * 0.6, s + 1, 2);
      break;
    case 'flame':   // teardrop
      ellipse(x, y + s * 0.2, s * 0.8, s);
      triangle(x - s * 0.3, y, x, y - s, x + s * 0.3, y);
      break;
    case 'ship':    // hull + mast
      arc(x, y + s * 0.2, s * 2, s, 0, PI);
      rect(x - 1, y - s * 0.8, 2, s);
      triangle(x + 2, y - s * 0.7, x + 2, y - s * 0.1, x + s * 0.6, y - s * 0.3);
      break;
    case 'dolmen':  // two uprights + capstone
      rect(x - s * 0.5, y - s * 0.1, s * 0.3, s * 0.8);
      rect(x + s * 0.2, y - s * 0.1, s * 0.3, s * 0.8);
      rect(x - s * 0.6, y - s * 0.4, s * 1.2, s * 0.3);
      break;
  }
}

function _drawLobbyPlayer(px, py, name, faction) {
  let c = [160, 160, 160]; // grey tunic default
  if (faction) {
    let r = LOBBY_RELICS.find(r => r.faction === faction);
    if (r) c = r.color;
  }
  // Body
  fill(c[0], c[1], c[2]);
  rect(px - 5, py - 14, 10, 14, 2); // tunic
  // Head
  fill(210, 180, 140);
  ellipse(px, py - 18, 10, 10);
  // Legs
  fill(c[0] * 0.7, c[1] * 0.7, c[2] * 0.7);
  rect(px - 4, py, 3, 5);
  rect(px + 1, py, 3, 5);
  // Name tag
  fill(255, 255, 255, 220);
  textAlign(CENTER, BOTTOM);
  textSize(8);
  text(name || 'Player', px, py - 24);
  // Faction glow
  if (faction) {
    fill(c[0], c[1], c[2], 40);
    ellipse(px, py - 4, 24, 28);
  }
  textAlign(LEFT, TOP);
}

function _drawLobbyButtons() {
  let btnX = width / 2, btnY = height - 50;
  textAlign(CENTER, CENTER);

  if (LOBBY.myFaction && !LOBBY.myReady) {
    // Ready button
    let hov = mouseX > btnX - 60 && mouseX < btnX + 60 && mouseY > btnY - 14 && mouseY < btnY + 14;
    fill(hov ? color(60, 160, 60) : color(40, 120, 40));
    rect(btnX - 60, btnY - 14, 120, 28, 4);
    fill(255);
    textSize(12);
    text('READY', btnX, btnY);
  } else if (LOBBY.myReady && !LOBBY.countdown) {
    fill(100, 255, 140);
    textSize(11);
    text('Waiting for others...', btnX, btnY);

    // Host sees START VOYAGE when all ready (remote players + bots count)
    if (MP.isHost || (!MP.connected && MP.bots && MP.bots.length > 0)) {
      let allReady = LOBBY.myReady;
      for (let pid in LOBBY.remotePlayers) {
        if (!LOBBY.ready[pid]) allReady = false;
      }
      let hasOthers = Object.keys(LOBBY.remotePlayers).length > 0 || (MP.bots && MP.bots.length > 0);
      let botsReady = !MP.bots || MP.bots.length === 0 || MP.allBotsReady();
      if (allReady && botsReady && hasOthers) {
        let startY = btnY + 30;
        let hov = mouseX > btnX - 70 && mouseX < btnX + 70 && mouseY > startY - 14 && mouseY < startY + 14;
        fill(hov ? color(180, 140, 40) : color(140, 110, 30));
        rect(btnX - 70, startY - 14, 140, 28, 4);
        fill(255, 240, 150);
        textSize(13);
        text('START VOYAGE', btnX, startY);
      }
    }
  }
  textAlign(LEFT, TOP);
}

// ─── LOBBY INPUT ─────────────────────────────────────────────────────────

function updateLobbyMovement() {
  let spd = 2.5;
  let dx = 0, dy = 0;
  if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) dx -= spd;  // A
  if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) dx += spd;  // D
  if (keyIsDown(87) || keyIsDown(UP_ARROW)) dy -= spd;    // W
  if (keyIsDown(83) || keyIsDown(DOWN_ARROW)) dy += spd;   // S

  LOBBY.player.x = constrain(LOBBY.player.x + dx, LOBBY.beachBounds.x1, LOBBY.beachBounds.x2);
  LOBBY.player.y = constrain(LOBBY.player.y + dy, LOBBY.beachBounds.y1, LOBBY.beachBounds.y2);

  // Sync position
  if (MP.connected && frameCount % 6 === 0) {
    MP.send('lobby_pos', { x: LOBBY.player.x, y: LOBBY.player.y, name: state.islandName || 'Player', faction: LOBBY.myFaction });
  }

  // Countdown tick
  if (LOBBY.countdown > 0) {
    LOBBY.countdown--;
    if (LOBBY.countdown <= 0) {
      _lobbyStartGame();
    }
  }
}

function lobbyClaimRelic() {
  if (LOBBY.myFaction || LOBBY.countdown > 0) return;
  for (let r of LOBBY_RELICS) {
    if (dist(LOBBY.player.x, LOBBY.player.y, r.x, r.y) < 50 && !LOBBY.claims[r.faction]) {
      LOBBY.myFaction = r.faction;
      LOBBY.claims[r.faction] = state.islandName || 'Player';
      MP.send('relic_claim', { faction: r.faction, name: state.islandName || 'Player' });
      addNotification('Claimed ' + r.faction.toUpperCase() + '!', '#' + r.color.map(c => c.toString(16).padStart(2, '0')).join(''));
      return;
    }
  }
}

function lobbyHandleClick() {
  let btnX = width / 2, btnY = height - 50;

  // Ready button
  if (LOBBY.myFaction && !LOBBY.myReady) {
    if (mouseX > btnX - 60 && mouseX < btnX + 60 && mouseY > btnY - 14 && mouseY < btnY + 14) {
      LOBBY.myReady = true;
      MP.send('lobby_ready', {});
      return true;
    }
  }

  // Start Voyage (host or single-player with bots)
  if ((MP.isHost || (!MP.connected && MP.bots && MP.bots.length > 0)) && LOBBY.myReady && !LOBBY.countdown) {
    let startY = btnY + 30;
    if (mouseX > btnX - 70 && mouseX < btnX + 70 && mouseY > startY - 14 && mouseY < startY + 14) {
      let allReady = LOBBY.myReady;
      for (let pid in LOBBY.remotePlayers) {
        if (!LOBBY.ready[pid]) allReady = false;
      }
      let hasOthers = Object.keys(LOBBY.remotePlayers).length > 0 || (MP.bots && MP.bots.length > 0);
      let botsReady = !MP.bots || MP.bots.length === 0 || MP.allBotsReady();
      if (allReady && botsReady && hasOthers) {
        LOBBY.countdown = 180; // 3 seconds at 60fps
        MP.send('lobby_start', {});
        return true;
      }
    }
  }
  return false;
}

function _lobbyStartGame() {
  // Begin sailing cinematic instead of immediate game start
  LOBBY.cinematicActive = true;
  LOBBY.cinematicTimer = 0;
}

function _lobbyFinishTransition() {
  LOBBY.started = true;
  LOBBY.cinematicActive = false;

  // Start the actual game
  let _rs = null;
  try { _rs = localStorage.getItem('sunlitIsles_save'); } catch(e) {}
  let hasSave = false;
  if (_rs) { try { let _d = JSON.parse(_rs); hasSave = _d && _d.version >= 8; } catch(e) {} }
  if (hasSave) {
    startLoadGame();
  } else {
    startNewGame();
  }

  // Apply faction via selectFaction (sets bonuses, god, starter gear, inits nations)
  if (LOBBY.myFaction && typeof selectFaction === 'function') {
    selectFaction(LOBBY.myFaction);
  }

  // Tag human players in state.nations
  _tagHumanPlayers();

  // Set game screen
  gameScreen = 'game';
}

function _tagHumanPlayers() {
  if (!state.nations) return;
  // Tag remote human players
  for (let pid in LOBBY.remotePlayers) {
    let rp = LOBBY.remotePlayers[pid];
    if (rp.faction && state.nations[rp.faction]) {
      state.nations[rp.faction].isHuman = true;
      state.nations[rp.faction].humanName = rp.name || 'Player';
      state.nations[rp.faction].peerId = pid;
    }
  }
}

function _checkAllFactionsPicked() {
  // Player must have picked
  if (!LOBBY.myFaction) return false;
  // All remote players must have picked
  for (let pid in LOBBY.remotePlayers) {
    if (!LOBBY.remotePlayers[pid].faction) return false;
  }
  // All bots must have picked
  if (typeof MP !== 'undefined' && MP.bots) {
    for (let b of MP.bots) {
      if (!b.faction) return false;
    }
  }
  // Must have at least one other (remote or bot)
  let hasOthers = Object.keys(LOBBY.remotePlayers).length > 0 || (typeof MP !== 'undefined' && MP.bots && MP.bots.length > 0);
  return hasOthers;
}

function _drawLobbySailingCinematic() {
  LOBBY.cinematicTimer++;
  let t = LOBBY.cinematicTimer;
  let w = width, h = height;
  let DURATION = 180; // 3 seconds at 60fps

  // Fade to black then show ships sailing
  let fadeIn = min(1, t / 30);
  let fadeOut = t > DURATION - 30 ? min(1, (t - (DURATION - 30)) / 30) : 0;

  // Ocean background
  for (let y = 0; y < h; y += 4) {
    let amt = y / h;
    fill(lerp(15, 30, amt) * (1 - fadeOut), lerp(25, 60, amt) * (1 - fadeOut), lerp(50, 90, amt) * (1 - fadeOut), 255 * fadeIn);
    noStroke();
    rect(0, y, w, 4);
  }

  // Sun glow
  let sunY = h * 0.3 - t * 0.1;
  fill(255, 200, 80, 40 * fadeIn * (1 - fadeOut));
  ellipse(w / 2, sunY, 100, 100);
  fill(255, 240, 180, 120 * fadeIn * (1 - fadeOut));
  ellipse(w / 2, sunY, 30, 30);

  // Waves
  for (let wx = 0; wx < w; wx += 60) {
    let wy = h * 0.55 + sin((wx + t * 2) * 0.02) * 8;
    fill(40, 80, 120, 60 * fadeIn * (1 - fadeOut));
    ellipse(wx, wy, 80, 6);
  }

  // Draw ships sailing away (one per claimed faction)
  let ships = [];
  if (LOBBY.myFaction) ships.push({ faction: LOBBY.myFaction, isPlayer: true });
  for (let pid in LOBBY.remotePlayers) {
    let rp = LOBBY.remotePlayers[pid];
    if (rp.faction) ships.push({ faction: rp.faction, isPlayer: false });
  }
  if (typeof MP !== 'undefined' && MP.bots) {
    for (let b of MP.bots) {
      if (b.faction) ships.push({ faction: b.faction, isPlayer: false });
    }
  }

  let shipCount = ships.length;
  for (let i = 0; i < shipCount; i++) {
    let ship = ships[i];
    let angle = (i / shipCount) * PI - PI / 2; // fan out in semicircle
    let progress = min(1, t / (DURATION - 30));
    let sx = w / 2 + cos(angle) * progress * w * 0.4;
    let sy = h * 0.5 + sin(angle) * progress * h * 0.15 + sin(t * 0.08 + i) * 3;
    let shipScale = ship.isPlayer ? 1.2 : 0.8 - progress * 0.3;

    let r = LOBBY_RELICS.find(r => r.faction === ship.faction);
    let c = r ? r.color : [160, 160, 160];
    let alpha = 255 * fadeIn * (1 - fadeOut);

    // Hull
    fill(90, 65, 35, alpha);
    rect(sx - 12 * shipScale, sy, 24 * shipScale, 6 * shipScale, 2);
    // Mast
    fill(70, 55, 30, alpha);
    rect(sx - 1, sy - 18 * shipScale, 2, 18 * shipScale);
    // Sail (faction color)
    fill(c[0], c[1], c[2], alpha * 0.9);
    let sway = sin(t * 0.06 + i * 2) * 2;
    triangle(sx + 2, sy - 16 * shipScale, sx + 2, sy - 4 * shipScale, sx + 10 * shipScale + sway, sy - 8 * shipScale);

    // Player ship highlight
    if (ship.isPlayer) {
      fill(255, 220, 80, 60 * fadeIn * (1 - fadeOut));
      ellipse(sx, sy, 30, 16);
    }
  }

  // Title text
  let textAlpha = 255 * fadeIn * (1 - fadeOut);
  fill(255, 220, 120, textAlpha);
  textAlign(CENTER, CENTER);
  textSize(20);
  text('THE VOYAGE BEGINS', w / 2, h * 0.2);

  // Faction music fade in hint
  if (t > 60 && LOBBY.myFaction) {
    fill(200, 180, 130, textAlpha * 0.6);
    textSize(10);
    let facData = (typeof FACTIONS !== 'undefined' && FACTIONS[LOBBY.myFaction]) ? FACTIONS[LOBBY.myFaction] : null;
    if (facData) text(facData.name + ' - ' + facData.subtitle, w / 2, h * 0.85);
  }

  // End cinematic
  if (t >= DURATION) {
    _lobbyFinishTransition();
  }
}

function resetLobby() {
  LOBBY.player.x = 600;
  LOBBY.player.y = 420;
  LOBBY.remotePlayers = {};
  LOBBY.claims = {};
  LOBBY.myFaction = null;
  LOBBY.ready = {};
  LOBBY.myReady = false;
  LOBBY.countdown = 0;
  LOBBY.started = false;
  LOBBY.allPickedBanner = 0;
  LOBBY.autoStartTimer = 0;
  LOBBY.cinematicTimer = 0;
  LOBBY.cinematicActive = false;
}

// ─── MP MESSAGE HANDLERS (called from multiplayer.js _onData) ────────────

function handleLobbyMessage(msg) {
  switch (msg.type) {
    case 'lobby_pos':
      if (!LOBBY.remotePlayers[msg._peerId]) LOBBY.remotePlayers[msg._peerId] = {};
      let rp = LOBBY.remotePlayers[msg._peerId];
      rp.x = msg.data.x;
      rp.y = msg.data.y;
      rp.name = msg.data.name || 'Player 2';
      rp.faction = msg.data.faction || null;
      break;
    case 'relic_claim':
      LOBBY.claims[msg.data.faction] = msg.data.name || 'Player 2';
      addNotification(msg.data.name + ' claimed ' + msg.data.faction.toUpperCase() + '!', '#ffdd44');
      break;
    case 'lobby_ready':
      LOBBY.ready[msg._peerId || 'remote'] = true;
      addNotification('Player is ready!', '#88ff88');
      break;
    case 'lobby_start':
      LOBBY.countdown = 180;
      break;
  }
}

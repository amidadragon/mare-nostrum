// MARE NOSTRUM — Faction Selection Screen
// ─── FACTION SELECT SCREEN ─────────────────────────────────────────────────
function drawFactionSelect(dt) {
  factionSelectFade = min(factionSelectFade + dt * 4, 255);
  let a = factionSelectFade / 255;
  background(10, 18, 35);
  noStroke();
  for (let i = 0; i < 8; i++) {
    let wy = height * 0.5 + i * 20 + sin(frameCount * 0.02 + i) * 3;
    fill(15, 30, 55, 30 * a);
    rect(0, wy, width, 10);
  }
  drawingContext.globalAlpha = a;
  textAlign(CENTER, TOP);
  textSize(18); fill(220, 195, 120);
  text('CHOOSE YOUR ALLEGIANCE', width / 2, height * 0.08);
  textSize(9); fill(160, 150, 130);
  text('This choice shapes your destiny across the Mediterranean', width / 2, height * 0.08 + 26);
  // Difficulty selection (Conquest mode only)
  if (state._gameMode === 'conquest' || state._gameMode === '1v1') {
    if (!_selectedBotDifficulty) _selectedBotDifficulty = 'normal';
    let diffY = height * 0.08 + 42;
    let diffs = ['easy', 'normal', 'hard'];
    let diffLabels = ['EASY', 'NORMAL', 'HARD'];
    let diffColors = [[100,180,100], [220,190,80], [220,80,60]];
    let diffW = 70, diffGap = 12;
    let diffStartX = width / 2 - (diffs.length * (diffW + diffGap) - diffGap) / 2;
    for (let di = 0; di < diffs.length; di++) {
      let dx = diffStartX + di * (diffW + diffGap);
      let selected = _selectedBotDifficulty === diffs[di];
      let hover = mouseX >= dx && mouseX <= dx + diffW && mouseY >= diffY && mouseY <= diffY + 22;
      fill(selected ? diffColors[di][0] : 60, selected ? diffColors[di][1] : 50, selected ? diffColors[di][2] : 40, selected ? 220 : (hover ? 160 : 120));
      rect(dx, diffY, diffW, 22, 3);
      fill(selected ? 255 : 180); textSize(9); textAlign(CENTER, CENTER);
      text(diffLabels[di], dx + diffW / 2, diffY + 11);
    }
    textAlign(CENTER, TOP);
    textSize(8); fill(120, 110, 95);
    text('Bot Difficulty', width / 2, diffY - 12);
  }
  let fKeys = ['rome', 'carthage', 'egypt', 'greece', 'seapeople', 'persia', 'phoenicia', 'gaul'];
  let cardW = min(140, width * 0.2), cardH = 220, gap = 10;
  let totalW = cardW * 4 + gap * 3;
  let startX = (width - totalW) / 2;
  let row1Y = height * 0.12, row2Y = row1Y + cardH + gap;
  factionSelectHover = null;
  for (let fi = 0; fi < 8; fi++) {
    let row = fi < 4 ? 0 : 1;
    let col = fi % 4;
    let cx = startX + col * (cardW + gap);
    let cy = row === 0 ? row1Y : row2Y;
    if (mouseX >= cx && mouseX <= cx + cardW && mouseY >= cy && mouseY <= cy + cardH) {
      factionSelectHover = fKeys[fi];
    }
  }
  for (let fi = 0; fi < 8; fi++) {
    let row = fi < 4 ? 0 : 1;
    let col = fi % 4;
    let cx = startX + col * (cardW + gap);
    let cy = row === 0 ? row1Y : row2Y;
    _drawFactionCard(cx, cy, cardW, cardH, FACTIONS[fKeys[fi]], factionSelectHover === fKeys[fi], a);
  }
  textAlign(CENTER, TOP); textSize(10);
  fill(130, 120, 100, 200 * a);
  text('R: Rome  C: Carthage  E: Egypt  G: Greece  S: Sea People  P: Persia  F: Phoenicia  L: Gaul', width / 2, row2Y + cardH + 16);
  // Confirmation overlay
  if (_pendingFaction && FACTIONS[_pendingFaction]) {
    let pf = FACTIONS[_pendingFaction];
    let _isSP = _pendingFaction === 'seapeople';
    let oW = min(_isSP ? 420 : 360, width * 0.7), oH = _isSP ? 130 : 90;
    let oX = (width - oW) / 2, oY = (height - oH) / 2;
    fill(0, 0, 0, 180 * a); rect(0, 0, width, height);
    fill(25, 22, 18, 240 * a); rect(oX, oY, oW, oH, 6);
    stroke(pf.bannerColor[0], pf.bannerColor[1], pf.bannerColor[2], 200 * a);
    strokeWeight(2); noFill(); rect(oX, oY, oW, oH, 6); noStroke();
    textAlign(CENTER, CENTER); textSize(14);
    fill(220, 200, 140, 240 * a);
    text('You chose ' + pf.name, width / 2, oY + 24);
    if (_isSP) {
      textSize(10); fill(255, 100, 60, 230 * a);
      text('Warning: Sea People start on a ship with no island.', width / 2, oY + 46);
      text('This is a very different experience. Recommended for experienced players.', width / 2, oY + 60);
    }
    textSize(11); fill(170, 160, 140, 220 * a);
    text('This is permanent! Press ENTER to confirm or ESC to cancel.', width / 2, oY + (_isSP ? 82 : 52));
    textSize(10); fill(140, 130, 110, 180 * a);
    text('ENTER = confirm    ESC = cancel', width / 2, oY + (_isSP ? 100 : 74));
  }
  drawingContext.globalAlpha = 1;
}
function _drawFactionCard(x, y, w, h, fac, hovered, a) {
  let bc = fac.bannerColor;
  push(); noStroke();
  fill(0, 0, 0, 40 * a); rect(x + 2, y + 2, w, h, 4);
  fill(30, 25, 20, (hovered ? 240 : 210) * a); rect(x, y, w, h, 4);
  stroke(bc[0], bc[1], bc[2], (hovered ? 220 : 120) * a);
  strokeWeight(hovered ? 2 : 1); noFill(); rect(x, y, w, h, 4); noStroke();
  if (hovered) { fill(bc[0], bc[1], bc[2], 15 * a); rect(x, y, w, h, 4); }
  let cx = x + w / 2, gy = y + 35;
  if (fac.bannerGlyph === 'eagle') {
    fill(200, 170, 50, 220 * a);
    rect(cx - 3, gy - 5, 6, 10); rect(cx - 14, gy - 8, 10, 4);
    rect(cx + 4, gy - 8, 10, 4); rect(cx - 16, gy - 12, 4, 5); rect(cx + 12, gy - 12, 4, 5);
    fill(220, 190, 60, 220 * a); rect(cx - 2, gy - 9, 4, 4);
    fill(160, 130, 40, 200 * a); rect(cx - 5, gy + 5, 3, 3); rect(cx + 2, gy + 5, 3, 3);
  } else if (fac.bannerGlyph === 'crescent') {
    fill(180, 140, 220, 220 * a); ellipse(cx, gy, 22, 22);
    fill(30, 25, 20, 240 * a); ellipse(cx + 5, gy - 2, 18, 18);
    fill(220, 180, 60, 200 * a); ellipse(cx - 2, gy + 2, 6, 6);
  } else if (fac.bannerGlyph === 'eye') {
    // Eye of Horus
    fill(200, 170, 40, 220 * a);
    beginShape(); vertex(cx - 14, gy); vertex(cx, gy - 8); vertex(cx + 14, gy); vertex(cx, gy + 6); endShape(CLOSE);
    fill(30, 25, 20, 240 * a); ellipse(cx, gy - 1, 10, 10);
    fill(64, 176, 160, 220 * a); ellipse(cx, gy - 1, 6, 6);
    fill(245, 240, 224, 200 * a); ellipse(cx - 1, gy - 2, 2, 2);
    // Horus teardrop
    fill(200, 170, 40, 180 * a);
    beginShape(); vertex(cx, gy + 6); vertex(cx - 2, gy + 14); vertex(cx + 2, gy + 14); endShape(CLOSE);
  } else if (fac.bannerGlyph === 'owl') {
    // Owl of Athena
    fill(220, 220, 230, 220 * a);
    ellipse(cx, gy, 20, 22); // body
    fill(80, 144, 192, 220 * a);
    ellipse(cx - 5, gy - 4, 8, 8); ellipse(cx + 5, gy - 4, 8, 8); // eyes
    fill(30, 30, 40, 240 * a);
    ellipse(cx - 5, gy - 4, 4, 5); ellipse(cx + 5, gy - 4, 4, 5); // pupils
    fill(200, 170, 60, 200 * a);
    beginShape(); vertex(cx - 2, gy); vertex(cx, gy - 3); vertex(cx + 2, gy); endShape(CLOSE); // beak
    // Ear tufts
    fill(220, 220, 230, 180 * a);
    beginShape(); vertex(cx - 8, gy - 8); vertex(cx - 6, gy - 14); vertex(cx - 4, gy - 8); endShape(CLOSE);
    beginShape(); vertex(cx + 4, gy - 8); vertex(cx + 6, gy - 14); vertex(cx + 8, gy - 8); endShape(CLOSE);
  } else if (fac.bannerGlyph === 'trident') {
    // Trident of Poseidon
    fill(42, 138, 106, 220 * a);
    rect(cx - 1, gy - 12, 3, 24); // shaft
    rect(cx - 8, gy - 14, 3, 10); rect(cx + 6, gy - 14, 3, 10); // outer prongs
    rect(cx - 1, gy - 16, 3, 4); // center prong tip
    fill(26, 58, 92, 200 * a);
    rect(cx - 9, gy - 4, 19, 3); // crossbar
  } else if (fac.bannerGlyph === 'wingedlion') {
    // Winged lion of Persia
    fill(212, 160, 48, 220 * a);
    ellipse(cx, gy, 16, 14); // body
    ellipse(cx - 2, gy - 8, 10, 10); // head
    fill(106, 42, 138, 200 * a);
    beginShape(); vertex(cx + 6, gy - 6); vertex(cx + 14, gy - 14); vertex(cx + 10, gy - 2); endShape(CLOSE); // wing R
    beginShape(); vertex(cx - 6, gy - 6); vertex(cx - 14, gy - 14); vertex(cx - 10, gy - 2); endShape(CLOSE); // wing L
    fill(30, 25, 20, 240 * a);
    ellipse(cx - 4, gy - 9, 3, 3); // eye
  } else if (fac.bannerGlyph === 'cedar') {
    // Cedar tree of Phoenicia
    fill(106, 74, 42, 220 * a);
    rect(cx - 2, gy + 2, 4, 12); // trunk
    fill(42, 106, 48, 220 * a);
    beginShape(); vertex(cx, gy - 14); vertex(cx - 12, gy + 2); vertex(cx + 12, gy + 2); endShape(CLOSE); // canopy
    fill(60, 130, 60, 180 * a);
    beginShape(); vertex(cx, gy - 10); vertex(cx - 8, gy - 1); vertex(cx + 8, gy - 1); endShape(CLOSE); // inner layer
  } else if (fac.bannerGlyph === 'boar') {
    // Boar of Gaul
    fill(90, 64, 32, 220 * a);
    ellipse(cx, gy, 22, 16); // body
    fill(70, 50, 25, 220 * a);
    ellipse(cx + 8, gy - 2, 10, 10); // head
    fill(200, 160, 32, 200 * a);
    beginShape(); vertex(cx + 10, gy - 6); vertex(cx + 14, gy - 10); vertex(cx + 12, gy - 4); endShape(CLOSE); // tusk
    fill(30, 25, 20, 240 * a);
    ellipse(cx + 10, gy - 4, 3, 3); // eye
    // Bristle crest
    fill(42, 106, 48, 180 * a);
    for (let bi = -4; bi <= 4; bi += 2) rect(cx + bi, gy - 10, 2, 4);
  }
  // Keyboard shortcut hint
  var _fkMap = {rome:'R',carthage:'C',egypt:'E',greece:'G',seapeople:'S',persia:'P',phoenicia:'F',gaul:'L'};
  var _fkName = '';
  for (var _fk in _fkMap) { if (FACTIONS[_fk] === fac) { _fkName = _fk; break; } }
  if (_fkName) { textAlign(CENTER, TOP); textSize(9); fill(120, 110, 90, 180 * a); text('[' + _fkMap[_fkName] + ']', cx, gy + 8); }
  textAlign(CENTER, TOP); textSize(14);
  fill(bc[0] + 60, bc[1] + 60, bc[2] + 60, 240 * a);
  text(fac.name, cx, gy + 20);
  if (_fkName === 'seapeople') { textSize(9); fill(255, 140, 40, 240 * a); text('(ADVANCED)', cx, gy + 36); }
  if (_fkName === 'rome') { textSize(9); fill(80, 200, 80, 240 * a); text('(RECOMMENDED)', cx, gy + 36); }
  textSize(10); fill(160, 150, 130, 200 * a); text(fac.subtitle, cx, gy + 38);
  textAlign(LEFT, TOP); textSize(11);
  let ly = gy + 58;
  for (let i = 0; i < fac.bonuses.length; i++) {
    fill(180, 170, 140, 220 * a); text('+ ' + fac.bonuses[i], x + 14, ly); ly += 16;
  }
  if (hovered) {
    textAlign(CENTER, TOP); textSize(10);
    fill(bc[0] + 80, bc[1] + 80, bc[2] + 80, (sin(frameCount * 0.08) * 40 + 200) * a);
    text('[ SELECT ]', cx, y + h - 28);
  }
  pop();
}
function selectFaction(faction) {
  if (!FACTIONS[faction]) return;
  state.faction = faction;
  factionSelectActive = false;
  factionSelectFade = 0;
  if (faction === 'carthage') {
    state.gold += 50;
    addFloatingText(width / 2, height * 0.35, 'Merchant\'s pouch: +50 gold', '#ddaa44');
  } else if (faction === 'egypt') {
    addFloatingText(width / 2, height * 0.35, 'Ankh charm: +20% crystal income', '#40b0a0');
  } else if (faction === 'greece') {
    addFloatingText(width / 2, height * 0.35, 'Olive wreath: +20% NPC favor gain', '#5090c0');
  } else if (faction === 'seapeople') {
    addFloatingText(width / 2, height * 0.35, 'Ship start: +30% sail speed, +50% raid loot', '#2a8a6a');
  } else if (faction === 'persia') {
    addFloatingText(width / 2, height * 0.35, 'Royal scepter: +25% colony income', '#d4a030');
  } else if (faction === 'phoenicia') {
    addFloatingText(width / 2, height * 0.35, 'Navigator\'s chart: +30% trade, 2x discovery', '#3070b0');
  } else if (faction === 'gaul') {
    addFloatingText(width / 2, height * 0.35, 'Druid staff: +20% combat, +50% forest yield', '#c8a020');
  }
  addFloatingText(width / 2, height * 0.25, FACTIONS[faction].name + ' — ' + FACTIONS[faction].subtitle, FACTIONS[faction].accentColorHex);
  // Initialize god for this faction
  state.god = { faction: faction, prayerCooldown: 0, ultimateCharge: 0, blessingActive: null, blessingTimer: 0 };
  // Auto-equip faction starter gear
  if (typeof FACTION_STARTER_GEAR !== "undefined" && FACTION_STARTER_GEAR[faction]) {
    var gear = FACTION_STARTER_GEAR[faction];
    for (var slot in gear) { if (gear[slot]) equipItem(gear[slot]); }
  }
  trackMilestone('faction_chosen_' + faction);
  if (snd && snd.playNarration) snd.playNarration(faction + '_intro');
  // Initialize all rival nations (everyone except player's faction)
  initNations();
  // All nations at their NATION_DEFAULTS positions (4000-6000px from home)
  let _nationKeys = Object.keys(state.nations);
  // Create bot islands — level depends on game mode
  // 1v1 mode: bot starts at level 5 (visible civilization from the start)
  // Default mode: bot starts at level 12 (established civilization)
  let _botStartLevel = (state._gameMode === '1v1') ? 5 : 12;
  for (let k of Object.keys(state.nations)) {
    let n = state.nations[k];
    let cx = n.isleX, cy = n.isleY;
    n.islandState = createPrebuiltIsland(k, cx, cy, _botStartLevel);
    n.isBot = true;
    n.botDifficulty = (typeof _selectedBotDifficulty !== 'undefined' && _selectedBotDifficulty) ? _selectedBotDifficulty : 'normal';
    n.military = n.islandState.legia ? n.islandState.legia.army.length : 0;
    // In 1v1 mode, match resources to player (createPrebuiltIsland already scaled)
    if (state._gameMode === '1v1') {
      n.gold = n.islandState.gold || 50; n.military = 0;
      // Don't override — createPrebuiltIsland already set proper level-scaled resources
    }
    // Create bot AI character
    if (typeof BotAI !== 'undefined') {
      BotAI.create(k, cx, cy);
    }
  }
  // Initialize strategy engine
  if (typeof StrategyEngine !== 'undefined') {
    StrategyEngine.initSession(faction, 'normal', Object.keys(state.nations).length);
  }
  // Initialize bot Web Worker
  initBotWorker();
  // Initialize personal rival
  initPersonalRival(faction);
  // ALL factions: skip wreck, spawn directly on home island
  state.progression.triremeRepaired = true;
  state.progression.homeIslandReached = true;
  state.progression.villaCleared = true;
  state.introPhase = 'done';
  state.wreckPhase = 'done';
  state.isInitialized = true;
  state.player.x = WORLD.islandCX;
  state.player.y = WORLD.islandCY;
  cam.x = state.player.x; cam.y = state.player.y;
  camSmooth.x = cam.x; camSmooth.y = cam.y;
  // Build the starting island
  if (!state.buildings || state.buildings.length === 0) {
    if (typeof buildIsland === 'function') buildIsland();
  }
  addFloatingText(width / 2, height * 0.45, 'Welcome to your island!', '#ffcc44');
}

function drawForumBanner() {
  if (state.islandLevel < 15) return;
  let fac = getFactionData();
  let bc = fac.bannerColor;
  let forums = state.buildings.filter(b => b.type === 'forum');
  forums.forEach(f => {
    let fsx = w2sX(f.x);
    let fsy = w2sY(f.y);
    push();
    translate(floor(fsx - f.w * 0.25), floor(fsy - f.h * 0.55));
    noStroke();
    fill(110, 85, 45);
    rect(-1, -22, 2, 22);
    rect(-5, -22, 10, 2);
    let bannerWave = sin(frameCount * 0.035 + f.x * 0.01) * 2.5;
    fill(bc[0], bc[1], bc[2]);
    beginShape();
    vertex(0, -21);
    vertex(10 + bannerWave, -20);
    vertex(10 + bannerWave * 0.6, -15);
    vertex(0, -14);
    endShape(CLOSE);
    if (fac.bannerGlyph === 'eagle') {
      fill(220, 195, 60, 200);
      rect(2, -20, 6, 1); rect(2, -18, 5, 1); rect(2, -16, 6, 1);
    } else if (fac.bannerGlyph === 'crescent') {
      fill(220, 195, 60, 200);
      ellipse(5 + bannerWave * 0.3, -17.5, 5, 5);
      fill(bc[0], bc[1], bc[2]);
      ellipse(6.5 + bannerWave * 0.3, -18, 4, 4);
    } else if (fac.bannerGlyph === 'eye') {
      fill(fac.accentColor[0], fac.accentColor[1], fac.accentColor[2], 200);
      beginShape(); vertex(2, -17.5); vertex(5 + bannerWave * 0.3, -20); vertex(8 + bannerWave * 0.3, -17.5); vertex(5 + bannerWave * 0.3, -15); endShape(CLOSE);
      fill(30, 25, 20, 200); ellipse(5 + bannerWave * 0.3, -17.5, 2.5, 2.5);
    } else if (fac.bannerGlyph === 'owl') {
      fill(240, 240, 248, 200);
      ellipse(5 + bannerWave * 0.3, -17.5, 5, 6);
      fill(30, 30, 40, 200);
      ellipse(4 + bannerWave * 0.3, -18.5, 2, 2); ellipse(6 + bannerWave * 0.3, -18.5, 2, 2);
    }
    pop();
  });
}

const _windowGlowTypes = { forum:1, temple:1, granary:1, market:1, shrine:1, villa:1, arch:1, bakery:1, bathhouse:1, sculptor:1, marketplace:1, windmill:1 };
const _groundGlowTypes = { torch:1, lantern:1, campfire:1, villa:1, temple:1, forum:1, shrine:1, granary:1, market:1, altar:1, bakery:1, lighthouse:1, guardtower:1, bathhouse:1, sculptor:1, windmill:1 };
function drawWindowGlow() {
  let bright = getSkyBrightness();
  if (bright >= 0.35) return;
  let nightStr = map(bright, 0, 0.35, 1, 0);
  noStroke();

  for (let _gi = 0; _gi < state.buildings.length; _gi++) {
    let b = state.buildings[_gi];
    let sx5 = w2sX(b.x);
    let sy5 = w2sY(b.y);
    if (sx5 < -30 || sx5 > width + 30 || sy5 < -30 || sy5 > height + 30) continue;
    if (_windowGlowTypes[b.type]) {
      fill(255, 195, 80, 70 * nightStr);
      rect(floor(sx5 - b.w * 0.15), floor(sy5 - b.h * 0.25), 5, 4);
      rect(floor(sx5 + b.w * 0.1), floor(sy5 - b.h * 0.25), 5, 4);
      fill(255, 175, 60, 30 * nightStr);
      ellipse(sx5, sy5 - b.h * 0.1, b.w * 0.7, b.h * 0.45);
    }
    if (_groundGlowTypes[b.type]) {
      fill(255, 160, 50, 18 * nightStr);
      ellipse(sx5, sy5 + 2, 30, 15);
      fill(255, 180, 70, 35 * nightStr);
      ellipse(sx5, sy5 + 2, 14, 7);
    }
  }
}


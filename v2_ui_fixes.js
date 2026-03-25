// ═══════════════════════════════════════════════════════════════════════
// V2 UI FIXES — Faction Select Layout + Confirmation Flow
// Load AFTER faction_select.js and input.js in index.html
// ═══════════════════════════════════════════════════════════════════════
(function() {

// ─── Fix 1: Override drawFactionSelect with responsive layout ────────
drawFactionSelect = function(dt) {
  factionSelectFade = min(factionSelectFade + dt * 4, 255);
  var a = factionSelectFade / 255;
  background(10, 18, 35);
  noStroke();

  // Ocean wave lines
  for (var i = 0; i < 8; i++) {
    var wy = height * 0.5 + i * 20 + sin(frameCount * 0.02 + i) * 3;
    fill(15, 30, 55, 30 * a);
    rect(0, wy, width, 10);
  }

  drawingContext.globalAlpha = a;
  textAlign(CENTER, TOP);

  // Title
  var titleY = max(10, height * 0.03);
  textSize(min(18, height * 0.028));
  fill(220, 195, 120);
  text('CHOOSE YOUR ALLEGIANCE', width / 2, titleY);
  textSize(min(9, height * 0.014));
  fill(160, 150, 130);
  text('This choice shapes your destiny across the Mediterranean', width / 2, titleY + 22);

  // Track where content ends for card placement
  var contentBottom = titleY + 40;

  // Difficulty selection (Conquest mode only)
  if (state._gameMode === 'conquest' || state._gameMode === '1v1') {
    if (typeof _selectedBotDifficulty === 'undefined' || !_selectedBotDifficulty) _selectedBotDifficulty = 'normal';
    var diffY = contentBottom + 4;
    var diffs = ['easy', 'normal', 'hard'];
    var diffLabels = ['EASY', 'NORMAL', 'HARD'];
    var diffColors = [[100,180,100], [220,190,80], [220,80,60]];
    var diffW = 70, diffGap = 12;
    var diffStartX = width / 2 - (diffs.length * (diffW + diffGap) - diffGap) / 2;

    textSize(8); fill(120, 110, 95);
    text('Bot Difficulty', width / 2, diffY - 12);

    for (var di = 0; di < diffs.length; di++) {
      var dx = diffStartX + di * (diffW + diffGap);
      var selected = _selectedBotDifficulty === diffs[di];
      var hover = mouseX >= dx && mouseX <= dx + diffW && mouseY >= diffY && mouseY <= diffY + 22;
      fill(selected ? diffColors[di][0] : 60, selected ? diffColors[di][1] : 50, selected ? diffColors[di][2] : 40, selected ? 220 : (hover ? 160 : 120));
      rect(dx, diffY, diffW, 22, 3);
      fill(selected ? 255 : 180); textSize(9); textAlign(CENTER, CENTER);
      text(diffLabels[di], dx + diffW / 2, diffY + 11);
    }
    textAlign(CENTER, TOP);
    contentBottom = diffY + 30;
  }

  // ─── Responsive card layout ────────────────────────────────
  var fKeys = ['rome', 'carthage', 'egypt', 'greece', 'seapeople', 'persia', 'phoenicia', 'gaul'];
  var gap2 = 10;
  var bottomMargin = 40; // space for key hints at bottom
  var availH = height - contentBottom - bottomMargin;
  var cardH = min(220, floor((availH - gap2) / 2));
  cardH = max(140, cardH); // minimum usable height
  var cardW = min(140, floor((width - gap2 * 5) / 4));
  cardW = max(100, cardW);

  var totalW = cardW * 4 + gap2 * 3;
  var startX = (width - totalW) / 2;
  var row1Y = contentBottom + 6;
  var row2Y = row1Y + cardH + gap2;

  // Hover detection
  factionSelectHover = null;
  for (var fi = 0; fi < 8; fi++) {
    var row = fi < 4 ? 0 : 1;
    var col = fi % 4;
    var cx2 = startX + col * (cardW + gap2);
    var cy2 = row === 0 ? row1Y : row2Y;
    if (mouseX >= cx2 && mouseX <= cx2 + cardW && mouseY >= cy2 && mouseY <= cy2 + cardH) {
      factionSelectHover = fKeys[fi];
    }
  }

  // Draw cards
  for (var fi2 = 0; fi2 < 8; fi2++) {
    var row2 = fi2 < 4 ? 0 : 1;
    var col2 = fi2 % 4;
    var cx3 = startX + col2 * (cardW + gap2);
    var cy3 = row2 === 0 ? row1Y : row2Y;
    _drawFactionCard(cx3, cy3, cardW, cardH, FACTIONS[fKeys[fi2]], factionSelectHover === fKeys[fi2], a);
  }

  // Keyboard hints
  textAlign(CENTER, TOP);
  textSize(min(10, height * 0.015));
  fill(130, 120, 100, 200 * a);
  var hintsY = row2Y + cardH + 8;
  if (hintsY < height - 16) {
    text('R: Rome  C: Carthage  E: Egypt  G: Greece  S: Sea People  P: Persia  F: Phoenicia  L: Gaul', width / 2, hintsY);
  }

  // ─── Confirmation overlay (fixed) ──────────────────────────
  if (_pendingFaction && FACTIONS[_pendingFaction]) {
    var pf = FACTIONS[_pendingFaction];
    var _isSP = _pendingFaction === 'seapeople';
    var oW = min(_isSP ? 420 : 380, width * 0.75);
    var oH = _isSP ? 160 : 120;
    var oX = (width - oW) / 2, oY = (height - oH) / 2;

    // Dimmed background
    fill(0, 0, 0, 190 * a);
    rect(0, 0, width, height);

    // Dialog box
    fill(25, 22, 18, 245 * a);
    rect(oX, oY, oW, oH, 8);
    stroke(pf.bannerColor[0], pf.bannerColor[1], pf.bannerColor[2], 220 * a);
    strokeWeight(2); noFill();
    rect(oX, oY, oW, oH, 8);
    noStroke();

    // Faction name
    textAlign(CENTER, CENTER);
    textSize(16);
    fill(pf.bannerColor[0] + 60, pf.bannerColor[1] + 60, pf.bannerColor[2] + 60, 240 * a);
    text('Pledge allegiance to ' + pf.name + '?', width / 2, oY + 28);

    // Sea People warning
    if (_isSP) {
      textSize(10); fill(255, 100, 60, 230 * a);
      text('Warning: Sea People start on a ship with no island.', width / 2, oY + 52);
      text('Recommended for experienced players.', width / 2, oY + 66);
    }

    // ─── Confirm / Cancel buttons ───────────────────────────
    var btnY = oY + oH - 44;
    var btnW = 120, btnH = 30, btnGap = 20;
    var confirmX = width / 2 - btnW - btnGap / 2;
    var cancelX = width / 2 + btnGap / 2;

    // Confirm button
    var confirmHover = mouseX >= confirmX && mouseX <= confirmX + btnW && mouseY >= btnY && mouseY <= btnY + btnH;
    fill(confirmHover ? 60 : 40, confirmHover ? 120 : 80, confirmHover ? 60 : 40, 230 * a);
    rect(confirmX, btnY, btnW, btnH, 4);
    stroke(100, 200, 100, (confirmHover ? 220 : 150) * a);
    strokeWeight(1); noFill();
    rect(confirmX, btnY, btnW, btnH, 4);
    noStroke();
    fill(confirmHover ? 255 : 200, confirmHover ? 255 : 220, confirmHover ? 200 : 160, 240 * a);
    textSize(12); textAlign(CENTER, CENTER);
    text('CONFIRM', confirmX + btnW / 2, btnY + btnH / 2);

    // Cancel button
    var cancelHover = mouseX >= cancelX && mouseX <= cancelX + btnW && mouseY >= btnY && mouseY <= btnY + btnH;
    fill(cancelHover ? 100 : 60, cancelHover ? 40 : 30, cancelHover ? 40 : 30, 230 * a);
    rect(cancelX, btnY, btnW, btnH, 4);
    stroke(200, 100, 100, (cancelHover ? 220 : 150) * a);
    strokeWeight(1); noFill();
    rect(cancelX, btnY, btnW, btnH, 4);
    noStroke();
    fill(cancelHover ? 255 : 200, cancelHover ? 200 : 160, cancelHover ? 200 : 160, 240 * a);
    textSize(12); textAlign(CENTER, CENTER);
    text('CANCEL', cancelX + btnW / 2, btnY + btnH / 2);

    // Keyboard hint below buttons
    textSize(8); fill(100, 95, 85, 160 * a);
    textAlign(CENTER, CENTER);
    text('ENTER = confirm    ESC = cancel', width / 2, oY + oH - 8);

    // Store button rects for click detection
    window._factionConfirmBtn = { x: confirmX, y: btnY, w: btnW, h: btnH };
    window._factionCancelBtn = { x: cancelX, y: btnY, w: btnW, h: btnH };
  } else {
    window._factionConfirmBtn = null;
    window._factionCancelBtn = null;
  }

  drawingContext.globalAlpha = 1;
};

// ─── Fix 2: Override _drawFactionCard to be height-adaptive ──────────
var _origDrawFactionCard = (typeof _drawFactionCard === 'function') ? _drawFactionCard : null;

_drawFactionCard = function(x, y, w, h, fac, hovered, a) {
  var bc = fac.bannerColor;
  push();
  noStroke();

  // Card shadow
  fill(0, 0, 0, 40 * a);
  rect(x + 2, y + 2, w, h, 4);

  // Card background
  fill(30, 25, 20, (hovered ? 245 : 210) * a);
  rect(x, y, w, h, 4);

  // Border
  stroke(bc[0], bc[1], bc[2], (hovered ? 230 : 120) * a);
  strokeWeight(hovered ? 2.5 : 1);
  noFill();
  rect(x, y, w, h, 4);
  noStroke();

  // Hover highlight
  if (hovered) {
    fill(bc[0], bc[1], bc[2], 18 * a);
    rect(x, y, w, h, 4);
    // Subtle glow
    fill(bc[0], bc[1], bc[2], 6 * a);
    rect(x - 3, y - 3, w + 6, h + 6, 6);
  }

  var cx = x + w / 2;
  // Scale glyph position based on card height
  var glyphScale = min(1, h / 220);
  var gy = y + 30 * glyphScale + 8;

  // ─── Glyphs (same as original, slightly repositioned) ─────
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
    fill(200, 170, 40, 220 * a);
    beginShape(); vertex(cx - 14, gy); vertex(cx, gy - 8); vertex(cx + 14, gy); vertex(cx, gy + 6); endShape(CLOSE);
    fill(30, 25, 20, 240 * a); ellipse(cx, gy - 1, 10, 10);
    fill(64, 176, 160, 220 * a); ellipse(cx, gy - 1, 6, 6);
    fill(245, 240, 224, 200 * a); ellipse(cx - 1, gy - 2, 2, 2);
    fill(200, 170, 40, 180 * a);
    beginShape(); vertex(cx, gy + 6); vertex(cx - 2, gy + 14); vertex(cx + 2, gy + 14); endShape(CLOSE);
  } else if (fac.bannerGlyph === 'owl') {
    fill(220, 220, 230, 220 * a);
    ellipse(cx, gy, 20, 22);
    fill(80, 144, 192, 220 * a);
    ellipse(cx - 5, gy - 4, 8, 8); ellipse(cx + 5, gy - 4, 8, 8);
    fill(30, 30, 40, 240 * a);
    ellipse(cx - 5, gy - 4, 4, 5); ellipse(cx + 5, gy - 4, 4, 5);
    fill(200, 170, 60, 200 * a);
    beginShape(); vertex(cx - 2, gy); vertex(cx, gy - 3); vertex(cx + 2, gy); endShape(CLOSE);
    fill(220, 220, 230, 180 * a);
    beginShape(); vertex(cx - 8, gy - 8); vertex(cx - 6, gy - 14); vertex(cx - 4, gy - 8); endShape(CLOSE);
    beginShape(); vertex(cx + 4, gy - 8); vertex(cx + 6, gy - 14); vertex(cx + 8, gy - 8); endShape(CLOSE);
  } else if (fac.bannerGlyph === 'trident') {
    fill(42, 138, 106, 220 * a);
    rect(cx - 1, gy - 12, 3, 24);
    rect(cx - 8, gy - 14, 3, 10); rect(cx + 6, gy - 14, 3, 10);
    rect(cx - 1, gy - 16, 3, 4);
    fill(26, 58, 92, 200 * a);
    rect(cx - 9, gy - 4, 19, 3);
  } else if (fac.bannerGlyph === 'wingedlion') {
    fill(212, 160, 48, 220 * a);
    ellipse(cx, gy, 16, 14); ellipse(cx - 2, gy - 8, 10, 10);
    fill(106, 42, 138, 200 * a);
    beginShape(); vertex(cx + 6, gy - 6); vertex(cx + 14, gy - 14); vertex(cx + 10, gy - 2); endShape(CLOSE);
    beginShape(); vertex(cx - 6, gy - 6); vertex(cx - 14, gy - 14); vertex(cx - 10, gy - 2); endShape(CLOSE);
    fill(30, 25, 20, 240 * a); ellipse(cx - 4, gy - 9, 3, 3);
  } else if (fac.bannerGlyph === 'cedar') {
    fill(106, 74, 42, 220 * a); rect(cx - 2, gy + 2, 4, 12);
    fill(42, 106, 48, 220 * a);
    beginShape(); vertex(cx, gy - 14); vertex(cx - 12, gy + 2); vertex(cx + 12, gy + 2); endShape(CLOSE);
    fill(60, 130, 60, 180 * a);
    beginShape(); vertex(cx, gy - 10); vertex(cx - 8, gy - 1); vertex(cx + 8, gy - 1); endShape(CLOSE);
  } else if (fac.bannerGlyph === 'boar') {
    fill(90, 64, 32, 220 * a);
    ellipse(cx, gy, 22, 16);
    fill(70, 50, 25, 220 * a); ellipse(cx + 8, gy - 2, 10, 10);
    fill(200, 160, 32, 200 * a);
    beginShape(); vertex(cx + 10, gy - 6); vertex(cx + 14, gy - 10); vertex(cx + 12, gy - 4); endShape(CLOSE);
    fill(30, 25, 20, 240 * a); ellipse(cx + 10, gy - 4, 3, 3);
    fill(42, 106, 48, 180 * a);
    for (var bi = -4; bi <= 4; bi += 2) rect(cx + bi, gy - 10, 2, 4);
  }

  // Keyboard shortcut
  var _fkMap = {rome:'R',carthage:'C',egypt:'E',greece:'G',seapeople:'S',persia:'P',phoenicia:'F',gaul:'L'};
  var _fkName = '';
  for (var _fk in _fkMap) { if (FACTIONS[_fk] === fac) { _fkName = _fk; break; } }
  if (_fkName) {
    textAlign(CENTER, TOP); textSize(min(9, h * 0.04));
    fill(120, 110, 90, 180 * a);
    text('[' + _fkMap[_fkName] + ']', cx, gy + 10);
  }

  // Faction name
  textAlign(CENTER, TOP);
  var nameY = gy + 22;
  textSize(min(14, h * 0.065));
  fill(bc[0] + 60, bc[1] + 60, bc[2] + 60, 240 * a);
  text(fac.name, cx, nameY);

  // Special tags
  if (_fkName === 'seapeople') {
    textSize(min(9, h * 0.04));
    fill(255, 140, 40, 240 * a);
    text('(ADVANCED)', cx, nameY + 16);
  }
  if (_fkName === 'rome') {
    textSize(min(9, h * 0.04));
    fill(80, 200, 80, 240 * a);
    text('(RECOMMENDED)', cx, nameY + 16);
  }

  // Subtitle
  textSize(min(10, h * 0.045));
  fill(160, 150, 130, 200 * a);
  text(fac.subtitle, cx, nameY + 18);

  // Bonuses — limit to what fits
  textAlign(LEFT, TOP);
  textSize(min(11, h * 0.05));
  var ly = nameY + 38;
  var maxBonusY = y + h - 30; // leave room for SELECT button
  for (var i = 0; i < fac.bonuses.length; i++) {
    if (ly + 14 > maxBonusY) break; // stop if no room
    fill(180, 170, 140, 220 * a);
    text('+ ' + fac.bonuses[i], x + 10, ly);
    ly += min(16, h * 0.073);
  }

  // Hover select prompt
  if (hovered) {
    textAlign(CENTER, TOP);
    textSize(min(11, h * 0.05));
    fill(bc[0] + 80, bc[1] + 80, bc[2] + 80, (sin(frameCount * 0.08) * 40 + 210) * a);
    text('[ SELECT ]', cx, y + h - 24);
  }

  pop();
};

// ─── Fix 3: Patch mousePressed for faction select ────────────────────
// The original code on line 37 auto-confirms pending faction on ANY click.
// We fix it so clicking only works on the Confirm/Cancel buttons.
var _origMousePressed = mousePressed;
mousePressed = function() {
  // Intercept faction select confirmation clicks
  if (typeof factionSelectActive !== 'undefined' && factionSelectActive && typeof _pendingFaction !== 'undefined' && _pendingFaction) {
    // Check if clicking CONFIRM button
    if (window._factionConfirmBtn) {
      var cb = window._factionConfirmBtn;
      if (mouseX >= cb.x && mouseX <= cb.x + cb.w && mouseY >= cb.y && mouseY <= cb.y + cb.h) {
        selectFaction(_pendingFaction);
        _pendingFaction = null;
        return;
      }
    }
    // Check if clicking CANCEL button
    if (window._factionCancelBtn) {
      var ccb = window._factionCancelBtn;
      if (mouseX >= ccb.x && mouseX <= ccb.x + ccb.w && mouseY >= ccb.y && mouseY <= ccb.y + ccb.h) {
        _pendingFaction = null;
        return;
      }
    }
    // Clicking anywhere else while confirmation is showing — do nothing (don't auto-confirm)
    return;
  }

  // Otherwise call original
  if (_origMousePressed) _origMousePressed();
};

})();

console.log('[V2 UI FIXES] Loaded: Faction select responsive layout + confirmation buttons');

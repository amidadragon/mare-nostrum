// ══════════════════════════════════════════════════════════════════════
// MARE NOSTRUM — UI Polish Patch v1.0
// Drop this file into your mare-nostrum-v2 folder and add a
// <script src="ui_polish_patch.js"></script> tag AFTER all other scripts
// in index.html. It monkey-patches drawFactionSelect, _drawFactionCard,
// drawHUDPanel, drawClockHUD, and drawVignette with polished versions.
// ══════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // Wait for p5 and game to be ready
  function waitForGame(cb) {
    if (typeof drawFactionSelect === 'function' && typeof FACTIONS !== 'undefined') {
      cb();
    } else {
      setTimeout(function () { waitForGame(cb); }, 200);
    }
  }

  waitForGame(function () {
    console.log('[UI-Polish] Applying visual polish patch...');

    // ──────────────────────────────────────────────────
    // 1. FACTION CARD — polished with emblem circles,
    //    colored top bars, proper text clipping
    // ──────────────────────────────────────────────────
    window._drawFactionCard = function (x, y, w, h, fac, hovered, a) {
      var bc = fac.bannerColor;
      push();

      // Clip to card bounds
      drawingContext.save();
      drawingContext.beginPath();
      if (drawingContext.roundRect) {
        drawingContext.roundRect(x, y, w, h, 8);
      } else {
        drawingContext.rect(x, y, w, h);
      }
      drawingContext.clip();

      noStroke();

      // Card shadow
      var shadowOff = hovered ? 6 : 3;
      fill(0, 0, 0, (hovered ? 80 : 40) * a);
      rect(x + shadowOff, y + shadowOff, w, h, 8);

      // Card background
      var bgBright = hovered ? 42 : 28;
      fill(bgBright, bgBright - 3, bgBright - 8, 235 * a);
      rect(x, y, w, h, 8);

      // Colored top bar
      fill(bc[0], bc[1], bc[2], (hovered ? 200 : 140) * a);
      rect(x, y, w, 4);

      // Hover glow
      if (hovered) {
        for (var gi = 0; gi < 3; gi++) {
          fill(bc[0], bc[1], bc[2], (12 - gi * 4) * a);
          rect(x + gi, y + gi, w - gi * 2, h - gi * 2, 8);
        }
      }

      // Border
      stroke(bc[0], bc[1], bc[2], (hovered ? 255 : 80) * a);
      strokeWeight(hovered ? 2 : 1);
      noFill();
      rect(x, y, w, h, 8);
      noStroke();

      var cx = x + w / 2;
      var emblemY = y + 40;
      var circR = 24;

      // Emblem circle background
      fill(bc[0], bc[1], bc[2], (hovered ? 35 : 18) * a);
      ellipse(cx, emblemY, circR * 2, circR * 2);
      stroke(bc[0], bc[1], bc[2], (hovered ? 160 : 60) * a);
      strokeWeight(1.5);
      noFill();
      ellipse(cx, emblemY, circR * 2, circR * 2);
      stroke(bc[0], bc[1], bc[2], (hovered ? 80 : 30) * a);
      strokeWeight(0.5);
      ellipse(cx, emblemY, circR * 2 + 8, circR * 2 + 8);
      noStroke();

      // ── Draw emblem glyphs ──
      var gy = emblemY;

      if (fac.bannerGlyph === 'eagle') {
        // Roman Eagle
        fill(220, 190, 60, 240 * a);
        rect(cx - 3, gy - 5, 6, 12, 1);
        beginShape(); vertex(cx - 3, gy - 1); vertex(cx - 16, gy - 13); vertex(cx - 14, gy - 8); vertex(cx - 8, gy - 3); endShape(CLOSE);
        beginShape(); vertex(cx + 3, gy - 1); vertex(cx + 16, gy - 13); vertex(cx + 14, gy - 8); vertex(cx + 8, gy - 3); endShape(CLOSE);
        fill(240, 210, 80, 250 * a); ellipse(cx, gy - 8, 7, 7);
        fill(255, 220, 60, 220 * a); triangle(cx - 2, gy - 12, cx, gy - 15, cx + 2, gy - 12);
        fill(180, 150, 40, 200 * a); rect(cx - 6, gy + 6, 3, 4); rect(cx + 3, gy + 6, 3, 4);
        fill(175, 28, 28, 180 * a); textSize(5); textAlign(CENTER, CENTER); text('SPQR', cx, gy + 15);
      } else if (fac.bannerGlyph === 'crescent') {
        // Carthage crescent & star
        fill(180, 140, 220, 240 * a); ellipse(cx, gy, 24, 24);
        fill(bgBright, bgBright - 3, bgBright - 8, 250 * a); ellipse(cx + 6, gy - 2, 19, 19);
        fill(230, 190, 70, 220 * a); ellipse(cx - 3, gy + 3, 5, 5);
        for (var si = 0; si < 3; si++) { var ang2 = -0.8 + si * 0.5; ellipse(cx - 3 + cos(ang2) * 8, gy + 3 + sin(ang2) * 8, 2, 2); }
      } else if (fac.bannerGlyph === 'eye') {
        // Eye of Horus
        fill(200, 170, 40, 240 * a);
        beginShape(); vertex(cx - 16, gy); vertex(cx, gy - 10); vertex(cx + 16, gy); vertex(cx, gy + 7); endShape(CLOSE);
        fill(30, 28, 22, 250 * a); ellipse(cx, gy - 1, 12, 12);
        fill(64, 176, 160, 240 * a); ellipse(cx, gy - 1, 8, 8);
        fill(255, 250, 230, 200 * a); ellipse(cx - 1, gy - 3, 3, 3);
        fill(200, 170, 40, 200 * a); beginShape(); vertex(cx + 2, gy + 7); vertex(cx, gy + 16); vertex(cx + 5, gy + 12); endShape(CLOSE);
      } else if (fac.bannerGlyph === 'owl') {
        // Owl of Athena
        fill(225, 225, 235, 240 * a); ellipse(cx, gy + 2, 22, 26);
        fill(80, 144, 192, 240 * a); ellipse(cx - 5, gy - 3, 10, 10); ellipse(cx + 5, gy - 3, 10, 10);
        fill(20, 20, 30, 250 * a); ellipse(cx - 5, gy - 3, 5, 6); ellipse(cx + 5, gy - 3, 5, 6);
        fill(255, 255, 200, 200 * a); ellipse(cx - 6, gy - 4, 2, 2); ellipse(cx + 4, gy - 4, 2, 2);
        fill(210, 180, 70, 220 * a); triangle(cx - 2, gy + 1, cx, gy - 2, cx + 2, gy + 1);
        fill(225, 225, 235, 200 * a); triangle(cx - 9, gy - 7, cx - 6, gy - 16, cx - 3, gy - 7); triangle(cx + 3, gy - 7, cx + 6, gy - 16, cx + 9, gy - 7);
        fill(100, 160, 60, 160 * a); ellipse(cx - 12, gy + 7, 5, 3); ellipse(cx + 12, gy + 7, 5, 3);
      } else if (fac.bannerGlyph === 'trident') {
        // Poseidon's Trident
        fill(42, 138, 106, 240 * a); rect(cx - 2, gy - 6, 4, 24, 1);
        rect(cx - 2, gy - 15, 4, 9, 2, 2, 0, 0); rect(cx - 9, gy - 12, 3, 7, 2, 2, 0, 0); rect(cx + 6, gy - 12, 3, 7, 2, 2, 0, 0);
        fill(60, 180, 140, 220 * a); triangle(cx - 2, gy - 17, cx, gy - 21, cx + 2, gy - 17); triangle(cx - 9, gy - 14, cx - 7, gy - 18, cx - 6, gy - 14); triangle(cx + 6, gy - 14, cx + 7, gy - 18, cx + 9, gy - 14);
        fill(26, 80, 92, 220 * a); rect(cx - 10, gy - 4, 20, 3, 1);
      } else if (fac.bannerGlyph === 'wingedlion') {
        // Persian Winged Lion
        fill(212, 160, 48, 240 * a); ellipse(cx, gy + 2, 18, 14); ellipse(cx - 2, gy - 6, 11, 11);
        fill(140, 60, 170, 200 * a);
        beginShape(); vertex(cx + 7, gy - 4); vertex(cx + 16, gy - 14); vertex(cx + 18, gy - 10); vertex(cx + 11, gy); endShape(CLOSE);
        beginShape(); vertex(cx - 7, gy - 4); vertex(cx - 16, gy - 14); vertex(cx - 18, gy - 10); vertex(cx - 11, gy); endShape(CLOSE);
        fill(255, 220, 60, 220 * a); rect(cx - 5, gy - 13, 7, 3, 1); triangle(cx - 4, gy - 13, cx - 2, gy - 17, cx, gy - 13); triangle(cx, gy - 13, cx + 2, gy - 17, cx + 4, gy - 13);
        fill(30, 25, 20, 250 * a); ellipse(cx - 4, gy - 7, 3, 3);
      } else if (fac.bannerGlyph === 'cedar') {
        // Cedar of Lebanon
        fill(90, 65, 35, 240 * a); rect(cx - 2, gy + 4, 5, 12, 1);
        fill(35, 110, 45, 240 * a); triangle(cx, gy - 16, cx - 14, gy + 4, cx + 14, gy + 4);
        fill(50, 135, 55, 200 * a); triangle(cx, gy - 12, cx - 10, gy, cx + 10, gy);
        fill(65, 155, 65, 180 * a); triangle(cx, gy - 8, cx - 7, gy - 3, cx + 7, gy - 3);
      } else if (fac.bannerGlyph === 'boar') {
        // Gallic Boar
        fill(100, 72, 36, 240 * a); ellipse(cx - 2, gy, 24, 16);
        fill(80, 58, 30, 240 * a); ellipse(cx + 9, gy - 2, 12, 10);
        fill(230, 210, 160, 220 * a); beginShape(); vertex(cx + 13, gy - 3); vertex(cx + 16, gy - 10); vertex(cx + 14, gy - 2); endShape(CLOSE);
        fill(30, 25, 20, 250 * a); ellipse(cx + 11, gy - 3, 3, 3);
        fill(200, 160, 40, 180 * a); ellipse(cx + 11, gy - 3, 2, 2);
        fill(60, 120, 50, 200 * a); for (var bi = -4; bi <= 3; bi++) rect(cx + bi * 3, gy - 10 - abs(bi) * 0.5, 2, 4);
        fill(80, 58, 30, 200 * a); rect(cx - 9, gy + 6, 3, 5); rect(cx - 3, gy + 6, 3, 5); rect(cx + 2, gy + 6, 3, 5); rect(cx + 7, gy + 6, 3, 5);
      }

      // ── Faction name ──
      textAlign(CENTER, TOP);
      textSize(13);
      fill(bc[0] + 80, bc[1] + 80, bc[2] + 80, 250 * a);
      text(fac.name, cx, emblemY + 30);

      // Tags
      var _fkMap = { rome: 'R', carthage: 'C', egypt: 'E', greece: 'G', seapeople: 'S', persia: 'P', phoenicia: 'F', gaul: 'L' };
      var _fkName = '';
      for (var _fk in _fkMap) { if (FACTIONS[_fk] === fac) { _fkName = _fk; break; } }

      var tagY = emblemY + 46;
      if (_fkName === 'seapeople') {
        textSize(7); fill(255, 120, 40, 240 * a); text('ADVANCED', cx, tagY); tagY += 10;
      } else if (_fkName === 'rome') {
        textSize(7); fill(80, 210, 80, 240 * a); text('RECOMMENDED', cx, tagY); tagY += 10;
      }

      // Subtitle
      textSize(8); fill(140, 130, 110, 200 * a); text(fac.subtitle, cx, tagY);

      // Divider
      var divY = tagY + 14;
      noStroke(); fill(bc[0], bc[1], bc[2], 40 * a); rect(x + 12, divY, w - 24, 1);

      // Bonuses — smaller font with truncation
      textAlign(LEFT, TOP);
      textSize(9);
      var ly = divY + 6;
      var maxTextW = w - 28;
      for (var i = 0; i < fac.bonuses.length; i++) {
        fill(bc[0] + 30, bc[1] + 30, bc[2] + 30, 80 * a);
        ellipse(x + 14, ly + 5, 3, 3);
        fill(180, 170, 145, 220 * a);
        var bonusText = fac.bonuses[i];
        while (textWidth(bonusText) > maxTextW && bonusText.length > 3) {
          bonusText = bonusText.substring(0, bonusText.length - 2);
        }
        if (bonusText !== fac.bonuses[i]) bonusText += '..';
        text(bonusText, x + 20, ly);
        ly += 14;
      }

      // Keyboard shortcut
      if (_fkName) {
        textAlign(CENTER, TOP); textSize(8); fill(90, 85, 75, 130 * a);
        text('[' + _fkMap[_fkName] + ']', cx, y + h - 26);
      }

      // Hover select prompt
      if (hovered) {
        var pulseA = sin(frameCount * 0.08) * 40 + 200;
        fill(bc[0] + 100, bc[1] + 100, bc[2] + 100, pulseA * a);
        textAlign(CENTER, TOP); textSize(10);
        text('[ SELECT ]', cx, y + h - 14);
      }

      drawingContext.restore();
      pop();
    };

    // ──────────────────────────────────────────────────
    // 2. FACTION SELECT SCREEN — starry Mediterranean
    //    sky, ocean waves, laurel wreath decoration
    // ──────────────────────────────────────────────────
    window.drawFactionSelect = function (dt) {
      factionSelectFade = min(factionSelectFade + dt * 4, 255);
      var a = factionSelectFade / 255;

      // Mediterranean gradient background
      var bgTop = color(8, 12, 28);
      var bgMid = color(12, 25, 55);
      var bgBot = color(18, 40, 70);
      noStroke();
      for (var sy = 0; sy < height; sy += 4) {
        var t = sy / height;
        var c;
        if (t < 0.5) c = lerpColor(bgTop, bgMid, t * 2);
        else c = lerpColor(bgMid, bgBot, (t - 0.5) * 2);
        fill(red(c), green(c), blue(c), 255);
        rect(0, sy, width, 4);
      }

      // Animated stars
      randomSeed(42);
      for (var si = 0; si < 60; si++) {
        var sx = random(width);
        var sy2 = random(height * 0.45);
        var sb = random(80, 200) + sin(frameCount * 0.03 + si) * 40;
        var ss = random(1, 2.5);
        fill(255, 255, 240, sb * a);
        noStroke();
        ellipse(sx, sy2, ss, ss);
      }
      randomSeed(frameCount);

      // Ocean waves at bottom
      for (var wi = 0; wi < 6; wi++) {
        var wy = height * 0.88 + wi * 12;
        var wAlpha = (30 - wi * 4) * a;
        fill(30, 80, 130, wAlpha);
        beginShape();
        for (var wx = 0; wx <= width; wx += 20) {
          var wh = sin(wx * 0.008 + frameCount * 0.015 + wi * 0.8) * (8 - wi);
          vertex(wx, wy + wh);
        }
        vertex(width, height);
        vertex(0, height);
        endShape(CLOSE);
      }

      // Decorative columns (faint)
      for (var side = 0; side < 2; side++) {
        var colX = side === 0 ? width * 0.04 : width * 0.96;
        fill(60, 55, 45, 25 * a);
        rect(colX - 4, height * 0.1, 8, height * 0.75, 2);
        fill(70, 65, 50, 30 * a);
        rect(colX - 8, height * 0.1, 16, 6, 2);
        rect(colX - 6, height * 0.1 + 6, 12, 4);
        rect(colX - 8, height * 0.85 - 6, 16, 6, 2);
      }

      var titleY = height * 0.06;
      var titleCX = width / 2;

      // Gold laurel branches (decorative arcs)
      stroke(180, 155, 70, 60 * a);
      strokeWeight(1);
      noFill();
      arc(titleCX - 100, titleY + 14, 60, 40, -PI * 0.8, PI * 0.1);
      arc(titleCX + 100, titleY + 14, 60, 40, PI * 0.9, PI * 1.8);
      noStroke();

      // Laurel leaves
      fill(160, 140, 60, 50 * a);
      for (var li = 0; li < 5; li++) {
        var la = -PI * 0.7 + li * 0.2;
        var lx = titleCX - 100 + cos(la) * 30;
        var ly2 = titleY + 14 + sin(la) * 20;
        ellipse(lx, ly2, 6, 3);
        lx = titleCX + 100 + cos(PI - la) * 30;
        ellipse(lx, ly2, 6, 3);
      }

      drawingContext.globalAlpha = a;

      // Title
      textAlign(CENTER, TOP);
      textSize(28);
      fill(220, 195, 120);
      text('CHOOSE YOUR ALLEGIANCE', titleCX, titleY);

      textSize(11);
      fill(140, 130, 110);
      text('This choice shapes your destiny across the Mediterranean', titleCX, titleY + 36);

      // Decorative line under subtitle
      var lineY = titleY + 54;
      noStroke();
      fill(180, 155, 70, 40 * a);
      rect(titleCX - 120, lineY, 240, 1);
      fill(180, 155, 70, 80 * a);
      rect(titleCX - 60, lineY, 120, 1);
      fill(220, 195, 120, 120 * a);
      push(); translate(titleCX, lineY); rotate(PI / 4); rect(-3, -3, 6, 6); pop();

      // Difficulty selection
      var diffAreaH = 0;
      if (state._gameMode === 'conquest' || state._gameMode === '1v1') {
        if (!_selectedBotDifficulty) _selectedBotDifficulty = 'normal';
        var diffY = titleY + 62;
        diffAreaH = 36;
        var diffs = ['easy', 'normal', 'hard'];
        var diffLabels = ['EASY', 'NORMAL', 'HARD'];
        var diffColors = [[100, 180, 100], [220, 190, 80], [220, 80, 60]];
        var diffW = 80, diffGap = 14;
        var diffStartX = titleCX - (diffs.length * (diffW + diffGap) - diffGap) / 2;

        textSize(9); fill(110, 105, 90); textAlign(CENTER, TOP);
        text('Bot Difficulty', titleCX, diffY - 2);

        for (var di = 0; di < diffs.length; di++) {
          var dx = diffStartX + di * (diffW + diffGap);
          var dy = diffY + 12;
          var selected = _selectedBotDifficulty === diffs[di];
          var hover = mouseX >= dx && mouseX <= dx + diffW && mouseY >= dy && mouseY <= dy + 24;

          if (selected) {
            fill(diffColors[di][0], diffColors[di][1], diffColors[di][2], 30 * a);
            rect(dx - 2, dy - 2, diffW + 4, 28, 6);
          }
          fill(selected ? diffColors[di][0] : 50, selected ? diffColors[di][1] : 45, selected ? diffColors[di][2] : 40, selected ? 220 : (hover ? 160 : 100));
          rect(dx, dy, diffW, 24, 5);
          if (selected) {
            stroke(diffColors[di][0], diffColors[di][1], diffColors[di][2], 160);
            strokeWeight(1); noFill(); rect(dx, dy, diffW, 24, 5); noStroke();
          }
          fill(selected ? 255 : 170); textSize(10); textAlign(CENTER, CENTER);
          text(diffLabels[di], dx + diffW / 2, dy + 12);
        }
      }

      // Cards layout
      var fKeys = ['rome', 'carthage', 'egypt', 'greece', 'seapeople', 'persia', 'phoenicia', 'gaul'];
      var cardW = min(160, (width - 100) / 4 - 12);
      var cardH = min(260, height * 0.34);
      var gap = 12;
      var totalW = cardW * 4 + gap * 3;
      var startX = (width - totalW) / 2;
      var topOffset = titleY + 62 + diffAreaH;
      var row1Y = topOffset;
      var row2Y = row1Y + cardH + gap;

      factionSelectHover = null;

      for (var fi = 0; fi < 8; fi++) {
        var row = fi < 4 ? 0 : 1;
        var col = fi % 4;
        var cx2 = startX + col * (cardW + gap);
        var cy2 = row === 0 ? row1Y : row2Y;
        if (mouseX >= cx2 && mouseX <= cx2 + cardW && mouseY >= cy2 && mouseY <= cy2 + cardH) {
          factionSelectHover = fKeys[fi];
        }
      }

      for (var fi2 = 0; fi2 < 8; fi2++) {
        var row2 = fi2 < 4 ? 0 : 1;
        var col2 = fi2 % 4;
        var cx3 = startX + col2 * (cardW + gap);
        var cy3 = row2 === 0 ? row1Y : row2Y;
        _drawFactionCard(cx3, cy3, cardW, cardH, FACTIONS[fKeys[fi2]], factionSelectHover === fKeys[fi2], a);
      }

      // Keyboard shortcut hint
      textAlign(CENTER, TOP);
      textSize(10);
      fill(90, 85, 70, 160 * a);
      text('R: Rome  C: Carthage  E: Egypt  G: Greece  S: Sea People  P: Persia  F: Phoenicia  L: Gaul', titleCX, row2Y + cardH + 14);

      // Confirmation overlay
      if (_pendingFaction && FACTIONS[_pendingFaction]) {
        var pf = FACTIONS[_pendingFaction];
        var _isSP = _pendingFaction === 'seapeople';
        var oW = min(_isSP ? 440 : 380, width * 0.7), oH = _isSP ? 150 : 110;
        var oX = (width - oW) / 2, oY = (height - oH) / 2;

        fill(0, 0, 0, 180 * a);
        rect(0, 0, width, height);

        fill(20, 18, 14, 245 * a);
        rect(oX, oY, oW, oH, 10);
        fill(pf.bannerColor[0], pf.bannerColor[1], pf.bannerColor[2], 180 * a);
        rect(oX, oY, oW, 4, 10, 10, 0, 0);
        stroke(pf.bannerColor[0], pf.bannerColor[1], pf.bannerColor[2], 200 * a);
        strokeWeight(1.5); noFill(); rect(oX, oY, oW, oH, 10); noStroke();

        textAlign(CENTER, CENTER); textSize(18);
        fill(220, 200, 140, 240 * a);
        text('You chose ' + pf.name, titleCX, oY + 30);

        if (_isSP) {
          textSize(11); fill(255, 100, 60, 230 * a);
          text('Warning: Sea People start on a ship with no island.', titleCX, oY + 55);
          textSize(10); fill(255, 130, 60, 200 * a);
          text('Recommended for experienced players.', titleCX, oY + 72);
        }

        textSize(12); fill(170, 160, 140, 220 * a);
        text('This is permanent! Press ENTER to confirm or ESC to cancel.', titleCX, oY + (_isSP ? 95 : 62));
        var promptAlpha = sin(frameCount * 0.06) * 30 + 170;
        textSize(10); fill(130, 120, 100, promptAlpha * a);
        text('ENTER = confirm    ESC = cancel', titleCX, oY + (_isSP ? 118 : 88));
      }

      drawingContext.globalAlpha = 1;
    };

    // ──────────────────────────────────────────────────
    // 3. HUD PANEL — polished dark gradient with border
    // ──────────────────────────────────────────────────
    window.drawHUDPanel = function (x, y, w, h) {
      push();
      noStroke();

      drawingContext.save();
      drawingContext.beginPath();
      if (drawingContext.roundRect) {
        drawingContext.roundRect(x, y, w, h, 6);
      } else {
        drawingContext.rect(x, y, w, h);
      }
      drawingContext.clip();

      // Gradient background
      for (var gy = 0; gy < h; gy += 3) {
        var gt = gy / h;
        fill(lerpColor(color(14, 18, 30, 230), color(10, 14, 24, 240), gt));
        rect(x, y + gy, w, 3);
      }

      drawingContext.restore();

      // Border
      stroke(60, 80, 120, 80);
      strokeWeight(1);
      noFill();
      rect(x, y, w, h, 6);

      // Inner highlight
      stroke(80, 110, 160, 30);
      line(x + 4, y + 1, x + w - 4, y + 1);

      noStroke();
      pop();
    };

    // ──────────────────────────────────────────────────
    // 4. VIGNETTE — smooth radial edge darkening
    // ──────────────────────────────────────────────────
    window.drawVignette = function () {
      push();
      noStroke();
      drawingContext.save();

      var grd = drawingContext.createRadialGradient(
        width / 2, height / 2, min(width, height) * 0.35,
        width / 2, height / 2, max(width, height) * 0.75
      );
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(0.7, 'rgba(0,0,0,0.05)');
      grd.addColorStop(1, 'rgba(0,0,0,0.25)');

      drawingContext.fillStyle = grd;
      drawingContext.fillRect(0, 0, width, height);

      drawingContext.restore();
      pop();
    };

    console.log('[UI-Polish] Patch applied successfully!');
  });
})();

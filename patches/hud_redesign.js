// ═══════════════════════════════════════════════════════════════════════
// HUD REDESIGN — part 2 of the UI overhaul. ZERO core file edits.
//
//   · drawHudResource: the sprite icons it expected (sprites/ui/*.png)
//     404 — rows were bare text. Replaced with crisp procedural icons,
//     small-caps labels, and right-aligned bright values. Keeps the
//     flash/bounce feedback and analytics hook.
//   · drawBarHUD: carved-stone troughs -> sleek rounded gauges with a
//     soft fill gradient and a Cinzel label.
//
// Pairs with patches/horologium_ui.js (panels + dial).
// ═══════════════════════════════════════════════════════════════════════

(function () {
  // procedural 12px icons, drawn at (x, y) top-left
  function icon(key, x, y) {
    push();
    translate(x + 6, y + 6); // center
    noStroke();
    switch (key) {
      case 'gold':
        fill(150, 110, 40); ellipse(0.5, 0.5, 11, 11);
        fill(227, 179, 65); ellipse(0, 0, 11, 11);
        fill(255, 225, 140); ellipse(-1.5, -1.5, 4, 4);
        break;
      case 'seeds':
        fill(190, 150, 90);
        ellipse(-3, 2, 5, 6); ellipse(3, 1, 5, 6); ellipse(0, -3, 5, 6);
        break;
      case 'harvest':
        stroke(212, 180, 90); strokeWeight(1.6); line(0, 6, 0, -3);
        noStroke(); fill(228, 198, 110);
        ellipse(-2.5, -2, 4, 3); ellipse(2.5, -2, 4, 3);
        ellipse(-2.5, -5, 4, 3); ellipse(2.5, -5, 4, 3);
        break;
      case 'wood':
        push(); rotate(-0.5);
        fill(120, 84, 52); rect(-6, -2.5, 12, 5, 2);
        fill(168, 124, 80); ellipse(6, 0, 4.5, 5);
        fill(120, 84, 52); ellipse(6, 0, 2, 2.4);
        pop();
        break;
      case 'stone':
        fill(150, 148, 140);
        beginShape();
        vertex(-5, 4); vertex(-6, -1); vertex(-2, -5); vertex(4, -4);
        vertex(6, 1); vertex(3, 5);
        endShape(CLOSE);
        fill(190, 188, 180); triangle(-2, -5, 4, -4, 0, 0);
        break;
      case 'crystals':
        fill(68, 220, 170);
        beginShape();
        vertex(0, -6); vertex(4, -1); vertex(2, 5); vertex(-2, 5); vertex(-4, -1);
        endShape(CLOSE);
        fill(160, 255, 220, 200); triangle(0, -6, 4, -1, 0, 1);
        break;
      case 'fish':
        fill(110, 165, 210); ellipse(-1, 0, 10, 6);
        triangle(4, 0, 8, -3.5, 8, 3.5);
        fill(20, 35, 50); ellipse(-3.5, -0.8, 1.6, 1.6);
        break;
      default:
        fill(200, 185, 150); ellipse(0, 0, 8, 8);
    }
    pop();
  }

  const LABELS = {
    seeds: 'Seeds', harvest: 'Harvest', wood: 'Wood', stone: 'Stone',
    crystals: 'Crystals', gold: 'Gold', fish: 'Fish',
  };

  window.drawHudResource = function (x, y, label, val, col, key) {
    if (typeof trackHudResource === 'function') trackHudResource(key, val);

    // flash bookkeeping (same timing as original)
    let flash = (typeof hudFlash !== 'undefined') ? hudFlash[key] : null;
    let sc = 1, flashAlpha = 0, fDelta = 0;
    if (flash && flash.timer > 0) {
      const t = flash.timer / 15;
      const bounce = t > 0.5 ? sin(t * PI) : sin(t * PI * 2) * 0.5;
      sc = 1 + 0.18 * bounce;
      flashAlpha = t;
      fDelta = flash.delta || 0;
      flash.timer--;
    }

    // value column right edge — mirror drawHUD's panel math
    const uiSc = min(width / 1280, height / 800);
    const margin = max(12, floor(16 * uiSc));
    const panelW = max(195, floor(210 * uiSc));
    const rightX = margin + panelW - 14;
    const us = (typeof _uiScale !== 'undefined' && _uiScale) ? _uiScale : uiSc;

    push();
    icon(key, x, y - 1);

    // label — muted parchment small caps
    fill(196, 178, 142, 215);
    textSize(max(9, floor(9.5 * us)));
    textAlign(LEFT, TOP);
    text((LABELS[key] || label.trim()), x + 16, y);

    // value — bright, right-aligned; flash bumps size + warms color
    fill(col);
    if (flashAlpha > 0) {
      const pulse = 0.5 + 0.5 * sin(flashAlpha * PI);
      fill(lerpColor(color(col), color(255, 210, 80), 0.6 * flashAlpha * pulse));
    }
    textSize(max(10, floor(11 * us * sc)));
    textAlign(RIGHT, TOP);
    text(String(val), rightX, y - 1);

    if (flashAlpha > 0 && fDelta !== 0) {
      fill(fDelta > 0 ? 110 : 230, fDelta > 0 ? 220 : 90, 80, 220 * flashAlpha);
      textSize(max(8, floor(8.5 * us)));
      textAlign(LEFT, TOP);
      text((fDelta > 0 ? '+' : '') + fDelta, rightX + 4, y - 4 - floor(flashAlpha * 4));
    }
    textAlign(LEFT, TOP);
    pop();
  };

  // ─── gauges: rounded track, gradient fill, serif label ────────────────
  window.drawBarHUD = function (x, y, w, h, frac, colFull, colEmpty, label) {
    frac = constrain(frac || 0, 0, 1);
    noStroke();
    // track
    fill(18, 13, 9, 220); rect(x - 1, y - 1, w + 2, h + 2, h);
    fill(color(colEmpty)); rect(x, y, w, h, h);
    // fill + top highlight
    const cf = color(colFull);
    fill(cf); rect(x, y, w * frac, h, h);
    fill(255, 255, 255, 55); rect(x, y, w * frac, max(2, h * 0.35), h);
    // bronze hairline
    stroke(176, 141, 87, 150); strokeWeight(0.8);
    noFill(); rect(x - 1, y - 1, w + 2, h + 2, h);
    noStroke();
    // label
    if (label) {
      fill(232, 213, 174, 225);
      textFont('Cinzel');
      textSize(max(7, h - 2));
      textAlign(LEFT, CENTER);
      text(label, x + w + 8, y + h / 2 + 0.5);
      textAlign(LEFT, TOP);
    }
  };

  console.log('[HUD Redesign] ✓ resource rows + gauges restyled');
})();

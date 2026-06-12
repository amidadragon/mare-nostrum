// ═══════════════════════════════════════════════════════════════════════
// HOROLOGIUM UI — overhauls the legacy HUD's look. ZERO core file edits.
//
//   1. Replaces the tiny top-center clock (drawClockHUD) with the
//      Horologium: one bronze instrument showing the sun/moon on a 24h
//      ring, the live tide in a center glass, the wind as a needle, the
//      season as the rim color, and the weather as a glyph.
//   2. Restyles the two HUD panel primitives (drawHUDPanel /
//      drawParchmentPanel) every menu and overlay is built from —
//      brighter parchment, cleaner bronze, less mud.
//
// Requires patches/tide_calendar.js (TideMN / WindMN) — degrades
// gracefully to sun+season only if it's missing.
// ═══════════════════════════════════════════════════════════════════════

(function () {
  const SEASON_RIM = [
    [140, 195, 110], // Ver
    [230, 180, 80],  // Aestas
    [200, 120, 70],  // Autumnus
    [150, 180, 210], // Hiems
  ];

  // ─── 1. THE HOROLOGIUM (replaces drawClockHUD) ────────────────────────
  window.drawClockHUD = function () {
    if (photoMode || screenshotMode) return;
    if (typeof dialogState !== 'undefined' && dialogState && dialogState.active) return;

    const R = 38;
    const cx = width / 2, cy = R + 16;
    const h = state.time / 60;

    // fade when the player walks behind it (kept from the original)
    const psx = w2sX(state.player.x), psy = w2sY(state.player.y);
    const fade = (psx > width * 0.38 && psx < width * 0.62 && psy < height * 0.2) ? 0.25 : 1.0;
    drawingContext.globalAlpha = fade;

    push();
    translate(cx, cy);
    noStroke();

    // shadow + parchment face
    fill(0, 0, 0, 80); ellipse(2, 3, R * 2 + 10, R * 2 + 10);
    fill(232, 213, 174, 242); ellipse(0, 0, R * 2 + 8, R * 2 + 8);

    // season rim
    const si = (typeof getSeason === 'function') ? getSeason() : 0;
    const sc = SEASON_RIM[si] || SEASON_RIM[0];
    noFill(); stroke(sc[0], sc[1], sc[2]); strokeWeight(4);
    ellipse(0, 0, R * 2 + 3, R * 2 + 3);

    // hour angle helper: noon at top, midnight at bottom
    const hourA = (hr) => -HALF_PI + ((hr - 12) / 24) * TWO_PI;

    // night arc + dawn/dusk gold hints
    stroke(46, 60, 96, 110); strokeWeight(5);
    arc(0, 0, R * 2 - 10, R * 2 - 10, hourA(21), hourA(29));
    stroke(227, 179, 65, 150); strokeWeight(5);
    arc(0, 0, R * 2 - 10, R * 2 - 10, hourA(5), hourA(8));
    arc(0, 0, R * 2 - 10, R * 2 - 10, hourA(17), hourA(20));

    // hour ticks
    stroke(120, 95, 60, 150); strokeWeight(1);
    for (let i = 0; i < 24; i += 3) {
      const a = hourA(i);
      line(Math.cos(a) * (R - 9), Math.sin(a) * (R - 9),
           Math.cos(a) * (R - 5), Math.sin(a) * (R - 5));
    }

    // sun / moon marker
    const ma = hourA(h);
    const mx = Math.cos(ma) * (R - 7), my = Math.sin(ma) * (R - 7);
    noStroke();
    const isDay = h >= 5 && h < 21;
    if (isDay) {
      fill(255, 230, 120, 90); ellipse(mx, my, 15, 15);
      fill(255, 200, 60); ellipse(mx, my, 9, 9);
    } else {
      fill(225, 228, 240); ellipse(mx, my, 8, 8);
      fill(232, 213, 174, 242); ellipse(mx + 2.5, my - 1.5, 7, 7);
    }

    // tide glass (center) — degrades to plain disc without TideMN
    const gR = R * 0.45;
    fill(214, 192, 150); ellipse(0, 0, gR * 2 + 6, gR * 2 + 6);
    fill(244, 236, 218); ellipse(0, 0, gR * 2, gR * 2);
    if (typeof TideMN !== 'undefined') {
      const lvl = TideMN.level();
      const top = -lvl * gR * 0.7;
      fill(86, 148, 196, 215);
      beginShape();
      const N = 20;
      for (let i = 0; i <= N; i++) {
        const x = -gR + (i / N) * gR * 2;
        const edge = Math.sqrt(Math.max(0, gR * gR - x * x));
        const yT = top + Math.sin(frameCount * 0.06 + i * 0.8) * 1.2;
        vertex(x, Math.max(yT, -edge));
      }
      for (let i = N; i >= 0; i--) {
        const x = -gR + (i / N) * gR * 2;
        vertex(x, Math.sqrt(Math.max(0, gR * gR - x * x)));
      }
      endShape(CLOSE);
      if (TideMN.isSlack()) { // prime fishing — make it glow
        noFill(); stroke(120, 200, 230, 120 + Math.sin(frameCount * 0.2) * 70);
        strokeWeight(2); ellipse(0, 0, gR * 2 + 2, gR * 2 + 2);
      }
      noStroke(); fill(60, 90, 120);
      const ay = TideMN.isRising() ? -1 : 1;
      triangle(gR - 3, ay * 5, gR + 3, ay * 5, gR, -ay * 3);
    }

    // wind needle — degrades to none without WindMN
    if (typeof WindMN !== 'undefined') {
      const wa = WindMN.angle(), ws = WindMN.strength();
      const nL = 8 + ws * (gR + 10);
      push();
      rotate(wa);
      stroke(108, 78, 44); strokeWeight(2.8);
      line(-nL * 0.25, 0, nL, 0);
      noStroke(); fill(108, 78, 44);
      triangle(nL, 0, nL - 6, -3.5, nL - 6, 3.5);
      pop();
    }
    noStroke();
    fill(176, 141, 87); ellipse(0, 0, 10, 10);
    fill(232, 213, 174); ellipse(-1.5, -1.5, 3, 3);

    // weather glyph under the dial center
    const wt = (state.weather && state.weather.type) || 'clear';
    if (wt !== 'clear') {
      fill(60, 70, 90, 210);
      if (wt === 'rain' || wt === 'storm') {
        ellipse(0, R - 11, 14, 7);
        for (let i = -1; i <= 1; i++) { stroke(86, 130, 180); strokeWeight(1.4); line(i * 4, R - 7, i * 4 - 2, R - 2); }
        if (wt === 'storm') { noStroke(); fill(255, 210, 60); triangle(2, R - 9, -2, R - 4, 3, R - 3); }
      } else if (wt === 'fog') {
        stroke(200, 200, 210, 180); strokeWeight(1.6);
        line(-7, R - 11, 7, R - 11); line(-5, R - 7, 8, R - 7); line(-8, R - 3, 5, R - 3);
      } else if (wt === 'heatwave') {
        noStroke(); fill(235, 120, 60); ellipse(0, R - 7, 8, 8);
        stroke(235, 120, 60); strokeWeight(1);
        for (let i = 0; i < 8; i++) { const a2 = (i / 8) * TWO_PI; line(Math.cos(a2) * 6, R - 7 + Math.sin(a2) * 6, Math.cos(a2) * 9, R - 7 + Math.sin(a2) * 9); }
      }
      noStroke();
    }

    pop();

    // caption: period + season + wind, in the game's serif
    let period;
    if (h >= 5 && h < 7) period = 'Dawn';
    else if (h >= 7 && h < 11) period = 'Morning';
    else if (h >= 11 && h < 13) period = 'Noon';
    else if (h >= 13 && h < 17) period = 'Afternoon';
    else if (h >= 17 && h < 21) period = 'Dusk';
    else period = 'Night';
    textAlign(CENTER, TOP);
    textFont('Cinzel');
    textSize(9);
    fill(43, 29, 18, 230 * fade);
    let cap = period;
    if (typeof WindMN !== 'undefined' && WindMN.strength() > 0.45) cap += ' · wind ' + WindMN.label().toLowerCase();
    if (typeof TideMN !== 'undefined' && TideMN.isSlack()) cap += ' · slack water';
    text(cap, cx, cy + R + 8);
    textAlign(LEFT, TOP);
    drawingContext.globalAlpha = 1;
  };

  // ─── 2. PANEL PRIMITIVES — elevated dark theme ────────────────────────
  // NOTE: all legacy HUD text is light and expects dark panels, so these
  // stay dark — but richer: deep ink-brown, soft top-light, crisp bronze
  // edge, no dither mud. Same signatures; everything built on them updates.
  window.drawHUDPanel = function (x, y, w, h) {
    noStroke();
    fill(0, 0, 0, 70); rect(x + 2, y + 3, w, h, 7);              // shadow
    fill(34, 26, 18, 238); rect(x, y, w, h, 7);                  // deep ink-brown
    fill(232, 213, 174, 14); rect(x, y, w, Math.min(h * 0.45, 22), 7, 7, 0, 0); // top light
    const ac = (typeof getFactionData === 'function') ? getFactionData().accentColor : [176, 141, 87];
    stroke(ac[0], ac[1], ac[2], 190); strokeWeight(1.2);
    noFill(); rect(x, y, w, h, 7);
    stroke(232, 213, 174, 28); strokeWeight(0.5);
    rect(x + 2.5, y + 2.5, w - 5, h - 5, 5);                     // inner hairline
    noStroke();
  };

  window.drawParchmentPanel = function (x, y, w, h) {
    noStroke();
    fill(0, 0, 0, 100); rect(x + 3, y + 4, w, h, 9);             // shadow
    fill(22, 16, 11, 250); rect(x, y, w, h, 8);                  // ink backdrop
    fill(40, 31, 21, 248); rect(x + 3, y + 3, w - 6, h - 6, 6);  // warm body
    fill(232, 213, 174, 12); rect(x + 3, y + 3, w - 6, Math.min((h - 6) * 0.4, 30), 6, 6, 0, 0);
    const ac = (typeof getFactionData === 'function') ? getFactionData().accentColor : [176, 141, 87];
    stroke(ac[0], ac[1], ac[2], 230); strokeWeight(1.6);
    noFill(); rect(x + 1.5, y + 1.5, w - 3, h - 3, 7);
    stroke(232, 213, 174, 36); strokeWeight(0.5);
    rect(x + 6, y + 6, w - 12, h - 12, 4);
    // corner diamonds, bronze
    noStroke(); fill(ac[0], ac[1], ac[2], 235);
    const cs = 5;
    [[x + 7, y + 7], [x + w - 7, y + 7], [x + 7, y + h - 7], [x + w - 7, y + h - 7]].forEach(([dx, dy]) => {
      push(); translate(dx, dy); rotate(PI / 4); rectMode(CENTER); rect(0, 0, cs, cs); rectMode(CORNER); pop();
    });
  };

  console.log('[Horologium UI] ✓ HUD overhaul active');
})();

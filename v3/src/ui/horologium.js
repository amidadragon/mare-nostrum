// The Horologium — one bronze instrument that tells the whole day:
//   · outer rim: season color + day ticks
//   · 24h ring: a sun (or moon) marker rides it; night arc shaded
//   · center gauge: the tide fills and empties a glass
//   · needle: live wind direction + strength
// Replaces four HUD widgets. Drawn in screen space, bottom-right.

const Horologium = {
  R: 74,

  draw() {
    const cx = width - this.R - 26;
    const cy = height - this.R - 26;
    const R = this.R;

    push();
    translate(cx, cy);

    // drop shadow + parchment face
    noStroke();
    fill(0, 0, 0, 70); ellipse(3, 5, R * 2 + 14, R * 2 + 14);
    fill(232, 213, 174); ellipse(0, 0, R * 2 + 10, R * 2 + 10);

    // season rim
    const sc = Clock.seasonColor();
    noFill(); stroke(sc[0], sc[1], sc[2]); strokeWeight(5);
    ellipse(0, 0, R * 2 + 4, R * 2 + 4);
    // day-of-season ticks on the rim
    stroke(120, 95, 60);
    strokeWeight(2);
    for (let i = 0; i < Clock.SEASON_DAYS; i++) {
      const a = -HALF_PI + (i / Clock.SEASON_DAYS) * TWO_PI;
      const done = i < Clock.dayOfSeason();
      stroke(done ? 120 : 200, done ? 95 : 185, done ? 60 : 150);
      line(Math.cos(a) * (R + 1), Math.sin(a) * (R + 1),
           Math.cos(a) * (R + 6), Math.sin(a) * (R + 6));
    }

    // night arc (21:00 -> 05:00), midnight at top? No — noon at top:
    // hour angle: noon at top, midnight at bottom.
    const hourA = (h) => -HALF_PI + ((h - 12) / 24) * TWO_PI;
    noFill(); stroke(46, 60, 96, 110); strokeWeight(7);
    arc(0, 0, R * 2 - 14, R * 2 - 14, hourA(21), hourA(29));
    // dawn/dusk gold hints
    stroke(227, 179, 65, 140); strokeWeight(7);
    arc(0, 0, R * 2 - 14, R * 2 - 14, hourA(5), hourA(8));
    arc(0, 0, R * 2 - 14, R * 2 - 14, hourA(17), hourA(20));

    // 24h ring ticks
    stroke(120, 95, 60, 160); strokeWeight(1.5);
    for (let h = 0; h < 24; h += 3) {
      const a = hourA(h);
      line(Math.cos(a) * (R - 13), Math.sin(a) * (R - 13),
           Math.cos(a) * (R - 7), Math.sin(a) * (R - 7));
    }

    // sun / moon marker
    const a = hourA(Clock.hour());
    const mx = Math.cos(a) * (R - 10), my = Math.sin(a) * (R - 10);
    noStroke();
    if (Clock.isNight()) {
      fill(225, 228, 240); ellipse(mx, my, 11, 11);
      fill(232, 213, 174); ellipse(mx + 3, my - 2, 9, 9); // crescent bite
    } else {
      fill(255, 200, 60); ellipse(mx, my, 12, 12);
      fill(255, 230, 120, 90); ellipse(mx, my, 20, 20);
    }

    // ---- tide glass (center) ----
    const gR = R * 0.46;
    noStroke();
    fill(214, 192, 150); ellipse(0, 0, gR * 2 + 8, gR * 2 + 8);
    fill(244, 236, 218); ellipse(0, 0, gR * 2, gR * 2);
    // water fill: level -1..1 -> from low to high inside the glass
    const lvl = Tide.level();
    const waterTop = -lvl * gR * 0.72;   // px from center, up = negative
    fill(86, 148, 196, 220);
    // clip to circle: approximate with arc-rect intersection drawn as shape
    beginShape();
    const steps = 26;
    for (let i = 0; i <= steps; i++) {
      const x = -gR + (i / steps) * gR * 2;
      const yEdge = Math.sqrt(Math.max(0, gR * gR - x * x));
      const yTop = waterTop + Math.sin(frameCount * 0.06 + i * 0.7) * 1.6;
      vertex(x, Math.max(yTop, -yEdge));
    }
    for (let i = steps; i >= 0; i--) {
      const x = -gR + (i / steps) * gR * 2;
      const yEdge = Math.sqrt(Math.max(0, gR * gR - x * x));
      vertex(x, yEdge);
    }
    endShape(CLOSE);
    // slack-water glint: ring pulses at the tide's turn (best fishing)
    if (Tide.isSlack()) {
      noFill(); stroke(120, 200, 230, 120 + Math.sin(frameCount * 0.2) * 70);
      strokeWeight(2); ellipse(0, 0, gR * 2 + 3, gR * 2 + 3);
    }
    // tide arrow
    noStroke(); fill(60, 90, 120);
    const ay = Tide.isRising() ? -1 : 1;
    triangle(gR - 4, ay * 6, gR + 4, ay * 6, gR, -ay * 4);

    // ---- wind needle over the glass ----
    const wv = Wind.vec();
    const nL = 10 + wv.s * (gR + 14);
    push();
    rotate(wv.a);
    stroke(108, 78, 44); strokeWeight(3.5);
    line(-nL * 0.25, 0, nL, 0);
    // arrowhead + tail feathers
    noStroke(); fill(108, 78, 44);
    triangle(nL, 0, nL - 8, -4.5, nL - 8, 4.5);
    stroke(108, 78, 44); strokeWeight(2);
    line(-nL * 0.25, 0, -nL * 0.25 - 6, -5);
    line(-nL * 0.25, 0, -nL * 0.25 - 6, 5);
    pop();
    // hub
    noStroke();
    fill(176, 141, 87); ellipse(0, 0, 13, 13);
    fill(232, 213, 174); ellipse(-2, -2, 4, 4);

    // caption
    fill(96, 72, 44);
    textFont('Cinzel'); textAlign(CENTER, TOP); textSize(10);
    text(Clock.hhmm() + ' · ' + Wind.label(), 0, R + 12);

    pop();
  },
};

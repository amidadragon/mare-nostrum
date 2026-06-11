// HUD — the quiet parts of the new UI: resource strip (top-left), seed hotbar
// (bottom-left), one contextual prompt pill (bottom-center), toasts, and the
// new-day banner. Palette: parchment/bronze/ink. Font: Cinzel.

const HUD = {
  _toasts: [],         // { msg, t }
  _banner: null,       // { text, t }
  _lastDay: 0,

  toast(msg) { this._toasts.push({ msg, t: 0 }); },

  init() {
    Clock.onNewDay.push((d) => {
      this._banner = { text: 'DIES ' + Clock.romanDay() + ' · ' + Clock.seasonName(), t: 0 };
    });
  },

  draw() {
    this._resources();
    this._seedbar();
    this._prompt();
    this._toastsDraw();
    this._bannerDraw();
    this._stamp();
    Horologium.draw();
  },

  // ---------- pieces ----------

  _panel(x, y, w, h) {
    noStroke();
    fill(20, 14, 8, 60); rect(x + 2, y + 3, w, h, 9);
    fill(232, 213, 174, 235); rect(x, y, w, h, 9);
    noFill(); stroke(176, 141, 87); strokeWeight(1.5);
    rect(x, y, w, h, 9);
    noStroke();
  },

  _icon(kind, x, y) {
    push();
    translate(x, y);
    noStroke();
    if (kind === 'denarii') {
      fill(227, 179, 65); ellipse(0, 0, 13, 13);
      fill(190, 140, 40); textAlign(CENTER, CENTER); textSize(8); textFont('Cinzel');
      text('X', 0, 0.5);
    } else if (kind === 'wheat') {
      stroke(212, 180, 90); strokeWeight(2); line(0, 6, 0, -5);
      noStroke(); fill(228, 198, 110);
      for (let i = 0; i < 3; i++) { ellipse(-3, -1 - i * 3, 4, 3); ellipse(3, -1 - i * 3, 4, 3); }
    } else if (kind === 'poppy') {
      stroke(110, 150, 80); strokeWeight(2); line(0, 6, 0, -2);
      noStroke(); fill(205, 70, 60); ellipse(0, -4, 9, 9);
      fill(60, 40, 40); ellipse(0, -4, 3, 3);
    } else if (kind === 'grapes') {
      fill(130, 80, 150);
      ellipse(-2, 0, 6, 6); ellipse(2, 0, 6, 6); ellipse(0, 4, 6, 6); ellipse(0, -3, 6, 6);
    } else if (kind === 'goldbloom') {
      fill(255, 210, 80); ellipse(0, 0, 11, 11);
      fill(255, 240, 160); ellipse(0, 0, 5, 5);
    } else if (kind === 'clam') {
      fill(235, 226, 205); ellipse(0, 1, 12, 9);
      stroke(180, 160, 130); strokeWeight(1); line(-4, 1, 4, 1);
    } else if (kind === 'urchin') {
      fill(70, 50, 80); ellipse(0, 0, 9, 9);
      stroke(70, 50, 80); strokeWeight(1);
      for (let a = 0; a < TWO_PI; a += TWO_PI / 6)
        line(0, 0, Math.cos(a) * 7, Math.sin(a) * 7);
    } else if (kind === 'fish' || kind === 'tuna') {
      fill(kind === 'tuna' ? color(90, 110, 160) : color(140, 170, 190));
      ellipse(-1, 0, 12, 7);
      triangle(5, 0, 9, -4, 9, 4);
      fill(30, 40, 50); ellipse(-4, -1, 1.8, 1.8);
    } else if (kind === 'salt') {
      fill(248, 248, 242);
      triangle(-5, 4, 5, 4, 0, -5);
      fill(255); triangle(-2, 4, 3, 4, 0, -1);
    } else if (kind === 'garum') {
      fill(176, 110, 70); ellipse(0, 1, 9, 12);
      rect(-2.5, -8, 5, 4, 1);
    } else if (kind === 'laurel') {
      fill(110, 160, 90);
      ellipse(-3, 2, 8, 4); ellipse(3, -2, 8, 4);
      stroke(80, 120, 65); strokeWeight(1); line(-5, 5, 5, -5);
    }
    pop();
  },

  _resources() {
    const show = ['denarii', ...SELLABLE.filter((k) => Inventory.count(k) > 0)];
    const rowH = 24, w = 116;
    const h = show.length * rowH + 12;
    this._panel(14, 14, w, h);
    textFont('Cinzel'); textSize(13);
    for (let i = 0; i < show.length; i++) {
      const k = show[i];
      const y = 14 + 6 + i * rowH + rowH / 2;
      const pulse = Inventory.pulseT(k) / 22;
      this._icon(k, 14 + 16, y);
      fill(43, 29, 18);
      textAlign(RIGHT, CENTER);
      push();
      if (pulse > 0) {
        textSize(13 + pulse * 4);
        fill(lerpColor(color(43, 29, 18), color(201, 111, 74), pulse));
      }
      text(Inventory.count(k), 14 + w - 12, y);
      pop();
    }
  },

  _seedbar() {
    const seeds = Object.entries(CROPS).filter(([id, c]) =>
      c.seedKey && (!c.hybridOnly || (Inventory.seeds[id] || 0) > 0));
    const slotW = 64, h = 54;
    const w = seeds.length * slotW + 10;
    const x = 14, y = height - h - 14;
    this._panel(x, y, w, h);
    textFont('Cinzel');
    for (let i = 0; i < seeds.length; i++) {
      const [id, c] = seeds[i];
      const sx = x + 8 + i * slotW, sy = y + 6;
      const sel = Inventory.selectedSeed === id;
      if (sel) {
        noStroke(); fill(227, 179, 65, 70); rect(sx - 2, sy - 1, slotW - 6, h - 10, 7);
        noFill(); stroke(176, 141, 87); strokeWeight(2); rect(sx - 2, sy - 1, slotW - 6, h - 10, 7);
        noStroke();
      }
      this._icon(c.yieldItem, sx + 14, sy + 16);
      fill(43, 29, 18); textAlign(LEFT, CENTER); textSize(11);
      text('×' + (Inventory.seeds[id] || 0), sx + 26, sy + 16);
      fill(120, 95, 60); textSize(9); textAlign(LEFT, BOTTOM);
      text(c.seedKey + ' · ' + c.name + (c.hybridOnly ? ' ✦' : ''), sx + 2, sy + h - 12);
    }
  },

  _prompt() {
    const p = Interact.prompt;
    if (!p) return;
    textFont('Cinzel'); textSize(14);
    const label = p.label;
    const keyW = p.key ? 30 : 0;
    const tw = textWidth(label) + keyW + 30;
    const x = width / 2 - tw / 2, y = height - 64, h = 32;
    this._panel(x, y, tw, h);
    if (p.key) {
      noStroke(); fill(43, 29, 18); rect(x + 8, y + 6, 20, 20, 5);
      fill(232, 213, 174); textAlign(CENTER, CENTER); textSize(12);
      text(p.key, x + 18, y + 16.5);
    }
    fill(43, 29, 18); textAlign(LEFT, CENTER); textSize(14);
    text(label, x + keyW + 14, y + h / 2 + 0.5);
  },

  _toastsDraw() {
    const keep = [];
    let y = height - 92;
    for (const t of this._toasts) {
      t.t++;
      if (t.t < 240) keep.push(t);
      const a = t.t < 20 ? t.t / 20 : t.t > 200 ? (240 - t.t) / 40 : 1;
      textFont('Cinzel'); textSize(13);
      const tw = textWidth(t.msg) + 24;
      push();
      noStroke();
      fill(20, 14, 8, 140 * a);
      rect(14, y - 13, tw, 26, 13);
      fill(240, 228, 200, 255 * a);
      textAlign(LEFT, CENTER);
      text(t.msg, 26, y + 0.5);
      pop();
      y -= 32;
    }
    this._toasts = keep.slice(-5);
  },

  _bannerDraw() {
    const b = this._banner;
    if (!b) return;
    b.t++;
    if (b.t > 210) { this._banner = null; return; }
    const a = b.t < 30 ? b.t / 30 : b.t > 170 ? (210 - b.t) / 40 : 1;
    push();
    textFont('Cinzel');
    textAlign(CENTER, CENTER);
    fill(20, 14, 8, 90 * a);
    textSize(30);
    text(b.text, width / 2 + 1, height * 0.24 + 2);
    fill(232, 213, 174, 255 * a);
    text(b.text, width / 2, height * 0.24);
    // rules
    stroke(227, 179, 65, 200 * a); strokeWeight(1.5);
    const lw = textWidth(b.text) * 0.62;
    line(width / 2 - lw, height * 0.24 + 26, width / 2 + lw, height * 0.24 + 26);
    pop();
  },

  _stamp() {
    push();
    textFont('Cinzel');
    fill(232, 213, 174, 120);
    textSize(11);
    textAlign(RIGHT, TOP);
    text((window.BUILD || 'v3') + ' · ' + Math.round(frameRate()) + ' fps', width - 14, 10);
    pop();
  },
};

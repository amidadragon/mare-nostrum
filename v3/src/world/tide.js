// Tide — the sea breathes twice a day. Owns the waterline and the tidal flats,
// including low-tide forageables. Reads Clock; nothing here writes other domains.

const Tide = {
  CYCLES_PER_DAY: 2,
  PHI: 1.0, // phase offset: game starts (06:00) near low water — flats visible early

  // -1 (lowest) .. +1 (highest)
  level() {
    return Math.sin(TWO_PI * this.CYCLES_PER_DAY * Clock.t + this.PHI);
  },

  // d(level)/dt sign & slack detection (slack = the turn, best fishing)
  isSlack() {
    return Math.abs(Math.cos(TWO_PI * this.CYCLES_PER_DAY * Clock.t + this.PHI)) < 0.22;
  },
  isRising() {
    return Math.cos(TWO_PI * this.CYCLES_PER_DAY * Clock.t + this.PHI) > 0;
  },

  // Waterline = beach radius offset in px beyond the grass ellipse.
  // High tide -> +18 (beach mostly drowned). Low tide -> +100 (flats exposed).
  waterlineOffset() {
    return 59 - 41 * this.level();
  },

  // Is a world point under water right now?
  isSubmerged(x, y) {
    const off = this.waterlineOffset();
    const dx = (x - Island.CX) / (Island.RX + off);
    const dy = (y - Island.CY) / (Island.RY + off);
    return dx * dx + dy * dy > 1;
  },

  // Normalized radius helper vs an offset ellipse (1.0 == that shoreline)
  nr(x, y, off) {
    const dx = (x - Island.CX) / (Island.RX + off);
    const dy = (y - Island.CY) / (Island.RY + off);
    return Math.sqrt(dx * dx + dy * dy);
  },

  sandbarOpen() { return this.level() < -0.45; },

  // ---- Forage: clams & urchins appear on the flats each low tide ----
  items: [],
  _seeded: false,
  _lastLowSpawn: -1,

  update() {
    // (re)seed once per low-tide trough
    const troughId = Math.floor(Clock.t * this.CYCLES_PER_DAY + (this.PHI / TWO_PI) + 0.25);
    if (this.level() < -0.55 && troughId !== this._lastLowSpawn) {
      this._lastLowSpawn = troughId;
      this._spawn();
    }
    // submerged items wash away
    this.items = this.items.filter((it) => !this.isSubmerged(it.x, it.y));
  },

  _spawn() {
    const n = 6 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TWO_PI;
      const off = 55 + Math.random() * 38; // in the flat band
      this.items.push({
        x: Island.CX + Math.cos(a) * (Island.RX + off),
        y: Island.CY + Math.sin(a) * (Island.RY + off),
        kind: Math.random() < 0.7 ? 'clam' : 'urchin',
      });
    }
  },

  collectNear(x, y, rad) {
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      if (Math.hypot(it.x - x, it.y - y) < rad) {
        this.items.splice(i, 1);
        return it;
      }
    }
    return null;
  },

  nearestItem(x, y, rad) {
    let best = null, bd = rad;
    for (const it of this.items) {
      const d = Math.hypot(it.x - x, it.y - y);
      if (d < bd) { bd = d; best = it; }
    }
    return best;
  },

  draw() {
    // exposed wet-sand band + foam line + forage items (world space)
    const off = this.waterlineOffset();
    push();
    noFill();
    // wet sand sheen between waterline and high-water mark
    noStroke();
    fill(196, 176, 138, 120);
    Island.blobRing(18, off, 0.045, 1.3);
    // foam edge
    stroke(255, 255, 255, 90);
    strokeWeight(2.5);
    const breathe = Math.sin(frameCount * 0.04) * 2;
    Island.blobOutline(off + breathe, 0.045, 1.3);
    // forage
    noStroke();
    for (const it of this.items) {
      if (it.kind === 'clam') {
        fill(235, 226, 205); ellipse(it.x, it.y, 10, 7);
        fill(180, 160, 130); arc(it.x, it.y, 10, 7, PI * 0.15, PI * 0.85);
      } else {
        fill(70, 50, 80); ellipse(it.x, it.y, 9, 9);
        stroke(70, 50, 80); strokeWeight(1);
        for (let a = 0; a < TWO_PI; a += TWO_PI / 8)
          line(it.x, it.y, it.x + Math.cos(a) * 7, it.y + Math.sin(a) * 7);
        noStroke();
      }
    }
    pop();
  },
};

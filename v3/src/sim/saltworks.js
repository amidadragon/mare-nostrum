// Saltworks — two salt pans on the tidal flat + the garum vat.
// The pan's life: DRY -> (high tide floods it) BRINE -> (sun + exposure
// evaporate it) SALT -> collect before the next flood or it dissolves back.
// Garum: 2 fish + 1 salt ferment for ~0.8 day in the vat -> 1 garum.

const Saltworks = {
  pans: [],
  vat: { x: 700, y: 330, state: 'empty', readyAt: 0 }, // empty|ferment|ready

  init() {
    // pans live where high tide reaches but low tide exposes (offset ~52-60)
    this.pans = [
      this._pan(Island.CX - 180, Island.CY + Island.RY + 52),
      this._pan(Island.CX + 40,  Island.CY + Island.RY + 58),
    ];
  },

  _pan(x, y) { return { x, y, state: 'dry', evap: 0 }; }, // dry|brine|salt

  update() {
    for (const p of this.pans) {
      const wet = Tide.isSubmerged(p.x, p.y);
      if (wet) {
        if (p.state === 'dry') { p.state = 'brine'; p.evap = 0; }
        else if (p.state === 'salt') {
          p.state = 'brine'; p.evap = 0;
          HUD.toast('The tide reclaimed a salt pan');
        }
      } else if (p.state === 'brine') {
        const dt = Math.min(deltaTime, 100) / 1000 / Clock.DAY_SECONDS; // days
        p.evap += dt * Clock.sunlight() * 16.0; // one sunny low-tide stretch dries it
        if (p.evap >= 1) p.state = 'salt';
      }
    }
    const v = this.vat;
    if (v.state === 'ferment' && Clock.t >= v.readyAt) v.state = 'ready';
  },

  collectPan(p) {
    if (p.state !== 'salt') return false;
    Inventory.add('salt', 2);
    p.state = 'dry';
    p.evap = 0;
    Fx.sparkle(p.x, p.y - 8);
    return true;
  },

  vatAction() {
    const v = this.vat;
    if (v.state === 'ready') {
      Inventory.add('garum', 1);
      v.state = 'empty';
      Fx.sparkle(v.x, v.y - 16);
      return 'collected';
    }
    if (v.state === 'empty') {
      if (Inventory.count('fish') + Inventory.count('tuna') >= 2 && Inventory.count('salt') >= 1) {
        let need = 2;
        while (need > 0 && Inventory.spend('fish', 1)) need--;
        while (need > 0 && Inventory.spend('tuna', 1)) need--;
        Inventory.spend('salt', 1);
        v.state = 'ferment';
        v.readyAt = Clock.t + 0.8;
        return 'started';
      }
      return 'missing';
    }
    return 'fermenting';
  },

  nearestPan(x, y, rad) {
    let best = null, bd = rad;
    for (const p of this.pans) {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  },

  nearVat(x, y, rad) {
    return Math.hypot(this.vat.x - x, this.vat.y - y) < rad;
  },

  draw() {
    for (const p of this.pans) this._drawPan(p);
    this._drawVat();
  },

  _drawPan(p) {
    push();
    translate(p.x, p.y);
    // stone-rimmed shallow basin
    noStroke();
    fill(0, 0, 0, 30); ellipse(2, 4, 64, 38);
    fill(168, 152, 128); ellipse(0, 0, 64, 38);
    if (p.state === 'brine') {
      fill(120, 175, 200, 210); ellipse(0, 0, 54, 30);
      // evaporation: brine shrinks + whitens at the rim
      const e = constrain(p.evap, 0, 1);
      if (e > 0.25) {
        fill(244, 244, 238, 160 * e);
        ellipse(0, 0, 54, 30);
        fill(120, 175, 200, 220 * (1 - e));
        ellipse(0, 0, 54 * (1 - e * 0.5), 30 * (1 - e * 0.5));
      }
    } else if (p.state === 'salt') {
      fill(248, 248, 242); ellipse(0, 0, 54, 30);
      fill(255); ellipse(-8, -3, 10, 5); ellipse(9, 4, 8, 4); ellipse(2, 1, 6, 3);
    } else {
      fill(150, 134, 110); ellipse(0, 0, 54, 30);
    }
    pop();
  },

  _drawVat() {
    const v = this.vat;
    push();
    translate(v.x, v.y);
    noStroke();
    fill(0, 0, 0, 35); ellipse(2, 14, 44, 14);
    // amphora body
    fill(176, 110, 70);
    ellipse(0, 0, 34, 40);
    rect(-8, -28, 16, 14, 4);
    fill(150, 90, 56);
    ellipse(0, 6, 26, 18);
    // state cue
    if (v.state === 'ferment') {
      const left = Math.max(0, v.readyAt - Clock.t);
      fill(230, 210, 160, 130 + Math.sin(frameCount * 0.1) * 50);
      ellipse(0, -32 - Math.sin(frameCount * 0.07) * 2, 5, 5); // a slow bubble
      noFill(); stroke(232, 179, 65, 200); strokeWeight(3);
      arc(0, 0, 48, 48, -HALF_PI, -HALF_PI + TWO_PI * (1 - left / 0.8));
    } else if (v.state === 'ready') {
      noFill(); stroke(232, 179, 65, 150 + Math.sin(frameCount * 0.15) * 80);
      strokeWeight(3); ellipse(0, 0, 50, 50);
    }
    pop();
  },
};

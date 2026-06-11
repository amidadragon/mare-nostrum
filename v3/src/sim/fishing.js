// Fishing — cast from the shore; the SEA decides when to bite.
// Bite odds spike at slack water (the tide's turn) and at dawn/dusk.
// Owns its own little state machine. Never moves the player.

const Fishing = {
  state: 'idle',       // idle | waiting | bite | reeling
  bobX: 0, bobY: 0,
  _biteAt: 0,          // ms timestamp when the bite will happen
  _biteUntil: 0,       // ms window end
  _msgT: 0,

  canFish(px, py) {
    // near the live waterline (within ~46px outside the walkable rim) or on dock
    if (Island.isOnDock(px, py)) return true;
    const off = Tide.waterlineOffset();
    const nr = Tide.nr(px, py, off);
    return nr > 0.86 && nr <= 1.0;
  },

  cast(px, py) {
    if (this.state !== 'idle') return;
    // bobber lands seaward: away from island center (or east off the dock)
    let dx = px - Island.CX, dy = py - Island.CY;
    if (Island.isOnDock(px, py)) { dx = 1; dy = 0.15; }
    const L = Math.hypot(dx, dy) || 1;
    this.bobX = px + (dx / L) * 72;
    this.bobY = py + (dy / L) * 72 - 4;
    this.state = 'waiting';

    // bite delay: 2.5–7s, sharply better at slack tide & dawn/dusk
    let mean = 5.0;
    if (Tide.isSlack()) mean *= 0.45;
    if (Clock.isDawn() || Clock.isDusk()) mean *= 0.7;
    const delay = (1.2 + Math.random() * mean) * 1000;
    this._biteAt = millis() + delay;
    Fx.splash(this.bobX, this.bobY, 0.6);
  },

  reel() {
    if (this.state === 'waiting') {           // too early — spooked it
      this.state = 'idle';
      HUD.toast('Too soon — it slipped away');
      return;
    }
    if (this.state !== 'bite') return;
    // CATCH — weighted roll; slack water doubles the rare's chance
    let pool = [];
    for (const f of FISH) {
      let w = f.weight;
      if (f.id === 'tuna' && (Tide.isSlack() || Clock.isDawn())) w *= 2.5;
      pool.push([f, w]);
    }
    const total = pool.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    let caught = pool[0][0];
    for (const [f, w] of pool) { r -= w; if (r <= 0) { caught = f; break; } }
    Inventory.add(caught.item, 1);
    HUD.toast('Caught: ' + caught.name + (caught.id === 'tuna' ? ' !' : ''));
    Fx.splash(this.bobX, this.bobY, 1.4);
    Fx.sparkle(this.bobX, this.bobY - 10);
    this.state = 'idle';
  },

  update() {
    if (this.state === 'waiting' && millis() >= this._biteAt) {
      this.state = 'bite';
      this._biteUntil = millis() + 900;       // 0.9s reaction window
      Fx.splash(this.bobX, this.bobY, 1.0);
    }
    if (this.state === 'bite' && millis() > this._biteUntil) {
      this.state = 'idle';
      HUD.toast('It got away…');
    }
  },

  cancel() { this.state = 'idle'; },

  draw() {
    if (this.state === 'idle') return;
    push();
    // line from player to bobber
    stroke(240, 235, 220, 150); strokeWeight(1);
    line(Player.x + 8, Player.y - 14, this.bobX, this.bobY - 4);
    // bobber
    const dip = this.state === 'bite' ? Math.sin(frameCount * 0.6) * 3 + 3 : Math.sin(frameCount * 0.08) * 1.5;
    noStroke();
    fill(200, 60, 50); ellipse(this.bobX, this.bobY + dip, 9, 9);
    fill(240, 235, 220); arc(this.bobX, this.bobY + dip, 9, 9, PI, TWO_PI);
    if (this.state === 'bite') {
      textAlign(CENTER, BOTTOM); textSize(22); textFont('Cinzel');
      fill(255, 230, 120);
      text('!', this.bobX, this.bobY - 10);
    }
    pop();
  },
};

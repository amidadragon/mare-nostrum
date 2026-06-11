// Farming — six plots, soil fertility with rotation, and WIND POLLINATION:
// a flowering plot downwind of a *different* flowering species accumulates
// hybrid progress; its harvest then also yields a Goldbloom seed.
// Owns plot state only. Reads Clock/Wind/Inventory APIs.

const Farming = {
  PLOT: 56, // px square
  plots: [],

  init() {
    this.plots = [];
    const ox = 410, oy = 380, gap = 66;
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        this.plots.push({
          x: ox + c * gap, y: oy + r * gap,
          crop: null,        // crop id
          plantedAt: 0,      // Clock.t
          fertility: 100,    // 0..150, multiplies yield
          lastCrop: null,
          hybrid: 0,         // 0..1 cross-pollination progress
        });
      }
    }
  },

  progress(p) {
    if (!p.crop) return 0;
    return Math.min(1, (Clock.t - p.plantedAt) / CROPS[p.crop].growDays);
  },

  isFlowering(p) {
    if (!p.crop) return false;
    const pr = this.progress(p);
    return pr >= CROPS[p.crop].flowerFrom && pr <= CROPS[p.crop].flowerTo;
  },

  isRipe(p) { return p.crop && this.progress(p) >= 1; },

  sow(p, cropId) {
    if (p.crop) return false;
    if (!Inventory.spendSeed(cropId)) return false;
    p.crop = cropId;
    p.plantedAt = Clock.t;
    p.hybrid = 0;
    return true;
  },

  harvest(p) {
    if (!this.isRipe(p)) return null;
    const c = CROPS[p.crop];
    const mult = p.fertility / 100;
    const n = Math.max(1, Math.round(c.yieldN * mult));
    Inventory.add(c.yieldItem, n);
    // rotation fertility: same crop again drains, switching restores
    p.fertility = constrain(
      p.fertility + (p.lastCrop === p.crop ? -20 : +10), 30, 150);
    const out = { name: c.name, n, hybridSeed: false };
    if (p.hybrid >= 1) { Inventory.addSeed('goldbloom', 1); out.hybridSeed = true; }
    // harvesting non-hybrid crops returns 1 seed of itself half the time
    if (p.crop !== 'goldbloom' && Math.random() < 0.5) Inventory.addSeed(p.crop, 1);
    p.lastCrop = p.crop;
    p.crop = null;
    p.hybrid = 0;
    return out;
  },

  // Cross-pollination: flowering plots receive pollen from *different*
  // flowering species that sit UPWIND within a cone. Time-based, so it is
  // independent of frame rate and day length.
  POLLINATE_PER_DAY: 11, // full hybrid in ~one good flowering overlap

  update() {
    const w = Wind.vec();
    if (w.s < 0.28) return; // the night breeze is too soft to carry pollen
    const dtDays = Math.min(deltaTime, 100) / 1000 / Clock.DAY_SECONDS;
    for (const p of this.plots) {
      if (!this.isFlowering(p) || p.hybrid >= 1) continue;
      for (const q of this.plots) {
        if (q === p || !this.isFlowering(q) || q.crop === p.crop) continue;
        const dx = p.x - q.x, dy = p.y - q.y;       // q -> p
        const d = Math.hypot(dx, dy);
        if (d > 220) continue;
        const dot = (dx / d) * Math.cos(w.a) + (dy / d) * Math.sin(w.a);
        if (dot > 0.4) {                             // p is downwind of q
          const was = p.hybrid;
          p.hybrid = Math.min(1, p.hybrid + dtDays * this.POLLINATE_PER_DAY * w.s * dot);
          if (was < 1 && p.hybrid >= 1) HUD.toast('The wind has crossed your flowers ✦');
          if (Math.random() < 0.12) Fx.pollen(q.x, q.y - 14);
        }
      }
    }
  },

  nearest(x, y, rad) {
    let best = null, bd = rad;
    for (const p of this.plots) {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  },

  draw() {
    const S = this.PLOT;
    for (const p of this.plots) {
      push();
      translate(p.x, p.y);
      rectMode(CENTER);
      // soil — tinted by fertility (rich = dark, tired = pale)
      const f = p.fertility;
      const soil = lerpColor(color(186, 158, 120), color(102, 72, 48),
                             constrain(f / 150, 0, 1));
      noStroke();
      fill(0, 0, 0, 30); rect(2, 4, S, S, 6);
      fill(soil); rect(0, 0, S, S, 6);
      stroke(82, 58, 38, 120); strokeWeight(1.5);
      for (let i = -1; i <= 1; i++) line(-S / 2 + 7, i * 14, S / 2 - 7, i * 14);
      noStroke();

      if (p.crop) this._drawCrop(p);

      // hybrid shimmer ring once pollinated
      if (p.hybrid >= 1) {
        noFill(); stroke(255, 210, 80, 130 + Math.sin(frameCount * 0.12) * 60);
        strokeWeight(2); rect(0, 0, S + 6, S + 6, 8);
      }
      pop();
    }
  },

  _drawCrop(p) {
    const c = CROPS[p.crop];
    const pr = this.progress(p);
    const h = 6 + pr * 22;                       // plant height
    const flowering = this.isFlowering(p);
    const ripe = this.isRipe(p);
    for (let i = 0; i < 5; i++) {
      const px = (i - 2) * 9 + Math.sin(i * 7) * 2;
      const sway = Math.sin(frameCount * 0.05 + i + p.x) * (1 + Wind.strength() * 3);
      stroke(c.stalk[0], c.stalk[1], c.stalk[2]);
      strokeWeight(2.5);
      noFill();
      line(px, 16, px + sway * 0.4, 16 - h * 0.6);
      line(px + sway * 0.4, 16 - h * 0.6, px + sway, 16 - h);
      if (flowering || ripe) {
        noStroke();
        const b = c.bloom;
        const glow = ripe ? 255 : 200;
        fill(b[0], b[1], b[2], glow);
        ellipse(px + sway, 16 - h, ripe ? 8 : 6, ripe ? 8 : 6);
      }
    }
    if (ripe) { // glint
      noStroke(); fill(255, 255, 220, 120 + Math.sin(frameCount * 0.15) * 80);
      ellipse(0, -h * 0.4, 4, 4);
    }
  },
};

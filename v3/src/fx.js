// Fx — ephemeral particles: wind streaks, pollen, splashes, sparkles.
// Pure cosmetics; owns only its own pool.

const Fx = {
  ps: [],
  MAX: 240,

  _push(p) { if (this.ps.length < this.MAX) this.ps.push(p); },

  pollen(x, y) {
    this._push({ kind: 'pollen', x, y, vx: 0, vy: 0, t: 0, life: 130 + Math.random() * 60 });
  },

  splash(x, y, scale = 1) {
    this._push({ kind: 'splash', x, y, t: 0, life: 26, scale });
  },

  sparkle(x, y) {
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * TWO_PI;
      this._push({
        kind: 'spark', x, y, t: 0, life: 30 + Math.random() * 16,
        vx: Math.cos(a) * 0.8, vy: Math.sin(a) * 0.8 - 0.6,
      });
    }
  },

  update() {
    // ambient wind streaks spawn near the camera, more in strong wind
    const wv = Wind.vec();
    if (Math.random() < wv.s * 0.5) {
      this._push({
        kind: 'streak',
        x: Camera.x + (Math.random() - 0.5) * width * 1.1,
        y: Camera.y + (Math.random() - 0.5) * height * 1.1,
        t: 0, life: 50 + Math.random() * 30,
      });
    }
    const w = Wind.vec();
    for (const p of this.ps) {
      p.t++;
      if (p.kind === 'pollen') {
        p.vx += w.x * 0.03 + (Math.random() - 0.5) * 0.04;
        p.vy += w.y * 0.03 + (Math.random() - 0.5) * 0.04 - 0.002;
        p.vx *= 0.96; p.vy *= 0.96;
        p.x += p.vx + w.x * 0.9;
        p.y += p.vy + w.y * 0.9;
      } else if (p.kind === 'streak') {
        p.x += w.x * 7;
        p.y += w.y * 7;
      } else if (p.kind === 'spark') {
        p.x += p.vx; p.y += p.vy; p.vy += 0.02;
      }
    }
    this.ps = this.ps.filter((p) => p.t < p.life);
  },

  draw() {
    push();
    noFill();
    const w = Wind.vec();
    for (const p of this.ps) {
      const k = 1 - p.t / p.life;
      if (p.kind === 'pollen') {
        noStroke(); fill(255, 215, 110, 200 * k);
        ellipse(p.x, p.y, 3.5, 3.5);
      } else if (p.kind === 'streak') {
        stroke(255, 255, 255, 38 * k * w.s * 2);
        strokeWeight(1.5);
        const L = 26 + w.s * 30;
        const cx = p.x, cy = p.y;
        bezier(cx, cy,
               cx + Math.cos(w.a) * L * 0.4, cy + Math.sin(w.a) * L * 0.4 - 3,
               cx + Math.cos(w.a) * L * 0.7, cy + Math.sin(w.a) * L * 0.7 + 3,
               cx + Math.cos(w.a) * L, cy + Math.sin(w.a) * L);
      } else if (p.kind === 'splash') {
        stroke(255, 255, 255, 160 * k);
        strokeWeight(1.5);
        const r = (p.t / p.life) * 26 * p.scale;
        ellipse(p.x, p.y, r * 2, r * 0.8);
      } else if (p.kind === 'spark') {
        noStroke(); fill(255, 226, 130, 230 * k);
        ellipse(p.x, p.y, 3, 3);
      }
    }
    pop();
  },
};

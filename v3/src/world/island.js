// Island — home island geometry + render, now tide-aware.
// Owns: coastline, walkable test, decor, the dock, the Shrine Islet + sandbar.

const Island = {
  CX: 600,
  CY: 400,
  RX: 500,
  RY: 320,

  // Dock: planks reaching east over the water. Always walkable.
  DOCK: { x0: 1075, y0: 415, x1: 1255, y1: 445 },

  // Shrine Islet — NE, reachable over the sandbar at low tide.
  ISLET: { cx: 1390, cy: 170, rx: 95, ry: 62 },
  // Sandbar corridor between main shore and islet
  BAR: { ax: 1065, ay: 295, bx: 1310, by: 200, halfW: 30 },

  _decor: [],
  _patches: [],

  isOnDock(x, y) {
    const d = this.DOCK;
    return x >= d.x0 - 6 && x <= d.x1 + 6 && y >= d.y0 - 8 && y <= d.y1 + 8;
  },

  isOnIslet(x, y) {
    const I = this.ISLET;
    const dx = (x - I.cx) / I.rx, dy = (y - I.cy) / I.ry;
    return dx * dx + dy * dy <= 1;
  },

  isOnBar(x, y) {
    const B = this.BAR;
    const vx = B.bx - B.ax, vy = B.by - B.ay;
    const L2 = vx * vx + vy * vy;
    const t = ((x - B.ax) * vx + (y - B.ay) * vy) / L2;
    if (t < -0.05 || t > 1.05) return false;
    const px = B.ax + vx * t, py = B.ay + vy * t;
    return Math.hypot(x - px, y - py) <= B.halfW;
  },

  // Walkable: dry land up to ~12px shy of the live waterline, the dock,
  // the islet, and (at low water only) the sandbar.
  isOnSurface(x, y) {
    if (this.isOnDock(x, y)) return true;
    if (this.isOnIslet(x, y)) return true;
    if (Tide.sandbarOpen() && this.isOnBar(x, y)) return true;
    const walkOff = Tide.waterlineOffset() - 12;
    const dx = (x - this.CX) / (this.RX + walkOff);
    const dy = (y - this.CY) / (this.RY + walkOff);
    return dx * dx + dy * dy <= 1;
  },

  initDecor() {
    this._decor = [];
    this._patches = [];
    randomSeed(7);
    for (let i = 0; i < 26; i++) {
      const a = random(TWO_PI);
      const r = Math.sqrt(random()) * 0.8;
      const x = this.CX + Math.cos(a) * this.RX * r;
      const y = this.CY + Math.sin(a) * this.RY * r;
      // keep the farm clearing (west-center) and shore paths open
      if (x > 330 && x < 760 && y > 280 && y < 560) continue;
      this._decor.push({ x, y, type: random() < 0.45 ? 'palm' : 'olive' });
    }
    this._decor.sort((p, q) => p.y - q.y);
    for (let i = 0; i < 32; i++) {
      const a = random(TWO_PI);
      const r = Math.sqrt(random()) * 0.92;
      this._patches.push({
        x: this.CX + Math.cos(a) * this.RX * r,
        y: this.CY + Math.sin(a) * this.RY * r,
        r: random(40, 95),
      });
    }
  },

  _blobVerts(rx, ry, wobble, seed) {
    const N = 64, vs = [];
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * TWO_PI;
      const w = 1 + wobble * Math.sin(a * 3 + seed) + wobble * 0.5 * Math.sin(a * 5 + seed * 1.7);
      vs.push([this.CX + Math.cos(a) * rx * w, this.CY + Math.sin(a) * ry * w]);
    }
    return vs;
  },

  _blob(rx, ry, wobble, seed) {
    beginShape();
    for (const [x, y] of this._blobVerts(rx, ry, wobble, seed)) vertex(x, y);
    endShape(CLOSE);
  },

  // Ring between two offsets (used by Tide for the wet-sand band)
  blobRing(offInner, offOuter, wobble, seed) {
    beginShape();
    for (const [x, y] of this._blobVerts(this.RX + offOuter, this.RY + offOuter, wobble, seed)) vertex(x, y);
    beginContour();
    const inner = this._blobVerts(this.RX + offInner, this.RY + offInner, wobble, seed);
    for (let i = inner.length - 1; i >= 0; i--) vertex(inner[i][0], inner[i][1]);
    endContour();
    endShape(CLOSE);
  },

  blobOutline(off, wobble, seed) {
    beginShape();
    for (const [x, y] of this._blobVerts(this.RX + off, this.RY + off, wobble, seed)) vertex(x, y);
    endShape(CLOSE);
  },

  draw() {
    push();
    noStroke();

    // full beach disc (sand under everything; water gets drawn back over it)
    fill(226, 204, 160); this._blob(this.RX + 110, this.RY + 110, 0.045, 1.3);

    // grass
    fill(122, 172, 96); this._blob(this.RX, this.RY, 0.04, 2.1);
    for (const p of this._patches) { fill(106, 154, 84, 90); ellipse(p.x, p.y, p.r, p.r * 0.7); }
    fill(134, 184, 108, 70); this._blob(this.RX * 0.55, this.RY * 0.55, 0.07, 3.4);

    pop();

    // water over the beach, up to the live waterline (also draws islet/sandbar)
    this._drawWater();

    this._drawDock();
    this._drawShrine();
    this._drawDecor();
  },

  _drawWater() {
    const off = Tide.waterlineOffset();
    push();
    noStroke();
    // shallow water ring from waterline outward (page bg is the deep sea)
    fill(86, 158, 196, 235); this.blobRing(off, 240, 0.045, 1.3);
    fill(74, 146, 186, 110); this.blobRing(off + 26, 240, 0.05, 0.9);
    // islet + sandbar sit IN the sea: draw above the water
    const I = this.ISLET;
    fill(226, 204, 160); ellipse(I.cx, I.cy, I.rx * 2 + 26, I.ry * 2 + 26);
    fill(122, 172, 96);  ellipse(I.cx, I.cy, I.rx * 2, I.ry * 2);
    const lvl = Tide.level();
    if (lvl < -0.2) {
      const B = this.BAR;
      const alpha = Tide.sandbarOpen() ? 255 : map(lvl, -0.2, -0.45, 30, 140, true);
      stroke(228, 207, 164, alpha); strokeWeight(B.halfW * 2 - 8); strokeCap(ROUND);
      line(B.ax, B.ay, B.bx, B.by);
      noStroke();
    }
    pop();
  },

  _drawDock() {
    const d = this.DOCK;
    push();
    stroke(96, 70, 46); strokeWeight(5);
    for (let x = d.x0 + 14; x < d.x1; x += 34) line(x, d.y0 + 4, x, d.y1 + 14);
    noStroke(); fill(146, 110, 74);
    rect(d.x0, d.y0, d.x1 - d.x0, d.y1 - d.y0, 3);
    stroke(116, 86, 56); strokeWeight(1);
    for (let x = d.x0 + 8; x < d.x1; x += 11) line(x, d.y0 + 1, x, d.y1 - 1);
    pop();
  },

  _drawShrine() {
    const I = this.ISLET;
    push();
    const x = I.cx, y = I.cy - 6;
    noStroke();
    fill(0, 0, 0, 40); ellipse(x, y + 26, 70, 16);
    fill(235, 230, 218);
    rect(x - 26, y + 10, 52, 8, 2);
    rect(x - 20, y - 18, 7, 28, 2);
    rect(x + 13, y - 18, 7, 28, 2);
    triangle(x - 28, y - 18, x + 28, y - 18, x, y - 34);
    fill(212, 206, 192);
    rect(x - 26, y - 20, 52, 4, 1);
    if (Clock.isNight() || Clock.isDusk()) {
      fill(255, 170, 60, 180 + Math.sin(frameCount * 0.2) * 60);
      ellipse(x, y - 2, 7, 11);
    }
    pop();
  },

  _drawDecor() {
    push();
    imageMode(CENTER);
    for (const d of this._decor) {
      const sz = d.type === 'palm' ? 66 : 58;
      noStroke(); fill(0, 0, 0, 40);
      ellipse(d.x, d.y + sz * 0.30, sz * 0.55, sz * 0.18);
      const img = d.type === 'palm' ? Assets.img.palm : Assets.img.olive;
      if (img) image(img, d.x, d.y - sz * 0.30, sz, sz);
      else { fill(60, 120, 60); ellipse(d.x, d.y - sz * 0.2, sz * 0.6, sz * 0.85); }
    }
    pop();
  },
};

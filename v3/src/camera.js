// Camera — follows GameState.cameraTarget and converts world <-> screen.
// Owns only the camera position + zoom. Nothing else writes to it.

const Camera = {
  x: 600,
  y: 400,
  Z: 1.5, // cozy zoom

  update() {
    const t = GameState.cameraTarget;
    this.x += (t.x - this.x) * 0.1; // smooth follow
    this.y += (t.y - this.y) * 0.1;
  },

  apply() {
    translate(width / 2, height / 2);
    scale(this.Z);
    translate(-this.x, -this.y);
  },

  w2sX(wx) { return (wx - this.x) * this.Z + width / 2; },
  w2sY(wy) { return (wy - this.y) * this.Z + height / 2; },
  s2wX(sx) { return (sx - width / 2) / this.Z + this.x; },
  s2wY(sy) { return (sy - height / 2) / this.Z + this.y; },
};

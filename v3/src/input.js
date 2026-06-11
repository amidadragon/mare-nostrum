// Input — the ONLY module that produces player movement intent, plus raw
// action keypresses. player.js READS moveVec/clickTarget; Interact consumes
// action presses. Nothing else writes here. (This is the invariant the legacy
// code broke — bots wrote state.player. Keep it that way.)

const Input = {
  clickTarget: null, // {x,y} world point, or null
  _pressed: {},      // key -> true until consumed

  // WASD + arrows -> a direction vector (not normalized).
  moveVec() {
    let dx = 0, dy = 0;
    if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) dx -= 1;  // A
    if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) dx += 1; // D
    if (keyIsDown(87) || keyIsDown(UP_ARROW)) dy -= 1;    // W
    if (keyIsDown(83) || keyIsDown(DOWN_ARROW)) dy += 1;  // S
    return { dx, dy };
  },

  // One-shot action keys (E, F, 1-3). Set by keyPressed; consumed exactly once.
  press(k) { this._pressed[k] = true; },
  consume(k) {
    if (this._pressed[k]) { this._pressed[k] = false; return true; }
    return false;
  },

  // Walk target ONLY if near the player AND on walkable ground. A far/off-map
  // click is ignored, so the player can never be sent walking into the sea.
  onClick(screenX, screenY) {
    const wx = Camera.s2wX(screenX);
    const wy = Camera.s2wY(screenY);
    const ddx = wx - Player.x, ddy = wy - Player.y;
    const near = (ddx * ddx + ddy * ddy) <= 900 * 900;
    if (near && Island.isOnSurface(wx, wy)) {
      this.clickTarget = { x: wx, y: wy };
    }
  },
};

// p5 global hooks
function mousePressed() {
  if (mouseButton === LEFT) Input.onClick(mouseX, mouseY);
}

function keyPressed() {
  const k = (key || '').toLowerCase();
  if (['e', 'f', '1', '2', '3', '4'].includes(k)) Input.press(k);
}

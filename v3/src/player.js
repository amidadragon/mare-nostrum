// Player — the avatar. Moved ONLY by reading Input. Owns its own position.
// Nothing outside this module writes Player.x/y or its target.

const Player = {
  x: 600,
  y: 400,
  facing: 'right',
  moving: false,
  speed: 2.6,
  animT: 0,

  update() {
    const m = Input.moveVec();
    let vx = 0, vy = 0;

    if (m.dx !== 0 || m.dy !== 0) {
      Input.clickTarget = null; // keyboard overrides a click target
      const len = Math.hypot(m.dx, m.dy) || 1;
      vx = (m.dx / len) * this.speed;
      vy = (m.dy / len) * this.speed;
      this.moving = true;
    } else if (Input.clickTarget) {
      const tdx = Input.clickTarget.x - this.x;
      const tdy = Input.clickTarget.y - this.y;
      const d = Math.hypot(tdx, tdy);
      if (d < this.speed * 1.5) {
        Input.clickTarget = null;
        this.moving = false;
      } else {
        vx = (tdx / d) * this.speed;
        vy = (tdy / d) * this.speed;
        this.moving = true;
      }
    } else {
      this.moving = false;
    }

    // Move, but stay on the walkable island. Slide along the edge if blocked.
    if (vx !== 0 || vy !== 0) {
      if (Island.isOnSurface(this.x + vx, this.y + vy)) {
        this.x += vx; this.y += vy;
      } else if (Island.isOnSurface(this.x + vx, this.y)) {
        this.x += vx;
      } else if (Island.isOnSurface(this.x, this.y + vy)) {
        this.y += vy;
      } else {
        this.moving = false;
      }
      if (vx > 0.1) this.facing = 'right';
      else if (vx < -0.1) this.facing = 'left';
    }

    this.animT += this.moving ? 0.25 : 0.04;

    // Camera follows the player (camera owns its own lerp).
    GameState.cameraTarget.x = this.x;
    GameState.cameraTarget.y = this.y;
  },

  draw() {
    // soft shadow
    push();
    noStroke();
    fill(0, 0, 0, 50);
    ellipse(this.x, this.y + 18, 30, 12);
    pop();

    const img = Assets.img.player;
    push();
    translate(this.x, this.y);
    // gentle bob while walking
    const bob = this.moving ? Math.sin(this.animT) * 1.5 : Math.sin(this.animT) * 0.5;
    if (this.facing === 'left') scale(-1, 1);
    if (img) {
      // rome_player.png is a 4x4 sheet of 32px frames; row 0 = walk cycle.
      imageMode(CENTER);
      const col = this.moving ? Math.floor(this.animT * 0.55) % 4 : 0;
      image(img, 0, -10 + bob, 46, 46, col * 32, 0, 32, 32);
    } else {
      fill(225, 195, 135); noStroke();
      ellipse(0, -6 + bob, 22, 30);
    }
    pop();
  },
};

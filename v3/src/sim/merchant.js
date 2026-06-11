// Merchant — Hanno's trader calls once a day, riding the afternoon onshore
// breeze… but he can only DOCK if the water is high enough. Miss the tide,
// miss the sale. Owns the ship + trade. Sells nothing; only buys.

const Merchant = {
  ARRIVE_H: 11,
  DEPART_H: 16,
  MIN_TIDE: -0.15,         // needs this much water at the dock

  state: 'away',           // away | sailing | docked | leaving | skipped
  shipX: 0, shipY: 0,
  _announced: false,

  dockPoint() { return { x: Island.DOCK.x1 + 46, y: (Island.DOCK.y0 + Island.DOCK.y1) / 2 + 6 }; },
  awayPoint() { return { x: Island.DOCK.x1 + 620, y: Island.DOCK.y0 - 140 }; },

  init() {
    const a = this.awayPoint();
    this.shipX = a.x; this.shipY = a.y;
    Clock.onNewDay.push(() => { this.state = 'away'; this._announced = false; });
  },

  update() {
    const h = Clock.hour();
    const dp = this.dockPoint(), ap = this.awayPoint();

    if (this.state === 'away' && h >= this.ARRIVE_H - 0.6 && h < this.DEPART_H) {
      if (Tide.level() >= this.MIN_TIDE) {
        this.state = 'sailing';
      } else if (!this._announced && h >= this.ARRIVE_H) {
        this._announced = true;
        this.state = 'skipped';
        HUD.toast('Low water — the merchant sails past today');
      }
    }
    if (this.state === 'sailing') {
      this.shipX += (dp.x - this.shipX) * 0.012;
      this.shipY += (dp.y - this.shipY) * 0.012;
      if (Math.hypot(dp.x - this.shipX, dp.y - this.shipY) < 6) {
        this.state = 'docked';
        HUD.toast('The merchant has docked — E to trade at the pier');
      }
    }
    if (this.state === 'docked' && h >= this.DEPART_H) {
      this.state = 'leaving';
      HUD.toast('The merchant casts off');
    }
    if (this.state === 'leaving' || (this.state === 'skipped' && h < this.DEPART_H)) {
      this.shipX += (ap.x - this.shipX) * 0.008;
      this.shipY += (ap.y - this.shipY) * 0.008;
      if (Math.hypot(ap.x - this.shipX, ap.y - this.shipY) < 10 && this.state === 'leaving') {
        this.state = 'away';
        const a = this.awayPoint();
        this.shipX = a.x; this.shipY = a.y;
      }
    }
  },

  canTrade(px, py) {
    if (this.state !== 'docked') return false;
    const d = Island.DOCK;
    return px > d.x1 - 80 && px < d.x1 + 30 && Math.abs(py - (d.y0 + d.y1) / 2) < 40;
  },

  sellAll() {
    let gold = 0, lines = 0;
    for (const k of SELLABLE) {
      const n = Inventory.count(k);
      if (n > 0) {
        gold += n * ITEMS[k].price;
        Inventory.spend(k, n);
        lines++;
      }
    }
    if (gold > 0) {
      Inventory.add('denarii', gold);
      HUD.toast('Sold ' + lines + ' goods for ' + gold + ' denarii');
      Fx.sparkle(Player.x, Player.y - 30);
    } else {
      HUD.toast('Nothing to sell — the merchant shrugs');
    }
  },

  draw() {
    if (this.state === 'away') return;
    push();
    translate(this.shipX, this.shipY);
    const bob = Math.sin(frameCount * 0.05) * 2;
    translate(0, bob);
    noStroke();
    fill(0, 0, 0, 35); ellipse(0, 16, 90, 16);
    // hull
    fill(122, 84, 52);
    beginShape();
    vertex(-46, 0); vertex(46, 0); vertex(34, 16); vertex(-34, 16);
    endShape(CLOSE);
    fill(96, 64, 40); rect(-46, -2, 92, 5, 2);
    // mast + sail catching the live wind
    stroke(82, 58, 36); strokeWeight(4); line(0, -2, 0, -46);
    noStroke();
    const wv = Wind.vec();
    const billow = 10 + wv.s * 14;
    fill(238, 230, 210);
    beginShape();
    vertex(0, -44);
    bezierVertex(billow * Math.cos(wv.a), -36, billow * Math.cos(wv.a), -16, 0, -6);
    vertex(0, -44);
    endShape(CLOSE);
    // pennant
    fill(201, 111, 74);
    triangle(0, -46, 14 * Math.cos(wv.a), -42, 0, -38);
    pop();
  },
};

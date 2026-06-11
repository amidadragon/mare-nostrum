// Mare Nostrum v3 — The Tide Calendar. Entry point.
// setup()/draw()/preload() live ONLY here. Draw order:
// sky -> world (camera space) -> day/night tint -> HUD (screen space).

let _stars = [];

function preload() {
  Assets.img.player = loadImage('../sprites/characters/rome_player.png');
  Assets.img.palm = loadImage('../sprites/sheets/palm_tree.png');
  Assets.img.olive = loadImage('../sprites/sheets/olive_tree.png');
  Assets.img.bush = loadImage('../sprites/sheets/bush_berry.png');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  GameState.init();
  Island.initDecor();
  Farming.init();
  Saltworks.init();
  Merchant.init();
  Shrine.init();
  HUD.init();
  for (let i = 0; i < 70; i++) {
    _stars.push({ x: Math.random(), y: Math.random() * 0.8, s: Math.random() });
  }
  HUD.toast('Low water at dawn — the flats are open');
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function _skyColor() {
  // sea/sky base by hour, blended through dawn & dusk
  const h = Clock.hour();
  const night = color(8, 18, 38);
  const day = color(18, 56, 96);
  const dawn = color(58, 42, 64);
  const dusk = color(70, 40, 56);
  if (h < 5) return night;
  if (h < 6.5) return lerpColor(night, dawn, (h - 5) / 1.5);
  if (h < 8) return lerpColor(dawn, day, (h - 6.5) / 1.5);
  if (h < 17) return day;
  if (h < 19) return lerpColor(day, dusk, (h - 17) / 2);
  if (h < 21) return lerpColor(dusk, night, (h - 19) / 2);
  return night;
}

function draw() {
  // ---- simulate ----
  Clock.update();
  Player.update();          // reads Input only
  Tide.update();
  Farming.update();
  Saltworks.update();
  Merchant.update();
  Fishing.update();
  Fx.update();
  Inventory.update();
  Interact.update();        // resolves prompts + consumes action keys

  // ---- sky / deep sea ----
  background(_skyColor());
  if (Clock.isNight() || Clock.isDusk()) {
    const a = Clock.isNight() ? 200 : 90;
    noStroke();
    for (const st of _stars) {
      const tw = 120 + Math.sin(frameCount * 0.03 + st.x * 40) * 80;
      fill(230, 235, 245, (tw * st.s * a) / 255);
      ellipse(st.x * width, st.y * height, 2, 2);
    }
  }

  // ---- world ----
  push();
  Camera.update();
  Camera.apply();
  Island.draw();
  Tide.draw();              // wet band, foam, forage
  Saltworks.draw();
  Farming.draw();
  Merchant.draw();
  Player.draw();
  Fishing.draw();
  Fx.draw();
  pop();

  // ---- light ----
  const sun = Clock.sunlight();
  if (sun < 1) {
    noStroke();
    fill(10, 16, 44, (1 - sun) * 120);
    rect(0, 0, width, height);
  }
  if (Clock.isDawn() || Clock.isDusk()) {
    noStroke();
    fill(255, 140, 60, 22);
    rect(0, 0, width, height);
  }

  // ---- UI ----
  HUD.draw();
}

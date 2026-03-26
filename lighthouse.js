// ═══ LIGHTHOUSES & BEACONS ═══
const LIGHTHOUSE_LEVELS = [
  { name: 'Watchtower', revealRange: 200, cost: { wood: 200, stone: 100 }, visual: 'wood' },
  { name: 'Stone Lighthouse', revealRange: 400, cost: { stone: 500, gold: 200 }, visual: 'stone' },
  { name: 'Grand Beacon', revealRange: 800, cost: { stone: 1000, gold: 500 }, visual: 'marble' }
];

function initLighthouses() {
  if (!state._lighthouses) state._lighthouses = {};
}

function buildLighthouse(islandKey) {
  initLighthouses();
  let current = state._lighthouses[islandKey] || 0;
  if (current >= 3) return false;
  let lvl = LIGHTHOUSE_LEVELS[current];
  // Check cost
  for (let res in lvl.cost) {
    if ((state[res] || 0) < lvl.cost[res]) {
      if (typeof addFloatingText === 'function') addFloatingText(width/2, height*0.3, 'Need more ' + res + '!', '#ff6644');
      return false;
    }
  }
  // Pay cost
  for (let res in lvl.cost) state[res] -= lvl.cost[res];
  state._lighthouses[islandKey] = current + 1;
  if (typeof addNotification === 'function') addNotification('Built ' + lvl.name + '!', '#ffdd44');
  return true;
}

function getLighthouseLevel(islandKey) {
  initLighthouses();
  return state._lighthouses[islandKey] || 0;
}

function getLighthouseRevealRange(islandKey) {
  let lvl = getLighthouseLevel(islandKey);
  if (lvl === 0) return 0;
  return LIGHTHOUSE_LEVELS[lvl - 1].revealRange;
}

// ═══ LIGHTHOUSE VISUAL RENDERING ═══
// Called from main draw loop — renders lighthouse on home island coast
function drawLighthouse(sx, sy, lvl) {
  // sx, sy = screen position of lighthouse base
  // lvl = 1 (watchtower), 2 (stone), 3 (grand beacon)
  if (lvl <= 0) return;
  push();
  translate(floor(sx), floor(sy));
  noStroke();

  if (lvl === 1) {
    // Wooden watchtower — simple square tower
    fill(90, 65, 30);
    rect(-6, -30, 12, 30);           // main post
    fill(100, 75, 35);
    rect(-8, -32, 16, 4);            // platform
    fill(80, 55, 25);
    rect(-4, -28, 8, 26);            // planking
    // Railing
    fill(70, 50, 22);
    rect(-9, -36, 2, 4); rect(7, -36, 2, 4);
    rect(-9, -36, 18, 2);
    // Torch flame
    let flicker = sin(frameCount * 0.15) * 2;
    fill(255, 180, 40, 200);
    ellipse(0, -40 + flicker, 6, 8);
    fill(255, 220, 80, 150);
    ellipse(0, -42 + flicker, 4, 5);
  } else if (lvl === 2) {
    // Stone lighthouse — cylindrical with windows
    fill(160, 155, 140);
    rect(-8, -50, 16, 50);           // main tower
    fill(170, 165, 150);
    rect(-10, -52, 20, 4);           // cornice
    rect(-10, 0, 20, 4);             // base
    // Stone lines
    fill(140, 135, 120, 100);
    for (let i = 0; i < 5; i++) rect(-7, -10 - i * 9, 14, 1);
    // Windows
    fill(50, 60, 80);
    rect(-2, -20, 4, 6);
    rect(-2, -36, 4, 6);
    // Light chamber
    fill(180, 175, 155);
    rect(-10, -58, 20, 6);
    // Fire
    let flicker2 = sin(frameCount * 0.12) * 3;
    fill(255, 200, 50, 220);
    ellipse(0, -62 + flicker2, 10, 12);
    fill(255, 240, 100, 160);
    ellipse(0, -64 + flicker2, 6, 8);
    // Light beam glow
    fill(255, 220, 80, 30);
    triangle(-40, -62, 0, -62, -20, -62 + 40);
    triangle(40, -62, 0, -62, 20, -62 + 40);
  } else {
    // Grand beacon — tall marble with rotating light
    fill(220, 215, 200);
    rect(-10, -70, 20, 70);          // main tower
    fill(230, 225, 210);
    rect(-12, -72, 24, 4);           // upper cornice
    rect(-12, -2, 24, 6);            // base plinth
    rect(-14, 2, 28, 4);             // lower plinth
    // Marble detail lines
    fill(200, 195, 180, 80);
    for (let i = 0; i < 7; i++) rect(-9, -8 - i * 9, 18, 1);
    // Columns at corners
    fill(210, 205, 190);
    rect(-10, -68, 3, 66); rect(7, -68, 3, 66);
    // Windows with arches
    fill(50, 55, 70);
    rect(-2, -20, 4, 7); rect(-3, -21, 6, 2);
    rect(-2, -40, 4, 7); rect(-3, -41, 6, 2);
    rect(-2, -56, 4, 7); rect(-3, -57, 6, 2);
    // Light chamber — grand octagonal top
    fill(240, 235, 220);
    rect(-14, -80, 28, 8);
    fill(220, 215, 200);
    rect(-12, -84, 24, 4);
    // Rotating light beam
    let beamAngle = frameCount * 0.02;
    let bx = cos(beamAngle) * 60;
    let by = sin(beamAngle) * 20;
    fill(255, 240, 120, 40);
    triangle(0, -80, bx - 15, -80 + by, bx + 15, -80 + by);
    // Fire
    let flicker3 = sin(frameCount * 0.1) * 2;
    fill(255, 220, 80, 240);
    ellipse(0, -84 + flicker3, 14, 16);
    fill(255, 250, 140, 180);
    ellipse(0, -86 + flicker3, 8, 10);
    // Gold finial
    fill(200, 170, 50);
    rect(-2, -90 + flicker3, 4, 6);
    fill(220, 190, 60);
    ellipse(0, -92 + flicker3, 6, 6);
  }

  pop();
}

// Draw lighthouse on home island — places it at a coastal position
function drawHomeLighthouse() {
  if (typeof state === 'undefined' || !state._lighthouses) return;
  let homeKey = state.faction + '_capital';
  let lvl = state._lighthouses[homeKey] || state._lighthouses['home'] || 0;
  if (lvl <= 0) return;
  // Position: upper-right coast of home island
  let lx = typeof state.islandRX === 'number' ? state.islandRX * 0.85 : 200;
  let ly = typeof state.islandRY === 'number' ? -state.islandRY * 0.6 : -120;
  let sx = typeof w2sX === 'function' ? w2sX(lx) : width * 0.75;
  let sy = typeof w2sY === 'function' ? w2sY(ly) : height * 0.3;
  drawLighthouse(sx, sy, lvl);
}

function isIslandRevealed(targetKey) {
  initLighthouses();
  // Check if any lighthouse reveals this island
  for (let lhKey in state._lighthouses) {
    let range = getLighthouseRevealRange(lhKey);
    if (range <= 0) continue;
    // Get positions
    let lhPos = null, targetPos = null;
    if (typeof getWorldIsland === 'function') {
      let lhi = getWorldIsland(lhKey);
      let ti = getWorldIsland(targetKey);
      if (lhi) lhPos = typeof getIslandWorldPos === 'function' ? getIslandWorldPos(lhi) : null;
      if (ti) targetPos = typeof getIslandWorldPos === 'function' ? getIslandWorldPos(ti) : null;
    }
    if (!lhPos || !targetPos) continue;
    let dx = lhPos.x - targetPos.x, dy = lhPos.y - targetPos.y;
    if (Math.sqrt(dx*dx + dy*dy) <= range) return true;
  }
  return false;
}

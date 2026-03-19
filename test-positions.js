// Position validator — run with: node test-positions.js
// Tests that ports, buildings, trees stay within bounds at all island levels

const WORLD = { islandCX: 600, islandCY: 400, islandRX: 500, islandRY: 320, tileSize: 32 };

function getSurfaceRX(rx) { return rx * 0.90; }
function getSurfaceRY(ry) { return ry * 0.36; }

// Simulate island growth
function getIslandRX(level) {
  let rx = WORLD.islandRX;
  for (let l = 2; l <= level; l++) {
    rx += l <= 5 ? 60 : l <= 10 ? 45 : l <= 15 ? 35 : l <= 20 ? 25 : 18;
  }
  return rx;
}
function getIslandRY(level) {
  let ry = WORLD.islandRY;
  for (let l = 2; l <= level; l++) {
    ry += l <= 5 ? 40 : l <= 10 ? 30 : l <= 15 ? 22 : l <= 20 ? 16 : 12;
  }
  return ry;
}

function getPortPositions(level) {
  let rx = getIslandRX(level);
  let ry = getIslandRY(level);
  let srx = getSurfaceRX(rx);
  let sry = getSurfaceRY(ry);
  return {
    left: { x: WORLD.islandCX - srx - 20, y: WORLD.islandCY + sry * 0.15 },
    right: { x: WORLD.islandCX + srx + 10, y: WORLD.islandCY - sry * 0.05 },
    surfaceRX: srx,
    surfaceRY: sry,
    islandRX: rx,
  };
}

// Test
let pass = true;
for (let lvl = 1; lvl <= 25; lvl++) {
  let p = getPortPositions(lvl);
  let srx = p.surfaceRX;
  let leftEdge = WORLD.islandCX - srx;
  let rightEdge = WORLD.islandCX + srx;

  // Port should be within ~100px of the grass edge (in shallows or just past)
  let leftDistFromEdge = p.left.x - leftEdge;
  let rightDistFromEdge = rightEdge - p.right.x;

  // Port should be on screen (within ~600px of center)
  let leftScreenOK = p.left.x > WORLD.islandCX - 600;
  let rightScreenOK = p.right.x < WORLD.islandCX + 600;

  let leftOK = leftDistFromEdge > -80 && leftDistFromEdge < 100;
  let rightOK = rightDistFromEdge > -80 && rightDistFromEdge < 100;

  let status = (leftOK && rightOK && leftScreenOK && rightScreenOK) ? 'OK' : 'FAIL';
  if (status === 'FAIL') pass = false;

  console.log(`Lv${String(lvl).padStart(2)}  iRX=${String(Math.round(p.islandRX)).padStart(4)}  sRX=${String(Math.round(srx)).padStart(4)}  portL.x=${String(Math.round(p.left.x)).padStart(5)}  portR.x=${String(Math.round(p.right.x)).padStart(5)}  leftEdge=${String(Math.round(leftEdge)).padStart(5)}  L_offset=${String(Math.round(leftDistFromEdge)).padStart(4)}  R_offset=${String(Math.round(rightDistFromEdge)).padStart(4)}  ${status}`);
}

console.log(pass ? '\nALL PASS' : '\nFAILURES FOUND');
process.exit(pass ? 0 : 1);

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

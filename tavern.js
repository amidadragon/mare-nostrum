// ═══ TAVERNS & SOCIAL HUBS ═══
const TAVERN_ACTIVITIES = {
  gossip:    { name: 'Gather Gossip',     cost: 50,   minLevel: 1, desc: 'Reveal a random island location' },
  bard:     { name: 'Hire Bard',          cost: 200,  minLevel: 2, desc: '+10% morale for 10 days' },
  merc:     { name: 'Recruit Mercenary',  cost: 500,  minLevel: 2, desc: 'Hire an elite mercenary (str 150)' },
  diplomat: { name: 'Meet Diplomat',      cost: 300,  minLevel: 3, desc: '+10 relations with random faction' },
  bribe:    { name: 'Bribe',              cost: 1000, minLevel: 3, desc: 'Reduce enemy garrison by 30%' }
};

function initTavern() {
  if (!state._tavern) state._tavern = { level: 0, bardActive: false, bardTimer: 0 };
}

function buildTavern() {
  initTavern();
  if (state._tavern.level >= 3) return false;
  let costs = [{ gold: 100, wood: 50 }, { gold: 300, stone: 100 }, { gold: 600, stone: 200 }];
  let cost = costs[state._tavern.level];
  for (let res in cost) {
    if ((state[res] || 0) < cost[res]) {
      if (typeof addFloatingText === 'function') addFloatingText(width/2, height*0.3, 'Need more ' + res + '!', '#ff6644');
      return false;
    }
  }
  for (let res in cost) state[res] -= cost[res];
  state._tavern.level++;
  if (typeof addNotification === 'function') addNotification('Tavern upgraded to level ' + state._tavern.level + '!', '#ffdd44');
  return true;
}

function doTavernActivity(actKey) {
  initTavern();
  let act = TAVERN_ACTIVITIES[actKey];
  if (!act || state._tavern.level < act.minLevel) return false;
  if (state.gold < act.cost) {
    if (typeof addFloatingText === 'function') addFloatingText(width/2, height*0.3, 'Need ' + act.cost + ' gold!', '#ff6644');
    return false;
  }
  state.gold -= act.cost;

  switch(actKey) {
    case 'gossip':
      // Reveal random island
      if (typeof WORLD_ISLANDS !== 'undefined') {
        let unrevealed = WORLD_ISLANDS.filter(i => !i.faction && !(state._revealedIslands || []).includes(i.key));
        if (unrevealed.length > 0) {
          let isle = unrevealed[Math.floor(Math.random() * unrevealed.length)];
          if (!state._revealedIslands) state._revealedIslands = [];
          state._revealedIslands.push(isle.key);
          if (typeof addNotification === 'function') addNotification('Discovered: ' + isle.name + '!', '#88ddff');
        }
      }
      break;
    case 'bard':
      state._tavern.bardActive = true;
      state._tavern.bardTimer = 600; // ~10 in-game days
      if (typeof addNotification === 'function') addNotification('Bard hired! +10% morale for 10 days', '#88ff88');
      break;
    case 'merc':
      if (typeof recruitUnit === 'function') {
        let lg = state.legia || {};
        if (!lg.army) lg.army = [];
        lg.army.push({ type: 'mercenary', hp: 60, maxHp: 60, damage: 12, speed: 1.0, garrison: false });
        if (typeof addNotification === 'function') addNotification('Elite mercenary recruited!', '#ffaa44');
      }
      break;
    case 'diplomat':
      let nations = Object.keys(state.nations || {});
      if (nations.length > 0) {
        let nk = nations[Math.floor(Math.random() * nations.length)];
        let rv = state.nations[nk];
        if (rv) rv.reputation = Math.min(100, (rv.reputation || 0) + 10);
        if (typeof addNotification === 'function') addNotification('+10 relations with ' + nk, '#88ff88');
      }
      break;
    case 'bribe':
      // Reduce random enemy garrison
      for (let k in state.nations) {
        let rv = state.nations[k];
        if (rv && !rv.defeated && !rv.allied && rv.military > 0) {
          rv.military = Math.floor(rv.military * 0.7);
          if (typeof addNotification === 'function') addNotification(k + ' garrison weakened!', '#ff8844');
          break;
        }
      }
      break;
  }
  return true;
}

function updateTavern(dt) {
  initTavern();
  if (state._tavern.bardActive && state._tavern.bardTimer > 0) {
    state._tavern.bardTimer -= dt * 0.016;
    if (state._tavern.bardTimer <= 0) {
      state._tavern.bardActive = false;
      if (typeof addNotification === 'function') addNotification('Bard has left', '#aaaaaa');
    }
  }
}

function getBardMoraleBonus() {
  initTavern();
  return state._tavern.bardActive ? 0.1 : 0;
}

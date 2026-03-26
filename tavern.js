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

// ═══ TAVERN UI PANEL ═══
function openTavernPanel() {
  initTavern();
  if (state._tavern.level <= 0) {
    if (typeof addFloatingText === 'function') addFloatingText(width/2, height*0.3, 'Build a tavern first!', '#ff6644');
    return;
  }
  state._tavernOpen = true;
  state._tavernHover = -1;
}

function closeTavernPanel() {
  state._tavernOpen = false;
  state._tavernHover = -1;
}

function drawTavernPanel() {
  if (!state._tavernOpen) return;
  initTavern();
  let tvn = state._tavern;
  let lvl = tvn.level;

  // Panel dimensions
  let pw = min(360, floor(width * 0.35));
  let entries = Object.keys(TAVERN_ACTIVITIES).filter(k => TAVERN_ACTIVITIES[k].minLevel <= lvl);
  let ph = 80 + entries.length * 36;
  let px = floor((width - pw) / 2);
  let py = floor((height - ph) / 2);

  // Backdrop
  noStroke();
  fill(0, 0, 0, 120);
  rect(0, 0, width, height);

  // Panel background
  fill(30, 22, 15, 240);
  rect(px, py, pw, ph);
  // Border
  fill(120, 90, 40);
  rect(px, py, pw, 3);
  rect(px, py + ph - 3, pw, 3);
  rect(px, py, 3, ph);
  rect(px + pw - 3, py, 3, ph);

  // Title
  fill(220, 190, 100);
  textSize(14);
  textAlign(CENTER, TOP);
  let tavernNames = ['', 'Roadside Tavern', 'Inn of the Forum', 'Grand Hall of Feasts'];
  text(tavernNames[lvl] || 'Tavern', px + pw / 2, py + 10);

  // Subtitle
  fill(160, 140, 90, 180);
  textSize(8);
  text('Level ' + lvl + ' — Gold: ' + floor(state.gold || 0), px + pw / 2, py + 28);

  // Bard status
  if (tvn.bardActive) {
    fill(100, 200, 100, 180);
    textSize(7);
    text('♪ Bard performing (' + floor(tvn.bardTimer / 60) + ' days left) ♪', px + pw / 2, py + 40);
  }

  // Activity buttons
  let by = py + 55;
  state._tavernHover = -1;
  entries.forEach((key, i) => {
    let act = TAVERN_ACTIVITIES[key];
    let bx = px + 12;
    let bw = pw - 24;
    let bh = 30;
    let isHover = mouseX >= bx && mouseX <= bx + bw && mouseY >= by && mouseY <= by + bh;
    let canAfford = (state.gold || 0) >= act.cost;

    if (isHover) state._tavernHover = i;

    // Button bg
    fill(isHover ? (canAfford ? 60 : 50) : 40, isHover ? (canAfford ? 45 : 30) : 28, isHover ? (canAfford ? 25 : 20) : 15, 220);
    rect(bx, by, bw, bh);

    // Activity name
    fill(canAfford ? 220 : 120, canAfford ? 190 : 100, canAfford ? 100 : 70);
    textSize(9);
    textAlign(LEFT, CENTER);
    text(act.name, bx + 8, by + 10);

    // Cost
    fill(canAfford ? 200 : 100, canAfford ? 170 : 80, canAfford ? 50 : 40);
    textSize(7);
    textAlign(RIGHT, CENTER);
    text(act.cost + 'g', bx + bw - 8, by + 10);

    // Description
    fill(140, 130, 100, 180);
    textSize(6);
    textAlign(LEFT, CENTER);
    text(act.desc, bx + 8, by + 22);

    by += 36;
  });

  // Close hint
  fill(120, 100, 70, 140);
  textSize(7);
  textAlign(CENTER, TOP);
  text('Click activity or press ESC to close', px + pw / 2, py + ph - 16);
  textAlign(LEFT, TOP);
}

function handleTavernClick() {
  if (!state._tavernOpen) return false;
  initTavern();
  let lvl = state._tavern.level;
  let entries = Object.keys(TAVERN_ACTIVITIES).filter(k => TAVERN_ACTIVITIES[k].minLevel <= lvl);

  let pw = min(360, floor(width * 0.35));
  let ph = 80 + entries.length * 36;
  let px = floor((width - pw) / 2);
  let py = floor((height - ph) / 2);

  // Check if click is outside panel — close
  if (mouseX < px || mouseX > px + pw || mouseY < py || mouseY > py + ph) {
    closeTavernPanel();
    return true;
  }

  // Check button clicks
  let by = py + 55;
  for (let i = 0; i < entries.length; i++) {
    let bx = px + 12, bw = pw - 24, bh = 30;
    if (mouseX >= bx && mouseX <= bx + bw && mouseY >= by && mouseY <= by + bh) {
      let result = doTavernActivity(entries[i]);
      if (result && typeof snd !== 'undefined' && snd && typeof snd.playSfx === 'function') {
        snd.playSfx('click');
      }
      return true;
    }
    by += 36;
  }
  return true; // consumed click
}

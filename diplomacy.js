// ═══ DIPLOMACY SYSTEM — Alliances, Reputation, Victory ═══

// Alliance tracking
function getAlliances() {
  if (!state._alliances) state._alliances = [];
  return state._alliances;
}

function getMaxAlliances() {
  let base = 2;
  // Senate House bonus
  if (state._controlledIslands && state._controlledIslands.includes('senate_house')) base++;
  // Oracle bonus
  if (state._controlledIslands && state._controlledIslands.includes('oracle')) base++;
  // Temple of Concord bonus
  if (state._controlledIslands && state._controlledIslands.includes('temple_concord')) base++;
  return base; // max 5
}

function canFormAlliance(nationKey) {
  let allies = getAlliances();
  if (allies.length >= getMaxAlliances()) return false;
  if (allies.includes(nationKey)) return false;
  let rv = state.nations[nationKey];
  if (!rv || rv.defeated) return false;
  if (rv.reputation < 0) return false; // need positive rep
  return true;
}

function formAlliance(nationKey) {
  if (!canFormAlliance(nationKey)) return false;
  if (state.gold < 500) return false;
  state.gold -= 500;
  let allies = getAlliances();
  allies.push(nationKey);
  let rv = state.nations[nationKey];
  rv.allied = true;
  rv.reputation = Math.min(100, rv.reputation + 20);
  if (typeof addFloatingText === 'function') addFloatingText(width/2, height*0.3, 'Alliance formed with ' + nationKey + '!', '#44ff88');
  return true;
}

function breakAlliance(nationKey) {
  let allies = getAlliances();
  let idx = allies.indexOf(nationKey);
  if (idx === -1) return false;
  if (state.gold < 1000) return false;
  state.gold -= 1000;
  allies.splice(idx, 1);
  let rv = state.nations[nationKey];
  if (rv) {
    rv.allied = false;
    rv.reputation = Math.max(-100, rv.reputation - 50);
  }
  // Reputation penalty with all factions for betrayal
  for (let k in state.nations) {
    if (k !== nationKey && state.nations[k]) {
      state.nations[k].reputation = Math.max(-100, state.nations[k].reputation - 15);
    }
  }
  return true;
}

// Reputation price multiplier for trade
function getReputationPriceMult(nationKey) {
  if (!nationKey || !state.nations[nationKey]) return 1;
  let rep = state.nations[nationKey].reputation || 0;
  if (rep >= 50) return 1.2;
  if (rep >= 20) return 1.1;
  if (rep <= -50) return 0.7;
  if (rep <= -20) return 0.85;
  return 1;
}

// Alliance benefits
function getAllianceTradeBonus() {
  let allies = getAlliances();
  // +20% trade per alliance
  return 1 + allies.length * 0.2;
}

function canRequestMilitaryAid(nationKey) {
  return getAlliances().includes(nationKey);
}

// ═══ VICTORY CONDITIONS ═══

function getCapturedCapitals() {
  let count = 0;
  let captured = [];
  for (let k in state.nations) {
    let rv = state.nations[k];
    if (rv && rv.defeated) { count++; captured.push(k); }
  }
  return { count, captured };
}

function getControlledTradeHubs() {
  if (!state._controlledIslands) return [];
  let hubs = ['golden_bazaar', 'emporium', 'silk_road', 'amber_coast', 'spice_islands', 'ivory_port'];
  return state._controlledIslands.filter(id => hubs.includes(id));
}

function checkVictoryConditions() {
  if (!state._gameMode || state._gameMode === 'sandbox') return null;
  if (state._victoryAchieved) return null; // already won

  let victories = [];

  // Military Victory — 6 capitals captured
  let caps = getCapturedCapitals();
  if (caps.count >= 6) {
    victories.push('military');
  }

  // Economic Victory — 4 trade hubs + 100,000 gold
  let hubs = getControlledTradeHubs();
  if (hubs.length >= 4 && state.gold >= 100000) {
    victories.push('economic');
  }

  // Diplomatic Victory — Senate House + 4 alliances
  let allies = getAlliances();
  let hasSenate = state._controlledIslands && state._controlledIslands.includes('senate_house');
  if (hasSenate && allies.length >= 4) {
    victories.push('diplomatic');
  }

  // Domination Victory — any 2 of the above
  if (!state._victoriesEarned) state._victoriesEarned = [];
  for (let v of victories) {
    if (!state._victoriesEarned.includes(v)) state._victoriesEarned.push(v);
  }
  if (state._victoriesEarned.length >= 2) {
    return 'domination';
  }

  return victories.length > 0 ? victories[0] : null;
}

// Anti-stall mechanics
function checkAntiStall() {
  if (!state._gameMode || state._gameMode === 'sandbox') return;

  let caps = getCapturedCapitals();
  // Last Stand buff at 5 capitals
  if (caps.count >= 5 && !state._lastStandActive) {
    state._lastStandActive = true;
    for (let k in state.nations) {
      let rv = state.nations[k];
      if (rv && !rv.defeated) {
        rv._lastStandBuff = true; // +20% defense applied in combat
      }
    }
  }

  // Plunder the Rich at 4 hubs + 50k gold
  let hubs = getControlledTradeHubs();
  if (hubs.length >= 4 && state.gold >= 50000 && !state._plunderActive) {
    state._plunderActive = true;
    // All factions can raid player trade routes
  }

  // Break the Hegemony at Senate House + 3 alliances
  let allies = getAlliances();
  let hasSenate = state._controlledIslands && state._controlledIslands.includes('senate_house');
  if (hasSenate && allies.length >= 3 && !state._hegemonyActive) {
    state._hegemonyActive = true;
    // Unallied factions can declare war without penalty
  }
}

// Victory announcement
function triggerVictory(type) {
  state._victoryAchieved = type;
  let titles = {
    military: 'CONQUEROR',
    economic: 'TYRANT OF TRADE',
    diplomatic: 'FIRST AMONG EQUALS',
    domination: 'TRUE ROMAN'
  };
  state._victoryTitle = titles[type] || 'VICTOR';
  if (typeof addNotification === 'function') {
    addNotification('VICTORY! ' + state._victoryTitle, '#ffd700');
  }
}

// Update diplomacy each game day
function updateDiplomacy(dt) {
  // Check victory conditions periodically
  if (typeof frameCount !== 'undefined' && frameCount % 300 === 0) {
    let victory = checkVictoryConditions();
    if (victory) triggerVictory(victory);
    checkAntiStall();
  }

  // Alliance benefits — shared vision, trade bonus applied elsewhere
  let allies = getAlliances();
  for (let ak of allies) {
    let rv = state.nations[ak];
    if (rv && rv.defeated) {
      // Remove alliance if faction defeated
      let idx = allies.indexOf(ak);
      if (idx !== -1) allies.splice(idx, 1);
    }
  }
}

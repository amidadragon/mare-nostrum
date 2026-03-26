// ═══ SEA EVENTS — Random encounters while sailing ═══
// Triggers periodically when rowing; player picks a choice via number keys

const SEA_EVENTS = [
  {
    id: 'flotsam', weight: 3, minDay: 1,
    title: 'Floating Wreckage',
    desc: 'You spot debris from a wrecked vessel drifting among the waves.',
    choices: [
      { label: 'Salvage it', effect: 'flotsam_salvage' },
      { label: 'Sail on', effect: 'nothing' },
    ],
  },
  {
    id: 'merchant_ship', weight: 2, minDay: 3,
    title: 'Merchant Galley',
    desc: 'A merchant galley hails you, offering trade goods at a fair price.',
    choices: [
      { label: 'Trade (30g)', effect: 'merchant_trade', cost: { gold: 30 } },
      { label: 'Decline politely', effect: 'nothing' },
      { label: 'Demand their cargo', effect: 'merchant_rob' },
    ],
  },
  {
    id: 'pirates', weight: 2, minDay: 5,
    title: 'Pirate Ambush!',
    desc: 'A dark-sailed vessel bears down on you with hostile intent!',
    choices: [
      { label: 'Fight them off', effect: 'pirate_fight' },
      { label: 'Pay ransom (50g)', effect: 'pirate_ransom', cost: { gold: 50 } },
      { label: 'Try to outrun', effect: 'pirate_flee' },
    ],
  },
  {
    id: 'castaway', weight: 1, minDay: 2,
    title: 'Castaway',
    desc: 'A figure waves desperately from a tiny rock jutting out of the sea.',
    choices: [
      { label: 'Rescue them', effect: 'castaway_rescue' },
      { label: 'Sail past', effect: 'nothing' },
    ],
  },
  {
    id: 'sea_shrine', weight: 1, minDay: 4,
    title: 'Shrine of Neptune',
    desc: 'A weathered stone shrine rises from a reef, garlands of seaweed draped over it.',
    choices: [
      { label: 'Offer gold (20g)', effect: 'shrine_offer', cost: { gold: 20 } },
      { label: 'Pray silently', effect: 'shrine_pray' },
      { label: 'Ignore it', effect: 'nothing' },
    ],
  },
  {
    id: 'storm_debris', weight: 2, minDay: 3,
    title: 'Storm Aftermath',
    desc: 'The sea is littered with cargo from a storm-wrecked fleet.',
    choices: [
      { label: 'Search the debris', effect: 'storm_search' },
      { label: 'Too risky, move on', effect: 'nothing' },
    ],
  },
  {
    id: 'dolphins_guide', weight: 1, minDay: 1,
    title: 'Dolphins at the Bow',
    desc: 'A pod of dolphins leaps alongside your ship, guiding you onward.',
    choices: [
      { label: 'Follow them', effect: 'dolphin_follow' },
      { label: 'Admire and sail on', effect: 'dolphin_morale' },
    ],
  },
  {
    id: 'fog_bank', weight: 2, minDay: 6,
    title: 'Dense Fog Bank',
    desc: 'An impenetrable fog rolls in. Strange sounds echo from within.',
    choices: [
      { label: 'Navigate through', effect: 'fog_navigate' },
      { label: 'Wait for it to pass', effect: 'fog_wait' },
      { label: 'Turn back', effect: 'nothing' },
    ],
  },
  {
    id: 'whale_sighting', weight: 1, minDay: 2,
    title: 'Great Whale',
    desc: 'An enormous whale surfaces beside your vessel, its eye regarding you calmly.',
    choices: [
      { label: 'Marvel at it', effect: 'whale_marvel' },
      { label: 'Harvest ambergris', effect: 'whale_harvest' },
    ],
  },
  {
    id: 'naval_patrol', weight: 2, minDay: 8,
    title: 'Naval Patrol',
    desc: 'A warship flying foreign colors approaches to inspect your vessel.',
    choices: [
      { label: 'Submit to inspection', effect: 'patrol_submit' },
      { label: 'Show diplomatic papers', effect: 'patrol_diplomacy' },
      { label: 'Flee', effect: 'patrol_flee' },
    ],
  },
];

// ─── STATE ───
let _seaEventState = {
  active: false,
  event: null,
  choiceIdx: -1,
  resultText: '',
  resultTimer: 0,
  cooldown: 0, // frames until next event can trigger
};

// ─── TRIGGER CHECK — called from updateRowing ───
function checkSeaEvent() {
  if (_seaEventState.active || _seaEventState.cooldown > 0) return;
  if (!state.rowing || !state.rowing.active) return;
  if (state.rowing.speed < 1) return; // must be actually sailing
  if (state.rowing.nearIsle) return; // not near an island
  if (state.conquest && state.conquest.active) return;

  // Random chance per frame (~1 event per 45-90 seconds of sailing)
  let chance = 0.0003;
  // Reduce frequency early game
  if ((state.day || 1) < 3) chance *= 0.3;
  if (Math.random() > chance) return;

  // Pick weighted random event
  let day = state.day || 1;
  let eligible = SEA_EVENTS.filter(e => day >= e.minDay);
  if (eligible.length === 0) return;

  let totalWeight = 0;
  for (let e of eligible) totalWeight += e.weight;
  let roll = Math.random() * totalWeight;
  let picked = eligible[0];
  for (let e of eligible) {
    roll -= e.weight;
    if (roll <= 0) { picked = e; break; }
  }

  _seaEventState.active = true;
  _seaEventState.event = picked;
  _seaEventState.choiceIdx = -1;
  _seaEventState.resultText = '';
  _seaEventState.resultTimer = 0;

  // Slow the ship when event triggers
  if (state.rowing) state.rowing.speed *= 0.3;
}

// ─── CHOICE HANDLER ───
function handleSeaEventChoice(idx) {
  let evt = _seaEventState.event;
  if (!evt || idx < 0 || idx >= evt.choices.length) return;
  let choice = evt.choices[idx];

  // Check cost
  if (choice.cost) {
    if (choice.cost.gold && state.gold < choice.cost.gold) {
      _seaEventState.resultText = 'Not enough gold!';
      _seaEventState.resultTimer = 90;
      return;
    }
    if (choice.cost.gold) state.gold -= choice.cost.gold;
  }

  _seaEventState.choiceIdx = idx;
  let result = resolveSeaEvent(choice.effect);
  _seaEventState.resultText = result;
  _seaEventState.resultTimer = 150; // show result for ~2.5 seconds
}

function resolveSeaEvent(effect) {
  switch (effect) {
    case 'nothing':
      return 'You sail on.';

    case 'flotsam_salvage': {
      let loot = Math.floor(10 + Math.random() * 20);
      state.gold += loot;
      let woodLoot = Math.floor(2 + Math.random() * 5);
      if (state.resources) state.resources.wood = (state.resources.wood || 0) + woodLoot;
      return 'Found ' + loot + ' gold and ' + woodLoot + ' wood!';
    }

    case 'merchant_trade': {
      // Get a random useful resource
      let goods = ['wood', 'stone', 'seeds', 'crystal'];
      let g = goods[Math.floor(Math.random() * goods.length)];
      let qty = Math.floor(5 + Math.random() * 10);
      if (state.resources) state.resources[g] = (state.resources[g] || 0) + qty;
      else state[g] = (state[g] || 0) + qty;
      return 'Traded for ' + qty + ' ' + g + '!';
    }

    case 'merchant_rob': {
      if (Math.random() < 0.5) {
        let loot = Math.floor(30 + Math.random() * 40);
        state.gold += loot;
        // Rep penalty with all nations
        for (let k in state.nations) {
          if (state.nations[k]) state.nations[k].reputation = Math.max(-100, (state.nations[k].reputation || 0) - 5);
        }
        return 'Seized ' + loot + ' gold! Your reputation suffers.';
      } else {
        let loss = Math.floor(10 + Math.random() * 15);
        state.gold = Math.max(0, state.gold - loss);
        return 'They fought back! Lost ' + loss + ' gold in the skirmish.';
      }
    }

    case 'pirate_fight': {
      let armySize = (state.legia && state.legia.army) ? state.legia.army.length : 0;
      let soldiers = (state.legia && state.legia.soldiers) ? state.legia.soldiers : 0;
      let power = armySize * 10 + soldiers * 5;
      if (power > 20 || Math.random() < 0.4) {
        let loot = Math.floor(20 + Math.random() * 50);
        state.gold += loot;
        if (typeof grantXP === 'function') grantXP(15);
        return 'Victory! Plundered ' + loot + ' gold from the pirates!';
      } else {
        let loss = Math.floor(15 + Math.random() * 25);
        state.gold = Math.max(0, state.gold - loss);
        return 'Defeated! The pirates take ' + loss + ' gold.';
      }
    }

    case 'pirate_ransom':
      return 'The pirates accept your ransom and sail away.';

    case 'pirate_flee': {
      if (state.rowing && state.rowing.speed > 2 || Math.random() < 0.6) {
        return 'You outrun the pirates!';
      } else {
        let loss = Math.floor(20 + Math.random() * 20);
        state.gold = Math.max(0, state.gold - loss);
        return 'They caught you! Lost ' + loss + ' gold.';
      }
    }

    case 'castaway_rescue': {
      if (typeof grantXP === 'function') grantXP(10);
      // Small chance of special reward
      if (Math.random() < 0.3) {
        let bonus = Math.floor(30 + Math.random() * 30);
        state.gold += bonus;
        return 'The castaway is a merchant! Rewards you with ' + bonus + ' gold.';
      }
      // Rep boost
      for (let k in state.nations) {
        if (state.nations[k] && Math.random() < 0.4) state.nations[k].reputation = Math.min(100, (state.nations[k].reputation || 0) + 3);
      }
      return 'Rescued! +10 XP. Your kindness spreads.';
    }

    case 'shrine_offer': {
      // Neptune's blessing — speed boost and luck
      if (typeof addNotification === 'function') addNotification('Neptune blesses your voyage!', '#44aadd');
      if (state.rowing) state.rowing.speed = Math.min(5, state.rowing.speed + 1);
      if (typeof grantXP === 'function') grantXP(8);
      return 'Neptune smiles upon you! Speed increased.';
    }

    case 'shrine_pray': {
      if (Math.random() < 0.5) {
        if (typeof grantXP === 'function') grantXP(5);
        return 'You feel a calm serenity wash over you. +5 XP.';
      }
      return 'The sea god does not answer today.';
    }

    case 'storm_search': {
      if (Math.random() < 0.7) {
        let loot = Math.floor(15 + Math.random() * 30);
        state.gold += loot;
        let wood = Math.floor(3 + Math.random() * 8);
        if (state.resources) state.resources.wood = (state.resources.wood || 0) + wood;
        return 'Found ' + loot + ' gold and ' + wood + ' wood in the wreckage!';
      } else {
        // Minor damage/loss
        return 'The debris held nothing of value.';
      }
    }

    case 'dolphin_follow': {
      if (typeof grantXP === 'function') grantXP(5);
      // Reveal nearest undiscovered island
      return 'The dolphins lead you toward safe waters. +5 XP.';
    }

    case 'dolphin_morale': {
      if (typeof grantXP === 'function') grantXP(3);
      return 'A beautiful sight. Crew morale rises. +3 XP.';
    }

    case 'fog_navigate': {
      if (Math.random() < 0.5) {
        let loot = Math.floor(20 + Math.random() * 30);
        state.gold += loot;
        return 'Found a hidden cove with ' + loot + ' gold!';
      } else {
        return 'Navigated through safely. Nothing found.';
      }
    }

    case 'fog_wait': {
      return 'The fog clears after an hour. You continue safely.';
    }

    case 'whale_marvel': {
      if (typeof grantXP === 'function') grantXP(8);
      return 'An awe-inspiring encounter. +8 XP.';
    }

    case 'whale_harvest': {
      let qty = Math.floor(2 + Math.random() * 3);
      state.gold += qty * 10;
      return 'Collected ' + qty + ' ambergris worth ' + (qty * 10) + ' gold.';
    }

    case 'patrol_submit': {
      if (Math.random() < 0.8) {
        return 'Papers in order. They let you pass.';
      } else {
        let fine = Math.floor(10 + Math.random() * 20);
        state.gold = Math.max(0, state.gold - fine);
        return 'They confiscate ' + fine + ' gold in "tariffs."';
      }
    }

    case 'patrol_diplomacy': {
      let allies = (typeof getAlliances === 'function') ? getAlliances() : [];
      if (allies.length > 0 || Math.random() < 0.5) {
        return 'Your diplomatic connections impress them. Passage granted.';
      }
      let fine = Math.floor(15 + Math.random() * 15);
      state.gold = Math.max(0, state.gold - fine);
      return 'They see through your bluff. ' + fine + ' gold confiscated.';
    }

    case 'patrol_flee': {
      if (state.rowing && state.rowing.speed > 2.5) {
        return 'Your swift vessel leaves them in your wake!';
      }
      let fine = Math.floor(25 + Math.random() * 25);
      state.gold = Math.max(0, state.gold - fine);
      for (let k in state.nations) {
        if (state.nations[k]) state.nations[k].reputation = Math.max(-100, (state.nations[k].reputation || 0) - 3);
      }
      return 'Caught! Fined ' + fine + ' gold. Reputation damaged.';
    }

    default:
      return 'Nothing happens.';
  }
}

// ─── CLOSE EVENT ───
function closeSeaEvent() {
  _seaEventState.active = false;
  _seaEventState.event = null;
  _seaEventState.cooldown = 1800; // ~30 seconds at 60fps
}

// ─── UPDATE (called each frame) ───
function updateSeaEvents() {
  if (_seaEventState.cooldown > 0) _seaEventState.cooldown--;
  if (_seaEventState.resultTimer > 0) {
    _seaEventState.resultTimer--;
    if (_seaEventState.resultTimer <= 0) closeSeaEvent();
  }
}

// ─── DRAW UI ───
function drawSeaEventUI() {
  if (!_seaEventState.active || !_seaEventState.event) return;
  let evt = _seaEventState.event;

  let pw = min(380, width - 40), ph = 0;
  let lineH = 18;
  let descLines = Math.ceil(evt.desc.length / 40);
  ph = 50 + descLines * 14 + evt.choices.length * lineH + 30;
  if (_seaEventState.choiceIdx >= 0) ph = 120; // result mode is smaller

  let px = width / 2 - pw / 2, py = height / 2 - ph / 2;

  noStroke();
  // Backdrop dim
  fill(0, 0, 0, 120); rect(0, 0, width, height);

  // Panel
  fill(18, 15, 10, 235); rect(px, py, pw, ph, 6);
  stroke(180, 160, 100, 140); strokeWeight(1.5); noFill();
  rect(px + 1, py + 1, pw - 2, ph - 2, 5); noStroke();

  if (_seaEventState.choiceIdx >= 0) {
    // ── Result mode ──
    fill(240, 220, 160); textSize(13); textAlign(CENTER, TOP);
    text(evt.title, px + pw / 2, py + 12);
    fill(200, 190, 150); textSize(10);
    text(_seaEventState.resultText, px + pw / 2, py + 34);
    fill(120, 110, 90); textSize(8);
    let remaining = Math.ceil(_seaEventState.resultTimer / 60);
    text('Continuing in ' + remaining + 's...', px + pw / 2, py + ph - 20);
  } else {
    // ── Choice mode ──
    // Title
    let titleCol = evt.id === 'pirates' ? [220, 80, 60] : evt.id === 'dolphins_guide' ? [80, 200, 220] : [240, 220, 160];
    fill(titleCol[0], titleCol[1], titleCol[2]); textSize(13); textAlign(CENTER, TOP);
    text(evt.title, px + pw / 2, py + 12);

    // Description
    fill(190, 180, 150); textSize(10); textAlign(LEFT, TOP);
    text(evt.desc, px + 18, py + 34, pw - 36, 60);

    // Choices
    let cy = py + 34 + descLines * 14 + 10;
    for (let i = 0; i < evt.choices.length; i++) {
      let ch = evt.choices[i];
      let canAfford = true;
      if (ch.cost && ch.cost.gold && state.gold < ch.cost.gold) canAfford = false;
      fill(canAfford ? 220 : 90, canAfford ? 210 : 80, canAfford ? 170 : 65);
      textSize(10); textAlign(LEFT, TOP);
      text('[' + (i + 1) + '] ' + ch.label, px + 22, cy);
      cy += lineH;
    }
    fill(120, 110, 90); textSize(8);
    text('[ESC] Ignore', px + 22, cy + 4);
  }
  textAlign(LEFT, TOP);
}

// ─── INPUT HANDLER (called from keyPressed) ───
function handleSeaEventKey(k, kCode) {
  if (!_seaEventState.active || !_seaEventState.event) return false;

  // If showing result, any key closes
  if (_seaEventState.choiceIdx >= 0) {
    closeSeaEvent();
    return true;
  }

  // ESC to dismiss
  if (kCode === 27) { closeSeaEvent(); return true; }

  // Number keys for choices
  let evt = _seaEventState.event;
  let num = parseInt(k);
  if (num >= 1 && num <= evt.choices.length) {
    handleSeaEventChoice(num - 1);
    return true;
  }

  return true; // consume all keys while event is open
}

function isSeaEventActive() { return _seaEventState.active; }

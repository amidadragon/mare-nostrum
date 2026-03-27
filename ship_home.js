// ═══════════════════════════════════════════════════════════════════════════
// SHIP HOME — Sea Peoples live on their ship, not an island
// Provides: ship deck as walkable surface, below-deck interior rooms,
// helm-to-sail transition, NPC stations, and ship upgrade system.
// Mirrors the TEMPLE_ROOM / insideTemple pattern for below-deck.
// ═══════════════════════════════════════════════════════════════════════════

// ─── SHIP DECK CONSTANTS ────────────────────────────────────────────────
// The "island" for Sea Peoples — a large walkable ship deck in world coords.
// Player spawns here instead of on an island. Ship floats in open ocean.
const SHIP_DECK = {
  cx: 0,       // world center X (ship position)
  cy: 0,       // world center Y
  hw: 140,     // half-width of walkable deck (bow to stern)
  hh: 45,      // half-height (port to starboard)
  bowX: 160,   // bow tip extends past hw
  sternX: -150 // stern extends behind
};

// Below-deck interior room (like TEMPLE_ROOM)
const BELOW_DECK = {
  cx: 800, cy: -600, hw: 200, hh: 120
};

// NPC stations on the ship deck (world-relative to SHIP_DECK.cx/cy)
const SHIP_STATIONS = {
  helm:      { ox: -120, oy: 0,   label: '[E] Take the Helm',     action: 'helm' },
  hatch:     { ox: 0,    oy: 0,   label: '[E] Go Below Deck',     action: 'below_deck' },
  bowLookout:{ ox: 140,  oy: 0,   label: '[E] Scout Ahead',       action: 'scout' },
  portGunnel:{ ox: 30,   oy: -35, label: '[E] Fish',              action: 'fish' },
  shrine:    { ox: -60,  oy: 20,  label: '[E] Pray to Dagon',     action: 'shrine' }
};

// Below-deck room stations
const BELOW_DECK_STATIONS = {
  hold:     { ox: -140, oy: 0,   label: '[E] Storage Hold',   action: 'hold' },
  forge:    { ox: -60,  oy: -60, label: '[E] Ship Forge',     action: 'forge' },
  captain:  { ox: 140,  oy: 0,   label: '[E] Captain\'s Quarters', action: 'captain' },
  shrine:   { ox: 60,   oy: -60, label: '[E] Shrine of Dagon',    action: 'dagon' },
  exit:     { ox: 0,    oy: 100, label: '',                        action: 'exit_below' }
};

// Ship upgrade tiers (replaces buildings for Sea Peoples)
const SHIP_UPGRADES = [
  { id: 'reinforced_hull', name: 'Reinforced Hull',     cost: { wood: 40, gold: 20 },  desc: '+20% ship HP',           icon: 'hull' },
  { id: 'extra_oars',      name: 'Extra Oar Banks',     cost: { wood: 30, gold: 15 },  desc: '+15% sail speed',        icon: 'oar' },
  { id: 'crows_nest',      name: "Crow's Nest",         cost: { wood: 25, gold: 10 },  desc: '+30% scout range',       icon: 'eye' },
  { id: 'iron_ram',        name: 'Iron Ram',            cost: { iron: 35, gold: 25 },  desc: '+25% boarding damage',   icon: 'ram' },
  { id: 'cargo_hold',      name: 'Expanded Cargo Hold', cost: { wood: 50, gold: 30 },  desc: '+50% storage capacity',  icon: 'crate' },
  { id: 'dagon_altar',     name: 'Altar of Dagon',      cost: { crystal: 15, gold: 40 }, desc: 'Unlock Dread Tide ability', icon: 'altar' }
];

// Sea Peoples color palette (pulled from FACTIONS.seapeople + world.js biome)
var _SP = {
  hull:     [28, 25, 30],
  deck:     [55, 48, 40],
  deckLight:[70, 62, 52],
  mast:     [65, 55, 42],
  sail:     [45, 38, 50],
  sailGlyph:[140, 45, 30],
  rope:     [90, 80, 60],
  trim:     [80, 60, 50],
  blood:    [140, 45, 30],
  water:    [18, 35, 65],
  foam:     [180, 200, 220]
};

// ─── STATE HELPERS ──────────────────────────────────────────────────────
function isSeaPeoplesFaction() {
  return state && (state.faction === 'seapeople');
}

function isOnShipDeck() {
  return state && state.onShipDeck === true;
}

function isBelowDeck() {
  return state && state.belowDeck === true;
}

// Check if a world point is on the ship deck surface (elliptical hull shape)
function isOnShipSurface(wx, wy) {
  if (!isOnShipDeck()) return false;
  var S = SHIP_DECK;
  var dx = (wx - S.cx) / S.hw;
  var dy = (wy - S.cy) / S.hh;
  return (dx * dx + dy * dy) <= 1.1; // slight padding
}

// ─── INIT ───────────────────────────────────────────────────────────────
// Called from progression.js or sketch.js setup when faction === seapeople
function initShipHome() {
  if (!state) return;
  state.onShipDeck = true;
  state.belowDeck = false;
  state.shipUpgrades = state.shipUpgrades || [];
  state._belowDeckReturnX = 0;
  state._belowDeckReturnY = 0;

  // Sea Peoples start in open water — pick a random ocean position
  // away from the home island (centered ~600,400) but within world bounds
  if (!state.shipWorldX && !state.shipWorldY) {
    // Start southeast of the world center, in open Mediterranean
    var angle = Math.random() * Math.PI * 2;
    var dist = 1500 + Math.random() * 1500;  // 1500-3000 pixels from center
    state.shipWorldX = 600 + Math.cos(angle) * dist;
    state.shipWorldY = 400 + Math.sin(angle) * dist;
  }
  SHIP_DECK.cx = state.shipWorldX;
  SHIP_DECK.cy = state.shipWorldY;

  // Place player on stern (near helm)
  state.player.x = SHIP_DECK.cx - 80;
  state.player.y = SHIP_DECK.cy;

  // Set camera to ship position
  if (typeof cam !== 'undefined') {
    cam.x = state.player.x; cam.y = state.player.y;
  }
  if (typeof camSmooth !== 'undefined') {
    camSmooth.x = state.player.x; camSmooth.y = state.player.y;
  }

  // Relocate NPCs to below-deck positions (Sea Peoples have no island)
  relocateNPCsToBelowDeck();
}

// Move the 4 main NPCs (Livia, Marcus, Vesta, Felix) into the below-deck room
// so Sea Peoples can interact with them in their ship interior
function relocateNPCsToBelowDeck() {
  if (!state) return;
  var R = BELOW_DECK;
  // Livia — near the captain's quarters (right side)
  if (state.npc) {
    state.npc.x = R.cx + 100;
    state.npc.y = R.cy + 30;
  }
  // Marcus — near the hold / storage (left side, front)
  if (state.marcus) {
    state.marcus.x = R.cx - 100;
    state.marcus.y = R.cy + 40;
    state.marcus.present = true; // always present on the ship
  }
  // Vesta — near the shrine (upper right)
  if (state.vesta) {
    state.vesta.x = R.cx + 40;
    state.vesta.y = R.cy - 50;
  }
  // Felix — near the forge (upper left)
  if (state.felix) {
    state.felix.x = R.cx - 40;
    state.felix.y = R.cy - 40;
  }
  // Mark all NPCs as found for Sea Peoples (crew is already aboard)
  if (state.progression) {
    state.progression.npcsFound = state.progression.npcsFound || {};
    state.progression.npcsFound.marcus = true;
    state.progression.npcsFound.vesta = true;
    state.progression.npcsFound.felix = true;
    state.progression.homeIslandReached = true;
  }
}

// ─── ENTER / EXIT BELOW DECK ────────────────────────────────────────────
function enterBelowDeck() {
  if (!state || state.belowDeck) return;
  if (snd) snd.playSFX('door_creak');
  state.player.vx = 0; state.player.vy = 0; state.player.moving = false;
  state._belowDeckReturnX = state.player.x;
  state._belowDeckReturnY = state.player.y;
  if (typeof startDoorTransition === 'function') {
    startDoorTransition(function() {
      state.belowDeck = true;
      state.onShipDeck = false;
      state.player.x = BELOW_DECK.cx;
      state.player.y = BELOW_DECK.cy + BELOW_DECK.hh * 0.5;
      state.player.vx = 0; state.player.vy = 0; state.player.moving = false;
      camSmooth.x = BELOW_DECK.cx;
      camSmooth.y = BELOW_DECK.cy - height * 0.06;
      addFloatingText(width / 2, height * 0.3, 'Below Deck', '#8c5a30');
    });
  } else {
    state.belowDeck = true;
    state.onShipDeck = false;
    state.player.x = BELOW_DECK.cx;
    state.player.y = BELOW_DECK.cy + BELOW_DECK.hh * 0.5;
  }
}

function exitBelowDeck() {
  if (!state || !state.belowDeck) return;
  if (snd) snd.playSFX('door_close');
  var rx = state._belowDeckReturnX || SHIP_DECK.cx;
  var ry = state._belowDeckReturnY || SHIP_DECK.cy;
  if (typeof startDoorTransition === 'function') {
    startDoorTransition(function() {
      state.belowDeck = false;
      state.onShipDeck = true;
      state.player.x = rx; state.player.y = ry;
      camSmooth.x = rx; camSmooth.y = ry - height * 0.12;
    });
  } else {
    state.belowDeck = false;
    state.onShipDeck = true;
    state.player.x = rx; state.player.y = ry;
  }
}

// ─── SHIP DECK INTERACTION (called from input.js on E press) ────────────
function handleShipDeckInteraction() {
  if (!isOnShipDeck()) return false;
  var p = state.player;
  if (!p) return false;
  // Check each station
  for (var key in SHIP_STATIONS) {
    var st = SHIP_STATIONS[key];
    var sx = SHIP_DECK.cx + st.ox, sy = SHIP_DECK.cy + st.oy;
    if (dist(p.x, p.y, sx, sy) < 35) {
      switch (st.action) {
        case 'helm':
          // Enter sailing mode
          if (typeof enterSailingFromHelm === 'function') {
            enterSailingFromHelm();
          } else {
            addFloatingText(w2sX(p.x), w2sY(p.y) - 20, 'Helm ready — sail system loading', '#ffd080');
          }
          return true;
        case 'below_deck':
          enterBelowDeck();
          return true;
        case 'scout':
          addFloatingText(w2sX(p.x), w2sY(p.y) - 20, 'Scanning the horizon...', '#aaccff');
          // TODO: open sea map or reveal nearby ships
          return true;
        case 'fish':
          if (typeof startFishing === 'function') {
            startFishing();
          } else {
            addFloatingText(w2sX(p.x), w2sY(p.y) - 20, 'Cast the net...', '#88bbcc');
          }
          return true;
        case 'shrine':
          // Mini shrine on deck — small offering
          if (state.crystals >= 3) {
            state.crystals -= 3;
            state.solarBlessings = (state.solarBlessings || 0) + 15;
            addFloatingText(w2sX(p.x), w2sY(p.y) - 20, '+15 Blessings of Dagon', '#cc4422');
            if (snd) snd.playSFX('blessing');
          } else {
            addFloatingText(w2sX(p.x), w2sY(p.y) - 20, 'Need 3 crystals to offer', '#aa6644');
          }
          return true;
      }
    }
  }
  return false;
}

// ─── BELOW-DECK INTERACTION ─────────────────────────────────────────────
function handleBelowDeckInteraction() {
  if (!isBelowDeck()) return false;
  var p = state.player;
  if (!p) return false;
  for (var key in BELOW_DECK_STATIONS) {
    var st = BELOW_DECK_STATIONS[key];
    var sx = BELOW_DECK.cx + st.ox, sy = BELOW_DECK.cy + st.oy;
    if (dist(p.x, p.y, sx, sy) < 35) {
      switch (st.action) {
        case 'hold':
          addFloatingText(w2sX(p.x), w2sY(p.y) - 20, 'Storage Hold — resources safe', '#aa9966');
          return true;
        case 'forge':
          // Open ship upgrade menu
          if (typeof openShipForge === 'function') {
            openShipForge();
          } else {
            addFloatingText(w2sX(p.x), w2sY(p.y) - 20, 'Ship Forge — upgrades available', '#cc8833');
          }
          return true;
        case 'captain':
          addFloatingText(w2sX(p.x), w2sY(p.y) - 20, 'Captain\'s Quarters — plan your raids', '#ddaa55');
          return true;
        case 'dagon':
          // Same as temple altar but Dagon themed
          if (state.crystals >= 5) {
            state.crystals -= 5;
            state.solarBlessings = (state.solarBlessings || 0) + 25;
            addFloatingText(w2sX(p.x), w2sY(p.y) - 20, '+25 Blessings of Dagon', '#cc2200');
            if (snd) snd.playSFX('blessing');
          } else {
            addFloatingText(w2sX(p.x), w2sY(p.y) - 20, 'Need 5 crystals', '#aa6644');
          }
          return true;
        case 'exit_below':
          // Handled by walkout detection (like temple)
          return false;
      }
    }
  }
  return false;
}

// ─── SHIP FORGE (upgrade menu) ──────────────────────────────────────────
function openShipForge() {
  // Show next available upgrade
  var ups = state.shipUpgrades || [];
  var nextIdx = ups.length;
  if (nextIdx >= SHIP_UPGRADES.length) {
    if (typeof addFloatingText === 'function')
      addFloatingText(width / 2, height * 0.3, 'Ship fully upgraded!', '#ffcc44');
    return;
  }
  var upg = SHIP_UPGRADES[nextIdx];
  var cost = upg.cost || {};
  // Check all required resources
  var canAfford = true;
  var missing = [];
  if (cost.gold  && (state.gold || 0) < cost.gold)       { canAfford = false; missing.push(cost.gold + ' gold'); }
  if (cost.wood  && (state.wood || 0) < cost.wood)       { canAfford = false; missing.push(cost.wood + ' wood'); }
  if (cost.iron  && (state.iron || 0) < cost.iron)       { canAfford = false; missing.push(cost.iron + ' iron'); }
  if (cost.crystal && (state.crystals || 0) < cost.crystal) { canAfford = false; missing.push(cost.crystal + ' crystals'); }

  if (canAfford) {
    if (cost.gold)    state.gold -= cost.gold;
    if (cost.wood)    state.wood -= cost.wood;
    if (cost.iron)    state.iron -= cost.iron;
    if (cost.crystal) state.crystals -= cost.crystal;
    ups.push(upg.id);
    state.shipUpgrades = ups;
    if (typeof addFloatingText === 'function')
      addFloatingText(width / 2, height * 0.3, upg.name + ' installed! ' + upg.desc, '#ffcc44');
    if (snd) snd.playSFX('upgrade');
  } else {
    if (typeof addFloatingText === 'function')
      addFloatingText(width / 2, height * 0.3, upg.name + ': need ' + missing.join(', '), '#ff6644');
  }
}

// Ship fishing (called from deck shrine interaction or a timed interval)
var _fishTimer = 0;
function updateShipFishing(dt) {
  if (!isSeaPeoplesFaction()) return;
  if (!state.onShipDeck) return;  // only fish while on deck
  _fishTimer += dt;
  // Every ~15 seconds on deck: passive food from the sea
  if (_fishTimer > 900) {
    _fishTimer = 0;
    var fishYield = 3 + Math.floor(Math.random() * 3);
    if ((state.shipUpgrades || []).indexOf('cargo_hold') >= 0) fishYield += 2;
    state.harvest = (state.harvest || 0) + fishYield;
    if (typeof addFloatingText === 'function')
      addFloatingText(width / 2, height * 0.65, '+' + fishYield + ' fish caught', '#88bbcc');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDERING — SHIP DECK (top-down, large-scale walkable ship)
// ═══════════════════════════════════════════════════════════════════════════
function drawShipDeck() {
  var S = SHIP_DECK;
  var ft = frameCount;
  var cx = S.cx, cy = S.cy;

  push();

  // ── Ocean water around ship ──
  // (main ocean is drawn by environment.js, but we add local wake/ripples)
  noStroke();
  for (var wi = 0; wi < 8; wi++) {
    var waveOff = sin(ft * 0.02 + wi * 1.5) * 12;
    var wy = cy - S.hh - 20 + wi * (S.hh * 2 + 40) / 8;
    fill(_SP.foam[0], _SP.foam[1], _SP.foam[2], 25 + sin(ft * 0.03 + wi) * 15);
    ellipse(w2sX(cx + waveOff), w2sY(wy), S.hw * 2.8, 6);
  }

  // ── HULL (dark longship shape — elongated ellipse with pointed bow/stern) ──
  noStroke();
  // Hull shadow
  fill(0, 0, 0, 40);
  beginShape();
  vertex(w2sX(cx + S.sternX + 5), w2sY(cy + 5));
  bezierVertex(
    w2sX(cx + S.sternX * 0.3), w2sY(cy + S.hh + 15),
    w2sX(cx + S.bowX * 0.3), w2sY(cy + S.hh + 15),
    w2sX(cx + S.bowX + 5), w2sY(cy + 5)
  );
  bezierVertex(
    w2sX(cx + S.bowX * 0.3), w2sY(cy - S.hh + 15),
    w2sX(cx + S.sternX * 0.3), w2sY(cy - S.hh + 15),
    w2sX(cx + S.sternX + 5), w2sY(cy + 5)
  );
  endShape(CLOSE);

  // Hull body
  fill(_SP.hull[0], _SP.hull[1], _SP.hull[2]);
  beginShape();
  vertex(w2sX(cx + S.sternX), w2sY(cy));
  bezierVertex(
    w2sX(cx + S.sternX * 0.3), w2sY(cy + S.hh + 8),
    w2sX(cx + S.bowX * 0.3), w2sY(cy + S.hh + 8),
    w2sX(cx + S.bowX), w2sY(cy)
  );
  bezierVertex(
    w2sX(cx + S.bowX * 0.3), w2sY(cy - S.hh - 8),
    w2sX(cx + S.sternX * 0.3), w2sY(cy - S.hh - 8),
    w2sX(cx + S.sternX), w2sY(cy)
  );
  endShape(CLOSE);

  // Hull strake (blood-red line)
  stroke(_SP.blood[0], _SP.blood[1], _SP.blood[2], 160);
  strokeWeight(2);
  noFill();
  beginShape();
  vertex(w2sX(cx + S.sternX + 10), w2sY(cy));
  bezierVertex(
    w2sX(cx + S.sternX * 0.3), w2sY(cy + S.hh + 2),
    w2sX(cx + S.bowX * 0.3), w2sY(cy + S.hh + 2),
    w2sX(cx + S.bowX - 10), w2sY(cy)
  );
  endShape();
  beginShape();
  vertex(w2sX(cx + S.sternX + 10), w2sY(cy));
  bezierVertex(
    w2sX(cx + S.sternX * 0.3), w2sY(cy - S.hh - 2),
    w2sX(cx + S.bowX * 0.3), w2sY(cy - S.hh - 2),
    w2sX(cx + S.bowX - 10), w2sY(cy)
  );
  endShape();
  noStroke();

  // ── DECK PLANKS ──
  fill(_SP.deck[0], _SP.deck[1], _SP.deck[2]);
  beginShape();
  vertex(w2sX(cx + S.sternX + 20), w2sY(cy));
  bezierVertex(
    w2sX(cx + S.sternX * 0.2), w2sY(cy + S.hh - 2),
    w2sX(cx + S.bowX * 0.2), w2sY(cy + S.hh - 2),
    w2sX(cx + S.bowX - 15), w2sY(cy)
  );
  bezierVertex(
    w2sX(cx + S.bowX * 0.2), w2sY(cy - S.hh + 2),
    w2sX(cx + S.sternX * 0.2), w2sY(cy - S.hh + 2),
    w2sX(cx + S.sternX + 20), w2sY(cy)
  );
  endShape(CLOSE);

  // Plank lines (horizontal)
  stroke(_SP.deckLight[0], _SP.deckLight[1], _SP.deckLight[2], 40);
  strokeWeight(0.5);
  for (var pl = -S.hh + 8; pl < S.hh - 5; pl += 8) {
    var plankW = S.hw * (1 - abs(pl / S.hh) * 0.5); // narrower at edges
    line(w2sX(cx - plankW), w2sY(cy + pl), w2sX(cx + plankW), w2sY(cy + pl));
  }
  noStroke();

  // ── GUNWALE (raised edge) ──
  stroke(_SP.trim[0], _SP.trim[1], _SP.trim[2]);
  strokeWeight(3);
  noFill();
  beginShape();
  vertex(w2sX(cx + S.sternX + 20), w2sY(cy));
  bezierVertex(
    w2sX(cx + S.sternX * 0.2), w2sY(cy + S.hh - 2),
    w2sX(cx + S.bowX * 0.2), w2sY(cy + S.hh - 2),
    w2sX(cx + S.bowX - 15), w2sY(cy)
  );
  endShape();
  beginShape();
  vertex(w2sX(cx + S.sternX + 20), w2sY(cy));
  bezierVertex(
    w2sX(cx + S.sternX * 0.2), w2sY(cy - S.hh + 2),
    w2sX(cx + S.bowX * 0.2), w2sY(cy - S.hh + 2),
    w2sX(cx + S.bowX - 15), w2sY(cy)
  );
  endShape();
  noStroke();

  // ── MAST + SAIL ──
  var mastX = cx + 20, mastY = cy;
  // Mast
  fill(_SP.mast[0], _SP.mast[1], _SP.mast[2]);
  rect(w2sX(mastX - 2), w2sY(mastY - 50), 4, 70);
  // Yardarm
  fill(_SP.mast[0] * 0.9, _SP.mast[1] * 0.9, _SP.mast[2] * 0.9);
  rect(w2sX(mastX - 30), w2sY(mastY - 48), 60, 3);
  // Sail (billowing based on wind)
  var sailBillow = sin(ft * 0.015) * 4 + 4;
  fill(_SP.sail[0], _SP.sail[1], _SP.sail[2], 200);
  beginShape();
  vertex(w2sX(mastX - 28), w2sY(mastY - 46));
  bezierVertex(
    w2sX(mastX - 15), w2sY(mastY - 46 + sailBillow),
    w2sX(mastX + 15), w2sY(mastY - 46 + sailBillow + 2),
    w2sX(mastX + 28), w2sY(mastY - 46)
  );
  vertex(w2sX(mastX + 28), w2sY(mastY - 10));
  bezierVertex(
    w2sX(mastX + 15), w2sY(mastY - 10 + sailBillow * 0.5),
    w2sX(mastX - 15), w2sY(mastY - 10 + sailBillow * 0.5),
    w2sX(mastX - 28), w2sY(mastY - 10)
  );
  endShape(CLOSE);
  // Serpent zigzag on sail
  stroke(_SP.sailGlyph[0], _SP.sailGlyph[1], _SP.sailGlyph[2], 180);
  strokeWeight(2);
  noFill();
  var zigY = mastY - 38;
  for (var zi = 0; zi < 6; zi++) {
    var zx1 = mastX - 18 + zi * 7;
    var zx2 = zx1 + 3.5;
    var zy1 = zigY + (zi % 2 === 0 ? 0 : 8);
    var zy2 = zigY + (zi % 2 === 0 ? 8 : 0);
    line(w2sX(zx1), w2sY(zy1 + sailBillow * 0.3), w2sX(zx2), w2sY(zy2 + sailBillow * 0.3));
  }
  noStroke();

  // ── SKULL PROW (bow) ──
  var bowTipX = cx + S.bowX, bowTipY = cy;
  fill(_SP.hull[0] + 15, _SP.hull[1] + 12, _SP.hull[2] + 10);
  // Ram post
  rect(w2sX(bowTipX - 8), w2sY(bowTipY - 18), 5, 22);
  // Skull
  fill(180, 170, 155);
  ellipse(w2sX(bowTipX - 5), w2sY(bowTipY - 22), 12, 14);
  fill(20);
  ellipse(w2sX(bowTipX - 8), w2sY(bowTipY - 23), 3, 4);
  ellipse(w2sX(bowTipX - 2), w2sY(bowTipY - 23), 3, 4);
  // Ram
  fill(_SP.blood[0], _SP.blood[1], _SP.blood[2]);
  triangle(
    w2sX(bowTipX + 5), w2sY(bowTipY),
    w2sX(bowTipX - 5), w2sY(bowTipY - 5),
    w2sX(bowTipX - 5), w2sY(bowTipY + 5)
  );

  // ── STERN POST (helm area) ──
  var sternTipX = cx + S.sternX, sternTipY = cy;
  fill(_SP.hull[0] + 10, _SP.hull[1] + 8, _SP.hull[2] + 8);
  rect(w2sX(sternTipX + 5), w2sY(sternTipY - 22), 4, 28);
  // Steering oar
  fill(_SP.mast[0], _SP.mast[1], _SP.mast[2]);
  rect(w2sX(sternTipX), w2sY(sternTipY - 2), 14, 3);
  fill(_SP.trim[0], _SP.trim[1], _SP.trim[2]);
  ellipse(w2sX(sternTipX - 2), w2sY(sternTipY), 6, 10);

  // ── OARS (animated rowing) ──
  var oarCount = 12;
  for (var oi = 0; oi < oarCount; oi++) {
    var oarX = cx - S.hw + 40 + oi * (S.hw * 2 - 80) / (oarCount - 1);
    var oarPhase = sin(ft * 0.04 + oi * 0.8) * 8;
    stroke(_SP.mast[0], _SP.mast[1], _SP.mast[2], 140);
    strokeWeight(1.5);
    // Port side
    line(w2sX(oarX), w2sY(cy + S.hh - 3), w2sX(oarX + oarPhase), w2sY(cy + S.hh + 18));
    // Starboard side
    line(w2sX(oarX), w2sY(cy - S.hh + 3), w2sX(oarX + oarPhase), w2sY(cy - S.hh - 18));
    noStroke();
  }

  // ── SHIELDS along gunwale ──
  var shieldCount = 8;
  for (var si = 0; si < shieldCount; si++) {
    var shX = cx - S.hw + 50 + si * (S.hw * 2 - 100) / (shieldCount - 1);
    // Alternate dark/blood red
    if (si % 2 === 0) {
      fill(_SP.hull[0] + 20, _SP.hull[1] + 18, _SP.hull[2] + 15);
    } else {
      fill(_SP.blood[0], _SP.blood[1], _SP.blood[2]);
    }
    // Port
    ellipse(w2sX(shX), w2sY(cy + S.hh), 8, 8);
    // Starboard
    ellipse(w2sX(shX), w2sY(cy - S.hh), 8, 8);
  }

  // ── HATCH (center deck — below deck entry) ──
  var hatchX = cx + SHIP_STATIONS.hatch.ox;
  var hatchY = cy + SHIP_STATIONS.hatch.oy;
  fill(35, 30, 25);
  rect(w2sX(hatchX - 12), w2sY(hatchY - 8), 24, 16, 2);
  fill(_SP.trim[0], _SP.trim[1], _SP.trim[2]);
  rect(w2sX(hatchX - 13), w2sY(hatchY - 9), 26, 2);
  rect(w2sX(hatchX - 13), w2sY(hatchY + 7), 26, 2);
  // Iron bands
  fill(60, 55, 50);
  rect(w2sX(hatchX - 1), w2sY(hatchY - 7), 2, 14);

  // ── DECK SHRINE (small Dagon idol) ──
  var shrineX = cx + SHIP_STATIONS.shrine.ox;
  var shrineY = cy + SHIP_STATIONS.shrine.oy;
  fill(50, 45, 38);
  rect(w2sX(shrineX - 6), w2sY(shrineY - 2), 12, 8, 1);
  fill(_SP.blood[0], _SP.blood[1], _SP.blood[2], 180);
  // Dagon idol (small fish-man silhouette)
  ellipse(w2sX(shrineX), w2sY(shrineY - 6), 6, 8);
  rect(w2sX(shrineX - 2), w2sY(shrineY - 3), 4, 5);
  // Glow
  fill(_SP.blood[0], _SP.blood[1], _SP.blood[2], 15 + sin(ft * 0.04) * 10);
  circle(w2sX(shrineX), w2sY(shrineY - 3), 30);

  // ── ROPE COILS ──
  fill(_SP.rope[0], _SP.rope[1], _SP.rope[2]);
  ellipse(w2sX(cx + 80), w2sY(cy + 20), 10, 8);
  ellipse(w2sX(cx - 40), w2sY(cy - 25), 8, 6);

  // ── BARRELS / CRATES ──
  fill(65, 50, 35);
  rect(w2sX(cx - 90), w2sY(cy + 15), 10, 12, 1);
  rect(w2sX(cx - 78), w2sY(cy + 18), 8, 9, 1);
  fill(55, 45, 32);
  ellipse(w2sX(cx + 100), w2sY(cy - 15), 10, 10);

  // ── NPC STATION PROMPTS ──
  var p = state.player;
  if (p) for (var key in SHIP_STATIONS) {
    var st = SHIP_STATIONS[key];
    var sx = cx + st.ox, sy = cy + st.oy;
    if (st.label && dist(p.x, p.y, sx, sy) < 35) {
      fill(255, 220, 120, 200 + sin(ft * 0.08) * 40);
      textSize(8); textAlign(CENTER, CENTER);
      text(st.label, w2sX(sx), w2sY(sy) - 18);
    }
  }

  // ── SMOKE TRAIL (ambient — drifts from a small brazier) ──
  for (var sm = 0; sm < 5; sm++) {
    var smAge = (ft * 0.6 + sm * 40) % 200;
    var smAlpha = max(0, 30 - smAge * 0.15);
    fill(80, 75, 70, smAlpha);
    var smX = cx - 60 + sin(smAge * 0.03 + sm) * 8;
    var smY = cy + 20 - smAge * 0.3;
    ellipse(w2sX(smX), w2sY(smY), 6 + smAge * 0.04, 4 + smAge * 0.03);
  }

  pop();
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDERING — BELOW DECK (interior room like drawTempleRoom)
// ═══════════════════════════════════════════════════════════════════════════
function drawBelowDeck() {
  var R = BELOW_DECK;
  var ft = frameCount;
  var hw = R.hw, hh = R.hh;
  var gPulse = sin(ft * 0.03) * 0.2 + 0.8;

  // Dark background
  noStroke();
  fill(15, 12, 10);
  rect(w2sX(R.cx - hw - 20), w2sY(R.cy - hh - 40), (hw + 20) * 2, (hh + 60) * 2);

  // Floor planks (wood grain pattern)
  var plankS = 20;
  for (var tx = -hw; tx < hw; tx += plankS) {
    for (var ty = -hh; ty < hh; ty += plankS) {
      var light = (floor((tx + hw) / plankS)) % 2 === 0;
      fill(light ? 55 : 48, light ? 48 : 42, light ? 40 : 35);
      rect(w2sX(R.cx + tx), w2sY(R.cy + ty), plankS, plankS);
    }
  }
  // Plank seams
  stroke(35, 30, 25, 80);
  strokeWeight(0.5);
  for (var ps = -hw; ps <= hw; ps += plankS) {
    line(w2sX(R.cx + ps), w2sY(R.cy - hh), w2sX(R.cx + ps), w2sY(R.cy + hh));
  }
  noStroke();

  // Back wall (curved hull interior)
  fill(40, 35, 30);
  rect(w2sX(R.cx - hw), w2sY(R.cy - hh - 30), hw * 2, 30);
  // Ribs (structural beams along ceiling)
  fill(55, 48, 38);
  for (var ri = 0; ri < 6; ri++) {
    var ribX = R.cx - hw + 30 + ri * (hw * 2 - 60) / 5;
    rect(w2sX(ribX - 3), w2sY(R.cy - hh - 28), 6, 26);
    // Curved into walls
    rect(w2sX(ribX - 2), w2sY(R.cy - hh - 2), 4, hh * 2 + 4);
  }

  // Side walls (hull interior)
  fill(35, 30, 25);
  rect(w2sX(R.cx - hw - 10), w2sY(R.cy - hh), 10, hh * 2);
  rect(w2sX(R.cx + hw), w2sY(R.cy - hh), 10, hh * 2);

  // ─── Y-SORTED ITEMS ───
  var items = [];

  // Hold area (left — crates and barrels)
  var holdSt = BELOW_DECK_STATIONS.hold;
  var holdX = R.cx + holdSt.ox, holdY = R.cy + holdSt.oy;
  items.push({ y: holdY, draw: function() {
    var hsx = w2sX(holdX), hsy = w2sY(holdY);
    noStroke();
    // Crates
    fill(65, 55, 40);
    rect(hsx - 20, hsy - 8, 14, 14, 1);
    rect(hsx - 5, hsy - 4, 12, 12, 1);
    fill(55, 45, 32);
    rect(hsx + 10, hsy - 6, 11, 10, 1);
    // Barrels
    fill(60, 50, 35);
    ellipse(hsx - 15, hsy + 14, 12, 10);
    ellipse(hsx + 5, hsy + 12, 10, 8);
    // Iron bands on barrels
    stroke(80, 75, 65);
    strokeWeight(0.5);
    ellipse(hsx - 15, hsy + 14, 12, 10);
    noStroke();
    // Prompt
    if (dist(state.player.x, state.player.y, holdX, holdY) < 35) {
      fill(255, 220, 120, 200 + sin(ft * 0.08) * 40);
      textSize(7); textAlign(CENTER, CENTER);
      text(holdSt.label, hsx, hsy + 28);
    }
  }});

  // Forge area (upper left — anvil + fire)
  var forgeSt = BELOW_DECK_STATIONS.forge;
  var forgeX = R.cx + forgeSt.ox, forgeY = R.cy + forgeSt.oy;
  items.push({ y: forgeY, draw: function() {
    var fsx = w2sX(forgeX), fsy = w2sY(forgeY);
    noStroke();
    // Anvil
    fill(90, 85, 80);
    rect(fsx - 8, fsy, 16, 6, 1);
    fill(70, 65, 60);
    rect(fsx - 5, fsy + 4, 10, 8, 1);
    // Forge fire
    var fFlicker = sin(ft * 0.15) * 3;
    fill(255, 100, 20, 180);
    ellipse(fsx + 20 + fFlicker, fsy + 2, 14, 12);
    fill(255, 180, 40, 140);
    ellipse(fsx + 20 + fFlicker * 0.5, fsy, 8, 10);
    // Glow
    fill(255, 100, 20, 8);
    circle(fsx + 20, fsy, 60);
    // Prompt
    if (dist(state.player.x, state.player.y, forgeX, forgeY) < 35) {
      fill(255, 220, 120, 200 + sin(ft * 0.08) * 40);
      textSize(7); textAlign(CENTER, CENTER);
      text(forgeSt.label, fsx, fsy + 22);
    }
  }});

  // Captain's quarters (right — table with map)
  var captSt = BELOW_DECK_STATIONS.captain;
  var captX = R.cx + captSt.ox, captY = R.cy + captSt.oy;
  items.push({ y: captY, draw: function() {
    var csx = w2sX(captX), csy = w2sY(captY);
    noStroke();
    // Table
    fill(65, 55, 40);
    rect(csx - 18, csy - 6, 36, 16, 2);
    // Map on table
    fill(200, 185, 145);
    rect(csx - 12, csy - 3, 24, 10, 1);
    // Map lines
    stroke(120, 100, 70, 80);
    strokeWeight(0.5);
    line(csx - 8, csy, csx + 8, csy + 2);
    line(csx - 4, csy - 1, csx + 6, csy + 4);
    noStroke();
    // Candle
    fill(200, 190, 150);
    rect(csx + 22, csy - 8, 3, 7);
    fill(255, 200, 60, 180 + sin(ft * 0.12) * 40);
    ellipse(csx + 23.5, csy - 10, 5, 6);
    // Prompt
    if (dist(state.player.x, state.player.y, captX, captY) < 35) {
      fill(255, 220, 120, 200 + sin(ft * 0.08) * 40);
      textSize(7); textAlign(CENTER, CENTER);
      text(captSt.label, csx, csy + 22);
    }
  }});

  // Shrine of Dagon (upper right — dark altar with idol)
  var dagonSt = BELOW_DECK_STATIONS.shrine;
  var dagonX = R.cx + dagonSt.ox, dagonY = R.cy + dagonSt.oy;
  items.push({ y: dagonY, draw: function() {
    var dsx = w2sX(dagonX), dsy = w2sY(dagonY);
    noStroke();
    // Altar base
    fill(40, 35, 30);
    rect(dsx - 14, dsy, 28, 10, 2);
    fill(50, 42, 35);
    rect(dsx - 16, dsy - 3, 32, 5, 2);
    // Dagon idol (fish-man figure)
    fill(_SP.blood[0], _SP.blood[1], _SP.blood[2]);
    ellipse(dsx, dsy - 12, 10, 12); // body
    fill(_SP.blood[0] + 20, _SP.blood[1] + 10, _SP.blood[2] + 10);
    ellipse(dsx, dsy - 20, 7, 7); // head
    // Eyes (glowing)
    fill(200, 50, 30, 150 + sin(ft * 0.06) * 80);
    circle(dsx - 2, dsy - 20, 2);
    circle(dsx + 2, dsy - 20, 2);
    // Dark aura
    fill(_SP.blood[0], _SP.blood[1], _SP.blood[2], 10 * gPulse);
    circle(dsx, dsy - 12, 50);
    // Prompt
    if (dist(state.player.x, state.player.y, dagonX, dagonY) < 35) {
      fill(255, 220, 120, 200 + sin(ft * 0.08) * 40);
      textSize(7); textAlign(CENTER, CENTER);
      text(dagonSt.label, dsx, dsy + 22);
    }
  }});

  // Lanterns (hanging from ribs — 4 total)
  var lanternPos = [
    { x: R.cx - hw * 0.6, y: R.cy - hh * 0.4 },
    { x: R.cx - hw * 0.2, y: R.cy + hh * 0.3 },
    { x: R.cx + hw * 0.2, y: R.cy - hh * 0.4 },
    { x: R.cx + hw * 0.6, y: R.cy + hh * 0.3 }
  ];
  for (var li = 0; li < lanternPos.length; li++) {
    (function(lp, idx) {
      items.push({ y: lp.y, draw: function() {
        var lsx = w2sX(lp.x), lsy = w2sY(lp.y);
        var swing = sin(ft * 0.025 + idx * 1.7) * 2;
        noStroke();
        // Chain
        stroke(70, 65, 55);
        strokeWeight(0.5);
        line(lsx, lsy - 15, lsx + swing, lsy);
        noStroke();
        // Lantern body
        fill(70, 60, 45);
        rect(lsx + swing - 3, lsy - 2, 6, 8, 1);
        // Flame
        fill(255, 160, 50, 160 + sin(ft * 0.14 + idx) * 40);
        ellipse(lsx + swing, lsy + 1, 4, 5);
        // Glow
        fill(255, 140, 40, 6);
        circle(lsx + swing, lsy, 50);
      }});
    })(lanternPos[li], li);
  }

  // Exit ladder prompt at bottom
  var exitX = R.cx + BELOW_DECK_STATIONS.exit.ox;
  var exitY = R.cy + BELOW_DECK_STATIONS.exit.oy;
  items.push({ y: exitY - 5, draw: function() {
    var esx = w2sX(exitX), esy = w2sY(exitY);
    noStroke();
    // Ladder
    fill(_SP.mast[0], _SP.mast[1], _SP.mast[2]);
    rect(esx - 6, esy - 15, 3, 20);
    rect(esx + 3, esy - 15, 3, 20);
    // Rungs
    for (var lr = 0; lr < 4; lr++) {
      rect(esx - 5, esy - 12 + lr * 5, 10, 2);
    }
    // Light from above
    fill(255, 240, 200, 15 + sin(ft * 0.05) * 8);
    triangle(esx - 15, esy - 15, esx + 15, esy - 15, esx, esy + 10);
  }});

  // Sort by Y and draw
  items.sort(function(a, b) { return a.y - b.y; });
  for (var i = 0; i < items.length; i++) items[i].draw();

  // Exit detection (player walks past bottom edge, like temple)
  if (state.player.y > R.cy + R.hh - 10 && !_doorTransition) {
    exitBelowDeck();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// NPC RENDERING IN BELOW DECK (Sea Peoples crew)
// ═══════════════════════════════════════════════════════════════════════════
function drawBelowDeckNPCs() {
  if (!state || !state.belowDeck) return;
  // Draw main NPC (Livia equivalent — ship's navigator/seer)
  if (state.npc && typeof drawNPC === 'function') {
    drawNPC();
  }
  // Draw Marcus (ship's quartermaster)
  if (state.marcus && state.marcus.present !== false && typeof drawNewNPC === 'function') {
    drawNewNPC(state.marcus, 'marcus');
  }
  // Draw Vesta (ship's priestess)
  if (state.vesta && typeof drawNewNPC === 'function') {
    drawNewNPC(state.vesta, 'vesta');
  }
  // Draw Felix (ship's scholar/scribe)
  if (state.felix && typeof drawNewNPC === 'function') {
    drawNewNPC(state.felix, 'felix');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE LOOP — called from sketch.js draw() when onShipDeck or belowDeck
// ═══════════════════════════════════════════════════════════════════════════
function updateShipHome(dt) {
  if (!isSeaPeoplesFaction()) return;

  if (state.belowDeck) {
    // Below deck update — camera lock like temple
    updateDoorTransition();
    updateTime(dt);
    updatePlayer(dt);
    updatePlayerAnim(dt);
    if (particles && particles.length > 10) particles.length = 10;
    updateParticles(dt);
    updateFloatingText(dt);
    updateShake(dt);
    cam.x = BELOW_DECK.cx;
    cam.y = BELOW_DECK.cy - height * 0.06;
    camSmooth.x = lerp(camSmooth.x, cam.x, 0.1);
    camSmooth.y = lerp(camSmooth.y, cam.y, 0.1);
    camZoom = lerp(camZoom, camZoomTarget, 0.1);
  }
  // Ship deck: normal world update handles camera following player

  // Passive income while sailing (Sea Peoples trade routes)
  if (typeof updateShipPassiveIncome === 'function') updateShipPassiveIncome(dt);
  // Passive fishing while on deck
  if (typeof updateShipFishing === 'function') updateShipFishing(dt);
}

function renderShipHome() {
  if (!isSeaPeoplesFaction()) return;

  if (state.belowDeck) {
    push();
    translate(width / 2, height / 2);
    scale(camZoom);
    translate(-width / 2, -height / 2);
    push();
    translate(shakeX, shakeY + floatOffset);
    drawBelowDeck();
    // Draw NPCs in below deck (Sea Peoples crew)
    drawBelowDeckNPCs();
    drawPlayer();
    drawParticles();
    drawFloatingText();
    pop();
    pop();
    drawHUD();
    drawSeaMap();
    if (typeof StrategyEngine !== 'undefined' && StrategyEngine.session && !photoMode && !screenshotMode) {
      StrategyEngine.drawPowerRankings();
    }
    if (!screenshotMode) drawCursor();
    drawGameVignette();
    drawDoorTransition();
    drawSaveIndicator();
  }
  // Ship deck rendering is handled by normal world draw pipeline
  // drawShipDeck() is called from world.js or sketch.js draw flow
}

// ═══════════════════════════════════════════════════════════════════════════
// HELM → SAILING TRANSITION
// ═══════════════════════════════════════════════════════════════════════════
function enterSailingFromHelm() {
  if (!state || !isOnShipDeck()) return;
  // Transition from ship deck to world-map sailing via state.rowing
  state.onShipDeck = false;
  state.belowDeck = false;

  // Activate the standard rowing/sailing system at ship's current world position
  var r = state.rowing;
  r.active = true;
  r.x = SHIP_DECK.cx || state.shipWorldX || 0;
  r.y = SHIP_DECK.cy || state.shipWorldY || 0;
  r.angle = 0;
  r.speed = 1.5;          // gentle start
  r.oarPhase = 0;
  r.wakeTrail = [];
  r.nearIsle = null;
  state.player.x = r.x;
  state.player.y = r.y;

  // Zoom out for world-map sailing
  if (typeof camZoomTarget !== 'undefined') camZoomTarget = 0.55;
  if (typeof _startCamTransition === 'function') _startCamTransition();

  addFloatingText(width / 2, height * 0.35, 'Taking the helm — WASD to sail, E to dock or anchor', '#ffd080');
  if (snd) snd.playSFX('anchor_up');
}

// Return to ship deck from sailing (called when Sea Peoples stop rowing)
function returnToShipDeck() {
  if (!isSeaPeoplesFaction()) return;
  // Update ship world position from where the player stopped sailing
  var r = state.rowing;
  var sx = r.x || state.player.x || 0;
  var sy = r.y || state.player.y || 0;
  SHIP_DECK.cx = sx;
  SHIP_DECK.cy = sy;
  state.shipWorldX = sx;
  state.shipWorldY = sy;

  // Re-enable ship deck mode
  state.onShipDeck = true;
  r.active = false;
  state.player.x = SHIP_DECK.cx - 80;  // stern near helm
  state.player.y = SHIP_DECK.cy;
  state.player.vx = 0;
  state.player.vy = 0;

  // Zoom back in to deck view
  if (typeof camZoomTarget !== 'undefined') camZoomTarget = 1.0;
  if (typeof _startCamTransition === 'function') _startCamTransition();

  addFloatingText(width / 2, height * 0.35, 'Anchored', '#aaccff');
  if (snd) snd.playSFX('anchor_down');
}

// Passive sailing income for Sea Peoples (called every frame from updateShipHome)
var _shipPassiveTimer = 0;
function updateShipPassiveIncome(dt) {
  if (!isSeaPeoplesFaction()) return;
  if (!state.rowing || !state.rowing.active) return;
  _shipPassiveTimer += dt;
  // Every ~10 seconds of sailing: earn gold from trade/raiding
  if (_shipPassiveTimer > 600) {
    _shipPassiveTimer = 0;
    var bonus = 2 + Math.floor((state.shipUpgrades || []).length * 1.5);
    state.gold = (state.gold || 0) + bonus;
    if (typeof addFloatingText === 'function')
      addFloatingText(width / 2, height * 0.6, '+' + bonus + ' gold (sea trade)', '#ffd700');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SHIP BOUNDARY CLAMPING (keep player on deck)
// ═══════════════════════════════════════════════════════════════════════════
function clampPlayerToShipDeck() {
  if (!isOnShipDeck()) return;
  var p = state.player;
  var S = SHIP_DECK;
  // Elliptical boundary (ship hull shape)
  var dx = (p.x - S.cx) / (S.hw + 5);
  var dy = (p.y - S.cy) / (S.hh + 3);
  var d2 = dx * dx + dy * dy;
  if (d2 > 1) {
    var scale = 1 / Math.sqrt(d2);
    p.x = S.cx + dx * scale * (S.hw + 5);
    p.y = S.cy + dy * scale * (S.hh + 3);
    p.vx *= -0.3;
    p.vy *= -0.3;
  }
}

// Clamp in below-deck
function clampPlayerToBelowDeck() {
  if (!isBelowDeck()) return;
  var p = state.player;
  var R = BELOW_DECK;
  if (p.x < R.cx - R.hw + 5) { p.x = R.cx - R.hw + 5; p.vx = 0; }
  if (p.x > R.cx + R.hw - 5) { p.x = R.cx + R.hw - 5; p.vx = 0; }
  if (p.y < R.cy - R.hh + 5) { p.y = R.cy - R.hh + 5; p.vy = 0; }
  // Bottom edge: allow walkout for exit (like temple)
}
